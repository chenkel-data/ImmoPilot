import { memo, useState, useCallback } from 'react';
import { formatListingDate, isValidImageUrl } from '../utils/formatting.js';
import { LISTING_TYPE_LABELS, LISTING_TYPE_COLORS } from '../constants.js';

const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" className="heart-svg" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const BlacklistIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
);

const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="chev-icon"><polyline points="15 18 9 12 15 6"/></svg>
);
const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="chev-icon"><polyline points="9 18 15 12 9 6"/></svg>
);

const ListingCard = memo(function ListingCard({ listing: l, onSeen, onFavorite, onBlacklist, onUnblacklist, prefetchedImages, isBlacklistView }) {
  const isNew = !l.is_seen;
  const upgradeUrl = (u) => u ? u.replace('/thumbs/images/', '/images/').replace(/s-l\d+\./, 's-l1600.') : u;

  const resolveImages = () => {
    if (prefetchedImages?.length) return prefetchedImages;
    try { const cached = l.images ? JSON.parse(l.images) : null; if (cached?.length) return cached; } catch {}
    const img = isValidImageUrl(l.image) ? upgradeUrl(l.image) : null;
    return img ? [img] : [];
  };

  const resolvedImages = resolveImages();
  const [imgIdx, setImgIdx] = useState(0);

  const goNext = useCallback((e) => { e.stopPropagation(); e.preventDefault(); setImgIdx(i => (i + 1) % Math.max(resolvedImages.length, 1)); }, [resolvedImages.length]);
  const goPrev = useCallback((e) => { e.stopPropagation(); e.preventDefault(); setImgIdx(i => (i - 1 + Math.max(resolvedImages.length, 1)) % Math.max(resolvedImages.length, 1)); }, [resolvedImages.length]);

  const handleFav = (e) => { e.stopPropagation(); e.preventDefault(); onFavorite(l.id); };
  const handleBlacklist = (e) => { e.stopPropagation(); e.preventDefault(); isBlacklistView ? onUnblacklist?.(l.id) : onBlacklist?.(l.id); };
  const handleOpen = () => { if (!l.is_seen) onSeen(l.id); };

  const currentImg = resolvedImages[imgIdx] ?? null;
  const typeColors = LISTING_TYPE_COLORS[l.listing_type] || { bg: '#f3f4f6', text: '#374151' };

  return (
    <article className={`card ${isNew ? 'card--new' : ''} ${l.is_seen ? 'card--seen' : ''} ${l.is_blacklisted ? 'card--blacklisted' : ''}`}>
      <div className="card-img">
        {currentImg ? (
          <img key={currentImg} src={currentImg} alt="" decoding="async" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <div className="card-img-placeholder">🏠</div>
        )}
        {resolvedImages.length > 1 && currentImg && (
          <>
            <button className="carousel-btn carousel-btn--prev" onClick={goPrev}><ChevronLeft /></button>
            <button className="carousel-btn carousel-btn--next" onClick={goNext}><ChevronRight /></button>
          </>
        )}
        {resolvedImages.length > 1 && (
          <span className="carousel-counter">{imgIdx + 1}/{resolvedImages.length}</span>
        )}

        <div className="card-actions-overlay">
          <button className={`card-fav-btn ${l.is_favorite ? 'card-fav-btn--active' : ''}`} onClick={handleFav} title={l.is_favorite ? 'Favorit entfernen' : isBlacklistView ? 'Als Favorit (von Blacklist entfernen)' : 'Als Favorit'}>
            <HeartIcon filled={l.is_favorite} />
          </button>
          <button className={`card-blacklist-btn ${l.is_blacklisted ? 'card-blacklist-btn--active' : ''}`} onClick={handleBlacklist} title={isBlacklistView ? 'Von Blacklist entfernen' : 'Blacklisten'}>
            <BlacklistIcon />
          </button>
        </div>

        {isNew && !isBlacklistView && <span className="card-badge card-badge--new">Neu</span>}
        <span className="card-badge card-badge--type" style={{ background: typeColors.bg, color: typeColors.text }}>
          {LISTING_TYPE_LABELS[l.listing_type] || l.listing_type}
        </span>
      </div>

      <div className="card-body">
        <div className="card-meta">
          <span className="card-price">{l.price || '— €'}</span>
          <div className="card-pills">
            {l.size && <span className="pill pill--size">{l.size}</span>}
            {l.rooms && <span className="pill pill--rooms">{l.rooms}</span>}
          </div>
        </div>
        <h2 className="card-title">{l.title}</h2>
        {l.address && (
          <p className="card-address">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="addr-icon"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {l.address}
          </p>
        )}
        {l.description && <p className="card-desc">{l.description}</p>}
      </div>

      <div className="card-footer">
        <div className="card-dates">
          <span className="card-date">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="date-icon"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {formatListingDate(l.first_seen)}
          </span>
          {l.publisher && (
            <span className="card-date card-date--publisher" title={l.publisher}>
              {l.publisher}
            </span>
          )}
        </div>
        <a href={l.link} target="_blank" rel="noopener noreferrer" className="card-open-btn" onClick={handleOpen}>
          Öffnen
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="open-icon"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
        </a>
      </div>
    </article>
  );
});

export default ListingCard;
