# BUGS & FIXES — Uygunayakkabi

_Created 2026-06-14. Newest at top. No secrets/PII._

## D-332R/D-333/D-333T — Manual `#geohazirla` produced no report (OPEN — Uygunops webhook delivery/config)
- **D-333T (2026-06-19):** operator re-sent `#geohazirla 359` as a DM to **@Uygunops_bot** → STILL no report and no bot-event (`anyEventToday=false`; newest activity 2026-06-16, all `geo_auto`). **"Wrong bot" RULED OUT.**
- **Inference:** the #geohazirla handler creates a draft report row + sends a "starting" Telegram reply BEFORE any work; neither occurred → the Telegram update never reached the handler. Likely **Uygunops webhook delivery/config**: webhook url unset/incorrect, OR secret mismatch (`TELEGRAM_WEBHOOK_SECRET` prod ≠ Telegram's → route 401), OR delivery erroring. No Telegram-webhook-driven activity since 2026-06-16. (Sub-branch: if @Uygunops_bot replied "başlatıldı/starting" but no report → `createProductIntelligenceReport` runtime fail instead.)
- **Smallest next (no change):** operator runs Telegram **getWebhookInfo** on the Uygunops bot → inspect `url`, `pending_update_count`, `last_error_date`/`last_error_message`. Claude can't (token-in-URL prohibited).
- **Fix (D-333A, with approval, config only):** re-register Uygunops webhook to `https://<prod-domain>/api/telegram` with the matching secret header; OR correct the secret. No code change — D-333 verified handler/parser/gates are correct.
- **Workaround now:** PI reports still generate automatically via the server-side `geo_auto` bridge during normal content generation.
- **Symptom:** Operator sent `#geohazirla 359` (2026-06-19); no new `product-intelligence-reports` row and no `bot-events` were created. The only 359 report is id 43 (trigger `geo_auto`, 2026-06-09). Across the whole table every PI report is `geo_auto`; no manual-triggered report has ever existed. Newest bot-event of any kind = 2026-06-16 (product 361).
- **Inference (not yet root-caused):** the manual Telegram PI command isn't reaching/executing the prod pipeline. Candidates: GEO bot token/webhook (`TELEGRAM_GEO_BOT_TOKEN`/`TELEGRAM_GEO_WEBHOOK_SECRET`) not configured or webhook not registered in prod; command sent to a bot/chat not wired to `/api/telegram`; or the PI command path gated/disabled. PI currently runs ONLY via the GeoBot auto-bridge (`resolvePiResearch`).
- **Impact:** low for now — the auto-bridge already produces reports during content generation; but on-demand `#geohazirla` review of a single product is not available.
- **D-333 narrowed (2026-06-19, read-only):** `#geohazirla` is owned by Uygunops (@Uygunops_bot); GeoBot redirects PI hashtags. Parser accepts `#geohazirla 359`. Live cfg `telegram.groupEnabled=true`, `allowedUserIds` empty (=open) → not blocking. RULED OUT: format, group-disabled, allowlist, DM-auth. REMAINING: (a) wrong bot (sent to GeoBot → redirected, no report) or (b) Uygunops webhook not delivering in prod. No manual-triggered report has ever existed; handler creates a draft row early yet none exists today → message never reached handler. getWebhookInfo not run (token-in-URL prohibited). **Fix path:** operator re-send `#geohazirla 359` as DM to @Uygunops_bot → if works, was wrong-bot (no fix); if silent → re-register Uygunops webhook to `https://<prod-domain>/api/telegram` w/ matching secret (config action). No code change indicated.

## D-332R — Reverse-image evidence absent in PI reports (OPEN, env/provider gap)
- **Symptom:** Report 43 (and the pipeline generally) returns `referenceProducts = 0`; `rawProviderData` has only `gemini`. No GoogleVision/DataForSEO/SerpAPI reverse-search results → `matchType=low_confidence`, `exactProductFound=false`.
- **Cause (inferred):** reverse-search provider creds not set in Vercel prod (`GOOGLE_VISION_API_KEY` / `DATAFORSEO_LOGIN+PASSWORD` / `SERPAPI_API_KEY`) and/or historical DataForSEO Organic-SERP 403. Pipeline is fail-soft so reports still generate (Gemini vision + SEO/GEO text are strong).
- **Impact:** SEO/GEO TEXT quality is high; only external market/competitor evidence + exact-match detection is missing.
- **Next:** D-333 (optional) — enable a reverse-search provider in Vercel if competitor evidence is wanted before scaling GEO.

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
