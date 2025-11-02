## Inspiration
Sharing university life with the people who helped us get here is harder than it should be. Between deadlines, different time zones, and social media overload, our parents and grandparents often experience our lives as silent photo dumps or missed calls. We wanted to protect those memories from disappearing into a feed while translating them into stories our families can actually enjoy. LifeLoop was born to preserve our digital legacy and bridge the worlds between students, parents, and grandparents.

## What it does
LifeLoop mirrors a student’s public Instagram posts into a secure personal vault, automatically generates friendly captions with Google Gemini, and narrates those updates through ElevenLabs—optionally in the student’s own cloned voice. Parents confirm consent before any data is ingested, then receive beautiful galleries and email digests that keep them in the loop without demanding another messaging app. Family can play back the audio summaries, while students stay confident that their memories live beyond Meta’s servers.

## How we built it
- **Frontend**: Next.js 14 with Supabase Auth powers the signup, consent flow, and an accessible dashboard designed for multi-generational use.
- **Backend**: A Flask API orchestrates RapidAPI calls to fetch public Instagram media, uploads assets to Cloudflare R2, stores metadata in Supabase, and coordinates Gemini + ElevenLabs processing.
- **AI pipeline**: Gemini Vision produces descriptive captions and tone, then ElevenLabs renders those captions into natural speech for digests and galleries.
- **Email + notifications**: HTML digests summarise new posts with audio links so families can catch up from any device.

## Challenges we ran into
- Balancing hackathon speed with responsible data handling—especially around consent and storing social media content.
- RapidAPI rate limits and response variance while testing ingestion on limited time.
- Integrating voice cloning in a privacy-conscious way that still demonstrates the ElevenLabs use case.
- Coordinating multiple moving parts (Supabase, R2, AI services) under a tight deadline while keeping the narrative clear for judges.

## Accomplishments that we're proud of
- Designing an end-to-end flow that keeps families informed without requiring students to manually curate updates.
- Shipping a gallery experience that already demonstrates Gemini captions and ElevenLabs narration.
- Building an ethical framework around consent and data ownership that aligns with Accenture’s responsible AI principles.
- Crafting a compelling story that ties directly into DurHack’s Legacy theme and the Marshall Wace Bridging Worlds challenge.

## What we learned
- Accessibility is a feature, not a bolt-on—audio digests and high-contrast layouts dramatically improve engagement for grandparents.
- AI shines when it supports relationships; Gemini + ElevenLabs can create warmth, not just automation.
- Responsible data practices (clear consent, opt-out paths, transparent storage) build trust even in a hackathon sprint.

## What's next for LifeLoop
- Import full Instagram archives so students can back up memories beyond the 24-hour story cycle.
- Introduce Immich-inspired facial recognition to auto-tag family members and surface personalised highlights.
- Generate native, printable photobook PDFs that combine AI captions, audio QR codes, and legacy stories—no third-party tools required.
- Expand beyond Instagram to include campus calendars, academic milestones, and voice notes, turning LifeLoop into a central timeline of a student’s journey.

