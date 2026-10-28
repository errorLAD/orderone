import { BusinessType, OrderSourceType } from '@/types';

export interface CategoryStarterItem {
  name: string;
  categoryName: string;
  price: number;
  sku?: string;
  unit?: string;
  brand?: string;
  stockQuantity?: number;
  description?: string;
  isVegetarian?: boolean;
}

export interface BusinessCategoryConfig {
  id: BusinessType;
  label: string;
  shortLabel: string;
  icon: string;
  badgeClass: string;
  colorClass: string;
  description: string;
  primaryModule: OrderSourceType;
  terminology: {
    dashboardTitle: string;
    dashboardSubtitle: string;
    itemsTitle: string;
    addItemButton: string;
    ordersTitle: string;
    tokensTitle: string;
    storefrontName: string;
    kpiSalesSubtitle: string;
    kpiOrdersSubtitle: string;
    unitLabel: string;
    // Step labels for onboarding
    step1Title: string;
    step1Subtitle: string;
    step2Title: string;
    step2Subtitle: string;
    step3Title: string;
    step3Subtitle: string;
  };
  supportedUnits: string[];
  starterCategories: string[];
  starterItems: CategoryStarterItem[];
}

export const BUSINESS_CATEGORIES: BusinessCategoryConfig[] = [
  {
    id: 'hardware',
    label: 'Hardware & Building Materials',
    shortLabel: 'Hardware & Materials',
    icon: '🔨',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    colorClass: 'text-indigo-700',
    description: 'Cement, steel, pipes, electrical, plumbing, tools, paint & contractor delivery',
    primaryModule: 'store',
    terminology: {
      dashboardTitle: 'Hardware & Construction Materials Hub',
      dashboardSubtitle: 'Bulk material stock, contractor orders, unit metrics (Bag/Kg/Metre/Litre) & site dispatch',
      itemsTitle: 'Materials, Tools & Building SKUs',
      addItemButton: 'Add Material / Tool',
      ordersTitle: 'Site Delivery & Contractor Orders',
      tokensTitle: 'Loading & Dispatch Queue',
      storefrontName: 'Contractor & Retail Storefront',
      kpiSalesSubtitle: 'Materials & construction turnover',
      kpiOrdersSubtitle: 'Site deliveries & counter bills',
      unitLabel: 'Unit (Bag/Piece/Litre/Kg/Metre)',
      step1Title: 'Starter Material Products',
      step1Subtitle: 'Select initial construction materials, SKUs and tools to stock in your digital catalog.',
      step2Title: 'Inventory & Operations',
      step2Subtitle: 'Configure stock quantities, site delivery preferences, counter billing, and optional GST.',
      step3Title: 'Launch Store & QR Code',
      step3Subtitle: 'Your contractor storefront is live with counter QR ordering and loading tokens.',
    },
    supportedUnits: ['bag', 'piece', 'box', 'kg', 'metre', 'litre', 'tonne', 'bundle', 'sq_ft'],
    starterCategories: [
      'Cement & Aggregates',
      'Steel, Rebars & Mesh',
      'Pipes, PVC & Plumbing Fittings',
      'Electrical, Wires & Switches',
      'Paints, Primers & Waterproofing',
      'Hand & Power Tools',
      'Building Materials & Fasteners',
    ],
    starterItems: [
      {
        name: 'UltraTech Super Cement (50kg Bag)',
        categoryName: 'Cement & Aggregates',
        price: 385,
        unit: 'bag',
        brand: 'UltraTech',
        sku: 'CEM-ULT-50KG',
        stockQuantity: 200,
        description: 'OPC 53 grade high-strength construction cement for RCC slab and pillars',
      },
      {
        name: 'Tata Tiscon 12mm TMT Rebars (12 Metre Length)',
        categoryName: 'Steel, Rebars & Mesh',
        price: 580,
        unit: 'piece',
        brand: 'Tata Tiscon',
        sku: 'STL-TMT-12MM',
        stockQuantity: 150,
        description: 'Fe 550D grade high ductility earthquake resistant corrosion-free rebar',
      },
      {
        name: 'Supreme 4-Inch PVC Rigid Drainage Pipe (10ft Length)',
        categoryName: 'Pipes, PVC & Plumbing Fittings',
        price: 420,
        unit: 'piece',
        brand: 'Supreme',
        sku: 'PVC-SUP-4IN-10FT',
        stockQuantity: 80,
        description: 'Heavy duty Schedule 40 drainage and sewerage pipe',
      },
      {
        name: 'Havells 6A Modular Switch & Socket Combined Box',
        categoryName: 'Electrical, Wires & Switches',
        price: 240,
        unit: 'box',
        brand: 'Havells',
        sku: 'ELE-HAV-6A-BOX',
        stockQuantity: 50,
        description: 'Flame retardant polycarbonate modular switch with indicator',
      },
      {
        name: 'Astral 1-Inch CPVC Brass Elbow & Ball Valve Kit',
        categoryName: 'Pipes, PVC & Plumbing Fittings',
        price: 320,
        unit: 'piece',
        brand: 'Astral',
        sku: 'PLM-AST-1IN-VALV',
        stockQuantity: 60,
        description: 'Lead-free hot & cold water plumbing fitting with brass insert',
      },
      {
        name: 'Asian Paints Apex Exterior WeatherProof Emulsion (20L Drum)',
        categoryName: 'Paints, Primers & Waterproofing',
        price: 3950,
        unit: 'litre',
        brand: 'Asian Paints',
        sku: 'PNT-APX-EXT-20L',
        stockQuantity: 18,
        description: 'All-weather silicone-enhanced anti-fungal exterior wall paint',
      },
      {
        name: 'Bosch Professional 13mm Impact Drill Machine (550W)',
        categoryName: 'Hand & Power Tools',
        price: 2750,
        unit: 'piece',
        brand: 'Bosch',
        sku: 'TLS-BSH-DRL-13',
        stockQuantity: 12,
        description: 'Heavy-duty variable speed impact drill for masonry, concrete and metal',
      },
      {
        name: 'Coarse River Sand / Concrete Aggregate (50kg Bag)',
        categoryName: 'Cement & Aggregates',
        price: 95,
        unit: 'bag',
        brand: 'BuildPro',
        sku: 'MAT-SND-50KG',
        stockQuantity: 300,
        description: 'Screened coarse construction sand for mortar and plastering',
      },
    ],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    shortLabel: 'Restaurant',
    icon: '🍛',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    colorClass: 'text-amber-700',
    description: 'Full-service dining, kitchen orders, table service, KOT & takeaway',
    primaryModule: 'menu',
    terminology: {
      dashboardTitle: 'Restaurant & Kitchen Operations',
      dashboardSubtitle: 'Live table orders, KOT status, chef preparation queue and dining sales',
      itemsTitle: 'Food Menu & Recipes',
      addItemButton: 'Add Food Item',
      ordersTitle: 'Kitchen Orders & KOT',
      tokensTitle: 'Table & Token Queue',
      storefrontName: 'Digital Dining Menu',
      kpiSalesSubtitle: 'Dine-in, takeaway & kitchen revenue',
      kpiOrdersSubtitle: 'Orders sent to kitchen',
      unitLabel: 'Portion / Plate',
      step1Title: 'Starter Menu',
      step1Subtitle: 'Select the initial food and beverage items to feature on your digital dining menu.',
      step2Title: 'Fulfilment & Operations',
      step2Subtitle: 'Configure dining tables, takeaway counter, kitchen KOT, and optional GST.',
      step3Title: 'Launch Menu & QR Code',
      step3Subtitle: 'Your digital dining menu is live with table QR codes and kitchen token display.',
    },
    supportedUnits: ['portion', 'plate', 'half', 'full', 'piece', 'set'],
    starterCategories: ['Starters & Appetizers', 'Main Course', 'Breads & Rice', 'Desserts & Beverages'],
    starterItems: [
      { name: 'Paneer Butter Masala', categoryName: 'Main Course', price: 220, isVegetarian: true, unit: 'portion', description: 'Rich creamy cottage cheese curry with butter makhani gravy' },
      { name: 'Butter Tandoori Roti', categoryName: 'Breads & Rice', price: 25, isVegetarian: true, unit: 'piece', description: 'Crisp whole wheat tandoori flatbread with dollop of butter' },
      { name: 'Crispy Veg Spring Rolls (6 Pcs)', categoryName: 'Starters & Appetizers', price: 160, isVegetarian: true, unit: 'plate', description: 'Crisp rolls with sweet chilli dip and shredded cabbage' },
      { name: 'Gulab Jamun (2 Pcs)', categoryName: 'Desserts & Beverages', price: 70, isVegetarian: true, unit: 'portion', description: 'Warm khoya dumplings in cardamom saffron syrup' },
    ],
  },
  {
    id: 'cafe',
    label: 'Cafe & Coffee Bar',
    shortLabel: 'Cafe & Espresso',
    icon: '☕',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    colorClass: 'text-orange-700',
    description: 'Espresso bar, specialty teas, cold brews, bakery bites & snacks',
    primaryModule: 'menu',
    terminology: {
      dashboardTitle: 'Cafe & Barista Operations',
      dashboardSubtitle: 'Live counter orders, barista brew queue, cup customizations and cafe sales',
      itemsTitle: 'Beverages & Cafe Bites',
      addItemButton: 'Add Cafe Item',
      ordersTitle: 'Barista & Cafe Orders',
      tokensTitle: 'Pickup Calling Tokens',
      storefrontName: 'Digital Cafe Menu',
      kpiSalesSubtitle: 'Beverages, bakery & food sales',
      kpiOrdersSubtitle: 'Cups & bites ordered',
      unitLabel: 'Cup / Size',
      step1Title: 'Starter Menu',
      step1Subtitle: 'Select the initial coffees, artisan teas and cafe bites for your digital menu.',
      step2Title: 'Fulfilment & Operations',
      step2Subtitle: 'Configure counter pickup tokens, table dine-in, barista queue, and optional GST.',
      step3Title: 'Launch Menu & QR Code',
      step3Subtitle: 'Your digital cafe menu is live with counter QR standees and token display screen.',
    },
    supportedUnits: ['cup', 'glass', 'regular', 'large', 'piece', 'serve'],
    starterCategories: ['Hot Coffees & Espresso', 'Iced & Cold Brews', 'Artisan Teas & Shakes', 'Pastries & Sandwiches'],
    starterItems: [
      { name: 'Classic Cappuccino', categoryName: 'Hot Coffees & Espresso', price: 140, isVegetarian: true, unit: 'cup', description: 'Double espresso with silky steamed microfoam' },
      { name: 'Iced Hazelnut Latte', categoryName: 'Iced & Cold Brews', price: 180, isVegetarian: true, unit: 'cup', description: 'Chilled espresso over whole milk and roasted hazelnut' },
      { name: 'Masala Chai Latte', categoryName: 'Artisan Teas & Shakes', price: 90, isVegetarian: true, unit: 'cup', description: 'Cardamom and ginger spiced tea blend with steamed milk' },
      { name: 'Spinach & Corn Grilled Toast', categoryName: 'Pastries & Sandwiches', price: 150, isVegetarian: true, unit: 'piece', description: 'Cheesy herb-crusted three-cheese grilled sandwich' },
    ],
  },
  {
    id: 'bakery',
    label: 'Bakery & Pastry',
    shortLabel: 'Bakery & Bakes',
    icon: '🥐',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    colorClass: 'text-rose-700',
    description: 'Fresh cakes, artisan breads, pastries, savouries & pre-order custom bakes',
    primaryModule: 'menu',
    terminology: {
      dashboardTitle: 'Bakery & Fresh Bakes Dashboard',
      dashboardSubtitle: 'Daily oven batches, custom cake pre-orders, pickup scheduling & sales',
      itemsTitle: 'Cakes, Breads & Pastries',
      addItemButton: 'Add Bakery Item',
      ordersTitle: 'Bakery & Cake Orders',
      tokensTitle: 'Pre-Order Pickup Tokens',
      storefrontName: 'Bakery Online Catalog',
      kpiSalesSubtitle: 'Fresh bakes & custom cake revenue',
      kpiOrdersSubtitle: 'Custom bakes & daily parcels',
      unitLabel: 'Weight / Piece',
      step1Title: 'Starter Menu',
      step1Subtitle: 'Select initial fresh bakes, celebration cakes and artisan breads to showcase.',
      step2Title: 'Fulfilment & Operations',
      step2Subtitle: 'Configure pre-order pickup schedules, counter takeaway, and optional GST.',
      step3Title: 'Launch Menu & QR Code',
      step3Subtitle: 'Your online bakery showcase is ready for cake pre-orders and counter QR scan.',
    },
    supportedUnits: ['500g', '1kg', 'piece', 'box', 'packet', 'slice'],
    starterCategories: ['Celebration Cakes', 'Pastries & Tarts', 'Artisan Sourdough & Breads', 'Cookies & Tea Cakes'],
    starterItems: [
      { name: 'Belgian Chocolate Truffle (500g)', categoryName: 'Celebration Cakes', price: 550, isVegetarian: true, unit: '500g', description: 'Rich 54% dark chocolate ganache cake' },
      { name: 'Butter Croissant', categoryName: 'Pastries & Tarts', price: 110, isVegetarian: true, unit: 'piece', description: 'Flaky 100% butter French pastry baked fresh daily' },
      { name: 'Multi-Grain Sourdough Loaf', categoryName: 'Artisan Sourdough & Breads', price: 130, isVegetarian: true, unit: 'piece', description: 'Slow fermented naturally leavened artisan loaf' },
      { name: 'Almond Biscotti Jar (200g)', categoryName: 'Cookies & Tea Cakes', price: 210, isVegetarian: true, unit: 'box', description: 'Twice-baked crisp almond cookies for coffee dipping' },
    ],
  },
  {
    id: 'juice_chaat',
    label: 'Juice & Chaat Shop',
    shortLabel: 'Juice & Chaat',
    icon: '🥤',
    badgeClass: 'bg-lime-100 text-lime-800 border-lime-200',
    colorClass: 'text-lime-700',
    description: 'Fresh fruit juices, milkshakes, quick bites, chaats & fast counter tokens',
    primaryModule: 'menu',
    terminology: {
      dashboardTitle: 'Juice, Shakes & Chaat Counter',
      dashboardSubtitle: 'High-speed order punch, glass size options, rapid token queue & counter flow',
      itemsTitle: 'Juices, Shakes & Chaat Menu',
      addItemButton: 'Add Juice / Chaat Item',
      ordersTitle: 'Live Counter Orders',
      tokensTitle: 'Rapid Token Calling',
      storefrontName: 'Digital Counter Menu',
      kpiSalesSubtitle: 'Counter drinks & snack turnover',
      kpiOrdersSubtitle: 'Glasses & chaat plates served',
      unitLabel: 'Glass / Plate',
      step1Title: 'Starter Menu',
      step1Subtitle: 'Select fresh juices, thick shakes and chaat snacks to punch at high speed.',
      step2Title: 'Fulfilment & Operations',
      step2Subtitle: 'Configure counter pickup tokens, speed ordering, and optional GST.',
      step3Title: 'Launch Menu & QR Code',
      step3Subtitle: 'Your digital counter menu is live with rapid token display and QR standees.',
    },
    supportedUnits: ['glass', 'large', 'plate', 'bowl', 'piece'],
    starterCategories: ['Fresh Cold Juices', 'Thick Shakes', 'Delhi Chaats & Snacks', 'Sandwiches & Maggi'],
    starterItems: [
      { name: 'Fresh Mosambi (Sweet Lime) Juice', categoryName: 'Fresh Cold Juices', price: 70, isVegetarian: true, unit: 'glass', description: '100% cold-pressed without added sugar or water' },
      { name: 'Alphonso Mango Thick Shake', categoryName: 'Thick Shakes', price: 110, isVegetarian: true, unit: 'glass', description: 'Pure mango pulp blended with rich vanilla ice cream' },
      { name: 'Sev Puri (6 Pcs)', categoryName: 'Delhi Chaats & Snacks', price: 80, isVegetarian: true, unit: 'plate', description: 'Crisp flat puris topped with potatoes, 3 chutneys and nylon sev' },
      { name: 'Cheese Chilly Toast', categoryName: 'Sandwiches & Maggi', price: 95, isVegetarian: true, unit: 'piece', description: 'Spicy green chilli and melted Amul cheese on toasted bread' },
    ],
  },
  {
    id: 'grocery',
    label: 'Grocery / Kirana',
    shortLabel: 'Kirana & Grocery',
    icon: '🛒',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    colorClass: 'text-emerald-700',
    description: 'Daily provisions, grains, pulses, dairy, packaged items & home delivery',
    primaryModule: 'store',
    terminology: {
      dashboardTitle: 'Kirana & Grocery Inventory Suite',
      dashboardSubtitle: 'Live stock quantities, reorder warnings, local home delivery & retail bills',
      itemsTitle: 'Grocery Catalog & Inventory',
      addItemButton: 'Add Grocery Product',
      ordersTitle: 'Customer Grocery Orders',
      tokensTitle: 'Counter / Pickup Tokens',
      storefrontName: 'Digital Kirana Storefront',
      kpiSalesSubtitle: 'Store billing & delivery revenue',
      kpiOrdersSubtitle: 'Grocery delivery & pickup baskets',
      unitLabel: 'Pack / Kg / Litre',
      step1Title: 'Starter Grocery Products',
      step1Subtitle: 'Select daily provisions, packaged staples, grains, and kitchen essentials.',
      step2Title: 'Inventory & Operations',
      step2Subtitle: 'Configure stock quantities, local doorstep delivery, counter billing, and optional GST.',
      step3Title: 'Launch Store & QR Code',
      step3Subtitle: 'Your Kirana storefront is live with counter QR standees and digital orders.',
    },
    supportedUnits: ['kg', '500g', 'litre', 'packet', 'piece', 'box', 'pouch'],
    starterCategories: ['Grains, Rice & Atta', 'Pulses & Dals', 'Cooking Oils & Ghee', 'Dairy & Breakfast', 'Spices & Masalas'],
    starterItems: [
      { name: 'Royal Sona Masoori Rice (5kg)', categoryName: 'Grains, Rice & Atta', price: 340, unit: 'packet', brand: 'Royal Farm', sku: 'GRC-RCE-5KG', stockQuantity: 25, description: 'Aged premium polished Sona Masoori raw rice' },
      { name: 'Toor Dal Organic (1kg)', categoryName: 'Pulses & Dals', price: 165, unit: 'kg', brand: 'Nature Fresh', sku: 'GRC-DAL-1KG', stockQuantity: 40, description: 'Unpolished protein-rich yellow pigeon peas' },
      { name: 'Pure Desi Cow Ghee (1L Pet Jar)', categoryName: 'Cooking Oils & Ghee', price: 620, unit: 'litre', brand: 'Amrut', sku: 'GRC-GHE-1L', stockQuantity: 15, description: 'Traditional bilona churned aromatic cow ghee' },
      { name: 'Tata Salt Vacuum Evaporated (1kg)', categoryName: 'Spices & Masalas', price: 28, unit: 'packet', brand: 'Tata', sku: 'GRC-SLT-1KG', stockQuantity: 100, description: 'Iodized vacuum evaporated cooking salt' },
    ],
  },
  {
    id: 'retail',
    label: 'Retail Shop',
    shortLabel: 'Retail Store',
    icon: '🛍️',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    colorClass: 'text-blue-700',
    description: 'Apparel, electronics, lifestyle, general retail inventory & barcode tracking',
    primaryModule: 'store',
    terminology: {
      dashboardTitle: 'Retail Shop & Inventory Hub',
      dashboardSubtitle: 'Multi-SKU inventory, barcode identification, sales trend & customer dispatch',
      itemsTitle: 'Retail Products & SKUs',
      addItemButton: 'Add Retail Product',
      ordersTitle: 'Retail Store Orders',
      tokensTitle: 'Dispatch Tokens',
      storefrontName: 'Online Retail Storefront',
      kpiSalesSubtitle: 'Retail storefront & store sales',
      kpiOrdersSubtitle: 'Orders fulfilled',
      unitLabel: 'Piece / Box',
      step1Title: 'Starter Retail Products',
      step1Subtitle: 'Select initial product SKUs, pricing, and barcodes for your retail shop.',
      step2Title: 'Inventory & Operations',
      step2Subtitle: 'Configure stock levels, dispatch queue, store operating hours, and optional GST.',
      step3Title: 'Launch Store & QR Code',
      step3Subtitle: 'Your retail storefront is live with counter QR standees and customer ordering.',
    },
    supportedUnits: ['piece', 'box', 'set', 'pair', 'pack', 'bundle'],
    starterCategories: ['Featured Arrivals', 'Electronics & Accessories', 'Home & Lifestyle', 'Stationery & Office'],
    starterItems: [
      { name: 'Braided Fast USB-C Charging Cable (1.5m)', categoryName: 'Electronics & Accessories', price: 299, unit: 'piece', brand: 'Voltz', sku: 'RTL-CBL-USBC', stockQuantity: 50, description: 'Heavy duty nylon braided 65W fast charging cable' },
      { name: 'Stainless Steel Insulated Flask (750ml)', categoryName: 'Home & Lifestyle', price: 649, unit: 'piece', brand: 'ThermoPro', sku: 'RTL-FLK-750M', stockQuantity: 20, description: 'Double-walled vacuum insulated hot & cold water bottle' },
      { name: 'Executive Hardbound Journal Notebook', categoryName: 'Stationery & Office', price: 240, unit: 'piece', brand: 'Classico', sku: 'RTL-NTB-EXEC', stockQuantity: 35, description: '192-page ruled acid-free 80gsm paper journal' },
    ],
  },
  {
    id: 'other',
    label: 'Other Business',
    shortLabel: 'General Business',
    icon: '🏢',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    colorClass: 'text-slate-700',
    description: 'Custom retail, service business, creative workshops & multipurpose stores',
    primaryModule: 'store',
    terminology: {
      dashboardTitle: 'Business & Operations Hub',
      dashboardSubtitle: 'Multi-purpose product catalog, customer ordering and token management',
      itemsTitle: 'Product & Service Catalog',
      addItemButton: 'Add Item / Service',
      ordersTitle: 'Customer Orders & Inquiries',
      tokensTitle: 'Counter & Token Queue',
      storefrontName: 'Digital Storefront',
      kpiSalesSubtitle: 'Total operational turnover',
      kpiOrdersSubtitle: 'Customer orders recorded',
      unitLabel: 'Unit / Piece',
      step1Title: 'Starter Catalog Offerings',
      step1Subtitle: 'Select initial products, packages or services to showcase on your digital storefront.',
      step2Title: 'Inventory & Operations',
      step2Subtitle: 'Configure delivery or pickup preferences, operating hours, and optional GST.',
      step3Title: 'Launch Store & QR Code',
      step3Subtitle: 'Your storefront is live with digital orders and customer tracking.',
    },
    supportedUnits: ['piece', 'unit', 'set', 'hour', 'session', 'service'],
    starterCategories: ['Core Offerings', 'Special Packages', 'Add-On Services'],
    starterItems: [
      { name: 'Standard Product Package', categoryName: 'Core Offerings', price: 499, unit: 'set', sku: 'GEN-PKG-STD', stockQuantity: 25, description: 'Standard packaged customer offering' },
      { name: 'Premium Service Consultation', categoryName: 'Special Packages', price: 999, unit: 'service', sku: 'GEN-SRV-PRM', description: 'One-on-one professional consultation session' },
    ],
  },
];

export function normalizeCategoryKey(category?: string | null): BusinessType {
  if (!category) return 'hardware';
  const c = category.toLowerCase().trim().replace(/[-\s&]+/g, '_');

  if (c.includes('hardware') || c.includes('building') || c.includes('material') || c.includes('construction') || c.includes('cement')) {
    return 'hardware';
  }
  if (c.includes('cafe') || c.includes('coffee') || c.includes('espresso') || c.includes('barista')) {
    return 'cafe';
  }
  if (c.includes('bakery') || c.includes('pastry') || c.includes('cake') || c.includes('bake')) {
    return 'bakery';
  }
  if (c.includes('juice') || c.includes('chaat') || c.includes('shake')) {
    return 'juice_chaat';
  }
  if (c.includes('grocery') || c.includes('kirana') || c.includes('provision') || c.includes('supermarket')) {
    return 'grocery';
  }
  if (c.includes('retail') || c.includes('clothing') || c.includes('electronics') || c.includes('shop')) {
    return 'retail';
  }
  if (c.includes('restaurant') || c.includes('dining') || c.includes('food') || c.includes('dhaba') || c.includes('kitchen')) {
    return 'restaurant';
  }
  if (c.includes('other') || c.includes('custom') || c.includes('general')) {
    return 'other';
  }

  const direct = BUSINESS_CATEGORIES.find((cat) => cat.id === c);
  if (direct) return direct.id;

  return 'hardware';
}

export function getCategoryConfig(category?: string | null): BusinessCategoryConfig {
  const normalized = normalizeCategoryKey(category);
  const found = BUSINESS_CATEGORIES.find((c) => c.id === normalized);
  return found || BUSINESS_CATEGORIES[0];
}

export interface TokenDisplayConfig {
  browserTitle: string;
  headerSubtitle: string;
  badgeLabel: string;
  counterLabel: string;
  column1: {
    title: string;
    subtitle: string;
    emptyText: string;
    badgeText: string;
    icon: 'package' | 'boxes' | 'shopping-bag' | 'flame' | 'coffee';
    statusMap: Record<string, string>;
  };
  column2: {
    title: string;
    subtitle: string;
    emptyText: string;
    badgeText: string;
    icon: 'truck' | 'check-circle' | 'sparkles';
  };
  voiceAnnouncementTemplate: (token: string, counter?: number, fulfilment?: string) => string;
  footerNote: string;
  fulfilmentLabels: {
    pickup: string;
    delivery: string;
    dine_in: string;
    takeaway: string;
  };
}

const hardwareDisplayConfig: TokenDisplayConfig = {
  browserTitle: 'Live Order Fulfilment & Dispatch Status',
  headerSubtitle: 'Live Order Fulfilment & Dispatch Status',
  badgeLabel: 'Hardware & Materials',
  counterLabel: 'Loading Bay',
  column1: {
    title: 'Orders Being Prepared',
    subtitle: 'Orders currently being picked and packed.',
    emptyText: 'No orders are currently being processed.',
    badgeText: 'Picking & Packing',
    icon: 'package',
    statusMap: {
      new: 'Order Placed',
      accepted: 'Pick List Queued',
      preparing: 'Picking & Packing',
    },
  },
  column2: {
    title: 'Ready for Pickup / Dispatch',
    subtitle: 'Orders ready for customer collection or dispatch.',
    emptyText: 'No orders are currently ready for collection.',
    badgeText: 'Ready for Dispatch',
    icon: 'truck',
  },
  voiceAnnouncementTemplate: (token, counter, fulfilment) =>
    fulfilment === 'delivery'
      ? `Order ${token} is packed and ready for loading and site dispatch.`
      : `Order ${token} is ready for customer collection at loading bay ${counter || 1}.`,
  footerNote: 'Real-time material loading & dispatch display. Verify invoice/token at dispatch gate.',
  fulfilmentLabels: {
    pickup: 'Store Pickup',
    delivery: 'Site Delivery',
    dine_in: 'Counter Bill',
    takeaway: 'Yard Pickup',
  },
};

const groceryDisplayConfig: TokenDisplayConfig = {
  browserTitle: 'Live Order Fulfilment & Dispatch Status',
  headerSubtitle: 'Live Order Processing & Dispatch Status',
  badgeLabel: 'Grocery & Kirana',
  counterLabel: 'Billing Counter',
  column1: {
    title: 'Processing Orders',
    subtitle: 'Orders currently being picked and packed.',
    emptyText: 'No orders are currently being processed.',
    badgeText: 'Packing & Bagging',
    icon: 'shopping-bag',
    statusMap: {
      new: 'Order Received',
      accepted: 'Items Sourced',
      preparing: 'Bagging & Packing',
    },
  },
  column2: {
    title: 'Ready for Collection / Dispatch',
    subtitle: 'Orders ready for customer collection or dispatch.',
    emptyText: 'No orders are currently ready for collection.',
    badgeText: 'Ready for Collection',
    icon: 'check-circle',
  },
  voiceAnnouncementTemplate: (token, counter, fulfilment) =>
    fulfilment === 'delivery'
      ? `Order ${token} is packed and ready for home delivery dispatch.`
      : `Order ${token} is ready for collection at counter ${counter || 1}.`,
  footerNote: 'Real-time grocery packing and collection display. Please have your token ready.',
  fulfilmentLabels: {
    pickup: 'Store Pickup',
    delivery: 'Home Delivery',
    dine_in: 'Counter Bill',
    takeaway: 'Express Pickup',
  },
};

const retailDisplayConfig: TokenDisplayConfig = {
  browserTitle: 'Live Order Fulfilment & Dispatch Status',
  headerSubtitle: 'Live Order Processing & Collection Status',
  badgeLabel: 'Retail & Essentials',
  counterLabel: 'Cash Counter',
  column1: {
    title: 'Processing Orders',
    subtitle: 'Orders currently being picked and packed.',
    emptyText: 'No orders are currently being processed.',
    badgeText: 'Processing',
    icon: 'boxes',
    statusMap: {
      new: 'Order Received',
      accepted: 'Processing',
      preparing: 'Packing',
    },
  },
  column2: {
    title: 'Ready for Collection / Dispatch',
    subtitle: 'Orders ready for customer collection or dispatch.',
    emptyText: 'No orders are currently ready for collection.',
    badgeText: 'Ready for Collection',
    icon: 'check-circle',
  },
  voiceAnnouncementTemplate: (token, counter, fulfilment) =>
    fulfilment === 'delivery'
      ? `Order ${token} is packed and ready for dispatch.`
      : `Order ${token} is ready for collection at counter ${counter || 1}.`,
  footerNote: 'Real-time retail order display. Collect your items at the service desk.',
  fulfilmentLabels: {
    pickup: 'Store Pickup',
    delivery: 'Courier / Delivery',
    dine_in: 'Counter Sale',
    takeaway: 'In-Store Pickup',
  },
};

const restaurantDisplayConfig: TokenDisplayConfig = {
  browserTitle: 'Live Kitchen & Order Status',
  headerSubtitle: 'Live Kitchen Order Status & Token Calling',
  badgeLabel: 'Restaurant Dining',
  counterLabel: 'Pickup Counter',
  column1: {
    title: 'Preparing Now',
    subtitle: 'Orders currently cooking in the kitchen',
    emptyText: 'No food orders currently preparing.',
    badgeText: 'In Kitchen',
    icon: 'flame',
    statusMap: {
      new: 'Order Placed',
      accepted: 'KOT Sent',
      preparing: 'Cooking Now',
    },
  },
  column2: {
    title: 'Ready for Collection',
    subtitle: 'Please collect food from the counter',
    emptyText: 'No orders currently pending collection.',
    badgeText: 'Ready to Serve',
    icon: 'sparkles',
  },
  voiceAnnouncementTemplate: (token, counter) =>
    `Token ${token}, please collect your food order at counter ${counter || 1}.`,
  footerNote: 'Freshly prepared dining & takeaway orders. Scan table QR code to track order.',
  fulfilmentLabels: {
    pickup: 'Takeaway',
    delivery: 'Home Delivery',
    dine_in: 'Dine-In',
    takeaway: 'Takeaway',
  },
};

const cafeDisplayConfig: TokenDisplayConfig = {
  browserTitle: 'Live Barista & Order Display',
  headerSubtitle: 'Live Barista Brew Station & Order Status',
  badgeLabel: 'Cafe & Brew Bar',
  counterLabel: 'Brew Bar',
  column1: {
    title: 'Brewing & Preparing',
    subtitle: 'Beverages & snacks currently being crafted',
    emptyText: 'No orders currently brewing.',
    badgeText: 'At Barista',
    icon: 'coffee',
    statusMap: {
      new: 'Order Placed',
      accepted: 'In Barista Queue',
      preparing: 'Brewing & Blending',
    },
  },
  column2: {
    title: 'Ready for Pickup',
    subtitle: 'Pick up your drinks at the brew counter',
    emptyText: 'No beverages pending pickup.',
    badgeText: 'Ready at Bar',
    icon: 'check-circle',
  },
  voiceAnnouncementTemplate: (token, counter) =>
    `Order ${token} is freshly prepared and ready at the brew bar.`,
  footerNote: 'Artisanal coffee and fresh bakery. Please collect promptly from the pickup bar.',
  fulfilmentLabels: {
    pickup: 'Cafe Takeaway',
    delivery: 'Delivery',
    dine_in: 'Cafe Dine-In',
    takeaway: 'Takeaway',
  },
};

const bakeryDisplayConfig: TokenDisplayConfig = {
  browserTitle: 'Live Bakery Order Status',
  headerSubtitle: 'Live Bakeshop Packing & Order Status',
  badgeLabel: 'Bakery & Patisserie',
  counterLabel: 'Pickup Counter',
  column1: {
    title: 'Baking & Boxing',
    subtitle: 'Orders being freshly packed and boxed',
    emptyText: 'No bakery orders currently being packed.',
    badgeText: 'Boxing',
    icon: 'package',
    statusMap: {
      new: 'Order Placed',
      accepted: 'Bakeshop Sent',
      preparing: 'Boxing & Icing',
    },
  },
  column2: {
    title: 'Ready for Collection',
    subtitle: 'Cakes & bakes ready at pickup counter',
    emptyText: 'No orders waiting for collection.',
    badgeText: 'Ready for Pickup',
    icon: 'check-circle',
  },
  voiceAnnouncementTemplate: (token, counter) =>
    `Order ${token} is boxed and ready for collection.`,
  footerNote: 'Freshly baked delights. Handle cake boxes with care!',
  fulfilmentLabels: {
    pickup: 'Counter Pickup',
    delivery: 'Cake Delivery',
    dine_in: 'Cafe Dine-In',
    takeaway: 'Takeaway',
  },
};

const juiceDisplayConfig: TokenDisplayConfig = {
  browserTitle: 'Live Juice & Chaat Order Status',
  headerSubtitle: 'Live Order Preparation & Counter Calling',
  badgeLabel: 'Juice & Chaat',
  counterLabel: 'Service Counter',
  column1: {
    title: 'Preparing Fresh',
    subtitle: 'Juices & snacks currently being prepared',
    emptyText: 'No orders currently in preparation.',
    badgeText: 'Making Fresh',
    icon: 'flame',
    statusMap: {
      new: 'Order Received',
      accepted: 'In Queue',
      preparing: 'Blending & Prepping',
    },
  },
  column2: {
    title: 'Ready for Collection',
    subtitle: 'Please collect your order at the counter',
    emptyText: 'No orders waiting for collection.',
    badgeText: 'Ready',
    icon: 'check-circle',
  },
  voiceAnnouncementTemplate: (token, counter) =>
    `Token ${token} is ready at the service counter.`,
  footerNote: 'Fresh juices and hot snacks made to order. Please present your token.',
  fulfilmentLabels: {
    pickup: 'Counter Pickup',
    delivery: 'Delivery',
    dine_in: 'Table Order',
    takeaway: 'Takeaway',
  },
};

const otherDisplayConfig: TokenDisplayConfig = {
  browserTitle: 'Live Order Fulfilment & Dispatch Status',
  headerSubtitle: 'Live Order Fulfilment & Counter Calling',
  badgeLabel: 'General Operations',
  counterLabel: 'Service Counter',
  column1: {
    title: 'Processing Orders',
    subtitle: 'Orders currently being processed.',
    emptyText: 'No orders are currently being processed.',
    badgeText: 'Processing',
    icon: 'package',
    statusMap: {
      new: 'Order Received',
      accepted: 'Processing',
      preparing: 'Preparing',
    },
  },
  column2: {
    title: 'Ready for Collection / Dispatch',
    subtitle: 'Orders ready for customer collection or dispatch.',
    emptyText: 'No orders are currently ready for collection.',
    badgeText: 'Ready',
    icon: 'check-circle',
  },
  voiceAnnouncementTemplate: (token, counter) =>
    `Order ${token} is ready for collection at counter ${counter || 1}.`,
  footerNote: 'Real-time token display engine. Please have your token ready.',
  fulfilmentLabels: {
    pickup: 'Customer Pickup',
    delivery: 'Delivery / Dispatch',
    dine_in: 'Counter Service',
    takeaway: 'Takeaway',
  },
};

export const TOKEN_DISPLAY_CONFIGS: Record<BusinessType, TokenDisplayConfig> = {
  hardware: hardwareDisplayConfig,
  hardware_building_materials: hardwareDisplayConfig,
  grocery: groceryDisplayConfig,
  grocery_kirana: groceryDisplayConfig,
  retail: retailDisplayConfig,
  retail_shop: retailDisplayConfig,
  restaurant: restaurantDisplayConfig,
  cafe: cafeDisplayConfig,
  cafe_coffee_bar: cafeDisplayConfig,
  bakery: bakeryDisplayConfig,
  bakery_pastry: bakeryDisplayConfig,
  juice_chaat: juiceDisplayConfig,
  juice_shop: juiceDisplayConfig,
  other: otherDisplayConfig,
};

export function getTokenDisplayConfig(category?: string | null): TokenDisplayConfig {
  const normalized = normalizeCategoryKey(category);
  return TOKEN_DISPLAY_CONFIGS[normalized] || TOKEN_DISPLAY_CONFIGS.hardware;
}
