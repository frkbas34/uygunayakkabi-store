# PROJECT STATE — Uygunayakkabi

_Last updated: 2026-03-29 (Step 25 IN PROGRESS — 5 approaches tried and rejected by user; fundamental pipeline redesign needed)_

## Current Status

**Phase 1 COMPLETE** (2026-03-13) — Storefront, admin panel, and core integrations live.
**Phase 2 Steps 1–19 COMPLETE** (2026-03-22) — Instagram and Facebook direct publishing via Graph API fully operational. Mentix intelligence layer deployed with 13 skills on VPS.
**Step 20 COMPLETE** (2026-03-23) — Shopier marketplace integration fully live. Non-blocking jobs queue pipeline, GitHub Actions 5-min cron, 4 registered webhooks with HMAC verification.
**Step 21 COMPLETE** (2026-03-23) — Shopier order fulfillment flow live. Incoming orders create Payload CMS Order documents. Status updates on fulfilled/refund events. End-to-end verified.
**Steps 22–24 COMPLETE** (2026-03-28) — Full Telegram bot product intake (direct webhook, no OpenClaw/n8n), AI image generation pipeline with Gemini Vision + Gemini Flash image generation. All bugs resolved and verified deployed.

---

## What Is Working

### Storefront
- Next.js customer-facing site with Payload CMS integration
- Product catalog fully functional
- Paytr payment integration live
- Image hosting via Cloudinary

### Admin Panel
- Payload CMS editorial interface
- Product creation/editing with media upload
- Dispatch review panel with direct publish controls
- Admin dashboard with analytics

### Automation Pipeline (UPDATED 2026-03-28)
- ~~OpenClaw → n8n → Payload~~ **REPLACED** by direct Telegram webhook
- Telegram photo → `POST /api/telegram` → Payload Media + Product (direct, no VPS dependency)
- `X-Telegram-Bot-Api-Secret-Token` verified on all incoming requests
- Bot privacy mode OFF — receives all group messages including plain photos
- Duplicate guard working
- Admin review step before publish
- `#gorsel` command triggers AI image generation pipeline

### Instagram/Facebook Publishing
- **Instagram Direct Publish** — `src/lib/channelDispatch.ts::publishInstagramDirectly()`
  - Bypasses n8n entirely
  - Creates container + publishes media via Graph API
  - Returns `instagramPostId`, caption with dynamic hashtags
  - Verified live on @uygunayakkabi342026 (2026-03-22)

- **Facebook Page Direct Publish** — `src/lib/channelDispatch.ts::publishFacebookDirectly()`
  - Uses Page Access Token (not user token)
  - Posts to UygunAyakkabı page (`1040379692491003`)
  - Verified with facebookPostId `122093848160884171` (2026-03-22)

### Mentix Intelligence Layer
- **13 skills deployed** on VPS (Hetzner 2-CPU)
- All Mentix skills active and responding
- Ops group created with full mention-trigger capability
- Bahriyar added as 3rd authorized user (security rotation complete)

---

## Collections & Schema

### Products
- Fields: id, title, price, originalPrice, brand, category, color, description, images, dispatchStatus
- Dispatch lifecycle: draft → dispatched (with publishResult metadata)
- Images stored via Cloudinary integration

### Brands & Categories
- Collections exist in schema but **remain empty** — manual population needed
- Will drive product filtering and dynamic hashtag generation

### Dispatch Targets (`products_channel_targets`)
- **Migration 2026-03-17**: `id` column changed from `varchar` to `SERIAL`
- Stores: productId, channelId, dispatchedAt, dispatchNotes, publishResult
- PublishResult schema includes mode (direct/webhook), success flag, and channel-specific IDs

---

## Database (Neon PostgreSQL)

### Current Schema
- `products` — main product catalog
- `products_channel_targets` — dispatch history and results
- `automation_settings` — global config (Instagram tokens, Facebook page ID, etc.)
- `users`, `accounts`, `sessions` — Payload CMS auth

### Migration History
| Date | Migration | Change |
|------|-----------|--------|
| 2026-03-17 | `products_channel_targets` | Converted `id` from `varchar` to `SERIAL` for stability |
| 2026-03-23 | `orders` | Added `shopier_order_id VARCHAR` column |
| 2026-03-23 | `enum_orders_source` | Added `shopier` enum value via `ALTER TYPE ... ADD VALUE` |
| 2026-03-23 | `payload_jobs` | Created manually (push:true unreliable in serverless) |
| 2026-03-23 | `products` | Added 5 `source_meta_shopier_*` columns manually |

### Known Issues
- Brands/Categories collections unpopulated
- Dolap integration stub only; no real API calls executed

---

## Production Environment (Vercel)

### Key Environment Variables
| Variable | Value | Usage |
|----------|-------|-------|
| `NEXT_PUBLIC_CMS_URL` | `https://cms.uygunayakkabi.com` | Payload CMS endpoint |
| `PAYLOAD_SECRET` | Set in Vercel | Encryption for CMS payloads |
| `INSTAGRAM_APP_ID` | `1452165060016519` | Meta OAuth client ID |
| `INSTAGRAM_APP_SECRET` | Set in Vercel | Meta OAuth secret |
| `INSTAGRAM_USER_ID` | `43139245629` | Instagram Business Account ID |
| `INSTAGRAM_PAGE_ID` | `1040379692491003` | **Facebook Page ID** (UygunAyakkabı) — corrected 2026-03-22 |
| `NEXT_PUBLIC_N8N_WEBHOOK_INSTAGRAM` | Set in Vercel | Fallback webhook (not primary path) |
| `NODE_ENV` | `production` | Guards: `push: true` blocks, logging, etc. |

### Step 20 — Shopier Integration (VERIFIED WORKING — 2026-03-23)
| Component | Status |
|-----------|--------|
| `src/lib/shopierApi.ts` | IMPLEMENTED — Shopier REST API v1 client, Bearer JWT auth |
| `src/lib/shopierSync.ts` | IMPLEMENTED — product mapping, jobs queue orchestration |
| `src/app/api/webhooks/shopier/route.ts` | IMPLEMENTED — HMAC-SHA256 multi-token verification |
| `src/app/api/payload-jobs/run/route.ts` | IMPLEMENTED — jobs runner endpoint |
| `.github/workflows/process-jobs.yml` | IMPLEMENTED — cron `*/5 * * * *`, calls jobs runner |
| `payload_jobs` table | MANUALLY CREATED in Neon (push:true unreliable in serverless) |
| `source_meta_shopier_*` (5 columns on products) | MANUALLY CREATED in Neon |
| 4 Shopier webhooks | REGISTERED — order.created, order.fulfilled, refund.requested, refund.updated |
| Product 11 smoke test | VERIFIED SYNCED — Shopier ID `45456186` |
| Webhook sig verification | VERIFIED — valid sig → 200, bad sig → 401 |

### Key Env Vars (Step 20)
| Variable | Purpose |
|----------|---------|
| `SHOPIER_PAT` | Shopier REST API Bearer JWT |
| `SHOPIER_WEBHOOK_TOKEN` | Comma-separated HMAC tokens (one per webhook registration) |

### Deployment Status
- **Vercel deployment**: v8 pending push (2026-03-29) — OpenAI-first strict pipeline: input validation, structured identity lock, no silent Gemini fallback, per-slot logs
- **Custom domain**: `uygunayakkabi.com` (CNAME configured)

### Instagram OAuth Routes
- `GET /api/auth/instagram/initiate` — Starts Meta consent flow
- `GET /api/auth/instagram/callback` — Exchanges code for tokens, stores in Payload CMS
- Scopes: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
- Long-lived token expires ~2026-05-20

---

## VPS Infrastructure (Hetzner)

### Mentix Skills
All deployed and operational:
1. mentix-intake-v3 (OpenClaw → Telegram integration)
2. 12 additional operator-facing skills

### n8n Workflows
- `channel-instagram-real.json` — Instagram publish (now fallback only)
- `channel-dispatch-webhook.ts` — Main entry point for product dispatch

### Docker Network
- Persistence configured for Telegram bot state
- Operator allowlist: Furkan + Sabri + Bahriyar

---

## Instagram/Facebook Credentials

### Instagram
| Config | Value | Location | Notes |
|--------|-------|----------|-------|
| User ID | `43139245629` | Vercel env + Payload CMS | Business Account ID |
| Access Token | `EAAUovIaOuYc...` | Payload CMS `automation-settings.instagramTokens.accessToken` | Long-lived (~60 days) |
| Token Expiry | 2026-05-20 | Payload CMS `automation-settings.instagramTokens.expiresAt` | Refresh via `/api/auth/instagram/initiate` |
| App ID | `1452165060016519` | Vercel env | Meta developer app |
| Username | `@uygunayakkabi342026` | Instagram | Professional account |

### Facebook Page (UygunAyakkabI)
| Config | Value | Notes |
|--------|-------|-------|
| Page ID | `1040379692491003` | **Correct Graph API ID** — stored as `INSTAGRAM_PAGE_ID` |
| Legacy ID | `61576525131424` | Old NPE profile ID (non-functional with Graph API) |
| Page Type | New Pages Experience (NPE) | Requires page-token fallback for publish |
| Access Token | Derived from OAuth flow | Obtained via GET `/{pageId}?fields=access_token` |

### Token Refresh Process
To refresh Instagram token: navigate to `https://uygunayakkabi.com/api/auth/instagram/initiate`, approve Meta consent, callback automatically updates Payload CMS.

---

## Known Constraints

### Instagram Publishing
- Direct Graph API used exclusively; n8n webhook available only as fallback
- Long-lived token valid ~60 days, then requires manual refresh

### Facebook Publishing
- Requires page-token obtained from Graph API (not user token)
- New Pages Experience (NPE) pages require correct numeric ID (`1040379692491003`)
- Posts to page only, not user timeline

### Automation
- `push: true` in dispatch does NOT execute in production (`NODE_ENV === 'production'` guard)
- Telegram group allowlist: Furkan, Sabri, Bahriyar only
- Duplicate guard checks for products with same title within 24 hours

### Collections
- Brands and Categories empty — must be manually populated for optimal filtering/metadata
- Shopier and Dolap integrations stub-only; no real API calls executed

### n8n Environment Variables (Deprecated)
| Variable | Purpose | Status |
|----------|---------|--------|
| `INSTAGRAM_USER_ID` | Legacy n8n workflow | Not used (direct publish active) |
| `INSTAGRAM_ACCESS_TOKEN` | Legacy n8n workflow | Not used (direct publish active) |
| `N8N_CHANNEL_INSTAGRAM_WEBHOOK` | Fallback webhook URL | Available but not primary |

---

## Phase 1 Completion Record

**Completed 2026-03-13** — Storefront and admin infrastructure delivered.

### Deliverables
- Next.js storefront with Payload CMS backend
- Admin product management panel
- Image upload and media management (Cloudinary)
- Paytr payment integration
- Basic product schema with dispatch tracking

---

## Phase 2 Completion Record (Steps 1–19)

**Completed 2026-03-22** — Full Instagram and Facebook integration.

### Key Milestones
- **Steps 1–6** — n8n webhook scaffolding, Telegram integration, OpenClaw mentix skill
- **Steps 7–8** — Payload global automation settings, Instagram OAuth foundation
- **Steps 9–11** — Duplicate guard, media attachment, admin review panel
- **Steps 12–15** — Mentix deployment v2, 13 skills live, security rotation
- **Steps 16–17** — Instagram real integration, OAuth token exchange (long-lived)
- **Steps 18–19** — Instagram direct Graph API publish (bypass n8n), Facebook direct publish

### Systems Verified Live
- Telegram mention → draft product → admin review → direct publish to Instagram/Facebook
- End-to-end tested with real posts (Instagram ID `18115629052647099`, Facebook ID `122093848160884171`)

---

## Deferred / Cleanup Items

- **Brands & Categories** — Empty collections; manual population needed
- **Dolap** — Stub only, no real API integration; ready for future development
- **n8n Instagram workflow** — Superseded by direct Graph API, kept as reference
- **Phase 1 cleanup** — Reusable design system components (deferred to Phase 3)

## Step 21 — Shopier Order Fulfillment (VERIFIED WORKING — 2026-03-23)
| Component | Status |
|-----------|--------|
| `Orders.ts` | `shopierOrderId` field added, `shopier` source option added |
| `enum_orders_source` | `shopier` added via SQL — MANUALLY APPLIED to Neon |
| `orders.shopier_order_id` column | MANUALLY CREATED in Neon |
| `order.created` webhook | Creates Payload Order document with customer info + product link |
| `order.fulfilled` webhook | Updates Order status → `shipped` |
| `refund.requested` webhook | Updates Order status → `cancelled`, appends refund ID to notes |
| Idempotency guard | Skips duplicate orders (checks `shopierOrderId` before create) |
| Product auto-link | Matches `sourceMeta.shopierProductId` to local product |
| Smoke test | Order `SIM-ORDER-21-001` created in Neon — id=1, ORD-861452 ✅ |

---

## Steps 22–24 — Telegram Bot + AI Image Generation (VERIFIED WORKING — 2026-03-28)

### Architecture Change (Step 22): Direct Telegram Webhook (n8n/OpenClaw REMOVED from intake)
| Component | Status | Notes |
|-----------|--------|-------|
| `src/app/api/telegram/route.ts` | IMPLEMENTED | Direct Payload CMS webhook handler — no n8n/OpenClaw dependency |
| Photo intake | VERIFIED WORKING | Receives photo → downloads from Telegram → uploads to Vercel Blob → creates Media + Product |
| `TELEGRAM_BOT_TOKEN` | SET in Vercel | Bot token used for all Telegram API calls |
| `TELEGRAM_WEBHOOK_SECRET` | SET in Vercel | `X-Telegram-Bot-Api-Secret-Token` header verified on all incoming requests |
| Telegram group privacy mode | VERIFIED OFF | Disabled via BotFather — bot receives plain photos without @mention |
| Webhook registration | VERIFIED | Registered with `secret_token` parameter to match `TELEGRAM_WEBHOOK_SECRET` |

### Bug Fixes Applied and Verified (2026-03-28)
| Bug | Root Cause | Fix | Status |
|-----|-----------|-----|--------|
| Bot not receiving plain photos | Telegram group privacy mode ON | Disabled via BotFather `/mybots → Group Privacy → Turn Off` | VERIFIED FIXED |
| All `/api/telegram` calls → 401 | Webhook registered without `secret_token` but env var set | Re-registered webhook with matching `secret_token` via JS console | VERIFIED FIXED |
| "Satış Fiyatı zorunludur" on Telegram product create | `validate()` on price field didn't include `telegram` source | Added `data?.source === 'telegram'` bypass in `Products.ts` | VERIFIED FIXED |
| "Hiç görsel üretilemedi" (no images generated) | `GEMINI_FLASH_MODEL` set to `gemini-2.0-flash-exp-image-generation` (404) | Changed env var to `gemini-2.5-flash-image` in Vercel | VERIFIED FIXED |
| Generated images = completely wrong product | `gemini-2.5-flash-image` is text-to-image only — ignores image input | Two-step vision pipeline: Gemini Vision describes product → text prompt drives generation | VERIFIED DEPLOYED |

### Step 24 — AI Image Generation Pipeline (IMPLEMENTED — 2026-03-28)
| Component | File | Status |
|-----------|------|--------|
| Image generation task | `src/jobs/imageGenTask.ts` | IMPLEMENTED — Payload Jobs queue task |
| Vision analysis step | `describeProductImage()` in imageGenTask.ts | IMPLEMENTED — calls `gemini-2.5-flash` (vision) to describe product photo |
| Prompt builder | `src/lib/imagePromptBuilder.ts` | IMPLEMENTED — 5 concept prompts, uses `visualDescription` when available |
| Image providers | `src/lib/imageProviders.ts` | IMPLEMENTED — Gemini Flash (hizli), GPT Image (dengeli), Gemini Pro (premium), Karma |
| ImageGenerationJobs collection | `src/collections/ImageGenerationJobs.ts` | IMPLEMENTED |
| Telegram `#gorsel` command | `src/app/api/telegram/route.ts` | IMPLEMENTED — triggers image gen job |

### AI Image Generation — Key Architecture Decisions

#### Step 25 — Full Attempt History (2026-03-28 → 2026-03-29)

**User requirement (explicit):** Generated images must show the EXACT SAME shoe from the Telegram photo — different angles/scenes/compositions. NOT "just changing the background."

**Approach v1 — `fit:contain` at 1024×1024 (commit `ece33d2`)**
- Resize reference image to 1024×1024 with `fit:contain` (letterboxing for non-square)
- Result: Square shoe photos get ZERO padding → all 5 output images identical to original
- User outcome: "it's not generating at all" (images looked unchanged)
- Status: ❌ REJECTED — invisible on square photos

**Approach v2 — `fit:inside` 800×800 + `extend(112px)` (commit `8f866b2`)**
- Resize to 800×800 `fit:inside` then extend with 112px border on all sides → guaranteed 1024×1024 with visible border
- Result: Shoe visible with colored border, but all 5 images = same shoe same angle
- User outcome: "it s only changing the background. I don't want that"
- Status: ❌ REJECTED — user wants different compositions, not just colored borders

**Approach v3 — ML background removal + solid color fills (commit `0b4cbd3`)**
- `@imgly/background-removal` (isnet_quint8 model) strips shoe from background → transparent PNG
- Resize cutout to 780×780, composite centred onto 5 different solid-color 1024×1024 canvases (white, cream, charcoal, marble-grey, warm-beige)
- Result: Clean shoe cutout on 5 different background colors
- User outcome: "it s only cyhanging the background. ! ı dont want that" (repeated, emphatic)
- Status: ❌ REJECTED — user explicitly does not want background color changes

**Approach v4 — ML background removal + Gemini-generated scene backgrounds (commit `d2994b3`)**
**CURRENT DEPLOYED STATE** (as of 2026-03-29)
- `@imgly/background-removal` strips shoe → transparent cutout (780×780)
- For each of 5 scenes: call Gemini Flash to generate a realistic background image (white studio, cream backdrop, dark charcoal, marble surface, oak floor with bokeh)
- Composite shoe cutout centred onto generated background → JPEG output
- Falls back to solid color if Gemini background generation fails
- Result: Shoe on 5 different AI-generated scene backgrounds — but still same shoe, same angle, same direction
- User outcome: same rejection — "only changing the background"
- Status: ❌ REJECTED — fundamental problem unresolved

**Root cause identified:**
All approaches above share the same flaw: they take the original shoe photo at its original angle and paste/composite it onto different backgrounds. The user wants **different camera angles and compositions** (front view, side view, close-up texture, tabletop shot, lifestyle worn shot) — not the same photo on different backgrounds.

**What's needed (NOT YET IMPLEMENTED):**
An AI model that can take a reference shoe photo and genuinely **reconstruct it in 5 different poses/angles/scenes** while maintaining exact visual fidelity (same design, color, sole, details). This requires either:
1. A model with true image-editing capability (not text-to-image)
2. gpt-image-1 `/v1/images/edits` with stronger prompting (PARTIALLY IMPLEMENTED — commit `196c419` — not yet verified effective)
3. Stability AI ControlNet (shape-conditioned generation)
4. Fine-tuning / DreamBooth style subject preservation

#### Current Architecture — v8 (2026-03-29)

**ARCHITECTURE CHANGE: OpenAI-first, strict product-preserving pipeline.**

Pipeline A is now the ONLY path when a reference image exists.
No silent Gemini fallback when Pipeline A fails — failure is explicit.

```
STEP A — Input Validation (NEW)
  validateProductImage() in imageProviders.ts
  - Calls Gemini Vision to classify if image is a valid shoe/footwear photo
  - If invalid → job status='failed', Telegram rejection message, no generation
  - If validation API fails → defaults to valid=true (don't block on transient errors)

STEP B — Identity Lock Extraction (NEW — replaces describeProductImage)
  extractIdentityLock() in imageProviders.ts
  - Calls Gemini Vision to extract STRUCTURED identity: productClass, mainColor,
    accentColor, material, toeShape, soleProfile, heelProfile, closureType, distinctiveFeatures
  - Builds a formatted promptBlock with MUST NOT ALTER constraints for each field
  - On extraction failure → minimal fallback lock block used

STEP C — Pipeline A: OpenAI gpt-image-1 editing (PRIMARY + ONLY reference-image path)
  generateByEditing(referenceBuffer, mime, identityLockBlock) in imageProviders.ts
  - sharp converts photo to PNG 1024×1024 (fit:contain, white bg)
  - For each of 5 scene slots (sequential, 1 retry each, 1s between slots):
      fullPrompt = identityLockBlock + scene.sceneInstructions
      callGPTImageEdit(pngBuffer, fullPrompt, apiKey) — quality: 'medium'
      Convert result to JPEG q92
  - Returns buffers + slotLogs (per-slot: slot, attempts, success, outputSizeBytes)
  - If 0 images → job fails explicitly. NO Gemini fallback.

EDITING_SCENES v8 (5 physically distinct slots — each has FORBIDDEN list):
  slot 1 commerce_front      → dead-straight front, camera at lacing height, white bg,
                                toe+vamp+laces visible, NO side profile
  slot 2 side_angle          → EXACTLY 90° lateral, camera at sole level, cream bg,
                                full sole profile, heel on right, NO toe front
  slot 3 detail_closeup      → 15-20cm macro, 20-30° down, shallow DoF, raking sidelight,
                                texture/stitching sharp, NO wide shot
  slot 4 tabletop_editorial  → 55-65° overhead, marble surface, window light upper-left,
                                top face of shoe visible, Scandi editorial style
  slot 5 worn_lifestyle      → ground-level (10-15cm), one foot wearing shoe, bokeh bg,
                                golden light, NO face/body, NOT studio

PIPELINE B — Text-to-image fallback (DEGRADED PATH — only when no reference image)
  - Trigger: referenceImage = undefined (literally no product photo exists)
  - Flow: productContext text → buildPromptSet() → generateByMode()
  - Logged as 'Pipeline B — text-to-image, product identity not guaranteed'
  - NOT triggered when Pipeline A fails with a reference image (fail explicitly instead)

KEY IMPROVEMENTS in v8 vs v7:
  - Input validation gate: non-shoe images rejected before generation
  - Structured identity lock: 9-field extraction vs. single-sentence description
  - identityLockBlock now includes field-specific MUST NOT constraints (color, material, etc.)
  - No silent Gemini fallback when Pipeline A fails with reference image
  - slotLogs returned per slot: attempts, success, outputSizeBytes, rejectionReason
  - Telegram notification includes per-slot status icons (✅/❌)
  - describeProductImage() removed — replaced by extractIdentityLock() in imageProviders.ts
  - TypeScript: VERIFIED compiles clean (tsc --noEmit, 2026-03-29)
```

#### Pipeline B: Text-to-Image Fallback (DEGRADED — no reference image only)
- **Trigger**: `referenceImage === undefined` — product has no photo attached
- **Flow**: `productContext` text → `buildPromptSet()` → `generateByMode()`
- **Providers**: Gemini Flash (#hizli), GPT Image (#dengeli), Gemini Pro (#premium), Karma
- **Known limitation**: Text-to-image cannot guarantee exact product reproduction
- **CHANGED**: No longer triggered when Pipeline A fails with a reference image — failure is explicit

#### Key Technical Findings (2026-03-28 → 2026-03-29 session)
- **`/v1/images/edits` with gpt-image-1**: Requires `image[]` field name (NOT `image`). Using `image` returns 400 "Value must be 'dall-e-2'"
- **OpenAI Responses API (`/v1/responses`) with `image_generation` tool**: Does NOT do true editing — generates loosely inspired new images. NOT suitable for product fidelity.
- **`response_format: 'b64_json'`**: NOT a valid parameter for gpt-image-1 `/v1/images/generations` — causes 400 "Unknown parameter". Removed.
- **OPENAI_API_KEY**: Rotated 2026-03-28 (old key expired/401). Updated via Vercel internal API.
- **`gemini-2.0-flash-exp-image-generation`**: DEPRECATED — returns 404, not available in models list
- **Gemini image models ignore `inlineData`**: All Gemini image models are text-to-image only
- **`@imgly/background-removal-node`**: FAILED to install (requires its own sharp binary download, blocked by sandbox proxy). Universal version installed but approach ABANDONED.
- **Square photo problem**: `fit:contain` at 1024×1024 adds zero padding to square photos — all 5 outputs look identical to original
- **Compositing approach ABANDONED**: User explicitly rejected ALL background-swap approaches. Commit `b668ac4` removed all compositing code and switched to gpt-image-1 AI editing

#### Git Workaround (RECURRING)
- Workspace repo has persistent `index.lock` preventing direct git operations
- All git operations use temp clone at `/tmp/imgfix_tmp` with GitHub remote
- Remote: `https://ghp_***@github.com/frkbas34/uygunayakkabi-store.git`
- Commit config: `-c user.name="Yavuz" -c user.email="y.selimbulut38@gmail.com"`

### Environment Variables — Current Production State (Vercel)
| Variable | Value / Notes | Status |
|----------|--------------|--------|
| `GEMINI_API_KEY` | Set in Vercel | ACTIVE |
| `GEMINI_FLASH_MODEL` | `gemini-2.5-flash-image` | CORRECTED 2026-03-28 |
| `GEMINI_PRO_MODEL` | `imagen-4.0-ultra-generate-001` | ACTIVE |
| `OPENAI_API_KEY` | Rotated 2026-03-28 | ACTIVE — new key set via Vercel internal API (env ID `764gO7z42RX0uvI0`) |
| `TELEGRAM_BOT_TOKEN` | Set in Vercel | ACTIVE |
| `TELEGRAM_WEBHOOK_SECRET` | Set in Vercel | ACTIVE — must match webhook `secret_token` registration |
| `AUTOMATION_SECRET` | Set in Vercel | ACTIVE |

### Telegram Command Reference (VERIFIED WORKING)
| Command | Action |
|---------|--------|
| Send photo | Creates draft product with photo |
| `bunu ürüne çevir` + reply to photo | Converts photo to product |
| `#gorsel` / `#gorsel <id>` | Triggers AI image generation for last/specified product |
| `#gorsel #hizli` | Gemini Flash (fast) |
| `#gorsel #dengeli` | GPT Image (falls back to Gemini Flash) |
| `#gorsel #premium` | Gemini Pro / Imagen 4 Ultra |
| `#gorsel #karma` | All providers (hybrid) |

---

## Recommended Next Steps

**Step 25 — AI Product Photography Pipeline (IN PROGRESS — awaiting v8 test results)**
- v8 deployed: input validation gate, structured 9-field identity lock, strict 5-slot prompts, no silent Gemini fallback, per-slot slotLogs
- **NEXT ACTION**: Test with `#gorsel #dengeli` on a real shoe product — score each of 5 outputs
- **If Case A** (different compositions + shoe preserved): Step 25 DONE → move to Step 26
- **If Case B** (shoe preserved, compositions still weak): add explicit "DO NOT repeat reference angle" to each slot
- **If Case C** (compositions change, fidelity drifts): evaluate Stability AI ControlNet or fal.ai IP-Adapter
- **If Case D** (still same-angle outputs): gpt-image-1 editing insufficient — provider decision needed

**Step 22b — Shopier stock decrement / InventoryLogs on order**
- On `order.created`: decrement product stock, create InventoryLog entry
- Or: Telegram notification to ops group for manual stock management

**Instagram token refresh**
- Long-lived token expires ~2026-05-20
- Consider: n8n scheduled refresh OR System User token (no expiry)
