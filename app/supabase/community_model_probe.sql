-- Short-lived, single-use diagnostic tokens. Only DB operators can create tokens.
begin;
create extension if not exists pg_net with schema extensions;
create table public.community_model_probe_tokens(
 token_hash text primary key check(token_hash ~ '^[0-9a-f]{64}$'),
 expires_at timestamptz not null
);
alter table public.community_model_probe_tokens enable row level security;
revoke all on public.community_model_probe_tokens from public,anon,authenticated,service_role;
grant select,delete on public.community_model_probe_tokens to service_role;
create function public.community_model_probe_redeem(p_token text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare matched text;
begin
 if p_token is null or p_token !~ '^[0-9a-f-]{72}$' then return false;end if;
 delete from public.community_model_probe_tokens
 where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and expires_at>now()
 returning token_hash into matched;
 return matched is not null;
end;$$;
revoke all on function public.community_model_probe_redeem(text) from public,anon,authenticated;
grant execute on function public.community_model_probe_redeem(text) to service_role;
-- The database networking extension is used by operators, never client roles.
revoke usage on schema net from public,anon,authenticated;
revoke execute on all functions in schema net from public,anon,authenticated;
commit;
