import { useState, useCallback, useRef } from 'react';
import { api } from '../api.js';
import { SCRAPE_STATUS_POLLING_INTERVAL } from '../constants.js';

export function useScraper(showToast, onScraperComplete) {
  const [scraping, setScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState({ pagesScraped: 0, totalPages: 0, currentConfig: 0, totalConfigs: 0, currentConfigName: '' });
  const pollRef = useRef(null);

  const startScraping = useCallback(async () => {
    if (scraping) return;
    setScraping(true);
    showToast?.('Scraping gestartet…', 'info');
    try {
      await api.scrape.start();
      clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.scrape.status();
          setScrapeProgress({
            pagesScraped: status.pagesScraped ?? 0,
            totalPages: status.totalPages ?? 0,
            currentConfig: status.currentConfig ?? 0,
            totalConfigs: status.totalConfigs ?? 0,
            currentConfigName: status.currentConfigName ?? '',
          });
          if (!status.running) {
            clearInterval(pollRef.current);
            setScraping(false);
            setScrapeProgress({ pagesScraped: 0, totalPages: 0, currentConfig: 0, totalConfigs: 0, currentConfigName: '' });
            showToast?.('Scraping abgeschlossen!', 'success');
            onScraperComplete?.();
          }
        } catch {
          clearInterval(pollRef.current);
          setScraping(false);
          setScrapeProgress({ pagesScraped: 0, totalPages: 0, currentConfig: 0, totalConfigs: 0, currentConfigName: '' });
        }
      }, SCRAPE_STATUS_POLLING_INTERVAL);
    } catch (e) {
      setScraping(false);
      showToast?.(`Fehler: ${e.message}`, 'error');
    }
  }, [scraping, showToast, onScraperComplete]);

  const startScrapingConfig = useCallback(async (configId) => {
    if (scraping) return;
    setScraping(true);
    showToast?.('Scraping gestartet…', 'info');
    try {
      await api.scrape.startConfig(configId);
      clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.scrape.status();
          setScrapeProgress({
            pagesScraped: status.pagesScraped ?? 0,
            totalPages: status.totalPages ?? 0,
            currentConfig: status.currentConfig ?? 0,
            totalConfigs: status.totalConfigs ?? 0,
            currentConfigName: status.currentConfigName ?? '',
          });
          if (!status.running) {
            clearInterval(pollRef.current);
            setScraping(false);
            setScrapeProgress({ pagesScraped: 0, totalPages: 0, currentConfig: 0, totalConfigs: 0, currentConfigName: '' });
            showToast?.('Scraping abgeschlossen!', 'success');
            onScraperComplete?.();
          }
        } catch {
          clearInterval(pollRef.current);
          setScraping(false);
          setScrapeProgress({ pagesScraped: 0, totalPages: 0, currentConfig: 0, totalConfigs: 0, currentConfigName: '' });
        }
      }, SCRAPE_STATUS_POLLING_INTERVAL);
    } catch (e) {
      setScraping(false);
      showToast?.(`Fehler: ${e.message}`, 'error');
    }
  }, [scraping, showToast, onScraperComplete]);

  const stopScraping = useCallback(async () => {
    try {
      await api.scrape.stop();
      showToast?.('Scraping wird gestoppt…', 'info');
      // Polling weiterlaufen lassen – es erkennt running=false vom Server
      // und setzt scraping korrekt zurück.
    } catch (e) {
      showToast?.(`Fehler: ${e.message}`, 'error');
    }
  }, [showToast]);

  const cleanup = useCallback(() => {
    clearInterval(pollRef.current);
  }, []);

  return { scraping, scrapeProgress, startScraping, startScrapingConfig, stopScraping, cleanup };
}
