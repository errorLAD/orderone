import { NextRequest, NextResponse } from 'next/server';
import { confirmSubscriptionPayment } from '@/lib/db';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const confirmSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  paymentReference: z.string().min(6, 'Please provide a valid UPI Reference / UTR Number (min 6 characters)'),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = confirmSchema.parse(body);

    const result = await confirmSubscriptionPayment(data.paymentId, data.paymentReference, true);

    return NextResponse.json({
      success: true,
      message: result.message,
      payment: result.payment,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
