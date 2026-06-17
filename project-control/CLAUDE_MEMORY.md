# CLAUDE MEMORY — Uygunayakkabi (continuation summary)

_Created 2026-06-14. Compact handoff for future sessions. See PROJECT_STATE.md / DECISIONS.md / DEPLOYMENT_LOG.md / BUGS_AND_FIXES.md for detail. No secrets/PII._

## Where things stand (2026-06-18)
- D-302 → D-320 are all merged to `main` and deployed (Vercel): an ad-readiness + conversion sweep (cards, hero, editorial section, category tiles, social proof, footer, claim cleanup) plus a lead-flow fix.
- **D-320 just shipped:** `/api/inquiries` now coerces `productId` string→number — product-page lead submissions (previously 500-ing) work again. Commit `9a8001b`; live re-test passed.
- **D-324 (2026-06-18) — catalog hygiene:** the single visible placeholder product `Taslak Ürün 16/06-4184` (id 361, ₺4.000, "Son 1 Adet!") was unpublished via Admin (`status: active → draft`). No rename, no delete, no code change, no external publishing (Products afterChange hooks fire only on `→ active`). Homepage verified clean; 6 real products remain active.

## Active facts to remember
- Storefront = `src/app/(app)/UygunApp.jsx` (SPA). Active product card = its `Card`. `src/components/ProductCard.tsx`/`ProductGrid.tsx` are DEAD — don't edit. **Do NOT add WhatsApp icon buttons to product cards.**
- PDP = SSR `src/app/(app)/products/[slug]/page.tsx`. PDP footer = `src/components/StorefrontFooter.tsx` (separate from the SPA footer).
- Social-proof reviews are DEMO; `DEMO_REVIEWS_ENABLED=false` in prod (soft summary card only — never present fake reviews/counts).
- Attribution: `src/lib/attribution.ts` (first-touch UTM) + `src/lib/trackEvent.ts` (internal, no external pixels). No GA4/Meta/TikTok pixels — D-316B pending operator approval + KVKK decision.
- Push workflow: code on a feature branch in worktree `C:\Users\W11\Desktop\uygunayakkabi-website-sweep`; fast-forward push to `main` via `git -c credential.helper=manager`.

## Open / pending
- D-324 (2026-06-18): only ONE active placeholder existed (id 361). The other 16 `Taslak Ürün …` products were already `draft`. Telegram intake still mints `Taslak Ürün …` drafts — they stay `draft` (hidden) until promoted to `active`, so this can recur if one is ever published prematurely.
- D-322 (2026-06-14): D-320 verified end-to-end (product FK + UTM persisted in DB). D319/D320 test leads (id 10/11) marked `status=spam` (reversible; not hard-deleted per deletion guardrail — operator may hard-delete if wanted).
- Products hard-delete returns 500 (uninvestigated).
- D-316B external ad pixels — awaiting operator approval + consent/KVKK decision.

## Standing rule (operator, 2026-06-14)
After each Uygunayakkabi D-task, update the project-control memory files: PROJECT_STATE / DECISIONS / TASK_QUEUE / BUGS_AND_FIXES / DEPLOYMENT_LOG / CLAUDE_MEMORY. No secrets/PII; record only what actually happened.
