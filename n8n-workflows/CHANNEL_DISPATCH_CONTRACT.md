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

## Known Limitations (Step 14–15 scope)

| Limitation | Status | Future resolution |
|---|---|---|
| No real Instagram API call | By design | Phase 2B: Instagram Graph API workflow |
| No real Shopier API call | By design | Phase 2B: Shopier integration research |
| No real Dolap API call | By design | Phase 2B: Dolap integration research |
| Dispatch history: only latest run stored | By design | Future: append history or log to external store |
| No per-channel retry scheduler | Deferred | Future: n8n retry workflow or manual re-dispatch |
| `externalSyncId` not written back on success | Deferred | Future: channel worker sends confirmation back to `/api/automation/products/{id}/sync` |
| No webhook signature verification (inbound) | Deferred | Future: HMAC header on stub response |
| forceRedispatch re-dispatches ALL eligible channels | By design | Future: per-channel re-dispatch action button |
| AbortSignal.timeout requires Node.js 17.3+ | Non-issue for Vercel (Node 18+) | N/A |

---

## What's NOT in scope yet (Phase 2B)

- Real Instagram Graph API publishing
- Real Shopier listing sync (API research needed)
- Real Dolap listing sync (API research needed)
- Scheduled retry on dispatch failure
- Per-channel listing ID stored back to `sourceMeta.externalSyncId`
- Webhook signature verification for incoming channel callbacks
