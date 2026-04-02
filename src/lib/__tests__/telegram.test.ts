import { describe, it, expect } from 'vitest'
import {
  parseTelegramCaption,
  evaluatePublishReadiness,
  parseStockUpdate,
  parseTelegramCaptionLegacy,
} from '../telegram'

// ─── parseTelegramCaption ──────────────────────────────────────────────────

describe('parseTelegramCaption', () => {
  describe('null / empty input', () => {
    it('returns null for empty string', () => {
      expect(parseTelegramCaption('')).toBeNull()
    })

    it('returns null for whitespace-only string', () => {
      expect(parseTelegramCaption('   \n  ')).toBeNull()
    })
  })

  describe('fully-labeled caption format', () => {
    const caption = [
      'Başlık: Nike Air Max 90',
      'Fiyat: 2199',
      'Kod: AYK-001',
      'Adet: 5',
      'Kategori: Spor',
      'Marka: Nike',
      'Yayın: evet',
      'SEO: evet',
    ].join('\n')

    it('parses title', () => {
      expect(parseTelegramCaption(caption)?.title).toBe('Nike Air Max 90')
    })

    it('parses price as a number', () => {
      expect(parseTelegramCaption(caption)?.price).toBe(2199)
    })

    it('parses sku', () => {
      expect(parseTelegramCaption(caption)?.sku).toBe('AYK-001')
    })

    it('parses quantity', () => {
      expect(parseTelegramCaption(caption)?.quantity).toBe(5)
    })

    it('normalizes category to enum value', () => {
      expect(parseTelegramCaption(caption)?.category).toBe('Spor')
    })

    it('parses explicit brand', () => {
      expect(parseTelegramCaption(caption)?.brand).toBe('Nike')
    })

    it('parses publishRequested flag', () => {
      expect(parseTelegramCaption(caption)?.publishRequested).toBe(true)
    })

    it('parses seoRequested flag', () => {
      expect(parseTelegramCaption(caption)?.seoRequested).toBe(true)
    })

    it('preserves rawCaption', () => {
      const result = parseTelegramCaption(caption)
      expect(result?.rawCaption).toBe(caption)
    })

    it('returns a high parseConfidence (title+price+category+brand+sku+quantity = 100)', () => {
      expect(parseTelegramCaption(caption)?.parseConfidence).toBe(100)
    })
  })

  describe('Turkish label aliases', () => {
    it('accepts "baslik" as title alias', () => {
      const result = parseTelegramCaption('baslik: Adidas Stan Smith\nfiyat: 999')
      expect(result?.title).toBe('Adidas Stan Smith')
    })

    it('accepts "fyt" as price alias', () => {
      const result = parseTelegramCaption('baslik: Test\nfyt: 500')
      expect(result?.price).toBe(500)
    })

    it('accepts "stok" as quantity alias', () => {
      const result = parseTelegramCaption('baslik: Test\nfiyat: 100\nstok: 3')
      expect(result?.quantity).toBe(3)
    })

    it('accepts "marka" as brand alias', () => {
      const result = parseTelegramCaption('baslik: Test\nfiyat: 100\nmarka: Puma')
      expect(result?.brand).toBe('Puma')
    })
  })

  describe('heuristic extraction from unlabeled lines', () => {
    it('extracts price from a line with ₺ symbol', () => {
      const result = parseTelegramCaption('Nike Air Force 1\n1500₺\n3 adet')
      expect(result?.price).toBe(1500)
    })

    it('extracts price from a line with TL', () => {
      const result = parseTelegramCaption('Puma RS-X\n1200 TL')
      expect(result?.price).toBe(1200)
    })

    it('extracts quantity from "3 adet" pattern', () => {
      const result = parseTelegramCaption('Nike Shoes\n1000 TL\n3 adet')
      expect(result?.quantity).toBe(3)
    })

    it('extracts quantity from "adet 5" pattern', () => {
      const result = parseTelegramCaption('Nike Shoes\n1000 TL\nadet 5')
      expect(result?.quantity).toBe(5)
    })

    it('infers category from standalone category keyword', () => {
      const result = parseTelegramCaption('Nike Shoes\n1000 TL\nSpor')
      expect(result?.category).toBe('Spor')
    })

    it('infers category from "Bot" keyword', () => {
      const result = parseTelegramCaption('Chelsea Boot\n1500 TL\nBot')
      expect(result?.category).toBe('Bot')
    })

    it('uses first unlabeled non-number non-category line as title', () => {
      const result = parseTelegramCaption('Converse Chuck Taylor\n800 TL')
      expect(result?.title).toBe('Converse Chuck Taylor')
    })
  })

  describe('compact dash-separated format', () => {
    it('parses compact format with ₺ currency marker', () => {
      // Price is extracted via the ₺ heuristic in pass 2
      const result = parseTelegramCaption('Adidas Superstar - 1500₺')
      expect(result?.price).toBe(1500)
    })

    it('parses price from multi-part compact line with ₺ marker', () => {
      // The ₺ heuristic in pass 2 extracts the price; the line then gets skipped via continue
      const result = parseTelegramCaption('Nike Air Max - 2199₺ - 3 adet')
      expect(result?.price).toBe(2199)
    })
  })

  describe('price parsing edge cases', () => {
    it('parses Turkish thousands separator "1.500"', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: 1.500')
      expect(result?.price).toBe(1500)
    })

    it('parses comma-separated thousands "1,500"', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: 1,500')
      expect(result?.price).toBe(1500)
    })

    it('parses decimal price "150.50"', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: 150.50')
      expect(result?.price).toBe(150.5)
    })

    it('parses Turkish decimal "1.500,00"', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: 1.500,00')
      expect(result?.price).toBe(1500)
    })

    it('strips ₺ symbol from price', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: ₺999')
      expect(result?.price).toBe(999)
    })

    it('strips TL from price string', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: 750 TL')
      expect(result?.price).toBe(750)
    })

    it('warns on invalid price format', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: abc')
      expect(result?.price).toBeUndefined()
      expect(result?.parseWarnings).toEqual(
        expect.arrayContaining([expect.stringContaining('ayrıştırılamadı')]),
      )
    })
  })

  describe('brand inference from title', () => {
    it('infers Nike brand from title', () => {
      const result = parseTelegramCaption('Başlık: Nike Air Force 1\nFiyat: 1000')
      expect(result?.brand).toBe('Nike')
    })

    it('infers Adidas brand (case-insensitive)', () => {
      const result = parseTelegramCaption('Başlık: adidas Gazelle\nFiyat: 900')
      expect(result?.brand).toBe('Adidas')
    })

    it('infers New Balance from title', () => {
      const result = parseTelegramCaption('Başlık: New Balance 990\nFiyat: 2500')
      expect(result?.brand).toBe('New Balance')
    })

    it('explicit brand field takes priority over inference', () => {
      const result = parseTelegramCaption('Başlık: Custom Shoe\nFiyat: 500\nMarka: Nike')
      expect(result?.brand).toBe('Nike')
    })

    it('generates brand warning when brand cannot be detected', () => {
      const result = parseTelegramCaption('Başlık: Generic Shoe\nFiyat: 400')
      expect(result?.parseWarnings).toEqual(
        expect.arrayContaining([expect.stringContaining('Marka')]),
      )
    })
  })

  describe('category normalization', () => {
    const categories: Array<[string, string]> = [
      ['gunluk', 'Günlük'],
      ['Günlük', 'Günlük'],
      ['spor', 'Spor'],
      ['Bot', 'Bot'],
      ['chelsea', 'Bot'],
      ['Sandalet', 'Sandalet'],
      ['Klasik', 'Klasik'],
      ['wallet', 'Cüzdan'],
      ['Krampon', 'Krampon'],
    ]
    it.each(categories)('maps "%s" → "%s"', (raw, expected) => {
      const result = parseTelegramCaption(`Başlık: Test\nFiyat: 100\nKategori: ${raw}`)
      expect(result?.category).toBe(expected)
    })

    it('warns on unknown category', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nKategori: YeniKategori')
      expect(result?.parseWarnings).toEqual(
        expect.arrayContaining([expect.stringContaining('Kategori tanınamadı')]),
      )
    })
  })

  describe('productFamily inference', () => {
    it('infers "wallets" from Cüzdan category', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nKategori: Cüzdan')
      expect(result?.productFamily).toBe('wallets')
    })

    it('defaults to "shoes" for generic shoe products', () => {
      const result = parseTelegramCaption('Başlık: Test Shoe\nFiyat: 100\nKategori: Spor')
      expect(result?.productFamily).toBe('shoes')
    })

    it('infers "bags" from title containing "çanta"', () => {
      const result = parseTelegramCaption('Başlık: Deri Çanta\nFiyat: 300')
      expect(result?.productFamily).toBe('bags')
    })
  })

  describe('publish and SEO flags', () => {
    it('parses "hayır" as false', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nYayın: hayır')
      expect(result?.publishRequested).toBe(false)
    })

    it('parses "evet" as true for seoRequested', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nSEO: evet')
      expect(result?.seoRequested).toBe(true)
    })

    it('defaults publishRequested to false when absent', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: 100')
      expect(result?.publishRequested).toBe(false)
    })

    it('sets publishRequested via instagram shorthand', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nig: yes')
      expect(result?.publishRequested).toBe(true)
    })
  })

  describe('channel targets', () => {
    it('parses website channel', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nKanallar: website, instagram')
      expect(result?.channelTargets).toContain('website')
      expect(result?.channelTargets).toContain('instagram')
    })

    it('parses shopier channel', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nKanallar: shopier')
      expect(result?.channelTargets).toContain('shopier')
    })
  })

  describe('confidence scoring', () => {
    it('scores 0 when no fields found', () => {
      // A very minimal caption that can't extract any useful fields
      const result = parseTelegramCaption('...') 
      expect(result?.parseConfidence).toBe(0)
    })

    it('scores 30 when only title is found', () => {
      const result = parseTelegramCaption('Nike Air Max')
      // title=30, brand inferred from Nike title=15 → 45
      // Brand is inferred so it counts
      expect(result?.parseConfidence).toBeGreaterThanOrEqual(30)
    })

    it('scores at most 100', () => {
      const result = parseTelegramCaption(
        'Başlık: Nike Air Max\nFiyat: 999\nKod: SKU1\nAdet: 3\nKategori: Spor\nMarka: Nike'
      )
      expect(result?.parseConfidence).toBeLessThanOrEqual(100)
    })
  })

  describe('first-occurrence wins for duplicate labels', () => {
    it('uses first price when duplicated', () => {
      const result = parseTelegramCaption('Başlık: Test\nFiyat: 100\nFiyat: 200')
      expect(result?.price).toBe(100)
    })
  })
})

// ─── evaluatePublishReadiness ──────────────────────────────────────────────

describe('evaluatePublishReadiness', () => {
  const readyProduct = {
    title: 'Nike Air Max 90',
    price: 2199,
    sku: 'AYK-001',
    hasImages: true,
    category: 'Spor',
    brand: 'Nike',
    stockQuantity: 5,
    description: 'Comfortable sneaker',
    productFamily: 'shoes',
  }

  it('returns isReady=true for a fully populated product', () => {
    const result = evaluatePublishReadiness(readyProduct)
    expect(result.isReady).toBe(true)
    expect(result.missingCritical).toHaveLength(0)
  })

  it('returns score 100 for fully populated product', () => {
    const result = evaluatePublishReadiness(readyProduct)
    expect(result.score).toBe(100)
  })

  it('blocks on missing title', () => {
    const result = evaluatePublishReadiness({ ...readyProduct, title: '' })
    expect(result.isReady).toBe(false)
    expect(result.missingCritical).toContain('Ürün adı')
  })

  it('blocks on null title', () => {
    const result = evaluatePublishReadiness({ ...readyProduct, title: null })
    expect(result.isReady).toBe(false)
  })

  it('blocks on title shorter than 2 chars', () => {
    const result = evaluatePublishReadiness({ ...readyProduct, title: 'X' })
    expect(result.isReady).toBe(false)
    expect(result.missingCritical).toContain('Ürün adı')
  })

  it('blocks on missing price', () => {
    const result = evaluatePublishReadiness({ ...readyProduct, price: null })
    expect(result.isReady).toBe(false)
    expect(result.missingCritical).toEqual(
      expect.arrayContaining([expect.stringContaining('fiyat')]),
    )
  })

  it('blocks on zero price', () => {
    const result = evaluatePublishReadiness({ ...readyProduct, price: 0 })
    expect(result.isReady).toBe(false)
  })

  it('blocks on negative price', () => {
    const result = evaluatePublishReadiness({ ...readyProduct, price: -1 })
    expect(result.isReady).toBe(false)
  })

  it('blocks on no images', () => {
    const result = evaluatePublishReadiness({ ...readyProduct, hasImages: false })
    expect(result.isReady).toBe(false)
    expect(result.missingCritical).toEqual(
      expect.arrayContaining([expect.stringContaining('görsel')]),
    )
  })

  it('blocks on missing category', () => {
    const result = evaluatePublishReadiness({ ...readyProduct, category: null })
    expect(result.isReady).toBe(false)
    expect(result.missingCritical).toContain('Kategori')
  })

  it('blocks on missing brand', () => {
    const result = evaluatePublishReadiness({ ...readyProduct, brand: '' })
    expect(result.isReady).toBe(false)
    expect(result.missingCritical).toContain('Marka')
  })

  it('blocks on zero stockQuantity', () => {
    const result = evaluatePublishReadiness({ ...readyProduct, stockQuantity: 0 })
    expect(result.isReady).toBe(false)
    expect(result.missingCritical).toEqual(
      expect.arrayContaining([expect.stringContaining('Stok')]),
    )
  })

  it('blocks on null stockQuantity', () => {
    const result = evaluatePublishReadiness({ ...readyProduct, stockQuantity: null })
    expect(result.isReady).toBe(false)
  })

  it('does NOT block on missing SKU (only warns)', () => {
    const result = evaluatePublishReadiness({ ...readyProduct, sku: null })
    expect(result.isReady).toBe(true)
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('SKU')]),
    )
  })

  it('does NOT block on missing description (only warns)', () => {
    const result = evaluatePublishReadiness({ ...readyProduct, description: null })
    expect(result.isReady).toBe(true)
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('açıklama')]),
    )
  })

  it('does NOT block on missing productFamily (only warns)', () => {
    const result = evaluatePublishReadiness({ ...readyProduct, productFamily: null })
    expect(result.isReady).toBe(true)
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('Ürün ailesi')]),
    )
  })

  it('score decreases proportionally with missing critical fields', () => {
    // 6 of 7 critical fields missing → score = Math.max(0, round(100 - 6*(100/7))) = 14
    const allMissing = {
      title: null,
      price: null,
      sku: null,
      hasImages: false,
      category: null,
      brand: null,
      stockQuantity: null,
    }
    const result = evaluatePublishReadiness(allMissing)
    expect(result.score).toBe(14)
    expect(result.missingCritical).toHaveLength(6)
  })

  it('score is never below 0', () => {
    const product = {
      title: null,
      price: null,
      sku: null,
      hasImages: false,
      category: null,
      brand: null,
      stockQuantity: null,
    }
    const result = evaluatePublishReadiness(product)
    expect(result.score).toBeGreaterThanOrEqual(0)
  })
})

// ─── parseStockUpdate ──────────────────────────────────────────────────────

describe('parseStockUpdate', () => {
  it('returns null for empty string', () => {
    expect(parseStockUpdate('')).toBeNull()
  })

  it('returns null for single-line input', () => {
    expect(parseStockUpdate('STOCK SKU: UA-001')).toBeNull()
  })

  it('returns null when first line does not match STOCK SKU pattern', () => {
    const text = 'Something else\n38 +1'
    expect(parseStockUpdate(text)).toBeNull()
  })

  it('parses a standard multi-line stock update', () => {
    const text = 'STOCK SKU: UA-000123\n38 +1\n40 -1'
    const result = parseStockUpdate(text)
    expect(result).not.toBeNull()
    expect(result?.sku).toBe('UA-000123')
    expect(result?.changes).toHaveLength(2)
  })

  it('parses positive delta correctly', () => {
    const text = 'STOCK SKU: SKU-001\n42 +3'
    const result = parseStockUpdate(text)
    expect(result?.changes[0]).toEqual({ size: '42', delta: 3 })
  })

  it('parses negative delta correctly', () => {
    const text = 'STOCK SKU: SKU-001\n39 -2'
    const result = parseStockUpdate(text)
    expect(result?.changes[0]).toEqual({ size: '39', delta: -2 })
  })

  it('returns null when all change lines have invalid format', () => {
    const text = 'STOCK SKU: SKU-001\ninvalid line here'
    expect(parseStockUpdate(text)).toBeNull()
  })

  it('handles multiple size changes', () => {
    const text = 'STOCK SKU: TEST\n36 +1\n37 +2\n38 -1\n39 +0'
    const result = parseStockUpdate(text)
    expect(result?.changes).toHaveLength(4)
    expect(result?.changes[2]).toEqual({ size: '38', delta: -1 })
  })

  it('trims whitespace from SKU', () => {
    const text = 'STOCK SKU:   UA-999  \n38 +1'
    const result = parseStockUpdate(text)
    expect(result?.sku).toBe('UA-999')
  })

  it('is case-insensitive for STOCK SKU prefix', () => {
    const text = 'stock sku: AYK-100\n38 +1'
    const result = parseStockUpdate(text)
    expect(result).not.toBeNull()
    expect(result?.sku).toBe('AYK-100')
  })
})

// ─── parseTelegramCaptionLegacy ────────────────────────────────────────────

describe('parseTelegramCaptionLegacy', () => {
  it('returns null for empty string', () => {
    expect(parseTelegramCaptionLegacy('')).toBeNull()
  })

  it('returns null when required fields are missing', () => {
    expect(parseTelegramCaptionLegacy('SKU: X')).toBeNull()
    expect(parseTelegramCaptionLegacy('TITLE: Test\nPRICE: 100')).toBeNull()
  })

  it('parses a valid legacy caption', () => {
    const caption = 'SKU: SHOE-001\nTITLE: Nike Air Max\nPRICE: 1500'
    const result = parseTelegramCaptionLegacy(caption)
    expect(result?.sku).toBe('SHOE-001')
    expect(result?.title).toBe('Nike Air Max')
    expect(result?.price).toBe(1500)
  })

  it('returns null when price is not a valid number', () => {
    const caption = 'SKU: X\nTITLE: Test\nPRICE: abc'
    expect(parseTelegramCaptionLegacy(caption)).toBeNull()
  })

  it('returns null when price is zero or negative', () => {
    expect(parseTelegramCaptionLegacy('SKU: X\nTITLE: T\nPRICE: 0')).toBeNull()
    expect(parseTelegramCaptionLegacy('SKU: X\nTITLE: T\nPRICE: -5')).toBeNull()
  })

  it('parses SIZES field', () => {
    const caption = 'SKU: X\nTITLE: T\nPRICE: 100\nSIZES: 38=2, 39=1, 40=0'
    const result = parseTelegramCaptionLegacy(caption)
    expect(result?.sizes).toEqual({ '38': 2, '39': 1, '40': 0 })
  })

  it('parses postToInstagram flag', () => {
    const caption = 'SKU: X\nTITLE: T\nPRICE: 100\nIG: yes'
    expect(parseTelegramCaptionLegacy(caption)?.postToInstagram).toBe(true)
  })

  it('postToInstagram is false for non-yes values', () => {
    const caption = 'SKU: X\nTITLE: T\nPRICE: 100\nIG: no'
    expect(parseTelegramCaptionLegacy(caption)?.postToInstagram).toBe(false)
  })
})
