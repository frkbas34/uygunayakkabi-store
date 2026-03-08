# PROJECT STATE — Uygunayakkabi

## Current Status
Phase 1 is near-complete. Full storefront UI ported from feat/product-card branch (token design system, new Card/BuyForm/Detail/Catalog) into src/app/(app)/UygunApp.jsx (2026-03-09). Admin panel, Payload CMS integration, and DB schema all intact. Awaiting user to run `npm install && npx next build` or `npm run dev` to validate on local machine.

## Current Phase
Phase 1 — Core Admin System + Storefront Stabilization

## Current Working State

### Admin Panel (Payload CMS)
- Admin panel CSS is working (`@payloadcms/next/css` imported in layout.tsx)
- importMap is manually written and includes all required components (30+ components)
- All collections load and render correctly in admin UI
- Collections: Products, Variants, Media, CustomerInquiries, InventoryLogs, Users, **Brands (new)**, **Categories (new)**, Orders
- Media upload path fixed: `public/media` via `staticDir`
- Product management fields: title, brand, category, gender (new), price, originalPrice, status, featured, slug, SKU, images, variants, telegramMessageId, automation flags
- Admin is grouped: Mağaza / Katalog (Brands + Categories) / Medya / Müşteri / Stok
- **Dashboard component added**: Quick access cards, image upload guide, brand/category tips
- **importMap** updated to include Dashboard component

### Database (Neon PostgreSQL)
- All required columns exist in DB (confirmed via direct inspection)
- products: includes original_price, featured, telegram_message_id, post_to_instagram, created_by_automation
- variants: includes price_adjustment
- Enum types match collection definitions exactly (no orphaned types)
- payload_migrations has been reset for clean push detection

### Schema Sync Status
- `.next` cache has been cleared (was causing stale Drizzle schema)
- payload_migrations reset for clean re-scan on next startup
- Collections use field types matching actual DB column types:
  - brand: text (varchar in DB) ✓
  - category: text (varchar in DB) ✓
  - size (variants): text (varchar in DB) ✓
  - status: select — matches existing enum_products_status ✓

### Storefront (Next.js)
- UygunApp.jsx: Fully ported from feat/product-card branch design
- Uses **inline-style token system** (T = {f, d, bk, wh, ac, gn, r}) — no Tailwind
- Google Fonts: Outfit + Playfair Display loaded dynamically
- `page.tsx` is Server Component — fetches active products from Payload CMS via `getPayload()`
- `App` component accepts `dbProducts` prop (pre-processed by page.tsx) + merges with static products
- **36 static products** across 7 categories: Spor(9), Günlük(12), Bot(3), Sandalet(3), Krampon(3), Klasik(3), + 3 more in Spor
- All brand-named: Nike, Adidas, New Balance, Puma, Converse, Reebok, Vans, Asics, Birkenstock, Timberland, Dr. Martens, UGG, Havaianas, etc.
- **Card component**: hover animation (translateY + scale + shadow), discount % badge, "İncele →" reveal overlay
- **BuyForm modal**: contact form popup with WhatsApp shortcut
- **Detail page**: multi-image gallery with thumbnails, size selector, stock status indicator
- **Catalog**: 7-category filter buttons (Tümü/Spor/Günlük/Bot/Sandalet/Krampon/Klasik) + "Daha Fazla Göster" load more
- **Navbar**: blur backdrop, scrollable, WhatsApp CTA (green button)
- **Footer**: 4 columns including WhatsApp order section
- WhatsApp number: 0533 152 48 43 / wa.me/905331524843 (correct everywhere)
- Home hero badge: "Güncel Koleksiyon" (not "Yeni Sezon 2025")
- "Aylık 500" mutlu müşteri (not "500+")
- Removed: "Hemen Ara", "%100 Orijinal", "Yeni Sezon 2025"
- WhatsApp Order Guide: 4-step CTA section at bottom of Home
- Trust badges: Hızlı Kargo / Kolay İade / Güvenli Ödeme

## Unresolved Issues
- **Server restart required**: User must clear `.next` cache and run `npm install && npm run dev`
  → Steps: (1) Delete `.next` folder, (2) `npm install`, (3) `npm run dev`
  → Why: Stale `.next` build has old importMap, stale node_modules from branch switch
- Missing media file: `Screenshot 2026-03-08 150220.png` is in DB but file not on disk
  → Minor issue, does not affect core functionality
- **Git push**: Commits `bf35855`, `ccc5ee1`, `eb9baf6` exist on VM but not pushed to GitHub
  → User must run: `git push origin main` from Windows machine

## Known Constraints
- `npx payload generate:importmap` does not work in Linux VM (Windows node_modules esbuild mismatch)
  → importMap.ts must be maintained manually
- `push: true` will detect schema on fresh start; expected to be clean no-op after cache clear
- sslmode=verify-full used in DATABASE_URI (warnings suppressed)

## Phase 1 Completion Criteria
- [x] Admin panel CSS works
- [x] Admin importMap complete (no more PayloadComponent missing errors)
- [x] All collections render in admin
- [x] DB schema matches all collection definitions
- [x] Storefront loads without runtime 500 errors
- [ ] Server restart validated (no more schema push errors on startup)
- [ ] End-to-end: create product via admin → appears on storefront

## Next Major Transition
After Phase 1 validated → Phase 2 — Automation Backbone
- Telegram bot integration (scaffold exists at src/app/api/telegram/route.ts)
- n8n workflow layer
- AI-assisted image pipeline
