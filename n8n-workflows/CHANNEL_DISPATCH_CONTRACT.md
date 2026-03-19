# Channel Dispatch Contract — Step 14

This document defines the dispatch payload contract between Payload CMS and n8n channel workflows. It serves as the single source of truth for the shape of data that flows from the product activation hook to the n8n stub (and eventually real) channel workflows.

---

## Trigger

The dispatch is fired by the `afterChange` hook in `src/collections/Products.ts` when:
- A product transitions from any non-active status → `status: 'active'`
- **OR** an admin sets `sourceMeta.forceRedispatch = true` and saves (manual re-dispatch)

The dispatch is **NOT** fired on:
- Initial product creation (`operation === 'create'`)
- Edits to an already-active product (unless `forceRedispatch` is set)
- Status transitions _away_ from active
- The sourceMeta write-back itself (guarded by `req.context.isDispatchUpdate`)

---

## Env Vars

Set in Vercel (or `.env.local` for dev):

| Variable | Channel | Example Value |
|---|---|---|
| `N8N_CHANNEL_INSTAGRAM_WEBHOOK` | Instagram | `https://flow.uygunayakkabi.com/webhook/channel-instagram` |
| `N8N_CHANNEL_SHOPIER_WEBHOOK` | Shopier | `https://flow.uygunayakkabi.com/webhook/channel-shopier` |
| `N8N_CHANNEL_DOLAP_WEBHOOK` | Dolap | `https://flow.uygunayakkabi.com/webhook/channel-dolap` |

If an env var is absent or empty, the dispatch for that channel is skipped with a `SCAFFOLD —` log entry. No error is thrown. This is safe to deploy before configuring n8n.

---

## Eligibility Gates

All three gates must pass for a channel to receive a dispatch:

1. **Product intent** — `product.channelTargets` array must include the channel name (e.g. `"instagram"`)
2. **Product flag** — `product.channels.publishInstagram` (or Shopier/Dolap) must not be `false`
3. **Global capability** — `AutomationSettings.channelPublishing.publishInstagram` must not be `false`

Website (`"website"`) is never dispatched — it is served natively via `status: active`.

---

## Payload Shape (`ChannelDispatchPayload`)

This is the exact JSON body POSTed to each channel webhook.

```typescript
type ChannelDispatchPayload = {
  channel: 'instagram' | 'shopier' | 'dolap'
  productId: string | number
  sku?: string
  title: string
  price: number
  originalPrice?: number
  brand?: string
  category?: string            // Günlük | Spor | Klasik | Bot | Sandalet | Krampon | Cüzdan
  productFamily?: string       // shoes | wallets | bags | belts | accessories
  productType?: string         // sneaker | loafer | bifold | etc.
  color?: string
  description?: string
  mediaUrls: string[]          // Vercel Blob URLs or /media/<filename> fallback
  channelTargets: string[]     // all declared channel targets on this product
  triggerReason: string        // e.g. "status-transition:draft→active product=42"
  dispatchTimestamp: string    // ISO 8601
  meta: {
    parseConfidence?: number   // 0-100 caption parser confidence score
    autoDecision?: string      // 'active' | 'draft' — what automation decided
    telegramMessageId?: string // Telegram message ID for traceability
    source?: string            // 'telegram' | 'n8n' | 'admin' | etc.
  }
}
```

---

## Sample Payload

```json
{
  "channel": "instagram",
  "productId": 42,
  "sku": "TG-NIK-9001",
  "title": "Nike Air Max 90 Siyah",
  "price": 2499,
  "originalPrice": 3200,
  "brand": "Nike",
  "category": "Spor",
  "productFamily": "shoes",
  "productType": "sneaker",
  "color": "Siyah",
  "description": "Klasik Nike Air Max 90 modeli, siyah-beyaz renk kombinasyonu.",
  "mediaUrls": [
    "https://abc123.public.blob.vercel-storage.com/nike-am90-black-1-Xf9K.jpg",
    "https://abc123.public.blob.vercel-storage.com/nike-am90-black-2-Yg8L.jpg"
  ],
  "channelTargets": ["website", "instagram"],
  "triggerReason": "status-transition:draft→active product=42",
  "dispatchTimestamp": "2026-03-16T10:30:00.000Z",
  "meta": {
    "parseConfidence": 85,
    "autoDecision": "active",
    "telegramMessageId": "9001",
    "source": "telegram"
  }
}
```

---

## Setting Up the Stub Workflows

### Step 1: Import to n8n

In n8n at `flow.uygunayakkabi.com`:

1. Go to **Workflows** → **Import from file**
2. Import each of these three files:
   - `n8n-workflows/stubs/channel-instagram.json`
   - `n8n-workflows/stubs/channel-shopier.json`
   - `n8n-workflows/stubs/channel-dolap.json`

### Step 2: Activate each workflow

After importing, **activate** each workflow (toggle at top right).

### Step 3: Copy the webhook URLs

Each activated workflow shows a webhook URL like:
```
https://flow.uygunayakkabi.com/webhook/channel-instagram
```

### Step 4: Set env vars in Vercel

Set in Vercel Dashboard → uygunayakkabi-store → Settings → Environment Variables:
```
N8N_CHANNEL_INSTAGRAM_WEBHOOK = https://flow.uygunayakkabi.com/webhook/channel-instagram
N8N_CHANNEL_SHOPIER_WEBHOOK   = https://flow.uygunayakkabi.com/webhook/channel-shopier
N8N_CHANNEL_DOLAP_WEBHOOK     = https://flow.uygunayakkabi.com/webhook/channel-dolap
```

Then **redeploy** (or use "Redeploy" button to pick up the new env vars).

---

## End-to-End Test Checklist

1. Create a test product via the automation endpoint (or Telegram intake)
2. Set `channelTargets` to include `["website", "instagram"]`
3. Ensure `AutomationSettings.channelPublishing.publishInstagram = true`
4. Activate the product (status → active via StatusCell "Aktif Yap" button)
5. **Expected**: n8n `Channel Stub — Instagram` workflow executes
6. **Expected**: sourceMeta in Payload shows `dispatchedChannels: ["instagram"]` and `lastDispatchedAt`
7. **Expected**: `dispatchNotes` shows `dispatched: true, webhookConfigured: true, responseStatus: 200`
8. In n8n, check **Executions** for the Instagram workflow — should show payload fields in the "Log Payload" node

---

## Dispatch Result Schema (stored in `sourceMeta.dispatchNotes`)

After dispatch, the product's `sourceMeta.dispatchNotes` contains a JSON array:

```json
[
  {
    "channel": "instagram",
    "eligible": true,
    "dispatched": true,
    "webhookConfigured": true,
    "responseStatus": 200,
    "timestamp": "2026-03-16T10:30:01.123Z"
  },
  {
    "channel": "shopier",
    "eligible": false,
    "dispatched": false,
    "webhookConfigured": false,
    "skippedReason": "not in channelTargets (product declared: [website, instagram])",
    "timestamp": "2026-03-16T10:30:01.124Z"
  },
  {
    "channel": "dolap",
    "eligible": false,
    "dispatched": false,
    "webhookConfigured": false,
    "skippedReason": "not in channelTargets (product declared: [website, instagram])",
    "timestamp": "2026-03-16T10:30:01.125Z"
  }
]
```

This data is surfaced in the **ReviewPanel** admin UI.

---

## Manual Re-Dispatch

To re-dispatch a product that is already `active`:

1. Open the product in admin
2. Scroll to **🔍 Kaynak İzleme** group
3. Check **🔄 Tekrar Gönder (Force Re-Dispatch)**
4. Click **Save**
5. The afterChange hook detects `forceRedispatch: true` + `status: active` → triggers dispatch
6. `forceRedispatch` is automatically reset to `false` after dispatch

This is a deliberate, one-shot action. It will not repeatedly dispatch on every save.

---

## Media URL Behavior

Media URLs in the dispatch payload always point to publicly accessible resources. There are two cases:

**Production (Vercel Blob):** `media.url` is a full Vercel Blob URL, e.g.:
```
https://abc123.public.blob.vercel-storage.com/nike-am90-1-Xf9K.jpg
```
These are publicly accessible from anywhere including the n8n VPS. No special access needed.

**Dev / local fallback:** If `media.url` is absent (local dev without Blob), the code constructs:
```
https://uygunayakkabi.com/media/filename.jpg  (using NEXT_PUBLIC_SERVER_URL)
```
If `NEXT_PUBLIC_SERVER_URL` is not set, the URL falls back to `/media/filename.jpg` (relative — NOT reachable by n8n). This should not occur in production where `NEXT_PUBLIC_SERVER_URL=https://uygunayakkabi.com`.

**Verification:** After your first real dispatch, check `mediaUrls` in the n8n execution's Webhook input. All entries must start with `https://`.

---

---

## Step 16 — Real Instagram Integration

**Workflow file:** `n8n-workflows/channel-instagram-real.json`

This replaces the Instagram stub with a real Instagram Graph API v21.0 publish flow.

### Required n8n Variables

Set these in n8n UI at **Settings → Variables** before activating the workflow:

| Variable | Required | Description |
|---|---|---|
| `INSTAGRAM_USER_ID` | ✅ Yes | Instagram Business Account numeric user ID (not `@username`). Find via: `GET https://graph.facebook.com/me?fields=id,name&access_token={token}` |
| `INSTAGRAM_ACCESS_TOKEN` | ✅ Yes | Long-lived Page Access Token or System User Token. Required scopes: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement` |
| `INSTAGRAM_BYPASS_PUBLISH` | ⚙️ Optional | Set to `true` to skip real publish (safe mode). Returns HTTP 422 with `mode=bypass`. Use while credentials are being configured. |

### Facebook App Prerequisites

1. Facebook App must be in **Live Mode** (not Development Mode)
2. Instagram account must be a **Business or Creator account** (not personal)
3. Instagram account must be **linked to a Facebook Page**
4. App must have permissions: `instagram_basic`, `instagram_content_publish`
5. Long-lived tokens last **60 days** — System User tokens do not expire
6. All image URLs must be **publicly accessible** (Vercel Blob URLs satisfy this)

### Workflow Logic

```
Webhook (channel-instagram)
  → Extract Fields (mediaUrls[0], title, price, brand, category, etc.)
  → Bypass Mode? (INSTAGRAM_BYPASS_PUBLISH == 'true')
      ↳ true  → Respond 422 {mode: 'bypass'}
      ↳ false → Credentials + Image OK? (access_token set + user_id set + firstImageUrl starts with https://)
                    ↳ false → Respond 422 {mode: 'no-credentials', reason: '...'}
                    ↳ true  → Build Caption (title + price + brand + category + hashtags, max 2200 chars)
                               → Create Media Container (POST /v21.0/{user_id}/media?image_url=...&caption=...&access_token=...)
                                   ↳ error → Respond 500 {mode: 'api-error', step: 'create-container', apiError: ...}
                                   ↳ ok    → Wait 2s (Instagram media processing time)
                                              → Publish Media (POST /v21.0/{user_id}/media_publish?creation_id=...&access_token=...)
                                                  ↳ error → Respond 500 {mode: 'api-error', step: 'media-publish', apiError: ...}
                                                  ↳ ok    → Respond 200 {mode: 'published', instagramPostId: ..., success: true, ...}
```

### Response Schema (Step 16 extended)

The n8n workflow now returns a structured JSON body in its HTTP response. Payload parses this and stores it as `publishResult` inside each channel's `dispatchNotes` entry.

**Success (HTTP 200):**
```json
{
  "mode": "published",
  "success": true,
  "instagramPostId": "17841405822304914",
  "instagramUserId": "17841400008460056",
  "instagramPermalink": "https://www.instagram.com/p/17841405822304914/",
  "caption": "Nike Air Max 90...",
  "mediaUrl": "https://xxx.blob.vercel-storage.com/...",
  "mediaCount": 2,
  "creationId": "17889455560051444",
  "publishedAt": "2026-03-16T10:30:02.000Z",
  "dispatchTimestamp": "2026-03-16T10:30:00.000Z"
}
```

**No Credentials / Missing Image (HTTP 422):**
```json
{
  "mode": "no-credentials",
  "success": false,
  "reason": "INSTAGRAM_ACCESS_TOKEN is not set in n8n Variables"
}
```

**Bypass Mode (HTTP 422):**
```json
{
  "mode": "bypass",
  "success": false,
  "reason": "INSTAGRAM_BYPASS_PUBLISH is set to true — real publish skipped"
}
```

**Graph API Error (HTTP 500):**
```json
{
  "mode": "api-error",
  "success": false,
  "step": "create-container",
  "apiError": "Invalid OAuth access token",
  "apiErrorCode": 190
}
```

### Payload Write-Back (Extended for Step 16)

`sourceMeta.dispatchNotes` now includes `publishResult` for each channel when available:

```json
[
  {
    "channel": "instagram",
    "eligible": true,
    "dispatched": true,
    "webhookConfigured": true,
    "responseStatus": 200,
    "publishResult": {
      "mode": "published",
      "success": true,
      "instagramPostId": "17841405822304914",
      "instagramPermalink": "https://www.instagram.com/p/17841405822304914/",
      "publishedAt": "2026-03-16T10:30:02.000Z"
    },
    "timestamp": "2026-03-16T10:30:01.123Z"
  }
]
```

The ReviewPanel admin UI now surfaces `publishResult` with:
- ✅ Published: post ID + direct Instagram link
- ⚠️ No-credentials: human-readable reason
- ⏸ Bypass mode: clear indicator
- ❌ API error: error message from Graph API

### Importing to n8n (Replace Stub)

1. Go to `flow.uygunayakkabi.com` → Workflows
2. If the stub `Channel Stub — Instagram` is active, **deactivate it first**
3. Import `n8n-workflows/channel-instagram-real.json`
4. Configure n8n Variables (Settings → Variables): `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN`
5. Optionally set `INSTAGRAM_BYPASS_PUBLISH=true` first for a dry-run test
6. **Activate** the workflow
7. The webhook path is the same (`channel-instagram`) — no Vercel env var change needed

---

## Known Limitations (Steps 14–16)

| Limitation | Status | Future resolution |
|---|---|---|
| ~~No real Instagram API call~~ | **RESOLVED in Step 16** | Instagram Graph API v21.0 real workflow |
| No real Shopier API call | Scaffold only | Phase 2B: Shopier integration research |
| No real Dolap API call | Scaffold only | Phase 2B: Dolap integration research |
| Dispatch history: only latest run stored | By design | Future: append history or log to external store |
| No per-channel retry scheduler | Deferred | Future: n8n retry workflow or manual re-dispatch |
| `instagramPostId` stored in `publishResult` but not in `externalSyncId` | Deferred | Future: promote to dedicated `sourceMeta.externalSyncId` field |
| Instagram only publishes first image (`mediaUrls[0]`) | By design (Step 16) | Step 17: carousel posts for multiple images |
| No webhook signature verification (inbound) | Deferred | Future: HMAC header on stub response |
| forceRedispatch re-dispatches ALL eligible channels | By design | Future: per-channel re-dispatch action button |
| AbortSignal.timeout requires Node.js 17.3+ | Non-issue for Vercel (Node 18+) | N/A |
| Long-lived tokens expire after 60 days | Ops concern | Ops: use System User token (no expiry) or set up token refresh |

---

## What's NOT in scope yet (Phase 2B)

- Instagram carousel posts (multiple images — currently publishes first image only)
- Instagram Reels publishing
- Real Shopier listing sync (API research needed)
- Real Dolap listing sync (API research needed)
- Scheduled retry on dispatch failure
- `sourceMeta.externalSyncId` promoted from `publishResult.instagramPostId`
- Webhook signature verification for incoming channel callbacks
