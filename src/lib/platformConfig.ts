/**
 * OrderOne.in — Centralized Platform & Legal Identity Configuration
 * Operated by InfraBlue Materials Technology Private Limited
 */

export interface PlatformLegalConfig {
  brandName: string;
  legalCompanyName: string;
  websiteUrl: string;
  supportEmail: string;
  billingEmail: string;
  grievanceEmail: string;
  registeredOffice: string; // Placeholder if not supplied
  jurisdiction: string;     // Placeholder if not supplied
  lastUpdated: string;
}

export const PLATFORM_CONFIG: PlatformLegalConfig = {
  brandName: 'OrderOne.in',
  legalCompanyName: 'InfraBlue Materials Technology Private Limited',
  websiteUrl: 'https://orderone.in',
  supportEmail: 'support@orderone.in',
  billingEmail: 'billing@orderone.in',
  grievanceEmail: 'support@orderone.in',
  registeredOffice: '[Registered Office Address: InfraBlue Materials Technology Private Limited, India]',
  jurisdiction: '[Jurisdiction: Competent Courts in India]',
  lastUpdated: 'October 2026',
};

export function getPlatformBranding() {
  return {
    brandName: PLATFORM_CONFIG.brandName,
    legalName: PLATFORM_CONFIG.legalCompanyName,
    operatorText: `Operated by ${PLATFORM_CONFIG.legalCompanyName}`,
    fullLegalBranding: `${PLATFORM_CONFIG.brandName}, operated by ${PLATFORM_CONFIG.legalCompanyName}`,
  };
}
