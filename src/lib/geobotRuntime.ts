/**
 * geobotRuntime.ts — Phase 7 Geobot AI Content Generation Runtime
 *
 * Real AI content generation via Gemini API (gemini-2.5-flash).
 * Uses the same raw fetch pattern as existing imageProviders.ts vision calls.
 *
 * Generates two content packs:
 * 1. Commerce Pack — channel-specific copy (website, Instagram, X, Facebook, Shopier)
 * 2. Discovery Pack — long-form GEO/SEO article + metadata
 *
 * All content is generated from confirmed product data only.
 * No fake content — if API fails, status reflects failure truthfully.
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface GeobotProductContext {
  id: number | string
  title: string
  category?: string | null
  price?: number | null
  originalPrice?: number | null
  description?: string | null
  brand?: string | null // resolved brand name, not ID
  productType?: string | null
  variants?: Array<{ size?: string; stock?: number; color?: string }> | null
  stockQuantity?: number | null
}

export interface CommercePackOutput {
  websiteDescription: string
  instagramCaption: string
  xPost: string
  facebookCopy: string
  shopierCopy: string
  highlights: string[]
  confidence: number
  warnings: string[]
  generatedAt: string
}

export interface DiscoveryPackOutput {
  articleTitle: string
  articleBody: string
  metaTitle: string
  metaDescription: string
  faq: Array<{ q: string; a: string }>
  keywordEntities: string[]
  internalLinkTargets: Array<{ slug: string; anchor: string }>
  confidence: number
  warnings: string[]
  generatedAt: string
}

export interface GeobotGenerationResult {
  success: boolean
  commercePack?: CommercePackOutput
  discoveryPack?: DiscoveryPackOutput
  error?: string
}

// ── Gemini API call ───────────────────────────────────────────────────

const GEMINI_TEXT_MODEL = 'gemini-2.5-flash'

async function callGeminiText(prompt: string, maxOutputTokens = 4096): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens,
        temperature: 0.7,
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Gemini API error ${response.status}: ${errorBody.slice(0, 300)}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    const finishReason = data?.candidates?.[0]?.finishReason
    throw new Error(`Gemini returned empty response. finishReason=${finishReason ?? 'unknown'}`)
  }

  return text
}

// ── Product context builder ───────────────────────────────────────────

function buildProductContext(product: GeobotProductContext): string {
  const lines: string[] = []
  lines.push(`Ürün Adı: ${product.title}`)
  if (product.category) lines.push(`Kategori: ${product.category}`)
  if (product.brand) lines.push(`Marka: ${product.brand}`)
  if (product.productType) lines.push(`Ürün Tipi: ${product.productType}`)
  if (product.price) {
    lines.push(`Satış Fiyatı: ₺${product.price}`)
    if (product.originalPrice && product.originalPrice > product.price) {
      const discount = Math.round((1 - product.price / product.originalPrice) * 100)
      lines.push(`Piyasa Fiyatı: ₺${product.originalPrice} (${discount}% indirim)`)
    }
  }
  if (product.description) lines.push(`Mevcut Açıklama: ${product.description}`)

  // Sizes
  const variants = product.variants?.filter((v) => v.size && (v.stock ?? 0) > 0) ?? []
  if (variants.length > 0) {
    const sizes = variants.map((v) => v.size).join(', ')
    const totalStock = variants.reduce((s, v) => s + (v.stock ?? 0), 0)
    lines.push(`Mevcut Bedenler: ${sizes}`)
    lines.push(`Toplam Stok: ${totalStock} adet`)
    const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))]
    if (colors.length > 0) lines.push(`Renkler: ${colors.join(', ')}`)
  } else if (product.stockQuantity) {
    lines.push(`Stok: ${product.stockQuantity} adet`)
  }

  return lines.join('\n')
}

// ── Commerce Pack Generation ──────────────────────────────────────────

function buildCommercePrompt(product: GeobotProductContext): string {
  const ctx = buildProductContext(product)

  return `Sen UygunAyakkabı e-ticaret sitesi için içerik üreten bir AI asistanısın.
Aşağıdaki onaylanmış ürün bilgilerine dayanarak, HER KANAL İÇİN FARKLI TARZ VE UZUNLUKTA içerik üret.

ÜRÜN BİLGİLERİ:
${ctx}

Aşağıdaki JSON formatında yanıt ver. Tüm içerikler Türkçe olmalı.

KURALLAR:
- Sadece verilen ürün bilgilerini kullan, uydurma özellik ekleme
- Her kanal için farklı ton ve uzunluk kullan
- Emoji kullanımı kanala uygun olsun
- Fiyat ve beden bilgisi varsa dahil et
- Marka varsa doğru yaz, yoksa ekleme
- Aşırı pazarlama dili kullanma, doğal ol

{
  "websiteDescription": "200-400 karakter arası detaylı ürün açıklaması. HTML kullanma. Ürünün özelliklerini, kullanım alanlarını ve avantajlarını açıkla.",
  "instagramCaption": "Instagram için 150-300 karakter caption. 3-5 ilgili hashtag dahil et (#ayakkabı #uygunfiyat vb). Emoji ile zenginleştir.",
  "xPost": "X/Twitter için max 250 karakter kısa ve etkileyici post. 1-2 hashtag. Link için yer bırak.",
  "facebookCopy": "Facebook için 150-350 karakter doğal bir post metni. Konuşma tonu, emoji az.",
  "shopierCopy": "Shopier ürün sayfası için 200-400 karakter açıklama. Beden, stok, kargo gibi pratik bilgileri öne çıkar.",
  "highlights": ["3-5 adet kısa öne çıkan özellik maddesi, her biri max 50 karakter"]
}`
}

export async function generateCommercePack(
  product: GeobotProductContext,
): Promise<CommercePackOutput> {
  const prompt = buildCommercePrompt(product)
  const raw = await callGeminiText(prompt)

  // Parse JSON from response
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Commerce pack: Gemini response is not valid JSON')
  }

  const parsed = JSON.parse(jsonMatch[0])
  const warnings: string[] = []

  // Validate required fields
  if (!parsed.websiteDescription) warnings.push('websiteDescription boş')
  if (!parsed.instagramCaption) warnings.push('instagramCaption boş')
  if (!parsed.shopierCopy) warnings.push('shopierCopy boş')

  // Ensure highlights is an array
  const highlights = Array.isArray(parsed.highlights) ? parsed.highlights : []

  // Calculate confidence based on field completeness
  const fields = ['websiteDescription', 'instagramCaption', 'xPost', 'facebookCopy', 'shopierCopy']
  const filled = fields.filter((f) => typeof parsed[f] === 'string' && parsed[f].length > 10).length
  const confidence = Math.round((filled / fields.length) * 100)

  return {
    websiteDescription: parsed.websiteDescription || '',
    instagramCaption: parsed.instagramCaption || '',
    xPost: parsed.xPost || '',
    facebookCopy: parsed.facebookCopy || '',
    shopierCopy: parsed.shopierCopy || '',
    highlights,
    confidence,
    warnings,
    generatedAt: new Date().toISOString(),
  }
}

// ── Discovery Pack Generation ─────────────────────────────────────────

function buildDiscoveryPrompt(product: GeobotProductContext): string {
  const ctx = buildProductContext(product)

  return `Sen UygunAyakkabı e-ticaret sitesi için GEO/SEO içerik üreten bir AI asistanısın.
Aşağıdaki onaylanmış ürün bilgilerine dayanarak, arama motoru keşfi ve kullanıcı bilgilendirmesi için uzun form içerik üret.

ÜRÜN BİLGİLERİ:
${ctx}

Aşağıdaki JSON formatında yanıt ver. Tüm içerikler Türkçe olmalı.

KURALLAR:
- Sadece verilen ürün bilgilerini kullan, uydurma özellik ekleme
- Makale doğal ve bilgilendirici olsun, aşırı SEO spam değil
- FAQ gerçekçi sorular ve yararlı cevaplar içersin
- Anahtar kelimeler ürünle alakalı ve gerçek arama terimleri olsun
- İç bağlantı hedefleri site yapısına uygun slug'lar olsun
- metaTitle max 60 karakter, metaDescription max 160 karakter

{
  "articleTitle": "Makale başlığı — bilgilendirici, tıklanabilir, 50-70 karakter",
  "articleBody": "800-1500 kelime arası uzun form makale. Ürün incelemesi, kullanım alanları, bakım önerileri, benzer ürünlerle karşılaştırma gibi bölümler. Markdown başlık formatı kullan (## alt başlıklar). Doğal dil, spam değil.",
  "metaTitle": "SEO meta title — max 60 karakter, ürün adı + kategori + marka içersin",
  "metaDescription": "SEO meta description — max 160 karakter, ürünü özetleyen ve tıklamaya teşvik eden açıklama",
  "faq": [
    {"q": "Soru 1", "a": "Cevap 1"},
    {"q": "Soru 2", "a": "Cevap 2"},
    {"q": "Soru 3", "a": "Cevap 3"}
  ],
  "keywordEntities": ["5-10 adet anahtar kelime veya varlık, örn: 'erkek spor ayakkabı', 'günlük kullanım', marka adı vb"],
  "internalLinkTargets": [
    {"slug": "/kategori/ilgili-slug", "anchor": "Bağlantı metni"},
    {"slug": "/urun/ilgili-urun-slug", "anchor": "Bağlantı metni"}
  ]
}`
}

export async function generateDiscoveryPack(
  product: GeobotProductContext,
): Promise<DiscoveryPackOutput> {
  const prompt = buildDiscoveryPrompt(product)
  // Discovery pack needs higher token limit: 800-1500 word article + FAQ + metadata in JSON
  const raw = await callGeminiText(prompt, 8192)

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error(`[geobotRuntime] Discovery pack raw response (first 500): ${raw.slice(0, 500)}`)
    throw new Error(`Discovery pack: Gemini response is not valid JSON (length=${raw.length})`)
  }

  let parsed: any
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (parseErr) {
    console.error(`[geobotRuntime] Discovery JSON parse failed. Raw length=${raw.length}, match length=${jsonMatch[0].length}`)
    throw new Error(`Discovery pack: JSON parse error — ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`)
  }
  const warnings: string[] = []

  // Validate required fields
  if (!parsed.articleTitle) warnings.push('articleTitle boş')
  if (!parsed.articleBody) warnings.push('articleBody boş')
  if (!parsed.metaTitle) warnings.push('metaTitle boş')
  if (!parsed.metaDescription) warnings.push('metaDescription boş')

  // Validate lengths
  if (parsed.metaTitle && parsed.metaTitle.length > 70) {
    warnings.push(`metaTitle çok uzun (${parsed.metaTitle.length} karakter)`)
  }
  if (parsed.metaDescription && parsed.metaDescription.length > 170) {
    warnings.push(`metaDescription çok uzun (${parsed.metaDescription.length} karakter)`)
  }

  // Ensure arrays
  const faq = Array.isArray(parsed.faq)
    ? parsed.faq.filter((f: any) => f.q && f.a)
    : []
  const keywordEntities = Array.isArray(parsed.keywordEntities)
    ? parsed.keywordEntities
    : []
  const internalLinkTargets = Array.isArray(parsed.internalLinkTargets)
    ? parsed.internalLinkTargets.filter((l: any) => l.slug && l.anchor)
    : []

  // Confidence
  const fields = ['articleTitle', 'articleBody', 'metaTitle', 'metaDescription']
  const filled = fields.filter((f) => typeof parsed[f] === 'string' && parsed[f].length > 10).length
  const faqBonus = faq.length >= 3 ? 10 : 0
  const confidence = Math.min(100, Math.round((filled / fields.length) * 90) + faqBonus)

  return {
    articleTitle: parsed.articleTitle || '',
    articleBody: parsed.articleBody || '',
    metaTitle: parsed.metaTitle || '',
    metaDescription: parsed.metaDescription || '',
    faq,
    keywordEntities,
    internalLinkTargets,
    confidence,
    warnings,
    generatedAt: new Date().toISOString(),
  }
}

// ── Full generation orchestration ─────────────────────────────────────

/**
 * Generate both content packs for a confirmed product.
 * Runs commerce first, then discovery. Partial success is allowed.
 *
 * Returns the result with whatever was generated — caller decides
 * how to update product state based on what succeeded.
 */
export async function generateFullContentPack(
  product: GeobotProductContext,
): Promise<GeobotGenerationResult> {
  let commercePack: CommercePackOutput | undefined
  let discoveryPack: DiscoveryPackOutput | undefined
  const errors: string[] = []

  // Commerce pack
  try {
    console.log(`[geobotRuntime] Generating commerce pack for product ${product.id}...`)
    commercePack = await generateCommercePack(product)
    console.log(
      `[geobotRuntime] Commerce pack generated — product=${product.id} confidence=${commercePack.confidence}`,
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[geobotRuntime] Commerce pack failed for product ${product.id}:`, msg)
    errors.push(`Commerce: ${msg}`)
  }

  // Discovery pack
  try {
    console.log(`[geobotRuntime] Generating discovery pack for product ${product.id}...`)
    discoveryPack = await generateDiscoveryPack(product)
    console.log(
      `[geobotRuntime] Discovery pack generated — product=${product.id} confidence=${discoveryPack.confidence}`,
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack?.split('\n').slice(0, 3).join(' | ') : ''
    console.error(`[geobotRuntime] Discovery pack FAILED for product ${product.id}: ${msg} ${stack}`)
    errors.push(`Discovery: ${msg}`)
  }

  const success = !!commercePack || !!discoveryPack

  return {
    success,
    commercePack,
    discoveryPack,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  }
}
