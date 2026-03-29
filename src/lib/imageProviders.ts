/**
 * imageProviders — Step 24 / Step 25
 *
 * Provider adapter layer for AI image generation.
 *
 * ─── PRIMARY PATH (Step 25 — OpenAI-first, product-preserving) ─────────────
 * generateByEditing()
 *   Step A: validateProductImage()  — reject non-shoe / invalid inputs
 *   Step B: extractIdentityLock()   — build structured identity text block
 *   Step C: 5 slot edits via gpt-image-1 /v1/images/edits (OpenAI only)
 *   Step D: per-slot slotLogs returned for admin inspection
 *
 * Gemini is used ONLY for Vision analysis (validation + identity extraction).
 * Gemini is NOT used as an image generator in the primary path.
 * If Pipeline A (editing) fails → error is returned; no silent Gemini fallback.
 *
 * ─── FALLBACK PATH (no reference image) ────────────────────────────────────
 * Text-to-image generation only when no reference photo exists:
 *   - #hizli   → Gemini Flash
 *   - #dengeli → gpt-image-1 generations
 *   - #premium → Gemini Pro / Imagen 4 Ultra
 *   - #karma   → hybrid across all three
 * Known limitation: text-to-image cannot guarantee exact product reproduction.
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

/** Per-slot execution log — stored in ImageGenerationJob for admin debugging */
export type SlotLog = {
  slot: string           // e.g. 'commerce_front'
  label: string          // e.g. 'Ürün — Ön Görünüm (Stüdyo Hero)'
  provider: string       // 'gpt-image-edit'
  attempts: number       // 1 = first try succeeded, 2 = needed retry
  success: boolean
  outputSizeBytes?: number
  rejectionReason?: string
}

/** Result from pre-generation image validation (Step A) */
export type ValidationResult = {
  valid: boolean
  confidence: 'high' | 'medium' | 'low'
  /** Detected footwear class, e.g. 'sneaker', 'oxford', 'boot' */
  productClass?: string
  /** Human-readable reason if not valid, e.g. 'selfie', 'furniture', 'blurry' */
  rejectionReason?: string
}

/**
 * Structured product identity lock (Step B).
 * promptBlock is injected verbatim into every slot prompt.
 * The structured fields are stored as job metadata.
 */
export type IdentityLock = {
  /** Full formatted text block for injection into slot prompts */
  promptBlock: string
  // ── Structured fields (for metadata / logging) ──
  productClass: string
  mainColor: string
  accentColor?: string
  material: string
  toeShape?: string
  soleProfile?: string
  heelProfile?: string
  closureType?: string
  distinctiveFeatures?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Sleep helper for retry back-off */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─────────────────────────────────────────────────────────────────────────────
// Step A — Input Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uses Gemini Vision to determine whether the image is a valid shoe/footwear
 * product photo. Called BEFORE any generation.
 *
 * Rejection examples: selfie, room interior, landscape, unrelated object,
 * severely blurred image, no visible shoe.
 *
 * On API failure, defaults to valid=true/confidence=low so legitimate requests
 * are not blocked by a transient Vision API error.
 */
export async function validateProductImage(
  imageBuffer: Buffer,
  imageMime: string,
  apiKey: string,
): Promise<ValidationResult> {
  const visionModel = 'gemini-2.5-flash'

  const prompt =
    `You are an image classifier for a shoe e-commerce platform. ` +
    `Analyze this image and determine if it shows a shoe or footwear product as the PRIMARY subject. ` +
    `Respond with a JSON object ONLY — no explanation, no markdown, no code fences. ` +
    `Required fields:\n` +
    `- "valid": true if main subject is a shoe/footwear, false otherwise\n` +
    `- "confidence": "high" if clearly footwear, "medium" if somewhat unclear, "low" if uncertain\n` +
    `- "productClass": footwear type if valid (e.g. "sneaker", "oxford", "boot", "loafer", "sandal", "chelsea boot") — omit if not valid\n` +
    `- "rejectionReason": brief reason if not valid (e.g. "selfie", "room interior", "landscape", "bag not footwear", "no shoe visible", "severely blurred") — omit if valid\n` +
    `VALID examples: sneaker photo, leather oxford on white bg, ankle boot, dress shoe, running shoe closeup.\n` +
    `INVALID examples: person selfie, furniture/room photo, landscape, handbag (not footwear), unrecognizable blur.`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: imageMime, data: imageBuffer.toString('base64') } },
              { text: prompt },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 200 },
        }),
      },
    )

    if (!res.ok) {
      const errText = await res.text()
      console.warn(`[validateProductImage] HTTP ${res.status}: ${errText.slice(0, 200)}`)
      return { valid: true, confidence: 'low', rejectionReason: 'validation API unavailable' }
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      console.warn('[validateProductImage] No text in response — defaulting to valid')
      return { valid: true, confidence: 'low' }
    }

    const parsed = JSON.parse(text.trim()) as {
      valid?: boolean
      confidence?: string
      productClass?: string
      rejectionReason?: string
    }

    const result: ValidationResult = {
      valid: parsed.valid ?? true,
      confidence: (parsed.confidence as 'high' | 'medium' | 'low') ?? 'medium',
      productClass: parsed.productClass,
      rejectionReason: parsed.rejectionReason,
    }

    console.log(
      `[validateProductImage] valid=${result.valid} confidence=${result.confidence}` +
      (result.productClass ? ` class=${result.productClass}` : '') +
      (result.rejectionReason ? ` reason=${result.rejectionReason}` : ''),
    )
    return result
  } catch (err) {
    console.warn('[validateProductImage] error:', err instanceof Error ? err.message : err)
    return { valid: true, confidence: 'low' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step B — Identity Lock Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uses Gemini Vision to extract a structured product identity description from
 * the reference shoe photo. The resulting promptBlock is injected verbatim into
 * every slot prompt so gpt-image-1 cannot drift to a different product.
 *
 * The structured fields (productClass, mainColor, material, etc.) are stored
 * in the job record for admin inspection.
 *
 * Returns null if the Vision API fails; caller should use a minimal fallback.
 */
export async function extractIdentityLock(
  imageBuffer: Buffer,
  imageMime: string,
  apiKey: string,
): Promise<IdentityLock | null> {
  const visionModel = 'gemini-2.5-flash'

  const prompt =
    `You are a product photography specialist. ` +
    `Analyze this shoe photo and extract a precise identity description. ` +
    `Respond with a JSON object ONLY — no explanation, no markdown, no code fences. ` +
    `Required fields:\n` +
    `- "productClass": specific footwear type (e.g. "low-top lace-up sneaker", "wingtip brogue oxford", "chelsea boot", "running shoe")\n` +
    `- "mainColor": primary color of the upper (e.g. "black", "tan brown", "all-white", "navy blue")\n` +
    `- "accentColor": secondary/trim color if visually distinct (e.g. "white rubber sole", "red laces", "gold eyelets") — omit if none\n` +
    `- "material": upper material texture (e.g. "smooth full-grain leather", "nubuck suede", "knit mesh", "canvas")\n` +
    `- "toeShape": one of: "round", "pointed", "square", "almond", "round-almond"\n` +
    `- "soleProfile": (e.g. "flat thin rubber", "chunky lug sole", "stacked leather", "thick EVA foam", "cupsole")\n` +
    `- "heelProfile": (e.g. "flat", "block heel 3cm", "stacked leather 2cm", "wedge")\n` +
    `- "closureType": one of: "lace-up", "slip-on", "buckle-strap", "side-zip", "velcro", "chelsea elastic panel"\n` +
    `- "distinctiveFeatures": comma-separated key details (e.g. "brogue perforations on toe cap and quarters", "contrast white welt stitching", "metallic D-ring hardware", "side brand logo embossed")\n` +
    `Be precise — these values are used to force AI generation to reproduce the EXACT same shoe.`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: imageMime, data: imageBuffer.toString('base64') } },
              { text: prompt },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 500 },
        }),
      },
    )

    if (!res.ok) {
      const errText = await res.text()
      console.warn(`[extractIdentityLock] HTTP ${res.status}: ${errText.slice(0, 200)}`)
      return null
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      console.warn('[extractIdentityLock] No text in response')
      return null
    }

    const p = JSON.parse(text.trim()) as {
      productClass?: string
      mainColor?: string
      accentColor?: string
      material?: string
      toeShape?: string
      soleProfile?: string
      heelProfile?: string
      closureType?: string
      distinctiveFeatures?: string
    }

    const productClass = p.productClass || 'shoe'
    const mainColor    = p.mainColor    || 'as shown'
    const material     = p.material     || 'as shown'

    // Build the structured text block injected into every slot prompt
    const promptBlock = [
      `╔══ PRODUCT IDENTITY LOCK — MUST NOT BE ALTERED ══╗`,
      `PRODUCT CLASS  : ${productClass}`,
      `PRIMARY COLOR  : ${mainColor}`,
      p.accentColor ? `ACCENT COLOR   : ${p.accentColor}` : null,
      `MATERIAL       : ${material}`,
      p.toeShape ? `TOE SHAPE      : ${p.toeShape}` : null,
      p.soleProfile ? `SOLE PROFILE   : ${p.soleProfile}` : null,
      p.heelProfile ? `HEEL PROFILE   : ${p.heelProfile}` : null,
      p.closureType ? `CLOSURE TYPE   : ${p.closureType}` : null,
      p.distinctiveFeatures ? `DETAILS        : ${p.distinctiveFeatures}` : null,
      `╠══ CRITICAL CONSTRAINTS — YOU MUST NEVER ════════╣`,
      `• Change product type or class (must remain: ${productClass})`,
      `• Change color (${mainColor} must stay ${mainColor})`,
      `• Change material from ${material}`,
      `• Add design features not present in the reference photo`,
      `• Remove design features visible in the reference photo`,
      `• Replace with a visually similar but different shoe`,
      `• Invent logos, patterns, or decorative elements`,
      `• Change sole shape, thickness, or color`,
      p.closureType ? `• Change or remove the ${p.closureType} closure system` : null,
      p.distinctiveFeatures ? `• Omit these visible details: ${p.distinctiveFeatures}` : null,
      `╚═════════════════════════════════════════════════╝`,
      ``,
    ].filter(Boolean).join('\n')

    console.log(
      `[extractIdentityLock] ✓ ${productClass} | ${mainColor} | ${material}` +
      (p.closureType ? ` | ${p.closureType}` : '') +
      (p.distinctiveFeatures ? ` | ${p.distinctiveFeatures.slice(0, 60)}` : ''),
    )

    return {
      promptBlock,
      productClass,
      mainColor,
      accentColor: p.accentColor,
      material,
      toeShape: p.toeShape,
      soleProfile: p.soleProfile,
      heelProfile: p.heelProfile,
      closureType: p.closureType,
      distinctiveFeatures: p.distinctiveFeatures,
    }
  } catch (err) {
    console.warn('[extractIdentityLock] error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini Flash (text-to-image, Pipeline B fallback)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gemini Flash (generateContent) — text-to-image generation via Gemini API.
 * Model: gemini-2.5-flash-image (overridable via GEMINI_FLASH_MODEL)
 * FALLBACK PATH ONLY — not used when a reference image is available.
 */
async function callGeminiFlash(
  prompt: string,
  apiKey: string,
  referenceImage?: Buffer,
  referenceImageMime?: string,
): Promise<Buffer | null> {
  const model = process.env.GEMINI_FLASH_MODEL || 'gemini-2.5-flash-image'

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
    const parts: Array<Record<string, unknown>> =
      data?.candidates?.[0]?.content?.parts ?? []

    for (const part of parts) {
      const inline = part?.inlineData as Record<string, string> | undefined
      if (inline?.data) return Buffer.from(inline.data, 'base64')
    }

    console.error('[GeminiFlash] No inlineData in response:', JSON.stringify(data).slice(0, 300))
    return null
  } catch (err) {
    console.error('[GeminiFlash] fetch error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini Pro / Imagen 4 Ultra (text-to-image, Pipeline B fallback)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gemini Pro / Imagen 4 Ultra — highest quality text-to-image.
 * Model: imagen-4.0-ultra-generate-001 (overridable via GEMINI_PRO_MODEL)
 * FALLBACK PATH ONLY — not used when a reference image is available.
 */
async function callGeminiPro(prompt: string, apiKey: string): Promise<Buffer | null> {
  const model = process.env.GEMINI_PRO_MODEL || 'imagen-4.0-ultra-generate-001'

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
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

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI gpt-image-1 text-to-image (Pipeline B fallback)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * OpenAI gpt-image-1 — text-to-image generation (Pipeline B fallback).
 * FALLBACK PATH ONLY — not used in Pipeline A (editing).
 */
async function callGPTImage(prompt: string, apiKey: string): Promise<Buffer | null> {
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, prompt, n: 1, size: '1024x1024', quality: 'low' }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[GPTImage] HTTP ${res.status}: ${errText.slice(0, 200)}`)
      return null
    }

    const data = await res.json()
    const b64: string | undefined = data?.data?.[0]?.b64_json
    if (b64) return Buffer.from(b64, 'base64')

    const url: string | undefined = data?.data?.[0]?.url
    if (url) {
      const imgRes = await fetch(url)
      if (!imgRes.ok) return null
      return Buffer.from(await imgRes.arrayBuffer())
    }

    console.error('[GPTImage] No b64_json or url in response:', JSON.stringify(data).slice(0, 300))
    return null
  } catch (err) {
    console.error('[GPTImage] fetch error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI gpt-image-1 Image Edit (PRIMARY PATH — Pipeline A)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call OpenAI /v1/images/edits with gpt-image-1.
 * Sends the reference photo + a full slot prompt (identity lock + scene instructions).
 * quality: 'medium' for better detail fidelity.
 *
 * Technical note: gpt-image-1 requires "image[]" field name (array syntax).
 * Using "image" (singular) returns 400 "Value must be 'dall-e-2'".
 */
async function callGPTImageEdit(
  pngBuffer: Buffer,
  prompt: string,
  apiKey: string,
): Promise<Buffer | null> {
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'

  try {
    console.log(
      `[GPTImageEdit] POST /v1/images/edits — model=${model} ` +
      `imageSize=${pngBuffer.length}b promptLen=${prompt.length}`,
    )

    const formData = new FormData()
    formData.append('model', model)
    formData.append('prompt', prompt)
    formData.append('n', '1')
    formData.append('size', '1024x1024')
    formData.append('quality', 'medium')
    // gpt-image-1 requires "image[]" (array syntax)
    formData.append('image[]', new Blob([new Uint8Array(pngBuffer)], { type: 'image/png' }), 'product.png')

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[GPTImageEdit] HTTP ${res.status}: ${errText.slice(0, 500)}`)
      return null
    }

    const data = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> }
    const img = data?.data?.[0]

    if (img?.b64_json) {
      const buf = Buffer.from(img.b64_json, 'base64')
      console.log(`[GPTImageEdit] ✓ b64 — ${buf.length}b`)
      return buf
    }
    if (img?.url) {
      const imgRes = await fetch(img.url)
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer())
        console.log(`[GPTImageEdit] ✓ url — ${buf.length}b`)
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
// Pipeline B — public provider functions (text-to-image, fallback only)
// ─────────────────────────────────────────────────────────────────────────────

/** Generate with Gemini Flash. FALLBACK PATH — only when no reference image. */
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
    result.errors.push('GEMINI_API_KEY not set — Gemini Flash skipped')
    console.warn(`[imageProviders] ${result.errors[0]}`)
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
    if (i < prompts.length - 1) await sleep(500)
  }

  console.log(`[GeminiFlash] ${result.successCount}/${result.promptCount} images`)
  return result
}

/** Generate with Gemini Pro / Imagen 4 Ultra. FALLBACK PATH — only when no reference image. */
export async function generateWithGeminiPro(prompts: string[]): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY
  const result: ProviderResult = {
    provider: 'gemini-pro',
    promptCount: prompts.length,
    successCount: 0,
    buffers: [],
    errors: [],
  }

  if (!apiKey) {
    result.errors.push('GEMINI_API_KEY not set — Gemini Pro skipped')
    console.warn(`[imageProviders] ${result.errors[0]}`)
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

  console.log(`[GeminiPro] ${result.successCount}/${result.promptCount} images`)
  return result
}

/** Generate with OpenAI gpt-image-1 (text-to-image). FALLBACK PATH — only when no reference image. */
export async function generateWithGPTImage(prompts: string[]): Promise<ProviderResult> {
  const apiKey = process.env.OPENAI_API_KEY
  const result: ProviderResult = {
    provider: 'gpt-image',
    promptCount: prompts.length,
    successCount: 0,
    buffers: [],
    errors: [],
  }

  if (!apiKey) {
    result.errors.push('OPENAI_API_KEY not set — GPT Image skipped')
    console.warn(`[imageProviders] ${result.errors[0]}`)
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

  console.log(`[GPTImage] ${result.successCount}/${result.promptCount} images`)
  return result
}

/**
 * Hybrid generator for #karma mode. FALLBACK PATH — only when no reference image.
 * Distributes prompts: Gemini Flash [0,1] | GPT Image [2,3] | Gemini Pro [4]
 */
export async function generateHybridSet(
  prompts: string[],
  referenceImage?: Buffer,
  referenceImageMime?: string,
): Promise<{ results: ProviderResult[]; buffers: Buffer[] }> {
  const [flashResult, gptResult, proResult] = await Promise.all([
    generateWithGeminiFlash(prompts.slice(0, 2), referenceImage, referenceImageMime),
    generateWithGPTImage(prompts.slice(2, 4)),
    generateWithGeminiPro(prompts.slice(4)),
  ])

  const mergedBuffers = [
    ...flashResult.buffers,
    ...gptResult.buffers,
    ...proResult.buffers,
  ]

  console.log(
    `[HybridSet] flash=${flashResult.successCount}/${flashResult.promptCount} ` +
    `gpt=${gptResult.successCount}/${gptResult.promptCount} ` +
    `pro=${proResult.successCount}/${proResult.promptCount} ` +
    `total=${mergedBuffers.length}`,
  )
  return { results: [flashResult, gptResult, proResult], buffers: mergedBuffers }
}

/**
 * Route to the correct fallback provider(s) based on mode.
 * FALLBACK PATH ONLY — called when no reference image is available.
 */
export async function generateByMode(
  mode: 'hizli' | 'dengeli' | 'premium' | 'karma',
  prompts: string[],
  referenceImage?: Buffer,
  referenceImageMime?: string,
): Promise<{ results: ProviderResult[]; buffers: Buffer[] }> {
  switch (mode) {
    case 'dengeli': {
      const r = await generateWithGPTImage(prompts)
      if (r.buffers.length > 0) return { results: [r], buffers: r.buffers }
      console.warn('[generateByMode] GPT Image failed, falling back to Gemini Flash for dengeli')
      const fallback = await generateWithGeminiFlash(prompts, referenceImage, referenceImageMime)
      return { results: [r, fallback], buffers: fallback.buffers }
    }
    case 'premium': {
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
// Pipeline A — Step C: 5-Slot Editing Scenes (physically distinct)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Physically distinct slot definitions for gpt-image-1 editing.
 * Each slot specifies: camera position, camera height, framing, required visible parts,
 * background, lighting, style goal, and hard constraints (FORBIDDEN list).
 *
 * These are combined with the identity lock block at generation time.
 * No two slots share the same camera angle or composition class.
 */
const EDITING_SCENES = [
  {
    name: 'commerce_front',
    label: 'Slot 1 — Ön Stüdyo Hero',
    sceneInstructions:
      `── SLOT 1: FRONT STUDIO HERO ──\n` +
      `CAMERA POSITION: Dead-straight front view. Lens axis exactly perpendicular to toe cap. Camera height aligned with lacing zone (mid-shoe).\n` +
      `FRAMING: Shoe upright on sole, centered. Toe faces camera. Full shoe fills 70% of frame height. Top of collar and full sole bottom both visible.\n` +
      `REQUIRED VISIBLE: Entire toe cap, full vamp, lace/closure system, complete front face of upper. Nothing of the side profile or heel counter.\n` +
      `BACKGROUND: Pure seamless white (#ffffff). No texture, no gradient, no surface, no props.\n` +
      `LIGHTING: Large overhead softbox. Bilateral fill panels. Uniform diffused studio light. Soft ground shadow beneath sole only.\n` +
      `STYLE: Standard professional e-commerce hero. Clean, symmetric, centred. No artistic cropping.\n` +
      `FORBIDDEN: Side view, 3/4 angle, tilted shoe, model wearing shoe, any background other than pure white.`,
  },
  {
    name: 'side_angle',
    label: 'Slot 2 — 90° Yan Profil',
    sceneInstructions:
      `── SLOT 2: PURE LATERAL SIDE PROFILE ──\n` +
      `CAMERA POSITION: Exactly 90-degree lateral view (medial or lateral side). Camera at sole level, slightly below the midline, looking directly at the side face of the shoe. NOT front-facing. NOT 45°.\n` +
      `FRAMING: Shoe displayed horizontally — toe pointing LEFT, heel on RIGHT. Full arch curve visible. Entire sole edge from toe to heel in frame. Shoe fills 75% of frame width.\n` +
      `REQUIRED VISIBLE: Complete sole profile, heel counter height, arch curve, collar line, throat line. ZERO toe-cap front face visible — if toe is facing the camera, this is WRONG.\n` +
      `BACKGROUND: Soft warm cream or light neutral grey seamless studio backdrop with subtle gradient.\n` +
      `LIGHTING: Key light from front at 45°, fill from opposite side. No harsh drop shadows. Subtle sole-edge highlight.\n` +
      `STYLE: Technical silhouette shot — heel height, sole thickness, arch profile all clearly readable.\n` +
      `FORBIDDEN: Any angle less than 80° lateral, front hero view, toe facing camera, 3/4 perspective.`,
  },
  {
    name: 'detail_closeup',
    label: 'Slot 3 — Malzeme Makro Detay',
    sceneInstructions:
      `── SLOT 3: MATERIAL MACRO DETAIL ──\n` +
      `CAMERA POSITION: 15–20 cm from the vamp/toe-cap surface. Slightly above, looking down at 20–30°. Macro/close-up focal length.\n` +
      `FRAMING: Upper material fills 85–90% of frame. Very shallow depth of field — toe-cap/vamp area in sharp focus, heel and background dissolve into soft blur.\n` +
      `REQUIRED VISIBLE: Surface grain, weave, or texture of the upper material. Stitching thread relief. Any perforation or embossing pattern. Edge finishing visible on at least one side. The material identity must be unmistakable.\n` +
      `BACKGROUND: Completely blurred out-of-focus neutral bokeh. No identifiable background objects.\n` +
      `LIGHTING: Single directional raking sidelight to reveal surface texture and stitching relief. Subtle specular highlight on the material surface.\n` +
      `STYLE: Luxury product macro — same quality as high-end fashion editorial material shots.\n` +
      `FORBIDDEN: Full shoe in frame, wide-angle shot, plain background without bokeh, no product context.`,
  },
  {
    name: 'tabletop_editorial',
    label: 'Slot 4 — Editoryal Üstten Perspektif',
    sceneInstructions:
      `── SLOT 4: OVERHEAD EDITORIAL ──\n` +
      `CAMERA POSITION: Above and in front of the shoe. Looking DOWN at a 55–65° downward angle. Three-quarter overhead perspective — not directly top-down, not side-on.\n` +
      `FRAMING: Full shoe resting upright on a flat surface, viewed from above-front. Shoe fills 60% of frame. The top face of the shoe (tongue, toe, lace/closure from above) is the primary subject.\n` +
      `REQUIRED VISIBLE: Top face of upper, tongue, toe shape from above, lacing/closure system from above angle. This view reveals parts of the shoe that slots 1 and 2 cannot — it must look clearly different from both.\n` +
      `SURFACE: White Carrara marble with subtle natural grey veining. Shoe rests flat and naturally on the marble. No props, no accessories.\n` +
      `LIGHTING: Soft diffused natural window light from upper-left. Gentle directional shadow lower-right. Clean editorial feel.\n` +
      `STYLE: Scandinavian minimal editorial — clean, considered, magazine-quality.\n` +
      `FORBIDDEN: Front-facing angle (slot 1), pure lateral angle (slot 2), close-up macro (slot 3), no dark or busy backgrounds.`,
  },
  {
    name: 'worn_lifestyle',
    label: 'Slot 5 — Lifestyle Giyilmiş Bağlam',
    sceneInstructions:
      `── SLOT 5: LIFESTYLE WORN CONTEXT ──\n` +
      `CAMERA POSITION: Low ground-level angle. Camera 10–15 cm above the floor, positioned to the side and slightly in front of the foot wearing the shoe.\n` +
      `FRAMING: One foot wearing the shoe — full shoe in frame with lower leg/ankle visible above collar. Ground surface in lower frame area. Shoe fills 65% of frame. Shoe is the hero.\n` +
      `REQUIRED VISIBLE: Full shoe being worn in natural weight-bearing position. Ground surface contact. Lower ankle/leg above collar. The person's identity must NOT be visible (no face, no upper body).\n` +
      `ENVIRONMENT: Warm blurred lifestyle setting — wooden floor, cobblestone path, garden path, or warm interior. Authentic bokeh background. NOT a studio background.\n` +
      `LIGHTING: Warm golden-hour side light or warm indoor ambient. Authentic, non-studio mood lighting.\n` +
      `STYLE: Fashion editorial lifestyle — emotional, real-world context. Aspirational but authentic.\n` +
      `FORBIDDEN: Studio background, floating/unattached shoe, face or upper body visible, product sitting on surface without being worn.`,
  },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline A — generateByEditing (PRIMARY PATH)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PRIMARY GENERATION PATH — Step 25 strict product-preserving pipeline.
 *
 * Sends the reference shoe photo to gpt-image-1 /v1/images/edits with
 * 5 physically distinct slot prompts. Each prompt = identityLockBlock + sceneInstructions.
 * The identity lock block prevents the model from drifting to a different product.
 *
 * @param referenceImage    Raw bytes of the product photo (PNG after sharp conversion)
 * @param referenceImageMime MIME type of the reference photo
 * @param identityLockBlock  Structured text block from extractIdentityLock().
 *   Must be pre-built and passed in — the caller is responsible for extraction.
 *   If extraction failed, pass a minimal fallback block.
 *
 * Returns buffers, results, and per-slot slotLogs for admin inspection.
 * Does NOT fall back to text-to-image — caller is responsible for failure handling.
 */
export async function generateByEditing(
  referenceImage: Buffer,
  referenceImageMime: string,
  identityLockBlock: string,
): Promise<{ results: ProviderResult[]; buffers: Buffer[]; slotLogs: SlotLog[] }> {
  const result: ProviderResult = {
    provider: 'gpt-image-edit',
    promptCount: EDITING_SCENES.length,
    successCount: 0,
    buffers: [],
    errors: [],
  }

  const slotLogs: SlotLog[] = []

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    const msg = 'OPENAI_API_KEY not set — GPT Image Edit cannot run'
    console.warn(`[generateByEditing] ${msg}`)
    result.errors.push(msg)
    return { results: [result], buffers: [], slotLogs }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as typeof import('sharp')
    console.log(
      `[generateByEditing v8] input=${referenceImage.length}b mime=${referenceImageMime} ` +
      `identityBlockLen=${identityLockBlock.length}`,
    )

    // Convert reference photo to PNG 1024×1024 for the edit API.
    // fit:contain keeps full shoe visible; white padding on non-square photos.
    const pngBuffer = await sharp(referenceImage)
      .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer()
    console.log(`[generateByEditing v8] PNG ready — ${pngBuffer.length}b`)

    // Process each scene slot sequentially with one retry on failure
    for (const scene of EDITING_SCENES) {
      // Full prompt = structured identity lock + physically distinct scene instructions
      const fullPrompt = identityLockBlock + scene.sceneInstructions

      const slotLog: SlotLog = {
        slot: scene.name,
        label: scene.label,
        provider: 'gpt-image-edit',
        attempts: 0,
        success: false,
      }

      let buf: Buffer | null = null
      for (let attempt = 0; attempt < 2; attempt++) {
        slotLog.attempts = attempt + 1
        if (attempt > 0) {
          console.log(`[generateByEditing v8] retry ${scene.name} (attempt ${attempt + 1})...`)
          await sleep(2000)
        }
        try {
          buf = await callGPTImageEdit(pngBuffer, fullPrompt, apiKey)
          if (buf) break
        } catch (callErr) {
          console.warn(
            `[generateByEditing v8] attempt ${attempt + 1} error for ${scene.name}:`,
            callErr instanceof Error ? callErr.message : callErr,
          )
        }
      }

      if (buf) {
        const jpegBuf = await sharp(buf).jpeg({ quality: 92 }).toBuffer()
        result.buffers.push(jpegBuf)
        result.successCount++
        slotLog.success = true
        slotLog.outputSizeBytes = jpegBuf.length
        console.log(`[generateByEditing v8] ✓ ${scene.name} — ${jpegBuf.length}b (attempts=${slotLog.attempts})`)
      } else {
        const msg = `${scene.name}: null after ${slotLog.attempts} attempts`
        result.errors.push(msg)
        slotLog.success = false
        slotLog.rejectionReason = `GPT Image Edit returned null after ${slotLog.attempts} attempts`
        console.warn(`[generateByEditing v8] ✗ ${msg}`)
      }

      slotLogs.push(slotLog)

      // Rate-limit guard between slots
      await sleep(1000)
    }
  } catch (err) {
    const msg = `Pipeline A fatal: ${err instanceof Error ? err.message : err}`
    console.error(`[generateByEditing v8] ${msg}`)
    result.errors.push(msg)
  }

  console.log(
    `[generateByEditing v8] done — ${result.successCount}/${result.promptCount} slots ` +
    `[${slotLogs.map((s) => (s.success ? '✓' : '✗')).join('')}]`,
  )
  return { results: [result], buffers: result.buffers, slotLogs }
}
