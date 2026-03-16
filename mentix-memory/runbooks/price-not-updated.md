# Runbook: Price Not Updated

_Category: product-data | Severity: MEDIUM | Debugger: product-flow-debugger + sql-toolkit_

---

## Symptom
A product price was changed in admin or via automation but the storefront or admin still shows the old price.

## Diagnostic Sequence

### Step 1 — Check DB directly
```sql
SELECT id, title, price, original_price, updated_at FROM products WHERE id = 'PRODUCT_ID';
```
Does DB match what the admin shows?
If DB = new price but storefront shows old → caching/rendering issue.
If DB = old price → the write didn't commit.

### Step 2 — Check admin save
Was the product actually saved after editing the price?
The save button must be clicked. Check `updated_at` in DB — did it change?

### Step 3 — Check automation override
If product was created via Telegram automation, could an automation re-run have reset the price?
```sql
SELECT automation_meta, updated_at FROM products WHERE id = 'PRODUCT_ID' ORDER BY updated_at DESC;
```

### Step 4 — Check price validation
Products.ts has a price validation gate: price must be > 0 to activate.
If price was set to 0 or negative → beforeChange hook may have blocked the save.
Check Payload admin for any save error messages.

### Step 5 — Check storefront caching
GET https://uygunayakkabi.com → hard refresh (Ctrl+Shift+R)
If new price appears after hard refresh → browser cache issue, not a data issue.
Confirm page.tsx has `force-dynamic`.

### Step 6 — Check price parsing (automation-created products)
If price came from Telegram caption:
- Was ₺ / TL / lira format parsed correctly?
- Check `automationMeta.parseWarnings` for price-related warnings
- Check `automationMeta.parseConfidence` — was price reliably extracted?

## Common Root Causes
| Root Cause | Fix |
|-----------|-----|
| Admin save not clicked | Save the record again |
| Price = 0 blocked by hook | Set valid price, save |
| Automation re-ran and reset price | Check n8n for duplicate trigger |
| Caption price parsing failed | Edit price manually in admin |
| Stale Vercel build | Redeploy |

## Resolution Record Template
```json
{
  "incident": "price-not-updated",
  "product_id": "",
  "expected_price": 0,
  "actual_price_db": 0,
  "actual_price_storefront": 0,
  "root_cause": "",
  "fix_applied": "",
  "resolved_at": ""
}
```
