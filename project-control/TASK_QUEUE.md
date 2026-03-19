# TASK QUEUE — Uygunayakkabi

_Last updated: 2026-03-19 (Step 17 complete — Instagram OAuth token exchange + n8n Variable write-back)_

## ⚠️ Current Blockers

### Blocker 0: push:true reliability — ONGOING RISK ⚠️
`push: true` on Neon serverless cannot reliably complete multi-table migrations.
**Critical:** `push: true` does NOT run in production (`NODE_ENV=production` guard in `@payloadcms/db-postgres/dist/connect.js`).
**Before adding any new collection or global:** manually verify the new table exists in Neon after first deployment.
Required tables to check after any schema change: `payload_locked_documents_rels` (new `{slug}_id` column) + new collection table itself.

### Blocker 1: Instagram Credentials — OPERATOR ACTION REQUIRED (simplified by Step 17)
**Step 16+17 code is complete.** Token exchange is now automated via the OAuth flow. To go live:
1. Set `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `N8N_API_KEY` in Vercel env vars
2. Import `n8n-workflows/channel-instagram-real.json` to `flow.uygunayakkabi.com`, activate it
3. Optionally set `INSTAGRAM_BYPASS_PUBLISH=true` in n8n Variables for a safe dry-run first
4. Complete Instagram OAuth: navigate to `https://uygunayakkabi.com/api/auth/instagram/initiate`
5. Approve the Meta consent screen → callback writes `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_USER_ID` to n8n Variables automatically
6. Test: activate a product with `instagram` in `channelTargets` → verify `dispatchNotes.publishResult.instagramPostId` appears in admin
Note: long-lived tokens expire after ~60 days. Repeat step 4 to refresh, or switch to a System User token in Meta Business Suite (no expiry).

### ~~Blocker 2: Mentix VPS Deployment~~ — RESOLVED ✅ (2026-03-17)
### ~~Blocker 3: Git push pending~~ — RESOLVED ✅ (2026-03-17)
### ~~Blocker 4: Product save 500 (products_channel_targets)~~ — RESOLVED ✅ (2026-03-17)
Root cause: `id` column was `varchar NOT NULL` with no default; Drizzle (idType=serial) inserts `DEFAULT` → NULL → NOT NULL violation. Fix: recreated `id` as `SERIAL PRIMARY KEY` + added FK + indexes.

---

## 🔜 Immediate Next Actions

### Mentix — Real Ops Tests (priority)
1. **Product intake test** — send photo + caption + `@Mentix bunu ürüne çevir` to ops group → verify JOB_ID generated, n8n webhook fires, Payload draft product created
2. **Debug test** — `@Mentix bu ürünün veri akışını debug et` → verify product-flow-debugger activates and traces 13-step flow
3. **Add DATABASE_URI to OpenClaw Docker env** — needed for sql-toolkit live DB queries
4. **Add GITHUB_TOKEN to OpenClaw Docker env** — needed for github-workflow

### OpenClaw Env Vars (VPS — `/opt/openclaw/docker-compose.yml`)
```yaml
environment:
  - DATABASE_URI=postgresql://...  # Neon connection string
  - GITHUB_TOKEN=ghp_...           # Read-only repo access
```
Then: `cd /opt/openclaw && docker compose up -d`

---

## ✅ RESOLVED BLOCKERS (2026-03-13)
- ~~Admin → Storefront product visibility broken~~ — **RESOLVED**
- ~~Git branch divergence / data loss risk~~ — **RESOLVED** (main confirmed authoritative)

---

## PHASE 1 — Core Admin System + Storefront Stabilization

### ✅ Completed & Production Validated (2026-03-10 → 2026-03-11)

**Infrastructure & Runtime:**
- [x] Fix Payload importMap — all required components registered (incl. VercelBlobClientUploadHandler)
- [x] Fix admin panel CSS (dark CSS removed, default Payload theme restored)
- [x] Fix media upload — Vercel Blob Storage in production, local filesystem in dev
- [x] Fix DB schema mismatch (field types aligned to varchar columns)
- [x] Fix Next.js version — upgraded to 16.2.0-canary.81 (Payload 3.79.0 compatible)
- [x] Fix Google Fonts build failure — replaced next/font/google with `<link>` CDN tags
- [x] Fix TypeScript `any[]` to `never[]` error — UygunApp.d.ts declaration file
- [x] Fix SSL red error overlay in dev — removed `sslmode=require` from DATABASE_URI, added ssl pool option in payload.config.ts

**Collections & Schema:**
- [x] All collections: Products, Variants, Brands, Categories, Media, Users, CustomerInquiries, InventoryLogs, Orders, Banners
- [x] SiteSettings global (contact, shipping, trust badges, announcement bar)
- [x] Turkish language configured as default
- [x] Orders collection: paymentMethod, isPaid, shippingCompany, deliveredAt
- [x] Products.ts fully rewritten with beforeValidate hook (auto-slug, auto-SKU), beforeDelete hook (nullify FK refs), select category, Turkish validation
- [x] Variants.ts: useAsTitle → 'size', product field required: false

**Storefront:**
- [x] Rewrite page.tsx as Server Component (products, settings, banners) with force-dynamic
- [x] 39 static products across 8 categories as fallback layer (ENABLE_STATIC_FALLBACK = false — DB is sole source)
- [x] Product detail page, catalog page, WhatsApp order flow
- [x] Connect SiteSettings & Banners to frontend dynamically
- [x] CMS-first pipeline — static fallback disabled
- [x] Reverse media lookup in page.tsx (queries media by product field as fallback for empty images array)
- [x] SVG placeholder shoe only shown when zero real images exist (not appended to real galleries)
- [x] objectFit: contain on all product images (card + detail) — no cropping
- [x] Hover crossfade preview on catalog cards (fades to 2nd image on hover)
- [x] Variant size display fixed — shows "42" not "ADS-42" (useAsTitle: size + regex extraction in page.tsx)
- [x] Bulk delete FK error fixed — beforeDelete hook + Variants.product required: false
- [x] Empty state in Catalog when no DB products exist
- [x] Debug console.log lines removed from page.tsx

**Production:**
- [x] Admin panel loads correctly in production at uygunayakkabi.com/admin ✅
- [x] Storefront live at uygunayakkabi.com ✅
- [x] Vercel env vars set (DATABASE_URI, PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL, NEXT_PUBLIC_WHATSAPP_NUMBER, BLOB_READ_WRITE_TOKEN) ✅

---

### 🔲 Phase 1 — Final Production Validation (CURRENT PRIORITY)

**Before any session, sync your branch:**
```bash
git pull origin main
npm run dev
```

**Production smoke tests — run in order:**
- [ ] Login to admin at uygunayakkabi.com/admin → confirm all 10 collections visible in sidebar
- [ ] Upload a test image via Media collection → confirm Vercel Blob URL returned (`https://...blob.vercel-storage.com/...`)
- [ ] Create a test product via admin with uploaded image, set status to `active` → confirm it appears on storefront within one page reload
- [ ] Populate SiteSettings global (site name, WhatsApp number, announcement bar) → confirm changes appear on storefront
- [ ] Create a test Banner → confirm promo section updates on homepage
- [ ] Try bulk-deleting 2–3 test products → confirm "Bilinmeyen hata" error is GONE

---

### 🔲 Cleanup Tasks (post-validation)
- [ ] Re-implement admin dark mode properly (without `!important` overrides that break Payload UI)
- [ ] Re-enable custom Dashboard component (`afterDashboard`) once dark mode is resolved
- [ ] Add favicon.ico to `src/app/` (site currently returns 404 for every favicon request)
- [ ] Add `/products/[slug]` URL route (slug auto-generated but no dedicated product page route exists)
- [ ] Switch `push: true` to Payload migrations before Phase 2 production hardening

---

## PHASE 2 — Automation Backbone (ACTIVE ▶️)

### ✅ Completed Infrastructure (2026-03-14)
- [x] VPS provisioned (Netcup, Ubuntu 22.04.5 LTS, 128G disk)
- [x] Docker + Docker Compose installed
- [x] Caddy reverse proxy running (auto-TLS)
- [x] n8n deployed and accessible at `flow.uygunayakkabi.com`
- [x] OpenClaw deployed and accessible at `agent.uygunayakkabi.com`
- [x] Telegram bot (`mentix_aibot`) connected via OpenClaw, DM pairing done
- [x] OpenClaw dashboard pairing complete
- [x] OpenAI model (`openai/gpt-5-mini`) connected and responding
- [x] DNS configured via Cloudflare (`flow.*`, `agent.*` → VPS IP)
- [x] Proof of concept: Telegram DM → bot responds in Turkish ✅

---

### ✅ Step 1 — Security Rotation — COMPLETE (2026-03-15)
- [x] Telegram bot token regenerated → OpenClaw config updated
- [x] OpenAI API key regenerated → OpenClaw config updated
- [x] OpenClaw restarted, Telegram DM verified working

### ✅ Step 2 — Persistent Docker Network Fix — COMPLETE (2026-03-15)
- [x] OpenClaw docker-compose.yml updated — gateway bound to `web` external network
- [x] Caddy routing verified after restart (no manual `docker network connect` needed)

### ✅ Step 3 — Telegram Group Access Policy — COMPLETE (2026-03-15)
- [x] `groupAllowFrom: [5450039553, 8049990232]` set in openclaw.json
- [x] `requireMention: true` via `groups.*.requireMention` field
- [x] BotFather Group Privacy set to OFF
- [x] Group tested — bot responds on @mention in allowed group (Mentix Grup Bot)

### ✅ Step 4 — OpenClaw → n8n Intake Webhook — COMPLETE (2026-03-15)
- [x] mentix-intake skill at `/home/furkan/.openclaw/skills/mentix-intake/SKILL.md`
- [x] Skill uses curl to POST to `http://n8n:5678/webhook/mentix-intake`
- [x] n8n workflow: Webhook → Parse Intake Fields → Respond (3 nodes)
- [x] Payload schema v1.0 defined, HTTP 200 validated from OpenClaw

### ✅ Step 5 — n8n → Payload Draft Product Creation — COMPLETE (2026-03-15)
- [x] Custom `POST /api/automation/products` endpoint (X-Automation-Secret header auth)
- [x] useAPIKey approach reverted (D-062)
- [x] n8n IF node set to 200 (not 201)
- [x] Missing DB columns added: product_family, channels_*, source, automation_meta_*
- [x] Pipeline: Telegram → OpenClaw → n8n → Payload → Neon DB draft product ✅

### ✅ Step 6 — Media Pipeline — COMPLETE (2026-03-15)
- [x] `POST /api/automation/attach-media` endpoint created
- [x] Flow: Telegram getFile API → binary download → payload.create(media) → payload.update(product.images)
- [x] MIME type normalization for Telegram CDN content-type headers
- [x] n8n Has Media? branch wired — image_count: 1 confirmed in DB ✅

### ✅ Step 7 — Duplicate Protection / Idempotency — COMPLETE (2026-03-15)
- [x] `automationMeta.telegramChatId` + `automationMeta.telegramMessageId` stored per product
- [x] Duplicate check: same chatId + messageId → returns `{ status: "duplicate" }`, no second product created ✅
- [x] Quick-activate "Aktif Yap" button in Products list also confirmed working

### ✅ Step 8 — Admin Review / Approval Flow Polish — COMPLETE (2026-03-15)
- [x] `SourceBadgeCell` — Source column in Products list (Telegram/Otomasyon/Admin badges)
- [x] `StatusCell` — Status column with "Aktif Yap" button
- [x] `ReviewPanel` — shown on automation products edit page: source info, readiness checklist, "Yayına Hazır" / "Eksikler Var" summary
- [x] ReviewPanel NOT shown for admin-created products

### ✅ Step 9 — Inventory / Variant Readiness — COMPLETE (2026-03-15)
- [x] `products.stock_quantity INT NOT NULL DEFAULT 1` added to DB
- [x] `variants.color VARCHAR` added to DB
- [x] 3 orphan variants deleted
- [x] SKU standard: `TG-{PREFIX3}-{msgId}` for automation products (e.g. TG-NIK-9001)
- [x] ReviewPanel shows "Stok adedi" with zero-stock warning
- [x] Variant-level stock and InventoryLogs deferred to future phase

---

### ✅ Step 10 — Publishing Flow / Commerce Activation — COMPLETE (2026-03-15)
- [x] State machine: draft → active (no intermediate state — D-064)
- [x] `products/[slug]/page.tsx`: `notFound()` for draft products — public URL blocked ✅
- [x] `Products.ts` beforeChange hook: blocks activation if price ≤ 0, exempt for automation creates ✅
- [x] `StatusCell.tsx`: reads server error response, renders inline error in red ✅
- [x] Storefront homepage already had `where: { status: { equals: 'active' } }` — confirmed correct ✅
- [x] Commerce attach points documented in D-064 (Shopier/Instagram/Dolap — afterChange hooks, NOT yet implemented)

---

### ✅ Step 11 — Caption Parser Enhancement — COMPLETE (2026-03-16)
- [x] Enhanced parseTelegramCaption: Turkish/English label aliases, 2-pass parsing, heuristics
- [x] Price normalization: handles "1.500", "1500 TL", "₺1500", comma-decimal formats
- [x] Category normalization: Turkish/English → Products enum values
- [x] Brand inference from title (known brand list)
- [x] ProductFamily inference from category/title keywords
- [x] parseConfidence (0–100), parseWarnings[], rawCaption — always preserved
- [x] evaluatePublishReadiness: reusable helper with blocking/warning split
- [x] Products.ts: rawCaption, parseWarnings, parseConfidence added to automationMeta
- [x] Products.ts: channelTargets multi-select, automationFlags group, sourceMeta group added
- [x] Products.ts: Step 8-10 regression (staged downgrade) detected and restored
- [x] route.ts: accepts rawCaption/messageText, merges with parser, returns readiness in response
- [x] ReviewPanel: parseConfidence badge, parseWarnings list, collapsible raw caption debug view
- [x] Legacy parseTelegramCaptionLegacy + parseStockUpdate preserved for backward compat

---

### ✅ Step 12 — Automation Settings / Global Toggle Layer — COMPLETE (2026-03-16)
- [x] AutomationSettings extended: minConfidenceToActivate (number, 0-100), enableTryOn (checkbox)
- [x] automationDecision.ts: pure stateless decision library
  - resolveProductStatus: 7-gate precedence chain
  - resolveChannelTargets: global capability ∩ product intent
  - resolveContentDecision: blog/image/tryOn intent flags
  - fetchAutomationSettings: safe fetch with null fallback
- [x] route.ts: loads settings via fetchAutomationSettings, calls all 3 resolvers
  - Status: no longer hardcoded — toggle-controlled
  - Channels: effective targets after global filter
  - Content: intent flags for n8n downstream use
- [x] Products.ts automationMeta: autoDecision + autoDecisionReason (readOnly)
- [x] ReviewPanel: decision row with color-coded status + reason text
- [x] Response: decision object + channels + content_intent returned to n8n

---

### ✅ Step 13 — Channel Adapter Scaffolding — COMPLETE (2026-03-16)
- [x] `src/lib/channelDispatch.ts` created — pure dispatch library (374 lines)
  - `ChannelDispatchPayload` type (adapter contract) + `ChannelDispatchResult` type
  - `evaluateChannelEligibility()` — global capability ∩ product intent (3-gate)
  - `buildDispatchPayload()` — structured n8n webhook payload from product doc
  - `dispatchToChannel()` — POST to webhook, OR scaffold log if env var absent
  - `buildChannelWebhookUrl()` — reads N8N_CHANNEL_*_WEBHOOK env vars
  - `dispatchProductToChannels()` — orchestrator called by afterChange hook
- [x] `Products.ts` afterChange hook: fires on status non-active → active transition only
  - `req.context.isDispatchUpdate` guard prevents infinite re-trigger loop
  - Non-fatal: product activation succeeds regardless of dispatch errors
- [x] `Products.ts` sourceMeta: `dispatchedChannels`, `lastDispatchedAt`, `dispatchNotes` added (readOnly)
- [x] Scaffold mode: logs full payload intent when webhook URL not configured — zero errors
- [x] Website excluded from dispatch — works natively via active status (no webhook needed)
- [x] Env var pattern: `N8N_CHANNEL_INSTAGRAM_WEBHOOK`, `N8N_CHANNEL_SHOPIER_WEBHOOK`, `N8N_CHANNEL_DOLAP_WEBHOOK`

**Deferred from Step 13:**
- n8n channel workflow stubs (receive + log intent) — VPS config, not Payload code
- ReviewPanel channel dispatch status display — Step 14 admin polish task
- Real Instagram/Shopier/Dolap API integrations — Phase 2B Steps

---

### ✅ Step 14 — Channel Workflow Stubs + Admin Dispatch Visibility — COMPLETE (2026-03-16)
- [x] n8n stub workflow JSONs created (importable):
  - `n8n-workflows/stubs/channel-instagram.json` — Webhook → Log Payload (Set) → Respond 200
  - `n8n-workflows/stubs/channel-shopier.json`
  - `n8n-workflows/stubs/channel-dolap.json`
  - Each logs: channel, productId, sku, title, price, brand, mediaCount, parseConfidence, triggerReason
  - No real third-party API calls — scaffold only
- [x] `n8n-workflows/CHANNEL_DISPATCH_CONTRACT.md` created (222 lines)
  - Full ChannelDispatchPayload type + sample JSON
  - Env var setup table (N8N_CHANNEL_*_WEBHOOK)
  - End-to-end test checklist
  - Dispatch result schema reference
  - Manual re-dispatch instructions
- [x] ReviewPanel: channel dispatch status section added (active products only)
  - Per-channel rows: eligible/dispatched/webhookConfigured/skippedReason/error/responseStatus
  - Color-coded by outcome (green=dispatched, yellow=no webhook, grey=skipped)
  - `lastDispatchedAt` timestamp in section header
  - `forceRedispatch` "Redispatch bekliyor…" indicator
  - Collapsible raw dispatchNotes debug block
  - Hint row for inactive products ("dispatch tetiklenir")
- [x] `forceRedispatch` checkbox in sourceMeta (Step 14 manual re-dispatch scaffold)
  - Admin-accessible, not readOnly
  - afterChange hook: fires on `forceRedispatch === true && status === 'active'`
  - Auto-reset to `false` in same sourceMeta update as dispatch results
  - NOT reset on error (admin retries by saving again)
  - TriggerReason: `manual-redispatch` vs `status-transition`

---

### ✅ Step 15 — E2E Verification Pass + Media URL Hardening — COMPLETE (2026-03-16)

**Code fixes:**
- [x] `channelDispatch.ts` `extractMediaUrls()`: relative `/media/` paths made absolute using `NEXT_PUBLIC_SERVER_URL` — n8n VPS can now fetch product images even in local dev mode. In production, Vercel Blob URLs are always absolute (already worked).
- [x] `.env.example` updated: all Phase 2 vars added (AUTOMATION_SECRET, BLOB_READ_WRITE_TOKEN, N8N_INTAKE_WEBHOOK, N8N_CHANNEL_*_WEBHOOK)

**Verification findings:**
- [x] Env var naming: ✅ consistent across channelDispatch.ts, CHANNEL_DISPATCH_CONTRACT.md, and all 3 stub JSONs
- [x] Dispatch error handling: ✅ correct — uses `response.ok`, `AbortSignal.timeout(10_000)`, non-throwing
- [x] afterChange guard: ✅ correct — `req.context.isDispatchUpdate` + forceRedispatch reset behavior both verified
- [x] Vercel Blob URLs: ✅ publicly accessible — confirmed `*.public.blob.vercel-storage.com` is world-accessible, no auth required
- [x] `NEXT_PUBLIC_SERVER_URL`: ✅ confirmed in Vercel env (production = `https://uygunayakkabi.com`)

**New docs created:**
- [x] `n8n-workflows/E2E_TEST_CHECKLIST.md` — step-by-step runbook: n8n import, env setup, test product, log verification, n8n execution check, media URL test, forceRedispatch test, failure mode table, 30-line quick checklist
- [x] `n8n-workflows/CHANNEL_DISPATCH_CONTRACT.md` — added "Media URL Behavior" section + "Known Limitations" table

**Remaining (operator actions, not code):**
- [ ] Import `n8n-workflows/stubs/channel-instagram.json` to `flow.uygunayakkabi.com` and activate
- [ ] Set `N8N_CHANNEL_INSTAGRAM_WEBHOOK` in Vercel → redeploy
- [ ] Run the E2E test per `n8n-workflows/E2E_TEST_CHECKLIST.md`
- [ ] After test passes: import shopier + dolap stubs, set their env vars

---

### ✅ Step 16 — First Real Channel Integration — COMPLETE (2026-03-18)
- [x] `n8n-workflows/channel-instagram-real.json` — 13-node real Instagram Graph API v21.0 workflow
  - Bypass mode gate (INSTAGRAM_BYPASS_PUBLISH n8n var)
  - Credentials check (INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID + valid https:// image URL)
  - Caption builder (title + price + brand + category + hashtags, max 2200 chars)
  - Create media container (POST /v21.0/{user_id}/media)
  - Wait 2s for Instagram media processing
  - Publish media (POST /v21.0/{user_id}/media_publish)
  - Error routing: create-container error → HTTP 500 mode=api-error; publish error → HTTP 500
  - Success: HTTP 200 with instagramPostId, instagramPermalink, publishedAt
- [x] `src/lib/channelDispatch.ts`: `ChannelDispatchResult.publishResult` field added; response body parsed as JSON
- [x] `src/collections/Products.ts`: write-back includes `publishResult` in dispatchNotes
- [x] `src/components/admin/ReviewPanel.tsx`: renders post ID + permalink link + error/bypass states
- [x] `n8n-workflows/CHANNEL_DISPATCH_CONTRACT.md`: Step 16 section added (n8n vars, prerequisites, response schema, Known Limitations updated)
- [x] TypeScript check passes: 0 errors

**Pending operator actions (not code):**
- [ ] Import `channel-instagram-real.json` to n8n + configure Variables + activate
- [ ] Run live test: activate product → verify `instagramPostId` in admin

---

### 🟡 Step 17 — Instagram Token Exchange + Hardening (NEXT PRIORITY)
After Step 16 operator go-live confirmed:

**OAuth Token Exchange (prerequisite for automated token management):**
- [ ] Set `INSTAGRAM_APP_ID` + `INSTAGRAM_APP_SECRET` in Vercel env vars
- [ ] Complete token exchange in `/api/auth/instagram/callback/route.ts`:
  - Validate `state` CSRF token
  - POST to Graph API `/v21.0/oauth/access_token` → short-lived token
  - GET `/v21.0/oauth/exchange_token` → long-lived token (60 days)
  - GET `/v21.0/me?fields=id,name` → get `INSTAGRAM_USER_ID`
  - Store results → n8n Variables (INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID)
- Callback route already exists: `src/app/api/auth/instagram/callback/route.ts`
- Register in Meta: `https://uygunayakkabi.com/api/auth/instagram/callback`

**Instagram publish hardening:**
- [ ] **Instagram carousel posts** — when `mediaUrls.length > 1`, publish all images as carousel
  - Graph API: create multiple media containers → `media_type=CAROUSEL` + `children[]=` array
  - n8n workflow extension: loop over mediaUrls → create container for each → publish carousel
- [ ] **Token expiry monitoring** — long-lived tokens expire after 60 days
  - Recommend: switch to System User token (no expiry) in Facebook Developer Portal
  - Optional: n8n workflow to alert (Telegram notification) when token is near expiry
- [ ] **`sourceMeta.externalSyncId`** — promote `publishResult.instagramPostId` to a dedicated field for cleaner admin display
- [ ] Research Shopier API availability for Step 18

---

## PHASE 2B — Multi-Channel Distribution

### Channel Integration — Website
- [x] **Already works**: Active products appear on storefront (Phase 1 validated)
- [x] Confirmed: automation-created active products also appear (Step 10 validated)

### Channel Integration — Instagram (Step 16 — NEXT PRIORITY)
⚠️ **Blocked on E2E stub test passing first** (see Pending Operator Actions in PROJECT_STATE.md)
- [ ] Import + activate `n8n-workflows/stubs/channel-instagram.json` in n8n (VPS operator action)
- [ ] Set `N8N_CHANNEL_INSTAGRAM_WEBHOOK` in Vercel → redeploy (Vercel operator action)
- [ ] Run E2E test per `n8n-workflows/E2E_TEST_CHECKLIST.md` — confirm all success signals
- [ ] After E2E passes: replace Instagram stub with real n8n workflow (Instagram Graph API)
- [ ] Facebook Business Manager + Instagram Business Account + Graph API app setup
- [ ] `sourceMeta.externalSyncId` write-back from n8n after successful post
- [ ] `publishInstagram` toggle in AutomationSettings remains the gate

### Channel Integration — X (Twitter) — SCAFFOLD ✅ (2026-03-19)
- [x] `SupportedChannel` type extended
- [x] `N8N_CHANNEL_X_WEBHOOK` env var mapped
- [x] `AutomationSettings.publishX` toggle added
- [x] `Products.channels.publishX` flag + `channelTargets` option added
- [x] `ReviewPanel` label added
- [x] OAuth callback: `src/app/api/auth/x/callback/route.ts`
- [x] n8n stub: `n8n-workflows/stubs/channel-x.json`
- [ ] **Real integration**: X API v2 POST /2/tweets + OAuth 2.0 PKCE token exchange
- [ ] Token refresh automation (tokens expire ~2hr, refresh valid 6mo)
- [ ] Character limit: 280 chars (or 25,000 for X Premium long-form)

### Channel Integration — Facebook Page — SCAFFOLD ✅ (2026-03-19)
- [x] `SupportedChannel` type extended
- [x] `N8N_CHANNEL_FACEBOOK_WEBHOOK` env var mapped
- [x] `AutomationSettings.publishFacebook` toggle added
- [x] `Products.channels.publishFacebook` flag + `channelTargets` option added
- [x] `ReviewPanel` label added
- [x] n8n stub: `n8n-workflows/stubs/channel-facebook.json`
- [ ] **Real integration**: Graph API /{page_id}/photos or /{page_id}/feed
- [ ] Uses same Meta App as Instagram — reuses INSTAGRAM_APP_ID/SECRET
- [ ] Needs: FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN in n8n Variables
- [ ] Auth: same OAuth flow as Instagram (additional page permissions required)

### Channel Integration — LinkedIn — SCAFFOLD ✅ (2026-03-19)
- [x] `SupportedChannel` type extended
- [x] `N8N_CHANNEL_LINKEDIN_WEBHOOK` env var mapped
- [x] `AutomationSettings.publishLinkedin` toggle added
- [x] `Products.channels.publishLinkedin` flag + `channelTargets` option added
- [x] `ReviewPanel` label added
- [x] OAuth callback: `src/app/api/auth/linkedin/callback/route.ts`
- [x] n8n stub: `n8n-workflows/stubs/channel-linkedin.json`
- [ ] **Real integration**: LinkedIn Marketing API POST /rest/posts
- [ ] Decide: personal posting vs organization/company page posting
- [ ] Token refresh (access 60 days, refresh ~1 year)
- [ ] Character limit: 3,000 chars

### Channel Integration — Threads — SCAFFOLD ✅ (2026-03-19)
- [x] `SupportedChannel` type extended
- [x] `N8N_CHANNEL_THREADS_WEBHOOK` env var mapped
- [x] `AutomationSettings.publishThreads` toggle added
- [x] `Products.channels.publishThreads` flag + `channelTargets` option added
- [x] `ReviewPanel` label added
- [x] n8n stub: `n8n-workflows/stubs/channel-threads.json`
- [ ] **Real integration**: Threads API /{user_id}/threads + /{user_id}/threads_publish
- [ ] Uses same Meta App as Instagram — reuses INSTAGRAM_APP_ID/SECRET
- [ ] Needs: THREADS_USER_ID + THREADS_ACCESS_TOKEN + threads_content_publish scope
- [ ] Character limit: 500 chars

### Channel Integration — Shopier
- [ ] Import + activate `n8n-workflows/stubs/channel-shopier.json` after Instagram E2E validated
- [ ] Research Shopier API availability / seller integration
- [ ] n8n workflow: active product → Shopier listing sync
- [ ] `publishShopier` toggle controls activation

### Channel Integration — Dolap
- [ ] Import + activate `n8n-workflows/stubs/channel-dolap.json` after Instagram E2E validated
- [ ] Research Dolap API / seller integration
- [ ] n8n workflow: active product → Dolap listing sync
- [ ] `publishDolap` toggle controls activation

---

## PHASE 2C — Content Growth Layer

### Step 16 — AI SEO Blog Engine
- [x] BlogPosts collection created (scaffold — 2026-03-15)
- [ ] n8n workflow: active product (shoes) + generateBlog flag → AI prompt → blog post → Payload BlogPosts
- [ ] Blog post template: product-centered but blog-style natural language
- [ ] Blog frontend route on website (`/blog`, `/blog/[slug]`)
- [ ] `autoGenerateBlog` / `autoPublishBlog` toggles control behavior
- [ ] Duplicate prevention: check if blog already exists for product before generating

### Step 17 — Blog Frontend
- [ ] `/blog` listing page
- [ ] `/blog/[slug]` detail page
- [ ] SEO meta tags from BlogPosts fields
- [ ] Internal linking to product pages

---

## PHASE 3 — Visual & Experience

### Step 18 — Visual Expansion Engine
- [ ] Prompt library structure: `/ai-knowledge/prompts/product-visuals/`
- [ ] Base integrity rules prompt
- [ ] Per-family angle prompts (shoes, wallets, bags)
- [ ] n8n workflow: product media → AI generation → validation → additional media upload
- [ ] Media type tracking: original / enhanced / generated_angle
- [ ] Min 2, max 4 additional views per product

### Step 19 — Photo-Based AI Try-On
- [ ] Product page widget: "Kendi fotoğrafında dene" button
- [ ] Upload validation (full-body, visible feet)
- [ ] Try-on API endpoint / async job flow
- [ ] Result gallery on product page
- [ ] Privacy: auto-delete user photos after processing
- [ ] Provider selection: external VTO service vs custom pipeline

### Target Flow (Full System)
```
Phone → Telegram Group → mentix_aibot
    ↓
OpenClaw (intent parsing)
    ↓
n8n webhook (flow.uygunayakkabi.com)
    ↓
n8n workflow: parse → download photo → upload to Vercel Blob
    ↓
Payload API: create product (status per AutomationSettings toggle)
    ↓
Distribution Engine (per channel toggles):
    ├─ Website (active → storefront)
    ├─ Instagram (Graph API)
    ├─ Shopier (listing sync)
    └─ Dolap (listing sync)
    ↓
Content Engine (if generateBlog + active):
    └─ AI SEO blog → BlogPosts collection
    ↓
Visual Engine (if generateExtraViews):
    └─ 2-4 additional product angles → Media collection
```

---

## MENTIX INTELLIGENCE LAYER — Skill Stack (2026-03-16)

### ✅ Completed (Design & Creation — v1)
- [x] Audit current Mentix state (1 skill: mentix-intake, live on VPS)
- [x] Chose agent-memory over chromadb-memory (see D-071)
- [x] Designed 3-level activation policy (A/B/C)
- [x] Created 11 SKILL.md files in `mentix-skills/` directory:
  - Level A: skill-vetter, browser-automation, sql-toolkit, agent-memory, github-workflow, uptime-kuma
  - Level B: eachlabs-image-edit, upload-post, research-cog, senior-backend
  - Level C: learning-engine (observe-only, no auto-modification)
- [x] Created `mentix-skills/INSTALLATION_MATRIX.md` — full deployment guide
- [x] Created `mentix-skills/ACTIVATION_CONFIG.md` — per-skill permission matrix
- [x] Updated DECISIONS.md (D-070 through D-073)

### ✅ Completed (v2 Intelligence Layer Upgrade — 2026-03-16)
- [x] **product-flow-debugger** added as 7th Level A skill — first-class standalone module
  - 13-step trace map (Telegram intake → storefront visibility)
  - 6 diagnostic entry points (A: not visible, B: wrong data, C: image, D: dispatch, E: intake, F: stock)
  - Confidence × risk gate, capability/permission matrix
- [x] **Capability vs Permission separation** — all 5 mutable skills updated with ALLOWED/CONFIRM-REQUIRED/DENIED tables
  - browser-automation: Read=ALLOWED, Click=CONFIRM, Bulk=DENIED
  - sql-toolkit: SELECT=ALLOWED, UPDATE single=CONFIRM, DELETE=DENIED
  - upload-post: Draft=ALLOWED, Publish=CONFIRM, Auto-publish=DENIED
  - github-workflow: Read=ALLOWED, Commit=CONFIRM, Force-push=DENIED
  - learning-engine: OER separation (outcomes/evaluations/rewards) implemented
- [x] **Formal Decision Schema** (12 fields) codified in `mentix-memory/policies/DECISION_POLICY.md`
- [x] **research-cog** reclassified as optional branch (not required pipeline node)
- [x] **mentix-memory/** directory system created (12 layers):
  - `identity/MENTIX_IDENTITY.md`
  - `policies/` — 5 policy files (DECISION, WRITE, PUBLISH, MEMORY, SKILL_GATING)
  - `runbooks/` — 6 runbooks (product-not-visible, intake-failure, stock-mismatch, image-not-rendering, storefront-desync, price-not-updated)
  - `traces/TRACE_SCHEMA.json` — full trace template with OER fields
  - `evals/GOLDEN_CASES.json` — 3 golden regression cases (GC-001, GC-002, GC-003)
  - `incidents/`, `patterns/`, `decisions/`, `evaluations/`, `rewards/`, `summaries/`, `archive/`
- [x] **Dashboard rebuilt as v2** — 7-tab interactive HTML at `mentix-skill-stack-dashboard.html` (repo root):
  - Tab 1 Overview: 6 subsystems + data flow (research-cog as optional branch)
  - Tab 2 Skills: All 13 skills with explicit permission tables
  - Tab 3 Product Debugger: 13-step trace + 6 entry points + confidence×risk matrix
  - Tab 4 Decision Engine: JSON schema + risk matrix + D-070–D-073 decisions
  - Tab 5 Memory: 12-layer structure + 6 runbook summaries
  - Tab 6 Learning: OER 3-panel + reward framework + hard limits grid
  - Tab 7 Deploy: 7-step VPS procedure + risk register
- [x] `project-control/SYSTEM_PROMPT.md` — repo-level memory governance
- [x] `project-control/MENTIX_SYSTEM_PROMPT.md` — Mentix-specific governance
- [x] Updated DECISIONS.md (D-070 through D-073)
- [x] Updated PROJECT_STATE.md and TASK_QUEUE.md to reflect v2

### ⏳ Pending (VPS Operator Actions)
- [ ] Deploy 12 skill files to VPS: `scp -r mentix-skills/* furkan@VPS:/home/furkan/.openclaw/skills/`
- [ ] Deploy mentix-memory/ system: `scp -r mentix-memory/* furkan@VPS:/home/furkan/.openclaw/mentix-memory/`
- [ ] Create agent-memory data directories on VPS
- [ ] Configure OpenClaw environment variables (DATABASE_URI, GITHUB_TOKEN)
- [ ] Restart OpenClaw gateway and verify skill recognition
- [ ] Investigate OpenClaw skill auto-discovery vs manual registration in openclaw.json
- [ ] Test Level A skills individually via Telegram:
  - [ ] skill-vetter: ask to evaluate a skill
  - [ ] browser-automation: ask to check storefront
  - [ ] sql-toolkit: ask about database state
  - [ ] agent-memory: ask to remember something
  - [ ] github-workflow: ask about repo status
  - [ ] uptime-kuma: ask for health check
  - [ ] **product-flow-debugger**: trigger with "ürün neden görünmüyor?" symptom

### 🔮 Future (After Level A Confirmed Working)
- [ ] Test Level B skills (eachlabs-image-edit, upload-post, research-cog, senior-backend)
- [ ] Configure image processing API for eachlabs-image-edit
- [ ] Set up channel APIs for upload-post
- [ ] Begin learning-engine observation (passive, after 7+ days of Level A operation)
- [ ] First learning-engine weekly report + golden case regression run (GC-001, GC-002, GC-003)
- [ ] Evaluate Level B → full activation based on operational data
- [ ] Evaluate learning-engine upgrade from observe → suggest mode (after 30+ days)
- [ ] Run Pattern Extractor after 10+ closed incidents
- [ ] Run Confidence Calibration review after 20+ traces
