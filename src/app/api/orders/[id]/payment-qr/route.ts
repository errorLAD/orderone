import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, getBusinessById, getBusinessUpiSettings } from '@/lib/db';
import { generateUpiPaymentQrDataUrl, buildUpiPaymentUri } from '@/lib/upiQr';
import { hasActiveGoldAccess } from '@/lib/subscriptionLimits';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = params.id;
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const business = await getBusinessById(order.businessId);
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    // Check Gold Plan entitlement server-side
    const isGold = hasActiveGoldAccess(business);

    if (!isGold) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dynamic order UPI payment QR codes require the Gold subscription plan (₹99/mo).',
          code: 'GOLD_PLAN_REQUIRED',
        },
        { status: 403 }
      );
    }

    const upiSettings = await getBusinessUpiSettings(order.businessId);
    if (!upiSettings || !upiSettings.upiId || !upiSettings.isEnabled) {
      return NextResponse.json({
        success: false,
        error: 'Merchant has not enabled UPI payments or configured a UPI ID yet.',
        code: 'UPI_NOT_CONFIGURED',
      }, { status: 422 });
    }

    // Use strictly the server-validated order total and order token
    const upiOptions = {
      upiId: upiSettings.upiId,
      payeeName: upiSettings.payeeName || business.name,
      amount: order.total,
      orderReference: `Order ${order.tokenNumber}`,
      transactionNote: `Order ${order.tokenNumber} - ${business.name}`,
      currency: 'INR',
    };

    const { uri, qrDataUrl } = await generateUpiPaymentQrDataUrl(upiOptions, 380);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      tokenNumber: order.tokenNumber,
      amount: order.total,
      payeeName: upiSettings.payeeName,
      upiId: upiSettings.upiId,
      upiUri: uri,
      qrDataUrl,
      paymentStatus: order.paymentStatus,
      instructions: upiSettings.instructions,
    });
  } catch (error: any) {
    console.error('Error generating order payment QR:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to generate payment QR' }, { status: 500 });
  }
}
