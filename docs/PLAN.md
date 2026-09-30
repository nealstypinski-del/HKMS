# Plan: Härtung und Struktur (Loop alle 15 Minuten)

Regeln für jeden Tick: ein Stück, nur die genannten Dateien, jede Datei mit einer Aufgabe, Test zuerst, dann Korrektur.
Prüfung: `npx tsc --noEmit`, `npx vitest run`, `npm run build`. Nur bei Grün committen und pushen (Branch `claude/gifted-planck-8dktfz`, kein Force Push, kein Pull Request).
Bei Rot: höchstens ein Reparaturversuch, sonst zurücknehmen und hier als "blockiert" vermerken.

## Risikoliste (dümmste anzunehmende Nutzerin)

* R1 Kaputte, alte oder gesperrte gespeicherte Daten. Erwartung: Start mit Standardwerten.
* R2 Zwei Tabs schreiben gleichzeitig.
* R3 Alle Agenten auf Working, aber Arbeitsplätze fehlen. Erwartung: Meldung, kein Absturz.
* R4 Schnelles Umschalten Working, Idle, Break vor Sessionstart (Wettlauf `openSession`).
* R5 Zurücksetzen während die Simulation läuft.
* R6 Simulation schnell starten und stoppen, Tempo wechseln im Stillstand.
* R7 Alle Agenten Idle: Bank, Lounge, Küche voll.
* R8 Statuswechsel während der Aufzugfahrt.
* R9 Agent Offline und dann "Kamera auf Agent".
* R10 Arbeitsplatz Panel offen, Agent steht auf.
* R11 Steckenbleiben im Rundgang.
* R12 Fokusverlust bei gedrückter Taste.
* R13 Handy ohne Tastatur.
* R14 Sehr kleines Fenster.
* R15 Sehr niedrige Bildrate (Tunnel durch Wände).
* R16 Kein WebGL oder Kontextverlust.
* R17 Extremes Zoomen, Etagenwahl während Kamerafahrt.
* R18 Sehr lange Namen oder Aufgaben.

## Backlog

Phase 0
* [x] 1. `docs/PLAN.md` anlegen
* [ ] 2. `.github/workflows/check.yml` (typecheck, test, build)
* [ ] 3. `e2e/` Playwright Skripte ins Repository, mit README

Phase 1 (Härtung)
* [ ] 4. R1 `agent.store.ts` Tests für kaputte, alte, leere Daten
* [ ] 5. R7 `slots.ts` Ausweichplätze, Test mit 24 Idle Agenten
* [ ] 6. R4 `agent.service.ts` Wettlauf in `openSession`, Test
* [ ] 7. R5 und R6 `simulation.ts` idempotent, Reset stoppt sie, Test
* [ ] 8. R3 und R9 `AgentPanel.tsx`, `office.store.ts` Meldungen und Wächter
* [ ] 9. R8 `CharacterController.ts` Statuswechsel während Fahrt, Test
* [ ] 10. R11 `walk/WalkHud.tsx`, `playerRuntime.ts` Knopf "Zurück zum Start"
* [ ] 11. R12 und R15 `walk/WalkWorld.tsx`, `playerPhysics.ts` Fokusverlust, Zeitschritt Test
* [ ] 12. R13 und R14 `walk/TouchControls.tsx`, Layout kleiner Fenster
* [ ] 13. R16 `ui/ErrorBoundary.tsx` Kontextverlust und fehlendes WebGL
* [ ] 14. R17 und R18 `CameraController.tsx` Grenzen, UI Textumbruch
* [ ] 15. R2 `storage/storage.ts` Reaktion auf `storage` Ereignis

Phase 2 (Struktur)
* [ ] 16. `Character.tsx` aufteilen (`useCharacterRig.ts`, `StatusIcon.tsx`)
* [ ] 17. `walkWorld.ts` aufteilen (Rampen, Kollisionskörper, Öffnungen)
* [ ] 18. `agent.service.ts` aufteilen (Desk, Session, Task)
* [ ] 19. Tote Reste entfernen, Dev Probes in `devProbe.ts` bündeln

Phase 3
* [ ] 20. README und Plan aktualisieren, Live Seite neu veröffentlichen, Abschlussbericht, `CronDelete`

## Protokoll

* Tick 1: Stück 1 erledigt.
