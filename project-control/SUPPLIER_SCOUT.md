# SupplierScout — Architecture & Decision Record

**Decision:** D-278
**Status:** DORMANT as of 2026-06-21. Code remains in the repo, but the current strategy is own-products-only.
**Date:** 2026-05-09; paused 2026-06-21

> Do not activate this bot unless the supplier strategy is explicitly restarted. `/api/supplier-scout` no-ops unless `SUPPLIER_SCOUT_ENABLED=true`, and the Vercel daily-report cron has been removed.

---

## What Is SupplierScout

An autonomous Telegram-bot pipeline that monitors wholesaler groups, classifies offer messages with Gemini NLP, creates draft products on the website automatically, detects sold-out signals, and sends Frank a nightly summary report — all without touching the existing Uygunops/GeoBot/Mentix flows.

---

## Architecture Overview

```
Telegram Wholesaler Groups
        │  (webhook POST)
        ▼
/api/supplier-scout          ← separate from /api/telegram (Uygunops)
        │
        ├─ handleGroupMessage()
        │       │
        │       ├─ classifySupplierMessage()   [Gemini 2.5 Flash]
        │       │       └─ heuristicClassify() [fallback]
        │       │
        │       ├─ PRODUCT_OFFER branch
        │       │       ├─ parseProductOffer()
        │       │       ├─ WholesaleOpportunities.create()
        │       │       ├─ checkAutoCreateGate()  [9-condition gate]
        │       │       └─ autoCreateProduct()    [status=draft, source=supplier_scout]
        │       │
        │       └─ SOLD_OUT branch
        │               ├─ parseSoldOutSignal()
        │               ├─ matchSoldOutToProduct() [scored 6 signals]
        │               └─ applySoldOut() / DM warn / report-only
        │
        └─ handlePrivateMessage()  (Frank's DM commands)
                └─ handleDMCommand()  [14 commands]

GET /api/supplier-scout?action=daily_report   ← Vercel Cron 23:30 Istanbul
GET /api/supplier-scout?action=register_webhook
GET /api/supplier-scout?action=health
```

---

## Key Design Decisions

### Separation from Uygunops
- Separate bot token: `SUPPLIER_SCOUT_BOT_TOKEN`
- Separate webhook route: `/api/supplier-scout`
- Separate webhook secret: `SUPPLIER_SCOUT_WEBHOOK_SECRET`
- Zero imports from `/api/telegram` or Uygunops lib files
- Separate Telegram helper lib: `src/lib/supplierScout/telegram.ts`

### Gemini NLP (not regex) for Turkish classification
Wholesaler Turkish is highly abbreviated and slang-heavy. Pure regex fails on:
- `RC beden 36-41 seri 85 usd` → Rain Cloud NB
- `bitti gitti` → sold out (not a product offer)
- `kalıp dar gelir` → sizing note, not a new offer

Gemini 2.5 Flash receives:
- The raw message text + caption
- The full language memory dictionary (custom terms Frank has taught)
- Frank's recent corrections (few-shot examples)
- Group context (name, margin setting)
- Seller memory (known posting style)

Temperature: 0.1 (deterministic), `responseMimeType: 'application/json'`
Fallback: `heuristicClassify()` for when Gemini is unavailable.

### Auto-Create Gate (9 conditions, all must pass)
1. Has photo
2. Price extracted successfully
3. At least 1 size extracted
4. Product name extracted (≥3 chars)
5. Classification score ≥ `autoCreateMinScore` (default 75)
6. No duplicate (same title + same seller, last 7 days)
7. Group not blocked
8. System not paused (`autoPauseActive === false`)
9. Group has `autoCreateEnabled: true`

If gate fails → WholesaleOpportunity saved with status `skipped` or `review_needed`.

### `supplier_virtual_stock` Mode
Supplier groups don't confirm exact stock. Products created with:
- `stockMode: 'supplier_virtual_stock'`
- `stockQuantity: 10` (configurable in SupplierScoutSettings)
- `exactStockKnown: false`
- `supplierAvailabilityBased: true`

This signals to operators that availability is based on supplier channel, not confirmed inventory.

### Sold-Out Matching (6 scored signals)
Matching a "bitti" message to an existing product is hard. Multi-signal scoring:
- Same seller ID (+40)
- Same group ID (+25)
- Reply-to message matches product's source message (+30)
- Same Telegram media group ID (+20)
- Product name similarity ILIKE (+15 to +20)
- Recency: created within 24h (+10), 7 days (+5)

Thresholds (configurable in SupplierScoutSettings):
- ≥80: auto-apply soldout
- 50–79: DM Frank for confirmation
- <50: log in daily report only

### Turkish Slang Seed Dictionary
Built-in seeds in `classifier.ts` (`BUILTIN_SLANG`):
```
seri → full size run (all sizes in set)
tam seri → complete full size run
numara/no → shoe size number
kalıp → size mold/last
adet → unit/piece
koli → box of units
çıkış → new arrival / just dropped
güncel → current / in stock now
bitti → sold out / finished
tükendi → sold out / depleted
kalmadı → none left
kapandı → listing closed / no longer available
rezerve → reserved / held
devam → still available / still going
```

Expandable via `/teach` command (stored in `supplier-language-memory` collection).

### Fire-and-Forget Pattern
Telegram requires a response within 5 seconds or it retries. The webhook handler:
1. Validates secret header → 401 if wrong
2. Forks async processing (no `await`)
3. Returns `200 OK` immediately

Long processing (Gemini calls, DB writes, product creation) happens in the forked async chain.

### Daily Report — 23:30 Istanbul
Delivered via Vercel Cron hitting:
```
GET /api/supplier-scout?action=daily_report&secret=SUPPLIER_SCOUT_ADMIN_SECRET
```

Report covers Istanbul calendar day (UTC+3). Sections:
1. Quick stats (new products, sold-out applied, reviewed, skipped, profit margin)
2. Products created today
3. Sold-out signals applied
4. Needs your review (pending WholesaleOpportunities)
5. Skipped (why)
6. Margin estimate
7. Learning log (new terms, corrections)
8. System health
9. Error summary if any

---

## File Map

| File | Purpose |
|------|---------|
| `src/lib/supplierScout/types.ts` | All TypeScript types |
| `src/lib/supplierScout/classifier.ts` | Gemini + heuristic classification |
| `src/lib/supplierScout/parser.ts` | Price/size/name extraction |
| `src/lib/supplierScout/soldoutMatcher.ts` | Sold-out matching + auto-apply |
| `src/lib/supplierScout/productCreator.ts` | Auto-create gate + product creation |
| `src/lib/supplierScout/memory.ts` | Language/seller/correction memory CRUD |
| `src/lib/supplierScout/reportGenerator.ts` | Daily report build + format |
| `src/lib/supplierScout/commands.ts` | Frank's DM command handlers |
| `src/lib/supplierScout/telegram.ts` | Telegram API helpers (Scout bot only) |
| `src/app/api/supplier-scout/route.ts` | Webhook entry point |
| `src/collections/supplier/SupplierGroups.ts` | Monitored group configs |
| `src/collections/supplier/WholesaleOpportunities.ts` | Every actionable message |
| `src/collections/supplier/SupplierActionsLog.ts` | Immutable audit log |
| `src/collections/supplier/SupplierDailyReports.ts` | Daily report records |
| `src/collections/supplier/SupplierTrustScores.ts` | Per-seller trust |
| `src/collections/supplier/SupplierGroupMemory.ts` | Group behaviour patterns |
| `src/collections/supplier/SupplierSellerMemory.ts` | Seller writing style memory |
| `src/collections/supplier/SupplierLanguageMemory.ts` | Turkish slang dictionary |
| `src/collections/supplier/SupplierCorrectionMemory.ts` | Frank's corrections |
| `src/globals/SupplierScoutSettings.ts` | Global operator settings |

---

## Neon DDL — ⚠️ BLOCKER 0 ⚠️

`push: true` in Payload's postgres adapter does NOT create new tables on Neon reliably. All 9 new collections + 1 global must be created manually.

### Run this SQL against production Neon before activating SupplierScout:

```sql
-- ── supplier-groups ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "supplier_groups" (
  id            SERIAL PRIMARY KEY,
  "groupName"   TEXT NOT NULL,
  "telegramGroupId" BIGINT NOT NULL UNIQUE,
  "marginUSD"   NUMERIC(8,2) NOT NULL DEFAULT 15,
  currency      TEXT NOT NULL DEFAULT 'USD',
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "isBlocked"   BOOLEAN NOT NULL DEFAULT false,
  "autoCreateEnabled" BOOLEAN NOT NULL DEFAULT false,
  "trustScore"  INTEGER DEFAULT 50,
  "defaultCategory" TEXT,
  notes         TEXT,
  "createdAt"   TIMESTAMPTZ DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ DEFAULT now()
);

-- ── wholesale-opportunities ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "wholesale_opportunities" (
  id                  SERIAL PRIMARY KEY,
  "messageClass"      TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  confidence          INTEGER,
  "rawText"           TEXT,
  "extractedName"     TEXT,
  "extractedPrice"    NUMERIC(10,2),
  "extractedCurrency" TEXT,
  "websitePrice"      NUMERIC(10,2),
  "extractedSizes"    TEXT,
  "photoFileId"       TEXT,
  "sourceGroupId"     BIGINT,
  "sourceGroupName"   TEXT,
  "sourceSellerId"    BIGINT,
  "sourceSellerName"  TEXT,
  "telegramMessageId" BIGINT,
  "telegramDate"      TIMESTAMPTZ,
  "createdProductId"  INTEGER REFERENCES products(id) ON DELETE SET NULL,
  "skipReason"        TEXT,
  "reviewNote"        TEXT,
  "classificationMeta" JSONB,
  "createdAt"         TIMESTAMPTZ DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ DEFAULT now()
);

-- ── supplier-actions-log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "supplier_actions_log" (
  id              SERIAL PRIMARY KEY,
  "actionType"    TEXT NOT NULL,
  confidence      INTEGER,
  "productId"     INTEGER,
  "productTitle"  TEXT,
  "supplierId"    BIGINT,
  "supplierName"  TEXT,
  "groupId"       BIGINT,
  "groupName"     TEXT,
  details         JSONB,
  "isReversible"  BOOLEAN DEFAULT false,
  "reversedAt"    TIMESTAMPTZ,
  "reversedBy"    TEXT,
  "createdAt"     TIMESTAMPTZ DEFAULT now()
);

-- ── supplier-daily-reports ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "supplier_daily_reports" (
  id                  SERIAL PRIMARY KEY,
  "reportDate"        DATE NOT NULL UNIQUE,
  "productsCreated"   INTEGER DEFAULT 0,
  "soldOutApplied"    INTEGER DEFAULT 0,
  "messagesReviewed"  INTEGER DEFAULT 0,
  "messagesSkipped"   INTEGER DEFAULT 0,
  "totalMarginUSD"    NUMERIC(10,2) DEFAULT 0,
  "reportData"        JSONB,
  "telegramReportText" TEXT,
  "sentAt"            TIMESTAMPTZ,
  "deliveryStatus"    TEXT DEFAULT 'pending',
  "createdAt"         TIMESTAMPTZ DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ DEFAULT now()
);

-- ── supplier-trust-scores ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "supplier_trust_scores" (
  id                    SERIAL PRIMARY KEY,
  "sellerTelegramId"    BIGINT NOT NULL UNIQUE,
  "sellerUsername"      TEXT,
  "trustScore"          INTEGER DEFAULT 50,
  "trustLevel"          TEXT DEFAULT 'normal',
  "productsCreated"     INTEGER DEFAULT 0,
  "totalPostsSeen"      INTEGER DEFAULT 0,
  "soldOutAccuracy"     NUMERIC(5,2),
  "duplicateRate"       NUMERIC(5,2),
  "lastSeenAt"          TIMESTAMPTZ,
  "createdAt"           TIMESTAMPTZ DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ DEFAULT now()
);

-- ── supplier-group-memory ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "supplier_group_memory" (
  id                  SERIAL PRIMARY KEY,
  "telegramGroupId"   BIGINT NOT NULL UNIQUE,
  "groupName"         TEXT,
  "formatPattern"     TEXT,
  "pricingStyle"      TEXT,
  "timingPattern"     TEXT,
  "commonBrands"      TEXT[],
  "commonCategories"  TEXT[],
  "averageMargin"     NUMERIC(8,2),
  "reliability"       INTEGER DEFAULT 50,
  observations        TEXT,
  "lastUpdated"       TIMESTAMPTZ DEFAULT now(),
  "createdAt"         TIMESTAMPTZ DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ DEFAULT now()
);

-- ── supplier-seller-memory ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "supplier_seller_memory" (
  id                    SERIAL PRIMARY KEY,
  "sellerTelegramId"    BIGINT NOT NULL UNIQUE,
  "sellerUsername"      TEXT,
  "sellerDisplayName"   TEXT,
  "postingStyle"        TEXT,
  "reliabilityScore"    INTEGER DEFAULT 50,
  "typicalCategories"   TEXT[],
  "typicalPriceRange"   TEXT,
  "commonTerms"         TEXT[],
  "flaggedBehaviors"    TEXT[],
  "trustLevel"          TEXT DEFAULT 'normal',
  "teacherNotes"        TEXT,
  "isManual"            BOOLEAN DEFAULT false,
  "createdAt"           TIMESTAMPTZ DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ DEFAULT now()
);

-- ── supplier-language-memory ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "supplier_language_memory" (
  id              SERIAL PRIMARY KEY,
  term            TEXT NOT NULL UNIQUE,
  meaning         TEXT NOT NULL,
  context         TEXT,
  "supplierScope" TEXT,
  confidence      INTEGER DEFAULT 80,
  "isManual"      BOOLEAN DEFAULT false,
  "teacherId"     TEXT,
  "usageCount"    INTEGER DEFAULT 0,
  "createdAt"     TIMESTAMPTZ DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ DEFAULT now()
);

-- ── supplier-correction-memory ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "supplier_correction_memory" (
  id                          SERIAL PRIMARY KEY,
  "originalClassification"    TEXT NOT NULL,
  "correctedClassification"   TEXT NOT NULL,
  "originalText"              TEXT,
  "correctionReason"          TEXT,
  "messageId"                 BIGINT,
  "groupId"                   BIGINT,
  "appliedToFuture"           BOOLEAN DEFAULT true,
  "createdAt"                 TIMESTAMPTZ DEFAULT now()
);

-- ── supplier-scout-settings (global — single row) ─────────────────────────
-- Payload globals use the "globals" table or a dedicated table depending on version.
-- If Payload uses a single globals table: no DDL needed (Payload handles it).
-- If Payload creates a dedicated table, add:
-- CREATE TABLE IF NOT EXISTS "supplier_scout_settings" ( ... );
-- Check after first deploy and adjust as needed.
```

### Also required: add `supplier_scout` to Products source enum
The `Products.ts` file was modified (D-278) to add `supplier_scout` as a valid source value and a `supplierMeta` group field. If the `source` column on the `products` table is a Postgres enum, run:
```sql
ALTER TYPE products_source_enum ADD VALUE IF NOT EXISTS 'supplier_scout';
```
If it is a plain TEXT column, no DDL needed.

---

## Environment Variables Required

Add to Vercel project settings (Environment: Production + Preview):

| Variable | Description |
|----------|-------------|
| `SUPPLIER_SCOUT_BOT_TOKEN` | BotFather token for the SupplierScout bot |
| `SUPPLIER_SCOUT_WEBHOOK_SECRET` | Random secret for Telegram webhook verification (set in BotFather setWebhook) |
| `SUPPLIER_SCOUT_ADMIN_SECRET` | Secret for the `?secret=` param on GET cron endpoint |

---

## Vercel Cron Configuration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/supplier-scout?action=daily_report&secret=SUPPLIER_SCOUT_ADMIN_SECRET",
      "schedule": "30 20 * * *"
    }
  ]
}
```

Note: 20:30 UTC = 23:30 Istanbul (UTC+3). Adjust for DST if needed (Turkey does not observe DST — UTC+3 year-round).

---

## Activation Sequence

1. Apply Neon DDL above
2. Set 3 env vars in Vercel
3. Deploy to production
4. Register webhook: `GET /api/supplier-scout?action=register_webhook&secret=SUPPLIER_SCOUT_ADMIN_SECRET`
5. Start bot DM: send `/start` to the SupplierScout bot — this registers Frank's chatId
6. Add a test group to `supplier-groups` collection in admin (isActive=true, autoCreateEnabled=false first)
7. Verify health: `GET /api/supplier-scout?action=health`
8. Watch a few messages come through as `review_needed` before turning on `autoCreateEnabled`

---

## What SupplierScout Does NOT Touch

- `/api/telegram` — Uygunops/GeoBot webhook (completely separate)
- `TELEGRAM_BOT_TOKEN` — Uygunops bot (never read by supplierScout)
- `GEOBOT_TOKEN` — GeoBot (never read by supplierScout)
- Existing product creation flows (wizard, manual admin, GeoBot)
- Pricing, dispatch, order fulfillment logic
- Any existing Payload collections outside the 9 new ones
- Mentix image pipeline

---

## Known Risks / Watch Points

| Risk | Mitigation |
|------|-----------|
| Gemini rate limits | Heuristic fallback; low temperature reduces retries |
| False positive product creation | Auto-create gate (9 conditions); start with autoCreateEnabled=false per group |
| Duplicate products from same offer | Duplicate check: title LIKE + seller + 7 day window |
| Sold-out mis-match (wrong product marked soldout) | Score threshold 80 for auto-apply; 50-79 sends DM to Frank |
| Neon push:true creating wrong schema | Manual DDL required — do not rely on push:true |
| Telegram 5s timeout | Fire-and-forget async processing pattern |
