-- 003_create_video_library.sql
-- Stores metadata for uploaded video files. Actual files live in Cloudflare R2.

create table if not exists public.video_library (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  filename        text        not null,
  file_url        text        not null,
  file_size_bytes bigint      not null,
  uploaded_at     timestamptz not null default now()
);

-- Index on user_id for ownership lookups and cascade deletes
create index if not exists idx_video_library_user_id on public.video_library (user_id);

-- Enable RLS (policies are defined in 004_rls_policies.sql)
alter table public.video_library enable row level security;
