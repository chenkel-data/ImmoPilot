import { useState, useEffect, useRef, useCallback } from 'react';
import ListingCard from './ListingCard.jsx';
import Pagination from './Pagination.jsx';
import { api } from '../api.js';

function preloadImages(urls) {
  for (const url of urls) { const img = new Image(); img.src = url; }
}

export default function ListingsGrid({
  listings, allCount, loading, page, pages, onPageChange,
  onSeen, onFavorite, onBlacklist, onUnblacklist, onScrape,
  canScrape, allFiltered, itemsPerPage, isBlacklistView,
}) {
  const [imageCache, setImageCache] = useState({});
  const fetchedRef = useRef(new Set());

  const batchFetchImages = useCallback(async (listingsToFetch) => {
    const needFetch = listingsToFetch.filter(l => {
      if (fetchedRef.current.has(l.id)) return false;
      try { const cached = l.images ? JSON.parse(l.images) : null; if (cached?.length) { setImageCache(prev => ({ ...prev, [l.id]: cached })); preloadImages([cached[0]]); fetchedRef.current.add(l.id); return false; } } catch {}
      return true;
    });
    if (needFetch.length === 0) return;
    for (const l of needFetch) fetchedRef.current.add(l.id);
    try {
      const { results } = await api.listings.batchImages(needFetch.map(l => l.id));
      if (results) { setImageCache(prev => ({ ...prev, ...results })); for (const imgs of Object.values(results)) { if (imgs?.[0]) preloadImages([imgs[0]]); } }
    } catch {}
  }, []);

  useEffect(() => { if (listings.length > 0) batchFetchImages(listings); }, [listings, batchFetchImages]);

  useEffect(() => {
    if (!allFiltered || !itemsPerPage || page >= pages) return;
    const next = allFiltered.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    if (next.length > 0) { const t = setTimeout(() => batchFetchImages(next), 300); return () => clearTimeout(t); }
  }, [page, pages, allFiltered, itemsPerPage, batchFetchImages]);

  if (loading) return <div className="grid-state"><div className="spinner" /><p>Lade Anzeigen…</p></div>;

  if (allCount === 0) return (
    <div className="grid-state">
      <div className="empty-illustration">
        <svg viewBox="0 0 120 120" fill="none" className="empty-svg">
          <circle cx="60" cy="60" r="50" fill="var(--primary-50)" />
          <path d="M40 65 L60 45 L80 65 L80 85 L40 85 Z" fill="var(--surface)" stroke="var(--primary-500)" strokeWidth="2"/>
          <rect x="53" y="70" width="14" height="15" rx="2" fill="var(--primary-50)" stroke="var(--primary-500)" strokeWidth="1.5"/>
          <path d="M35 67 L60 42 L85 67" fill="none" stroke="var(--primary-500)" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
      <h2 className="empty-title">Keine Anzeigen gefunden</h2>
      <p className="empty-sub">Erstelle eine Suchkonfiguration und starte einen Scraping-Lauf.</p>
      <button className="btn btn--primary btn--lg" onClick={onScrape} disabled={!canScrape}>
        {canScrape ? 'Jetzt scrapen' : 'Kein aktiver Agent'}
      </button>
    </div>
  );

  return (
    <div className="grid-section">
      <div className="grid-info-bar">
        <p className="grid-info"><strong>{allCount}</strong> Ergebnis{allCount !== 1 ? 'se' : ''} <span className="grid-info-sep">·</span> Seite {page}/{pages}</p>
        <Pagination page={page} pages={pages} onChange={onPageChange} />
      </div>
      <div className="listings-grid listings-grid--compact">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} onSeen={onSeen} onFavorite={onFavorite} onBlacklist={onBlacklist} onUnblacklist={onUnblacklist} prefetchedImages={imageCache[l.id] || null} isBlacklistView={isBlacklistView} />
        ))}
      </div>
      {pages > 1 && <div className="grid-pagination-bottom"><Pagination page={page} pages={pages} onChange={onPageChange} /></div>}
    </div>
  );
}
