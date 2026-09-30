/** Gibt Geometrien, Materialien und Texturen eines Objektbaums frei (verhindert Speicherlecks beim Neustart). */
export function disposeObject(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.isInstancedMesh) o.dispose();
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      for (const key in m) { const v = m[key]; if (v && v.isTexture) v.dispose(); }
      m.dispose();
    }
  });
}
