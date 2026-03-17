# PROJECT STATE — Uygunayakkabi

_Last updated: 2026-03-17 (Admin panel restored after cascading DB schema migration failures — all issues resolved manually)_

## Current Status
Phase 1 **COMPLETE** (validated 2026-03-13).
Phase 2 **ACTIVE** — Steps 1–15 complete. Dispatch chain verified, media URLs hardened, E2E runbook ready. (2026-03-16)
**Mentix Intelligence Layer v2** — DEPLOYED ✅ (2026-03-17). All 13 skills on VPS, identity updated, ops group live with Bahriyar as 3rd authorized user.

End-to-end pipeline validated:
- Telegram group mention → OpenClaw (mentix-intake v3) → n8n webhook → Payload draft product → media attach → duplicate guard → admin review
- Security rotation: **DONE**
- Docker network persistence: **DONE**
- Telegram group allowlist (Furkan + Sabri + Bahriyar): **DONE**
- Ops group full-capability mention-trigger: **LIVE**

## Current Phase
Phase 2 — Automation Backbone (**ACTIVE — Steps 1–15 complete, Step 16 next**)
Mentix Intelligence Layer v2 — **DEPLOYED AND LIVE** (2026-03-17)

---

## Mentix Intelligence Layer v2 — LIVE STATE (2026-03-17)

### VPS Deployment Reality
- All 13 skills deployed to `/home/furkan/.openclaw/skills/`
- All skills registered in `openclaw.json` → `skills.entries` (enabled: true)
- `mentix-memory/` 12-layer directory structure created at `/home/furkan/.openclaw/mentix-memory/`
- TRACE_SCHEMA.json + GOLDEN_CASES.json copied to VPS
- `workspace/IDENTITY.md` updated to Mentix v2 identity
- `workspace/BOOTSTRAP.md` updated with skill loading instructions
- `workspace/mentix-skills` symlink → `/home/furkan/.openclaw/skills/` (Mentix can read all SKILL.md files)
- OpenClaw restarted and verified responding

### All Skills — Live on VPS
| Skill | Level | Permission Model | VPS Status |
|-------|-------|-----------------|------------|
| mentix-intake | A | Chat-scope v3 routing, job_id, role model | ✅ LIVE v3.0 |
| product-flow-debugger | A | First-class module — 13-step trace map | ✅ LIVE |
| skill-vetter | A | Read=ALLOWED / Block=CONFIRM / Auto-block=DENIED | ✅ LIVE |
| browser-automation | A | Read=ALLOWED / Click=CONFIRM / Bulk=DENIED | ✅ LIVE |
| sql-toolkit | A | SELECT=ALLOWED / UPDATE=CONFIRM / DELETE=DENIED | ✅ LIVE |
| agent-memory | A | Store/Retrieve=ALLOWED / Delete=DENIED | ✅ LIVE |
| github-workflow | A | Read=ALLOWED / Commit=CONFIRM / Force-push=DENIED | ✅ LIVE |
| uptime-kuma | A | Read=ALLOWED | ✅ LIVE |
| eachlabs-image-edit | B | Single-image=CONFIRM / Bulk=DENIED | ✅ LIVE |
| upload-post | B | Draft=ALLOWED / Publish=CONFIRM / Auto-publish=DENIED | ✅ LIVE |
| research-cog | B | Informational only | ✅ LIVE |
| senior-backend | B | Advisory only | ✅ LIVE |
| learning-engine | C | Observe=ALLOWED / Auto-modify=DENIED | ✅ LIVE |

**Total: 13 skills deployed and registered**

### Chat Scope Policy v3 (LIVE)
| Context | Trigger | Capability |
|---------|---------|------------|
| DM (private) | Every message | Full |
| Approved ops group | @mention only | Full (same as DM) |
| Other groups | — | Silent drop |

**Authorized group users:** Furkan (5450039553), Sabri/Bahriyar (8049990232), Bahriyar (5232747260)

### Runtime Validation — Phase 2 Complete (2026-03-17)
- ✅ Confirmation-completion flow: S2 → AWAITING_CONFIRMATION → resolved, RWD-SIM-002 score=3
- ✅ Wrong diagnosis: RWD-SIM-004 score=-9 (wrong_diagnosis -5, false_confidence -4)
- ✅ REPORT_ONLY fix (D-076): DEC-SIM-003 written with final_action=NO_ACTION
- ✅ Restart persistence: 11 field checks passed from disk reload

### Key Architecture Decisions (this session)
- **D-074**: product-flow-debugger is first-class module, not sql-toolkit sub-feature
- **D-075**: OER separation — outcome/evaluation/reward stored separately
- **D-076**: REPORT_ONLY gate always writes decision record (audit trail)

### mentix-memory/ System (12 Layers — in repo, pending VPS deployment)
| Layer | Contents |
|-------|----------|
| `identity/` | MENTIX_IDENTITY.md — 6 subsystems, what Mentix is/isn't |
| `policies/` | DECISION_POLICY.md, WRITE_POLICY.md, PUBLISH_POLICY.md, MEMORY_POLICY.md, SKILL_GATING_POLICY.md |
| `runbooks/` | 6 runbooks: product-not-visible, intake-failure, stock-mismatch, image-not-rendering, storefront-desync, price-not-updated |
| `incidents/` | Active incident records (runtime) |
| `traces/` | TRACE_SCHEMA.json + diagnostic session traces |
| `patterns/` | Recurring issue patterns (learning engine output) |
| `decisions/` | Decision records per action taken |
| `evaluations/` | Was Mentix correct? (separate from outcomes) |
| `rewards/` | Score records (separate from evaluations) |
| `evals/` | GOLDEN_CASES.json (3 regression test cases) |
| `summaries/` | Weekly/monthly digests |
| `archive/` | Compressed old records |

### Formal Decision Schema (12 fields)
All decisions logged with: `task_type`, `risk_level`, `requires_write`, `requires_external_publish`, `confidence_score`, `evidence_strength`, `human_approval_required`, `reversible`, `blast_radius`, `selected_skills`, `proposed_action`, `final_action`

### Confidence Gate
| Score | Risk | Action |
|-------|------|--------|
| < 0.55 | any | Report only — do not proceed |
| 0.55–0.79 | any | Propose + confirm required |
| ≥ 0.80 | LOW | Proceed autonomously |
| ≥ 0.80 | MEDIUM | Proceed with confirmation |
| any | HIGH | Escalate to human always |

### Project Governance Files
| File | Purpose | Location |
|------|---------|----------|
| SYSTEM_PROMPT.md | Repo-level memory governance rules | `project-control/SYSTEM_PROMPT.md` |
| MENTIX_SYSTEM_PROMPT.md | Mentix skill stack governance + intelligence layer spec | `project-control/MENTIX_SYSTEM_PROMPT.md` |
| Skill Stack Dashboard v2 | Visual HTML — 7-tab interactive dashboard | `mentix-skill-stack-dashboard.html` (repo root) |

---

## Current Working State

### Admin Panel (Payload CMS)
- Admin panel loads correctly at `uygunayakkabi.com/admin` — **CONFIRMED WORKING (restored 2026-03-17 after DB crisis)**
- **Default Payload light theme** (dark mode CSS was removed — see D-029)
- **Turkish language** configured as default (`@payloadcms/translations/languages/tr`)
- importMap includes: all standard Payload components + VercelBlobClientUploadHandler + ReviewPanel + SourceBadgeCell + StatusCell
- **Custom Dashboard** (`afterDashboard`) is currently **DISABLED** in payload.config.ts
- Admin grouped: Mağaza / Katalog / Medya / Müşteri / Stok / Pazarlama (Banners) / Ayarlar (Site Settings)
- 11 collections registered: Users, Products, Variants, Brands, Categories, Media, CustomerInquiries, InventoryLogs, Orders, Banners, BlogPosts
- 2 globals registered: SiteSettings, AutomationSettings
- **Products list**: Source column with badges (Telegram / Otomasyon / Admin) + "Aktif Yap" quick-activate button
- **Products edit (automation source)**: ReviewPanel shown at top — source info, chat/message ID, readiness checklist (title/price/image/SKU/category/brand), "Yayına Hazır" / "Eksikler Var" status

### Collections — Current Field State

**Products** (expanded 2026-03-15):
- Fields: title (required, Turkish validation), description, brand (text), category (select: Günlük/Spor/Klasik/Bot/Sandalet/Krampon/Cüzdan), gender, price (required, Turkish validation), originalPrice, status (active/soldout/draft), featured, slug (auto-generated, readOnly), sku (auto-generated if empty), images, variants, color, material
- **New fields (2026-03-15):** productFamily (select: shoes/wallets/bags/belts/accessories), productType (text), channelTargets (select multi: website/instagram/shopier/dolap), automationFlags group (autoActivate, generateBlog, generateExtraViews, enableTryOn), sourceMeta group (telegramChatId, telegramSenderId, workflowId, externalSyncId)
- **Automation fields (2026-03-15):** source (select: admin/telegram/n8n/api/import, sidebar, readOnly, SourceBadgeCell), channels group (publishWebsite/publishInstagram/publishShopier/publishDolap checkboxes), automationMeta group (telegramChatId, telegramMessageId — used for idempotency), stockQuantity (int, default 1)
- **Step 11 fields (2026-03-16):** automationMeta extended with rawCaption (text), parseWarnings (textarea/JSON), parseConfidence (number 0–100); channelTargets (multi-select); automationFlags group (autoActivate/generateBlog/generateExtraViews/enableTryOn); sourceMeta group (telegramSenderId/workflowId/externalSyncId)
- **Step 12 fields (2026-03-16):** automationMeta extended with autoDecision (select: active/draft), autoDecisionReason (textarea) — stores decision layer output for admin visibility
- `beforeValidate` hook: always auto-generates slug from title; auto-generates SKU if empty; automation SKU pattern: `TG-{PREFIX3}-{msgId}`
- `beforeDelete` hook: nullifies all variant.product and media.product references before deletion (prevents FK constraint errors)
- Status labels: Turkish with emoji indicators
- **Backward compatibility:** existing `category` field preserved alongside new `productFamily`/`productType`
- **Idempotency:** `automationMeta.telegramChatId + telegramMessageId` used for duplicate detection — returns `{ status: "duplicate" }` if same message re-submitted

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
- All collections and fields aligned — **after manual migration crisis recovery on 2026-03-17**
- SSL: `sslmode=require` removed from DATABASE_URI; `ssl: { rejectUnauthorized: false }` added to pool options in payload.config.ts (fixes pg-connection-string deprecation warning / red error overlay in dev)
- BLOB_READ_WRITE_TOKEN confirmed set in Vercel env vars

#### ⚠️ DB Migration History (2026-03-17) — RESOLVED
Drizzle `push: true` failed to complete schema changes on Neon serverless (timeouts/partial failures).
Four issues required manual SQL fixes in Neon SQL Editor:

1. **`products_channel_targets` — wrong column names + wrong `id` type (FIXED 2026-03-17)**
   - Table was manually created with `_parent_id` / `_order` (old Payload v2 convention)
   - Payload v3 Drizzle runtime expects `parent_id` / `order` (no underscore prefix)
   - Fix #1 (2026-03-17): `RENAME COLUMN "_parent_id" TO "parent_id"` + `RENAME COLUMN "_order" TO "order"`
   - **`id` column was `character varying NOT NULL` with no default** — Payload/Drizzle (idType='serial') generates INSERT with `DEFAULT` for id, which fails when no sequence exists. Root cause of POST /api/products → 500 error on product save.
   - Fix #2 (2026-03-17): Dropped PK + dropped varchar id + re-added as `SERIAL PRIMARY KEY`; added FK `parent_id → products.id ON DELETE CASCADE`; added order_idx and parent_idx indexes.
   - **Key principle: `push: true` does NOT run in production (`NODE_ENV=production`). All schema changes must be applied manually to Neon for production.**

2. **`automation_settings` table missing**
   - `AutomationSettings` global added to `payload.config.ts` but Drizzle push timed out before creating the table
   - Also required `automation_settings_id` column in `payload_locked_documents_rels`
   - Fix: manually `CREATE TABLE automation_settings (...)` + `ADD COLUMN automation_settings_id`

3. **`blog_posts` table missing**
   - `BlogPosts` collection added but Drizzle push never ran successfully
   - Required: `blog_posts` table, `blog_posts_rels` table, `blog_posts_id` in `payload_locked_documents_rels`
   - Fix: manually `CREATE TABLE blog_posts (...)` + FK + indexes + `ADD COLUMN blog_posts_id`

**Root cause:** `push: true` on Neon serverless cannot reliably complete multi-table schema changes in a single cold-start window. Any new collection/global addition risks a partial migration state.

**⚠️ Implication:** Every new collection or global added to `payload.config.ts` MUST be followed by manual SQL verification in Neon. Do NOT assume `push: true` will self-heal.

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
- Env vars set: DATABASE_URI, PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL, NEXT_PUBLIC_WHATSAPP_NUMBER, BLOB_READ_WRITE_TOKEN, AUTOMATION_SECRET, N8N_INTAKE_WEBHOOK
- Env vars **NOT YET SET** (pending operator): `N8N_CHANNEL_INSTAGRAM_WEBHOOK`, `N8N_CHANNEL_SHOPIER_WEBHOOK`, `N8N_CHANNEL_DOLAP_WEBHOOK`
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

### VPS — Automation Pipeline (LIVE as of 2026-03-15)
- **Security rotation**: ✅ DONE (Step 1)
- **Docker network persistence**: ✅ DONE — OpenClaw gateway bound to `web` network in docker-compose.yml (Step 2)
- **Telegram group policy**: ✅ DONE — `groupAllowFrom: [5450039553, 8049990232]`, `requireMention: true`, BotFather Group Privacy OFF (Step 3)
- **mentix-intake skill**: `/home/furkan/.openclaw/skills/mentix-intake/SKILL.md` — active on VPS, calls n8n webhook via curl (Step 4)
- **n8n webhook**: `POST /webhook/mentix-intake` — 3-node workflow (Webhook → Parse Intake Fields → Respond), live at flow.uygunayakkabi.com (Steps 4–6)
- **Payload automation endpoints**:
  - `POST /api/automation/products` — X-Automation-Secret header auth, creates draft products (Step 5)
  - `POST /api/automation/attach-media` — downloads Telegram file binary, uploads to Payload media, links to product (Step 6)
- **Duplicate protection**: telegramChatId + telegramMessageId idempotency key — active (Step 7)
- **OpenClaw skills**: clawhub/github/gog/xurl deferred — not blocking core operation.

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

## Step 15 — E2E Verification Pass + Media URL Hardening (COMPLETE ✅ — 2026-03-16)
- `channelDispatch.ts` `extractMediaUrls()`: relative `/media/` paths now made absolute via `NEXT_PUBLIC_SERVER_URL` — VPS-side workers can fetch all media URLs
- `.env.example`: updated with full Phase 2 env var set (AUTOMATION_SECRET, BLOB_READ_WRITE_TOKEN, N8N_CHANNEL_*_WEBHOOK, N8N_INTAKE_WEBHOOK)
- `n8n-workflows/E2E_TEST_CHECKLIST.md` (120-line runbook): n8n import → env setup → test product → log verification → n8n execution check → media URL test → forceRedispatch test → failure mode table → quick checklist
- `CHANNEL_DISPATCH_CONTRACT.md`: Media URL Behavior section + Known Limitations table added
- **Verified clean:** env var naming, dispatch error handling, afterChange guard, Blob URL accessibility, forceRedispatch behavior
- **Remaining ops (not code):** import stubs to n8n, set env vars in Vercel, run E2E test per checklist

## Step 14 — n8n Stubs + Admin Dispatch Visibility (COMPLETE ✅ — 2026-03-16)
- `n8n-workflows/stubs/channel-instagram.json` + channel-shopier.json + channel-dolap.json — importable n8n stub workflows (Webhook → Log Payload → Respond 200, no real API calls)
- `n8n-workflows/CHANNEL_DISPATCH_CONTRACT.md` (222 lines) — full adapter contract, sample payload, setup guide, test checklist
- ReviewPanel: dispatch status section (active products only) — per-channel eligible/dispatched/webhookConfigured/skippedReason/error/responseStatus rows, color-coded, `lastDispatchedAt`, collapsible raw debug block, pending dispatch hint for inactive products
- `sourceMeta.forceRedispatch` checkbox — admin-triggered manual re-dispatch; auto-resets to false; triggers on already-active products; retry-safe (not reset on error)
- afterChange hook updated: handles `forceRedispatch === true` alongside `status → active` transition; logs trigger type; always resets flag on success

## Step 13 — Channel Adapter Scaffolding (COMPLETE ✅ — 2026-03-16)
- `src/lib/channelDispatch.ts` (374 lines) — pure dispatch library
  - `ChannelDispatchPayload` type (adapter contract) for Instagram / Shopier / Dolap
  - `evaluateChannelEligibility()` — 3-gate eligibility: global capability ∩ product channelTargets ∩ channels.* flag
  - `buildDispatchPayload()` — builds full structured n8n payload from product doc
  - `dispatchToChannel()` — POST to n8n webhook if env var set; scaffold log if not
  - `buildChannelWebhookUrl()` — reads N8N_CHANNEL_INSTAGRAM/SHOPIER/DOLAP_WEBHOOK
  - `dispatchProductToChannels()` — orchestrator, returns per-channel results
- `Products.ts` afterChange hook: fires on status non-active → active transition
  - `req.context.isDispatchUpdate = true` pattern prevents infinite re-trigger on sourceMeta write
  - Non-fatal: activation always succeeds even if dispatch errors occur
- `Products.ts` sourceMeta: `dispatchedChannels` (text/JSON), `lastDispatchedAt` (date), `dispatchNotes` (textarea/JSON) added
- Env vars for live mode: `N8N_CHANNEL_INSTAGRAM_WEBHOOK`, `N8N_CHANNEL_SHOPIER_WEBHOOK`, `N8N_CHANNEL_DOLAP_WEBHOOK`
- Website excluded: served natively via active status, no dispatch webhook needed

## Pending Operator Actions (BEFORE Step 16 can start)

⚠️ These are **VPS + Vercel Dashboard** tasks — not code. Must be completed and verified.

1. **n8n**: Import `n8n-workflows/stubs/channel-instagram.json` → activate → confirm URL is `/webhook/channel-instagram` (not `/webhook-test/`)
2. **Vercel**: Set `N8N_CHANNEL_INSTAGRAM_WEBHOOK=https://flow.uygunayakkabi.com/webhook/channel-instagram` → redeploy
3. **AutomationSettings admin**: Confirm `publishInstagram = true`
4. **E2E test**: Create test product (draft → active, channelTargets=instagram, 1 image) → verify Vercel logs `ok=true`, n8n execution Success, sourceMeta `dispatchedChannels: ["instagram"]`, ReviewPanel green row, `mediaUrls` all `https://`

Go/no-go for Step 16: all 4 checks above pass.

## Next Focus
**Step 16 — First Real Channel Integration** (after E2E stub test passes)
- Replace Instagram stub with real n8n workflow using Instagram Graph API
- Keep Shopier, Dolap, Blog in scaffold mode
- sourceMeta.externalSyncId write-back from channel worker
- Preserve forceRedispatch support
See TASK_QUEUE.md for ordered execution plan.
