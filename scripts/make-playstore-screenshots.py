#!/usr/bin/env python3
"""Generate Google Play Store screenshots from existing App Store assets.

Outputs to ./playstore-screenshots/
  - phone/        1080x1920  (4 images, from iPhone 6.9" source)
  - tablet-7/     1200x1920  (4 images, from iPad source)
  - tablet-10/    1600x2560  (4 images, from iPad source)
  - feature-graphic.png  1024x500
"""
from pathlib import Path
import subprocess

import arabic_reshaper
from bidi.algorithm import get_display
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
    draw = ImageDraw.Draw(img, "RGBA")

    # Soft blue radial glow on the right side
    for i in range(80):
        alpha = int(100 * (1 - i / 80))
        r = 700 - i * 8
        cx, cy = 850, 250
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*ACCENT, alpha))

    def find_font(query: str) -> str | None:
        try:
            out = subprocess.check_output(["fc-match", "-f", "%{file}", query], text=True).strip()
            return out or None
        except Exception:
            return None

    # Latin title font — GradeTrackPro needs Latin glyphs
    title_path = (
        find_font("DejaVu Sans:weight=700")
        or find_font("Noto Sans:weight=700")
        or find_font("DejaVu Sans")
    )
    # Arabic subtitle font
    subtitle_path = (
        find_font("Noto Sans Arabic UI:weight=600")
        or find_font("Noto Sans Arabic UI")
        or find_font("Noto Sans Arabic")
    )

    title_font = ImageFont.truetype(title_path, 96) if title_path else ImageFont.load_default()
    subtitle_font = ImageFont.truetype(subtitle_path, 46) if subtitle_path else ImageFont.load_default()

    title = "GradeTrackPro"
    subtitle_ar = "إدارة درجات وحضور الطلاب"
    # Reshape Arabic text and apply bidirectional algorithm so it renders correctly
    reshaped = arabic_reshaper.reshape(subtitle_ar)
    subtitle = get_display(reshaped)

    # Position text with comfortable margins
    x = 70
    y_title = 180
    y_subtitle = 300
    draw.text((x, y_title), title, fill=(255, 255, 255), font=title_font)
    draw.text((x, y_subtitle), subtitle, fill=(203, 213, 225), font=subtitle_font)

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
