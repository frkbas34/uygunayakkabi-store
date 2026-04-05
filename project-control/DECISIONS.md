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
