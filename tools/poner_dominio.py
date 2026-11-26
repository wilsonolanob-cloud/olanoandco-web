"""Sustituye DOMINIO-PENDIENTE por el dominio real antes de publicar.
Uso: python3 tools/poner_dominio.py www.olanoandco.com"""
import sys, pathlib
if len(sys.argv) != 2: sys.exit(__doc__)
dom = sys.argv[1].strip().removeprefix("https://").removeprefix("http://").strip("/")
root = pathlib.Path(__file__).resolve().parent.parent / "public_html"
for f in list(root.glob("*.html")) + [root / "robots.txt", root / "sitemap.xml"]:
    t = f.read_text(encoding="utf-8")
    if "DOMINIO-PENDIENTE" in t:
        f.write_text(t.replace("DOMINIO-PENDIENTE", dom), encoding="utf-8"); print("actualizado", f.name)
