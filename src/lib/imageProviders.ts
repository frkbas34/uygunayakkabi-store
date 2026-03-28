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
        quality: 'low',
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
// Pipeline A: Multi-Background Compositing
//
// Takes the original product photo and produces 5 versions on different
// solid-colour backgrounds using sharp's fit:contain.
//
// fit:contain centers the photo within 1024×1024, filling remaining space
// with the target background colour — so every pixel of the product photo
// is preserved exactly as shot. No AI generation. No background removal
// required. Works on any photo regardless of original background.
//
// For photos on near-white backgrounds an optional flood-fill step is
// attempted first to produce a cleaner cutout; it is skipped automatically
// when the background is complex/coloured.
// ─────────────────────────────────────────────────────────────────────────────

/** Target backgrounds for Pipeline A — 5 distinct colour variants */
const COMPOSITE_BACKGROUNDS = [
  { name: 'commerce_front',     r: 255, g: 255, b: 255, label: 'white studio' },
  { name: 'side_angle',         r: 244, g: 241, b: 236, label: 'warm cream' },
  { name: 'detail_closeup',     r: 32,  g: 34,  b: 38,  label: 'dark charcoal' },
  { name: 'tabletop_editorial', r: 218, g: 214, b: 208, label: 'soft warm grey' },
  { name: 'worn_lifestyle',     r: 236, g: 227, b: 212, label: 'sand' },
] as const

/**
 * Remove the background from a PNG by flood-filling from the 4 corners.
 * Pixels colour-close to the detected background become transparent.
 *
 * Bug fixes vs naive implementation:
 *  1. Uses Buffer.from(data) — not data.buffer — because Node.js Buffers may
 *     share a pool ArrayBuffer; data.buffer is oversized and starts at wrong offset.
 *  2. Uses an index pointer (qHead) instead of queue.shift() — shift() is O(n),
 *     making BFS O(n²) for 1M pixel images. Pointer approach is O(n).
 */
async function removeBackground(pngBuffer: Buffer, threshold = 40): Promise<Buffer> {
  const sharp = (await import('sharp')).default

  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // ── CRITICAL: copy into a fresh Buffer (not data.buffer which may be oversized)
  const pixels = Buffer.from(data)
  const { width, height } = info

  // ── Detect background colour from 4 corners ───────────────────────────────
  const px = (idx: number) => ({
    r: pixels[idx * 4],
    g: pixels[idx * 4 + 1],
    b: pixels[idx * 4 + 2],
  })
  const corners = [
    px(0),
    px(width - 1),
    px((height - 1) * width),
    px((height - 1) * width + (width - 1)),
  ]
  const bg = {
    r: Math.round(corners.reduce((s, c) => s + c.r, 0) / 4),
    g: Math.round(corners.reduce((s, c) => s + c.g, 0) / 4),
    b: Math.round(corners.reduce((s, c) => s + c.b, 0) / 4),
  }
  console.log(`[bgRemoval] detected bg rgb(${bg.r},${bg.g},${bg.b}) threshold=${threshold}`)

  // ── Flood-fill BFS — O(n) with index pointer (NOT shift() which is O(n²)) ──
  const visited = new Uint8Array(width * height)
  const queue: number[] = []
  let qHead = 0

  const seed = (idx: number) => {
    if (!visited[idx]) {
      visited[idx] = 1
      queue.push(idx)
    }
  }
  seed(0)
  seed(width - 1)
  seed((height - 1) * width)
  seed((height - 1) * width + (width - 1))

  while (qHead < queue.length) {
    const idx = queue[qHead++]
    const i = idx * 4
    const dr = pixels[i]     - bg.r
    const dg = pixels[i + 1] - bg.g
    const db = pixels[i + 2] - bg.b
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)

    if (dist < threshold) {
      pixels[i + 3] = 0  // make transparent

      const x = idx % width
      const y = Math.floor(idx / width)
      if (x > 0)          seed(idx - 1)
      if (x < width - 1)  seed(idx + 1)
      if (y > 0)          seed(idx - width)
      if (y < height - 1) seed(idx + width)
    }
  }

  console.log(`[bgRemoval] flood-fill done — visited=${qHead} pixels`)

  // ── CRITICAL: pass pixels directly (it's already the right Buffer) ────────
  return sharp(pixels, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer()
}

/** Composite a transparent-bg product cutout onto a solid background colour */
async function compositeOnBackground(
  cutout: Buffer,
  r: number, g: number, b: number,
): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  const meta = await sharp(cutout).metadata()
  const w = meta.width  ?? 1024
  const h = meta.height ?? 1024

  return sharp({
    create: { width: w, height: h, channels: 4, background: { r, g, b, alpha: 1 } },
  })
    .composite([{ input: cutout, blend: 'over' }])
    .jpeg({ quality: 92 })
    .toBuffer()
}

/**
 * @deprecated  AI editing APIs cannot guarantee exact product preservation.
 *              Pipeline A now uses background removal + compositing instead.
 *              This function is kept only as a reference stub.
 */
async function callGPTImageEdit(
  pngBuffer: Buffer,
  _pngMime: string,
  prompt: string,
  apiKey: string,
): Promise<Buffer | null> {
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'

  try {
    console.log(`[GPTImageEdit] calling /v1/images/edits — model=${model} imageSize=${pngBuffer.length} promptLen=${prompt.length}`)

    // Build multipart form data — gpt-image-1 requires "image[]" field name
    const formData = new FormData()
    formData.append('model', model)
    formData.append('prompt', prompt)
    formData.append('n', '1')
    formData.append('size', '1024x1024')
    formData.append('quality', 'low')

    // gpt-image-1 uses "image[]" (array syntax), dall-e-2 uses "image"
    const imageBlob = new Blob([new Uint8Array(pngBuffer)], { type: 'image/png' })
    formData.append('image[]', imageBlob, 'product.png')

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[GPTImageEdit] HTTP ${res.status}: ${errText.slice(0, 500)}`)
      return null
    }

    const data = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>
    }

    // Try b64_json first, then url
    const img = data?.data?.[0]
    if (img?.b64_json) {
      const buf = Buffer.from(img.b64_json, 'base64')
      console.log(`[GPTImageEdit] success (b64) — output size=${buf.length}`)
      return buf
    }
    if (img?.url) {
      console.log(`[GPTImageEdit] got URL response, fetching image...`)
      const imgRes = await fetch(img.url)
      if (imgRes.ok) {
        const arrBuf = await imgRes.arrayBuffer()
        const buf = Buffer.from(arrBuf)
        console.log(`[GPTImageEdit] success (url) — output size=${buf.length}`)
        return buf
      }
    }

    console.error('[GPTImageEdit] No image in response:', JSON.stringify(data).slice(0, 500))
    return null
  } catch (err) {
    console.error('[GPTImageEdit] fetch error:', err instanceof Error ? err.message : err)
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

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline A: generateByEditing — background removal + compositing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate images by placing the exact reference product photo onto
 * 5 different solid-colour backgrounds using sharp's fit:contain.
 *
 * This guarantees 100% product pixel fidelity — the product is NEVER
 * regenerated by AI. The original photo is centered within a 1024×1024
 * canvas filled with the target background colour, with letterbox/pillarbox
 * padding if the aspect ratio doesn't match. Works on ANY photo type —
 * solid studio backgrounds, lifestyle shots, stone floors, etc.
 *
 * Steps:
 *  1. For each of 5 target backgrounds, resize input to 1024×1024 (contain)
 *     with the target colour as padding, flatten alpha, export as JPEG
 *  2. Return all 5 JPEG buffers ready for upload
 */
export async function generateByEditing(
  referenceImage: Buffer,
  referenceImageMime: string,
): Promise<{ results: ProviderResult[]; buffers: Buffer[] }> {
  const result: ProviderResult = {
    provider: 'background-composite',
    promptCount: COMPOSITE_BACKGROUNDS.length,
    successCount: 0,
    buffers: [],
    errors: [],
  }

  try {
    const sharp = (await import('sharp')).default
    console.log(`[generateByEditing v3] input size=${referenceImage.length} mime=${referenceImageMime}`)

    // ── Step 1: Scale shoe to fit within 800×800 (no background added yet) ───
    // Using fit:'inside' so we get the exact shoe dimensions, then we manually
    // center it on a 1024×1024 canvas. This guarantees at least 112px of
    // background colour is visible on every side regardless of the photo's
    // aspect ratio — even for perfectly square photos.
    const shoeBuffer = await sharp(referenceImage)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: false })
      .toBuffer()

    const shoeMeta = await sharp(shoeBuffer).metadata()
    const shoeW = shoeMeta.width ?? 800
    const shoeH = shoeMeta.height ?? 800
    console.log(`[generateByEditing v3] shoe scaled to ${shoeW}×${shoeH}`)

    // Padding needed on each side to centre within 1024×1024
    const padLeft   = Math.floor((1024 - shoeW) / 2)
    const padRight  = 1024 - shoeW - padLeft
    const padTop    = Math.floor((1024 - shoeH) / 2)
    const padBottom = 1024 - shoeH - padTop

    const composites = await Promise.all(
      COMPOSITE_BACKGROUNDS.map(({ name, r, g, b, label }) =>
        sharp(shoeBuffer)
          .extend({ top: padTop, bottom: padBottom, left: padLeft, right: padRight,
                    background: { r, g, b, alpha: 1 } })
          .flatten({ background: { r, g, b } })
          .jpeg({ quality: 92 })
          .toBuffer()
          .then((buf) => {
            console.log(`[generateByEditing v3] ✓ ${name} (${label}) — ${buf.length} bytes`)
            return buf
          })
          .catch((err) => {
            const msg = `${name}: ${err instanceof Error ? err.message : err}`
            console.error(`[generateByEditing v3] ✗ ${msg}`)
            result.errors.push(msg)
            return null as Buffer | null
          }),
      ),
    )

    for (const buf of composites) {
      if (buf) {
        result.buffers.push(buf)
        result.successCount++
      }
    }
  } catch (err) {
    const msg = `Pipeline A fatal: ${err instanceof Error ? err.message : err}`
    console.error(`[generateByEditing] ${msg}`)
    result.errors.push(msg)
  }

  console.log(`[generateByEditing v3] done — ${result.successCount}/${result.promptCount} images`)
  return { results: [result], buffers: result.buffers }
}
