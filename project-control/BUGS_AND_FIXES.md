# BUGS & FIXES — Uygunayakkabi

_Created 2026-06-14. Newest at top. No secrets/PII._

## D-320 — Product-linked inquiry submission HTTP 500 (FIXED + DEPLOYED)
- **Symptom:** Product detail lead form returned "Talebiniz gönderilemedi" (HTTP 500); a diagnostic POST *without* productId succeeded (200); 0 stored leads had a product linked.
- **Root cause:** `ContactForm` sends `productId={String(product.id)}` (string); `products` ids are numeric; `/api/inquiries` passed the string straight to the numeric `product` relationship → `payload.create` threw → 500.
- **Fix:** `/api/inquiries` coerces `productId` string→number (fail-soft to `undefined` on NaN/empty). Commit `9a8001b`, deployed to `main` 2026-06-14.
- **Verified (D-322, 2026-06-14):** admin confirmed the D320 lead (id 11) persisted the `product` relation ("Erkek siyah loafer") AND UTM (`utmSource=d320_test`, `utmMedium=cpc`, `utmCampaign=d320_retest`). Fix confirmed end-to-end.
- **Not a bug:** UTM columns store correctly (verified D-319); the `product` FK column already exists — **no migration needed**.

## Known / open
- Products collection hard-delete returns HTTP 500 (server hook/constraint) — not yet investigated; products are hidden via `draft` instead.
- **Cleanup (D-322, 2026-06-14):** D319 (id 10) + D320 (id 11) test leads marked `status=spam` (reversible — out of the active/new funnel; NOT hard-deleted, per the permanent-deletion guardrail). Operator may hard-delete ids 10/11 in Admin → Customer Inquiries if full removal is wanted.
