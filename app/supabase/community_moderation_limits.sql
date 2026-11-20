-- Additive: v2 reserve stays callable for older deployed function; no change to enforcement.
begin;
alter table public.community_moderation_queue add column image_perceptual_hash text check(image_perceptual_hash is null or image_perceptual_hash ~ '^[01]{64}$');
create function public.community_moderation_reserve_v3(p_user uuid,p_kind text,p_fingerprint text,p_image_fingerprint text,p_payload jsonb,p_perceptual_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_count bigint; v_duplicate boolean; v_pending uuid; v_latest timestamptz; v_removed bigint; v_similar bigint:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if p_perceptual_hash is not null and p_perceptual_hash !~ '^[01]{64}$' then raise exception 'invalid image fingerprint'; end if;
 select count(*),max(finished_at) into v_removed,v_latest from public.community_moderation_queue where user_id=p_user and state='removed' and finished_at>now()-interval '24 hours';
 if v_removed>=3 and v_latest>now()-interval '30 minutes' then return jsonb_build_object('state','restricted','retry_at',v_latest+interval '30 minutes'); end if;
 select count(*) into v_count from public.community_moderation_queue where user_id=p_user and created_at>now()-interval '1 minute';
 if v_count>=8 then return jsonb_build_object('state','limited'); end if;
 select id into v_pending from public.community_moderation_queue where user_id=p_user and kind=p_kind and fingerprint=p_fingerprint and state in ('processing','review') and created_at>now()-interval '10 minutes' order by created_at desc limit 1;
 if v_pending is not null then return jsonb_build_object('id',v_pending,'state','review','reason','uncertain'); end if;
 select exists(select 1 from public.community_moderation_queue where user_id=p_user and kind=p_kind and fingerprint=p_fingerprint and state='published' and created_at>now()-interval '10 minutes') into v_duplicate;
 if not v_duplicate and p_image_fingerprint is not null then
 select count(*)>=3 into v_duplicate from public.community_moderation_queue where user_id=p_user and image_fingerprint=p_image_fingerprint and state in ('published','processing','review') and created_at>now()-interval '10 minutes';
 end if;
 if not v_duplicate and p_perceptual_hash is not null then
  select count(*) into v_similar from public.community_moderation_queue
  where user_id=p_user and image_perceptual_hash is not null and state in ('published','processing','review') and created_at>now()-interval '10 minutes'
  and bit_count(image_perceptual_hash::bit(64) # p_perceptual_hash::bit(64))<=5;
 end if;
 insert into public.community_moderation_queue(user_id,kind,fingerprint,image_fingerprint,image_perceptual_hash,payload,state,reason,finished_at)
 values(p_user,p_kind,p_fingerprint,p_image_fingerprint,p_perceptual_hash,p_payload,case when v_duplicate then 'removed' when v_similar>=3 then 'review' else 'processing' end,case when v_duplicate then 'spam' when v_similar>=3 then 'uncertain' end,case when v_duplicate or v_similar>=3 then now() end) returning id into v_id;
 if v_duplicate then
 insert into public.community_notifications(user_id,submission_id,kind,reason) values(p_user,v_id,p_kind,'spam');
 end if;
 return jsonb_build_object('id',v_id,'state',case when v_duplicate then 'removed' when v_similar>=3 then 'review' else 'processing' end,'reason',case when v_duplicate then 'spam' when v_similar>=3 then 'uncertain' end);
end;$$;
revoke all on function public.community_moderation_reserve_v3(uuid,text,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.community_moderation_reserve_v3(uuid,text,text,text,jsonb,text) to service_role;

commit;
