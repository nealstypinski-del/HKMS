/** Teppiche und Läufer. */
export function rug(c, x0, z0, x1, z1, mat) { c.plane(mat, x0, z0, x1, z1, 0.012, Math.max(x1 - x0, z1 - z0)); }
