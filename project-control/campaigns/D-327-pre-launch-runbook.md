# D-327 — Pre-Launch Readiness + Lead-Response Runbook

_Created 2026-06-18. Operational prep so the first UTM-only paid test (`first_loafers_test`) does not waste traffic. No runtime/code/DB/product changes made. Audit + runbook only._

## 1. Stock readiness (verified live via Admin API, depth=2)
| id | title | price (PDP) | sizes | stock/size | total | enough for small test? |
|---|---|---|---|---|---|---|
| 359 | Premium Kahve Püsküllü Loafer | ₺2.099 | 40–44 | 2 each | **10** | Yes for a small test — thin; restock before scaling |
| 355 | Siyah Rugan Püsküllü Loafer | ₺2.099 | 40–44 | 2 each | **10** | Yes — thin |
| 354 | Siyah Tokalı Püsküllü Loafer | ₺2.099 | 40–44 | 2 each | **10** | Yes — thin |
| 353 | Erkek siyah loafer (backup) | ₺1.899 | 40–43 | 1 each | **4** | Backup only — too thin to scale; **size 44 missing** |

All four `status=active`, HTTP 200. Popular sizes (42/43) sell out after **2 orders** — monitor closely during the test.

## 2. Landing readiness (3 primary ad PDPs)
| Check | 359 | 355 | 354 |
|---|---|---|---|
| PDP HTTP 200 | ✅ | ✅ | ✅ |
| AI images load (side/front/detail) | ✅ | ✅ | ✅ |
| WhatsApp CTA (wa.me/905331524843) | ✅ | ✅ | ✅ |
| Lead form (#inquiry-form) | ✅ | ✅ | ✅ |
| Shopier checkout path | ✅ | ✅ | ✅ |
| No placeholder/draft/test text | ✅ (0 hits) | ✅ | ✅ |
| No "orijinal marka" claim | ✅ | ✅ | ✅ |
| **No brand/trademark wording** | ⚠️ | ⚠️ | ⚠️ |

**⚠️ Brand-name leak (SHOULD-FIX-BEFORE-ADS):** the **"Benzer Modeller"** similar-products rail on all 3 ad PDPs surfaces **"Louis Vuitton Loafer Bej"** (product 358, same `Klasik` category) — "Louis Vuitton" text appears 4× per page. Our ad landing pages therefore display a trademarked brand + replica link. Fix = unpublish (`status:draft`) or rename product 358 (and ideally 349 BOSS) — **product-data change, needs explicit operator approval.** BOSS (349) is `Günlük`, so it does NOT leak onto these Klasik PDPs.

## 3. Lead-response runbook (manual sales)
**Response target:** reply within **15 minutes** during active-ad hours (aim <5 min); never later than same day. Paid clicks cool off fast.

**First response (WhatsApp, after inbound):**
> Merhaba! 👋 İlginiz için teşekkürler. Hangi model ve beden için bilgi almak istersiniz? Stok ve teslimatı hemen birlikte netleştirelim.

**Size availability (in stock):**
> [Model] için [beden] numara şu an mevcut. 👍 Siparişi oluşturalım mı? Adınız ve teslimat ilçenizi alabilir miyim?

**Payment / order next step:**
> Siparişi iki şekilde tamamlayabiliriz: Shopier güvenli ödeme bağlantısı ya da kapıda ödeme. Hangisi sizin için uygun? Onay sonrası kargo sürecini başlatıyoruz.

**If size unavailable:**
> [Beden] numara şu an tükenmiş. 🙏 [yakın beden]'imiz mevcut ya da kısa süre içinde tedarik edebiliriz — sizin için takip edip haber vereyim mi?

**If customer asks about shipping:**
> Siparişiniz onaylandıktan sonra kargoya veriyoruz ve kargo/teslimat bilgisini sizinle paylaşıyoruz. Kapıda ödeme seçeneği de mevcut. _(Belirli bir gün sözü vermeyin.)_

**No-reply follow-up (same day / next morning, ONE time):**
> Merhaba, [model] hâlâ ilginizi çekiyorsa beden ve stok durumunu birlikte netleştirebiliriz. Yardımcı olmamı ister misiniz? 🙂

_Style rules: no fake discount, no guaranteed delivery date, no fake review, no "orijinal marka", no brand claims._

## 4. Result tracking plan (judge the 5–7 day test)
**Daily metrics to record (simple sheet):** spend, impressions/reach, link clicks, link CTR, cost-per-link-click, landing-page views, **# WhatsApp chats started (manual count)**, **# form leads**, # orders, revenue.

**Where to read form leads:** Admin → **Customer Inquiries** (`uygunayakkabi.com/admin`), filter by date. Each ad lead carries `utm_source=meta`, `utm_campaign=first_loafers_test` (+ `utm_content`) and the **product relation** — so you know which product drove it.

**Count WhatsApp chats manually:** tally new inbound chats on the business line that arrive in the ad window or open with the prefilled "…ürünüyle ilgileniyorum" text; log a daily number.

**Recognize campaign leads:** form → UTM fields; WhatsApp → prefilled product message + timing.

**When to pause/swap a creative:** after **≥2–3 days** (post-learning), if a creative has high spend but ~0 leads — e.g. spent ≥ ₺300–400 with link CTR <0.5% and 0 chats/leads → pause or swap. Do NOT judge in the first 24–48h.

**Minimum signals before judging:** ~5–7 days AND ~₺1.000 total spend (or ~50–100 landing-page views per product). Headline metrics: **cost per WhatsApp chat**, **cost per form lead**, and any sales.

## 5. Risk checklist
**BLOCKER:** none that stop a tiny test.

**SHOULD FIX BEFORE ADS:**
- **Brand-name leak** — "Louis Vuitton Loafer Bej" (358) shown in Benzer Modeller on all 3 ad PDPs. Unpublish/rename 358 (+349) — needs operator approval.
- **Manual response speed** — commit to <15 min WhatsApp replies during ad hours, or pause ads outside staffed hours.
- **Thin stock** — 10 units/product (backup 353 only 4, missing size 44). OK for a small test; restock before scaling; pause a product if its sizes sell out.

**OPTIONAL LATER:**
- No Meta Pixel/GA4 (fine for UTM-only; add D-316B + KVKK before scaling).
- Hard-delete spam test leads ids 10/11 (currently `spam`-flagged — harmless).

**ALREADY OK (verified):**
- Trademark-risk products excluded from ad creative ✅ (D-326).
- Test leads spammed ✅ (D-322, ids 10/11 = spam).
- Placeholder products hidden ✅ (D-324/D-324B).
- 3 chosen ad product names safe/generic ✅.

## 6. Launch verdict
**READY for a small UTM-only test on operational + landing grounds — CONDITIONAL on:** (1) resolving the Louis Vuitton brand-leak on ad PDPs (recommend hide/rename 358, +349), and (2) committing to fast WhatsApp response. Stock is thin-but-acceptable for a small test; restock before any scale-up.
