-- Stage together with the matching client and Edge Function; do not apply alone.
begin;
alter table public.community_comments add column if not exists photo text check (photo is null or (char_length(photo)<=600000 and photo like 'data:image/jpeg;base64,%'));
alter table public.community_posts drop constraint if exists community_posts_category_check;
alter table public.community_posts add constraint community_posts_category_check check (category in ('보행 불편','개선 제안','동네 질문','동네생활','생활정보','교통정보','자유게시판'));
create table public.community_moderation_queue (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('post','comment')),
 fingerprint text not null,
 image_fingerprint text,
 payload jsonb not null,
 state text not null default 'processing' check(state in ('processing','published','removed','review')),
 reason text,
 created_at timestamptz not null default now(),
 finished_at timestamptz
);
create index community_moderation_user_time on public.community_moderation_queue(user_id,created_at desc);
alter table public.community_moderation_queue enable row level security;
revoke all on public.community_moderation_queue from public,anon,authenticated;
grant select,insert,update,delete on public.community_moderation_queue to service_role;
create table public.community_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 submission_id uuid not null unique references public.community_moderation_queue(id) on delete cascade,
 kind text not null check(kind in ('post','comment')),
 reason text not null,
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index community_notifications_user_time on public.community_notifications(user_id,created_at desc);
alter table public.community_notifications enable row level security;
revoke all on public.community_notifications from public,anon,authenticated;
grant select,update(read_at) on public.community_notifications to authenticated;
grant select,insert,update,delete on public.community_notifications to service_role;
create policy community_notifications_owner_read on public.community_notifications for select to authenticated using ((select auth.uid())=user_id);
create policy community_notifications_owner_update on public.community_notifications for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
-- Existing permissive insert policies must not permit bypassing moderation.
create policy community_posts_moderation_required on public.community_posts as restrictive for insert to anon,authenticated with check(false);
create policy community_comments_moderation_required on public.community_comments as restrictive for insert to anon,authenticated with check(false);
create policy community_posts_edit_moderation_required on public.community_posts as restrictive for update to anon,authenticated using(false) with check(false);
create policy community_comments_edit_moderation_required on public.community_comments as restrictive for update to anon,authenticated using(false) with check(false);
create function public.community_moderation_reserve(p_user uuid,p_kind text,p_fingerprint text,p_image_fingerprint text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_count bigint; v_duplicate boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select count(*) into v_count from public.community_moderation_queue where user_id=p_user and created_at>now()-interval '1 minute';
 if v_count>=8 then return jsonb_build_object('state','limited'); end if;
 select exists(select 1 from public.community_moderation_queue where user_id=p_user and kind=p_kind and fingerprint=p_fingerprint and state='published' and created_at>now()-interval '10 minutes') into v_duplicate;
 if not v_duplicate and p_image_fingerprint is not null then
 select count(*)>=3 into v_duplicate from public.community_moderation_queue where user_id=p_user and image_fingerprint=p_image_fingerprint and state='published' and created_at>now()-interval '10 minutes';
 end if;
 insert into public.community_moderation_queue(user_id,kind,fingerprint,image_fingerprint,payload,state,reason,finished_at)
 values(p_user,p_kind,p_fingerprint,p_image_fingerprint,p_payload,case when v_duplicate then 'removed' else 'processing' end,case when v_duplicate then 'spam' end,case when v_duplicate then now() end) returning id into v_id;
 if v_duplicate then
 insert into public.community_notifications(user_id,submission_id,kind,reason) values(p_user,v_id,p_kind,'spam');
 end if;
 return jsonb_build_object('id',v_id,'state',case when v_duplicate then 'removed' else 'processing' end,'reason',case when v_duplicate then 'spam' end);
end;$$;
revoke all on function public.community_moderation_reserve(uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.community_moderation_reserve(uuid,text,text,text,jsonb) to service_role;
create function public.community_moderation_finish(p_id uuid,p_decision text,p_reason text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q public.community_moderation_queue%rowtype; target uuid;
begin
 if p_decision not in ('published','removed','review') or p_reason not in ('clean','profanity','harassment','spam','sexual','graphic','privacy','illegal_ad','uncertain','unavailable') then raise exception 'invalid moderation result'; end if;
 select * into q from public.community_moderation_queue where id=p_id for update;
 if not found or q.state not in ('processing','review') then raise exception 'submission already finalized or missing'; end if;
 if p_decision='published' then
 if q.kind='post' then
 insert into public.community_posts(author_id,title,body,nickname,category,photo,lng,lat)
 values(q.user_id,q.payload->>'title',q.payload->>'body',q.payload->>'nickname',q.payload->>'category',q.payload->>'photo',(q.payload->>'lng')::double precision,(q.payload->>'lat')::double precision) returning id into target;
 else
 insert into public.community_comments(author_id,post_id,body,nickname,photo)
 values(q.user_id,(q.payload->>'post_id')::uuid,q.payload->>'body',q.payload->>'nickname',q.payload->>'photo') returning id into target;
 end if;
 elsif p_decision='removed' then
 insert into public.community_notifications(user_id,submission_id,kind,reason) values(q.user_id,q.id,q.kind,p_reason) on conflict(submission_id) do nothing;
 end if;
 update public.community_moderation_queue set state=p_decision,reason=p_reason,finished_at=now(),payload=case when p_decision='published' then '{}'::jsonb else payload end where id=p_id;
 return jsonb_build_object('state',p_decision,'reason',p_reason,'target_id',target);
end;$$;
revoke all on function public.community_moderation_finish(uuid,text,text) from public,anon,authenticated;
grant execute on function public.community_moderation_finish(uuid,text,text) to service_role;
commit;
