# v8.8.0 Final ZIP Intake Audit — 2026-11-15

> This is an import-stage audit, **not a release approval**. Preserve the main branch and current Cloudflare production deployment.

## Source snapshot
- User-provided archive: `DongjakApp_v8.8.0_FINAL_INTEGRATED_20261115.zip`
- SHA-256: `96b4367d75e263a4660a4c18d467064b6367f815d543d5a4b5874cdf66726be3`
- 1,092 files, ~72.6 MB unpacked; package version `8.8.0`
- Vite/Node/Playwright source and seven GitHub workflow files are present in the archive.
- **Import policy:** preserve newer GitHub workflow files already in the repository; do not overwrite them with ZIP copies.
- Exclude `android/local.properties` (machine-specific SDK path), secrets, local environment/configuration, and generated dependencies.

## Checks actually performed on this archive
| Check | Result |
|---|---|
| ZIP inventory/path traversal | Clean (no unsafe archive member paths) |
| Strong-pattern secrets | No matches found (not a full security guarantee) |
| `npm run check:release` | Passed; v8.8.0 / 136 releases |
| `npm test` | **1,484 tests: 1,459 pass / 11 fail / 14 skip** |
| JS syntax (CI scripts) | Passed |
| `npm ci --offline` | Not possible: required dependency tarball absent from cache |
| `npm run build` | Not completed: Vite unavailable after package install failed |
| Entire Playwright suite in this container | Not run |

### Node failure breakdown
- 1 failure due to missing `wrangler.jsonc` expected by a Workers AI regression test
- 10 failures in older source-pattern / UI expectation tests (toolbar, search, scale, account state). Whether these are obsolete test assertions or genuine regressions needs separate confirmation.

### Previously recorded, unresolved PC 1920px issue
The provided `TEST_RESULTS_V8.8.0.md` and `test-evidence/pc-1920-onboarding-click-diagnostic.json` explicitly describe an unresolved Playwright mouse click timeout on the onboarding **Skip** button at 1920×1080. A scripted DOM `click()` eventually dismissed the overlay. A visual audit passing at 1920px does **not** prove that real pointer interaction works.

## Next validation gates
1. Push the source to this **intake branch**, not `main`.
2. Run regression and Playwright CI in GitHub and inspect failures and artifacts.
3. Verify intended/actual UI behaviors and repair the 1920px real-click failure.
4. Fix or rebaseline legitimate legacy Node test expectations; restore `npm test` to green.
5. Review Cloudflare Git-connected auto-deploy settings before merging into `main`.
6. Only after tests pass: open a reviewed PR and consider deployment through the separate preview-only workflow.

Never treat this audit as a statement that the service is ready for production.

## Supplemental archive inspection

Second supplied archive: `DongjakApp_FULL_v8.8.0_PLAYWRIGHT_E2E_INTEGRATED_20261115(1).zip` (988 files; ~71.5 MB uncompressed).

- **No actual `.env`, `.env.local`, `.env.production.local`, or `.dev.vars` in this ZIP.** This is consistent with its own integration report stating that personal secrets were excluded.
- Includes `package.json`, `package-lock.json`, `playwright.config.mjs`, `wrangler.jsonc`, and `wrangler.seoul-facilities.jsonc`.
- The newer final ZIP has 1,092 files and instead contains `wrangler.toml` plus current GitHub automation workflows and newer final-test evidence.
- The prior `wrangler.jsonc` is **not** copied automatically: mixing it with the final `wrangler.toml` could change or confuse Cloudflare configuration. Determine whether a legacy regression assertion is obsolete before changing production configuration.
- Example environment-variable assignments in README documentation are **not runtime secrets**.
- GitHub Cloudflare integration secrets/variables must be provided to GitHub Actions directly using the proper Secret/Variable settings, not committed to source or shared in chat.
- Preserve the final ZIP as source of truth; older ZIP is reference material only.

## Additional user-supplied Cloudflare and Vite config files (2026-11-15)

Six standalone files were compared against `DongjakApp_v8.8.0_FINAL_INTEGRATED_20261115.zip`, **without importing or deploying anything**.

| Provided file | Finding | Decision |
|---|---|---|
| `.env.example` | Only sample fields/comments and a local transport port; no actual credential assignments | Replaced staging `.env.example` with supplied safe sample |
| `vite.config.js` | Byte-for-byte identical to final ZIP (`SHA256 fabe3dc376ac657d...`) | No overwrite needed |
| `wrangler.toml` | Byte-for-byte identical to final ZIP (`SHA256 8020d64e01f6e48c...`) | Remains canonical candidate pending comparison with live Pages dashboard |
| `wrangler.jsonc` | Alternative Pages configuration for the same project; contains top-level `ai.binding=AI` unlike production-only binding in TOML | Do **not** add alongside root `wrangler.toml` without deliberate migration/selection |
| `wrangler.jsonc.v850-backup` | Byte-for-byte identical to supplied `wrangler.jsonc` | No unique changes to restore |
| `wrangler.seoul-facilities.jsonc` | Separate Workers cron + D1 configuration; `database_id=REPLACE_WITH_D1_DATABASE_ID` | Not deployable as-is; preserve as reference only |

Key follow-ups:
- Vite local development runs on port 5195 and proxies `/api/transport` to `localhost:5178`, matching the supplied environment template.
- Both Pages config variants specify output `dist` and name `dongjak-walk-safety-preview`; actual Cloudflare project settings still need verified.
- `wrangler.toml` defines Workers AI only under `env.production`, while the JSONC variant declares it at the root. Confirm whether the **preview environment** has an AI binding through Cloudflare dashboard before changing the config. No assumption that preview AI inference works.
- Cloudflare recommends verifying local Wrangler files against the live Pages dashboard (or downloading a config for comparison) before using Wrangler as source of truth. Do not overwrite the existing file without a backup.
- These files do **not** provide `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` for GitHub Actions.
- The user's actual `.env`, `.env.local`, `.env.production.local` remain private and are not committed. No secret values are included in this report.
