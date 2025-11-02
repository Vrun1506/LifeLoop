# LifeLoop

LifeLoop keeps students connected to the families who cheer them on. We archive public Instagram updates in a secure vault, describe each moment with Google Gemini, and deliver narrated digests through ElevenLabs so parents and grandparents never miss the story.

## Why it matters
- **Preserve a digital legacy**: Break free from social-platform lock-in by mirroring posts into your own storage.
- **Bridge worlds**: Translate campus life into accessible galleries and audio summaries that work for every generation.
- **Act responsibly**: Require parent approval before ingesting data, label how AI is used, and keep consent front and centre.

## Core features
- **Ingestion pipeline**: RapidAPI fetches public Instagram posts once a parent confirms, caching media in Cloudflare R2 and indexing metadata in Supabase.
- **AI storytelling**: Google Gemini produces concise, contextual captions and highlights; ElevenLabs voices the captions for hands-free listening.
- **Family-friendly dashboard**: A responsive gallery surfaces images, captions, and narration controls with focus on accessibility.
- **Email digests**: Parents receive HTML summaries that blend visuals, text, and optional audio for quick catch-ups.

## Tech stack
- **Frontend**: Next.js 14 App Router, TypeScript, Supabase client helpers, custom utility CSS.
- **Backend**: Python Flask API orchestrating RapidAPI ingestion, Cloudflare R2 uploads, Supabase mutations, Gemini and ElevenLabs services.
- **Data**: Supabase Auth + Postgres tables (`profiles`, `instagram_media`) recording consent, media metadata, and generated insights.

## Prize alignment
- **Marshall Wace – Bridging Worlds**: Cross-generational UX, AI narration, and forthcoming photobooks connect students, parents, and grandparents.
- **MLH Best Use of Gemini API**: Automated captioning, sentiment, and future timeline summaries powered by Gemini Vision.
- **MLH Best Use of ElevenLabs**: Personalised audio digests—including optional cloned student voice—for accessible storytelling.
- **Waterstons – Connecting things that normally aren’t**: Instagram, storage, AI services, and email/paper photobooks woven into one experience.

## Local development
```bash
# Frontend
cd frontend/life-loop
npm install
npm run dev

# Backend
cd backend/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

Configure environment variables in `.env.local` (Next.js) and `.env` (Flask). Sample keys should live in `.env.example`.

## Future vision
- **Instagram archive import**: Allow users to upload their full data export so legacy content survives platform shutdowns.
- **Immich-style facial recognition**: Offline ML service that clusters loved ones and auto-tags family moments.
- **In-house photobook PDFs**: Generate printable keepsakes that package Gemini captions and ElevenLabs narration cues.
- **Voice personalisation wizard**: Guided flow to capture 10+ seconds of audio and re-use the cloned voice for every digest.

LifeLoop is how students keep their families in the loop—and how every generation protects the memories that matter. Together we craft a legacy that outlives any social feed.

