export default function Header({ scraping, scrapeProgress, unseenCount, canScrape, onScrape, onScrapeAll, onStop, onMarkAllSeen, onToggleSidebar, onNavigateHome, activeConfigId, activeAgentName }) {
  const progressPct = scrapeProgress?.totalPages > 0
    ? Math.round((scrapeProgress.pagesScraped / scrapeProgress.totalPages) * 100)
    : 0;

  const progressText = scrapeProgress?.currentConfigName
    ? (scrapeProgress.totalConfigs > 1
      ? `${scrapeProgress.currentConfigName} (${scrapeProgress.currentConfig}/${scrapeProgress.totalConfigs}) · Seite ${scrapeProgress.pagesScraped}/${scrapeProgress.totalPages}`
      : `${scrapeProgress.currentConfigName} · Seite ${scrapeProgress.pagesScraped}/${scrapeProgress.totalPages}`)
    : scrapeProgress?.totalConfigs > 1
      ? `Agent ${scrapeProgress.currentConfig}/${scrapeProgress.totalConfigs} · Seite ${scrapeProgress.pagesScraped}/${scrapeProgress.totalPages}`
      : scrapeProgress?.totalPages
        ? `Seite ${scrapeProgress.pagesScraped}/${scrapeProgress.totalPages}`
        : 'Starte…';


  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand" onClick={onNavigateHome} style={{ cursor: 'pointer' }} title="Zur Startseite">
          <div className="header-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="logo-icon">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
          </div>
          <div>
            <h1 className="header-title">ImmoPilot</h1>
            <span className="header-subtitle">Die neue intelligente Art der Wohnungssuche</span>
          </div>
        </div>

        <div className="header-actions">
          {scraping && (
            <span className="scrape-badge">
              <span className="scrape-dot" />
              <span className="scrape-info">
                <span className="scrape-text">{progressText}</span>
                {scrapeProgress?.totalPages > 0 && (
                  <span className="scrape-progress-bar">
                    <span className="scrape-progress-fill" style={{ width: `${progressPct}%` }} />
                  </span>
                )}
              </span>
            </span>
          )}

          {!scraping ? (
            <>
              <button className="btn btn--ghost-light" onClick={onScrape} disabled={!canScrape} title={!canScrape ? 'Kein aktiver Agent vorhanden' : undefined}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="btn-icon">
                  <path d="M1 4v6h6M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
                <span className="btn-label-desktop">{activeConfigId ? (activeAgentName || 'Agent scrapen') : 'Alle Agenten'}</span>
              </button>
              {activeConfigId && onScrapeAll && (
                <button className="btn btn--ghost-light" onClick={onScrapeAll} title="Alle Agenten scrapen">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="btn-icon">
                    <path d="M1 4v6h6M23 20v-6h-6" />
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                  </svg>
                  <span className="btn-label-desktop">Alle Agenten</span>
                </button>
              )}
            </>
          ) : (
            <button className="btn btn--danger" onClick={onStop}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="btn-icon">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
              <span className="btn-label-desktop">Stoppen</span>
            </button>
          )}

          {unseenCount > 0 && (
            <button className="btn btn--ghost-light" onClick={onMarkAllSeen} title="Alle als gelesen markieren">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span className="btn-label-desktop">Alle gelesen</span>
            </button>
          )}

          <button className="btn btn--icon" onClick={onToggleSidebar} title="Einstellungen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
