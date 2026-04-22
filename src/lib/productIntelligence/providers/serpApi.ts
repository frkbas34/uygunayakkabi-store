/**
 * providers/serpApi.ts — D-222 (extracted from D-220 reverseImageSearch.ts)
 *
 * SerpAPI Google Lens reverse image search provider.
 *
 * This is the FALLBACK provider as of D-222 — DataForSEO is now the
 * preferred primary. SerpAPI remains available when:
 *   - REVERSE_SEARCH_PROVIDER=serpapi is set, OR
 *   - DataForSEO credentials are missing AND SERPAPI_API_KEY is set.
 *
 * Keeps the D-220 behavior: linear similarity decay capped at 85 so
 * ordering alone can never promote a result past `similar_style`.
 */

import type { PiReferenceProduct } from '../types'
import { classifyBySimilarity } from './classify'
import type { ProviderSearchResult, ReverseSearchProvider } from './types'

async function serpApiLensSearch(imageUrl: string, apiKey: string): Promise<ProviderSearchResult> {
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

    const results: PiReferenceProduct[] = visualMatches
      .slice(0, 8)
      .map((m, idx) => {
        const approxSimilarity = Math.max(55, 85 - idx * 4)
        return {
          title: String(m?.title ?? '').slice(0, 200) || 'Untitled',
          url: String(m?.link ?? '') || '',
          source: String(m?.source ?? 'google_lens'),
          price: m?.price?.value ? String(m.price.value) : m?.price ? String(m.price) : null,
          imageUrl: m?.thumbnail ? String(m.thumbnail) : null,
          snippet: m?.snippet ? String(m.snippet).slice(0, 300) : null,
          similarity: approxSimilarity,
          classification: classifyBySimilarity(approxSimilarity),
          extractedAttributes: null,
        }
      })
      .filter((r) => r.url)

    return {
      ok: true,
      results,
      raw: {
        provider: 'serpapi_google_lens',
        count: visualMatches.length,
        sample: visualMatches.slice(0, 3),
      },
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

export function buildSerpApiProvider(apiKey: string, maxImages: number): ReverseSearchProvider {
  return {
    name: 'serpapi_google_lens',
    displayName: 'SerpAPI Google Lens',
    queue: 'live',
    depth: 8,
    maxImages,
    search: (imageUrl) => serpApiLensSearch(imageUrl, apiKey),
  }
}
