# Dongjak native renderer laboratory (isolated)
Base: deployed v9.2.297 (097339fcab924b6e9406bf38d581dabe59142549). This is a separate Android application, not a replacement for the production safety map. No production release, signing credentials, OAuth, user data or backend writes.

## First experiment
- Native Android SDK pinned to MapLibre 13.4.0 (Maven Central); WebGL comparator uses the existing app's exact npm lock and MapLibre GL JS 6.16.0.
- Identical OpenFreeMap Bright style URL used by production; same map area, camera itinerary, animation duration, 350 ms pauses and same full-screen map region on one phone. Toggle engines; only one renderer is alive at a time.
- Native and web measure intervals between renderer callbacks during animation only. Report sample count, p50, p95, >33.33 ms fraction and mean callback FPS. This is not Android presentation/SurfaceFlinger FPS; confirm with Perfetto or device frame timeline before decisions.
- Use a physical device, equal display refresh rate, battery/thermal conditions and network. Warm both caches first, then alternate Native/WebGL order; repeat at least five times. Also test cold load separately. Device density / native pixel ratio and camera zoom semantics must be checked for equivalence. Don't treat base-map result as a full-app benchmark.
- SDK versions deliberately pinned, not a claim of latest. Existing production features (custom GIS buildings, district mask, transit, PRI, sheets, GPS, search, route, accounts) are NOT migrated in this initial lab. Native data pipeline needs a versioned common vector tile manifest with exact geometry, label and license checks. iOS PWA cannot directly use native SDK; a separate iOS native build and UI integration are later steps.
- Install debug APK beside production (different application ID kr.dongjak.nativemaplab), switch between Native/WebGL, wait for tiles, press identical route measurement. Test manual pan, pinch and tilt too.

## Migration gate
No main merge or production release from this branch. First verify build and actual-device metrics. Then common tiles with geometry and style parity, then platform adapter/lifecycle and UI parity; preserve Web/PWA path. No LOD/DPR downgrade as a substitute for improvement. No claim of physical FPS before measurement.
