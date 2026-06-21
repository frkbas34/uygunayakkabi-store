# SupplierScout — Operator Runbook

**Decision:** D-278
**Audience:** Frank (operator)
**Last updated:** 2026-06-21

> Status: dormant. SupplierScout is intentionally asleep because the current business decision is to sell and upload only our own products. Do not follow the setup steps below unless the supplier strategy is explicitly restarted. Reactivation requires `SUPPLIER_SCOUT_ENABLED=true`, env vars, webhook registration, and cron reconfiguration.

---

## What This Bot Does

SupplierScout watches your wholesaler Telegram groups 24/7. When a supplier posts a product offer with a photo + price + sizes, it automatically creates a draft product on the website. When a seller posts "bitti" or "tükendi", it matches it to the right website product and marks it sold out. Every night at 23:30 it sends you a private Telegram report of everything it did.

You do not approve products one by one. The bot handles the routine; you handle the edge cases.

---

## First-Time Setup

### Step 1 — Apply Neon DDL

Before anything else, open Neon console and run the full SQL block from `project-control/SUPPLIER_SCOUT.md` → **"Neon DDL"** section.

This creates all 9 new tables. Do this before deploying.

### Step 2 — Set Vercel Environment Variables

In Vercel → Project → Settings → Environment Variables, add:

| Variable | Where to get it |
|----------|----------------|
| `SUPPLIER_SCOUT_BOT_TOKEN` | BotFather → your SupplierScout bot → API Token |
| `SUPPLIER_SCOUT_WEBHOOK_SECRET` | Generate any random string, e.g. `openssl rand -hex 32` |
| `SUPPLIER_SCOUT_ADMIN_SECRET` | Another random string for the cron endpoint |

### Step 3 — Create the Telegram Bot

1. Open BotFather in Telegram
2. `/newbot` → give it a name (e.g. "UygunScout") and username
3. Copy the token → paste as `SUPPLIER_SCOUT_BOT_TOKEN`
4. Run: `/setprivacy` → choose your bot → **Disable** (so it can read all group messages)

### Step 4 — Deploy

Push to main / trigger Vercel deploy. Wait for build to succeed.

### Step 5 — Register Webhook

Call this URL once (in browser or curl):

```
https://uygunayakkabi.com/api/supplier-scout?action=register_webhook&secret=YOUR_SUPPLIER_SCOUT_ADMIN_SECRET
```

You should get back: `{"ok": true, "webhook": "registered"}` (or similar).

### Step 6 — Send /start to the Bot

Open Telegram, find your new SupplierScout bot, and send:

```
/start
```

This stores your private chat_id. The bot will confirm: `✅ Frank kaydedildi. Günlük raporlar bu sohbete gelecek.`

### Step 7 — Add Your First Supplier Group

Go to Admin → Supplier Groups → Add New:

| Field | Value |
|-------|-------|
| Group Name | Whatever you call this supplier |
| Telegram Group ID | The group's numeric ID (see tip below) |
| Margin USD | 15 (default) |
| Is Active | ✅ |
| Auto Create Enabled | ❌ (leave off for first few days) |

**How to find a group's Telegram ID:** Add `@userinfobot` to the group, it will post the group ID.

### Step 8 — Add the Bot to the Group

Add your SupplierScout bot to each wholesaler group as an **admin** (or at minimum with "Read Messages" permission). Privacy mode is already disabled from Step 3.

### Step 9 — Verify Health

```
https://uygunayakkabi.com/api/supplier-scout?action=health&secret=YOUR_SUPPLIER_SCOUT_ADMIN_SECRET
```

Should return a JSON summary with `status: "ok"`.

### Step 10 — Watch Before Enabling Auto-Create

For the first 2–3 days keep `autoCreateEnabled = false` on every group. The bot will process messages and create `WholesaleOpportunities` records with `status = review_needed`. Check Admin → Wholesale Opportunities to see what it would have created. When you are happy with the quality, flip `autoCreateEnabled = true` for that group.

---

## Add Vercel Cron (Daily Report)

Add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/supplier-scout?action=daily_report&secret=YOUR_SUPPLIER_SCOUT_ADMIN_SECRET",
      "schedule": "30 20 * * *"
    }
  ]
}
```

`20:30 UTC` = `23:30 Istanbul` (Turkey is UTC+3, no DST).

---

## Daily Private Commands

Send these to the SupplierScout bot in your private DM:

| Command | What it shows |
|---------|--------------|
| `/start` | Registers your chat ID (run once on setup) |
| `/today` | Today's stats: products created, sold-out applied, skipped |
| `/pending` | All WholesaleOpportunities waiting for your review |
| `/suppliers` | List of active supplier groups and their activity counts |
| `/soldout_today` | Products marked sold out today |
| `/profit_today` | Estimated margin from products created today |
| `/pause_auto` | Pauses all autonomous product creation immediately |
| `/resume_auto` | Resumes autonomous product creation |
| `/teach` | Teach the bot a new Turkish term (see below) |
| `/memory` | Show the language memory dictionary |
| `/seller <telegram_id>` | Show what the bot knows about a specific seller |
| `/group_logic` | Show observations about each monitored group |
| `/corrections` | Show the corrections you've made and what the bot learned |
| `/learning_today` | Today's learning summary (new terms, pattern updates) |

---

## Teaching the Bot New Terms

When you see the bot misclassify something because it doesn't know a supplier's shorthand:

```
/teach RC = Rain Cloud for New Balance products
/teach TB = Timberland boots
/teach seri 36-45 = full size run from 36 to 45
/teach çıktı = new arrival / just dropped
```

Format: `/teach TERM = MEANING` (optionally add `for CONTEXT` at the end)

The term is stored in the language memory and used in every future classification prompt. The bot will DM you a confirmation.

---

## Correcting a Wrong Classification

If the bot created a product it shouldn't have, or missed a sold-out:

1. Go to Admin → Supplier Actions Log
2. Find the action
3. If `isReversible = true`, you can manually revert (delete the draft product, update WholesaleOpportunity status)
4. To teach the bot: `/corrections` to see recent ones, or `/teach` to add the right mapping

Future: a `/correct` command will be added to streamline this.

---

## Pausing the Bot

**Immediate pause (no new products created):**
```
/pause_auto
```

The bot still monitors groups and logs WholesaleOpportunities — it just won't auto-create products. Use this when a supplier is posting garbage, you're doing a sale, or you need to review manually for a few days.

**Resume:**
```
/resume_auto
```

You can also toggle `autoPauseActive` directly in Admin → Supplier Scout Settings.

---

## Blocking a Supplier Group

If a group is consistently noisy or unreliable:

1. Admin → Supplier Groups → find the group
2. Set `Is Blocked = true`

No messages from that group will be processed until you unblock it.

---

## Understanding the Daily Report

The 23:30 report covers Istanbul calendar day. Sections:

```
📊 SupplierScout — Günlük Rapor [DD.MM.YYYY]

📦 Bugün Oluşturulan Ürünler (N)
  • [product name] — [supplier] — ₺[price] ([$wholesale_usd toptan)

🔴 Stok Sıfırlanan Ürünler (N)
  • [product name] — [match confidence]% eşleşme

⏳ İnceleme Bekleyenler (N)
  • [offer summary] — [why it needs review]

⏭️ Atlananlar (N)
  • [offer summary] — [skip reason]

💰 Bugünkü Tahmini Kâr Marjı
  N ürün × ortalama $15 = ~$[total]

🧠 Öğrenme
  • Yeni terimler: ...
  • Satıcı gözlemleri: ...
  • Güven değişimleri: ...

⚠️ Hatalar / Dikkat
  • ...

🩺 Sistem Sağlığı
  Son webhook: [time ago]
  Aktif gruplar: N/M
```

---

## Admin Panel Collections

After setup, you'll have these new sections in Payload admin:

| Collection | Purpose |
|-----------|---------|
| Supplier Groups | Configure which groups to monitor |
| Wholesale Opportunities | Every message the bot processed (full audit trail) |
| Supplier Actions Log | Immutable log of every autonomous action |
| Supplier Daily Reports | Saved copies of all daily reports |
| Supplier Trust Scores | Per-seller reliability scores |
| Supplier Group Memory | What the bot has learned about each group |
| Supplier Seller Memory | What the bot has learned about each seller |
| Supplier Language Memory | The Turkish slang dictionary |
| Supplier Correction Memory | Your manual corrections |

And in Globals:
| Global | Purpose |
|--------|---------|
| Supplier Scout Settings | frankChatId, pause toggle, margin defaults, thresholds |

---

## Checking WholesaleOpportunities

This is the full audit trail. Every message the bot processes gets a record here with:
- `messageClass` — what the bot thinks it is (new_product, sold_out, etc.)
- `status` — auto_created / skipped / review_needed / sold_out_applied
- `confidence` — 0–100
- `skipReason` — why it didn't auto-create
- `createdProductId` — which product it made (if any)

Filter by `status = review_needed` to see what needs your attention.

---

## Troubleshooting

**Bot is not receiving group messages**
- Check that privacy mode is disabled (BotFather → `/setprivacy` → Disable)
- Verify the bot is in the group with at least read access
- Check Admin → Supplier Scout Settings → `lastWebhookReceivedAt` — if stale, re-register the webhook

**Bot is not creating products despite good offers**
- Check Admin → Wholesale Opportunities — is the record there? What's the `skipReason`?
- Is `autoCreateEnabled = true` on the group?
- Is `autoPauseActive = false` in Supplier Scout Settings?
- Is `confidence >= autoCreateMinScore` (default 75)?

**Wrong product marked sold out**
- This means a sold-out signal was matched with ≥80 confidence incorrectly
- Lower the `soldOutAutoApplyMinScore` in Supplier Scout Settings (e.g. to 90) to make auto-apply stricter
- Check Supplier Correction Memory to understand why the mis-match happened

**Daily report not arriving**
- Check Vercel → Logs → Cron jobs — did it fire at 20:30 UTC?
- Verify `frankChatId` is set in Supplier Scout Settings (it's set automatically when you send /start)
- Test manually: `GET /api/supplier-scout?action=daily_report&secret=...`

**"SUPPLIER_SCOUT_BOT_TOKEN not set" in logs**
- The env var is missing or not deployed — check Vercel → Environment Variables

---

## Key Thresholds (Supplier Scout Settings)

All configurable in Admin → Globals → Supplier Scout Settings:

| Setting | Default | Meaning |
|---------|---------|---------|
| `defaultMarginUSD` | 15 | Markup added to wholesale price |
| `defaultStockQuantity` | 10 | Default virtual stock per new product |
| `usdToTryRate` | 32 | USD → TRY conversion rate |
| `autoCreateMinScore` | 75 | Minimum confidence to auto-create a product |
| `soldOutAutoApplyMinScore` | 80 | Minimum score to auto-apply sold-out |
| `dailyReportHour` | 23 | Hour (Istanbul) for daily report |
| `dailyReportMinute` | 30 | Minute for daily report |

---

## Stock Mode — What "Virtual Supplier Stock" Means

Products created by SupplierScout have:
- `stockQuantity: 10` — a placeholder, not a real count
- `stockMode: supplier_virtual_stock` — flags this as supplier-sourced
- `exactStockKnown: false` — the bot doesn't know actual inventory
- `supplierAvailabilityBased: true` — available while the supplier says so

This means: when you get a real order, you confirm availability with the supplier before dispatching. The bot auto-marks the product sold out when the supplier posts a sold-out signal. You can also manually update stock in admin at any time.

---

## Relationship to Other Bots

| Bot | Token | Handles |
|-----|-------|---------|
| Uygunops (Mentix) | `TELEGRAM_BOT_TOKEN` | Orders, leads, funnel, wizard |
| GeoBot | `GEOBOT_TOKEN` | Geo-image generation |
| **SupplierScout** | `SUPPLIER_SCOUT_BOT_TOKEN` | Supplier group monitoring |

These three bots are completely independent. SupplierScout never reads from Uygunops and vice versa. Machine handoff (e.g. SupplierScout creates a product → Uygunops sees it) happens through the database (Products collection), not through Telegram messages.
