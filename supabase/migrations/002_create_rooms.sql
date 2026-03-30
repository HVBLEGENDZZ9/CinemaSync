-- 002_create_rooms.sql
-- Creates the rooms table for shared playback state.
-- This app uses exactly one room with id = 'main'.

create table if not exists public.rooms (
  id              text     primary key default 'main',
  current_url     text,
  source_type     text     check (source_type in ('youtube', 'file')),
  is_playing      boolean  not null default false,
  last_timestamp  float8   not null default 0.0,
  last_updated_at timestamptz not null default now()
);

-- Enable RLS (policies are defined in 004_rls_policies.sql)
alter table public.rooms enable row level security;
