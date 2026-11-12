// Besetzung aus den Etagendaten des Visual Spikes (src/data/floors.js): Namen, Rollen und Status kommen von dort.
// Die vier Etagen des Spikes (HerkulesJobs, KasselMemes, AI und Entwicklung, Erdgeschoss) werden auf die Räume der Innenwelt verteilt.
import { FLOORS } from '../../data/floors.js'
import { DESK_ANCHORS } from '../indoor/nav/indoorAnchors.js'

const DEPT_RULES = [
  ['vertrieb', /sales|outreach|customer|partnership/i],
  ['ai', /developer|reviewer|qa|infrastructure|automation|security|devops|codex|claude/i],
  ['km', /redaktion|creative|trend|community|creator|video|design/i],
  ['hj', /research|recruiting|employer|lead|manager|strateg/i],
]
export const deptOf = (role) => (DEPT_RULES.find(([, re]) => re.test(role)) || ['hj'])[0]

// Rollen zu konkreten Aufgaben (Kaskadenstufe wird für den Lichtpuls verwendet)
const TASKS = {
  vertrieb: ['Angebot vorbereiten', 'Follow up senden', 'Lead qualifizieren'],
  ai: ['Pull Request prüfen', 'Testlauf auswerten', 'Agent Skript verbessern'],
  km: ['Infobeitrag schreiben', 'Nachricht prüfen', 'Gewinnspiel planen', 'Meme entwerfen'],
  hj: ['Arbeitgeber recherchieren', 'Berufsvideo planen', 'Leads sichten'],
}
export const taskTitles = (dept) => TASKS[dept] || TASKS.hj

export function buildRoster() {
  const seen = new Set()
  const people = []
  for (const id of ['jobs', 'memes', 'dev', 'ground']) {
    const f = FLOORS.find((x) => x.id === id)
    if (!f) continue
    for (const d of f.desks) people.push({ name: d.agent[0], role: d.agent[1], status: d.agent[2], src: id })
    for (const s of f.seated) people.push({ name: s.name, role: s.role, status: s.status, src: id })
    for (const w of f.walkers) people.push({ name: w.name, role: w.role, status: w.status, src: id })
  }
  const unique = people.filter((p) => (seen.has(p.name) ? false : (seen.add(p.name), true)))
  const free = new Set(DESK_ANCHORS.map((d) => d.id))
  const byRoom = (room) => DESK_ANCHORS.filter((d) => d.room === room)
  // Verfügbare Agenten zuerst, damit auch sie einen Platz haben, zu dem sie zurückkehren
  const ordered = [...unique.filter((p) => p.status === 'available'), ...unique.filter((p) => p.status !== 'available')]
  for (const p of ordered) {
    p.dept = deptOf(p.role)
    let desk = byRoom(p.dept).find((d) => free.has(d.id))
    if (!desk) desk = DESK_ANCHORS.filter((d) => d.room !== 'lobby').find((d) => free.has(d.id))
    if (desk) { free.delete(desk.id); p.desk = desk }
  }
  return unique
}
