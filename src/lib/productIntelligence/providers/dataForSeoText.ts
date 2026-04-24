/**
 * providers/dataForSeoText.ts — D-229
 *
 * DataForSEO Google Organic SERP (text-search) provider. Used as a
 * FALLBACK when the image-based reverse search returns zero matches but
 * we already have strong vision signals (brand + product type). The goal
 * is to pull real-world competitor/retailer descriptions as reference
 * context for the SEO/GEO pack — not to classify the product itself.
 *
 * Endpoint: `/serp/google/organic/live/advanced` (synchronous — no task
 * polling, keeps total pipeline latency tight).
 *
 * Secrets: never logged. Auth is Basic(login:password), base64-encoded.
 *
 * Cost-aware defaults:
 *   - depth = 10 (first page of organic results)
 *   - location_name = 'Turkey', language_name = 'Turkish'
 *
 * Returns a list of `PiReferenceProduct` entries classified as
 * `similar_style` (text search never promotes past this — we never
 * inspected the pixels).
 */

import type { PiReferenceProduct } from '../types'

const DFS_BASE = 'https://api.dataforseo.com/v3'
const LIVE_PATH = '/serp/google/organic/live/advanced'

export interface DataForSeoTextConfig {
  login: string
  password: string
  locationName: string
  languageName: string
  depth: number
}

function authHeader(login: string, password: string): string {
  return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`
}

function buildCreds(): DataForSeoTextConfig | null {
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (!login || !password) return null
  const depth = Number.parseInt(process.env.DATAFORSEO_TEXT_DEPTH || '10', 10)
  return {
    login,
    password,
    locationName: process.env.DATAFORSEO_LOCATION_NAME || 'Turkey',
    languageName: process.env.DATAFORSEO_LANGUAGE_NAME || 'Turkish',
    depth: Number.isFinite(depth) && depth > 0 ? depth : 10,
  }
}

export interface DataForSeoTextSearchResult {
  available: boolean
  ok: boolean
  results: PiReferenceProduct[]
  raw: unknown
  error?: string
}

/**
 * Runs a Google Organic text search via DataForSEO. Returns
 * `available: false` when credentials aren't configured. The orchestrator
 * treats the absence of credentials as "capability gap", not a failure.
 */
export async function runDataForSeoTextSearch(
  query: string,
): Promise<DataForSeoTextSearchResult> {
  const cfg = buildCreds()
  if (!cfg) {
    return {
      available: false,
      ok: false,
      results: [],
      raw: { note: 'dataforseo_credentials_missing' },
    }
  }

  // Normalize the query: DataForSEO rejects > 700 char keywords.
  const kw = query.trim().slice(0, 680)
  if (kw.length === 0) {
    return {
      available: true,
      ok: false,
      results: [],
      raw: { note: 'empty_query' },
      error: 'empty_query',
    }
  }

  const body = [
    {
      keyword: kw,
      location_name: cfg.locationName,
      language_name: cfg.languageName,
      depth: cfg.depth,
    },
  ]

  try {
    const res = await fetch(`${DFS_BASE}${LIVE_PATH}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(cfg.login, cfg.password),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => null)) as any
    if (!res.ok) {
      return {
        available: true,
        ok: false,
        results: [],
        raw: { status: res.status, data },
        error: `dataforseo_text_http_${res.status}`,
      }
    }
    // DataForSEO wraps results at tasks[0].result[0].items.
    const items: any[] =
      data?.tasks?.[0]?.result?.[0]?.items && Array.isArray(data.tasks[0].result[0].items)
        ? data.tasks[0].result[0].items
        : []

    const results: PiReferenceProduct[] = items
      .filter((it) => it && typeof it.url === 'string' && typeof it.title === 'string')
      // Drop ads / people-also-ask / related-searches — we only want organic
      // result rows with a title + description we can cite as reference.
      .filter((it) => it.type === 'organic' || !it.type)
      .slice(0, 8)
      .map((it, idx) => {
        // Ordering-based similarity, capped at 80 for text search (image
        // search caps at 85 via providers/classify.ts).
        const sim = Math.max(45, 80 - idx * 4)
        let sourceDomain = ''
        try {
          sourceDomain = new URL(it.url).hostname.replace(/^www\./, '')
        } catch {
          sourceDomain = 'web'
        }
        return {
          title: String(it.title).slice(0, 200),
          url: String(it.url),
          source: sourceDomain,
          price: null,
          imageUrl: null,
          snippet: typeof it.description === 'string' ? it.description.slice(0, 300) : null,
          similarity: sim,
          classification: 'similar_style',
          extractedAttributes: null,
        }
      })

    return {
      available: true,
      ok: true,
      results,
      raw: { items: items.length, keyword: kw },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      available: true,
      ok: false,
      results: [],
      raw: { error: msg },
      error: msg,
    }
  }
}
