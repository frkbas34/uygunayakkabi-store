# TASK_QUEUE.md — Uygunayakkabi / Mentix
_Consolidated: 2026-03-23 — Steps 1–20 complete, Shopier live_

---

## ⚠️ Active Blockers

### Blocker 0: push:true reliability — ONGOING RISK ⚠️
`push: true` on Neon serverless cannot reliably complete multi-table migrations.
**Critical:** `push: true` does NOT run in production (`NODE_ENV=production` guard).
Before adding any new collection or global: manually verify the new table exists in Neon after first deployment.

### Blocker 1: Instagram Token Expiry — ACTION NEEDED by 2026-05-20
Long-lived token expires ~2026-05-20. No automatic refresh mechanism.
Manual refresh: visit `https://uygunayakkabi.com/api/auth/instagram/initiate`
**Decision needed:** implement n8n scheduled refresh, or switch to System User token (no expiry)?

---

## ✅ COMPLETED — Phase 1 (Core Admin + Storefront)
All Phase 1 items validated in production 2026-03-13. Full list in source TASK_QUEUE.md.

---

## ✅ COMPLETED — Phase 2A Steps 1–15 (Automation Backbone)

| Step | What | Validated |
|------|------|-----------|
| 1 | Security rotation (tokens, API keys) | ✅ 2026-03-15 |
| 2 | Docker network persistence (gateway → web) | ✅ 2026-03-15 |
| 3 | Telegram group allowlist + mention-only | ✅ 2026-03-15 |
| 4 | OpenClaw → n8n intake webhook | ✅ 2026-03-15 |
| 5 | n8n → Payload draft product creation | ✅ 2026-03-15 |
| 6 | Media pipeline (Telegram → Payload → Vercel Blob) | ✅ 2026-03-15 |
| 7 | Duplicate protection (chatId+messageId idempotency) | ✅ 2026-03-15 |
| 8 | Admin review UI (ReviewPanel, SourceBadge, StatusCell) | ✅ 2026-03-15 |
| 9 | Inventory baseline (stockQuantity, variant color, SKU) | ✅ 2026-03-15 |
| 10 | Publish guard (price validation, draft 404) | ✅ 2026-03-15 |
| 11 | Caption parser enhancement (TR/EN, confidence, warnings) | ✅ 2026-03-16 |
| 12 | Automation settings / global toggle layer | ✅ 2026-03-16 |
| 13 | Channel adapter scaffolding (channelDispatch.ts) | ✅ 2026-03-16 |
| 14 | Channel workflow stubs + admin dispatch visibility | ✅ 2026-03-16 |
| 15 | E2E verification pass + media URL hardening | ✅ 2026-03-16 |

---

## ✅ COMPLETED — Phase 2B Channel Integrations (Steps 16–20)

| Step | What | Validated |
|------|------|-----------|
| 16 | Instagram real n8n workflow (Graph API v21.0) | ✅ 2026-03-18 |
| 17 | Instagram token exchange + OAuth hardening | ✅ 2026-03-22 |
| 18 | Instagram direct publish (bypasses n8n) | ✅ 2026-03-22 |
| 19 | Facebook direct publish (Graph API) | ✅ 2026-03-22 |
| 20 | Shopier integration (REST API v1, jobs queue, webhooks) | ✅ 2026-03-23 |

### Social Media Channel Scaffolds (code complete, not yet live):
- [x] X (Twitter) — scaffold + OAuth callback + n8n stub
- [x] Facebook Page — scaffold + n8n stub (real publish via Step 19)
- [x] LinkedIn — scaffold + OAuth callback + n8n stub
- [x] Threads — scaffold + n8n stub

---

## 🔜 IMMEDIATE — Step 21: Shopier Order Fulfillment

### Step 21 — Shopier Order → Payload Order Flow (NEXT PRIORITY)
1. [ ] Parse `order.created` webhook body → create `Order` document in Payload CMS
2. [ ] Decrement `products.stockQuantity` for each ordered item
3. [ ] Send Telegram notification with customer name, items, and total
4. [ ] Handle `order.fulfilled` → update Payload order status
5. [ ] Handle `refund.requested` / `refund.updated` → update order + optional Telegram alert

### Mentix — Real Ops Tests (ongoing)
1. [ ] Product intake test — photo + caption + `@Mentix bunu ürüne çevir` → verify full pipeline
2. [ ] Debug test — `@Mentix bu ürünün veri akışını debug et` → verify product-flow-debugger
3. [ ] Add `DATABASE_URI` to OpenClaw Docker env (needed for sql-toolkit)
4. [ ] Add `GITHUB_TOKEN` to OpenClaw Docker env (needed for github-workflow)

---

## ⏭️ NEXT — Remaining Phase 2B

### Instagram Carousel Posts
- [ ] Multi-image products → `media_type=CAROUSEL` + children array
- [ ] Extend `publishInstagramDirectly()` in channelDispatch.ts

### X (Twitter) — Real Integration
- [ ] X API v2 POST /2/tweets + OAuth 2.0 PKCE token exchange
- [ ] Token refresh automation (tokens expire ~2hr, refresh valid 6mo)

### LinkedIn — Real Integration
- [ ] LinkedIn Marketing API POST /rest/posts
- [ ] Decide: personal vs organization/company page posting

### Threads — Real Integration
- [ ] Threads API /{user_id}/threads + publish
- [ ] Reuses Meta App credentials

### Dolap — Research Required
- [ ] No public API found yet — research needed before committing
- [ ] Stub workflow exists: `n8n-workflows/stubs/channel-dolap.json`

---

## 📅 LATER — Phase 2C: Content Growth Layer

### AI SEO Blog Engine
- [x] BlogPosts collection scaffolded (2026-03-15)
- [ ] n8n workflow: active product + generateBlog flag → AI prompt → BlogPosts
- [ ] Blog post template: product-centered, natural language, Turkish
- [ ] Duplicate prevention: check if blog exists for product
- [ ] `autoGenerateBlog` / `autoPublishBlog` toggles

### Blog Frontend
- [ ] `/blog` listing page
- [ ] `/blog/[slug]` detail page
- [ ] SEO meta tags from BlogPosts fields
- [ ] Internal linking to product pages

---

## 📅 FUTURE — Phase 3: Visual & Experience

### Visual Expansion Engine
- [ ] 2–4 AI-generated additional product angles
- [ ] Prompt library: `/ai-knowledge/prompts/product-visuals/`
- [ ] Per-family angle prompts (shoes, wallets, bags)
- [ ] Media type tracking: original / enhanced / generated_angle

### Photo-Based AI Try-On
- [ ] "Kendi fotoğrafında dene" button on product pages
- [ ] Upload validation, AI try-on, result gallery
- [ ] Privacy: auto-delete user photos after processing
- [ ] Provider selection needed (external VTO vs custom)

---

## 📅 FUTURE — Mentix Skill Stack Expansion

**Level A (active from day 1):** skill-vetter, browser-automation, sql-toolkit, agent-memory, github-workflow, uptime-kuma, product-flow-debugger
**Level B (controlled activation):** eachlabs-image-edit, upload-post, research-cog, senior-backend
**Level C (observe-only):** learning-engine

### VPS Operator Actions (pending):
- [ ] Deploy 12 skill files to VPS
- [ ] Deploy mentix-memory/ system
- [ ] Configure OpenClaw env vars (DATABASE_URI, GITHUB_TOKEN)
- [ ] Test Level A skills individually via Telegram

---

## 🔧 CLEANUP (non-blocking)
- [ ] Add favicon.ico
- [ ] Re-implement admin dark mode without `!important` overrides
- [ ] Switch `push: true` to Payload migrations
- [ ] Update `ai-knowledge/automation/vps-infrastructure.md` — Docker network fix listed as unresolved but is done
- [ ] Remove or update static products array from UygunApp.jsx
