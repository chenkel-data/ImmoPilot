import { useEffect, useState } from 'react';

const ICONS = {
  info: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="toast-icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>),
  success: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="toast-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>),
  error: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="toast-icon"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>),
};

export default function Toast({ msg, type = 'info' }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(t); }, []);
  return (
    <div className={`toast toast--${type} ${visible ? 'toast--visible' : ''}`}>
      {ICONS[type] || ICONS.info}
      <span className="toast-msg">{msg}</span>
    </div>
  );
}
