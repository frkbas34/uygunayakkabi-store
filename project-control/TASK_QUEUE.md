# TASK QUEUE — Uygunayakkabi

_Last updated: 2026-03-15_

---

## ✅ RESOLVED BLOCKERS
- ~~Admin → Storefront product visibility broken~~ — **RESOLVED** (2026-03-13)
- ~~Git branch divergence / data loss risk~~ — **RESOLVED** (main confirmed authoritative, 2026-03-13)
- ~~Product images broken on live site (media access 403)~~ — **RESOLVED** (media read access fix, 2026-03-11)

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

### 🔲 Phase 1 — Final Production Validation

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

### 🔲 Laptop Setup Tasks
- [ ] Create `.env` file on personal laptop with: DATABASE_URI (without sslmode), PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL, NEXT_PUBLIC_WHATSAPP_NUMBER
- [ ] Optionally add BLOB_READ_WRITE_TOKEN to `.env` for local Blob uploads (or always upload via production admin)
- [ ] Run `npm install` and `npm run dev` to verify local dev works

### 🔲 Cleanup Tasks (post-validation)
- [ ] Re-implement admin dark mode properly (without `!important` overrides that break Payload UI)
- [ ] Re-enable custom Dashboard component (`afterDashboard`) once dark mode is resolved
- [ ] Add favicon.ico to `src/app/` (site currently returns 404 for every favicon request)
- [ ] Add `/products/[slug]` URL route (slug auto-generated but no dedicated product page route exists)
- [ ] Switch `push: true` to Payload migrations before Phase 2 production hardening
- [ ] Commit remaining uncommitted changes (cart, orders, globals.css, etc.) after review

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

### ✅ Completed Data Model Expansion (2026-03-15)
- [x] Products.ts: added productFamily (select: shoes/wallets/bags/accessories) — D-054
- [x] Products.ts: added productType (text, free-form) — D-054
- [x] Products.ts: added channels group (publishWebsite, publishInstagram, publishShopier, publishDolap) — D-055
- [x] Products.ts: added source (select: admin/telegram/n8n/api/import) — D-056
- [x] Products.ts: added automationMeta group (telegramChatId, telegramMessageId, lastSyncedAt, updatedBy, lockFields) — D-057
- [x] BlogPosts.ts: scaffolded with title, slug, richText content, SEO fields, relatedProducts — D-058
- [x] payload.config.ts: BlogPosts registered
- [x] Memory files updated: DECISIONS.md (D-054–D-060), ARCHITECTURE.md, PROJECT_STATE.md, TASK_QUEUE.md

---

### 🔴 Step 1 — Security Rotation (MUST DO FIRST)
- [ ] Regenerate Telegram bot token via BotFather → update OpenClaw config
- [ ] Regenerate OpenAI API key → update OpenClaw config
- [ ] Optionally regenerate OpenClaw gateway token
- [ ] Update `/home/furkan/.openclaw/openclaw.json` with new values
- [ ] Restart OpenClaw containers after config update
- [ ] Verify Telegram bot still responds after token change
- [ ] Verify OpenAI model calls still work after key change

### Step 2 — Persistent Docker Network Fix
- [ ] Edit OpenClaw `docker-compose.yml` to include `web` external network on the gateway service
- [ ] Verify Caddy can route to OpenClaw gateway after `docker-compose down && docker-compose up -d`
- [ ] Confirm no manual `docker network connect` needed after restart

### ✅ Step 3 — Telegram Access Policy (DONE 2026-03-15)
- [x] Decision: limited group access with allowlist + mention-only — see D-061
- [x] `groupAllowFrom: [5450039553, 8049990232]` added — 2 approved user IDs
- [x] `groups: { "*": { requireMention: true } }` — mention-only in all groups (native OpenClaw field)
- [x] OpenClaw hot-reloaded config, container restarted cleanly and healthy ✅
- [ ] **Pending**: Add 3rd user ID to `groupAllowFrom` in openclaw.json when known
- [ ] **Pending**: Create Telegram group "Mentix Grup Bot" and add @mentix_aibot

### ✅ Step 4 — OpenClaw → n8n Transport Layer (DONE 2026-03-15)
- [x] Transport pattern chosen: `exec` tool → `curl -X POST http://n8n:5678/webhook/mentix-intake` (D-062)
- [x] Internal Docker network used (OpenClaw → n8n direct, bypasses Caddy) — 8ms round-trip confirmed
- [x] Payload schema v1.0 defined: source, intent, telegram, message, parsed, timestamp, session_id
- [x] n8n workflow created: `Mentix Intake Webhook` (ID: WOv8kRkN00Jo8g2D)
  - Nodes: Webhook → Parse Intake Fields (Set) → Respond to Webhook
  - Endpoint: `POST /webhook/mentix-intake` (live and active ✅)
- [x] OpenClaw skill installed: `/home/furkan/.openclaw/skills/mentix-intake/SKILL.md`
  - Trigger: product data in Telegram message
  - Action: parse → exec curl → confirm to user in Turkish
- [x] `skills.load.watch: true` enabled in openclaw.json
- [x] End-to-end transport validated: curl from OpenClaw container → n8n → 200 received ✅
- [ ] **Pending**: Validate full chain via actual Telegram mention (real message → skill triggers → exec)
- [ ] **Pending**: Create n8n API key via `flow.uygunayakkabi.com` UI for future workflow management

### Step 5 — n8n → Payload Product Creation Workflow
- [ ] n8n workflow receives parsed product data (title, price, SKU, photo URL)
- [ ] n8n downloads photo from Telegram File API (via photo URL)
- [ ] n8n uploads photo to Payload Media collection (Vercel Blob in production)
- [ ] n8n creates product via Payload REST API: `POST /api/products` with:
  - `status: 'draft'`
  - `source: 'telegram'`
  - `automationMeta.telegramChatId`, `automationMeta.telegramMessageId`
  - `automationMeta.updatedBy: 'automation'`
  - `channels.publishWebsite: true` (default)
- [ ] Payload API auth: use API key or admin credentials stored in n8n

### Step 6 — End-to-End Test
- [ ] Send photo + caption from phone → Telegram bot
- [ ] OpenClaw receives → forwards to n8n webhook
- [ ] n8n creates draft product in Payload CMS
- [ ] Admin sees draft in `uygunayakkabi.com/admin` → sets status to `active`
- [ ] Product appears on storefront
- [ ] Validate full loop: phone → bot → n8n → draft → admin → live

---

### Step 7 — Caption Parser / Data Mapping (after MVP works)
- [ ] Define caption format: e.g. `Nike Air Max\n₺1200\n#AYK-001\nAdet: 5`
- [ ] Map parsed fields to Products collection: title, price, sku, quantity
- [ ] Handle missing fields with sensible defaults
- [ ] Review existing `src/lib/telegram.ts` parser — reuse or adapt for n8n

### Step 8 — Phase 2 Expansion (after thin slice validated)
- [ ] AI image processing: background removal / enhancement before Blob upload (media.type: 'enhanced')
- [ ] Instagram auto-publish: n8n reads `channels.publishInstagram` → Graph API post
- [ ] Shopier listing sync: n8n reads `channels.publishShopier` → Shopier API
- [ ] Dolap listing sync: n8n reads `channels.publishDolap` → Dolap API
- [ ] n8n workflow branching: different actions for different caption formats
- [ ] Product family routing: different caption parsers / workflows for shoes vs wallets vs accessories

### Target Flow (MVP)
```
Your phone → Telegram DM → mentix_aibot
    ↓
OpenClaw (AI agent — intent parsing)
    ↓
n8n webhook (flow.uygunayakkabi.com)
    ↓
n8n workflow: parse → download photo → upload to Vercel Blob
    ↓
Payload REST API: POST /api/products (status: draft)
    ↓
Admin sees draft → approves → product goes live on storefront
```

---

## PHASE 3 — Autonomous Content & Growth
_(Do not begin until Phase 2 is validated. BlogPosts collection already scaffolded — D-058)_

- [ ] Define CEO / founder blog structure (using BlogPosts collection)
- [ ] Define product-to-blog generation system (AI reads product data → generates blog content)
- [ ] Define product-driven SEO content generation (seoTitle, seoDescription fields on BlogPosts)
- [ ] Generate product descriptions automatically (AI fills Products.description from images + title)
- [ ] Build `/blog` storefront route to render BlogPosts
- [ ] Build `/blog/[slug]` individual post page
- [ ] Publish blog content on site
- [ ] Connect content layer to organic growth strategy
- [ ] AI visual expansion engine: generate additional product images (non-destructive, media.type: 'enhanced')
- [ ] Try-on UX layer on product detail pages (frontend only, no data model changes — D-060)
