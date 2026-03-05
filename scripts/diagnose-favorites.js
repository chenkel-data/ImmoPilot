/*
 * Diagnosiert Favoriten-Status nach Scraping:
 * - Welche Agenten hat die DB?
 * - Welche Favoriten gibt es, zugeordnet zu welchem Agenten?
 * - Gibt es Orphan-Listings (search_config_id = NULL)?
 * - Gibt es doppelte Links?
 * - URL-Matching: sind Favoriten des neuen Agenten dieselben URLs wie frühere Orphans?
 *
 * node scripts/diagnose-favorites.js
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'listings.db');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Keine Datenbank gefunden:', DB_PATH);
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH);

// ── Agenten ───────────────────────────────────────────────────────────────────
const configs = db.prepare('SELECT id, name, city FROM search_configs ORDER BY id').all();
console.log('\n=== SUCHAGENTEN ===');
if (configs.length === 0) console.log('  (keine)');
configs.forEach(c => console.log(`  ID ${c.id}: ${c.name || c.city || '?'}`));

// ── Gesamt-Stats ──────────────────────────────────────────────────────────────
const total     = db.prepare('SELECT COUNT(*) as n FROM listings').get().n;
const favTotal  = db.prepare('SELECT COUNT(*) as n FROM listings WHERE is_favorite = 1').get().n;
const blkTotal  = db.prepare('SELECT COUNT(*) as n FROM listings WHERE is_blacklisted = 1').get().n;
const orphTotal = db.prepare("SELECT COUNT(*) as n FROM listings WHERE search_config_id IS NULL").get().n;
const orphFav   = db.prepare("SELECT COUNT(*) as n FROM listings WHERE search_config_id IS NULL AND is_favorite = 1").get().n;
console.log(`\n=== GESAMT ===`);
console.log(`  Listings: ${total}  |  Favoriten: ${favTotal}  |  Blacklisted: ${blkTotal}  |  Orphans: ${orphTotal} (${orphFav} davon Favoriten)`);

// ── Favoriten je Agent ────────────────────────────────────────────────────────
const favs = db.prepare(`
  SELECT l.id, l.title, l.search_config_id, l.first_seen, l.link,
         sc.name as agent_name, sc.city
  FROM listings l
  LEFT JOIN search_configs sc ON sc.id = l.search_config_id
  WHERE l.is_favorite = 1
  ORDER BY l.search_config_id NULLS FIRST, l.first_seen DESC
`).all();

console.log(`\n=== FAVORITEN (${favs.length} gesamt) pro Agent ===`);
const byAgent = new Map();
for (const f of favs) {
  const key = f.search_config_id != null ? `Agent ${f.search_config_id} (${f.agent_name || f.city || '?'})` : '⚠️  ORPHAN (kein Agent)';
  if (!byAgent.has(key)) byAgent.set(key, []);
  byAgent.get(key).push(f);
}
for (const [label, list] of byAgent) {
  console.log(`\n  ${label}:`);
  for (const f of list) {
    console.log(`    [${f.id}] ${(f.title || '?').slice(0, 55).padEnd(55)} ${(f.first_seen || '').slice(0, 10)}`);
    console.log(`         ${f.link?.slice(0, 90)}`);
  }
}

// ── Doppelte Links ────────────────────────────────────────────────────────────
const dupes = db.prepare(`
  SELECT link, COUNT(*) as cnt
  FROM listings
  GROUP BY link HAVING COUNT(*) > 1
`).all();
if (dupes.length) {
  console.log(`\n⚠️  DOPPELTE LINKS (${dupes.length}):`);
  dupes.forEach(d => console.log(`  (${d.cnt}x) ${d.link}`));
} else {
  console.log('\n✅ Keine doppelten Links in der DB.');
}

// ── URL-Matching: Favoriten-URLs des neuesten Agenten vs Orphan-URLs ───────────
if (configs.length > 0) {
  const newestAgentId = configs[configs.length - 1].id;
  const agentFavLinks = new Set(
    db.prepare('SELECT link FROM listings WHERE search_config_id = ? AND is_favorite = 1')
      .all(newestAgentId).map(r => r.link)
  );
  if (agentFavLinks.size === 0) {
    console.log(`\n  Agent ${newestAgentId}: keine Favoriten.`);
  } else {
    // Prüfen: gab es diese Links jemals als Orphan oder unter anderem Agenten?
    const orphanLinks = new Set(
      db.prepare("SELECT link FROM listings WHERE search_config_id IS NULL").all().map(r => r.link)
    );
    const fromOrphan = [...agentFavLinks].filter(l => orphanLinks.has(l));

    console.log(`\n=== URL-ABGLEICH: Agent ${newestAgentId} Favoriten vs Orphans ===`);
    console.log(`  Agent ${newestAgentId} Favoriten-Links: ${agentFavLinks.size}`);
    console.log(`  Orphan-Links gesamt:                   ${orphanLinks.size}`);
    if (fromOrphan.length > 0) {
      console.log(`  ⚠️  ${fromOrphan.length} Favoriten-URL(s) sind AUCH noch als Orphan vorhanden:`);
      fromOrphan.forEach(l => console.log(`     ${l}`));
    } else {
      console.log(`  ✅ Keine Überschneidung – kein Listing ist gleichzeitig Favorit beim Agent und Orphan.`);
    }
  }
}

console.log('');
