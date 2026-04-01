/**
 * claidProvider — Claid.ai image enhancement service
 *
 * Wraps the Claid.ai v1 REST API for product photo processing.
 *
 * WHY upload endpoint: Telegram file URLs require bot-token auth in the
 * query string and are not directly fetchable by an external service.
 * We download the buffer via our bot token first, then POST it directly
 * to Claid — the safest, most reliable path.
 *
 * Endpoint:  POST /v1/image/edit/upload   (multipart/form-data)
 * Fields:    file (image binary) + data (JSON operations string)
 * Auth:      Authorization: Bearer <CLAID_API_KEY>
 *
 * ── Modes ────────────────────────────────────────────────────────────────────
 *
 * cleanup  — white background, light sharpening, upscale — marketplace-ready
 * studio   — premium contrast/HDR enhancement, NO background change
 * creative — editorial grey background, mild enhancement
 *
 * All modes are tuned to PRESERVE product identity:
 *   • no shape alteration       • exact sole/lace/logo respected
 *   • no color replacement      • no creative reinterpretation
 *
 * ── Config env vars ──────────────────────────────────────────────────────────
 *
 * CLAID_API_KEY        — required
 * CLAID_BASE_URL       — default: https://api.claid.ai/v1
 * CLAID_TIMEOUT_MS     — default: 60000 (60s)
 */

export type ClaidMode = 'cleanup' | 'studio' | 'creative'

export const CLAID_MODE_LABELS: Record<ClaidMode, string> = {
  cleanup:  '🧹 Ürün Temizleme',
  studio:   '✨ Stüdyo Geliştirme',
  creative: '🎨 Kreatif Arka Plan',
}

export const CLAID_MODE_DESCRIPTIONS: Record<ClaidMode, string> = {
  cleanup:  'Beyaz arka plan • Netlik iyileştirme • Pazar yeri hazır',
  studio:   'Premium kontrast • HDR geliştirme • Arka plan değişmez',
  creative: 'Stüdyo gri arka plan • Editoryal görünüm • Ürün korunur',
}

// ── Operations config per mode ────────────────────────────────────────────────
// Tune these to adjust Claid's behaviour without touching the rest of the code.
// All numeric adjustments are in Claid's accepted range: -10 to +10.

type ClaidOperations = {
  background?: { color: string }
  restorations?: {
    upscale?: 'smart' | 'smart_enhance'
    deblur?: boolean
    denoise?: boolean
  }
  adjustments?: {
    hdr?: number
    clarity?: number
    sharpness?: number
    exposure?: number
    vibrance?: number
  }
}

const MODE_OPERATIONS: Record<ClaidMode, ClaidOperations> = {
  // Marketplace product shot: white background + mild upscale + light sharpening
  cleanup: {
    background:   { color: '#FFFFFF' },
    restorations: { upscale: 'smart' },
    adjustments:  { hdr: 3, sharpness: 5, clarity: 2 },
  },

  // Studio enhancement: no background change — only quality + HDR lift
  studio: {
    restorations: { upscale: 'smart_enhance' },
    adjustments:  { hdr: 5, clarity: 5, sharpness: 8 },
  },

  // Editorial feel: light-grey seamless background + mild enhancement
  // NOTE: for AI-generated scene backgrounds, upgrade to Claid's
  // background.generate feature (requires compatible plan).
  creative: {
    background:   { color: '#F0F0F0' },
    restorations: { upscale: 'smart' },
    adjustments:  { hdr: 4, clarity: 4, sharpness: 3 },
  },
}

// ── Core API call ─────────────────────────────────────────────────────────────

/**
 * Upload an image buffer to Claid and return the processed image as a Buffer.
 *
 * Throws on: missing API key, Claid 4xx/5xx, download failure, empty response.
 * Callers (claidTask.ts) are responsible for try/catch and Telegram notification.
 */
export async function callClaidUpload(
  imageBuffer: Buffer,
  imageMime: string,
  mode: ClaidMode,
): Promise<Buffer> {
  const apiKey = process.env.CLAID_API_KEY
  if (!apiKey) {
    throw new Error('CLAID_API_KEY is not configured — Claid enhancement unavailable')
  }

  const baseUrl  = (process.env.CLAID_BASE_URL || 'https://api.claid.ai/v1').replace(/\/$/, '')
  const endpoint = `${baseUrl}/image/edit/upload`
  const timeoutMs = parseInt(process.env.CLAID_TIMEOUT_MS || '60000', 10)

  const operations = MODE_OPERATIONS[mode]

  // The `data` field carries all Claid processing options as a JSON string
  const dataJson = JSON.stringify({
    operations,
    output: {
      format: { type: 'jpeg', quality: 95 },
    },
  })

  // Derive a safe filename extension from mime type
  const ext = imageMime === 'image/png' ? 'png' : imageMime === 'image/webp' ? 'webp' : 'jpg'

  const form = new FormData()
  // Claid Upload API requires field name 'file' (not 'image')
  // See: https://docs.claid.ai/image-editing-api/upload-api-reference
  form.append('file', new Blob([new Uint8Array(imageBuffer)], { type: imageMime }), `input.${ext}`)
  form.append('data', dataJson)

  console.log(
    `[ClaidProvider] POST ${endpoint} mode=${mode} ` +
    `inputSize=${imageBuffer.length}b mime=${imageMime}`,
  )

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Claid network/timeout error: ${msg}`)
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '(unreadable body)')
    // Try to pull a human-readable message from JSON error body
    let errDetail = errText.slice(0, 300)
    try {
      const errJson = JSON.parse(errText)
      const msg = errJson?.message || errJson?.error?.message || errJson?.error
      if (msg) errDetail = String(msg).slice(0, 200)
    } catch { /* not JSON */ }

    const errMsg = `Claid HTTP ${res.status}: ${errDetail}`
    console.error(`[ClaidProvider] ${errMsg}`)
    throw new Error(errMsg)
  }

  // Parse the response — Claid returns tmp_url at either root or nested under `data`
  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new Error('Claid returned non-JSON response body')
  }

  type ClaidBody = {
    data?: { output?: { tmp_url?: string } }
    output?: { tmp_url?: string }
  }
  const b = body as ClaidBody
  const tmpUrl = b?.data?.output?.tmp_url || b?.output?.tmp_url

  if (!tmpUrl) {
    console.error('[ClaidProvider] Unexpected response shape:', JSON.stringify(body).slice(0, 500))
    throw new Error('Claid response missing tmp_url — check Vercel logs for response shape')
  }

  console.log(`[ClaidProvider] ✓ tmp_url=${tmpUrl.slice(0, 60)}... — downloading`)

  // Download the processed image from Claid's temporary CDN URL
  let imgRes: Response
  try {
    imgRes = await fetch(tmpUrl, { signal: AbortSignal.timeout(30_000) })
  } catch (err) {
    throw new Error(`Failed to download Claid result from tmp_url: ${err instanceof Error ? err.message : err}`)
  }

  if (!imgRes.ok) {
    throw new Error(`Claid result download failed: HTTP ${imgRes.status}`)
  }

  const outputBuf = Buffer.from(await imgRes.arrayBuffer())
  console.log(
    `[ClaidProvider] ✓ result downloaded — ${outputBuf.length}b mode=${mode}`,
  )
  return outputBuf
}
