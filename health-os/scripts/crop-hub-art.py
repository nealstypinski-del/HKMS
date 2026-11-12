"""Schneidet das Hub-Artwork (Herkules HQ) aus dem Entwurfs-Screenshot und blendet eingebrannte HUD-Karten aus.
Aufruf: python3 scripts/crop-hub-art.py <screenshot.webp> public/hub.webp
Koordinaten in Pixeln des 1938x811-Screenshots. Ersetze public/hub.webp später durch sauberes Artwork (ART_RATIO in src/lib/hubConfig.js anpassen).
"""
import sys
from PIL import Image, ImageDraw, ImageFilter

src, out = sys.argv[1], sys.argv[2]
BOX = (628, 92, 1490, 795)
CARDS = [(380, 98, 810, 218), (380, 224, 662, 432), (380, 474, 818, 800), (1128, 100, 1482, 340), (1224, 586, 1550, 800)]  # Netto-Tunnel, Whoop, Schlaf-Architektur
SCALE = 2

im = Image.open(src).convert('RGB').crop(BOX)
w, h = im.size
mask = Image.new('L', (w * SCALE, h * SCALE), 255)
d = ImageDraw.Draw(mask)
for x0, y0, x1, y1 in CARDS:
    G = 7  # Rand zugeben, damit keine Kartenkanten stehen bleiben
    r = [(x0 - G - BOX[0]) * SCALE, (y0 - G - BOX[1]) * SCALE, (x1 + G - BOX[0]) * SCALE, (y1 + G - BOX[1]) * SCALE]
    d.rounded_rectangle(r, radius=16 * SCALE, fill=0)
mask = mask.filter(ImageFilter.GaussianBlur(12))
big = im.resize((w * SCALE, h * SCALE), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
big.putalpha(mask)
big.save(out, 'WEBP', quality=88)
print(out, big.size, 'ratio', round(w / h, 4))
