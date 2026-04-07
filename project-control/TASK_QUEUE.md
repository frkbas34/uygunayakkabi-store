# TASK QUEUE — Uygunayakkabi

_Last updated: 2026-04-07 (Image Pipeline v38 Slot 3 Rebuild + Global BG Lock D-124; Image Pipeline v37 Centering QC Gate + Sharp Bugfix D-123; Image Pipeline v36 Centering + Brightness D-122; v35 Brightness Normalization D-121; v34 BG Lock + Slot Reorder D-120; DB Hotfix enum types; Phase 21 Operator Runbook; VF-7 D-117b; VF-6 D-117; Phase 19 D-116; Phase 18 D-116; Phase 17 D-116; Phase 16 D-116; Phase 13 D-115/D-114; Phases 1-12 complete)_

---

## ⚠️ Active Blockers

### Blocker 0: push:true Does NOT Run in Production — ONGOING RISK
`push: true` is guarded by `NODE_ENV !== 'production'` in `@payloadcms/db-postgres/dist/connect.js`.
**All schema changes on Neon MUST be applied manually via SQL.**
Before adding any new collection/global: manually verify the new table + `payload_locked_documents_rels` column exist in Neon after deploy.

### Blocker 1: Workspace Folder Out of Sync with Remote — ACTIVE
The workspace folder (`/mnt/uygunayakkabi-store`) is on a diverged history from remote main.
Remote is at `8089dde` (Step 27 + fixes). Workspace is at `beb681a` (pre-Step 25).
The workspace CANNOT be updated with a simple `git pull` — histories have diverged.
**Fix (requires explicit operator authorization):** `git fetch origin && git reset --hard origin/main`
This will discard local uncommitted changes and diverged local commits — IRREVERSIBLE.
Do NOT execute without operator confirmation.

### Blocker 2: No AI Image Gen Job Proven End-to-End — RESOLVED
~~No AI image generation job proven in production.~~ RESOLVED by VF-6 validation (2026-04-05). Product #180 / Job #147: Gemini image gen → preview → approval → generative gallery attached (6 images). visualStatus transitions verified: pending→approved. Full pipeline proven end-to-end.

---

## 🟢 NOW — Current Sprint (VISUAL-FIRST PIPELINE VALIDATED — 2026-04-05)

### ✅ Image Pipeline v38 — Slot 3 Rebuild + Global Background Lock: DEPLOYED (2026-04-07)
- Replaced `detail_closeup` (macro) with `back_hero` (3/4 rear hero: heel counter, back stitching)
- New slot 3 is a full-shoe shot → all post-processing works: bg enforcement, frame crop, brightness, centering, centering QC
- Removed all macro-specific code: corner-only bg sampling, tighter thresholds, centering skip
- Global background-lock formalized: slot 1 is bg-family source, slots 2-5 must match exactly
- Removed macro/editorial/lifestyle background exceptions from TASK_FRAMING_BLOCK
- Unified bg enforcement thresholds (90/50) for all slots
- No-frame rule verified hardened at all 3 levels (prompt, QC, post-processing)
- D-124

### ✅ Image Pipeline v37 — Centering QC Hard Gate + Sharp Bugfix: DEPLOYED (2026-04-07)
- Fixed Sharp chaining bug: `.extract().extend().resize()` computed resize from post-extract dims, undoing centering
- Fix: split into two separate Sharp instances (extract+extend first, conditional resize second)
- measureCentering() QC function added: 12% offset threshold on either axis
- Centering retry loop: up to 3 full gen cycles per hero slot (side_angle, commerce_front)
- V37 verification: both heroes pass QC first cycle, 0% offset confirmed via pixel analysis
- SKU stamp (overlayStockNumber) causes false positives in naive post-download bbox analysis — not a real offset
- D-123, commit cd02c19

### ✅ Image Pipeline v36 — Centering + Tighter Brightness: DEPLOYED (2026-04-07)
- centerProduct(): detects product bbox, measures offset from image center, shifts composition
- Tightened brightness band: TARGET_HIGH 170→145, TARGET_LOW 100→85, TARGET_MID 135→115
- Added CENTERING—CRITICAL prompt block to all studio slot prompts
- Pipeline order: bg enforcement → frame crop → brightness norm → centering
- V36 verification: brightness PASS (product lum 92-109), centering PARTIAL (operational but limited by Gemini generation variance)
- Known: slot 3 frame + surface bg persists (pre-existing, not v36 regression)
- D-122, commit 8c3904d

### ✅ Image Pipeline v35 — Brightness Normalization: DEPLOYED (2026-04-07)
- Deterministic product-aware brightness normalization added to all outputs
- normalizeBrightness(): measures PRODUCT pixel luminance only, selective gamma correction
- Runs unconditionally on every slot after bg enforcement + frame detection
- Background pixels preserved (not affected by gamma correction)
- Target band: product mean luminance 100-170 (was no real enforcement before)
- Tightened QC thresholds: mean>200 (was 210), highlight>30% (was 35%)
- Audit confirmed: NO DM/group code divergence — same pipeline for all

### ✅ Image Pipeline v34 — Background Lock + Slot Reorder: DEPLOYED (2026-04-07)
- Side-angle is now the primary hero (index 0) across website, channels, Telegram
- generativeGallery shown on product page + homepage (AI images first, originals as fallback)
- enforceSlotBackground v34: corner-only sampling for macro, contamination guard, batch consistency check
- DB hotfix: 3 missing enum types for hasMany select join tables

### ✅ Phase 21 Operator Runbook: COMPLETED (2026-04-06)
Comprehensive operator-facing daily SOP created: `project-control/OPERATOR_RUNBOOK.md`.
Covers daily flow, all commands, pipeline stages, automated behaviors, exception handling, critical warnings, daily checklist, and key thresholds.

### ✅ Visual-First Pipeline: PROD-VALIDATED (D-117)
Full end-to-end pipeline proven on product #180:
- Intake → Image Gen → Visual Approval → /confirm Wizard → Content Gen → Audit → Activation → Homepage
- All gates enforced: /confirm blocked pre-approval, /content blocked pre-approval
- Confirmation wizard: category buttons, productType buttons, sizes multi-select, stock manual, brand text, targets multi-select, summary+confirm
- Content: commerce+discovery packs generated at 100% confidence
- Audit: approved_with_warning, all 3 dimensions pass
- Activation: status=active, Yeni badge, homepage visible
- 11 bot events across full lifecycle

### Priority 1: Operator Visual Approval of 53 Preview Products
VF-7 normalized the backlog. 53 products now have vis=preview (images generated, awaiting operator approval). 5 products already vis=approved and ready for /confirm. 34 products have no image gen yet (vis=pending).
Operator action: review preview images for the 53 products and approve/reject via Telegram buttons.

### Priority 2: Homepage Size Display Fix
Homepage JSON shows default size range [38-45] instead of actual DB variants.
Pre-existing storefront rendering issue — not a VF regression.
Investigate `page.tsx` or product serialization logic.

### ~~Blocker 3: Media Storage~~ — RESOLVED (2026-04-05)
`BLOB_READ_WRITE_TOKEN` was set in Vercel since Mar 10. Vercel Blob storage operational — files uploaded and publicly accessible. Payload `/api/media/file/` static handler proxies from Blob correctly (HTTP 200). Previous 404 was a transient cold-start issue.

### ~~Blocker 4: Instagram/Facebook Dispatch~~ — RESOLVED (2026-04-05, Phase 20A)
Root causes found and fixed:
- **P20-1 RESOLVED**: Facebook Page was DEACTIVATED in Meta Business Suite — re-activated. Instagram userId `17841443128892405` confirmed valid (uygunayakkabi_34). All env vars were present.
- **P20-2 RESOLVED**: Code bug — afterChange hook passed `doc` at depth=0, so images[].image was bare ID (686) not populated object. extractMediaUrls() returned empty array → direct API paths skipped. Fixed with `findByID({ depth: 1 })` before dispatch (commit ca4ccad).
- **P20-3 RESOLVED**: Manual API verification — Instagram container+publish and Facebook page photo post both succeeded on product #180.

### Step 21b — Shopier Stock Decrement on Order
1. On `order.created` webhook: decrement `products.stockQuantity`
2. Create `InventoryLog` entry with reason `shopier_order`
3. Optional: Telegram notification to ops group

---

## 🔜 NEXT — After Current Sprint

### Instagram Carousel Posts
- When `mediaUrls.length > 1`, publish all images as carousel
- Graph API: create child containers → `media_type=CAROUSEL` + `children[]`
- Update `publishInstagramDirectly()` in `channelDispatch.ts`

### Token Expiry Monitoring
- Instagram long-lived token expires ~2026-05-20
- Options: implement n8n scheduled refresh OR switch to System User token (no expiry)
- Manual fallback: visit `https://uygunayakkabi.com/api/auth/instagram/initiate`

### Phase 4 — Story Pipeline Wiring: Remaining Items
- ✅ Wire dispatchStory() into Products afterChange hook (non-blocking) — D-105
- ✅ Telegram Story operator commands: `/story`, `/restory`, `/targets`, `/approve_story`, `/reject_story` — D-105
- ✅ Story approval flow via Telegram inline keyboards (approve/reject/retry callbacks) — D-105
- Story asset transformation (portrait crop/resize for story format) — DEFERRED
- Story scheduled publishing (scheduledFor field) — DEFERRED
- DB migration: create story_jobs table + products story columns + storyTargets array in Neon — REQUIRED BEFORE PRODUCTION USE

### Phase 7 — Geobot AI Runtime: Completed + Remaining
- ✅ Content schema + state model — D-107
- ✅ Auto-trigger after confirmation — D-107
- ✅ BotEvent flow — D-107/D-108
- ✅ Geobot AI runtime (Gemini 2.5 Flash) — real commerce + discovery generation — D-108
- ✅ Auto-create BlogPost from discovery pack — draft with SEO fields — D-108
- ✅ Truthful state transitions (partial success, graceful GEMINI_API_KEY absence) — D-108

### Phase 8 — Mentix Audit + Content Review (Builds on D-108) — PARTIALLY DONE (D-109)
- ✅ Mentix audit layer: auditStatus flow for content quality before publish — D-109
- ✅ 4-dimension audit (visual, commerce, discovery, overall) with auto-trigger — D-109
- ✅ /audit Telegram command: show status + force run — D-109
- ✅ BotEvents: audit.requested/started/approved/needs_revision/failed — D-109
- Telegram content preview: operator can view generated content inline — DEFERRED
- Content approval/rejection inline keyboards — DEFERRED
- Content regeneration: retry individual packs — DEFERRED
- workflowStatus progression: content_ready → audit_pending → approved → publish_ready — ✅ IMPLEMENTED
- Publish-ready automation: after audit approval, product eligible for autonomous publish — ✅ approvedForPublish flag
- DB migration: create auditResult columns + content group columns + blog linkage in products table in Neon — REQUIRED BEFORE PRODUCTION USE

### Merchandising Integration (Builds on D-102 Schema + D-103 Logic + D-110 Stock Autonomy)
- ✅ Merchandising helper library: `src/lib/merchandising.ts` (D-103 — DONE)
- ✅ Soldout automation: stockState → soldout flow via stockReaction.ts (D-110 — DONE)
- ✅ Merchandising exclusion: soldout products excluded via isHomepageEligible() (D-103 + D-110 — DONE)
- Homepage API route: call `resolveHomepageSections()` with real Payload data
- Storefront UI: render Yeni / Popüler / Çok Satanlar / Fırsatlar / İndirimli sections
- Merchandising sync cron: periodic job to update bestSellerScore on products from order data
- Telegram merchandising commands: `#yeni`, `#populer`, `#deal` etc.
- BotEvents orchestration: event-driven workflow transitions
- Mentix audit integration: auditStatus flow via BotEvents
- DB migration: manually create new columns/tables in Neon production after deploy

### Phase 10 — Homepage + Order + Stock Recovery (D-111) — DONE
- ✅ Homepage integration: page.tsx uses isHomepageEligible() + resolveHomepageSections() server-side
- ✅ Admin stock edit hook: Variants.ts afterChange triggers reactToStockChange
- ✅ Orders afterChange: auto-decrements stock on non-Shopier order creation
- ✅ Refund stock restoration: Shopier webhook restores stock on order cancellation
- ✅ Low-stock Telegram alerts: sendStockAlertToTelegram on soldout/restock/low_stock

### Phase 11 — Homepage Merchandising UI + Telegram Merch Commands (D-112) — DONE
- ✅ Server → client section data: page.tsx builds sectionIds, passes as prop to App
- ✅ UygunApp renders 5 real merchandising sections with client-side fallbacks
- ✅ /merch preview: section summaries with product counts and names
- ✅ /merch status: per-product merchandising state and section membership
- ✅ /merch popular/deal/bestseller commands: operator control of merchandising fields

### Phase 12 — Final Publish Autonomy + Orchestration Polish (D-113) — DONE
- ✅ Central publish readiness evaluation: `src/lib/publishReadiness.ts` with 6-dimension check
- ✅ Readiness wired into mentixAudit: workflowStatus='publish_ready' only when ALL dimensions pass
- ✅ /pipeline Telegram command: full 10-stage lifecycle view + readiness + coherence check
- ✅ State coherence validation: detectStateIncoherence() catches contradictory states
- ✅ product.publish_ready BotEvent emitted when fully ready

### Phase 13 — Production Hardening + Migration Pack (D-114) — DONE
- ✅ MIGRATION_NOTES.md: 14 collections, 3 globals, 80+ Products columns, SQL DDL, migration order
- ✅ DEPLOY_CHECKLIST.md: 43+ env vars, deploy sequence, security, post-deploy validation
- ✅ SMOKE_TESTS.md: 15 test scenarios + 12-step e2e plan
- ✅ PRODUCTION_TRUTH_MATRIX.md: honest status of every subsystem
- ✅ /diagnostics Telegram command: DB, env, events, orders, products, runtime

### Phase 13 Prep — Production Hardening Execution (D-115) — DONE
- ✅ Hardcoded secret cleanup: generate-api-key/route.ts migrated to GENERATE_API_KEY_SECRET env var
- ✅ .env.example rewrite: 7 missing vars added, 3 stale vars removed, classified sections
- ✅ MIGRATION_NOTES.md: exact DDL capture procedure (5-step)
- ✅ DEPLOY_CHECKLIST.md + PRODUCTION_TRUTH_MATRIX.md: updated with D-115 status
- ✅ No production mutations — prep only

### Phase 14 — Next Steps (Builds on D-114/D-115)
- Deploy Phases 1-13 to production with proper Neon migration
- Run smoke test plan and validate all subsystems
- Shopier stock sync-back: poll Shopier inventory → update local stock
- Merchandising sync cron: periodic bestSellerScore recalculation from order data
- Website checkout/cart/payment integration (PayTR or equivalent)
- Auto-publish operator approval flow: publish_ready → operator confirms → activate

### D-056–D-059 Duplicate ID Cleanup
- DECISIONS.md has two definitions each for D-056, D-057, D-058, D-059
- Later definitions take precedence by file position (low operational risk)
- Needs a renumbering pass when time permits

---

## 📋 LATER — Planned but Not Scheduled

### Phase 2B Remaining Channels

**Dolap Integration:**
- Research Dolap API availability (no public docs found yet)
- Stub workflow exists: `n8n-workflows/stubs/channel-dolap.json`
- `publishDolap` toggle already scaffolded

**X (Twitter) Integration:**
- Scaffold complete (SupportedChannel, env var, toggle, OAuth callback, n8n stub)
- Real integration needs: X API v2 POST /2/tweets + OAuth 2.0 PKCE
- Token refresh: access ~2hr, refresh ~6mo

**LinkedIn Integration:**
- Scaffold complete (same as X)
- Real integration needs: LinkedIn Marketing API POST /rest/posts
- Decide: personal vs organization page posting

**Threads Integration:**
- Scaffold complete (same as X)
- Real integration needs: Threads API /{user_id}/threads
- Reuses same Meta App as Instagram

### Phase 2C — Content Growth Layer

**AI SEO Blog Engine:**
- BlogPosts collection scaffolded (2026-03-15)
- Needs: n8n workflow or direct generation from Payload
- Needs: `/blog` + `/blog/[slug]` frontend routes
- Needs: SEO meta tags, internal linking to product pages

### Phase 3 — Visual & Experience

**Visual Expansion Engine:**
- AI-generated additional product angles (2-4 per product)
- Needs: provider selection (EachLabs? Stability AI? Custom?)
- Needs: media type tracking (original / enhanced / generated_angle)

**Photo-Based AI Try-On (D-093):**
- Product page widget: "Kendi fotoğrafında dene"
- UX layer only — no data model changes needed
- Needs: provider selection + privacy (auto-delete user photos)

---

## 🚫 BLOCKED — Waiting on External

### Dolap API Research
- **Blocked on**: finding official API documentation or seller integration
- Cannot proceed without confirmed API access

### Mentix Level B Skills Activation
- **Blocked on**: Level A skills being ops-tested first (see NOW section)
- Skills waiting: eachlabs-image-edit, upload-post, research-cog, senior-backend

### Learning Engine (Mentix)
- **Blocked on**: 7+ days of Level A operation data
- Observe-only mode, then weekly reports + golden case regression (GC-001, GC-002, GC-003)

---

## ⏳ WAITING FOR INPUT — Operator Actions

### VPS / n8n Operator Actions
- [ ] Deploy 12 Mentix skill files to VPS: `scp -r mentix-skills/* furkan@VPS:/home/furkan/.openclaw/skills/`
- [ ] Deploy mentix-memory/ system to VPS
- [ ] Add `DATABASE_URI` + `GITHUB_TOKEN` to OpenClaw Docker env
- [ ] Restart OpenClaw and verify skill recognition
- [ ] Test Level A skills individually via Telegram

### Deferred Cleanup (Non-Blocking)
- [ ] Add favicon.ico to `src/app/`
- [ ] Re-implement admin dark mode without `!important` overrides
- [ ] Switch `push: true` to Payload migrations (recommended before Phase 3)
- [ ] Promote `publishResult.instagramPostId` to `sourceMeta.externalSyncId` field

---

## ✅ COMPLETED — Reference Only

<details>
<summary>Phase 1 — Core Admin + Storefront (2026-03-10 → 2026-03-13) ✅</summary>

All Phase 1 production validation tasks passed. See PROJECT_STATE.md Phase 1 Completion Record.
Infrastructure, collections, schema, storefront — all validated in production.
</details>

<details>
<summary>Phase 2A — Steps 1-15 (2026-03-15 → 2026-03-16) ✅</summary>

- Step 1: Security rotation
- Step 2: Persistent Docker network fix
- Step 3: Telegram group access policy
- Step 4: OpenClaw → n8n intake webhook
- Step 5: n8n → Payload draft product creation
- Step 6: Media pipeline (Telegram → Vercel Blob → Payload)
- Step 7: Duplicate protection / idempotency
- Step 8: Admin review / approval flow (SourceBadge, StatusCell, ReviewPanel)
- Step 9: Inventory / variant readiness (stockQuantity, color, TG-SKU)
- Step 10: Publishing flow / commerce activation (draft → active guard)
- Step 11: Caption parser enhancement (Turkish/English, confidence, warnings)
- Step 12: Automation settings / global toggle layer
- Step 13: Channel adapter scaffolding (channelDispatch.ts)
- Step 14: Channel workflow stubs + admin dispatch visibility
- Step 15: E2E verification pass + media URL hardening
</details>

<details>
<summary>Steps 16-20 (2026-03-18 → 2026-03-23) ✅</summary>

- Step 16: First real channel integration (n8n Instagram Graph API workflow)
- Step 17: Instagram token exchange + hardening (OAuth flow)
- Step 18: Instagram direct publish from Payload (n8n bypassed — D-088)
- Step 19: Facebook direct publish from Payload (Graph API — D-089)
- Step 20: Shopier integration (REST API v1, webhook HMAC, jobs queue, GitHub Actions cron)
</details>

<details>
<summary>Mentix Intelligence Layer — v1 + v2 Design ✅</summary>

- 13 skills designed and created (7 Level A + 4 Level B + 1 Level C + mentix-intake)
- mentix-memory/ 12-layer directory system
- Decision policy, write policy, publish policy, memory policy, skill gating policy
- 6 runbooks, 3 golden cases, trace schema
- Dashboard v2 (7-tab HTML)
- Governance: SYSTEM_PROMPT.md + MENTIX_SYSTEM_PROMPT.md
</details>

<details>
<summary>Phase 1–5 Schema + Merchandising + Story Pipeline + Confirmation Wizard (2026-04-03 → 2026-04-04) ✅</summary>

- Phase 1 (D-102): Workflow + merchandising fields on Products, HomepageMerchandisingSettings global, BotEvents collection
- Phase 2 (D-103): Merchandising logic library — 5 homepage sections, bestseller scoring, new window, membership resolution
- Phase 3 (D-104): Story pipeline foundation — StoryJobs collection, storySettings, storyTargets, storyDispatch, storyTargets libs
- Phase 4 (D-105): Story pipeline wiring — afterChange hook trigger, Telegram operator commands, approval keyboards, no-fake-publish rule
- Phase 5 (D-106): Product confirmation wizard — `/confirm` command, guided field collection, inline keyboards, BotEvent emission
- Phase 6 (D-107): Geobot content pack foundation — content schema, contentPack.ts helpers, auto-trigger after confirmation, `/content` command
- Phase 7 (D-108): Geobot AI runtime wiring — real Gemini generation, commerce+discovery packs, BlogPost auto-creation, truthful states
- Phase 8 (D-109): Mentix audit + content review — 4-dimension audit runtime, auto-trigger after content.ready, `/audit` command, BotEvents
- Phase 9 (D-110): Order/stock/soldout autonomy — central stockReaction.ts, Shopier/Telegram integration, BotEvents, `/stok` command
- Phase 10 (D-111): Homepage + order + stock recovery — merchandising server-side filtering, Variants/Orders afterChange hooks, refund restoration, low-stock alerts
- Phase 11 (D-112): Homepage merchandising UI + Telegram merch commands — UygunApp renders 5 real sections from server data, /merch operator commands for popular/deal/bestseller control
- Phase 12 (D-113): Final publish autonomy + orchestration polish — central readiness evaluation (6 dimensions), /pipeline command, state coherence validation, readiness wired into audit flow
- Phase 13 (D-114): Production hardening + migration pack — MIGRATION_NOTES.md, DEPLOY_CHECKLIST.md, SMOKE_TESTS.md, PRODUCTION_TRUTH_MATRIX.md, /diagnostics command
</details>

<details>
<summary>Channel Scaffolds ✅</summary>

- X (Twitter): scaffold + OAuth callback + n8n stub
- Facebook Page: scaffold + n8n stub (real integration live via Step 19)
- LinkedIn: scaffold + OAuth callback + n8n stub
- Threads: scaffold + n8n stub
</details>

<details>
<summary>Image Pipeline v39 — Visual Standard Reset (2026-04-07) ✅</summary>

- Background hex map shifted from near-white (~95%) to visibly colored (~78%)
- Brightness normalization band shifted darker (70-120, mid 95)
- QC brightness thresholds tightened (mean>185, highlight>25%)
- Slot 3 rebuilt: back_hero → close_shot_hero (3/4 front close hero)
- TASK_FRAMING_BLOCK updated: darker/richer visual emphasis
- Decision: D-125
</details>

<details>
<summary>Resolved Blockers ✅</summary>

- Blocker 1: Instagram credentials → OAuth completed (2026-03-22)
- Blocker 2: Mentix VPS deployment → resolved (2026-03-17)
- Blocker 3: Git push pending → resolved (2026-03-17)
- Blocker 4: Product save 500 (products_channel_targets) → id column fixed to SERIAL (2026-03-17)
- Blocker 5: Instagram publish error 100/33 → direct publish bypass (2026-03-22)
</details>

---

## IMAGE GENERATION — FROZEN (2026-04-07)

**Status:** BASELINE LOCKED — D-129

The image generation pipeline is frozen at v50 (commit e99e9cb). All components listed below are NOT to be modified without explicit operator approval:

### Frozen Items
- [ ] ~~Image pipeline slot prompts~~ — LOCKED
- [ ] ~~Background color mappings~~ — LOCKED
- [ ] ~~Anti-frame instructions~~ — LOCKED
- [ ] ~~Input image padding logic~~ — LOCKED
- [ ] ~~SN overlay (bitmap pixel font)~~ — LOCKED
- [ ] ~~QC checks (color/brand/shot)~~ — LOCKED
- [ ] ~~Visual quality parameters~~ — LOCKED

### Requires Explicit Operator Approval To Change
Any modification to `src/lib/imageProviders.ts` or `src/jobs/imageGenTask.ts` that affects:
- Slot ordering or slot prompt text
- Background color hex values or color-to-backdrop logic
- Anti-frame prompt blocks
- Input image resize/padding behavior
- Stock number overlay rendering
- Brightness, sharpness, contrast, or any visual post-processing
- QC check thresholds or pass/fail logic

### What CAN Still Be Changed (without image-gen approval)
- Telegram command handling (non-prompt logic)
- Product data flow / job orchestration (non-visual)
- New features unrelated to image generation
- Bug fixes that don't alter visual output

