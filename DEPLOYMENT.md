# CinemaSync Backend Deployment Guide

Complete step-by-step deployment for the Supabase + Cloudflare R2 backend infrastructure.

---

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`npm install -g supabase`)
- A [Supabase](https://supabase.com) account (free tier)
- A [Cloudflare](https://dash.cloudflare.com) account (free tier)
- Access to a terminal

---

## Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New project**
3. Choose your organization, name the project (e.g., `cinemasync`), set a strong database password, and pick the region closest to both users
4. Wait for the project to finish provisioning
5. Note down from **Settings > API**:
   - `Project URL` — this becomes `VITE_SUPABASE_URL`
   - `anon public` key — this becomes `VITE_SUPABASE_ANON_KEY`
   - `service_role` key — used for Edge Function secrets

---

## Step 2: Run SQL Migrations

Run each migration file **in order** via the Supabase SQL Editor (**SQL Editor** in the dashboard sidebar).

Open each file, paste its contents, and click **Run**:

1. `supabase/migrations/001_create_profiles.sql` — Creates the `profiles` table, the auto-insert trigger function, and the trigger on `auth.users`
2. `supabase/migrations/002_create_rooms.sql` — Creates the `rooms` table for shared playback state
3. `supabase/migrations/003_create_video_library.sql` — Creates the `video_library` table for uploaded file metadata
4. `supabase/migrations/004_rls_policies.sql` — Creates all Row Level Security policies for all three tables
5. `supabase/migrations/005_seed_room.sql` — Inserts the single `'main'` room row

**Verification:** After running all five, go to **Table Editor** and confirm:
- `profiles` table exists (empty, will be populated when users are created)
- `rooms` table exists with one row (`id = 'main'`)
- `video_library` table exists (empty)

---

## Step 3: Enable Realtime

In the Supabase dashboard:

1. Go to **Database > Replication**
2. Under **supabase_realtime**, click the **Source** toggle
3. Enable replication for the following tables:
   - `rooms`
   - `video_library`

Alternatively, in the **Table Editor**, select each table, click the kebab menu, and toggle **Enable Realtime**.

Also verify under **Realtime > Configuration** that **Broadcast** and **Presence** features are enabled (they are by default).

---

## Step 4: Disable User Sign-ups

This is a private two-person app. No one should be able to self-register.

1. Go to **Authentication > Providers > Email**
2. Set **Confirm email** to `OFF` (since we use `@sri.sakhi` addresses that don't receive real email)
3. Go to **Authentication > Settings**
4. Toggle **Enable Sign Ups** to `OFF`

---

## Step 5: Create Two User Accounts

1. Go to **Authentication > Users**
2. Click **Add user > Create new user**
3. Create the first account:
   - Email: `tana@sri.sakhi`
   - Password: (choose a strong password)
   - Toggle **Auto Confirm User** to ON
4. Create the second account:
   - Email: `harsh@sri.sakhi`
   - Password: (choose a strong password)
   - Toggle **Auto Confirm User** to ON

**Verification:** After creating both users:
- Check **Authentication > Users** — two users should be listed
- Check **Table Editor > profiles** — two rows should exist with usernames `tana` and `harsh` (auto-created by the trigger)

---

## Step 6: Create Cloudflare R2 Bucket and API Token

### Create the R2 Bucket

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage** in the sidebar
3. Click **Create bucket**
4. Name it `cinemasync-library`
5. Pick a location hint closest to both users
6. After creation, go to the bucket's **Settings > Public Access**
7. Enable public access via the `r2.dev` subdomain (or configure a custom domain)
8. Note the **Public Bucket URL** — it looks like `https://pub-xxxxxxxxxxxx.r2.dev`

### Create R2 API Token

1. In the Cloudflare dashboard, go to **R2 Object Storage > Manage R2 API Tokens**
2. Click **Create API token**
3. Configure:
   - Permission: **Object Read & Write**
   - Scope: **Apply to specific bucket only** — select `cinemasync-library`
4. Click **Create API Token**
5. Note down:
   - **Account ID** (visible in the R2 overview or URL bar)
   - **Access Key ID**
   - **Secret Access Key**

These credentials are **never exposed to the frontend**. They exist only in Supabase Edge Function secrets.

---

## Step 7: Set Supabase Secrets

Link your local Supabase CLI to the project:

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

Your project ref is the subdomain of your Supabase URL (e.g., if your URL is `https://abcdefghij.supabase.co`, the ref is `abcdefghij`).

Set all secrets:

```bash
supabase secrets set R2_ACCOUNT_ID=<your-cloudflare-account-id>
supabase secrets set R2_ACCESS_KEY_ID=<your-r2-access-key-id>
supabase secrets set R2_SECRET_ACCESS_KEY=<your-r2-secret-access-key>
supabase secrets set R2_BUCKET_NAME=cinemasync-library
supabase secrets set R2_PUBLIC_BUCKET_URL=<your-public-bucket-url>
supabase secrets set ALLOWED_ORIGIN=<your-vercel-frontend-url>
```

Replace `<your-vercel-frontend-url>` with the actual deployed frontend URL (e.g., `https://cinemasync.vercel.app`). During development, you can temporarily set this to `http://localhost:5173`.

Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in Edge Functions — you do not need to set them manually.

---

## Step 8: Deploy Edge Functions

From the project root directory:

```bash
supabase functions deploy get-upload-url --no-verify-jwt
supabase functions deploy delete-video --no-verify-jwt
```

The `--no-verify-jwt` flag tells Supabase not to verify the JWT at the gateway level. JWT verification is handled **inside** each function using the service role key, which gives us better error messages and control over the auth flow.

**Verification:** Go to **Edge Functions** in the Supabase dashboard. You should see:
- `get-upload-url` — Status: Active
- `delete-video` — Status: Active

---

## Step 9: Verify Edge Functions

### Test `get-upload-url`

First, get a valid JWT by signing in:

```bash
curl -X POST '<SUPABASE_URL>/auth/v1/token?grant_type=password' \
  -H 'apikey: <SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"email": "tana@sri.sakhi", "password": "<password>"}'
```

Copy the `access_token` from the response, then:

```bash
curl -X POST '<SUPABASE_URL>/functions/v1/get-upload-url' \
  -H 'Authorization: Bearer <access_token>' \
  -H 'Content-Type: application/json' \
  -d '{"filename": "test video.mp4", "contentType": "video/mp4", "fileSizeBytes": 1024000}'
```

Expected response (200):
```json
{
  "uploadUrl": "https://<account-id>.r2.cloudflarestorage.com/cinemasync-library/uploads/<uuid>/test_video.mp4?X-Amz-...",
  "publicUrl": "https://pub-xxxx.r2.dev/uploads/<uuid>/test_video.mp4"
}
```

### Test `delete-video`

```bash
curl -X DELETE '<SUPABASE_URL>/functions/v1/delete-video' \
  -H 'Authorization: Bearer <access_token>' \
  -H 'Content-Type: application/json' \
  -d '{"videoId": "<uuid-of-existing-video>", "fileUrl": "<public-url-of-video>"}'
```

Expected response (200):
```json
{
  "success": true
}
```

### Test error cases

No auth header (expect 401):
```bash
curl -X POST '<SUPABASE_URL>/functions/v1/get-upload-url' \
  -H 'Content-Type: application/json' \
  -d '{"filename": "test.mp4", "contentType": "video/mp4", "fileSizeBytes": 1024}'
```

Missing body fields (expect 400):
```bash
curl -X POST '<SUPABASE_URL>/functions/v1/get-upload-url' \
  -H 'Authorization: Bearer <access_token>' \
  -H 'Content-Type: application/json' \
  -d '{"filename": "test.mp4"}'
```

---

## Step 10: Hand Off to Frontend

Provide these two values to the frontend `.env.local`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

The frontend needs nothing else from the backend. R2 credentials stay server-side in Edge Function secrets.

---

## Auth Settings Summary

| Setting | Value |
|---|---|
| Auth provider | Email/Password |
| Sign-ups | Disabled |
| Confirm email | Disabled |
| SITE_URL | Your Vercel frontend URL |
| Redirect URLs | Your Vercel frontend URL |

---

## Secrets Reference

| Secret | Where it's set | Who uses it |
|---|---|---|
| `R2_ACCOUNT_ID` | `supabase secrets set` | Edge Functions |
| `R2_ACCESS_KEY_ID` | `supabase secrets set` | Edge Functions |
| `R2_SECRET_ACCESS_KEY` | `supabase secrets set` | Edge Functions |
| `R2_BUCKET_NAME` | `supabase secrets set` | Edge Functions |
| `R2_PUBLIC_BUCKET_URL` | `supabase secrets set` | Edge Functions |
| `ALLOWED_ORIGIN` | `supabase secrets set` | Edge Functions (CORS) |
| `SUPABASE_URL` | Auto-injected | Edge Functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected | Edge Functions |
| `VITE_SUPABASE_URL` | Frontend `.env.local` | Frontend client |
| `VITE_SUPABASE_ANON_KEY` | Frontend `.env.local` | Frontend client |

---

## Free Tier Limits

| Service | Limit | Expected usage |
|---|---|---|
| Supabase Database | 500 MB | Negligible (text metadata only) |
| Supabase Bandwidth | 2 GB/month | Minimal (API calls only) |
| Supabase Edge Functions | 500K invocations/month | ~100/month for uploads/deletes |
| Supabase Realtime | 200 concurrent connections | 2 connections max |
| Cloudflare R2 Storage | 10 GB | Video files |
| Cloudflare R2 Operations | 1M Class A, 10M Class B/month | Well within limits |
| Cloudflare R2 Egress | Free (no egress fees) | Unlimited streaming |
