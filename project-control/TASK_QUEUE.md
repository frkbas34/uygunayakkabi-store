# TASK QUEUE — Uygunayakkabi

## PHASE 1 — Core Admin System + Storefront Stabilization

### ✅ Completed
- [x] Fix `UygunApp.jsx` helper ordering issue
- [x] Fix Payload importMap — all required components registered
- [x] Fix admin panel CSS
- [x] Fix media upload path
- [x] Fix DB schema mismatch
- [x] Clear `.next` cache and reset payload_migrations
- [x] Collection field types aligned to DB column types
- [x] Rewrite `page.tsx` as Server Component
- [x] Update `App`, `HomePage`, `CatalogPage` to use `allProducts` prop
- [x] Add `Orders` collection, `Krampon` category
- [x] **Resolve merge conflicts** (copilot/setup-product-publishing-system branch)
- [x] **New Brands collection** (src/collections/Brands.ts)
- [x] **New Categories collection** (src/collections/Categories.ts)
- [x] **Admin Dashboard component** (quick links, image guide, brand tips)
- [x] **Site UI overhaul** — logo, WhatsApp number, remove obsolete text, category images, product count → 37
- [x] **WhatsApp Order Guide** replaces old CTABanner
- [x] Products: gender select field added; brand/category descriptions improved

### 🔲 Pending Validation
- [ ] Restart server — confirm `push: true` runs cleanly (new Brands + Categories tables will be created)
- [ ] Confirm admin panel loads at /admin — Dashboard visible
- [ ] Confirm Products, Brands, Categories collections render correctly
- [ ] Confirm Media upload works (file saved to public/media)
- [ ] Create a test product via admin with image → confirm appears on storefront
- [ ] Confirm Brands and Categories collections accept new entries
- [ ] Confirm no DB errors in terminal on startup
- [ ] Push to GitHub: `git push origin main` (run from local machine)

### 🔲 Phase Gate
- [ ] All validation items above checked → Phase 1 complete → unlock Phase 2

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
- [ ] Define product ingestion mapping (caption format → CMS fields)
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
