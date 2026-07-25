# Open Questions - Uygunayakkabi

Last updated: 2026-07-25. This is a decision register, not proof of live
provider or deployment state. Keep secrets, tokens, and customer data out of
this file.

## Current Blocking Work

### Q1: Protected-Brand Catalog Provenance

The latest confirmed read-only catalog sample found 13 protected-brand
blockers. Each item needs a human provenance decision: record the review through
preview-first `/brandreview <id-or-sn> needs-evidence|unbranded-copy-fix|not-approved [confirm] [note]`, then either correct the wording for a verified unbranded own product or keep it excluded from publication. `/brandplan` and `/productflow <id-or-sn>` provide the safe review evidence. The confirmed command writes only a BotEvent audit record; it does not alter product eligibility.

Automatic text rewrites, activation, publication, redispatch, and advertising
remain prohibited. This is the current catalog scale-up bottleneck.

### Q2: Instagram Provider Readiness

The direct Instagram path exists, but the last local provider-health evidence
reported it disabled. Before any live publishing work, the operator must verify
the current account, permissions, token-refresh ownership, and quota outside
chat, then run the approved deployment and smoke sequence.

Do not add an n8n token-refresh cron while n8n remains optional glue.

### Q3: Shopier Live Readiness

The guarded Payload publishing path and order/refund lifecycle handling are
implemented locally. D-480 also makes the inbound webhook fail closed without
`SHOPIER_WEBHOOK_TOKEN` and checks the exact raw-body HMAC in constant time
before mutation. Live Shopier credentials, webhook registration, account
permission, and quota remain operator-verified deployment evidence, not a code
claim. Run the local webhook assertions before any approved live webhook smoke.

D-482 makes the local Order plus stock/inventory core transactional and returns
`500` for a verified processing failure so delivery can retry. D-485 now makes
its product/variant decrement arithmetic floor-at-zero and atomic, so concurrent
distinct paid orders cannot leave falsely high local stock. D-481's partial
unique index is applied and post-apply verified in the configured database.
Live Shopier credentials, webhook delivery, account permission, and quota still
need separate operator-approved evidence before live protection is claimed.

D-483 applies the same fail-closed inventory rule to non-Shopier orders. D-484
adds conditional `stock >= quantity` PostgreSQL reservations so concurrent
final-unit requests cannot both succeed. This is local code evidence only; live
operator order-flow verification remains part of the normal post-deploy smoke
sequence.

### Q4: Future Schema Changes

D-462 Blog featured-image schema drift was resolved with the approved,
additive migration and a read-only post-apply check. Future production schema
changes still require: preflight, dry-run SQL review, explicit approval, apply,
and post-apply verification. Do not rely on Payload `push: true` in production.

D-489 makes the confirmation-wizard session table a guarded deployment
prerequisite, D-490 does the same for CustomerInquiries status enum values,
and D-491 does the same for `orders.related_inquiry_id` plus its lead foreign
key. The approved 2026-07-25 read-only preflights found all three contracts
present in the configured database, so no DDL was needed. Future incomplete
environments still require preflight, dry-run review, explicit approval, apply,
and post-apply verification; do not run schema DDL from Telegram or a request
path.

## Deferred Until The Core Flow Is Stable

### Q5: Instagram Carousel Publishing

Carousel support is a possible active-channel improvement after provider
readiness and the product workflow are stable. Keep the current single-product
workflow reliable first; no provider work starts without operator approval.

### Q6: Optional n8n Intake

Current decision: direct Payload/Next is the default product flow and n8n is
optional, frozen glue. Revisit only when a specific current operator need proves
that an app-side path cannot serve it.

### Q7: Optional OpenClaw Reactivation

Hermes/Mentix is the current agent-control layer. OpenClaw is historical and
optional. If it is explicitly reactivated, verify the VPS directory, logs, and
a read-only Telegram prompt before treating repo skill files as deployed.

### Q8: AI Image Expansion And Try-On Providers

Additional generated angles and customer try-on remain future work. Any
provider choice needs quality, cost, consent, retention, and Turkish customer
experience review before a live integration is proposed.

### Q9: GEO/SEO Blog Content Quality

The public `/blog` and `/blog/[slug]` routes exist, the Blog featured-image
schema is applied, and D-479 now blocks incomplete/placeholder first
publications while `/blogpreflight` reports AI/evidence-sensitive wording plus
SEO/editorial warnings. Content generation and publishing remain
operator-controlled. Before publishing a Turkish SEO/GEO article, complete the
manual claim/tone review and verify provider reality without exposing credentials.

### Q10: Paid Traffic And Native Checkout

Keep Shopier as the checkout bridge. Defer native checkout, Meta Pixel/CAPI,
Ads API, and all autonomous spend until product pages, attribution, privacy
wording, catalog depth, image QC, and operator-approved readiness are stable.

## Resolved Or Retired

- Dolap and Threads are retired and must not be reintroduced.
- SupplierScout is dormant while the business sells its own products only.
- D-481's approved partial unique Shopier order-ID index is applied and
  post-apply verified in the configured database. The remaining evidence is an
  operator-approved live webhook smoke, not further index DDL.
- Blog storefront routes are implemented; blog content automation is a separate
  operator-controlled decision.
- The old OpenClaw-to-n8n-to-Payload pipeline is not the current architecture.
  Payload/Next executes commerce work, and Hermes/Mentix provides agent control.
