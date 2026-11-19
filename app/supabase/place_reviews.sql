-- v8.2.15. Run in Supabase SQL Editor to enable SHARED facility reviews.
-- Until applied, reviews are stored only in the visitor's device.
create table if not exists public.place_reviews (
  id uuid primary key default gen_random_uuid(),
  place_key text not null check (char_length(place_key) between 4 and 170),
  place_name text not null check (char_length(place_name) between 1 and 90),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '이용자' check (char_length(author_name) between 1 and 32),
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(trim(body)) between 5 and 800),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint place_reviews_one_per_user unique (place_key,user_id)
);
create index if not exists place_reviews_by_place on public.place_reviews(place_key,created_at desc);
alter table public.place_reviews enable row level security;
-- Public browsing, authenticated authors only; nobody may edit other users' reviews.
drop policy if exists "reviews_public_read" on public.place_reviews;
create policy "reviews_public_read" on public.place_reviews for select to anon,authenticated using (true);
drop policy if exists "reviews_own_insert" on public.place_reviews;
create policy "reviews_own_insert" on public.place_reviews for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "reviews_own_update" on public.place_reviews;
create policy "reviews_own_update" on public.place_reviews for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "reviews_own_delete" on public.place_reviews;
create policy "reviews_own_delete" on public.place_reviews for delete to authenticated using (auth.uid()=user_id);
grant select on public.place_reviews to anon;
grant select,insert,update,delete on public.place_reviews to authenticated;
