# @herkules/simulation

Simulationsengine für das Herkules AI HQ (Terminal 4, Loop 1). Sie entscheidet, WAS im Büro passiert.
Terminal 3 entscheidet, WIE es aussieht. Keine Abhängigkeit zu Three.js, React oder DOM.

```
cd packages/simulation
npm install
npm test          # 99 Tests
npm run typecheck
npm run build
npm run bench     # 10, 25, 50, 100, 250 Agenten
npm run scenarios # alle Demo Szenarien mit Invariantenprüfung bei jedem Tick
npm run demo      # Textdemo: KasselMemes Trend Spike in Berliner Zeit
```

Alle Agenten, Aufgaben und Workflows sind DEMO / MOCK. Es werden keine echten Nachrichten, E Mails, Posts oder CRM Updates erzeugt.
Vertrag für Terminal 1 und Terminal 3: [docs/INTEGRATION.md](docs/INTEGRATION.md).

```ts
import { createScenarioEngine, createRealtimeDriver } from '@herkules/simulation';

const engine = createScenarioEngine('C_KASSELMEMES_TREND_SPIKE');
engine.on('AGENT_MOVEMENT_REQUESTED', (e) => renderer.walk(e.payload.agentId, e.payload.destination, e.payload.stages));
createRealtimeDriver(engine).start(); // ein einziger Timer, 4 Ticks pro Sekunde
```
