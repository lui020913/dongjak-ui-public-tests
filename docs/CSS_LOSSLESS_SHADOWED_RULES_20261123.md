# Lossless active CSS duplicate removal — 2026-11-23

Removed only five earlier rules where an identical selector, identical declarations and matching media condition occurred later in **the same stylesheet**. Every normalized source leaf declaration still exists; no data, navigation state, map geometry or stylesheet import has changed.

- app/src/v857-requested-ux.css :: @media(max-width:699px) :: html body #app#app#app #map .dj-place-detail-popup .dj-place-header-actions button:is(.dj854-place-favorite,.dj856-place-share,.dj-place-header-close)
- app/src/v857-requested-ux.css :: @media(max-width:699px) :: html body #app#app#app #map .dj-place-detail-popup .dj-place-header-actions
- app/src/v857-requested-ux.css :: @media(max-width:699px) :: html body #app#app#app #transport-sheet #transport-neighbors :is(.metro-neighbor-row,.metro-rail-previous,.metro-rail-current,.metro-rail-next)
- app/src/v800-ui-architecture.css :: @media(max-width:699px) :: html body #app#app .topbar #dj-settings-mobile img
- app/src/v854-integrated-ui.css :: @media (min-width:1080px) :: html body #app#app #bottom-nav>.nav-tab[data-tab="map"]

Do not blindly merge similarly named selectors with different media conditions or order. GitHub CI builds the app and runs device-specific mobile viewport tests. Production must use the isolated Preview → 12 phone shards → desktop/tablet → protected deployment gate.
