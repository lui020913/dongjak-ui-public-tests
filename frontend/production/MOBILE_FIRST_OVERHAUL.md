# Mobile-first overhaul — v8.26.1 Preview candidate

## Decision

The smartphone UI is the default product composition. Tablet and desktop preserve the same visual language and component treatment while retaining layouts appropriate to their wider workspaces.

## Source and deployment boundary

- Public source repository: `lui020913/dongjak-ui-public-tests`
- Public work branch: `public/mobile-first-overhaul-20261119`
- Private application source is read-only at the exact pinned commit in `release/mobile-first-overhaul-source.json`.
- Target application version: `8.26.1`
- The new CSS is injected into a temporary CI checkout after `v914-mobile-ux-fixes.css`; no private repository commit is created.
- The result is deployed only to the isolated Cloudflare Preview branch `mobile-first-overhaul-20261119`.
- Production is never promoted by this workflow.

## Design rules

1. Map-first: search and map tools remain visible without covering the map.
2. One visual system: shared palette, typography, spacing, radius, card and button treatment.
3. Phone-first: compact search, horizontally scrollable map tools with edge fade, right-side map controls and a five-item bottom dock.
4. Consistent sheets: route, community, news, account, transit and facility surfaces share header, close control, content spacing and scroll behavior.
5. Safe-area aware: top and bottom offsets use the device safe-area insets.
6. Touch-first: primary controls use at least 44 CSS px hit areas.
7. Theme parity: light and dark use the same semantic tokens.
8. Motion restraint: no new sheet gesture controller is introduced; existing app state and drag behavior remain authoritative.
9. Reduced motion: transitions are shortened when the user requests reduced motion.

## Validation

The Preview workflow verifies the exact private source SHA and app version, runs the private Node test suite, builds the app, seals the private build artifact, deploys an isolated Preview, verifies transport API health and unchanged Production deployment identity, then dispatches the full nine-viewport anonymous UI gate.

Chromium screenshots and remote browser checks are evidence for the Preview only. Actual iOS Safari/PWA behavior still requires a physical-device check.
