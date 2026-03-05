import { useState } from 'react';
import { LISTING_TYPE_LABELS } from '../constants.js';

function fmtDur(r) {
  if (!r.ended_at) return '…';
  const s = Math.round((new Date(r.ended_at) - new Date(r.started_at)) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

const STATUS = {
  success: { cls: 'badge--success', label: 'Erfolg', icon: '✓' },
  error:   { cls: 'badge--error',   label: 'Fehler', icon: '✕' },
  running: { cls: 'badge--running', label: 'Läuft',  icon: '⟳' },
};

export default function ScrapeLog({ runs }) {
  const [expanded, setExpanded] = useState(false);
  if (!runs.length) return null;
  const displayRuns = expanded ? runs : runs.slice(0, 5);

  return (
    <section className="log-section">
      <div className="log-header">
        <h2 className="log-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="log-title-icon"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>
          Scraping-Verlauf
        </h2>
        <span className="log-count">{runs.length} Läufe</span>
      </div>
      <div className="log-table-wrap">
        <table className="log-table">
          <thead><tr><th>Provider</th><th>Typ</th><th>Gestartet</th><th>Dauer</th><th>Status</th><th>Neu</th><th>Gesamt</th></tr></thead>
          <tbody>
            {displayRuns.map((r) => {
              const s = STATUS[r.status] ?? STATUS.running;
              return (
                <tr key={r.id}>
                  <td><span className="source-label">{r.provider || r.source}</span></td>
                  <td>{LISTING_TYPE_LABELS[r.listing_type] || r.listing_type || '—'}</td>
                  <td>{new Date(r.started_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td><span className="duration-label">{fmtDur(r)}</span></td>
                  <td><span className={`status-badge ${s.cls}`}><span className="status-icon">{s.icon}</span>{s.label}</span>{r.error && <span className="log-error">{r.error}</span>}</td>
                  <td>{r.new_count ?? '—'}</td>
                  <td>{r.total_count ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {runs.length > 5 && (
        <button className="btn btn--ghost btn--sm log-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Weniger anzeigen' : `Alle ${runs.length} Läufe`}
        </button>
      )}
    </section>
  );
}
