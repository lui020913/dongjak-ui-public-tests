# Mobile surface coordinator lifetime consolidation — 2026-11-23

The production-imported `public-ui-mobile-surface-coordinator.js` formerly returned an inert disposer to the second bootstrap caller. If two owners had used the controller, the first caller could tear down shared observers and listeners while the second still expected the surface coordinator to be active.

This refactor retains **one observer/listener owner per app**, using a WeakMap lease and reference-counted cleanup. No DOM rendering, CSS, API, GIS, map layers, theme settings, transport, or routing logic was changed. The single-boot behavior remains unchanged. New tests cover repeated installs, first/last owner cleanup, reinstallation and absent shell. Full CI and 12-phone protected release are required before Production.