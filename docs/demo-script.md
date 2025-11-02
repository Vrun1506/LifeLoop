# LifeLoop Demo Script

## Narrative Overview
- **Goal**: Show how LifeLoop preserves a student’s digital legacy while bridging conversations across generations.
- **Cast**: Student Maya (owns Instagram), Parent Alex (email recipient/approver), Grandma Rosa (listens to narrated digest).
- **Prize Framing**: Highlight legacy preservation, Marshall Wace bridging, Gemini captions, ElevenLabs narration, Waterstons pipeline, and future roadmap (facial recognition + photobook export).

## Run of Show
1. **Opening Hook (Strategist intro)**
   - Slide: "Preserve Maya’s university memories for her family." Mention RapidAPI→R2→Supabase pipeline + ethical consent.
2. **Signup & Consent Collection (Onboarding Engineer)**
   - Navigate to `lifeloop.app/signup`.
   - Enter Maya’s email/password and Instagram handle `@maya_memories`.
   - Redirect to `complete-profile` to capture:
     - Parent email (Alex) with consent copy referencing legacy theme.
     - Optional voice sample upload (10s clip) for ElevenLabs cloning.
     - Checkbox acknowledging Instagram caching notice.
   - Callout: data stored in Supabase `profiles` (`parent_email`, `voice_profile_id`).
3. **Parent Confirmation Email (AI/Backend)**
   - Show mock Resend email in inbox with CTA "Approve Maya’s Legacy Loop".
   - Click CTA → parent confirmation endpoint (Flask `/webhook/parent-confirmation`).
   - Dashboard toast: "Parent approval recorded." Supabase `is_parent_confirmed = true`.
   - QA note: if live email not ready, open static HTML preview from `docs/assets/parent-confirmation.html`.
4. **Instagram Ingestion (Ingestion Engineer)**
   - Trigger backend job via dashboard button "Sync Instagram" or auto cron.
   - Narrate RapidAPI pagination, dedupe, R2 upload, metadata insert into `instagram_media` (source URL + storage key).
   - Show Supabase table view or CLI output confirming rows.
   - Mention logging + retry policies.
5. **AI Captioning & Audio Narration (AI Engineer)**
   - Explain Gemini prompt shaping (short caption + sentiment tag) saved to Supabase.
   - Demonstrate ElevenLabs synthesis (Maya’s voice) stored as `audio_url` in R2.
   - If service unavailable, play cached MP3 from `assets/mock/audio/new-post.mp3` and note fallback voice.
6. **Family Dashboard Tour (Gallery Engineer)**
   - Login as Maya; redirect to protected dashboard `/dashboard`.
   - Gallery grid shows new posts with:
     - Image thumbnail (alt text = Gemini caption).
     - Caption + sentiment chip (e.g., "Grateful"), callout to MLH Gemini prize.
     - Play button for ElevenLabs narration; keyboard accessible controls.
   - Highlight timeline teaser + `Generate Photobook` stub (modal describing upcoming Immich-inspired facial recognition).
7. **Email Digest (AI Engineer)**
   - Display HTML digest (Resend preview) summarizing latest posts with captions & audio links.
   - Emphasize bridging generations via accessible narrated updates for grandparents.
8. **Closing Story Beat (QA Lead)**
   - Recap benefits: compliant consent, automated curation, voice-preserved memories.
   - Mention future modules: Instagram archive import, printable PDF photobooks, facial recognition tagging inspired by Immich.

## Demo Logistics
- **Environment**: Frontend on Vercel preview / local `npm run dev`; backend Flask tunnelled via `ngrok` if remote confirmation is needed.
- **Test Data**: Use seeded RapidAPI fixture (`assets/mock/instagram_feed.json`) to avoid rate-limit risk.
- **Screenshots/GIFs**: Capture once features stabilize; file naming `docs/media/<step>-<description>.png`.
- **Fallback Plan**: If API keys unavailable, toggle `USE_MOCK_DATA=true` to display cached gallery + digest while narrating planned integrations.

## Manual Test Checklist
- `Signup & Consent`
  - Confirm signup form collects Instagram handle & surfaces legacy messaging.
  - Verify consent checkbox copy includes storage disclaimer.
  - Ensure parent email validation & required voice sample guidance.
- `Parent Confirmation`
  - Send approval email and confirm CTA updates Supabase `is_parent_confirmed`.
  - Display inline status in dashboard (badge "Awaiting parent confirmation").
- `Ingestion & Captions`
  - Trigger ingestion job; confirm new rows in `instagram_media` with `processed_at` timestamp.
  - Review Gemini captions for tone accuracy; sentiment tag matches image mood.
  - Ensure original `source_url` stored for audit trail.
- `Audio & Accessibility`
  - ElevenLabs audio button playable with keyboard (Space/Enter) and announces via ARIA label.
  - Provide transcript/alt text fallback if audio missing.
  - Check gallery cards have focus outline and color contrast ≥ 4.5:1.
- `Email Digest`
  - Open HTML preview; verify new posts ordered by `processed_at` desc.
  - Confirm audio links + "View in LifeLoop" button.
  - Test mobile responsiveness (320px) in browser dev tools.
- `Error Handling`
  - Disconnect Instagram mock to ensure dashboard shows retry banner.
  - Force ElevenLabs failure → confirm fallback voice or message.
  - Ensure logging surfaces in `docs/integration-notes.md` for triage.

## Open Items to Monitor
- Need final decision on email provider (Resend vs SendGrid).
- Confirm RapidAPI rate limits and caching strategy.
- Validate ElevenLabs voice cloning lead time; provide default voice path if upload absent.
- Document Supabase SQL migrations in `docs/supabase.sql` for QA reference.

## Demo Prep Checklist
- [ ] Load database with 3–4 representative posts.
- [ ] Verify parent confirmation flow end-to-end (mock acceptable).
- [ ] Stage audio files in `assets/mock/audio/` for offline demo.
- [ ] Capture annotated screenshots for submission deck.
- [ ] Rehearse script twice; timebox to 3-minute pitch + 2-minute demo.
