"""
Herkules HQ Asset-Kit (Blender 4.x, headless):

    python blender/build_kit.py            # GLB-Export nach visual-spike/public/models + Vorschau
    python blender/build_kit.py --no-render

Stil: Low-Poly, wenige Materialien, dunkle Holz-Rückwände mit großem Schild, Glastrennwände,
Bildschirme mit Gesicht, große Köpfe. Blickrichtung aller Assets: Blender -Y (in glTF +Z).
Materialnamen 'shirt', 'hair', 'skin' bleiben in den GLBs erhalten, damit sie in three.js umgefärbt werden können.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'visual-spike', 'public', 'models')
PREVIEW = os.path.join(ROOT, 'blender', 'preview.png')
_mats = {}


def hexrgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    lin = lambda c: ((c / 255 + 0.055) / 1.055) ** 2.4 if c / 255 > 0.04045 else c / 255 / 12.92
    return tuple(lin(int(h[i:i + 2], 16)) for i in (0, 2, 4)) + (1,)


def mat(name, color, rough=0.8, metal=0.0, emit=0.0, alpha=1.0):
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexrgb(color)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = hexrgb(color)
        b.inputs['Emission Strength'].default_value = emit
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
    _mats[name] = m
    return m


def link(o, col):
    for c in o.users_collection:
        c.objects.unlink(o)
    col.objects.link(o)
    return o


def box(col, at, loc, size, m, name='box'):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(at[0] + loc[0], at[1] + loc[1], at[2] + loc[2]))
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    return link(o, col)


def cyl(col, at, loc, r, h, m, verts=12, name='cyl'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(at[0] + loc[0], at[1] + loc[1], at[2] + loc[2]))
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(m)
    return link(o, col)


def ico(col, at, loc, r, m, sub=1, scale=(1, 1, 1), smooth=False, name='ico'):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=(at[0] + loc[0], at[1] + loc[1], at[2] + loc[2]))
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    if smooth:
        bpy.ops.object.shade_smooth()
    return link(o, col)


def new_col(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


# ----------------------------------------------------------------- Assets
def monitor(col, at, loc=(0, 0, 0), w=0.72):
    x, y, z = loc
    body = mat('metal', '#2a3142', 0.5, 0.3)
    screen = mat('screen', '#16233f', 0.3, 0, 0.15)
    face = mat('screenface', '#7dffe8', 0.4, 0, 4.0)
    box(col, at, (x, y, z + 0.06), (0.12, 0.12, 0.12), body, 'mon_foot')
    box(col, at, (x, y, z + 0.36), (w + 0.08, 0.05, 0.44), body, 'mon_body')
    box(col, at, (x, y - 0.03, z + 0.36), (w, 0.01, 0.36), screen, 'mon_screen')
    # Gesicht: zwei Augen und ein Lächeln aus fünf Klötzen
    for ex in (-0.13, 0.13):
        box(col, at, (x + ex, y - 0.04, z + 0.42), (0.05, 0.01, 0.07), face, 'eye')
    for i, (sx, sz) in enumerate([(-0.11, 0.30), (-0.055, 0.275), (0, 0.265), (0.055, 0.275), (0.11, 0.30)]):
        box(col, at, (x + sx, y - 0.04, z + sz), (0.045, 0.01, 0.03), face, 'smile')


def desk(col, at=(0, 0, 0), monitors=1):
    top = mat('desktop', '#efe7d8', 0.7)
    leg = mat('deskleg', '#2f3648', 0.5, 0.3)
    box(col, at, (0, 0, 0.72), (1.7, 0.85, 0.06), top, 'desk_top')
    for sx in (-0.78, 0.78):
        box(col, at, (sx, 0, 0.36), (0.06, 0.75, 0.72), leg, 'desk_leg')
    xs = {1: [0], 2: [-0.42, 0.42], 3: [-0.56, 0, 0.56]}[monitors]
    for x in xs:
        monitor(col, at, (x, 0.22, 0.75), 0.52 if monitors == 3 else 0.72)
    box(col, at, (0, -0.15, 0.755), (0.5, 0.18, 0.02), mat('keyboard', '#f6f6f6', 0.6), 'keyboard')


def chair(col, at=(0, 0, 0)):
    m = mat('chair', '#3b4258', 0.7)
    dark = mat('chairbase', '#1d2130', 0.6)
    box(col, at, (0, 0, 0.42), (0.5, 0.5, 0.07), m, 'seat')
    box(col, at, (0, 0.22, 0.75), (0.5, 0.07, 0.6), m, 'back')
    cyl(col, at, (0, 0, 0.2), 0.04, 0.4, dark, 8, 'stem')
    box(col, at, (0, 0, 0.03), (0.5, 0.5, 0.05), dark, 'base')


def tree(col, at=(0, 0, 0), scale=1.0):
    pot = mat('pot', '#e9e4da', 0.8)
    trunk = mat('trunk', '#7a5636', 0.9)
    greens = [mat('leafA', '#4f9a63', 0.9), mat('leafB', '#3f8654', 0.9), mat('leafC', '#5fae72', 0.9)]
    s = scale
    cyl(col, at, (0, 0, 0.25 * s), 0.3 * s, 0.5 * s, pot, 8, 'pot')
    cyl(col, at, (0, 0, 0.9 * s), 0.07 * s, 0.9 * s, trunk, 6, 'trunk')
    for i, (dx, dy, dz, r) in enumerate([(0, 0, 1.75, 0.6), (0.35, 0.1, 1.45, 0.42), (-0.32, -0.12, 1.5, 0.45), (0.05, 0.3, 1.95, 0.35)]):
        o = ico(col, at, (dx * s, dy * s, dz * s), r * s, greens[i % 3], 1, (1, 1, 0.9), False, 'canopy')


def glass_partition(col, at=(0, 0, 0), length=3.0, height=1.15):
    frame = mat('glassframe', '#8b93a6', 0.4, 0.5)
    glass = mat('glass', '#bfe3ff', 0.05, 0, 0, 0.25)
    box(col, at, (0, 0, 0.03), (length, 0.06, 0.06), frame, 'rail_low')
    box(col, at, (0, 0, height), (length, 0.06, 0.05), frame, 'rail_top')
    for i in range(int(length / 1.0) + 1):
        box(col, at, (-length / 2 + i * (length / max(1, int(length / 1.0))), 0, height / 2), (0.05, 0.06, height), frame, 'post')
    box(col, at, (0, 0, height / 2), (length, 0.02, height - 0.06), glass, 'glass')


def bookshelf(col, at=(0, 0, 0)):
    wood = mat('shelfwood', '#4a2f22', 0.8)
    box(col, at, (0, 0, 0.9), (0.9, 0.3, 1.8), wood, 'shelf_body')
    colors = ['#d94f4f', '#e8b04a', '#4a90d9', '#7bc47f', '#e8e2d0', '#a06bd6']
    for row in range(4):
        for i in range(6):
            box(col, at, (-0.33 + i * 0.13, -0.05, 0.35 + row * 0.42), (0.09, 0.2, 0.28 + 0.04 * ((i + row) % 3)), mat('book%d' % ((i + row) % 6), colors[(i + row) % 6], 0.7), 'book')


def sign(col, at, text, width=4.0, z=1.9):
    board = mat('signboard', '#0b0d12', 0.6)
    white = mat('signtext', '#ffffff', 0.5, 0, 2.5)
    box(col, at, (0, 0, z), (width, 0.1, 0.9), board, 'sign_board')
    bpy.ops.object.text_add(location=(at[0], at[1] - 0.08, at[2] + z - 0.17), rotation=(math.pi / 2, 0, 0))
    t = bpy.context.active_object
    t.data.body = text
    t.data.align_x = 'CENTER'
    t.data.size = 0.42
    t.data.extrude = 0.01
    bpy.ops.object.convert(target='MESH')
    t.data.materials.append(white)
    t.name = 'sign_text'
    link(t, col)


def pod_wall(col, at=(0, 0, 0), title='HERKULES', width=6.0, height=2.6):
    slat = [mat('slatA', '#3a2519', 0.8), mat('slatB', '#452c1e', 0.8), mat('slatC', '#2f1e14', 0.8)]
    n = int(width / 0.18)
    for i in range(n):
        box(col, at, (-width / 2 + 0.09 + i * 0.18, 0.05, height / 2), (0.16, 0.1, height), slat[i % 3], 'slat')
    sign(col, at, title, width * 0.6, height * 0.72)
    bookshelf(col, (at[0] - width / 2 + 0.6, at[1] - 0.2, at[2]))
    bookshelf(col, (at[0] + width / 2 - 0.6, at[1] - 0.2, at[2]))


def sofa(col, at=(0, 0, 0)):
    m = mat('sofa', '#3a3f4f', 0.9)
    box(col, at, (0, 0, 0.25), (2.0, 0.9, 0.5), m, 'sofa_seat')
    box(col, at, (0, 0.35, 0.7), (2.0, 0.22, 0.55), m, 'sofa_back')
    for sx in (-0.9, 0.9):
        box(col, at, (sx, 0, 0.5), (0.2, 0.9, 0.5), m, 'sofa_arm')


def lamp(col, at=(0, 0, 0)):
    cyl(col, at, (0, 0, 0.75), 0.02, 1.5, mat('lampstem', '#222', 0.5, 0.5), 6, 'stem')
    cyl(col, at, (0, 0, 0.02), 0.18, 0.04, mat('lampbase', '#222', 0.5, 0.5), 10, 'base')
    cyl(col, at, (0, 0, 1.6), 0.2, 0.3, mat('lampshade', '#fff4dc', 0.6, 0, 1.2), 10, 'shade')


def bollard(col, at=(0, 0, 0)):
    cyl(col, at, (0, 0, 0.4), 0.07, 0.8, mat('bollard', '#14161c', 0.5, 0.2), 8, 'bollard')


def bench(col, at=(0, 0, 0)):
    wood = mat('benchwood', '#a5673a', 0.8)
    box(col, at, (0, 0, 0.4), (1.8, 0.4, 0.07), wood, 'bench_top')
    for sx in (-0.75, 0.75):
        box(col, at, (sx, 0, 0.2), (0.06, 0.35, 0.4), mat('benchleg', '#2a2a30', 0.5), 'bench_leg')


def character(col, at=(0, 0, 0), sit=False):
    skin, hair, shirt = mat('skin', '#f1c9a5', 0.8), mat('hair', '#2b2118', 0.9), mat('shirt', '#ff8a3d', 0.8)
    pants, shoe = mat('pants', '#2c3350', 0.8), mat('shoe', '#f2f2f2', 0.6)
    for sx in (-0.11, 0.11):
        box(col, at, (sx, 0, 0.22), (0.15, 0.17, 0.42), pants, 'leg')
        box(col, at, (sx, -0.04, 0.03), (0.16, 0.24, 0.07), shoe, 'shoe')
        box(col, at, (sx * 2.5, 0, 0.66), (0.1, 0.1, 0.34), shirt, 'arm')
    torso = ico(col, at, (0, 0, 0.7), 0.24, shirt, 2, (1, 0.8, 1.15), True, 'torso')
    ico(col, at, (0, 0, 1.13), 0.3, skin, 2, (1, 1, 1), True, 'head')
    ico(col, at, (0, 0.03, 1.27), 0.315, hair, 2, (1, 1, 0.75), True, 'hair')
    for ex in (-0.09, 0.09):
        ico(col, at, (ex, -0.26, 1.15), 0.035, mat('eye', '#141414', 0.4), 1, (1, 0.5, 1.2), True, 'eye')


ASSETS = {
    'desk': lambda c: desk(c, monitors=2),
    'desk_triple': lambda c: desk(c, monitors=3),
    'chair': chair,
    'tree': tree,
    'glass_partition': glass_partition,
    'bookshelf': bookshelf,
    'pod_wall': lambda c: pod_wall(c, title='HERKULESJOBS'),
    'sofa': sofa,
    'lamp': lamp,
    'bollard': bollard,
    'bench': bench,
    'character': character,
}


def export_all():
    os.makedirs(OUT, exist_ok=True)
    for name, fn in ASSETS.items():
        col = new_col(name)
        fn(col)
        bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection.children[name]
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', use_active_collection=True, export_apply=True)
        print('exportiert', name)
        bpy.context.view_layer.active_layer_collection.exclude = True


# ----------------------------------------------------------------- Vorschau-Szene
def showcase():
    show = new_col('showcase')
    ground = mat('ground', '#4b5060', 0.9)
    cyl(show, (0, 0, 0), (0, 0, -0.15), 14, 0.3, mat('platform', '#20263a', 0.9), 64, 'platform')
    cyl(show, (0, 0, 0), (0, 0, 0.005), 13.6, 0.02, ground, 64, 'floor')
    pod_wall(show, (0, 4.5, 0), 'HERKULESJOBS', 8.0)
    glass_partition(show, (0, -2.2, 0), 8.0)
    for i, x in enumerate((-3, -1, 1, 3)):
        desk(show, (x, 2.5, 0), 2 if i % 2 else 1)
        chair(show, (x, 1.6, 0))
        character(show, (x, 1.6, -0.02))
    tree(show, (-6.5, -3.5, 0), 1.3)
    tree(show, (6.5, -3.0, 0), 1.0)
    sofa(show, (0, -5.5, 0))
    lamp(show, (2.4, -5.4, 0))
    bench(show, (5.0, -6.5, 0))
    for x in (-5, -3.5, 3.5, 5):
        bollard(show, (x, -8.0, 0))
    # Welt, Licht, Kamera
    sc = bpy.context.scene
    sc.world = bpy.data.worlds.new('night')
    sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = hexrgb('#0a1030')
    bg.inputs['Strength'].default_value = 0.6
    bpy.ops.object.light_add(type='SUN', location=(6, -8, 12), rotation=(math.radians(50), 0, math.radians(30)))
    sun = bpy.context.active_object
    sun.data.energy = 3.0
    bpy.ops.object.light_add(type='AREA', location=(0, 0, 6))
    area = bpy.context.active_object
    area.data.energy = 600
    area.data.size = 8
    bpy.ops.object.camera_add(location=(8.5, -11, 7))
    cam = bpy.context.active_object
    bpy.ops.object.empty_add(location=(0, 0.5, 0.9))
    tgt = bpy.context.active_object
    c = cam.constraints.new('TRACK_TO')
    c.target = tgt
    c.track_axis = 'TRACK_NEGATIVE_Z'
    c.up_axis = 'UP_Y'
    cam.data.lens = 32
    sc.camera = cam
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 32
    sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = 1280, 720
    sc.render.filepath = PREVIEW
    bpy.ops.render.render(write_still=True)
    print('Vorschau', PREVIEW)


if __name__ == '__main__':
    bpy.ops.wm.read_factory_settings(use_empty=True)
    export_all()
    if '--no-render' not in sys.argv:
        showcase()
