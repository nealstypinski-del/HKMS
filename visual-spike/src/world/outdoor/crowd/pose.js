// Posen der Figuren: reine Funktionen ohne Rendering (prüfbar in Node). Winkel in Radiant.
const hash = (n) => { const x = Math.sin(n * 91.3458) * 43758.5453; return x - Math.floor(x) }

// Pose aus Aktivität berechnen: liefert Gelenkwinkel in Radiant
export function computePose(a, t, out) {
  const s = a.phase
  const act = a.activity
  const o = out
  o.bob = 0; o.lean = 0; o.twist = 0; o.headX = 0; o.headY = 0
  o.legL = 0; o.legR = 0; o.armLx = 0; o.armRx = 0; o.armLz = 0; o.armRz = 0; o.drop = 0
  if (act === 'WALK' || act === 'RUN') {
    const run = act === 'RUN'
    const A = run ? 1.05 : 0.75
    const sw = Math.sin(s)
    o.legL = sw * A; o.legR = -sw * A
    o.armLx = -sw * (run ? 1.1 : 0.8) + (run ? -0.55 : 0); o.armRx = sw * (run ? 1.1 : 0.8) + (run ? -0.55 : 0)
    o.armLz = run ? 0.12 : 0.05; o.armRz = run ? -0.12 : -0.05
    o.bob = Math.abs(Math.cos(s)) * (run ? 0.11 : 0.05)
    o.lean = run ? 0.28 : 0.06
    o.twist = sw * (run ? 0.22 : 0.12)
    o.headX = -o.lean * 0.6
  } else if (act === 'SIT' || act === 'TYPE' || act === 'TALK_SIT') {
    o.legL = o.legR = -1.5
    o.headY = Math.sin(t * 0.7 + a.seed * 9) * 0.25
    if (act === 'TYPE') {
      const k = t * 9 + a.seed * 20
      o.armLx = -1.25 + Math.sin(k) * 0.09; o.armRx = -1.25 + Math.sin(k * 1.3 + 1.7) * 0.09
      o.armLz = 0.18; o.armRz = -0.18
      o.lean = 0.12; o.headX = 0.12 + Math.sin(t * 0.5 + a.seed) * 0.06
    } else if (act === 'TALK_SIT') {
      const k = t * 3.3 + a.seed * 7
      o.armLx = -0.9 + Math.sin(k) * 0.35; o.armRx = -0.9 - Math.sin(k * 0.8 + 1) * 0.45
      o.armLz = 0.25; o.armRz = -0.25
      o.headY = Math.sin(t * 1.4 + a.seed * 5) * 0.35; o.headX = Math.sin(t * 2.1 + a.seed) * 0.08
    } else {
      o.armLx = -0.9; o.armRx = -0.9; o.armLz = 0.1; o.armRz = -0.1
    }
  } else if (act === 'TALK') {
    const k = t * 3.1 + a.seed * 7
    o.armRx = -1.1 + Math.sin(k) * 0.5; o.armRz = -0.3
    o.armLx = -0.5 + Math.sin(k * 0.7 + 2) * 0.3; o.armLz = 0.2
    o.headY = Math.sin(t * 1.2 + a.seed * 5) * 0.3; o.headX = Math.sin(t * 2 + a.seed) * 0.1
    o.bob = Math.sin(t * 1.5 + a.seed) * 0.01
  } else if (act === 'DRINK') {
    const k = (Math.sin(t * 0.8 + a.seed * 3) + 1) / 2
    o.armRx = -1.2 - k * 1.1; o.armRz = -0.15
    o.armLx = -0.5; o.headX = -0.12 * k
  } else if (act === 'STRETCH') {
    const k = Math.sin(t * 1.3 + a.seed)
    o.armLx = o.armRx = -2.9; o.armLz = 0.25; o.armRz = -0.25
    o.lean = 0; o.twist = 0; o.bob = 0
    o.legL = k * 0.05
    o.headX = -0.2
    o.twist = k * 0.3
  } else if (act === 'WAVE') {
    o.armRx = -2.6; o.armRz = -0.3 + Math.sin(t * 9) * 0.4
  } else if (act === 'ERROR') {
    o.headY = Math.sin(t * 7) * 0.35; o.armRx = -2.3 + Math.sin(t * 6) * 0.1; o.armLx = -0.4
  } else { // IDLE, REST
    o.armLx = Math.sin(t * 1.1 + a.seed) * 0.05; o.armRx = -Math.sin(t * 1.1 + a.seed) * 0.05
    o.headY = Math.sin(t * 0.5 + a.seed * 6) * 0.4
    o.bob = Math.sin(t * 1.6 + a.seed) * 0.006
  }
  return o
}

