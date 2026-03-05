#!/usr/bin/env node
/*
 * URL-Stats Script
 *
 * Nutzt die bestehende Crawl-Engine, um eine beliebige Such-URL zu scrapen
 * und gibt Statistik aus: raw vs. blacklisted (URL-Blacklist) sowie
 * gefiltert durch Keywords/Distrikte (aus config/default.json).
 *
 * Nutzung:
 *   node scripts/url-stats.js --url "<SUCH-URL>" [--max-pages 5]
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { crawl } from '../src/scrapers/engine.js';
import { getProvider, inferFromUrl } from '../src/providers/registry.js';
import { isUrlBlacklisted } from '../src/db/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'default.json');

function readConfig() {
  try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')); }
  catch { return { blacklistKeywords: [], blacklistedDistricts: [] }; }
}

function parseArgs(argv) {
  const args = { url: null, maxPages: 5 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url' && argv[i+1]) { args.url = argv[++i]; continue; }
    if (a === '--max-pages' && argv[i+1]) { args.maxPages = Number(argv[++i]) || 5; continue; }
  }
  return args;
}

function normalizeText(s) {
  return (s || '').toString().toLowerCase();
}

function matchesAny(text, terms) {
  const t = normalizeText(text);
  for (const term of terms) {
    const q = normalizeText(term);
    if (!q) continue;
    if (t.includes(q)) return true;
  }
  return false;
}

async function main() {
  const { url, maxPages } = parseArgs(process.argv);
  if (!url) {
    console.error('Fehler: Bitte eine URL angeben.\nBeispiel: node scripts/url-stats.js --url "https://www.kleinanzeigen.de/s-wohnung-mieten/berlin/sortierung:neuste/anzeige:angebote/c203l3331r20" --max-pages 3');
    process.exit(1);
  }

  const cfg = readConfig();
  const keywords = Array.isArray(cfg.blacklistKeywords) ? cfg.blacklistKeywords : [];
  const districts = Array.isArray(cfg.blacklistedDistricts) ? cfg.blacklistedDistricts : [];

  // Provider aus URL ableiten – aktuell nur 'kleinanzeigen' registriert
  const inferred = inferFromUrl(url);
  const providerId = inferred?.providerId || 'kleinanzeigen';
  const provider = getProvider(providerId);
  if (!provider) {
    console.error(`Kein Provider für URL erkannt. Fallback fehlgeschlagen.`);
    process.exit(1);
  }

  const crawlConfig = provider.getCrawlConfig(url.replace(/\/seite:\\d+/, ''), maxPages);

  console.log('────────────────────────────────────────────────────────');
  console.log('[url-stats] Starte Crawl:');
  console.log('  URL:       ', url);
  console.log('  Provider:  ', providerId);
  console.log('  Max-Seiten:', maxPages);
  console.log('────────────────────────────────────────────────────────');

  const listings = await crawl(crawlConfig, { onProgress: ({ pageNum, maxPages: mp }) => {
    process.stdout.write(`  Seite ${pageNum}/${mp} erledigt\r`);
  }});
  console.log('\n[url-stats] Listings gesamt (raw):', listings.length);

  // Eindeutige Listings nach ID
  const uniqueById = new Map();
  for (const l of listings) {
    if (!uniqueById.has(l.id)) uniqueById.set(l.id, l);
  }
  const unique = [...uniqueById.values()];
  console.log('[url-stats] Listings unique (by id):', unique.length);

  // URL-Blacklist prüfen (DB)
  const urlBlacklisted = [];
  for (const l of unique) {
    if (l.link && isUrlBlacklisted(l.link)) urlBlacklisted.push(l);
  }

  // Keyword-/District-Filter (wie getListings)
  const keywordFiltered = [];
  const districtFiltered = [];
  for (const l of unique) {
    const title = l.title || '';
    const description = l.description || '';
    const address = l.address || '';

    if (matchesAny(title, keywords) || matchesAny(description, keywords)) {
      keywordFiltered.push(l);
      continue;
    }
    if (matchesAny(address, districts)) {
      districtFiltered.push(l);
      continue;
    }
  }

  // Kombiniert gefiltert (Union von URL-Blacklist, Keywords, Districts)
  const filteredSet = new Set();
  for (const l of urlBlacklisted) filteredSet.add(l.id);
  for (const l of keywordFiltered) filteredSet.add(l.id);
  for (const l of districtFiltered) filteredSet.add(l.id);
  const combinedFiltered = unique.filter(l => filteredSet.has(l.id));

  const pct = (a, b) => b ? `${((a / b) * 100).toFixed(1)}%` : '0.0%';

  console.log('');
  console.log('Ergebnis:');
  console.log('  Raw gesamt:                  ', listings.length);
  console.log('  Unique by id:                ', unique.length);
  console.log('  URL-Blacklisted:             ', urlBlacklisted.length, `(${pct(urlBlacklisted.length, unique.length)})`);
  console.log('  Keyword-gefiltert:           ', keywordFiltered.length, `(${pct(keywordFiltered.length, unique.length)})`);
  console.log('  District-gefiltert:          ', districtFiltered.length, `(${pct(districtFiltered.length, unique.length)})`);
  console.log('  Kombiniert gefiltert (Union):', combinedFiltered.length, `(${pct(combinedFiltered.length, unique.length)})`);
  console.log('  Effektiv sichtbar:           ', unique.length - combinedFiltered.length);

  // Beispiele ausgeben
  const sample = (arr) => arr.slice(0, 5).map(l => `- ${l.title}  ${l.link}`).join('\n');
  if (urlBlacklisted.length) {
    console.log('\nBeispiele – URL-Blacklist:');
    console.log(sample(urlBlacklisted));
  }
  if (keywordFiltered.length) {
    console.log('\nBeispiele – Keyword-gefiltert:');
    console.log(sample(keywordFiltered));
  }
  if (districtFiltered.length) {
    console.log('\nBeispiele – District-gefiltert:');
    console.log(sample(districtFiltered));
  }
}

main().catch((err) => {
  console.error('\n[url-stats] Fehler:', err);
  process.exit(1);
});
