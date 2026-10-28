import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatus, updateOrderPaymentStatus, getOrderById } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';
import { OrderStatus } from '@/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await req.json();

    // Verify existing order and merchant authorization
    const existingOrder = await getOrderById(orderId);
    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in' },
        { status: 401 }
      );
    }

    const isAuth = await isUserAuthorizedForBusiness(user, existingOrder.businessId);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to modify this order' },
        { status: 403 }
      );
    }

    const { status, note, updatedBy, paymentStatus } = body;

    let updatedOrder = null;

    if (status) {
      updatedOrder = await updateOrderStatus(orderId, status as OrderStatus, note, updatedBy || user.name);
    }

    if (paymentStatus) {
      updatedOrder = await updateOrderPaymentStatus(orderId, paymentStatus);
    }

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Failed to update order' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
      order: updatedOrder,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update order' },
      { status: 500 }
    );
  }
}
