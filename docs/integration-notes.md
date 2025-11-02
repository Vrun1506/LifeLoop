# Integration Notes

## Gemini Vision Captioning
- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}` (default model `gemini-pro-vision`).
- Prompt goal: “You create concise, heartfelt captions (max 40 words) for a family legacy album…” (see `backend/api/server.py`).
- Request body includes the prompt text plus the Instagram image as base64 inline data.
- Confidence heuristic derived from `safetyRatings` probabilities; falls back to `0.85` when none are returned.
- Fallback behaviour: if `GEMINI_API_KEY` is missing, we return a friendly placeholder caption and mark confidence at `0.5` so downstream UI can flag it.

## ElevenLabs Narration
- Endpoint: `POST https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}` (defaults to env `ELEVENLABS_VOICE_ID` or ElevenLabs “Rachel” voice).
- Request payload sets `model_id` (default `eleven_multilingual_v2`) and moderate stability/style to feel conversational.
- Successful responses return `audio/mpeg` which we upload to R2 under `narrations/{media_id}.mp3`; we surface a signed/public URL if `R2_PUBLIC_BASE_URL` is configured.
- TODO (post-demo): pipe student-provided voice samples into ElevenLabs Voice Lab to create per-student clones, then persist resulting `voice_profile_id` in Supabase.
- Fallback behaviour: when the API key is missing we skip synthesis and leave the `audio_url` null so the dashboard can show “audio coming soon”.

## Backend Processing Flow
- New endpoint: `POST /process/instagram-media` accepting optional `media_id` and `limit`. By default it processes all unprocessed rows in `instagram_media`.
- Steps per record: download image from R2 (`storage_key`), send to Gemini for caption, call ElevenLabs for narration, store audio in R2, update Supabase row with `caption`, `caption_confidence`, `audio_url`, and `processed_at`.
- Errors per item are captured and returned in the JSON payload while continuing with remaining rows to keep the pipeline resilient.

## Digest Email Draft
- Endpoint: `POST /email/digest-preview` which expects `user_id`, optional `student_name`, and `limit`.
- Fetches latest processed media for the user, then renders HTML via `backend/api/email_templates.py`.
- Email layout features: hero banner, per-memory image + caption + play link, inline `<audio>` element, legacy-themed footer referencing photobook and face-recognition roadmap.
- Ready for hand-off to the notifications worker once email provider (Resend/SendGrid) integration lands; we simply return the HTML for now.
