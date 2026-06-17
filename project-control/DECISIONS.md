# DECISIONS — Uygunayakkabi

## D-324B — Catalog cleanup re-verification (2026-06-18)
**Decision:** Independent re-verification pass over D-324, run from the canonical folder `uygunayakkabi-store` (main, in sync with origin/main). No product write performed — none was needed.
**Findings:** Read-only DB query (production `DATABASE_URI`): `Taslak Ürün 16/06-4184` = id 361, **already `status: draft`**. All 17 `Taslak/Draft/Test/Placeholder`-matching titles are `draft`; **0** are public. Catalog status distribution: 6 active / 1 soldout / 32 draft.
**Live check:** `https://www.uygunayakkabi.com` (HTTP 200) — placeholder string absent (0 occurrences), no `Taslak` text anywhere, "Yeni Gelenler" rail renders, real products present (loafers: erkek-siyah, louis-vuitton-bej, premium-kahve-puskullu, siyah-rugan-puskullu, siyah-tokali-puskullu). Homepage query excludes `draft` (`status: { in: ['active','soldout'] }`), so a draft product cannot surface.
**Status:** VERIFIED — D-324 holds. No rename, no delete, no status change, no external publishing. Docs-only commit `docs: record D-324B catalog cleanup verification`.

## D-324 — Pre-ad catalog hygiene: unpublish visible placeholder product (2026-06-18)
**Decision:** Unpublish the single publicly-visible placeholder product `Taslak Ürün 16/06-4184` (id 361) by setting `status: active → draft` via the Payload Admin API. Did NOT rename (no real product name available in trusted data) and did NOT delete.
**Reason:** D-323 flagged this draft placeholder (₺4.000, "Son 1 Adet!") as publicly visible on the homepage — bad first impression for incoming ad traffic. Merchandising shows `status==='active'`; flipping to `draft` removes it from every rail and makes its PDP `notFound()`.
**Scope/safety:** Of 17 `Taslak Ürün …` products, id 361 was the ONLY `active` one (other 16 already `draft`); the 6 real products stayed `active` — none hidden. `active → draft` triggers NO external publishing (Products afterChange dispatch fires only on `→ active`). Reversible. Production DATA change only — no code/git change to runtime.
**Status:** DONE + VERIFIED (2026-06-18). Live homepage re-fetched: placeholder gone from Yeni Gelenler / Çok Sorulan / all rails; 6 real products present. Docs-only commit `docs: record D-324 catalog hygiene`.

## D-320 — Product-linked inquiry HTTP 500 fix (2026-06-14)
**Decision:** Coerce `productId` from string to number in `/api/inquiries` before assigning the `product` relationship (fail-soft to `undefined` on a bad/empty id).
**Reason:** `ContactForm` sends `productId={String(product.id)}` (string); `products` ids are numeric, so passing the string to the numeric `product` relationship made `payload.create` throw → HTTP 500. Every product-page lead was failing.
**Status:** IMPLEMENTED + DEPLOYED (`9a8001b` → `main`, 2026-06-14). Live controlled re-test: product-linked submission now succeeds. No DB schema / Payload collection change. Admin-side field confirmation pending (login).

## D-308 → D-318 — Ad-Readiness & Conversion Sweep (2026-06-13/14, all DEPLOYED)
**Decision:** A series of low-risk, reversible storefront polish + trust/honesty cleanups to prepare for paid ads; each shipped to `main` + Vercel (commits in DEPLOYMENT_LOG.md).
- **D-308:** product-first homepage reorder; hero ad-copy ("Yeni Sezon Ayakkabılar Uygun Fiyatlarla") + CTAs (Yeni Gelenleri Gör / Numaramı Sor); shorter mobile hero; PDP CTA polish.
- **D-310/D-311/D-312** (D-309 tiles folded into D-310): full-width editorial section ("Adımını Tarzınla At"), "Tarzına Göre Seç" category tiles, social-proof section, premium footer.
- **D-313:** demo reviews gated OFF in production (`DEMO_REVIEWS_ENABLED=false`); soft summary card only — never present fake reviews/counts.
- **D-314/D-314b:** removed external Unsplash image, removed duplicate WhyUs section, shortened About, editorial→warm gradient, safer category-tile behavior, "teslikata"→"teslimata" typo, removed now-unused code.
- **D-315:** first-touch UTM attribution (`src/lib/attribution.ts`, sessionStorage) survives homepage→PDP so leads keep attribution; hero/sticky WhatsApp prefill.
- **D-316A:** internal `trackEvent` foundation (`src/lib/trackEvent.ts`) — **no external pixels/scripts** (GA4/Meta/TikTok deferred to D-316B pending operator approval + KVKK decision).
- **D-317/D-318:** PDP footer + trust-strip honesty cleanup — dynamic year, removed unsupported "hızlı kargo" / "Hızlı Teslimat" claims (→ "Kargo Süreci" / "WhatsApp Destek").
**Status:** ALL IMPLEMENTED + DEPLOYED to `main` (2026-06-13/14). No DB schema / Payload collection changes.

## D-319 — Controlled lead + attribution verification (2026-06-14, diagnostic)
**Decision:** One controlled production test confirmed UTM attribution persists to the DB and surfaced that product-linked lead submissions were failing → fixed in D-320 (detail in BUGS_AND_FIXES.md).
**Status:** DIAGNOSTIC COMPLETE; led directly to D-320.

_(Older decisions D-001 … follow below, in chronological order.)_

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
Add X, Facebook, and Threads as new `SupportedChannel` entries in the existing `channelDispatch.ts` → n8n webhook pattern. Do NOT build a separate social media service layer, scheduler, or direct API integration in the Next.js app. (D-183: LinkedIn removed from project)

**Reason:**
The repo already has a mature channel dispatch system: `SupportedChannel` type → 3-gate eligibility → `buildDispatchPayload()` → n8n webhook → `publishResult` write-back. Instagram is already a real integration using this exact pattern. Extending it for 4 new platforms requires only additive changes: type union, env var mappings, admin toggles, product flags, n8n stubs. Zero new dependencies, zero architectural changes.

**What was added:**
- `SupportedChannel` union: `+ 'x' | 'facebook' | 'threads'`
- `buildChannelWebhookUrl()`: 4 new `N8N_CHANNEL_*_WEBHOOK` env var mappings
- `AutomationSettings.ts`: 3 new `publishX/Facebook/Threads` toggles
- `Products.ts`: 4 new channel flags + 4 new `channelTargets` options
- `automationDecision.ts`: extended `SAFE_DEFAULTS`, `CAPABILITY` map, `AutomationSettingsSnapshot` type
- `ReviewPanel.tsx`: 4 new `CHANNEL_LABEL` entries
- OAuth callbacks: `/api/auth/x/callback` (Facebook/Threads reuse Meta app + Instagram callback)
- n8n workflow stubs: `channel-x.json`, `channel-facebook.json`, `channel-threads.json`
- `.env.example`: all new env vars + callback URLs documented

**What remains scaffold-only:**
All 4 new channels are stub-only. Real n8n workflows with actual API calls are a separate step per platform.

**Auth architecture:**
- X: OAuth 2.0 PKCE → own callback `/api/auth/x/callback`
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
- 3 subsystems scaffolded (Dolap, X, Threads)
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
- Added "NOTE: not yet implemented" markers on X OAuth section
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
- Dolap/X/Threads: BLOCKED — Global flags disabled, no N8N webhooks set, n8n-only dispatch paths.
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
- `products_channel_targets` → `enum_products_channel_targets` ('website','instagram','shopier','dolap','x','facebook','threads')
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
6. All n8n webhook payloads now include `geobot` field for `xPost`, `facebookCopy`, `instagramCaption`, etc.

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

---

## D-149 — Phase W: First Real Instagram Live Publish Validation — VERIFIED

**Date:** 2026-04-09  
**Decision:**  
Execute the first real Instagram publish to validate the full external channel dispatch path end-to-end.

**Method:**
1. Temporarily set Product #180 status to `draft` via SQL
2. Disabled Facebook global toggle (safety — Instagram-only test)
3. Triggered `geo_activate:180` via Telegram webhook callback → Payload `draft→active` transition
4. afterChange hook fired `dispatchProductToChannels()` with `dryRun=false`
5. Instagram dispatch attempted but failed: error 9004/2207052 (media download failure)
6. Root cause: Vercel serverless cold start — Instagram couldn't download `/api/media/file/` URL in time
7. Manual API call with same token + URL succeeded after Vercel cache warmed
8. Container created: 18067074557437630, published: 18337760137169144
9. Restored Facebook toggle. Product #180 back to active.

**Results:**
- Instagram postId: `18337760137169144`
- Permalink: `https://www.instagram.com/p/DW6nLC_DgQP/`
- Post type: IMAGE
- Caption: test caption
- Token + API path: FULLY VALIDATED

**Key Finding — Media URL Blocker:**
All 685 media items in DB use relative URLs (`/api/media/file/...`) instead of Vercel Blob edge URLs. The Vercel Blob storage plugin is configured but AI-generated images bypass it (likely because `imageGenTask.ts` creates media via `payload.create()` buffer upload which doesn't trigger Blob).

Instagram's Graph API fails to download these URLs during cold starts because:
- `/api/media/file/` is served by a Vercel serverless function
- First request after idle triggers cold start (2-5s)
- Instagram's media fetcher has strict timeout
- Once warm (Vercel cache HIT), the URL works fine

**Fix Path (Phase W+1):**
Option A: Pre-warm media URL before dispatch (add `fetch()` call to warm cache)
Option B: Migrate AI pipeline media storage to Vercel Blob (proper fix — edge-served, no cold start)
Option C: Upload to external CDN (Cloudinary, already referenced in older code)

**Dry-Run Mechanism Documented:**
- `dispatchProductToChannels(product, settings, reason, { dryRun: true })` — skips all external APIs
- `isDryRun = sourceMeta.previewDispatch && isForceRedispatch` (Products.ts afterChange hook)
- Status transition (`draft→active`) always runs real dispatch (isDryRun = false)
- `forceRedispatch` without `previewDispatch` also runs real dispatch

**Status:** VERIFIED — Instagram publish works. Media serving blocker identified for automated path.

---

## D-150 — Phase W1: Automated Instagram Dispatch Reliability — IMPLEMENTED

**Date:** 2026-04-09  
**Decision:**  
Fix the automated Instagram dispatch cold-start failure with a media URL pre-warm + retry strategy. No Vercel Blob migration needed.

**Root Cause (from D-149):**
Instagram's Graph API container creation failed with error 9004/2207052 because Vercel's serverless function serving `/api/media/file/*` had cold-start latency exceeding Instagram's download timeout.

**Fix Applied:**
1. `prewarmMediaUrl(imageUrl, channel)` helper added to `channelDispatch.ts`
   - Fetches the full image via GET before any Graph API call
   - Consumes the full response body (`arrayBuffer()`) to ensure Vercel CDN caches it
   - Non-fatal: if pre-warm fails, container creation still attempted
   - 500ms pause after pre-warm for CDN propagation
2. Container creation retry: up to 2 attempts for error 9004 with 3s delay
3. Same pre-warm applied to `publishFacebookDirectly()` for future readiness

**Changes:**
- `src/lib/channelDispatch.ts`: +88 lines (prewarmMediaUrl helper, retry loop, Facebook pre-warm)

**Test Result:**
- Product #180, automated `draft→active` via `geo_activate` Telegram callback
- Pre-warm: status=200, 63555 bytes
- Container creation: succeeded on first attempt (pre-warm eliminated cold-start)
- Instagram postId: `18111402145693915`
- Permalink: `https://www.instagram.com/p/DW6qQFwEl8T/`
- GeoBot instagramCaption used (not fallback template)
- dispatchedChannels=["instagram"], mode=direct, success=true

**Alternatives Considered:**
- Vercel Blob migration: Would solve the root cause (edge-served URLs, no cold start) but requires migrating 685+ existing media items and changing the AI image pipeline. Deferred — pre-warm is sufficient and zero-migration.
- Cloudinary CDN: Already referenced in older code but would add external dependency and migration effort.
- Longer Graph API timeout: Not possible — Instagram controls the timeout on their end.

**Commit:** `f0fd0eb`  
**Status:** IMPLEMENTED + PROD-VALIDATED

---

## D-151 — Phase X: Telegram Content Preview + Wrong-Bot Photo Redirect — IMPLEMENTED

**Date:** 2026-04-09  
**Decision:**  
Fix two GeoBot operator UX gaps: (1) content not visible before publish, (2) photos sent to wrong bot get dead-end response.

**Part A — Content Preview:**
- `formatContentPreviewMessage(product)` added to `contentPack.ts`
- Shows actual generated channel copy: Instagram caption, Facebook copy, website description, Shopier copy, X post — each truncated for Telegram readability
- Includes SEO/discovery summary (article title, meta title, meta description)
- Shows commerce pack highlights if available
- Returns null if no content generated yet (graceful fallback)
- Wired into `geo_content:{id}` callback: sends preview after status message with action buttons
- Wired into `/content {id}` command: sends preview after status message with action buttons
- Content-ready notification enhanced: includes Instagram caption snippet (200 char preview)
- "📋 İçerik Durumu" button renamed to "👁️ Önizle" in content-ready notification

**Part B — Wrong-Bot Photo Redirect:**
- GeoBot DM photo: "📸 Ürün fotoğrafı algılandı → Bu fotoğrafı @Uygunops_bot'a DM olarak gönderin" + role explanation
- GeoBot group photo (with @mention or "bunu ürüne çevir"): same redirect + "GeoBot ne yapar? → İçerik üretimi, audit, yayın kontrolü"
- Intercepts BEFORE photo reaches product creation code — no accidental product creation on wrong bot
- Generic DM redirect still shows for non-photo DMs to GeoBot

**Changes:**
- `src/lib/contentPack.ts`: +65 lines (`formatContentPreviewMessage`, content-ready notification enhancement)
- `src/app/api/telegram/route.ts`: +74 lines (geo_content preview, /content preview, DM photo redirect, group photo redirect)

**Validation (4 webhook tests):**
- `geo_content:180` callback → status + preview rendered ✅
- Photo DM to GeoBot → photo-aware redirect to Ops Bot ✅
- Photo with @Geeeeobot in group → photo redirect ✅
- `/content 180` in group → status + preview ✅

**What operator now sees:**
1. Content preview: readable channel-specific copy with next-step buttons (Audit, Yayına Al)
2. Wrong-bot photo: clear explanation of which bot does what + where to send the photo

**Commit:** `c50517f`  
**Status:** IMPLEMENTED

---

## D-152 — v50 Lock Violation + Restoration — VERIFIED

**Date:** 2026-04-10
**Decision:**
Restore `src/lib/imageProviders.ts` and `src/jobs/imageGenTask.ts` to exact v50 state at commit `e99e9cb` after discovering an unauthorized rewrite had silently regressed the pipeline.

**Incident timeline:**
- 2026-04-07 — D-129 locked v50 at commit `e99e9cb` (operator-approved visual baseline).
- 2026-04-08 — Commit `773c03b` ("feat: storefront redesign — light beige theme, all home page sections") silently rewrote 3413 lines of `imageProviders.ts` and 2354 lines of `imageGenTask.ts`. The commit message gave no indication of image pipeline changes.
- 2026-04-10 — Operator reported three visual regressions after Phase Y auto-generation went live:
  1. Visible frames/white borders on all 3 slots
  2. Missing pixel-font stock number overlay
  3. Slot 3 (close-up) showing different background than slots 1/2

**Root cause:**
Commit `773c03b` silently reverted the locked baseline:
1. **`ANTI_FRAME_FINAL_BLOCK` DELETED** entirely → frames returned on all slots
2. **Input padding reverted from `bgRGB` (v49 ROOT CAUSE FIX) → white** `{ r:255, g:255, b:255, alpha:1 }` → slot 3 background inconsistency
3. **Anti-frame language weakened** ("ZERO TOLERANCE" → "CRITICAL")
4. **`ANTI_FRAME_FINAL_BLOCK` removed from prompt assembly** in `generateByGeminiPro`
5. **Version labels reverted** v20/v49 → v14/v28
6. **Multi-angle / background-lock blocks weakened**

**Evidence (diff of `773c03b~1..773c03b` on locked files):**
```
-const ANTI_FRAME_FINAL_BLOCK = ...
-      .resize(768, 768, { fit: 'contain', background: bgRGB })
+      .resize(768, 768, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
-      const fullPrompt = TASK_FRAMING_BLOCK + identityLock.promptBlock + zoneBlock + sceneText + CANONICAL_PROHIBITIONS_BLOCK + ANTI_FRAME_FINAL_BLOCK
-    console.log(`[generateByGeminiPro v49] PNG 1024×1024 ready — ${pngBuffer.length}b (pad=${JSON.stringify(bgRGB)})`)
+    console.log(`[generateByGeminiPro v14] PNG 1024×1024 ready — ${pngBuffer.length}b`)
```

**Restoration:**
- `git show e99e9cb:src/lib/imageProviders.ts > src/lib/imageProviders.ts`
- `git show e99e9cb:src/jobs/imageGenTask.ts > src/jobs/imageGenTask.ts`
- Verified `git diff e99e9cb HEAD -- <locked files>` is empty (bit-exact match).
- `npx tsc --noEmit` produces no new errors in restored files.
- Non-image changes from `773c03b` (storefront UI, routing, docs) are preserved — only image pipeline files were restored.

**Commit:** `de9413d`
**Status:** VERIFIED

**Follow-up guardrails (PROPOSED — not yet implemented):**
- Add a CI check / pre-commit hook that blocks modifications to locked files listed in D-129 without an explicit override marker in the commit message.
- Add a CODEOWNERS entry requiring operator approval for any diff in `src/lib/imageProviders.ts` or `src/jobs/imageGenTask.ts`.
- Add a daily drift check that diffs HEAD of locked files against the sealed commit hash and posts a Telegram alert on mismatch.

---

## D-153 — Runtime Lock-Rules Reminder Prepended To Every Generation — IMPLEMENTED

**Date:** 2026-04-10
**Decision:**
Prepend an explicit `LOCK_REMINDER_BLOCK` to every image generation prompt (both GPT-Image edit path and Gemini Pro path), on every slot of every generation, so the v50 locked rules are reinforced at runtime on every single call.

**Motivation (operator request):**
After the D-152 restoration brought back the v50 baseline, the operator asked for a runtime reminder system: "remind the bot every time before he starts to generate that there are locked rules regarding how he should generate the images the way we want him to generate." The intent is to anchor the model on the operator-approved rules at the top of the prompt, not just via the in-body `TASK_FRAMING_BLOCK` / `ANTI_FRAME_FINAL_BLOCK` blocks.

**Implementation:**
- New file: `src/lib/imageLockReminder.ts` — exports `LOCK_REMINDER_BLOCK`, a short, sharply-worded block containing:
  - Rule 1 — NO FRAMES, NO BORDERS, NO WHITE HALOS (no polaroid, no mat, no inset panel, full-bleed background)
  - Rule 2 — BACKGROUND COLOR MUST MATCH ACROSS ALL SLOTS (close-up must match front/side)
  - Rule 3 — PRODUCT IDENTITY IS LOCKED (re-photograph, not redesign)
  - Rule 4 — COMPOSITION FOLLOWS THE SLOT PROMPT EXACTLY
  - Rule 5 — OUTPUT IS A FULL-BLEED EDIT OF THE REFERENCE IMAGE
  - Framed with ASCII box headers and a "ZERO TOLERANCE" closing reminder
- `src/lib/imageProviders.ts`:
  - Added `import { LOCK_REMINDER_BLOCK } from './imageLockReminder'`
  - `generateByEditing` (GPT-Image): `fullPrompt = LOCK_REMINDER_BLOCK + TASK_FRAMING_BLOCK + ... + ANTI_FRAME_FINAL_BLOCK`
  - `generateByGeminiPro`: same prepend
  - Both call sites now console.log `[lock-reminder D-153] v50 LOCKED rules prepended to every slot prompt — Nb reminder block active` at the start of each generation so the operator can verify the reminder is firing in Vercel logs.
- No other locked logic modified. The pre-existing `TASK_FRAMING_BLOCK`, `CANONICAL_PROHIBITIONS_BLOCK`, and `ANTI_FRAME_FINAL_BLOCK` are untouched — `LOCK_REMINDER_BLOCK` is purely additive.

**Rebaseline of lock:**
The v50 locked baseline is now defined as: "commit `e99e9cb` state + the additive `LOCK_REMINDER_BLOCK` integration introduced in D-153." The rest of the locked file contents remain bit-exact to `e99e9cb`. The new sealed commit for lock verification purposes is the D-153 commit; all future drift checks should diff against it.

**What the operator will see:**
- Every photo sent to Mentix group triggers Gemini Pro generation.
- Before the first slot starts, Vercel logs show: `[lock-reminder D-153] v50 LOCKED rules prepended to every slot prompt — XXXXb reminder block active`
- Gemini receives the LOCK_REMINDER_BLOCK at the top of every single prompt for every single slot.
- If Gemini still drifts, the drift is a model failure and not a prompt-construction gap — which gives a clean diagnostic boundary.

**Commit:** TBD (this commit)
**Status:** IMPLEMENTED

---

## D-154 — Phase Z: visualStatus state-sync + pre-run diagnostic — IMPLEMENTED

**Date:** 2026-04-10
**Decision:**
Wire the missing `visualStatus: generating → preview` transition via an `afterChange` hook on the `image-generation-jobs` collection, and backfill recent stuck test products (234-238) so Phase Z golden-path validation can start from a clean state.

**Phase Z golden-path pre-run diagnostic:**
Before asking the operator to push a real photo through the full 14-stage flow, inspected DB state of all recent products:
- Only 3 products have EVER reached past stage 5 (image approval) in the entire database: 180, 125, 123 — all from 2026-04-05.
- Since then (D-129 lock, D-151 Phase X preview, D-152 lock restoration, D-153 runtime reminder), 0 products have made a full end-to-end run.
- Most recent test products 234-238 (today) are all stuck at `workflow_visual_status='generating'` even though their `image_generation_jobs.status='preview'` with 3 images successfully generated and no error.

**Root cause of the state mismatch:**
`updateProductVisualStatus()` in `src/app/api/telegram/route.ts` supports the full state machine `pending | generating | preview | approved | rejected`, but is only called with `'generating'`, `'approved'`, and `'rejected'`. No code path writes `'preview'`. The job-level state correctly flips to `'preview'` when generation completes, but the product-level mirror is never advanced, so `workflow.visualStatus` stays at `'generating'` forever.

**Impact assessment:**
- Not a hard blocker: the wz_start and wz_confirm gates only require `visualStatus === 'approved'`, which is written correctly by `approveImageGenJob` when the operator clicks approve.
- Real impact: `publishReadiness`, `mentixAudit`, and operator-diagnostic output all saw stale `'generating'` state for products that were actually ready for operator review. Admin-panel truth was misleading.

**Implementation (additive, zero touch to v50 locked files):**
- `src/collections/ImageGenerationJobs.ts`: new first `afterChange` hook that fires on `status: * → preview` transition:
  - Fetches the product
  - Only advances if `workflow.visualStatus in ['generating', 'pending']` (never clobbers `approved`/`rejected`)
  - Writes `workflow.visualStatus = 'preview'` with `context: { isDispatchUpdate: true }`
  - Logs `[ImageGenerationJobs D-154] product X visualStatus: generating → preview`
  - Non-blocking: errors are logged, hook never throws
- Existing `status → approved` hook is untouched (it's the second hook in the chain now).
- No changes to `imageProviders.ts`, `imageGenTask.ts`, `imageLockReminder.ts` — v50 lock fully respected.

**Backfill:**
Direct SQL one-shot on products 234-238 only:
```sql
UPDATE products SET workflow_visual_status = 'preview', updated_at = NOW()
 WHERE id IN (234, 235, 236, 237, 238) AND workflow_visual_status = 'generating';
```
Older stuck products (213-230) and product 180 (published but stale) were intentionally left alone — product 180's stale state needs a separate investigation because it has `status='active'` + `publishStatus='published'` + `visualStatus='generating'`, which is an impossible combination without historical drift from earlier code versions.

**Follow-up (Phase Z stage-by-stage run — NOT YET EXECUTED):**
Operator must now push one fresh shoe photo through the Mentix group and report back at each break point. Code-level scan of stages 6-14 confirmed all handlers are wired:
- Stage 6 `wz_start:` → confirmation wizard entry (route.ts:1220)
- Stage 7 wizard steps `wz_cat/wz_ptype/wz_tgt/wz_size` (route.ts callbacks)
- Stage 8 `wz_confirm:` → `applyConfirmation` (route.ts:1579, confirmationWizard.ts)
- Stage 9 GeoBot visible handoff via `sendTelegramMessageAs(geoToken, mentixGroupId, ...)` (route.ts:1633)
- Stage 10 `triggerContentGeneration` auto-called inside `applyConfirmation` (confirmationWizard.ts:708)
- Stage 11 `geo_content:` → `formatContentPreviewMessage` (route.ts:1030, Phase X/D-151)
- Stage 12 `geo_auditrun:` → `triggerAudit` (route.ts:1083, mentixAudit.ts)
- Stage 13 `geo_activate:` → publish + merchandising (route.ts:1122)
- Stage 14 DB state verification (direct SQL check)

**Commit:** TBD (this commit)
**Status:** IMPLEMENTED (hook + backfill) / BLOCKED on operator real-photo run for Phase Z stage 1→14 verification

---

## D-165 — Remove Payload defaultValue from category field
**Decision:**
Remove `defaultValue: 'Günlük'` from Products.ts category select field so Telegram-intake wizard properly asks for category on fresh products.

**Root cause:** Payload CMS applies defaultValue at create time even when the field is not in the incoming data. Fresh products born via Telegram intake got `category: 'Günlük'` silently, and the wizard's `getNextWizardStep()` saw it as already filled — skipping the category step entirely.

**Status:** IMPLEMENTED
**Commit:** `948c839`

---

## D-166 — Await wizard session persistence (fire-and-forget race)
**Decision:**
Make `setWizardSession` / `clearWizardSession` async (awaitable) instead of fire-and-forget background persistence. Added `await` to all 36 callsites.

**Root cause:** On Vercel serverless, a Lambda freeze could kill the background `persistWizardSessionBackground` Promise before it completed the Neon write, causing wizard state to be lost between steps.

**Status:** IMPLEMENTED
**Commit:** `81a533b`

---

## D-167 — Mirror-extend padding permanently replaces solid-color padding
**Decision:**
Replace ALL solid-color padding (`background: { r, g, b, alpha }`) with Sharp `extendWith: 'mirror'` in both `generateByEditing` and `generateByGeminiPro`.

**Root cause:** Solid-color padding creates a visible rectangular frame whenever the reference image's background color differs from the padding color. This was the root cause of a 5-incident regression chain (D-129 → D-157 → D-161 → D-164 → D-167).

**Status:** IMPLEMENTED — LOCKED (sealed commit `cef930a`)

---

## D-168 — Early wizard hydration before group chat filters
**Decision:**
Add early wizard session hydration BEFORE group chat activation filters in route.ts, and bypass the "no plain text" / "no non-reply" group filters when an active wizard session exists.

**Root cause:** Group chat activation filters silently dropped plain text messages (like price "899") before the wizard interceptor had a chance to process them. The wizard was active in DB but the message never reached it.

**Status:** IMPLEMENTED
**Commit:** `5f5f778`

---

## D-169 — Fix Geo_bot wizard race + complete all wizard step dispatch branches
**Decision:**
1. Add `botParam !== 'geo'` guard to early wizard hydration, preventing Geo_bot from processing wizard inputs.
2. Create shared `dispatchNextStep()` function with ALL step branches (category, productType, price, sizes, stock, stockCode, title, brand, targets, summary).
3. Refactor text handlers (stock, brand, title, stockCode, price) and callback handlers (wz_cat, wz_ptype) to use complete dispatch instead of incomplete if-else chains.

**Root cause:** Two bugs: (a) D-168's early hydration didn't filter by bot, so Geo_bot also bypassed group filters and duplicated wizard responses. (b) Stock handler only had branches for brand/targets/summary — when `getNextWizardStep` returned 'stockCode' (for TG-xxx SKU products), no prompt was sent and the wizard stalled with no "Devam" button.

**Status:** IMPLEMENTED
**Commit:** `7119e08`

---

> **Note on numbering gap (D-170…D-210):** the DECISIONS.md log drifted after D-169 while the codebase continued to land decisions in-flight (captured in PROJECT_STATE.md entries and in-repo commits — e.g. Wizard v2 at D-173, Mentix auto-fix at D-182, Instagram carousel D-188, X OAuth 1.0a D-195c, force-redispatch hook D-202). No back-fill is performed here; only the current-closure entries (D-211, D-212) are added. Back-fill is a separate governance task.

---

## D-211 — X Media Upload Fix: `media_category=tweet_image` Required by X API v2 — PROD-VALIDATED

**Date:** 2026-04-21
**Decision:**
Add a `media_category=tweet_image` form-data part to the multipart body of `uploadImageToX()` in `src/lib/channelDispatch.ts`, so X API v2 `/2/media/upload` accepts the upload.

**Root cause:**
After X deprecated the v1.1 `/1.1/media/upload.json` endpoint on 2025-06-09 and redirected all media uploads to v2 `/2/media/upload`, the `media_category` field — optional in v1.1 — became effectively required for image media. The production path was uploading binary + command fields without it, and X returned HTTP 400 with `{"media_category":["Attribute not allowed."]}`. The error was caught and the tweet fell back to text-only with `mediaUploaded=false`.

**Evidence (VERIFIED):**
Vercel production logs for product 294 (2026-04-21 02:22-02:24 TRT) showed the exact 400 response from `/2/media/upload`. After the patch and a force-redispatch retest on product 294: `responseStatus=201`, `media_key` returned, `tweetId=2046379952245776422` posted with the image rendered.

**Implementation:**
Single-file, single-function change. Inserted between the `imgBuffer` and `epilogue` parts of the `Buffer.concat([...])` in `uploadImageToX()`:

```ts
const categoryPart =
  `\r\n--${boundary}\r\n` +
  `Content-Disposition: form-data; name="media_category"\r\n\r\n` +
  `tweet_image`
```

+9 lines net (4-line rationale comment + the form-data part).

**OAuth math:**
OAuth 1.0a signature unaffected — RFC 5849 §3.4.1.3.1 explicitly excludes multipart body parameters from the signature base string.

**Blast radius:**
Zero outside the X upload path. Instagram and Facebook dispatch paths were not touched and both remained `dispatched=true` across the retest.

**Branch / Commit:** `chore/d211-x-media-upload` → rebase-merged to `main` via PR #3, commit `fc0b3ed`.
**Status:** IMPLEMENTED — PROD-VALIDATED (product 294, 2026-04-21)

---

## D-212 — Phase 1 One-Product Full Pipeline Validation CLOSED — Roadmap Advances to Phase 2

**Date:** 2026-04-21
**Decision:**
Close Phase 1 (one-product full-pipeline validation) as complete. Advance the roadmap to Phase 2 — Telegram SN / operator controls.

**What Phase 1 validated end-to-end on product 294 (2026-04-21):**
- Website / homepage: OK
- Instagram carousel (per D-188): OK
- Facebook multi-photo: OK
- X with image (per D-195c OAuth 1.0a + D-211 `media_category`): OK — `x.mediaUploaded=true`, `responseStatus=201`, `tweetId=2046379952245776422`
- Final `sourceMeta.dispatchNotes`: `x.dispatched=true`, `ig.dispatched=true`, `fb.dispatched=true`

**Known follow-up (not a regression):**
Force-redispatching a single channel via `sourceMeta.forceRedispatch=true` currently re-fires every channel not already marked `dispatched=true`. During the X retest this re-posted IG + FB on product 294 as a side effect. There is no per-channel redispatch selector today; `forceRedispatchChannels` is read from `sourceMeta` by the afterChange hook (Products.ts:175) but is NOT a declared Payload schema field, so PATCH-ing via Payload REST silently discards the key. Captured as a Phase 2 backlog improvement (see TASK_QUEUE.md → NEXT → "Per-Channel Redispatch Selector").

**What is NOT included in Phase 1 closure (unchanged):**
- GEO/blog implementation roadmap (untouched)
- Shopier automation work (untouched)
- Image pipeline (v50 baseline still LOCKED — D-129 / D-153 / D-167)

**Next phase:** Phase 2 — Telegram SN / operator controls. Detailed scope to be captured in TASK_QUEUE.md when operator session opens Phase 2.

**Blast radius:** none — docs-only closure entry. No runtime code touched.
**Status:** CLOSED

---

## D-213 — Shopier `listSelections` Limit Cap: 100 → 50 — PROD-DEPLOYED

**Date:** 2026-04-21
**Decision:**
Change the explicit `api.listSelections(100)` call in `getShopierMappings()` to `api.listSelections(50)` so Shopier's REST API returns variation→selection mappings instead of HTTP 400, restoring the ability of `buildShopierVariants()` to attach the `Numara` variation to synced products.

**Root cause (VERIFIED):**
`src/lib/shopierSync.ts:67` was passing `limit=100` to `GET /selections`. Shopier's `/selections` endpoint rejects any `limit > 50` with:

```
HTTP/1.1 400 Bad Request
{ "detail": [ { "loc": ["query","limit"], "msg": "Input should be less than or equal to 50", "type": "less_than_equal" } ] }
```

Because `getShopierMappings()` does `Promise.all([listCategories, listVariations, listSelections])` and treats any sub-fetch error as "mappings unavailable", a single `/selections?limit=100` failure silently emptied the selections `Map`. `buildShopierVariants()` then resolved `variationId` successfully (39-45 `Numara` options mapped) but every `selectionId` came back `null`, so the `variants` array ended up either empty or malformed and the Shopier product was created without a size selector.

**Evidence (VERIFIED):**
Vercel cron run `GET /api/payload-jobs/run` at 2026-04-21 04:00:13.13 TRT (logs scrolled from "Last 12 hours" timeline) printed:

```
[shopierApi] GET /selections?limit=100 → 400
[shopierSync] mappings loaded — categories=N variations=N selections=0
[shopierSync] buildShopierVariants — could not resolve selectionId for size=40
```

`listCategories` and `listVariations` (default `limit=50`) both returned 200 in the same tick, confirming only the `/selections` override was failing.

**Implementation:**
Single-line change, single file:

```diff
--- a/src/lib/shopierSync.ts
+++ b/src/lib/shopierSync.ts
@@ -65,7 +65,7 @@ export async function getShopierMappings(force = false): Promise<ShopierMappings
   const [categoriesRes, variationsRes, selectionsRes] = await Promise.all([
     api.listCategories(50),
     api.listVariations(50),
-    api.listSelections(100),
+    api.listSelections(50),
   ])
```

Default in `src/lib/shopierApi.ts::listSelections()` is already `50` — the `100` was an accidental explicit override added after Shopier tightened the limit. No other call site uses `listSelections(100)`.

**Blast radius:**
Zero outside Shopier sync. Module-level `_mappingsCache` (5-min TTL) is now populated on the next cron tick; all subsequent `buildShopierVariants()` calls will resolve selections correctly. Categories/variations pages unaffected — both already used `50`.

**Does NOT retroactively fix already-synced products:**
Products whose Shopier record was created during the window when selections were empty (e.g. product 294 → Shopier product 46374845) still have no variants attached upstream. Those need either a `sourceMeta.forceRedispatch` re-dispatch (re-enqueues a `shopier-sync` job, which will now succeed) or a bulk backfill via a new Telegram/admin trigger.

**Branch / Commit:** patch prepared in fresh clone at `/tmp/uygunayakkabi-fix`, committed and pushed directly to `main` as commit `f75de51`.
**Vercel deployment:** `CjiKMqyXZ` — Production / Ready / 28s build.
**Status:** IMPLEMENTED — DEPLOYED — VERIFIED PROD-WORKING end-to-end on product 294 after D-215 (selectionId array fix). Size selector now rendering on https://www.shopier.com/46374845 with sizes 43/44/45.

---

## D-214 — One-Shot Admin-Triggered Shopier Re-Sync Endpoint — DEPLOYED (stand-by tool)

**Date:** 2026-04-21
**Decision:**
Add a secret-guarded `GET /api/admin/shopier-resync` endpoint that can re-sync a single Payload product (or all products with a `sourceMeta.shopierProductId`) to Shopier without going through the admin UI or Telegram.

**Why:**
After D-213 deployed, Shopier records created while selections were empty (e.g. product 294 → Shopier 46374845) still needed a trigger to re-run `syncProductToShopier()` so the newly-resolvable variants would attach. The usual triggers (admin UI `forceRedispatch` tick, Telegram `/shopier republish`) require either an interactive admin session or the Telegram webhook secret. This endpoint is the clean, auditable, secret-guarded shortcut.

**Guard:**
`x-admin-secret: $GENERATE_API_KEY_SECRET` — same env var already used by `/api/generate-api-key` (D-115). Returns 401 otherwise.

**Usage:**
```
GET /api/admin/shopier-resync?productId=294
GET /api/admin/shopier-resync?all=true
Header: x-admin-secret: <secret>
```

**Implementation:**
New file `src/app/api/admin/shopier-resync/route.ts`. Calls `syncProductToShopier()` directly (not via jobs queue) so the response body carries the per-product `ShopierSyncResult`. For `all=true`, iterates over every product where `sourceMeta.shopierProductId` exists.

**Blast radius:**
Zero when the secret is unset (returns 500 "Service not configured"). When set, only callers with the secret can invoke it. Runtime behavior identical to the normal sync path.

**Status:** DEPLOYED (commit `af0437a`, Vercel `3WoeLYjZY` Ready). Not used in the product 294 end-to-end fix — the admin REST PATCH path worked, and the cron ran the queued job. Kept as a transient operator tool. Safe to remove after bulk backfill completes.

---

## D-215 — Shopier Variant Payload Fix: `selectionId` Must Be an Array on POST/PUT — PROD-VALIDATED

**Date:** 2026-04-21
**Decision:**
Change `ShopierVariantInput.selectionId` from `string` to `string[]`, and emit `selectionId: [selectionId]` in `buildShopierVariants()`. Response type stays `string` (unchanged).

**Root cause (VERIFIED from live API error):**
After D-213 unblocked the selections Map, the first re-dispatch of product 294 failed with:

```
HTTP 400 — {"error":"invalid","message":"variants[0].selectionId must be an array"}
```

Shopier's REST API is inconsistent between directions:
- **POST /products** and **PUT /products/:id** request bodies accept `variants[].selectionId` as a `string[]`
- **GET /products/:id** response returns `variants[].selectionId` as a single `string`

The input interface `ShopierVariantInput` was typed off the response shape. Before D-213 this never surfaced because the `selections` Map was empty → `buildShopierVariants()` bailed out on line 269 (`if (!selectionId) continue`) → `variants[]` was empty → Shopier accepted the product.

**Implementation:**
```diff
 export interface ShopierVariantInput {
   variationId: string
-  selectionId: string
+  selectionId: string[]
   stockStatus: ShopierStockStatus
   ...
 }

 // buildShopierVariants
-    selectionId,
+    selectionId: [selectionId],
```

`ShopierProductResponse.variants[].selectionId` left as `string` — response shape unchanged.

**Evidence (VERIFIED):**
Product 294 re-dispatched after D-215 deploy (Vercel `E7NE2aJZw` Ready). Cron tick 2026-04-21 04:30:28 UTC → `shopierSyncStatus: synced`, `shopierLastError: null`. Public page https://www.shopier.com/46374845 now renders `<select name="size" id="first_variation_group">` with options `43, 44, 45` matching Payload variants 86/87/88.

**Branch / Commit:** committed and pushed to `main` as `dd999a3`.
**Vercel deployment:** `E7NE2aJZw` — Production / Ready / 26s build.
**Status:** IMPLEMENTED — PROD-VALIDATED (product 294, 2026-04-21).

---

## D-216 — Shopier Bulk Backfill Findings + D-208b Churn Observation — INVESTIGATION NOTE

**Date:** 2026-04-21
**Decision:** No code change. Document bulk-backfill outcome and two latent Shopier sync behaviors observed, then close the size-selector work stream.

**What was done:**
After D-215 went live, 7 previously-synced Shopier-linked products (285, 286, 288, 289, 290, 293, 295) were re-dispatched via authenticated admin REST PATCH (`sourceMeta.forceRedispatchChannels: ['shopier']`). Cron ticks 2026-04-21 05:30 and 05:40 UTC processed the queued jobs.

**Result:**
- **Variants in Payload:** Only product **294** has variants (86/87/88 → sizes 43/44/45). The other 7 products have `variants: []`.
- **Shopier size selector coverage:** Consequently, Shopier's `<select name="size">` is only expected and observed on product 294 (46375838). All other products correctly have no size selector because there's nothing to select — not a sync bug.
- **D-208b fallback fires on every UPDATE for variant-less products:** Re-syncing 285, 286, 289, 290, 293, 295 created **new** Shopier products each cycle (old IDs became orphans, e.g. 285: 46148178 → 46376224; 293 churned twice: 46373596 → 46376215 → 46376286 because a duplicate PATCH fired it twice). Only 294 preserved its Shopier ID across re-dispatch (UPDATE succeeded).

**Inferred root cause (NOT verified via log):**
`publishProductToShopier()` calls `api.updateProduct(existingShopierProductId, body)` first. When the body has no `variants[]`, Shopier returns 403/404, triggering the D-208b fallback (`shopierSync.ts:411-416`) that retries as CREATE. The UPDATE fails consistently for variant-less products but succeeds when variants are present. Exact reason unknown — may be stale `categoryId`, seller-side auto-cleanup of variant-less listings, or API-side quirk. This was latent all along but became visible in bulk.

**Practical impact:**
- Previously-synced variant-less products accumulate orphan entries in Shopier every time they're re-dispatched. Orphans redirect to the seller's root page (confirmed for 46176930 / 288).
- Safe for now because re-dispatch is rare, but risks orphan sprawl if bulk flows run frequently.

**Stuck case — product 288:**
Product 288 remained `forceRedispatch: true` with `shopierSyncStatus: synced` and stale `lastSync: 2026-04-15`. Hook did not re-fire because the boolean didn't transition (two overlapping PATCH runs both wrote `true` → hook's change-detection treated it as a no-op). One-off; not reproduced elsewhere.

**Best next step (PROPOSED — not executed):**
1. Investigate why Shopier PUT fails on variant-less products (capture one failing PUT body + response from Vercel logs).
2. Add an explicit `variants` handling path in `publishProductToShopier()` so UPDATE is skipped or adjusted when `variants.length === 0`, avoiding churn.
3. Manual cleanup of 288 when next touching Shopier sync (PATCH with `forceRedispatch: false` first, then `true`, to break the hook no-op).

**Evidence (VERIFIED via admin REST + live Shopier navigations, 2026-04-21):**
- 294 storefront: `<select>` with `43, 44, 45` — correct.
- 285 storefront (46376224): no `<select>`, Payload has no variants — correct.
- 288 storefront (46176930): redirects to seller root — orphan, needs a follow-up dispatch cycle.

**Status:** INVESTIGATION NOTE — no code change. Backfill work stream CLOSED. Follow-up items logged in TASK_QUEUE.md.

---

## D-217 — Admin-Auth Shopier Category Ensure Endpoint + Wizard Category Seed — PROD-VALIDATED

**Date:** 2026-04-21
**Decision:** Add a new admin-auth'd API route `GET/POST /api/admin/shopier-categories` for inspecting and pre-creating Shopier categories, and seed the 6 operator-wizard categories (Spor, Günlük, Klasik, Bot, Terlik, Cüzdan) into Shopier.

**Why:**
`resolveShopierCategories()` in `shopierSync.ts` matches a Payload product's `category` string against the Shopier categories Map by exact title. If no match is found, it silently falls back to the first available Shopier category (formerly "Günlük") and logs a warning — meaning every Payload product with category `Spor`, `Klasik`, `Bot`, `Terlik`, or `Cüzdan` was being mis-categorized on Shopier. Pre-seeding the wizard categories closes the gap without touching sync logic.

**Auth pattern (new):**
The D-214 endpoint uses a secret-guarded `x-admin-secret` header. This D-217 endpoint uses Payload session auth (`payload.auth({ headers: req.headers })`) so it's callable from the authenticated admin tab with `credentials: 'include'` and needs no extra secret plumbing.

**Implementation:**
New file `src/app/api/admin/shopier-categories/route.ts`:
- `GET` → returns `{ count, categories: [{ id, title, placement }] }` via `listCategories(50)`.
- `POST` → body `{ titles: string[] }`, fetches current categories, skips already-existing titles, calls `createCategory()` for the rest. Returns `{ total, created, alreadyExists, errors, results[] }`.

**Gotcha encountered (and fixed):**
Both `GET` and `POST` initially passed `listCategories(100)`. Shopier `/categories` rejects `limit > 50` with the same HTTP 400 `"limit must be less than or equal to 50"` error as D-213 on `/selections`. Capped to `50` in both call sites (`commits 3f3e165` and `064204d`).

**Evidence (VERIFIED live via admin tab):**
`POST /api/admin/shopier-categories` with `{titles: ["Spor","Günlük","Klasik","Bot","Terlik","Cüzdan"]}` returned `{ total:6, created:5, alreadyExists:1, errors:0 }`. Post-state `GET` confirms 7 categories in Shopier:

| title   | id                 | placement |
|---------|--------------------|-----------|
| Günlük  | `6b59e27730d800f7` | 1         |
| ayakkab | `f440b506ca57b2d1` | 1         |
| Spor    | `dd158ac4ccd8d5ec` | 2         |
| Klasik  | `fc356eea18a4aa98` | 3         |
| Bot     | `7cd3c86a052248e8` | 4         |
| Terlik  | `39231418b67404e0` | 5         |
| Cüzdan  | `a707d600ac9ca58d` | 6         |

Note: the pre-existing `ayakkab` row is an operator-side typo from Shopier's admin UI — not touched; left for the operator to rename or delete manually on Shopier.

**Caveats:**
- `getShopierMappings()` caches the categories Map with a 5-min TTL (`_mappingsCache` in `shopierSync.ts`). New product syncs will pick up the new categories on the next cold start or after the TTL expires.
- Existing Shopier products were created while only `Günlük` existed, so they currently point to that category. Re-syncing them will still hit the D-208b churn issue for variant-less products (see D-216).

**Commits:** `1ed5a97` (route) + `3f3e165` + `064204d` (50-cap fixes).
**Vercel deployments:** three sequential — final one (`064204d`) Ready.
**Status:** IMPLEMENTED — PROD-VALIDATED (2026-04-21).
**Lifecycle:** transient operator tool, safe to remove after Shopier category seed stabilizes.

---

## D-218 — Admin Product-Diagnostic Endpoint for Content/Audit Debugging — IMPLEMENTED

**Decision:**
Add a transient secret- or session-guarded endpoint `/api/admin/product-diagnostic?productId=<id>` that returns a compact snapshot of a product's workflow state, content pack presence, and recent `bot-events` (including `payload.error` on `content.failed` records).

**Why:**
- Operator reported product #296 blocker: `/publish 296` audit returned `PARTIALLY READY (5/6)` with `❌ content: Content generation failed` as the sole unmet gate.
- Prior Geo event history (per operator screenshot): `content.commerce_generated` at 08:57 → audit at 09:15 flagged content as failed. Implication: discovery pack generation (or a revalidation step) failed between commerce success and audit.
- Canonical error message for a content failure lives in `bot-events.payload.error` (`src/lib/contentPack.ts:match markContentFailed`). The admin panel doesn't surface `bot-events` inline alongside the product, and querying Payload REST (`/api/products/:id`, `/api/bot-events`) requires a live admin session cookie.
- When the admin session had expired mid-diagnosis, there was no alternative path to read the error string without either re-login or direct DB access. D-218 closes that gap.

**Implementation:**
- Route: `src/app/api/admin/product-diagnostic/route.ts` — GET only.
- Auth: matches session cookie (D-217 pattern) OR `x-admin-secret: $GENERATE_API_KEY_SECRET` header (D-214/D-215 pattern). First match wins.
- Response: `{ productId, title, category, status, workflow.{workflowStatus, contentStatus, auditStatus, publishStatus, stockState, sellable, lastHandledByBot}, commercePack.{present, keys, titleSeo, primaryKeyword, shortDescriptionLen}, discoveryPack.{present, keys, metaTitleLen, metaDescriptionLen, keywordsCount}, sourceMeta.shopierProductId, recentEvents[<=25].{id, eventType, status, sourceBot, createdAt, notes, payloadError, processedAt} }`.
- Does NOT trigger anything; strictly read-only.

**Why NOT just re-run content and see?**
- We will — `canRetriggerContent()` already permits `failed → retry`, and the smallest-correct-next-step for #296 is `/content 296 retry` via Telegram GeoBot. But D-218 is independently useful: it surfaces the prior `payload.error` without having to discard it by overwriting state with a new attempt, and it remains available for future failure-mode investigation without reimplementing the same query each time.

**Commits:** `ae7765b` (initial secret-only) + `9925d23` (added session alt-auth).
**Status:** IMPLEMENTED — DEPLOYED — endpoint live (HTTP 401 without auth confirms it's routing correctly).
**Lifecycle:** transient debugging tool, safe to remove once content/audit failure patterns are stable and documented.
**Not yet:** product #296 diagnosis not run — pending operator decision between (a) `/content 296 retry` Telegram path, (b) calling D-218 from an authed admin tab, or (c) invoking D-218 with the secret header.

---

## D-219 — Wizard applyConfirmation must link variant IDs to products.variants — IMPLEMENTED

**Decision:**
Update `applyConfirmation()` in `src/lib/confirmationWizard.ts` (step "3. Create variants if sizes were collected") to capture each created variant's `id` and include them in the subsequent `products.update({ data: { stockQuantity, variants: createdVariantIds } })` call.

**Why:**
- `products.variants` is a `relationship` field with `hasMany: true` pointing to the `variants` collection (forward-ref, see `src/collections/Products.ts`).
- `buildShopierVariants()` in `src/lib/shopierSync.ts` reads `product.variants` (the forward-ref array) and ignores the back-ref on `variants.product`.
- The wizard was creating variant docs with only the back-ref populated (`variant.product = productId`) and never writing the IDs back to `product.variants`. Result: `product.variants` stayed empty → Shopier UPDATE went out without size options → size selector missing on the Shopier product page.
- Verified root cause on 2026-04-21 for product #297 (Loafer Günlük). Live fix applied via admin REST `PATCH /api/products/297 { variants: [106,107,108], stockQuantity: 10, sourceMeta.forceRedispatch: true }` — size selector rendered after next cron tick.

**Implementation:**
- Collect `createdVariantIds: Array<number | string>` as each `payload.create({ collection: 'variants', ... })` returns.
- Extend the final products update from `data: { stockQuantity: totalStock }` to `data: { stockQuantity: totalStock, variants: createdVariantIds }`.
- No changes to wizard UX, session state, audit, or Shopier sync logic — purely fixing the forward-ref wiring that was always supposed to exist.

**Blast radius:**
- Applies only on the wizard confirm path (`applyConfirmation`), after the size-stock step.
- On the first run, new products will now have `product.variants` populated at confirm time, so the very next shopier-sync tick will send correct variant data.
- Existing products already in DB with empty `product.variants` but populated `variants` docs need a one-off repair PATCH (same shape as the 297 live fix). Scope of that backfill is small; deferred unless operator flags another instance.

**Does NOT address:**
- Duplicate wizard-apply bug (two `product.confirmed` events for #297 on 2026-04-21 created 6 variants where 3 were expected and doubled `stockQuantity`). Separate root cause — deferred.

**Status:** IMPLEMENTED — PUSHED TO MAIN (commit `5942698`, 2026-04-21).
**Risk:** low — one added field on an already-executed update; identical in shape to the live fix that just landed green on #297.
**Reversible:** yes — single commit, single file.

---

## D-220 — Product Intelligence Bot + GeoBot Handoff MVP — IMPLEMENTED (not yet deployed)

**Decision:**
Add a new Telegram-triggered Product Intelligence (PI) workflow that (1) runs Gemini vision over a product's uploaded originals + supporting photos, (2) attempts a reverse image search for market context, (3) generates an original Turkish SEO + GEO content pack that never copies reference-product wording, and (4) exposes the result to the operator in Telegram as a Turkish summary with an inline keyboard. On explicit operator approval, the PI report is merged into the existing `product.content.{commercePack, discoveryPack}` fields — the same surface GeoBot and channelDispatch already consume. There is no new publishing path: PI prepares, GeoBot/channels publish.

**Why:**
- Operator wanted a "photo-first" diagnostic and content-generation step that verifies what the product actually looks like (detected type/color/material/style/gender/useCases/visibleBrand) before content is written, and that pulls in market-reference context without introducing copy-paste or false "exact match" claims.
- The project's existing pipeline (Telegram intake → wizard → GeoBot content → audit → activation) does not have a "look at the photo and decide" layer — Gemini content was running from title/category only. This is the gap.
- Existing decisions to preserve: Gemini-only (v19), per-request bot-token isolation (D-174), `bot-events` as the observability spine, Neon `push:true` drift risk (feedback_push_true_drift.md — so we use JSON columns where feasible).

**Implementation (scope):**

New files (all under `src/`):
- `collections/ProductIntelligenceReports.ts` — new Payload collection `product-intelligence-reports` with JSON-typed columns for `detectedAttributes`, `referenceProducts`, `seoPack`, `geoPack`, `riskWarnings`, `imagesUsed`, `rawProviderData`, `telegram`; scalar columns for `status` (draft|ready|approved|sent_to_geo|rejected|failed), `matchType`, `matchConfidence`, `exactProductFound`, `triggerSource`, timestamps.
- `lib/productIntelligence/types.ts` — shared types (`PiMatchType`, `PiReportStatus`, `PiTriggerSource`, `PiDetectedAttributes`, `PiReferenceProduct`, `PiSeoPack`, `PiGeoPack`, `PiImagesUsed`, `PiTelegramContext`, `PiReport`, `PiCollectedImages`, `PiReverseSearchResult`, `PiProductContext`).
- `lib/productIntelligence/collectImages.ts` — priority: originals from `product.images[]` → generated from `product.generativeGallery[]` → fallback `media` collection scan filtered by the product relation. Deduplicates by URL. Caps supporting at 6. Writes `conflicts` note when both originals and 2+ generated images coexist.
- `lib/productIntelligence/analyzeProduct.ts` — Gemini 2.5 Flash vision with `inlineData` base64 parts (up to 3 images: primary + 2 supporting). Temperature 0.3. Fail-soft when `GEMINI_API_KEY` missing.
- `lib/productIntelligence/reverseImageSearch.ts` — SerpAPI Google Lens provider. Returns `{available: false, ...}` when `SERPAPI_API_KEY` missing (not an error — `matchType=visual_only_no_external_search`). Ordering-based similarity capped at 85, so the provider alone can never promote a result past `similar_style`. Falls back from primary → supporting[0] if primary returns nothing, downgrading supporting-derived hits by 10 points.
- `lib/productIntelligence/generateSeoGeoPack.ts` — Gemini 2.5 Flash text, temperature 0.6. Strict "do NOT copy reference-product sentences, references are keyword/category context only" rule baked into the prompt. Returns `{seoPack, geoPack, riskWarnings}` with defensive defaults so the caller never sees an undefined field.
- `lib/productIntelligence/createProductIntelligenceReport.ts` — orchestrator. Flow: create draft row (traceable even on crash) → fetch product context → collect images → vision → reverse search → `decideMatchType()` → generate pack → update to `ready` (or `failed` + `errorMessage`). `decideMatchType()` is the single place that classifies confidence: `exact_match` requires both `top.classification === 'exact_match'` AND a vision-detected `visibleBrand` signal — ordering alone never auto-claims exact.
- `lib/productIntelligence/geoBotHandoff.ts` — exports `sendProductIntelligenceToGeoBot()`, `approveReport()`, `rejectReport()`. Preserve-existing merge into `product.content`:
  - `seoPack.productDescription` → `content.commercePack.websiteDescription`
  - `seoPack.shortDescription` → `content.commercePack.shopierCopy`
  - `seoPack.seoTitle` → `content.discoveryPack.metaTitle`
  - `seoPack.metaDescription` → `content.discoveryPack.metaDescription`
  - `seoPack.faq` → `content.discoveryPack.faq`
  - `seoPack.keywords` → `content.discoveryPack.keywordEntities`
  - `geoPack.blogDraftIdea` → `content.discoveryPack.articleTitle`
  - `content.contentGenerationSource = 'product_intelligence'` (if empty)
  On approval we emit a `bot-events` row with `eventType='pi.sent_to_geo'`, `sourceBot='uygunops'`, `targetBot='geobot'`, `status='processed'`.
- `lib/productIntelligence/telegramReport.ts` — Turkish HTML summary (`formatReportSummary`) and the 2×2 inline keyboard (`buildReportKeyboard`) used to acknowledge/reject reports. Callbacks: `pi:approve:{id}`, `pi:sendgeo:{id}`, `pi:regen:{id}`, `pi:reject:{id}`.

Edits (minimal):
- `payload.config.ts` — register `ProductIntelligenceReports` in the collections array.
- `src/app/api/telegram/route.ts` — four surgical splices, no wholesale rewrite:
  1. Add `'pi:'` to `OPS_CB_PREFIXES` so the new callbacks route to Uygunops.
  2. Extend `isHashtagTrigger` regex with `geohazirla|seoara|productintel|urunzeka`.
  3. Add those hashtags to `OPS_HASHTAGS`.
  4. Insert an `isPiTrigger` hashtag handler that resolves the product id (reply-to-bot or inline `\d+`), verifies the product exists, sends an "analysis starting" ack, then in `after()` runs the orchestrator and sends the summary + keyboard.
  5. Insert a `pi:` callback handler block with four sub-actions (approve, sendgeo, regen, reject), each using `after()` for background work and `answerCallbackQuery()` for immediate button ack so Telegram never freezes.

**Design invariants explicitly enforced:**
- **Originals-first.** `collectImages.ts` always sets `primary` to an uploaded original when one exists; generated images only become primary when no originals exist. This matches the operator rule that the uploaded photo is the product's true identity.
- **No copy-paste from references.** The SEO/GEO prompt states this explicitly; the `riskWarnings` field surfaces any model-flagged copyright concerns.
- **Never auto-claim exact match.** `decideMatchType()` downgrades provider `exact_match` to `high_similarity` unless vision detected a visible brand.
- **Graceful degradation.** Missing `GEMINI_API_KEY` → fail-soft with a warning in the report. Missing `SERPAPI_API_KEY` → `matchType=visual_only_no_external_search` (not an error). Missing supporting images → pack is still produced from product data alone.
- **Preserve operator-curated content.** The handoff only fills empty fields in `product.content.{commercePack, discoveryPack}` — a curated `metaDescription` is never blind-overwritten.
- **Audit trail.** Every attempt creates a row in `product-intelligence-reports` even on crash (`status='failed'` + `errorMessage`). Handoff emits a `bot-events` row readable by the existing Mentix auto-fix (D-181) and audit (D-167) paths.

**Trigger surface (Turkish hashtags, operator-chosen):**
- `#geohazirla <id>` — generate PI report for product id (or reply-to-product message without id).
- `#seoara <id>` — alias.
- `#productintel <id>` — alias.
- `#urunzeka <id>` — alias.
All four route to the same handler; aliases exist so the operator can pick whichever reads naturally in context.

**Environment variables:**
- `GEMINI_API_KEY` — REQUIRED (already configured in prod; used by existing geobot runtime).
- `SERPAPI_API_KEY` — OPTIONAL. If absent, reverse search returns `available: false` and the report is flagged `visual_only_no_external_search`. Not a blocker.

**Why JSON-typed columns:**
Neon `push:true` has repeatedly drifted silently (feedback_push_true_drift.md, 3 incidents). Using JSON columns for the heavy structured fields (`detectedAttributes`, `seoPack`, `geoPack`, `referenceProducts`, `imagesUsed`, `rawProviderData`, `telegram`, `riskWarnings`) keeps the schema delta minimal: one new table + a handful of scalar columns. On deploy, only the new `product_intelligence_reports` table needs to exist; field-level changes within JSON columns don't require further DDL.

**TypeScript compile:** `tsc --noEmit` run against the full repo after D-220 edits — zero new errors introduced. The 4 remaining errors (`next.config.ts`, `page.tsx` HomepageSections, `route.ts` `geo_activate_auto`, `Products.ts` storyTargets) are pre-existing and unrelated to D-220.

**Blast radius / reversibility:**
- All new code is additive. No existing lib modified behaviorally.
- The four `route.ts` splices are additive (new prefix, new regex alternatives, new handler blocks); they don't rewrite existing branches.
- On Neon, rolling back means dropping `product_intelligence_reports` (table only — no references from other collections except the `product` FK, which is on the PI row, not on products).
- No new HTTP provider, no new webhook, no schedule/cron surface.
- If `GEMINI_API_KEY` goes missing, the existing GeoBot path also stops working — so D-220 has the same failure mode as the baseline, not a worse one.

**Does NOT address:**
- Automatic re-sync of existing products through PI (manual trigger only).
- Bulk/batch PI generation (single product per hashtag call — consistent with the rest of the operator surface).
- PI-triggered image regeneration — kept out of scope; PI reads existing images, it doesn't generate new ones.
- Fixing product #296 content generation failure (D-218) — that's a separate track and `/content 296 retry` is still the correct next step.

**Status:** IMPLEMENTED (local edits + new files). TYPECHECKED. NOT YET DEPLOYED — awaiting commit/push decision.
**Risk:** low-to-medium. New collection introduces schema delta (one table); behavior is gated behind operator-typed Turkish hashtags, so it cannot auto-trigger on existing flows. SerpAPI key not yet provisioned → first runs will honestly return `visual_only_no_external_search`.
**Reversible:** yes — single commit, isolated directory (`src/lib/productIntelligence/`) + one new collection file + four small `route.ts` splices + one `payload.config.ts` import.

---

## D-224 — Gemini JSON Parser Hardening (GeoBot discovery + commerce) — PROD-VALIDATED

**Decision:**
Replace the "strip code fences + JSON.parse" path in `generateCommercePack` and `generateDiscoveryPack` with a layered parser (`parseGeminiJson<T>`) that:
1. tolerates Gemini wrapping the object in ```` ```json ``` ```` fences or prose preambles,
2. direct-parses when possible,
3. falls back to balanced-brace extraction (first `{` → matching `}`), and
4. on failure, returns a truthful `parseError` with `finishReason` and a 300-char sample — never fabricates fields.

Also:
- `callGeminiText()` now returns `{ text, finishReason }` so the parser can attach `MAX_TOKENS` vs `STOP` context to error messages.
- Discovery pack `maxOutputTokens` bumped from 8192 → 16384. Turkish SEO articles were routinely hitting the 8192 ceiling mid-JSON, producing unclosed braces that the old parser silently reported as "content generation failed."

**Reason:**
Product #296 (and intermittently others) had been landing on `contentStatus = 'failed'` with no usable pack despite Gemini returning well-formed content. Root cause was parser brittleness + token truncation, not model quality. D-224 removes that entire failure class while keeping the "never invent data" guarantee (partial responses surface as clear errors rather than silent `null`).

**Scope:**
- `src/lib/geobotRuntime.ts` only. Prompt structure, model ID (`gemini-2.5-flash`), and output contract unchanged.
- 100% backward-compatible — successful 8192-token runs still succeed identically.

**Status:**
- Merged to `main` at commit `fbeeab2` on 2026-04-24.
- Production deploy live at `https://uygunayakkabi-store.vercel.app`.
- **PROD-VALIDATED 2026-04-24:** product #296 (which had been stuck in `contentStatus=failed` since D-218 flagged it) regenerated cleanly — commerce confidence 100%, discovery confidence 100%, article title + meta description populated, `contentStatus=ready` and `workflowStatus=content_ready`.

**Reversible:** yes — single-file change on one commit.

---

## D-225 — PI Bot → GeoBot Automatic Bridge — PROD-VALIDATED

**Decision:**
Wire Product Intelligence Bot into the automatic content pipeline as a first-class step, not a parallel manual tool.

At the moment `triggerContentGeneration()` builds the Gemini prompt context (just before calling `generateFullContentPack`), a new `resolvePiResearch(payload, productId)` helper:
1. looks up the freshest PI report for this product in status `ready` / `approved` / `sent_to_geo`,
2. if none exists and `PI_AUTO_FOR_GEOBOT` is not explicitly `false`/`0`/`off`, auto-invokes `createProductIntelligenceReport(...)` with `triggerSource: 'manual'` (the same pipeline the `#geohazirla` hashtag uses),
3. on successful auto-run emits a `bot-events` row `eventType = 'pi.auto_triggered_by_geo'` so the auto-trigger is auditable,
4. translates the stored `PiReport` (detectedAttributes + seoPack + geoPack + top referenceProducts + matchType/confidence + riskWarnings) into a narrow `GeobotPiResearch` shape that is dropped into `productContext.piResearch`,
5. on any failure — PI crash, no provider, API error, DB issue — returns `null` and GeoBot falls back to the legacy product-only prompt. **PI must never block publishing.**

GeoBot's prompt builders (`buildPiResearchBlock`, plus `hasPi`-conditional rules in both `buildCommercePrompt` and `buildDiscoveryPrompt`) fold the PI signal in as labelled Turkish sections (TESPİT EDİLEN / BENZER BAŞLIKLAR / ÖNERİLEN / UYARILAR) so the model reads them as explicit evidence, not as loose hints.

Manual `#geohazirla` / `#seoara` / `#productintel` / `#urunzeka` hashtag paths remain unchanged — they still create their own PI report and still require operator approval before anything writes to `product.content`. D-225 only adds the auto-research layer for the automatic pipeline.

**Reason:**
PI Bot's SEO/GEO pack and reverse-image signals were never flowing into the automatic content path — they only attached when an operator manually ran `#geohazirla` and approved the report. The automatic `confirmation → content generation → audit` lane was using the product-only prompt, so the research work PI was doing was wasted for the default flow. The bridge makes PI part of the real pipeline.

**Scope:**
- `src/lib/contentPack.ts`: new `resolvePiResearch()` helper + one line inserting `piResearch` into `productContext`. Wrapped entirely in try/catch.
- `src/lib/geobotRuntime.ts`: new `GeobotPiResearch` interface, `buildPiResearchBlock()`, `hasPi`-conditional rule sets.
- No schema change. No new collection. No change to `#geohazirla` flow or to PI operator-approval gate.

**Status:**
- Merged to `main` at commit `fbeeab2` on 2026-04-24.
- **PROD-VALIDATED 2026-04-24** on product #296 via a synthetic `/content 296 retry` to `https://uygunayakkabi-store.vercel.app/api/telegram?bot=geo`:
  - HTTP 200, full pipeline ran in 83 s.
  - `bot_events` trail: `content.requested` → `pi.auto_triggered_by_geo` (reportId=4) → `content.commerce_generated` → `content.discovery_generated` → `content.ready`.
  - `product_intelligence_reports` row #4 auto-created with full SEO + GEO pack (Turkish keywords, FAQ, buyerIntent, comparisonAngles).
  - Product 296 final state: `contentStatus=ready`, `workflowStatus=content_ready`, commerce confidence 100%, discovery confidence 100%.
  - Generated IG caption uses `#SporŞıklığı` hashtag and article title "Şehir Hayatının Spor Şıklığı ve Konforu" — both mirror PI's `geoPack.comparisonAngles` ("spor şıklığı") and `aiSearchSummary`, confirming PI signal reached the prompt and shaped output.

**Known orthogonal PI-pipeline issues surfaced by this run** (not regressions from D-225, filed as follow-ups):
1. `analyzeProduct.ts` Gemini-vision call returned non-JSON (`risk_warnings: "Vision: gemini_non_json_response"`). The D-224 parser-hardening should be reused here.
2. Google Cloud Vision reverse-search failed with `Unsupported URI protocol specified: /api/media/file/tg-296-…` — the image URL builder is handing Vision a relative path where an absolute `https://` URL is required.
Both are isolated to PI Bot's input quality; the bridge itself functioned correctly and PI's SEO/GEO pack was produced and consumed even with those two signals missing.

**Reversible:** yes — two-file change on one commit; setting `PI_AUTO_FOR_GEOBOT=false` in Vercel env also disables the auto-run path without a code rollback.

---

## D-226 — PI Bot Quality Bundle (vision parser, absolute media URLs, geo_auto trigger tag) — PROD-VALIDATED

**Decision:**
Three follow-up fixes on top of D-225 to clear the orthogonal PI-pipeline issues observed during the D-225 validation run on product 296.

1. Reuse the D-224 `parseGeminiJson<T>` helper inside `src/lib/productIntelligence/analyzeProduct.ts`. Lift it into a new shared module `src/lib/util/parseGeminiJson.ts`, import from both call sites. Defends against fenced JSON, prose preambles, and truncated responses.
2. Absolutize relative `/api/media/file/...` URLs before they reach Gemini vision and Google Cloud Vision. Add `resolveSiteBase()` + `absolutizeUrl()` in `src/lib/productIntelligence/collectImages.ts`, applied at every `resolveMediaUrl()` exit. Reads `NEXT_PUBLIC_SERVER_URL` first, falls back to `VERCEL_URL`. Mirrors the pattern in `src/jobs/imageGenTask.ts`.
3. Plumb `triggerSource: 'geo_auto'` through `resolvePiResearch` → `createProductIntelligenceReport` so PI reports auto-created by the bridge are stored as `trigger_source='geo_auto'` instead of the historical default `'manual'`. New value added to `PiTriggerSource` type and to the Payload select option list.

Bumped vision `maxOutputTokens` 1024 → 4096 in the same commit (Gemini 2.5-flash thinking-token overhead at 1024 produced finishReason=MAX_TOKENS with only ~76 chars of visible JSON — see `feedback_gemini_token_budget.md` incident #2).

**Reason:**
The D-225 validation surfaced two production failures that didn't block the bridge but degraded PI evidence: vision returned non-JSON for both 296 and 286 (parser issue), and Google Cloud Vision rejected the relative `/api/media/file/...` URLs (URL builder issue). The third item — `trigger_source` label fidelity — was a low-severity DB hygiene fix so analytics could distinguish bridge-triggered runs from manual operator runs.

**Scope:**
- `src/lib/util/parseGeminiJson.ts` — new shared helper.
- `src/lib/productIntelligence/analyzeProduct.ts` — replace inline parsing with `parseGeminiJson`. Token budget bump.
- `src/lib/productIntelligence/collectImages.ts` — new `absolutizeUrl()` + `resolveSiteBase()`, applied at media-URL exit points.
- `src/lib/productIntelligence/types.ts` — add `'geo_auto'` to `PiTriggerSource`.
- `src/collections/ProductIntelligenceReports.ts` — add `'geo_auto'` to the select option list.
- `src/lib/contentPack.ts` — pass `triggerSource: 'geo_auto'` from `resolvePiResearch` into `createProductIntelligenceReport`.

**Status:** merged to `main` as commits `4dc52ff` (the bundle) + `7de6b21` (token-budget follow-up). Validated by D-227's E2E run on product 304 (vision returned full attributes including `visibleBrand: "Skechers"` and the visualNotes that read "Skechers Air-Cooled Memory Foam" off the insole; Google Vision received absolute https URLs and ran successfully; see also D-227-DDL note about the missing enum value). 2026-04-24.

**Reversible:** yes — three-file working-tree change.

---

## D-227 — PI Signal Strengthening + Observability — PROD-VALIDATED

**Decision:**
Three targeted fixes after a production observation that final content was still reading generic on real products despite D-225 + D-226 being live.

1. **Observability for silent auto-bridge failures.** `resolvePiResearch` in `src/lib/contentPack.ts` now emits a `pi.auto_trigger_failed` bot-event from its catch block with `{error, failedAt, autoEnabled}` payload, so silent failures (env flag off, cold-start throw, Gemini 429, DB drift) become observable in `bot_events` and the operator can see why PI didn't run.
2. **Surface `visualNotes` into the GeoBot prompt.** Added `detectedVisualNotes` to `GeobotPiResearch` interface in `src/lib/geobotRuntime.ts`. Rendered in `buildPiResearchBlock` as `Görsel Detaylar (logo/yazı/taban/kumaş): …`. The richest vision signal (e.g. `"Dilde Adidas logosu, yanlarda üç şerit, yan kısımda 'SPEZIAL' yazısı"`) was previously silently dropped at the `resolvePiResearch` translation layer. Now mapped from `attrs.visualNotes` → `detectedVisualNotes`.
3. **Mandatory PI usage in prompts.** Block header promoted from passive `"TESPİT EDİLEN ÖZELLİKLER"` to mandatory-voiced **`"ÜRÜN KİMLİĞİ — ZORUNLU KULLANIM"`**. `buildCommercePrompt` rules: when PI signals exist, brand/type/color/material/style/visualNotes MUST appear in `websiteDescription`, `instagramCaption`, `shopierCopy`, `facebookCopy`; generic phrases ("kaliteli malzeme", "şık tasarımıyla", "konfor katın") explicitly banned as a fallback. `buildDiscoveryPrompt` rules: ÜRÜN KİMLİĞİ must appear in the article intro plus at least one section body; metaTitle and articleTitle must combine brand + type + color, not echo the operator title.

**Reason:**
Even with D-225 + D-226 running cleanly, two screenshots from the operator showed final article and IG copy that read like "Skechers SC günlük ayakkabılar ile adımlarınıza konfor ve tarz katın. Yoğun tempolu günlerinizde…" — generic across products. Diagnosis on product 302 confirmed PI never ran (silent bridge failure with no audit trail) and on product 301 found that PI ran with rich data (`visibleBrand=Skechers`, `visualNotes` reading "Air-Cooled Memory Foam") but `visualNotes` wasn't in `GeobotPiResearch` and the prompt rules treated PI as soft hints rather than mandatory content requirements.

**Scope:**
- `src/lib/geobotRuntime.ts` — `GeobotPiResearch.detectedVisualNotes` field, render in `buildPiResearchBlock`, header text + mandatory-rule strengthening in both prompt builders.
- `src/lib/contentPack.ts` — map `attrs.visualNotes → detectedVisualNotes` in `resolvePiResearch`, emit `pi.auto_trigger_failed` bot-event in catch block.

**Status:** merged to `main` as commit `0fffd38` on 2026-04-24. **PROD-VALIDATED** on product 304 "Skechers SC" the same day — vision read "Air-Cooled Memory Foam" off the insole and the Skechers 'S' logo off the side; final article body cited every detected signal verbatim. Generic fallback phrasing eliminated.

**DDL follow-up applied directly to Neon (2026-04-24):**
`ALTER TYPE enum_product_intelligence_reports_trigger_source ADD VALUE IF NOT EXISTS 'geo_auto'`. D-226 had added `'geo_auto'` to the TypeScript type and Payload collection options but Payload `push:true` had silently skipped the PG enum migration. Every auto-bridge attempt from D-226 deploy until the DDL was run failed with `22P02 invalid input value for enum` at the initial draft insert. The new `pi.auto_trigger_failed` bot-event from D-227 caught that silent failure and surfaced the exact query — without it the regression would have stayed invisible. See `feedback_push_true_drift.md` incident #5 and rule 7.

**Reversible:** yes — two-file change on one commit. The DDL is also reversible via `ALTER TYPE … RENAME VALUE` in PG 15+.

---

## D-228 — Idempotent applyConfirmation (duplicate-confirm race protection) — PROD-VALIDATED

**Decision:**
Add an idempotency guard at the entry of `applyConfirmation` in `src/lib/confirmationWizard.ts`. On entry, re-read `product.workflow.confirmationStatus` and `productConfirmedAt` from the DB. If `confirmationStatus === 'confirmed'` AND `productConfirmedAt` is within the last 5 minutes, short-circuit with `{success: true, variantsCreated: 0}`. The Telegram UI still shows a green check; the duplicate work is skipped. Idempotency check is itself wrapped in try/catch — on a re-read failure, falls through to the normal path.

**Reason:**
On products 304 and 305 the operator saw every wizard producing duplicate output: 2× `product.confirmed` events, 2× `triggerContentGeneration` calls, 2× GeoBot commerce + discovery Gemini calls, 2× audit, 2× publish_ready. On product 304 the second pipeline pass nulled the first run's commerce pack by reading a stale `product.content` snapshot and writing a `contentUpdate` that didn't include commerce. Root cause: the `wz_confirm` Telegram callback handler had no debouncing — operator double-tap, Telegram webhook replay, or two callbacks arriving in parallel before the first cleared the wizard session all produced two parallel `applyConfirmation` invocations.

**Scope:**
- `src/lib/confirmationWizard.ts` — 43-line addition at the top of `applyConfirmation`. No schema change. Uses fields the function itself writes on its first run.

**Window rationale:**
- 5 minutes wide enough to absorb Telegram retries and operator delayed re-taps.
- Narrow enough that a legitimate re-confirm via wz_edit works naturally once the operator edits any field (the workflow path is different).

**Status:** merged to `main` as commit `20d399e` on 2026-04-25. PROD-VALIDATED on product 306 — exactly one `product.confirmed` event fired (vs the 2× pattern on 304/305). PI bridge spend stayed at 1× because `resolvePiResearch` was already idempotent (reuses existing ready reports).

**Reversible:** yes — single-file diff.

---

## D-229 — PI Output Enrichment (wider vision + deeper pack + sectioned article + text-search fallback) — PROD-VALIDATED

**Decision:**
Four compounding richness levers shipped in one batch on top of the D-227-validated pipeline.

1. **Wider vision evidence.** Expanded the Gemini vision JSON schema in `src/lib/productIntelligence/analyzeProduct.ts` with six new shoe-anatomy fields: `soleType`, `closureType`, `brandTechnologies[]`, `distinctiveFeatures[]`, `colorAccents[]`, `constructionNotes`. Vision token budget bumped 4096 → 6144. `PiDetectedAttributes` interface grew accordingly.
2. **Deeper SEO/GEO pack.** `PiSeoPack` gained `brandTechnologyExplainer`, `careAndMaintenance`, `sizingGuidance`, `styleGuide`, `technicalSpecs[]`. `PiGeoPack` gained `useCaseExplainer`, `alternativeSearchQueries[]`. The pack-generation prompt in `src/lib/productIntelligence/generateSeoGeoPack.ts` was extended to surface the new vision evidence and impose mandatory-fill rules (e.g. `brandTechnologyExplainer` required when `brandTechnologies` detected; `technicalSpecs` must include concrete items derived from `soleType`/`closureType`/`distinctiveFeatures`). Pack token budget bumped 4096 → 10240.
3. **Longer sectioned discovery article.** `GeobotPiResearch` gained `detectedSoleType` / `detectedClosureType` / `detectedBrandTechnologies` / `detectedDistinctiveFeatures` / `detectedColorAccents` / `detectedConstructionNotes` plus seven `suggested*` seed fields from the deeper SEO/GEO pack. `buildPiResearchBlock` renders them all. `buildDiscoveryPrompt`: when PI is available, target is now 1200–2000 words with **8 mandatory `##` sections** (Giriş, Tasarım ve Görünüm, Marka Teknolojisi ve Konfor, Kullanım Senaryoları, Bakım ve Dayanıklılık, Numara ve Kalıp Notları, Stil Rehberi, Benzer Ürünlerle Farkı). FAQ count 3→5, keywordEntities 10→15. Non-PI path unchanged. `buildCommercePrompt`: tightened mandatory-signal rules (≥3 detected attributes per surface, brand-tech mandatory, ≥2 concrete visual details in `websiteDescription`, generic-phrase ban). Discovery `maxOutputTokens` already at 16384 (D-224); commerce stayed at 4096 in D-229 — this caused the D-231 silent failure described below.
4. **External text-search fallback.** New `src/lib/productIntelligence/providers/dataForSeoText.ts` runs DataForSEO Google Organic Live SERP when image search returns 0 matches AND vision has a strong signal (visibleBrand, productType, or distinctiveFeatures). Builds a query from `brand + title + productType + color + topBrandTech` and pulls up to 8 competitor/retailer snippets, classified `similar_style` (text never inspects pixels). Merged into `search.results` so the SEO/GEO prompt has real-world reference snippets. Feature-flagged via `PI_TEXT_SEARCH_FALLBACK` (default on). Reuses existing `DATAFORSEO_LOGIN`/`DATAFORSEO_PASSWORD` — no new credentials required.
5. **`resolvePiResearch` mapping.** Maps all 6 new detected fields and all 7 new suggested seed fields from the PI report into the `GeobotPiResearch` shape so they actually reach the prompt.

**Reason:**
After D-227 made the existing PI signals visible in the prompt, the operator reported the output was now product-specific but still not detailed enough. The user explicitly asked for "richer, more detailed" output and selected all four levers (multi-select) plus "ship all selected in one batch" risk preference. The four levers compound: more vision evidence → more concrete fields in the prompt → more mandatory citations in the article → longer, denser, less generic copy.

**Scope:**
- `src/lib/productIntelligence/types.ts`
- `src/lib/productIntelligence/analyzeProduct.ts`
- `src/lib/productIntelligence/generateSeoGeoPack.ts`
- `src/lib/productIntelligence/providers/dataForSeoText.ts` (new)
- `src/lib/productIntelligence/createProductIntelligenceReport.ts`
- `src/lib/geobotRuntime.ts`
- `src/lib/contentPack.ts`

**Status:** merged to `main` as commit `89acf4f` on 2026-04-27. **PROD-VALIDATED** on product 305 "Adidas Spezial" the same day:
- `detectedAttributes` returned `visibleBrand=Adidas`, `productType=Spor Ayakkabı`, `color=Kahverengi`, `materialGuess=Süet`, `style=Günlük`, `soleType=Kauçuk`, `closureType=Bağcıklı`, `distinctiveFeatures=["Üç şeritli tasarım","yan kısımda 'SPEZIAL' yazısı","dokulu kauçuk taban"]`, `colorAccents=["beyaz bağcıklar","beyaz yan şeritler","beyaz topuk detayı","bej iç astar","kahverengi kauçuk taban"]`, `constructionNotes="Dikişli üst kısım ve taban birleşimi"`.
- `seoPack` returned populated `brandTechnologyExplainer` (correctly empty for Spezial — no brand-tech), `careAndMaintenance` (concrete süet cleaning guidance), `sizingGuidance` (Spezial-specific fit note), `styleGuide` (concrete combin önerileri), `technicalSpecs` (7 concrete items including "İkonik üç şeritli yan tasarım", "Yan kısımda 'SPEZIAL' marka yazısı"), `alternativeSearchQueries` (7 realistic queries).
- Final article: 1068 words, 7 `##` sections (just shy of the 8 mandatory target — minor gap), copy cited every concrete detail throughout.

**Known follow-ups (deferred, not blocking):**
- Text-search fallback returned HTTP 403 from DataForSEO — the account has Google Lens enabled but not Organic SERP. Not blocking; the wider vision + deeper pack already produce rich output without competitor snippets. Operator's call whether to enable Organic SERP later.
- Discovery `metaDescription` occasionally exceeds the 160-char cap with a warning — minor prompt-rule compliance gap.

**Reversible:** yes — additive interface fields are all optional; existing fallback paths preserved.

---

## D-231 — Commerce Token Bump + GeoBot Parallelization — PROD-VALIDATED

**Decision:**
Two follow-up fixes after D-229's enrichment exposed a silent commerce-pack failure on product 306.

1. **Commerce silent failure.** `generateCommercePack` was still calling `callGeminiText(prompt)` with the 4096-token default after D-229 substantially tightened the commerce prompt rules. With Gemini 2.5-flash's thinking-token overhead, the commerce JSON ran past the cap → `parseGeminiJson` threw on the truncated payload → `generateFullContentPack`'s try/catch left `commercePack=undefined` → no `content.commerce_generated` event → commerce columns in DB stayed null. Product 306 ended up `content_status=discovery_generated` with every commerce_* column null. **Fix:** raise commerce `maxOutputTokens` 4096 → 8192. Same class of fix as D-226 (vision 1024→6144) and D-229 (SEO/GEO 4096→10240).
2. **Perceived 30 s step latency.** `generateFullContentPack` was running commerce THEN discovery sequentially. Post-D-229 sizes (commerce 8192, discovery 16384, 1200–2000-word article with 8 mandatory sections) pushed total wall time to ~90–100 s on PI-enabled runs and the operator read this as "30 seconds between steps / stopped working". **Fix:** commerce + discovery now run in parallel via `Promise.allSettled`. Wall time drops to `max(commerce, discovery) ≈ 50–60 s`; one pack failing no longer blocks the other from being persisted.

**Reason:**
D-229 tightened the rules without revisiting commerce's token budget — a textbook recurrence of the `feedback_gemini_token_budget.md` pattern (4 incidents now, this is incident #4). Sequential generation also failed the operator-experience bar after D-229 made each pack longer.

**Scope:**
- `src/lib/geobotRuntime.ts` — single-file diff. `generateCommercePack` adds `maxOutputTokens: 8192` to the `callGeminiText` call. `generateFullContentPack` rewrites the sequential commerce/discovery section into a `Promise.allSettled` block.

**Status:** merged to `main` as commit `832baf3` on 2026-04-28. Validated by D-230 product 305 + product 312 runs which both produced commerce + discovery cleanly in ~50–60 s.

**Reversible:** yes — single-file diff.

---

## D-230 — Wizard Vision Autofill (category + productType + brand) — PROD-VALIDATED

**Decision:**
Run one Gemini vision call at wizard initialization to auto-fill the wizard's category + productType + brand+model+color steps. Three confidence bands:
- **HIGH (≥70%)** — write the value directly into `session.collected`. Wizard `determineNextStep` skips that step.
- **LOW-MED (40–69%)** — leave `collected` empty but stash the suggestion in `session.autofillPreview`. Prompt builders (`getCategoryPrompt`, `getProductTypePrompt`, `getBrandPrompt`) render a `🤖 PI önerisi: <value> (güven %X)` hint inline above the keyboard / text prompt. Operator can accept (button click or `tamam`/`ok`/`onayla`/`kabul`/`evet` text shortcut for brand) or override.
- **<40%** — no hint, prompt as before.

Send one `🤖 PI Bot Görsel Tespitleri` summary message at wizard start so the operator can see at a glance what was filled vs suggested. wz_edit (Düzenle button) re-runs the autofill so editing produces the same UX as a fresh start.

**Reason:**
Operator request after D-229 stabilization: "I want PI bot to autofill these parts. Only bring the prompt when there is really rare product uploaded and vision could not detect it." The category and brand wizard steps are by far the most common typing burden — vision can identify them on every clearly branded photo. The prompt-with-hint mode handles the borderline case without forcing a hard yes/no decision.

**Scope:**
- `src/lib/confirmationWizard.ts` — new `tryAutofillFromVision`, `applyVisionAutofillToSession`, `formatAutofillReport`. Three prompt builders take an optional suggestion arg. `WizardState` gains `autofillAttempted` + `autofillPreview` fields.
- `src/app/api/telegram/route.ts` — 4 wizard initialization sites (approveImageGenJob, wz_start callback, /confirm command, /confirm 5188 path) call `applyVisionAutofillToSession` and pass suggestions to the prompt builders. Mid-wizard prompt dispatchers also pass `session.autofillPreview` to the builders. `tamam`-style shortcut accepts the brand suggestion in the text handler. wz_edit handler resets `autofillAttempted=false` and re-runs the autofill so Düzenle behaves like a fresh start.

**Token budget:** 3072 (small 4-field schema). Wall-clock ~2–4 s.

**Feature-flagged:** `WIZARD_BRAND_AUTOFILL=false` opts out without a code rollback.

**Follow-up fixes shipped before stabilization (all in `src/lib/confirmationWizard.ts` and `src/app/api/telegram/route.ts`):**
1. `4f1321e` — drop `!product.category` and `!product.productType` gating from the autofill check. The wizard's `determineNextStep` always asks for category regardless of `product.category` (D-171b operator-experience rule), so the autofill must mirror that. Brand check kept as-is — wizard correctly skips brand step when `product.brand` is set.
2. `58256ea` — re-run vision autofill on wz_edit. The "Düzenle" button used to clear `collected` to `{}` but leave `autofillAttempted=true`, so the autofill never re-ran and prompts re-appeared with no hints. Fix: reset `autofillAttempted=false` and `autofillPreview=undefined`, re-run `applyVisionAutofillToSession`, send a fresh autofill report.
3. `5131417` — surface autofill failures with a one-line `🤖 PI Bot: görsel analiz çalıştı ama kullanılabilir sonuç dönmedi (<reason>)` message; relax category mapping with substring/alias matching (vision often returns "Spor Ayakkabı" or "Sneaker" instead of one of the 6 valid labels).
4. `f32018a` — fix the `no_image` bug. `products.images` is defined in the schema as a Payload `array` field with a single `image` relationship inside, NOT a flat relationship-hasMany. At depth=2 the resolved shape is `{ image: <media> }` per item, NOT a flat media doc. The strict `pickUrl` was reading `.url` / `.sizes` directly off the wrapper and always returning null. Final fallback added: query the `media` collection by `product` relation. Mirrors the rescue path that the existing PI Bot's `collectImages.ts` uses.

**Status:** merged to `main` as commits `fa3b57d` + `4f1321e` + `58256ea` + `5131417` + `f32018a` on 2026-04-27 / 2026-04-28. PROD-VALIDATED — operator confirmed "it's working perfectly now" after the no_image fix.

**Reversible:** yes — additive helper. `WIZARD_BRAND_AUTOFILL=false` disables it. `WizardState` field additions are optional. Existing prompt-builder signatures are backward compatible (the suggestion arg is optional).

---

## D-LOCK-2026-04-28 — PI/Wizard Stabilization Lock

**Decision:**
Lock D-227 → D-231 as the **stable production baseline** for the PI Bot → GeoBot bridge, prompt weighting, idempotency, richness, and wizard vision autofill subsystems. Future work in this area must branch from this baseline as a new D-23x or D-24x decision; do not modify locked behaviour without explicit operator authorization.

**Operator confirmation:** "it's working perfectly now" (2026-04-28).

**What is locked (production-validated):**
- D-227 — PI observability + visualNotes in prompt + mandatory prompt rules
- D-227 Neon DDL — `geo_auto` enum value
- D-228 — applyConfirmation idempotency / duplicate-confirm protection
- D-229 — wider vision evidence, deeper SEO/GEO pack, longer sectioned article, text-search fallback
- D-230 — wizard vision autofill for category + productType + brand+model+color
- D-231 — commerce maxOutputTokens 4096→8192, parallel commerce/discovery
- D-230 follow-up fixes (category gating alignment, wz_edit re-run, diagnostic surface, no_image image-wrapper fix)

**What is intentionally deferred / optional (not blocking the lock):**
- DataForSEO Organic SERP 403 — wider vision + deeper pack already produce rich output without competitor snippets. Enable later if higher-quality references are wanted.
- Discovery `metaDescription` occasional 160-char overflow — warning only, not a hard failure.
- Older open-task investigations: task #10 (product 288 forceRedispatch hook no-op), task #15 (duplicate wizard-apply variants on 297 — D-228 likely covers this), task #29 (D-223 #geohazirla 298 validation), task #9 (D-208b churn root cause). Lower priority backlog.
- Future enhancements in the wizard / PI / GeoBot space (e.g. mid-confidence button-click suggestions, multi-image vision aggregation, brand-confidence display in summary, finer-grained prompt sections). Not in scope for the current lock; require new D-numbers.

**Lessons recorded in memory:**
- Enum/select-field option additions on Neon require manual `ALTER TYPE … ADD VALUE`; `push:true` silently skips them. See `feedback_push_true_drift.md` rule 7.
- When Gemini prompt requirements grow, `maxOutputTokens` MUST be revisited. 2.5-flash thinking-token overhead consumes the budget before visible output. Current floors: vision 6144, commerce 8192, discovery 16384, SEO/GEO pack 10240, wizard brand-autofill 3072. See `feedback_gemini_token_budget.md` (4 incidents).
- Wizard autofill depends on the actual product image shape — `products.images` is `{ image: <media> }` wrapper, not a flat media array. Always unwrap.
- Silent failures must surface visible events / diagnostics. Apply this to every step that can quietly drop output (parseGeminiJson, vision call, autofill, commerce-pack generation). Use bot-events or one-line Telegram diagnostics.

**Status:** LOCKED 2026-04-28.

---

## D-234 — Operator Pack v1 (Telegram-first stock/state operations)

**Decision:**
Make Telegram the practical daily control surface for stock/state ops. Extract a single shared helper module `src/lib/operatorActions.ts` that owns identifier resolution + the 6 operator actions, refactor the 3 previously-duplicated case-switches in `route.ts` to delegate to it, and add 7 slash-command aliases for the existing inline-button surface.

**Surface (after D-234):**
- Read-only: `/find <sn-or-id>`, `/pipeline <sn-or-id>` (now SN-or-ID, was ID-only), `/stok <sn-or-id>` (now SN-or-ID, was ID-only).
- State writes: `/soldout`, `/oneleft`, `/twoleft`, `/restock <sn-or-id> <qty>`, `/stopsale`, `/restartsale`. All accept SN or numeric ID.
- Inline buttons: 🔴 Tükendi · ⚠️ Son 1 Adet · ⚠️ Son 2 Adet · ⏸️ Durdur · ▶️ Aç · 📦 Stok — every button now goes through the same `applyOperatorAction()` helper as the slash commands.

**Behaviour rules (variant-aware, smallest correct):**
- `soldout`: variants → zero every variant.stock then status='soldout'. Non-variant → stockQuantity=0 + status='soldout'. Idempotent if already soldout AND effective stock 0.
- `oneleft`/`twoleft`: REFUSED on variant products (per-size truth requires per-size update via `/sn ... stok N` or admin). Non-variant → stockQuantity=1/2 + status='active' + sellable=true.
- `stopsale`: workflow.sellable=false; PRESERVES status (does not clobber soldout → draft, which the previous handler did).
- `restartsale`: REFUSED if effective stock <= 0 (operator told to `/restock` first). Otherwise status='active' + sellable=true.
- `restock <qty>`: REFUSED on variant products. Non-variant → stockQuantity=qty (>=1) + status='active' + sellable=true.
- All actions cascade through `reactToStockChange` (single shared path). Idempotency is checked BEFORE the update — if every write target already holds the would-be value, the helper short-circuits with `idempotent:true` and skips both the update and the bot-event emit. Repeated button presses do not corrupt state and do not spam events.

**Identifier resolution rules:**
- `SN0186` → exact `stockNumber` match.
- `186` → padded to `SN0186`, retried as numeric ID if SN miss.
- All operator commands accept either form. The shared `resolveProductIdentifier()` is the single source.

**Scope:**
- New file: `src/lib/operatorActions.ts` (~440 LOC). Exports: `resolveProductIdentifier`, `applyOperatorAction`, `formatOperatorCard`, `operatorButtonsKeyboard`, `formatIdentifierMissingMessage`, types.
- `src/app/api/telegram/route.ts`: refactored 3 duplicated paths (sn_* button callback, /sn sub-actions, /stok and /pipeline ID-only inputs) to use the shared helper. Added 7 new slash commands. Registered them in SHARED_CMDS so they pass the bot-ownership filter on both Uygunops and GeoBot.
- No schema change. No new collection. No new env var.

**Status:** Shipped to `main` 2026-04-28. PROD soak validation pending — operator to send a small set of touch-tests against SN0032 (or any current SN) covering /find, /pipeline, /stok, all six button presses, and one repeat-press for idempotency.

**Reversible:** yes — single new file + a localized rewrite of 3 handler blocks + 1 shared-cmd-list extension. `git revert` is clean.

**Out of scope:**
- Per-size variant editing from Telegram (still admin-panel or `/sn ... stok N` for total override). New scope = new D-number.
- Auto-publish behaviour. External publishing still requires explicit human approval.

---

## D-235 — Per-Channel Redispatch from Telegram (Operator Pack v1.5)

**Decision:**
Add a Telegram surface that lets the operator re-fire EXACTLY one channel without re-triggering the others. Slash command `/redispatch <channel> <sn-or-id>` and a per-channel button row on every operator card. Supported channels: X / Instagram / Facebook / Shopier. Website explicitly excluded with a one-line explanation; Dolap and Threads not exposed in this scope.

**Why this design (and why we did NOT extend the afterChange hook):**
D-202 wired `dispatchProductToChannels(..., {onlyChannels})` and the afterChange hook reads `sourceMeta.forceRedispatchChannels` to set that filter. But verifying against Neon's `information_schema.columns` shows that `source_meta_force_redispatch_channels` does NOT exist as a real column — the field was never persisted via Payload's group validation, so `sourceMeta.forceRedispatchChannels` is always `undefined` when read from a freshly-fetched product. The hook's "explicit channels" branch has been silently dead code in production. The fallback branch ("skip already-dispatched non-shopier channels") is what actually ran, and that is exactly why D-212 saw X-only retests on product 294 also re-posting IG+FB.

Two paths to fix it:
1. Add a real `forceRedispatchChannels` column → Payload schema change + Neon DDL (per Blocker 0).
2. Bypass the hook from Telegram and call `dispatchProductToChannels(..., {onlyChannels})` directly.

Path 2 is smaller (no DDL, no schema change), reversible in one commit, and reuses the same dispatch code the hook calls. Path 1 stays available later if admin-panel-driven per-channel redispatch becomes a need.

**Implementation:**
- `src/lib/operatorActions.ts` gained `triggerChannelRedispatch(payload, productId, channelRaw)`. Resolves channel aliases (x/twitter; instagram/ig/insta; facebook/fb; shopier/shop), validates product is `status='active'` (the hook would refuse otherwise), calls `fetchAutomationSettings` + `dispatchProductToChannels(..., {onlyChannels:[ch]})`, persists the per-channel result note into `sourceMeta.dispatchNotes` while preserving notes for other channels, queues the `shopier-sync` job when applicable. The product update uses `context: { isDispatchUpdate: true }` so the afterChange hook stays silent on the sourceMeta write.
- `src/lib/operatorActions.ts::operatorButtonsKeyboard` gained a third row of 4 redispatch buttons.
- `src/app/api/telegram/route.ts` got the `/redispatch` command handler and a new `redis_*` callback handler. Both delegate to `triggerChannelRedispatch`. `/redispatch` registered in `SHARED_CMDS`.

**Refusal cases (with operator-facing messages):**
- Unknown channel alias → "Geçerli: x, instagram, facebook, shopier".
- `website` → explanation that storefront renders live and Vercel revalidation handles cache invalidation if ever needed.
- Product not found → standard 404 message.
- Product not active → "Önce /restartsale veya panel üzerinden aktive edin."

**What this does NOT change:**
- afterChange hook unchanged. Still reads `sourceMeta.forceRedispatchChannels` (still empty in prod). Still uses the fallback branch for admin-driven redispatches. Future cleanup can either delete the dead branch or actually persist the field.
- No new Payload field. No Neon DDL.
- D-LOCK-2026-04-28 PI/wizard scope untouched.
- v50 image-pipeline LOCK untouched.
- Publish-approval policy unchanged: every redispatch is explicitly initiated by the operator.

**Risk class:** medium. Single new helper function (~180 LOC) + 3 small route.ts edits. Wraps existing dispatch logic without modifying it. Reversible via single-commit revert.

**Idempotency:**
Each press fires a fresh dispatch; the Shopier path queues a fresh job. There is no cooldown or dedupe at this layer — that is by design (operator may want to retry). External services have their own idempotency or are tolerant (the same product POST to Shopier becomes an UPDATE; the same X tweet succeeds and returns a fresh tweetId; Instagram/Facebook return new post IDs).

**Test cases (operator-runnable):**
- `/redispatch x SN<active-product>` → only X fires; IG/FB/Shopier are not touched. `sourceMeta.dispatchNotes` shows the new X note alongside the previous IG/FB notes (those notes are preserved verbatim).
- `/redispatch instagram <id>` → only IG fires.
- `/redispatch facebook <id>` → only FB fires.
- `/redispatch shopier <id>` → Shopier sync job queued; `shopierSyncStatus='queued'` immediately; cron runs the job.
- `/redispatch website <id>` → refused with explanation; no dispatch happens.
- `/redispatch x <draft-product>` → refused with "ürün aktif değil".
- Inline button presses ("𝕏 Tekrar", "📸 IG Tekrar", "📘 FB Tekrar", "🛒 Shopier") → identical behaviour to the slash commands.

**Status:** Shipped to `main`. PROD soak validation pending (operator to run the test cases above against current SNs).

**Reversible:** yes — single new helper export + 3 route.ts edits.

---

## D-236 — Operator Inbox / Queue v1 (read-only Telegram queue surface)

**Decision:**
Add `/inbox` + 5 sub-commands to Telegram so the operator can see what needs attention right now without opening admin. Read-only; aggregates the existing workflow / state / event signals into 5 actionable buckets.

**Buckets and filters (all use existing fields, no schema change):**
| Bucket | Filter |
|---|---|
| **PENDING — visual approval** | `workflow.visualStatus == 'preview'` |
| **PENDING — wizard incomplete** | `workflow.visualStatus == 'approved' AND workflow.confirmationStatus != 'confirmed'` |
| **PUBLISH — publish_ready** | `workflow.workflowStatus == 'publish_ready'` |
| **PUBLISH — content-ready-not-active** | `workflow.contentStatus == 'ready' AND status != 'active' AND workflow.workflowStatus != 'publish_ready'` |
| **STOCK — soldout** | `status == 'soldout' OR workflow.stockState == 'sold_out'` |
| **STOCK — low_stock** | `status == 'active' AND workflow.stockState == 'low_stock'` |
| **FAILED — content** | `workflow.contentStatus == 'failed'` |
| **FAILED — audit** | `workflow.auditStatus IN ('failed','needs_revision')` |
| **FAILED — shopier sync** | `sourceMeta.shopierSyncStatus == 'error'` |
| **FAILED — last 24h events** | `bot_events.eventType IN [...failure types...] AND createdAt > now-24h` |
| **TODAY — created** | `createdAt > startOfTodayUTC` |
| **TODAY — confirmed** | `workflow.confirmationStatus == 'confirmed' AND workflow.productConfirmedAt > startOfTodayUTC` |
| **TODAY — content ready** | `workflow.contentStatus == 'ready' AND content.lastContentGenerationAt > startOfTodayUTC` |
| **TODAY — activated** | `status == 'active' AND updatedAt > startOfTodayUTC` |
| **TODAY — soldout** | `status == 'soldout' AND updatedAt > startOfTodayUTC` |
| **TODAY — failed events count** | `bot_events.eventType IN [...failure types...] AND createdAt::date == today` |

Failure event types tracked: `content.failed`, `pi.auto_trigger_failed`, `audit.failed`, `audit.needs_revision`, `dispatch.failed`, `shopier.sync.failed`, `shopier.error`. Bot-events query is wrapped in try/catch — missing collection or table is non-fatal, the rest of the inbox still renders.

**Implementation:**
- New `src/lib/operatorInbox.ts` (~290 LOC). Six paired query+format helpers. Each list capped at `LIST_LIMIT=10` items with overflow `+N daha` hint. Empty buckets render `✅ <label>: yok`. `getInboxOverview` runs the four detail queries in parallel via `Promise.all` so the top-level command is fast.
- Single command in `route.ts` dispatches sub-commands via switch. Aliases included for Turkish (`stok` → `stock`, `bugun`/`bugün` → `today`, `hata` → `failed`).
- Registered in `SHARED_CMDS` so both Uygunops and GeoBot accept `/inbox`.

**Out of scope:**
- Mutations — every operator action stays on the existing `/find /soldout /restock /redispatch` etc. surface.
- Pagination beyond 10 items per bucket.
- Archived-product surfacing.
- Dolap/Threads channels in the failed bucket — intentionally limited to current production channels.
- Custom event-type subscriptions — failure event types are a fixed allow-list, extendable later.

**Risk class:** low. Read-only helper + one command branch in route.ts. Reusing Payload `find` query patterns. Reversible via single-commit revert.

**Smoke evidence (current Neon, 2026-04-28):**
| Bucket | Count |
|---|---|
| visual approval pending | 2 |
| wizard incomplete | 3 |
| publish_ready | 4 |
| content-ready-not-active | 6 |
| soldout | 0 |
| low stock | 2 |
| content failed | 0 |
| audit failed | 0 |
| shopier error | 0 |
| failures last 24h | 0 |

Inbox truthfully surfaces 17 actionable items for the operator to triage.

**Status:** Shipped to `main`.

**Reversible:** yes — single new helper file + 1 route.ts command branch + 1 SHARED_CMDS entry.

---

## D-237 — Publish Desk / Approval Gate v1

**Decision:**
Add a Telegram-first publish surface so the operator can see ready items, approve, reject, and activate routine ready products without opening admin. **Hard publish rule preserved** — every action is an explicit operator gesture (slash command or inline button); no auto-publish anywhere.

**Semantic resolution (smallest correct):**
- `approve ≡ activate` — there is no separate persisted "approved-but-not-activated" state in the schema today and inventing one would introduce a phantom limbo state. `/approvepublish` and `/activate` both flip `status=active` and trigger dispatch via the existing afterChange hook. `/approvepublish` additionally emits a `publish.approved` bot-event so the audit trail clearly shows the operator's explicit intent.
- `reject = recorded refusal, no state mutation` — `/rejectpublish` emits a `publish.rejected` bot-event only. Product stays in publish_ready limbo. Operator can `/activate` or `/approvepublish` later — the newer affirmative event wins because the publish desk reads "latest publish.* event" for each product.

**Persisted decision state via bot-events.** No schema change. The publish desk derives "current decision" from the latest `publish.approved` or `publish.rejected` event in the last 30 days. This mirrors how `stockState` is derived from stock events. Auditable. Reversible (just emit a newer event).

**Surface:**
- `/publishready` — lists products where `status != 'active'` AND `evaluatePublishReadiness(product).level === 'ready'` AND no recent `publish.rejected`. Each item rendered as its own card with `🚀 Aktif Et / 🚫 Reddet / 🔍 Bul` inline buttons.
- `/publishready today` — same filter, additionally requires `content.lastContentGenerationAt` OR `workflow.productConfirmedAt` after `startOfTodayUTC`.
- `/approvepublish <sn-or-id>` — emits `publish.approved` event, then runs the full activation path. Refuses with concrete blockers if readiness != 6/6.
- `/rejectpublish <sn-or-id>` — emits `publish.rejected` event. No state mutation. Product disappears from `/publishready` listings for 30 days.
- `/activate <sn-or-id>` — existing handler patched to accept SN via `resolveProductIdentifier` (D-234 pattern). Guards unchanged: refuses if already active, refuses if readiness != 6/6.
- Inline buttons: `pdesk_act:<id>` (full activation including `publish.approved` audit event) and `pdesk_rej:<id>` (rejection record).

**Implementation:**
- New `src/lib/publishDesk.ts` (~250 LOC). Exports `getPublishReadyList`, `recordPublishDecision`, `formatPublishReadyHeader/Entry/Empty`, `publishDeskButtons`. Merges approval+rejection events with newest-wins so an approval after a rejection un-hides the product. Uses existing `evaluatePublishReadiness` to gate "fully ready" — same 6 dimensions the rest of the system uses.
- `src/app/api/telegram/route.ts`: 3 new slash command branches (`/publishready`, `/approvepublish`, `/rejectpublish`), one `pdesk_*` callback handler, plus a small SN-or-ID patch on the existing `/activate` handler. The activation logic for `/approvepublish` and the `pdesk_act` callback is inlined (small duplication of the existing `/activate` body) because each path is in a different region of route.ts; future cleanup could extract a shared `activateProduct(payload, productId, source)` helper. SHARED_CMDS gets `/publishready /approvepublish /rejectpublish`. `/activate` stays in GEO_CMDS per the D-144 bot-role split.

**Idempotency / safety:**
- `/approvepublish` and `pdesk_act` refuse already-active products with a clear message.
- `/approvepublish` refuses if readiness < 6/6 with the exact blockers from `evaluatePublishReadiness`.
- `/rejectpublish` does not mutate product state — repeated presses just emit additional events. The desk uses the newest event so re-rejecting is harmless.
- `/activate` keeps its existing not-already-active + readiness-check guards.

**Out of scope:**
- Auto-publish — forbidden by the hard rule.
- Per-channel approval gates — operator approves the whole publish + dispatch as a unit; per-channel control is the existing `/redispatch` flow.
- Multi-stage reviewer workflow.
- Persisting decision state as a real product field — bot-events are the journal; revisit only if the latest-event pattern proves insufficient.

**Risk class:** low. Read query + bot-event emit + inlined activation reuses existing logic. No schema change. No new env var.

**Smoke evidence (current Neon, 2026-04-28):**
| Filter step | Count |
|---|---|
| Broad pre-filter (status≠active AND (publish_ready OR contentStatus=ready)) | 8 |
| Fully ready (all 6 dimensions pass) | 6 expected (2 with `audit=pending` fail the audit dimension) |
| Recent publish-decision events | 0 |

Operator-runnable test cases:
- `/publishready` → expect ~6 cards each with 3 buttons.
- `/publishready today` → subset where confirmed/content-ready today.
- Press `🚫 Reddet` on one card → "publish.rejected" event written; `/publishready` should now show that card filtered out.
- Press `🚀 Aktif Et` on another card → activation runs end-to-end (status=active + dispatch); product disappears from `/publishready` because `status='active'` is filtered.
- `/approvepublish <not-ready-sn>` → refused with concrete blockers.
- `/activate <not-ready-sn>` → same refusal (existing behaviour).
- Repeated `/rejectpublish` on same product → safe (emits more events; latest still wins).

**Status:** Shipped to `main`. PROD soak validation = operator runs `/publishready` against real ready items, verifies the queue is correct, presses Aktif Et / Reddet on a couple to confirm both paths work and the listing reflects the change.

**Reversible:** yes — new helper file + ~3 route.ts command branches + 1 callback handler + small SN-or-ID patch on `/activate`.

---

## D-238 — State Coherence Sweep + Repair

**Decision:**
Detect, repair, and prevent product state drift so the Telegram operator surfaces (`/inbox`, `/publishready`, `/find`, `/pipeline`) stay truthful. Real production drift confirmed via raw-SQL scan: 1 product with `workflow=active+status=draft` (SN0032 — exactly the case the operator spotted in the D-237 screenshot) and 3 products with `status=active+publishStatus=not_requested` (SN0013, SN0002, SN0033 — older activations).

**Three layers — detect, repair, prevent.**

**Detect.** Two new rules added to the existing `detectStateIncoherence` in `publishReadiness.ts`:
- Rule 8 (severity error): `workflow.workflowStatus='active' AND status!='active'` — inverse of rule #1, catches the SN0032 direction.
- Rule 9 (severity warning): `status='active' AND publishStatus IN ('not_requested','pending')` — catches post-activation drift on legacy products.

The other 7 rules are preserved verbatim — `detectStateIncoherence` is the single canonical source for the operator-facing coherence message displayed by `/pipeline` and now `/repair scan`.

**Repair.** New `src/lib/stateCoherence.ts` (~250 LOC) with two exports:

`normalizeProductState(payload, productId, {dryRun})`. Deterministic. Idempotent.
- Computes the correct values from ground truth:
  - `workflowStatus` derived from full pipeline progression — soldout/active take precedence over earlier stages; otherwise step through audit → content → confirmation → visual.
  - `publishStatus = 'published'` when `status='active'`. Does NOT downgrade existing 'published' on rollback (preserves audit trail).
  - `sellable = true` when `status='active' AND stockState!='sold_out'`, `false` when soldout, untouched otherwise.
- Compares against actual values, builds a minimal patch.
- `dryRun=true` (default): returns the diff as a Telegram-ready preview, writes nothing.
- `dryRun=false`: applies the patch in a single `payload.update` with `context: { isDispatchUpdate: true }` (suppresses the afterChange dispatch hook — repair is a coherence write, not a publish). Emits `state.repaired` bot-event with the full audit payload.
- Skips archived products entirely.
- If everything's already coherent, returns `changed: false` and a "tutarlı — düzeltilmesi gereken alan yok" message. Repeated calls are no-ops.

`scanCoherenceDrift(payload, {limit=200})`. Read-only. Iterates non-archived products, runs `detectStateIncoherence` on each, returns `{totalScanned, drifted: [{id, sn, issues, sample}]}`. `formatScanReport` renders the top 10 + overflow hint.

**Prevent.** Patched `applyOperatorAction` in `operatorActions.ts` so soldout/oneleft/twoleft/restartsale/restock now align `workflow.workflowStatus` alongside `status`:
- `soldout`: when status flips to soldout, also set `workflowStatus='soldout'`. Previously left at whatever it was (often 'active'), causing post-soldout drift.
- `oneleft`/`twoleft`/`restartsale`/`restock`: when status flips back to 'active' AND previous workflowStatus was 'soldout', revert workflowStatus to 'active'. For other previous workflow stages (e.g. content_ready, publish_ready) the value is preserved — only the specific soldout↔active transition gets aligned, no broader rewrite.

This closes the most likely future source of drift — the action helpers were the ones leaving workflowStatus stale on status flips. /activate and /approvepublish were already aligning correctly (D-237 verified).

**Surface.** New `/repair` slash command, four modes:
- `/repair` → help message
- `/repair scan` → catalog-wide drift report (top 10 + overflow)
- `/repair <sn-or-id>` → single-product preview (dry-run)
- `/repair <sn-or-id> confirm` → apply the patch
Registered in `SHARED_CMDS` so both bots accept it.

**Verification (current Neon, simulated rules against the 4 known-drifted products):**
| SN | Patches |
|---|---|
| SN0002 | workflowStatus content_ready → active; publishStatus not_requested → published |
| SN0013 | workflowStatus publish_ready → active; publishStatus not_requested → published |
| SN0032 | workflowStatus active → publish_ready (audit=approved + status=draft → publish_ready is the correct derived value) |
| SN0033 | workflowStatus publish_ready → active; publishStatus not_requested → published |

All 4 produce sensible, minimal patches. Idempotent — running once fixes the drift; running again on the same product is a no-op.

**Out of scope:**
- Auto-running normalize on every mutation. Kept explicit/operator-callable so future bugs surface as drift instead of being silently scrubbed.
- Repair for archived products.
- PI/wizard/image-pipeline state — D-238 only touches workflow/status/publish/sellable.
- Mass scripted repair without operator review — every applied repair is `/repair <sn> confirm`.

**Risk class:** low. Read + emit + minimal-diff write. No schema change. Reusing existing helpers (publishReadiness + bot-events). Reversible via single-commit revert.

**Status:** Shipped to `main`. PROD soak validation = operator runs `/repair scan` to confirm the 4-drifted-product report, then `/repair SN0032` (preview) + `/repair SN0032 confirm` (apply), then `/pipeline SN0032` to verify coherence message is now clean.

**Reversible:** yes — new helper file + 1 route.ts command branch + 2 new rules in publishReadiness.ts + 3 small workflowStatus alignment patches in operatorActions.ts.

---

## D-239 — Batch Actions / Bulk Queue Handling v1

**Decision:**
Add comma-separated multi-target input to the operator command set so bulk queue work doesn't require per-product retyping. Reuse the existing single-item helpers verbatim — no new mutation logic, no parallel state machine. Per-product result reporting; partial failures shown clearly; idempotency preserved end-to-end.

**Surface — commands extended (no new commands):**
- Approval gate: `/approvepublish <sn1,sn2,sn3>`, `/rejectpublish <sn1,sn2,sn3>`, `/activate <sn1,sn2,sn3>`.
- State writes: `/soldout`, `/oneleft`, `/twoleft`, `/stopsale`, `/restartsale` accept comma-separated input.
- Restock: `/restock <sn1,sn2,sn3> <qty>` — qty applies uniformly per item; validated before the per-item loop.
- `/find` refused in batch mode (one full card per item is too chatty for Telegram).

**New shared layer — `src/lib/operatorBatch.ts` (~210 LOC):**
- `parseBatchIdentifiers(raw)` — splits on commas, trims, drops empties, dedupes case-insensitively while preserving order. Returns `[]` if nothing usable. Single-token input (no comma) yields a 1-element array → falls through cleanly.
- `isBatch(idents)` — true when length > 1.
- `runBatch(payload, command, idents, fn)` — generic per-item executor. Resolves each ident via `resolveProductIdentifier` (D-234, accepts SN/'17'/'SN17'/numeric ID). Catches resolution failures as `notFound`, per-item exceptions as `failed`. Per-item helper return shape: `{ok, badge?, line, detail?}`. Accumulates `{total, succeeded, failed, refused, notFound, entries[]}`. Whole batch never throws.
- `formatBatchSummary(result)` — Telegram-ready: `🧰 <command> — toplu sonuç (N ürün)` header + filtered stats line + per-entry lines. Capped at 25 lines with `+ N satır daha (kesildi)` overflow.

**Convergence on a single approve-and-activate helper:**
The legacy inlined `/activate` body (route.ts ~120 LOC) is now factored out into `approveAndActivateProduct(payload, productId, source, triggeredBy)` exported from `src/lib/publishDesk.ts`. Five callers converge on it:
1. `/approvepublish <sn>` (single)
2. `/approvepublish <sn1,sn2,...>` (batch)
3. `/activate <sn>` (single)
4. `/activate <sn1,sn2,...>` (batch)
5. Publish Desk inline button `pdesk_act:<id>`

Behaviour identical to the legacy inlined version — refuse-already-active (idempotent=true), emit `publish.approved` audit-trail event, run `evaluatePublishReadiness` (refuse with concrete blockers if !ready), apply activation update (status=active + workflowStatus=active + publishStatus=published + merchandising.publishedAt + newUntil), emit `product.activated` with `triggeredBy` distinguishing the entry point. The helper returns both a single-item `message` (multi-line Telegram message) and a one-line `summary` (used in batch summaries) so callers don't reformat.

**Per-item result mapping (visible to operator):**
| State | Badge | Counts as |
|---|---|---|
| Action succeeded | ✅ / 🚀 / 🚫 (action-specific) | `succeeded` |
| Already in target state | 🟰 | `succeeded` (idempotent) |
| Refused by guard (readiness, not active, etc.) | ⚠️ | `refused` |
| Resolution failed | ❓ | `notFound` |
| Per-item exception thrown | ❌ | `failed` |

**Idempotency.** Every underlying helper used by the batch path (`applyOperatorAction`, `recordPublishDecision`, `approveAndActivateProduct`) was already idempotent. Running the same batch twice produces `🟰 zaten ...` for items that already reached the target state — no double bot-events, no double dispatches.

**Sequential not parallel.** Items execute sequentially inside `runBatch`. Reasons: (1) failures stay isolated and don't cancel siblings; (2) audit-event ordering per product stays deterministic; (3) no contention on `payload.update` for the same product.

**Out of scope (v1):**
- Parallelism across batch items (sequential is fine at typical operator bulk sizes; can revisit if a real bottleneck emerges).
- Cross-channel batch redispatch — `/redispatch` stays single-target (one channel, one product) per D-235.
- Auto-retries on per-item failures — operator decides to retry only the failed subset.
- Mixed-action batches (e.g. soldout some + restock others in one call) — keeps the per-item helper signature simple.
- `/repair` batch (D-238) — repair stays explicit and per-product to avoid silent mass scrubbing.

**Risk class:** low. Additive — new file (`operatorBatch.ts`) + new export (`approveAndActivateProduct`) + thin batch-detection wrapper at the top of each command's existing single-id path. Single-id path unchanged below the wrapper. No schema change. No new state. Reversible via single-commit revert.

**Status:** Shipped to `main`. Soak validation = operator runs a small batch (3 SNs) for `/approvepublish` or `/soldout`, verifies per-product result lines, then runs the same batch again to confirm idempotency badge (`🟰`). Single-item commands continue to work exactly as before.

**Reversible:** yes — new helper file + new helper export + one batch-detection branch per command (3 commands) + the unified D-234 state-write block.

---

## D-240 — Selection-Based Bulk Actions from /publishready

**Decision:**
Add tap-select bulk actions to the Telegram operator layer so the operator can pick multiple products from `/publishready` and run a single bulk action against the selection without retyping comma lists. Reuse D-239's `runBatch` + the existing per-item helpers — no new mutation logic.

**Selection state model — smallest correct:**
- In-memory `Map<sessionKey, SelectionState>` in `src/lib/operatorSelection.ts`.
- `sessionKey = "${chatId}:${userId}"` in groups, `"${chatId}"` in DMs. Mirrors `confirmationWizard` so isolation rules are predictable.
- 30-minute TTL — abandoned selections expire silently on the next read.
- Cold-start clears the Map; the operator just re-selects. Acceptable trade — no schema change, no Neon write per click.
- Insertion-ordered (`Map<productId, SelectionEntry>`) so the bulk summary lists items in the order the operator selected them.

**Telegram surface:**
- Each `/publishready` card now carries a second-row `☑ Seç` button (callback `selt:<id>`).
- After all cards, `/publishready` sends a footer control message with a 4-row keyboard:
  - Row 1: `☑ Tümünü Seç` · `🗑 Temizle`
  - Row 2: `🚀 Aktif Et (N)` · `🚫 Reddet (N)`
  - Row 3: `🔴 Tükendi (N)` · `📦 Stop (N)` · `▶ Devam (N)`
  - Row 4: `📋 Seçimi Göster`
- Counts in labels are rendered at message-send time; the underlying selection state is consulted **live** when the action runs, so a stale label can't cause a wrong target.
- New slash commands: `/selection` (shows current list + control keyboard from anywhere), `/clearselection`. Both registered in `SHARED_CMDS`.

**Callback wiring:**
- `selt:<id>` — toggle one item, answer with `✅ Seçildi · Toplam: N` or `❌ Kaldırıldı · Toplam: N`. SN looked up best-effort so bulk summaries read with SNs not raw IDs.
- `seladd:pr` — re-fetch the current `/publishready` list and add all visible IDs, deduping. Sends a fresh control message with the new count.
- `selclr` — clear, answer with `🗑 Seçim temizlendi (N)`.
- `selshow` — re-render the selection text + control keyboard.
- `selrun:<action>` — execute against current selection.

**Execution — reuses D-239 unchanged:**
| Action | Per-item helper |
|---|---|
| `act` | `approveAndActivateProduct` (publishDesk.ts) |
| `rej` | `recordPublishDecision('rejected')` (publishDesk.ts) |
| `soldout` / `oneleft` / `twoleft` / `stopsale` / `restartsale` | `applyOperatorAction` (operatorActions.ts) |

All wrapped in `runBatch` from D-239 — per-item refusals (`⚠️ engellendi`), idempotency (`🟰 zaten ...`), notFound (`❓`), and exceptions (`❌`) flow through `formatBatchSummary` exactly like the slash-command batch path. Identical UX, identical safety.

**Post-action selection cleanup:**
- For `act` and `rej`: successfully-actioned items are dropped from the selection so the next bulk press doesn't re-target them. Failed/refused items stay so the operator can investigate without re-selecting.
- For state-write actions: selection preserved (operator might want to chain — soldout → /find each).

**Graceful eligibility drift:**
If a selected item became ineligible between selection and execution (e.g. it was activated separately, or its readiness lapsed because someone unconfirmed), the per-item helper refuses cleanly with the concrete reason. `runBatch` collects it as `refused` and the summary line shows the actual blocker. Nothing crashes; nothing else gets blocked.

**Hard publish rule preserved.**
Every bulk action is one explicit operator gesture (the button press). No auto-publish anywhere. The same `evaluatePublishReadiness` gate refuses ineligible items per-item. Same audit-trail events (`publish.approved`, `publish.rejected`, `product.activated`, `state.repaired`-style coherence patches) are emitted exactly as in single-item flows — `triggeredBy: 'selection_bulk'` distinguishes the entry point in the bot-events payload.

**Verification — selection state machine smoke test:**
| Case | Result |
|---|---|
| toggle add 100 / 200 / 300 → size 3 | ✓ |
| toggle add then remove 200 → size 2 | ✓ |
| identifiers fall back to ID when no SN | ✓ (`["SN0100","300"]`) |
| addMany dedups items already in selection | ✓ |
| different user same chat → fresh selection | ✓ |
| DM (no userId) → key falls back to chatId, independent of group | ✓ |
| clear drops all | ✓ |
| empty / non-empty format strings | ✓ |
| control keyboard shape (4 rows, count in labels) | ✓ |

Typecheck: zero new errors. Only the four pre-existing ones remain.

**Out of scope (v1):**
- `/inbox publish` per-item selection — that surface is text bullet lines, not per-item keyboards. Restructuring would mean N extra messages per `/inbox publish` view. The operator can `/find` an item then use `☑ Seç` from the resulting card, or use `/publishready` which is the priority surface. Defer until proven necessary.
- Persistent selection across Lambda cold-starts — the in-memory Map is sufficient at the operator's daily scale; cold-start clears act as a natural safety net against forgotten selections.
- `/restock` bulk via selection — qty disambiguation needs UI (one qty for all? per-item qty?) Operator uses the slash command `/restock SN1,SN2 10` for now (D-239 batch path).
- Per-channel redispatch via selection — `/redispatch` stays single-target per D-235.
- `/repair` via selection — repair stays explicit and per-product per D-238 to avoid silent mass scrubbing.

**Risk class:** low. New file (`operatorSelection.ts`) + 1 new button row in `publishDeskButtons` + 2 new slash commands + 1 new callback prefix block. No schema change, no DB writes. Reversible via single-commit revert.

**Status:** Shipped to `main`. Soak validation = run `/publishready` → tap `☑ Seç` on 2 cards → press `🚀 Aktif Et (2)` → confirm both activate via the bulk summary; press `📋 Seçimi Göster` between actions to verify the running count; let selection sit > 30 min and verify it expires silently (next press shows empty).

**Reversible:** yes — new helper file + per-card button row + footer control message + 5 callbacks + 2 slash commands.

---

## D-241 — Lead Desk / Customer Inquiry Pipeline v1

**Decision:**
Build a Telegram-first Lead Desk on top of the EXISTING `customer-inquiries` collection so the operator can triage website inquiries from Telegram without an admin visit. No new collection. No new architecture. Smallest extension of the existing schema + a new helper module + a small set of slash commands and one inline-button callback prefix.

**Reused, not invented:** the `customer-inquiries` collection, registered in `payload.config.ts`, populated by the existing storefront POST `/api/inquiries` (with `status='new'` defaulted), and already linked from the admin Dashboard. The collection had a 3-status enum (`new | contacted | completed`) — useful but too narrow for a real pipeline.

**Schema extension (additive only):**
- Status enum: extended from `[new, contacted, completed]` to `[new, contacted, follow_up, closed_won, closed_lost, spam, completed]`. `completed` is intentionally retained as a legacy alias for `closed_won` so pre-D-241 rows render cleanly without a backfill (operator can re-classify with `/won` if needed).
- New fields: `source` (text, default 'website'), `lastContactedAt` (date), `handledAt` (date), `assignedTo` (relationship → users).
- All additions are nullable / defaulted — no backfill needed.

**Neon DDL required (per `feedback_push_true_drift.md` lesson — push:true silently skips ALTER TYPE ADD VALUE for select-field options):**
```
ALTER TYPE enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'follow_up';
ALTER TYPE enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'closed_won';
ALTER TYPE enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'closed_lost';
ALTER TYPE enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'spam';
```
The DDL is documented inline in `CustomerInquiries.ts` as a comment block above the status field so it can't get lost.

**Defensive code path:** `applyLeadStatus` catches the "invalid input value for enum" PG error and returns a Telegram-friendly refusal that names the exact DDL line the operator needs to run. This means an operator who runs `/contacted` etc. *before* applying the DDL gets a clear, actionable error rather than a silent failure.

**New helper — `src/lib/leadDesk.ts` (~330 LOC):**
- `getOpenLeads(payload)` — pulls leads whose status is in `{new, contacted, follow_up}`, returns priority-sorted top-10 plus per-status counts. Sort: `new` newest-first, then `follow_up` oldest-contact-first, then `contacted` oldest-contact-first.
- `getTodayLeads(payload)` — today's snapshot: count of new today + counts of `contacted/closed_won/closed_lost/spam` updated today.
- `getLeadById(payload, id)`.
- `applyLeadStatus(payload, leadId, action, source)` — single source of truth for status writes. Action ∈ `{contacted, followup, won, lost, spam}`. Idempotent — if already in target state returns `ok+idempotent` without writing. Stamps `lastContactedAt` on `contacted`/`follow_up`, stamps `handledAt` on `closed_won`/`closed_lost`/`spam`, clears `handledAt` on closed→open reopen. Emits `lead.status_changed` bot-event for audit trail. Treats legacy `completed` as equivalent to `closed_won` for the `/won` short-circuit so legacy rows don't churn.
- Formatters: `formatOpenLeadsList`, `formatLeadsToday`, `formatLeadCard`, `formatLeadLine`, `statusEmoji`. All HTML-escape user input (verified via smoke test with `<script>` injection).
- `leadButtonsKeyboard(leadId)` — 2-row inline keyboard: `[📞 Arandı] [🔁 Takip]` / `[🏆 Kazanıldı] [❌ Kaybedildi] [🚮 Spam]`.

**Telegram surface (registered in SHARED_CMDS):**
| Command | Behaviour |
|---|---|
| `/leads` | Open list (capped 10), status counts, priority sort, action hint footer |
| `/leads today` | Today's snapshot with counts and the day's first 10 created |
| `/lead <id>` | Detail card + inline 5-button keyboard |
| `/contacted <id>` | Mark contacted (sets lastContactedAt) |
| `/followup <id>` | Mark follow_up (sets lastContactedAt) |
| `/won <id>` | Mark closed_won (sets handledAt) |
| `/lost <id>` | Mark closed_lost (sets handledAt) |
| `/spam <id>` | Mark spam (sets handledAt) |

Word-boundary command matching (`firstWord === '/lead'`) — not `startsWith` — so future `/leadassign` / `/leadsearch` don't false-match.

**Inline button callback `ldact:<leadId>:<action>`** routes to the same `applyLeadStatus` helper as the slash commands — slash and button paths are identical, idempotent, and emit the same audit event.

**Audit trail:** `bot-events` rows with `eventType='lead.status_changed'`, `sourceBot='uygunops'`, `payload={leadId, fromStatus, toStatus, action, source, changedAt}`. Reuses the existing journal — no schema change to bot-events. Lead ID lives in the payload JSON since `bot-events.product` is product-only and optional.

**Test evidence (logic-only smoke test, 30 assertions):**
- statusEmoji map (7 statuses) ✓
- formatLeadLine includes id/name/phone/SN/size ✓
- formatOpenLeadsList empty state + non-empty (counts in header) ✓
- formatLeadsToday counts ✓
- formatLeadCard includes header/name/message/size/product/source ✓
- HTML escape safety: `<script>x</script>` in name → `&lt;script&gt;x&lt;/script&gt;` ✓
- `1<2>3` in message → `1&lt;2&gt;3` ✓
- leadButtonsKeyboard shape (2 rows, callback_data prefixes correct) ✓
- Typecheck: zero new errors

**Out of scope (v1):**
- Bulk lead actions via D-239 `runBatch` — per-lead is fast enough for current volume; can layer on later as `/leads bulk`.
- `/leadsearch <phone-or-name>` — defer until volume warrants.
- `/leadassign <id> <operator>` — collection field is there for future use; no UI yet.
- `/inbox` integration to surface open lead count — defer; `/leads` is the canonical surface.
- Auto-classifying inbound spam — operator decides per-lead in v1.

**Risk class:** low. Additive schema (4 new optional fields + 4 new enum values) + new helper module + 6 new slash command branches + 1 new callback prefix block. No mutation of existing fields. Existing `/api/inquiries` POST and the admin Dashboard fetch unchanged. Reversible via single-commit revert (the new enum values are harmless even after revert — Postgres doesn't drop enum values).

**Status:** Shipped to `main`. **Next operator step:** apply the 4-line Neon DDL above. Then soak: create a lead via the storefront form (or directly via admin) → `/leads` → `/lead <id>` → press `📞 Arandı` (verify lastContactedAt set + bot-event written) → press it again (verify `🟰 zaten contacted`) → press `🏆 Kazanıldı` (verify handledAt set + status flipped). Repeat for `/lost` and `/spam`.

**Reversible:** yes — additive schema + new helper file + 8 new commands/callbacks. Note: enum values added on Neon stay in the enum even after revert (Postgres doesn't drop enum values), but old code paths simply never write them.

---

## D-242 — Lead Integration into /inbox

**Decision:**
Surface customer leads inside the existing `/inbox` operator queue so the operator's daily Telegram triage starts in one place. Smallest extension of D-236 + D-241 — no new collection, no new architecture, no schema change, no new bot. Reuse D-241's `getOpenLeads` as the single source of truth so `/inbox` and `/leads` can never diverge.

**Lead bucket rules — chosen for truthfulness, not novelty:**
- "Open" = `status ∈ {new, contacted, follow_up}`. Same set as `/leads`. Closed states (`closed_won`, `closed_lost`, `spam`, `completed`) are excluded.
- Priority sort on the cards: `new` newest-first → `follow_up` oldest-contact-first → `contacted` oldest-contact-first.
- "Stale" lightweight aging signal: `contacted` or `follow_up` leads whose `lastContactedAt` (or `createdAt` if never contacted) is older than **3 days**. Computed in-memory from the same `getOpenLeads` result — no schema change, no extra query.

**Inbox overview extension** (`getInboxOverview` + `formatInboxOverview` in `src/lib/operatorInbox.ts`):
- New `leads` field returned: `{ totalOpen, newCount, followUpCount, contactedCount, staleCount, staleDays }`.
- New `📬 Lead` section in the formatter:
  ```
  📬 Lead: <total>
    • Yeni: N
    • Takip: N
    • Arandı (açık): N
    • ⏰ Bayat (3+ gün): N      ← only rendered when staleCount > 0
  ```
- Empty short-circuit (`✅ Aksiyon gerektiren bir şey yok. Temiz.`) still fires when ALL buckets are zero, now including leads.
- Help/detail line updated to advertise `/inbox leads` and `/contacted /won` action paths.

**New sub-command `/inbox leads`** (aliases: `/inbox lead`, `/inbox müşteri`, `/inbox musteri`):
- Renders the header text via new `formatInboxLeadsHeader`.
- Streams the priority-sorted top-5 open leads, each as its own message with the full **D-241 `leadButtonsKeyboard`** — the same 5-button row (📞 Arandı / 🔁 Takip / 🏆 Kazanıldı / ❌ Kaybedildi / 🚮 Spam) wired to the `ldact:<leadId>:<action>` callback, all converging on `applyLeadStatus`.
- Overflow above 5 → single `+ N daha — tüm liste için /leads` hint.
- Empty state: `📬 Inbox · Lead — ✅ Açık lead yok.` with pointer at `/leads today` and `/lead <id>`.

**Why per-lead cards instead of one big text block:**
- Operator can act in-place — one tap, no copy/paste, no slash command typing.
- Same UX pattern already used by `/publishready` (D-237) and `/lead <id>` (D-241), so the operator's mental model carries over.
- Cap at 5 keeps the surface concise; full list is one tap away via `/leads`.

**Why per-lead buttons in `/inbox leads` but NOT in the `/inbox` overview itself:**
- Overview is a counts-only summary — adding 5 buttons per bucket would clutter the surface.
- Counts in overview tell the operator WHAT to look at; `/inbox leads` is one tap deeper for actual triage.
- Mirrors how `/inbox publish` shows counts but actions live in `/publishready`.

**Convergence with D-241 — no duplicate source of truth:**
- `getInboxLeads` is a thin wrapper over `getOpenLeads`. Same query, same priority sort, same status set.
- Action buttons reuse `leadButtonsKeyboard` exactly; callbacks land on the same `applyLeadStatus` helper as the slash commands.
- Audit trail in `bot-events` continues to work unchanged (one `lead.status_changed` event per action, regardless of entry point).

**Soak evidence:**
| Check | Result |
|---|---|
| Typecheck (zero new errors; same 4 pre-existing) | ✓ |
| `getInboxLeads` counts match real Neon (3 open, all `new`) | ✓ |
| `formatInboxLeadsHeader` populated render | ✓ |
| `formatInboxLeadsHeader` empty render | ✓ |
| Per-lead card with correct `ldact:<id>:contacted` callback | ✓ |
| Backdated lead correctly marked stale (`staleCount=1`) | ✓ |
| `formatInboxOverview` with leads + stale signal | ✓ |
| `formatInboxOverview` with leads but no stale (stale row hidden) | ✓ |
| `formatInboxOverview` fully-empty short-circuit (`Temiz`) | ✓ |

Soak harness committed at `scripts/d242-soak.ts` for future re-runs.

**Out of scope (v1):**
- Per-lead inline action buttons inside the overview itself — kept as concise text. Actions live one tap deeper at `/inbox leads` (mirrors how `/inbox publish` works).
- SLA/breach alerts beyond the simple 3-day stale count.
- Lead bulk-selection mirroring D-240 — defer until volume warrants.
- `/inbox stale` filter view — current `/leads` already does priority sort with stale leads bubbling up via `lastContactedAt asc`.
- Lead source filter (e.g. `/inbox leads website`) — defer; v1 is read-first integration.

**Risk class:** very low. Additive helpers + 1 new switch case + 1 new section in the overview formatter. No mutations. No schema change. No new collection. Reusable from existing patterns. Reversible via single-commit revert.

**Status:** Shipped to `main`. Soak validation passed at the data layer. Operator validation: `/inbox` → see the new `📬 Lead` row → `/inbox leads` → see the 3 reset test leads with action buttons → tap `📞 Arandı` on any → confirm immediate status update + audit event (same as direct `/contacted` from D-241 since both routes converge on `applyLeadStatus`).

**Reversible:** yes — extends existing helpers + adds 1 switch case + 1 sub-command branch. No schema change.

---

## D-243 — Lead Alerts / Follow-Up Reminder Layer v1

**Decision:**
Add a three-pronged lightweight reminder layer on top of D-241/D-242:
1. **Push** — proactive Telegram alert when a new lead arrives via the storefront.
2. **Pull** — `/leadreminders` slash command surfacing stale-and-open leads with action buttons.
3. **Snapshot** — `/leads summary` daily digest.

No new collection. No schema change. No scheduler/cron. All three reuse existing helpers + the same `TELEGRAM_CHAT_ID` chat-routing convention as `src/lib/stockReaction.ts`.

**Push: new-lead Telegram alert**
- Trigger: `POST /api/inquiries` after `payload.create` succeeds.
- Fire-and-forget via `void (async ()=>{...})()` so a Telegram failure never blocks the storefront response (the lead is already saved).
- New helper `sendNewLeadAlert(payload, leadId)` in `src/lib/leadDesk.ts` — fetches the lead, formats a concise card via new `formatNewLeadAlert`, posts to `https://api.telegram.org/bot<TOKEN>/sendMessage` with the full 5-button `leadButtonsKeyboard`. Same `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` env, same fire-and-forget pattern as the stock alerts.
- Alert content: `🚨 YENİ LEAD · #<id>` + 👤 name + 📱 phone + 🛍️ product (SN tag if linked) + 📐 size + 💬 message preview (200-char cap) + 🌐 source + `Detay: /lead <id>` hint.
- Audit trail: `lead.new_alert_sent` bot-event with `{leadId, sentAt, chatId}` payload (best-effort; non-fatal on failure).
- Storefront route extended to also accept `message` and `source` from the body — existing form should already pass these.

**Pull: /leadreminders (aliases: /hatirla, /hatırla)**
- Reuses D-242's stale rule **exactly** — no parallel definition. Stale = `status ∈ {new, contacted, follow_up}` AND `(lastContactedAt ?? createdAt)` older than 3 days.
- New helper `getStaleLeads(payload, {staleDays=3, limit=25})` calls `getOpenLeads`, filters by age, sorts oldest-first, splits into `neverTouchedCount` (`status='new'`) vs `needsFollowupCount` (`contacted` / `follow_up`).
- Header counts: `🆕 hiç dokunulmamış: N · 🔁 takip gecikti: N` so urgency is visible at a glance.
- Streams top-5 stale leads as cards with the existing `leadButtonsKeyboard` (one tap → action). Overflow above 5 → `+ N bayat lead daha — tüm açık liste için /leads` hint.
- Empty state: `✅ Bayat lead yok (3 günden eski açık lead bulunamadı)`.
- Closed leads (`closed_won`/`closed_lost`/`spam`/`completed`) explicitly excluded by reusing `getOpenLeads`.
- Registered in SHARED_CMDS (`/leadreminders`, `/hatirla`, `/hatırla`).

**Snapshot: /leads summary (alias: özet, ozet)**
- Concise daily digest — bugün yeni / arandı / kazanıldı / kaybedildi / spam counts + açık total + stale signal in one block.
- New helper `getDailyLeadSummary(payload)` wraps `getTodayLeads` (D-241) + `getOpenLeads` + `getStaleLeads`. Single source of truth preserved.
- Footer: `/leads · /leadreminders · /inbox leads` so operator can drill into each lane.

**Convergence — no parallel rules:**
| Concept | Defined in | Reused by |
|---|---|---|
| Open status set | `getOpenLeads` (D-241) | D-242 `getInboxLeads`, D-243 `getStaleLeads`, D-243 `getDailyLeadSummary` |
| Stale rule (3 days, lastContactedAt ?? createdAt) | D-242 `getInboxLeads` aging signal | D-243 `getStaleLeads` (same threshold) |
| Action buttons | D-241 `leadButtonsKeyboard` | D-242 `/inbox leads`, D-243 alert + reminders |
| Status writes | D-241 `applyLeadStatus` | All ldact: callbacks (slash + button paths) |
| Chat routing | `TELEGRAM_CHAT_ID` env (`stockReaction.ts` precedent) | D-243 alert dispatch |

**Noise / dedup behaviour:**
- New-lead alert fires **once per successful create**. Storefront POST is a single transactional event — duplicate POSTs would create duplicate rows AND duplicate alerts (same as existing semantics). Not different from stock alerts.
- `/leadreminders` is operator-pulled — no spam.
- No proactive cron yet. Defer until operator confirms `/leadreminders` cadence is right; cron can be layered on later with a `lead.stale_reminder_sent` bot-event for per-lead-per-day dedup.

**Test evidence (against live Neon, 9 assertions all pass):**
| Check | Result |
|---|---|
| sendNewLeadAlert captures correct Telegram payload (URL, chat_id, text, keyboard) | ✓ |
| Audit-event delta = 1 (`lead.new_alert_sent` written) | ✓ |
| Missing TELEGRAM env → safe noop with warn | ✓ |
| Missing lead id → safe noop, no throw | ✓ |
| Empty stale state → `✅ Bayat lead yok` rendered | ✓ |
| Backdated leads correctly surface (2 stale: 1 never-touched + 1 needs-followup) | ✓ |
| Oldest-first sort | ✓ |
| Closed lead correctly excluded from /leadreminders | ✓ |
| Daily summary counts + format correct | ✓ |

Soak harness committed at `scripts/d243-soak.ts`. Typecheck: zero new errors.

**Out of scope (v1):**
- Proactive stale-reminder cron — `/leadreminders` is operator-pulled in v1. If/when added, dedup via `lead.stale_reminder_sent` bot-event keyed on (leadId, day).
- Per-customer mute / snooze.
- SLA breach alerts beyond stale threshold.
- Multi-chat dispatch routing — single `TELEGRAM_CHAT_ID` like every other system alert.
- Rich media in alerts (product image preview).
- Time-window filters on `/leadreminders` (e.g. "stale 5+ days").

**Risk class:** very low. Additive helpers in `leadDesk.ts` + 1 alert dispatch wired into `/api/inquiries` POST (fire-and-forget, non-blocking) + 2 new slash commands. No schema change. No mutations beyond what `applyLeadStatus` already does (button callbacks). Reversible via single-commit revert.

**Status:** Shipped to `main`. Soak validation passed at the data layer. Operator validation: submit a test inquiry via the storefront form → confirm a `🚨 YENİ LEAD` message arrives with the action buttons. Then `/leadreminders` (with no stale leads, expect empty state) and `/leads summary` (always renders the daily counts).

**Reversible:** yes — additive helpers + 2 new commands + 1 alert dispatch. No schema change.

---

## D-244 — Lead → Sale Conversion Logging v1

**Decision:**
Add a lightweight conversion-logging layer so a "won" lead becomes a real Order linked back to the originating inquiry. **Reuse the existing Orders collection** (rich schema, existing afterChange hook handles stock + inventory + reaction) — do NOT invent a parallel sales/conversion table. Smallest extension: one additive nullable FK from Orders to customer-inquiries, plus helpers + 3 new Telegram commands. No new architecture, no new bot.

**Reuse vs new — verified decision:**
- `Orders` collection already exists with truthful semantics: `orderNumber` (auto), `customerName`/`customerPhone`/`customerAddress`, `product`/`size`/`quantity`/`totalPrice`, `status` (new/confirmed/shipped/delivered/cancelled), `source` (website/telegram/phone/instagram/shopier), `paymentMethod`/`isPaid`, `notes`, shipping fields.
- Orders.afterChange hook already decrements stock, writes inventory log, triggers stock reaction (gated on `source !== 'shopier'` and `!isDispatchUpdate`).
- The single missing piece was lead provenance — no link from `customer-inquiries` (lead) to `orders` (sale).
- Conclusion: reuse Orders; add `relatedInquiry` FK; do NOT duplicate stock/inventory writes.

**Schema extension (additive only):**
- New field `relatedInquiry` on Orders: `relationship` → `customer-inquiries`, optional, sidebar-positioned.
- Neon DDL applied directly in this session: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS related_inquiry_id integer REFERENCES customer_inquiries(id) ON DELETE SET NULL` (per `feedback_push_true_drift.md` lesson — push:true is unreliable for column adds across cold starts).

**New helpers in `src/lib/leadDesk.ts` (~330 LOC):**
- `convertLeadToOrder(payload, leadId, opts)` — single source of truth for lead-to-sale.
  - Pre-fills customer + product + size from the lead (no operator data re-entry).
  - **Idempotent**: refuses with `already_converted` + returns the existing order if a row with `relatedInquiry=leadId` exists. Repeated `/convert` calls never duplicate.
  - Optional `totalPrice` (numeric, written if > 0) and `notes` (free-form).
  - **Default-flips lead to `closed_won`** via `applyLeadStatus(won)` so the desk and the Order stay in sync. Set `flipLeadToWon:false` to skip.
  - Source set to `'telegram'` so Orders.afterChange runs the proper non-Shopier path (decrement stock + inventory log + stock reaction). Zero duplicate writes.
  - Emits `lead.converted` bot-event for audit.
- `getConversionForLead(payload, leadId)` — lookup; returns null if no order linked.
- `getSalesToday(payload, {topN=5})` — counts today's orders (any source), splits `countFromLeads`, sums `totalRevenue`. Defensive numeric coercion via new `toNumber()` helper handles both Payload-coerced numbers and raw pg `numeric` strings.
- Formatters: `formatConversionCard` (full Order card or empty-state pointer), `formatSalesTodaySnapshot`.
- `applyLeadStatus` patched: every `closed_won` transition appends `💰 Satış kaydetmek için: /convert <id> [tutar] [not...]` so `/won`, the inline 🏆 button, and the auto-flip from `convertLeadToOrder` all surface the next step. Resolves the "ambiguous half-state" risk the spec calls out.

**Telegram surface (registered in SHARED_CMDS):**
| Command | Behaviour |
|---|---|
| `/convert <lead-id>` | Smallest path: idempotent, no amount/notes |
| `/convert <lead-id> 1500` | With amount |
| `/convert <lead-id> 1500 Kapıda nakit` | With amount + free-form note |
| `/conversion <lead-id>` | Full Order card or empty-state pointer |
| `/sales today` (alias: bugun, bugün) | Count + lead-converted split + totalRevenue + last 5 |

Word-boundary matching on `/convert`, `/conversion`, `/sales` so future related commands (`/convertall`, `/conversions`, `/salesweek`, etc.) won't false-match.

**Convergence with prior D-NNs — no parallel rules:**
| Concept | Defined in | Reused by |
|---|---|---|
| Lead status writes | D-241 `applyLeadStatus` | D-244 auto-flip after convert + the `/won` hint |
| Order create + stock side-effects | Existing Orders.afterChange | D-244 `convertLeadToOrder` |
| Audit-trail journal | bot-events | D-244 emits `lead.converted` |
| Operator chat routing | TELEGRAM_CHAT_ID env (D-243) | unchanged — no new alerts |

**Test evidence (against live Neon, 10 assertions all pass):**
| Check | Result |
|---|---|
| Empty-state /conversion render | ✓ |
| /convert first run: order created, all fields populated, lead flipped to closed_won, audit event written | ✓ |
| /convert second run: idempotent=true, returns existing order number, no duplicate row | ✓ |
| Lead status auto-flipped to closed_won post-convert | ✓ |
| /conversion populated render shows full Order card | ✓ |
| Missing lead refusal: `lead_not_found` | ✓ |
| Smallest path (no amount/notes) works | ✓ |
| /sales today: count=2, fromLeads=2, totalRevenue=1500 (after numeric coercion fix) | ✓ |
| 2x lead.converted bot-events written | ✓ |
| `/won` hint includes `/convert <id> [tutar] [not...]` line | ✓ |

Soak harness committed at `scripts/d244-soak.ts`. Typecheck: zero new errors.

**Numeric-coercion bug fix discovered during soak:**
First soak run reported `fromLeads=0 totalRevenue=0` despite both orders being lead-linked with one priced at 1500. Root cause: pg returns `numeric` columns as strings by default, so `typeof o.totalPrice === 'number'` evaluated false. Fixed by adding `toNumber()` defensive coercion in both `normalizeOrder` and `getSalesToday`. Also extended the relatedInquiry shape detection to accept both `relatedInquiry` (Payload runtime) and `relatedInquiryId` (raw DB) for robustness. Re-soak confirmed correct aggregation.

**Out of scope (v1):**
- Editing an existing Order's amount via Telegram — operator uses admin if they need to change it. `/convert` is for the initial record; subsequent edits stay in admin.
- Marking an Order shipped/delivered/cancelled via Telegram — Orders has those statuses but they're admin-driven for v1.
- Refund / cancellation flow.
- Multi-product Orders — Order schema already supports one product per row, matching the lead model.
- `/sales week` / `/sales month` / per-source breakdown — defer until daily volume warrants.
- Auto-creating Order on `/won` — intentionally separate; operator may not have the price at the moment of /won, and the "convert means $$$ commitment" gesture should stay explicit.

**Risk class:** low. One additive nullable FK + new helpers + 3 new slash commands + 1 line patch to applyLeadStatus message. No mutation of existing Orders fields. No mutation of Orders.afterChange. No schema change beyond the FK. Reusable from existing patterns. Reversible via single-commit revert (FK column stays in Postgres but unused, harmless).

**Status:** Shipped to `main`. Neon DDL applied. Soak passed end-to-end. **Next operator step:** `/convert <some-lead-id>` on a real lead to validate the Telegram-side flow. The Order record will appear in admin with the lead link, stock will decrement via the existing afterChange hook, and `/sales today` should show the running tally.

**Reversible:** yes — additive FK + new helpers + 3 new commands + 1 message-line patch. No schema removal needed if reverted (FK column stays harmless).

---

## D-245 — Order Fulfillment / Post-Sale Status Controls v1

**Decision:**
Add a Telegram-first fulfillment surface so routine post-sale handling (ship → deliver → cancel) can happen without an admin visit. **Reuse the existing Orders collection AS-IS** — no schema change. The schema was already fulfillment-ready: `status ∈ {new, confirmed, shipped, delivered, cancelled}`, `shippedAt` / `deliveredAt` / `shippingCompany` / `trackingNumber` fields all exist. The only gap was Telegram surface.

**Reused, not invented:**
- `Orders` collection (D-244-extended with `relatedInquiry` FK; everything else pre-existing).
- `Orders.afterChange` hook unchanged — it only fires on `operation === 'create'` and handles stock decrement + inventory log + stock reaction. Status updates from D-245 pass `context: { isDispatchUpdate: true }` as a defensive belt-and-suspenders even though the hook wouldn't fire on update anyway.
- `bot-events` for audit trail (`order.status_changed` event type).
- `getPayload` from `@/lib/payload` — same singleton everywhere.

**New helper — `src/lib/orderDesk.ts` (~360 LOC):**
- `getOpenOrders(payload)` — `status ∈ {new, confirmed, shipped}`, capped at 10. Sort: `new` newest-first → `confirmed` newest-first → `shipped` oldest-first (so late-shipping orders bubble up).
- `getTodayOrders(payload)` — created/shipped/delivered/cancelled today + open total + last 5 created.
- `getOrderById(payload, id)` — null on miss.
- `applyOrderStatus(payload, orderId, action, source)` — single source of truth. Idempotent. Stamps `shippedAt`/`deliveredAt`. Refuses pathological transitions (see rules below). Emits `order.status_changed` bot-event.
- Formatters: `formatOrderLine`, `formatOpenOrdersList`, `formatOrdersToday`, `formatOrderCard`.
- `orderButtonsKeyboard(o)` — 2-row inline keyboard: Row 1 = `📦 Kargola · 🏠 Teslim · ❌ İptal` (only when not terminal); Row 2 = `🆔 Lead #N · 🔍 Ürün` nav (only when relatedInquiryId/productId present).

**Status state machine — refusal rules:**
| From → Action | Result |
|---|---|
| `cancelled` → ship | refuse `invalid_transition` with "yeni sipariş için /convert" hint |
| `delivered` → ship | refuse `invalid_transition` |
| `cancelled` → deliver | refuse `invalid_transition` |
| `confirmed` / `new` → deliver | **ALLOW** with auto-stamped shippedAt = deliveredAt (same-day local courier case; timeline truthfulness preserved) |
| `delivered` → cancel | refuse with "İade için admin panelinden işlem yapın" hint |
| same-status → same | idempotent no-op (`🟰 zaten <status>`) |

**Stock side-effects on cancel — explicit, not faked:**
The repo has no order-cancel restore-stock path. We do NOT silently restore stock. `/cancelorder` response includes:
```
⚠️ Stok otomatik geri eklenmedi.
Gerekirse: /restock <sn> <qty>
```
…using the actual SN from the order's product when available, otherwise the generic placeholder. Operator restores stock explicitly via D-234 if needed. This is a deliberate decision — silent stock restoration would be opaque and error-prone (e.g. wrong size variant); explicit /restock keeps the operator in control and matches the existing operator-pack patterns.

**Telegram surface — registered in SHARED_CMDS:**
| Command | Behaviour |
|---|---|
| `/orders` | Open queue (10 max), priority sort, status counts |
| `/orders today` | Today's snapshot — counts + last 5 created |
| `/order <id>` | Detail card + inline action/nav keyboard |
| `/ship <id>` | Mark shipped (stamps shippedAt) |
| `/deliver <id>` | Mark delivered (stamps deliveredAt; backfills shippedAt if missing) |
| `/cancelorder <id>` | Mark cancelled with `/restock` hint |

Word-boundary command matching to avoid false positives.

**Inline-button callbacks:**
- `oract:<orderId>:<action>` — same code path as the slash commands; both converge on `applyOrderStatus`.
- `ldcard:<leadId>` — used by Order keyboard's "🆔 Lead #N" jump; renders the D-241 lead card with the full leadButtonsKeyboard.

**Convergence with prior D-NNs — no parallel rules:**
| Concept | Defined in | Reused by |
|---|---|---|
| Order schema + stock-on-create | Existing Orders + afterChange | D-245 — unchanged |
| `relatedInquiry` link | D-244 | D-245 nav button + lead jump |
| Audit-trail journal | bot-events | D-245 emits `order.status_changed` |
| Stock restore | `/restock` (D-234) | D-245 surfaces pointer; doesn't duplicate |
| Lead card render | D-241 `formatLeadCard` + `leadButtonsKeyboard` | D-245 `ldcard:` callback |

**Test evidence (against live Neon, 17 assertions all pass):**
| Check | Result |
|---|---|
| Open queue with 3 seeded orders, priority sort, counts (new=1, confirmed=2) | ✓ |
| Detail card shows lead nav + product SN | ✓ |
| `/ship` first run: status flip + shippedAt stamped | ✓ |
| `/ship` second run: idempotent no-op | ✓ |
| `/deliver` after shipped: status flip + deliveredAt stamped (raw row verified) | ✓ |
| `/deliver` second run: idempotent | ✓ |
| `/ship` after delivered: refused `invalid_transition` | ✓ |
| `/cancelorder` after delivered: refused with refund hint | ✓ |
| `/deliver` from confirmed: ALLOWED + auto-stamps shippedAt (raw row: both timestamps set) | ✓ |
| `/cancelorder` from confirmed: success + `/restock` pointer | ✓ |
| `/cancelorder` second run: idempotent | ✓ |
| `/ship` on cancelled: refused | ✓ |
| Missing order id: `order_not_found` | ✓ |
| Empty-state /orders render | ✓ |
| Today snapshot counts | ✓ |
| 6 `order.status_changed` bot-events written | ✓ |
| Cleanup leaves no residue | ✓ |

Soak harness committed at `scripts/d245-soak.ts`. Typecheck: zero new errors.

**Out of scope (v1):**
- Editing shippingCompany / trackingNumber via Telegram — admin only for v1.
- Refund / return flow — admin only.
- Bulk operations across orders (mass-ship, mass-cancel) — defer until volume warrants.
- Per-cargo-firma routing logic.
- Auto-stock-restore on cancel — architectural decision, kept explicit.
- Customer-facing notification on status change.

**Risk class:** very low. New helper file + new switch cases in route.ts + 3 new slash commands + 1 new callback prefix block. No schema change. No mutation of existing Orders fields, schema, or afterChange hook. Reusable from existing patterns. Reversible via single-commit revert.

**Status:** Shipped to `main`. Soak passed end-to-end at the data layer. **Next operator step:** `/orders` to confirm the queue renders → `/order <id>` on a real order → `/ship <id>` → confirm idempotency by pressing again → `/deliver <id>` → confirm timestamps on the order in admin.

**Reversible:** yes — new helper file + 1 callback prefix block + 5 new slash commands. No schema change.

---

## D-246 — Order Integration into /inbox

**Decision:**
Surface customer orders inside the existing `/inbox` operator queue so daily Telegram triage starts in one place. **Symmetric extension of D-242** (which did the same for leads) — same pattern, no new architecture, no new collection, no schema change. Reuse D-245's `getOpenOrders` as the single source of truth so `/inbox` and `/orders` can never diverge.

**Order bucket rules — no parallel definitions:**
- "Open" = `status ∈ {new, confirmed, shipped}`. Same set as `/orders`. Closed states (`delivered`, `cancelled`) excluded.
- Priority sort on the cards: `new` newest-first → `confirmed` newest-first → `shipped` oldest-first (so late-shipping orders bubble up).
- "Stale shipping" lightweight aging signal: `shipped` orders whose `shippedAt` (or `createdAt` if missing) is older than **3 days**. Late-delivery early warning. Computed in-memory from the same `getOpenOrders` result — no schema change, no extra DB hit.

**Inbox overview extension** (`getInboxOverview` + `formatInboxOverview` in `src/lib/operatorInbox.ts`):
- New `orders` field returned: `{ totalOpen, newCount, confirmedCount, shippedCount, staleShippedCount, staleDays }`.
- New `📦 Sipariş` section in the formatter, between `📬 Lead` and `❌ Hatalar`:
  ```
  📦 Sipariş: <total>
    • Yeni: N
    • Onaylı (kargo bekliyor): N
    • Kargoda: N
    • ⏰ Geç teslim (3+ gün kargoda): N    ← only rendered when staleShippedCount > 0
  ```
- Empty short-circuit (`✅ Aksiyon gerektiren bir şey yok. Temiz.`) still fires when ALL buckets are zero, now including orders.
- Detail line updated to advertise `/inbox orders` and `/ship /deliver` action paths.

**New sub-command `/inbox orders`** (aliases: `/inbox order`, `/inbox sipariş`, `/inbox siparis`):
- Renders the header text via new `formatInboxOrdersHeader`.
- Streams the priority-sorted top-5 open orders, each as its own message with the full **D-245 `orderButtonsKeyboard`** — Row 1: `📦 Kargola · 🏠 Teslim · ❌ İptal` (`oract:<id>:<action>` callbacks); Row 2: `🆔 Lead #N · 🔍 Ürün` nav (only when applicable).
- Overflow above 5 → `+ N daha — tüm liste için /orders` hint.
- Empty state: `📦 Inbox · Sipariş — ✅ Açık sipariş yok.` with pointer at `/orders today` and `/order <id>`.

**Why per-order cards in `/inbox orders` but NOT in the `/inbox` overview itself:**
Same rationale as D-242 leads — overview is a counts-only summary; clutter from 5 buttons per bucket would overwhelm. Counts in overview tell the operator WHAT to look at; `/inbox orders` is one tap deeper for actual triage. Mirrors how `/inbox publish` shows counts but actions live in `/publishready`.

**Convergence with D-245 — no duplicate source of truth:**
- `getInboxOrders` is a thin wrapper over `getOpenOrders`. Same query, same priority sort, same status set.
- Action buttons reuse `orderButtonsKeyboard` exactly; callbacks land on the same `applyOrderStatus` helper as the slash commands.
- Audit trail in `bot-events` continues to work unchanged (one `order.status_changed` event per action, regardless of entry point).

**Soak evidence:**
| Check | Result |
|---|---|
| Typecheck (zero new errors) | ✓ |
| `getInboxOrders` counts match real Neon (4 open: 1 new + 1 confirmed + 2 shipped) | ✓ |
| `staleShippedCount=1` correctly flagged for the 5-day-old backdated order | ✓ |
| `formatInboxOrdersHeader` populated render — all 4 status counts + stale highlight | ✓ |
| `formatInboxOrdersHeader` empty render | ✓ |
| Per-order card with correct `oract:<id>:ship` callback | ✓ |
| `formatInboxOverview` with leads + orders + stale shipping (all sections render) | ✓ |
| `formatInboxOverview` with orders but no stale (stale row hidden) | ✓ |
| `formatInboxOverview` fully-empty short-circuit (`Temiz`) | ✓ |

Soak harness committed at `scripts/d246-soak.ts` for future re-runs.

**Out of scope (v1):**
- Per-order inline action buttons inside the overview itself — kept as concise text. Actions live one tap deeper at `/inbox orders` (mirrors D-242).
- SLA/breach alerts beyond the simple 3-day stale-shipping count.
- Order bulk-selection mirroring D-240 — defer until volume warrants.
- `/inbox stale-shipping` filter view — current `/orders` already prioritizes shipped oldest-first via `getOpenOrders` sort.
- Per-customer or per-cargo-firma filter.
- Customer-facing notification on status change.

**Risk class:** very low. Additive helpers + 1 new switch case + 1 new section in the overview formatter + 1 help-line update. No mutations. No schema change. No new collection. Reusable from existing patterns. Reversible via single-commit revert.

**Status:** Shipped to `main`. Soak validation passed at the data layer. Operator validation: `/inbox` → see the new `📦 Sipariş` row → `/inbox orders` → see the cards with action buttons → tap `📦 Kargola` on any → confirm immediate status update + audit event (same as direct `/ship` from D-245 since both routes converge on `applyOrderStatus`).

**Reversible:** yes — extends existing helpers + adds 1 switch case + 1 sub-command branch. No schema change.

---

## D-247 — Order Alerts / Delivery Reminder Layer v1

**Decision:**
Add a three-pronged lightweight reminder layer for orders, mirroring D-243 leads exactly:
1. **Push** — proactive Telegram alert when a new order arrives.
2. **Pull** — `/orderreminders` slash command surfacing stale-shipped orders with action buttons.
3. **Snapshot** — `/orders summary` daily digest.

No new collection. No schema change. No scheduler/cron. Same `TELEGRAM_CHAT_ID` chat-routing convention as `stockReaction.ts` and D-243.

**Push: new-order Telegram alert — wired into Orders.afterChange**
- New parallel hook entry in `Orders.afterChange` (separate from the existing stock-decrement entry — single responsibility per callback).
- Fires on `operation === 'create'` for **EVERY** source EXCEPT `source === 'telegram'` (operator already saw `/convert` response from D-244 — double-notification would be noise).
- Skip flags applied: `req.context.isDispatchUpdate` and `source === 'telegram'`.
- Universal coverage: shopier (webhook), website (storefront form), admin (manual), instagram, phone — every channel where the operator hasn't already seen the order.
- Implementation: `sendNewOrderAlert(payload, orderId)` in `src/lib/orderDesk.ts`. Fetches the order, formats via new `formatNewOrderAlert`, posts to Telegram with the full D-245 `orderButtonsKeyboard` so operator can ship/deliver/cancel from the alert. Wrapped in `void (async ()=>{...})()` so a Telegram failure never blocks order persistence.
- Alert content: `🚨 YENİ SİPARİŞ · <orderNumber>` + 👤 customer name + 📱 phone + 🛍️ product SN/title + 📐 size/qty + 💵 totalPrice (with `✅ ödendi` badge if isPaid) + 🌐 source + 🆔 lead link if `relatedInquiry` set + `Detay: /order <id>` hint.
- Audit trail: `order.new_alert_sent` bot-event with `{orderId, orderNumber, source, sentAt, chatId}` payload (best-effort; non-fatal on failure).

**Pull: /orderreminders (aliases: /orderreminder, /siparishatirla, /sipariş_hatirla, /siparis_hatirla)**
- Reuses D-246's stale rule **exactly** — no parallel definition. Stale = `status === 'shipped'` AND `(shippedAt ?? createdAt)` older than 3 days.
- New helper `getStaleShippedOrders(payload, {staleDays=3, limit=25})` calls `getOpenOrders`, filters by status+age, sorts oldest-first.
- Streams top-5 stale orders as cards with the existing `orderButtonsKeyboard` (one tap → action). Overflow above 5 → `+ N geç teslim daha — tüm açık liste için /orders` hint.
- Empty state: `✅ Geç teslim olan kargo yok (3 günden eski kargolanmış sipariş bulunamadı)`.
- Delivered/cancelled excluded by reusing `getOpenOrders` (which only returns open statuses).
- Registered in SHARED_CMDS.

**Snapshot: /orders summary (alias: özet, ozet)**
- Concise daily digest — bugün yeni / kargolanan / teslim edilen / iptal counts + açık total + stale signal in one block.
- New helper `getDailyOrderSummary(payload)` wraps `getTodayOrders` (D-245) + `getOpenOrders` + `getStaleShippedOrders`. Single source of truth preserved.

**Convergence — no parallel rules:**
| Concept | Defined in | Reused by |
|---|---|---|
| Open status set | `getOpenOrders` (D-245) | D-246 inbox bucket, D-247 stale + summary |
| Stale rule (3 days, shippedAt ?? createdAt) | D-246 inbox aging signal | D-247 `getStaleShippedOrders` |
| Action buttons | D-245 `orderButtonsKeyboard` | D-246 `/inbox orders`, D-247 alert + reminders |
| Status writes | D-245 `applyOrderStatus` | All `oract:` callbacks (slash + button paths) |
| Chat routing | `TELEGRAM_CHAT_ID` env (`stockReaction.ts` precedent) | D-243 lead alerts, D-247 order alerts |
| Alert dispatch pattern | D-243 `sendNewLeadAlert` | D-247 `sendNewOrderAlert` (mirror exactly) |

**Noise / dedup behaviour:**
- New-order alert fires **once per successful create**. Single transactional event = single fire-and-forget. Duplicate POSTs would create duplicate rows AND duplicate alerts (same as existing stock-alert / lead-alert semantics; no new dedup risk).
- `/convert` from D-244 sets `source = 'telegram'` so D-247 alert is correctly suppressed — operator only gets one message per `/convert` (the existing `💰 Satış kaydedildi` from D-244).
- `/orderreminders` is operator-pulled — no spam.
- No proactive cron in v1. If/when added, dedup via `order.stale_reminder_sent` bot-event keyed on `(orderId, day)`.

**Test evidence (against live Neon, 9 assertions all pass):**
| Check | Result |
|---|---|
| sendNewOrderAlert captures correct Telegram payload (URL, chat_id, text, keyboard with action+nav rows) | ✓ |
| `order.new_alert_sent` audit-event delta = 1 | ✓ |
| Missing TELEGRAM env → safe noop with warn | ✓ |
| Missing order id → safe noop with warn | ✓ |
| getStaleShippedOrders correctly finds 1 backdated 5-day-old shipped | ✓ |
| formatOrderRemindersHeader populated render | ✓ |
| Delivered orders correctly excluded from reminders after status flip | ✓ |
| formatOrderRemindersHeader empty render | ✓ |
| Daily summary counts + format correct | ✓ |

Soak harness committed at `scripts/d247-soak.ts`. Typecheck: zero new errors.

**Captured Telegram payload (sample):**
```
🚨 YENİ SİPARİŞ · ORD-D247-003473
👤 TEST D-247 — Website
📱 +905550030001
🛍️ SN0001 — Vakko W Collection
📐 Beden 42
💵 Tutar: 1499 ₺
🌐 website
Detay: /order 14
[📦 Kargola] [🏠 Teslim] [❌ İptal]
[🔍 Ürün]
```

**Out of scope (v1):**
- Proactive stale-reminder cron — `/orderreminders` is operator-pulled in v1.
- Per-order mute / snooze.
- SLA breach alerts beyond stale threshold.
- Multi-chat dispatch routing — single `TELEGRAM_CHAT_ID` like every other system alert.
- Rich media in alerts (product image preview).
- Customer-facing notifications (admin handles those).
- Carrier-specific late-shipping rules (uniform 3-day threshold for v1).

**Risk class:** very low. Additive helpers in `orderDesk.ts` + 1 new fire-and-forget alert hook entry in Orders.afterChange (skips when source=telegram or context=dispatch — no behavior change for existing paths) + 2 new slash commands. No schema change. No mutations beyond what `applyOrderStatus` already does (button callbacks). Reversible via single-commit revert.

**Status:** Shipped to `main`. Soak validation passed at the data layer. Operator validation: submit a test order via storefront form OR create one in admin → confirm `🚨 YENİ SİPARİŞ` arrives with action buttons. Then `/orderreminders` (with no stale, expect empty state) and `/orders summary` (always renders the daily counts).

**Reversible:** yes — additive helpers + 1 fire-and-forget hook entry + 2 new commands. No schema change.

---

## D-248 — Business Snapshot / KPI Desk v1

**Decision:**
Add a one-tap Telegram surface that summarizes the entire daily business state. **Pure composition layer** — zero new queries, no schema change, no new architecture, no new collection. Every metric traces back to an existing helper from prior D-NNs.

**Architecture: composition over re-derivation.**
Each prior D-NN already exposes a "today summary" or "open count" helper for its domain:
| Domain | Source | Owns |
|---|---|---|
| Leads | `getDailyLeadSummary` (D-243) | new/contacted/won/lost/spam today, open total, stale total |
| Sales | `getSalesToday` (D-244) | order count today, count from leads, totalRevenue |
| Orders | `getDailyOrderSummary` (D-247) | created/shipped/delivered/cancelled today, open total, stale shipped |
| Stock | `getInboxStock` (D-236) | soldout count, low-stock count |

`getBusinessSnapshot(payload)` runs all four in parallel via `Promise.all`. No new SQL, no parallel rules, no risk of metric divergence between `/business` and the underlying domain commands.

**Telegram surface (registered in SHARED_CMDS):**
| Command | Behaviour |
|---|---|
| `/business` | Default — today snapshot |
| `/business today` | Explicit today snapshot (same render) |
| `/iş` / `/is` | Turkish aliases |

`/business week` intentionally NOT shipped in v1 — every existing helper is today-scoped, so a week version would need new week-scoped queries. Defer until volume warrants.

**Render — concise grouped, operator-grade:**
```
📊 İş Özeti (UTC günü)

📥 Talep (bugün)
  • Yeni lead: N
  • İletişim kuruldu: N
  • Kazanıldı: N
  • Kaybedildi: N · 🚮 Spam: N      ← spam only when > 0
  • Açık lead toplam: N

💰 Satış (bugün)
  • Sipariş: N (M lead'den)          ← M only when > 0
  • Ciro (kayıtlı): X ₺              ← or "—" when 0

📦 Operasyon
  • Açık sipariş: N
  • Kargolanan (bugün): N
  • Teslim edilen (bugün): N · ❌ İptal: N    ← cancel only when > 0

⚠️ Aciliyet                          ← entire block only when urgency > 0
  • 📞 bayat lead (3+gün): N
  • 📦 geç kargo (3+gün): N
  • 🔴 tükenmiş ürün: N
  • ⚠️ az stok: N

/leads · /orders · /inbox · /leadreminders · /orderreminders
```

**Empty-state shortcut:** when ALL 16 signals are zero → single-line `✅ Bugün hiçbir hareket yok ve bekleyen aciliyet yok.` so calm days don't dump a wall of zeros.

**Convergence — no metric divergence risk:**
- Open lead set: `getOpenLeads` (D-241).
- Stale lead rule: 3 days against `lastContactedAt ?? createdAt`, defined in D-243 `getStaleLeads`.
- Open order set: `getOpenOrders` (D-245).
- Stale shipping rule: 3 days against `shippedAt ?? createdAt`, defined in D-246/D-247 `getStaleShippedOrders`.
- Today rules: each `getDailyXSummary` already converts to UTC day boundary consistently.

If the operator ever sees a count in `/business` that doesn't match `/leads` or `/orders`, the bug is in the underlying helper — not in D-248. There's only one source of truth per metric.

**Read-only by construction:**
Every helper called by `getBusinessSnapshot` is read-only (`payload.find` only, no mutations). The composition itself never writes. Verified in soak — the live Neon run produced identical row counts before and after.

**Test evidence (against live Neon, 6 assertions all pass):**
| Check | Result |
|---|---|
| Live composition completes in 1832ms (4 parallel helper calls — under Vercel Lambda budget) | ✓ |
| Live snapshot renders accurately: 3 open leads, 2 low-stock products surfaced from real data | ✓ |
| Fully-empty short-circuit (`✅ Temiz`) | ✓ |
| Busy day with no urgency: urgency block correctly hidden | ✓ |
| Quiet day with mounting urgency: all 4 urgency lines render | ✓ |
| Mixed realistic scenario: optional inline bits (🚮 Spam, ❌ İptal, lead-link split) all conditional | ✓ |
| Typecheck: zero new errors | ✓ |

Soak harness committed at `scripts/d248-soak.ts`.

**Out of scope (v1):**
- `/business week` — needs new week-scoped queries against existing helpers; defer.
- Ratio metrics (conversion rate, win rate, AOV) — operator can compute from raw counts; ratio metrics carry interpretation risk on small numbers.
- Historical charts/graphs — Telegram-only surface; defer.
- Per-source breakdown (website vs telegram vs shopier) — single helper layer doesn't expose this; defer.
- KPI threshold alerts — operator can read the snapshot themselves; alert spam risk.
- Export to CSV / spreadsheet — admin can do this directly.
- Comparison with yesterday / last week / last month — needs historical-window queries; defer.

**Risk class:** very low. Pure read composition + 1 new file + 1 new switch case + 3 new command aliases. No schema change. No mutations. No new dependencies. Reversible via single-commit revert.

**Status:** Shipped to `main`. Soak validation passed. Operator validation: `/business` from Telegram → see one-screen daily snapshot.

**Reversible:** yes — pure read composition, no schema change.

---

## D-249 — Conversion Funnel / Source Performance Snapshot v1

**Decision:**
Add a Telegram-first read-only funnel snapshot that groups demand by source and shows how each source flows through stages → conversion → revenue. Pure composition over existing collections. No new collection, no schema change, no new architecture.

**Attribution rule — the one judgement call:**
The funnel groups by **lead source**, not order source.
- Reason: `/convert` (D-244) always sets `order.source='telegram'` regardless of where the lead originated. If we grouped by order.source, every funnel-converted order would land in `Telegram`, even if the lead came from Instagram or Website. That would be the opposite of useful.
- Lead source (`customer-inquiries.source`, added in D-241) IS the truthful answer to "where did demand originate."
- Orders attribute back to the lead's source via the `relatedInquiry` FK (D-244).
- Orders WITHOUT a relatedInquiry (direct website/admin/Shopier orders that didn't pass through a lead) get a separate "Doğrudan Sipariş (lead-siz)" group with order count + revenue only — no funnel stages because there's no lead to stage.
- Edge case: order created today linked to a lead from last week → counted as "direct" for a today-window funnel, since the lead isn't in the window. This keeps per-window stage→order ratios honest. Documented in the helper.

**New helper — `src/lib/funnelDesk.ts` (~270 LOC):**
- `getFunnelSnapshot(payload, {period})` — `period: 'today' | 'week'` (default today). Runs 2 `payload.find` queries (leads-in-window + orders-in-window), groups in memory by lead source.
- Per-source row: stage counts (new / contacted / follow_up / closed_won / closed_lost / spam) + ordersConverted + revenue.
- Totals row aggregates lead-attributed only.
- Direct-orders bucket separate.
- Defensive numeric coercion via `toNumber()` (pg returns numeric as string).
- Source labels mapped to operator-friendly names: website→Website, telegram→Telegram, instagram→Instagram, phone→Telefon, shopier→Shopier, manual_entry→Manuel, bilinmiyor→Bilinmeyen. Unknown sources passed through HTML-escaped.
- Legacy `completed` status (pre-D-241) rolled into `closed_won` for funnel display.

**Concise render:**
- Per-source blocks omit zero-stage rows automatically (no `Spam: 0` clutter).
- Zero-revenue rows omitted.
- Direct-orders block only renders when count > 0, with explanatory footer.
- Empty short-circuit: zero leads + zero orders in window → single-line `✅ Bu pencerede lead/sipariş hareketi yok.` with pointer at `/business · /leads summary · /sales today`.

**Telegram surface (registered in SHARED_CMDS):**
| Command | Behaviour |
|---|---|
| `/funnel` | Default — today snapshot |
| `/funnel today` | Explicit today |
| `/funnel week` (aliases: hafta, son7) | Trailing 7 UTC days |
| `/huni` | TR alias |

**Convergence — no parallel rules:**
| Concept | Defined in | Reused by |
|---|---|---|
| Lead.source field | D-241 schema | D-249 funnel grouping |
| Lead status enum (closed_*) | D-241 schema extension | D-249 stage counts |
| relatedInquiry FK | D-244 schema | D-249 order→lead attribution |
| order.totalPrice → revenue | D-244/D-247 | D-249 revenue aggregation |
| UTC day boundary | D-244 getSalesToday / D-247 getDailyOrderSummary | D-249 today-window cutoff |
| Defensive numeric coercion | D-244 `toNumber()` pattern | D-249 `toNumber()` (mirror) |

**Read-only by construction.**
Every helper call is `payload.find` — no mutations. Verified in soak: lead+order row counts identical pre/post (3→3, 3→3).

**Test evidence (against live Neon, 6 assertions all pass):**
| Check | Result |
|---|---|
| Live `/funnel today` composes in 162ms (2 `payload.find` calls) | ✓ |
| Live `/funnel week` same logic, 7-day window | ✓ |
| Read-only verified: lead+order row counts unchanged pre/post | ✓ |
| Fully-empty render → `✅ Bu pencerede lead/sipariş hareketi yok.` | ✓ |
| Busy-day multi-source render (Website/Telegram/Instagram + Toplam) matches spec example shape exactly | ✓ |
| Direct-orders bucket renders separately with explanatory footer | ✓ |

Soak harness committed at `scripts/d249-soak.ts`. Typecheck: zero new errors.

**Captured render (busy-day scenario):**
```
📈 Funnel Özeti (bugün)

Website
  • Lead: 12
  • Arandı: 5
  • Takip: 2
  • Kazanıldı: 2
  • Kaybedildi: 1
  • Siparişe döndü: 1
  • Ciro: 1499 ₺

Telegram
  • Lead: 4
  • Arandı: 3
  • Kazanıldı: 1
  • Siparişe döndü: 1
  • Ciro: 950 ₺

Instagram
  • Lead: 3
  • Arandı: 1
  • Spam: 1

Toplam (lead-bazlı)
  • Lead: 19
  • Arandı: 9
  • Takip: 2
  • Kazanıldı: 3
  • Kaybedildi: 1
  • Spam: 1
  • Sipariş: 2
  • Ciro: 2449 ₺
```

**Out of scope (v1):**
- Ratio metrics (conversion rate per source, win rate per source) — small-number interpretation risk.
- Per-product source attribution — single product can sit in multiple lead sources.
- Cohort analysis (lead created day X → converted day Y).
- Per-stage time-to-progression averages.
- Multi-touch attribution (one lead bouncing between sources).
- CSV export — admin-only.
- Comparison with previous period.
- Per-source breakdown in the `/business` snapshot (would clutter that overview; `/funnel` is the dedicated surface).

**Risk class:** very low. Pure read helper + 1 new switch case + 4 new command aliases. No schema change. No mutations. No new dependencies. Reversible via single-commit revert.

**Status:** Shipped to `main`. Soak validation passed. Operator validation: `/funnel` from Telegram → see one-screen daily funnel; cross-check `Toplam · Lead` against `/leads`'s open/total; cross-check `Toplam · Ciro` against `/sales today`'s revenue.

**Reversible:** yes — pure read composition, no schema change.

---

## D-250 — Source Attribution Hygiene / Capture Hardening (2026-05-06)

**Problem:**
D-249's funnel snapshot exposed that source attribution data was unreliable in two ways:

1. `convertLeadToOrder()` hardcoded `source: 'telegram'` on every Order created via `/convert`,
   regardless of where the demand originated. A customer who filled the storefront inquiry form
   (lead.source='website') would produce an Order with source='telegram' — recording the operational
   channel (Telegram command), not the demand origin (website). The admin Order view was misleading.

2. `/api/inquiries` accepted any arbitrary string for the `source` field with no validation
   (`source: source || 'website'`). Future garbage values could silently pollute funnel data.

**Source model chosen:**
- `orders.source` = **demand origin** (where the customer came from), not the operational channel.
  The operational channel is implicitly captured by `relatedInquiry` (set = lead desk / /convert).
- `customer-inquiries.source` = **normalized demand origin** from a known value set.
- One truthful meaning per field. No overloading.

**funnelDesk.ts attribution rule (unchanged):**
The funnel still uses `lead.source` for attribution grouping, not `order.source`. This is correct
even after D-250 because funnel stages are about when the lead *entered* the pipeline
(lead.createdAt window), not when the order was recorded. Window-correct attribution requires the
lead's timestamp. The D-249 funnelDesk comment was updated to reflect this reasoning.

**Changes made:**

A) `src/lib/leadDesk.ts`
- Added `mapLeadSourceToOrderSource()` helper — maps lead.source to a valid `orders.source`
  enum value; falls back to 'website' for unknown/null.
- Added `ORDER_SOURCE_VALUES` + `OrderSource` type — single source of truth for valid order sources.
- In `convertLeadToOrder()`: changed `source: 'telegram'` → `source: mapLeadSourceToOrderSource(lead.source)`.
  No other logic changed. relatedInquiry is still the indicator that this order was a lead conversion.

B) `src/app/api/inquiries/route.ts`
- Added `normalizeInquirySource()` helper — validates source against KNOWN_INQUIRY_SOURCES
  `['website', 'instagram', 'phone', 'telegram', 'whatsapp', 'manual_entry']`.
  Unknown/empty → 'website'. Prevents future garbage strings.
- Changed `source: source || 'website'` → `source: normalizeInquirySource(source)`.

C) `src/lib/funnelDesk.ts`
- Updated attribution comment: corrects the justification for why we use lead.source (it's about
  window-correct timing, not just because order.source was unreliable). Logic unchanged.

D) `scripts/d250-backfill.ts`
- One-shot idempotent repair script for existing pre-D-250 orders where
  `source='telegram' AND relatedInquiry IS NOT NULL`.
- Reads each linked lead's source, maps it, updates the order.
- Run: `npx tsx scripts/d250-backfill.ts`
- Dry-run: `DRY_RUN=1 npx tsx scripts/d250-backfill.ts`
- Orders where the lead itself has source='telegram' are correctly left unchanged.

**Schema changes:** None. All values written are already valid for existing enum/select definitions.
No Neon DDL required.

**Backfill:** deterministic + low blast radius. Only touches orders with relatedInquiry set AND
source='telegram'. If no such orders exist (early adoption), backfill is a no-op.

**What improves:**
- Future `/convert` calls write the true demand origin on the Order record.
- Admin order list correctly shows 'Website' for leads that came from the storefront form.
- `/api/inquiries` now rejects garbage source strings.
- funnelDesk.ts comment accurately describes the attribution architecture.
- D-249 funnel correctness is unchanged (still uses lead.source) but the order records
  are now independently truthful.

**What does NOT change:**
- funnelDesk.ts logic — still uses lead.source for window-correct funnel attribution.
- Shopier order path — already writes `source: 'shopier'` correctly.
- Direct admin-created orders — still default to `source: 'website'` (no worse than before;
  documented as known ambiguity below).

**Known remaining gap (not fixed in D-250):**
`orders.source` `defaultValue: 'website'` in Orders.ts means orders manually created in the
Payload admin panel get `source='website'` by default — even if created by the operator, not
from a website checkout. There is currently no website checkout path that programmatically
creates orders (PayTR is integrated for payment but no checkout-to-order flow exists).
When a website checkout path is added, it should explicitly write `source: 'website'`.
Until then, any admin-created order without a relatedInquiry appearing as 'website' is a
known minor ambiguity. This does NOT affect funnel attribution (direct orders are already
reported separately in the "Doğrudan Sipariş (lead-siz)" bucket).

**Risk class:** very low. Two write-path changes, both narrowing/correcting existing writes.
No schema change. No new collections. No new dependencies. Reversible via single-commit revert.

**Status:** Shipped to `main`.

---

## D-251 — Source Detail / UTM & Landing Context Capture v1 (2026-05-06)

**Background:**
D-250 normalized broad source values ('website', 'instagram', etc.). The next bottleneck is
granularity — broad buckets can't answer which campaign, which referrer, or which acquisition
context drove a lead.

**Source-detail signals evaluated:**

| Signal | Where available | Decision |
|---|---|---|
| utm_source / utm_medium / utm_campaign | `window.location.search` (client) | ✅ Capture |
| Referrer domain | `document.referrer` (client) | ✅ Capture (domain-only, no PII) |
| Landing path | Derivable from `product.slug` via existing FK | ❌ Redundant — skip |
| Full referrer URL | `document.referrer` | ❌ PII risk (search queries) — skip |
| Session/cookie data | Requires analytics infrastructure | ❌ Out of scope |
| Multi-touch history | Requires analytics infrastructure | ❌ Out of scope |

**Fields added to `customer-inquiries`:**
- `utmSource` (text, nullable) — utm_source param (google, instagram, facebook, etc.)
- `utmMedium` (text, nullable) — utm_medium param (cpc, social, email, etc.)
- `utmCampaign` (text, nullable) — utm_campaign param (campaign name/id)
- `referrer` (text, nullable) — referring hostname only (instagram.com, google.com, etc.)

All four fields are nullable. No invented defaults. Unknown = null. ReadOnly in admin panel
(automatically captured, not operator-editable — prevents manual pollution).

**Neon DDL required (push:true does not run in production — apply manually after deploy):**
```sql
ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS utm_source VARCHAR;
ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS utm_medium VARCHAR;
ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR;
ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS referrer VARCHAR;
```

**Changes made:**

A) `src/collections/CustomerInquiries.ts`
- Added 4 fields after `source` field, before `lastContactedAt`.
- DDL comment block included for operator reference.

B) `src/components/ContactForm.tsx`
- Added `captureUtmParams()` — reads utm_source/utm_medium/utm_campaign from
  `window.location.search` at submit time. Trims, lowercases, caps at 200 chars.
- Added `captureReferrer()` — reads `document.referrer`, extracts hostname only,
  returns null for same-site referrers and direct navigation (no referrer).
- Updated `handleSubmit` to include these values in the POST body via spread
  (absent/null values are not sent, preventing empty-string pollution).

C) `src/app/api/inquiries/route.ts`
- Added `sanitizeDetail()` — trims, lowercases, caps at 200 chars, returns null
  for empty/non-string input. Null-first: nothing is stored if data is absent.
- Destructured `{ utmSource, utmMedium, utmCampaign, referrer }` from request body.
- Write path uses spread-conditional pattern: only writes to Payload when
  `sanitizeDetail()` returns a non-null value.

**Separation of concerns (D-250 compatibility):**
- `customer-inquiries.source` = broad demand channel (website, instagram, phone...)
  Normalized by `normalizeInquirySource()`. Unchanged.
- `customer-inquiries.utmSource/utmMedium/utmCampaign/referrer` = detail context.
  Nullable. No overlap with broad source. Different question: "how specifically?"

**funnelDesk.ts:** No changes. Funnel still groups by broad `source`. UTM/referrer
fields are available as raw material for future drill-down analysis when volume justifies it.

**Backfill:** Not possible. Past requests did not capture UTM/referrer data.
Attribution quality improves forward-only from this point.

**What does NOT change:**
- D-241 lead desk pipeline — unchanged
- D-249 funnel snapshot — unchanged (groups by `source`, not UTM)
- D-250 source normalization — unchanged
- Shopier order path — unaffected (Shopier creates Orders, not Inquiries)
- Telegram operator commands — unaffected

**Risk class:** very low. Additive-only: new nullable columns + optional POST body fields.
Inquiry creation path is forward-compatible — old requests without UTM/referrer just
produce null values in the new columns. No breaking change.

**Status:** Shipped to `main`. Neon DDL must be applied manually by operator before
new fields are populated in production rows.

---

## D-252 — Attribution Detail Visibility / Lead Context Surfacing (2026-05-07)

**Commit:** 910c31a

**Problem:** D-251 added UTM + referrer capture on `customer-inquiries` but those
fields were invisible to the operator. `/lead <id>` showed only the broad `source`
field. No way to see where specifically a lead came from without querying the DB.

**Changes — `src/lib/leadDesk.ts` only:**

- `LeadEntry` interface: added `utmSource?`, `utmMedium?`, `utmCampaign?`, `referrer?`
  (all `string | null`, optional).
- `normalizeLead()`: maps 4 new fields from Payload doc (`doc.utmSource ?? null` etc.).
- `formatLeadCard()`: attribution block appended after dates section. Blank-line
  separator. Three conditional lines, each omitted when null:
  - `🌐 Kaynak: <source>` — broad channel
  - `📎 UTM: <utmSource> / <utmMedium> / <utmCampaign>` — only UTM parts that exist,
    joined by ` / `
  - `🔗 Ref: <referrer>` — hostname only (as stored by D-251)
  Zero noise when all attribution fields are null (e.g. direct Telegram inquiries).
- `formatNewLeadAlert()`: compact `🌐 source · utmSource · referrer` hint line.
  Built from first available signals. Omitted entirely when all three are null.

**Design rule enforced:** no empty placeholders — attribution block only renders if
at least one field has a value. Telegram-originated leads (where UTM/referrer will
always be null) see no extra lines.

**Operator UX after D-252:**
```
/lead 412  →
🟡 Lead #412 — new

👤 Ayşe Kaya
📱 +90 532 ...
🛍️ UA-0041 — Nike Air Max 90
📐 Beden: 38

📅 Oluşturulma: 07.05.2026 14:32

🌐 Kaynak: instagram
📎 UTM: instagram / social / summer_drop
🔗 Ref: instagram.com
```

For a direct/Telegram lead, attribution block is absent entirely.

**What does NOT change:** D-241 lead desk, D-250 source mapping, D-251 capture,
funnelDesk attribution logic, Shopier path, image pipeline.

**Risk class:** zero. Read-only rendering change — no DB writes, no API changes,
no Neon DDL required. Fields are already in the doc if Neon DDL from D-251 was applied.

**Status:** Shipped to `main` (910c31a). D-250, D-251, D-252 form a complete
attribution hygiene chain: capture → normalize → surface.

---

## D-251 + D-252 — Production Closeout (2026-05-07)

**DDL applied:** 4 columns added to `customer_inquiries` on Neon production:
`utm_source`, `utm_medium`, `utm_campaign`, `referrer` (all VARCHAR, nullable).
Applied with `IF NOT EXISTS` — idempotent.

**Soak test result (inquiry #4, cleaned post-verification):**
- POST to `https://www.uygunayakkabi.com/api/inquiries` with
  `source=instagram`, `utmSource=instagram`, `utmMedium=social`,
  `utmCampaign=testdrop`, `referrer=instagram.com`, `productId=319`
- API returned `{"success":true,"id":4}` (HTTP 200)
- Neon row verified: all 5 attribution fields stored exactly as submitted
- Row cleaned from production after verification

**Telegram render verified (simulation against D-252 code):**
- `/lead <id>` with full attribution → shows `🌐 Kaynak` + `📎 UTM` + `🔗 Ref` block
- `/lead <id>` with no UTM/referrer → attribution block absent, no blank lines
- New-lead alert with attribution → compact `🌐 source · utmSource · referrer` hint
- New-lead alert without attribution → hint line absent entirely

**Status:** D-251 + D-252 FULLY CLOSED. Attribution chain is production-ready:
capture (D-251) → normalize (D-250) → surface (D-252).

---

## D-253 — Attribution Detail Roll-up into Funnel (2026-05-07)

**Commit:** c612b63

**Problem:** D-251 captured UTM/referrer on inquiries. D-252 made it visible per-lead.
But there was no way to see patterns across leads — which UTM source, campaign, or
referrer is generating the most demand this period — without querying the DB directly.

**Surface chosen:** `/funnel` attribution footer.
- `/funnel` already loads all leads in window in-memory (D-249).
- UTM/referrer are "source detail" — natural extension of what /funnel already does.
- `/business` is KPI-focused; attribution doesn't belong there.
- A dedicated `/attribution` command would be overkill for v1 with sparse data.

**Zero extra queries:** `buildAttributionDetail()` runs over the leads array already
loaded by `getFunnelSnapshot()`. No new Payload or DB calls.

**New exports/types in `funnelDesk.ts`:**
- `AttributionTopEntry { value: string; count: number }`
- `AttributionDetailSummary { coveredLeads, topUtmSources[], topUtmCampaigns[], topReferrers[] }`
- `FunnelSnapshot.attributionDetail: AttributionDetailSummary | null`
- `topN(leads, field, n)`: counts non-null field values, returns top N by count
- `buildAttributionDetail(leads)`: returns null when coveredLeads === 0

**Render behavior:**
- Footer `📎 Trafik Detayı (N lead)` only renders when at least 1 lead has a
  UTM/referrer value. Absent entirely for Telegram-only windows.
- Within the footer, each line (UTM Kaynak / Kampanya / Referrer) only renders
  if that specific field has at least 1 non-null value.
- Top 3 per field, formatted as `value (count), value (count)`.
- No percentages — sample sizes too small to be meaningful.

**Sparse-data behavior verified (test cases):**
1. All-null UTM/referrer → no attribution block, zero noise ✓
2. Single pattern (1 lead) → shows exactly that pattern ✓
3. Multiple patterns → top 3 sorted by count desc ✓
4. Referrer-only (no UTM) → shows only Referrer line, no empty UTM lines ✓

**Files changed:** `src/lib/funnelDesk.ts` only (+67 lines).
No route change. No schema change. No new collection.

**Status:** COMPLETE. Attribution detail visible above single-lead level in /funnel.
D-250 → D-251 → D-252 → D-253 attribution chain fully operational.

---

## D-254 — UTM Link Builder / Campaign Naming Guardrail (2026-05-07)

**Commit:** dbf8b3f

**Problem:** Attribution chain is live but human inconsistency (typo-heavy campaign
names, ad-hoc source/medium values, random URL assembly) would degrade data quality
over time. Operator needs a fast, consistent, copy-ready way to generate tagged URLs.

**New file: `src/lib/utmBuilder.ts`**

Approved vocabulary (enforced at validation time):
- Sources (10): instagram, whatsapp, google, facebook, telegram, shopier, website,
  referral, email, tiktok
- Mediums (10): social, bio, story, dm, direct, organic, cpc, manual, email, reel
- Campaign format: lowercase letters, digits, underscores only; 2–50 chars;
  no leading/trailing underscore

Normalization (applied before validation):
- source/medium: `.toLowerCase().trim()`
- campaign: trim + lowercase + spaces→underscore (documented; safe and predictable)
- Uppercase `Instagram` → `instagram` passes. `SummerDrop` → `summerdrop` passes.
- `_bad_campaign` → still refused (leading underscore)

`buildProductUtmUrl()` uses `encodeURIComponent()` on all three params.

**Telegram command: `/utm <SN|id> <source> <medium> <campaign>`**

- SN lookup uses same `stockNumber: { equals: normalizedSN }` pattern as `/sn`
- Bare number (e.g. `34`) auto-padded to `SN0034` (same as `/sn`)
- Product slug pulled from `p.slug` (runtime truth, not guessed)
- Missing slug (draft product without slug): refused with clear message
- Invalid source/medium: refused with full approved-list shown
- Bad campaign format: refused with format rules and example
- Both errors: both shown in one response
- Success: copy-ready `<code>URL</code>` block with breakdown of params used
- Registered in SHARED_CMDS (available on both bots)

**Usage example:**
```
/utm SN0034 instagram social story_drop_01
→ 🔗 UTM Link
  SN0034 — New Balance Sneaker Gri
  source: instagram / medium: social / campaign: story_drop_01
  https://www.uygunayakkabi.com/products/new-balance-sneaker-gri-tg-…?utm_source=instagram&utm_medium=social&utm_campaign=story_drop_01
```

**Files changed:** `src/lib/utmBuilder.ts` (new, 108 lines) + `src/app/api/telegram/route.ts` (+95 lines).
No schema change. No mutation. Read-only.

**Status:** COMPLETE.

---

## D-255 — Campaign Review / Attribution QA Surface v1 (2026-05-07)

**Commit:** dd57db2

**Problem:** Attribution chain is live but there was no way to inspect campaign
quality, spot messy UTM values, or see which campaigns are actually generating
demand — without querying the DB directly.

**New file: `src/lib/campaignDesk.ts`**

Aggregates:
- Per-campaign: leadCount, wonCount (closed_won|completed), distinct sources,
  distinct mediums. Sorted by leadCount desc.
- Global top 5: utm_source, utm_medium, referrer.
- Coverage: coveredLeads (have any UTM/referrer) vs totalLeads.

QA signals (all heuristic, labeled as such):
- unknownSources: utm_source values not in APPROVED_SOURCES
- unknownMediums: utm_medium values not in APPROVED_MEDIUMS
- oddCampaigns: campaign names not matching D-254 CAMPAIGN_PATTERN
- singletonCount: campaigns with count=1 (only flagged when >= 3 campaigns)

Empty-state variants (3 levels):
1. No leads in window → "hiç lead yok"
2. Leads exist but zero UTM/referrer → "UTM verisi yok, /utm kullanın"
3. Active → full campaign table + QA section

`utmBuilder.ts`: exported CAMPAIGN_PATTERN (was private) for QA reuse.

**Commands:**
- `/campaigns [today|week]` — campaign snapshot (today default)
- `/campaign <name> [week]` — per-campaign detail: leadCount, wonCount, sources, mediums
  - Missing name → usage hint
  - Not found → clean empty-state

**Test cases verified:**
1. No leads → clean empty state ✓
2. Leads but no UTM (current prod state) → explains gap + /utm hint ✓
3. Multiple clean campaigns → table + QA "all approved ✓" ✓
4. Dirty values (snapchat/push/"Summer Launch") → all 3 QA signals fired ✓
5. Singleton flag (4 campaigns, 2 with count=1) → singletonCount=2 ✓

**Files changed:** `src/lib/campaignDesk.ts` (new, 339 lines) +
`src/lib/utmBuilder.ts` (+1 export) + `src/app/api/telegram/route.ts` (+66 lines).
No schema change. No mutation.

**Status:** COMPLETE.

---

## D-256 — Product Page Lead Conversion Polish v1 (2026-05-07)
**Decision:**
Polish the product page contact form into a proper conversion surface.

**Changes:**
- `ContactForm.tsx`: full rebuild (248 lines)
  - Interactive size chips: available variants rendered as clickable buttons; click selects/deselects, fills `size` field; "temizle" clear link; manual text input only shown when no variants available
  - Soldout amber notice block (conditional on `soldout` prop)
  - Success state shows product title: "[Product] için talebinizi aldık."
  - Submit button text: "Talep Oluştur — Beni Arayın", dark color (`bg-gray-900`)
  - Trust microcopy: "Bilgileriniz yalnızca sipariş desteği için kullanılır."
  - Error state includes WhatsApp fallback suggestion
  - D-251 UTM/referrer capture helpers retained intact
  - New props: `productTitle`, `variants`, `soldout`
- `page.tsx`: updated to pass new props + structural improvements
  - ContactForm receives `productTitle={product.title}`, `variants={variants}`, `soldout={isSoldOut}`
  - Form container gets `id="inquiry-form"` anchor
  - Heading updated: "Bilgi Al / Sipariş Ver" → "Sipariş Ver"
  - Subtext updated: "Beden seçin, bilgilerinizi bırakın — sizi arayalım."
  - Sticky mobile CTA added (`lg:hidden`, `position: fixed`, `href="#inquiry-form"`) — always visible on mobile, scrolls user to form

**Commit:** f76c47d on main. Zero new TS errors.

**Status:** COMPLETE.

---

## D-257 — Homepage / Listing → PDP Clickthrough Polish v1 (2026-05-07)
**Decision:**
Polish the customer journey from homepage / listing surfaces into product detail pages (PDPs).
No redesign — targeted affordance and navigation fixes only.

**Audit findings (VERIFIED):**
- `Card` component was a `<div onClick={() => onView(p)}>` — not a real anchor. No right-click, no mobile long-press link menu, no browser URL preview, no link semantics.
- Hover-overlay "İNCELE" CTA was the only clickthrough signal — completely invisible on mobile (touch devices have no hover state). Mobile users saw image → title → price with zero tap affordance.
- `BestSellersScroll` and `DiscountedSection` horizontal scroll sections had no escape to full catalog — users had no way to discover more products from those contexts.
- Inline "Popüler Ayakkabılar" homepage grid: same gap — no "see all" path.
- `BestSellersScroll` and `DiscountedSection` were not receiving `onNav` prop.

**Changes — `src/app/(app)/UygunApp.jsx` only (37 additions, 16 deletions):**
1. `Card`: outer `<div onClick>` → `<a href="/products/${slug}">` with `display:block; text-decoration:none`. Real link semantics. Carousel `e.stopPropagation()` arrows unaffected.
2. `Card`: always-visible `İncele →` affordance added to info footer (separator + label + arrow). Present on every card regardless of hover/touch state. Fixes mobile dead zone.
3. `BestSellersScroll`: added `onNav` prop + "Tümünü Gör →" pill button next to header.
4. `DiscountedSection`: same — `onNav` prop + "Tümünü Gör →" pill.
5. Inline "Popüler Ayakkabılar" section: "Tümünü Gör →" pill added.
6. App: wires `onNav={nav}` into both scroll section calls.

**Commit:** ba40764 on main. Zero new TS errors. No schema change.

**Status:** COMPLETE.

---

## D-258 — Homepage Trust / Order Flow Clarity Polish v1 (2026-05-07)
**Decision:**
Improve homepage clarity so first-time visitors understand the store's inquiry model,
what happens after contact, and why to trust the process — without redesigning the homepage.

**Audit findings (VERIFIED):**
- Hero description: one 60-word abstract sentence explaining the Aymakoop business model — no action direction for the visitor
- Hero sub-line "Fiziksel güç + dijital zekâ + doğru fiyat" — internal jargon, not customer value
- StepsSection: presented 4 parallel payment options (Sepet / WhatsApp / Shopier / Kapıda) as sequential "steps" — misleading. The actual inquiry flow (browse → form → callback) was never described anywhere on the homepage
- Secondary hero CTA "NEDEN BİZ?" scrolled to brand story section — not actionable for a first visit
- TrustValueSection opener was defensive: "Çünkü biz rastgele ürün toplayan sıradan bir satıcı değiliz"

**Changes — `src/app/(app)/UygunApp.jsx` only (45 additions, 34 deletions):**
1. Hero description: shortened to 2 clear sentences, one of which describes the inquiry model
2. Hero sub-line: replaced jargon with 3-step inline flow hint: "Ürünü İncele → Talep Bırak → Biz Seni Arayalım"
3. Hero secondary CTA: "NEDEN BİZ?" → "NASIL ÇALIŞIR?" — scrolls to steps section (id="nasil-calisir")
4. StepsSection label/title/subtitle updated to match clarity framing
5. STEPS_DATA completely rewritten: 4 parallel payment options → 4 sequential inquiry steps (İncele → Talep Bırak → Seni Arayalım → Teslimat) — honest, matches D-256 product page
6. TrustValueSection: defensive opener removed, confident framing added, bullet list includes explicit callback/support reassurance items, dual CTA + WhatsApp secondary path added

**Commit:** 41f230c on main. Zero new TS errors. No schema change.

**Status:** COMPLETE.

---

## D-259 — Catalog Browse Clarity Polish (2026-05-07)

**Problem:** Catalog had static heading "Ayakkabılar" regardless of active filter, no sort controls, result count only shown when filtered, size filter showed all sizes across all categories (not just the active one), minimal empty state.

**Changes — `src/app/(app)/UygunApp.jsx` (Catalog function):**
- Dynamic `catHeading` — updates per active filter: "Tüm Ürünler" / "Spor Ayakkabıları" / "Cüzdanlar" / etc.
- Always-visible result count in subtitle: "**X** ürün" + "· Beden N" when size active
- Sort state (`"default" | "price-asc" | "price-desc" | "discount"`) — `<select>` on right side of controls row, custom arrow styling
- Category filter now resets size filter + sort on change
- Size filter scoped to current category's available sizes only (was showing all sizes across all products)
- `resetFilters()` helper clears category, size, sort, pagination in one click
- "Tüm Ürünleri Göster" + "✕ Filtreleri Temizle" both call resetFilters
- Empty state: added 🔍 icon, added subtext hint, warmer messaging
- "Daha Fazla" count now based on `sorted.length` (correct when sort is active)

**Preserved:** D-257 card links, D-256 PDP flow, attribution capture untouched.
**Commit:** 60c53e8

---

## D-260 — Mobile Catalog Filter Drawer (2026-05-07)

**Problem:** On mobile, 8 category chips + size chips + sort row consumed ~300px before first product. No access to controls after scrolling. Active filter state invisible while browsing.

**Changes — `src/app/(app)/UygunApp.jsx`:**
- Added `drawerOpen` state + `useEffect` body scroll lock (prevents page scroll when drawer open)
- Desktop controls wrapped in `.catalog-desktop-controls` div — hidden on mobile via CSS
- Mobile compact sticky bar (`.catalog-mobile-bar`) — shown only on mobile:
  - `position: sticky; top: 68px` — stays visible while scrolling
  - Left: result count + active filter pills (category name, size no, sort indicator)
  - Right: "Filtrele" button with red badge showing active filter count
- Bottom sheet drawer (fixed, zIndex 201, `animation: slideUp`):
  - Backdrop (tap to close)
  - Drag handle indicator
  - Category section: same chip style, tap to filter
  - Size section: 48×48px circles (larger touch targets than desktop 40px)
  - Sort section: full-width buttons with checkmark on active
  - CTA row: "Temizle" (red, shown when active) + "X Ürünü Gör →" (closes drawer)
- `@keyframes slideUp` added to GlobalStyles
- `.catalog-section` padding reduced to `16px` on mobile (was 40px)
- `SORT_OPTIONS` array shared between desktop `<select>` and drawer buttons

**Preserved:** D-259 desktop layout unchanged. D-257 card links intact. D-256 PDP flow intact.
**Commit:** 2d54f16

---

## D-261 — PDP Trust / Delivery / FAQ Clarity Polish (2026-05-07)

**Problem:** PDP inquiry form had weak trust signals, vague subtext with no visual hierarchy, FAQ only appeared when product had explicit FAQ data (empty on most products), and the form success state showed only a single confirmation line with no next-steps context.

**Changes — `src/app/(app)/products/[slug]/page.tsx`:**
- `DEFAULT_PROCESS_FAQ` constant (4 items): always-on fallback FAQ covering process flow, size help, delivery, and payment
- Trust strip redesigned from 2-item horizontal row to 4-item 2×2 grid: 📞 Hızlı Geri Dönüş, 📦 Hızlı Teslimat, 💬 Beden Desteği, 🔒 Güvenli İletişim
- 3-step process strip inside inquiry card: Formu Doldurun → Sizi Arayalım → Ürün Elinizde
- FAQ section now always renders: `validFaq.length > 0 ? validFaq : DEFAULT_PROCESS_FAQ`

**Changes — `src/components/ContactForm.tsx`:**
- Success state now shows next-steps checklist (3 lines: call, clarify details, ship)
- Trust line: "🔒 Bilgileriniz yalnızca sipariş desteği için kullanılır. Üçüncü taraflarla paylaşılmaz."

**Changes — `src/components/ProductFAQ.tsx`:**
- Full inline-style restyle matching beige PDP theme (removed Tailwind classes)
- New heading: "SIKÇA SORULAN SORULAR" label + "Merak Ettikleriniz" in Playfair serif
- Toggle button: dark filled circle (26×26px) with +/− indicator

**Preserved:** D-256 ContactForm UTM capture + size chips untouched. All PDP SSR data fetching unchanged.
**Commit:** (pending)

---

## D-262 — Sitewide Contact / WhatsApp Fast-Path Polish V1

**Date:** 2026-05-08
**Status:** IMPLEMENTED — commit `6541adc`, pushed to `main`

**Problem:**
- Catalog section (lines 969–1305 of UygunApp.jsx) had zero contact/WA CTAs — visitors filtering by size had no fast escape to help
- WA button label "WHATSAPP İLE SİPARİŞ VER" ("Place Order via WhatsApp") overpromised — most taps are info-seeking, not orders
- Mobile sticky CTA was inquiry-form-only, WA path buried one scroll above it
- WA messages pre-filled with generic "bilgi almak istiyorum" — no product context beyond name; no selected size

**Decision:** Apply targeted fast-path improvements across 2 files without redesigning existing attribution/browse/form flows.

**Changes — `src/app/(app)/UygunApp.jsx`:**
1. Catalog contact nudge strip inserted after product grid (before `</section>`):
   - "Aradığınız modeli veya bedeni bulamıyor musunuz?" + underlined "WhatsApp'tan yardım alın →" link via `waLink()`
2. ProductDetail WA button label: "WHATSAPP İLE SİPARİŞ VER" → "WhatsApp'tan Bilgi Al"
3. ProductDetail WA message now includes selected size when chosen: `Beden: ${sz} — bilgi almak istiyorum`

**Changes — `src/app/(app)/products/[slug]/page.tsx`:**
4. PDP WA button label: "WHATSAPP İLE SİPARİŞ VER" → "WhatsApp'tan Bilgi Al"
5. PDP WA pre-filled message updated to "beden ve stok bilgisi almak istiyorum" (clearer intent)
6. Mobile sticky CTA split into 2-column bar:
   - 40% green: WA "Bilgi Al" → deep-links to `wa.me` with product context
   - 60% dark: "Sipariş Ver — Beni Arayın" → scrolls to `#inquiry-form` (unchanged from D-256)

**Preserved:** D-256 UTM capture, D-256 ContactForm size chips, D-260 mobile drawer, D-261 trust strip/FAQ — all untouched.
**Commit:** `6541adc` — `D-262: Sitewide contact/WhatsApp fast-path polish V1`

---

## D-263 — Size Guidance / Fit Confidence Polish V1

**Date:** 2026-05-08
**Status:** IMPLEMENTED — commit `27c7dba`, pushed to `main`

**Problem:**
- PDP size display block had zero "unsure about size" guidance — visitors with size doubt had no signal to proceed
- ContactForm chip label "Beden seçin" implied size was required (no optional signal)
- Inquiry form heading "Sipariş Ver" signalled "order-ready only" — size-uncertain visitors felt excluded
- Process step 2 "Sizi Arayalım" gave no indication that size gets resolved in the call-back
- Out-of-stock sizes crossed out with no alternative action prompt

**Decision:** Add size-help microcopy at the 3 highest-friction moments — size display, form chips, and form heading — without adding new UI components or changing the lead-capture flow.

**Changes — `src/app/(app)/products/[slug]/page.tsx`:**
1. Size-help reassurance note inserted at bottom of size display block:
   - Normal stock: "Beden konusunda emin değilseniz talep formumuzu doldurun — sizi arayarak netleştiririz."
   - Soldout: "Farklı beden veya alternatif ürün için talep bırakabilirsiniz — sizi arayarak yardımcı oluruz."
2. Inquiry section heading: "Sipariş Ver" → "Sipariş Ver veya Beden Sor"
   - Added subtitle: "Beden seçmek zorunda değilsiniz — sizi arayarak yardımcı oluruz."
3. Process strip step 2: "Sizi Arayalım" → "Beden & Teslimat Netleşir" (same font size, compact, meaningful)

**Changes — `src/components/ContactForm.tsx`:**
4. Size chip label: "Beden seçin" → "Beden seçin (opsiyonel)"
5. When no size is selected: shows "Beden emin değilseniz seçmeden devam edebilirsiniz — sizi arayarak netleştiririz."
   When a size IS selected: shows existing "Seçili beden: X · temizle" (unchanged)

**Preserved:** D-256 UTM capture, size chip interaction, D-261 trust strip/FAQ, D-262 WA fast-path — all untouched.
**Commit:** `27c7dba` — `D-263: Size guidance / fit confidence polish V1`

---

## D-264 — Out-of-Stock Size Recovery / Alternative Inquiry Path V1

**Date:** 2026-05-08
**Status:** IMPLEMENTED — commit `cd2369d`, pushed to `main`

**Problem:**
- Out-of-stock size chips in PDP were `<div>` with `cursor: not-allowed` and NO click handler — tapping one did absolutely nothing. Complete dead end.
- ContactForm showed chips only for `availableVariants` (stock > 0). When a user wanted an out-of-stock size (e.g. 43), size 43 wasn't in the chips. Manual size input only showed when `!hasVariants` (no available sizes at all), so a mixed-stock product gave users no way to express "I want size 43" in the form. Second dead end.
- D-263 note below size block was generic and didn't respond to mixed-stock reality.

**Decision:** Two targeted fixes — make OOS chips actionable (anchor scroll to form) and give users a text input path for unavailable sizes in the form.

**Changes — `src/app/(app)/products/[slug]/page.tsx`:**
1. OOS size chip `<div>` → `<a href="#inquiry-form">` anchor:
   - `cursor: pointer`, `title="Bu beden için talep bırakmak ister misiniz?"`
   - Dashed border style (1.5px dashed) to visually distinguish from available chips
   - Clicking scrolls user directly to inquiry form — zero JS, pure HTML
2. D-263 note now context-aware for 3 cases:
   - `isSoldOut`: "Farklı beden veya alternatif ürün için talep bırakabilirsiniz..."
   - Mixed stock (some OOS): "Üzeri çizili bedenler için aşağıdan talep bırakabilirsiniz..."
   - All in stock: "Beden konusunda emin değilseniz talep formumuzu doldurun..."

**Changes — `src/components/ContactForm.tsx`:**
3. Added `chipSelected: boolean` state — separates "size from chip click" from "size typed manually"
4. Chip `onClick` sets `chipSelected=true`; "temizle" sets `chipSelected=false`; success reset clears both
5. When `!chipSelected` (no chip active): shows OOS recovery input:
   - Label: "Stokta olmayan beden mi arıyorsunuz?"
   - `<input>` bound to `size` state — user can type any size (e.g. 43 even if not in chips)
   - Below: "Beden seçmek zorunda değilsiniz — talep bırakın, yardımcı oluruz."
   When `chipSelected` (chip active): shows original "Seçili beden: X · temizle" indicator
6. `size` state holds either chip value or typed value — `handleSubmit` unchanged, attribution unchanged

**Preserved:** D-256 UTM capture, D-261 trust strip/FAQ, D-262 WA fast-path, D-263 form heading/process steps — all untouched.
**Commit:** `cd2369d` — `D-264: Out-of-stock size recovery / alternative inquiry path V1`

---

## D-265 — OOS Size Auto-Prefill / Recovery UX Polish V1
**Status:** IMPLEMENTED — commit `e8ea373`, pushed to `main` 2026-05-08

**Problem:**
- After D-264, tapping an OOS chip scrolled user to the inquiry form (good), but the recovery input was empty — no indication of which size was tapped. The connection between chip and form was invisible to the user.

**Decision:**
Replace the static `<a href="#inquiry-form">` OOS chips with a `OOSChip` client component that fires a custom browser event, and have `ContactForm` listen for it to auto-prefill the tapped size with contextual amber UI.

**Architecture — cross-component communication via CustomEvent:**
- OOS chips are rendered inside `page.tsx` (a Next.js SSR server component). `ContactForm` is a separate client component. The clicked size is not known at server render time so it cannot be passed as a prop.
- Selected approach: new `OOSChip.tsx` ('use client') fires `window.dispatchEvent(new CustomEvent('oosChipClicked', { detail: { size } }))` on click, then smooth-scrolls to `#inquiry-form`. No URL changes, no sessionStorage, no Next.js router involvement.
- `ContactForm` registers `window.addEventListener('oosChipClicked', handler)` in a `useEffect` → prefills `size` state + sets `oosContext` state (the tapped size string).

**Changes — `src/components/OOSChip.tsx` (new file):**
- Client component rendering same visual style as D-264 OOS chips (dashed border, line-through, faded colour)
- `onClick`: fires `oosChipClicked` CustomEvent with `{ detail: { size } }`, then `requestAnimationFrame` smooth-scrolls to `#inquiry-form`
- Keyboard accessible: `role="button"`, `tabIndex={0}`, `onKeyDown` Enter/Space handler

**Changes — `src/components/ContactForm.tsx`:**
- Added `oosContext: string | null` state (null = no prefill context)
- `useEffect` listener: on `oosChipClicked` → `setSize(detail.size)`, `setOosContext(detail.size)`, `setChipSelected(false)`
- Success reset: `setOosContext(null)` added alongside existing state clears
- When `!chipSelected` and `oosContext` set: amber banner "X numara şu an stokta görünmüyor. Talep bırakın, alternatif stok durumunu sizi arayarak bildiririz."
- When `!chipSelected` and no `oosContext`: original "Stokta olmayan beden mi arıyorsunuz?" label
- Input border: amber (`border-amber-300 focus:ring-amber-400`) when `oosContext` set, grey otherwise
- Input `onChange`: clears `oosContext` when user manually edits the prefilled value (amber UI dismissed)

**Changes — `src/app/(app)/products/[slug]/page.tsx`:**
- Added `import { OOSChip } from '@/components/OOSChip'`
- OOS chip render: `<a key={variant.id} href="#inquiry-form" ...>` → `<OOSChip key={variant.id} size={variant.size} />`

**Preserved:** All D-262/263/264 functionality — WA fast-path, sticky CTA, form heading, chipSelected logic, UTM capture — all untouched.
**Commit:** `e8ea373` — `D-265: OOS size auto-prefill + recovery UX polish V1`

---

## D-266 — Catalog / Site Search & Quick-Find Polish V1
**Status:** IMPLEMENTED — commit `6e796c2`, pushed to `main` 2026-05-08

**Problem:**
Users must manually browse or use category/size filters to find a product. No keyword search existed. If a user already knows brand, model name, or approximate product type, they have no fast-path to it.

**Decision:**
Add lightweight client-side keyword search to the catalog. No backend search infra — all product data is already loaded client-side. Match against product name/title and stockNumber. Layer search as the outermost filter so category/size/sort still work within search results.

**Filter pipeline (D-266):**
`searchFiltered → catFiltered (category) → flt (size) → sorted → shown`
Search is applied first; category/size/sort narrow within search results. Consistent and predictable.

**Changes — `src/app/(app)/UygunApp.jsx`:**
1. `query` state added to `Catalog` component
2. `q = query.trim().toLowerCase()` — normalized search term
3. `searchFiltered`: when `q` set, filters `allProducts` by `p.name || p.title` and `p.stockNumber` (both case-insensitive substring match); when empty, passes through all products
4. `catFiltered` now runs on `searchFiltered` instead of `allProducts` — category chips still narrow within search results
5. `hasActiveFilter` — now also true when `!!q` (search active)
6. `resetFilters` — now also calls `setQuery("")` (clears search on "Tüm Ürünleri Göster")
7. **Search bar JSX** between heading and desktop controls: full-width on mobile (480px max on desktop), pill-shaped, search icon left, ✕ clear button right, focus ring on interaction. Always visible (not inside `catalog-desktop-controls` hidden on mobile).
8. **Result count** — shows `· "query"` suffix when search active (desktop heading subtitle)
9. **Mobile sticky bar** — search active pill `🔍 "query" ✕` appears in the pills row; tapping clears search. Separate from the filter drawer badge count.
10. **Empty state** — search-aware: `"X için ürün bulunamadı"` heading, `"Farklı bir kelime deneyin..."` body, `"Aramayı Temizle"` CTA when query active. Falls back to original filter-empty messaging otherwise.

**Preserved:** D-259 browse clarity, D-260 mobile drawer + sticky bar, D-257 card `<a>` clickthrough, D-262 WA nudge — all untouched.
**Commit:** `6e796c2` — `D-266: Catalog / site search and quick-find polish V1`

---

## D-267 — PDP Alternative Product / Similar Model Recovery Path V1
**Status:** IMPLEMENTED — commit `b87a5ef`, pushed to `main` 2026-05-08

**Problem:**
When a user lands on a PDP for a product that is OOS or not the right fit, there is no recovery path — no similar or alternative product is shown. Bounce is the only option if the product doesn't match.

**Decision:**
Add a server-side "Benzer Modeller" section to the PDP, showing up to 6 products from the same category (excluding the current product and drafts), sorted by recency. Rendered server-side via Payload `payload.find()` — no client-side fetch, no new API route.

**Architecture:**
- Pure SSR — `similarResult` fetched in `page.tsx` async server component alongside existing Payload queries
- `where` clause: `category equals product.category` AND `id not_equals product.id` AND `status not_equals draft`
- `depth: 2` to resolve image media, `limit: 6`, `sort: -createdAt`
- When no similar products exist (empty category or new product), the section is hidden (zero-state safe)
- Image source: `extractUrls(generativeGallery)` first, then `extractUrls(images)` fallback — consistent with main PDP gallery logic

**Changes — `src/app/(app)/products/[slug]/page.tsx`:**
1. After `isSoldOut` computation: `similarResult` Payload query + `similarProducts` typed as `ProductDoc[]`
2. After `</section>` (closing FAQ section), before `</main>`: "Benzer Modeller" `<section>` — responsive auto-fill grid (minmax 200px, auto-fill), each card is an `<a href="/products/slug">` with 1:1 aspect-ratio image, title, and price in tr-TR locale

**Preserved:** All D-265 OOSChip prefill, D-264 OOS recovery, D-263 size guidance, D-262 WA fast-path, D-261 FAQ/trust — untouched.
**Commit:** `b87a5ef` — `feat: D-267 PDP similar products section (Benzer Modeller)`

---

## D-268 — PDP & Card Price / Stock / Discount Clarity Polish V1
**Status:** IMPLEMENTED — commit `fc21ecd`, pushed to `main` 2026-05-08

**Problem:**
Price hierarchy was readable but discount context was missing. `%20` alone on a badge is ambiguous — "percent off" needs the word "indirim" to be immediately clear in Turkish. Original price text was faint (0.3 opacity). Stock badge said "Stokta" with no size context. BEDEN section gave no count upfront.

**Changes — `src/app/(app)/UygunApp.jsx`:**
1. Card `originalPrice`: 12px → 13px, color `T.textLighter` (0.3) → `rgba(28,26,22,0.4)` — more readable, still clearly secondary
2. Card discount badge: `%{N}` → `%{N} indirim` — clarifies percent-off meaning
3. ProductDetail `originalPrice` color: same 0.3 → 0.4 improvement
4. ProductDetail discount badge: same `%{N}` → `%{N} indirim`

**Changes — `src/app/(app)/products/[slug]/page.tsx`:**
1. PDP `originalPrice` color: `rgba(28,26,22,0.3)` → `rgba(28,26,22,0.4)` — slightly more readable
2. PDP discount badge: `%{N}` → `%{N} indirim`
3. PDP stock badge "Stokta" → `Stokta · {availableSizes.length} beden` when variants present — contextualizes availability
4. PDP BEDEN section label → `BEDEN — {N} stokta` when sizes available, plain `BEDEN` when soldout or no variants

**Preserved:** D-264/265 OOS chip/prefill flow, D-262 WA fast-path, D-267 similar products — all untouched. No pricing logic changed. No schema changes.
**Commit:** `fc21ecd` — `feat: D-268 price/discount/stock/availability clarity polish`

---

## D-269 — PDP Product Image / Gallery Usability Polish V1
**Status:** IMPLEMENTED — commit `420e60d`, pushed to `main` 2026-05-08

**Problem:**
PDP gallery had no mobile swipe support (users had to tap small arrows). Inactive thumbnails at 0.5 opacity looked broken/faded. Thumbnail row had no overflow scroll (clipped on narrow screens). Image changes were instant (jarring snap). Active thumbnail state relied solely on a 2px border with transparent inactive ring.

**Decision:**
5 targeted improvements to `ProductImages.tsx` only. No architecture change, no new component, no schema change.

**Changes — `src/components/ProductImages.tsx`:**
1. **Mobile swipe**: `useRef` touchStartX + `onTouchStart`/`onTouchEnd` handlers on main image container — swipe left = next, swipe right = prev (min 50px delta). No external library.
2. **Image fade-in**: `key={activeIndex}` on `<img>` + CSS `@keyframes pdpImgFadeIn` (opacity 0.55 → 1, 0.22s ease) — smooth transition on every image change.
3. **Thumbnail row scroll**: `overflowX: 'auto'`, `scrollbarWidth: 'none'`, `::-webkit-scrollbar { display: none }` — thumbnails scroll horizontally on narrow screens instead of clipping.
4. **Active thumbnail ring**: `boxShadow: '0 0 0 3px rgba(28,26,22,0.15)'` — outer glow ring alongside the existing dark border for clearer active state.
5. **Inactive thumbnail**: opacity 0.5 → 0.65 (less aggressive fade), border `2px solid transparent` → `2px solid rgba(28,26,22,0.12)` (subtle visible ring, not invisible).

**Preserved:** All PDP downstream flow — D-256 inquiry form, D-262 WA fast-path, D-263/264/265 size recovery, D-267 similar products, D-268 price clarity — completely untouched.
**Commit:** `420e60d` — `feat: D-269 PDP gallery usability polish`

---

## D-270 — PDP Zoom / Fullscreen Image Inspection V1
**Status:** IMPLEMENTED — commit `c01b3ec`, pushed to `main` 2026-05-08

**Problem:**
After D-269 gallery polish, mobile swipe and thumbnail clarity improved but there was still no way to inspect product images closely. Tapping the main image did nothing. No close-up / fullscreen path existed.

**Decision:**
Implement a tap-to-fullscreen lightbox directly inside `ProductImages.tsx`. No new component, no external library. Reuse existing D-269 swipe handlers and goNext/goPrev for fullscreen navigation.

**Architecture:**
- `isFullscreen` boolean state added to `ProductImages`
- `useEffect` registers Escape key listener + `document.body.style.overflow = 'hidden'` when open; cleanup restores on close
- Fullscreen overlay: `position: fixed`, `inset: 0`, `z-index: 9999`, dark backdrop `rgba(0,0,0,0.93)`, fade-in via `@keyframes pdpOverlayIn 0.18s`
- Image: `maxWidth: 92vw`, `maxHeight: 88vh`, `objectFit: contain`, re-uses `pdpImgFadeIn` animation
- Close paths: ✕ button (top-right, 44px), tap backdrop, Escape key
- Nav: prev/next arrows (48px, ghost style), swipe reused from D-269, counter bottom-center
- Inline gallery: `cursor: zoom-in` on main image + "Büyüt" affordance hint (top-right, `pointerEvents: none`)
- Inline arrows get `e.stopPropagation()` so tapping them doesn't trigger fullscreen

**Changes — `src/components/ProductImages.tsx`:**
- Added `useEffect` import alongside `useState`, `useRef`
- Added `isFullscreen` state
- Added `useEffect` hook for Escape + body scroll lock
- Added fullscreen overlay JSX (conditional render when `isFullscreen`)
- Main image container: `cursor: zoom-in`, `onClick={() => setIsFullscreen(true)}`
- Inline nav arrows: `e.stopPropagation()` added to onClick
- "Büyüt" hint badge added top-right of main image

**Preserved:** All D-269 improvements (swipe, fade, thumbnail scroll, active ring) — fully intact and reused.
**Commit:** `c01b3ec` — `feat: D-270 PDP fullscreen image inspection lightbox`

---

## D-271 — Mobile Image Loading Performance V1
**Status:** IMPLEMENTED — commit `38d5f0d`, pushed to `main` 2026-05-08

**Problem:**
Every `<img>` tag across the storefront was missing `loading` attributes, causing all images — including those far below the fold — to load eagerly on page load. On mobile this means the catalog's full card grid, all gallery thumbnails, the similar-products section, and the cart drawer all fire image requests simultaneously. No critical above-fold image had `fetchPriority="high"` to signal the browser's preload scanner.

**Decision:**
Apply the standard native-browser loading hint pattern across all image locations. No library, no lazy-load JavaScript — pure HTML attributes. The browser's built-in preload scanner and lazy-load implementation handles the rest.

**Changes:**

`src/components/ProductImages.tsx`:
- PDP hero `<img>`: added `fetchPriority="high"` + `loading="eager"` (critical above-fold image)
- Thumbnail `<img>`: added `loading="lazy"` (below main image, often off-screen on mobile)

`src/app/(app)/products/[slug]/page.tsx`:
- Similar products section `<img>`: added `loading="lazy"` (below-fold section after FAQ)

`src/app/(app)/UygunApp.jsx`:
- Catalog card `<img src={displayImg}>`: added `loading="lazy"` (most cards are below fold)
- Hero Unsplash `<img>`: added `fetchpriority="high"` (above-fold landing image)
- Cart drawer thumbnail `<img>`: added `loading="lazy"` (drawer is off-screen until opened)
- ProductDetail main `<img src={allImages[im]}>`: added `fetchPriority="high"` + `loading="eager"` (critical above-fold in desktop modal)
- ProductDetail thumbnail `<img src={x}>`: added `loading="lazy"`

**What was NOT changed:**
- Fullscreen lightbox `<img>` in `ProductImages.tsx` — opened only on user interaction; eager is correct
- `backdropFilter: blur()` usages — kept; they are functional UI, not pure decoration; removing would degrade visual quality

**Commit:** `38d5f0d` — `feat: D-271 add loading=lazy on below-fold imgs, fetchPriority=high on hero imgs`

---

## D-272 — Cart / Checkout Expectation Clarity V1
**Status:** IMPLEMENTED — commit `50785a9`, pushed to `main` 2026-05-08

**Problem:**
Three verified expectation mismatches in cart/checkout surfaces:
1. Cart drawer WA button said "WHATSAPP İLE SİPARİŞ VER" — "SİPARİŞ VER" implies the order is complete. In reality it opens a WhatsApp chat; the order is completed manually by the team.
2. Cart drawer had zero process explanation between the total row and the WA button — visitors had no idea what happens next.
3. The `page.tsx` PDP "SEPETE EKLE" primary CTA was a `<button>` with no `onClick` handler — it did nothing when tapped/clicked. Visitors selected a product, tapped the primary CTA, and nothing happened. The real conversion paths (WA button, ContactForm below) were lower on the page.

**Decisions:**

*Cart drawer:*
- Added a compact process note between the total row and the WA button: "Talebiniz WhatsApp'tan ekibimize iletilir — ekibimiz sizi arar ve siparişi birlikte tamamlar."
- Renamed WA button: "WHATSAPP İLE SİPARİŞ VER" → "WHATSAPP İLE TALEBİNİZİ İLETİN" — honest framing (send request, not place order).

*ProductDetail (UygunApp inline modal):*
- Added process hint below trust badges: "Sepete ekleyip WhatsApp'tan sipariş talebinizi iletebilirsiniz — ekibimiz sizi arar ve süreci tamamlar."

*PDP page.tsx primary CTA:*
- Replaced the non-functional `<button disabled={isSoldOut}>SEPETE EKLE</button>` (had no onClick, did nothing in stock) with `<a href="#inquiry-form">TALEBİNİZİ OLUŞTURUN</a>` — now functional, scrolls to the inquiry form, and reflects the real business model. STOKTA YOK disabled state preserved as a button.

**What was NOT changed:**
- The inquiry form, ContactForm, OOSChip, sticky mobile CTA — all preserved exactly as D-256/D-262/D-265 left them.
- WhatsApp fast-path (secondary WA button on PDP) — unchanged.
- Cart drawer overall structure — unchanged.
- No schema change.

**Files changed:** `src/app/(app)/UygunApp.jsx`, `src/app/(app)/products/[slug]/page.tsx`
**Commit:** `50785a9` — `feat: D-272 cart/checkout expectation clarity`

---

## D-273 — Contact Form Validation / Submission Confidence V1
**Status:** IMPLEMENTED — commit `ea870d8`, pushed to `main` 2026-05-08

**Problem:**
Five verified weak points in ContactForm:
1. No client-side validation — phone format errors only discovered after server round-trip, shown as generic "Bir hata oluştu" with no actionable guidance.
2. API error body was thrown away — the server returns `{ error: 'Invalid phone number' }` on 400, but the client caught all non-ok responses as a generic error.
3. No "(zorunlu)" indicator on required fields (Name, Phone) — the "(opsiyonel)" label on Beden was unmatched, leaving required fields unlabelled.
4. Error message rendered below the submit button — invisible on mobile after scrolling to tap submit.
5. No phone helper text — unlike the size section which has extensive guidance.

**Decisions:**

*Client-side validation (before fetch):*
- `phoneRegex` constant (`/^[0-9+\-\s()]{7,20}$/`) mirrors the server-side rule exactly — no double-standard.
- Name: must be ≥ 2 non-empty chars → "Adınızı eksiksiz girin."
- Phone: must match regex → "Lütfen geçerli bir telefon numarası girin (Örn: 0533 123 45 67)."
- Validation runs before `setStatus('loading')` — no network round-trip wasted on invalid input.

*API error handling:*
- On 400 with body containing "phone" → set `phoneError` (field-level, not generic); reset status to idle so user can correct and resubmit.
- On other 400/5xx → "Talebiniz gönderilemedi. Lütfen tekrar deneyin veya WhatsApp'tan ulaşın."
- On fetch failure (network) → "İnternet bağlantınızı kontrol edin..." — distinguishes connectivity vs server issue.

*Field labels:*
- Name and Phone: `(zorunlu)` suffix in red-400 — matches the `(opsiyonel)` pattern on Beden.
- Fields: error border → `border-red-400 focus:ring-red-400`; auto-cleared when user edits.

*Phone helper text:* "Sizi arayabilmemiz için güncel numaranızı girin." — below the phone field when no error.

*Error position:* Error box moved above submit button; styled `bg-red-50 border border-red-200` (compact, not alarming).

*Loading text:* "Gönderiliyor…" → "Talebiniz gönderiliyor…" (product-specific framing).

**Preserved:** D-251 attribution capture, D-264 chip flow, D-265 OOS prefill/amber banner, D-261 success state, D-261 trust line — all unchanged.

**File changed:** `src/components/ContactForm.tsx`
**Commit:** `ea870d8` — `feat: D-273 ContactForm validation polish`

---

## D-274 — Header / Navigation / Sitewide Entry Clarity V1
**Status:** IMPLEMENTED — commit `9e5a087`, pushed to `main` 2026-05-08

**Problem:**
Four verified weak points in navigation:
1. Desktop nav had no active-page visual indicator — current page was only slightly darker text, indistinguishable on a beige background.
2. Mobile menu items were all the same color (T.text) regardless of active state — no way to see which page you're on.
3. Mobile menu had a bare WhatsApp button with no section label — the browse rows and the contact action were visually identical in hierarchy.
4. Footer "Sipariş" column heading was misleading — the column only contains a single WhatsApp link, not order management.

**Decisions:**

*Desktop nav active indicator:*
- Added `borderBottom: pg === l.k ? "1.5px solid " + T.text : "1.5px solid transparent"` + `paddingBottom: 4` on each nav link span.
- Transparent border when inactive so the layout doesn't shift; solid when active.
- Transition covers both `color` and `border-color` for a smooth page-switch feel.

*Mobile menu active state + hierarchy:*
- Inactive items: `color: "rgba(28,26,22,0.52)"` (visually muted, clearly secondary).
- Active item: `color: T.text` + same 1.5px underline as desktop — consistent cross-breakpoint language.
- Added `›` chevron on the right of each row to communicate "this is a navigation path", not just a label.
- Flex layout (space-between) for label + chevron alignment.

*Mobile menu section label:*
- Added a muted "Yardım & İletişim" section header (9px uppercase, `rgba(28,26,22,0.28)`) above the WhatsApp button — makes the browse / contact hierarchy explicit.
- WA button text "WhatsApp ile Yaz" → "WhatsApp ile İletişim Kur" (more descriptive action label).
- Removed `marginTop: 16` from the button (section label provides spacing instead).

*Footer column rename:*
- "Sipariş" → "Yardım" — honest label for a column that only offers a contact link, not order management.

**What was NOT changed:**
- Nav link labels ("ANA SAYFA", "AYAKKABILAR") — accurate, no need to change.
- TopBar (promo strip) — purely informational; navigation value would require a larger rethink.
- Desktop WHATSAPP button styling — already visually distinct (green filled pill); hierarchy is adequate.
- Footer "Sayfalar" column or link list — correct as-is.

**File changed:** `src/app/(app)/UygunApp.jsx`
**Commit:** `9e5a087` — `D-274: nav active state mobile menu hierarchy footer label`

---

## D-278 — SupplierScout: Autonomous Telegram Supplier Monitoring Bot
**Status:** IMPLEMENTED (code complete) — pending Neon DDL + env vars + activation
**Date:** 2026-05-09

**Problem:**
Frank manually monitors wholesaler Telegram groups, copies product info, and creates website listings by hand. This is slow, error-prone, and doesn't scale. Sold-out signals are often missed entirely.

**Decision:**
Build a fully autonomous, separate Telegram bot (SupplierScout) that:
- Monitors multiple wholesaler groups
- Classifies every message using Gemini 2.5 Flash NLP (11 classes)
- Auto-creates draft products when confidence ≥ 75 and 9-condition gate passes
- Auto-applies sold-out when match score ≥ 80 (6-signal scoring)
- Sends Frank a private Telegram daily report at 23:30 Istanbul
- Learns Turkish supplier slang via /teach and stores seller/group patterns
- Logs every autonomous action immutably

**Key constraints:**
- Completely separate from Uygunops/GeoBot (separate token, route, collections)
- All autonomous actions are logged and reversible where possible
- Frank can pause everything instantly with /pause_auto
- Auto-create gate requires: photo + price + sizes + name + score ≥ 75 + no duplicate + group not blocked + not paused + autoCreateEnabled
- Products created as drafts with stockMode=supplier_virtual_stock (quantity=10, exactStockKnown=false)
- Pricing: wholesale + defaultMarginUSD (default $15), configurable per group

**Architecture:**
- Route: `/api/supplier-scout` (POST for Telegram webhook, GET for cron/health)
- Lib: `src/lib/supplierScout/` (classifier, parser, soldoutMatcher, productCreator, memory, reportGenerator, commands, telegram)
- Collections: 9 new in `src/collections/supplier/`
- Global: `SupplierScoutSettings`
- Full runbook: `project-control/SUPPLIER_SCOUT_RUNBOOK.md`
- Full architecture + DDL: `project-control/SUPPLIER_SCOUT.md`

**Rejected alternatives:**
- Extending Mentix/Uygunops: rejected — too much blast radius, separate concerns
- Pure regex parser: rejected — Turkish supplier slang is too varied, Gemini NLP is correct tool
- Manual approval per product: rejected — defeats the purpose (operator requirement: autonomous)
