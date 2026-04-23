/**
 * providers/index.ts — D-222, extended in D-223
 *
 * Reverse-image-search provider selection.
 *
 * Resolution rules (first match wins):
 *   1. `REVERSE_SEARCH_PROVIDER=googlevision` → Google Cloud Vision
 *        (requires GOOGLE_VISION_API_KEY).
 *   2. `REVERSE_SEARCH_PROVIDER=dataforseo`   → DataForSEO
 *        (requires DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD + funded balance).
 *   3. `REVERSE_SEARCH_PROVIDER=serpapi`      → SerpAPI
 *        (requires SERPAPI_API_KEY).
 *   4. `REVERSE_SEARCH_PROVIDER=auto` (default, also: unset/empty):
 *        - Google Vision if its key is set
 *        - else DataForSEO if credentials exist
 *        - else SerpAPI if SERPAPI_API_KEY exists
 *   5. No provider configured → returns null; orchestrator treats this as
 *      a capability gap (matchType `visual_only_no_external_search`).
 *
 * Why Google Vision is preferred in `auto`: 1,000 Web Detection requests
 * per month are free (covers the PI Bot's ~300/month volume), whereas
 * DataForSEO requires a $50 minimum deposit and SerpAPI has a per-month
 * subscription after 100 free searches. D-223 pivoted the PI Bot to
 * Google Vision to avoid the upfront cost while keeping the same
 * provider-abstraction contract.
 *
 * Env vars consumed here (read once at provider build time):
 *   GOOGLE_VISION_API_KEY, GOOGLE_VISION_MAX_RESULTS, GOOGLE_VISION_MAX_IMAGES,
 *   DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD,
 *   DATAFORSEO_LOCATION_NAME, DATAFORSEO_LANGUAGE_NAME,
 *   DATAFORSEO_DEPTH, DATAFORSEO_MAX_IMAGES,
 *   DATAFORSEO_POLL_TIMEOUT_MS, DATAFORSEO_POLL_INTERVAL_MS,
 *   DATAFORSEO_INITIAL_DELAY_MS,
 *   SERPAPI_API_KEY, REVERSE_SEARCH_PROVIDER
 */

import { buildDataForSeoProvider, type DataForSeoConfig } from './dataForSeo'
import { buildGoogleVisionProvider, type GoogleVisionConfig } from './googleVision'
import { buildSerpApiProvider } from './serpApi'
import type { ReverseSearchProvider } from './types'

// D-222: per spec, max images searched per product = 2.
const DEFAULT_MAX_IMAGES = 2

function intEnv(name: string, fallback: number): number {
  const v = process.env[name]
  if (!v) return fallback
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function dataForSeoCreds(): { login: string; password: string } | null {
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (!login || !password) return null
  return { login, password }
}

function buildGoogleVisionFromEnv(): ReverseSearchProvider | null {
  const apiKey = process.env.GOOGLE_VISION_API_KEY
  if (!apiKey) return null
  const cfg: GoogleVisionConfig = {
    apiKey,
    maxResults: intEnv('GOOGLE_VISION_MAX_RESULTS', 10),
  }
  const maxImages = intEnv('GOOGLE_VISION_MAX_IMAGES', DEFAULT_MAX_IMAGES)
  return buildGoogleVisionProvider(cfg, maxImages)
}

function buildDataForSeoFromEnv(): ReverseSearchProvider | null {
  const creds = dataForSeoCreds()
  if (!creds) return null
  const cfg: DataForSeoConfig = {
    login: creds.login,
    password: creds.password,
    locationName: process.env.DATAFORSEO_LOCATION_NAME || 'Turkey',
    languageName: process.env.DATAFORSEO_LANGUAGE_NAME || 'Turkish',
    depth: intEnv('DATAFORSEO_DEPTH', 10),
    // Total poll budget per image. Tight so two parallel searches fit
    // within Vercel's function timeout alongside the rest of the pipeline.
    maxPollMs: intEnv('DATAFORSEO_POLL_TIMEOUT_MS', 22_000),
    pollIntervalMs: intEnv('DATAFORSEO_POLL_INTERVAL_MS', 2_500),
    initialDelayMs: intEnv('DATAFORSEO_INITIAL_DELAY_MS', 4_000),
  }
  const maxImages = intEnv('DATAFORSEO_MAX_IMAGES', DEFAULT_MAX_IMAGES)
  return buildDataForSeoProvider(cfg, maxImages)
}

function buildSerpApiFromEnv(): ReverseSearchProvider | null {
  const key = process.env.SERPAPI_API_KEY
  if (!key) return null
  return buildSerpApiProvider(key, DEFAULT_MAX_IMAGES)
}

export function selectProvider(): ReverseSearchProvider | null {
  const pref = (process.env.REVERSE_SEARCH_PROVIDER || 'auto').trim().toLowerCase()

  if (pref === 'googlevision' || pref === 'google_vision' || pref === 'google-vision') {
    return buildGoogleVisionFromEnv()
  }
  if (pref === 'dataforseo') {
    return buildDataForSeoFromEnv()
  }
  if (pref === 'serpapi') {
    return buildSerpApiFromEnv()
  }
  // 'auto' (and any unrecognized value) — prefer Google Vision (free tier),
  // then DataForSEO, then SerpAPI.
  return (
    buildGoogleVisionFromEnv() ??
    buildDataForSeoFromEnv() ??
    buildSerpApiFromEnv()
  )
}

/**
 * Diagnostic: which providers could the environment support right now?
 * Used by the Telegram report to explain WHY a capability gap exists.
 */
export function providerAvailability(): {
  googleVision: boolean
  dataForSeo: boolean
  serpApi: boolean
  preference: string
} {
  return {
    googleVision: !!process.env.GOOGLE_VISION_API_KEY,
    dataForSeo: !!dataForSeoCreds(),
    serpApi: !!process.env.SERPAPI_API_KEY,
    preference: (process.env.REVERSE_SEARCH_PROVIDER || 'auto').trim().toLowerCase(),
  }
}

export type { ReverseSearchProvider, ProviderSearchResult } from './types'
