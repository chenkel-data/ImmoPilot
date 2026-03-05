import { useState, useCallback } from 'react';
import { api } from '../api.js';

export function useRuns() {
  const [runs, setRuns] = useState([]);

  const loadRuns = useCallback(async () => {
    try {
      const data = await api.listings.getRuns();
      setRuns(data);
      return data;
    } catch {
      return [];
    }
  }, []);

  return { runs, loadRuns };
}
