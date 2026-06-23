# D-342 — Pre-Product / Pre-Ads Readiness Package (rev. 2)

**Purpose:** When real sales products are uploaded (~1–2 weeks), go from *product intake → ad-ready campaign* in **24–48 h**. Planning/templates only — **no ad launch, no posts, no autonomous spend, no repo/browser changes in the package context.**

**Anchors:** `uygunayakkabi.com` (PDP `/products/<slug>`) · WhatsApp **0533 152 48 43** · `info@uygunayakkabi.com` · Shopier `shopier.com/Uygunayakkabii` · Active channels: **Website / Instagram / Facebook / X / Shopier** (Dolap/Threads retired) · Flow: **Telegram intake → Payload `draft` → review → operator-activated** (guard: price + image + effective stock + active target + brand-safety) · Standing rules: own-products only · **no third-party brand/logo/authenticity claims** · **no prices in organic IG/X/FB** (prices allowed on PDP, Shopier, WhatsApp, and paid ads **only if intentionally approved**) · no fake/demo reviews live · manual ads only.

## 1. Product Upload Readiness Checklist (per product)
| # | Item | Pass condition |
|---|------|----------------|
| 1 | Title | Descriptive, **generic** (no brand names) |
| 2 | Category | Set (Klasik/Günlük/Spor/Bot/Terlik/Cüzdan) |
| 3 | Price | > 0, ₺, realistic (guard blocks ≤0) |
| 4 | Stock / sizes | Effective stock > 0; size variants set |
| 5 | Original photo | ≥1 real image (guard blocks none) |
| 6 | Generated photo (if needed) | Marketing only; never auto-added to PDP for brand-sensitive items |
| 7 | Status path | `draft → review → active` (operator approves) |
| 8 | Brand/material/authenticity safety | Title+brand+desc+captions pass brand-safety (no brand, "logo","orijinal","replica",model #) |
| 9 | PDP URL | `/products/<slug>` returns 200 when active |
| 10 | Shopier sync/link | If used: listing + link captured |
| 11 | WhatsApp CTA | "WhatsApp'tan Bilgi Al", size-prefilled |
| 12 | UTM-ready URL | Builds with `utm_source=meta&utm_medium=paid_social&utm_campaign=<name>` |

**Sign-off:** ready when 1–9 + 11–12 ✅ and brand-safety ✅.

## 2. PDP / Storefront QA Checklist
Mobile gallery (swipe/thumbnails/lightbox) · title/price/stock/sizes correct · size chips + OOS prefill · product guide/GEO + "Benzer Modeller" render · WhatsApp sticky CTA (size-prefilled) · Shopier CTA works (if used) · **shipping/payment/returns wording honest & non-committal**: "Türkiye geneli kargo"; payment via Shopier güvenli ödeme / mevcut ödeme seçenekleri; değişim/iade koşulları WhatsApp üzerinden netleştirilir — **no fixed return days, no unconfirmed kapıda-ödeme promise** · **zero third-party brand/logo claims** · **no demo/fake reviews live** · hero `fetchPriority=high`, below-fold lazy, no 500s.

## 3. Ads Readiness Checklist (gate — all ✅ before any ad)
1. Product **active** · 2. **PDP returns 200** · 3. Shopier link works (if used) · 4. Clean visuals (no logos in image) · 5. **No #362/New Balance refs** anywhere · 6. UTM correct (`meta`/`paid_social`/`<campaign>`) · 7. UTM capture verified (test click → inquiry shows `utm_campaign`) · 8. Campaign created **paused**, go-live manual · 9. **No autonomous spend** · 10. Final brand-safety + honest-wording pass.
> Meta account `1446226756366069`: **no campaigns, 0 spend** — clean slate.

## 4. Campaign Template
**Price rule:** organic IG/X/FB = **no price**. Price may appear in **paid Meta ads, PDP, Shopier, WhatsApp** only when intentionally approved.

**Meta primary text (paid):** `{Stil + konfor bir arada.} Süet/deri/püsküllü loafer — günlük & şık. Numaranı seç, WhatsApp'tan bilgi al 👇 {PDP_URL+UTM}` *(price optional, only if approved)*
**Headline (≤40):** `{Yeni Sezon Loafer} · Uygun Fiyat` · **Description (≤30):** `Numaranı sor, hızlı dönüş`
**IG caption (no price):** `Günlük şıklığın yeni adresi 👞 Süet/deri detaylar, rahat taban. Beden/bilgi için WhatsApp 👉 0533 152 48 43  #ayakkabi #loafer #erkekayakkabi #günlükstil`
**FB caption (no price):** `Üreticiden, aracısız. 📦 Türkiye geneli kargo. Beğendiğin modeli seç, WhatsApp'tan beden/bilgi al. {PDP_URL+UTM}`
**X (no price, ≤280):** `Yeni sezon loafer modelleri stokta. Süet & deri, rahat taban. Beden/bilgi için WhatsApp 👉 {PDP_URL+UTM}`
**WhatsApp first reply:** `Merhaba! 👋 Hangi model ve beden ilgilendiğinizi yazarsanız stok ve fiyatı hemen ileteyim.`
**UTM naming:** `utm_campaign={season}_{producttype}_{test}` → e.g. `2026q3_loafers_test` (stable per push).
**Daily note:** `Date|Campaign|Status|Spend ₺|Reach|Clicks|Leads(utm)|WA inquiries|Top product|Notes|Decision(manual)`

## 5. WhatsApp Sales Script Pack (Türkçe)
1. **İlk talep:** `Merhaba! 👋 Hangi modeli ve numarayı düşünüyorsunuz? Stok ve fiyatı hemen ileteyim.`
2. **Fiyat:** `{Model} şu an ₺{fiyat}. Türkiye geneli kargo ile gönderiyoruz. Numaranızı alıp süreci başlatalım mı?`
3. **Bedenler:** `{Model} için stokta: {40,41,42…}. Hangi numarayı ayıralım?`
4. **Ödeme / Shopier:** `Ödeme: Shopier güvenli ödeme linki veya mevcut ödeme seçenekleri üzerinden ilerleyebiliriz. İsterseniz Shopier linkini göndereyim: {shopier_link}`
5. **Kargo:** `Onaydan sonra {1–3} iş günü içinde kargoya veriyoruz. Türkiye geneli gönderim var. 📦`
6. **İade / değişim:** `Değişim/iade koşullarını ürün kullanılmamış ve kutusunda olmak şartıyla WhatsApp üzerinden netleştiriyoruz.`
7. **Tükendi:** `Bu model {bu numarada} tükendi 😔 Yakında benzeri gelecek; haber vereyim mi, ya da alternatif önereyim 👇`
8. **Öneri:** `Tarzınıza göre: {Model A} (klasik) veya {Model B} (günlük). Hangisini detaylandırayım?`
> Hiçbir yanıtta marka adı / "orijinal" / "logo" kullanmayın. Onaylanmamış kargo/ödeme/iade sözü vermeyin.

## 6. First 7-Day Launch Plan
- **Day 0 — Upload:** Telegram intake, fill all §1 fields, leave `draft`.
- **Day 1 — QA + activate:** §2 PDP QA + §1 sign-off → operator-activate (guard passes) → set Shopier links.
- **Day 2 — Campaign packs:** build §4 per product, clean visuals, UTM URLs, create campaigns **paused**.
- **Day 3 — Small manual ads:** pass §3 gate → operator launches **small** budget on 1–2 best.
- **Day 4–7 — Monitor:** daily §4 note; watch leads/WhatsApp/spend; pause losers, nudge winners (manual).

## 7. Pending Blockers
| Blocker | Status | Next step |
|---|---|---|
| Facebook legacy cleanup | ⏳ PENDING | Retry in fresh/stable browser, or operator deletes manually (X log as reference) |
| Meta Ads campaign | Not created (intentional) | Create only when active + §3 passes; manual launch |
| Product catalog | Not ready | Products in ~1–2 weeks → Day 0 |
| FB renderer/access | Environment, not logic | Fresh session / confirmed extension site-access |

## 8. Snapshot (as of this document)
- **Repo/Vercel:** clean, deployed at `b89ef17` (Production Ready).
- **Shopier / storefront:** clean.
- **Product #362:** draft + brand-safety blocked (not visible).
- **Meta Ads:** no campaign created, spend 0 — clean slate.
- **X:** 19 risky legacy brand posts deleted; visible timeline clean/ambiguous.
- **Facebook:** legacy cleanup **pending** (top New Balance post verified; likely mirrors old X backlog).
- **Products for the push:** expected in ~1–2 weeks. **No ads now.**

**Go definition (launch only when ALL ✅):** active ✅ · PDP 200 ✅ · brand-safe ✅ · clean visuals ✅ · WhatsApp + Shopier CTAs work ✅ · UTM tested ✅ · campaign created **paused** ✅ · **Facebook legacy cleanup either completed or explicitly accepted as pending risk before paid traffic** ✅ → then operator manually turns on a small budget.
