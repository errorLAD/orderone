const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'lib', 'db.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Remove mock arrays
const startMarker = '// Initial Seed Data for Instant Usability';
const endMarker = 'let cachedDb: DatabaseSchema = loadDatabase();';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found for mock seed data', { startIdx, endIdx });
  process.exit(1);
}

const emptyDbReplacement = `// Initial Clean Empty Schema (Production Supabase Driven)
const EMPTY_DB: DatabaseSchema = {
  businesses: [],
  users: [],
  categories: [],
  products: [],
  orders: [],
  queueTokens: [],
  notifications: [],
  subscriptionPlans: [],
  auditLogs: [],
  sequences: {},
};

// Database Initializer & Persistence Engine
function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      const initialDb: DatabaseSchema = { ...EMPTY_DB };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }

    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const db: DatabaseSchema = JSON.parse(raw);
    return db;
  } catch (error) {
    console.error('Failed to load database, using empty schema:', error);
    return { ...EMPTY_DB };
  }
}

`;

content = content.slice(0, startIdx) + emptyDbReplacement + content.slice(endIdx);

// 2. Replace getAnalytics with live dynamic calculation
const analyticsStartMarker = 'export async function getAnalytics(';
const analyticsEndMarker = '// 10. SUBSCRIPTION & BILLING';

const aStart = content.indexOf(analyticsStartMarker);
const aEnd = content.indexOf(analyticsEndMarker);

if (aStart === -1 || aEnd === -1) {
  console.error('Markers not found for getAnalytics', { aStart, aEnd });
  process.exit(1);
}

const analyticsReplacement = `export async function getAnalytics(
  businessId: string,
  scope: 'all' | 'store' | 'menu' = 'all',
  timeRange: 'today' | '7d' | '30d' = 'today'
): Promise<DashboardAnalytics> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;

  // Retrieve actual orders from PostgreSQL database
  let allBizOrders = await getOrders(businessId);
  if (scope !== 'all') {
    allBizOrders = allBizOrders.filter((o) => o.sourceType === scope);
  }

  // Calculate Today's orders
  const todayOrders = allBizOrders.filter((o) => new Date(o.createdAt).getTime() >= startOfToday);

  // Exclude cancelled/rejected orders from revenue KPI
  const validTodayOrders = todayOrders.filter((o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'rejected');
  const todayOrderValue = validTodayOrders.reduce((sum, o) => sum + o.total, 0);

  // Calculate Yesterday's orders for genuine growth percentage
  const yesterdayOrders = allBizOrders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return t >= startOfYesterday && t < startOfToday;
  });
  const validYesterdayOrders = yesterdayOrders.filter((o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'rejected');
  const yesterdayOrderValue = validYesterdayOrders.reduce((sum, o) => sum + o.total, 0);

  const todayOrderValueChange = yesterdayOrderValue === 0
    ? (todayOrderValue > 0 ? 100 : 0)
    : Math.round(((todayOrderValue - yesterdayOrderValue) / yesterdayOrderValue) * 1000) / 10;

  const todayOrdersChange = yesterdayOrders.length === 0
    ? (todayOrders.length > 0 ? 100 : 0)
    : Math.round(((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 1000) / 10;

  // Today's Payments Collected (Earnings)
  const paidTodayOrders = todayOrders.filter((o) => o.paymentStatus === 'paid');
  const todayEarnings = paidTodayOrders.reduce((sum, o) => sum + o.total, 0);

  const pendingTodayOrders = todayOrders.filter(
    (o) => o.paymentStatus === 'pending' || o.paymentStatus === 'pay_at_counter'
  );
  const todayPendingAmount = pendingTodayOrders.reduce((sum, o) => sum + o.total, 0);

  // Unique customers today (phone number or name)
  const customerSet = new Set<string>();
  todayOrders.forEach((o) => {
    if (o.customer.phone) customerSet.add(o.customer.phone);
    else if (o.customer.name) customerSet.add(o.customer.name);
    else customerSet.add(o.trackingId);
  });
  const todayCustomersCount = customerSet.size;

  // Status breakdown
  const orderStatusCounts = {
    new: 0,
    accepted: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    cancelled: 0,
  };
  todayOrders.forEach((o) => {
    if (o.orderStatus === 'new') orderStatusCounts.new++;
    else if (o.orderStatus === 'accepted') orderStatusCounts.accepted++;
    else if (o.orderStatus === 'preparing') orderStatusCounts.preparing++;
    else if (o.orderStatus === 'ready') orderStatusCounts.ready++;
    else if (o.orderStatus === 'completed') orderStatusCounts.completed++;
    else if (o.orderStatus === 'cancelled' || o.orderStatus === 'rejected') orderStatusCounts.cancelled++;
  });

  // Hourly breakdown for Today
  const hourlyMap: { [hour: number]: { count: number; value: number } } = {};
  for (let h = 8; h <= 22; h += 2) {
    hourlyMap[h] = { count: 0, value: 0 };
  }
  todayOrders.forEach((o) => {
    const hour = new Date(o.createdAt).getHours();
    const bucket = Math.floor(hour / 2) * 2;
    if (hourlyMap[bucket]) {
      hourlyMap[bucket].count += 1;
      if (o.orderStatus !== 'cancelled' && o.orderStatus !== 'rejected') {
        hourlyMap[bucket].value += o.total;
      }
    }
  });

  const hourlyOrders = Object.entries(hourlyMap).map(([hour, data]) => {
    const h = Number(hour);
    const label = \`\${h % 12 || 12} \${h >= 12 ? 'PM' : 'AM'}\`;
    return { hour: label, count: data.count, value: Math.round(data.value) };
  });

  // Sales Trend for last 7 or 30 days
  const salesTrend = [];
  const days = timeRange === '30d' ? 30 : 7;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 86400000;
    const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

    let storeSales = 0;
    let menuSales = 0;

    allBizOrders.forEach((o) => {
      const oTime = new Date(o.createdAt).getTime();
      if (oTime >= dayStart && oTime < dayEnd && o.orderStatus !== 'cancelled' && o.orderStatus !== 'rejected') {
        if (o.sourceType === 'store') storeSales += o.total;
        if (o.sourceType === 'menu') menuSales += o.total;
      }
    });

    salesTrend.push({
      date: d.toISOString().split('T')[0],
      label,
      storeSales: Math.round(storeSales),
      menuSales: Math.round(menuSales),
      totalSales: Math.round(storeSales + menuSales),
    });
  }

  // Top Selling Products using live product inventory
  const bizProducts = await getProducts(businessId);
  const productSalesMap = new Map<
    string,
    { productId: string; name: string; sourceType: OrderSourceType; qty: number; sales: number; image?: string }
  >();

  allBizOrders.forEach((o) => {
    if (o.orderStatus !== 'cancelled' && o.orderStatus !== 'rejected') {
      o.items.forEach((item) => {
        const existing = productSalesMap.get(item.productId);
        const prod = bizProducts.find((p) => p.id === item.productId);
        if (existing) {
          existing.qty += item.quantity;
          existing.sales += item.itemTotal;
        } else {
          productSalesMap.set(item.productId, {
            productId: item.productId,
            name: item.productName,
            sourceType: o.sourceType,
            qty: item.quantity,
            sales: item.itemTotal,
            image: prod?.imageUrl,
          });
        }
      });
    }
  });

  const topSellingProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)
    .map((item, idx) => ({
      productId: item.productId,
      productName: item.name,
      sourceType: item.sourceType,
      quantitySold: item.qty,
      salesValue: Math.round(item.sales),
      rank: idx + 1,
      imageUrl: item.image,
    }));

  // Low stock retail products
  const lowStockAlerts = bizProducts.filter(
    (p) =>
      p.sourceType === 'store' &&
      typeof p.stockQuantity === 'number' &&
      p.stockQuantity <= (p.lowStockThreshold || 5)
  );

  return {
    kpi: {
      todayOrderValue,
      todayOrderValueChange,
      todayEarnings,
      todayPaidAmount: todayEarnings,
      todayPendingAmount,
      todayOrdersCount: todayOrders.length,
      todayOrdersChange,
      todayCustomersCount,
    },
    orderStatusCounts,
    salesTrend,
    hourlyOrders,
    topSellingProducts,
    lowStockAlerts,
    recentOrders: allBizOrders.slice(0, 10),
  };
}

`;

content = content.slice(0, aStart) + analyticsReplacement + content.slice(aEnd);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully updated src/lib/db.ts: purged mock data and updated dynamic analytics.');
