export const PROFILE = {
  name: 'Neal',
  age: 27,
  heightCm: 189,
  heightM: 1.89,
  startKg: 132.0,
  targetKg: 90.0,
  bmr: 2200,
  kcalCeiling: 1400,
  proteinMinG: 170,
  carbWarnG: 25,
  waterTargetL: 5.5,
  stepTarget: 30000,
  startDate: new Date(2026, 9, 9), // 09.10.2026
  deadline: new Date(2026, 11, 31, 23, 59, 59), // Silvester
}

export const PHASES = [
  { n: 1, month: 'Oktober', short: 'Oktober-Sprint', from: 132, to: 120, color: '#E024E3', dates: '09.10. – 31.10.', focus: 'Maximales Glykogen-Reset und Entwässerung. 30.000 Schritte pro Tag, strikte 1.400 kcal, Retatrutid-Titrierung.' },
  { n: 2, month: 'November', short: 'November-Drift', from: 120, to: 108, color: '#00F0FF', dates: '01.11. – 30.11.', focus: 'Krafterhalt an Maschinen. 22.000–25.000 Schritte, mehr Schwimm-Anteil zur Gelenkentlastung.' },
  { n: 3, month: 'Dezember', short: 'Dezember-Finish', from: 108, to: 95, color: '#00FF66', dates: '01.12. – 31.12.', focus: 'Feinschliff. Grundumsatz sinkt auf ca. 2.000 kcal, Aktivität über Zone-2-Cardio und Krafttraining.' },
  { n: 4, month: 'Finale', short: 'Final Precision Cut', from: 95, to: 90, color: '#FFD60A', dates: 'nach Phase 3', focus: 'Letzter Schnitt von 95,0 auf 90,0 kg. Mastery / Titan Phase, Level 61–80.' },
]

// Schritt-Blöcke (kompensierbar). Rest bis 30.000 = Alltagsschritte (nicht umverteilbar).
export const STEP_BLOCKS = [
  { id: 'b1', label: 'Block 1', name: 'Morgen-Walk', time: '06:00 – 07:15', base: 8000, sub: 'nüchtern · Zone 2 · Lipolyse-Peak', work: 'Voice-Diktat via Headset' },
  { id: 'b2', label: 'Block 2', name: 'Flexibler Walk', time: 'Nachmittag · ab 13:30', base: 6000, sub: 'Nachmittags-Marsch', work: 'Telefonate · Strategie-Sessions' },
  { id: 'b3', label: 'Block 3', name: 'Flush & Recovery Walk', time: 'Abend · bis 21:30', base: 6000, sub: 'Abend-Marsch', work: 'Sprachnachrichten · Planung' },
]
export const BASELINE_STEPS = PROFILE.stepTarget - STEP_BLOCKS.reduce((a, b) => a + b.base, 0) // 10.000

export const CROSSFIT = { time: '12:00 – 13:00', minutes: 45, xp: 400 }
export const SWIM = { minutes: 45, kcal: 400 }

export const SCHEDULE = [
  ['05:30', 'SYSTEM IGNITION', 'Wakeup · 0,5 L Wasser · Schuhe an', 'Ignition Beacon'],
  ['06:00 – 07:15', 'FASTED MORNING MARSCH', '1,25 Std · ~8.000 Schritte', 'Zone-2 Lipolysis Peak'],
  ['12:00 – 13:00', 'CROSSFIT IRON RAID', 'Mo–Fr Gym-Session', 'Glycogen Depletion Reiz'],
  ['flexibel', 'SPAT- / ABEND-WALKS', 'bis 30.000 Schritte', 'Step Compensation'],
  ['22:00', 'CURFEW LOCKOUT', 'Bettruhe · STH-Peak', 'Nightly System Freeze'],
]

export const DOSES = [40, 45, 50] // UI an U-100 (50 UI = 0,5 ml)

export const COLORS = {
  cyan: '#00F0FF', emerald: '#00FF66', amber: '#FF9500', crimson: '#FF2D55',
  magenta: '#E024E3', royal: '#007AFF', yellow: '#FFD60A', dim: 'rgba(235,240,255,.66)',
}
