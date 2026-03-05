export const ITEMS_PER_PAGE = 24;
export const SCRAPE_STATUS_POLLING_INTERVAL = 3_000;
export const TOAST_DURATION = 3_400;

export const TABS = {
  ALL: 'all',
  UNSEEN: 'unseen',
  FAVORITES: 'favorites',
  BLACKLISTED: 'blacklisted',
};

export const LISTING_TYPE_LABELS = {
  'miete': 'Mietwohnungen',
  'wohnen-auf-zeit': 'Wohnen auf Zeit',
};

export const LISTING_TYPE_COLORS = {
  'miete':           { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  'wohnen-auf-zeit': { bg: '#ede9fe', text: '#5b21b6', dot: '#8b5cf6' },
};

/**
 * URL path segment → listing type id mapping.
 * Used to auto-detect the type from a user-pasted URL.
 * Add new entries here when new types are added to providers.
 */
export const URL_LISTING_TYPE_MAP = [
  { pattern: 's-wohnung-mieten',  type: 'miete',           provider: 'kleinanzeigen' },
  { pattern: 's-auf-zeit-wg',     type: 'wohnen-auf-zeit', provider: 'kleinanzeigen' },
];

/**
 * Infers listing type + provider from a URL client-side.
 * Returns { type, provider } or null.
 */
export function inferListingTypeFromUrl(url) {
  for (const entry of URL_LISTING_TYPE_MAP) {
    if (url.includes(`/${entry.pattern}/`) || url.includes(`/${entry.pattern}?`)) {
      return { type: entry.type, provider: entry.provider };
    }
  }
  return null;
}
