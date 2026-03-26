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
 */

export type ProductContext = {
  title: string
  category?: string | null
  brand?: string | null
  color?: string | null
  material?: string | null
  productType?: string | null
  gender?: string | null
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
 * Builds the base description string from product context.
 * Example: "Nike, Air Max 90, black leather sneaker"
 */
function buildBase(product: ProductContext): string {
  const parts = [
    product.brand,
    product.title,
    product.color,
    product.material,
  ].filter(Boolean)
  return parts.join(', ')
}

/**
 * Returns 5 concept prompts for the given product context.
 * Safe for all product categories (shoes, wallets, bags, etc.).
 *
 * When hasReferenceImage is true, each prompt is prefixed with a strong
 * instruction to treat the reference photo as the ground truth product.
 * This dramatically improves visual consistency across the generated set.
 */
export function buildPromptSet(product: ProductContext, hasReferenceImage = false): ImagePrompt[] {
  const base = buildBase(product)
  const catLabel = categoryLabel(product.category)
  const genLabel = genderLabel(product.gender)
  const fullDesc = [genLabel, base, catLabel].filter(Boolean).join(' ')

  // When a reference image is provided, the model must preserve every product
  // detail — only the scene/angle/lighting should change per concept.
  const refPrefix = hasReferenceImage
    ? `CRITICAL: Use the reference image as the EXACT product. ` +
      `Reproduce the identical model, colorway, logo placement, sole design, ` +
      `stitching, and all material details with 100% fidelity. ` +
      `Do NOT invent, alter, or substitute any part of the product. ` +
      `Only the shooting angle, background, and lighting should change. `
    : ''

  return [
    // ── 1. Commerce Front ────────────────────────────────────────────────────
    {
      concept: 'commerce_front',
      label: 'Ürün — Ön Görünüm (Beyaz Fon)',
      prompt:
        refPrefix +
        `High-resolution professional product photograph of ${fullDesc}, ` +
        `straight front view, centered on a pure white background, ` +
        `clean studio lighting with soft shadows, sharp focus, ` +
        `commercial e-commerce product photography style, no text, ` +
        `4K quality, isolated product`,
    },

    // ── 2. Side Angle ────────────────────────────────────────────────────────
    {
      concept: 'side_angle',
      label: 'Ürün — Yan Açı (Stüdyo)',
      prompt:
        refPrefix +
        `Professional product studio photograph of ${fullDesc}, ` +
        `45-degree side angle view, white or light grey seamless background, ` +
        `soft-box studio lighting, fine detail visible, ` +
        `commercial product photography, no shadows on background, high resolution`,
    },

    // ── 3. Detail Closeup ────────────────────────────────────────────────────
    {
      concept: 'detail_closeup',
      label: 'Detay — Malzeme Dokusu',
      prompt:
        refPrefix +
        `Extreme close-up macro product photography showing the texture and material ` +
        `of ${base}, shallow depth of field, sharp focus on surface details, ` +
        `professional product photography, warm soft lighting, ` +
        `luxury fashion editorial style, no background distractions`,
    },

    // ── 4. Tabletop Editorial ────────────────────────────────────────────────
    {
      concept: 'tabletop_editorial',
      label: 'Editoryal — Masa Üstü Yaşam',
      prompt:
        refPrefix +
        `Lifestyle editorial product photography of ${fullDesc}, ` +
        `artfully placed on a clean marble or light oak wooden surface, ` +
        `natural daylight from the side, minimal Scandinavian composition, ` +
        `fashion magazine editorial style, soft shadows, muted tones, ` +
        `professional photography`,
    },

    // ── 5. Worn Lifestyle ────────────────────────────────────────────────────
    {
      concept: 'worn_lifestyle',
      label: 'Yaşam — Giyim Tarzı',
      prompt:
        refPrefix +
        `Lifestyle fashion photography showing ${fullDesc} being worn, ` +
        `urban or nature outdoor setting, natural golden-hour lighting, ` +
        `contemporary fashion editorial style, only feet/hands/accessory visible, ` +
        `authentic lifestyle mood, professional photography, ` +
        `no face shown, fashion magazine quality`,
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
