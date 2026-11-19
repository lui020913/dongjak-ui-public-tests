-- Run once in the Supabase SQL Editor. Public browser clients can ONLY access
-- their own row through authenticated RLS. Do not use service_role in Vite.
create table if not exists public.user_favorite_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null default '{"version":1,"groups":[],"places":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint favorite_snapshot_shape check (
    jsonb_typeof(snapshot) = 'object'
    and octet_length(snapshot::text) <= 120000
  )
);
create index if not exists user_favorite_state_updated_idx
  on public.user_favorite_state(updated_at);
alter table public.user_favorite_state enable row level security;
revoke all on public.user_favorite_state from anon, authenticated;
grant select, insert, update on public.user_favorite_state to authenticated;
-- A signed-out visitor cannot read, write or enumerate private bookmarks.
create policy "Read own favorites" on public.user_favorite_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own favorites" on public.user_favorite_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own favorites" on public.user_favorite_state
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- No client-side delete grant/policy; account removal handled separately.
