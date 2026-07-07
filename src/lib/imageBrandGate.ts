/**
 * imageBrandGate — D-411 BRAND-SAFETY GATE FOR AI IMAGE GENERATION
 *
 * Before this, `#gorsel` would happily generate AI images for protected-brand
 * products (e.g. a "BOSS Süet Loafer"), reproducing the real shoe's brand
 * wordmark / metal logo plate into the output — a trademark risk, and the source
 * of the operator-reported "metal / BOSS added" defects.
 *
 * This gate mirrors the storyDispatch brand-safety block (D-381): if a protected
 * brand is detected in the product's TEXT, generation is blocked and the operator
 * is told why. Deterministic and pure — no Payload/network calls, never throws.
 *
 * Scope/limit: this is a TEXT scan (title/description/copy). It cannot catch a
 * brand mark that appears ONLY in the photo and nowhere in the text. Most
 * brand-named products name the brand in their title, and governance already
 * keeps brand-named products in draft, so this is the proportionate first gate.
 */

import { scanProductBrandSafety, formatBrandSafetyReason } from './brandSafety'

export type ImageBrandGate = {
  /** true → do NOT generate AI images for this product. */
  blocked: boolean
  /** Canonical protected brand names found (empty when not blocked). */
  brands: string[]
  /** Machine reason string for job metadata/logs (empty when not blocked). */
  reason: string
  /** Turkish operator-facing Telegram message (empty when not blocked). */
  operatorMessage: string
}

const OK: ImageBrandGate = { blocked: false, brands: [], reason: '', operatorMessage: '' }

/**
 * Evaluate whether AI image generation should be blocked for a product on
 * brand-safety grounds. Returns a not-blocked result for clean products and on
 * any unexpected shape (fail-open — never break the pipeline on a bad input).
 */
export function evaluateImageBrandGate(product: unknown): ImageBrandGate {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scan = scanProductBrandSafety(product as any)
  if (scan.safe) return OK

  const detail = formatBrandSafetyReason(scan) || scan.reasons.join('; ')
  const brandList = scan.blockedBrands.join(', ')
  return {
    blocked: true,
    brands: scan.blockedBrands,
    reason: `brand_safety_block: ${detail}`,
    operatorMessage:
      `⛔ <b>AI görsel üretilmedi — marka güvenliği</b>\n\n` +
      `Korumalı marka tespit edildi: <b>${brandList}</b>.\n` +
      `Marka/logo hakları nedeniyle bu ürün için AI görsel üretimi engellendi.\n` +
      `Ürünü taslak (draft) tutun ya da marka adını ürün metninden kaldırıp tekrar deneyin.`,
  }
}
