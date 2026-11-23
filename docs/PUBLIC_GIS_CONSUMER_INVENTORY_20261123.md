# Public GIS source inventory — 2026-11-23

This is a read-only audit, **not a deletion permit**. The public data directory contains operational GIS and research snapshots. Run `node scripts/audit-static-data-usage.mjs` to list named source references, dynamic folder review cases, and review-only unreferenced basenames. A public URL may have external users despite not appearing in bundled source. Do not remove data unless a separate verification confirms every dynamic loader, public link and research use, and preserves full provenance.

CI runs a data integrity test and outputs conservative inventory. No runtime map code, API, GIS data, database, release request or Production changes are made.
