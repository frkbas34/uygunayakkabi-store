export const VISUAL_MUTATION_LOCK_ORDER = [
  'image-generation-jobs',
  'products',
  'products-rels',
  'media',
  'payload-jobs',
  'bot-events',
  'story-jobs',
] as const

export type VisualMutationLockSurface = (typeof VISUAL_MUTATION_LOCK_ORDER)[number]

export function createVisualMutationLockSequence(
  expected: readonly VisualMutationLockSurface[] = VISUAL_MUTATION_LOCK_ORDER,
): { acquire(surface: VisualMutationLockSurface): void } {
  let index = 0
  return {
    acquire(surface) {
      if (expected[index] !== surface) throw new Error('VISUAL_MUTATION_LOCK_ORDER_VIOLATION')
      index += 1
    },
  }
}

export function orderVisualMutationLocks<T>(
  entries: ReadonlyMap<VisualMutationLockSurface, T>,
): T[] {
  if (
    entries.size !== VISUAL_MUTATION_LOCK_ORDER.length
    || VISUAL_MUTATION_LOCK_ORDER.some((surface) => !entries.has(surface))
  ) throw new Error('VISUAL_MUTATION_LOCK_AUTHORITY_INCOMPLETE')
  return VISUAL_MUTATION_LOCK_ORDER.map((surface) => entries.get(surface) as T)
}
