# ImmoPilot

Wohnungssuche kostet unnötig viel Zeit – vor allem weil bei jeder neuen Suche dieselben Inserate wieder auftauchen. ImmoPilot merkt sich, was du bereits gesehen oder aussortiert hast, und filtert es beim nächsten Mal direkt raus. Mit der Zeit wird der Feed kürzer und gezielter.

Aktuell unterstützt: **Kleinanzeigen** – weitere Provider folgen.

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.5-green?logo=node.js)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-built--in-lightgrey?logo=sqlite)
![Playwright](https://img.shields.io/badge/Playwright-Chromium-45ba4b?logo=playwright)
![License](https://img.shields.io/badge/Lizenz-MIT-yellow)


---

![Screenshot](docs/ImmoPilot.png)

---

## Quickstart

Node.js 22.5+ vorausgesetzt.

```bash
npm install
npm run build:client
npm start
```

→ http://localhost:3000

---

## Features

- 🔍 **Suchagenten** – mehrere Agenten, je mit eigener Such-URL vom Provider und Seitenlimit
- 🚫 **Blacklist** – per Klick oder global via Keywords 
- ❤️ **Favoriten** – bleiben erhalten, auch wenn der Agent gelöscht wird
- 🔄 **Scraping** – manuell, beim Start oder per Cron; mit Pagination und Duplikat-Filterung
- 🧩 **Provider-System** – aktuell: Kleinanzeigen; weitere in Planung
- 🗄️ **Lokal** – SQLite
---

## Konfiguration

Alles optional – läuft auch ohne `.env`.

| Variable | Default | Zweck |
|---|---|---|
| `PORT` | `3000` | HTTP-Server-Port |
| `SCRAPE_ON_START` | `false` | Scraping beim Start |
| `SCRAPE_CRON_ENABLED` | `false` | Cron-Scraping |
| `SCRAPE_CRON` | `*/30 * * * *` | Cron-Ausdruck |

Keyword-/Stadtteil-Blacklist in `config/default.json`:

```json
{
  "blacklistKeywords": ["Monteurszimmer", "Zwischenmiete", "wg", "Monteur", "Untervermietung"],
  "blacklistedDistricts": []
}
```

---

## Datenmodell

`data/listings.db` wird automatisch angelegt.

- **`listings`** – Inserate mit Preis, Größe, Adresse, Timestamps und Flags (`is_seen`, `is_favorite`, `is_blacklisted`)
- **`search_configs`** – Suchagenten-Konfigurationen
- **`scrape_runs`** – Laufhistorie pro Agent
- **`blacklist`** – dauerhafte Ausschlüsse per ID oder URL

---

## Architektur

```
client/                   React-Frontend (Vite)
  src/components/         UI-Komponenten (Cards, Filter, Sidebar, …)
  src/hooks/              Datenfetching & State (useListings, useScraper, …)

src/                      Express-Backend
  server.js               Einstiegspunkt, Middleware, Routen
  routes/                 listings, scraper, configs
  scrapers/engine.js      Playwright-Runner + Selektor-DSL
  providers/              Adapter-Registry + Kleinanzeigen-Implementierung
  services/               Scrape-Orchestrierung je Agent
  db/database.js          node:sqlite – Schema, Migrationen, Upserts

config/default.json       Keyword- & Stadtteil-Blacklist
data/listings.db          SQLite-Datei (auto-angelegt)
```

---

## API

```
GET    /api/listings                   Listings abrufen (Filter per Query)
PATCH  /api/listings/:id/seen          als gesehen markieren
PATCH  /api/listings/:id/favorite      Favorit toggeln
POST   /api/listings/:id/blacklist     blacklisten
DELETE /api/listings/:id/blacklist     Blacklist aufheben
POST   /api/scrape                     alle aktiven Agenten scrapen
POST   /api/scrape/:configId           einzelnen Agenten scrapen
GET    /api/configs                    Agenten lesen
POST   /api/configs                    Agent anlegen
GET    /api/providers                  verfügbare Provider
```

---

## DB-Skripte

```bash
npm run db                 # Übersicht
npm run db listings        # Listings ausgeben
npm run db runs            # Scrape-Runs ausgeben
npm run db sql "SELECT …"  # Beliebiges SQL
```

---

## Hinweise

Ausschließlich für den privaten Gebrauch.

---

## Lizenz

[MIT](LICENSE)
