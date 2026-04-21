/**
 * reverseImageSearch.ts — D-220
 *
 * Provider-based reverse image search for the Product Intelligence Bot.
 *
 * Current providers:
 *   - `serpapi` (Google Lens via SerpAPI) — used when SERPAPI_API_KEY is set.
 *   - none — when no provider env var is set, returns
 *     `available: false, results: []`. Callers must treat this as a capability
 *     gap (matchType = 'visual_only_no_external_search'), NOT a failure.
 *
 * Rules enforced here:
 *   - Try the PRIMARY image first (highest-trust source). If it returns no
 *     usable results and supporting images are available, retry with the
 *     first supporting image.
 *   - Classify each result by similarity into the standard matchType bands.
 *     A high_similarity result is NOT an exact_match — callers must honor
 *     that distinction.
 *   - Never expose the API key. Only log the provider name and counts.
 *
 * This module intentionally returns structured failures instead of throwing,
 * because "no provider" is a valid operating mode for the MVP.
 */

import type {
  PiCollectedImages,
  PiReferenceClassification,
  PiReferenceProduct,
  PiReverseSearchResult,
} from './types'

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
 * Run a reverse image search over the collected images. Tries primary first,
 * then first supporting image if primary returned no usable results.
 *
 * Returns `available: false` when no provider API key is configured — this
 * is a normal operating mode and callers must handle it as a capability
 * gap, not a failure.
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
    }
  }

  if (!images.primary) {
    return {
      available: true,
      provider: 'serpapi_google_lens',
      results: [],
      raw: { note: 'no_primary_image_to_search' },
      error: 'no_primary_image',
    }
  }

  // Try primary first
  const primaryResult = await serpApiLensSearch(images.primary.url, serpKey)
  if (primaryResult.ok && primaryResult.results.length > 0) {
    return {
      available: true,
      provider: 'serpapi_google_lens',
      results: primaryResult.results,
      raw: primaryResult.raw,
    }
  }

  // Fall back to first supporting image if available
  const fallback = images.supporting[0]
  if (fallback) {
    const fbResult = await serpApiLensSearch(fallback.url, serpKey)
    if (fbResult.ok) {
      // Results from a fallback image are downgraded by one band to reflect
      // that they came from a non-primary source.
      const downgraded = fbResult.results.map((r) => {
        const downSim = r.similarity != null ? Math.max(50, r.similarity - 10) : null
        return {
          ...r,
          similarity: downSim,
          classification: classifyBySimilarity(downSim),
        }
      })
      return {
        available: true,
        provider: 'serpapi_google_lens',
        results: downgraded,
        raw: { ...((fbResult.raw ?? {}) as object), note: 'fallback_to_supporting_image' },
      }
    }
  }

  return {
    available: true,
    provider: 'serpapi_google_lens',
    results: [],
    raw: primaryResult.raw,
    error: primaryResult.error,
  }
}

// Exposed for orchestrator logic
export { classifyBySimilarity }
