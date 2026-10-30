export interface SeoSolution {
  slug: string;
  title: string;
  description: string;
  intro: string;
  workflow: string[];
  benefits: { title: string; description: string }[];
  faqs: { q: string; a: string }[];
}

export const SEO_SOLUTIONS: SeoSolution[] = [
  {
    slug: 'retail-pos-billing', title: 'Retail POS and Billing Software',
    description: 'Create counter bills, manage product catalogs and track orders with retail POS and billing tools built for Indian shops.',
    intro: 'Keep counter sales and customer orders organized in one shop workflow. OrderOne provides POS billing, product catalogs and order tracking for independent retailers.',
    workflow: ['Add products with the unit and price your shop uses.', 'Create a counter bill from POS and record its payment method.', 'Review bills and incoming storefront orders from the dashboard.'],
    benefits: [
      { title: 'Counter billing', description: 'Select catalog products, adjust quantities and record a POS sale without sending the customer through online checkout.' },
      { title: 'Order visibility', description: 'Keep online Store Orders separate from counter sales and review each channel in its own workflow.' },
      { title: 'Product catalog', description: 'Organize names, categories, prices and available stock for customers browsing your storefront.' },
    ],
    faqs: [
      { q: 'Can I use OrderOne for walk-in sales?', a: 'Yes. POS Counter Billing is designed for staff to create and record walk-in counter bills.' },
      { q: 'Can customers order from my shop online too?', a: 'Businesses with the Store module enabled can publish a digital storefront and manage those orders separately from POS bills.' },
    ],
  },
  {
    slug: 'restaurant-billing', title: 'Restaurant Billing and Order Management',
    description: 'Manage restaurant counter billing, digital menus, QR orders and kitchen queues with OrderOne restaurant software.',
    intro: 'Use a digital menu and order queue alongside counter billing. Restaurant staff can see incoming menu orders and move them through kitchen preparation.',
    workflow: ['Create menu items and categories.', 'Share a public menu or table QR with guests.', 'Review new orders and update preparation status from the dashboard.'],
    benefits: [
      { title: 'Menu ordering', description: 'Publish menu items on a mobile-friendly page customers can browse without installing an app.' },
      { title: 'Kitchen queue', description: 'Give staff a menu-order queue with order tokens and status updates.' },
      { title: 'Counter sales', description: 'Use POS billing for walk-in purchases while the digital menu handles customer-submitted orders.' },
    ],
    faqs: [
      { q: 'Do guests need an app to order?', a: 'Guests can open a public menu in their browser. They do not need to install the OrderOne merchant app.' },
      { q: 'Are dine-in orders separated from retail orders?', a: 'Menu orders use a separate source from Store Orders so restaurant and retail queues remain distinct.' },
    ],
  },
  {
    slug: 'grocery-shop-management', title: 'Grocery Shop Billing and Management',
    description: 'Organize grocery products, categories, stock and counter bills with practical shop management tools for kirana stores.',
    intro: 'Keep a digital product list for a grocery or kirana shop and use POS billing for counter transactions. Product units and stock are managed in the catalog workflow.',
    workflow: ['Set up grocery categories and product details.', 'Use POS to bill walk-in purchases.', 'Publish a Store page when online browsing and ordering fit your operation.'],
    benefits: [
      { title: 'Organized catalog', description: 'Group frequently purchased grocery items into categories customers and staff can browse.' },
      { title: 'Counter sales', description: 'Create POS bills from products without turning every sale into an online order.' },
      { title: 'Optional storefront', description: 'Enable a public Store catalog when you want customers to browse products online.' },
    ],
    faqs: [
      { q: 'Can product units be shown in the catalog?', a: 'Product records support unit details entered by the business owner. Configure units that match the products you sell.' },
      { q: 'Does the software automatically update supplier stock?', a: 'OrderOne tracks catalog stock fields; it does not claim to connect to supplier inventory systems.' },
    ],
  },
  {
    slug: 'hardware-shop-billing', title: 'Hardware Shop Billing Software',
    description: 'Manage a hardware shop catalog, product categories, stock and POS counter bills with OrderOne business software.',
    intro: 'Hardware and building-material shops often sell products in different units and categories. OrderOne combines a configurable product catalog with counter billing and optional online browsing.',
    workflow: ['Add product names, prices, units and categories.', 'Create walk-in bills from POS and review sales records.', 'Share the storefront link for customers who want to check the catalog.'],
    benefits: [
      { title: 'Catalog by category', description: 'Make an assortment easier to organize by creating categories for products you stock.' },
      { title: 'Unit-aware records', description: 'Use product descriptions and unit fields to identify how items are sold.' },
      { title: 'Digital storefront', description: 'Publish a product catalog online when customers benefit from browsing your range.' },
    ],
    faqs: [
      { q: 'Can I list products sold in different units?', a: 'The product catalog supports unit details so you can describe how each item is sold.' },
      { q: 'Does OrderOne calculate construction estimates?', a: 'No. OrderOne provides catalog, billing and order tools; it does not replace a project estimation or engineering system.' },
    ],
  },
  {
    slug: 'inventory-management', title: 'Inventory and Product Management',
    description: 'Maintain product catalogs, categories and stock records while connecting inventory workflows to POS and storefront orders.',
    intro: 'Keep item information in a shared business catalog and make it available to the workflows enabled for your business, including POS and storefront browsing.',
    workflow: ['Create a category structure for your team.', 'Add product details, prices and stock information.', 'Review counter and online orders in their respective dashboard queues.'],
    benefits: [
      { title: 'Central product records', description: 'Maintain names, categories, prices, images and stock information in one catalog.' },
      { title: 'Useful in billing', description: 'Select catalog items during POS billing rather than re-entering their details for every sale.' },
      { title: 'Connected storefront', description: 'Use product records to populate the online catalog when the Store module is active.' },
    ],
    faqs: [
      { q: 'Does OrderOne connect to accounting or supplier software?', a: 'This page describes product and stock workflows available in OrderOne; confirm integrations before relying on external synchronization.' },
      { q: 'Can I keep a catalog without online ordering?', a: 'The dashboard includes catalog and POS workflows. Module access depends on the active plan and business configuration.' },
    ],
  },
  {
    slug: 'online-store-ordering', title: 'Online Store and Ordering Software',
    description: 'Give your shop a shareable online storefront with product categories, customer orders and a dashboard for managing requests.',
    intro: 'A small business can publish a mobile-friendly catalog and use its storefront URL to let customers browse products and place orders.',
    workflow: ['Add products and categories to the Store catalog.', 'Share your storefront link or QR code.', 'Review and update customer orders from Store Orders.'],
    benefits: [
      { title: 'Your catalog online', description: 'Show customers product details and categories in a dedicated public page.' },
      { title: 'Order management', description: 'Review storefront submissions in the Store Orders queue.' },
      { title: 'Business-owned details', description: 'Owners manage their own product names, prices and contact information.' },
    ],
    faqs: [
      { q: 'Can any business publish a storefront?', a: 'Storefront availability depends on the business plan and enabled modules.' },
      { q: 'Does OrderOne ship products?', a: 'No. OrderOne provides ordering software; merchants manage fulfillment and customer service for their own products.' },
    ],
  },
  {
    slug: 'manual-billing-calculator', title: 'Manual Billing Calculator',
    description: 'Calculate manual bills with item names, quantities, units, prices, discounts and tax, then save a complete bill record.',
    intro: 'Use manual billing when you need to record a sale that is not already represented by a catalog product. Enter line details and review the calculated total before saving.',
    workflow: ['Enter an optional item name, quantity, unit and unit price.', 'Apply a discount or tax rate and review the calculated amount.', 'Save the bill to business history for later review and PDF export.'],
    benefits: [
      { title: 'No catalog item required', description: 'Create a bill for an ad hoc item without adding it to the permanent product catalog.' },
      { title: 'Complete saved details', description: 'A saved bill keeps item lines and calculation details for reference.' },
      { title: 'Review and export', description: 'Search past bills and open their printable or downloadable receipt.' },
    ],
    faqs: [
      { q: 'Does a manual bill create a product?', a: 'No. Manual bill items are saved as bill details and do not create catalog products.' },
      { q: 'Can I save more than the grand total?', a: 'The bill record includes line items, subtotal, discount, tax and payable amount.' },
    ],
  },
  {
    slug: 'qr-code-ordering', title: 'QR Code Ordering for Stores and Restaurants',
    description: 'Share a QR code that opens your business storefront or digital menu directly in a customer’s mobile browser.',
    intro: 'OrderOne QR codes link customers to a public Store or Menu page. For restaurants, table-specific QR links can carry the configured table context into ordering.',
    workflow: ['Choose the public Store or Menu page to share.', 'Create or download a QR code for that page or table.', 'Place the QR where customers can scan it with a phone camera.'],
    benefits: [
      { title: 'Fast access', description: 'Customers can open the destination page with a phone camera and browser.' },
      { title: 'Restaurant table context', description: 'A table-specific menu QR can identify its configured table.' },
      { title: 'Printable designs', description: 'Download QR designs for menus, counters or table signage.' },
    ],
    faqs: [
      { q: 'Do QR codes require a special app?', a: 'A phone camera that supports QR scanning and a web browser are enough to open the public page.' },
      { q: 'Can one QR identify a restaurant table?', a: 'Yes. Use a table-specific QR code configured for that table.' },
    ],
  },
  {
    slug: 'business-management-software', title: 'Business Management Software for Small Shops',
    description: 'Bring shop billing, products, orders and digital customer access together with business tools from OrderOne.in.',
    intro: 'OrderOne is a web platform for retail and food-business workflows. Businesses can use modules that match their operations, from counter billing to public ordering.',
    workflow: ['Register your business and select its category.', 'Set up modules, products or menu items your team needs.', 'Use the dashboard to manage bills and orders.'],
    benefits: [
      { title: 'Purpose-built modules', description: 'Use different Store and Menu workflows for retail and restaurant orders.' },
      { title: 'Mobile-friendly access', description: 'Open the dashboard and public pages from modern mobile and desktop browsers.' },
      { title: 'Merchant control', description: 'Business owners maintain their own catalog, order and storefront information.' },
    ],
    faqs: [
      { q: 'Is OrderOne a point-of-sale product or an online store builder?', a: 'It includes POS billing, product catalogs and optional public ordering modules, depending on the business configuration.' },
      { q: 'Can I use it in any Indian city?', a: 'OrderOne is a web-based platform. This does not imply it has a staffed office or local branch in every city.' },
    ],
  },
];

export interface SeoArticle {
  slug: string;
  title: string;
  description: string;
  intro: string;
  sections: { heading: string; paragraphs: string[]; steps?: string[] }[];
  relatedSolutions: string[];
}

export const SEO_ARTICLES: SeoArticle[] = [
  {
    slug: 'how-to-set-up-a-restaurant-qr-menu',
    title: 'How to Set Up a Restaurant QR Menu',
    description: 'A practical checklist for setting up menu categories, items and table QR links for a restaurant using a web-based ordering page.',
    intro: 'A QR menu is useful when its destination is current, readable on phones and easy for staff to maintain. Start with the menu structure before printing table signs.',
    sections: [
      { heading: 'Prepare the menu information', paragraphs: ['Collect item names, descriptions, prices and the categories guests use to browse. Check that prices match the menu your team currently serves.'] },
      { heading: 'Build and review the public menu', paragraphs: ['Add menu categories and items in the dashboard, then open the public menu on a phone. Check long names, item availability, images and ordering steps before sharing it.'] },
      { heading: 'Create table QR links', paragraphs: ['For table service, create table-specific QR codes so the menu can retain its configured table number. Scan each print proof before placing it on a table.'], steps: ['Create one code for each table.', 'Scan each code and verify its table context.', 'Replace damaged or outdated prints when the destination changes.'] },
      { heading: 'Keep the menu maintained', paragraphs: ['Assign a staff routine for updating unavailable items and price changes. A QR menu still needs regular owner review.'] },
    ],
    relatedSolutions: ['restaurant-billing', 'qr-code-ordering'],
  },
  {
    slug: 'retail-billing-software-checklist',
    title: 'Retail Billing Software: A Practical Selection Checklist',
    description: 'Compare retail billing tools by checking counter workflow, catalog setup, order separation, plan limits and mobile usability.',
    intro: 'A useful billing system should fit the way a shop sells. Before choosing one, test the common sale from product selection to final receipt.',
    sections: [
      { heading: 'Test a real counter sale', paragraphs: ['Use a short list of representative products. Check how quickly staff can select an item, change quantity, apply a discount if needed and choose a payment method.'] },
      { heading: 'Check the catalog model', paragraphs: ['Review whether categories, product units, prices, images and stock fields match your inventory. Ask how plan limits affect creating or editing records.'] },
      { heading: 'Separate sales channels', paragraphs: ['If you sell online and at the counter, confirm staff can distinguish POS bills from online orders and see each channel status clearly.'] },
      { heading: 'Plan for daily operations', paragraphs: ['Try the interface on the phone or tablet staff will use. Confirm order history, receipts, support and account access before making a long-term decision.'], steps: ['List your busiest daily tasks.', 'Run those tasks on your actual devices.', 'Review recurring cost and plan limits with the provider.'] },
    ],
    relatedSolutions: ['retail-pos-billing', 'inventory-management'],
  },
  {
    slug: 'organize-a-hardware-shop-product-catalog',
    title: 'How to Organize a Hardware Shop Product Catalog',
    description: 'Practical steps for grouping hardware products, recording units and keeping a digital catalog easier to browse and bill.',
    intro: 'A consistent catalog saves time only when staff use the same names and units. Build a simple structure that reflects how customers ask for products.',
    sections: [
      { heading: 'Choose familiar categories', paragraphs: ['Start with departments customers already recognize, such as electrical, plumbing, fasteners or tools. Avoid creating a separate category for every item.'] },
      { heading: 'Standardize product names and units', paragraphs: ['Use a consistent order for brand, size, type and pack information. Record the selling unit clearly so staff can distinguish a piece, box, metre or kilogram.'] },
      { heading: 'Review prices and availability', paragraphs: ['Assign a regular owner or staff check for price and stock changes. Mark outdated products unavailable or update their details before customers rely on the catalog.'] },
      { heading: 'Connect the catalog to billing', paragraphs: ['Test common POS transactions with products from different categories and units. Then share the online catalog if customers benefit from checking details before visiting.'], steps: ['Start with frequently sold products.', 'Ask counter staff to test search terms.', 'Expand categories after the first set is accurate.'] },
    ],
    relatedSolutions: ['hardware-shop-billing', 'inventory-management'],
  },
];
