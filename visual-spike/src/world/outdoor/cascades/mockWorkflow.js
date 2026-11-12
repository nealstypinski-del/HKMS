// MOCK: erzeugt Demo Zustände und Demo Abschlüsse für die Kaskade. Enthält keinerlei echte Geschäftsdaten.
import { STAGE_KEYS, setCascadeVisualizationState } from './cascadeVisualizationState.js'
import { triggerCompletionPulse } from '../water/CompletionPulse.js'

const CATS = ['workflow', 'job', 'content', 'dev']
let timers = []
let t0 = 0
let counter = 0

export function startMockWorkflow() {
  stopMockWorkflow()
  t0 = performance.now() / 1000
  const tick = () => {
    const t = performance.now() / 1000 - t0
    const stages = {}
    STAGE_KEYS.forEach((k, i) => {
      const act = 0.55 + 0.35 * Math.sin(t * 0.21 + i * 1.3) + 0.1 * Math.sin(t * 0.7 + i)
      stages[k] = { activity: Math.min(1, Math.max(0.15, act)), status: 'normal', queued: 0 }
    })
    // Freigabe staut sich periodisch (Demo)
    const phase = t % 50
    if (phase > 22 && phase < 36) stages.approval = { activity: 0.35, status: 'blocked', queued: 3 + Math.floor((phase - 22) / 3) }
    if (phase > 40 && phase < 46) stages.strategy = { activity: 0.2, status: 'idle', queued: 0 }
    setCascadeVisualizationState({ activityLevel: 0.62 + 0.25 * Math.sin(t * 0.13), stages })
  }
  tick()
  timers.push(setInterval(tick, 1000))
  const scheduleCompletion = () => {
    const id = setTimeout(() => {
      triggerCompletionPulse(`MOCK-${++counter}`, CATS[counter % CATS.length])
      scheduleCompletion()
    }, 4000 + Math.random() * 5000)
    timers.push(id)
  }
  scheduleCompletion()
}

export function stopMockWorkflow() {
  timers.forEach((t) => { clearInterval(t); clearTimeout(t) })
  timers = []
}
