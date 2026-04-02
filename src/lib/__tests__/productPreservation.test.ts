import { describe, it, expect } from 'vitest'
import {
  buildPreservationBlock,
  buildIdentityContextFromProduct,
  PRODUCT_PRESERVATION_PROHIBITIONS,
  type ProductIdentityContext,
} from '../productPreservation'

// ─── PRODUCT_PRESERVATION_PROHIBITIONS ────────────────────────────────────

describe('PRODUCT_PRESERVATION_PROHIBITIONS', () => {
  it('is a non-empty readonly array', () => {
    expect(Array.isArray(PRODUCT_PRESERVATION_PROHIBITIONS)).toBe(true)
    expect(PRODUCT_PRESERVATION_PROHIBITIONS.length).toBeGreaterThan(0)
  })

  it('contains the color-family prohibition', () => {
    const found = PRODUCT_PRESERVATION_PROHIBITIONS.some((p) =>
      p.includes('color family'),
    )
    expect(found).toBe(true)
  })

  it('contains the logo/brand-marks prohibition', () => {
    const found = PRODUCT_PRESERVATION_PROHIBITIONS.some((p) =>
      p.includes('logos'),
    )
    expect(found).toBe(true)
  })

  it('contains the watermark prohibition', () => {
    const found = PRODUCT_PRESERVATION_PROHIBITIONS.some((p) =>
      p.includes('watermarks'),
    )
    expect(found).toBe(true)
  })
})

// ─── buildPreservationBlock ────────────────────────────────────────────────

describe('buildPreservationBlock', () => {
  const fullCtx: ProductIdentityContext = {
    mainColor: 'black',
    material: 'leather',
    brand: 'Nike',
    category: 'sneaker',
  }

  it('returns a non-empty string', () => {
    expect(buildPreservationBlock(fullCtx).length).toBeGreaterThan(0)
  })

  it('includes the main color in the output', () => {
    const block = buildPreservationBlock(fullCtx)
    expect(block).toContain('black')
  })

  it('includes "do NOT change the color" directive', () => {
    const block = buildPreservationBlock(fullCtx)
    expect(block).toContain('do NOT change the color')
  })

  it('includes material when provided', () => {
    const block = buildPreservationBlock(fullCtx)
    expect(block).toContain('leather')
    expect(block).toContain('preserve surface texture')
  })

  it('omits material note when material is absent', () => {
    const ctx: ProductIdentityContext = { mainColor: 'white' }
    const block = buildPreservationBlock(ctx)
    expect(block).not.toContain('preserve surface texture')
  })

  it('includes brand note when brand is provided', () => {
    const block = buildPreservationBlock(fullCtx)
    expect(block).toContain('Brand identity zones')
    expect(block).toContain('do NOT invent or alter branding')
  })

  it('omits brand note when brand is absent', () => {
    const ctx: ProductIdentityContext = { mainColor: 'red', material: 'canvas' }
    const block = buildPreservationBlock(ctx)
    expect(block).not.toContain('Brand identity zones')
  })

  it('includes STRICTLY FORBIDDEN prohibition list', () => {
    const block = buildPreservationBlock(fullCtx)
    expect(block).toContain('STRICTLY FORBIDDEN')
  })

  it('includes all canonical prohibitions in the block', () => {
    const block = buildPreservationBlock(fullCtx)
    for (const prohibition of PRODUCT_PRESERVATION_PROHIBITIONS) {
      expect(block).toContain(prohibition)
    }
  })

  it('works with minimal context (only mainColor)', () => {
    const ctx: ProductIdentityContext = { mainColor: 'navy blue' }
    const block = buildPreservationBlock(ctx)
    expect(block).toContain('navy blue')
    expect(block).toContain('STRICTLY FORBIDDEN')
  })
})

// ─── buildIdentityContextFromProduct ──────────────────────────────────────

describe('buildIdentityContextFromProduct', () => {
  it('maps color field to mainColor', () => {
    const ctx = buildIdentityContextFromProduct({ color: 'white' })
    expect(ctx.mainColor).toBe('white')
  })

  it('falls back to "as shown in reference" when color is absent', () => {
    const ctx = buildIdentityContextFromProduct({})
    expect(ctx.mainColor).toBe('as shown in reference')
  })

  it('maps material field', () => {
    const ctx = buildIdentityContextFromProduct({ material: 'suede' })
    expect(ctx.material).toBe('suede')
  })

  it('maps brand field', () => {
    const ctx = buildIdentityContextFromProduct({ brand: 'Adidas' })
    expect(ctx.brand).toBe('Adidas')
  })

  it('maps category field', () => {
    const ctx = buildIdentityContextFromProduct({ category: 'boot' })
    expect(ctx.category).toBe('boot')
  })

  it('defaults category to "shoe" when absent', () => {
    const ctx = buildIdentityContextFromProduct({})
    expect(ctx.category).toBe('shoe')
  })

  it('material is undefined when not provided', () => {
    const ctx = buildIdentityContextFromProduct({ color: 'black' })
    expect(ctx.material).toBeUndefined()
  })

  it('brand is undefined when not provided', () => {
    const ctx = buildIdentityContextFromProduct({ color: 'black' })
    expect(ctx.brand).toBeUndefined()
  })

  it('handles a full product object', () => {
    const ctx = buildIdentityContextFromProduct({
      color: 'black',
      material: 'leather',
      brand: 'Nike',
      category: 'sneaker',
      title: 'Air Max 90',
      price: 2199,
    })
    expect(ctx).toEqual({
      mainColor: 'black',
      material: 'leather',
      brand: 'Nike',
      category: 'sneaker',
    })
  })
})
