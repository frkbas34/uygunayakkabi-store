# Ads And Growth

Last updated: 2026-07-03

## Ads Status (2026-07-07): NOT ACTIVE

- `NO_AD_LAUNCH_FOR_NOW` — no ad launch is planned or in progress.
- `ADS_NOT_ACTIVE` — no campaign, spend, pixel, or paid traffic is live.
- `AD_TEST_READINESS_FINDINGS_HISTORICAL` — any prior "ad test may start" / "ad launch ready" / "GREEN pending launch" verdicts (e.g. D-326/D-329/D-337/D-338) are historical readiness findings only; they do NOT authorize launching ads now. The manual ad tooling (`/adready`, `/adpack`, `/adreport`, `adLaunchPack`, `adPerformance`) stays read-only support that creates no campaign, post, pixel, provider call, or spend.

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

- Telegram `/adready <sn-or-id>` shows the manual ad-readiness checklist for one product. D-448/D-452 add safe next-read hints: blocked products point to `/productflow <ref>` and `/imageplan <ref>` when relevant, while review/ready products point to `npm run test:storefront-trust`, read-only `/adpack <ref> manual_ads`, and `/adreport week`.
- Telegram `/adpack <sn-or-id> [campaign]` builds a read-only manual launch pack only for operator review: readiness result, Meta paid-social UTM links, safe copy drafts when hard blockers are clear, and explicit no-autonomous-spend notes.
- Telegram `/adreport [today|week|month]` builds a read-only manual performance summary from Payload leads/orders: UTM-tagged leads, related orders, revenue, stale open leads, unattributed leads, and direct/unattributed orders.
- Telegram `/leadplan` / `/followupplan` should be used before campaign work to clear or prioritize stale open leads. It is read-only and suggests manual lead commands only.
- `npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only` mirrors `/adready` from the repo against real Payload data without writing, publishing, provider calls, Shopier calls, or ad spend.
- `npm run smoke:ad-performance:read -- --confirm-read-only` mirrors `/adreport` from the repo against real Payload leads/orders without writing, mutating leads/orders, publishing, provider calls, Shopier calls, external ad API calls, or ad spend.
- The readiness checklist covers product page status, clean AI media/Image QC, stock and size clarity, active-channel linkability, UTM availability, lead-form visibility, brand safety, risky claims, the no-autonomous-spend guardrail, and D-448/D-452 safe next-read hints.
- `src/lib/adLaunchPack.ts` keeps launch-pack behavior pure and local. `npm run test:ad-launch-pack` covers ready products, protected-brand blocking, risky-claim title fallback, invalid UTM blocking, and the "no campaign is created" guardrail.
- `src/lib/adPerformance.ts` keeps ad-performance reporting pure and local. `npm run test:ad-performance` covers UTM campaign grouping, `relatedInquiry` order attribution, untagged/direct activity separation, stale open lead counting, formatter escaping, and no Pixel/CAPI/Ads API/ad-spend guardrails.
- UTM tooling now accepts the future paid-social vocabulary `utm_source=meta` and `utm_medium=paid_social`, with `utm_content` available for copy-angle tracking.

## What Not To Build Yet

- Autonomous ad spend.
- Meta Ads API automation.
- Automated budget optimization.
- Fully automatic creative publishing.
- Treating `/adpack` output as permission to launch without operator review.
- Treating `/adreport` as ad-platform truth; it is only Payload/UTM/lead/order visibility until external ad APIs are intentionally added later.

## Later Growth Stack

After product workflow and publishing are stable:

1. Meta Pixel/KVKK decision.
2. Conversion API if appropriate.
3. Deeper ad-platform reporting.
4. Ads API experiments.

## Acceptance Criteria

Before spending on ads:

- Product page is strong.
- Product has clean media.
- Product has clear stock/size.
- Channel links work.
- UTM tracking works.
- Operator can see leads.
- Operator can prioritize stale/open leads through `/leadplan` before spending.
- Operator can see basic campaign performance from Payload UTM leads and related orders through `/adreport`.
- Read-only ad-readiness smoke has been run for the product being considered.
- `/adready` safe next-read hints have been followed only as local/operator-controlled checks, reads, or copy-draft preparation; they are not launch approval. For review/ready products, this includes `npm run test:storefront-trust` before `/adpack` or manual paid traffic.
- `/smokeplan` D-432 ad preflights have been followed: `smoke:ad-readiness:read`, `/adready`, `smoke:ad-performance:read`, and `/adreport week` after lead visibility and before any Shopier queue or manual paid-traffic decision.
- `/smokeplan` D-433/D-451 storefront trust preflight has passed: `npm run test:storefront-trust` confirms no fake reviews, no placeholder testimonial copy, honest trust-section presence, and buyer-facing PDP conversion essentials before ad readiness.
- `/smokeplan` D-434 inquiry guard preflight has passed: `npm run test:inquiry-guard` confirms honeypot, rate-limit, duplicate-collapse, and safe lead-form fallback behavior before ad readiness.
- `/smokeplan` D-435 attribution preflight has passed: `npm run test:attribution` confirms first-touch UTM/referrer capture, storefront navigation preservation, and lead-submit attribution merge behavior before ad readiness.
- `/smokeplan` D-436 sitemap preflight has passed: `npm run test:sitemap-entries` confirms static routes plus website-visible product and blog sitemap entries/degrade-safe behavior before ad readiness.
- `/adpack` produces no hard blockers, and any warnings are explicitly accepted by the operator before a paused manual campaign is created outside the app.
