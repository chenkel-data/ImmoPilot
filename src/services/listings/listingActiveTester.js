/*
 * Prüft ob eine Kleinanzeigen-Anzeige noch aktiv ist.
 * Navigiert zur Detailseite und sucht nach Indikatoren dass die Anzeige
 * gelöscht / deaktiviert wurde.
 */

/**
 * @param {import('playwright').Page} page  – bereits geöffnete Playwright-Seite
 * @param {string} link                     – vollständige URL der Anzeige
 * @returns {Promise<boolean>}
 */
export default async function checkIfListingIsActive(page, link) {
  try {
    const response = await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 15_000 });

    // HTTP-Fehler → inaktiv
    if (!response || response.status() >= 400) return false;

    const url = page.url();

    // Weitergeleitet zur Suchseite oder Startseite → inaktiv
    if (url.includes('/s-') || url === 'https://www.kleinanzeigen.de/') return false;

    // Anzeigen-Seite enthält spezifische "Anzeige nicht gefunden"-Texte
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const inactiveKeywords = [
      'Anzeige nicht gefunden',
      'Diese Anzeige existiert nicht mehr',
      'wurde bereits verkauft',
      'Anzeige wurde deaktiviert',
    ];
    for (const kw of inactiveKeywords) {
      if (bodyText.includes(kw)) return false;
    }

    return true;
  } catch {
    // Im Fehlerfall als aktiv behandeln (lieber false-positive als falsch löschen)
    return true;
  }
}
