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

import { PRODUCT_PRESERVATION_PROHIBITIONS } from './productPreservation'

// ─────────────────────────────────────────────────────────────────────────────
// Shared canonical prohibitions — injected into EVERY generation prompt
// ─────────────────────────────────────────────────────────────────────────────
// This ensures the same master prohibition list from productPreservation.ts
// is used by ALL engines (OpenAI, Gemini Pro, Luma) — single source of truth.

const CANONICAL_PROHIBITIONS_BLOCK =
  `\n═══ ABSOLUTE PROHIBITIONS ═══\n` +
  `The following changes are STRICTLY FORBIDDEN in any generated image:\n` +
  PRODUCT_PRESERVATION_PROHIBITIONS.map((p) => `• ${p}`).join('\n') +
  `\nAny image violating these rules will be REJECTED.\n` +
  `═══════════════════════════\n`

// ─────────────────────────────────────────────────────────────────────────────
// Task framing — tells the model WHAT IT IS DOING before any details
// ─────────────────────────────────────────────────────────────────────────────
// This block is injected BEFORE the identity lock in every generation prompt.
// It frames the task as "re-photograph the same physical product" rather than
// "create/design a new product image", which dramatically reduces hallucination.

const TASK_FRAMING_BLOCK =
  `═══ TASK: RE-PHOTOGRAPH AN EXISTING PRODUCT ═══\n` +
  `You are a commercial product photographer with a physical shoe in front of you.\n` +
  `The reference image(s) show the EXACT PHYSICAL SHOE you are photographing.\n` +
  `Your job: produce a NEW CLEAN PRODUCT PHOTO of THIS SAME SHOE from a different angle/setting.\n` +
  `\n` +
  `WHAT MUST STAY IDENTICAL:\n` +
  `• The shoe itself — silhouette, sole, toe shape, laces, stitching, logos, material, color.\n` +
  `• Every structural detail that makes this shoe this specific shoe.\n` +
  `• NOT a similar shoe. NOT a redesigned shoe. THE SAME PHYSICAL OBJECT.\n` +
  `\n` +
  `WHAT MAY CHANGE:\n` +
  `• Camera angle, perspective, framing, lighting, background, scene setting.\n` +
  `• Think: same shoe moved to a different position on the studio set.\n` +
  `\n` +
  `OUTPUT FORMAT — CRITICAL:\n` +
  `• Full-bleed photograph — the image IS the product photo, nothing else.\n` +
  `• NO frames, NO borders, NO margins, NO outer shadow boxing.\n` +
  `• NOT a photo inside a white canvas. NOT a mockup. NOT a card. NOT a poster.\n` +
  `• The output must look like a direct camera shot, NOT like an image placed inside another image.\n` +
  `• NO watermarks, NO logos, NO branding overlays, NO text of any kind in the image.\n` +
  `\n` +
  `═══ IMAGE NORMALIZATION — MANDATORY ═══\n` +
  `SUBJECT SCALE: The shoe must occupy 65-80% of the image frame (height or width, whichever is dominant).\n` +
  `• The shoe must NOT appear tiny or distant inside a large empty canvas.\n` +
  `• The shoe must NOT be excessively zoomed in — show the FULL shoe in every slot.\n` +
  `• All product shots must maintain a consistent, premium product-to-frame ratio.\n` +
  `CENTERING — CRITICAL:\n` +
  `• The shoe must be DEAD CENTER in the image frame — both horizontally AND vertically.\n` +
  `• Equal whitespace on LEFT and RIGHT. Equal whitespace on TOP and BOTTOM.\n` +
  `• The visual center of the shoe should align with the geometric center of the image.\n` +
  `• Do NOT place the shoe in the lower half or shifted to one side.\n` +
  `• Do NOT leave disproportionate empty space on any side.\n` +
  `• Think: if you draw crosshairs at the image center, the shoe should sit symmetrically on them.\n` +
  `• Off-center placement is WRONG and will be REJECTED.\n` +
  `ANTI-INSET RULE (CRITICAL — ZERO TOLERANCE):\n` +
  `• Do NOT generate an image-inside-an-image. Do NOT create a framed-photo look.\n` +
  `• Do NOT create visible outer borders or a poster/card/mockup presentation.\n` +
  `• Do NOT create large white or colored margins that make the scene feel inset.\n` +
  `• Do NOT place the photo inside a rectangular panel, card, or bordered area.\n` +
  `• Do NOT add decorative edges, shadow boxing, or vignette framing.\n` +
  `• Do NOT render the image as if it were printed on paper and photographed.\n` +
  `• The output must be a direct, full-bleed photograph — edge to edge.\n` +
  `• The photo content must extend all the way to every edge of the output image.\n` +
  `• If your output has visible boundaries between "the photo" and "the canvas", it is WRONG.\n` +
  `• If your output looks like a photo placed onto a surface or inside a border, it is WRONG.\n` +
  `CONSISTENCY RULE:\n` +
  `• All images in this batch must feel like they belong to the same premium catalog system.\n` +
  `• Different slots may have different angles/scenes but the overall visual scale must be consistent.\n` +
  `• When placed side by side on a website, these images must look professionally harmonized.\n` +
  `═══════════════════════════\n` +
  `\n` +
  `QUALITY STANDARD:\n` +
  `• Premium e-commerce photography — think Zara / Nike / luxury catalog quality.\n` +
  `• Ultra clean, high clarity, high sharpness, no noise, no clutter.\n` +
  `• Soft studio lighting, natural soft shadow under the shoe.\n` +
  `• No harsh reflections, no dramatic lighting — realistic commercial look.\n` +
  `• VISUAL TONE: Rich, warm, slightly dark. NOT bright or airy. NOT high-key.\n` +
  `• The overall mood must feel grounded and premium — like a physical catalog page, not a web-store white-blast.\n` +
  `\n` +
  `═══ EXPOSURE & BRIGHTNESS CONTROL — MANDATORY ═══\n` +
  `• DARK & RICH exposure is the standard. The shoe must retain full surface detail with rich midtones.\n` +
  `• NO blown highlights — every part of the shoe surface must show visible texture.\n` +
  `• NO washed-out or overexposed areas — leather grain, stitching, and material must be clearly readable.\n` +
  `• NO high-key white flooding — the background is a VISIBLE COLOR (not near-white). It must read as a distinct backdrop.\n` +
  `• Preserve the true tonal range of the product: darks stay dark, midtones stay rich, highlights stay controlled.\n` +
  `• Lighting must illuminate the shoe WITHOUT flattening its surface detail.\n` +
  `• If the shoe is dark (black, navy, dark brown): expose for the shoe, not the background. Keep shadows rich and deep.\n` +
  `• If the shoe is light (white, cream, beige): use subtle shadows and contrast to define edges and texture. Do NOT let the shoe merge with the background.\n` +
  `• Think: a professional photographer who meters for the product in a warmly-lit studio with a colored backdrop — NOT a white infinity curve.\n` +
  `• An overexposed, washed-out, or bright-flooded image is WRONG and will be REJECTED.\n` +
  `═══════════════════════════\n` +
  `\n` +
  `═══ GLOBAL BACKGROUND LOCK (PRODUCT-LEVEL — ZERO TOLERANCE) ═══\n` +
  `ALL images in this product batch share ONE physical studio backdrop.\n` +
  `The backdrop has NOT been changed between shots. Only the camera position changed.\n` +
  `\n` +
  `RULES:\n` +
  `• Each slot's BACKGROUND line specifies ONE exact color with a hex code. Use THAT hex code literally.\n` +
  `• Slot 1 (side profile) sets the background-family for the entire batch.\n` +
  `• Slots 2, 3, 4, and 5 MUST produce the same background color as Slot 1.\n` +
  `• No slot may independently drift to a different color, shade, warmth, or hue.\n` +
  `• Do NOT introduce any surface, texture, tabletop, wood, marble, fabric, or environmental element.\n` +
  `• The background is a SOLID, UNIFORM studio color — nothing else.\n` +
  `\n` +
  `REJECTION TEST:\n` +
  `• Place all batch images side by side. The backgrounds MUST be the same color.\n` +
  `• A cool gray next to a warm beige = REJECTED.\n` +
  `• A white next to an off-white = REJECTED.\n` +
  `• Any visible color temperature shift between slots = REJECTED.\n` +
  `• Any textured surface or environmental background = REJECTED.\n` +
  `═══════════════════════════\n\n`

/**
 * Multi-angle reference block — injected when multiple reference images are provided.
 * Tells the generation model that these are all the SAME product from different angles,
 * improving product identity preservation.
 */
function buildMultiAngleBlock(additionalCount: number): string {
  if (additionalCount <= 0) return ''
  const total = 1 + additionalCount
  return (
    `═══ MULTI-ANGLE REFERENCE PACK ═══\n` +
    `You have been given ${total} reference images of the SAME EXACT shoe from different angles.\n` +
    `These are NOT different shoes. This is ONE physical product photographed ${total} times.\n` +
    `Use ALL reference images together to understand:\n` +
    `• The complete 3D shape of this shoe — what the front, side, and back look like.\n` +
    `• Logo and branding placement on all visible faces.\n` +
    `• Sole shape, heel profile, and construction details from multiple perspectives.\n` +
    `• Material consistency — the same leather/suede/mesh appears from every angle.\n` +
    `The first image is the PRIMARY reference. Additional images provide supplementary angles.\n` +
    `Your generated output must be faithful to ALL reference angles — the shoe identity must match.\n` +
    `═══════════════════════════\n\n`
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Premium Background Selection Engine — v39
// ─────────────────────────────────────────────────────────────────────────────
// Maps shoe color → VISIBLE contrasting background for studio shots.
// v39: backgrounds are now visibly colored (not near-white). The background
// must be clearly perceptible as a deliberate studio color, not "invisible."
// Target: mid-tone neutral or warm studio paper — think 60-80% luminance.

export function getBackgroundForColor(mainColor: string): string {
  const c = mainColor.toLowerCase()

  // Returns ONE EXACT background per shoe color — no "or" options.
  // This ensures all slots in a batch use the identical background.
  // v39: all hex codes shifted darker — visible studio color, not near-white.

  if (c.includes('black') || c.includes('siyah'))
    return 'warm sand (#D4C9B8). Solid, uniform, warm studio tone. Clearly visible color — not white. No gradient.'
  if (c.includes('white') || c.includes('beyaz') || c.includes('off-white'))
    return 'medium warm grey (#B8B5B0). Solid, uniform tone. Clearly darker than the shoe — strong contrast. No gradient.'
  if (c.includes('brown') || c.includes('kahve') || c.includes('espresso'))
    return 'warm stone (#D6CCBE). Solid, uniform, warm natural studio tone. Clearly visible color. No gradient.'
  if (c.includes('tan') || c.includes('tobacco') || c.includes('camel') || c.includes('taba'))
    return 'cool light grey (#C8C6C3). Solid, uniform, cool neutral studio tone. Clearly visible. No gradient.'
  if (c.includes('grey') || c.includes('gray') || c.includes('gri'))
    return 'warm off-white (#D9D5CE). Solid, uniform, warm tone to contrast cool shoe. Clearly visible. No gradient.'
  if (c.includes('navy') || c.includes('lacivert') || (c.includes('blue') && c.includes('dark')))
    return 'warm light grey (#C9C4BC). Solid, uniform, warm neutral tone. Clearly visible. No gradient.'
  if (c.includes('red') || c.includes('kırmızı') || c.includes('bordo') || c.includes('burgundy'))
    return 'cool grey (#C2C0BD). Solid, uniform, cool neutral tone. Clearly visible. No gradient.'
  return 'warm neutral grey (#CBC7C0). Solid, uniform, warm studio tone. Clearly visible color — not white. No gradient.'
}

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
  /** v12: brand fidelity check result */
  brandFidelityPass?: boolean
  brandFidelityScore?: 'good' | 'degraded' | 'failed'
  brandFidelityNotes?: string
  /** v20: shot composition compliance check */
  shotCompliancePass?: boolean
  detectedShot?: string
  /** v28: per-slot background compliance check */
  bgCheckPass?: boolean
  detectedBackground?: string
  /** v30: brightness / overexposure quality gate */
  brightnessCheckPass?: boolean
  meanBrightness?: number
  highlightPercent?: number
  /** v35: brightness normalization applied */
  brightnessNormalized?: boolean
  /** v37: centering QC result for hero slots */
  centeringPass?: boolean
  centeringOffsetX?: number
  centeringOffsetY?: number
  /** v37: total generation cycles (includes centering retries) */
  centeringAttempts?: number
  rejectionReason?: string
}

/**
 * A brand-critical local zone on the shoe that must be preserved in all generated images.
 * Extracted from the reference photo by Gemini Vision (Step B extension).
 */
export type ProtectedZone = {
  name: string          // e.g. "tongue_label", "side_branding", "heel_tab", "ankle_patch"
  description: string   // e.g. "Nike Swoosh logo on white rectangular tongue patch"
  mustPreserve: string  // e.g. "swoosh shape, white on black background, centered on tongue"
  visibility: 'high' | 'medium' | 'low'
}

/** Result from a post-generation brand fidelity check (Step D extension) */
type BrandFidelityResult = {
  pass: boolean
  overallScore: 'good' | 'degraded' | 'failed'
  zones: Array<{ zone: string; pass: boolean; note: string }>
  reinforcementHint: string
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
  /** v12: brand-critical local zones extracted from reference photo */
  protectedZones?: ProtectedZone[]
  /** v12: pre-built prompt section for protected zones, injected per slot */
  protectedZoneBlock?: string
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
  additionalImages?: Array<{ data: Buffer; mime: string }>,
): Promise<IdentityLock | null> {
  const visionModel = 'gemini-2.5-flash'

  // Multi-angle framing: if additional reference images are provided,
  // explicitly tell Gemini these are different angles of the SAME product.
  const hasMultiAngle = additionalImages && additionalImages.length > 0
  const totalImages = 1 + (additionalImages?.length || 0)

  const multiAnglePrefix = hasMultiAngle
    ? `IMPORTANT: You are receiving ${totalImages} photos of the SAME EXACT physical shoe taken from different angles. ` +
      `These are NOT different shoes — they are the SAME product photographed from ${totalImages} different perspectives. ` +
      `Use ALL ${totalImages} images together to build a complete, precise identity of this one shoe. ` +
      `Cross-reference details across angles: what you can't see from the front may be visible from the side or back.\n\n`
    : ''

  const prompt =
    multiAnglePrefix +
    `You are a product photography expert. Analyze this shoe photo${hasMultiAngle ? ' set' : ''} and extract a precise identity description. ` +
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
    `- "referenceAngle": the camera angle in the PRIMARY (first) photo (e.g. "45° front-left", "straight front", "overhead", "side profile")\n` +
    `- "protectedZones": array of brand-critical visible zones. Include ONLY zones where a logo, text mark, ` +
    `stripe pattern, or distinctive graphic element is CLEARLY VISIBLE in ANY of the provided images. For each zone include:\n` +
    `  - "name": one of "tongue_label" | "side_branding" | "heel_tab" | "toe_cap_overlay" | "ankle_patch" | "other"\n` +
    `  - "description": exactly what is visible (e.g. "white Nike Swoosh on black tongue patch", "three white parallel stripes on lateral side")\n` +
    `  - "mustPreserve": what specifically must not change (e.g. "swoosh shape and white-on-black contrast", "exactly 3 stripes, white, evenly spaced")\n` +
    `  - "visibility": "high" if clearly prominent, "medium" if visible but small, "low" if very subtle\n` +
    `  If no branding/logos/marks are visible, return an empty array [].\n` +
    `Be extremely precise on color — black vs brown vs tan matters enormously.`

  try {
    // Build image parts: primary image first, then additional angles
    const imageParts: Array<Record<string, unknown>> = [
      { inlineData: { mimeType: imageMime, data: imageBuffer.toString('base64') } },
    ]
    if (additionalImages) {
      for (const img of additionalImages.slice(0, 3)) {
        imageParts.push({
          inlineData: { mimeType: img.mime, data: img.data.toString('base64') },
        })
      }
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            ...imageParts,
            { text: prompt },
          ] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 900 },
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

    // Parse protected zones (v12)
    const rawZones: unknown[] = Array.isArray(p.protectedZones) ? p.protectedZones : []
    const protectedZones: ProtectedZone[] = rawZones
      .filter((z): z is Record<string, unknown> => typeof z === 'object' && z !== null && typeof (z as Record<string, unknown>).name === 'string')
      .map((z) => ({
        name: String(z.name),
        description: String(z.description || ''),
        mustPreserve: String(z.mustPreserve || 'preserve as shown'),
        visibility: (['high', 'medium', 'low'] as const).includes(z.visibility as 'high' | 'medium' | 'low')
          ? (z.visibility as 'high' | 'medium' | 'low')
          : 'medium',
      }))
      .filter((z) => z.description.length > 0)

    const protectedZoneBlock = buildProtectedZoneBlock(protectedZones)

    console.log(
      `[extractIdentityLock] ✓ ${productClass} | ${mainColor} | ${material} | ref=${refAngle} | ` +
      `zones=${protectedZones.length} (${protectedZones.map((z) => z.name).join(',') || 'none'}) | ` +
      `images=${totalImages} (${hasMultiAngle ? 'multi-angle' : 'single'})`,
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
      referenceAngle: refAngle,
      protectedZones,
      protectedZoneBlock,
    }
  } catch (err) {
    console.warn('[extractIdentityLock] error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Protected Zone Prompt Block Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a prompt section that explicitly names and locks each protected zone.
 * Injected into the generation prompt between the global identity block and
 * the scene-specific instructions.
 * Returns empty string if no meaningful zones exist.
 */
function buildProtectedZoneBlock(zones: ProtectedZone[]): string {
  const visibleZones = zones.filter((z) => z.visibility !== 'low' && z.description.length > 0)
  if (visibleZones.length === 0) return ''

  const lines: string[] = [
    `═══ PROTECTED BRAND ZONES — MUST NOT CHANGE ═══`,
    `The following brand/identity zones MUST be reproduced faithfully from the reference.`,
    ``,
  ]

  for (const zone of visibleZones) {
    const zoneTitle = zone.name.toUpperCase().replace(/_/g, ' ')
    lines.push(`${zoneTitle}: ${zone.description}`)
    lines.push(`  • PRESERVE: ${zone.mustPreserve}`)
    lines.push(`  • DO NOT invent fake text, logos, or brand marks here.`)
    lines.push(``)
  }

  lines.push(
    `BRAND FIDELITY RULE: If you cannot exactly reproduce a brand mark, render that zone`,
    `as a subtle/blurred shape rather than inventing fictional brand text (e.g. "COLIDAS",`,
    `"ADIBAS", or any made-up brand name). A blurred logo is better than a fake logo.`,
    `═══════════════════════════`,
    ``,
  )

  return lines.join('\n')
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
// Step D2 — Per-Slot Brand Fidelity Check (v12)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uses Gemini Vision to evaluate whether the generated image faithfully preserved
 * the protected brand zones extracted from the reference.
 *
 * Only called when identityLock.protectedZones has high/medium visibility zones.
 * On API failure: defaults to pass=true (never block on transient errors).
 *
 * Key concern: invented/changed brand text (e.g. "COLIDAS" instead of original logo).
 */
async function checkBrandFidelity(
  generatedImage: Buffer,
  protectedZones: ProtectedZone[],
  apiKey: string,
): Promise<BrandFidelityResult> {
  const visionModel = 'gemini-2.5-flash'

  const visibleZones = protectedZones.filter((z) => z.visibility !== 'low')
  if (visibleZones.length === 0) {
    return { pass: true, overallScore: 'good', zones: [], reinforcementHint: '' }
  }

  const zoneDescriptions = visibleZones
    .map((z) => `- ${z.name}: "${z.description}" (must preserve: ${z.mustPreserve})`)
    .join('\n')

  const prompt =
    `You are evaluating whether a generated shoe image faithfully preserved the original product's brand zones.\n\n` +
    `EXPECTED ZONES from the original reference shoe:\n${zoneDescriptions}\n\n` +
    `Look at this generated shoe image and evaluate each zone:\n` +
    `- Is the zone present and visually consistent with the expected description?\n` +
    `- Was any text INVENTED or changed? (e.g. "COLIDAS" instead of the original brand)\n` +
    `- Was a logo shape changed or replaced with a different brand symbol?\n\n` +
    `Reply JSON only — no markdown, no code fences:\n` +
    `{\n` +
    `  "pass": true/false,\n` +
    `  "overallScore": "good" | "degraded" | "failed",\n` +
    `  "zones": [{ "zone": "...", "pass": true/false, "note": "brief observation" }],\n` +
    `  "reinforcementHint": "brief description of what failed and what the correct zone should look like"\n` +
    `}\n` +
    `"pass" = true if all high-visibility brand zones look faithful (or are stylized/blurred but not replaced with fake text).\n` +
    `"pass" = false ONLY if a zone clearly shows invented/fake text, a wrong brand name, or a completely different logo.`

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
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 400 },
        }),
      },
    )

    if (!res.ok) {
      console.warn(`[checkBrandFidelity] HTTP ${res.status}`)
      return { pass: true, overallScore: 'good', zones: [], reinforcementHint: '' }
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { pass: true, overallScore: 'good', zones: [], reinforcementHint: '' }

    const parsed = JSON.parse(text.trim()) as Partial<BrandFidelityResult>
    const result: BrandFidelityResult = {
      pass:               parsed.pass          ?? true,
      overallScore:       parsed.overallScore   ?? 'good',
      zones:              Array.isArray(parsed.zones) ? parsed.zones : [],
      reinforcementHint:  parsed.reinforcementHint ?? '',
    }

    console.log(
      `[checkBrandFidelity] pass=${result.pass} score=${result.overallScore}` +
      (result.reinforcementHint ? ` hint="${result.reinforcementHint.slice(0, 100)}"` : ''),
    )
    return result
  } catch (err) {
    console.warn('[checkBrandFidelity] error:', err instanceof Error ? err.message : err)
    return { pass: true, overallScore: 'good', zones: [], reinforcementHint: '' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step D3 — Per-Slot Shot Compliance Check (v20)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gemini Vision check: does the generated image actually match the intended shot type?
 * Catches angle drift — e.g. Gemini generating a 3/4 view instead of a pure 90° side
 * profile, or a near-front instead of the required dead-straight front.
 *
 * Each slot has precise pass/fail criteria. On API failure defaults to pass=true
 * (never block on transient errors).
 *
 * Returns { pass, detectedShot, correctionHint } where correctionHint is pre-formatted
 * for direct injection into the retry preamble.
 */
async function checkShotCompliance(
  generatedImage: Buffer,
  slotName: string,
  apiKey: string,
): Promise<{ pass: boolean; detectedShot: string; correctionHint: string }> {
  const visionModel = 'gemini-2.5-flash'

  // Per-slot criteria — description, pass rule, fail signals, required correction
  const SHOT_CRITERIA: Record<string, {
    required: string
    passRule: string
    failSignals: string
    correction: string
  }> = {
    commerce_front: {
      required: 'straight-on front hero — camera directly facing the toe cap, symmetric, white background',
      passRule: 'the toe cap front face is fully visible and both sides are symmetric (equal width on left and right)',
      failSignals: 'heel counter visible, 3/4 diagonal angle, side profile dominant, asymmetric sides',
      correction: 'Camera must be DIRECTLY IN FRONT of the toe cap, perpendicular. Both sides equally visible. No diagonal. Pure front-on.',
    },
    side_angle: {
      required: 'pure 90° lateral side profile — complete sole edge visible, toe front face NOT visible',
      passRule: 'the sole edge profile is fully visible from toe tip to heel, the toe front face is NOT visible',
      failSignals: 'toe front face visible, slight diagonal (3/4 from front), heel hidden, angled top-down',
      correction: 'Camera must be at exactly 90° to the side. The toe FRONT FACE must NOT be visible. The sole profile must be fully exposed from toe to heel.',
    },
    close_shot_hero: {
      required: '3/4 front close hero — camera low at 30-45° from the front-side, full shoe visible at tighter framing, vamp and toe detail prominent',
      passRule: 'the shoe is seen from a front-side 3/4 angle showing the vamp, toe shape, and lacing/closure area as the dominant features, the full shoe is visible (toe to heel), framing is tighter than side_angle but the entire shoe is still in frame',
      failSignals: 'pure front dead-on (no side angle visible), pure side profile (no front face visible), heel counter dominant (back view), top-down overhead, macro close-up of a detail only, partial shoe cropped out, framed/inset look',
      correction: 'Camera must be at 30-45° from the front-side at low-mid height. The vamp and toe area must be the hero. Full shoe must be visible — not a macro crop. Not a back view.',
    },
    tabletop_editorial: {
      required: 'overhead editorial at 55-65° — top of shoe (tongue, lacing) dominant, marble surface',
      passRule: 'the top of the shoe is prominently visible (tongue, lacing seen from above), clear overhead-ish angle',
      failSignals: 'straight-on front angle, side profile view, no overhead perspective, lacing not visible from above',
      correction: 'Camera must be above and in front at 55-65° looking DOWN. The tongue and lacing pattern must be visible from above. Not a front or side view.',
    },
    worn_lifestyle: {
      required: 'lifestyle worn shot — shoe on a human foot/lower leg, ground-level, warm environment',
      passRule: 'a human foot/lower leg is visible wearing the shoe in a lifestyle environment (not a studio)',
      failSignals: 'isolated floating shoe with no foot, studio white background, no human element present',
      correction: 'The shoe must be WORN ON A HUMAN FOOT. A lower leg/ankle must be visible. This is NOT a product-on-surface shot.',
    },
  }

  const criteria = SHOT_CRITERIA[slotName]
  if (!criteria) return { pass: true, detectedShot: 'unknown', correctionHint: '' }

  const prompt =
    `You are evaluating whether a generated shoe photo matches the required shot type.\n\n` +
    `REQUIRED SHOT TYPE: ${criteria.required}\n` +
    `PASS if: ${criteria.passRule}\n` +
    `FAIL if any of these are true: ${criteria.failSignals}\n\n` +
    `ALSO FAIL if the image has ANY of these composition defects:\n` +
    `• The photo appears inset/framed — there is a visible border, panel, or canvas around the main scene\n` +
    `• The image looks like a photo placed onto another surface or inside a card/mockup\n` +
    `• There are decorative edges, shadow boxing, or margin areas that frame the scene\n` +
    `• The main subject area is noticeably smaller than the full image, with large uniform margins\n` +
    `A valid image must be full-bleed: the scene extends edge-to-edge with no framing artifacts.\n\n` +
    `Analyze this shoe image and respond with JSON only — no markdown, no code fences:\n` +
    `{"pass": true/false, "detectedShot": "one-sentence description of the actual angle/composition in this image"}\n\n` +
    `Be strict. A slight 3/4 angle when pure front was requested = FAIL. ` +
    `A slight diagonal when pure side was requested = FAIL. ` +
    `Any visible frame, border, or inset panel = FAIL.`

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
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 120 },
        }),
      },
    )

    if (!res.ok) {
      console.warn(`[checkShotCompliance] HTTP ${res.status}`)
      return { pass: true, detectedShot: 'unknown', correctionHint: '' }
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { pass: true, detectedShot: 'unknown', correctionHint: '' }

    const parsed = JSON.parse(text.trim())
    const pass = parsed.pass ?? true
    const detectedShot = parsed.detectedShot || 'unknown'
    const correctionHint = pass ? '' :
      `CRITICAL SHOT CORRECTION: The output shows "${detectedShot}" but this slot requires: ` +
      `${criteria.required}. ${criteria.correction}`

    console.log(
      `[checkShotCompliance] slot=${slotName} pass=${pass} detected="${detectedShot.slice(0, 80)}"`,
    )
    return { pass, detectedShot, correctionHint }
  } catch (err) {
    console.warn('[checkShotCompliance] error:', err instanceof Error ? err.message : err)
    return { pass: true, detectedShot: 'unknown', correctionHint: '' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step D4 — Per-Slot Background Check (v28)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gemini Vision check: does the generated image's background match the
 * intended batch background color?
 *
 * This is a PER-SLOT check (unlike checkBackgroundConsistency which runs
 * on the whole batch post-generation). It catches individual slot drift
 * immediately so the slot can be retried.
 *
 * On API failure: defaults to pass=true (never block on transient errors).
 */
async function checkSlotBackground(
  generatedImage: Buffer,
  expectedBackground: string,
  slotName: string,
  apiKey: string,
): Promise<{ pass: boolean; detectedBackground: string; correctionHint: string }> {
  const visionModel = 'gemini-2.5-flash'

  const prompt =
    `You are a QC inspector for e-commerce product photography background consistency.\n\n` +
    `EXPECTED BACKGROUND: ${expectedBackground}\n` +
    `SLOT TYPE: ${slotName}\n\n` +
    `Look at this product image and evaluate the background:\n` +
    `1. What is the dominant background color/surface in this image?\n` +
    `2. Does it match the expected background color specified above?\n\n` +
    `PASS if: the background is clearly the same color family as expected (e.g. both warm beige, both light grey).\n` +
    `FAIL if:\n` +
    `- Background is a different color (e.g. expected beige but got green/grey/brown)\n` +
    `- Background shows a textured surface (wood, marble, fabric, stone, tiles) instead of a clean studio backdrop\n` +
    `- Background shows an environmental scene instead of the specified studio color\n` +
    `- Background is dark/black when a light color was specified (or vice versa)\n\n` +
    `Respond with JSON only — no markdown, no code fences:\n` +
    `{"pass": true/false, "detectedBackground": "brief description of the actual background"}\n` +
    `Be strict. Different color tone = FAIL. Textured surface when solid color was specified = FAIL.`

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
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 150 },
        }),
      },
    )

    if (!res.ok) {
      console.warn(`[checkSlotBackground] HTTP ${res.status}`)
      return { pass: true, detectedBackground: 'unknown', correctionHint: '' }
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { pass: true, detectedBackground: 'unknown', correctionHint: '' }

    const parsed = JSON.parse(text.trim())
    const pass = parsed.pass ?? true
    const detectedBackground = parsed.detectedBackground || 'unknown'
    const correctionHint = pass ? '' :
      `CRITICAL BACKGROUND CORRECTION: The output background is "${detectedBackground}" ` +
      `but the batch background MUST be: ${expectedBackground}. ` +
      `Do NOT use a tabletop, textured surface, wood, marble, or any environmental background. ` +
      `Use ONLY the exact studio backdrop color specified: ${expectedBackground}. ` +
      `The background must be a clean, uniform, solid color — not a surface or texture.`

    console.log(
      `[checkSlotBackground] slot=${slotName} pass=${pass} detected="${detectedBackground.slice(0, 80)}" expected="${expectedBackground.slice(0, 40)}"`,
    )
    return { pass, detectedBackground, correctionHint }
  } catch (err) {
    console.warn('[checkSlotBackground] error:', err instanceof Error ? err.message : err)
    return { pass: true, detectedBackground: 'unknown', correctionHint: '' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step D5: Brightness / Overexposure Check — Production Quality Gate (v30)
// ─────────────────────────────────────────────────────────────────────────────
// Uses sharp (already in pipeline) to compute image brightness statistics.
// Rejects images where:
//   1. Mean brightness > 210 (out of 255) — image is globally overexposed
//   2. More than 35% of pixels are near-white (> 240) — blown highlights
// These thresholds are calibrated to allow light backgrounds while catching
// washed-out product surfaces. Fail-open on errors (returns pass=true).

async function checkBrightnessExposure(
  imageBuffer: Buffer,
  slotName: string,
): Promise<{ pass: boolean; meanBrightness: number; highlightPercent: number; correctionHint: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as typeof import('sharp')

    // Convert to greyscale and get raw pixel data for brightness analysis
    const { data, info } = await sharp(imageBuffer)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const totalPixels = info.width * info.height
    let sum = 0
    let nearWhiteCount = 0 // pixels > 240

    for (let i = 0; i < data.length; i++) {
      const val = data[i]
      sum += val
      if (val > 240) nearWhiteCount++
    }

    const meanBrightness = Math.round(sum / totalPixels)
    const highlightPercent = Math.round((nearWhiteCount / totalPixels) * 100)

    // v39: Tighter QC. With darker backgrounds (~75% lum), the overall mean should
    // be substantially lower. Mean >185 or highlight >25% triggers a retry.
    // The normalization post-processing is the real safety net, but tighter QC
    // catches overexposure earlier and triggers retries with darker exposure hints.
    const isTooMean = meanBrightness > 185
    const isTooHighlight = highlightPercent > 25
    const pass = !isTooMean && !isTooHighlight

    console.log(
      `[checkBrightness] slot=${slotName} mean=${meanBrightness}/255 highlight=${highlightPercent}% pass=${pass}`,
    )

    const correctionHint = pass ? '' :
      `CRITICAL EXPOSURE CORRECTION: The previous output was overexposed ` +
      `(mean brightness ${meanBrightness}/255, ${highlightPercent}% near-white pixels). ` +
      `Reduce overall brightness. Use controlled, balanced studio lighting. ` +
      `The shoe surface MUST retain visible texture, grain, and stitching detail. ` +
      `No blown highlights. No washed-out areas. Meter exposure for the shoe, not the background.`

    return { pass, meanBrightness, highlightPercent, correctionHint }
  } catch (err) {
    console.warn('[checkBrightness] error:', err instanceof Error ? err.message : err)
    return { pass: true, meanBrightness: 0, highlightPercent: 0, correctionHint: '' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Frame / Inset Detection & Auto-Crop — Deterministic Post-Processing (v33)
// ─────────────────────────────────────────────────────────────────────────────
// Gemini sometimes generates slots with
// a visible rectangular border/frame — a darker edge forming a "photo on canvas"
// look. This detector scans the edge bands for a consistent dark border and
// crops it out, then scales back to original dimensions.
//
// Strategy:
//   1. Sample 4 edge bands (top/bottom/left/right, 3% width)
//   2. Compute mean brightness of each edge band vs center region
//   3. If any edge band is significantly darker than center → frame detected
//   4. Find the inner content boundary by scanning inward from each edge
//   5. Crop to inner content and resize back to original dimensions

async function detectAndRemoveFrame(
  imageBuffer: Buffer,
  slotName: string,
): Promise<{ buffer: Buffer; frameDetected: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require('sharp') as typeof import('sharp')

  const metadata = await sharp(imageBuffer).metadata()
  const w = metadata.width || 1024
  const h = metadata.height || 1024

  // Get greyscale raw pixels for analysis
  const { data } = await sharp(imageBuffer)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Helper: mean brightness of a rectangular region
  function regionMean(x1: number, y1: number, x2: number, y2: number): number {
    let sum = 0
    let count = 0
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        sum += data[y * w + x]
        count++
      }
    }
    return count > 0 ? sum / count : 128
  }

  // Edge band width: 3% of image dimension (≈30px on 1024)
  const bandW = Math.max(8, Math.round(w * 0.03))
  const bandH = Math.max(8, Math.round(h * 0.03))

  // Sample edge bands
  const topMean    = regionMean(bandW, 0, w - bandW, bandH)
  const bottomMean = regionMean(bandW, h - bandH, w - bandW, h)
  const leftMean   = regionMean(0, bandH, bandW, h - bandH)
  const rightMean  = regionMean(w - bandW, bandH, w, h - bandH)

  // Center region mean (middle 50%)
  const cx1 = Math.round(w * 0.25)
  const cy1 = Math.round(h * 0.25)
  const cx2 = Math.round(w * 0.75)
  const cy2 = Math.round(h * 0.75)
  const centerMean = regionMean(cx1, cy1, cx2, cy2)

  // Frame detection: edge significantly different from center (darker OR lighter).
  // Dark borders on light content: centerMean - edgeMean > threshold
  // Light borders on dark content: edgeMean - centerMean > threshold
  // Both patterns indicate a frame/inset composition.
  const FRAME_THRESHOLD = 30
  const topFrame    = Math.abs(centerMean - topMean) > FRAME_THRESHOLD
  const bottomFrame = Math.abs(centerMean - bottomMean) > FRAME_THRESHOLD
  const leftFrame   = Math.abs(centerMean - leftMean) > FRAME_THRESHOLD
  const rightFrame  = Math.abs(centerMean - rightMean) > FRAME_THRESHOLD

  const frameDetected = topFrame || bottomFrame || leftFrame || rightFrame

  console.log(
    `[detectFrame v33] slot=${slotName} edges=[T:${Math.round(topMean)} B:${Math.round(bottomMean)} L:${Math.round(leftMean)} R:${Math.round(rightMean)}] ` +
    `center=${Math.round(centerMean)} frame=[T:${topFrame} B:${bottomFrame} L:${leftFrame} R:${rightFrame}] detected=${frameDetected}`,
  )

  if (!frameDetected) {
    return { buffer: imageBuffer, frameDetected: false }
  }

  // Find inner content boundary by scanning inward from each framed edge
  // Look for the row/column where brightness jumps to near-center level
  const TRANSITION_THRESHOLD = 25 // within this of center = content area

  let cropTop = 0
  let cropBottom = h
  let cropLeft = 0
  let cropRight = w

  if (topFrame) {
    for (let y = 0; y < Math.round(h * 0.15); y++) {
      const rowMean = regionMean(Math.round(w * 0.3), y, Math.round(w * 0.7), y + 1)
      if (Math.abs(rowMean - centerMean) < TRANSITION_THRESHOLD) {
        cropTop = Math.max(0, y - 2)
        break
      }
    }
  }
  if (bottomFrame) {
    for (let y = h - 1; y > Math.round(h * 0.85); y--) {
      const rowMean = regionMean(Math.round(w * 0.3), y, Math.round(w * 0.7), y + 1)
      if (Math.abs(rowMean - centerMean) < TRANSITION_THRESHOLD) {
        cropBottom = Math.min(h, y + 3)
        break
      }
    }
  }
  if (leftFrame) {
    for (let x = 0; x < Math.round(w * 0.15); x++) {
      const colMean = regionMean(x, Math.round(h * 0.3), x + 1, Math.round(h * 0.7))
      if (Math.abs(colMean - centerMean) < TRANSITION_THRESHOLD) {
        cropLeft = Math.max(0, x - 2)
        break
      }
    }
  }
  if (rightFrame) {
    for (let x = w - 1; x > Math.round(w * 0.85); x--) {
      const colMean = regionMean(x, Math.round(h * 0.3), x + 1, Math.round(h * 0.7))
      if (Math.abs(colMean - centerMean) < TRANSITION_THRESHOLD) {
        cropRight = Math.min(w, x + 3)
        break
      }
    }
  }

  const innerW = cropRight - cropLeft
  const innerH = cropBottom - cropTop

  // Safety: don't crop if the detected inner region is too small (< 70% of original)
  if (innerW < w * 0.7 || innerH < h * 0.7) {
    console.warn(
      `[detectFrame v33] crop too aggressive (${innerW}x${innerH} from ${w}x${h}) — skipping`,
    )
    return { buffer: imageBuffer, frameDetected: true }
  }

  console.log(
    `[detectFrame v33] cropping ${slotName}: (${cropLeft},${cropTop})→(${cropRight},${cropBottom}) = ${innerW}x${innerH} → resize to ${w}x${h}`,
  )

  // Crop inner content and resize back to original dimensions
  const cropped = await sharp(imageBuffer)
    .extract({ left: cropLeft, top: cropTop, width: innerW, height: innerH })
    .resize(w, h, { fit: 'fill' })
    .jpeg({ quality: 92 })
    .toBuffer()

  return { buffer: cropped, frameDetected: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Brightness Normalization — Deterministic Post-Processing (v35)
// ─────────────────────────────────────────────────────────────────────────────
// v33 used sharp.modulate() which affected the ENTIRE image (including
// background), potentially undoing background enforcement. v35 replaces this
// with product-pixel-only selective gamma correction.
//
// Measures PRODUCT pixel luminance (excluding background), then applies gamma
// correction only to product pixels if they fall outside the safe band.
// Background pixels are preserved to maintain the enforced background color.
//
// Target band: product mean luminance 100–170.
// Above 170 → darken (gamma > 1) — fixes washed-out / high-key outputs.
// Below 100 → brighten (gamma < 1) — fixes underexposed outputs.
//
// MUST run AFTER background enforcement.

async function normalizeBrightness(
  imageBuffer: Buffer,
  targetBgHex?: string,
): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require('sharp') as typeof import('sharp')

  const metadata = await sharp(imageBuffer).metadata()
  const width  = metadata.width  || 1024
  const height = metadata.height || 1024

  const { data: rawPixels, info } = await sharp(imageBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const channels = info.channels // 3 (RGB)

  // ── Detect background color from edges ──
  const edgeDepth = Math.max(8, Math.round(Math.min(width, height) * 0.04))
  let bgR = 0, bgG = 0, bgB = 0, bgCount = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEdge = y < edgeDepth || y >= height - edgeDepth ||
                     x < edgeDepth || x >= width - edgeDepth
      if (!isEdge) continue
      const idx = (y * width + x) * channels
      bgR += rawPixels[idx]
      bgG += rawPixels[idx + 1]
      bgB += rawPixels[idx + 2]
      bgCount++
    }
  }

  const detBg = {
    r: Math.round(bgR / bgCount),
    g: Math.round(bgG / bgCount),
    b: Math.round(bgB / bgCount),
  }

  // If we have an explicit target bg hex, use it for more accurate classification
  const bgRef = targetBgHex ? hexToRgb(targetBgHex) : detBg

  // ── Measure mean luminance of PRODUCT pixels only ──
  const BG_THRESHOLD = 80
  let lumSum = 0
  let productPixelCount = 0

  for (let i = 0; i < rawPixels.length; i += channels) {
    const pr = rawPixels[i]
    const pg = rawPixels[i + 1]
    const pb = rawPixels[i + 2]

    const dr = pr - bgRef.r
    const dg = pg - bgRef.g
    const db = pb - bgRef.b
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)

    if (dist < BG_THRESHOLD) continue

    const lum = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb
    lumSum += lum
    productPixelCount++
  }

  if (productPixelCount < 1000) {
    console.log(`[normalizeBrightness] only ${productPixelCount} product pixels — skipping`)
    return imageBuffer
  }

  const meanLum = lumSum / productPixelCount

  // ── Determine correction ──
  // v39: shifted darker — 70-120 band. Previous 85-145 still produced
  // a bright/washed look. New midpoint 95 pulls product tones substantially
  // darker for a richer, more grounded premium feel.
  const TARGET_LOW  = 70
  const TARGET_HIGH = 120
  const TARGET_MID  = 95

  let gamma = 1.0

  if (meanLum > TARGET_HIGH) {
    const currentNorm = meanLum / 255
    const targetNorm  = TARGET_MID / 255
    gamma = Math.log(targetNorm) / Math.log(currentNorm)
    gamma = Math.max(1.05, Math.min(gamma, 1.8))
  } else if (meanLum < TARGET_LOW) {
    const currentNorm = meanLum / 255
    const targetNorm  = TARGET_MID / 255
    gamma = Math.log(targetNorm) / Math.log(currentNorm)
    gamma = Math.max(0.55, Math.min(gamma, 0.95))
  }

  console.log(
    `[normalizeBrightness v35] meanLum=${meanLum.toFixed(1)} productPx=${productPixelCount} ` +
    `bg=rgb(${detBg.r},${detBg.g},${detBg.b}) gamma=${gamma.toFixed(3)} ` +
    `${gamma === 1.0 ? '(no correction needed)' : gamma > 1 ? '(darkening)' : '(brightening)'}`,
  )

  if (gamma === 1.0) return imageBuffer

  // ── Apply selective gamma: product pixels corrected, bg pixels preserved ──
  const outputPixels = Buffer.from(rawPixels)
  const BG_BLEND_MARGIN = 40

  for (let i = 0; i < rawPixels.length; i += channels) {
    const pr = rawPixels[i]
    const pg = rawPixels[i + 1]
    const pb = rawPixels[i + 2]

    const dr = pr - bgRef.r
    const dg = pg - bgRef.g
    const db = pb - bgRef.b
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)

    if (dist < BG_THRESHOLD - BG_BLEND_MARGIN) continue // pure bg — skip

    let blend: number
    if (dist >= BG_THRESHOLD) {
      blend = 1.0
    } else {
      blend = (dist - (BG_THRESHOLD - BG_BLEND_MARGIN)) / BG_BLEND_MARGIN
    }

    const applyGamma = (val: number): number => {
      const norm = val / 255
      return Math.max(0, Math.min(255, Math.round(Math.pow(norm, gamma) * 255)))
    }

    const corrR = applyGamma(pr)
    const corrG = applyGamma(pg)
    const corrB = applyGamma(pb)

    outputPixels[i]     = Math.round(pr + (corrR - pr) * blend)
    outputPixels[i + 1] = Math.round(pg + (corrG - pg) * blend)
    outputPixels[i + 2] = Math.round(pb + (corrB - pb) * blend)
  }

  const result = await sharp(outputPixels, {
    raw: { width, height, channels },
  })
    .jpeg({ quality: 92 })
    .toBuffer()

  console.log(`[normalizeBrightness v35] ✓ gamma=${gamma.toFixed(3)} applied — ${result.length}b`)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Centering — Deterministic Post-Processing (v36)
// ─────────────────────────────────────────────────────────────────────────────
// Gemini consistently places shoes in the lower-right quadrant.
// This function detects the product bounding box, computes the offset from
// image center, and if the offset exceeds a threshold, shifts the product
// to be centered by cropping and extending with the background color.
//
// Operates on all full-shoe slots (v38: all standard slots are full-shoe; the
// product intentionally fills the frame asymmetrically).

async function centerProduct(
  imageBuffer: Buffer,
  targetBgHex?: string,
  slotName?: string,
): Promise<Buffer> {
  // v38: All slots are now full-shoe shots — no skip needed
  // (Previously skipped detail_closeup which was a macro slot)

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require('sharp') as typeof import('sharp')

  const metadata = await sharp(imageBuffer).metadata()
  const width  = metadata.width  || 1024
  const height = metadata.height || 1024

  const { data: rawPixels, info } = await sharp(imageBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const channels = info.channels

  // ── Detect background color from edges (same as normalizeBrightness) ──
  const edgeDepth = Math.max(8, Math.round(Math.min(width, height) * 0.04))
  let bgR = 0, bgG = 0, bgB = 0, bgCount = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEdge = y < edgeDepth || y >= height - edgeDepth ||
                     x < edgeDepth || x >= width - edgeDepth
      if (!isEdge) continue
      const idx = (y * width + x) * channels
      bgR += rawPixels[idx]
      bgG += rawPixels[idx + 1]
      bgB += rawPixels[idx + 2]
      bgCount++
    }
  }

  const detBg = {
    r: Math.round(bgR / bgCount),
    g: Math.round(bgG / bgCount),
    b: Math.round(bgB / bgCount),
  }

  const bgRef = targetBgHex ? hexToRgb(targetBgHex) : detBg

  // ── Find product bounding box ──
  const PRODUCT_DIST_THRESHOLD = 50
  let minX = width, maxX = 0, minY = height, maxY = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels
      const dr = rawPixels[idx] - bgRef.r
      const dg = rawPixels[idx + 1] - bgRef.g
      const db = rawPixels[idx + 2] - bgRef.b
      const dist = Math.sqrt(dr * dr + dg * dg + db * db)
      if (dist > PRODUCT_DIST_THRESHOLD) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    console.log(`[centerProduct] no product bbox found — skipping`)
    return imageBuffer
  }

  const productCenterX = (minX + maxX) / 2
  const productCenterY = (minY + maxY) / 2
  const imageCenterX = width / 2
  const imageCenterY = height / 2

  const offsetX = Math.round(productCenterX - imageCenterX)
  const offsetY = Math.round(productCenterY - imageCenterY)

  // Only correct if offset > threshold (avoid sub-pixel jitter)
  const OFFSET_THRESHOLD = 25 // px — below this is "close enough"
  const needsCorrection = Math.abs(offsetX) > OFFSET_THRESHOLD || Math.abs(offsetY) > OFFSET_THRESHOLD

  console.log(
    `[centerProduct v36] slot=${slotName || '?'} bbox=(${minX},${minY})→(${maxX},${maxY}) ` +
    `prodCenter=(${Math.round(productCenterX)},${Math.round(productCenterY)}) ` +
    `offset=(${offsetX},${offsetY}) threshold=${OFFSET_THRESHOLD} ` +
    `${needsCorrection ? 'CORRECTING' : 'ok'}`,
  )

  if (!needsCorrection) return imageBuffer

  // ── Shift the image to center the product ──
  // Strategy: crop from the side where there's excess background,
  // then extend the opposite side with background color.
  // This preserves the product pixels and only adds/removes background.

  // Use the background color for fill (from enforced bg or detected)
  const fillColor = targetBgHex
    ? hexToRgb(targetBgHex)
    : detBg

  // Calculate crop region: shift the view window by -offset
  // If product is at +80px offset, we need to move the crop window +80px right
  // (i.e., crop 80px from left, extend 80px on right)
  const cropLeft   = Math.max(0, offsetX)
  const cropTop    = Math.max(0, offsetY)
  const cropRight  = Math.max(0, -offsetX)
  const cropBottom = Math.max(0, -offsetY)

  // Crop width/height after removing offset margins
  const cropW = width - cropLeft - cropRight
  const cropH = height - cropTop - cropBottom

  if (cropW < width * 0.7 || cropH < height * 0.7) {
    // Safety: don't crop too aggressively — would lose too much product
    console.warn(`[centerProduct v36] crop too aggressive (${cropW}x${cropH}) — skipping`)
    return imageBuffer
  }

  // ── v37 FIX: Split into two sharp instances ──
  // Sharp bug: chaining .extract().extend().resize() in one pipeline causes
  // resize to compute scale factors from post-extract (not post-extend) dims,
  // producing wrong output size and UNDOING the centering correction.
  // Fix: extract+extend in step 1 (correct dims guaranteed), then optional
  // resize in step 2 only if needed (rounding edge case).
  const shifted = await sharp(imageBuffer)
    .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
    .extend({
      top: cropTop > 0 ? 0 : Math.abs(offsetY),
      bottom: cropTop > 0 ? offsetY : 0,
      left: cropLeft > 0 ? 0 : Math.abs(offsetX),
      right: cropLeft > 0 ? offsetX : 0,
      background: { r: fillColor.r, g: fillColor.g, b: fillColor.b, alpha: 255 },
    })
    .jpeg({ quality: 92 })
    .toBuffer()

  // Verify output dimensions match input; resize only if off (rounding edge case)
  const shiftedMeta = await sharp(shifted).metadata()
  let finalBuf = shifted
  if (shiftedMeta.width !== width || shiftedMeta.height !== height) {
    console.log(
      `[centerProduct v37] dimension mismatch after shift: ` +
      `${shiftedMeta.width}x${shiftedMeta.height} vs expected ${width}x${height} — resizing`,
    )
    finalBuf = await sharp(shifted)
      .resize(width, height, { fit: 'fill' })
      .jpeg({ quality: 92 })
      .toBuffer()
  }

  console.log(`[centerProduct v37] ✓ shifted by (${-offsetX},${-offsetY})px — ${finalBuf.length}b`)
  return finalBuf
}

// ─────────────────────────────────────────────────────────────────────────────
// Step D6: Centering QC — Post-Processing Quality Gate (v37)
// ─────────────────────────────────────────────────────────────────────────────

/** v38: All standard slots require strict centering QC (all are full-shoe shots now) */
const CENTERING_QC_SLOTS = new Set(['side_angle', 'commerce_front', 'close_shot_hero'])

/** Maximum acceptable offset from center as % of image dimension */
const MAX_CENTER_OFFSET_PCT = 12

/**
 * Measure how centered the product is in the final image.
 * Returns pass/fail plus offset percentages on each axis.
 *
 * Uses edge-based background detection and bounding box envelope —
 * same algorithm as centerProduct — to ensure consistent measurement.
 */
async function measureCentering(
  imageBuffer: Buffer,
  targetBgHex?: string,
  slotName?: string,
): Promise<{ pass: boolean; offsetXPct: number; offsetYPct: number; offsetXPx: number; offsetYPx: number }> {
  // Skip non-hero slots — always pass
  if (!slotName || !CENTERING_QC_SLOTS.has(slotName)) {
    return { pass: true, offsetXPct: 0, offsetYPct: 0, offsetXPx: 0, offsetYPx: 0 }
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require('sharp') as typeof import('sharp')

  const metadata = await sharp(imageBuffer).metadata()
  const width  = metadata.width  || 1024
  const height = metadata.height || 1024

  const { data: rawPixels, info } = await sharp(imageBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const channels = info.channels

  // Detect background from edges
  const edgeDepth = Math.max(8, Math.round(Math.min(width, height) * 0.04))
  let bgR = 0, bgG = 0, bgB = 0, bgCount = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEdge = y < edgeDepth || y >= height - edgeDepth ||
                     x < edgeDepth || x >= width - edgeDepth
      if (!isEdge) continue
      const idx = (y * width + x) * channels
      bgR += rawPixels[idx]
      bgG += rawPixels[idx + 1]
      bgB += rawPixels[idx + 2]
      bgCount++
    }
  }

  const detBg = {
    r: Math.round(bgR / bgCount),
    g: Math.round(bgG / bgCount),
    b: Math.round(bgB / bgCount),
  }

  const bgRef = targetBgHex ? hexToRgb(targetBgHex) : detBg

  // Find product bounding box
  const PRODUCT_DIST_THRESHOLD = 50
  let minX = width, maxX = 0, minY = height, maxY = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels
      const dr = rawPixels[idx] - bgRef.r
      const dg = rawPixels[idx + 1] - bgRef.g
      const db = rawPixels[idx + 2] - bgRef.b
      if (Math.sqrt(dr * dr + dg * dg + db * db) > PRODUCT_DIST_THRESHOLD) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    // No product detected — pass by default (edge case)
    return { pass: true, offsetXPct: 0, offsetYPct: 0, offsetXPx: 0, offsetYPx: 0 }
  }

  const productCenterX = (minX + maxX) / 2
  const productCenterY = (minY + maxY) / 2
  const offsetX = Math.round(productCenterX - width / 2)
  const offsetY = Math.round(productCenterY - height / 2)
  const offsetXPct = Math.abs((offsetX / width) * 100)
  const offsetYPct = Math.abs((offsetY / height) * 100)
  const pass = offsetXPct <= MAX_CENTER_OFFSET_PCT && offsetYPct <= MAX_CENTER_OFFSET_PCT

  console.log(
    `[measureCentering v37] slot=${slotName} ` +
    `offset=(${offsetX},${offsetY}) = (${offsetXPct.toFixed(1)}%,${offsetYPct.toFixed(1)}%) ` +
    `threshold=${MAX_CENTER_OFFSET_PCT}% ` +
    `${pass ? 'PASS' : 'FAIL'}`,
  )

  return { pass, offsetXPct: Math.round(offsetXPct * 10) / 10, offsetYPct: Math.round(offsetYPct * 10) / 10, offsetXPx: offsetX, offsetYPx: offsetY }
}

// ─────────────────────────────────────────────────────────────────────────────
// Background Enforcement — Deterministic Post-Processing (v28)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse hex color from a background description string like:
 * "warm beige (#F5F0E8). Solid, uniform..." → "#F5F0E8"
 * Returns null if no hex code found.
 */
function parseBackgroundHex(bgDescription: string): string | null {
  const match = bgDescription.match(/#([0-9A-Fa-f]{6})/)
  return match ? match[0] : null
}

/**
 * Convert hex color string (#RRGGBB) to {r, g, b}.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

/**
 * Deterministic background enforcement for macro/close-up slots.
 *
 * When Gemini fails to match the batch background even after retry,
 * this function replaces the background color using sharp pixel manipulation.
 *
 * Strategy:
 *   1. Sample edge/corner regions to detect the current (wrong) background color.
 *   2. For each pixel, compute color distance from the detected background.
 *   3. Pixels that are "background-like" (close to detected bg) get blended
 *      toward the target background color.
 *   4. Product pixels (far from detected bg color) are untouched.
 *
 * This preserves the macro product texture while correcting the background
 * color deterministically — no AI involved.
 *
 * For macro shots where the background is soft bokeh, this produces a
 * natural-looking color shift with no visible seam.
 */
/**
 * enforceSlotBackground — v38: global background lock enforcement
 *
 * All slots use edge strip sampling (outer 5% of image) for bg detection.
 * v38: all standard slots are full-shoe shots — unified strategy.
 *
 * After detection, background-like pixels are shifted toward the target color.
 * This is a deterministic, AI-free color correction — same hex in, same result out.
 */
async function enforceSlotBackground(
  imageBuffer: Buffer,
  targetHex: string,
  slotName?: string,
): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require('sharp') as typeof import('sharp')

  const metadata = await sharp(imageBuffer).metadata()
  const width  = metadata.width  || 1024
  const height = metadata.height || 1024

  // Extract raw RGB pixel data
  const { data: rawPixels, info } = await sharp(imageBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const channels = info.channels  // should be 3 (RGB)

  // ── Step 1: Detect current background color ──
  // v38: All slots are full-shoe shots — unified edge strip sampling for all.
  // (Previously had corner-only mode for macro slot which no longer exists.)
  let rSum = 0, gSum = 0, bSum = 0, sampleCount = 0

  // EDGE STRIP SAMPLING: outer 5% strips
  const edgeDepth = Math.max(10, Math.round(Math.min(width, height) * 0.05))
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEdge = y < edgeDepth || y >= height - edgeDepth ||
                     x < edgeDepth || x >= width - edgeDepth
      if (!isEdge) continue
      const idx = (y * width + x) * channels
      rSum += rawPixels[idx]
      gSum += rawPixels[idx + 1]
      bSum += rawPixels[idx + 2]
      sampleCount++
    }
  }

  const detectedBg = {
    r: Math.round(rSum / sampleCount),
    g: Math.round(gSum / sampleCount),
    b: Math.round(bSum / sampleCount),
  }

  const targetBg = hexToRgb(targetHex)

  // ── v34: Detect if edge sampling was contaminated by product pixels ──
  // If detected bg is very far from target AND from any reasonable light bg,
  // the detection was contaminated. Fall back to using target directly.
  const detTargetDist = Math.sqrt(
    (detectedBg.r - targetBg.r) ** 2 +
    (detectedBg.g - targetBg.g) ** 2 +
    (detectedBg.b - targetBg.b) ** 2,
  )
  // If the detected bg is > 120 distance from target, detection is likely wrong
  // (product pixels dominating). Use target as "detected" to do a gentle global shift.
  const useDirectTarget = detTargetDist > 120
  const effectiveBg = useDirectTarget ? { ...targetBg } : detectedBg

  console.log(
    `[enforceSlotBackground v38] slot=${slotName || 'unknown'} mode=edge ` +
    `detected=rgb(${detectedBg.r},${detectedBg.g},${detectedBg.b}) ` +
    `target=${targetHex} rgb(${targetBg.r},${targetBg.g},${targetBg.b}) ` +
    `detTargetDist=${detTargetDist.toFixed(0)} useDirectTarget=${useDirectTarget} ` +
    `samples=${sampleCount}`,
  )

  // If detection matches target closely, no correction needed
  if (!useDirectTarget && detTargetDist < 15) {
    console.log(`[enforceSlotBackground v34] ✓ bg already matches target (dist=${detTargetDist.toFixed(0)}) — skipping`)
    return imageBuffer
  }

  // ── Step 2: Replace background-like pixels ──
  // v38: Unified thresholds — all slots are full-shoe studio shots now
  const MAX_BG_DISTANCE = 90
  const BLEND_MARGIN    = 50
  const totalThreshold  = MAX_BG_DISTANCE + BLEND_MARGIN

  const outputPixels = Buffer.from(rawPixels) // copy

  for (let i = 0; i < rawPixels.length; i += channels) {
    const pr = rawPixels[i]
    const pg = rawPixels[i + 1]
    const pb = rawPixels[i + 2]

    // Euclidean distance from this pixel to effective background
    const dr = pr - effectiveBg.r
    const dg = pg - effectiveBg.g
    const db = pb - effectiveBg.b
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)

    if (dist >= totalThreshold) {
      // Product pixel — leave untouched
      continue
    }

    // Blend factor: 1.0 = full replacement (very close to bg), 0.0 = no change
    let blend: number
    if (dist <= MAX_BG_DISTANCE) {
      blend = 1.0
    } else {
      // Soft gradient in the margin zone
      blend = 1.0 - (dist - MAX_BG_DISTANCE) / BLEND_MARGIN
    }

    // Shift this pixel's color toward the target background
    const shiftR = (targetBg.r - effectiveBg.r) * blend
    const shiftG = (targetBg.g - effectiveBg.g) * blend
    const shiftB = (targetBg.b - effectiveBg.b) * blend

    outputPixels[i]     = Math.max(0, Math.min(255, Math.round(pr + shiftR)))
    outputPixels[i + 1] = Math.max(0, Math.min(255, Math.round(pg + shiftG)))
    outputPixels[i + 2] = Math.max(0, Math.min(255, Math.round(pb + shiftB)))
  }

  // ── Step 3: Reconstruct JPEG from modified pixel data ──
  const result = await sharp(outputPixels, {
    raw: { width, height, channels },
  })
    .jpeg({ quality: 92 })
    .toBuffer()

  console.log(`[enforceSlotBackground v34] ✓ background shifted — ${result.length}b`)
  return result
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
    formData.append('quality', 'high')
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
    name: 'side_angle',
    label: 'Slot 1 — 90° Yan Profil (PRIMARY)',
    sceneInstructions:
      `── SHOT: PURE LATERAL SIDE PROFILE ──\n` +
      `Re-photograph this EXACT {COLOR} shoe from the side — same physical object.\n` +
      `CAMERA: Exactly 90° to the side (medial or lateral), at sole level. Looking directly at the side face.\n` +
      `POSITION: Shoe horizontal — toe pointing LEFT, heel on RIGHT.\n` +
      `COMPOSITION: Full shoe from toe tip to heel counter. Entire sole edge visible. Shoe fills 75-80% of image width. Centered. Clean even spacing — NO excessive empty canvas.\n` +
      `MUST SEE: Complete sole profile (toe to heel), arch curve, heel counter height, collar line. The sole silhouette is the dominant visual.\n` +
      `MUST NOT SEE: Toe cap front face (if you can see the front of the toe, the angle is WRONG).\n` +
      `BACKGROUND: {BACKGROUND} Use this EXACT color — identical to all other slots.\n` +
      `LIGHT: Soft studio lighting — key from front-left 45°, fill from opposite. Natural soft shadow. No harsh reflections.\n` +
      `OUTPUT: Full-bleed photograph. No frames, no borders, no margins, no mockup. No watermark, no text, no logo overlay.\n` +
      `THIS IS NOT: a front view, a 3/4 view, a top-down view, a framed image.\n` +
      `COLOR: The shoe is {COLOR}. Output MUST be {COLOR}. Other colors = REJECTED.\n` +
      `DO NOT repeat the reference angle ({REF_ANGLE}). Generate a pure side profile.`,
  },
  {
    name: 'commerce_front',
    label: 'Slot 2 — Ön Stüdyo Hero',
    sceneInstructions:
      `── SHOT: FRONT STUDIO HERO ──\n` +
      `Re-photograph this EXACT {COLOR} shoe from the front — same physical object.\n` +
      `CAMERA: Directly in front of the shoe, lens perpendicular to the toe cap, at mid-shoe height (lacing zone).\n` +
      `POSITION: Shoe upright on sole, centered, toe cap facing camera dead-on. Both sides equally visible (symmetric).\n` +
      `COMPOSITION: Full shoe, 70-80% of image height. Top of collar and sole bottom both visible. Centered. Clean even spacing around shoe — NO excessive empty canvas.\n` +
      `MUST SEE: Toe cap front face, vamp, lace/closure system, collar — the entire FRONT face.\n` +
      `MUST NOT SEE: Heel counter, side profile, sole edge.\n` +
      `BACKGROUND: {BACKGROUND} Use this EXACT color. Do not shift or reinterpret.\n` +
      `LIGHT: Soft studio lighting — overhead softbox + bilateral fill. Natural soft shadow under the shoe only. No harsh reflections.\n` +
      `OUTPUT: Full-bleed photograph. No frames, no borders, no margins, no mockup. No watermark, no text, no logo overlay.\n` +
      `THIS IS NOT: a side view, a 3/4 view, a lifestyle shot, a close-up, a framed image.\n` +
      `COLOR: The shoe is {COLOR}. Output MUST be {COLOR}. Other colors = REJECTED.\n` +
      `DO NOT repeat the reference angle ({REF_ANGLE}). Generate a clean front hero.`,
  },
  {
    name: 'close_shot_hero',
    label: 'Slot 3 — 3/4 Yakın Hero',
    sceneInstructions:
      `── SHOT: 3/4 FRONT CLOSE HERO ──\n` +
      `Re-photograph this EXACT {COLOR} shoe from a front-side angle at tighter framing — same physical object.\n` +
      `CAMERA: Low to mid height, 30–45° from the front-side. The lens captures the vamp, toe shape, and lacing/closure zone as the dominant features, with one side of the shoe also visible.\n` +
      `POSITION: Shoe upright on sole, angled so the toe-vamp area faces the camera. Toe pointing slightly toward camera.\n` +
      `COMPOSITION: Full shoe visible from toe to heel — tighter framing than side_angle but the ENTIRE shoe is still in frame. Shoe fills 78-85% of image height. Centered. Clean even spacing — NO excessive empty canvas.\n` +
      `MUST SEE: Toe shape and toe cap detail, vamp surface texture, lacing or closure system, one side of the upper. The front-quarter of the shoe is the hero.\n` +
      `MUST NOT SEE: Heel counter as dominant (that would be a back view). Do NOT crop or hide any part of the shoe.\n` +
      `BACKGROUND: {BACKGROUND} Use this EXACT color — identical to all other slots in this batch. Same studio, same backdrop, same color.\n` +
      `LIGHT: Soft studio lighting — key from front-left 45°, fill from opposite side. Natural soft shadow under the shoe. No harsh reflections. Rich, warm tones.\n` +
      `OUTPUT: Full-bleed photograph. No frames, no borders, no margins, no mockup. No watermark, no text, no logo overlay.\n` +
      `THIS IS NOT: a pure front dead-on view, a pure side profile, a macro close-up, a top-down view, a back view, a framed image.\n` +
      `COLOR: The shoe is {COLOR}. Output MUST be {COLOR}. Other colors = REJECTED.\n` +
      `DO NOT repeat the reference angle ({REF_ANGLE}). Generate a clean 3/4 front close hero.`,
  },
  {
    name: 'tabletop_editorial',
    label: 'Slot 4 — Editoryal Üstten',
    sceneInstructions:
      `── SHOT: OVERHEAD EDITORIAL ──\n` +
      `Re-photograph this EXACT {COLOR} shoe from an elevated angle — same physical object.\n` +
      `CAMERA: Above and in front, looking DOWN at 55–65°. Three-quarter overhead perspective.\n` +
      `POSITION: Shoe resting upright on a clean premium surface.\n` +
      `COMPOSITION: Full shoe visible from above-front. Top face dominant (tongue, lacing from above, toe from overhead). Shoe fills 65-75% of image area. Centered. No props. NO excessive empty canvas.\n` +
      `MUST SEE: Tongue, lace pattern from above, toe shape from overhead, upper opening. This reveals parts invisible in front/side views.\n` +
      `MUST NOT SEE: The front face of the toe (that's slot 1), the side profile (that's slot 2).\n` +
      `BACKGROUND: {BACKGROUND} Use this EXACT color — identical to all other slots in this batch. The surface the shoe rests on should be clean and premium but the dominant visible background color MUST match the other slots exactly. No gradient, no tone shift, no reinterpretation.\n` +
      `LIGHT: Soft diffused studio light from upper-left. Gentle natural shadow lower-right. No harsh reflections.\n` +
      `OUTPUT: Full-bleed photograph. No frames, no borders, no margins, no mockup. No watermark, no text, no logo overlay.\n` +
      `THIS IS NOT: a front hero, a side profile, a close-up macro, a framed image.\n` +
      `COLOR: The shoe is {COLOR}. Output MUST be {COLOR}. Other colors = REJECTED.\n` +
      `DO NOT repeat the reference angle ({REF_ANGLE}). Generate an overhead editorial.`,
  },
  {
    name: 'worn_lifestyle',
    label: 'Slot 5 — Lifestyle Giyilmiş',
    sceneInstructions:
      `── SHOT: LIFESTYLE — SHOE WORN ON A FOOT ──\n` +
      `Re-photograph this EXACT {COLOR} shoe in a lifestyle worn setting — same physical object.\n` +
      `CAMERA: Low ground level, 10–15 cm above floor, to the side of the foot.\n` +
      `COMPOSITION: One foot wearing the shoe. Full shoe visible with lower leg/ankle above collar. Ground surface in lower frame. Shoe fills 65-75% of image area. Centered. NO excessive empty canvas.\n` +
      `MUST SEE: The shoe ON a foot in natural weight-bearing position, ground contact, ankle/lower leg.\n` +
      `MUST NOT SEE: Face, upper body. The shoe is the hero — the person is secondary.\n` +
      `BACKGROUND: {BACKGROUND} This is the SAME EXACT background color as all other slots in this batch. In this lifestyle shot the background appears as warm soft bokeh, but the DOMINANT COLOR TONE must match the batch background exactly. Do NOT introduce green, blue, or any color not specified. The blurred environment must read as the same color family as the studio backdrop.\n` +
      `LIGHT: Warm natural golden-hour side light. Authentic, non-studio. Soft shadows. No harsh reflections.\n` +
      `EXPOSURE CRITICAL: Golden-hour light must NOT wash out the shoe. Keep the shoe properly exposed — leather detail, color accuracy, and texture must be fully visible. Avoid overblown sunlit areas on the shoe surface. The shoe is the subject, not a silhouette.\n` +
      `OUTPUT: Full-bleed photograph. No frames, no borders, no margins, no mockup. No watermark, no text, no logo overlay.\n` +
      `THIS IS NOT: an isolated product shot, a studio photo, an overhead view, a framed image.\n` +
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
  _additionalImages?: Array<{ data: Buffer; mime: string }>, // reserved — OpenAI path uses only primary ref
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
      `[generateByEditing v12] input=${referenceImage.length}b ` +
      `color=${identityLock.mainColor} refAngle=${identityLock.referenceAngle || '?'} ` +
      `scenes=${scenes.map((s) => s.name).join(',')}`,
    )

    // ── Compute batch background FIRST so padding matches the target bg ──
    // BUG FIX v29: white padding caused the model to reproduce white borders.
    const mainColor    = identityLock.mainColor
    const refAngle     = identityLock.referenceAngle || 'unknown'
    const zoneBlock    = identityLock.protectedZoneBlock || ''
    const hasBrandZones = geminiKey && (identityLock.protectedZones?.length ?? 0) > 0
    const premiumBackground = getBackgroundForColor(mainColor)
    const padHex = parseBackgroundHex(premiumBackground) || '#EDEDED'
    const padRgb = hexToRgb(padHex)

    console.log(
      `[generateByEditing v12] protected zones: ${hasBrandZones ? (identityLock.protectedZones?.map((z) => z.name).join(',')) : 'none'}`,
    )

    // Resize shoe to 768×768 then pad to 1024×1024 using batch bg color (not white)
    const innerBuffer = await sharp(referenceImage)
      .resize(768, 768, { fit: 'contain', background: { r: padRgb.r, g: padRgb.g, b: padRgb.b, alpha: 1 } })
      .png()
      .toBuffer()

    const pngBuffer = await sharp(innerBuffer)
      .extend({
        top: 128, bottom: 128, left: 128, right: 128,
        background: { r: padRgb.r, g: padRgb.g, b: padRgb.b, alpha: 1 },
      })
      .png()
      .toBuffer()

    console.log(`[generateByEditing v29] PNG 1024×1024 ready — ${pngBuffer.length}b padColor=${padHex}`)

    for (const scene of scenes) {
      // Replace placeholders in scene instructions
      const sceneText = scene.sceneInstructions
        .replace(/\{COLOR\}/g, mainColor)
        .replace(/\{REF_ANGLE\}/g, refAngle)
        .replace(/\{BACKGROUND\}/g, premiumBackground)

      // Prompt structure (order matters for model attention):
      //   1. TASK_FRAMING_BLOCK — "you are re-photographing an existing product"
      //   2. identityLock.promptBlock — product identity + color lock + per-field prohibitions
      //   3. zoneBlock — protected brand zones
      //   4. sceneText — camera angle, framing, background, lighting
      //   5. CANONICAL_PROHIBITIONS_BLOCK — 11 canonical prohibitions from productPreservation.ts
      const fullPrompt = TASK_FRAMING_BLOCK + identityLock.promptBlock + zoneBlock + sceneText + CANONICAL_PROHIBITIONS_BLOCK

      const slotLog: SlotLog = {
        slot: scene.name,
        label: scene.label,
        provider: 'gpt-image-edit',
        attempts: 0,
        success: false,
      }

      let finalBuf: Buffer | null = null

      // ── Attempt 1 ──────────────────────────────────────────────────────────
      slotLog.attempts = 1
      let rawBuf = await callGPTImageEdit(pngBuffer, fullPrompt, apiKey)

      if (rawBuf) {
        const jpegBuf = await sharp(rawBuf).jpeg({ quality: 92 }).toBuffer()

        if (geminiKey) {
          // ── Step D1: Color check ─────────────────────────────────────────
          const colorCheck = await checkColorMatch(jpegBuf, mainColor, geminiKey)
          slotLog.colorCheckPass = colorCheck.match
          slotLog.detectedColor  = colorCheck.detectedColor

          // ── Step D2: Brand fidelity check (v12, only when zones were extracted) ──
          let brandCheck: BrandFidelityResult | null = null
          if (hasBrandZones) {
            brandCheck = await checkBrandFidelity(jpegBuf, identityLock.protectedZones!, geminiKey)
            slotLog.brandFidelityPass  = brandCheck.pass
            slotLog.brandFidelityScore = brandCheck.overallScore
            slotLog.brandFidelityNotes = brandCheck.reinforcementHint || undefined
          }

          // ── Step D5: Brightness check (v30) ─────────────────────────
          const brightnessCheck = await checkBrightnessExposure(jpegBuf, scene.name)
          slotLog.brightnessCheckPass = brightnessCheck.pass
          slotLog.meanBrightness = brightnessCheck.meanBrightness
          slotLog.highlightPercent = brightnessCheck.highlightPercent

          const needsRetry = !colorCheck.match || (brandCheck !== null && !brandCheck.pass) || !brightnessCheck.pass

          if (needsRetry) {
            // ── Build combined reinforcement preamble ────────────────────
            const correctionLines: string[] = []
            if (!colorCheck.match) {
              correctionLines.push(
                `CRITICAL COLOR CORRECTION: The previous output was ${colorCheck.detectedColor} ` +
                `but the shoe MUST be ${mainColor}. ${colorCheck.detectedColor} is WRONG. ` +
                `This is a ${mainColor} shoe — generate a ${mainColor} shoe.`,
              )
            }
            if (brandCheck && !brandCheck.pass && brandCheck.reinforcementHint) {
              correctionLines.push(
                `CRITICAL BRAND FIDELITY CORRECTION: ${brandCheck.reinforcementHint} ` +
                `Do NOT invent fake brand text, logos, or marks. ` +
                `Reproduce the exact original branding zones described above.`,
              )
            }
            if (!brightnessCheck.pass && brightnessCheck.correctionHint) {
              correctionLines.push(brightnessCheck.correctionHint)
            }
            const reinforcedPrompt = correctionLines.join('\n') + '\n\n' + fullPrompt

            console.warn(
              `[generateByEditing v12] ✗ ${scene.name} fidelity issues — ` +
              `color=${colorCheck.match} brand=${brandCheck?.pass ?? 'skip'} — retrying`,
            )
            slotLog.attempts = 2
            await sleep(2000)

            // ── Attempt 2 (reinforced) ────────────────────────────────────
            rawBuf = await callGPTImageEdit(pngBuffer, reinforcedPrompt, apiKey)
            if (rawBuf) {
              const retryJpeg = await sharp(rawBuf).jpeg({ quality: 92 }).toBuffer()

              // Re-check color
              const retryColor = await checkColorMatch(retryJpeg, mainColor, geminiKey)
              slotLog.colorCheckPass = retryColor.match
              slotLog.detectedColor  = retryColor.detectedColor

              // Re-check brand fidelity
              if (hasBrandZones) {
                const retryBrand = await checkBrandFidelity(retryJpeg, identityLock.protectedZones!, geminiKey)
                slotLog.brandFidelityPass  = retryBrand.pass
                slotLog.brandFidelityScore = retryBrand.overallScore
                slotLog.brandFidelityNotes = retryBrand.reinforcementHint || undefined
              }

              // Re-check brightness on retry
              if (!brightnessCheck.pass) {
                const retryBrightness = await checkBrightnessExposure(retryJpeg, scene.name)
                slotLog.brightnessCheckPass = retryBrightness.pass
                slotLog.meanBrightness = retryBrightness.meanBrightness
                slotLog.highlightPercent = retryBrightness.highlightPercent
              }

              // Build rejection reason summary if still failing after retry
              const warnings: string[] = []
              if (!retryColor.match) warnings.push(`color drift: expected ${mainColor} got ${retryColor.detectedColor}`)
              if (slotLog.brandFidelityPass === false) warnings.push(`brand zones drifted: ${slotLog.brandFidelityNotes || 'unknown'}`)
              if (slotLog.brightnessCheckPass === false) warnings.push(`overexposed: mean=${slotLog.meanBrightness}/255 highlight=${slotLog.highlightPercent}%`)
              if (warnings.length > 0) slotLog.rejectionReason = warnings.join('; ')

              // Accept image regardless — operator can judge from preview
              finalBuf = retryJpeg

              if (warnings.length === 0) {
                console.log(`[generateByEditing v12] ✓ ${scene.name} retry resolved all issues`)
              } else {
                console.warn(`[generateByEditing v12] ⚠ ${scene.name} retry still has issues: ${slotLog.rejectionReason}`)
              }
            }
          } else {
            // First attempt passed all checks
            if (hasBrandZones) {
              console.log(`[generateByEditing v12] ✓ ${scene.name} color+brand ok on first attempt`)
            }
            finalBuf = jpegBuf
          }
        } else {
          // No Gemini key — skip all fidelity checks, accept image
          finalBuf = jpegBuf
        }
      } else {
        // Generation returned null — simple null retry (no fidelity check on null)
        console.warn(`[generateByEditing v12] ✗ ${scene.name} null on attempt 1 — retrying`)
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
          `[generateByEditing v12] ✓ ${scene.name} — ${finalBuf.length}b ` +
          `(attempts=${slotLog.attempts} color=${slotLog.colorCheckPass ?? 'skip'} ` +
          `brand=${slotLog.brandFidelityPass ?? 'skip'})`,
        )
      } else {
        const msg = `${scene.name}: null after ${slotLog.attempts} attempts`
        result.errors.push(msg)
        slotLog.rejectionReason = slotLog.rejectionReason || msg
        console.warn(`[generateByEditing v12] ✗ ${msg}`)
      }

      slotLogs.push(slotLog)
      await sleep(1000)
    }
  } catch (err) {
    const msg = `Pipeline fatal: ${err instanceof Error ? err.message : err}`
    console.error(`[generateByEditing v12] ${msg}`)
    result.errors.push(msg)
  }

  const slotSummary = slotLogs.map((s) => {
    if (!s.success) return '✗'
    if (s.colorCheckPass === false || s.brandFidelityPass === false) return '⚠'
    return '✓'
  }).join('')
  console.log(`[generateByEditing v12] done — ${result.successCount}/${result.promptCount} [${slotSummary}]`)

  return { results: [result], buffers: result.buffers, slotLogs }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini Pro Image Generation (v14 — optional premium provider)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call Gemini image generation model with a reference image + prompt.
 *
 * Model is read from env GEMINI_IMAGE_GEN_MODEL, defaulting to
 * 'gemini-2.5-flash-image' (stable Nano Banana model).
 *
 * Supported alternatives (set via env var):
 *   - gemini-3-pro-image-preview  (strongest quality, preview)
 *   - gemini-3.1-flash-image-preview (fast/efficient, preview)
 *   - gemini-2.5-flash-image (stable, default)
 *
 * API shape: generateContent with responseModalities: ['IMAGE', 'TEXT'].
 * Reference image sent as inlineData (PNG) for style/identity conditioning.
 *
 * To override the model, set GEMINI_IMAGE_GEN_MODEL in Vercel env vars.
 * If the model returns an error or no image part, the function returns null
 * and the caller logs the failure.
 */
async function callGeminiImageGenerate(
  pngBuffer: Buffer,
  prompt: string,
  apiKey: string,
  additionalImages?: Array<{ data: Buffer; mime: string }>,
): Promise<Buffer> {
  const model = process.env.GEMINI_IMAGE_GEN_MODEL || 'gemini-2.5-flash-image'

  // Build parts: text prompt first, then primary reference image, then any additional refs.
  // Multiple reference images give the model a richer view of the product (e.g. front + side).
  const requestParts: Array<Record<string, unknown>> = [
    { text: prompt },
    { inlineData: { mimeType: 'image/png', data: pngBuffer.toString('base64') } },
  ]
  if (additionalImages) {
    for (const img of additionalImages.slice(0, 2)) {
      requestParts.push({
        inlineData: { mimeType: img.mime, data: img.data.toString('base64') },
      })
    }
  }

  try {
    console.log(
      `[GeminiImageGenerate] POST model=${model} promptLen=${prompt.length}` +
      (additionalImages?.length ? ` +${additionalImages.length} additional ref(s)` : ''),
    )

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: requestParts,
          }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        }),
      },
    )

    if (!res.ok) {
      const errText = await res.text()
      // Parse for a human-readable error message if the response is JSON
      let errDetail = errText.slice(0, 300)
      try {
        const errJson = JSON.parse(errText)
        const msg = errJson?.error?.message as string | undefined
        if (msg) errDetail = msg.slice(0, 200)
      } catch { /* not JSON */ }
      const fullErr = `HTTP ${res.status} model=${model}: ${errDetail}`
      console.error(`[GeminiImageGenerate] ${fullErr}`)
      // Throw instead of returning null so callers can surface the real error to Telegram
      throw new Error(fullErr)
    }

    const data = await res.json()

    // Surface finish_reason if generation was blocked (safety, recitation, etc.)
    const finishReason = data?.candidates?.[0]?.finishReason as string | undefined
    if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
      const msg = `Gemini blocked finishReason=${finishReason} model=${model}`
      console.warn(`[GeminiImageGenerate] ${msg}`)
      throw new Error(msg)
    }

    const parts: unknown[] = data?.candidates?.[0]?.content?.parts ?? []

    // Find the image part in the response
    for (const part of parts) {
      const p = part as Record<string, unknown>
      const inlineData = p?.inlineData as Record<string, string> | undefined
      if (inlineData?.data) {
        const buf = Buffer.from(inlineData.data, 'base64')
        console.log(`[GeminiImageGenerate] ✓ ${buf.length}b (${inlineData.mimeType || 'image/*'})`)
        return buf
      }
    }

    const noImageMsg = `No image part in response (parts=${parts.length} finishReason=${finishReason ?? 'none'} model=${model})`
    console.error(`[GeminiImageGenerate] ${noImageMsg}`)
    throw new Error(noImageMsg)
  } catch (err) {
    // Re-throw so generateByGeminiPro can catch it per-slot and surface to Telegram
    throw err instanceof Error ? err : new Error(String(err))
  }
}

/**
 * OPTIONAL PREMIUM PROVIDER (v14): Gemini Pro image generation pipeline.
 *
 * Drop-in replacement for generateByEditing() — same signature, same scene
 * definitions, same color/brand checks. Differs only in the underlying
 * image generation API call (Gemini Pro vs OpenAI gpt-image-1).
 *
 * Selection: pass sceneIndices + call from imageGenTask when provider='gemini-pro'.
 * Default provider remains OpenAI (generateByEditing). This is additive only.
 *
 * Use cases: premium editorial slots, logo/text-sensitive benchmarking,
 * difficult branded products where higher-resolution output helps.
 *
 * @param referenceImage    Raw bytes of the product photo
 * @param referenceImageMime MIME type
 * @param identityLock      Full IdentityLock object
 * @param sceneIndices      Which EDITING_SCENES to run (0-based). Default: all 5.
 */
export async function generateByGeminiPro(
  referenceImage: Buffer,
  referenceImageMime: string,
  identityLock: IdentityLock,
  sceneIndices?: number[],
  additionalImages?: Array<{ data: Buffer; mime: string }>,
): Promise<{ results: ProviderResult[]; buffers: Buffer[]; slotLogs: SlotLog[] }> {
  const scenes = sceneIndices
    ? EDITING_SCENES.filter((_, i) => sceneIndices.includes(i))
    : [...EDITING_SCENES]

  const modelId = process.env.GEMINI_IMAGE_GEN_MODEL || 'gemini-2.5-flash-image'

  const result: ProviderResult = {
    provider: `gemini-pro-image:${modelId}`,
    promptCount: scenes.length,
    successCount: 0,
    buffers: [],
    errors: [],
  }

  const slotLogs: SlotLog[] = []
  const geminiKey = process.env.GEMINI_API_KEY

  if (!geminiKey) {
    const msg = 'GEMINI_API_KEY not set — Gemini Pro generation impossible'
    console.error(`[generateByGeminiPro] ${msg}`)
    result.errors.push(msg)
    return { results: [result], buffers: [], slotLogs }
  }

  // ── v34: Hoist batch background to function scope for post-loop consistency check ──
  const premiumBackground = getBackgroundForColor(identityLock.mainColor)
  const batchBgHex = parseBackgroundHex(premiumBackground) || '#EDEDED'

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as typeof import('sharp')
    console.log(
      `[generateByGeminiPro v14] model=${modelId} input=${referenceImage.length}b ` +
      `color=${identityLock.mainColor} refAngle=${identityLock.referenceAngle || '?'} ` +
      `scenes=${scenes.map((s) => s.name).join(',')}`,
    )

    // ── Compute batch background FIRST so padding matches the target bg ──
    // BUG FIX v29: Previously padding was white (#FFFFFF), which caused Gemini
    // to reproduce white borders in its output ("inset" / "floating canvas" look).
    // Now padding uses the actual batch background color so the model sees the
    // correct context color around the shoe — no white border to reproduce.
    const mainColor   = identityLock.mainColor
    const refAngle    = identityLock.referenceAngle || 'unknown'
    const zoneBlock   = identityLock.protectedZoneBlock || ''
    const hasBrandZones = (identityLock.protectedZones?.length ?? 0) > 0

    const padHex = batchBgHex
    const padRgb = hexToRgb(padHex)

    // Resize shoe to 768×768 then pad to 1024×1024 using batch background color
    const innerBuffer = await sharp(referenceImage)
      .resize(768, 768, { fit: 'contain', background: { r: padRgb.r, g: padRgb.g, b: padRgb.b, alpha: 1 } })
      .png()
      .toBuffer()

    const pngBuffer = await sharp(innerBuffer)
      .extend({
        top: 128, bottom: 128, left: 128, right: 128,
        background: { r: padRgb.r, g: padRgb.g, b: padRgb.b, alpha: 1 },
      })
      .png()
      .toBuffer()

    console.log(`[generateByGeminiPro v29] PNG 1024×1024 ready — ${pngBuffer.length}b padColor=${padHex}`)
    const multiAngleBlock = buildMultiAngleBlock(additionalImages?.length || 0)

    for (const scene of scenes) {
      const sceneText = scene.sceneInstructions
        .replace(/\{COLOR\}/g, mainColor)
        .replace(/\{REF_ANGLE\}/g, refAngle)
        .replace(/\{BACKGROUND\}/g, premiumBackground)

      // 6-block prompt structure:
      //   1. TASK_FRAMING_BLOCK — task framing + normalization rules
      //   2. multiAngleBlock — multi-angle reference framing (if applicable)
      //   3. identityLock.promptBlock — product identity + color lock
      //   4. zoneBlock — protected brand zones
      //   5. sceneText — camera angle, framing, background, lighting
      //   6. CANONICAL_PROHIBITIONS_BLOCK — master prohibitions
      const fullPrompt = TASK_FRAMING_BLOCK + multiAngleBlock + identityLock.promptBlock + zoneBlock + sceneText + CANONICAL_PROHIBITIONS_BLOCK

      const slotLog: SlotLog = {
        slot: scene.name,
        label: scene.label,
        provider: `gemini-pro-image:${modelId}`,
        attempts: 0,
        success: false,
      }

      let finalBuf: Buffer | null = null

      // ── v37: Centering retry loop for hero slots ──
      // Hero slots (side_angle, commerce_front) must pass centering QC after
      // all post-processing. If the final image is still off-center beyond
      // MAX_CENTER_OFFSET_PCT, the entire slot is regenerated (up to 3 cycles).
      const isHeroSlot = CENTERING_QC_SLOTS.has(scene.name)
      const MAX_CENTERING_CYCLES = isHeroSlot ? 3 : 1
      let centerCycle = 0

      for (centerCycle = 1; centerCycle <= MAX_CENTERING_CYCLES; centerCycle++) {
        finalBuf = null

        if (centerCycle > 1) {
          console.log(`[generateByGeminiPro v37] ${scene.name} centering cycle ${centerCycle}/${MAX_CENTERING_CYCLES} — regenerating`)
          await sleep(2000) // rate limit between full regeneration cycles
        }

      // ── Per-slot try/catch: one slot failure must not abort remaining slots ──
      // callGeminiImageGenerate now throws on API error — catch per slot so the
      // error message is captured in slotLog.rejectionReason and surfaced to Telegram.
      try {
        // ── Attempt 1 ──────────────────────────────────────────────────────────
        slotLog.attempts = (centerCycle - 1) * 2 + 1 // track total API calls across cycles
        let rawBuf = await callGeminiImageGenerate(pngBuffer, fullPrompt, geminiKey, additionalImages)

        const jpegBuf = await sharp(rawBuf).jpeg({ quality: 92 }).toBuffer()

        // Step D1: Color check
        const colorCheck = await checkColorMatch(jpegBuf, mainColor, geminiKey)
        slotLog.colorCheckPass = colorCheck.match
        slotLog.detectedColor  = colorCheck.detectedColor

        // Step D2: Brand fidelity check
        let brandCheck: BrandFidelityResult | null = null
        if (hasBrandZones) {
          brandCheck = await checkBrandFidelity(jpegBuf, identityLock.protectedZones!, geminiKey)
          slotLog.brandFidelityPass  = brandCheck.pass
          slotLog.brandFidelityScore = brandCheck.overallScore
          slotLog.brandFidelityNotes = brandCheck.reinforcementHint || undefined
        }

        // Step D3: Shot compliance check (v20)
        const shotCheck = await checkShotCompliance(jpegBuf, scene.name, geminiKey)
        slotLog.shotCompliancePass = shotCheck.pass
        slotLog.detectedShot = shotCheck.detectedShot

        // Step D4: Per-slot background check (v28)
        const bgCheck = await checkSlotBackground(jpegBuf, premiumBackground, scene.name, geminiKey)
        slotLog.bgCheckPass = bgCheck.pass
        slotLog.detectedBackground = bgCheck.detectedBackground

        // Step D5: Brightness / overexposure check (v30)
        const brightnessCheck = await checkBrightnessExposure(jpegBuf, scene.name)
        slotLog.brightnessCheckPass = brightnessCheck.pass
        slotLog.meanBrightness = brightnessCheck.meanBrightness
        slotLog.highlightPercent = brightnessCheck.highlightPercent

        const needsRetry = !colorCheck.match || (brandCheck !== null && !brandCheck.pass) || !shotCheck.pass || !bgCheck.pass || !brightnessCheck.pass

        if (needsRetry) {
          const correctionLines: string[] = []
          if (!colorCheck.match) {
            correctionLines.push(
              `CRITICAL COLOR CORRECTION: The previous output was ${colorCheck.detectedColor} ` +
              `but the shoe MUST be ${mainColor}. Generate a ${mainColor} shoe.`,
            )
          }
          if (brandCheck && !brandCheck.pass && brandCheck.reinforcementHint) {
            correctionLines.push(
              `CRITICAL BRAND FIDELITY CORRECTION: ${brandCheck.reinforcementHint} ` +
              `Do NOT invent fake brand text, logos, or marks.`,
            )
          }
          if (!shotCheck.pass && shotCheck.correctionHint) {
            correctionLines.push(shotCheck.correctionHint)
          }
          if (!bgCheck.pass && bgCheck.correctionHint) {
            correctionLines.push(bgCheck.correctionHint)
          }
          if (!brightnessCheck.pass && brightnessCheck.correctionHint) {
            correctionLines.push(brightnessCheck.correctionHint)
          }
          const reinforcedPrompt = correctionLines.join('\n') + '\n\n' + fullPrompt

          console.warn(
            `[generateByGeminiPro v29] ✗ ${scene.name} fidelity issues — ` +
            `color=${colorCheck.match} brand=${brandCheck?.pass ?? 'skip'} ` +
            `shot=${shotCheck.pass} bg=${bgCheck.pass} ` +
            `(bgDetected="${bgCheck.detectedBackground.slice(0, 60)}") — retrying`,
          )
          slotLog.attempts = (centerCycle - 1) * 2 + 2
          await sleep(2000)

          rawBuf = await callGeminiImageGenerate(pngBuffer, reinforcedPrompt, geminiKey, additionalImages)
          const retryJpeg = await sharp(rawBuf).jpeg({ quality: 92 }).toBuffer()

          const retryColor = await checkColorMatch(retryJpeg, mainColor, geminiKey)
          slotLog.colorCheckPass = retryColor.match
          slotLog.detectedColor  = retryColor.detectedColor

          if (hasBrandZones) {
            const retryBrand = await checkBrandFidelity(retryJpeg, identityLock.protectedZones!, geminiKey)
            slotLog.brandFidelityPass  = retryBrand.pass
            slotLog.brandFidelityScore = retryBrand.overallScore
            slotLog.brandFidelityNotes = retryBrand.reinforcementHint || undefined
          }

          // Re-check shot on retry (only if first attempt failed shot check)
          if (!shotCheck.pass) {
            const retryShotCheck = await checkShotCompliance(retryJpeg, scene.name, geminiKey)
            slotLog.shotCompliancePass = retryShotCheck.pass
            slotLog.detectedShot = retryShotCheck.detectedShot
          }

          // Re-check background on retry (only if first attempt failed bg check)
          if (!bgCheck.pass) {
            const retryBgCheck = await checkSlotBackground(retryJpeg, premiumBackground, scene.name, geminiKey)
            slotLog.bgCheckPass = retryBgCheck.pass
            slotLog.detectedBackground = retryBgCheck.detectedBackground
          }

          // Re-check brightness on retry (only if first attempt failed brightness check)
          if (!brightnessCheck.pass) {
            const retryBrightness = await checkBrightnessExposure(retryJpeg, scene.name)
            slotLog.brightnessCheckPass = retryBrightness.pass
            slotLog.meanBrightness = retryBrightness.meanBrightness
            slotLog.highlightPercent = retryBrightness.highlightPercent
          }

          const warnings: string[] = []
          if (!retryColor.match) warnings.push(`color drift: expected ${mainColor} got ${retryColor.detectedColor}`)
          if (slotLog.brandFidelityPass === false) warnings.push(`brand zones drifted: ${slotLog.brandFidelityNotes || 'unknown'}`)
          if (slotLog.shotCompliancePass === false) warnings.push(`angle wrong: got "${slotLog.detectedShot || 'unknown'}"`)
          if (slotLog.bgCheckPass === false) warnings.push(`background drift: got "${slotLog.detectedBackground || 'unknown'}" expected batch bg`)
          if (slotLog.brightnessCheckPass === false) warnings.push(`overexposed: mean=${slotLog.meanBrightness}/255 highlight=${slotLog.highlightPercent}%`)
          if (warnings.length > 0) slotLog.rejectionReason = warnings.join('; ')

          finalBuf = retryJpeg

          // ── Step D5: Deterministic background enforcement (v28) ──────────
          // If background STILL drifts after retry, fix it in post-processing.
          // Only applied to slots that still fail bg check after retry.
          if (slotLog.bgCheckPass === false && finalBuf) {
            const bgHex = parseBackgroundHex(premiumBackground)
            if (bgHex) {
              try {
                console.log(`[generateByGeminiPro v29] bg still drifted on ${scene.name} after retry — enforcing ${bgHex} via post-process`)
                finalBuf = await enforceSlotBackground(finalBuf, bgHex, scene.name)
                slotLog.bgCheckPass = true // mark as corrected
                ;(slotLog as Record<string, unknown>).bgEnforced = true
                // Remove bg warning from rejection reason since we fixed it
                const filteredWarnings = warnings.filter((w) => !w.startsWith('background drift'))
                slotLog.rejectionReason = filteredWarnings.length > 0 ? filteredWarnings.join('; ') : undefined
                console.log(`[generateByGeminiPro v29] ✓ ${scene.name} background enforced via post-process`)
              } catch (enforceErr) {
                console.warn(`[generateByGeminiPro v29] bg enforcement failed for ${scene.name}:`, enforceErr instanceof Error ? enforceErr.message : enforceErr)
                // Keep the retried image as-is — don't lose it
              }
            }
          }

          // v35: conditional brightness enforcement removed from retry branch.
          // Brightness normalization is now UNCONDITIONAL on all slots (see below).
        } else {
          finalBuf = jpegBuf
        }
      } catch (slotErr) {
        // API error or generation block — capture the real reason per slot
        const slotErrMsg = slotErr instanceof Error ? slotErr.message : String(slotErr)
        slotLog.rejectionReason = slotErrMsg
        console.warn(`[generateByGeminiPro v14] ✗ ${scene.name} failed: ${slotErrMsg}`)
        result.errors.push(`${scene.name}: ${slotErrMsg}`)
      }

      // ── v29: UNCONDITIONAL background enforcement on every successful slot ──
      if (finalBuf) {
        const bgHex = parseBackgroundHex(premiumBackground)
        if (bgHex) {
          try {
            finalBuf = await enforceSlotBackground(finalBuf, bgHex, scene.name)
            ;(slotLog as Record<string, unknown>).bgEnforced = true
            console.log(`[generateByGeminiPro v34] ✓ ${scene.name} bg enforced to ${bgHex}`)
          } catch (enforceErr) {
            console.warn(`[generateByGeminiPro v29] bg enforcement failed for ${scene.name}:`, enforceErr instanceof Error ? enforceErr.message : enforceErr)
          }
        }
      }

      // ── v33: UNCONDITIONAL frame detection & auto-crop on every successful slot ──
      if (finalBuf) {
        try {
          const frameResult = await detectAndRemoveFrame(finalBuf, scene.name)
          if (frameResult.frameDetected) {
            finalBuf = frameResult.buffer
            ;(slotLog as Record<string, unknown>).frameCropped = true
            console.log(`[generateByGeminiPro v33] ✓ ${scene.name} frame detected and cropped`)
          }
        } catch (frameErr) {
          console.warn(`[generateByGeminiPro v33] frame detection failed for ${scene.name}:`, frameErr instanceof Error ? frameErr.message : frameErr)
        }
      }

      // ── v35: UNCONDITIONAL brightness normalization on every successful slot ──
      if (finalBuf) {
        try {
          const bgHexForNorm = parseBackgroundHex(premiumBackground) || undefined
          finalBuf = await normalizeBrightness(finalBuf, bgHexForNorm)
          ;(slotLog as Record<string, unknown>).brightnessNormalized = true
        } catch (normErr) {
          console.warn(`[generateByGeminiPro v37] brightness normalization failed for ${scene.name}:`, normErr instanceof Error ? normErr.message : normErr)
        }
      }

      // ── v36: UNCONDITIONAL product centering on every successful slot ──
      if (finalBuf) {
        try {
          const bgHexForCenter = parseBackgroundHex(premiumBackground) || undefined
          finalBuf = await centerProduct(finalBuf, bgHexForCenter, scene.name)
          ;(slotLog as Record<string, unknown>).centered = true
        } catch (centerErr) {
          console.warn(`[generateByGeminiPro v37] centering failed for ${scene.name}:`, centerErr instanceof Error ? centerErr.message : centerErr)
        }
      }

      // ── v37: CENTERING QC — hard gate for hero slots ──
      // After ALL post-processing, measure final centering. If product is still
      // off-center beyond MAX_CENTER_OFFSET_PCT, reject and regenerate.
      if (isHeroSlot && finalBuf) {
        try {
          const bgHexForQC = parseBackgroundHex(premiumBackground) || undefined
          const centerQC = await measureCentering(finalBuf, bgHexForQC, scene.name)
          slotLog.centeringPass = centerQC.pass
          slotLog.centeringOffsetX = centerQC.offsetXPct
          slotLog.centeringOffsetY = centerQC.offsetYPct

          if (centerQC.pass) {
            console.log(
              `[generateByGeminiPro v37] ✓ ${scene.name} centering QC passed ` +
              `(X=${centerQC.offsetXPct}% Y=${centerQC.offsetYPct}%) on cycle ${centerCycle}`,
            )
            break // ← exit centering retry loop — slot is good
          }

          // Failed centering QC
          if (centerCycle < MAX_CENTERING_CYCLES) {
            console.warn(
              `[generateByGeminiPro v37] ✗ ${scene.name} centering QC FAILED ` +
              `(X=${centerQC.offsetXPct}% Y=${centerQC.offsetYPct}% > ${MAX_CENTER_OFFSET_PCT}%) ` +
              `cycle ${centerCycle}/${MAX_CENTERING_CYCLES} — will regenerate`,
            )
            continue // ← retry the entire generation cycle
          }

          // Max cycles reached — accept with warning
          console.warn(
            `[generateByGeminiPro v37] ⚠ ${scene.name} centering QC FAILED after ` +
            `${MAX_CENTERING_CYCLES} cycles (X=${centerQC.offsetXPct}% Y=${centerQC.offsetYPct}%) ` +
            `— accepting best attempt`,
          )
          const centerWarning = `centering: X=${centerQC.offsetXPct}% Y=${centerQC.offsetYPct}% (>${MAX_CENTER_OFFSET_PCT}%)`
          slotLog.rejectionReason = slotLog.rejectionReason
            ? slotLog.rejectionReason + '; ' + centerWarning
            : centerWarning
        } catch (qcErr) {
          console.warn(`[generateByGeminiPro v37] centering QC error for ${scene.name}:`, qcErr instanceof Error ? qcErr.message : qcErr)
          // QC error — don't block the slot, accept as-is
          break
        }
      }

      break // ← non-hero slot or centering QC error — exit loop after first cycle
      } // end centering retry loop

      slotLog.centeringAttempts = centerCycle

      if (finalBuf) {
        result.buffers.push(finalBuf)
        result.successCount++
        slotLog.success = true
        slotLog.outputSizeBytes = finalBuf.length
        console.log(
          `[generateByGeminiPro v37] ✓ ${scene.name} — ${finalBuf.length}b ` +
          `(attempts=${slotLog.attempts} centerCycles=${centerCycle} ` +
          `color=${slotLog.colorCheckPass ?? 'skip'} ` +
          `brand=${slotLog.brandFidelityPass ?? 'skip'} shot=${slotLog.shotCompliancePass ?? 'skip'} ` +
          `bg=${slotLog.bgCheckPass ?? 'skip'} bgEnforced=${(slotLog as Record<string, unknown>).bgEnforced ?? false} ` +
          `brightNorm=${(slotLog as Record<string, unknown>).brightnessNormalized ?? false} ` +
          `centered=${(slotLog as Record<string, unknown>).centered ?? false} ` +
          `centerQC=${slotLog.centeringPass ?? 'skip'} ` +
          `centerOffset=(${slotLog.centeringOffsetX ?? '?'}%,${slotLog.centeringOffsetY ?? '?'}%))`,
        )
      } else {
        const msg = `${scene.name}: null after ${slotLog.attempts} attempts (${centerCycle} cycles)`
        result.errors.push(msg)
        slotLog.rejectionReason = slotLog.rejectionReason || msg
        console.warn(`[generateByGeminiPro v37] ✗ ${msg}`)
      }

      slotLogs.push(slotLog)
      await sleep(1000)
    }
  } catch (err) {
    const msg = `Pipeline fatal: ${err instanceof Error ? err.message : err}`
    console.error(`[generateByGeminiPro v20] ${msg}`)
    result.errors.push(msg)
  }

  // ── v34: BATCH BACKGROUND CONSISTENCY CHECK ──────────────────────────────
  // After ALL slots are generated and individually enforced, do a final pass
  // comparing each slot's actual corner colors to the batch target.
  // If any slot still drifted (e.g. macro bokeh shifted), re-enforce it.
  // This ensures all images in a product batch share one visual background family.
  if (result.buffers.length > 1) {
    const bgHex = batchBgHex
    if (bgHex) {
      const targetRgb = hexToRgb(bgHex)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharpCheck = require('sharp') as typeof import('sharp')

      for (let bi = 0; bi < result.buffers.length; bi++) {
        try {
          const buf = result.buffers[bi]
          const meta = await sharpCheck(buf).metadata()
          const w = meta.width || 1024
          const h = meta.height || 1024

          // Sample 4 corners (3% squares) to measure actual bg color
          const { data: px, info: pxInfo } = await sharpCheck(buf)
            .removeAlpha().raw().toBuffer({ resolveWithObject: true })
          const ch = pxInfo.channels
          const cs = Math.max(8, Math.round(Math.min(w, h) * 0.03))
          let cr = 0, cg = 0, cb = 0, cnt = 0
          const cCorners = [
            { x0: 0, y0: 0 }, { x0: w - cs, y0: 0 },
            { x0: 0, y0: h - cs }, { x0: w - cs, y0: h - cs },
          ]
          for (const cc of cCorners) {
            for (let y = cc.y0; y < cc.y0 + cs; y++) {
              for (let x = cc.x0; x < cc.x0 + cs; x++) {
                const idx = (y * w + x) * ch
                cr += px[idx]; cg += px[idx + 1]; cb += px[idx + 2]; cnt++
              }
            }
          }
          const avgR = Math.round(cr / cnt)
          const avgG = Math.round(cg / cnt)
          const avgB = Math.round(cb / cnt)
          const drift = Math.sqrt(
            (avgR - targetRgb.r) ** 2 + (avgG - targetRgb.g) ** 2 + (avgB - targetRgb.b) ** 2,
          )

          const slotNameForLog = scenes[bi]?.name ?? `slot${bi}`
          console.log(
            `[batchBgCheck v34] ${slotNameForLog}: corner avg=rgb(${avgR},${avgG},${avgB}) ` +
            `target=rgb(${targetRgb.r},${targetRgb.g},${targetRgb.b}) drift=${drift.toFixed(0)}`,
          )

          // If corner drift > 30, re-enforce this slot
          if (drift > 30) {
            console.log(`[batchBgCheck v34] ${slotNameForLog} drift=${drift.toFixed(0)} > 30 — re-enforcing`)
            result.buffers[bi] = await enforceSlotBackground(buf, bgHex, slotNameForLog)
            ;(slotLogs[bi] as Record<string, unknown>).batchBgReEnforced = true
          }
        } catch (batchErr) {
          console.warn(`[batchBgCheck v34] slot ${bi} check failed:`, batchErr instanceof Error ? batchErr.message : batchErr)
        }
      }
    }
  }

  const slotSummary = slotLogs.map((s) => {
    if (!s.success) return '✗'
    if (s.colorCheckPass === false || s.brandFidelityPass === false || s.shotCompliancePass === false || s.bgCheckPass === false) return '⚠'
    return '✓'
  }).join('')
  console.log(`[generateByGeminiPro v34] done — ${result.successCount}/${result.promptCount} [${slotSummary}]`)

  return { results: [result], buffers: result.buffers, slotLogs }
}
