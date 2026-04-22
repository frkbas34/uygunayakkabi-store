/**
 * createProductIntelligenceReport.ts — D-220
 *
 * Orchestrator: runs the full Product Intelligence pipeline for a single
 * product and persists the result as a `product-intelligence-reports` doc.
 *
 * Flow:
 *   1. Create a draft report row (status = 'draft') — makes the attempt
 *      traceable even if a later step crashes.
 *   2. Fetch product context.
 *   3. Collect images with the original-first priority rule.
 *   4. Vision analysis (Gemini). Fail-soft; pipeline continues.
 *   5. Reverse image search. Fail-soft; capability-gap returns
 *      `available: false`, not a throw.
 *   6. Classify matchType. We combine the search-provider's ordering-based
 *      similarity with analyzer signals (e.g. visibleBrand) before picking
 *      the final matchType — ordering alone never promotes past
 *      'similar_style'.
 *   7. Generate SEO/GEO pack.
 *   8. Update the report to 'ready' with everything we collected. On any
 *      hard failure we set status = 'failed' + errorMessage.
 *
 * Returns the report id + classification so the Telegram layer can render
 * a summary message.
 */

import type {
  PiCollectedImages,
  PiDetectedAttributes,
  PiMatchType,
  PiProductContext,
  PiReferenceProduct,
  PiReverseSearchResult,
  PiTelegramContext,
  PiTriggerSource,
} from './types'
import { collectProductImages } from './collectImages'
import { analyzeProduct } from './analyzeProduct'
import { runReverseImageSearch } from './reverseImageSearch'
import { generateSeoGeoPack } from './generateSeoGeoPack'

// NOTE: `where` and `data` are loosened to `any` so BasePayload (which uses
// Payload's stricter `Where` + collection-specific `data` types) is directly
// assignable. Runtime shape is the same.
type Payload = {
  create: (args: { collection: string; data: any }) => Promise<{ id: string | number } & Record<string, unknown>>
  findByID: (args: { collection: string; id: string | number; depth?: number }) => Promise<any>
  find: (args: {
    collection: string
    where?: any
    sort?: string
    limit?: number
    depth?: number
  }) => Promise<{ docs: any[] }>
  update: (args: { collection: string; id: string | number; data: any }) => Promise<any>
}

function asProductContext(raw: any): PiProductContext {
  return {
    id: raw?.id,
    title: String(raw?.title ?? ''),
    category:
      typeof raw?.category === 'string'
        ? raw.category
        : raw?.category?.title ?? null,
    price: typeof raw?.price === 'number' ? raw.price : null,
    originalPrice: typeof raw?.originalPrice === 'number' ? raw.originalPrice : null,
    description: typeof raw?.description === 'string' ? raw.description : null,
    brand:
      typeof raw?.brand === 'string'
        ? raw.brand
        : raw?.brand?.title ?? raw?.brand?.name ?? null,
    productType: typeof raw?.productType === 'string' ? raw.productType : null,
    variants: Array.isArray(raw?.variants)
      ? raw.variants.map((v: any) => ({ size: v?.size, stock: v?.stock, color: v?.color }))
      : null,
    stockQuantity: typeof raw?.stockQuantity === 'number' ? raw.stockQuantity : null,
    existingMetaTitle: raw?.content?.discoveryPack?.metaTitle ?? null,
    existingMetaDescription: raw?.content?.discoveryPack?.metaDescription ?? null,
  }
}

/**
 * Decide the final matchType. Ordering-based similarity from a reverse-
 * search provider is necessarily approximate, so we use these rules:
 *
 *   - If the search capability is missing entirely, return
 *     'visual_only_no_external_search'.
 *   - If results exist and the top result's classification is
 *     'high_similarity' AND we have a visible brand signal from vision,
 *     keep 'high_similarity'. (We never auto-promote to 'exact_match'
 *     without very strong evidence; that requires manual operator input.)
 *   - Otherwise, trust the top result's own classification, but cap at
 *     'similar_style' when we have no supporting brand/text signal.
 */
function decideMatchType(
  search: PiReverseSearchResult,
  attrs: PiDetectedAttributes,
  refs: PiReferenceProduct[],
): { matchType: PiMatchType; confidence: number; exactProductFound: boolean } {
  if (!search.available) {
    return { matchType: 'visual_only_no_external_search', confidence: 0, exactProductFound: false }
  }
  if (refs.length === 0) {
    return { matchType: 'low_confidence', confidence: 40, exactProductFound: false }
  }
  const top = refs[0]
  const brandSignal = !!attrs.visibleBrand && attrs.visibleBrand.length > 1

  if (top.classification === 'exact_match') {
    // Provider rarely returns exact_match directly; if it does, require brand signal too.
    if (brandSignal) {
      return { matchType: 'exact_match', confidence: Math.min(100, top.similarity ?? 98), exactProductFound: true }
    }
    return { matchType: 'high_similarity', confidence: Math.min(95, top.similarity ?? 92), exactProductFound: false }
  }

  if (top.classification === 'high_similarity') {
    return {
      matchType: 'high_similarity',
      confidence: Math.min(95, top.similarity ?? 91),
      exactProductFound: false,
    }
  }
  if (top.classification === 'similar_style') {
    return {
      matchType: 'similar_style',
      confidence: Math.min(88, top.similarity ?? 75),
      exactProductFound: false,
    }
  }
  return {
    matchType: 'low_confidence',
    confidence: Math.max(30, Math.min(69, top.similarity ?? 50)),
    exactProductFound: false,
  }
}

export interface CreateReportOptions {
  productId: string | number
  triggerSource?: PiTriggerSource
  telegram?: PiTelegramContext
}

export interface CreatedReportSummary {
  reportId: string | number
  status: 'ready' | 'failed'
  matchType: PiMatchType
  matchConfidence: number
  exactProductFound: boolean
  warnings: string[]
  error?: string
  images: PiCollectedImages
  attributes: PiDetectedAttributes
  // D-221: surface online-search stats directly to the Telegram layer so it
  // can render "externalSearchRan yes/no · provider · matches found · top 3"
  // without re-querying the DB.
  search?: {
    externalSearchRan: boolean
    provider: string | null
    searchedImageCount: number
    onlineMatchesFound: number
    topMatches: PiReferenceProduct[]
  }
}

export async function createProductIntelligenceReport(
  payload: Payload,
  opts: CreateReportOptions,
): Promise<CreatedReportSummary> {
  const { productId, triggerSource = 'telegram', telegram = {} } = opts

  // 1. Draft row
  const draft = await payload.create({
    collection: 'product-intelligence-reports',
    data: {
      product: productId,
      status: 'draft',
      triggerSource,
      telegram,
    },
  })
  const reportId = draft.id

  // Fail-safe: anything thrown from here is captured and written to the report.
  try {
    // 2. Product context
    const productRaw = await payload.findByID({
      collection: 'products',
      id: productId,
      depth: 2,
    })
    if (!productRaw) throw new Error(`Product ${productId} not found`)
    const product = asProductContext(productRaw)

    // 3. Images
    const images = await collectProductImages(payload, productId)

    // 4. Vision analysis
    const analysis = await analyzeProduct(product, images)

    // 5. Reverse image search
    const search = await runReverseImageSearch(images)

    // 6. Classify match
    const { matchType, confidence, exactProductFound } = decideMatchType(
      search,
      analysis.attributes,
      search.results,
    )

    // 7. Generate SEO/GEO pack
    const pack = await generateSeoGeoPack(product, analysis.attributes, search.results)

    // Collect warnings
    const warnings: string[] = []
    if (analysis.error) warnings.push(`Vision: ${analysis.error}`)
    if (!search.available) {
      // D-221: be explicit about WHY online matches are absent, so the
      // operator sees "provider missing" vs "provider failed" vs "no hits".
      warnings.push(
        'Online arama kullanılamıyor — sağlayıcı/API anahtarı yok (SERPAPI_API_KEY). Güven skoru düşürüldü.',
      )
    }
    if (search.error) warnings.push(`Reverse search: ${search.error}`)
    if (pack.error) warnings.push(`SEO/GEO: ${pack.error}`)
    warnings.push(...pack.riskWarnings)

    // 8. Persist
    await payload.update({
      collection: 'product-intelligence-reports',
      id: reportId,
      data: {
        status: 'ready',
        matchType,
        matchConfidence: confidence,
        exactProductFound,
        detectedAttributes: analysis.attributes,
        referenceProducts: search.results,
        seoPack: pack.seoPack,
        geoPack: pack.geoPack,
        riskWarnings: warnings,
        imagesUsed: {
          primaryImageSource: images.primary?.url ?? null,
          supportingImageSources: images.supporting.map((s) => s.url),
          imageConfidenceNotes: images.notes || '',
          detectedConflicts: images.conflicts || '',
          // D-221: persist the probe count so it's auditable in admin/JSON
          // without re-running the reverse search.
          searchedImageCount: search.searchedImageCount ?? 0,
        },
        rawProviderData: {
          gemini: analysis.rawText ? String(analysis.rawText).slice(0, 8000) : null,
          search: search.raw,
        },
      },
    })

    return {
      reportId,
      status: 'ready',
      matchType,
      matchConfidence: confidence,
      exactProductFound,
      warnings,
      images,
      attributes: analysis.attributes,
      search: {
        externalSearchRan: search.externalSearchRan ?? search.available,
        provider: search.provider,
        searchedImageCount: search.searchedImageCount ?? 0,
        onlineMatchesFound: search.onlineMatchesFound ?? search.results.length,
        topMatches: search.results.slice(0, 3),
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    try {
      await payload.update({
        collection: 'product-intelligence-reports',
        id: reportId,
        data: {
          status: 'failed',
          errorMessage: msg,
        },
      })
    } catch {
      // swallow — already in an error path
    }
    return {
      reportId,
      status: 'failed',
      matchType: 'low_confidence',
      matchConfidence: 0,
      exactProductFound: false,
      warnings: [],
      error: msg,
      images: { primary: null, supporting: [], notes: '', conflicts: '' },
      attributes: {},
    }
  }
}
