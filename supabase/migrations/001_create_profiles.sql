-- 001_create_profiles.sql
-- Creates the profiles table and auto-insert trigger for new auth users.

create table if not exists public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  username   text        unique not null,
  created_at timestamptz not null default now()
);

-- Enable RLS (policies are defined in 004_rls_policies.sql)
alter table public.profiles enable row level security;

-- Function: extract username from email prefix on new user creation.
-- Emails are stored as "{username}@sri.sakhi" so we split on '@'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    split_part(new.email, '@', 1)
  );
  return new;
end;
$$;

-- Trigger: fires after every new row in auth.users
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
