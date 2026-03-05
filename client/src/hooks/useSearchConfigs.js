import { useState, useCallback } from 'react';
import { api } from '../api.js';

export function useSearchConfigs(showToast) {
  const [configs, setConfigs] = useState([]);
  const [providers, setProviders] = useState([]);

  const loadConfigs = useCallback(async () => {
    try {
      const data = await api.configs.getAll();
      setConfigs(data);
      return data;
    } catch (e) {
      showToast?.(`Fehler: ${e.message}`, 'error');
      return [];
    }
  }, [showToast]);

  const loadProviders = useCallback(async () => {
    try {
      const data = await api.scrape.getProviders();
      setProviders(data);
      return data;
    } catch {
      return [];
    }
  }, []);

  const addConfig = useCallback(async (data) => {
    try {
      const created = await api.configs.create(data);
      setConfigs((prev) => [created, ...prev]);
      showToast?.('Suchkonfiguration erstellt', 'success');
      return created;
    } catch (e) {
      showToast?.(`Fehler: ${e.message}`, 'error');
      return null;
    }
  }, [showToast]);

  const editConfig = useCallback(async (id, data) => {
    try {
      const updated = await api.configs.update(id, data);
      setConfigs((prev) => prev.map((c) => (c.id === id ? updated : c)));
      showToast?.('Gespeichert', 'success');
      return updated;
    } catch (e) {
      showToast?.(`Fehler: ${e.message}`, 'error');
      return null;
    }
  }, [showToast]);

  const removeConfig = useCallback(async (id) => {
    try {
      await api.configs.delete(id);
      setConfigs((prev) => prev.filter((c) => c.id !== id));
      showToast?.('Gelöscht', 'info');
    } catch (e) {
      showToast?.(`Fehler: ${e.message}`, 'error');
    }
  }, [showToast]);

  const toggleConfig = useCallback(async (id) => {
    const cfg = configs.find((c) => c.id === id);
    if (!cfg) return;
    await editConfig(id, { enabled: !cfg.enabled });
  }, [configs, editConfig]);

  return { configs, providers, loadConfigs, loadProviders, addConfig, editConfig, removeConfig, toggleConfig };
}
