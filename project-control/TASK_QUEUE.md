# TASK QUEUE — Uygunayakkabi

## PHASE 1 — Core Admin System + Storefront Stabilization

### ✅ Completed
- [x] Fix `UygunApp.jsx` helper ordering issue (`const U` before `const heroImg`)
- [x] Fix Payload importMap — all 29 components including CollectionCards
- [x] Fix admin panel CSS — `import '@payloadcms/next/css'` in layout.tsx
- [x] Fix media upload path — `staticDir: public/media`
- [x] Fix DB schema mismatch — confirmed all columns exist in DB
- [x] Clear `.next` cache — stale Drizzle schema was causing enum push errors
- [x] Reset payload_migrations — clean schema detection on next startup
- [x] Collection field types aligned to actual DB column types (text not select for brand/category/size)
- [x] Remove required:true from fields with potential null DB values
- [x] Rewrite `page.tsx` as Server Component — fetches Payload CMS products on each request
- [x] Update `App` to accept `dbProducts` prop + create merged `allProducts`
- [x] Update `HomePage` to use `allProducts` prop (DB products show first)
- [x] Update `CatalogPage` to use `allProducts` prop + empty-state fallback
- [x] Replace all product images with SVG shoe generator (no Unsplash on product cards)
- [x] Add `Orders` collection to admin panel
- [x] Add `Krampon` category to catalog filter and CATEGORY_DATA

### 🔲 Pending Validation
- [ ] Restart server — confirm `push: true` runs cleanly with no errors
- [ ] Confirm admin panel loads at /admin without runtime errors
- [ ] Confirm Products collection lists and edits correctly
- [ ] Confirm Variants collection lists and edits correctly
- [ ] Confirm Media upload works (file saved to public/media)
- [ ] Create a new test product via admin and confirm it appears on storefront
- [ ] Confirm no "column does not exist" or "enum" errors in terminal on startup

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
