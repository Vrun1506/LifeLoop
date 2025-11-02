# Kanban

| Task | Owner | Status | ETA | Blocking |
| --- | --- | --- | --- | --- |
| Wire signup → parent consent flow, capture parent email + voice sample upload, and call `/api/parent-request` | Onboarding & Consent Engineer | ✅ Done | Completed Block 3 | Monitor Resend domain verification |
| Wire Gemini + ElevenLabs processing and digest preview | AI Narration & Notifications Engineer (Codex) | ✅ Done | Block 2–3 complete | None |
| Build `/confirm-parent` + `/ingest/instagram` endpoints with Supabase + R2 wiring | Ingestion & Storage Engineer | ✅ Done | T-≈2h20 | Resend invite emails wired; awaiting real RapidAPI/R2 creds already provided for full run |
| Stitch authenticated dashboard with live Supabase media + aligned mock fallback | Gallery & Frontend Experience Engineer | ✅ Done | Block 4 complete | Provide RapidAPI/R2 creds to swap from mock toggle (`NEXT_PUBLIC_USE_MOCK_DASHBOARD`) |
