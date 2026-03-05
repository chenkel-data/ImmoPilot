/**
 * API Client – Vollständiger HTTP-Client für alle Backend-Endpunkte
 */
const BASE = '';

async function request(method, path, body) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
      let errorMessage = `${method} ${path} → ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData.error) errorMessage = errorData.error;
        else if (errorData.message) errorMessage = errorData.message;
      } catch {
        errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return res.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Netzwerkfehler: Server nicht erreichbar');
    }
    throw error;
  }
}

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path, body) => request('DELETE', path, body),

  // ── Listings ───────────────────────────────────────────────
  listings: {
    getAll: (params = {}) => api.get(`/api/listings${buildQuery(params)}`),
    getStats: () => api.get('/api/listings/stats'),
    getStatsPerConfig: () => api.get('/api/listings/stats/per-config'),
    markSeen: (id) => api.patch(`/api/listings/${id}/seen`),
    markAllSeen: () => api.patch('/api/listings/seen-all'),
    toggleFav: (id) => api.patch(`/api/listings/${id}/favorite`),
    getImages: (id) => api.get(`/api/listings/${id}/images`),
    batchImages: (ids) => api.post('/api/listings/batch-images', { ids }),
    getRuns: () => api.get('/api/listings/runs'),
    reset: () => api.delete('/api/listings/reset'),
    resetByConfig: (configId) => api.delete(`/api/listings/reset/${configId}`),
    blacklist: (id) => api.post(`/api/listings/${id}/blacklist`),
    unblacklist: (id) => api.delete(`/api/listings/${id}/blacklist`),
    clearFavorites: () => api.delete('/api/listings/clear-favorites'),
    clearFavoritesByConfig: (configId) => api.delete(`/api/listings/clear-favorites/${configId}`),
    clearBlacklist: () => api.delete('/api/listings/clear-blacklist'),
    clearBlacklistByConfig: (configId) => api.delete(`/api/listings/clear-blacklist/${configId}`),
  },

  // ── Scraper ────────────────────────────────────────────────
  scrape: {
    start: () => api.post('/api/scrape'),
    startConfig: (configId) => api.post(`/api/scrape/${configId}`),
    stop: () => api.post('/api/scrape/stop'),
    status: () => api.get('/api/scrape/status'),
    getConfig: () => api.get('/api/scrape/config'),
    setConfig: (body) => api.patch('/api/scrape/config', body),
    getProviders: () => api.get('/api/providers'),
  },

  // ── Search Configs ─────────────────────────────────────────
  configs: {
    getAll: () => api.get('/api/configs'),
    create: (data) => api.post('/api/configs', data),
    update: (id, data) => api.patch(`/api/configs/${id}`, data),
    delete: (id) => api.delete(`/api/configs/${id}`),
    inferUrl: (url) => api.post('/api/configs/infer-url', { url }),
  },
};
