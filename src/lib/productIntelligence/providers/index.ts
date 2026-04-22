/**
 * providers/index.ts — D-222
 *
 * Reverse-image-search provider selection.
 *
 * Resolution rules (first match wins):
 *   1. `REVERSE_SEARCH_PROVIDER=dataforseo`  → DataForSEO (requires creds)
 *   2. `REVERSE_SEARCH_PROVIDER=serpapi`     → SerpAPI (requires key)
 *   3. `REVERSE_SEARCH_PROVIDER=auto` (default, also: unset/empty):
 *        - DataForSEO if credentials exist
 *        - else SerpAPI if SERPAPI_API_KEY exists
 *   4. No provider configured → returns null; orchestrator treats this as
 *      a capability gap (matchType `visual_only_no_external_search`).
 *
 * Env vars consumed here (read once at provider build time):
 *   DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD,
 *   DATAFORSEO_LOCATION_NAME, DATAFORSEO_LANGUAGE_NAME,
 *   DATAFORSEO_DEPTH, DATAFORSEO_MAX_IMAGES,
 *   DATAFORSEO_POLL_TIMEOUT_MS, DATAFORSEO_POLL_INTERVAL_MS,
 *   DATAFORSEO_INITIAL_DELAY_MS,
 *   SERPAPI_API_KEY, REVERSE_SEARCH_PROVIDER
 */

import { buildDataForSeoProvider, type DataForSeoConfig } from './dataForSeo'
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

  if (pref === 'dataforseo') {
    return buildDataForSeoFromEnv()
  }
  if (pref === 'serpapi') {
    return buildSerpApiFromEnv()
  }
  // 'auto' (and any unrecognized value) — prefer DataForSEO, fall back to SerpAPI.
  return buildDataForSeoFromEnv() ?? buildSerpApiFromEnv()
}

/**
 * Diagnostic: which providers could the environment support right now?
 * Used by the Telegram report to explain WHY a capability gap exists.
 */
export function providerAvailability(): {
  dataForSeo: boolean
  serpApi: boolean
  preference: string
} {
  return {
    dataForSeo: !!dataForSeoCreds(),
    serpApi: !!process.env.SERPAPI_API_KEY,
    preference: (process.env.REVERSE_SEARCH_PROVIDER || 'auto').trim().toLowerCase(),
  }
}

export type { ReverseSearchProvider, ProviderSearchResult } from './types'
