-- Exact migration applied on live project 2026-11-24. Existing RLS and
-- client grants unchanged. Only trusted server invoker procedures can publish.
GRANT SELECT, INSERT ON TABLE public.community_posts, public.community_comments TO service_role;
NOTIFY pgrst, 'reload schema';
