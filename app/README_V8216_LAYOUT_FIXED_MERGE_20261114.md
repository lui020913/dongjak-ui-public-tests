Dongjak v8.2.16 LAYOUT_FIXED branch merge (2026-11-14)
============================================================
Base: DongjakApp_v8.2.15_LAYOUT_FIXED_FULL(1).zip
Feature patch: Dongjak_v8.2.16_Metro_Search_Toolbar_Night_DeltaPatch_20261114.zip

MERGE STRATEGY
- Preserve the uploaded LAYOUT_FIXED branch, including half-height sheet/grabber/header X layouts and existing route/community/news/my-info panels.
- Apply 24 direct changes with baseline SHA-256 matching; merge index.html using three-way non-overlapping changes.
- Preserve all other uploaded project files byte-for-byte.
- App/version metadata becomes v8.2.16.

FEATURES
- User-supplied metro icons for lines 1,2,4,7,9 and Sillim
- Search updates and keyboard focus release on submit
- Map layer toggles in More only; suppress top display label
- Night-view confirmation before theme switch
- Circular location/map help buttons, road width action on top toolbar
- One/two-row and reorderable toolbar, theme help color and label width adjustments

VERIFICATION
- npm test: 1215/1215 passed after branch merge
- npm run check:release: passed at v8.2.16
- Full ZIP and delta ZIP hashes checked
- npm ci --offline failed: npm cache missing yauzl-2.10.0.tgz; production Vite build not verified
- Real iOS keyboard accessory bar cannot reliably be suppressed in Safari; search submit attempts keyboard dismissal.

INSTALLATION
Full ZIP: extract to a new project folder, npm ci, npm test, npm run build and then deploy.
Delta ZIP: extract and run APPLY_PATCH.cmd, selecting this exact LAYOUT_FIXED v8.2.15 source folder.
Rollback with RESTORE_PATCH.cmd.
Do not apply the original HOME_HALF_SHEETS v8.2.16 delta on top of this result.
