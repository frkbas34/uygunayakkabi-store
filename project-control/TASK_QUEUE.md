# TASK QUEUE — Uygunayakkabi

_Last updated: 2026-03-15_

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

### Step 3 — Telegram Access Policy
- [x] **DECIDED**: Allowlisted group mode (D-052). Add trusted user IDs to allowlist.
- [ ] Collect Telegram numeric user IDs for test group members
- [ ] Add to `channels.telegram.groupAllowFrom` in openclaw.json
- [ ] Restart OpenClaw and test group messaging

### Step 4 — OpenClaw → n8n Webhook Contract
- [ ] Define webhook JSON payload format (see ARCHITECTURE.md for contract spec)
- [ ] OpenClaw calls n8n webhook URL directly (simplest approach — D-048 role)
- [ ] n8n webhook endpoint at `flow.uygunayakkabi.com/webhook/product-intake`
- [ ] Test with sample payload

### Step 5 — n8n → Payload Product Creation Workflow
- [ ] n8n workflow receives parsed product data (title, price, SKU, photo URL, productFamily, productType)
- [ ] n8n downloads photo from Telegram File API (via photo URL)
- [ ] n8n uploads photo to Payload Media collection (Vercel Blob in production)
- [ ] n8n reads `AutomationSettings` global to determine product status (active/draft)
- [ ] n8n creates product via Payload REST API: `POST /api/products` with toggle-controlled status
- [ ] Sets `channelTargets`, `automationFlags`, `sourceMeta` from webhook payload
- [ ] Payload API auth: use API key or admin credentials stored in n8n

### Step 6 — End-to-End Test
- [ ] Send photo + caption from phone → Telegram group
- [ ] OpenClaw receives → forwards to n8n webhook
- [ ] n8n creates product in Payload CMS (status per toggle)
- [ ] If active → product appears on storefront
- [ ] If draft → admin sees in panel, can activate
- [ ] Validate full loop: phone → bot → n8n → product → storefront

---

### Step 7 — Caption Parser / Data Mapping (after MVP works)
- [ ] Define caption format: e.g. `Nike Air Max 90\nFiyat: 2199\nKod: AYK-001\nAdet: 3\nKategori: sneaker\nYayın: açık\nSEO: açık`
- [ ] Map parsed fields to Products collection: title, price, sku, quantity, productFamily, productType
- [ ] Handle missing fields with sensible defaults
- [ ] Review existing `src/lib/telegram.ts` parser — reuse or adapt for n8n

---

## PHASE 2B — Multi-Channel Distribution

### Step 8 — Website Auto-Publish
- [x] **Already works**: Active products appear on storefront (Phase 1 validated)
- [ ] Confirm automation-created active products also appear correctly

### Step 9 — Instagram Adapter
- [ ] Instagram Graph API setup / business account connection
- [ ] n8n workflow: active product → format for Instagram → publish
- [ ] `publishInstagram` toggle in AutomationSettings controls activation

### Step 10 — Shopier Adapter
- [ ] Shopier API/integration research
- [ ] n8n workflow: active product → Shopier listing sync
- [ ] `publishShopier` toggle controls activation

### Step 11 — Dolap Adapter
- [ ] Dolap API/integration research
- [ ] n8n workflow: active product → Dolap listing sync
- [ ] `publishDolap` toggle controls activation

---

## PHASE 2C — Content Growth Layer

### Step 12 — AI SEO Blog Engine
- [x] BlogPosts collection created (scaffold — 2026-03-15)
- [ ] n8n workflow: active product (shoes) + generateBlog flag → AI prompt → blog post → Payload BlogPosts
- [ ] Blog post template: product-centered but blog-style natural language
- [ ] Blog frontend route on website (`/blog`, `/blog/[slug]`)
- [ ] `autoGenerateBlog` / `autoPublishBlog` toggles control behavior
- [ ] Duplicate prevention: check if blog already exists for product before generating

### Step 13 — Blog Frontend
- [ ] `/blog` listing page
- [ ] `/blog/[slug]` detail page
- [ ] SEO meta tags from BlogPosts fields
- [ ] Internal linking to product pages

---

## PHASE 3 — Visual & Experience

### Step 14 — Visual Expansion Engine
- [ ] Prompt library structure: `/ai-knowledge/prompts/product-visuals/`
- [ ] Base integrity rules prompt
- [ ] Per-family angle prompts (shoes, wallets, bags)
- [ ] n8n workflow: product media → AI generation → validation → additional media upload
- [ ] Media type tracking: original / enhanced / generated_angle
- [ ] Min 2, max 4 additional views per product

### Step 15 — Photo-Based AI Try-On
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
