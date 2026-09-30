# Blender Asset-Kit für das Herkules HQ

Erzeugt alle Assets per Skript (Blender 4.2 headless über das Python-Paket `bpy`) und exportiert sie als GLB.

```
python3.11 -m venv .venv-bpy
.venv-bpy/bin/pip install bpy==4.2.0
.venv-bpy/bin/python blender/build_kit.py              # GLB-Export und Vorschau (blender/preview.png)
.venv-bpy/bin/python blender/build_kit.py --no-render  # nur GLB-Export
```

Die GLB-Dateien landen in `visual-spike/public/models/`. Materialien `shirt`, `hair` und `skin` sind in `character.glb`
benannt, damit three.js sie pro Agent umfärben kann. Blickrichtung aller Assets ist in glTF +Z.

Assets: desk, desk_triple, chair, tree, glass_partition, bookshelf, pod_wall (Holz-Rückwand mit Schild), sofa, lamp, bollard, bench, character.
Noch nicht in die React-Three-Fiber-Szene eingebunden (dafür `useGLTF` verwenden).
