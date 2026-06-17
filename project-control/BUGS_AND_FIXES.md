# BUGS & FIXES — Uygunayakkabi

_Created 2026-06-14. Newest at top. No secrets/PII._

## D-328 — Brand-name leak on ad landing pages (FIXED, data-only)
- **Symptom (found D-327):** the "Benzer Modeller" similar-products rail on all 3 ad PDPs (359/355/354) surfaced brand-named product 358 `Louis Vuitton Loafer Bej` (same `Klasik` category) → "Louis Vuitton" text 4× per ad landing page. 349 `BOSS Süet Loafer` (Günlük) was also active. Trademark/counterfeit ad-policy + landing-page review risk.
- **Fix (operator-approved):** set products 358 + 349 to `status: draft` via Admin API (active→draft). No rename, no delete. `active→draft` fires no publishing hooks. Reversible.
- **Verified live (cache-busted):** homepage + 359/355/354 PDPs = 0× "Louis Vuitton" / "BOSS"; Benzer Modeller rails render clean. Active set = exactly `[353,354,355,359]`.
- **Guard:** before ads, keep brand-named products non-`active`. Telegram intake or future edits could re-activate them — re-check active titles for brand names (Louis Vuitton, BOSS, Nike, Adidas, Gucci, etc.) before each campaign.

## D-320 — Product-linked inquiry submission HTTP 500 (FIXED + DEPLOYED)
- **Symptom:** Product detail lead form returned "Talebiniz gönderilemedi" (HTTP 500); a diagnostic POST *without* productId succeeded (200); 0 stored leads had a product linked.
- **Root cause:** `ContactForm` sends `productId={String(product.id)}` (string); `products` ids are numeric; `/api/inquiries` passed the string straight to the numeric `product` relationship → `payload.create` threw → 500.
- **Fix:** `/api/inquiries` coerces `productId` string→number (fail-soft to `undefined` on NaN/empty). Commit `9a8001b`, deployed to `main` 2026-06-14.
- **Verified (D-322, 2026-06-14):** admin confirmed the D320 lead (id 11) persisted the `product` relation ("Erkek siyah loafer") AND UTM (`utmSource=d320_test`, `utmMedium=cpc`, `utmCampaign=d320_retest`). Fix confirmed end-to-end.
- **Not a bug:** UTM columns store correctly (verified D-319); the `product` FK column already exists — **no migration needed**.

## D-324 — Placeholder product visible on storefront (FIXED, data-only)
- **Symptom:** Homepage rails (Yeni Gelenler / Çok Sorulan) showed `Taslak Ürün 16/06-4184` (id 361, ₺4.000, badge "Son 1 Adet!") — a Telegram-minted draft placeholder, not a real listing.
- **Root cause:** product id 361 had `status='active'` (the only one of 17 `Taslak Ürün …` rows that was active; the other 16 were already `draft`). Merchandising shows `status==='active'` products.
- **Fix:** Admin PATCH `/api/products/361` `status: active → draft`. Reversible; no rename, no delete, no code change. `active → draft` triggers NO publish hooks (Products afterChange dispatch fires only on `→ active`). Live homepage re-fetched: placeholder gone from all rails; 6 real products still active.
- **Guard for future:** before ad spend, confirm no `Taslak/Draft/Test/Placeholder/Deneme`-titled product is `active`. Query: `/api/products?where[status][equals]=active` and scan titles.

## Known / open
- Products collection hard-delete returns HTTP 500 (server hook/constraint) — not yet investigated; products are hidden via `draft` instead.
- **Cleanup (D-322, 2026-06-14):** D319 (id 10) + D320 (id 11) test leads marked `status=spam` (reversible — out of the active/new funnel; NOT hard-deleted, per the permanent-deletion guardrail). Operator may hard-delete ids 10/11 in Admin → Customer Inquiries if full removal is wanted.
