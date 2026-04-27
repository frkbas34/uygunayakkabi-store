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
import { LOCK_REMINDER_BLOCK } from './imageLockReminder'

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
// Anti-frame enforcer — placed LAST in prompt for maximum recency attention
// ─────────────────────────────────────────────────────────────────────────────
const ANTI_FRAME_FINAL_BLOCK =
  `\n\n═══ FINAL OUTPUT RULE — NO FRAMES (MANDATORY) ═══\n` +
  `Before you output, verify: does the generated image contain ANY of these?\n` +
  `• A visible border, outline, or edge that is NOT the canvas edge\n` +
  `• A rectangular "card", "tile", or "panel" effect around the product\n` +
  `• A shadow-box, drop-shadow rectangle, or rounded-corner frame\n` +
  `• A white/gray margin between the photo content and the canvas edge\n` +
  `• An image-inside-an-image or photo-on-a-background appearance\n` +
  `• Any decorative edge, vignette border, or poster presentation\n` +
  `If YES to ANY of the above → your output is WRONG. Regenerate WITHOUT any frame.\n` +
  `The background color/scene MUST extend to ALL FOUR edges of the output canvas.\n` +
  `There must be ZERO pixels of border/margin between the photo content and the canvas edge.\n` +
  `This is a raw camera photograph, NOT a product card, NOT a mockup, NOT a framed print.\n` +
  `═══════════════════════════════════════════════════\n`

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
  `ANTI-FRAME RULE (ZERO TOLERANCE):\n` +
  `• Do NOT generate an image-inside-an-image. Do NOT create a framed-photo look.\n` +
  `• Do NOT create visible outer borders or a poster/card/mockup presentation.\n` +
  `• Do NOT place the photo inside a rectangular panel, card, or bordered area.\n` +
  `• Do NOT add decorative edges, shadow boxing, or vignette framing.\n` +
  `• Do NOT render the image as if it were printed on paper and photographed.\n` +
  `• The photo content must extend all the way to every edge of the output image.\n` +
  `• If your output has visible boundaries between "the photo" and "the canvas", it is WRONG.\n` +
  `\n` +
  `BACKGROUND CONSISTENCY (ALL SLOTS):\n` +
  `• All images in this batch share ONE studio backdrop color.\n` +
  `• Each slot specifies a BACKGROUND line — use that EXACT color.\n` +
  `• Slot 1 sets the background for the batch. All other slots MUST match.\n` +
  `• No slot may drift to a different color, shade, or warmth.\n` +
  `\n` +
  `QUALITY STANDARD:\n` +
  `• Premium e-commerce photography — think Zara / Nike / luxury catalog quality.\n` +
  `• Ultra clean, high clarity, high sharpness, no noise, no clutter.\n` +
  `• Soft studio lighting, natural soft shadow under the shoe.\n` +
  `• No harsh reflections, no dramatic lighting — realistic commercial look.\n` +
  `═══════════════════════════\n\n`

// ─────────────────────────────────────────────────────────────────────────────
// Premium Background Selection Engine
// ─────────────────────────────────────────────────────────────────────────────
// Maps shoe color → premium contrasting background for studio shots.
// Goal: background supports the product, never competes. Soft, minimal, premium.

// D-233: per-family palette with productId-based deterministic variant.
// Each shoe-color family carries 3-5 premium tones so two products of the
// same shoe color get DIFFERENT backgrounds while every slot of a SINGLE
// product still shares the SAME background (cross-slot consistency from v43
// preserved). Tones stay in the "premium studio, never compete with shoe"
// band — soft, muted, slightly varied luminance/chroma.
type BgVariant = { name: string; hex: string; descriptor?: string }

const BG_PALETTE: Record<string, BgVariant[]> = {
  black: [
    { name: 'warm beige', hex: '#F5F0E8' },
    { name: 'muted sand', hex: '#EAE2D2' },
    { name: 'dusty rose', hex: '#F0E5DD' },
    { name: 'champagne', hex: '#EDE6D5' },
    { name: 'soft taupe', hex: '#E0D8CC' },
  ],
  white: [
    { name: 'light grey', hex: '#E8E8E8', descriptor: 'NOT white — shoe must contrast.' },
    { name: 'cool stone', hex: '#DDE2E5', descriptor: 'NOT white — shoe must contrast.' },
    { name: 'warm taupe', hex: '#E5E0DA', descriptor: 'NOT white — shoe must contrast.' },
    { name: 'pale slate', hex: '#D8DDE2', descriptor: 'NOT white — shoe must contrast.' },
    { name: 'soft bone', hex: '#E8E5DC', descriptor: 'NOT white — shoe must contrast.' },
  ],
  brown: [
    { name: 'warm cream', hex: '#F5F1E6' },
    { name: 'soft sand', hex: '#ECE4D2' },
    { name: 'oat', hex: '#E8DCC4' },
    { name: 'pale vanilla', hex: '#F0E8D5' },
    { name: 'dusty parchment', hex: '#E5DBC8' },
  ],
  tan: [
    { name: 'off-white', hex: '#FAF8F5' },
    { name: 'pale cream', hex: '#F5EFE3' },
    { name: 'soft latte', hex: '#EDE3D0' },
    { name: 'powder beige', hex: '#F0E8D8' },
    { name: 'subtle sage', hex: '#E8E5D6' },
  ],
  grey: [
    { name: 'clean white', hex: '#FFFFFF' },
    { name: 'soft pearl', hex: '#F2F0EC' },
    { name: 'pale champagne', hex: '#F5F0E5' },
    { name: 'light dove', hex: '#ECEAE3' },
    { name: 'warm bone', hex: '#F0EBDF' },
  ],
  navy: [
    { name: 'light grey', hex: '#EDEDED' },
    { name: 'soft stone', hex: '#E2E5E8' },
    { name: 'pale dove', hex: '#DEDFE0' },
    { name: 'warm cool grey', hex: '#E5E2DD' },
    { name: 'ice grey', hex: '#DAE0E2' },
  ],
  red: [
    { name: 'neutral off-white', hex: '#F7F5F3' },
    { name: 'dusty rose', hex: '#F2E8E5' },
    { name: 'warm blush', hex: '#EFE5E0' },
    { name: 'muted clay', hex: '#E8DDD8' },
    { name: 'powder cream', hex: '#F0E5D8' },
  ],
  green: [
    { name: 'warm cream', hex: '#F5F0E8' },
    { name: 'sage tint', hex: '#E8EBE0' },
    { name: 'muted parchment', hex: '#EFEBDD' },
    { name: 'mint mist', hex: '#E0E5D8' },
    { name: 'soft pistachio', hex: '#ECE8D5' },
  ],
  blue: [
    { name: 'warm off-white', hex: '#F5F2ED' },
    { name: 'pale slate', hex: '#D8DDE2' },
    { name: 'soft mist', hex: '#E0E5E8' },
    { name: 'dusty cloud', hex: '#E8EAE8' },
    { name: 'cool pearl', hex: '#ECEEF0' },
  ],
  pink: [
    { name: 'light grey', hex: '#ECECEC' },
    { name: 'dusty mauve', hex: '#EAE0E2' },
    { name: 'soft cream', hex: '#F0EBE3' },
    { name: 'warm grey', hex: '#E5E2DD' },
    { name: 'powder pink', hex: '#F0E5E5' },
  ],
  beige: [
    { name: 'warm grey', hex: '#E0DDD8' },
    { name: 'soft taupe', hex: '#DAD5CC' },
    { name: 'muted sand', hex: '#DDD8C8' },
    { name: 'dusty parchment', hex: '#E5DDC8' },
    { name: 'soft stone', hex: '#D8D5D0' },
  ],
  default: [
    { name: 'neutral light grey', hex: '#EDEDED' },
    { name: 'warm pearl', hex: '#F0EBE3' },
    { name: 'soft sand', hex: '#E8E2D5' },
    { name: 'cool stone', hex: '#E0E3E5' },
    { name: 'soft bone', hex: '#E8E5DC' },
  ],
}

function pickFamily(c: string): keyof typeof BG_PALETTE {
  if (c.includes('black') || c.includes('siyah')) return 'black'
  if (c.includes('white') || c.includes('beyaz') || c.includes('off-white')) return 'white'
  if (c.includes('brown') || c.includes('kahve') || c.includes('espresso')) return 'brown'
  if (c.includes('tan') || c.includes('tobacco') || c.includes('camel') || c.includes('taba')) return 'tan'
  if (c.includes('grey') || c.includes('gray') || c.includes('gri')) return 'grey'
  if (c.includes('navy') || c.includes('lacivert') || (c.includes('blue') && c.includes('dark'))) return 'navy'
  if (c.includes('red') || c.includes('kırmızı') || c.includes('bordo') || c.includes('burgundy')) return 'red'
  if (c.includes('green') || c.includes('yeşil') || c.includes('olive') || c.includes('haki') || c.includes('khaki')) return 'green'
  if (c.includes('blue') || c.includes('mavi')) return 'blue'
  if (c.includes('pink') || c.includes('pembe') || c.includes('rose')) return 'pink'
  if (c.includes('beige') || c.includes('cream') || c.includes('krem')) return 'beige'
  return 'default'
}

/**
 * D-233: Stable per-product variant pick. Same productId always returns the
 * same variant within a family. Different productIds with the same shoe
 * color get different backgrounds. When productId is omitted, returns the
 * first variant — keeps backward compatibility for any callsite that hasn't
 * been threaded yet.
 */
function pickVariant(family: BgVariant[], productId?: string | number): BgVariant {
  if (family.length === 0) return { name: 'neutral light grey', hex: '#EDEDED' }
  if (productId == null) return family[0]
  const numStr = String(productId).replace(/\D/g, '') || '0'
  const n = Number.parseInt(numStr, 10)
  const idx = Math.abs(Number.isFinite(n) ? n : 0) % family.length
  return family[idx]
}

function renderBg(v: BgVariant): string {
  const tail = v.descriptor
    ? `Solid, uniform tone. ${v.descriptor} Use this EXACT color for ALL slots. No gradient.`
    : `Solid, uniform, soft premium studio tone. Use this EXACT color for ALL slots in this batch. No gradient.`
  return `${v.name} (${v.hex}). ${tail}`
}

function getBackgroundForColor(mainColor: string, productId?: string | number): string {
  const c = mainColor.toLowerCase()
  // v43 invariant preserved: ONE exact background per (shoe color × product) combo;
  // every slot in a batch uses the same string. D-233 adds per-product variation
  // ACROSS products — the deterministic hash means slot-to-slot drift within a
  // batch is still impossible.
  const family = BG_PALETTE[pickFamily(c)] ?? BG_PALETTE.default
  return renderBg(pickVariant(family, productId))
}

/**
 * Extract hex color from getBackgroundForColor() output and return RGB.
 * e.g. "warm beige (#F5F0E8). Solid..." → { r: 245, g: 240, b: 232 }
 * Falls back to neutral light grey if parsing fails.
 */
function getBackgroundRGB(backgroundStr: string): { r: number; g: number; b: number; alpha: number } {
  const match = backgroundStr.match(/#([0-9A-Fa-f]{6})/)
  if (match) {
    const hex = match[1]
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
      alpha: 1,
    }
  }
  // Fallback: neutral light grey
  return { r: 237, g: 237, b: 237, alpha: 1 }
}

/**
 * D-157: Sample the reference image's corner pixels to derive a padding color
 * that blends invisibly with the image's existing background.
 *
 * Root cause of frame regression:
 *   extractIdentityLock() fails ~60% of calls and triggers buildFallbackLock(),
 *   which returns mainColor='as shown in reference'. That string doesn't match
 *   any palette entry in getBackgroundForColor(), so padding falls through to
 *   the default near-white (#EDEDED). When that near-white ring is extended
 *   around a product photo whose own background is a different shade (e.g.
 *   pure white or a studio gray), the input canvas contains a VISIBLE inner
 *   rectangle — and Gemini preserves that rectangle as a "framed photo"
 *   look in its output, violating the v50 locked no-frame rule.
 *
 * Fix: sample four 16×16 corner patches of the reference image, average them,
 * and use that RGB for both `fit: 'contain'` letterboxing and the 128px
 * `.extend()` ring. This guarantees the padding color matches the image's
 * existing edge pixels, so there is no visible boundary between the inner
 * product photo and the outer padding — Gemini sees ONE continuous canvas.
 *
 * The scene-specific BACKGROUND instruction is unchanged and still tells the
 * model what target color to render in the OUTPUT. The padding color is now
 * purely a visual camouflage for the input.
 */
/**
 * D-161: edge-sampled padding color with non-uniformity guard.
 *
 * Replaces the D-157 implementation, which had TWO bugs:
 *
 *  1. Sharp API misuse: `sharp(buf).extract(rect).stats()` does NOT apply
 *     the extract before computing stats — `.stats()` is a terminal libvips
 *     operation that bypasses prior pipeline steps. So D-157's "four corner
 *     samples" were actually four copies of the full-image mean. This was
 *     verified locally against the SN0151 reference: raw-buffer extraction
 *     of the four 32×32 corners returned (122,123,127), (26,22,21),
 *     (116,111,101), (109,105,98) — wildly different — while
 *     `.extract().stats()` returned (119,103,99) for all four (which is
 *     just the whole-image mean).
 *
 *  2. Assumption failure: even when correctly sampled, real-world product
 *     photos frequently have non-uniform backgrounds (one near-black corner
 *     + three taupe corners was the SN0151 case). Averaging gives a dark
 *     taupe that Gemini preserves as a visible outer frame around its
 *     rendered scene.
 *
 * D-161 rewrite:
 *  - Use `.extract(rect).removeAlpha().raw().toBuffer()` so the extraction
 *    actually happens, then compute the mean from raw pixel bytes.
 *  - Compute Chebyshev spread across the four corner samples. If any
 *    channel spread >40, the reference is non-uniform → fall back to pure
 *    white padding (Gemini treats white as a blank canvas to extend the
 *    scene background over, not as a "frame" to preserve).
 *  - If the reference IS uniform (clean studio shots, Gemini reruns), use
 *    the honest corner average — keeps D-157's benefit for the
 *    D-129 near-white-on-colored-shoe case.
 */
// D-164: RETIRED. Padding is now bgRGB (v50 baseline). This function is
// preserved for reference only — the D-161 Chebyshev/raw-buffer sampling
// logic is documented in DECISIONS.md D-161 and may be useful if we ever
// need edge-sampling for a different purpose (e.g. identity lock fallback
// tone detection). If you re-enable this function as the padding source,
// re-read DECISIONS.md D-164 FIRST — reintroducing it without a padding
// = bgRGB fallback will re-break SN0153-style frames.
//
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function sampleEdgeBackgroundRGB(
  referenceImage: Buffer,
): Promise<{ r: number; g: number; b: number; alpha: number }> {
  const NEUTRAL_WHITE = { r: 255, g: 255, b: 255, alpha: 1 }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as typeof import('sharp')
    const meta = await sharp(referenceImage).metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    if (!w || !h || w < 32 || h < 32) {
      return NEUTRAL_WHITE
    }
    const patch = Math.max(8, Math.min(32, Math.floor(Math.min(w, h) / 20)))
    const rects = [
      { left: 0,         top: 0,         width: patch, height: patch },
      { left: w - patch, top: 0,         width: patch, height: patch },
      { left: 0,         top: h - patch, width: patch, height: patch },
      { left: w - patch, top: h - patch, width: patch, height: patch },
    ]

    const samples: Array<{ r: number; g: number; b: number }> = []
    for (const rect of rects) {
      // D-161: raw buffer path — .stats() does NOT respect .extract()
      const { data, info } = await sharp(referenceImage)
        .extract(rect)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      const n = info.width * info.height
      if (n === 0) {
        samples.push({ r: 255, g: 255, b: 255 })
        continue
      }
      let rSum = 0, gSum = 0, bSum = 0
      for (let i = 0; i < data.length; i += 3) {
        rSum += data[i]
        gSum += data[i + 1]
        bSum += data[i + 2]
      }
      samples.push({ r: rSum / n, g: gSum / n, b: bSum / n })
    }

    // Non-uniformity guard
    const rs = samples.map((s) => s.r)
    const gs = samples.map((s) => s.g)
    const bs = samples.map((s) => s.b)
    const spread = Math.max(
      Math.max(...rs) - Math.min(...rs),
      Math.max(...gs) - Math.min(...gs),
      Math.max(...bs) - Math.min(...bs),
    )
    const UNIFORMITY_THRESHOLD = 40
    const compactSamples = samples.map((s) => ({
      r: Math.round(s.r),
      g: Math.round(s.g),
      b: Math.round(s.b),
    }))
    if (spread > UNIFORMITY_THRESHOLD) {
      console.log(
        `[sampleEdgeBackgroundRGB D-161] non-uniform reference ` +
          `(spread=${spread.toFixed(0)} > ${UNIFORMITY_THRESHOLD}) — ` +
          `falling back to pure white padding. samples=` +
          JSON.stringify(compactSamples),
      )
      return NEUTRAL_WHITE
    }

    const r = samples.reduce((s, p) => s + p.r, 0) / 4
    const g = samples.reduce((s, p) => s + p.g, 0) / 4
    const b = samples.reduce((s, p) => s + p.b, 0) / 4
    console.log(
      `[sampleEdgeBackgroundRGB D-161] uniform reference ` +
        `(spread=${spread.toFixed(0)}) — sampled avg rgb(` +
        `${Math.round(r)},${Math.round(g)},${Math.round(b)}) ` +
        `samples=${JSON.stringify(compactSamples)}`,
    )
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b), alpha: 1 }
  } catch (err) {
    console.warn(
      '[sampleEdgeBackgroundRGB D-161] failed — fallback to pure white:',
      err instanceof Error ? err.message : err,
    )
    return NEUTRAL_WHITE
  }
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
    `- "protectedZones": array of brand-critical visible zones. Include ONLY zones where a logo, text mark, ` +
    `stripe pattern, or distinctive graphic element is CLEARLY VISIBLE. For each zone include:\n` +
    `  - "name": one of "tongue_label" | "side_branding" | "heel_tab" | "toe_cap_overlay" | "ankle_patch" | "other"\n` +
    `  - "description": exactly what is visible (e.g. "white Nike Swoosh on black tongue patch", "three white parallel stripes on lateral side")\n` +
    `  - "mustPreserve": what specifically must not change (e.g. "swoosh shape and white-on-black contrast", "exactly 3 stripes, white, evenly spaced")\n` +
    `  - "visibility": "high" if clearly prominent, "medium" if visible but small, "low" if very subtle\n` +
    `  If no branding/logos/marks are visible, return an empty array [].\n` +
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
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 900 },
        }),
      },
    )

    if (!res.ok) {
      // D-157: log status body so quota/rate-limit/model errors are visible
      const errBody = await res.text().catch(() => '')
      console.warn(`[extractIdentityLock] HTTP ${res.status} body=${errBody.slice(0, 300)}`)
      return null
    }

    const data = await res.json()
    const finishReason = data?.candidates?.[0]?.finishReason as string | undefined
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      // D-157: surface finishReason (SAFETY, MAX_TOKENS, RECITATION, etc.)
      console.warn(`[extractIdentityLock] no text in response — finishReason=${finishReason ?? 'unknown'}`)
      return null
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let p: any
    try {
      p = JSON.parse(text.trim())
    } catch (parseErr) {
      // D-157: JSON parse failures are a major fallback source — log the raw text
      console.warn(
        `[extractIdentityLock] JSON parse failed — finishReason=${finishReason ?? 'unknown'} ` +
        `textLen=${text.length} textPreview=${text.slice(0, 200).replace(/\s+/g, ' ')} ` +
        `err=${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
      )
      return null
    }
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
      `zones=${protectedZones.length} (${protectedZones.map((z) => z.name).join(',') || 'none'})`,
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
      required: 'pure 90° lateral side profile — complete sole edge visible, toe front face NOT visible, toe pointing LEFT and heel pointing RIGHT, shoe perfectly centered',
      passRule: 'the sole edge profile is fully visible from toe tip to heel, the toe front face is NOT visible, the front/toe of the shoe is on the LEFT side and the heel/back is on the RIGHT side, and the shoe is centered in the frame',
      failSignals: 'toe front face visible, slight diagonal (3/4 from front), heel hidden, angled top-down, shoe facing right instead of left, shoe not centered',
      correction: 'Camera must be at exactly 90° to the side. The toe FRONT FACE must NOT be visible. The sole profile must be fully exposed from toe to heel. ORIENTATION: toe/front of shoe must point LEFT, heel/back must point RIGHT. Shoe must be perfectly centered horizontally and vertically.',
    },
    detail_closeup: {
      required: 'detail close-up of the front half of the shoe (toe cap + vamp area) — NOT the full shoe, NOT extreme macro',
      passRule: 'the front portion of the shoe (toe/vamp) fills the frame, material detail and stitching visible, heel is blurred or out of frame',
      failSignals: 'full shoe in sharp focus from toe to heel, extreme macro showing only texture with no recognizable shoe shape, standard product angle showing entire shoe',
      correction: 'Camera should be 25-35cm from the shoe, focusing on the toe cap and vamp area. Show the front half with detail — NOT the entire shoe, and NOT an extreme macro of just texture.',
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

/**
 * D-201: Check shoe orientation in side_angle images.
 * Asks Gemini Vision a simple binary question: "Is the toe pointing LEFT or RIGHT?"
 * Returns 'left' | 'right' | 'unknown'.
 *
 * If the toe points RIGHT (wrong per operator rule), the caller should flop() the image.
 */
async function checkShoeOrientation(
  imageBuffer: Buffer,
  geminiKey: string,
): Promise<'left' | 'right' | 'unknown'> {
  try {
    const b64 = imageBuffer.toString('base64')
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    'Look at this shoe photograph. The shoe is shown from the side.\n\n' +
                    'Which direction is the TOE (front) of the shoe pointing?\n\n' +
                    'Answer with EXACTLY one word: LEFT or RIGHT\n\n' +
                    'LEFT means the toe points toward the left edge of the image.\n' +
                    'RIGHT means the toe points toward the right edge of the image.',
                },
                { inlineData: { mimeType: 'image/jpeg', data: b64 } },
              ],
            },
          ],
          generationConfig: { temperature: 0, maxOutputTokens: 10 },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    )

    if (!res.ok) {
      console.warn(`[checkShoeOrientation] HTTP ${res.status}`)
      return 'unknown'
    }

    const data = (await res.json()) as Record<string, unknown>
    const text = (
      ((data.candidates as Array<Record<string, unknown>>)?.[0]?.content as Record<string, unknown>)
        ?.parts as Array<{ text?: string }>
    )?.[0]?.text?.trim().toUpperCase() ?? ''

    if (text.includes('LEFT')) return 'left'
    if (text.includes('RIGHT')) return 'right'
    console.warn(`[checkShoeOrientation] ambiguous response: "${text}"`)
    return 'unknown'
  } catch (err) {
    console.warn('[checkShoeOrientation] error:', err instanceof Error ? err.message : err)
    return 'unknown'
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
      `ORIENTATION (MANDATORY — REJECTION RULE): The FRONT of the shoe (toe box) MUST point to the LEFT edge of the image. ` +
      `The BACK of the shoe (heel) MUST point to the RIGHT edge. ` +
      `Think of it as: toe = LEFT, heel = RIGHT. This is a hard requirement — if the shoe faces right or is angled, the image is REJECTED.\n` +
      `CENTERING (MANDATORY): The shoe MUST be perfectly centered both horizontally and vertically in the frame. ` +
      `Equal empty space on all four sides. The shoe's midpoint (between toe tip and heel end) must align with the image center.\n` +
      `COMPOSITION: Full shoe from toe tip to heel counter. Entire sole edge visible. Shoe fills 75% of image width.\n` +
      `MUST SEE: Complete sole profile (toe to heel), arch curve, heel counter height, collar line. The sole silhouette is the dominant visual.\n` +
      `MUST NOT SEE: Toe cap front face (if you can see the front of the toe, the angle is WRONG).\n` +
      `BACKGROUND: {BACKGROUND}\n` +
      `LIGHT: Soft studio lighting — key from front-left 45°, fill from opposite. Natural soft shadow. No harsh reflections.\n` +
      `OUTPUT: Full-bleed photograph that fills the ENTIRE canvas edge to edge. The image IS the photo — NOT a photo of a photo.\n` +
      `CRITICAL ANTI-FRAME: Do NOT render any border, frame, shadow-box, rounded-corner card, drop-shadow rectangle, or picture-inside-picture effect. ` +
      `Do NOT place the shoe on a "floating card" or "product tile". The background must extend to ALL four edges with ZERO visible boundary. ` +
      `If there is ANY rectangular outline or visible edge that is not the canvas edge, the image is REJECTED.\n` +
      `THIS IS NOT: a front view, a 3/4 view, a top-down view, a framed image, a product card, a mockup.\n` +
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
      `COMPOSITION: Full shoe, 70% of image height. Top of collar and sole bottom both visible. Centered. Clean spacing around shoe.\n` +
      `MUST SEE: Toe cap front face, vamp, lace/closure system, collar — the entire FRONT face.\n` +
      `MUST NOT SEE: Heel counter, side profile, sole edge.\n` +
      `BACKGROUND: {BACKGROUND}\n` +
      `LIGHT: Soft studio lighting — overhead softbox + bilateral fill. Natural soft shadow under the shoe only. No harsh reflections.\n` +
      `OUTPUT: Full-bleed photograph that fills the ENTIRE canvas edge to edge. The image IS the photo — NOT a photo of a photo.\n` +
      `CRITICAL ANTI-FRAME: Do NOT render any border, frame, shadow-box, rounded-corner card, drop-shadow rectangle, or picture-inside-picture effect. ` +
      `Do NOT place the shoe on a "floating card" or "product tile". The background must extend to ALL four edges with ZERO visible boundary. ` +
      `If there is ANY rectangular outline or visible edge that is not the canvas edge, the image is REJECTED.\n` +
      `THIS IS NOT: a side view, a 3/4 view, a lifestyle shot, a close-up, a framed image, a product card, a mockup.\n` +
      `COLOR: The shoe is {COLOR}. Output MUST be {COLOR}. Other colors = REJECTED.\n` +
      `DO NOT repeat the reference angle ({REF_ANGLE}). Generate a clean front hero.`,
  },
  {
    name: 'detail_closeup',
    label: 'Slot 3 — Detay Yakın Çekim',
    sceneInstructions:
      `── SHOT: DETAIL CLOSE-UP — 3/4 ANGLE FROM ABOVE ──\n` +
      `Re-photograph this EXACT {COLOR} shoe — a close-up from a 3/4 angle focusing on the toe and vamp area — same physical object.\n` +
      `CAMERA: 18–25 cm from the shoe. Positioned at 30–45° to the side (not straight-on), looking down at 25–35°. This gives a three-quarter perspective that reveals both the top and one side.\n` +
      `FRAMING: Show the toe cap, vamp, and lacing/buckle area from a 3/4 angle. The heel should be blurred or partially out of frame. ` +
      `The shoe portion fills 85% of image area. Some studio background visible around the shoe.\n` +
      `COMPOSITION: Shallow depth of field. Toe cap and vamp area sharp with visible material detail. Back of shoe soft/blurred.\n` +
      `MUST SEE: Toe cap detail, vamp material texture and pattern, stitching, buckles/hardware, any perforations or logos on the front area.\n` +
      `MUST NOT: Show the entire shoe from toe to heel in sharp focus — this is NOT a full product shot. Do NOT shoot straight-on from the front.\n` +
      `BACKGROUND: {BACKGROUND} — This is a STUDIO shot. The shoe must be on a clean, solid-color studio backdrop. ` +
      `Do NOT use the reference photo's surface/floor. Do NOT use stone, concrete, marble, or any textured surface. ` +
      `The background is a smooth, uniform studio color as specified above.\n` +
      `LIGHT: Soft studio lighting — key from front-left 45°, fill from opposite. Natural soft shadow. No harsh reflections.\n` +
      `OUTPUT: Full-bleed photograph that fills the ENTIRE canvas edge to edge. The image IS the photo — NOT a photo of a photo.\n` +
      `CRITICAL ANTI-FRAME: Do NOT render any border, frame, shadow-box, rounded-corner card, drop-shadow rectangle, or picture-inside-picture effect. ` +
      `Do NOT place the shoe on a "floating card" or "product tile". The background must extend to ALL four edges with ZERO visible boundary. ` +
      `If there is ANY rectangular outline or visible edge that is not the canvas edge, the image is REJECTED.\n` +
      `THIS IS NOT: a full-shoe product shot, a side profile, an editorial placement, a framed image, a product card, a mockup.\n` +
      `COLOR: The shoe is {COLOR}. Output MUST be {COLOR}. Other colors = REJECTED.`,
  },
  {
    name: 'tabletop_editorial',
    label: 'Slot 4 — Editoryal Üstten',
    sceneInstructions:
      `── SHOT: OVERHEAD EDITORIAL — RAW CAMERA PHOTOGRAPH ──\n` +
      `You are generating a RAW photograph taken from above. NOT a product card. NOT a mockup. A direct camera shot.\n` +
      `Re-photograph this EXACT {COLOR} shoe from an elevated angle — same physical object.\n` +
      `CAMERA: Above and in front, looking DOWN at 55–65°. Three-quarter overhead perspective.\n` +
      `POSITION: Shoe resting upright on a studio floor. The studio floor extends infinitely in all directions — there is NO edge to the floor visible.\n` +
      `COMPOSITION: Full shoe visible from above-front. Top face dominant (tongue, lacing from above, toe from overhead). Shoe fills 65% of image area. Centered. No props.\n` +
      `MUST SEE: Tongue, lace pattern from above, toe shape from overhead, upper opening.\n` +
      `MUST NOT SEE: The front face of the toe, the side profile, ANY edge or boundary of the floor/surface.\n` +
      `BACKGROUND: {BACKGROUND} — this is the color of the studio FLOOR that the shoe sits on. The floor is seamless and extends to ALL four edges of the image. There is NO wall, NO horizon line, NO edge where the floor ends.\n` +
      `LIGHT: Soft diffused studio light from upper-left. Gentle natural shadow lower-right. No harsh reflections.\n` +
      `OUTPUT: Full-bleed photograph. The studio floor fills the ENTIRE canvas from edge to edge. The shoe sits ON this floor. There is NOTHING between the floor and the canvas edges — no border, no margin, no frame, no card.\n` +
      `CRITICAL ANTI-FRAME: Do NOT render any border, frame, shadow-box, rounded-corner card, drop-shadow rectangle, or picture-inside-picture effect. ` +
      `Do NOT render a "product tile" or "floating surface" — the floor is seamless and infinite. ` +
      `Do NOT add any white or gray margin around the photograph. ` +
      `If there is ANY rectangular outline or visible edge that is not the canvas edge, the image is REJECTED.\n` +
      `THIS IS NOT: a product card, a mockup, a poster, a framed print, a catalog layout. It is a RAW overhead photograph.\n` +
      `COLOR: The shoe is {COLOR}. Output MUST be {COLOR}. Other colors = REJECTED.\n` +
      `DO NOT repeat the reference angle ({REF_ANGLE}). Generate an overhead editorial.`,
  },
  {
    name: 'worn_lifestyle',
    label: 'Slot 5 — Lifestyle Giyilmiş',
    sceneInstructions:
      `── SHOT: LIFESTYLE — SHOE WORN ON A FOOT — RAW CAMERA PHOTOGRAPH ──\n` +
      `You are generating a RAW photograph taken outdoors. NOT a product card. NOT a mockup. A direct camera shot.\n` +
      `Re-photograph this EXACT {COLOR} shoe in a lifestyle worn setting — same physical object.\n` +
      `CAMERA: Low ground level, 10–15 cm above floor, to the side of the foot.\n` +
      `COMPOSITION: One foot wearing the shoe. Full shoe visible with lower leg/ankle above collar. Ground surface in lower area of image. Shoe fills 65% of image area. Centered.\n` +
      `MUST SEE: The shoe ON a foot in natural weight-bearing position, ground contact, ankle/lower leg.\n` +
      `MUST NOT SEE: Face, upper body. The shoe is the hero — the person is secondary.\n` +
      `ENVIRONMENT: Warm blurred lifestyle setting — wooden floor, cobblestone, or garden path. Soft bokeh background. The environment extends to ALL four edges of the image — there is NO border where the scene ends.\n` +
      `LIGHT: Warm natural golden-hour side light. Authentic, non-studio. Soft shadows. No harsh reflections.\n` +
      `OUTPUT: Full-bleed photograph. The ground, foot, shoe, and blurred background fill the ENTIRE canvas from edge to edge. There is NOTHING between the scene and the canvas edges — no border, no margin, no frame, no card, no vignette border.\n` +
      `CRITICAL ANTI-FRAME: Do NOT render any border, frame, shadow-box, rounded-corner card, drop-shadow rectangle, or picture-inside-picture effect. ` +
      `Do NOT render a vignette border or darkened edge frame. Do NOT add any white or gray margin around the photograph. ` +
      `The lifestyle scene must extend seamlessly to ALL four edges with ZERO visible boundary. ` +
      `If there is ANY rectangular outline or visible edge that is not the canvas edge, the image is REJECTED.\n` +
      `THIS IS NOT: a product card, a mockup, a poster, a framed print, a catalog layout, a studio photo. It is a RAW lifestyle photograph.\n` +
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
  productId?: string | number, // D-233: stable per-product background variant
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

    const mainColor    = identityLock.mainColor
    const refAngle     = identityLock.referenceAngle || 'unknown'
    const zoneBlock    = identityLock.protectedZoneBlock || ''
    const hasBrandZones = geminiKey && (identityLock.protectedZones?.length ?? 0) > 0

    // Compute premium background FIRST — used for scene BACKGROUND instruction only
    // D-233: pass productId so two products of the same shoe color get
    // different premium backdrops (cross-slot consistency for any single
    // product still preserved by the v43 invariant).
    const premiumBackground = getBackgroundForColor(mainColor, productId)
    const bgRGB = getBackgroundRGB(premiumBackground)

    // D-167: paddingRGB is no longer used for actual padding (replaced by
    // mirror-extend below). Kept only for logging/audit.
    const paddingRGB = bgRGB // historical ref — see D-167 below

    console.log(
      `[generateByEditing v12] protected zones: ${hasBrandZones ? (identityLock.protectedZones?.map((z) => z.name).join(',')) : 'none'}`,
    )
    console.log(
      `[generateByEditing D-167] scene-bg=${JSON.stringify(bgRGB)} (prompt target) — padding: mirror-extend (no solid color)`,
    )

    // D-167: Mirror-extend padding — PERMANENT frame elimination.
    //
    // The root cause of ALL frame regressions (D-129, D-157, D-161, D-164)
    // was that ANY solid-color padding creates a visible rectangular boundary
    // whenever the reference image's own background differs from the padding
    // color. For a shoe photographed on gray concrete with warm-cream padding,
    // Gemini sees a gray rectangle inside cream and reproduces it as a frame.
    //
    // Fix: use Sharp's `extendWith: 'mirror'` to extend the reference image's
    // edge pixels outward. The background simply continues seamlessly — no
    // boundary, no rectangle, nothing frame-shaped for Gemini to preserve.
    //
    // Step 1: Resize to fit INSIDE 768×768 (no letterbox bars).
    // Step 2: Extend to 768×768 with mirrored edges.
    // Step 3: Extend to 1024×1024 with mirrored edges.
    const refMeta = await sharp(referenceImage).metadata()
    const refW = refMeta.width ?? 768
    const refH = refMeta.height ?? 768
    const innerScale = Math.min(768 / refW, 768 / refH, 1) // never upscale
    const fitW = Math.round(refW * innerScale)
    const fitH = Math.round(refH * innerScale)

    const resizedBuf = await sharp(referenceImage)
      .resize(fitW, fitH)
      .png()
      .toBuffer()

    // Pad to 768×768 with mirrored edges
    const mirrorTop = Math.floor((768 - fitH) / 2)
    const mirrorBottom = 768 - fitH - mirrorTop
    const mirrorLeft = Math.floor((768 - fitW) / 2)
    const mirrorRight = 768 - fitW - mirrorLeft

    const innerBuffer = await sharp(resizedBuf)
      .extend({
        top: mirrorTop, bottom: mirrorBottom,
        left: mirrorLeft, right: mirrorRight,
        extendWith: 'mirror',
      })
      .png()
      .toBuffer()

    // Pad to 1024×1024 with mirrored edges
    const pngBuffer = await sharp(innerBuffer)
      .extend({
        top: 128, bottom: 128, left: 128, right: 128,
        extendWith: 'mirror',
      })
      .png()
      .toBuffer()

    console.log(`[generateByEditing D-167] PNG 1024×1024 ready — ${pngBuffer.length}b (shoe at ${fitW}×${fitH} center, mirror-extend padding — no solid color boundary)`)
    console.log(`[lock-reminder D-153] v50 LOCKED rules prepended to every slot prompt — ${LOCK_REMINDER_BLOCK.length}b reminder block active`)

    for (const scene of scenes) {
      // Replace placeholders in scene instructions
      const sceneText = scene.sceneInstructions
        .replace(/\{COLOR\}/g, mainColor)
        .replace(/\{REF_ANGLE\}/g, refAngle)
        .replace(/\{BACKGROUND\}/g, premiumBackground)

      // Prompt structure (order matters for model attention):
      //   0. LOCK_REMINDER_BLOCK — v50 locked rules reminder (D-153)
      //   1. TASK_FRAMING_BLOCK — "you are re-photographing an existing product"
      //   2. identityLock.promptBlock — product identity + color lock + per-field prohibitions
      //   3. zoneBlock — protected brand zones
      //   4. sceneText — camera angle, framing, background, lighting
      //   5. CANONICAL_PROHIBITIONS_BLOCK — 11 canonical prohibitions from productPreservation.ts
      const fullPrompt = LOCK_REMINDER_BLOCK + TASK_FRAMING_BLOCK + identityLock.promptBlock + zoneBlock + sceneText + CANONICAL_PROHIBITIONS_BLOCK + ANTI_FRAME_FINAL_BLOCK

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

          const needsRetry = !colorCheck.match || (brandCheck !== null && !brandCheck.pass)

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

              // Build rejection reason summary if still failing after retry
              const warnings: string[] = []
              if (!retryColor.match) warnings.push(`color drift: expected ${mainColor} got ${retryColor.detectedColor}`)
              if (slotLog.brandFidelityPass === false) warnings.push(`brand zones drifted: ${slotLog.brandFidelityNotes || 'unknown'}`)
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
  productId?: string | number, // D-233: stable per-product background variant
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

    const mainColor   = identityLock.mainColor
    const refAngle    = identityLock.referenceAngle || 'unknown'
    const zoneBlock   = identityLock.protectedZoneBlock || ''
    const hasBrandZones = (identityLock.protectedZones?.length ?? 0) > 0

    // Compute scene background (target output color) — used in scene prompts
    // D-233: per-product variant so different products with the same shoe
    // color get different premium backdrops.
    const premiumBackground = getBackgroundForColor(mainColor, productId)
    const bgRGB = getBackgroundRGB(premiumBackground)

    // D-167: paddingRGB no longer used for actual padding (replaced by
    // mirror-extend below). Kept for logging/audit only.
    const paddingRGB = bgRGB // historical ref — see D-167

    console.log(
      `[generateByGeminiPro D-167] scene-bg=${JSON.stringify(bgRGB)} (prompt target) — padding: mirror-extend (no solid color)`,
    )

    // D-167: Mirror-extend padding — same as generateByEditing.
    // See D-167 comment block above for the full rationale.
    const refMetaGP = await sharp(referenceImage).metadata()
    const refWGP = refMetaGP.width ?? 768
    const refHGP = refMetaGP.height ?? 768
    const innerScaleGP = Math.min(768 / refWGP, 768 / refHGP, 1)
    const fitWGP = Math.round(refWGP * innerScaleGP)
    const fitHGP = Math.round(refHGP * innerScaleGP)

    const resizedBufGP = await sharp(referenceImage)
      .resize(fitWGP, fitHGP)
      .png()
      .toBuffer()

    const mirrorTopGP = Math.floor((768 - fitHGP) / 2)
    const mirrorBottomGP = 768 - fitHGP - mirrorTopGP
    const mirrorLeftGP = Math.floor((768 - fitWGP) / 2)
    const mirrorRightGP = 768 - fitWGP - mirrorLeftGP

    const innerBuffer = await sharp(resizedBufGP)
      .extend({
        top: mirrorTopGP, bottom: mirrorBottomGP,
        left: mirrorLeftGP, right: mirrorRightGP,
        extendWith: 'mirror',
      })
      .png()
      .toBuffer()

    const pngBuffer = await sharp(innerBuffer)
      .extend({
        top: 128, bottom: 128, left: 128, right: 128,
        extendWith: 'mirror',
      })
      .png()
      .toBuffer()

    console.log(`[generateByGeminiPro D-167] PNG 1024×1024 ready — ${pngBuffer.length}b (shoe at ${fitWGP}×${fitHGP} center, mirror-extend padding)`)
    console.log(`[lock-reminder D-153] v50 LOCKED rules prepended to every slot prompt — ${LOCK_REMINDER_BLOCK.length}b reminder block active`)

    for (const scene of scenes) {
      const sceneText = scene.sceneInstructions
        .replace(/\{COLOR\}/g, mainColor)
        .replace(/\{REF_ANGLE\}/g, refAngle)
        .replace(/\{BACKGROUND\}/g, premiumBackground)

      // Same 5-block prompt structure as generateByEditing
      const fullPrompt = LOCK_REMINDER_BLOCK + TASK_FRAMING_BLOCK + identityLock.promptBlock + zoneBlock + sceneText + CANONICAL_PROHIBITIONS_BLOCK + ANTI_FRAME_FINAL_BLOCK

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

        const needsRetry = !colorCheck.match || (brandCheck !== null && !brandCheck.pass) || !shotCheck.pass

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
          const reinforcedPrompt = correctionLines.join('\n') + '\n\n' + fullPrompt

          console.warn(
            `[generateByGeminiPro v20] ✗ ${scene.name} fidelity issues — ` +
            `color=${colorCheck.match} brand=${brandCheck?.pass ?? 'skip'} ` +
            `shot=${shotCheck.pass} (detected="${shotCheck.detectedShot.slice(0, 60)}") — retrying`,
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

          const warnings: string[] = []
          if (!retryColor.match) warnings.push(`color drift: expected ${mainColor} got ${retryColor.detectedColor}`)
          if (slotLog.brandFidelityPass === false) warnings.push(`brand zones drifted: ${slotLog.brandFidelityNotes || 'unknown'}`)
          if (slotLog.shotCompliancePass === false) warnings.push(`angle wrong: got "${slotLog.detectedShot || 'unknown'}"`)
          if (warnings.length > 0) slotLog.rejectionReason = warnings.join('; ')

          finalBuf = retryJpeg
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

      if (finalBuf) {
        // D-201: Orientation auto-fix for side_angle — toe must point LEFT
        if (scene.name === 'side_angle' && geminiKey) {
          try {
            const orientation = await checkShoeOrientation(finalBuf, geminiKey)
            if (orientation === 'right') {
              console.log(`[generateByGeminiPro D-201] side_angle toe points RIGHT — flipping horizontally`)
              finalBuf = await sharp(finalBuf).flop().jpeg({ quality: 92 }).toBuffer()
              ;(slotLog as Record<string, unknown>).orientationFixed = true
            } else {
              console.log(`[generateByGeminiPro D-201] side_angle orientation OK: ${orientation}`)
              ;(slotLog as Record<string, unknown>).orientationFixed = false
            }
          } catch (flipErr) {
            console.warn('[generateByGeminiPro D-201] orientation check failed:', flipErr)
          }
        }

        result.buffers.push(finalBuf)
        result.successCount++
        slotLog.success = true
        slotLog.outputSizeBytes = finalBuf.length
        console.log(
          `[generateByGeminiPro v20] ✓ ${scene.name} — ${finalBuf.length}b ` +
          `(attempts=${slotLog.attempts} color=${slotLog.colorCheckPass ?? 'skip'} ` +
          `brand=${slotLog.brandFidelityPass ?? 'skip'} shot=${slotLog.shotCompliancePass ?? 'skip'})`,
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
    if (s.colorCheckPass === false || s.brandFidelityPass === false || s.shotCompliancePass === false) return '⚠'
    return '✓'
  }).join('')
  console.log(`[generateByGeminiPro v20] done — ${result.successCount}/${result.promptCount} [${slotSummary}]`)

  return { results: [result], buffers: result.buffers, slotLogs }
}
