import { QrCustomizationSettings, QrDotStyle, QrEyeStyle, QrFrameStyle } from '@/types';

export interface QrPresetTemplate {
  id: string;
  name: string;
  tagline: string;
  category: string;
  settings: QrCustomizationSettings;
}

export const DEFAULT_QR_CUSTOMIZATION: QrCustomizationSettings = {
  templateId: 'modern_indigo',
  foregroundColor: '#4F46E5',
  backgroundColor: '#FFFFFF',
  eyeColor: '#312E81',
  dotStyle: 'rounded',
  eyeStyle: 'rounded',
  frameStyle: 'bottom_banner',
  frameText: 'SCAN TO ORDER',
  frameColor: '#4F46E5',
  showLogo: true,
  centerBadgeType: 'logo',
  showBusinessName: true,
  showHeaderTitle: true,
  showHeaderLogo: false,
  headerSubtitle: 'DIGITAL STOREFRONT & MENU',
};

export const QR_PRESET_TEMPLATES: QrPresetTemplate[] = [
  {
    id: 'modern_indigo',
    name: 'Modern OrderOne',
    tagline: 'Signature brand palette with smooth rounded modules',
    category: 'Universal',
    settings: {
      templateId: 'modern_indigo',
      foregroundColor: '#4F46E5',
      backgroundColor: '#FFFFFF',
      eyeColor: '#312E81',
      dotStyle: 'rounded',
      eyeStyle: 'rounded',
      frameStyle: 'bottom_banner',
      frameText: 'SCAN TO ORDER',
      frameColor: '#4F46E5',
      showLogo: true,
      showBusinessName: true,
      headerSubtitle: 'DIGITAL STOREFRONT & MENU',
    },
  },
  {
    id: 'royal_gold',
    name: 'Royal Gold & Onyx',
    tagline: 'Luxury fine dining aesthetic with diamond patterns',
    category: 'Restaurant & Lounge',
    settings: {
      templateId: 'royal_gold',
      foregroundColor: '#D97706',
      backgroundColor: '#0F172A',
      eyeColor: '#F59E0B',
      dotStyle: 'diamond',
      eyeStyle: 'leaf',
      frameStyle: 'card',
      frameText: 'PREMIUM DINING',
      frameColor: '#D97706',
      showLogo: true,
      showBusinessName: true,
      headerSubtitle: 'FINE DINING & DIGITAL MENU',
    },
  },
  {
    id: 'crimson_bistro',
    name: 'Crimson Bistro',
    tagline: 'Warm cafe & restaurant theme with soft ivory canvas',
    category: 'Cafe & Fast Food',
    settings: {
      templateId: 'crimson_bistro',
      foregroundColor: '#DC2626',
      backgroundColor: '#FFFBEB',
      eyeColor: '#991B1B',
      dotStyle: 'rounded',
      eyeStyle: 'circle',
      frameStyle: 'badge',
      frameText: 'VIEW MENU & ORDER',
      frameColor: '#DC2626',
      showLogo: true,
      showBusinessName: true,
      headerSubtitle: 'CAFÉ & FOOD MENU',
    },
  },
  {
    id: 'emerald_fresh',
    name: 'Emerald Fresh',
    tagline: 'Eco organic aesthetic for groceries and healthy dining',
    category: 'Grocery & Organic',
    settings: {
      templateId: 'emerald_fresh',
      foregroundColor: '#059669',
      backgroundColor: '#F0FDF4',
      eyeColor: '#065F46',
      dotStyle: 'dots',
      eyeStyle: 'circle',
      frameStyle: 'top_banner',
      frameText: 'ORDER FRESH FOOD',
      frameColor: '#059669',
      showLogo: true,
      showBusinessName: true,
      headerSubtitle: 'FRESH DIGITAL STORE',
    },
  },
  {
    id: 'ocean_retail',
    name: 'Ocean Tech Blue',
    tagline: 'Sharp high-contrast layout for retail & electronics',
    category: 'Retail & Hardware',
    settings: {
      templateId: 'ocean_retail',
      foregroundColor: '#0284C7',
      backgroundColor: '#F8FAFC',
      eyeColor: '#0369A1',
      dotStyle: 'square',
      eyeStyle: 'square',
      frameStyle: 'card',
      frameText: 'BROWSE CATALOG',
      frameColor: '#0284C7',
      showLogo: true,
      showBusinessName: true,
      headerSubtitle: 'OFFICIAL DIGITAL STOREFRONT',
    },
  },
  {
    id: 'minimal_monochrome',
    name: 'Minimalist Monochrome',
    tagline: 'Ultra-clean pitch-black ink on bright white',
    category: 'Minimalist',
    settings: {
      templateId: 'minimal_monochrome',
      foregroundColor: '#111827',
      backgroundColor: '#FFFFFF',
      eyeColor: '#111827',
      dotStyle: 'square',
      eyeStyle: 'rounded',
      frameStyle: 'simple_border',
      frameText: 'SCAN ME',
      frameColor: '#111827',
      showLogo: true,
      showBusinessName: true,
      headerSubtitle: 'CONTACTLESS STOREFRONT',
    },
  },
  {
    id: 'sunset_orange',
    name: 'Sunset Orange',
    tagline: 'Vibrant sweet theme for bakeries, juice & sweets',
    category: 'Bakery & Sweets',
    settings: {
      templateId: 'sunset_orange',
      foregroundColor: '#EA580C',
      backgroundColor: '#FFF7ED',
      eyeColor: '#C2410C',
      dotStyle: 'dots',
      eyeStyle: 'leaf',
      frameStyle: 'bottom_banner',
      frameText: 'ORDER ONLINE',
      frameColor: '#EA580C',
      showLogo: true,
      showBusinessName: true,
      headerSubtitle: 'BAKERY & CONFECTIONERY',
    },
  },
  {
    id: 'velvet_hotel',
    name: 'Velvet Royal Purple',
    tagline: 'In-room dining & hotel hospitality prestige design',
    category: 'Hotel & Hospitality',
    settings: {
      templateId: 'velvet_hotel',
      foregroundColor: '#7C3AED',
      backgroundColor: '#FAF5FF',
      eyeColor: '#5B21B6',
      dotStyle: 'rounded',
      eyeStyle: 'circle',
      frameStyle: 'bottom_banner',
      frameText: 'IN-ROOM DINING',
      frameColor: '#7C3AED',
      showLogo: true,
      showBusinessName: true,
      headerSubtitle: 'HOTEL & IN-ROOM DINING',
    },
  },
];

export const COLOR_SWATCHES = [
  { name: 'OrderOne Indigo', hex: '#4F46E5' },
  { name: 'Royal Gold', hex: '#D97706' },
  { name: 'Crimson Red', hex: '#DC2626' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Sky Blue', hex: '#0284C7' },
  { name: 'Deep Purple', hex: '#7C3AED' },
  { name: 'Sunset Orange', hex: '#EA580C' },
  { name: 'Onyx Black', hex: '#111827' },
  { name: 'Slate Gray', hex: '#475569' },
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Warm Cream', hex: '#FFFBEB' },
  { name: 'Midnight Navy', hex: '#0F172A' },
];

export const DOT_STYLES: { id: QrDotStyle; label: string; description: string }[] = [
  { id: 'rounded', label: 'Rounded Dots', description: 'Smooth modern curved squares' },
  { id: 'dots', label: 'Circular Dots', description: 'Friendly circular bubble dots' },
  { id: 'square', label: 'Crisp Squares', description: 'Classic high-density technical blocks' },
  { id: 'diamond', label: 'Diamond Tiles', description: 'Refined diagonal diamond matrix' },
  { id: 'classy', label: 'Classy Blocks', description: 'Connected elegant flowing blocks' },
];

export const EYE_STYLES: { id: QrEyeStyle; label: string; description: string }[] = [
  { id: 'rounded', label: 'Rounded', description: 'Subtly rounded outer square & inner pill' },
  { id: 'circle', label: 'Circular Eye', description: 'Smooth round outer ring & circle center' },
  { id: 'square', label: 'Classic Square', description: 'Sharp traditional position detection patterns' },
  { id: 'leaf', label: 'Leaf / Curved', description: 'Opposite corner curves for designer look' },
];

export const FRAME_STYLES: { id: QrFrameStyle; label: string; description: string }[] = [
  { id: 'bottom_banner', label: 'Bottom Banner', description: 'Bold call-to-action pill below QR' },
  { id: 'top_banner', label: 'Top Banner', description: 'Prominent header banner with prompt' },
  { id: 'card', label: 'Display Card', description: 'Complete standee card with shop header & subtext' },
  { id: 'badge', label: 'Floating Badge', description: 'Compact floating pill with camera prompt' },
  { id: 'simple_border', label: 'Minimal Border', description: 'Clean elegant outline with padding' },
  { id: 'none', label: 'Borderless Raw', description: 'Pure customized QR matrix only' },
];

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHexColor(color: string | undefined): boolean {
  if (!color || typeof color !== 'string') return false;
  return HEX_COLOR_REGEX.test(color.trim());
}
