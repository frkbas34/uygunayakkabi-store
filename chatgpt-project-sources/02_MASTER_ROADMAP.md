# Master Roadmap

This roadmap reflects the 2026-07-26 Telegram-first, image-first operator decision. It describes unfinished work only.

## P0 — security and image correctness

1. Characterize all Telegram message and callback authorization paths, then make production webhook, DM, group, and callback access fail closed while preserving an explicit local-development policy.
2. Design the additive lifecycle/hold/event contract and recoverable-quarantine foundation. The policy census is complete, but no quarantine, restore, cleanup batch, tombstone, or physical worker exists.
3. Remove rejected protected-brand generation restrictions and blocking assertions. Preserve brand safety for claims, human approval, activation, publishing, advertising, Shopier, and external dispatch.
4. Obtain explicit operator decisions for retention durations, evidence-release ownership, quarantine visibility, restore guarantees, and exact-manifest authorization. The Balanced proposal is not enforced; current quarantine and physical-cleanup candidate counts are both zero.
5. Verify production database/provider/webhook state only with separate operator approval. Local tests and environment-name checks are not provider proof.

## P1 — image platform foundation

1. Complete and operator-review the Golden Product Set from `project-control/GOLDEN_PRODUCT_SET_V1.md`. The local corpus has 1 draft candidate, 0 approved products, and 0 loafers; acquire the remaining 35 original sources, including all 12 loafers, without using generated/hero/screenshot/production-only media as truth.
2. Move the additive job-JSON attempt foundation into normalized immutable attempt/slot persistence when separately authorized, without reinterpreting historical partial records.
3. Add provider usage/cost/timing, structured retry, transform, evaluator, checkpoint, and cancellation lineage.
4. Bind Telegram task receipts and progress to exact durable jobs; unify image deduplication across photo, hashtag, command, and callback entry points.
5. Make image approval, rejection, and regeneration state-checked and idempotent, with targeted slot regeneration preserving history.
6. Add provider adapters, capability metadata, normalized timeouts/errors/usage, and budget policies without replacing the current provider.
7. Split prompt assembly into versioned modules without changing prompt content.

## P2 — Telegram platform

1. Replace scattered ownership/help logic with one typed command and callback registry.
2. Decompose the 7,820-line route by domain behind characterization tests and unchanged operator vocabulary.
3. Standardize task summaries, primary next actions, pagination, and Telegram API error reporting.
4. Separate image approval services from route-local relationship SQL and confirmation-wizard coupling.

## P3 — catalog scale-up

1. Continue own-products-only loading through `/loadplan`, `/productflow`, `/imageqcplan`, and manual operator review.
2. Keep the protected-brand catalog backlog deferred until the operator reopens provenance review. This never prevents image generation.
3. Verify product media, Image QC, content, audit, claims, price, size, stock, target channels, and Shopier readiness before activation.
4. Use Shopier preview and dashboard commands before any explicit confirm action.
5. Reconcile conclusive repeated Telegram intake only after exact preview decisions, while preserving every original, job, generated Media relationship, and the two ambiguous inventory groups.

## P4 — live evidence

After security and correctness foundations are closed and the operator approves live work, run documented read-only smokes, verify production provider/account readiness without exposing secrets, then perform narrowly scoped live Telegram, Shopier, and channel delivery checks.

## Stable foundations to preserve

- Payload/Next ownership of commerce writes.
- Transactional order/stock handling and Shopier webhook HMAC checks.
- Public storefront safety, structured-data serialization, and product media fallback.
- Preview-first image approval and explicit generated-image QC.
- Image generation for every product with a valid reference; no protected-brand classification gate at generation time.
- Preview-first Shopier queue controls and manual ad/no-autonomous-spend boundaries.
