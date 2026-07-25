/**
 * Identifies the PostgreSQL duplicate-key error emitted by the Shopier order
 * ID unique index. Kept separate so webhook handling can remain narrow.
 */
export function isPostgresUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const candidate = error as {
    code?: unknown
    cause?: { code?: unknown }
    message?: unknown
  }

  if (candidate.code === '23505' || candidate.cause?.code === '23505') {
    return true
  }

  return typeof candidate.message === 'string' &&
    /duplicate key|unique constraint|unique violation/i.test(candidate.message)
}
