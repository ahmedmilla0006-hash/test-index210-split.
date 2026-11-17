#!/usr/bin/env python3
"""Generate Aya launcher and status-bar notification icons for Android."""
from pathlib import Path
from PIL import Image
import shutil

icon_path = Path("app-source/icon.png")

if not icon_path.exists():
    raise SystemExit("ERROR: icon.png was not found.")

original = Image.open(icon_path).convert("RGBA")

base = Path(
    "android-app/android/app/src/main/res"
)

sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192
}

for folder, size in sizes.items():
    target_dir = base / folder
    target_dir.mkdir(parents=True, exist_ok=True)

    resized = original.resize(
        (size, size),
        Image.Resampling.LANCZOS
    )

    resized.save(
        target_dir / "ic_launcher.png",
        "PNG"
    )

    resized.save(
        target_dir / "ic_launcher_round.png",
        "PNG"
    )

    for f in target_dir.glob("ic_launcher*"):
        if f.name not in [
            "ic_launcher.png",
            "ic_launcher_round.png"
        ]:
            f.unlink(missing_ok=True)

fg_size = 432

canvas = Image.new(
    "RGBA",
    (fg_size, fg_size),
    (0, 0, 0, 0)
)

icon_size = int(fg_size * 0.72)

icon_resized = original.resize(
    (icon_size, icon_size),
    Image.Resampling.LANCZOS
)

offset = (
    (fg_size - icon_size) // 2
)

canvas.paste(
    icon_resized,
    (offset, offset),
    icon_resized
)

xxx = base / "mipmap-xxxhdpi"

xxx.mkdir(
    parents=True,
    exist_ok=True
)

canvas.save(
    xxx / "ic_launcher_foreground.png",
    "PNG"
)

bg = Image.new(
    "RGBA",
    (fg_size, fg_size),
    (13, 27, 42, 255)
)

bg.save(
    xxx / "ic_launcher_background.png",
    "PNG"
)

anydpi = base / "mipmap-anydpi-v26"

if anydpi.exists():
    shutil.rmtree(anydpi)

anydpi.mkdir(
    parents=True,
    exist_ok=True
)

xml = (
    '<?xml version="1.0" encoding="utf-8"?>'
    '<adaptive-icon '
    'xmlns:android='
    '"http://schemas.android.com/apk/res/android">'
    '<background '
    'android:drawable='
    '"@mipmap/ic_launcher_background"/>'
    '<foreground '
    'android:drawable='
    '"@mipmap/ic_launcher_foreground"/>'
    '</adaptive-icon>'
)

(
    anydpi / "ic_launcher.xml"
).write_text(
    xml,
    encoding="utf-8"
)

(
    anydpi / "ic_launcher_round.xml"
).write_text(
    xml,
    encoding="utf-8"
)

# أيقونة الإشعار (شريط الحالة) — بنفس أسلوب أيقونة التطبيق
# مصدرها نفس icon.png في المشروع، وتُولَّد لكل كثافة بشكل نظامي
# يجب أن تكون بيضاء/شفافة (silhouette) لتعمل على كل الأجهزة
try:
    src0 = original.convert("RGBA")
    w, h = src0.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    src0 = src0.crop((left, top, left + side, top + side))

    def to_white_silhouette(img):
        img = img.copy()
        pixels = img.load()
        ww, hh = img.size
        for yy in range(hh):
            for xx in range(ww):
                r, g, b, a = pixels[xx, yy]
                if a < 40:
                    pixels[xx, yy] = (0, 0, 0, 0)
                else:
                    pixels[xx, yy] = (255, 255, 255, a)
        return img

    # أحجام قياسية لأيقونات الإشعار (status bar)
    notif_sizes = {
        "drawable-mdpi": 24,
        "drawable-hdpi": 36,
        "drawable-xhdpi": 48,
        "drawable-xxhdpi": 72,
        "drawable-xxxhdpi": 96,
    }
    for folder, size in notif_sizes.items():
        ddir = base / folder
        ddir.mkdir(parents=True, exist_ok=True)
        resized = src0.resize((size, size), Image.Resampling.LANCZOS)
        white = to_white_silhouette(resized)
        out = ddir / "ic_stat_aya.png"
        white.save(out, "PNG")
        print("Notification icon:", out, size)

    # نسخة افتراضية في drawable/ للتوافق
    ddef = base / "drawable"
    ddef.mkdir(parents=True, exist_ok=True)
    fallback = src0.resize((48, 48), Image.Resampling.LANCZOS)
    to_white_silhouette(fallback).save(ddef / "ic_stat_aya.png", "PNG")
    print("Notification icon default: drawable/ic_stat_aya.png")
except Exception as e:
    print("WARN: could not generate ic_stat_aya:", e)

print("Aya icon improved successfully.")
