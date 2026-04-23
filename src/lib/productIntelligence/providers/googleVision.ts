/**
 * providers/googleVision.ts — D-223
 *
 * Google Cloud Vision Web Detection provider.
 *
 * Why we use it: free tier covers 1,000 Web Detection requests / month,
 * which comfortably exceeds the PI Bot's ~300 searches / month expected
 * volume. No minimum deposit (DataForSEO requires $50 upfront, which
 * didn't fit the project's budget). Official Google API — no scraping
 * intermediary.
 *
 * API: POST https://vision.googleapis.com/v1/images:annotate?key=KEY
 *   features: [{ type: 'WEB_DETECTION', maxResults: N }]
 *
 * Response shape (webDetection):
 *   - pagesWithMatchingImages  → product pages containing our image (primary signal)
 *   - fullMatchingImages       → raw image urls that are the same image
 *   - partialMatchingImages    → cropped/resized versions
 *   - webEntities              → what Google thinks is IN the image (text labels)
 *   - visuallySimilarImages    → similar-looking items
 *   - bestGuessLabels          → Google's best text guess at the product
 *
 * For PI Bot's SEO use case, `pagesWithMatchingImages` is the gold — we
 * need product listings to pull titles and URLs from. Each page is
 * classified by whether its matching image is a full or partial match;
 * full matches get a higher base similarity.
 *
 * Similarity is ordering-based and capped at 85 (same rule as DataForSEO
 * provider), so the provider alone never promotes past `similar_style`.
 * The orchestrator in createProductIntelligenceReport layers brand-signal
 * heuristics on top.
 *
 * Auth: plain API key in `?key=` query parameter. Service-account JSON is
 * blocked by Google's default `iam.disableServiceAccountKeyCreation`
 * organisation policy on new projects, and a restricted API key is
 * sufficient for Vision API. The key should be restricted in the GCP
 * console to Cloud Vision API only.
 *
 * Synchronous: unlike DataForSEO, Vision API returns results immediately
 * in the same request — no task_post + polling cycle. That makes per-image
 * wall time predictable (~1–3s) and keeps us well inside Vercel's function
 * timeout.
 */

import type { PiReferenceProduct } from '../types'
import { classifyBySimilarity } from './classify'
import type { ProviderSearchResult, ReverseSearchProvider } from './types'

const VISION_BASE = 'https://vision.googleapis.com/v1/images:annotate'

export interface GoogleVisionConfig {
  apiKey: string
  // How many webDetection page matches to request. Google caps this
  // server-side; we request 10 and downstream-cap at 8 results after
  // ranking.
  maxResults: number
}

interface PageMatch {
  url: string
  pageTitle?: string
  fullMatchingImages?: Array<{ url: string }>
  partialMatchingImages?: Array<{ url: string }>
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'unknown'
  }
}

/**
 * Extract PiReferenceProduct list from a Vision API response.
 * Priority: pagesWithMatchingImages (product pages that host our image).
 * Ranking: full matches score higher than partial matches; within each
 * bucket, earlier entries in Google's order score higher.
 */
function parseWebDetection(data: any): PiReferenceProduct[] {
  const wd = data?.responses?.[0]?.webDetection
  if (!wd) return []
  const pages: PageMatch[] = Array.isArray(wd?.pagesWithMatchingImages)
    ? wd.pagesWithMatchingImages
    : []
  if (pages.length === 0) return []

  const out: PiReferenceProduct[] = []
  let rank = 0
  for (const p of pages) {
    const url = p?.url
    if (!url) continue
    const isFullMatch =
      Array.isArray(p.fullMatchingImages) && p.fullMatchingImages.length > 0
    // Full match (exact image on page) → base 85. Partial match (cropped or
    // resized version on page) → base 70. Both cap at 85 (the provider-
    // ordering cap shared with DataForSEO).
    const base = isFullMatch ? 85 : 70
    const approx = Math.max(55, base - rank * 3)
    const title = String(p.pageTitle ?? 'Untitled').slice(0, 200)
    const imageUrl =
      p.fullMatchingImages?.[0]?.url ??
      p.partialMatchingImages?.[0]?.url ??
      null

    out.push({
      title,
      url,
      source: hostOf(url),
      price: null, // Vision API doesn't extract product prices
      imageUrl,
      snippet: null, // Vision API doesn't return page snippets
      similarity: approx,
      classification: classifyBySimilarity(approx),
      extractedAttributes: null,
    })
    rank += 1
    if (out.length >= 8) break
  }
  return out
}

export async function googleVisionSearch(
  imageUrl: string,
  cfg: GoogleVisionConfig,
): Promise<ProviderSearchResult> {
  const body = {
    requests: [
      {
        image: { source: { imageUri: imageUrl } },
        features: [{ type: 'WEB_DETECTION', maxResults: cfg.maxResults }],
      },
    ],
  }
  try {
    const res = await fetch(`${VISION_BASE}?key=${encodeURIComponent(cfg.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => null)) as any
    if (!res.ok) {
      // Vision API returns structured errors — prefer the human message
      // when available so Telegram reports surface "API key not authorized
      // for Vision API" vs a bare "403".
      const msg =
        data?.error?.message || data?.responses?.[0]?.error?.message
      return {
        ok: false,
        results: [],
        raw: { status: res.status, body: data },
        error: msg
          ? `google_vision_${res.status}: ${msg}`
          : `google_vision_http_${res.status}`,
      }
    }
    // Per-image errors come back as 200 with an error object inside the
    // response array (e.g. unfetchable imageUri, unsupported format).
    const perImgErr = data?.responses?.[0]?.error
    if (perImgErr && perImgErr.code) {
      return {
        ok: false,
        results: [],
        raw: { body: data },
        error: `google_vision_response: ${perImgErr.message ?? 'unknown'}`,
      }
    }
    const results = parseWebDetection(data)
    return {
      ok: true,
      results,
      raw: {
        provider: 'google_vision_web_detection',
        resultCount: results.length,
        pagesWithMatchingImages:
          data?.responses?.[0]?.webDetection?.pagesWithMatchingImages?.length ?? 0,
        entitiesCount:
          data?.responses?.[0]?.webDetection?.webEntities?.length ?? 0,
        bestGuess:
          data?.responses?.[0]?.webDetection?.bestGuessLabels?.[0]?.label ?? null,
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

export function buildGoogleVisionProvider(
  cfg: GoogleVisionConfig,
  maxImages: number,
): ReverseSearchProvider {
  return {
    name: 'google_vision_web_detection',
    displayName: 'Google Vision',
    // Vision API is synchronous — no queue/polling involved. We still
    // populate the field so the Telegram report can print a meaningful
    // "Kuyruk: sync" line instead of a blank.
    queue: 'sync',
    depth: cfg.maxResults,
    maxImages,
    search: (imageUrl) => googleVisionSearch(imageUrl, cfg),
  }
}
