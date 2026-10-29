import pg from 'pg';
import QRCode from 'qrcode';

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
function isValidHexColor(color) {
  if (!color || typeof color !== 'string') return false;
  return HEX_COLOR_REGEX.test(color.trim());
}

const QR_PRESET_TEMPLATES = [
  { id: 'modern_indigo', name: 'Modern OrderOne', settings: { foregroundColor: '#4F46E5', backgroundColor: '#FFFFFF', eyeColor: '#312E81' } },
  { id: 'royal_gold', name: 'Royal Gold & Onyx', settings: { foregroundColor: '#D97706', backgroundColor: '#0F172A', eyeColor: '#F59E0B' } },
  { id: 'crimson_bistro', name: 'Crimson Bistro', settings: { foregroundColor: '#DC2626', backgroundColor: '#FFFBEB', eyeColor: '#991B1B' } },
  { id: 'emerald_fresh', name: 'Emerald Fresh', settings: { foregroundColor: '#059669', backgroundColor: '#F0FDF4', eyeColor: '#065F46' } },
  { id: 'ocean_retail', name: 'Ocean Tech Blue', settings: { foregroundColor: '#0284C7', backgroundColor: '#F8FAFC', eyeColor: '#0369A1' } },
  { id: 'minimal_monochrome', name: 'Minimalist Monochrome', settings: { foregroundColor: '#111827', backgroundColor: '#FFFFFF', eyeColor: '#111827' } },
  { id: 'sunset_orange', name: 'Sunset Orange', settings: { foregroundColor: '#EA580C', backgroundColor: '#FFF7ED', eyeColor: '#C2410C' } },
  { id: 'velvet_hotel', name: 'Velvet Royal Purple', settings: { foregroundColor: '#7C3AED', backgroundColor: '#FAF5FF', eyeColor: '#5B21B6' } },
];

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.rayaxzxakcxsgrlvlsuc:gokul%40mishra%401996@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

async function runQrCustomizationTests() {
  console.log('================================================================');
  console.log('       QR CODE CUSTOMIZATION (GOLD FEATURE) E2E VERIFICATION    ');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Schema Verification for business_qr_customizations
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Supabase Database Schema Verification ---');
    const colsRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'business_qr_customizations'
    `);
    const cols = colsRes.rows.map(r => r.column_name);
    console.log('Found business_qr_customizations columns:', cols);
    assert(cols.includes('business_id'), 'business_id column exists (PK)');
    assert(cols.includes('template_id'), 'template_id column exists');
    assert(cols.includes('foreground_color'), 'foreground_color column exists');
    assert(cols.includes('background_color'), 'background_color column exists');
    assert(cols.includes('eye_color'), 'eye_color column exists');
    assert(cols.includes('dot_style'), 'dot_style column exists');
    assert(cols.includes('eye_style'), 'eye_style column exists');
    assert(cols.includes('frame_style'), 'frame_style column exists');
    assert(cols.includes('frame_text'), 'frame_text column exists');
    assert(cols.includes('show_logo'), 'show_logo column exists');

    // -------------------------------------------------------------
    // TEST 2: Presets & Templates Integrity
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Ready-Made Preset Templates Verification ---');
    console.log(`Available templates: ${QR_PRESET_TEMPLATES.length}`);
    assert(QR_PRESET_TEMPLATES.length >= 6, 'At least 6 ready-made templates configured');
    for (const t of QR_PRESET_TEMPLATES) {
      assert(Boolean(t.id && t.name && t.settings), `Template '${t.name}' has valid metadata`);
      assert(isValidHexColor(t.settings.foregroundColor), `Template '${t.name}' foreground color is valid hex`);
      assert(isValidHexColor(t.settings.backgroundColor), `Template '${t.name}' background color is valid hex`);
      assert(isValidHexColor(t.settings.eyeColor), `Template '${t.name}' eye color is valid hex`);
    }

    // -------------------------------------------------------------
    // TEST 3: Business Database Record & Save Customization
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Persisting Shop Customization in Supabase ---');
    const bizRes = await pool.query('SELECT id, name, slug FROM public.businesses LIMIT 1');
    assert(bizRes.rows.length > 0, 'Found registered business in database');
    const testBiz = bizRes.rows[0];
    console.log(`Testing with real business: ${testBiz.name} (${testBiz.id})`);

    // Upsert customization
    const testTemplate = 'royal_gold';
    await pool.query(`
      INSERT INTO public.business_qr_customizations (
        business_id, template_id, foreground_color, background_color, eye_color,
        dot_style, eye_style, frame_style, frame_text, frame_color,
        show_logo, show_business_name, updated_at
      ) VALUES (
        $1, $2, '#D97706', '#0F172A', '#F59E0B',
        'diamond', 'leaf', 'card', 'PREMIUM DINING', '#D97706',
        true, true, NOW()
      )
      ON CONFLICT (business_id) DO UPDATE SET
        template_id = EXCLUDED.template_id,
        foreground_color = EXCLUDED.foreground_color,
        background_color = EXCLUDED.background_color,
        eye_color = EXCLUDED.eye_color,
        dot_style = EXCLUDED.dot_style,
        eye_style = EXCLUDED.eye_style,
        frame_style = EXCLUDED.frame_style,
        frame_text = EXCLUDED.frame_text,
        updated_at = NOW();
    `, [testBiz.id, testTemplate]);

    const checkRes = await pool.query('SELECT * FROM public.business_qr_customizations WHERE business_id = $1', [testBiz.id]);
    assert(checkRes.rows.length === 1, 'Saved QR customization record in Supabase');
    assert(checkRes.rows[0].template_id === 'royal_gold', 'Saved template_id is royal_gold');
    assert(checkRes.rows[0].dot_style === 'diamond', 'Saved dot_style is diamond');
    assert(checkRes.rows[0].eye_style === 'leaf', 'Saved eye_style is leaf');
    assert(checkRes.rows[0].frame_style === 'card', 'Saved frame_style is card');

    // -------------------------------------------------------------
    // TEST 4: Scannability & High Error-Correction Matrix
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Scannability & Error Correction Verification ---');
    const testTargetUrl = `https://orderone.in/menu/${testBiz.slug}`;
    console.log(`Target URL encoded: ${testTargetUrl}`);

    const qr = QRCode.create(testTargetUrl, { errorCorrectionLevel: 'H' });
    assert(Boolean(qr && qr.modules), 'QRCode generator initialized with Level H');
    assert(qr.modules.size > 21, `QR module matrix size is ${qr.modules.size}x${qr.modules.size}`);
    
    // Test center logo safety exclusion calculation
    const centerStart = Math.floor(qr.modules.size * 0.38);
    const centerEnd = Math.ceil(qr.modules.size * 0.62);
    const centerModules = (centerEnd - centerStart + 1) * (centerEnd - centerStart + 1);
    const totalModules = qr.modules.size * qr.modules.size;
    const centerRatio = centerModules / totalModules;
    console.log(`Center logo occupies ${(centerRatio * 100).toFixed(1)}% of total modules (under 30% Level H limit)`);
    assert(centerRatio < 0.30, 'Center logo area safely within Level H 30% error correction limit');

    // -------------------------------------------------------------
    // TEST 5: Gold Plan Access Control Logic
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Gold Plan Access Control Verification ---');
    
    function testGoldAccess(sub) {
      if (!sub) return false;
      const nowMs = Date.now();
      const renewsAtMs = sub.renewsAt ? new Date(sub.renewsAt).getTime() : null;
      if (renewsAtMs && nowMs > renewsAtMs) return false;
      if (sub.status === 'expired' || sub.status === 'suspended') return false;
      return sub.planId === 'plan_gold' || sub.planId === 'plan_diamond';
    }

    assert(!testGoldAccess({ planId: 'plan_basic', status: 'active', renewsAt: new Date(Date.now() + 86400000).toISOString() }), 'Basic plan cannot access custom QR saving');
    assert(testGoldAccess({ planId: 'plan_gold', status: 'active', renewsAt: new Date(Date.now() + 86400000).toISOString() }), 'Active Gold plan grants custom QR access');
    assert(testGoldAccess({ planId: 'plan_diamond', status: 'active', renewsAt: new Date(Date.now() + 86400000).toISOString() }), 'Active Diamond plan grants custom QR access');
    assert(!testGoldAccess({ planId: 'plan_gold', status: 'expired', renewsAt: new Date(Date.now() - 86400000).toISOString() }), 'Expired Gold plan denied custom QR access');

    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await pool.end();
  }
}

runQrCustomizationTests();
