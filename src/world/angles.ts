/** Kleinster Winkelunterschied von a nach b in Radiant, im Bereich -PI bis PI. */
export const angleDiff = (a: number, b: number): number => {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}
