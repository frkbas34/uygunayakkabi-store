# PROJECT STATE — Uygunayakkabi

## Current Status
Phase 1 is near-complete. Admin panel and storefront are functional. Critical schema and runtime issues have been resolved. Final validation is pending after server restart.

## Current Phase
Phase 1 — Core Admin System + Storefront Stabilization

## Current Working State

### Admin Panel (Payload CMS)
- Admin panel CSS is working (`@payloadcms/next/css` imported in layout.tsx)
- importMap is manually written and includes all required components (29 components)
- All collections load and render correctly in admin UI
- Collections: Products, Variants, Media, CustomerInquiries, InventoryLogs, Users
- Media upload path fixed: `public/media` via `staticDir`
- Product management fields: title, brand, category, price, originalPrice, status, featured, slug, SKU, images, variants, telegramMessageId, automation flags
- Admin is grouped: Mağaza / Medya / Müşteri / Stok

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
- UygunApp.jsx loads correctly (const U ordering fixed)
- `page.tsx` is Server Component — fetches active products from Payload CMS via `getPayload()`
- `App` component accepts `dbProducts` prop, merges with static fallback products → `allProducts`
- `HomePage` and `CatalogPage` both use `allProducts` prop (DB products shown first)
- All product images replaced with SVG shoe generator (no Unsplash dependencies on product cards)
- Only hero image still uses Unsplash (one stable URL, not a product card)
- `Orders` collection added to admin panel (slug: orders, group: Sipariş)
- `Krampon` category added to catalog filter and CATEGORY_DATA
- Category filter shows empty-state message when no products found

## Unresolved Issues
- Server has not yet been restarted after latest fixes (`.next` clear + migrations reset)
  → User must run: `npm run dev` in terminal to validate
- Missing media file: `Screenshot 2026-03-08 150220.png` is in DB but file not on disk
  → Minor issue, does not affect core functionality

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
