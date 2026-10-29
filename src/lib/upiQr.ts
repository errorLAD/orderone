// NOTE: qrcode is dynamically imported only in functions that need it,
// so storefront pages that only call buildUpiPaymentUri do NOT bundle QRCode.

export interface UpiPaymentUriOptions {
  upiId: string;
  payeeName: string;
  amount: number | string;
  orderReference?: string;
  transactionNote?: string;
  currency?: string;
}

/**
 * Builds an RFC 3986 compliant UPI payment URI without unescaped concatenation.
 * Format: upi://pay?pa=MERCHANT_UPI_ID&pn=MERCHANT_NAME&am=ORDER_AMOUNT&cu=INR&tn=ORDER_REFERENCE
 */
export function buildUpiPaymentUri(options: UpiPaymentUriOptions): string {
  const pa = (options.upiId || '').trim();
  const pn = (options.payeeName || 'Merchant Store').trim();
  const am = Number(options.amount || 0).toFixed(2);
  const cu = options.currency || 'INR';
  const tn = (options.orderReference || options.transactionNote || 'Order Payment').trim();

  const params = new URLSearchParams();
  params.set('pa', pa);
  params.set('pn', pn);
  params.set('am', am);
  params.set('cu', cu);
  if (tn) {
    params.set('tn', tn);
  }

  return `upi://pay?${params.toString()}`;
}

/**
 * Generates high-resolution PNG data URL for a UPI payment URI.
 * qrcode is dynamically imported to avoid bundling it in storefront pages.
 */
export async function generateUpiPaymentQrDataUrl(
  options: UpiPaymentUriOptions,
  width: number = 360
): Promise<{ uri: string; qrDataUrl: string }> {
  const QRCode = (await import('qrcode')).default;
  const uri = buildUpiPaymentUri(options);
  const qrDataUrl = await QRCode.toDataURL(uri, {
    width,
    margin: 2,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });

  return { uri, qrDataUrl };
}

/**
 * Generates high-resolution PNG data URL for a public Storefront or Menu URL.
 * qrcode is dynamically imported to avoid bundling it in storefront pages.
 */
export async function generateStorefrontQrDataUrl(
  storeUrl: string,
  width: number = 360,
  darkColor: string = '#2563EB'
): Promise<string> {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(storeUrl, {
    width,
    margin: 2,
    color: {
      dark: darkColor,
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });
}
