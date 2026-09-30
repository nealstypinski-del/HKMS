// Konfiguration aller Etagen. Reine Testdaten ohne Businesslogik.
// Diese Struktur soll später von Loop 1 (echte Agenten und Zustände) befüllt werden können.

const S = (name, role, status, p, r = 0, pose = 'sit') => ({ name, role, status, p, r, pose })
const D = (x, z, monitors, name, role, status, terminal) => ({ x, z, monitors, agent: [name, role, status], terminal })

const stat = (label, color) => ({ t: label, c: color })

export const FLOORS = [
  // ---------------------------------------------------------------- Erdgeschoss
  {
    id: 'ground',
    tab: 'Erdgeschoss',
    title: 'Operations Hub',
    palette: {
      bg: '#0b1020', platform: '#1a2240', floor: '#e9e2d3', floorAlt: '#d8cfbc', wall: '#f6f1e7',
      trim: '#ff8a3d', accent: '#2fd6c0', wood: '#b98552', woodDark: '#8a5d38', chair: '#3a4256', screen: '#38e1c6',
    },
    zones: [
      { x: -3.6, z: 0, w: 9.6, d: 10.6, color: '#d8cfbc' },
      { x: 5.5, z: -3.6, w: 6.2, d: 4.6, color: '#c9d6d9' },
      { type: 'circle', x: 5.6, z: 3.2, r: 2.9, color: '#7d8bf0' },
      { x: -3, z: 5.3, w: 7, d: 1.9, color: '#ffd0a8' },
    ],
    windows: [{ x: 5.5, w: 6 }],
    screens: [{
      x: -3, y: 2.4, w: 5.4, h: 2.7, title: 'HERKULES HQ', accent: '#ff8a3d',
      lines: (s) => [
        { t: `${s.total} Agenten online`, c: '#e8fff9', s: 44 },
        { t: `${s.working} arbeiten`, c: '#3ddc84' },
        { t: `${s.waiting} warten auf Freigabe`, c: '#ffc94d' },
        { t: `${s.available} verfügbar · ${s.meeting} im Meeting`, c: '#dfe6f2' },
        { t: 'Heute: 23 Tasks abgeschlossen · 6 Freigaben', c: '#9fb3d1', s: 30 },
      ],
    }],
    props: [
      { t: 'elevator', p: [-8.8, 0, 4], r: Math.PI / 2 },
      { t: 'kitchen', p: [5.5, 0, -5.4] },
      { t: 'bench', p: [-3, 0, 5.3] },
      { t: 'sofa', p: [5.6, 0, 5.3], r: Math.PI, color: '#5b6ee1' },
      { t: 'sofa', p: [8.3, 0, 3.2], r: -Math.PI / 2, color: '#e15b7a', width: 2.0 },
      { t: 'table', p: [5.6, 0, 3.2], size: [1.4, 0.06, 0.8] },
      { t: 'plant', p: [8.2, 0, 5.3], s: 1.3 },
      { t: 'plant', p: [-8.4, 0, -5.4], s: 1.4 },
      { t: 'plant', p: [8.4, 0, -0.6], s: 1.1 },
      { t: 'plant', p: [2.6, 0, 5.4], s: 1 },
    ],
    desks: [
      D(-7, -3.6, 1, 'Lena', 'Lead Research', 'working'), D(-4.6, -3.6, 1, 'Tom', 'Lead Research', 'working'),
      D(-2.2, -3.6, 1, 'Mira', 'Employer Research', 'working'), D(0.2, -3.6, 1, 'Jan', 'Sales', 'waiting'),
      D(-7, -0.6, 1, 'Sofia', 'Sales', 'working'), D(-4.6, -0.6, 1, 'Ali', 'Outreach', 'working'),
      D(-2.2, -0.6, 1, 'Nora', 'Customer Success', 'waiting'), D(0.2, -0.6, 1, 'Ben', 'Recruiting Content', 'working'),
      D(-7, 2.4, 2, 'Kai', 'Codex Developer', 'working'), D(-4.6, 2.4, 2, 'Ida', 'Claude Developer', 'working'),
      D(-2.2, 2.4, 2, 'Paul', 'Reviewer', 'error'), D(0.2, 2.4, 2, 'Emma', 'QA', 'waiting'),
    ],
    seated: [
      S('Max', 'Research', 'available', [-5.2, 0, 5.35]), S('Zoe', 'Sales', 'available', [-3.9, 0, 5.35]),
      S('Leo', 'Trend Scout', 'available', [-2.1, 0, 5.35]), S('Yara', 'Redaktion', 'available', [-0.8, 0, 5.35]),
      S('Clara', 'Manager', 'meeting', [5.2, 0, 5.3]), S('Dio', 'Strategie', 'meeting', [6.1, 0, 5.3]),
      S('Sam', 'Design', 'meeting', [8.3, 0, 3.2], -Math.PI / 2),
    ],
    walkers: [
      { name: 'Finn', role: 'Trend Scout', status: 'working', path: [[2.2, 4.1], [2.2, -4.15], [6.6, -4.15], [2.2, -4.15]], speed: 1.3 },
      { name: 'Ruby', role: 'Creative', status: 'working', path: [[3, 4.1], [-6.4, 4.1]], speed: 1.1 },
      { name: 'Omar', role: 'Partnerships', status: 'working', path: [[7.2, 0.3], [3.8, 0.3], [3.8, 1.6], [7.2, 1.6]], speed: 0.9 },
    ],
  },

  // ---------------------------------------------------------------- Etage 1
  {
    id: 'jobs',
    tab: 'Etage 1 · HerkulesJobs',
    title: 'HerkulesJobs · Recruiting und Vertrieb',
    palette: {
      bg: '#170e0b', platform: '#2a1a14', floor: '#f0e5d0', floorAlt: '#e3d4b8', wall: '#fbf3e6',
      trim: '#ff8a3d', accent: '#ffb347', wood: '#c99a63', woodDark: '#8f6a3f', chair: '#4a4f66', screen: '#ffd27a',
    },
    zones: [
      { x: -6.3, z: -3.5, w: 4.6, d: 3, color: '#ffd9b3', label: 'LEAD RESEARCH' },
      { x: -1.3, z: -3.5, w: 4.6, d: 3, color: '#ffe9a8', label: 'SALES' },
      { x: 3.7, z: -3.5, w: 4.6, d: 3, color: '#c9ecd9', label: 'CUSTOMER SUCCESS' },
      { x: -6.3, z: 0.65, w: 4.6, d: 3, color: '#cfe0ff', label: 'EMPLOYER RESEARCH' },
      { x: -1.3, z: 0.65, w: 4.6, d: 3, color: '#f3cfe6', label: 'OUTREACH' },
      { x: 3.7, z: 0.65, w: 4.6, d: 3, color: '#ffd0c7', label: 'RECRUITING CONTENT' },
      { type: 'circle', x: 7.2, z: 4.5, r: 1.9, color: '#ffb347' },
    ],
    walls: false,
    pods: [
      { type: 'wall', x: -6.3, z: -4.85, w: 4.6, title: 'LEAD RESEARCH' },
      { type: 'wall', x: -1.3, z: -4.85, w: 4.6, title: 'SALES' },
      { type: 'wall', x: 3.7, z: -4.85, w: 4.6, title: 'CUSTOMER SUCCESS' },
      { type: 'glass', x: -6.3, z: -1.1, w: 4.6 },
      { type: 'glass', x: -1.3, z: -1.1, w: 4.6 },
      { type: 'glass', x: 3.7, z: -1.1, w: 4.6 },
    ],
    windows: [],
    screens: [
      {
        x: -6.3, y: 2.6, w: 3.6, h: 1.8, title: 'LEAD RESEARCH', accent: '#ffb347',
        lines: [{ t: '128 Leads recherchiert', c: '#3ddc84' }, { t: '34 Arbeitgeber geprüft', c: '#e8fff9' }, { t: '9 warten auf Review', c: '#ffc94d' }],
      },
      {
        x: -1.3, y: 2.6, w: 3.6, h: 1.8, title: 'SALES', accent: '#ffb347',
        lines: [{ t: 'Follow-ups: 12', c: '#e8fff9' }, { t: 'Drafts: 5', c: '#3ddc84' }, { t: 'Approvals: 3', c: '#ffc94d' }],
      },
      {
        x: 3.7, y: 2.6, w: 3.6, h: 1.8, title: 'CUSTOMER SUCCESS', accent: '#ffb347',
        lines: [{ t: '4 offene Anfragen', c: '#ffc94d' }, { t: 'Ø Antwortzeit 2 h', c: '#e8fff9' }, { t: '17 Kunden aktiv', c: '#3ddc84' }],
      },
    ],
    props: [
      { t: 'elevator', p: [-8.8, 0, 4], r: Math.PI / 2 },
      { t: 'table', p: [-1.3, 0, 4.6], size: [3, 0.06, 1.2], h: 0.75 },
      { t: 'chair', p: [-2.1, 0, 3.65], r: Math.PI },
      { t: 'chair', p: [-0.5, 0, 3.65], r: Math.PI },
      { t: 'chair', p: [-2.1, 0, 5.55], r: 0 },
      { t: 'chair', p: [-0.5, 0, 5.55], r: 0 },
      { t: 'sofa', p: [7.2, 0, 5.4], r: Math.PI, color: '#5b6ee1' },
      { t: 'plant', p: [8.4, 0, -5.3], s: 1.4 },
      { t: 'plant', p: [-8.4, 0, -5.3], s: 1.3 },
      { t: 'plant', p: [4.4, 0, 5.4], s: 1.1 },
    ],
    desks: [
      D(-7.4, -3.6, 3, 'Lena', 'Lead Research', 'working'), D(-5.2, -3.6, 3, 'Tom', 'Lead Research', 'working'),
      D(-2.4, -3.6, 2, 'Sofia', 'Sales', 'working'), D(-0.2, -3.6, 2, 'Jan', 'Sales', 'waiting'),
      D(2.6, -3.6, 1, 'Nora', 'Customer Success', 'waiting'), D(4.8, -3.6, 1, 'Kim', 'Customer Success', 'working'),
      D(-7.4, 0.6, 2, 'Mira', 'Employer Research', 'working'), D(-5.2, 0.6, 2, 'Ole', 'Employer Research', 'working'),
      D(-2.4, 0.6, 1, 'Ali', 'Outreach', 'working'), D(-0.2, 0.6, 1, 'Rita', 'Outreach', 'waiting'),
      D(2.6, 0.6, 1, 'Ben', 'Recruiting Content', 'working'), D(4.8, 0.6, 1, 'Eva', 'Recruiting Content', 'working'),
    ],
    seated: [
      S('Clara', 'Manager', 'meeting', [-2.1, 0, 3.65], 0), S('Dio', 'Strategie', 'meeting', [-0.5, 0, 3.65], 0),
      S('Sam', 'Design', 'meeting', [-2.1, 0, 5.55], Math.PI), S('Zoe', 'Sales', 'meeting', [-0.5, 0, 5.55], Math.PI),
      S('Max', 'Research', 'available', [7.2, 0, 5.35]),
    ],
    walkers: [
      { name: 'Finn', role: 'Sales', status: 'working', path: [[7, 2.7], [-6.5, 2.7]], speed: 1.2 },
      { name: 'Omar', role: 'Customer Success', status: 'working', path: [[6.9, -5], [6.9, 2.7]], speed: 1 },
    ],
  },

  // ---------------------------------------------------------------- Etage 2
  {
    id: 'memes',
    tab: 'Etage 2 · KasselMemes',
    title: 'KasselMemes · Newsroom und Creative Studio',
    palette: {
      bg: '#120c22', platform: '#231a42', floor: '#e8e2f0', floorAlt: '#d9cfe8', wall: '#f3eefb',
      trim: '#e15b9a', accent: '#2fd6c0', wood: '#a6774f', woodDark: '#7a5233', chair: '#5a2e6e', screen: '#7dffe8',
    },
    zones: [
      { x: -5.85, z: -3.5, w: 4.4, d: 3, color: '#cbd8ff', label: 'TREND RESEARCH' },
      { x: -0.1, z: -3.5, w: 6.9, d: 3, color: '#ffe0f0', label: 'REDAKTION' },
      { x: -5.85, z: 0.35, w: 4.4, d: 3.1, color: '#d9f5ea', label: 'CREATIVE' },
      { x: -1.25, z: 0.35, w: 4.4, d: 3.1, color: '#fff1c9', label: 'PARTNERSHIPS' },
      { x: 2.2, z: 0.35, w: 2.4, d: 3.1, color: '#ffd9c7', label: 'COMMUNITY' },
      { x: 7, z: -2, w: 3.6, d: 6, color: '#ffc4e6', label: 'VIDEO / REELS' },
    ],
    walls: false,
    pods: [
      { type: 'wall', x: -5.85, z: -4.85, w: 4.4, title: 'TREND RESEARCH' },
      { type: 'wall', x: -0.1, z: -4.85, w: 6.9, title: 'REDAKTION' },
      { type: 'glass', x: -5.85, z: -1.15, w: 4.4 },
      { type: 'glass', x: -1.25, z: -1.15, w: 4.4 },
      { type: 'glass', x: 2.2, z: -1.15, w: 2.4 },
    ],
    windows: [],
    screens: [
      { x: -7.2, y: 2.6, w: 3.0, h: 1.7, title: 'LOCAL TRENDS', accent: '#2fd6c0', lines: [{ t: '#Kassel Weihnachtsmarkt', c: '#e8fff9', s: 34 }, { t: '+340 % heute', c: '#3ddc84', s: 34 }] },
      { x: -3.6, y: 2.6, w: 3.0, h: 1.7, title: 'TREND VELOCITY', accent: '#2fd6c0', lines: [{ t: '3 Trends steigen', c: '#3ddc84', s: 34 }, { t: '1 flacht ab', c: '#ffc94d', s: 34 }] },
      { x: 0, y: 2.6, w: 3.0, h: 1.7, title: 'CONTENT PIPELINE', accent: '#2fd6c0', lines: [{ t: 'Ideen 14 · Skripte 6', c: '#e8fff9', s: 34 }, { t: 'Schnitt 4 · Bereit 3', c: '#3ddc84', s: 34 }] },
      { x: 3.6, y: 2.6, w: 3.0, h: 1.7, title: 'DRAFTS', accent: '#2fd6c0', lines: [{ t: '5 Entwürfe offen', c: '#ffc94d', s: 34 }, { t: '2 warten auf Freigabe', c: '#e8fff9', s: 34 }] },
      { x: 7.2, y: 2.6, w: 3.0, h: 1.7, title: 'PUBLISHING QUEUE', accent: '#2fd6c0', lines: [{ t: 'Heute 18:00 Reel', c: '#e8fff9', s: 34 }, { t: 'Morgen 12:00 Post', c: '#e8fff9', s: 34 }] },
    ],
    props: [
      { t: 'elevator', p: [-8.8, 0, 4], r: Math.PI / 2 },
      { t: 'ringlight', p: [7, 0, -0.8], r: Math.PI },
      { t: 'sofa', p: [6.5, 0, 5.4], r: Math.PI, color: '#e15b9a' },
      { t: 'table', p: [6.5, 0, 3.6], size: [1.4, 0.06, 0.8] },
      { t: 'plant', p: [-8.4, 0, -5.3], s: 1.3 },
      { t: 'plant', p: [8.5, 0, 5.4], s: 1.4 },
      { t: 'plant', p: [4.6, 0, -5.3], s: 1.1 },
    ],
    desks: [
      D(-7, -3.4, 2, 'Finn', 'Trend Research', 'working'), D(-4.7, -3.4, 2, 'Luca', 'Trend Research', 'working'),
      D(-2.4, -3.4, 1, 'Hannah', 'Redaktion', 'working'), D(-0.1, -3.4, 1, 'Jonas', 'Redaktion', 'waiting'), D(2.2, -3.4, 1, 'Vera', 'Redaktion', 'working'),
      D(-7, 0.4, 2, 'Ruby', 'Creative', 'working'), D(-4.7, 0.4, 2, 'Tim', 'Creative', 'working'),
      D(-2.4, 0.4, 1, 'Omar', 'Partnerships', 'waiting'), D(-0.1, 0.4, 1, 'Anna', 'Partnerships', 'working'),
      D(2.2, 0.4, 1, 'Pia', 'Community', 'working'),
    ],
    seated: [
      S('Lia', 'Creator', 'working', [7, 0, -3], 0, 'stand'),
      S('Nico', 'Video', 'working', [7.9, 0, -0.6], Math.PI, 'stand'),
      S('Emil', 'Community', 'available', [6.5, 0, 5.35]),
    ],
    walkers: [
      { name: 'Kai', role: 'Trend Scout', status: 'working', path: [[-7, 3.0], [4, 3.0]], speed: 1.2 },
      { name: 'Mo', role: 'Community', status: 'working', path: [[5.6, -4.5], [8.4, -4.5], [8.4, 0.6], [5.6, 0.6]], speed: 0.9 },
    ],
  },

  // ---------------------------------------------------------------- Etage 3
  {
    id: 'dev',
    tab: 'Etage 3 · AI / Development',
    title: 'AI / Development · Engineering',
    palette: {
      bg: '#04060d', platform: '#141a2e', floor: '#48547a', floorAlt: '#3d4868', wall: '#39456a',
      trim: '#7cf0ff', accent: '#7cf0ff', wood: '#5c6a94', woodDark: '#3a4566', chair: '#1a2138', screen: '#7cf0ff',
    },
    zones: [
      { x: -2.9, z: -1.5, w: 11.6, d: 7.9, color: '#3d4868' },
      { x: 7.4, z: -2.2, w: 3.2, d: 6, color: '#262e4a', label: 'SERVER' },
    ],
    walls: false,
    pods: [
      { type: 'wall', x: -2.4, z: -4.75, w: 11.6, title: 'ENGINEERING' },
      { type: 'glass', x: -2.4, z: -1.1, w: 11.6 },
    ],
    windows: [],
    screens: [
      { x: -5.85, y: 2.6, w: 3.6, h: 1.8, title: 'BUILD STATUS', accent: '#7cf0ff', bg: '#0a1020', lines: [{ t: '4 Builds grün', c: '#3ddc84' }, { t: '1 Build läuft', c: '#ffc94d' }, { t: '0 fehlgeschlagen', c: '#e8fff9' }] },
      { x: -0.1, y: 2.6, w: 3.6, h: 1.8, title: 'CI / TESTS', accent: '#7cf0ff', bg: '#0a1020', lines: [{ t: '312 Tests bestanden', c: '#3ddc84' }, { t: '2 Tests instabil', c: '#ffc94d' }, { t: 'Coverage 71 %', c: '#e8fff9' }] },
      { x: 5.5, y: 2.6, w: 3.6, h: 1.8, title: 'REVIEW QUEUE', accent: '#7cf0ff', bg: '#0a1020', lines: [{ t: '3 PRs offen', c: '#e8fff9' }, { t: '1 wartet auf dich', c: '#ffc94d' }, { t: '1 mit Fehler', c: '#ff5c5c' }] },
    ],
    props: [
      { t: 'elevator', p: [-8.8, 0, 4], r: Math.PI / 2 },
      { t: 'rack', p: [8.3, 0, -4.4], r: -Math.PI / 2 },
      { t: 'rack', p: [8.3, 0, -3.2], r: -Math.PI / 2 },
      { t: 'rack', p: [8.3, 0, -2.0], r: -Math.PI / 2 },
      { t: 'rack', p: [8.3, 0, -0.8], r: -Math.PI / 2 },
      { t: 'sofa', p: [5.5, 0, 5.4], r: Math.PI, color: '#3a4a7a' },
      { t: 'table', p: [5.5, 0, 3.7], size: [1.4, 0.06, 0.8] },
      { t: 'plant', p: [-8.4, 0, -5.3], s: 1.3 },
      { t: 'plant', p: [8.5, 0, 5.4], s: 1.2 },
    ],
    desks: [
      D(-7, -3.4, 3, 'Kai', 'Codex Developer', 'working', { repo: 'herkulesjobs-web', branch: 'feature/employer-profile', task: 'Build employer dashboard', state: 'working' }),
      D(-4.7, -3.4, 3, 'Ida', 'Claude Developer', 'working', { repo: 'kasselmemes-app', branch: 'feature/trend-feed', task: 'Trend feed API', state: 'working' }),
      D(-2.4, -3.4, 3, 'Jo', 'Codex Developer', 'working', { repo: 'hq-core', branch: 'fix/state-sync', task: 'Sync agent state', state: 'working' }),
      D(-0.1, -3.4, 3, 'Lea', 'Claude Developer', 'working', { repo: 'hq-core', branch: 'feature/providers', task: 'Provider interfaces', state: 'working' }),
      D(2.2, -3.4, 3, 'Ivo', 'Infrastructure', 'waiting', { repo: 'infra', branch: 'main', task: 'Rotate secrets (Freigabe)', state: 'waiting' }),
      D(-7, 0.4, 2, 'Paul', 'Reviewer', 'error'), D(-4.7, 0.4, 2, 'Emma', 'QA', 'waiting'),
      D(-2.4, 0.4, 2, 'Arne', 'Automation', 'working'), D(-0.1, 0.4, 2, 'Suki', 'Research', 'working'),
      D(2.2, 0.4, 2, 'Tara', 'Security', 'working'),
    ],
    seated: [
      S('Zed', 'DevOps', 'available', [5.5, 0, 5.35]),
      S('Uma', 'Reviewer', 'meeting', [4.6, 0, 5.35]),
    ],
    walkers: [
      { name: 'Nils', role: 'Automation', status: 'working', path: [[-6, 3.0], [4.4, 3.0]], speed: 1.2 },
      { name: 'Bo', role: 'Infrastructure', status: 'working', path: [[6.0, -5], [6.0, 2.9]], speed: 1 },
    ],
  },
]

export function floorStats(f) {
  const all = [...f.desks.map((d) => d.agent[2]), ...f.seated.map((s) => s.status), ...f.walkers.map((w) => w.status)]
  const count = (k) => all.filter((s) => s === k).length
  return { total: all.length, working: count('working'), waiting: count('waiting'), available: count('available'), meeting: count('meeting'), error: count('error') }
}
