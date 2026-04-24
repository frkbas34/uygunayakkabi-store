/**
 * generateSeoGeoPack.ts — D-220
 *
 * Generate an original SEO + GEO content pack from:
 *   - the product's own data (title, price, category, etc.),
 *   - Gemini vision-detected attributes (from analyzeProduct),
 *   - optional reference products from reverse image search.
 *
 * Critical content policy:
 *   - Reference products are market / SEO context ONLY. Their descriptions
 *     must NOT be copied. We explicitly instruct the model to treat them
 *     as "understand the category, don't reuse sentences".
 *   - Output is Turkish, original, Uygunayakkabı-branded.
 *   - If vision + reference inputs are sparse, the model still produces a
 *     pack from product data alone — this is the "graceful degradation"
 *     path the operator asked for.
 *
 * Reuses the raw-fetch Gemini pattern from `geobotRuntime.ts`. No new HTTP
 * client surface, no new provider — Gemini text only.
 */

import type {
  PiDetectedAttributes,
  PiGeoPack,
  PiProductContext,
  PiReferenceProduct,
  PiSeoPack,
} from './types'

const GEMINI_TEXT_MODEL = 'gemini-2.5-flash'

async function callGeminiText(prompt: string, maxOutputTokens = 4096): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.6,
        maxOutputTokens,
      },
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => 'unknown')
    throw new Error(`Gemini SEO/GEO ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = (await res.json()) as any
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned empty SEO/GEO response')
  return text
}

function buildSeoGeoPrompt(
  product: PiProductContext,
  attrs: PiDetectedAttributes,
  refs: PiReferenceProduct[],
): string {
  const lines: string[] = []
  lines.push('Sen Uygunayakkabı e-ticaret platformu için ORİJİNAL SEO + GEO içerik üreten bir AI asistanısın.')
  lines.push('Amacın: aşağıdaki ürüne özgü, markayı temsil eden, Türkçe, orijinal içerik paketi üretmek.')
  lines.push('')
  lines.push('ÜRÜN VERİSİ:')
  lines.push(`- Başlık: ${product.title}`)
  if (product.category) lines.push(`- Kategori: ${product.category}`)
  if (product.brand) lines.push(`- Marka: ${product.brand}`)
  if (product.productType) lines.push(`- Ürün tipi: ${product.productType}`)
  if (product.price) lines.push(`- Fiyat: ₺${product.price}`)
  if (product.description) lines.push(`- Mevcut açıklama: ${product.description.slice(0, 500)}`)
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const sizes = product.variants.map((v) => v.size).filter(Boolean).join(', ')
    if (sizes) lines.push(`- Mevcut bedenler: ${sizes}`)
  }
  lines.push('')
  lines.push('GÖRSEL ANALİZ (vision çıktısı — bu alanları SEO/GEO paketinde somut şekilde kullan):')
  if (attrs.productType) lines.push(`- Görsel ürün tipi: ${attrs.productType}`)
  if (attrs.color) lines.push(`- Renk: ${attrs.color}`)
  if (attrs.materialGuess) lines.push(`- Malzeme tahmini: ${attrs.materialGuess}`)
  if (attrs.style) lines.push(`- Stil: ${attrs.style}`)
  if (attrs.gender) lines.push(`- Cinsiyet: ${attrs.gender}`)
  if (Array.isArray(attrs.useCases) && attrs.useCases.length > 0) {
    lines.push(`- Kullanım alanları: ${attrs.useCases.join(', ')}`)
  }
  if (attrs.visibleBrand) lines.push(`- Görünen marka: ${attrs.visibleBrand}`)
  // D-229: expose the wider vision evidence to the SEO/GEO prompt so the
  // new pack fields (brandTechnologyExplainer, technicalSpecs, etc.) have
  // concrete details to cite rather than going generic.
  if (attrs.soleType) lines.push(`- Taban tipi: ${attrs.soleType}`)
  if (attrs.closureType) lines.push(`- Kapanma: ${attrs.closureType}`)
  if (Array.isArray(attrs.brandTechnologies) && attrs.brandTechnologies.length > 0) {
    lines.push(`- Marka teknolojileri (görselden): ${attrs.brandTechnologies.join(', ')}`)
  }
  if (Array.isArray(attrs.distinctiveFeatures) && attrs.distinctiveFeatures.length > 0) {
    lines.push(`- Ayırt edici detaylar: ${attrs.distinctiveFeatures.join(', ')}`)
  }
  if (Array.isArray(attrs.colorAccents) && attrs.colorAccents.length > 0) {
    lines.push(`- Renk aksanları: ${attrs.colorAccents.join(', ')}`)
  }
  if (attrs.constructionNotes) lines.push(`- Üretim notları: ${attrs.constructionNotes}`)
  if (attrs.visualNotes) lines.push(`- Görsel notlar (uzun): ${attrs.visualNotes}`)
  lines.push('')

  if (refs.length > 0) {
    lines.push('PİYASA REFERANSLARI (sadece kategori/anahtar kelime bağlamı için — ASLA kopyalama):')
    refs.slice(0, 5).forEach((r, i) => {
      lines.push(`  ${i + 1}. ${r.title} (${r.source}) — classification: ${r.classification}`)
      if (r.snippet) lines.push(`     özet: ${r.snippet.slice(0, 150)}`)
    })
    lines.push('')
  } else {
    lines.push('PİYASA REFERANSI: yok (dış arama sağlayıcısı mevcut değil veya sonuç yok).')
    lines.push('')
  }

  lines.push('KURALLAR (SERT):')
  lines.push('- Referans ürünlerin cümlelerini veya ifadelerini KOPYALAMA. Referanslar yalnızca kategori/keyword anlamak için.')
  lines.push('- Uydurma marka, malzeme veya özellik ekleme. Emin değilsen belirtme.')
  lines.push('- İçerik orijinal ve Uygunayakkabı markasını temsil etmelidir.')
  lines.push('- metaTitle <= 60 karakter, metaDescription <= 160 karakter.')
  lines.push('- Yalnızca JSON döndür, başka metin yazma.')
  lines.push('')
  // D-229: expanded pack with brandTechnologyExplainer, careAndMaintenance,
  // sizingGuidance, styleGuide, technicalSpecs, useCaseExplainer,
  // alternativeSearchQueries. Each is optional — fill only what evidence
  // supports. MANDATORY: if brandTechnologies[] has items, produce
  // brandTechnologyExplainer; if distinctiveFeatures[] has items, include
  // them in technicalSpecs.
  lines.push('EK KURALLAR (D-229 ZENGİNLEŞTİRME):')
  lines.push('- Görsel analizde brandTechnologies varsa, brandTechnologyExplainer ZORUNLU (her teknolojiyi sade Türkçe ile açıkla, 2-4 cümle).')
  lines.push('- distinctiveFeatures ve soleType/closureType varsa, technicalSpecs listesine somut maddeler ekle (ör: "Kauçuk kaba taban", "Bağcıklı kapanma", "Yastıklı dil").')
  lines.push('- careAndMaintenance, sizingGuidance, styleGuide: somut olsun, "kaliteli", "şık" gibi boş laf yok.')
  lines.push('- alternativeSearchQueries: gerçek alıcı kalıpları (ör: "skechers beyaz erkek spor ayakkabı 43 numara", "air cooled memory foam ayakkabı").')
  lines.push('')

  lines.push('JSON ŞEMASI (tam olarak bu alanları döndür):')
  lines.push(`{
  "seoPack": {
    "seoTitle": "60 karaktere kadar SEO başlığı",
    "metaDescription": "160 karaktere kadar meta açıklama",
    "productDescription": "250-450 karakter orijinal Türkçe ürün açıklaması — görsel detayları kullan",
    "shortDescription": "80-140 karakter kısa açıklama",
    "tags": ["6-10 ürün etiketi"],
    "keywords": ["10-15 SEO anahtar kelimesi, Türkçe, uzun kuyruk dahil"],
    "faq": [{"q":"Soru", "a":"Cevap"}],
    "brandTechnologyExplainer": "Eğer brandTechnologies tespit edildiyse: 2-4 cümle sade Türkçe açıklama. Yoksa boş bırak.",
    "careAndMaintenance": "2-3 cümle — bu malzeme ve taban tipi için somut temizlik/saklama önerisi",
    "sizingGuidance": "1-2 cümle — bu marka/stil için numara notu (dar/geniş kalıp, numara büyüklüğü)",
    "styleGuide": "2-3 cümle — bu ayakkabıyı neyle kombinlemek uygun (somut giyim örnekleri)",
    "technicalSpecs": ["5-8 madde — taban tipi, kapanma, malzeme katmanları, belirgin detaylar"]
  },
  "geoPack": {
    "aiSearchSummary": "AI arama motorları için 2-3 cümle ürün özeti — marka + tip + renk + taban + teknoloji dahil",
    "buyerIntentKeywords": ["6-12 alıcı niyetli Türkçe ifade"],
    "comparisonAngles": ["4-6 karşılaştırma ekseni"],
    "productComparisonText": "200-300 karakter benzer ürünler ile farkı anlatan ORİJİNAL metin — rakip ismi verme",
    "blogDraftIdea": "Tek cümlelik blog yazısı fikri",
    "publishNotes": "Editör için kısa notlar",
    "useCaseExplainer": "2-3 cümle — bu ürünün somut senaryolarda nasıl kullanılacağı",
    "alternativeSearchQueries": ["5-8 alternatif arama sorgusu — gerçek kullanıcı kalıpları"]
  },
  "riskWarnings": ["İçerik/marka/telif ile ilgili varsa uyarılar"]
}`)
  return lines.join('\n')
}

export interface SeoGeoResult {
  seoPack: PiSeoPack
  geoPack: PiGeoPack
  riskWarnings: string[]
  raw: string | null
  error?: string
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined
}
function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

export async function generateSeoGeoPack(
  product: PiProductContext,
  attrs: PiDetectedAttributes,
  refs: PiReferenceProduct[],
): Promise<SeoGeoResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      seoPack: {},
      geoPack: {},
      riskWarnings: ['GEMINI_API_KEY yok — SEO/GEO paketi üretilemedi.'],
      raw: null,
      error: 'gemini_api_key_missing',
    }
  }

  const prompt = buildSeoGeoPrompt(product, attrs, refs)

  try {
    // D-229: budget raised 4096 → 10240. Schema grew from ~13 fields to
    // ~21 fields, several with 200-450 char prose bodies. 2.5-flash also
    // needs thinking-token headroom on top of the visible output.
    const raw = await callGeminiText(prompt, 10240)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      return {
        seoPack: {},
        geoPack: {},
        riskWarnings: ['Gemini SEO/GEO yanıtı JSON değildi.'],
        raw,
        error: 'non_json_response',
      }
    }
    const parsed = JSON.parse(match[0]) as any
    const sp = (parsed?.seoPack ?? {}) as Record<string, unknown>
    const gp = (parsed?.geoPack ?? {}) as Record<string, unknown>

    const seoPack: PiSeoPack = {
      seoTitle: asString(sp.seoTitle),
      metaDescription: asString(sp.metaDescription),
      productDescription: asString(sp.productDescription),
      shortDescription: asString(sp.shortDescription),
      tags: asStringArray(sp.tags),
      keywords: asStringArray(sp.keywords),
      faq: Array.isArray(sp.faq)
        ? sp.faq
            .filter(
              (f: any): f is { q: string; a: string } =>
                f && typeof f.q === 'string' && typeof f.a === 'string',
            )
            .map((f: { q: string; a: string }) => ({ q: f.q, a: f.a }))
        : [],
      // D-229: deeper pack fields.
      brandTechnologyExplainer: asString(sp.brandTechnologyExplainer),
      careAndMaintenance: asString(sp.careAndMaintenance),
      sizingGuidance: asString(sp.sizingGuidance),
      styleGuide: asString(sp.styleGuide),
      technicalSpecs: asStringArray(sp.technicalSpecs),
    }
    const geoPack: PiGeoPack = {
      aiSearchSummary: asString(gp.aiSearchSummary),
      buyerIntentKeywords: asStringArray(gp.buyerIntentKeywords),
      comparisonAngles: asStringArray(gp.comparisonAngles),
      productComparisonText: asString(gp.productComparisonText),
      blogDraftIdea: asString(gp.blogDraftIdea),
      publishNotes: asString(gp.publishNotes),
      // D-229: deeper GEO fields.
      useCaseExplainer: asString(gp.useCaseExplainer),
      alternativeSearchQueries: asStringArray(gp.alternativeSearchQueries),
    }
    const riskWarnings = asStringArray(parsed?.riskWarnings)

    return { seoPack, geoPack, riskWarnings, raw }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      seoPack: {},
      geoPack: {},
      riskWarnings: [`SEO/GEO üretimi başarısız: ${msg}`],
      raw: null,
      error: msg,
    }
  }
}
