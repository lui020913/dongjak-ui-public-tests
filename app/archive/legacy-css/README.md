# Retired UI styles (2026-11-21)

These stylesheets were removed from the *active* `app/src/` tree after reviewing the current `app/index.html`, `app/src/main.js`, and the CSS imports across `app/src/` modules (base commit `d1b110af30b894c1912fb2af77843b236585b13f`). They were not loaded by the current app entrypoints. They are **not** part of a Vite bundle or production UI.

The PC/tablet designs and the isolated mobile preview were retained here because the project previously requested preservation of alternate-screen designs. These are archival references, not styles to re-enable without mobile smoke tests.

Files retained from `app/src/`:
- `mobile-first-overhaul.css` (isolated preview candidate)
- `v726-desktop-polish.css`
- `v729-pc-consistency.css`
- `v729-r1-responsive-ui.css`
- `v729-r2-new-ui.css`
- `v815-pc-visual-fixes.css`
- `v853-pc-responsive-fixes.css`
- `v872-pc-onboarding-weather.css`
- `v881-desktop-ui.css`
- `v881-portrait-zoom-responsive.css`
- `v881-tablet-header-unified.css`
- `v881-tablet-workspace.css`
- `v912-desktop-poi.css`
- `v913-pc-design-system.css`

Additionally, `v725-layout-state.css` was removed instead of archived: it was not imported by the current runtime entrypoints and can be recovered via Git history if ever needed.

Do not assume that this pruning resolves live visual conflicts. Actively imported CSS retains its existing rules; layout, animation, and modal ownership must be consolidated separately with browser QA.
