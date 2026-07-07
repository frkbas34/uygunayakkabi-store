/**
 * imageCentering — D-408 DETERMINISTIC CENTERING / SCALE LOCK
 *
 * Problem (operator-reported): generated slots are inconsistently framed — the
 * shoe is too close in one slot, too far in another, and never equally centered.
 * Prompt text ("shoe fills ~78% width, centered") does NOT reliably control the
 * model's composition, so equality can't be guaranteed at the prompt layer.
 *
 * Fix: a deterministic post-process. After a slot image is generated (either
 * provider), we detect the product's bounding box against the known uniform
 * ivory studio background, then rescale it so the product occupies a FIXED
 * fraction of the canvas and center it on a fresh ivory canvas. Every slot then
 * shares the exact same scale + centering, regardless of what the model framed.
 *
 * This runs BEFORE the stock-number overlay so the corner badge never affects
 * the detected bounding box. It is additive and fully reversible — on any error,
 * or when detection is unreliable, it returns the original buffer unchanged.
 *
 * No provider calls, no randomness, no network. Pure sharp.
 */

// The locked studio background (kept in sync with imageProviders STUDIO_STANDARD
// and the storefront --product-image-bg). Detection thresholds are measured as
// Euclidean RGB distance from this colour.
export const STUDIO_BG_HEX = '#F4EFE6'

export type CenteringOptions = {
  /**
   * Target fraction of the canvas the product's LONGER side should occupy
   * (0..1). The same value across slots = equal visual scale. Full-shoe slots
   * use ~0.82; a tight material detail uses a higher value (fills more).
   */
  coverage: number
  /** Background hex for detection + the output canvas. Defaults to the studio ivory. */
  backgroundHex?: string
  /**
   * A pixel counts as "product" when its Euclidean RGB distance from the
   * background exceeds this. ~46 keeps the soft shadow (near-ivory) out while
   * catching real product pixels. Tunable per call.
   */
  bgDistanceThreshold?: number
  /**
   * If the detected product already covers at least this fraction of the
   * canvas, skip normalization and return the input (the shot already fills the
   * frame — e.g. a tight material close-up — and re-centering would only add an
   * unwanted ivory border). Default 0.9.
   */
  skipIfCoverageAbove?: number
  /**
   * If the detected product covers less than this fraction, treat detection as
   * unreliable (noise / failed segmentation) and return the input unchanged.
   * Default 0.02.
   */
  minCoverage?: number
  /** JPEG quality for the normalized output. Default 92. */
  jpegQuality?: number
}

type RGB = { r: number; g: number; b: number }

export function hexToRgb(hex: string): RGB {
  const m = hex.replace('#', '')
  return {
    r: parseInt(m.slice(0, 2), 16),
    g: parseInt(m.slice(2, 4), 16),
    b: parseInt(m.slice(4, 6), 16),
  }
}

export type Bbox = { left: number; top: number; width: number; height: number }

/**
 * Detect the product bounding box against a uniform background colour.
 * Scans a downscaled copy (fast) and maps the box back to full resolution.
 * Returns null when no meaningful subject is found.
 */
export async function detectSubjectBbox(
  input: Buffer,
  opts?: { backgroundHex?: string; bgDistanceThreshold?: number; scanMax?: number },
): Promise<{ bbox: Bbox; canvasW: number; canvasH: number; coverage: number } | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require('sharp') as typeof import('sharp')
  const bg = hexToRgb(opts?.backgroundHex ?? STUDIO_BG_HEX)
  const thresh = opts?.bgDistanceThreshold ?? 46
  const thresh2 = thresh * thresh
  const scanMax = opts?.scanMax ?? 256

  const meta = await sharp(input).metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  if (!W || !H) return null

  const scanW = Math.min(scanMax, W)
  const scale = scanW / W
  const scanH = Math.max(1, Math.round(H * scale))

  const { data, info } = await sharp(input)
    .removeAlpha()
    .resize(scanW, scanH, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const ch = info.channels
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * ch
      const dr = data[i] - bg.r
      const dg = data[i + 1] - bg.g
      const db = data[i + 2] - bg.b
      if (dr * dr + dg * dg + db * db > thresh2) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX < 0) return null // nothing but background

  // Map the scan-space bbox back to full resolution.
  const fLeft = Math.max(0, Math.floor(minX / scale))
  const fTop = Math.max(0, Math.floor(minY / scale))
  const fRight = Math.min(W, Math.ceil((maxX + 1) / scale))
  const fBottom = Math.min(H, Math.ceil((maxY + 1) / scale))
  const bbox: Bbox = { left: fLeft, top: fTop, width: fRight - fLeft, height: fBottom - fTop }

  const coverage = Math.max(bbox.width / W, bbox.height / H)
  return { bbox, canvasW: W, canvasH: H, coverage }
}

/**
 * Normalize product centering + scale: detect the product, rescale so its longer
 * side is `coverage` of the canvas, and center it on a fresh ivory square canvas.
 * Returns the original buffer unchanged when normalization should not apply.
 */
export async function normalizeProductCentering(
  input: Buffer,
  opts: CenteringOptions,
): Promise<Buffer> {
  const coverage = opts.coverage
  if (!(coverage > 0 && coverage <= 1)) return input
  const skipAbove = opts.skipIfCoverageAbove ?? 0.9
  const minCoverage = opts.minCoverage ?? 0.02
  const bgHex = opts.backgroundHex ?? STUDIO_BG_HEX
  const bg = hexToRgb(bgHex)

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as typeof import('sharp')

    const detected = await detectSubjectBbox(input, {
      backgroundHex: bgHex,
      bgDistanceThreshold: opts.bgDistanceThreshold,
    })
    if (!detected) return input
    const { bbox, canvasW, canvasH, coverage: actual } = detected

    // Already fills the frame (e.g. tight material detail) — leave it alone.
    if (actual >= skipAbove) return input
    // Detection too small — likely noise / failed segmentation.
    if (actual < minCoverage) return input
    if (bbox.width < 2 || bbox.height < 2) return input

    // Output is a square canvas sized to the input's shorter side (generation is
    // square, so this is a no-op sizing; robust if a non-square ever appears).
    const S = Math.min(canvasW, canvasH)

    // Extract the product, rescale so its longer side == coverage * S.
    const subject = await sharp(input)
      .extract({ left: bbox.left, top: bbox.top, width: bbox.width, height: bbox.height })
      .toBuffer()

    const targetLong = Math.max(1, Math.round(coverage * S))
    const subjLong = Math.max(bbox.width, bbox.height)
    const rescale = targetLong / subjLong
    const newW = Math.max(1, Math.round(bbox.width * rescale))
    const newH = Math.max(1, Math.round(bbox.height * rescale))

    const resized = await sharp(subject)
      .resize(newW, newH, { fit: 'fill' })
      .toBuffer()

    const left = Math.round((S - newW) / 2)
    const top = Math.round((S - newH) / 2)

    const out = await sharp({
      create: { width: S, height: S, channels: 3, background: { r: bg.r, g: bg.g, b: bg.b } },
    })
      .composite([{ input: resized, left, top }])
      .jpeg({ quality: opts.jpegQuality ?? 92 })
      .toBuffer()

    return out
  } catch (err) {
    console.warn('[normalizeProductCentering] skipped (returning original):', err instanceof Error ? err.message : err)
    return input
  }
}
