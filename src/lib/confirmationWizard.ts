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
  | 'stock'        // D-171: now per-size stock via buttons (sizeStockMap)
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
    sizes?: string // e.g. "39,40,41,42,43"
    stockPerSize?: number // legacy: uniform stock per size
    sizeStockMap?: Record<string, number> // D-171: per-size stock { "39": 3, "40": 5 }
    brand?: string
    channelTargets?: string[]
  }
  /** Temporary set of selected sizes during inline keyboard multi-select */
  pendingSizes?: string[]
  /** Message ID of the size selection keyboard message (for editMessageText) */
  sizeMessageId?: number
  startedAt: number // Date.now()
  /** D-230: have we already attempted vision-based autofill for this session? */
  autofillAttempted?: boolean
  /** D-230: vision-detected suggestions per autofillable wizard step. Filled
   *  by tryAutofillFromVision at wizard init. High-confidence values are
   *  written directly into `collected`; low-confidence values stay here so
   *  the prompt builders can render a "PI önerisi: …" hint.
   *  Confidence 0-100 per field. */
  autofillPreview?: {
    category?: { value: string; confidence: number }
    productType?: { value: string; confidence: number }
    brand?: { value: string; confidence: number }
    rawBrand?: string  // just the brand name, no type/color, for summary display
  }
}

// ── Constants ─────────────────────────────────────────────────────────

// D-177: Active category options (removed Erkek Ayakkabı, Krampon)
export const CATEGORY_OPTIONS = [
  { label: '⚡ Spor', value: 'Spor' },
  { label: '👟 Günlük', value: 'Günlük' },
  { label: '✦ Klasik', value: 'Klasik' },
  { label: '🏔 Bot', value: 'Bot' },
  { label: '🩴 Terlik', value: 'Terlik' },
  { label: '👛 Cüzdan', value: 'Cüzdan' },
]

// D-171: Style/type options — shown ONLY when category = "Erkek Ayakkabı"
export const PRODUCT_TYPE_OPTIONS = [
  { label: '🚶 Daily', value: 'Daily' },
  { label: '👟 Sneaker', value: 'Sneaker' },
  { label: '👞 Classic', value: 'Classic' },
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

/** D-173: Per-instance flag so we only run CREATE TABLE IF NOT EXISTS once. */
let tableEnsured = false

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureWizardTable(pool: { query: (text: string, vals?: any[]) => Promise<{ rows: any[] }> }): Promise<void> {
  if (tableEnsured) return
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wizard_sessions (
        session_key TEXT PRIMARY KEY,
        state JSONB NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    tableEnsured = true
  } catch (tblErr) {
    console.warn('[ensureWizardTable D-173] auto-create failed:', tblErr instanceof Error ? tblErr.message : tblErr)
  }
}

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

  // D-173: ensure table exists before querying
  await ensureWizardTable(pool)

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
  // D-173: ensure table exists before writing
  await ensureWizardTable(pool)
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
  await ensureWizardTable(pool)
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
  // 1. Category (button) — ALWAYS ask, even if product has an old value.
  //    D-171b: Old products may have stale categories (e.g. 'Günlük') that don't
  //    match the new business options. Operator must explicitly choose every time.
  if (!collected.category) return 'category'

  // 2. Product Type / style (button) — ONLY for "Erkek Ayakkabı" category
  //    D-171: Cüzdan skips this step entirely
  //    D-171b: Always ask (ignore old productType values like Erkek/Kadın/Çocuk/Unisex)
  if (collected.category === 'Erkek Ayakkabı') {
    if (!collected.productType) return 'productType'
  }

  // 3. Price (text — only if missing from intake)
  const hasPrice = (typeof product.price === 'number' && product.price > 0) || collected.price
  if (!hasPrice) return 'price'

  // 4. Sizes (button multi-select 39–47)
  const hasVariants =
    (product.variants ?? []).filter((v) => v.size && (v.stock ?? 0) > 0).length > 0
  if (!hasVariants && !collected.sizes) return 'sizes'

  // 5. Stock per size (button-based per-size quantity)
  //    D-171: uses sizeStockMap for per-size quantities, falls back to legacy stockPerSize
  const hasStock = collected.sizeStockMap || collected.stockPerSize
  if (!hasVariants && collected.sizes && !hasStock) return 'stock'

  // 6. Stock code — auto from SN#### (never asked)

  // 7. Brand & Model (combined text step — D-178)
  //    Single prompt: operator writes "Nike Air Max 90" → brand=Nike, title=Nike Air Max 90
  //    Or just "Nike" → brand=Nike, title stays placeholder (auto-generated later by GeoBot)
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
  const validChannels = ['website', 'instagram', 'shopier', 'facebook', 'dolap', 'x', 'threads']
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
  // D-171: Show SN#### (auto-generated) alongside SKU
  const stockCode = (product as any).stockNumber ?? product.sku ?? '—'
  const category = collected.category ?? product.category ?? '—'
  const price = collected.price ?? product.price
  const priceStr = price ? `₺${price}` : '—'

  // Sizes: from collected or existing variants — D-171: per-size stock map
  let sizesStr = '—'
  let totalStock = 0
  if (collected.sizes) {
    const sizes = collected.sizes.split(',')
    if (collected.sizeStockMap) {
      sizesStr = sizes.map((s) => `${s}(${collected.sizeStockMap![s] ?? 1})`).join(', ')
      totalStock = sizes.reduce((sum, s) => sum + (collected.sizeStockMap![s] ?? 1), 0)
    } else {
      const stock = collected.stockPerSize ?? 1
      sizesStr = sizes.map((s) => `${s}(${stock})`).join(', ')
      totalStock = sizes.length * stock
    }
  } else {
    const variants = (product.variants ?? []).filter(
      (v) => v.size && (v.stock ?? 0) > 0,
    )
    if (variants.length > 0) {
      sizesStr = variants.map((v) => `${v.size}(${v.stock})`).join(', ')
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

export function getCategoryPrompt(
  suggestion?: { value: string; confidence: number },
): { text: string; keyboard: Array<Array<{ text: string; callback_data: string }>> } {
  // D-176: layout buttons in rows of 2 so they don't overflow on mobile
  const buttons = CATEGORY_OPTIONS.map((o) => ({ text: o.label, callback_data: `wz_cat:${o.value}` }))
  const rows: Array<Array<{ text: string; callback_data: string }>> = []
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2))
  }
  // D-230: if vision had a low-confidence suggestion, render it as a hint
  // so the operator can still pick the right button quickly.
  const hint = suggestion
    ? `\n\n🤖 <i>PI önerisi: <b>${suggestion.value}</b> (güven %${suggestion.confidence})</i>`
    : ''
  return {
    text: `📁 <b>Kategori seçin:</b>${hint}`,
    keyboard: rows,
  }
}

export function getProductTypePrompt(
  suggestion?: { value: string; confidence: number },
): { text: string; keyboard: Array<Array<{ text: string; callback_data: string }>> } {
  const hint = suggestion
    ? `\n\n🤖 <i>PI önerisi: <b>${suggestion.value}</b> (güven %${suggestion.confidence})</i>`
    : ''
  return {
    text: `👟 <b>Ayakkabı stili seçin:</b>${hint}`,
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

// D-178: Combined brand + model prompt (replaces separate title & brand steps)
// D-230: optional pre-filled suggestion when vision had partial confidence
export function getBrandPrompt(suggestion?: { value: string; confidence: number }): string {
  const base =
    '🏷️ <b>Marka ve model adını girin:</b>\n\n' +
    'Marka + varsa model/renk/detay yazın.\n\n' +
    'Örnek: <code>Nike Air Max 90 Siyah</code>\n' +
    'Örnek: <code>Adidas Superstar Beyaz</code>\n' +
    'Örnek: <code>Skechers</code> (sadece marka)'
  if (!suggestion) return base
  return (
    base +
    '\n\n🤖 <i>PI önerisi: <code>' +
    suggestion.value +
    `</code> (güven %${suggestion.confidence})</i>\n` +
    'Kabul etmek için <code>tamam</code> yazın, veya kendi yanıtınızı girin.'
  )
}

// ── D-230: PI vision autofill ─────────────────────────────────────────
//
// Fast multi-field Gemini vision call that runs ONCE at wizard
// initialization. Detects category + productType + brand+model+color
// from the product's primary image.
//
// HIGH confidence (>= 70 per field): write directly into collected,
//   wizard skips the corresponding prompt entirely.
// LOW-MED confidence (40-69): leave collected empty but stash a
//   suggestion in session.autofillPreview, so the prompt builder
//   renders a "PI önerisi: …" hint and the operator can confirm or
//   override quickly.
// VERY LOW (<40) or missing: no hint, prompt as today.
//
// Token budget kept tight (~3072) — we only need a 4-field JSON.
// Confidence gate applied in JS so prompt-engineering is consistent.

const HIGH_CONFIDENCE_AUTOFILL = 70
const LOW_CONFIDENCE_HINT = 40

export interface WizardAutofillResult {
  ok: boolean
  category?: { value: string; confidence: number }
  productType?: { value: string; confidence: number }
  brand?: { value: string; confidence: number }
  rawBrand?: string
  rawColor?: string
  reason?: string
}

async function fetchImageInline(
  imageUrl: string,
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength > 8_000_000) return null
    const mimeType = res.headers.get('content-type')?.split(';')[0].trim() || 'image/jpeg'
    return { data: buf.toString('base64'), mimeType }
  } catch {
    return null
  }
}

function absolutizeMediaUrl(url: string | null): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  const base =
    process.env.NEXT_PUBLIC_SERVER_URL?.trim().replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim().replace(/\/$/, '')}` : '')
  if (!base) return url
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`
}

async function getProductPrimaryImage(
  payload: any,
  productId: string | number,
): Promise<string | null> {
  try {
    const product: any = await payload.findByID({
      collection: 'products',
      id: productId,
      depth: 2,
    })
    const imgs: any[] = Array.isArray(product?.images) ? product.images : []
    const pickUrl = (m: any): string | null => {
      if (!m) return null
      if (typeof m === 'string') return m
      return m?.sizes?.large?.url || m?.sizes?.card?.url || m?.url || null
    }
    // Prefer first non-generated original.
    for (const item of imgs) {
      const isOriginal =
        typeof item === 'object' && item ? (item as any).type !== 'generated' : true
      if (isOriginal) {
        const u = pickUrl(item)
        if (u) return absolutizeMediaUrl(u)
      }
    }
    for (const item of imgs) {
      const u = pickUrl(item)
      if (u) return absolutizeMediaUrl(u)
    }
    return null
  } catch {
    return null
  }
}

/**
 * D-230: Fast multi-field vision call. Returns category + productType +
 * brand+model+color, each with its own confidence. Fail-soft.
 */
export async function tryAutofillFromVision(
  payload: any,
  productId: string | number,
): Promise<WizardAutofillResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { ok: false, reason: 'no_gemini_key' }
  if ((process.env.WIZARD_BRAND_AUTOFILL ?? 'true').toLowerCase() === 'false') {
    return { ok: false, reason: 'disabled_by_flag' }
  }

  const imageUrl = await getProductPrimaryImage(payload, productId)
  if (!imageUrl) return { ok: false, reason: 'no_image' }

  const inlineData = await fetchImageInline(imageUrl)
  if (!inlineData) return { ok: false, reason: 'image_fetch_failed' }

  const validCategories = CATEGORY_OPTIONS.map((o) => o.value)
  const validProductTypes = PRODUCT_TYPE_OPTIONS.map((o) => o.value)

  const prompt =
    'Bu ürün görseline bak. Aşağıdaki 4 alanı çıkar. SADECE JSON döndür, başka metin yazma.\n\n' +
    'KURALLAR:\n' +
    '- Marka SADECE görselde logo/yazı olarak görünüyorsa belirt; tahmin etme. Yoksa boş bırak.\n' +
    `- Kategori MUTLAKA şu listeden birini seç: ${validCategories.join(', ')}.\n` +
    '  Eşleşen yoksa "Günlük" seç ve confidence düşür.\n' +
    `- ProductType (sadece Erkek Ayakkabı için anlamlı): ${validProductTypes.join(', ')}.\n` +
    '  Bu üründe kadın/çocuk/cüzdan/bot/terlik varsa boş bırak.\n' +
    '- BrandLine: marka + ürün tipi + ana renk birleşimi (Türkçe). Marka yoksa boş bırak.\n' +
    '  Örnek: "Nike Air Max 90 Siyah", "Adidas Superstar Beyaz", "Skechers SC Beyaz".\n' +
    '- Her alan için 0-100 arası ayrı confidence.\n\n' +
    'JSON ŞEMASI:\n' +
    '{\n' +
    '  "category": string,\n' +
    '  "categoryConfidence": number,\n' +
    '  "productType": string,\n' +
    '  "productTypeConfidence": number,\n' +
    '  "brandLine": string,\n' +
    '  "brandLineConfidence": number,\n' +
    '  "rawBrand": string,\n' +
    '  "rawColor": string\n' +
    '}'

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          // 4 short fields × ~100 chars + thinking-token overhead.
          // See feedback_gemini_token_budget.md.
          maxOutputTokens: 3072,
        },
      }),
    })
    if (!res.ok) return { ok: false, reason: `gemini_http_${res.status}` }
    const data: any = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { ok: false, reason: 'gemini_empty' }

    let parsed: any = null
    try {
      parsed = JSON.parse(text)
    } catch {
      const m = text.match(/\{[\s\S]*\}/)
      if (m) {
        try {
          parsed = JSON.parse(m[0])
        } catch {
          /* fall through */
        }
      }
    }
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, reason: 'gemini_non_json' }
    }

    const norm = (v: unknown): string => {
      if (typeof v !== 'string') return ''
      const t = v.trim()
      if (!t) return ''
      if (/^(none|unknown|yok|bilinmiyor|tespit edilemedi|n\/a|null)$/i.test(t)) return ''
      return t
    }
    const numConf = (v: unknown): number => {
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0
    }

    const catRaw = norm(parsed.category)
    // Map vision's category to one of our valid options (case-insensitive
    // exact match). Anything else falls back to the closest valid value
    // or drops out entirely.
    const cat = validCategories.find((v) => v.toLowerCase() === catRaw.toLowerCase()) || ''
    const ptRaw = norm(parsed.productType)
    const pt = validProductTypes.find((v) => v.toLowerCase() === ptRaw.toLowerCase()) || ''

    return {
      ok: true,
      category: cat ? { value: cat, confidence: numConf(parsed.categoryConfidence) } : undefined,
      productType: pt
        ? { value: pt, confidence: numConf(parsed.productTypeConfidence) }
        : undefined,
      brand: (() => {
        const b = norm(parsed.brandLine)
        return b ? { value: b, confidence: numConf(parsed.brandLineConfidence) } : undefined
      })(),
      rawBrand: norm(parsed.rawBrand) || undefined,
      rawColor: norm(parsed.rawColor) || undefined,
    }
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'unknown_error',
    }
  }
}

/**
 * D-230: Apply vision autofill to a wizard session. Returns a structured
 * report so the caller can send a "🤖 PI Bot tespitleri" message
 * summarizing what was filled vs suggested.
 *
 * Side effects:
 *   - Writes session.autofillAttempted = true.
 *   - For each high-confidence detection, fills session.collected.X.
 *   - For each low-confidence detection, stashes session.autofillPreview.X
 *     (prompt builders render this as a hint).
 *
 * Idempotent: if autofillAttempted is already true, returns immediately.
 */
export async function applyVisionAutofillToSession(
  payload: any,
  product: ConfirmableProduct,
  session: WizardState,
): Promise<{
  filled: string[]    // field names written into collected at high confidence
  suggested: string[] // field names left as low-confidence hints
  result: WizardAutofillResult
}> {
  if (session.autofillAttempted) {
    return { filled: [], suggested: [], result: { ok: false, reason: 'already_attempted' } }
  }
  session.autofillAttempted = true

  const result = await tryAutofillFromVision(payload, product.id)
  if (!result.ok) {
    return { filled: [], suggested: [], result }
  }

  const filled: string[] = []
  const suggested: string[] = []
  const preview: NonNullable<WizardState['autofillPreview']> = {
    rawBrand: result.rawBrand,
  }

  // Category
  if (result.category && !session.collected.category && !product.category) {
    if (result.category.confidence >= HIGH_CONFIDENCE_AUTOFILL) {
      session.collected.category = result.category.value
      filled.push('category')
    } else if (result.category.confidence >= LOW_CONFIDENCE_HINT) {
      preview.category = result.category
      suggested.push('category')
    }
  }

  // ProductType (only matters if category=='Erkek Ayakkabı', but we still
  // record it — the wizard guard handles when to actually ask).
  if (
    result.productType &&
    !session.collected.productType &&
    !product.productType
  ) {
    if (result.productType.confidence >= HIGH_CONFIDENCE_AUTOFILL) {
      session.collected.productType = result.productType.value
      filled.push('productType')
    } else if (result.productType.confidence >= LOW_CONFIDENCE_HINT) {
      preview.productType = result.productType
      suggested.push('productType')
    }
  }

  // Brand+model+color
  if (result.brand && !session.collected.brand && !product.brand) {
    if (result.brand.confidence >= HIGH_CONFIDENCE_AUTOFILL) {
      session.collected.brand = result.brand.value
      // Mirror into title for downstream meta/copy.
      if (!session.collected.title) {
        session.collected.title = result.brand.value
      }
      filled.push('brand')
    } else if (result.brand.confidence >= LOW_CONFIDENCE_HINT) {
      preview.brand = result.brand
      suggested.push('brand')
    }
  }

  if (preview.category || preview.productType || preview.brand || preview.rawBrand) {
    session.autofillPreview = preview
  }

  return { filled, suggested, result }
}

/**
 * D-230: Build a human-readable Telegram message summarizing what
 * vision detected. Sent ONCE at wizard start so the operator can
 * see at a glance which steps were skipped vs which still need input.
 */
export function formatAutofillReport(
  filled: string[],
  suggested: string[],
  result: WizardAutofillResult,
): string {
  if (!result.ok) return ''
  const lines: string[] = ['🤖 <b>PI Bot Görsel Tespitleri</b>']
  const fmtField = (name: string): string => {
    if (name === 'category') return '📁 Kategori'
    if (name === 'productType') return '👟 Stil'
    if (name === 'brand') return '🏷️ Marka/Model'
    return name
  }
  if (filled.length > 0) {
    lines.push('')
    lines.push('<b>✅ Otomatik dolduruldu (yüksek güven):</b>')
    for (const f of filled) {
      const v =
        f === 'category'
          ? result.category?.value
          : f === 'productType'
            ? result.productType?.value
            : f === 'brand'
              ? result.brand?.value
              : ''
      const c =
        f === 'category'
          ? result.category?.confidence
          : f === 'productType'
            ? result.productType?.confidence
            : result.brand?.confidence
      lines.push(`  ${fmtField(f)}: <b>${v}</b> (güven %${c})`)
    }
  }
  if (suggested.length > 0) {
    lines.push('')
    lines.push('<b>⚠️ Düşük güven — onaylamanız gerekiyor:</b>')
    for (const f of suggested) {
      const v =
        f === 'category'
          ? result.category?.value
          : f === 'productType'
            ? result.productType?.value
            : f === 'brand'
              ? result.brand?.value
              : ''
      const c =
        f === 'category'
          ? result.category?.confidence
          : f === 'productType'
            ? result.productType?.confidence
            : result.brand?.confidence
      lines.push(`  ${fmtField(f)}: <i>${v}</i> (güven %${c})`)
    }
  }
  if (filled.length === 0 && suggested.length === 0) {
    lines.push('')
    lines.push('<i>Görselden güvenilir bilgi çıkarılamadı — manuel adımlar devam edecek.</i>')
  }
  lines.push('')
  lines.push('<i>Yanlışsa wizard sonunda Düzenle butonuyla değiştirebilirsiniz.</i>')
  return lines.join('\n')
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
    // D-228: Idempotency guard — if the operator double-tapped "Onayla",
    // Telegram replayed the callback, or two callbacks arrived in parallel
    // for the same wizard session, we used to run the ENTIRE pipeline twice:
    // two product.confirmed events, two triggerContentGeneration calls, two
    // GeoBot commerce+discovery Gemini calls, two audit runs. That also
    // caused the second run to sometimes null the first run's commerce pack
    // via a stale product.content snapshot (observed on product 304).
    //
    // Re-read the product's current confirmationStatus + productConfirmedAt
    // from the DB. If it was confirmed within the last 5 minutes, treat this
    // call as a duplicate and short-circuit. We return success so the
    // Telegram UI still shows a green check; the caller's `result.variantsCreated`
    // comes back zero so the confirmation message omits the variant note.
    //
    // 5-minute window is wide enough to cover Telegram webhook retries +
    // operator delayed re-taps, but narrow enough that a legitimate re-confirm
    // after a fix (via wz_edit) works naturally once they edit fields.
    try {
      const freshProduct: any = await payload.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
      })
      const wf = freshProduct?.workflow ?? {}
      if (wf.confirmationStatus === 'confirmed' && wf.productConfirmedAt) {
        const confirmedAtMs = new Date(wf.productConfirmedAt).getTime()
        const ageMs = Date.now() - confirmedAtMs
        if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 5 * 60_000) {
          console.log(
            `[confirmationWizard] applyConfirmation skipped — product=${productId} ` +
              `already confirmed ${Math.round(ageMs / 1000)}s ago (duplicate callback).`,
          )
          return { success: true, variantsCreated: 0 }
        }
      }
    } catch (idemErr) {
      // Best-effort — if the re-read fails, fall through to the normal path.
      console.warn(
        `[confirmationWizard] idempotency re-read failed (non-blocking) — product=${productId}:`,
        idemErr instanceof Error ? idemErr.message : String(idemErr),
      )
    }

    // D-172e: Ensure new category ENUM values exist in Postgres before updating.
    // Payload's push:true doesn't reliably ALTER TYPE for new enum values.
    // This is idempotent — IF NOT EXISTS prevents errors on subsequent calls.
    const pool = payload?.db?.pool
    if (pool && collected.category) {
      const enumValues = ['Erkek Ayakkabı', 'Spor', 'Günlük', 'Klasik', 'Bot', 'Krampon', 'Terlik', 'Cüzdan']
      for (const val of enumValues) {
        try {
          await pool.query(`ALTER TYPE enum_products_category ADD VALUE IF NOT EXISTS '${val}'`)
        } catch (enumErr: any) {
          // 42710 = duplicate_object (value already exists) — safe to ignore
          if (enumErr?.code !== '42710') {
            console.warn(`[confirmationWizard] ENUM alter failed for '${val}':`, enumErr?.message)
          }
        }
      }
    }

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

    // Brand (text field) — D-172: Products.brand is type:'text', not relationship.
    // Store the brand name directly; also upsert into brands collection for reference.
    if (collected.brand) {
      productUpdate.brand = collected.brand
      // Non-blocking: ensure brand exists in brands collection for future lookups
      try {
        const { docs: brandDocs } = await payload.find({
          collection: 'brands',
          where: { name: { equals: collected.brand } },
          limit: 1,
          depth: 0,
        })
        if (brandDocs.length === 0) {
          await payload.create({
            collection: 'brands',
            data: { name: collected.brand },
          })
        }
      } catch (brandErr) {
        console.error(
          `[confirmationWizard] Brand upsert failed (non-blocking) — brand="${collected.brand}":`,
          brandErr instanceof Error ? brandErr.message : String(brandErr),
        )
      }
    }

    // Channel targets — D-189: also sync the channels.publishX flags so that
    // evaluateChannelEligibility Gate 2 doesn't block channels that are in
    // channelTargets but have publishX=false from the initial product creation.
    if (collected.channelTargets) {
      productUpdate.channelTargets = collected.channelTargets
      const ct = collected.channelTargets as string[]
      productUpdate.channels = {
        publishWebsite:   ct.includes('website'),
        publishInstagram: ct.includes('instagram'),
        publishShopier:   ct.includes('shopier'),
        publishDolap:     ct.includes('dolap'),
        publishX:         ct.includes('x'),
        publishFacebook:  ct.includes('facebook'),
        publishThreads:   ct.includes('threads'),
      }
    }

    // 2. Update product (with context flag to prevent hook re-trigger)
    const updateReq = req ? { ...req, context: { ...(req.context ?? {}), isDispatchUpdate: true } } : undefined
    // D-172c: Log the exact payload being sent so we can diagnose failures.
    console.log(
      `[confirmationWizard] applyConfirmation update payload — product=${productId}:`,
      JSON.stringify(productUpdate, null, 2),
    )
    try {
      await payload.update({
        collection: 'products',
        id: productId,
        data: productUpdate,
        ...(updateReq ? { req: updateReq } : {}),
      })
    } catch (updateErr: any) {
      // Extract PG error details for clear diagnostics
      const pgCode = updateErr?.code ?? updateErr?.cause?.code ?? ''
      const pgDetail = updateErr?.detail ?? updateErr?.cause?.detail ?? ''
      const pgConstraint = updateErr?.constraint ?? updateErr?.cause?.constraint ?? ''
      const pgHint = updateErr?.hint ?? updateErr?.cause?.hint ?? ''
      console.error(
        `[confirmationWizard] Product update SQL error — product=${productId}`,
        `pgCode=${pgCode} constraint=${pgConstraint} detail=${pgDetail} hint=${pgHint}`,
      )
      throw new Error(
        `Ürün güncelleme hatası: ${pgCode ? `[${pgCode}]` : ''} ` +
        `${pgConstraint ? `constraint=${pgConstraint}` : ''} ` +
        `${pgDetail || pgHint || updateErr?.message?.slice(-200) || 'bilinmeyen hata'}`,
      )
    }

    // 3. Create variants if sizes were collected
    let variantsCreated = 0
    let totalStock = 0
    // D-219: capture created variant IDs so we can link them to products.variants
    // (forward-ref relationship). Without this, buildShopierVariants() reads an
    // empty array and Shopier UPDATE is sent without size options. Verified root
    // cause of product 297's missing size selector on 2026-04-21.
    const createdVariantIds: Array<number | string> = []
    if (collected.sizes) {
      const sizes = collected.sizes.split(',')

      for (const size of sizes) {
        const trimmedSize = size.trim()
        // D-171: prefer per-size stock map, fall back to uniform stockPerSize
        const stock = collected.sizeStockMap?.[trimmedSize] ?? collected.stockPerSize ?? 1
        const created = await payload.create({
          collection: 'variants',
          data: {
            product: productId,
            size: trimmedSize,
            stock,
          },
        })
        createdVariantIds.push((created as { id: number | string }).id)
        totalStock += stock
        variantsCreated++
      }

      // Also update stockQuantity to total AND link the new variant IDs to the
      // product's forward-ref relationship array. buildShopierVariants() reads
      // product.variants (not the back-ref on variants.product), so we must
      // populate both sides explicitly.
      await payload.update({
        collection: 'products',
        id: productId,
        data: {
          stockQuantity: totalStock,
          variants: createdVariantIds,
        },
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
  } catch (err: any) {
    const fullMsg = err instanceof Error ? err.message : String(err)
    console.error(`[confirmationWizard] applyConfirmation failed for product ${productId}:`, fullMsg)
    // D-172c: Extract the actual PG error from the Drizzle error object.
    // node-postgres errors have .code, .detail, .constraint, .column.
    // Drizzle wraps them — check err, err.cause, and the message itself.
    const pgCode = err?.code ?? err?.cause?.code ?? ''
    const pgDetail = err?.detail ?? err?.cause?.detail ?? ''
    const pgConstraint = err?.constraint ?? err?.cause?.constraint ?? ''
    const pgColumn = err?.column ?? err?.cause?.column ?? ''
    // Also try to extract error after the SQL query (after last ') - ')
    const dashIdx = fullMsg.lastIndexOf(') - ')
    const afterSql = dashIdx > 0 ? fullMsg.slice(dashIdx + 4) : ''
    // Build a compact diagnostic message
    const parts: string[] = []
    if (pgCode) parts.push(`code=${pgCode}`)
    if (pgConstraint) parts.push(`constraint=${pgConstraint}`)
    if (pgColumn) parts.push(`column=${pgColumn}`)
    if (pgDetail) parts.push(`detail=${pgDetail}`)
    if (afterSql) parts.push(afterSql.slice(0, 300))
    const msg = parts.length > 0
      ? parts.join(' | ')
      : (fullMsg.length > 300 ? '…' + fullMsg.slice(-300) : fullMsg)
    return { success: false, error: msg }
  }
}
