import { describe, it, expect } from 'vitest'
import {
  buildPromptSet,
  splitPromptsForKarma,
  type ProductContext,
  type PromptConcept,
} from '../lib/imagePromptBuilder'

// ─── buildPromptSet ──────────────────────────────────────────────────────────

describe('buildPromptSet', () => {
  const FULL_PRODUCT: ProductContext = {
    title: 'Air Max 90',
    brand: 'Nike',
    color: 'black',
    material: 'leather',
    category: 'Spor',
    gender: 'erkek',
  }

  it('returns exactly 5 prompts', () => {
    expect(buildPromptSet(FULL_PRODUCT)).toHaveLength(5)
  })

  it('returns prompts with the five expected concepts in order', () => {
    const concepts: PromptConcept[] = [
      'commerce_front',
      'side_angle',
      'detail_closeup',
      'tabletop_editorial',
      'worn_lifestyle',
    ]
    const prompts = buildPromptSet(FULL_PRODUCT)
    prompts.forEach((p, i) => expect(p.concept).toBe(concepts[i]))
  })

  it('every prompt has a non-empty label and prompt string', () => {
    buildPromptSet(FULL_PRODUCT).forEach((p) => {
      expect(p.label.length).toBeGreaterThan(0)
      expect(p.prompt.length).toBeGreaterThan(0)
    })
  })

  it('includes brand in prompts when provided', () => {
    const prompts = buildPromptSet(FULL_PRODUCT)
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).toContain('Nike')
  })

  it('includes color in the base description', () => {
    const prompts = buildPromptSet(FULL_PRODUCT)
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).toContain('black')
  })

  it("translates Turkish gender 'erkek' to \"men's\" in prompt", () => {
    const prompts = buildPromptSet(FULL_PRODUCT)
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).toContain("men's")
  })

  it("translates Turkish gender 'kadin' to \"women's\" in prompt", () => {
    const prompts = buildPromptSet({ ...FULL_PRODUCT, gender: 'kadin' })
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).toContain("women's")
  })

  it("translates Turkish gender 'cocuk' to \"children's\" in prompt", () => {
    const prompts = buildPromptSet({ ...FULL_PRODUCT, gender: 'cocuk' })
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).toContain("children's")
  })

  it('omits gender label when gender is null or undefined', () => {
    const prompts = buildPromptSet({ ...FULL_PRODUCT, gender: null })
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).not.toContain("men's")
    expect(combined).not.toContain("women's")
    expect(combined).not.toContain("children's")
  })

  // Category translation tests
  it("translates category 'Spor' to 'sport shoe / sneaker'", () => {
    const prompts = buildPromptSet({ ...FULL_PRODUCT, category: 'Spor' })
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).toContain('sport shoe / sneaker')
  })

  it("translates category 'Bot' to 'boot'", () => {
    const prompts = buildPromptSet({ ...FULL_PRODUCT, category: 'Bot' })
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).toContain('boot')
  })

  it("translates category 'Sandalet' to 'sandal'", () => {
    const prompts = buildPromptSet({ ...FULL_PRODUCT, category: 'Sandalet' })
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).toContain('sandal')
  })

  it("translates category 'Cüzdan' to 'wallet / leather wallet'", () => {
    const prompts = buildPromptSet({ ...FULL_PRODUCT, category: 'Cüzdan' })
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).toContain('wallet / leather wallet')
  })

  it("defaults to 'shoe' when category is null", () => {
    const prompts = buildPromptSet({ ...FULL_PRODUCT, category: null })
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).toContain('shoe')
  })

  // Placeholder title tests

  it('excludes placeholder title "Telegram Ürünü ..." from prompts', () => {
    const product: ProductContext = {
      title: 'Telegram Ürünü 24.03.2026',
      brand: 'Nike',
      color: 'black',
    }
    const prompts = buildPromptSet(product)
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).not.toContain('Telegram Ürünü')
  })

  it('excludes placeholder title "Taslak Ürün ..." from prompts', () => {
    const product: ProductContext = {
      title: 'Taslak Ürün 27/03-127',
      category: 'Spor',
    }
    const prompts = buildPromptSet(product)
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).not.toContain('Taslak Ürün')
  })

  // visualDescription override

  it('uses visualDescription over brand/color metadata when available', () => {
    const product: ProductContext = {
      title: 'Some Shoe',
      brand: 'Nike',
      color: 'black',
      visualDescription: 'camel suede Chelsea boot with stacked block heel',
    }
    const prompts = buildPromptSet(product)
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).toContain('camel suede Chelsea boot with stacked block heel')
    expect(combined).not.toContain('Nike')
    expect(combined).not.toContain('black')
  })

  // Reference image tests

  it('with reference image and no metadata uses "exact product shown in reference image"', () => {
    const product: ProductContext = { title: 'Taslak Ürün 27/03-127' }
    const prompts = buildPromptSet(product, true)
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).toContain('reference image')
  })

  it('with reference image and real metadata uses text description', () => {
    const product: ProductContext = { title: 'Nike Air Max', brand: 'Nike' }
    const prompts = buildPromptSet(product, true)
    const combined = prompts.map((p) => p.prompt).join(' ')
    expect(combined).toContain('Nike')
  })

  // commerce_front specifics

  it('commerce_front prompt contains white background description', () => {
    const prompt = buildPromptSet(FULL_PRODUCT)[0]
    expect(prompt.concept).toBe('commerce_front')
    expect(prompt.prompt).toContain('white background')
  })

  // detail_closeup specifics

  it('detail_closeup prompt contains "close-up" or "macro"', () => {
    const prompt = buildPromptSet(FULL_PRODUCT)[2]
    expect(prompt.concept).toBe('detail_closeup')
    expect(prompt.prompt.toLowerCase()).toContain('close-up')
  })

  // worn_lifestyle specifics

  it('worn_lifestyle prompt specifies no face shown', () => {
    const prompt = buildPromptSet(FULL_PRODUCT)[4]
    expect(prompt.concept).toBe('worn_lifestyle')
    expect(prompt.prompt).toContain('no face shown')
  })

  it('all prompts contain "no text" restriction', () => {
    buildPromptSet(FULL_PRODUCT).forEach((p) => {
      expect(p.prompt).toContain('no text')
    })
  })

  it('handles a product with no optional fields (title only)', () => {
    const minimal: ProductContext = { title: 'Generic Shoe' }
    const prompts = buildPromptSet(minimal)
    expect(prompts).toHaveLength(5)
    prompts.forEach((p) => expect(p.prompt.length).toBeGreaterThan(0))
  })
})

// ─── splitPromptsForKarma ────────────────────────────────────────────────────

describe('splitPromptsForKarma', () => {
  const prompts = buildPromptSet({
    title: 'Test Shoe',
    brand: 'Adidas',
    category: 'Günlük',
  })

  it('assigns first 2 prompts to Gemini Flash', () => {
    const { forGeminiFlash } = splitPromptsForKarma(prompts)
    expect(forGeminiFlash).toHaveLength(2)
    expect(forGeminiFlash[0].concept).toBe('commerce_front')
    expect(forGeminiFlash[1].concept).toBe('side_angle')
  })

  it('assigns prompts 2-3 to GPT Image', () => {
    const { forGPTImage } = splitPromptsForKarma(prompts)
    expect(forGPTImage).toHaveLength(2)
    expect(forGPTImage[0].concept).toBe('detail_closeup')
    expect(forGPTImage[1].concept).toBe('tabletop_editorial')
  })

  it('assigns last prompt to Gemini Pro', () => {
    const { forGeminiPro } = splitPromptsForKarma(prompts)
    expect(forGeminiPro).toHaveLength(1)
    expect(forGeminiPro[0].concept).toBe('worn_lifestyle')
  })

  it('total assigned prompts equals input length', () => {
    const { forGeminiFlash, forGPTImage, forGeminiPro } = splitPromptsForKarma(prompts)
    expect(forGeminiFlash.length + forGPTImage.length + forGeminiPro.length).toBe(5)
  })

  it('works with an empty array (edge case)', () => {
    const { forGeminiFlash, forGPTImage, forGeminiPro } = splitPromptsForKarma([])
    expect(forGeminiFlash).toHaveLength(0)
    expect(forGPTImage).toHaveLength(0)
    expect(forGeminiPro).toHaveLength(0)
  })
})
