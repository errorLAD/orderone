# Premium Digital Store + Menu + Token SaaS Platform

A multi-tenant SaaS platform built for Indian cafes, restaurants, bakeries, juice shops, grocery stores, and retail businesses.

## Key Features & Highlights

### 1. Dual Independent Modules (Strict Separation)
- **Digital Retail Store (`/store/[slug]`)**:
  - Retail product catalog, category navigation, search, and variants.
  - SKU & barcode support with atomic stock deduction and low-stock alerts.
  - Generates Store tokens (`S-00101`, `S-00102`, etc.).
  - **Orders appear exclusively in Store Orders** (`/dashboard/store/orders`).
- **Digital Restaurant Menu (`/menu/[slug]`)**:
  - Mouthwatering digital menu with dietary tags (Veg, Non-Veg, Spicy, Jain).
  - Portions/sizes, add-ons, and table selection for Dine-in.
  - Generates Kitchen Menu tokens (`M-00101`, `M-00102`, etc.).
  - **Orders appear exclusively in Menu Orders** (`/dashboard/menu/orders`).

### 2. Guest Ordering Without Registration
- Customers scan QR codes and place orders immediately.
- No account creation, login, or passwords required.
- Private, secure order tracking links (`/track/[trackingId]`).

### 3. Automatic Sequential Order Tokens
- Concurrency-safe atomic token generator with independent sequences per business and module.
- Concurrency-safe under simultaneous checkouts.

### 4. Real-time Alerts & TV Display
- **Live Notifications**: Server-Sent Events (SSE) push live order events to connected dashboards.
- **Audio Synthesizer**: Web Audio API generates distinct pleasant chimes for Store vs Menu orders with user-controlled mute.
- **Public TV / Tablet Queue Display (`/display/[slug]`)**:
  - High-contrast, airport/counter screen with "PREPARING" and "READY FOR PICKUP" columns.
  - Customer phone numbers and private details strictly masked for privacy.

### 5. Main Owner Analytics Dashboard
- Top 4 KPI Cards:
  1. Today's Order Value (INR ₹) — Cancelled orders excluded.
  2. Today's Payments Collected / Earnings — Paid vs Pending/Counter.
  3. Today's Orders with active status breakdown.
  4. Today's Unique Identified Customers.
- Interactive Recharts charts:
  - Sales trend comparison (Store vs Menu vs Total).
  - Hourly rush-hour distribution.
  - Status distribution donut.
  - Top-selling products table with ranking, units sold, and revenue.
  - Low-stock inventory warnings.

### 6. Multi-Tenant Role-Based Access Control
- **Platform Super Admin**: Multi-tenant overview, business account activation/suspension, plan pricing management.
- **Business Owner**: Full storefront, product catalog, pricing, order fulfillment, and billing control.
- **Store / Kitchen Staff**: Order fulfillment and token calling.

### 7. SaaS Subscriptions (₹20/mo Entry Plan)
- **Micro Starter**: ₹20/month (₹200/year) — Perfect for small Indian street vendors, tea stalls and retail kiosks.
- **Business Pro**: ₹49/month (₹490/year) — Both Store & Menu enabled simultaneously, TV display, analytics.
- **Multi-Branch Elite**: ₹99/month (₹990/year) — Unlimited products, priority support.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui aesthetic
- **Icons**: Lucide React
- **Charts**: Recharts
- **QR Engine**: `qrcode` library
- **Effects**: `canvas-confetti`
- **Audio**: Web Audio API Synthesizer
- **Database Engine**: Local file-persisted atomic relational store (`src/lib/db.ts`) with zero external dependency hurdles + Supabase PostgreSQL schema (`supabase/schema.sql`) for production.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
npm start
```

### 4. Run Core Verification Test Suite
```bash
npx --yes tsx test_core.mjs
```

---

## Key URLs

| Route | Description |
|---|---|
| `/` | Landing page & live demo launcher |
| `/dashboard` | Main Analytics Dashboard (KPIs & Charts) |
| `/dashboard/store/catalog` | Retail store catalog & stock inventory |
| `/dashboard/store/orders` | Store orders ONLY (S-Tokens) |
| `/dashboard/store/tokens` | Store counter queue |
| `/dashboard/menu/catalog` | Digital food menu & dietary tags |
| `/dashboard/menu/orders` | Restaurant kitchen tickets ONLY (M-Tokens) |
| `/dashboard/menu/tokens` | Kitchen cooking & serving queue |
| `/dashboard/qr-codes` | Printable branded QR posters |
| `/dashboard/subscription` | SaaS plans & ₹20/mo billing |
| `/dashboard/settings` | Business settings & channel toggles |
| `/dashboard/admin` | Platform super administrator console |
| `/store/annapurna-foods` | Public customer retail store |
| `/menu/annapurna-foods` | Public customer dining food menu |
| `/display/annapurna-foods` | Public TV / tablet queue display |
| `/track/[trackingId]` | Private guest order tracking link |
| `/onboarding` | Business registration & setup wizard |
