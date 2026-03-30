-- 004_rls_policies.sql
-- Row Level Security policies for all tables.
-- RLS is already enabled in each table's migration; this file defines the policies.

-- =============================================================================
-- PROFILES
-- =============================================================================

-- Any authenticated user can read any profile (both users see each other)
create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Users can only insert their own profile row (used by the trigger)
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- Users can only update their own profile
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- =============================================================================
-- ROOMS
-- =============================================================================

-- Any authenticated user can read the room state
create policy "rooms_select_authenticated"
  on public.rooms
  for select
  to authenticated
  using (true);

-- Any authenticated user can update the room state (either user controls playback)
create policy "rooms_update_authenticated"
  on public.rooms
  for update
  to authenticated
  using (true)
  with check (true);

-- No inserts allowed — the seed row is the only row
-- (No INSERT policy = implicit deny when RLS is enabled)

-- No deletes allowed
-- (No DELETE policy = implicit deny when RLS is enabled)

-- =============================================================================
-- VIDEO_LIBRARY
-- =============================================================================

-- Any authenticated user can read all library entries (shared library)
create policy "video_library_select_authenticated"
  on public.video_library
  for select
  to authenticated
  using (true);

-- Any authenticated user can insert (both users can upload)
create policy "video_library_insert_authenticated"
  on public.video_library
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- No updates allowed — files are immutable once uploaded
-- (No UPDATE policy = implicit deny when RLS is enabled)

-- Only the uploader can delete their own entries
create policy "video_library_delete_own"
  on public.video_library
  for delete
  to authenticated
  using (auth.uid() = user_id);
