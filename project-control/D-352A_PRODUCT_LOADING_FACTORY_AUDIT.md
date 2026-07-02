# D-352A Product Loading Factory Audit

Date: 2026-06-30

Scope: documentation and analysis only. No product writes, no publishing, no SupplierScout activation, no Dolap/Threads reintroduction, and no new n8n work.

## Goal

Assess whether the current photo -> title -> category -> description -> size/stock -> price -> image generation -> QA -> publish flow can scale toward 30-50 products/day before hundreds of products are loaded.

## Evidence Used

- `src/app/api/telegram/route.ts`: Telegram photo intake, media group handling, image generation commands, confirmation, activation, stock commands.
- `src/lib/confirmationWizard.ts`: required confirmation fields and wizard state.
- `src/jobs/imageGenTask.ts`: AI image generation, 5-image studio pack behavior, stock-number overlay, approval flow.
- `src/collections/Products.ts`: Payload product schema, activation guard hook, dispatch hook, channel fields.
- `src/lib/publishReadiness.ts`: six-dimension readiness and pipeline diagnostics.
- `src/lib/productActivationGuard.ts`: final activation blockers.
- `src/components/admin/ReviewPanel.tsx`: admin/operator readiness surface.
- `chatgpt-project-sources/02_MASTER_ROADMAP.md`: Phase 10 D-352-D-357 roadmap.
- `chatgpt-project-sources/09_AI_IMAGES_GEO_PRODUCT_INTELLIGENCE.md`: D-355 image-quality standards.

A read-only aggregate catalog query was attempted with `PAYLOAD_DB_PUSH=false`, but it timed out before returning counts. This audit therefore does not claim current DB-wide missing-field totals. D-353 later added a proper read-only catalog QA surface for those counts: `src/lib/catalogQa.ts`, `src/lib/catalogQa.test.ts`, and `/catalogqa [limit]`.

## Current Product Loading Flow

1. Intake starts from Payload admin, Telegram photo intake, or automation endpoint.
2. Telegram photo intake creates draft products, attaches original media, parses caption hints, resolves active channel targets, and can auto-start image generation when the selected mode requests it.
3. Telegram media groups are treated as multiple references for the same product when grouped correctly, reducing the risk that multiple angles become multiple products.
4. Confirmation wizard collects or verifies category, product type, title/stock code, price, sizes, per-size or product-level stock, brand, and channel targets.
5. AI image generation writes previews through `image-generation-jobs`; approved generated images attach to `generativeGallery`, separate from original product images.
6. Content/GEO/audit steps prepare selling copy and safety checks. The product remains operator-controlled.
7. Central publish readiness checks six dimensions: confirmation, visuals, content, audit/safety, sellable price/stock, and publish targets.
8. Final activation is guarded in `Products.beforeChange`: price > 0, usable original or generated image, stock > 0, active target, and brand safety must pass.
9. `Products.afterChange` handles external channel dispatch for active products and records per-channel dispatch state.

## Bottlenecks

- Operator confirmation is the primary throughput bottleneck. Price, category, size/stock, brand, and targets still require manual confirmation unless caption/vision/autofill is strong.
- Image generation and QA are the second bottleneck. The 5-image studio standard improves merchandising but multiplies review work. D-355 now adds structured PASS/REVIEW/FAIL product-level QC, but operators still need to visually judge generated images before approving PASS.
- Content and audit are useful but heavy for batch loading. For scale, the system needs a clear distinction between "catalog complete enough to list" and "fully enriched with GEO/blog/discovery content".
- Current readiness is strong for single-product safety, but weak for batch visibility. Operators can inspect one product well, yet cannot quickly see all drafts blocked by missing price/category/image/stock/content/audit.
- Category depth is now operationalized read-only through `/categoryfill [limit]`, which shows target gaps, draft/review backlog, publish-ready backlog, and legacy/unknown category counts.
- Batch activation exists through Telegram-style commands, D-356A now previews/guards Shopier queueing plus safe retry candidates, and D-356B shows the same per-product Shopier Queue Gate in Payload admin ReviewPanel. Broad batch publishing should still wait until the guarded commands are live-smoked and retry/error visibility proves usable for operators.

## Most Likely Missing Fields

Based on code gates and operator flow, the fields most likely to block scale are:

- price: required by schema, readiness, and activation guard.
- category: nullable for intake compatibility, but needed for catalog quality and category fill.
- usable media: empty placeholder rows do not count; either original `images` or approved `generativeGallery` must exist.
- size/stock: populated variants are preferred; otherwise product-level `stockQuantity` must stay correct.
- channel targets: only Website, Instagram, Facebook, X, and Shopier count.
- stock number: generated/used for operator lookup and image overlay; missing stock numbers slow batch handling.
- confirmation/content/audit states: central readiness can block products that look field-complete.
- image QC state: D-355 quality rules now exist as structured product state, but REVIEW/FAIL products still require operator follow-up or regeneration.

## 30-50 Products/Day Assessment

Not ready yet.

The safety rails are good enough for controlled single-product or small-batch loading, but 30-50 products/day needs a batch QA dashboard and image-QC triage. Without that, the operator will spend too much time opening individual products to discover missing category, stock, content, audit, or visual issues.

Current realistic throughput estimate from code shape: small batches are feasible; sustained 30-50/day is still risky until D-356 is live-smoked and retry/error handling is proven in operator use. D-355 DB schema drift is resolved as of the 2026-07-02 read-only schema smoke. The first D-356 Shopier/Web queue guard, `/shopier errors` triage, `/shopier retry-errors` safe retry preview, per-product admin Shopier Queue Gate, `npm run smoke:shopier:read` read-only runtime smoke support, and `/productflow` plus `npm run smoke:product-flow:read` read-only product-flow diagnostics are implemented as operator surfaces.

## Recommended Next Build

1. Use D-353 `/catalogqa [limit]` before loading larger batches to see current catalog completeness.
2. Use D-354 `/categoryfill [limit]` before loading larger batches to prioritize category gaps.
3. D-355: structured image QC fields, operator visibility, and activation/readiness gates are implemented.
4. Keep D-353/D-354 read-only. Do not add broad batch mutation until D-356.
5. D-356: first Shopier/Web queue guard, `/shopier errors` triage, `/shopier retry-errors` safe retry preview/confirm, per-product admin Shopier Queue Gate, `/productflow` diagnostics, and read-only runtime smoke support are implemented; next live operator smoke the Telegram commands, verify Shopier credentials before queueing, and decide whether richer retry/error UI is needed.

## Decision

D-352A is complete as a code-evidence audit, D-353/D-354 now give the operator read-only catalog and category-depth visibility, D-355 structured Image QC is implemented and DB schema verified, D-356A adds a guarded Shopier/Web queue path plus first-pass error triage, safe retry preview/confirm, and read-only runtime smoke support, D-356B adds per-product admin Shopier Queue Gate visibility, and Phase 2/3 now adds read-only Product Flow Snapshot diagnostics. Do not proceed to mass loading, broad batch publishing, or ads until D-356 is live-smoked and retry/error visibility is good enough for operator use.
