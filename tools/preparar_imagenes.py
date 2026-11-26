"""Prepara logo y fotos de OlanoandCo para la web (solo uso en desarrollo).

- El logo NO se redibuja: se extrae del archivo original convirtiendo el fondo
  en transparencia (la geometría y proporciones quedan intactas).
- Las fotos se recortan y se exportan a WebP optimizado.

Uso:  python3 tools/preparar_imagenes.py
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-originales"
OUT_IMG = ROOT / "public_html" / "assets" / "img"
OUT_BRAND = ROOT / "public_html" / "assets" / "brand"
OUT_IMG.mkdir(parents=True, exist_ok=True)
OUT_BRAND.mkdir(parents=True, exist_ok=True)

NAVY = (11, 31, 58)
WHITE = (247, 247, 245)
BLUE = (83, 109, 255)


def lum(px):
    r, g, b = px[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def alpha_mask(img, bg_lum, fg_lum):
    """Máscara alfa lineal entre la luminancia del fondo y la de la forma."""
    gray = img.convert("RGB").convert("L")
    lo, hi = sorted((bg_lum, fg_lum))
    span = max(hi - lo, 1)
    invert = fg_lum < bg_lum

    def f(v):
        a = (v - lo) / span
        a = 1 - a if invert else a
        a = max(0.0, min(1.0, (a - 0.04) / 0.92))  # limpia ruido del fondo
        return int(round(a * 255))

    return gray.point([f(v) for v in range(256)])


def colorize(mask, rgb):
    im = Image.new("RGBA", mask.size, rgb + (0,))
    im.putalpha(mask)
    return im


def trim(mask, pad=0):
    bbox = mask.point(lambda v: 255 if v > 24 else 0).getbbox()
    x0, y0, x1, y1 = bbox
    return (max(0, x0 - pad), max(0, y0 - pad), min(mask.width, x1 + pad), min(mask.height, y1 + pad))


def save_brand(mask, name, colors):
    for suffix, rgb in colors.items():
        im = colorize(mask, rgb)
        im.save(OUT_BRAND / f"{name}-{suffix}.webp", "WEBP", quality=95, method=6)
        im.save(OUT_BRAND / f"{name}-{suffix}.png", "PNG", optimize=True)


# ---------------------------------------------------------------- símbolo
sym = Image.open(SRC / "logo-simbolo-original.png").convert("RGB")
bg = lum(sym.getpixel((20, 20)))
m = alpha_mask(sym, bg, 255)
m = m.crop(trim(m, pad=6))
save_brand(m, "simbolo", {"blanco": WHITE, "marino": NAVY, "azul": BLUE})
print("símbolo", m.size)

# ------------------------------------------------- logotipo (panel de identidad)
panel = Image.open(SRC / "panel-identidad-original.png").convert("RGB")
top = panel.crop((0, 0, panel.width, 600))
bgl = lum(top.getpixel((30, 30)))
fgl = lum(NAVY)
mt = alpha_mask(top, bgl, fgl)

# Detectar las tres bandas (símbolo, nombre, lema) por filas con tinta
rows = [any(mt.getpixel((x, y)) > 60 for x in range(0, mt.width, 2)) for y in range(mt.height)]
bands, start = [], None
for y, ink in enumerate(rows + [False]):
    if ink and start is None:
        start = y
    elif not ink and start is not None:
        if y - start > 4:
            bands.append((start, y))
        start = None
print("bandas", bands)
sym_band, name_band, tag_band = bands[0], bands[1], bands[-1]

full = mt.crop((0, sym_band[0] - 6, mt.width, tag_band[1] + 6))
full = full.crop(trim(full, pad=6))
save_brand(full, "logotipo-vertical", {"marino": NAVY, "blanco": WHITE})

word = mt.crop((0, name_band[0] - 4, mt.width, name_band[1] + 4))
word = word.crop(trim(word, pad=4))
save_brand(word, "nombre", {"marino": NAVY, "blanco": WHITE})
print("nombre", word.size)

# ------------------------------------------------------------------ favicon
def favicon(size, radius_ratio=0.22):
    base = Image.new("RGBA", (size, size), NAVY + (255,))
    mask = Image.new("L", (size, size), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * radius_ratio), fill=255)
    base.putalpha(mask)
    s = colorize(m, WHITE)
    target = int(size * 0.72)
    s = s.resize((target, int(target * s.height / s.width)), Image.LANCZOS)
    base.alpha_composite(s, ((size - s.width) // 2, (size - s.height) // 2))
    return base

favicon(32).save(OUT_BRAND / "favicon-32.png")
favicon(180, 0).convert("RGB").save(OUT_BRAND / "apple-touch-icon.png")
favicon(512).save(OUT_BRAND / "icon-512.png")

# ------------------------------------------------------------------- fotos
def photo(src, out, box=None, width=1200, quality=80):
    im = ImageOps.exif_transpose(Image.open(SRC / src)).convert("RGB")
    if box:
        im = im.crop(box)
    if im.width > width:
        im = im.resize((width, int(im.height * width / im.width)), Image.LANCZOS)
    im.save(OUT_IMG / out, "WEBP", quality=quality, method=6)
    print(out, im.size)

# Retratos 4:5 (sin alterar a las personas: solo recorte y escala)
photo("eva-duque.jpg", "equipo-eva-duque.webp", box=(0, 40, 854, 40 + 1067), width=900)
photo("antonio-arteaga.jpg", "equipo-antonio-arteaga.webp", box=(160, 260, 160 + 1600, 260 + 2000), width=900)
photo("oficina.jpg", "oficina-olanoandco.webp", width=1100)
photo("edificio-banco-plaza.jpg", "edificio-banco-plaza.webp", box=(0, 300, 1920, 2560), width=1100)

# ---------------------------------------------------- imagen para compartir
og = Image.new("RGB", (1200, 630), NAVY)
lw = colorize(full, WHITE)
lw = lw.resize((520, int(520 * lw.height / lw.width)), Image.LANCZOS)
og.paste(lw, ((1200 - lw.width) // 2, (630 - lw.height) // 2), lw)
og.save(OUT_IMG / "og-olanoandco.jpg", "JPEG", quality=88)
print("listo")
