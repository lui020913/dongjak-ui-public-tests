-- Additive, server-only push subscriptions and delivery queue.
begin;
create table public.community_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check(char_length(endpoint) between 20 and 2048),
 p256dh text not null check(p256dh ~ '^[A-Za-z0-9_-]{87}$'),
 auth_key text not null check(auth_key ~ '^[A-Za-z0-9_-]{22}$'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index community_push_subscriptions_user on public.community_push_subscriptions(user_id);
alter table public.community_push_subscriptions enable row level security;
revoke all on public.community_push_subscriptions from public,anon,authenticated;
grant select,insert,update,delete on public.community_push_subscriptions to service_role;
create table public.community_push_deliveries (
 id uuid primary key default gen_random_uuid(),
 notification_id uuid not null references public.community_notifications(id) on delete cascade,
 subscription_id uuid not null references public.community_push_subscriptions(id) on delete cascade,
 state text not null default 'pending' check(state in ('pending','leased','sent','failed')),
 attempts smallint not null default 0 check(attempts between 0 and 3),
 available_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 unique(notification_id,subscription_id)
);
create index community_push_deliveries_due on public.community_push_deliveries(available_at) where state in ('pending','leased');
alter table public.community_push_deliveries enable row level security;
revoke all on public.community_push_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.community_push_deliveries to service_role;
create function public.community_push_register(p_user uuid,p_endpoint text,p_p256dh text,p_auth text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare existing public.community_push_subscriptions%rowtype;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,31));
 perform pg_advisory_xact_lock(hashtextextended(p_endpoint,32));
 select * into existing from public.community_push_subscriptions where endpoint=p_endpoint;
 if found then
  if existing.user_id<>p_user then return false;end if;
  update public.community_push_subscriptions set p256dh=p_p256dh,auth_key=p_auth,updated_at=now() where id=existing.id;
  return true;
 end if;
 if (select count(*) from public.community_push_subscriptions where user_id=p_user)>=5 then return false;end if;
 insert into public.community_push_subscriptions(user_id,endpoint,p256dh,auth_key) values(p_user,p_endpoint,p_p256dh,p_auth);
 return true;
end;$$;
revoke all on function public.community_push_register(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.community_push_register(uuid,text,text,text) to service_role;
create function public.community_push_enqueue()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.community_push_deliveries(notification_id,subscription_id)
 select new.id,s.id from public.community_push_subscriptions s where s.user_id=new.user_id
 on conflict(notification_id,subscription_id) do nothing;
 return new;
end;$$;
revoke all on function public.community_push_enqueue() from public,anon,authenticated;
grant execute on function public.community_push_enqueue() to service_role;
create trigger community_push_notice_insert after insert on public.community_notifications for each row execute function public.community_push_enqueue();
create function public.community_push_claim()
returns table(delivery_id uuid,subscription_id uuid,endpoint text,p256dh text,auth_key text,attempts smallint)
language sql security invoker set search_path='' as $$
 with picked as (
  select d.id from public.community_push_deliveries d
  join public.community_notifications n on n.id=d.notification_id
  where d.state in ('pending','leased') and d.attempts<3 and d.available_at<=now()
    and d.created_at>now()-interval '24 hours' and n.read_at is null
  order by d.available_at,d.created_at limit 10 for update of d skip locked
 ), claimed as (
  update public.community_push_deliveries d set state='leased',attempts=d.attempts+1,available_at=now()+interval '2 minutes'
  from picked p where d.id=p.id returning d.id,d.subscription_id,d.attempts
 )
 select c.id,c.subscription_id,s.endpoint,s.p256dh,s.auth_key,c.attempts
 from claimed c join public.community_push_subscriptions s on s.id=c.subscription_id;
$$;
revoke all on function public.community_push_claim() from public,anon,authenticated;
grant execute on function public.community_push_claim() to service_role;
commit;
