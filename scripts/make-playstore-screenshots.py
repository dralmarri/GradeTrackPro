#!/usr/bin/env python3
"""Generate Google Play Store screenshots from existing App Store assets.

Outputs to ./playstore-screenshots/
  - phone/        1080x1920  (4 images, from iPhone 6.9" source)
  - tablet-7/     1200x1920  (4 images, from iPad source)
  - tablet-10/    1600x2560  (4 images, from iPad source)
  - feature-graphic.png  1024x500
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "appstore-screenshots"
OUT = ROOT / "playstore-screenshots"

BG = (15, 23, 42)        # #0F172A — app dark background
ACCENT = (59, 130, 246)  # #3B82F6 — primary blue

PHONE_SRC = [SRC / f"iphone-6.9-0{i}.png" for i in range(1, 5)]
TAB_SRC   = [SRC / f"ipad-13-0{i}.png"    for i in range(1, 5)]

TARGETS = [
    ("phone",     (1080, 1920), PHONE_SRC),
    ("tablet-7",  (1200, 1920), TAB_SRC),
    ("tablet-10", (1600, 2560), TAB_SRC),
]


def fit_on_canvas(src_path: Path, size: tuple[int, int], bg=BG, margin=0.04) -> Image.Image:
    canvas = Image.new("RGB", size, bg)
    img = Image.open(src_path).convert("RGB")
    cw, ch = size
    iw, ih = img.size
    max_w = int(cw * (1 - 2 * margin))
    max_h = int(ch * (1 - 2 * margin))
    scale = min(max_w / iw, max_h / ih)
    new_w, new_h = int(iw * scale), int(ih * scale)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    canvas.paste(img, ((cw - new_w) // 2, (ch - new_h) // 2))
    return canvas


def make_feature_graphic(path: Path):
    W, H = 1024, 500
    img = Image.new("RGB", (W, H), BG)
    # Simple radial-ish gradient overlay using rectangles
    draw = ImageDraw.Draw(img, "RGBA")
    for i in range(80):
        alpha = int(120 * (1 - i / 80))
        r = 600 - i * 6
        cx, cy = 780, 250
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(59, 130, 246, alpha))

    # Title (Arabic) — fallback to default if font missing
    title_ar = "GradeTrackPro"
    subtitle_ar = "إدارة درجات وحضور الطلاب"
    title_font = subtitle_font = None
    for candidate in [
        "/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]:
        if Path(candidate).exists():
            title_font = ImageFont.truetype(candidate, 84)
            break
    for candidate in [
        "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]:
        if Path(candidate).exists():
            subtitle_font = ImageFont.truetype(candidate, 42)
            break
    if title_font is None:
        title_font = ImageFont.load_default()
    if subtitle_font is None:
        subtitle_font = ImageFont.load_default()

    draw.text((60, 170), title_ar, fill=(255, 255, 255), font=title_font)
    draw.text((62, 280), subtitle_ar, fill=(203, 213, 225), font=subtitle_font)

    img.save(path, "PNG", optimize=True)


def main():
    OUT.mkdir(exist_ok=True)
    for folder, size, sources in TARGETS:
        d = OUT / folder
        d.mkdir(exist_ok=True)
        for idx, src in enumerate(sources, 1):
            out_path = d / f"{folder}-{idx:02d}.png"
            fit_on_canvas(src, size).save(out_path, "PNG", optimize=True)
            print(f"  {out_path.relative_to(ROOT)}  ({size[0]}x{size[1]})")
    make_feature_graphic(OUT / "feature-graphic.png")
    print(f"  {(OUT / 'feature-graphic.png').relative_to(ROOT)}  (1024x500)")
    print("Done.")


if __name__ == "__main__":
    main()
