# BUGS & FIXES — Uygunayakkabi

_Created 2026-06-14. Newest at top. No secrets/PII._

## 2026-07-25 - Concurrent Shopier duplicate deliveries have database protection (VERIFIED IN CONFIGURED DATABASE)
- **Fix:** after approved preflight and dry-run review, applied the D-481 concurrent partial unique index for non-empty Shopier IDs.
- **Evidence:** `orders_shopier_order_id_unique_idx` is present, duplicate non-empty IDs are zero, the post-apply read-only check passes, and `npm run test:shopier-webhook-local` passes locally.
- **Remaining:** obtain separately approved live Shopier webhook delivery evidence; no application deployment was performed.

## 2026-07-25 - Concurrent Shopier orders could lose local stock depletion (FIXED LOCALLY, NOT DEPLOYED)
- **Problem:** D-482 grouped each Shopier order and its stock writes transactionally, but distinct concurrent orders could still read the same stock and write conflicting clamped totals.
- **Fix (local):** use transaction-bound PostgreSQL floor-at-zero arithmetic for product and matched-variant decrements. Paid external orders and InventoryLogs remain recorded at zero local stock.
- **Coverage:** `test:shopier-webhook-local`, full `npm run validate`, `npm run build`, and `git diff --check` pass locally.
- **Remaining:** D-481's separate Shopier unique-index approval is unchanged.

## 2026-07-25 - Concurrent standard orders could both take the final unit (FIXED LOCALLY, NOT DEPLOYED)
- **Problem:** D-483 grouped the Order and stock write in one transaction but still read stock before issuing a literal write, so concurrent requests could both observe the final unit.
- **Fix (local):** reserve product total, then selected variant, through conditional PostgreSQL updates requiring `stock >= quantity` in the active parent Payload transaction. A zero-row reservation throws before InventoryLog creation and rolls the order back.
- **Coverage:** `test:order-stock-transaction`, full `npm run validate`, `npm run build`, and `git diff --check` pass locally.
- **Remaining:** D-481's separate Shopier unique-index approval is unchanged.

## 2026-07-25 - Standard orders could persist while stock mutation failed (FIXED LOCALLY, NOT DEPLOYED)
- **Problem:** the non-Shopier Orders `afterChange` hook swallowed stock-write errors, ran the generic alert first, and could leave website/manual/phone/Instagram orders without matching inventory movement.
- **Fix (local):** run stock mutation first with the parent Payload request, require a resolvable product and SKU when variants exist, reject insufficient stock, and let thrown core failures roll back the parent create transaction. Lifecycle reaction work remains advisory.
- **Coverage:** `test:order-stock-transaction`, `typecheck`, and lint pass without database or external calls.
- **Remaining:** run full validation/build before review; D-481's separate Shopier unique-index approval is unchanged.

## 2026-07-24 - Shopier order persistence could succeed without matching stock mutation (FIXED LOCALLY, NOT DEPLOYED)
- **Problem:** after creating an Order, the Shopier handler decremented stock and wrote InventoryLog records independently. A later failure could leave an order without its stock reconciliation, and the handler previously acknowledged the event.
- **Fix (local):** use a fail-closed Payload adapter transaction for the Order create plus all Shopier stock/inventory operations. Verified processing failures now return `500` for retry. The direct alert occurs after commit and the generic Orders hook skips Shopier to avoid pre-commit/duplicate notification.
- **Coverage:** `test:payload-transaction`, `test:shopier-order-transaction`, `test:shopier-order-stock`, `test:shopier-order-id-unique`, and `test:shopier-webhook-local` pass without a database connection or external call.
- **Remaining:** D-481's partial unique index is applied and post-apply verified; the outstanding evidence is an operator-approved live webhook smoke, not further DDL.

## 2026-07-24 - Concurrent Shopier order retries could both pass the lookup (IMPROVED LOCALLY, INDEX NOT APPLIED)
- **Problem:** the inbound Shopier handler performed `find` followed by `create`, so concurrent `order.created` deliveries could both see no prior order and each proceed to stock decrement.
- **Fix (local):** declare `shopierOrderId` unique, catch only a duplicate-key error from `payload.create`, and return before stock work. Added a dry-run-first partial unique-index plan plus a read-only column/index/duplicate preflight.
- **Coverage:** `test:shopier-order-id-unique`, runtime-smoke governance, `npm run validate`, and `npm run build` pass. The dry run did not open a database connection.
- **Remaining:** the backing PostgreSQL index is un-applied; no configured-database preflight, DDL, live Shopier webhook/API call, or Payload write was performed.

## 2026-07-24 - Session-start memory could revive retired control architecture (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** both Memory Lock handoffs still called OpenClaw/n8n the live default pipeline, conflicting with the active Hermes/Payload-first architecture and risking future agent drift.
- **Fix (local):** reconciled both files and added assertions for Payload/Next execution, Hermes-current control, optional OpenClaw/n8n, SupplierScout dormancy, and absence of the old pipeline/current-agent/current-workflow claims.
- **Coverage:** `test:retired-channels`, `test:n8n-optional`, and `test:mentix-skills`.
- **Validation:** source/release/PR/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-24 - Product flow separated channel failures from their recovery route (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/productflow` showed per-channel state/reason and a separate general action list, forcing an operator to infer which command addressed which channel failure.
- **Fix (local):** added deterministic `nextAction` recovery guidance directly to every non-published active-channel dispatch row; Shopier routes remain guarded and failed external channels still require the recorded cause to be fixed before redispatch.
- **Guardrails:** read-only product-flow diagnostics only. No product/lead/order write, stock change, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, optional OpenClaw sync, or ad spend.
- **Coverage:** `test:product-flow-snapshot` checks mixed active-channel recovery paths and formatter output; `test:runtime-smokes` checks the runtime smoke surface.
- **Validation:** source/release/PR/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-18 - Product flow lacked dispatch health counts (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/productflow` listed dispatch rows, but operators could not quickly see active-channel publishing health across published, queued, failed, blocked, not-configured, and unrecorded states.
- **Fix (local):** added `channels.dispatchSummary` to Product Flow Snapshot, surfaced it in `/productflow`, and printed it in `smoke:product-flow:read`.
- **Guardrails:** read-only product-flow diagnostics only. No product/lead/order write, stock change, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, optional OpenClaw sync, or ad spend.
- **Coverage:** `test:product-flow-snapshot` checks mixed active-channel dispatch counts and formatter output; `test:runtime-smokes` checks the runtime smoke surface.
- **Validation:** `npm run test:product-flow-snapshot`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-18 - Product flow lacked checklist progress counts (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/productflow` showed the primary step and full checklist, but operators could not quickly see how many steps were done, next, blocked, or still needing work.
- **Fix (local):** added `checklistSummary` to Product Flow Snapshot, surfaced it in `/productflow`, and printed it in `smoke:product-flow:read`.
- **Guardrails:** read-only product-flow diagnostics only. No product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:product-flow-snapshot` checks ready/incomplete summary counts and formatter output; `test:runtime-smokes` checks the runtime smoke surface.
- **Validation:** `npm run test:product-flow-snapshot`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-18 - Loading plan focus queue lacked reason details (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** D-456 showed the top focus products and safe read commands, but the operator still had to cross-reference product rows to see why each item matched the focus.
- **Fix (local):** added focus detail rows with each product ref, safe command, and reason list to `batchSummary.focus`, surfaced them in `/loadplan`, and printed them in `smoke:load-plan:read`.
- **Guardrails:** read-only catalog planning only. No product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:loading-plan` checks focus detail formatting; `test:runtime-smokes` checks the runtime smoke surface.
- **Validation:** `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-18 - Loading plan focus lacked matching product queue (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** D-455 showed the dominant loading bottleneck, but operators still had to map that focus back to matching worklist rows manually.
- **Fix (local):** added focus refs and focus queue commands to `batchSummary.focus`, surfaced them in `/loadplan`, and printed them in `smoke:load-plan:read`.
- **Guardrails:** read-only catalog planning only. No product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:loading-plan` checks focus refs/queue commands; `test:runtime-smokes` checks the runtime smoke surface.
- **Validation:** `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-18 - Loading plan lacked a batch-level focus hint (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** D-454 gave batch counts and first commands, but operators still had to infer whether the day should start with brand safety, Image QC, Shopier errors, core fields, stale drafts, backlog, or live smoke.
- **Fix (local):** added `batchSummary.focus` to `buildProductLoadingPlan()`, surfaced focus kind/label/reason/next safe read in `/loadplan`, and printed the same focus fields in `smoke:load-plan:read`.
- **Guardrails:** read-only catalog planning only. No product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:loading-plan` checks focus selection and formatter output; `test:runtime-smokes` checks the runtime smoke surface.
- **Validation:** `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-18 - Loading plan lacked a batch-level first-command summary (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/loadplan` already listed actions and worklist rows, but operators still had to infer the batch health and first safe command from several sections.
- **Fix (local):** added `batchSummary` to `buildProductLoadingPlan()`, surfaced candidate/priority/blocker counts plus first command, first `/productflow`, and first repo-side product-flow smoke command in formatter output, and printed the same fields in `smoke:load-plan:read`.
- **Guardrails:** read-only catalog planning only. No product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:loading-plan` checks the batch summary, first-command handoff, formatter output, and no-mutation guardrail wording.
- **Validation:** `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - Source pack allowed stale latest-boundary wording (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** after D-452, next-sprint source-pack notes could still describe older current-boundary wording, which risks ChatGPT Project ingesting stale handoff truth.
- **Fix (local):** updated `test:source-pack` to require `Latest local boundary: D-453.`, preserve the actual `/smokeplan` title boundary as `Operator Live Smoke Plan (D-389/D-452)`, require the D-380-D-406 plus D-422-D-453 release/PR stack wording, and reject stale current-D-449 or D-422-D-451 stack wording.
- **Guardrails:** source-pack/docs governance only. No runtime behavior change, product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:source-pack` now includes the latest-boundary positive and negative assertions.
- **Validation:** `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - Ad-readiness did not surface the PDP trust preflight directly (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** D-451 pinned PDP conversion/trust essentials, but `/adready` review/ready output still jumped straight to `/adpack` and `/adreport` without reminding the operator to run the storefront trust preflight first.
- **Fix (local):** added `npm run test:storefront-trust` to `/adready` `Next safe reads` for review/ready products, and bumped `/smokeplan` title to `Operator Live Smoke Plan (D-389/D-452)`.
- **Guardrails:** read-only operator guidance only. No product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:ad-readiness` checks the storefront trust hint appears for ready/review products and stays absent for blocked products; `test:operator-smoke-plan` checks the D-452 title.
- **Validation:** `npm run test:ad-readiness`, `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - Storefront trust checks missed PDP conversion essentials (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `test:storefront-trust` checked homepage trust/fake-review guardrails, but did not catch accidental removal of buyer-critical PDP conversion pieces before ad readiness.
- **Fix (local):** extended `scripts/storefront-trust-governance.ts` to check the public product detail page for draft hiding, gallery mount, variant-backed size/stock clarity, lead form context, WhatsApp CTA, Shopier CTA, FAQ fallback, and safe similar-products gating.
- **Guardrails:** local file-content validation only. No build, DB read, network call, product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:storefront-trust` now has 11 checks covering homepage trust plus PDP conversion essentials.
- **Validation:** `npm run test:storefront-trust`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - Retired-channel governance missed Memory Lock handoff files (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `test:retired-channels` did not check `project-control/MEMORY_LOCK.md` or `project-control/exports/MEMORY_LOCK.md`, even though new sessions read those files first.
- **Fix (local):** extended `scripts/retired-channel-governance.ts` so both Memory Lock files must preserve active-channel truth and describe Dolap/Threads only as retired.
- **Guardrails:** no runtime behavior change. No product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:retired-channels` now covers Memory Lock handoff files.
- **Validation:** `npm run test:retired-channels`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - Smoke-plan title lagged behind latest local boundary (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/smokeplan` still rendered `Operator Live Smoke Plan (D-389/D-437)` even after D-448 added ad-readiness next-action guidance.
- **Fix (local):** updated `src/lib/operatorSmokePlan.ts` and `src/lib/operatorSmokePlan.test.ts` so the formatter shows `Operator Live Smoke Plan (D-389/D-449)`.
- **Guardrails:** title-only operator visibility update. No smoke-order change, product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:operator-smoke-plan` checks the current D-449 title.
- **Validation:** `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - Ad-readiness lacked explicit safe next reads (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/adready` showed ad readiness blockers/warnings, but operators still had to infer the safest next read-only follow-up command.
- **Fix (local):** added a `Next safe reads` block to `src/lib/adReadiness.ts` for `/productflow`, `/imageplan`, `/adpack`, and `/adreport week` based on readiness state.
- **Guardrails:** hints remain read-only/operator-controlled. No product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:ad-readiness` checks safe next-read hints and absence of unsafe action commands.
- **Validation:** `npm run test:ad-readiness`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - Funnel snapshot lacked explicit safe next reads (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/funnel` surfaced lead-source, direct-order, converted-order, and UTM attribution signals, but the operator still had to infer the safest read-only follow-up command.
- **Fix (local):** added a `Next safe reads` block to `src/lib/funnelDesk.ts` for `/leadplan`, `/orders`, and `/adreport week`.
- **Guardrails:** hints remain read-only. No lead/order/product write, stock change, queue job, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:funnel-desk` checks safe next-read hints and absence of unsafe action commands.
- **Validation:** `npm run test:funnel-desk`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - Business snapshot urgency lacked explicit safe next reads (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/business` surfaced stale leads, stale shipped orders, sold-out products, and low-stock products as counts, but the operator still had to infer the safest read-only follow-up command.
- **Fix (local):** added a `Next safe reads` block to `src/lib/businessDesk.ts` for `/leadplan`, `/orderreminders`, `/orders`, and `/inbox stock`.
- **Guardrails:** hints remain read-only. No lead/order/product write, stock change, queue job, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:business-desk` checks safe next-read hints and absence of unsafe action commands.
- **Validation:** `npm run test:business-desk`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - Order desk rows lacked direct operator links (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/inbox orders`, `/orders`, `/orders today`, `/orderreminders`, `/order <id>`, and new-order alerts gave operators order/product/lead context but did not provide direct Payload admin/PDP handoffs.
- **Fix (local):** added shared order-admin/product-admin/lead-admin/PDP link rendering to `src/lib/orderDesk.ts`.
- **Guardrails:** order desk link rendering remains read-only. No order status write, stock restore, customer message, queue job, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:order-desk` checks public product links, draft admin-only links, list/card/alert formatter output, and absence of unsafe action commands.
- **Validation:** `npm run test:order-desk`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - Lead desk rows lacked direct operator links (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/inbox leads`, `/leadreminders`, `/leads`, `/lead <id>`, and new-lead alerts gave operators lead/product context but did not provide direct Payload admin/PDP handoffs.
- **Fix (local):** added shared lead-admin/product-admin/PDP link rendering to `src/lib/leadDesk.ts` and reused it from `src/lib/leadFollowupPlan.ts`.
- **Guardrails:** lead desk link rendering remains read-only. No lead status write, customer message, queue job, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:lead-desk` checks public product links, draft admin-only links, list/card/alert formatter output, and absence of unsafe action commands.
- **Validation:** `npm run test:lead-desk`, `npm run test:lead-followup-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - `/inbox` product rows lacked direct operator links (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/inbox pending`, `/inbox publish`, `/inbox stock`, `/inbox failed`, and `/inbox today` surfaced product queues but did not provide direct Payload admin/PDP handoffs per row.
- **Fix (local):** added product admin/PDP link rendering to `src/lib/operatorInbox.ts`, with public PDP links gated to products with a slug plus public status.
- **Guardrails:** `/inbox` remains read-only. No product write, activation, queue job, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:operator-inbox` checks public product links, draft admin-only links, stock/failed/today formatter reuse, and absence of unsafe action commands.
- **Validation:** `npm run test:operator-inbox`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - `/leadplan` lacked direct operator context links (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/leadplan`, `/followupplan`, and `smoke:lead-followup:read` prioritized open leads but did not give the operator direct lead-admin/product-admin/PDP handoffs for the selected row.
- **Fix (local):** added lead-admin, related product-admin, and public-status-only PDP links to lead follow-up plan items, Telegram formatting, and the PII-light runtime smoke.
- **Guardrails:** public PDP links only appear when the related product has a slug plus public status; the plan remains read-only. No lead status write, customer message, job queue, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:lead-followup-plan` checks lead/product link creation, public-status PDP gating, and formatter output.
- **Validation:** `npm run test:lead-followup-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - Shopier previews did not show credential readiness before confirm (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` previews showed confirm commands but did not show whether `SHOPIER_PAT` was configured until the operator tried a confirm action or checked the dashboard/smoke header.
- **Fix (local):** added preview-only credential hold hints to `src/lib/shopierPublishControl.ts`, wired Telegram publish/retry previews and the Shopier runtime smoke to pass `SHOPIER_PAT` presence, and kept confirmed output free of preview-only hints.
- **Guardrails:** preview remains available when credentials are missing; no secret values are printed; existing confirm credential gates remain in place. No direct Shopier call, provider call, publish, redispatch, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:shopier-publish-control` checks missing/available credential hints for publish and retry previews plus confirmed-output suppression.
- **Validation:** `npm run test:shopier-publish-control`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - Shopier previews lacked direct operator links (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/shopier dashboard`, `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` showed product-flow handoffs but did not give operators a direct Payload admin/PDP handoff on each preview/review row.
- **Fix (local):** added deterministic `operatorLinks` to `src/lib/shopierPublishControl.ts`, rendered `Links:` lines in preview/dashboard output, and kept confirmed queue/retry output free of preview-only links.
- **Guardrails:** public PDP links only appear for products with a slug and public status; drafts get the admin link only. No direct Shopier call, provider call, publish, redispatch, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:shopier-publish-control` checks ready link behavior, draft/admin-only behavior, preview links, retry links, dashboard review-row links, and confirmed-output suppression.
- **Validation:** `npm run test:shopier-publish-control`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - `/loadplan` worklist lacked direct operator links (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` showed the next worklist commands but did not give operators a direct Payload admin/PDP handoff on each product row.
- **Fix (local):** added deterministic `operatorLinks` to `src/lib/productLoadingPlan.ts`, rendered a `links:` line in `formatProductLoadingPlan()`, and printed the same links in `scripts/load-plan-runtime-smoke.ts`.
- **Guardrails:** public PDP links only appear for products with a slug and public status; drafts get the admin link only. No product write, queue job, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:loading-plan` checks draft/admin-link behavior, active/PDP-link behavior, and Telegram formatter output.
- **Validation:** `npm run test:loading-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - `/productflow` lacked direct operator links (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/productflow`, `/flow`, and `smoke:product-flow:read` showed the next product workflow step but did not give operators a direct Payload admin/PDP handoff.
- **Fix (local):** added deterministic `operatorLinks` to `src/lib/productFlowSnapshot.ts`, rendered an `Operator Links` block in `formatProductFlowSnapshot()`, and printed the same links in `scripts/product-flow-runtime-smoke.ts`.
- **Guardrails:** public PDP links only appear for products with a slug and public status; drafts get the admin link only. No product write, queue job, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:product-flow-snapshot` checks draft/admin-link behavior, active/PDP-link behavior, and Telegram formatter output.
- **Validation:** `npm run test:product-flow-snapshot`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - `/smokeplan` skipped Telegram access before live Telegram reads (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/smokeplan` began with repo and Telegram loading-plan reads, but did not explicitly run the existing Telegram DM allowlist/access guard before live Telegram operator reads.
- **Fix (local):** added `npm run test:telegram-access` to `src/lib/operatorSmokePlan.ts` after `smoke:load-plan:read` and before `/loadplan`.
- **Guardrails:** read-only checklist/handoff only; no product write, lead/order mutation, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:operator-smoke-plan` checks Telegram access ordering before any `telegram_read` step; `test:telegram-access` checks private DM allowlist behavior and denial semantics.
- **Validation:** `npm run test:operator-smoke-plan`, `npm run test:telegram-access`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - `/smokeplan` skipped sitemap before ad readiness (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/smokeplan` now ran storefront trust, inquiry guard, and attribution before ad readiness, but did not explicitly run the existing sitemap entry guard before paid-traffic readiness decisions.
- **Fix (local):** added `npm run test:sitemap-entries` to `src/lib/operatorSmokePlan.ts` after attribution and before `smoke:ad-readiness:read`.
- **Guardrails:** read-only checklist/handoff only; no product write, lead/order mutation, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:operator-smoke-plan` checks the storefront-trust/inquiry-guard/attribution/sitemap/ad-readiness ordering and formatter wording; `test:sitemap-entries` checks static routes plus website-visible product and blog sitemap entries with safe degradation.
- **Validation:** `npm run test:operator-smoke-plan`, `npm run test:sitemap-entries`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - `/smokeplan` skipped attribution before ad readiness (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/smokeplan` now ran storefront trust and inquiry guard before ad readiness, but did not explicitly run the existing attribution guard before paid-traffic readiness decisions.
- **Fix (local):** added `npm run test:attribution` to `src/lib/operatorSmokePlan.ts` after inquiry guard and before `smoke:ad-readiness:read`.
- **Guardrails:** read-only checklist/handoff only; no product write, lead/order mutation, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:operator-smoke-plan` checks the storefront-trust/inquiry-guard/attribution/ad-readiness ordering and formatter wording; `test:attribution` checks first-touch UTM/referrer capture, storefront navigation preservation, and lead-submit merge behavior.
- **Validation:** `npm run test:operator-smoke-plan`, `npm run test:attribution`, source/release/PR governance, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - `/smokeplan` skipped inquiry guard before ad readiness (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/smokeplan` now ran storefront trust before ad readiness, but did not explicitly run the existing lead-form inquiry guard before paid-traffic readiness decisions.
- **Fix (local):** added `npm run test:inquiry-guard` to `src/lib/operatorSmokePlan.ts` after storefront trust and before `smoke:ad-readiness:read`.
- **Guardrails:** read-only checklist/handoff only; no product write, lead/order mutation, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:operator-smoke-plan` checks the storefront-trust/inquiry-guard/ad-readiness ordering and formatter wording; `test:inquiry-guard` checks honeypot, rate-limit, duplicate-collapse, and safe WhatsApp fallback behavior.
- **Validation:** `npm run test:operator-smoke-plan`, `npm run test:inquiry-guard`, source/release/PR governance, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-16 - `/smokeplan` skipped storefront trust before ad readiness (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/smokeplan` ran read-only ad readiness/performance checks, but did not explicitly run the existing storefront trust guard before paid-traffic readiness decisions.
- **Fix (local):** added `npm run test:storefront-trust` to `src/lib/operatorSmokePlan.ts` after lead follow-up visibility and before `smoke:ad-readiness:read`.
- **Guardrails:** read-only checklist/handoff only; no product write, lead/order mutation, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:operator-smoke-plan` checks the storefront trust ordering and formatter wording; `test:storefront-trust` checks no fake reviews, no placeholder testimonial copy, and honest trust-section presence.
- **Validation:** `npm run test:operator-smoke-plan`, `npm run test:storefront-trust`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-12 - `/smokeplan` skipped read-only manual ad preflights (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/smokeplan` already covered product flow, lead visibility, and Shopier queue preflights, but it did not include the existing read-only manual ad readiness/performance evidence before a future paid-traffic decision.
- **Fix (local):** added `smoke:ad-readiness:read`, Telegram `/adready`, `smoke:ad-performance:read`, and Telegram `/adreport week` to `src/lib/operatorSmokePlan.ts` after lead follow-up visibility and before Shopier queue checks.
- **Guardrails:** read-only checklist/handoff only; no product write, lead/order mutation, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:operator-smoke-plan` checks the ad preflight order, formatter text, and absence of unsafe queue/publish/redispatch/ad commands, including `/adpack`.
- **Validation:** `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-12 - `/smokeplan` did not explicitly pause for Shopier credential readiness (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/smokeplan` stopped before queueing and D-430 paused on Shopier row product-flow handoffs, but it did not explicitly remind operators to verify `SHOPIER_PAT`, webhook readiness, account permission, and quota/readiness before a Shopier confirm action.
- **Fix (local):** added a `shopier-credential-hold` operator step to `src/lib/operatorSmokePlan.ts` after row handoffs and before final queue approval. The hold tells operators to verify readiness outside chat without pasting secrets.
- **Guardrails:** read-only checklist/handoff only; no secret read, product write, queue job, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:operator-smoke-plan` checks the credential hold order, formatter text, and absence of unsafe queue/publish/redispatch/ad commands.
- **Validation:** `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:runtime-smokes`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-12 - `/smokeplan` did not pause on Shopier row product-flow handoffs (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** after D-428/D-429, Shopier dashboard and preview rows exposed `/productflow <ref>` plus exact repo product-flow smoke handoffs, but `/smokeplan` still moved from Shopier previews directly to the final queue/publish hold without a dedicated row-handoff step.
- **Fix (local):** added a `shopier-flow-handoff` operator hold to `src/lib/operatorSmokePlan.ts` after Shopier dashboard/publish-ready/error/retry reads. The formatted plan now tells operators to run the row-provided `/productflow <ref>` and `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` handoffs before any Shopier confirm action.
- **Guardrails:** read-only checklist/handoff only; no product write, queue job, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:operator-smoke-plan` checks the Shopier handoff hold order, formatter text, and that unsafe queue/publish/redispatch/ad commands stay out of the plan.
- **Validation:** `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:runtime-smokes`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-12 - Shopier publish/retry previews hid product-flow handoffs and required PAT too early (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/shopier publish-ready` and `/shopier retry-errors` preview rows did not show exact product-flow preflight commands, and Telegram preview commands could stop at missing `SHOPIER_PAT` before showing readiness/error candidates.
- **Fix (local):** added `/productflow <ref>` plus `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` lines to publish-ready and retry preview rows, and moved the `SHOPIER_PAT` guard so it blocks only `confirm` queueing/retry forms.
- **Guardrails:** read-only preview/preflight by default; no product write, queue job outside explicit confirm, publish, redispatch, provider call, direct Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:shopier-publish-control` checks preview handoffs and confirmed-output behavior; `test:shopier-commands` checks that PAT blocks confirm rather than preview.
- **Validation:** `npm run test:shopier-publish-control`, `npm run test:shopier-commands`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:runtime-smokes`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-12 - `/shopier dashboard` batch rows lacked exact product-flow preflight handoffs (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/shopier dashboard` and `smoke:shopier:read` showed the Shopier batch review sample and a manual next action, but did not consistently show the repo-side product-flow preflight command for the same product before queue decisions.
- **Fix (local):** added `flowCommand` and `runtimeFlowCommand` to Shopier dashboard review rows and rendered `/productflow <ref>` plus `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` under each sample row.
- **Guardrails:** read-only visibility/preflight only; no product write, queue job, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:shopier-publish-control` checks the new row fields and formatted dashboard output; `test:runtime-smokes` guards the runtime smoke alignment.
- **Validation:** `npm run test:shopier-publish-control`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, release/PR/source-pack governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-12 - `smoke:load-plan:read` did not print the exact product-flow smoke command (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** `/loadplan` had a Telegram `/productflow <ref>` handoff and `/smokeplan` told the operator to use `smoke:product-flow:read`, but the load-plan runtime smoke did not print the exact repo command for each selected product.
- **Fix (local):** added `runtimeFlowCommand` to Product Loading Plan worklist rows and printed it from `smoke:load-plan:read` beside the Telegram `flowCommand`.
- **Guardrails:** read-only planning/preflight only; no product write, queue job, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:loading-plan` checks the new command shape and formatter output; `test:runtime-smokes` now requires the runtime command handoff surface.
- **Validation:** `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:operator-smoke-plan`, release/PR/source-pack/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-12 - `/smokeplan` did not immediately use `/loadplan`'s product-flow handoff (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** D-425 made `/loadplan` worklist rows point to `/productflow <ref>`, but `/smokeplan` still sent the operator into provider diagnostics before running the worklist-selected product-flow preflight.
- **Fix (local):** reordered `src/lib/operatorSmokePlan.ts` so `smoke:product-flow:read` and Telegram `/productflow <id-or-sn>` run directly after repo/Telegram `/loadplan`, with provider diagnostics afterward.
- **Guardrails:** read-only checklist only; no product write, queue job, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:operator-smoke-plan` now checks the D-425 load-plan handoff order and explanatory formatter text.
- **Validation:** `npm run test:operator-smoke-plan`, release/PR/source-pack/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-12 - `/loadplan` worklist did not explicitly preflight `/productflow` (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** after D-424, `/productflow` could show the single primary operator step, but `/loadplan` worklist rows still only showed the immediate suggested fix command, so operators could skip the product-flow preflight.
- **Fix (local):** added `flowCommand` to `src/lib/productLoadingPlan.ts` worklist rows and rendered `/productflow <ref>` alongside the suggested action in `/loadplan`, `/loadingplan`, and `smoke:load-plan:read`.
- **Guardrails:** read-only planning only; no product write, queue job, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:loading-plan` now checks `flowCommand` values and formatted output.
- **Validation:** `npm run test:loading-plan`, release/PR/source-pack/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-12 - `/productflow` checklist lacked a single primary operator step (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** after D-423, the checklist order was correct, but operators still had to scan the whole checklist to find the first command/manual step.
- **Fix (local):** added `primaryOperatorStep` to `src/lib/productFlowSnapshot.ts`, surfaced it in the Telegram formatter, and printed it from `smoke:product-flow:read`.
- **Guardrails:** read-only diagnostics only; no product write, queue job, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:product-flow-snapshot` now checks primary activation, incomplete-draft, content trigger/retry, Shopier handoff, and formatter output.
- **Validation:** `npm run test:product-flow-snapshot`, runtime-smoke governance, source-pack, Mentix skill, ops-runbook, release/PR governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-12 - `/productflow` checklist could suggest content/audit commands out of order (IMPROVED LOCALLY, NOT DEPLOYED)
- **Problem:** after D-422, the checklist could show `/content <ref> trigger` and `/audit <ref> run` on an early draft even when confirmation had not passed yet.
- **Fix (local):** made `src/lib/productFlowSnapshot.ts` dependency-aware so content and audit point back to `/confirm` until confirmation passes, and audit points to `/content <ref> trigger` or `/content <ref> retry` until content is ready.
- **Guardrails:** read-only diagnostics only; no product write, queue job, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:product-flow-snapshot` now checks incomplete drafts, pending content before audit, failed content retry before audit, and ready activation handoff.
- **Validation:** `npm run test:product-flow-snapshot`, source-pack, Mentix skill, ops-runbook, runtime-smoke, release/PR governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-12 - `/productflow` did not show a staged operator checklist (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** `/productflow` showed lifecycle, readiness, blockers, dispatch, and next actions, but an incomplete draft still required the operator to mentally stitch together Photos/Image QC, confirmation, content, audit, price/stock, targets, activation, and Shopier queue steps.
- **Fix (local):** added `operatorChecklist` to `src/lib/productFlowSnapshot.ts`, surfaced it in Telegram `/productflow` and `/flow`, and printed it from `smoke:product-flow:read`.
- **Guardrails:** read-only diagnostics only; no product write, queue job, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:product-flow-snapshot` now checks incomplete-draft command guidance and ready activation handoff.
- **Validation:** `npm run test:product-flow-snapshot`, source-pack, Mentix skill, ops-runbook, runtime-smoke, release/PR governance, `npm run validate` with lint at 0 errors / 71 warnings, and `git diff --check` passed locally.

## 2026-07-11 - Current docs could still imply OpenClaw is the live control layer (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** Some source-pack and project-control docs said Hermes was current while other sections still framed OpenClaw as the active Mentix skill/agent layer, creating a stale architecture conflict for Codex/Claude.
- **Fix (local):** reconcile guidance toward Hermes as current agent-control layer; keep OpenClaw historical/optional unless explicitly reactivated; keep `test:openclaw-vps-verification` standalone for optional reactivation review.
- **Guardrails:** docs/governance only; no runtime commerce/image/ads code, no provider call, no Shopier call, no live Telegram/OpenClaw action, no deploy, no commit/PR, no SupplierScout activation, and no retired-channel activation.
- **Coverage:** source-pack, Mentix skill, optional OpenClaw verification, release/PR, and ops governance are being updated to assert the current truth.
- **Validation:** source-pack, Mentix skill, standalone optional OpenClaw verification, release/PR, ops governance, typecheck, lint with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally.

## 2026-07-06 - `smoke:shopier:read` omitted `/shopier dashboard` batch review rows (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** Telegram `/shopier dashboard` showed ready/blocked/queued/synced batch review rows, but the repo-side `smoke:shopier:read` dashboard preview only passed the summary and could miss formatter drift before live Telegram smoke.
- **Fix (local):** updated `scripts/shopier-operator-smoke.ts` to call `buildShopierDashboardReviewRows()` and pass `reviewRows` into `formatShopierOperatorDashboard()`.
- **Guardrails:** read-only smoke only; no product write, Shopier queue, Shopier API call, provider call, external dispatch, SupplierScout activation, retired-channel activation, ad spend, or schema push.
- **Coverage:** `test:runtime-smokes` now checks that the Shopier smoke script keeps `buildShopierDashboardReviewRows`, `reviewRows`, and batch review sample wording.
- **Validation:** `test:runtime-smokes`, source-pack/release/PR/ops governance, `typecheck`, `lint` with 0 errors / 70 warnings, `git diff --check`, and full `npm run validate` passed locally.
- **Status:** local only; production, Shopier, and live Telegram behavior are unchanged.

## 2026-07-06 - `/imageplan` lacked a repo-side runtime smoke preflight (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** operators had Telegram `/imageplan`, but no guarded repo-side check to mirror the same Payload product/job evidence before live Telegram smoke.
- **Fix (local):** added `scripts/image-plan-runtime-smoke.ts`, package script `smoke:image-plan:read`, runtime-smoke governance coverage, and `/smokeplan` ordering before Telegram `/imageplan`.
- **Guardrails:** requires explicit READ_ONLY confirmation, forces `PAYLOAD_DB_PUSH=false`, and performs no product write, image-generation queue, provider call, publish, dispatch, Shopier call, SupplierScout activation, retired-channel activation, ad spend, or schema push.
- **Coverage:** `test:runtime-smokes` covers the package script, script guardrails, and docs; `test:operator-smoke-plan` covers repo smoke ordering before Telegram `/imageplan`.
- **Validation:** no-connect help, `test:runtime-smokes`, `test:operator-smoke-plan`, release/PR/source-pack/ops governance, `typecheck`, `lint` with 0 errors / 70 warnings, `git diff --check`, and full `npm run validate` passed locally.
- **Status:** local only; production and live Telegram behavior are unchanged.

## 2026-07-06 - Image QC REVIEW/FAIL lacked a clear regeneration bridge (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** operators could record Image QC REVIEW/FAIL or reject generated visuals, but then had to infer whether to approve slots, regenerate, record PASS/FAIL, or inspect product flow next.
- **Fix (local):** added `src/lib/imageRegenerationPlan.ts`, Telegram `/imageplan <sn-or-id>`, and Telegram `/regenplan <sn-or-id>` to read product Image QC plus recent image-generation job state and suggest safe manual next commands.
- **Guardrails:** read-only only; no product write, image-generation queue, Gemini/provider call, publish, external dispatch, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:image-regeneration-plan` covers original-only, generated pending QC, REVIEW, FAIL/rejected visuals, active generation, preview approval/regeneration, formatter guardrails, and no-provider/no-queue wording. `test:operator-smoke-plan` covers `/imageplan` in `/smokeplan`.
- **Validation:** `test:image-regeneration-plan`, `test:operator-smoke-plan`, release/PR/source-pack/ops governance, `typecheck`, `lint` with 0 errors / 70 warnings, `git diff --check`, and full `npm run validate` passed locally.
- **Status:** local only; production and live Telegram behavior are unchanged.

## 2026-07-05 - Local provider readiness could be mistaken for production provider proof (FIXED LOCALLY, NOT DEPLOYED)
- **Risk:** local provider-health checks can show key presence or missing key names, but future agents could mistake that for production-ready Gemini, Google Vision, DataForSEO, SerpAPI, Meta/X/Shopier, or n8n fallback capability.
- **Fix (local):** added `project-control/PROVIDER_REALITY_AUDIT.md` and `test:provider-reality` governance to require an explicit production evidence boundary.
- **Guardrails:** no env load, secret print, provider call, credit spend, queue write, publish, live Telegram action, Shopier action, external dispatch, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:provider-reality` checks the audit runbook, package script, safe-suite inclusion, agent guidance, source-pack references, and release/PR package references.
- **Validation:** `test:provider-reality`, release/PR governance, source-pack governance, ops-runbook governance, runtime-smoke governance, retired-channel governance, Product Intelligence provider-health, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
- **Status:** local only; production, provider accounts, and data remain unchanged.

## 2026-07-05 - Historical soak scripts could be mistaken for validation (FIXED LOCALLY, NOT DEPLOYED)
- **Risk:** old `scripts/d*-soak*.ts` files include live-data/write behavior and stale absolute paths, but future agents could mistake them for current validation or read-only runtime smokes.
- **Fix (local):** added `project-control/HISTORICAL_SOAK_SCRIPTS.md` and `test:soak-scripts` governance to quarantine them.
- **Guardrails:** no soak run, live data connection, write, provider call, Shopier call, queue write, external dispatch, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:soak-scripts` checks the runbook, package scripts, `test:safe`, TypeScript/ESLint excludes, `.gitignore`, and source-pack references.
- **Validation:** `test:soak-scripts`, release/PR governance, source-pack governance, ops-runbook governance, runtime-smoke governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
- **Status:** local only; production and data remain unchanged.

## 2026-07-05 - OpenClaw docs could imply unverified VPS state (FIXED LOCALLY, NOT DEPLOYED)
- **Risk:** repo-side skill docs and the installation matrix could be read as proof that VPS OpenClaw already has the current skill set installed and live.
- **Fix (local):** added `mentix-skills/OPENCLAW_VPS_VERIFICATION.md`, updated the deployment sync checklist, rewrote the installation matrix with `VERIFY ON VPS` status, and added `test:openclaw-vps-verification`.
- **Guardrails:** no VPS command, skill sync, restart, live Telegram/OpenClaw prompt, provider call, Shopier call, queue write, external dispatch, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:openclaw-vps-verification` checks the verification checklist, deployment sync checklist, installation matrix, package script, standalone/not-in-`test:safe` boundary, and source-pack references.
- **Validation:** `test:openclaw-vps-verification`, `test:mentix-skills`, release/PR governance, source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
- **Status:** local only; production and VPS OpenClaw remain unchanged.

## 2026-07-05 - Shopier dashboard lacked batch-level product samples (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** operators could see aggregate Shopier readiness and errors but still had to jump to separate commands to understand which products represented the current ready/blocked/queued state.
- **Fix (local):** added a read-only batch review sample to `/shopier dashboard`, backed by the shared Shopier/Web evaluator and showing suggested manual next commands.
- **Guardrails:** no publish, Shopier queue, Shopier API call, provider call, external dispatch, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:shopier-publish-control` now checks the batch review rows and dashboard formatter output.
- **Validation:** `test:shopier-publish-control`, release/PR governance, source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
- **Status:** local only; production remains unchanged.

## 2026-07-05 - Load-plan runtime smoke omitted the first product worklist (FIXED LOCALLY, NOT DEPLOYED)
- **Risk:** D-399 documented that `smoke:load-plan:read` shows the first product worklist, but the terminal smoke output still printed only summary/actions/category order.
- **Fix (local):** updated `scripts/load-plan-runtime-smoke.ts` to print the top worklist rows from `plan.worklist`, and updated `test:runtime-smokes` governance to require that surface.
- **Guardrails:** output remains read-only diagnostics only; no product write, publish, Shopier queue, provider call, SupplierScout activation, retired-channel activation, schema push, or ad spend.
- **Validation:** focused `test:runtime-smokes`, `test:loading-plan`, release/PR governance, source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
- **Status:** local only; production remains unchanged.

## 2026-07-05 - `/loadplan` lacked first product fix candidates (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** D-387 told operators what type of catalog work to do, but not which product to touch first, making catalog scale-up slower and more manual.
- **Fix (local):** added a read-only `worklist` to `src/lib/productLoadingPlan.ts` and surfaced it in `/loadplan`/`smoke:load-plan:read` formatting.
- **Guardrails:** suggested commands stay manual/operator-controlled; no product write, publish, Shopier queue, provider call, SupplierScout activation, retired-channel activation, or ad spend.
- **Coverage:** `test:loading-plan` now checks worklist priority and formatter output.
- **Validation:** `test:loading-plan`, `test:local-release-candidate`, `test:local-pr-review`, source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
- **Status:** local only; production remains unchanged.

## 2026-07-05 - Local review notes were implicit (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** D-397 created a release boundary, but a future Claude/Codex/GitHub review still lacked one concise review package with proposed PR title, scope summary, reviewer focus, validation commands, and not-run/not-done claims.
- **Fix (local):** added `project-control/LOCAL_PR_REVIEW_PACKAGE.md` plus `scripts/local-pr-review-governance.ts`.
- **Guardrails:** the review package explicitly says no commit, branch, push, PR, deploy, live Telegram command, live Shopier webhook smoke, provider call, external dispatch, queue write, ad spend, SupplierScout activation, retired-channel activation, or optional OpenClaw sync has been performed.
- **Coverage:** `test:local-pr-review` checks the review package, source-pack count, active-channel truth, dormant-system rules, validation notes, release boundary, and not-run/not-done wording.
- **Validation:** `test:local-pr-review`, `test:local-release-candidate`, source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally. Lint reported 0 errors and 70 existing warnings.
- **Status:** local only; production remains unchanged.

## 2026-07-05 - Local release/PR boundary was implicit (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** D-380-D-396 created a large validated local stack, but there was no single manifest telling Claude/Codex/ChatGPT Project what is validated locally, what is still not deployed, and what requires operator approval.
- **Fix (local):** added `project-control/LOCAL_RELEASE_CANDIDATE.md` plus `scripts/local-release-candidate-governance.ts`.
- **Guardrails:** the manifest explicitly says no commit, push, PR, deploy, live Telegram command, live Shopier webhook smoke, provider call, external dispatch, queue write, ad spend, SupplierScout activation, retired-channel activation, or optional OpenClaw sync has been performed.
- **Coverage:** `test:local-release-candidate` checks the manifest, source-pack count, active-channel truth, dormant-system rules, validation boundary, and operator approval wording.
- **Validation:** `test:local-release-candidate`, source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally. Lint reported 0 errors and 70 existing warnings.
- **Status:** local only; production remains unchanged.

## 2026-07-05 - `/smokeplan` skipped the new lead-followup runtime smoke (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** D-395 added `smoke:lead-followup:read`, but `/smokeplan` could still jump from `/business` and `/funnel` directly toward Shopier checks without proving `/leadplan` against real Payload leads first.
- **Fix (local):** updated `src/lib/operatorSmokePlan.ts` so the sequence now runs `smoke:lead-followup:read` before Telegram `/leadplan`, then continues to Shopier preflights.
- **Guardrails:** sequence-only/read-only change. No live Telegram command is run, no lead is written, no customer is messaged, no job is queued, no provider or Shopier call is made, no ad spend is possible, and SupplierScout/retired channels remain inactive.
- **Coverage:** `src/lib/operatorSmokePlan.test.ts` now checks business/funnel -> lead-followup runtime smoke -> Telegram `/leadplan` -> Shopier preflight ordering.
- **Validation:** `test:operator-smoke-plan`, source-pack governance, retired-channel governance, runtime-smoke governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally. Lint reported 0 errors and 70 existing warnings.
- **Status:** local only; no live run or production deploy.

## 2026-07-04 - `/leadplan` lacked a repo-side runtime smoke preflight (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** D-394 added a useful Telegram lead follow-up plan, but operators had no read-only repo command to verify the same helper against real Payload leads before live Telegram use.
- **Fix (local):** added `scripts/lead-followup-runtime-smoke.ts` and package script `smoke:lead-followup:read`.
- **Privacy:** terminal output is PII-light: lead IDs, status, action, age, source label, and suggested command only; no customer names or phone numbers.
- **Guardrails:** requires `--confirm-read-only`, forces `PAYLOAD_DB_PUSH=false`, and refuses lead writes, customer messages, queueing, provider calls, Shopier calls, SupplierScout activation, retired-channel activation, ad spend, and schema push.
- **Coverage:** added to `test:runtime-smokes`.
- **Validation:** no-connect help, runtime-smoke governance, source-pack governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally. Lint reported 0 errors and 70 existing warnings.
- **Status:** local only; no live run or production deploy.

## 2026-07-04 - Open leads lacked one read-only priority plan before campaign work (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** `/business` and `/funnel` showed open/stale lead counts, but operators still had to manually decide which open lead to handle first before considering ads or campaign work.
- **Fix (local):** added `src/lib/leadFollowupPlan.ts` plus Telegram `/leadplan` and `/followupplan` to prioritize stale/new open leads and suggest existing manual lead commands.
- **Guardrails:** read-only only. No lead status writes, no customer messages, no ad action, no provider call, no Shopier call, no SupplierScout activation, and no retired-channel activation.
- **Coverage:** `test:lead-followup-plan` covers priority sorting, stale/fresh classification, capped open-list disclosure, formatter guardrails, and no-write Payload reads.
- **Validation:** focused `test:lead-followup-plan`, source-pack governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally. Lint reported 0 errors and 70 existing warnings.
- **Status:** local only; production/live Telegram behavior unchanged until commit/push/deploy and operator-approved smoke.

## 2026-07-04 - Operator smoke plan skipped local Shopier webhook preflight (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** `/smokeplan` moved operators toward Shopier read-only runtime smoke without explicitly running the local stock/refund webhook assertions first.
- **Fix (local):** added `npm run test:shopier-webhook-local` and inserted it into `src/lib/operatorSmokePlan.ts` before `smoke:shopier:read`.
- **Guardrails:** this is a local test step only. It does not call Shopier, queue jobs, dispatch channels, activate SupplierScout, revive retired channels, or spend on ads.
- **Coverage:** `test:operator-smoke-plan` now checks that the local Shopier webhook preflight appears before the Shopier runtime smoke; `test:ops-runbook` checks the runbook/package script inventory.
- **Validation:** `test:shopier-webhook-local`, `test:operator-smoke-plan`, `test:ops-runbook`, source-pack governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally. Lint reported 0 errors and 70 existing warnings.
- **Status:** local only; production/live webhooks unchanged until commit/push/deploy and operator-approved Shopier webhook smoke.

## 2026-07-04 - Duplicate Shopier refund requests could restore stock twice (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** Shopier can retry webhook delivery. The old `refund.requested` route restored stock inline, so a duplicate request could restore stock more than once.
- **Fix (local):** extended `src/lib/shopierRefundLifecycle.ts` so `refund.requested` records an idempotent request marker before stock restore, then wired `src/app/api/webhooks/shopier/route.ts` to restore stock only when that marker is first recorded.
- **Compatibility:** existing legacy notes in the form `Iade talebi: <refundId>` are treated as already-recorded refund requests.
- **Guardrails:** missing order id, unknown local order, duplicate request, or legacy marker does not restore stock. No Shopier API call, channel dispatch, queue write, SupplierScout activation, retired-channel revival, or ad spend is added.
- **Coverage:** `src/lib/shopierRefundLifecycle.test.ts` now covers first request, duplicate request, legacy marker, missing order id, and unknown local order behavior.
- **Validation:** `test:shopier-refund-lifecycle`, `test:shopier-order-stock`, `test:order-desk`, source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally. Lint reported 0 errors and 70 existing warnings.
- **Status:** local only; production/live webhooks unchanged until commit/push/deploy and operator-approved Shopier webhook smoke.

## 2026-07-04 - Shopier refund updates were Telegram-only (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** Shopier `refund.updated` notified Telegram but left no local trace on the Payload order, making refund status history harder to audit after the live message.
- **Fix (local):** added `src/lib/shopierRefundLifecycle.ts` and wired `src/app/api/webhooks/shopier/route.ts` so `refund.updated` appends an idempotent note to the matching order and emits `order.refund_updated` when possible.
- **Guardrails:** `refund.updated` is note/audit only. It does not change order status, restore stock, call Shopier, dispatch channels, queue jobs, activate SupplierScout, revive Dolap/Threads, or spend on ads.
- **Coverage:** added `src/lib/shopierRefundLifecycle.test.ts`, package script `test:shopier-refund-lifecycle`, and included it in `test:safe`.
- **Validation:** `test:shopier-refund-lifecycle`, `test:shopier-order-stock`, `test:order-desk`, `typecheck`, source-pack governance, ops-runbook governance, retired-channel governance, `git diff --check`, and full `npm run validate` passed locally. Lint reported 0 errors and 70 existing warnings.
- **Status:** local only; production/live webhooks unchanged until commit/push/deploy and operator-approved Shopier webhook smoke.

## 2026-07-03 - Mentix/OpenClaw could miss `/smokeplan` as first live-smoke step (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** app-side Telegram now has `/smokeplan`, but repo-side OpenClaw skills could still improvise live-smoke order or preserve stale n8n-first assumptions.
- **Fix (local):** aligned `product-flow-debugger`, `mentix-intake`, OpenClaw deployment sync, installation matrix, and skill dashboard with `/smokeplan` first and n8n optional glue.
- **Coverage:** expanded `test:mentix-skills` to assert `/smokeplan` guidance, dashboard n8n optionality, and `test:operator-smoke-plan` as a required OpenClaw sync precheck.
- **Validation:** `test:mentix-skills`, `test:operator-smoke-plan`, and full `npm run validate` passed locally. Lint reported 0 errors and 70 existing warnings.
- **Status:** local only; VPS OpenClaw and production are unchanged until explicit sync/deploy approval.

## 2026-07-03 - Live smoke order was easy to run out of sequence (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** the repo now has several safe read-only smokes plus Telegram read commands, but operators could forget the intended order and accidentally jump toward queue/publish actions before diagnostics.
- **Fix (local):** added `src/lib/operatorSmokePlan.ts` and Telegram `/smokeplan` as a read-only checklist.
- **Coverage:** added `src/lib/operatorSmokePlan.test.ts`, package script `test:operator-smoke-plan`, and included it in `test:safe`.
- **Guardrails:** the formatted plan stops before queueing, publishing, redispatch, provider spend, Shopier API actions, and ads; it also keeps SupplierScout and retired channels inactive.
- **Validation:** `test:operator-smoke-plan`, `test:retired-channels`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate` passed locally.
- **Status:** local only; production behavior unchanged until commit/push/deploy.

## 2026-07-03 - Product loading plan lacked a real-Payload smoke path (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** `/loadplan` had pure helper tests, but no operator-run smoke to verify the same plan against real Payload products before live Telegram use.
- **Fix (local):** added `scripts/load-plan-runtime-smoke.ts` and package script `smoke:load-plan:read`.
- **Coverage:** added the smoke to `scripts/runtime-smoke-governance.ts`; documentation synced in runtime smoke and deployment runbooks plus source-pack validation docs.
- **Guardrails:** explicit `--confirm-read-only`, `PAYLOAD_DB_PUSH=false`, mutation flag refusal, no product writes, no publishing, no Shopier calls, no provider calls, no job queue writes, no ad spend, no SupplierScout activation, and no retired-channel activation.
- **Validation:** no-connect help, `test:runtime-smokes`, `test:ops-runbook`, `test:source-pack`, `test:retired-channels`, `typecheck`, `lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate` passed locally.
- **Status:** local only; no live read-only run yet; production behavior unchanged until commit/push/deploy.

## 2026-07-03 - Catalog loading priorities were split across separate reports (IMPROVED LOCALLY, NOT DEPLOYED)
- **Risk:** `/catalogqa` and `/categoryfill` were both useful, but the operator still had to manually combine blocker data and category gaps to decide the next loading/fix actions.
- **Fix (local):** added `src/lib/productLoadingPlan.ts` and Telegram `/loadplan [limit]` / `/loadingplan [limit]`, composing Catalog QA and Category Fill into prioritized read-only actions.
- **Coverage:** added `src/lib/productLoadingPlan.test.ts`, package script `test:loading-plan`, and included it in `test:safe`.
- **Guardrails:** no product writes, publishing, Shopier queueing, provider calls, SupplierScout activation, Dolap/Threads revival, or ad spend.
- **Validation:** `test:loading-plan`, `test:retired-channels`, `test:source-pack`, `typecheck`, `lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate` passed locally.
- **Status:** local only; production behavior unchanged until commit/push/deploy.

## 2026-07-03 - Telegram Shopier route contained dead direct queue code (HARDENED LOCALLY, NOT DEPLOYED)
- **Risk:** `/shopier publish` and `/shopier republish` already returned after `queueShopierSync()`, but unreachable legacy code below that return still directly updated `sourceMeta.shopierSyncStatus` and queued `shopier-sync` jobs. Future edits could accidentally revive a route-local queue path that bypasses the shared D-356 gate.
- **Fix (local):** removed the unreachable direct queue/update branches from `src/app/api/telegram/route.ts`.
- **Coverage:** added `scripts/shopier-command-governance.ts`, package script `test:shopier-commands`, and included it in `test:safe`.
- **Validation:** `test:shopier-commands`, `test:shopier-publish-control`, `test:source-pack`, `typecheck`, `lint`, `git diff --check`, and full `npm run validate` passed locally.
- **Status:** local only; production behavior unchanged until commit/push/deploy.

## 2026-07-03 - Read-only runtime smoke inventory could drift (HARDENED LOCALLY, NOT DEPLOYED)
- **Risk:** runtime smoke commands are operator-run and may connect to real Payload/PostgreSQL data. If package scripts, script guardrails, and docs drift, operators or agents could rely on incomplete smoke instructions.
- **Fix (local):** added `scripts/runtime-smoke-governance.ts`, package script `test:runtime-smokes`, and included it in `test:safe`.
- **Coverage:** the governance script checks read-only smoke package scripts, backing scripts, explicit read-only confirmations, mutation refusal, no-write wording, Payload `PAYLOAD_DB_PUSH=false` guards where relevant, and docs in `AGENTS.md`, `CLAUDE.md`, `project-control/RUNTIME_SMOKE_CHECKS.md`, `project-control/DEPLOYMENT_OPS_RUNBOOK.md`, and source-pack validation docs.
- **Validation:** `test:runtime-smokes`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint`, `git diff --check`, and full `npm run validate` passed locally.
- **Status:** local only; production behavior unchanged until commit/push/deploy.

## 2026-07-03 - Story pipeline could queue protected-brand products (HARDENED LOCALLY, NOT DEPLOYED)
- **Risk:** central channel dispatch blocks protected-brand products, but `dispatchStory()` could still create a StoryJob for a protected-brand product after manual activation/review override.
- **Fix (local):** `src/lib/storyDispatch.ts` now scans brand safety before StoryJob creation. Blocked products record `storyStatus='failed'` and `lastStoryError='brand_safety_block: ...'`; no StoryJob is created.
- **Test coverage:** added `src/lib/storyDispatch.test.ts`, package script `test:story-dispatch`, and included it in `test:safe`.
- **Validation:** `npm run test:story-dispatch`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint`, `git diff --check`, and full `npm run validate` passed locally.
- **Status:** local only; production story behavior unchanged until commit/push/deploy.

## 2026-07-03 - Shopier fulfilled webhook bypassed shared order lifecycle (HARDENED LOCALLY, NOT DEPLOYED)
- **Risk:** Shopier `order.fulfilled` updated `status: 'shipped'` directly, so it could skip the `/ship` helper's `shippedAt` stamping, idempotency/refusal rules, and `order.status_changed` audit payload.
- **Fix (local):** `src/app/api/webhooks/shopier/route.ts` now calls `applyOrderStatus(payload, orderId, 'ship', 'shopier_webhook')`.
- **Test coverage:** `src/lib/orderDesk.test.ts` now asserts the `shopier_webhook` source is preserved in the audit event.
- **Validation:** `npm run test:order-desk`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint`, `git diff --check`, and full `npm run validate` passed locally.
- **Status:** local only; production/live webhooks unchanged until commit/push/deploy and operator-approved Shopier webhook smoke.

## 2026-07-03 — Operator order lifecycle/cancel policy lacked focused tests (HARDENED LOCALLY, NOT DEPLOYED)
- **Risk:** `/ship`, `/deliver`, and `/cancelorder` policy existed in `orderDesk.ts`, but had no focused regression test. Manual cancellation could be mistaken for an automatic stock-restore path.
- **Policy clarified:** manual `/cancelorder` does not auto-restore stock; it marks the order cancelled and points the operator to `/restock`. Shopier `refund.requested` remains the automatic channel-refund restore path.
- **Fix (local):** added `src/lib/orderDesk.test.ts`, package script `test:order-desk`, and included it in `test:safe`.
- **Validation:** `npm run test:order-desk`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run typecheck`, `git diff --check`, and full `npm run validate` passed locally.
- **Status:** local only; production behavior unchanged until commit/push/deploy.

## 2026-07-03 — Shopier webhook stock mutation was hard to prove and not fully variant-first (FIXED LOCALLY, NOT DEPLOYED)
- **Symptom/risk:** Shopier `order.created` and `refund.requested` stock logic lived inline in `src/app/api/webhooks/shopier/route.ts`, making it hard to test without a live webhook. Order-created stock decrement was product-level focused, while the rest of the system treats populated variants as the effective stock source.
- **Root cause:** no shared, testable Shopier order/refund stock reconciliation helper. Webhook route mixed order persistence, stock mutation, inventory logging, and stock reaction.
- **Fix (local):** added `src/lib/shopierOrderStock.ts` and wired the Shopier webhook route to it. Sales/refunds now mutate the matching normalized local size variant when variants exist, otherwise product-level `stockQuantity`; product-level stock is synced to variant total after variant mutation. Mismatched product IDs/sizes return skipped reasons.
- **Validation:** `npm run test:shopier-order-stock`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint`, `git diff --check`, and full `npm run validate` passed locally. `test:shopier-order-stock` is included in `test:safe`.
- **Status:** local only; production/live webhooks unchanged until commit/push/deploy and operator-approved Shopier webhook smoke.

## 2026-07-02 — Brand-risk cleanup verification (Loro Piana + #362 externals) — 2 of 4 items resolved by evidence; 2 blocked on operator auth (Prompt 4B)
Read-only browser + HTTPS verification pass. No product edits, no social deletions, no repo code changes (docs-only commit).
- **Shopier listing `48281164` — RESOLVED (evidence).** Live public check of `shopier.com/48281164` returns the shop-level "bulunamadı" (not-found) page; 0× "New Balance"/"9060". The brand-named listing is gone. (Operator may double-check the merchant panel that it is deleted vs merely delisted.)
- **X `#NewBalance` post — RESOLVED (doc evidence).** D-341 Social/Ads Cleanup Report lists "New Balance Çok Renkli Sneaker" (the #362 post) among 19 deleted brand posts. Not live-re-verified (no X browser access this pass); D-341 noted lazy-load below 21 Apr as a residual caveat.
- **Facebook — NOT resolved; exact targets ENUMERATED (page `facebook.com/profile.php?id=61576525131424`).** D-341 deleted zero FB posts. Live page search "New Balance" returns **7 live brand posts**: "New Balance Çok Renkli Sneaker" (×2, incl. 10 May), "New Balance 530 Bej/Bej Kahve" (×2), "New Balance 9060 Mavi Gri", "New Balance 1906R Gri Sarı", "New Balance 990 Gri" — all brand-as-identity AI-image marketing (same risk class as #362; the 9060 post is the explicit #362 model). PLUS a NEW-batch **"Asics Bej Sneaker"** post (23 Haz) with brand-as-identity copy → indicates the social publish path still emits brand-named posts. **Blocked because:** the connected Chrome session is a personal profile (post menu offers only Save/Report, not Edit/Delete) — deletion requires switching to the Page identity (Meta Business Suite or "Sayfaya geç"), and the FB renderer was too unstable (screenshot timeouts) for safe permanent blind deletions. Operator action: as Page admin, delete each post via ⋯ → "Çöp kutusuna taşı"/Sil; also sweep Adidas/Nike/Jordan/Skechers/Converse/Loro Piana per the D-341 X backlog mirror.
- **Loro Piana product (`TG-1779223963653`, slug `loro-piana-tg-1779223963653`, soldout) — NOT changed.** Still fully branded (73× "Loro Piana" across title/brand field/meta+OG/description/articleBody/FAQ/keywordEntities) and, since the 2026-07-02 sitemap deploy, listed in `/sitemap.xml`. Exact de-brand replacement values are prepared (title→`Bej Süet Loafer`, brand cleared, meta→`Bej Süet Loafer | UygunAyakkabı`, etc. — see 4A report). **Blocked because:** the Payload admin tab was at the login screen and entering credentials is prohibited. Operator action: log in and apply the prepared values (or draft the product for instant containment); then re-run verification.
- **Systemic note:** the live "Asics Bej Sneaker" FB post shows the brand-safety guard (D-336A+B) governs website/Shopier publish but does NOT retroactively cover the Facebook posting path for newer products — candidate for a follow-up brand-guard extension.

## 2026-07-02 — Manual **Yayına Al** blocked by QC/audit readiness despite operator approval (SUPERSEDED BY D-467)
- **Symptom:** product **#410** was approved and content-ready, but clicking **Yayına Al** still produced `Aktivasyon engellendi` / readiness `4/6`. Blockers were `visuals: Image QC review: Generated images require explicit QC PASS` and `audit: Brand safety blocked: marka: BOSS ...`. Website did not activate; therefore X/Facebook/Shopier dispatch did not start.
- **Root cause:** `src/lib/publishDesk.ts` treated manual approval the same as fully automated readiness: `approveAndActivateProduct()` refused if `evaluatePublishReadiness(product).level !== 'ready'`, even when the only blockers were human-review gates the operator intended to override. Payload's activation guard also independently enforced Image QC and brand-safety blockers.
- **Original fix (local):** manual publish approval could override `visuals` and/or `audit` readiness failures through `context.manualPublishOverride=true`.
- **D-467 correction (2026-07-24):** protected-brand safety is no longer overrideable. The manual path still permits generic Image QC/audit review, but `approveAndActivateProduct()` and `Products.beforeChange` both reject a protected-brand match even when override context is supplied. Price, usable media, active target, and sellable stock remain hard blockers too.
- **Validation:** `test:publish-desk`, `test:activation-guard`, `typecheck`, lint, and full `npm run validate` pass locally.
- **Status:** fixed in local working tree only; needs commit + production deploy before live UygunOps behavior changes.

## D-335B — Brand-named product #362 published live + to external channels (OPEN — publish risk)
- **Symptom:** product #362 "New Balance Sneaker Çok Renkli" is `active` and was published to website + Shopier + X + Facebook with pervasive brand wording, 'N' logo emphasis, a specific-model claim ("New Balance 9060"), and an authenticity claim ("…'New Balance' yazısı, özgünlüğünü vurgular"). X copy carries "#NewBalance". Risk = HIGH→CRITICAL (trademark/counterfeit + customer-confusion). Worse than D-328.
- **Root cause:** NO automated brand-name guard in the intake → GeoBot content-gen → publish pipeline. A brand-named product passed straight through to active + external channels despite the earlier D-328 cleanup.
- **Containment DONE (D-335C, 2026-06-19):** #362 set `active→draft` via Admin (only status; reversible). Verified: PDP HTTP 404, homepage + /ayakkabilar 0× New Balance/ai-362, active set=[353,354,355,359]. WEBSITE exposure contained. STILL OPEN (manual operator): Shopier `shopier.com/48281164`, X tweet (#NewBalance), FB post — NOT retracted by hiding the website product; IG feed OFF (likely no IG post). No content rewrite yet.
- **Re-verified (D-337, 2026-06-21):** website containment HOLDS — #362 still `draft`, public PDP HTTP 404, active set still `[353,354,355,359]`, homepage 0× brand/`ai-362`. Item stays OPEN **only** for the manual external cleanup (Shopier `48281164`, X `#NewBalance`, FB post) — Claude cannot delete external posts on the operator's behalf. Close this item once those three are removed by the operator.
- **UPDATE (2026-07-02, see top entry):** Shopier `48281164` now returns not-found (RESOLVED); X post deleted per D-341 (RESOLVED); **Facebook is the sole remaining external item** — 7 live New Balance posts (+ an Asics post) enumerated and awaiting Page-admin deletion by the operator.
- **Prevention IMPLEMENTED (D-336A+B, 2026-06-19):** brand-safety guard live in code. NEW `src/lib/brandSafety.ts` (22 brands + 14 claim terms, Turkish-aware, never-throws). Layer 1 `mentixAudit.ts`: a blocked brand forces `needs_revision`/approvedForPublish=false → product can't become publish-ready → not auto-activated (existing Telegram approve/revise UX). Layer 2 `channelDispatch.ts`: a blocked brand skips ALL external channels (no Shopier/X/FB/IG publish). False-positive-aware (brands hard-block; "model"/"logo"/"original" warn only). Validated (9/9 assertions; clean [353,354,355,359] pass, 362-like blocked). No DB schema change. Residual: a manual admin force-activate bypasses Layer 1 (storefront only) — Layer 2 still blocks external publish; all-paths hard gate = optional Layer 3 (D-336C). Commit `feat: add brand-safety guard for audit and channel dispatch`.

## D-332R/D-333/D-333T/D-333C — Manual `#geohazirla` produced no report (RESOLVED 2026-06-19 — was wrong bot/chat)
- **RESOLUTION (D-333C):** sent `#geohazirla 359` to the verified @Uygunops_bot DM (id 8702872700) → worked first try (bot acknowledged + posted full report ready in ~40s). All earlier failures = the command never reached the @Uygunops_bot DM (sent to wrong bot/chat, e.g. GeoBot). Webhook (D-333A) and route code (D-333) were always healthy. NOT a defect. **To trigger manually: DM `#geohazirla <id>` to @Uygunops_bot (not GeoBot).**
- Remaining (separate): reverse-image search fails in prod — root-caused in D-334 below.

## D-334 — Reverse-image search returns 0 evidence (OPEN — code fix identified)
- **Symptom:** PI reports have `referenceProducts = 0`; Telegram warning "Reverse search: google_vision_response: We're not allowed to access the URL on your behalf. Please download the content and pass it in." (reports 43, 45).
- **Root cause (code):** `src/lib/productIntelligence/providers/googleVision.ts` `googleVisionSearch()` sends `image: { source: { imageUri: <uygunayakkabi.com media URL> } }`. Google Vision can't fetch that URL on the project's behalf → per-image error → orchestrator records error, 0 reference products, matchType=low_confidence. NOT env-missing (prod HAS `GOOGLE_VISION_API_KEY`), NOT provider-unsupported.
- **Fix SHIPPED (D-334A, 2026-06-19):** `providers/googleVision.ts` now fetches the image bytes server-side (`fetchImageBase64`: 15s timeout, image/* + size(6MB) + non-empty checks, no secret/byte logging) and sends `image: { content: <base64> }` instead of `imageUri`. Preserves WEB_DETECTION + ranking + fail-soft. esbuild OK; free tier; no env/schema change. Commit `fix: send google vision image content for reverse search` (`51ef749`, deployed). **VERIFIED FIXED (2026-06-19/21):** operator-authorized "Yeniden Üret" regenerate on report 45 → new report id 47: `matchType=similar_style`, confidence 70, **referenceProducts=4** (was 0), imageUri error GONE (rawProviderData = gemini/search/textSearch). 4 similar loafers from instagram.com. Google Vision reverse-image now returns evidence — RESOLVED. (Earlier reports id 43/45 stay `low_confidence`/0 — they ran on the pre-fix code; only NEW runs benefit.)
- Gemini SEO/GEO text generation is unaffected (already strong).

## (historical) Manual `#geohazirla` investigation trail
- **D-333T (2026-06-19):** operator re-sent `#geohazirla 359` as a DM to **@Uygunops_bot** → STILL no report and no bot-event (`anyEventToday=false`; newest activity 2026-06-16, all `geo_auto`). **"Wrong bot" RULED OUT.**
- **Inference:** the #geohazirla handler creates a draft report row + sends a "starting" Telegram reply BEFORE any work; neither occurred → the Telegram update never reached the handler. Likely **Uygunops webhook delivery/config**: webhook url unset/incorrect, OR secret mismatch (`TELEGRAM_WEBHOOK_SECRET` prod ≠ Telegram's → route 401), OR delivery erroring. No Telegram-webhook-driven activity since 2026-06-16. (Sub-branch: if @Uygunops_bot replied "başlatıldı/starting" but no report → `createProductIntelligenceReport` runtime fail instead.)
- **Smallest next (no change):** operator runs Telegram **getWebhookInfo** on the Uygunops bot → inspect `url`, `pending_update_count`, `last_error_date`/`last_error_message`. Claude can't (token-in-URL prohibited).
- **Fix (D-333A, with approval, config only):** re-register Uygunops webhook to `https://<prod-domain>/api/telegram` with the matching secret header; OR correct the secret. No code change — D-333 verified handler/parser/gates are correct.
- **D-333A (2026-06-19) — webhook RULED OUT as cause.** getMe=@Uygunops_bot; webhook url=`https://www.uygunayakkabi.com/api/telegram` (correct); pending=0; secret matching (no 401; only stale "Read timeout" error from 2026-06-16). setWebhook idempotent ("already set"). So config is healthy → today's command most likely never landed on @Uygunops_bot. **Remaining diagnosis (operator):** send `#geohazirla 359` to @Uygunops_bot and report whether ANY reply arrives — no reply → not reaching Uygunops (client/chat); "starting" reply but no report → handler/timeout code issue.
- **Separate architecture finding (D-334 candidate):** the June-16 "Read timeout expired" shows the webhook handler runs slow PI/content work synchronously in-request and can exceed Telegram's read timeout. Improvement: ack 200 fast + run PI/content in background. Low urgency (work still completes server-side).
- **D-333B (2026-06-19) — cause ISOLATED to Telegram client/chat delivery.** Confirmed DM `#geohazirla 359` to @Uygunops_bot STILL produced no report/event. In a DM there is NO gate that drops `#geohazirla`, and a successful run creates a `draft` row + a "starting" reply before any work — neither exists → the Telegram update never reached `/api/telegram`. Webhook config healthy (D-333A) and route/parser/gates correct (D-333). So the break is between the operator's Telegram client and the bot: bot likely not `/start`-ed by this user account, OR a look-alike/wrong bot, OR a Telegram delivery anomaly. **Cross-check (operator):** DM `/pipeline` (shared, always replies) or `/start` to @Uygunops_bot → reply = bot reachable → issue is PI-path-specific (investigate handler/slow-run, D-334); no reply = bot unreachable for this user → `/start` it, confirm username `@Uygunops_bot`, ensure not blocked.
- **Workaround now:** PI reports still generate automatically via the server-side `geo_auto` bridge during normal content generation.
- **Symptom:** Operator sent `#geohazirla 359` (2026-06-19); no new `product-intelligence-reports` row and no `bot-events` were created. The only 359 report is id 43 (trigger `geo_auto`, 2026-06-09). Across the whole table every PI report is `geo_auto`; no manual-triggered report has ever existed. Newest bot-event of any kind = 2026-06-16 (product 361).
- **Inference (not yet root-caused):** the manual Telegram PI command isn't reaching/executing the prod pipeline. Candidates: GEO bot token/webhook (`TELEGRAM_GEO_BOT_TOKEN`/`TELEGRAM_GEO_WEBHOOK_SECRET`) not configured or webhook not registered in prod; command sent to a bot/chat not wired to `/api/telegram`; or the PI command path gated/disabled. PI currently runs ONLY via the GeoBot auto-bridge (`resolvePiResearch`).
- **Impact:** low for now — the auto-bridge already produces reports during content generation; but on-demand `#geohazirla` review of a single product is not available.
- **D-333 narrowed (2026-06-19, read-only):** `#geohazirla` is owned by Uygunops (@Uygunops_bot); GeoBot redirects PI hashtags. Parser accepts `#geohazirla 359`. Live cfg `telegram.groupEnabled=true`, `allowedUserIds` empty (=open) → not blocking. RULED OUT: format, group-disabled, allowlist, DM-auth. REMAINING: (a) wrong bot (sent to GeoBot → redirected, no report) or (b) Uygunops webhook not delivering in prod. No manual-triggered report has ever existed; handler creates a draft row early yet none exists today → message never reached handler. getWebhookInfo not run (token-in-URL prohibited). **Fix path:** operator re-send `#geohazirla 359` as DM to @Uygunops_bot → if works, was wrong-bot (no fix); if silent → re-register Uygunops webhook to `https://<prod-domain>/api/telegram` w/ matching secret (config action). No code change indicated.

## D-332R — Reverse-image evidence absent in PI reports (OPEN, env/provider gap)
- **Symptom:** Report 43 (and the pipeline generally) returns `referenceProducts = 0`; `rawProviderData` has only `gemini`. No GoogleVision/DataForSEO/SerpAPI reverse-search results → `matchType=low_confidence`, `exactProductFound=false`.
- **Cause (inferred):** reverse-search provider creds not set in Vercel prod (`GOOGLE_VISION_API_KEY` / `DATAFORSEO_LOGIN+PASSWORD` / `SERPAPI_API_KEY`) and/or historical DataForSEO Organic-SERP 403. Pipeline is fail-soft so reports still generate (Gemini vision + SEO/GEO text are strong).
- **Impact:** SEO/GEO TEXT quality is high; only external market/competitor evidence + exact-match detection is missing.
- **Next:** D-333 (optional) — enable a reverse-search provider in Vercel if competitor evidence is wanted before scaling GEO.

## D-328 — Brand-name leak on ad landing pages (FIXED, data-only)
- **Symptom (found D-327):** the "Benzer Modeller" similar-products rail on all 3 ad PDPs (359/355/354) surfaced brand-named product 358 `Louis Vuitton Loafer Bej` (same `Klasik` category) → "Louis Vuitton" text 4× per ad landing page. 349 `BOSS Süet Loafer` (Günlük) was also active. Trademark/counterfeit ad-policy + landing-page review risk.
- **Fix (operator-approved):** set products 358 + 349 to `status: draft` via Admin API (active→draft). No rename, no delete. `active→draft` fires no publishing hooks. Reversible.
- **Verified live (cache-busted):** homepage + 359/355/354 PDPs = 0× "Louis Vuitton" / "BOSS"; Benzer Modeller rails render clean. Active set = exactly `[353,354,355,359]`.
- **Guard:** before ads, keep brand-named products non-`active`. Telegram intake or future edits could re-activate them — re-check active titles for brand names (Louis Vuitton, BOSS, Nike, Adidas, Gucci, etc.) before each campaign.

## D-320 — Product-linked inquiry submission HTTP 500 (FIXED + DEPLOYED)
- **Symptom:** Product detail lead form returned "Talebiniz gönderilemedi" (HTTP 500); a diagnostic POST *without* productId succeeded (200); 0 stored leads had a product linked.
- **Root cause:** `ContactForm` sends `productId={String(product.id)}` (string); `products` ids are numeric; `/api/inquiries` passed the string straight to the numeric `product` relationship → `payload.create` threw → 500.
- **Fix:** `/api/inquiries` coerces `productId` string→number (fail-soft to `undefined` on NaN/empty). Commit `9a8001b`, deployed to `main` 2026-06-14.
- **Verified (D-322, 2026-06-14):** admin confirmed the D320 lead (id 11) persisted the `product` relation ("Erkek siyah loafer") AND UTM (`utmSource=d320_test`, `utmMedium=cpc`, `utmCampaign=d320_retest`). Fix confirmed end-to-end.
- **Not a bug:** UTM columns store correctly (verified D-319); the `product` FK column already exists — **no migration needed**.

## D-324 — Placeholder product visible on storefront (FIXED, data-only)
- **Symptom:** Homepage rails (Yeni Gelenler / Çok Sorulan) showed `Taslak Ürün 16/06-4184` (id 361, ₺4.000, badge "Son 1 Adet!") — a Telegram-minted draft placeholder, not a real listing.
- **Root cause:** product id 361 had `status='active'` (the only one of 17 `Taslak Ürün …` rows that was active; the other 16 were already `draft`). Merchandising shows `status==='active'` products.
- **Fix:** Admin PATCH `/api/products/361` `status: active → draft`. Reversible; no rename, no delete, no code change. `active → draft` triggers NO publish hooks (Products afterChange dispatch fires only on `→ active`). Live homepage re-fetched: placeholder gone from all rails; 6 real products still active.
- **Guard for future:** before ad spend, confirm no `Taslak/Draft/Test/Placeholder/Deneme`-titled product is `active`. Query: `/api/products?where[status][equals]=active` and scan titles.

## Known / open
- Products collection hard-delete returns HTTP 500 (server hook/constraint) — not yet investigated; products are hidden via `draft` instead.
- **Cleanup (D-322, 2026-06-14):** D319 (id 10) + D320 (id 11) test leads marked `status=spam` (reversible — out of the active/new funnel; NOT hard-deleted, per the permanent-deletion guardrail). Operator may hard-delete ids 10/11 in Admin → Customer Inquiries if full removal is wanted.
# D-463 Mentix skill runtime wording drift (2026-07-24, local repair validated; not deployed)

- **Symptom:** several repo skill templates and the dashboard sounded as if OpenClaw/VPS deployment was active even though Hermes/Mentix is the current control layer and OpenClaw is historical/optional.
- **Cause:** the high-level architecture was updated before every optional skill template and presentation artifact received the same runtime boundary.
- **Fix prepared:** skill files, activation configuration, dashboard, installation matrix, optional sync checklist, source pack, and Mentix skill governance now make the boundary explicit. Skills are advisory, draft, or read-only; durable memory is limited to PII-light project control decisions.
- **Status:** Mentix/VPS, source/release/PR, retired-channel, n8n, ops, typecheck, lint, `git diff --check`, and full `npm run validate` passed locally with 0 lint errors / 71 warnings. No VPS, Telegram, provider, Shopier, publishing, n8n, or ad action was run.

# D-462 BlogPosts featured-image schema drift (2026-07-24, repaired in configured database)

- **Symptom:** `npm run build` completed but `/sitemap.xml` logged PostgreSQL `42703` because `blog_posts.featured_image_id` did not exist. Static and product sitemap entries still rendered; blog entries were omitted by the route's independent fetch fallback.
- **Cause:** `src/collections/BlogPosts.ts` declares `featuredImage` as a `media` relationship, but the configured database did not receive the additive relationship column.
- **Fix prepared:** `smoke:blog-schema:read` performs a confirmation-gated metadata-only preflight. `db:blog-featured-image:apply` is dry-run by default; its reviewed SQL adds only the missing nullable `featured_image_id`, foreign key, and index to existing tables.
- **Validation:** runtime/source/release/PR/ops governance, `typecheck`, dry-run/refusal checks, `git diff --check`, and full `npm run validate` passed locally.
- **Status:** the approved 2026-07-24 migration added the missing nullable integer column, exact `ON DELETE SET NULL` foreign key, and supporting index. The post-apply read-only check passes and the following build emits no blog-schema fallback warning. Confirmed apply still requires explicit operator approval in any other environment.
