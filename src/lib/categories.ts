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
    supportedUnits: ['piece', 'inch', 'feet', 'metre', 'mm', 'box', 'packet', 'kg', 'gram', 'bag', 'bundle', 'sq_ft', 'litre', 'fitment size'],
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
    supportedUnits: ['portion', 'plate', 'half', 'full', 'piece', 'set', 'glass', 'cup', 'bottle', 'ml', 'litre', 'kg', 'gram'],
    starterCategories: ['Starters & Appetizers', 'Main Course', 'Breads & Rice', 'Desserts & Beverages'],
    starterItems: [
      { name: 'Paneer Butter Masala', categoryName: 'Main Course', price: 220, isVegetarian: true, unit: 'portion', description: 'Rich creamy cottage cheese curry with butter makhani gravy' },
      { name: 'Butter Tandoori Roti', categoryName: 'Breads & Rice', price: 25, isVegetarian: true, unit: 'piece', description: 'Crisp whole wheat tandoori flatbread with dollop of butter' },
      { name: 'Crispy Veg Spring Rolls (6 Pcs)', categoryName: 'Starters & Appetizers', price: 160, isVegetarian: true, unit: 'plate', description: 'Crisp rolls with sweet chilli dip and shredded cabbage' },
      { name: 'Gulab Jamun (2 Pcs)', categoryName: 'Desserts & Beverages', price: 70, isVegetarian: true, unit: 'portion', description: 'Warm khoya dumplings in cardamom saffron syrup' },
    ],
  },
  {
    id: 'hotel',
    label: 'Hotel & Room Service',
    shortLabel: 'Hotel & Rooms',
    icon: '🏨',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    colorClass: 'text-emerald-700',
    description: 'In-room food dining, guest room QR codes, room management, kitchen KOT & delivery',
    primaryModule: 'menu',
    terminology: {
      dashboardTitle: 'Hotel & In-Room Dining Operations',
      dashboardSubtitle: 'Live guest room service orders, KOT status, room QR codes and guest dining sales',
      itemsTitle: 'In-Room Food & Drink Menu',
      addItemButton: 'Add Room Service Item',
      ordersTitle: 'Room Service & In-Room Orders',
      tokensTitle: 'Kitchen KOT & Room Delivery Queue',
      storefrontName: 'In-Room Guest Dining Menu',
      kpiSalesSubtitle: 'Room service dining turnover',
      kpiOrdersSubtitle: 'Guest room orders & KOT',
      unitLabel: 'Serving (Portion/Plate/Item)',
      step1Title: 'Starter Menu & Room Service',
      step1Subtitle: 'Select initial in-room dining items and refreshments to feature on your guest digital menu.',
      step2Title: 'Rooms & Fulfilment Operations',
      step2Subtitle: 'Configure guest room numbers, in-room delivery, kitchen KOT, and optional taxes.',
      step3Title: 'Launch Room Menu & Room QR Codes',
      step3Subtitle: 'Your in-room dining menu is live with individual room QR codes and kitchen token screen.',
    },
    supportedUnits: ['portion', 'plate', 'half', 'full', 'piece', 'set', 'glass', 'bottle'],
    starterCategories: ['Breakfast & Morning Specials', 'Soups & Starters', 'Main Course & Thalis', 'Breads & Rice', 'Beverages & Minibar', 'Desserts & Late Night'],
    starterItems: [
      { name: 'Executive Club Sandwich with Fries', categoryName: 'Breakfast & Morning Specials', price: 210, isVegetarian: true, unit: 'plate', description: 'Triple-decker toasted sandwich with coleslaw, cheese, and golden fries' },
      { name: 'Paneer Butter Masala with 2 Naan', categoryName: 'Main Course & Thalis', price: 280, isVegetarian: true, unit: 'set', description: 'Rich creamy paneer butter masala served with two crisp butter tandoori naans' },
      { name: 'Fresh Mint Lime Soda', categoryName: 'Beverages & Minibar', price: 90, isVegetarian: true, unit: 'glass', description: 'Chilled sparkling soda infused with fresh garden mint and lime juice' },
      { name: 'Hot Gulab Jamun with Ice Cream', categoryName: 'Desserts & Late Night', price: 120, isVegetarian: true, unit: 'portion', description: 'Two warm mawa gulab jamuns served alongside creamy vanilla bean ice cream' },
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
    supportedUnits: ['kg', 'gram', 'litre', 'ml', 'packet', 'piece', 'box', 'pouch', 'bag', 'bundle'],
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
  if (c.includes('hotel') || c.includes('room') || c.includes('resort') || c.includes('lodge') || c.includes('inn') || c.includes('hospitality')) {
    return 'hotel';
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

const hotelDisplayConfig: TokenDisplayConfig = {
  browserTitle: 'In-Room Dining & Room Service Status',
  headerSubtitle: 'Live Room Service Kitchen KOT & Delivery Status',
  badgeLabel: 'Hotel In-Room Dining',
  counterLabel: 'Room Service Pantry',
  column1: {
    title: 'Orders Being Prepared',
    subtitle: 'Freshly cooking in hotel kitchen for room delivery.',
    emptyText: 'No room service orders are currently being prepared.',
    badgeText: 'Kitchen Cooking',
    icon: 'flame',
    statusMap: {
      new: 'Order Received',
      accepted: 'Chef Confirmed',
      preparing: 'Preparing in Kitchen',
    },
  },
  column2: {
    title: 'Ready for Room Delivery',
    subtitle: 'Room service attendant dispatched to room.',
    emptyText: 'No orders are currently awaiting room dispatch.',
    badgeText: 'Dispatched to Room',
    icon: 'check-circle',
  },
  voiceAnnouncementTemplate: (token) =>
    `Room service order ${token} is ready for delivery. Attendant dispatched to room.`,
  footerNote: 'Orders are freshly delivered directly to your hotel room door. Please keep your room accessible.',
  fulfilmentLabels: {
    pickup: 'Front Desk Pickup',
    delivery: 'In-Room Delivery',
    dine_in: 'Room Service Dining',
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
  hotel: hotelDisplayConfig,
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

export interface TableRoomLabelConfig {
  label: string;
  fieldLabel: string;
  placeholder: string;
  badgePrefix: string;
}

export function getTableRoomLabel(
  orderSettings?: { tableRoomLabelMode?: 'table' | 'room' | 'table_or_room'; customTableRoomLabel?: string } | null,
  businessCategory?: string | null
): TableRoomLabelConfig {
  if (orderSettings?.customTableRoomLabel?.trim()) {
    const custom = orderSettings.customTableRoomLabel.trim();
    return {
      label: custom,
      fieldLabel: `${custom} (Optional)`,
      placeholder: `e.g. 4, 101, Patio (leave blank if not needed)`,
      badgePrefix: custom,
    };
  }

  const mode = orderSettings?.tableRoomLabelMode;
  const normalizedCategory = normalizeCategoryKey(businessCategory);
  const isHotel = normalizedCategory === 'hotel';

  if (mode === 'room' || (!mode && isHotel)) {
    return {
      label: 'Room Number',
      fieldLabel: 'Room No. (Optional)',
      placeholder: 'e.g. 101, 204, Suite-A (leave blank if not needed)',
      badgePrefix: '🛏️ Room',
    };
  }

  if (mode === 'table' || (!mode && ['restaurant', 'cafe', 'bakery', 'juice_chaat'].includes(normalizedCategory))) {
    return {
      label: 'Table Number',
      fieldLabel: 'Table No. (Optional)',
      placeholder: 'e.g. Table 4, Patio 2, T-12 (leave blank if not needed)',
      badgePrefix: '🍽️ Table',
    };
  }

  return {
    label: 'Table / Room Number',
    fieldLabel: 'Table / Room No. (Optional)',
    placeholder: 'e.g. Table 4, Room 101 (leave blank if not needed)',
    badgePrefix: '📍 Table/Room',
  };
}

/**
 * Universal list of standard measurement and portion units supported across OrderOne.
 */
export const STANDARD_UNITS = [
  'piece',
  'kg',
  'gram',
  'litre',
  'ml',
  'packet',
  'box',
  'bag',
  'inch',
  'feet',
  'metre',
  'mm',
  'cm',
  'sq_ft',
  'fitment size',
  'portion',
  'plate',
  'half',
  'full',
  'glass',
  'cup',
  'bottle',
  'set',
  'pair',
  'bundle',
  'pouch',
  'can',
];

/**
 * Quick popular size suggestions based on business category.
 */
export const POPULAR_SIZE_PRESETS: { [category: string]: string[] } = {
  hardware: ['1/2 inch', '3/4 inch', '1 inch', '2 inch', '12-inch', '1 feet', '1 metre', 'Fitment 25mm', 'Fitment 50mm', 'Fitment 100mm'],
  grocery: ['100g', '250g', '500g', '1 kg', '2 kg', '5 kg', '10 kg', '250 ml', '500 ml', '1 litre', '5 litre'],
  restaurant: ['Regular', 'Large', 'Half', 'Full', 'Single', 'Double', 'Combo'],
  cafe: ['Small', 'Regular', 'Large', '300 ml', '500 ml'],
  bakery: ['500g', '1 kg', '2 kg', 'Slice', 'Box of 6', 'Box of 12'],
  retail: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '12-inch', 'Free Size'],
  default: ['1 kg', '5 kg', '12-inch', 'Regular', 'Large', 'Half', 'Full'],
};

/**
 * Returns list of recommended units for a business category.
 */
export function getCategoryUnits(category?: string | null): string[] {
  const config = getCategoryConfig(category);
  const combined = Array.from(new Set([...config.supportedUnits, ...STANDARD_UNITS]));
  return combined;
}

/**
 * Returns clean high-res circular food dish photo URL for food & restaurant categories.
 */
export function getCategoryFoodImage(name: string): string {
  const lower = (name || '').toLowerCase().trim();
  if (lower.includes('roll') || lower.includes('wrap') || lower.includes('kathi')) {
    return '/images/categories/rolls.png';
  }
  if (lower.includes('pizza')) {
    return '/images/categories/pizzas.png';
  }
  if (lower.includes('tea') || lower.includes('chai')) {
    return '/images/categories/tea.png';
  }
  if (lower.includes('burger')) {
    return '/images/categories/burger.png';
  }
  if (lower.includes('chinese') || lower.includes('noodle') || lower.includes('ramen') || lower.includes('chowmein') || lower.includes('manchurian')) {
    return '/images/categories/chinese.png';
  }
  if (lower.includes('cake') || lower.includes('pastry') || lower.includes('bakery')) {
    return '/images/categories/cake.png';
  }
  if (lower.includes('dessert') || lower.includes('sweet') || lower.includes('waffle') || lower.includes('mithai') || lower.includes('halwa')) {
    return '/images/categories/dessert.png';
  }
  if (lower.includes('north') || lower.includes('roti') || lower.includes('chapati') || lower.includes('naan') || lower.includes('curry') || lower.includes('paneer') || lower.includes('dal') || lower.includes('gravy')) {
    return '/images/categories/north-indian.png';
  }
  if (lower.includes('south') || lower.includes('idli') || lower.includes('dosa') || lower.includes('vada') || lower.includes('sambar') || lower.includes('uttapam')) {
    return '/images/categories/south-indian.png';
  }
  if (lower.includes('sandwich') || lower.includes('toast') || lower.includes('panini')) {
    return '/images/categories/sandwich.png';
  }
  if (lower.includes('ice') || lower.includes('cream') || lower.includes('gelato') || lower.includes('sundae') || lower.includes('kulfi')) {
    return '/images/categories/ice-cream.png';
  }
  if (lower.includes('biryani') || lower.includes('rice') || lower.includes('pulao') || lower.includes('fried rice')) {
    return '/images/categories/biryani.png';
  }
  if (lower.includes('momo') || lower.includes('dimsum') || lower.includes('dumpling')) {
    return '/images/categories/momos.png';
  }
  if (lower.includes('beverage') || lower.includes('drink') || lower.includes('juice') || lower.includes('shake') || lower.includes('smoothie') || lower.includes('cold drink') || lower.includes('soda')) {
    return '/images/categories/beverages.png';
  }
  if (lower.includes('pasta') || lower.includes('macaroni') || lower.includes('spaghetti') || lower.includes('lasagna')) {
    return '/images/categories/pasta.png';
  }
  if (lower.includes('chaat') || lower.includes('pani puri') || lower.includes('golgappa') || lower.includes('bhel') || lower.includes('sev puri')) {
    return '/images/categories/chaat.png';
  }
  if (lower.includes('starter') || lower.includes('appetizer') || lower.includes('tikka') || lower.includes('kebab') || lower.includes('pakora') || lower.includes('crispy')) {
    return '/images/categories/starters.png';
  }
  if (lower.includes('coffee') || lower.includes('cafe') || lower.includes('cappuccino') || lower.includes('espresso') || lower.includes('latte')) {
    return '/images/categories/coffee.png';
  }
  if (lower.includes('thali') || lower.includes('meal') || lower.includes('combo') || lower.includes('main course') || lower.includes('platter')) {
    return '/images/categories/thali.png';
  }
  return '/images/categories/all.png';
}

