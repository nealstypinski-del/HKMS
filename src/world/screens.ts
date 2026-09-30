// Prozedurale Bildschirmtexturen (Canvas). Kein Font Download, keine externen Assets.

import * as THREE from 'three'

export function makeCanvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx, width, height)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export type ScreenKind = 'office' | 'terminal'
export type ScreenMode = 'working' | 'waiting' | 'sleep'

function bars(ctx: CanvasRenderingContext2D, w: number, h: number, colors: string[], seed: number): void {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 9; i++) {
    const y = 56 + i * ((h - 76) / 9)
    const indent = rnd() > 0.6 ? 28 : 0
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)] as string
    ctx.fillRect(18 + indent, y, (w - 60) * (0.25 + rnd() * 0.65) - indent, 9)
  }
}

function drawScreen(kind: ScreenKind, mode: ScreenMode) {
  return (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
    const dark = kind === 'terminal'
    ctx.fillStyle = mode === 'sleep' ? '#182036' : dark ? '#0d1422' : '#f4f7fb'
    ctx.fillRect(0, 0, w, h)
    if (mode === 'sleep') {
      ctx.fillStyle = '#2b3a63'
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, 26, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#182036'
      ctx.beginPath()
      ctx.arc(w / 2 + 10, h / 2 - 6, 22, 0, Math.PI * 2)
      ctx.fill()
      return
    }
    ctx.fillStyle = dark ? '#1b2740' : '#dfe6f2'
    ctx.fillRect(0, 0, w, 32)
    ;['#ff6b6b', '#ffc94d', '#3ddc84'].forEach((c, i) => {
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.arc(18 + i * 18, 16, 5, 0, Math.PI * 2)
      ctx.fill()
    })
    if (mode === 'working') {
      bars(ctx, w, h, dark ? ['#2fd6c0', '#8b7cf6', '#59627f', '#3ddc84'] : ['#ff8a3d', '#5b6ee1', '#9aa6c2', '#2fd6c0'], dark ? 11 : 7)
      if (dark) {
        ctx.fillStyle = '#3ddc84'
        ctx.fillRect(18, h - 26, 12, 14)
      }
    } else {
      ctx.fillStyle = dark ? '#3a2f12' : '#fff3cf'
      ctx.fillRect(w * 0.16, h * 0.28, w * 0.68, h * 0.46)
      ctx.strokeStyle = '#ffc94d'
      ctx.lineWidth = 4
      ctx.strokeRect(w * 0.16, h * 0.28, w * 0.68, h * 0.46)
      ctx.fillStyle = '#ffc94d'
      ctx.fillRect(w * 0.24, h * 0.4, w * 0.5, 10)
      ctx.fillRect(w * 0.24, h * 0.5, w * 0.36, 10)
      ctx.fillStyle = '#3ddc84'
      ctx.fillRect(w * 0.6, h * 0.62, w * 0.2, 16)
    }
  }
}

const screenTextures = new Map<string, THREE.CanvasTexture>()
const screenMaterials = new Map<string, THREE.MeshBasicMaterial>()

export function screenMaterial(kind: ScreenKind, mode: ScreenMode): THREE.MeshBasicMaterial {
  const key = `${kind}:${mode}`
  let m = screenMaterials.get(key)
  if (!m) {
    let tex = screenTextures.get(key)
    if (!tex) {
      tex = makeCanvasTexture(256, 160, drawScreen(kind, mode))
      screenTextures.set(key, tex)
    }
    m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    screenMaterials.set(key, m)
  }
  return m
}

export const screenOffMaterial = new THREE.MeshBasicMaterial({ color: '#0b0f1a' })
