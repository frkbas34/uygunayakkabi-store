# Master Roadmap

Last updated: 2026-06-27

## Phase 0: Project Control Center

Goal: stop drift between ChatGPT, Claude, Codex, Obsidian, and old notes.

Deliverables:

- Create one clean Obsidian project brain.
- Maintain this `chatgpt-project-sources` folder.
- Add or maintain `AGENTS.md` for Codex.
- Add or maintain `CLAUDE.md` for Claude.
- Keep Dolap/Threads retired and SupplierScout dormant in all guidance.

Acceptance:

- All agents receive the same current truth.
- There is one obvious place to check active architecture and next work.

## Phase 1: Repo Health And Validation

Goal: make the codebase trustworthy before adding features.

Deliverables:

- Fix broken lint command.
- Add working `typecheck`, `lint`, and `validate` scripts.
- Exclude or clean stale `sessions`, `tmp/next-build`, and broken soak scripts.
- Fix or isolate TypeScript blockers.
- Update `.gitignore` for generated junk.

Acceptance:

- One command gives reliable health signal.
- Claude/Codex stop chasing stale generated files.

Current status: usable as of 2026-06-23. `npm run validate` passes with lint warnings only and the safe tests cover brand safety, product media readiness, product stock readiness, lifecycle, operator/admin readiness summary, source-pack governance, SupplierScout dormancy, Mentix/OpenClaw skill governance, admin visibility, product-channel normalization, publish readiness, state coherence, Telegram parsing and confirmation wizard handling, channel dispatch, dispatch state, provider health, redispatch, automation decisions, activation guard, and Publish Desk activation wrapper.

## Phase 2: Core Product Workflow

Goal: make product upload, review, image, stock, and publish flow smooth.

Target flow:

Telegram/admin upload -> Payload draft -> media attached -> confirmation wizard -> optional AI image/content -> operator approval -> publish.

Deliverables:

- Audit product schema.
- Polish admin product creation.
- Make photo upload reliable.
- Improve confirmation wizard.
- Clarify statuses: draft, needs review, ready to publish, active, sold out.
- Ensure incomplete products cannot publish.

Acceptance:

- A product can be added in under 2 minutes.
- Admin and Telegram flows create the same clean product shape.

Current status: active. The admin ReviewPanel now appears for admin/manual products and shows readiness, lifecycle, channels, brand safety, and activation-guard signals. Product channel targets and publish flags are normalized before activation so manual admin saves match dispatch gates. ReviewPanel and `/pipeline` media/stock diagnostics now use the same usable-media and stock-summary definitions as central activation/readiness, and ReviewPanel's ready banner depends on central six-dimension publish readiness. Live admin and Telegram operator smoke tests are still needed with the operator present.

## Phase 3: Mentix And OpenClaw Brain

Goal: make Mentix useful and clearly owned.

Deliverables:

- Define OpenClaw as agent/skill layer.
- Define Payload/Next as system of record and execution layer.
- Improve active skills: product-flow-debugger, upload-post, senior-backend, research-cog, agent-memory.
- Add skill deployment checklist.
- Decide whether n8n remains in intake.

Acceptance:

- Mentix can explain product failures and prepare channel content.
- OpenClaw is not confused with the app-side Telegram route.

Current status: repo-side guardrails added. The OpenClaw deployment sync checklist lives at `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md`, active skill docs have been aligned to own-products-only and optional n8n, and `npm run test:mentix-skills` checks those rules. VPS deployment reality still needs verification before live OpenClaw operator use.

## Phase 4: Publishing Reliability

Goal: make active channel publishing dependable.

Deliverables:

- Harden Instagram, Facebook, X, and Shopier paths.
- Add readable per-channel status.
- Improve redispatch buttons.
- Add retry handling.
- Add brand-safety hard gate before activation.

Acceptance:

- Each active product shows where it published and why any channel failed.

Current status: in progress. Shared dispatch-state summaries now cover `published`, `queued`, `failed`, `blocked`, `preview`, `unrecorded`, `not_configured`, and `skipped`. ReviewPanel builds an overview from active targets plus recorded dispatch notes, so Website shows as native published, external targets with no result show as unrecorded, and historical non-target notes remain visible. Telegram `/diagnostics` now reports secret-safe provider health for Website, Instagram, Facebook, X, and Shopier. Deeper retry handling still needs work.
- Unsafe products cannot accidentally go external.

## Phase 5: AI Images And GEO Content

Goal: make AI output useful for selling.

Deliverables:

- Stabilize `#gorsel` image workflow.
- Keep generated images separate from originals.
- Improve approval/regenerate flow.
- Keep GEO/SEO content operator-controlled.
- Decide real provider set: Gemini, Google Vision, DataForSEO, SerpAPI.

Acceptance:

- AI images are consistently usable.
- GEO content improves pages without hallucinated claims.

## Phase 6: Storefront Conversion

Goal: improve the sales surface.

Deliverables:

- Better product detail page.
- Better mobile gallery.
- Clear sizes, stock, WhatsApp CTA, Shopier CTA.
- Trust, shipping, returns, authenticity wording.
- Homepage sections for new arrivals, best sellers, deals, editor picks.

Acceptance:

- Product pages are ready for ad traffic.
- Buying path is obvious on mobile.

## Phase 7: Orders, Leads, Stock, Analytics

Goal: know what sells and keep stock coherent.

Deliverables:

- Lead capture cleanup.
- UTM/funnel review.
- Order lifecycle polish.
- Stock decrement/restore verification.
- Decide analytics path.

Acceptance:

- Leads and campaign source are visible.
- Stock drift is diagnosable.

## Phase 8: Ads And Growth

Goal: support ads manually first, automate later.

Deliverables:

- Campaign readiness checklist.
- Ad copy generator for active products.
- UTM builder.
- Product/ad safety check.
- Manual performance report.
- Later: Meta Pixel, CAPI, Ads API.

Acceptance:

- We can choose an ad product confidently.
- No autonomous ad spend until tracking is reliable.

Current status (2026-06-27): deferred. Ads are paused until catalog depth and image quality are strong. The catalog scale-up work in Phase 10 comes first, and the earliest controlled ad test is D-380+. This phase's manual ad helpers already exist (UTM builder, ad-readiness checklist) but are not the active focus.

## Phase 9: Deployment And Ops

Goal: reduce production chaos.

Deliverables:

- Deploy checklist.
- Env var map.
- Webhook health checklist.
- Vercel cron/job runner checks.
- OpenClaw/n8n VPS health checks.
- Rollback guide.
- GitHub PR workflow.

Acceptance:

- Deploy, verify, diagnose, and rollback steps are clear.

## Phase 10: Catalog Scale-Up / Product Loading Factory (CURRENT PRIMARY FOCUS, 2026-06-27)

Goal: scale from a small working storefront into a reliable product-loading system for hundreds of shoe products, with consistent studio-quality images, strong product QA, category coverage, and controlled publishing. Ads are deferred to D-380+.

### D-352 — Product Loading Factory Audit

Audit the current Telegram/admin product upload flow and find bottlenecks before scaling.
Questions: where products enter (Telegram vs admin), time from photo to active listing, most-often-missing fields, which steps need humans, which can be automated, and whether the flow can support 30–50 products/day.
Flow to audit: photo -> title -> category -> description -> size/stock -> price -> image generation -> QA -> publish.

### D-353 — Bulk Product QA Dashboard

Create visibility for product completeness at scale.
Metrics: active, draft, missing price, missing category, missing image, missing size/stock, missing slug/publish-readiness, Shopier-ready, brand-safety blocked, image-QC pending, publish-ready.

### D-354 — Category Fill Strategy

Plan category depth before ads. Known underfilled: SPOR, GÜNLÜK, BOT, TERLİK, CÜZDAN.
Initial depth targets: classic/loafer 40–60; sneaker/sport 30–50; daily 30–50; boots/winter seasonal; slippers seasonal; wallets optional/lower priority.

### D-355 — Product Image Quality Gate

Prevent AI images from inventing defects (tears, cracks, peeling, damaged texture, deformed toe/heel, wrong stitching, fake stains, distorted sole join, color drift, invented logos).
QC states: PASS (publishable), REVIEW (human review), FAIL (regenerate/reject). Full defect checklist and standards live in `09_AI_IMAGES_GEO_PRODUCT_INTELLIGENCE.md`.

### D-355A — Multi-Angle Product Reference Standard

Treat multiple photos of one shoe as the SAME product from different angles, not different products. Reference depth by risk: low 1–2 angles; medium side+back; high side+back+front/top; premium adds detail close-up. The required prompt concept is recorded in 09.

### D-355B — 5-Image Studio Pack Standard

Move from 3 to 5 generated studio images: hero side profile, pair composition, front/top angle, back/heel view, material/craft detail OR outsole. Defaults: image 4 = back/heel, image 5 = detail close-up (outsole may suit sneaker/bot).

### D-355C — Background Lock Standardization

Single background: soft warm ivory seamless studio. Same tone across all 5 images, no grey/yellow/pink drift, consistent lighting/shadow/crop/scale, product ~74–80% of the frame, one coherent studio set.

### D-356 — Shopier/Web Publish Batch Control

Before hundreds of products go live, ensure incomplete/low-quality products cannot publish: active website visibility, Shopier queue readiness, missing-image block, missing price/category block, brand-safety hard block, channel target clarity, batch publish/retry safety. Builds on the existing activation guard (`productActivationGuard` / `publishReadiness`).

### D-357 — SEO/GEO Blog & Product Comparison Automation

After catalog scale begins, use product data for SEO/GEO and comparison content. Operator approval required; no automatic external publishing; no risky or hallucinated authenticity/material/origin claims.

### D-380+ — First Controlled Ad Test (earliest ad phase)

Paid ads are deferred until catalog depth and image quality are strong. Do NOT start Meta ads, Pixel, CAPI, Ads API, autonomous ad spend, or budget automation before then. Ads become relevant only after: a large enough catalog, category balance, product image QC, stable lead capture, stable UTM/admin readback, and enough publish-ready products. This supersedes the earlier Phase 8 framing as the next ad step.
