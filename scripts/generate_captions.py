"""
Generate bilingual image captions and optimise images for web.

Usage:
    1. Copy .env.example to .env and set your OPENROUTER_API_KEY
    2. Run: python scripts/generate_captions.py

For every .jpg in images/ that lacks a caption in captions.md, this script:
  - Rescales the image to max 1200 px (preserving aspect ratio)
  - Saves the optimised copy to images-web/<folder>/<filename>.jpg
  - Sends the optimised image to Gemini 2.5 Flash Image via OpenRouter
  - Appends a bilingual caption to images/captions.md

Progress is saved so you can resume interrupted runs.
"""

import base64
import io
import json
import os
import re
import sys
import time
import mimetypes
from pathlib import Path
from dotenv import load_dotenv
from PIL import Image

load_dotenv()

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    print("ERROR: OPENROUTER_API_KEY not set in .env")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
IMAGES_DIR = ROOT / "images"
WEB_DIR = ROOT / "images-web"
CAPTIONS_FILE = IMAGES_DIR / "captions.md"
PROGRESS_FILE = Path(__file__).resolve().parent / ".caption_progress.json"
MODEL = "google/gemini-2.5-flash-image"
MAX_RETRIES = 3
RETRY_DELAY = 5
MAX_DIM = 1200
JPEG_QUALITY = 85

SYSTEM_PROMPT = """You are writing short, engaging photo captions for a youth sailing camp website (KØS Sejlsport SommerCamp).

For each image, write exactly two caption lines — one in Danish, one in English.

Rules:
- Each caption should be 1-2 short sentences (10-20 words)
- Describe what is actually visible in the image (boat type, weather, action, people, location)
- Then add a warm, energetic note about the experience — the fun, the community, the feeling of sailing
- Tone: energetic, warm, inviting — like a summer camp
- Use active, vivid language
- Do NOT add any extra text, headers, or explanations — only the two caption lines

Respond in this exact format:
DA: <danish caption>
EN: <english caption>
"""


def load_progress() -> set:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return set(json.load(f))
    return set()


def save_progress(processed: set):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(sorted(processed), f, indent=2)


def collect_all_images() -> dict:
    """Return {filename: folder_name} for every .jpg in images/."""
    result = {}
    for folder in sorted(IMAGES_DIR.iterdir()):
        if not folder.is_dir() or folder.name == "web":
            continue
        for jpg in folder.glob("*.jpg"):
            result[jpg.name] = folder.name
    return result


def cleanup_removed(captioned: dict):
    """Remove captions and web files for images that no longer exist in images/."""
    existing = collect_all_images()
    removed_captions = 0
    removed_web = 0

    # --- Clean captions.md ---
    if CAPTIONS_FILE.exists():
        with open(CAPTIONS_FILE, encoding="utf-8") as f:
            content = f.read()

        # Split into blocks by ### heading
        blocks = re.split(r"(?=^### .+\.jpg$)", content, flags=re.MULTILINE)
        header = blocks[0]  # Everything before first ###
        caption_blocks = blocks[1:]

        kept = []
        for block in caption_blocks:
            match = re.match(r"^### (.+\.jpg)$", block, re.MULTILINE)
            if match:
                filename = match.group(1)
                if filename not in existing:
                    removed_captions += 1
                    continue
            kept.append(block)

        if removed_captions:
            with open(CAPTIONS_FILE, "w", encoding="utf-8") as f:
                f.write(header + "".join(kept))

    # --- Clean images-web/ ---
    if WEB_DIR.exists():
        for web_folder in sorted(WEB_DIR.iterdir()):
            if not web_folder.is_dir():
                continue
            for web_jpg in web_folder.glob("*.jpg"):
                if web_jpg.name not in existing:
                    web_jpg.unlink()
                    removed_web += 1
            # Remove empty folders
            if not any(web_folder.iterdir()):
                web_folder.rmdir()

    if removed_captions or removed_web:
        print(
            f"Cleaned up: {removed_captions} caption(s) removed, {removed_web} web image(s) removed\n"
        )
    else:
        print("No stale images found — nothing to clean up.\n")


def load_existing_captions() -> dict:
    """Return {filename: {folder, da, en}} for captions already in captions.md."""
    if not CAPTIONS_FILE.exists():
        return {}
    with open(CAPTIONS_FILE, encoding="utf-8") as f:
        content = f.read()

    result = {}
    blocks = re.split(r"(?=^### .+\.jpg$)", content, flags=re.MULTILINE)
    for block in blocks[1:]:
        match = re.match(r"^### (.+\.jpg)$", block, re.MULTILINE)
        if not match:
            continue
        filename = match.group(1)
        folder_m = re.search(r"^_Folder: (.+?)_$", block, re.MULTILINE)
        da_m = re.search(r"^## Dansk\n(.+?)(?=\n\n|$)", block, re.MULTILINE | re.DOTALL)
        en_m = re.search(
            r"^## English\n(.+?)(?=\n\n|$)", block, re.MULTILINE | re.DOTALL
        )
        result[filename] = {
            "folder": folder_m.group(1) if folder_m else "",
            "da": da_m.group(1).strip() if da_m else "",
            "en": en_m.group(1).strip() if en_m else "",
        }
    return result


def append_caption(filename: str, folder: str, da: str, en: str):
    """Append a caption block to captions.md."""
    # Create file with header if it doesn't exist
    if not CAPTIONS_FILE.exists():
        with open(CAPTIONS_FILE, "w", encoding="utf-8") as f:
            f.write("# Image Captions — KØS Sejlsport SommerCamp\n\n")

    with open(CAPTIONS_FILE, "a", encoding="utf-8") as f:
        f.write(f"### {filename}\n")
        f.write(f"_Folder: {folder}_\n\n")
        f.write(f"## Dansk\n{da}\n\n")
        f.write(f"## English\n{en}\n\n")


def resize_image(src: Path, dst: Path):
    """Resize image to max MAX_DIM px on longest side, save as JPEG."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    img = Image.open(src)
    # Convert to RGB if needed (e.g. RGBA, P mode)
    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")
    # Also auto-rotate based EXIF
    try:
        from PIL import ImageOps

        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    w, h = img.size
    if max(w, h) > MAX_DIM:
        ratio = MAX_DIM / max(w, h)
        new_w = int(w * ratio)
        new_h = int(h * ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)

    img.save(str(dst), "JPEG", quality=JPEG_QUALITY, optimize=True)


def image_to_base64_data_url(image_path: Path) -> str:
    with open(image_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"


def generate_caption(image_path: Path) -> tuple:
    data_url = image_to_base64_data_url(image_path)

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://kossejlsport.dk",
        "X-OpenRouter-Title": "KØS Sejlsport SommerCamp",
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Write a short, engaging caption for this sailing camp photo.",
                    },
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
        "max_tokens": 200,
    }

    for attempt in range(MAX_RETRIES):
        try:
            import requests

            resp = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60,
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"].strip()
            return parse_response(content)
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                wait = RETRY_DELAY * (attempt + 1)
                print(f"  Retry {attempt + 1}/{MAX_RETRIES} after {wait}s: {e}")
                time.sleep(wait)
            else:
                raise


def parse_response(content: str) -> tuple:
    lines = [l.strip() for l in content.strip().split("\n") if l.strip()]
    da = ""
    en = ""

    for line in lines:
        upper = line.upper()
        if upper.startswith("DA:") or upper.startswith("DANSK:"):
            da = line.split(":", 1)[1].strip()
        elif (
            upper.startswith("EN:")
            or upper.startswith("ENGELSK:")
            or upper.startswith("ENGLISH:")
        ):
            en = line.split(":", 1)[1].strip()

    if not da and not en:
        if len(lines) >= 2:
            da, en = lines[0], lines[1]
        elif len(lines) == 1:
            da = en = lines[0]

    return da, en


def main():
    processed = load_progress()
    existing_captions = load_existing_captions()

    # Clean up removed images first
    cleanup_removed(existing_captions)

    done = 0
    skipped = 0
    resized = 0
    errors = 0

    # Collect all images needing captions
    jobs = []
    for folder in sorted(IMAGES_DIR.iterdir()):
        if not folder.is_dir() or folder.name == "web":
            continue
        for jpg in sorted(folder.glob("*.jpg")):
            if jpg.name in existing_captions or str(jpg) in processed:
                skipped += 1
                continue
            jobs.append((folder.name, jpg))

    total = len(jobs) + skipped
    print(
        f"Found {total} images total: {len(jobs)} need captions, {skipped} already done\n"
    )

    if not jobs:
        print("Nothing to do!")
        return

    for i, (folder, jpg) in enumerate(jobs, 1):
        safe_rel = os.fsdecode(os.fsencode(jpg.relative_to(IMAGES_DIR)))
        print(f"[{i}/{len(jobs)}] {safe_rel}")

        # Resize and save to web/
        web_path = WEB_DIR / folder / jpg.name
        try:
            print(f"  resizing ... ", end="", flush=True)
            resize_image(jpg, web_path)
            resized += 1
            print(f"OK ({web_path.stat().st_size // 1024} KB)")
        except Exception as e:
            errors += 1
            print(f"ERROR resizing: {e}")
            continue

        # Generate caption
        try:
            print(f"  analyzing ... ", end="", flush=True)
            da, en = generate_caption(web_path)
            append_caption(jpg.name, folder, da, en)
            processed.add(str(jpg))
            save_progress(processed)
            done += 1
            print(f"OK — DA: {da[:70]}")
        except Exception as e:
            errors += 1
            print(f"ERROR: {e}")

        if i < len(jobs):
            time.sleep(1)

    print(
        f"\nDone! {done} captions generated, {resized} images resized, {errors} errors, {skipped} previously done."
    )
    print(f"Captions: {CAPTIONS_FILE}")
    print(f"Web images: {WEB_DIR}/")
    print(f"Progress: {PROGRESS_FILE}")


if __name__ == "__main__":
    main()
