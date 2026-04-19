# TASK QUEUE — Uygunayakkabi

_Last updated: 2026-04-19 (Memory cleanup — de-scoped/blocked channels marked, cleanup focus added)_

---

## ✅ Recently Closed (2026-04-11)

- **D-166 — Wizard session silent-drop fixed.** Operator saw "Fiyat
  girin" prompt, replied "899", got no reply. Root cause: `setWizardSession`
  and `clearWizardSession` used fire-and-forget DB writes that Vercel
  could kill when the Lambda froze on `NextResponse.json` return. Next
  request hit a cold instance, hydrate found no row, text interceptor
  skipped the wizard block, request fell through silently. Fix: made
  persist/delete awaitable, added `await` to all 36 set/clearWizardSession
  callsites in route.ts, added a defensive fallback that sends
  "Aktif sihirbaz oturumu bulunamadı" when wizSession is null and text
  looks like a wizard input (price number, size list, size range).
  Commit `81a533b`. Verification: live /confirm → price → "899" test
  after deploy.
- **D-165 — Category defaultValue removed.** Fresh Telegram products
  were being born with `category: 'Günlük'` (Payload defaultValue) and
  the wizard silently skipped the category step. Removed the defaultValue
  from `src/collections/Products.ts`; wizard now asks category as
  intended. Commit `948c839`. **Protected rule 2a** recorded in
  PROJECT_STATE.md — no Payload defaultValue on business-choice fields
  that the wizard treats as "missing".
- **D-164 — Padding rolled back to v50 baseline.** D-157/D-161's
  edge-sampled padding was producing visible frames (taupe on SN0151,
  white on SN0153). Restored `paddingRGB = bgRGB` in both
  `generateByEditing` and `generateByGeminiPro`. Commit `c2b402a`.
  **Protected rule 4** recorded in PROJECT_STATE.md — padding must
  equal scene target color. Cross-slot background drift flagged as
  a separate PROPOSED item (possible D-166 after live SN0153 re-test).
- **D-162 — GeoBot premature trigger reverted.** Image-approval
  auto-trigger (D-159/D-160) was producing low-quality copy against
  placeholder "Taslak Ürün …" titles. Reverted on commit `d5f3e7c`.
  GeoBot now fires only from `applyConfirmation` after wizard confirm.
  **Protected rule** recorded in PROJECT_STATE.md — do not reintroduce
  any `auto_visual_approved` trigger.
- **D-163 — Wizard step reorder.** Commerce fields (category,
  productType, price, sizes, stock) now precede label fields
  (stockCode, title) in `getNextWizardStep`. Commit `69b801c`.
  **Protected rule** recorded in PROJECT_STATE.md — do not reorder
  label fields back to the top without an explicit operator decision.

---

## ⚠️ Active Blockers

### Blocker 0: push:true Does NOT Run in Production — ONGOING RISK
`push: true` is guarded by `NODE_ENV !== 'production'` in `@payloadcms/db-postgres/dist/connect.js`.
**All schema changes on Neon MUST be applied manually via SQL.**
Before adding any new collection/global: manually verify the new table + `payload_locked_documents_rels` column exist in Neon after deploy.

### Blocker 1: Workspace Folder Out of Sync with Remote — RESOLVED (Phase 14)
Resolved 2026-04-04. Phase 14 used a clean shallow clone at `/tmp/fix-nullbytes` to bypass the diverged workspace and phantom `index.lock` issue. All commits (9f69443 null byte fix, fb46b2a TS fixes) were pushed to remote main from the clean clone. Production Vercel deployment (EXFoRu3Tn) built successfully from commit fb46b2a.
**Remaining:** The workspace mount still has a dirty `tsconfig.json` and phantom `index.lock`. Operator should run `git checkout -- tsconfig.json` from Windows terminal to clean up.

### Blocker 2: No AI Image Gen Job Proven End-to-End — CRITICAL
No AI image generation job (Gemini, OpenAI, Luma) has produced a confirmed successful result in production. Step 25 has been deployed through multiple iterations but the operator has never confirmed "this works, images match the product."

---

## 🟢 NOW — Current Sprint (CLEANUP + ONE-PRODUCT PIPELINE VALIDATION — 2026-04-19)

Phase 14 (deploy + migration) and Phase 15 (smoke test + truth matrix) are COMPLETE.
Core platform is PROD-VALIDATED. 30 subsystems are DEPLOYED but await first operator interaction.
**Current focus: project memory cleanup + one-product full pipeline validation. No new feature expansion until pipeline is proven end-to-end.**

### Priority 1: Run Full Pipeline on One Product (OPERATOR ACTION)
Execute the 12-step end-to-end test from SMOKE_TESTS.md on a single product:
1. Send photo with caption → verify product created
2. `#gorsel <id>` → verify image generation attempt (may fail — Blocker 2)
3. `/confirm <id>` → complete wizard → verify confirmed
4. `/content <id> trigger` → verify Geobot content generation
5. `/audit` → verify auto-triggered audit
6. `/pipeline <id>` → verify full lifecycle view
7. `/merch popular add <id>` → verify merchandising flag
8. Set status=active in admin → verify channel dispatch
9. Visit homepage → verify product in sections
10. Update stock via Telegram → verify state machine
11. Decrement to 0 → verify soldout exclusion
12. Restock → verify restock transition

**Success criteria:** Each step transitions product to the next pipeline stage.
**Failure investigation:** Check Vercel function logs for errors at each step.

### Priority 2: Prove AI Image Gen End-to-End (Blocker 2)
No AI image generation job has produced a confirmed success. Two paths to test:
- `#gorsel <productId>` — Gemini image gen (112 jobs exist, 0 successes)
- `#claid <productId>` — Claid.ai product enhancement (never tested)

### Priority 3: Confirm /confirm Wizard Works in Production
All 95 products show `confirmationStatus='pending'`. Run `/confirm` on one product to validate the full wizard flow end-to-end.

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

### Phase 16 — Next Steps (Builds on Phase 14+15 Deploy)
- ✅ Deploy Phases 1-13 to production with proper Neon migration — DONE (Phase 14)
- ✅ Run smoke test plan and validate all subsystems — DONE (Phase 15, partial — core validated, operator commands await interaction)
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

**X (Twitter) Integration:** ✅ LIVE (D-195c, prod-validated 2026-04-14)
- OAuth 1.0a direct publish from Payload

**Dolap Integration:** DE-SCOPED
- No public Dolap API documentation found. Scaffold-only code exists (`n8n-workflows/stubs/channel-dolap.json`, `publishDolap` toggle).
- Reactivation requires a new operator decision + confirmed API access.

**LinkedIn Integration:** DE-SCOPED
- Scaffold + OAuth callback exists, no post implementation.
- Reactivation requires a new operator decision.

**Threads Integration:**
- Scaffold complete. Real integration needs: Threads API /{user_id}/threads. Reuses same Meta App as Instagram.
- Low priority — not on active roadmap.

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

### Telegram Stories Publishing — BLOCKED_OFFICIALLY
- **Blocked by**: Telegram Bot API does not support story publishing
- StoryJobs collection and dispatch code exist but cannot publish. No workaround.
- Unblocks when/if Telegram adds story support to the Bot API.

### WhatsApp Status Publishing — BLOCKED_OFFICIALLY
- **Blocked by**: official WhatsApp Business API does not support status/story publishing
- Marked `blocked_officially` in `src/lib/storyTargets.ts`. No workaround.

### Dolap API Research — DE-SCOPED
- **Blocked on**: finding official API documentation or seller integration
- No public API found. Scaffold-only code exists. De-scoped until reactivated by operator decision.

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
<summary>Phase 13 Prep — Production Hardening Execution (D-115, 2026-04-04) ✅</summary>

- Hardcoded secret cleanup: generate-api-key/route.ts migrated to GENERATE_API_KEY_SECRET env var
- .env.example rewrite: 7 missing vars added, 3 stale vars removed, classified sections
- MIGRATION_NOTES.md: exact DDL capture procedure (5-step)
- DEPLOY_CHECKLIST.md + PRODUCTION_TRUTH_MATRIX.md updated
</details>

<details>
<summary>Phase 14 — Deploy Validation + Neon Migration (2026-04-04) ✅</summary>

- Fixed 3 build errors: null bytes in telegram/route.ts, sectionIds scope in page.tsx, storyTargets TS2339 in Products.ts
- Pushed fixes in 2 commits: 9f69443 (null bytes), fb46b2a (TS errors)
- Applied 110/110 migration SQL statements to Neon production (35 tables, 120 products columns, 39 enum types)
- Set GENERATE_API_KEY_SECRET in Vercel env vars
- Vercel deployment EXFoRu3Tn built successfully (47s build)
- Production domain www.uygunayakkabi.com responding HTTP 200
</details>

<details>
<summary>Phase 15 — Live Smoke Test + Production Truth Validation (2026-04-04) ✅</summary>

- Validated core platform: storefront, Payload admin, Neon DB, Vercel Blob, deployment
- Validated security: Telegram webhook 401, Shopier HMAC 401, generate-api-key 405
- Validated merchandising engine: isHomepageEligible() + resolveHomepageSections() working server-side
- Confirmed 95 products (all draft), 459 media, 112 image_generation_jobs, 0 bot_events, 2 orders
- Updated PRODUCTION_TRUTH_MATRIX.md: 27 PROD-VALIDATED, 30 DEPLOYED-NOT-VALIDATED
- Updated PROJECT_STATE.md, DEPLOY_CHECKLIST.md, TASK_QUEUE.md, DECISIONS.md
- Verdict: PRODUCTION USABLE WITH LIMITATIONS
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
