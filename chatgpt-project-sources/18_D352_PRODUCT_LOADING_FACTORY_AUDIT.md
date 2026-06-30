# D-352A Product Loading Factory Audit

Last updated: 2026-06-30

## Result

D-352A is a documentation/analysis checkpoint for Phase 10 catalog scale-up. It audits the current product loading flow before scaling to 30-50 products/day.

Full repo note: `project-control/D-352A_PRODUCT_LOADING_FACTORY_AUDIT.md`.

## Current Flow

Telegram/admin upload -> Payload draft -> original media attached -> optional AI 5-image studio pack -> generated images approved into `generativeGallery` -> confirmation wizard -> content/GEO/audit -> readiness check -> operator activation -> dispatch tracking.

Payload remains the source of truth. Active channels remain Website, Instagram, Facebook, X, and Shopier. Dolap/Threads stay retired. SupplierScout stays dormant. n8n stays optional glue only.

## Audit Finding

The system is safe enough for controlled single-product or small-batch loading, but it is not ready for sustained 30-50 products/day.

Main remaining reason: single-product readiness is strong, D-353/D-354 provide read-only catalog/category visibility, D-355 structured Image QC is implemented, D-356A adds a guarded Shopier/Web queue path plus read-only `/shopier dashboard`, first-pass `/shopier errors` triage, `/shopier retry-errors` safe retry preview, and `npm run smoke:shopier:read` read-only runtime smoke support, and D-356B adds a read-only Payload admin Shopier Queue Gate for the current product. Sustained 30-50 products/day still needs D-355 DB schema drift resolved, the Shopier smoke rerun against real Payload state, and retry/error visibility proven in operator use.

## Bottlenecks

- Operator confirmation still collects price, category, size/stock, brand, and channel targets.
- AI image generation now targets a stronger studio pack, and Image QC has structured PASS/REVIEW/FAIL tracking. Operators still need to visually judge generated images before approving PASS.
- Content and audit are useful, but can slow batch listing unless "listable product" and "fully enriched product" are separated.
- Category fill targets now have a read-only strategy report (`/categoryfill [limit]`), but the operator still needs to load/finish products against those targets.
- Batch activation exists, and Shopier batch queueing now has a preview/confirm guard plus read-only dashboard, first-pass error triage, safe retry preview/confirm, and per-product admin gate visibility. Broader batch publishing should still wait for live smoke and any operator-visibility polish found necessary.

## Most Likely Blockers

- missing price
- missing category
- missing usable original or generated media
- missing sellable size/stock
- missing active channel target
- missing stock number
- confirmation/content/audit not complete
- brand-safety block
- image-QC pending or failed

## Next Step

D-353 Bulk Product QA is now implemented read-only via `src/lib/catalogQa.ts`, `src/lib/catalogQa.test.ts`, and the Telegram operator command `/catalogqa [limit]`.

Use it before loading larger batches to see status/source/category distribution, derived lifecycle, missing-field counts, readiness blockers, image-QC pending/rejected, content/audit pending, Shopier queue/error/sync state, brand-safety blocked, draft age, and last updated time.

Next focus is continuing D-356 Shopier/Web Publish Batch Control: apply/verify `scripts/sql/d355-image-qc-schema.sql` for missing `image_quality_*` product columns and relation `products_image_quality_defect_flags`, rerun `npm run smoke:imageqc:schema -- --confirm-read-only`, rerun `npm run smoke:shopier:read -- --confirm-read-only`, live-smoke `/shopier dashboard`, `/shopier publish-ready`, `/shopier errors`, and `/shopier retry-errors`, then decide whether a broader admin batch review surface is needed beyond the per-product Shopier gate. Do not add broad batch mutation/publish or ads until this is operator-safe.
