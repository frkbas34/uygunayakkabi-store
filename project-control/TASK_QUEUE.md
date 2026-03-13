# TASK QUEUE — Uygunayakkabi

_Last updated: 2026-03-13_

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

### MVP Scope: Telegram → Payload Draft Product
_Goal: Minimum viable slice. Phone photo + caption → webhook → product draft in CMS._
_Do not build AI image processing or Instagram publishing yet — validate the thin slice first._

---

### Step 1 — Telegram Bot Setup
- [ ] Create a Telegram bot via BotFather → get `TELEGRAM_BOT_TOKEN`
- [ ] Determine the Telegram `CHAT_ID` that the bot will listen to (your personal/business Telegram)
- [ ] Add to `.env.local` and Vercel env vars:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_WEBHOOK_SECRET` (any random string for signature verification)
  - `TELEGRAM_CHAT_ID` (your authorized sender ID)

### Step 2 — Inspect Existing Webhook Scaffold
- [ ] Read `src/app/api/telegram/route.ts` — understand current state (scaffold or functional?)
- [ ] Read `src/lib/telegram.ts` — understand parser utilities available
- [ ] Identify gaps: what's missing to receive a photo+caption and create a Payload product

### Step 3 — Implement Webhook Handler
- [ ] `POST /api/telegram` receives Telegram `Update` object
- [ ] Verify `X-Telegram-Bot-Api-Secret-Token` header matches `TELEGRAM_WEBHOOK_SECRET`
- [ ] Verify sender `chat.id` matches `TELEGRAM_CHAT_ID` (reject unauthorized senders)
- [ ] Extract from message:
  - photo (largest available `file_id`)
  - caption text (title, price, stock code, quantity if present)
- [ ] Parse caption using `src/lib/telegram.ts` helpers
- [ ] Download photo from Telegram File API → upload to Payload Media collection (Vercel Blob)
- [ ] Create product draft in Payload via `payload.create({ collection: 'products', data: {...} })` with `status: 'draft'`
- [ ] Return 200 to Telegram (mandatory — Telegram retries if no 200)

### Step 4 — Register Webhook with Telegram
- [ ] Deploy to Vercel (push to main)
- [ ] Register webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://uygunayakkabi.com/api/telegram&secret_token=<SECRET>`
- [ ] Verify with: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

### Step 5 — End-to-End Test
- [ ] Send a photo + caption from your phone to the bot
- [ ] Confirm product draft appears in Payload admin under Products
- [ ] Admin reviews draft, sets status to `active` → product appears on storefront
- [ ] Validate the full loop: phone → bot → draft → admin approval → live

---

### Step 6 — Caption Parser Hardening (after MVP works)
- [ ] Define caption format convention (e.g. `Nike Air Max\n₺1200\n#AYK-001\nAdet: 5`)
- [ ] Update `src/lib/telegram.ts` parser to extract: title, price, SKU/stock code, quantity
- [ ] Handle missing fields gracefully (use defaults, not errors)
- [ ] Map parsed fields to Products collection fields

### Step 7 — Phase 2 Expansion (after thin slice validated)
- [ ] n8n integration: replace inline parsing logic with n8n workflow if complexity grows
- [ ] AI image processing: background removal / enhancement before uploading to Blob
- [ ] Instagram auto-publish: after product goes `active`, post to Instagram via Graph API
- [ ] Shopier listing sync

### Target Flow (MVP)
```
Your phone → Telegram bot (photo + caption)
    ↓
POST /api/telegram (webhook)
    ↓
Parse caption → download photo → upload to Vercel Blob
    ↓
payload.create('products', { status: 'draft', ... })
    ↓
Admin sees draft → approves → product goes live on storefront
```

---

## PHASE 3 — Autonomous Content & Growth
_(Do not begin until Phase 2 is validated)_

- [ ] Define CEO / founder blog structure
- [ ] Define product-to-blog generation system
- [ ] Define product-driven SEO content generation
- [ ] Generate product descriptions automatically
- [ ] Publish blog content on site
- [ ] Connect content layer to organic growth strategy
