import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof import('sharp')

import {
  VISUAL_LOCK_V01_FRAMING_CORRECTION_LIMITS,
  VISUAL_LOCK_V01_FRAMING_CORRECTION_VERSION,
  correctVisualLockV01Framing,
} from './imageFramingCorrectionV01'
import {
  combineVisualQualityGateV01,
  evaluateVisualGeometryPackV01,
  inspectVisualGeometryForegroundV01,
  measureVisualGeometryV01,
} from './imageVisualLockV01'
import type { SlotKey } from './imageSlotContract'

let passed = 0

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn()
    passed += 1
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    console.error(error)
    process.exitCode = 1
  }
}

type Rect = {
  left: number
  top: number
  width: number
  height: number
  color?: string
  radius?: number
  markers?: boolean
}

async function fixture(params: {
  width?: number
  height?: number
  background?: string
  rects: Rect[]
}): Promise<Buffer> {
  const width = params.width ?? 512
  const height = params.height ?? 512
  const overlays = params.rects.map((rect) => {
    const markers = rect.markers
      ? `<rect x="${Math.round(rect.width * 0.08)}" y="${Math.round(rect.height * 0.32)}" width="18" height="18" fill="#d92d20"/>`
        + `<rect x="${Math.round(rect.width * 0.86)}" y="${Math.round(rect.height * 0.32)}" width="18" height="18" fill="#2563eb"/>`
      : ''
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">`
      + `<rect width="100%" height="100%" rx="${rect.radius ?? 12}" fill="${rect.color ?? '#252525'}"/>`
      + markers
      + '</svg>',
    )
    return { input: svg, left: rect.left, top: rect.top }
  })
  return sharp({
    create: { width, height, channels: 3, background: params.background ?? '#F7F5F0' },
  }).composite(overlays).jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer()
}

async function gradientFixture(): Promise<Buffer> {
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">'
    + '<defs><linearGradient id="bg" x1="0" x2="1"><stop offset="0" stop-color="#F7F5F0"/>'
    + '<stop offset="1" stop-color="#D8C8B2"/></linearGradient></defs>'
    + '<rect width="512" height="512" fill="url(#bg)"/>'
    + '<rect x="92" y="190" width="378" height="132" rx="12" fill="#252525"/>'
    + '</svg>',
  )
  return sharp(svg).jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer()
}

async function colorCentroidX(input: Buffer, color: 'red' | 'blue'): Promise<number> {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let sum = 0
  let count = 0
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const index = (y * info.width + x) * info.channels
      const r = data[index]
      const g = data[index + 1]
      const b = data[index + 2]
      const match = color === 'red'
        ? r > 145 && r > g * 1.45 && r > b * 1.25
        : b > 145 && b > r * 1.35 && b > g * 1.1
      if (match) {
        sum += x
        count += 1
      }
    }
  }
  assert.ok(count > 20, `${color} orientation marker must remain visible`)
  return sum / count
}

const compliant = () => fixture({ rects: [{ left: 67, top: 190, width: 378, height: 132, markers: true }] })
const offCenter = () => fixture({ rects: [{ left: 92, top: 190, width: 378, height: 132, markers: true }] })

async function main(): Promise<void> {
await check('1 already-compliant V0.1 candidate is a byte-for-byte no-op', async () => {
  const input = await compliant()
  const result = await correctVisualLockV01Framing(input, 'side')
  assert.strictEqual(result.buffer, input)
  assert.ok(result.buffer.equals(input))
  assert.equal(result.evidence.outcome, 'not_required')
  assert.equal(result.evidence.state, 'pass')
  assert.equal(result.evidence.appliedScale, 1)
  assert.equal(result.evidence.appliedTranslationXPercent, 0)
  assert.equal(result.evidence.appliedTranslationYPercent, 0)
  assert.equal(result.evidence.paddingUsed, false)
})

await check('2 safely off-center full product is recentered', async () => {
  const input = await offCenter()
  const result = await correctVisualLockV01Framing(input, 'side')
  assert.notStrictEqual(result.buffer, input)
  assert.equal(result.evidence.outcome, 'applied')
  assert.equal(result.evidence.finalGeometryState, 'pass')
  assert.ok((result.evidence.finalGeometry.measurement?.maximumCenterOffsetPercent ?? 99) <= 3)
  assert.ok(Math.abs(result.evidence.appliedTranslationXPercent) <= 12)
})

await check('3 safely oversized candidate is uniformly reduced into its slot envelope', async () => {
  const input = await fixture({ rects: [{ left: 31, top: 190, width: 450, height: 132 }] })
  const result = await correctVisualLockV01Framing(input, 'hero_3q')
  assert.equal(result.evidence.outcome, 'applied')
  assert.ok(result.evidence.appliedScale < 1)
  assert.ok(result.evidence.appliedScale >= VISUAL_LOCK_V01_FRAMING_CORRECTION_LIMITS.minimumDownscaleFactor)
  const occupancy = result.evidence.finalGeometry.measurement?.occupancyPercent ?? 0
  assert.ok(occupancy >= 72 && occupancy <= 82)
})

await check('4 safely undersized candidate enlarges only inside the 1.15x limit', async () => {
  const safe = await fixture({ rects: [{ left: 91, top: 196, width: 330, height: 120 }] })
  const corrected = await correctVisualLockV01Framing(safe, 'top')
  assert.equal(corrected.evidence.outcome, 'applied')
  assert.ok(corrected.evidence.appliedScale > 1 && corrected.evidence.appliedScale <= 1.15)

  const excessive = await fixture({ rects: [{ left: 106, top: 196, width: 300, height: 120 }] })
  const blocked = await correctVisualLockV01Framing(excessive, 'top')
  assert.strictEqual(blocked.buffer, excessive)
  assert.equal(blocked.evidence.outcome, 'transform_outside_allowed_bounds')
  assert.ok(blocked.evidence.reasonCodes.includes('required_scale_above_1_15'))
})

await check('5 uniform scale preserves foreground aspect ratio', async () => {
  const input = await fixture({ rects: [{ left: 31, top: 190, width: 450, height: 132 }] })
  const before = await inspectVisualGeometryForegroundV01(input)
  const result = await correctVisualLockV01Framing(input, 'back')
  const after = await inspectVisualGeometryForegroundV01(result.buffer)
  assert.ok(before && after)
  const beforeRatio = before.boundingBox.width / before.boundingBox.height
  const afterRatio = after.boundingBox.width / after.boundingBox.height
  assert.ok(Math.abs(beforeRatio - afterRatio) < 0.06)
  assert.equal(result.evidence.aspectRatioChange, 0)
})

await check('6 correction never rotates, mirrors, warps, or scales non-uniformly', async () => {
  const input = await offCenter()
  const beforeRed = await colorCentroidX(input, 'red')
  const beforeBlue = await colorCentroidX(input, 'blue')
  const result = await correctVisualLockV01Framing(input, 'side')
  const afterRed = await colorCentroidX(result.buffer, 'red')
  const afterBlue = await colorCentroidX(result.buffer, 'blue')
  assert.ok(beforeRed < beforeBlue && afterRed < afterBlue)
  assert.equal(result.evidence.rotationDegrees, 0)
  assert.equal(result.evidence.mirrored, false)
  assert.equal(result.evidence.aspectRatioChange, 0)
  const source = readFileSync(new URL('./imageFramingCorrectionV01.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /\.(?:rotate|flip|flop|affine|recomb)\s*\(/)
})

await check('7 product and retained contact-shadow evidence are not cropped', async () => {
  const input = await fixture({ rects: [
    { left: 92, top: 180, width: 378, height: 120, radius: 20 },
    { left: 121, top: 315, width: 320, height: 12, radius: 6, color: '#b9b5ad' },
  ] })
  const before = await inspectVisualGeometryForegroundV01(input)
  assert.ok(before && before.retainedComponents.length >= 2)
  assert.equal(before.additionalProductSuspected, false)
  const result = await correctVisualLockV01Framing(input, 'side')
  assert.equal(result.evidence.outcome, 'applied')
  const after = await inspectVisualGeometryForegroundV01(result.buffer)
  assert.ok(after && after.retainedComponents.length >= 2)
  assert.equal(after.additionalProductSuspected, false)
  assert.ok(after.boundingBox.x > 0 && after.boundingBox.y > 0)
  assert.ok(after.boundingBox.x + after.boundingBox.width < 1)
  assert.ok(after.boundingBox.y + after.boundingBox.height < 1)
})

await check('8 existing edge clipping and additional-product evidence are not falsely repaired', async () => {
  const clipped = await fixture({ rects: [{ left: 0, top: 190, width: 378, height: 132 }] })
  const clippedResult = await correctVisualLockV01Framing(clipped, 'side')
  assert.strictEqual(clippedResult.buffer, clipped)
  assert.equal(clippedResult.evidence.outcome, 'unsafe_existing_clipping')

  const pair = await fixture({ rects: [
    { left: 38, top: 145, width: 220, height: 100 },
    { left: 265, top: 275, width: 210, height: 95 },
  ] })
  const pairResult = await correctVisualLockV01Framing(pair, 'hero_3q')
  assert.strictEqual(pairResult.buffer, pair)
  assert.equal(pairResult.evidence.state, 'unknown')
  assert.ok(pairResult.evidence.reasonCodes.includes('additional_product_suspected'))
})

await check('9 transforms outside scale or translation limits remain uncorrectable', async () => {
  const tooSmall = await fixture({ rects: [{ left: 106, top: 196, width: 300, height: 120 }] })
  const tooLarge = await fixture({ rects: [{ left: 15, top: 190, width: 482, height: 132 }] })
  const tooFar = await fixture({ rects: [{ left: 15, top: 196, width: 326, height: 120 }] })
  const results = await Promise.all([
    correctVisualLockV01Framing(tooSmall, 'side'),
    correctVisualLockV01Framing(tooLarge, 'side'),
    correctVisualLockV01Framing(tooFar, 'side'),
  ])
  assert.equal(results[0].evidence.outcome, 'transform_outside_allowed_bounds', JSON.stringify(results[0].evidence.reasonCodes))
  assert.equal(results[1].evidence.outcome, 'transform_outside_allowed_bounds', JSON.stringify(results[1].evidence.reasonCodes))
  assert.equal(results[2].evidence.outcome, 'transform_outside_allowed_bounds', JSON.stringify(results[2].evidence.reasonCodes))
  assert.ok(results[0].evidence.reasonCodes.includes('required_scale_above_1_15'))
  assert.ok(results[1].evidence.reasonCodes.includes('required_scale_below_reciprocal_1_15'))
  assert.ok(results[2].evidence.reasonCodes.includes('translation_above_12_percent'))
})

await check('10 unsafe background extension stays unverifiable and unchanged', async () => {
  const input = await fixture({ background: '#8b1d1d', rects: [{ left: 92, top: 190, width: 378, height: 132 }] })
  const result = await correctVisualLockV01Framing(input, 'side')
  assert.strictEqual(result.buffer, input)
  assert.equal(result.evidence.outcome, 'unsafe_background_extension')
  assert.equal(result.evidence.state, 'unknown')
  assert.ok(result.evidence.reasonCodes.includes('background_not_warm_neutral'))

  const gradient = await gradientFixture()
  const gradientResult = await correctVisualLockV01Framing(gradient, 'side')
  assert.strictEqual(gradientResult.buffer, gradient)
  assert.equal(gradientResult.evidence.outcome, 'unsafe_background_extension')
  assert.ok(gradientResult.evidence.reasonCodes.includes('background_nonuniform'))
})

await check('11 geometry is recomputed from the corrected artifact', async () => {
  const result = await correctVisualLockV01Framing(await offCenter(), 'side')
  const remeasured = await measureVisualGeometryV01(result.buffer)
  assert.deepEqual(remeasured, result.evidence.finalGeometry.measurement)
  assert.notDeepEqual(result.evidence.originalBoundingBox, result.evidence.finalBoundingBox)
})

await check('12 geometry passes only when measured final artifact passes', async () => {
  const applied = await correctVisualLockV01Framing(await offCenter(), 'side')
  assert.equal(applied.evidence.outcome, 'applied')
  assert.equal(applied.evidence.finalGeometry.state, 'pass')
  assert.equal(applied.evidence.finalGeometryState, 'pass')
  const source = readFileSync(new URL('./imageFramingCorrectionV01.ts', import.meta.url), 'utf8')
  assert.match(source, /if \(final\.geometry\.state !== 'pass'\)[\s\S]*outcome|if \(final\.geometry\.state !== 'pass'\)/)
})

await check('13 pack spread is calculated from final corrected measurements', async () => {
  const slots: Array<Exclude<SlotKey, 'detail'>> = ['side', 'hero_3q', 'top', 'back']
  const corrected = await Promise.all(slots.map(async (slotId, index) => {
    const input = await fixture({ rects: [{ left: 78 + index * 3, top: 190, width: 378, height: 132 }] })
    return correctVisualLockV01Framing(input, slotId)
  }))
  const pack = evaluateVisualGeometryPackV01(corrected.map((result) => result.evidence.finalGeometry))
  const occupancies = corrected.map((result) => result.evidence.finalGeometry.measurement!.occupancyPercent)
  assert.equal(pack.occupancyMinimumPercent, Math.min(...occupancies))
  assert.equal(pack.occupancyMaximumPercent, Math.max(...occupancies))
  assert.equal(pack.occupancySpreadPercent, Number((Math.max(...occupancies) - Math.min(...occupancies)).toFixed(3)))
})

await check('14 semantic failures remain failures after a framing pass', () => {
  assert.equal(combineVisualQualityGateV01(['fail', 'pass', 'pass', 'pass'], 'pass'), 'fail')
  assert.equal(combineVisualQualityGateV01(['pass', 'unknown', 'pass', 'pass'], 'pass'), 'unknown')
  assert.equal(combineVisualQualityGateV01(['pass', 'pass', 'fail', 'pass'], 'pass'), 'fail')
})

await check('15 correction adds no provider or evaluator call and runs before the existing evaluator', () => {
  const correction = readFileSync(new URL('./imageFramingCorrectionV01.ts', import.meta.url), 'utf8')
  const providers = readFileSync(new URL('./imageProviders.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(correction, /\bfetch\s*\(|checkVisualQuality|generateBy|callGemini|callGPT|payload\./)
  assert.equal((providers.match(/await checkVisualQualityV01\(/g) ?? []).length, 2)
  assert.equal((providers.match(/await correctVisualLockV01Framing\(/g) ?? []).length, 2)
  for (const marker of ['generateByEditing', 'generateByGeminiPro']) {
    const start = providers.indexOf(`function ${marker}`)
    const end = providers.indexOf('\nexport async function ', start + 1)
    const segment = providers.slice(start, end < 0 ? undefined : end)
    assert.ok(segment.indexOf('correctVisualLockV01Framing(') < segment.indexOf('checkVisualQualityV01('))
  }
})

await check('16 detail retains intentional crop bytes without full-product correction', async () => {
  const input = await fixture({ rects: [{ left: 0, top: 0, width: 512, height: 330 }] })
  const result = await correctVisualLockV01Framing(input, 'detail')
  assert.strictEqual(result.buffer, input)
  assert.equal(result.evidence.outcome, 'not_required')
  assert.ok(result.evidence.reasonCodes.includes('detail_slot_exempt'))
})

await check('17 full-product clipping rules are not applied to detail', async () => {
  const input = await fixture({ rects: [{ left: 0, top: 120, width: 330, height: 250 }] })
  const result = await correctVisualLockV01Framing(input, 'detail')
  assert.equal(result.evidence.state, 'pass')
  assert.notEqual(result.evidence.outcome, 'unsafe_existing_clipping')
})

await check('18 detail crop exception cannot leak to another semantic slot', async () => {
  const input = await fixture({ rects: [{ left: 0, top: 120, width: 330, height: 250 }] })
  const detail = await correctVisualLockV01Framing(input, 'detail')
  const side = await correctVisualLockV01Framing(input, 'side')
  assert.equal(detail.evidence.outcome, 'not_required')
  assert.equal(side.evidence.outcome, 'unsafe_existing_clipping')
  assert.equal(side.evidence.state, 'fail')
})

await check('19 complete correction metadata contract is populated for JSON persistence', async () => {
  const result = await correctVisualLockV01Framing(await offCenter(), 'side')
  const evidence = result.evidence
  assert.equal(evidence.version, VISUAL_LOCK_V01_FRAMING_CORRECTION_VERSION)
  assert.ok(evidence.originalBoundingBox && evidence.finalBoundingBox)
  assert.ok(evidence.originalCanvas && evidence.finalCanvas)
  assert.equal(typeof evidence.appliedScale, 'number')
  assert.equal(typeof evidence.appliedTranslationXPercent, 'number')
  assert.equal(typeof evidence.appliedTranslationYPercent, 'number')
  assert.equal(typeof evidence.paddingUsed, 'boolean')
  assert.equal(evidence.finalGeometryState, evidence.finalGeometry.state)
  assert.doesNotThrow(() => JSON.stringify(evidence))

  const rectangular = await fixture({
    width: 640,
    height: 512,
    rects: [{ left: 105, top: 190, width: 430, height: 132 }],
  })
  const squared = await correctVisualLockV01Framing(rectangular, 'side')
  assert.equal(squared.evidence.outcome, 'applied')
  assert.deepEqual(squared.evidence.originalCanvas, { width: 640, height: 512 })
  assert.deepEqual(squared.evidence.finalCanvas, { width: 640, height: 640 })
  assert.equal(squared.evidence.paddingUsed, true)
})

await check('20 identical inputs produce identical output and metadata', async () => {
  const input = await offCenter()
  const first = await correctVisualLockV01Framing(input, 'side')
  const second = await correctVisualLockV01Framing(input, 'side')
  assert.ok(first.buffer.equals(second.buffer))
  assert.deepEqual(first.evidence, second.evidence)
})

await check('21 default and V0 retain the legacy post-processing path', () => {
  const task = readFileSync(new URL('../jobs/imageGenTask.ts', import.meta.url), 'utf8')
  assert.match(task, /IMAGE_CENTERING_ENABLED !== '0' && !isVisualLockV01Context\(visualLockContext\)/)
  assert.match(task, /normalizeProductCentering\(b0/)
  assert.match(task, /normalizeBackground\(b1\)/)
})

await check('22 prompt code and all three pinned digest assertions remain unchanged', () => {
  const providers = readFileSync(new URL('./imageProviders.ts', import.meta.url), 'utf8')
  const v0Test = readFileSync(new URL('./imageVisualLockV0.test.ts', import.meta.url), 'utf8')
  const v01Test = readFileSync(new URL('./imageVisualLockV01.test.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(providers, /FRAMING CORRECTION CONTRACT|visual-framing-correction\/v1[\s\S]*fullPrompt/)
  assert.match(v0Test, /4050a83f01eae0c200b013ce9fc744b41890f49180cb1af0e2173e2a38adb810/)
  assert.match(v0Test, /f6d25f7e4980c731c9e191bd6bfd7f9ee3ae104ac927f67bdb64ac77ae00238d/)
  assert.match(v01Test, /e8c1becfcb7d04528a22cdb40584088b0b455589170a3c6bb1376ef05eccdb47/)
})

await check('23 focused compatibility wiring keeps final buffers, geometry, and JSON evidence aligned', () => {
  const providers = readFileSync(new URL('./imageProviders.ts', import.meta.url), 'utf8')
  const task = readFileSync(new URL('../jobs/imageGenTask.ts', import.meta.url), 'utf8')
  const contracts = readFileSync(new URL('./imageGenerationContracts.ts', import.meta.url), 'utf8')
  assert.equal((providers.match(/finalBuf = correction\.buffer/g) ?? []).length, 2)
  assert.match(task, /measureVisualGeometryV01\(envelope\.output\)/)
  assert.match(task, /framingCorrectionState: slot\.provider\?\.framingCorrection\?\.state/)
  assert.match(contracts, /framingCorrection\?: VisualFramingCorrectionEvidenceV01/)
  assert.match(contracts, /sanitizeVisualFramingCorrectionEvidence/)
})

console.log(`\nimageFramingCorrectionV01: ${passed} checks passed${process.exitCode ? ' — WITH FAILURES' : ' — ALL OK'}`)
}

void main()
