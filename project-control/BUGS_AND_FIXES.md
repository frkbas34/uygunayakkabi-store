# BUGS & FIXES — Uygunayakkabi

_Created 2026-06-14. Newest at top. No secrets/PII._

## D-320 — Product-linked inquiry submission HTTP 500 (FIXED + DEPLOYED)
- **Symptom:** Product detail lead form returned "Talebiniz gönderilemedi" (HTTP 500); a diagnostic POST *without* productId succeeded (200); 0 stored leads had a product linked.
- **Root cause:** `ContactForm` sends `productId={String(product.id)}` (string); `products` ids are numeric; `/api/inquiries` passed the string straight to the numeric `product` relationship → `payload.create` threw → 500.
- **Fix:** `/api/inquiries` coerces `productId` string→number (fail-soft to `undefined` on NaN/empty). Commit `9a8001b`, deployed to `main` 2026-06-14.
- **Verified:** live controlled re-test — product-linked submission now returns success. Admin-side stored-field confirmation pending (needs login).
- **Not a bug:** UTM columns store correctly (verified D-319); the `product` FK column already exists — **no migration needed**.

## Known / open
- Products collection hard-delete returns HTTP 500 (server hook/constraint) — not yet investigated; products are hidden via `draft` instead.
- Cleanup owed: test leads **"D319 Test Lead"** + **"D320 Test Lead"** should be deleted from Admin → Customer Inquiries.
