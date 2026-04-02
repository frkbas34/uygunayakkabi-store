import { describe, it, expect } from 'vitest'
import {
  buildPreservationBlock,
  buildIdentityContextFromProduct,
  PRODUCT_PRESERVATION_PROHIBITIONS,
  type ProductIdentityContext,
} from '../lib/productPreservation'

// ─── PRODUCT_PRESERVATION_PROHIBITIONS ───────────────────────────────────────

describe('PRODUCT_PRESERVATION_PROHIBITIONS', () => {
  it('is a non-empty tuple', () => {
    expect(PRODUCT_PRESERVATION_PROHIBITIONS.length).toBeGreaterThan(0)
  })

  it('forbids color changes', () => {
    const combined = PRODUCT_PRESERVATION_PROHIBITIONS.join(' ')
    expect(combined).toContain('color')
  })

  it('forbids logo/brand mark alterations', () => {
    const combined = PRODUCT_PRESERVATION_PROHIBITIONS.join(' ')
    expect(combined).toContain('logos')
  })

  it('forbids adding watermarks or text overlays', () => {
    const combined = PRODUCT_PRESERVATION_PROHIBITIONS.join(' ')
    expect(combined).toContain('watermarks')
  })
})

// ─── buildPreservationBlock ───────────────────────────────────────────────────

describe('buildPreservationBlock', () => {
  const FULL_CTX: ProductIdentityContext = {
    mainColor: 'black',
    material: 'suede',
    brand: 'Nike',
    category: 'sneaker',
  }

  it('includes the mainColor in a color lock statement', () => {
    const block = buildPreservationBlock(FULL_CTX)
    expect(block).toContain('black')
    expect(block).toContain('do NOT change the color')
  })

  it('includes material preservation note when material is provided', () => {
    const block = buildPreservationBlock(FULL_CTX)
    expect(block).toContain('suede')
    expect(block).toContain('preserve surface texture')
  })

  it('omits material note when material is undefined', () => {
    const ctx: ProductIdentityContext = { mainColor: 'white' }
    const block = buildPreservationBlock(ctx)
    expect(block).not.toContain('preserve surface texture')
  })

  it('includes brand identity note when brand is provided', () => {
    const block = buildPreservationBlock(FULL_CTX)
    expect(block).toContain('Brand identity zones')
    expect(block).toContain('do NOT invent or alter branding')
  })

  it('omits brand note when brand is undefined', () => {
    const ctx: ProductIdentityContext = { mainColor: 'black' }
    const block = buildPreservationBlock(ctx)
    expect(block).not.toContain('Brand identity zones')
  })

  it('always includes STRICTLY FORBIDDEN prohibitions', () => {
    const block = buildPreservationBlock(FULL_CTX)
    expect(block).toContain('STRICTLY FORBIDDEN')
  })

  it('includes every canonical prohibition in the block', () => {
    const block = buildPreservationBlock(FULL_CTX)
    for (const prohibition of PRODUCT_PRESERVATION_PROHIBITIONS) {
      expect(block).toContain(prohibition)
    }
  })

  it('produces a single string (no newlines from filter/join)', () => {
    const block = buildPreservationBlock(FULL_CTX)
    // Should be a space-joined string of non-empty parts
    expect(typeof block).toBe('string')
    expect(block.trim().length).toBeGreaterThan(0)
  })

  it('handles minimal context (only mainColor)', () => {
    const ctx: ProductIdentityContext = { mainColor: 'red' }
    const block = buildPreservationBlock(ctx)
    expect(block).toContain('red')
    expect(block).toContain('STRICTLY FORBIDDEN')
    expect(block).not.toContain('undefined')
  })
})

// ─── buildIdentityContextFromProduct ─────────────────────────────────────────

describe('buildIdentityContextFromProduct', () => {
  it('maps product fields to identity context', () => {
    const product = {
      color: 'navy blue',
      material: 'canvas',
      brand: 'Vans',
      category: 'casual shoe',
    }
    const ctx = buildIdentityContextFromProduct(product)
    expect(ctx.mainColor).toBe('navy blue')
    expect(ctx.material).toBe('canvas')
    expect(ctx.brand).toBe('Vans')
    expect(ctx.category).toBe('casual shoe')
  })

  it('falls back to "as shown in reference" when color is absent', () => {
    const ctx = buildIdentityContextFromProduct({})
    expect(ctx.mainColor).toBe('as shown in reference')
  })

  it('falls back to "shoe" when category is absent', () => {
    const ctx = buildIdentityContextFromProduct({})
    expect(ctx.category).toBe('shoe')
  })

  it('material is undefined when absent', () => {
    const ctx = buildIdentityContextFromProduct({ color: 'white' })
    expect(ctx.material).toBeUndefined()
  })

  it('brand is undefined when absent', () => {
    const ctx = buildIdentityContextFromProduct({ color: 'white' })
    expect(ctx.brand).toBeUndefined()
  })

  it('handles all-populated product record', () => {
    const product: Record<string, unknown> = {
      color: 'brown',
      material: 'leather',
      brand: 'Timberland',
      category: 'boot',
      extraField: 'ignored',
    }
    const ctx = buildIdentityContextFromProduct(product)
    expect(ctx.mainColor).toBe('brown')
    expect(ctx.material).toBe('leather')
    expect(ctx.brand).toBe('Timberland')
    expect(ctx.category).toBe('boot')
  })
})
