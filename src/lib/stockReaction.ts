/**
 * stockReaction.ts — Phase 9 Central Stock-Change Reaction Logic
 *
 * Single entry point for reacting to stock changes from ANY source:
 * - Shopier webhooks (order.created → product-level stockQuantity decrement)
 * - Telegram STOCK commands (variant-level stock update)
 * - Admin UI manual edits (variant or product-level)
 * - Future: website order flow
 *
 * Responsibilities:
 * 1. Compute effective stock from variants + product-level stockQuantity
 * 2. Determine new stockState (in_stock / low_stock / sold_out / restocked)
 * 3. Update workflow.stockState, workflow.sellable, product.status
 * 4. Emit BotEvents for stock lifecycle (stock.changed, product.soldout, product.restocked)
 * 5. Exclude soldout products from homepage merchandising (via stockState — already handled by merchandising.ts)
 *
 * TRUTHFULNESS RULES:
 * - Never mark sold_out unless actual total stock = 0
 * - Never mark restocked unless stock genuinely went from 0 → positive
 * - Never change product.status to 'soldout' unless stock is actually 0
 * - Product page stays alive — soldout means visible but not sellable
 */

// ── Types ─────────────────────────────────────────────────────────────

export type StockState = 'in_stock' | 'low_stock' | 'sold_out' | 'restocked'

export interface StockReactionProduct {
  id: number | string
  status?: string | null
  stockQuantity?: number | null
  workflow?: {
    workflowStatus?: string | null
    stockState?: string | null
    sellable?: boolean | null
    lastHandledByBot?: string | null
    [key: string]: unknown
  } | null
  [key: string]: unknown
}

export interface VariantStock {
  id: number | string
  size: string
  stock: number
}

export interface StockSnapshot {
  productLevelStock: number
  variantTotalStock: number
  effectiveStock: number
  hasVariants: boolean
  variantDetails: VariantStock[]
}

export interface StockTransition {
  previousState: StockState | string
  newState: StockState
  previousSellable: boolean
  newSellable: boolean
  isSoldoutTransition: boolean
  isRestockTransition: boolean
  effectiveStock: number
}

export interface StockReactionResult {
  reacted: boolean
  snapshot: StockSnapshot
  transition: StockTransition | null
  eventsEmitted: string[]
  error?: string
}

// ── Constants ─────────────────────────────────────────────────────────

const LOW_STOCK_THRESHOLD = 3 // Products with <= 3 total stock get low_stock

// ── Stock Snapshot ────────────────────────────────────────────────────

/**
 * Compute the effective stock snapshot for a product.
 * Considers both product-level stockQuantity and variant-level stock.
 *
 * If the product has variants, the variant stock total is the source of truth.
 * If no variants exist, product-level stockQuantity is used.
 */
export async function getStockSnapshot(
  payload: any,
  productId: number | string,
  productLevelStock?: number | null,
): Promise<StockSnapshot> {
  // Fetch all variants for this product
  const { docs: variants } = await payload.find({
    collection: 'variants',
    where: { product: { equals: productId } },
    limit: 200,
    depth: 0,
  })

  const variantDetails: VariantStock[] = variants.map((v: any) => ({
    id: v.id,
    size: v.size ?? '?',
    stock: (v.stock as number) ?? 0,
  }))

  const hasVariants = variantDetails.length > 0
  const variantTotalStock = variantDetails.reduce((sum, v) => sum + v.stock, 0)
  const pLevelStock = productLevelStock ?? 0

  // Effective stock: if variants exist, use variant total. Otherwise use product-level.
  const effectiveStock = hasVariants ? variantTotalStock : pLevelStock

  return {
    productLevelStock: pLevelStock,
    variantTotalStock,
    effectiveStock,
    hasVariants,
    variantDetails,
  }
}

// ── Stock State Determination ─────────────────────────────────────────

/**
 * Determine the correct stockState based on effective stock and previous state.
 *
 * Transitions:
 * - effectiveStock === 0 → sold_out
 * - effectiveStock > 0 AND previousState was sold_out → restocked
 * - effectiveStock > 0 AND effectiveStock <= LOW_STOCK_THRESHOLD → low_stock
 * - effectiveStock > LOW_STOCK_THRESHOLD → in_stock
 *
 * The 'restocked' state is transitional — it indicates a restock event occurred.
 * After emitting the restock BotEvent, the product will settle into in_stock or low_stock.
 */
export function determineStockState(
  effectiveStock: number,
  previousState: StockState | string | null | undefined,
): StockState {
  if (effectiveStock <= 0) {
    return 'sold_out'
  }

  // Coming back from sold_out → restocked (transitional)
  if (previousState === 'sold_out') {
    return 'restocked'
  }

  // Normal stock levels
  if (effectiveStock <= LOW_STOCK_THRESHOLD) {
    return 'low_stock'
  }

  return 'in_stock'
}

/**
 * After a restock event is processed, settle the restocked state into
 * the appropriate steady state (in_stock or low_stock).
 */
export function settleRestockedState(effectiveStock: number): StockState {
  if (effectiveStock <= 0) return 'sold_out'
  if (effectiveStock <= LOW_STOCK_THRESHOLD) return 'low_stock'
  return 'in_stock'
}

// ── Stock Transition Detection ────────────────────────────────────────

/**
 * Compute the transition between previous and new stock states.
 */
export function computeTransition(
  product: StockReactionProduct,
  snapshot: StockSnapshot,
): StockTransition {
  const previousState = (product.workflow?.stockState ?? 'in_stock') as StockState
  const previousSellable = product.workflow?.sellable !== false // legacy null → true
  const newState = determineStockState(snapshot.effectiveStock, previousState)
  const newSellable = newState !== 'sold_out'

  return {
    previousState,
    newState,
    previousSellable,
    newSellable,
    isSoldoutTransition: previousState !== 'sold_out' && newState === 'sold_out',
    isRestockTransition: previousState === 'sold_out' && newState === 'restocked',
    effectiveStock: snapshot.effectiveStock,
  }
}

// ── Central Reaction ──────────────────────────────────────────────────

/**
 * Central stock reaction — call this after ANY stock change.
 *
 * This function:
 * 1. Computes the current stock snapshot
 * 2. Determines if a state transition is needed
 * 3. Updates workflow fields (stockState, sellable) + product status
 * 4. Emits BotEvents for stock lifecycle
 * 5. Syncs product-level stockQuantity to match variant total (if variants exist)
 *
 * @param payload - Payload CMS instance
 * @param productOrId - Product object or product ID
 * @param source - What triggered this reaction (shopier, telegram, admin, system)
 * @param req - Optional Payload request (for isDispatchUpdate context)
 */
export async function reactToStockChange(
  payload: any,
  productOrId: StockReactionProduct | number | string,
  source: 'shopier' | 'telegram' | 'admin' | 'system',
  req?: any,
): Promise<StockReactionResult> {
  const eventsEmitted: string[] = []

  try {
    // 1. Resolve product
    let product: StockReactionProduct
    if (typeof productOrId === 'object' && productOrId.id) {
      product = productOrId
    } else {
      product = await payload.findByID({
        collection: 'products',
        id: productOrId,
        depth: 0,
      })
    }

    if (!product) {
      return { reacted: false, snapshot: emptySnapshot(), transition: null, eventsEmitted, error: 'Product not found' }
    }

    // 2. Compute stock snapshot
    const snapshot = await getStockSnapshot(payload, product.id, product.stockQuantity)

    // 3. Compute transition
    const transition = computeTransition(product, snapshot)

    // 4. Check if any update is needed
    const stateChanged = transition.previousState !== transition.newState
    const sellableChanged = transition.previousSellable !== transition.newSellable
    const statusNeedsChange =
      (transition.isSoldoutTransition && product.status !== 'soldout') ||
      (transition.isRestockTransition && product.status === 'soldout')

    if (!stateChanged && !sellableChanged && !statusNeedsChange) {
      // No reaction needed — stock changed but state didn't
      // Still emit stock.changed for audit trail
      await emitStockChanged(payload, product.id, snapshot, source)
      eventsEmitted.push('stock.changed')
      return { reacted: false, snapshot, transition, eventsEmitted }
    }

    // 5. Build update data
    const updateReq = req
      ? { ...req, context: { ...(req.context ?? {}), isDispatchUpdate: true } }
      : { context: { isDispatchUpdate: true } }

    const updateData: Record<string, unknown> = {}

    // Workflow updates
    const workflowUpdate: Record<string, unknown> = {
      ...(product.workflow ?? {}),
      stockState: transition.newState,
      sellable: transition.newSellable,
      lastHandledByBot: 'system',
    }

    // If restocked, settle into steady state immediately
    // (restocked is transitional — we record the event, then settle)
    if (transition.isRestockTransition) {
      const settledState = settleRestockedState(snapshot.effectiveStock)
      workflowUpdate.stockState = settledState
      // If product was soldout in workflowStatus, move back to active
      if (product.workflow?.workflowStatus === 'soldout') {
        workflowUpdate.workflowStatus = 'active'
      }
    }

    // If soldout transition, update workflowStatus
    if (transition.isSoldoutTransition) {
      workflowUpdate.workflowStatus = 'soldout'
    }

    updateData.workflow = workflowUpdate

    // Product status field (separate from workflow — used by storefront)
    if (transition.isSoldoutTransition && product.status !== 'soldout') {
      updateData.status = 'soldout'
    }
    if (transition.isRestockTransition && product.status === 'soldout') {
      updateData.status = 'active'
    }

    // Sync product-level stockQuantity from variant total (if variants exist)
    if (snapshot.hasVariants) {
      updateData.stockQuantity = snapshot.variantTotalStock
    }

    // 6. Apply update
    await payload.update({
      collection: 'products',
      id: product.id,
      data: updateData,
      req: updateReq,
    })

    console.log(
      `[stockReaction] product=${product.id} source=${source} ` +
        `stock=${snapshot.effectiveStock} ` +
        `state=${transition.previousState}→${transition.newState} ` +
        `sellable=${transition.previousSellable}→${transition.newSellable}` +
        (transition.isSoldoutTransition ? ' [SOLDOUT]' : '') +
        (transition.isRestockTransition ? ' [RESTOCKED]' : ''),
    )

    // 7. Emit BotEvents
    await emitStockChanged(payload, product.id, snapshot, source)
    eventsEmitted.push('stock.changed')

    if (transition.isSoldoutTransition) {
      await emitProductSoldout(payload, product.id, snapshot, source)
      eventsEmitted.push('product.soldout')
    }

    if (transition.isRestockTransition) {
      await emitProductRestocked(payload, product.id, snapshot, source)
      eventsEmitted.push('product.restocked')
    }

    // 8. Low-stock / soldout / restock Telegram alerts
    if (transition.isSoldoutTransition || transition.isRestockTransition || transition.newState === 'low_stock') {
      await sendStockAlertToTelegram(product, snapshot, transition, source)
    }

    return { reacted: true, snapshot, transition, eventsEmitted }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[stockReaction] failed — ${msg}`)
    return { reacted: false, snapshot: emptySnapshot(), transition: null, eventsEmitted, error: msg }
  }
}

// ── BotEvent Emitters ─────────────────────────────────────────────────

async function emitStockChanged(
  payload: any,
  productId: number | string,
  snapshot: StockSnapshot,
  source: string,
): Promise<void> {
  try {
    await payload.create({
      collection: 'bot-events',
      data: {
        eventType: 'stock.changed',
        product: productId,
        sourceBot: 'system',
        status: 'processed',
        payload: {
          effectiveStock: snapshot.effectiveStock,
          variantTotalStock: snapshot.variantTotalStock,
          productLevelStock: snapshot.productLevelStock,
          hasVariants: snapshot.hasVariants,
          source,
          changedAt: new Date().toISOString(),
        },
        notes: `Stock changed via ${source}. Effective: ${snapshot.effectiveStock}`,
        processedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error(`[stockReaction] BotEvent stock.changed failed:`, err instanceof Error ? err.message : String(err))
  }
}

async function emitProductSoldout(
  payload: any,
  productId: number | string,
  snapshot: StockSnapshot,
  source: string,
): Promise<void> {
  try {
    await payload.create({
      collection: 'bot-events',
      data: {
        eventType: 'product.soldout',
        product: productId,
        sourceBot: 'system',
        status: 'processed',
        payload: {
          effectiveStock: 0,
          source,
          soldoutAt: new Date().toISOString(),
          variantDetails: snapshot.variantDetails,
        },
        notes: `Product soldout. All stock depleted via ${source}. Product page stays live, removed from merchandising sections.`,
        processedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error(`[stockReaction] BotEvent product.soldout failed:`, err instanceof Error ? err.message : String(err))
  }
}

async function emitProductRestocked(
  payload: any,
  productId: number | string,
  snapshot: StockSnapshot,
  source: string,
): Promise<void> {
  try {
    await payload.create({
      collection: 'bot-events',
      data: {
        eventType: 'product.restocked',
        product: productId,
        sourceBot: 'system',
        status: 'processed',
        payload: {
          effectiveStock: snapshot.effectiveStock,
          source,
          restockedAt: new Date().toISOString(),
          variantDetails: snapshot.variantDetails,
        },
        notes: `Product restocked via ${source}. Effective stock: ${snapshot.effectiveStock}. Re-eligible for merchandising sections.`,
        processedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error(`[stockReaction] BotEvent product.restocked failed:`, err instanceof Error ? err.message : String(err))
  }
}

// ── Telegram Display ──────────────────────────────────────────────────

/**
 * Format stock status for Telegram display.
 */
export function formatStockStatusMessage(
  product: StockReactionProduct,
  snapshot: StockSnapshot,
): string {
  const title = (product as any).title ?? `Ürün #${product.id}`
  const lines = [
    `📦 <b>Stok Durumu — ${title}</b> (ID: ${product.id})`,
    ``,
    `<b>Stok:</b>`,
    `  Efektif stok: ${snapshot.effectiveStock}`,
    `  Ürün seviyesi (stockQuantity): ${snapshot.productLevelStock}`,
    `  Varyant toplamı: ${snapshot.variantTotalStock}`,
    `  Varyant var mı: ${snapshot.hasVariants ? 'Evet' : 'Hayır'}`,
  ]

  if (snapshot.hasVariants && snapshot.variantDetails.length > 0) {
    lines.push(``)
    lines.push(`<b>Beden Detayı:</b>`)
    for (const v of snapshot.variantDetails) {
      const emoji = v.stock <= 0 ? '🔴' : v.stock <= LOW_STOCK_THRESHOLD ? '⚠️' : '✅'
      lines.push(`  ${emoji} Beden ${v.size}: ${v.stock}`)
    }
  }

  lines.push(``)
  lines.push(`<b>Workflow:</b>`)
  lines.push(`  stockState: ${product.workflow?.stockState ?? '—'}`)
  lines.push(`  sellable: ${product.workflow?.sellable ?? '—'}`)
  lines.push(`  workflowStatus: ${product.workflow?.workflowStatus ?? '—'}`)
  lines.push(`  status: ${product.status ?? '—'}`)

  return lines.join('\n')
}

// ── Telegram Low-Stock / Soldout / Restock Alerts ─────────────────────

/**
 * Send a Telegram alert when stock reaches a significant threshold.
 * Non-blocking — errors are logged but never thrown.
 */
async function sendStockAlertToTelegram(
  product: StockReactionProduct,
  snapshot: StockSnapshot,
  transition: StockTransition,
  source: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const title = (product as any).title ?? (product as any).sku ?? `Ürün #${product.id}`
  let emoji: string
  let header: string
  let detail: string

  if (transition.isSoldoutTransition) {
    emoji = '🔴'
    header = 'TÜKENDİ'
    detail = 'Tüm stok sıfır. Ürün satılabilir değil, merchandising bölümlerinden çıkarıldı.'
  } else if (transition.isRestockTransition) {
    emoji = '🔄'
    header = 'TEKRAR STOKTA'
    detail = `Stok geri geldi (${snapshot.effectiveStock} adet). Ürün tekrar satılabilir.`
  } else {
    emoji = '⚠️'
    header = 'AZ STOK'
    detail = `Toplam stok: ${snapshot.effectiveStock} adet (eşik: ${LOW_STOCK_THRESHOLD}).`
  }

  const variantLines = snapshot.hasVariants
    ? snapshot.variantDetails.map(v => `  ${v.stock <= 0 ? '🔴' : v.stock <= LOW_STOCK_THRESHOLD ? '⚠️' : '✅'} Beden ${v.size}: ${v.stock}`).join('\n')
    : ''

  const text =
    `${emoji} <b>${header} — ${title}</b> (ID: ${product.id})\n\n` +
    `${detail}\n` +
    `Kaynak: ${source}\n` +
    (variantLines ? `\n<b>Bedenler:</b>\n${variantLines}\n` : '') +
    `\n/stok ${product.id} — Detaylı stok durumu`

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch (err) {
    console.error(
      `[stockReaction] Telegram alert failed (non-blocking):`,
      err instanceof Error ? err.message : String(err),
    )
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function emptySnapshot(): StockSnapshot {
  return {
    productLevelStock: 0,
    variantTotalStock: 0,
    effectiveStock: 0,
    hasVariants: false,
    variantDetails: [],
  }
}
