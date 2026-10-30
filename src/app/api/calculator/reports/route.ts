import { NextRequest, NextResponse } from 'next/server';
import { getCalculatorSalesReport } from '@/lib/db';
import { getCurrentUserFromRequest, isUserAuthorizedForBusiness } from '@/lib/auth';

const isDate = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
const isRealDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export async function GET(req: NextRequest) {
  try {
    const params = new URL(req.url).searchParams;
    const businessId = params.get('businessId');
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');
    const requestedTimeZone = params.get('timeZone') || 'Asia/Kolkata';
    if (!businessId || !isDate(startDate) || !isDate(endDate) || !isRealDate(startDate) || !isRealDate(endDate) || startDate > endDate) {
      return NextResponse.json({ error: 'Business and a valid date range are required.' }, { status: 400 });
    }
    let timeZone = 'Asia/Kolkata';
    try { timeZone = new Intl.DateTimeFormat('en-US', { timeZone: requestedTimeZone }).resolvedOptions().timeZone; }
    catch { return NextResponse.json({ error: 'Invalid report time zone.' }, { status: 400 }); }
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    if (user.role !== 'owner' || !(await isUserAuthorizedForBusiness(user, businessId))) {
      return NextResponse.json({ error: 'Only the business owner can view sales reports.' }, { status: 403 });
    }
    const report = await getCalculatorSalesReport(businessId, startDate, endDate, timeZone);
    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('GET /api/calculator/reports error:', error);
    return NextResponse.json({ error: 'Unable to load the sales report.' }, { status: 500 });
  }
}
