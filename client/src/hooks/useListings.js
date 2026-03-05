import { useState, useCallback, useRef } from 'react';
import { api } from '../api.js';

export function useListings(showToast) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, unseen: 0, favorites: 0, blacklisted: 0 });
  const listingsRequestIdRef = useRef(0);
  const statsRequestIdRef = useRef(0);
  const configStatsRequestIdRef = useRef(0);

  const loadListings = useCallback(async (params = {}) => {
    const requestId = ++listingsRequestIdRef.current;
    try {
      setListings([]);
      setLoading(true);
      const data = await api.listings.getAll(params);
      if (requestId === listingsRequestIdRef.current) {
        setListings(data);
      }
      return data;
    } catch (e) {
      showToast?.(`Fehler beim Laden: ${e.message}`, 'error');
      throw e;
    } finally {
      if (requestId === listingsRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [showToast]);

  const loadStats = useCallback(async () => {
    const requestId = ++statsRequestIdRef.current;
    try {
      const data = await api.listings.getStats();
      if (requestId === statsRequestIdRef.current) {
        setStats(data);
      }
      return data;
    } catch {}
  }, []);

  const [configStats, setConfigStats] = useState({});
  const [orphanStats, setOrphanStats] = useState({ total: 0, unseen: 0, favorites: 0 });
  const loadConfigStats = useCallback(async () => {
    const requestId = ++configStatsRequestIdRef.current;
    try {
      const data = await api.listings.getStatsPerConfig();
      const rows = data.perConfig ?? data;
      const map = {};
      for (const row of (Array.isArray(rows) ? rows : [])) {
        if (row.search_config_id != null) {
          map[row.search_config_id] = { total: row.total, unseen: row.unseen, favorites: row.favorites ?? 0, blacklisted: row.blacklisted ?? 0 };
        }
      }
      if (requestId === configStatsRequestIdRef.current) {
        setConfigStats(map);
        if (data.orphans) setOrphanStats(data.orphans);
      }
      return map;
    } catch {
      return {};
    }
  }, []);

  // Holt Stats nach jeder Mutation neu vom Server – zuverlässiger als manuelle Deltas
  const refreshStats = useCallback(async () => {
    await Promise.all([loadStats(), loadConfigStats()]);
  }, [loadStats, loadConfigStats]);

  const handleSeen = useCallback(async (id) => {
    const current = listings.find((l) => l.id === id);
    if (!current || current.is_seen) return;

    await api.listings.markSeen(id);

    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_seen: 1 } : l)));
    // Optimistisches Update nur für unseen (einfach und zuverlässig)
    setStats((prev) => ({ ...prev, unseen: Math.max(0, (prev.unseen ?? 0) - 1) }));
    if (current.search_config_id != null) {
      setConfigStats((prev) => {
        const existing = prev[current.search_config_id];
        if (!existing) return prev;
        return { ...prev, [current.search_config_id]: { ...existing, unseen: Math.max(0, (existing.unseen ?? 0) - 1) } };
      });
    }
  }, [listings]);

  const handleFavorite = useCallback(async (id) => {
    const current = listings.find((l) => l.id === id);
    const updated = await api.listings.toggleFav(id);
    if (current?.is_blacklisted) {
      // War blacklisted → jetzt un-blacklisted + favorisiert
      setListings((prev) => prev.map((l) => (
        l.id === id ? { ...l, is_blacklisted: 0, is_favorite: 1 } : l
      )));
      showToast?.('Von Blacklist entfernt und als Favorit gespeichert', 'success');
    } else {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_favorite: updated.is_favorite } : l)));
    }
    await refreshStats();
  }, [listings, refreshStats, showToast]);

  const handleBlacklist = useCallback(async (id) => {
    await api.listings.blacklist(id);
    setListings((prev) => prev.map((l) => (
      l.id === id ? { ...l, is_blacklisted: 1, is_favorite: 0 } : l
    )));
    showToast?.('Listing auf Blacklist gesetzt', 'info');
    await refreshStats();
  }, [refreshStats, showToast]);

  const handleUnblacklist = useCallback(async (id) => {
    await api.listings.unblacklist(id);
    setListings((prev) => prev.map((l) => (
      l.id === id ? { ...l, is_blacklisted: 0 } : l
    )));
    showToast?.('Von Blacklist entfernt', 'success');
    await refreshStats();
  }, [refreshStats, showToast]);

  const handleMarkAllSeen = useCallback(async () => {
    await api.listings.markAllSeen();
    setListings((prev) => prev.map((l) => ({ ...l, is_seen: 1 })));
    setStats((prev) => ({ ...prev, unseen: 0 }));
    setConfigStats((prev) => {
      const next = {};
      for (const [configId, data] of Object.entries(prev)) {
        next[configId] = { ...data, unseen: 0 };
      }
      return next;
    });
    showToast?.('Alle als gesehen markiert.', 'success');
  }, [showToast]);

  const handleReset = useCallback(async (loadParams = {}) => {
    await api.listings.reset();
    await loadListings(loadParams);
    await refreshStats();
    showToast?.('Bereinigt: Favoriten & Blacklist behalten.', 'info');
  }, [showToast, loadListings, refreshStats]);

  const handleResetConfig = useCallback(async (configId, loadParams = {}) => {
    await api.listings.resetByConfig(configId);
    await loadListings(loadParams);
    await refreshStats();
    showToast?.('Agent-Listings gelöscht. Favoriten & Blacklist behalten.', 'info');
  }, [showToast, loadListings, refreshStats]);

  const handleClearFavorites = useCallback(async (loadParams = {}) => {
    await api.listings.clearFavorites();
    setListings((prev) => prev.map((l) => ({ ...l, is_favorite: 0 })));
    await refreshStats();
    showToast?.('Alle Favoriten entfernt.', 'info');
  }, [refreshStats, showToast]);

  const handleClearFavoritesByConfig = useCallback(async (configId, loadParams = {}) => {
    await api.listings.clearFavoritesByConfig(configId);
    setListings((prev) => prev.map((l) =>
      l.search_config_id === configId ? { ...l, is_favorite: 0 } : l
    ));
    await refreshStats();
    showToast?.('Favoriten dieses Agenten entfernt.', 'info');
  }, [refreshStats, showToast]);

  const handleClearBlacklist = useCallback(async (loadParams = {}) => {
    await api.listings.clearBlacklist();
    setListings((prev) => prev.map((l) => (l.is_blacklisted ? { ...l, is_blacklisted: 0 } : l)));
    await refreshStats();
    showToast?.('Blacklist geleert.', 'info');
  }, [refreshStats, showToast]);

  const handleClearBlacklistByConfig = useCallback(async (configId) => {
    await api.listings.clearBlacklistByConfig(configId);
    setListings((prev) => prev.map((l) => (
      l.search_config_id === configId && l.is_blacklisted
        ? { ...l, is_blacklisted: 0 }
        : l
    )));
    await refreshStats();
    showToast?.('Blacklist-Einträge dieses Agenten entfernt.', 'info');
  }, [refreshStats, showToast]);

  return {
    listings, setListings, loading, stats, configStats, orphanStats,
    loadListings, loadStats, loadConfigStats,
    handleSeen, handleFavorite, handleBlacklist, handleUnblacklist,
    handleMarkAllSeen, handleReset, handleResetConfig,
    handleClearFavorites, handleClearFavoritesByConfig,
    handleClearBlacklist, handleClearBlacklistByConfig,
  };
}
