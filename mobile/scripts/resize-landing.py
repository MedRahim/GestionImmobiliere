"""Resize landing1.png … landing5.png to 1080x2400 for the phone screen."""
from PIL import Image
import os

TARGET_W, TARGET_H = 1080, 2400
FOLDER = os.path.join(
    os.path.dirname(__file__), "..", "src", "assets", "images", "landing"
)


def sample_bg(img: Image.Image) -> tuple[int, int, int]:
    w, h = img.size
    points = [(8, 8), (w - 9, 8), (8, h - 9), (w - 9, h - 9)]
    pixels = [img.getpixel(p) for p in points]
    return tuple(sum(c[i] for c in pixels) // len(pixels) for i in range(3))


def fit_to_phone(src_path: str, dst_path: str) -> None:
    img = Image.open(src_path).convert("RGB")
    bg = sample_bg(img)
    scale = min(TARGET_W / img.width, TARGET_H / img.height)
    new_w = max(1, int(img.width * scale))
    new_h = max(1, int(img.height * scale))
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new("RGB", (TARGET_W, TARGET_H), bg)
    x = (TARGET_W - new_w) // 2
    y = (TARGET_H - new_h) // 2
    canvas.paste(resized, (x, y))
    canvas.save(dst_path, "PNG", optimize=True)
    print(f"{os.path.basename(dst_path)}: {canvas.size} (content {new_w}x{new_h}, bg {bg})")


def main():
    for i in range(1, 6):
        src = os.path.join(FOLDER, f"landing{i}.png")
        dst = os.path.join(FOLDER, f"landing{i}.png")
        fit_to_phone(src, dst + ".tmp")
        os.replace(dst + ".tmp", dst)

    for i in range(1, 6):
        p = os.path.join(FOLDER, f"landing{i}.png")
        print("verify", Image.open(p).size)


if __name__ == "__main__":
    main()
