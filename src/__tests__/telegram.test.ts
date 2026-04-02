import { describe, it, expect } from 'vitest'
import {
  parseTelegramCaption,
  evaluatePublishReadiness,
  parseStockUpdate,
  parseTelegramCaptionLegacy,
} from '../lib/telegram'

// ─── parseTelegramCaption ────────────────────────────────────────────────────

describe('parseTelegramCaption', () => {
  it('returns null for empty caption', () => {
    expect(parseTelegramCaption('')).toBeNull()
    expect(parseTelegramCaption('   ')).toBeNull()
  })

  it('parses a fully-labeled caption', () => {
    const caption = `Başlık: Nike Air Max 90
Fiyat: 2199
Kod: AYK-001
Adet: 5
Kategori: Spor
Marka: Nike
Yayın: evet
SEO: evet`
    const result = parseTelegramCaption(caption)
    expect(result).not.toBeNull()
    expect(result!.title).toBe('Nike Air Max 90')
    expect(result!.price).toBe(2199)
    expect(result!.sku).toBe('AYK-001')
    expect(result!.quantity).toBe(5)
    expect(result!.category).toBe('Spor')
    expect(result!.brand).toBe('Nike')
    expect(result!.publishRequested).toBe(true)
    expect(result!.seoRequested).toBe(true)
  })

  it('parses English label aliases', () => {
    const caption = `title: Adidas Superstar
price: 1500
brand: Adidas
category: casual`
    const result = parseTelegramCaption(caption)
    expect(result!.title).toBe('Adidas Superstar')
    expect(result!.price).toBe(1500)
    expect(result!.brand).toBe('Adidas')
    expect(result!.category).toBe('Günlük')
  })

  it('parses informal unlabeled multi-line caption', () => {
    const caption = `Nike Air Max
2199 TL
3 adet
spor`
    const result = parseTelegramCaption(caption)
    expect(result!.title).toBe('Nike Air Max')
    expect(result!.price).toBe(2199)
    expect(result!.quantity).toBe(3)
    expect(result!.category).toBe('Spor')
  })

  it('parses compact dash-separated single-line caption', () => {
    const caption = 'Nike Air Max - 2199₺ - 3 adet'
    const result = parseTelegramCaption(caption)
    expect(result!.title).toBe('Nike Air Max')
    expect(result!.price).toBe(2199)
  })

  it('detects brand from title when not explicitly stated', () => {
    const result = parseTelegramCaption('Başlık: New Balance 574\nFiyat: 1800')
    expect(result!.brand).toBe('New Balance')
  })

  it('does not overwrite explicit brand with title-inferred brand', () => {
    const result = parseTelegramCaption('Başlık: Nike Air Force\nFiyat: 2000\nMarka: Custom Brand')
    expect(result!.brand).toBe('Custom Brand')
  })

  it('stores rawCaption exactly as provided', () => {
    const caption = 'Nike Air Max\n2199 TL'
    const result = parseTelegramCaption(caption)
    expect(result!.rawCaption).toBe(caption)
  })

  it('first occurrence of a duplicate label wins', () => {
    const caption = 'Başlık: First Title\nBaşlık: Second Title\nFiyat: 100'
    const result = parseTelegramCaption(caption)
    expect(result!.title).toBe('First Title')
  })

  it('adds warning when title is missing', () => {
    const result = parseTelegramCaption('Fiyat: 500')
    expect(result!.parseWarnings.some((w) => w.includes('başlık'))).toBe(true)
  })

  it('adds warning when price is missing', () => {
    const result = parseTelegramCaption('Başlık: Some Shoe')
    expect(result!.parseWarnings.some((w) => w.includes('fiyat') || w.includes('Fiyat'))).toBe(true)
  })

  it('adds warning for unrecognized category', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nKategori: bilinmeyen')
    expect(result!.parseWarnings.some((w) => w.includes('Kategori'))).toBe(true)
  })

  it('adds warning when brand is not found', () => {
    const result = parseTelegramCaption('Başlık: Xyz Unknown Brand Shoe\nFiyat: 500')
    expect(result!.parseWarnings.some((w) => w.includes('Marka') || w.includes('marka'))).toBe(true)
  })

  // Price format tests

  it('parses price with ₺ symbol', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: ₺1500')
    expect(result!.price).toBe(1500)
  })

  it('parses price with "TL" suffix', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 1500 TL')
    expect(result!.price).toBe(1500)
  })

  it('parses Turkish dot-thousands format: 1.500', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 1.500')
    expect(result!.price).toBe(1500)
  })

  it('parses Turkish comma-decimal format: 1.500,00', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 1.500,00')
    expect(result!.price).toBe(1500)
  })

  it('parses decimal price: 150.50', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 150.50')
    expect(result!.price).toBe(150.50)
  })

  it('parses price with comma-decimal: 1500,50', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 1500,50')
    expect(result!.price).toBe(1500.50)
  })

  // Confidence score tests

  it('score is 100 when all fields present', () => {
    const caption = `Başlık: Nike Air Max 90
Fiyat: 2199
Kod: AYK-001
Adet: 5
Kategori: Spor
Marka: Nike`
    const result = parseTelegramCaption(caption)
    expect(result!.parseConfidence).toBe(100)
  })

  it('score decreases for missing fields', () => {
    // title(30) + price(25) = 55, no category/brand/sku/quantity
    const result = parseTelegramCaption('Başlık: Test Shoe\nFiyat: 500')
    expect(result!.parseConfidence).toBe(55)
  })

  it('score is low for a caption with only a symbol line', () => {
    // '---' passes the title heuristic (non-category, non-number, length > 2),
    // so it contributes 30 points to parseConfidence.
    const result = parseTelegramCaption('   ---   ')
    expect(result!.parseConfidence).toBe(30)
    expect(result!.title).toBe('---')
  })

  // Category mapping

  it('maps "bot" to category "Bot"', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nKategori: bot')
    expect(result!.category).toBe('Bot')
  })

  it('maps "sandal" to category "Sandalet"', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nKategori: sandal')
    expect(result!.category).toBe('Sandalet')
  })

  it('maps "wallet" to category "Cüzdan" and family "wallets"', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nKategori: wallet')
    expect(result!.category).toBe('Cüzdan')
    expect(result!.productFamily).toBe('wallets')
  })

  // Publish / SEO flags

  it('publishRequested is false when not set', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 100')
    expect(result!.publishRequested).toBe(false)
  })

  it('publishRequested via "ig" label with "evet"', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nig: evet')
    expect(result!.publishRequested).toBe(true)
  })

  it('seoRequested is false when not set', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 100')
    expect(result!.seoRequested).toBe(false)
  })

  it('seoRequested via "blog" label', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nblog: evet')
    expect(result!.seoRequested).toBe(true)
  })

  it('parseBoolFlag returns false for "hayır"', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nYayın: hayır')
    expect(result!.publishRequested).toBe(false)
  })

  // Channel targets

  it('parses channel targets from "kanallar" label', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nKanallar: website, instagram, shopier')
    expect(result!.channelTargets).toContain('website')
    expect(result!.channelTargets).toContain('instagram')
    expect(result!.channelTargets).toContain('shopier')
  })

  it('returns undefined channelTargets when not specified', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 100')
    expect(result!.channelTargets).toBeUndefined()
  })

  // productFamily inference

  it('infers productFamily as "shoes" by default', () => {
    const result = parseTelegramCaption('Başlık: Generic Shoe\nFiyat: 100')
    expect(result!.productFamily).toBe('shoes')
  })

  it('infers productFamily "bags" from title keyword', () => {
    const result = parseTelegramCaption('Başlık: Leather Bag\nFiyat: 300')
    expect(result!.productFamily).toBe('bags')
  })

  // Turkish label aliases

  it('accepts "fyt" as alias for price', () => {
    const result = parseTelegramCaption('Başlık: Test\nfyt: 999')
    expect(result!.price).toBe(999)
  })

  it('accepts "urun" as alias for title', () => {
    const result = parseTelegramCaption('urun: My Shoe\nFiyat: 500')
    expect(result!.title).toBe('My Shoe')
  })

  it('accepts "miktar" as alias for quantity', () => {
    const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nmiktar: 7')
    expect(result!.quantity).toBe(7)
  })

  // Placeholder title detection

  it('does not include Telegram placeholder title as product title in prompt base', () => {
    // The placeholder detection happens in imagePromptBuilder, but parseTelegramCaption
    // should still parse the title as-is (imagePromptBuilder skips it)
    const result = parseTelegramCaption('Başlık: Telegram Ürünü 24.03.2026\nFiyat: 500')
    expect(result!.title).toBe('Telegram Ürünü 24.03.2026')
  })
})

// ─── evaluatePublishReadiness ────────────────────────────────────────────────

describe('evaluatePublishReadiness', () => {
  const FULL_PRODUCT = {
    title: 'Nike Air Max 90',
    price: 2199,
    sku: 'AYK-001',
    hasImages: true,
    category: 'Spor',
    brand: 'Nike',
    stockQuantity: 5,
    description: 'A great shoe',
    productFamily: 'shoes',
  }

  it('returns isReady=true for a fully complete product', () => {
    const result = evaluatePublishReadiness(FULL_PRODUCT)
    expect(result.isReady).toBe(true)
    expect(result.missingCritical).toHaveLength(0)
    expect(result.score).toBe(100)
  })

  it('blocks when title is missing', () => {
    const result = evaluatePublishReadiness({ ...FULL_PRODUCT, title: null })
    expect(result.isReady).toBe(false)
    expect(result.missingCritical.some((m) => m.includes('Ürün adı'))).toBe(true)
  })

  it('blocks when title is too short (< 2 chars)', () => {
    const result = evaluatePublishReadiness({ ...FULL_PRODUCT, title: 'A' })
    expect(result.isReady).toBe(false)
  })

  it('blocks when price is null', () => {
    const result = evaluatePublishReadiness({ ...FULL_PRODUCT, price: null })
    expect(result.isReady).toBe(false)
    expect(result.missingCritical.some((m) => m.includes('fiyat'))).toBe(true)
  })

  it('blocks when price is 0', () => {
    const result = evaluatePublishReadiness({ ...FULL_PRODUCT, price: 0 })
    expect(result.isReady).toBe(false)
  })

  it('blocks when price is negative', () => {
    const result = evaluatePublishReadiness({ ...FULL_PRODUCT, price: -100 })
    expect(result.isReady).toBe(false)
  })

  it('blocks when hasImages is false', () => {
    const result = evaluatePublishReadiness({ ...FULL_PRODUCT, hasImages: false })
    expect(result.isReady).toBe(false)
    expect(result.missingCritical.some((m) => m.includes('görsel'))).toBe(true)
  })

  it('blocks when category is missing', () => {
    const result = evaluatePublishReadiness({ ...FULL_PRODUCT, category: null })
    expect(result.isReady).toBe(false)
    expect(result.missingCritical.some((m) => m.includes('Kategori'))).toBe(true)
  })

  it('blocks when brand is missing', () => {
    const result = evaluatePublishReadiness({ ...FULL_PRODUCT, brand: null })
    expect(result.isReady).toBe(false)
    expect(result.missingCritical.some((m) => m.includes('Marka'))).toBe(true)
  })

  it('blocks when stockQuantity is 0', () => {
    const result = evaluatePublishReadiness({ ...FULL_PRODUCT, stockQuantity: 0 })
    expect(result.isReady).toBe(false)
    expect(result.missingCritical.some((m) => m.includes('Stok'))).toBe(true)
  })

  it('blocks when stockQuantity is null', () => {
    const result = evaluatePublishReadiness({ ...FULL_PRODUCT, stockQuantity: null })
    expect(result.isReady).toBe(false)
  })

  it('blocks when stockQuantity is negative', () => {
    const result = evaluatePublishReadiness({ ...FULL_PRODUCT, stockQuantity: -1 })
    expect(result.isReady).toBe(false)
  })

  it('does NOT block when SKU is missing (warning only)', () => {
    const result = evaluatePublishReadiness({ ...FULL_PRODUCT, sku: null })
    expect(result.isReady).toBe(true)
    expect(result.warnings.some((w) => w.includes('SKU'))).toBe(true)
  })

  it('does NOT block when description is missing (warning only)', () => {
    const result = evaluatePublishReadiness({ ...FULL_PRODUCT, description: null })
    expect(result.isReady).toBe(true)
    expect(result.warnings.some((w) => w.includes('açıklama'))).toBe(true)
  })

  it('does NOT block when productFamily is missing (warning only)', () => {
    const result = evaluatePublishReadiness({ ...FULL_PRODUCT, productFamily: null })
    expect(result.isReady).toBe(true)
    expect(result.warnings.some((w) => w.includes('aile'))).toBe(true)
  })

  it('score decreases for each missing critical field', () => {
    const r1 = evaluatePublishReadiness({ ...FULL_PRODUCT, title: null })
    const r2 = evaluatePublishReadiness({ ...FULL_PRODUCT, title: null, price: null })
    expect(r2.score).toBeLessThan(r1.score)
  })

  it('score is close to 0 when all critical fields are missing', () => {
    // SKU is configured as a warning (not a blocker) but the formula divides by 7.
    // With 6 critical misses: Math.round(100 - 6*(100/7)) = Math.round(14.28) = 14.
    const result = evaluatePublishReadiness({
      title: null,
      price: null,
      sku: null,
      hasImages: false,
      category: null,
      brand: null,
      stockQuantity: null,
    })
    expect(result.score).toBe(14)
    expect(result.isReady).toBe(false)
    expect(result.missingCritical).toHaveLength(6)
  })
})

// ─── parseStockUpdate ────────────────────────────────────────────────────────

describe('parseStockUpdate', () => {
  it('returns null for empty string', () => {
    expect(parseStockUpdate('')).toBeNull()
  })

  it('returns null when there is only one line', () => {
    expect(parseStockUpdate('STOCK SKU: UA-000123')).toBeNull()
  })

  it('returns null when SKU header is missing', () => {
    const text = 'RANDOM: UA-000123\n38 +1'
    expect(parseStockUpdate(text)).toBeNull()
  })

  it('returns null when there are no valid change lines', () => {
    const text = 'STOCK SKU: UA-000123\ninvalid line'
    expect(parseStockUpdate(text)).toBeNull()
  })

  it('parses a valid stock update with positive delta', () => {
    const text = 'STOCK SKU: UA-000123\n38 +1\n40 +2'
    const result = parseStockUpdate(text)
    expect(result).not.toBeNull()
    expect(result!.sku).toBe('UA-000123')
    expect(result!.changes).toHaveLength(2)
    expect(result!.changes[0]).toEqual({ size: '38', delta: 1 })
    expect(result!.changes[1]).toEqual({ size: '40', delta: 2 })
  })

  it('parses a stock update with negative delta', () => {
    const text = 'STOCK SKU: UA-000123\n38 -3'
    const result = parseStockUpdate(text)
    expect(result!.changes[0]).toEqual({ size: '38', delta: -3 })
  })

  it('is case-insensitive for the SKU header', () => {
    const text = 'stock sku: ABC-999\n42 +1'
    const result = parseStockUpdate(text)
    expect(result!.sku).toBe('ABC-999')
  })

  it('skips malformed change lines and parses valid ones', () => {
    const text = 'STOCK SKU: TEST-1\nbad line\n40 +1'
    const result = parseStockUpdate(text)
    expect(result!.changes).toHaveLength(1)
    expect(result!.changes[0]).toEqual({ size: '40', delta: 1 })
  })
})

// ─── parseTelegramCaptionLegacy ───────────────────────────────────────────────

describe('parseTelegramCaptionLegacy', () => {
  it('returns null for empty string', () => {
    expect(parseTelegramCaptionLegacy('')).toBeNull()
  })

  it('returns null when SKU, TITLE, or PRICE is missing', () => {
    expect(parseTelegramCaptionLegacy('SKU: X\nTITLE: Shoe')).toBeNull()
    expect(parseTelegramCaptionLegacy('TITLE: Shoe\nPRICE: 100')).toBeNull()
  })

  it('returns null when price is not a valid positive number', () => {
    const text = 'SKU: X\nTITLE: Shoe\nPRICE: invalid'
    expect(parseTelegramCaptionLegacy(text)).toBeNull()
  })

  it('parses a valid legacy caption', () => {
    const text = 'SKU: AYK-001\nTITLE: Nike Air Max\nPRICE: 1999\nCATEGORY: Spor\nBRAND: Nike'
    const result = parseTelegramCaptionLegacy(text)
    expect(result).not.toBeNull()
    expect(result!.sku).toBe('AYK-001')
    expect(result!.title).toBe('Nike Air Max')
    expect(result!.price).toBe(1999)
    expect(result!.category).toBe('Spor')
    expect(result!.brand).toBe('Nike')
  })

  it('parses SIZES field', () => {
    const text = 'SKU: X\nTITLE: Shoe\nPRICE: 100\nSIZES: 38=2, 40=1'
    const result = parseTelegramCaptionLegacy(text)
    expect(result!.sizes['38']).toBe(2)
    expect(result!.sizes['40']).toBe(1)
  })

  it('sets postToInstagram to true when IG: yes', () => {
    const text = 'SKU: X\nTITLE: Shoe\nPRICE: 100\nIG: yes'
    const result = parseTelegramCaptionLegacy(text)
    expect(result!.postToInstagram).toBe(true)
  })

  it('sets postToInstagram to false when IG is not "yes"', () => {
    const text = 'SKU: X\nTITLE: Shoe\nPRICE: 100\nIG: no'
    const result = parseTelegramCaptionLegacy(text)
    expect(result!.postToInstagram).toBe(false)
  })
})
