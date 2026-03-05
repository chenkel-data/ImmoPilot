/*
 * Provider: Kleinanzeigen (kleinanzeigen.de)
 *
 * Unterstützte Listing-Typen:
 *   - miete          → Mietwohnungen
 *   - wohnen-auf-zeit → Wohnen auf Zeit / WG
 *
 * Erweiterbar: Weitere Typen wie 'kauf' können einfach in LISTING_TYPES
 * hinzugefügt werden.
 */

import { buildHash, removeNewline } from '../../utils.js';
import checkIfListingIsActive from '../../services/listings/listingActiveTester.js';

// ── Listing-Typen ──────────────────────────────────────────────────────────────

const LISTING_TYPES = {
  miete: {
    id: 'miete',
    label: 'Mietwohnungen',
    urlPath: 's-wohnung-mieten',
    categoryCode: 'c203l4292',
  },
  'wohnen-auf-zeit': {
    id: 'wohnen-auf-zeit',
    label: 'Wohnen auf Zeit',
    urlPath: 's-auf-zeit-wg',
    categoryCode: 'c199l4858',
  },
};

// ── URL Builder ────────────────────────────────────────────────────────────────

/**
 * Baut die URL für Seite N (Pagination).
 * Muster: …/seite:N/c203l4292r100
 */
function buildPageUrl(baseUrl, pageNum) {
  if (pageNum <= 1) return baseUrl;
  const cleaned = baseUrl.replace(/\/seite:\d+/, '');
  return cleaned.replace(/\/([^/]+)$/, `/seite:${pageNum}/$1`);
}

// ── Normalize ──────────────────────────────────────────────────────────────────

function normalize(o) {
  const link = `https://www.kleinanzeigen.de${o.link}`;
  const id = buildHash(o.id, link);

  let size = o.size || '--- m²';
  let rooms = null;
  if (o.tags) {
    const parts = o.tags.split('·').map((s) => s.trim()).filter(Boolean);
    if (parts[0]) size = parts[0];
    if (parts[1]) rooms = parts[1];
  }

  // Zeitstempel wird vom scraperService gesetzt (einheitlich pro Scrape-Run)
  const image = (o.image || '')
    .replace('/thumbs/images/', '/images/')
    .replace(/s-l\d+\./, 's-l640.');

  return Object.assign(o, { id, size, rooms, link, image });
}

// ── Crawl Config Builder ───────────────────────────────────────────────────────

/**
 * Gibt ein config-Objekt zurück, das direkt an die crawl-Engine übergeben wird.
 */
function getCrawlConfig(url, maxPages = 10) {
  return {
    url,
    maxPages,
    crawlContainer: '#srchrslt-adtable .ad-listitem ',
    waitForSelector: 'body',
    crawlFields: {
      id: '.aditem@data-adid | int',
      price: '.aditem-main--middle--price-shipping--price | removeNewline | trim',
      size: '.aditem-main .text-module-end | removeNewline | trim',
      tags: '.aditem-main--middle--tags | removeNewline | trim',
      title: '.aditem-main .text-module-begin a | removeNewline | trim',
      link: '.aditem-main .text-module-begin a@href | removeNewline | trim',
      description: '.aditem-main .aditem-main--middle--description | removeNewline | trim',
      address: '.aditem-main--top--left | trim | removeNewline',
      listedAt: '.aditem-main--top--right | removeNewline | trim',
      image: 'img@src',
      publisher: '.aditem-main--bottom | removeNewline | trim',
    },
    normalize,
    buildPageUrl,
    filter: null,
    activeTester: checkIfListingIsActive,
  };
}

// ── Provider Export ────────────────────────────────────────────────────────────

export const id = 'kleinanzeigen';
export const name = 'Kleinanzeigen';
export const listingTypes = Object.values(LISTING_TYPES);

/**
 * Infers the listing type from a URL by matching the URL path segment.
 * Returns the listing type id (e.g. 'miete') or null if not detectable.
 */
export function inferListingTypeFromUrl(url) {
  for (const [typeId, typeConfig] of Object.entries(LISTING_TYPES)) {
    if (url.includes(`/${typeConfig.urlPath}/`) || url.includes(`/${typeConfig.urlPath}?`)) {
      return typeId;
    }
  }
  return null;
}

export { getCrawlConfig };
