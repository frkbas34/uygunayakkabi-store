# Runbook: Product Not Visible on Storefront

_Category: product-data | Severity: HIGH | Debugger: product-flow-debugger_

---

## Symptom
Product exists in Payload CMS admin but does not appear on uygunayakkabi.com storefront.

## Diagnostic Sequence

### Step 1 — Check product status (30 sec)
```sql
SELECT id, title, status, slug FROM products WHERE title ILIKE '%PRODUCT_NAME%';
```
Expected: status = 'active'
If draft or soldout → storefront intentionally hides it. Fix: activate via admin.

### Step 2 — Check storefront query
In page.tsx, confirm: `where: { status: { equals: 'active' } }`
If query is wrong → code bug, not data bug.

### Step 3 — Check static fallback
In page.tsx, confirm: `ENABLE_STATIC_FALLBACK = false`
If true → static layer may show different products. Fix: set to false.

### Step 4 — Check force-dynamic
In page.tsx, confirm: `export const dynamic = 'force-dynamic'`
If missing → Vercel may serve a cached/stale page.

### Step 5 — Check Vercel deployment
Is the latest code deployed? Check: uygunayakkabi.com → view page source → build timestamp or version.
Fix: redeploy from Vercel dashboard.

### Step 6 — Check price > 0
```sql
SELECT id, title, price FROM products WHERE id = 'PRODUCT_ID';
```
If price ≤ 0 → Products.ts beforeChange hook blocks activation.
Fix: set valid price > 0 in admin, then activate.

### Step 7 — Check DB connectivity
GET https://uygunayakkabi.com/api/globals/site-settings
If no response or timeout → Neon DB may be unreachable.

## Common Root Causes
| Root Cause | Fix |
|-----------|-----|
| status = draft | Admin → activate |
| price = 0 | Admin → set price > 0 then activate |
| ENABLE_STATIC_FALLBACK = true | Code fix |
| Stale Vercel build | Redeploy |
| DB connection down | Check Neon dashboard |

## Resolution Record Template
```json
{
  "incident": "product-not-visible",
  "product_id": "",
  "root_cause": "",
  "evidence": [],
  "fix_applied": "",
  "resolved_at": "",
  "confidence": 0.0,
  "recurrence": false
}
```
