import asyncio
import base64
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import unquote, urlparse

import boto3
import httpx
from flask import Flask, Response, jsonify, request

try:
    import google.generativeai as genai  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    genai = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# --- Cloudflare R2 / S3 Configuration ---
# Ideally these are environment variables:
# export AWS_ACCESS_KEY_ID="xxx"
# export AWS_SECRET_ACCESS_KEY="xxx"
# export R2_ENDPOINT_URL="https://<accountid>.r2.cloudflarestorage.com"
# export R2_BUCKET_NAME="my-bucket"

s3 = boto3.client(
    "s3",
    endpoint_url=os.getenv("R2_ENDPOINT_URL"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

BUCKET_NAME = os.getenv("R2_BUCKET_NAME")

RAPIDAPI_KEY = os.getenv("INSTAGRAM_RAPIDAPI_KEY")
RAPIDAPI_HOST = os.getenv("INSTAGRAM_RAPIDAPI_HOST", "instagram120.p.rapidapi.com")
RAPIDAPI_BASE_URL = os.getenv("INSTAGRAM_RAPIDAPI_BASE_URL", f"https://{RAPIDAPI_HOST}")
RAPIDAPI_ENDPOINT_PATH = os.getenv("INSTAGRAM_RAPIDAPI_PATH", "/api/instagram/posts")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_TABLE = os.getenv("SUPABASE_TABLE", "transcriptions")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash")

GEMINI_MODEL = None
if GEMINI_API_KEY and genai:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        GEMINI_MODEL = genai.GenerativeModel(GEMINI_MODEL_NAME)
    except Exception as exc:  # pragma: no cover - configuration failure
        logger.error("Failed to configure Gemini client: %s", exc)
elif not genai and GEMINI_API_KEY:
    logger.warning("google-generativeai package not installed; Gemini support unavailable")


@app.route('/hello', methods=['GET'])
def hello():
    return jsonify({"message": "Hello, world!"})


@app.route('/echo', methods=['POST'])
def echo():
    data = request.get_json()
    return jsonify({"you_sent": data})


@app.route('/transcribe-image', methods=['POST'])
def transcribe_image():
    """
    Expected input JSON:
    {
      "filename": "image_name_in_bucket.png"
    }
    """
    try:
        data = request.get_json()
        filename = data.get("filename")

        if not filename:
            return jsonify({"error": "Missing 'filename' field"}), 400

        # Fetch image bytes from Cloudflare R2
        obj = s3.get_object(Bucket=BUCKET_NAME, Key=filename)
        img_bytes = obj["Body"].read()

        # Get the MIME type if stored, otherwise default to jpeg
        content_type = obj.get("ContentType", "image/jpeg")

        # Return raw image data to the caller (useful if your next step is OCR/AI processing)
        return Response(img_bytes, mimetype=content_type)

    except s3.exceptions.NoSuchKey:
        return jsonify({"error": "Image not found in bucket"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/process-instagram', methods=['POST'])
def process_instagram_workflow():
    """Trigger the end-to-end Instagram -> Gemini -> Supabase pipeline."""
    payload = request.get_json(silent=True) or {}
    username = payload.get("username")
    max_id = payload.get("max_id")

    if not username:
        return jsonify({"error": "Missing 'username' field"}), 400

    try:
        result = asyncio.run(_instagram_pipeline(username=username, max_id=max_id))
        return jsonify(result)
    except Exception as exc:  # pragma: no cover - runtime safety
        logger.exception("Instagram pipeline failed for %s", username)
        return jsonify({"error": str(exc)}), 500


async def _instagram_pipeline(username: str, max_id: Optional[str] = None) -> Dict[str, Any]:
    if not RAPIDAPI_KEY:
        raise RuntimeError("Missing INSTAGRAM_RAPIDAPI_KEY environment variable")
    if not BUCKET_NAME:
        raise RuntimeError("Missing R2_BUCKET_NAME environment variable")
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Supabase credentials are not configured")
    if not GEMINI_MODEL:
        raise RuntimeError("Gemini client unavailable; ensure google-generativeai is installed and GEMINI_API_KEY is set")

    logger.info("Starting Instagram pipeline for %s", username)
    posts_payload = await _fetch_instagram_posts(username=username, max_id=max_id)
    image_entries = _extract_image_entries(posts_payload)

    if not image_entries:
        logger.info("No images found for %s", username)
        return {
            "username": username,
            "requested_images": 0,
            "cached_images": 0,
            "stored_records": 0,
            "records": [],
        }

    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
        download_tasks = [
            _download_and_cache_image(client, entry, username) for entry in image_entries
        ]
        download_results = await asyncio.gather(*download_tasks, return_exceptions=True)

    successful_downloads: List[Dict[str, Any]] = []
    for entry, result in zip(image_entries, download_results):
        if isinstance(result, Exception):
            logger.warning("Failed to cache image %s: %s", entry.get("url"), result)
            continue
        successful_downloads.append(result)

    if not successful_downloads:
        logger.info("No images cached for %s", username)
        return {
            "username": username,
            "requested_images": len(image_entries),
            "cached_images": 0,
            "stored_records": 0,
            "records": [],
        }

    transcription_tasks = [
        _transcribe_image_async(item["image_bytes"], item["content_type"])
        for item in successful_downloads
    ]
    transcription_results = await asyncio.gather(*transcription_tasks, return_exceptions=True)

    records_to_store: List[Dict[str, Any]] = []
    for download_result, transcription in zip(successful_downloads, transcription_results):
        if isinstance(transcription, Exception):
            logger.warning(
                "Gemini transcription failed for %s: %s",
                download_result.get("image_url"),
                transcription,
            )
            continue

        record = {
            "username": username,
            "image_url": download_result["image_url"],
            "s3_key": download_result["s3_key"],
            "transcription": transcription,
            "content_type": download_result["content_type"],
            "processed_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        }
        records_to_store.append(record)

    stored_records: List[Dict[str, Any]] = []
    if records_to_store:
        stored_records = await _store_records_in_supabase(records_to_store)

    logger.info(
        "Completed Instagram pipeline for %s: %s processed, %s stored",
        username,
        len(records_to_store),
        len(stored_records),
    )

    return {
        "username": username,
        "requested_images": len(image_entries),
        "cached_images": len(successful_downloads),
        "stored_records": len(stored_records),
        "records": stored_records,
    }


async def _fetch_instagram_posts(username: str, max_id: Optional[str] = None) -> Dict[str, Any]:
    payload = {"username": username, "maxId": max_id or ""}
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
        response = await client.post(
            f"{RAPIDAPI_BASE_URL}{RAPIDAPI_ENDPOINT_PATH}", json=payload, headers=headers
        )
        response.raise_for_status()
        return response.json()


def _extract_image_entries(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract the list of image URLs from the RapidAPI payload."""
    if not payload:
        return []

    body = payload.get("data") or payload.get("body") or payload
    items = []
    if isinstance(body, dict):
        items = body.get("items") or body.get("edges") or []
    elif isinstance(body, list):
        items = body

    image_entries: List[Dict[str, Any]] = []

    for item in items or []:
        candidates: List[str] = []
        if isinstance(item, dict):
            candidates.extend(_extract_candidates_from_item(item))
        for url in candidates:
            image_entries.append({
                "url": url,
                "media_id": item.get("id") if isinstance(item, dict) else None,
            })

    return image_entries


def _extract_candidates_from_item(item: Dict[str, Any]) -> List[str]:
    candidates: List[str] = []

    image_versions = item.get("image_versions2")
    if isinstance(image_versions, dict):
        versions = image_versions.get("candidates") or []
        for version in versions:
            url = version.get("url") if isinstance(version, dict) else None
            if url:
                candidates.append(url)

    carousel_media = item.get("carousel_media")
    if isinstance(carousel_media, list):
        for media in carousel_media:
            if isinstance(media, dict):
                candidates.extend(_extract_candidates_from_item(media))

    if not candidates and "display_url" in item:
        candidates.append(item.get("display_url"))

    return [url for url in candidates if url]


async def _download_and_cache_image(client: httpx.AsyncClient, entry: Dict[str, Any], username: str) -> Dict[str, Any]:
    image_url = entry.get("url")
    if not image_url:
        raise ValueError("Image URL missing from entry")

    response = await client.get(image_url)
    response.raise_for_status()

    content_type = response.headers.get("Content-Type", "image/jpeg")
    image_bytes = response.content
    filename = _build_filename_from_url(image_url)

    s3_key = await asyncio.to_thread(
        _upload_image_to_s3,
        username,
        filename,
        image_bytes,
        content_type,
    )

    return {
        "username": username,
        "image_url": image_url,
        "s3_key": s3_key,
        "content_type": content_type,
        "image_bytes": image_bytes,
    }


def _build_filename_from_url(url: str) -> str:
    parsed = urlparse(url)
    filename = os.path.basename(parsed.path)
    filename = unquote(filename)
    if not filename:
        filename = f"image-{uuid.uuid4().hex}.jpg"
    return filename


def _upload_image_to_s3(username: str, filename: str, image_bytes: bytes, content_type: str) -> str:
    key = f"instagram/{username}/{filename}"
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=key,
        Body=image_bytes,
        ContentType=content_type,
    )
    return key


async def _transcribe_image_async(image_bytes: bytes, content_type: str) -> str:
    return await asyncio.to_thread(_transcribe_image_sync, image_bytes, content_type)


def _transcribe_image_sync(image_bytes: bytes, content_type: str) -> str:
    if not GEMINI_MODEL:
        raise RuntimeError("Gemini model is not configured")

    encoded_image = base64.b64encode(image_bytes).decode("ascii")
    prompt_parts = [
        {
            "mime_type": content_type,
            "data": encoded_image,
        },
        {
            "text": "Provide a concise description of this Instagram image suitable for alt-text or transcription.",
        },
    ]

    response = GEMINI_MODEL.generate_content(prompt_parts)
    text = getattr(response, "text", None)
    if text:
        return text.strip()

    candidates = getattr(response, "candidates", None)
    for candidate in candidates or []:
        content = getattr(candidate, "content", None)
        if not content:
            continue
        parts = getattr(content, "parts", None)
        if not parts:
            continue
        for part in parts:
            part_text = getattr(part, "text", None)
            if part_text:
                return part_text.strip()

    return ""


async def _store_records_in_supabase(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}", json=records, headers=headers
        )
        response.raise_for_status()
        try:
            return response.json()
        except ValueError:  # pragma: no cover - defensive fallback
            return []


# Run the server
if __name__ == '__main__':
    app.run(debug=True, port=5000)
