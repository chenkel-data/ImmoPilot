/*
 * Crawler-Engine
 * Nutzt Playwright, um Listings aus einer konfigurierten Quelle zu extrahieren.
 * Verarbeitet das Selektor-DSL der crawlFields-Konfiguration:
 *
 *   "selector@attribute | transformer1 | transformer2"
 *
 *  - @attribute  → HTML-Attributwert statt Text
 *  - transformer → int | trim | removeNewline
 */

import { chromium } from 'playwright';
import { removeNewline, sleep } from '../utils.js';

// ── DSL-Parser ────────────────────────────────────────────────────────────────

function parseCrawlField(spec) {
  // Trenne Selektor-Teil von Transformern
  const parts = spec.split('|').map((s) => s.trim());
  const selectorPart = parts[0];
  const transformers = parts.slice(1);

  // Prüfe ob ein Attribut extrahiert werden soll: "selector@attr"
  const atMatch = selectorPart.match(/^(.+?)@([\w-]+)$/);
  const selector = atMatch ? atMatch[1].trim() : selectorPart.trim();
  const attribute = atMatch ? atMatch[2] : null;

  return { selector, attribute, transformers };
}

function applyTransformers(value, transformers) {
  let v = value;
  for (const t of transformers) {
    switch (t) {
      case 'int':
        v = parseInt(v, 10);
        break;
      case 'trim':
        v = typeof v === 'string' ? v.trim() : v;
        break;
      case 'removeNewline':
        v = removeNewline(v);
        break;
    }
  }
  return v;
}

// ── Pro-Seite-Extraktion ───────────────────────────────────────────────────────

async function scrapePage(page, sourceConfig) {
  const container = sourceConfig.crawlContainer.trim();
  const elements  = await page.$$(container);
  const listings  = [];

  for (const el of elements) {
    const raw = {};
    for (const [fieldName, spec] of Object.entries(sourceConfig.crawlFields)) {
      try {
        const { selector, attribute, transformers } = parseCrawlField(spec);
        const target = selector ? await el.$(selector) : el;
        if (!target) { raw[fieldName] = null; continue; }

        const value = attribute
          ? await target.getAttribute(attribute)
          : await target.innerText().catch(() => null);

        raw[fieldName] = applyTransformers(value, transformers);
      } catch {
        raw[fieldName] = null;
      }
    }

    if (!raw.id && !raw.title) continue;

    const normalized = sourceConfig.normalize ? sourceConfig.normalize(raw) : raw;
    if (!normalized) continue; // normalize kann null zurückgeben (z.B. kein Link)
    if (sourceConfig.filter && !sourceConfig.filter(normalized)) continue;

    listings.push(normalized);
  }

  return listings;
}

/**
 * Extrahiert Listings von einer Quelle – inklusive Pagination.
 * Scraped so lange weitere Seiten, bis kein "Weiter"-Link mehr da ist
 * oder maxPages erreicht wurde.
 *
 * @param {object} sourceConfig  – das von der Quelle exportierte `config`-Objekt
 * @returns {Promise<object[]>}  – normalisierte, gefilterte Listings aller Seiten
 */
export async function crawl(sourceConfig, opts = {}) {
  // Wie viele Seiten maximal scrapen? (Standard 5 = ca. 125 Listings)
  const maxPages = sourceConfig.maxPages ?? 5;
  const signal   = opts.signal;
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'de-DE',
    extraHTTPHeaders: { 'Accept-Language': 'de-DE,de;q=0.9' },
  });

  const page    = await context.newPage();
  const allListings = [];
  let   cookieDismissed = false;

  // Duplikat-Erkennung: Listings-IDs der vorherigen Seite merken
  let prevPageIds        = new Set();
  let duplicatePageCount = 0;

  try {
    let currentUrl = sourceConfig.url;
    let pageNum    = 1;
    let effectiveMaxPages = maxPages;

    while (currentUrl && pageNum <= effectiveMaxPages) {
      if (signal?.aborted) {
        console.log('[engine] Abbruchsignal empfangen – stoppe nach', pageNum - 1, 'Seite(n)');
        break;
      }
      console.log(`[engine] Seite ${pageNum}/${effectiveMaxPages}: ${currentUrl}`);

      await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForSelector(sourceConfig.crawlContainer.trim().split(' ')[0], {
        timeout: 15_000,
      }).catch(() => {});

      // Kurze Pause – menschliches Verhalten simulieren
      await sleep(800 + Math.random() * 800);

      // Cookie-Banner einmalig wegklicken
      if (!cookieDismissed) {
        try {
          await page.click('#gdpr-banner-accept', { timeout: 3_000 });
          cookieDismissed = true;
        } catch { /* kein Banner */ }
      }

      // Listings dieser Seite extrahieren
      const pageListings = await scrapePage(page, sourceConfig);
      console.log(`[engine]   → ${pageListings.length} Listings auf Seite ${pageNum}`);

      // ── Heuristische Duplikat-Erkennung ────────────────────────────────────
      // Kleinanzeigen mappt jede Seite > letzter Seite intern auf die letzte.
      // Wenn die IDs der aktuellen Seite zu ≥ 80 % mit der Vorseite übereinstimmen,
      // zählt das als Duplikat-Seite. Nach 2 solchen Seiten in Folge Scraping stoppen.
      if (pageListings.length > 0 && prevPageIds.size > 0) {
        const currentIds = new Set(pageListings.map(l => l.id));
        const matches    = [...currentIds].filter(id => prevPageIds.has(id)).length;
        const overlap    = matches / currentIds.size;
        if (overlap >= 0.99) {
          duplicatePageCount++;
          console.log(`[engine] Seite ${pageNum} Duplikat (${(overlap * 100).toFixed(0)}% Überlappung) – Zähler: ${duplicatePageCount}/2`);
          if (duplicatePageCount >= 2) {
            console.log('[engine] Max-Seite heuristisch erkannt – stoppe Scraping (Duplikat-Seite).');
            break;
          }
          // Duplikate nicht nochmals hinzufügen – Seite überspringen
          pageNum++;
          if (typeof sourceConfig.buildPageUrl === 'function') {
            currentUrl = pageNum <= effectiveMaxPages ? sourceConfig.buildPageUrl(sourceConfig.url, pageNum) : null;
          }
          continue;
        } else {
          duplicatePageCount = 0;
        }
        prevPageIds = currentIds;
      } else if (pageListings.length > 0) {
        prevPageIds = new Set(pageListings.map(l => l.id));
      }

      allListings.push(...pageListings);

      // Fortschritt melden (abgeschlossene Seiten)
      try { onProgress && onProgress({ pageNum, maxPages: effectiveMaxPages }); } catch {}

      // Keine Ergebnisse → keine weiteren Seiten vorhanden
      if (pageListings.length === 0) {
        console.log('[engine] Keine Listings – stoppe Pagination.');
        break;
      }

      // Nächste Seite bestimmen:
      // 1. URL-Builder (bevorzugt, zuverlässiger als DOM)
      // 2. Fallback: DOM-Pagination-Link
      if (typeof sourceConfig.buildPageUrl === 'function') {
        const nextNum = pageNum + 1;
        currentUrl = nextNum <= effectiveMaxPages ? sourceConfig.buildPageUrl(sourceConfig.url, nextNum) : null;
      } else {
        currentUrl = await page.evaluate(() => {
          const selectors = [
            'a[data-testid="srp-pagination-forward"]',
            '.pagination-next a',
            'a.pagination-next',
            '#srchrslt-pagination .pagination-next a',
          ];
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el?.href) return el.href;
          }
          return null;
        });
      }

      pageNum++;

      // Pause zwischen Seiten – höfliches Scraping
      if (currentUrl && pageNum <= effectiveMaxPages) {
        if (signal?.aborted) break;
        await sleep(1200 + Math.random() * 800);
      }
    }

    console.log(`[engine] Gesamt: ${allListings.length} Listings über ${pageNum - 1} Seite(n)`);
    return allListings;
  } finally {
    await browser.close();
  }
}

/**
 * Prüft ob ein bekanntes Listing noch aktiv ist.
 *
 * @param {string} link
 * @param {Function} activeTester  – aus der Quell-Konfiguration
 * @returns {Promise<boolean>}
 */
export async function testListingActive(link, activeTester) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  try {
    return await activeTester(page, link);
  } finally {
    await browser.close();
  }
}
