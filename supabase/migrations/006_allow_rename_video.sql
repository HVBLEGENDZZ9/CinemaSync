-- 006_allow_rename_video.sql
-- Allow users to update (rename) their own video_library entries.
-- Only the filename column should change; file_url, file_size_bytes, user_id stay immutable.

create policy "video_library_update_own"
  on public.video_library
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
