# Master Roadmap

Last updated: 2026-06-21

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

