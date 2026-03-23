# TASK QUEUE — Uygunayakkabi

_Last updated: 2026-03-23 (Consolidated — Steps 1-20 complete)_

---

## ⚠️ Active Blockers

### Blocker 0: push:true Does NOT Run in Production — ONGOING RISK
`push: true` is guarded by `NODE_ENV !== 'production'` in `@payloadcms/db-postgres/dist/connect.js`.
**All schema changes on Neon MUST be applied manually via SQL.**
Before adding any new collection/global: manually verify the new table + `payload_locked_documents_rels` column exist in Neon after deploy.

---

## 🟢 NOW — Current Sprint

### Step 21 — Shopier Order → Payload Order Flow
1. Parse `order.created` webhook body → create `Order` document in Payload CMS
2. Decrement `products.stockQuantity` for each ordered item
3. Send Telegram notification with customer name, items, and total
4. Handle `order.fulfilled` → update Payload order status
5. Handle `refund.requested` / `refund.updated` → update order + optional Telegram alert

### Mentix — Real Ops Testing
1. Product intake test — photo + caption + `@Mentix bunu ürüne çevir` → verify draft product created
2. Debug test — `@Mentix bu ürünün veri akışını debug et` → verify product-flow-debugger traces 13-step flow
3. Add `DATABASE_URI` + `GITHUB_TOKEN` to OpenClaw Docker env (`/opt/openclaw/docker-compose.yml`)
4. Restart OpenClaw, verify skill recognition

---

## 🔜 NEXT — After Current Sprint

### Instagram Carousel Posts
- When `mediaUrls.length > 1`, publish all images as carousel
- Graph API: create child containers → `media_type=CAROUSEL` + `children[]`
- Update `publishInstagramDirectly()` in `channelDispatch.ts`

### Token Expiry Monitoring
- Instagram long-lived token expires ~2026-05-20
- Options: implement n8n scheduled refresh OR switch to System User token (no expiry)
- Manual fallback: visit `https://uygunayakkabi.com/api/auth/instagram/initiate`

### D-056–D-059 Duplicate ID Cleanup
- DECISIONS.md has two definitions each for D-056, D-057, D-058, D-059
- Later definitions take precedence by file position (low operational risk)
- Needs a renumbering pass when time permits

---

## 📋 LATER — Planned but Not Scheduled

### Phase 2B Remaining Channels

**Dolap Integration:**
- Research Dolap API availability (no public docs found yet)
- Stub workflow exists: `n8n-workflows/stubs/channel-dolap.json`
- `publishDolap` toggle already scaffolded

**X (Twitter) Integration:**
- Scaffold complete (SupportedChannel, env var, toggle, OAuth callback, n8n stub)
- Real integration needs: X API v2 POST /2/tweets + OAuth 2.0 PKCE
- Token refresh: access ~2hr, refresh ~6mo

**LinkedIn Integration:**
- Scaffold complete (same as X)
- Real integration needs: LinkedIn Marketing API POST /rest/posts
- Decide: personal vs organization page posting

**Threads Integration:**
- Scaffold complete (same as X)
- Real integration needs: Threads API /{user_id}/threads
- Reuses same Meta App as Instagram

### Phase 2C — Content Growth Layer

**AI SEO Blog Engine:**
- BlogPosts collection scaffolded (2026-03-15)
- Needs: n8n workflow or direct generation from Payload
- Needs: `/blog` + `/blog/[slug]` frontend routes
- Needs: SEO meta tags, internal linking to product pages

### Phase 3 — Visual & Experience

**Visual Expansion Engine:**
- AI-generated additional product angles (2-4 per product)
- Needs: provider selection (EachLabs? Stability AI? Custom?)
- Needs: media type tracking (original / enhanced / generated_angle)

**Photo-Based AI Try-On (D-093):**
- Product page widget: "Kendi fotoğrafında dene"
- UX layer only — no data model changes needed
- Needs: provider selection + privacy (auto-delete user photos)

---

## 🚫 BLOCKED — Waiting on External

### Dolap API Research
- **Blocked on**: finding official API documentation or seller integration
- Cannot proceed without confirmed API access

### Mentix Level B Skills Activation
- **Blocked on**: Level A skills being ops-tested first (see NOW section)
- Skills waiting: eachlabs-image-edit, upload-post, research-cog, senior-backend

### Learning Engine (Mentix)
- **Blocked on**: 7+ days of Level A operation data
- Observe-only mode, then weekly reports + golden case regression (GC-001, GC-002, GC-003)

---

## ⏳ WAITING FOR INPUT — Operator Actions

### VPS / n8n Operator Actions
- [ ] Deploy 12 Mentix skill files to VPS: `scp -r mentix-skills/* furkan@VPS:/home/furkan/.openclaw/skills/`
- [ ] Deploy mentix-memory/ system to VPS
- [ ] Add `DATABASE_URI` + `GITHUB_TOKEN` to OpenClaw Docker env
- [ ] Restart OpenClaw and verify skill recognition
- [ ] Test Level A skills individually via Telegram

### Deferred Cleanup (Non-Blocking)
- [ ] Add favicon.ico to `src/app/`
- [ ] Re-implement admin dark mode without `!important` overrides
- [ ] Switch `push: true` to Payload migrations (recommended before Phase 3)
- [ ] Promote `publishResult.instagramPostId` to `sourceMeta.externalSyncId` field

---

## ✅ COMPLETED — Reference Only

<details>
<summary>Phase 1 — Core Admin + Storefront (2026-03-10 → 2026-03-13) ✅</summary>

All Phase 1 production validation tasks passed. See PROJECT_STATE.md Phase 1 Completion Record.
Infrastructure, collections, schema, storefront — all validated in production.
</details>

<details>
<summary>Phase 2A — Steps 1-15 (2026-03-15 → 2026-03-16) ✅</summary>

- Step 1: Security rotation
- Step 2: Persistent Docker network fix
- Step 3: Telegram group access policy
- Step 4: OpenClaw → n8n intake webhook
- Step 5: n8n → Payload draft product creation
- Step 6: Media pipeline (Telegram → Vercel Blob → Payload)
- Step 7: Duplicate protection / idempotency
- Step 8: Admin review / approval flow (SourceBadge, StatusCell, ReviewPanel)
- Step 9: Inventory / variant readiness (stockQuantity, color, TG-SKU)
- Step 10: Publishing flow / commerce activation (draft → active guard)
- Step 11: Caption parser enhancement (Turkish/English, confidence, warnings)
- Step 12: Automation settings / global toggle layer
- Step 13: Channel adapter scaffolding (channelDispatch.ts)
- Step 14: Channel workflow stubs + admin dispatch visibility
- Step 15: E2E verification pass + media URL hardening
</details>

<details>
<summary>Steps 16-20 (2026-03-18 → 2026-03-23) ✅</summary>

- Step 16: First real channel integration (n8n Instagram Graph API workflow)
- Step 17: Instagram token exchange + hardening (OAuth flow)
- Step 18: Instagram direct publish from Payload (n8n bypassed — D-088)
- Step 19: Facebook direct publish from Payload (Graph API — D-089)
- Step 20: Shopier integration (REST API v1, webhook HMAC, jobs queue, GitHub Actions cron)
</details>

<details>
<summary>Mentix Intelligence Layer — v1 + v2 Design ✅</summary>

- 13 skills designed and created (7 Level A + 4 Level B + 1 Level C + mentix-intake)
- mentix-memory/ 12-layer directory system
- Decision policy, write policy, publish policy, memory policy, skill gating policy
- 6 runbooks, 3 golden cases, trace schema
- Dashboard v2 (7-tab HTML)
- Governance: SYSTEM_PROMPT.md + MENTIX_SYSTEM_PROMPT.md
</details>

<details>
<summary>Channel Scaffolds ✅</summary>

- X (Twitter): scaffold + OAuth callback + n8n stub
- Facebook Page: scaffold + n8n stub (real integration live via Step 19)
- LinkedIn: scaffold + OAuth callback + n8n stub
- Threads: scaffold + n8n stub
</details>

<details>
<summary>Resolved Blockers ✅</summary>

- Blocker 1: Instagram credentials → OAuth completed (2026-03-22)
- Blocker 2: Mentix VPS deployment → resolved (2026-03-17)
- Blocker 3: Git push pending → resolved (2026-03-17)
- Blocker 4: Product save 500 (products_channel_targets) → id column fixed to SERIAL (2026-03-17)
- Blocker 5: Instagram publish error 100/33 → direct publish bypass (2026-03-22)
</details>
