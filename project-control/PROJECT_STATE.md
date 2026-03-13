# PROJECT STATE — Uygunayakkabi

_Last updated: 2026-03-13_

## Current Status
Phase 1 is **COMPLETE**. Production smoke test passed (2026-03-13):
- Admin → storefront end-to-end pipeline confirmed working
- Git branch confirmed clean, main authoritative

Active phase: **Phase 2 — Automation Backbone**
Entry point: Telegram-first MVP (webhook → parser → Payload draft product)

## Current Phase
Phase 2 — Automation Backbone (**ACTIVE**)

---

## Current Working State

### Admin Panel (Payload CMS)
- Admin panel loads correctly at `uygunayakkabi.com/admin` — **CONFIRMED WORKING**
- **Default Payload light theme** (dark mode CSS was removed — see D-029)
- **Turkish language** configured as default (`@payloadcms/translations/languages/tr`)
- importMap includes: all standard Payload components + VercelBlobClientUploadHandler
- **Custom Dashboard** (`afterDashboard`) is currently **DISABLED** in payload.config.ts
- Admin grouped: Mağaza / Katalog / Medya / Müşteri / Stok / Pazarlama (Banners) / Ayarlar (Site Settings)
- 10 collections registered: Users, Products, Variants, Brands, Categories, Media, CustomerInquiries, InventoryLogs, Orders, Banners
- 1 global registered: SiteSettings

### Collections — Current Field State

**Products** (fully rewritten 2026-03-11):
- Fields: title (required, Turkish validation), description, brand (text), category (select: Günlük/Spor/Klasik/Bot/Sandalet/Krampon/Cüzdan), gender, price (required, Turkish validation), originalPrice, status (active/soldout/draft), featured, slug (auto-generated, readOnly), sku (auto-generated if empty), images, variants, color, material, telegram/automation fields
- `beforeValidate` hook: always auto-generates slug from title; auto-generates SKU if empty
- `beforeDelete` hook: nullifies all variant.product and media.product references before deletion (prevents FK constraint errors)
- Status labels: Turkish with emoji indicators

**Variants** (updated 2026-03-11):
- `useAsTitle: 'size'` (changed from `variantSku` — admin shows "42" not "ADS-42")
- `product` field: `required: false` (was `required: true`) — allows product deletion without FK violation
- `size` field description: "Sadece numara yazın: 36, 37..."

**Orders**: orderNumber, customer fields, product/size/quantity, totalPrice, status, source, paymentMethod (card_on_delivery/cash_on_delivery/bank_transfer/online), isPaid, notes, shippingCompany (yurtici/aras/mng/ptt/surat/trendyol/other), trackingNumber, shippedAt, deliveredAt

**Banners**: title, subtitle, type, discountPercent, couponCode, image, bgColor, textColor, linkUrl, placement, startDate, endDate, active, sortOrder

**SiteSettings** (global): siteName, siteDescription, contact group, shipping group, trustBadges group, announcementBar group

**Media**: staticDir = public/media, staticURL = '/media', image sizes (thumbnail/card/large). Production: **Vercel Blob Storage**.

### Database (Neon PostgreSQL)
- Schema sync via `push: true`
- All collections and fields aligned
- SSL: `sslmode=require` removed from DATABASE_URI; `ssl: { rejectUnauthorized: false }` added to pool options in payload.config.ts (fixes pg-connection-string deprecation warning / red error overlay in dev)
- BLOB_READ_WRITE_TOKEN confirmed set in Vercel env vars

### Storefront (Next.js)
- **UygunApp.jsx**: Full SPA with inline-style token system
  - `ENABLE_STATIC_FALLBACK = false` — DB products are sole source of truth
  - Empty state shown in Catalog when no DB products exist
  - Card component: `objectFit: "contain"` (no cropping)
  - Card component: hover crossfade preview to second image
  - Detail page: `objectFit: "contain"` on main image and thumbnails
  - Variant display shows size number only (regex extraction)
- **page.tsx** (Server Component):
  - `export const dynamic = 'force-dynamic'`
  - Fetches products, SiteSettings, Banners from Payload CMS
  - **Reverse media lookup**: queries media collection for docs where `product` field references a product ID — used as fallback when `product.images[]` is empty
  - SVG shoe placeholder only shown when zero real images exist (not appended to real galleries)
  - Variant size extraction: regex `match(/(\d+)/)` to get number from any format
  - Debug console.log lines removed
- Dynamic storefront content: AnnouncementBar, trust badges, promo banner, WhatsApp links
- Google Fonts loaded via `<link>` tags (not next/font/google)

### Production Environment (Vercel)
- Deployment: **READY and functional**
- URL: uygunayakkabi.com
- Env vars set: DATABASE_URI, PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL, NEXT_PUBLIC_WHATSAPP_NUMBER, BLOB_READ_WRITE_TOKEN
- Next.js: **16.2.0-canary.81** (required for Payload CMS 3.79.0 compatibility)

### Git State (as of 2026-03-13)
- Branch divergence incident **RESOLVED** — main is confirmed authoritative
- Active operational rule: always pull before pushing, always work on main (see D-042)
- GitHub repo: https://github.com/frkbas34/uygunayakkabi-store
- Safe push procedure: `git pull origin main --rebase` → resolve conflicts → `git push origin main`

---

## Phase 1 Deferred Cleanup (non-blocking, Phase 2 parallel)
- **SiteSettings**: not fully populated yet — storefront falls back to DEFAULT_SETTINGS for some fields
- **Banners**: collection exists, no banners created yet
- **Admin dark mode**: `admin-dark.css` exists but inactive — re-implement if desired, without `!important`
- **favicon.ico**: missing, 404 on every page load
- **No `/products/[slug]` route**: slug auto-generated but no dedicated URL route yet
- **`push: true`**: switch to migrations before Phase 2 data model stabilizes in production

### 🟡 NON-CRITICAL — Post-Validation Cleanup
- **Custom Dashboard disabled**: `afterDashboard` commented out in payload.config.ts. Component still exists at `src/components/admin/Dashboard.tsx` but is inactive.
- **Admin dark mode removed**: `src/styles/admin-dark.css` exists but not imported. Re-implement without `!important` overrides if desired.
- **importMap is manually maintained**: `npx payload generate:importmap` does not work in Linux VM. importMap.ts must be updated manually when new plugins/components are added.
- **Banners/SiteSettings not yet populated**: tables exist but admin hasn't filled data. Storefront falls back to DEFAULT_SETTINGS.
- **favicon.ico**: missing (404 on every page load). Add any 32×32 icon to `src/app/`.
- **No `/products/[slug]` URL routing**: slug is stored and auto-generated but not used as a URL route.
- **`push: true`**: should be switched to migrations before Phase 2 goes live (low risk for now).

## Known Constraints
- `push: true` auto-applies schema changes on startup
- Next.js canary version in use (16.2.0-canary.81) — stable 16.2.x not yet released
- importMap must be maintained manually (see D-034)
- Some enum values are locked (see D-023)

## Phase 1 Completion Record ✅ (validated 2026-03-13)
- [x] Admin panel accessible and correctly rendered in production
- [x] All 10 collections + SiteSettings global visible in admin sidebar
- [x] Storefront live at uygunayakkabi.com
- [x] Media uploads working via Vercel Blob Storage
- [x] DB connected (Neon PostgreSQL)
- [x] Turkish language configured
- [x] SSL error overlay fixed (dev)
- [x] Image pipeline: reverse media lookup, objectFit contain, hover preview
- [x] Admin stability: auto-slug, auto-SKU, FK-safe deletion, select category
- [x] End-to-end pipeline: admin product → storefront confirmed ✅ (2026-03-13)
- [x] Git branch stable, main authoritative

## Next Focus
Phase 2 active. Entry point: **Telegram → webhook → parser → Payload draft product**. See TASK_QUEUE.md.
