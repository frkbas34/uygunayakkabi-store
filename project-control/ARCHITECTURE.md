# ARCHITECTURE — Uygunayakkabi

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
│   │   ├── UygunApp.jsx          # Client SPA — all storefront UI (~817 lines)
│   │   └── products/[slug]/      # Product detail (SSR)
│   ├── (payload)/                # Admin panel (route group)
│   │   ├── layout.tsx            # Admin layout (standard Payload styles only)
│   │   ├── importMap.ts          # Manual Payload component registry (31 components incl. VercelBlobClientUploadHandler)
│   │   └── admin/[[...segments]] # Payload admin entry
│   └── api/                      # Custom API routes
│       ├── inquiries/route.ts    # Customer inquiry endpoint
│       └── telegram/route.ts     # Telegram webhook handler (Phase 2 scaffold)
├── collections/                  # 10 Payload collections
│   ├── Products.ts, Variants.ts, Brands.ts, Categories.ts
│   ├── Orders.ts, Media.ts, Users.ts
│   ├── CustomerInquiries.ts, InventoryLogs.ts
│   └── Banners.ts               # Campaign/promo banners
├── globals/
│   └── SiteSettings.ts          # Site-wide config (contact, shipping, trust badges, announcement)
├── components/
│   ├── ProductCard.tsx, ProductImages.tsx, ProductGrid.tsx, ContactForm.tsx
│   └── admin/Dashboard.tsx       # Custom admin dashboard with live stats
├── lib/
│   ├── payload.ts               # Payload singleton getter
│   └── telegram.ts              # Telegram caption/stock parsers (Phase 2)
└── styles/
    └── admin-dark.css           # GitHub-inspired dark theme for Payload admin
```

## Data Flow

### Storefront Request Flow
1. `page.tsx` (Server Component) fetches from Payload: products, SiteSettings global, active Banners
2. Data is serialized and passed as props to `UygunApp.jsx` (Client Component)
3. UygunApp merges DB products with 39 static fallback products (deduplication by slug)
4. Dynamic values (WhatsApp, trust badges, promo banner) come from SiteSettings/Banners props
5. Falls back to `DEFAULT_SETTINGS` if Payload globals not yet populated

### Admin Panel
- Payload CMS serves admin UI at `/admin`
- Custom Dashboard fetches live stats from Payload REST API (`/api/products?limit=0&depth=0`)
- Admin grouped into: Mağaza, Katalog, Medya, Müşteri, Stok, Pazarlama, Ayarlar

### Media Pipeline
- **Production**: Vercel Blob Storage (`@payloadcms/storage-vercel-blob`, enabled via `BLOB_READ_WRITE_TOKEN`)
- **Local dev**: Falls back to local filesystem (`public/media/`) when `BLOB_READ_WRITE_TOKEN` is absent
- URL resolution: `page.tsx` checks `media.url` first, falls back to `/media/${filename}`
- Display: `<img>` tags (not `next/image`) to avoid remotePatterns validation
- External images: Unsplash URLs in static product data (whitelisted in next.config.ts)

## Core Domains

### Catalog Domain
- Products (with color, material, draft status, automation fields)
- Variants (size-specific pricing and stock)
- Brands and Categories (separate collections for admin management)
- Media (image uploads with thumbnail/card/large sizes)

### Commerce Domain
- Orders (full lifecycle: status, payment method, shipping company, tracking, delivery)
- CustomerInquiries (inbound requests with status tracking)
- InventoryLogs (audit trail for stock changes)

### Marketing Domain (NEW)
- Banners (campaign management: discount/announcement/flash_sale, date ranges, placement)
- SiteSettings (centralized control: contact info, shipping rules, trust badges, announcement bar)

### Integration Domain (Phase 2 scaffold)
- Telegram webhook handler (`src/app/api/telegram/route.ts`)
- Telegram caption/stock parsers (`src/lib/telegram.ts`)
- Future: n8n workflows, AI image pipeline, Instagram/Shopier publishing

## Architectural Phases

### Phase 1 — Core Admin + Storefront Stabilization (**PRODUCTION VALIDATED** 2026-03-10)
- Full admin panel with dark mode, Turkish language, live dashboard
- Complete storefront with 8 categories, 39 products, dynamic content
- Order/product/banner management
- SiteSettings → storefront data flow

### Phase 2 — Automation Backbone (NEXT)
- n8n workflow orchestration
- Telegram-first product intake (photo → structured data → CMS)
- AI image processing (background removal, enhancement, multi-view generation)
- Multi-channel publishing (website → Instagram → Shopier)

### Phase 3 — Autonomous Content & Growth
- AI-generated product descriptions
- Blog/content generation from product data
- Organic SEO content pipeline

## Architectural Boundaries
- UI components: presentation-focused, receive data via props
- Business logic: API routes, libs, collections
- External integrations: isolated in `src/lib` or dedicated modules
- Admin: override/control layer over all data (including future automation-created records)
- Automation: must not bypass core product model
- SiteSettings global: single source of truth for site-wide config values used by frontend
