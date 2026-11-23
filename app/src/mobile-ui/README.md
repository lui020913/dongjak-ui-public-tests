# Current mobile UI patch

- `current.css` is the **single editable source for new mobile presentation patches** in the public app tree. It contains the consolidated old `v910-request-completion.css` and `v914-mobile-ux-fixes.css` in their previous exact cascade order; the two old files and their `main.js` imports were deleted.
- `index.js` is the common import surface for shared mobile UI lifecycle controllers; their functional implementations remain separate modules and are not duplicated.
- Do not create additional `vNNN-*.css` patch files. Change `current.css` or the relevant owned component and delete the superseded rules in the same change.
- The application still has historical baseline style modules, map-specific CSS, HTML-linked first-paint toolbar CSS, and the protected release's `frontend/production/mobile-next.css` bundle. They are **not** yet merged into this file. Deleting those without migrating dependencies, build injection, and browser tests would risk release regressions.
- Before merging another source: verify cascade order, relative asset URLs, test fixture references, `@layer` precedence, CSS class ownership, and the resulting mobile render in Preview. If multiple owners overlap, remove the obsolete rules rather than merely appending overrides.

## Consolidated historical baseline

The former 26 adjacent `v700`–`v728` mobile CSS imports now live **verbatim in original cascade order** in `app/src/mobile-ui-baseline.css` (same directory as the originals, preserving asset URL resolution). The original 26 files and runtime imports were deleted together. This is a fixed **historical baseline, not a new patch destination**. All newly approved UI changes are applied by editing `app/src/mobile-ui/current.css` or their owned component source, removing superseded rules in the same PR. Avoid future versioned CSS imports.

## Lossless phone primary-page CSS consolidation (2026-11-23)

`mobile-primary-fullscreen.css` was loaded immediately after `mobile-first-layout.css` with no intermediate imports. Its entire contents were appended verbatim to `mobile-first-layout.css` with section markers and the old JS import and standalone stylesheet were removed. Both files shared the same source-directory base, and the retired file contained no `@import`, `@charset`, or relative URLs. Historical per-screen rules and their `@layer` order remain unchanged. Regression checks guard the consolidation and exact phone viewport layout. Do not reintroduce the retired import.
