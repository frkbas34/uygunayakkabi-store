/**
 * Luma API client — Step 26 / Phase 1 (studio_angles)
 *
 * Pure provider layer.
 * No Telegram logic. No Payload logic. No business rules.
 *
 * API reference: https://docs.lumalabs.ai/reference/creategeneration
 * Auth: Authorization: Bearer <LUMA_API_KEY>
 *
 * Models:
 *   photon-flash-1  — fast / lower cost  (default for first-pass)
 *   photon-1        — higher quality      (explicit HQ rerun only)
 *
 * Async lifecycle:
 *   queued → dreaming → completed | failed
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type LumaModel = 'photon-flash-1' | 'photon-1'

export type LumaState = 'queued' | 'dreaming' | 'completed' | 'failed'

export type LumaAspectRatio =
  | '1:1'
  | '4:3'
  | '3:4'
  | '16:9'
  | '9:16'
  | '21:9'
  | '9:21'

/** Single image reference — url must be a publicly accessible URI */
export type LumaImageRef = {
  url: string
  /** 0.0 – 1.0. Higher = stronger visual anchoring to reference. Default ~0.85 */
  weight?: number
}

export type LumaGenRequest = {
  model: LumaModel
  prompt: string
  aspect_ratio?: LumaAspectRatio
  /** Up to 4 reference images for visual identity anchoring */
  image_ref?: LumaImageRef[]
  /** Single image to directly modify/restyle */
  modify_image_ref?: LumaImageRef
  /** POST callback — Luma sends generation object on each state transition */
  callback_url?: string
}

export type LumaGenResponse = {
  id: string
  generation_type: 'image'
  state: LumaState
  failure_reason: string | null
  created_at: string
  assets: {
    image: string | null  // public URL to the generated image
    video?: string | null
  }
  model: string
  request: unknown
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LUMA_BASE = 'https://api.lumalabs.ai/dream-machine/v1'
const DEFAULT_POLL_INTERVAL_MS = 4000
const DEFAULT_MAX_WAIT_MS = 120_000  // 2 minutes

// ─────────────────────────────────────────────────────────────────────────────
// Core API calls
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submit a new image generation request to Luma.
 * Returns immediately with the generation ID and initial state (queued/dreaming).
 */
export async function submitLumaGen(
  req: LumaGenRequest,
  apiKey: string,
): Promise<LumaGenResponse> {
  const res = await fetch(`${LUMA_BASE}/generations/image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(req),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`[LumaAPI] submit failed HTTP ${res.status}: ${errText.slice(0, 400)}`)
  }

  return res.json() as Promise<LumaGenResponse>
}

/**
 * Fetch the current state of a Luma generation by ID.
 */
export async function getLumaGen(
  id: string,
  apiKey: string,
): Promise<LumaGenResponse> {
  const res = await fetch(`${LUMA_BASE}/generations/${id}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`[LumaAPI] poll failed HTTP ${res.status} for id=${id}: ${errText.slice(0, 300)}`)
  }

  return res.json() as Promise<LumaGenResponse>
}

// ─────────────────────────────────────────────────────────────────────────────
// Polling helper
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Poll multiple Luma generation IDs concurrently until all reach a terminal
 * state (completed | failed) or the timeout elapses.
 *
 * Returns a Map<id, LumaGenResponse> for every input ID.
 * Timed-out entries are returned as synthetic `failed` responses.
 */
export async function pollLumaGens(
  ids: string[],
  apiKey: string,
  opts?: { intervalMs?: number; maxWaitMs?: number },
): Promise<Map<string, LumaGenResponse>> {
  const intervalMs = opts?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS
  const maxWaitMs  = opts?.maxWaitMs  ?? DEFAULT_MAX_WAIT_MS

  const results = new Map<string, LumaGenResponse>()
  const pending = new Set(ids)
  const deadline = Date.now() + maxWaitMs

  while (pending.size > 0 && Date.now() < deadline) {
    await sleep(intervalMs)

    for (const id of [...pending]) {
      try {
        const gen = await getLumaGen(id, apiKey)
        if (gen.state === 'completed' || gen.state === 'failed') {
          results.set(id, gen)
          pending.delete(id)
          console.log(`[LumaAPI] ${id} → ${gen.state} (${gen.assets?.image ? 'has image' : 'no image'})`)
        } else {
          console.log(`[LumaAPI] ${id} → ${gen.state} (still pending)`)
        }
      } catch (err) {
        console.warn(`[LumaAPI] poll error for ${id}:`, err instanceof Error ? err.message : err)
        // Non-fatal: retry next interval
      }
    }
  }

  // Any remaining pending IDs timed out — synthesise a failed response
  for (const id of pending) {
    console.warn(`[LumaAPI] ${id} timed out after ${maxWaitMs}ms`)
    results.set(id, {
      id,
      generation_type: 'image',
      state: 'failed',
      failure_reason: `timeout: generation did not complete within ${maxWaitMs / 1000}s`,
      created_at: new Date().toISOString(),
      assets: { image: null },
      model: 'unknown',
      request: null,
    })
  }

  return results
}

/**
 * Download a completed Luma image by URL and return it as a Buffer.
 * Luma image URLs are public CDN links — no auth needed.
 */
export async function downloadLumaImage(imageUrl: string): Promise<Buffer> {
  const res = await fetch(imageUrl)
  if (!res.ok) {
    throw new Error(`[LumaAPI] image download failed HTTP ${res.status}: ${imageUrl}`)
  }
  return Buffer.from(await res.arrayBuffer())
}
