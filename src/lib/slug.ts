import crypto from 'crypto';
import { pgQuery, mapRowToBusiness } from './postgres';
import { Business } from '@/types';

/**
 * Standard slugification helper: lowercases, removes invalid chars, trims hyphens.
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word [a-z0-9_], non-whitespace, non-hyphen
    .replace(/[\s_-]+/g, '-') // swap any spaces or underscores to hyphens
    .replace(/^-+|-+$/g, ''); // remove leading/trailing hyphens
}

const INDIAN_STATES = new Set([
  'andhra-pradesh', 'arunachal-pradesh', 'assam', 'bihar', 'chhattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal-pradesh', 'jharkhand', 'karnataka',
  'kerala', 'madhya-pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
  'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil-nadu',
  'telangana', 'tripura', 'uttar-pradesh', 'uttarakhand', 'west-bengal',
  'delhi', 'jammu-kashmir', 'ladakh', 'chandigarh', 'puducherry'
]);

const NON_LOCATION_WORDS = new Set([
  'india', 'buiness', 'business', 'shop', 'store', 'near', 'opp', 'opposite',
  'road', 'street', 'lane', 'plot', 'ward', 'sector', 'block', 'floor',
  'building', 'house', 'pincode', 'pin', 'main', 'market', 'chowk', 'bazaar',
  'complex', 'mall', 'tower', 'nagar', 'colony', 'area', 'city', 'place',
  'point', 'cross', 'behind', 'beside', 'front'
]);

/**
 * Extracts a clean, concise location slug (e.g., 'patna', 'delhi', 'darbhanga') from a raw address string.
 */
export function extractLocationSlug(address?: string): string | null {
  if (!address || typeof address !== 'string') return null;

  const parts = address
    .split(/[,/\n\r]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  let cityCandidate: string | null = null;
  let stateCandidate: string | null = null;

  for (const rawPart of parts) {
    const cleaned = rawPart.replace(/[0-9]/g, '').trim();
    let slug = slugify(cleaned);
    if (!slug || slug.length < 3) continue;

    if (slug === 'new-delhi' || slug.includes('delhi')) {
      return 'delhi';
    }

    if (INDIAN_STATES.has(slug)) {
      if (!stateCandidate) stateCandidate = slug;
      continue;
    }

    const words = slug.split('-');
    const meaningfulTokens = words.filter((w) => w.length >= 3 && !NON_LOCATION_WORDS.has(w));
    if (meaningfulTokens.length > 0) {
      const candidate = meaningfulTokens.join('-');
      if (INDIAN_STATES.has(candidate)) {
        if (!stateCandidate) stateCandidate = candidate;
      } else if (!cityCandidate) {
        cityCandidate = candidate;
      }
    }
  }

  return cityCandidate || stateCandidate || null;
}

/**
 * Generates a guaranteed-unique, stable storefront identifier for any business.
 * Supports duplicate business names across any location (city, state, country)
 * by appending a clean location token (when available) and a 4-character unique suffix.
 *
 * Example outputs:
 * - 'royal-kitchen-patna-a81f'
 * - 'royal-kitchen-delhi-b72e'
 * - 'royal-kitchen-patna-c93d' (second Royal Kitchen in Patna)
 * - 'royal-kitchen-458a' (when no location is specified)
 */
export async function generateUniqueBusinessSlug(
  businessName: string,
  address?: string,
  businessId?: string,
  excludeBusinessId?: string
): Promise<string> {
  const nameSlug = slugify(businessName) || 'store';
  const locationSlug = extractLocationSlug(address);

  // Generate deterministic default suffix from businessId if available, else crypto random
  let defaultSuffix: string;
  if (businessId && businessId.includes('_')) {
    const parts = businessId.split('_');
    const tail = parts[parts.length - 1];
    defaultSuffix = tail.substring(tail.length - 4).toLowerCase();
  } else {
    defaultSuffix = crypto.randomBytes(2).toString('hex');
  }

  // Ensure suffix has length 4 and valid hex/alphanumeric chars
  if (defaultSuffix.length < 4 || !/^[a-z0-9]{4}$/.test(defaultSuffix)) {
    defaultSuffix = crypto.randomBytes(2).toString('hex');
  }

  // First candidate: [name]-[location]-[suffix] OR [name]-[suffix]
  let candidate = locationSlug
    ? `${nameSlug}-${locationSlug}-${defaultSuffix}`
    : `${nameSlug}-${defaultSuffix}`;

  // Check uniqueness in Supabase PostgreSQL
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const res = await pgQuery(
        `SELECT id FROM public.businesses 
         WHERE LOWER(slug) = LOWER($1) 
           ${excludeBusinessId ? 'AND id != $2' : ''} 
         LIMIT 1`,
        excludeBusinessId ? [candidate, excludeBusinessId] : [candidate]
      );

      if (res.rows.length === 0) {
        return candidate;
      }

      // If collision occurred, generate a fresh random 4-character hex suffix
      const freshSuffix = crypto.randomBytes(2).toString('hex');
      candidate = locationSlug
        ? `${nameSlug}-${locationSlug}-${freshSuffix}`
        : `${nameSlug}-${freshSuffix}`;
    } catch (err) {
      console.error('Error verifying slug uniqueness:', err);
      // In case of error, append timestamp-based unique suffix
      return `${candidate}-${Date.now().toString(36).substring(3, 7)}`;
    }
  }

  return `${candidate}-${crypto.randomBytes(2).toString('hex')}`;
}

/**
 * Resolves a business authoritatively from Supabase using either:
 * 1. Exact slug match (case-insensitive)
 * 2. Exact business ID match
 * 3. Historical slug match in settings.previousSlugs (protecting existing URLs)
 * 4. Custom alias match in settings.aliases
 */
export async function resolveBusinessByIdOrSlug(identifier: string): Promise<Business | null> {
  if (!identifier || typeof identifier !== 'string') return null;
  const cleanId = identifier.trim();

  try {
    const res = await pgQuery(
      `SELECT b.*, u.name as owner_name 
       FROM public.businesses b 
       LEFT JOIN public.users u ON b.owner_id = u.id 
       WHERE LOWER(b.slug) = LOWER($1) 
          OR b.id = $1 
          OR (b.settings->'previousSlugs' IS NOT NULL AND b.settings->'previousSlugs' ? $1)
          OR (b.settings->'aliases' IS NOT NULL AND b.settings->'aliases' ? $1)
       ORDER BY (LOWER(b.slug) = LOWER($1)) DESC, (b.id = $1) DESC, b.created_at ASC
       LIMIT 1`,
      [cleanId]
    );

    if (res.rows.length > 0) {
      return mapRowToBusiness(res.rows[0]);
    }
  } catch (err) {
    console.error('resolveBusinessByIdOrSlug error:', err);
  }

  return null;
}
