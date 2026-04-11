/**
 * confirmationWizard.ts — Phase 5 Product Confirmation Wizard
 *
 * Pure logic helpers for the Telegram-based product confirmation flow.
 * Checks required fields, formats summaries, parses wizard inputs,
 * applies confirmation state transitions, and emits BotEvents.
 *
 * Required fields for confirmation:
 *   - category
 *   - price (> 0)
 *   - sizes (at least one variant with stock > 0)
 *   - stockQuantity (if no variants)
 *   - channelTargets (at least one)
 *
 * Optional (noted if missing but not blocking):
 *   - brand
 *   - productType
 *   - color (on variants)
 *   - material (not currently a field — future)
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface ConfirmableProduct {
  id: number | string
  title?: string | null
  sku?: string | null
  category?: string | null
  price?: number | null
  originalPrice?: number | null
  stockQuantity?: number | null
  channelTargets?: string[] | null
  brand?: number | string | null // relationship ID
  productType?: string | null
  status?: string | null
  images?: Array<{ id: number | string }> | null
  generativeGallery?: Array<{ image?: number | string | null }> | null
  variants?: Array<{ id: number | string; size?: string; stock?: number; color?: string }> | null
  workflow?: {
    workflowStatus?: string | null
    visualStatus?: string | null
    confirmationStatus?: string | null
    sellable?: boolean | null
    productConfirmedAt?: string | null
    lastHandledByBot?: string | null
  } | null
}

export interface FieldCheck {
  field: string
  label: string
  present: boolean
  value?: string
  required: boolean
}

export interface ConfirmationResult {
  ready: boolean
  missing: FieldCheck[]
  present: FieldCheck[]
  optional: FieldCheck[]
  visualReady: boolean
  alreadyConfirmed: boolean
}

export type WizardStep =
  | 'title'
  | 'stockCode'
  | 'category'
  | 'productType'
  | 'price'
  | 'sizes'
  | 'stock'
  | 'brand'
  | 'targets'
  | 'summary'
  | 'done'

export interface WizardState {
  productId: number | string
  chatId: number
  /** Phase P: operator userId for group session isolation */
  userId?: number
  step: WizardStep
  collected: {
    title?: string
    stockCode?: string
    category?: string
    productType?: string
    price?: number
    sizes?: string // e.g. "38,39,40,41,42"
    stockPerSize?: number
    brand?: string
    channelTargets?: string[]
  }
  /** Temporary set of selected sizes during inline keyboard multi-select */
  pendingSizes?: string[]
  /** Message ID of the size selection keyboard message (for editMessageText) */
  sizeMessageId?: number
  startedAt: number // Date.now()
}

// ── Constants ─────────────────────────────────────────────────────────

export const CATEGORY_OPTIONS = [
  { label: 'Günlük', value: 'Günlük' },
  { label: 'Spor', value: 'Spor' },
  { label: 'Klasik', value: 'Klasik' },
  { label: 'Bot', value: 'Bot' },
  { label: 'Sandalet', value: 'Sandalet' },
  { label: 'Krampon', value: 'Krampon' },
  { label: 'Cüzdan', value: 'Cüzdan' },
]

export const PRODUCT_TYPE_OPTIONS = [
  { label: '👟 Erkek', value: 'Erkek' },
  { label: '👠 Kadın', value: 'Kadın' },
  { label: '🧒 Çocuk', value: 'Çocuk' },
  { label: '👫 Unisex', value: 'Unisex' },
]

export const CHANNEL_OPTIONS = [
  { label: '🌐 Website', value: 'website' },
  { label: '📸 Instagram', value: 'instagram' },
  { label: '🛒 Shopier', value: 'shopier' },
  { label: '📘 Facebook', value: 'facebook' },
]

/** Wizard sessions expire after 30 minutes of inactivity */
const WIZARD_TIMEOUT_MS = 30 * 60 * 1000

// ── Wizard sessions — Map cache + DB-backed persistence (D-158) ──────
// Phase P: Key is `${chatId}:${userId}` in group context for per-operator isolation,
// or `${chatId}` in DM context (backward compatible — userId omitted or same as chatId).
//
// D-158: the in-memory Map is a per-Lambda-instance fast-path cache, but the
// canonical store is now the Neon `wizard_sessions` table so sessions survive
// cold starts, deploys, and instance rotations. Call hydrateWizardSession()
// at the start of each handler to load from DB into the Map; sync getters
// then work as before. Writes are fire-and-forget via persistWizardSessionBackground().

const wizardSessions = new Map<string, WizardState>()

function sessionKey(chatId: number, userId?: number): string {
  return userId ? `${chatId}:${userId}` : String(chatId)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PayloadLike = { db?: { pool?: { query: (text: string, vals?: any[]) => Promise<{ rows: any[] }> } } }

/**
 * D-158: Load wizard session from DB into the in-memory cache.
 * Call this at the top of any Telegram handler that then invokes the sync
 * getWizardSession() / setWizardSession() helpers. Safe to call repeatedly
 * and when no session exists — it is a no-op in that case.
 */
export async function hydrateWizardSession(
  payload: PayloadLike,
  chatId: number,
  userId?: number,
): Promise<WizardState | null> {
  const key = sessionKey(chatId, userId)

  // If we already have a fresh entry in the local Map, use it.
  const cached = wizardSessions.get(key)
  if (cached && Date.now() - cached.startedAt <= WIZARD_TIMEOUT_MS) {
    return cached
  }

  const pool = payload?.db?.pool
  if (!pool) {
    console.warn('[hydrateWizardSession D-158] payload.db.pool not available')
    return cached ?? null
  }

  try {
    const { rows } = await pool.query(
      `SELECT state, started_at FROM wizard_sessions
       WHERE session_key = $1
         AND started_at > NOW() - INTERVAL '30 minutes'
       LIMIT 1`,
      [key],
    )
    if (rows.length === 0) {
      // No fresh row. Clear any stale local copy so getters see null.
      if (cached) wizardSessions.delete(key)
      return null
    }
    const rawState = rows[0].state
    const state: WizardState = typeof rawState === 'string' ? JSON.parse(rawState) : rawState
    wizardSessions.set(key, state)
    console.log(`[hydrateWizardSession D-158] loaded key=${key} step=${state.step} productId=${state.productId}`)
    return state
  } catch (err) {
    console.warn('[hydrateWizardSession D-158] DB load failed:', err instanceof Error ? err.message : err)
    return cached ?? null
  }
}

/**
 * D-158 / D-166: Persist (upsert) a wizard session to the DB.
 *
 * D-166: This used to be fire-and-forget ("Background"), which caused a race
 * on Vercel serverless where the Lambda would freeze before the in-flight
 * DB query drained. When the operator's follow-up text message landed on
 * a different Lambda instance, the hydrate query found no row, and the
 * wizard interceptor silently dropped the reply. See D-166 in DECISIONS.md.
 *
 * Now returns Promise<void>; callers in route.ts `await` this via
 * setWizardSession so the DB write is durable before the handler returns.
 * Errors are still caught and warned — we don't want to 500 on a transient
 * Neon hiccup, but we do want to guarantee the write was at least attempted
 * within the request's async lifetime.
 */
async function persistWizardSession(
  payload: PayloadLike | null,
  key: string,
  state: WizardState,
): Promise<void> {
  const pool = payload?.db?.pool
  if (!pool) return
  try {
    await pool.query(
      `INSERT INTO wizard_sessions (session_key, state, started_at, updated_at)
       VALUES ($1, $2::jsonb, to_timestamp($3::bigint / 1000.0), NOW())
       ON CONFLICT (session_key) DO UPDATE
         SET state = EXCLUDED.state, updated_at = NOW()`,
      [key, JSON.stringify(state), state.startedAt],
    )
  } catch (err) {
    console.warn('[persistWizardSession D-166] DB upsert failed:', err instanceof Error ? err.message : err)
  }
}

/**
 * D-158 / D-166: Delete a wizard session from the DB.
 * Now awaitable via clearWizardSession for the same reason as persist above.
 */
async function deleteWizardSession(payload: PayloadLike | null, key: string): Promise<void> {
  const pool = payload?.db?.pool
  if (!pool) return
  try {
    await pool.query(`DELETE FROM wizard_sessions WHERE session_key = $1`, [key])
  } catch (err) {
    console.warn('[deleteWizardSession D-166] DB delete failed:', err instanceof Error ? err.message : err)
  }
}

// D-158: module-level payload ref set by route.ts once per request so the
// sync setWizardSession/clearWizardSession can fire their background DB
// writes without threading payload through all 50+ call sites.
let currentPayloadRef: PayloadLike | null = null

/**
 * D-158: Called once per Telegram request from route.ts so the sync
 * setWizardSession/clearWizardSession helpers can reach the Payload db
 * pool for background persistence. Safe to call repeatedly.
 */
export function bindWizardPayload(payload: PayloadLike | null): void {
  currentPayloadRef = payload
}

export function getWizardSession(chatId: number, userId?: number): WizardState | null {
  const key = sessionKey(chatId, userId)
  const session = wizardSessions.get(key)
  if (!session) return null

  // Auto-expire stale sessions
  if (Date.now() - session.startedAt > WIZARD_TIMEOUT_MS) {
    wizardSessions.delete(key)
    // D-166: fire-and-forget OK here — getWizardSession is sync by design and
    // a missed delete on a stale row will self-clean on next hydrate (which
    // filters started_at > NOW() - 30 minutes).
    void deleteWizardSession(currentPayloadRef, key)
    return null
  }

  return session
}

/**
 * D-166: Awaitable. Callers in route.ts must `await` this so the DB upsert
 * is guaranteed to complete before the Lambda returns — otherwise the next
 * request on a cold instance hydrates an empty session and silently drops
 * wizard text input.
 */
export async function setWizardSession(
  chatId: number,
  state: WizardState,
  userId?: number,
): Promise<void> {
  const key = sessionKey(chatId, userId)
  wizardSessions.set(key, state)
  await persistWizardSession(currentPayloadRef, key, state)
}

/**
 * D-166: Awaitable for the same reason as setWizardSession above.
 */
export async function clearWizardSession(
  chatId: number,
  userId?: number,
): Promise<void> {
  const key = sessionKey(chatId, userId)
  wizardSessions.delete(key)
  await deleteWizardSession(currentPayloadRef, key)
}

// ── Field checks ──────────────────────────────────────────────────────

export function checkConfirmationFields(product: ConfirmableProduct): ConfirmationResult {
  const checks: FieldCheck[] = []

  // Already confirmed?
  const alreadyConfirmed = product.workflow?.confirmationStatus === 'confirmed'

  // Required: category
  const hasCat = !!product.category
  checks.push({
    field: 'category',
    label: 'Kategori',
    present: hasCat,
    value: hasCat ? product.category! : undefined,
    required: true,
  })

  // Required: price > 0
  const hasPrice = typeof product.price === 'number' && product.price > 0
  checks.push({
    field: 'price',
    label: 'Fiyat',
    present: hasPrice,
    value: hasPrice ? `₺${product.price}` : undefined,
    required: true,
  })

  // Required: sizes (variants with stock)
  const variants = product.variants ?? []
  const validVariants = variants.filter(
    (v) => v.size && typeof v.stock === 'number' && v.stock > 0,
  )
  const hasSizes = validVariants.length > 0
  checks.push({
    field: 'sizes',
    label: 'Bedenler',
    present: hasSizes,
    value: hasSizes
      ? validVariants.map((v) => `${v.size}(${v.stock})`).join(', ')
      : undefined,
    required: true,
  })

  // Required: stock (either via variants or stockQuantity)
  const hasStock =
    hasSizes || (typeof product.stockQuantity === 'number' && product.stockQuantity > 0)
  checks.push({
    field: 'stock',
    label: 'Stok',
    present: hasStock,
    value: hasStock
      ? hasSizes
        ? `${validVariants.reduce((s, v) => s + (v.stock ?? 0), 0)} adet (varyantlarda)`
        : `${product.stockQuantity} adet`
      : undefined,
    required: true,
  })

  // Required: channelTargets (at least one)
  const targets = product.channelTargets ?? []
  const hasTargets = targets.length > 0
  checks.push({
    field: 'targets',
    label: 'Yayın Hedefleri',
    present: hasTargets,
    value: hasTargets ? targets.join(', ') : undefined,
    required: true,
  })

  // Optional: brand
  checks.push({
    field: 'brand',
    label: 'Marka',
    present: !!product.brand,
    value: product.brand ? `ID:${product.brand}` : undefined,
    required: false,
  })

  // Optional: productType
  checks.push({
    field: 'productType',
    label: 'Ürün Tipi',
    present: !!product.productType,
    value: product.productType ?? undefined,
    required: false,
  })

  // Visual readiness
  const hasOriginalImages = (product.images?.length ?? 0) > 0
  const hasGenImages = (product.generativeGallery?.length ?? 0) > 0
  const visualReady = hasOriginalImages || hasGenImages

  const required = checks.filter((c) => c.required)
  const optional = checks.filter((c) => !c.required)
  const missing = required.filter((c) => !c.present)
  const present = required.filter((c) => c.present)

  return {
    ready: missing.length === 0,
    missing,
    present,
    optional,
    visualReady,
    alreadyConfirmed,
  }
}

// ── Wizard step determination ─────────────────────────────────────────

/**
 * Given the current product state + what's been collected in the wizard,
 * determine which step to ask next.
 *
 * D-163: Reordered so the commerce-critical fields GeoBot needs
 * (category → productType → price → sizes → stock) are asked FIRST,
 * BEFORE title/stockCode/brand/targets. GeoBot only fires after the
 * whole wizard is confirmed (see applyConfirmation step 5), so the
 * order here controls the *operator experience*, not the data that
 * reaches GeoBot — but the new order matches the operator's intake
 * workflow: decide what the product IS before typing its label.
 */
export function getNextWizardStep(
  product: ConfirmableProduct,
  collected: WizardState['collected'],
): WizardStep {
  // 1. Category (button) — drives how the whole product is classified
  if (!product.category && !collected.category) return 'category'

  // 2. Product Type / style (button) — VF-5, e.g. classic / sneaker / bot
  if (!product.productType && !collected.productType) return 'productType'

  // 3. Price (text — only if missing from intake)
  const hasPrice = (typeof product.price === 'number' && product.price > 0) || collected.price
  if (!hasPrice) return 'price'

  // 4. Sizes (button multi-select)
  const hasVariants =
    (product.variants ?? []).filter((v) => v.size && (v.stock ?? 0) > 0).length > 0
  if (!hasVariants && !collected.sizes) return 'sizes'

  // 5. Stock per size (text — only if sizes were just collected)
  if (!hasVariants && collected.sizes && !collected.stockPerSize) return 'stock'

  // 6. Stock code (text) — Phase T1: ask if SKU is auto-generated TG-xxx.
  //    D-163: moved AFTER commerce fields so the operator types the label
  //    last, once they already know what the product is.
  const isAutoSku = !product.sku || /^TG-/i.test(product.sku ?? '')
  if (isAutoSku && !collected.stockCode) return 'stockCode'

  // 7. Title (text) — Phase T1: ask if still placeholder "Taslak Ürün ..."
  //    D-163: moved AFTER commerce fields for the same reason as stockCode.
  const isPlaceholderTitle = !product.title || /^Taslak Ürün\s/i.test(product.title)
  if (isPlaceholderTitle && !collected.title) return 'title'

  // 8. Brand (text) — VF-5
  if (!product.brand && !collected.brand) return 'brand'

  // 9. Channel targets (button multi-select)
  const hasTargets = (product.channelTargets ?? []).length > 0 || collected.channelTargets
  if (!hasTargets) return 'targets'

  return 'summary'
}

// ── Input parsing ─────────────────────────────────────────────────────

export function parsePrice(text: string): number | null {
  // Remove ₺, TL, spaces, commas
  const cleaned = text.replace(/[₺TLtl\s,]/g, '').trim()
  const num = Number(cleaned)
  return isNaN(num) || num <= 0 ? null : num
}

export function parseSizes(text: string): string[] | null {
  // Accept: "38,39,40,41,42" or "38-44" or "38 39 40 41 42"
  const trimmed = text.trim()

  // Range format: "38-44"
  const rangeMatch = trimmed.match(/^(\d{2})\s*[-–]\s*(\d{2})$/)
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1])
    const end = parseInt(rangeMatch[2])
    if (start >= 30 && end <= 50 && start < end) {
      const sizes: string[] = []
      for (let i = start; i <= end; i++) {
        sizes.push(String(i))
      }
      return sizes
    }
  }

  // Comma or space separated
  const parts = trimmed.split(/[,\s]+/).filter((p) => /^\d{2}$/.test(p.trim()))
  return parts.length > 0 ? parts : null
}

export function parseStockNumber(text: string): number | null {
  const num = parseInt(text.trim())
  return isNaN(num) || num < 0 ? null : num
}

export function parseChannelTargets(text: string): string[] | null {
  const validChannels = ['website', 'instagram', 'shopier', 'facebook', 'dolap', 'x', 'linkedin', 'threads']
  const parts = text
    .toLowerCase()
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter((p) => validChannels.includes(p))
  return parts.length > 0 ? parts : null
}

// ── Summary formatting ────────────────────────────────────────────────

export function formatConfirmationSummary(
  product: ConfirmableProduct,
  collected: WizardState['collected'],
): string {
  const title = collected.title ?? product.title ?? `Ürün #${product.id}`
  const stockCode = (collected.stockCode && collected.stockCode !== '_skip_')
    ? collected.stockCode
    : (product.sku ?? '—')
  const category = collected.category ?? product.category ?? '—'
  const price = collected.price ?? product.price
  const priceStr = price ? `₺${price}` : '—'

  // Sizes: from collected or existing variants
  let sizesStr = '—'
  if (collected.sizes) {
    const stock = collected.stockPerSize ?? 1
    sizesStr = collected.sizes
      .split(',')
      .map((s) => `${s}(${stock})`)
      .join(', ')
  } else {
    const variants = (product.variants ?? []).filter(
      (v) => v.size && (v.stock ?? 0) > 0,
    )
    if (variants.length > 0) {
      sizesStr = variants.map((v) => `${v.size}(${v.stock})`).join(', ')
    }
  }

  // Stock total
  let totalStock = 0
  if (collected.sizes && collected.stockPerSize) {
    totalStock = collected.sizes.split(',').length * collected.stockPerSize
  } else {
    const variants = (product.variants ?? []).filter((v) => (v.stock ?? 0) > 0)
    if (variants.length > 0) {
      totalStock = variants.reduce((s, v) => s + (v.stock ?? 0), 0)
    } else {
      totalStock = product.stockQuantity ?? 0
    }
  }

  // Targets
  const targets = collected.channelTargets ?? product.channelTargets ?? []
  const targetsStr = targets.length > 0 ? targets.join(', ') : '—'

  // Visual readiness
  const hasOriginal = (product.images?.length ?? 0) > 0
  const hasGen = (product.generativeGallery?.length ?? 0) > 0
  const visualStr = hasOriginal && hasGen
    ? '✅ Orijinal + AI Görseller'
    : hasOriginal
      ? '✅ Orijinal Görseller'
      : hasGen
        ? '✅ AI Görseller'
        : '⚠️ Görsel Yok'

  // Product type and brand — from collected or existing
  const productTypeStr = collected.productType ?? product.productType ?? '—'
  const brandStr = collected.brand ?? (product.brand ? `ID:${product.brand}` : '—')

  const lines = [
    `📋 <b>ÜRÜN ONAY ÖZETİ</b>`,
    ``,
    `<b>Ürün:</b> ${title} (ID: ${product.id})`,
    `<b>Stok Kodu:</b> ${stockCode}`,
    `<b>Kategori:</b> ${category}`,
    `<b>Ürün Tipi:</b> ${productTypeStr}`,
    `<b>Marka:</b> ${brandStr}`,
    `<b>Fiyat:</b> ${priceStr}`,
    `<b>Bedenler:</b> ${sizesStr}`,
    `<b>Toplam Stok:</b> ${totalStock} adet`,
    `<b>Yayın Hedefleri:</b> ${targetsStr}`,
    `<b>Görsel Durumu:</b> ${visualStr}`,
  ]

  lines.push(``)
  lines.push(`Onaylamak için aşağıdaki butonu kullanın.`)

  return lines.join('\n')
}

// ── Step prompt builders ──────────────────────────────────────────────

export function getTitlePrompt(currentTitle: string): string {
  return (
    `📝 <b>Ürün adını girin:</b>\n\n` +
    `Mevcut: <i>${currentTitle}</i>\n\n` +
    `Gerçek ürün adını yazın.\n` +
    `Örnek: <code>Nike Air Max 90 Siyah Erkek Ayakkabı</code>`
  )
}

export function getStockCodePrompt(currentSku: string): string {
  return (
    `🏷️ <b>Stok kodunu girin:</b>\n\n` +
    `Mevcut (otomatik): <code>${currentSku}</code>\n\n` +
    `Kendi stok/raf kodunuzu yazın.\n` +
    `Örnek: <code>NK-AM90-SYH</code>\n\n` +
    `Atlamak için <code>-</code> yazın.`
  )
}

export function getCategoryPrompt(): { text: string; keyboard: Array<Array<{ text: string; callback_data: string }>> } {
  return {
    text: '📁 <b>Kategori seçin:</b>',
    keyboard: [
      CATEGORY_OPTIONS.slice(0, 3).map((o) => ({ text: o.label, callback_data: `wz_cat:${o.value}` })),
      CATEGORY_OPTIONS.slice(3, 6).map((o) => ({ text: o.label, callback_data: `wz_cat:${o.value}` })),
      CATEGORY_OPTIONS.slice(6).map((o) => ({ text: o.label, callback_data: `wz_cat:${o.value}` })),
    ].filter((row) => row.length > 0),
  }
}

export function getProductTypePrompt(): { text: string; keyboard: Array<Array<{ text: string; callback_data: string }>> } {
  return {
    text: '👤 <b>Ürün tipi seçin:</b>',
    keyboard: [
      PRODUCT_TYPE_OPTIONS.map((o) => ({ text: o.label, callback_data: `wz_ptype:${o.value}` })),
    ],
  }
}

export function getPricePrompt(): string {
  return '💰 <b>Fiyat girin</b> (₺):\n\nÖrnek: <code>899</code> veya <code>1299.90</code>'
}

export function getSizesPrompt(): string {
  return (
    '👟 <b>Bedenleri girin:</b>\n\n' +
    'Aralık: <code>38-44</code>\n' +
    'Virgüllü: <code>38,39,40,41,42,43,44</code>\n' +
    'Boşluklu: <code>38 39 40 41 42</code>'
  )
}

export function getStockPrompt(sizes: string[]): string {
  return (
    `📦 <b>Her beden için stok adedi girin:</b>\n\n` +
    `Bedenler: ${sizes.join(', ')}\n` +
    `Tek sayı yazın, her bedene eşit uygulanır.\n\n` +
    `Örnek: <code>3</code> → her bedenden 3 adet`
  )
}

export function getBrandPrompt(): string {
  return '🏷️ <b>Marka adı girin:</b>\n\nÖrnek: <code>Nike</code>, <code>Adidas</code>, <code>Skechers</code>'
}

export function getTargetsPrompt(): { text: string; keyboard: Array<Array<{ text: string; callback_data: string }>> } {
  return {
    text: '📢 <b>Yayın hedeflerini seçin:</b>\n\nBirden fazla seçebilirsiniz. Bitince "Tamam" basın.',
    keyboard: [
      CHANNEL_OPTIONS.map((o) => ({ text: o.label, callback_data: `wz_tgt:${o.value}` })),
      [{ text: '✅ Hepsini Seç', callback_data: 'wz_tgt:all' }],
      [{ text: '➡️ Tamam', callback_data: 'wz_tgt:done' }],
    ],
  }
}

// ── Confirmation application ──────────────────────────────────────────

export interface ConfirmationApplyResult {
  success: boolean
  error?: string
  variantsCreated?: number
}

/**
 * Apply wizard-collected data to product, mark confirmed, emit BotEvent.
 * This is the final step — should be called only after operator confirms the summary.
 */
export async function applyConfirmation(
  payload: any, // PayloadInstance
  productId: number | string,
  collected: WizardState['collected'],
  existingProduct: ConfirmableProduct,
  req?: any,
): Promise<ConfirmationApplyResult> {
  try {
    // 1. Build product update
    const productUpdate: Record<string, unknown> = {
      workflow: {
        ...(existingProduct.workflow ?? {}),
        confirmationStatus: 'confirmed',
        productConfirmedAt: new Date().toISOString(),
        lastHandledByBot: 'uygunops',
      },
    }

    // Update workflowStatus only if it's in a pre-confirmation state
    const currentWfStatus = existingProduct.workflow?.workflowStatus
    const preConfirmStates = ['draft', 'visual_pending', 'visual_ready', 'confirmation_pending']
    if (!currentWfStatus || preConfirmStates.includes(currentWfStatus)) {
      ;(productUpdate.workflow as Record<string, unknown>).workflowStatus = 'confirmed'
    }

    // Title — Phase T1
    if (collected.title) {
      productUpdate.title = collected.title
    }

    // Stock code → SKU field — Phase T1 (skip sentinel '_skip_' = keep existing auto-SKU)
    if (collected.stockCode && collected.stockCode !== '_skip_') {
      productUpdate.sku = collected.stockCode
    }

    // Category
    if (collected.category) {
      productUpdate.category = collected.category
    }

    // Product Type — VF-5
    if (collected.productType) {
      productUpdate.productType = collected.productType
    }

    // Price
    if (collected.price) {
      productUpdate.price = collected.price
    }

    // Brand (text name) — VF-5: stored directly as brand field
    // Brand is a relationship field (ID), so we look up or create the brand.
    // For now, store as-is — the brand field accepts text in intake, so this is consistent.
    if (collected.brand) {
      // Try to find existing brand by name
      try {
        const { docs: brandDocs } = await payload.find({
          collection: 'brands',
          where: { name: { equals: collected.brand } },
          limit: 1,
          depth: 0,
        })
        if (brandDocs.length > 0) {
          productUpdate.brand = brandDocs[0].id
        } else {
          // Create new brand
          const newBrand = await payload.create({
            collection: 'brands',
            data: { name: collected.brand },
          })
          productUpdate.brand = newBrand.id
        }
      } catch (brandErr) {
        // Non-blocking — brand is optional, just log
        console.error(
          `[confirmationWizard] Brand lookup/create failed (non-blocking) — brand="${collected.brand}":`,
          brandErr instanceof Error ? brandErr.message : String(brandErr),
        )
      }
    }

    // Channel targets
    if (collected.channelTargets) {
      productUpdate.channelTargets = collected.channelTargets
    }

    // 2. Update product (with context flag to prevent hook re-trigger)
    const updateReq = req ? { ...req, context: { ...(req.context ?? {}), isDispatchUpdate: true } } : undefined
    await payload.update({
      collection: 'products',
      id: productId,
      data: productUpdate,
      ...(updateReq ? { req: updateReq } : {}),
    })

    // 3. Create variants if sizes were collected
    let variantsCreated = 0
    if (collected.sizes) {
      const sizes = collected.sizes.split(',')
      const stockPerSize = collected.stockPerSize ?? 1

      for (const size of sizes) {
        await payload.create({
          collection: 'variants',
          data: {
            product: productId,
            size: size.trim(),
            stock: stockPerSize,
          },
        })
        variantsCreated++
      }

      // Also update stockQuantity to total
      const totalStock = sizes.length * stockPerSize
      await payload.update({
        collection: 'products',
        id: productId,
        data: { stockQuantity: totalStock },
        ...(updateReq ? { req: updateReq } : {}),
      })
    }

    // 3b. Evaluate sellable via central stock reaction
    // Variant creation (operation='create') does not trigger the Variants afterChange hook
    // (which only reacts on 'update'), so sellable would stay at its default false.
    // Explicitly call reactToStockChange to set sellable + stockState correctly.
    if (variantsCreated > 0) {
      try {
        const { reactToStockChange } = await import('@/lib/stockReaction')
        const stockResult = await reactToStockChange(payload, productId, 'system', req)
        console.log(
          `[confirmationWizard] stockReaction after variant creation — product=${productId} ` +
            `reacted=${stockResult.reacted} sellable=${stockResult.transition?.newSellable ?? '—'} ` +
            `stockState=${stockResult.transition?.newState ?? '—'}`,
        )
      } catch (stockErr) {
        console.error(
          `[confirmationWizard] stockReaction failed (non-blocking) — product=${productId}: ` +
            (stockErr instanceof Error ? stockErr.message : String(stockErr)),
        )
      }
    }

    // 4. Emit BotEvent
    await payload.create({
      collection: 'bot-events',
      data: {
        eventType: 'product.confirmed',
        product: productId,
        sourceBot: 'uygunops',
        status: 'processed',
        payload: {
          fieldsCollected: Object.keys(collected).filter(
            (k) => collected[k as keyof typeof collected] !== undefined,
          ),
          variantsCreated,
          confirmedAt: new Date().toISOString(),
          previousWorkflowStatus: currentWfStatus ?? 'unknown',
        },
        notes: `Product ${productId} confirmed via Telegram wizard. Fields: ${Object.keys(collected)
          .filter((k) => collected[k as keyof typeof collected] !== undefined)
          .join(', ')}. Variants created: ${variantsCreated}.`,
        processedAt: new Date().toISOString(),
      },
    })

    // 5. Non-blocking: trigger Geobot content generation
    try {
      const { shouldAutoTriggerContent, triggerContentGeneration } = await import('@/lib/contentPack')
      // Re-fetch product to get updated state
      const updatedProduct = await payload.findByID({ collection: 'products', id: productId })
      if (shouldAutoTriggerContent(updatedProduct as any)) {
        const contentResult = await triggerContentGeneration(
          payload,
          updatedProduct as any,
          'auto_confirmation',
          req,
        )
        console.log(
          `[confirmationWizard] Content trigger — product=${productId} ` +
            `triggered=${contentResult.triggered} status=${contentResult.contentStatus}`,
        )
      }
    } catch (contentErr) {
      // Content trigger failure is non-blocking — log and continue
      console.error(
        `[confirmationWizard] Content trigger failed (non-blocking) — product=${productId}: ` +
          (contentErr instanceof Error ? contentErr.message : String(contentErr)),
      )
    }

    return { success: true, variantsCreated }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[confirmationWizard] applyConfirmation failed for product ${productId}:`, msg)
    return { success: false, error: msg }
  }
}
