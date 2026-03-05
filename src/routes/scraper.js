import { Router } from 'express';
import { runAllScrapes, runScrapeForConfig } from '../services/scraperService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEnabledSearchConfigs } from '../db/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'default.json');
const router = Router();

function readConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch (error) {
    console.error('Fehler beim Lesen der Config:', error);
    return { blacklistKeywords: [], blacklistedDistricts: [] };
  }
}

// Status-Flag: läuft gerade ein Scraping-Prozess?
let running = false;
let controller = null;
let progress = { pagesScraped: 0, totalPages: 0, currentConfig: 0, totalConfigs: 0, currentConfigName: '' };

// GET /api/scrape/status
router.get('/status', asyncHandler(async (_req, res) => {
  res.json({
    running,
    pagesScraped: progress.pagesScraped,
    totalPages: progress.totalPages,
    currentConfig: progress.currentConfig,
    totalConfigs: progress.totalConfigs,
    currentConfigName: progress.currentConfigName,
  });
}));

// GET /api/scrape/config  → aktuelle globale Konfiguration (Blacklist-Keywords etc.)
router.get('/config', asyncHandler(async (_req, res) => {
  res.json(readConfig());
}));

// PATCH /api/scrape/config  → Globale Konfiguration aktualisieren
router.patch('/config', asyncHandler(async (req, res) => {
  const current = readConfig();
  const { blacklistKeywords, blacklistedDistricts } = req.body;

  if (Array.isArray(blacklistKeywords)) current.blacklistKeywords = blacklistKeywords;
  if (Array.isArray(blacklistedDistricts)) current.blacklistedDistricts = blacklistedDistricts;

  writeFileSync(CONFIG_PATH, JSON.stringify(current, null, 2), 'utf8');
  res.json({ ok: true, config: current });
}));

// POST /api/scrape  → startet Scraping für alle aktiven Suchkonfigurationen
router.post('/', asyncHandler(async (req, res) => {
  if (running) {
    return res.status(429).json({ error: 'Scraping läuft bereits.' });
  }

  const configs = getEnabledSearchConfigs();
  if (configs.length === 0) {
    return res.status(400).json({ error: 'Keine aktiven Suchkonfigurationen vorhanden.' });
  }

  progress = { pagesScraped: 0, totalPages: 0, currentConfig: 0, totalConfigs: configs.length, currentConfigName: '' };

  controller = new AbortController();
  running = true;
  res.json({ ok: true, message: `Scraping gestartet (${configs.length} Konfiguration${configs.length > 1 ? 'en' : ''}).` });

  try {
    await runAllScrapes({
      signal: controller.signal,
      onProgress: (p) => {
        progress.pagesScraped = p.pageNum ?? progress.pagesScraped;
        progress.totalPages = p.maxPages ?? progress.totalPages;
        progress.currentConfig = p.configIdx ?? progress.currentConfig;
        progress.totalConfigs = p.totalConfigs ?? progress.totalConfigs;
        if (p.configName !== undefined) progress.currentConfigName = p.configName;
      },
    });
  } finally {
    running = false;
    controller = null;
    progress = { pagesScraped: 0, totalPages: 0, currentConfig: 0, totalConfigs: 0, currentConfigName: '' };
  }
}));

// POST /api/scrape/stop → bricht laufenden Scrape ab
router.post('/stop', asyncHandler(async (req, res) => {
  if (!running || !controller) {
    return res.json({ ok: false, message: 'Kein laufender Scrape.' });
  }

  controller.abort();
  return res.json({ ok: true, message: 'Scrape wird abgebrochen…' });
}));

// POST /api/scrape/:configId → startet Scraping für eine einzelne Suchkonfiguration
router.post('/:configId', asyncHandler(async (req, res) => {
  if (running) {
    return res.status(429).json({ error: 'Scraping läuft bereits.' });
  }

  const configId = Number(req.params.configId);
  const configs = getEnabledSearchConfigs();
  const cfg = configs.find(c => c.id === configId);
  if (!cfg) {
    return res.status(404).json({ error: 'Suchkonfiguration nicht gefunden oder nicht aktiviert.' });
  }

  progress = { pagesScraped: 0, totalPages: cfg.max_pages || 10, currentConfig: 1, totalConfigs: 1, currentConfigName: cfg.name || cfg.city };

  controller = new AbortController();
  running = true;
  res.json({ ok: true, message: `Scraping gestartet: ${cfg.name || cfg.city} (${cfg.listing_type}).` });

  try {
    await runScrapeForConfig(cfg, {
      signal: controller.signal,
      onProgress: (p) => {
        progress.pagesScraped = p.pageNum ?? progress.pagesScraped;
        progress.totalPages = p.maxPages ?? progress.totalPages;
      },
    });
  } finally {
    running = false;
    controller = null;
    progress = { pagesScraped: 0, totalPages: 0, currentConfig: 0, totalConfigs: 0, currentConfigName: '' };
  }
}));

export default router;
