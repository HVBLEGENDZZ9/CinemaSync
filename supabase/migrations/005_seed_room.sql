-- 005_seed_room.sql
-- Seed the single shared room row. This is the only row that should ever exist.

insert into public.rooms (id)
values ('main')
on conflict (id) do nothing;
