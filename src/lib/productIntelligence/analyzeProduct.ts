/**
 * analyzeProduct.ts — D-220
 *
 * Gemini vision analysis for the Product Intelligence Bot.
 *
 * Takes the primary image (+ optional supporting images) and existing
 * product text data, and asks Gemini 2.5 Flash to extract structured
 * product attributes. We reuse the same raw-fetch pattern as
 * `src/lib/geobotRuntime.ts` so there's no new HTTP client surface.
 *
 * Key rules:
 *   - Vision uses `inlineData` with base64 image bytes. We fetch each URL
 *     once and send up to 3 images per call (primary + 2 supporting).
 *   - We send the ORIGINAL / primary image first so the model anchors its
 *     answer on the source of truth; supporting images are marked as
 *     "supporting" in the prompt so the model doesn't get confused by
 *     stylised AI variants.
 *   - If no GEMINI_API_KEY is configured we fail-soft with empty detected
 *     attributes and a visualNote explaining why — the rest of the
 *     pipeline can still run on product text alone.
 */

import type { PiCollectedImages, PiDetectedAttributes, PiProductContext } from './types'
import { parseGeminiJson } from '@/lib/util/parseGeminiJson'

const GEMINI_VISION_MODEL = 'gemini-2.5-flash'

interface VisionPart {
  inlineData: { data: string; mimeType: string }
}

async function fetchImageAsInlineData(url: string): Promise<VisionPart | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const mimeType = res.headers.get('content-type')?.split(';')[0].trim() || 'image/jpeg'
    // Gemini limit is ~20 MB per request; keep it well under
    if (buf.byteLength > 8_000_000) return null
    return {
      inlineData: {
        data: buf.toString('base64'),
        mimeType,
      },
    }
  } catch {
    return null
  }
}

function buildAnalysisPrompt(product: PiProductContext, images: PiCollectedImages): string {
  const lines: string[] = []
  lines.push('Sen Uygunayakkabı e-ticaret platformunun Ürün Zeka asistanısın.')
  lines.push('Verilen görselleri ve ürün verisini analiz et, tamamen nesnel olarak SADECE JSON döndür.')
  lines.push('')
  lines.push('ÜRÜN MEVCUT VERİSİ:')
  lines.push(`- Başlık: ${product.title}`)
  if (product.category) lines.push(`- Kategori: ${product.category}`)
  if (product.brand) lines.push(`- Marka: ${product.brand}`)
  if (product.productType) lines.push(`- Ürün tipi: ${product.productType}`)
  if (product.price) lines.push(`- Fiyat: ₺${product.price}`)
  if (product.description) lines.push(`- Mevcut açıklama: ${product.description.slice(0, 400)}`)
  lines.push('')
  lines.push('GÖRSEL KATMANLARI (öncelik sırasına göre):')
  lines.push(`- Birincil kaynak: ${images.primary ? images.primary.source : 'yok'}`)
  lines.push(`- Destekleyici görsel sayısı: ${images.supporting.length}`)
  if (images.notes) lines.push(`- Not: ${images.notes}`)
  if (images.conflicts) lines.push(`- Çakışma: ${images.conflicts}`)
  lines.push('')
  lines.push('KURALLAR:')
  lines.push('- Birincil görsel ürünün kimliğinin kaynağıdır. Destekleyici görseller stilize veya düzenlenmiş olabilir, yalnızca bağlam için kullan.')
  lines.push('- Ürünün dışında bir şey görüyorsan (model, arka plan, dekorasyon) analizine dahil etme.')
  lines.push('- Markayı yalnızca görselde açıkça görünüyorsa belirt; aksi halde boş bırak.')
  lines.push('- Uydurma özellik ekleme. Emin değilsen alan boş kalsın.')
  lines.push('- Tüm metin değerler Türkçe olsun.')
  lines.push('')
  lines.push('JSON şeması (diğer alan ekleme):')
  lines.push(
    '{"productType": string, "color": string, "materialGuess": string, "style": string, ' +
      '"gender": string, "useCases": string[], "category": string, "visibleBrand": string, ' +
      '"visualNotes": string}',
  )
  return lines.join('\n')
}

export interface ProductAnalysisResult {
  attributes: PiDetectedAttributes
  rawText: string | null
  error?: string
}

/**
 * Run Gemini vision + text analysis on a product. Fail-soft: on any error
 * we return empty attributes and a descriptive visualNote so the caller
 * can still continue with SEO/GEO generation from text alone.
 */
export async function analyzeProduct(
  product: PiProductContext,
  images: PiCollectedImages,
): Promise<ProductAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      attributes: {
        visualNotes:
          'GEMINI_API_KEY bulunamadı — görsel analiz atlandı. Analiz yalnızca ürün metin verisine dayanıyor.',
      },
      rawText: null,
      error: 'gemini_api_key_missing',
    }
  }

  // Gather up to 3 images (primary + first two supporting)
  const urls: Array<{ url: string; label: string }> = []
  if (images.primary) urls.push({ url: images.primary.url, label: `primary (${images.primary.source})` })
  for (const s of images.supporting.slice(0, 2)) urls.push({ url: s.url, label: `supporting (${s.source})` })

  const inlineParts: VisionPart[] = []
  for (const { url } of urls) {
    const part = await fetchImageAsInlineData(url)
    if (part) inlineParts.push(part)
  }

  const prompt = buildAnalysisPrompt(product, images)

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent?key=${apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              ...inlineParts,
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
          // D-226: bumped from 1024 → 4096. Gemini 2.5-flash counts "thinking"
          // tokens against the budget; at 1024 we observed finishReason=MAX_TOKENS
          // with only ~76 chars of visible output (mid-JSON truncation). 4096
          // comfortably covers the thinking overhead for this compact schema.
          // Same class of fix as D-224's discovery bump (8192 → 16384).
          maxOutputTokens: 4096,
        },
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => 'unknown')
      return {
        attributes: {
          visualNotes: `Gemini vision hatası (${res.status}). Analiz yalnızca metin verisine dayanıyor.`,
        },
        rawText: null,
        error: `gemini_http_${res.status}: ${errBody.slice(0, 200)}`,
      }
    }

    const data = (await res.json()) as any
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    const finishReason: string | null = data?.candidates?.[0]?.finishReason ?? null
    if (!text) {
      return {
        attributes: {
          visualNotes: `Gemini boş yanıt döndü${finishReason ? ` (finishReason=${finishReason})` : ''}.`,
        },
        rawText: null,
        error: `gemini_empty_response${finishReason ? `:${finishReason}` : ''}`,
      }
    }

    // D-226: defensive parse — handles ```json fences, trailing prose, and
    // truncated tails. Reuses the same helper pattern as D-224 in geobotRuntime.ts.
    let parsed: Record<string, unknown>
    try {
      parsed = parseGeminiJson<Record<string, unknown>>(text, finishReason, 'PI vision')
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr)
      return {
        attributes: {
          visualNotes: `Gemini yanıtı JSON olarak ayrıştırılamadı${finishReason ? ` (finishReason=${finishReason})` : ''}.`,
        },
        rawText: text,
        error: `gemini_non_json_response: ${msg.slice(0, 200)}`,
      }
    }

    const asStringOrNull = (v: unknown): string | null =>
      typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
    const asStringArray = (v: unknown): string[] | null =>
      Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim().length > 0) : null

    const attributes: PiDetectedAttributes = {
      productType: asStringOrNull(parsed.productType),
      color: asStringOrNull(parsed.color),
      materialGuess: asStringOrNull(parsed.materialGuess),
      style: asStringOrNull(parsed.style),
      gender: asStringOrNull(parsed.gender),
      useCases: asStringArray(parsed.useCases),
      category: asStringOrNull(parsed.category),
      visibleBrand: asStringOrNull(parsed.visibleBrand),
      visualNotes: asStringOrNull(parsed.visualNotes),
    }

    return { attributes, rawText: text }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      attributes: { visualNotes: `Vision analizi başarısız: ${msg}` },
      rawText: null,
      error: msg,
    }
  }
}
