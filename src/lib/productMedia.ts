export function hasUsableMediaRow(rows: unknown): boolean {
  return countUsableMediaRows(rows) > 0
}

export function countUsableMediaRows(rows: unknown): number {
  if (!Array.isArray(rows)) return 0

  return rows.filter((row) => {
    if (!row) return false
    if (typeof row === 'string' || typeof row === 'number') return true
    if (typeof row !== 'object' || Array.isArray(row)) return false

    const value = row as Record<string, unknown>
    return Boolean(value.image ?? value.id)
  }).length
}
