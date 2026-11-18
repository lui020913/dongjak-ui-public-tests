# DongjakApp v8.8.0 — Final Integrated Source Bundle

## Version and source baseline
- Release label: **v8.8.0 FINAL INTEGRATED**
- Source snapshot: `dongjak-source-review-fixed.zip` supplied in this conversation
- Git branch reported by the user: `fix/v8.8.0-regression`
- Baseline commit reported by the user: `8cc32f0` (`chore: backup v8.8.0 baseline`)
- Package version: `8.8.0`

> This archive is assembled from the uploaded source snapshot. The Git branch and baseline commit above are the user's reported local repository state. This bundle does not claim that the current uncommitted working tree was pushed to GitHub.

## Test evidence captured in this conversation

| Area | Result |
|---|---|
| Desktop critical path — map settings from My Info | 1 passed |
| Desktop critical-path remainder | 4 passed, 1 skipped |
| Mobile sheet expand/collapse — targeted regression | 1 passed after CSS pointer-input fix |
| Mobile critical paths — full project | 6 passed |
| Mobile visual audit — 320px | 1 passed |
| Desktop visual audit — 1920px | 1 passed |
| PC 1920 onboarding skip interaction diagnostic | **Outstanding** — Playwright click timed out although the diagnostic hit-test stack showed the skip button at the center; defer this fix until after GitHub upload, as requested |

## Important interpretation
- The mobile sheet regression was reproduced: the mobile toolbar intercepted pointer events while the sheet was expanded.
- A CSS rule was added to `src/v880-unified-sheet.css` to hide and disable the mobile toolbar while an expanded sheet owns pointer input.
- The targeted regression test passed, and the complete mobile critical-path suite subsequently passed.
- The PC 1920 onboarding click diagnostic remains an open item. The successful 1920px visual audit is not evidence that this interaction issue is resolved.
- The results above are the exact results visible in the conversation; this note does not represent a fresh rerun of every test in this environment.

## Suggested commands
```powershell
npm ci
npm test
npm run build
npx playwright test --config=playwright.config.mjs --project=desktop --workers=1
npx playwright test --config=playwright.config.mjs --project=mobile --workers=1
```

## Deployment note
This archive is a source bundle, not a deployment confirmation. Push the reviewed source to the intended GitHub branch, run the repository's CI workflow, then verify the Cloudflare Pages preview before production deployment.

## Test report
See `TEST_RESULTS_V8.8.0.md` and the `test-evidence/` directory for the captured test status and PC 1920 onboarding diagnostic evidence.
