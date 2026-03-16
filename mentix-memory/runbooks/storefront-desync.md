# Runbook: Storefront Desync

_Category: frontend | Severity: MEDIUM | Debugger: product-flow-debugger + uptime-kuma_

---

## Symptom
Storefront shows stale/wrong data — e.g., old price, old product name, deleted product still showing, or SiteSettings not reflecting admin changes.

## Diagnostic Sequence

### Step 1 — Check force-dynamic
page.tsx must have `export const dynamic = 'force-dynamic'`
If missing → Vercel static cache serves old page.

### Step 2 — Check Vercel deployment
Is the current deployment the latest?
GET https://uygunayakkabi.com → view source → check build ID or timestamp.
If stale → trigger redeploy from Vercel dashboard.

### Step 3 — Check DB directly
```sql
SELECT title, price, status, updated_at FROM products WHERE id = 'PRODUCT_ID';
```
Does DB match what admin shows? If yes → DB is correct, problem is rendering/caching.
If DB is also wrong → data write issue, not a frontend issue.

### Step 4 — Check SiteSettings
```sql
SELECT * FROM site_settings LIMIT 1;
```
If empty or outdated → SiteSettings global not saved in admin.
Frontend falls back to DEFAULT_SETTINGS — check `site-settings-data-flow.md`.

### Step 5 — Check ENABLE_STATIC_FALLBACK
In page.tsx: must be `false`.
If `true` → static 39-product array overrides DB entirely.

### Step 6 — Check n8n or automation side effects
Did an automation recently update a product in an unexpected way?
```sql
SELECT title, updated_at, source FROM products ORDER BY updated_at DESC LIMIT 10;
```

## Common Root Causes
| Root Cause | Fix |
|-----------|-----|
| Missing force-dynamic | Add to page.tsx, redeploy |
| ENABLE_STATIC_FALLBACK = true | Set to false, redeploy |
| SiteSettings not populated | Fill in admin and save |
| Stale Vercel build | Trigger redeploy |
| DB write didn't commit | Check Neon connection, retry save |

## Resolution Record Template
```json
{
  "incident": "storefront-desync",
  "affected_data": "",
  "expected_value": "",
  "actual_value": "",
  "root_cause": "",
  "fix_applied": "",
  "resolved_at": ""
}
```
