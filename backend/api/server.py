import base64
import datetime as dt
import json
import logging
import os
import uuid
from typing import Any, Dict, List, Optional, Tuple

import boto3
import requests
import resend
from email_templates import (render_digest_email,
                             render_parent_confirmation_email)
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
ALLOWED_ORIGINS = os.getenv("APP_ALLOWED_ORIGINS", "*")
CORS(
    app,
    resources={r"/*": {"origins": ALLOWED_ORIGINS}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Content-Type"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# --- Cloudflare R2 / S3 Configuration ---
s3 = boto3.client(
    "s3",
    endpoint_url=os.getenv("R2_ENDPOINT_URL"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
R2_PUBLIC_BASE_URL = os.getenv("R2_PUBLIC_BASE_URL")
APP_BASE_URL = os.getenv("APP_BASE_URL")


# --- Supabase REST Configuration ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_REST_URL = f"{SUPABASE_URL.rstrip('/')}/rest/v1" if SUPABASE_URL else None
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase_session = requests.Session()
if SUPABASE_SERVICE_KEY:
    supabase_session.headers.update(
        {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
    )


def _supabase_headers(prefer: Optional[str] = None) -> Dict[str, str]:
    if not SUPABASE_SERVICE_KEY:
        raise RuntimeError("Supabase REST configuration is incomplete.")

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def _fetch_authenticated_user(access_token: str) -> Dict[str, Any]:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError("Supabase authentication not configured.")

    response = requests.get(
        f"{SUPABASE_URL.rstrip('/')}/auth/v1/user",
        headers={
            "Authorization": f"Bearer {access_token}",
            "apikey": SUPABASE_SERVICE_KEY,
        },
        timeout=30,
    )

    if response.status_code == 401:
        raise PermissionError("Invalid or expired session token.")

    response.raise_for_status()
    return response.json()


def _upsert_user_profile(payload: Dict[str, Any]) -> Dict[str, Any]:
    headers = _supabase_headers("return=representation,resolution=merge-duplicates")
    response = requests.post(
        f"{SUPABASE_REST_URL}/user_profiles",
        headers=headers,
        data=json.dumps([payload]),
        timeout=30,
    )
    response.raise_for_status()
    body = response.json()
    return body[0] if body else payload


def _insert_parent_confirmation(payload: Dict[str, Any]) -> Dict[str, Any]:
    headers = _supabase_headers("return=representation")
    response = requests.post(
        f"{SUPABASE_REST_URL}/parent_confirmations",
        headers=headers,
        data=json.dumps(payload),
        timeout=30,
    )
    response.raise_for_status()
    body = response.json()
    return body[0] if isinstance(body, list) and body else body


def _upload_voice_sample_for_user(user_id: str, filename: str, body: bytes, content_type: Optional[str]) -> str:
    if not BUCKET_NAME:
        raise RuntimeError("R2 bucket configuration missing. Set R2_BUCKET_NAME.")

    safe_name = filename or "voice-sample"
    safe_name = safe_name.replace(" ", "_")
    key = f"voice-samples/{user_id}/{int(dt.datetime.utcnow().timestamp())}-{safe_name}"

    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=key,
        Body=body,
        ContentType=content_type or "audio/mpeg",
        ACL="private",
    )

    if R2_PUBLIC_BASE_URL:
        return f"{R2_PUBLIC_BASE_URL.rstrip('/')}/{key}"
    return key


def _register_elevenlabs_voice(user_id: str, filename: str, body: bytes, content_type: Optional[str]) -> Optional[str]:
    if not ELEVENLABS_API_KEY:
        logger.warning("ELEVENLABS_API_KEY missing; skipping voice cloning.")
        return None

    files = {
        "files": (
            filename or "voice-sample",
            body,
            content_type or "audio/mpeg",
        )
    }
    data = {"name": f"LifeLoop-{user_id}"}
    try:
        response = requests.post(
            "https://api.elevenlabs.io/v1/voices/add",
            headers={"xi-api-key": ELEVENLABS_API_KEY},
            files=files,
            data=data,
            timeout=120,
        )
        if not response.ok:
            logger.warning("ElevenLabs voice clone failed: %s", response.text)
            return None
        payload = response.json()
        return payload.get("voice_id")
    except Exception as exc:
        logger.exception("Error calling ElevenLabs voice clone: %s", exc)
        return None


# --- RapidAPI Instagram Configuration ---
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
RAPIDAPI_HOST = os.getenv("RAPIDAPI_INSTAGRAM_HOST", "instagram-scraper-api3.p.rapidapi.com")
RAPIDAPI_URL = os.getenv(
    "RAPIDAPI_INSTAGRAM_URL",
    "https://instagram-scraper-api3.p.rapidapi.com/user_posts",
)
RAPIDAPI_TIMEOUT = int(os.getenv("RAPIDAPI_TIMEOUT", "30"))


# --- Gemini Configuration ---
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-pro-vision")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_ENDPOINT = os.getenv(
    "GEMINI_API_ENDPOINT",
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
)
DEFAULT_GEMINI_PROMPT = (
    "You create concise, heartfelt captions (max 40 words) for a family legacy album. "
    "Describe what is happening in the photo and the emotions it may evoke for parents and grandparents. "
    "Write in a warm, conversational tone with one evocative detail."
)


# --- ElevenLabs Configuration ---
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID") or os.getenv("ELEVENLABS_SAMPLE_VOICE_ID")
ELEVENLABS_MODEL_ID = os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")

# --- Resend Configuration ---
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "LifeLoop <noreply@projects.keanuc.net>")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
else:
    logger.warning("RESEND_API_KEY not set; email delivery will be skipped.")

def _require_supabase_configuration() -> None:
    if not SUPABASE_REST_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError("Supabase REST configuration is incomplete. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.")


def _fetch_image_from_r2(storage_key: str) -> Tuple[bytes, str]:
    if not BUCKET_NAME:
        raise RuntimeError("R2 bucket configuration missing. Set R2_BUCKET_NAME.")

    obj = s3.get_object(Bucket=BUCKET_NAME, Key=storage_key)
    content_type = obj.get("ContentType", "image/jpeg")
    return obj["Body"].read(), content_type


def _upload_audio_to_r2(key: str, audio_bytes: bytes, content_type: str) -> str:
    if not BUCKET_NAME:
        raise RuntimeError("R2 bucket configuration missing. Set R2_BUCKET_NAME.")

    s3.put_object(Bucket=BUCKET_NAME, Key=key, Body=audio_bytes, ContentType=content_type, ACL="private")
    if R2_PUBLIC_BASE_URL:
        return f"{R2_PUBLIC_BASE_URL.rstrip('/')}/{key}"
    return key


def _fetch_instagram_media(
    media_id: Optional[str] = None, *, limit: int = 10, only_unprocessed: bool = True
) -> List[Dict[str, Any]]:
    _require_supabase_configuration()
    params: Dict[str, Any] = {"select": "*", "limit": limit, "order": "created_at.desc"}
    if media_id:
        params["id"] = f"eq.{media_id}"
    elif only_unprocessed:
        params["processed_at"] = "is.null"

    response = supabase_session.get(f"{SUPABASE_REST_URL}/instagram_media", params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def _fetch_recent_media_for_user(user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    _require_supabase_configuration()
    params: Dict[str, Any] = {
        "select": "*",
        "user_id": f"eq.{user_id}",
        "processed_at": "not.is.null",
        "order": "processed_at.desc",
        "limit": limit,
    }
    response = supabase_session.get(f"{SUPABASE_REST_URL}/instagram_media", params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def _update_instagram_media(media_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    _require_supabase_configuration()
    response = supabase_session.patch(
        f"{SUPABASE_REST_URL}/instagram_media", params={"id": f"eq.{media_id}"}, data=json.dumps(updates), timeout=30
    )
    response.raise_for_status()
    data = response.json()
    return data[0] if data else updates


def _fetch_profile(profile_id: str) -> Optional[Dict[str, Any]]:
    _require_supabase_configuration()
    response = supabase_session.get(
        f"{SUPABASE_REST_URL}/user_profiles",
        params={"id": f"eq.{profile_id}", "select": "*"},
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    return data[0] if data else None


def _update_profile(profile_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    _require_supabase_configuration()
    response = supabase_session.patch(
        f"{SUPABASE_REST_URL}/user_profiles",
        params={"id": f"eq.{profile_id}"},
        data=json.dumps(updates),
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    return payload[0] if payload else None


def _instagram_media_exists(profile_id: str, source_url: str) -> bool:
    _require_supabase_configuration()
    params = {
        "user_id": f"eq.{profile_id}",
        "source_url": f"eq.{source_url}",
        "select": "id",
        "limit": 1,
    }
    response = supabase_session.get(
        f"{SUPABASE_REST_URL}/instagram_media",
        params=params,
        timeout=15,
    )
    response.raise_for_status()
    return bool(response.json())


def _insert_instagram_media_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not rows:
        return []
    _require_supabase_configuration()
    headers = dict(supabase_session.headers)
    headers["Prefer"] = "return=representation,resolution=merge-duplicates"
    response = supabase_session.post(
        f"{SUPABASE_REST_URL}/instagram_media",
        headers=headers,
        data=json.dumps(rows),
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def _send_parent_confirmation_email(
    *,
    parent_email: str,
    student_name: Optional[str],
    confirmation_url: str,
    instagram_username: Optional[str],
) -> Dict[str, Any]:
    if not RESEND_API_KEY:
        logger.warning("Skipping parent email to %s; RESEND_API_KEY not configured.", parent_email)
        return {"skipped": True, "reason": "missing_api_key"}

    if not confirmation_url:
        raise ValueError("confirmation_url is required to notify parent.")

    subject_student = student_name or "your student"
    subject = f"Confirm LifeLoop sharing for {subject_student}"

    html_body = render_parent_confirmation_email(
        student_name=student_name,
        confirmation_url=confirmation_url,
        instagram_username=instagram_username,
    )
    text_body = (
        f"Hello,\n\n{student_name or 'Your student'} invited you to receive curated updates "
        "from their LifeLoop legacy album. To allow us to fetch Instagram memories and share narrated digests, "
        f"please confirm here: {confirmation_url}\n\nThank you for helping preserve their story!\n"
    )

    params = {
        "from": RESEND_FROM_EMAIL,
        "to": [parent_email],
        "subject": subject,
        "html": html_body,
        "text": text_body,
    }

    try:
        response = resend.Emails.send(params)
        logger.info("Sent parent invite email via Resend to %s", parent_email)
        return response  # Resend returns dict-like payload
    except Exception as exc:
        logger.exception("Failed to deliver parent email via Resend.")
        raise exc


def _parse_instagram_timestamp(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return dt.datetime.utcfromtimestamp(value).isoformat()
    if isinstance(value, str):
        return value
    return None


def _extract_source_url(media: Dict[str, Any]) -> Optional[str]:
    for key in (
        "image_url",
        "display_url",
        "media_url",
        "thumbnail_url",
        "thumbnail_src",
    ):
        url = media.get(key)
        if isinstance(url, str) and url:
            return url

    images = media.get("images") or media.get("image_versions2", {}).get("candidates")
    if isinstance(images, list):
        for item in images:
            url = item.get("url") if isinstance(item, dict) else None
            if url:
                return url
    return None


def _normalise_instagram_media(media: Dict[str, Any]) -> Dict[str, Any]:
    media_id = media.get("id") or media.get("pk") or media.get("code") or str(uuid.uuid4())
    source_url = _extract_source_url(media)
    caption = (
        media.get("caption_text")
        or media.get("caption")
        or media.get("title")
        or ""
    )
    captured_at = _parse_instagram_timestamp(
        media.get("timestamp") or media.get("taken_at") or media.get("created_at")
    )

    return {
        "media_id": str(media_id),
        "source_url": source_url,
        "caption": caption.strip(),
        "captured_at": captured_at,
    }


def _download_remote_media(url: str) -> Optional[Dict[str, Any]]:
    try:
        response = requests.get(url, timeout=RAPIDAPI_TIMEOUT)
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "image/jpeg")
        return {"body": response.content, "content_type": content_type}
    except requests.RequestException as exc:
        logger.warning("Failed to download media %s: %s", url, exc)
        return None


def _build_storage_key(profile_id: str, media_id: str, content_type: str) -> str:
    subtype = (content_type or "image/jpeg").split("/")[-1]
    subtype = subtype.split(";")[0].strip().lower()
    if subtype == "jpeg":
        subtype = "jpg"
    return f"instagram/{profile_id}/{media_id}.{subtype}"


def _upload_media_to_r2(storage_key: str, payload: Dict[str, Any]) -> None:
    if not BUCKET_NAME:
        raise RuntimeError("R2 bucket configuration missing. Set R2_BUCKET_NAME.")
    body = payload["body"]
    content_type = payload["content_type"]
    s3.put_object(Bucket=BUCKET_NAME, Key=storage_key, Body=body, ContentType=content_type)


def _fetch_instagram_posts_via_rapidapi(username: str, limit: int = 12) -> List[Dict[str, Any]]:
    if not RAPIDAPI_KEY:
        raise RuntimeError("RAPIDAPI_KEY not configured; cannot fetch Instagram content.")

    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
    }
    if RAPIDAPI_HOST:
        headers["X-RapidAPI-Host"] = RAPIDAPI_HOST

    params = {"username": username, "amount": limit}
    response = requests.get(RAPIDAPI_URL, headers=headers, params=params, timeout=RAPIDAPI_TIMEOUT)
    response.raise_for_status()
    payload = response.json()

    if isinstance(payload, dict):
        for key in ("data", "items", "results", "posts"):
            items = payload.get(key)
            if isinstance(items, list):
                return items
    elif isinstance(payload, list):
        return payload

    raise ValueError("Unexpected response format from RapidAPI Instagram endpoint.")


def _probability_to_score(probability: Optional[str]) -> float:
    mapping = {
        "NEGLIGIBLE": 0.95,
        "VERY_UNLIKELY": 0.9,
        "UNLIKELY": 0.75,
        "POSSIBLE": 0.6,
        "LIKELY": 0.4,
        "VERY_LIKELY": 0.25,
    }
    if not probability:
        return 0.8
    return mapping.get(probability.upper(), 0.6)


def generate_gemini_caption(image_bytes: bytes, mime_type: str) -> Tuple[str, float]:
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set; returning placeholder caption.")
        return ("A cherished campus moment captured for the family legacy demo.", 0.5)

    inline_data = base64.b64encode(image_bytes).decode("utf-8")
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": DEFAULT_GEMINI_PROMPT},
                    {"inline_data": {"mime_type": mime_type, "data": inline_data}},
                ],
            }
        ]
    }

    response = requests.post(
        GEMINI_API_ENDPOINT,
        params={"key": GEMINI_API_KEY},
        json=payload,
        timeout=60,
    )
    response.raise_for_status()
    body = response.json()
    candidates = body.get("candidates", [])
    if not candidates:
        raise RuntimeError("Gemini returned no candidates.")

    candidate = candidates[0]
    caption_text_parts = candidate.get("content", {}).get("parts", [])
    caption_text = ""
    for part in caption_text_parts:
        if "text" in part:
            caption_text += part["text"]
    caption_text = caption_text.strip()
    if not caption_text:
        raise RuntimeError("Gemini did not return caption text.")

    safety_ratings = candidate.get("safetyRatings", [])
    if safety_ratings:
        scores = [_probability_to_score(item.get("probability")) for item in safety_ratings]
        confidence = sum(scores) / len(scores)
    else:
        confidence = 0.85

    return caption_text, round(confidence, 2)


def synthesize_audio_narration(text: str, media_id: str) -> Tuple[Optional[bytes], Optional[str]]:
    if not ELEVENLABS_API_KEY:
        logger.warning("ELEVENLABS_API_KEY not set; skipping narration synthesis.")
        return None, None

    if not ELEVENLABS_VOICE_ID:
        # TODO: swap default voice with per-student cloned voice once sample capture flow is complete.
        logger.warning("ELEVENLABS_VOICE_ID not set; using ElevenLabs default voice.")
        default_voice = "21m00Tcm4TlvDq8ikWAM"  # Rachel
    else:
        default_voice = ELEVENLABS_VOICE_ID

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{default_voice}"
    payload = {
        "text": text,
        "model_id": ELEVENLABS_MODEL_ID,
        "voice_settings": {
            "stability": 0.4,
            "similarity_boost": 0.6,
            "style": 0.5,
        },
    }

    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
    }

    response = requests.post(url, json=payload, headers=headers, timeout=120)
    response.raise_for_status()
    audio_bytes = response.content
    content_type = response.headers.get("Content-Type", "audio/mpeg")
    return audio_bytes, content_type


def process_media_record(record: Dict[str, Any]) -> Dict[str, Any]:
    storage_key = record.get("storage_key")
    if not storage_key:
        raise ValueError("instagram_media record missing storage_key.")

    image_bytes, mime_type = _fetch_image_from_r2(storage_key)
    caption, confidence = generate_gemini_caption(image_bytes, mime_type)

    audio_url: Optional[str] = None
    if caption:
        audio_bytes, audio_content_type = synthesize_audio_narration(caption, record["id"])
        if audio_bytes:
            audio_ext = ".mp3" if "mpeg" in (audio_content_type or "") else ".wav"
            audio_key = f"narrations/{record['id']}{audio_ext}"
            audio_url = _upload_audio_to_r2(audio_key, audio_bytes, audio_content_type or "audio/mpeg")

    updates = {
        "caption": caption,
        "caption_confidence": confidence,
        "audio_url": audio_url,
        "processed_at": dt.datetime.utcnow().isoformat(),
    }
    updated_record = _update_instagram_media(record["id"], updates)
    return {"record": updated_record}


@app.route("/parent-request", methods=["POST"])
def parent_request() -> Response:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Unauthorized"}), 401

    access_token = auth_header.split(" ", 1)[1].strip()
    if not access_token:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        user = _fetch_authenticated_user(access_token)
    except PermissionError:
        return jsonify({"error": "Unauthorized"}), 401
    except Exception as exc:
        logger.exception("Failed to fetch authenticated Supabase user.")
        return jsonify({"error": str(exc)}), 500

    user_id = user.get("id")
    if not user_id:
        return jsonify({"error": "Unable to determine the current user."}), 400

    content_type = request.headers.get("Content-Type") or ""
    if "multipart/form-data" in content_type:
        payload = request.form
    else:
        payload = request.get_json(silent=True) or {}

    instagram_username = (
        payload.get("instagramUsername") or payload.get("instagram_username") or ""
    ).strip()
    parent_email = (payload.get("parentEmail") or payload.get("parent_email") or "").strip()
    consent_flag = payload.get("consentGranted") or payload.get("consent_granted")

    if not instagram_username:
        return jsonify({"error": "Instagram username is required."}), 400
    if not parent_email:
        return jsonify({"error": "Parent email is required."}), 400
    if str(consent_flag).lower() not in {"true", "1", "yes"}:
        return jsonify({"error": "Consent must be granted before notifying a parent."}), 400

    voice_file = request.files.get("voiceSample") or request.files.get("voice_sample")
    voice_sample_url: Optional[str] = None
    voice_profile_id: Optional[str] = None

    if voice_file and voice_file.filename:
        voice_bytes = voice_file.read()
        if voice_bytes:
            try:
                voice_sample_url = _upload_voice_sample_for_user(
                    user_id,
                    voice_file.filename,
                    voice_bytes,
                    voice_file.mimetype,
                )
            except Exception as exc:
                logger.exception("Failed to upload voice sample for %s", user_id)
                return jsonify({"error": f"Voice sample upload failed: {exc}"}), 500

            voice_profile_id = _register_elevenlabs_voice(
                user_id,
                voice_file.filename,
                voice_bytes,
                voice_file.mimetype,
            )
        else:
            logger.warning("Received empty voice sample for user %s", user_id)

    profile_payload: Dict[str, Any] = {
        "id": user_id,
        "email": user.get("email"),
        "ig_username": instagram_username,
        "parent_email": parent_email,
        "is_parent_confirmed": False,
    }
    if voice_sample_url:
        profile_payload["voice_sample_url"] = voice_sample_url
    if voice_profile_id:
        profile_payload["voice_profile_id"] = voice_profile_id

    try:
        profile = _upsert_user_profile(profile_payload)
    except Exception as exc:
        logger.exception("Failed to upsert user profile for %s", user_id)
        return jsonify({"error": f"Failed to save profile: {exc}"}), 500

    token = str(uuid.uuid4())
    expires_at = (dt.datetime.utcnow() + dt.timedelta(days=3)).isoformat()

    try:
        _insert_parent_confirmation(
            {
                "user_id": user_id,
                "parent_email": parent_email,
                "token": token,
                "status": "pending",
                "expires_at": expires_at,
            }
        )
    except Exception as exc:
        logger.exception("Failed to insert parent confirmation for %s", user_id)
        return jsonify({"error": f"Failed to record parent confirmation request: {exc}"}), 500

    if not APP_BASE_URL:
        return jsonify({"error": "APP_BASE_URL is not configured on the backend."}), 500

    confirmation_url = f"{APP_BASE_URL.rstrip('/')}/api/parent-request/confirm?token={token}"

    try:
        email_result = _send_parent_confirmation_email(
            parent_email=parent_email,
            student_name=user.get("user_metadata", {}).get("full_name") or user.get("email"),
            confirmation_url=confirmation_url,
            instagram_username=instagram_username,
        )
    except Exception as exc:
        logger.exception("Failed to dispatch parent confirmation email.")
        return jsonify({"error": f"Failed to send confirmation email: {exc}"}), 502

    if isinstance(email_result, dict) and email_result.get("skipped"):
        return jsonify(
            {
                "warning": "Email delivery skipped due to missing configuration.",
                "profile": profile,
            }
        ), 503

    return jsonify(
        {
            "message": "Parent confirmation email sent.",
            "profile": profile,
            "voice_sample_url": voice_sample_url,
            "voice_profile_id": voice_profile_id,
            "expires_at": expires_at,
        }
    )


@app.route("/confirm-parent", methods=["POST"])
def confirm_parent() -> Response:
    payload = request.get_json(silent=True) or {}
    profile_id = payload.get("profile_id") or payload.get("user_id")

    if not profile_id:
        return jsonify({"error": "profile_id is required"}), 400

    try:
        profile = _fetch_profile(profile_id)
    except Exception as exc:
        logger.exception("Failed to load profile %s for confirmation", profile_id)
        return jsonify({"error": str(exc)}), 500

    if not profile:
        return jsonify({"error": "Profile not found."}), 404

    updates: Dict[str, Any] = {
        "is_parent_confirmed": True,
        "parent_confirmed_at": dt.datetime.utcnow().isoformat(),
    }
    parent_email = payload.get("parent_email")
    if parent_email:
        updates["parent_email"] = parent_email

    try:
        updated_profile = _update_profile(profile_id, updates)
    except Exception as exc:
        logger.exception("Failed to update parent confirmation for %s", profile_id)
        return jsonify({"error": str(exc)}), 500

    if not updated_profile:
        updated_profile = {**profile, **updates}

    logger.info("Parent confirmation recorded for profile %s", profile_id)
    return jsonify({"profile": updated_profile})


@app.route("/ingest/instagram", methods=["POST"])
def ingest_instagram() -> Response:
    payload = request.get_json(silent=True) or {}
    profile_id = payload.get("profile_id")
    instagram_username = payload.get("instagram_username")

    try:
        limit = int(payload.get("limit", 12))
    except (TypeError, ValueError):
        limit = 12
    limit = max(1, min(limit, 40))

    missing_fields = [
        field for field in ("profile_id", "instagram_username") if not payload.get(field)
    ]
    if missing_fields:
        return jsonify({"error": f"Missing fields: {', '.join(missing_fields)}"}), 400

    try:
        profile = _fetch_profile(profile_id)
    except Exception as exc:
        logger.exception("Failed to fetch profile %s during ingestion", profile_id)
        return jsonify({"error": str(exc)}), 500

    if not profile:
        return jsonify({"error": "Profile not found."}), 404

    if not profile.get("is_parent_confirmed"):
        return jsonify({"error": "Parent confirmation required before ingestion."}), 403

    try:
        media_items = _fetch_instagram_posts_via_rapidapi(instagram_username, limit=limit)
    except Exception as exc:
        logger.exception("RapidAPI Instagram fetch failed for %s", instagram_username)
        return jsonify({"error": str(exc)}), 502

    if not media_items:
        return jsonify({"message": "No Instagram media returned.", "count": 0}), 200

    inserted_payloads: List[Dict[str, Any]] = []
    skipped: List[Dict[str, Any]] = []

    for media in media_items:
        normalized = _normalise_instagram_media(media)
        media_id = normalized.get("media_id")
        source_url = normalized.get("source_url")

        if not source_url:
            skipped.append({"media_id": media_id, "reason": "missing_source_url"})
            continue

        try:
            if _instagram_media_exists(profile_id, source_url):
                skipped.append({"media_id": media_id, "reason": "duplicate"})
                continue
        except Exception as exc:
            logger.exception("Lookup failed for existing media %s", source_url)
            skipped.append({"media_id": media_id, "reason": "lookup_failed"})
            continue

        download = _download_remote_media(source_url)
        if not download:
            skipped.append({"media_id": media_id, "reason": "download_failed"})
            continue

        storage_key = _build_storage_key(profile_id, media_id, download["content_type"])
        try:
            _upload_media_to_r2(storage_key, download)
        except Exception as exc:
            logger.exception("Failed to upload media %s to R2", storage_key)
            skipped.append({"media_id": media_id, "reason": "upload_failed"})
            continue

        row = {
            "user_id": profile_id,
            "source_url": source_url,
            "storage_key": storage_key,
            "caption": normalized.get("caption"),
            "caption_confidence": None,
            "audio_url": None,
            "captured_at": normalized.get("captured_at"),
            "processed_at": None,
        }
        inserted_payloads.append(row)

    try:
        persisted = _insert_instagram_media_rows(inserted_payloads)
    except Exception as exc:
        logger.exception("Failed to insert instagram_media rows for profile %s", profile_id)
        return jsonify({"error": str(exc)}), 500

    response_body = {
        "inserted": len(persisted),
        "skipped": skipped,
        "total_returned": len(media_items),
        "records": persisted,
    }
    logger.info(
        "Ingested %s instagram items for %s (skipped %s)",
        len(persisted),
        instagram_username,
        len(skipped),
    )
    return jsonify(response_body)


@app.route("/process/instagram-media", methods=["POST"])
def process_instagram_media() -> Response:
    payload = request.get_json(silent=True) or {}
    media_id = payload.get("media_id")
    limit = int(payload.get("limit", 5))

    try:
        records = _fetch_instagram_media(media_id=media_id, limit=limit, only_unprocessed=not media_id)
    except Exception as exc:
        logger.exception("Failed to fetch instagram_media rows.")
        return jsonify({"error": str(exc)}), 500

    if not records:
        return jsonify({"message": "No media queued for processing.", "processed": []})

    processed: List[Dict[str, Any]] = []
    for record in records:
        try:
            processed_result = process_media_record(record)
            processed.append({"id": record.get("id"), **processed_result})
        except Exception as exc:
            logger.exception("Processing failed for media %s", record.get("id"))
            processed.append({"id": record.get("id"), "error": str(exc)})

    return jsonify({"processed": processed})


@app.route("/email/digest-preview", methods=["POST"])
def email_digest_preview() -> Response:
    payload = request.get_json(silent=True) or {}
    user_id = payload.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    limit = int(payload.get("limit", 5))
    student_name = payload.get("student_name")

    try:
        media_items = _fetch_recent_media_for_user(user_id=user_id, limit=limit)
    except Exception as exc:
        logger.exception("Failed to fetch media for digest.")
        return jsonify({"error": str(exc)}), 500

    html = render_digest_email(media_items, student_name=student_name)
    return Response(html, mimetype="text/html")


@app.route("/hello", methods=["GET"])
def hello() -> Response:
    return jsonify({"message": "Hello, world!"})


@app.route("/echo", methods=["POST"])
def echo() -> Response:
    data = request.get_json()
    return jsonify({"you_sent": data})


@app.route("/transcribe-image", methods=["POST"])
def transcribe_image() -> Response:
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

        obj = s3.get_object(Bucket=BUCKET_NAME, Key=filename)
        img_bytes = obj["Body"].read()
        content_type = obj.get("ContentType", "image/jpeg")
        return Response(img_bytes, mimetype=content_type)

    except s3.exceptions.NoSuchKey:
        return jsonify({"error": "Image not found in bucket"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
