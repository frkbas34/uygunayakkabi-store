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
export const VISUAL_LOCK_V01_MATERIAL_CONTRACT_VERSION = 'material-zone-fidelity-contract/v1' as const

export const VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_REASON_CODES = [
  'COMPONENT_TOPOLOGY_HALLUCINATION',
  'UNSUPPORTED_COMPONENT_ADDITION',
  'SOURCE_COMPONENT_REMOVAL',
  'COMPONENT_COUNT_DRIFT',
  'COMPONENT_SHAPE_DRIFT',
  'COMPONENT_RELOCATION',
  'COMPONENT_ATTACHMENT_DRIFT',
  'COMPONENT_ADJACENCY_DRIFT',
  'BRAND_PLACEMENT_DRIFT',
  'PRODUCT_COUNT_DRIFT',
  'COMPONENT_EVIDENCE_INSUFFICIENT',
] as const

export type VisualLockV01ComponentTopologyReasonCode =
  (typeof VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_REASON_CODES)[number]

export const VISUAL_LOCK_V01_MATERIAL_REASON_CODES = [
  'UNSUPPORTED_MATERIAL_ADDITION',
  'MATERIAL_ZONE_DRIFT',
  'MATERIAL_EVIDENCE_INSUFFICIENT',
] as const

export type VisualLockV01MaterialReasonCode = (typeof VISUAL_LOCK_V01_MATERIAL_REASON_CODES)[number]

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
}

export type VisualLockV01Context = {
  profileVersion: typeof VISUAL_LOCK_V01_PROFILE_VERSION
  identityAnchorVersion: ProductIdentityAnchorV0['version']
  framingVersion: VisualLockV0Context['framingVersion']
  familyLockVersion: VisualLockV0Context['familyLockVersion']
  componentTopologyVersion: typeof COMPONENT_TOPOLOGY_LOCK_V01_VERSION
  evaluatorVersion: typeof VISUAL_QUALITY_EVALUATOR_V01_VERSION
  geometryGateVersion: typeof VISUAL_GEOMETRY_GATE_V01_VERSION
  materialContractVersion: typeof VISUAL_LOCK_V01_MATERIAL_CONTRACT_VERSION
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

function explicitSourceTopologyEvidence(
  values: readonly unknown[],
  matcher: RegExp,
): string {
  for (const value of values) {
    const normalized = knownOrUnknown(value)
    if (normalized !== 'unknown' && matcher.test(normalized)) return normalized
  }
  return 'unknown'
}

export function buildVisualLockV01Context(input: {
  family: VisualLockV0Family
  identityEvidence: VisualLockIdentityEvidence
  operatorVisualFacts?: string | null
}): VisualLockV01Context {
  const v0 = buildProductIdentityAnchorV0(input)
  const sourceTopologyEvidence = [
    input.identityEvidence.distinctiveFeatures,
    input.identityEvidence.constructionNotes,
    input.identityEvidence.visualNotes,
    ...(input.identityEvidence.brandTechnologies ?? []),
  ]
  const sourceHardwareEvidence = explicitSourceTopologyEvidence(
    sourceTopologyEvidence,
    /\b(?:hardware|metal|buckle|zipper|eyelet|plaque|chain|clasp|stud)\b/i,
  )
  const sourceOrnamentEvidence = explicitSourceTopologyEvidence(
    sourceTopologyEvidence,
    /\b(?:ornament|tassel|bow|charm|badge|patch|motif|appliqu\w*|embroider\w*|decorative)\b/i,
  )
  const sourceLaceEvidence = explicitSourceTopologyEvidence(
    sourceTopologyEvidence,
    /\b(?:lace|laces|eyelet|eyelets)\b/i,
  )
  const componentTopology: ComponentTopologyLockV01 = {
    version: COMPONENT_TOPOLOGY_LOCK_V01_VERSION,
    sourceSupported: {
      distinctiveFeatures: knownOrUnknown(input.identityEvidence.distinctiveFeatures),
      seamPaths: v0.identityAnchor.facts.seamPaths,
      hardwarePresence: v0.identityAnchor.facts.hardwarePresence !== 'unknown'
        ? v0.identityAnchor.facts.hardwarePresence
        : sourceHardwareEvidence,
      ornamentPresence: v0.identityAnchor.facts.ornamentPresence !== 'unknown'
        ? v0.identityAnchor.facts.ornamentPresence
        : sourceOrnamentEvidence,
      lacesAndEyelets: v0.identityAnchor.facts.lacesAndEyelets !== 'unknown'
        ? v0.identityAnchor.facts.lacesAndEyelets
        : sourceLaceEvidence,
      closureType: v0.identityAnchor.sourceEvidence.closureType,
      heelBackStructure: v0.identityAnchor.facts.heelBackStructure,
      soleProfileAndThickness: v0.identityAnchor.facts.soleProfileAndThickness,
      visualNotes: v0.identityAnchor.sourceEvidence.visualNotes,
    },
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
    materialContractVersion: VISUAL_LOCK_V01_MATERIAL_CONTRACT_VERSION,
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

/** Canonical V0.1 topology authority shared byte-for-byte by generation and evaluation. */
export const VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_CONTRACT = {
  version: COMPONENT_TOPOLOGY_LOCK_V01_VERSION,
  preservedProperties: [
    'component presence and source-supported absence',
    'component category and function',
    'component count',
    'component shape and silhouette',
    'relative size and proportion',
    'side and material-zone location',
    'orientation',
    'attachment',
    'adjacency, overlap, containment, and layering',
    'seam, panel, overlay, outsole, heel, welt, and edge continuity',
    'cross-view component identity and continuity',
  ],
  coveredComponents: [
    'ornaments and decorative details',
    'hardware, straps, buckles, loops, laces, eyelets, zippers, and pull tabs',
    'seams, stitching, panels, overlays, outsole, heel, welt, and edges',
    'embossing, labels, logos, wordmarks, motifs, and other brand details',
  ],
  forbiddenChanges: [
    'add, duplicate, remove, merge, split, or replace a component',
    'relocate, rotate, resize, reorient, or reattach a component',
    'invent an attachment point, seam, panel boundary, overlay, or material-zone boundary',
    'turn a localized ornament or hardware item into a spanning assembly',
    'relocate branding or change its modality, including embossing, print, plaque, patch, or hardware',
    'turn one shoe into a pair, second shoe, mirrored shoe, or changed handedness',
  ],
  sourceBoundary: 'topology authority comes only from supplied source references and operator-verified visual facts; absence of evidence is never evidence of absence and never permits PASS',
  hiddenRegionRule: 'when a region is hidden, cropped, low-resolution, or otherwise insufficient, continue only the nearest source-supported structure conservatively; never invent topology and return UNKNOWN when compliance cannot be verified',
  independentSlotRule: 'evaluate every semantic slot independently against the same source topology contract; another generated slot is never source authority and no pack-level evaluator call is allowed',
  detailRule: 'an intentional material_detail crop does not make an outside-crop component a removal; no visible component may be omitted; every visible cropped component and boundary must remain structurally correct, and the crop never permits invented hardware, logos, seams, plaques, or attachment points',
  explicitExclusions: 'this contract does not redefine the angle, studio, material-zone, framing, geometry, provider, retry, or semantic-slot contracts',
  reasonCodes: VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_REASON_CODES,
} as const

export function buildVisualLockV01ComponentTopologyContractPrompt(
  context: VisualLockV01Context,
  slotId: SlotKey,
): string {
  const sourceEvidence = JSON.stringify({
    componentTopology: context.componentTopology.sourceSupported,
    operatorVisualFacts: context.identityAnchor.sourceEvidence.operatorVisualFacts,
  })
  const slotRule = slotId === 'detail'
    ? `MATERIAL_DETAIL TOPOLOGY RULE: ${VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_CONTRACT.detailRule}. Apply every other topology rule unchanged.`
    : 'SLOT RULE: evaluate this slot independently against the complete source topology contract and preserve exactly one shoe with source-supported handedness.'
  return (
    `COMPONENT TOPOLOGY CONTRACT VERSION: ${VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_CONTRACT.version}\n` +
    `SOURCE-SUPPORTED TOPOLOGY EVIDENCE (canonical JSON): ${sourceEvidence}\n` +
    `PRESERVE: ${VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_CONTRACT.preservedProperties.join('; ')}.\n` +
    `COVERED COMPONENTS: ${VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_CONTRACT.coveredComponents.join('; ')}.\n` +
    `FORBIDDEN TOPOLOGY CHANGES: ${VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_CONTRACT.forbiddenChanges.join('; ')}.\n` +
    `SOURCE BOUNDARY: ${VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_CONTRACT.sourceBoundary}.\n` +
    `HIDDEN OR INSUFFICIENT REGIONS: ${VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_CONTRACT.hiddenRegionRule}.\n` +
    `SLOT INDEPENDENCE: ${VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_CONTRACT.independentSlotRule}.\n` +
    `${slotRule}\n` +
    `EXCLUSIONS: ${VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_CONTRACT.explicitExclusions}.\n` +
    `TOPOLOGY DECISION: PASS only with explicit source-supported evidence that every visible topology property is preserved; FAIL for a clear source contradiction; UNKNOWN for insufficient source or generated-image evidence.\n` +
    `TOPOLOGY REASON CODES: FAIL uses one or more of ${VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_REASON_CODES.slice(0, -1).join(', ')}; UNKNOWN uses COMPONENT_EVIDENCE_INSUFFICIENT; PASS uses no reason code.`
  )
}

/** Canonical V0.1 material authority shared byte-for-byte by generation and evaluation. */
export const VISUAL_LOCK_V01_MATERIAL_CONTRACT = {
  version: VISUAL_LOCK_V01_MATERIAL_CONTRACT_VERSION,
  preservedProperties: [
    'material class',
    'color family',
    'surface finish',
    'texture character',
    'visible coverage',
    'material-zone boundaries',
  ],
  unsupportedAdditions: [
    'material',
    'finish',
    'lining',
    'trim',
    'plaque',
    'material overlay',
    'decorative surface',
  ],
  conversionExamples: [
    'napped material to smooth material',
    'napped material to pebbled material',
    'napped material to woven material',
    'matte material to glossy material',
    'source material to synthetic-looking material',
  ],
  metalRule: 'metal is allowed only where source references or operator-verified visual facts support it; a small supported metal zone must retain its localized coverage and must never expand across a larger product region',
  zoneRule: 'a source-supported material zone must not disappear, expand, contract, move, or replace another material zone',
  insufficientEvidenceRule: 'for an insufficiently visible region, continue the nearest source-supported base material conservatively and never invent a distinct material zone',
  allowedVariation: 'minor lighting, compression, or exposure variation is not material drift when material identity, texture character, coverage, and boundaries remain visibly preserved',
  uncertaintyRule: 'when source coverage, resolution, or evaluator evidence cannot establish material identity reliably, return UNKNOWN and never infer PASS',
  detailRule: 'preserve the existing material_detail crop and angle contract; focus on a source-supported primary upper-material zone; never convert the detail into a hardware, logo, ornament, or branding close-up',
  explicitExclusions: 'this contract does not evaluate component count, attachment, hardware shape or topology, seams, component relocation, framing, or geometry',
  reasonCodes: VISUAL_LOCK_V01_MATERIAL_REASON_CODES,
} as const

export function buildVisualLockV01MaterialContractPrompt(
  context: VisualLockV01Context,
  slotId: SlotKey,
): string {
  const sourceEvidence = JSON.stringify({
    materialZones: context.identityAnchor.facts.materialZones,
    colorZones: context.identityAnchor.facts.colorZones,
    metalSupport: context.identityAnchor.facts.hardwarePresence,
    operatorVisualFacts: context.identityAnchor.sourceEvidence.operatorVisualFacts,
  })
  const slotRule = slotId === 'detail'
    ? `MATERIAL_DETAIL RULE: ${VISUAL_LOCK_V01_MATERIAL_CONTRACT.detailRule}. Apply every other material-fidelity rule unchanged.`
    : 'SLOT RULE: apply the complete material-fidelity contract to every visible product region without changing the locked angle, studio, framing, or geometry contracts.'
  return (
    `MATERIAL CONTRACT VERSION: ${VISUAL_LOCK_V01_MATERIAL_CONTRACT.version}\n` +
    `SOURCE-SUPPORTED MATERIAL EVIDENCE (canonical JSON): ${sourceEvidence}\n` +
    `PRESERVE: ${VISUAL_LOCK_V01_MATERIAL_CONTRACT.preservedProperties.join('; ')}.\n` +
    `UNSUPPORTED ADDITIONS FORBIDDEN: ${VISUAL_LOCK_V01_MATERIAL_CONTRACT.unsupportedAdditions.join('; ')}.\n` +
    `MATERIAL CONVERSION FORBIDDEN: ${VISUAL_LOCK_V01_MATERIAL_CONTRACT.conversionExamples.join('; ')}.\n` +
    `METAL COVERAGE: ${VISUAL_LOCK_V01_MATERIAL_CONTRACT.metalRule}.\n` +
    `MATERIAL-ZONE CONTINUITY: ${VISUAL_LOCK_V01_MATERIAL_CONTRACT.zoneRule}.\n` +
    `HIDDEN OR INSUFFICIENT REGIONS: ${VISUAL_LOCK_V01_MATERIAL_CONTRACT.insufficientEvidenceRule}.\n` +
    `ALLOWED APPEARANCE VARIATION: ${VISUAL_LOCK_V01_MATERIAL_CONTRACT.allowedVariation}.\n` +
    `UNCERTAINTY: ${VISUAL_LOCK_V01_MATERIAL_CONTRACT.uncertaintyRule}.\n` +
    `${slotRule}\n` +
    `EXCLUSIONS: ${VISUAL_LOCK_V01_MATERIAL_CONTRACT.explicitExclusions}.\n` +
    `MATERIAL DECISION: PASS only when every visible material zone is source-supported and preserved; FAIL for a clear unsupported material or clear material-zone drift; UNKNOWN when evidence is insufficient.\n` +
    `MATERIAL REASON CODES: FAIL uses ${VISUAL_LOCK_V01_MATERIAL_REASON_CODES[0]} and/or ${VISUAL_LOCK_V01_MATERIAL_REASON_CODES[1]}; UNKNOWN uses ${VISUAL_LOCK_V01_MATERIAL_REASON_CODES[2]}; PASS uses no reason code.`
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
    `COMPONENT TOPOLOGY EVIDENCE (canonical JSON; identical in every slot): ${context.serializedComponentTopology}\n` +
    `V0.1 COMPONENT-TOPOLOGY OVERRIDE: The following source-evidence contract is the only V0.1 component-topology authority.\n` +
    `${buildVisualLockV01ComponentTopologyContractPrompt(context, slotId)}\n` +
    `GEOMETRY CONTRACT (${context.geometryGateVersion}): complete-product slots must measure 72-82% occupancy, at most 3% center offset, and at most 8 percentage points occupancy spread across the pack. These values are verified after generation; prompt compliance alone is not PASS.\n` +
    `V0.1 ANGLE OVERRIDE: The following single-shoe contract supersedes any earlier generic scene language about free camera choice, matched pairs, mirroring, or rear-three-quarter composition.\n` +
    `${buildVisualLockV01AngleContractPrompt(slotId)}\n` +
    `V0.1 STUDIO OVERRIDE: The following fixed studio contract supersedes any earlier generic background, lighting, exposure, or shadow choice.\n` +
    `${buildVisualLockV01StudioContractPrompt(slotId)}\n` +
    `V0.1 MATERIAL-ZONE OVERRIDE: The following source-evidence contract is the only V0.1 material-fidelity authority.\n` +
    `${buildVisualLockV01MaterialContractPrompt(context, slotId)}\n` +
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

export type VisualQualityMaterialDimensionV01 = VisualQualityDimensionV01 & {
  reasonCodes: VisualLockV01MaterialReasonCode[]
}

export type VisualQualityComponentTopologyDimensionV01 = VisualQualityDimensionV01 & {
  reasonCodes: VisualLockV01ComponentTopologyReasonCode[]
}

export type VisualQualityEvaluatorResultV01 = {
  version: typeof VISUAL_QUALITY_EVALUATOR_V01_VERSION
  state: VisualQualityTriState
  color: VisualQualityDimensionV01 & { detectedColor: string }
  topology: VisualQualityComponentTopologyDimensionV01
  orientation: VisualQualityDimensionV01 & { detectedView: string }
  studio: VisualQualityDimensionV01
  material: VisualQualityMaterialDimensionV01
  reasonCodes: string[]
}

export function unknownVisualQualityEvaluatorResultV01(reasonCode: string): VisualQualityEvaluatorResultV01 {
  return {
    version: VISUAL_QUALITY_EVALUATOR_V01_VERSION,
    state: 'unknown',
    color: { state: 'unknown', evidence: '', detectedColor: 'unknown' },
    topology: { state: 'unknown', evidence: '', reasonCodes: [] },
    orientation: { state: 'unknown', evidence: '', detectedView: 'unknown' },
    studio: { state: 'unknown', evidence: '' },
    material: { state: 'unknown', evidence: '', reasonCodes: [] },
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

const COMPONENT_TOPOLOGY_REASON_CODES = new Set<string>(VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_REASON_CODES)
const COMPONENT_TOPOLOGY_FAILURE_REASON_CODES = new Set<string>(
  VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_REASON_CODES.slice(0, -1),
)

export function isVisualLockV01ComponentTopologyReasonCode(
  value: unknown,
): value is VisualLockV01ComponentTopologyReasonCode {
  return typeof value === 'string' && COMPONENT_TOPOLOGY_REASON_CODES.has(value)
}

function sourceSupportedTopologyValues(context: VisualLockV01Context): string[] {
  return Object.values(context.componentTopology.sourceSupported)
}

function hasAnySourceSupportedTopologyEvidence(context: VisualLockV01Context): boolean {
  return sourceSupportedTopologyValues(context)
    .some((value) => value.trim().toLowerCase() !== 'unknown')
}

function hasCompleteSourceSupportedTopologyEvidence(context: VisualLockV01Context): boolean {
  return sourceSupportedTopologyValues(context)
    .every((value) => value.trim().toLowerCase() !== 'unknown')
}

function parseComponentTopologyDimension(
  value: unknown,
  context: VisualLockV01Context,
): {
  value: VisualQualityComponentTopologyDimensionV01
  reason?: string
} {
  const unknown = (
    reasonCodes: VisualLockV01ComponentTopologyReasonCode[] = [],
  ): VisualQualityComponentTopologyDimensionV01 => ({
    state: 'unknown',
    evidence: '',
    reasonCodes,
  })
  const parsed = parseDimension(value, 'topology')
  if (parsed.reason) return { value: unknown(), reason: parsed.reason }

  const candidate = value as { reasonCodes?: unknown }
  if (!Array.isArray(candidate.reasonCodes)) {
    return { value: unknown(), reason: 'topology_missing_reason_codes' }
  }
  if (candidate.reasonCodes.some((reason) => !isVisualLockV01ComponentTopologyReasonCode(reason))) {
    return { value: unknown(), reason: 'topology_unsupported_reason_code' }
  }
  const reasonCodes = [...new Set(candidate.reasonCodes)] as VisualLockV01ComponentTopologyReasonCode[]
  if (!parsed.value.evidence) {
    return { value: unknown(), reason: 'topology_missing_evidence' }
  }
  if (parsed.value.state === 'pass' && reasonCodes.length > 0) {
    return { value: unknown(), reason: 'topology_reason_state_mismatch' }
  }
  if (parsed.value.state === 'fail'
    && (reasonCodes.length === 0 || reasonCodes.some((reason) => !COMPONENT_TOPOLOGY_FAILURE_REASON_CODES.has(reason)))) {
    return { value: unknown(), reason: 'topology_missing_failure_reason' }
  }
  if (parsed.value.state === 'unknown'
    && (reasonCodes.length !== 1 || reasonCodes[0] !== 'COMPONENT_EVIDENCE_INSUFFICIENT')) {
    return { value: unknown(), reason: 'topology_reason_state_mismatch' }
  }
  if (parsed.value.state === 'pass' && !hasCompleteSourceSupportedTopologyEvidence(context)) {
    return {
      value: unknown(['COMPONENT_EVIDENCE_INSUFFICIENT']),
      reason: 'topology_source_evidence_incomplete',
    }
  }
  if (parsed.value.state === 'fail' && !hasAnySourceSupportedTopologyEvidence(context)) {
    return {
      value: unknown(['COMPONENT_EVIDENCE_INSUFFICIENT']),
      reason: 'topology_source_evidence_insufficient',
    }
  }
  return { value: { ...parsed.value, reasonCodes } }
}

const MATERIAL_REASON_CODES = new Set<string>(VISUAL_LOCK_V01_MATERIAL_REASON_CODES)
const MATERIAL_FAILURE_REASON_CODES = new Set<string>([
  'UNSUPPORTED_MATERIAL_ADDITION',
  'MATERIAL_ZONE_DRIFT',
])

export function isVisualLockV01MaterialReasonCode(value: unknown): value is VisualLockV01MaterialReasonCode {
  return typeof value === 'string' && MATERIAL_REASON_CODES.has(value)
}

function parseMaterialDimension(value: unknown): {
  value: VisualQualityMaterialDimensionV01
  reason?: string
} {
  const unknown = (): VisualQualityMaterialDimensionV01 => ({ state: 'unknown', evidence: '', reasonCodes: [] })
  const parsed = parseDimension(value, 'material')
  if (parsed.reason) return { value: unknown(), reason: parsed.reason }

  const candidate = value as { reasonCodes?: unknown }
  if (!Array.isArray(candidate.reasonCodes)) {
    return { value: unknown(), reason: 'material_missing_reason_codes' }
  }
  if (candidate.reasonCodes.some((reason) => !isVisualLockV01MaterialReasonCode(reason))) {
    return { value: unknown(), reason: 'material_unsupported_reason_code' }
  }
  const reasonCodes = [...new Set(candidate.reasonCodes)] as VisualLockV01MaterialReasonCode[]
  if (!parsed.value.evidence) {
    return { value: unknown(), reason: 'material_missing_evidence' }
  }
  if (parsed.value.state === 'pass' && reasonCodes.length > 0) {
    return { value: unknown(), reason: 'material_reason_state_mismatch' }
  }
  if (parsed.value.state === 'fail'
    && (reasonCodes.length === 0 || reasonCodes.some((reason) => !MATERIAL_FAILURE_REASON_CODES.has(reason)))) {
    return { value: unknown(), reason: 'material_missing_failure_reason' }
  }
  if (parsed.value.state === 'unknown'
    && (reasonCodes.length !== 1 || reasonCodes[0] !== 'MATERIAL_EVIDENCE_INSUFFICIENT')) {
    return { value: unknown(), reason: 'material_reason_state_mismatch' }
  }
  return { value: { ...parsed.value, reasonCodes } }
}

const ALLOWED_DETECTED_VIEWS = new Set<string>(VISUAL_LOCK_V01_DETECTED_VIEWS)

export function parseVisualQualityEvaluatorV01(
  raw: string,
  slotId: SlotKey,
  context: VisualLockV01Context,
): VisualQualityEvaluatorResultV01 {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.trim())
  } catch {
    return unknownVisualQualityEvaluatorResultV01('malformed_response')
  }
  if (!parsed || typeof parsed !== 'object') return unknownVisualQualityEvaluatorResultV01('malformed_response')
  const candidate = parsed as { color?: unknown; topology?: unknown; orientation?: unknown; studio?: unknown; material?: unknown }
  const colorParsed = parseDimension(candidate.color, 'color')
  const topologyParsed = parseComponentTopologyDimension(candidate.topology, context)
  const orientationParsed = parseDimension(candidate.orientation, 'orientation')
  const studioParsed = parseDimension(candidate.studio, 'studio')
  const materialParsed = parseMaterialDimension(candidate.material)
  const colorObject = candidate.color as { detectedColor?: unknown } | undefined
  const orientationObject = candidate.orientation as { detectedView?: unknown } | undefined
  const detectedColor = typeof colorObject?.detectedColor === 'string'
    ? colorObject.detectedColor.replace(/\s+/g, ' ').trim().slice(0, 80) || 'unknown'
    : 'unknown'
  const detectedView = typeof orientationObject?.detectedView === 'string'
    ? orientationObject.detectedView.trim().toLowerCase().slice(0, 80) || 'unknown'
    : 'unknown'
  const reasonCodes = [colorParsed.reason, topologyParsed.reason, orientationParsed.reason, studioParsed.reason, materialParsed.reason].filter((x): x is string => Boolean(x))
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
  if (materialParsed.value.state === 'fail') reasonCodes.push('material_fidelity_failed')
  reasonCodes.push(...topologyParsed.value.reasonCodes, ...materialParsed.value.reasonCodes)
  const states = [color.state, topologyParsed.value.state, orientation.state, studioParsed.value.state, materialParsed.value.state]
  const state: VisualQualityTriState = states.includes('fail') ? 'fail' : states.includes('unknown') ? 'unknown' : 'pass'
  return {
    version: VISUAL_QUALITY_EVALUATOR_V01_VERSION,
    state,
    color: { ...color, detectedColor },
    topology: topologyParsed.value,
    orientation: { ...orientation, detectedView },
    studio: studioParsed.value,
    material: materialParsed.value,
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
  context: VisualLockV01Context,
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

  return parseVisualQualityEvaluatorV01(text, slotId, context)
}

export function buildVisualQualityEvaluatorPromptV01(context: VisualLockV01Context, slotId: SlotKey): string {
  return (
    `Evaluate this generated shoe image under ${VISUAL_QUALITY_EVALUATOR_V01_VERSION}.\n` +
    `Expected dominant color evidence: ${JSON.stringify(context.identityAnchor.facts.colorZones)}\n` +
    `Use this exact canonical component-topology contract, identical to generation:\n${buildVisualLockV01ComponentTopologyContractPrompt(context, slotId)}\n` +
    `Use this exact canonical angle contract, identical to generation:\n${buildVisualLockV01AngleContractPrompt(slotId)}\n` +
    `Use this exact canonical studio contract, identical to generation:\n${buildVisualLockV01StudioContractPrompt(slotId)}\n` +
    `Use this exact canonical material contract, identical to generation:\n${buildVisualLockV01MaterialContractPrompt(context, slotId)}\n` +
    `Return strict JSON only with exactly these objects:\n` +
    `{"color":{"state":"pass|fail|unknown","detectedColor":"...","evidence":"..."},` +
    `"topology":{"state":"pass|fail|unknown","reasonCodes":[],"evidence":"..."},` +
    `"orientation":{"state":"pass|fail|unknown","detectedView":"${VISUAL_LOCK_V01_DETECTED_VIEWS.join('|')}","evidence":"..."},` +
    `"studio":{"state":"pass|fail|unknown","evidence":"..."},` +
    `"material":{"state":"pass|fail|unknown","reasonCodes":[],"evidence":"..."}}\n` +
    `For topology.reasonCodes and material.reasonCodes, use only the exact state-compatible codes defined by their canonical contracts above; never combine names or invent a value.\n` +
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

export type VisualGeometryNormalizedBoundingBoxV01 = {
  x: number
  y: number
  width: number
  height: number
}

export type VisualGeometryForegroundComponentV01 = {
  areaPercent: number
  relativeAreaToLargest: number
  boundingBox: VisualGeometryNormalizedBoundingBoxV01
  comparableProductComponent: boolean
  touchesCanvasEdge: boolean
}

export type VisualGeometryForegroundInspectionV01 = {
  canvas: { width: number; height: number }
  analysisCanvas: { width: number; height: number }
  boundingBox: VisualGeometryNormalizedBoundingBoxV01
  measurement: VisualGeometryMeasurementV01
  retainedComponents: VisualGeometryForegroundComponentV01[]
  retainedAreaPercent: number
  componentEvidenceReliable: true
  additionalProductSuspected: boolean
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
  framingCorrectionState?: VisualQualityTriState
  framingCorrectionOutcome?: string
  framingCorrectionReasonCodes?: string[]
  evaluatorStatus: VisualQualityTriState
  evaluatorReasonCodes: string[]
  orientationStatus: VisualQualityTriState
  detectedView: string
  topologyStatus: VisualQualityTriState
  topologyReasonCodes: VisualLockV01ComponentTopologyReasonCode[]
  studioStatus: VisualQualityTriState
  materialStatus: VisualQualityTriState
  materialReasonCodes: VisualLockV01MaterialReasonCode[]
  geometry: VisualGeometryGateResultV01
}

export type VisualQualityGateSummaryV01 = {
  profile: typeof VISUAL_LOCK_V01_PROFILE_VERSION
  family: VisualLockV0Family
  identityAnchorHash: string
  topologyContractVersion: typeof COMPONENT_TOPOLOGY_LOCK_V01_VERSION
  evaluatorContractVersion: typeof VISUAL_QUALITY_EVALUATOR_V01_VERSION
  geometryGateVersion: typeof VISUAL_GEOMETRY_GATE_V01_VERSION
  framingCorrectionContractVersion: string
  studioContractVersion: typeof VISUAL_LOCK_V01_STUDIO_CONTRACT_VERSION
  materialContractVersion: typeof VISUAL_LOCK_V01_MATERIAL_CONTRACT_VERSION
  slotResults: Array<{
    slot: SlotKey
    framingCorrectionResult: {
      status: VisualQualityTriState
      outcome: string
      reasonCodes: string[]
    }
    evaluatorStatus: VisualQualityTriState
    evaluatorReasonCodes: string[]
    orientationResult: { status: VisualQualityTriState; detectedView: string }
    topologyResult: { status: VisualQualityTriState; reasonCodes: VisualLockV01ComponentTopologyReasonCode[] }
    studioResult: { status: VisualQualityTriState }
    materialResult: { status: VisualQualityTriState; reasonCodes: VisualLockV01MaterialReasonCode[] }
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
    materialGateStatus: VisualQualityTriState
    framingCorrectionGateStatus: VisualQualityTriState
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
  framingCorrectionContractVersion?: string
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
  const materialGateStatus = ordered.length === GENERATED_SLOT_KEYS.length
    ? combineTriStates(ordered.map((slot) => slot.materialStatus))
    : 'unknown'
  const framingCorrectionGateStatus = ordered.length === GENERATED_SLOT_KEYS.length
    ? combineTriStates(ordered.map((slot) => slot.framingCorrectionState ?? 'unknown'))
    : 'unknown'
  const qualityGateStatus = combineVisualQualityGateV01(
    [
      ...evaluatorStates,
      requiredEvaluatorCompleteness,
      orientationGateStatus,
      topologyGateStatus,
      studioGateStatus,
      materialGateStatus,
      framingCorrectionGateStatus,
    ],
    params.geometryPack.state,
  )
  const reasonCodes = [...new Set([
    ...ordered.flatMap((slot) => slot.framingCorrectionReasonCodes ?? ['framing_correction_evidence_missing']),
    ...ordered.flatMap((slot) => slot.evaluatorReasonCodes),
    ...ordered.flatMap((slot) => slot.topologyReasonCodes),
    ...ordered.flatMap((slot) => slot.materialReasonCodes),
    ...ordered.flatMap((slot) => slot.geometry.reasonCodes),
    ...params.geometryPack.reasonCodes,
    ...(requiredEvaluatorCompleteness === 'unknown' ? ['required_evaluator_incomplete'] : []),
    ...(orientationGateStatus === 'unknown' ? ['orientation_gate_unknown'] : []),
    ...(topologyGateStatus === 'unknown' ? ['topology_gate_unknown'] : []),
    ...(studioGateStatus === 'unknown' ? ['studio_gate_unknown'] : []),
    ...(materialGateStatus === 'unknown' ? ['material_gate_unknown'] : []),
    ...(framingCorrectionGateStatus === 'unknown' ? ['framing_correction_gate_unknown'] : []),
    ...(params.geometryPack.state === 'unknown' ? ['geometry_gate_unknown'] : []),
  ])]

  return {
    profile: params.context.profileVersion,
    family: params.context.family,
    identityAnchorHash: params.context.identityAnchorHash,
    topologyContractVersion: params.context.componentTopologyVersion,
    evaluatorContractVersion: params.context.evaluatorVersion,
    geometryGateVersion: params.context.geometryGateVersion,
    framingCorrectionContractVersion: params.framingCorrectionContractVersion ?? 'visual-framing-correction/v1',
    studioContractVersion: VISUAL_LOCK_V01_STUDIO_CONTRACT_VERSION,
    materialContractVersion: params.context.materialContractVersion,
    slotResults: ordered.map((slot) => ({
      slot: slot.slotId,
      framingCorrectionResult: {
        status: slot.framingCorrectionState ?? 'unknown',
        outcome: slot.framingCorrectionOutcome ?? 'insufficient_geometry_evidence',
        reasonCodes: [...(slot.framingCorrectionReasonCodes ?? ['framing_correction_evidence_missing'])],
      },
      evaluatorStatus: slot.evaluatorStatus,
      evaluatorReasonCodes: [...slot.evaluatorReasonCodes],
      orientationResult: { status: slot.orientationStatus, detectedView: slot.detectedView },
      topologyResult: { status: slot.topologyStatus, reasonCodes: [...slot.topologyReasonCodes] },
      studioResult: { status: slot.studioStatus },
      materialResult: { status: slot.materialStatus, reasonCodes: [...slot.materialReasonCodes] },
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
      materialGateStatus,
      framingCorrectionGateStatus,
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

/**
 * Inspect the exact foreground evidence used by the V0.1 geometry gate.
 *
 * The returned bounding box is the normalized union of every retained connected
 * component. It deliberately does not density-trim the union, because sparse but
 * required evidence such as the contact shadow must remain inside any later
 * framing transform's protected bounds.
 */
export async function inspectVisualGeometryForegroundV01(
  input: Buffer,
): Promise<VisualGeometryForegroundInspectionV01 | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as typeof import('sharp')
    const metadata = await sharp(input).metadata()
    const canvasWidth = metadata.width ?? 0
    const canvasHeight = metadata.height ?? 0
    if (!canvasWidth || !canvasHeight) return null
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
    const retained = components
      .filter((component) => component.area >= Math.max(24, largest * 0.015))
      .sort((left, right) => right.area - left.area || left.minY - right.minY || left.minX - right.minX)
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
    const measurement: VisualGeometryMeasurementV01 = {
      occupancyPercent: Number((Math.max(width / info.width, height / info.height) * 100).toFixed(3)),
      centerOffsetXPercent: Number(centerOffsetXPercent.toFixed(3)),
      centerOffsetYPercent: Number(centerOffsetYPercent.toFixed(3)),
      maximumCenterOffsetPercent: Number(Math.max(centerOffsetXPercent, centerOffsetYPercent).toFixed(3)),
      clippingDetected: minX === 0 || minY === 0 || maxX === info.width - 1 || maxY === info.height - 1,
    }
    const largestComponent = retained[0]
    const largestWidth = largestComponent.maxX - largestComponent.minX + 1
    const largestHeight = largestComponent.maxY - largestComponent.minY + 1
    const retainedComponents: VisualGeometryForegroundComponentV01[] = retained.map((component) => {
      const componentWidth = component.maxX - component.minX + 1
      const componentHeight = component.maxY - component.minY + 1
      const relativeAreaToLargest = component.area / largestComponent.area
      // A second shoe is normally a separately connected component with substantial
      // area and two-dimensional extent comparable to the primary shoe. A detached
      // contact shadow can be wide, but its height is deliberately too small to
      // satisfy this conservative product-component comparison.
      const comparableProductComponent = relativeAreaToLargest >= 0.25
        && componentWidth / largestWidth >= 0.45
        && componentHeight / largestHeight >= 0.45
      return {
        areaPercent: Number((component.area / (info.width * info.height) * 100).toFixed(6)),
        relativeAreaToLargest: Number(relativeAreaToLargest.toFixed(6)),
        boundingBox: {
          x: Number((component.minX / info.width).toFixed(6)),
          y: Number((component.minY / info.height).toFixed(6)),
          width: Number((componentWidth / info.width).toFixed(6)),
          height: Number((componentHeight / info.height).toFixed(6)),
        },
        comparableProductComponent,
        touchesCanvasEdge: component.minX === 0
          || component.minY === 0
          || component.maxX === info.width - 1
          || component.maxY === info.height - 1,
      }
    })
    return {
      canvas: { width: canvasWidth, height: canvasHeight },
      analysisCanvas: { width: info.width, height: info.height },
      boundingBox: {
        x: Number((minX / info.width).toFixed(6)),
        y: Number((minY / info.height).toFixed(6)),
        width: Number((width / info.width).toFixed(6)),
        height: Number((height / info.height).toFixed(6)),
      },
      measurement,
      retainedComponents,
      retainedAreaPercent: Number((retained.reduce((sum, component) => sum + component.area, 0) / (info.width * info.height) * 100).toFixed(6)),
      componentEvidenceReliable: true,
      additionalProductSuspected: retainedComponents.filter((component) => component.comparableProductComponent).length > 1,
    }
  } catch {
    return null
  }
}

export async function measureVisualGeometryV01(input: Buffer): Promise<VisualGeometryMeasurementV01 | null> {
  return (await inspectVisualGeometryForegroundV01(input))?.measurement ?? null
}
