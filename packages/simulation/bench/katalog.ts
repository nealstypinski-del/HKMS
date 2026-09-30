import { writeFileSync } from 'node:fs';
import { buildLayout, layoutOptionsForRoster, makeRosterOfSize, DEFAULT_LAYOUT_OPTIONS } from '../src/index';

/** Erzeugt docs/GEBAEUDE.md aus dem Layout (Standard Roster mit 22 Agenten). */
const { layout, anchors } = buildLayout(layoutOptionsForRoster(makeRosterOfSize(22)));
const TYPE_DE: Record<string, string> = {
  DESK: 'Schreibtisch', BENCH: 'Bank', SOFA: 'Sofa oder Liege', CHAIR: 'Stuhl', COFFEE_MACHINE: 'Kaffeemaschine', KITCHEN_COUNTER: 'Arbeitsplatte',
  MEETING_SEAT: 'Meetingplatz', WHITEBOARD: 'Whiteboard', WAITING_POINT: 'Warteplatz', ELEVATOR: 'Aufzug', TV: 'Fernseher',
};
const out: string[] = [
  '# Gebäudekatalog (erzeugt, nicht von Hand ändern)',
  '',
  'Erzeugt mit `npx tsx bench/katalog.ts` aus `src/layout.ts`. Rein semantisch, keine Weltkoordinaten. Alle Bezeichnungen sind DEMO Bezeichnungen.',
  'Die `hint` Koordinaten der Anker sind abstrakte Meter zur Wegzeitschätzung, Terminal 3 löst Anker selbst auf.',
  '',
];
for (const f of layout.floors) {
  out.push(`## Etage ${f.index}: ${f.label} (\`${f.id}\`)`, '', '| Zone | Bezeichnung | Art | Anker |', '| --- | --- | --- | --- |');
  for (const z of layout.zones.filter((x) => x.floorId === f.id)) {
    const inZone = Object.values(anchors).filter((a) => a.zoneId === z.id);
    const byType = new Map<string, string[]>();
    for (const a of inZone) byType.set(a.type, [...(byType.get(a.type) ?? []), a.id]);
    const cell = [...byType.entries()].map(([t, ids]) => `${ids.length} ${TYPE_DE[t] ?? t} (\`${ids[0]}\`${ids.length > 1 ? ` bis \`${ids[ids.length - 1]}\`` : ''})`).join(', ');
    out.push(`| \`${z.id}\` | ${z.label} | ${z.kind} | ${cell || '-'} |`);
  }
  out.push('');
}
out.push('## Sofas und Fernseher', '', 'Jedes Sofa außer den Wellness Liegen hat ein `focusAnchorId` auf den Fernseher seiner Lounge (Anker Art `TV`, Kapazität 0). Aktivität `WATCH_TV` ist dort erlaubt. Die Wellness Liegen erlauben `REST`, `SIT` und `READ`.', '');
out.push('## Meetingräume', '', layout.zones.filter((z) => z.kind === 'MEETING_ROOM').map((z) => `- \`${z.id}\` (${z.label}, ${Object.values(anchors).filter((a) => a.zoneId === z.id && a.type === 'MEETING_SEAT').length} Plätze)`).join('\n'), '');
void DEFAULT_LAYOUT_OPTIONS;
writeFileSync(new URL('../docs/GEBAEUDE.md', import.meta.url), out.join('\n'));
console.log(`docs/GEBAEUDE.md geschrieben: ${layout.floors.length} Etagen, ${layout.zones.length} Zonen, ${Object.keys(anchors).length} Anker`);
