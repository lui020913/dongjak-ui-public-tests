# Archived pinned visual diagnostics (2026-11-23)

The following **manual / old-candidate-only** GitHub Actions workflows are retired from active workflow menus after the current protected 9.2.115 mobile release succeeded:

- `focused-mobile-alignment-proof.yml`
- `focused-mobile-design-proof.yml`
- `focused-route-result-proof.yml`
- `focused-theme-diagnostic.yml`
- `route-cta-hit-diagnostic.yml`

These workflows used earlier hard-coded CSS candidate commit SHAs or expired Preview deployment URLs and are not part of current deployment, mobile 12-shard QA, GIS inputs, maps, community, AI chat or database operations. Their historical definitions remain in Git history.

**Preserved:** `mobile-first-overhaul-preview.yml`, `public-app-pr.yml`, `mobile-release-failure-recovery.yml`, `public-pr-failure-recovery.yml`, `ai-ui-recovery.yml`, `v911-failure-recovery.yml`, `public-uptime.yml` and all current production release checks.

No live runtime code, datasets, schemas or production deployment is changed. A regression test in the root CI checks retired filenames do not reappear and that all guarded operational workflows remain. This does not automatically approve the removal of any other workstream-specific diagnostic.
