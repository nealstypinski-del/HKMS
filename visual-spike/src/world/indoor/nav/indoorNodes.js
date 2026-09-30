// Wegeknoten der HQ Innenwelt. y ist die Höhe der Bodenfläche, so dass Treppen und Rolltreppen linear interpoliert werden.
// Sie sind im selben Wegegraph wie die Außenwelt: ein Agent läuft vom Park durch die Tür bis an den Schreibtisch.
import { ESC, STAIRS } from '../config/hq.layout.js'

const I = (x, z, y = 0, kind = 'indoor') => ({ x, z, y, kind })

export const INDOOR_NODES = {
  'in-door': I(0, -12.6),
  'in-lobby': I(0, -8.5),
  'in-hub-n': I(-1.5, -6.6),
  'in-hub-b': I(-1.5, 4.5),
  'in-hub-c': I(-1.5, 10),
  // Etage 0 Türen und Räume
  'd0-herkules': I(-7, -8), 'r-herkules': I(-9, -8),
  'd0-kaskade': I(-7, 4.5), 'r-kaskade': I(-9, 4.5),
  'd0-cafe': I(-7, 10), 'r-cafe': I(-10, 10),
  'd0-showroom': I(7, -8), 'r-showroom': I(12, -8),
  'd0-oktogon': I(7, 4.5), 'r-oktogon': I(10, 4.5),
  'd0-wilhelm': I(7, 10), 'r-wilhelm': I(10, 10),
  // Treppe (Fuß, Kopf) und Zugänge
  'st-app-b': I(STAIRS.x, -6.6),
  'st-bot': I(STAIRS.x, STAIRS.z0, 0, 'istair'),
  'st-top': I(STAIRS.x, STAIRS.z1, 4.5, 'istair'),
  'st-app-t': I(STAIRS.x, 3.9, 4.5),
  // Rolltreppen: aufwärts (up) und abwärts (dn), gerichtete Kanten
  'esc-up-app': I(1.6, -6.6),
  'esc-up-in': I(1.6, ESC.z0, 0, 'esc'),
  'esc-up-out': I(1.6, ESC.z1, 4.5, 'esc'),
  'esc-up-exit': I(1.6, 4.0, 4.5),
  'esc-dn-app': I(3.4, 4.0, 4.5),
  'esc-dn-in': I(3.4, ESC.z1, 4.5, 'esc'),
  'esc-dn-out': I(3.4, ESC.z0, 0, 'esc'),
  'esc-dn-exit': I(3.4, -6.6),
  // Etage 1
  'f1-hub-n': I(-1.5, -8.5, 4.5),
  'f1-hub-b': I(-1.5, 4.5, 4.5),
  'f1-hub-c': I(-1.5, 10, 4.5),
  'd1-hj': I(-7, -8, 4.5), 'r-hj': I(-9, -9, 4.5),
  'd1-km-a': I(-7, 4.5, 4.5), 'r-km-a': I(-9, 4.5, 4.5),
  'd1-km-b': I(-7, 10, 4.5), 'r-km-b': I(-9, 9, 4.5),
  'd1-vertrieb': I(7, -8, 4.5), 'r-vertrieb': I(8.6, -9, 4.5),
  'd1-ai': I(7, 4.5, 4.5), 'r-ai': I(8.6, 2, 4.5),
  'd1-loewenburg': I(7, 10, 4.5), 'r-loewenburg': I(8.6, 10, 4.5),
}

const L = (a, b, oneWay = false) => ({ a, b, oneWay })
export const INDOOR_LINKS = [
  L('hq-door', 'in-door'), L('in-door', 'in-lobby'), L('in-lobby', 'in-hub-n'), L('in-hub-n', 'in-hub-b'), L('in-hub-b', 'in-hub-c'),
  L('in-lobby', 'd0-herkules'), L('d0-herkules', 'r-herkules'), L('in-lobby', 'd0-showroom'), L('d0-showroom', 'r-showroom'),
  L('in-hub-b', 'd0-kaskade'), L('d0-kaskade', 'r-kaskade'), L('in-hub-b', 'd0-oktogon'), L('d0-oktogon', 'r-oktogon'),
  L('in-hub-c', 'd0-cafe'), L('d0-cafe', 'r-cafe'), L('in-hub-c', 'd0-wilhelm'), L('d0-wilhelm', 'r-wilhelm'),
  // Treppe
  L('in-hub-n', 'st-app-b'), L('st-app-b', 'st-bot'), L('st-bot', 'st-top'), L('st-top', 'st-app-t'), L('st-app-t', 'f1-hub-b'),
  // Rolltreppen (gerichtet)
  L('in-hub-n', 'esc-up-app'), L('esc-up-app', 'esc-up-in'), L('esc-up-in', 'esc-up-out', true), L('esc-up-out', 'esc-up-exit'), L('esc-up-exit', 'f1-hub-b'),
  L('f1-hub-b', 'esc-dn-app'), L('esc-dn-app', 'esc-dn-in'), L('esc-dn-in', 'esc-dn-out', true), L('esc-dn-out', 'esc-dn-exit'), L('esc-dn-exit', 'in-hub-n'),
  // Etage 1
  L('f1-hub-n', 'f1-hub-b'), L('f1-hub-b', 'f1-hub-c'),
  L('f1-hub-n', 'd1-hj'), L('d1-hj', 'r-hj'), L('f1-hub-n', 'd1-vertrieb'), L('d1-vertrieb', 'r-vertrieb'),
  L('f1-hub-b', 'd1-km-a'), L('d1-km-a', 'r-km-a'), L('f1-hub-c', 'd1-km-b'), L('d1-km-b', 'r-km-b'),
  L('f1-hub-b', 'd1-ai'), L('d1-ai', 'r-ai'), L('f1-hub-c', 'd1-loewenburg'), L('d1-loewenburg', 'r-loewenburg'),
]
