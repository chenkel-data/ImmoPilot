/*
 * REST-API für Listings
 */

import { Router } from 'express';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getListings,
  getListingById,
  getAllSearchConfigs,
  markSeen,
  markAllSeen,
  toggleFavorite,
  setListingImages,
  getRecentRuns,
  purgeListingsKeepPinned,
  purgeListingsByConfig,
  blacklistListing,
  unblacklistListing,
  getOrphanStats,
  clearAllFavorites,
  clearFavoritesByConfig,
  clearAllBlacklist,
  clearBlacklistByConfig,
} from '../db/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'default.json');

function readConfig() {
  try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')); }
  catch { return { blacklistKeywords: [], blacklistedDistricts: [] }; }
}

function countStats(rows) {
  return {
    total: rows.length,
    unseen: rows.filter((row) => row.is_seen === 0).length,
    favorites: rows.filter((row) => row.is_favorite === 1).length,
  };
}

const router = Router();

// DELETE /api/listings/clear-favorites  – setzt alle Favoriten zurück
router.delete('/clear-favorites', asyncHandler(async (_req, res) => {
  clearAllFavorites();
  res.json({ ok: true });
}));

// DELETE /api/listings/clear-favorites/:configId  – setzt Favoriten eines Agenten zurück
router.delete('/clear-favorites/:configId', asyncHandler(async (req, res) => {
  clearFavoritesByConfig(Number(req.params.configId));
  res.json({ ok: true });
}));

// DELETE /api/listings/clear-blacklist  – leert die gesamte Blacklist
router.delete('/clear-blacklist', asyncHandler(async (_req, res) => {
  clearAllBlacklist();
  res.json({ ok: true });
}));

// DELETE /api/listings/clear-blacklist/:configId  – leert Blacklist eines Agenten
router.delete('/clear-blacklist/:configId', asyncHandler(async (req, res) => {
  clearBlacklistByConfig(Number(req.params.configId));
  res.json({ ok: true });
}));

// DELETE /api/listings/reset  – löscht alle Listings (Favoriten & Blacklist bleiben)
router.delete('/reset', asyncHandler(async (_req, res) => {
  purgeListingsKeepPinned();
  res.json({ ok: true });
}));

// DELETE /api/listings/reset/:configId  – löscht Listings eines Suchagenten
router.delete('/reset/:configId', asyncHandler(async (req, res) => {
  purgeListingsByConfig(Number(req.params.configId));
  res.json({ ok: true });
}));

// GET /api/listings/runs
router.get('/runs', asyncHandler(async (_req, res) => {
  res.json(getRecentRuns(50));
}));

// PATCH /api/listings/seen-all
router.patch('/seen-all', asyncHandler(async (_req, res) => {
  markAllSeen();
  res.json({ ok: true });
}));

// GET /api/listings/stats
router.get('/stats', asyncHandler(async (_req, res) => {
  const cfg = readConfig();
  const blacklistKeywords = cfg.blacklistKeywords ?? [];
  const blacklistedDistricts = cfg.blacklistedDistricts ?? [];

  const visibleRows = getListings({
    hideBlacklisted: true,
    showBlacklisted: false,
    blacklistKeywords,
    blacklistedDistricts,
  });
  const blacklistedRows = getListings({
    hideBlacklisted: false,
    showBlacklisted: true,
    blacklistKeywords,
    blacklistedDistricts,
  });

  res.json({
    ...countStats(visibleRows),
    blacklisted: blacklistedRows.length,
  });
}));

// GET /api/listings/stats/per-config
router.get('/stats/per-config', asyncHandler(async (_req, res) => {
  const cfg = readConfig();
  const blacklistKeywords = cfg.blacklistKeywords ?? [];
  const blacklistedDistricts = cfg.blacklistedDistricts ?? [];

  const perConfig = getAllSearchConfigs().map((searchConfig) => {
    const visibleRows = getListings({
      searchConfigId: searchConfig.id,
      hideBlacklisted: true,
      showBlacklisted: false,
      blacklistKeywords,
      blacklistedDistricts,
    });
    const blacklistedRows = getListings({
      searchConfigId: searchConfig.id,
      hideBlacklisted: false,
      showBlacklisted: true,
      blacklistKeywords,
      blacklistedDistricts,
    });
    const visibleStats = countStats(visibleRows);

    return {
      search_config_id: searchConfig.id,
      total: visibleStats.total,
      unseen: visibleStats.unseen,
      favorites: visibleStats.favorites,
      blacklisted: blacklistedRows.length,
    };
  });
  const orphans = getOrphanStats();
  res.json({ perConfig, orphans });
}));

// GET /api/listings
router.get('/', asyncHandler(async (req, res) => {
  const onlyUnseen    = req.query.unseen === 'true';
  const onlyFavorites = req.query.favorites === 'true';
  const listingType   = req.query.type || null;
  const provider      = req.query.provider || null;
  const searchConfigId = req.query.search_config_id ? Number(req.query.search_config_id) : null;
  const showBlacklisted = req.query.blacklisted === 'true';
  const includeBlacklisted = req.query.include_blacklisted === 'true';
  const hideBlacklisted = !showBlacklisted;

  const cfg = readConfig();
  const blacklistKeywords    = cfg.blacklistKeywords ?? [];
  const blacklistedDistricts = cfg.blacklistedDistricts ?? [];

  const listings = getListings({
    onlyUnseen, onlyFavorites,
    listingType, provider, searchConfigId,
    hideBlacklisted, showBlacklisted, includeBlacklisted,
    blacklistKeywords, blacklistedDistricts,
  });

  res.json(listings);
}));

// ── Image Fetching ──────────────────────────────────────────────────────────

async function fetchImagesForListing(listing) {
  if (listing.images) {
    try {
      const cached = JSON.parse(listing.images);
      if (Array.isArray(cached) && cached.length) return cached;
    } catch {}
  }

  try {
    const response = await fetch(listing.link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'de-DE,de;q=0.9',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    });

    const html = await response.text();
    const urls = new Set();

    const dataImgSrc = [...html.matchAll(/data-imgsrc="([^"]+\/images\/.+?)"/g)];
    for (const m of dataImgSrc) urls.add(m[1]);

    const galleryImgs = [...html.matchAll(/class="galleryimage-element[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/g)];
    for (const m of galleryImgs) urls.add(m[1]);

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">[\s\S]*?"image":\s*(\[[\s\S]+?\])/m);
    if (jsonLdMatch) {
      try {
        const parsed = JSON.parse(jsonLdMatch[1]);
        if (Array.isArray(parsed)) parsed.forEach(u => typeof u === 'string' && urls.add(u));
      } catch {}
    }

    if (urls.size === 0) {
      const fallback = [...html.matchAll(/https:\/\/img\.kleinanzeigen\.de\/api\/v1\/prod-ads\/images\/[^"'\s]+/g)];
      for (const m of fallback) urls.add(m[0]);
    }

    let images = [...urls]
      .filter(u => u.startsWith('http') && !u.includes('placeholder'))
      .map(u => u.replace(/s-l\d+\./, 's-l1600.'))
      .filter((u, i, arr) => arr.indexOf(u) === i)
      .slice(0, 20);

    if (images.length === 0 && listing.image) {
      images = [listing.image.replace(/s-l\d+\./, 's-l1600.')];
    }

    if (images.length) setListingImages(listing.id, images);
    return images;
  } catch (err) {
    console.error('[images] Fehler:', err.message);
    return listing.image ? [listing.image] : [];
  }
}

// POST /api/listings/batch-images
router.post('/batch-images', asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.json({ results: {} });

  const batchIds = ids.slice(0, 30);
  const results = {};
  const CONCURRENCY = 6;
  const queue = [...batchIds];

  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift();
      const listing = getListingById(id);
      if (!listing) { results[id] = []; continue; }
      results[id] = await fetchImagesForListing(listing);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()));
  res.json({ results });
}));

// GET /api/listings/:id/images
router.get('/:id/images', asyncHandler(async (req, res) => {
  const listing = getListingById(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing nicht gefunden' });
  res.json({ images: await fetchImagesForListing(listing) });
}));

// POST /api/listings/:id/blacklist
router.post('/:id/blacklist', asyncHandler(async (req, res) => {
  const result = blacklistListing(req.params.id);
  res.json(result);
}));

// DELETE /api/listings/:id/blacklist
router.delete('/:id/blacklist', asyncHandler(async (req, res) => {
  unblacklistListing(req.params.id);
  res.json({ ok: true });
}));

// GET /api/listings/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const listing = getListingById(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing nicht gefunden' });
  res.json(listing);
}));

// PATCH /api/listings/:id/seen
router.patch('/:id/seen', asyncHandler(async (req, res) => {
  markSeen(req.params.id);
  res.json({ ok: true });
}));

// PATCH /api/listings/:id/favorite
router.patch('/:id/favorite', asyncHandler(async (req, res) => {
  toggleFavorite(req.params.id);
  const updated = getListingById(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Listing nicht gefunden' });
  res.json(updated);
}));

export default router;
