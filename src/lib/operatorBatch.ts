/**
 * operatorBatch.ts — D-239 Batch Actions / Bulk Queue Handling v1
 *
 * Thin shared layer that turns a comma-separated list of identifiers into
 * per-product results using the EXISTING single-item action helpers. No new
 * mutation logic — every batch entry routes through the same path the
 * single-item commands already use (applyOperatorAction, recordPublishDecision,
 * the inlined /activate body, etc.). This keeps behaviour, idempotency, and
 * coherence rules identical between single and batch surfaces.
 *
 * Input format:
 *   - Comma-separated SNs / IDs:  SN0017,SN0022,SN0023
 *   - Whitespace inside the list is stripped:  SN0017, SN0022, SN0023
 *   - Single token (no comma):    SN0017  → batch of 1, falls through cleanly
 *
 * Identifier resolution reuses resolveProductIdentifier (D-234) so SN0017,
 * "17", "SN17", and the numeric ID 317 all work.
 *
 * Partial-success contract:
 *   - One bad identifier never blocks the rest.
 *   - Each entry returns its own ok/refused/error state.
 *   - Repeated execution of the same batch is safe — every underlying
 *     helper is already idempotent.
 */

import { resolveProductIdentifier } from './operatorActions'

// ── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Splits a raw input string on commas, trims, drops empty tokens, dedupes
 * while preserving order. Returns an empty array if nothing usable.
 */
export function parseBatchIdentifiers(raw: string): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const piece of raw.split(/,/g)) {
    const trimmed = piece.trim()
    if (!trimmed) continue
    const key = trimmed.toUpperCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

/** True if the parsed list represents a batch operation (>1 distinct id). */
export function isBatch(idents: string[]): boolean {
  return idents.length > 1
}

// ── Execution ────────────────────────────────────────────────────────────────

export interface BatchEntryResult {
  raw: string
  /** null when resolution failed. */
  productId: number | string | null
  sn: string | null
  /** true when the per-item fn returned ok=true. */
  ok: boolean
  /** Short status tag rendered in the summary line (e.g. "✅", "🚫", "⚠️"). */
  badge: string
  /** One-line operator-facing description. */
  line: string
  /** Optional structured detail returned by the per-item fn (for callers that
   *  want to drill in — not used in default formatting). */
  detail?: unknown
}

export interface BatchResult {
  command: string
  total: number
  succeeded: number
  failed: number
  refused: number
  notFound: number
  entries: BatchEntryResult[]
}

export interface BatchItemContext {
  raw: string
  productId: number | string
  sn: string | null
  product: any
}

export type BatchItemFn = (
  ctx: BatchItemContext,
) => Promise<{
  ok: boolean
  badge?: string
  line: string
  detail?: unknown
}>

/**
 * Run `fn` against each identifier. Resolution failures are caught and
 * reported as `notFound` entries. Per-item exceptions are caught and
 * reported as `failed`. The whole batch never throws.
 */
export async function runBatch(
  payload: any,
  command: string,
  idents: string[],
  fn: BatchItemFn,
): Promise<BatchResult> {
  const entries: BatchEntryResult[] = []
  let succeeded = 0
  let failed = 0
  let refused = 0
  let notFound = 0

  for (const raw of idents) {
    let resolved
    try {
      resolved = await resolveProductIdentifier(payload, raw)
    } catch (rErr) {
      notFound++
      entries.push({
        raw,
        productId: null,
        sn: null,
        ok: false,
        badge: '❓',
        line: `<code>${raw}</code> · çözümleme hatası (${rErr instanceof Error ? rErr.message.slice(0, 60) : 'bilinmeyen'})`,
      })
      continue
    }
    if (!resolved) {
      notFound++
      entries.push({
        raw,
        productId: null,
        sn: null,
        ok: false,
        badge: '❓',
        line: `<code>${raw}</code> · bulunamadı`,
      })
      continue
    }

    try {
      const r = await fn({
        raw,
        productId: resolved.productId,
        sn: resolved.sn,
        product: resolved.product,
      })
      if (r.ok) succeeded++
      else refused++
      entries.push({
        raw,
        productId: resolved.productId,
        sn: resolved.sn,
        ok: r.ok,
        badge: r.badge ?? (r.ok ? '✅' : '⚠️'),
        line: r.line,
        detail: r.detail,
      })
    } catch (eErr) {
      failed++
      entries.push({
        raw,
        productId: resolved.productId,
        sn: resolved.sn,
        ok: false,
        badge: '❌',
        line: `<code>${resolved.sn ?? resolved.productId}</code> · hata: ${eErr instanceof Error ? eErr.message.slice(0, 80) : 'bilinmeyen'}`,
      })
    }
  }

  return {
    command,
    total: idents.length,
    succeeded,
    failed,
    refused,
    notFound,
    entries,
  }
}

// ── Formatting ───────────────────────────────────────────────────────────────

const ENTRY_DISPLAY_LIMIT = 25

/** Telegram-ready summary message. Header line + per-entry lines + tail. */
export function formatBatchSummary(result: BatchResult): string {
  const tag = (n: number, label: string, emoji: string) =>
    n > 0 ? `${emoji} ${label}: <b>${n}</b>` : null
  const stats = [
    tag(result.succeeded, 'başarılı', '✅'),
    tag(result.refused, 'reddedildi/atlandı', '⚠️'),
    tag(result.failed, 'hata', '❌'),
    tag(result.notFound, 'bulunamadı', '❓'),
  ].filter(Boolean) as string[]

  const lines: string[] = [
    `🧰 <b>${result.command}</b> — toplu sonuç (${result.total} ürün)`,
    stats.join(' · '),
    '',
  ]
  for (const e of result.entries.slice(0, ENTRY_DISPLAY_LIMIT)) {
    lines.push(`${e.badge} ${e.line}`)
  }
  if (result.entries.length > ENTRY_DISPLAY_LIMIT) {
    lines.push(``, `<i>+ ${result.entries.length - ENTRY_DISPLAY_LIMIT} satır daha (kesildi)</i>`)
  }
  return lines.join('\n')
}
