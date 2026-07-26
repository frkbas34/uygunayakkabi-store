# Orders, Leads, Stock, and Analytics

Current as of 2026-07-26.

## Source of truth

Payload owns lead, order, product, stock, attribution, and lifecycle state. Telegram commands are operator interfaces over those records; they are not a second database.

## Lead operations

- `/leadplan` and `/followupplan` are read-only prioritization views.
- `/leads`, `/lead <id>`, `/leadreminders`, `/inbox leads`, and new-lead alerts share lead-desk links.
- Lead links include Payload admin, related product admin, and a public PDP only when the product is public.
- Status changes and customer messaging remain explicit operator actions.

## Order and stock operations

- `/orders`, `/orders today`, `/order <id>`, `/orderreminders`, `/inbox orders`, and alerts share order-desk links.
- Ship/deliver transitions use shared lifecycle helpers; delivered orders cannot be cancelled from Telegram.
- Manual cancellation does not auto-restock; the operator is directed to `/restock`.
- Shopier order/refund webhooks are HMAC-gated and idempotent. Stock changes use transaction-aware, floor-at-zero paths.
- `refund.requested` records its marker before stock restoration; `refund.updated` is note/audit only.

## Read-only business views

- `/business` summarizes lead, order, and stock urgency and suggests safe follow-up reads.
- `/funnel` summarizes sources, attribution, leads, orders, and conversions.
- `/adreport [today|week|month]` reports UTM-attributed leads/orders/revenue from Payload only.

## Validation

Primary local checks include `test:lead-desk`, `test:lead-followup-plan`, `test:order-desk`, `test:business-desk`, `test:funnel-desk`, `test:shopier-order-stock`, `test:shopier-refund-lifecycle`, `test:shopier-webhook-security`, `test:shopier-webhook-local`, and `test:order-stock-transaction`.

Runtime counts require an explicitly approved read-only smoke with the configured Payload database. Local tests do not prove production data quality.
