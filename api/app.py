import os
import re
import random
import time
import uuid
import json
from datetime import datetime, timezone
import requests as http_requests
from bs4 import BeautifulSoup
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
    """Return N random images spread across folders, deduplicated by filename."""
    count = min(int(request.args.get("count", 6)), 50)
    if not os.path.isdir(IMAGES_WEB_DIR):
        return jsonify([])

    # Collect all images from all folders
    all_images = []
    for folder in sorted(os.listdir(IMAGES_WEB_DIR)):
        folder_path = os.path.join(IMAGES_WEB_DIR, folder)
        if not os.path.isdir(folder_path):
            continue
        for img in folder_images(folder):
            all_images.append({**img, "folder": folder})

    # Deduplicate by filename
    seen = set()
    unique_images = []
    for img in all_images:
        filename = img["filename"]
        if filename not in seen:
            seen.add(filename)
            unique_images.append(img)

    random.shuffle(unique_images)
    return jsonify(unique_images[:count])


@app.route("/api/gallery/all")
def gallery_all():
    """Return ALL images from ALL folders, shuffled."""
    if not os.path.isdir(IMAGES_WEB_DIR):
        return jsonify([])
    pool = []
    for folder in sorted(os.listdir(IMAGES_WEB_DIR)):
        folder_path = os.path.join(IMAGES_WEB_DIR, folder)
        if not os.path.isdir(folder_path):
            continue
        for img in folder_images(folder):
            pool.append({**img, "folder": folder})
    random.shuffle(pool)
    return jsonify(pool)


HOLDSPORT_URL = (
    "https://www.kossejlsport.dk/widgets/kos-sejlsport"
    "?mobile=false&hide_profile_mobile=false&hide_profile_email=false"
    "&content_type=activities_table&show_price_type_table=false"
    "&allow_price_type_selection=false"
)

_activities_cache = {"data": None, "fetched_at": 0}
ACTIVITIES_TTL = 300


def fetch_activities():
    now = time.time()
    if (
        _activities_cache["data"] is not None
        and now - _activities_cache["fetched_at"] < ACTIVITIES_TTL
    ):
        return _activities_cache["data"]

    try:
        resp = http_requests.get(HOLDSPORT_URL, timeout=15)
        resp.raise_for_status()
    except Exception:
        if _activities_cache["data"] is not None:
            return _activities_cache["data"]
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    activities = []
    for row in soup.select(".activities_table tbody tr"):
        cells = row.find_all("td")
        if len(cells) < 4:
            continue
        date_text = cells[0].get_text(strip=True)
        time_text = " - ".join(
            t.strip()
            for t in cells[1].get_text(separator="\n").split("\n")
            if t.strip()
        )
        activity_div = cells[2].select_one(".activity_name")
        color_div = cells[2].select_one(".event_type_color")
        activity_name = (
            activity_div.get_text(strip=True)
            if activity_div
            else cells[2].get_text(strip=True)
        )
        color = ""
        if color_div and color_div.get("style"):
            m = re.search(r"background-color:\s*(#[0-9a-fA-F]+)", color_div["style"])
            if m:
                color = m.group(1)
        location = cells[3].get_text(strip=True) if len(cells) > 3 else ""
        team = cells[4].get_text(strip=True) if len(cells) > 4 else ""
        activities.append(
            {
                "date": date_text,
                "time": time_text,
                "activity": activity_name,
                "location": location,
                "team": team,
                "color": color,
            }
        )

    _activities_cache["data"] = activities
    _activities_cache["fetched_at"] = now
    return activities


@app.route("/api/activities")
def activities():
    return jsonify(fetch_activities())


# ── Caption suggestions ─────────────────────────────────────────────────────────

CAPTION_ADMIN_TOKEN = os.environ.get("CAPTION_ADMIN_TOKEN", "")
SUGGESTIONS_FILE = os.path.join(BASE_DIR, "data", "caption-suggestions.json")


def _load_suggestions() -> list:
    if not os.path.exists(SUGGESTIONS_FILE):
        return []
    try:
        with open(SUGGESTIONS_FILE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _save_suggestions(suggestions: list):
    os.makedirs(os.path.dirname(SUGGESTIONS_FILE), exist_ok=True)
    with open(SUGGESTIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(suggestions, f, ensure_ascii=False, indent=2)


def _check_admin_token() -> bool:
    if not CAPTION_ADMIN_TOKEN:
        return False
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:] == CAPTION_ADMIN_TOKEN
    token = request.args.get("token", "")
    return token == CAPTION_ADMIN_TOKEN


def _update_captions_md(filename: str, caption_da: str, caption_en: str):
    if not os.path.exists(CAPTIONS_FILE):
        return
    with open(CAPTIONS_FILE, encoding="utf-8") as f:
        content = f.read()

    pattern = rf"(^### {re.escape(filename)}$\n)(.*?)(?=\n### |\Z)"
    match = re.search(pattern, content, re.MULTILINE | re.DOTALL)
    if match:
        new_block = (
            f"### {filename}\n\n## Dansk\n{caption_da}\n\n## English\n{caption_en}\n\n"
        )
        content = content[: match.start()] + new_block + content[match.end() :]
    else:
        content += f"\n### {filename}\n\n## Dansk\n{caption_da}\n\n## English\n{caption_en}\n\n"

    with open(CAPTIONS_FILE, "w", encoding="utf-8") as f:
        f.write(content)


@app.route("/api/caption-suggestions", methods=["GET"])
def get_caption_suggestions():
    return jsonify(_load_suggestions())


@app.route("/api/caption-suggestions", methods=["POST"])
def post_caption_suggestion():
    data = request.get_json()
    if not data or not data.get("folder") or not data.get("filename"):
        return jsonify({"error": "folder and filename required"}), 400
    suggestion = {
        "id": str(uuid.uuid4()),
        "folder": data["folder"],
        "filename": data["filename"],
        "caption_da": data.get("caption_da", ""),
        "caption_en": data.get("caption_en", ""),
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    suggestions = _load_suggestions()
    suggestions.append(suggestion)
    _save_suggestions(suggestions)
    return jsonify(suggestion), 201


@app.route("/api/caption-suggestions/<sid>/approve", methods=["PUT"])
def approve_caption_suggestion(sid: str):
    if not _check_admin_token():
        return jsonify({"error": "unauthorized"}), 401
    suggestions = _load_suggestions()
    suggestion = next((s for s in suggestions if s["id"] == sid), None)
    if not suggestion:
        return jsonify({"error": "not found"}), 404
    _update_captions_md(
        suggestion["filename"],
        suggestion.get("caption_da", ""),
        suggestion.get("caption_en", ""),
    )
    global _captions
    _captions = load_captions()
    suggestions = [s for s in suggestions if s["id"] != sid]
    _save_suggestions(suggestions)
    return jsonify({"ok": True})


@app.route("/api/caption-suggestions/<sid>", methods=["DELETE"])
def reject_caption_suggestion(sid: str):
    if not _check_admin_token():
        return jsonify({"error": "unauthorized"}), 401
    suggestions = _load_suggestions()
    suggestion = next((s for s in suggestions if s["id"] == sid), None)
    if not suggestion:
        return jsonify({"error": "not found"}), 404
    suggestions = [s for s in suggestions if s["id"] != sid]
    _save_suggestions(suggestions)
    return jsonify({"ok": True})


@app.route("/api/health")
def health():
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
