-- Restore only public fields selected by the community feed, preserving RLS.
GRANT SELECT (photo, parent_id) ON public.community_comments TO anon, authenticated;
