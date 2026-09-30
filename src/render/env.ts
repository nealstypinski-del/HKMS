import { Color } from 'three'

/** Gemeinsamer, veränderlicher Umgebungszustand (Tageszeit), von Lichtern, Fassade und Himmel gelesen. */
export const env = { tod: 1, target: 1 }

const DAY = { top: '#5aa6e6', bottom: '#cfe6f5', sun: '#fff2dc', hemiSky: '#cfe6ff', sunI: 2.3, hemiI: 0.95, win: 0.22, star: 0 }
const EVE = { top: '#3b3f7c', bottom: '#f0955a', sun: '#ffb27a', hemiSky: '#c9a0a0', sunI: 1.4, hemiI: 0.8, win: 0.75, star: 0.25 }
const NIGHT = { top: '#060a1a', bottom: '#1b2444', sun: '#8fa8ff', hemiSky: '#5a6aa8', sunI: 0.55, hemiI: 0.62, win: 1.15, star: 1 }

const cs = (h: string) => new Color(h)
export function envColors(tod: number) {
  const [a, b, t] = tod >= 0.5 ? [EVE, DAY, (tod - 0.5) / 0.5] : [NIGHT, EVE, tod / 0.5]
  return {
    top: cs(a.top).lerp(cs(b.top), t),
    bottom: cs(a.bottom).lerp(cs(b.bottom), t),
    sun: cs(a.sun).lerp(cs(b.sun), t),
    hemiSky: cs(a.hemiSky).lerp(cs(b.hemiSky), t),
    sunI: a.sunI + (b.sunI - a.sunI) * t,
    hemiI: a.hemiI + (b.hemiI - a.hemiI) * t,
    win: a.win + (b.win - a.win) * t,
    star: a.star + (b.star - a.star) * t,
    elevation: tod >= 0.5 ? 0.3 + 0.9 * ((tod - 0.5) / 0.5) : 0.25 + 0.5 * (1 - tod / 0.5) * 0.2,
  }
}
