import { createHash } from 'node:crypto'

import { GENERATED_SLOT_KEYS, type SlotKey } from './imageSlotContract'

export const VISUAL_LOCK_V0_COMMAND_PROFILE = 'visual-lock-v0' as const
export const VISUAL_LOCK_V0_PROFILE_VERSION = 'visual-lock/v0' as const
export const PRODUCT_IDENTITY_ANCHOR_V0_VERSION = 'product-identity-anchor/v0' as const
export const LOAFER_IDENTITY_LOCK_V0_VERSION = 'loafer-identity-lock/v0' as const
export const VISUAL_FRAMING_LOCK_V0_VERSION = 'visual-framing-lock/v0' as const

export const VISUAL_LOCK_V0_FAMILIES = ['loafer', 'generic'] as const
export type VisualLockV0Family = (typeof VISUAL_LOCK_V0_FAMILIES)[number]

export type VisualLockIdentityEvidence = {
  productClass?: string | null
  mainColor?: string | null
  accentColor?: string | null
  material?: string | null
  toeShape?: string | null
  soleProfile?: string | null
  heelProfile?: string | null
  closureType?: string | null
  distinctiveFeatures?: string | null
  brandTechnologies?: readonly string[] | null
  colorAccents?: readonly string[] | null
  constructionNotes?: string | null
  visualNotes?: string | null
}

type KnownOrUnknown = string

export type ProductIdentityAnchorV0 = {
  version: typeof PRODUCT_IDENTITY_ANCHOR_V0_VERSION
  family: VisualLockV0Family
  facts: {
    dominantSilhouette: KnownOrUnknown
    toeShape: KnownOrUnknown
    vampUpperProportions: KnownOrUnknown
    openingShape: KnownOrUnknown
    heelBackStructure: KnownOrUnknown
    soleProfileAndThickness: KnownOrUnknown
    materialZones: readonly { zone: string; value: string }[]
    colorZones: readonly { zone: string; value: string }[]
    seamPaths: KnownOrUnknown
    hardwarePresence: KnownOrUnknown
    ornamentPresence: KnownOrUnknown
    lacesAndEyelets: KnownOrUnknown
  }
  sourceEvidence: {
    productClass: KnownOrUnknown
    closureType: KnownOrUnknown
    distinctiveFeatures: KnownOrUnknown
    constructionNotes: KnownOrUnknown
    visualNotes: KnownOrUnknown
    operatorVisualFacts: KnownOrUnknown
    materialFactLock: 'D-355M'
    visualFactLock: 'D-355N'
  }
  uncertaintyRule: 'unknown facts remain unknown; never invent hidden product structure'
}

export type VisualLockV0Context = {
  profileVersion: typeof VISUAL_LOCK_V0_PROFILE_VERSION
  identityAnchorVersion: typeof PRODUCT_IDENTITY_ANCHOR_V0_VERSION
  framingVersion: typeof VISUAL_FRAMING_LOCK_V0_VERSION
  familyLockVersion: typeof LOAFER_IDENTITY_LOCK_V0_VERSION | null
  family: VisualLockV0Family
  identityAnchor: ProductIdentityAnchorV0
  serializedIdentityAnchor: string
  identityAnchorHash: string
}

const UNKNOWN = 'unknown' as const

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized ? normalized.slice(0, 600) : null
}

function normalizeList(values: readonly string[] | null | undefined): string[] {
  return [...new Set((values ?? []).map(normalizeText).filter((value): value is string => Boolean(value)))].sort()
}

function factOrUnknown(value: unknown): KnownOrUnknown {
  return normalizeText(value) ?? UNKNOWN
}

function readOperatorFact(operatorFacts: string | null | undefined, labels: readonly string[]): string | null {
  const facts = (operatorFacts ?? '').split(/[\n;]+/)
  for (const entry of facts) {
    const separator = entry.indexOf(':')
    if (separator < 0) continue
    const key = entry.slice(0, separator).trim().toLowerCase()
    if (!labels.includes(key)) continue
    const value = normalizeText(entry.slice(separator + 1))
    if (value) return value
  }
  return null
}

function supportedLaceEvidence(evidence: VisualLockIdentityEvidence, operatorFacts?: string | null): string {
  const explicit = readOperatorFact(operatorFacts, ['laces and eyelets', 'laces/eyelets', 'laces', 'eyelets'])
  if (explicit) return explicit
  const closure = normalizeText(evidence.closureType)
  if (closure && /lace|eyelet/i.test(closure)) return closure
  return UNKNOWN
}

function buildMaterialZones(evidence: VisualLockIdentityEvidence, operatorFacts?: string | null) {
  const zones: Array<{ zone: string; value: string }> = []
  const material = normalizeText(evidence.material)
  if (material) zones.push({ zone: 'overall upper', value: material })
  const explicit = readOperatorFact(operatorFacts, ['material zones', 'material'])
  if (explicit && explicit !== material) zones.push({ zone: 'operator-verified', value: explicit })
  return zones.length > 0 ? zones : [{ zone: 'unspecified', value: UNKNOWN }]
}

function buildColorZones(evidence: VisualLockIdentityEvidence, operatorFacts?: string | null) {
  const zones: Array<{ zone: string; value: string }> = []
  const main = normalizeText(evidence.mainColor)
  const accent = normalizeText(evidence.accentColor)
  if (main) zones.push({ zone: 'dominant', value: main })
  if (accent) zones.push({ zone: 'accent', value: accent })
  for (const value of normalizeList(evidence.colorAccents)) zones.push({ zone: 'source-extracted accent', value })
  const explicit = readOperatorFact(operatorFacts, ['color zones', 'colour zones', 'color', 'colour'])
  if (explicit) zones.push({ zone: 'operator-verified', value: explicit })
  return zones.length > 0 ? zones : [{ zone: 'unspecified', value: UNKNOWN }]
}

export function buildProductIdentityAnchorV0(input: {
  family: VisualLockV0Family
  identityEvidence: VisualLockIdentityEvidence
  operatorVisualFacts?: string | null
}): VisualLockV0Context {
  const { family, identityEvidence: evidence, operatorVisualFacts } = input
  const anchor: ProductIdentityAnchorV0 = {
    version: PRODUCT_IDENTITY_ANCHOR_V0_VERSION,
    family,
    facts: {
      dominantSilhouette: readOperatorFact(operatorVisualFacts, ['dominant silhouette', 'silhouette'])
        ?? factOrUnknown(evidence.productClass),
      toeShape: readOperatorFact(operatorVisualFacts, ['toe shape', 'toe']) ?? factOrUnknown(evidence.toeShape),
      vampUpperProportions: readOperatorFact(operatorVisualFacts, ['vamp/upper proportions', 'vamp proportions', 'vamp'])
        ?? UNKNOWN,
      openingShape: readOperatorFact(operatorVisualFacts, ['opening shape', 'opening']) ?? UNKNOWN,
      heelBackStructure: readOperatorFact(operatorVisualFacts, ['heel/back structure', 'heel structure', 'back structure'])
        ?? factOrUnknown(evidence.heelProfile),
      soleProfileAndThickness: readOperatorFact(operatorVisualFacts, ['sole profile and thickness', 'sole profile', 'sole'])
        ?? factOrUnknown(evidence.soleProfile),
      materialZones: buildMaterialZones(evidence, operatorVisualFacts),
      colorZones: buildColorZones(evidence, operatorVisualFacts),
      seamPaths: readOperatorFact(operatorVisualFacts, ['seam paths', 'seams', 'stitching'])
        ?? factOrUnknown(evidence.constructionNotes),
      hardwarePresence: readOperatorFact(operatorVisualFacts, ['hardware presence', 'hardware']) ?? UNKNOWN,
      ornamentPresence: readOperatorFact(operatorVisualFacts, ['ornament presence', 'ornament']) ?? UNKNOWN,
      lacesAndEyelets: supportedLaceEvidence(evidence, operatorVisualFacts),
    },
    sourceEvidence: {
      productClass: factOrUnknown(evidence.productClass),
      closureType: factOrUnknown(evidence.closureType),
      distinctiveFeatures: factOrUnknown(evidence.distinctiveFeatures),
      constructionNotes: factOrUnknown(evidence.constructionNotes),
      visualNotes: factOrUnknown(evidence.visualNotes),
      operatorVisualFacts: factOrUnknown(operatorVisualFacts),
      materialFactLock: 'D-355M',
      visualFactLock: 'D-355N',
    },
    uncertaintyRule: 'unknown facts remain unknown; never invent hidden product structure',
  }
  const serializedIdentityAnchor = JSON.stringify(anchor)
  const identityAnchorHash = createHash('sha256').update(serializedIdentityAnchor).digest('hex')
  return {
    profileVersion: VISUAL_LOCK_V0_PROFILE_VERSION,
    identityAnchorVersion: PRODUCT_IDENTITY_ANCHOR_V0_VERSION,
    framingVersion: VISUAL_FRAMING_LOCK_V0_VERSION,
    familyLockVersion: family === 'loafer' ? LOAFER_IDENTITY_LOCK_V0_VERSION : null,
    family,
    identityAnchor: anchor,
    serializedIdentityAnchor,
    identityAnchorHash,
  }
}

const CROSS_SLOT_INVARIANT =
  `CROSS-SLOT INVARIANT: This is the exact same physical shoe in all five slots. ` +
  `Only the camera/presentation purpose may change. Product geometry and topology must not change. ` +
  `No component may be added, removed, widened, shortened, raised, or relocated. ` +
  `All five slots must form one coherent product-photography pack.`

const FRAMING_LOCK =
  `FRAMING LOCK (${VISUAL_FRAMING_LOCK_V0_VERSION}): The complete product must occupy 72-82% of the usable canvas, ` +
  `with its visual center within 3% of the canvas center. Keep consistent apparent product scale and one consistent margin family. ` +
  `No extreme zoom, no distant product, and no cut-off toe, heel, or sole.`

const ORIENTATION_LOCKS: Record<SlotKey, string> = {
  side: 'ORIENTATION AUTHORITY — side: true controlled side/lateral presentation; preserve the complete toe-to-heel profile.',
  hero_3q: 'ORIENTATION AUTHORITY — hero_3q: controlled hero three-quarter presentation; do not reinterpret it as side, top, or rear.',
  top: 'ORIENTATION AUTHORITY — top: controlled top/overhead presentation; opening and upper topology must remain source-supported.',
  back: 'ORIENTATION AUTHORITY — back: true rear, heel-centered presentation. Rear-three-quarter substitution is explicitly forbidden.',
  detail: 'ORIENTATION AUTHORITY — detail: preserve the exact same shoe identity and topology; emphasize only a source-supported detail without redesigning the product.',
}

const LOAFER_LOCK =
  `LOAFER IDENTITY LOCK (${LOAFER_IDENTITY_LOCK_V0_VERSION}): Preserve toe width and profile, vamp length, opening shape, ` +
  `apron seam path, heel counter/back construction, sole thickness and edge profile, strap/tassel/hardware topology, ` +
  `explicit hardware absence, and seam/stitching layout exactly as supported by evidence. ` +
  `Conversion into a mule, slipper, generic moccasin, Oxford/Derby, lace-up shoe, sandal, or sneaker is forbidden. ` +
  `Do not add tassels, penny straps, buckles, metal pieces, laces, eyelets, or pull tabs unless the reference evidence confirms them.`

export function buildVisualLockV0PromptBlock(context: VisualLockV0Context, slotId: SlotKey): string {
  const familyBlock = context.family === 'loafer' ? `\n${LOAFER_LOCK}` : ''
  return (
    `\n\n=== VISUAL LOCK V0 (${context.profileVersion}) ===\n` +
    `IDENTITY ANCHOR VERSION: ${context.identityAnchorVersion}\n` +
    `IDENTITY ANCHOR SHA-256: ${context.identityAnchorHash}\n` +
    `IDENTITY ANCHOR (canonical JSON; identical in every slot): ${context.serializedIdentityAnchor}\n` +
    `${CROSS_SLOT_INVARIANT}\n` +
    `${FRAMING_LOCK}\n` +
    `${ORIENTATION_LOCKS[slotId]}` +
    familyBlock +
    `\nUNKNOWN-EVIDENCE RULE: Unknown facts remain unknown. Do not infer or invent hidden structure.` +
    `\n=== END VISUAL LOCK V0 ===\n`
  )
}

export function buildVisualLockV0PromptFixture(context: VisualLockV0Context): string[] {
  return GENERATED_SLOT_KEYS.map((slotId) => buildVisualLockV0PromptBlock(context, slotId))
}

export function buildOptionalVisualLockV0PromptBlock(
  context: VisualLockV0Context | null | undefined,
  slotId: SlotKey,
): string {
  return context ? buildVisualLockV0PromptBlock(context, slotId) : ''
}

export function resolveVisualLockV0TaskSelection(input: {
  qualityProfile?: string | null
  productFamily?: string | null
}): { profile: typeof VISUAL_LOCK_V0_COMMAND_PROFILE; family: VisualLockV0Family } | null {
  const qualityProfile = normalizeText(input.qualityProfile)
  const productFamily = normalizeText(input.productFamily)
  if (!qualityProfile && !productFamily) return null
  if (qualityProfile !== VISUAL_LOCK_V0_COMMAND_PROFILE) throw new Error('Unknown image quality profile')
  if (!productFamily || !(VISUAL_LOCK_V0_FAMILIES as readonly string[]).includes(productFamily)) {
    throw new Error('Unknown Visual Lock V0 product family')
  }
  return { profile: VISUAL_LOCK_V0_COMMAND_PROFILE, family: productFamily as VisualLockV0Family }
}

export type VisualLockV0CommandRejection =
  | 'private-chat-required'
  | 'uygunops-required'
  | 'allowlisted-operator-required'
  | 'mention-prefix-forbidden'
  | 'unknown-profile'
  | 'unknown-family'
  | 'malformed-command'

export type VisualLockV0CommandDecision =
  | { kind: 'default' }
  | { kind: 'rejected'; reason: VisualLockV0CommandRejection }
  | {
      kind: 'accepted'
      productId: number
      qualityProfile: typeof VISUAL_LOCK_V0_COMMAND_PROFILE
      profileVersion: typeof VISUAL_LOCK_V0_PROFILE_VERSION
      family: VisualLockV0Family
    }

export function parseVisualLockV0Command(input: {
  text: string
  chatType: string
  botRole: 'uygunops' | 'geo'
  dmAccessReason: 'allowlisted' | 'open-allowlist' | 'denied'
}): VisualLockV0CommandDecision {
  const text = input.text.trim()
  const hasSelector = /--(?:profile|family)(?:=|\s)/i.test(text)
  if (!hasSelector) return { kind: 'default' }
  if (/^@[^\s]+\s+#gorsel\b/i.test(text)) return { kind: 'rejected', reason: 'mention-prefix-forbidden' }
  if (input.chatType !== 'private') return { kind: 'rejected', reason: 'private-chat-required' }
  if (input.botRole !== 'uygunops') return { kind: 'rejected', reason: 'uygunops-required' }
  if (input.dmAccessReason !== 'allowlisted') return { kind: 'rejected', reason: 'allowlisted-operator-required' }

  const profile = text.match(/--profile=([^\s]+)/i)?.[1]?.toLowerCase()
  const family = text.match(/--family=([^\s]+)/i)?.[1]?.toLowerCase()
  if (profile !== VISUAL_LOCK_V0_COMMAND_PROFILE) return { kind: 'rejected', reason: 'unknown-profile' }
  if (!family || !(VISUAL_LOCK_V0_FAMILIES as readonly string[]).includes(family)) {
    return { kind: 'rejected', reason: 'unknown-family' }
  }

  const exact = text.match(/^#gorsel\s+(\d+)\s+--profile=visual-lock-v0\s+--family=(loafer|generic)\s*$/i)
  if (!exact) return { kind: 'rejected', reason: 'malformed-command' }
  return {
    kind: 'accepted',
    productId: Number(exact[1]),
    qualityProfile: VISUAL_LOCK_V0_COMMAND_PROFILE,
    profileVersion: VISUAL_LOCK_V0_PROFILE_VERSION,
    family: exact[2].toLowerCase() as VisualLockV0Family,
  }
}

export function visualLockV0RejectionMessage(reason: VisualLockV0CommandRejection): string {
  const messages: Record<VisualLockV0CommandRejection, string> = {
    'private-chat-required': 'Visual Lock V0 yalnizca ozel Uygunops sohbetinde kullanilabilir.',
    'uygunops-required': 'Visual Lock V0 yalnizca @Uygunops_bot tarafindan calistirilabilir.',
    'allowlisted-operator-required': 'Visual Lock V0 yalnizca izin listesindeki operatorler icindir.',
    'mention-prefix-forbidden': 'Visual Lock V0 komutunu ozel sohbette bot etiketi olmadan gonderin.',
    'unknown-profile': 'Bilinmeyen gorsel kalite profili.',
    'unknown-family': 'Bilinmeyen urun ailesi. Desteklenen degerler: loafer, generic.',
    'malformed-command': 'Gecersiz komut. Ornek: #gorsel 349 --profile=visual-lock-v0 --family=loafer',
  }
  return messages[reason]
}
