# PROJECT STATE — Uygunayakkabi

## Current Status
Phase 1 is functionally complete. All core admin panel features, storefront UI, product management, order management, and media pipeline are implemented and committed. Awaiting user to run `npm run dev` on local machine for final runtime validation.

## Current Phase
Phase 1 — Core Admin System + Storefront Stabilization (implementation complete, awaiting runtime validation)

## Current Working State

### Admin Panel (Payload CMS)
- Admin panel loads with **dark mode** (custom GitHub-inspired theme via `src/styles/admin-dark.css`)
- **Turkish language** configured as default (`@payloadcms/translations/languages/tr`)
- importMap is manually written — includes 30+ components including custom Dashboard
- **Dashboard**: Live stats (product/order/inquiry counts fetched from Payload API), quick links to all sections
- Admin grouped: Mağaza / Katalog (Brands + Categories) / Medya / Müşteri / Stok / **Pazarlama (Banners)** / **Ayarlar (Site Settings)**
- 10 collections registered: Users, Products, Variants, Brands, Categories, Media, CustomerInquiries, InventoryLogs, Orders, **Banners**
- 1 global registered: **SiteSettings**

### Collections — Current Field State
- **Products**: title, description, brand (text), category (text — includes Cüzdan), gender, price, originalPrice, status (active/soldout/**draft**), featured, slug, sku, images, variants, **color** (new), **material** (new), telegram/automation fields
- **Orders**: orderNumber, customer fields, product/size/quantity, totalPrice, status, source, **paymentMethod** (card_on_delivery/cash_on_delivery/bank_transfer/online), **isPaid** (checkbox), notes, **shippingCompany** (yurtici/aras/mng/ptt/surat/trendyol/other), trackingNumber, shippedAt, **deliveredAt**
- **Banners** (NEW): title, subtitle, type (discount/announcement/new_season/free_shipping/flash_sale), discountPercent, couponCode, image, bgColor, textColor, linkUrl, placement (top_bar/hero/catalog_top/popup), startDate, endDate, active, sortOrder
- **SiteSettings** (NEW global): siteName, siteDescription, contact group (whatsapp, email, instagram), shipping group (freeShippingThreshold, shippingCost, showFreeShippingBanner), trustBadges group (monthlyCustomers, totalProducts, satisfactionRate), announcementBar group (enabled, text, bgColor)
- **Media**: staticDir = public/media, **staticURL = '/media'** (added for correct URL generation), image sizes (thumbnail/card/large)

### Database (Neon PostgreSQL)
- Schema sync via `push: true` — all fields aligned
- enum_products_status now includes: active, soldout, **draft**
- New tables will be created on next startup: banners, site_settings (global)
- All existing columns confirmed intact

### Storefront (Next.js)
- **UygunApp.jsx** (~817 lines): Full SPA with inline-style token system
- **39 static products** across **8 categories**: Spor(9), Günlük(12), Bot(3), Sandalet(3), Krampon(3), Klasik(3), **Cüzdan(3)**
- **Real product images**: 5 Unsplash shoe photos rotated across products + 3 wallet photos
- SVG generators: `shoe()` for shoes, `wallet()` for wallet products
- **page.tsx** (Server Component): Fetches products, **SiteSettings**, and **Banners** from Payload CMS
- **Dynamic storefront content**: AnnouncementBar, trust badges, promo banner, WhatsApp links all driven by SiteSettings global and Banners collection
- `DEFAULT_SETTINGS` fallback ensures site works even before admin populates SiteSettings
- **AnnouncementBar**: Dismissible top bar with text/color from admin
- **Promo Banner**: Dynamic title/subtitle/discount%/coupon from Banners collection
- **Trust badges**: Monthly customers, satisfaction rate from SiteSettings
- **WhatsApp**: All links use dynamic contact info from SiteSettings
- `<img>` tags used instead of `next/image` (avoids remotePatterns validation issues)
- Google Fonts: Outfit + Playfair Display loaded dynamically

### Git State
- Branch: main (ahead of origin by 2 commits)
- Latest commits:
  - `65b3987` — Connect SiteSettings & Banners to frontend dynamically
  - `c174627` — Major admin + storefront upgrade for launch readiness
  - `30f6825` — Add real product photos, wallet category, Turkish language
  - `8c3b520` — Fix photo display, add dark mode admin, polish dashboard

## Unresolved Issues
- **Git push required**: User must run `git push origin main` from Windows machine
- **Server restart required**: User must clear `.next` cache and run `npm install && npm run dev`
- **Banners table**: Will be auto-created by push on first startup — no sample data exists yet
- **SiteSettings global**: Will be auto-created by push on first startup — needs population through admin
- **public/media/ directory**: In `.gitignore` — Payload auto-creates on first upload, or user creates manually

## Known Constraints
- `npx payload generate:importmap` does not work in Linux VM (Windows node_modules esbuild mismatch) → importMap.ts maintained manually
- `push: true` will create new tables (banners, site_settings) on next startup
- Products.brand and Products.category remain `type: 'text'` (varchar) — cannot be changed to select without migration (D-022)

## Phase 1 Completion Criteria
- [x] Admin panel CSS works (dark mode)
- [x] Admin importMap complete
- [x] All collections render in admin
- [x] DB schema matches all collection definitions
- [x] Storefront implementation complete with all features
- [x] SiteSettings and Banners connected to frontend
- [x] Turkish language configured
- [x] Product images working (Unsplash + admin uploads)
- [ ] Server restart validated (no schema push errors on startup)
- [ ] End-to-end: create product via admin → appears on storefront
- [ ] SiteSettings populated through admin → reflected on storefront

## Next Major Transition
After Phase 1 runtime validation → Phase 2 — Automation Backbone
- Telegram bot integration (scaffold exists at src/app/api/telegram/route.ts)
- n8n workflow layer
- AI-assisted image pipeline
