import type { Accessory, Avatar, HairStyle, Headwear } from './types'

export const SKIN = ['#f1c9a5', '#e0a878', '#c58c5c', '#a86d43', '#7b4b2e', '#5a3521']
export const HAIR_COLORS = ['#2b1d14', '#5a3a22', '#a5682e', '#d8b060', '#c9412d', '#3b3f52', '#8d8f99', '#e8e2d6']
export const SHIRTS = ['#2f7f86', '#c9564a', '#e0b04a', '#4a5670', '#6fa86a', '#8a63b8', '#e8e2d6', '#26282f', '#d97fa0', '#3e7cc0']
export const TROUSERS = ['#2d3242', '#4a4f5c', '#6b5a48', '#3a5a7a', '#8a8f9c', '#1f2229']
export const SHOES = ['#f2f2f2', '#1d1f26', '#a4553a', '#3a6ea8', '#d4a03a']

export const HAIR_STYLES: HairStyle[] = ['short', 'long', 'bun', 'mohawk', 'spiky', 'bald', 'ponytail', 'curly']
export const HEADWEAR: Headwear[] = ['none', 'cap', 'beanie', 'crown']
export const ACCESSORIES: Accessory[] = ['none', 'glasses', 'headphones']

export const DEFAULT_PLAYER: Avatar = {
  skinVariant: 1, hairStyle: 'short', hairVariant: 1, shirtVariant: 9, trousersVariant: 3, shoesVariant: 0, headwear: 'none', accessory: 'none',
}

// Kleiner deterministischer Zufall, damit Agenten bei gleichem Seed gleich aussehen.
export function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

export function randomAvatar(seed: string): Avatar {
  const r = mulberry(hashString(seed))
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)]
  const hw = r()
  return {
    skinVariant: Math.floor(r() * SKIN.length),
    hairStyle: pick(HAIR_STYLES),
    hairVariant: Math.floor(r() * HAIR_COLORS.length),
    shirtVariant: Math.floor(r() * SHIRTS.length),
    trousersVariant: Math.floor(r() * TROUSERS.length),
    shoesVariant: Math.floor(r() * SHOES.length),
    headwear: hw < 0.1 ? 'cap' : hw < 0.16 ? 'beanie' : 'none',
    accessory: r() < 0.22 ? 'glasses' : r() < 0.1 ? 'headphones' : 'none',
  }
}
