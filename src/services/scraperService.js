/*
 * Orchestriert das Scraping via Provider-Registry und Search-Configs.
 */

import { crawl } from '../scrapers/engine.js';
import { getProvider } from '../providers/registry.js';
import {
  upsertListing,
  getExistingIds,
  startScrapeRun,
  finishScrapeRun,
  getEnabledSearchConfigs,
} from '../db/database.js';
import { now } from '../utils.js';

/**
 * Scrape a single search config.
 * @param {object} searchConfig – row from search_configs table
 * @param {object} hooks – { signal?, onProgress? }
 */
export async function runScrapeForConfig(searchConfig, hooks = {}) {
  const provider = getProvider(searchConfig.provider);
  if (!provider) throw new Error(`Provider nicht gefunden: ${searchConfig.provider}`);

  // URL aus extra_params laden
  let extraParams = {};
  try { extraParams = JSON.parse(searchConfig.extra_params || '{}'); } catch {}

  const directUrl = extraParams.directUrl;
  if (!directUrl) throw new Error(`Keine Scrape-URL konfiguriert für Agent "${searchConfig.name || searchConfig.city}"`);

  // Hardcoded Page-Nummer entfernen, Engine startet immer bei Seite 1
  const url = directUrl.replace(/\/seite:\d+/, '');

  // ── Engine-Auswahl ──────────────────────────────────────────────────────────
  // Provider können entweder:
  //   a) getCrawlConfig() exportieren → Playwright-Engine (Standard)
  //   b) scrape(url, maxPages, opts) exportieren → eigene Scraping-Logik
  //      (z.B. fetch + cheerio, API-Calls, etc.)
  const maxPages = searchConfig.max_pages || 10;
  const usesCustomScraper = typeof provider.scrape === 'function';
  const crawlConfig = usesCustomScraper ? null : provider.getCrawlConfig(url, maxPages);

  const runId = startScrapeRun(searchConfig.provider, now(), {
    provider: searchConfig.provider,
    listingType: searchConfig.listing_type,
    searchConfigId: searchConfig.id,
  });

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`[scraper] Starte Scrape-Vorgang:`);
  console.log(`  Provider:    ${provider.name}`);
  console.log(`  Typ:         ${searchConfig.listing_type}`);
  console.log(`  Agent:       ${searchConfig.name || searchConfig.city}`);
  console.log(`  Max-Seiten:  ${searchConfig.max_pages || 10}`);
  console.log(`  🔗 URL:      ${url}`);
  console.log(`${'═'.repeat(70)}\n`);
  const startedAt = Date.now();

  try {
    // Verwende die passende Engine basierend auf dem Provider
    const listings = usesCustomScraper
      ? await provider.scrape(url, maxPages, { signal: hooks.signal, onProgress: hooks.onProgress })
      : await crawl(crawlConfig, { signal: hooks.signal, onProgress: hooks.onProgress });
    console.log(`[scraper] ${listings.length} Listings gefunden.`);

    const existingIds = new Set(getExistingIds(searchConfig.provider, searchConfig.listing_type, searchConfig.id));
    const scrapedIds = new Set();
    let newCount = 0;
    const scrapeTime = now(); // einheitlicher Zeitstempel für alle Listings dieses Runs

    for (const listing of listings) {
      const isNew = !existingIds.has(listing.id);
      if (isNew) newCount++;

      upsertListing({
        id: listing.id,
        source: searchConfig.provider,
        provider: searchConfig.provider,
        listing_type: searchConfig.listing_type,
        search_config_id: searchConfig.id,
        title: listing.title ?? '',
        price: listing.price ?? null,
        size: listing.size ?? null,
        rooms: listing.rooms ?? null,
        address: listing.address ?? null,
        description: listing.description ?? null,
        publisher: listing.publisher ?? null,
        link: listing.link,
        image: listing.image ?? null,
        listed_at: scrapeTime,
        first_seen: scrapeTime,
        last_seen: scrapeTime,
      });

      scrapedIds.add(listing.id);
    }

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    const uniqueCount = scrapedIds.size;
    console.log(`[scraper] Fertig: ${listings.length} roh (${uniqueCount} unique), ${newCount} neu – ${elapsed}s`);

    finishScrapeRun(runId, { endedAt: now(), status: 'success', newCount, totalCount: uniqueCount });
    return { newCount, totalCount: uniqueCount };
  } catch (err) {
    console.error(`[scraper] Fehler:`, err);
    finishScrapeRun(runId, { endedAt: now(), status: 'error', newCount: 0, totalCount: 0, error: err.message });
    throw err;
  }
}

/**
 * Run all enabled search configs sequentially.
 * @param {object} hooks – { signal?, onProgress? }
 */
export async function runAllScrapes(hooks = {}) {
  const configs = getEnabledSearchConfigs();
  if (configs.length === 0) {
    console.log('[scraper] Keine aktiven Suchkonfigurationen.');
    return {};
  }

  const results = {};
  for (let i = 0; i < configs.length; i++) {
    const cfg = configs[i];
    const key = `${cfg.provider}:${cfg.listing_type}:${cfg.city}`;
    try {
      results[key] = await runScrapeForConfig(cfg, {
        signal: hooks.signal,
        onProgress: (p) => {
          hooks.onProgress?.({ ...p, configIdx: i + 1, totalConfigs: configs.length, configName: cfg.name || cfg.city });
        },
      });
    } catch (err) {
      results[key] = { error: err.message };
    }
  }
  return results;
}
