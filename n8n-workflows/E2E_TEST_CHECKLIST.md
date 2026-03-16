# End-to-End Dispatch Test Checklist — Step 15

This is the repeatable runbook for verifying the full dispatch chain:

```
Product activated → afterChange hook → channelDispatch.ts → n8n stub → sourceMeta updated → ReviewPanel shows result
```

Run this test whenever you make changes to the dispatch pipeline or configure a new channel for the first time.

---

## Prerequisites

Before running the test, confirm these are in place:

- [ ] n8n is running at `flow.uygunayakkabi.com` and accessible
- [ ] At least one stub workflow is imported and **activated** in n8n
- [ ] The corresponding `N8N_CHANNEL_*_WEBHOOK` env var is set in Vercel
- [ ] Vercel has been **redeployed** after setting the env var
- [ ] `AutomationSettings` global has `channelPublishing.publishInstagram = true` (or the channel you're testing)

---

## Part 1 — n8n Stub Setup (one-time per stub)

### 1.1 Import the stub workflow

1. Open n8n at `https://flow.uygunayakkabi.com`
2. Go to **Workflows** → **⊕ Add workflow** → **Import from file**
3. Select the stub file from this repo:
   ```
   n8n-workflows/stubs/channel-instagram.json
   ```
4. Click **Import**

### 1.2 Activate the workflow

1. In the imported workflow, toggle **Active** (top right) → green
2. The webhook node should now show the production URL:
   ```
   https://flow.uygunayakkabi.com/webhook/channel-instagram
   ```
   ⚠️ If it shows `/webhook-test/` instead of `/webhook/`, the workflow is **not yet active**. Toggle active first.

### 1.3 Set the env var in Vercel

1. Open Vercel Dashboard → uygunayakkabi-store → **Settings** → **Environment Variables**
2. Add or update:
   ```
   Name:  N8N_CHANNEL_INSTAGRAM_WEBHOOK
   Value: https://flow.uygunayakkabi.com/webhook/channel-instagram
   ```
3. Click **Save**
4. Go to **Deployments** → click the latest deployment → **Redeploy** (or push a commit to trigger auto-deploy)

### 1.4 Verify env var is live

After redeploy, check `https://uygunayakkabi.com/api/health` or look at deployment logs for any startup errors.

---

## Part 2 — Test Product Setup

### 2.1 Create a test product via admin

Open `https://uygunayakkabi.com/admin` → Products → Add New:

| Field | Value |
|---|---|
| Title | `[TEST] Step15 Dispatch Check` |
| Price | `999` |
| Brand | `Nike` |
| Category | `Spor` |
| Status | `draft` ← important: start as draft |
| Kanal Hedefleri (channelTargets) | `instagram` (+ `website`) |
| Kanallar → publishInstagram | ✅ checked |

Upload at least one image (required for realistic payload).

Click **Save** without activating.

### 2.2 Verify AutomationSettings

Open admin → **Otomasyon Ayarları** (AutomationSettings global):
- `channelPublishing.publishInstagram` → must be **checked/true**
- If it's false, the eligibility gate 3 will block dispatch regardless

---

## Part 3 — Run the Dispatch Test

### 3.1 Activate the product

In the product edit page: click the **"Aktif Yap"** button in the Status cell (or set Status → Active and Save).

### 3.2 Check server logs (Vercel)

Go to Vercel Dashboard → uygunayakkabi-store → **Logs** (Function Logs):

**Expected log lines (in order):**
```
[channelDispatch] dispatched — channel=instagram product=<id> httpStatus=200 ok=true
[channelDispatch] summary — product=<id> eligible=[instagram] dispatched=[instagram] skipped=[shopier,dolap]
[Products] afterChange dispatch — product=<id> trigger=activation dispatched=[instagram] total=3 channels evaluated
```

If you see `SCAFFOLD —` instead of `dispatched —`, the env var was not picked up. Redeploy.

### 3.3 Check n8n execution

1. In n8n, open the **Channel Stub — Instagram** workflow
2. Click **Executions** (clock icon)
3. The most recent execution should show:
   - Status: **Success** ✅
   - "Log Payload" node → should show all product fields

**Expected fields in Log Payload node:**
```
channel:          instagram
productId:        <number>
sku:              <string>
title:            [TEST] Step15 Dispatch Check
price:            999
brand:            Nike
category:         Spor
mediaCount:       1 (or more)
parseConfidence:  (may be undefined for admin-created products)
triggerReason:    status-transition:draft→active product=<id>
dispatchTimestamp: <ISO timestamp>
mode:             stub — no real Instagram API call
```

### 3.4 Verify sourceMeta in admin

Go back to the product in admin. In the **🔍 Kaynak İzleme** (Source Meta) section, verify:

| Field | Expected |
|---|---|
| `dispatchedChannels` | `["instagram"]` |
| `lastDispatchedAt` | recent timestamp |
| `dispatchNotes` | JSON array with 3 entries (instagram dispatched, shopier/dolap skipped) |

### 3.5 Verify ReviewPanel

In the product edit page, the **🤖 Otomasyon Kontrol Paneli** should show the dispatch section with:
- 📸 Instagram → ✅ uygun → ✅ gönderildi → 🔗 → HTTP 200
- 🛒 Shopier → ⛔ uygun değil → atlandı → ↳ not in channelTargets
- 👗 Dolap → ⛔ uygun değil → atlandı → ↳ not in channelTargets

---

## Part 4 — Media URL Verification

### 4.1 Check media URLs in n8n payload

In the n8n execution → Log Payload node, look for `mediaUrls` in the raw input JSON (visible in the Input section of the Webhook node).

**Expected (production):**
```json
"mediaUrls": ["https://abc123.public.blob.vercel-storage.com/..."]
```

**Not acceptable (dev fallback that escaped into production):**
```json
"mediaUrls": ["/media/filename.jpg"]
```

If you see relative paths in production dispatch, check that Vercel Blob storage is correctly configured and that `BLOB_READ_WRITE_TOKEN` is set.

### 4.2 Confirm media URL is publicly accessible from VPS

From the n8n VPS, run:
```bash
curl -I "https://abc123.public.blob.vercel-storage.com/<your-blob-file>"
```

Expected: `HTTP/2 200` with `Content-Type: image/jpeg` (or similar).

Vercel Blob public URLs (`*.public.blob.vercel-storage.com`) are publicly accessible worldwide. This should pass.

---

## Part 5 — forceRedispatch Verification (optional)

### 5.1 Test manual re-dispatch

1. While the product is still **active**, go to the **🔍 Kaynak İzleme** group
2. Check **🔄 Tekrar Gönder (Force Re-Dispatch)**
3. Click **Save**
4. Check n8n Executions — a new execution should appear

**Expected behavior:**
- triggerReason: `manual-redispatch product=<id>`
- forceRedispatch field auto-resets to `false` after save
- `lastDispatchedAt` updates to new timestamp
- `dispatchNotes` replaced with fresh results

---

## Failure Modes & Fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| `SCAFFOLD —` in logs | Env var not set or not deployed | Set env var in Vercel, redeploy |
| `eligible=false` / `not in channelTargets` | Product channelTargets doesn't include the channel | Edit product → Kanal Hedefleri → add instagram |
| `eligible=false` / `globally disabled` | AutomationSettings gate blocking | Admin → Otomasyon Ayarları → publishInstagram=true |
| `eligible=false` / `channels.publishInstagram is false` | Product channel flag off | Edit product → Yayın Kanalları → check Instagram |
| `dispatched=false`, `error: "fetch failed"` | n8n webhook URL wrong or n8n down | Check n8n is running, verify URL |
| `dispatched=false`, `responseStatus: 404` | Workflow not activated or path wrong | Activate workflow in n8n, check path is `channel-instagram` |
| `dispatched=false`, `responseStatus: 500` | n8n workflow error | Check n8n execution error log |
| `dispatchNotes` empty in admin | Hook write-back failed | Check Vercel function logs for `[Products] afterChange dispatch failed` |
| ReviewPanel doesn't show dispatch section | Product status is draft | Activate product first |
| mediaUrls has relative paths in dispatch | Blob not configured or dev mode | Check BLOB_READ_WRITE_TOKEN is set |

---

## Smoke Test (quick check after deploys)

Run this 3-step smoke test after any dispatch-related code change:

1. Create/use a product with `channelTargets: ["instagram"]` and `status: draft`
2. Activate it
3. Check Vercel logs for `[channelDispatch] dispatched — channel=instagram … ok=true`

If step 3 shows `ok=true`, the dispatch pipeline is healthy.

---

## Checklist Summary (quick reference)

```
n8n SETUP:
[ ] channel-instagram.json imported and ACTIVATED in n8n
[ ] webhook URL copied: https://flow.uygunayakkabi.com/webhook/channel-instagram

VERCEL ENV:
[ ] N8N_CHANNEL_INSTAGRAM_WEBHOOK set in Vercel Dashboard
[ ] NEXT_PUBLIC_SERVER_URL=https://uygunayakkabi.com (production)
[ ] Vercel redeployed after env var change

AUTOM. SETTINGS:
[ ] AutomationSettings → channelPublishing → publishInstagram = true

TEST PRODUCT:
[ ] channelTargets includes "instagram"
[ ] channels.publishInstagram = true
[ ] has at least 1 image
[ ] activated from draft status

VERIFY:
[ ] Vercel logs show "dispatched — channel=instagram … ok=true"
[ ] n8n execution shows payload fields in Log Payload node
[ ] sourceMeta.dispatchedChannels = ["instagram"]
[ ] ReviewPanel shows green "gönderildi" for instagram
[ ] mediaUrls contains https:// URLs (not relative paths)
```
