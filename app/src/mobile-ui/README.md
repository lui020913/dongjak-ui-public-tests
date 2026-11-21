# Current mobile UI patch

- `current.css` is the **single editable source for new mobile presentation patches** in the public app tree. It contains the consolidated old `v910-request-completion.css` and `v914-mobile-ux-fixes.css` in their previous exact cascade order; the two old files and their `main.js` imports were deleted.
- `index.js` is the common import surface for shared mobile UI lifecycle controllers; their functional implementations remain separate modules and are not duplicated.
- Do not create additional `vNNN-*.css` patch files. Change `current.css` or the relevant owned component and delete the superseded rules in the same change.
- The application still has historical baseline style modules, map-specific CSS, HTML-linked first-paint toolbar CSS, and the protected release's `frontend/production/mobile-next.css` bundle. They are **not** yet merged into this file. Deleting those without migrating dependencies, build injection, and browser tests would risk release regressions.
- Before merging another source: verify cascade order, relative asset URLs, test fixture references, `@layer` precedence, CSS class ownership, and the resulting mobile render in Preview. If multiple owners overlap, remove the obsolete rules rather than merely appending overrides.
