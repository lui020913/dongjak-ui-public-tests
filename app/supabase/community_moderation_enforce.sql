-- Apply only at coordinated Production cutover after successful deployed AI test.
begin;
-- Existing permissive insert policies must not permit bypassing moderation.
create policy community_posts_moderation_required on public.community_posts as restrictive for insert to anon,authenticated with check(false);
create policy community_comments_moderation_required on public.community_comments as restrictive for insert to anon,authenticated with check(false);
create policy community_posts_edit_moderation_required on public.community_posts as restrictive for update to anon,authenticated using(false) with check(false);
create policy community_comments_edit_moderation_required on public.community_comments as restrictive for update to anon,authenticated using(false) with check(false);
commit;
