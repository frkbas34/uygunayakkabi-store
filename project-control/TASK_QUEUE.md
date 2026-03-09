# TASK QUEUE — Uygunayakkabi

## PHASE 1 — Core Admin System + Storefront Stabilization

### ✅ Completed (Implementation)
- [x] Fix Payload importMap — all required components registered manually
- [x] Fix admin panel CSS
- [x] Fix media upload path (staticDir + staticURL)
- [x] Fix DB schema mismatch (field types aligned to varchar columns)
- [x] Rewrite page.tsx as Server Component (products, settings, banners)
- [x] All collections: Products, Variants, Brands, Categories, Media, Users, CustomerInquiries, InventoryLogs, Orders, Banners
- [x] SiteSettings global (contact, shipping, trust badges, announcement bar)
- [x] Admin dark mode (GitHub-inspired CSS overrides)
- [x] Turkish language configured as default
- [x] Admin Dashboard with live stats from Payload API
- [x] 39 static products across 8 categories (Spor, Günlük, Bot, Sandalet, Krampon, Klasik, Cüzdan)
- [x] Real product images (5 Unsplash shoe photos + 3 wallet photos)
- [x] SVG fallback generators (shoe + wallet)
- [x] Product detail page with multi-image gallery, size selector, stock indicator
- [x] Catalog page with 8-category filter + "Daha Fazla Göster" pagination
- [x] AnnouncementBar (dynamic from SiteSettings)
- [x] Promo banner section (dynamic from Banners collection)
- [x] Trust badges (dynamic from SiteSettings)
- [x] WhatsApp links throughout site (dynamic from SiteSettings contact)
- [x] Footer with dynamic contact info
- [x] WhatsApp Order Guide (4-step CTA)
- [x] BuyForm modal with WhatsApp shortcut
- [x] Orders collection: paymentMethod, isPaid, shippingCompany, deliveredAt
- [x] Products collection: color, material, draft status
- [x] Connect SiteSettings & Banners to frontend dynamically

### 🔲 Pending Validation (user must perform)
- [ ] Push to GitHub: `git push origin main`
- [ ] Clear .next cache: `Remove-Item -Recurse -Force .next`
- [ ] Run: `npm install && npm run dev`
- [ ] Confirm server starts without schema push errors
- [ ] Confirm admin panel loads at /admin (dark mode, Turkish)
- [ ] Confirm Dashboard shows live stats
- [ ] Confirm all collections visible in admin sidebar
- [ ] Upload a test image via Media collection → confirm file saved to public/media/
- [ ] Create a test product via admin with uploaded image → confirm appears on storefront
- [ ] Populate SiteSettings global → confirm changes reflected on storefront
- [ ] Create a test Banner → confirm promo section updates on homepage

### 🔲 Phase 1 Gate
- [ ] All validation items above checked
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
