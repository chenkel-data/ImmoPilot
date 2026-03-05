/*
 * Provider Registry
 *
 * Zentraler Ort für alle Scraping-Provider.
 * Neue Provider werden hier registriert und können dann
 * über getProvider(id) abgerufen werden.
 *
 * Jeder Provider muss folgendes exportieren:
 *   - id: string          – eindeutige ID (z.B. 'kleinanzeigen')
 *   - name: string        – Anzeigename (z.B. 'Kleinanzeigen')
 *   - listingTypes: []    – unterstützte Listing-Typen mit { id, label }
 *
 * Für das Scraping gibt es zwei Optionen (eine davon muss existieren):
 *
 *   Option A – Playwright-Engine (Standard):
 *   - getCrawlConfig(url, maxPages) → crawl config object
 *     (CSS-Selektoren, DSL-Felder → wird von scrapers/engine.js verarbeitet)
 *
 *   Option B – Eigene Scraping-Logik (z.B. fetch + cheerio, API-Calls):
 *   - scrape(url, maxPages, opts) → Promise<listing[]>
 *     opts enthält: { signal?, onProgress? }
 *     Gibt ein Array normalisierter Listings zurück.
 *
 * Optional:
 *   - inferListingTypeFromUrl(url) → string | null
 */

import * as kleinanzeigen from './kleinanzeigen/index.js';

const providers = new Map();

function register(provider) {
  providers.set(provider.id, provider);
}

// ── Registrierte Provider ──────────────────────────────────────────────────────

register(kleinanzeigen);

// Weitere Provider hier registrieren, z.B.:
// import * as immoscout from './immoscout24/index.js';
// register(immoscout);

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Gibt einen Provider anhand seiner ID zurück.
 */
export function getProvider(id) {
  return providers.get(id) || null;
}

/**
 * Gibt alle registrierten Provider als Array zurück.
 * Für die Frontend-Dropdown-Auswahl.
 */
export function getAllProviders() {
  return [...providers.values()].map((p) => ({
    id: p.id,
    name: p.name,
    listingTypes: p.listingTypes,
  }));
}

/**
 * Versucht den Listing-Typ aus einer URL zu ermitteln.
 * Geht alle Provider durch und fragt jeden nach dem Typ.
 * Gibt { providerId, listingTypeId } oder null zurück.
 */
export function inferFromUrl(url) {
  for (const [pid, provider] of providers.entries()) {
    if (typeof provider.inferListingTypeFromUrl === 'function') {
      const typeId = provider.inferListingTypeFromUrl(url);
      if (typeId) return { providerId: pid, listingTypeId: typeId };
    }
  }
  return null;
}
