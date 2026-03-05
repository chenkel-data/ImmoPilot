import { TABS, LISTING_TYPE_LABELS } from '../constants.js';

export default function FilterBar({
  activeTab, stats, listingTypeFilter,
  searchQuery, minPrice, maxPrice, minSize, minRooms,
  publisherFilter,
  tabCounts,
  onTabChange, onListingTypeChange, onSearch, onMinPrice, onMaxPrice, onMinSize, onMinRooms, onPublisherFilter, onReset,
}) {
  const hasFilters = searchQuery || minPrice || maxPrice || minSize || minRooms || publisherFilter;

  const tabs = [
    { id: TABS.ALL, label: 'Alle', count: stats.total, icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    )},
    { id: TABS.UNSEEN, label: 'Neu', count: stats.unseen, icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    )},
    { id: TABS.FAVORITES, label: 'Favoriten', count: stats.favorites, icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    )},
    { id: TABS.BLACKLISTED, label: 'Blacklist', count: stats.blacklisted, icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
    )},
  ];

  const effectiveTabs = tabs.map((t) => {
    const c = tabCounts?.[t.id];
    return typeof c === 'number' ? { ...t, count: c } : t;
  });

  const typeOptions = [
    { id: '', label: 'Alle Typen' },
    ...Object.entries(LISTING_TYPE_LABELS).map(([id, label]) => ({ id, label })),
  ];

  return (
    <div className="filter-bar">
      <nav className="tabs">
        {effectiveTabs.map((t) => (
          <button key={t.id} className={`tab ${activeTab === t.id ? 'tab--active' : ''}`} onClick={() => onTabChange(t.id)}>
            {t.icon}
            <span className="tab-text">{t.label}</span>
            {t.count > 0 && <span className="tab-badge">{t.count}</span>}
          </button>
        ))}
      </nav>

      <div className="filter-controls">
        <select className="filter-select" value={listingTypeFilter} onChange={(e) => onListingTypeChange(e.target.value)}>
          {typeOptions.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>

        <div className="search-wrap">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input type="search" className="input-search" placeholder="Suche…" value={searchQuery} onChange={(e) => onSearch(e.target.value)} />
        </div>

        <div className="filter-group">
          <label className="filter-label filter-label--range">
            <span className="filter-prefix">€</span>
            <input type="number" className="input-small" placeholder="min" min="0" step="50" value={minPrice} onChange={(e) => onMinPrice(e.target.value)} />
            <span className="filter-suffix--sep">–</span>
            <input type="number" className="input-small" placeholder="max" min="0" step="50" value={maxPrice} onChange={(e) => onMaxPrice(e.target.value)} />
          </label>
          <label className="filter-label">
            <input type="number" className="input-small" placeholder="m²" min="0" step="5" value={minSize} onChange={(e) => onMinSize(e.target.value)} />
            <span className="filter-suffix">m²+</span>
          </label>
          <label className="filter-label">
            <input type="number" className="input-small" placeholder="Zi." min="0" step="0.5" value={minRooms} onChange={(e) => onMinRooms(e.target.value)} />
            <span className="filter-suffix">Zi.+</span>
          </label>
        </div>

        <div className="search-wrap">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <input type="search" className="input-search" placeholder="Anbieter…" value={publisherFilter} onChange={(e) => onPublisherFilter(e.target.value)} />
        </div>

        {hasFilters && (
          <button className="btn btn--ghost btn--sm filter-reset" onClick={onReset}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
