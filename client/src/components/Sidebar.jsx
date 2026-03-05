import { useState, useEffect } from 'react';
import { api } from '../api.js';

function TagInput({ list, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const add = (val) => { const v = val.trim().replace(/,$/, ''); if (v && !list.includes(v)) onChange([...list, v]); };
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));
  return (
    <div className="tag-input-wrap">
      {list.map((t, i) => (
        <span key={i} className="tag">{t}<button className="tag-remove" onClick={() => remove(i)}>×</button></span>
      ))}
      <input className="tag-input" placeholder={placeholder} value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ',') && input.trim()) { e.preventDefault(); add(input); setInput(''); }
          else if (e.key === 'Backspace' && !input && list.length) { remove(list.length - 1); }
        }}
      />
    </div>
  );
}

export default function Sidebar({ open, onClose, onReset, onClearFavorites, onClearBlacklist, showToast }) {
  const [cfg, setCfg] = useState({ blacklistKeywords: [], blacklistedDistricts: [] });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (open) api.scrape.getConfig().then(setCfg).catch(() => {});
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.scrape.setConfig(cfg);
      showToast?.('Einstellungen gespeichert', 'success');
    } catch (e) {
      showToast?.(`Fehler: ${e.message}`, 'error');
    }
    setSaving(false);
  };

  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">Einstellungen</h2>
        <button className="sidebar-close" onClick={onClose}>×</button>
      </div>
      <div className="sidebar-body">
        <section className="s-section">
          <h3 className="s-heading">Blacklist – Stichwörter</h3>
          <p className="s-hint">Listings mit diesen Begriffen in Titel oder Beschreibung werden ausgeblendet.</p>
          <TagInput list={cfg.blacklistKeywords || []} onChange={(v) => setCfg({ ...cfg, blacklistKeywords: v })} placeholder="Begriff + Enter" />
        </section>
        <section className="s-section">
          <h3 className="s-heading">Blacklist – Stadtteile</h3>
          <p className="s-hint">Listings mit diesen Stadtteilen in der Adresse werden ausgeblendet.</p>
          <TagInput list={cfg.blacklistedDistricts || []} onChange={(v) => setCfg({ ...cfg, blacklistedDistricts: v })} placeholder="Stadtteil + Enter" />
        </section>
      </div>
      <div className="sidebar-footer">
        <button className="btn btn--primary btn--full" onClick={handleSave} disabled={saving}>{saving ? 'Speichert…' : 'Speichern'}</button>
        {!confirm ? (
          <button className="btn btn--ghost btn--full" onClick={() => setConfirm(true)} style={{ color: 'var(--danger-500)' }}>Listings zurücksetzen</button>
        ) : (
          <div className="reset-confirm">
            <p>Alle Listings löschen? Favoriten &amp; Blacklist bleiben erhalten.</p>
            <div className="reset-confirm-actions">
              <button className="btn btn--danger btn--sm" onClick={async () => { await onReset(); setConfirm(false); onClose(); }}>Ja, löschen</button>
              <button className="btn btn--ghost btn--sm" onClick={() => setConfirm(false)}>Abbrechen</button>
            </div>
          </div>
        )}
        {onClearFavorites && (
          <button className="btn btn--ghost btn--full" onClick={onClearFavorites} style={{ color: 'var(--danger-500)' }}>
            Alle Favoriten löschen
          </button>
        )}
        {onClearBlacklist && (
          <button className="btn btn--ghost btn--full" onClick={onClearBlacklist} style={{ color: 'var(--danger-500)' }}>
            Gesamte Blacklist leeren
          </button>
        )}
      </div>
    </aside>
  );
}
