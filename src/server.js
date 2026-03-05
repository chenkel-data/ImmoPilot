/*
 * Haupt-Server – Express + Cron-Scheduler
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

import listingsRouter from './routes/listings.js';
import scraperRouter from './routes/scraper.js';
import configsRouter from './routes/configs.js';
import { runAllScrapes } from './services/scraperService.js';
import {
  requestLogger,
  errorHandler,
  notFoundHandler,
} from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ── Middleware ──────────────────────────────────────────────────────────────

app.use(cors());
app.use(compression());
app.use(express.json());

// Request Logging (nur in Dev-Mode detailliert)
if (NODE_ENV === 'development') {
  app.use(requestLogger);
}

// Statische Frontend-Dateien
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── API-Routen ──────────────────────────────────────────────────────────────

app.use('/api/listings', listingsRouter);
app.use('/api/scrape', scraperRouter);
app.use('/api/configs', configsRouter);

// Provider-Info Endpoint (wird vom configs-Router bereitgestellt)
import { getAllProviders } from './providers/registry.js';
app.get('/api/providers', (_req, res) => res.json(getAllProviders()));

// Catch-All → Frontend ausliefern (SPA)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Error Handling Middleware ───────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ── Cron-Scheduler ──────────────────────────────────────────────────────────

const CRON = process.env.SCRAPE_CRON || '*/30 * * * *';
// Scheduler ist standardmäßig AUS. Nur aktivieren, wenn SCRAPE_CRON_ENABLED explizit 'true' ist.
const CRON_ENABLED = process.env.SCRAPE_CRON_ENABLED === 'true';

if (CRON_ENABLED) {
  cron.schedule(CRON, async () => {
    console.log(`[cron] Starte geplantes Scraping (${new Date().toLocaleTimeString('de-DE')})`);
    await runAllScrapes().catch((err) => console.error('[cron] Fehler:', err));
  });
  console.log(`[cron] Scheduler aktiv: "${CRON}"`);
} else {
  console.log('[cron] Scheduler deaktiviert');
}

// ── Server starten ──────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log(`\n🏠 immo-app läuft auf http://localhost:${PORT}`);
  console.log(`   Umgebung: ${NODE_ENV}`);
  console.log(`   Cron: ${CRON_ENABLED ? CRON : 'deaktiviert'}\n`);

  if (process.env.SCRAPE_ON_START === 'true') {
    console.log('[startup] Führe initialen Scrape aus...');
    runAllScrapes().catch((err) => console.error('[startup] Fehler:', err));
  }
});
