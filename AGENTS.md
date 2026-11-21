# Repository patch replacement rule

This repository's current, approved UI/UX specification is the source of truth. A newer patch that fully supersedes an older patch **must remove the superseded implementation in the same change**, not stack additional CSS or JavaScript overrides above it.

## Required before merging any replacement patch

1. Identify the exact superseded scope: CSS selectors, import sites, JS initializers/listeners, component implementations, state handlers, build-time injection scripts, feature flags, release workflows and tests. An older filename or version number alone is **not** proof that all of its functionality is obsolete.
2. Map each old behavior to its replacement. Keep any old functionality that the replacement does not cover; extract shared code into one maintained implementation if necessary.
3. Delete the now-redundant code, files and imports as part of the new PR. Do not leave the old implementation mounted behind later `!important` rules, giant repeated ID selectors, shadow UI controllers, or duplicate handlers.
4. Update or remove obsolete regression tests and snapshots to assert the **current approved design**, not preserve outdated UI. Do not modify a test merely to make an unintended visual regression pass.
5. Remove outdated build/release patch injection, selectors and switches that could reapply superseded styles. Historical release notes may remain as documentation, but must not execute or be loaded at runtime.
6. Run existing CI plus targeted phone UI checks for tab transitions, sheet collapse/expand, transport arrival visibility, line badges, start/end/favorite actions, light/dark theme, and mobile toolbar. Confirm behavior in Preview before protected Production.
7. In the PR body include `Replaces:`, `Removed:`, `Preserved:`, `Tests:`, and `Preview:`. Explicitly mark remaining partially migrated legacy functionality.

## Current design guardrails

- Mobile first; one canonical owner for tab transition state and one for each bottom sheet. No map flash, double animation, hidden arrival rows, or competing screen-state controllers.
- Liquid Glass treatment on UI elements must follow the most recent user-approved design. Do not revert to older flat-button styling or retain styling tests that enforce superseded designs.
- Subway line badges must not gain extra borders/rings without an explicit design requirement; start/end and favorite actions must keep their approved iconography and size.
- Station data, real-time subway quota/fallback, and rail map geometry are functional layers. Do not remove their logic when only a visual patch is superseded.
- Do not blanket-delete versioned modules; delete **only proven replaced code** after dependency and runtime checks.

For detailed migration requirements, see `docs/PATCH_REPLACEMENT_POLICY.md`.
