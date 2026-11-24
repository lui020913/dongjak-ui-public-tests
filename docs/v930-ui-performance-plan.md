# v9.3 UI performance — staged implementation

Baseline: Production v9.2.136, public commit 674766692107cba977fe3181e9638493c33c7c8e. Preserve the exact release until a protected candidate passes. No changes to PRI, routing, APIs, authentication, community, data, map layers or layout.

## Stage 1 — compositor tab motion
Replace per-frame inline opacity writes on the real V3 route and tab content, and the outgoing map handoff, with native CSS opacity transitions. Keep the tested fallback for unsupported environments. No root snapshots; dock and opaque backgrounds remain fixed. One boundary style flush, no per-frame JS style writes, bounded cleanup, cancellation and restoration. Existing reduced-motion policy remains active. Verify real intermediate pixels with existing phone release tests, not CSS names alone.

## Stage 2 — prepared independently on stacked candidate
Stationary confirmations without a synchronized scrim/guide and map shortcut toolbar share the same compositor. One MutationObserver replaces per-target toolbar observers. Existing transit close geometry, sheet gestures, synchronized scrims and guide motion remain untouched. Await stage 1 mobile CI before integration and stage 2 focused checks.

## Stage 3 — map presentation coalescing (stacked candidate)
Coalesce the camera pitch event's derived building and district border updates to one pending animation frame, flushing the final pending state at pitchend. Preserve immediate night/zoom/terrain/visibility/tile-load actions, original paint formulas, camera movement and safety layers. Unit tests cover a 20-event burst, final state and cancellation; actual frame speed remains unmeasured.

## Stage 4 — nested menu interruption and performance comparison harness
My Info subpage navigation uses one cancellable native transform animation owner, with its existing direction, duration and fixed header retained. A paired Playwright benchmark (scripts/compare-ui-performance.mjs) alternates exact baseline and candidate URLs, verifies release provenance before and after, measures 900ms rAF windows without per-frame DOM reads or screenshots, reports frame intervals, click dispatch delay, first rAF and supported long tasks. Run after an isolated candidate is available, before Production moves. Lab results are not physical iPhone FPS. Baseline and candidate must have distinct commits.

## Stage 5 — safe detail-sheet compositor and release comparison
Ordinary non-docked overview/detail/entry sheets use the shared opacity/translate compositor. Preserve docked, clip-path, transit and drag geometry paths. The interrupted slide reads its current translate only at interruption. The v9.3.0 protected release adds an independent browser comparison against immutable v9.2.136 Preview, with exact commit provenance and a JSON artifact. No existing gate is removed; comparison completion is required for v9.3.0. The report is observational, not an invented FPS threshold or a physical-device result.

## Stage 6 — benchmark completeness
Nine read-only navigation actions now cover tabs, settings forward/back and ordinary AI entry/exit without sending a question. Fresh identical mobile contexts use the existing iPhone user agent. Report pooled and per-scenario p50/p95, frame-interval percentages, first rAF and click dispatch delay; reject empty measurements and changed provenance. Browser lab comparisons do not guarantee physical-device frame rates.

## Later stages (not implemented yet)
- Profile window, sheet and nested-menu motion separately; migrate safe fade-only surfaces, then gesture/translation owners with geometry and native close contracts preserved.
- Coalesce duplicate observers and map updates only after measuring actual call sites; do not disable safety overlays or live navigation.
- Compare baseline/candidate on physical iOS and Android: frame interval p50/p95, dropped frames, interaction latency, long tasks, memory, visual seams, gesture/keyboard/dismissal invariants. 60fps goal; 120Hz depends on device/browser, not guaranteed.
- Use protected build/Preview/phone/desktop/Production gates before any publication. No claims of measured FPS improvement without measurement.

## Protected Preview correction
Run 45366597308 passed 8/12 mobile shards and desktop/tablet, but four tab motion tests failed because native opacity transitions did not expose intermediate content opacity on the actual production CSS. Restore the exact v9.2.136 bottom-tab-navigation implementation (including its bounded frame progression and cleanup); retain other compositor, map and subpage optimizations. Do not weaken visible-frame tests or claim a measured improvement before the paired audit. Production remains protected.
