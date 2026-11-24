-- Optional public neighborhood label. Existing posts and clients remain valid.
alter table public.community_posts add column dong text;
alter table public.community_posts add constraint community_posts_dong_check check (dong is null or dong in ('노량진1동','노량진2동','상도1동','상도2동','상도3동','상도4동','흑석동','사당1동','사당2동','사당3동','사당4동','사당5동','대방동','신대방1동','신대방2동'));
grant select (dong) on public.community_posts to anon, authenticated;
CREATE OR REPLACE FUNCTION public.community_moderation_finish(p_id uuid, p_decision text, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q public.community_moderation_queue%rowtype; target uuid;
begin
 if p_decision is null or p_reason is null or p_decision not in ('published','removed','review') or p_reason not in ('clean','profanity','harassment','spam','sexual','graphic','privacy','illegal_ad','uncertain','unavailable') then raise exception 'invalid moderation result'; end if;
 if ((p_decision='published') is distinct from (p_reason='clean')) or (p_decision='removed' and p_reason in ('uncertain','unavailable')) then raise exception 'inconsistent moderation result'; end if;
 select * into q from public.community_moderation_queue where id=p_id for update;
 if not found or q.state not in ('processing','review') then raise exception 'submission already finalized or missing'; end if;
 if p_decision='published' then
 if q.kind='post' then
 insert into public.community_posts(author_id,title,body,nickname,category,photo,lng,lat,dong)
 values(q.user_id,q.payload->>'title',q.payload->>'body',q.payload->>'nickname',q.payload->>'category',q.payload->>'photo',(q.payload->>'lng')::double precision,(q.payload->>'lat')::double precision,q.payload->>'dong') returning id into target;
 else
 insert into public.community_comments(author_id,post_id,body,nickname,photo,parent_id)
 values(q.user_id,(q.payload->>'post_id')::uuid,q.payload->>'body',q.payload->>'nickname',q.payload->>'photo',(q.payload->>'parent_id')::uuid) returning id into target;
 end if;
 elsif p_decision='removed' then
 insert into public.community_notifications(user_id,submission_id,kind,reason) values(q.user_id,q.id,q.kind,p_reason) on conflict(submission_id) do nothing;
 end if;
 update public.community_moderation_queue set state=p_decision,reason=p_reason,finished_at=now(),payload=case when p_decision='published' then '{}'::jsonb else payload end where id=p_id;
 return jsonb_build_object('state',p_decision,'reason',p_reason,'target_id',target);
end;$function$;
revoke all on function public.community_moderation_finish(uuid,text,text) from public,anon,authenticated;
grant execute on function public.community_moderation_finish(uuid,text,text) to service_role;
