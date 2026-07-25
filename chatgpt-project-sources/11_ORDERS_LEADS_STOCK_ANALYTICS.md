# Orders, Leads, Stock, And Analytics

Last updated: 2026-07-04

## Orders

Shopier is the practical sales bridge. Website-native checkout is not the current core path.

Needed:

- Confirm order lifecycle.
- Live-smoke webhook behavior once Shopier credentials/webhooks are configured.
- Decide final cancellation/refund operator policy.
- Make order state visible to operator.

Current support:

- Telegram `/orders`, `/order`, `/orders summary`, `/orderreminders`, `/ship`, `/deliver`, and `/cancelorder` exist on top of the Payload Orders collection.
- `test:order-desk` covers the operator order lifecycle: ship stamps `shippedAt`, deliver backfills `shippedAt` and stamps `deliveredAt`, delivered orders cannot be cancelled through Telegram, idempotent actions do not write, and manual `/cancelorder` does not auto-restore stock.
- D-445 adds shared read-only order desk operator links to `/inbox orders`, `/orders`, `/orders today`, `/orderreminders`, `/order <id>`, and new-order alerts: order admin, related product admin, related lead admin, and public PDP only for public related products.
- Shopier `order.fulfilled` now routes through `applyOrderStatus(..., 'ship', 'shopier_webhook')`, so webhook fulfillment stamps `shippedAt`, writes the same audit source, and stays idempotent like `/ship`.
- `/business` includes daily order count, lead-converted order count, recorded revenue, open orders, shipped/delivered/cancelled today, and stale shipped orders.
- `npm run smoke:business-funnel:read -- --confirm-read-only` reads the order summary without writing or dispatching.
- Shopier `order.created` and `refund.requested` stock mutation logic is now centralized in `src/lib/shopierOrderStock.ts` and wired into `src/app/api/webhooks/shopier/route.ts`.
- `test:shopier-order-stock` covers product-only stock decrement, variant-size stock decrement, skipped mismatched variant sizes, refund restore for variants, refund restore for product-only stock, inventory-log writes, and dispatch-loop-safe update context.
- Shopier refund lifecycle traceability is now centralized in `src/lib/shopierRefundLifecycle.ts` and wired into `src/app/api/webhooks/shopier/route.ts`.
- `test:shopier-refund-lifecycle` covers flat/nested payload parsing, `refund.requested` idempotency before stock restore, legacy refund marker compatibility, `refund.updated` idempotent order-note append, missing-order no-write behavior, unknown-order no-write behavior, and non-fatal bot-event write failure.
- D-480 verifies the existing Shopier HMAC signature over the exact raw body with constant-time comparison, fails closed when no webhook token is configured, and rejects invalid signatures before parsing or any order/stock/notification side effect. `test:shopier-webhook-security` is folded into `test:shopier-webhook-local` before any operator-approved live webhook smoke.

Current policy:

- Manual/operator `/cancelorder` marks the order cancelled and points the operator to `/restock`; it does not mutate stock automatically.
- Shopier `refund.requested` is treated as the sales-channel refund signal and restores stock through `shopierOrderStock` only after `shopierRefundLifecycle` records the first local request marker.
- Shopier `refund.updated` is note/audit traceability only. It does not change order status or restore stock a second time.

- D-481 makes non-empty Shopier order IDs a database uniqueness contract. The
  webhook exits on a duplicate-key create result before stock decrement. The
  approved partial concurrent index is applied and post-apply verified in the
  configured database with zero duplicate non-empty IDs.
- D-482 runs the local Shopier Order create, product/variant stock updates, and
  InventoryLog writes inside one Payload transaction request. It fails closed if
  a transaction cannot begin. A verified processing failure returns `500` so
  Shopier can retry; the Shopier Telegram alert is deliberately post-commit and
  the generic Orders alert hook skips Shopier to prevent duplicates. The D-481
  index is applied and read-only verified; live webhook delivery is a separate
  operator-approved evidence step.
- D-483 gives non-Shopier Orders the same stock-integrity behavior. A standard
  website, phone, Instagram, or manual order retains the parent Payload request
  through product/variant stock and InventoryLog writes before the generic alert.
  A missing product/size, unknown variant, or insufficient stock rejects the
  create so Payload can roll back the order. `test:order-stock-transaction`
  covers this local contract without external calls.
- D-484 makes the non-Shopier reservation itself conditional at PostgreSQL
  level. The product total is reserved first, followed by the selected variant
  when applicable, both with `stock >= quantity` inside the parent Payload
  transaction. A concurrent final-unit order gets no updated row and its Order
  create rolls back before an InventoryLog exists. This is local code/test proof
  only, not live database evidence.
- D-485 uses the analogous atomic arithmetic for already-paid Shopier orders.
  Product total, then selected variant, is decremented with a floor at zero in
  the active webhook transaction, preventing concurrent distinct deliveries
  from losing depletion and reporting falsely high local stock. It does not
  reject or erase an external paid order because local stock is already zero.

## Leads

Leads come from product forms, WhatsApp intent, and campaign traffic.

Needed:

- Keep UTM attribution.
- Make lead source visible.
- Improve operator commands for lead follow-up.

Current support:

- Telegram `/leads`, `/lead`, `/leads summary`, `/leadreminders`, `/leadplan`, `/followupplan`, `/contacted`, `/followup`, `/won`, `/lost`, and `/spam` exist on top of the Payload Customer Inquiries collection.
- Lead cards show source, UTM source/medium/campaign, and referrer when present.
- `/leadplan` and `/followupplan` build a read-only follow-up plan from open leads, prioritizing never-touched stale leads, overdue follow-ups, quiet contacted leads, and fresh new leads while suggesting existing manual lead commands only. D-442 adds direct operator links: lead admin for every row, related product admin when present, and public PDP only when the related product has a slug plus public status.
- `/funnel` groups demand by lead source and attributes converted orders back to the lead through `relatedInquiry`.
- `test:lead-followup-plan` covers lead priority sorting, stale/fresh classification, capped open-list disclosure, formatter guardrails, and no-write Payload reads.
- `smoke:lead-followup:read` mirrors `/leadplan` and `/followupplan` against real Payload leads after `--confirm-read-only`, printing a PII-light next-action summary plus the same lead/product links without lead writes or customer messages.
- `test:funnel-desk` now covers source attribution, direct-order separation, legacy `completed` rows rolling into won, UTM/referrer rollups, and safe formatter escaping.

## Stock

Stock must be easy to update and hard to drift.

Needed:

- Live webhook smoke after Shopier webhook credentials are configured.
- Low-stock visibility.
- Ongoing reconciliation between product, variants, and Shopier where relevant.

Current support:

- Central stock summary helpers are covered by `test:product-stock`.
- Shopier order/refund reconciliation is covered by `test:shopier-order-stock`; sales decrement the matching local variant when variants exist, otherwise product-level stock, and refunds restore through the same product-or-variant rule.
- Shopier refund lifecycle behavior is covered by `test:shopier-refund-lifecycle`; `refund.requested` is idempotent before stock restore and `refund.updated` records the latest Shopier refund status without mutating stock.
- `/business` surfaces sold-out and low-stock urgency through the existing `/inbox stock` helper.
- D-443 adds read-only operator links to `/inbox` product buckets: product admin links for each product row and public PDP links only for public product statuses.
- D-444 adds shared read-only lead desk operator links to `/inbox leads`, `/leadreminders`, `/leads`, `/lead <id>`, and new-lead alerts: lead admin, related product admin, and public PDP only for public related products.
- Read-only `smoke:business-funnel:read` reports current sold-out and low-stock counts from real Payload data.

## Analytics

Start simple:

- UTM tracking
- Lead source
- Product funnel view
- Campaign readiness

Current support:

- `/business` is the daily owner snapshot.
- `/funnel`, `/funnel today`, `/funnel week`, and `/huni` are read-only source/funnel snapshots, and D-447 adds safe next-read hints for `/leadplan`, `/orders`, and `/adreport week` when funnel evidence needs follow-up.
- `/leadplan` and `/followupplan` are read-only next-action snapshots for open leads before campaign work.
- `smoke:lead-followup:read` is the repo-side preflight before live Telegram `/leadplan` use.
- `test:business-desk` covers the owner summary formatter, urgency output, D-446 safe next-read hints, and absence of unsafe action commands.
- `test:funnel-desk` covers funnel math, attribution detail, D-447 safe next-read hints, and absence of unsafe action commands.
- `smoke:business-funnel:read` mirrors `/business` and `/funnel` against real Payload state. Latest 2026-07-02 read-only smoke found 6 open leads, 5 stale leads, 1 sold-out product, no open orders, no today funnel activity, and a 7-day website funnel count of 2 leads with 1 attributed lead carrying UTM/referrer detail.

Later:

- Meta Pixel
- Conversion API
- More formal dashboards

Do not add ad automation before tracking is reliable.
