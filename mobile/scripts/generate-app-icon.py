"""Generate Android launcher icons from mobile/src/assets/images/logo.png"""
from PIL import Image, ImageDraw
import os

ROOT = os.path.join(os.path.dirname(__file__), "..")
LOGO_PATH = os.path.join(ROOT, "src", "assets", "images", "logo.png")
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")

DENSITIES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

BG = (255, 255, 255)


def make_square_icon(logo: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (*BG, 255))
    pad = max(4, int(size * 0.08))
    inner = size - pad * 2
    resized = logo.resize((inner, inner), Image.LANCZOS)
    if resized.mode == "RGBA":
        canvas.paste(resized, (pad, pad), resized)
    else:
        canvas.paste(resized.convert("RGBA"), (pad, pad))
    return canvas


def make_round_icon(square: Image.Image) -> Image.Image:
    size = square.size[0]
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(square, (0, 0), mask)
    return out


def main():
    logo = Image.open(LOGO_PATH).convert("RGBA")
    for folder, size in DENSITIES.items():
        out_dir = os.path.join(RES, folder)
        os.makedirs(out_dir, exist_ok=True)
        square = make_square_icon(logo, size)
        round_icon = make_round_icon(square)
        square.convert("RGB").save(os.path.join(out_dir, "ic_launcher.png"), "PNG")
        round_icon.save(os.path.join(out_dir, "ic_launcher_round.png"), "PNG")
        print(f"{folder}: {size}px")


if __name__ == "__main__":
    main()
