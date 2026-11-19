# v823 — Online Pretendard Variable for PC and mobile (2026-11-13)

- Base: `DongjakApp_v820_AppleLocalFontMapping_FULL_20261113.zip`.
- Converted `src/local-font.css` from system-installed Apple faces to one shared Pretendard Variable font family, overriding earlier Apple/Nanum UI declarations without modifying size/weight controls.
- Loaded the official Pretendard 1.3.9 **variable dynamic-subset CSS** once via `index.html` (jsDelivr), removed redundant `@import` and unused NanumSquare Neo CDN link.
- Updated splash and reload-screen font stack; dialog popups and MapLibre DOM overlays inherit Pretendard. MapLibre tile glyphs are unaffected.
- No proprietary Apple font binaries are included. Pretendard uses SIL Open Font License 1.1 (per official distribution).
- Requires network access to CDN at least once for the webfont. If blocked, the system sans-serif fallback appears; offline guaranteed rendering requires bundling OFL-licensed Pretendard assets with the site.
- After deployment, hard-refresh the PWA or clear cached app assets to see the new CSS.
- Run `npm test`, `npm run build`, then `npm run deploy:pages` after configuring Cloudflare. This build may be unavailable in an environment without project node_modules.
