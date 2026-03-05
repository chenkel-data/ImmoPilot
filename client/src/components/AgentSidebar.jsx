import { useState, useEffect } from 'react';
import { LISTING_TYPE_LABELS, LISTING_TYPE_COLORS, inferListingTypeFromUrl } from '../constants.js';

// ── Agent Card ─────────────────────────────────────────────────────────────────

function AgentCard({ config, providers, isSelected, stats, onSelect, onToggle, onEdit, onDelete, onScrapeConfig, onResetConfig, onClearFavorites, onClearBlacklist, scraping }) {
  const colors = LISTING_TYPE_COLORS[config.listing_type] || { bg: '#f3f4f6', text: '#374151' };
  const total = stats?.total ?? 0;
  const unseen = stats?.unseen ?? 0;
  const favorites = stats?.favorites ?? 0;
  const displayName = config.name || config.city;

  return (
    <div
      className={`agent-card ${isSelected ? 'agent-card--active' : ''} ${!config.enabled ? 'agent-card--disabled' : ''}`}
      onClick={() => onSelect(config.id)}
      style={isSelected ? { borderLeftColor: colors.text, background: colors.bg, borderColor: colors.text } : {}}
    >
      <div className="agent-card-header">
        <div className="agent-card-title-row">
          <button
            className="agent-toggle"
            onClick={(e) => { e.stopPropagation(); onToggle(config.id); }}
            title={config.enabled ? 'Deaktivieren' : 'Aktivieren'}
          >
            <span className="agent-toggle-dot" style={{ background: config.enabled ? colors.text : '#9ca3af' }} />
          </button>
          <span className="agent-card-city">{displayName}</span>
        </div>
        <div className="agent-card-actions">
          <button className="agent-action" onClick={(e) => { e.stopPropagation(); onScrapeConfig(config.id); }} disabled={scraping || !config.enabled} title="Scrapen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="13" height="13">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
          </button>
          <button className="agent-action" onClick={(e) => { e.stopPropagation(); onEdit(config); }} title="Bearbeiten">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button className="agent-action" onClick={(e) => { e.stopPropagation(); onResetConfig(config.id); }} title="Listings dieses Agents löschen (Favoriten behalten)" aria-label="Agent-Listings zurücksetzen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <path d="M16 3l5 5L8 21H3v-5L16 3z" />
              <path d="M15 7l2 2" />
            </svg>
          </button>
          <button className="agent-action" onClick={(e) => { e.stopPropagation(); onClearFavorites(config.id); }} title="Favoriten dieses Agenten löschen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              <line x1="2" y1="2" x2="22" y2="22"/>
            </svg>
          </button>
          <button className="agent-action" onClick={(e) => { e.stopPropagation(); onClearBlacklist(config.id); }} title="Blacklist-Einträge dieses Agenten leeren">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
          </button>
          <button className="agent-action agent-action--danger" onClick={(e) => { e.stopPropagation(); onDelete(config.id); }} title="Agent löschen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="agent-card-meta">
        <span className="agent-card-type" style={{ background: isSelected ? 'rgba(255,255,255,.7)' : colors.bg, color: colors.text }}>
          {LISTING_TYPE_LABELS[config.listing_type] || config.listing_type}
        </span>
      </div>

      <div className="agent-card-stats">
        <span className="agent-stat" title="Gesamt (nach Blacklist)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          {total}
        </span>
        {unseen > 0 && (
          <span className="agent-stat agent-stat--new" style={{ color: colors.text }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {unseen} neu
          </span>
        )}
        <span className="agent-stat" title="Favoriten">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {favorites}
        </span>
      </div>
    </div>
  );
}

// ── Agent Form ─────────────────────────────────────────────────────────────────

function AgentForm({ providers, editingConfig, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    provider: 'kleinanzeigen',
    listingType: 'miete',
    maxPages: 10,
    directUrl: '',
  });

  useEffect(() => {
    if (editingConfig) {
      let extraParams = {};
      try { extraParams = JSON.parse(editingConfig.extra_params || '{}'); } catch {}
      setFormData({
        name: editingConfig.name || '',
        provider: editingConfig.provider,
        listingType: editingConfig.listing_type,
        maxPages: editingConfig.max_pages,
        directUrl: extraParams.directUrl || editingConfig.scrape_url || '',
      });
    } else {
      setFormData({ name: '', provider: 'kleinanzeigen', listingType: 'miete', maxPages: 10, directUrl: '' });
    }
  }, [editingConfig]);

  const inferred = inferListingTypeFromUrl(formData.directUrl.trim());
  const effectiveType = inferred?.type || formData.listingType;
  const effectiveProvider = inferred?.provider || formData.provider;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.directUrl.trim()) return;
    await onSubmit({
      name: formData.name.trim(),
      provider: effectiveProvider,
      listingType: effectiveType,
      maxPages: formData.maxPages,
      directUrl: formData.directUrl.trim(),
    });
  };

  return (
    <form className="agent-form" onSubmit={handleSubmit}>
      <h3 className="agent-form-title">{editingConfig ? 'Agent bearbeiten' : 'Neuer Suchagent'}</h3>

      <div className="agent-form-field">
        <label className="agent-form-label">Name</label>
        <input
          className="agent-input"
          type="text"
          placeholder="z.B. Frankfurt Mietwohnungen"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <span className="agent-form-hint">Optionaler Name zur besseren Übersicht</span>
      </div>

      <div className="agent-form-field">
        <label className="agent-form-label">Scrape-URL</label>
        <input
          className="agent-input"
          type="url"
          placeholder="https://www.kleinanzeigen.de/s-wohnung-mieten/..."
          value={formData.directUrl}
          onChange={(e) => {
            const directUrl = e.target.value;
            const detected = inferListingTypeFromUrl(directUrl.trim());
            setFormData({
              ...formData,
              directUrl,
              ...(detected ? { listingType: detected.type, provider: detected.provider } : {}),
            });
          }}
          required
        />
        <span className="agent-form-hint">Direkte Such-URL vom Anbieter einfügen</span>
        <div className="agent-form-detected">
          {inferred ? (
            <span className="agent-form-detected-ok">
              Erkannter Typ:
              <span className="agent-form-type-badge" style={{
                background: (LISTING_TYPE_COLORS[effectiveType] || { bg: '#f3f4f6' }).bg,
                color: (LISTING_TYPE_COLORS[effectiveType] || { text: '#374151' }).text,
              }}>
                {LISTING_TYPE_LABELS[effectiveType] || effectiveType}
              </span>
            </span>
          ) : (
            <span className="agent-form-detected-fallback">Typ wird beim Speichern aus der URL abgeleitet.</span>
          )}
        </div>
      </div>

      <div className="agent-form-row">
        <div className="agent-form-field">
          <label className="agent-form-label">Anbieter</label>
          <select className="agent-select" value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })}>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="agent-form-field">
        <label className="agent-form-label">Max. Seiten</label>
        <input className="agent-input agent-input--sm" type="number" min="1" max="100" value={formData.maxPages} onChange={(e) => setFormData({ ...formData, maxPages: Number(e.target.value) })} />
      </div>

      <div className="agent-form-actions">
        <button type="submit" className="btn btn--primary btn--sm btn--full">
          {editingConfig ? 'Speichern' : 'Agent erstellen'}
        </button>
        <button type="button" className="btn btn--ghost btn--sm btn--full" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}

// ── Agent Sidebar (Left Panel) ─────────────────────────────────────────────────

export default function AgentSidebar({
  configs, providers, configStats, orphanStats, globalStats, activeConfigId,
  onSelectConfig, onAdd, onEdit, onDelete, onToggle,
  onScrapeConfig, onResetConfig, onClearFavoritesForConfig, onClearBlacklistForConfig,
  scraping, collapsed, onToggleCollapse,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);

  const startEdit = (cfg) => {
    setEditingConfig(cfg);
    setShowForm(true);
  };

  const startAdd = () => {
    setEditingConfig(null);
    setShowForm(true);
  };

  const handleSubmit = async (data) => {
    if (editingConfig) {
      await onEdit(editingConfig.id, data);
    } else {
      await onAdd(data);
    }
    setShowForm(false);
    setEditingConfig(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingConfig(null);
  };

  return (
    <aside className={`agent-sidebar ${collapsed ? 'agent-sidebar--collapsed' : ''}`}>
      <div className="agent-sidebar-header">
        {!collapsed && (
          <>
            <div className="agent-sidebar-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <span>Suchagenten</span>
              <span className="agent-sidebar-count">{configs.length}</span>
            </div>
          </>
        )}
        <button
          className="agent-sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Sidebar einblenden' : 'Sidebar ausblenden'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            {collapsed
              ? <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><polyline points="14 9 17 12 14 15"/></>
              : <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><polyline points="16 9 13 12 16 15"/></>
            }
          </svg>
        </button>
      </div>

      {collapsed ? (
        <div className="agent-sidebar-collapsed-icons">
          <button
            className={`agent-collapsed-icon ${activeConfigId === null ? 'agent-collapsed-icon--active' : ''}`}
            onClick={() => onSelectConfig(null)}
            title="Alle"
            style={activeConfigId === null ? { borderColor: '#6366f1', background: '#eef2ff' } : {}}
          >
            <span className="agent-collapsed-letter" style={{ color: activeConfigId === null ? '#6366f1' : undefined }}>✱</span>
            {(globalStats?.unseen ?? 0) > 0 && (
              <span className="agent-collapsed-badge" style={{ background: '#6366f1' }}>{globalStats.unseen}</span>
            )}
          </button>
          {configs.map(c => {
            const colors = LISTING_TYPE_COLORS[c.listing_type] || { bg: '#f3f4f6', text: '#374151' };
            const isActive = activeConfigId === c.id;
            return (
              <button
                key={c.id}
                className={`agent-collapsed-icon ${isActive ? 'agent-collapsed-icon--active' : ''} ${!c.enabled ? 'agent-collapsed-icon--disabled' : ''}`}
                onClick={() => onSelectConfig(c.id)}
                title={`${c.name || c.city} · ${LISTING_TYPE_LABELS[c.listing_type] || c.listing_type}`}
                style={isActive ? { borderColor: colors.text, background: colors.bg } : {}}
              >
                <span className="agent-collapsed-letter" style={{ color: isActive ? colors.text : undefined }}>
                  {(c.name || c.city).charAt(0).toUpperCase()}
                </span>
                {(configStats[c.id]?.unseen ?? 0) > 0 && (
                  <span className="agent-collapsed-badge" style={{ background: colors.text }}>{configStats[c.id].unseen}</span>
                )}
              </button>
            );
          })}
          <button className="agent-collapsed-add" onClick={() => { onToggleCollapse(); setTimeout(startAdd, 100); }} title="Agent hinzufügen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      ) : (
        <div className="agent-sidebar-body">
          <div className="agent-list">
            {/* "Alle" Eintrag – zeigt globale Stats */}
            <div
              className={`agent-card agent-card--all ${activeConfigId === null ? 'agent-card--active' : ''}`}
              onClick={() => onSelectConfig(null)}
              style={activeConfigId === null ? { borderLeftColor: '#6366f1', background: '#eef2ff', borderColor: '#6366f1' } : {}}
            >
              <div className="agent-card-header">
                <div className="agent-card-title-row">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ flexShrink: 0 }}>
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  <span className="agent-card-city">Alle</span>
                </div>
              </div>
              <div className="agent-card-stats">
                <span className="agent-stat" title="Gesamt">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  {globalStats?.total ?? 0}
                </span>
                {(globalStats?.unseen ?? 0) > 0 && (
                  <span className="agent-stat agent-stat--new" style={{ color: '#6366f1' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {globalStats.unseen} neu
                  </span>
                )}
                <span className="agent-stat" title="Favoriten">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {globalStats?.favorites ?? 0}
                </span>
              </div>
            </div>

            {configs.map(c => (
              <AgentCard
                key={c.id}
                config={c}
                providers={providers}
                isSelected={activeConfigId === c.id}
                stats={configStats[c.id]}
                onSelect={onSelectConfig}
                onToggle={onToggle}
                onEdit={startEdit}
                onDelete={onDelete}
                onScrapeConfig={onScrapeConfig}
                onResetConfig={onResetConfig}
                onClearFavorites={onClearFavoritesForConfig}
                onClearBlacklist={onClearBlacklistForConfig}
                scraping={scraping}
              />
            ))}
          </div>

          {showForm ? (
            <AgentForm
              providers={providers}
              editingConfig={editingConfig}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          ) : (
            <button className="agent-add-btn" onClick={startAdd}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Agent hinzufügen
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
