/**
 * supplierScout/parser.ts
 *
 * Extracts structured product offer data and sold-out signals from
 * Telegram group messages using Gemini + regex cross-validation.
 *
 * Two primary functions:
 *   parseProductOffer()   — for new_product / product_update messages
 *   parseSoldOutSignal()  — for sold_out / partial_sold_out messages
 *
 * STATUS: IMPLEMENTED (D-278)
 */

import type {
  ParsedProductOffer,
  ParsedSoldOutSignal,
  ConfidenceLevel,
  TgMessage,
  SupplierGroupConfig,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Pricing helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Extract wholesale price and currency from raw text. */
function extractPrice(text: string): { price?: number; currency?: 'USD' | 'TRY' | 'EUR' } {
  // USD patterns: $50, $ 50, 50$, 50 dolar, 50 USD, 50usd
  const usdMatch =
    text.match(/\$\s*(\d+(?:[.,]\d+)?)/i) ??
    text.match(/(\d+(?:[.,]\d+)?)\s*\$/) ??
    text.match(/(\d+(?:[.,]\d+)?)\s*(?:dolar|usd)\b/i)
  if (usdMatch) {
    return { price: parseFloat(usdMatch[1].replace(',', '.')), currency: 'USD' }
  }

  // TRY patterns: 1500 TL, 1500₺, ₺1500, 1500 lira
  const tryMatch =
    text.match(/(\d+(?:[.,]\d+)?)\s*(?:tl|₺|lira)\b/i) ??
    text.match(/₺\s*(\d+(?:[.,]\d+)?)/)
  if (tryMatch) {
    return { price: parseFloat(tryMatch[1].replace(',', '.')), currency: 'TRY' }
  }

  // EUR patterns
  const eurMatch =
    text.match(/€\s*(\d+(?:[.,]\d+)?)/) ??
    text.match(/(\d+(?:[.,]\d+)?)\s*(?:euro|eur)\b/i)
  if (eurMatch) {
    return { price: parseFloat(eurMatch[1].replace(',', '.')), currency: 'EUR' }
  }

  return {}
}

/** Compute website price from wholesale price. */
export function computeWebsitePrice(
  wholesalePrice: number,
  currency: 'USD' | 'TRY' | 'EUR',
  marginUSD: number,
  usdToTryRate: number,
): number {
  if (currency === 'USD') {
    return Math.round((wholesalePrice + marginUSD) * usdToTryRate)
  }
  if (currency === 'EUR') {
    // Approximate: EUR ≈ 1.1 USD
    const asUsd = wholesalePrice * 1.1
    return Math.round((asUsd + marginUSD) * usdToTryRate)
  }
  // TRY — add margin converted to TRY
  return Math.round(wholesalePrice + marginUSD * usdToTryRate)
}

// ─────────────────────────────────────────────────────────────────────────────
// Size extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractSizes(text: string): { min?: number; max?: number; sizes?: number[] } {
  // Range: 36-45, 36–45, 36/45, numara 36-45
  const rangeMatch = text.match(/\b(3[5-9]|4[0-6])\s*[-–/]\s*(3[5-9]|4[0-6])\b/)
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1])
    const max = parseInt(rangeMatch[2])
    return { min, max }
  }

  // Explicit list: 36, 37, 38, 40
  const listMatches = text.match(/\b(3[5-9]|4[0-6])(?:\s*[,/]\s*(3[5-9]|4[0-6]))+\b/g)
  if (listMatches) {
    const sizes = listMatches[0].split(/\s*[,/]\s*/).map(s => parseInt(s)).filter(n => n >= 35 && n <= 46)
    if (sizes.length > 0) {
      return { min: Math.min(...sizes), max: Math.max(...sizes), sizes }
    }
  }

  // Tam seri → 36–45
  if (/tam\s*seri/i.test(text)) {
    return { min: 36, max: 45 }
  }
  // Seri without explicit range → infer 36-45
  if (/\bseri\b/i.test(text) && !/\d/.test(text)) {
    return { min: 36, max: 45 }
  }

  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Shorthand Normalization
// Pre-processes text before Gemini extraction to expand known brand
// abbreviations and Turkish size terms. Used for Gemini prompt only —
// never overwrites rawText stored in WholesaleOpportunities.
// ─────────────────────────────────────────────────────────────────────────────

// Ordered so more-specific patterns (AF1, AJ1) run before shorter ones (AJ).
const BRAND_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bAF\s?1\b/gi,  'Air Force 1'],
  [/\bAM\s?90\b/gi, 'Air Max 90'],
  [/\bAM\s?95\b/gi, 'Air Max 95'],
  [/\bAM\s?97\b/gi, 'Air Max 97'],
  [/\bAJ\s?1\b/gi,  'Air Jordan 1'],
  [/\bAJ\b/gi,      'Air Jordan'],
  [/\bNB\b/gi,      'New Balance'],
  [/\bTN\b/gi,      'Air Max TN'],
  [/\bSB\b/gi,      'SB Dunk'],
  [/\bYZY\b/gi,     'Yeezy'],
]

const TURKISH_NORMALIZATIONS: Array<[RegExp, string]> = [
  [/\bbdn\b/gi, 'beden'],
  [/\bnum\b/gi, 'numara'],
  [/\bno\b/gi,  'numara'],
]

/**
 * Expand known sneaker brand abbreviations and Turkish shorthand terms.
 * Returns a normalized copy of the text for use in the Gemini extraction prompt.
 * The original message text (rawText) is NEVER modified.
 */
export function normalizeShorthand(text: string): string {
  let result = text
  for (const [pattern, replacement] of BRAND_ABBREVIATIONS) {
    result = result.replace(pattern, replacement)
  }
  for (const [pattern, replacement] of TURKISH_NORMALIZATIONS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini Product Extraction Prompt
// ─────────────────────────────────────────────────────────────────────────────

function buildProductExtractionPrompt(
  text: string,
  hasPhoto: boolean,
  groupConfig: SupplierGroupConfig | null,
  customTerms: Array<{ term: string; meaning: string }>,
): string {
  const currency = groupConfig?.currency ?? 'USD'
  const customTermsStr = customTerms.length > 0
    ? '\nÖZEL TERİMLER:\n' + customTerms.map(t => `  "${t.term}" = ${t.meaning}`).join('\n')
    : ''

  return `Sen Türkçe toptan tedarikçi Telegram mesajlarından ürün bilgisi çıkaran bir uzman sistemsin.
Mesajın para birimi: ${currency}
Fotoğraf var: ${hasPhoto ? 'EVET' : 'HAYIR'}
${customTermsStr}

MESAJ:
"""
${text.substring(0, 1500)}
"""

Aşağıdaki JSON formatında ürün bilgilerini çıkar. Bilgi yoksa null bırak.
Sadece mesajda gerçekten yazan bilgileri çıkar — tahmin etme.

{
  "productName": "<tam ürün adı veya null>",
  "brand": "<marka veya null>",
  "model": "<model kodu/adı veya null>",
  "color": "<renk veya null>",
  "material": "<malzeme veya null>",
  "category": "<Spor|Günlük|Klasik|Bot|Sandalet|Cüzdan|null>",
  "gender": "<erkek|kadın|unisex|çocuk|unknown>",
  "sizeMin": <sayı veya null>,
  "sizeMax": <sayı veya null>,
  "availableSizes": [<sayı listesi veya null>],
  "wholesalePrice": <sayı veya null>,
  "wholesaleCurrency": "<USD|TRY|EUR|null>",
  "parseConfidence": "<high|medium|low>",
  "parseScore": <0-100>,
  "missingFields": ["<eksik kritik alanlar>"],
  "parseWarnings": ["<uyarılar>"]
}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Product Offer Parser
// ─────────────────────────────────────────────────────────────────name────────
// ─────────────────────────────────────────────────────────────────────────────

export async function parseProductOffer(
  message: TgMessage,
  groupConfig: SupplierGroupConfig | null,
  customTerms: Array<{ term: string; meaning: string }> = [],
  marginUSD = 15,
  usdToTryRate = 32,
): Promise<ParsedProductOffer> {
  const text = (message.text ?? message.caption ?? '').trim()
  const hasPhoto = Boolean(message.photo && message.photo.length > 0)
  const fileIds = message.photo?.map(p => p.file_id) ?? []

  // Base result with source metadata
  const base: ParsedProductOffer = {
    hasPhoto,
    telegramFileIds: fileIds,
    telegramMessageId: message.message_id,
    telegramMediaGroupId: message.media_group_id,
    sellerUserId: message.from?.id,
    sellerUsername: message.from?.username,
    sellerName: [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' '),
    supplierGroupTelegramId: message.chat.id,
    rawText: text,
    parseConfidence: 'none',
    parseScore: 0,
    missingFields: [],
    parseWarnings: [],
  }

  if (!text && !hasPhoto) {
    base.missingFields = ['productName', 'price', 'sizes']
    base.parseWarnings = ['Mesajda metin ve fotoğraf yok']
    return base
  }

  // Regex pre-extraction (always runs — for fallback and cross-validation)
  const priceData = extractPrice(text)
  const sizeData = extractSizes(text)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // Regex-only path
    const missing: string[] = []
    if (!priceData.price) missing.push('wholesalePrice')
    if (!sizeData.min) missing.push('sizeRange')
    if (!text) missing.push('productName')

    const score = (priceData.price ? 30 : 0) + (sizeData.min ? 30 : 0) + (text ? 20 : 0) + (hasPhoto ? 20 : 0)

    return {
      ...base,
      wholesalePrice: priceData.price,
      wholesaleCurrency: priceData.currency ?? groupConfig?.currency,
      computedWebsitePrice: priceData.price
        ? computeWebsitePrice(priceData.price, priceData.currency ?? 'USD', marginUSD, usdToTryRate)
        : undefined,
      sizeMin: sizeData.min,
      sizeMax: sizeData.max,
      availableSizes: sizeData.sizes,
      parseConfidence: score >= 70 ? 'medium' : score >= 40 ? 'low' : 'none',
      parseScore: score,
      missingFields: missing,
      parseWarnings: ['GEMINI_API_KEY eksik — regex çıkarma kullanıldı'],
    }
  }

  // Gemini extraction
  try {
    // Expand brand abbreviations and Turkish shorthand before sending to Gemini.
    // normalizedText is used for the prompt only — rawText in base stays as-is.
    const normalizedText = normalizeShorthand(text)
    const prompt = buildProductExtractionPrompt(normalizedText, hasPhoto, groupConfig, customTerms)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      },
    )

    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`)
    const data = await response.json()

    // Gemini 2.5 Flash returns thinking tokens in parts[]; find the actual JSON part.
    // Same pattern as classifier.ts — avoids parsing prose/thinking text as JSON.
    const parts: Array<{ text?: string; thought?: boolean }> = data?.candidates?.[0]?.content?.parts ?? []
    const textPart = parts.find(p => p.text && !p.thought) ?? parts[0]
    const rawText = textPart?.text ?? '{}'

    const g = JSON.parse(rawText.trim())

    // Merge Gemini + regex (regex wins on price/size if Gemini missed them)
    const finalPrice = g.wholesalePrice ?? priceData.price
    const finalCurrency = g.wholesaleCurrency ?? priceData.currency ?? groupConfig?.currency ?? 'USD'
    const finalSizeMin = g.sizeMin ?? sizeData.min
    const finalSizeMax = g.sizeMax ?? sizeData.max

    const validConfidence: ConfidenceLevel[] = ['high', 'medium', 'low', 'none']
    const parseConf = validConfidence.includes(g.parseConfidence) ? g.parseConfidence as ConfidenceLevel : 'low'

    return {
      ...base,
      productName: g.productName ?? undefined,
      brand: g.brand ?? undefined,
      model: g.model ?? undefined,
      color: g.color ?? undefined,
      material: g.material ?? undefined,
      category: g.category ?? groupConfig?.defaultCategory ?? undefined,
      gender: g.gender ?? 'unknown',
      sizeMin: finalSizeMin,
      sizeMax: finalSizeMax,
      availableSizes: g.availableSizes ?? sizeData.sizes ?? undefined,
      wholesalePrice: finalPrice,
      wholesaleCurrency: finalCurrency as 'USD' | 'TRY' | 'EUR',
      computedWebsitePrice: finalPrice
        ? computeWebsitePrice(finalPrice, finalCurrency as 'USD' | 'TRY' | 'EUR', marginUSD, usdToTryRate)
        : undefined,
      parseConfidence: parseConf,
      parseScore: typeof g.parseScore === 'number' ? g.parseScore : 50,
      missingFields: Array.isArray(g.missingFields) ? g.missingFields : [],
      parseWarnings: Array.isArray(g.parseWarnings) ? g.parseWarnings : [],
    }
  } catch (err) {
    console.error('[SupplierScout/parser] Gemini parse error:', err)
    // Fall back to regex
    const missing: string[] = []
    if (!priceData.price) missing.push('wholesalePrice')
    if (!sizeData.min) missing.push('sizeRange')
    if (!text) missing.push('productName')
    const score = (priceData.price ? 25 : 0) + (sizeData.min ? 25 : 0) + (text ? 15 : 0) + (hasPhoto ? 15 : 0)

    return {
      ...base,
      wholesalePrice: priceData.price,
      wholesaleCurrency: priceData.currency ?? groupConfig?.currency,
      computedWebsitePrice: priceData.price
        ? computeWebsitePrice(priceData.price, priceData.currency ?? 'USD', marginUSD, usdToTryRate)
        : undefined,
      sizeMin: sizeData.min,
      sizeMax: sizeData.max,
      availableSizes: sizeData.sizes,
      parseConfidence: 'low',
      parseScore: score,
      missingFields: missing,
      parseWarnings: [`Gemini hatası (regex fallback): ${(err as Error).message?.substring(0, 80)}`],
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sold-Out Signal Parser
// ─────────────────────────────────────────────────────────────────────────────

export function parseSoldOutSignal(message: TgMessage): ParsedSoldOutSignal {
  const text = (message.text ?? message.caption ?? '').toLowerCase()
  const detectedTerms: string[] = []

  const soldOutTerms = ['bitti', 'tükendi', 'kalmadı', 'kapandı', 'sold out', 'out of stock', 'hepsi satıldı', 'bitmiştir', 'stok yok']
  for (const term of soldOutTerms) {
    if (text.includes(term)) detectedTerms.push(term)
  }

  const isFull = detectedTerms.length > 0

  // Partial sold-out: detect affected sizes
  const affectedSizes: number[] = []
  const remainingSizes: number[] = []

  // "42 kalmadı" or "42 bitti"
  const sizeGoneMatches = text.matchAll(/\b(3[5-9]|4[0-6])\s*(kalmadı|bitti|gitti|yok)\b/g)
  for (const m of sizeGoneMatches) {
    affectedSizes.push(parseInt(m[1]))
    detectedTerms.push(m[1] + ' ' + m[2])
  }

  // "sadece 40 kaldı" or "sadece 40-42"
  const remainMatch = text.match(/sadece\s+(3[5-9]|4[0-6])(?:\s*[-–]\s*(3[5-9]|4[0-6]))?\s*kaldı/i)
  if (remainMatch) {
    const s = parseInt(remainMatch[1])
    remainingSizes.push(s)
    if (remainMatch[2]) {
      const e = parseInt(remainMatch[2])
      for (let i = s + 1; i <= e; i++) remainingSizes.push(i)
    }
    detectedTerms.push(remainMatch[0])
  }

  const isPartial = affectedSizes.length > 0 || remainingSizes.length > 0
  const confidence: ConfidenceLevel = isFull ? 'high' : isPartial ? 'medium' : 'low'

  return {
    isFull: isFull && !isPartial,
    affectedSizes: affectedSizes.length > 0 ? affectedSizes : undefined,
    remainingSizes: remainingSizes.length > 0 ? remainingSizes : undefined,
    rawText: message.text ?? message.caption ?? '',
    sellerUserId: message.from?.id,
    sellerUsername: message.from?.username,
    telegramMessageId: message.message_id,
    telegramGroupId: message.chat.id,
    replyToMessageId: message.reply_to_message?.message_id,
    mediaGroupId: message.media_group_id,
    detectedTerms,
    confidence,
  }
}
