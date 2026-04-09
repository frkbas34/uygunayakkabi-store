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
**Status:** SUPERSEDED by D-052 — Telegram now uses allowlisted group mode

---

## D-050 — Exposed Secrets Must Be Rotated Before Production Use
**Decision:** All API keys and tokens exposed during the initial VPS setup session must be regenerated before the system handles real data.
**Affected:** Telegram bot token, OpenAI API key, OpenClaw gateway token.
**Reason:** These values were visible in terminal output and chat logs during setup.
**Rule:** After rotation, update `/home/furkan/.openclaw/openclaw.json` and restart affected containers. Verify functionality after each rotation.
**Status:** ✅ RESOLVED (2026-03-15) — Rotation completed in Step 1. All tokens regenerated and verified.

---

## D-051 — Automation Layer Always Creates Draft Products
**Decision:** Products created via the automation pipeline (Telegram → OpenClaw → n8n → Payload) must always be created with `status: 'draft'`. Admin manually reviews and sets to `active`.
**Reason:** Prevents unreviewed products from appearing on the live storefront. Admin remains the quality gate.
**Status:** SUPERSEDED by D-053 — Product status now toggle-controlled, not hardcoded draft

---

## D-052 — Telegram Allowlisted Group Mode
**Decision:** Telegram bot now supports group messages from allowlisted user IDs, not DM-only.
**Config:** `channels.telegram.groupPolicy: "allowlist"` with specific user IDs in `allowFrom`.
**Reason:** Owner and trusted friends need to test product intake from a shared group.
**Rule:** Only whitelisted Telegram user IDs can trigger product actions in group chats. Unknown users are silently ignored.
**Supersedes:** D-049 (DM-only policy)
**Status:** ACTIVE

---

## D-053 — Toggle-Controlled Product Publish (Not Hardcoded Draft)
**Decision:** Automation-created products respect a configurable toggle rather than always being draft.
**Implementation:** `AutomationSettings` global in Payload controls `autoActivateProducts`. When true, products are created as `active`; when false, as `draft`.
**Reason:** Owner wants the flexibility to auto-publish products or require admin review, switchable at any time.
**Supersedes:** D-051 (always-draft rule)
**Status:** ACTIVE

---

## D-054 — Multi-Channel Distribution with Per-Channel Toggles
**Decision:** Product publishing is controlled per-channel via toggles in `AutomationSettings` global.
**Channels:** Website, Instagram, Shopier, Dolap
**Toggles:** `publishWebsite`, `publishInstagram`, `publishShopier`, `publishDolap`
**Per-product override:** Products have `channelTargets` field that can override global defaults.
**Reason:** Each channel has different readiness levels and business needs. Independent control prevents accidental publishing.
**Supersedes:** D-012 (now expanded with Dolap + per-channel control)
**Status:** ACTIVE

---

## D-055 — Product Family Architecture (Beyond Shoes)
**Decision:** Product data model expands beyond shoes with `productFamily` and `productType` fields.
**Families:** shoes, wallets, bags, belts, accessories
**Types:** Family-specific subtypes (e.g., shoes → sneaker/loafer/boot/sandal; wallets → bifold/long/cardholder)
**Backward compatibility:** Existing `category` field remains untouched. New fields are additive. Storefront and automation should gradually adopt new fields.
**Reason:** Business will sell wallets and other accessories alongside shoes.
**Status:** ACTIVE

---

## D-056 — AI SEO Blog Engine
**Decision:** Active products can trigger AI-generated blog posts for organic SEO traffic.
**Collection:** `BlogPosts` with fields for title, slug, content, related product, focus keywords, meta fields, source (ai/admin), status.
**Trigger:** Only when product is `active`, `generateBlog` flag is true, and global `autoGenerateBlog` toggle is on.
**Separation:** Blog workflow runs independently from product creation workflow — blog failure must not block product publishing.
**Blog toggles:** `autoGenerateBlog` (trigger generation), `autoPublishBlog` (auto-publish or keep as draft)
**Status:** ACTIVE

---

## D-057 — Visual Expansion Engine (Non-Destructive Additional Product Images)
**Decision:** System generates 2–4 additional catalog-quality product images from 1–2 original photos.
**Core rule:** Original product must be preserved 100% — no redesign, no material/logo/shape alteration.
**Principle:** "Automation may improve presentation, but must never alter product truth."
**Pipeline:** Original → integrity check → shot planner → prompt library → generation → validation → approved media set
**Original always preserved:** Generated images are stored alongside originals, never replace them.
**Media types:** original, enhanced, generated_angle, channel_optimized
**Status:** ACTIVE — scaffold phase

---

## D-058 — Photo-Based AI Try-On (Future Phase)
**Decision:** Product pages will include a photo-based AI try-on feature where customers upload a full-body photo and the system generates the selected product on their feet.
**Type:** Photo-based generation (not live AR)
**Phase:** After core commerce, multi-channel, and visual expansion are stable.
**Privacy:** User photos must have auto-delete policy.
**Separation:** Try-on engine is completely separate from product creation and publishing pipelines.
**Status:** PLANNED — scaffold only

---

## D-059 — Payload Remains Single Source of Truth for All Channels
**Decision:** All product data originates from and is managed in Payload CMS. External channels (Instagram, Shopier, Dolap) publish FROM Payload data, never directly from Telegram or other sources.
**Reason:** Prevents data fragmentation across channels. Admin always has override control.
**Status:** ACTIVE

---

## D-060 — AutomationSettings Global for Centralized Toggle Control
**Decision:** A new Payload global `AutomationSettings` holds all automation and publishing toggles in one place.
**Toggles include:** autoActivateProducts, publishWebsite, publishInstagram, publishShopier, publishDolap, autoGenerateBlog, autoPublishBlog, autoGenerateExtraViews, telegramGroupEnabled
**Reason:** Centralized admin control over all automation behavior. No need to modify n8n or code to change behavior.
**Status:** ACTIVE

---

## D-090 — Media Collection Requires Public Read Access
**Decision:** The Media collection must have `access: { read: () => true }` to allow unauthenticated visitors to view product images.
**Reason:** Payload CMS defaults to requiring authentication for all collection operations. Without explicit public read access, all image URLs served via `/api/media/file/...` return 403 for storefront visitors.
**Implementation:** Added `access: { read: () => true }` to `src/collections/Media.ts`.
**Lesson:** Any collection whose data must be publicly accessible needs explicit `read: () => true`.
**Status:** ACTIVE — FIXED 2026-03-11
**Note:** Originally mislabeled as D-052 (ID collision). Renumbered 2026-03-23.

---

## D-091 — Always Upload Media via Production Admin for Multi-PC Workflows
**Decision:** When developing across multiple PCs, always upload product images through the **production admin** (`uygunayakkabi.com/admin`), never through local dev (`localhost:3000/admin`).
**Reason:** Local uploads go to `public/media/` on the local filesystem. Production uploads go to Vercel Blob Storage.
**Diagnostic:** `/api/media/file/...` = local (wrong). `https://...blob.vercel-storage.com/...` = production (correct).
**Status:** ACTIVE — OPERATIONAL RULE
**Note:** Originally mislabeled as D-053 (ID collision). Renumbered 2026-03-23.

---

_D-054 (duplicate) and D-055 (duplicate) removed 2026-03-23 — content already covered by D-054 (Multi-Channel Toggles) and D-055 (Product Family Architecture) in the canonical sequence above._

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
**Validated:** Full chain confirmed working — real Telegram group @mention → skill triggers → exec curl → n8n → Payload draft product ✅ (2026-03-15)
**Status:** ACTIVE — full pipeline proven end-to-end

---

## D-093 — Try-On Is UX Layer Only
**Decision:** The future try-on system is a frontend UX feature on product pages. It does not affect the product data model, media pipeline, or catalog source images.
**Implementation:** When ready, add a client-side component that loads on product detail pages. No new collections or fields needed now.
**Status:** PLANNED — No implementation yet
**Note:** Originally D-060 (ID collision), briefly D-087 (also taken). Renumbered to D-093 on 2026-03-23.

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

---

## D-065 — Step 11: Caption Parser Enhancement

**Decision:**
Implement a structured, tolerant caption parser that extracts product fields from informal Telegram messages without silently inventing values.

**Problem with old parser:**
- Required exact label format (SKU:, TITLE:, PRICE:) — too rigid for real use
- Returned `null` on any required field miss — no partial results, no warnings
- No rawCaption preservation — hard to debug parse failures
- No confidence score — admin had no signal about parse quality
- Missing fields for future automation (productFamily, channelTargets, seoRequested)

**New parser behavior (`parseTelegramCaption` in src/lib/telegram.ts):**
- Accepts Turkish and English label aliases (başlık/title, fiyat/price, adet/quantity, etc.)
- Two-pass approach: labeled fields first, then heuristic unlabeled line detection
- Price parsing: handles "1.500", "1500 TL", "₺1500", "1500,50" formats
- Category normalization: maps Turkish/English text → Products enum values
- Brand inference: detected from known brand list in title if not labeled
- ProductFamily inference: from category or title keywords
- Never returns null on partial parse — always returns result with warnings
- parseConfidence (0–100): weighted score based on required field coverage
- parseWarnings: non-blocking list of what was missing or ambiguous
- rawCaption: always preserved for debugging

**Publish readiness evaluator (`evaluatePublishReadiness`):**
- Reusable function callable from routes and future automation rules
- Critical (blocking): title, price > 0, images present, category, brand, stockQuantity > 0
- Non-critical (warnings): description, productFamily
- Returns: isReady, missingCritical[], warnings[], score (0–100)
- NOT a hook — callable explicitly, no side effects

**automationMeta new fields (Products.ts):**
- rawCaption: preserved original Telegram message
- parseWarnings: JSON string of warning array
- parseConfidence: 0–100 integer score

**Route changes (api/automation/products/route.ts):**
- Accepts rawCaption / messageText / caption in body for automatic parsing
- Merges parser output with explicit body fields (body always wins)
- Returns parsed_fields, parse_confidence, parse_warnings, readiness in response
- n8n can use readiness.is_ready to decide whether to auto-activate

**ReviewPanel changes:**
- Shows parseConfidence % with color coding (green ≥60, yellow 30–59, red <30)
- Shows parseWarnings list if present
- Collapsible raw caption preview for debugging

**Products.ts merges (Step 11 also restores Step 8-10 regression):**
- A staged but uncommitted downgrade of Products.ts was detected and reversed
- Restored: reviewPanel UI field, beforeChange publish guard, source field, channels group, automationMeta group, stockQuantity, StatusCell, automation-aware price validation, TG-SKU generation
- Added: channelTargets multi-select, automationFlags group, sourceMeta group, rawCaption/parseWarnings/parseConfidence in automationMeta

**Backward compatibility:**
- Old parseTelegramCaptionLegacy function preserved under deprecated name
- parseStockUpdate unchanged
- Existing products unaffected — new fields default to null/empty
- n8n webhook: rawCaption field is optional — if absent, explicit body fields used as before

**Status:** ACTIVE — implemented 2026-03-16

---

## D-066 — Step 12: Automation Settings / Global Toggle Layer

**Decision:**
Implement a central automation control plane that makes all automation decisions (product status, channel routing, content generation) configurable through Payload admin without code changes.

**Core principle:**
- Global settings = capability gates (operator decides what the system CAN do)
- Product-level flags = intent gates (sender/parser declares what a product WANTS)
- Both must be true for any automation action to fire
- Safe fallback: when settings unavailable → conservative defaults → draft, no publish

**Files implemented (2026-03-16):**

1. `src/globals/AutomationSettings.ts` — Extended with:
   - productIntake.minConfidenceToActivate (number, 0-100, default 60)
   - contentGeneration.enableTryOn (checkbox, default false)
   - Enriched admin descriptions aligned with decision layer

2. `src/lib/automationDecision.ts` — New pure decision layer:
   - `AutomationSettingsSnapshot` type (safe partial shape of settings global)
   - `resolveProductStatus(input, settings)` → 'active' | 'draft' + reason + blockedBy
   - `resolveChannelTargets(productTargets, settings)` → effective + blocked channels
   - `resolveContentDecision(productFlags, seoRequested, settings)` → content intent flags
   - `fetchAutomationSettings(payload)` → safe fetch with null fallback on error
   - SAFE_DEFAULTS constants: requireAdminReview=true, autoActivate=false, minConfidence=60

3. `src/app/api/automation/products/route.ts` — Route now:
   - Loads AutomationSettings via fetchAutomationSettings()
   - Calls resolveProductStatus() for status decision (no more hardcoded 'draft')
   - Calls resolveChannelTargets() for effective channel list
   - Calls resolveContentDecision() for blog/image/tryOn intent
   - Stores autoDecision + autoDecisionReason in automationMeta
   - Returns full decision object + content_intent in response for n8n

4. `src/collections/Products.ts` — automationMeta extended:
   - autoDecision (select: active/draft, readOnly)
   - autoDecisionReason (textarea, readOnly)

5. `src/components/admin/ReviewPanel.tsx` — New decision row:
   - Shows "Otomasyon kararı: Aktif edildi / Taslak bırakıldı"
   - Shows autoDecisionReason text
   - Color: green for active, amber for draft

**Status decision precedence (highest → lowest):**
1. explicit 'draft' in body → always draft
2. settings unavailable → draft (safe fallback)
3. requireAdminReview = true → draft
4. autoActivateProducts = false → draft (per-product override can override this)
5. parseConfidence < minConfidenceToActivate → draft
6. readiness.isReady = false → draft
7. all gates pass → active

**Channel decision:**
- Global capability AND product intent both required
- Website: on by default (publishWebsite defaults true)
- Instagram/Shopier/Dolap: off by default — no real integration yet (Step 13+)
- Real publishing scaffolded but not triggered

**Content generation:**
- Blog: globalEnabled AND (productFlag OR seoRequested from caption)
- Extra views: globalEnabled AND productFlag (both required)
- Try-on: globalEnabled AND productFlag (both required)
- None of these trigger real actions yet — returns intent flags for n8n use

**n8n response enhancements:**
- product_status: resolved status
- decision.status / decision.reason / decision.blocked_by
- channels.effective / channels.blocked_by_global / channels.summary
- content_intent.generate_blog / generate_extra_views / try_on_enabled

**What is NOT yet implemented (Step 13+):**
- Real Instagram publish (Graph API)
- Real Shopier sync
- Real Dolap sync
- Real blog post creation trigger
- Real extra image generation trigger
- Telegram admin notification when requireAdminReview is true
- Dashboard review queue widget

**Status:** ACTIVE — implemented 2026-03-16

---

## D-067 — Step 13: Channel Adapter Scaffolding

**Decision:**  
Implement a pure dispatch library (`src/lib/channelDispatch.ts`) that fires n8n webhook stubs for Instagram, Shopier, and Dolap channels. No real third-party API calls in this step — the adapter contract is established, and n8n will receive the full product payload to act on in future steps.

**Reason:**  
- Decouples the Payload layer from external API details (Instagram Graph API, Shopier API, Dolap API)
- n8n is the right orchestration layer for external platform calls — Payload only dispatches the intent
- Scaffold-first allows the full control flow (eligibility → dispatch → tracking) to be tested before real integrations exist
- `N8N_CHANNEL_*_WEBHOOK` env vars can be set when real workflows are ready — zero code changes needed

**Key choices:**
- Website is NOT a dispatch target — it works natively via `status: active` (no webhook needed)
- Eligibility = global capability (AutomationSettings) ∩ product intent (channelTargets + channels.*)
- `dispatchProductToChannels()` is the orchestrator — called by afterChange hook on status → active
- `isDispatchUpdate` context flag prevents infinite re-trigger when writing dispatch tracking to sourceMeta
- All dispatch failures are non-fatal: product activation succeeds regardless, errors are logged
- Dispatch tracking stored in `sourceMeta.dispatchedChannels`, `lastDispatchedAt`, `dispatchNotes`
- `AbortSignal.timeout(10_000)` on fetch calls to prevent hanging on slow webhooks

**Scaffold mode behavior (no env var set):**  
Logs full payload intent at INFO level with `SCAFFOLD —` prefix. Admin can see which channels would have been targeted. Zero errors — graceful no-op.

**Adapter contract (`ChannelDispatchPayload`):**  
channel, productId, sku, title, price, originalPrice, brand, category, productFamily, productType, color, description, mediaUrls, channelTargets, triggerReason, dispatchTimestamp, meta (parseConfidence, autoDecision, telegramMessageId, source)

**Deferred to future steps:**
- Real Instagram Graph API integration
- Real Shopier listing sync
- Real Dolap listing sync
- n8n channel workflow stubs (receive + log intent)
- ReviewPanel channel dispatch status display
- Admin "re-dispatch" action

**Status:** ACTIVE — implemented 2026-03-16

---

## D-068 — Step 14: n8n Stub Workflows + Admin Dispatch Visibility

**Decision:**  
Add three importable n8n stub workflow JSON files (Instagram / Shopier / Dolap), a complete dispatch contract documentation file, dispatch status visibility in ReviewPanel, and a `forceRedispatch` field for admin-triggered manual re-dispatch.

**Reason:**  
- Stub workflows allow end-to-end testing of the dispatch chain without real third-party APIs
- Dispatch visibility in ReviewPanel eliminates the "black box" problem — admin can see exactly what happened, which channels were eligible, which were dispatched, and why any were skipped
- `forceRedispatch` satisfies the retry requirement cleanly: deliberate, one-shot, self-resetting
- Keeping stubs as importable JSON in repo (not VPS config) means anyone can onboard the n8n side without re-inventing the workflow structure

**Key choices:**

**n8n stub workflow structure (3 nodes each):**
- Webhook → Log Payload (Set node) → Respond 200
- Path: `channel-instagram` / `channel-shopier` / `channel-dolap`
- Respond node echoes: received, channel, productId, sku, title, timestamp, mode: 'stub'
- No real API calls in any node

**`n8n-workflows/CHANNEL_DISPATCH_CONTRACT.md`:**
- Full ChannelDispatchPayload type + sample JSON
- Env var table
- End-to-end test checklist
- Dispatch result schema
- Manual re-dispatch instructions

**ReviewPanel dispatch section:**
- Only shown when `status === 'active'`
- Per-channel rows: eligible/dispatched/webhookConfigured/skippedReason/error/responseStatus/timestamp
- Color-coded: green = dispatched, yellow = eligible but not sent, grey = skipped
- Collapsible raw `dispatchNotes` debug block
- Pending dispatch hint on draft products

**`forceRedispatch` checkbox (in sourceMeta group):**
- Admin-visible, not readOnly
- afterChange hook fires when `forceRedispatch === true && status === 'active'`
- Auto-reset to `false` in the same sourceMeta update that writes dispatch results
- NOT reset on dispatch error (admin can retry by saving again — idempotent intent)
- Trigger reason logged as `manual-redispatch` vs `status-transition`

**Deferred:**
- Per-channel listing ID written back to `externalSyncId` after successful real API call
- Scheduled retry for failed dispatches
- Admin "re-dispatch single channel" button (current forceRedispatch redispatches all eligible channels)

**Status:** ACTIVE — implemented 2026-03-16

---

## D-069 — Step 15: E2E Verification Pass + Media URL Hardening

**Decision:**  
No new abstraction layers. Focus on verifying the existing dispatch chain and fixing one real bug: relative `/media/` paths in `extractMediaUrls()` were not accessible from the n8n VPS.

**Findings from inspection pass:**
1. **Env var naming: ✅ consistent** — `N8N_CHANNEL_INSTAGRAM_WEBHOOK` etc. match exactly across `channelDispatch.ts`, `CHANNEL_DISPATCH_CONTRACT.md`, and all 3 stub JSONs. No fix needed.
2. **Dispatch logic: ✅ correct** — `dispatchToChannel()` uses `response.ok` (checks 2xx), has `AbortSignal.timeout(10_000)`, catches fetch errors. Non-throwing. Works on Node.js 18 (Vercel default).
3. **afterChange guard: ✅ correct** — `req.context.isDispatchUpdate` pattern correctly prevents infinite loop. `forceRedispatch` reset-on-success, preserve-on-error is the right behavior.
4. **Media URLs: ⚠️ BUG FIXED** — `extractMediaUrls()` returned relative `/media/<filename>` paths for local dev media. These are not accessible from n8n (external VPS). Fixed by prepending `NEXT_PUBLIC_SERVER_URL` when constructing the fallback path. In production, all media uses Vercel Blob (absolute URLs), so this only affects dev. Safe non-breaking fix.
5. **`.env.example`: ⚠️ STALE** — Missing all Phase 2 vars (AUTOMATION_SECRET, BLOB_READ_WRITE_TOKEN, N8N_CHANNEL_*_WEBHOOK, N8N_INTAKE_WEBHOOK). Updated with full set.

**New assets:**
- `n8n-workflows/E2E_TEST_CHECKLIST.md` — 120-line repeatable runbook: n8n import steps, env var setup, test product creation, expected log lines, n8n execution verification, media URL check, forceRedispatch test, failure mode table, 30-line quick-reference checklist.
- `n8n-workflows/CHANNEL_DISPATCH_CONTRACT.md` — Added "Media URL Behavior" section (explains Blob vs. local fallback, how to verify), "Known Limitations" table (8 items: no real API, no retry, no history append, etc.).

**Confirmed assumptions:**
- Vercel Blob `*.public.blob.vercel-storage.com` URLs are publicly accessible worldwide including n8n VPS — no special access needed.
- `NEXT_PUBLIC_SERVER_URL` is set to `https://uygunayakkabi.com` in Vercel production env — confirmed present in `.env.example` and existing Vercel config.
- `AbortSignal.timeout()` is Node.js 17.3+ — Vercel runs 18 → not an issue.

**Deferred (require VPS action, not code):**
- Actual n8n stub import and activation (VPS operation)
- Setting `N8N_CHANNEL_INSTAGRAM_WEBHOOK` in Vercel (operator action)
- First real E2E test run (requires both of the above)

**Status:** ACTIVE — implemented 2026-03-16

---

## D-070 — Mentix Intelligence Layer: Full Skill Stack Design

**Decision:**
Design and create a comprehensive 11-skill stack for Mentix, with 3-level controlled rollout (A: active, B: controlled, C: observe-only).

**Skills added:**
- Level A (6): skill-vetter, browser-automation, sql-toolkit, agent-memory, github-workflow, uptime-kuma
- Level B (4): eachlabs-image-edit, upload-post, research-cog, senior-backend
- Level C (1): learning-engine

**Reason:**
Mentix needs to evolve from a single-skill intake bot into a full operations assistant capable of debugging product data flows, monitoring infrastructure, managing content, and learning from its own operations. The 3-level activation ensures safe rollout without mass-enabling risky automations.

**Status:** ACTIVE — designed 2026-03-16, pending VPS deployment

---

## D-071 — Memory System: agent-memory (File-Based) Over chromadb-memory (Vector DB)

**Decision:**
Use structured file-based memory (agent-memory) instead of ChromaDB vector database for Mentix's operational memory.

**Reason:**
- ChromaDB would require an additional Docker container on VPS, adding complexity
- Project already uses file-based documentation (ai-knowledge/, project-control/)
- Structured markdown aligns with existing knowledge architecture
- Vector search not needed at this stage — categorical retrieval is sufficient
- Lower resource footprint on VPS
- Easier to inspect, debug, and version-control
- Can migrate to ChromaDB later if semantic search becomes necessary

**Status:** ACTIVE — decided 2026-03-16

---

## D-072 — Learning Engine: Observe-First Mode with No Auto-Modification

**Decision:**
The learning-engine starts in observe-only mode. It may observe, score, detect patterns, summarize, and propose improvements — but it MUST NOT auto-modify any skill, workflow, or system configuration without explicit human review.

**Reason:**
A self-modifying system in production is dangerous without extensive operational history. The learning engine needs to build trust through accurate observations and useful proposals before earning any autonomous execution rights.

**Upgrade path:** After 30 days of stable observation with positive human approval rate, consider moving to "suggest with auto-apply for LOW risk" mode.

**Status:** ACTIVE — decided 2026-03-16

---

## D-073 — Skill Activation Policy: Draft-First for Publishing, Confirmation for Writes

**Decision:**
All content publishing skills (upload-post) operate in draft-first mode with no auto-publishing. All database write operations (sql-toolkit) require explicit confirmation. All image processing (eachlabs-image-edit) requires per-operation approval.

**Reason:**
Publishing wrong content, corrupting data, or overwriting images are high-impact, hard-to-reverse mistakes. The confirmation gates protect against both AI errors and unexpected inputs.

**Status:** ACTIVE — decided 2026-03-16

---

## D-074 — product-flow-debugger as First-Class Skill (Not Embedded in sql-toolkit)

**Decision:**
`product-flow-debugger` is a standalone Level A skill with its own SKILL.md, separate from `sql-toolkit`. It has its own 13-step trace map, 6 diagnostic entry points, confidence × risk gate, and capability/permission matrix.

**Reason:**
In v1, product diagnostics were described as a subsection of sql-toolkit. This buried the most business-critical intelligence capability under a generic database tool. Product visibility failures, intake failures, and image rendering bugs are the most common production issues — they deserve their own entry point, their own trace protocol, and their own confidence gate. Separation also allows product-flow-debugger to invoke sql-toolkit as a subordinate tool without conflating their permission models.

**Status:** ACTIVE — implemented 2026-03-16

---

## D-075 — OER Separation: Outcome / Evaluation / Reward Are Three Distinct Records

**Decision:**
The learning engine stores three strictly separated record types: (1) OUTCOME — what actually happened, stored in `traces/`; (2) EVALUATION — was Mentix's reasoning correct, stored in `evaluations/`; (3) REWARD — score assigned from outcome + evaluation combined, stored in `rewards/`. These are never merged into a single record.

**Reason:**
Conflating outcome with evaluation creates misleading training signal. A correct diagnosis with a failed outcome (e.g., correct root cause but infra was down) should reward the reasoning, not penalize it. Separating the three allows independent analysis: were the diagnostics correct? did the action work? is the confidence model calibrated? Each question has a different answer and should be stored separately.

**Status:** ACTIVE — implemented 2026-03-16

---

## D-076 — REPORT_ONLY Gate Always Writes a Decision Record

**Decision:**
When the confidence gate fires as `REPORT_ONLY` (confidence < 0.55), Mentix still writes a decision record to `decisions/` with `gate_action = REPORT_ONLY`, `final_action = NO_ACTION`, and `reason = LOW_CONFIDENCE` or `INSUFFICIENT_EVIDENCE`. No action is taken and no reward is written, but the record is persisted.

**Reason:**
The original Phase-1 implementation silently skipped writing any decision record for REPORT_ONLY cases. This made low-confidence sessions invisible in the decisions/ layer, breaking three things: (1) audit trail — operators had no way to see that a case was evaluated but deprioritized; (2) confidence calibration — no data to measure how often threshold=0.55 fires and whether it's set correctly; (3) threshold tuning — impossible to answer "kaç vaka report-only oldu?" without these records. The fix is minimal: always write the record, just mark the outcome as NO_ACTION.

**Evidence:**
Runtime-validated in Phase-2 simulation: `DEC-SIM-003.json` — `confidence=0.47`, `gate_action=REPORT_ONLY`, `final_action=NO_ACTION`. Previously had no corresponding decisions/ entry. Now always written.

**Status:** ACTIVE — implemented 2026-03-16


---

## D-077 — push:true Is Unreliable for Schema Changes on Neon Serverless

**Decision:**
Any new Payload collection or global added to `payload.config.ts` MUST be manually verified in Neon after first deployment. Do not rely on Drizzle `push: true` to self-heal schema gaps.

**Reason:**
On 2026-03-17, three cascading schema failures broke the admin panel for an extended period:
1. `products_channel_targets` table was created with `_parent_id`/`_order` (Payload v2 naming) but Payload v3 runtime expects `parent_id`/`order`. Drizzle push did not rename them.
2. `automation_settings` table (for `AutomationSettings` global) was never created — Drizzle push timed out on Neon serverless during cold start.
3. `blog_posts` table (for `BlogPosts` collection) was never created for the same reason — `blog_posts_id` column was also missing from `payload_locked_documents_rels`.

All three required manual SQL in Neon SQL Editor. Root cause: Neon serverless cold-start window is too short for multi-table schema changes when `push: true` runs at first request time.

**What was fixed manually:**
- `RENAME COLUMN "_parent_id" TO "parent_id"` and `"_order" TO "order"` on `products_channel_targets`
- `CREATE TABLE automation_settings (...)` + `ADD COLUMN automation_settings_id` to `payload_locked_documents_rels`
- `CREATE TABLE blog_posts (...)` + `blog_posts_rels` + `ADD COLUMN blog_posts_id` to `payload_locked_documents_rels`

**Rule going forward:**
After any commit that adds a collection or global, check Neon Tables view and confirm the new table exists before declaring the deployment stable.

**Alternative considered:** Switch to Payload migrations (`push: false`). Deferred — higher complexity, not yet prioritized.

**Status:** ACTIVE — discovered 2026-03-17

---

## D-078 — Payload v3 Drizzle Join Table Column Naming (parent_id, not _parent_id)

**Decision:**
When manually creating Payload v3 join tables in SQL (for `select + hasMany:true` fields), use `parent_id` and `order` as column names — NOT `_parent_id` and `_order`.

**Reason:**
Payload v2 used underscore-prefixed internal columns (`_parent_id`, `_order`). Payload v3 Drizzle adapter removed the underscores. If a join table is created manually (e.g., due to failed `push: true`), using the wrong column names causes `column does not exist` runtime errors. The generated query always references `parent_id` and `order` (no underscore).

**Status:** ACTIVE — confirmed 2026-03-17

---

## D-079 — products_channel_targets.id Must Be SERIAL (Not VARCHAR)

**Decision:**
When manually creating Payload v3 join tables for `select + hasMany:true` fields, the `id` column must be `SERIAL PRIMARY KEY` — NOT `character varying`. The Payload DB adapter defaults to `idType: 'serial'` (auto-increment integer). Drizzle generates `INSERT ... VALUES (..., DEFAULT)` for the id column, relying on a PostgreSQL sequence to auto-assign.

**Root cause of bug:**
The `products_channel_targets` table was manually created during a prior schema fix. The `id` column was incorrectly typed as `character varying NOT NULL` (no default, no sequence). This caused every product save with channelTargets to fail with 500: `null value in column "id" violates not-null constraint`.

**Fix applied (2026-03-17):**
```sql
ALTER TABLE products_channel_targets DROP CONSTRAINT products_channel_targets_pkey;
ALTER TABLE products_channel_targets DROP COLUMN id;
ALTER TABLE products_channel_targets ADD COLUMN id SERIAL PRIMARY KEY;
-- Also added FK + indexes for completeness:
ALTER TABLE products_channel_targets ADD CONSTRAINT products_channel_targets_parent_fk FOREIGN KEY (parent_id) REFERENCES products(id) ON DELETE CASCADE;
CREATE INDEX products_channel_targets_order_idx ON products_channel_targets ("order");
CREATE INDEX products_channel_targets_parent_idx ON products_channel_targets (parent_id);
```

**Key discovery:**
`push: true` does NOT run in production (`NODE_ENV=production` check in `@payloadcms/db-postgres/dist/connect.js`). All Neon schema fixes must be applied manually. There is no auto-heal in production.

**Status:** ACTIVE — confirmed 2026-03-17

---

## D-080 — Step 16: Real Instagram Integration via n8n + Synchronous Response Write-Back

**Decision:**
For the first real channel integration (Instagram), use **n8n as the orchestrator** that calls Instagram Graph API v21.0, and capture the publish result via the **synchronous webhook response body** rather than an asynchronous write-back endpoint.

**Options considered:**
1. Synchronous: n8n calls Graph API + responds with `{instagramPostId: ...}` → Payload reads response body → stores in `dispatchNotes.publishResult`
2. Asynchronous: n8n calls Graph API → POSTs result to `/api/automation/products/{id}/sync` after completion

**Why synchronous (Option 1):**
- Instagram media_create + media_publish complete in under 5 seconds — within the 10s Payload webhook timeout
- Simpler: no new API endpoint needed, no auth token management for the write-back call
- Complete result is visible immediately after dispatch, not after a second async round-trip
- Aligns with the existing dispatch contract: webhook POST → HTTP 200/4xx/5xx response

**Trade-off documented:**
If Instagram API takes longer than 10s (e.g., media processing backlog), the Payload timeout fires and the result is lost. In practice, Instagram media container creation + publish complete in 1–3s for single images. The 2s wait node in the workflow is a safety buffer.

**For async in future:**
If carousel posts or multi-step processing require longer timeouts, implement `/api/automation/products/{id}/sync` endpoint at that point (D-081).

**Status:** ACTIVE — confirmed 2026-03-18

---

## D-081 — Step 16: publishResult Field Added to ChannelDispatchResult (Additive Only)

**Decision:**
Extend `ChannelDispatchResult` with an optional `publishResult?: Record<string, unknown>` field rather than creating a channel-specific subtype for each channel.

**Reason:**
- Additive change — zero breaking changes to existing dispatchNotes consumers
- `Record<string, unknown>` allows each channel workflow to return any structured data without modifying the TypeScript contract
- ReviewPanel renders per-channel interpretations client-side (Instagram-specific rendering already added for Step 16)
- Shopier/Dolap can add their own `publishResult` shape when implemented without touching core dispatch types

**Status:** ACTIVE — confirmed 2026-03-18

---

## D-082 — Instagram OAuth Callback: Minimal Safe Handler (Redirect Only, No Token Exchange)

**Decision:**
Create a minimal `GET /api/auth/instagram/callback` route that safely receives the Meta OAuth redirect and logs it, but defers full token exchange to Step 17.

**Reason:**
Meta requires a Redirect URL to be registered before the Business Login flow can begin. The callback URL must exist and return a non-error response. The token exchange logic requires `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` which are not yet configured. Splitting the two concerns allows the OAuth URL registration to proceed immediately while token exchange is built in Step 17.

**Route:** `src/app/api/auth/instagram/callback/route.ts`
**Registered callback URLs:**
- Local: `http://localhost:3000/api/auth/instagram/callback`
- Production: `https://uygunayakkabi.com/api/auth/instagram/callback`

**On success (code received):** redirects to `/admin?instagram_auth=code_received`
**On failure (error received):** redirects to `/admin?instagram_auth=error&instagram_error={error}`
**On invalid call:** returns HTTP 400 JSON

**Status:** ACTIVE — implemented 2026-03-18

---

## D-083 — Multi-Platform Social Posting: Extend channelDispatch, NOT New Architecture

**Decision:**
Add X, Facebook, LinkedIn, and Threads as new `SupportedChannel` entries in the existing `channelDispatch.ts` → n8n webhook pattern. Do NOT build a separate social media service layer, scheduler, or direct API integration in the Next.js app.

**Reason:**
The repo already has a mature channel dispatch system: `SupportedChannel` type → 3-gate eligibility → `buildDispatchPayload()` → n8n webhook → `publishResult` write-back. Instagram is already a real integration using this exact pattern. Extending it for 4 new platforms requires only additive changes: type union, env var mappings, admin toggles, product flags, n8n stubs. Zero new dependencies, zero architectural changes.

**What was added:**
- `SupportedChannel` union: `+ 'x' | 'facebook' | 'linkedin' | 'threads'`
- `buildChannelWebhookUrl()`: 4 new `N8N_CHANNEL_*_WEBHOOK` env var mappings
- `AutomationSettings.ts`: 4 new `publishX/Facebook/Linkedin/Threads` toggles
- `Products.ts`: 4 new channel flags + 4 new `channelTargets` options
- `automationDecision.ts`: extended `SAFE_DEFAULTS`, `CAPABILITY` map, `AutomationSettingsSnapshot` type
- `ReviewPanel.tsx`: 4 new `CHANNEL_LABEL` entries
- OAuth callbacks: `/api/auth/x/callback`, `/api/auth/linkedin/callback` (Facebook/Threads reuse Meta app + Instagram callback)
- n8n workflow stubs: `channel-x.json`, `channel-facebook.json`, `channel-linkedin.json`, `channel-threads.json`
- `.env.example`: all new env vars + callback URLs documented

**What remains scaffold-only:**
All 4 new channels are stub-only. Real n8n workflows with actual API calls are a separate step per platform.

**Auth architecture:**
- X: OAuth 2.0 PKCE → own callback `/api/auth/x/callback`
- LinkedIn: OAuth 2.0 → own callback `/api/auth/linkedin/callback`
- Facebook: same Meta App as Instagram → reuses Instagram OAuth flow
- Threads: same Meta App as Instagram → reuses Instagram OAuth flow + separate Threads scopes

**Status:** ACTIVE — implemented 2026-03-19

---

## D-084 — Step 17: Instagram Token Exchange Stores Credentials via n8n REST API
**Decision:**  
After completing the Meta OAuth flow, write `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_USER_ID` directly to n8n Variables via the n8n REST API (`/api/v1/variables`). Do NOT store tokens in Payload globals, Vercel env vars, or any DB column.

**Reason:**  
- The `channel-instagram-real.json` workflow already reads `$vars.INSTAGRAM_ACCESS_TOKEN` and `$vars.INSTAGRAM_USER_ID` — this is the single source of truth for n8n credential access.  
- Writing to n8n Variables via REST API makes the token live immediately for all workflow executions without any manual n8n UI interaction.  
- Payload globals/DB are not appropriate for secrets — they would be visible to any admin and require a new migration.  
- Vercel env vars cannot be written at runtime (require a redeploy).
- The n8n Variables API is a stable, documented REST endpoint that fits the existing architecture.

**Implementation:**  
- `upsertN8nVariable(key, value)` helper in callback route: `GET /api/v1/variables` to find existing ID, then `PATCH` or `POST` accordingly.  
- Required env vars: `N8N_API_KEY` (new), `N8N_BASE_URL` (new, defaults to `https://flow.uygunayakkabi.com`).  
- Route: `src/app/api/auth/instagram/callback/route.ts` (Step 17 rewrite).

**Status:** ACTIVE — implemented 2026-03-19

---

## D-085 — Step 17: CSRF State Cookie Pattern for Instagram OAuth
**Decision:**
Use a random 32-byte hex state stored in a short-lived (10 min) HttpOnly cookie (`ig_oauth_state`), verified in the callback before any token exchange. State is generated in a new `/api/auth/instagram/initiate` route.

**Reason:**
- The repo has no Redis or session store. A new Payload collection for state would add a DB migration and unnecessary complexity.
- Cookie-based CSRF state is the standard OAuth 2.0 pattern for server-side apps and requires no infrastructure addition.
- `sameSite: lax` allows the Meta redirect to carry the cookie back.
- The 10-minute TTL is generous for an admin-initiated flow and strictly bounded.
- The `ig_oauth_state` cookie is deleted immediately after verification (one-time use).

**Status:** ACTIVE — implemented 2026-03-19

---

## D-086 — Instagram OAuth: INSTAGRAM_USER_ID Bypass for NPE Facebook Pages
**Decision:**
Add `INSTAGRAM_USER_ID` env var bypass to the OAuth callback that skips all `/me/accounts` page discovery (Steps 4a/4b/4c) when set. The bypass stores the long-lived token directly into Payload CMS with the pre-known Instagram user ID.

**Reason:**
- UygunAyakkabı is a New Pages Experience (NPE) Facebook Page (`facebook.com/profile.php?id=61576525131424`)
- NPE pages consistently return 0 results from `GET /me/accounts` Graph API, regardless of permissions granted
- Three fallback strategies (4a: `/me/accounts`, 4b: `/me?fields=accounts`, 4c: direct `/{page_id}`) all failed for NPE pages
- The Instagram numeric user ID (`43139245629`) was extracted via Instagram's internal API (`/api/v1/users/web_profile_info/`)
- Setting this as an env var is the most reliable workaround for NPE pages

**Alternatives considered:**
1. Migrate to a classic Facebook Page — rejected (destructive, loses existing followers/content)
2. Use Facebook Business Suite System User token — viable future option but more complex setup
3. Use Instagram Basic Display API — rejected (doesn't support `instagram_content_publish`)

**Status:** ACTIVE — implemented 2026-03-22, VERIFIED WORKING

---

## D-087 — Instagram Tokens Stored in Payload CMS Instead of n8n Variables
**Decision:**
Store Instagram OAuth tokens (accessToken, userId, expiresAt, connectedAt) in Payload CMS `AutomationSettings` global (`instagramTokens.*` fields) instead of writing to n8n Variables via REST API.

**Reason:**
- The original Step 17 design wrote tokens to n8n Variables via `N8N_API_KEY` + REST API
- The bypass approach (D-086) simplifies the flow — tokens go directly to Payload CMS which is the source of truth
- n8n workflow can read tokens from Payload API or they can be manually copied to n8n Variables
- Reduces dependency on n8n REST API availability during OAuth callback

**Implication:**
n8n `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_USER_ID` Variables must be set manually (or via a sync mechanism) from Payload CMS values. This is a one-time operator action.

**Status:** ACTIVE — implemented 2026-03-22

---

## D-088 — Step 18: Instagram Published Directly from Payload (n8n Bypassed)
**Decision:**
Instagram posts are published directly from `src/lib/channelDispatch.ts` via the Instagram Graph API v21.0, bypassing the n8n `channel-instagram-real.json` workflow entirely.

**Reason:**
- n8n Instagram publish workflow consistently failed with error 100/subcode 33 ("Object with ID 'media' does not exist")
- Root cause: n8n's running workflow used `$vars.INSTAGRAM_USER_ID` (empty — n8n Variables are locked on current VPS plan) → URL path became `/v21.0//media` → Instagram treated literal 'media' as an object ID
- The fix cannot be applied to n8n without upgrading the plan or re-deploying the workflow with credentials hardcoded in the workflow JSON (bad practice)
- Moving publish logic into `channelDispatch.ts` eliminates the VPS dependency, removes n8n as a failure point, and keeps credentials inside Payload CMS (the source of truth)
- Direct publish was already tested manually and confirmed working before this decision

**Implementation:**
- `publishInstagramDirectly(payload, userId, accessToken)` in `channelDispatch.ts` implements the 3-step Graph API flow:
  1. POST `/{userId}/media` (create container)
  2. Wait 2 seconds
  3. POST `/{userId}/media_publish` (publish)
- `dispatchProductToChannels()` routes instagram to this function when tokens available; falls back to n8n webhook if no tokens (e.g. during development/testing)
- `buildInstagramCaption()` mirrors the n8n caption node exactly
- n8n workflow file preserved in repo for reference; `N8N_CHANNEL_INSTAGRAM_WEBHOOK` env var still read as fallback

**Verified:** 2026-03-22 — post ID `18115629052647099` on `@uygunayakkabi342026`, result: `{ mode: "direct", dispatched: true, success: true }`

**Status:** ACTIVE — implemented + verified 2026-03-22

---

## D-089 — Step 19: Facebook Page Published Directly from Payload (Graph API)
**Decision:**
Facebook Page posts are published directly from `src/lib/channelDispatch.ts` via the Facebook Graph API v21.0, using the same user token as Instagram but exchanged for a Page Access Token first.

**Reason:**
- Same architecture as Instagram direct publish (D-088) — keeps all channel publishing inside Payload, no n8n dependency
- `pages_manage_posts` scope required; obtained via Business Login OAuth
- Page token exchange is required because posting to `/{pageId}/photos` with only a user token fails with error 200 "not allowed to publish to other users' timelines"

**Key Discovery — NPE Page ID:**
The UygunAyakkabı Facebook Page is a New Pages Experience (NPE) page with two numeric IDs:
- `61576525131424` — the profile.php-style "entity ID" visible in Facebook URLs. Graph API returns error 100/33 for this ID.
- `1040379692491003` — the internal legacy "Page ID" shown in ad center URLs. This is the correct Graph API page ID.
The two IDs redirect to each other in the browser but behave differently in the Graph API. `INSTAGRAM_PAGE_ID` env var updated to `1040379692491003`.

**Implementation:**
- `publishFacebookDirectly(payload, pageId, userAccessToken)` in `channelDispatch.ts`:
  1. GET `/{pageId}?fields=access_token,name,id` with user token → Page Access Token
  2. POST `/{pageId}/photos?url=...&message=...&access_token={pageToken}&published=true`
  - NPE fallback: if step 1 returns error 100/33, uses user token directly (for future NPE pages)
- `dispatchProductToChannels()` routes facebook channel when `instagramTokens.facebookPageId` + `accessToken` present and valid image URL exists
- `Products.ts` injects `process.env.INSTAGRAM_PAGE_ID` into `settings.instagramTokens.facebookPageId` (env var, not Payload schema field — avoids D-077 Neon migration risk)
- `pages_manage_posts` added to OAuth scope in `initiate/route.ts`

**Verified:** 2026-03-22 — facebookPostId `122093848160884171`, pageId `1040379692491003`, `tokenMode: "page-token"`, `{ mode: "direct", dispatched: true, success: true }`

**Status:** ACTIVE — implemented + verified 2026-03-22

---

## D-096 — Step 22: Telegram Bot Replaces OpenClaw/n8n for Product Intake
**Decision:**
Product intake via Telegram photo is handled directly by `src/app/api/telegram/route.ts` (a Next.js route deployed on Vercel), completely replacing the OpenClaw → n8n → Payload webhook chain used previously.

**Reason:**
- The OpenClaw/n8n pipeline added 2 network hops and external VPS dependency for a simple photo-to-product operation
- Telegram webhooks can be registered directly pointing at the Vercel app
- Payload CMS operations (media upload, product create) are native to the Vercel deployment
- This removes the VPS as a critical dependency for core product intake

**Implementation:**
- `POST /api/telegram` receives all Telegram updates (webhook from Telegram's servers)
- Validates `X-Telegram-Bot-Api-Secret-Token` header against `TELEGRAM_WEBHOOK_SECRET` env var
- On photo message: downloads from Telegram → uploads to Vercel Blob → creates Media document → creates Product document
- On `#gorsel` command: creates `ImageGenerationJob`, enqueues Payload Jobs task

**Security:**
- Webhook registered with `secret_token` parameter matching `TELEGRAM_WEBHOOK_SECRET`
- All requests without matching header return 401

**Operator Access:**
- Allowlist enforced — only authorized Telegram user IDs can trigger operations

**Status:** ACTIVE — implemented + verified 2026-03-28

---

## D-097 — Telegram Group Privacy Mode Must Be OFF for Bot to Receive Photos
**Decision:**
The Telegram bot's **Group Privacy Mode must be disabled** via BotFather for the bot to receive plain photo messages (messages without @mention) in group chats.

**Reason:**
- By default, Telegram bots in groups only receive messages that @mention them
- With privacy mode ON, the bot received @mentions but silently dropped plain photos
- Privacy mode is disabled per-bot in BotFather: `/mybots → [Bot] → Bot Settings → Group Privacy → Turn Off`

**Verification:** Confirmed via BotFather web UI — "Group Privacy is disabled".

**Important:** This is a BotFather setting, not a code setting. It persists until explicitly changed.

**Status:** ACTIVE — verified OFF 2026-03-28

---

## D-098 — Telegram Webhook Secret Token Must Be Registered, Not Just Set in Env
**Decision:**
When `TELEGRAM_WEBHOOK_SECRET` is set in Vercel env vars, the webhook **must also be registered** with Telegram using the same `secret_token` value. Setting the env var alone is not sufficient.

**Reason:**
- The route validates `X-Telegram-Bot-Api-Secret-Token` header on every request
- If webhook was registered without `secret_token`, Telegram sends no header → all requests fail 401
- Webhook must be re-registered after any change to `TELEGRAM_WEBHOOK_SECRET`

**Registration command:**
```js
fetch('https://api.telegram.org/bot{TOKEN}/setWebhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://www.uygunayakkabi.com/api/telegram',
    allowed_updates: ['message', 'callback_query'],
    secret_token: '{TELEGRAM_WEBHOOK_SECRET_VALUE}'
  })
})
```

**Status:** ACTIVE — verified 2026-03-28

---

## D-099 — Price Field Validation: Source Bypass Includes 'telegram'
**Decision:**
The `validate()` function on the price field in `Products.ts` must bypass validation for products created with `source === 'telegram'` in addition to `n8n` and `automation`.

**Reason:**
- Telegram-created products are draft products — price is intentionally empty at creation time
- Without the bypass, saving any Telegram-sourced product triggered "Satış Fiyatı zorunludur" and aborted the save
- The validate bypass is the correct pattern already established for n8n and automation sources

**Implementation:**
```typescript
if (data?.source === 'n8n' || data?.source === 'automation' || data?.source === 'telegram') {
  return true
}
```

**Status:** ACTIVE — implemented + verified 2026-03-28

---

## D-100 — Gemini Image Generation Models Are Text-to-Image Only (No Image Editing)
**Decision:**
All currently available Gemini image generation models (`gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview`) are **text-to-image only**. They do not process image inputs — passing `inlineData` in the request parts is silently ignored.

**Reason / Evidence:**
- Tested all three models: asked to identify color of a test input image → all returned wrong/generic answer
- Generated images were completely different products (random white sneakers) regardless of reference image sent
- `gemini-2.0-flash-exp-image-generation` (the old image editing model) is deprecated — returns 404, not in models API list
- No currently available Gemini model supports true image-to-image editing via `generateContent` + `inlineData`

**Verified Model List (2026-03-28, from Gemini models API):**
- `gemini-2.5-flash-image` (Nano Banana) — text-to-image ✅, image input ❌
- `gemini-3.1-flash-image-preview` (Nano Banana 2) — text-to-image ✅, image input ❌
- `gemini-3-pro-image-preview` (Nano Banana Pro) — text-to-image ✅, image input ❌
- `imagen-4.0-*` — text-to-image via `/predict` endpoint, no image input

**Current model for generation:** `gemini-2.5-flash-image` via `GEMINI_FLASH_MODEL` env var.

**Implication:** Do not attempt to pass reference images to image generation models. They will be ignored silently.

**Status:** ACTIVE — verified 2026-03-28

---

## D-101 — AI Image Generation: Vision Analysis → Text Prompt Pipeline
**Decision:**
Product image generation uses a **two-step pipeline**:
1. **Vision step**: `gemini-2.5-flash` (text+vision model) analyzes the product reference photo and produces a specific English description (e.g., "camel brown suede Chelsea boot with stacked block heel and almond toe")
2. **Generation step**: `gemini-2.5-flash-image` (text-to-image model) generates 5 concept images using that description as the prompt basis

**Reason:**
- Image editing models don't exist in the current Gemini lineup (D-094)
- Without vision analysis, text prompts default to generic product descriptions → random generic shoes
- Gemini Vision (`gemini-2.5-flash`) correctly identifies product type, color, material, design features from photos
- Injecting the vision description into generation prompts gives the text-to-image model enough specificity to produce consistent, product-accurate outputs

**Implementation:**
- `describeProductImage()` in `src/jobs/imageGenTask.ts` — calls `gemini-2.5-flash` with the product photo
- Result stored as `productContext.visualDescription`
- `buildPromptSet()` in `src/lib/imagePromptBuilder.ts` — uses `visualDescription` as the primary descriptor (overrides title/brand/color fields)
- `buildBase()` returns `visualDescription` when set, falls back to metadata fields otherwise
- Reference image is NOT passed to `generateByMode()` (D-094)

**Log output to confirm it's working:**
```
[imageGenTask] Vision description: "black mesh low-top sneaker with..."
[imageGenTask] productContext enriched with visualDescription
```

**Status:** ACTIVE — implemented + deployed 2026-03-28

---

## D-096 — Image Editing via /v1/images/edits (Pipeline A)
**Decision:**
Use OpenAI `/v1/images/edits` endpoint with `gpt-image-1` and `image[]` field name for true image editing that preserves the exact product from the original Telegram photo.

**Reason:**
- Text-to-image (Pipeline B) generates shoes that look similar but NOT the exact product — colors, design details change
- User explicitly requested generated images must match the EXACT product sent
- OpenAI Responses API (`/v1/responses` with `image_generation` tool) was tested and rejected: it generates loosely inspired new images, NOT true edits
- `/v1/images/edits` with correct `image[]` field (not `image`) is the proper gpt-image-1 editing endpoint

**Alternatives rejected:**
1. Responses API — produces new images, doesn't preserve product (TESTED & FAILED)
2. dall-e-2 via `/v1/images/edits` — lower quality, older model
3. Gemini image models — all text-to-image only, ignore `inlineData` inputs

**Implementation:**
- `callGPTImageEdit()` in `src/lib/imageProviders.ts` — FormData with `image[]` field
- `generateByEditing()` orchestrates 5 parallel editing calls
- Pipeline routing in `imageGenTask.ts`: if `referenceImage` exists → Pipeline A, else → Pipeline B
- Pre-processing: sharp converts to PNG 1024x1024 before sending

**Key technical detail:**
gpt-image-1 uses `image[]` (array field name) in multipart form data. Using bare `image` returns HTTP 400 "Value must be 'dall-e-2'".

**Status:** DEPLOYED (commit `196c419` 2026-03-28) — awaiting test verification

---

## D-097 — OPENAI_API_KEY Rotation (2026-03-28)
**Decision:**
Rotated OPENAI_API_KEY in Vercel env vars after old key returned 401.

**Reason:**
Previous key was expired/unauthorized for gpt-image-1. New key generated from OpenAI dashboard.

**Implementation:**
Updated via Vercel internal API: `PATCH /api/v10/projects/uygunayakkabi-store/env/764gO7z42RX0uvI0`

**Status:** ACTIVE

---

## D-102 — Phase 1 Schema Foundation: Workflow + Merchandising + BotEvents (2026-04-03)

**Decision:**
Add workflow state tracking, merchandising fields, HomepageMerchandisingSettings global, and BotEvents collection as additive schema foundation for autonomous bot orchestration and homepage merchandising.

**Reason:**
The project needs structured workflow state to track products through the autonomous bot pipeline (uygunops → geobot → mentix → system). Additionally, homepage merchandising needs dedicated fields (Yeni, Popüler, Çok Satanlar, Fırsatlar, İndirimli) and a centralized settings global. BotEvents provides the event-tracking backbone for bot-to-bot communication.

**Implementation:**
Phase 1 is schema-only — no query engine, no Telegram commands, no automation logic.

Files changed:
- `src/collections/Products.ts` — added `workflow` group (10 fields) and `merchandising` group (12 fields)
- `src/globals/HomepageMerchandisingSettings.ts` — new global (section toggles, item limits, timing, scoring, behavior)
- `src/collections/BotEvents.ts` — new collection (eventType, product, sourceBot, targetBot, status, payload, notes, processedAt)
- `payload.config.ts` — registered BotEvents collection and HomepageMerchandisingSettings global

**DB/Schema Push Notes:**
- All new fields have safe defaults — existing records unaffected
- `push: true` in dev will auto-create columns locally
- Production (Neon): columns must be manually created via SQL after deploy
- BotEvents creates a new `bot_events` table
- HomepageMerchandisingSettings creates a new `homepage_merchandising_settings` table
- Both need `payload_locked_documents_rels` column entries after deploy

**Compatibility:** Fully backward compatible — no existing fields modified, removed, or renamed.

**Status:** ACTIVE

---

## D-103 — Phase 2 Merchandising Logic: Homepage Section Helpers (2026-04-04)

**Decision:**
Create `src/lib/merchandising.ts` as a pure, stateless helper library for all homepage merchandising section membership resolution, scoring, and new-window calculation.

**Reason:**
Phase 1 laid the schema foundation. Phase 2 adds the logic layer that determines which products appear in which homepage section. This must be reusable across future API routes, Telegram commands, and cron sync jobs.

**Implementation:**

File: `src/lib/merchandising.ts`

Central eligibility gate (`isHomepageEligible`):
- status === 'active'
- workflow.stockState !== 'sold_out'
- workflow.sellable !== false (null = legacy safe fallback to active)
- merchandising.homepageHidden !== true

Section rules:
- Yeni: eligible + publishedAt exists + now <= newUntil (or publishedAt + newWindowDays fallback)
- Popüler: eligible + manualPopular === true
- Çok Satanlar: eligible + not excluded + (pinned OR score >= minimum)
- Fırsatlar: eligible + manualDeal === true
- İndirimli: eligible + originalPrice > price

Scoring formula:
  score = totalUnitsSold + (recentUnitsSold7d × weight7d) + (recentUnitsSold30d × weight30d)

New window: calculateNewWindow() returns publishedAt + newUntil (default 7 days)

Membership resolution: getXxxProducts() functions apply section toggles, limits, and sort order.

Also changed: `HomepageMerchandisingSettings.timing.newWindowDays` default from 14 → 7 per business requirement.

**Legacy compatibility:**
Products with null workflow.sellable fall back to status === 'active'. No backfill migration required.

**Phase 3 dependencies:**
- Homepage API route to call resolveHomepageSections()
- Merchandising sync cron to update bestSellerScore on products
- Storefront UI to render the sections
- Telegram commands for manual merchandising flags

**Status:** ACTIVE

---

## D-104 — Phase 3 Story Pipeline Foundation (2026-04-04)

**Decision:**
Implement non-blocking Telegram Story pipeline foundation: schema, collection, target model, dispatch helpers. WhatsApp story publishing treated as blocked_officially.

**Reason:**
Stories are a key marketing channel. The pipeline must be decoupled from product publish — story failure must never block a product from going live. Telegram is the primary supported target. WhatsApp Business API has no official story/status endpoint.

**Implementation:**

Schema changes:
- Products.storySettings group (6 fields): enabled, autoOnPublish, skipApproval, captionMode, primaryAsset, storyTargets
- Products.sourceMeta extended (8 fields): storyStatus, storyQueuedAt, storyPublishedAt, storyTargetsPublished, storyTargetsFailed, lastStoryError, lastStoryAsset, lastStoryCaption
- AutomationSettings.storyTargets: configurable array with per-target config (id, platform, label, enabled, mode, businessConnectionId, defaultAudience, defaultLink, defaultCaptionTemplate, priority, requiresApproval)

New collection:
- StoryJobs (slug: story-jobs) — 12 fields tracking story job lifecycle through queued → awaiting_asset → awaiting_approval → approved → publishing → published pipeline

New libs:
- src/lib/storyTargets.ts — target resolution, blocked platform detection, product-global target merging
- src/lib/storyDispatch.ts — non-blocking dispatch: asset resolution (priority: main image → generative → awaiting_asset), caption generation (title/price/sizes/CTA), StoryJob creation, sourceMeta tracking

**Non-blocking architecture:**
- dispatchStory() catches all errors internally, never throws
- Story failure results are logged but do not interrupt caller
- safeUpdateSourceMeta() uses isDispatchUpdate context flag (same pattern as channel dispatch)
- blocked_officially status for WhatsApp — not counted as system failure

**WhatsApp policy:**
- WhatsApp targets can exist in config model (for future-proofing)
- Always default to disabled
- Logic treats whatsapp platform as blocked_officially
- No real WhatsApp story API call will ever be attempted

**Compatibility:** Fully additive — no existing fields modified, no hooks changed, no publish flow altered.

**Status:** ACTIVE

---

## D-105 — Phase 4 Story Pipeline Wiring (2026-04-04)

**Decision:**
Wire story dispatch into Products afterChange hook (non-blocking). Add Telegram operator commands for story management. CRITICAL: No fake Telegram story publishing — Bot API does not support stories; all statuses must remain truthful.

**Reason:**
Phase 3 laid the foundation (schema, collection, dispatch helpers). Phase 4 integrates these into the live product flow and provides operator controls. The key constraint: Telegram Bot API cannot publish stories — only Business API connections can. Rather than faking success with sendPhoto/sendVideo, the system keeps statuses truthful (queued, approved, awaiting_approval) and documents the limitation clearly for operators.

**Implementation:**

Products.ts afterChange hook (after channel dispatch):
- Non-blocking story trigger inside `isStatusTransition` check
- Calls `shouldAutoTriggerStory()` → `dispatchStory()`
- Wrapped in try/catch — failure logged but never thrown
- Uses `isDispatchUpdate` context flag pattern (same as channel dispatch)

Telegram route.ts — New text commands:
- `/story {productId}` — queue story with inline approval keyboard
- `/restory {productId}` — retry failed story job
- `/targets {productId}` — show product story target config + global targets
- `/approve_story {jobId}` — approve pending story
- `/reject_story {jobId}` — reject pending story

Telegram route.ts — New callback query handlers:
- `storyapprove:{jobId}` — update StoryJob to approved, note Telegram Bot API limitation
- `storyreject:{jobId}` — update StoryJob to failed with rejection reason
- `storyretry:{jobId}` — reset StoryJob to queued for retry

All commands include truthful "Telegram Bot API henüz story yayını desteklemiyor" note.

**No fake publish rule:**
- sendPhoto/sendVideo must NOT be used to simulate story publish
- Job status transitions: queued → awaiting_approval → approved (stops here until real API support)
- Never set status to "published" without actual confirmed story publish
- WhatsApp remains blocked_officially (from D-104)

**Backward compatibility:**
- Products without storySettings (null/undefined) are skipped by shouldAutoTriggerStory()
- Existing afterChange hook flow unchanged — story trigger appended after channel dispatch
- No existing fields modified

**Status:** ACTIVE

---

## D-106 — Phase 5 Product Confirmation Wizard (2026-04-04)

**Decision:**
Implement Telegram-based product confirmation wizard that guides operators through completing missing commercial fields before marking a product as confirmed.

**Reason:**
Products created via Telegram photo intake often lack commercial data (price, sizes, stock, category). Before any autonomous content generation or publishing logic can run, the product must be structurally confirmed by an operator. The confirmation wizard provides a guided, practical flow without requiring the operator to switch to the admin panel.

**Implementation:**

New file: `src/lib/confirmationWizard.ts`
- Pure logic library — no side effects except through explicit `applyConfirmation()` call
- `checkConfirmationFields(product)` — evaluates required (category, price, sizes, stock, channelTargets) and optional (brand, productType) fields
- `getNextWizardStep(product, collected)` — state machine skips already-present fields
- Input parsers: `parsePrice()` (₺/TL/number), `parseSizes()` (range "38-44", CSV, space-separated), `parseStockNumber()`, `parseChannelTargets()`
- `formatConfirmationSummary()` — structured summary with all fields + visual readiness
- `applyConfirmation()` — updates product, creates variants, sets workflow state, emits BotEvent
- In-memory wizard sessions (Map keyed by chatId, 30-minute auto-expiry)

Telegram route changes:
- Callback handlers: `wz_cat`, `wz_tgt` (multi-select with toggle), `wz_confirm`, `wz_cancel`
- Text input interceptor: intercepts plain text when wizard expects price/sizes/stock input
- Commands: `/confirm {id}`, `/confirm_cancel`, `/confirm {id} force`
- Product creation message now shows `/confirm {id}` hint

State transitions on confirmation:
- `workflow.confirmationStatus` → `confirmed`
- `workflow.productConfirmedAt` → current ISO datetime
- `workflow.lastHandledByBot` → `uygunops`
- `workflow.workflowStatus` → `confirmed` (only if currently in draft/visual_pending/visual_ready/confirmation_pending)

BotEvent emitted:
- eventType: `product.confirmed`
- sourceBot: `uygunops`
- status: `processed`
- payload: { fieldsCollected, variantsCreated, confirmedAt, previousWorkflowStatus }

**Compatibility:**
- Fully additive — no existing hooks, fields, or flows modified
- Products with null workflow fields are safely handled (null checks throughout)
- Legacy products can be confirmed via `/confirm {id}` without side effects on other systems
- Wizard text interceptor only fires for plain text (not /, #, or STOCK commands)
- One wizard session per chat — starting a new `/confirm` clears any previous session

**What this phase does NOT include:**
- Geobot content generation (next phase)
- Mentix audit layer (future phase)
- Full soldout automation (future phase)
- Auto-triggering confirmation from product creation (operator-initiated only)

**Status:** ACTIVE

---

## D-107 — Phase 6 Geobot Content Pack Foundation (2026-04-04)

**Decision:**
Add content schema (commercePack + discoveryPack) to Products, create content lifecycle helper library, wire auto-trigger after product confirmation, add Telegram content commands. Geobot AI runtime is NOT yet connected — all statuses remain truthful.

**Reason:**
Confirmed products need structured content before publishing. The system must track two content layers: channel-specific commerce copy (website, Instagram, X, Facebook, Shopier) and long-form discovery/SEO content (article, meta, FAQ, keywords). This phase builds the foundation so that when Geobot runtime is ready, it has a clean schema, state model, and trigger path to work with.

**Implementation:**

Products.ts — new `content` group (after merchandising, before legacy fields):
- `content.commercePack` (group): websiteDescription (textarea), instagramCaption (textarea), xPost (textarea), facebookCopy (textarea), shopierCopy (textarea), highlights (json), confidence (number, readOnly), warnings (json, readOnly), generatedAt (date, readOnly)
- `content.discoveryPack` (group): articleTitle (text), articleBody (textarea), metaTitle (text), metaDescription (textarea), faq (json), keywordEntities (json), internalLinkTargets (json), confidence (number, readOnly), warnings (json, readOnly), generatedAt (date, readOnly)
- `content.linkedBlogPost` (relationship → blog-posts)
- `content.contentGenerationSource` (select: none/geobot/manual/import, readOnly)
- `content.lastContentGenerationAt` (date, readOnly)

New file: `src/lib/contentPack.ts`
- Types: CommercePack, DiscoveryPack, ContentGroup, ContentProduct, ContentStatus, ContentReadinessResult, ContentTriggerResult
- Pack creation: createEmptyCommercePack(), createEmptyDiscoveryPack()
- Readiness: checkCommercePackComplete(), checkDiscoveryPackComplete(), checkContentReadiness()
- Eligibility: isContentEligible(), shouldAutoTriggerContent()
- Trigger: triggerContentGeneration() — sets content_pending, emits content.requested
- Status updates: markCommerceGenerated(), markDiscoveryGenerated(), markContentFailed(), emitContentReady()
- Telegram: formatContentStatusMessage()

confirmationWizard.ts — applyConfirmation() extended:
- After BotEvent(product.confirmed), non-blocking call to triggerContentGeneration()
- Wrapped in try/catch — content trigger failure never blocks confirmation

Telegram route.ts:
- `/content {id}` — show content status with pack completeness
- `/content {id} trigger` — manually trigger content generation
- Confirmation success message updated with content trigger note

BotEvents emitted:
- content.requested (sourceBot=uygunops, targetBot=geobot, status=pending)
- content.commerce_generated (sourceBot=geobot, status=processed) — future
- content.discovery_generated (sourceBot=geobot, status=processed) — future
- content.ready (sourceBot=geobot, status=processed) — future
- content.failed (sourceBot=geobot, status=failed) — future

State transition model:
- workflowStatus: confirmed → content_pending (on trigger)
- contentStatus: pending → commerce_generated → ready (or pending → discovery_generated → ready)
- workflowStatus: content_pending → content_ready (when contentStatus=ready)

**No fake generation rule:**
- triggerContentGeneration() only sets states and emits events
- Content is never marked as generated without real output
- Geobot runtime will be wired in Phase 7

**Backward compatibility:**
- Products without content group (null) are fully safe — all checks handle null/undefined
- Existing contentStatus enum (Phase 1) is reused — no schema change needed
- Auto-trigger only fires for confirmed products with contentStatus=pending
- No existing hooks, fields, or flows modified

**What Phase 7 will build:**
- Geobot AI runtime integration (Gemini/Claude content generation)
- Listen for content.requested BotEvents
- Generate commerce pack content with product context
- Generate discovery pack content with SEO optimization
- Create/link BlogPost from discovery pack
- Mentix audit layer for content quality

**Status:** ACTIVE

---

## D-108 — Phase 7 Geobot AI Runtime Wiring (2026-04-04)

**Decision:**
Wire real AI content generation into the content pack foundation using Gemini 2.5 Flash. Commerce and discovery packs are generated from confirmed product data. BlogPost auto-created from discovery content.

**Reason:**
Phase 6 built the schema and trigger foundation but deferred actual AI generation. Phase 7 completes the pipeline by calling Gemini to produce real, truthful content. The same API key and fetch pattern used for image generation vision tasks is reused for text generation.

**Implementation:**

New file: `src/lib/geobotRuntime.ts`
- `callGeminiText(prompt)` — raw fetch to Gemini REST API (gemini-2.5-flash, responseMimeType=application/json, maxOutputTokens=4096, temperature=0.7)
- `buildProductContext(product)` — structured Turkish product summary from confirmed data
- `generateCommercePack(product)` — prompt instructs per-channel differentiation (website 200-400ch, Instagram with hashtags, X max 250ch, Facebook conversational, Shopier practical). Returns JSON with confidence scoring.
- `generateDiscoveryPack(product)` — prompt instructs 800-1500 word article with ## sections, FAQ (3+ items), keyword cluster, internal link targets. Returns JSON with length/quality validation.
- `generateFullContentPack(product)` — runs commerce then discovery sequentially. Partial success allowed.

Updated: `src/lib/contentPack.ts` — `triggerContentGeneration()`:
- Phase 6 version: set pending + emit event only
- Phase 7 version: set pending → call geobotRuntime → write results → update states → emit events → create BlogPost
- Brand name resolved from relationship ID before passing to prompts
- Variants resolved from IDs if not populated
- If GEMINI_API_KEY missing: stays pending (graceful degradation, not failure)
- On API error: contentStatus=failed, error logged, BotEvent(content.failed) emitted

BlogPost creation:
- Auto-created from discoveryPack.articleTitle + articleBody
- Lexical richText format (root → paragraph → text node)
- SEO group populated (metaTitle, metaDescription, keywords from keywordEntities)
- status=draft (operator review before publish)
- source=ai, author=Geobot
- relatedProducts linked
- slug auto-generated with Turkish char normalization + product ID suffix for uniqueness
- Linked back to product via content.linkedBlogPost

Updated: Telegram `/content {id} trigger` response — shows real generation results with contentStatus emoji

**Truthfulness guarantee:**
- Content is never marked as generated without real Gemini API output
- If one pack fails, only the succeeded pack's status is reflected
- contentStatus=ready requires BOTH packs to have real content
- Failed API calls result in contentStatus=failed, not fake success
- GEMINI_API_KEY absence results in contentStatus=pending, not failure

**BotEvents trail (for a successful full generation):**
1. content.requested (sourceBot=uygunops, targetBot=geobot, status=pending)
2. content.commerce_generated (sourceBot=geobot, status=processed, confidence=N%)
3. content.discovery_generated (sourceBot=geobot, status=processed, confidence=N%)
4. content.ready (sourceBot=geobot, status=processed)

**Backward compatibility:**
- Products without content group (null) are safely skipped
- Products with GEMINI_API_KEY missing get pending status, not failure
- Existing confirmation wizard unchanged — just calls updated triggerContentGeneration
- No existing hooks, fields, or collections modified
- BlogPost creation is non-blocking — failure doesn't affect content status

**What Phase 8 will build:**
- Mentix audit layer for content quality review
- Content preview in Telegram (operator can review before publish)
- auditStatus flow: content_ready → audit_pending → approved/needs_revision
- Content update/regeneration commands
- Publish-ready automation after audit approval

**Status:** ACTIVE

## D-109 — Phase 8 Mentix Audit + Content Review Layer (2026-04-04)

**Decision:**
Add a 4-dimension audit layer that evaluates products before they become publish-ready. Audit covers visual, commerce, discovery, and overall dimensions. Auto-triggered after content generation completes (contentStatus=ready). Operator can also trigger manually via `/audit` Telegram command.

**Reason:**
Content generated by Geobot AI needs quality review before products are published to channels. This ensures visual completeness, commerce copy quality, discovery content depth, and overall product readiness are validated. The audit bridges the gap between content_ready and publish_ready in the workflow progression.

**Implementation:**

New fields on Products: `auditResult` group (9 fields):
- `visualAudit` (select: not_reviewed/pass/pass_with_warning/fail)
- `commerceAudit` (select: same)
- `discoveryAudit` (select: same)
- `overallResult` (select: not_reviewed/approved/approved_with_warning/needs_revision/failed)
- `approvedForPublish` (checkbox, readOnly, default false)
- `warnings` (json, readOnly)
- `revisionNotes` (textarea)
- `auditedAt` (date, readOnly)
- `auditedByBot` (select: mentix/operator/system, readOnly)

New file: `src/lib/mentixAudit.ts` (~340 lines)
- `isAuditEligible(product)` — confirmed + content not pending
- `shouldAutoTriggerAudit(product)` — eligible + contentStatus=ready + not already approved
- `auditVisual(product)` — checks images/generativeGallery exist, visualStatus not rejected
- `auditCommerce(product)` — checks websiteDescription/instagramCaption/shopierCopy, confidence >= 50
- `auditDiscovery(product)` — checks article, FAQ >= 2, keywords >= 3, blog linked, confidence >= 50
- `runFullAudit(product)` — runs all 4 dimensions, overall result
- `triggerAudit(payload, product, source, req)` — sets audit_pending, runs audit, writes results, emits BotEvents
- `formatAuditStatusMessage(product)` — Telegram audit status display

Updated: `src/lib/contentPack.ts` — `triggerContentGeneration()`:
- After emitContentReady (contentStatus=ready): non-blocking auto-trigger audit via dynamic import
- Re-fetches product with depth=1 for accurate audit
- shouldAutoTriggerAudit check prevents duplicate runs

New Telegram command: `/audit {id}` — show audit status, `/audit {id} run` — force run audit

**BotEvents trail (for auto-triggered audit after content.ready):**
1. audit.requested (sourceBot=system/operator, status=pending)
2. audit.started (sourceBot=mentix, status=pending)
3. audit.approved / audit.approved_with_warning / audit.needs_revision / audit.failed (sourceBot=mentix, status=processed)

**State transitions:**
- workflow.auditStatus: not_required → pending → approved/approved_with_warning/needs_revision/failed
- workflow.workflowStatus: content_ready → audit_pending → publish_ready (on approval)
- auditResult.approvedForPublish = true ONLY when overallResult is approved or approved_with_warning

**Backward compatibility:**
- Products without auditResult fields (null) safely pass
- Audit auto-trigger is non-blocking — failure doesn't affect content status
- Dynamic import prevents module load errors from breaking content generation
- No existing hooks, fields, or collections modified
- Existing workflow.auditStatus enum (Phase 1) reused

**Status:** ACTIVE

## D-110 — Phase 9 Order / Stock / Soldout Autonomy (2026-04-04)

**Decision:**
Centralize stock-change reaction logic so the system automatically transitions products between sellable/soldout states when inventory changes. Single entry point (`reactToStockChange()`) called from all stock-change sources.

**Reason:**
Stock decrements happened in two places (Shopier webhook, Telegram STOCK command) but neither triggered any automated state transitions. Products could reach zero stock without being marked soldout, remaining in merchandising sections despite having no inventory. This phase closes that gap with a truthful, deterministic reaction layer.

**Implementation:**

New file: `src/lib/stockReaction.ts` (~350 lines)
- `getStockSnapshot(payload, productId)` — computes effective stock from variant-level stock (preferred) + product-level stockQuantity fallback
- `determineStockState(effectiveStock, previousState)` — state machine: in_stock / low_stock / sold_out / restocked
- `computeTransition(product, snapshot)` — detects soldout/restock transitions
- `reactToStockChange(payload, productOrId, source, req)` — central reaction:
  1. Computes stock snapshot
  2. Determines state transition
  3. Updates workflow.stockState, workflow.sellable, workflow.workflowStatus, product.status
  4. Syncs product-level stockQuantity from variant total (if variants exist)
  5. Emits BotEvents: stock.changed, product.soldout, product.restocked
- `formatStockStatusMessage(product, snapshot)` — Telegram display with per-variant breakdown
- LOW_STOCK_THRESHOLD = 3 (products with ≤ 3 total stock get low_stock warning)

Updated: `src/app/api/webhooks/shopier/route.ts`
- `decrementStockForOrder()` now returns array of affected product IDs
- After decrement, calls `reactToStockChange()` for each affected product (non-blocking)
- Source = 'shopier'

Updated: `src/app/api/telegram/route.ts`
- After STOCK SKU command processes variant updates, calls `reactToStockChange()`
- Response includes soldout/restock/low-stock notifications inline
- New `/stok {id}` command: shows full stock status with variant breakdown

**Merchandising integration:**
- `isHomepageEligible()` in merchandising.ts already checks:
  - `status !== 'active'` → excludes soldout
  - `workflow.stockState === 'sold_out'` → excludes
  - `workflow.sellable === false` → excludes
- When reactToStockChange sets sold_out state → product excluded from ALL 5 sections (Yeni, Popüler, Çok Satanlar, Fırsatlar, İndirimli)
- When restocked → product re-eligible automatically
- No changes needed to merchandising.ts — Phase 2 already built the right gates

**Soldout behavior:**
- product.status = 'soldout' — storefront shows "Tükendi" badge
- workflow.workflowStatus = 'soldout'
- workflow.stockState = 'sold_out'
- workflow.sellable = false
- Product page stays live (visible but not sellable)
- Excluded from all homepage merchandising sections
- Product NOT deleted

**Restock behavior:**
- product.status = 'active'
- workflow.workflowStatus = 'active'
- workflow.stockState = in_stock or low_stock (settled immediately)
- workflow.sellable = true
- Product re-eligible for merchandising sections
- If within newUntil window, can re-enter Yeni section

**BotEvents:**
1. stock.changed — emitted on EVERY stock change (audit trail)
2. product.soldout — emitted when stock hits zero
3. product.restocked — emitted when stock goes from zero → positive

**Truthfulness guarantees:**
- Never marks sold_out unless effective stock = 0
- Never marks restocked unless previous state was sold_out
- Uses isDispatchUpdate context flag to prevent re-trigger loops
- 'restocked' is transitional — settled immediately to in_stock/low_stock

**Backward compatibility:**
- Products without workflow fields (legacy null) treated as in_stock/sellable
- Shopier flow unchanged — stock decrement logic identical, reaction added after
- Telegram STOCK command unchanged — variant updates work same, reaction added after
- No admin UI changes required
- No new collections or schema fields

**What Phase 10 should build:**
- Website order flow stock decrement integration
- Shopier stock sync-back (inbound)
- Admin UI stock edit hook
- Homepage integration: use merchandising.ts resolveHomepageSections() in page.tsx
- Low stock Telegram alerts
- Refund → stock increment

**Status:** ACTIVE

## D-111 — Phase 10 Website Order + Homepage Integration + Stock Recovery (2026-04-04)

**Decision:**
Complete the stock reaction coverage by integrating all remaining stock-change sources, wiring homepage to the merchandising engine, adding refund stock restoration, and building low-stock operator alerts.

**Reason:**
Phase 9 centralized stock reaction but only covered Shopier webhook and Telegram stock commands. Admin stock edits in Payload, non-Shopier orders, and refunds were not triggering stock reactions. The homepage was also rendering raw active products without applying merchandising filters, meaning soldout products could theoretically appear.

**Implementation:**

**A) Homepage Merchandising Integration**
Updated: `src/app/(app)/page.tsx`
- Imports `resolveHomepageSections()` and `isHomepageEligible()` from merchandising.ts
- Fetches both active AND soldout products (status in ['active', 'soldout'])
- Fetches HomepageMerchandisingSettings global for section toggles/limits
- Applies `isHomepageEligible()` server-side — filters out soldout, non-sellable, hidden products
- Calls `resolveHomepageSections()` for section computation (logged for observability)
- Passes only eligible products to UygunApp client component
- Soldout products never reach the client → automatic merchandising exclusion

**B) Variants afterChange Hook**
Updated: `src/collections/Variants.ts`
- New `afterChange` hook triggers `reactToStockChange()` when variant stock changes
- Only fires on update when stock actually changed (prevStock !== newStock)
- Uses `isDispatchUpdate` context flag to prevent infinite loops
- Source = 'admin' (covers Payload admin panel edits)
- Non-blocking — errors logged but never thrown

**C) Orders afterChange Hook**
Updated: `src/collections/Orders.ts`
- New `afterChange` hook triggers stock decrement on order creation
- Skips Shopier orders (handled in webhook separately)
- Skips dispatch updates (prevents loops)
- Decrements product-level stockQuantity AND variant stock (if size specified)
- Creates InventoryLog entry
- Calls `reactToStockChange()` for soldout/restock detection
- Covers: website orders, phone orders, telegram orders, manual admin orders

**D) Refund Stock Restoration**
Updated: `src/app/api/webhooks/shopier/route.ts` — `handleRefundRequested()`
- After marking order as cancelled: restores product-level stockQuantity
- Restores variant stock if size is specified on the order
- Creates InventoryLog with positive change (reason: "Shopier iade: {refundId}")
- Calls `reactToStockChange()` — may trigger product.restocked event
- Non-blocking — errors logged but order cancellation not blocked

**E) Low-Stock Telegram Alerts**
Updated: `src/lib/stockReaction.ts`
- New `sendStockAlertToTelegram()` function
- Fires on: soldout transition, restock transition, low_stock state
- Sends HTML-formatted Telegram message with: product title, stock details, variant breakdown, source
- Uses TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID env vars (same as existing bot)
- Non-blocking — alert failure never blocks stock reaction

**Backward compatibility:**
- Homepage: passes only eligible products instead of all active — existing UygunApp client code works unchanged
- Variants hook: only fires on stock change, not on other field edits — safe for existing flows
- Orders hook: skips Shopier source — no double-decrement risk
- Refund: only restores stock if product and quantity exist on order — safe for legacy orders
- All new hooks use isDispatchUpdate context to prevent loops

**What Phase 11 should build:**
- Wire UygunApp client to render merchandising sections (Yeni, Popüler, etc.) from server data
- Shopier stock sync-back (poll Shopier inventory → update local stock)
- Telegram merchandising commands (#yeni, #populer, #deal)
- Merchandising sync cron (periodic bestSellerScore recalculation from order data)
- Website checkout/cart/payment integration (PayTR or equivalent)

**Status:** ACTIVE

---

## D-112 — Phase 11 Homepage Merchandising UI + Telegram Merch Commands (2026-04-04)

**Decision:**
Wire UygunApp client to render real merchandising sections from server-resolved data, and add comprehensive `/merch` Telegram commands for operator-driven merchandising control.

**Reason:**
Phase 10 wired server-side merchandising resolution (resolveHomepageSections + isHomepageEligible) but the client still rendered hardcoded sections. Operators also had no way to manually control merchandising fields (popular, deal, bestseller) without editing Payload admin directly.

**Implementation:**

**A) Server → Client Section Data Flow**
Updated: `src/app/(app)/page.tsx`
- Builds `sectionIds` object after `resolveHomepageSections()` call
- Maps each section (yeni, popular, bestSellers, deals, discounted) to product ID arrays using `db_${p.id}` format
- Passes `sections={sectionIds}` prop to `<App>` component

Updated: `src/app/(app)/UygunApp.d.ts`
- Added `HomepageSections` interface with 5 section arrays (string[])
- Extended `AppProps` with optional `sections?: HomepageSections | null`

**B) Client-Side Merchandising Section Rendering**
Updated: `src/app/(app)/UygunApp.jsx`
- `App` component accepts and forwards `sections` prop to `Home`
- `Home` component resolves server-provided section IDs to product objects via `resolve(ids)` helper
- 5 real merchandising sections rendered: Yeni Ürünler, Popüler, Çok Satanlar, Fırsatlar, İndirimli Ürünler
- Each section has client-side fallback if server data is empty (e.g., yeni falls back to first 8 products)
- Popüler and Fırsatlar sections only render when server provides data (no false content)
- Section order: Yeni → Popüler → Çok Satanlar → Fırsatlar → İndirimli

**C) Telegram /merch Commands**
Updated: `src/app/api/telegram/route.ts`
- `/merch` — help text listing all subcommands
- `/merch preview` — shows all 5 sections with product counts and names
- `/merch status {id}` — shows full merchandising state: flags, section membership, stock, eligibility
- `/merch popular add/remove {id}` — toggles `merchandising.isPopular` field
- `/merch deal add/remove {id}` — toggles `merchandising.isDeal` field
- `/merch bestseller pin/unpin/exclude/include {id}` — controls `merchandising.bestSellerPinned` and `merchandising.excludeFromMerchandising`
- All commands use Payload update with `isDispatchUpdate` context to prevent hook re-triggers
- Section membership computed live via resolveHomepageSections for status display

**Backward compatibility:**
- UygunApp sections prop is optional — null/undefined falls back to client-side filtering (same as before)
- page.tsx passes sectionIds only when merchandising engine returns data
- All /merch commands are new — no existing Telegram commands affected
- Product field updates use existing merchandising schema fields (Phase 1, D-102)

**What Phase 12 should build:**
- Shopier stock sync-back (poll Shopier inventory → update local stock)
- Merchandising sync cron (periodic bestSellerScore recalculation from order data)
- Website checkout/cart/payment integration
- Telegram merchandising commands for section limits/toggles (HomepageMerchandisingSettings)

**Status:** ACTIVE

---

## D-113 — Phase 12 Final Publish Autonomy + Orchestration Polish (2026-04-04)

**Decision:**
Create a central publish readiness evaluation layer, wire it into the post-audit flow, add full pipeline visibility for operators, and implement state coherence validation.

**Reason:**
The system had all building blocks (confirmation, content generation, audit, stock reaction, merchandising, story dispatch) but lacked a unified readiness gate. Audit approval alone was setting workflowStatus='publish_ready' without verifying other dimensions (visuals, stock, targets). Operators had no single command to see the full lifecycle state. No mechanism existed to detect contradictory states.

**Implementation:**

**A) Central Publish Readiness Evaluation**
Created: `src/lib/publishReadiness.ts`
- `evaluatePublishReadiness(product)` — checks 6 dimensions:
  1. Confirmation — confirmationStatus='confirmed'
  2. Visuals — images exist (original or AI) and not rejected
  3. Content — contentStatus='ready' (both packs)
  4. Audit — approvedForPublish=true or auditStatus='not_required'
  5. Sellable — stock exists, not sold_out, sellable≠false
  6. Publish targets — channelTargets array non-empty
- Returns: not_ready (0-2 passed), partially_ready (3-5), ready (all 6)
- Pure function — no side effects, no database calls

**B) Readiness Wired into Post-Audit Flow**
Updated: `src/lib/mentixAudit.ts` — `triggerAudit()`
- After audit result is computed, evaluates full publish readiness via dynamic import
- Re-fetches product with latest data, overlays new audit result for evaluation
- `workflowStatus='publish_ready'` ONLY set when `readiness.level === 'ready'` (all 6 dimensions)
- Previous behavior: audit approval alone → publish_ready (could bypass missing content/stock/targets)
- Fallback: if readiness eval fails, uses audit-only approval (backward compat)
- Emits `product.publish_ready` BotEvent when fully ready

**C) Pipeline Visibility**
Updated: `src/app/api/telegram/route.ts`
- `/pipeline {id}` — shows full lifecycle in 3 sections:
  1. 10-stage pipeline: Intake → Visuals → Confirmation → Content → Audit → Readiness → Publish → Stock → Merchandising → Story
  2. Publish readiness: 6 dimensions with pass/fail and detail
  3. State coherence: detected contradictions if any
- Compact Telegram HTML format

**D) State Coherence Validation**
Added to: `src/lib/publishReadiness.ts`
- `detectStateIncoherence(product)` — 7 validation rules:
  1. status=active but workflowStatus pre-publish
  2. status=soldout but stockState ≠ sold_out
  3. status=soldout but sellable=true
  4. approvedForPublish=true but auditStatus failed/needs_revision
  5. workflowStatus=publish_ready but confirmationStatus ≠ confirmed
  6. contentStatus=ready but workflowStatus before content_ready
  7. sellable=true but stockState=sold_out
- Returns CoherenceIssue[] with severity (warning/error) — diagnostic only, does not auto-fix
- Shown in /pipeline output when issues detected

**Backward compatibility:**
- publishReadiness.ts is a new file — no existing code affected
- mentixAudit change: stricter than before (requires ALL dimensions, not just audit). Fallback preserves old behavior if readiness eval fails
- /pipeline is a new command — no overlap with existing commands
- All existing commands (/stok, /audit, /content, /confirm, /merch) unchanged
- Legacy products (no workflow fields) handled via null-safe checks throughout

**What Phase 13 should build:**
- Shopier stock sync-back (poll Shopier inventory → update local stock)
- Merchandising sync cron (periodic bestSellerScore recalculation from order data)
- Website checkout/cart/payment integration
- Auto-publish flow: when publish_ready + operator approves → activate product
- Telegram merchandising commands for HomepageMerchandisingSettings

**Status:** ACTIVE

---

## D-114 — Phase 13 Production Hardening + Smoke Test + Migration Pack (2026-04-04)

**Decision:**
Create a comprehensive production readiness layer: migration checklist, deploy checklist, smoke test plan, production truth matrix, and lightweight operational diagnostics.

**Reason:**
The system now has 12 phases of autonomous pipeline features (intake → visual → confirm → content → audit → readiness → publish → stock → merchandising → story). Before deploying this to production, the operator needs: clear migration requirements (push:true doesn't run in prod), honest subsystem status assessment, structured test plan, and operational visibility.

**Implementation:**

**A) Migration Pack**
Created: `project-control/MIGRATION_NOTES.md`
- Complete inventory: 14 collections, 3 globals, 80+ Products columns
- SQL DDL examples for all Phase 1-12 column additions
- payload_locked_documents_rels requirements
- Migration order and caveats (exact column names may vary)
- push:true limitation documented

**B) Deploy Checklist**
Created: `project-control/DEPLOY_CHECKLIST.md`
- All 43+ env vars classified (critical/required/optional)
- Feature status matrix: prod-validated vs code-complete vs partial vs blocked
- Deploy sequence: database → code → post-deploy validation
- Security checklist (hardcoded secret found, token rotation)
- Known risks documented

**C) Smoke Test Plan**
Created: `project-control/SMOKE_TESTS.md`
- 15 test scenarios covering full pipeline lifecycle
- Each test: trigger, expected DB result, expected Telegram output, fail behavior
- Full end-to-end 12-step integration test plan
- Story pipeline truthfulness explicitly documented

**D) Production Truth Matrix**
Created: `project-control/PRODUCTION_TRUTH_MATRIX.md`
- Every subsystem classified: PROD-VALIDATED / IMPLEMENTED / PARTIAL / BLOCKED / SCAFFOLDED
- 22 subsystems prod-validated, 28 implemented but not prod-validated
- 2 subsystems blocked (Telegram stories, WhatsApp stories — API limitations)
- 4 subsystems scaffolded (Dolap, X, LinkedIn, Threads)
- 1 not implemented (website checkout)

**E) /diagnostics Telegram Command**
Updated: `src/app/api/telegram/route.ts`
- `/diagnostics` — lightweight system health check:
  - Database connectivity + product count
  - Environment variable presence check (6 critical keys)
  - Latest BotEvent info
  - Order count
  - Product status breakdown (active/soldout/draft)
  - Runtime info (NODE_ENV, server time)

**Backward compatibility:**
- All new files are documentation only — no production code changes except /diagnostics
- /diagnostics is a new read-only command — no risk to existing flows
- No existing code modified except single insertion in route.ts

**What Phase 14 should build:**
- Deploy Phases 1-13 to production with proper migration
- Run smoke test plan and validate
- Shopier stock sync-back
- Merchandising sync cron
- Website checkout/cart/payment
- Auto-publish operator approval flow

**Status:** ACTIVE

---

## D-115 — Production Hardening Execution — Prep Phase (2026-04-04)

**Decision:**
Execute hardcoded secret cleanup, env var truth pass, and migration/deploy doc improvements to make the repo deploy-safe.

**Reason:**
Phase 13 (D-114) identified 1 hardcoded secret, 6 missing env vars in .env.example, and 3 stale env vars. These needed to be fixed in code before the repo could be considered deploy-prep-ready.

**Implementation:**

**A) Hardcoded Secret Fix**
Updated: `src/app/api/generate-api-key/route.ts`
- Removed hardcoded string `'uygun-setup-2026-mentix'`
- Replaced with `process.env.GENERATE_API_KEY_SECRET`
- Added guard: returns 500 "Service not configured" if env var not set
- Added console.warn for missing env var
- Behavior preserved: same header check, same 401 on mismatch

**B) .env.example Truth Pass**
Updated: `.env.example`
- Added 7 missing vars: `TELEGRAM_CHAT_ID`, `ANTHROPIC_API_KEY`, `GEMINI_VISION_MODEL`, `INSTAGRAM_PAGE_ID`, `INSTAGRAM_USER_ID`, `OPENAI_IMAGE_MODEL`, `GENERATE_API_KEY_SECRET`
- Marked 3 stale vars as removed (N8N_INTAKE_WEBHOOK, N8N_API_KEY, N8N_BASE_URL — no code references)
- Reorganized into classified sections: Critical / Core Operator / AI / Commerce / Social / Optional
- Added "NOTE: not yet implemented" markers on X and LinkedIn OAuth sections
- Commented out optional override vars to reduce noise

**C) Production Doc Improvements**
Updated: `project-control/MIGRATION_NOTES.md`
- Added exact migration procedure (Step 1-5): capture DDL from local dev, diff against prod, apply in order
- Clarified that SQL in the doc is approximate — must verify against actual Drizzle output

Updated: `project-control/DEPLOY_CHECKLIST.md`
- Marked hardcoded secret fix as done
- Added GENERATE_API_KEY_SECRET to optional env vars
- Removed stale N8N_API_KEY reference

Updated: `project-control/PRODUCTION_TRUTH_MATRIX.md`
- Updated timestamp

**Backward compatibility:**
- generate-api-key route now requires GENERATE_API_KEY_SECRET env var — endpoint returns 500 if not set (safe: prevents unauthorized key gen)
- .env.example changes are documentation only — no runtime effect
- All production doc changes are informational

**Status:** ACTIVE

---

## D-116a — sellable=false Bug Fix: reactToStockChange After Variant Creation
**Decision:**
Call `reactToStockChange()` explicitly in `applyConfirmation()` after variant creation. The Variants afterChange hook only fires on `operation === 'update'`, not on `create`. During confirmation, variants are created (not updated), leaving sellable at its defaultValue of false.

**Reason:**
Product 125 had sellable=false despite confirmed status + stock + variants. Root cause: Variants afterChange hook guard `if (operation !== 'update') return doc` skips create operations. Without explicit call, sellable stays at schema default (false) forever for newly confirmed products.

**Status:** ACTIVE

---

## D-116b — Discovery Pack maxOutputTokens Increase to 8192
**Decision:**
Increase Gemini `maxOutputTokens` from 4096 to 8192 for discovery pack generation. Commerce pack stays at 4096.

**Reason:**
Discovery pack prompt requests 800-1500 word Turkish article + FAQ + meta + keywords in JSON. At ~1.5-2 tokens/word for Turkish, the article alone needs 1200-3000 tokens. With JSON structure overhead, 4096 was consistently insufficient — discovery pack silently failed on every attempt.

**Status:** ACTIVE

---

## D-116c — Content Retry for Partial Failures
**Decision:**
Add `canRetriggerContent()` function and `/content <id> retry` Telegram command. `triggerContentGeneration()` now accounts for existing packs in DB when determining final contentStatus (e.g., existing commercePack + newly generated discoveryPack → 'ready').

**Reason:**
`shouldAutoTriggerContent()` only fires for contentStatus='pending'. Once set to 'commerce_generated' (partial failure), there was no retry path. Operator had no way to regenerate the missing pack.

**Status:** ACTIVE

---

## D-116d — /activate Telegram Command for Product Activation
**Decision:**
Add `/activate <id>` Telegram command that validates 6/6 publish readiness, then sets status=active + merchandising.publishedAt/newUntil + workflow.workflowStatus=active + publishStatus=published. Goes through Payload `update()` to trigger afterChange hooks (channel dispatch, story, Shopier sync).

**Reason:**
No existing Telegram command for product activation. The only path was Payload admin UI. Operators need a Telegram-based activation flow to complete the product lifecycle without leaving the bot interface.

**Status:** ACTIVE

---

## D-116e — Explicit Workflow Fields in stockReaction Update
**Decision:**
Replace `...(product.workflow ?? {})` spread in `reactToStockChange()` with explicit field enumeration (`workflowStatus`, `visualStatus`, `confirmationStatus`, `contentStatus`, `auditStatus`, `publishStatus`, `productConfirmedAt`, `stockState`, `sellable`, `lastHandledByBot`).

**Reason:**
The workflow spread included Payload CMS internal/metadata fields from the fetched document that caused the `payload.update()` call to fail silently. The product update never persisted during restock transitions (soldout → active), leaving the product in an inconsistent state (variant stock > 0 but product-level status still soldout). Explicit field enumeration ensures only valid schema fields are sent in the update payload.

**Status:** ACTIVE

---

## D-116f — Phase 19 External Channel Dispatch Classification
**Decision:**
Classified all 7 external channels + website based on production evidence: AutomationSettings global flags, Instagram token state, env var presence (via dispatchNotes webhookConfigured field), and product-level channel config.

**Findings (VERIFIED):**
- Website: PROD-VALIDATED (implicit via status=active)
- Instagram: DEPLOYED, NOT VALIDATED — Direct Graph API path. Token valid until 2026-05-21 (connected 2026-03-22). userId present. N8N webhook also configured. Was live-tested 2026-03-22 but never dispatched through Phase 1-19 pipeline.
- Facebook: DEPLOYED, NOT VALIDATED — Same Meta token. facebookPageId injected from INSTAGRAM_PAGE_ID env var (not in DB column, D-077 risk). Was live-tested 2026-03-22.
- Shopier: BLOCKED — Global flag disabled, SHOPIER_PAT status unknown.
- Dolap/X/LinkedIn/Threads: BLOCKED — Global flags disabled, no N8N webhooks set, n8n-only dispatch paths.
- Product 125 only has channelTargets=[website] — no external dispatch was ever attempted during activation.

**Risks identified:**
1. Instagram token has no automated refresh (manual re-auth needed before 2026-05-21)
2. Facebook facebookPageId not persisted in DB — relies on env var injection
3. No end-to-end pipeline validation for Instagram or Facebook (last verified via direct test, not pipeline)

**Status:** ACTIVE

---

## D-117 — Visual-First Pipeline Enforcement + E2E Validation
**Decision:**
Enforced visual-first pipeline order across the entire product lifecycle. Visual approval is now a prerequisite for both commercial confirmation and content generation.

**Implementation (VF-2 through VF-5, commits 00a5666..619c20d):**
- VF-2: visualStatus written truthfully during image-gen lifecycle (9 transition points)
- VF-3: /confirm gated on visualStatus===approved with per-state operator messages
- VF-4: content generation gated on visualStatus===approved (auto-trigger, manual, retry)
- VF-5: confirmation wizard UX: productType buttons, brand text input with find-or-create
- VF-5 hotfix: brands collection uses `name` field not `title` — fixed in 619c20d

**E2E Validation (VF-6, product #180, job #147):**
- A: Intake PASS — draft product, correct initial state
- B: Image Gen PASS — visualStatus pending→approved, workflowStatus draft→visual_ready
- C: Visual Gate PASS — /confirm and /content both blocked when visualStatus=pending
- D: Wizard PASS — productType(Erkek), price(999), sizes(40-43), stock(3), brand(TestMarka), targets(website+instagram)
- E: Content PASS — auto-triggered, commerce+discovery 100% confidence
- F: Audit PASS — approved_with_warning, all dimensions pass
- G: Activation PASS — status=active, Yeni badge, 7-day window
- H: Homepage PASS — product visible with correct data

**Known issues found:**
1. Brand field name mismatch (name vs title) — FIXED
2. Homepage size array shows default range instead of DB variants — PRE-EXISTING, not VF regression
3. 170+ pre-VF-2 products have visualStatus=pending despite having preview jobs — need operator-driven approval

**Status:** ACTIVE — This is now the production operating model.

---

## D-117b — VF-7 Legacy Backlog Normalization
**Decision:**
Normalized 61 pre-VF-2 products whose workflow.visualStatus was inconsistent with their actual image generation evidence. Applied directly to Neon production DB.

**Rules applied (evidence-based only, no faked approvals):**
1. **5 products** with approved image-gen jobs + generative gallery attached → `visualStatus=approved`, `workflowStatus=visual_ready`. (Products: 122, 145, 146, 152, 159)
2. **54 products** with preview image-gen jobs but `visualStatus=pending` → `visualStatus=preview`, `workflowStatus=visual_pending`. These still need operator visual approval.
3. **2 products** (#123, #125) already confirmed/active pre-VF-2 with original images → retroactive `visualStatus=approved`. Operator implicitly accepted these products commercially.

**Post-normalization state (95 total products):**
- approved: 8 (5 newly eligible for /confirm)
- preview: 53 (need operator visual approval to unlock pipeline)
- pending: 34 (no image gen attempted yet)
- Remaining inconsistencies: 0

**Risks:**
- Rule 3 is a retroactive assumption — operator accepted these products before VF gates existed. Acceptable because they were already commercially validated.
- The 54 preview products still need human approval — normalization only made the state truthful, not approved.

**Status:** COMPLETED

---

## D-118 — Phase 20A: Instagram/Facebook Dispatch Validation — RESOLVED

**Decision:**
Phase 20 blockers fully diagnosed and resolved. Original D-118 assessment was partially incorrect — env vars were present, media storage was operational. True root causes identified and fixed.

**Root Causes Found (correcting original D-118):**

1. **P20-1 RESOLVED: Facebook Page was DEACTIVATED.** The stored userId `17841443128892405` was valid all along. The Graph API error 100/33 occurred because the Facebook Page "UygunAyakkabı" (ID: 1040379692491003) was deactivated in Meta Business Suite. After re-activating the page: `GET /{pageId}?fields=instagram_business_account` confirmed userId `17841443128892405` (username: uygunayakkabi_34). `/me/accounts` returning empty was a separate issue (app not re-authorized with page) but does not affect direct API calls.

2. **P20-2 RESOLVED: Env vars were present.** `INSTAGRAM_PAGE_ID=1040379692491003` set since Mar 22. `BLOB_READ_WRITE_TOKEN` set since Mar 10. The original assessment was wrong.

3. **P20-3 RESOLVED: Code bug — depth=0 in afterChange hook.** The afterChange hook passed `doc` (depth=0) to `dispatchProductToChannels()`. At depth=0, `images[].image` is a bare numeric ID (e.g., 686) not a populated object. `extractMediaUrls()` tried to read `686.url` → undefined → returned empty array. With no mediaUrls, both Instagram and Facebook direct API conditions failed (`mediaUrls.length > 0` check) and fell through to the n8n webhook path. **Fix:** Added `req.payload.findByID({ collection: 'products', id: doc.id, depth: 1 })` before dispatch call. Commit `ca4ccad`.

4. **Media serving confirmed working.** Payload `/api/media/file/` static handler correctly proxies from Vercel Blob. Files uploaded via Telegram bot's `payload.create({ file })` are stored in Blob automatically. Previous 404 was transient.

**Manual API Verification:**
- Instagram: container created (id: 18066372815437630) + published (postId: 18016666670834577) ✅
- Facebook: page token exchange succeeded + photo posted (postId: 1040379692491003_122103937328884171) ✅
- Both using product #180's image via Payload static handler URL

**Additional Root Cause Found During Validation:**

5. **fetchAutomationSettings() was silently failing.** The `automation_settings_story_targets` table (for the `storyTargets` array field in AutomationSettings global) did not exist in Neon. This is another instance of Blocker 0 (push:true doesn't work in production). The Payload query for AutomationSettings includes a LEFT JOIN to this table — when it didn't exist, the entire query failed. `fetchAutomationSettings()` caught the error and returned `null`. With `settings = null`, `instagramTokens` was `undefined`, so the direct API conditions (`instagramTokens?.accessToken`) were false. **Fix:** Created the table manually via DDL in Neon.

**Automated Dispatch Validation (FINAL):**
- Dispatch triggered via `forceRedispatch=true` PATCH on product #180
- Instagram: `dispatched=true`, `mode=direct`, `postId=18085404884600056`, `containerId=18066373853437630`
- Facebook: `dispatched=true`, `mode=direct`, `postId=122103938528884171`, `pageId=1040379692491003`, `tokenMode=page-token`
- `dispatchedChannels=["instagram","facebook"]`
- Media URL used: `https://uygunayakkabi.com/api/media/file/tg-180-1775323061276.jpg`

**Status:** PROD-VALIDATED — both channels publish successfully through automated pipeline

---

## D-119 — Image Pipeline v34: Side-Angle Primary + Product-Level Background Lock

**Decision:**
Side-angle (90° lateral profile) is the primary/hero image for all products across website, external channels, and Telegram previews. Product-level background lock ensures all generated images share one visual background family.

**Changes:**
1. EDITING_SCENES reordered: side_angle → index 0, commerce_front → index 1
2. Website product page + homepage: generativeGallery shown before product.images
3. Channel dispatch: extractMediaUrls() prefers generativeGallery[0] as hero
4. enforceSlotBackground v34: dual-mode (corner sampling for macro, edge strips for full-shoe)
5. Batch background consistency check: post-generation corner drift measurement + re-enforcement
6. Strengthened prompts with "same studio backdrop" framing

**Root Cause of Slot 3 Drift:**
enforceSlotBackground used edge-strip sampling (outer 5%) which was contaminated by product pixels in macro/closeup shots where shoe fills 85%+ of frame. Corner-only sampling fixes this.

**Status:** DEPLOYED — awaiting live visual verification

---

## D-120 — DB Hotfix: Missing PostgreSQL Enum Types for hasMany Select Fields

**Decision:**
Created 3 missing PostgreSQL enum types and altered join table columns from varchar to enum. This is push:true drift incident #4.

**Tables Fixed:**
- `products_story_settings_story_targets` → `enum_products_story_settings_story_targets` ('telegram','instagram','whatsapp')
- `products_channel_targets` → `enum_products_channel_targets` ('website','instagram','shopier','dolap','x','facebook','linkedin','threads')
- `story_jobs_targets` → `enum_story_jobs_targets` ('telegram','instagram','whatsapp')

**Root Cause:**
Payload CMS v3's Drizzle adapter generates INSERT statements that cast to enum types. When tables were created by push:true (which may have run in an earlier version or dev mode), they used varchar instead of enum. Production inserts failed when Payload tried to cast to non-existent enum types.

**Status:** APPLIED — product #194 created successfully after fix

---

## D-121 — Image Pipeline v35: Deterministic Brightness Normalization

**Decision:**
Replace conditional `enforceBrightness()` (v33 sharp.modulate) with unconditional `normalizeBrightness()` using product-pixel-only selective gamma correction. Run on every slot, not just failures.

**Problem:**
v33/v34 brightness enforcement had three issues:
1. Thresholds too lenient (mean>210 whole-image including light background) — washed products passed
2. Enforcement was conditional — only ran after retry failure, not on images that barely passed
3. `sharp.modulate({ brightness })` affected entire image including background, undoing bg enforcement

**DM vs Group Audit:**
Confirmed NO code divergence. Both DM and group `#gorsel` commands flow through identical path: `isGorselTrigger → create ImageGenerationJob → queue image-gen task → generateByGeminiPro()`. No chat-type branching anywhere.

**Solution — normalizeBrightness():**
1. Detect background color from image edges (or use explicit target bg hex)
2. Classify each pixel as background (color distance < 80 from bg) or product
3. Measure mean luminance of PRODUCT pixels only (BT.709 formula)
4. If product mean lum > 170: darken via gamma > 1 (max 1.8)
5. If product mean lum < 100: brighten via gamma < 1 (min 0.55)
6. Apply gamma ONLY to product pixels with soft 40px blend margin at boundary
7. Background pixels are untouched — enforced bg color preserved

**Pipeline Position:**
Runs UNCONDITIONALLY on every successful slot, after:
1. Background enforcement (preserves enforced bg)
2. Frame detection/crop (works on clean image)
Before: final buffer push to results

**QC Threshold Changes:**
- Mean brightness: 210 → 200 (triggers retry earlier)
- Highlight percent: 35% → 30% (catches more blown highlights)

**Status:** DEPLOYED — commit 88c4d5f

---

## D-122 — Image Pipeline v36: Deterministic Centering + Tighter Brightness Band

**Decision:**
Add unconditional `centerProduct()` post-processing to correct Gemini's systematic lower-right placement bias. Tighten brightness normalization band from 100-170 to 85-145 product mean luminance.

**Problem — Centering:**
Gemini 2.5 Flash consistently generates shoes placed in the lower-right quadrant of the frame. Across multiple generations, product center offset from image center is typically +80-110px X, +150-210px Y (7-20% of frame), despite explicit centering prompt instructions.

**Problem — Brightness:**
v35 band (100-170 product mean lum) was still too permissive for dark leather (brown, espresso). Product appeared correctly measured but visually still too bright for e-commerce presentation.

**Solution — centerProduct():**
1. Detect background color from image edges (same method as normalizeBrightness)
2. Find product bounding box via non-bg pixel envelope (color distance > 50 from bg)
3. Measure offset between product bbox center and image center
4. If offset > 25px: crop excess bg from the side where product is shifted, extend opposite side with fill color
5. Safety: skip if required crop > 30% of image dimension
6. Skip for `detail_closeup` slot (macro — product intentionally fills frame)

**Solution — Brightness Tightening:**
- TARGET_HIGH: 170 → 145 (darker max for product pixels)
- TARGET_LOW: 100 → 85 (richer shadows allowed)
- TARGET_MID: 135 → 115 (midpoint pulls darker)

**Pipeline Position:**
centerProduct runs LAST in post-processing chain:
1. Background enforcement (v28)
2. Frame detection/crop (v28)
3. Brightness normalization (v35)
4. Product centering (v36) ← NEW

**Prompt Enhancement:**
Added CENTERING — CRITICAL block to all studio slot prompts: dead-center requirement, equal whitespace on all sides, explicit rejection language for off-center placement.

**V36 Verification Results (Product #194, Job #169):**
- Brightness: PASS — product mean lum 92-109 (within 85-145 band), highlights ≤0.1%
- Centering: PARTIAL — function operational (confirmed via non-1024 output dims + slotLog), but residual offset persists (7-17% X, 14-18% Y) due to Gemini generation variance across runs
- Background: PASS on slots 1-2 (clean studio gray), slot 3 persistent surface bg
- Frame: PASS on slots 1-2, slot 3 persistent border

**Known Limitation:**
centerProduct corrects the offset of each individual generation, but since each `#gorsel` produces entirely new images from Gemini, the correction amount varies per run. The systematic Gemini lower-right bias means centering improves each individual image but results still vary across generations. A more robust approach would add centering-specific QC rejection (reject + retry if offset > N% after correction).

**Status:** DEPLOYED — commit 8c3904d

---

## D-123 — Image Pipeline v37: Centering QC Hard Gate + Sharp Chaining Bugfix

**Decision:**
Make centering a HARD QC requirement for hero slots (side_angle, commerce_front). After ALL post-processing, measure final centering. If offset exceeds 12% on either axis, reject and regenerate the slot (up to 3 cycles). Also fix a Sharp library chaining bug that was silently undoing centering corrections in v36.

**Root Cause — Sharp Chaining Bug:**
`sharp(buf).extract(946×872).extend(→1026×1062).resize(1026×1062, {fit:'fill'})` produces wrong output dimensions. Sharp computes resize scale from post-extract dimensions (946×872), NOT post-extend dimensions (1026×1062). Scale factor: 1026/946=1.085 applied to post-extend width 1026→1113, 1062/872=1.218 applied to post-extend height 1062→1293. This silently undid all centering corrections in v36.

**Fix — Split Sharp Instances:**
Replace single-pipeline `.extract().extend().resize()` with two separate Sharp instances:
1. `sharp(buf).extract().extend().jpeg().toBuffer()` — guaranteed correct dimensions
2. `sharp(shifted).resize(w, h, {fit:'fill'}).jpeg().toBuffer()` — only if dimensions mismatch (rounding edge case)

**Fix — measureCentering() QC Function:**
New function using same bbox detection as centerProduct (edge-based bg, PRODUCT_DIST_THRESHOLD=50). Returns pass/fail plus offset on each axis. Non-hero slots always pass (skip).

**Fix — Centering Retry Loop:**
Hero slots wrapped in centering retry loop (MAX_CENTERING_CYCLES=3). Each cycle is a full generation + D1-D5 QC + post-processing. If centering QC fails after max cycles, accepts best attempt with warning in slotLog.

**Threshold:**
MAX_CENTER_OFFSET_PCT = 12% on either axis. Chosen as strict enough to catch visible off-center placement while allowing for normal product asymmetry (shoes are not perfectly symmetric objects).

**SlotLog Fields Added:**
- `centeringPass: boolean` — QC result
- `centeringOffsetX: number` — X offset %
- `centeringOffsetY: number` — Y offset %
- `centeringAttempts: number` — total generation cycles

**V37 Verification Results (Product #194, Job #171):**
- side_angle: centeringPass=true, offset X=0% Y=0%, 1 cycle
- commerce_front: centeringPass=true, offset X=0% Y=0.1%, 1 cycle
- detail_closeup: centered=true (non-hero, no QC gate), 1 cycle
- No batch BG re-enforcement triggered (batchBgReEnforced absent)
- Post-download pixel analysis confirmed 0% offset on both hero slots when SKU overlay region excluded
- NOTE: SKU stamp (overlayStockNumber) adds dark pill at bottom-right; naive bbox analysis on final images will report false offset due to SKU pixels being detected as "product"

**Files Changed:**
- `src/lib/imageProviders.ts`: centerProduct() split-sharp fix (~line 1427), measureCentering() new function (~line 1480), SlotLog type expanded, centering retry loop in generateByGeminiPro() (~line 2486-2766)

**Status:** DEPLOYED — commit cd02c19

---

## D-124 — Image Pipeline v38: Slot 3 Rebuild + Global Background Lock

**Decision:**
Replace slot 3 (`detail_closeup` macro) with a production-stable 3/4 rear hero (`back_hero`). Formalize global background-lock where slot 1 is the background-family source and all other slots must match. Remove all macro-specific code paths.

**Problem — Slot 3 Macro:**
The `detail_closeup` macro slot was the least stable slot in the pipeline. Recurring issues: (1) Gemini generates frames/borders/inset panels ~30-40% of the time. (2) Shallow DoF bokeh color drifts from batch background despite 21 lines of prompt instructions. (3) Surface/tabletop bleed from reference photos despite explicit bans. (4) Required special-case code: corner-only bg sampling, tighter enforcement thresholds, centering skip, no centering QC. The macro framing instruction ("full shoe must NOT be visible") fundamentally conflicts with the pipeline's full-shoe assumptions.

**Problem — Background Lock:**
Background lock was enforced at code level (`getBackgroundForColor` + `enforceSlotBackground` + batch check) but the prompt-level lock had macro/editorial/lifestyle exceptions that weakened it. The global framing block mentioned "bokeh color = backdrop color" for macro, "surface color" for editorial, and "dominant blurred tone" for lifestyle — all weaker than "same exact color."

**Solution — New Slot 3 (`back_hero`):**
3/4 rear hero shot: camera 30-45° behind the shoe, heel counter dominant, full shoe visible, standard studio background. This angle reveals genuinely different product features (heel counter, pull tab, rear stitching) that slots 1-2 don't show. Being a full-shoe shot, ALL existing post-processing works on it: bg enforcement (edge-strip mode), frame detection, brightness normalization, centering, centering QC.

**Solution — Global Background Lock:**
Strengthened TASK_FRAMING_BLOCK background lock section: removed macro/editorial/lifestyle exceptions. New rule: "Slot 1 sets the background-family. Slots 2-5 MUST produce the same color." Rejection test: "any visible color temperature shift between slots = REJECTED." Existing code-level enforcement unchanged (already correct): `getBackgroundForColor` → same hex for all slots, `enforceSlotBackground` → pixel-level correction, batch bg check → post-loop re-enforcement.

**Code Removed:**
- `isMacroSlot` flag and corner-only sampling mode in `enforceSlotBackground`
- Tighter macro thresholds (MAX_BG_DISTANCE=70, BLEND_MARGIN=40) — now unified at 90/50
- `centerProduct` skip for `detail_closeup` — all slots get centering now
- `detail_closeup` shot criteria in SHOT_CRITERIA — replaced with `back_hero`
- Macro exception in TASK_FRAMING_BLOCK scale rule
- 21-line macro-specific background instruction block in EDITING_SCENES[2]

**Files Changed:**
- `src/lib/imageProviders.ts`: EDITING_SCENES[2] replaced, SHOT_CRITERIA updated, centerProduct skip removed, CENTERING_QC_SLOTS expanded, enforceSlotBackground simplified, TASK_FRAMING_BLOCK background lock strengthened
- `src/jobs/imageGenTask.ts`: ALL_SLOT_NAMES[2], ALL_SLOT_LABELS[2], CLEAN_SLOT_LABELS[2] updated
- `src/lib/imagePromptBuilder.ts`: concept type and prompt updated (legacy builder, not active)

**No-Frame Enforcement (verified, no changes needed):**
Already hardened at 3 levels: (1) TASK_FRAMING_BLOCK anti-inset rules, (2) D3 shot compliance includes frame detection, (3) `detectAndRemoveFrame` post-processing runs unconditionally.

**Status:** DEPLOYED — commit b6a5bd7

---

## D-125 — Image Pipeline v39: Visual Standard Reset — Darker/Richer + Close Shot Hero

**Decision:**
Operator-driven visual standard reset. Remove the bright/washed look from all slots, shift backgrounds from near-white to visibly colored, rebuild slot 3 as a front-side close hero replacing back_hero.

**Problem — Bright/Washed Look:**
The operator rejected v38 output as too bright and washed. Background hex values in `getBackgroundForColor()` were ~93-98% luminance (near-white), making them appear as "no background." Brightness normalization band (85-145, mid 115) allowed output that read as overexposed. QC brightness thresholds (mean>200, highlight>30%) were too permissive.

**Problem — Slot 3 (back_hero):**
Operator explicitly rejected back_hero: "Slot 3 must NOT be back hero." Required instead: "a close shot hero, useful detail-oriented angle, same visual family as slot 1 and slot 2, no frame, no inset, no macro." The back view was not valued enough to occupy a standard-stage slot.

**Solution — Background Color Reset:**
All `getBackgroundForColor()` hex codes shifted from near-white (~93-98% luminance) to visibly colored (~75-80% luminance): black→#D4C9B8, white→#B8B5B0, brown→#D6CCBE, tan→#C8C6C3, grey→#D9D5CE, navy→#C9C4BC, red→#C2C0BD, default→#CBC7C0.

**Solution — Brightness Normalization Reset:**
`normalizeBrightness()` target band shifted darker: TARGET_LOW=70 (was 85), TARGET_HIGH=120 (was 145), TARGET_MID=95 (was 115).

**Solution — QC Brightness Tightening:**
`checkBrightnessExposure()` thresholds tightened: mean>185 (was 200), highlight>25% (was 30%).

**Solution — Slot 3 Rebuild (close_shot_hero):**
3/4 front-side close hero: camera at 30-45° from the front-side at low-mid height, vamp and toe area as hero, tighter framing (78-85% of image height), full shoe visible. Shows toe shape, vamp texture, lacing/closure detail — genuinely different from side_angle (90° pure side) and commerce_front (dead-on front). Same visual family — all three are studio product shots, no lifestyle or editorial.

**Solution — TASK_FRAMING_BLOCK Darker Emphasis:**
Quality standard section updated: added "VISUAL TONE: Rich, warm, slightly dark. NOT bright or airy. NOT high-key." Exposure section updated: "DARK & RICH exposure is the standard," background described as "a VISIBLE COLOR (not near-white)," photographer analogy changed from "meters for the product" to "warmly-lit studio with a colored backdrop — NOT a white infinity curve."

**Files Changed:**
- `src/lib/imageProviders.ts`: getBackgroundForColor hex reset, normalizeBrightness target band, checkBrightnessExposure thresholds, EDITING_SCENES[2] replaced (back_hero→close_shot_hero), SHOT_CRITERIA updated, CENTERING_QC_SLOTS updated, TASK_FRAMING_BLOCK quality+exposure sections updated
- `src/jobs/imageGenTask.ts`: ALL_SLOT_NAMES[2], ALL_SLOT_LABELS[2], CLEAN_SLOT_LABELS[2] updated
- `src/lib/imagePromptBuilder.ts`: concept type, comment, label, prompt updated (legacy builder)

**Slot Map After v39:**
| Slot | Name | Angle | Stage |
|------|------|-------|-------|
| 1 | side_angle | 90° pure lateral side profile | standard |
| 2 | commerce_front | Dead-on front, toe cap facing camera | standard |
| 3 | close_shot_hero | 3/4 front-side close hero, vamp/toe detail | standard |
| 4 | tabletop_editorial | 55-65° overhead editorial, marble surface | premium |
| 5 | worn_lifestyle | Lifestyle worn shot, human foot, outdoor | premium |

**Status:** SUPERSEDED by D-126

---

## D-126 — Image Pipeline v40: Aggressive Visual Enforcement

**Decision:**
v39 was too subtle — operator confirmed problems persisted. v40 applies aggressive, multi-layer enforcement to guarantee visible backgrounds and dark/rich product tones.

**Root Cause:**
v39 hex codes (~79% luminance) were still perceived as near-white on screen. The shift-based background enforcement preserved whatever Gemini generated rather than forcing the target. Brightness normalization band (70-120, mid 95) still allowed bright-looking output.

**Changes:**

1. **Background hex codes → ~60% luminance**: All colors dropped ~20% further. E.g. black shoe: #D4C9B8 (79%) → #B8A68E (61%). These are now undeniably colored — warm sand, medium grey, slate — not interpretable as white.

2. **enforceSlotBackground → HARD REPLACE**: Background-classified pixels are now SET to the exact target RGB, not shifted relative to Gemini's output. Formula changed from `pixel + (target - detected) * blend` to `pixel + (target - pixel) * blend`. Guarantees exact target color regardless of what Gemini generated.

3. **normalizeBrightness band → 60-105, mid 82**: Down from 70-120/95. Max darkening gamma raised from 1.8 to 2.2. Product pixels will be visibly darker.

4. **QC brightness thresholds → mean>165, highlight>18%**: Down from 185/25%. Forces Gemini to retry with darker output.

5. **TASK_FRAMING_BLOCK**: Added aggressive anti-white/anti-bright language. Retry hint demands "2 stops darker." Background described as "medium-tone surface, NOT white, NOT light grey."

**Files Changed:**
- `src/lib/imageProviders.ts`: getBackgroundForColor, enforceSlotBackground, normalizeBrightness, checkBrightnessExposure, TASK_FRAMING_BLOCK

**Status:** REVERTED — superseded by D-127

---

## D-127 — Image Pipeline v43: Full Rollback to v27 + Baseline Lock

**Decision:**
Operator rejected ALL post-processing changes from v28-v42. Full rollback to v27 clean baseline (raw Gemini output only). Then apply three surgical, prompt-only fixes: side hero as slot 1, background lock (one color per shoe), anti-frame hardening.

**Context:**
v28-v42 added layers of pixel-manipulation post-processing (brightness normalization, centering, bg enforcement, frame detection, softening). Each iteration made images worse — too dark, painting-like, gradient backgrounds, sole bleed. Operator explicitly requested full removal. The v27 raw Gemini output is the approved visual standard.

**What was REMOVED (v28-v42, permanently):**
- `normalizeBrightness` (v35) — gamma correction on product pixels
- `centerProduct` (v36) — bbox-based product centering
- `enforceSlotBackground` (v28-v34) — pixel-level bg color replacement
- `detectAndRemoveFrame` (v33) — frame/border detection and crop
- `softenImage` (v41) — gaussian blur softening
- `measureCentering` / centering QC gate (v37)
- `checkBrightnessExposure` (v30) — brightness QC gate
- `checkSlotBackground` (v28) — background color QC gate

**What was PRESERVED from v27 baseline:**
- Raw Gemini image generation (no pixel manipulation)
- Color match check (Gemini Vision)
- Brand fidelity check (Gemini Vision)
- Shot compliance check (Gemini Vision)
- Stock number overlay
- Current visual quality, brightness, lighting, sharpness

**Three prompt-only fixes applied on top of v27:**

1. **Slot order → side_angle first**: EDITING_SCENES[0] = side_angle (was commerce_front). generativeGallery[0] = side profile = website hero. Standard `#gorsel` produces [side_angle, commerce_front, detail_closeup].

2. **Background lock**: getBackgroundForColor returns ONE exact color per shoe color (removed "or" options). TASK_FRAMING_BLOCK adds "BACKGROUND CONSISTENCY" section — all slots must use identical backdrop. Detail closeup bokeh must match batch color.

3. **Anti-frame hardening**: TASK_FRAMING_BLOCK adds 7-line "ANTI-FRAME RULE (ZERO TOLERANCE)" section. Explicit bans: image-inside-image, bordered panels, decorative edges, shadow boxing, vignette, printed-on-paper look.

**Slot Map (v43):**
| Slot | Index | Name | Stage |
|------|-------|------|-------|
| 1 | 0 | side_angle | standard (PRIMARY) |
| 2 | 1 | commerce_front | standard |
| 3 | 2 | detail_closeup | standard |
| 4 | 3 | tabletop_editorial | premium |
| 5 | 4 | worn_lifestyle | premium |

**Files Changed:**
- `src/lib/imageProviders.ts`: EDITING_SCENES order, getBackgroundForColor, TASK_FRAMING_BLOCK
- `src/jobs/imageGenTask.ts`: ALL_SLOT_NAMES, ALL_SLOT_LABELS
- `src/lib/imagePromptBuilder.ts`: prompt order, header comment

**Status:** DEPLOYED

---

## D-128 — Image Pipeline v47: Slots 1-3 Locked — Confirmed Working
**Decision:**  
Lock slots 1-3 prompt definitions as confirmed working by operator.

**Details:**
- Slot 1 (side_angle): 90° lateral profile — CONFIRMED WORKING
- Slot 2 (commerce_front): Front studio hero — CONFIRMED WORKING
- Slot 3 (detail_closeup): Detail close-up of toe/vamp, 25-35cm, moderate depth — CONFIRMED WORKING
- Triple-layer anti-frame active on all slots (per-slot + TASK_FRAMING_BLOCK + ANTI_FRAME_FINAL_BLOCK)
- v32 bitmap pixel font SN overlay restored and working on Vercel
- v27 raw Gemini baseline preserved — NO post-processing

**Constraint:**  
Do NOT modify slot 1-3 sceneInstructions, TASK_FRAMING_BLOCK, or overlayStockNumber without explicit operator approval.

**Status:**  
ACTIVE — locked at commit 5cfcd4f (v47)


---

## D-129 — Image Pipeline v50: FULL BASELINE LOCKED — Operator Approved
**Decision:**  
Lock the ENTIRE image generation pipeline as the approved production baseline. No further changes without explicit operator approval.

**Locked Components (commit e99e9cb):**

| Component | State | Details |
|-----------|-------|---------|
| Slot 1 (side_angle) | LOCKED | 90° lateral profile, PRIMARY hero |
| Slot 2 (commerce_front) | LOCKED | Front studio hero |
| Slot 3 (detail_closeup) | LOCKED | 3/4 angle close-up, 18-25cm, toe/vamp focus |
| Slot 4 (tabletop_editorial) | LOCKED | Overhead 55-65°, seamless studio floor |
| Slot 5 (worn_lifestyle) | LOCKED | Ground-level lifestyle, worn on foot |
| TASK_FRAMING_BLOCK | LOCKED | Global framing + anti-frame + background consistency |
| ANTI_FRAME_FINAL_BLOCK | LOCKED | End-of-prompt frame verification checklist |
| CANONICAL_PROHIBITIONS_BLOCK | LOCKED | Product preservation rules |
| getBackgroundForColor() | LOCKED | Color→backdrop map (black/white/brown/tan/grey/navy/red/green/blue/pink/beige + default) |
| getBackgroundRGB() | LOCKED | Hex parser for input padding color |
| Input padding | LOCKED | Background-color padding (NOT white) — root cause fix for frames |
| overlayStockNumber() | LOCKED | v32 bitmap pixel font (SVG rects, zero font deps) |
| QC checks | LOCKED | Color match, brand fidelity, shot compliance (all Gemini Vision) |
| Visual baseline | LOCKED | v27 raw Gemini output — NO post-processing |

**Constraint:**  
Do NOT modify ANY of the above without explicit operator approval in a future task. This includes:
- Slot ordering, slot prompts, slot camera angles
- Background color mappings
- Input image padding logic
- Anti-frame instructions
- SN overlay function
- QC check thresholds
- Brightness, sharpness, or any visual quality parameters

**Version History:**
- v27 (e13623e): Raw Gemini baseline — all post-processing removed
- v43: Slot order fix + background lock + anti-frame hardening
- v44: Bitmap SN overlay restored + slots 2-3 anti-frame
- v45: Triple-layer anti-frame (per-slot + global + final block)
- v46-v47: Slot 3 extreme macro → pulled back to moderate close-up
- v48: Slots 4-5 rewritten with deep integrated anti-frame
- v49: ROOT CAUSE frame fix — background-color padding instead of white
- v50: Green/blue/pink/beige color maps + slot 3 closer 3/4 angle

**Status:**  
ACTIVE — PRODUCTION BASELINE LOCKED at commit e99e9cb (v50)


---

## D-130 — Content Architecture Audit + Production Plan
**Decision:**  
Audit the Geobot content system and define the production content architecture.

**Current Reality (VERIFIED):**

The content GENERATION layer is fully implemented:
- `geobotRuntime.ts` (364 lines) — Real Gemini 2.5 Flash AI generation
- `contentPack.ts` (860 lines) — Full lifecycle: trigger, write, blog creation, audit handoff
- Product schema has complete content fields: commercePack (5 channels) + discoveryPack (SEO/GEO)
- BlogPosts collection (186 lines) with SEO fields, auto-creation from discoveryPack
- Telegram `/content` command: show, trigger, retry
- Auto-trigger after product confirmation
- BotEvent tracking for full content pipeline
- Mentix audit auto-trigger after content ready

The content CONSUMPTION layer is NOT wired:
- Storefront product page uses `product.description` (basic field), NOT `commercePack.websiteDescription`
- Channel dispatch (Instagram) builds caption from `product.description`, NOT `commercePack.instagramCaption`
- Shopier dispatch does NOT use `commercePack.shopierCopy`
- No `/blog` or `/blog/[slug]` frontend routes exist — BlogPosts collection has data but no public pages
- No SEO meta tags from `discoveryPack.metaTitle` / `metaDescription` in page `<head>`
- No FAQ rendering on product pages from `discoveryPack.faq`
- No structured data (JSON-LD) generated from content packs

**Content Types That Exist (IMPLEMENTED):**

| Type | Field | Status |
|------|-------|--------|
| Website product description | commercePack.websiteDescription | Generated, NOT rendered |
| Instagram caption | commercePack.instagramCaption | Generated, NOT used in dispatch |
| X/Twitter post | commercePack.xPost | Generated, NOT used |
| Facebook copy | commercePack.facebookCopy | Generated, NOT used |
| Shopier description | commercePack.shopierCopy | Generated, NOT used in dispatch |
| Product highlights | commercePack.highlights | Generated, NOT rendered |
| SEO article | discoveryPack.articleBody | Generated, stored in BlogPost (draft) |
| SEO meta title | discoveryPack.metaTitle | Generated, NOT in page head |
| SEO meta description | discoveryPack.metaDescription | Generated, NOT in page head |
| FAQ | discoveryPack.faq | Generated, NOT rendered |
| Keywords/entities | discoveryPack.keywordEntities | Generated, NOT used |
| Internal link targets | discoveryPack.internalLinkTargets | Generated, NOT used |
| BlogPost | BlogPosts collection | Auto-created as draft, no public pages |

**What Is MISSING (consumption/wiring):**

1. Storefront must render `commercePack.websiteDescription` instead of basic `description`
2. Product page needs `discoveryPack.metaTitle` + `metaDescription` in `<head>`
3. Product page should render `commercePack.highlights` as feature list
4. Product page should render `discoveryPack.faq` as expandable FAQ section
5. `/blog` listing page + `/blog/[slug]` detail page for BlogPosts
6. Blog pages need proper SEO meta from BlogPost.seo fields
7. Channel dispatch must use AI-generated captions (instagramCaption, facebookCopy, etc.)
8. Structured data (JSON-LD Product + FAQ) from content pack fields
9. Sitemap inclusion for blog posts

**Proposed Production Content Architecture:**

Phase A — Wire existing content to storefront:
- Product page: websiteDescription, highlights, FAQ, SEO meta
- JSON-LD structured data

Phase B — Blog frontend:
- `/blog` listing page
- `/blog/[slug]` detail page
- Blog SEO meta + sitemap entry

Phase C — Channel dispatch wiring:
- Instagram: use instagramCaption from commercePack
- Shopier: use shopierCopy from commercePack
- X/Facebook: use xPost/facebookCopy when channels go live

Phase D — Content quality loop:
- Operator review/edit flow for AI-generated content
- Content regeneration on product update

**Status:**  
ACTIVE — Architecture defined, implementation phases planned


---

## D-131 — Phase A: Storefront Content Wiring — IMPLEMENTED
**Decision:**  
Wire Geobot-generated content into the storefront product page.

**Changes:**

1. **websiteDescription** (commercePack → fallback to basic description):
   - Product page now renders `content.commercePack.websiteDescription` first
   - Falls back to `product.description` if commercePack is empty
   - Falls back to nothing if both are empty

2. **Highlights** (commercePack.highlights):
   - Rendered as a checkmark list under "Ürün Özellikleri" heading
   - Only shows if array has valid string entries
   - Gracefully hidden if empty

3. **FAQ** (discoveryPack.faq):
   - New `ProductFAQ` client component with expand/collapse accordion
   - Renders below the product info grid
   - Only shows if FAQ array has valid {q, a} entries
   - Gracefully hidden if empty

4. **SEO Meta** (discoveryPack → fallback):
   - `generateMetadata()` export for Next.js head management
   - Title: `discoveryPack.metaTitle` → fallback "{title} — UygunAyakkabı"
   - Description: `discoveryPack.metaDescription` → `websiteDescription[:160]` → `description[:160]`
   - Keywords: from `discoveryPack.keywordEntities` if present
   - OpenGraph title + description set

5. **JSON-LD Product** structured data:
   - Schema.org Product with name, description, sku, brand, color, material, price, availability, image
   - Uses websiteDescription (Geobot → fallback) for description
   - Injected via `<script type="application/ld+json">`

6. **JSON-LD FAQPage** structured data:
   - Only emitted when FAQ exists
   - Schema.org FAQPage with Question + Answer entities
   - Injected via separate `<script type="application/ld+json">`

7. **Bonus: originalPrice + color + material** rendering added to product info grid

**Files Changed:**
- `src/app/(app)/products/[slug]/page.tsx` — Full rewrite with content wiring
- `src/components/ProductFAQ.tsx` — New client component for FAQ accordion

**Fallback Safety:**
Every content field has graceful fallback: Geobot content → basic field → hidden. The page works identically to before if no Geobot content exists.

**Status:**  
ACTIVE — Phase A complete


---

## D-132 — Phase B: Blog Frontend — IMPLEMENTED
**Decision:**  
Build the blog frontend to render Geobot-generated blog/article content.

**New Routes:**

| Route | Purpose |
|-------|---------|
| `/blog` | Listing of published blog posts, sorted by publishedAt descending |
| `/blog/[slug]` | Full article detail page with SEO meta, JSON-LD, related products |

**Implementation Details:**

1. **`/blog` listing page:**
   - Queries BlogPosts where `status === 'published'`, sorted by `-publishedAt`
   - Card layout: thumbnail, category badge, date, title, excerpt
   - Static metadata: "Blog — UygunAyakkabı"
   - Empty state: "Henüz yayınlanmış yazı yok."
   - Revalidates every 120 seconds

2. **`/blog/[slug]` detail page:**
   - `generateMetadata()` for SEO: `seo.title` → fallback "{title} — UygunAyakkabı Blog"
   - `seo.description` → excerpt → title fallback
   - `seo.keywords` → tags fallback
   - OpenGraph with `type: article` and `publishedTime`
   - JSON-LD Article structured data (headline, author, publisher, datePublished)
   - Featured image rendering
   - Article body: Lexical richText → text extraction → paragraph/heading/list rendering
   - Basic Markdown detection (# headings, - bullet lists)
   - Tags rendered as chips
   - Related products grid with images, titles, prices (from `relatedProducts` relationship)
   - Back link to /blog
   - 404 for non-published posts

3. **Fallback safety:**
   - Draft/archived posts return 404
   - Missing content shows "Bu yazının içeriği henüz eklenmedi."
   - Missing featured image, tags, excerpt — gracefully hidden
   - Empty related products — section hidden

**Files Created:**
- `src/app/(app)/blog/page.tsx` — Blog listing
- `src/app/(app)/blog/[slug]/page.tsx` — Blog detail

**Operator workflow:**
Geobot auto-creates BlogPosts as `draft`. Operator reviews in admin panel, sets status to `published` (and optionally sets `publishedAt`). Post then appears on `/blog`.

**Status:**  
ACTIVE — Phase B complete

---

## D-133 — Phase C: Blog Discoverability — IMPLEMENTED
**Date:** 2026-04-08  
**Decision:**  
Add visible Blog link to storefront navigation (desktop + mobile) and footer.

**Implementation:**
- Desktop navbar: `<a href="/blog">BLOG</a>` after KOLEKSİYON, styled identically to existing nav links
- Mobile menu: `<a href="/blog">BLOG</a>` after KOLEKSİYON, closes mobile menu on click
- Footer "Sayfalar" section: `<a href="/blog">Blog</a>` after Koleksiyon
- Blog is a separate server-rendered Next.js route — uses `<a href>` not SPA `onNav` callback

**Files Changed:**
- `src/app/(app)/UygunApp.jsx` — 3 insertion points (desktop nav, mobile nav, footer)

**Status:**  
ACTIVE — Phase C complete, verified in production

---

## D-134 — Phase D: Channel Dispatch Geobot Wiring — IMPLEMENTED
**Date:** 2026-04-08  
**Decision:**  
Wire Geobot-generated channel-specific content into the existing dispatch pipeline so downstream channels receive AI-generated copy instead of basic product descriptions.

**Gap identified:**
- `buildDispatchPayload()` only included `product.description` — Geobot's `content.commercePack.*` fields were never extracted
- `buildInstagramCaption()` built captions from basic fields — ignored `instagramCaption`
- `publishFacebookDirectly()` reused Instagram caption builder — ignored `facebookCopy`
- `buildShopierProductBody()` used `product.description` — ignored `shopierCopy`

**Implementation:**
1. Extended `ChannelDispatchPayload` type with optional `geobot` field containing all 6 commerce pack fields
2. `buildDispatchPayload()` extracts `product.content.commercePack` into `payload.geobot`
3. `buildInstagramCaption()` prefers `geobot.instagramCaption` when present, falls back to template builder
4. `publishFacebookDirectly()` prefers `geobot.facebookCopy` when present, falls back to caption builder
5. `buildShopierProductBody()` prefers `geobot.shopierCopy` → `product.description` → title fallback
6. All n8n webhook payloads now include `geobot` field for `xPost`, `linkedinCopy`, etc.

**Graceful degradation:**
All paths fall back to existing logic if Geobot content is absent. Zero risk to products without content generation.

**Files Changed:**
- `src/lib/channelDispatch.ts` — type extension + payload builder + Instagram/Facebook caption preference
- `src/lib/shopierSync.ts` — Shopier description preference chain

**Status:**  
ACTIVE — Phase D complete

---

## D-135 — Phase G: Dry-Run Preview Mode for Channel Dispatch — IMPLEMENTED
**Date:** 2026-04-08  
**Decision:**  
Implement a safe preview/dry-run mode for direct-publish channels so operators can verify the exact Geobot-derived caption/body that WOULD be posted, without making any public post.

**Problem:**
No safe way to verify Geobot content integration without creating real public posts on Instagram/Facebook. This blocked Phase F validation.

**Implementation:**
1. Added `previewDispatch` checkbox in `sourceMeta` (alongside `forceRedispatch`)
2. When both `previewDispatch + forceRedispatch` are checked + saved on an active product:
   - Full dispatch pipeline runs (eligibility, payload building, caption selection)
   - `dispatchProductToChannels()` receives `{ dryRun: true }` option
   - `resolvePreviewCaption()` uses the SAME content-selection logic as real publish
   - NO external API calls made (Instagram Graph API, Facebook Graph API, Shopier, n8n webhooks)
   - Shopier job queue suppressed, story dispatch suppressed
3. Preview results written to `sourceMeta.dispatchNotes` with `mode: "preview"`
4. Each channel result includes: `caption`, `source` (geobot|template-fallback|description-fallback), `geobotField`, `mediaUrl`, `mediaCount`
5. Telegram notification sent to operator with formatted preview of all channel captions
6. Both `forceRedispatch` and `previewDispatch` auto-reset after preview completes

**Safety guarantees:**
- Real publish paths completely unchanged (dryRun defaults to false/undefined)
- Preview only fires when BOTH checkboxes are checked (previewDispatch alone does nothing)
- Status transitions (draft→active) never trigger preview — only manual forceRedispatch

**Files Changed:**
- `src/lib/channelDispatch.ts` — `resolvePreviewCaption()` + dryRun option in orchestrator
- `src/collections/Products.ts` — `previewDispatch` field + hook logic + Telegram notification

**Status:**  
ACTIVE — Phase G complete

---

## D-136 — Phase I: Mentix Group Onboarding — Safe Group Filtering — IMPLEMENTED
**Date:** 2026-04-08  
**Decision:**  
Add two safety gates to the Telegram bot so it can safely operate inside the Mentix group without reacting to background chatter.

**Problem:**
The bot had NO chat-type filtering. Adding it to the Mentix group would cause it to process every photo, text, and caption in the group — potentially creating products, triggering wizards, or sending confusing replies.

**Implementation:**
1. **Command-only filter** (line 1293): In group/supergroup chats, only messages starting with `/` are processed. Photos, plain text, wizard input, and captions are silently ignored.
2. **Group allowlisting** (line 1308): After `getPayload()`, group commands are checked against:
   - `telegram.groupEnabled` must be `true` in AutomationSettings
   - Sender's `from.id` must be in `telegram.allowedUserIds` (if the list is non-empty)
   - Fail-closed: if settings can't be read, group messages are dropped
3. **DM behavior unchanged**: Private chat messages bypass both gates entirely.
4. **Callback queries unchanged**: Inline button clicks (imagegen mode selection etc.) are handled before the message section and are not affected.

**DB changes (Neon):**
- `telegram_group_enabled` set to `true`
- `telegram_allowed_user_ids` set to `5450039553` (Furkan)

**Files Changed:**
- `src/app/api/telegram/route.ts` — Two guard blocks after chatId/messageId extraction

**Status:**  
ACTIVE — Phase I complete, extended by Phase K (D-137)

---

## D-137 — Phase K: @Mention + Reply-to-Bot Activation in Groups — IMPLEMENTED
**Date:** 2026-04-08  
**Decision:**  
Extend group activation filter to support natural interaction patterns beyond slash commands.

**Problem:**
Group operation was limited to slash commands only. Operators needed more natural ways to activate the bot — mentioning it or replying to its messages — while still ignoring background chatter.

**Implementation:**
Gate 1 (activation filter) now allows three triggers in group chats:
1. **Slash commands** — `/preview`, `/pipeline`, `/stok`, etc. (unchanged from Phase I)
2. **@Uygunops_bot mention** — detected via Telegram `entities` array, both `mention` (public username) and `text_mention` (users without usernames) types checked
3. **Reply to bot message** — `reply_to_message.from.id === BOT_ID` (8702872700)

Gate 2 (allowlisting) applies equally to all three activation types.

**What is now allowed in group (from allowed user):**
- `/preview 180`
- `@Uygunops_bot stok bilgisi`
- Reply to bot's message with any text

**What is still ignored in group:**
- Plain text without mention/command/reply
- Photos without explicit activation
- Messages from non-allowlisted users (even with @mention or reply)

**Constants:**
- `BOT_ID = 8702872700`
- `BOT_USERNAME_LC = 'uygunops_bot'`

**Files Changed:**
- `src/app/api/telegram/route.ts` — Gate 1 block expanded (lines 1293-1319)

**Status:**  
ACTIVE — Phase K complete, extended by Phase L (D-138)

---

## D-138 — Phase L: Mention Normalization for Group Command Routing — IMPLEMENTED
**Date:** 2026-04-08  
**Decision:**  
Add a text normalization step after both safety gates pass in group chats, before command routing, so mention-prefixed commands behave identically to direct slash commands.

**Problem:**
`@Uygunops_bot /preview 180` passed the activation gate (Phase K) but `text.startsWith('/preview')` failed because raw text still contained the mention prefix. Similarly, Telegram's inline suffix format `/preview@Uygunops_bot 180` also failed.

**Implementation:**
After both gates (activation + allowlisting) pass, in group chats only:
1. Strip leading `@uygunops_bot` prefix + trailing whitespace
2. Strip inline `@uygunops_bot` anywhere (handles `/cmd@bot` suffix)
3. Case-insensitive
4. `text` changed from `const` to `let` to allow reassignment
5. DM text is never modified

**Patterns now working in group:**
- `/preview 180` → `/preview 180`
- `@Uygunops_bot /preview 180` → `/preview 180`
- `@Uygunops_bot    /preview 180` → `/preview 180`
- `/preview@Uygunops_bot 180` → `/preview 180`
- `@UYGUNOPS_BOT /stok` → `/stok`

**What happens with @mention + free text (no command):**
- `@Uygunops_bot bu kaç lira` → `bu kaç lira` → no handler matches → falls through harmlessly

**Files Changed:**
- `src/app/api/telegram/route.ts` — Normalization block (lines 1352-1364), `text` const→let

**Status:**  
ACTIVE — Phase L complete

---

## D-139 — Multi-Bot Support: Geo_bot (@Geeeeobot) Webhook Integration — IMPLEMENTED
**Date:** 2026-04-08  
**Decision:**  
Add multi-bot support so Geo_bot (`@Geeeeobot`, ID `8728094008`) shares the same webhook handler as Uygunops_bot, differentiated by `?bot=geo` URL query parameter.

**Problem:**
Geo_bot existed as a separate Telegram bot but had no webhook, no code support, and was not in the Mentix group. The intended operating model requires Geo_bot to function as a full operator agent in the Mentix group with near-DM-equivalent capability.

**Implementation:**
1. Module-level `_requestBotToken` variable + `getBotToken()` helper for per-request bot token scoping
2. `?bot=geo` URL parameter selects Geo_bot token from `TELEGRAM_GEO_BOT_TOKEN` env var
3. Webhook secret validation falls back: `TELEGRAM_GEO_WEBHOOK_SECRET` → `TELEGRAM_WEBHOOK_SECRET`
4. All 5 helper functions (`sendTelegramMessage`, `sendTelegramMessageWithKeyboard`, `editMessageText`, `answerCallbackQuery`, `downloadTelegramFile`) updated to use `getBotToken()`
5. `BOT_ID` and `BOT_USERNAME_LC` resolved dynamically based on `botParam`
6. `BOT_MENTIONS` regex extended to include `@Geeeeobot`/`@geeeeobot`
7. Geo_bot webhook set to `https://www.uygunayakkabi.com/api/telegram?bot=geo` with shared secret_token
8. Geo_bot added to Mentix group, privacy mode disabled (`can_read_all_group_messages: true`)

**Validation (7 tests passed):**
- `getMe` identity check ✅
- `/preview 180` slash command in group ✅
- `@Geeeeobot /preview 180` mention+command in group ✅
- Plain text in group — silent ✅
- `/preview 180` via DM ✅
- Reply-to-bot command in group ✅
- Cross-bot isolation (`@Uygunops_bot` mention → Geo_bot stays silent) ✅

**Files Changed:**
- `src/app/api/telegram/route.ts` — Multi-bot token resolution, dynamic BOT_ID/BOT_USERNAME_LC, getBotToken() pattern
- Vercel env: `TELEGRAM_GEO_BOT_TOKEN` added to all environments

**Status:**  
ACTIVE — Multi-bot operational

---

## D-140 — Phase N: Bot Role Separation (Geo_bot=Group, Uygunops=DM) — IMPLEMENTED
**Date:** 2026-04-08  
**Decision:**  
Enforce a clean context separation between the two bots to prevent overlap and operator confusion. Geo_bot owns group context exclusively; Uygunops owns DM context exclusively.

**Problem:**
After D-139 multi-bot support, both bots shared the identical command surface. Any command sent to either bot in any context (DM or group) would be processed identically. This creates: duplicate responses if both bots are in the same group, operator confusion about which bot to address, and no clear ownership boundary.

**Role Assignment:**

| Bot | Context | Behavior |
|-----|---------|----------|
| Geo_bot (@Geeeeobot) | Group chat | ACTIVE — full command surface |
| Geo_bot (@Geeeeobot) | Private DM | REDIRECTS — sends Turkish message directing operator to @Uygunops_bot |
| Uygunops (@Uygunops_bot) | Private DM | ACTIVE — full command surface |
| Uygunops (@Uygunops_bot) | Group chat | SILENT — logged and ignored |

**Implementation:**
Two surgical gates added to `route.ts`:
1. **Message gate** (after chat type detection, before Phase I group gates):
   - `botParam === 'geo' && !isGroupChat` → send redirect, return
   - `botParam !== 'geo' && isGroupChat` → log, silently return
2. **Callback gate** (inside callback_query handler, before any callback processing):
   - Same logic applied to `cbChatType`
   - Geo_bot DM callbacks → answerCallbackQuery with redirect text
   - Uygunops group callbacks → silently acknowledge

**Commands owned by each bot (same set, different context):**
- All 17 slash commands: /preview, /pipeline, /diagnostics, /stok, /audit, /content, /confirm, /activate, /merch, /shopier, /story, /restory, /targets, /approve_story, /reject_story, /confirm_cancel, /start
- All hashtag triggers: #gorsel, #geminipro, #karma, #premium, #dengeli
- All callback queries: imagegen, imgapprove, imgreject, imgregen, imgpremium, wz_cat, wz_ptype, wz_tgt, wz_size, wz_confirm, wz_cancel, storyapprove, storyreject, storyretry
- STOCK batch text input
- Photo/media intake

**Validation (8 tests, all passed):**
1. Uygunops DM /preview 180 → processed ✅
2. Uygunops GROUP /preview 180 → silently ignored ✅
3. Geo_bot GROUP /preview 180 → processed ✅
4. Geo_bot DM /preview 180 → redirect message sent ✅
5. Geo_bot GROUP @mention → processed ✅
6. Geo_bot GROUP plain text → silent (Phase I gate) ✅
7. Geo_bot GROUP callback → processed ✅
8. Uygunops DM callback → processed ✅

**Files Changed:**
- `src/app/api/telegram/route.ts` — Two Phase N gate blocks (messages + callbacks)

**Status:**  
ACTIVE — Bot role separation enforced

---

## D-141 — Vercel Build Optimization: ignoreCommand for Docs-Only Commits — IMPLEMENTED
**Date:** 2026-04-09  
**Decision:**  
Add a Vercel `ignoreCommand` that skips builds when only non-runtime files changed, reducing unnecessary build usage by ~40%.

**Problem:**
Every push to main triggers a Vercel build, even for docs-only commits. 8 of last 20 commits were docs-only, each wasting a full Next.js build cycle.

**Implementation:**
- `scripts/should-build.sh` — compares `VERCEL_GIT_PREVIOUS_SHA` to `VERCEL_GIT_COMMIT_SHA`
- `vercel.json` — `"ignoreCommand": "bash scripts/should-build.sh"`
- Exit 0 = skip, Exit 1 = build

**Runtime paths (always build):** `src/`, `public/`, `payload.config.ts`, `next.config.ts`, `tsconfig.json`, `package.json`, `package-lock.json`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vercel.json`, `seed.ts`, `.npmrc`

**Non-runtime paths (safe to skip):** `project-control/`, `ai-knowledge/`, `docs/`, `mentix-memory/`, `mentix-skills/`, `n8n-workflows/`, `scripts/`, `media/`, root `.md`/`.html`/`.docx` files

**Safety:** No previous SHA → always builds. Empty diff → always builds. Mixed commits → always builds.

**Validation:** 6 tests against real commit pairs — all correct.

**Files Changed:**
- `scripts/should-build.sh` (new)
- `vercel.json` (added ignoreCommand)

**Status:**  
ACTIVE

---

## D-142 — Phase O: Group Workflow Parity — Gate Fixes for Hashtags, Captions, STOCK — IMPLEMENTED
**Date:** 2026-04-09  
**Decision:**  
Fix three gaps in the group activation gate (Phase I/K) that prevented Geo_bot from handling operator workflows with DM-equivalent parity in the Mentix group.

**Problem:**
Phase I/K gate only passed messages through if they were: (1) slash commands, (2) @mention of bot, or (3) reply-to-bot. This blocked legitimate operator workflows in group context:
- `#gorsel 180` — hashtag trigger, not a slash command → blocked
- Photo + `@Geeeeobot` in caption → mention in `caption_entities` not checked (only `entities`) → blocked  
- `STOCK SKU:...` — batch stock update, not a slash command → blocked

**Fixes applied:**
1. **caption_entities**: Gate now merges `message.entities` + `message.caption_entities` before checking for @mentions. Photos with `@Geeeeobot` in caption now pass the gate.
2. **Hashtag triggers**: Added `isHashtagTrigger` check — `#gorsel`, `#geminipro`, `#luma`, `#chatgpt`, `#claid` now pass the gate without needing @mention.
3. **STOCK prefix**: Added `isStockCommand` check — `STOCK SKU:` messages now pass the gate.

**Intentionally NOT changed:**
- `onayla`/`reddet`/`yeniden üret` approval commands still require reply-to-bot in group — this is correct because they are contextual (operator replies to a specific preview message)
- Plain text still blocked — prevents background chatter from activating the bot
- Plain photos (no caption, no mention) still blocked — prevents random photo spam from triggering intake

**Known limitation (documented, not fixed):**
- `/confirm` wizard uses `chatId` as session key. In group, `chatId` = group ID (shared by all users). Only one wizard session can be active at a time in the group, and any user's text input will be intercepted by it. Fixing this requires refactoring the session key to include `userId` — deferred to a future phase.

**Validation (8 scenarios post-fix + 4 real-data tests):**

| # | Scenario | Expected | Result |
|---|----------|----------|--------|
| RT1a | Plain photo, no caption | SILENT | ✅ Silent |
| RT1b | Photo + @Geeeeobot caption_entities | PROCESS | ✅ Passes gate |
| RT1c | Photo + #gorsel caption | PROCESS | ✅ Passes gate |
| RT2a | #gorsel 180 (no mention) | PROCESS | ✅ Passes gate |
| RT3 | /confirm 180 (slash) | PROCESS | ✅ Passes gate |
| RT4 | STOCK SKU:... (no mention) | PROCESS | ✅ Passes gate |
| RT5a | onayla (no reply-to-bot) | SILENT | ✅ Silent |
| RT5b | onayla (reply-to-bot) | PROCESS | ✅ Passes gate |
| RT6 | Plain text | SILENT | ✅ Silent |
| Real | /preview 180 | PROCESS | ✅ Full response |
| Real | #gorsel 180 | PROCESS | ✅ Full response |
| Real | /stok 180 | PROCESS | ✅ Full response |

## D-143 — Phase P: Group Wizard Session Isolation (chatId:userId keying) — IMPLEMENTED
**Date:** 2026-04-09  
**Decision:**  
Refactor wizard session keying from `chatId`-only to `chatId:userId` so group-based wizard flows are isolated per operator.

**Problem:**
In group context, `chatId` = group chat ID, shared by all members. The old `Map<string, WizardState>` keyed by `String(chatId)` meant only one wizard session could exist per group at a time. Any user typing text would have their input consumed by whatever wizard was active — even if a different operator started it.

**Solution:**
- Added `sessionKey(chatId, userId?)` helper that produces `chatId:userId` when userId is provided, or `chatId` alone as fallback.
- Updated `getWizardSession`, `setWizardSession`, `clearWizardSession` to accept optional `userId` param.
- Added `userId?: number` field to `WizardState` interface.
- In `route.ts`, extracted `msgUserId` (from `message.from?.id`) and `cbUserId` (from `callbackQuery.from?.id`) at handler entry points, passed to all 36 wizard session call sites.

**Behavior:**
- Group: each operator gets their own wizard session → `key = "-5197796539:111"` vs `"-5197796539:222"`
- DM: userId still passed → `key = "5450039553:5450039553"` — functionally equivalent to old behavior
- No breaking change: if userId is somehow undefined, falls back to chatId-only key

**Files changed:**
- `src/lib/confirmationWizard.ts` — sessionKey helper, updated function signatures, WizardState.userId
- `src/app/api/telegram/route.ts` — cbUserId/msgUserId variables, 36 call site updates

**Commit:** `61a210c`  
**Status:** VERIFIED (Phase Q validation 2026-04-09)

**Phase Q Validation (2026-04-09):**
Dual-method validation — local unit tests + production webhook simulation.

*Unit Tests (28/28 passed):*
- Session key generation: group keys include userId, different users get different keys
- Interference test: User B has NO session when only User A started wizard
- Concurrent wizards: User A (product 231) and User B (product 230) coexist independently
- Cross-contamination: User A advancing does not affect User B's step/state
- Clear isolation: clearing User A's session leaves User B's intact
- DM regression: DM wizard creates/works correctly, independent from group
- Fallback: no-userId key backward compatible, separate from userId-keyed sessions

*Production Webhook Simulation:*
- 12 webhook calls to live Vercel endpoint (www.uygunayakkabi.com/api/telegram?bot=geo)
- All returned HTTP 200 with `{"ok":true}`
- Vercel logs confirmed: External API calls to api.telegram.org/sendMessage returned 200
- User B (9999999999) temporarily added to allowlist for gate-bypass testing, then restored
- No crashes, no 500s, no unhandled exceptions across full test sequence

**Status:**  
ACTIVE — Group parity achieved

## D-144 — Phase R: Command Ownership Split (Ops Bot vs GeoBot) — IMPLEMENTED
**Date:** 2026-04-09  
**Decision:**  
Add command-level ownership routing so each Telegram bot only handles its designated workflow domain. Wrong-bot commands get a clear Turkish redirect message instead of executing.

**Ownership Model:**

| Owner | Commands | Callbacks |
|-------|----------|-----------|
| Ops Bot (Uygunops) | `/confirm`, `/confirm_cancel`, `/stok`, `/diagnostics`, `#gorsel`, `#geminipro`, `#luma`*, `#chatgpt`*, `#claid`*, `STOCK SKU:` | `imagegen:`, `imgapprove:`, `imgreject:`, `imgregen:`, `imgpremium:`, `wz_*` |
| GeoBot | `/content`, `/audit`, `/preview`, `/activate`, `/shopier`, `/merch`, `/story`, `/restory`, `/targets`, `/approve_story`, `/reject_story` | `storyapprove:`, `storyreject:`, `storyretry:` |
| Shared | `/pipeline` | — |

*Deactivated providers still show deactivation message via Ops Bot.

**Redirect messages:**
- Ops cmd on GeoBot → "📌 Bu komut @Uygunops_bot üzerinden çalışır. DM'den deneyin."
- Geo cmd on Uygunops → "📌 Bu komut GeoBot üzerinden çalışır. Mentix grubunda @Geeeeobot ile deneyin."
- Callback mismatch → toast via answerCallbackQuery with same messaging

**Implementation:**
- Two gate blocks added to `route.ts` (66 lines, purely additive):
  1. Message handler: after Phase L normalization, before wizard interceptor
  2. Callback handler: after Phase N gate, before callback routing
- No schema changes
- Server-side auto-trigger of content generation after `/confirm` remains intact (fires at Payload level)

**Validation (18 webhook tests):**
- 5 ops cmds on GeoBot: all redirected ✅
- 6 geo cmds on Uygunops: all redirected ✅
- 2 shared `/pipeline` on both: processed normally ✅
- 2 ops cmds on Uygunops: processed normally ✅
- 3 geo cmds on GeoBot: processed normally ✅

**Commit:** `37d9b52`  
**Status:** IMPLEMENTED

## D-145 — Phase S: GeoBot Visible Handoff (Operator Notifications) — IMPLEMENTED
**Date:** 2026-04-09  
**Decision:**  
Make the two-bot workflow visible to operators. After Ops Bot confirms a product, GeoBot visibly takes over by sending notifications to the Mentix group. Content generation results (ready or failed) are also reported by GeoBot.

**What Changed:**

1. **`route.ts` — `sendTelegramMessageAs` helper** (new):
   - Sends Telegram messages using an explicit bot token (not the per-request `_requestBotToken`)
   - Used for cross-bot notifications where GeoBot sends during an Ops Bot request

2. **`route.ts` — `wz_confirm:` success handler** (modified):
   - After Ops Bot sends confirmation success, GeoBot sends a handoff notification to Mentix group
   - Message: "📦 Ürün #X — GeoBot devir aldı" with next-step commands (`/content`, `/audit`, `/preview`)
   - Uses `TELEGRAM_GEO_BOT_TOKEN` env var directly

3. **`contentPack.ts` — `notifyGeoBot` helper** (new):
   - Sends Telegram messages as GeoBot using `TELEGRAM_GEO_BOT_TOKEN`
   - Mentix group ID constant: `-5197796539`

4. **`contentPack.ts` — content completion notifications** (new):
   - On `content.ready`: GeoBot notifies Mentix with pack status and next steps (`/audit`, `/preview`, `/activate`)
   - On content failure: GeoBot notifies Mentix with error summary and retry command

**Operator Experience (before → after):**
- Before: Ops Bot says "Geobot içerik üretimi tetiklendi" — but nothing visible from GeoBot
- After: GeoBot sends handoff message, then reports content results with actionable next steps

**No schema changes.** No new env vars (uses existing `TELEGRAM_GEO_BOT_TOKEN`).

**Validation (9 tests):**
- GeoBot token valid, username correct ✅
- GeoBot can send to Mentix group ✅
- 6 webhook routing tests (Phase R gates intact) ✅

**Commit:** `41ae58d`  
**Status:** IMPLEMENTED

## D-146 — Phase T1: Title + Stock Code Wizard Steps + /confirm Nudge — IMPLEMENTED
**Date:** 2026-04-09  
**Decision:**  
Improve the intake package quality before GeoBot handoff by collecting the real product title and operator's stock code during the confirmation wizard, and prompting the operator to start `/confirm` after image approval.

**Problem:**
- 96% of Telegram products (136/141) still had placeholder titles ("Taslak Ürün DD/MM-XXXX")
- GeoBot was generating content from meaningless titles
- Operator's own stock code was never captured (auto-generated TG-xxx only)
- After image approval, no prompt to continue with `/confirm`

**Changes:**

1. **`confirmationWizard.ts`** — Two new wizard steps:
   - `title`: Asks for real product name if current title starts with "Taslak Ürün". Min 5 chars. Written to `product.title` in `applyConfirmation()`
   - `stockCode`: Asks for operator's stock code. Written to `product.sku` field. Operator can type `-` to skip (preserves auto-generated TG-xxx SKU). Min 2 chars if not skipping
   - Both steps come FIRST in the wizard sequence (before category)
   - `sku` added to `ConfirmableProduct` interface
   - Summary now shows stock code
   - New prompt builders: `getTitlePrompt()`, `getStockCodePrompt()`

2. **`route.ts`** — Wizard text input handlers + nudge:
   - Text input handlers for `title` and `stockCode` with full next-step dispatch
   - `/confirm` nudge appended to image approval success message: "📋 Sonraki adım: /confirm {id}"
   - Ready check now uses `getNextWizardStep` to catch title/stockCode even when traditional required fields are present

**Wizard flow (updated):**
title → stockCode → category → productType → price → sizes → stock → brand → targets → summary → confirm

**Operator stock code → `sku` field rationale:**
- `sku` field is editable (not readOnly), labeled "SKU / Stok Kodu", accepts text
- `stockNumber` (SN0001-SN9999) is readOnly, auto-generated, for AI image rendering — left untouched
- Auto-generated TG-xxx SKU preserved if operator skips with `-`
- `sku` has `unique: true` constraint — duplicate entries will fail at DB level (acceptable risk for small operator team)

**No schema changes.** Uses existing `sku` and `title` fields.

**Validation (9 webhook tests):**
- /confirm starts wizard with title step ✅
- Title text accepted ✅
- Stock code skip (`-`) accepted ✅
- Wizard cancel works ✅
- Already-confirmed product handling ✅
- Short title rejection ✅
- Phase R routing still intact ✅

**Commit:** `bb8220e`  
**Status:** IMPLEMENTED

## D-147 — Phase T2: One-Tap Wizard Launch After Image Approval — IMPLEMENTED
**Date:** 2026-04-09  
**Decision:**  
Replace the plain-text `/confirm` nudge after image approval with an inline keyboard button that launches the confirmation wizard in one tap.

**Problem:**
Operators had to manually type `/confirm {id}` after approving images. Non-technical operators might forget or not know the command.

**Changes:**

1. **Image approval success message**: Changed from `sendTelegramMessage` to `sendTelegramMessageWithKeyboard` with inline button:
   - Button text: "📋 Bilgileri Gir → Onaya Gönder"
   - Callback data: `wz_start:{productId}`

2. **New `wz_start:{productId}` callback handler** (~110 lines):
   - Same logic as `/confirm {id}`: visual gate, already-confirmed check, field check
   - Starts wizard at the correct first step (title/stockCode/category/etc.)
   - If all fields present → straight to summary
   - Full error handling with user-facing Turkish messages

3. **`wz_start:` added to `OPS_CB_PREFIXES`** for Phase R routing compatibility

**Manual `/confirm {id}` remains fully functional** — the button is a convenience layer, not a replacement.

**No schema changes.**

**Validation (9 webhook tests):**
- wz_start for approved product → wizard starts ✅
- Title input via button-launched wizard ✅
- Already-confirmed product handled ✅
- Nonexistent product handled ✅
- Phase R redirect for GeoBot ✅
- Manual /confirm still works ✅
- Invalid ID handled ✅

**Commit:** `16ce89f`  
**Status:** IMPLEMENTED

## D-148 — Phase U: GeoBot One-Tap Post-Handoff Flow — IMPLEMENTED
**Date:** 2026-04-09  
**Decision:**  
Make the GeoBot post-handoff workflow button-driven. After content generation, operators navigate through audit → activate via inline buttons instead of memorizing slash commands.

**Changes:**

1. **`sendTelegramMessageAs` / `notifyGeoBot`**: Both now accept optional `keyboard` parameter for inline buttons
2. **GeoBot handoff message** (route.ts wz_confirm): Now shows "📋 İçerik Durumu" button
3. **Content-ready notification** (contentPack.ts): Now shows "🔍 Audit Başlat", "📋 İçerik Durumu", "🚀 Yayına Al" buttons
4. **Content-failed notification** (contentPack.ts): Now shows "🔄 Tekrar Dene", "📋 İçerik Durumu" buttons
5. **5 new GeoBot callback handlers** (route.ts):
   - `geo_content:{id}` — content status via `formatContentStatusMessage`
   - `geo_audit:{id}` — audit status via `formatAuditStatusMessage`
   - `geo_auditrun:{id}` — trigger audit via `triggerAudit`, shows "🚀 Yayına Al" on approval
   - `geo_activate:{id}` — product activation with publish readiness check
   - `geo_retry:{id}` — content re-generation via `triggerContentGeneration`
6. **`GEO_CB_PREFIXES`** updated: `geo_content:`, `geo_audit:`, `geo_auditrun:`, `geo_activate:`, `geo_retry:`

**Full button-driven publish workflow:**
GeoBot handoff → "📋 İçerik Durumu" → (content ready) → "🔍 Audit Başlat" → (audit approved) → "🚀 Yayına Al" → product live

**All slash commands remain as manual fallbacks.**

**No schema changes.**

**Validation (9 webhook tests):**
- geo_content, geo_audit, geo_auditrun, geo_activate, geo_retry — all functional ✅
- Nonexistent product handling ✅
- Phase R redirect for Ops Bot ✅
- Manual /content still works ✅
- GeoBot keyboard send to Mentix group ✅

**Commit:** `bf7e175`  
**Status:** IMPLEMENTED
