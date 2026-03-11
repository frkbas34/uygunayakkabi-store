# ARCHITECTURE — Uygunayakkabi

_Last updated: 2026-03-11_

## High-Level Overview
Uygunayakkabi is a custom e-commerce system built in three evolving phases. It is not a simple storefront — its long-term identity is a **Telegram-first AI-assisted commerce system** with multi-channel publishing.

## Core Stack
- **Runtime**: Next.js 16.2.0-canary.81 (App Router, Turbopack) + React 19.2.3
- **CMS/Admin**: Payload CMS v3.79.0 (admin panel, REST API, collection management)
- **Database**: Neon PostgreSQL via `@payloadcms/db-postgres` (Drizzle ORM, `push: true`)
- **Rich Text**: Lexical editor (`@payloadcms/richtext-lexical`)
- **Image Processing**: Sharp
- **i18n**: Turkish as default language (`@payloadcms/translations/languages/tr`)
- **Styling**: Storefront uses inline-style token system (no Tailwind); Admin uses default Payload light theme (dark CSS removed)
- **Media Storage (Production)**: Vercel Blob Storage via `@payloadcms/storage-vercel-blob`

## Directory Structure

```
src/
├── app/
│   ├── (app)/                    # Public storefront (route group)
│   │   ├── layout.tsx            # Storefront layout
│   │   ├── page.tsx              # Server Component — fetches products, settings, banners
│   │   │                         #   export const dynamic = 'force-dynamic'
│   │   │                         #   Reverse media lookup (media.product → product fallback images)
│   │   │                         #   Variant size extraction via regex
│   │   │                         #   SVG placeholder only when zero real images
│   │   ├── UygunApp.jsx          # Client SPA — all storefront UI
│   │   │                         #   ENABLE_STATIC_FALLBACK = false (DB-only)
│   │   │                         #   objectFit: contain on all product images
│   │   │                         #   Hover crossfade preview on catalog cards
│   │   │                         #   Empty state when no DB products
│   │   └── products/[slug]/      # Product detail (SSR) — route exists but not linked from storefront
│   ├── (payload)/                # Admin panel (route group)
│   │   ├── layout.tsx            # Admin layout (standard Payload styles only)
│   │   ├── importMap.ts          # Manual Payload component registry (incl. VercelBlobClientUploadHandler)
│   │   └── admin/[[...segments]] # Payload admin entry
│   └── api/                      # Custom API routes
│       ├── inquiries/route.ts    # Customer inquiry endpoint
│       └── telegram/route.ts     # Telegram webhook handler (Phase 2 scaffold)
├── collections/                  # 10 Payload collections
│   ├── Products.ts               # Fully rewritten 2026-03-11:
│   │                             #   beforeValidate: auto-slug (always), auto-SKU (if empty)
│   │                             #   beforeDelete: nullify variant + media FK refs
│   │                             #   category: select field (Günlük/Spor/Klasik/Bot/Sandalet/Krampon/Cüzdan)
│   │                             #   slug: readOnly in admin, auto-generated
│   │                             #   Turkish validation messages on title and price
│   ├── Variants.ts               # useAsTitle: 'size' (not variantSku), product required: false
│   ├── Brands.ts, Categories.ts
│   ├── Orders.ts                 # Full lifecycle with payment, shipping, tracking
│   ├── Media.ts                  # staticDir = public/media; production = Vercel Blob
│   ├── Users.ts
│   ├── CustomerInquiries.ts
│   ├── InventoryLogs.ts
│   └── Banners.ts               # Campaign/promo banners with date ranges and placement
├── globals/
│   └── SiteSettings.ts          # Site-wide config (contact, shipping, trust badges, announcement)
├── components/
│   ├── ProductCard.tsx, ProductImages.tsx, ProductGrid.tsx, ContactForm.tsx
│   └── admin/Dashboard.tsx       # Custom admin dashboard (currently DISABLED in payload.config.ts)
├── lib/
│   ├── payload.ts               # Payload singleton getter
│   └── telegram.ts              # Telegram caption/stock parsers (Phase 2 scaffold)
└── styles/
    └── admin-dark.css           # GitHub-inspired dark theme (NOT imported — inactive)
```

## Data Flow

### Storefront Request Flow
1. `page.tsx` (Server Component, `force-dynamic`) fetches from Payload:
   - Products (DB only, `ENABLE_STATIC_FALLBACK = false`)
   - Reverse media lookup: queries media collection for `media.product IN [productIds]` as fallback
   - SiteSettings global
   - Active Banners
2. Data serialized and passed as props to `UygunApp.jsx` (Client Component)
3. UygunApp renders products from DB only; static products disabled
4. Dynamic values (WhatsApp, trust badges, promo banner) from SiteSettings/Banners props
5. Falls back to `DEFAULT_SETTINGS` if Payload globals not yet populated

### Admin Panel
- Payload CMS serves admin UI at `/admin`
- Custom Dashboard exists but is DISABLED (`afterDashboard` commented out in payload.config.ts)
- Admin grouped into: Mağaza, Katalog, Medya, Müşteri, Stok, Pazarlama, Ayarlar

### Media Pipeline
- **Production**: Vercel Blob Storage (`@payloadcms/storage-vercel-blob`, enabled via `BLOB_READ_WRITE_TOKEN`)
- **Local dev**: Falls back to local filesystem (`public/media/`) when `BLOB_READ_WRITE_TOKEN` is absent
- **Reverse media lookup**: `media.product` field (reverse reference) → used as fallback when `product.images[]` is empty. Prioritizes `media.url` (Blob), falls back to `/media/${filename}`
- Display: `<img>` tags (not `next/image`) to avoid remotePatterns validation (see D-025)
- `objectFit: "contain"` everywhere — no cropping of product images

### Product Deletion Flow (FK-safe)
1. Admin clicks delete on product
2. Payload triggers `beforeDelete` hook in Products.ts
3. Hook queries all variants where `variant.product = id` → sets each to `product: null`
4. Hook queries all media where `media.product = id` → sets each to `product: null`
5. Product deletion proceeds without FK constraint violation

### Slug & SKU Auto-Generation Flow
1. Admin saves a product
2. `beforeValidate` hook fires
3. `toSlug(title)` always generates/overwrites the slug
4. If `sku` is empty string or null → generates `AYK-{timestamp_base36}`
5. Field is `readOnly` in admin UI (user cannot type in slug field)

## Core Domains

### Catalog Domain
- Products (auto-slug, auto-SKU, select category, Turkish validation, delete hooks)
- Variants (size-based, required:false product FK, useAsTitle: size)
- Brands and Categories (separate collections for admin management)
- Media (Blob in production, local in dev, reverse-linked to products)

### Commerce Domain
- Orders (full lifecycle: status, payment method, shipping company, tracking, delivery)
- CustomerInquiries (inbound requests with status tracking)
- InventoryLogs (audit trail for stock changes)

### Marketing Domain
- Banners (campaign management: discount/announcement/flash_sale, date ranges, placement)
- SiteSettings (centralized control: contact info, shipping rules, trust badges, announcement bar)

### Integration Domain (Phase 2 scaffold — NOT YET ACTIVE)
- Telegram webhook handler (`src/app/api/telegram/route.ts`)
- Telegram caption/stock parsers (`src/lib/telegram.ts`)
- Future: n8n workflows, AI image pipeline, Instagram/Shopier publishing

## Architectural Phases

### Phase 1 — Core Admin + Storefront Stabilization (COMPLETE — 2026-03-11)
- Full admin panel with Turkish language, all 10 collections, SiteSettings global
- Complete storefront with CMS-first products, dynamic content, correct image display
- UX polish: objectFit contain, hover preview, no false placeholders, correct size display
- Admin stability: auto-slug, auto-SKU, FK-safe deletion, select category field
- SSL fix, reverse media lookup, debug logs removed

### Phase 2 — Automation Backbone (NEXT — pending Phase 1 user validation)
- n8n workflow orchestration
- Telegram-first product intake (phone photo + caption → webhook → CMS product)
- AI image processing (background removal, enhancement, multi-view generation)
- Multi-channel publishing (website → Instagram → Shopier)

### Phase 3 — Autonomous Content & Growth (FUTURE)
- AI-generated product descriptions
- Blog/content generation from product data
- Organic SEO content pipeline

## Architectural Boundaries
- UI components: presentation-focused, receive data via props
- Business logic: API routes, libs, collections
- External integrations: isolated in `src/lib` or dedicated modules
- Admin: override/control layer over all data (including future automation-created records)
- Automation (Phase 2): must not bypass core product model — always creates via Payload API
- SiteSettings global: single source of truth for site-wide config values used by frontend

## Known Locked Constraints
- Next.js **16.2.0-canary.81** — do not downgrade (Payload 3.x incompatible with 15.5–16.1.x)
- importMap must be manually maintained (no generate:importmap in Linux VM)
- `push: true` in DB adapter — safe for dev, switch to migrations before Phase 2 hardening
- `<img>` tags only — next/image blocked by remotePatterns for dynamic Blob/Unsplash URLs
- SSL via pool options only — not in DATABASE_URI string (pg-connection-string deprecation)
