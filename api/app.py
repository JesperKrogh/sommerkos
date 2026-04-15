import os
import re
import random
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.environ.get(
    "BASE_DIR", os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
IMAGES_WEB_DIR = os.environ.get("IMAGES_WEB_DIR", os.path.join(BASE_DIR, "images-web"))
CAPTIONS_FILE = os.environ.get(
    "CAPTIONS_FILE", os.path.join(BASE_DIR, "images", "captions.md")
)

# ── Parse captions.md into {filename: {caption_da, caption_en}} ───────────────


def load_captions() -> dict:
    """Parse the single captions.md file into a lookup dict."""
    captions = {}
    if not os.path.exists(CAPTIONS_FILE):
        return captions
    try:
        with open(CAPTIONS_FILE, encoding="utf-8") as f:
            content = f.read()
        blocks = re.split(r"(?=^### .+\.jpg$)", content, flags=re.MULTILINE)
        for block in blocks[1:]:
            match = re.match(r"^### (.+\.jpg)$", block, re.MULTILINE)
            if not match:
                continue
            filename = match.group(1)
            da = re.search(
                r"^## Dansk\n(.+?)(?=\n\n|$)", block, re.MULTILINE | re.DOTALL
            )
            en = re.search(
                r"^## English\n(.+?)(?=\n\n|$)", block, re.MULTILINE | re.DOTALL
            )
            captions[filename] = {
                "caption_da": da.group(1).strip() if da else "",
                "caption_en": en.group(1).strip() if en else "",
            }
    except Exception:
        pass
    return captions


_captions = load_captions()


def folder_images(folder: str) -> list:
    """Return images + captions for a folder from images-web/."""
    folder_path = os.path.join(IMAGES_WEB_DIR, folder)
    if not os.path.isdir(folder_path):
        return []
    images = []
    for fname in sorted(os.listdir(folder_path)):
        if not fname.lower().endswith(".jpg"):
            continue
        meta = _captions.get(fname, {})
        images.append(
            {
                "filename": fname,
                "url": f"/images/static/{folder}/{fname}",
                **meta,
            }
        )
    return images


@app.route("/api/gallery")
def gallery():
    """Return all folders with image counts and cover images from images-web/."""
    result = []
    if not os.path.isdir(IMAGES_WEB_DIR):
        return jsonify(result)
    for folder in sorted(os.listdir(IMAGES_WEB_DIR)):
        folder_path = os.path.join(IMAGES_WEB_DIR, folder)
        if not os.path.isdir(folder_path):
            continue
        images = [f for f in os.listdir(folder_path) if f.lower().endswith(".jpg")]
        if not images:
            continue
        cover = random.choice(images)
        result.append(
            {
                "folder": folder,
                "count": len(images),
                "cover_url": f"/images/static/{folder}/{cover}",
            }
        )
    return jsonify(result)


@app.route("/api/gallery/<folder>")
def gallery_folder(folder: str):
    """Return images + captions for one folder."""
    images = folder_images(folder)
    if not images:
        return jsonify({"error": "not found"}), 404
    return jsonify({"folder": folder, "images": images})


@app.route("/api/gallery/random")
def gallery_random():
    """Return N random images spread across folders."""
    count = min(int(request.args.get("count", 6)), 50)
    if not os.path.isdir(IMAGES_WEB_DIR):
        return jsonify([])
    folders = [
        f
        for f in os.listdir(IMAGES_WEB_DIR)
        if os.path.isdir(os.path.join(IMAGES_WEB_DIR, f))
    ]
    pool = []
    for folder in folders:
        imgs = folder_images(folder)
        if imgs:
            pool.append({**random.choice(imgs), "folder": folder})
    random.shuffle(pool)
    return jsonify(pool[:count])


@app.route("/api/health")
def health():
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
