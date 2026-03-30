/**
 * imageProviders — Step 25 v9
 *
 * STRICT OPENAI-ONLY product-preserving image generation.
 *
 * ALL modes (#gorsel, #hizli, #dengeli, #premium) route to the SAME pipeline:
 *   Step A: validateProductImage()   — Gemini Vision: reject non-shoe inputs
 *   Step B: extractIdentityLock()    — Gemini Vision: structured 10-field identity
 *   Step C: generateByEditing()      — OpenAI gpt-image-1 /v1/images/edits × 5 slots
 *   Step D: checkColorMatch()        — Gemini Vision: per-slot color fidelity check
 *
 * Gemini is used ONLY for analysis (validation, identity extraction, color checking).
 * Gemini NEVER generates final product images.
 * If editing fails → hard fail. No text-to-image fallback. No Gemini generation.
 * If color drifts (black→brown) → slot marked REJECTED, retry once with reinforced prompt.
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
  slot: string
  label: string
  provider: string
  attempts: number        // 1 = first try, 2 = retried
  success: boolean
  outputSizeBytes?: number
  colorCheckPass?: boolean
  detectedColor?: string
  rejectionReason?: string
}

/** Result from pre-generation image validation (Step A) */
export type ValidationResult = {
  valid: boolean
  confidence: 'high' | 'medium' | 'low'
  productClass?: string
  rejectionReason?: string
}

/**
 * Structured product identity lock (Step B).
 * promptBlock is injected into every slot prompt.
 * Structured fields stored as job metadata + used for color checking.
 */
export type IdentityLock = {
  promptBlock: string
  productClass: string
  mainColor: string
  accentColor?: string
  material: string
  toeShape?: string
  soleProfile?: string
  heelProfile?: string
  closureType?: string
  distinctiveFeatures?: string
  /** Camera angle detected in the reference photo, e.g. "45° front-left" */
  referenceAngle?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─────────────────────────────────────────────────────────────────────────────
// Step A — Input Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uses Gemini Vision to check if the image is a valid shoe/footwear product photo.
 * On API failure: defaults to valid=true (don't block legitimate requests).
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
    `- "productClass": footwear type if valid (e.g. "sneaker", "oxford", "boot", "loafer")\n` +
    `- "rejectionReason": brief reason if not valid (e.g. "selfie", "room interior", "no shoe visible")\n`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inlineData: { mimeType: imageMime, data: imageBuffer.toString('base64') } },
            { text: prompt },
          ] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 200 },
        }),
      },
    )

    if (!res.ok) {
      console.warn(`[validateProductImage] HTTP ${res.status}`)
      return { valid: true, confidence: 'low', rejectionReason: 'validation API unavailable' }
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { valid: true, confidence: 'low' }

    const parsed = JSON.parse(text.trim())
    const result: ValidationResult = {
      valid: parsed.valid ?? true,
      confidence: parsed.confidence ?? 'medium',
      productClass: parsed.productClass,
      rejectionReason: parsed.rejectionReason,
    }
    console.log(`[validateProductImage] valid=${result.valid} confidence=${result.confidence} class=${result.productClass || '-'}`)
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
 * Uses Gemini Vision to extract a 10-field structured identity from the reference
 * shoe photo, including the detected camera angle of the reference.
 * Returns null on failure; caller should use a minimal fallback.
 */
export async function extractIdentityLock(
  imageBuffer: Buffer,
  imageMime: string,
  apiKey: string,
): Promise<IdentityLock | null> {
  const visionModel = 'gemini-2.5-flash'

  const prompt =
    `You are a product photography expert. Analyze this shoe photo and extract a precise identity description. ` +
    `Respond with a JSON object ONLY — no explanation, no markdown, no code fences. Required fields:\n` +
    `- "productClass": specific type (e.g. "low-top lace-up sneaker", "wingtip brogue oxford", "chelsea boot")\n` +
    `- "mainColor": primary color of the upper — be EXACT (e.g. "black", "tan brown", "all-white", "navy blue")\n` +
    `- "accentColor": secondary color if distinct (e.g. "white sole", "red laces") — omit if none\n` +
    `- "material": upper material (e.g. "smooth full-grain leather", "nubuck suede", "knit mesh")\n` +
    `- "toeShape": one of "round", "pointed", "square", "almond"\n` +
    `- "soleProfile": (e.g. "flat thin rubber", "chunky lug sole", "stacked leather heel")\n` +
    `- "heelProfile": (e.g. "flat", "block heel 3cm", "stacked 2cm")\n` +
    `- "closureType": (e.g. "lace-up", "slip-on", "side-zip", "chelsea elastic")\n` +
    `- "distinctiveFeatures": comma-separated details (e.g. "brogue perforations, contrast stitching")\n` +
    `- "referenceAngle": the camera angle in THIS photo (e.g. "45° front-left", "straight front", "overhead", "side profile")\n` +
    `Be extremely precise on color — black vs brown vs tan matters enormously.`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inlineData: { mimeType: imageMime, data: imageBuffer.toString('base64') } },
            { text: prompt },
          ] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 500 },
        }),
      },
    )

    if (!res.ok) {
      console.warn(`[extractIdentityLock] HTTP ${res.status}`)
      return null
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return null

    const p = JSON.parse(text.trim())
    const productClass = p.productClass || 'shoe'
    const mainColor    = p.mainColor    || 'as shown'
    const material     = p.material     || 'as shown'
    const refAngle     = p.referenceAngle || 'unknown angle'

    // Build structured prompt block with aggressive color locking
    const promptBlock = [
      `═══ PRODUCT IDENTITY LOCK ═══`,
      `Product  : ${productClass}`,
      `Color    : ${mainColor}` + (p.accentColor ? ` (accent: ${p.accentColor})` : ''),
      `Material : ${material}`,
      p.toeShape ?      `Toe      : ${p.toeShape}` : null,
      p.soleProfile ?   `Sole     : ${p.soleProfile}` : null,
      p.heelProfile ?   `Heel     : ${p.heelProfile}` : null,
      p.closureType ?   `Closure  : ${p.closureType}` : null,
      p.distinctiveFeatures ? `Details  : ${p.distinctiveFeatures}` : null,
      ``,
      `COLOR LOCK: This shoe is ${mainColor.toUpperCase()}. Output MUST be ${mainColor.toUpperCase()}.`,
      `If you generate a shoe in a different color, the output is WRONG and will be rejected.`,
      ``,
      `NEVER DO ANY OF THESE:`,
      `• Change the color (${mainColor} must stay ${mainColor} — not darker, not lighter, not a different hue)`,
      `• Change material from ${material}`,
      `• Change product type from ${productClass}`,
      `• Add or remove design features`,
      `• Replace with a similar but different shoe`,
      `• Invent logos, patterns, or decorative elements`,
      `• Change sole shape or thickness`,
      p.closureType ? `• Change the ${p.closureType} closure` : null,
      ``,
      `REFERENCE ANGLE: The reference photo was taken from ${refAngle}.`,
      `DO NOT simply reproduce this same angle. Generate the specific angle requested below.`,
      `═══════════════════════════`,
      ``,
    ].filter(Boolean).join('\n')

    console.log(`[extractIdentityLock] ✓ ${productClass} | ${mainColor} | ${material} | ref=${refAngle}`)

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
      referenceAngle: refAngle,
    }
  } catch (err) {
    console.warn('[extractIdentityLock] error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step D — Per-Slot Color Check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quick Gemini Vision check: does the generated shoe match the expected color?
 * Returns { match, detectedColor }.
 * On failure: defaults to match=true (don't reject on transient API error).
 */
async function checkColorMatch(
  generatedImage: Buffer,
  expectedColor: string,
  apiKey: string,
): Promise<{ match: boolean; detectedColor: string }> {
  const visionModel = 'gemini-2.5-flash'

  const prompt =
    `What is the PRIMARY color of the shoe in this image? ` +
    `Reply JSON only: {"detectedColor": "...", "match": true/false}\n` +
    `Expected color: ${expectedColor}\n` +
    `"match" = true if the shoe color is clearly "${expectedColor}" or very close. ` +
    `"match" = false if the shoe is a noticeably different color (e.g. expected "black" but shoe is brown/tan/grey).`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inlineData: { mimeType: 'image/jpeg', data: generatedImage.toString('base64') } },
            { text: prompt },
          ] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 100 },
        }),
      },
    )

    if (!res.ok) {
      console.warn(`[checkColorMatch] HTTP ${res.status}`)
      return { match: true, detectedColor: 'unknown' }
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { match: true, detectedColor: 'unknown' }

    const parsed = JSON.parse(text.trim())
    const result = {
      match: parsed.match ?? true,
      detectedColor: parsed.detectedColor || 'unknown',
    }
    console.log(`[checkColorMatch] expected=${expectedColor} detected=${result.detectedColor} match=${result.match}`)
    return result
  } catch (err) {
    console.warn('[checkColorMatch] error:', err instanceof Error ? err.message : err)
    return { match: true, detectedColor: 'unknown' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI gpt-image-1 Image Edit (the ONLY image generator)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call OpenAI /v1/images/edits with gpt-image-1.
 * quality: 'medium'. Requires "image[]" field name.
 */
async function callGPTImageEdit(
  pngBuffer: Buffer,
  prompt: string,
  apiKey: string,
): Promise<Buffer | null> {
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'

  try {
    console.log(`[GPTImageEdit] POST /v1/images/edits — promptLen=${prompt.length}`)

    const formData = new FormData()
    formData.append('model', model)
    formData.append('prompt', prompt)
    formData.append('n', '1')
    formData.append('size', '1024x1024')
    formData.append('quality', 'medium')
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
      console.log(`[GPTImageEdit] ✓ ${buf.length}b`)
      return buf
    }
    if (img?.url) {
      const imgRes = await fetch(img.url)
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer())
        console.log(`[GPTImageEdit] ✓ ${buf.length}b`)
        return buf
      }
    }

    console.error('[GPTImageEdit] No image in response')
    return null
  } catch (err) {
    console.error('[GPTImageEdit] error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5-Slot Editing Scenes — v9 (aggressive physical separation + color lock)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Each slot is defined by exact camera axis, height, framing, required visible parts,
 * a FORBIDDEN list, and a slot-specific note about what distinguishes it from the others.
 *
 * The "{COLOR}" placeholder is replaced at runtime with the identity lock's mainColor.
 * The "{REF_ANGLE}" placeholder is replaced with the detected reference angle.
 */
const EDITING_SCENES = [
  {
    name: 'commerce_front',
    label: 'Slot 1 — Ön Stüdyo Hero',
    sceneInstructions:
      `── SHOT: FRONT STUDIO HERO ──\n` +
      `Create a new product photo of this EXACT {COLOR} shoe.\n` +
      `CAMERA: Directly in front of the shoe, lens perpendicular to the toe cap, at mid-shoe height (lacing zone).\n` +
      `POSITION: Shoe upright on sole, centered, toe cap facing camera dead-on. Both sides equally visible (symmetric).\n` +
      `FRAME: Full shoe, 70% of frame height. Top of collar and sole bottom both visible.\n` +
      `MUST SEE: Toe cap front face, vamp, lace/closure system, collar — the entire FRONT face.\n` +
      `MUST NOT SEE: Heel counter, side profile, sole edge.\n` +
      `BACKGROUND: Pure white (#fff). No texture, no gradient, no surface.\n` +
      `LIGHT: Overhead softbox + bilateral fill. Soft ground shadow only.\n` +
      `THIS IS NOT: a side view, a 3/4 view, a lifestyle shot, a close-up.\n` +
      `COLOR: The shoe is {COLOR}. Output MUST be {COLOR}. Other colors = REJECTED.\n` +
      `DO NOT repeat the reference angle ({REF_ANGLE}). Generate a clean front hero.`,
  },
  {
    name: 'side_angle',
    label: 'Slot 2 — 90° Yan Profil',
    sceneInstructions:
      `── SHOT: PURE LATERAL SIDE PROFILE ──\n` +
      `Create a new product photo of this EXACT {COLOR} shoe.\n` +
      `CAMERA: Exactly 90° to the side (medial or lateral), at sole level. Looking directly at the side face.\n` +
      `POSITION: Shoe horizontal — toe pointing LEFT, heel on RIGHT.\n` +
      `FRAME: Full shoe from toe tip to heel counter. Entire sole edge visible. Shoe fills 75% of width.\n` +
      `MUST SEE: Complete sole profile (toe to heel), arch curve, heel counter height, collar line. The sole silhouette is the dominant visual.\n` +
      `MUST NOT SEE: Toe cap front face (if you can see the front of the toe, the angle is WRONG).\n` +
      `BACKGROUND: Soft cream seamless.\n` +
      `LIGHT: Key from front-left 45°, fill from opposite. Subtle sole-edge highlight.\n` +
      `THIS IS NOT: a front view, a 3/4 view, a top-down view.\n` +
      `COLOR: The shoe is {COLOR}. Output MUST be {COLOR}. Other colors = REJECTED.\n` +
      `DO NOT repeat the reference angle ({REF_ANGLE}). Generate a pure side profile.`,
  },
  {
    name: 'detail_closeup',
    label: 'Slot 3 — Malzeme Makro',
    sceneInstructions:
      `── SHOT: MATERIAL MACRO CLOSE-UP ──\n` +
      `Create a new close-up photo of this EXACT {COLOR} shoe's material.\n` +
      `CAMERA: 15–20 cm from the vamp/toe-cap surface. Slightly above, 20–30° down. Macro focal length.\n` +
      `FRAME: Upper material fills 85–90% of frame. Very shallow depth of field. Toe area sharp, heel blurred.\n` +
      `MUST SEE: Surface grain/texture/weave of the upper, stitching thread relief, any perforation or embossing.\n` +
      `MUST NOT SEE: The full shoe. If the entire shoe is visible, the framing is WRONG.\n` +
      `BACKGROUND: Blurred neutral bokeh. No identifiable objects.\n` +
      `LIGHT: Single raking sidelight to reveal texture relief. Subtle specular highlight.\n` +
      `THIS IS NOT: a full-shoe shot, a side profile, an editorial placement.\n` +
      `COLOR: The shoe is {COLOR}. Output MUST be {COLOR}. Other colors = REJECTED.`,
  },
  {
    name: 'tabletop_editorial',
    label: 'Slot 4 — Editoryal Üstten',
    sceneInstructions:
      `── SHOT: OVERHEAD EDITORIAL ──\n` +
      `Create a new editorial photo of this EXACT {COLOR} shoe from above.\n` +
      `CAMERA: Above and in front, looking DOWN at 55–65°. Three-quarter overhead perspective.\n` +
      `POSITION: Shoe resting upright on flat marble surface.\n` +
      `FRAME: Full shoe visible from above-front. Top face dominant (tongue, lacing from above, toe from overhead). Shoe fills 60% of frame.\n` +
      `MUST SEE: Tongue, lace pattern from above, toe shape from overhead, upper opening. This reveals parts invisible in front/side views.\n` +
      `MUST NOT SEE: The front face of the toe (that's slot 1), the side profile (that's slot 2).\n` +
      `SURFACE: White Carrara marble with subtle grey veining. No props.\n` +
      `LIGHT: Diffused window light from upper-left. Gentle shadow lower-right.\n` +
      `THIS IS NOT: a front hero, a side profile, a close-up macro.\n` +
      `COLOR: The shoe is {COLOR}. Output MUST be {COLOR}. Other colors = REJECTED.\n` +
      `DO NOT repeat the reference angle ({REF_ANGLE}). Generate an overhead editorial.`,
  },
  {
    name: 'worn_lifestyle',
    label: 'Slot 5 — Lifestyle Giyilmiş',
    sceneInstructions:
      `── SHOT: LIFESTYLE — SHOE WORN ON A FOOT ──\n` +
      `Create a lifestyle photo showing this EXACT {COLOR} shoe being WORN on a human foot.\n` +
      `CAMERA: Low ground level, 10–15 cm above floor, to the side of the foot.\n` +
      `FRAME: One foot wearing the shoe. Full shoe visible with lower leg/ankle above collar. Ground surface in lower frame. Shoe fills 65% of frame.\n` +
      `MUST SEE: The shoe ON a foot in natural weight-bearing position, ground contact, ankle/lower leg.\n` +
      `MUST NOT SEE: Face, upper body. The shoe is the hero — the person is secondary.\n` +
      `ENVIRONMENT: Warm blurred lifestyle setting — wooden floor, cobblestone, or garden. Bokeh background.\n` +
      `LIGHT: Warm golden-hour side light. Authentic, non-studio.\n` +
      `THIS IS NOT: an isolated product shot, a studio photo, an overhead view.\n` +
      `COLOR: The shoe is {COLOR}. Output MUST be {COLOR}. Other colors = REJECTED.\n` +
      `DO NOT repeat the reference angle ({REF_ANGLE}). Generate a lifestyle worn shot.`,
  },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline A — generateByEditing (THE ONLY generation path)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * STRICT OpenAI-only generation pipeline.
 *
 * For each selected slot:
 *   1. Generate with gpt-image-1 /v1/images/edits
 *   2. Check color match via Gemini Vision
 *   3. If color drifted → retry once with reinforced color prompt
 *   4. Record slotLog
 *
 * Reference image is resized to 768×768 then padded to 1024×1024 (128px white border)
 * to give the model visual room for recomposition.
 *
 * @param referenceImage    Raw bytes of the product photo
 * @param referenceImageMime MIME type
 * @param identityLock      Full IdentityLock object from extractIdentityLock()
 * @param sceneIndices      Which EDITING_SCENES indices to run (0-based). Default: all 5.
 *                          Stage 1 (standard): [0, 1, 2]  — front, side, macro
 *                          Stage 2 (premium):  [3, 4]     — editorial, lifestyle
 */
export async function generateByEditing(
  referenceImage: Buffer,
  referenceImageMime: string,
  identityLock: IdentityLock,
  sceneIndices?: number[],
): Promise<{ results: ProviderResult[]; buffers: Buffer[]; slotLogs: SlotLog[] }> {
  // Filter scenes to run — default is all 5
  const scenes = sceneIndices
    ? EDITING_SCENES.filter((_, i) => sceneIndices.includes(i))
    : [...EDITING_SCENES]

  const result: ProviderResult = {
    provider: 'gpt-image-edit',
    promptCount: scenes.length,
    successCount: 0,
    buffers: [],
    errors: [],
  }

  const slotLogs: SlotLog[] = []
  const geminiKey = process.env.GEMINI_API_KEY

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    const msg = 'OPENAI_API_KEY not set — generation impossible'
    console.error(`[generateByEditing] ${msg}`)
    result.errors.push(msg)
    return { results: [result], buffers: [], slotLogs }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as typeof import('sharp')
    console.log(
      `[generateByEditing v10] input=${referenceImage.length}b ` +
      `color=${identityLock.mainColor} refAngle=${identityLock.referenceAngle || '?'} ` +
      `scenes=${scenes.map((s) => s.name).join(',')}`,
    )

    // Resize shoe to 768×768 (fit:contain with white bg) then pad to 1024×1024.
    // This guarantees at least 128px white border on all sides, giving the model
    // visual room for recomposition even on square photos.
    const innerBuffer = await sharp(referenceImage)
      .resize(768, 768, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer()

    const pngBuffer = await sharp(innerBuffer)
      .extend({
        top: 128, bottom: 128, left: 128, right: 128,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer()

    console.log(`[generateByEditing v10] PNG 1024×1024 ready — ${pngBuffer.length}b (shoe at 768×768 center)`)

    const mainColor = identityLock.mainColor
    const refAngle  = identityLock.referenceAngle || 'unknown'

    for (const scene of scenes) {
      // Replace placeholders in scene instructions
      const sceneText = scene.sceneInstructions
        .replace(/\{COLOR\}/g, mainColor)
        .replace(/\{REF_ANGLE\}/g, refAngle)

      const fullPrompt = identityLock.promptBlock + sceneText

      const slotLog: SlotLog = {
        slot: scene.name,
        label: scene.label,
        provider: 'gpt-image-edit',
        attempts: 0,
        success: false,
      }

      let finalBuf: Buffer | null = null

      // Attempt 1: generate
      slotLog.attempts = 1
      let rawBuf = await callGPTImageEdit(pngBuffer, fullPrompt, apiKey)

      if (rawBuf) {
        const jpegBuf = await sharp(rawBuf).jpeg({ quality: 92 }).toBuffer()

        // Color check (only if Gemini API key available)
        if (geminiKey) {
          const colorCheck = await checkColorMatch(jpegBuf, mainColor, geminiKey)
          slotLog.colorCheckPass = colorCheck.match
          slotLog.detectedColor = colorCheck.detectedColor

          if (!colorCheck.match) {
            // Color drifted — retry with reinforced color prompt
            console.warn(
              `[generateByEditing v10] ✗ ${scene.name} color drift: ` +
              `expected=${mainColor} detected=${colorCheck.detectedColor} — retrying`,
            )
            slotLog.attempts = 2
            await sleep(2000)

            const reinforcedPrompt =
              `CRITICAL COLOR CORRECTION: The previous output was ${colorCheck.detectedColor} but the shoe MUST be ${mainColor}. ` +
              `This is a ${mainColor} shoe. Generate a ${mainColor} shoe. ${colorCheck.detectedColor} is WRONG.\n\n` +
              fullPrompt

            rawBuf = await callGPTImageEdit(pngBuffer, reinforcedPrompt, apiKey)
            if (rawBuf) {
              const retryJpeg = await sharp(rawBuf).jpeg({ quality: 92 }).toBuffer()
              // Check retry color
              const retryCheck = await checkColorMatch(retryJpeg, mainColor, geminiKey)
              slotLog.colorCheckPass = retryCheck.match
              slotLog.detectedColor = retryCheck.detectedColor

              if (retryCheck.match) {
                console.log(`[generateByEditing v10] ✓ ${scene.name} retry fixed color`)
                finalBuf = retryJpeg
              } else {
                console.warn(`[generateByEditing v10] ✗ ${scene.name} retry still wrong color: ${retryCheck.detectedColor}`)
                slotLog.rejectionReason = `Color drift: expected ${mainColor}, got ${retryCheck.detectedColor} after retry`
                // Still include the image but mark it as color-drifted
                finalBuf = retryJpeg
              }
            }
          } else {
            // Color matched on first try
            finalBuf = jpegBuf
          }
        } else {
          // No Gemini key — skip color check, accept the image
          finalBuf = jpegBuf
        }
      } else {
        // Generation returned null — retry once
        console.warn(`[generateByEditing v10] ✗ ${scene.name} null on attempt 1 — retrying`)
        slotLog.attempts = 2
        await sleep(2000)
        rawBuf = await callGPTImageEdit(pngBuffer, fullPrompt, apiKey)
        if (rawBuf) {
          finalBuf = await sharp(rawBuf).jpeg({ quality: 92 }).toBuffer()
        }
      }

      if (finalBuf) {
        result.buffers.push(finalBuf)
        result.successCount++
        slotLog.success = true
        slotLog.outputSizeBytes = finalBuf.length
        console.log(
          `[generateByEditing v10] ✓ ${scene.name} — ${finalBuf.length}b ` +
          `(attempts=${slotLog.attempts} color=${slotLog.colorCheckPass ?? 'skip'})`,
        )
      } else {
        const msg = `${scene.name}: null after ${slotLog.attempts} attempts`
        result.errors.push(msg)
        slotLog.rejectionReason = slotLog.rejectionReason || msg
        console.warn(`[generateByEditing v10] ✗ ${msg}`)
      }

      slotLogs.push(slotLog)
      await sleep(1000)
    }
  } catch (err) {
    const msg = `Pipeline fatal: ${err instanceof Error ? err.message : err}`
    console.error(`[generateByEditing v10] ${msg}`)
    result.errors.push(msg)
  }

  const slotSummary = slotLogs.map((s) => {
    if (!s.success) return '✗'
    if (s.colorCheckPass === false) return '⚠'
    return '✓'
  }).join('')
  console.log(`[generateByEditing v10] done — ${result.successCount}/${result.promptCount} [${slotSummary}]`)

  return { results: [result], buffers: result.buffers, slotLogs }
}
