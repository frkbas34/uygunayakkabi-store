/**
 * imageProviders — Step 24
 *
 * Provider adapter layer for AI image generation.
 * Each adapter takes an array of text prompts and returns an array of
 * image Buffers (PNG/JPEG). Adapters are designed to:
 *
 *  - Be independent: failure in one prompt does not abort the entire batch
 *  - Fail gracefully: missing API key → empty result + console warning
 *  - Be configurable: model names overridable via env vars
 *
 * Supported providers:
 *  - Gemini Flash   → GEMINI_API_KEY (fast, cheap, #hizli mode) [gemini-2.5-flash-image]
 *  - GPT Image      → OPENAI_API_KEY (balanced quality, #dengeli mode) [gpt-image-1]
 *  - Gemini Pro     → GEMINI_API_KEY (high quality via Imagen 4 Ultra, #premium mode) [imagen-4.0-ultra-generate-001]
 *
 * Mode routing:
 *  - #hizli    → generateWithGeminiFlash()
 *  - #dengeli  → generateWithGPTImage()
 *  - #premium  → generateWithGeminiPro()
 *  - #karma    → generateHybridSet() (distributes across all three)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProviderResult = {
  provider: string
  promptCount: number
  successCount: number
  buffers: Buffer[]
  errors: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Sleep helper for optional retry back-off */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Gemini Flash (generateContent) — image generation via Gemini API.
 * Model: gemini-2.5-flash-image (overridable via GEMINI_FLASH_MODEL)
 * Supports optional referenceImage Buffer for image-to-image consistency.
 * Returns a single image Buffer per prompt, or null if the call fails.
 */
async function callGeminiFlash(
  prompt: string,
  apiKey: string,
  referenceImage?: Buffer,
  referenceImageMime?: string,
): Promise<Buffer | null> {
  const model =
    process.env.GEMINI_FLASH_MODEL ||
    'gemini-2.5-flash-image'

  // Build request parts: reference image first (if provided), then text prompt
  const requestParts: Array<Record<string, unknown>> = []
  if (referenceImage) {
    requestParts.push({
      inlineData: {
        mimeType: referenceImageMime || 'image/jpeg',
        data: referenceImage.toString('base64'),
      },
    })
  }
  requestParts.push({ text: prompt })

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: requestParts }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        }),
      },
    )

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[GeminiFlash] HTTP ${res.status}: ${errText.slice(0, 200)}`)
      return null
    }

    const data = await res.json()
    // The image is in candidates[0].content.parts as inlineData
    const parts: Array<Record<string, unknown>> =
      data?.candidates?.[0]?.content?.parts ?? []

    for (const part of parts) {
      const inline = part?.inlineData as Record<string, string> | undefined
      if (inline?.data) {
        return Buffer.from(inline.data, 'base64')
      }
    }

    console.error('[GeminiFlash] No inlineData in response:', JSON.stringify(data).slice(0, 300))
    return null
  } catch (err) {
    console.error('[GeminiFlash] fetch error:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Gemini Pro / Imagen 4 Ultra — highest quality image generation via Imagen API.
 * Model: imagen-4.0-ultra-generate-001 (overridable via GEMINI_PRO_MODEL)
 * Uses the /predict endpoint which supports sampleCount batching.
 * Returns one Buffer per prompt.
 */
async function callGeminiPro(
  prompt: string,
  apiKey: string,
): Promise<Buffer | null> {
  const model =
    process.env.GEMINI_PRO_MODEL || 'imagen-4.0-ultra-generate-001'

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
          },
        }),
      },
    )

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[GeminiPro/Imagen] HTTP ${res.status}: ${errText.slice(0, 200)}`)
      return null
    }

    const data = await res.json()
    const b64: string | undefined = data?.predictions?.[0]?.bytesBase64Encoded
    if (!b64) {
      console.error('[GeminiPro/Imagen] No bytesBase64Encoded:', JSON.stringify(data).slice(0, 300))
      return null
    }

    return Buffer.from(b64, 'base64')
  } catch (err) {
    console.error('[GeminiPro/Imagen] fetch error:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * OpenAI gpt-image-1 — balanced-quality image generation.
 * Model: gpt-image-1 (overridable via OPENAI_IMAGE_MODEL env)
 * Returns base64-encoded image as Buffer.
 */
async function callGPTImage(
  prompt: string,
  apiKey: string,
): Promise<Buffer | null> {
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
        quality: 'standard',
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[GPTImage] HTTP ${res.status}: ${errText.slice(0, 200)}`)
      return null
    }

    const data = await res.json()
    const b64: string | undefined = data?.data?.[0]?.b64_json
    if (!b64) {
      // Fallback: maybe URL-based response
      const url: string | undefined = data?.data?.[0]?.url
      if (url) {
        const imgRes = await fetch(url)
        if (!imgRes.ok) return null
        return Buffer.from(await imgRes.arrayBuffer())
      }
      console.error('[GPTImage] No b64_json or url in response:', JSON.stringify(data).slice(0, 300))
      return null
    }

    return Buffer.from(b64, 'base64')
  } catch (err) {
    console.error('[GPTImage] fetch error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public provider functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate images with Gemini Flash (fast, cheap).
 * Runs prompts sequentially to respect rate limits.
 * When referenceImage is provided, each call uses image-to-image mode —
 * the reference photo is sent alongside the prompt so the model keeps
 * the same product design across all generated images.
 * Returns ProviderResult with buffers for successfully generated images.
 */
export async function generateWithGeminiFlash(
  prompts: string[],
  referenceImage?: Buffer,
  referenceImageMime?: string,
): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY
  const result: ProviderResult = {
    provider: 'gemini-flash',
    promptCount: prompts.length,
    successCount: 0,
    buffers: [],
    errors: [],
  }

  if (!apiKey) {
    const msg = 'GEMINI_API_KEY not set — Gemini Flash skipped'
    console.warn(`[imageProviders] ${msg}`)
    result.errors.push(msg)
    return result
  }

  for (let i = 0; i < prompts.length; i++) {
    const buf = await callGeminiFlash(prompts[i], apiKey, referenceImage, referenceImageMime)
    if (buf) {
      result.buffers.push(buf)
      result.successCount++
    } else {
      result.errors.push(`Prompt ${i + 1}: generation failed`)
    }
    // Small delay between calls to avoid rate limiting
    if (i < prompts.length - 1) await sleep(500)
  }

  console.log(
    `[GeminiFlash] completed — ${result.successCount}/${result.promptCount} images generated` +
    (referenceImage ? ' (image-to-image mode)' : ''),
  )
  return result
}

/**
 * Generate images with Gemini Pro / Imagen 3 (high quality).
 * Runs prompts sequentially.
 */
export async function generateWithGeminiPro(
  prompts: string[],
): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY
  const result: ProviderResult = {
    provider: 'gemini-pro',
    promptCount: prompts.length,
    successCount: 0,
    buffers: [],
    errors: [],
  }

  if (!apiKey) {
    const msg = 'GEMINI_API_KEY not set — Gemini Pro skipped'
    console.warn(`[imageProviders] ${msg}`)
    result.errors.push(msg)
    return result
  }

  for (let i = 0; i < prompts.length; i++) {
    const buf = await callGeminiPro(prompts[i], apiKey)
    if (buf) {
      result.buffers.push(buf)
      result.successCount++
    } else {
      result.errors.push(`Prompt ${i + 1}: generation failed`)
    }
    if (i < prompts.length - 1) await sleep(500)
  }

  console.log(
    `[GeminiPro] completed — ${result.successCount}/${result.promptCount} images generated`,
  )
  return result
}

/**
 * Generate images with OpenAI gpt-image-1 (balanced quality).
 * Runs prompts sequentially.
 */
export async function generateWithGPTImage(
  prompts: string[],
): Promise<ProviderResult> {
  const apiKey = process.env.OPENAI_API_KEY
  const result: ProviderResult = {
    provider: 'gpt-image',
    promptCount: prompts.length,
    successCount: 0,
    buffers: [],
    errors: [],
  }

  if (!apiKey) {
    const msg = 'OPENAI_API_KEY not set — GPT Image skipped'
    console.warn(`[imageProviders] ${msg}`)
    result.errors.push(msg)
    return result
  }

  for (let i = 0; i < prompts.length; i++) {
    const buf = await callGPTImage(prompts[i], apiKey)
    if (buf) {
      result.buffers.push(buf)
      result.successCount++
    } else {
      result.errors.push(`Prompt ${i + 1}: generation failed`)
    }
    if (i < prompts.length - 1) await sleep(500)
  }

  console.log(
    `[GPTImage] completed — ${result.successCount}/${result.promptCount} images generated`,
  )
  return result
}

/**
 * Hybrid generator for #karma mode.
 * Distributes 5 prompts across all three providers:
 *   - Gemini Flash: prompts 0, 1  (commerce_front, side_angle)
 *   - GPT Image:    prompts 2, 3  (detail_closeup, tabletop_editorial)
 *   - Gemini Pro:   prompt 4      (worn_lifestyle)
 *
 * Runs providers in parallel for speed.
 * Falls back gracefully if a provider is unavailable (no API key).
 * referenceImage is forwarded to Gemini Flash for image-to-image consistency.
 */
export async function generateHybridSet(
  prompts: string[],
  referenceImage?: Buffer,
  referenceImageMime?: string,
): Promise<{ results: ProviderResult[]; buffers: Buffer[] }> {
  const flashPrompts = prompts.slice(0, 2)
  const gptPrompts = prompts.slice(2, 4)
  const proPrompts = prompts.slice(4)

  // Run all three providers in parallel; pass reference image to Flash
  const [flashResult, gptResult, proResult] = await Promise.all([
    generateWithGeminiFlash(flashPrompts, referenceImage, referenceImageMime),
    generateWithGPTImage(gptPrompts),
    generateWithGeminiPro(proPrompts),
  ])

  // Merge in prompt order: flash[0,1] + gpt[2,3] + pro[4]
  const mergedBuffers = [
    ...flashResult.buffers,
    ...gptResult.buffers,
    ...proResult.buffers,
  ]

  console.log(
    `[HybridSet] completed — ` +
      `flash=${flashResult.successCount}/${flashResult.promptCount} ` +
      `gpt=${gptResult.successCount}/${gptResult.promptCount} ` +
      `pro=${proResult.successCount}/${proResult.promptCount} ` +
      `total=${mergedBuffers.length}`,
  )

  return {
    results: [flashResult, gptResult, proResult],
    buffers: mergedBuffers,
  }
}

/**
 * Convenience: route to the correct provider(s) based on mode string.
 * Returns { results, buffers } — results is array (single or multi for karma).
 *
 * referenceImage / referenceImageMime are forwarded to providers that support
 * image-to-image input (currently Gemini Flash). When provided, the model uses
 * the reference photo to keep the generated images consistent with the original.
 */
export async function generateByMode(
  mode: 'hizli' | 'dengeli' | 'premium' | 'karma',
  prompts: string[],
  referenceImage?: Buffer,
  referenceImageMime?: string,
): Promise<{ results: ProviderResult[]; buffers: Buffer[] }> {
  switch (mode) {
    case 'dengeli': {
      // Try GPT Image first; fall back to Gemini Flash if OpenAI is unavailable
      const r = await generateWithGPTImage(prompts)
      if (r.buffers.length > 0) return { results: [r], buffers: r.buffers }
      console.warn('[generateByMode] GPT Image failed, falling back to Gemini Flash for dengeli')
      const fallback = await generateWithGeminiFlash(prompts, referenceImage, referenceImageMime)
      return { results: [r, fallback], buffers: fallback.buffers }
    }
    case 'premium': {
      // Gemini Pro / Imagen uses text-only predict endpoint
      const r = await generateWithGeminiPro(prompts)
      return { results: [r], buffers: r.buffers }
    }
    case 'karma': {
      return generateHybridSet(prompts, referenceImage, referenceImageMime)
    }
    case 'hizli':
    default: {
      const r = await generateWithGeminiFlash(prompts, referenceImage, referenceImageMime)
      return { results: [r], buffers: r.buffers }
    }
  }
}
