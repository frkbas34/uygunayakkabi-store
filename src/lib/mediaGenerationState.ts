type RecordValue = Record<string, unknown>

const LINEAGE_KEYS = ['contractVersion', 'jobId', 'attemptId', 'slotId'] as const
const GENERATION_ASSOCIATION_KEYS = [
  'generatedBy',
  'generatedOwner',
  'generatedProvenance',
  'generationProvenance',
  'generationJob',
  'generationJobId',
  'imageGenerationJob',
  'generationAttempt',
  'generationAttemptId',
  'generationPack',
  'generationPackId',
  'packSelection',
  'sourceGenerationJobId',
] as const

export type ProductScopedMediaGenerationState =
  | { state: 'clean-original' }
  | { state: 'generation-state-present'; code: 'PRODUCT_SCOPED_MEDIA_GENERATION_STATE_PRESENT' }
  | { state: 'unsupported'; code: 'PRODUCT_SCOPED_MEDIA_GENERATION_STATE_UNSUPPORTED' }

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isEmptyLineageValue(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

/**
 * Shared with the mature verifier so its original-source classification keeps
 * the same semantic lineage predicate and reason codes.
 */
export function hasNonEmptyMediaGenerationLineage(media: RecordValue): boolean {
  const lineage = media.generationLineage
  if (!isRecord(lineage)) return false
  return LINEAGE_KEYS.some((key) => !isEmptyLineageValue(lineage[key]))
}

/**
 * Freshness is stricter than ordinary Media readability. Only a proven
 * original with no generation state can pass; enhanced/generated or unknown
 * generation representations fail closed.
 */
export function classifyProductScopedMediaGenerationState(
  media: RecordValue,
): ProductScopedMediaGenerationState {
  if (typeof media.type !== 'string' || !['original', 'enhanced', 'generated'].includes(media.type)) {
    return { state: 'unsupported', code: 'PRODUCT_SCOPED_MEDIA_GENERATION_STATE_UNSUPPORTED' }
  }

  const lineage = media.generationLineage
  if (lineage !== undefined && lineage !== null) {
    if (!isRecord(lineage)) {
      return { state: 'unsupported', code: 'PRODUCT_SCOPED_MEDIA_GENERATION_STATE_UNSUPPORTED' }
    }
    if (Object.keys(lineage).some((key) => !LINEAGE_KEYS.includes(key as (typeof LINEAGE_KEYS)[number]))) {
      return { state: 'unsupported', code: 'PRODUCT_SCOPED_MEDIA_GENERATION_STATE_UNSUPPORTED' }
    }
    for (const key of LINEAGE_KEYS) {
      const value = lineage[key]
      if (!isEmptyLineageValue(value) && (typeof value !== 'string' || value.trim().length === 0)) {
        return { state: 'unsupported', code: 'PRODUCT_SCOPED_MEDIA_GENERATION_STATE_UNSUPPORTED' }
      }
    }
  }

  const hasUnknownGenerationAssociation = GENERATION_ASSOCIATION_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(media, key))
  if (hasUnknownGenerationAssociation) {
    return { state: 'unsupported', code: 'PRODUCT_SCOPED_MEDIA_GENERATION_STATE_UNSUPPORTED' }
  }

  const hasLineage = hasNonEmptyMediaGenerationLineage(media)
  if (hasLineage || media.type === 'generated') {
    return { state: 'generation-state-present', code: 'PRODUCT_SCOPED_MEDIA_GENERATION_STATE_PRESENT' }
  }
  if (media.type !== 'original') {
    return { state: 'unsupported', code: 'PRODUCT_SCOPED_MEDIA_GENERATION_STATE_UNSUPPORTED' }
  }
  return { state: 'clean-original' }
}
