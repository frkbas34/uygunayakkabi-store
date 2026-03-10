# PROJECT STATE — Uygunayakkabi

## Current Status
Phase 1 is **validated in production**. Admin panel and storefront are both live and functional at uygunayakkabi.com. Production deployment confirmed working as of 2026-03-10.

## Current Phase
Phase 1 — Core Admin System + Storefront Stabilization (**COMPLETE — production validated**)

## Current Working State

### Admin Panel (Payload CMS)
- Admin panel loads correctly at `uygunayakkabi.com/admin` — **CONFIRMED WORKING**
- **Default Payload light theme** (dark mode CSS was removed — see note below)
- **Turkish language** configured as default (`@payloadcms/translations/languages/tr`)
- importMap includes: all standard Payload components + VercelBlobClientUploadHandler
- **Custom Dashboard** (`afterDashboard`) is currently **DISABLED** in payload.config.ts
- Admin grouped: Mağaza / Katalog / Medya / Müşteri / Stok / Pazarlama (Banners) / Ayarlar (Site Settings)
- 10 collections registered: Users, Products, Variants, Brands, Categories, Media, CustomerInquiries, InventoryLogs, Orders, Banners
- 1 global registered: SiteSettings

### Collections — Current Field State
- **Products**: title, description, brand (text), category (text), gender, price, originalPrice, status (active/soldout/draft), featured, slug, sku, images, variants, color, material, telegram/automation fields
- **Orders**: orderNumber, customer fields, product/size/quantity, totalPrice, status, source, paymentMethod (card_on_delivery/cash_on_delivery/bank_transfer/online), isPaid, notes, shippingCompany (yurtici/aras/mng/ptt/surat/trendyol/other), trackingNumber, shippedAt, deliveredAt
- **Banners**: title, subtitle, type, discountPercent, couponCode, image, bgColor, textColor, linkUrl, placement, startDate, endDate, active, sortOrder
- **SiteSettings** (global): siteName, siteDescription, contact group, shipping group, trustBadges group, announcementBar group
- **Media**: staticDir = public/media, staticURL = '/media', image sizes (thumbnail/card/large). In production: **Vercel Blob Storage** handles media (via `@payloadcms/storage-vercel-blob`)

### Database (Neon PostgreSQL)
- Schema sync via `push: true`
- All collections and fields aligned
- BLOB_READ_WRITE_TOKEN confirmed set in Vercel env vars

### Storefront (Next.js)
- **UygunApp.jsx** (~817 lines): Full SPA with inline-style token system
- **39 static products** across **8 categories** as fallback layer
- **page.tsx** (Server Component): Fetches products, SiteSettings, and Banners from Payload CMS
- Dynamic storefront content: AnnouncementBar, trust badges, promo banner, WhatsApp links
- Google Fonts loaded via `<link>` tags (not next/font/google)

### Production Environment (Vercel)
- Deployment: **READY and functional**
- URL: uygunayakkabi.com
- Env vars set: DATABASE_URI, PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL, NEXT_PUBLIC_WHATSAPP_NUMBER, BLOB_READ_WRITE_TOKEN
- Next.js: **16.2.0-canary.81** (required for Payload CMS 3.79.0 compatibility)

### Git State
- Branch: main
- All changes committed and pushed

## Unresolved / Known Gaps
- **Custom Dashboard disabled**: `afterDashboard: ["@/components/admin/Dashboard"]` is commented out in payload.config.ts. The custom dark dashboard component still exists at `src/components/admin/Dashboard.tsx` but is inactive.
- **Admin dark mode removed**: `src/styles/admin-dark.css` exists but is no longer imported. Admin shows default Payload light theme. Dark mode should be re-implemented properly if desired.
- **importMap is manually maintained**: `npx payload generate:importmap` does not work in Linux VM (Windows node_modules esbuild mismatch). importMap.ts must be updated manually when new plugins or custom components are added.
- **Banners/SiteSettings not yet populated**: tables exist in DB but admin hasn't populated data yet. Storefront falls back to DEFAULT_SETTINGS.
- **favicon.ico**: was removed (was a broken SVG). Site has no favicon currently.

## Known Constraints
- `push: true` auto-applies schema changes on startup
- Products.brand and Products.category remain `type: 'text'` — cannot be changed to select without migration
- Next.js canary version in use (16.2.0-canary.81) — stable 16.2.x not yet released

## Phase 1 Completion Criteria
- [x] Admin panel accessible in production
- [x] Admin panel renders correctly (login, dashboard, collections)
- [x] All collections visible in admin sidebar
- [x] Storefront live at uygunayakkabi.com
- [x] Media uploads working via Vercel Blob Storage
- [x] DB connected (Neon PostgreSQL)
- [x] Turkish language configured
- [ ] End-to-end: create product via admin → appears on storefront (not yet validated by user)
- [ ] SiteSettings populated through admin → reflected on storefront (not yet validated by user)

## Next Major Transition
Phase 1 core runtime is validated. Remaining validation is end-to-end content flow (admin → storefront).
After full end-to-end validation → Phase 2 — Automation Backbone.
