/**
 * shopierApi.ts — Low-level Shopier REST API client
 *
 * Wraps fetch calls to https://api.shopier.com/v1/* with:
 *   - Bearer token auth from SHOPIER_PAT env var
 *   - Typed request/response helpers
 *   - Error handling + rate limit awareness
 *   - Timeout protection
 *
 * VERIFIED from developer.shopier.com (2026-03-23):
 *   Base URL: https://api.shopier.com/v1
 *   Auth: Authorization: Bearer {PAT}
 *   Rate limit: 200 req/min per user
 *   Content-Type: application/json
 */

// ── Types (verified from Shopier developer portal) ──────────────────────────

export type ShopierProductType = 'physical' | 'digital'
export type ShopierCurrency = 'TRY' | 'USD' | 'EUR'
export type ShopierStockStatus = 'inStock' | 'outOfStock'
export type ShopierShippingPayer = 'sellerPays' | 'buyerPays'

export interface ShopierMediaInput {
  url: string
  type: 'image'
  placement: number // 1–5
}

export interface ShopierPriceDataInput {
  currency: ShopierCurrency
  price: string // string per Shopier API
  shippingPrice?: string
}

export interface ShopierVariantInput {
  variationId: string
  /**
   * D-215: Shopier REST API requires `selectionId` to be an array on
   * POST/PUT product bodies, even though GET responses return a single
   * string per variant (see ShopierProductResponse.variants[].selectionId).
   * Previously typed as `string` — Shopier replied HTTP 400
   * `"variants[0].selectionId must be an array"` after D-213 started
   * resolving real selection IDs.
   */
  selectionId: string[]
  stockStatus: ShopierStockStatus
  stockQuantity: number
  primary?: boolean
  media?: ShopierMediaInput[]
  priceData?: ShopierPriceDataInput
}

export interface ShopierCategoryRef {
  categoryId: string
}

export interface ShopierOptionInput {
  title: string
  price: string
}

/** POST /v1/products request body — verified from developer.shopier.com */
export interface ShopierCreateProductBody {
  title: string // required
  description?: string
  type: ShopierProductType // required
  media: ShopierMediaInput[] // required, max 5
  priceData: ShopierPriceDataInput // required
  stockQuantity?: number
  shippingPayer: ShopierShippingPayer // required
  categories?: ShopierCategoryRef[]
  variants?: ShopierVariantInput[]
  options?: ShopierOptionInput[] // max 3
  singleOption?: boolean
  customListing?: boolean
  customNote?: string
  placementScore?: number // ≥ 1
  dispatchDuration?: number // 1–3
}

/** PUT /v1/products/{id} request body — all fields optional */
export type ShopierUpdateProductBody = Partial<ShopierCreateProductBody>

/** Response from GET/POST/PUT /v1/products */
export interface ShopierProductResponse {
  id: string
  title: string
  description?: string
  type: ShopierProductType
  dateCreated: string
  dateUpdated?: string
  url: string // e.g. https://www.shopier.com/696547
  media: Array<{
    id: string
    type: 'image'
    url: string
    placement: number
  }>
  priceData: {
    currency: ShopierCurrency
    price: string
    discount: boolean
    discountedPrice: string
    shippingPrice: string
  }
  stockStatus: ShopierStockStatus
  stockQuantity: number
  shippingPayer: ShopierShippingPayer
  categories: Array<{ id: string; title: string }>
  variants: Array<{
    variationId: string
    variationTitle: string
    selectionId: string
    selectionTitle: string
    stockStatus: ShopierStockStatus
    stockQuantity: number
    media?: Array<{ id: string; type: 'image'; url: string }>
    priceData?: { currency: ShopierCurrency; price: string }
    primary: boolean
  }>
  options: Array<{ id: string; title: string; price: string }>
  singleOption: boolean
  customListing: boolean
  customNote: string
  placementScore: number
  dispatchDuration: number
}

/** Category model */
export interface ShopierCategory {
  id: string
  title: string
  placement: number
}

/** Variation model */
export interface ShopierVariation {
  id: string
  title: string
  placement: number
}

/** Selection model */
export interface ShopierSelection {
  id: string
  title: string
  variationId: string
}

/** Webhook model */
export interface ShopierWebhook {
  id: string
  event: string
  url: string
  token?: string // only returned on initial create
}

/** API error shape */
export interface ShopierApiError {
  ok: false
  status: number
  statusText: string
  body: string
  retryAfter?: number // seconds, present on 429
}

export type ShopierResult<T> =
  | { ok: true; data: T }
  | ShopierApiError

// ── Client ──────────────────────────────────────────────────────────────────

const SHOPIER_BASE = 'https://api.shopier.com/v1'
const TIMEOUT_MS = 15_000

function getPAT(): string {
  const pat = process.env.SHOPIER_PAT
  if (!pat || pat.trim().length === 0) {
    throw new Error('[shopierApi] SHOPIER_PAT env var is not set')
  }
  return pat.trim()
}

/**
 * Generic fetch wrapper for Shopier API.
 * Handles auth, timeout, JSON parsing, and error normalization.
 */
async function shopierFetch<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<ShopierResult<T>> {
  const url = `${SHOPIER_BASE}${path}`
  const pat = getPAT()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/json',
  }
  if (body) {
    headers['Content-Type'] = 'application/json'
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const retryAfter = res.status === 429
        ? parseInt(res.headers.get('Retry-After') ?? '', 10) || undefined
        : undefined

      console.error(
        `[shopierApi] ${method} ${path} → HTTP ${res.status} ${res.statusText}` +
          (retryAfter ? ` (retry-after: ${retryAfter}s)` : '') +
          `\n  body: ${text.slice(0, 500)}`,
      )

      return {
        ok: false,
        status: res.status,
        statusText: res.statusText,
        body: text.slice(0, 500),
        retryAfter,
      }
    }

    // DELETE returns 204 No Content
    if (res.status === 204) {
      return { ok: true, data: {} as T }
    }

    const data = (await res.json()) as T
    return { ok: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[shopierApi] ${method} ${path} → threw: ${message}`)
    return {
      ok: false,
      status: 0,
      statusText: 'network_error',
      body: message,
    }
  }
}

// ── Product endpoints ───────────────────────────────────────────────────────

export async function listProducts(
  limit = 10,
  page = 1,
): Promise<ShopierResult<ShopierProductResponse[]>> {
  return shopierFetch<ShopierProductResponse[]>(
    'GET',
    `/products?limit=${limit}&page=${page}`,
  )
}

export async function getProduct(
  id: string,
): Promise<ShopierResult<ShopierProductResponse>> {
  return shopierFetch<ShopierProductResponse>('GET', `/products/${id}`)
}

export async function createProduct(
  body: ShopierCreateProductBody,
): Promise<ShopierResult<ShopierProductResponse>> {
  return shopierFetch<ShopierProductResponse>(
    'POST',
    '/products',
    body as unknown as Record<string, unknown>,
  )
}

export async function updateProduct(
  id: string,
  body: ShopierUpdateProductBody,
): Promise<ShopierResult<ShopierProductResponse>> {
  return shopierFetch<ShopierProductResponse>(
    'PUT',
    `/products/${id}`,
    body as unknown as Record<string, unknown>,
  )
}

export async function deleteProduct(
  id: string,
): Promise<ShopierResult<Record<string, never>>> {
  return shopierFetch<Record<string, never>>('DELETE', `/products/${id}`)
}

// ── Category endpoints ──────────────────────────────────────────────────────

export async function listCategories(
  limit = 50,
): Promise<ShopierResult<ShopierCategory[]>> {
  return shopierFetch<ShopierCategory[]>('GET', `/categories?limit=${limit}`)
}

export async function createCategory(
  title: string,
  placement?: number,
): Promise<ShopierResult<ShopierCategory>> {
  return shopierFetch<ShopierCategory>('POST', '/categories', {
    title,
    ...(placement ? { placement } : {}),
  })
}

// ── Variation endpoints ─────────────────────────────────────────────────────

export async function listVariations(): Promise<ShopierResult<ShopierVariation[]>> {
  return shopierFetch<ShopierVariation[]>('GET', '/variations')
}

export async function createVariation(
  title: string,
): Promise<ShopierResult<ShopierVariation>> {
  return shopierFetch<ShopierVariation>('POST', '/variations', { title })
}

// ── Selection endpoints ─────────────────────────────────────────────────────

export async function listSelections(
  limit = 50,
): Promise<ShopierResult<ShopierSelection[]>> {
  return shopierFetch<ShopierSelection[]>('GET', `/selections?limit=${limit}`)
}

export async function createSelection(
  variationId: string,
  title: string,
): Promise<ShopierResult<ShopierSelection>> {
  return shopierFetch<ShopierSelection>('POST', '/selections', {
    variationId,
    title,
  })
}

// ── Webhook endpoints ───────────────────────────────────────────────────────

export type ShopierWebhookEvent =
  | 'order.created'
  | 'order.addressUpdated'
  | 'order.fulfilled'
  | 'product.created'
  | 'product.updated'
  | 'refund.requested'
  | 'refund.updated'

export async function listWebhooks(): Promise<ShopierResult<ShopierWebhook[]>> {
  return shopierFetch<ShopierWebhook[]>('GET', '/webhooks')
}

export async function createWebhook(
  event: ShopierWebhookEvent,
  url: string,
): Promise<ShopierResult<ShopierWebhook>> {
  return shopierFetch<ShopierWebhook>('POST', '/webhooks', { event, url })
}

export async function deleteWebhook(
  id: string,
): Promise<ShopierResult<Record<string, never>>> {
  return shopierFetch<Record<string, never>>('DELETE', `/webhooks/${id}`)
}
