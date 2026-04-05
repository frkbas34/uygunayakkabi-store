# TASK QUEUE — Uygunayakkabi

_Last updated: 2026-04-05 (Phase 17 Activation D-116; Phase 16 Bot Validation D-116; Phase 13 Prep — D-115; Phase 13 D-114; Phase 12 D-113; Phase 11 D-112; Phase 10 D-111; Phases 1-9 complete)_

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

### Blocker 2: No AI Image Gen Job Proven End-to-End — CRITICAL
No AI image generation job (Gemini, OpenAI, Luma) has produced a confirmed successful result in production. Step 25 has been deployed through multiple iterations but the operator has never confirmed "this works, images match the product."

---

## 🟢 NOW — Current Sprint (HARD RESET RECOVERY PASS — 2026-04-01)

### Priority 1: Prove Claid.ai End-to-End (FIRST RECOVERY TARGET)
Claid is the simplest provider: 1 API call, no generative uncertainty, deterministic output.
`CLAID_API_KEY` is confirmed set in Vercel.

**Test procedure:**
1. Find a product ID in Telegram that has an original photo attached
2. Send `#claid {productId}` to the Telegram bot
3. Select `🧹 Ürün Temizleme` (cleanup mode) from the keyboard
4. Wait for Claid result photo to appear in Telegram
5. Click `✅ Ürüne Ekle` to approve
6. Verify the image appears in the product's `generativeGallery` in Payload admin

**Success criteria:**
- Bot replies with mode selection keyboard → ✓
- Photo received in Telegram with approval keyboard → ✓
- Approval stores image in `generativeGallery` → ✓

**Failure investigation:**
- No keyboard → check `#claid` trigger regex and callback routing
- No photo → check Vercel logs for `[claidTask]` entries; check `CLAID_API_KEY` in env
- HTTP error from Claid → check response body in Vercel logs

### Priority 2: Gemini Image Gen Diagnosis (AFTER Claid proven)
Current state: `#gorsel` → Gemini Pro → `gemini-2.0-flash-preview-image-generation`
Key unknown: does this model actually accept `inlineData` reference images?
D-100 tested older models and found them all text-to-image only. This model was not in D-100's test list.

**Diagnosis test:**
1. Send `#gorsel {productId}` to Telegram
2. Check Vercel logs for `[GeminiImageGenerate]` entries
3. Look for: model name, HTTP status, finishReason, presence of image part
4. If HTTP 404 → model not available, need different model ID
5. If HTTP 200 but wrong product → model ignores inlineData, need text-only approach
6. If HTTP 200 and correct product → SUCCESS, document in DECISIONS.md

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
<summary>Resolved Blockers ✅</summary>

- Blocker 1: Instagram credentials → OAuth completed (2026-03-22)
- Blocker 2: Mentix VPS deployment → resolved (2026-03-17)
- Blocker 3: Git push pending → resolved (2026-03-17)
- Blocker 4: Product save 500 (products_channel_targets) → id column fixed to SERIAL (2026-03-17)
- Blocker 5: Instagram publish error 100/33 → direct publish bypass (2026-03-22)
</details>
