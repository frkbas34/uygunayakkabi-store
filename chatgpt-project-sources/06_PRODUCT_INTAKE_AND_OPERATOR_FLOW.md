# Product Intake And Operator Flow

Last updated: 2026-06-23

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

Direct admin saves to `status='soldout'` now normalize workflow state in the same hook: `workflowStatus='soldout'`, `stockState='sold_out'`, and `sellable=false`. This makes the Payload admin path match Telegram/operator sold-out actions and prevents stale active workflow labels on sold-out products.

Code-level smoke coverage exists in `src/lib/productActivationGuard.test.ts` and `src/lib/publishDesk.test.ts`, and runs through `npm run validate`. It covers helper logic, actual `Products.beforeChange` hook behavior, direct sold-out admin-save normalization, and the Telegram/Publish Desk activation wrapper for readiness failures, Payload guard failures, idempotent active products, and successful activation events.

Read-only runtime activation diagnostics now exist in `scripts/activation-runtime-smoke.ts`, exposed as `npm run smoke:activation:read -- --product=<id> --confirm-read-only`. The script forces `PAYLOAD_DB_PUSH=false`, reads one Payload product through a minimal read-only Payload config, and prints lifecycle, readiness, stock, active targets, activation blockers, and state-coherence issues. It performs no product update, dispatch, Shopier queue write, or schema push. Product `359` passed this check on 2026-06-23.

A guarded reversible mutation smoke also exists in `scripts/activation-mutation-smoke.ts`, exposed as `npm run smoke:activation:mutate`. Existing-product mode uses `--product=<smoke-product-id> --confirm-mutate-and-rollback`. Temp helper mode uses `--create-temp-smoke --confirm-create-mutate-delete`. Admin-direct temp mode adds `--admin-direct-update`. It is operator-run only and not part of `validate`. It refuses normal products, requires a `SMOKE`/`TEST` marker, requires `draft` status, requires website-only targets and no external channel flags, activates through either `approveAndActivateProduct()` or a plain Payload `status='active'` update, then rolls back the product snapshot and deletes smoke bot-events. Temp mode can create a website-only smoke draft from an existing media item, run the activation path, then delete the temp product. Product `359` correctly refused before mutation. On 2026-06-22, helper temp-smoke passed with product `363`, two smoke bot-events cleaned up, no external channel dispatch, and no Shopier queue. Admin-direct temp-smoke passed with product `364`, `workflowStatus=active`, `publishStatus=published`, no external dispatch, and no Shopier queue.

Operator-facing activation surfaces have been aligned with the guard. The Payload admin ReviewPanel now treats zero/missing stock, missing active channel target, and visible title/brand brand-safety hits as blockers. Its success message says Payload still runs the final guard. Telegram `/activate` and `/approvepublish` help text now says both central publish readiness and the Payload activation guard must pass.

Media readiness is shared across activation guard, central publish readiness, and the admin ReviewPanel. Empty placeholder image rows do not count as product visuals, so the panel no longer shows a false green when Payload activation would reject the product for missing real media.

Stock readiness is also shared across central publish readiness and the admin ReviewPanel through `src/lib/productStock.ts`. Populated variant stock takes precedence over product-level stock, unpopulated variant IDs fall back to `stockQuantity`, and `workflow.stockState='sold_out'` or `workflow.sellable=false` blocks the stock check even when quantity is positive. This prevents ReviewPanel from showing a stock false green that activation/readiness would reject.

The ReviewPanel ready/not-ready banner is now driven by central `evaluatePublishReadiness()` plus local field blockers/warnings. A draft with price, image, stock, and channel targets can no longer show as ready if confirmation, content, audit, brand safety, or any other central readiness dimension is still blocking.

Telegram `/pipeline` diagnostics now share the same media and stock definitions too. The visual stage ignores placeholder media rows and the stock stage reports effective stock from populated variants when available, while showing sold-out/not-sellable blockers from the shared stock summary.

The Payload admin ReviewPanel is no longer limited to automation-sourced products. Admin-created/manual products now show the same readiness checklist, lifecycle label, channel target check, brand-safety result, and activation-guard warning. This makes the admin upload path closer to the Telegram/operator path.

The admin source/dispatch metadata group now stays hidden for fresh manual drafts, but appears for active/sold-out manual products and any manual product with real dispatch, Shopier, or story metadata. That keeps first upload cleaner while preserving redispatch, dry-run preview, and publish diagnostics after activation.

Manual/admin saves now normalize product channel selection before activation. `channelTargets` and `channels.publish*` are synced to the same active channel set, so a selected Instagram/Facebook/X/Shopier target does not get silently blocked later by a stale publish flag. Telegram and confirmation-wizard paths already set both shapes; this brings admin saves closer to that shape.

State-coherence diagnostics now detect older channel drift as warnings: retired/unsupported targets, selected targets blocked by false publish flags, or true publish flags missing from `channelTargets`. Future saves normalize the shape; diagnostics make existing drift visible before activation or redispatch.

The `/repair` operator command now has direct code coverage in `src/lib/stateCoherence.test.ts`. The tested contract: preview is dry-run by default, confirmed repair updates only derived workflow fields (`workflowStatus`, `publishStatus`, `sellable`), archived products are skipped, confirmed repairs emit a `state.repaired` bot event, repeated confirmed repair is idempotent, and scan mode is read-only.

Lifecycle wording is canonicalized by `src/lib/productLifecycle.ts`: current Payload fields map to `draft`, `needs_review`, `ready_to_publish`, `active`, and `sold_out`. ReviewPanel shows this derived lifecycle label while keeping top-level `status` as the storefront visibility switch.

The content-generation pipeline re-fetches after audit and requires central `evaluatePublishReadiness()` before showing the operator a "Yayına Al" button. It no longer auto-activates ready products. GeoBot's activation button now uses the same shared `approveAndActivateProduct()` helper as `/activate`, `/approvepublish`, and Publish Desk, so operator approval is recorded and Payload's activation guard remains final.

Automation intake through n8n/API is also draft-first. Even when legacy auto-activate settings, confidence, and readiness all pass, `resolveProductStatus()` returns `draft` with an operator-approval reason. Legacy Telegram photo intake was also changed to create drafts instead of active products.

Central publish readiness is still 6 dimensions, but now stricter: visuals require shared usable media rows, sellable requires valid price plus shared stock-summary approval, publish targets must resolve to active channels only, and brand safety blocks the audit/safety dimension. ReviewPanel and `/pipeline` now use these shared definitions, reducing cases where `/publishready`, ReviewPanel, pipeline diagnostics, or Payload activation disagree.

Telegram caption intake can now parse all active channel targets: Website, Instagram, Shopier, X, and Facebook. `twitter` maps to X, `fb` maps to Facebook, and the legacy `Instagram: evet` shorthand maps to Website + Instagram. Dolap/Threads are ignored by parser tests and cannot become supported channel targets. The legacy photo+caption fallback now uses the same `resolveChannelTargets()` decision layer and sets all active channel flags from the effective target list instead of relying on the removed `postToInstagram` shape.

The Telegram confirmation wizard channel step now offers the same active target set, including X. Its normalizer drops Dolap/Threads and unknown targets from target checks, summaries, and confirmation updates, and the Telegram callback handler rejects invalid `wz_tgt:*` values before saving them to the wizard session. Covered by `npm run test:confirmation-wizard`.

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

- Continue making admin product creation smoother.
- Make Telegram intake and admin intake produce consistent product shape.
- Make product status names clearer.
- Reduce hidden failures in media attach and channel dispatch.
- Smoke test activation through the live Payload admin UI and live Telegram operator path on prepared products when an operator is ready.
