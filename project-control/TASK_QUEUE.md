# TASK QUEUE — Uygunayakkabi

## PHASE 1 — Core Admin System + Storefront Stabilization

### ✅ Completed & Production Validated (2026-03-10)
- [x] Fix Payload importMap — all required components registered (incl. VercelBlobClientUploadHandler)
- [x] Fix admin panel CSS (dark CSS removed, default Payload theme restored)
- [x] Fix media upload — Vercel Blob Storage in production, local filesystem in dev
- [x] Fix DB schema mismatch (field types aligned to varchar columns)
- [x] Fix Next.js version — upgraded to 16.2.0-canary.81 (Payload 3.79.0 compatible)
- [x] Fix Google Fonts build failure — replaced next/font/google with <link> CDN tags
- [x] Fix TypeScript `any[]` to `never[]` error — UygunApp.d.ts declaration file
- [x] Rewrite page.tsx as Server Component (products, settings, banners)
- [x] All collections: Products, Variants, Brands, Categories, Media, Users, CustomerInquiries, InventoryLogs, Orders, Banners
- [x] SiteSettings global (contact, shipping, trust badges, announcement bar)
- [x] Turkish language configured as default
- [x] 39 static products across 8 categories as fallback layer
- [x] Product detail page, catalog page, WhatsApp order flow
- [x] Orders collection: paymentMethod, isPaid, shippingCompany, deliveredAt
- [x] Connect SiteSettings & Banners to frontend dynamically
- [x] Admin panel loads correctly in production at uygunayakkabi.com/admin ✅
- [x] Storefront live at uygunayakkabi.com ✅
- [x] Vercel env vars set (DATABASE_URI, PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL, NEXT_PUBLIC_WHATSAPP_NUMBER, BLOB_READ_WRITE_TOKEN) ✅

### 🔲 Remaining Phase 1 Validation (user must perform)
- [ ] Login to admin panel → create first admin user if not yet created
- [ ] Confirm all 10 collections visible in admin sidebar
- [ ] Upload a test image via Media collection → confirm Vercel Blob URL returned
- [ ] Create a test product via admin with uploaded image → confirm appears on storefront
- [ ] Populate SiteSettings global → confirm changes reflected on storefront
- [ ] Create a test Banner → confirm promo section updates on homepage

### 🔲 Cleanup Tasks (post-validation)
- [ ] Re-implement admin dark mode properly (without `!important` overrides that break Payload UI)
- [ ] Re-enable custom Dashboard component (`afterDashboard`) once dark mode is resolved
- [ ] Add proper favicon.ico (current site has none — 404 on every page load)

### 🔲 Phase 1 Gate
- [ ] All remaining validation items above checked
- [ ] No runtime errors in console
- [ ] End-to-end admin → storefront flow confirmed
- [ ] → Phase 1 complete → unlock Phase 2

---

## PHASE 2 — Automation Backbone
*(Do not begin until Phase 1 validation is complete)*

### Design & Setup
- [ ] Review existing Telegram webhook at `src/app/api/telegram/route.ts`
- [ ] Review existing `src/lib/telegram.ts` parser utilities
- [ ] Fill in TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_CHAT_ID in .env
- [ ] Test Telegram bot integration end-to-end (photo → product)
- [ ] Design n8n workflow architecture
- [ ] Define AI image processing step (background removal / enhancement)
- [ ] Define product ingestion mapping (Telegram caption → CMS fields)
- [ ] Define Instagram publishing flow
- [ ] Define Shopier-compatible publishing logic

---

## PHASE 3 — Autonomous Content & Growth
*(Do not begin until Phase 2 is validated)*

- [ ] Define CEO / founder blog structure
- [ ] Define product-to-blog generation system
- [ ] Define product-driven SEO content generation
- [ ] Generate product definitions automatically
- [ ] Publish blog content on site
- [ ] Connect content layer to organic growth strategy
