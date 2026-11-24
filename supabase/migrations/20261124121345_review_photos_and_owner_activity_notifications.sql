alter table public.place_reviews add column if not exists photo text;
alter table public.place_reviews add constraint place_reviews_photo_jpeg_bound check(photo is null or (char_length(photo)<=410000 and photo ~ '^data:image/jpeg;base64,/9j/[A-Za-z0-9+/]+={0,2}$'));
grant select(photo) on public.place_reviews to anon,authenticated;
grant insert(photo),update(photo) on public.place_reviews to authenticated;
create table public.community_activity_notifications(
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 post_id uuid not null references public.community_posts(id) on delete cascade,
 kind text not null check(kind in ('comment','like')),
 event_key text not null,
 post_title text not null,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(post_id,kind,event_key)
);
create index community_activity_recipient_created_idx on public.community_activity_notifications(recipient_id,created_at desc);
alter table public.community_activity_notifications enable row level security;
revoke all on public.community_activity_notifications from public,anon,authenticated;
grant select(id,recipient_id,post_id,kind,post_title,created_at,read_at),update(read_at) on public.community_activity_notifications to authenticated;
create policy activity_recipient_read on public.community_activity_notifications for select to authenticated using ((select auth.uid())=recipient_id and coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false)=false);
create policy activity_recipient_mark_read on public.community_activity_notifications for update to authenticated using ((select auth.uid())=recipient_id and coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false)=false) with check ((select auth.uid())=recipient_id and read_at is not null and coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false)=false);
create schema if not exists dj_activity_internal;
revoke all on schema dj_activity_internal from public,anon,authenticated;
create function dj_activity_internal.notify_post_owner() returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid; title_text text; event_kind text; event_id text;
begin
 if TG_TABLE_SCHEMA <> 'public' or TG_TABLE_NAME not in ('community_comments','community_likes') then raise exception 'Invalid notification source'; end if;
 select author_id,title into owner_id,title_text from public.community_posts where id=new.post_id;
 if owner_id is null or owner_id=new.author_id then return new; end if;
 if TG_TABLE_NAME='community_comments' then event_kind:='comment'; event_id:=new.id::text;
 else event_kind:='like'; event_id:=new.author_id::text; end if;
 insert into public.community_activity_notifications(recipient_id,post_id,kind,event_key,post_title) values(owner_id,new.post_id,event_kind,event_id,title_text) on conflict(post_id,kind,event_key) do nothing;
 return new;
end $$;
revoke all on function dj_activity_internal.notify_post_owner() from public,anon,authenticated;
create trigger dj_notify_comment after insert on public.community_comments for each row execute function dj_activity_internal.notify_post_owner();
create trigger dj_notify_like after insert on public.community_likes for each row execute function dj_activity_internal.notify_post_owner();
