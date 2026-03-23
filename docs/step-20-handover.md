# Step 20 — Production Handover

## 1. Overview

Step 20 adds a non-blocking Shopier product sync pipeline to the UygunAyakkabı store. When a product is published in Payload CMS with `channels.publishShopier: true`, the system enqueues a background job that calls the Shopier REST API to create or update the product on the Shopier marketplace. Shopier can also send back order and refund events to the store via registered webhooks, which are signature-verified and logged (with optional Telegram notifications).

---

## 2. Live Architecture

```
Payload CMS (afterChange hook)
  └─► channels.publishShopier = true
        └─► payload.jobs.queue({ task: 'shopier-sync', input: { productId } })
              └─► sourceMeta.shopierSyncStatus = 'queued'

GitHub Actions (*/5 * * * *)
  └─► GET https://uygunayakkabi-store.vercel.app/api/payload-jobs/run
        Authorization: Bearer CRON_SECRET
          └─► shopierSyncTask.handler()
                ├─► sourceMeta.shopierSyncStatus = 'syncing'
                ├─► POST https://api.shopier.com/v1/products
                └─► sourceMeta.shopierSyncStatus = 'synced' | 'error'

Shopier → POST /api/webhooks/shopier
  └─► HMAC-SHA256 signature verified (SHOPIER_WEBHOOK_TOKEN, comma-separated)
        └─► order.created / order.fulfilled / refund.requested / refund.updated
              └─► console.log + optional Telegram notification (SHOPIER_NOTIFY_CHAT_ID)
```

---

## 3. Production Status

| Item | Status |
|---|---|
| Production URL | `https://uygunayakkabi-store.vercel.app` |
| Live commit | `a413c5a` |
| Vercel plan | Hobby |
| Jobs runner endpoint | `GET /api/payload-jobs/run` → 200 ✅ |
| GitHub Actions scheduler | Active, `*/5 * * * *` ✅ |
| Shopier PAT | Configured and verified against live API ✅ |
| Shopier webhooks registered | 4 events active ✅ |
| Webhook signature verification | Working, bad sigs return 401 ✅ |
| DB schema | `payload_jobs` table + 5 `source_meta_shopier_*` columns exist ✅ |
| Test product sync | Product 11 → Shopier ID `45456186` ✅ |

---

## 4. Environment Variables

| Variable | Purpose | Critical |
|---|---|---|
| `SHOPIER_PAT` | Bearer token for all Shopier REST API calls (create/update products, register webhooks) | **Yes** — without it, all syncs fail |
| `SHOPIER_WEBHOOK_TOKEN` | Comma-separated HMAC tokens from webhook registration; one per registered event. Used to verify incoming Shopier webhook signatures. | **Yes** — without it, signature verification is skipped (events still accepted but unverified) |
| `CRON_SECRET` | Authenticates the GitHub Actions request to `GET /api/payload-jobs/run`. Also set as a GitHub Actions repository secret. | **Yes** — without it in Vercel, the endpoint allows open access |
| `SHOPIER_NOTIFY_CHAT_ID` | Telegram chat ID to receive order/refund notifications. Optional. | No — missing value silently disables notifications |

> **Note on saving env vars to Vercel:** Vercel's environment variable form is a React-controlled input. Using JavaScript `textarea.value =` directly bypasses React state and saves an empty value. Always use the Vercel UI manually or a tool that triggers React's `onChange` event. A redeploy is required after adding new env vars for them to take effect in serverless functions.

---

## 5. Scheduler / Jobs Processing

Vercel Hobby plan enforces a minimum cron frequency of once per day, which is unsuitable for near-real-time product sync. Job processing is instead handled by a GitHub Actions workflow:

- **File:** `.github/workflows/process-jobs.yml`
- **Schedule:** every 5 minutes (`*/5 * * * *`)
- **Action:** `GET https://uygunayakkabi-store.vercel.app/api/payload-jobs/run` with `Authorization: Bearer CRON_SECRET`
- **GitHub secret required:** `CRON_SECRET` must be set in the repo's Actions secrets (Settings → Secrets → Actions)

The jobs endpoint processes up to 10 pending jobs per invocation (Payload default). If the queue grows faster than 5 minutes × 10 jobs, increase the runner frequency or the `limit` query param.

> **Note on `payload_jobs` table:** Payload's `push: true` DB adapter config does not reliably create new tables in Vercel's serverless environment. The `payload_jobs` table and the 5 `source_meta_shopier_*` columns were created manually via direct SQL against the Neon database. If the schema is ever reset, these must be recreated. See the SQL below.

```sql
-- payload_jobs table
CREATE TABLE IF NOT EXISTS payload_jobs (
  id SERIAL PRIMARY KEY,
  input JSONB,
  completed_at TIMESTAMP WITH TIME ZONE,
  total_tried INTEGER DEFAULT 0 NOT NULL,
  has_error BOOLEAN DEFAULT false NOT NULL,
  error JSONB,
  task_slug VARCHAR,
  workflow_slug VARCHAR,
  queue VARCHAR DEFAULT 'default' NOT NULL,
  wait_until TIMESTAMP WITH TIME ZONE,
  processing BOOLEAN DEFAULT false NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Products shopier columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_meta_shopier_sync_status VARCHAR;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_meta_shopier_last_sync_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_meta_shopier_last_error TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_meta_shopier_product_id VARCHAR;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_meta_shopier_product_url TEXT;
```

---

## 6. Webhook Setup

**Registered events and IDs:**

| Event | Webhook ID |
|---|---|
| `order.created` | `f59f5de33a213387` |
| `order.fulfilled` | `53ec49aad72ee944` |
| `refund.requested` | `1c1b6f5101965b8d` |
| `refund.updated` | `b0a9659b4e224bd9` |

**Webhook endpoint:** `POST https://uygunayakkabi-store.vercel.app/api/webhooks/shopier`

**Signature verification:** Each Shopier webhook registration returns its own HMAC token. All 4 tokens are stored comma-separated in `SHOPIER_WEBHOOK_TOKEN`. On each incoming request, the handler tries all tokens and accepts if any produces a matching `HMAC-SHA256(token, JSON.stringify(body))`. Invalid signatures return HTTP 401.

**Current behavior per event:**
- `order.created` — logs order details, sends Telegram notification if `SHOPIER_NOTIFY_CHAT_ID` is set
- `order.fulfilled` — logs, sends Telegram notification
- `refund.requested` — logs, sends Telegram notification
- `refund.updated` — logs, sends Telegram notification
- `product.created` / `product.updated` — logs only (informational; Payload is the source of truth)

---

## 7. Smoke Test Results

**Product publish test (Phase 5):**
- Product: Payload ID `11` — Vans Old Skool Siyah
- Trigger: job inserted manually, jobs runner called via `GET /api/payload-jobs/run`
- Result: `source_meta_shopier_sync_status = 'synced'`, Shopier product ID = `45456186`
- Duration: ~15 seconds (Vercel cold start + Shopier API round-trip)

**Webhook simulation test (Phase 6):**

| Test | HTTP Status | Response |
|---|---|---|
| `order.created` + valid HMAC | 200 | `{"ok":true,"event":"order.created"}` |
| `order.fulfilled` + valid HMAC | 200 | `{"ok":true,"event":"order.fulfilled"}` |
| `refund.requested` + valid HMAC | 200 | `{"ok":true,"event":"refund.requested"}` |
| `refund.updated` + valid HMAC | 200 | `{"ok":true,"event":"refund.updated"}` |
| `order.created` + bad signature | **401** | `{"error":"Invalid signature"}` |

---

## 8. Operational Runbook

**Publish a product to Shopier:**

Option A — via Payload admin: open the product, enable `Channels → Publish to Shopier`, save. The `afterChange` hook queues the job automatically. Status changes to `queued`, then `syncing`, then `synced` within the next 5-minute cron window.

Option B — via Telegram bot: send `/shopier publish <productId>`. The bot queues the job and acknowledges immediately.

Option C — batch: send `/shopier publish-ready`. Queues all products with `publishShopier: true` that are not yet synced.

**Check sync status:**

In Payload admin, open the product → `sourceMeta` group → `Shopier Sync Durumu`. Values: `not_synced` / `queued` / `syncing` / `synced` / `error`.

Via DB directly:
```sql
SELECT id, title, source_meta_shopier_sync_status, source_meta_shopier_product_id, source_meta_shopier_last_error
FROM products WHERE channels_publish_shopier = true;
```

**Run jobs manually (flush queue immediately):**
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  "https://uygunayakkabi-store.vercel.app/api/payload-jobs/run"
```
Response `{"noJobsRemaining":true}` means the queue is empty.

**Verify webhook health:**

Send a test ping using any of the 4 registered tokens:
```bash
python3 -c "
import json, hmac, hashlib, urllib.request
TOKEN = '<order.created token>'
body = json.dumps({'id':'health-check'}, separators=(',',':'))
sig = hmac.new(TOKEN.encode(), body.encode(), hashlib.sha256).hexdigest()
req = urllib.request.Request(
  'https://uygunayakkabi-store.vercel.app/api/webhooks/shopier',
  data=body.encode(),
  headers={'Content-Type':'application/json','shopier-signature':sig,'shopier-event':'order.created'},
  method='POST')
print(urllib.request.urlopen(req).read())
"
```
Expected: `{"ok":true,"event":"order.created"}`.

---

## 9. Rollback / Disable Options

**Disable Shopier publishing (stop new syncs):**
Remove or rename `SHOPIER_PAT` in Vercel env vars → redeploy. The `channelDispatch` function checks for `process.env.SHOPIER_PAT` before queuing; without it, Shopier sync is silently skipped. Existing synced products remain on Shopier untouched.

**Disable webhook processing:**
Remove `SHOPIER_WEBHOOK_TOKEN` from Vercel env vars → redeploy. The webhook endpoint will still return 200 (to prevent Shopier retries) but will skip signature verification and log a warning. To fully reject all incoming Shopier webhooks, return a non-200 status — but note this will trigger Shopier's retry policy (up to 9 retries over 72 hours).

**Disable job processing (stop the cron runner):**
In the GitHub repository, go to Actions → Workflows → `Process Payload Jobs` → disable the workflow. No jobs will be processed. Queued products will stay in `queued` status until re-enabled.

**Emergency: delete all pending jobs:**
```sql
DELETE FROM payload_jobs WHERE has_error = false AND completed_at IS NULL;
```

---

## 10. Known Risks / Notes

- **`push: true` schema limitation:** Payload's automatic DB schema push does not reliably run in Vercel serverless. Any new fields added to the Products collection or the jobs configuration must be manually applied to the Neon DB via SQL.
- **Shopier product description required:** Shopier's API rejects products with empty descriptions. A fallback of `"{title} — UygunAyakkabı"` is applied in code but a real description is strongly recommended for all products.
- **Single Shopier category:** The store currently has one Shopier category (`Günlük`, ID `6b59e27730d800f7`). Category resolution includes a fallback to the first available category if the Payload category name does not match exactly (guarding against Turkish Unicode normalization differences). If new categories are added to Shopier, no code change is needed — the mapping is fetched live.
- **Shopier PAT expiry:** The current PAT expires 2031-03-23. No rotation needed for 5+ years, but note the date.
- **No product images in smoke test:** Product 11 had no images. The Shopier API accepts this in the current implementation (`media: []` is allowed as of testing), but Shopier may display the product without images. Needs confirmation for production listings.
- **Telegram notifications disabled:** `SHOPIER_NOTIFY_CHAT_ID` is not set. Order/refund events are processed and logged but no Telegram messages are sent. Set this env var to enable.
- **No deduplication guard on jobs:** If the afterChange hook fires multiple times rapidly (e.g., bulk updates), multiple `shopier-sync` jobs may be queued for the same product. The last one to complete wins. This is acceptable for the current volume.

---

## 11. Next Recommended Phase

**Step 21 — Shopier order fulfillment flow:**
The webhook handler currently logs `order.created` events but does not create a corresponding order record in Payload. The next logical phase is to:
1. Parse the incoming `order.created` webhook body and create an `Order` document in Payload CMS.
2. Decrement `products.stockQuantity` for each ordered item.
3. Send a richer Telegram notification including the customer name, items, and total.
4. Handle `order.fulfilled` to update the Payload order status.

This closes the loop: products go out to Shopier, and orders come back into Payload.
