begin;
alter table public.community_comments add column parent_id uuid;
alter table public.community_comments add constraint community_comments_post_and_id_key unique(post_id,id);
alter table public.community_comments add constraint community_comments_parent_in_post foreign key(post_id,parent_id) references public.community_comments(post_id,id) on delete set null (parent_id);
alter table public.community_comments add constraint community_comments_not_own_parent check(parent_id is null or parent_id<>id);
create index community_comments_parent_idx on public.community_comments(post_id,parent_id);
create table public.community_bookmarks(
 author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 post_id uuid not null references public.community_posts(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(author_id,post_id)
);
alter table public.community_bookmarks enable row level security;
revoke all on public.community_bookmarks from public,anon,authenticated;
grant select,insert(post_id),delete on public.community_bookmarks to authenticated;
grant select,insert,update,delete on public.community_bookmarks to service_role;
create policy community_bookmark_read on public.community_bookmarks for select to authenticated using ((select auth.uid())=author_id and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
create policy community_bookmark_insert on public.community_bookmarks for insert to authenticated with check ((select auth.uid())=author_id and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
create policy community_bookmark_delete on public.community_bookmarks for delete to authenticated using ((select auth.uid())=author_id and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
create table public.community_reports(
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 post_id uuid not null references public.community_posts(id) on delete cascade,
 comment_id uuid,
 reason text not null check(reason in ('profanity','harassment','spam','sexual','graphic','privacy','illegal_ad','other')),
 state text not null default 'pending' check(state in ('pending','reviewed','dismissed')),
 created_at timestamptz not null default now(),
 constraint community_report_comment_in_post foreign key(post_id,comment_id) references public.community_comments(post_id,id) on delete cascade,
 unique nulls not distinct(author_id,post_id,comment_id)
);
alter table public.community_reports enable row level security;
revoke all on public.community_reports from public,anon,authenticated;
grant select,insert(post_id,comment_id,reason) on public.community_reports to authenticated;
grant select,insert,update,delete on public.community_reports to service_role;
create policy community_report_read on public.community_reports for select to authenticated using ((select auth.uid())=author_id and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
create policy community_report_insert on public.community_reports for insert to authenticated with check ((select auth.uid())=author_id and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
create or replace function public.community_moderation_finish(p_id uuid,p_decision text,p_reason text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q public.community_moderation_queue%rowtype; target uuid;
begin
 if p_decision is null or p_reason is null or p_decision not in ('published','removed','review') or p_reason not in ('clean','profanity','harassment','spam','sexual','graphic','privacy','illegal_ad','uncertain','unavailable') then raise exception 'invalid moderation result'; end if;
 if ((p_decision='published') is distinct from (p_reason='clean')) or (p_decision='removed' and p_reason in ('uncertain','unavailable')) then raise exception 'inconsistent moderation result'; end if;
 select * into q from public.community_moderation_queue where id=p_id for update;
 if not found or q.state not in ('processing','review') then raise exception 'submission already finalized or missing'; end if;
 if p_decision='published' then
 if q.kind='post' then
 insert into public.community_posts(author_id,title,body,nickname,category,photo,lng,lat)
 values(q.user_id,q.payload->>'title',q.payload->>'body',q.payload->>'nickname',q.payload->>'category',q.payload->>'photo',(q.payload->>'lng')::double precision,(q.payload->>'lat')::double precision) returning id into target;
 else
 insert into public.community_comments(author_id,post_id,body,nickname,photo,parent_id)
 values(q.user_id,(q.payload->>'post_id')::uuid,q.payload->>'body',q.payload->>'nickname',q.payload->>'photo',(q.payload->>'parent_id')::uuid) returning id into target;
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
