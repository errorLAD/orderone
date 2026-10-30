import { NextRequest, NextResponse } from 'next/server';
import { createCalculatorBill, getPosBills } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';

const isDate = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
const isRealDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

async function authorizeOwner(req: NextRequest, businessId: string) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) return { error: 'Please log in.', status: 401 as const };
  if (user.role !== 'owner' || !(await isUserAuthorizedForBusiness(user, businessId))) {
    return { error: 'Only the owner of this business can access calculator bills.', status: 403 as const };
  }
  return { user };
}

export async function GET(req: NextRequest) {
  try {
    const params = new URL(req.url).searchParams;
    const businessId = params.get('businessId');
    if (!businessId) return NextResponse.json({ error: 'businessId is required.' }, { status: 400 });
    const auth = await authorizeOwner(req, businessId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const limit = Number(params.get('limit') || 50);
    const offset = Number(params.get('offset') || 0);
    const search = (params.get('search') || '').trim();
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');
    const requestedTimeZone = params.get('timeZone') || 'Asia/Kolkata';
    if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(offset) || offset < 0 || offset > 1000000 || search.length > 120) {
      return NextResponse.json({ error: 'Invalid history filters.' }, { status: 400 });
    }
    if ((startDate && (!isDate(startDate) || !isRealDate(startDate)))
      || (endDate && (!isDate(endDate) || !isRealDate(endDate)))
      || (startDate && endDate && startDate > endDate)) {
      return NextResponse.json({ error: 'Choose a valid date range.' }, { status: 400 });
    }
    let timeZone: string;
    try { timeZone = new Intl.DateTimeFormat('en-US', { timeZone: requestedTimeZone }).resolvedOptions().timeZone; }
    catch { return NextResponse.json({ error: 'Invalid time zone.' }, { status: 400 }); }

    const { bills, totalCount } = await getPosBills(businessId, {
      source: 'calculator', limit: Math.min(100, limit), offset, search,
      startDate: startDate || undefined, endDate: endDate || undefined, timeZone,
    });
    return NextResponse.json({ success: true, bills, totalCount });
  } catch (error: any) {
    console.error('GET /api/calculator/bills error:', error);
    return NextResponse.json({ error: 'Unable to load saved bills.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const businessId = typeof body.businessId === 'string' ? body.businessId : '';
    if (!businessId) return NextResponse.json({ error: 'businessId is required.' }, { status: 400 });
    const auth = await authorizeOwner(req, businessId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
    if (!requestId || requestId.length > 120) {
      return NextResponse.json({ error: 'A valid requestId is required.' }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) {
      return NextResponse.json({ error: 'Add between 1 and 100 bill items.' }, { status: 400 });
    }
    const items = body.items.map((item: any) => ({
      productName: typeof item.productName === 'string' && item.productName.trim()
        ? item.productName.trim().slice(0, 160) : undefined,
      unit: typeof item.unit === 'string' ? item.unit.slice(0, 32) : undefined,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }));
    if (items.some((item: any) => !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 1000000
      || !Number.isFinite(item.unitPrice) || item.unitPrice < 0 || item.unitPrice > 100000000)) {
      return NextResponse.json({ error: 'Each item needs a positive quantity and a valid non-negative price.' }, { status: 400 });
    }
    if (body.discountType !== 'fixed' && body.discountType !== 'percentage') {
      return NextResponse.json({ error: 'Choose a valid discount type.' }, { status: 400 });
    }
    const discountType = body.discountType as 'fixed' | 'percentage';
    const discountValue = Number(body.discountValue ?? 0);
    const taxRate = Number(body.taxRate ?? 0);
    if (!Number.isFinite(discountValue) || discountValue < 0 || discountValue > (discountType === 'percentage' ? 100 : 100000000)
      || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      return NextResponse.json({ error: 'Discount or tax rate is outside the allowed range.' }, { status: 400 });
    }
    const round2 = (value: number) => Math.round(value * 100) / 100;
    const subtotal = round2(items.reduce((sum: number, item: any) => {
      const quantity = Math.round(item.quantity * 1000) / 1000;
      const price = round2(item.unitPrice);
      return sum + round2(quantity * price);
    }, 0));
    const discount = Math.min(subtotal, round2(discountType === 'percentage'
      ? subtotal * discountValue / 100 : discountValue));
    const taxAmount = Math.round(Math.max(0, subtotal - discount) * taxRate) / 100;
    const grandTotal = round2(Math.max(0, subtotal - discount) + taxAmount);
    if (subtotal > 9999999999.99 || grandTotal > 9999999999.99) {
      return NextResponse.json({ error: 'The bill total is above the supported limit.' }, { status: 400 });
    }
    const bill = await createCalculatorBill({
      businessId, requestId, items, discountType, discountValue, taxRate,
      createdBy: auth.user.name || auth.user.email || 'Owner',
    });
    return NextResponse.json({ success: true, bill }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/calculator/bills error:', error);
    return NextResponse.json({ error: 'Unable to save this bill.' }, { status: 500 });
  }
}
