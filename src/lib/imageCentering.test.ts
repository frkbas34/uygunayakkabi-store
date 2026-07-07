import assert from 'node:assert'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof import('sharp')
import {
  normalizeProductCentering,
  makePairShot,
  normalizeBackground,
  detectSubjectBbox,
  hexToRgb,
  STUDIO_BG_HEX,
} from './imageCentering'

let passed = 0

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

const IVORY = hexToRgb(STUDIO_BG_HEX)

/** Build a square ivory canvas with an optional near-black rectangle ("product"). */
async function makeImg(
  S: number,
  rect: { x: number; y: number; w: number; h: number } | null,
): Promise<Buffer> {
  let img = sharp({
    create: { width: S, height: S, channels: 3, background: { r: IVORY.r, g: IVORY.g, b: IVORY.b } },
  })
  if (rect) {
    const overlay = await sharp({
      create: { width: rect.w, height: rect.h, channels: 3, background: { r: 12, g: 12, b: 14 } },
    }).png().toBuffer()
    img = img.composite([{ input: overlay, left: rect.x, top: rect.y }])
  }
  return img.png().toBuffer()
}

const center = (b: { left: number; top: number; width: number; height: number }) => ({
  cx: b.left + b.width / 2,
  cy: b.top + b.height / 2,
})
const longer = (b: { width: number; height: number }) => Math.max(b.width, b.height)

// ── detection ───────────────────────────────────────────────────────────────
void (async () => {
  await check('hexToRgb parses the studio ivory', () => {
    assert.deepStrictEqual(hexToRgb('#F4EFE6'), { r: 244, g: 239, b: 230 })
  })

  await check('detectSubjectBbox finds an off-center product box', async () => {
    const img = await makeImg(300, { x: 40, y: 30, w: 60, h: 90 })
    const d = await detectSubjectBbox(img)
    assert.ok(d, 'should detect a subject')
    // within a few px of the drawn rect
    assert.ok(Math.abs(d!.bbox.left - 40) <= 4, `left ${d!.bbox.left}`)
    assert.ok(Math.abs(d!.bbox.width - 60) <= 6, `width ${d!.bbox.width}`)
    assert.ok(Math.abs(d!.bbox.height - 90) <= 6, `height ${d!.bbox.height}`)
  })

  await check('detectSubjectBbox returns null for an all-ivory image', async () => {
    const blank = await makeImg(200, null)
    assert.strictEqual(await detectSubjectBbox(blank), null)
  })

  // ── the core fix: equal scale + centered across slots ──────────────────────
  await check('an off-center small product becomes centered at the target scale', async () => {
    const S = 300
    const img = await makeImg(S, { x: 30, y: 20, w: 40, h: 60 })
    const out = await normalizeProductCentering(img, { coverage: 0.8 })
    const d = await detectSubjectBbox(out)
    assert.ok(d, 'subject present after normalization')
    const { cx, cy } = center(d!.bbox)
    assert.ok(Math.abs(cx - S / 2) <= 6, `not horizontally centered (cx=${cx}, want ${S / 2})`)
    assert.ok(Math.abs(cy - S / 2) <= 6, `not vertically centered (cy=${cy}, want ${S / 2})`)
    assert.ok(Math.abs(longer(d!.bbox) - 0.8 * S) <= 12, `longer side ${longer(d!.bbox)} != ~${0.8 * S}`)
  })

  await check('a too-close and a too-far shot normalize to the SAME scale (equality lock)', async () => {
    const S = 400
    const tooClose = await makeImg(S, { x: 60, y: 90, w: 280, h: 200 }) // big / close
    const tooFar = await makeImg(S, { x: 170, y: 150, w: 60, h: 90 })   // small / distant
    const a = await detectSubjectBbox(await normalizeProductCentering(tooClose, { coverage: 0.8 }))
    const b = await detectSubjectBbox(await normalizeProductCentering(tooFar, { coverage: 0.8 }))
    assert.ok(a && b)
    // both longer sides should land on ~0.8*400 = 320 and match each other
    assert.ok(Math.abs(longer(a!.bbox) - longer(b!.bbox)) <= 12,
      `scales not equal across slots: ${longer(a!.bbox)} vs ${longer(b!.bbox)}`)
    assert.ok(Math.abs(longer(a!.bbox) - 320) <= 14, `close-shot scale ${longer(a!.bbox)} off target`)
  })

  // ── guards ─────────────────────────────────────────────────────────────────
  await check('a frame-filling shot is left unchanged (no forced ivory border)', async () => {
    const S = 300
    const full = await makeImg(S, { x: 6, y: 6, w: 288, h: 288 }) // ~0.96 coverage > 0.9
    const out = await normalizeProductCentering(full, { coverage: 0.82 })
    assert.strictEqual(out, full, 'should skip and return the identical buffer')
  })

  await check('an all-ivory image is returned unchanged', async () => {
    const blank = await makeImg(200, null)
    assert.strictEqual(await normalizeProductCentering(blank, { coverage: 0.82 }), blank)
  })

  await check('invalid coverage returns the input unchanged', async () => {
    const img = await makeImg(120, { x: 10, y: 10, w: 20, h: 20 })
    assert.strictEqual(await normalizeProductCentering(img, { coverage: 0 }), img)
    assert.strictEqual(await normalizeProductCentering(img, { coverage: 1.5 }), img)
  })

  // ── D-416/D-417 deterministic duplicate pair ───────────────────────────────
  await check('makePairShot: the two shoes are IDENTICAL copies (not mirrored — text stays readable)', async () => {
    const S = 400
    const img = await makeImg(S, { x: 60, y: 130, w: 130, h: 90 }) // off-centre asymmetric
    const pair = await makePairShot(img, { coverage: 0.8 })
    const meta = await sharp(pair).metadata()
    const W = meta.width || 0, H = meta.height || 0
    assert.ok(Math.abs(W - S) <= 2, `width ${W}`)
    assert.ok(Math.abs(H - S) <= 2, `height ${H}`)
    // left half === right half (copies, same orientation). NOT mirror-symmetric.
    const halfW = Math.floor(W / 2)
    const lh = await sharp(pair).extract({ left: 0, top: 0, width: halfW, height: H }).removeAlpha().raw().toBuffer()
    const rh = await sharp(pair).extract({ left: W - halfW, top: 0, width: halfW, height: H }).removeAlpha().raw().toBuffer()
    let diff = 0
    for (let i = 0; i < lh.length; i++) diff += Math.abs(lh[i] - rh[i])
    const mad = diff / lh.length
    // left half === right half → the two shoes are the same copy (not a flip).
    assert.ok(mad < 4, `halves not identical (mean abs diff ${mad.toFixed(2)})`)
  })

  await check('makePairShot returns the input unchanged when no subject is found', async () => {
    const blank = await makeImg(200, null)
    assert.strictEqual(await makePairShot(blank), blank)
  })

  // ── D-419 background normalization ──────────────────────────────────────────
  const cornerRGB = async (buf: Buffer) => {
    const { data } = await sharp(buf).extract({ left: 2, top: 2, width: 16, height: 16 }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    let r = 0, g = 0, b = 0; const n = data.length / 3
    for (let i = 0; i < data.length; i += 3) { r += data[i]; g += data[i + 1]; b += data[i + 2] }
    return { r: r / n, g: g / n, b: b / n }
  }
  const distToTarget = (c: { r: number; g: number; b: number }) => Math.hypot(c.r - IVORY.r, c.g - IVORY.g, c.b - IVORY.b)

  await check('normalizeBackground pulls an off-tone background toward the target ivory', async () => {
    const S = 200
    const dark = await sharp({ create: { width: 40, height: 40, channels: 3, background: { r: 20, g: 20, b: 22 } } }).png().toBuffer()
    const img = await sharp({ create: { width: S, height: S, channels: 3, background: { r: 220, g: 208, b: 190 } } })
      .composite([{ input: dark, left: 80, top: 80 }]).jpeg().toBuffer()
    const before = await cornerRGB(img)
    const after = await cornerRGB(await normalizeBackground(img))
    assert.ok(distToTarget(after) < distToTarget(before) - 5,
      `bg not moved toward target: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`)
  })

  await check('normalizeBackground skips when the corner is not a light background', async () => {
    // whole image is dark (corner is "product", not bg) → must not touch it
    const darkImg = await sharp({ create: { width: 120, height: 120, channels: 3, background: { r: 30, g: 30, b: 30 } } }).jpeg().toBuffer()
    assert.strictEqual(await normalizeBackground(darkImg), darkImg)
  })

  console.log(`\nimageCentering: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
})()
