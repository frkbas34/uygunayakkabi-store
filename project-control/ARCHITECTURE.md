# ARCHITECTURE — Uygunayakkabi

_Last updated: 2026-03-23 (Consolidated — Steps 1-19 complete, Instagram+Facebook direct publish live)_

## High-Level Overview
Uygunayakkabi is a **Telegram-first, AI-assisted, multi-channel commerce engine** with integrated content generation, visual expansion, and future try-on capabilities. It is not a simple storefront — it is a central product management system that publishes to multiple channels (website, Instagram, Shopier, Dolap) from a single source of truth (Payload CMS).

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

### Mentix Intelligence Layer v2 (OpenClaw Skills)
- **Skills Location**: VPS: `/home/furkan/.openclaw/skills/`
- **Active Skill**: `mentix-intake` (product intake via Telegram)
- **Designed Skills (pending deployment)**: 12 skills in 3 activation levels
  - **Level A (Active)**: skill-vetter, browser-automation, sql-toolkit, agent-memory, github-workflow, uptime-kuma, **product-flow-debugger** (first-class diagnostic module — 13-step trace map)
  - **Level B (Controlled)**: eachlabs-image-edit, upload-post, research-cog (optional branch), senior-backend
  - **Level C (Observe)**: learning-engine (OER separation — outcome/evaluation/reward distinct)
- **Permission Model**: Each skill has explicit ALLOWED / CONFIRM-REQUIRED / DENIED table (capability ≠ permission)
- **Decision Engine**: Formal 12-field JSON schema + confidence gate (see D-074, DECISION_POLICY.md)
- **Memory System**: File-based 12-layer structured memory at `mentix-memory/` (see D-071)
  - `policies/` (5), `runbooks/` (6), `traces/`, `evals/` (golden cases), `evaluations/`, `rewards/`
- **Learning System**: Observe-first, OER-separated reward scoring (see D-072, D-075)
- **Skill Definitions**: Repo: `mentix-skills/` → deploy to VPS via SCP
- **Memory Definitions**: Repo: `mentix-memory/` → deploy to VPS via SCP
- **Dashboard**: `mentix-skill-stack-dashboard.html` (repo root) — 7-tab interactive HTML
- **Full Matrix**: `mentix-skills/INSTALLATION_MATRIX.md`

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
│       ├── telegram/route.ts     # Telegram webhook handler (Phase 2 scaffold — not primary intake path)
│       ├── automation/
│       │   ├── products/route.ts     # POST — creates draft products from automation pipeline
│       │   │                         #   Auth: X-Automation-Secret header
│       │   │                         #   Idempotency: telegramChatId + telegramMessageId
│       │   │                         #   Returns: { status: "duplicate" } if already exists
│       │   └── attach-media/route.ts # POST — downloads Telegram file, uploads to Payload media, links to product
│       │                             #   Steps: getFile API → binary download → payload.create(media) → payload.update(product.images)
│       └── auth/
│           └── instagram/
│               ├── initiate/route.ts  # Starts Meta OAuth flow
│               └── callback/route.ts  # Multi-step token exchange + store in AutomationSettings
├── collections/                  # 11 Payload collections (BlogPosts added 2026-03-15)
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
│   ├── Banners.ts               # Campaign/promo banners with date ranges and placement
│   └── BlogPosts.ts             # AI-generated and admin SEO blog posts (added 2026-03-15)
├── globals/
│   ├── SiteSettings.ts          # Site-wide config (contact, shipping, trust badges, announcement)
│   └── AutomationSettings.ts   # Automation/publishing toggles (added 2026-03-15)
├── components/
│   ├── ProductCard.tsx, ProductImages.tsx, ProductGrid.tsx, ContactForm.tsx
│   └── admin/
│       ├── Dashboard.tsx         # Custom admin dashboard (currently DISABLED in payload.config.ts)
│       ├── ReviewPanel.tsx       # Automation product review panel (shown on edit page for non-admin source products)
│       ├── SourceBadgeCell.tsx   # Source column badge (Telegram/Otomasyon/Admin) in Products list
│       └── StatusCell.tsx        # Status column with "Aktif Yap" button + inline error display
├── lib/
│   ├── payload.ts               # Payload singleton getter
│   ├── telegram.ts              # Step 11: Enhanced caption parser + publish-readiness evaluator
│   │                            #   parseTelegramCaption / evaluatePublishReadiness / parseStockUpdate
│   ├── automationDecision.ts   # Step 12: Stateless decision layer
│   │                            #   resolveProductStatus: active vs draft, precedence gates
│   │                            #   resolveChannelTargets: global capability ∩ product intent
│   │                            #   resolveContentDecision: blog/image/tryon intent flags
│   │                            #   fetchAutomationSettings: safe Payload global fetch
│   └── channelDispatch.ts      # Step 13: Channel adapter scaffolding (Steps 1-19 expanded)
│                                #   ChannelDispatchPayload (adapter contract)
│                                #   evaluateChannelEligibility: global ∩ product intent (3-gate)
│                                #   buildDispatchPayload: structured n8n webhook body
│                                #   dispatchToChannel: POST to n8n or scaffold log
│                                #   buildChannelWebhookUrl: reads N8N_CHANNEL_*_WEBHOOK
│                                #   dispatchToChannel: parses response body → publishResult (Step 16)
│                                #   dispatchProductToChannels: orchestrator (afterChange entry point)
│                                #   publishInstagramDirectly() — 3-step direct Graph API publish (container → wait → publish)
│                                #   publishFacebookDirectly() — Page Access Token exchange → photo post
│                                #   buildInstagramCaption() — mirrors n8n caption builder
└── styles/

n8n-workflows/                   # Steps 14+16: n8n workflow assets (VCS-tracked, importable to n8n)
│   CHANNEL_DISPATCH_CONTRACT.md # Full adapter contract: payload type, sample, env vars, Step 16 real IG docs
│   channel-instagram-real.json  # Step 16: REAL Instagram Graph API v21.0 workflow (13 nodes)
│   │                            #   Bypass → Creds check → Build Caption → Create Container → Publish → Write-back
│   └── stubs/
│       channel-instagram.json   # Stub: Webhook → Log Payload → Respond 200 (reference/fallback only)
│       channel-shopier.json     # Stub: same pattern for Shopier (scaffold only)
│       channel-dolap.json       # Stub: same pattern for Dolap (scaffold only)
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

### Instagram/Facebook Publish Flow
1. Product activated (status → active) or forceRedispatch checkbox ticked
2. afterChange hook on Products triggers `dispatchProductToChannels()`
3. Instagram: if instagramTokens present + valid https:// image → `publishInstagramDirectly()`
   - Direct Graph API call (bypasses n8n)
   - 3-step: create container → wait for processing → publish
   - Caption built via `buildInstagramCaption()` (mirrors n8n logic)
   - Result written to sourceMeta.dispatchNotes with publishResult (post ID, permalink, errors)
4. Facebook: if facebookPageId present → `publishFacebookDirectly()`
   - Page Access Token exchange
   - Photo post via graph.facebook.com/{pageId}/photos
   - Result written to sourceMeta.dispatchNotes with publishResult
5. Fallback: n8n webhook if tokens absent (legacy behavior preserved)

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

### Integration Domain (Phase 2A — PIPELINE LIVE ✅)
- **Telegram bot** (`mentix_aibot`): group allowlist `[5450039553, 8049990232]`, mention-only, BotFather Group Privacy OFF
- **OpenClaw**: AI agent at `agent.uygunayakkabi.com`, mentix-intake skill at `/home/furkan/.openclaw/skills/mentix-intake/SKILL.md`
- **n8n**: workflow engine at `flow.uygunayakkabi.com`, `Mentix Intake Webhook` workflow active (`POST /webhook/mentix-intake`)
- **Payload automation endpoints**: `POST /api/automation/products` + `POST /api/automation/attach-media` (X-Automation-Secret auth)
- **Idempotency**: telegramChatId + telegramMessageId dedup — returns `{ status: "duplicate" }` if same message re-submitted
- **Publish guard**: beforeChange hook blocks activation if price ≤ 0; storefront 404s for draft slugs
- **Admin review components**: ReviewPanel, SourceBadgeCell, StatusCell all active in importMap

### Content & Growth Domain (Phase 2C/3)
- **BlogPosts**: AI-generated SEO blog posts linked to products, with draft/published states and ai/admin source tracking
- **AutomationSettings** (global): Centralized toggles for all automation behavior (publish channels, blog generation, visual expansion, group mode)

### Distribution Domain (Phase 2B — PLANNED)
- **Channel adapters**: Website (native), Instagram, Shopier, Dolap — each with independent publish toggles
- **Per-product override**: `channelTargets` field on Products allows per-product channel control

### Visual & Experience Domain (Phase 3 — PLANNED)
- **Visual Expansion Engine**: AI-generated additional product angles (2–4 from 1–2 originals) with strict product integrity preservation
- **Try-On Widget**: Photo-based AI try-on on product detail pages (future phase)

## Architectural Phases

### Phase 1 — Core Admin + Storefront Stabilization (COMPLETE ✅ — validated 2026-03-13)
- Full admin panel with Turkish language, all 10 collections, SiteSettings global
- Complete storefront with CMS-first products, dynamic content, correct image display
- UX polish: objectFit contain, hover preview, no false placeholders, correct size display
- Admin stability: auto-slug, auto-SKU, FK-safe deletion, select category field
- SSL fix, reverse media lookup, debug logs removed
- End-to-end pipeline validated: admin product → storefront confirmed working

### Phase 2A — Controlled Product Intake (STEPS 1–19 COMPLETE ✅ — 2026-03-23)
- VPS: Docker + Caddy + n8n + OpenClaw all running, Docker network persistent
- Security rotation complete, Telegram group allowlist active
- **Live flow**: Telegram mention → OpenClaw mentix-intake skill → curl n8n webhook → Parse Fields → POST /api/automation/products → Neon DB draft → Has Media? → POST /api/automation/attach-media → product.images updated
- Idempotency, admin review UI, stockQuantity, variant color, publish guard all live
- Product model expanded: `source`, `channels`, `automationMeta`, `stockQuantity`, `productFamily`, `productType`, `channelTargets`, `automationFlags`, `sourceMeta`
- AutomationSettings global for centralized toggle control
- **Step 11**: Enhanced caption parser (tolerant, Turkish+English, heuristic), publish-readiness evaluator, parser metadata stored in automationMeta (rawCaption, parseWarnings, parseConfidence)
- **Step 12**: Automation decision layer (automationDecision.ts), AutomationSettings wired into route (status/channel/content decisions), autoDecision+Reason in automationMeta, ReviewPanel decision row
- **Step 13**: Channel adapter scaffolding (channelDispatch.ts), afterChange hook on Products (status→active triggers dispatch), dispatch tracking in sourceMeta (dispatchedChannels/lastDispatchedAt/dispatchNotes), scaffold mode logs intent when webhook env vars absent
- **Step 14**: n8n stub workflow JSON files (channel-instagram/shopier/dolap), CHANNEL_DISPATCH_CONTRACT.md, ReviewPanel dispatch status section (per-channel result rows), forceRedispatch checkbox (manual re-dispatch, auto-reset), afterChange hook updated for forceRedispatch trigger
- **Step 15**: Verification pass — env var naming confirmed consistent, `extractMediaUrls()` fixed (relative → absolute URLs using NEXT_PUBLIC_SERVER_URL), `.env.example` updated with all Phase 2 vars, `E2E_TEST_CHECKLIST.md` created (120-line runbook), CHANNEL_DISPATCH_CONTRACT.md extended with media URL behavior + known limitations table
- **Step 16**: Real Instagram integration — `channel-instagram-real.json` (13-node Graph API v21.0 workflow: bypass → creds check → caption build → create container → wait → publish → structured response), `ChannelDispatchResult.publishResult` field added, `dispatchToChannel()` parses response body, Products.ts write-back includes `publishResult`, ReviewPanel shows post ID + permalink + error states. Shopier/Dolap remain scaffold-only.
- **Step 17**: Instagram OAuth token exchange — `initiate/route.ts` + `callback/route.ts` (src/app/api/auth/instagram/), long-lived token acquisition, NPE bypass protocol, token storage in AutomationSettings global
- **Step 18**: Instagram direct publish — bypass n8n, `publishInstagramDirectly()` in channelDispatch.ts, 3-step workflow (create container → wait for processing → publish), caption builder mirrors n8n logic
- **Step 19**: Facebook Page direct publish — `publishFacebookDirectly()` in channelDispatch.ts, Page Access Token exchange, correct page ID discovery via graph.facebook.com/me/accounts
- **Step 20**: Shopier product sync — `src/lib/shopierApi.ts` (REST v1 client, Bearer JWT), `src/lib/shopierSync.ts` (Payload jobs queue), `src/app/api/webhooks/shopier/route.ts` (HMAC-SHA256 multi-token verification), `src/app/api/payload-jobs/run/route.ts` (jobs runner). GitHub Actions cron every 5 min (`process-jobs.yml`). 4 webhooks registered (order.created, order.fulfilled, refund.requested, refund.updated). Smoke test: Product 11 → Shopier ID `45456186` ✅. `payload_jobs` table + `source_meta_shopier_*` columns created manually in Neon. Shopier PAT expires 2031-03-23.

### Phase 2B — Multi-Channel Distribution (PARTIALLY LIVE ✅ — 2026-03-23)
- Website publish (native — already works via active status) ✅
- Instagram adapter (Graph API — LIVE, bypasses n8n via publishInstagramDirectly) ✅
- Facebook Page adapter (LIVE, publishFacebookDirectly) ✅
- **Shopier adapter (LIVE — Step 20, non-blocking jobs queue, 5-min GitHub Actions cron)** ✅
- Dolap adapter (listing sync — PLANNED, API research needed)
- Per-channel independent toggles ✅

### Phase 2C — Content Growth Layer (PLANNED)
- BlogPosts collection with AI/admin source tracking
- AI SEO blog generation triggered by active products
- Blog publish toggle (independent from product publish)
- Focus keywords, meta descriptions, internal link suggestions

### Phase 3 — Visual & Experience (FUTURE)
- Visual Expansion Engine: AI-generated additional product angles (2–4 from 1–2 originals)
- Product integrity preservation rules and validation
- Photo-based AI try-on on product detail pages
- Prompt library system for per-family visual generation

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
User (phone) → Telegram Group/DM → mentix_aibot
    ↓
OpenClaw (intent parsing / AI agent)
    ↓
n8n webhook (workflow trigger)
    ↓
n8n workflow: parse caption → download photo → upload to Vercel Blob
    ↓
Payload API: create product (status: toggle-controlled active/draft)
    ↓
Distribution Engine (if active):
    ├─ Website (native — storefront shows active products)
    ├─ Instagram (Graph API adapter — future)
    ├─ Shopier (listing sync adapter — future)
    └─ Dolap (listing sync adapter — future)
    ↓
Content Engine (if active + generateBlog):
    └─ AI SEO blog post → BlogPosts collection
```

## Webhook Contract (OpenClaw → n8n)

```json
{
  "source": "telegram",
  "chatType": "group",
  "senderId": "123456789",
  "senderName": "Frank",
  "messageText": "Nike Air Max 90\nFiyat: 2199\nKod: AYK-001",
  "photos": [{ "telegramFileId": "abc", "telegramFileUrl": "https://..." }],
  "parsed": {
    "title": "Nike Air Max 90",
    "price": 2199,
    "sku": "AYK-001",
    "quantity": 3,
    "productFamily": "shoes",
    "productType": "sneaker",
    "publishWebsite": true,
    "generateBlog": true
  }
}
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
- `push: true` does NOT run in production (NODE_ENV=production guard in connect.js)
- `<img>` tags only — next/image blocked by remotePatterns for dynamic Blob/Unsplash URLs
- SSL via pool options only — not in DATABASE_URI string (pg-connection-string deprecation)
