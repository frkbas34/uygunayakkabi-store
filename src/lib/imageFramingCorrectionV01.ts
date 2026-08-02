import {
  evaluateVisualGeometryMeasurementV01,
  inspectVisualGeometryForegroundV01,
  type VisualGeometryGateResultV01,
  type VisualGeometryForegroundInspectionV01,
  type VisualGeometryMeasurementV01,
  type VisualQualityTriState,
} from './imageVisualLockV01'
import type { SlotKey } from './imageSlotContract'

export const VISUAL_LOCK_V01_FRAMING_CORRECTION_VERSION = 'visual-framing-correction/v1' as const

export const VISUAL_LOCK_V01_FRAMING_CORRECTION_LIMITS = {
  maximumUpscale: 1.15,
  minimumDownscaleFactor: 1 / 1.15,
  maximumAbsoluteTranslationPercent: 12,
  rotationDegrees: 0,
  aspectRatioChange: 0,
  mirrored: false,
  minimumRealMarginPercent: 2,
  protectedContentHaloPercent: 3.5,
} as const

export type VisualFramingCorrectionOutcomeV01 =
  | 'not_required'
  | 'applied'
  | 'unsafe_existing_clipping'
  | 'transform_outside_allowed_bounds'
  | 'unsafe_background_extension'
  | 'insufficient_geometry_evidence'
  | 'final_geometry_failed'

export type VisualFramingCorrectionReasonV01 =
  | 'detail_slot_exempt'
  | 'geometry_already_compliant'
  | 'framing_correction_applied'
  | 'geometry_measurement_unavailable'
  | 'foreground_bounds_unavailable'
  | 'additional_product_suspected'
  | 'existing_edge_clipping'
  | 'insufficient_real_margin'
  | 'required_scale_above_1_15'
  | 'required_scale_below_reciprocal_1_15'
  | 'translation_above_12_percent'
  | 'background_not_warm_neutral'
  | 'background_nonuniform'
  | 'protected_bounds_would_crop'
  | 'final_geometry_unavailable'
  | 'final_geometry_not_pass'
  | 'transform_failed'

export type NormalizedVisualBoundingBoxV01 = {
  x: number
  y: number
  width: number
  height: number
}

export type VisualCanvasDimensionsV01 = {
  width: number
  height: number
}

export type VisualFramingCorrectionEvidenceV01 = {
  version: typeof VISUAL_LOCK_V01_FRAMING_CORRECTION_VERSION
  slotId: SlotKey
  state: VisualQualityTriState
  outcome: VisualFramingCorrectionOutcomeV01
  reasonCodes: VisualFramingCorrectionReasonV01[]
  originalBoundingBox: NormalizedVisualBoundingBoxV01 | null
  finalBoundingBox: NormalizedVisualBoundingBoxV01 | null
  originalCanvas: VisualCanvasDimensionsV01 | null
  finalCanvas: VisualCanvasDimensionsV01 | null
  appliedScale: number
  plannedScale: number
  appliedTranslationXPercent: number
  appliedTranslationYPercent: number
  plannedTranslationXPercent: number
  plannedTranslationYPercent: number
  paddingUsed: boolean
  padding: { top: number; right: number; bottom: number; left: number }
  rotationDegrees: 0
  aspectRatioChange: 0
  mirrored: false
  originalGeometry: VisualGeometryGateResultV01
  finalGeometry: VisualGeometryGateResultV01
  finalGeometryState: VisualQualityTriState
}

export type VisualFramingCorrectionResultV01 = {
  buffer: Buffer
  evidence: VisualFramingCorrectionEvidenceV01
}

type FullProductGeometryTargetV01 = {
  minimumOccupancyPercent: number
  maximumOccupancyPercent: number
  correctionMinimumOccupancyPercent: number
  correctionMaximumOccupancyPercent: number
  maximumCenterOffsetPercent: number
}

/**
 * The current V0.1 numeric gate is the same for all four complete-product slots,
 * but the correction reads a semantic-slot keyed contract so future angle-specific
 * envelopes cannot silently collapse into an index-based universal transform.
 * The 0.5-point interior target is only a measurement-quantization allowance;
 * it avoids extra rescaling beyond what is needed to enter the 72–82 envelope.
 */
export const VISUAL_LOCK_V01_FRAMING_TARGETS: Readonly<Partial<Record<SlotKey, FullProductGeometryTargetV01>>> = {
  side: {
    minimumOccupancyPercent: 72,
    maximumOccupancyPercent: 82,
    correctionMinimumOccupancyPercent: 72.5,
    correctionMaximumOccupancyPercent: 81.5,
    maximumCenterOffsetPercent: 3,
  },
  hero_3q: {
    minimumOccupancyPercent: 72,
    maximumOccupancyPercent: 82,
    correctionMinimumOccupancyPercent: 72.5,
    correctionMaximumOccupancyPercent: 81.5,
    maximumCenterOffsetPercent: 3,
  },
  top: {
    minimumOccupancyPercent: 72,
    maximumOccupancyPercent: 82,
    correctionMinimumOccupancyPercent: 72.5,
    correctionMaximumOccupancyPercent: 81.5,
    maximumCenterOffsetPercent: 3,
  },
  back: {
    minimumOccupancyPercent: 72,
    maximumOccupancyPercent: 82,
    correctionMinimumOccupancyPercent: 72.5,
    correctionMaximumOccupancyPercent: 81.5,
    maximumCenterOffsetPercent: 3,
  },
}

type RGB = { r: number; g: number; b: number }

type ArtifactInspectionV01 = {
  canvas: VisualCanvasDimensionsV01
  measurement: VisualGeometryMeasurementV01 | null
  geometry: VisualGeometryGateResultV01
  boundingBox: NormalizedVisualBoundingBoxV01 | null
  foreground: VisualGeometryForegroundInspectionV01 | null
  background: { safe: boolean; color: RGB | null; reason: VisualFramingCorrectionReasonV01 | null }
}

const STUDIO_TARGET: RGB = { r: 247, g: 245, b: 240 }
const EMPTY_PADDING = { top: 0, right: 0, bottom: 0, left: 0 } as const

function round(value: number, digits = 6): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function distance(a: RGB, b: RGB): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b)
}

function boxCenter(box: NormalizedVisualBoundingBoxV01): { x: number; y: number } {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

function boxMargins(box: NormalizedVisualBoundingBoxV01): { top: number; right: number; bottom: number; left: number } {
  return {
    top: box.y,
    right: 1 - box.x - box.width,
    bottom: 1 - box.y - box.height,
    left: box.x,
  }
}

function protectedBox(box: NormalizedVisualBoundingBoxV01): NormalizedVisualBoundingBoxV01 {
  const halo = VISUAL_LOCK_V01_FRAMING_CORRECTION_LIMITS.protectedContentHaloPercent / 100
  const x = box.x - halo
  const y = box.y - halo
  const right = box.x + box.width + halo
  const bottom = box.y + box.height + halo
  return { x, y, width: right - x, height: bottom - y }
}

function transformedBox(
  box: NormalizedVisualBoundingBoxV01,
  scale: number,
  translationX: number,
  translationY: number,
): NormalizedVisualBoundingBoxV01 {
  return {
    x: 0.5 + scale * (box.x - 0.5) + translationX,
    y: 0.5 + scale * (box.y - 0.5) + translationY,
    width: box.width * scale,
    height: box.height * scale,
  }
}

function boxInsideCanvas(box: NormalizedVisualBoundingBoxV01): boolean {
  const epsilon = 1e-6
  return box.x >= -epsilon
    && box.y >= -epsilon
    && box.x + box.width <= 1 + epsilon
    && box.y + box.height <= 1 + epsilon
}

async function patchStats(
  sharp: typeof import('sharp'),
  input: Buffer,
  rectangle: { left: number; top: number; width: number; height: number },
): Promise<{ mean: RGB; maximumStdDev: number }> {
  const { data, info } = await sharp(input)
    .extract(rectangle)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const count = info.width * info.height
  const sums = [0, 0, 0]
  const squares = [0, 0, 0]
  for (let index = 0; index < data.length; index += info.channels) {
    for (let channel = 0; channel < 3; channel++) {
      const value = data[index + channel]
      sums[channel] += value
      squares[channel] += value * value
    }
  }
  const means = sums.map((sum) => sum / count)
  const deviations = squares.map((sum, channel) => Math.sqrt(Math.max(0, sum / count - means[channel] ** 2)))
  return {
    mean: { r: means[0], g: means[1], b: means[2] },
    maximumStdDev: Math.max(...deviations),
  }
}

async function inspectStudioBorder(
  input: Buffer,
  canvas: VisualCanvasDimensionsV01,
): Promise<{ safe: boolean; color: RGB | null; reason: VisualFramingCorrectionReasonV01 | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as typeof import('sharp')
    // Keep border probes inside the 2% real-margin eligibility boundary so a
    // large-but-complete product does not contaminate the background sample.
    // Eight independent probes still make gradients/seams fail closed.
    const size = Math.max(6, Math.min(24, Math.round(Math.min(canvas.width, canvas.height) * 0.015)))
    const halfW = Math.max(0, Math.round((canvas.width - size) / 2))
    const halfH = Math.max(0, Math.round((canvas.height - size) / 2))
    const patches = [
      { left: 0, top: 0, width: size, height: size },
      { left: canvas.width - size, top: 0, width: size, height: size },
      { left: 0, top: canvas.height - size, width: size, height: size },
      { left: canvas.width - size, top: canvas.height - size, width: size, height: size },
      { left: halfW, top: 0, width: size, height: size },
      { left: halfW, top: canvas.height - size, width: size, height: size },
      { left: 0, top: halfH, width: size, height: size },
      { left: canvas.width - size, top: halfH, width: size, height: size },
    ]
    const samples = await Promise.all(patches.map((rectangle) => patchStats(sharp, input, rectangle)))
    if (samples.some((sample) => sample.maximumStdDev > 8)) {
      return { safe: false, color: null, reason: 'background_nonuniform' }
    }
    let maximumSeparation = 0
    for (let left = 0; left < samples.length; left++) {
      for (let right = left + 1; right < samples.length; right++) {
        maximumSeparation = Math.max(maximumSeparation, distance(samples[left].mean, samples[right].mean))
      }
    }
    if (maximumSeparation > 18) return { safe: false, color: null, reason: 'background_nonuniform' }
    const sorted = (channel: keyof RGB) => samples.map((sample) => sample.mean[channel]).sort((a, b) => a - b)
    const median = (values: number[]) => {
      const middle = Math.floor(values.length / 2)
      return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2
    }
    const color = { r: median(sorted('r')), g: median(sorted('g')), b: median(sorted('b')) }
    const minimumChannel = Math.min(color.r, color.g, color.b)
    const channelSpread = Math.max(color.r, color.g, color.b) - minimumChannel
    if (minimumChannel < 210 || channelSpread > 25 || distance(color, STUDIO_TARGET) > 45) {
      return { safe: false, color: null, reason: 'background_not_warm_neutral' }
    }
    return {
      safe: true,
      color: { r: Math.round(color.r), g: Math.round(color.g), b: Math.round(color.b) },
      reason: null,
    }
  } catch {
    return { safe: false, color: null, reason: 'background_nonuniform' }
  }
}

async function inspectArtifact(input: Buffer, slotId: SlotKey): Promise<ArtifactInspectionV01 | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as typeof import('sharp')
    const metadata = await sharp(input).metadata()
    const canvas = { width: metadata.width ?? 0, height: metadata.height ?? 0 }
    if (!canvas.width || !canvas.height) return null
    const foreground = await inspectVisualGeometryForegroundV01(input)
    const measurement = foreground?.measurement ?? null
    const geometry = evaluateVisualGeometryMeasurementV01(slotId, measurement)
    const background = await inspectStudioBorder(input, canvas)
    return {
      canvas,
      measurement,
      geometry,
      boundingBox: foreground?.boundingBox ?? null,
      foreground,
      background,
    }
  } catch {
    return null
  }
}

function evidenceForUnchanged(
  input: Buffer,
  slotId: SlotKey,
  inspection: ArtifactInspectionV01 | null,
  outcome: VisualFramingCorrectionOutcomeV01,
  state: VisualQualityTriState,
  reasonCodes: VisualFramingCorrectionReasonV01[],
  plan?: { scale: number; translationXPercent: number; translationYPercent: number },
): VisualFramingCorrectionResultV01 {
  const unavailable = evaluateVisualGeometryMeasurementV01(slotId, null)
  const geometry = inspection?.geometry ?? unavailable
  return {
    buffer: input,
    evidence: {
      version: VISUAL_LOCK_V01_FRAMING_CORRECTION_VERSION,
      slotId,
      state,
      outcome,
      reasonCodes,
      originalBoundingBox: inspection?.boundingBox ?? null,
      finalBoundingBox: inspection?.boundingBox ?? null,
      originalCanvas: inspection?.canvas ?? null,
      finalCanvas: inspection?.canvas ?? null,
      appliedScale: 1,
      plannedScale: round(plan?.scale ?? 1),
      appliedTranslationXPercent: 0,
      appliedTranslationYPercent: 0,
      plannedTranslationXPercent: round(plan?.translationXPercent ?? 0),
      plannedTranslationYPercent: round(plan?.translationYPercent ?? 0),
      paddingUsed: false,
      padding: { ...EMPTY_PADDING },
      rotationDegrees: 0,
      aspectRatioChange: 0,
      mirrored: false,
      originalGeometry: geometry,
      finalGeometry: geometry,
      finalGeometryState: geometry.state,
    },
  }
}

async function squareCanvas(
  input: Buffer,
  canvas: VisualCanvasDimensionsV01,
  background: RGB,
): Promise<{ buffer: Buffer; side: number; padding: { top: number; right: number; bottom: number; left: number } }> {
  if (canvas.width === canvas.height) {
    return { buffer: input, side: canvas.width, padding: { ...EMPTY_PADDING } }
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require('sharp') as typeof import('sharp')
  const side = Math.max(canvas.width, canvas.height)
  const left = Math.floor((side - canvas.width) / 2)
  const top = Math.floor((side - canvas.height) / 2)
  const right = side - canvas.width - left
  const bottom = side - canvas.height - top
  const buffer = await sharp({
    create: { width: side, height: side, channels: 3, background },
  }).composite([{ input, left, top }]).png().toBuffer()
  return { buffer, side, padding: { top, right, bottom, left } }
}

async function applyUniformTransform(
  input: Buffer,
  side: number,
  scale: number,
  translationX: number,
  translationY: number,
  background: RGB,
): Promise<{ buffer: Buffer; paddingUsed: boolean; padding: { top: number; right: number; bottom: number; left: number } }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require('sharp') as typeof import('sharp')
  const scaledSide = Math.max(1, Math.round(side * scale))
  const scaled = await sharp(input)
    .resize(scaledSide, scaledSide, { fit: 'fill', kernel: 'lanczos3' })
    .toBuffer()
  const left = Math.round((side - scaledSide) / 2 + translationX * side)
  const top = Math.round((side - scaledSide) / 2 + translationY * side)
  const sourceLeft = Math.max(0, -left)
  const sourceTop = Math.max(0, -top)
  const destinationLeft = Math.max(0, left)
  const destinationTop = Math.max(0, top)
  const width = Math.min(scaledSide - sourceLeft, side - destinationLeft)
  const height = Math.min(scaledSide - sourceTop, side - destinationTop)
  if (width <= 0 || height <= 0) throw new Error('Uniform transform lies outside the final canvas')
  const visible = sourceLeft || sourceTop || width !== scaledSide || height !== scaledSide
    ? await sharp(scaled).extract({ left: sourceLeft, top: sourceTop, width, height }).toBuffer()
    : scaled
  const right = side - destinationLeft - width
  const bottom = side - destinationTop - height
  const padding = {
    top: destinationTop,
    right,
    bottom,
    left: destinationLeft,
  }
  const paddingUsed = Object.values(padding).some((value) => value > 0)
  const buffer = await sharp({
    create: { width: side, height: side, channels: 3, background },
  })
    .composite([{ input: visible, left: destinationLeft, top: destinationTop }])
    .jpeg({ quality: 92 })
    .toBuffer()
  return { buffer, paddingUsed, padding }
}

/**
 * Pure V0.1 framing correction. The function has no provider, network, storage,
 * retry, or mutation side effects. An unsafe or unverifiable candidate always
 * returns the exact original Buffer object; a transformed buffer is returned only
 * after deterministic final-artifact geometry passes the existing V0.1 gate.
 */
export async function correctVisualLockV01Framing(
  input: Buffer,
  slotId: SlotKey,
): Promise<VisualFramingCorrectionResultV01> {
  if (slotId === 'detail') {
    const detailInspection = await inspectArtifact(input, slotId)
    return evidenceForUnchanged(input, slotId, detailInspection, 'not_required', 'pass', ['detail_slot_exempt'])
  }
  const target = VISUAL_LOCK_V01_FRAMING_TARGETS[slotId]
  if (!target) {
    return evidenceForUnchanged(input, slotId, null, 'insufficient_geometry_evidence', 'unknown', ['geometry_measurement_unavailable'])
  }
  const original = await inspectArtifact(input, slotId)
  if (!original?.measurement) {
    return evidenceForUnchanged(input, slotId, original, 'insufficient_geometry_evidence', 'unknown', ['geometry_measurement_unavailable'])
  }
  if (original.foreground?.additionalProductSuspected) {
    return evidenceForUnchanged(input, slotId, original, 'insufficient_geometry_evidence', 'unknown', ['additional_product_suspected'])
  }
  if (original.geometry.state === 'pass') {
    return evidenceForUnchanged(input, slotId, original, 'not_required', 'pass', ['geometry_already_compliant'])
  }
  if (original.measurement.clippingDetected) {
    return evidenceForUnchanged(input, slotId, original, 'unsafe_existing_clipping', 'fail', ['existing_edge_clipping'])
  }
  if (!original.background.safe || !original.background.color) {
    return evidenceForUnchanged(
      input,
      slotId,
      original,
      'unsafe_background_extension',
      'unknown',
      [original.background.reason ?? 'background_nonuniform'],
    )
  }
  if (!original.boundingBox) {
    return evidenceForUnchanged(input, slotId, original, 'insufficient_geometry_evidence', 'unknown', ['foreground_bounds_unavailable'])
  }
  const minimumMargin = VISUAL_LOCK_V01_FRAMING_CORRECTION_LIMITS.minimumRealMarginPercent / 100
  if (Object.values(boxMargins(original.boundingBox)).some((margin) => margin < minimumMargin)) {
    return evidenceForUnchanged(input, slotId, original, 'unsafe_existing_clipping', 'fail', ['insufficient_real_margin'])
  }

  try {
    const squared = await squareCanvas(input, original.canvas, original.background.color)
    const base = squared.buffer === input ? original : await inspectArtifact(squared.buffer, slotId)
    if (!base?.measurement || !base.boundingBox) {
      return evidenceForUnchanged(input, slotId, original, 'insufficient_geometry_evidence', 'unknown', ['geometry_measurement_unavailable'])
    }
    if (base.foreground?.additionalProductSuspected) {
      return evidenceForUnchanged(input, slotId, original, 'insufficient_geometry_evidence', 'unknown', ['additional_product_suspected'])
    }
    const occupancy = base.measurement.occupancyPercent
    const desiredOccupancy = occupancy < target.minimumOccupancyPercent
      ? target.correctionMinimumOccupancyPercent
      : occupancy > target.maximumOccupancyPercent
        ? target.correctionMaximumOccupancyPercent
        : occupancy
    const scale = desiredOccupancy / occupancy
    const center = boxCenter(base.boundingBox)
    const translationX = -scale * (center.x - 0.5)
    const translationY = -scale * (center.y - 0.5)
    const plan = {
      scale,
      translationXPercent: translationX * 100,
      translationYPercent: translationY * 100,
    }
    if (scale > VISUAL_LOCK_V01_FRAMING_CORRECTION_LIMITS.maximumUpscale + 1e-9) {
      return evidenceForUnchanged(input, slotId, original, 'transform_outside_allowed_bounds', 'fail', ['required_scale_above_1_15'], plan)
    }
    if (scale < VISUAL_LOCK_V01_FRAMING_CORRECTION_LIMITS.minimumDownscaleFactor - 1e-9) {
      return evidenceForUnchanged(input, slotId, original, 'transform_outside_allowed_bounds', 'fail', ['required_scale_below_reciprocal_1_15'], plan)
    }
    const maximumTranslation = VISUAL_LOCK_V01_FRAMING_CORRECTION_LIMITS.maximumAbsoluteTranslationPercent
    if (Math.abs(plan.translationXPercent) > maximumTranslation || Math.abs(plan.translationYPercent) > maximumTranslation) {
      return evidenceForUnchanged(input, slotId, original, 'transform_outside_allowed_bounds', 'fail', ['translation_above_12_percent'], plan)
    }
    if (!boxInsideCanvas(transformedBox(protectedBox(base.boundingBox), scale, translationX, translationY))) {
      return evidenceForUnchanged(input, slotId, original, 'unsafe_existing_clipping', 'fail', ['protected_bounds_would_crop'], plan)
    }
    const transformed = await applyUniformTransform(
      squared.buffer,
      squared.side,
      scale,
      translationX,
      translationY,
      original.background.color,
    )
    const final = await inspectArtifact(transformed.buffer, slotId)
    if (!final?.measurement || !final.boundingBox) {
      return evidenceForUnchanged(input, slotId, original, 'insufficient_geometry_evidence', 'unknown', ['final_geometry_unavailable'], plan)
    }
    if (!final.background.safe) {
      return evidenceForUnchanged(
        input,
        slotId,
        original,
        'unsafe_background_extension',
        'unknown',
        [final.background.reason ?? 'background_nonuniform'],
        plan,
      )
    }
    if (final.foreground?.additionalProductSuspected) {
      return evidenceForUnchanged(input, slotId, original, 'insufficient_geometry_evidence', 'unknown', ['additional_product_suspected'], plan)
    }
    if (final.geometry.state !== 'pass') {
      return evidenceForUnchanged(input, slotId, original, 'final_geometry_failed', final.geometry.state, ['final_geometry_not_pass'], plan)
    }
    return {
      buffer: transformed.buffer,
      evidence: {
        version: VISUAL_LOCK_V01_FRAMING_CORRECTION_VERSION,
        slotId,
        state: 'pass',
        outcome: 'applied',
        reasonCodes: ['framing_correction_applied'],
        originalBoundingBox: original.boundingBox,
        finalBoundingBox: final.boundingBox,
        originalCanvas: original.canvas,
        finalCanvas: final.canvas,
        appliedScale: round(scale),
        plannedScale: round(scale),
        appliedTranslationXPercent: round(plan.translationXPercent),
        appliedTranslationYPercent: round(plan.translationYPercent),
        plannedTranslationXPercent: round(plan.translationXPercent),
        plannedTranslationYPercent: round(plan.translationYPercent),
        paddingUsed: transformed.paddingUsed || Object.values(squared.padding).some((value) => value > 0),
        padding: transformed.padding,
        rotationDegrees: 0,
        aspectRatioChange: 0,
        mirrored: false,
        originalGeometry: original.geometry,
        finalGeometry: final.geometry,
        finalGeometryState: final.geometry.state,
      },
    }
  } catch {
    return evidenceForUnchanged(input, slotId, original, 'insufficient_geometry_evidence', 'unknown', ['transform_failed'])
  }
}
