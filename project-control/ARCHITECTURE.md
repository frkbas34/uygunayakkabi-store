# ARCHITECTURE — Uygunayakkabi

_Last updated: 2026-03-15_

## High-Level Overview
Uygunayakkabi is a custom e-commerce system built in three evolving phases. It is not a simple storefront — its long-term identity is a **Telegram-first AI-assisted multi-channel commerce engine** with AI visual expansion, SEO content generation, and multi-product-family support (shoes, wallets, bags, accessories).

## Core Stack

### Storefront + CMS (Vercel)
- **Runtime**: Next.js 16.2.0-canary.81 (App Router, Turbopack) + React 19.2.3
- **CMS/Admin**: Payload CMS v3.79.0 (admin panel, REST API, collection management)
- **Database**: Neon PostgreSQL via `@payloadcms/db-postgres` (Drizzle ORM, `push: true`)
- **Rich Text**: Lexical editor (`@payloadcms/richtext-lexical`)
- **Image Processing**: Sharp
- **i18n**: Turkish as default language (`@payloadcms/translations/languages/tr`)
- **Styling**: Storefront uses inline-style token system (no Tailwind); Admin uses default Payload light theme
- **Media Storage (Production)**: Vercel Blob Storage via `@payloadcms/storage-vercel-blob`

### Automation Infrastructure (VPS — Netcup)
- **OS**: Ubuntu 22.04.5 LTS (128G disk, expanded root ~125G)
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy / TLS**: Caddy (Docker container, auto-HTTPS)
- **Workflow Engine**: n8n (Docker container) → `flow.uygunayakkabi.com`
- **AI Agent Layer**: OpenClaw (Docker containers) → `agent.uygunayakkabi.com`
- **Bot Interface**: Telegram bot (`mentix_aibot`) connected via OpenClaw
- **AI Model Provider**: OpenAI (`openai/gpt-5-mini`)
- **DNS/CDN**: Cloudflare (A records → VPS IP for `flow.*` and `agent.*` subdomains)

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
├── collections/                  # 11 Payload collections
│   ├── Products.ts               # Fully rewritten 2026-03-11, expanded 2026-03-15:
│   │                             #   beforeValidate: auto-slug (always), auto-SKU (if empty)
│   │                             #   beforeDelete: nullify variant + media FK refs
│   │                             #   category: select field (Günlük/Spor/Klasik/Bot/Sandalet/Krampon/Cüzdan)
│   │                             #   productFamily: select (shoes/wallets/bags/accessories) — D-054
│   │                             #   productType: text (free-form: sneaker, boot, bifold, etc.)
│   │                             #   channels group: publishWebsite/Instagram/Shopier/Dolap — D-055
│   │                             #   source: select (admin/telegram/n8n/api/import) — D-056
│   │                             #   automationMeta group: telegramChatId, lastSyncedAt, updatedBy, lockFields — D-057
│   │                             #   slug: readOnly in admin, auto-generated
│   │                             #   Turkish validation messages on title and price
│   ├── Variants.ts               # useAsTitle: 'size' (not variantSku), product required: false
│   ├── Brands.ts, Categories.ts
│   ├── Orders.ts                 # Full lifecycle with payment, shipping, tracking
│   ├── Media.ts                  # staticDir = public/media; production = Vercel Blob
│   ├── BlogPosts.ts              # SEO/content scaffold — D-058
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
- **Access control**: `access: { read: () => true }` — required for public image serving (see D-052). Without this, Payload returns 403 for unauthenticated image requests.
- **Reverse media lookup**: `media.product` field (reverse reference) → used as fallback when `product.images[]` is empty. Prioritizes `media.url` (Blob), falls back to `/media/${filename}`
- **Multi-PC rule**: Always upload via production admin to ensure Vercel Blob storage. Local uploads only persist on the uploading machine (see D-053).
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
- Products (auto-slug, auto-SKU, select category, Turkish validation, delete hooks, multi-family support, channel toggles, automation metadata)
- Variants (size-based, required:false product FK, useAsTitle: size)
- Brands and Categories (separate collections for admin management)
- Media (Blob in production, local in dev, reverse-linked to products, type: original/enhanced for AI pipeline)

### Commerce Domain
- Orders (full lifecycle: status, payment method, shipping company, tracking, delivery)
- CustomerInquiries (inbound requests with status tracking)
- InventoryLogs (audit trail for stock changes)

### Marketing Domain
- Banners (campaign management: discount/announcement/flash_sale, date ranges, placement)
- SiteSettings (centralized control: contact info, shipping rules, trust badges, announcement bar)

### Content Domain (Phase 3 — SCAFFOLDED)
- BlogPosts (title, slug, richText content, excerpt, category, tags, status, SEO fields, relatedProducts)
- Future: AI-generated product descriptions, organic SEO content pipeline

### Integration Domain (Phase 2 — INFRASTRUCTURE LIVE)
- **Telegram bot** (`mentix_aibot`): connected via OpenClaw, DM pairing complete, responding in Turkish
- **OpenClaw**: AI agent control layer, dashboard at `agent.uygunayakkabi.com`, gateway port 18789
- **n8n**: workflow engine at `flow.uygunayakkabi.com`, port 5678
- **Existing code scaffolds**: `src/app/api/telegram/route.ts` (webhook handler), `src/lib/telegram.ts` (caption/stock parsers)
- **Future**: n8n workflows triggering Payload product creation, AI image pipeline, Instagram/Shopier/Dolap publishing

### Publishing Domain (Phase 2.5 — DATA MODEL READY)
- Per-product channel toggles: website, Instagram, Shopier, Dolap (D-055)
- Source tracking: admin, telegram, n8n, api, import (D-056)
- Automation metadata: sync timestamps, updatedBy, lockFields (D-057)
- Future: n8n publish workflows read channel toggles → publish to each enabled channel

## Architectural Phases

### Phase 1 — Core Admin + Storefront Stabilization (COMPLETE ✅ — validated 2026-03-13)
- Full admin panel with Turkish language, all 10 collections, SiteSettings global
- Complete storefront with CMS-first products, dynamic content, correct image display
- UX polish: objectFit contain, hover preview, no false placeholders, correct size display
- Admin stability: auto-slug, auto-SKU, FK-safe deletion, select category field
- SSL fix, reverse media lookup, debug logs removed
- End-to-end pipeline validated: admin product → storefront confirmed working

### Phase 2 — Automation Backbone (ACTIVE ▶️ — Infrastructure Live 2026-03-14)
- VPS provisioned: Docker + Caddy + n8n + OpenClaw all running
- Telegram bot connected via OpenClaw, DM working
- OpenClaw dashboard and n8n panel both accessible via subdomains
- **Product model expanded** (2026-03-15): productFamily, productType, channels group, source, automationMeta — D-054 through D-057
- **BlogPosts collection scaffolded** (2026-03-15) — D-058
- **Next**: security rotation → persistent Docker networking → OpenClaw↔n8n integration → Payload product creation workflow
- **Target flow**: Telegram → OpenClaw → n8n workflow → Payload API → draft product → admin approval → live
- **Later expansion**: AI image processing, multi-channel publish (Instagram/Shopier/Dolap)

### Phase 3 — Autonomous Content & Growth (FUTURE — BlogPosts collection ready)
- AI-generated product descriptions
- Blog/content generation from product data (BlogPosts collection scaffolded)
- Organic SEO content pipeline
- AI visual expansion engine (non-destructive additional product images)
- Try-on UX layer on product detail pages (D-060)

## VPS Infrastructure Layout

```
VPS (Netcup — Ubuntu 22.04.5 LTS)
├── /opt/caddy/           # Caddy reverse proxy (Docker)
│   └── Caddyfile         # flow.* → n8n:5678, agent.* → openclaw:18789
├── /opt/n8n/             # n8n workflow engine (Docker)
│   └── docker-compose.yml
├── /opt/openclaw/        # OpenClaw AI agent (Docker)
│   └── docker-compose.yml
└── /home/furkan/
    └── .openclaw/
        └── openclaw.json # OpenClaw config (gateway, model, Telegram, auth)

Docker Networks:
├── web                   # Shared: Caddy ↔ n8n ↔ OpenClaw gateway
└── openclaw_default      # Internal: OpenClaw services

Domain Routing:
├── uygunayakkabi.com          → Vercel (storefront + admin)
├── flow.uygunayakkabi.com     → VPS → Caddy → n8n:5678
└── agent.uygunayakkabi.com    → VPS → Caddy → openclaw-gateway:18789
```

## Phase 2 Data Flow (Target)

```
User (phone) → Telegram DM → mentix_aibot
    ↓
OpenClaw (intent parsing / AI agent)
    ↓
n8n webhook (workflow trigger)
    ↓
n8n workflow: parse caption → download photo → upload to Vercel Blob
    ↓
Payload API: create product (status: draft)
    ↓
Admin reviews draft → sets active → product live on storefront
```

## Expanded Product Model (2026-03-15)

```
Products collection fields (grouped):
├── Core: title, description, images[], slug (auto), sku (auto), status
├── Classification: category (select — legacy shoe types), productFamily (select), productType (text)
├── Identity: brand (text), gender (select), color (text), material (text), featured (checkbox)
├── Pricing: price, originalPrice
├── Variants: variants (relationship → Variants collection)
├── Channels: channels.publishWebsite, channels.publishInstagram, channels.publishShopier, channels.publishDolap
├── Source: source (select: admin/telegram/n8n/api/import)
├── Automation: automationMeta.telegramChatId, .telegramMessageId, .lastSyncedAt, .updatedBy, .lockFields
└── Legacy: createdByAutomation (checkbox), telegramMessageId (text), postToInstagram (checkbox)
    └── Legacy fields kept for backward compatibility; new code should use channels.* and automationMeta.*
```

## Multi-Channel Publishing Flow (Target)

```
Product in Payload (status: active, channels.publishWebsite: true)
    ↓
n8n Channel Publisher Workflows:
├── Website: already live (storefront reads active products)
├── Instagram: n8n reads channels.publishInstagram → Graph API post
├── Shopier: n8n reads channels.publishShopier → Shopier API listing
└── Dolap: n8n reads channels.publishDolap → Dolap API listing
    ↓
Each workflow updates product's publishedChannels tracking
```

## Architectural Boundaries
- UI components: presentation-focused, receive data via props
- Business logic: API routes, libs, collections
- External integrations: isolated in `src/lib` or dedicated modules
- Admin: override/control layer over all data (including automation-created records)
- Automation (Phase 2): must not bypass core product model — always creates via Payload API
- VPS services: isolated from Vercel deployment; communicate via webhooks/API calls
- OpenClaw: AI agent layer, not a data store — routes intents to n8n or direct API calls
- n8n: workflow orchestration only — does not own data, calls Payload API for mutations
- SiteSettings global: single source of truth for site-wide config values used by frontend

## Known Locked Constraints
- Next.js **16.2.0-canary.81** — do not downgrade (Payload 3.x incompatible with 15.5–16.1.x)
- importMap must be manually maintained (no generate:importmap in Linux VM)
- `push: true` in DB adapter — safe for dev, switch to migrations before Phase 2 hardening
- `<img>` tags only — next/image blocked by remotePatterns for dynamic Blob/Unsplash URLs
- SSL via pool options only — not in DATABASE_URI string (pg-connection-string deprecation)
