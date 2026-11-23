# Safe source cleanup — 2026-11-23

## No-outage gate

**This branch is a staging refactor, not authorization to replace Production without evidence.**
The currently deployed artifact must remain unchanged until this exact source revision passes the app unit suite, Vite production build, phone-only flow QA, anonymous service checks and isolated Preview. Preserve the current source/build SHA for rollback, verify the app's map, PRI/transport/AI/community entry points and cache behavior, then promote only the same tested artifact. No Supabase schema change, dataset rewrite or destructive cleanup is allowed here.

## Verified facts

- App source of truth: `app/` in `lui020913/dongjak-ui-public-tests`; private repository `main` is primarily automation.
- App source includes several historical and current CSS layers. Earlier files cannot be deleted by filename alone: cascade order, CSS assets and real DOM ownership must be mapped first.
- `app/public/data/pri/manifest.json` loads lighting, accident, institutional protection, crossing rubric and shared-road rubric; speed is matched from a separate node-link dataset. Crossing and shared-road rubric files presently have no individual road observations. `NULL` is not zero risk.
- Three-, four- and six-factor equal-weight observed means previously copied the same filter/mean expression. A single pure helper now retains every exported wrapper and the >=2 observed rule, including zero-valued observations and modeled exclusions.
- Road protection research contains multiple dated candidate/preview exports. Published map files, segment IDs and source provenance are preserved here; moving or deleting them without a consumer graph risks data loss.
- The mobile release workflow currently gates through Preview and twelve phone QA shards. Preserve the protected release provenance and the existing failure-recovery safety checks; remove obsolete workflows only after caller/callee and event trigger review.

## Changes on this branch

1. Refactor only the identical, pure PRI 3/4/6 score coverage and mean calculations; no weights, source files or rendering rules change.
2. Regression tests lock down NULL, zero, modeled data, partial coverage, network ID and manifest factor uniqueness.
3. Production, deployment, CSS, database and safety source files are unchanged.

## Remaining cleanup is intentionally gated

1. **UI P0**: build a selector-to-owner map for active CSS, carry out feature-by-feature rule replacement, then remove superseded imports in the same PR. Validate on 375/390/430px iOS/Android and ensure map never flashes on tab switches, modal dismiss restores focus and no bottom-sheet overlays hide buttons.
2. **Data P1**: maintain a live `public/data/pri/` manifest and preserve immutable GIS source snapshots. Only verified, uniquely referenced derived assets may be migrated; keep provenance and the original scored or unscored interpretation.
3. **Performance P1**: instrument the built JS/CSS output, first paint, time to map interactive, feature collection parsing, building tile loads and API counts. Do not infer client load from repository file size.
4. **Automation P1**: trace all workflow triggers and retry cascades. Isolate non-essential Gemini/design tasks; keep Preview, exact SHA and protected Production checks mandatory.
5. **Supabase P1**: RLS enabled; use targeted policy/advisor review for index and authorization issues. Never drop indices/tables merely for low use; no database write on this branch.
6. **Docs P2**: archive historical UI experiments and old standalone research HTML only after verifying no runtime/QA references.

No claim of complete cleanup is made until every owner, import and target has been verified in CI and on deployed Preview.
