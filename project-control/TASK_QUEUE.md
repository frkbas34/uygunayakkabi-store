# TASK QUEUE — Uygunayakkabi

_Last updated: 2026-04-28 (LOCK CHECKPOINT — D-227 → D-231 stabilization. PI auto-bridge + observability + mandatory prompts + idempotent applyConfirmation + richer pack + parallel geobot + wizard vision autofill, all PROD-VALIDATED. Operator: "it's working perfectly now". Future work branches from this baseline.)_

---

## Recent — 2026-06-14 — D-302 → D-320 COMPLETED & deployed

- D-302..D-318: image normalization, Phase 1 conversion, editorial/tiles/social-proof/footer, demo-reviews-off, ad-readiness cleanup, UTM attribution, internal `trackEvent`, PDP claim cleanup — all merged to `main` + deployed.
- **D-320 COMPLETED:** product-linked inquiry HTTP 500 fixed (`productId` coercion in `/api/inquiries`); deployed `9a8001b`; live re-test passed.
- **D-322 DONE (2026-06-14):** D-320 verified end-to-end (product FK + UTM persisted); D319/D320 test leads (id 10/11) marked `status=spam`.
- **D-323 pre-ad audit (2026-06-14): READY WITH WARNINGS** — lead flow/attribution/WhatsApp/no-pixels/no-demo verified live. Flag: placeholder product "Taslak Ürün 16/06-4184" publicly visible (operator should rename/unpublish before ads).
- **D-324 DONE (2026-06-18):** placeholder product `Taslak Ürün 16/06-4184` (id 361) unpublished via Admin (`status active → draft`) — the only active placeholder of 17 `Taslak Ürün …` rows; 6 real products stayed active. Homepage re-verified clean. No rename/delete/code change. Catalog now clean for ad traffic.
- **D-336A+B DONE (2026-06-19):** brand-safety guard IMPLEMENTED (code, validated). NEW `src/lib/brandSafety.ts` + Layer 1 (`mentixAudit.ts`: brand → needs_revision → not activated) + Layer 2 (`channelDispatch.ts`: brand → skip all external channels). tsconfig excludes test. 9/9 assertions pass; esbuild OK; clean [353,354,355,359] still pass, 362-like blocked. No schema change. Limitation: admin force-activate bypasses Layer 1 (storefront) but Layer 2 still blocks external publish → optional Layer 3 (D-336C) for all-paths hard gate. Commit `feat: add brand-safety guard for audit and channel dispatch`.
- **D-336 PLAN (2026-06-19):** brand-name guard design (no code). Insertion = Mentix audit (`mentixAudit.ts`) — the gate #362 passed unguarded. Plan: NEW `src/lib/brandSafety.ts` (BLOCKED_BRANDS + RISKY_CLAIM_TERMS + scan w/ co-occurrence risk + collectProductTexts) → Layer 1 audit check (blocked brand → needs_revision → not activated, via existing Telegram approve/revise UX); Layer 2 channelDispatch pre-dispatch block; Layer 3 optional Products.ts beforeChange. False-positive-aware (brands hard, claims warn unless co-occur). No schema change. NEXT = D-336A (brandSafety.ts + audit Layer 1) — operator approval to implement. Detail: DECISIONS D-336.
- **D-335C DONE (2026-06-19):** #362 contained — set `active→draft` via Admin (operator-approved; only status; reversible). Verified: PDP 404, homepage + /ayakkabilar 0× New Balance/ai-362, active set=[353,354,355,359]. Website exposure contained. STILL NEEDED (operator, external): remove Shopier (shopier.com/48281164), X tweet (#NewBalance), FB post. No rewrite yet. NEXT options: D-335D rename/rewrite generic (if keeping product); D-336 brand-name guard in pipeline.
- **D-335B AUDIT (2026-06-19):** #362 brand-safety = HIGH→CRITICAL. "New Balance Sneaker Çok Renkli" active + published to website/shopier/x/facebook; brand-as-identity + 'N' logo + "9060" model + authenticity claim "özgünlüğünü vurgular" + X "#NewBalance". Recommend A) hide #362 to draft NOW (operator approval → D-335C), B) rename/rewrite generic, E) operator legal call. External cleanup needed: Shopier (shopier.com/48281164), X tweet, FB post (IG off). RECURRENCE: no brand-name guard → future task D-336 (intake/publish brand blocklist). NEXT = await operator OK to hide #362.
- **D-335 AUDIT (2026-06-19):** product #362 ("New Balance Sneaker Çok Renkli") GEO visibility. Live PDP CONFIRMS GEO content generated+applied+VISIBLE (description, highlights, FAQ, 14 keywords, SEO meta). GEO stored on `product.content.commercePack`+`discoveryPack`. PDP does NOT render `discoveryPack.articleBody` or PI geoPack (AI-summary/comparison). Operator's "no GEO" = visibility/expectation gap. FIX: D-335A add visible PDP GEO section (article/AI-summary, code+approval) + runbook note. SECONDARY: #362 brand-named (New Balance) + authenticity claims → brand-safety review (D-328). PI report row not checked (admin 403). Detail: DECISIONS D-335.
- **D-334 AUDIT (2026-06-19):** reverse-search quality root cause found. Google Vision provider passes `image.source.imageUri` (uygunayakkabi.com media URL); Google can't fetch it → "We're not allowed to access the URL on your behalf" → referenceProducts=0. NOT env-missing (prod HAS GOOGLE_VISION_API_KEY), NOT provider-unsupported → image input/query issue (code). FIX = keep Google Vision + patch `googleVision.ts` to send base64 `image.content` not `imageUri` (~10 lines, free tier, no paid credits). NEXT = D-334A code patch (operator approval) → re-run `#geohazirla 359` to verify. Detail: DECISIONS D-334.
- **D-333C RESOLVED (2026-06-19):** manual `#geohazirla` CONFIRMED WORKING. Claude (operator-authorized, via operator Telegram Web) sent `#geohazirla 359` to verified @Uygunops_bot DM (id 8702872700) → bot acknowledged + posted full report ready (~40s). No sendgeo/approve pressed. Root cause of earlier failures = command wasn't reaching the @Uygunops_bot DM (wrong bot/chat); webhook+code always healthy. Reverse-image search still fails in prod (google_vision URL-access gap) → optional NEXT: enable reverse-search provider creds in Vercel. Manual trigger FUNCTIONAL.
- **D-333B CAUSE-ISOLATED (2026-06-19):** confirmed DM `#geohazirla 359` to @Uygunops_bot STILL no report/event (newest 2026-06-16). DM has no drop-gate + success would create a draft row + reply → update never reached `/api/telegram`. Webhook healthy + code correct → cause = Telegram CLIENT/CHAT delivery (bot not /start-ed for this user / wrong bot / delivery anomaly). NEXT (operator, no webhook change): DM `/pipeline` or `/start` to @Uygunops_bot → reply = PI-path-specific (then D-334 code); no reply = bot unreachable for this user (start it, verify @Uygunops_bot). Auto-bridge fine.
- **D-333A WEBHOOK-HEALTHY (2026-06-19):** diagnosed Uygunops webhook via getMe/getWebhookInfo. getMe=@Uygunops_bot; url=`https://www.uygunayakkabi.com/api/telegram` (correct); pending=0; secret OK (no 401); only stale "Read timeout" error from 2026-06-16 (June-16 content-gen). setWebhook=idempotent "already set". Webhook NOT the cause → today's command likely never reached @Uygunops_bot. Architecture note: slow handler → read-timeout risk (future D-334 = fast-ack + background PI). NEXT = operator DMs `#geohazirla 359` to @Uygunops_bot + reports reply → Claude verifies.
- **D-333T VERIFIED-BROKEN (2026-06-19):** operator DM'd `#geohazirla 359` to @Uygunops_bot → STILL no report/event (anyEventToday=false; newest 2026-06-16). Wrong-bot RULED OUT. Cause = Uygunops webhook delivery/config (url/secret/delivery). No code defect. NEXT = operator runs getWebhookInfo (read-only) on Uygunops bot → check url/pending_update_count/last_error → then D-333A re-register webhook (config, approval). Also useful: did @Uygunops_bot reply anything? (no reply→delivery; "starting" reply→createReport runtime fail).
- **D-333 AUDIT DONE (2026-06-19):** manual `#geohazirla` wiring audit (read-only). `#geohazirla` is Uygunops-owned; GeoBot redirects it. `#geohazirla 359` is a valid format. Live cfg `groupEnabled=true`/allowlist empty(open) → not blocking. Root cause narrowed to (a) wrong bot or (b) Uygunops webhook not delivering in prod. No code fix needed; smallest step = operator re-send `#geohazirla 359` as DM to @Uygunops_bot, report reply. If silent → D-333A = re-register Uygunops webhook (config, with approval). (Detail: DECISIONS D-333, BUGS.)
- **D-332R DONE (2026-06-19):** reviewed PI report id 43 for product 359 (ready, geo_auto, 2026-06-09 — only report). Vision + SEO + GEO output STRONG (SEO already live on PDP, claim-safety enforced); reverse-image evidence ABSENT (0 refs, only Gemini ran — provider gap). Usable for SEO/GEO + GeoBot-safe; weak on external evidence. SECONDARY: manual `#geohazirla 359` produced nothing today (all reports geo_auto; bot last active 2026-06-16) → manual trigger non-functional in prod (BUGS). NEXT = D-333: investigate (a) why manual #geohazirla doesn't fire (GEO bot/webhook wiring) and/or (b) enable reverse-search provider creds (Vision/DataForSEO) in Vercel for stronger evidence.
- **D-332 PENDING-OPERATOR (2026-06-19):** controlled PI dry-run for product 359. Read-only prep done (env presence, trigger-path map). VERIFIED: no HTTP trigger — `createProductIntelligenceReport` only callable via Telegram `#geohazirla`. Claude cannot send the Telegram command (no send capability; webhook spoof + ad-hoc prod harness both rejected as unsafe). Chrome admin window down this turn. ACTION NEEDED: operator sends `#geohazirla 359` in GEO/PI bot (do NOT press send-to-GeoBot) + ensure Chrome reconnected → Claude reviews report read-only. (Detail: DECISIONS D-332.)
- **D-331A DONE (2026-06-18):** reverted 2 pre-existing source-drift files on main (`importMap.js` generated drift + `UygunApp.jsx` which had cosmetic count-up polish BUT ALSO fake-reviews activation reversing locked D-313 + PreFooterCTA removal). Reverted via `git checkout -- .` (operator said "don't know" → safest). Tree clean, main==origin/main. Full diff in D-331A chat; count-up polish re-addable as its own task. D-332 unblocked.
- **D-331 AUDIT (2026-06-18):** GEO/Product Intelligence re-entry (read-only). Subsystem fully present (`src/lib/productIntelligence/*`, `contentPack.ts` resolvePiResearch auto-bridge, collection `product-intelligence-reports`). Triggers `#geohazirla|#seoara|#productintel|#urunzeka`. PI report = internal (no external publish until operator `pi:sendgeo`). DataForSEO runtime UNKNOWN (env-gated; historical 403). Controlled single-product PI run feasible (not read-only → needs approval). NEXT = D-332: operator-approved controlled PI dry-run for product 359, STOP before sendgeo, review SEO/GEO pack quality + check provider env availability. (Detail: DECISIONS D-331.)
- **D-329 GO-WITH-WARNING (2026-06-18):** launch-day checklist passed. 4 ad products active+stocked, PDPs HTTP 200 w/ images/sizes/WhatsApp/lead-form/Shopier, 0 brand text, 358/349 draft & absent from rails, D-326 UTM URLs resolve + UTM persists through www redirect. Operational warnings only (WhatsApp staffing, thin stock, no pixel, price-in-creative call). CLEARED to launch small UTM-only test. NEXT = operator launches ads; then D-330 = read results after ~5–7 days.
- **D-328 DONE (2026-06-18):** operator-approved brand-risk cleanup — products 358 (Louis Vuitton Loafer Bej) + 349 (BOSS Süet Loafer) set to `status: draft` (active→draft, reversible, no rename/delete/code change). Verified: homepage + 3 ad PDPs show 0× brand names; active set = `[353,354,355,359]`. D-327 trademark leak RESOLVED. Storefront brand-name-free for ads.
- **D-327 AUDIT (2026-06-18):** pre-launch readiness + lead-response runbook (`campaigns/D-327-pre-launch-runbook.md`). Stock verified (359/355/354=10 units, 353=4); 3 ad PDPs functionally ready. SHOULD-FIX: brand-named `Louis Vuitton Loafer Bej` (358) leaks into "Benzer Modeller" rail on all 3 ad PDPs → recommend hide/rename 358 (+349) before ads (operator approval). Verdict: READY for small UTM-only test, conditional. NEXT candidate = D-328 (operator-approved hide/rename of 358+349).
- **D-326 ASSET (2026-06-18):** first ad copy + UTM URL pack (`campaigns/D-326-first-ad-copy-pack.md`) — copy/headlines/descriptions/CTAs/UTM URLs/creative ranking, brand-named products excluded. Commit 4ba482b.
- **D-325 PLAN (2026-06-18):** first paid-ad campaign landing plan (planning + light live audit, no site change). Verdict READY for small UTM-only test. Ad-safe products = generic loafers (359/355/354/353); EXCLUDE brand-named 358 (Louis Vuitton) + 349 (BOSS) from ads. Land on PDP, WhatsApp-primary CTA, lead form = trackable signal, UTM-only now, D-316B pixel after first validation. Full plan in DECISIONS.md.
- **NEXT / pending:** execute first ad build (outside repo, operator); D-316B external pixels + KVKK consent (BEFORE scaling); grow catalog beyond ~6 loafers + raise stock depth; Products hard-delete-500 still uninvestigated; optional operator hard-delete of test-lead ids 10/11.

---

## 🔒 LOCK CHECKPOINT — 2026-04-28 — Production Baseline

This is a **stabilization checkpoint**. Do not reopen D-227 → D-231 implementation. Future work in the PI / wizard / GeoBot space must come in as a new D-23x or D-24x decision and must not modify the locked behaviour without explicit operator authorization.

### LOCKED — production-validated, treated as authoritative

- D-227 — PI observability (`pi.auto_trigger_failed`), `detectedVisualNotes` in prompt, mandatory prompt rules ("ÜRÜN KİMLİĞİ — ZORUNLU KULLANIM").
- D-227 Neon DDL — `ALTER TYPE enum_product_intelligence_reports_trigger_source ADD VALUE 'geo_auto'`.
- D-228 — applyConfirmation idempotency / duplicate-confirm race protection.
- D-229 — wider vision evidence (soleType, closureType, brandTechnologies[], distinctiveFeatures[], colorAccents[], constructionNotes), deeper SEO/GEO pack (brandTechnologyExplainer, careAndMaintenance, sizingGuidance, styleGuide, technicalSpecs[], useCaseExplainer, alternativeSearchQueries[]), 1200–2000 word discovery article with 8 mandatory sections, DataForSEO text-search fallback.
- D-230 — wizard vision autofill for category + productType + brand+model+color (one Gemini call at wizard init; HIGH ≥70% silently fills, LOW-MED 40–69% renders hint, <40% prompts as before; `tamam` shortcut accepts brand suggestion; wz_edit re-runs autofill).
- D-230 follow-up fixes: category/productType gate aligned with wizard flow; wz_edit re-runs autofill correctly; diagnostic surface for silent failures; image wrapper / `no_image` bug fixed (`products.images` is `{ image: <media> }` wrapper, not flat media doc).
- D-231 — commerce `maxOutputTokens` 4096 → 8192; commerce + discovery now run in parallel via `Promise.allSettled` (wall time ~50–60 s vs ~100 s sequential).
- Operator confirmation 2026-04-28: "it's working perfectly now."

### DEFERRED / OPTIONAL — not blocking the lock

- **DataForSEO Organic SERP 403** (D-229 text-search fallback). The DataForSEO account has Google Lens enabled but not Organic SERP. Wider vision + deeper pack already produce rich output without competitor snippets. **Action:** later, optionally enable Organic SERP in the DataForSEO dashboard. Not blocking the lock.
- **Discovery `metaDescription` occasionally exceeds 160-char cap** — warning only, not a hard failure. **Action:** later, tighten the prompt rule. Not blocking.
- **Task #10 — product 288 forceRedispatch hook no-op.** Pre-existing Shopier dispatch issue. Not in PI/wizard scope. **Action:** investigate in a separate sprint. Lower priority.
- **Task #15 — duplicate wizard-apply variants on product 297.** Likely covered by D-228 idempotency, but never explicitly verified on 297. **Action:** spot-check next time the operator runs that product, or write a one-off DB diagnostic. Not blocking.
- **Task #29 — D-223 #geohazirla 298 validation.** Pre-D-227 task; the pipeline that this would have validated has since been replaced by D-225 + D-227's auto-bridge. **Action:** mark as superseded by the D-227 product 304 validation. Not blocking.
- **Task #9 — D-208b churn root cause for variant-less Shopier UPDATE.** Pre-existing Shopier issue documented in D-216. Not in PI/wizard scope. **Action:** keep on backlog. Not blocking.

### Future-work guardrails

- New scope = new D-number. Do not extend D-227, D-228, D-229, D-230, D-231 sections retroactively.
- Schema or enum changes still require manual Neon DDL + post-deploy verification (Blocker 0 still applies).
- Token-budget changes require consulting `feedback_gemini_token_budget.md` first.
- Wizard image-shape changes must respect the `{ image: <media> }` wrapper rule (D-230 follow-up #4).

---

## ⚠️ Active Blockers

### Blocker Z-1: Phase Z Full Golden-Path Stage 1→14 — RESOLVED (2026-04-21)
~~No real product has been pushed through the full 14-stage operator flow since 2026-04-05.~~ RESOLVED by Phase 1 one-product full-pipeline validation on product 294 (D-212, 2026-04-21). Full Telegram intake → image gen → visual approval → wizard → confirmation → GeoBot handoff → content generation → audit → activation → website/IG carousel/FB multi-photo/X-with-image dispatch all verified green. Final remaining gap (X image rendering) closed by D-211 (`media_category=tweet_image` form-data part added to `uploadImageToX()`). Re-dispatch retest on product 294: `x.mediaUploaded=true`, `responseStatus=201`, `tweetId=2046379952245776422`. See PROJECT_STATE.md and DECISIONS.md D-211/D-212.

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

## 🟢 NOW — Current Sprint (PHASE 2 — TELEGRAM SN / OPERATOR CONTROLS — 2026-04-21)

### 🆕 D-220 — Product Intelligence Bot + GeoBot Handoff MVP IMPLEMENTED LOCAL (2026-04-21)
New photo-first content workflow — no existing pipeline touched. Triggered by Turkish hashtags `#geohazirla`, `#seoara`, `#productintel`, `#urunzeka` (reply-to-product or explicit `\d+`). Pipeline:

1. **Images** (`collectImages.ts`) — originals first (`product.images[]`), then generated (`product.generativeGallery[]`), then fallback `media` scan. Caps supporting at 6. Writes `conflicts` note if originals + 2+ generated coexist.
2. **Vision** (`analyzeProduct.ts`) — Gemini 2.5 Flash with `inlineData` base64 parts (up to 3 images). Detects productType, color, material, style, gender, useCases, visibleBrand, visualNotes.
3. **Reverse search** (`reverseImageSearch.ts`) — SerpAPI Google Lens. Ordering-based similarity capped at 85 so provider alone can never claim exact. Primary-image first, falls back to supporting[0] with a 10-point downgrade. Missing `SERPAPI_API_KEY` → `available: false` → matchType `visual_only_no_external_search` (not an error).
4. **Classification** (`decideMatchType` in `createProductIntelligenceReport.ts`) — `exact_match` requires BOTH provider `exact_match` AND vision-detected `visibleBrand`. Otherwise downgrades to `high_similarity`/`similar_style`/`low_confidence`.
5. **SEO + GEO pack** (`generateSeoGeoPack.ts`) — Gemini 2.5 Flash text, temperature 0.6, strict "do NOT copy reference-product sentences" rule in prompt. Produces `{seoPack: {seoTitle, metaDescription, productDescription, shortDescription, tags[], keywords[], faq[]}, geoPack: {aiSearchSummary, buyerIntentKeywords[], comparisonAngles[], productComparisonText, blogDraftIdea, publishNotes}, riskWarnings[]}`.
6. **Persistence** (`product-intelligence-reports` collection) — every attempt is a row (`status: draft → ready | failed`), so even crashes are traceable. JSON-typed columns for heavy structured fields to sidestep Neon `push:true` drift.
7. **Telegram** (`telegramReport.ts`) — Turkish HTML summary with 2×2 inline keyboard: `[✅ SEO Paketini Onayla | 📤 GeoBot'a Gönder] / [🔄 Yeniden Üret | 🚫 Reddet]`. Callbacks: `pi:approve:{id}`, `pi:sendgeo:{id}`, `pi:regen:{id}`, `pi:reject:{id}`.
8. **Handoff** (`geoBotHandoff.ts`) — on operator approval, preserve-existing merge into `product.content.{commercePack, discoveryPack}`: seoPack.productDescription → websiteDescription, seoPack.shortDescription → shopierCopy, seoPack.seoTitle → metaTitle, seoPack.metaDescription → metaDescription, seoPack.faq → faq, seoPack.keywords → keywordEntities, geoPack.blogDraftIdea → articleTitle. Sets `content.contentGenerationSource = 'product_intelligence'` if empty. Emits `bot-events` row `eventType='pi.sent_to_geo'`. GeoBot/channelDispatch publish as today — no new publishing path.

**Why it's safe to land:**
- Fully additive — no existing lib modified behaviorally.
- Four surgical splices in `route.ts`: `OPS_CB_PREFIXES += 'pi:'`, `isHashtagTrigger` regex adds four aliases, `OPS_HASHTAGS` adds four aliases, + new hashtag handler + new callback handler. No branch rewrite.
- `tsc --noEmit` clean: zero new errors, 4 pre-existing errors unchanged.
- Gated behind operator-typed Turkish hashtags — cannot auto-trigger on any existing flow.
- If Gemini key is missing, reports fail soft with a warning (not a throw).
- If SerpAPI key is missing, matchType is honestly `visual_only_no_external_search`.
- If reverse search returns no hits for primary, retries with supporting[0] (downgraded).
- Handoff never overwrites non-empty `content` fields — operator curation preserved.

**What's needed before first production run:**
- Neon DDL: `CREATE TABLE product_intelligence_reports (...)` with `payload_locked_documents_rels` column — per Blocker 0, `push:true` will NOT create this on prod. Capture DDL from local schema after merge.
- Optional: set `SERPAPI_API_KEY` if reverse image search is wanted. Without it, the bot still works — reports are honestly labeled `visual_only_no_external_search`.

**Follow-ups (LATER):**
- Wire SerpAPI key in Vercel env when operator is ready to activate reverse search.
- Optional: add an admin panel view over `product-intelligence-reports` for historical browsing.
- Optional: extend `createProductIntelligenceReport()` with a second reverse-search provider (e.g. Bing Visual Search) behind the same `available: false` graceful-fallback contract.
- Consider adding a `pi:regen` variant that lets the operator supply hint text (e.g. "this is a running shoe, not a hiking boot") — out of MVP scope.

### 🟡 Product #296 Content Generation Failed — Diagnostic Endpoint Deployed (2026-04-21, D-218)
Operator reported "blocker hatası alıyormn" — Telegram `/publish 296` audit returned `PARTIALLY READY (5/6)` with `❌ content: Content generation failed` as sole blocker. Prior Geo events (from operator screenshot): `content.commerce_generated` at 08:57 → audit at 09:15 flagged content failure, implying discovery pack generation (or revalidation) failed between commerce success and audit.

Diagnosis path blocked initially: admin session cookie had expired, so Payload REST couldn't be queried. Built transient endpoint `/api/admin/product-diagnostic?productId=<id>` (commit `ae7765b` + `9925d23`) accepting EITHER `x-admin-secret: $GENERATE_API_KEY_SECRET` header OR a valid Payload admin session cookie. Returns: workflow statuses, commercePack/discoveryPack presence summary, sourceMeta.shopierProductId, last 25 `bot-events` for the product including `payload.error` from `content.failed` records.

**Smallest correct next step for 296:** send `/content 296 retry` in GeoBot Telegram — `canRetriggerContent()` in `src/lib/contentPack.ts:282` permits `failed → retry` when `isContentEligible(product)` passes. If the failure was transient (Gemini rate limit / token issue), retry succeeds and the audit re-runs clean. If structural, the retry surfaces the concrete error string which we then inspect via D-218 to decide the real fix.

D-218 is transient — safe to remove after content/audit debugging stabilizes.

### ✅ Shopier Size Selector Flow PROD-VALIDATED on Product 294 (2026-04-21)
**Live:** https://www.shopier.com/46374845 renders `<select name="size">` with options `43, 44, 45` matching Payload variants 86/87/88. `sourceMeta.shopierSyncStatus=synced`, `shopierLastError=null` as of cron tick 04:30:28 UTC.

Three-part fix:
- **D-213** (commit `f75de51`, Vercel `CjiKMqyXZ`): `listSelections(100) → listSelections(50)` in `src/lib/shopierSync.ts:67`. Shopier `/selections` caps at 50 → previous `limit=100` returned HTTP 400 → `selections` Map was silently empty → `buildShopierVariants()` returned empty variants → Shopier products created without size selector.
- **D-214** (commit `af0437a`, Vercel `3WoeLYjZY`): Secret-guarded `GET /api/admin/shopier-resync?productId=<id>` or `?all=true` — stand-by operator tool for bulk backfill / disaster recovery. Same `GENERATE_API_KEY_SECRET` guard as `/api/generate-api-key`. Not used in the product 294 fix (the admin REST PATCH path worked), but kept available.
- **D-215** (commit `dd999a3`, Vercel `E7NE2aJZw`): `ShopierVariantInput.selectionId: string → string[]` and `buildShopierVariants()` emits `[selectionId]`. Shopier's REST API accepts `selectionId` as `string[]` on POST/PUT bodies but returns it as `string` on GET responses; input type was mistakenly modeled on the response shape. Surfaced only after D-213 started resolving real selection IDs.

**Trigger path used:** admin REST PATCH on `/api/products/294` with `sourceMeta: { forceRedispatch: true, forceRedispatchChannels: ['shopier'] }` → afterChange hook queued `shopier-sync` job → next cron tick (10-min cadence) ran `syncProductToShopier()` → Shopier accepted the update.

### ✅ Shopier Wizard Categories Seeded (2026-04-21, D-217)
Operator requested adding the 6 Telegram wizard categories to Shopier so product syncs stop silently falling back to "first available". Added admin-auth endpoint `/api/admin/shopier-categories` (GET list, POST ensure). Seeded 5 missing categories; **Günlük** already existed.

Current Shopier categories:

| title   | id                 | placement |
|---------|--------------------|-----------|
| Günlük  | `6b59e27730d800f7` | 1         |
| ayakkab | `f440b506ca57b2d1` | 1         |
| Spor    | `dd158ac4ccd8d5ec` | 2         |
| Klasik  | `fc356eea18a4aa98` | 3         |
| Bot     | `7cd3c86a052248e8` | 4         |
| Terlik  | `39231418b67404e0` | 5         |
| Cüzdan  | `a707d600ac9ca58d` | 6         |

Notes:
- `ayakkab` is an operator typo from Shopier admin UI — left as-is; rename/delete manually on Shopier if desired.
- `getShopierMappings()` has a 5-min cache TTL, so new product syncs pick up the new categories on next cold start or after TTL expires.
- Existing synced products still point to the old `Günlük` default; re-syncing them to switch categories would still hit the D-216 churn for variant-less products.
- D-217 endpoint is transient — safe to remove once Shopier category list is considered stable.

---

**Bulk backfill DONE (2026-04-21, D-216):** 7 previously-synced products (285, 286, 288, 289, 290, 293, 295) were re-dispatched via admin REST PATCH; cron ticks 05:30 + 05:40 UTC processed the queue. Findings:
- Only product 294 has variants in Payload — the 7 others have `variants: []`, so their Shopier pages correctly have no size selector (reflects Payload reality, not a sync bug).
- **D-208b fallback churn:** variant-less UPDATE returns 403/404 → CREATE fallback fires → new Shopier ID every re-sync cycle. Old Shopier IDs become orphans (redirect to seller root). Only product 294 preserved its ID 46375838.
- **Product 288 stuck:** `forceRedispatch` didn't reset (hook no-op on `true → true` transition); 288 still on stale Shopier ID 46176930 (orphaned).

Follow-up items (LATER):
- Investigate root cause of UPDATE failure for variant-less products (capture one failing PUT body + Shopier response from Vercel logs).
- Add variant-count guard in `publishProductToShopier()` to avoid D-208b churn (e.g. if `variants.length === 0`, skip UPDATE or pass a sentinel).
- Manually unstick product 288 (PATCH `forceRedispatch: false` first, then `true`) when Shopier sync is next touched.
- D-214 endpoint cleanup still OK to defer — no bulk operations active.

### ✅ Phase 1 — One-Product Full Pipeline Validation: CLOSED (2026-04-21)
- Product 294 end-to-end green: Website/homepage ✅, Instagram carousel ✅, Facebook multi-photo ✅, X with image ✅
- Final blocker resolved by D-211: `media_category=tweet_image` now sent to X API v2 `/2/media/upload`
- Retest confirmation: `x.mediaUploaded=true`, `responseStatus=201`, `tweetId=2046379952245776422`
- D-212 closes Phase 1; D-211 is the underlying code change (commit `fc0b3ed`, PR #3)
- Scope of Phase 1 closure: docs-only — no runtime code touched beyond D-211 X fix
- See PROJECT_STATE.md + DECISIONS.md D-211 + D-212

### 🎯 Phase 2 — Telegram SN / Operator Controls: NEW PRIORITY (2026-04-21)
Now that the one-product pipeline is proven end-to-end, the next phase is operator control surfaces:
- Stock-number / SN based operator commands (details to be scoped per operator session)
- Operator-facing controls for day-to-day pipeline steering from Telegram
- Explicitly OUT OF SCOPE for Phase 2: image pipeline (v50 stays LOCKED), GEO/blog engine, Shopier automation

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

### ✅ Phase O — Group Workflow Parity: DEPLOYED (2026-04-09)
- Fixed 3 group gate gaps: caption_entities, hashtag triggers, STOCK prefix
- `#gorsel 180` now works in group without @mention
- Photo + `@Geeeeobot` caption now passes gate (caption_entities checked)
- `STOCK SKU:...` now passes gate without @mention
- `onayla`/`reddet` correctly require reply-to-bot (contextual — operator replies to preview)
- Wizard chatId limitation RESOLVED — Phase P session isolation deployed (D-143)
- 12 tests passed (8 gate + 4 real-data)
- D-142

### ✅ Phase X — Telegram Content Preview + Wrong-Bot Redirect: DEPLOYED (2026-04-09)
- Part A: `formatContentPreviewMessage()` shows actual channel copy (IG, FB, web, Shopier, X) + SEO summary
- Content-ready notification now includes Instagram caption snippet preview
- `geo_content` callback and `/content {id}` command show preview + action buttons (Audit / Yayına Al)
- Part B: Photo → GeoBot DM gets "send to @Uygunops_bot" with role explanation
- Photo → GeoBot group with @mention gets same redirect
- 4 webhook tests passed (content preview, DM photo, group photo, /content command)
- Commit: c50517f
- D-151

### ✅ Phase W — Instagram Live Publish Validation: PROD-VALIDATED (2026-04-09)
- First REAL Instagram post via manual Graph API: postId=18337760137169144
- Permalink: https://www.instagram.com/p/DW6nLC_DgQP/
- Token + API path validated. Cold-start media URL issue identified.
- D-149

### ✅ Phase W1 — Automated Instagram Dispatch Reliability: PROD-VALIDATED (2026-04-09)
- `prewarmMediaUrl()` added to channelDispatch.ts — fetches image URL before Graph API call
- Populates Vercel CDN edge cache so Instagram's fetch gets cache HIT (no cold-start)
- Retry on error 9004 (media download failure) with 3s delay
- Same pre-warm applied to Facebook direct publish path
- Automated dispatch confirmed working: postId=18111402145693915
- Permalink: https://www.instagram.com/p/DW6qQFwEl8T/
- GeoBot instagramCaption used, dispatchedChannels=["instagram"], mode=direct
- No manual fallback needed — fully automated end-to-end
- Vercel Blob migration NOT required — pre-warm sufficient for reliability
- Commit: f0fd0eb
- D-150

### ✅ Phase U — GeoBot One-Tap Post-Handoff: DEPLOYED (2026-04-09)
- GeoBot handoff/content messages now have inline action buttons
- 5 new callback handlers: geo_content, geo_audit, geo_auditrun, geo_activate, geo_retry
- Full publish workflow navigable via buttons: content status → audit → activate
- Content-failed shows retry button
- All slash commands remain as fallback
- 9 webhook tests passed
- D-148

### ✅ Phase T2 — One-Tap Wizard Launch: DEPLOYED (2026-04-09)
- Image approval now shows inline button "📋 Bilgileri Gir → Onaya Gönder" instead of text nudge
- `wz_start:{productId}` callback launches wizard with same logic as `/confirm {id}`
- Visual gate, already-confirmed, nonexistent product — all handled
- Manual `/confirm` remains as fallback
- `wz_start:` added to OPS_CB_PREFIXES for Phase R routing
- 9 webhook tests passed
- D-147

### ✅ Phase T1 — Title + Stock Code Intake: DEPLOYED (2026-04-09)
- Wizard now asks for real product title (if placeholder "Taslak Ürün ...")
- Wizard asks for operator's own stock code (stored in `sku` field, skip with `-`)
- Image approval success message now shows `/confirm {id}` next step
- Updated wizard flow: title → stockCode → category → productType → price → sizes → stock → brand → targets → summary → confirm
- No schema changes — uses existing `title` and `sku` fields
- 9 webhook tests passed
- D-146

### ✅ Phase S — GeoBot Visible Handoff: DEPLOYED (2026-04-09)
- After Ops Bot confirms a product, GeoBot visibly takes over via Mentix group notification
- GeoBot reports content generation results (ready/failed) with actionable next steps
- `sendTelegramMessageAs(token, chatId, text)` helper for cross-bot messages in route.ts
- `notifyGeoBot(chatId, text)` helper in contentPack.ts with Mentix group ID constant
- Operators now see the two-bot workflow: Ops Bot confirms → GeoBot announces takeover → GeoBot reports content results
- 9 validation tests passed (token, send capability, 6 routing tests)
- D-145

### ✅ Phase R — Command Ownership Split: DEPLOYED (2026-04-09)
- Ops Bot owns: /confirm, /stok, /diagnostics, #gorsel, #geminipro, image/wizard callbacks, STOCK
- GeoBot owns: /content, /audit, /preview, /activate, /shopier, /merch, /story, story callbacks
- /pipeline shared on both bots
- Wrong-bot commands return clear Turkish redirect messages
- 18 webhook tests passed (5 redirect ops, 6 redirect geo, 2 shared, 5 correct-bot)
- D-144

### ✅ Phase P — Group Wizard Session Isolation: VERIFIED (2026-04-09)
- Refactored wizard session key from `chatId` to `chatId:userId`
- Each operator gets isolated wizard session in group context
- No breaking change: DM behavior preserved (userId still passed, key just has redundant suffix)
- `sessionKey()` helper in confirmationWizard.ts, 36 call sites updated in route.ts
- Phase Q validation: 28/28 unit tests + 12 production webhook simulations passed
- D-143

### ✅ Vercel Build Optimization: DEPLOYED (2026-04-09)
- `ignoreCommand` in vercel.json skips builds for docs-only commits
- Runtime paths: `src/`, `public/`, config files (`payload.config.ts`, `next.config.ts`, `package.json`, etc.)
- Non-runtime paths: `project-control/`, `ai-knowledge/`, `docs/`, `mentix-*`, `n8n-workflows/`, `scripts/`, `media/`, root `.md`/`.html`
- Saves ~40% of wasted build minutes based on recent commit history
- Safety: always builds on first deploy, empty diff, or mixed (docs+runtime) commits
- To force a build: use Vercel dashboard Redeploy, or touch any `src/` file
- D-141

### ✅ Phase N — Bot Role Separation: DEPLOYED (2026-04-08)
- Geo_bot (@Geeeeobot) = GROUP ONLY operator bot → DMs redirect to @Uygunops_bot
- Uygunops (@Uygunops_bot) = DM ONLY operator bot → group messages silently ignored
- Both bots share same full command surface, context gates prevent overlap
- 8 webhook tests passed: DM/group × message/callback × both bots
- D-140

### ✅ Multi-Bot Support — Geo_bot (@Geeeeobot) Live in Mentix Group: DEPLOYED (2026-04-08)
- Geo_bot (`@Geeeeobot`, ID `8728094008`) shares same webhook handler via `?bot=geo`
- Webhook: `https://www.uygunayakkabi.com/api/telegram?bot=geo` with shared secret_token
- Geo_bot added to Mentix Grup Bot group, privacy mode disabled
- D-139

### ✅ Geobot Group Onboarding Phases I/J/K/L: DEPLOYED + VALIDATED (2026-04-08)
- Phase I (D-136): Two safety gates for group chats — command-only filter + group allowlisting
- Phase J: Live Mentix group validation — all 5 scenarios passed in production
- Phase K (D-137): @mention and reply-to-bot activation alongside slash commands
- Phase L (D-138): Mention normalization — `@Bot /cmd` routes correctly, DM unchanged

### Remaining Geo_bot Group Limitations (Post Phase O)
1. ~~**Wizard session key**~~ — RESOLVED by Phase P (D-143). Session key now `chatId:userId`, each operator gets their own wizard in group context.
2. **Error noise** — error messages from failed workflows are sent to the group (visible to all members). Low impact since Mentix group is operator-only.
3. **Free-text routing** — `@Geeeeobot bu kaç lira` passes gates but has no handler (falls through harmlessly). Not a bug — just no free-text NLU.

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

### Per-Channel Redispatch Selector (Phase 1 closure follow-up — 2026-04-21)
- **Context:** During product 294 X retest, `sourceMeta.forceRedispatch=true` re-fired every channel not already marked `dispatched=true`. That re-posted IG + FB as a side effect while re-testing X.
- **Observed mechanics:** `forceRedispatchChannels` is read from `sourceMeta` by the afterChange hook (Products.ts:175) but is NOT a declared Payload schema field — a PATCH via Payload REST silently discards the unknown key (D-202 fallback logic then resolves to "channels not yet successfully dispatched").
- **Smallest correct fix (proposed, not yet scheduled):** declare `sourceMeta.forceRedispatchChannels` as an explicit `array` of select values in `src/collections/Products.ts` so Payload persists it cleanly, then honor it as an allow-list inside the afterChange hook.
- **Acceptance:** operator can redispatch only `['x']` without triggering IG/FB reposts; existing `forceRedispatch=true` path remains as an "all" shortcut.
- **Blast radius:** single schema field + single filter in dispatch selection. No publish code paths affected.
- **Status:** BACKLOG IMPROVEMENT (not a regression — existing behavior documented and understood)

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

**X (Twitter) Integration:** — PROD-VALIDATED (2026-04-21)
- Status: OAuth 1.0a user-context publishing live (D-195c). Media upload via v2 `/2/media/upload` with `media_category=tweet_image` (D-211).
- Prod-validated on product 294: `mediaUploaded=true`, `responseStatus=201`, `tweetId=2046379952245776422`.
- Tweet text source: `commercePack.xPost` if present, otherwise fallback (see `src/lib/channelDispatch.ts`).
- ~~Real integration needs: X API v2 POST /2/tweets + OAuth 2.0 PKCE~~ (superseded by OAuth 1.0a path).
- Token refresh: access ~2hr, refresh ~6mo

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


---

## CONTENT ARCHITECTURE — Implementation Phases (2026-04-07)

**Status:** PLANNED — Awaiting operator approval to begin

### Phase A — Wire Content to Storefront (HIGHEST PRIORITY)
- [x] Product page: render `commercePack.websiteDescription` (fallback to `description` if empty)
- [x] Product page: render `commercePack.highlights` as feature bullet list
- [x] Product page: render `discoveryPack.faq` as expandable FAQ accordion
- [x] Product page <head>: use discoveryPack.metaTitle + metaDescription for SEO meta
- [x] Product page: add JSON-LD Product structured data
- [x] Product page: add JSON-LD FAQPage structured data (if FAQ exists)

### Phase B — Blog Frontend
- [x] Create `/blog` listing page (published BlogPosts, paginated)
- [x] Create `/blog/[slug]` detail page (article body, featured image, SEO fields)
- [x] Blog detail page: proper `<head>` meta from BlogPost.seo fields
- [x] Blog listing: category filter (category badge display — filter UI deferred)
- [ ] Add blog posts to sitemap.xml (deferred — no sitemap.xml exists yet)

### Phase C — Channel Dispatch Wiring
- [ ] Instagram dispatch: use `commercePack.instagramCaption` instead of building from `description`
- [ ] Shopier dispatch: use `commercePack.shopierCopy` for product description
- [ ] X dispatch: use `commercePack.xPost` when X channel goes live
- [ ] Facebook dispatch: use `commercePack.facebookCopy` when Facebook channel goes live

### Phase D — Content Quality (DEFERRED)
- [ ] Operator content review UI in admin (preview all 5 channel copies)
- [ ] Content regeneration on product field update
- [ ] Analytics feedback loop (click-through, engagement)

### Dependencies
- Phase A has NO blockers — can start immediately
- Phase B has NO blockers — can run parallel with Phase A
- Phase C depends on channel integrations being live
- Phase D is future enhancement


---

## Storefront UX Polish (D-257 → D-261) — COMPLETED 2026-05-07

- [x] D-257: Homepage/listing → PDP clickthrough polish
- [x] D-258: Homepage trust / order flow clarity, brand copy
- [x] D-259: Catalog browse clarity — dynamic heading, sort, count, scoped size filter
- [x] D-260: Mobile catalog filter drawer — sticky bar + bottom sheet
- [x] D-261: PDP trust/delivery/FAQ clarity — trust grid, process steps, always-on FAQ, success state

## OOS Size Recovery / Alternative Inquiry Path (D-264) — COMPLETED 2026-05-08

- [x] D-264: OOS size chips → `<a href="#inquiry-form">` anchors (dashed border, pointer cursor)
- [x] D-264: Context-aware size-help note — mixed-stock variant ("Üzeri çizili bedenler için...")
- [x] D-264: ContactForm `chipSelected` state separates chip vs typed size
- [x] D-264: OOS recovery text input shown when no chip selected ("Stokta olmayan beden mi arıyorsunuz?")

## Size Guidance / Fit Confidence Polish (D-263) — COMPLETED 2026-05-08

- [x] D-263: Size-help reassurance note below size display chips (page.tsx)
- [x] D-263: Inquiry form heading → "Sipariş Ver veya Beden Sor" + subtitle (page.tsx)
- [x] D-263: Process step 2 → "Beden & Teslimat Netleşir" (page.tsx)
- [x] D-263: ContactForm size chip label "(opsiyonel)" + "proceed without size" hint (ContactForm.tsx)

## Sitewide Contact / WhatsApp Fast-Path Polish (D-262) — COMPLETED 2026-05-08

- [x] D-262: Catalog contact nudge strip below product grid
- [x] D-262: ProductDetail WA label → "WhatsApp'tan Bilgi Al" + sz in message
- [x] D-262: PDP WA label + message intent clarified
- [x] D-262: Mobile sticky CTA split — 40% WA / 60% inquiry form

## Production Data Cleanup — COMPLETED 2026-05-07
- [x] 38 test products + 164 variants + 161 media + 20 PI reports deleted (scripts/production-cleanup.mjs)
- [ ] Manual cleanup pending: Shopier panel, Meta Business Suite, X test tweets, Payload Admin media


## OOS Size Auto-Prefill / Recovery UX Polish (D-265) — COMPLETED 2026-05-08

- [x] D-265: New `OOSChip.tsx` client component — fires `CustomEvent('oosChipClicked')` + smooth-scrolls to `#inquiry-form`
- [x] D-265: ContactForm `useEffect` listener → auto-prefills `size` state + sets `oosContext` when OOS chip tapped
- [x] D-265: Amber contextual banner in ContactForm — "{size} numara şu an stokta görünmüyor. Talep bırakın..."
- [x] D-265: Amber input border when `oosContext` active; clears on manual edit or success reset
- [x] D-265: page.tsx OOS `<a href="#inquiry-form">` chips replaced with `<OOSChip size={variant.size} />`
- [x] D-265: Commit `e8ea373` pushed to main

## Catalog / Site Search & Quick-Find (D-266) — COMPLETED 2026-05-08

- [x] D-266: Audit catalog discovery flow — confirmed zero search existed, all product data loaded client-side
- [x] D-266: Add `query` state + `searchFiltered` pipeline to `Catalog` component
- [x] D-266: Search bar JSX — pill-shaped, search icon, ✕ clear, always visible above desktop controls (also on mobile)
- [x] D-266: Result count shows `· "query"` when search active
- [x] D-266: Mobile sticky bar — search active pill `🔍 "query" ✕` appears in pills row; tap to clear
- [x] D-266: Search-aware empty state — custom heading/body/CTA when query is active; "Aramayı Temizle" CTA
- [x] D-266: `resetFilters` now also clears `query`
- [x] D-266: Commit `6e796c2` pushed to main

## PDP Alternative Product / Similar Model Recovery Path (D-267) — COMPLETED 2026-05-08

- [x] D-267: Audit PDP layout — confirmed zero alternative-product path existed
- [x] D-267: Server-side Payload query in page.tsx — same category, exclude current, exclude drafts, max 6, sort -createdAt
- [x] D-267: "Benzer Modeller" JSX section — responsive auto-fill grid, image+title+price cards, zero-state safe
- [x] D-267: Commit `b87a5ef` pushed to main

## PDP & Card Price / Stock / Discount Clarity Polish (D-268) — COMPLETED 2026-05-08

- [x] D-268: Audit card + PDP price/discount/stock display — identified 4 weak points
- [x] D-268: Card originalPrice readability (size 12→13px, color 0.3→0.4 opacity)
- [x] D-268: Discount badge everywhere: `%{N}` → `%{N} indirim` (cards + ProductDetail + PDP)
- [x] D-268: PDP stock badge: "Stokta" → "Stokta · N beden" with available size count
- [x] D-268: PDP BEDEN section label: "BEDEN — N stokta" count when sizes available
- [x] D-268: Commit `fc21ecd` pushed to main

## PDP Product Image / Gallery Usability Polish (D-269) — COMPLETED 2026-05-08

- [x] D-269: Audit PDP gallery — confirmed 5 weak points (swipe, opacity, overflow, ring, transition)
- [x] D-269: Mobile touch swipe (onTouchStart/End, 50px delta, left=next, right=prev)
- [x] D-269: Image fade-in on change (key={activeIndex} + @keyframes pdpImgFadeIn 0.22s)
- [x] D-269: Thumbnail row overflowX auto + scrollbar hidden (no clip on narrow screens)
- [x] D-269: Active thumbnail outer glow ring (boxShadow 0 0 0 3px)
- [x] D-269: Inactive thumbnail opacity 0.5→0.65, border transparent→rgba(0.12)
- [x] D-269: Commit `420e60d` pushed to main

## PDP Zoom / Fullscreen Image Inspection (D-270) — COMPLETED 2026-05-08

- [x] D-270: Audit D-269 gallery — confirmed no tap-to-fullscreen path existed
- [x] D-270: isFullscreen state + useEffect (Escape key + body scroll lock)
- [x] D-270: Fullscreen overlay — fixed, dark backdrop, fade-in animation, tap to close
- [x] D-270: Fullscreen prev/next arrows + swipe reused from D-269
- [x] D-270: Close: X button (44px), tap backdrop, Escape key
- [x] D-270: Inline: cursor zoom-in, Büyüt hint, arrow stopPropagation
- [x] D-270: Commit `c01b3ec` pushed to main

## Mobile Image Loading Performance (D-271) — COMPLETED 2026-05-08

- [x] D-271: Audit — confirmed no `loading` attributes on any storefront `<img>` tags; no `fetchPriority` on critical above-fold images
- [x] D-271: `ProductImages.tsx` — PDP hero image: `fetchPriority="high"` + `loading="eager"`; thumbnails: `loading="lazy"`
- [x] D-271: `page.tsx` — similar products section `<img>`: `loading="lazy"` (below-fold)
- [x] D-271: `UygunApp.jsx` — card product images: `loading="lazy"`; hero Unsplash image: `fetchpriority="high"`; cart drawer thumbnails: `loading="lazy"`; ProductDetail thumbnails: `loading="lazy"`; ProductDetail main image: `fetchPriority="high"` + `loading="eager"`
- [x] D-271: Commit `38d5f0d` pushed to main

## Cart / Checkout Expectation Clarity (D-272) — COMPLETED 2026-05-08

- [x] D-272: Audit — VERIFIED `page.tsx` "SEPETE EKLE" button had no `onClick` (dead-end); cart drawer had no process explanation; WA button said "SİPARİŞ VER" (implies instant order); ProductDetail had no process note
- [x] D-272: `UygunApp.jsx` cart drawer — added process note between total and WA button: "Talebiniz WhatsApp'tan ekibimize iletilir — ekibimiz sizi arar ve siparişi birlikte tamamlar."
- [x] D-272: `UygunApp.jsx` cart CTA — "WHATSAPP İLE SİPARİŞ VER" → "WHATSAPP İLE TALEBİNİZİ İLETİN" (honest: it's a request, not a completed order)
- [x] D-272: `UygunApp.jsx` ProductDetail trust badges — added process hint: "Sepete ekleyip WhatsApp'tan sipariş talebinizi iletebilirsiniz — ekibimiz sizi arar ve süreci tamamlar."
- [x] D-272: `page.tsx` — replaced non-functional "SEPETE EKLE" `<button>` (no onClick) with `<a href="#inquiry-form">` labeled "TALEBİNİZİ OLUŞTURUN"; STOKTA YOK disabled state preserved
- [x] D-272: Commit `50785a9` pushed to main

## Contact Form Validation / Submission Confidence (D-273) — COMPLETED 2026-05-08

- [x] D-273: Audit — VERIFIED no client-side validation; API error body discarded; no "(zorunlu)" on required fields; error message rendered below submit (invisible on mobile); generic error regardless of cause
- [x] D-273: Added `phoneError` + `nameError` state; `phoneRegex` constant mirrors server-side rule
- [x] D-273: Client-side validation before fetch — name ≥2 chars → "Adınızı eksiksiz girin."; phone regex fail → "Lütfen geçerli bir telefon numarası girin (Örn: 0533 123 45 67)."
- [x] D-273: API 400 phone error now read from response body and shown as field-level error; status reset to idle so user can fix and resubmit
- [x] D-273: Added "(zorunlu)" label suffix on Name + Phone fields (matches existing "(opsiyonel)" on Beden)
- [x] D-273: Phone helper text: "Sizi arayabilmemiz için güncel numaranızı girin."
- [x] D-273: Error box moved above submit button; styled with bg-red-50 border; distinguishes network vs server errors
- [x] D-273: Loading text: "Gönderiliyor…" → "Talebiniz gönderiliyor…"
- [x] D-273: Field borders turn red on error; cleared automatically when user edits
- [x] D-273: All D-251 attribution, D-265 OOS flow, D-264 chip flow — fully preserved
- [x] D-273: Commit `ea870d8` pushed to main

## Header / Navigation / Sitewide Entry Clarity (D-274) — COMPLETED 2026-05-08

- [x] D-274: Audit — VERIFIED desktop nav had no active-state visual indicator; mobile menu items were all same color (no active highlight); mobile menu had bare WA button with no section label; footer "Sipariş" column name was misleading (just a WA link)
- [x] D-274: Desktop nav links — added `borderBottom: 1.5px solid` indicator (transparent when inactive, `T.text` when active page); `paddingBottom: 4` for clean underline spacing
- [x] D-274: Mobile menu items — `color: pg === l.k ? T.text : "rgba(28,26,22,0.52)"` (inactive items visually muted); active item underline mirrors desktop; `›` chevron added on right for visual path hint; flex layout for label + chevron
- [x] D-274: Mobile menu — "Yardım & İletişim" section label added above WA button; WA button text "WhatsApp ile Yaz" → "WhatsApp ile İletişim Kur"
- [x] D-274: Footer "Sipariş" column heading → "Yardım" (honest label for what is actually a WA contact link)
- [x] D-274: Commit `9e5a087` pushed to main

## Help / FAQ / Contact Destination Polish V1 (D-275) — COMPLETED 2026-05-09

- [x] D-275: Audit — VERIFIED no standalone help/contact destination in SPA; footer "Yardım" column = lone WA button; mobile menu = lone WA button; no grouped help topics outside PDP; `ProductFAQ` and `ContactForm` exist only on PDP
- [x] D-275: New `HelpContactPage` component (`pg === "contact"` SPA view) — header "Yardım Merkezi / Sıkça Sorulan Sorular"; compact 4-step process summary (reuses `STEPS_DATA`); 3 FAQ groups (Ürün & Beden, Sipariş & Ödeme, Teslimat & Süreç) with accordion items; CTA block — primary "Ürünleri İncele" → catalog, secondary WA fast-help; `Footer` included
- [x] D-275: `HelpFAQItem` accordion component — `+`/`−` expand toggle, beige card style consistent with `ProductFAQ`
- [x] D-275: Nav `links` array — added `{ k: "contact", l: "YARDIM" }` (desktop active-underline + mobile active-state patterns from D-274 applied automatically)
- [x] D-275: Mobile menu "Yardım & İletişim" section — added navigable "YARDIM MERKEZİ" entry with D-274 active-state style + `›` chevron; WA button preserved below
- [x] D-275: Footer "Yardım" column — added `S.S.S. & Yardım Merkezi` nav link above WA button
- [x] D-275: URL sync — `nav("contact")` → `/yardim`; mount path detection `path === "/yardim"` → `sPg("contact")`
- [x] D-275: Commit `7a1915e` pushed to main

## Store Credibility / About / Why-Us Polish V1 (D-276) — COMPLETED 2026-05-09

- [x] D-276: Audit — VERIFIED WHY_US_CARDS 4+5 were internal-ops language (AI system, digital presence) with zero buyer relevance; AboutSection had 2 AI/digital-ops paragraphs; TrustValueSection opening had "modern dijital satış sistemi" jargon; last trust bullet was vague
- [x] D-276: `WHY_US_CARDS` — card 4 (🤖 "Yapay Zekâ Destekli Sistem") → (🤝 "Kişisel Alışveriş Desteği") with personal callback support copy; card 5 (🌐 "Güçlü Dijital Varlık") → (📦 "Anlaşılır Sipariş Süreci") with step-by-step process copy
- [x] D-276: `WhyUsSection` subtitle — "modern dijital sistemleri bir araya getirmemizden" → "kaynağından seçilmiş ürünleri, kişisel destek ve anlaşılır bir süreçle buluşturuyoruz"
- [x] D-276: `AboutSection` — removed AI/digital-ops pivot paragraphs; replaced with buyer support copy ("Talep bıraktığınızda ekibimiz sizi kısa sürede arar..."); closing "daha akıllı bir modelle" → "kişisel destekle"; brand badge "akıllıca sunulmuş" → "kişisel destek"
- [x] D-276: `TrustValueSection` — opening "modern bir dijital satış sistemiyle" → "kişisel destek ve anlaşılır bir alışveriş deneyimiyle"; last bullet "Sipariş sürecinde baştan sona destek" → "Beden seçiminden teslikata kadar adım adım destek"
- [x] D-276: Commit `a37e808` pushed to main

## Homepage Category / Intent Entry Polish V1 (D-277) — COMPLETED 2026-05-09

- [x] D-277: Audit — VERIFIED `CategoryOverlay` was at homepage position 8 (after Hero, WhyUs, Popular, Steps, BestSellers, About, Trust) — most visitors never reached it; no heading or intent framing; chips had tiny padding (9px 20px); no "Tüm Ürünler" fallback for undecided visitors
- [x] D-277: `CategoryOverlay` upgraded — proper section with `KATEGORİ` eyebrow + `Ne Arıyorsunuz?` heading + subtext; chip padding 9px→13px; chip icons 15→18px; `Tüm Ürünler →` dark button added as fallback CTA
- [x] D-277: `CategoryOverlay` moved from position 8 → position 3 (right after `WhyUsSection`, before Popular grid) — category entry is now 3rd thing a visitor sees, not 8th
- [x] D-277: Commit `9050542` pushed to main

## SupplierScout Autonomous Supplier Bot (D-278) — IMPLEMENTED 2026-05-09

### Code Complete — Awaiting Neon DDL + Env Vars + Deploy

- [x] D-278: types.ts — all SupplierScout TypeScript types (MessageClass, ParsedProductOffer, SoldOutMatchResult, AutoCreateGateResult, etc.)
- [x] D-278: 9 Payload collections created in src/collections/supplier/
  - SupplierGroups, WholesaleOpportunities, SupplierActionsLog, SupplierDailyReports, SupplierTrustScores
  - SupplierGroupMemory, SupplierSellerMemory, SupplierLanguageMemory, SupplierCorrectionMemory
- [x] D-278: SupplierScoutSettings global created (frankChatId, margin, thresholds, pause toggle)
- [x] D-278: Products.ts extended — supplier_scout source + supplierMeta group (stockMode, wholesalePrice, etc.)
- [x] D-278: classifier.ts — Gemini 2.5 Flash NLP, 11 message classes, Turkish slang seed, heuristic fallback
- [x] D-278: parser.ts — price/size/name extraction, computeWebsitePrice, parseSoldOutSignal
- [x] D-278: soldoutMatcher.ts — 6-signal scored matching, applySoldOut, threshold routing
- [x] D-278: productCreator.ts — 9-condition auto-create gate, buildSizeList, autoCreateProduct
- [x] D-278 Phase 3A Fix 1 — autoCreateProduct() 5-bug fix VERIFIED 2026-05-13 (commits 0950a579 + ed3a95e9):
  - Nested group fields: all supplierMeta/automationMeta/workflow/channels were dot-notation flat keys (Payload v3 silently drops) → now proper nested objects
  - Variant field names: stockQuantity→stock, sku→variantSku (per Variants.ts schema)
  - channels.publishWebsite: forced false (Products.ts defaultValue=true would publish drafts to website)
  - workflowStatus: 'intake'→'draft' (invalid Payload select value → ValidationError on create)
  - contentStatus: 'not_started'→'pending' (invalid Payload select value → ValidationError on create)
  - Controlled test: WO#31 → Product #330, 20/20 verification conditions passed, RolvoDropIthal untouched
- [x] D-278: memory.ts — language/seller/correction CRUD, trust score, action logger
- [x] D-278: reportGenerator.ts — buildDailyReport, formatDailyReport (9 sections), saveDailyReport
- [x] D-278: commands.ts — 14 DM commands including /teach, /memory, /seller, /corrections, /learning_today
- [x] D-278: telegram.ts — scoutSendMessage, scoutAnswerCallback, scoutGetFileUrl, scoutDownloadPhoto, registerScoutWebhook
- [x] D-278: /api/supplier-scout/route.ts — full webhook + cron + health endpoint
- [x] D-278: payload.config.ts updated — all 9 collections + SupplierScoutSettings global registered
- [x] D-278: project-control/SUPPLIER_SCOUT.md — architecture, design decisions, Neon DDL, env vars
- [x] D-278: project-control/SUPPLIER_SCOUT_RUNBOOK.md — operator runbook, setup steps, commands, troubleshooting

### Remaining Before Activation (BLOCKER)

- [ ] Apply Neon DDL from SUPPLIER_SCOUT.md (all 9 tables)
- [ ] Add 3 env vars in Vercel: SUPPLIER_SCOUT_BOT_TOKEN, SUPPLIER_SCOUT_WEBHOOK_SECRET, SUPPLIER_SCOUT_ADMIN_SECRET
- [ ] Deploy to production
- [ ] Register webhook: GET /api/supplier-scout?action=register_webhook&secret=...
- [ ] Send /start to bot (registers frankChatId)
- [ ] Add first supplier group in admin with autoCreateEnabled=false
- [ ] Add bot to supplier groups as admin
- [ ] Add Vercel Cron (30 20 * * * for 23:30 Istanbul)
- [ ] Monitor for 2-3 days before enabling autoCreateEnabled=true per group

## Homepage Quick-Start Search Shortcut (D-279) — COMPLETED 2026-05-09

- [x] D-279: Audit — VERIFIED no search input anywhere on homepage; D-266 catalog search lives only in `Catalog` component's local `query` state (inaccessible from homepage); `CategoryOverlay` (D-277) had category chips + "Tüm Ürünler →" but no text search
- [x] D-279: `initQuery` state added to App (`useState("")`) — seeds Catalog search query on navigation from homepage
- [x] D-279: `nav()` extended with `q` third param — `if (q !== undefined) sInitQuery(q); else sInitQuery("")` — clears query cleanly on bare `nav("catalog")` calls
- [x] D-279: `Catalog` render call updated — `initQuery={initQuery}` prop added
- [x] D-279: `Catalog` component signature updated — accepts `initQuery` prop; `query` state seeded from `useState(initQuery || "")`
- [x] D-279: `CategoryOverlay` upgraded with search form — `searchVal` local state, `handleSearch` form submit, `<form>` with red Ara button; on submit with non-empty val calls `onNav("catalog", null, q)`; CategoryOverlay subtext updated to "Bir kategori seçin veya model ara"
- [x] D-279: Commit `2fa6084` — push pending (GitHub unreachable at time of commit; push when network recovers)


## Homepage Discovery Hierarchy Polish (D-280) — COMPLETED 2026-05-10

- [x] D-280: Audit — VERIFIED homepage order was: Hero → WhyUsSection (6 credibility cards) → CategoryOverlay (search + chips) → Popular. WhyUs was blocking access to search/category on mobile (6 stacked cards = significant scroll). CategoryOverlay eyebrow was "KATEGORİ" (too narrow — section has search too). "Tüm Ürünler →" was a heavy dark chip competing with Hero's primary CTA. 3 catalog CTAs near each other (Hero + CategoryOverlay chip + Popular's Tümünü Gör).
- [x] D-280: `CategoryOverlay` moved immediately after Hero (before `WhyUsSection`) — discovery zone now comes before credibility. New homepage order: Hero → CategoryOverlay → WhyUs → Popular.
- [x] D-280: Eyebrow label: `KATEGORİ` → `KEŞFET` — signals both search AND category entry, not just categories
- [x] D-280: Helper copy updated: "Model veya beden arayın, bir kategori seçin ya da tüm koleksiyona göz atın" — all 3 entry modes named explicitly
- [x] D-280: "Tüm Ürünler →" demoted from heavy dark equal-weight chip to subtle muted text link below the chip row — reduces CTA noise near Hero
- [x] D-280: Commit `1bcc10ef` pushed to main (GitHub REST API; also includes classifier.ts D-278 isActionable fix + PROJECT_STATE.md updates)


## Homepage Product-First Scroll Path Polish (D-281) — COMPLETED 2026-05-10

- [x] D-281: Audit — VERIFIED mobile scroll depth to first product was ~3020px (~3.5 viewport heights). Order was: Hero → CategoryOverlay → WhyUsSection (6 stacked mobile cards ~1576px) → Popular Products. WhyUsSection was the main blocker on mobile. Desktop ~720px of credibility before first product.
- [x] D-281: Popular Products moved from position 4 → position 3 (after CategoryOverlay, before WhyUsSection). Mobile scroll to first product: ~3020px → ~1404px (~1.7 viewport heights). Visitors see real products before credibility content.
- [x] D-281: Popular Products top padding reduced: `100px 40px` → `60px 40px 100px` — section now adjacent to CategoryOverlay (72px section), tighter transition.
- [x] D-281: WhyUsSection becomes credibility reinforcement *after* visitor has seen real products — trust supports discovery, no longer delays it.
- [x] D-281: New homepage order: Hero → CategoryOverlay → Popular Products → WhyUsSection → Steps → BestSellers → About → Trust → Discounted → Footer
- [x] D-281: Commit `0e6222ff` pushed to main


## Homepage End-of-Page Exit Recovery (D-284) — COMPLETED 2026-05-11

- [x] D-284: Audit — VERIFIED: DiscountedSection ends cold (no bottom CTA — "Tümünü Gör →" is in header, not footer of section). Footer "Ayakkabılar" link is rgba(240,236,228,0.45) — near-invisible. If discounted=0, DiscountedSection returns null; visitor jumps TrustValueSection → Footer with CTAs already scrolled past.
- [x] D-284: PreFooterCTA component added (new function, ~40 lines) — compact centered strip between DiscountedSection and Footer
- [x] D-284: Renders unconditionally — catches both the discounted-products path and the null-discounted path
- [x] D-284: Primary CTA: "Tüm Ürünlere Göz At →" filled dark button → catalog
- [x] D-284: Secondary: "Yardım Merkezi →" text link → contact/help page
- [x] D-284: Eyebrow "KOLEKSİYON", heading "Beğendiğiniz Bir Şey Buldunuz mu?", warm tinted background
- [x] D-284: PreFooterCTA wired into homepage render with `onNav={nav}` and `settings={S}`
- [x] D-284: Browse hierarchy preserved: catalog primary, help secondary, WhatsApp in footer tertiary
- [x] D-284: Commit `de41f625` pushed to main

## Homepage Mid-Page Conversion Bridge (D-283) — COMPLETED 2026-05-11

- [x] D-283: Audit — VERIFIED: WhyUsSection and StepsSection were passive dead ends. WhyUsSection ends after 6 credibility cards with no forward path. StepsSection describes the 4-step order process starting with "browse products" but provided no link back to the catalog. Both sections explained well but left visitors stranded mid-page.
- [x] D-283: WhyUsSection: add `onNav` prop to function signature
- [x] D-283: WhyUsSection: add outline "Koleksiyonu Keşfet →" bridge button below credibility cards (guarded with `onNav &&`)
- [x] D-283: StepsSection: add `onNav` prop to function signature
- [x] D-283: StepsSection: add filled "Ürünleri Keşfet" primary button + helper text "Adım 1'den başlayın — göz atmak ücretsiz" below step cards (guarded with `onNav &&`)
- [x] D-283: WhyUsSection render call updated to pass `onNav={nav}` — bridge now active
- [x] D-283: StepsSection render call updated to pass `onNav={nav}` — bridge now active
- [x] D-283: Browse hierarchy preserved: product browsing primary, inquiry secondary, WhatsApp tertiary — no CTA conflict introduced
- [x] D-283: Both bridges guarded — zero risk if prop absent or section used outside homepage context
- [x] D-283: Commit `9ac8174` pushed to main

## Homepage Product-Section Hierarchy/Redundancy Polish (D-282) — COMPLETED 2026-05-10

- [x] D-282: Audit — VERIFIED: Popular Products and BestSellersScroll both used "POPÜLER" eyebrow. BestSellersScroll data was `slice(0,10)` — first 6 products identical to Popular grid. "Çok Satanlar" (Bestsellers) label not backed by actual sales data (risky authenticity). DiscountedSection already well-differentiated.
- [x] D-282: BestSellersScroll eyebrow: `POPÜLER` → `KOLEKSİYON` — eliminates duplicate-eyebrow confusion
- [x] D-282: BestSellersScroll title: `Çok Satanlar` → `Daha Fazlasını Keşfet` — honest discovery framing; removes unverified bestseller claim
- [x] D-282: BestSellersScroll data: `slice(0,10)` → `slice(6,18)` — shows products 7–18, zero overlap with Popular grid's first 6
- [x] D-282: BestSellersScroll empty guard added: `if (moreProducts.length === 0) return null` — consistent with DiscountedSection
- [x] D-282: Product section roles are now clearly distinct: Popular (top picks) → Koleksiyon/Daha Fazlası (discover more) → Fırsatlar (deals)
- [x] D-282: Commits `1fb915ea` (main change) + `e1d06c17` (comment fix) pushed to main
