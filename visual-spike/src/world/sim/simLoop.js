// Ein Simulationsschritt für alle Agenten (Bewegung, Verhalten, Uhr).
// dt: vergangene Sekunden Echtzeit, bereits mit der Simulationsgeschwindigkeit multipliziert. Bewegung läuft in Sekunden,
// Uhr, Bedürfnisse und Dauern in Simulationsminuten: eine Simulationsminute entspricht bei 1x zwei Sekunden Echtzeit.
export const SIM_MIN_PER_SEC = 0.5
import { assignIntent, stepAgent } from '../outdoor/agents/outdoorAgentSim.js'
import { stepBrain } from './simBrain.js'
import { stepClock } from './simClock.js'
import { insideHQ } from '../indoor/config/hq.layout.js'

export function stepWorld(agents, dt, ctx) {
  if (dt <= 0) return
  const dtMin = dt * SIM_MIN_PER_SEC
  stepClock(dtMin)
  ctx.events.length = 0
  let outdoor = 0
  for (const a of agents) if (!insideHQ(a.x, a.z) && a.visible) outdoor++
  ctx.outdoor = outdoor
  for (const a of agents) {
    if (a.spawnDelay > 0) {
      a.spawnDelay -= dt
      if (a.spawnDelay <= 0 && a.nextIntent) {
        if (a.nextIntent === 'PATROL_INDOOR') { a.mode = 'inside'; a.x = 0; a.z = -9; assignIntent(a, 'PATROL_INDOOR', { routeId: a.routeId }) }
        else assignIntent(a, a.nextIntent)
        a.nextIntent = null
      }
      continue
    }
    stepAgent(a, dt)
    if (a.brain) stepBrain(a, dtMin, ctx)
  }
}
