import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, getOrderByTrackingId, getBusinessById } from '@/lib/db';
import { formatINR } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    let order = await getOrderById(id);
    if (!order) {
      order = await getOrderByTrackingId(id);
    }

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const business = await getBusinessById(order.businessId);
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    const gstSettings = business.settings.gst || (business.settings.orderSettings.enableGst ? {
      isGstRegistered: Boolean(business.settings.orderSettings.gstin),
      gstin: business.settings.orderSettings.gstin,
      legalBusinessName: business.name,
      registeredAddress: business.address,
      defaultGstRate: business.settings.orderSettings.taxRatePercentage || 0,
      pricesIncludeGst: false,
      invoicePrefix: 'INV-',
    } : undefined);

    const isTaxInvoice = Boolean(gstSettings?.isGstRegistered && gstSettings?.gstin && order.tax > 0);

    const invoiceNumber = order.invoiceNumber || (order.taxBreakdown?.invoiceNumber) || `INV-${order.tokenNumber}`;

    const invoiceData = {
      isTaxInvoice,
      documentTitle: isTaxInvoice ? 'TAX INVOICE' : 'RETAIL ORDER RECEIPT',
      invoiceNumber,
      orderId: order.id,
      tokenNumber: order.tokenNumber,
      sourceType: order.sourceType,
      createdAt: order.createdAt,
      business: {
        id: business.id,
        name: business.name,
        legalName: gstSettings?.legalBusinessName || business.name,
        address: gstSettings?.registeredAddress || business.address,
        phone: business.phone,
        email: business.email,
        gstin: gstSettings?.gstin || null,
        isGstRegistered: Boolean(gstSettings?.isGstRegistered),
      },
      customer: order.customer,
      items: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      deliveryFee: order.deliveryFee,
      discount: order.discount || 0,
      total: order.total,
      taxBreakdown: order.taxBreakdown || null,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      invoiceNotes: gstSettings?.invoiceNotes || 'Thank you for your business. For any queries, please contact store support.',
    };

    return NextResponse.json({
      success: true,
      invoice: invoiceData,
    });
  } catch (error: any) {
    console.error('Invoice generation error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to generate invoice' }, { status: 500 });
  }
}
