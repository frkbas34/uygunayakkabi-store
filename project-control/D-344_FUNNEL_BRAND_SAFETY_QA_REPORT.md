# D-344 — Funnel QA + Brand Safety Incident Report

_Status: OPEN — Facebook deletion pending fresh verification · Branch: `main` · HEAD at fix: `7749cd2` · Date: 2026-06-24_

> **Correction notice (2026-06-24):** An earlier draft of this report stated the Facebook Asics post had been "verified gone." That was incorrect/overconfident. A subsequent read-only inventory found the Asics post (and 7 other brand-risk posts) still live in the Business Suite 90-day window. The operator has since stated they manually deleted the 8 candidates, but fresh AI re-verification was blocked by browser permission denial. Facebook cleanup is therefore recorded below as **operator-deleted / pending fresh verification**, not verified-complete.

## 1. Executive Summary

- Lead / UTM / WhatsApp funnel QA passed (read-only / code-review verification).
- A live Asics third-party-brand product was discovered on the public storefront during QA.
- The incident was mitigated on Website, Payload, and Shopier (verified). On Facebook, an inventory later found 8 high-confidence brand-risk posts (incl. Asics); the operator reports manually deleting them, but AI re-verification is pending (see §6). X had 0 delete candidates.
- Brand-safety code was patched and deployed to production (`7749cd2`).
- No ads were launched.
- No product upload was performed.
- No lead was submitted during the QA.

## 2. Funnel QA Result

- **UTM capture and persistence: PASS.** First-touch attribution is captured client-side and persisted to `sessionStorage` (`uy_attr`), first-touch-wins, via `src/lib/attribution.ts` (`captureFirstTouch` / `getStoredAttribution`).
- **Homepage captures first-touch UTM.** `captureFirstTouch()` runs on the homepage root, so a visitor who lands on the homepage with UTM params has attribution stored before navigating onward — no attribution gap.
- **PDP preserves stored attribution across navigation.** The product detail page / `ContactForm` reads the submit-time URL UTM and falls back to the stored first-touch attribution, so SPA/SSR navigation that drops the query string does not lose attribution.
- **WhatsApp CTA: PASS.** CTA constructs a valid `wa.me/905331524843` link with a prefilled, product-aware message.
- **Contact / lead handler: PASS by code review.** `POST /api/inquiries` validates name/phone, coerces `productId` string→number (D-320 fix), sanitizes UTM, creates a `customer-inquiries` row, and fires a non-blocking Telegram operator alert.
- **Product-linked inquiry handling: PASS.** Inquiry is linked to the related product and carries size + UTM + referrer.
- **Test lead was NOT submitted** because doing so would create a real DB row and trigger a live Telegram operator alert.
- **Recommendation:** run exactly one controlled test lead later, only with explicit operator approval, then delete the test row.

## 3. Asics Incident Discovery

- Live public product discovered: **`Asics Sneaker Bej`**
- Product ID: **`367`**
- Slug: **`asics-sneaker-bej-tg-1782195257880`**
- Public PDP originally returned HTTP 200 (publicly reachable).
- Product appeared on the storefront homepage.
- Price observed: **`4.444 TL`**.
- Source: **Telegram** intake.
- Brand-safety panel flagged: **`marka: Asics | alanlar: title, brand`**

## 4. Root Cause

- `src/lib/brandSafety.ts` had an incomplete `BLOCKED_BRANDS` list.
- **`Asics` was not present in `BLOCKED_BRANDS`**, so the activation guard did not block the product.
- Also missing and patched in the same fix:
  - Reebok
  - Skechers
  - Loro Piana
- Other requested luxury/fashion brands (Louis Vuitton, LV, BOSS, Hugo Boss, Prada, Gucci, Balenciaga, Dior, Chanel, etc.) were already present and were left intact.
- Existing brand-safety detection/escalation logic was NOT weakened — the fix only extended the brand list and added test coverage.

## 5. Code Fix

- Commit: **`7749cd2`**
- Message: **`fix: expand brand safety blocked brands`**
- Files:
  - `src/lib/brandSafety.ts`
  - `src/lib/brandSafety.test.ts`
- Tests:
  - Explicit Asics block test added (`Asics Sneaker Bej` → blocked + Asics detected).
  - Newly-added brands coverage added (Asics / Reebok / Skechers / Loro Piana each hard-block).
  - brandSafety suite: **11/11 passed**.
  - `npm run validate`: **exit 0**.
  - All **21 suites green**.
- Production: Vercel **Ready** at `7749cd2`.

## 6. Channel Mitigation Result

| Channel                   | Result                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Payload                   | Product 367 set to Draft                                                                    |
| Website PDP               | 404 / not public                                                                           |
| Homepage                  | stale cached card observed initially; link went to 404                                      |
| Shopier                   | Asics listing removed and publicly verified clean                                          |
| Facebook                  | 8 high-confidence brand-risk posts manually deleted by operator; AI re-verification pending due to browser permission denial |
| X                         | 0 high-confidence delete candidates; ambiguous `AaA` cow-print post kept                    |
| Brand-safety future guard | Asics / Reebok / Skechers / Loro Piana now blocked                                          |

### 6a. Facebook brand-risk inventory (Business Suite, last 90 days: 25 Mar – 22 Jun 2026)

Eight high-confidence third-party-brand posts were identified. The operator states all 8 were manually deleted from Business Suite; **AI fresh re-verification is pending** (browser navigation/reload permission denied, so only a stale pre-deletion DOM was readable).

1. Asics Bej Sneaker — brand "Asics" + "Asics logolarıyla"
2. New Balance Çok Renkli Sneaker — "New Balance" + "belirgin 'N' logosu"
3. Puma krem spor ayakkabı — "Puma" + logo
4. Louis Vuitton Loafer — classic/modern variant
5. Louis Vuitton Loafer — daily / "günün her anı" variant
6. New Balance — modern dokunuş variant
7. New Balance 9060 Mavi Gri — brand + model 9060
8. New Balance 530 Bej Kahve — brand + model 530

Clean own-product loafer/classic posts in the same window (kept): 9 posts. Ambiguous: none.

### 6b. X inventory (`@UygunAyakkabi34`)

- 0 high-confidence delete candidates.
- 5 visible tweets reviewed (2026-06-02 → 2026-04-21), all own-product loafer/classic.
- 1 ambiguous post kept: the `AaA` cow-print tweet (2026-04-27/28) — kept because it does not clearly contain a third-party brand/logo/authenticity claim.
- Consistent with the prior X cleanup that removed earlier brand posts.

## 7. Remaining Risks

- **Facebook deletion verification is pending** until a fresh read-only Business Suite reload is available (current session could only read a stale, pre-deletion DOM; reload/navigation was permission-denied).
- Business Suite inventory covers the **last 90 days** only (25 Mar – 22 Jun 2026) unless older posts are separately loaded — older brand-risk posts (if any) are not enumerated here.
- Browser permission / renderer instability can block destructive-flow execution and verification.
- Facebook broader legacy cleanup may still contain older non-Asics brand posts if the timeline cannot be fully enumerated in one stable session.
- Homepage ISR cache may briefly show stale product cards after a draft/status change before revalidation.
- Shopier / Facebook dispatch residues can remain if a product was published to a channel before being set to Draft.
- The brand-safety blocklist is static and should be reviewed periodically as new brand names appear in intake.

## 8. Recommendations

1. **Run a fresh read-only Business Suite verification** of the 8 deleted candidates before paid ads; if any clear brand-risk post remains, delete it manually or via a stable Page / Business Suite session.
2. **Keep no-push** until this report's truth is confirmed (Facebook verification still pending).
3. Before paid ads, re-check Facebook legacy posts (beyond the 90-day window) in a fresh / stable browser session.
2. Keep product activation gated by brand-safety (do not bypass the guard).
3. For future brand-safety incidents, follow this sequence:
   - draft the product in Payload
   - verify PDP returns 404
   - check Shopier
   - check Facebook
   - check X
   - update the blocklist if the brand was missing
4. Later: add an automated post-activation residue audit or a channel-recall helper if feasible.
5. Later: add a safe revalidation path for the homepage cache after critical product status changes.

## 9. Non-Actions Confirmed

- No ads launched.
- No Meta campaigns created.
- No product uploads.
- No blind deletions.
- No credentials entered by the AI.
- No unrelated products changed.
- No source-code changes after `7749cd2`.
