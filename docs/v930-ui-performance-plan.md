# v9.3 UI performance — staged implementation

Baseline: Production v9.2.136, public commit 674766692107cba977fe3181e9638493c33c7c8e. Preserve the exact release until a protected candidate passes. No changes to PRI, routing, APIs, authentication, community, data, map layers or layout.

## Stage 1 — compositor tab motion
Replace per-frame inline opacity writes on the real V3 route and tab content, and the outgoing map handoff, with native CSS opacity transitions. Keep the tested fallback for unsupported environments. No root snapshots; dock and opaque backgrounds remain fixed. One boundary style flush, no per-frame JS style writes, bounded cleanup, cancellation and restoration. Existing reduced-motion policy remains active. Verify real intermediate pixels with existing phone release tests, not CSS names alone.

## Later stages (not implemented yet)
- Profile window, sheet and nested-menu motion separately; migrate safe fade-only surfaces, then gesture/translation owners with geometry and native close contracts preserved.
- Coalesce duplicate observers and map updates only after measuring actual call sites; do not disable safety overlays or live navigation.
- Compare baseline/candidate on physical iOS and Android: frame interval p50/p95, dropped frames, interaction latency, long tasks, memory, visual seams, gesture/keyboard/dismissal invariants. 60fps goal; 120Hz depends on device/browser, not guaranteed.
- Use protected build/Preview/phone/desktop/Production gates before any publication. No claims of measured FPS improvement without measurement.
