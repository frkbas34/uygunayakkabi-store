# Orders, Leads, Stock, And Analytics

Last updated: 2026-07-02

## Orders

Shopier is the practical sales bridge. Website-native checkout is not the current core path.

Needed:

- Confirm order lifecycle.
- Verify webhook handling.
- Ensure stock decrements/restores correctly.
- Make order state visible to operator.

Current support:

- Telegram `/orders`, `/order`, `/orders summary`, `/orderreminders`, `/ship`, `/deliver`, and `/cancelorder` exist on top of the Payload Orders collection.
- `/business` includes daily order count, lead-converted order count, recorded revenue, open orders, shipped/delivered/cancelled today, and stale shipped orders.
- `npm run smoke:business-funnel:read -- --confirm-read-only` reads the order summary without writing or dispatching.

## Leads

Leads come from product forms, WhatsApp intent, and campaign traffic.

Needed:

- Keep UTM attribution.
- Make lead source visible.
- Improve operator commands for lead follow-up.

Current support:

- Telegram `/leads`, `/lead`, `/leads summary`, `/leadreminders`, `/contacted`, `/followup`, `/won`, `/lost`, and `/spam` exist on top of the Payload Customer Inquiries collection.
- Lead cards show source, UTM source/medium/campaign, and referrer when present.
- `/funnel` groups demand by lead source and attributes converted orders back to the lead through `relatedInquiry`.
- `test:funnel-desk` now covers source attribution, direct-order separation, legacy `completed` rows rolling into won, UTM/referrer rollups, and safe formatter escaping.

## Stock

Stock must be easy to update and hard to drift.

Needed:

- Variant-aware stock operations.
- Sold-out/restock actions.
- Low-stock visibility.
- Reconciliation between product, variants, and Shopier where relevant.

Current support:

- Central stock summary helpers are covered by `test:product-stock`.
- `/business` surfaces sold-out and low-stock urgency through the existing `/inbox stock` helper.
- Read-only `smoke:business-funnel:read` reports current sold-out and low-stock counts from real Payload data.

## Analytics

Start simple:

- UTM tracking
- Lead source
- Product funnel view
- Campaign readiness

Current support:

- `/business` is the daily owner snapshot.
- `/funnel`, `/funnel today`, `/funnel week`, and `/huni` are read-only source/funnel snapshots.
- `test:business-desk` covers the owner summary formatter and urgency output.
- `test:funnel-desk` covers funnel math and attribution detail.
- `smoke:business-funnel:read` mirrors `/business` and `/funnel` against real Payload state. Latest 2026-07-02 read-only smoke found 6 open leads, 5 stale leads, 1 sold-out product, no open orders, no today funnel activity, and a 7-day website funnel count of 2 leads with 1 attributed lead carrying UTM/referrer detail.

Later:

- Meta Pixel
- Conversion API
- More formal dashboards

Do not add ad automation before tracking is reliable.
