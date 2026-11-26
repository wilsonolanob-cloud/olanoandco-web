"""Prepara los logos de clientes y la foto de Wilson (solo uso en desarrollo).

- Los logos llegan como capturas circulares sobre fondo oscuro: se recorta
  el círculo, se le aplica una máscara redonda y se exporta a WebP.
- La foto de Wilson se endereza según EXIF, se recorta a 4:5 y se exporta.

Uso:  python3 tools/preparar_clientes.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-originales"
OUT = ROOT / "public_html" / "assets" / "img"
OUT_CL = OUT / "clientes"
OUT_CL.mkdir(parents=True, exist_ok=True)

LOGOS = {
    "futurekids": "2.jpg",
    "adagency": "4.jpg",
    "polluelo": "6.jpg",
    "los-palmares": "8.jpg",
    "sst": "10.jpg",
    "a-crecer-consentidos": "12.jpg",
    "art-solutions": "13.jpg",
}


def circle_logo(path, size=320):
    im = Image.open(path).convert("RGB")
    gray = im.convert("L")
    # El círculo es mucho más claro que el fondo gris oscuro de la captura.
    bbox = gray.point(lambda v: 255 if v > 150 else 0).getbbox()
    x0, y0, x1, y1 = bbox
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    r = max(x1 - x0, y1 - y0) / 2 * 0.985  # recorta el borde suavizado
    crop = im.crop((round(cx - r), round(cy - r), round(cx + r), round(cy + r)))
    crop = crop.resize((size, size), Image.LANCZOS)
    big = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(big).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    out = crop.convert("RGBA")
    out.putalpha(big.resize((size, size), Image.LANCZOS))
    return out


for name, file in LOGOS.items():
    circle_logo(SRC / "clientes" / file).save(OUT_CL / f"{name}.webp", "WEBP", quality=90, method=6)

# Foto de Wilson: retrato 4:5 centrado en rostro y torso.
w = ImageOps.exif_transpose(Image.open(SRC / "wilson-olano.jpg")).convert("RGB")
W, H = w.size
cw = W
ch = round(cw * 5 / 4)
top = round(H * 0.02)
if top + ch > H:
    ch = H - top
    cw = round(ch * 4 / 5)
left = (W - cw) // 2
w = w.crop((left, top, left + cw, top + ch)).resize((900, 1125), Image.LANCZOS)
w.save(OUT / "equipo-wilson-olano.webp", "WEBP", quality=84, method=6)
print("ok")
