/**
 * operatorActions.ts — D-234 Operator Pack v1
 *
 * Single source of truth for Telegram operator stock/state actions.
 * Both the slash-command path (/soldout, /oneleft, /twoleft, /stopsale,
 * /restartsale, /restock) and the inline-button path (sn_tukendi, sn_1kaldi,
 * sn_2kaldi, sn_durdur, sn_ac, sn_stok, sn_card) call into the same helper
 * here. That keeps behaviour identical no matter how the operator triggers
 * the action and removes the three duplicated case-switches that previously
 * lived in route.ts.
 *
 * Variant-aware rules (smallest correct, documented explicitly):
 *
 * - soldout
 *     If product has variants → set every variant.stock to 0 first, then
 *     mark product.status='soldout'. Effective stock will settle to 0
 *     correctly via stockReaction.
 *     If no variants → set stockQuantity=0 + status='soldout'.
 *
 * - oneleft / twoleft
 *     Variant products: REFUSED. Per-size truth requires a per-size update
 *     (/sn ... stok <N> already exists for that). Operator gets a clear
 *     message pointing to the right tool.
 *     Non-variant products: set stockQuantity=1 or 2, status='active',
 *     workflow.sellable=true. stockReaction will settle to low_stock.
 *
 * - stopsale (Durdur)
 *     workflow.sellable=false. Status PRESERVED — does not drop a soldout
 *     product to 'draft'. (Old behaviour clobbered soldout → draft, losing
 *     soldout state. Fixed here.)
 *
 * - restartsale (Aç)
 *     REFUSED if effective stock <= 0 — operator told to /restock first.
 *     Otherwise status='active', workflow.sellable=true.
 *
 * - restock <qty>
 *     Variant products: REFUSED — operator updates per-size via admin or
 *     /sn ... stok <N>.
 *     Non-variant: set stockQuantity=qty (>=1), status='active',
 *     workflow.sellable=true.
 *
 * Idempotency:
 *   Each action computes a "patch" of the writes it would do. If every
 *   write target already holds the would-be value, returns
 *   { ok:true, idempotent:true, … } and skips the update + reactToStockChange.
 *   Repeated button presses do not corrupt state and do not spam events.
 */

import { reactToStockChange, getStockSnapshot } from './stockReaction'

// ── Public types ─────────────────────────────────────────────────────────────

export type OperatorAction =
  | 'soldout'
  | 'oneleft'
  | 'twoleft'
  | 'stopsale'
  | 'restartsale'
  | 'restock'

export interface OperatorActionOptions {
  restockQty?: number
  /** Where the action came from — surfaced in stockReaction events. */
  source?: 'telegram_button' | 'telegram_command' | string
}

export interface OperatorActionResult {
  ok: boolean
  /** True if no field needed updating (all writes already matched current state). */
  idempotent: boolean
  action: OperatorAction
  message: string
  productId?: number | string
  /** Set when the action couldn't run safely (variant-product refusal, 0-stock restartsale, etc.). */
  refusalReason?:
    | 'variants_present'
    | 'no_stock_to_sell'
    | 'invalid_qty'
    | 'product_not_found'
    | 'no_change_possible'
  /** Snapshot of relevant fields BEFORE the change (for diagnostics). */
  before?: Record<string, unknown>
  /** Snapshot of relevant fields AFTER the change. */
  after?: Record<string, unknown>
  /** stockReaction transition if one occurred. */
  transition?: { previousState?: string; newState?: string }
}

// ── Identifier resolution ────────────────────────────────────────────────────

export interface ResolvedProduct {
  product: any
  productId: number
  sn: string | null
  lookupType: 'sn' | 'id'
}

/**
 * Resolve a free-text identifier to a product. Accepts:
 *   - "SN0186"          → SN match
 *   - "186"             → bare number, padded to "SN0186" (4 digits)
 *   - "1234" with no SN match → numeric ID fallback
 *   - "1234" if SN lookup hits → SN match wins (unlikely overlap, see below)
 *
 * SN format is `SN\d+` so the "bare number → SN" branch is preferred. If a
 * bare number doesn't resolve as SN AND the number is small enough to look
 * like an internal ID, we try ID. This matches the existing /ara behaviour.
 */
export async function resolveProductIdentifier(
  payload: any,
  raw: string,
): Promise<ResolvedProduct | null> {
  if (!raw) return null
  const trimmed = raw.trim().toUpperCase()
  if (!trimmed) return null

  // 1. Explicit SN form
  if (/^SN\d+$/.test(trimmed)) {
    const found = await payload.find({
      collection: 'products',
      where: { stockNumber: { equals: trimmed } },
      limit: 1,
      depth: 0,
    })
    if (found.docs.length > 0) {
      const p = found.docs[0] as any
      return { product: p, productId: p.id, sn: p.stockNumber || null, lookupType: 'sn' }
    }
    return null
  }

  // 2. Bare-number — try SN with 4-digit pad first
  if (/^\d+$/.test(trimmed)) {
    const padded = `SN${trimmed.padStart(4, '0')}`
    const snResult = await payload.find({
      collection: 'products',
      where: { stockNumber: { equals: padded } },
      limit: 1,
      depth: 0,
    })
    if (snResult.docs.length > 0) {
      const p = snResult.docs[0] as any
      return { product: p, productId: p.id, sn: p.stockNumber || null, lookupType: 'sn' }
    }
    // 3. ID fallback
    const id = Number.parseInt(trimmed, 10)
    if (Number.isFinite(id)) {
      try {
        const p = await payload.findByID({ collection: 'products', id, depth: 0 })
        if (p) return { product: p, productId: id, sn: (p as any).stockNumber || null, lookupType: 'id' }
      } catch {
        /* not found */
      }
    }
    return null
  }

  return null
}

// ── Card formatting + keyboard ───────────────────────────────────────────────

const CARD_BUTTONS_ROW_1 = (pId: number | string) => [
  { text: '🔴 Tükendi', callback_data: `sn_tukendi:${pId}` },
  { text: '⚠️ Son 1 Adet', callback_data: `sn_1kaldi:${pId}` },
  { text: '⚠️ Son 2 Adet', callback_data: `sn_2kaldi:${pId}` },
]
const CARD_BUTTONS_ROW_2 = (pId: number | string) => [
  { text: '⏸️ Durdur', callback_data: `sn_durdur:${pId}` },
  { text: '▶️ Aç', callback_data: `sn_ac:${pId}` },
  { text: '📦 Stok', callback_data: `sn_stok:${pId}` },
]

export function operatorButtonsKeyboard(
  productId: number | string,
): Array<Array<{ text: string; callback_data: string }>> {
  return [CARD_BUTTONS_ROW_1(productId), CARD_BUTTONS_ROW_2(productId)]
}

export function formatOperatorCard(product: any, snapshot?: { effectiveStock: number; hasVariants: boolean }): string {
  const sn: string = product.stockNumber || `ID:${product.id}`
  const status: string = product.status || 'draft'
  const sellable = product.workflow?.sellable
  const stockState = product.workflow?.stockState
  const statusEmoji = status === 'active' ? '🟢' : status === 'soldout' ? '🔴' : '⚪'
  const lines = [
    `📦 <b>${product.title || 'İsimsiz'}</b>`,
    ``,
    `🏷️ <code>${sn}</code> | ID: ${product.id}`,
    `💰 Fiyat: ${product.price ? `₺${product.price}` : '—'}`,
    `📊 Stok: ${snapshot ? snapshot.effectiveStock : product.stockQuantity ?? 0} adet${snapshot?.hasVariants ? ' (varyantlardan)' : ''}`,
    `${statusEmoji} Durum: ${status}` +
      (typeof sellable === 'boolean' ? ` · sellable=${sellable}` : '') +
      (stockState ? ` · ${stockState}` : ''),
    `🏪 Marka: ${product.brand || '—'} | Kategori: ${product.category || '—'}`,
  ]
  return lines.join('\n')
}

// ── Action runner ────────────────────────────────────────────────────────────

const LOW_STOCK_THRESHOLD_FOR_REFUSAL = 0 // restartsale needs strictly > 0

export async function applyOperatorAction(
  payload: any,
  productId: number | string,
  action: OperatorAction,
  opts: OperatorActionOptions = {},
): Promise<OperatorActionResult> {
  // Pull fresh state — single source of truth, avoids stale snapshots
  let product: any
  try {
    product = await payload.findByID({ collection: 'products', id: productId, depth: 0 })
  } catch {
    return {
      ok: false,
      idempotent: false,
      action,
      productId,
      message: `❌ Ürün bulunamadı (ID: ${productId})`,
      refusalReason: 'product_not_found',
    }
  }
  if (!product) {
    return {
      ok: false,
      idempotent: false,
      action,
      productId,
      message: `❌ Ürün bulunamadı (ID: ${productId})`,
      refusalReason: 'product_not_found',
    }
  }

  const sn: string = product.stockNumber || `ID:${productId}`
  const snapshot = await getStockSnapshot(payload, productId, product.stockQuantity ?? 0)
  const before = {
    status: product.status,
    stockQuantity: product.stockQuantity,
    sellable: product.workflow?.sellable,
    stockState: product.workflow?.stockState,
    effectiveStock: snapshot.effectiveStock,
    hasVariants: snapshot.hasVariants,
  }

  // Build the data patch + variant updates per action.
  const updateData: Record<string, any> = {}
  const variantUpdates: Array<{ id: number | string; data: Record<string, any> }> = []
  const labels: Record<OperatorAction, string> = {
    soldout: '🔴 Tükendi',
    oneleft: '⚠️ Son 1 Adet',
    twoleft: '⚠️ Son 2 Adet',
    stopsale: '⏸️ Satış Durduruldu',
    restartsale: '▶️ Satış Açıldı',
    restock: '📦 Stok Yenilendi',
  }

  switch (action) {
    case 'soldout': {
      // Idempotency: if status already soldout AND effective stock 0 → no-op.
      if (product.status === 'soldout' && snapshot.effectiveStock === 0) {
        return idempotentResult(action, sn, productId, before, '🔴 Zaten tükendi — değişiklik yok.')
      }
      updateData.status = 'soldout'
      // Don't force sellable=false here — stockReaction will settle stockState
      // and downstream gates handle soldout → not-sellable cascade.
      if (snapshot.hasVariants) {
        for (const v of snapshot.variantDetails) {
          if ((v.stock ?? 0) !== 0) {
            variantUpdates.push({ id: v.id, data: { stock: 0 } })
          }
        }
      } else {
        if ((product.stockQuantity ?? 0) !== 0) {
          updateData.stockQuantity = 0
        }
      }
      break
    }

    case 'oneleft':
    case 'twoleft': {
      const target = action === 'oneleft' ? 1 : 2
      if (snapshot.hasVariants) {
        return {
          ok: false,
          idempotent: false,
          action,
          productId,
          before,
          message:
            `⚠️ <b>${sn}</b> varyantlı bir ürün. Beden bazlı stok için:\n` +
            `• Admin panelinden bedenleri düzenleyin, veya\n` +
            `• <code>/sn ${sn} stok &lt;N&gt;</code> ile toplam stoku ayarlayın.\n\n` +
            `(Son ${target} Adet komutu varyantsız ürünler için tasarlandı.)`,
          refusalReason: 'variants_present',
        }
      }
      // Non-variant: set product-level stock + ensure active + sellable
      const wantStock = target
      const wantStatus = 'active'
      const wantSellable = true
      const noChange =
        (product.stockQuantity ?? 0) === wantStock &&
        product.status === wantStatus &&
        product.workflow?.sellable === wantSellable
      if (noChange) {
        return idempotentResult(action, sn, productId, before, `${labels[action]} — zaten bu durumda.`)
      }
      if ((product.stockQuantity ?? 0) !== wantStock) updateData.stockQuantity = wantStock
      if (product.status !== wantStatus) updateData.status = wantStatus
      if (product.workflow?.sellable !== wantSellable) {
        updateData.workflow = { ...(product.workflow ?? {}), sellable: wantSellable }
      }
      break
    }

    case 'stopsale': {
      // Sellable=false. Preserve existing status — DO NOT clobber soldout → draft.
      if (product.workflow?.sellable === false) {
        return idempotentResult(action, sn, productId, before, '⏸️ Zaten satışa kapalı.')
      }
      updateData.workflow = { ...(product.workflow ?? {}), sellable: false }
      break
    }

    case 'restartsale': {
      if (snapshot.effectiveStock <= LOW_STOCK_THRESHOLD_FOR_REFUSAL) {
        return {
          ok: false,
          idempotent: false,
          action,
          productId,
          before,
          message:
            `⚠️ <b>${sn}</b> efektif stoku 0 — satışa açılamaz.\n` +
            `Önce stok ekleyin: <code>/restock ${sn} 5</code> (örnek)`,
          refusalReason: 'no_stock_to_sell',
        }
      }
      const wantStatus = 'active'
      const wantSellable = true
      if (product.status === wantStatus && product.workflow?.sellable === wantSellable) {
        return idempotentResult(action, sn, productId, before, '▶️ Zaten satışa açık.')
      }
      if (product.status !== wantStatus) updateData.status = wantStatus
      if (product.workflow?.sellable !== wantSellable) {
        updateData.workflow = { ...(product.workflow ?? {}), sellable: wantSellable }
      }
      break
    }

    case 'restock': {
      const qty = opts.restockQty
      if (typeof qty !== 'number' || !Number.isFinite(qty) || qty < 1) {
        return {
          ok: false,
          idempotent: false,
          action,
          productId,
          before,
          message: `❌ Geçersiz stok adedi. Kullanım: <code>/restock ${sn} 5</code>`,
          refusalReason: 'invalid_qty',
        }
      }
      if (snapshot.hasVariants) {
        return {
          ok: false,
          idempotent: false,
          action,
          productId,
          before,
          message:
            `⚠️ <b>${sn}</b> varyantlı bir ürün. Beden bazlı stok için panel veya <code>/sn ${sn} stok &lt;N&gt;</code> kullanın.`,
          refusalReason: 'variants_present',
        }
      }
      const wantStock = qty
      const wantStatus = 'active'
      const wantSellable = true
      const noChange =
        (product.stockQuantity ?? 0) === wantStock &&
        product.status === wantStatus &&
        product.workflow?.sellable === wantSellable
      if (noChange) {
        return idempotentResult(action, sn, productId, before, `📦 Stok zaten ${qty} ve aktif.`)
      }
      if ((product.stockQuantity ?? 0) !== wantStock) updateData.stockQuantity = wantStock
      if (product.status !== wantStatus) updateData.status = wantStatus
      if (product.workflow?.sellable !== wantSellable) {
        updateData.workflow = { ...(product.workflow ?? {}), sellable: wantSellable }
      }
      break
    }
  }

  // Apply variant updates first (if any) so reactToStockChange sees fresh totals.
  for (const vu of variantUpdates) {
    try {
      await payload.update({
        collection: 'variants',
        id: vu.id,
        data: vu.data,
        context: { isDispatchUpdate: true },
      })
    } catch (vErr) {
      console.warn(
        `[operatorActions] variant update failed v=${vu.id} action=${action}:`,
        vErr instanceof Error ? vErr.message : String(vErr),
      )
    }
  }

  // Apply product update only when there is at least one field to write.
  const hasProductWrite = Object.keys(updateData).length > 0
  if (hasProductWrite) {
    await payload.update({
      collection: 'products',
      id: productId,
      data: updateData,
      context: { isDispatchUpdate: true },
    })
  }

  // Cascade stock state — single shared path. Always run when we touched
  // variants OR product-level stock OR status; safe (no-op) when nothing changed.
  let transition: { previousState?: string; newState?: string } | undefined
  if (hasProductWrite || variantUpdates.length > 0) {
    try {
      // reactToStockChange accepts a narrow union — operator-button and
      // operator-command both collapse to 'telegram' for that emit.
      const result = await reactToStockChange(payload, productId, 'telegram')
      if (result?.transition) {
        transition = {
          previousState: result.transition.previousState,
          newState: result.transition.newState,
        }
      }
    } catch (rErr) {
      console.warn(
        `[operatorActions] reactToStockChange failed action=${action}:`,
        rErr instanceof Error ? rErr.message : String(rErr),
      )
    }
  }

  // Re-fetch for the after-snapshot
  let after: Record<string, unknown> = before
  try {
    const fresh = await payload.findByID({ collection: 'products', id: productId, depth: 0 }) as any
    const freshSnap = await getStockSnapshot(payload, productId, fresh.stockQuantity ?? 0)
    after = {
      status: fresh.status,
      stockQuantity: fresh.stockQuantity,
      sellable: fresh.workflow?.sellable,
      stockState: fresh.workflow?.stockState,
      effectiveStock: freshSnap.effectiveStock,
      hasVariants: freshSnap.hasVariants,
    }
  } catch {
    /* ignore — return what we have */
  }

  const resultMessage = formatActionMessage(action, sn, productId, before, after, transition)
  return {
    ok: true,
    idempotent: false,
    action,
    productId,
    message: resultMessage,
    before,
    after,
    transition,
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function idempotentResult(
  action: OperatorAction,
  sn: string,
  productId: number | string,
  before: Record<string, unknown>,
  msg: string,
): OperatorActionResult {
  return {
    ok: true,
    idempotent: true,
    action,
    productId,
    before,
    after: before,
    message: msg,
    refusalReason: 'no_change_possible',
  }
}

function formatActionMessage(
  action: OperatorAction,
  sn: string,
  productId: number | string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  transition?: { previousState?: string; newState?: string },
): string {
  const labels: Record<OperatorAction, string> = {
    soldout: '🔴 Tükendi',
    oneleft: '⚠️ Son 1 Adet',
    twoleft: '⚠️ Son 2 Adet',
    stopsale: '⏸️ Satış Durduruldu',
    restartsale: '▶️ Satış Açıldı',
    restock: '📦 Stok Yenilendi',
  }
  const statusEmoji =
    after.status === 'active' ? '🟢' : after.status === 'soldout' ? '🔴' : '⚪'

  const lines = [
    labels[action],
    ``,
    `📦 <code>${sn}</code> | ID: ${productId}`,
    `📊 Stok: ${after.effectiveStock ?? after.stockQuantity ?? 0} adet${after.hasVariants ? ' (varyantlardan)' : ''}`,
    `${statusEmoji} Durum: ${after.status} · sellable=${after.sellable}`,
  ]
  if (transition?.previousState && transition?.newState && transition.previousState !== transition.newState) {
    lines.push(`🔄 ${transition.previousState} → ${transition.newState}`)
  }
  return lines.join('\n')
}

/**
 * Format a "no-such-product / ambiguous identifier" message for chat.
 */
export function formatIdentifierMissingMessage(raw: string): string {
  return (
    `🔍 <code>${raw}</code> bulunamadı.\n` +
    `Kullanım: <code>SN0186</code>, <code>186</code> veya ürün ID.`
  )
}
