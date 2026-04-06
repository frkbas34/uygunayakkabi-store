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
  `• The shoe must NOT be excessively zoomed in (except for macro/detail slot).\n` +
  `• All standard product shots must maintain a consistent, premium product-to-frame ratio.\n` +
  `CENTERING: The shoe must be centered or deliberately composed with controlled premium placement.\n` +
  `• Never place the shoe awkwardly near an edge.\n` +
  `• Composition must look intentional and premium — like a professional catalog photo.\n` +
  `ANTI-INSET RULE (CRITICAL):\n` +
  `• Do NOT generate an image-inside-an-image. Do NOT create a framed-photo look.\n` +
  `• Do NOT create visible outer borders or a poster/card/mockup presentation.\n` +
  `• Do NOT create large white or colored margins that make the scene feel inset.\n` +
  `• The output must be a direct, full-bleed photograph — edge to edge.\n` +
  `• If your output looks like a photo placed onto a canvas, it is WRONG.\n` +
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
  `\n` +
  `═══ EXPOSURE & BRIGHTNESS CONTROL — MANDATORY ═══\n` +
  `• Balanced exposure is CRITICAL. The shoe must retain full surface detail.\n` +
  `• NO blown highlights — every part of the shoe surface must show visible texture.\n` +
  `• NO washed-out or overexposed areas — leather grain, stitching, and material must be clearly readable.\n` +
  `• NO high-key white flooding — the background may be light but must NOT bleed into the product.\n` +
  `• Preserve the true tonal range of the product: darks stay dark, midtones stay rich, highlights stay controlled.\n` +
  `• Lighting must illuminate the shoe WITHOUT flattening its surface detail.\n` +
  `• If the shoe is dark (black, navy, dark brown): expose for the shoe, not the background. Keep shadows rich.\n` +
  `• If the shoe is light (white, cream, beige): use subtle shadows and contrast to define edges and texture.\n` +
  `• Think: a professional photographer who meters for the product, not the background.\n` +
  `• An overexposed, washed-out image is WRONG and will be REJECTED.\n` +
  `═══════════════════════════\n` +
  `\n` +
  `BACKGROUND LOCK (BATCH RULE — MANDATORY):\n` +
  `• ALL images in this batch MUST use the EXACT SAME background color — no exceptions.\n` +
  `• Each slot's BACKGROUND line specifies ONE exact color with a hex code. Use THAT hex code literally.\n` +
  `• Do NOT choose a different shade, tone, warmth, or hue — even if "similar" or "complementary".\n` +
  `• Do NOT introduce green, blue, or any color not explicitly specified in the BACKGROUND line.\n` +
  `• Even in macro/close-up/lifestyle shots where background is blurred, the blurred area must be the SAME exact color.\n` +
  `• Even in editorial/overhead shots, the visible surface/backdrop must match the SAME batch background.\n` +
  `• All images must look like they were shot in the SAME studio with the SAME physical backdrop paper.\n` +
  `• If your output has a different background color than specified, it is WRONG and will be REJECTED.\n` +
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
// Premium Background Selection Engine
// ─────────────────────────────────────────────────────────────────────────────
// Maps shoe color → premium contrasting background for studio shots.
// Goal: background supports the product, never competes. Soft, minimal, premium.

export function getBackgroundForColor(mainColor: string): string {
  const c = mainColor.toLowerCase()

  // Returns ONE EXACT background per shoe color — no "or" options.
  // This ensures all slots in a batch use the identical background.

  if (c.includes('black') || c.includes('siyah'))
    return 'warm beige (#F5F0E8). Solid, uniform, soft premium studio tone. No gradient, no variation.'
  if (c.includes('white') || c.includes('beyaz') || c.includes('off-white'))
    return 'light warm grey (#E5E3E0). Solid, uniform tone. NOT white — shoe must clearly contrast.'
  if (c.includes('brown') || c.includes('kahve') || c.includes('espresso'))
    return 'warm cream (#F5F1E6). Solid, uniform, soft natural tone. No gradient, no variation.'
  if (c.includes('tan') || c.includes('tobacco') || c.includes('camel') || c.includes('taba'))
    return 'off-white (#FAF8F5). Solid, uniform, barely-there warmth. No gradient, no variation.'
  if (c.includes('grey') || c.includes('gray') || c.includes('gri'))
    return 'clean white (#FAFAFA). Solid, uniform, bright crisp tone. No gradient, no variation.'
  if (c.includes('navy') || c.includes('lacivert') || (c.includes('blue') && c.includes('dark')))
    return 'light grey (#EDEDED). Solid, uniform, neutral tone. No gradient, no variation.'
  if (c.includes('red') || c.includes('kırmızı') || c.includes('bordo') || c.includes('burgundy'))
    return 'neutral off-white (#F7F5F3). Solid, uniform, minimal tone. No gradient, no variation.'
  return 'neutral light grey (#EDEDED). Solid, uniform, soft premium studio tone. No gradient, no variation.'
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
    detail_closeup: {
      required: 'macro close-up of material texture — full shoe silhouette NOT visible, surface fills frame',
      passRule: 'the frame shows material texture/grain at close range, the full shoe silhouette is not in the frame',
      failSignals: 'full shoe visible in frame, standard product angle, no macro framing, wide shot',
      correction: 'Camera must be 15-20cm from the upper surface. The full shoe must NOT be visible. Only surface texture should fill the frame.',
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
    `Analyze this shoe image and respond with JSON only — no markdown, no code fences:\n` +
    `{"pass": true/false, "detectedShot": "one-sentence description of the actual angle/composition in this image"}\n\n` +
    `Be strict. A slight 3/4 angle when pure front was requested = FAIL. ` +
    `A slight diagonal when pure side was requested = FAIL.`

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

    // Thresholds: background will be light (~230-250) but product area should
    // pull the mean down. If mean > 210 the product itself is overexposed.
    // highlight > 35% means too much of the image is blown out.
    const isTooMean = meanBrightness > 210
    const isTooHighlight = highlightPercent > 35
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
async function enforceSlotBackground(
  imageBuffer: Buffer,
  targetHex: string,
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

  // ── Step 1: Sample edge regions to detect current background color ──
  // Sample 4 strips: top 5%, bottom 5%, left 5%, right 5%
  const edgeDepth = Math.max(10, Math.round(Math.min(width, height) * 0.05))
  let rSum = 0, gSum = 0, bSum = 0, sampleCount = 0

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

  console.log(
    `[enforceSlotBackground] detected bg: rgb(${detectedBg.r},${detectedBg.g},${detectedBg.b}) ` +
    `target: ${targetHex} rgb(${targetBg.r},${targetBg.g},${targetBg.b}) ` +
    `pixels=${width}x${height} samples=${sampleCount}`,
  )

  // ── Step 2: Replace background-like pixels ──
  // Color distance threshold: pixels within this distance from detected bg
  // are considered "background" and get blended toward target.
  // Max distance in RGB space is ~441 (sqrt(255^2*3)), typical bg drift is 30-120.
  const MAX_BG_DISTANCE = 90   // pixels clearly "background"
  const BLEND_MARGIN    = 50   // soft blend zone between bg and product
  const totalThreshold  = MAX_BG_DISTANCE + BLEND_MARGIN

  const outputPixels = Buffer.from(rawPixels) // copy

  for (let i = 0; i < rawPixels.length; i += channels) {
    const pr = rawPixels[i]
    const pg = rawPixels[i + 1]
    const pb = rawPixels[i + 2]

    // Euclidean distance from this pixel to detected background
    const dr = pr - detectedBg.r
    const dg = pg - detectedBg.g
    const db = pb - detectedBg.b
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
    // We compute: what this pixel WOULD be if the background were the target color.
    // Offset = difference between detected and target bg, applied with blend factor.
    const shiftR = (targetBg.r - detectedBg.r) * blend
    const shiftG = (targetBg.g - detectedBg.g) * blend
    const shiftB = (targetBg.b - detectedBg.b) * blend

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

  console.log(`[enforceSlotBackground] ✓ background shifted — ${result.length}b`)
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
    name: 'commerce_front',
    label: 'Slot 1 — Ön Stüdyo Hero',
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
    name: 'side_angle',
    label: 'Slot 2 — 90° Yan Profil',
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
    name: 'detail_closeup',
    label: 'Slot 3 — Malzeme Makro',
    sceneInstructions:
      `── SHOT: MATERIAL MACRO CLOSE-UP ──\n` +
      `Re-photograph this EXACT {COLOR} shoe — macro close-up of the upper material — same physical object.\n` +
      `CAMERA: 15–20 cm from the vamp/toe-cap surface. Slightly above, 20–30° down. Macro focal length.\n` +
      `COMPOSITION: Upper material fills 85–90% of image area. Very shallow depth of field. Toe area sharp, heel blurred.\n` +
      `MUST SEE: Surface grain/texture/weave of the upper, stitching thread relief, any perforation or embossing.\n` +
      `MUST NOT SEE: The full shoe. If the entire shoe is visible, the framing is WRONG.\n` +
      `\n` +
      `BACKGROUND — CRITICAL BATCH LOCK:\n` +
      `BACKGROUND: {BACKGROUND}\n` +
      `This macro shot uses the EXACT SAME studio backdrop as Slot 1 and Slot 2.\n` +
      `The shoe is photographed on the SAME studio set with the SAME backdrop paper.\n` +
      `Because of shallow depth-of-field, the background will appear as soft bokeh — but the COLOR must be identical.\n` +
      `The blurred out-of-focus area MUST read as the same exact color specified above.\n` +
      `\n` +
      `BANNED BACKGROUNDS (will cause REJECTION):\n` +
      `• NO tabletop surface — no wood, no marble, no stone, no concrete\n` +
      `• NO textured floor — no tiles, no carpet, no parquet\n` +
      `• NO environmental/real-world surface — no grass, no pavement, no fabric\n` +
      `• NO surface carried over from the reference photo\n` +
      `• NO dark/black background unless the batch background specifies it\n` +
      `• NO colored surface that differs from the batch background\n` +
      `The ONLY acceptable background is: the exact color specified in the BACKGROUND line above, rendered as soft uniform bokeh.\n` +
      `If the background looks different from Slot 1 or Slot 2, this image is WRONG.\n` +
      `\n` +
      `LIGHT: Single soft raking sidelight to reveal texture. Subtle specular highlight. No harsh reflections.\n` +
      `EXPOSURE CRITICAL: This macro shot MUST preserve surface detail. No blown highlights on the leather/material surface. Keep exposure metered for the shoe surface — texture, grain, and stitching must be clearly visible. If any area appears washed out or white-clipped, the exposure is WRONG.\n` +
      `OUTPUT: Full-bleed photograph. No frames, no borders, no margins, no mockup. No watermark, no text, no logo overlay.\n` +
      `THIS IS NOT: a full-shoe shot, a side profile, an editorial placement, a tabletop composition, a framed image.\n` +
      `COLOR: The shoe is {COLOR}. Output MUST be {COLOR}. Other colors = REJECTED.`,
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

    const premiumBackground = getBackgroundForColor(mainColor)
    const padHex = parseBackgroundHex(premiumBackground) || '#EDEDED'
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

      // ── Per-slot try/catch: one slot failure must not abort remaining slots ──
      // callGeminiImageGenerate now throws on API error — catch per slot so the
      // error message is captured in slotLog.rejectionReason and surfaced to Telegram.
      try {
        // ── Attempt 1 ──────────────────────────────────────────────────────────
        slotLog.attempts = 1
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
          slotLog.attempts = 2
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
          // Only applied to slots that failed bg check — typically detail_closeup.
          if (slotLog.bgCheckPass === false && finalBuf) {
            const bgHex = parseBackgroundHex(premiumBackground)
            if (bgHex) {
              try {
                console.log(`[generateByGeminiPro v29] bg still drifted on ${scene.name} after retry — enforcing ${bgHex} via post-process`)
                finalBuf = await enforceSlotBackground(finalBuf, bgHex)
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
      // Previously this only ran after retry+fail. Now it runs on ALL slots
      // to guarantee deterministic batch background regardless of what Gemini produced.
      // This is the safety net that eliminates background mismatch across the batch.
      if (finalBuf) {
        const bgHex = parseBackgroundHex(premiumBackground)
        if (bgHex) {
          try {
            finalBuf = await enforceSlotBackground(finalBuf, bgHex)
            ;(slotLog as Record<string, unknown>).bgEnforced = true
            console.log(`[generateByGeminiPro v29] ✓ ${scene.name} bg enforced to ${bgHex}`)
          } catch (enforceErr) {
            console.warn(`[generateByGeminiPro v29] bg enforcement failed for ${scene.name}:`, enforceErr instanceof Error ? enforceErr.message : enforceErr)
          }
        }
      }

      if (finalBuf) {
        result.buffers.push(finalBuf)
        result.successCount++
        slotLog.success = true
        slotLog.outputSizeBytes = finalBuf.length
        console.log(
          `[generateByGeminiPro v29] ✓ ${scene.name} — ${finalBuf.length}b ` +
          `(attempts=${slotLog.attempts} color=${slotLog.colorCheckPass ?? 'skip'} ` +
          `brand=${slotLog.brandFidelityPass ?? 'skip'} shot=${slotLog.shotCompliancePass ?? 'skip'} ` +
          `bg=${slotLog.bgCheckPass ?? 'skip'} bgEnforced=${(slotLog as Record<string, unknown>).bgEnforced ?? false})`,
        )
      } else {
        const msg = `${scene.name}: null after ${slotLog.attempts} attempts`
        result.errors.push(msg)
        slotLog.rejectionReason = slotLog.rejectionReason || msg
        console.warn(`[generateByGeminiPro v20] ✗ ${msg}`)
      }

      slotLogs.push(slotLog)
      await sleep(1000)
    }
  } catch (err) {
    const msg = `Pipeline fatal: ${err instanceof Error ? err.message : err}`
    console.error(`[generateByGeminiPro v20] ${msg}`)
    result.errors.push(msg)
  }

  const slotSummary = slotLogs.map((s) => {
    if (!s.success) return '✗'
    if (s.colorCheckPass === false || s.brandFidelityPass === false || s.shotCompliancePass === false || s.bgCheckPass === false) return '⚠'
    return '✓'
  }).join('')
  console.log(`[generateByGeminiPro v29] done — ${result.successCount}/${result.promptCount} [${slotSummary}]`)

  return { results: [result], buffers: result.buffers, slotLogs }
}
