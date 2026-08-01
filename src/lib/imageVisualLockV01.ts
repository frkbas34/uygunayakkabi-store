import { createHash } from 'node:crypto'

import { GENERATED_SLOT_KEYS, type SlotKey } from './imageSlotContract'
import {
  buildProductIdentityAnchorV0,
  buildVisualLockV0PromptBlock,
  parseVisualLockV0Command,
  resolveVisualLockV0TaskSelection,
  visualLockV0RejectionMessage,
  type ProductIdentityAnchorV0,
  type VisualLockIdentityEvidence,
  type VisualLockV0CommandRejection,
  type VisualLockV0Context,
  type VisualLockV0Family,
} from './imageVisualLockV0'

export const VISUAL_LOCK_V01_COMMAND_PROFILE = 'visual-lock-v0.1' as const
export const VISUAL_LOCK_V01_PROFILE_VERSION = 'visual-lock/v0.1' as const
export const COMPONENT_TOPOLOGY_LOCK_V01_VERSION = 'component-topology-lock/v0.1' as const
export const VISUAL_QUALITY_EVALUATOR_V01_VERSION = 'visual-quality-evaluator/v0.1' as const
export const VISUAL_GEOMETRY_GATE_V01_VERSION = 'visual-geometry-gate/v0.1' as const

export type VisualQualityTriState = 'pass' | 'fail' | 'unknown'

type KnownOrUnknown = string

export type ComponentTopologyLockV01 = {
  version: typeof COMPONENT_TOPOLOGY_LOCK_V01_VERSION
  sourceSupported: {
    distinctiveFeatures: KnownOrUnknown
    seamPaths: KnownOrUnknown
    hardwarePresence: KnownOrUnknown
    ornamentPresence: KnownOrUnknown
    lacesAndEyelets: KnownOrUnknown
    closureType: KnownOrUnknown
    heelBackStructure: KnownOrUnknown
    soleProfileAndThickness: KnownOrUnknown
    visualNotes: KnownOrUnknown
  }
  preservationRule: 'preserve every source-supported component, seam, boundary, absence, size, and placement'
  uncertaintyRule: 'unknown topology remains unknown; never infer, remove, or invent a component'
}

export type VisualLockV01Context = {
  profileVersion: typeof VISUAL_LOCK_V01_PROFILE_VERSION
  identityAnchorVersion: ProductIdentityAnchorV0['version']
  framingVersion: VisualLockV0Context['framingVersion']
  familyLockVersion: VisualLockV0Context['familyLockVersion']
  componentTopologyVersion: typeof COMPONENT_TOPOLOGY_LOCK_V01_VERSION
  evaluatorVersion: typeof VISUAL_QUALITY_EVALUATOR_V01_VERSION
  geometryGateVersion: typeof VISUAL_GEOMETRY_GATE_V01_VERSION
  family: VisualLockV0Family
  identityAnchor: ProductIdentityAnchorV0
  serializedIdentityAnchor: string
  identityAnchorHash: string
  componentTopology: ComponentTopologyLockV01
  serializedComponentTopology: string
  componentTopologyHash: string
}

export type VisualLockContext = VisualLockV0Context | VisualLockV01Context

export function isVisualLockV01Context(value: VisualLockContext | null | undefined): value is VisualLockV01Context {
  return value?.profileVersion === VISUAL_LOCK_V01_PROFILE_VERSION
}

function knownOrUnknown(value: unknown): string {
  if (typeof value !== 'string') return 'unknown'
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized ? normalized.slice(0, 600) : 'unknown'
}

export function buildVisualLockV01Context(input: {
  family: VisualLockV0Family
  identityEvidence: VisualLockIdentityEvidence
  operatorVisualFacts?: string | null
}): VisualLockV01Context {
  const v0 = buildProductIdentityAnchorV0(input)
  const componentTopology: ComponentTopologyLockV01 = {
    version: COMPONENT_TOPOLOGY_LOCK_V01_VERSION,
    sourceSupported: {
      distinctiveFeatures: knownOrUnknown(input.identityEvidence.distinctiveFeatures),
      seamPaths: v0.identityAnchor.facts.seamPaths,
      hardwarePresence: v0.identityAnchor.facts.hardwarePresence,
      ornamentPresence: v0.identityAnchor.facts.ornamentPresence,
      lacesAndEyelets: v0.identityAnchor.facts.lacesAndEyelets,
      closureType: v0.identityAnchor.sourceEvidence.closureType,
      heelBackStructure: v0.identityAnchor.facts.heelBackStructure,
      soleProfileAndThickness: v0.identityAnchor.facts.soleProfileAndThickness,
      visualNotes: v0.identityAnchor.sourceEvidence.visualNotes,
    },
    preservationRule: 'preserve every source-supported component, seam, boundary, absence, size, and placement',
    uncertaintyRule: 'unknown topology remains unknown; never infer, remove, or invent a component',
  }
  const serializedComponentTopology = JSON.stringify(componentTopology)
  return {
    profileVersion: VISUAL_LOCK_V01_PROFILE_VERSION,
    identityAnchorVersion: v0.identityAnchorVersion,
    framingVersion: v0.framingVersion,
    familyLockVersion: v0.familyLockVersion,
    componentTopologyVersion: COMPONENT_TOPOLOGY_LOCK_V01_VERSION,
    evaluatorVersion: VISUAL_QUALITY_EVALUATOR_V01_VERSION,
    geometryGateVersion: VISUAL_GEOMETRY_GATE_V01_VERSION,
    family: v0.family,
    identityAnchor: v0.identityAnchor,
    serializedIdentityAnchor: v0.serializedIdentityAnchor,
    identityAnchorHash: v0.identityAnchorHash,
    componentTopology,
    serializedComponentTopology,
    componentTopologyHash: createHash('sha256').update(serializedComponentTopology).digest('hex'),
  }
}

const V01_ORIENTATION_LOCKS: Record<SlotKey, string> = {
  side: 'SIDE must remain a complete controlled lateral view with the full toe-to-heel profile visible.',
  hero_3q: 'HERO_3Q must remain a controlled front-and-side three-quarter catalog pair.',
  top: 'TOP must remain a true overhead catalog pair with source-supported upper and opening topology visible.',
  back: 'BACK must be a true straight rear, heel-centered view. Both heel edges must be comparably visible and the outsole centerline must face the camera. Any visible side-dominant face, diagonal toe axis, asymmetric heel exposure, or rear-three-quarter view is forbidden.',
  detail: 'DETAIL must show only a source-supported material, seam, or sole-edge detail without changing component topology.',
}

export function buildVisualLockV01PromptBlock(context: VisualLockV01Context, slotId: SlotKey): string {
  return (
    `\n\n=== VISUAL LOCK V0.1 (${context.profileVersion}) ===\n` +
    `IDENTITY ANCHOR VERSION: ${context.identityAnchorVersion}\n` +
    `IDENTITY ANCHOR SHA-256: ${context.identityAnchorHash}\n` +
    `IDENTITY ANCHOR (canonical JSON; identical in every slot): ${context.serializedIdentityAnchor}\n` +
    `COMPONENT TOPOLOGY VERSION: ${context.componentTopologyVersion}\n` +
    `COMPONENT TOPOLOGY SHA-256: ${context.componentTopologyHash}\n` +
    `COMPONENT TOPOLOGY (canonical JSON; identical in every slot): ${context.serializedComponentTopology}\n` +
    `CROSS-SLOT RULE: Render the exact same physical shoe and the exact same source-supported component graph in all five slots. No component, seam, boundary, absence, wordmark, motif, patch, overlay, pull tab, opening, apron, or sole feature may be added, removed, resized, relocated, merged, or simplified.\n` +
    `GEOMETRY CONTRACT (${context.geometryGateVersion}): complete-product slots must measure 72-82% occupancy, at most 3% center offset, and at most 8 percentage points occupancy spread across the pack. These values are verified after generation; prompt compliance alone is not PASS.\n` +
    `ORIENTATION CONTRACT: ${V01_ORIENTATION_LOCKS[slotId]}\n` +
    `EVALUATOR CONTRACT (${context.evaluatorVersion}): PASS requires explicit valid evidence. Missing, malformed, unavailable, incomplete, unsupported, ambiguous, or unexecuted evaluation is UNKNOWN, never PASS. UNKNOWN and FAIL are blocked without automatic regeneration.\n` +
    `UNKNOWN-EVIDENCE RULE: Unknown facts and hidden structure remain unknown. Do not infer or invent them.\n` +
    `=== END VISUAL LOCK V0.1 ===\n`
  )
}

export function buildVisualLockV01PromptFixture(context: VisualLockV01Context): string[] {
  return GENERATED_SLOT_KEYS.map((slotId) => buildVisualLockV01PromptBlock(context, slotId))
}

export function buildOptionalVisualLockPromptBlock(
  context: VisualLockContext | null | undefined,
  slotId: SlotKey,
): string {
  if (!context) return ''
  if (isVisualLockV01Context(context)) return buildVisualLockV01PromptBlock(context, slotId)
  return buildVisualLockV0PromptBlock(context, slotId)
}

export type VisualLockTaskSelection = {
  profile: 'visual-lock-v0' | typeof VISUAL_LOCK_V01_COMMAND_PROFILE
  profileVersion: 'visual-lock/v0' | typeof VISUAL_LOCK_V01_PROFILE_VERSION
  family: VisualLockV0Family
}

export function resolveVisualLockTaskSelection(input: {
  qualityProfile?: string | null
  productFamily?: string | null
}): VisualLockTaskSelection | null {
  const profile = typeof input.qualityProfile === 'string' ? input.qualityProfile.trim().toLowerCase() : ''
  if (profile !== VISUAL_LOCK_V01_COMMAND_PROFILE) {
    const v0 = resolveVisualLockV0TaskSelection(input)
    return v0 ? { ...v0, profileVersion: 'visual-lock/v0' } : null
  }
  const family = typeof input.productFamily === 'string' ? input.productFamily.trim().toLowerCase() : ''
  if (family !== 'loafer' && family !== 'generic') throw new Error('Unknown Visual Lock V0.1 product family')
  return { profile: VISUAL_LOCK_V01_COMMAND_PROFILE, profileVersion: VISUAL_LOCK_V01_PROFILE_VERSION, family }
}

export function buildVisualLockContext(input: {
  selection: VisualLockTaskSelection
  identityEvidence: VisualLockIdentityEvidence
  operatorVisualFacts?: string | null
}): VisualLockContext {
  const base = {
    family: input.selection.family,
    identityEvidence: input.identityEvidence,
    operatorVisualFacts: input.operatorVisualFacts,
  }
  return input.selection.profile === VISUAL_LOCK_V01_COMMAND_PROFILE
    ? buildVisualLockV01Context(base)
    : buildProductIdentityAnchorV0(base)
}

export type VisualLockCommandDecision =
  | { kind: 'default' }
  | { kind: 'rejected'; reason: VisualLockV0CommandRejection }
  | {
      kind: 'accepted'
      productId: number
      qualityProfile: 'visual-lock-v0' | typeof VISUAL_LOCK_V01_COMMAND_PROFILE
      profileVersion: 'visual-lock/v0' | typeof VISUAL_LOCK_V01_PROFILE_VERSION
      family: VisualLockV0Family
    }

export function parseVisualLockCommand(input: {
  text: string
  chatType: string
  botRole: 'uygunops' | 'geo'
  dmAccessReason: 'allowlisted' | 'open-allowlist' | 'denied'
}): VisualLockCommandDecision {
  const text = input.text.trim()
  const profile = text.match(/--profile=([^\s]+)/i)?.[1]?.toLowerCase()
  if (profile !== VISUAL_LOCK_V01_COMMAND_PROFILE) return parseVisualLockV0Command(input)
  if (/^@[^\s]+\s+#gorsel\b/i.test(text)) return { kind: 'rejected', reason: 'mention-prefix-forbidden' }
  if (input.chatType !== 'private') return { kind: 'rejected', reason: 'private-chat-required' }
  if (input.botRole !== 'uygunops') return { kind: 'rejected', reason: 'uygunops-required' }
  if (input.dmAccessReason !== 'allowlisted') return { kind: 'rejected', reason: 'allowlisted-operator-required' }
  const family = text.match(/--family=([^\s]+)/i)?.[1]?.toLowerCase()
  if (family !== 'loafer' && family !== 'generic') return { kind: 'rejected', reason: 'unknown-family' }
  const exact = text.match(/^#gorsel\s+(\d+)\s+--profile=visual-lock-v0\.1\s+--family=(loafer|generic)\s*$/i)
  if (!exact) return { kind: 'rejected', reason: 'malformed-command' }
  return {
    kind: 'accepted',
    productId: Number(exact[1]),
    qualityProfile: VISUAL_LOCK_V01_COMMAND_PROFILE,
    profileVersion: VISUAL_LOCK_V01_PROFILE_VERSION,
    family: exact[2].toLowerCase() as VisualLockV0Family,
  }
}

export function visualLockRejectionMessage(reason: VisualLockV0CommandRejection): string {
  return visualLockV0RejectionMessage(reason)
}

export type VisualQualityDimensionV01 = {
  state: VisualQualityTriState
  evidence: string
}

export type VisualQualityEvaluatorResultV01 = {
  version: typeof VISUAL_QUALITY_EVALUATOR_V01_VERSION
  state: VisualQualityTriState
  color: VisualQualityDimensionV01 & { detectedColor: string }
  topology: VisualQualityDimensionV01
  orientation: VisualQualityDimensionV01 & { detectedView: string }
  reasonCodes: string[]
}

export function unknownVisualQualityEvaluatorResultV01(reasonCode: string): VisualQualityEvaluatorResultV01 {
  return {
    version: VISUAL_QUALITY_EVALUATOR_V01_VERSION,
    state: 'unknown',
    color: { state: 'unknown', evidence: '', detectedColor: 'unknown' },
    topology: { state: 'unknown', evidence: '' },
    orientation: { state: 'unknown', evidence: '', detectedView: 'unknown' },
    reasonCodes: [reasonCode],
  }
}

function parseDimension(value: unknown, code: string): { value: VisualQualityDimensionV01; reason?: string } {
  if (!value || typeof value !== 'object') return { value: { state: 'unknown', evidence: '' }, reason: `${code}_missing` }
  const candidate = value as { state?: unknown; evidence?: unknown }
  if (candidate.state !== 'pass' && candidate.state !== 'fail' && candidate.state !== 'unknown') {
    return { value: { state: 'unknown', evidence: '' }, reason: `${code}_unsupported_state` }
  }
  const evidence = typeof candidate.evidence === 'string' ? candidate.evidence.replace(/\s+/g, ' ').trim().slice(0, 240) : ''
  if ((candidate.state === 'pass' || candidate.state === 'fail') && !evidence) {
    return { value: { state: 'unknown', evidence: '' }, reason: `${code}_missing_evidence` }
  }
  return { value: { state: candidate.state, evidence } }
}

const EXPECTED_VIEW: Record<SlotKey, string> = {
  side: 'side',
  hero_3q: 'hero_three_quarter',
  top: 'top',
  back: 'true_rear',
  detail: 'detail',
}

const ALLOWED_DETECTED_VIEWS = new Set([
  'side',
  'hero_three_quarter',
  'top',
  'true_rear',
  'rear_three_quarter',
  'detail',
  'unknown',
])

export function parseVisualQualityEvaluatorV01(raw: string, slotId: SlotKey): VisualQualityEvaluatorResultV01 {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.trim())
  } catch {
    return unknownVisualQualityEvaluatorResultV01('malformed_response')
  }
  if (!parsed || typeof parsed !== 'object') return unknownVisualQualityEvaluatorResultV01('malformed_response')
  const candidate = parsed as { color?: unknown; topology?: unknown; orientation?: unknown }
  const colorParsed = parseDimension(candidate.color, 'color')
  const topologyParsed = parseDimension(candidate.topology, 'topology')
  const orientationParsed = parseDimension(candidate.orientation, 'orientation')
  const colorObject = candidate.color as { detectedColor?: unknown } | undefined
  const orientationObject = candidate.orientation as { detectedView?: unknown } | undefined
  const detectedColor = typeof colorObject?.detectedColor === 'string'
    ? colorObject.detectedColor.replace(/\s+/g, ' ').trim().slice(0, 80) || 'unknown'
    : 'unknown'
  const detectedView = typeof orientationObject?.detectedView === 'string'
    ? orientationObject.detectedView.trim().toLowerCase().slice(0, 80) || 'unknown'
    : 'unknown'
  const reasonCodes = [colorParsed.reason, topologyParsed.reason, orientationParsed.reason].filter((x): x is string => Boolean(x))
  let color = colorParsed.value
  if (color.state !== 'unknown' && detectedColor === 'unknown') {
    color = { state: 'unknown', evidence: '' }
    reasonCodes.push('color_missing_detected_color')
  }
  let orientation = orientationParsed.value
  if (!ALLOWED_DETECTED_VIEWS.has(detectedView)) {
    orientation = { state: 'unknown', evidence: '' }
    reasonCodes.push('orientation_unsupported_detected_view')
  } else if (orientation.state === 'pass' && detectedView !== EXPECTED_VIEW[slotId]) {
    orientation = { state: 'fail', evidence: orientation.evidence }
    reasonCodes.push(slotId === 'back' ? 'back_not_true_rear' : 'orientation_view_mismatch')
  }
  if (orientation.state !== 'unknown' && detectedView === 'unknown') {
    orientation = { state: 'unknown', evidence: '' }
    reasonCodes.push('orientation_missing_detected_view')
  }
  if (color.state === 'fail') reasonCodes.push('color_failed')
  if (topologyParsed.value.state === 'fail') reasonCodes.push('component_topology_failed')
  if (orientation.state === 'fail') reasonCodes.push('orientation_failed')
  const states = [color.state, topologyParsed.value.state, orientation.state]
  const state: VisualQualityTriState = states.includes('fail') ? 'fail' : states.includes('unknown') ? 'unknown' : 'pass'
  return {
    version: VISUAL_QUALITY_EVALUATOR_V01_VERSION,
    state,
    color: { ...color, detectedColor },
    topology: topologyParsed.value,
    orientation: { ...orientation, detectedView },
    reasonCodes: [...new Set(reasonCodes)],
  }
}

export function buildVisualQualityEvaluatorPromptV01(context: VisualLockV01Context, slotId: SlotKey): string {
  return (
    `Evaluate this generated shoe image under ${VISUAL_QUALITY_EVALUATOR_V01_VERSION}.\n` +
    `Expected dominant color evidence: ${JSON.stringify(context.identityAnchor.facts.colorZones)}\n` +
    `Source-supported component topology: ${context.serializedComponentTopology}\n` +
    `Required view: ${EXPECTED_VIEW[slotId]}. ${V01_ORIENTATION_LOCKS[slotId]}\n` +
    `Return strict JSON only with exactly these objects:\n` +
    `{"color":{"state":"pass|fail|unknown","detectedColor":"...","evidence":"..."},` +
    `"topology":{"state":"pass|fail|unknown","evidence":"..."},` +
    `"orientation":{"state":"pass|fail|unknown","detectedView":"side|hero_three_quarter|top|true_rear|rear_three_quarter|detail|unknown","evidence":"..."}}\n` +
    `PASS requires explicit visible evidence. Use UNKNOWN for ambiguity, occlusion, missing source support, incomplete visibility, unsupported values, or inability to evaluate. Never convert missing or malformed evidence to PASS. For back, rear_three_quarter is FAIL; only true_rear can pass.`
  )
}

export type VisualGeometryMeasurementV01 = {
  occupancyPercent: number
  centerOffsetXPercent: number
  centerOffsetYPercent: number
  maximumCenterOffsetPercent: number
}

export type VisualGeometryGateResultV01 = {
  version: typeof VISUAL_GEOMETRY_GATE_V01_VERSION
  slotId: SlotKey
  applicable: boolean
  state: VisualQualityTriState
  measurement: VisualGeometryMeasurementV01 | null
  reasonCodes: string[]
}

export function evaluateVisualGeometryMeasurementV01(
  slotId: SlotKey,
  measurement: VisualGeometryMeasurementV01 | null,
): VisualGeometryGateResultV01 {
  if (slotId === 'detail') {
    return { version: VISUAL_GEOMETRY_GATE_V01_VERSION, slotId, applicable: false, state: 'pass', measurement, reasonCodes: ['detail_slot_exempt'] }
  }
  if (!measurement || !Object.values(measurement).every(Number.isFinite)) {
    return { version: VISUAL_GEOMETRY_GATE_V01_VERSION, slotId, applicable: true, state: 'unknown', measurement: null, reasonCodes: ['geometry_measurement_unavailable'] }
  }
  const reasonCodes: string[] = []
  if (measurement.occupancyPercent < 72) reasonCodes.push('occupancy_below_72')
  if (measurement.occupancyPercent > 82) reasonCodes.push('occupancy_above_82')
  if (measurement.maximumCenterOffsetPercent > 3) reasonCodes.push('center_offset_above_3')
  return {
    version: VISUAL_GEOMETRY_GATE_V01_VERSION,
    slotId,
    applicable: true,
    state: reasonCodes.length > 0 ? 'fail' : 'pass',
    measurement,
    reasonCodes,
  }
}

export type VisualGeometryPackGateV01 = {
  version: typeof VISUAL_GEOMETRY_GATE_V01_VERSION
  state: VisualQualityTriState
  occupancySpreadPercent: number | null
  reasonCodes: string[]
}

export function combineVisualQualityGateV01(
  evaluatorStates: readonly VisualQualityTriState[],
  geometryState: VisualQualityTriState,
): VisualQualityTriState {
  if (evaluatorStates.length === 0) return 'unknown'
  if (evaluatorStates.includes('fail') || geometryState === 'fail') return 'fail'
  if (evaluatorStates.includes('unknown') || geometryState === 'unknown') return 'unknown'
  return 'pass'
}

const FULL_PRODUCT_SLOTS: SlotKey[] = ['side', 'hero_3q', 'top', 'back']

export function evaluateVisualGeometryPackV01(results: readonly VisualGeometryGateResultV01[]): VisualGeometryPackGateV01 {
  const bySlot = new Map(results.map((result) => [result.slotId, result]))
  const full = FULL_PRODUCT_SLOTS.map((slotId) => bySlot.get(slotId))
  if (full.some((result) => !result || result.state === 'unknown' || !result.measurement)) {
    return { version: VISUAL_GEOMETRY_GATE_V01_VERSION, state: 'unknown', occupancySpreadPercent: null, reasonCodes: ['pack_geometry_incomplete'] }
  }
  const known = full as VisualGeometryGateResultV01[]
  const occupancy = known.map((result) => result.measurement!.occupancyPercent)
  const spread = Number((Math.max(...occupancy) - Math.min(...occupancy)).toFixed(3))
  const reasonCodes = known.flatMap((result) => result.reasonCodes)
  if (spread > 8) reasonCodes.push('occupancy_spread_above_8')
  return {
    version: VISUAL_GEOMETRY_GATE_V01_VERSION,
    state: known.some((result) => result.state === 'fail') || spread > 8 ? 'fail' : 'pass',
    occupancySpreadPercent: spread,
    reasonCodes: [...new Set(reasonCodes)],
  }
}

type Fit = [number, number, number, number, number, number]

function solve6(matrix: number[][], values: number[]): Fit | null {
  const a = matrix.map((row, i) => [...row, values[i]])
  for (let col = 0; col < 6; col++) {
    let pivot = col
    for (let row = col + 1; row < 6; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row
    if (Math.abs(a[pivot][col]) < 1e-9) return null
    ;[a[col], a[pivot]] = [a[pivot], a[col]]
    const divisor = a[col][col]
    for (let j = col; j <= 6; j++) a[col][j] /= divisor
    for (let row = 0; row < 6; row++) {
      if (row === col) continue
      const factor = a[row][col]
      for (let j = col; j <= 6; j++) a[row][j] -= factor * a[col][j]
    }
  }
  return a.map((row) => row[6]) as Fit
}

function quadraticFeatures(x: number, y: number): Fit {
  return [1, x, y, x * y, x * x, y * y]
}

export async function measureVisualGeometryV01(input: Buffer): Promise<VisualGeometryMeasurementV01 | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as typeof import('sharp')
    const { data, info } = await sharp(input).removeAlpha().resize(384, 384, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
    const matrix = Array.from({ length: 6 }, () => new Array<number>(6).fill(0))
    const rhs = [new Array<number>(6).fill(0), new Array<number>(6).fill(0), new Array<number>(6).fill(0)]
    for (let y = 0; y < info.height; y += 2) {
      for (let x = 0; x < info.width; x += 2) {
        if (x > 10 && x < info.width - 11 && y > 10 && y < info.height - 11) continue
        const fx = (x / (info.width - 1)) * 2 - 1
        const fy = (y / (info.height - 1)) * 2 - 1
        const features = quadraticFeatures(fx, fy)
        const index = (y * info.width + x) * info.channels
        for (let i = 0; i < 6; i++) {
          for (let j = 0; j < 6; j++) matrix[i][j] += features[i] * features[j]
          for (let channel = 0; channel < 3; channel++) rhs[channel][i] += features[i] * data[index + channel]
        }
      }
    }
    const fits = rhs.map((values) => solve6(matrix, values))
    if (fits.some((fit) => !fit)) return null
    const mask = new Uint8Array(info.width * info.height)
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const features = quadraticFeatures((x / (info.width - 1)) * 2 - 1, (y / (info.height - 1)) * 2 - 1)
        const index = (y * info.width + x) * info.channels
        let distance2 = 0
        for (let channel = 0; channel < 3; channel++) {
          const predicted = (fits[channel] as Fit).reduce((sum, coefficient, i) => sum + coefficient * features[i], 0)
          const delta = data[index + channel] - predicted
          distance2 += delta * delta
        }
        if (distance2 > 30 * 30) mask[y * info.width + x] = 1
      }
    }
    const visited = new Uint8Array(mask.length)
    const components: Array<{ area: number; minX: number; maxX: number; minY: number; maxY: number }> = []
    for (let start = 0; start < mask.length; start++) {
      if (!mask[start] || visited[start]) continue
      const queue = [start]
      visited[start] = 1
      let area = 0, minX = info.width, maxX = 0, minY = info.height, maxY = 0
      for (let q = 0; q < queue.length; q++) {
        const index = queue[q]
        const x = index % info.width
        const y = Math.floor(index / info.width)
        area++
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
        const neighbors = [index - 1, index + 1, index - info.width, index + info.width]
        for (const next of neighbors) {
          if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue
          const nx = next % info.width
          if (Math.abs(nx - x) > 1) continue
          visited[next] = 1
          queue.push(next)
        }
      }
      components.push({ area, minX, maxX, minY, maxY })
    }
    const largest = Math.max(0, ...components.map((component) => component.area))
    const retained = components.filter((component) => component.area >= Math.max(24, largest * 0.015))
    if (retained.length === 0 || retained.reduce((sum, component) => sum + component.area, 0) < info.width * info.height * 0.005) return null
    const minX = Math.min(...retained.map((component) => component.minX))
    const maxX = Math.max(...retained.map((component) => component.maxX))
    const minY = Math.min(...retained.map((component) => component.minY))
    const maxY = Math.max(...retained.map((component) => component.maxY))
    const width = maxX - minX + 1
    const height = maxY - minY + 1
    const centerX = (minX + maxX + 1) / 2
    const centerY = (minY + maxY + 1) / 2
    const centerOffsetXPercent = Math.abs(centerX - info.width / 2) / info.width * 100
    const centerOffsetYPercent = Math.abs(centerY - info.height / 2) / info.height * 100
    return {
      occupancyPercent: Number((Math.max(width / info.width, height / info.height) * 100).toFixed(3)),
      centerOffsetXPercent: Number(centerOffsetXPercent.toFixed(3)),
      centerOffsetYPercent: Number(centerOffsetYPercent.toFixed(3)),
      maximumCenterOffsetPercent: Number(Math.max(centerOffsetXPercent, centerOffsetYPercent).toFixed(3)),
    }
  } catch {
    return null
  }
}
