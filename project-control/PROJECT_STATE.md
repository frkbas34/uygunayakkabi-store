# PROJECT STATE — Uygunayakkabi

_Last updated: 2026-03-15_

## Current Status
Phase 1 **COMPLETE** (validated 2026-03-13).
Phase 2 **ACTIVE** — VPS infrastructure is live and operational (2026-03-14).

Core proof-of-concept achieved:
- VPS provisioned (Netcup, Ubuntu 22.04.5 LTS)
- Docker + Caddy + n8n + OpenClaw all running
- Telegram bot connected and responding in DM (bot: `mentix_aibot`)
- OpenClaw dashboard accessible at `agent.uygunayakkabi.com`
- n8n accessible at `flow.uygunayakkabi.com`
- OpenAI model active: `openai/gpt-5-mini`

**🔴 SECURITY: API keys and tokens were exposed in session — rotation required before any production use.**

## Current Phase
Phase 2 — Automation Backbone (**ACTIVE — Infrastructure Live, Integration Pending**)

---

## Current Working State

### Admin Panel (Payload CMS)
- Admin panel loads correctly at `uygunayakkabi.com/admin` — **CONFIRMED WORKING**
- **Default Payload light theme** (dark mode CSS was removed — see D-029)
- **Turkish language** configured as default (`@payloadcms/translations/languages/tr`)
- importMap includes: all standard Payload components + VercelBlobClientUploadHandler
- **Custom Dashboard** (`afterDashboard`) is currently **DISABLED** in payload.config.ts
- Admin grouped: Mağaza / Katalog / Medya / Müşteri / Stok / Pazarlama (Banners) / Ayarlar (Site Settings)
- 11 collections registered: Users, Products, Variants, Brands, Categories, Media, CustomerInquiries, InventoryLogs, Orders, Banners, BlogPosts
- 2 globals registered: SiteSettings, AutomationSettings

### Collections — Current Field State

**Products** (expanded 2026-03-15):
- Fields: title (required, Turkish validation), description, brand (text), category (select: Günlük/Spor/Klasik/Bot/Sandalet/Krampon/Cüzdan), gender, price (required, Turkish validation), originalPrice, status (active/soldout/draft), featured, slug (auto-generated, readOnly), sku (auto-generated if empty), images, variants, color, material, telegram/automation fields
- **New fields (2026-03-15):** productFamily (select: shoes/wallets/bags/belts/accessories), productType (text), channelTargets (select multi: website/instagram/shopier/dolap), automationFlags group (autoActivate, generateBlog, generateExtraViews, enableTryOn), sourceMeta group (telegramChatId, telegramSenderId, workflowId, externalSyncId)
- `beforeValidate` hook: always auto-generates slug from title; auto-generates SKU if empty
- `beforeDelete` hook: nullifies all variant.product and media.product references before deletion (prevents FK constraint errors)
- Status labels: Turkish with emoji indicators
- **Backward compatibility:** existing `category` field preserved alongside new `productFamily`/`productType`

**BlogPosts** (added 2026-03-15):
- Fields: title, slug, excerpt, content (richText), featuredImage (relationship to media), relatedProduct (relationship to products), focusKeywords (array of text), metaTitle, metaDescription, status (draft/published), source (ai/admin), publishedAt
- Purpose: AI-generated and admin-curated SEO blog posts linked to products

**AutomationSettings** (global, added 2026-03-15):
- Product intake: autoActivateProducts, requireAdminReview
- Channel publishing: publishWebsite, publishInstagram, publishShopier, publishDolap
- Content generation: autoGenerateBlog, autoPublishBlog, autoGenerateExtraViews
- Telegram: telegramGroupEnabled

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

### Git State
- main is authoritative. Always pull before pushing (D-042).
- GitHub repo: https://github.com/frkbas34/uygunayakkabi-store

### VPS Infrastructure (Netcup — provisioned 2026-03-14)
- **OS**: Ubuntu 22.04.5 LTS (disk expanded to ~125G)
- **Docker**: installed, Docker Compose plugin active
- **Caddy**: reverse proxy via Docker, handles TLS
- **n8n**: Docker container, accessible at `flow.uygunayakkabi.com`
- **OpenClaw**: Docker containers (`openclaw-openclaw-gateway-1` healthy), accessible at `agent.uygunayakkabi.com`
- **Telegram bot**: `mentix_aibot` — DM pairing complete, responding in Turkish
- **OpenAI model**: `openai/gpt-5-mini`
- **User account**: `furkan` (sudo + docker groups)
- **Directories**: `/opt/openclaw`, `/opt/n8n`, `/opt/caddy`
- **OpenClaw config**: `/home/furkan/.openclaw/openclaw.json`
- **Firewall (ufw)**: OpenSSH, 80, 443

### VPS Domain Routing
- `flow.uygunayakkabi.com` → Caddy → n8n:5678
- `agent.uygunayakkabi.com` → Caddy → openclaw-gateway:18789
- DNS via Cloudflare (A records → VPS IP)

### VPS Known Issues
- **🔴 Security rotation required**: Telegram bot token, OpenAI API key, OpenClaw gateway token — all exposed in setup session
- **Docker network persistence**: OpenClaw gateway was manually connected to `web` network for Caddy routing. This must be made persistent in docker-compose (currently reverts on restart/redeploy)
- **Telegram group policy**: `groupPolicy: "allowlist"` but `allowFrom` is empty — group messages silently dropped. DM-only for now.
- **OpenClaw skills**: clawhub/github/gog/xurl install attempts failed (Homebrew not installed, DNS issues). Deferred — not blocking core operation.

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
Phase 2 infrastructure is live. Product model and automation scaffolding expanded (2026-03-15). Immediate priorities:
1. **OpenClaw → n8n webhook contract** — define JSON payload format, wire up webhook
2. **n8n → Payload product creation workflow** — media upload + product create with toggle-controlled status
3. **End-to-end test** — Telegram photo → bot → n8n → Payload draft/active → storefront
4. **Multi-channel distribution adapters** — Website (done), Instagram, Shopier, Dolap
5. **AI SEO blog workflow** — active product triggers blog generation
See TASK_QUEUE.md for ordered execution plan.
