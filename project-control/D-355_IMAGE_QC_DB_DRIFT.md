# D-355 Image QC DB Drift

Last updated: 2026-07-02.

## Current Status

Resolved in the current runtime database.

`npm run smoke:imageqc:schema -- --confirm-read-only` passed on 2026-07-02:

- all 5 required `products.image_quality_*` columns are present
- `products_image_quality_defect_flags` exists
- required defect relation columns are present: `order`, `parent_id`, `value`, `id`

The read-only check uses PostgreSQL `information_schema` only. It does not run DDL, update Payload, queue jobs, dispatch channels, call Shopier, or push schema changes.

## Historical Blocker

On 2026-06-30 the same read-only smoke found the runtime database behind the repo schema:

```text
Missing products columns:
image_quality_status
image_quality_notes
image_quality_checked_at
image_quality_checked_by
image_quality_source

Missing relation:
products_image_quality_defect_flags
```

`npm run smoke:shopier:read -- --confirm-read-only --limit=5` also stopped before preview then with:

```text
relation "products_image_quality_defect_flags" does not exist
code=42P01
```

## Guarded Repair Helper

The reviewed SQL plan remains in:

```text
scripts/sql/d355-image-qc-schema.sql
```

Current dry-run preview on 2026-07-02:

```text
npm run db:imageqc:apply -- --dry-run --print-sql
SQL bytes: 2484
SQL sha256: c22e5c5a9b701fc8
Result: dry-run only; no database connection opened and no DDL executed.
```

Confirmed apply remains operator-run only:

```powershell
npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema
```

Codex/Claude must not run confirmed apply mode without explicit operator approval.

## Post-Resolution Read-Only Smokes

On 2026-07-02:

- `npm run smoke:imageqc:schema -- --confirm-read-only` -> PASS.
- `npm run smoke:product-flow:read -- --product=359 --confirm-read-only` -> completed. Product `359` is active with all active targets, no channel/coherence drift, Shopier already synced, Image QC review blocking full readiness, and X dispatch failed because credits are depleted. No writes, jobs, dispatches, provider calls, Shopier calls, or schema pushes were performed.
- `npm run smoke:shopier:read -- --confirm-read-only --limit=5` -> completed. Result: 0 new publish candidates, 0 sync errors, 0 retry candidates, and `SHOPIER_PAT configured: no`. No writes, jobs, dispatches, Shopier calls, or schema pushes were performed.

## Remaining Ops Gates

- Live-smoke `/productflow`, `/shopier dashboard`, `/shopier publish-ready`, `/shopier errors`, and `/shopier retry-errors` with the operator present.
- Verify/configure `SHOPIER_PAT` before queueing or retrying Shopier jobs.
- Resolve product `359` generated-image QC review before treating it as fully ready.
- Resolve or intentionally defer X posting while the account reports credits depleted.
