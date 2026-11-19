"""Generate launcher assets from the existing approved white Dongjak artwork."""
from pathlib import Path
import argparse
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/icons/dongjak-light-1024.png"
RES = ROOT / "android/app/src/main/res"
IOS = ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset"
SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
RESAMPLE = Image.Resampling.LANCZOS

def artwork():
    with Image.open(SOURCE) as original:
        if original.size != (1024, 1024):
            raise ValueError("Unexpected source icon size")
        image = original.convert("RGBA")
    if image.getchannel("A").getbbox() is None:
        raise ValueError("Empty source icon")
    return image

def white_canvas(image, size):
    canvas = Image.new("RGBA", (size, size), "white")
    canvas.alpha_composite(image.resize((size, size), RESAMPLE))
    return canvas.convert("RGB")

def save_checked(image, path, size, mode):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)
    with Image.open(path) as result:
        if result.size != (size, size) or result.mode != mode:
            raise ValueError(f"Invalid generated icon: {path}")

def android(image):
    background = RES / "values/ic_launcher_background.xml"
    if "#FFFFFF" not in background.read_text(encoding="utf-8"):
        raise ValueError("Expected white adaptive launcher background")
    for density, legacy in SIZES.items():
        folder = RES / f"mipmap-{density}"
        fixed = white_canvas(image, legacy)
        for name in ("ic_launcher.png", "ic_launcher_round.png"):
            save_checked(fixed, folder / name, legacy, "RGB")
        adaptive = legacy * 108 // 48
        safe = round(adaptive * 66 / 108)
        foreground = Image.new("RGBA", (adaptive, adaptive), (0, 0, 0, 0))
        foreground.alpha_composite(image.resize((safe, safe), RESAMPLE),
                                   ((adaptive - safe) // 2, (adaptive - safe) // 2))
        save_checked(foreground, folder / "ic_launcher_foreground.png", adaptive, "RGBA")

def ios(image):
    if not IOS.is_dir():
        raise ValueError("Capacitor iOS app icon asset catalog not found")
    # Apple distribution icon must be opaque and square. The OS supplies the mask.
    name = "Dongjak-AppIcon-1024.png"
    save_checked(white_canvas(image, 1024), IOS / name, 1024, "RGB")
    (IOS / "Contents.json").write_text(json.dumps({
        "images": [{"filename": name, "idiom": "universal", "platform": "ios", "size": "1024x1024"}],
        "info": {"author": "xcode", "version": 1}
    }, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("platform", choices=["android", "ios"])
    platform = parser.parse_args().platform
    globals()[platform](artwork())
    print("Generated verified white Dongjak launcher icons:", platform)
