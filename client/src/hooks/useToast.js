/**
 * Custom Hook für Toast-Benachrichtigungen (mehrere gleichzeitig)
 */
import { useState, useCallback, useRef } from 'react';
import { TOAST_DURATION } from '../constants.js';

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const showToast = useCallback((msg, type = 'info') => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, msg, type }]);

    timersRef.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timersRef.current[id];
    }, TOAST_DURATION);

    return id;
  }, []);

  const hideToast = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, hideToast };
}
