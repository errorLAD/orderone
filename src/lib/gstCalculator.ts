import { GstInvoiceSettings, TaxBreakdown } from '@/types';

/**
 * Standard Indian GSTIN Regex:
 * 15 characters: 2 state digits + 10 PAN chars + 1 entity num + 'Z' + 1 checksum char
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGstin(gstin?: string): { isValid: boolean; error?: string } {
  if (!gstin || !gstin.trim()) {
    return { isValid: false, error: 'GSTIN cannot be empty' };
  }
  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) {
    return { isValid: false, error: 'GSTIN must be exactly 15 characters' };
  }
  if (!GSTIN_REGEX.test(clean)) {
    return {
      isValid: false,
      error: 'Invalid GSTIN format. Expected format: 22AAAAA0000A1Z5 (2 state digits + 10 PAN characters + 1 entity + Z + 1 check digit)',
    };
  }
  return { isValid: true };
}

export interface TaxCalculationParams {
  subtotal: number;
  deliveryFee?: number;
  gstSettings?: GstInvoiceSettings;
  isGoldSubscriber: boolean;
}

export interface TaxCalculationResult {
  taxableAmount: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  finalTotal: number;
  isTaxInclusive: boolean;
  gstRate: number;
  isGstApplicable: boolean;
  taxBreakdown: TaxBreakdown;
}

/**
 * Calculates order GST tax strictly according to configured settings.
 * If prices already include tax, prevents double taxation.
 */
export function calculateOrderTax(params: TaxCalculationParams): TaxCalculationResult {
  const { subtotal, deliveryFee = 0, gstSettings, isGoldSubscriber } = params;

  // Strict Gold Plan check: GST calculations are only enabled for Gold subscribers with GST configured
  const isGstApplicable = Boolean(
    isGoldSubscriber &&
    gstSettings &&
    gstSettings.isGstRegistered &&
    gstSettings.defaultGstRate > 0
  );

  if (!isGstApplicable || !gstSettings) {
    const finalTotal = Number((subtotal + deliveryFee).toFixed(2));
    const breakdown: TaxBreakdown = {
      isGstApplicable: false,
      gstRate: 0,
      isTaxInclusive: false,
      taxableAmount: subtotal,
      gstAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
    };
    return {
      taxableAmount: subtotal,
      gstAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
      finalTotal,
      isTaxInclusive: false,
      gstRate: 0,
      isGstApplicable: false,
      taxBreakdown: breakdown,
    };
  }

  const rate = gstSettings.defaultGstRate;
  const isTaxInclusive = gstSettings.pricesIncludeGst === true;

  let taxableAmount = 0;
  let gstAmount = 0;

  if (isTaxInclusive) {
    // Prices include tax: Extract tax backwards so total doesn't increase
    // Taxable = Subtotal / (1 + Rate / 100)
    taxableAmount = Number((subtotal / (1 + rate / 100)).toFixed(2));
    gstAmount = Number((subtotal - taxableAmount).toFixed(2));
  } else {
    // Prices exclude tax: Add tax on top
    taxableAmount = Number(subtotal.toFixed(2));
    gstAmount = Number(((subtotal * rate) / 100).toFixed(2));
  }

  // Intra-state split: CGST 50% + SGST 50%
  const cgst = Number((gstAmount / 2).toFixed(2));
  const sgst = Number((gstAmount - cgst).toFixed(2)); // Guard against rounding penny difference
  const igst = 0;

  const finalTotal = isTaxInclusive
    ? Number((subtotal + deliveryFee).toFixed(2))
    : Number((subtotal + gstAmount + deliveryFee).toFixed(2));

  const breakdown: TaxBreakdown = {
    isGstApplicable: true,
    gstRate: rate,
    isTaxInclusive,
    taxableAmount,
    gstAmount,
    cgst,
    sgst,
    igst,
    gstin: gstSettings.gstin,
    legalBusinessName: gstSettings.legalBusinessName,
    registeredAddress: gstSettings.registeredAddress,
  };

  return {
    taxableAmount,
    gstAmount,
    cgst,
    sgst,
    igst,
    totalTax: gstAmount,
    finalTotal,
    isTaxInclusive,
    gstRate: rate,
    isGstApplicable: true,
    taxBreakdown: breakdown,
  };
}

/**
 * Generates formatted invoice number, e.g. "INV-2026-00102"
 */
export function generateInvoiceNumber(prefix: string = 'INV-', sequence: number | string = 1): string {
  const cleanPrefix = prefix.endsWith('-') ? prefix : `${prefix}-`;
  const numStr = String(sequence).replace(/[^0-9]/g, '');
  const padded = numStr ? numStr.padStart(5, '0') : '00001';
  return `${cleanPrefix}${padded}`;
}
