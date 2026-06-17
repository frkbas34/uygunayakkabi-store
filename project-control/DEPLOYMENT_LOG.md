# DEPLOYMENT LOG — Uygunayakkabi

_Created 2026-06-14. Newest first. Each deploy = fast-forward git push to `main` → Vercel production build._

## 2026-06-18
- **D-324** — _production DATA op (no code deploy):_ Admin unpublished placeholder product id 361 `Taslak Ürün 16/06-4184` (`status active → draft`). No git/code change; docs-only commit `docs: record D-324 catalog hygiene`.

## 2026-06-14
- _docs-only commits (no runtime/deploy impact):_ `0f46017` D-308→D-321 project-memory sync; D-322 test-lead-cleanup record (this commit).
- `9a8001b` — **D-320** `/api/inquiries` productId string→number coercion (product-page lead HTTP 500 fix). Deployed; live re-test passed.
- `fd5fbc1` — **D-318** PDP trust-strip claim cleanup ("Hızlı Geri Dönüş/Teslimat" → "WhatsApp Destek / Kargo Süreci").
- `0d004b7` — **D-317** PDP footer dynamic year + removed unsupported "hızlı kargo" claim.
- `c944940` — **D-316A** internal `trackEvent` foundation (no external pixels/scripts).
- `55fad8b` — **D-315** first-touch UTM attribution (sessionStorage) survives homepage→PDP + hero/sticky WhatsApp prefill.
- `003c71f` — **D-314/D-314b** ad-readiness cleanup (external Unsplash removed, duplicate WhyUs removed, About shortened, editorial→gradient, safer tiles, typo, unused-code removal).
- `0899e0f` — **D-313** demo reviews OFF in production.
- `ef5055b` — **D-310/311/312** full-width editorial section + "Tarzına Göre Seç" tiles + social-proof section + premium footer.
- `1e2e862` — **D-304→D-308** Phase 1 conversion upgrade + PDP polish.
- `507608a` — **D-302/D-303** product-card image bg/contain + image-gen studio/74–80%/suede standard.

_Telegram live publishing remains OFF; Instagram feed publishing OFF in AutomationSettings (`publishInstagram=false`)._
