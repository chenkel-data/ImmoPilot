function buildRange(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  if (cur > 3) out.push('…');
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) out.push(p);
  if (cur < total - 2) out.push('…');
  out.push(total);
  return out;
}

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav className="pagination">
      <button className="page-btn" disabled={page === 1} onClick={() => onChange(page - 1)}>‹</button>
      {buildRange(page, pages).map((p, i) =>
        p === '…' ? <span key={`e${i}`} className="page-ellipsis">…</span> : (
          <button key={p} className={`page-btn ${p === page ? 'page-btn--active' : ''}`} onClick={() => onChange(p)}>{p}</button>
        )
      )}
      <button className="page-btn" disabled={page === pages} onClick={() => onChange(page + 1)}>›</button>
    </nav>
  );
}
