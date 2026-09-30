# Integrationsvertrag Simulation

Dieses Dokument beschreibt, wie Terminal 1 (Domain, Zustand) und Terminal 3 (3D Welt) die Simulation nutzen.

## Prinzip

```
echtes oder Mock Ereignis  ->  Simulation  ->  Agent Intent  ->  Weltzustand  ->  3D Figur
```

Die Simulation kennt keine Koordinaten, keine Meshes und keine Animationen. Sie liefert Status, Intent,
semantische Orte und Ereignisse. Der Renderer löst Anker in Weltpositionen auf, findet Wege und animiert.

## Festlegungen (Stand Abstimmung)

* **Typen:** Terminal 1 liefert langfristig die führenden Typen (Agent, Task, Department). Bis dahin liegen sie in `src/types.ts` und sind isoliert austauschbar.
* **Bänke:** Jede Abteilungsetage hat eine eigene Agentenbank (`agent-bench-hj`, `agent-bench-km`, `agent-bench-dev`), dort ruhen sich die Agenten aus. Das Erdgeschoss hat eine kleine Bank für Ankunft und Überlauf (`agent-bench`). Küche und Lounge liegen im Erdgeschoss, Pausen erzeugen also Aufzugsfahrten.
* **Gastschreibtische:** Shared Agenten arbeiten bevorzugt an einem Schreibtisch der Abteilung, für die sie die Aufgabe erledigen (Aufzug inklusive). Nur bei eigenen Aufgaben nutzen sie die Schreibtische auf Etage 3.
* **Freigabe:** Standard ist der Warteplatz (`approvalBehavior: 'GO_TO_WAITING_AREA'`, Zonen `waiting-hj`, `waiting-km`, `waiting-dev`). Alternativ `STAY_AT_DESK`.
* **Demo Freigabe:** In Demos ist `mockAutoApproveAfterMs` erlaubt (Szenarien B, D, F). Szenarien C und E lassen Freigaben bewusst offen. Echte Aufgaben werden nie automatisch freigegeben.
* **Zeit:** Simulationszeit ist Berliner Zeit (`config.timeZone`, Standard `Europe/Berlin`, inklusive Sommerzeit). Startzeit Montag 08:00, Arbeitstag 08:00 bis 18:00, Log in Berliner Zeit. Zeitstempel im Zustand bleiben UTC Millisekunden.
* **Full HQ:** 60 Agenten.
* **Aufzugskapazität:** wird später erzwungen. Die Etappenkette (`WAIT_FOR_ELEVATOR`, `ENTER_ELEVATOR`) ist dafür der Einstiegspunkt.
* **Minimap:** `engine.getMinimap()` liefert Etagen, Zonen und Agentenzahlen je Status. Darstellung (zum Beispiel oben rechts, mit türkisfarbener Umrandung) ist Sache von Terminal 3.
* **Herkules Foundation:** kommt später als weitere Abteilung. Erweiterungspunkte: `DEPARTMENTS` und `DepartmentId` in `src/types.ts`, `DEPARTMENT_FLOOR` und `DEPARTMENT_SLUG` in `src/layout.ts`, Agenten in `src/roster.ts`, Vorlagen in `src/workflows.ts`.

## Zeitmodell

* Die Simulation läuft in diskreten logischen Ticks (Standard 250 ms Simulationszeit, also 4 Ticks pro Sekunde, konfigurierbar 2 bis 10 pro Sekunde).
* Grafik läuft mit 60 FPS. Bewegung zwischen zwei Etappen interpoliert der Renderer selbst.
* Ein einziger Timer (`createRealtimeDriver`) ruft `engine.advance(realDeltaMs)` auf. Es gibt keinen Timer je Agent.
* Uhr: `REALTIME`, `ACCELERATED` (2x, 5x, 10x), `PAUSED`. Produktiv ist `REALTIME` der Standard.

## Pause Grenze zur echten Arbeit

Pause und Beschleunigung wirken NUR auf Mock Aufgaben, Bewegungen und Pausen. Aufgaben mit `origin: 'EXTERNAL'`
(spätere echte Provider) werden nie beschleunigt, nie durch die Uhr beendet und nie automatisch freigegeben.
Providerereignisse (`engine.applyProviderEvent`) wirken auch während der Pause auf den Zustand.
Agenten mit echter Aufgabe sind vor Mock Pausen, Meeting Umleitung und Debug Aktionen geschützt (`AGENT_PROTECTED`).

## Für Terminal 3

Lesen (ohne Kopie, nur lesen, nie verändern):

| Aufruf | Inhalt |
| --- | --- |
| `engine.getAgents()` | `status`, `intent`, `activity`, `location {floorId, zoneId, anchorId}`, `route`, `taskId`, `meetingId` |
| `engine.getLayout()` | Etagen und Zonen (semantisch) |
| `engine.getAnchors()` | alle Aktivitätsanker mit `type`, `capacity`, `occupants`, `reservedBy`, `allowedActivities` |
| `engine.getMetrics()` | Zähler, Abteilungskennzahlen, `activityLevel` |
| `engine.getQueues()` | je Abteilung `active`, `queued`, `waitingApproval` |
| `engine.getLog(n)` | gedeckelter Aktivitätslog |

Ereignisse (`engine.on(type, handler)` oder `engine.onAny`), zugestellt am Ende jedes Ticks:

* `AGENT_MOVEMENT_REQUESTED { agentId, intent, destination, destinationAnchorId, stages[] }`: neuer Weg. `stages` enthält die Kette `STAND_UP`, `WALK_TO_ELEVATOR`, `WAIT_FOR_ELEVATOR`, `ENTER_ELEVATOR`, `CHANGE_FLOOR`, `EXIT_ELEVATOR`, `WALK_TO_DESTINATION` (bei gleicher Etage entfallen die Aufzugsphasen). Jede Etappe hat `from`, `to` und geschätzte `durationMs`.
* `AGENT_ROUTE_STAGE_STARTED`: eine Etappe beginnt.
* `AGENT_ARRIVED`: Ziel erreicht.
* `AGENT_STATUS_CHANGED`, `AGENT_INTENT_CHANGED`: Zustandswechsel.
* `BREAK_STARTED`, `BREAK_ENDED`, `MEETING_ASSEMBLING`, `MEETING_STARTED`, `MEETING_COMPLETED`, `APPROVAL_REQUIRED` und weitere (siehe `SimEventMap` in `src/events.ts`).

Bewegung:

* Standard `movementMode: 'SIMULATED'`: Die Simulation schätzt Wegzeiten selbst (Ankunft ohne Rückmeldung).
* `movementMode: 'RENDERER_CONFIRMED'`: Terminal 3 ruft nach jeder fertig gelaufenen Etappe `engine.confirmRouteStage(agentId)`. Bleibt die Bestätigung aus, greift ein Timeout (`confirmTimeoutFactor`), damit nichts hängen bleibt.
* Anker Ids sind semantisch, z. B. `desk-hj-04`, `bench-05`, `kitchen-coffee-01`, `kitchen-seat-02`, `lounge-sofa-03`, `meeting-room-hj-seat-02`, `elevator-lobby-f1`, `waiting-km-01`. Der Renderer bildet diese Ids auf Weltpositionen ab. Die `hint` Koordinaten der Anker sind nur abstrakte Meter zur Wegzeitschätzung.
* Etagen: `floor-0` Erdgeschoss (Küche, Lounge, Meetingräume A und B, kleine Bank), `floor-1` HerkulesJobs, `floor-2` KasselMemes, `floor-3` AI und Development. Jede Abteilungsetage hat Schreibtische, Bank, Meetingraum und Warteplatz.

Intent Tabelle (Auswahl): `GO_TO_DESK`, `USE_WORKSTATION`, `GO_TO_AGENT_BENCH`, `SIT_ON_AGENT_BENCH`, `GO_TO_KITCHEN`, `USE_KITCHEN`, `GO_TO_LOUNGE`, `SIT_IN_LOUNGE`, `GO_TO_MEETING`, `ATTEND_MEETING`, `GO_TO_ELEVATOR`, `CHANGE_FLOOR`, `WAIT_FOR_APPROVAL`, `RETURN_TO_DESK`, `WANDER`, `IDLE`.
`activity` verfeinert die Optik am Anker (`SIT`, `CHAT_VISUAL`, `READ`, `REST`, `WAIT`, `STAND`, `USE_KITCHEN`, `WORK`, `ATTEND_MEETING`, `WAIT_FOR_APPROVAL`).
`CHAT_VISUAL` ist reine Optik und keine echte Agentenkommunikation. Echte Kommunikation läuft über `AGENT_MESSAGE`.

## Für Terminal 1

* Die Typen in `src/types.ts` (`Agent`, `Task`, `DepartmentId`, `Capability`, `Priority`) sind vorerst führend, weil es im Repo noch keine zentrale Domain gab. Sobald Terminal 1 eigene Typen liefert, werden sie über Adapter oder durch Ersetzen der Typdatei abgebildet. Die Simulation liest und schreibt nur diese Strukturen.
* Zustand ist vollständig serialisierbar: `saveSimulation(engine)` und `loadSimulation(json, { paused })`. Enthalten sind Agenten, Aufgaben, Zuweisungen, Meetings, Reservierungen, Uhr, Seed und PRNG Zustand. Beim Laden werden die Invarianten geprüft.
* Absturzerholung: nach `loadSimulation(json, { paused: true })` die Provider Sessions abgleichen (`engine.reconcileExternalTasks(liveSessions)`), danach `resume()`.
* Autosave: `engine.onAutosave` mit `config.autosaveEveryTicks`.

## Provider Grenze (noch ohne echte Provider)

`ProviderAdapter.toProviderEvent(raw)` übersetzt rohe Ereignisse in `ProviderEvent`. Die Engine bildet sie ab:

| Provider Ereignis | Wirkung |
| --- | --- |
| `provider.session.started` | EXTERNAL Aufgabe, Agent geht zum Schreibtisch, dann `WORKING` |
| `provider.session.waiting` | `WAITING_FOR_HUMAN`, Ereignis `APPROVAL_REQUIRED` |
| `provider.session.completed` | Aufgabe abgeschlossen |
| `provider.session.failed` | Aufgabe fehlgeschlagen |
| `provider.started`, `provider.stopped` | `PROVIDER_STARTED`, `PROVIDER_STOPPED` |

Die Entscheidung eines Menschen läuft über `engine.grantApproval(taskId)` oder `engine.denyApproval(taskId)`.
Ein Rückkanal an den Provider ist über `engine.setHooks({ onApprovalDecision })` vorbereitet.

## Routing

Aufgaben werden über Capabilities verteilt, nie über Namen. Filter: alle `requiredCapabilities` vorhanden, Abteilung passt (Shared Agenten dürfen aushelfen), Agent verfügbar. Pausierende Agenten werden nur bei `HIGH`, `URGENT` oder fest zugeordneten Aufgaben herausgeholt. Rangfolge: eigene Abteilung, verfügbar vor pausierend, geringere bisherige Last, spezialisiertere Agenten, Agent Id als fester Tiebreak. Warteschlange sortiert nach Priorität mit Aging (LOW und NORMAL steigen mit Wartezeit bis maximal HIGH).

## Betrieb

* `CONTINUOUS_OPERATIONS`: 24/7, kein Feierabend, Aufgaben treffen laufend ein. Speicher bleibt begrenzt (Log, Historie).
* `WORKDAY`: Ankunft gestaffelt, Feierabend, Agenten gehen offline und kehren am nächsten Morgen zurück.
* Zufall ist geseedet. Gleicher Seed und gleiche Befehle ergeben denselben Verlauf, unabhängig davon, in welchen Häppchen die Zeit geliefert wird.

## Invarianten

`engine.checkInvariants()` prüft unter anderem: kein Agent auf zwei Schreibtischen, kein Schreibtisch mit zwei Agenten, Ankerkapazitäten, kein Agent gleichzeitig `WORKING` und `BREAK`, keine Aufgabe bei zwei Agenten, Meeting Sitze. `config.invariantCheckEveryTicks` prüft laufend und wirft bei Verstoß.

## Bekannte Grenzen

* Aufzugskapazität wird noch nicht erzwungen (nur Intent und Reihenfolge der Etappen), Erzwingung ist geplant.
* Wegzeiten sind Schätzungen aus abstrakten Koordinaten.
* Zusammenarbeit (`collaboratorAgentIds`) ist nur vorbereitet.
* Kein Reservieren von Wegpunkten (Engstellen, Gedränge) in der Simulation.
