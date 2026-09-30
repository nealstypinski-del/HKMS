import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { GEO, type V3 } from './primitives'
import { makeCanvasTexture } from './screens'

interface TextPanelProps {
  pos: V3
  /** Größe in Weltmaßen */
  size: [number, number]
  /** Auflösung in Pixeln */
  px?: [number, number]
  rot?: V3
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  /** Neu zeichnen, wenn sich diese Werte ändern */
  deps?: readonly unknown[]
}

/** Fläche mit Canvas Inhalt (Schilder, Statusanzeigen, Whiteboards). */
export function TextPanel({ pos, size, px = [512, 256], rot, draw, deps = [] }: TextPanelProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const texture = useMemo(() => makeCanvasTexture(px[0], px[1], draw), deps)
  const material = useMemo(() => new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }), [texture])
  useEffect(() => () => {
    texture.dispose()
    material.dispose()
  }, [texture, material])
  return <mesh geometry={GEO.plane} material={material} position={pos} rotation={rot} scale={[size[0], size[1], 1]} />
}

export function fillRound(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}
