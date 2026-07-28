# Catalog Cleanup and Image-Generation Test Environment V1

Date: 2026-07-28
Primary result: `CATALOG_CLEANUP_PASS_NO_HARD_DELETE_NEEDED`

## Authorization boundary

The operator authorized authenticated production Payload Admin inspection and safely reversible product-level cleanup. The work did not authorize hard deletion, Media deletion, order/lead/stock changes, image generation, provider calls, Telegram messages, publishing, Shopier work, schema changes, deployment, or a Git push.

The catalog was audited through the authenticated Admin and secret-safe, read-only database transactions. Mutations used only existing Product fields in the authenticated Admin UI. Customer data, credentials, database connection values, and Telegram identifiers are excluded from this evidence.

## Git and Admin preflight

- Canonical repository: `C:\Users\W11\Desktop\uygunayakkabi-store`
- Branch: `main`
- Preflight HEAD: `196dbdbf1a6ca93970d4c23db160acecf47eb514`
- Preflight `origin/main`: `e0b60f6c83f6fa6d59dd6647558eca6883acb341`
- Preflight relation: 1 ahead, 0 behind
- Working tree: clean
- Active Git operation: none
- Production Admin: authenticated and healthy at `https://www.uygunayakkabi.com/admin`

The live Product schema provides a safe quarantine state: top-level `status=draft`, `workflow.workflowStatus=archived`, `workflow.sellable=false`, and `merchandising.homepageHidden=true`. No schema or runtime change was needed.

## Complete catalog inventory

All 129 products were inspected, including the 29 records beyond the first 100-row Admin page.

| Signal | Count |
| --- | ---: |
| Products | 129 |
| Active / draft / sold out | 14 / 114 / 1 |
| Public or meaningful publishing history | 30 |
| Products with business/evidence relationships | 36 |
| Products with image-job history | 124 |
| Products with active/preview-like image jobs | 44 |
| Zero-price products | 90 |
| Empty-brand products | 91 |
| Placeholder/test-like titles | 86 |
| Products with no original relationship | 4 |
| Visually invalid first references | 11 |
| Exact duplicate SN values | 0 |
| Exact duplicate SKU values | 0 |
| Repeated titles | 17 |
| Generated Media in the primary original-image relationship | 0 |

Every available first reference returned HTTP 200 during the audit. Visual inspection nevertheless found 11 screenshot, terminal, chat, or instruction-image references that are not product photos. Accessibility alone is therefore not a sufficient reference-quality check.

## Classification

Every product has exactly one primary classification.

| Classification | Count |
| --- | ---: |
| `KEEP_ACTIVE` | 30 |
| `KEEP_DRAFT` | 20 |
| `IMAGE_TEST_FIXTURE_CANDIDATE` | 5 |
| `QUARANTINE_CANDIDATE` | 12 |
| `HARD_DELETE_CANDIDATE` | 0 |
| `MANUAL_REVIEW_REQUIRED` | 62 |

Classification IDs:

- `KEEP_ACTIVE`: 327, 328, 331, 333, 335, 341, 345, 346, 347, 348, 350, 351, 353, 354, 355, 358, 359, 361, 362, 367, 376, 415, 416, 421, 423, 444, 447, 448, 449, 453.
- `KEEP_DRAFT`: 323, 326, 332, 336, 338, 339, 340, 344, 372, 401, 410, 414, 417, 418, 424, 439, 440, 445, 446, 451.
- `IMAGE_TEST_FIXTURE_CANDIDATE`: 334, 337, 343, 349, 366.
- `QUARANTINE_CANDIDATE`: 324, 325, 342, 402, 403, 404, 405, 407, 408, 409, 411, 452.
- `HARD_DELETE_CANDIDATE`: none.
- `MANUAL_REVIEW_REQUIRED`: 329, 330, 352, 356, 357, 360, 365, 368, 369, 370, 371, 373, 374, 375, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 406, 412, 413, 419, 420, 422, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437, 438, 441, 442, 443, 450.

`KEEP_ACTIVE` includes active/sold-out records and real products with meaningful public, Shopier, dispatch, order, inquiry, or publishing history. `MANUAL_REVIEW_REQUIRED` is intentionally conservative: it includes unresolved active/preview jobs, exact-content duplicates whose canonical product is not safe to infer, and two priced branded records with variants but no original image.

## Duplicate and noise findings

- Thirteen byte-identical first-reference groups span 54 products and 41 duplicate copies. The duplicate Media IDs are distinct even when their bytes are identical.
- The largest group contains 18 separate draft records using the same burgundy-loafer source.
- Repeated sources also occur in New Balance, Asics, loafer, and sneaker groups.
- Duplicate sources frequently have independent image-job evidence. They were not collapsed, detached, or deleted.
- Products 324 and 325 are zero-price, no-image, no-job accidental drafts with only default product-owned channel-target rows. Quarantine is sufficient and safer than deletion.
- Products 329 and 330 have no images but have prices and variants. Their provenance/business intent is not clear enough for automatic cleanup.
- Product 406 has a visibly invalid screenshot reference but an unresolved preview job. It remains untouched for manual job/retention review.
- Six products were visually marked `generating` while all related jobs were terminal. They were conclusively stale: 342, 402, 404, 408, 409, and 452.

## Reversible cleanup plan and execution

The proven safe action was to retain each record and every relationship while moving only high-confidence noise into the existing archived, non-public workflow state. No first-reference relationship was detached because keeping the original evidence linked is safer than hiding or deleting it.

Executed changes:

| Product | Before | After | Reason |
| --- | --- | --- | --- |
| 324 / no SN | draft, workflow draft, visual pending, homepage visible flag false | draft, workflow archived, visual pending, homepage hidden | Empty accidental draft; no image or job history |
| 325 / no SN | draft, workflow draft, visual pending, homepage visible flag false | draft, workflow archived, visual pending, homepage hidden | Empty accidental draft; no image or job history |
| 342 / SN0016 | draft, visual pending workflow, visual generating | draft, workflow archived, visual rejected, homepage hidden | Telegram screenshot; all three jobs terminal |
| 402 / SN0069 | draft, visual pending workflow, visual generating | draft, workflow archived, visual rejected, homepage hidden | Text screenshot; job failed |
| 403 / SN0070 | draft, visual pending workflow, visual rejected | draft, workflow archived, visual rejected, homepage hidden | Chat screenshot; job terminal |
| 404 / SN0071 | draft, visual pending workflow, visual generating | draft, workflow archived, visual rejected, homepage hidden | Terminal screenshot; job failed |
| 405 / SN0072 | draft, visual pending workflow, visual rejected | draft, workflow archived, visual rejected, homepage hidden | Terminal screenshot; job terminal |
| 407 / SN0074 | draft, visual pending workflow, visual rejected | draft, workflow archived, visual rejected, homepage hidden | Terminal screenshot; job terminal |
| 408 / SN0075 | draft, visual pending workflow, visual generating | draft, workflow archived, visual rejected, homepage hidden | Terminal screenshot; job failed |
| 409 / SN0076 | draft, visual pending workflow, visual generating | draft, workflow archived, visual rejected, homepage hidden | Terminal screenshot; job failed |
| 411 / SN0078 | draft, visual pending workflow, visual rejected | draft, workflow archived, visual rejected, homepage hidden | Chat screenshot; job terminal |
| 452 / SN0115 | draft, visual pending workflow, visual generating | draft, workflow archived, visual rejected, homepage hidden | Instruction screenshot; job failed |

All 12 records remain `status=draft`, `sellable=false`, `confirmation=pending`, and `publishStatus=not_requested`. Their Media relationships, generated-gallery relationships, jobs, attempts, slot lineage, channel targets, and evidence remain intact. The operations are reversible by restoring `workflowStatus` and `homepageHidden`; no destructive action occurred.

## Image Generation Test Set

No dedicated test-fixture field exists in the current schema, so V1 designation is documentation-only. No product field was invented and no schema was added.

| Product | Reference | Coverage | Readiness |
| --- | --- | --- | --- |
| 334 / SN0008 | Media 1315, original JPEG, 720x1280 | Blue loafer | Draft, no active job, no publish request |
| 337 / SN0011 | Media 1327, original JPEG, 960x1280 | Tan loafer | Draft, no active job, no publish request |
| 349 / `BOS-MPVYVL8Q` | Media 1377, original PNG, 1536x1024; three originals | Black suede loafer, clean baseline | Draft, no job history, no publish request |
| 343 / SN0017 | Media 1348, original JPEG, 960x1280 | Hand-held sneaker; adversarial retail background | Draft, no active job, no publish request |
| 366 / SN0037 | Media 1439, original JPEG, 960x1280 | Open footwear / dual-buckle sandal | Draft, no active job, no publish request |

The set provides three loafers, one sneaker, one structurally different open-footwear source, and one difficult hand-held scene. All references are accessible originals, all products are non-public drafts, and none has an active image job, order, inquiry, pending publish action, or Shopier history. This designation does not authorize generation.

## Post-cleanup verification

- Total products remain 129; lifecycle counts remain 14 active, 114 draft, and 1 sold out.
- Exactly 12 products are workflow-archived and homepage-hidden.
- Active/preview-like image-job product count remains 44; none was changed.
- Impossible `generating`/`preview` states with no active job fell from 6 to 0.
- Eleven invalid first references remain linked as evidence: 10 are archived; product 406 remains manual review because its preview job is unresolved.
- Four no-image records remain: two are archived; products 329 and 330 remain manual review.
- From the first cleanup save onward, production recorded 0 new Image Generation Jobs, 0 new Media, 0 new Bot Events, 0 new Orders, and 0 new Customer Inquiries.
- Post-state totals are 126 Image Generation Jobs and 664 Media records. Neither collection was mutated by this task.
- Payload Admin remains authenticated and healthy with no captured browser warnings/errors.
- The public storefront loaded its expected home page and product links with no captured browser warnings/errors or error page.
- Vercel production log queries for error, fatal, and HTTP 500 entries over the cleanup window returned no entries.

## Hard-delete gate

No product satisfies a need for hard deletion. Quarantine is sufficient for the two disposable empty drafts, while every other noise/duplicate record has job, Media, workflow, provenance, variant, or unresolved-review evidence worth retaining. The exact hard-delete list is empty, so `CONFIRM HARD DELETE OF EXACT LIST` is not required.

## Local documentation and validation

Tracked documentation changes are limited to this evidence record and the smallest material Source Pack updates: `01_CURRENT_TRUTH.md`, `09_AI_IMAGES_GEO_PRODUCT_INTELLIGENCE.md`, and `17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md`. The Source Pack remains exactly 20 Markdown documents.

All required checks passed:

- `test:catalog-qa`
- `test:product-flow-snapshot`
- `test:product-workflow`
- `test:image-slot-contract`
- `test:image-generation-contracts`
- `test:source-pack`
- `npm run test:safe`
- `npm run typecheck`
- `npm run lint`
- `git diff --check`

No provider, Telegram, production schema, deployment, or Git remote action was invoked by validation.

## Remaining cleanup debt

- Review 62 products conservatively held in `MANUAL_REVIEW_REQUIRED`.
- Resolve the 44 active/preview-like image jobs through a separately authorized retention/recovery policy; begin with invalid-reference product 406.
- Select canonical products for the 13 exact-content duplicate groups before archiving any duplicate with independent job evidence.
- Confirm the intended disposition of products 329 and 330, which have price/variant data but no original image.
- Add an internal fixture designation only through a separately designed schema change; the current five-product set remains documentation-governed.

## Exact next action

Run **CATALOG MANUAL REVIEW AND ACTIVE IMAGE-JOB RETENTION TRIAGE V1** under separate authorization: read-only classify the 44 active/preview-like jobs and 13 duplicate-source groups, starting with product 406, define canonical-product and generated-Media retention decisions, and stop before canceling jobs, detaching Media, or generating images. Resume the controlled durable-slot smoke only after that review selects a clean fixture and receives separate live authorization.
