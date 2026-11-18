# v822 — Installed Apple SD Gothic Neo face mapping (2026-11-13)

## Reason
Passing `v816` means no proprietary TTF is bundled. It does NOT mean the end-user's PC displays Apple SD Gothic Neo. Previously the CSS used `Apple SD Gothic Neo` but the uploaded font binaries contain internal family names such as `AppleSDGothicNeoR00`, `AppleSDGothicNeoM00`, and `AppleSDGothicNeoB00`. On Windows the CSS name may not resolve the installed faces.

## Changes
- Register 9 local-only `@font-face` declarations for font weights 100 through 900, named `Dongjak Apple Local`, each using `src: local("AppleSDGothicNeo...00")`. No font files are copied, fetched, linked, or published.
- Apply this family to all HTML UI elements under `#app`, using `Apple SD Gothic Neo` for macOS/iOS and the site's existing Pretendard webfont as fallback.
- Preserve MapLibre canvas glyphs, the `v816` constraint, and previous UI behavior.

## Important
**To display the actual font on Windows, the face must be legally installed on the PC.** Dragging fonts into `public/fonts` is not the same as installing them in Windows. After installation, fully restart Chrome or Edge. In DevTools (F12 → Elements → Computed → Rendered Fonts), verify that `AppleSDGothicNeoR00` or an appropriate weight is rendering. The new patch itself cannot install restricted fonts and cannot make the site deliver them to other users.

## Test
```powershell
node --test tests/v816-pc-night-weather-font.test.mjs
node --test tests/v822-apple-local-face-mapping.test.mjs
```
`npm run build` and the full suite may still report unrelated existing failures and should be assessed independently.

## Files changed
- `src/local-font.css`
- `tests/v822-apple-local-face-mapping.test.mjs` (new)
- `README_V822_LOCAL_APPLE_FACE_20261113.md` (new)
