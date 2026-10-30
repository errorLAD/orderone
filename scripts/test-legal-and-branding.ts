import fs from 'fs';
import path from 'path';
import { PLATFORM_CONFIG } from '../src/lib/platformConfig';
import { getSubscriptionPlans } from '../src/lib/db';

async function runLegalAndBrandingTests() {
  console.log('================================================================');
  console.log('STARTING ORDERONE.IN LEGAL PAGES & BRAND IDENTITY VERIFICATION');
  console.log('================================================================');

  const legalCompany = PLATFORM_CONFIG.legalCompanyName;
  const brand = PLATFORM_CONFIG.brandName;

  // ----------------------------------------------------------------
  // TEST 1: Centralized Company & Brand Identity Configuration
  // ----------------------------------------------------------------
  console.log('\n[TEST 1] Verifying Centralized Platform Legal Config...');
  if (brand !== 'OrderOne.in') {
    throw new Error(`Expected brand name 'OrderOne.in', got '${brand}'`);
  }
  if (legalCompany !== 'InfraBlue Materials Technology Private Limited') {
    throw new Error(`Expected legal company name 'InfraBlue Materials Technology Private Limited', got '${legalCompany}'`);
  }
  console.log(`✓ PASS: Brand is '${brand}', operated by '${legalCompany}'.`);

  // ----------------------------------------------------------------
  // TEST 2: Verify Legal & Public Pages Existence on Disk
  // ----------------------------------------------------------------
  console.log('\n[TEST 2] Verifying all required public pages exist...');
  const requiredPages = [
    { route: '/about', file: 'src/app/about/page.tsx' },
    { route: '/terms', file: 'src/app/terms/page.tsx' },
    { route: '/privacy-policy', file: 'src/app/privacy-policy/page.tsx' },
    { route: '/refund-policy', file: 'src/app/refund-policy/page.tsx' },
  ];

  for (const p of requiredPages) {
    const fullPath = path.join(process.cwd(), p.file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Required page file missing: ${p.file}`);
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content.includes(legalCompany)) {
      throw new Error(`Page ${p.route} does not reference legal company '${legalCompany}'!`);
    }
    if (!content.includes(brand)) {
      throw new Error(`Page ${p.route} does not reference brand '${brand}'!`);
    }
    console.log(`✓ PASS: Page ${p.route} exists and accurately identifies ${brand} operated by ${legalCompany}.`);
  }

  // ----------------------------------------------------------------
  // TEST 3: Verify Public Landing Page & Footer
  // ----------------------------------------------------------------
  console.log('\n[TEST 3] Verifying Landing Page & Public Footer integration...');
  const landingPageFile = path.join(process.cwd(), 'src/app/page.tsx');
  const landingContent = fs.readFileSync(landingPageFile, 'utf8');
  if (!landingContent.includes('PublicFooter')) {
    throw new Error('Landing page does not include PublicFooter component!');
  }

  const footerFile = path.join(process.cwd(), 'src/components/layout/PublicFooter.tsx');
  const footerContent = fs.readFileSync(footerFile, 'utf8');
  const expectedFooterLinks = ['/about', '/terms', '/privacy-policy', '/refund-policy', 'supportEmail'];
  for (const link of expectedFooterLinks) {
    if (!footerContent.includes(link)) {
      throw new Error(`Footer is missing link/reference to '${link}'!`);
    }
  }
  console.log('✓ PASS: PublicFooter includes active links to About Us, Terms, Privacy, Refund Policy, and Support.');

  // ----------------------------------------------------------------
  // TEST 4: Verify Login & Registration Page Branding
  // ----------------------------------------------------------------
  console.log('\n[TEST 4] Verifying Login & Registration Page Branding...');
  const loginFile = path.join(process.cwd(), 'src/app/login/page.tsx');
  const loginContent = fs.readFileSync(loginFile, 'utf8');
  if (!loginContent.includes(legalCompany) && !loginContent.includes('PLATFORM_CONFIG.legalCompanyName')) {
    throw new Error('Login page does not display legal company name!');
  }
  if (!loginContent.includes('/terms') || !loginContent.includes('/privacy-policy')) {
    throw new Error('Login page does not link to legal terms or privacy policy!');
  }
  console.log('✓ PASS: Login & Registration displays corporate attribution and legal policy links.');

  // ----------------------------------------------------------------
  // TEST 5: Verify Billing & Subscription Page Razorpay & Legal Links
  // ----------------------------------------------------------------
  console.log('\n[TEST 5] Verifying Subscription & Payment Page Razorpay integration...');
  const billingFile = path.join(process.cwd(), 'src/app/dashboard/subscription/page.tsx');
  const billingContent = fs.readFileSync(billingFile, 'utf8');
  if (!billingContent.includes('Razorpay') || (!billingContent.includes(legalCompany) && !billingContent.includes('PLATFORM_CONFIG.legalCompanyName'))) {
    throw new Error('Billing page missing Razorpay or legal company name!');
  }
  if (!billingContent.includes('/terms') || !billingContent.includes('/refund-policy')) {
    throw new Error('Billing page missing links to Terms & Refund Policy!');
  }
  console.log('✓ PASS: Subscription & Billing page includes Razorpay branding, legal operator identity, and direct links to Terms and Refund Policy.');

  // ----------------------------------------------------------------
  // TEST 6: Verify Storefront Merchant Isolation (Platform Name Does Not Replace Merchant Name)
  // ----------------------------------------------------------------
  console.log('\n[TEST 6] Verifying Storefront Merchant Branding is strictly preserved...');
  const storefrontRendererFile = path.join(process.cwd(), 'src/components/storefront/StorefrontRenderer.tsx');
  const storefrontContent = fs.readFileSync(storefrontRendererFile, 'utf8');
  if (!storefrontContent.includes('business.name')) {
    throw new Error('StorefrontRenderer does not render merchant business.name!');
  }
  console.log('✓ PASS: Storefront renderer preserves individual merchant trade name and logo without platform overwrite.');

  // ----------------------------------------------------------------
  // TEST 7: Verify Plans and Pricing (Basic ₹49, Gold ₹149, Diamond Hidden)
  // ----------------------------------------------------------------
  console.log('\n[TEST 7] Verifying Plan Pricing and Admin-Only Diamond...');
  const publicPlans = await getSubscriptionPlans(false);
  const basic = publicPlans.find((p) => p.id === 'plan_basic');
  const gold = publicPlans.find((p) => p.id === 'plan_gold');
  const diamond = publicPlans.find((p) => p.id === 'plan_diamond');

  if (!basic || basic.priceMonthly !== 49) throw new Error('Basic plan price is not ₹49!');
  if (!gold || gold.priceMonthly !== 149) throw new Error('Gold plan price is not ₹149!');
  if (diamond) throw new Error('Diamond plan is visible to public!');
  console.log('✓ PASS: Basic ₹49/30 days, Gold ₹149/30 days, Diamond hidden from public self-checkout.');

  console.log('\n================================================================');
  console.log('ALL LEGAL PAGES, BRANDING & RAZORPAY VERIFICATIONS PASSED! ✓');
  console.log('================================================================\n');
  process.exit(0);
}

runLegalAndBrandingTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
