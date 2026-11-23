# Workflow consolidation safety audit (2026-11-23)

## Change scope

- Remove the immutable 8.26.1 mobile production retry workflow and its request file. The pinned build run `44372494679`, source SHA `0c4be7f5...`, and artifact retention were tied to an earlier release, **not** the live 9.2.111 series. This was a historical fallback, not the current release or rollback controller.
- Retain `.github/workflows/mobile-first-overhaul-preview.yml` including the exact-SHA build, isolated Preview, all 12 phone shards, PC/tablet QA, protected Production environment and verified guarded rollback.
- The public uptime check's default URL now targets the real Production domain rather than the retired `v881-integrated-1116` Preview. `vars.DONGJAK_TARGET_URL` still takes precedence if explicitly configured.
- Remove the retired workflow name from legacy deployment notifications.
- Guard the release owner, rollback, URL and workflow retirement in root CI tests.

## Nonchanges

No deployed app source, CSS, GIS source data, Supabase policies, production bindings, API, or user data was modified.

## Restore if ever needed

Use Git history for reference to the 8.26.1 workflow. Do **not** reintroduce it unchanged: its build pin and artifact are stale. For production recovery, the canonical release workflow's guarded rollback is the supported path.
