import { useEffect, useRef } from 'react';

/**
 * ConfirmDialog – modaler Bestätigungs-Dialog
 *
 * Props:
 *   open       – boolean
 *   title      – Überschrift
 *   message    – Fließtext (kann auch JSX sein)
 *   confirm    – Text des Bestätigungs-Buttons (default: "Bestätigen")
 *   danger     – bool; färbt den Bestätigungs-Button rot
 *   onConfirm  – callback wenn bestätigt
 *   onCancel   – callback wenn abgebrochen / Backdrop-Click
 */
export default function ConfirmDialog({ open, title, message, confirm = 'Bestätigen', danger = false, onConfirm, onCancel }) {
  const dialogRef = useRef(null);

  // Focus trap: focus the Cancel-Button on open
  useEffect(() => {
    if (open) {
      const el = dialogRef.current?.querySelector('[data-autofocus]');
      el?.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="cdialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}>
      <div className="cdialog" ref={dialogRef} role="dialog" aria-modal="true">
        <div className="cdialog-header">
          <div className={`cdialog-icon-wrap ${danger ? 'cdialog-icon-wrap--danger' : 'cdialog-icon-wrap--warning'}`}>
            {danger ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M16 3l5 5L8 21H3v-5L16 3z"/>
                <path d="M15 7l2 2"/>
              </svg>
            )}
          </div>
          <h3 className="cdialog-title">{title}</h3>
        </div>

        {message && (
          <p className="cdialog-message">{message}</p>
        )}

        <div className="cdialog-actions">
          <button
            className="btn btn--ghost btn--sm"
            onClick={onCancel}
            data-autofocus
          >
            Abbrechen
          </button>
          <button
            className={`btn btn--sm ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
          >
            {confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
