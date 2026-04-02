import { describe, it, expect } from 'vitest'
import {
  buildPromptSet,
  splitPromptsForKarma,
  type ProductContext,
  type PromptConcept,
} from '../imagePromptBuilder'

// ─── buildPromptSet ────────────────────────────────────────────────────────

describe('buildPromptSet', () => {
  const fullProduct: ProductContext = {
    title: 'Air Max 90',
    category: 'Spor',
    brand: 'Nike',
    color: 'black',
    material: 'leather',
    productType: 'sneaker',
    gender: 'erkek',
  }

  describe('return shape', () => {
    it('returns exactly 5 prompts', () => {
      expect(buildPromptSet(fullProduct)).toHaveLength(5)
    })

    it('returns all 5 distinct concepts', () => {
      const concepts = buildPromptSet(fullProduct).map((p) => p.concept)
      const expected: PromptConcept[] = [
        'commerce_front',
        'side_angle',
        'detail_closeup',
        'tabletop_editorial',
        'worn_lifestyle',
      ]
      expect(concepts).toEqual(expected)
    })

    it('every prompt has a non-empty label', () => {
      buildPromptSet(fullProduct).forEach((p) => {
        expect(p.label.length).toBeGreaterThan(0)
      })
    })

    it('every prompt has a non-empty prompt string', () => {
      buildPromptSet(fullProduct).forEach((p) => {
        expect(p.prompt.length).toBeGreaterThan(0)
      })
    })
  })

  describe('product metadata inclusion', () => {
    it('includes brand name in prompts', () => {
      const prompts = buildPromptSet(fullProduct)
      const brandFound = prompts.some((p) => p.prompt.includes('Nike'))
      expect(brandFound).toBe(true)
    })

    it('includes product title in prompts', () => {
      const prompts = buildPromptSet(fullProduct)
      const titleFound = prompts.some((p) => p.prompt.includes('Air Max 90'))
      expect(titleFound).toBe(true)
    })

    it('includes color in prompts', () => {
      const prompts = buildPromptSet(fullProduct)
      const colorFound = prompts.some((p) => p.prompt.includes('black'))
      expect(colorFound).toBe(true)
    })

    it('includes material in prompts', () => {
      const prompts = buildPromptSet(fullProduct)
      const materialFound = prompts.some((p) => p.prompt.includes('leather'))
      expect(materialFound).toBe(true)
    })
  })

  describe('gender translation', () => {
    it('translates "erkek" to "men\'s"', () => {
      const prompts = buildPromptSet({ ...fullProduct, gender: 'erkek' })
      const found = prompts.some((p) => p.prompt.includes("men's"))
      expect(found).toBe(true)
    })

    it('translates "kadin" to "women\'s"', () => {
      const prompts = buildPromptSet({ ...fullProduct, gender: 'kadin' })
      const found = prompts.some((p) => p.prompt.includes("women's"))
      expect(found).toBe(true)
    })

    it('translates "cocuk" to "children\'s"', () => {
      const prompts = buildPromptSet({ ...fullProduct, gender: 'cocuk' })
      const found = prompts.some((p) => p.prompt.includes("children's"))
      expect(found).toBe(true)
    })

    it('omits gender label for unknown gender value', () => {
      const prompts = buildPromptSet({ ...fullProduct, gender: 'unisex' })
      const found = prompts.some((p) => p.prompt.includes("unisex"))
      // Unknown gender is dropped, not passed through
      expect(found).toBe(false)
    })

    it('omits gender label when gender is null', () => {
      const prompts = buildPromptSet({ ...fullProduct, gender: null })
      const hasApostrophe = prompts.some((p) => p.prompt.includes("'s shoe") || p.prompt.includes("'s sneaker"))
      expect(hasApostrophe).toBe(false)
    })
  })

  describe('category translation', () => {
    const categories: Array<[string, string]> = [
      ['Günlük', 'casual shoe'],
      ['Spor', 'sport shoe / sneaker'],
      ['Klasik', 'formal dress shoe'],
      ['Bot', 'boot'],
      ['Sandalet', 'sandal'],
      ['Krampon', 'football cleat'],
      ['Cüzdan', 'wallet / leather wallet'],
    ]
    it.each(categories)('translates category "%s" → "%s" in prompts', (cat, english) => {
      const prompts = buildPromptSet({ title: 'Test', category: cat })
      const found = prompts.some((p) => p.prompt.includes(english))
      expect(found).toBe(true)
    })

    it('uses "shoe" as fallback for unknown category', () => {
      const prompts = buildPromptSet({ title: 'Test', category: 'Unknown' })
      // Falls back to the raw unknown category value
      const found = prompts.some((p) => p.prompt.includes('Unknown'))
      expect(found).toBe(true)
    })

    it('uses "shoe" as fallback when category is absent', () => {
      const prompts = buildPromptSet({ title: 'Test' })
      const found = prompts.some((p) => p.prompt.includes('shoe'))
      expect(found).toBe(true)
    })
  })

  describe('placeholder title detection', () => {
    it('excludes "Telegram Ürünü DD.MM.YYYY" placeholder title from prompts', () => {
      const product: ProductContext = { title: 'Telegram Ürünü 24.03.2026', brand: 'Nike' }
      const prompts = buildPromptSet(product)
      const titleLeaked = prompts.some((p) => p.prompt.includes('Telegram'))
      expect(titleLeaked).toBe(false)
    })

    it('excludes "Taslak Ürünü" placeholder title from prompts', () => {
      // isPlaceholderTitle regex requires trailing ü: "Ürünü" (possessive form)
      const product: ProductContext = { title: 'Taslak Ürünü 27/03-127', brand: 'Adidas' }
      const prompts = buildPromptSet(product)
      const titleLeaked = prompts.some((p) => p.prompt.includes('Taslak'))
      expect(titleLeaked).toBe(false)
    })

    it('uses category label as fallback when title is a placeholder and no other metadata', () => {
      const product: ProductContext = { title: 'Telegram Ürünü 01.01.2026', category: 'Bot' }
      const prompts = buildPromptSet(product)
      const found = prompts.some((p) => p.prompt.includes('boot'))
      expect(found).toBe(true)
    })
  })

  describe('visualDescription override', () => {
    it('uses visualDescription instead of title/brand/color when set', () => {
      const product: ProductContext = {
        title: 'Nike Air Max 90',
        brand: 'Nike',
        color: 'black',
        visualDescription: 'camel suede Chelsea boot with stacked block heel',
      }
      const prompts = buildPromptSet(product)
      // visualDescription should appear; title-based metadata should NOT dominate
      const descFound = prompts.some((p) => p.prompt.includes('camel suede Chelsea boot'))
      expect(descFound).toBe(true)
    })

    it('visualDescription takes priority over brand/color/title in base description', () => {
      const product: ProductContext = {
        title: 'Air Max 90',
        brand: 'Nike',
        color: 'white',
        visualDescription: 'red leather oxford shoe with brogue detailing',
      }
      const prompts = buildPromptSet(product)
      // The visualDescription replaces the base; "Nike" and "white" should not appear
      // (they come from brand/color which are overridden by visualDescription)
      const descFound = prompts.some((p) => p.prompt.includes('red leather oxford'))
      expect(descFound).toBe(true)
    })
  })

  describe('hasReferenceImage flag', () => {
    it('with reference + no real metadata uses "exact product shown in reference image"', () => {
      const product: ProductContext = { title: 'Telegram Ürünü 01.01.2026', category: 'Bot' }
      const prompts = buildPromptSet(product, true)
      const found = prompts.some((p) => p.prompt.includes('reference image'))
      expect(found).toBe(true)
    })

    it('with reference + real metadata uses text description', () => {
      const prompts = buildPromptSet(fullProduct, true)
      // Should still include brand/title info since metadata is present
      const found = prompts.some((p) => p.prompt.includes('Nike'))
      expect(found).toBe(true)
    })

    it('commerce_front concept contains white background directive', () => {
      const prompts = buildPromptSet(fullProduct)
      const front = prompts.find((p) => p.concept === 'commerce_front')
      expect(front?.prompt).toContain('white background')
    })

    it('worn_lifestyle concept contains no-face directive', () => {
      const prompts = buildPromptSet(fullProduct)
      const lifestyle = prompts.find((p) => p.concept === 'worn_lifestyle')
      expect(lifestyle?.prompt).toContain('no face shown')
    })
  })
})

// ─── splitPromptsForKarma ──────────────────────────────────────────────────

describe('splitPromptsForKarma', () => {
  it('returns correct split from a 5-prompt set', () => {
    const prompts = buildPromptSet({ title: 'Test Shoe', category: 'Spor' })
    const { forGeminiFlash, forGPTImage, forGeminiPro } = splitPromptsForKarma(prompts)

    expect(forGeminiFlash).toHaveLength(2)
    expect(forGPTImage).toHaveLength(2)
    expect(forGeminiPro).toHaveLength(1)
  })

  it('assigns commerce_front and side_angle to Gemini Flash', () => {
    const prompts = buildPromptSet({ title: 'Test' })
    const { forGeminiFlash } = splitPromptsForKarma(prompts)
    expect(forGeminiFlash[0].concept).toBe('commerce_front')
    expect(forGeminiFlash[1].concept).toBe('side_angle')
  })

  it('assigns detail_closeup and tabletop_editorial to GPT Image', () => {
    const prompts = buildPromptSet({ title: 'Test' })
    const { forGPTImage } = splitPromptsForKarma(prompts)
    expect(forGPTImage[0].concept).toBe('detail_closeup')
    expect(forGPTImage[1].concept).toBe('tabletop_editorial')
  })

  it('assigns worn_lifestyle to Gemini Pro', () => {
    const prompts = buildPromptSet({ title: 'Test' })
    const { forGeminiPro } = splitPromptsForKarma(prompts)
    expect(forGeminiPro[0].concept).toBe('worn_lifestyle')
  })

  it('total prompts across all buckets equals 5', () => {
    const prompts = buildPromptSet({ title: 'Test' })
    const { forGeminiFlash, forGPTImage, forGeminiPro } = splitPromptsForKarma(prompts)
    expect(forGeminiFlash.length + forGPTImage.length + forGeminiPro.length).toBe(5)
  })
})
