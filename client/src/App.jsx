import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Header from './components/Header.jsx';
import AgentSidebar from './components/AgentSidebar.jsx';
import FilterBar from './components/FilterBar.jsx';
import ListingsGrid from './components/ListingsGrid.jsx';
import ScrapeLog from './components/ScrapeLog.jsx';
import Sidebar from './components/Sidebar.jsx';
import Toast from './components/Toast.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import { useListings } from './hooks/useListings.js';
import { useScraper } from './hooks/useScraper.js';
import { useRuns } from './hooks/useRuns.js';
import { useToast } from './hooks/useToast.js';
import { useSearchConfigs } from './hooks/useSearchConfigs.js';
import { parseNum } from './utils/formatting.js';
import { TABS, ITEMS_PER_PAGE, LISTING_TYPE_LABELS, LISTING_TYPE_COLORS } from './constants.js';

const FILTERS_STORAGE_KEY = 'immo.filters.v1';
const EMPTY_STATS = { total: 0, unseen: 0, favorites: 0, blacklisted: 0 };

function buildStatsFromListings(list) {
  const stats = { ...EMPTY_STATS };
  for (const listing of list) {
    if (listing.is_blacklisted) {
      stats.blacklisted += 1;
      continue;
    }
    stats.total += 1;
    if (!listing.is_seen) stats.unseen += 1;
    if (listing.is_favorite) stats.favorites += 1;
  }
  return stats;
}

function readPersistedFilters() {
  const defaults = {
    searchQuery: '',
    listingTypeFilter: '',
    publisherFilter: '',
    minPrice: '',
    maxPrice: '',
    minSize: '',
    minRooms: '',
  };
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export default function App() {
  const persistedFilters = readPersistedFilters();

  /* toast */
  const { toasts, showToast } = useToast();

  /* data hooks */
  const {
    listings, loading, orphanStats,
    loadListings, loadStats, loadConfigStats,
    handleSeen, handleFavorite, handleBlacklist, handleUnblacklist,
    handleMarkAllSeen, handleReset, handleResetConfig,
    handleClearFavorites, handleClearFavoritesByConfig,
    handleClearBlacklist, handleClearBlacklistByConfig,
  } = useListings(showToast);
  const { runs, loadRuns } = useRuns();
  const { configs, providers, loadConfigs, loadProviders, addConfig, editConfig, removeConfig, toggleConfig } = useSearchConfigs(showToast);

  // Ref hält immer die zuletzt verwendeten Lade-Parameter (Agent-Filter),
  // damit reloadAll nach dem Scraping den korrekten Kontext lädt.
  const currentListingParamsRef = useRef({ include_blacklisted: true });

  /* scraper */
  const reloadAll = useCallback(() => {
    loadListings(currentListingParamsRef.current);
    loadStats();
    loadConfigStats();
    loadRuns();
  }, [loadListings, loadStats, loadConfigStats, loadRuns]);
  const { scraping, scrapeProgress, startScraping, startScrapingConfig, stopScraping, cleanup } = useScraper(showToast, reloadAll);

  /* confirm dialog state */
  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const askConfirm = useCallback(({ title, message, danger = false, confirm = 'Bestätigen', onConfirm }) => {
    setConfirmDialog({ open: true, title, message, danger, confirm, onConfirm });
  }, []);
  const closeConfirm = useCallback(() => setConfirmDialog({ open: false }), []);

  /* local UI state */
  const [activeTab, setActiveTab] = useState(TABS.UNSEEN);
  const [activeConfigId, setActiveConfigId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agentSidebarCollapsed, setAgentSidebarCollapsed] = useState(false);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(persistedFilters.searchQuery);
  const [listingTypeFilter, setListingTypeFilter] = useState(persistedFilters.listingTypeFilter);
  const [publisherFilter, setPublisherFilter] = useState(persistedFilters.publisherFilter);
  const [minPrice, setMinPrice] = useState(persistedFilters.minPrice);
  const [maxPrice, setMaxPrice] = useState(persistedFilters.maxPrice);
  const [minSize, setMinSize] = useState(persistedFilters.minSize);
  const [minRooms, setMinRooms] = useState(persistedFilters.minRooms);

  /* initial load */
  useEffect(() => { loadStats(); loadConfigStats(); loadRuns(); loadConfigs(); loadProviders(); }, []);
  useEffect(() => cleanup, [cleanup]);

  useEffect(() => {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({
      searchQuery,
      listingTypeFilter,
      publisherFilter,
      minPrice,
      maxPrice,
      minSize,
      minRooms,
    }));
  }, [searchQuery, listingTypeFilter, publisherFilter, minPrice, maxPrice, minSize, minRooms]);

  /* Always load complete listing set; agent filter is client-side only */
  useEffect(() => {
    const params = { include_blacklisted: true };
    currentListingParamsRef.current = params;
    loadListings(params);
  }, [loadListings]);

  useEffect(() => { setPage(1); }, [activeTab]);

  /* config selection handler – always resets tab to ALL when switching */
  const handleSelectConfig = useCallback((configId) => {
    setActiveConfigId(configId ?? null);
    // Daten werden immer global geladen; Ref bleibt daher ohne Agent-Filter.
    currentListingParamsRef.current = { include_blacklisted: true };
    setActiveTab(TABS.ALL);
    setPage(1);
  }, []);

  /* navigate home: deselect agent, reset to unseen tab */
  const handleNavigateHome = useCallback(() => {
    setActiveConfigId(null);
    // Auch hier den Ref sofort auf leere Filter setzen
    currentListingParamsRef.current = { include_blacklisted: true };
    setActiveTab(TABS.UNSEEN);
    setPage(1);
    setSearchQuery(''); setMinPrice(''); setMaxPrice(''); setMinSize(''); setMinRooms(''); setListingTypeFilter('');
  }, []);

  /* UI filters across all listings (without tab + without selected agent) */
  const uiFilteredListings = useMemo(() => {
    let list = [...listings];
    const q = searchQuery.toLowerCase();

    if (listingTypeFilter) list = list.filter(l => l.listing_type === listingTypeFilter);
    if (q) list = list.filter(l => (l.title || '').toLowerCase().includes(q) || (l.address || '').toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q));
    if (publisherFilter) list = list.filter(l => (l.publisher || '').toLowerCase().includes(publisherFilter.toLowerCase()));
    if (minPrice) list = list.filter(l => parseNum(l.price) >= Number(minPrice));
    if (maxPrice) list = list.filter(l => parseNum(l.price) <= Number(maxPrice));
    if (minSize) list = list.filter(l => parseNum(l.size) >= Number(minSize));
    if (minRooms) list = list.filter(l => { const r = parseNum(l.rooms); return r && r >= Number(minRooms); });
    return list;
  }, [listings, listingTypeFilter, publisherFilter, searchQuery, minPrice, maxPrice, minSize, minRooms]);

  /* Scope by selected agent after UI filters */
  const filteredBase = useMemo(() => {
    if (!activeConfigId) return uiFilteredListings;
    return uiFilteredListings.filter(l => l.search_config_id === activeConfigId);
  }, [uiFilteredListings, activeConfigId]);

  const filtered = useMemo(() => {
    let list = [...filteredBase];
    if (activeTab === TABS.UNSEEN) list = list.filter(l => !l.is_blacklisted && !l.is_seen);
    else if (activeTab === TABS.FAVORITES) list = list.filter(l => !l.is_blacklisted && l.is_favorite);
    else if (activeTab === TABS.BLACKLISTED) list = list.filter(l => l.is_blacklisted);
    else list = list.filter(l => !l.is_blacklisted);
    return list;
  }, [filteredBase, activeTab]);

  const tabCounts = useMemo(() => {
    return {
      [TABS.ALL]: filteredBase.filter(l => !l.is_blacklisted).length,
      [TABS.UNSEEN]: filteredBase.filter(l => !l.is_blacklisted && !l.is_seen).length,
      [TABS.FAVORITES]: filteredBase.filter(l => !l.is_blacklisted && l.is_favorite).length,
      [TABS.BLACKLISTED]: filteredBase.filter(l => l.is_blacklisted).length,
    };
  }, [filteredBase]);

  const activeConfigStats = useMemo(() => ({
    total: tabCounts[TABS.ALL],
    unseen: tabCounts[TABS.UNSEEN],
    favorites: tabCounts[TABS.FAVORITES],
    blacklisted: tabCounts[TABS.BLACKLISTED],
  }), [tabCounts]);

  // Agent cards are derived from the same filtered listing base as the grid.
  const sidebarConfigStats = useMemo(() => {
    const map = {};
    for (const cfg of configs) map[cfg.id] = { ...EMPTY_STATS };
    for (const listing of uiFilteredListings) {
      const configId = listing.search_config_id;
      if (configId == null) continue;
      if (!map[configId]) map[configId] = { ...EMPTY_STATS };
      const bucket = map[configId];
      if (listing.is_blacklisted) {
        bucket.blacklisted += 1;
        continue;
      }
      bucket.total += 1;
      if (!listing.is_seen) bucket.unseen += 1;
      if (listing.is_favorite) bucket.favorites += 1;
    }
    return map;
  }, [configs, uiFilteredListings]);

  const sidebarGlobalStats = useMemo(() => (
    buildStatsFromListings(uiFilteredListings)
  ), [uiFilteredListings]);


  const pages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, pages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const unseenCount = listings.filter(l => !l.is_seen && !l.is_blacklisted).length;

  const resetFilters = () => { setSearchQuery(''); setMinPrice(''); setMaxPrice(''); setMinSize(''); setMinRooms(''); setListingTypeFilter(''); setPublisherFilter(''); };

  /* Find active agent for header indicator */
  const activeAgent = configs.find(c => c.id === activeConfigId);
  const activeAgentName = activeAgent ? (activeAgent.name || activeAgent.city) : null;
  const enabledConfigs = useMemo(() => configs.filter(c => c.enabled), [configs]);
  const canScrape = enabledConfigs.length > 0;

  /* Context-aware scrape: if agent selected, scrape only it; otherwise scrape all */
  const handleHeaderScrape = useCallback(() => {
    if (!canScrape) {
      showToast?.('Kein aktiver Agent vorhanden. Bitte zuerst einen Agenten anlegen oder aktivieren.', 'info');
      return;
    }
    if (activeConfigId) {
      startScrapingConfig(activeConfigId);
    } else if (enabledConfigs.length === 1) {
      startScrapingConfig(enabledConfigs[0].id);
    } else {
      startScraping();
    }
  }, [activeConfigId, startScrapingConfig, startScraping, enabledConfigs, canScrape, showToast]);

  return (
    <ErrorBoundary>
      <div className="app">
        <Header
          scraping={scraping} scrapeProgress={scrapeProgress}
          unseenCount={unseenCount}
          canScrape={canScrape}
          onScrape={handleHeaderScrape} onScrapeAll={startScraping} onStop={stopScraping}
          onMarkAllSeen={handleMarkAllSeen}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          onNavigateHome={handleNavigateHome}
          activeConfigId={activeConfigId}
          activeAgentName={activeAgentName}
        />

        <div className="app-body">
          <AgentSidebar
            configs={configs}
            providers={providers}
            configStats={sidebarConfigStats}
            orphanStats={orphanStats}
            globalStats={sidebarGlobalStats}
            activeConfigId={activeConfigId}
            onSelectConfig={handleSelectConfig}
            onAdd={(d) => addConfig({ provider: d.provider, listing_type: d.listingType, max_pages: d.maxPages, directUrl: d.directUrl, name: d.name })}
            onEdit={(id, d) => editConfig(id, d)}
            onDelete={(id) => {
              const cfg = configs.find(c => c.id === id);
              const name = cfg?.name || cfg?.city || 'Agent';
              askConfirm({
                title: `"${name}" löschen?`,
                message: 'Favoriten & Blacklist-Einträge bleiben erhalten. Alle anderen Listings dieses Agenten werden entfernt.',
                confirm: 'Agent löschen',
                danger: true,
                onConfirm: async () => {
                  closeConfirm();
                  await removeConfig(id);
                  if (activeConfigId === id) setActiveConfigId(null);
                  await loadListings(currentListingParamsRef.current);
                  await loadStats();
                  await loadConfigStats();
                },
              });
            }}
            onToggle={toggleConfig}
            onScrapeConfig={startScrapingConfig}
            onResetConfig={(configId) => {
              const cfg = configs.find(c => c.id === configId);
              const name = cfg?.name || cfg?.city || 'Agent';
              askConfirm({
                title: `Listings von "${name}" bereinigen?`,
                message: 'Alle normalen Listings dieses Agenten werden gelöscht. Favoriten & Blacklist-Einträge bleiben erhalten.',
                confirm: 'Bereinigen',
                danger: false,
                onConfirm: async () => {
                  closeConfirm();
                  await handleResetConfig(configId, currentListingParamsRef.current);
                },
              });
            }}
            onClearFavoritesForConfig={(configId) => {
              const cfg = configs.find(c => c.id === configId);
              const name = cfg?.name || cfg?.city || 'Agent';
              askConfirm({
                title: `Favoriten von "${name}" löschen?`,
                message: 'Alle als Favorit markierten Listings dieses Agenten werden zurückgesetzt.',
                confirm: 'Favoriten löschen',
                danger: true,
                onConfirm: async () => {
                  closeConfirm();
                  await handleClearFavoritesByConfig(configId);
                },
              });
            }}
            onClearBlacklistForConfig={(configId) => {
              const cfg = configs.find(c => c.id === configId);
              const name = cfg?.name || cfg?.city || 'Agent';
              askConfirm({
                title: `Blacklist von "${name}" leeren?`,
                message: 'Alle Blacklist-Einträge dieses Agenten werden entfernt.',
                confirm: 'Blacklist leeren',
                danger: true,
                onConfirm: async () => {
                  closeConfirm();
                  await handleClearBlacklistByConfig(configId);
                },
              });
            }}
            scraping={scraping}
            collapsed={agentSidebarCollapsed}
            onToggleCollapse={() => setAgentSidebarCollapsed(c => !c)}
          />

          <main className="main">
            {activeAgent && (
              <div className="active-agent-indicator" style={{ borderColor: (LISTING_TYPE_COLORS[activeAgent.listing_type] || {}).text }}>
                <div className="active-agent-info">
                  <span className="active-agent-name">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                    {activeAgent.name || activeAgent.city}
                  </span>
                  <div className="active-agent-details">
                    <span className="active-agent-badge" style={{ background: (LISTING_TYPE_COLORS[activeAgent.listing_type] || { bg: '#f3f4f6' }).bg, color: (LISTING_TYPE_COLORS[activeAgent.listing_type] || { text: '#374151' }).text }}>
                      {LISTING_TYPE_LABELS[activeAgent.listing_type] || activeAgent.listing_type}
                    </span>
                    <span className="active-agent-detail">
                      {providers.find(p => p.id === activeAgent.provider)?.name || activeAgent.provider}
                    </span>
                    {activeAgent.scrape_url && (
                      <span className="active-agent-url-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10" style={{ flexShrink: 0 }}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        <input
                          className="active-agent-url-input"
                          type="text"
                          readOnly
                          value={activeAgent.scrape_url}
                          title="Klicken um gesamte URL zu lesen / kopieren"
                          onClick={e => e.target.select()}
                        />
                      </span>
                    )}
                  </div>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => setActiveConfigId(null)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Alle anzeigen
                </button>
              </div>
            )}

            <FilterBar
              activeTab={activeTab} stats={activeConfigStats} listingTypeFilter={listingTypeFilter}
              tabCounts={tabCounts}
              searchQuery={searchQuery} minPrice={minPrice} maxPrice={maxPrice} minSize={minSize} minRooms={minRooms}
              publisherFilter={publisherFilter}
              onTabChange={setActiveTab} onListingTypeChange={setListingTypeFilter}
              onSearch={setSearchQuery} onMinPrice={setMinPrice} onMaxPrice={setMaxPrice} onMinSize={setMinSize} onMinRooms={setMinRooms}
              onPublisherFilter={setPublisherFilter}
              onReset={resetFilters}
            />

            <ListingsGrid
              listings={paginated} allCount={filtered.length} loading={loading}
              page={safePage} pages={pages} onPageChange={handlePageChange}
              onSeen={handleSeen} onFavorite={handleFavorite} onBlacklist={handleBlacklist} onUnblacklist={handleUnblacklist}
              onScrape={handleHeaderScrape}
              canScrape={canScrape}
              allFiltered={filtered} itemsPerPage={ITEMS_PER_PAGE}
              isBlacklistView={activeTab === TABS.BLACKLISTED}
            />

            <ScrapeLog runs={runs} />
          </main>
        </div>

        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onReset={() => handleReset(currentListingParamsRef.current)}
          showToast={showToast}
          onClearFavorites={() =>
            askConfirm({
              title: 'Alle Favoriten löschen?',
              message: 'Sämtliche als Favorit markierten Listings werden zurückgesetzt.',
              confirm: 'Alle Favoriten löschen',
              danger: true,
              onConfirm: async () => { closeConfirm(); await handleClearFavorites(); },
            })
          }
          onClearBlacklist={() =>
            askConfirm({
              title: 'Gesamte Blacklist leeren?',
              message: 'Alle Blacklist-Einträge werden dauerhaft entfernt.',
              confirm: 'Blacklist leeren',
              danger: true,
              onConfirm: async () => { closeConfirm(); await handleClearBlacklist(); },
            })
          }
        />
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirm={confirmDialog.confirm}
          danger={confirmDialog.danger}
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeConfirm}
        />

        <div className="toast-container">
          {toasts.map(t => <Toast key={t.id} msg={t.msg} type={t.type} />)}
        </div>
      </div>
    </ErrorBoundary>
  );
}
