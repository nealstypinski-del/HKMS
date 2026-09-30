# Herkules AI HQ

Ein begehbares 3D Headquarter für HerkulesJobs und KasselMemes. Agenten sind Figuren in einem mehrstöckigen Gebäude, ihr Zustand kommt aus einer sauberen Softwarearchitektur, an die später echte Claude Code und Codex Agenten angeschlossen werden.

Stand: Loop 1 (Vertical Slice) plus Rundgang Modus (Third Person, Treppe, Rolltreppe, Konferenzräume).

## Setup und Start

```
npm install
npm run dev        # Entwicklung auf http://127.0.0.1:5173
npm run build      # Typprüfung und Produktions Build
npm test           # Unit Tests (Vitest)
```

Es sind keine Zugangsdaten nötig. Alle Agenten laufen über den MockProvider und sind sichtbar als `Provider: MOCK` gekennzeichnet.

## Bedienung

* Übersicht: ziehen dreht, Rechtsklick verschiebt, Mausrad zoomt, Etagenwahl links, Abteilungen links, Esc hebt die Auswahl auf.
* Agent oder Arbeitsplatz anklicken öffnet ein Panel. Beim Arbeitsplatz erscheint das Mock Terminal.
* SIMULATE WORKDAY startet den deterministischen Demo Modus (Tempo 1x, 2x, 4x).
* RUNDGANG STARTEN: Third Person. WASD oder Pfeiltasten gehen, Shift rennt, Maus ziehen dreht die Kamera, Mausrad ändert den Abstand, Esc beendet.

## Architektur

```
Provider Ereignis oder Befehl -> agent.service -> Stores -> 3D Welt -> Figur
```

Vier Schichten bleiben getrennt: 3D Darstellung (`world`, `furniture`, `characters`, `walk`), Geschäftslogik (`agents`, `tasks`), Providerlogik (`providers`) und Navigation und Geometrie (`navigation`, `config`).

## Ordnerstruktur (`src/`)

* `config/` Maße, Etagen, Layouts, Navigationsknoten, `walkWorld.ts` (Rampen, Deckenöffnungen, Kollision)
* `data/` Abteilungen, 24 Agenten, Arbeitsplätze, Task Vorlagen
* `agents/` Modelle, Store (persistiert), Service, Simulation
* `tasks/` Task Modell und Store
* `providers/` `AIProvider`, `MockProvider`, Registry
* `characters/` State Machine, Zielplätze, Bewegung, Figurenmodell
* `navigation/` Graph mit Aufzug, Plätze, Routen
* `world/` Gebäude, Etagen, Aufzug, Treppe, Rolltreppe, Konferenzraum, Kamera
* `walk/` Spielerphysik, Avatar, Steuerung
* `store/` UI und Kamera Zustand
* `storage/` Persistenz Adapter (später SQLite)
* `ui/` Panels

## Agent Modell

`Agent` hat `id`, `displayName`, `role`, `department`, `status` (idle, working, meeting, waiting, break, offline), `provider` (mock, claude, codex, auto), `currentTaskId`, `deskId` und ein `avatar` mit Haut, Haar, Frisur, Kleidung und Zubehör. Zusätzlich `homeDeskId` als Wunschplatz.

## Desk Modell

`Desk` hat `id`, `departmentId`, `position`, `assignedAgentId` und `computer` mit `state` (offline, idle, working, waiting), `provider`, `terminalSessionId`. Der Monitor aktiviert sich erst, wenn die Figur tatsächlich sitzt.

## Provider Modell

`AIProvider` mit `isAvailable`, `startSession`, `stopSession`, `getSessionStatus` und optional `onSessionEvent`. Der MockProvider simuliert starting, working, waiting, completed, failed und erzeugt die Terminal Zeilen. Die Terminal Ansicht liest nur über diese Schnittstelle.

### Sicherheitsregeln für spätere Provider

* Keine Zugangsdaten aus Browsern extrahieren.
* Keine Sessions kopieren.
* Keine Abo oder Nutzungslimits umgehen.
* Keine Passwörter speichern.
* Nur offiziell unterstützte Authentifizierung: Der Nutzer meldet sich selbst bei der lokalen CLI an, die App erkennt sie nur. API Keys bleiben eine optionale Zukunft.

## Status Machine

`IDLE` geht bei einer Aufgabe zu `WALKING_TO_DESK`, dann `WORKING`. Braucht der Agent eine Freigabe, folgt `WAITING`, danach wieder `WORKING`. Ist die Aufgabe fertig, geht er zu `WALKING_TO_IDLE` und landet in `IDLE` auf der Agentenbank oder Lounge. Dazu `WALKING_TO_BREAK` und `ON_BREAK` (Küche), `WALKING_TO_MEETING` und `IN_MEETING` (Konferenzraum der eigenen Etage), `OFFLINE` (Figur ausgeblendet).

## Rundgang Modus

* Vier Etagen, Treppe von jeder Etage zur nächsten (30 Stufen à 0,2 m, U Form mit Podest), Rolltreppe zwischen Lobby und Etage 1 mit einer Spur aufwärts und einer abwärts, Aufzug für die Agenten.
* Konferenzräume mit Glaswänden und Tür auf den Etagen 1 bis 3. Agenten im Status Meeting laufen durch die Tür.
* Kollision mit Möbeln, Wänden, Geländern und Deckenöffnungen. Die Zahlen für Sichtbares und Begehbares stammen aus denselben Konstanten.

## Bewusst nicht implementiert

Echte Claude oder Codex Anbindung, Web Automation, CRM, Instagram, WhatsApp, Mail, Memory, RAG, Multiplayer, Geldsystem, Voice, Character Creator, Physik Engine.

Die Themenwände (Vertrieb und Produkte, Infobeiträge, Nachrichten, Gewinnspiele) sind Platzhalter. Echte Inhalte des Unternehmens sind nicht im Repository.

## Roadmap Loop 2

Lokaler Provider Layer: Claude Code Adapter und Codex Adapter, Provider Erkennung und Authentifizierungsstatus, echte Terminal Sessions, Workspace Zuweisung, Task Ausführung, Live Logs, Bindung Agent an Terminal. Die Schnittstellen dafür (`AIProvider`, `agent.service.handleSessionEvent`, `provider.registry`) sind vorbereitet.
