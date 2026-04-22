/**
 * providers/dataForSeo.ts — D-222
 *
 * DataForSEO Google reverse-image-search SERP provider (what Google now
 * calls "Google Lens" and DataForSEO exposes under `/serp/google/lens/`).
 *
 * Why DataForSEO: pay-as-you-go pricing fits the PI Bot's expected low
 * volume (~300 searches/month). No monthly subscription. Turkish
 * location/language bias matches the Uygunayakkabı storefront.
 *
 * Flow (Standard Queue / task-based):
 *   1. POST /serp/google/lens/task_post  → gets a task id (status 20100).
 *   2. Wait a short delay, then poll /serp/google/lens/task_get/advanced/{id}
 *      until status_code === 20000 (ok) or our budget expires.
 *   3. On budget expiry → return `pending: true` with the task id so the
 *      operator can see which task is still running and regen later.
 *
 * We intentionally probe at most ONE URL per provider.search() call and
 * let the orchestrator decide how many images to search. For D-222 that
 * cap is 2 (primary + best supporting).
 *
 * Cost-aware defaults:
 *   - depth = 10 (first page of matches is enough; more depth costs more)
 *   - location_name = 'Turkey', language_name = 'Turkish'
 *   - no priority override → standard queue (cheapest tier)
 *
 * Secrets: never logged. Auth is Basic(login:password), base64-encoded.
 */

import type { PiReferenceProduct } from '../types'
import { classifyBySimilarity } from './classify'
import type { ProviderSearchResult, ReverseSearchProvider } from './types'

const DFS_BASE = 'https://api.dataforseo.com/v3'
// DataForSEO's reverse-image-search endpoints are under /serp/google/lens/.
// This matches Google's own rename (Search-by-Image → Google Lens).
const POST_PATH = '/serp/google/lens/task_post'
const GET_PATH = '/serp/google/lens/task_get/advanced'

export interface DataForSeoConfig {
  login: string
  password: string
  locationName: string
  languageName: string
  depth: number
  // Total time budget for the submit+poll cycle for a SINGLE image.
  // Kept tight (<= 25s) so two parallel searches fit within Vercel's
  // function timeout alongside vision + SEO/GEO generation.
  maxPollMs: number
  pollIntervalMs: number
  initialDelayMs: number
}

function authHeader(login: string, password: string): string {
  return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`
}

async function postTask(
  imageUrl: string,
  cfg: DataForSeoConfig,
): Promise<{ ok: boolean; taskId?: string; raw: unknown; error?: string }> {
  const body = [
    {
      url: imageUrl,
      location_name: cfg.locationName,
      language_name: cfg.languageName,
      depth: cfg.depth,
    },
  ]
  try {
    const res = await fetch(`${DFS_BASE}${POST_PATH}`, {
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
        ok: false,
        raw: { status: res.status, body: data },
        error: `dataforseo_http_${res.status}`,
      }
    }
    const task = data?.tasks?.[0]
    const taskId: string | undefined = task?.id
    const sc: number | undefined = task?.status_code
    // 20000 = OK (rare for async task_post, usually returned in live mode)
    // 20100 = Task Created
    if (!taskId || (sc !== 20000 && sc !== 20100)) {
      return {
        ok: false,
        raw: { responseStatus: data?.status_code, task },
        error: task?.status_message ? `dataforseo_post: ${task.status_message}` : 'dataforseo_no_task_id',
      }
    }
    // If the provider already embedded results (live-like), pass them back
    // via raw so the caller can skip polling.
    return { ok: true, taskId, raw: { taskId, statusCode: sc, inline: task?.result ?? null } }
  } catch (err) {
    return {
      ok: false,
      raw: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function getTask(
  taskId: string,
  cfg: DataForSeoConfig,
): Promise<{ ok: boolean; ready: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch(`${DFS_BASE}${GET_PATH}/${taskId}`, {
      headers: { Authorization: authHeader(cfg.login, cfg.password) },
    })
    if (!res.ok) {
      return { ok: false, ready: false, error: `dataforseo_http_${res.status}` }
    }
    const data = (await res.json()) as any
    const task = data?.tasks?.[0]
    const sc: number | undefined = task?.status_code
    if (sc === 20000 && Array.isArray(task?.result)) {
      return { ok: true, ready: true, data }
    }
    // 40100 / 40601 / 40602 — task in progress or not-yet-ready variants
    if (sc === 40100 || sc === 40601 || sc === 40602) {
      return { ok: true, ready: false }
    }
    // Anything else is an unexpected state — report but don't throw.
    return {
      ok: true,
      ready: false,
      error: task?.status_message ? `dataforseo_get_${sc}: ${task.status_message}` : `dataforseo_get_status_${sc}`,
    }
  } catch (err) {
    return { ok: false, ready: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Flatten a DataForSEO Lens result into our internal PiReferenceProduct
 * shape. Response item types vary (organic, knowledge_graph, images_search,
 * etc.) so we accept anything that has a URL and a title.
 *
 * Similarity is approximated from ordering (top result = highest) and
 * capped at 85 — the provider itself does not publish a numeric score, so
 * this is explicitly ordering-only and cannot promote to exact_match.
 */
function parseResults(data: any): PiReferenceProduct[] {
  const task = data?.tasks?.[0]
  const result = task?.result?.[0]
  if (!result) return []
  const rawItems: any[] = Array.isArray(result?.items) ? result.items : []
  const out: PiReferenceProduct[] = []
  let rank = 0
  for (const m of rawItems) {
    // Accept organic / knowledge / product / images / visual_match types
    const url: string = m?.url || m?.source_url || m?.link || ''
    const title = String(m?.title ?? m?.alt ?? '').slice(0, 200) || 'Untitled'
    if (!url) continue
    const domain = String(m?.domain ?? m?.source ?? (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, '')
      } catch {
        return 'dataforseo'
      }
    })())
    const snippet: string | null =
      m?.description ? String(m.description).slice(0, 300)
      : m?.snippet ? String(m.snippet).slice(0, 300)
      : null
    const imageUrl: string | null = m?.image_url || m?.thumbnail || m?.image?.url || null
    const price: string | null = m?.price?.current ? String(m.price.current)
      : m?.price?.value ? String(m.price.value)
      : m?.price ? String(m.price)
      : null

    const approx = Math.max(55, 85 - rank * 4)
    out.push({
      title,
      url,
      source: domain,
      price,
      imageUrl,
      snippet,
      similarity: approx,
      classification: classifyBySimilarity(approx),
      extractedAttributes: null,
    })
    rank += 1
    if (out.length >= 8) break
  }
  return out
}

export async function dataForSeoSearch(
  imageUrl: string,
  cfg: DataForSeoConfig,
): Promise<ProviderSearchResult> {
  // 1. Submit the task
  const post = await postTask(imageUrl, cfg)
  if (!post.ok || !post.taskId) {
    return { ok: false, results: [], raw: post.raw, error: post.error }
  }

  // Some DataForSEO responses embed the result directly in task_post
  // (rare for standard queue but possible). If that happened, skip polling.
  const inline = (post.raw as any)?.inline
  if (Array.isArray(inline) && inline.length > 0) {
    const results = parseResults({ tasks: [{ result: inline }] })
    return {
      ok: true,
      results,
      raw: { provider: 'dataforseo_google_lens', taskId: post.taskId, inline: true },
      taskId: post.taskId,
    }
  }

  // 2. Wait then poll
  await new Promise((r) => setTimeout(r, cfg.initialDelayMs))
  const deadline = Date.now() + cfg.maxPollMs
  let lastError: string | undefined
  while (Date.now() < deadline) {
    const get = await getTask(post.taskId, cfg)
    if (get.ready && get.data) {
      const results = parseResults(get.data)
      return {
        ok: true,
        results,
        raw: {
          provider: 'dataforseo_google_lens',
          taskId: post.taskId,
          taskResultCount: results.length,
        },
        taskId: post.taskId,
      }
    }
    if (get.error) lastError = get.error
    await new Promise((r) => setTimeout(r, cfg.pollIntervalMs))
  }

  // 3. Budget expired. Return pending with the task id so the operator
  // can regenerate the report after the task completes.
  return {
    ok: true,
    pending: true,
    results: [],
    raw: {
      provider: 'dataforseo_google_lens',
      taskId: post.taskId,
      note: 'polling_budget_exhausted',
      lastError,
    },
    taskId: post.taskId,
    error: lastError,
  }
}

export function buildDataForSeoProvider(
  cfg: DataForSeoConfig,
  maxImages: number,
): ReverseSearchProvider {
  return {
    name: 'dataforseo_google_lens',
    displayName: 'DataForSEO',
    queue: 'standard',
    depth: cfg.depth,
    maxImages,
    search: (imageUrl) => dataForSeoSearch(imageUrl, cfg),
  }
}
