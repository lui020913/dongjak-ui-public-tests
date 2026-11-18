# Seoul facilities D1 / Worker controlled rollout

Scope: `이-작` project. **No deployment is performed by this document or its CI.**

## Verified baseline (2026-11-16)

- D1 database `dongjak-seoul-facilities` already exists with ID `6bc278d1-ee7a-45e9-b451-680b88041b5a`.
- `seoul_facilities` contains **3,551** preserved rows: animal_pharmacy 67; cafe 974; pharmacy 197; restaurant 2,313.
- `seoul_facility_sync`: three OK, cafe error `The operation was aborted due to timeout`.
- Cloudflare API read-only audit: Production Pages binding `AI` present, `SEOUL_FACILITIES_DB` absent; live facilities endpoint 503, transport endpoint 200.
- Cloudflare Worker script listing (using current GitHub Cloudflare token) returned **zero scripts**. No deployed Seoul sync Worker could be verified.
- Five Production Pages variables are already configured: `AED_API_KEY`, `OPENAI_API_KEY`, `SEOUL_BUS_SERVICE_KEY`, `SEOUL_OPEN_API_KEY`, `SEOUL_SUBWAY_API_KEY`. **Do not expose or overwrite their values during rollout.**
- Last known Production deployment ID from GET-only audit: `f1500b02-58f9-469f-bd2c-61a18566fa3a`. Recheck immediately before any Production change; do not assume this stays current.

## Source and deployment plan

1. Keep PR #24 integrated UI candidate and PR #26 Pages D1 binding change separate until current-release source and CI are reconciled.
2. The missing Worker deploy configuration has been restored at `wrangler.seoul-facilities.jsonc`. Main script: `src/workers/seoul-facility-sync.mjs`. D1 binding: `SEOUL_FACILITIES_DB`. Schedule: `0 18 * * *` UTC = 03:00 KST each day.
3. Check dry-run bundling with `npx wrangler@4 deploy --dry-run --config wrangler.seoul-facilities.jsonc`. This never creates or updates the Worker.
4. Do **not** deploy until the Cloudflare token has Workers Scripts Write permission, required Worker secrets are available, and any existing independent Worker deployment is accounted for.
5. On a first-ever Worker deployment, configure `SEOUL_OPEN_API_KEY` and `SEOUL_SYNC_TOKEN` as encrypted Worker **secrets**, not in git, chat, console output, or the config JSON. The existing Pages `SEOUL_OPEN_API_KEY` secret is not automatically shared with a separate Worker.
6. After secrets are configured, verify `/health` reports `keyConfigured:true` and `dbConfigured:true`. Trigger only the `cafe` source via authenticated POST `/admin/sync?source=cafe` and use a properly generated random token via protected header. Do not log the key or token.
7. Verify `seoul_facility_sync` status, `last_success`, source-level stored counts, and total D1 rows. Abort if unexpected deletions.
8. For Pages Production, confirm **all existing Production secrets and their names are preserved** before deploying any new Wrangler configuration. The Pages `wrangler.toml` is source-of-truth; production binding adjustments will require a fresh deployment. Rollback should preserve the original Production deployment and configuration snapshot, not just static assets.
9. Only after targeted HTTP health and desktop/mobile smoke checks pass should the real Production app be promoted. Never use an unreviewed main branch: the repository's `main` currently contains CI-only automation, not the complete map application.

## Safe local commands (do not deploy)

```powershell
npm ci
node --test tests/seoul-facility-retry.test.mjs tests/seoul-facilities-v850.test.mjs
npx wrangler@4 deploy --dry-run --config wrangler.seoul-facilities.jsonc
```

## Restrictions

- Do not re-create the D1 database, reapply SQL migrations blindly, or clear existing rows.
- Cloudflare Worker Cron changes can replace existing schedules. Compare the currently installed triggers before a real deploy.
- Retrying a timeout only applies to HTTP reads; retrying D1 writes blindly can duplicate work. The source code uses UPSERT and source-scoped finalization, and still needs real-worker postdeploy validation.
- Public-health endpoint must never echo secrets or query keys.
