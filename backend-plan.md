# BACKEND AGENT — CinemaSync
## Instructions for Claude Code

You are setting up the entire backend infrastructure for a private two-person synchronized video watching platform called **CinemaSync**. There is no traditional Express/Node server. The backend is entirely composed of Supabase (Auth, Postgres, Realtime, Edge Functions) and Cloudflare R2 (file storage). Everything must operate within free tiers.

---

## Services Overview

| Service | Purpose | Free Tier Limit |
|---|---|---|
| Supabase | Auth, Postgres DB, Realtime, Edge Functions | 500MB DB, 2GB bandwidth, 500K edge function invocations |
| Cloudflare R2 | Video file storage | 10GB storage, 0 egress fees |

You will be working inside a Supabase project. All SQL runs in the Supabase SQL editor or via migration files. Edge Functions are written in TypeScript and deployed using the Supabase CLI.

---

## Supabase Project Setup

Initialize a new Supabase project via the dashboard or CLI. Enable the following:
- Email/Password Auth (under Authentication → Providers)
- Realtime (enabled by default, but must be enabled per-table where needed)
- Edge Functions runtime

Set `SITE_URL` in Auth settings to the Vercel deployment URL. Set `Redirect URLs` to that same URL.

---

## Database Schema

Run the following schema setup in order. Use the Supabase SQL editor.

### Table: `profiles`

This extends Supabase's built-in `auth.users` table with a display username.

- `id` — UUID, primary key, references `auth.users(id)` on delete cascade
- `username` — TEXT, unique, not null
- `created_at` — TIMESTAMPTZ, default `now()`

After creating the table, create a Postgres **function + trigger** that automatically inserts into `profiles` whenever a new user is created in `auth.users`. The trigger fires `AFTER INSERT ON auth.users` and inserts the new user's `id`. The `username` field should be populated from the user's email prefix (everything before `@`) since the frontend stores usernames as `{username}@cinemasync.local`.

### Table: `rooms`

This table stores the single shared room's current playback state. For this app, there is exactly one room. Insert a single seed row on creation.

- `id` — TEXT, primary key, value is always the string `'main'`
- `current_url` — TEXT, nullable (the currently loaded video URL)
- `source_type` — TEXT, nullable, either `'youtube'` or `'file'`
- `is_playing` — BOOLEAN, default false
- `last_timestamp` — FLOAT8, default 0.0 (video position in seconds at last state change)
- `last_updated_at` — TIMESTAMPTZ, default `now()`

After creating the table, insert the seed row: `INSERT INTO rooms (id) VALUES ('main')`.

Enable **Realtime** on the `rooms` table in the Supabase dashboard (Table Editor → `rooms` → Enable Realtime). The frontend will subscribe to changes on this row for the late-join catch-up feature.

### Table: `video_library`

Stores metadata for uploaded video files. Actual files live in Cloudflare R2.

- `id` — UUID, primary key, default `gen_random_uuid()`
- `user_id` — UUID, references `auth.users(id)` on delete cascade
- `filename` — TEXT, not null (original filename as uploaded)
- `file_url` — TEXT, not null (the public Cloudflare R2 URL)
- `file_size_bytes` — BIGINT, not null
- `uploaded_at` — TIMESTAMPTZ, default `now()`

Enable **Realtime** on `video_library` so the frontend Library component can live-update when a new file is uploaded.

---

## Row Level Security (RLS) Policies

Enable RLS on all three tables. Never disable RLS. These policies control who can read and write each table.

### `profiles` table
- SELECT: Allow any authenticated user to read any profile. Both users need to see each other's username.
- INSERT: Only allow a user to insert their own profile row (`auth.uid() = id`). This is handled by the trigger, but the policy still needs to exist.
- UPDATE: Only allow a user to update their own profile.

### `rooms` table
- SELECT: Allow any authenticated user to read the room state.
- UPDATE: Allow any authenticated user to update the room state. Either user can control playback.
- INSERT: Disallow. The row is seeded during setup — no one should be able to insert.
- DELETE: Disallow.

### `video_library` table
- SELECT: Allow any authenticated user to read all library entries. Both users share the same library.
- INSERT: Allow any authenticated user to insert. Both users can upload.
- UPDATE: Disallow. Files are immutable once uploaded.
- DELETE: Allow only the user who uploaded a file to delete their own entry (`auth.uid() = user_id`).

---

## Realtime Channel Configuration

The sync system uses Supabase Realtime **Broadcast** (not Postgres Changes) for low-latency sync events. Broadcast messages are ephemeral — they are not stored in the DB. They use the channel name `room:main`.

No special server-side configuration is required for Broadcast channels — they work out of the box in Supabase. The frontend handles subscribing and emitting.

However, you must ensure that the Supabase project's Realtime settings allow **Broadcast** and **Presence** features. Verify this in the Supabase dashboard under Realtime → Configuration.

The room state persistence (for late-join) is handled by the frontend calling a standard Supabase `update()` on the `rooms` table whenever a sync event is emitted. This is the source of truth for catching up late joiners. No server-side logic is needed for this — the DB policy (above) already allows authenticated users to update the room row.

---

## Cloudflare R2 Setup

### Create the R2 Bucket

1. Log into Cloudflare dashboard
2. Navigate to R2 Object Storage
3. Create a new bucket named `cinemasync-library`
4. Under the bucket settings, enable **Public Access** via a custom domain or the default `r2.dev` subdomain. This allows the frontend to stream video directly from R2 without authentication headers. Note the public bucket URL — it will look like `https://pub-xxxx.r2.dev` or your custom domain.

### Create R2 API Token

1. In Cloudflare R2 settings, create an API Token with:
   - Permission: Object Read & Write
   - Scope: Specific bucket — `cinemasync-library`
2. Note the following credentials: Account ID, Access Key ID, Secret Access Key

These credentials are **never exposed to the frontend**. They live only in Supabase Edge Function secrets.

---

## Supabase Edge Functions

Edge Functions are TypeScript serverless functions deployed via `supabase functions deploy`. They run on Deno.

### Function 1: `get-upload-url`

**Purpose:** Generate a presigned R2 URL so the frontend can upload a file directly to R2 without ever seeing the R2 credentials.

**HTTP Method:** POST

**Request body** (JSON):
- `filename` — string, the original file name
- `contentType` — string, the MIME type (e.g., `video/mp4`)
- `fileSizeBytes` — number

**What it does:**
1. Verify the request has a valid Supabase JWT in the `Authorization: Bearer` header. Reject with 401 if not authenticated. Use the `@supabase/supabase-js` client initialized with the `SUPABASE_SERVICE_ROLE_KEY` secret to verify the token.
2. Sanitize the filename — strip non-alphanumeric characters except dots and hyphens, replace spaces with underscores.
3. Generate a unique object key: `uploads/{uuid}/{sanitized_filename}`. Use `crypto.randomUUID()` for the uuid segment.
4. Generate a presigned PUT URL using the AWS S3-compatible API (R2 is S3-compatible). Use the `aws4fetch` npm-compatible Deno module for signing. The presigned URL should expire in 15 minutes.
5. Construct the final public URL for the file: `{R2_PUBLIC_BUCKET_URL}/{object_key}`
6. Return JSON:
   - `uploadUrl` — the presigned PUT URL for the frontend to use
   - `publicUrl` — the final public URL where the video will be accessible after upload

**Secrets required** (set via `supabase secrets set`):
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME` (value: `cinemasync-library`)
- `R2_PUBLIC_BUCKET_URL` (the public base URL of the R2 bucket)
- `SUPABASE_SERVICE_ROLE_KEY` (already available in Edge Functions as a built-in secret)

**Error handling:**
- 401 if JWT is missing or invalid
- 400 if required body fields are missing
- 500 with a generic error message (never expose internal error details) if R2 signing fails

### Function 2: `delete-video`

**Purpose:** Delete a video file from R2 and remove its metadata row from `video_library`. Keeps storage clean.

**HTTP Method:** DELETE

**Request body** (JSON):
- `videoId` — UUID of the `video_library` row
- `fileUrl` — the full public URL of the file

**What it does:**
1. Verify the JWT from the `Authorization` header. Get the `user_id` from the decoded token.
2. Look up the `video_library` row by `videoId`. Confirm the row's `user_id` matches the requesting user. Reject with 403 if not.
3. Extract the R2 object key from the `fileUrl` by stripping the public bucket base URL prefix.
4. Delete the object from R2 using the S3-compatible DELETE Object API (signed with aws4fetch).
5. Delete the `video_library` row from Supabase.
6. Return 200 with `{ success: true }`.

**Secrets required:** Same as `get-upload-url`.

---

## Supabase Secrets Configuration

Run the following commands using the Supabase CLI after setting up R2:

```
supabase secrets set R2_ACCOUNT_ID=<value>
supabase secrets set R2_ACCESS_KEY_ID=<value>
supabase secrets set R2_SECRET_ACCESS_KEY=<value>
supabase secrets set R2_BUCKET_NAME=cinemasync-library
supabase secrets set R2_PUBLIC_BUCKET_URL=<value>
```

These secrets are injected as environment variables into Edge Functions at runtime. Never commit them to source control.

---

## CORS Configuration for Edge Functions

Both Edge Functions must return the following CORS headers on every response, including preflight `OPTIONS` requests:

- `Access-Control-Allow-Origin`: the Vercel frontend URL (set this as a secret `ALLOWED_ORIGIN` rather than hardcoding)
- `Access-Control-Allow-Methods`: `POST, DELETE, OPTIONS`
- `Access-Control-Allow-Headers`: `Authorization, Content-Type`

Handle `OPTIONS` requests by returning 200 with only the CORS headers and an empty body.

---

## User Account Seeding

Since this is a private two-person app, user accounts are not self-registered — they are created manually. After deploying:

1. Use the Supabase dashboard → Authentication → Users → "Invite user"
2. Create exactly two accounts:
   - `{username1}@cinemasync.local` with a strong password
   - `{username2}@cinemasync.local` with a strong password
3. The trigger on `auth.users` will automatically create their `profiles` rows

Do not enable user sign-up in the Auth settings. Under Authentication → Settings, disable "Enable Sign Ups" so no one can create accounts via the API. Only manually invited users (created from the dashboard) can exist.

---

## File Structure for Edge Functions

```
supabase/
├── functions/
│   ├── get-upload-url/
│   │   └── index.ts
│   └── delete-video/
│       └── index.ts
└── migrations/
    ├── 001_create_profiles.sql
    ├── 002_create_rooms.sql
    ├── 003_create_video_library.sql
    ├── 004_rls_policies.sql
    └── 005_seed_room.sql
```

---

## Deployment Order

Confirm and give detailed deployment plan for the dev and he will take care of the rest.

1. Create Supabase project
2. Run all SQL migrations in order (001 through 005)
3. Enable Realtime on `rooms` and `video_library` tables in dashboard
4. Disable user sign-ups in Auth settings
5. Manually create the two user accounts
6. Create Cloudflare R2 bucket and API token
7. Set all Supabase secrets via CLI
8. Deploy Edge Functions: `supabase functions deploy get-upload-url` and `supabase functions deploy delete-video`
9. Verify Edge Functions are live in the Supabase dashboard under Edge Functions
10. Hand off `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the Frontend agent

---

## What NOT to Build

- No REST API server (no Express, no Fastify, no separate backend service)
- No job queue / background workers
- No email sending / verification flows
- No video transcoding or processing
- No CDN configuration beyond R2's built-in public access
- No logging service integration
- No rate limiting (private two-person app — unnecessary)
