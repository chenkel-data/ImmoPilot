/*
 * Interaktives DB-Inspect-Script
 * Zeigt den Inhalt der lokalen SQLite-Datenbank direkt in der Konsole.
 *
 * Verwendung:
 *   node scripts/query-db.js              → Übersicht + letzte 10 Listings
 *   node scripts/query-db.js listings     → alle Listings (Tabelle)
 *   node scripts/query-db.js all          → alle Listings (kompakt)
 *   node scripts/query-db.js runs         → Scraping-Verlauf
 *   node scripts/query-db.js sql "SELECT title, price FROM listings LIMIT 5"
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'listings.db');

if (!fs.existsSync(DB_PATH)) {
  console.error(`\n❌ Keine Datenbank gefunden unter: ${DB_PATH}`);
  console.error('   → Starte zuerst den Scraper mit: npm run test:scraper\n');
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH);
const cmd = process.argv[2] || 'overview';
const sqlArg = process.argv[3];

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function table(rows, columns) {
  if (!rows.length) { console.log('  (keine Einträge)\n'); return; }
  const cols = columns || Object.keys(rows[0]);
  // Spaltenbreiten ermitteln
  const widths = cols.map((c) =>
    Math.min(50, Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length)))
  );
  const line = widths.map((w) => '─'.repeat(w + 2)).join('┼');
  const header = cols.map((c, i) => ` ${c.padEnd(widths[i])} `).join('│');

  console.log('┌' + widths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐');
  console.log('│' + header + '│');
  console.log('├' + line + '┤');
  rows.forEach((row) => {
    const cells = cols.map((c, i) => {
      const v = String(row[c] ?? '').replace(/\n/g, ' ').slice(0, widths[i]);
      return ` ${v.padEnd(widths[i])} `;
    });
    console.log('│' + cells.join('│') + '│');
  });
  console.log('└' + widths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘');
}

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

// ── Befehle ───────────────────────────────────────────────────────────────────

if (cmd === 'overview' || cmd === 'o') {
  const totalListings  = db.prepare(`SELECT COUNT(*) AS n FROM listings`).get().n;
  const unseenListings = db.prepare(`SELECT COUNT(*) AS n FROM listings WHERE is_seen = 0`).get().n;
  const favorites      = db.prepare(`SELECT COUNT(*) AS n FROM listings WHERE is_favorite = 1`).get().n;
  const totalRuns      = db.prepare(`SELECT COUNT(*) AS n FROM scrape_runs`).get().n;
  const lastRun        = db.prepare(`SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT 1`).get();

  console.log('\n📊 Datenbank-Übersicht');
  console.log('═══════════════════════════════════════');
  console.log(`  Datei          : ${DB_PATH}`);
  console.log(`  Listings gesamt: ${totalListings}`);
  console.log(`  Ungesehen      : ${unseenListings}`);
  console.log(`  Favoriten      : ${favorites}`);
  console.log(`  Scrape-Läufe   : ${totalRuns}`);
  if (lastRun) {
    console.log(`  Letzter Lauf   : ${fmt(lastRun.started_at)} → ${lastRun.status} (${lastRun.total_count} total, ${lastRun.new_count} neu)`);
  }
  console.log('');

  console.log('🏠 Letzte 10 Listings:');
  const rows = db.prepare(`
    SELECT id, title, price, size, address, first_seen
    FROM listings
    ORDER BY first_seen DESC LIMIT 10
  `).all().map((r) => ({ ...r, first_seen: fmt(r.first_seen) }));
  table(rows, ['title', 'price', 'size', 'address', 'first_seen']);
  console.log(`\n  Tipp: node scripts/query-db.js listings   → alle anzeigen`);
  console.log(`        node scripts/query-db.js sql "SELECT ..."  → eigene Abfrage\n`);

} else if (cmd === 'listings' || cmd === 'l') {
  const rows = db.prepare(`
    SELECT id, title, price, size, rooms, publisher, address,
           CASE WHEN is_seen=1 THEN '✓' ELSE '○' END AS seen,
           CASE WHEN is_favorite=1 THEN '⭐' ELSE '' END AS fav,
           first_seen
    FROM listings
    ORDER BY first_seen DESC
  `).all().map((r) => ({ ...r, first_seen: fmt(r.first_seen) }));
  console.log(`\n🏠 Listings (${rows.length}):\n`);
  table(rows, ['title', 'price', 'size', 'rooms', 'publisher', 'address', 'seen', 'fav', 'first_seen']);
  console.log('');

} else if (cmd === 'all') {
  const rows = db.prepare(`
    SELECT id, title, price,
           first_seen, last_seen
    FROM listings ORDER BY first_seen DESC
  `).all().map((r) => ({ ...r, first_seen: fmt(r.first_seen), last_seen: fmt(r.last_seen) }));
  console.log(`\n🏠 Alle Listings (${rows.length}):\n`);
  table(rows, ['title', 'price', 'first_seen', 'last_seen']);
  console.log('');

} else if (cmd === 'runs' || cmd === 'r') {
  const rows = db.prepare(`SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT 30`).all()
    .map((r) => {
      const dur = r.ended_at
        ? Math.round((new Date(r.ended_at) - new Date(r.started_at)) / 1000) + 's'
        : '…';
      return { source: r.source, started: fmt(r.started_at), dauer: dur, status: r.status, neu: r.new_count, gesamt: r.total_count, fehler: r.error ?? '' };
    });
  console.log(`\n🔄 Scraping-Verlauf (${rows.length} Läufe):\n`);
  table(rows, ['source', 'started', 'dauer', 'status', 'neu', 'gesamt', 'fehler']);
  console.log('');

} else if (cmd === 'sql') {
  if (!sqlArg) {
    console.error('❌ Kein SQL angegeben. Beispiel:\n  node scripts/query-db.js sql "SELECT title, price FROM listings LIMIT 5"\n');
    process.exit(1);
  }
  console.log(`\n🗄️  SQL: ${sqlArg}\n`);
  try {
    const rows = db.prepare(sqlArg).all();
    table(rows);
  } catch (err) {
    console.error('❌ SQL-Fehler:', err.message);
  }
  console.log('');

} else {
  console.log('\nVerfügbare Befehle:');
  console.log('  node scripts/query-db.js              → Übersicht');
  console.log('  node scripts/query-db.js listings     → alle Listings');
  console.log('  node scripts/query-db.js all          → alle Listings (kompakt)');
  console.log('  node scripts/query-db.js runs         → Scraping-Verlauf');
  console.log('  node scripts/query-db.js sql "SELECT title, price FROM listings LIMIT 5"\n');
}
