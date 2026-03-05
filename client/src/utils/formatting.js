/**
 * Utility-Funktionen für Formatierung
 */

/**
 * Parst eine Preisangabe oder Flächenangabe zu einer Nummer
 */
export function parseNum(str) {
  if (!str) return null;
  const m = String(str).replace(/\./g, '').match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

/**
 * Formatiert ein ISO-Datum als absolutes deutsches Datum mit Uhrzeit.
 * Ausgabe: "24. Feb. 2026, 08:58"
 */
export function formatListingDate(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  const datePart = date.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `${datePart}, ${hh}:${mm}`;
}

/**
 * Validiert ob ein Bild-URL gültig ist
 */
export function isValidImageUrl(imageUrl) {
  if (!imageUrl) return false;
  if (imageUrl.startsWith('//')) return false;
  if (imageUrl.includes('placeholder')) return false;
  if (imageUrl.startsWith('data:')) return false;
  return true;
}
