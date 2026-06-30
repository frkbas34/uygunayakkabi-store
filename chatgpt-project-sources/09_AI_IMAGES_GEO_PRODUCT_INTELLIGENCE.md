# AI Images, GEO, And Product Intelligence

Last updated: 2026-06-28

## AI Image Workflow

Primary goal: create product images good enough for storefront/social use.

Target behavior:

- Use source product photo.
- Generate improved/product-scene images.
- Send preview.
- Operator approves or regenerates.
- Approved images attach to generated gallery.
- Generated images remain separate from originals.

Current implementation:

- Generated images stay separate from originals in `generativeGallery`.
- Structured Image QC lives on the product as `imageQuality`.
- AI/generated images require explicit QC PASS before publish readiness, activation, or ad readiness.
- Payload admin ReviewPanel shows Image QC state.
- Telegram `/imageqc` can inspect or set PASS/REVIEW/FAIL without publishing, dispatching, retrying, or spending.

Still needed:

- Better rejection/regeneration path from FAIL/REVIEW back into image generation.
- Clear provider status.

## GEO Content

Primary goal: improve product page content and discoverability.

Generated output may include:

- Product description
- Instagram caption
- Facebook copy
- X post
- Shopier copy
- Highlights
- FAQ
- Blog draft or product guide draft

Needed:

- Operator approval.
- Storefront rendering for useful fields.
- Claim safety.

## Product Intelligence

Primary goal: help understand product positioning, similar styles, search language, buyer intent, and SEO.

Provider candidates:

- Gemini
- Google Vision
- DataForSEO
- SerpAPI

Needed:

- Decide which providers are real in production.
- Avoid assuming provider availability from local env.
- Keep intelligence as recommendation until approved.

## Safety Rule

AI must not invent claims about brand, authenticity, leather/material, origin, or condition. Risky claims need operator confirmation.

## Product Image Quality Factory (D-355 family, 2026-06-27)

Image quality control is the top priority of the catalog scale-up phase (see `02_MASTER_ROADMAP.md` Phase 10). AI-generated shoe images must preserve the real product and never invent defects.

### D-355 — Image Quality Gate

Decision states:

- PASS: publishable.
- REVIEW: human review required.
- FAIL: regenerate or reject.

Defect checks (all must hold): no fake tearing, no cracks, no peeling, no damaged suede/leather texture, no deformed toe shape, no broken heel shape, no wrong stitching, no fake stains, no distorted sole join, no color drift from the original product, no invented logos/brand elements.

Current status (2026-06-30): implemented as a product-level gate in `src/lib/imageQualityGate.ts`, tested by `npm run test:image-quality`, and included in `npm run validate`. The Payload schema stores `imageQuality.status`, defect flags, notes, checkedAt, checkedBy, and source. The gate feeds publish readiness, activation guard, ad readiness, catalog QA, admin ReviewPanel, and Telegram `/imageqc`. Runtime DB still needs the D-355 Image QC migration/DDL verified: `npm run smoke:imageqc:schema -- --confirm-read-only` currently reports missing product columns `image_quality_status`, `image_quality_notes`, `image_quality_checked_at`, `image_quality_checked_by`, `image_quality_source`, plus missing relation `products_image_quality_defect_flags`. The guarded helper is `npm run db:imageqc:apply`; it previews by default and confirmed apply requires explicit operator approval.

### D-355A — Multi-Angle Product Reference Standard

If multiple images are provided, treat them as the SAME product from different angles, not different products.

Reference depth by risk:

- Low-risk: 1–2 angles acceptable.
- Medium-risk: side + back recommended.
- High-risk: side + back + front/top required.
- Premium/detail: side + back + front/top + detail close-up preferred.

High-risk product types: suede, tassel loafer, buckle models, glossy leather, dark-colored shoes, fine stitching, premium classic shoes.

Required prompt concept: "These images are different-angle references of the same shoe. Do not interpret them as different products. Preserve the exact product identity, material, color, stitching, sole, heel, toe shape, and details. Do not create any damage, tear, crack, deformation, stain, or extra detail that is not present in the reference."

### D-355B — 5-Image Studio Pack Standard

Target five studio-quality images per product:

1. Hero side profile.
2. Pair composition.
3. Front/top angle.
4. Back/heel view.
5. Material/craft detail close-up OR outsole view.

Defaults: image 4 = back/heel, image 5 = material/craft detail close-up. Dynamic rule: loafer/classic/premium -> detail close-up; sneaker/bot -> outsole view may be better.

### D-355C — Background Lock Standardization

Single background standard: soft warm ivory seamless studio background.

Requirements: same tone across all 5 images; no grey/yellow/pink drift; consistent studio lighting; consistent soft shadow; consistent crop and scale; product occupies ~74–80% of the frame; the 5 images must look like one coherent studio product set.
