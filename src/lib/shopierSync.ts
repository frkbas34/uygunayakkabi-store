/**
 * shopierSync.ts — Shopier product sync orchestration service
 *
 * Responsibilities:
 *   - Map Payload products → Shopier product create/update bodies
 *   - Ensure categories, variations, and selections exist in Shopier
 *   - Publish (create/update) products to Shopier
 *   - Write back shopierProductId + shopierProductUrl to Payload
 *   - Notify Telegram on success/failure
 *
 * Design:
 *   - Pure orchestration — delegates API calls to shopierApi.ts
 *   - Never throws — returns structured results
 *   - Idempotent where possible (check before create)
 *   - PAT stays server-side only
 */

import * as api from './shopierApi'
import type {
  ShopierCreateProductBody,
  ShopierUpdateProductBody,
  ShopierCategory,
  ShopierVariation,
  ShopierSelection,
  ShopierMediaInput,
  ShopierVariantInput,
  ShopierProductResponse,
} from './shopierApi'

// ── Types ───────────────────────────────────────────────────────────────────

export interface ShopierSyncResult {
  success: boolean
  shopierProductId?: string
  shopierProductUrl?: string
  error?: string
  details?: Record<string, unknown>
}

export interface ShopierMappings {
  categories: Map<string, string> // localCategoryValue → shopierCategoryId
  variations: Map<string, string> // "Numara" | "Renk" → shopierVariationId
  selections: Map<string, string> // "Numara:40" | "Renk:Siyah" → shopierSelectionId
}

// ── In-memory cache for mappings (populated on first use per process) ───────

let _mappingsCache: ShopierMappings | null = null
let _mappingsCacheAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch and cache Shopier categories, variations, and selections.
 * Reuses cached values within TTL to avoid unnecessary API calls.
 */
export async function getShopierMappings(
  forceRefresh = false,
): Promise<ShopierMappings> {
  const now = Date.now()
  if (!forceRefresh && _mappingsCache && now - _mappingsCacheAt < CACHE_TTL_MS) {
    return _mappingsCache
  }

  const [catRes, varRes, selRes] = await Promise.all([
    api.listCategories(50),
    api.listVariations(),
    api.listSelections(50),
  ])

  const categories = new Map<string, string>()
  if (catRes.ok) {
    for (const c of catRes.data) {
      categories.set(c.title, c.id)
    }
  }

  const variations = new Map<string, string>()
  if (varRes.ok) {
    for (const v of varRes.data) {
      variations.set(v.title, v.id)
    }
  }

  const selections = new Map<string, string>()
  if (selRes.ok) {
    for (const s of selRes.data) {
      // Key format: "VariationTitle:SelectionTitle" — but we don't have variationTitle here.
      // Use "variationId:title" as key, and also store by title for convenience.
      selections.set(`${s.variationId}:${s.title}`, s.id)
      // Also store by just title for quick lookup when variationId is known
      selections.set(s.title, s.id)
    }
  }

  _mappingsCache = { categories, variations, selections }
  _mappingsCacheAt = now

  console.log(
    `[shopierSync] mappings loaded — categories=${categories.size} ` +
      `variations=${variations.size} selections=${selections.size}`,
  )

  return _mappingsCache
}

/**
 * Ensure a category exists in Shopier. Creates it if missing.
 * Returns the Shopier category ID.
 */
export async function ensureCategory(
  title: string,
): Promise<string | null> {
  const mappings = await getShopierMappings()

  const existing = mappings.categories.get(title)
  if (existing) return existing

  // Create new category
  const res = await api.createCategory(title)
  if (!res.ok) {
    console.error(`[shopierSync] ensureCategory failed for "${title}":`, res)
    return null
  }

  // Update cache
  mappings.categories.set(res.data.title, res.data.id)
  console.log(`[shopierSync] created category "${title}" → ${res.data.id}`)
  return res.data.id
}

/**
 * D-208: Ensure a variation exists in Shopier (e.g. "Numara"/"Renk").
 * Auto-creates if missing so variants never get silently dropped.
 */
export async function ensureVariation(
  title: string,
): Promise<string | null> {
  const mappings = await getShopierMappings()
  const existing = mappings.variations.get(title)
  if (existing) return existing

  const res = await api.createVariation(title)
  if (!res.ok) {
    console.error(`[shopierSync] ensureVariation failed for "${title}":`, res)
    return null
  }

  mappings.variations.set(res.data.title, res.data.id)
  console.log(`[shopierSync] created variation "${title}" → ${res.data.id}`)
  return res.data.id
}

/**
 * Ensure a selection exists for a given variation.
 * Returns the Shopier selection ID.
 */
export async function ensureSelection(
  variationId: string,
  title: string,
): Promise<string | null> {
  const mappings = await getShopierMappings()

  const key = `${variationId}:${title}`
  const existing = mappings.selections.get(key)
  if (existing) return existing

  // Create new selection
  const res = await api.createSelection(variationId, title)
  if (!res.ok) {
    console.error(`[shopierSync] ensureSelection failed for "${title}":`, res)
    return null
  }

  mappings.selections.set(key, res.data.id)
  mappings.selections.set(title, res.data.id)
  console.log(`[shopierSync] created selection "${title}" → ${res.data.id}`)
  return res.data.id
}

// ── Product Sync ────────────────────────────────────────────────────────────

/**
 * Extract media URLs from a Payload product and map to Shopier media input.
 * Shopier accepts external image URLs in the media array (max 5).
 *
 * D-200: Uses ONLY AI-generated images from generativeGallery.
 * Original Telegram photos (product.images) are NOT sent to Shopier.
 * If no AI images exist, returns empty array — sync will be skipped.
 */
function buildShopierMedia(product: Record<string, unknown>): ShopierMediaInput[] {
  // D-200: Use ONLY AI-generated images from generativeGallery
  const aiImages = product.generativeGallery as
    | Array<{ image?: { url?: string; filename?: string } }>
    | undefined

  if (!Array.isArray(aiImages) || aiImages.length === 0) {
    console.warn(
      `[shopierSync] product ${product.id} has no AI images in generativeGallery — skipping media`,
    )
    return []
  }

  const serverUrl = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace(/\/$/, '')

  return aiImages
    .slice(0, 5) // Shopier max 5 media files
    .map((img, i) => {
      const media = img?.image
      if (!media) return null

      let url: string | null = null
      if (media.url && media.url.startsWith('http')) {
        url = media.url
      } else if (media.url && serverUrl) {
        url = `${serverUrl}${media.url}`
      } else if (media.filename && serverUrl) {
        url = `${serverUrl}/media/${media.filename}`
      }

      if (!url) return null

      return {
        url,
        type: 'image' as const,
        placement: (i + 1) as number, // 1-based
      }
    })
    .filter((m): m is ShopierMediaInput => m !== null)
}

/**
 * Build Shopier variant entries from Payload product's Variants relationship.
 * Requires "Numara" variation to exist in Shopier.
 */
async function buildShopierVariants(
  product: Record<string, unknown>,
): Promise<ShopierVariantInput[]> {
  // D-208: Auto-create "Numara" variation if missing instead of silently dropping variants
  const numaraVarId = await ensureVariation('Numara')

  if (!numaraVarId) {
    // D-208b: loud error — most likely cause is Shopier PAT lacks variation-create scope.
    // Fix: manually create "Numara" variation in Shopier admin panel.
    console.error(
      '[shopierSync] ❌ "Numara" variation missing on Shopier AND auto-create failed. ' +
      'Manually create "Numara" variation in Shopier admin panel, then re-sync.',
    )
    return []
  }

  // Payload variants are a relationship array; they may be populated objects or just IDs
  const variants = product.variants as
    | Array<{ size?: string; stock?: number; color?: string } | string | number>
    | undefined

  if (!Array.isArray(variants) || variants.length === 0) return []

  const shopierVariants: ShopierVariantInput[] = []

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i]
    // Skip if it's just an ID (not populated)
    if (typeof v === 'string' || typeof v === 'number') continue

    const size = v.size
    if (!size) continue

    const selectionId = await ensureSelection(numaraVarId, size)
    if (!selectionId) continue

    shopierVariants.push({
      variationId: numaraVarId,
      // D-215: Shopier PUT/POST expects selectionId as an array even though
      // individual variants each pick exactly one selection.
      selectionId: [selectionId],
      stockStatus: (v.stock ?? 0) > 0 ? 'inStock' : 'outOfStock',
      stockQuantity: v.stock ?? 0,
      primary: i === 0, // first variant is primary
    })
  }

  return shopierVariants
}

/**
 * Map a Payload product's local category to a Shopier category ID.
 */
async function resolveShopierCategories(
  product: Record<string, unknown>,
): Promise<Array<{ categoryId: string }>> {
  const localCategory = product.category as string | undefined
  const mappings = await getShopierMappings()

  // Try exact match first
  if (localCategory) {
    const catId = mappings.categories.get(localCategory)
    if (catId) return [{ categoryId: catId }]
  }

  // Fall back to first available Shopier category (store has one: Günlük)
  const firstCatId = [...mappings.categories.values()][0]
  if (firstCatId) {
    console.warn(`[shopierSync] category "${localCategory}" not matched, using first available: ${firstCatId}`)
    return [{ categoryId: firstCatId }]
  }

  // Last resort: ensure/create category by title
  if (localCategory) {
    const catId = await ensureCategory(localCategory)
    if (catId) return [{ categoryId: catId }]
  }

  return []
}

/**
 * Build the Shopier create/update body from a Payload product.
 */
async function buildShopierProductBody(
  product: Record<string, unknown>,
): Promise<ShopierCreateProductBody | null> {
  const title = product.title as string
  if (!title) {
    console.error('[shopierSync] product missing title')
    return null
  }

  const media = buildShopierMedia(product)
  if (media.length === 0) {
    console.error(`[shopierSync] product ${product.id} has no AI images in generativeGallery — cannot sync to Shopier`)
    return null
  }

  const price = product.price as number | undefined
  if (!price || price <= 0) {
    console.error(`[shopierSync] product ${product.id} has no valid price`)
    return null
  }

  const categories = await resolveShopierCategories(product)
  const variants = await buildShopierVariants(product)

  const body: ShopierCreateProductBody = {
    title,
    // Phase D: prefer Geobot shopierCopy → fallback to basic description → fallback to title
    description: (() => {
      const cp = (product.content as Record<string, unknown> | undefined)?.commercePack as Record<string, unknown> | undefined
      return (cp?.shopierCopy as string | undefined)
        || (product.description as string | undefined)
        || (title + ' — UygunAyakkabı')
    })(),
    type: 'physical',
    media,
    priceData: {
      currency: 'TRY',
      price: price.toFixed(2), // Shopier expects string
      shippingPrice: '0.00', // free shipping default
    },
    stockQuantity: (product.stockQuantity as number | undefined) ?? 1,
    shippingPayer: 'sellerPays', // UygunAyakkabı covers shipping
    categories,
    variants,
    dispatchDuration: 2, // 2 business days
  }

  return body
}

/**
 * Publish a Payload product to Shopier (create or update).
 *
 * Flow:
 *  1. Read product from Payload (caller provides product object)
 *  2. Check if shopierProductId already exists → update, else create
 *  3. Build Shopier body from Payload product
 *  4. Call Shopier API
 *  5. Return result with shopierProductId + shopierProductUrl
 */
export async function publishProductToShopier(
  product: Record<string, unknown>,
): Promise<ShopierSyncResult> {
  const productId = product.id as string | number

  try {
    // Check for existing Shopier product ID
    const sourceMeta = product.sourceMeta as Record<string, unknown> | undefined
    const existingShopierProductId = (sourceMeta?.shopierProductId as string | undefined)
      || (product as Record<string, unknown>).shopierProductId as string | undefined

    const body = await buildShopierProductBody(product)
    if (!body) {
      return {
        success: false,
        error: 'Failed to build Shopier product body — missing required fields (title, media, price)',
      }
    }

    let result: api.ShopierResult<ShopierProductResponse>

    if (existingShopierProductId) {
      // UPDATE existing Shopier product
      console.log(`[shopierSync] updating Shopier product ${existingShopierProductId} for Payload product ${productId}`)
      result = await api.updateProduct(existingShopierProductId, body as ShopierUpdateProductBody)
    } else {
      // CREATE new Shopier product
      console.log(`[shopierSync] creating new Shopier product for Payload product ${productId}`)
      result = await api.createProduct(body)
    }

    // D-208b: if UPDATE fails with 403/404 (Shopier product deleted manually), retry as CREATE
    if (!result.ok && existingShopierProductId && (result.status === 403 || result.status === 404)) {
      console.warn(
        `[shopierSync] UPDATE failed with ${result.status} for Shopier product ${existingShopierProductId} — likely deleted. Retrying as CREATE.`,
      )
      result = await api.createProduct(body)
    }

    if (!result.ok) {
      return {
        success: false,
        error: `Shopier API ${existingShopierProductId ? 'update' : 'create'} failed: HTTP ${result.status} — ${result.body}`,
        details: { status: result.status, body: result.body },
      }
    }

    console.log(
      `[shopierSync] ✅ product synced — Payload=${productId} Shopier=${result.data.id} url=${result.data.url}`,
    )

    return {
      success: true,
      shopierProductId: result.data.id,
      shopierProductUrl: result.data.url,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[shopierSync] publishProductToShopier threw:`, message)
    return {
      success: false,
      error: `Sync threw: ${message}`,
    }
  }
}

/**
 * Full sync flow: publish to Shopier + write back to Payload + notify Telegram.
 *
 * This is the main entry point called by:
 *   - Telegram /shopier publish command
 *   - channelDispatch publishShopierDirectly()
 *   - Payload afterChange hook (via jobs queue in future)
 */
export async function syncProductToShopier(
  productId: string | number,
  payload: { find: Function; update: Function },
  options?: { notifyTelegramChatId?: number },
): Promise<ShopierSyncResult> {
  try {
    // 1. Fetch product from Payload
    const { docs } = await payload.find({
      collection: 'products',
      where: { id: { equals: productId } },
      depth: 2, // populate images + variants
      limit: 1,
    })

    if (docs.length === 0) {
      return { success: false, error: `Product ${productId} not found` }
    }

    const product = docs[0] as Record<string, unknown>

    // 2. Mark as 'syncing' before the API call so the admin UI reflects in-progress state.
    //    Spread existing sourceMeta to preserve fields like shopierProductId that were
    //    written by a previous successful sync.
    const currentSourceMeta = (product.sourceMeta as Record<string, unknown> | undefined) ?? {}
    await payload.update({
      collection: 'products',
      id: productId,
      data: {
        sourceMeta: {
          ...currentSourceMeta,
          shopierSyncStatus: 'syncing',
        },
      },
      context: { isDispatchUpdate: true },
    })

    // 3. Publish to Shopier
    const result = await publishProductToShopier(product)

    // 4. Write back to Payload (status: synced or error)
    if (result.success && result.shopierProductId) {
      await payload.update({
        collection: 'products',
        id: productId,
        data: {
          sourceMeta: {
            ...currentSourceMeta,
            shopierProductId: result.shopierProductId,
            shopierProductUrl: result.shopierProductUrl,
            shopierLastSyncAt: new Date().toISOString(),
            shopierSyncStatus: 'synced',
            shopierLastError: null,
          },
        },
        // Prevent afterChange hook re-trigger
        context: { isDispatchUpdate: true },
      })
    } else {
      // Write error back
      await payload.update({
        collection: 'products',
        id: productId,
        data: {
          sourceMeta: {
            ...currentSourceMeta,
            shopierSyncStatus: 'error',
            shopierLastError: result.error ?? 'Unknown error',
            shopierLastSyncAt: new Date().toISOString(),
          },
        },
        context: { isDispatchUpdate: true },
      })
    }

    // 4. Notify Telegram if chat ID provided
    if (options?.notifyTelegramChatId) {
      const msg = result.success
        ? `✅ Shopier'e yayınlandı!\n\n📦 ${product.title}\n🔗 ${result.shopierProductUrl}\n🆔 Shopier ID: ${result.shopierProductId}`
        : `❌ Shopier sync başarısız\n\n📦 ${product.title}\n❗ ${result.error}`

      await sendTelegramNotification(options.notifyTelegramChatId, msg)
    }

    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[shopierSync] syncProductToShopier threw:`, message)
    return { success: false, error: `Sync threw: ${message}` }
  }
}

// ── Telegram notification helper ────────────────────────────────────────────

async function sendTelegramNotification(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(5_000),
    })
  } catch (err) {
    console.error('[shopierSync] Telegram notification failed:', err)
  }
}

export { sendTelegramNotification }
