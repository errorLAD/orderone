import { NextRequest, NextResponse } from 'next/server';
import { getOrderByTrackingId, getBusinessById } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  try {
    const trackingId = params.trackingId;
    const order = await getOrderByTrackingId(trackingId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const business = await getBusinessById(order.businessId);

    // Return order details for customer tracking without exposing internal secrets
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        businessName: business?.name,
        businessPhone: business?.phone,
        businessAddress: business?.address,
        socialLinks: business?.settings?.socialLinks || null,
        sourceType: order.sourceType,
        tokenNumber: order.tokenNumber,
        trackingId: order.trackingId,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        fulfilmentMethod: order.fulfilmentMethod,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        deliveryFee: order.deliveryFee,
        total: order.total,
        customerName: order.customer.name,
        tableNumber: order.customer.tableNumber,
        statusHistory: order.statusHistory,
        createdAt: order.createdAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
