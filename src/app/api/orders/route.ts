import { NextRequest, NextResponse } from 'next/server';
import { createOrder, getOrders, getBusinessById, CreateOrderInput, checkBusinessModuleAccess } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { z } from 'zod';

const createOrderSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  sourceType: z.enum(['store', 'menu']),
  customer: z.object({
    name: z.string().optional().or(z.literal('')).default('Guest Customer'),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    tableNumber: z.string().optional().or(z.literal('')),
    roomNumber: z.string().optional().or(z.literal('')),
    tableOrRoomNumber: z.string().optional().or(z.literal('')),
    floorNumber: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
        variantId: z.string().optional(),
        addOnIds: z.array(z.string()).optional(),
        specialInstructions: z.string().optional(),
      })
    )
    .min(1, 'At least one item is required in the order'),
  fulfilmentMethod: z.enum(['pickup', 'delivery', 'dine_in', 'takeaway']).optional(),
  fulfillmentType: z.enum(['pickup', 'delivery', 'dine_in', 'takeaway']).optional(),
  paymentMethod: z.enum(['upi', 'cash', 'card', 'online', 'counter']).optional().default('cash'),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'pay_at_counter', 'pending_verification']).optional(),
  tableNumber: z.string().optional().or(z.literal('')),
  roomNumber: z.string().optional().or(z.literal('')),
  tableOrRoomNumber: z.string().optional().or(z.literal('')),
  floorNumber: z.string().optional().or(z.literal('')),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createOrderSchema.parse(body);

    // 1. Verify business existence and operational status
    const business = await getBusinessById(validatedData.businessId);
    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      );
    }

    const isStoreOpen = business.isStoreOpen ?? business.settings.isStoreOpen ?? true;
    const onlineOrderingEnabled = business.onlineOrderingEnabled ?? business.settings.onlineOrderingEnabled ?? true;

    if (!isStoreOpen && !onlineOrderingEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'This store is currently closed and online ordering is unavailable.',
          code: 'STORE_CLOSED_ORDERING_DISABLED',
        },
        { status: 403 }
      );
    }

    if (!isStoreOpen) {
      return NextResponse.json(
        {
          success: false,
          error: 'This store is currently closed. Please visit again later.',
          code: 'STORE_CLOSED',
        },
        { status: 403 }
      );
    }

    if (!onlineOrderingEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'Online ordering is currently unavailable for this store.',
          code: 'ONLINE_ORDERING_DISABLED',
        },
        { status: 403 }
      );
    }

    // 2. Enforce Store module entitlement server-side
    if (validatedData.sourceType === 'store') {
      const access = await checkBusinessModuleAccess(validatedData.businessId, 'store');
      if (!access.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: access.message || 'Store orders are not included in your current Basic plan. Please upgrade to Gold (₹149/mo).',
            code: 'STORE_MODULE_LOCKED',
          },
          { status: 403 }
        );
      }
    }

    const method = validatedData.fulfilmentMethod || validatedData.fulfillmentType || 'takeaway';

    // Payment verification rule: UPI payments are pending_verification until confirmed
    let resolvedPaymentStatus = validatedData.paymentStatus;
    if (validatedData.paymentMethod === 'upi') {
      resolvedPaymentStatus = 'pending_verification';
    } else if (validatedData.paymentMethod === 'counter') {
      resolvedPaymentStatus = 'pay_at_counter';
    } else if (!resolvedPaymentStatus) {
      resolvedPaymentStatus = 'pending';
    }

    // Resolve Table / Room Number safely (optional for takeaway, delivery, or counter orders)
    const rawTableRoom =
      validatedData.customer.tableNumber ||
      validatedData.customer.roomNumber ||
      validatedData.customer.tableOrRoomNumber ||
      validatedData.tableNumber ||
      validatedData.roomNumber ||
      validatedData.tableOrRoomNumber;
    const effectiveTableRoom = rawTableRoom && String(rawTableRoom).trim() ? String(rawTableRoom).trim() : undefined;

    const isHotelBusiness =
      business.category === 'hotel' ||
      business.type === 'hotel' ||
      business.settings?.orderSettings?.tableRoomLabelMode === 'room';

    let resolvedRoomNumber: string | undefined = undefined;
    let resolvedTableNumber: string | undefined = undefined;

    if (effectiveTableRoom) {
      if (isHotelBusiness) {
        // Hotel business: use roomNumber only
        resolvedRoomNumber = effectiveTableRoom;
        resolvedTableNumber = undefined;
      } else {
        // Restaurant / café / store: use tableNumber only
        resolvedTableNumber = effectiveTableRoom;
        resolvedRoomNumber = undefined;
      }
    }

    const rawFloor = validatedData.customer.floorNumber || validatedData.floorNumber;
    const effectiveFloorNumber = rawFloor && String(rawFloor).trim() ? String(rawFloor).trim() : undefined;

    const orderInput: CreateOrderInput = {
      businessId: validatedData.businessId,
      sourceType: validatedData.sourceType,
      customer: {
        ...validatedData.customer,
        tableNumber: resolvedTableNumber,
        roomNumber: resolvedRoomNumber,
        floorNumber: effectiveFloorNumber,
      },
      items: validatedData.items,
      fulfilmentMethod: method as any,
      fulfillmentType: method as any,
      paymentMethod: validatedData.paymentMethod as any,
      paymentStatus: resolvedPaymentStatus as any,
      tableNumber: resolvedTableNumber,
    };

    const order = await createOrder(orderInput);

    return NextResponse.json({
      success: true,
      message: 'Order placed successfully',
      order: {
        id: order.id,
        tokenNumber: order.tokenNumber,
        sourceType: order.sourceType,
        trackingId: order.trackingId,
        total: order.total,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create order',
      },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const sourceType = searchParams.get('sourceType') as 'store' | 'menu' | null;
    const status = searchParams.get('status') as any;
    const search = searchParams.get('search') || undefined;

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId is required' },
        { status: 400 }
      );
    }

    // Verify authorized user access to this business
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in to view orders' },
        { status: 401 }
      );
    }

    const isAuth = await isUserAuthorizedForBusiness(user, businessId);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to view orders for this business' },
        { status: 403 }
      );
    }

    const orders = await getOrders(businessId, sourceType || undefined, status || undefined, search);

    return NextResponse.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
