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
**Decision:** 39 static products are hardcoded in UygunApp.jsx and displayed alongside DB products. DB products take priority (deduplication by slug).
**Reason:** Ensures the storefront always has content even before admin populates the database. As DB products grow, static products are gradually displaced.
**Status:** ACTIVE — will be reconsidered when DB has sufficient products

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
