# TASK QUEUE — Uygunayakkabi

_Last updated: 2026-03-11_

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

### 🔲 Remaining Phase 1 — User Must Validate in Production

**Before switching computers, run on your machine:**
```bash
git pull origin main
npm run dev
```
(This applies schema changes — category select field, variant required: false)

**Then validate these 6 items in production:**
- [ ] Login to admin at uygunayakkabi.com/admin → confirm all 10 collections visible in sidebar
- [ ] Upload a test image via Media collection → confirm Vercel Blob URL returned (starts with `https://...blob.vercel-storage.com/...`)
- [ ] Create a test product via admin with uploaded image → confirm it appears on storefront
- [ ] Populate SiteSettings global → confirm changes (site name, WhatsApp, announcement bar) appear on storefront
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

## PHASE 2 — Automation Backbone
_(Do not begin until Phase 1 validation is complete)_

### Architecture & Setup
- [ ] Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_CHAT_ID in .env / Vercel
- [ ] Review existing Telegram webhook at `src/app/api/telegram/route.ts`
- [ ] Review existing `src/lib/telegram.ts` parser utilities
- [ ] Register Telegram bot webhook URL with BotFather: `https://uygunayakkabi.com/api/telegram`
- [ ] Test Telegram bot end-to-end: send photo + caption → webhook receives → product created in CMS

### n8n Workflow
- [ ] Set up n8n (self-hosted on VPS or n8n Cloud)
- [ ] Design n8n workflow architecture (Telegram → parse → CMS product → publish)
- [ ] Define AI image processing step (background removal / enhancement)
- [ ] Define product ingestion mapping (Telegram caption → CMS fields)
- [ ] Define Instagram publishing flow
- [ ] Define Shopier-compatible publishing logic

### Target Flow
```
Telegram (phone photo + caption)
    ↓
Telegram Bot → webhook → src/app/api/telegram/route.ts
    ↓
n8n workflow: parse caption → AI image cleanup → create product in Payload CMS
    ↓
Payload CMS → storefront live
    ↓ (optional)
n8n → Instagram post + Shopier listing
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
