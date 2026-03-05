/*
 * REST-API für Search Configs & Provider
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getAllSearchConfigs,
  createSearchConfig,
  updateSearchConfig,
  deleteSearchConfig,
} from '../db/database.js';
import { getAllProviders, getProvider, inferFromUrl } from '../providers/registry.js';

// Minimale Slug-Normalisierung für Städtenamen (Umlaute + Leerzeichen)
const UMLAUT_MAP = { 'ä':'ae','ö':'oe','ü':'ue','ß':'ss','Ä':'Ae','Ö':'Oe','Ü':'Ue' };
function toSlug(s) {
  return s.trim()
    .replace(/[äöüßÄÖÜ]/g, c => UMLAUT_MAP[c] || c)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const router = Router();

// ── Providers ──────────────────────────────────────────────────────────────────

// GET /api/providers – Liste aller verfügbaren Provider mit Listing-Typen
router.get('/providers', asyncHandler(async (_req, res) => {
  res.json(getAllProviders());
}));

// POST /api/configs/infer-url – Ermittelt Provider und Listing-Typ aus einer URL
router.post('/infer-url', asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL fehlt' });
  const result = inferFromUrl(url);
  if (!result) return res.json({ detected: false });
  const provider = getProvider(result.providerId);
  const typeInfo = provider?.listingTypes?.find(t => t.id === result.listingTypeId);
  return res.json({
    detected: true,
    providerId: result.providerId,
    listingTypeId: result.listingTypeId,
    listingTypeLabel: typeInfo?.label || result.listingTypeId,
  });
}));

// ── Search Configs ─────────────────────────────────────────────────────────────

// GET /api/configs – Alle Suchkonfigurationen
router.get('/', asyncHandler(async (_req, res) => {
  const configs = getAllSearchConfigs();
  // Für jede Config die aktuelle Scrape-URL berechnen
  const enriched = configs.map(cfg => {
    let scrapeUrl = '';
    try {
      const extraParams = JSON.parse(cfg.extra_params || '{}');
      scrapeUrl = extraParams.directUrl || '';
    } catch {}
    return { ...cfg, scrape_url: scrapeUrl };
  });
  res.json(enriched);
}));

// POST /api/configs – Neue Suchkonfiguration erstellen
router.post('/', asyncHandler(async (req, res) => {
  const directUrl = req.body.directUrl || req.body.direct_url || '';
  const name = req.body.name || '';

  if (!directUrl) {
    return res.status(400).json({ error: 'Scrape-URL ist erforderlich.' });
  }

  // Stadt-Slug aus URL extrahieren (best-effort, nur für interne Referenz)
  const urlMatch = directUrl.match(/kleinanzeigen\.de\/[^/]+\/([^/]+)\//) 
    || directUrl.match(/\/\/[^/]+\/[^/]+\/([^/]+)\//);  // generic
  const citySlug = urlMatch ? urlMatch[1] : 'custom';
  const displayName = name || citySlug;

  const extraParams = { directUrl };
  console.log(`[config] Neue Config: ${displayUrl(directUrl)} → slug: ${citySlug}`);

  function displayUrl(u) { try { return new URL(u).pathname; } catch { return u; } }

  // Auto-detect listing type & provider from URL
  let providerId = req.body.provider || 'kleinanzeigen';
  let listingType = req.body.listing_type ?? req.body.listingType ?? null;
  if (!listingType) {
    const inferred = inferFromUrl(directUrl);
    if (inferred) {
      listingType = inferred.listingTypeId;
      providerId = inferred.providerId;
      console.log(`[config] Inferred from URL: provider=${providerId}, type=${listingType}`);
    } else {
      listingType = 'miete'; // safe fallback
    }
  }

  const config = createSearchConfig({
    provider: providerId,
    listingType,
    city: citySlug,
    radius: 0,
    maxPages: Number(req.body.max_pages ?? req.body.maxPages) || 10,
    extraParams,
    name,
  });

  res.status(201).json({ ...config, scrape_url: directUrl, display_name: displayName });
}));

// PATCH /api/configs/:id – Suchkonfiguration aktualisieren
router.patch('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const data = {};

  if (req.body.city !== undefined) {
    data.city = toSlug(req.body.city);
  }
  if (req.body.directUrl !== undefined || req.body.direct_url !== undefined) {
    const directUrl = req.body.directUrl || req.body.direct_url;
    data.extraParams = { directUrl };
    if (!req.body.city) {
      const urlMatch = directUrl.match(/kleinanzeigen\.de\/[^/]+\/([^/]+)\//)
        || directUrl.match(/\/\/[^/]+\/[^/]+\/([^/]+)\//);
      if (urlMatch) data.city = urlMatch[1];
    }
    // Auto-infer listing type from new URL if not explicitly supplied
    if (req.body.listing_type === undefined && req.body.listingType === undefined) {
      const inferred = inferFromUrl(directUrl);
      if (inferred) {
        data.listingType = inferred.listingTypeId;
        data.provider = inferred.providerId;
      }
    }
  }
  // radius ist veraltet, wird ignoriert
  if (req.body.max_pages !== undefined || req.body.maxPages !== undefined) data.maxPages = Number(req.body.max_pages ?? req.body.maxPages);
  if (req.body.enabled !== undefined) data.enabled = req.body.enabled ? 1 : 0;
  if (req.body.name !== undefined) data.name = req.body.name;
  if (req.body.extra_params !== undefined || req.body.extraParams !== undefined) {
    if (!data.extraParams) data.extraParams = req.body.extra_params ?? req.body.extraParams;
  }
  if (req.body.listing_type !== undefined || req.body.listingType !== undefined) data.listingType = req.body.listing_type ?? req.body.listingType;
  if (req.body.provider !== undefined) data.provider = req.body.provider;

  const updated = updateSearchConfig(id, data);

  // Scrape-URL anreichern
  let scrapeUrl = '';
  try {
    const extraParams = JSON.parse(updated.extra_params || '{}');
    scrapeUrl = extraParams.directUrl || '';
  } catch {}

  res.json({ ...updated, scrape_url: scrapeUrl });
}));

// DELETE /api/configs/:id – Suchkonfiguration löschen
router.delete('/:id', asyncHandler(async (req, res) => {
  deleteSearchConfig(Number(req.params.id));
  res.json({ ok: true });
}));

export default router;
