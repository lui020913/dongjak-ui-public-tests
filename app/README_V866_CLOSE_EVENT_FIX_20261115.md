# Dongjak safety map v8.6.6 — X close-event repair

Source: DongjakApp_FULL_v8.6.5_TWO_PATCHES_INTEGRATED_20261115.zip
Target: v8.6.6

## Changes
- Replaces bubbling `button.click()` replays after an X-button exit animation with non-bubbling button-local dispatch. Original per-button handlers still run once, but the synthetic event cannot propagate to MapLibre or delegated open handlers.
- Suppresses an already-closing button's additional trusted clicks while an exit animation runs.
- Registered-place detail X and back-to-map now dismiss to unobstructed map rather than opening the overview sheet.
- Page X controls return to map without a newly opened overview; point creation cancel and pedestrian tools X no longer restore previous overview automatically.
- Mobile swipe-to-dismiss and home reset use the same local close dispatch.
- Preserves current PC/mobile layouts, floating onboarding, settings and transport UI.

## Validation
- `node --test tests/*.test.mjs`: 1,398 tests, 1,386 passed, 12 failed. All 12 are identical pre-existing v8.6.5 failures (baseline: 1,391 tests, 1,379 passed, 12 failed).
- 18 targeted close/search/motion tests passed.
- Changed JavaScript passed `node --check`.
- Browser rendering/regression and production build: NOT verified. `npm` intentionally skipped.

## Apply
- Extract ZIP outside the existing project.
- Run APPLY_PATCH.cmd, select the original *v8.6.5* full project folder.
- Script checks the exact baseline SHA256 for every modified file, backs up originals to `.patch-backups/v866_YYYYMMDD_HHMMSS`, copies changes, verifies copied file hashes, rolls back on a copy error.
- Do not apply on v8.6.4 or an unrelated branch.

## Verification (without npm)
`node --check src/v806-unified-ui.js`
`node --test tests/v865-close-behavior.test.mjs tests/v814-exclusive-surface-regression.test.mjs`

No environment files or personal account data are included in the patch.
