# NEAL HEALTH OS 2076

React 19 + Tailwind 4 + Recharts Command Center (4-Spalten-HUD, bis 32:9).

```bash
npm install
npm start          # Frontend bauen + Hub-Server auf :8787 (Windows: start.bat per Doppelklick)
npm run start:dev  # Entwicklung: Server + Vite mit Hot-Reload (:5173)
npm run doctor     # Whoop-MCP prüfen
npm test
```

## Betrieb (Windows-PC, Handy im WLAN)
`start.bat` (oder `npm start`) baut das Frontend bei Bedarf und startet den **Hub-Server** auf Port 8787. Er speichert alle Eingaben in `data/state.json`
(Last-Write-Wins je Schlüssel) und verteilt Änderungen live per SSE – Handy und Wandmonitor zeigen dieselben Daten. Das Server-Fenster zeigt die WLAN-Adresse als Link und QR-Code (mit Zugriffstoken, wird als Cookie gemerkt).
Ohne Server arbeitet die App lokal weiter (Badge „LOKAL“) und gleicht später ab.

- Autostart beim Login: `powershell -ExecutionPolicy Bypass -File scripts\autostart.ps1`
- Handy im WLAN erlauben (als Administrator): `powershell -ExecutionPolicy Bypass -File scripts\firewall.ps1` – **nicht** im Router ins Internet freigeben (kein TLS).
- Entwicklung: `npm run start:dev` (Server + Vite mit Hot-Reload), `npm test`.

## Schritte per iPhone („Health Auto Export“)
In der App eine **REST-API-Automation** anlegen: URL `http://<PC-IP>:8787/api/health-export`, Methode POST, Header `x-token: <Token aus dem Server-Fenster / data/token.txt>`,
Format JSON, Metriken **Step Count** (optional Active Energy, Resting Heart Rate), Aggregation nach Tag. Die App zeigt die Schritte mit Badge „AUTO HEALTH“; Teil-Lieferungen senken den Tageswert nie.
Test ohne iPhone: `curl -X POST -H "x-token: <Token>" -H "Content-Type: application/json" --data @server/test/fixtures/health-export.json http://localhost:8787/api/health-export`

## Whoop-MCP anbinden
Der Server startet deinen bestehenden `whoop-ai-mcp` Server (stdio) und ruft `whoop_get_recovery`, `whoop_get_sleep`, `whoop_get_workouts` auf.

1. Auf dem Windows-PC: `powershell -ExecutionPolicy Bypass -File scripts\find-whoop-mcp.ps1`
   durchsucht Claude-Desktop-/Claude-Code-/Cursor-Configs nach einem Whoop-Eintrag und schreibt `whoop-mcp.config.json`.
2. Oder `whoop-mcp.config.example.json` nach `whoop-mcp.config.json` kopieren und anpassen (Datei ist gitignored, enthält Secrets).
3. **`npm run doctor`** prüft Start, Tools und Antwortformate und legt in `samples/` die *Struktur* der Antworten ab (keine Messwerte).

Ohne laufenden Server zeigt das UI „OFFLINE“ und den letzten Cache bzw. gekennzeichnete Demo-Werte.

## Struktur
- `src/lib/calc.js` – reine Logik: Auto-Rebalance (`planBlocks`), KFA, Massenmodell, Retatrutid, XP, Command-Banner
- `src/hooks/` – `useHealthOS` (Gesamtzustand, localStorage), `useAutoRebalance`, `useWhoop`
- `src/mcp/whoopClient.js` – Normalisierer (Recovery/Sleep/Workouts → XP)
- `server/` – `index.mjs` (HTTP, SSE, Token, statisches Frontend), `store.mjs` (JSON-Store, LWW), `whoop.mjs` (MCP-Client), `healthExport.mjs` (Parser)
- `src/lib/sync.js` – lokaler Cache ↔ Server-Abgleich

`?t=HH:MM` in der URL überschreibt die Uhrzeit (Test des Command-Banners).

## Ansichten
- **HQ** (Entwurf Bild 3): Herkules-HQ-Artwork als Hintergrund, HUD-Karten schweben darüber; Raum-Hotspots öffnen Detail-Panels.
- **Analyse** (Entwurf Bild 4): Mission-Panel, Heute im Soll, Prognose, 7-Tage-Trend, Block-Tabelle.
- Ab Seitenverhältnis 2:1 wird die Oberfläche auf die Bildschirmhöhe skaliert (kein Scrollen), darunter gestapelt.

### Hub-Artwork tauschen
`public/hub.webp` ersetzen, `ART_RATIO` und die Raum-Koordinaten (Prozent des Bildes) in `src/lib/hubConfig.js` anpassen.
Das aktuelle Bild wurde per `python3 scripts/crop-hub-art.py <screenshot> public/hub.webp` aus dem Entwurf geschnitten (Platzhalter-Qualität).
