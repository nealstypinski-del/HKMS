# NEAL HEALTH OS 2076

React 19 + Tailwind 4 + Recharts Command Center (4-Spalten-HUD, bis 32:9).

```bash
npm install
npm start        # Bridge + Dashboard gemeinsam (Windows: start.bat per Doppelklick)

# oder getrennt:
npm run bridge   # Whoop-MCP-Bridge auf :8787 (separates Terminal)
npm run dev      # Dashboard auf :5173
npm test
```

## Whoop-MCP anbinden
Die Bridge startet deinen bestehenden `whoop-ai-mcp` Server (stdio) und ruft
`whoop_get_recovery`, `whoop_get_sleep`, `whoop_get_workouts` auf.

1. Auf dem Windows-PC: `powershell -ExecutionPolicy Bypass -File scripts\find-whoop-mcp.ps1`
   durchsucht Claude-Desktop-/Claude-Code-/Cursor-Configs nach einem Whoop-Eintrag und schreibt `whoop-mcp.config.json`.
2. Oder `whoop-mcp.config.example.json` nach `whoop-mcp.config.json` kopieren und anpassen (Datei ist gitignored, enthält Secrets).

Ohne laufende Bridge zeigt das UI „OFFLINE" und den letzten Cache bzw. gekennzeichnete Demo-Werte.

## Struktur
- `src/lib/calc.js` – reine Logik: Auto-Rebalance (`planBlocks`), KFA, Massenmodell, Retatrutid, XP, Command-Banner
- `src/hooks/` – `useHealthOS` (Gesamtzustand, localStorage), `useAutoRebalance`, `useWhoop`
- `src/mcp/whoopClient.js` – Normalisierer (Recovery/Sleep/Workouts → XP)
- `server/whoop-bridge.mjs` – MCP-Client → HTTP

`?t=HH:MM` in der URL überschreibt die Uhrzeit (Test des Command-Banners).

## Ansichten
- **HQ** (Entwurf Bild 3): Herkules-HQ-Artwork als Hintergrund, HUD-Karten schweben darüber; Raum-Hotspots öffnen Detail-Panels.
- **Analyse** (Entwurf Bild 4): Mission-Panel, Heute im Soll, Prognose, 7-Tage-Trend, Block-Tabelle.
- Ab Seitenverhältnis 2:1 wird die Oberfläche auf die Bildschirmhöhe skaliert (kein Scrollen), darunter gestapelt.

### Hub-Artwork tauschen
`public/hub.webp` ersetzen, `ART_RATIO` und die Raum-Koordinaten (Prozent des Bildes) in `src/lib/hubConfig.js` anpassen.
Das aktuelle Bild wurde per `python3 scripts/crop-hub-art.py <screenshot> public/hub.webp` aus dem Entwurf geschnitten (Platzhalter-Qualität).
