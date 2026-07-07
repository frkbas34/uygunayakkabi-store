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
 * Median RGB of the four corner patches — the robust background estimate. Median
 * survives one contaminated corner (e.g. the stock-number pill in the bottom
 * right). Returns null on failure so the caller can fall back to the studio ivory.
 */
async function sampleCornerBg(
  sharp: typeof import('sharp'),
  input: Buffer,
  W: number,
  H: number,
): Promise<RGB | null> {
  try {
    const p = Math.max(8, Math.round(Math.min(W, H) / 25))
    const corners = [
      { left: 0, top: 0 }, { left: W - p, top: 0 },
      { left: 0, top: H - p }, { left: W - p, top: H - p },
    ]
    const rs: number[] = [], gs: number[] = [], bs: number[] = []
    for (const c of corners) {
      const { data, info } = await sharp(input)
        .extract({ left: c.left, top: c.top, width: p, height: p })
        .removeAlpha().raw().toBuffer({ resolveWithObject: true })
      const n = info.width * info.height
      if (n === 0) continue
      let r = 0, g = 0, b = 0
      for (let i = 0; i < data.length; i += 3) { r += data[i]; g += data[i + 1]; b += data[i + 2] }
      rs.push(r / n); gs.push(g / n); bs.push(b / n)
    }
    if (rs.length < 3) return null
    const median = (arr: number[]): number => {
      const s = [...arr].sort((a, b) => a - b)
      const m = Math.floor(s.length / 2)
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
    }
    return { r: Math.round(median(rs)), g: Math.round(median(gs)), b: Math.round(median(bs)) }
  } catch {
    return null
  }
}

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
  const thresh = opts?.bgDistanceThreshold ?? 46
  const thresh2 = thresh * thresh
  const scanMax = opts?.scanMax ?? 256

  const meta = await sharp(input).metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  if (!W || !H) return null

  // D-412: sample the ACTUAL background from the four corners (median per channel,
  // robust to one outlier corner like the stock-number pill) instead of assuming a
  // fixed ivory. Handles per-product background tint drift. Falls back to the
  // studio ivory when an explicit backgroundHex is given or sampling fails.
  const bg = opts?.backgroundHex
    ? hexToRgb(opts.backgroundHex)
    : (await sampleCornerBg(sharp, input, W, H)) ?? hexToRgb(STUDIO_BG_HEX)

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

    // D-413: CROP-WINDOW centering (no flat-canvas composite → no seam/frame).
    // Instead of lifting the shoe bbox onto a fresh flat canvas — which renders a
    // visible rectangle whenever the studio backdrop is gradient — we compute a
    // square crop WINDOW centered on the shoe, sized so the shoe's longer side is
    // `coverage` of the window, and extract that window straight from the original.
    // The background inside the window is the REAL (continuous, gradient) backdrop,
    // so there is no tone seam. Out-of-bounds is edge-replicated so the gradient
    // continues instead of introducing a hard border.
    const S = Math.min(canvasW, canvasH)
    const bw = bbox.width, bh = bbox.height
    const longSide = Math.max(bw, bh)
    const windowSide = Math.max(longSide + 4, Math.round(longSide / coverage))
    const cx = bbox.left + bw / 2
    const cy = bbox.top + bh / 2
    let left = Math.round(cx - windowSide / 2)
    let top = Math.round(cy - windowSide / 2)

    const padLeft = Math.max(0, -left)
    const padTop = Math.max(0, -top)
    const padRight = Math.max(0, left + windowSide - canvasW)
    const padBottom = Math.max(0, top + windowSide - canvasH)

    let src = input
    if (padLeft || padTop || padRight || padBottom) {
      src = await sharp(input)
        .extend({ top: padTop, bottom: padBottom, left: padLeft, right: padRight, extendWith: 'copy' })
        .toBuffer()
      left += padLeft
      top += padTop
    }

    const out = await sharp(src)
      .extract({ left, top, width: windowSide, height: windowSide })
      .resize(S, S, { fit: 'fill' })
      .jpeg({ quality: opts.jpegQuality ?? 92 })
      .toBuffer()

    return out
  } catch (err) {
    console.warn('[normalizeProductCentering] skipped (returning original):', err instanceof Error ? err.message : err)
    return input
  }
}
