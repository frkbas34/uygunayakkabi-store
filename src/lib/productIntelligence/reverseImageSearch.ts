/**
 * reverseImageSearch.ts — D-220, extended in D-221
 *
 * Provider-based reverse image search for the Product Intelligence Bot.
 *
 * Current providers:
 *   - `serpapi` (Google Lens via SerpAPI) — used when SERPAPI_API_KEY is set.
 *   - none — when no provider env var is set, returns
 *     `available: false, externalSearchRan: false, results: []`. Callers
 *     must treat this as a capability gap (matchType =
 *     'visual_only_no_external_search'), NOT a failure.
 *
 * D-221 changes:
 *   - Search ACROSS MULTIPLE images (primary + every supporting image, capped
 *     at MAX_SEARCH_IMAGES to keep quota cost bounded). Previously we only
 *     ran primary, then fell back to supporting[0]. That meant generated/
 *     gallery images were never probed even when the operator expected them
 *     to contribute evidence.
 *   - MERGE + DEDUPE + RANK: per-image results are combined by URL, keeping
 *     the highest similarity for each unique external product. Non-primary
 *     sources are still down-weighted (originals carry higher trust).
 *   - Report new stats: `externalSearchRan`, `searchedImageCount`,
 *     `onlineMatchesFound`, and which image sources contributed.
 *   - Never expose the API key. Only log the provider name and counts.
 *
 * Rules preserved from D-220:
 *   - A high_similarity result is NOT an exact_match — ordering-based
 *     similarity is capped at 85 so the provider alone can never promote
 *     past 'similar_style'. The orchestrator layers brand-signal heuristics
 *     on top to decide final matchType.
 *   - Structured failures instead of throws; "no provider" is a valid mode.
 */

import type {
  PiCollectedImages,
  PiReferenceClassification,
  PiReferenceProduct,
  PiReverseSearchResult,
} from './types'

// D-221: cap total number of images searched per run. SerpAPI charges per
// query, so we keep this bounded. Primary counts as 1; rest come from
// supporting[] in order. 4 covers original + up to 3 supporting.
const MAX_SEARCH_IMAGES = 4

function classifyBySimilarity(similarity: number | null | undefined): PiReferenceClassification {
  if (similarity == null || isNaN(similarity)) return 'low_confidence'
  if (similarity >= 98) return 'exact_match'
  if (similarity >= 90) return 'high_similarity'
  if (similarity >= 70) return 'similar_style'
  return 'low_confidence'
}

async function serpApiLensSearch(imageUrl: string, apiKey: string): Promise<{
  ok: boolean
  results: PiReferenceProduct[]
  raw: unknown
  error?: string
}> {
  const params = new URLSearchParams({
    engine: 'google_lens',
    url: imageUrl,
    api_key: apiKey,
  })
  const endpoint = `https://serpapi.com/search.json?${params.toString()}`

  try {
    const res = await fetch(endpoint)
    if (!res.ok) {
      return { ok: false, results: [], raw: null, error: `serpapi_http_${res.status}` }
    }
    const data = (await res.json()) as any
    const visualMatches: any[] = Array.isArray(data?.visual_matches) ? data.visual_matches : []

    // SerpAPI doesn't return a numeric similarity score — we approximate
    // from ordering (top result = highest), capped so we never claim
    // exact_match just from ordering alone. Callers layer extra heuristics
    // via the analyzeProduct attributes when deciding final matchType.
    const results: PiReferenceProduct[] = visualMatches.slice(0, 8).map((m, idx) => {
      // Linear decay: 0 => 85, 7 => 55. Never >= 90 from ordering alone,
      // so we never auto-promote to high_similarity / exact_match without
      // additional signal from the orchestrator.
      const approxSimilarity = Math.max(55, 85 - idx * 4)
      return {
        title: String(m?.title ?? '').slice(0, 200) || 'Untitled',
        url: String(m?.link ?? '') || '',
        source: String(m?.source ?? 'google_lens'),
        price: m?.price?.value ? String(m.price.value) : (m?.price ? String(m.price) : null),
        imageUrl: m?.thumbnail ? String(m.thumbnail) : null,
        snippet: m?.snippet ? String(m.snippet).slice(0, 300) : null,
        similarity: approxSimilarity,
        classification: classifyBySimilarity(approxSimilarity),
        extractedAttributes: null,
      }
    }).filter((r) => r.url)

    return {
      ok: true,
      results,
      raw: { provider: 'serpapi_google_lens', count: visualMatches.length, sample: visualMatches.slice(0, 3) },
    }
  } catch (err) {
    return {
      ok: false,
      results: [],
      raw: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Apply a similarity downgrade when a result came from a non-primary image.
 * Originals carry the highest trust; generated/enhanced images are
 * AI-stylised versions of the product so their hits are treated as weaker
 * evidence of identity.
 */
function downgradeFor(source: 'original' | 'generated' | 'enhanced', isPrimary: boolean): number {
  if (isPrimary && source === 'original') return 0
  if (source === 'original') return 5   // non-primary original (extra angle)
  if (source === 'enhanced') return 10  // retouched original
  return 15                              // fully generated — weakest identity anchor
}

function applyDowngrade(results: PiReferenceProduct[], points: number): PiReferenceProduct[] {
  if (points <= 0) return results
  return results.map((r) => {
    const downSim = r.similarity != null ? Math.max(50, r.similarity - points) : null
    return {
      ...r,
      similarity: downSim,
      classification: classifyBySimilarity(downSim),
    }
  })
}

/**
 * Merge per-image result sets into a single deduped, ranked list.
 *
 * Dedup key: result URL (external product link). When the same product URL
 * appears from multiple source images we keep the HIGHEST similarity seen
 * (a match on both the original AND a supporting image is stronger evidence
 * than a match on only one, so we reward it with the best observed score).
 */
function mergeAndRank(batches: PiReferenceProduct[][]): PiReferenceProduct[] {
  const bestByUrl = new Map<string, PiReferenceProduct>()
  for (const batch of batches) {
    for (const r of batch) {
      if (!r.url) continue
      const existing = bestByUrl.get(r.url)
      if (!existing) {
        bestByUrl.set(r.url, r)
        continue
      }
      const curSim = existing.similarity ?? -1
      const newSim = r.similarity ?? -1
      if (newSim > curSim) {
        bestByUrl.set(r.url, r)
      }
    }
  }
  // Sort by similarity desc, then by presence of price/snippet as a soft tiebreak
  return Array.from(bestByUrl.values()).sort((a, b) => {
    const sa = a.similarity ?? 0
    const sb = b.similarity ?? 0
    if (sb !== sa) return sb - sa
    const qa = (a.price ? 1 : 0) + (a.snippet ? 1 : 0)
    const qb = (b.price ? 1 : 0) + (b.snippet ? 1 : 0)
    return qb - qa
  })
}

/**
 * Run a reverse image search over the collected images.
 *
 * D-221: searches across multiple images (primary + supporting, up to
 * MAX_SEARCH_IMAGES) and merges the results into one deduped ranked list.
 *
 * Returns `available: false, externalSearchRan: false` when no provider API
 * key is configured — this is a normal operating mode and callers must
 * handle it as a capability gap, not a failure.
 */
export async function runReverseImageSearch(
  images: PiCollectedImages,
): Promise<PiReverseSearchResult> {
  const serpKey = process.env.SERPAPI_API_KEY

  if (!serpKey) {
    return {
      available: false,
      provider: null,
      results: [],
      raw: { note: 'no_reverse_search_provider_configured' },
      externalSearchRan: false,
      searchedImageCount: 0,
      onlineMatchesFound: 0,
      searchedImageSources: [],
    }
  }

  // Build the ordered list of images to probe.
  const queue: Array<{
    url: string
    source: 'original' | 'generated' | 'enhanced'
    isPrimary: boolean
  }> = []
  if (images.primary) {
    queue.push({ url: images.primary.url, source: images.primary.source, isPrimary: true })
  }
  for (const s of images.supporting) {
    if (queue.length >= MAX_SEARCH_IMAGES) break
    queue.push({ url: s.url, source: s.source, isPrimary: false })
  }

  if (queue.length === 0) {
    return {
      available: true,
      provider: 'serpapi_google_lens',
      results: [],
      raw: { note: 'no_images_to_search' },
      externalSearchRan: false,
      searchedImageCount: 0,
      onlineMatchesFound: 0,
      searchedImageSources: [],
      error: 'no_images_to_search',
    }
  }

  // Fire searches sequentially to keep quota predictable; per-image runtime
  // is the dominant cost, and parallelism risks rate-limit bursts on SerpAPI.
  const perImageRaw: unknown[] = []
  const perImageBatches: PiReferenceProduct[][] = []
  const contributed: Array<{ url: string; source: 'original' | 'generated' | 'enhanced' }> = []
  const errors: string[] = []
  let searchedImageCount = 0

  for (const item of queue) {
    const res = await serpApiLensSearch(item.url, serpKey)
    searchedImageCount += 1
    if (res.ok) {
      const downgraded = applyDowngrade(res.results, downgradeFor(item.source, item.isPrimary))
      if (downgraded.length > 0) {
        perImageBatches.push(downgraded)
        contributed.push({ url: item.url, source: item.source })
      }
      perImageRaw.push({ imageUrl: item.url, source: item.source, isPrimary: item.isPrimary, raw: res.raw })
    } else {
      perImageRaw.push({
        imageUrl: item.url,
        source: item.source,
        isPrimary: item.isPrimary,
        error: res.error,
      })
      if (res.error) errors.push(res.error)
    }
  }

  const merged = mergeAndRank(perImageBatches).slice(0, 8)

  return {
    available: true,
    provider: 'serpapi_google_lens',
    results: merged,
    raw: {
      provider: 'serpapi_google_lens',
      searchedImageCount,
      onlineMatchesFound: merged.length,
      perImage: perImageRaw,
    },
    externalSearchRan: true,
    searchedImageCount,
    onlineMatchesFound: merged.length,
    searchedImageSources: contributed,
    error: merged.length === 0 && errors.length > 0 ? errors[0] : undefined,
  }
}

// Exposed for orchestrator logic
export { classifyBySimilarity }
