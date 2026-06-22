# Product Intake And Operator Flow

Last updated: 2026-06-22

## Target Flow

Telegram/admin upload -> Payload draft -> media attached -> confirmation wizard -> optional AI image/content -> operator approval -> publish.

## Intake Sources

- Payload admin
- Telegram bot
- Automation endpoint

## Product Draft Requirements

At minimum:

- Title
- Price
- Product photo
- Stock or sizes
- Category/product family when possible
- Channel targets
- Source metadata

## Review Requirements

Before publish:

- Price greater than zero
- Image exists
- Stock is valid
- Brand safety passes
- Content does not make risky claims
- Target channels are active and intentional

## Current Activation Guard

As of 2026-06-21, `src/collections/Products.ts` uses `src/lib/productActivationGuard.ts` to block new active creates and new transitions into `status='active'` unless the product has:

- price greater than zero
- at least one product image or approved generated image
- effective stock greater than zero, using variant stock when variants exist
- at least one active target among website, Instagram, Shopier, X, Facebook
- brand-safety scan passing, including the `brand` field

New products now default to `draft`. On successful activation, the hook also normalizes workflow state to `workflowStatus='active'`, `sellable=true`, and non-sold-out stock state so the storefront/homepage do not silently hide the product. The guard does not block edits to products that are already active. It is meant to prevent hidden storefront activation failures while keeping existing live products editable.

Code-level smoke coverage exists in `src/lib/productActivationGuard.test.ts` and `src/lib/publishDesk.test.ts`, and runs through `npm run validate`. It covers helper logic, actual `Products.beforeChange` hook behavior, and the Telegram/Publish Desk activation wrapper for readiness failures, Payload guard failures, idempotent active products, and successful activation events.

Read-only runtime activation diagnostics now exist in `scripts/activation-runtime-smoke.ts`, exposed as `npm run smoke:activation:read -- --product=<id> --confirm-read-only`. The script forces `PAYLOAD_DB_PUSH=false`, reads one Payload product through a minimal read-only Payload config, and prints lifecycle, readiness, stock, active targets, activation blockers, and state-coherence issues. It performs no product update, dispatch, Shopier queue write, or schema push. Product `359` passed this check on 2026-06-22.

A guarded reversible mutation smoke also exists in `scripts/activation-mutation-smoke.ts`, exposed as `npm run smoke:activation:mutate`. Existing-product mode uses `--product=<smoke-product-id> --confirm-mutate-and-rollback`. Temp helper mode uses `--create-temp-smoke --confirm-create-mutate-delete`. Admin-direct temp mode adds `--admin-direct-update`. It is operator-run only and not part of `validate`. It refuses normal products, requires a `SMOKE`/`TEST` marker, requires `draft` status, requires website-only targets and no external channel flags, activates through either `approveAndActivateProduct()` or a plain Payload `status='active'` update, then rolls back the product snapshot and deletes smoke bot-events. Temp mode can create a website-only smoke draft from an existing media item, run the activation path, then delete the temp product. Product `359` correctly refused before mutation. On 2026-06-22, helper temp-smoke passed with product `363`, two smoke bot-events cleaned up, no external channel dispatch, and no Shopier queue. Admin-direct temp-smoke passed with product `364`, `workflowStatus=active`, `publishStatus=published`, no external dispatch, and no Shopier queue.

Operator-facing activation surfaces have been aligned with the guard. The Payload admin ReviewPanel now treats zero/missing stock, missing active channel target, and visible title/brand brand-safety hits as blockers. Its success message says Payload still runs the final guard. Telegram `/activate` and `/approvepublish` help text now says both central publish readiness and the Payload activation guard must pass.

Lifecycle wording is canonicalized by `src/lib/productLifecycle.ts`: current Payload fields map to `draft`, `needs_review`, `ready_to_publish`, `active`, and `sold_out`. ReviewPanel shows this derived lifecycle label while keeping top-level `status` as the storefront visibility switch.

The content-generation pipeline re-fetches after audit and requires central `evaluatePublishReadiness()` before showing the operator a "Yayına Al" button. It no longer auto-activates ready products. GeoBot's activation button now uses the same shared `approveAndActivateProduct()` helper as `/activate`, `/approvepublish`, and Publish Desk, so operator approval is recorded and Payload's activation guard remains final.

Automation intake through n8n/API is also draft-first. Even when legacy auto-activate settings, confidence, and readiness all pass, `resolveProductStatus()` returns `draft` with an operator-approval reason. Legacy Telegram photo intake was also changed to create drafts instead of active products.

Central publish readiness is still 6 dimensions, but now stricter: visuals require usable media rows, sellable requires valid price plus positive stock or variant stock, publish targets must resolve to active channels only, and brand safety blocks the audit/safety dimension. This reduces cases where `/publishready` looks green but Payload activation later rejects the product.

Telegram caption intake can now parse all active channel targets: Website, Instagram, Shopier, X, and Facebook. `twitter` maps to X, `fb` maps to Facebook, and the legacy `Instagram: evet` shorthand maps to Website + Instagram. Dolap/Threads are ignored by parser tests and cannot become supported channel targets. The legacy photo+caption fallback now uses the same `resolveChannelTargets()` decision layer and sets all active channel flags from the effective target list instead of relying on the removed `postToInstagram` shape.

## Operator Controls

Important controls:

- Confirm missing fields
- Generate/approve AI images
- Run GEO/content generation
- Audit readiness
- Activate product
- Redispatch one channel
- Mark sold out or restock

## Main Improvements Needed

- Make admin product creation smoother.
- Make Telegram intake and admin intake produce consistent product shape.
- Make product status names clearer.
- Reduce hidden failures in media attach and channel dispatch.
- Smoke test activation through the live Payload admin UI and live Telegram operator path on prepared products when an operator is ready.
