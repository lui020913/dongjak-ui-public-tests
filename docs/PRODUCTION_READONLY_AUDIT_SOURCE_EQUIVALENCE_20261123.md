# Autonomous Production audit: source equivalence safety gate

The read-only scheduled browser QA previously required the public `main` SHA to equal `release-source.json` verbatim. A documentation-only or CI-only merge therefore silently skipped Production health exploration despite **no app changes**.

The new guard checks the signed-off marker's Production status, matching public source SHA, application version and current SHA. If the GitHub commits differ, it fetches the deployed commit read-only and compares `app/` contents with `git diff --quiet`. Only an **identical application tree** permits the scheduled audit; a changed app, invalid marker, unavailable Git history or any comparison error **fails closed** and skips the audit.

This changes the monitoring workflow and tests only. Deployed app files, GIS, API, Supabase, auth, routing and protected release gates remain unchanged. No direct Cloudflare deployment is performed.
