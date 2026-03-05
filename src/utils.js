/*
 * Utility-Funktionen für immo-app
 */

import crypto from 'crypto';

/**
 * Baut einen stabilen Hash aus mehreren Werten.
 * Wird als eindeutige Listing-ID verwendet.
 */
export function buildHash(...values) {
  const raw = values.map((v) => String(v ?? '')).join('|');
  return crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16);
}

/**
 * Entfernt alle Zeilenumbrüche aus einem String.
 */
export function removeNewline(s) {
  return typeof s === 'string' ? s.replace(/[\r\n]+/g, ' ') : s;
}

/**
 * Wartet die angegebene Anzahl Millisekunden.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gibt den aktuellen ISO-Timestamp zurück.
 */
export function now() {
  return new Date().toISOString();
}
