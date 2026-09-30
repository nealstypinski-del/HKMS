# Gebäudekatalog (erzeugt, nicht von Hand ändern)

Erzeugt mit `npx tsx bench/katalog.ts` aus `src/layout.ts`. Rein semantisch, keine Weltkoordinaten. Alle Bezeichnungen sind DEMO Bezeichnungen.
Die `hint` Koordinaten der Anker sind abstrakte Meter zur Wegzeitschätzung, Terminal 3 löst Anker selbst auf.

## Etage 0: Empfang und Erdgeschoss (`floor-0`)

| Zone | Bezeichnung | Art | Anker |
| --- | --- | --- | --- |
| `elevator-lobby-f0` | Aufzugslobby Empfang und Erdgeschoss | ELEVATOR_LOBBY | 1 Warteplatz (`elevator-lobby-f0`), 1 Aufzug (`elevator-f0`) |
| `agent-bench` | Agentenbank Erdgeschoss | AGENT_BENCH | 8 Bank (`bench-01` bis `bench-08`) |
| `kitchen` | Küche und Café | KITCHEN | 2 Kaffeemaschine (`kitchen-coffee-01` bis `kitchen-coffee-02`), 1 Arbeitsplatte (`kitchen-counter-01`), 6 Stuhl (`kitchen-seat-01` bis `kitchen-seat-06`) |
| `lounge` | Lounge mit Fernseher | LOUNGE | 1 Fernseher (`lounge-tv-01`), 8 Sofa oder Liege (`lounge-sofa-01` bis `lounge-sofa-08`) |
| `lobby` | Empfang und Lobby | LOBBY | 4 Warteplatz (`lobby-point-01` bis `lobby-point-04`) |
| `meeting-room-a` | Besprechungsraum A | MEETING_ROOM | 6 Meetingplatz (`meeting-room-a-seat-01` bis `meeting-room-a-seat-06`), 1 Whiteboard (`meeting-room-a-whiteboard`) |
| `meeting-room-b` | Besprechungsraum B | MEETING_ROOM | 6 Meetingplatz (`meeting-room-b-seat-01` bis `meeting-room-b-seat-06`), 1 Whiteboard (`meeting-room-b-whiteboard`) |
| `konferenz` | Konferenzraum Herkules | MEETING_ROOM | 12 Meetingplatz (`konferenz-seat-01` bis `konferenz-seat-12`), 1 Whiteboard (`konferenz-whiteboard`) |

## Etage 1: HerkulesJobs (`floor-1`)

| Zone | Bezeichnung | Art | Anker |
| --- | --- | --- | --- |
| `elevator-lobby-f1` | Aufzugslobby HerkulesJobs | ELEVATOR_LOBBY | 1 Warteplatz (`elevator-lobby-f1`), 1 Aufzug (`elevator-f1`) |
| `hj-desks` | Vertrieb und Recruiting | DESKS | 12 Schreibtisch (`desk-hj-01` bis `desk-hj-12`) |
| `agent-bench-hj` | Agentenbank HerkulesJobs | AGENT_BENCH | 12 Bank (`bench-hj-01` bis `bench-hj-12`) |
| `meeting-room-hj` | Kundenraum | MEETING_ROOM | 6 Meetingplatz (`meeting-room-hj-seat-01` bis `meeting-room-hj-seat-06`), 1 Whiteboard (`meeting-room-hj-whiteboard`) |
| `kitchen-hj` | Teeküche HerkulesJobs | KITCHEN | 1 Kaffeemaschine (`kitchen-hj-coffee-01`), 2 Stuhl (`kitchen-hj-seat-01` bis `kitchen-hj-seat-02`) |
| `lounge-hj` | Teamlounge HerkulesJobs | LOUNGE | 1 Fernseher (`lounge-hj-tv-01`), 4 Sofa oder Liege (`lounge-hj-sofa-01` bis `lounge-hj-sofa-04`) |
| `waiting-hj` | Warteplatz Freigaben HerkulesJobs | WAITING_AREA | 4 Warteplatz (`waiting-hj-01` bis `waiting-hj-04`) |

## Etage 2: KasselMemes (`floor-2`)

| Zone | Bezeichnung | Art | Anker |
| --- | --- | --- | --- |
| `elevator-lobby-f2` | Aufzugslobby KasselMemes | ELEVATOR_LOBBY | 1 Warteplatz (`elevator-lobby-f2`), 1 Aufzug (`elevator-f2`) |
| `km-desks` | Newsroom KasselMemes | DESKS | 12 Schreibtisch (`desk-km-01` bis `desk-km-12`) |
| `agent-bench-km` | Agentenbank KasselMemes | AGENT_BENCH | 12 Bank (`bench-km-01` bis `bench-km-12`) |
| `meeting-room-km` | Redaktionsraum | MEETING_ROOM | 6 Meetingplatz (`meeting-room-km-seat-01` bis `meeting-room-km-seat-06`), 1 Whiteboard (`meeting-room-km-whiteboard`) |
| `kitchen-km` | Teeküche KasselMemes | KITCHEN | 1 Kaffeemaschine (`kitchen-km-coffee-01`), 2 Stuhl (`kitchen-km-seat-01` bis `kitchen-km-seat-02`) |
| `lounge-km` | Community Lounge | LOUNGE | 1 Fernseher (`lounge-km-tv-01`), 4 Sofa oder Liege (`lounge-km-sofa-01` bis `lounge-km-sofa-04`) |
| `waiting-km` | Warteplatz Freigaben KasselMemes | WAITING_AREA | 4 Warteplatz (`waiting-km-01` bis `waiting-km-04`) |

## Etage 3: AI und Entwicklung (`floor-3`)

| Zone | Bezeichnung | Art | Anker |
| --- | --- | --- | --- |
| `elevator-lobby-f3` | Aufzugslobby AI und Entwicklung | ELEVATOR_LOBBY | 1 Warteplatz (`elevator-lobby-f3`), 1 Aufzug (`elevator-f3`) |
| `dev-desks` | Entwicklung und Betrieb | DESKS | 10 Schreibtisch (`desk-dev-01` bis `desk-dev-10`) |
| `agent-bench-dev` | Agentenbank Entwicklung | AGENT_BENCH | 10 Bank (`bench-dev-01` bis `bench-dev-10`) |
| `meeting-room-dev` | Review Raum | MEETING_ROOM | 6 Meetingplatz (`meeting-room-dev-seat-01` bis `meeting-room-dev-seat-06`), 1 Whiteboard (`meeting-room-dev-whiteboard`) |
| `kitchen-dev` | Teeküche Entwicklung | KITCHEN | 1 Kaffeemaschine (`kitchen-dev-coffee-01`), 2 Stuhl (`kitchen-dev-seat-01` bis `kitchen-dev-seat-02`) |
| `lounge-dev` | Entwickler Lounge | LOUNGE | 1 Fernseher (`lounge-dev-tv-01`), 4 Sofa oder Liege (`lounge-dev-sofa-01` bis `lounge-dev-sofa-04`) |
| `waiting-dev` | Warteplatz Freigaben Entwicklung | WAITING_AREA | 4 Warteplatz (`waiting-dev-01` bis `waiting-dev-04`) |

## Etage 4: Wellness und Dachlounge (`floor-4`)

| Zone | Bezeichnung | Art | Anker |
| --- | --- | --- | --- |
| `elevator-lobby-f4` | Aufzugslobby Wellness und Dachlounge | ELEVATOR_LOBBY | 1 Warteplatz (`elevator-lobby-f4`), 1 Aufzug (`elevator-f4`) |
| `wellness` | Wellnessraum | WELLNESS | 6 Sofa oder Liege (`wellness-liege-01` bis `wellness-liege-06`) |
| `dachlounge` | Dachlounge mit Fernseher | LOUNGE | 1 Fernseher (`dachlounge-tv-01`), 6 Sofa oder Liege (`dachlounge-sofa-01` bis `dachlounge-sofa-06`) |

## Sofas und Fernseher

Jedes Sofa außer den Wellness Liegen hat ein `focusAnchorId` auf den Fernseher seiner Lounge (Anker Art `TV`, Kapazität 0). Aktivität `WATCH_TV` ist dort erlaubt. Die Wellness Liegen erlauben `REST`, `SIT` und `READ`.

## Meetingräume

- `meeting-room-a` (Besprechungsraum A, 6 Plätze)
- `meeting-room-b` (Besprechungsraum B, 6 Plätze)
- `konferenz` (Konferenzraum Herkules, 12 Plätze)
- `meeting-room-hj` (Kundenraum, 6 Plätze)
- `meeting-room-km` (Redaktionsraum, 6 Plätze)
- `meeting-room-dev` (Review Raum, 6 Plätze)
