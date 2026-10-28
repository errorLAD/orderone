import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, logAdminAction } from '@/lib/adminAuth';
import { pgQuery } from '@/lib/postgres';

export const dynamic = 'force-dynamic';

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Neutralize formula injection risk in Excel/Sheets (=, +, -, @, \t, \r)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'summary';
    const period = searchParams.get('period') || '30d';
    const format = searchParams.get('format'); // 'csv' or 'json'

    let dateCondition = "NOW() - INTERVAL '30 days'";
    if (period === 'today') dateCondition = "CURRENT_DATE";
    else if (period === '7d') dateCondition = "NOW() - INTERVAL '7 days'";
    else if (period === 'this_month') dateCondition = "DATE_TRUNC('month', CURRENT_DATE)";
    else if (period === 'prev_month') dateCondition = "DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')";

    if (format === 'csv') {
      // CSV Export handling
      const exportType = searchParams.get('exportType') || 'businesses';

      await logAdminAction({
        req,
        adminUser: auth.user,
        action: 'report.export_csv',
        details: `Exported ${exportType} report in CSV format for period ${period}.`,
        targetEntity: 'report',
      });

      if (exportType === 'payments') {
        const payRes = await pgQuery(`
          SELECT sp.id, sp.created_at, b.name as business_name, sp.plan_id, sp.amount, sp.currency,
                 sp.status, sp.payment_provider, sp.razorpay_payment_id, sp.razorpay_order_id, sp.notes
          FROM public.subscription_payments sp
          LEFT JOIN public.businesses b ON sp.business_id = b.id
          ORDER BY sp.created_at DESC;
        `);

        const headers = ['Transaction ID', 'Date', 'Business Name', 'Plan', 'Amount (INR)', 'Currency', 'Status', 'Provider', 'Razorpay Payment ID', 'Razorpay Order ID', 'Notes'];
        const rows = payRes.rows.map((r) => [
          r.id,
          new Date(r.created_at).toISOString(),
          r.business_name || '',
          r.plan_id,
          r.amount,
          r.currency || 'INR',
          r.status,
          r.payment_provider || 'razorpay',
          r.razorpay_payment_id || '',
          r.razorpay_order_id || '',
          r.notes || '',
        ].map(escapeCsvCell).join(','));

        const csvContent = [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="OrderOne_Payments_${period}.csv"`,
          },
        });
      }

      if (exportType === 'businesses') {
        const bizRes = await pgQuery(`
          SELECT b.id, b.name, b.slug, b.type, b.email, b.phone, b.created_at,
                 (b.subscription->>'planId') as plan_id,
                 (b.subscription->>'status') as subscription_status,
                 (b.subscription->>'renewsAt') as expiry_date,
                 u.name as owner_name, u.email as owner_email
          FROM public.businesses b
          LEFT JOIN public.users u ON b.owner_id = u.id
          ORDER BY b.created_at DESC;
        `);

        const headers = ['Business ID', 'Business Name', 'Slug', 'Category', 'Email', 'Phone', 'Created Date', 'Plan', 'Subscription Status', 'Expiry Date', 'Owner Name', 'Owner Email'];
        const rows = bizRes.rows.map((r) => [
          r.id,
          r.name,
          r.slug,
          r.type,
          r.email,
          r.phone,
          new Date(r.created_at).toISOString(),
          r.plan_id || 'plan_basic',
          r.subscription_status || 'active',
          r.expiry_date || '',
          r.owner_name || '',
          r.owner_email || '',
        ].map(escapeCsvCell).join(','));

        const csvContent = [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="OrderOne_Businesses_${period}.csv"`,
          },
        });
      }
    }

    // JSON Aggregates for Reporting Page
    const [
      categoryBreakdownRes,
      subStatusBreakdownRes,
      paymentFinancialsRes,
      orderStatusBreakdownRes,
      limitUsageRes,
    ] = await Promise.all([
      // Category Breakdown
      pgQuery(`
        SELECT type as category, COUNT(*) as count
        FROM public.businesses
        GROUP BY type
        ORDER BY count DESC;
      `),

      // Subscription Status Breakdown
      pgQuery(`
        SELECT 
          (subscription->>'planId') as plan_id,
          (subscription->>'status') as status,
          COUNT(*) as count
        FROM public.businesses
        GROUP BY (subscription->>'planId'), (subscription->>'status');
      `),

      // Financials Summary
      pgQuery(`
        SELECT 
          COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as gross_collected,
          COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0) as refunds_recorded,
          COUNT(*) FILTER (WHERE status = 'completed') as successful_payments,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_payments
        FROM public.subscription_payments;
      `),

      // Order Status Breakdown
      pgQuery(`
        SELECT source_type, order_status, COUNT(*) as count, COALESCE(SUM(total), 0) as total_volume
        FROM public.orders
        GROUP BY source_type, order_status;
      `),

      // Limit Usage Monitoring
      pgQuery(`
        SELECT 
          b.id, b.name, b.type,
          (b.subscription->>'planId') as plan_id,
          (b.subscription->>'status') as subscription_status,
          (SELECT COUNT(*) FROM public.products p WHERE p.business_id = b.id AND p.source_type = 'store') as store_products,
          (SELECT COUNT(*) FROM public.products p WHERE p.business_id = b.id AND p.source_type = 'menu') as menu_products,
          (SELECT COUNT(*) FROM public.categories c WHERE c.business_id = b.id) as total_categories
        FROM public.businesses b
        ORDER BY b.created_at DESC
        LIMIT 25;
      `),
    ]);

    const financials = paymentFinancialsRes.rows[0];
    const gross = parseFloat(financials.gross_collected || '0');
    const refunds = parseFloat(financials.refunds_recorded || '0');

    // Limit violations calculation
    const limitUsage = limitUsageRes.rows.map((r) => {
      const isGold = r.plan_id === 'plan_gold';
      const isDiamond = r.plan_id === 'plan_diamond';
      const itemLimit = isGold ? 50 : isDiamond ? 99999 : 20;
      const catLimit = isGold ? 30 : isDiamond ? 9999 : 10;
      const totalItems = parseInt(r.store_products, 10) + parseInt(r.menu_products, 10);
      const totalCats = parseInt(r.total_categories, 10);

      return {
        businessId: r.id,
        businessName: r.name,
        category: r.type,
        planId: r.plan_id || 'plan_basic',
        subscriptionStatus: r.subscription_status || 'active',
        totalItems,
        itemLimit,
        totalCategories: totalCats,
        categoryLimit: catLimit,
        isLimitExceeded: totalItems > itemLimit || totalCats > catLimit,
      };
    });

    return NextResponse.json({
      success: true,
      categoryBreakdown: categoryBreakdownRes.rows.map((r) => ({ category: r.category, count: parseInt(r.count, 10) })),
      subStatusBreakdown: subStatusBreakdownRes.rows,
      financials: {
        grossCollected: gross,
        refundsRecorded: refunds,
        netCollected: Math.max(0, gross - refunds),
        successfulPayments: parseInt(financials.successful_payments, 10),
        failedPayments: parseInt(financials.failed_payments, 10),
      },
      orderBreakdown: orderStatusBreakdownRes.rows.map((r) => ({
        sourceType: r.source_type,
        status: r.order_status,
        count: parseInt(r.count, 10),
        volume: parseFloat(r.total_volume),
      })),
      limitUsage,
    });
  } catch (err: any) {
    console.error('Admin reports GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
