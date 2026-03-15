# DECISIONS — Uygunayakkabi

## D-001 — Core Storefront Stack
**Decision:**  
Use **Next.js** as the main storefront framework.

**Reason:**  
Need a flexible custom storefront that can grow into a more advanced system later.

**Status:**  
ACTIVE

---

## D-002 — Admin / Backend Layer
**Decision:**  
Use **Payload CMS** as the admin and backend management layer.

**Reason:**  
Need a strong operational panel for:
- product management
- stock management
- pricing updates
- image/media handling
- future automation compatibility

**Status:**  
ACTIVE

---

## D-003 — Shared Multi-PC Data Direction
**Decision:**  
Use a **shared cloud database approach** for multi-PC workflow.

**Reason:**  
Project is being developed from multiple machines and needs a central source of data.

**Status:**  
ACTIVE

---

## D-004 — GitHub as Sync Backbone
**Decision:**  
Use **GitHub** as the main synchronization layer between development machines.

**Reason:**  
The project is developed across different PCs and requires a reliable shared code history.

**Status:**  
ACTIVE

---

## D-005 — Admin Panel Role
**Decision:**  
The admin panel is not a temporary side tool; it is a core operational control center.

**Reason:**  
The business needs a place to manage:
- products
- stock
- pricing
- discounts
- images
- future automation-related actions

**Status:**  
ACTIVE

---

## D-006 — Long-Term Automation Direction
**Decision:**  
The project should be built in a way that supports future automation layers.

**Reason:**  
Long-term direction includes:
- Telegram-based product intake
- AI-supported image workflows
- product creation automation
- publishing support for other channels

**Status:**  
ACTIVE

---

## D-007 — Source of Truth Rule
**Decision:**  
Old chat conversations are **not** the main authority by default.

**Reason:**  
Chats may become outdated, fragmented, or partially solved.
The main authority should gradually move into structured files such as:
- PROJECT_STATE.md
- ARCHITECTURE.md
- DECISIONS.md

**Status:**  
ACTIVE

---

## D-008 — Resolved Issues Rule
**Decision:**  
Previously solved technical problems should not be reintroduced as current truth unless they appear again.

**Reason:**  
Project discussions can repeat old issues even after they are fixed.
Current truth must always be checked against the latest project state.

**Status:**  
ACTIVE

---

## D-009 — Phase-Based Build Strategy
**Decision:**  
The project will progress in structured phases rather than trying to build all systems at once.

**Phases:**  
- Phase 1: Core Admin System
- Phase 2: Automation Backbone
- Phase 3: Autonomous Content & Growth Layer

**Reason:**  
The automation and AI layers depend on a stable operational backend first.

**Status:**  
ACTIVE

---

## D-010 — Telegram-First Commerce Operation
**Decision:**  
The long-term operational model of the business will be Telegram-first.

**Reason:**  
The goal is to manage product intake and publishing from the phone in a fast and practical way.

**Desired Flow:**  
Phone photo → Telegram bot → AI processing → product creation → website + Instagram + Shopier

**Status:**  
ACTIVE

---

## D-011 — AI Product Image Workflow
**Decision:**  
Product image workflow should support enhancement and generation of additional product visuals while preserving product integrity.

**Requirements:**  
- original product should remain accurate
- background should not be incorrectly altered unless intentionally defined
- AI should generate additional usable product views
- final product should ideally have 3 images total

**Status:**  
ACTIVE

---

## D-012 — Automated Multi-Channel Publishing
**Decision:**  
The system should be designed for automatic publishing across multiple channels.

**Target Channels:**  
- Website
- Instagram
- Shopier

**Reason:**  
The product publishing process should become centralized and low-friction.

**Status:**  
ACTIVE

---

## D-013 — Autonomous Blog / CEO Content Layer
**Decision:**  
The system should later include an AI-supported blog/content layer.

**Purpose:**  
- generate product-related definitions
- produce blog content from product data
- publish blog entries on site
- support organic traffic generation

**Status:**  
PLANNED-ACTIVE

---

## D-014 — Payload CMS Remains the Admin Direction
**Decision:**
Payload CMS remains the active admin/backend direction of the project.

**Reason:**
More recent implementation work, debugging, admin routing, collections, and media/admin structure are all built around Payload CMS.

**Status:**
ACTIVE

---

## D-015 — Initial Setup Problems Are Technical History, Not Current Truth
**Decision:**
Older setup-level issues should be preserved as technical history only, not as the current state authority.

**Examples:**
- early create-first-user failures
- early package/install conflicts
- early route/layout collisions
- initial empty importMap condition

**Status:**
ACTIVE

---

## D-016 — Phase 1 Requires Runtime Validation, Not Just Written Code
**Decision:**
Phase 1 is not complete when code exists on disk; both storefront and admin runtime must be tested and validated.

**Reason:**
Recent work shows that code changes may exist while runtime is still broken.

**Status:**
ACTIVE

---

## D-017 — Automation Starts Only After Admin + Storefront Stabilization
**Decision:**
n8n / Telegram / AI workflow work should begin only after both the storefront and the Payload admin side are stable enough to pass practical validation.

**Reason:**
Recent issues affected both storefront runtime and Payload admin rendering.

**Status:**
ACTIVE

---

## D-018 — Admin Is an Override / Control Layer
**Decision:**
The admin panel must act as an override/control layer over the same product data model that future automation will use.

**Reason:**
The project is being designed for future Telegram-first ingestion and automation compatibility.

**Status:**
ACTIVE

---

## D-019 — Product Model Must Stay Automation-Compatible
**Decision:**
The product system should remain compatible with future automation fields and sync logic.

**Suggested Concepts:**
- source
- updatedBy
- lastSyncedAt
- optional future lockFields

**Status:**
ACTIVE

---

## D-020 — Cloud-Friendly Media Direction
**Decision:**
Image handling should stay compatible with cloud/object-storage-friendly workflows rather than being tightly coupled to a final local filesystem strategy.

**Reason:**
The long-term system includes Telegram ingestion, automation, and likely cloud deployment.

**Status:**
ACTIVE

---

## D-021 — Telegram-First Commerce Vision Remains Core
**Decision:**
The long-term operating model of the business remains Telegram-first product intake and automation.

**Reason:**
The product publishing vision is based on phone-first operational speed and AI-assisted ingestion.

**Status:**
ACTIVE

---

---

## D-022 — Field Types Must Match DB Column Types Exactly
**Decision:** Payload field type changes that alter the underlying PostgreSQL column type are NOT safe via push when data exists.
**Constraint:**
- `type: ‘text’` → varchar (safe to keep)
- `type: ‘select’` → enum (changing existing text column to enum FAILS if existing data is invalid for enum)
- brand, category (products), size (variants): must remain `type: ‘text’` — DB columns are varchar
**Status:** ACTIVE — LOCKED CONSTRAINT

---

## D-023 — Existing Enum Values Cannot Be Changed Without Migration
**Decision:** Do not add or remove values from existing select fields in-place via push.
**Current safe enum values:**
- enum_products_status: active, soldout, **draft** (added 2026-03-09)
- enum_customer_inquiries_status: new, contacted, completed
- enum_inventory_logs_source: telegram, admin, system
- enum_media_type: original, enhanced
- enum_orders_payment_method: card_on_delivery, cash_on_delivery, bank_transfer, online (NEW)
- enum_orders_shipping_company: yurtici, aras, mng, ptt, surat, trendyol, other (NEW)
- enum_banners_type: discount, announcement, new_season, free_shipping, flash_sale (NEW)
- enum_banners_placement: top_bar, hero, catalog_top, popup (NEW)
**Status:** ACTIVE — LOCKED CONSTRAINT

---

## D-024 — .next Cache Must Be Cleared When Schema Push Behaves Unexpectedly
**Decision:** If Drizzle push tries to apply schema changes that contradict current collection definitions, the .next build cache is likely stale.
**Resolution:** Delete .next folder → restart server → push re-derives schema from fresh compiled code.
**Status:** ACTIVE — Known operational procedure

---

## D-025 — Use `<img>` Tags Instead of next/image for Product Images
**Decision:** The storefront uses plain `<img>` tags rather than Next.js `Image` component for product images.
**Reason:** `next/image` enforces `remotePatterns` validation that blocks dynamically-sourced images (admin uploads, Unsplash URLs from DB). Plain `<img>` tags avoid this while still working correctly.
**Scope:** ProductImages.tsx, UygunApp.jsx (Card, Detail, Hero components)
**Status:** ACTIVE

---

## D-026 — SiteSettings Global as Single Source of Frontend Config
**Decision:** All site-wide configuration values displayed on the storefront (contact info, shipping thresholds, trust badges, announcement bar) are sourced from the SiteSettings Payload global.
**Fallback:** `DEFAULT_SETTINGS` object in UygunApp.jsx provides hardcoded defaults when the global hasn't been populated yet.
**Data flow:** page.tsx (Server Component) → fetches global → passes as prop → UygunApp.jsx uses values
**Status:** ACTIVE

---

## D-027 — Banners Collection for Dynamic Promotional Content
**Decision:** Campaign banners and promotions are managed through a Banners collection (not hardcoded in frontend code).
**Mechanism:** page.tsx fetches active banners → passes to UygunApp → promo banner section renders first matching banner (hero placement or discount type).
**Status:** ACTIVE

---

## D-028 — Turkish Language as Default Admin Language
**Decision:** The Payload CMS admin panel uses Turkish as the default and fallback language.
**Implementation:** `i18n: { supportedLanguages: { tr }, fallbackLanguage: "tr" }` in payload.config.ts
**Status:** ACTIVE

---

## D-029 — Admin Dark Mode via CSS Override
**Decision:** ~~The admin panel uses a custom dark mode theme applied via CSS overrides in `src/styles/admin-dark.css`.~~
**Status:** SUPERSEDED — Dark mode CSS was causing admin panel to render black/white (broke Payload UI with `!important` overrides). The import was removed. Admin now shows default Payload light theme.
**File still exists** at `src/styles/admin-dark.css` but is not imported.
**Future direction:** Re-implement dark mode without `!important` overrides if desired.

---

## D-030 — Inline Style Token System for Storefront
**Decision:** The storefront (UygunApp.jsx) uses an inline-style token system (`T = { f, d, bk, wh, ac, gn, r }`) rather than Tailwind CSS classes.
**Reason:** The entire storefront is a single-file SPA; inline styles with a token object provide consistent theming without build-time CSS dependencies.
**Status:** ACTIVE

---

## D-031 — Static Products as Fallback Layer
**Decision:** ~~39 static products are hardcoded in UygunApp.jsx and displayed alongside DB products.~~
**Status:** SUPERSEDED — `ENABLE_STATIC_FALLBACK = false` is now set in UygunApp.jsx. DB is the sole source of products. Static products array remains in code but is not rendered. Remove the static array when DB product count is sufficient to avoid dead code.

---

## D-032 — Next.js Version: 16.2.0-canary.81
**Decision:** Project uses Next.js `16.2.0-canary.81`.
**Reason:** Payload CMS 3.79.0 peer dependency explicitly excludes Next.js 15.5–16.1.x. Supported ranges are 15.4.x or >=16.2.0-canary.10. Next.js 15.4.x had webpack incompatibilities with @payloadcms/next@3.79.0 (module resolution failures, formatAdminURL export mismatch). The 16.2.0-canary series uses Turbopack and is the correct path.
**Constraint:** Next.js 16.1.x will NEVER be supported by Payload 3.x. Do not attempt to use it.
**Status:** ACTIVE — LOCKED

---

## D-033 — Vercel Blob Storage for Production Media
**Decision:** Production media uploads use Vercel Blob Storage (`@payloadcms/storage-vercel-blob`).
**Reason:** Vercel filesystem is read-only at runtime. Local `public/media/` only works for local dev.
**Implementation:** Plugin enabled conditionally — active only when `BLOB_READ_WRITE_TOKEN` env var is present.
**Status:** ACTIVE

---

## D-034 — importMap Must Be Updated Manually When Plugins Are Added
**Decision:** When a new Payload plugin that registers client components is added, `importMap.ts` must be updated manually.
**Reason:** `npx payload generate:importmap` does not work in Linux VM (Windows node_modules esbuild mismatch). Missing importMap entries cause the admin panel to silently fail to render (white screen, no JS errors in browser console).
**Lesson:** `@payloadcms/storage-vercel-blob` registers `VercelBlobClientUploadHandler` — this was the root cause of the white screen after adding Blob Storage.
**Procedure:** Check plugin docs for client component exports → add import + map entry to `src/app/(payload)/importMap.ts`.
**Status:** ACTIVE — OPERATIONAL PROCEDURE

---

## D-035 — SSL Config Belongs in Pool Options, Not DATABASE_URI String
**Decision:** Do not include `sslmode=require` in the DATABASE_URI connection string. Instead configure SSL in the pool options object in `payload.config.ts`.
**Reason:** `pg-connection-string` library has deprecated the `sslmode` parameter in the connection string. When present, it triggers a full-screen red error overlay in Next.js dev mode that blocks the storefront from rendering.
**Implementation:**
```typescript
db: postgresAdapter({
  pool: {
    connectionString: process.env.DATABASE_URI!,
    ssl: process.env.DATABASE_URI?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  },
  push: true,
}),
```
**DATABASE_URI format:** `postgresql://user:pass@host/db?channel_binding=require` (no sslmode param)
**Status:** ACTIVE

---

## D-036 — Reverse Media Lookup as Image Fallback
**Decision:** When a product's `images[]` array is empty, `page.tsx` performs a reverse lookup on the Media collection to find any media documents where `media.product` references that product.
**Reason:** Admin users were uploading images via the Media collection and setting "İlgili Ürün" (related product) on the media document — a reverse reference. The storefront only read `product.images[]`, so those uploads were invisible.
**Implementation:** Batch query after fetching products. Build a `reverseMediaMap: Map<id, media[]>`. Merge with `allUrls = mediaUrls.length > 0 ? mediaUrls : reverseUrls`.
**Priority:** `product.images[]` always takes precedence. Reverse lookup is fallback only.
**Status:** ACTIVE

---

## D-037 — objectFit: contain for All Product Images
**Decision:** All product images (catalog cards, detail page, thumbnails) use `objectFit: "contain"` rather than `"cover"`.
**Reason:** Shoes have specific shapes and key details that must be fully visible. `cover` crops edges of the shoe, hiding the toe or heel. `contain` scales the image to fit the container without cropping.
**Status:** ACTIVE

---

## D-038 — Products.category Changed to Select Field
**Decision:** `Products.category` was changed from `type: 'text'` to `type: 'select'` with predefined options: Günlük, Spor, Klasik, Bot, Sandalet, Krampon, Cüzdan.
**Reason:** Free-text category input caused filter mismatches when admin entered slightly different values (e.g., "spor" vs "Spor").
**Note:** This contradicts D-022 which states category must remain `type: 'text'` due to varchar column. If the DB column already has values that match the new select options, `push: true` will attempt an enum migration. Monitor for migration errors after restart. CATEGORY_LABELS in page.tsx handles backward compatibility with any old lowercase values.
**Status:** ACTIVE — monitor DB migration on next server start

---

## D-039 — beforeDelete Hook Pattern for FK Cleanup
**Decision:** Products collection uses a `beforeDelete` hook to nullify all related records before deletion to avoid PostgreSQL FK constraint violations.
**Reason:** Variants.product and Media.product reference Products. If not nullified first, deleting a product throws a FK constraint error shown to admin as "Bilinmeyen bir hata oluştu".
**Implementation:**
```typescript
beforeDelete: [async ({ req, id }) => {
  // nullify variant references
  const variants = await req.payload.find({ collection: 'variants', where: { product: { equals: id } }, limit: 200 })
  for (const v of variants.docs) {
    await req.payload.update({ collection: 'variants', id: v.id, data: { product: null as any } })
  }
  // clear media references
  const media = await req.payload.find({ collection: 'media', where: { product: { equals: id } }, limit: 200 })
  for (const m of media.docs) {
    await req.payload.update({ collection: 'media', id: m.id, data: { product: null as any } })
  }
}]
```
**Also required:** Variants.product must be `required: false` (was `required: true`) so the null update doesn't fail its own validation.
**Status:** ACTIVE

---

## D-040 — Auto-Generated Slug and SKU via beforeValidate Hook
**Decision:** Products.slug is always auto-generated from the title via `beforeValidate` hook and is read-only in admin. Products.sku is auto-generated only if the field is empty.
**Reason:** Admin users were leaving slug and SKU blank or entering inconsistent values, causing storefront filter mismatches and display issues.
**Slug format:** Turkish-safe `toSlug()` helper: lowercase, replace Turkish chars (ş→s, ğ→g, etc.), replace spaces with hyphens, strip non-alphanumeric.
**SKU format:** `AYK-{TIMESTAMP_BASE36}` if empty.
**Status:** ACTIVE

---

## D-041 — Catalog Card Hover Preview
**Decision:** Catalog product cards show a crossfade preview of the second product image on mouse hover.
**Reason:** Improves product discovery — users can see the shoe from a different angle without clicking into the detail page.
**Implementation:** Two `<img>` tags stacked absolutely. Primary fades to opacity 0 on hover (when a second image exists). Secondary fades to opacity 1. CSS `transition: opacity 0.3s`.
**Status:** ACTIVE

---

## D-042 — Git Branch Strategy: main is the Only Deployable Branch
**Decision:** All production-ready work must be on `main`. Feature branches must be merged to main before considering any work "done" or "deployed."
**Reason:** User lost ~12 hours of work on 2026-03-13 due to working across multiple diverged branches (`main`, `copilot/setup-product-publishing-system`, `feat/product-card`, `v0/frkbas34-7159-de82aac4`). Changes made on non-main branches did not reach Vercel production.
**Rules:**
- Always run `git pull origin main` before starting work on any machine
- Use `git status && git branch` to confirm active branch before every push
- Merge or cherry-pick feature branch work to main before switching machines
- Do NOT switch computers without first running: `git add . && git commit -m "..." && git push origin main`
- Preferred push flow: `git pull origin main --rebase` → fix conflicts → `git push origin main`
**Status:** ACTIVE — OPERATIONAL RULE

---

## D-043 — Admin → Storefront Pipeline End-to-End Validation Required
**Decision:** The admin → storefront data flow must be explicitly validated as a working end-to-end pipeline before Phase 1 can be marked complete.
**Reason:** On 2026-03-13, products were confirmed not appearing on storefront despite CMS-first pipeline being in code. Root cause was investigated and resolved.
**Status:** RESOLVED (2026-03-13) — pipeline confirmed working. Final user smoke test (create product in admin → appears on storefront) remains as Phase 1 sign-off gate.
**Retained rule:** "Code exists" ≠ "pipeline works." Always validate end-to-end after major changes.

---

## D-044 — VPS Provider: Netcup
**Decision:** Use Netcup VPS as the automation infrastructure host.
**Specs:** Ubuntu 22.04.5 LTS, 128G disk (expanded root ~125G), adequate for Docker workloads.
**Reason:** Cost-effective European VPS. Alternatives evaluated: Hetzner, DigitalOcean, Hostinger. Netcup selected and provisioned.
**Status:** ACTIVE

---

## D-045 — Docker-Based Deployment for All VPS Services
**Decision:** All VPS services (Caddy, n8n, OpenClaw) run as Docker containers managed by Docker Compose.
**Reason:** Consistent deployment, isolation, reproducibility. Avoids polluting host OS with service-specific dependencies.
**Status:** ACTIVE

---

## D-046 — Caddy as Reverse Proxy with Auto-TLS
**Decision:** Caddy handles reverse proxying and automatic TLS certificate management for all VPS-hosted services.
**Routing:** `flow.uygunayakkabi.com` → n8n:5678, `agent.uygunayakkabi.com` → openclaw-gateway:18789
**Reason:** Caddy auto-provisions Let's Encrypt certificates, minimal config, handles HTTPS termination.
**Status:** ACTIVE

---

## D-047 — n8n as Workflow / Automation Engine
**Decision:** n8n is the workflow orchestration engine for the automation backbone.
**Role:** Receives webhook triggers → executes multi-step workflows → calls Payload API for product mutations.
**Access:** `flow.uygunayakkabi.com`
**Reason:** Visual workflow builder, webhook support, HTTP request nodes, self-hosted on VPS for full control.
**Status:** ACTIVE

---

## D-048 — OpenClaw as AI Agent Control Layer
**Decision:** OpenClaw serves as the AI agent interface layer between Telegram and backend services.
**Role:** Receives Telegram messages → AI intent parsing → routes to n8n or direct actions.
**Model:** `openai/gpt-5-mini` via OpenAI API.
**Access:** `agent.uygunayakkabi.com` (dashboard)
**Config:** `/home/furkan/.openclaw/openclaw.json`
**Reason:** Provides AI-powered intent handling, Telegram integration, and a control dashboard without building a custom agent from scratch.
**Status:** ACTIVE

---

## D-049 — Telegram DM-Only Policy (Initial)
**Decision:** Telegram bot operates in DM-only mode initially. Group messages are silently dropped.
**Config:** `channels.telegram.groupPolicy: "allowlist"` with empty `allowFrom` list.
**Reason:** Simplest secure starting point. Group support can be added later by whitelisting specific user IDs.
**Future:** Consider adding 3 specific user IDs to allowlist for limited shared group usage.
**Status:** ACTIVE

---

## D-050 — Exposed Secrets Must Be Rotated Before Production Use
**Decision:** All API keys and tokens exposed during the initial VPS setup session must be regenerated before the system handles real data.
**Affected:** Telegram bot token, OpenAI API key, OpenClaw gateway token.
**Reason:** These values were visible in terminal output and chat logs during setup.
**Rule:** After rotation, update `/home/furkan/.openclaw/openclaw.json` and restart affected containers. Verify functionality after each rotation.
**Status:** ACTIVE — 🔴 PENDING EXECUTION

---

## D-051 — Automation Layer Always Creates Draft Products
**Decision:** Products created via the automation pipeline (Telegram → OpenClaw → n8n → Payload) must always be created with `status: 'draft'`. Admin manually reviews and sets to `active`.
**Reason:** Prevents unreviewed products from appearing on the live storefront. Admin remains the quality gate.
**Status:** ACTIVE

---

## D-052 — Media Collection Requires Public Read Access
**Decision:** The Media collection must have `access: { read: () => true }` to allow unauthenticated visitors to view product images.
**Reason:** Payload CMS defaults to requiring authentication for all collection operations. Without explicit public read access, all image URLs served via `/api/media/file/...` return 403 for storefront visitors. The issue was masked during development because the developer was logged into the admin panel (browser had session cookie).
**Implementation:** Added `access: { read: () => true }` to `src/collections/Media.ts`.
**Lesson:** Any collection whose data must be publicly accessible (media, products via API, etc.) needs explicit `read: () => true` in its access config.
**Status:** ACTIVE — FIXED 2026-03-11

---

## D-053 — Always Upload Media via Production Admin for Multi-PC Workflows
**Decision:** When developing across multiple PCs, always upload product images through the **production admin** (`uygunayakkabi.com/admin`), never through local dev (`localhost:3000/admin`).
**Reason:** Local uploads go to `public/media/` on the local filesystem, which is not synced between machines or to production. Production uploads go to Vercel Blob Storage, which is cloud-hosted and accessible from anywhere.
**Diagnostic:** If image URLs in the DB are `/api/media/file/...` → uploaded locally. If URLs are `https://...blob.vercel-storage.com/...` → uploaded via production (correct).
**Status:** ACTIVE — OPERATIONAL RULE

---

## D-054 — Product Family Architecture (Beyond Shoes)
**Decision:** Products are no longer exclusively shoes. The system must support multiple product families (shoes, wallets, bags, accessories, etc.) without breaking the existing shoe-centric UI or data.
**Implementation:** Add `productFamily` (select: shoes, wallets, bags, accessories) and `productType` (text, free-form: sneaker, boot, loafer, bifold, cardholder, etc.) as new additive fields. The existing `category` select field is preserved as-is for backward compatibility with the current storefront filtering.
**Rule:** Do NOT replace or remove the existing `category` field. New fields are additive.
**Status:** ACTIVE

---

## D-055 — Multi-Channel Publishing Toggles
**Decision:** Products must have per-channel publish controls. Each channel (website, Instagram, Shopier, Dolap) gets an independent toggle.
**Implementation:** Add a `channels` group on Products with checkbox fields: `publishWebsite` (default true), `publishInstagram`, `publishShopier`, `publishDolap`. The existing `postToInstagram` field is superseded by `channels.publishInstagram` but kept for backward compatibility.
**Reason:** The business needs fine-grained control over which channels each product is published to. Automation should set these flags; admin can override.
**Status:** ACTIVE

---

## D-056 — Product Source Tracking
**Decision:** Every product must track where it was created from: `admin`, `telegram`, `n8n`, `api`, `import`.
**Implementation:** Add `source` select field on Products. Default: `admin`. Automation pipeline sets to `telegram` or `n8n`.
**Reason:** Needed for audit trail, analytics, and different processing logic for automation-created vs manually-created products.
**Status:** ACTIVE

---

## D-057 — Automation Metadata on Products
**Decision:** Products need automation-related metadata fields for sync tracking and conflict resolution.
**Implementation:** Add `automationMeta` group with: `telegramChatId` (text), `telegramMessageId` (text — migrated from top-level field), `lastSyncedAt` (date), `updatedBy` (text: admin/automation/api), `lockFields` (checkbox — when true, automation cannot overwrite manual admin edits).
**Reason:** Required for the Telegram → OpenClaw → n8n → Payload pipeline to avoid overwriting admin corrections.
**Status:** ACTIVE

---

## D-058 — Blog/SEO Collection Scaffold
**Decision:** A BlogPosts collection is scaffolded now in Phase 2 so the data model is ready when Phase 3 content generation begins.
**Implementation:** BlogPosts collection with: title, slug (auto), content (richText), excerpt, category, tags, status (draft/published/archived), seoTitle, seoDescription, relatedProducts (relationship), author, publishedAt.
**Reason:** The AI content engine needs a target collection. Building it now avoids schema churn later.
**Status:** ACTIVE — SCAFFOLDED (not yet populated or rendered on storefront)

---

## D-059 — Payload Remains Single Source of Truth for All Channels
**Decision:** Payload CMS is the authoritative data store for all product information. External channels (Instagram, Shopier, Dolap) publish FROM Payload, never independently.
**Rule:** Automation may improve presentation (AI titles, enhanced images), but must never alter product truth (price, stock) without admin approval. All mutations go through Payload API.
**Status:** ACTIVE — CORE ARCHITECTURAL RULE

---

## D-062 — OpenClaw → n8n Transport: exec + curl via Internal Docker Network
**Decision:** OpenClaw forwards product intake data to n8n using its native `exec` tool to run `curl`, targeting n8n directly via the internal Docker network (`http://n8n:5678/webhook/mentix-intake`), not via the public Caddy URL.
**Implementation:**
- Transport: `exec` tool → `curl -X POST http://n8n:5678/webhook/mentix-intake`
- Internal path avoids TLS overhead and Caddy dependency; ~8ms round-trip confirmed
- n8n workflow: `Mentix Intake Webhook` (ID: `WOv8kRkN00Jo8g2D`) — Webhook → Parse Fields → Respond to Webhook
- OpenClaw skill: `/home/furkan/.openclaw/skills/mentix-intake/SKILL.md` (mounted into container)
- `skills.load.watch: true` — file edits reload the skill without container restart
- n8n activation done via direct SQLite writes (workflow_entity.activeVersionId + workflow_published_version) because `n8n import:workflow` deactivates imported workflows by default
**Payload schema v1.0 fields:** `schema_version`, `source`, `intent`, `telegram.{user_id, chat_id, chat_type, message_id, username}`, `message.{text, has_media, media_file_id, media_type}`, `parsed.{title, stock_code, price, quantity, notes}`, `timestamp`, `session_id`
**Validated:** curl from inside OpenClaw container → n8n → 200 `{"status":"received"}` ✅ (exec #5, 8ms)
**Not yet validated:** Full chain: real Telegram mention → skill triggers → exec runs → n8n receives
**Status:** ACTIVE — transport layer proven. Next: n8n → Payload product creation (Step 5)

---

## D-061 — Telegram Group Access Policy: Restricted Allowlist + Mention-Only
**Decision:** Enable OpenClaw group messaging for a limited allowlist of approved Telegram user IDs, with mention-only response behavior in groups. DM behavior unchanged.
**Implementation:**
- `groupPolicy: "allowlist"` — preserved (was already set, but no allowFrom entries)
- `groupAllowFrom: [5450039553, 8049990232]` — only these 2 user IDs can trigger the bot in any group
- `groups: { "*": { requireMention: true } }` — wildcard group config; bot only responds when explicitly @mentioned
- Both fields are native OpenClaw config (no workarounds needed — `requireMention` is a first-class field in `TelegramGroupConfig`)
- `requireMention` defaults to `true` in OpenClaw even without explicit config, but set explicitly for clarity
- DM policy unchanged: `dmPolicy: "pairing"` — existing DM pairings continue to work
- Config backup created at `/home/furkan/.openclaw/openclaw.json.bak` before change
- OpenClaw hot-reloaded the Telegram channel on config change (confirmed in logs); container restarted cleanly
**To add 3rd user:** append their numeric Telegram ID to `groupAllowFrom` array in openclaw.json, restart OpenClaw
**Group to add bot to:** "Mentix Grup Bot" (not yet created — group chat ID not needed in config, wildcard `"*"` handles any group)
**Status:** ACTIVE — 2 users approved, 3rd user pending

---

## D-060 — Try-On Is UX Layer Only
**Decision:** The future try-on system is a frontend UX feature on product pages. It does not affect the product data model, media pipeline, or catalog source images.
**Implementation:** When ready, add a client-side component that loads on product detail pages. No new collections or fields needed now.
**Status:** PLANNED — No implementation yet

---

## D-063 — Step 9: Inventory / Variant Readiness Baseline
**Decision:** Add product-level `stockQuantity` field and variant-level `color` field. Define `TG-{PREFIX3}-{msgId}` as the standard SKU pattern for automation-sourced products.

**Rationale:**
- Products table had zero stock columns. Automation intake had nowhere to store quantity from Telegram messages.
- Variant-level stock already exists in Variants collection. Product-level is needed for products without size variants.
- SKU generation was `{PREFIX3}-{TIMESTAMP36}` — not traceable. New pattern `TG-{PREFIX3}-{msgId}` links SKU back to the originating Telegram message.
- Variants had no `color` field — required for future size×color matrix without schema changes.
- InventoryLogs table exists but is unused — deliberately left for a future hook when stock changes are logged automatically.

**Changes made (2026-03-15):**
- `products` table: `ALTER TABLE products ADD COLUMN stock_quantity integer NOT NULL DEFAULT 1`
- `variants` table: `ALTER TABLE variants ADD COLUMN color varchar`
- `Products.ts`: added `stockQuantity` field (position: sidebar, default: 1, validate ≥ 0)
- `Products.ts`: `beforeValidate` SKU generation — if source is `n8n`/`telegram` AND `telegramMessageId` is available, generates `TG-{PREFIX3}-{msgId}`; otherwise falls back to `{PREFIX3}-{TIMESTAMP36}`
- `Variants.ts`: added optional `color` text field
- `/api/automation/products`: accepts `stockQuantity` or `quantity` from intake body, passes to Payload create; returns `sku` and `stock_quantity` in response
- `ReviewPanel`: added stok adedi check (⚡ warning if 0 or missing)
- Orphaned variants (ids 1–3, product_id=null) from deleted Adidas Superstar cleaned up

**SKU standard:**
- Automation (Telegram/n8n): `TG-{PREFIX3}-{msgId}` — e.g. `TG-NIK-9001`
- Manual/Admin: `{PREFIX3}-{TIMESTAMP36}` — e.g. `NIK-M9X2AK`
- Explicit SKU from Telegram caption always takes priority (not overwritten)

**Stock design:**
- `products.stock_quantity` — total stock for variantless products, set by automation intake
- `variants.stock` — per-variant (per-size) stock, managed via Variants collection
- Future: `afterChange` hook on Variants to write InventoryLog entry when stock changes

**Not implemented now (deferred):**
- Auto-create Variants from Telegram intake (e.g. "42, 43, 44: 2 adet her")
- InventoryLogs write-on-change hook
- Size-level intake parsing in OpenClaw skill
- Color as intake dimension

**Status:** ACTIVE — stock_quantity and color columns live in DB

---

## D-064 — Step 10: Publishing Flow / Commerce Activation
**Decision:** Define controlled draft → active transition with server-side publish guard. Fix product detail page status enforcement.

**State machine:**
```
draft (automation creates) → [operator reviews] → active (publish) → soldout
```
No intermediate "reviewed" state — operator directly activates. Simplicity over process overhead.

**Publish-readiness rules (BLOCKING — server enforced):**
- price > 0 — beforeChange hook throws if activating with price = 0 or null
- title non-empty — already enforced by existing validate function

**Publish-readiness (WARNING only — not blocking):**
- images: 0 images allowed (operator may activate and add images later)
- SKU: always auto-generated, never missing
- category/brand: optional

**Changes made (2026-03-15):**
1. `products/[slug]/page.tsx`: Added `if (product.status === 'draft') notFound()` — draft products no longer accessible on public storefront via direct URL. Soldout products remain accessible.
2. `Products.ts` beforeChange hook: throws error when `operation === 'update'` AND `data.status === 'active'` AND `originalDoc.status !== 'active'` AND `price <= 0`. Does NOT block automation draft creation (create operations are fully exempt).
3. `StatusCell.tsx`: Now reads server error response (Payload `errors[0].message`), renders inline error message below the button in red. User can click to dismiss. No more silent failures.

**Validation results:**
- Storefront homepage: `where: { status: { equals: 'active' } }` — already correct ✅
- Product detail: now returns 404 for draft slugs ✅
- "Aktif Yap" button: blocked at server if price = 0, error shown inline ✅
- "Aktif Yap" button: succeeds and updates cell optimistically if price > 0 ✅

**Commerce integration attach points (future — NOT implemented):**
- **Shopier sync**: `afterChange` hook on Products — if `data.status === 'active'` && `data.channels?.publishShopier === true` && originalDoc.status !== 'active' → POST to Shopier API or trigger n8n webhook
- **Instagram posting**: same `afterChange` hook — if `channels.publishInstagram === true` → n8n workflow → Graph API
- **Dolap sync**: same hook — if `channels.publishDolap === true` → Dolap API
- **Exact hook location**: Products.ts `afterChange` array, separate from the beforeChange guard
- **Recommended trigger**: status transition + channel flag, not every save (to avoid duplicate posts)

**Status:** ACTIVE — publish guard live, storefront protection in place
