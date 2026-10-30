import { ImageResponse } from 'next/og';

export const alt = 'OrderOne.in billing, inventory and online ordering software';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px', background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 58%, #ecfeff 100%)', color: '#0f172a', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 58, height: 58, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#4f46e5', color: 'white', fontSize: 34, fontWeight: 800 }}>O</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 31, fontWeight: 800 }}>OrderOne.in</span><span style={{ fontSize: 17, color: '#64748b' }}>Business tools for India</span></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1000 }}>
          <div style={{ fontSize: 62, lineHeight: 1.08, fontWeight: 800, letterSpacing: -2 }}>Billing, inventory &amp; ordering</div>
          <div style={{ fontSize: 27, color: '#475569' }}>POS | Online storefronts | Restaurant QR menus</div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 20, color: '#4338ca' }}>
          <span>Retail</span><span>/</span><span>Grocery</span><span>/</span><span>Hardware</span><span>/</span><span>Restaurants</span>
        </div>
      </div>
    ),
    size,
  );
}
