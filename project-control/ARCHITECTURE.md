# ARCHITECTURE — Uygunayakkabi

_Last updated: 2026-04-19 (Memory cleanup — intake path corrected, platform limits added, OpenClaw/n8n roles clarified)_

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

### Primary Product Intake (Vercel — Direct Telegram Webhook)
- **Path**: Telegram → `POST /api/telegram` (Vercel serverless) → Payload CMS → Neon DB
- **Auth**: `X-Telegram-Bot-Api-Secret-Token` verified on all incoming requests
- **Bots**: @Uygunops_bot (operator commands, product intake), @Geeeeobot (content generation)
- **No VPS dependency for product creation** — direct webhook since Steps 22–24 (D-096)

### VPS Infrastructure (Netcup — Operations/Support Layer)
- **OS**: Ubuntu 22.04.5 LTS (128G disk, expanded root ~125G)
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy / TLS**: Caddy (Docker container, auto-HTTPS)
- **Workflow/Support Engine**: n8n (Docker container) → `flow.uygunayakkabi.com` — orchestration and support layer where current code still uses it (e.g., possible Instagram dispatch fallback). NOT the primary product intake path.
- **AI Agent/Operations Layer**: OpenClaw (Docker containers) → `agent.uygunayakkabi.com` — hosts Mentix skills for operations, debugging, diagnostics, and decision support. NOT the primary product intake path.
- **AI Model Provider**: OpenAI (`openai/gpt-5-mini`) for OpenClaw/Mentix reasoning
- **DNS/CDN**: Cloudflare (A records → VPS IP for `flow.*` and `agent.*` subdomains)

### Mentix Intelligence Layer v2 (OpenClaw Skills)
- **Skills Location**: VPS: `/home/furkan/.openclaw/skills/`
- **Active Skill**: `mentix-intake` (operations intake via Telegram — NOT primary product creation)
- **Deployed Skills**: 13 skills in 3 activation levels (deployed to VPS 2026-03-22)
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
│       ├── telegram/route.ts     # PRIMARY Telegram webhook handler — product intake, operator commands, image gen, wizard, all bot interactions (4700+ lines)
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

### Integration Domain (PIPELINE LIVE ✅)
- **Telegram bot** (`@Uygunops_bot`): group allowlist `[5450039553, 8049990232]`, BotFather Group Privacy OFF
- **Primary intake**: Direct Telegram webhook → `POST /api/telegram` → Payload CMS (D-096, Steps 22–24)
- **OpenClaw** (operations layer): AI agent at `agent.uygunayakkabi.com`, 13 Mentix skills deployed for debugging, diagnostics, decision support. NOT primary product intake.
- **n8n** (support layer): workflow engine at `flow.uygunayakkabi.com`, available for orchestration/support. NOT primary product intake.
- **Payload automation endpoints** (legacy, still functional): `POST /api/automation/products` + `POST /api/automation/attach-media` (X-Automation-Secret auth) — used by the old OpenClaw→n8n intake path
- **Idempotency**: telegramChatId + telegramMessageId dedup — returns `{ status: "duplicate" }` if same message re-submitted
- **Publish guard**: beforeChange hook blocks activation if price ≤ 0; storefront 404s for draft slugs
- **Admin review components**: ReviewPanel, SourceBadgeCell, StatusCell all active in importMap

### Content & Growth Domain (Phase 2C/3)
- **BlogPosts**: AI-generated SEO blog posts linked to products, with draft/published states and ai/admin source tracking
- **AutomationSettings** (global): Centralized toggles for all automation behavior (publish channels, blog generation, visual expansion, group mode)

### Distribution Domain (Phase 2B — PARTIALLY LIVE)
- **Live channels**: Website (native), Instagram (Graph API direct), Facebook (Graph API direct), X/Twitter (API v2, OAuth 1.0a), Shopier (jobs queue sync)
- **De-scoped**: Dolap (no public API found, scaffold-only), LinkedIn (scaffold + OAuth callback, no post implementation)
- **Per-product override**: `channelTargets` field on Products allows per-product channel control
- **Publish rule**: All external publishing requires explicit human confirmation — no auto-publish

### Platform Limits / Blocked Channels
- **Telegram Stories**: BLOCKED — Telegram Bot API does not support story publishing. Bot can only send messages/photos/videos, not stories. StoryJobs collection and dispatch code exist but cannot actually publish stories until API support is added.
- **WhatsApp Status**: BLOCKED — official WhatsApp Business API does not support status/story publishing. Marked `blocked_officially` in `src/lib/storyTargets.ts`.
- **Instagram**: ALLOWED — Graph API direct publish, single image and carousel supported. Requires explicit approval. Token expires ~60 days (refresh needed before ~2026-05-20).
- **Facebook Page**: ALLOWED — Graph API photo post with Page Access Token exchange. Requires explicit approval.
- **Shopier**: ALLOWED — REST API v1 product sync via jobs queue. Shopier PAT expires 2031-03-23.

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

### Phase 2A — Controlled Product Intake (STEPS 1–24 COMPLETE ✅ — 2026-03-28)
- VPS: Docker + Caddy + n8n + OpenClaw all running, Docker network persistent
- Security rotation complete, Telegram group allowlist active
- **Original flow (Steps 1–19, SUPERSEDED for primary intake)**: Telegram → OpenClaw → n8n → Payload API
- **Current flow (Steps 22–24, D-096)**: Telegram → `POST /api/telegram` (Vercel) → Payload CMS directly. No VPS dependency for product creation.
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

### Phase 2B — Multi-Channel Distribution (PARTIALLY LIVE ✅ — 2026-04-14)
- Website publish (native — already works via active status) ✅
- Instagram adapter (Graph API — LIVE, direct publish from Payload) ✅
- Facebook Page adapter (LIVE, direct publish from Payload) ✅
- X/Twitter adapter (LIVE — API v2, OAuth 1.0a, D-195c, prod-validated 2026-04-14) ✅
- **Shopier adapter (LIVE — Step 20, non-blocking jobs queue, 5-min GitHub Actions cron)** ✅
- Dolap adapter — DE-SCOPED (no public API found, scaffold-only code exists)
- LinkedIn adapter — DE-SCOPED (scaffold + OAuth callback, no post implementation)
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

## Product Intake Data Flow (Current — since Steps 22–24, D-096)

```
User (phone) → Telegram Group/DM → @Uygunops_bot
    ↓
Vercel Serverless: POST /api/telegram (direct webhook, X-Telegram-Bot-Api-Secret-Token auth)
    ↓
route.ts: parse caption → download photo → upload to Vercel Blob → create Payload Media + Product (draft)
    ↓
Operator: /confirm → wizard → content generation → audit → publish readiness
    ↓
Distribution Engine (on status=active, explicit approval):
    ├─ Website (native — storefront shows active products)
    ├─ Instagram (Graph API direct publish — publishInstagramDirectly)
    ├─ Facebook (Graph API direct publish — publishFacebookDirectly)
    ├─ X/Twitter (API v2 direct publish — OAuth 1.0a)
    └─ Shopier (Payload jobs queue — shopierSyncTask)
    ↓
Content Engine (after /confirm — Geobot):
    └─ Gemini 2.5 Flash → commerce pack + discovery pack → draft BlogPost
```

## SUPERSEDED: Old Intake Data Flow (Steps 1–19, before D-096)

_The following intake path was the original design. It has been replaced by the direct Telegram webhook above. OpenClaw and n8n remain active for operations/support but are NOT the primary product intake path._

```
[SUPERSEDED] User → Telegram → OpenClaw (mentix-intake) → n8n webhook → Payload API
```

## Webhook Contract (OpenClaw → n8n) — HISTORICAL REFERENCE

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
- OpenClaw: AI operations/debug layer — hosts Mentix skills for diagnostics, decision support, and operations. NOT the primary product intake path (superseded by direct webhook in Steps 22–24).
- n8n: workflow orchestration/support layer — available for complex multi-step workflows. NOT the primary product intake path. May still be used for channel dispatch fallback.
- SiteSettings global: single source of truth for site-wide config values used by frontend

## Phase 13 Prep — Production Hardening Execution (2026-04-04)
- `src/app/api/generate-api-key/route.ts` — hardcoded secret removed:
  - Was: `'uygun-setup-2026-mentix'` in source control
  - Now: reads `GENERATE_API_KEY_SECRET` env var; returns 500 if not set
- `.env.example` — complete rewrite:
  - 7 missing vars added (TELEGRAM_CHAT_ID, ANTHROPIC_API_KEY, GEMINI_VISION_MODEL, INSTAGRAM_PAGE_ID, INSTAGRAM_USER_ID, OPENAI_IMAGE_MODEL, GENERATE_API_KEY_SECRET)
  - 3 stale vars removed (N8N_INTAKE_WEBHOOK, N8N_API_KEY, N8N_BASE_URL)
  - Classified sections: Critical / Core Operator / AI / Commerce / Social / Optional
- `project-control/MIGRATION_NOTES.md` — improved with exact DDL capture procedure:
  - 5-step migration procedure: capture DDL from local dev → diff against prod → apply → deploy → verify
  - Caveat: SQL in doc is approximate; always verify against local `push:true` run
- `project-control/DEPLOY_CHECKLIST.md` — security checklist updated with D-115 fix
- `project-control/PRODUCTION_TRUTH_MATRIX.md` — timestamps updated to D-115
- Scope: PREP ONLY — no production database or Vercel mutations

## Phase 13 Production Hardening + Migration Pack (2026-04-04)
- `project-control/MIGRATION_NOTES.md` — complete schema migration guide:
  - 14 collections, 3 globals, 80+ Products table columns
  - SQL DDL examples for all Phase 1-12 additions
  - payload_locked_documents_rels requirements
  - Migration order and caveats
- `project-control/DEPLOY_CHECKLIST.md` — deployment readiness:
  - 43+ environment variables classified (critical/required/optional)
  - Feature status matrix (prod-validated vs code-complete)
  - Deploy sequence: database → code → post-deploy validation
  - Security checklist
- `project-control/SMOKE_TESTS.md` — 15 test scenarios:
  - Full pipeline: intake → image → confirm → content → audit → pipeline → merch → stock → soldout
  - Each test: trigger, expected DB result, expected Telegram output, fail behavior
  - 12-step end-to-end integration test plan
- `project-control/PRODUCTION_TRUTH_MATRIX.md` — honest subsystem status:
  - 22 prod-validated, 28 implemented not validated, 2 blocked, 4 scaffolded, 1 not implemented
- `src/app/api/telegram/route.ts` — `/diagnostics` command:
  - DB connectivity, env var check, latest BotEvent, order/product counts, runtime info

## Phase 12 Final Publish Autonomy + Orchestration Polish (2026-04-04)
- `src/lib/publishReadiness.ts` — central publish readiness evaluation:
  - `evaluatePublishReadiness(product)` — 6-dimension check returning not_ready/partially_ready/ready
  - Dimensions: confirmation, visuals, content, audit, sellable, publish_targets
  - `computePipelineStatus(product)` — 10-stage lifecycle status for operator visibility
  - `detectStateIncoherence(product)` — catches contradictory states (7 validation rules)
  - `formatReadinessMessage()`, `formatPipelineMessage()`, `formatCoherenceMessage()` — Telegram HTML output
- `src/lib/mentixAudit.ts` — readiness wired into post-audit flow:
  - After audit writes results, evaluates full readiness via `evaluatePublishReadiness()`
  - `workflowStatus='publish_ready'` set ONLY when all 6 dimensions pass (not just audit approval)
  - Emits `product.publish_ready` BotEvent when fully ready
  - Fallback: if readiness eval fails, uses audit-only approval (backward compat)
- `src/app/api/telegram/route.ts` — `/pipeline {id}` command:
  - Shows 10 lifecycle stages: Intake → Visuals → Confirmation → Content → Audit → Readiness → Publish → Stock → Merchandising → Story
  - Shows publish readiness breakdown with 6 dimensions and blockers
  - Shows state coherence issues if any detected
- State coherence rules (7 validations):
  1. status=active but workflowStatus is pre-publish
  2. status=soldout but stockState ≠ sold_out
  3. status=soldout but sellable=true
  4. approvedForPublish=true but auditStatus is failed/needs_revision
  5. workflowStatus=publish_ready but confirmationStatus ≠ confirmed
  6. contentStatus=ready but workflowStatus before content_ready
  7. sellable=true but stockState=sold_out

## Phase 11 Homepage Merchandising UI + Telegram Merch Commands (2026-04-04)
- `src/app/(app)/page.tsx` — builds `sectionIds` from `resolveHomepageSections()`:
  - Maps each section (yeni, popular, bestSellers, deals, discounted) to `db_${p.id}` ID arrays
  - Passes `sections={sectionIds}` prop to `<App>` component
- `src/app/(app)/UygunApp.d.ts` — new `HomepageSections` interface, extended `AppProps`
- `src/app/(app)/UygunApp.jsx` — client-side merchandising rendering:
  - `Home` component receives `sections` prop, resolves IDs to product objects
  - 5 sections: Yeni Ürünler, Popüler, Çok Satanlar, Fırsatlar, İndirimli Ürünler
  - Client-side fallbacks when server sections empty (backward compat)
  - Popüler and Fırsatlar only render when server provides data (no false content)
- `src/app/api/telegram/route.ts` — `/merch` operator commands:
  - `/merch preview` — all 5 sections with counts and product names
  - `/merch status {id}` — full merchandising state, section membership, eligibility
  - `/merch popular add/remove {id}` — toggles `merchandising.isPopular`
  - `/merch deal add/remove {id}` — toggles `merchandising.isDeal`
  - `/merch bestseller pin/unpin/exclude/include {id}` — controls pinning and exclusion
  - All updates use `isDispatchUpdate` context to prevent hook re-triggers
- Data flow: page.tsx → resolveHomepageSections() → sectionIds → App → Home → resolve(ids) → render

## Phase 10 Homepage + Order + Stock Recovery (2026-04-04)
- `src/app/(app)/page.tsx` — homepage now uses merchandising engine server-side:
  - Fetches active + soldout products, applies `isHomepageEligible()` filter
  - Calls `resolveHomepageSections()` with HomepageMerchandisingSettings
  - Only eligible products passed to UygunApp client component
  - Soldout/non-sellable products excluded at server level before client rendering
- `src/collections/Variants.ts` — new afterChange hook:
  - Triggers `reactToStockChange()` when variant stock changes via admin UI
  - Uses isDispatchUpdate to prevent loops
  - Only fires when stock actually changed (delta check)
- `src/collections/Orders.ts` — new afterChange hook:
  - Auto-decrements product + variant stock on non-Shopier order creation
  - Covers website, phone, telegram, manual orders
  - Creates InventoryLog + triggers `reactToStockChange()`
  - Skips Shopier source (handled in webhook)
- `src/app/api/webhooks/shopier/route.ts` — refund stock restoration:
  - `handleRefundRequested()` now increments product + variant stock on order cancellation
  - Creates InventoryLog with positive change
  - Triggers `reactToStockChange()` (may fire product.restocked)
- `src/lib/stockReaction.ts` — low-stock Telegram alerts:
  - `sendStockAlertToTelegram()` fires on soldout, restock, low_stock transitions
  - HTML-formatted message with product title, stock, variant breakdown
  - Uses TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID env vars

## Phase 9 Order / Stock / Soldout Autonomy (2026-04-04)
- `src/lib/stockReaction.ts` — central stock-change reaction logic:
  - `getStockSnapshot(payload, productId)` — computes effective stock from variant-level stock + product-level fallback
  - `determineStockState(effectiveStock, previousState)` — state machine: in_stock / low_stock (≤3) / sold_out / restocked
  - `computeTransition(product, snapshot)` — detects soldout/restock transitions
  - `reactToStockChange(payload, productOrId, source, req)` — central entry point:
    1. Computes snapshot via variant query
    2. Determines transition
    3. Updates workflow.stockState, workflow.sellable, workflow.workflowStatus, product.status
    4. Syncs product-level stockQuantity from variant total
    5. Emits BotEvents (stock.changed, product.soldout, product.restocked)
  - `formatStockStatusMessage()` — Telegram display with per-variant breakdown
- Integration points (called after stock changes):
  - Shopier webhook: `decrementStockForOrder()` → returns affected product IDs → `reactToStockChange()` per product
  - Telegram STOCK command: after variant updates → `reactToStockChange()` with inline soldout/restock feedback
- Merchandising exclusion: via existing `isHomepageEligible()` in merchandising.ts — checks status, stockState, sellable
  - No changes to merchandising.ts — Phase 2 already built correct gates
- Soldout transition: status=soldout, workflowStatus=soldout, stockState=sold_out, sellable=false
- Restock transition: status=active, workflowStatus=active, stockState settled to in_stock/low_stock, sellable=true
- Product page stays live when soldout — visible but not sellable
- Telegram: `/stok {id}` shows full stock status with variant breakdown
- BotEvents: stock.changed (every change), product.soldout, product.restocked
- Uses isDispatchUpdate context flag to prevent afterChange re-trigger loops

## Phase 8 Mentix Audit + Content Review Layer (2026-04-04)
- Products.auditResult group (9 fields):
  - `visualAudit` (select: not_reviewed/pass/pass_with_warning/fail)
  - `commerceAudit` (select: same options)
  - `discoveryAudit` (select: same options)
  - `overallResult` (select: not_reviewed/approved/approved_with_warning/needs_revision/failed)
  - `approvedForPublish` (checkbox, readOnly, default false)
  - `warnings` (json, readOnly) — aggregated from all dimensions
  - `revisionNotes` (textarea) — operator-editable revision guidance
  - `auditedAt` (date, readOnly) — last audit timestamp
  - `auditedByBot` (select: mentix/operator/system, readOnly)
- `src/lib/mentixAudit.ts` — 4-dimension audit runtime:
  - `auditVisual(product)` — checks images + generativeGallery + visualStatus
  - `auditCommerce(product)` — checks commerce pack fields + confidence >= 50
  - `auditDiscovery(product)` — checks discovery pack + FAQ >= 2 + keywords >= 3 + blog linked
  - `runFullAudit(product)` — orchestrates all dimensions, determines overallResult
  - `triggerAudit(payload, product, source, req)` — sets audit_pending, runs audit, writes results, emits BotEvents
  - `formatAuditStatusMessage(product)` — Telegram audit display
- Auto-trigger: contentPack.ts → after emitContentReady → non-blocking dynamic import of mentixAudit → triggerAudit
  - Re-fetches product (depth=1) to get populated content fields
  - shouldAutoTriggerAudit prevents duplicate runs
- Telegram: `/audit {id}` shows status, `/audit {id} run` forces audit execution
- BotEvents: audit.requested → audit.started → audit.approved/approved_with_warning/needs_revision/failed
- State transitions: auditStatus pending → approved/needs_revision/failed; workflowStatus content_ready → audit_pending → publish_ready
- approvedForPublish = true ONLY for approved or approved_with_warning
- Uses existing workflow.auditStatus enum from Phase 1 Schema Foundation (D-102)

## Phase 7 Geobot AI Runtime Wiring (2026-04-04)
- `src/lib/geobotRuntime.ts` — real AI content generation via Gemini 2.5 Flash (raw fetch, same pattern as imageProviders.ts)
  - `callGeminiText(prompt)` — generic Gemini text generation with JSON response mode
  - `buildProductContext(product)` — converts product data to structured Turkish text for prompts
  - `generateCommercePack(product)` — generates 5 channel-specific copies + highlights with confidence scoring
  - `generateDiscoveryPack(product)` — generates SEO article (800-1500 words), meta, FAQ, keywords, internal links
  - `generateFullContentPack(product)` — orchestrates both packs sequentially, supports partial success
- `triggerContentGeneration()` in contentPack.ts — NOW CALLS REAL RUNTIME:
  1. Sets content_pending state + emits content.requested
  2. Resolves brand name from relationship ID
  3. Resolves variant data if only IDs present
  4. Calls generateFullContentPack() via geobotRuntime
  5. Writes real content to product.content.commercePack / discoveryPack
  6. Sets truthful contentStatus (commerce_generated / discovery_generated / ready / failed)
  7. Emits content.commerce_generated and/or content.discovery_generated BotEvents
  8. Creates draft BlogPost from discovery pack (slug, excerpt, Lexical richText, SEO fields, relatedProducts)
  9. Links BlogPost via content.linkedBlogPost
  10. Emits content.ready if both packs succeeded
- Generation is truthful: if GEMINI_API_KEY not set, stays pending (no fake content). If API fails, status = failed.
- Partial success: one pack failure doesn't block the other. contentStatus reflects actual state.
- BlogPost: created as draft (status=draft, source=ai, author=Geobot), linked to product
- Env dependency: GEMINI_API_KEY (same key used for image generation vision tasks)

## Phase 6 Geobot Content Pack Foundation (2026-04-04)
- Products.content group added with two sub-groups:
  - `commercePack` (9 fields): websiteDescription, instagramCaption, xPost, facebookCopy, shopierCopy, highlights, confidence, warnings, generatedAt
  - `discoveryPack` (10 fields): articleTitle, articleBody, metaTitle, metaDescription, faq, keywordEntities, internalLinkTargets, confidence, warnings, generatedAt
  - `linkedBlogPost` (relationship → blog-posts): auto-linked when discovery content generates blog post
  - `contentGenerationSource` (select): none, geobot, manual, import
  - `lastContentGenerationAt` (date): last content generation timestamp
- `src/lib/contentPack.ts` — content lifecycle helper library:
  - `checkContentReadiness(product)` — evaluates commerce + discovery completeness, determines contentStatus
  - `isContentEligible(product)` — confirmed + not already ready
  - `shouldAutoTriggerContent(product)` — eligible + content still pending
  - `triggerContentGeneration(payload, product, source, req)` — sets content_pending, emits content.requested BotEvent
  - `markCommerceGenerated()`, `markDiscoveryGenerated()` — partial completion handlers (for future Geobot runtime)
  - `markContentFailed()` — failure handler
  - `emitContentReady()` — emits content.ready when both packs complete
  - `formatContentStatusMessage()` — Telegram status display
- Auto-trigger: `confirmationWizard.ts` → `applyConfirmation()` now calls `triggerContentGeneration()` non-blocking after confirmation
- Telegram: `/content {id}` shows status, `/content {id} trigger` manually triggers generation
- BotEvents: content.requested (pending), content.commerce_generated, content.discovery_generated, content.ready, content.failed
- State transitions: confirmed → content_pending (workflowStatus), pending → commerce_generated/discovery_generated → ready (contentStatus)
- CRITICAL: Geobot runtime NOT yet wired — triggerContentGeneration only sets states + emits events. No fake content generation.
- Uses existing workflow.contentStatus enum (Phase 1): pending, commerce_generated, discovery_generated, ready, failed

## Phase 5 Product Confirmation Wizard (2026-04-04)
- `src/lib/confirmationWizard.ts` — pure logic library for confirmation flow
  - `checkConfirmationFields(product)` — checks required/optional fields, returns ready/missing/visual status
  - `getNextWizardStep(product, collected)` — state machine: category → price → sizes → stock → targets → summary
  - `parsePrice()`, `parseSizes()`, `parseStockNumber()`, `parseChannelTargets()` — safe input parsers
  - `formatConfirmationSummary(product, collected)` — structured Telegram summary with all fields
  - `applyConfirmation(payload, productId, collected, product, req)` — writes fields, creates variants, sets confirmed state, emits BotEvent
  - In-memory wizard sessions with 30-minute auto-expiry (one active per chat)
- Telegram route additions:
  - `/confirm {productId}` — starts wizard or shows summary if all fields present
  - `/confirm_cancel` — cancel active wizard
  - `/confirm {productId} force` — re-confirm already-confirmed product
  - Callback handlers: `wz_cat:{value}`, `wz_tgt:{value}`, `wz_confirm:{productId}`, `wz_cancel:{productId}`
  - Text input interceptor: captures price/sizes/stock text when wizard is active (before any other command processing)
- Required fields: category, price, sizes (variants), stock, channelTargets
- Optional (noted if missing): brand, productType
- State transitions on confirmation: confirmationStatus → confirmed, productConfirmedAt → now, lastHandledByBot → uygunops, workflowStatus → confirmed (if in pre-confirm state)
- BotEvent emitted: `product.confirmed` with fieldsCollected, variantsCreated, previousWorkflowStatus
- Product creation message now includes `/confirm {id}` hint for missing fields
- Backward-safe: products with null workflow fields skipped, no existing hooks modified

## Phase 4 Story Pipeline Wiring (2026-04-04)
- Story dispatch wired into Products.ts afterChange hook — non-blocking, after channel dispatch, inside isStatusTransition check
- Trigger condition: `shouldAutoTriggerStory(doc)` — checks storySettings.enabled + autoOnPublish
- Uses `dispatchStory()` from `src/lib/storyDispatch.ts` — creates StoryJob, resolves targets, updates sourceMeta
- Wrapped in try/catch — story failure never blocks product publish or channel dispatch
- Telegram operator commands added to `src/app/api/telegram/route.ts`:
  - `/story {productId}` — queue story with approval keyboard (approve/reject inline buttons)
  - `/restory {productId}` — retry failed story
  - `/targets {productId}` — show product story target config
  - `/approve_story {jobId}` — approve pending story
  - `/reject_story {jobId}` — reject pending story
- Callback query handlers: `storyapprove:{jobId}`, `storyreject:{jobId}`, `storyretry:{jobId}`
- CRITICAL RULE: No fake Telegram story publishing via sendPhoto/sendVideo — Bot API does not support stories
- All commands include truthful note: "Telegram Bot API henüz story yayını desteklemiyor"
- Statuses remain truthful: queued, approved, awaiting_approval — never falsely "published"

## Phase 3 Story Pipeline Foundation (2026-04-04)
- Products.storySettings group: enabled, autoOnPublish, skipApproval, captionMode, primaryAsset, storyTargets
- Products.sourceMeta extended: storyStatus, storyQueuedAt, storyPublishedAt, storyTargetsPublished, storyTargetsFailed, lastStoryError, lastStoryAsset, lastStoryCaption
- New collection: `StoryJobs` (slug: `story-jobs`) — story job pipeline tracking with approval states
- AutomationSettings.storyTargets: configurable array of story target endpoints (platform, mode, businessConnectionId, etc.)
- `src/lib/storyTargets.ts` — target resolution, blocked platform detection (WhatsApp = blocked_officially), product target merging
- `src/lib/storyDispatch.ts` — non-blocking story dispatch: asset resolution, caption generation, StoryJob creation, sourceMeta update
- Collections registered: 15 total (added StoryJobs)
- Non-blocking design rule: story failure never blocks product publish

## Phase 2 Merchandising Logic (2026-04-04)
- `src/lib/merchandising.ts` — pure stateless helper library for homepage section membership
- Central eligibility: `isHomepageEligible()` — soldout exclusion, sellable check (legacy-safe null fallback), homepageHidden
- Section checks: `isNewProduct()`, `isPopularProduct()`, `isBestSellerProduct()`, `isDealProduct()`, `isDiscountedProduct()`
- Scoring: `calculateBestSellerScore()` — weighted formula using totalUnitsSold + recent7d×weight7d + recent30d×weight30d
- New window: `calculateNewWindow()` — returns publishedAt + newUntil (default 7 days)
- Membership resolution: `getYeniProducts()`, `getPopularProducts()`, `getBestSellerProducts()`, `getDealProducts()`, `getDiscountedProducts()`, `resolveHomepageSections()`
- All functions respect HomepageMerchandisingSettings section toggles, item limits, and scoring thresholds
- Legacy products (null workflow/merchandising) treated as eligible if status === 'active'

## Phase 1 Schema Foundation (2026-04-03)
- Products collection extended with `workflow` group (workflowStatus, visualStatus, confirmationStatus, contentStatus, auditStatus, publishStatus, stockState, sellable, productConfirmedAt, lastHandledByBot) and `merchandising` group (publishedAt, newUntil, manualPopular, manualDeal, bestSellerPinned, bestSellerExcluded, homepageHidden, totalUnitsSold, recentUnitsSold7d, recentUnitsSold30d, bestSellerScore, lastMerchandisingSyncAt)
- New global: `HomepageMerchandisingSettings` (slug: `homepage-merchandising-settings`) — section toggles, item limits, timing, bestseller scoring config, behavior settings
- New collection: `BotEvents` (slug: `bot-events`) — structured event tracking for bot-to-bot workflow transitions (eventType, product, sourceBot, targetBot, status, payload, notes, processedAt)
- Collections registered: 13 total (added BotEvents)
- Globals registered: 3 total (added HomepageMerchandisingSettings)

## Known Locked Constraints
- Next.js **16.2.0-canary.81** — do not downgrade (Payload 3.x incompatible with 15.5–16.1.x)
- importMap must be manually maintained (no generate:importmap in Linux VM)
- `push: true` in DB adapter — safe for dev, switch to migrations before Phase 2 hardening
- `push: true` does NOT run in production (NODE_ENV=production guard in connect.js)
- `<img>` tags only — next/image blocked by remotePatterns for dynamic Blob/Unsplash URLs
- SSL via pool options only — not in DATABASE_URI string (pg-connection-string deprecation)
