import { StorefrontColors, StorefrontTemplateId } from '@/types';

export interface ColorPreset {
  id: string;
  name: string;
  description: string;
  colors: StorefrontColors;
}

export interface TemplateDefinition {
  id: StorefrontTemplateId;
  name: string;
  tagline: string;
  badge: string;
  features: string[];
}

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    id: 'classic',
    name: 'Classic Storefront',
    tagline: 'Clean, fast & intuitive e-commerce layout',
    badge: 'Popular',
    features: [
      'Minimalist top header with business logo',
      'Horizontal category pills for rapid switching',
      'Compact product cards with clear pricing',
      'Direct instant Add-to-Cart controls',
      'Optimized for rapid mobile ordering',
    ],
  },
  {
    id: 'modern',
    name: 'Modern Visual Showcase',
    tagline: 'Hero banner, rich visual cards & prominent imagery',
    badge: 'Visual',
    features: [
      'Prominent cover image banner with elevated logo',
      'Larger visual product cards with image hover zoom',
      'Category showcase cards with item counts',
      'Modern floating cart trigger with blur effect',
      'Designed for lifestyle, hardware & dining brands',
    ],
  },
];

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'orderone-indigo',
    name: 'OrderOne Indigo',
    description: 'Clean, tech-forward, professional SaaS look',
    colors: {
      primary: '#4F46E5',    // Indigo 600
      secondary: '#1E1B4B',  // Indigo 950
      accent: '#F59E0B',     // Amber 500
      background: '#F8FAFC', // Slate 50
      text: '#0F172A',       // Slate 900
      button: '#4F46E5',     // Indigo 600
    },
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    description: 'Energetic, warm, inviting retail & food tone',
    colors: {
      primary: '#EA580C',    // Orange 600
      secondary: '#7C2D12',  // Orange 900
      accent: '#F59E0B',     // Amber 500
      background: '#FFFDFB', // Warm White
      text: '#1C1917',       // Stone 900
      button: '#EA580C',     // Orange 600
    },
  },
  {
    id: 'emerald-market',
    name: 'Emerald Market',
    description: 'Fresh, organic, grocery & natural materials',
    colors: {
      primary: '#059669',    // Emerald 600
      secondary: '#064E3B',  // Emerald 900
      accent: '#10B981',     // Emerald 500
      background: '#F0FDF4', // Emerald 50
      text: '#064E3B',       // Emerald 950
      button: '#059669',     // Emerald 600
    },
  },
  {
    id: 'royal-sapphire',
    name: 'Royal Sapphire',
    description: 'Trusted, corporate, hardware & electricals',
    colors: {
      primary: '#2563EB',    // Blue 600
      secondary: '#1E3A8A',  // Blue 900
      accent: '#38BDF8',     // Sky 400
      background: '#F8FAFC', // Slate 50
      text: '#0F172A',       // Slate 900
      button: '#2563EB',     // Blue 600
    },
  },
  {
    id: 'crimson-dining',
    name: 'Crimson Dining',
    description: 'Rich, appetizing, cafe & dining atmosphere',
    colors: {
      primary: '#DC2626',    // Red 600
      secondary: '#7F1D1D',  // Red 900
      accent: '#F97316',     // Orange 500
      background: '#FEF2F2', // Red 50
      text: '#450A0A',       // Red 950
      button: '#DC2626',     // Red 600
    },
  },
  {
    id: 'minimal-slate',
    name: 'Minimal Slate',
    description: 'Monochrome, sleek, high-end studio feel',
    colors: {
      primary: '#0F172A',    // Slate 900
      secondary: '#334155',  // Slate 700
      accent: '#64748B',     // Slate 500
      background: '#FFFFFF', // Pure White
      text: '#0F172A',       // Slate 900
      button: '#0F172A',     // Slate 900
    },
  },
];

export const DEFAULT_STOREFRONT_COLORS: StorefrontColors = {
  primary: '#EA580C',    // Orange 600
  secondary: '#9A3412',  // Orange 800
  accent: '#F97316',     // Orange 500
  background: '#F8FAFC', // Slate 50
  text: '#0F172A',       // Slate 900
  button: '#EA580C',     // Orange 600
};

export const DEFAULT_DESIGN_SETTINGS = {
  templateId: 'classic' as const,
  colors: DEFAULT_STOREFRONT_COLORS,
  coverImageUrl: undefined,
  isPublished: false,
};

/**
 * Calculates readable text color (white or black) based on background hex luminance.
 */
export function getContrastTextColor(hexColor: string): '#FFFFFF' | '#0F172A' {
  if (!hexColor) return '#FFFFFF';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((char) => char + char).join('');
  }
  if (hex.length !== 6) return '#FFFFFF';

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Relative luminance formula per WCAG standards
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#0F172A' : '#FFFFFF';
}
