/**
 * imagePromptBuilder — Step 24
 *
 * Builds 5 concept-based image generation prompts for a product.
 * Each prompt targets a different visual angle optimized for e-commerce.
 *
 * Concepts:
 *  1. commerce_front    — White-bg product shot, straight-on
 *  2. side_angle        — 45° studio angle
 *  3. detail_closeup    — Material/texture macro
 *  4. tabletop_editorial — Lifestyle tabletop composition
 *  5. worn_lifestyle    — Worn in a real-world setting
 *
 * All prompts are in English (better results with image generation APIs).
 *
 * When a reference image is available, prompts switch to image-to-image mode:
 * the model is instructed to reproduce the EXACT product from the reference
 * photo and only change angle/background/lighting per concept.
 */

export type ProductContext = {
  title: string
  category?: string | null
  brand?: string | null
  color?: string | null
  material?: string | null
  productType?: string | null
  gender?: string | null
  /**
   * AI-generated visual description from analysing the reference photo.
   * When set, this overrides the title/brand/color fields in prompt building,
   * giving the image generation model a highly specific product description
   * (e.g. "camel suede Chelsea boot with stacked block heel and elastic panels")
   * rather than generic metadata that may be empty for Telegram-created products.
   */
  visualDescription?: string | null
}

export type PromptConcept =
  | 'commerce_front'
  | 'side_angle'
  | 'detail_closeup'
  | 'tabletop_editorial'
  | 'worn_lifestyle'

export type ImagePrompt = {
  concept: PromptConcept
  label: string
  prompt: string
}

/**
 * Translates Turkish gender value to English adjective for prompts.
 */
function genderLabel(gender?: string | null): string {
  if (gender === 'erkek') return "men's"
  if (gender === 'kadin') return "women's"
  if (gender === 'cocuk') return "children's"
  return ''
}

/**
 * Translates Turkish category to English for prompts.
 */
function categoryLabel(category?: string | null): string {
  const map: Record<string, string> = {
    'Günlük': 'casual shoe',
    'Spor': 'sport shoe / sneaker',
    'Klasik': 'formal dress shoe',
    'Bot': 'boot',
    'Sandalet': 'sandal',
    'Krampon': 'football cleat',
    'Cüzdan': 'wallet / leather wallet',
  }
  return category ? (map[category] ?? category) : 'shoe'
}

/**
 * Detects auto-generated placeholder titles from Telegram intake.
 * These titles carry zero product information and should NOT be used in prompts.
 * Examples:
 *   "Telegram Ürünü 24.03.2026"      — old format
 *   "Telegram Ürünü 24.03.2026 12:30" — old format with time
 *   "Taslak Ürün 27/03-127"           — current auto-generated draft format
 */
function isPlaceholderTitle(title: string): boolean {
  return (
    /^Telegram\s+[ÜUüu]r[üu]n[üu]/i.test(title) ||
    /^Taslak\s+[ÜUüu]r[üu]n/i.test(title)
  )
}

/**
 * Builds the base description string from product context.
 * Example: "Nike, Air Max 90, black leather sneaker"
 *
 * When visualDescription is set (from AI vision analysis of the reference photo),
 * it takes priority over all other fields — it's far more accurate and specific.
 *
 * Skips the title if it's a Telegram placeholder (e.g. "Telegram Ürünü 24.03.2026")
 * to prevent the AI from generating a literal label with that text.
 */
function buildBase(product: ProductContext): string {
  // Vision-analysed description is always the most accurate — use it if available
  if (product.visualDescription) return product.visualDescription

  const parts = [
    product.brand,
    isPlaceholderTitle(product.title) ? null : product.title,
    product.color,
    product.material,
  ].filter(Boolean)
  return parts.join(', ')
}

/**
 * Returns 5 concept prompts for the given product context.
 * Safe for all product categories (shoes, wallets, bags, etc.).
 *
 * When hasReferenceImage is true, prompts are rebuilt to:
 * 1. Instruct the model to reproduce the EXACT product from the reference photo
 * 2. Emphasize color fidelity (prevents brown/red when the product is black)
 * 3. Use "the product shown in the reference image" as description when text
 *    metadata is too sparse (e.g. Telegram intake with no brand/color/material)
 */
export function buildPromptSet(product: ProductContext, hasReferenceImage = false): ImagePrompt[] {
  const base = buildBase(product)
  const catLabel = categoryLabel(product.category)
  const genLabel = genderLabel(product.gender)

  // If we have real text metadata, use it; otherwise fall back to category label
  const textParts = [genLabel, base, catLabel].filter(Boolean)
  const hasRealMetadata = base.length > 0

  // Product description used in prompts:
  // - With reference + weak metadata: "the exact product shown in the reference image"
  // - With reference + good metadata: text description + note about reference
  // - Without reference: text description (best effort)
  let fullDesc: string
  if (hasReferenceImage && !hasRealMetadata) {
    // No useful text — rely entirely on the reference photo
    fullDesc = `the exact ${catLabel} shown in the reference image`
  } else if (hasReferenceImage && hasRealMetadata) {
    // Good text metadata + reference image — use both
    fullDesc = textParts.join(' ')
  } else {
    // No reference image — text-only (legacy behavior)
    fullDesc = textParts.join(' ')
  }

  // ── Text-to-image prompts ───────────────────────────────────────────────
  // All available Gemini image generation models (gemini-2.5-flash-image etc.)
  // are TEXT-TO-IMAGE only — they do not process/use image inputs.
  // Instead, we use Gemini Vision (gemini-2.5-flash) to analyse the reference
  // photo first and store the result as productContext.visualDescription.
  // That description is then injected into fullDesc here, giving the generation
  // model a highly specific product description (e.g. "camel suede Chelsea boot
  // with stacked block heel") rather than a generic "shoe".
  // The hasReferenceImage flag is kept for future compatibility only.
  return [
    // ── 1. Commerce Front ────────────────────────────────────────────────────
    {
      concept: 'commerce_front',
      label: 'Ürün — Ön Görünüm (Beyaz Fon)',
      prompt:
        `High-resolution professional product photograph of ${fullDesc}, ` +
        `straight front view, centered on a pure white background, ` +
        `clean studio lighting with soft shadows, sharp focus, ` +
        `commercial e-commerce product photography style, no text or labels, ` +
        `4K quality, isolated product`,
    },

    // ── 2. Side Angle ────────────────────────────────────────────────────────
    {
      concept: 'side_angle',
      label: 'Ürün — Yan Açı (Stüdyo)',
      prompt:
        `Professional product studio photograph of ${fullDesc}, ` +
        `45-degree side angle view, white or light grey seamless background, ` +
        `soft-box studio lighting, fine detail visible, ` +
        `commercial product photography, no shadows on background, high resolution, no text`,
    },

    // ── 3. Detail Closeup ────────────────────────────────────────────────────
    {
      concept: 'detail_closeup',
      label: 'Detay — Malzeme Dokusu',
      prompt:
        `Extreme close-up macro product photography showing the texture and material ` +
        `of ${base || catLabel}, ` +
        `shallow depth of field, sharp focus on surface details, ` +
        `professional product photography, warm soft lighting, ` +
        `luxury fashion editorial style, no background distractions, no text`,
    },

    // ── 4. Tabletop Editorial ────────────────────────────────────────────────
    {
      concept: 'tabletop_editorial',
      label: 'Editoryal — Masa Üstü Yaşam',
      prompt:
        `Lifestyle editorial product photography of ${fullDesc}, ` +
        `artfully placed on a clean marble or light oak wooden surface, ` +
        `natural daylight from the side, minimal Scandinavian composition, ` +
        `fashion magazine editorial style, soft shadows, muted tones, ` +
        `professional photography, no text`,
    },

    // ── 5. Worn Lifestyle ────────────────────────────────────────────────────
    {
      concept: 'worn_lifestyle',
      label: 'Yaşam — Giyim Tarzı',
      prompt:
        `Lifestyle fashion photography showing ${fullDesc} being worn, ` +
        `urban or nature outdoor setting, natural golden-hour lighting, ` +
        `contemporary fashion editorial style, only feet/hands/accessory visible, ` +
        `authentic lifestyle mood, professional photography, ` +
        `no face shown, fashion magazine quality, no text`,
    },
  ]
}

/**
 * Returns the subset of prompts for #karma mode distribution:
 * - Gemini Flash gets concepts [0, 1]
 * - GPT Image gets concepts [2, 3]
 * - Gemini Pro gets concept [4]
 */
export function splitPromptsForKarma(prompts: ImagePrompt[]): {
  forGeminiFlash: ImagePrompt[]
  forGPTImage: ImagePrompt[]
  forGeminiPro: ImagePrompt[]
} {
  return {
    forGeminiFlash: prompts.slice(0, 2),
    forGPTImage: prompts.slice(2, 4),
    forGeminiPro: prompts.slice(4),
  }
}
