from pathlib import Path
from PIL import Image

SOURCE_DIR = Path("assets/images")
QUALITY = 82
MAX_WIDTH = 1125

for png_path in SOURCE_DIR.rglob("*.png"):
    webp_path = png_path.with_suffix(".webp")

    if webp_path.exists():
        print(f"Skip existing: {webp_path}")
        continue

    with Image.open(png_path) as img:
        img = img.convert("RGB")

        if img.width > MAX_WIDTH:
            ratio = MAX_WIDTH / img.width
            new_size = (MAX_WIDTH, round(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)

        img.save(webp_path, "WEBP", quality=QUALITY, method=6)
        print(f"Created: {webp_path}")