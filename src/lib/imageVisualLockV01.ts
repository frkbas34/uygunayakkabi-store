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

export const VISUAL_LOCK_V01_ANGLE_CONTRACT_VERSION = 'visual-angle-contract/v1' as const

type VisualLockV01AngleRange = {
  targetDegrees: number
  toleranceDegrees: number
}

export type VisualLockV01AngleContract = {
  slotId: SlotKey
  semanticMeaning: 'side' | 'hero_three_quarter' | 'top' | 'true_rear' | 'material_detail'
  expectedDetectedView: 'side' | 'hero_three_quarter' | 'top' | 'true_rear' | 'material_detail'
  azimuth: VisualLockV01AngleRange | null
  elevation: VisualLockV01AngleRange
  requiredVisualCues: readonly string[]
  forbiddenVisualCues: readonly string[]
  entireShoeRequired: boolean
  intentionalCropAllowed: boolean
}

/** Canonical V0.1 angle authority. Slot keys and their existing order remain unchanged. */
export const VISUAL_LOCK_V01_ANGLE_CONTRACTS: Readonly<Record<SlotKey, VisualLockV01AngleContract>> = {
  side: {
    slotId: 'side',
    semanticMeaning: 'side',
    expectedDetectedView: 'side',
    azimuth: { targetDegrees: 90, toleranceDegrees: 2 },
    elevation: { targetDegrees: 0, toleranceDegrees: 2 },
    requiredVisualCues: [
      'strict outer-side lateral profile with the optical axis perpendicular to the side profile',
      'heel-to-toe baseline approximately horizontal',
      'entire shoe visible as exactly one shoe',
    ],
    forbiddenVisualCues: ['three-quarter view', 'elevated view', 'top-oblique view'],
    entireShoeRequired: true,
    intentionalCropAllowed: false,
  },
  hero_3q: {
    slotId: 'hero_3q',
    semanticMeaning: 'hero_three_quarter',
    expectedDetectedView: 'hero_three_quarter',
    azimuth: { targetDegrees: 40, toleranceDegrees: 5 },
    elevation: { targetDegrees: 12, toleranceDegrees: 3 },
    requiredVisualCues: [
      'front outer-side three-quarter view with toe and outer side both clearly visible',
      'heel recedes naturally',
      'entire shoe visible as exactly one shoe',
    ],
    forbiddenVisualCues: ['strict side view', 'dead-on front view', 'top view', 'rear-three-quarter view'],
    entireShoeRequired: true,
    intentionalCropAllowed: false,
  },
  top: {
    slotId: 'top',
    semanticMeaning: 'top',
    expectedDetectedView: 'top',
    azimuth: null,
    elevation: { targetDegrees: 90, toleranceDegrees: 2 },
    requiredVisualCues: [
      "strict overhead view with the shoe long axis vertical and toe pointing toward 12 o'clock",
      'no dominant side perspective',
      'entire shoe visible as exactly one shoe',
    ],
    forbiddenVisualCues: ['elevated three-quarter view', 'top-oblique view', 'diagonal shoe axis'],
    entireShoeRequired: true,
    intentionalCropAllowed: false,
  },
  back: {
    slotId: 'back',
    semanticMeaning: 'true_rear',
    expectedDetectedView: 'true_rear',
    azimuth: { targetDegrees: 180, toleranceDegrees: 2 },
    elevation: { targetDegrees: 5, toleranceDegrees: 2 },
    requiredVisualCues: [
      'centered true-rear view with heel counter centered',
      'left and right side visibility minimal and approximately symmetric',
      'entire shoe visible as exactly one shoe',
    ],
    forbiddenVisualCues: ['rear-three-quarter view', 'visible vamp', 'dominant side panel'],
    entireShoeRequired: true,
    intentionalCropAllowed: false,
  },
  detail: {
    slotId: 'detail',
    semanticMeaning: 'material_detail',
    expectedDetectedView: 'material_detail',
    azimuth: { targetDegrees: 40, toleranceDegrees: 5 },
    elevation: { targetDegrees: 25, toleranceDegrees: 5 },
    requiredVisualCues: [
      'front outer-quarter close crop of the source-supported primary upper-material zone',
      'primary focus on material surface and one existing construction boundary such as stitching or a seam',
      'visible region remains recognizably part of the same shoe and exactly one shoe identity',
    ],
    forbiddenVisualCues: ['hardware, logo, ornament, or branding close-up', 'detached material swatch', 'second shoe or pair'],
    entireShoeRequired: false,
    intentionalCropAllowed: true,
  },
}

export const VISUAL_LOCK_V01_DETECTED_VIEWS = [
  'front',
  'side',
  'hero_three_quarter',
  'top',
  'true_rear',
  'rear_three_quarter',
  'elevated_three_quarter',
  'top_oblique',
  'diagonal',
  'material_detail',
  'unknown',
] as const

export function buildVisualLockV01AngleContractPrompt(slotId: SlotKey): string {
  const contract = VISUAL_LOCK_V01_ANGLE_CONTRACTS[slotId]
  const azimuth = contract.azimuth
    ? `${contract.azimuth.targetDegrees}° ±${contract.azimuth.toleranceDegrees}°`
    : "overhead-axis controlled: long axis vertical, toe toward 12 o'clock"
  const framing = contract.intentionalCropAllowed
    ? 'intentional crop allowed for this material_detail slot only; a detached swatch is forbidden'
    : 'entire shoe required; intentional crop forbidden'
  return (
    `ANGLE CONTRACT VERSION: ${VISUAL_LOCK_V01_ANGLE_CONTRACT_VERSION}\n` +
    `SLOT ID: ${contract.slotId}; LOCKED SEMANTIC MEANING: ${contract.semanticMeaning}\n` +
    `COORDINATE REFERENCE: toe-facing camera 0°; outer-side camera 90°; heel-facing camera 180°.\n` +
    `AZIMUTH: ${azimuth}; ELEVATION: ${contract.elevation.targetDegrees}° ±${contract.elevation.toleranceDegrees}°.\n` +
    `REQUIRED VISUAL CUES: ${contract.requiredVisualCues.join('; ')}.\n` +
    `FORBIDDEN SUBSTITUTIONS: ${contract.forbiddenVisualCues.join('; ')}.\n` +
    `FRAMING: ${framing}.\n` +
    `GLOBAL IDENTITY: preserve the same physical shoe and source handedness; never mirror; never create a pair; never substitute another semantic angle.\n` +
    `ANGLE DECISION: explicit evidence inside the numeric tolerance and visual cues is PASS; a clearly incorrect semantic angle is FAIL; ambiguous or unverifiable angle evidence is UNKNOWN.`
  )
}

export const VISUAL_LOCK_V01_STUDIO_CONTRACT_VERSION = 'visual-studio-contract/v1' as const

export const VISUAL_LOCK_V01_STUDIO_CONTRACT = {
  version: VISUAL_LOCK_V01_STUDIO_CONTRACT_VERSION,
  canvas: 'square 1024 × 1024 catalog composition',
  backgroundTarget: 'uniform matte warm-neutral near-white, visually approximately #F7F5F0',
  backgroundTolerance: 'minor compression or exposure variation is acceptable when the background remains visibly uniform and warm-neutral',
  backgroundProhibitions: [
    'visible horizon or background seam',
    'floor-wall transition',
    'gradient, vignette, spotlight halo, or glow',
    'texture, pattern, props, platform, pedestal, or decorative surface',
    'reflection or glossy floor',
    'added border, frame, text, logo, caption, watermark, or Sho118 contamination',
    'foreign objects or additional products',
  ],
  lightingRequirements: [
    'clean commercial catalog lighting',
    'large broad soft key light from upper-front-left',
    'gentle soft fill from front-right with an approximate 2:1 key-to-fill relationship',
    'neutral daylight white balance targeting approximately 5200K with an acceptable visual range of approximately 5000–5400K',
    'soft tonal transitions without theatrical contrast',
    'unclipped highlights, open shadow detail, and no hotspot that changes or obscures the product material',
  ],
  lightingProhibitions: [
    'hard flash or spotlight',
    'colored light, dramatic rim light, or mixed color temperature',
    'clipped highlights or crushed shadow regions',
    'material-obscuring hotspot',
  ],
  fullProductShadowRequirements: [
    'one subtle neutral-gray contact shadow immediately beneath or tightly connected to the outsole or contact area',
    'soft feathered edges, low visual weight, and minimal lateral displacement',
    'consistent direction and softness with the locked lighting so the product appears grounded rather than floating',
  ],
  shadowProhibitions: [
    'long directional, hard-edged, detached, dramatic, or colored shadow',
    'multiple conflicting shadows',
    'mirrored reflection',
    'shadow direction inconsistent with the locked lighting',
  ],
  crossSlotConsistency: 'lighting direction, softness, exposure, white balance, background target, and applicable contact-shadow behavior remain visually consistent across all five slots',
} as const

export function buildVisualLockV01StudioContractPrompt(slotId: SlotKey): string {
  const detail = slotId === 'detail'
  const shadow = detail
    ? 'MATERIAL_DETAIL SHADOW EXCEPTION: a visible outsole or contact shadow is not required and its absence must not fail; any visible shadow must still avoid every prohibited shadow condition'
    : `CONTACT SHADOW REQUIRED: ${VISUAL_LOCK_V01_STUDIO_CONTRACT.fullProductShadowRequirements.join('; ')}`
  return (
    `STUDIO CONTRACT VERSION: ${VISUAL_LOCK_V01_STUDIO_CONTRACT.version}\n` +
    `CANVAS: ${VISUAL_LOCK_V01_STUDIO_CONTRACT.canvas}.\n` +
    `BACKGROUND TARGET: ${VISUAL_LOCK_V01_STUDIO_CONTRACT.backgroundTarget}; the hexadecimal target is a visual reference, not pixel-perfect equality. ${VISUAL_LOCK_V01_STUDIO_CONTRACT.backgroundTolerance}.\n` +
    `BACKGROUND PROHIBITIONS: ${VISUAL_LOCK_V01_STUDIO_CONTRACT.backgroundProhibitions.join('; ')}.\n` +
    `LIGHTING AND EXPOSURE: ${VISUAL_LOCK_V01_STUDIO_CONTRACT.lightingRequirements.join('; ')}.\n` +
    `LIGHTING PROHIBITIONS: ${VISUAL_LOCK_V01_STUDIO_CONTRACT.lightingProhibitions.join('; ')}.\n` +
    `${shadow}.\n` +
    `SHADOW PROHIBITIONS: ${VISUAL_LOCK_V01_STUDIO_CONTRACT.shadowProhibitions.join('; ')}.\n` +
    `CROSS-SLOT STUDIO CONSISTENCY: ${VISUAL_LOCK_V01_STUDIO_CONTRACT.crossSlotConsistency}.\n` +
    `STUDIO DECISION: clearly compliant conditions are PASS; a clearly different background or any clearly visible prohibited studio element is FAIL; ambiguous or genuinely unverifiable compliance is UNKNOWN.`
  )
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
    `V0.1 ANGLE OVERRIDE: The following single-shoe contract supersedes any earlier generic scene language about free camera choice, matched pairs, mirroring, or rear-three-quarter composition.\n` +
    `${buildVisualLockV01AngleContractPrompt(slotId)}\n` +
    `V0.1 STUDIO OVERRIDE: The following fixed studio contract supersedes any earlier generic background, lighting, exposure, or shadow choice.\n` +
    `${buildVisualLockV01StudioContractPrompt(slotId)}\n` +
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
  studio: VisualQualityDimensionV01
  reasonCodes: string[]
}

export function unknownVisualQualityEvaluatorResultV01(reasonCode: string): VisualQualityEvaluatorResultV01 {
  return {
    version: VISUAL_QUALITY_EVALUATOR_V01_VERSION,
    state: 'unknown',
    color: { state: 'unknown', evidence: '', detectedColor: 'unknown' },
    topology: { state: 'unknown', evidence: '' },
    orientation: { state: 'unknown', evidence: '', detectedView: 'unknown' },
    studio: { state: 'unknown', evidence: '' },
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

const ALLOWED_DETECTED_VIEWS = new Set<string>(VISUAL_LOCK_V01_DETECTED_VIEWS)

export function parseVisualQualityEvaluatorV01(raw: string, slotId: SlotKey): VisualQualityEvaluatorResultV01 {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.trim())
  } catch {
    return unknownVisualQualityEvaluatorResultV01('malformed_response')
  }
  if (!parsed || typeof parsed !== 'object') return unknownVisualQualityEvaluatorResultV01('malformed_response')
  const candidate = parsed as { color?: unknown; topology?: unknown; orientation?: unknown; studio?: unknown }
  const colorParsed = parseDimension(candidate.color, 'color')
  const topologyParsed = parseDimension(candidate.topology, 'topology')
  const orientationParsed = parseDimension(candidate.orientation, 'orientation')
  const studioParsed = parseDimension(candidate.studio, 'studio')
  const colorObject = candidate.color as { detectedColor?: unknown } | undefined
  const orientationObject = candidate.orientation as { detectedView?: unknown } | undefined
  const detectedColor = typeof colorObject?.detectedColor === 'string'
    ? colorObject.detectedColor.replace(/\s+/g, ' ').trim().slice(0, 80) || 'unknown'
    : 'unknown'
  const detectedView = typeof orientationObject?.detectedView === 'string'
    ? orientationObject.detectedView.trim().toLowerCase().slice(0, 80) || 'unknown'
    : 'unknown'
  const reasonCodes = [colorParsed.reason, topologyParsed.reason, orientationParsed.reason, studioParsed.reason].filter((x): x is string => Boolean(x))
  let color = colorParsed.value
  if (color.state !== 'unknown' && detectedColor === 'unknown') {
    color = { state: 'unknown', evidence: '' }
    reasonCodes.push('color_missing_detected_color')
  }
  let orientation = orientationParsed.value
  if (!ALLOWED_DETECTED_VIEWS.has(detectedView)) {
    orientation = { state: 'unknown', evidence: '' }
    reasonCodes.push('orientation_unsupported_detected_view')
  } else if (orientation.state === 'pass' && detectedView !== VISUAL_LOCK_V01_ANGLE_CONTRACTS[slotId].expectedDetectedView) {
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
  if (studioParsed.value.state === 'fail') reasonCodes.push('studio_failed')
  const states = [color.state, topologyParsed.value.state, orientation.state, studioParsed.value.state]
  const state: VisualQualityTriState = states.includes('fail') ? 'fail' : states.includes('unknown') ? 'unknown' : 'pass'
  return {
    version: VISUAL_QUALITY_EVALUATOR_V01_VERSION,
    state,
    color: { ...color, detectedColor },
    topology: topologyParsed.value,
    orientation: { ...orientation, detectedView },
    studio: studioParsed.value,
    reasonCodes: [...new Set(reasonCodes)],
  }
}

/**
 * Normalize the exact Gemini generateContent envelope used by the V0.1
 * evaluator. MAX_TOKENS is allowed to reach the strict payload parser because
 * Gemini may return a complete JSON value with that finish reason. Truncated
 * output still fails closed when JSON parsing or required-field validation
 * fails. Every other finish reason remains unsupported for this contract.
 */
export function normalizeVisualQualityProviderResponseV01(
  response: unknown,
  slotId: SlotKey,
): VisualQualityEvaluatorResultV01 {
  if (!response || typeof response !== 'object') {
    return unknownVisualQualityEvaluatorResultV01('provider_response_missing')
  }

  const envelope = response as { error?: unknown; candidates?: unknown }
  if (envelope.error !== undefined) {
    return unknownVisualQualityEvaluatorResultV01('provider_error')
  }
  if (!Array.isArray(envelope.candidates) || !envelope.candidates[0] || typeof envelope.candidates[0] !== 'object') {
    return unknownVisualQualityEvaluatorResultV01('provider_response_missing')
  }

  const candidate = envelope.candidates[0] as { finishReason?: unknown; content?: unknown }
  if (candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
    return unknownVisualQualityEvaluatorResultV01('provider_response_incomplete')
  }
  if (!candidate.content || typeof candidate.content !== 'object') {
    return unknownVisualQualityEvaluatorResultV01('provider_response_missing')
  }

  const parts = (candidate.content as { parts?: unknown }).parts
  if (!Array.isArray(parts) || !parts[0] || typeof parts[0] !== 'object') {
    return unknownVisualQualityEvaluatorResultV01('provider_response_missing')
  }
  const text = (parts[0] as { text?: unknown }).text
  if (typeof text !== 'string' || !text.trim()) {
    return unknownVisualQualityEvaluatorResultV01('provider_response_missing')
  }

  return parseVisualQualityEvaluatorV01(text, slotId)
}

export function buildVisualQualityEvaluatorPromptV01(context: VisualLockV01Context, slotId: SlotKey): string {
  return (
    `Evaluate this generated shoe image under ${VISUAL_QUALITY_EVALUATOR_V01_VERSION}.\n` +
    `Expected dominant color evidence: ${JSON.stringify(context.identityAnchor.facts.colorZones)}\n` +
    `Source-supported component topology: ${context.serializedComponentTopology}\n` +
    `Use this exact canonical angle contract, identical to generation:\n${buildVisualLockV01AngleContractPrompt(slotId)}\n` +
    `Use this exact canonical studio contract, identical to generation:\n${buildVisualLockV01StudioContractPrompt(slotId)}\n` +
    `Return strict JSON only with exactly these objects:\n` +
    `{"color":{"state":"pass|fail|unknown","detectedColor":"...","evidence":"..."},` +
    `"topology":{"state":"pass|fail|unknown","evidence":"..."},` +
    `"orientation":{"state":"pass|fail|unknown","detectedView":"${VISUAL_LOCK_V01_DETECTED_VIEWS.join('|')}","evidence":"..."},` +
    `"studio":{"state":"pass|fail|unknown","evidence":"..."}}\n` +
    `PASS requires explicit visible evidence that satisfies the slot's numeric tolerance and plain-language cues. A clearly incorrect semantic angle is FAIL. Use UNKNOWN for ambiguity, occlusion, missing source support, incomplete visibility, unsupported values, or inability to evaluate. Never convert missing or malformed evidence to PASS. For back, rear_three_quarter is FAIL; only true_rear can pass.`
  )
}

export type VisualGeometryMeasurementV01 = {
  occupancyPercent: number
  centerOffsetXPercent: number
  centerOffsetYPercent: number
  maximumCenterOffsetPercent: number
  clippingDetected: boolean
}

export type VisualGeometryGateResultV01 = {
  version: typeof VISUAL_GEOMETRY_GATE_V01_VERSION
  slotId: SlotKey
  applicable: boolean
  state: VisualQualityTriState
  clippingState: VisualQualityTriState
  measurement: VisualGeometryMeasurementV01 | null
  reasonCodes: string[]
}

export function evaluateVisualGeometryMeasurementV01(
  slotId: SlotKey,
  measurement: VisualGeometryMeasurementV01 | null,
): VisualGeometryGateResultV01 {
  if (slotId === 'detail') {
    return {
      version: VISUAL_GEOMETRY_GATE_V01_VERSION,
      slotId,
      applicable: false,
      state: 'pass',
      clippingState: measurement ? (measurement.clippingDetected ? 'fail' : 'pass') : 'unknown',
      measurement,
      reasonCodes: ['detail_slot_exempt'],
    }
  }
  if (
    !measurement
    || ![
      measurement.occupancyPercent,
      measurement.centerOffsetXPercent,
      measurement.centerOffsetYPercent,
      measurement.maximumCenterOffsetPercent,
    ].every(Number.isFinite)
    || typeof measurement.clippingDetected !== 'boolean'
  ) {
    return {
      version: VISUAL_GEOMETRY_GATE_V01_VERSION,
      slotId,
      applicable: true,
      state: 'unknown',
      clippingState: 'unknown',
      measurement: null,
      reasonCodes: ['geometry_measurement_unavailable'],
    }
  }
  const reasonCodes: string[] = []
  if (measurement.occupancyPercent < 72) reasonCodes.push('occupancy_below_72')
  if (measurement.occupancyPercent > 82) reasonCodes.push('occupancy_above_82')
  if (measurement.maximumCenterOffsetPercent > 3) reasonCodes.push('center_offset_above_3')
  if (measurement.clippingDetected) reasonCodes.push('clipping_detected')
  return {
    version: VISUAL_GEOMETRY_GATE_V01_VERSION,
    slotId,
    applicable: true,
    state: reasonCodes.length > 0 ? 'fail' : 'pass',
    clippingState: measurement.clippingDetected ? 'fail' : 'pass',
    measurement,
    reasonCodes,
  }
}

export type VisualGeometryPackGateV01 = {
  version: typeof VISUAL_GEOMETRY_GATE_V01_VERSION
  state: VisualQualityTriState
  occupancyMinimumPercent: number | null
  occupancyMaximumPercent: number | null
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
    const knownOccupancy = full
      .map((result) => result?.measurement?.occupancyPercent)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    return {
      version: VISUAL_GEOMETRY_GATE_V01_VERSION,
      state: 'unknown',
      occupancyMinimumPercent: knownOccupancy.length > 0 ? Math.min(...knownOccupancy) : null,
      occupancyMaximumPercent: knownOccupancy.length > 0 ? Math.max(...knownOccupancy) : null,
      occupancySpreadPercent: null,
      reasonCodes: ['pack_geometry_incomplete'],
    }
  }
  const known = full as VisualGeometryGateResultV01[]
  const occupancy = known.map((result) => result.measurement!.occupancyPercent)
  const minimum = Math.min(...occupancy)
  const maximum = Math.max(...occupancy)
  const spread = Number((maximum - minimum).toFixed(3))
  const reasonCodes = known.flatMap((result) => result.reasonCodes)
  if (spread > 8) reasonCodes.push('occupancy_spread_above_8')
  return {
    version: VISUAL_GEOMETRY_GATE_V01_VERSION,
    state: known.some((result) => result.state === 'fail') || spread > 8 ? 'fail' : 'pass',
    occupancyMinimumPercent: minimum,
    occupancyMaximumPercent: maximum,
    occupancySpreadPercent: spread,
    reasonCodes: [...new Set(reasonCodes)],
  }
}

export type VisualQualitySlotEvidenceV01 = {
  slotId: SlotKey
  evaluatorStatus: VisualQualityTriState
  evaluatorReasonCodes: string[]
  orientationStatus: VisualQualityTriState
  detectedView: string
  topologyStatus: VisualQualityTriState
  studioStatus: VisualQualityTriState
  geometry: VisualGeometryGateResultV01
}

export type VisualQualityGateSummaryV01 = {
  profile: typeof VISUAL_LOCK_V01_PROFILE_VERSION
  family: VisualLockV0Family
  identityAnchorHash: string
  topologyContractVersion: typeof COMPONENT_TOPOLOGY_LOCK_V01_VERSION
  evaluatorContractVersion: typeof VISUAL_QUALITY_EVALUATOR_V01_VERSION
  geometryGateVersion: typeof VISUAL_GEOMETRY_GATE_V01_VERSION
  studioContractVersion: typeof VISUAL_LOCK_V01_STUDIO_CONTRACT_VERSION
  slotResults: Array<{
    slot: SlotKey
    evaluatorStatus: VisualQualityTriState
    evaluatorReasonCodes: string[]
    orientationResult: { status: VisualQualityTriState; detectedView: string }
    topologyResult: { status: VisualQualityTriState }
    studioResult: { status: VisualQualityTriState }
    occupancyPercent: number | null
    horizontalCenterOffsetPercent: number | null
    verticalCenterOffsetPercent: number | null
    maximumCenterOffsetPercent: number | null
    clippingState: VisualQualityTriState
    geometryStatus: VisualQualityTriState
    geometryReasonCodes: string[]
  }>
  packResults: {
    occupancyMinimumPercent: number | null
    occupancyMaximumPercent: number | null
    occupancySpreadPercent: number | null
    requiredEvaluatorCompleteness: VisualQualityTriState
    orientationGateStatus: VisualQualityTriState
    topologyGateStatus: VisualQualityTriState
    studioGateStatus: VisualQualityTriState
    geometryGateStatus: VisualQualityTriState
    qualityGateStatus: VisualQualityTriState
    reasonCodes: string[]
  }
}

function combineTriStates(states: readonly VisualQualityTriState[]): VisualQualityTriState {
  if (states.length === 0) return 'unknown'
  if (states.includes('fail')) return 'fail'
  if (states.includes('unknown')) return 'unknown'
  return 'pass'
}

export function buildVisualQualityGateSummaryV01(params: {
  context: VisualLockV01Context
  slots: readonly VisualQualitySlotEvidenceV01[]
  geometryPack: VisualGeometryPackGateV01
}): VisualQualityGateSummaryV01 {
  const slotById = new Map(params.slots.map((slot) => [slot.slotId, slot]))
  const ordered = GENERATED_SLOT_KEYS.map((slotId) => slotById.get(slotId)).filter((slot): slot is VisualQualitySlotEvidenceV01 => Boolean(slot))
  const evaluatorStates = ordered.map((slot) => slot.evaluatorStatus)
  const requiredEvaluatorCompleteness: VisualQualityTriState = ordered.length === GENERATED_SLOT_KEYS.length
    && evaluatorStates.every((state) => state === 'pass' || state === 'fail')
    ? 'pass'
    : 'unknown'
  const orientationGateStatus = ordered.length === GENERATED_SLOT_KEYS.length
    ? combineTriStates(ordered.map((slot) => slot.orientationStatus))
    : 'unknown'
  const topologyGateStatus = ordered.length === GENERATED_SLOT_KEYS.length
    ? combineTriStates(ordered.map((slot) => slot.topologyStatus))
    : 'unknown'
  const studioGateStatus = ordered.length === GENERATED_SLOT_KEYS.length
    ? combineTriStates(ordered.map((slot) => slot.studioStatus))
    : 'unknown'
  const qualityGateStatus = combineVisualQualityGateV01(
    [...evaluatorStates, requiredEvaluatorCompleteness],
    params.geometryPack.state,
  )
  const reasonCodes = [...new Set([
    ...ordered.flatMap((slot) => slot.evaluatorReasonCodes),
    ...ordered.flatMap((slot) => slot.geometry.reasonCodes),
    ...params.geometryPack.reasonCodes,
    ...(requiredEvaluatorCompleteness === 'unknown' ? ['required_evaluator_incomplete'] : []),
    ...(orientationGateStatus === 'unknown' ? ['orientation_gate_unknown'] : []),
    ...(topologyGateStatus === 'unknown' ? ['topology_gate_unknown'] : []),
    ...(studioGateStatus === 'unknown' ? ['studio_gate_unknown'] : []),
    ...(params.geometryPack.state === 'unknown' ? ['geometry_gate_unknown'] : []),
  ])]

  return {
    profile: params.context.profileVersion,
    family: params.context.family,
    identityAnchorHash: params.context.identityAnchorHash,
    topologyContractVersion: params.context.componentTopologyVersion,
    evaluatorContractVersion: params.context.evaluatorVersion,
    geometryGateVersion: params.context.geometryGateVersion,
    studioContractVersion: VISUAL_LOCK_V01_STUDIO_CONTRACT_VERSION,
    slotResults: ordered.map((slot) => ({
      slot: slot.slotId,
      evaluatorStatus: slot.evaluatorStatus,
      evaluatorReasonCodes: [...slot.evaluatorReasonCodes],
      orientationResult: { status: slot.orientationStatus, detectedView: slot.detectedView },
      topologyResult: { status: slot.topologyStatus },
      studioResult: { status: slot.studioStatus },
      occupancyPercent: slot.geometry.measurement?.occupancyPercent ?? null,
      horizontalCenterOffsetPercent: slot.geometry.measurement?.centerOffsetXPercent ?? null,
      verticalCenterOffsetPercent: slot.geometry.measurement?.centerOffsetYPercent ?? null,
      maximumCenterOffsetPercent: slot.geometry.measurement?.maximumCenterOffsetPercent ?? null,
      clippingState: slot.geometry.clippingState,
      geometryStatus: slot.geometry.state,
      geometryReasonCodes: [...slot.geometry.reasonCodes],
    })),
    packResults: {
      occupancyMinimumPercent: params.geometryPack.occupancyMinimumPercent,
      occupancyMaximumPercent: params.geometryPack.occupancyMaximumPercent,
      occupancySpreadPercent: params.geometryPack.occupancySpreadPercent,
      requiredEvaluatorCompleteness,
      orientationGateStatus,
      topologyGateStatus,
      studioGateStatus,
      geometryGateStatus: params.geometryPack.state,
      qualityGateStatus,
      reasonCodes,
    },
  }
}

export function buildVisualLockV01FailureWorkflow(
  workflow: Record<string, unknown>,
): Record<string, unknown> | null {
  const visualStatus = workflow.visualStatus
  if (visualStatus !== 'generating' && visualStatus !== 'pending') return null
  return { ...workflow, visualStatus: 'rejected' }
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
      clippingDetected: minX === 0 || minY === 0 || maxX === info.width - 1 || maxY === info.height - 1,
    }
  } catch {
    return null
  }
}
