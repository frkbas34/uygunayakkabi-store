/**
 * telegram.ts — Telegram caption parser + publish-readiness evaluator
 *
 * Step 11: Enhanced caption parser for Mentix/OpenClaw → n8n → Payload intake.
 *
 * Design goals:
 *  - Tolerate imperfect/informal caption formatting (Turkish shortcuts, mixed case)
 *  - Normalize labels and values safely
 *  - Never silently invent critical fields
 *  - Preserve explicit user-provided values
 *  - Generate warnings for missing or ambiguous fields
 *  - Keep raw caption accessible for debugging/review
 *  - Compute a confidence score so admin/automation can act accordingly
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

/** Valid category values matching Products.ts category select */
export type ProductCategory =
  | 'Günlük' | 'Spor' | 'Klasik' | 'Bot' | 'Sandalet' | 'Krampon' | 'Cüzdan'

/** Valid product family values matching Products.ts productFamily select */
export type ProductFamily = 'shoes' | 'wallets' | 'bags' | 'belts' | 'accessories'

/**
 * Structured output of the enhanced caption parser.
 * All fields are optional except rawCaption and the metadata fields.
 * Callers should check parseConfidence and parseWarnings before trusting optional fields.
 */
export type ParsedCaption = {
  // ── Core intake fields ──────────────────────────────────────
  title?: string           // product name — required for product creation
  price?: number           // sale price in TRY — required for activation
  sku?: string             // explicit SKU (auto-generated if absent)
  quantity?: number        // stock count — defaults to 1 if absent

  // ── Classification fields ───────────────────────────────────
  category?: ProductCategory   // normalized to Products enum value
  brand?: string               // extracted or inferred from title
  productFamily?: ProductFamily
  productType?: string         // sneaker / boot / loafer / bifold / etc.

  // ── Automation flags ────────────────────────────────────────
  publishRequested: boolean    // user explicitly requested publish (yayın/yayınla flag)
  seoRequested: boolean        // user requested SEO blog generation (seo/blog flag)
  channelTargets?: string[]    // explicit channel list from caption

  // ── Debug / metadata ────────────────────────────────────────
  rawCaption: string           // original caption text — always preserved
  parseWarnings: string[]      // non-blocking issues found during parsing
  parseConfidence: number      // 0–100 score based on required field coverage
}

/** Legacy type — preserved for backward compatibility */
export type ProductData = {
  sku: string
  title: string
  price: number
  category?: string
  brand?: string
  sizes: Record<string, number>
  description?: string
  postToInstagram: boolean
}

export type StockUpdate = {
  sku: string
  changes: Array<{ size: string; delta: number }>
}

/** Result from the publish-readiness evaluator */
export type PublishReadinessResult = {
  isReady: boolean
  missingCritical: string[]  // blocking — must fix before activation
  warnings: string[]         // non-blocking — recommended but not required
  score: number              // 0–100, overall completeness
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: Label normalizer maps
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps any of the accepted label aliases to a canonical key.
 * Keys are lowercase, trimmed, and Turkish-character-normalized.
 */
const LABEL_MAP: Record<string, string> = {
  // Title
  'baslik': 'title', 'başlık': 'title', 'title': 'title',
  'urun': 'title', 'ürün': 'title', 'ad': 'title', 'isim': 'title', 'name': 'title',
  'urun adi': 'title', 'ürün adı': 'title',

  // Price
  'fiyat': 'price', 'price': 'price', 'fyt': 'price',
  'satis fiyati': 'price', 'satış fiyatı': 'price',
  'ucret': 'price', 'ücret': 'price',

  // SKU
  'sku': 'sku', 'kod': 'sku', 'stok kodu': 'sku', 'urun kodu': 'sku',
  'ürün kodu': 'sku', 'code': 'sku', 'ref': 'sku',

  // Quantity
  'adet': 'quantity', 'stok': 'quantity', 'miktar': 'quantity',
  'quantity': 'quantity', 'qty': 'quantity', 'adet stok': 'quantity',

  // Category
  'kategori': 'category', 'cat': 'category', 'category': 'category',
  'tur': 'category', 'tür': 'category', 'tip': 'category',

  // Brand
  'marka': 'brand', 'brand': 'brand', 'marka adi': 'brand', 'marka adı': 'brand',

  // Product family
  'aile': 'productFamily', 'urun ailesi': 'productFamily', 'ürün ailesi': 'productFamily',

  // Product type
  'urun tipi': 'productType', 'ürün tipi': 'productType', 'type': 'productType',
  'alt tip': 'productType',

  // Publish flag
  'yayin': 'publish', 'yayın': 'publish', 'yayinla': 'publish', 'yayınla': 'publish',
  'publish': 'publish', 'yayinlansin': 'publish', 'yayınlansın': 'publish',
  'yayinla mi': 'publish', 'site': 'publish',

  // SEO/Blog flag
  'seo': 'seo', 'blog': 'seo', 'blog uret': 'seo', 'blog üret': 'seo',
  'seo blog': 'seo', 'icerik': 'seo', 'içerik': 'seo',

  // Channel targets
  'kanal': 'channels', 'kanallar': 'channels', 'channels': 'channels',
  'hedef': 'channels',

  // Instagram shorthand
  'ig': 'instagram', 'instagram': 'instagram', 'insta': 'instagram',
}

/**
 * Maps raw Turkish or English category text to Products enum values.
 */
const CATEGORY_MAP: Record<string, ProductCategory> = {
  // Günlük
  'gunluk': 'Günlük', 'günlük': 'Günlük', 'casual': 'Günlük', 'gundelik': 'Günlük',
  'gündelik': 'Günlük', 'lifestyle': 'Günlük',
  // Spor
  'spor': 'Spor', 'sport': 'Spor', 'atletik': 'Spor', 'kosu': 'Spor',
  'koşu': 'Spor', 'running': 'Spor', 'training': 'Spor', 'fitness': 'Spor',
  // Klasik
  'klasik': 'Klasik', 'formal': 'Klasik', 'business': 'Klasik', 'oxford': 'Klasik',
  'loafer': 'Klasik', 'derby': 'Klasik',
  // Bot
  'bot': 'Bot', 'boots': 'Bot', 'boot': 'Bot', 'ankle': 'Bot',
  'chelsea': 'Bot', 'uzun bot': 'Bot',
  // Sandalet
  'sandalet': 'Sandalet', 'sandal': 'Sandalet', 'flip flop': 'Sandalet',
  'flip-flop': 'Sandalet', 'terlik': 'Sandalet', 'slayt': 'Sandalet',
  // Krampon
  'krampon': 'Krampon', 'cleat': 'Krampon', 'futbol': 'Krampon',
  'football': 'Krampon', 'crampons': 'Krampon',
  // Cüzdan
  'cuzdan': 'Cüzdan', 'cüzdan': 'Cüzdan', 'wallet': 'Cüzdan', 'purse': 'Cüzdan',
  'kartlik': 'Cüzdan', 'kartlık': 'Cüzdan', 'cardholder': 'Cüzdan',
}

/**
 * Maps raw text to ProductFamily values.
 */
const FAMILY_MAP: Record<string, ProductFamily> = {
  'shoes': 'shoes', 'ayakkabi': 'shoes', 'ayakkabı': 'shoes',
  'wallets': 'wallets', 'cuzdan': 'wallets', 'cüzdan': 'wallets', 'wallet': 'wallets',
  'bags': 'bags', 'canta': 'bags', 'çanta': 'bags', 'bag': 'bags',
  'belts': 'belts', 'kemer': 'belts', 'belt': 'belts',
  'accessories': 'accessories', 'aksesuar': 'accessories', 'accessory': 'accessories',
}

/**
 * Known brand keywords to detect from title or explicit brand field.
 * Sorted by specificity (longer multi-word brands first).
 */
const KNOWN_BRANDS = [
  'New Balance', 'Under Armour', 'Lacoste', 'Timberland',
  'Converse', 'Reebok', 'Jordan', 'Adidas', 'Puma', 'Vans', 'Fila',
  'Nike', 'Asics', 'Skechers', 'Levi', 'Crocs',
]

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Normalize a string for label matching: lowercase, trim, collapse spaces */
function normalizeLabel(s: string): string {
  return s
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parse a Turkish/English price string to a number.
 * Handles: "1500", "1.500", "1,500", "1500 TL", "₺1500", "1500 lira", "1.500,00"
 */
function parsePrice(raw: string): number | null {
  // Remove currency symbols and words
  let s = raw.replace(/[₺tlTL]/g, '').replace(/lira/gi, '').trim()

  // Handle Turkish decimal format: "1.500,00" → "1500.00"
  // If there's both . and ,: assume . is thousands sep, , is decimal sep
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',') && !s.includes('.')) {
    // Could be decimal comma or thousands separator
    const afterComma = s.split(',')[1]
    if (afterComma && afterComma.length <= 2) {
      // Decimal comma: "1500,50" → "1500.50"
      s = s.replace(',', '.')
    } else {
      // Thousands: "1,500" → "1500"
      s = s.replace(/,/g, '')
    }
  } else if (s.includes('.')) {
    const afterDot = s.split('.')[1]
    if (afterDot && afterDot.length === 3) {
      // Thousands separator: "1.500" → "1500"
      s = s.replace(/\./g, '')
    }
    // Otherwise keep as decimal: "150.50"
  }

  const n = parseFloat(s.trim())
  return isNaN(n) || n < 0 ? null : n
}

/**
 * Try to detect a brand name from product title.
 * Returns the brand string if found, or null.
 */
function detectBrandFromTitle(title: string): string | null {
  const upper = title.toUpperCase()
  for (const brand of KNOWN_BRANDS) {
    if (upper.includes(brand.toUpperCase())) return brand
  }
  return null
}

/**
 * Try to infer ProductFamily from category or title keywords.
 */
function inferProductFamily(
  category?: ProductCategory,
  title?: string,
): ProductFamily {
  // Direct category → family mapping
  if (category === 'Cüzdan') return 'wallets'

  // Scan title for family keywords
  if (title) {
    const lower = normalizeLabel(title)
    for (const [kw, family] of Object.entries(FAMILY_MAP)) {
      if (lower.includes(normalizeLabel(kw))) return family
    }
  }
  return 'shoes' // safe default for a shoe store
}

/**
 * Parse a truthy/falsy string value.
 * Accepts: yes/no, evet/hayır, 1/0, true/false
 */
function parseBoolFlag(raw: string): boolean {
  const s = raw.toLowerCase().trim()
  return ['yes', 'evet', '1', 'true', 'var', 'istiyorum', 'olsun', 'yap'].includes(s)
}

// ─────────────────────────────────────────────────────────────────────────────
// Main: Enhanced caption parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * parseTelegramCaption — Step 11 enhanced version.
 *
 * Parses a Telegram caption into a structured ParsedCaption result.
 * Never throws; always returns a result object (with warnings if parsing was partial).
 * Returns null only if the caption is completely empty.
 *
 * Supported caption formats (examples):
 *
 * ── Fully labeled ──────────────────────────────────────────
 * Başlık: Nike Air Max 90
 * Fiyat: 2199
 * Kod: AYK-001
 * Adet: 5
 * Kategori: Spor
 * Marka: Nike
 * Yayın: evet
 * SEO: evet
 *
 * ── Mixed / informal ───────────────────────────────────────
 * Nike Air Max 90
 * 2199 TL
 * adet 3
 * spor
 *
 * ── Compact ────────────────────────────────────────────────
 * Nike Air Max - 2199₺ - 3 adet
 */
export function parseTelegramCaption(caption: string): ParsedCaption | null {
  if (!caption || !caption.trim()) return null

  const rawCaption = caption.trim()
  const warnings: string[] = []
  const fields: Record<string, string> = {}

  const lines = rawCaption.split('\n').map((l) => l.trim()).filter(Boolean)

  // ── Pass 1: Extract labeled fields ────────────────────────
  const unlabeledLines: string[] = []

  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0) {
      const rawKey = line.slice(0, colonIdx).trim()
      const value = line.slice(colonIdx + 1).trim()
      const normKey = normalizeLabel(rawKey)
      const canonical = LABEL_MAP[normKey]
      if (canonical && value) {
        // Don't overwrite already-found fields (first occurrence wins)
        if (!fields[canonical]) {
          fields[canonical] = value
        }
      } else {
        // Unknown label or empty value → treat as unlabeled
        unlabeledLines.push(line)
      }
    } else {
      unlabeledLines.push(line)
    }
  }

  // ── Pass 2: Heuristic extraction from unlabeled lines ─────
  for (const line of unlabeledLines) {
    const lower = line.toLowerCase()

    // Price heuristic: line contains ₺ or TL or "lira" with a number
    if (!fields['price']) {
      const priceMatch = line.match(/[\d.,]+(?:\s*[₺lL][iıI]?[rR]?[aA]?)?/)
      if ((lower.includes('₺') || lower.includes('tl') || lower.includes('lira')) && priceMatch) {
        fields['price'] = priceMatch[0].trim()
        continue
      }
      // Pure number on its own line — could be price if it looks reasonable (>10)
      const pureNum = line.match(/^[\d.,]+$/)
      if (pureNum) {
        const n = parsePrice(pureNum[0])
        if (n !== null && n > 10 && !fields['price']) {
          fields['price'] = pureNum[0]
          continue
        }
      }
    }

    // Quantity heuristic: "3 adet", "adet 5", "5 pcs"
    if (!fields['quantity']) {
      const qtyMatch = line.match(/^(\d+)\s*adet/i) || line.match(/^adet\s*(\d+)/i) ||
                       line.match(/^(\d+)\s*pcs/i) || line.match(/^qty\s*[:=]?\s*(\d+)/i)
      if (qtyMatch) {
        fields['quantity'] = qtyMatch[1]
        continue
      }
    }

    // Category heuristic: line matches a known category keyword
    if (!fields['category']) {
      const normLine = normalizeLabel(line)
      if (CATEGORY_MAP[normLine]) {
        fields['category'] = line
        continue
      }
    }

    // Title heuristic: first non-empty unlabeled line that isn't a number or category
    if (!fields['title']) {
      const normLine = normalizeLabel(line)
      const isCategory = !!CATEGORY_MAP[normLine]
      const isNumber = /^[\d.,₺tl\s]+$/i.test(line)
      if (!isCategory && !isNumber && line.length > 2) {
        fields['title'] = line
      }
    }
  }

  // ── Compact "dash-separated" fallback ─────────────────────
  // Handle single-line format: "Nike Air Max - 2199₺ - 3 adet"
  if (!fields['title'] && lines.length === 1) {
    const parts = lines[0].split(/\s*[-–|/]\s*/)
    if (parts.length >= 2) {
      for (const part of parts) {
        const trimmed = part.trim()
        const normPart = normalizeLabel(trimmed)
        if (!fields['title'] && trimmed.length > 2 && !CATEGORY_MAP[normPart] && !/^\d/.test(trimmed)) {
          fields['title'] = trimmed
        } else if (!fields['price']) {
          const n = parsePrice(trimmed)
          if (n !== null && n > 10) fields['price'] = String(n)
        }
      }
    }
  }

  // ── Resolve each field ─────────────────────────────────────

  // Title
  const title = fields['title']?.trim() || undefined
  if (!title) {
    warnings.push('Ürün adı bulunamadı — başlık alanı eksik')
  }

  // Price
  let price: number | undefined
  if (fields['price']) {
    const parsed = parsePrice(fields['price'])
    if (parsed !== null && parsed > 0) {
      price = parsed
    } else {
      warnings.push(`Fiyat ayrıştırılamadı: "${fields['price']}" — geçerli bir sayı değil`)
    }
  } else {
    warnings.push('Fiyat bulunamadı — fiyat alanı eksik')
  }

  // SKU
  const sku = fields['sku']?.trim() || undefined

  // Quantity
  let quantity: number | undefined
  if (fields['quantity']) {
    const n = parseInt(fields['quantity'], 10)
    if (!isNaN(n) && n >= 0) {
      quantity = n
    } else {
      warnings.push(`Adet ayrıştırılamadı: "${fields['quantity']}"`)
    }
  }
  // quantity defaults to 1 if absent — not a warning (common to omit)

  // Category — normalize to enum value
  let category: ProductCategory | undefined
  if (fields['category']) {
    const normCat = normalizeLabel(fields['category'])
    const matched = CATEGORY_MAP[normCat]
    if (matched) {
      category = matched
    } else {
      warnings.push(`Kategori tanınamadı: "${fields['category']}" — geçerli değerlere eşleştirilemiyor`)
    }
  }

  // Brand — explicit first, then inferred from title
  let brand = fields['brand']?.trim() || undefined
  if (!brand && title) {
    const inferred = detectBrandFromTitle(title)
    if (inferred) {
      brand = inferred
      // Not a warning — inference is expected behavior
    }
  }
  if (!brand) {
    warnings.push('Marka bulunamadı veya tanınamadı')
  }

  // Product family — explicit first, then inferred
  let productFamily: ProductFamily | undefined
  if (fields['productFamily']) {
    const normFam = normalizeLabel(fields['productFamily'])
    productFamily = FAMILY_MAP[normFam] ?? inferProductFamily(category, title)
  } else {
    productFamily = inferProductFamily(category, title)
  }

  // Product type
  const productType = fields['productType']?.trim() || undefined

  // Publish flag
  let publishRequested = false
  if (fields['publish']) {
    publishRequested = parseBoolFlag(fields['publish'])
  } else if (fields['instagram']) {
    publishRequested = parseBoolFlag(fields['instagram'])
  }

  // SEO/Blog flag
  let seoRequested = false
  if (fields['seo']) {
    seoRequested = parseBoolFlag(fields['seo'])
  }

  // Channel targets
  let channelTargets: string[] | undefined
  if (fields['channels']) {
    const rawChannels = fields['channels'].toLowerCase()
    const targets: string[] = []
    if (rawChannels.includes('website') || rawChannels.includes('site') || rawChannels.includes('web')) targets.push('website')
    if (rawChannels.includes('instagram') || rawChannels.includes('insta') || rawChannels.includes('ig')) targets.push('instagram')
    if (rawChannels.includes('shopier')) targets.push('shopier')
    if (rawChannels.includes('dolap')) targets.push('dolap')
    if (targets.length > 0) channelTargets = targets
  }

  // ── Compute confidence score ───────────────────────────────
  // Based on presence of required fields for publication readiness
  // Max 100 — each required field contributes points
  const scoreComponents = [
    { field: 'title', weight: 30, present: !!title },
    { field: 'price', weight: 25, present: !!price },
    { field: 'category', weight: 15, present: !!category },
    { field: 'brand', weight: 15, present: !!brand },
    { field: 'sku', weight: 10, present: !!sku },
    { field: 'quantity', weight: 5, present: quantity !== undefined },
  ]
  const parseConfidence = scoreComponents.reduce(
    (sum, c) => sum + (c.present ? c.weight : 0), 0,
  )

  return {
    title,
    price,
    sku,
    quantity,
    category,
    brand,
    productFamily,
    productType,
    publishRequested,
    seoRequested,
    channelTargets,
    rawCaption,
    parseWarnings: warnings,
    parseConfidence,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Publish Readiness Evaluator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * evaluatePublishReadiness — Step 11 readiness gate.
 *
 * A product is ready to publish only if all critical fields are present and valid.
 * Non-critical missing fields generate warnings but don't block activation.
 *
 * Critical (blocking):
 *   title, price > 0, sku (auto-gen acceptable), hasImages, category, brand, stockQuantity > 0
 *
 * Recommended (non-blocking warnings):
 *   description, productFamily
 *
 * Usage:
 *   const r = evaluatePublishReadiness({ title, price, sku, hasImages, category, brand, stockQuantity })
 *   if (r.isReady) { // safe to activate }
 */
export function evaluatePublishReadiness(product: {
  title?: string | null
  price?: number | null
  sku?: string | null
  hasImages: boolean
  category?: string | null
  brand?: string | null
  stockQuantity?: number | null
  description?: string | null
  productFamily?: string | null
}): PublishReadinessResult {
  const missingCritical: string[] = []
  const warnings: string[] = []

  // Critical checks
  if (!product.title || String(product.title).trim().length < 2) {
    missingCritical.push('Ürün adı')
  }
  if (!product.price || Number(product.price) <= 0) {
    missingCritical.push('Satış fiyatı (0\'dan büyük olmalı)')
  }
  if (!product.sku || String(product.sku).trim().length === 0) {
    // SKU is auto-generated, so mark as warning not blocker
    warnings.push('SKU girilmemiş — otomatik oluşturulacak')
  }
  if (!product.hasImages) {
    missingCritical.push('En az 1 ürün görseli')
  }
  if (!product.category) {
    missingCritical.push('Kategori')
  }
  if (!product.brand || String(product.brand).trim().length === 0) {
    missingCritical.push('Marka')
  }
  const stockQty = product.stockQuantity !== undefined && product.stockQuantity !== null
    ? Number(product.stockQuantity)
    : null
  if (stockQty === null || stockQty <= 0) {
    missingCritical.push('Stok adedi (en az 1 olmalı)')
  }

  // Non-critical warnings
  if (!product.description) {
    warnings.push('Ürün açıklaması girilmemiş')
  }
  if (!product.productFamily) {
    warnings.push('Ürün ailesi seçilmemiş')
  }

  // Score: starts at 100, deduct for each critical miss
  const criticalWeight = 100 / 7  // 7 critical fields
  const score = Math.max(0, Math.round(100 - missingCritical.length * criticalWeight))

  return {
    isReady: missingCritical.length === 0,
    missingCritical,
    warnings,
    score,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy parser — preserved for backward compatibility
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @deprecated Use parseTelegramCaption instead.
 * Preserved for any code that still imports this type/function directly.
 */
export function parseTelegramCaptionLegacy(caption: string): ProductData | null {
  if (!caption) return null

  const lines = caption.split('\n').map((l) => l.trim())
  const lFields: Record<string, string> = {}

  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim().toUpperCase()
    const value = line.slice(colonIdx + 1).trim()
    lFields[key] = value
  }

  const sku = lFields['SKU']
  const title = lFields['TITLE']
  const priceStr = lFields['PRICE']

  if (!sku || !title || !priceStr) return null

  const price = parseFloat(priceStr)
  if (isNaN(price) || price <= 0) return null

  const sizes: Record<string, number> = {}
  if (lFields['SIZES']) {
    const sizeParts = lFields['SIZES'].split(',')
    for (const part of sizeParts) {
      const [sizeStr, stockStr] = part.trim().split('=')
      if (sizeStr && stockStr) {
        const stock = parseInt(stockStr.trim(), 10)
        if (!isNaN(stock) && stock >= 0) {
          sizes[sizeStr.trim()] = stock
        }
      }
    }
  }

  return {
    sku: sku.trim(),
    title: title.trim(),
    price,
    category: lFields['CATEGORY']?.trim(),
    brand: lFields['BRAND']?.trim(),
    sizes,
    description: lFields['DESC']?.trim(),
    postToInstagram: lFields['IG']?.toLowerCase() === 'yes',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock update parser — unchanged from original
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a Telegram stock update command.
 *
 * Expected format:
 * STOCK SKU: UA-000123
 * 38 +1
 * 40 -1
 */
export function parseStockUpdate(text: string): StockUpdate | null {
  if (!text) return null

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return null

  const firstLine = lines[0]
  const skuMatch = firstLine.match(/^STOCK SKU:\s*(.+)$/i)
  if (!skuMatch) return null

  const sku = skuMatch[1].trim()
  const changes: Array<{ size: string; delta: number }> = []

  for (let i = 1; i < lines.length; i++) {
    const match = lines[i].match(/^(\S+)\s+([+-]\d+)$/)
    if (match) {
      const size = match[1]
      const delta = parseInt(match[2], 10)
      if (!isNaN(delta)) {
        changes.push({ size, delta })
      }
    }
  }

  if (changes.length === 0) return null

  return { sku, changes }
}
