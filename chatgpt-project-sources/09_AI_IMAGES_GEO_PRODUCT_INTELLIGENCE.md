# AI Images, GEO, And Product Intelligence

Last updated: 2026-07-06

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
- Telegram `/imageplan <sn-or-id>` and `/regenplan <sn-or-id>` can inspect product Image QC plus recent image-generation job state and suggest the next safe manual command without writing, queueing providers, publishing, dispatching, calling Shopier, or spending.
- `npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only` mirrors `/imageplan` from repo-side Payload reads before live Telegram smoke and performs no writes, image-generation queueing, provider calls, Shopier calls, dispatch, ad spend, SupplierScout activation, retired-channel activation, or schema push.
- Provider visibility exists through `npm run smoke:pi-provider-health:read -- --confirm-read-only`, which checks Gemini, Google Vision, DataForSEO, SerpAPI, and reverse-search selection without Payload access, provider calls, or secret-value printing.

Still needed:

- Live provider quota/balance/permission verification when the operator is ready to spend credits or run `#geohazirla`.

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

### Blog Editorial Preflight (D-479)

Blog copy is now protected by a shared first-publication gate. It blocks missing, short, malformed, or placeholder title/excerpt/body content; records `publishedAt` for a valid first publication; and leaves legacy published-post edits compatible. AI-authored and evidence-sensitive wording remains `needs_review`, so the operator must decide whether claims are supportable before publishing.

- Telegram read: `/blogpreflight <id-or-slug>`.
- Repo-side Payload read: `npm run smoke:blog-preflight:read -- --post=<id-or-slug> --confirm-read-only`.
- Neither diagnostic writes, publishes, calls an AI/search provider, spends credits, or changes schema.

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

Current provider-status support:

- `src/lib/productIntelligence/providerHealth.ts` evaluates provider readiness from env only.
- `npm run test:pi-provider-health` covers missing/partial credentials, reverse-search selection, explicit provider preference behavior, and secret-safe formatting.
- `npm run smoke:pi-provider-health:read -- --confirm-read-only` loads local env files and prints provider states/missing key names without external calls.
- Latest local result on 2026-07-02: Gemini text/image ready, `GEMINI_IMAGE_GEN_MODEL` override present, and reverse search missing because Google Vision, DataForSEO, and SerpAPI credentials are not configured locally.

### D-403 Provider Reality Audit

D-403 provider reality audit adds `project-control/PROVIDER_REALITY_AUDIT.md` and `npm run test:provider-reality`. The audit records that local env readiness is not production provider readiness.

It covers Website, Instagram, Facebook, X, Shopier, Gemini, Google Vision, DataForSEO, SerpAPI, reverse-search selection, and n8n fallback webhooks. It keeps provider checks local-only unless the operator explicitly approves live/provider work.

Guardrails:

- Do not print or copy secret values.
- Do not call Gemini, Google Vision, DataForSEO, SerpAPI, Meta, X, Shopier, or n8n from the audit without explicit operator approval.
- Do not spend credits, queue jobs, publish products, dispatch channels, run live Telegram commands, activate SupplierScout, or revive retired channels.
- Do not mark production provider reality as proven until current production env, account/quota/permission, and approved probe evidence is recorded.

### D-404 Image Regeneration Plan

D-404 adds a read-only bridge from product-level Image QC to the job-level image preview/regeneration flow.

Code and surfaces:

- `src/lib/imageRegenerationPlan.ts`
- `src/lib/imageRegenerationPlan.test.ts`
- Telegram `/imageplan <sn-or-id>`
- Telegram `/regenplan <sn-or-id>`
- `/smokeplan` includes `npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only` before `/imageplan <id-or-sn>`
- Package validation: `npm run test:image-regeneration-plan`
- Runtime smoke: `npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only`

The plan reads product media, `imageQuality`, workflow `visualStatus`, and recent `image-generation-jobs`. It classifies states such as original-only/no action, generation running, preview needs operator, QC decision needed, REVIEW needs decision, and regenerate recommended.

Guardrails:

- Read-only only.
- No product writes.
- No image-generation job queueing.
- No Gemini or provider call.
- No publish, dispatch, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
- It suggests manual commands such as `onayla`, `yeniden uret`, `#gorsel <sn-or-id>`, `/imageqc pass ...`, `/imageqc fail ...`, and `/productflow ...`; it does not run them.

### D-405 Image-Plan Runtime Smoke

D-405 adds `scripts/image-plan-runtime-smoke.ts` and package command `smoke:image-plan:read`.

The smoke is operator-run only and requires:

```powershell
npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only
```

It reads one real Payload product and up to three recent `image-generation-jobs`, then prints the same regeneration plan used by Telegram `/imageplan`.

Guardrails:

- Requires explicit `READ_ONLY` confirmation.
- Forces `PAYLOAD_DB_PUSH=false`.
- Refuses mutation, queue, publish, dispatch, provider, Shopier, SupplierScout, retired-channel, or spend flags.
- Does not write products, queue image generation, call providers, publish, dispatch, call Shopier, spend on ads, activate SupplierScout, revive retired channels, or push schema changes.
- Covered by `test:runtime-smokes` and included in `/smokeplan` before the live Telegram `/imageplan` read.

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

Current status (2026-07-02): implemented as a product-level gate in `src/lib/imageQualityGate.ts`, tested by `npm run test:image-quality`, and included in `npm run validate`. The Payload schema stores `imageQuality.status`, defect flags, notes, checkedAt, checkedBy, and source. The gate feeds publish readiness, activation guard, ad readiness, catalog QA, admin ReviewPanel, Telegram `/imageqc`, Product Flow Snapshot, and Shopier/Web queue gates. Runtime DB verification now passes: `npm run smoke:imageqc:schema -- --confirm-read-only` sees all required `image_quality_*` product columns and the `products_image_quality_defect_flags` relation. The guarded helper remains available if drift reappears; it previews by default and confirmed apply requires explicit operator approval.

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


### 2026-06-30 — Fidelity upgrades (see project-control/D-357)

- Generation is Gemini-only (Claid, Luma, and OpenAI generation removed).
- Multi-reference fidelity: when 2+ angles of the same shoe are sent, a framing block tells
  the model they are ONE product — reproduce only what is visible, keep every detail
  (hardware/logos/emblems) at true size, never invent or enlarge. Operators should send 2-3
  angles plus a close-up of any emblem.
- Detail-preservation lock: existing embossed/stitched detail must not be erased or smoothed
  (complements the no-invent-metal lock).
- Studio-angle QC fixed: all 5 slots are studio shots (slot 4 = material/craft close-up,
  slot 5 = rear three-quarter); stale foot/marble QC criteria removed.
- Output upscaled ~2x (sharp Lanczos, cap 2048px) before save for crisp product-page zoom.
