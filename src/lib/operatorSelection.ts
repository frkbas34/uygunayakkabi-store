/**
 * operatorSelection.ts — D-240 Selection-based Bulk Actions v1
 *
 * Per-(chat,user) ephemeral selection state. Operator taps "☑ Seç" on
 * /publishready cards (or selects all visible), then a single bulk-action
 * button routes the whole selection through D-239's runBatch + the existing
 * single-item helpers. No new mutation logic.
 *
 * State model:
 *   - In-memory Map<sessionKey, Selection>
 *   - sessionKey = `${chatId}:${userId}` in groups, `${chatId}` in DMs
 *     (mirrors confirmationWizard's session key shape so isolation rules
 *     are identical and predictable for operators)
 *   - 30-minute TTL — abandoned selections expire silently
 *   - Cold-start clears the Map; the operator just re-selects
 *
 * Hard rules preserved:
 *   - Publish actions still go through approveAndActivateProduct /
 *     recordPublishDecision — every per-item action is an explicit
 *     operator gesture (the bulk button is one gesture per batch).
 *   - State-write actions still go through applyOperatorAction — same
 *     code path as single-item /soldout etc. (D-234), same idempotency.
 *   - runBatch (D-239) surfaces partial failures clearly; an item that
 *     became ineligible between selection and execution comes back as
 *     ⚠️ engellendi with the per-item refusal reason.
 */

const SELECTION_TTL_MS = 30 * 60 * 1000

export interface SelectionEntry {
  productId: number
  sn: string | null
}

interface SelectionState {
  /** Insertion-ordered map so the bulk summary lists items in the order
   *  the operator selected them. */
  entries: Map<number, SelectionEntry>
  updatedAt: number
}

const selections = new Map<string, SelectionState>()

// ── Keys ─────────────────────────────────────────────────────────────────────

export function selectionKey(chatId: number, userId?: number): string {
  return userId && userId !== chatId ? `${chatId}:${userId}` : String(chatId)
}

// ── Internal: TTL-aware get ──────────────────────────────────────────────────

function loadFresh(key: string): SelectionState | null {
  const s = selections.get(key)
  if (!s) return null
  if (Date.now() - s.updatedAt > SELECTION_TTL_MS) {
    selections.delete(key)
    return null
  }
  return s
}

function bump(s: SelectionState): SelectionState {
  s.updatedAt = Date.now()
  return s
}

// ── Public mutators ──────────────────────────────────────────────────────────

/**
 * Toggle a single product. Returns the post-toggle state so the caller can
 * answer the Telegram callback with an accurate count.
 */
export function toggleSelection(
  chatId: number,
  userId: number | undefined,
  productId: number,
  sn: string | null,
): { added: boolean; size: number } {
  const key = selectionKey(chatId, userId)
  let s = loadFresh(key)
  if (!s) {
    s = { entries: new Map(), updatedAt: Date.now() }
    selections.set(key, s)
  }
  if (s.entries.has(productId)) {
    s.entries.delete(productId)
    bump(s)
    return { added: false, size: s.entries.size }
  }
  s.entries.set(productId, { productId, sn })
  bump(s)
  return { added: true, size: s.entries.size }
}

/**
 * Add many at once (used by "Tümünü Seç"). Existing entries are not
 * duplicated. Returns the count actually added (i.e. items that weren't
 * already in the selection) and the new total.
 */
export function addManyToSelection(
  chatId: number,
  userId: number | undefined,
  items: SelectionEntry[],
): { added: number; size: number } {
  const key = selectionKey(chatId, userId)
  let s = loadFresh(key)
  if (!s) {
    s = { entries: new Map(), updatedAt: Date.now() }
    selections.set(key, s)
  }
  let added = 0
  for (const it of items) {
    if (!s.entries.has(it.productId)) {
      s.entries.set(it.productId, it)
      added++
    }
  }
  bump(s)
  return { added, size: s.entries.size }
}

export function clearSelection(chatId: number, userId?: number): { cleared: number } {
  const key = selectionKey(chatId, userId)
  const s = selections.get(key)
  const cleared = s?.entries.size ?? 0
  selections.delete(key)
  return { cleared }
}

// ── Public readers ───────────────────────────────────────────────────────────

export function getSelection(chatId: number, userId?: number): SelectionEntry[] {
  const s = loadFresh(selectionKey(chatId, userId))
  if (!s) return []
  return Array.from(s.entries.values())
}

export function getSelectionSize(chatId: number, userId?: number): number {
  return getSelection(chatId, userId).length
}

/** Returns the SN/ID identifiers in the order they were selected. Each item
 *  is the SN when known (since per-item helpers + bot-event payloads read
 *  better with SNs), falling back to the numeric ID. */
export function getSelectionIdentifiers(chatId: number, userId?: number): string[] {
  return getSelection(chatId, userId).map((e) => e.sn ?? String(e.productId))
}

// ── Telegram surface helpers ─────────────────────────────────────────────────

/**
 * The standard 5-button control keyboard rendered at the end of
 * /publishready and /selection. Counts in the labels are best-effort
 * (rendered at the time of the message); the underlying selection state
 * is consulted live when the action runs, so a stale label doesn't
 * cause a wrong action.
 */
export function selectionControlKeyboard(size: number, source: 'pr' | 'manual' = 'pr') {
  return [
    [
      { text: `☑ Tümünü Seç`, callback_data: `seladd:${source}` },
      { text: '🗑 Temizle', callback_data: 'selclr' },
    ],
    [
      { text: `🚀 Aktif Et (${size})`, callback_data: 'selrun:act' },
      { text: `🚫 Reddet (${size})`, callback_data: 'selrun:rej' },
    ],
    [
      { text: `🔴 Tükendi (${size})`, callback_data: 'selrun:soldout' },
      { text: `📦 Stop (${size})`, callback_data: 'selrun:stopsale' },
      { text: `▶ Devam (${size})`, callback_data: 'selrun:restartsale' },
    ],
    [
      { text: '📋 Seçimi Göster', callback_data: 'selshow' },
    ],
  ]
}

/**
 * Multi-line operator-friendly current-state message. Used by
 * /selection and the selshow callback.
 */
export function formatSelectionMessage(chatId: number, userId?: number): string {
  const entries = getSelection(chatId, userId)
  if (entries.length === 0) {
    return (
      `🧰 <b>Seçim Boş</b>\n\n` +
      `<i>Seçim yapmak için /publishready üzerindeki ☑ Seç düğmelerini kullanın, ` +
      `veya /selection yardım için.</i>`
    )
  }
  const lines = [
    `🧰 <b>Mevcut Seçim</b> — ${entries.length} ürün`,
    ``,
  ]
  const display = entries.slice(0, 25)
  for (const e of display) {
    const tag = e.sn ?? `ID:${e.productId}`
    lines.push(`• <code>${tag}</code>`)
  }
  if (entries.length > display.length) {
    lines.push(``, `<i>+ ${entries.length - display.length} daha</i>`)
  }
  return lines.join('\n')
}

/** TTL constant exposed for help/diagnostic messages. */
export const SELECTION_TTL_MINUTES = SELECTION_TTL_MS / 60_000
