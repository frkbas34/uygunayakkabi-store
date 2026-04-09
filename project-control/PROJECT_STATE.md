# PROJECT STATE — Uygunayakkabi

_Last updated: 2026-04-08 (Phase G Dry-Run Preview — D-135; Phase D Channel Dispatch Geobot Wiring — D-134; Phase C Blog Discoverability — D-133; Image Pipeline v38 Slot 3 Rebuild + Global BG Lock — D-124; Image Pipeline v37 Centering QC Gate + Sharp Bugfix — D-123; Image Pipeline v36 Centering + Brightness — D-122; Image Pipeline v35 Brightness — D-121; v34 BG Lock — D-120; VF-7 Legacy Backlog Normalization — D-117b; VF-6 Visual-First Pipeline E2E Validation — D-117; VF-2–VF-5 Visual-First Pipeline — D-117; Phase 19 External Channel Dispatch Validation — D-116; Phase 18 Stock Lifecycle — D-116; Phase 17 Product Activation — D-116; Phase 16 Telegram Bot E2E — D-116; Phase 13 Prep — D-115; Phase 13 Production Hardening + Migration Pack — D-114; Phase 12 D-113; Phase 11 D-112; Phase 10 D-111; Phase 9 D-110; Phase 8 D-109; Phase 7 D-108; Phase 6 D-107; Phase 5 D-106; Phase 4 D-105; Phase 3 D-104; Phase 2 D-103; Phase 1 D-102)_

## Current Status

**Phase 1 COMPLETE** (2026-03-13) — Storefront, admin panel, and core integrations live.
**Phase 2 Steps 1–19 COMPLETE** (2026-03-22) — Instagram and Facebook direct publishing via Graph API fully operational. Mentix intelligence layer deployed with 13 skills on VPS.
**Step 20 COMPLETE** (2026-03-23) — Shopier marketplace integration fully live. Non-blocking jobs queue pipeline, GitHub Actions 5-min cron, 4 registered webhooks with HMAC verification.
**Step 21 COMPLETE** (2026-03-23) — Shopier order fulfillment flow live. Incoming orders create Payload CMS Order documents. Status updates on fulfilled/refund events. End-to-end verified.
**Steps 22–24 COMPLETE** (2026-03-28) — Full Telegram bot product intake (direct webhook, no OpenClaw/n8n), AI image generation pipeline with Gemini Vision + Gemini Flash image generation. All bugs resolved and verified deployed.
**Step 25 DEPLOYED — NOT YET PROVEN** (2026-04-01) — v18 Gemini-only debug mode active. `#gorsel` → Gemini Pro (model: `gemini-2.0-flash-preview-image-generation`). OpenAI and Luma disabled at route level. NO successful end-to-end image gen job confirmed in production.
**Step 26 DEPLOYED — DISABLED** (2026-04-01) — Luma AI integration code complete (`lumaGenTask`, `lumaApi`, `lumaPrompts`). Route handler for `#luma` deactivated in v18. Can restore from commit `a27b78a`.
**Step 27 DEPLOYED — NOT YET TESTED** (2026-04-01) — Claid.ai product photo enhancement integrated. `#claid {productId}` → 3-mode keyboard → `claid-enhance` job. `CLAID_API_KEY` set in Vercel. No live test performed yet.
**Phase 1 Schema Foundation DEPLOYED** (2026-04-03) — Workflow state fields (10 fields in `workflow` group), merchandising fields (12 fields in `merchandising` group) added to Products. New `HomepageMerchandisingSettings` global and `BotEvents` collection created. Schema-only — no query engine or automation logic yet. D-102.
**Phase 2 Merchandising Logic DEPLOYED** (2026-04-04) — `src/lib/merchandising.ts` created with pure helper functions for all 5 homepage sections (Yeni, Popüler, Çok Satanlar, Fırsatlar, İndirimli). Includes bestseller scoring, new-window calculation, soldout exclusion, and membership resolution with section toggles + limits. Legacy-safe with null fallbacks. D-103.
**Phase 3 Story Pipeline Foundation DEPLOYED** (2026-04-04) — Non-blocking Telegram Story pipeline foundation. Products.storySettings (6 fields), Products.sourceMeta story tracking (8 fields), StoryJobs collection, AutomationSettings.storyTargets array, `src/lib/storyTargets.ts`, `src/lib/storyDispatch.ts`. WhatsApp marked blocked_officially. D-104.
**Phase 4 Story Pipeline Wiring DEPLOYED** (2026-04-04) — Story dispatch wired into Products afterChange hook (non-blocking, after channel dispatch). Telegram operator commands: `/story`, `/restory`, `/targets`, `/approve_story`, `/reject_story`. Inline keyboard callbacks for story approval/reject/retry. CRITICAL: No fake Telegram story publishing — Bot API does not support stories. All statuses truthful (queued, approved, awaiting_approval — never falsely "published"). D-105.
**Phase 5 Product Confirmation Wizard DEPLOYED** (2026-04-04) — Telegram-based product confirmation flow. `/confirm {id}` starts wizard that guides operator through missing fields (category, price, sizes, stock, publish targets). Inline keyboards for category/targets, text input for price/sizes/stock. Structured summary before final confirmation. Sets confirmationStatus=confirmed, productConfirmedAt, lastHandledByBot=uygunops. Emits BotEvent(product.confirmed). D-106.
**Phase 7 Geobot AI Runtime Wiring DEPLOYED** (2026-04-04) — Real AI content generation via Gemini 2.5 Flash. `src/lib/geobotRuntime.ts` generates commerce pack (5 channel-specific copies + highlights) and discovery pack (SEO article, meta, FAQ, keywords, internal links). `triggerContentGeneration()` now calls real AI, writes results to product fields, emits truthful BotEvents (content.commerce_generated, content.discovery_generated, content.ready/failed). Auto-creates draft BlogPost from discovery pack (linked via content.linkedBlogPost). Partial success supported — if one pack fails, the other is preserved. D-108.
**Phase 6 Geobot Content Pack Foundation DEPLOYED** (2026-04-04) — Content schema added to Products: `content.commercePack` (9 fields: websiteDescription, instagramCaption, xPost, facebookCopy, shopierCopy, highlights, confidence, warnings, generatedAt) and `content.discoveryPack` (10 fields: articleTitle, articleBody, metaTitle, metaDescription, faq, keywordEntities, internalLinkTargets, confidence, warnings, generatedAt). Blog linkage via `content.linkedBlogPost`. `src/lib/contentPack.ts` helper library with readiness checks, state transition helpers, BotEvent emission. Auto-trigger after confirmation (non-blocking). `/content {id}` Telegram command. Geobot runtime NOT yet wired — statuses truthful (pending, not fake-generated). D-107.
**Phase 8 Mentix Audit + Content Review DEPLOYED** (2026-04-04) — 4-dimension audit layer for product quality review. `auditResult` group added to Products (9 fields: visualAudit, commerceAudit, discoveryAudit, overallResult, approvedForPublish, warnings, revisionNotes, auditedAt, auditedByBot). `src/lib/mentixAudit.ts` audit runtime with dimension checks (visual, commerce, discovery, overall). Auto-triggered non-blocking after content.ready in contentPack.ts. `/audit {id}` and `/audit {id} run` Telegram commands. BotEvents: audit.requested, audit.started, audit.approved/approved_with_warning/needs_revision/failed. approvedForPublish=true only on approved/approved_with_warning. D-109.
**Phase 10 Homepage + Order + Stock Recovery DEPLOYED** (2026-04-04) — Homepage now uses merchandising engine server-side: `isHomepageEligible()` filters soldout/non-sellable products before reaching client. `resolveHomepageSections()` called for section computation. Variants.ts afterChange hook triggers `reactToStockChange()` on admin stock edits. Orders.ts afterChange hook auto-decrements stock on non-Shopier order creation (website, phone, manual). Shopier refund handler now restores stock on order cancellation (product + variant level). Low-stock/soldout/restock Telegram alerts sent automatically via `sendStockAlertToTelegram()`. D-111.
**Phase 13 Prep — Production Hardening Execution** (2026-04-04) — Hardcoded secret cleanup: `generate-api-key/route.ts` migrated from hardcoded `'uygun-setup-2026-mentix'` to `GENERATE_API_KEY_SECRET` env var with guard. `.env.example` rewritten: 7 missing vars added, 3 stale vars removed, classified sections. MIGRATION_NOTES.md improved with exact DDL capture procedure (5-step). DEPLOY_CHECKLIST.md and PRODUCTION_TRUTH_MATRIX.md updated with D-115 status. No production mutations — prep only. D-115.
**Phase 13 Production Hardening + Migration Pack DEPLOYED** (2026-04-04) — Production readiness documentation layer. MIGRATION_NOTES.md: complete schema inventory (14 collections, 3 globals, 80+ Products columns) with SQL DDL and migration order. DEPLOY_CHECKLIST.md: 43+ env vars classified, deploy sequence, security checklist. SMOKE_TESTS.md: 15 test scenarios + full e2e 12-step plan. PRODUCTION_TRUTH_MATRIX.md: honest status of every subsystem (22 prod-validated, 28 implemented not validated, 2 blocked, 4 scaffolded). `/diagnostics` Telegram command: DB connectivity, env check, event/order/product counts, runtime info. D-114.
**Phase 18 Post-Publish Stock Lifecycle Validation PROD-VALIDATED** (2026-04-05) — Full stock lifecycle validated on product 125: in_stock → low_stock (threshold ≤3) → sold_out → restocked → in_stock. Soldout transition sets status=soldout, sellable=false, workflowStatus=soldout, emits product.soldout BotEvent. Homepage correctly excludes soldout products. Product page stays live with "Tükendi" badge. Restock recovery bugfix: stockReaction.ts workflow spread (`...product.workflow`) included Payload internal fields causing silent update failure — fixed with explicit field enumeration. After fix: restock correctly sets status=active, sellable=true, stockState=in_stock (settled from restocked), emits product.restocked. Homepage re-includes product. Full BotEvent trail: stock.changed (18), product.soldout (1), product.restocked (1). D-116.
**Phase 19 External Channel Dispatch Validation COMPLETED** (2026-04-05) — Full audit of all 7 external channels + website. Website: PROD-VALIDATED (implicit via status=active, homepage visibility confirmed Phase 17-18). Instagram: DEPLOYED NOT VALIDATED — direct Graph API path ready (accessToken valid until 2026-05-21, userId present, N8N webhook also set), but product 125 has channels_publish_instagram=false so never dispatched. Facebook: DEPLOYED NOT VALIDATED — same Meta token, facebookPageId injected from INSTAGRAM_PAGE_ID env var (1040379692491003), but product 125 has channels_publish_facebook=false. Shopier: BLOCKED — global flag disabled + SHOPIER_PAT status unknown. Dolap/X/LinkedIn/Threads: BLOCKED — global flags disabled, no N8N webhooks configured, n8n-only dispatch path. Global AutomationSettings: only website/instagram/facebook enabled. Instagram tokens connected 2026-03-22, expire 2026-05-21. No automated token refresh mechanism. Historical note: Instagram and Facebook were verified working on 2026-03-22 with live posts, but no dispatch has occurred through the current Phase 1-19 pipeline flow. To validate: add instagram/facebook to a product's channelTargets and trigger dispatch. D-116.
**Phase 16 Telegram Bot End-to-End Validation PROD-VALIDATED** (2026-04-05) — Full end-to-end Telegram bot validation. Webhook secret token fixed (missing from registration). 8 missing DB columns added (push:true silent failure on sourceMeta story fields). Telegram 4096 char limit handled with message truncation. Size selector UX: inline keyboard multi-select with 39-45 range, toggle/all/clear/done. /confirm wizard fully validated on products 123, 124, 125. Bugs fixed: (1) sellable=false after confirmation — Variants afterChange hook only fires on update, not create; added explicit reactToStockChange() call in applyConfirmation(). (2) Discovery pack NULL — maxOutputTokens 4096 too low for Turkish SEO article; raised to 8192; added canRetriggerContent() + /content retry command; contentStatus determination now accounts for existing packs on retry. Product 125 fully pipeline-complete: confirmed, content ready (100% confidence both packs), audit approved_with_warning, sellable=true, 6/6 readiness. D-116.
**Phase 17 Product Activation Validation PROD-VALIDATED** (2026-04-05) — Safe product activation via Telegram. /activate command added: validates all 6 publish readiness dimensions, sets status=active, merchandising.publishedAt/newUntil (7-day Yeni window), workflow.workflowStatus=active, publishStatus=published. Triggers afterChange hook for channel dispatch. Product 125 activated: status=active, visible on homepage in Yeni section, product page accessible, all pipeline stages green. First full end-to-end product lifecycle completed: Telegram intake → confirmation → content generation → audit → activation → homepage visibility. D-116.
**VF-7 Legacy Backlog Normalization COMPLETED** (2026-04-05) — Normalized 61 pre-VF-2 products whose visualStatus was inconsistent with their actual image-gen evidence. Three rules applied: (1) 5 products with approved jobs + gallery → vis=approved, wf=visual_ready. (2) 54 products with preview jobs → vis=preview, wf=visual_pending. (3) 2 products (#123, #125) already confirmed pre-VF-2 with original images → retroactive vis=approved. Post-normalization: 0 remaining inconsistencies. Distribution: 8 approved (5 ready for /confirm), 53 preview (need operator visual approval), 34 pending (no image gen yet). D-117b.
**Image Pipeline v34 — Background Lock + Slot Reorder DEPLOYED** (2026-04-07) — Product-level background lock and image standardization. (1) EDITING_SCENES reordered: side_angle now index 0 (primary hero), commerce_front index 1. Standard generation produces: side_angle→commerce_front→detail_closeup. (2) Website + homepage now show generativeGallery images before product.images — AI side-angle becomes hero everywhere. (3) Channel dispatch (Instagram/Facebook/Shopier) prefers generativeGallery[0] as cover. (4) enforceSlotBackground v34: dual-mode detection — corner-only sampling for macro/closeup (fixes edge contamination), edge strips for full-shoe. Contamination guard: if detected bg >120 distance from target, uses direct target-based correction. (5) Batch background consistency check: after all slots generated, measures each buffer's corners vs target and re-enforces if drift >30. (6) Strengthened prompts: "same studio backdrop, camera just moved" framing, explicit common-mistakes list for slot 3. (7) DB hotfix: 3 missing PostgreSQL enum types created for hasMany select join tables (products_story_settings_story_targets, products_channel_targets, story_jobs_targets) — push:true drift incident #4. Commits: f28da2a (slot reorder + generativeGallery on website), 85012a5 (v34 bg lock).
**Phase L — Mention Normalization for Group Command Routing DEPLOYED** (2026-04-08) — Strip bot mentions from group text after gates pass, before command routing. `@Uygunops_bot /preview 180` and `/preview@Uygunops_bot 180` now route correctly. DM text unchanged. D-138.
**Multi-Bot Support — Geo_bot (@Geeeeobot) DEPLOYED + LIVE** (2026-04-08) — Separate Geo_bot shares same webhook handler via `?bot=geo` URL parameter. Per-request token resolution (`getBotToken()` pattern), dynamic BOT_ID/BOT_USERNAME_LC, all 5 helpers updated. Webhook set with secret_token. Geo_bot added to Mentix group. 7 live tests passed: DM commands, group slash/mention/reply activation, plain text silence, cross-bot isolation. D-139.
**Phase R — Command Ownership Split DEPLOYED** (2026-04-09) — Ops Bot and GeoBot now have distinct command surfaces. Ops owns intake/images/confirm/stock, GeoBot owns content/audit/preview/activate/publish/story. Wrong-bot commands get a clear Turkish redirect message. `/pipeline` shared on both. 18 webhook tests passed. D-144.
**Phase P — Group Wizard Session Isolation VERIFIED** (2026-04-09) — Refactored wizard session keying from `chatId`-only to `chatId:userId` for per-operator isolation in group context. `sessionKey()` helper in confirmationWizard.ts, 36 call sites updated in route.ts. In group: each operator gets own wizard (`-5197796539:111` vs `-5197796539:222`). In DM: userId still passed, backward compatible. Phase Q validation: 28/28 unit tests passed + 12 production webhook simulations all 200 OK. D-143.
**Phase O — Group Workflow Parity DEPLOYED** (2026-04-09) — Fixed 3 group activation gate gaps: (1) caption_entities now checked for @mentions in photo captions, (2) #gorsel/#geminipro hashtag triggers pass gate without needing @mention, (3) STOCK SKU: batch commands pass gate. onayla/reddet correctly require reply-to-bot in group. 12 tests passed. D-142.
**Vercel Build Optimization DEPLOYED** (2026-04-09) — `ignoreCommand` in vercel.json skips builds when only non-runtime files changed (project-control, ai-knowledge, docs, mentix-*, n8n-workflows, scripts, media, root .md/.html/.docx). Saves ~40% of wasted builds. Safety: always builds on first deploy, empty diff, or mixed commits. D-141.
**Phase N — Bot Role Separation DEPLOYED** (2026-04-08) — Clean context separation enforced. Geo_bot (@Geeeeobot) = group-only operator bot (DMs redirect to @Uygunops_bot). Uygunops (@Uygunops_bot) = DM-only operator bot (group messages silently ignored). Both bots share full command surface but each only operates in its designated context. 8 webhook tests passed. D-140.
**Phase K — @Mention + Reply-to-Bot Group Activation DEPLOYED** (2026-04-08) — Extended group activation filter to allow @Uygunops_bot mentions and reply-to-bot messages in addition to slash commands. All three triggers require allowlisting. Plain text, photos, and unauthorized users still silently ignored. Live-validated with 7 webhook scenarios. D-137.
**Phase I — Mentix Group Onboarding DEPLOYED** (2026-04-08) — Added two safety gates for Telegram group/supergroup chats: (1) command-only filter — only `/commands` processed, photos/text/wizard input silently ignored; (2) group allowlisting — checks `telegram.groupEnabled` and `telegram.allowedUserIds` from AutomationSettings, fail-closed. Private DM behavior unchanged. Neon DB updated: group mode enabled, Furkan (5450039553) in allowlist. D-136.
**Phase G — Dry-Run Preview Mode DEPLOYED** (2026-04-08) — Safe preview/dry-run mode for direct-publish channels. `previewDispatch` checkbox in sourceMeta, used alongside `forceRedispatch`. Runs full dispatch pipeline including Geobot caption selection but skips all external APIs. Results in `dispatchNotes` with `mode: "preview"`, caption text, source attribution (geobot vs fallback). Telegram operator notification with formatted preview. D-135.
**Phase D — Channel Dispatch Geobot Wiring DEPLOYED** (2026-04-08) — Wired Geobot commerce pack content into all channel dispatch paths. `ChannelDispatchPayload` extended with `geobot` field containing 6 commerce pack fields. `buildDispatchPayload()` extracts `product.content.commercePack` into payload. Direct publish paths patched: Instagram prefers `geobot.instagramCaption`, Facebook prefers `geobot.facebookCopy`, Shopier prefers `geobot.shopierCopy`. All n8n webhook payloads now include `geobot` for downstream `xPost`/`linkedinCopy` usage. Graceful fallback to existing logic when Geobot content absent. D-134.
**Phase C — Blog Discoverability DEPLOYED + VERIFIED** (2026-04-08) — Blog link added to storefront navigation (desktop + mobile) and footer. Uses `<a href="/blog">` since blog is server-rendered, not part of SPA. Verified live in production. D-133.
**Image Pipeline v38 — Slot 3 Rebuild + Global Background Lock DEPLOYED** (2026-04-07) — Replaced unstable `detail_closeup` macro slot with production-stable `back_hero` (3/4 rear hero: camera 30-45° behind shoe, heel counter dominant, full shoe visible). Removed all macro-specific code paths: corner-only bg sampling, tighter enforcement thresholds, centering skip. New slot 3 gets full post-processing pipeline including centering QC (12% threshold). Formalized global background-lock in TASK_FRAMING_BLOCK: slot 1 is background-family source, slots 2-5 must match exactly. Removed macro/editorial/lifestyle background exceptions. Unified bg enforcement thresholds (90/50 for all slots). No-frame rule verified hardened at prompt + QC + post-processing levels. Zero type errors. D-124.
**Image Pipeline v37 — Centering QC Hard Gate + Sharp Chaining Bugfix DEPLOYED** (2026-04-07) — Fixed critical Sharp library chaining bug where `.extract().extend().resize()` computed resize from post-extract dims instead of post-extend dims, silently undoing v36 centering corrections. Fix: split into two separate Sharp instances. Added `measureCentering()` QC function and centering retry loop (up to 3 cycles) for hero slots (side_angle, commerce_front). Threshold: 12% offset on either axis. V37 verification (Product #194, Job #171): both hero slots pass centering QC on first cycle with 0% offset. No batch BG re-enforcement triggered. Post-download pixel analysis confirmed 0% offset when SKU overlay region excluded. Commit: cd02c19. D-123.
**Image Pipeline v36 — Deterministic Centering + Tighter Brightness DEPLOYED** (2026-04-07) — Added unconditional `centerProduct()` post-processing to correct Gemini's systematic lower-right shoe placement. Detects product bounding box via non-bg pixel envelope, measures offset from image center, shifts composition by cropping excess bg + extending opposite side. Skips detail_closeup (macro). Tightened brightness band: TARGET_HIGH 170→145, TARGET_LOW 100→85, TARGET_MID 135→115. Added CENTERING—CRITICAL prompt block. Pipeline order: bg enforcement → frame crop → brightness norm → centering. V36 verification (product #194): brightness PASS (product lum 92-109), centering PARTIAL (function operational but Gemini generation variance limits effectiveness — residual 7-18% offset), no new regressions. Commit: 8c3904d. D-122.
**Image Pipeline v35 — Deterministic Brightness Normalization DEPLOYED** (2026-04-07) — Production brightness consistency fix. (1) Audit confirmed: NO DM/group code divergence — both paths use identical `#gorsel → image-gen → generateByGeminiPro()` pipeline. (2) Root cause of washed-out outputs: v33/v34 brightness enforcement was conditional (only after retry failure), measured whole-image mean (light backgrounds inflated it), and used `sharp.modulate()` which affected background too. (3) New `normalizeBrightness()` function: measures PRODUCT pixel luminance only (excludes bg via color distance), applies selective gamma correction only to product pixels (bg preserved), target band 100-170 product mean lum, soft blend at product/bg boundary. (4) Normalization is now UNCONDITIONAL on every slot (like bg enforcement), running after bg enforcement + frame detection. (5) Tightened QC thresholds: mean > 200 (was 210), highlight > 30% (was 35%). (6) Prompt exposure instructions maintained from v34. Commit: 88c4d5f.
**Phase 20A Instagram/Facebook Dispatch — PROD-VALIDATED** (2026-04-05) — Full automated Instagram + Facebook dispatch validated on product #180. Three root causes found and fixed: (1) Facebook Page "UygunAyakkabı" (ID: 1040379692491003) was DEACTIVATED — re-activated via Meta Business Suite. (2) afterChange hook passed `doc` at depth=0 — images were bare IDs, extractMediaUrls() returned []. FIX: findByID({ depth: 1 }) before dispatch (commit ca4ccad). (3) Missing `automation_settings_story_targets` table in Neon — fetchAutomationSettings() failed silently, returned null, so instagramTokens was undefined and direct API path skipped. FIX: Table created manually via DDL. AUTOMATED DISPATCH RESULT: Instagram postId=18085404884600056 (mode=direct), Facebook postId=122103938528884171 (mode=direct, tokenMode=page-token). dispatchedChannels=["instagram","facebook"]. D-118.
**Phase 21 Operator Runbook — COMPLETED** (2026-04-06) — Comprehensive operator-facing daily SOP created at `project-control/OPERATOR_RUNBOOK.md`. Covers: daily operator flow (morning routine + core pipeline work), command-by-command reference (14 slash commands, 1 hash command, stock batch format, merchandising commands, story commands, system commands), full pipeline stage map with state matrix, automated behavior inventory (8 auto-fire triggers), exception handling for 7 failure scenarios (image gen, content gen, audit, activation, IG/FB dispatch, Shopier, stock), 7 critical warnings (never-skip items including visual approval gate, activation irreversibility, dispatch field protection, Instagram token expiry 2026-05-21, Facebook Page activation requirement, manual DDL requirement), bot responsibilities, daily checklist, and key operational thresholds. Based on verified code inspection of all Telegram handlers and afterChange hooks.
**VF-2 through VF-5: Visual-First Pipeline DEPLOYED + PROD-VALIDATED** (2026-04-05) — Full visual-first enforcement layer. VF-2: visualStatus written truthfully during image-gen lifecycle (pending→generating→preview→approved/rejected) across 9 transition points in route.ts and imageGenTask.ts. VF-3: /confirm gated on visualStatus===approved with per-state operator messages. VF-4: content generation gated on visualStatus===approved for all 3 paths (auto-trigger, manual, retry). VF-5: confirmation wizard UX polish — productType inline buttons (Erkek/Kadın/Çocuk/Unisex), brand manual text input with find-or-create in brands collection. Wizard step order: category→productType→price→sizes→stock→brand→targets→summary. Bug found during VF-6 validation: brands collection uses `name` field not `title` — fixed in 619c20d. D-117.
**VF-6 Visual-First Pipeline E2E Validation PROD-VALIDATED** (2026-04-05) — Full end-to-end visual-first pipeline validated on product #180 (Job #147). Every pipeline stage tested via live Telegram webhook calls to production. Results: (A) Intake PASS — product created from photo, correct draft/pending state. (B) Image Gen PASS — visualStatus transitions: pending→approved, workflowStatus: draft→visual_ready, 6 generative gallery images attached. (C) Visual Gate PASS — /confirm 180 blocked when visualStatus=pending ("Henüz görsel üretimi yapılmamış"), /content 180 trigger also blocked. (D) Confirmation Wizard PASS — productType button (Erkek), price text (999), sizes multi-select (40-43), stock (3/size), brand text (TestMarka), targets (website+instagram), summary+confirm all worked. 4 variants created, stockQuantity=12, sellable=true. (E) Content Gen PASS — auto-triggered after confirmation, commerce+discovery packs generated at 100% confidence, contentStatus=ready, workflowStatus=content_ready. (F) Audit PASS — approved_with_warning, all 3 dimensions pass (visual/commerce/discovery), approvedForPublish=true, workflowStatus=publish_ready. Minor warnings: no linked blog, meta description too long. (G) Activation PASS — status=active, workflowStatus=active, merchandising dates set, 7-day Yeni window. (H) Homepage PASS — product visible with "Yeni" badge, correct price/image. 11 bot events created across full lifecycle. One bug found+fixed: brand field name mismatch (name vs title). One pre-existing note: homepage size array shows default range instead of DB variants — storefront rendering issue, not VF regression. This validates the visual-first pipeline as the production operating model. D-117.
**Phase 12 Final Publish Autonomy + Orchestration Polish DEPLOYED** (2026-04-04) — Central publish readiness evaluation layer (`src/lib/publishReadiness.ts`) with 6-dimension check (confirmation, visuals, content, audit, sellable, publish targets). Readiness wired into mentixAudit: workflowStatus='publish_ready' only when ALL dimensions pass (not just audit approval). `/pipeline {id}` Telegram command shows full 10-stage lifecycle with readiness breakdown and state coherence check. `detectStateIncoherence()` catches contradictory states (e.g., soldout+sellable, publish_ready without confirmation). BotEvent `product.publish_ready` emitted on full readiness. D-113.
**Phase 11 Homepage Merchandising UI + Telegram Merch Commands DEPLOYED** (2026-04-04) — UygunApp client now renders 5 real merchandising sections (Yeni, Popüler, Çok Satanlar, Fırsatlar, İndirimli) from server-resolved data via `resolveHomepageSections()`. page.tsx builds section ID arrays and passes as `sections` prop. Client-side fallbacks when server data empty. Comprehensive `/merch` Telegram commands: preview (section summaries), status (per-product merchandising state), popular add/remove, deal add/remove, bestseller pin/unpin/exclude/include. All merchandising field updates use existing D-102 schema. D-112.
**Phase 9 Order/Stock/Soldout Autonomy DEPLOYED** (2026-04-04) — Central stock-change reaction logic. `src/lib/stockReaction.ts` computes effective stock from variants, determines state transitions (in_stock/low_stock/sold_out/restocked), updates workflow fields + product.status, emits BotEvents (stock.changed, product.soldout, product.restocked). Wired into Shopier webhook (after stock decrement) and Telegram STOCK command (after variant updates). Merchandising exclusion works via existing `isHomepageEligible()` gates — no changes needed to merchandising.ts. Soldout = visible but not sellable. Restock = automatic re-eligibility. `/stok {id}` Telegram command for stock status. D-110.

---

## What Is Working

### Storefront
- Next.js customer-facing site with Payload CMS integration
- Product catalog fully functional
- Paytr payment integration live
- Image hosting via Cloudinary

### Admin Panel
- Payload CMS editorial interface
- Product creation/editing with media upload
- Dispatch review panel with direct publish controls
- Admin dashboard with analytics

### Automation Pipeline (UPDATED 2026-03-28)
- ~~OpenClaw → n8n → Payload~~ **REPLACED** by direct Telegram webhook
- Telegram photo → `POST /api/telegram` → Payload Media + Product (direct, no VPS dependency)
- `X-Telegram-Bot-Api-Secret-Token` verified on all incoming requests
- Bot privacy mode OFF — receives all group messages including plain photos
- Duplicate guard working
- Admin review step before publish
- `#gorsel` command triggers AI image generation pipeline

### Instagram/Facebook Publishing
- **Instagram Direct Publish** — `src/lib/channelDispatch.ts::publishInstagramDirectly()`
  - Bypasses n8n entirely
  - Creates container + publishes media via Graph API
  - Returns `instagramPostId`, caption with dynamic hashtags
  - Verified live on @uygunayakkabi342026 (2026-03-22)
  - Phase 19: Token valid until 2026-05-21. No auto-refresh. Ready but not dispatched via pipeline yet.

- **Facebook Page Direct Publish** — `src/lib/channelDispatch.ts::publishFacebookDirectly()`
  - Uses Page Access Token (not user token)
  - Posts to UygunAyakkabı page (`1040379692491003`)
  - Verified with facebookPostId `122093848160884171` (2026-03-22)
  - Phase 19: facebookPageId injected from INSTAGRAM_PAGE_ID env var (not in DB). Ready but not dispatched via pipeline yet.

### External Channel Summary (Phase 19 — 2026-04-05)
| Channel | Status | Path | Global Flag | Credentials |
|---------|--------|------|-------------|-------------|
| Website | PROD-VALIDATED | implicit | true | — |
| Instagram | DEPLOYED, NOT VALIDATED | Direct Graph API | true | Token valid (2026-05-21) |
| Facebook | DEPLOYED, NOT VALIDATED | Direct Graph API | true | Shared IG token |
| Shopier | BLOCKED | Jobs Queue | false | Unknown |
| Dolap | BLOCKED | n8n only | false | No webhook |
| X | BLOCKED | n8n only | false | No webhook |
| LinkedIn | BLOCKED | n8n only | false | No webhook |
| Threads | BLOCKED | n8n only | false | No webhook |

### Mentix Intelligence Layer
- **13 skills deployed** on VPS (Hetzner 2-CPU)
- All Mentix skills active and responding
- Ops group created with full mention-trigger capability
- Bahriyar added as 3rd authorized user (security rotation complete)

---

## Collections & Schema

### Products
- Fields: id, title, price, originalPrice, brand, category, color, description, images, dispatchStatus
- Dispatch lifecycle: draft → dispatched (with publishResult metadata)
- Images stored via Cloudinary integration

### Brands & Categories
- Collections exist in schema but **remain empty** — manual population needed
- Will drive product filtering and dynamic hashtag generation

### Dispatch Targets (`products_channel_targets`)
- **Migration 2026-03-17**: `id` column changed from `varchar` to `SERIAL`
- Stores: productId, channelId, dispatchedAt, dispatchNotes, publishResult
- PublishResult schema includes mode (direct/webhook), success flag, and channel-specific IDs

---

## Database (Neon PostgreSQL)

### Current Schema
- `products` — main product catalog
- `products_channel_targets` — dispatch history and results
- `automation_settings` — global config (Instagram tokens, Facebook page ID, etc.)
- `users`, `accounts`, `sessions` — Payload CMS auth

### Migration History
| Date | Migration | Change |
|------|-----------|--------|
| 2026-03-17 | `products_channel_targets` | Converted `id` from `varchar` to `SERIAL` for stability |
| 2026-03-23 | `orders` | Added `shopier_order_id VARCHAR` column |
| 2026-03-23 | `enum_orders_source` | Added `shopier` enum value via `ALTER TYPE ... ADD VALUE` |
| 2026-03-23 | `payload_jobs` | Created manually (push:true unreliable in serverless) |
| 2026-03-23 | `products` | Added 5 `source_meta_shopier_*` columns manually |

### Known Issues
- Brands/Categories collections unpopulated
- Dolap integration stub only; no real API calls executed

---

## Production Environment (Vercel)

### Key Environment Variables
| Variable | Value | Usage |
|----------|-------|-------|
| `NEXT_PUBLIC_CMS_URL` | `https://cms.uygunayakkabi.com` | Payload CMS endpoint |
| `PAYLOAD_SECRET` | Set in Vercel | Encryption for CMS payloads |
| `INSTAGRAM_APP_ID` | `1452165060016519` | Meta OAuth client ID |
| `INSTAGRAM_APP_SECRET` | Set in Vercel | Meta OAuth secret |
| `INSTAGRAM_USER_ID` | `43139245629` | Instagram Business Account ID |
| `INSTAGRAM_PAGE_ID` | `1040379692491003` | **Facebook Page ID** (UygunAyakkabı) — corrected 2026-03-22 |
| `NEXT_PUBLIC_N8N_WEBHOOK_INSTAGRAM` | Set in Vercel | Fallback webhook (not primary path) |
| `NODE_ENV` | `production` | Guards: `push: true` blocks, logging, etc. |

### Step 20 — Shopier Integration (VERIFIED WORKING — 2026-03-23)
| Component | Status |
|-----------|--------|
| `src/lib/shopierApi.ts` | IMPLEMENTED — Shopier REST API v1 client, Bearer JWT auth |
| `src/lib/shopierSync.ts` | IMPLEMENTED — product mapping, jobs queue orchestration |
| `src/app/api/webhooks/shopier/route.ts` | IMPLEMENTED — HMAC-SHA256 multi-token verification |
| `src/app/api/payload-jobs/run/route.ts` | IMPLEMENTED — jobs runner endpoint |
| `.github/workflows/process-jobs.yml` | IMPLEMENTED — cron `*/5 * * * *`, calls jobs runner |
| `payload_jobs` table | MANUALLY CREATED in Neon (push:true unreliable in serverless) |
| `source_meta_shopier_*` (5 columns on products) | MANUALLY CREATED in Neon |
| 4 Shopier webhooks | REGISTERED — order.created, order.fulfilled, refund.requested, refund.updated |
| Product 11 smoke test | VERIFIED SYNCED — Shopier ID `45456186` |
| Webhook sig verification | VERIFIED — valid sig → 200, bad sig → 401 |

### Key Env Vars (Step 20)
| Variable | Purpose |
|----------|---------|
| `SHOPIER_PAT` | Shopier REST API Bearer JWT |
| `SHOPIER_WEBHOOK_TOKEN` | Comma-separated HMAC tokens (one per webhook registration) |

### Deployment Status
- **Vercel deployment**: v8 pending push (2026-03-29) — OpenAI-first strict pipeline: input validation, structured identity lock, no silent Gemini fallback, per-slot logs
- **Custom domain**: `uygunayakkabi.com` (CNAME configured)

### Instagram OAuth Routes
- `GET /api/auth/instagram/initiate` — Starts Meta consent flow
- `GET /api/auth/instagram/callback` — Exchanges code for tokens, stores in Payload CMS
- Scopes: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
- Long-lived token expires ~2026-05-20

---

## VPS Infrastructure (Hetzner)

### Mentix Skills
All deployed and operational:
1. mentix-intake-v3 (OpenClaw → Telegram integration)
2. 12 additional operator-facing skills

### n8n Workflows
- `channel-instagram-real.json` — Instagram publish (now fallback only)
- `channel-dispatch-webhook.ts` — Main entry point for product dispatch

### Docker Network
- Persistence configured for Telegram bot state
- Operator allowlist: Furkan + Sabri + Bahriyar

---

## Instagram/Facebook Credentials

### Instagram
| Config | Value | Location | Notes |
|--------|-------|----------|-------|
| User ID | `43139245629` | Vercel env + Payload CMS | Business Account ID |
| Access Token | `EAAUovIaOuYc...` | Payload CMS `automation-settings.instagramTokens.accessToken` | Long-lived (~60 days) |
| Token Expiry | 2026-05-20 | Payload CMS `automation-settings.instagramTokens.expiresAt` | Refresh via `/api/auth/instagram/initiate` |
| App ID | `1452165060016519` | Vercel env | Meta developer app |
| Username | `@uygunayakkabi342026` | Instagram | Professional account |

### Facebook Page (UygunAyakkabI)
| Config | Value | Notes |
|--------|-------|-------|
| Page ID | `1040379692491003` | **Correct Graph API ID** — stored as `INSTAGRAM_PAGE_ID` |
| Legacy ID | `61576525131424` | Old NPE profile ID (non-functional with Graph API) |
| Page Type | New Pages Experience (NPE) | Requires page-token fallback for publish |
| Access Token | Derived from OAuth flow | Obtained via GET `/{pageId}?fields=access_token` |

### Token Refresh Process
To refresh Instagram token: navigate to `https://uygunayakkabi.com/api/auth/instagram/initiate`, approve Meta consent, callback automatically updates Payload CMS.

---

## Known Constraints

### Instagram Publishing
- Direct Graph API used exclusively; n8n webhook available only as fallback
- Long-lived token valid ~60 days, then requires manual refresh

### Facebook Publishing
- Requires page-token obtained from Graph API (not user token)
- New Pages Experience (NPE) pages require correct numeric ID (`1040379692491003`)
- Posts to page only, not user timeline

### Automation
- `push: true` in dispatch does NOT execute in production (`NODE_ENV === 'production'` guard)
- Telegram group allowlist: Furkan, Sabri, Bahriyar only
- Duplicate guard checks for products with same title within 24 hours

### Collections
- Brands and Categories empty — must be manually populated for optimal filtering/metadata
- Shopier and Dolap integrations stub-only; no real API calls executed

### n8n Environment Variables (Deprecated)
| Variable | Purpose | Status |
|----------|---------|--------|
| `INSTAGRAM_USER_ID` | Legacy n8n workflow | Not used (direct publish active) |
| `INSTAGRAM_ACCESS_TOKEN` | Legacy n8n workflow | Not used (direct publish active) |
| `N8N_CHANNEL_INSTAGRAM_WEBHOOK` | Fallback webhook URL | Available but not primary |

---

## Phase 1 Completion Record

**Completed 2026-03-13** — Storefront and admin infrastructure delivered.

### Deliverables
- Next.js storefront with Payload CMS backend
- Admin product management panel
- Image upload and media management (Cloudinary)
- Paytr payment integration
- Basic product schema with dispatch tracking

---

## Phase 2 Completion Record (Steps 1–19)

**Completed 2026-03-22** — Full Instagram and Facebook integration.

### Key Milestones
- **Steps 1–6** — n8n webhook scaffolding, Telegram integration, OpenClaw mentix skill
- **Steps 7–8** — Payload global automation settings, Instagram OAuth foundation
- **Steps 9–11** — Duplicate guard, media attachment, admin review panel
- **Steps 12–15** — Mentix deployment v2, 13 skills live, security rotation
- **Steps 16–17** — Instagram real integration, OAuth token exchange (long-lived)
- **Steps 18–19** — Instagram direct Graph API publish (bypass n8n), Facebook direct publish

### Systems Verified Live
- Telegram mention → draft product → admin review → direct publish to Instagram/Facebook
- End-to-end tested with real posts (Instagram ID `18115629052647099`, Facebook ID `122093848160884171`)

---

## Deferred / Cleanup Items

- **Brands & Categories** — Empty collections; manual population needed
- **Dolap** — Stub only, no real API integration; ready for future development
- **n8n Instagram workflow** — Superseded by direct Graph API, kept as reference
- **Phase 1 cleanup** — Reusable design system components (deferred to Phase 3)

## Step 21 — Shopier Order Fulfillment (VERIFIED WORKING — 2026-03-23)
| Component | Status |
|-----------|--------|
| `Orders.ts` | `shopierOrderId` field added, `shopier` source option added |
| `enum_orders_source` | `shopier` added via SQL — MANUALLY APPLIED to Neon |
| `orders.shopier_order_id` column | MANUALLY CREATED in Neon |
| `order.created` webhook | Creates Payload Order document with customer info + product link |
| `order.fulfilled` webhook | Updates Order status → `shipped` |
| `refund.requested` webhook | Updates Order status → `cancelled`, appends refund ID to notes |
| Idempotency guard | Skips duplicate orders (checks `shopierOrderId` before create) |
| Product auto-link | Matches `sourceMeta.shopierProductId` to local product |
| Smoke test | Order `SIM-ORDER-21-001` created in Neon — id=1, ORD-861452 ✅ |

---

## Steps 22–24 — Telegram Bot + AI Image Generation (VERIFIED WORKING — 2026-03-28)

### Architecture Change (Step 22): Direct Telegram Webhook (n8n/OpenClaw REMOVED from intake)
| Component | Status | Notes |
|-----------|--------|-------|
| `src/app/api/telegram/route.ts` | IMPLEMENTED | Direct Payload CMS webhook handler — no n8n/OpenClaw dependency |
| Photo intake | VERIFIED WORKING | Receives photo → downloads from Telegram → uploads to Vercel Blob → creates Media + Product |
| `TELEGRAM_BOT_TOKEN` | SET in Vercel | Bot token used for all Telegram API calls |
| `TELEGRAM_WEBHOOK_SECRET` | SET in Vercel | `X-Telegram-Bot-Api-Secret-Token` header verified on all incoming requests |
| Telegram group privacy mode | VERIFIED OFF | Disabled via BotFather — bot receives plain photos without @mention |
| Webhook registration | VERIFIED | Registered with `secret_token` parameter to match `TELEGRAM_WEBHOOK_SECRET` |

### Bug Fixes Applied and Verified (2026-03-28)
| Bug | Root Cause | Fix | Status |
|-----|-----------|-----|--------|
| Bot not receiving plain photos | Telegram group privacy mode ON | Disabled via BotFather `/mybots → Group Privacy → Turn Off` | VERIFIED FIXED |
| All `/api/telegram` calls → 401 | Webhook registered without `secret_token` but env var set | Re-registered webhook with matching `secret_token` via JS console | VERIFIED FIXED |
| "Satış Fiyatı zorunludur" on Telegram product create | `validate()` on price field didn't include `telegram` source | Added `data?.source === 'telegram'` bypass in `Products.ts` | VERIFIED FIXED |
| "Hiç görsel üretilemedi" (no images generated) | `GEMINI_FLASH_MODEL` set to `gemini-2.0-flash-exp-image-generation` (404) | Changed env var to `gemini-2.5-flash-image` in Vercel | VERIFIED FIXED |
| Generated images = completely wrong product | `gemini-2.5-flash-image` is text-to-image only — ignores image input | Two-step vision pipeline: Gemini Vision describes product → text prompt drives generation | VERIFIED DEPLOYED |

### Step 24 — AI Image Generation Pipeline (IMPLEMENTED — 2026-03-28)
| Component | File | Status |
|-----------|------|--------|
| Image generation task | `src/jobs/imageGenTask.ts` | IMPLEMENTED — Payload Jobs queue task |
| Vision analysis step | `describeProductImage()` in imageGenTask.ts | IMPLEMENTED — calls `gemini-2.5-flash` (vision) to describe product photo |
| Prompt builder | `src/lib/imagePromptBuilder.ts` | IMPLEMENTED — 5 concept prompts, uses `visualDescription` when available |
| Image providers | `src/lib/imageProviders.ts` | IMPLEMENTED — Gemini Flash (hizli), GPT Image (dengeli), Gemini Pro (premium), Karma |
| ImageGenerationJobs collection | `src/collections/ImageGenerationJobs.ts` | IMPLEMENTED |
| Telegram `#gorsel` command | `src/app/api/telegram/route.ts` | IMPLEMENTED — triggers image gen job |

### AI Image Generation — Key Architecture Decisions

#### Step 25 — Full Attempt History (2026-03-28 → 2026-03-29)

**User requirement (explicit):** Generated images must show the EXACT SAME shoe from the Telegram photo — different angles/scenes/compositions. NOT "just changing the background."

**Approach v1 — `fit:contain` at 1024×1024 (commit `ece33d2`)**
- Resize reference image to 1024×1024 with `fit:contain` (letterboxing for non-square)
- Result: Square shoe photos get ZERO padding → all 5 output images identical to original
- User outcome: "it's not generating at all" (images looked unchanged)
- Status: ❌ REJECTED — invisible on square photos

**Approach v2 — `fit:inside` 800×800 + `extend(112px)` (commit `8f866b2`)**
- Resize to 800×800 `fit:inside` then extend with 112px border on all sides → guaranteed 1024×1024 with visible border
- Result: Shoe visible with colored border, but all 5 images = same shoe same angle
- User outcome: "it s only changing the background. I don't want that"
- Status: ❌ REJECTED — user wants different compositions, not just colored borders

**Approach v3 — ML background removal + solid color fills (commit `0b4cbd3`)**
- `@imgly/background-removal` (isnet_quint8 model) strips shoe from background → transparent PNG
- Resize cutout to 780×780, composite centred onto 5 different solid-color 1024×1024 canvases (white, cream, charcoal, marble-grey, warm-beige)
- Result: Clean shoe cutout on 5 different background colors
- User outcome: "it s only cyhanging the background. ! ı dont want that" (repeated, emphatic)
- Status: ❌ REJECTED — user explicitly does not want background color changes

**Approach v4 — ML background removal + Gemini-generated scene backgrounds (commit `d2994b3`)**
**CURRENT DEPLOYED STATE** (as of 2026-03-29)
- `@imgly/background-removal` strips shoe → transparent cutout (780×780)
- For each of 5 scenes: call Gemini Flash to generate a realistic background image (white studio, cream backdrop, dark charcoal, marble surface, oak floor with bokeh)
- Composite shoe cutout centred onto generated background → JPEG output
- Falls back to solid color if Gemini background generation fails
- Result: Shoe on 5 different AI-generated scene backgrounds — but still same shoe, same angle, same direction
- User outcome: same rejection — "only changing the background"
- Status: ❌ REJECTED — fundamental problem unresolved

**Root cause identified:**
All approaches above share the same flaw: they take the original shoe photo at its original angle and paste/composite it onto different backgrounds. The user wants **different camera angles and compositions** (front view, side view, close-up texture, tabletop shot, lifestyle worn shot) — not the same photo on different backgrounds.

**What's needed (NOT YET IMPLEMENTED):**
An AI model that can take a reference shoe photo and genuinely **reconstruct it in 5 different poses/angles/scenes** while maintaining exact visual fidelity (same design, color, sole, details). This requires either:
1. A model with true image-editing capability (not text-to-image)
2. gpt-image-1 `/v1/images/edits` with stronger prompting (PARTIALLY IMPLEMENTED — commit `196c419` — not yet verified effective)
3. Stability AI ControlNet (shape-conditioned generation)
4. Fine-tuning / DreamBooth style subject preservation

#### Current Architecture — v8 (2026-03-29)

**ARCHITECTURE CHANGE: OpenAI-first, strict product-preserving pipeline.**

Pipeline A is now the ONLY path when a reference image exists.
No silent Gemini fallback when Pipeline A fails — failure is explicit.

```
STEP A — Input Validation (NEW)
  validateProductImage() in imageProviders.ts
  - Calls Gemini Vision to classify if image is a valid shoe/footwear photo
  - If invalid → job status='failed', Telegram rejection message, no generation
  - If validation API fails → defaults to valid=true (don't block on transient errors)

STEP B — Identity Lock Extraction (NEW — replaces describeProductImage)
  extractIdentityLock() in imageProviders.ts
  - Calls Gemini Vision to extract STRUCTURED identity: productClass, mainColor,
    accentColor, material, toeShape, soleProfile, heelProfile, closureType, distinctiveFeatures
  - Builds a formatted promptBlock with MUST NOT ALTER constraints for each field
  - On extraction failure → minimal fallback lock block used

STEP C — Pipeline A: OpenAI gpt-image-1 editing (PRIMARY + ONLY reference-image path)
  generateByEditing(referenceBuffer, mime, identityLockBlock) in imageProviders.ts
  - sharp converts photo to PNG 1024×1024 (fit:contain, white bg)
  - For each of 5 scene slots (sequential, 1 retry each, 1s between slots):
      fullPrompt = identityLockBlock + scene.sceneInstructions
      callGPTImageEdit(pngBuffer, fullPrompt, apiKey) — quality: 'medium'
      Convert result to JPEG q92
  - Returns buffers + slotLogs (per-slot: slot, attempts, success, outputSizeBytes)
  - If 0 images → job fails explicitly. NO Gemini fallback.

EDITING_SCENES v8 (5 physically distinct slots — each has FORBIDDEN list):
  slot 1 commerce_front      → dead-straight front, camera at lacing height, white bg,
                                toe+vamp+laces visible, NO side profile
  slot 2 side_angle          → EXACTLY 90° lateral, camera at sole level, cream bg,
                                full sole profile, heel on right, NO toe front
  slot 3 detail_closeup      → 15-20cm macro, 20-30° down, shallow DoF, raking sidelight,
                                texture/stitching sharp, NO wide shot
  slot 4 tabletop_editorial  → 55-65° overhead, marble surface, window light upper-left,
                                top face of shoe visible, Scandi editorial style
  slot 5 worn_lifestyle      → ground-level (10-15cm), one foot wearing shoe, bokeh bg,
                                golden light, NO face/body, NOT studio

PIPELINE B — Text-to-image fallback (DEGRADED PATH — only when no reference image)
  - Trigger: referenceImage = undefined (literally no product photo exists)
  - Flow: productContext text → buildPromptSet() → generateByMode()
  - Logged as 'Pipeline B — text-to-image, product identity not guaranteed'
  - NOT triggered when Pipeline A fails with a reference image (fail explicitly instead)

KEY IMPROVEMENTS in v8 vs v7:
  - Input validation gate: non-shoe images rejected before generation
  - Structured identity lock: 9-field extraction vs. single-sentence description
  - identityLockBlock now includes field-specific MUST NOT constraints (color, material, etc.)
  - No silent Gemini fallback when Pipeline A fails with reference image
  - slotLogs returned per slot: attempts, success, outputSizeBytes, rejectionReason
  - Telegram notification includes per-slot status icons (✅/❌)
  - describeProductImage() removed — replaced by extractIdentityLock() in imageProviders.ts
  - TypeScript: VERIFIED compiles clean (tsc --noEmit, 2026-03-29)
```

#### Pipeline B: Text-to-Image Fallback (DEGRADED — no reference image only)
- **Trigger**: `referenceImage === undefined` — product has no photo attached
- **Flow**: `productContext` text → `buildPromptSet()` → `generateByMode()`
- **Providers**: Gemini Flash (#hizli), GPT Image (#dengeli), Gemini Pro (#premium), Karma
- **Known limitation**: Text-to-image cannot guarantee exact product reproduction
- **CHANGED**: No longer triggered when Pipeline A fails with a reference image — failure is explicit

#### Key Technical Findings (2026-03-28 → 2026-03-29 session)
- **`/v1/images/edits` with gpt-image-1**: Requires `image[]` field name (NOT `image`). Using `image` returns 400 "Value must be 'dall-e-2'"
- **OpenAI Responses API (`/v1/responses`) with `image_generation` tool**: Does NOT do true editing — generates loosely inspired new images. NOT suitable for product fidelity.
- **`response_format: 'b64_json'`**: NOT a valid parameter for gpt-image-1 `/v1/images/generations` — causes 400 "Unknown parameter". Removed.
- **OPENAI_API_KEY**: Rotated 2026-03-28 (old key expired/401). Updated via Vercel internal API.
- **`gemini-2.0-flash-exp-image-generation`**: DEPRECATED — returns 404, not available in models list
- **Gemini image models ignore `inlineData`**: All Gemini image models are text-to-image only
- **`@imgly/background-removal-node`**: FAILED to install (requires its own sharp binary download, blocked by sandbox proxy). Universal version installed but approach ABANDONED.
- **Square photo problem**: `fit:contain` at 1024×1024 adds zero padding to square photos — all 5 outputs look identical to original
- **Compositing approach ABANDONED**: User explicitly rejected ALL background-swap approaches. Commit `b668ac4` removed all compositing code and switched to gpt-image-1 AI editing

#### Git Workaround (RECURRING)
- Workspace repo has persistent `index.lock` preventing direct git operations
- All git operations use temp clone at `/tmp/imgfix_tmp` with GitHub remote
- Remote: `https://ghp_***@github.com/frkbas34/uygunayakkabi-store.git`
- Commit config: `-c user.name="Yavuz" -c user.email="y.selimbulut38@gmail.com"`

### Environment Variables — Current Production State (Vercel)
| Variable | Value / Notes | Status |
|----------|--------------|--------|
| `GEMINI_API_KEY` | Set in Vercel | ACTIVE |
| `GEMINI_FLASH_MODEL` | `gemini-2.5-flash-image` | CORRECTED 2026-03-28 |
| `GEMINI_PRO_MODEL` | `imagen-4.0-ultra-generate-001` | ACTIVE |
| `OPENAI_API_KEY` | Rotated 2026-03-28 | ACTIVE — new key set via Vercel internal API (env ID `764gO7z42RX0uvI0`) |
| `TELEGRAM_BOT_TOKEN` | Set in Vercel | ACTIVE |
| `TELEGRAM_WEBHOOK_SECRET` | Set in Vercel | ACTIVE — must match webhook `secret_token` registration |
| `AUTOMATION_SECRET` | Set in Vercel | ACTIVE |

### Telegram Command Reference (VERIFIED WORKING)
| Command | Action |
|---------|--------|
| Send photo | Creates draft product with photo |
| `bunu ürüne çevir` + reply to photo | Converts photo to product |
| `#gorsel` / `#gorsel <id>` | Triggers AI image generation for last/specified product |
| `#gorsel #hizli` | Gemini Flash (fast) |
| `#gorsel #dengeli` | GPT Image (falls back to Gemini Flash) |
| `#gorsel #premium` | Gemini Pro / Imagen 4 Ultra |
| `#gorsel #karma` | All providers (hybrid) |

---

## Image Pipeline v39 — Visual Standard Reset (DEPLOYED — 2026-04-07)

**Operator Requirement:** Remove bright/washed look from all slots. Backgrounds must be visibly colored (not near-white). Slot 3 must NOT be back_hero — must be a close shot hero.

| Change | Before (v38) | After (v39) |
|--------|-------------|-------------|
| Background hex luminance | ~93-98% (near-white) | ~75-80% (visibly colored) |
| Brightness normalization band | 85-145 (mid 115) | 70-120 (mid 95) |
| QC brightness mean threshold | >200 | >185 |
| QC highlight threshold | >30% | >25% |
| Slot 3 | back_hero (3/4 rear) | close_shot_hero (3/4 front close) |
| TASK_FRAMING_BLOCK tone | Neutral | "Rich, warm, slightly dark. NOT bright or airy." |

**Slot Map (v39):**
| Slot | Name | Stage |
|------|------|-------|
| 1 | side_angle | standard |
| 2 | commerce_front | standard |
| 3 | close_shot_hero | standard |
| 4 | tabletop_editorial | premium |
| 5 | worn_lifestyle | premium |

**Status:** DEPLOYED — tsc clean, zero type errors

---

## Recommended Next Steps

**Step 25 — AI Product Photography Pipeline (IN PROGRESS — awaiting v8 test results)**
- v8 deployed: input validation gate, structured 9-field identity lock, strict 5-slot prompts, no silent Gemini fallback, per-slot slotLogs
- **NEXT ACTION**: Test with `#gorsel #dengeli` on a real shoe product — score each of 5 outputs
- **If Case A** (different compositions + sho
---

## Image Pipeline v50 — PRODUCTION BASELINE LOCKED (2026-04-07)

**Status:** LOCKED — Operator Approved — D-129

**DO NOT MODIFY without explicit operator approval.**

### Locked Visual Baseline
- Raw Gemini 2.5 Flash output — NO post-processing (no brightness, sharpness, softness adjustments)
- Input image padding uses background color (NOT white) — eliminates frame artifact
- v32 bitmap pixel font SN overlay (SVG rects, zero font dependencies, Vercel-safe)

### Locked Slot Map
| Slot | Index | Name | Stage | Description |
|------|-------|------|-------|-------------|
| 1 | 0 | side_angle | standard (PRIMARY) | 90° lateral profile, hero image |
| 2 | 1 | commerce_front | standard | Front studio hero |
| 3 | 2 | detail_closeup | standard | 3/4 angle close-up (18-25cm), toe/vamp |
| 4 | 3 | tabletop_editorial | premium | Overhead 55-65°, seamless studio floor |
| 5 | 4 | worn_lifestyle | premium | Ground-level lifestyle, worn on foot |

### Locked Background Color Map
| Shoe Color | Backdrop | Hex |
|-----------|----------|-----|
| Black/Siyah | Warm beige | #F5F0E8 |
| White/Beyaz | Light grey | #E8E8E8 |
| Brown/Kahve | Warm cream | #F5F1E6 |
| Tan/Taba | Off-white | #FAF8F5 |
| Grey/Gri | Clean white | #FFFFFF |
| Navy/Lacivert | Light grey | #EDEDED |
| Red/Kırmızı/Bordo | Neutral off-white | #F7F5F3 |
| Green/Yeşil/Olive | Warm cream | #F5F0E8 |
| Blue/Mavi | Warm off-white | #F5F2ED |
| Pink/Pembe | Light grey | #ECECEC |
| Beige/Krem | Warm grey | #E0DDD8 |
| Default | Neutral light grey | #EDEDED |

### Anti-Frame System (Triple Layer)
1. TASK_FRAMING_BLOCK — global "ANTI-FRAME RULE (ZERO TOLERANCE)" section
2. Per-slot CRITICAL ANTI-FRAME block in every sceneInstructions
3. ANTI_FRAME_FINAL_BLOCK — end-of-prompt verification checklist

### Key Files (DO NOT MODIFY)
- `src/lib/imageProviders.ts` — EDITING_SCENES, TASK_FRAMING_BLOCK, ANTI_FRAME_FINAL_BLOCK, getBackgroundForColor(), getBackgroundRGB(), generation functions
- `src/jobs/imageGenTask.ts` — Job orchestration, PIXEL_FONT, renderBitmapText(), overlayStockNumber()

### Commit Reference
Locked at commit e99e9cb (v50) on main branch.


---

## Content Architecture — Audit Complete (2026-04-07)

**Status:** ARCHITECTURE DEFINED — Awaiting operator approval for implementation phases

### What EXISTS (VERIFIED IMPLEMENTED)
- **geobotRuntime.ts**: Real Gemini 2.5 Flash content generation (commerce + discovery packs)
- **contentPack.ts**: Full lifecycle — trigger, write to product, blog creation, audit handoff
- **Product schema**: commercePack (5 channel copies) + discoveryPack (SEO article, FAQ, meta, keywords)
- **BlogPosts collection**: Auto-created from discoveryPack as draft
- **Telegram `/content` command**: show, trigger, retry
- **Auto-trigger**: Fires after product confirmation
- **BotEvent tracking**: content.requested → commerce_generated → discovery_generated → ready
- **Mentix audit**: Auto-triggered when content reaches 'ready'

### What Is NOT WIRED (gap)
- Storefront uses `product.description`, NOT `commercePack.websiteDescription`
- Channel dispatch uses `product.description`, NOT AI-generated captions
- No blog frontend pages (`/blog`, `/blog/[slug]`)
- No SEO meta tags from discoveryPack in page `<head>`
- No FAQ rendering on product pages
- No JSON-LD structured data
- No sitemap for blog posts

### Content Outputs Per Approved Product
| # | Output | Source | Consumer | Status |
|---|--------|--------|----------|--------|
| 1 | Website description | commercePack.websiteDescription | Product page | NOT WIRED |
| 2 | Product highlights | commercePack.highlights | Product page | NOT WIRED |
| 3 | Instagram caption | commercePack.instagramCaption | channelDispatch | NOT WIRED |
| 4 | Facebook copy | commercePack.facebookCopy | channelDispatch | NOT WIRED |
| 5 | X/Twitter post | commercePack.xPost | channelDispatch | NOT WIRED |
| 6 | Shopier description | commercePack.shopierCopy | channelDispatch | NOT WIRED |
| 7 | SEO meta title | discoveryPack.metaTitle | Product page head | NOT WIRED |
| 8 | SEO meta description | discoveryPack.metaDescription | Product page head | NOT WIRED |
| 9 | SEO article / blog post | discoveryPack.articleBody → BlogPost | Blog pages | NO FRONTEND |
| 10 | FAQ | discoveryPack.faq | Product page | NOT WIRED |
| 11 | Keywords | discoveryPack.keywordEntities | Structured data | NOT WIRED |
| 12 | JSON-LD Product schema | All content fields | Product page | NOT IMPLEMENTED |
| 13 | JSON-LD FAQ schema | discoveryPack.faq | Product page | NOT IMPLEMENTED |

### Geobot Ownership
Geobot owns ALL AI content generation:
- Commerce pack (5 channel-specific copies + highlights)
- Discovery pack (SEO article, meta, FAQ, keywords, internal links)
- BlogPost auto-creation (draft status, operator reviews)
- Content status tracking and BotEvent emission
- Content retry on partial/failed states

Geobot does NOT own:
- Content rendering on storefront (frontend responsibility)
- Content dispatch to channels (channelDispatch responsibility)
- Content approval/editing (operator responsibility via admin panel)
- Blog publishing (operator sets status from draft → published)


---

## Phase A — Storefront Content Wiring (2026-04-07)

**Status:** IMPLEMENTED — D-131

Product page now renders Geobot content with safe fallbacks:

| Content | Source | Fallback | Rendering |
|---------|--------|----------|-----------|
| Description | commercePack.websiteDescription | product.description | Paragraph text |
| Highlights | commercePack.highlights | hidden | Checkmark list |
| FAQ | discoveryPack.faq | hidden | Accordion (ProductFAQ component) |
| Meta title | discoveryPack.metaTitle | "{title} — UygunAyakkabı" | `<head>` via generateMetadata |
| Meta description | discoveryPack.metaDescription | websiteDescription[:160] | `<head>` via generateMetadata |
| Keywords | discoveryPack.keywordEntities | omitted | `<meta keywords>` |
| JSON-LD Product | All product fields | basic fields | `<script type="application/ld+json">` |
| JSON-LD FAQPage | discoveryPack.faq | omitted | `<script type="application/ld+json">` |

**Files:**
- `src/app/(app)/products/[slug]/page.tsx` — Rewritten
- `src/components/ProductFAQ.tsx` — New component


---

## Phase B — Blog Frontend (2026-04-07)

**Status:** IMPLEMENTED — D-132

| Route | What | SEO |
|-------|------|-----|
| `/blog` | Published posts listing, date-sorted | Static meta |
| `/blog/[slug]` | Full article, featured image, related products | Dynamic meta from seo fields, JSON-LD Article |

**Rendering:** Lexical richText → text extraction → paragraph/heading/list rendering with basic Markdown detection.

**Operator workflow:** Geobot creates posts as `draft` → operator sets `published` in admin → appears on `/blog`.

**Files:** `src/app/(app)/blog/page.tsx`, `src/app/(app)/blog/[slug]/page.tsx`

