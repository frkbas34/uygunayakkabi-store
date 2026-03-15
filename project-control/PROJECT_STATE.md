# PROJECT STATE — Uygunayakkabi

_Last updated: 2026-03-15_

## Current Status
Phase 1 **COMPLETE** (validated 2026-03-13). Media access issue from 2026-03-11 was resolved (D-052).
Phase 2 **ACTIVE** — Steps 1–5 complete. Full automation backbone operational.
**Product model expanded** (2026-03-15) — multi-family, channel toggles, source tracking, automation metadata (D-054–D-057).
**BlogPosts collection scaffolded** (2026-03-15) — ready for Phase 3 content engine (D-058).
**Telegram group access enabled** (2026-03-15) — limited allowlist (2 users), mention-only behavior enforced natively (D-061).
**Mentix Intake Webhook live** (2026-03-15) — OpenClaw → n8n transport validated end-to-end (D-062).
**n8n → Payload product creation LIVE** (2026-03-15) — full pipeline validated: webhook → parse → schema map → `/api/automation/products` → Payload draft ✅ (D-063).
**Media pipeline LIVE** (2026-03-15) — Telegram photo → Telegram Bot API download → Vercel Blob → Payload Media → product.images[] ✅ (D-064).

Core proof-of-concept achieved:
- VPS provisioned (Netcup, Ubuntu 22.04.5 LTS)
- Docker + Caddy + n8n + OpenClaw all running
- Telegram bot connected and responding in DM (bot: `mentix_aibot`)
- OpenClaw dashboard accessible at `agent.uygunayakkabi.com`
- n8n accessible at `flow.uygunayakkabi.com`
- OpenAI model active: `openai/gpt-5-mini`
- **n8n intake webhook live**: `POST /webhook/mentix-intake` (active, validated ✅)
- **OpenClaw `mentix-intake` skill installed**: routes product messages to n8n via internal Docker network

## Current Phase
Phase 2 — Automation Backbone (**ACTIVE — Transport layer validated, product creation next**)

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
- 1 global registered: SiteSettings

### Collections — Current Field State

**Products** (rewritten 2026-03-11, expanded 2026-03-15):
- Core fields: title (required, Turkish validation), description, brand (text), category (select: Günlük/Spor/Klasik/Bot/Sandalet/Krampon/Cüzdan), gender, price (required, Turkish validation), originalPrice, status (active/soldout/draft), featured, slug (auto-generated, readOnly), sku (auto-generated if empty), images, variants, color, material
- **New (2026-03-15)**: productFamily (select: shoes/wallets/bags/accessories), productType (text), source (select: admin/telegram/n8n/api/import)
- **New (2026-03-15)**: channels group (publishWebsite, publishInstagram, publishShopier, publishDolap)
- **New (2026-03-15)**: automationMeta group (telegramChatId, telegramMessageId, lastSyncedAt, updatedBy, lockFields)
- Legacy fields kept: createdByAutomation, telegramMessageId (top-level), postToInstagram
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

**Media**: staticDir = public/media, staticURL = '/media', image sizes (thumbnail/card/large). Production: **Vercel Blob Storage**. **`access: { read: () => true }`** added 2026-03-11 to allow public image access (was missing — caused all images to return 403 for unauthenticated visitors).

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
- Git identity configured on personal laptop: `Furkan Baş <frk.bas34@gmail.com>`

### Multi-PC Development
- **Work PC**: Original development machine. Has local `public/media/` files from earlier uploads.
- **Personal laptop**: Matebook. Git configured. Code synced via GitHub. No local media files.
- **Sync method**: GitHub (code) + Neon PostgreSQL (data) + Vercel Blob (production media)
- **Critical note**: Always upload media via production admin — see D-053.

### VPS Infrastructure (Netcup — provisioned 2026-03-14)
- **OS**: Ubuntu 22.04.5 LTS (disk expanded to ~125G)
- **Docker**: installed, Docker Compose plugin active
- **Caddy**: reverse proxy via Docker, handles TLS
- **n8n**: Docker container, accessible at `flow.uygunayakkabi.com`
- **OpenClaw**: Docker containers (`openclaw-openclaw-gateway-1` healthy), accessible at `agent.uygunayakkabi.com`
- **Telegram bot**: `mentix_aibot` — DM pairing complete + group access enabled (mention-only, allowlist 2 users)
- **OpenAI model**: `openai/gpt-5-mini`
- **User account**: `furkan` (sudo + docker groups)
- **Directories**: `/opt/openclaw`, `/opt/n8n`, `/opt/caddy`
- **OpenClaw config**: `/home/furkan/.openclaw/openclaw.json`
- **Firewall (ufw)**: OpenSSH, 80, 443

### VPS Domain Routing
- `flow.uygunayakkabi.com` → Caddy → n8n:5678
- `agent.uygunayakkabi.com` → Caddy → openclaw-gateway:18789
- DNS via Cloudflare (A records → VPS IP)

### n8n Intake Webhook (live 2026-03-15) — STEPS 5 + 6 COMPLETE ✅
- **Workflow name**: `Mentix Intake Webhook`
- **Workflow ID**: `WOv8kRkN00Jo8g2D`
- **Endpoint**: `POST /webhook/mentix-intake`
- **Public URL**: `https://flow.uygunayakkabi.com/webhook/mentix-intake`
- **Internal URL**: `http://n8n:5678/webhook/mentix-intake` (used by OpenClaw — Docker network)
- **Nodes (9)**: Webhook → Parse Intake Fields → Map to Schema → Create Product → Has Media? → (YES) Attach Telegram Media → Success? → Respond OK/Error; (NO) → Success? directly
- **Response on success**: `{"status":"created","product_id":N,"title":"...","slug":"...","workflow":"mentix-intake","timestamp":"..."}`
- **Status**: Active, fully validated ✅ — creates draft products in Payload CMS
- **Payload schema**: `schema_version 1.0` — see D-062 for field definitions
- **Auth to Payload**: `X-Automation-Secret` header → `/api/automation/products` (custom Next.js route, no JWT needed)
- **AUTOMATION_SECRET**: set in Vercel env vars (2026-03-15) — see D-063
- **n8n API Key** (label: `Mentix Intake Workflow`): stored in n8n DB — use header `X-N8N-API-KEY` for workflow management
- **API Base**: `https://flow.uygunayakkabi.com/api/v1/`

### /api/automation/products (live 2026-03-15)
- **Route**: `src/app/api/automation/products/route.ts`
- **Auth**: `X-Automation-Secret: <AUTOMATION_SECRET>` header
- **Uses**: Payload local API (`getPayload()`) — no JWT, no schema changes
- **Creates**: draft product in `products` collection
- **Returns**: `{"status":"created","product_id":N,"title":"...","slug":"...","workflow":"n8n-automation","timestamp":"..."}`
- **DB migration note**: `push: true` did not auto-apply new columns in production; manually ran ALTER TABLE 2026-03-15 to add `product_family`, `product_type`, `channels_*`, `source`, `automation_meta_*` columns and their enum types

### OpenClaw mentix-intake Skill (updated 2026-03-15)
- **Path on host**: `/home/furkan/.openclaw/skills/mentix-intake/SKILL.md`
- **Path in container**: `/home/node/.openclaw/skills/mentix-intake/SKILL.md`
- **Trigger**: Telegram message with product data (name, price, stock code, quantity) or photo with caption
- **Behavior**: Parse text + extract media_file_id from largest photo → build JSON → exec curl → confirm in Turkish
- **Payload schema**: includes `message.media_file_id`, `message.has_media`, `message.media_type`
- **Media pipeline**: ACTIVE — photo file_id is now fully processed (not just logged)
- **Transport**: exec tool → curl POST (internal Docker network) with `--max-time 15`

### /api/automation/attach-media (live 2026-03-15)
- **Route**: `src/app/api/automation/attach-media/route.ts`
- **Auth**: `X-Automation-Secret` header
- **Requires**: `TELEGRAM_BOT_TOKEN` Vercel env var
- **Flow**: `file_id` → Telegram `getFile` → binary download → `payload.create({ collection: 'media', file: {...} })` → `payload.update({ products.images.append })
- **MIME handling**: Normalizes Telegram CDN content-type; falls back to extension-based detection
- **Result**: Media uploaded to Vercel Blob, Media document created, product.images[] appended non-destructively

### Telegram Group Access Policy (configured 2026-03-15)
- **groupPolicy**: `allowlist` — preserved
- **groupAllowFrom**: `[5450039553, 8049990232]` — only these two user IDs can trigger the bot in groups
- **groups `"*"`**: `requireMention: true` — bot only responds when explicitly @mentioned in group
- **DM behavior**: unchanged (`dmPolicy: "pairing"`)
- **3rd user ID**: pending — add to `groupAllowFrom` array when ready
- **Config**: `/home/furkan/.openclaw/openclaw.json` | backup at `openclaw.json.bak`

### VPS Known Issues
- **OpenClaw skills**: clawhub/github/gog/xurl install attempts failed (Homebrew not installed, DNS issues). Deferred — not blocking core operation.

---

## Phase 1 Deferred Cleanup (non-blocking, Phase 2 parallel)
- **SiteSettings**: not fully populated yet — storefront falls back to DEFAULT_SETTINGS for some fields
- **Banners**: collection exists, no banners created yet
- **Admin dark mode**: `admin-dark.css` exists but inactive — re-implement if desired, without `!important`
- **favicon.ico**: missing, 404 on every page load
- **No `/products/[slug]` route**: slug auto-generated but no dedicated URL route yet
- **`push: true`**: switch to migrations before Phase 2 data model stabilizes in production

### Resolved Issues (historical)
- **Product images broken on live site (2026-03-11)**: Media collection missing `access: { read: () => true }` caused 403 for unauthenticated visitors. Fixed in D-052. Some images also needed re-upload via production admin (were uploaded locally). Fully resolved by 2026-03-13.

### 🟡 NON-CRITICAL — Post-Validation Cleanup
- **Custom Dashboard disabled**: `afterDashboard` commented out in payload.config.ts. Component still exists at `src/components/admin/Dashboard.tsx` but is inactive.
- **Admin dark mode removed**: `src/styles/admin-dark.css` exists but not imported. Re-implement without `!important` overrides if desired.
- **importMap is manually maintained**: `npx payload generate:importmap` does not work in Linux VM. importMap.ts must be updated manually when new plugins/components are added.
- **Banners/SiteSettings not yet populated**: tables exist but admin hasn't filled data. Storefront falls back to DEFAULT_SETTINGS.
- **favicon.ico**: missing (404 on every page load). Add any 32×32 icon to `src/app/`.
- **No `/products/[slug]` URL routing**: slug is stored and auto-generated but not used as a URL route.
- **`push: true`**: should be switched to migrations before Phase 2 goes live (low risk for now).
- **Local .env not set up on personal laptop**: Need to create `.env` with DATABASE_URI, PAYLOAD_SECRET, etc. for local development.

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
Phase 2 core automation backbone is complete (Steps 1–5). Next:
1. ~~🔴 Security rotation~~ — **DONE**
2. ~~Persistent Docker networking~~ — **DONE**
3. ~~Telegram group access policy~~ — **DONE** (D-061, 2026-03-15)
4. ~~OpenClaw → n8n transport design~~ — **DONE** (D-062, 2026-03-15)
5. ~~n8n → Payload product creation~~ — **DONE** (D-063, 2026-03-15) ✅
6. **End-to-end live Telegram test** — send real product message in Telegram group → verify draft appears in admin panel
7. **Media handling** — attach photos from Telegram messages to draft products (upload to Vercel Blob)
8. **Channel publish workflows** — n8n reads channels.publish* toggles → publishes to enabled channels
9. **Create Telegram group "Mentix Grup Bot"** — add @mentix_aibot, test full chain with real messages
See TASK_QUEUE.md for ordered execution plan.
