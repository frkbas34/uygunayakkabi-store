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

/**
 * D-225: PI Bot research snippet fed into GeoBot prompts.
 *
 * This is deliberately narrower than PI Bot's full `PiReport` — we only
 * import the fields GeoBot's prompt actually benefits from, and we keep
 * the shape stable so changes to PI's internal types don't ripple here.
 * The caller (contentPack.ts) is responsible for translating `PiReport`
 * into this shape via `resolvePiResearch()`.
 */
export interface GeobotPiResearch {
  // Vision-detected authoritative signals (override guessing from title alone).
  detectedBrand?: string | null
  detectedProductType?: string | null
  detectedStyle?: string | null
  detectedColor?: string | null
  detectedMaterial?: string | null
  detectedGender?: string | null
  detectedUseCases?: string[] | null
  // D-227: Richest vision detail — logo/text/tongue reading, tread type,
  // seam/stitching, material visible etc. Must reach the prompt; previously
  // silently dropped at the resolvePiResearch translation layer.
  detectedVisualNotes?: string | null
  // Reverse-search / online signals.
  topReferenceTitles?: string[] | null
  topReferenceSources?: string[] | null
  matchType?: string | null
  matchConfidence?: number | null
  // Already-drafted suggestions from PI Bot — GeoBot uses these as seeds,
  // not verbatim. Rewriting keeps the final copy in GeoBot's own voice.
  suggestedSeoKeywords?: string[] | null
  suggestedTags?: string[] | null
  suggestedFaq?: Array<{ q: string; a: string }> | null
  suggestedBuyerIntent?: string[] | null
  suggestedComparisonAngles?: string[] | null
  seoTitleDraft?: string | null
  metaDescriptionDraft?: string | null
  aiSearchSummary?: string | null
  // Operator-visible caveats the prompt should respect.
  riskWarnings?: string[] | null
}

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
  // D-225: optional PI Bot research. When present, Gemini prompts should
  // treat detected signals as authoritative over guessing from the title,
  // and use the suggested-content bits as rewriting seeds.
  piResearch?: GeobotPiResearch | null
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

interface GeminiTextResult {
  text: string
  finishReason: string | null
}

async function callGeminiText(
  prompt: string,
  maxOutputTokens = 4096,
): Promise<GeminiTextResult> {
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
  const finishReason = data?.candidates?.[0]?.finishReason ?? null
  if (!text) {
    throw new Error(`Gemini returned empty response. finishReason=${finishReason ?? 'unknown'}`)
  }

  return { text, finishReason }
}

/**
 * D-224: Parse a JSON object from a Gemini text response defensively.
 *
 * Handles three real-world failure modes we've observed in production:
 *   1. Bare JSON (happy path) — JSON.parse works on trimmed input.
 *   2. Markdown-fenced JSON (```json ... ```) — despite responseMimeType
 *      being 'application/json', some safety-filtered or fallback responses
 *      arrive wrapped in fences.
 *   3. Truncated JSON on MAX_TOKENS — we extract the largest balanced {...}
 *      by scanning depth; if that still fails and finishReason is MAX_TOKENS,
 *      we surface that truthfully so the caller knows to bump the token
 *      budget instead of swallowing it as a generic parse error.
 *
 * Root cause this addresses: products 296/300 Discovery failures where the
 * response arrived as "not valid JSON (length=1114)" — invisible truncation
 * mid-article with finishReason=MAX_TOKENS buried in the payload.
 */
function parseGeminiJson<T = any>(
  raw: string,
  finishReason: string | null,
  label: string,
): T {
  // 1) Strip BOM and common markdown fences
  let cleaned = raw.trim()
  if (cleaned.startsWith('\uFEFF')) cleaned = cleaned.slice(1)
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenceMatch) cleaned = fenceMatch[1].trim()

  // 2) Try a direct parse first (happy path for responseMimeType=application/json)
  try {
    return JSON.parse(cleaned) as T
  } catch {
    // fall through to balanced-brace extraction
  }

  // 3) Extract the largest balanced {...} by scanning depth (handles trailing garbage)
  const start = cleaned.indexOf('{')
  if (start >= 0) {
    let depth = 0
    let inStr = false
    let escape = false
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i]
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') {
        inStr = !inStr
        continue
      }
      if (inStr) continue
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          const candidate = cleaned.slice(start, i + 1)
          try {
            return JSON.parse(candidate) as T
          } catch {
            break
          }
        }
      }
    }
  }

  // 4) Fail truthfully — include finishReason so truncation is diagnosable
  const reasonSuffix = finishReason ? ` finishReason=${finishReason}` : ''
  const preview = cleaned.slice(0, 200).replace(/\s+/g, ' ')
  throw new Error(
    `${label}: Gemini response is not valid JSON (length=${cleaned.length}${reasonSuffix}) preview="${preview}"`,
  )
}

// ── Product context builder ───────────────────────────────────────────

/**
 * D-225: Serialize PI Bot research into a Turkish prompt block.
 *
 * Two design choices worth calling out:
 *   1. Vision-detected attributes are labelled "TESPİT EDİLEN" (DETECTED) to
 *      signal to Gemini that these are authoritative observations from the
 *      product's actual image — stronger evidence than anything in the title.
 *   2. Suggested SEO keywords / FAQ / buyer-intent are labelled "ÖNERİLEN"
 *      (SUGGESTED) so Gemini uses them as seeds and rewrites in its own
 *      voice — we don't want the final copy to parrot PI's draft verbatim.
 *
 * Returns the rendered block, or an empty string if no PI signal is useful.
 */
function buildPiResearchBlock(pi: GeobotPiResearch): string {
  const lines: string[] = []
  const detectedBits: string[] = []
  if (pi.detectedBrand) detectedBits.push(`Marka: ${pi.detectedBrand}`)
  if (pi.detectedProductType) detectedBits.push(`Ürün Tipi: ${pi.detectedProductType}`)
  if (pi.detectedStyle) detectedBits.push(`Stil: ${pi.detectedStyle}`)
  if (pi.detectedColor) detectedBits.push(`Renk: ${pi.detectedColor}`)
  if (pi.detectedMaterial) detectedBits.push(`Malzeme: ${pi.detectedMaterial}`)
  if (pi.detectedGender) detectedBits.push(`Hedef: ${pi.detectedGender}`)
  if (pi.detectedUseCases && pi.detectedUseCases.length > 0) {
    detectedBits.push(`Kullanım: ${pi.detectedUseCases.join(', ')}`)
  }
  // D-227: surface the richest vision signal (logo/tongue text, sole type,
  // stitching, visible text on the shoe) so the final copy can cite concrete
  // evidence instead of falling back to title-based generic phrasing.
  if (pi.detectedVisualNotes) {
    detectedBits.push(`Görsel Detaylar (logo/yazı/taban/kumaş): ${pi.detectedVisualNotes}`)
  }
  if (detectedBits.length > 0) {
    lines.push(
      'ÜRÜN KİMLİĞİ — ZORUNLU KULLANIM (ürün fotoğrafı analizi, kesin kabul edilir):',
    )
    lines.push(detectedBits.map((b) => `  • ${b}`).join('\n'))
  }
  if (pi.topReferenceTitles && pi.topReferenceTitles.length > 0) {
    lines.push('BENZER ÜRÜN BAŞLIKLARI (online arama — stil/kategori ipucu için, kopyalama):')
    lines.push(
      pi.topReferenceTitles
        .slice(0, 5)
        .map((t) => `  • ${t}`)
        .join('\n'),
    )
  }
  if (pi.matchType && pi.matchConfidence != null) {
    lines.push(`Eşleşme Türü: ${pi.matchType} (%${pi.matchConfidence} güven)`)
  }
  const suggestedBits: string[] = []
  if (pi.suggestedSeoKeywords && pi.suggestedSeoKeywords.length > 0) {
    suggestedBits.push(`Anahtar kelimeler: ${pi.suggestedSeoKeywords.slice(0, 12).join(', ')}`)
  }
  if (pi.suggestedBuyerIntent && pi.suggestedBuyerIntent.length > 0) {
    suggestedBits.push(`Alıcı niyet kelimeleri: ${pi.suggestedBuyerIntent.slice(0, 8).join(', ')}`)
  }
  if (pi.suggestedComparisonAngles && pi.suggestedComparisonAngles.length > 0) {
    suggestedBits.push(
      `Karşılaştırma açıları: ${pi.suggestedComparisonAngles.slice(0, 5).join(' | ')}`,
    )
  }
  if (pi.aiSearchSummary) {
    suggestedBits.push(`AI arama özeti: ${pi.aiSearchSummary.slice(0, 400)}`)
  }
  if (suggestedBits.length > 0) {
    lines.push('ÖNERİLEN İÇERİK SİNYALLERİ (PI Bot — tohum olarak kullan, kendi sesinle yeniden yaz):')
    lines.push(suggestedBits.map((b) => `  • ${b}`).join('\n'))
  }
  if (pi.riskWarnings && pi.riskWarnings.length > 0) {
    lines.push(
      `UYARILAR (PI Bot — içerikte kaçın): ${pi.riskWarnings.slice(0, 5).join(' | ')}`,
    )
  }
  return lines.length > 0 ? lines.join('\n') : ''
}

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

  // D-225: append PI Bot research if GeoBot was handed one.
  if (product.piResearch) {
    const piBlock = buildPiResearchBlock(product.piResearch)
    if (piBlock) {
      lines.push('')
      lines.push('─── PRODUCT INTELLIGENCE BOT ARAŞTIRMASI ───')
      lines.push(piBlock)
    }
  }

  return lines.join('\n')
}

// ── Commerce Pack Generation ──────────────────────────────────────────

function buildCommercePrompt(product: GeobotProductContext): string {
  const ctx = buildProductContext(product)
  const hasPi = !!product.piResearch

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
- Aşırı pazarlama dili kullanma, doğal ol${hasPi ? `
- ZORUNLU: ÜRÜN KİMLİĞİ bloğundaki alanlar (marka, ürün tipi, renk, malzeme, stil, görsel detaylar) mevcutsa websiteDescription + instagramCaption + shopierCopy + facebookCopy içinde açıkça görünmelidir. Sadece başlığı tekrar etme — somut özelliklerden en az 2'sini her metne işle.
- ZORUNLU: Görsel Detaylar varsa (logo, yazı, taban tipi, kumaş, renk kombinasyonu), en az bir somut detayı websiteDescription'da kullan. Genel ifadelerle (örn. "yüksek kaliteli malzeme", "şık tasarım") geçiştirme.
- ÜRÜN KİMLİĞİ başlıkla çelişiyorsa ÜRÜN KİMLİĞİ'ni kullan (örn. başlık "Blue" ama renk "Lacivert" ise "lacivert" kullan).
- ÖNERİLEN SİNYALLER'i tohum olarak kullan, kendi sesinle yeniden yaz, birebir kopyalama
- UYARILAR varsa onlara uy, o konulardan kaçın` : ''}

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
  const { text: raw, finishReason } = await callGeminiText(prompt)

  // D-224: defensive JSON parse — handles fences, trailing garbage, and truncation
  const parsed = parseGeminiJson<any>(raw, finishReason, 'Commerce pack')
  const warnings: string[] = []
  if (finishReason && finishReason !== 'STOP') {
    warnings.push(`gemini finishReason=${finishReason}`)
  }

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
  const hasPi = !!product.piResearch

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
- metaTitle max 60 karakter, metaDescription max 160 karakter${hasPi ? `
- ZORUNLU: ÜRÜN KİMLİĞİ bloğundaki alanlar (marka, ürün tipi, renk, malzeme, stil, görsel detaylar) makalenin GİRİŞ paragrafında + en az bir alt başlığın gövdesinde açıkça yer almalıdır. Jenerik "kaliteli malzeme / şık tasarım" cümleleriyle geçiştirilmesi YASAK.
- ZORUNLU: Görsel Detaylar varsa (logo, yazı, taban, kumaş), bunlardan en az biri makale gövdesinde somut şekilde geçmelidir (örn. "dil kısmındaki Air-Cooled Memory Foam yazısı", "kalın kauçuk taban" vb).
- ZORUNLU: metaTitle ve articleTitle ÜRÜN KİMLİĞİ'ndeki marka + ürün tipi + renk kombinasyonunu içermelidir (sadece başlığı echo etmek yasak).
- ÖNERİLEN anahtar kelime ve alıcı niyet tohumlarını keywordEntities için başlangıç olarak kullan, genişlet, birebir kopyalama
- ÖNERİLEN karşılaştırma açılarını makalede ayrı bir alt başlık olarak değerlendir
- ÖNERİLEN FAQ varsa kendi sesinle yeniden formüle et, aynen kopyalama
- UYARILAR varsa makale içinde o konulardan kaçın` : ''}

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
  // D-224: Discovery pack needs a higher token limit than commerce — it
  // produces an 800-1500 word article + FAQ + metadata inside a JSON payload.
  // Bumped from 8192 → 16384 because products 296/300 hit MAX_TOKENS mid-JSON
  // and returned an unparseable truncated body (observed length=1114 — nowhere
  // near a finished 800+ word article).
  const { text: raw, finishReason } = await callGeminiText(prompt, 16384)

  let parsed: any
  try {
    parsed = parseGeminiJson<any>(raw, finishReason, 'Discovery pack')
  } catch (parseErr) {
    console.error(
      `[geobotRuntime] Discovery parse failed. rawLength=${raw.length} finishReason=${finishReason} first500="${raw.slice(0, 500)}"`,
    )
    throw parseErr
  }
  const warnings: string[] = []
  if (finishReason && finishReason !== 'STOP') {
    warnings.push(`gemini finishReason=${finishReason}`)
  }

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
