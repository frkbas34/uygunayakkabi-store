# Ads And Growth

Last updated: 2026-07-02

## Strategic Status (2026-06-27): Ads Deferred

Ads are intentionally PAUSED. The current primary focus is catalog scale-up / product loading factory (see `02_MASTER_ROADMAP.md` Phase 10, D-352–D-357). The earliest ad phase is D-380+.

Do NOT frame the next phase as "start ads." Correct framing: build the product catalog and image-QA factory first; advertising comes much later.

Ads become relevant only after: a large enough catalog, category balance, product image QC, stable lead capture (restored via D-351), stable UTM/admin readback, and enough publish-ready products. The "What Not To Build Yet" list below still holds, and Meta Pixel/CAPI/Ads API stay deferred until D-380+.

## Current Direction

Manual ad support first. Automation later.

## What The System Should Support Now

- Select ad-ready products.
- Generate ad copy drafts.
- Build UTM links.
- Check product readiness.
- Check brand/claim safety.
- Track leads and funnel.
- Summarize basic campaign performance.

## Current Operator Tooling

- Telegram `/adready <sn-or-id>` shows the manual ad-readiness checklist for one product.
- `npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only` mirrors `/adready` from the repo against real Payload data without writing, publishing, provider calls, Shopier calls, or ad spend.
- The readiness checklist covers product page status, clean AI media/Image QC, stock and size clarity, active-channel linkability, UTM availability, lead-form visibility, brand safety, risky claims, and the no-autonomous-spend guardrail.

## What Not To Build Yet

- Autonomous ad spend.
- Meta Ads API automation.
- Automated budget optimization.
- Fully automatic creative publishing.

## Later Growth Stack

After product workflow and publishing are stable:

1. Meta Pixel/KVKK decision.
2. Conversion API if appropriate.
3. Ad reporting.
4. Ads API experiments.

## Acceptance Criteria

Before spending on ads:

- Product page is strong.
- Product has clean media.
- Product has clear stock/size.
- Channel links work.
- UTM tracking works.
- Operator can see leads.
- Read-only ad-readiness smoke has been run for the product being considered.
