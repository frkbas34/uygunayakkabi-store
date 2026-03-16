# Runbook: Stock Mismatch

_Category: product-data | Severity: MEDIUM | Debugger: product-flow-debugger + sql-toolkit_

---

## Symptom
Stock quantity shown in admin / storefront does not match expected real-world inventory.

## Diagnostic Sequence

### Step 1 — Check DB record
```sql
SELECT p.id, p.title, p.stock_quantity, v.size, v.stock
FROM products p
LEFT JOIN variants v ON v.product_id = p.id
WHERE p.title ILIKE '%PRODUCT_NAME%';
```

### Step 2 — Check InventoryLogs
```sql
SELECT * FROM inventory_logs
WHERE product_id = 'PRODUCT_ID'
ORDER BY created_at DESC
LIMIT 20;
```
This shows all stock change history. Look for unexpected entries.

### Step 3 — Check Telegram STOCK command
Was a stock update sent via Telegram in the format:
```
STOCK SKU: TG-NIK-XXXX
42 -1
43 +2
```
If yes → check /api/telegram handler applied it correctly.

### Step 4 — Check automation intake
If product was created via automation, check:
```sql
SELECT automation_meta FROM products WHERE id = 'PRODUCT_ID';
```
Was `stock_quantity` set at creation time?

### Step 5 — Check variant vs product stock
Products have `stock_quantity` at root level AND variants have `stock`.
Which is the storefront using? Confirm in page.tsx.

## Common Root Causes
| Root Cause | Fix |
|-----------|-----|
| Telegram STOCK command misapplied | Check InventoryLogs, correct via admin |
| Variant stock not updated | Update via admin Variants tab |
| Automation created product with stock=0 | Admin → edit stock_quantity |
| Wrong size line parsed | Check original Telegram message |

## Resolution Record Template
```json
{
  "incident": "stock-mismatch",
  "product_id": "",
  "expected_stock": 0,
  "actual_stock": 0,
  "root_cause": "",
  "evidence": [],
  "fix_applied": "",
  "resolved_at": ""
}
```
