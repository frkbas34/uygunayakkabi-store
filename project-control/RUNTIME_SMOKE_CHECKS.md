# Runtime Smoke Checks

Last updated: 2026-06-30

Runtime smoke checks are operator-run diagnostics. They may connect to the real Payload database, so they are separate from `npm run validate`.

## Activation Read-Only Smoke

Command:

```powershell
npm run smoke:activation:read -- --product=359 --confirm-read-only
```

Env alternative:

```powershell
$env:UYAA_RUNTIME_SMOKE_PRODUCT_ID='359'
$env:UYAA_RUNTIME_SMOKE_CONFIRM='READ_ONLY'
npm run smoke:activation:read
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before importing Payload config.
- Reads one product with `depth=2`.
- Prints derived lifecycle, readiness dimensions, resolved active targets, stock snapshot, activation blockers, and state-coherence issues.
- Exits non-zero if the activation guard would block that product.

What it never does:

- No product updates.
- No status changes.
- No external channel dispatch.
- No Shopier job queue writes.
- No schema push.

Use this before a manual admin/Telegram activation smoke so the product's current Payload shape is known.

Latest verification:

- 2026-06-22: Product `359` read-only smoke exited cleanly. Result: lifecycle `Active`, readiness `6/6`, targets `website, instagram, shopier, x, facebook`, effective stock `10`, no activation blockers, no state-coherence issues. No writes were performed.

## Activation Mutation Smoke

Command:

```powershell
npm run smoke:activation:mutate -- --product=<smoke-product-id> --confirm-mutate-and-rollback
npm run smoke:activation:mutate -- --create-temp-smoke --confirm-create-mutate-delete
npm run smoke:activation:mutate -- --create-temp-smoke --admin-direct-update --confirm-create-mutate-delete
```

Env alternative:

```powershell
$env:UYAA_ACTIVATION_MUTATION_SMOKE_PRODUCT_ID='<smoke-product-id>'
$env:UYAA_ACTIVATION_MUTATION_SMOKE_CONFIRM='MUTATE_AND_ROLLBACK'
npm run smoke:activation:mutate

$env:UYAA_ACTIVATION_MUTATION_SMOKE_CREATE_TEMP='1'
$env:UYAA_ACTIVATION_MUTATION_SMOKE_CONFIRM='CREATE_MUTATE_DELETE'
npm run smoke:activation:mutate
```

What it does:

- Requires explicit mutate-and-rollback confirmation.
- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before building the minimal Payload runtime config.
- Refuses normal products unless title, SKU, or stock number includes `SMOKE` or `TEST`.
- Refuses products unless they are `draft`, publish-ready, activation-guard clean, and website-only.
- Refuses external channel flags, story auto-publish, force redispatch, or preview dispatch.
- Activates through `approveAndActivateProduct()`, verifies the product becomes `active`, then restores the original product state and deletes smoke bot-events captured during the run.
- In temp mode, creates a prepared website-only smoke draft from an existing media item, activates it, restores it, deletes captured smoke bot-events, and deletes the temp smoke product.
- With `--admin-direct-update`, temp mode activates through a plain Payload `status='active'` update, matching a direct admin save rather than the Telegram/Publish Desk helper.

What it is not:

- It is not part of `npm run validate`.
- It is not for real catalog products.
- It is not allowed to dispatch Instagram, Facebook, X, or Shopier.

Latest verification:

- 2026-06-22: Usage mode prints instructions and exits cleanly.
- 2026-06-22: Product `359` without confirmation refused before database connection.
- 2026-06-22: Product `359` with confirmation refused at preflight before mutation because it is a real active product with external targets. No rollback write was attempted.
- 2026-06-22: Telegram/Publish Desk helper temp-smoke mode created product `363`, activated it through `approveAndActivateProduct()`, verified `status=active`, captured and deleted `2` bot-events, restored product state, and deleted the temp product. Channel dispatch evaluated `instagram, shopier, x, facebook` as skipped with no dispatched channels and no Shopier queue.
- 2026-06-22: Admin-direct temp-smoke mode created product `364`, activated it through a plain Payload update, verified `status=active`, `workflowStatus=active`, and `publishStatus=published`, restored product state, and deleted the temp product. It captured `0` bot-events, dispatched no external channels, and queued no Shopier job.

## Shopier Read-Only Smoke

Command:

```powershell
npm run smoke:shopier:read -- --confirm-read-only
npm run smoke:shopier:read -- --product=<id> --confirm-read-only
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before building the minimal Payload runtime config.
- Mirrors `/shopier dashboard`, `/shopier publish-ready`, `/shopier errors`, and `/shopier retry-errors` against real Payload state.
- With `--product=<id>`, evaluates one product against the shared Shopier/Web queue gate.

What it never does:

- No product updates.
- No Shopier API calls.
- No external channel dispatch.
- No `shopier-sync` job queue writes.
- No schema push.

Latest verification:

- 2026-06-30: Usage mode refused without `--confirm-read-only` before database connection.
- 2026-06-30: Confirmed read-only run loaded env files, forced `PAYLOAD_DB_PUSH=false`, and stopped before preview because DB schema is behind repo schema. Evidence: missing relation `products_image_quality_defect_flags` (`code=42P01`). No writes, jobs, dispatches, Shopier calls, or schema pushes were performed. The smoke now includes the read-only `/shopier dashboard` preview before detailed publish/error/retry sections once schema drift is repaired.

## Image QC Schema Check

Command:

```powershell
npm run smoke:imageqc:schema -- --confirm-read-only
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Connects directly to PostgreSQL.
- Reads only `information_schema.columns`.
- Checks D-355 Image QC product columns and the `products_image_quality_defect_flags` relation.

What it never does:

- No DDL.
- No Payload updates.
- No external channel dispatch.
- No Shopier API calls.
- No job queue writes.

Latest verification:

- 2026-06-30: Usage mode refused without `--confirm-read-only` before database connection.
- 2026-06-30: Confirmed read-only run found missing product columns `image_quality_status`, `image_quality_notes`, `image_quality_checked_at`, `image_quality_checked_by`, `image_quality_source`, plus missing relation `products_image_quality_defect_flags` with expected columns `order`, `parent_id`, `value`, `id`. Repair plan file: `scripts/sql/d355-image-qc-schema.sql`.

## Image QC Schema Apply Helper

Command:

```powershell
npm run db:imageqc:apply
npm run db:imageqc:apply -- --dry-run --print-sql
npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema
```

What it does:

- Reads the reviewed SQL plan at `scripts/sql/d355-image-qc-schema.sql`.
- Defaults to dry-run only and does not connect to PostgreSQL.
- Prints the SQL file path, byte count, short SHA-256 fingerprint, and planned schema changes.
- With `--print-sql`, prints the reviewed SQL plan for operator review.
- With explicit apply confirmation, loads env files, connects directly to PostgreSQL, runs the reviewed DDL, then verifies the D-355 columns/relation through `information_schema`.

What it must not do without explicit operator approval:

- No confirmed apply mode.
- No production DDL.
- No database mutation.

Latest verification:

- 2026-06-30: Added as a guarded helper. Codex should test only dry-run/refusal paths unless the operator explicitly approves the confirmed apply command.

## Next Manual Runtime Smoke

After the read-only smoke and both temp mutation smoke paths pass:

1. Try activation from Payload admin UI on a prepared non-smoke product when an operator is ready.
2. Try activation through the Telegram operator path when an operator is ready.
3. Apply/verify the D-355 Image QC DB migration/DDL with `npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema`, then rerun the Image QC schema check.
4. Rerun the Shopier read-only smoke.
5. Live-smoke `/shopier dashboard`, `/shopier publish-ready`, `/shopier errors`, and `/shopier retry-errors` with an operator present.
6. Confirm the product becomes active only when Payload's activation guard passes.
7. Confirm dispatch notes show Website as native and only Instagram, Facebook, X, or Shopier as external results.
8. Record failures in `chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md`.
