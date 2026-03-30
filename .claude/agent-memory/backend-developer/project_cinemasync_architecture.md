---
name: CinemaSync backend architecture
description: Private two-person video sync app — Supabase (Auth, Postgres, Realtime, Edge Functions) + Cloudflare R2 (video storage), no traditional server
type: project
---

CinemaSync is a private two-person synchronized video watching platform for a couple in a long-distance relationship.

**Why:** No traditional backend server — everything runs on Supabase free tier and Cloudflare R2 free tier to keep costs at zero.

**How to apply:**
- Backend = Supabase migrations (5 SQL files) + 2 Edge Functions (Deno/TypeScript)
- Tables: `profiles`, `rooms` (single row, id='main'), `video_library`
- Edge Functions: `get-upload-url` (presigned R2 PUT URLs via aws4fetch) and `delete-video` (R2 object delete + DB cleanup)
- Auth: email/password only, sign-ups disabled, two manually created accounts ({name}@cinemasync.local)
- Realtime: Broadcast channel `room:main` for sync events, Postgres Changes on `rooms` and `video_library`
- Frontend: React + Vite on Vercel, connects via VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
