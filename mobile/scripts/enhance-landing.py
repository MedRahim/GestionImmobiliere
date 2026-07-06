"""
Fit landing slides to 1080x2400: trim empty borders, upscale with Lanczos,
pad to phone ratio — full content visible, no crop.
"""
from PIL import Image, ImageEnhance
import os

TARGET_W, TARGET_H = 1080, 2400
FOLDER = os.path.join(
    os.path.dirname(__file__), "..", "src", "assets", "images", "landing"
)


def flatten_rgba(img: Image.Image) -> Image.Image:
    if img.mode == "RGBA":
        bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
        bg.alpha_composite(img)
        return bg.convert("RGB")
    return img.convert("RGB")


def sample_bg(img: Image.Image) -> tuple[int, int, int]:
    w, h = img.size
    pts = [(4, 4), (w - 5, 4), (4, h - 5), (w - 5, h - 5)]
    pixels = [img.getpixel(p) for p in pts]
    return tuple(sum(c[i] for c in pixels) // len(pixels) for i in range(3))


def content_bbox(img: Image.Image, threshold: int = 18) -> tuple[int, int, int, int]:
    w, h = img.size
    bg = sample_bg(img)
    pixels = img.load()
    left, top, right, bottom = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            p = pixels[x, y]
            if sum(abs(p[i] - bg[i]) for i in range(3)) > threshold:
                found = True
                left = min(left, x)
                right = max(right, x)
                top = min(top, y)
                bottom = max(bottom, y)
    if not found:
        return (0, 0, w, h)
    pad = 2
    return (
        max(0, left - pad),
        max(0, top - pad),
        min(w, right + pad + 1),
        min(h, bottom + pad + 1),
    )


def enhance_landing(path: str) -> None:
    img = flatten_rgba(Image.open(path))
    bg = sample_bg(img)
    bbox = content_bbox(img)
    cropped = img.crop(bbox)

    scale = min(TARGET_W / cropped.width, TARGET_H / cropped.height)
    new_w = max(1, int(cropped.width * scale))
    new_h = max(1, int(cropped.height * scale))
    resized = cropped.resize((new_w, new_h), Image.LANCZOS)
    resized = ImageEnhance.Sharpness(resized).enhance(1.12)

    canvas = Image.new("RGB", (TARGET_W, TARGET_H), bg)
    x = (TARGET_W - new_w) // 2
    y = (TARGET_H - new_h) // 2
    canvas.paste(resized, (x, y))
    canvas.save(path, "PNG", optimize=True)
    print(
        f"{os.path.basename(path)}: {bbox} -> content {new_w}x{new_h} on {TARGET_W}x{TARGET_H}"
    )


def main():
    for i in range(1, 6):
        enhance_landing(os.path.join(FOLDER, f"landing{i}.png"))


if __name__ == "__main__":
    main()
