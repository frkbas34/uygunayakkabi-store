import type { Payload, PayloadRequest } from 'payload'
import {
  decrementProductStockAtFloor,
  decrementVariantStockAtFloor,
} from '@/lib/orderStockReservation'

export interface ShopierOrderStockPayload {
  find(args: Record<string, unknown>): Promise<{ docs: Array<Record<string, unknown>> }>
  findByID(args: Record<string, unknown>): Promise<Record<string, unknown> | null>
  update(args: Record<string, unknown>): Promise<unknown>
  create(args: Record<string, unknown>): Promise<unknown>
}

export interface ShopierOrderItem {
  id?: string | number | null
  title?: string | null
  quantity?: string | number | null
  selectedOptions?: string | null
}

export interface ShopierStockSkippedItem {
  shopierProductId?: string
  localProductId?: string | number
  title?: string | null
  reason: string
}

export interface ShopierStockMutationResult {
  affectedProductIds: Array<string | number>
  mutatedItems: number
  skippedItems: ShopierStockSkippedItem[]
}

export interface ShopierStockMutationOptions {
  req?: Partial<PayloadRequest>
}

type ProductDoc = Record<string, unknown> & {
  id: string | number
  sku?: string | null
  stockQuantity?: number | null
}

type VariantDoc = Record<string, unknown> & {
  id: string | number
  size?: string | null
  stock?: number | null
}

function emptyResult(): ShopierStockMutationResult {
  return {
    affectedProductIds: [],
    mutatedItems: 0,
    skippedItems: [],
  }
}

function uniqueIds(ids: Array<string | number>): Array<string | number> {
  return [...new Set(ids)]
}

function asPositiveQuantity(value: unknown): number {
  const quantity = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1
}

export function normalizeShopierSelectedSize(value: unknown): string {
  if (value == null) return ''
  const raw = String(value).trim()
  if (!raw) return ''

  const labelled = raw.match(/(?:beden|size)\s*:?\s*([0-9]{2}(?:[.,][05])?)/i)
  if (labelled?.[1]) return labelled[1].replace(',', '.')

  const firstNumericSize = raw.match(/\b([0-9]{2}(?:[.,][05])?)\b/)
  if (firstNumericSize?.[1]) return firstNumericSize[1].replace(',', '.')

  return raw
}

async function findProductByShopierProductId(
  payload: ShopierOrderStockPayload,
  shopierProductId: string,
  options: ShopierStockMutationOptions,
): Promise<ProductDoc | null> {
  const productMatch = await payload.find({
    collection: 'products',
    where: { 'sourceMeta.shopierProductId': { equals: shopierProductId } },
    limit: 1,
    depth: 0,
    req: options.req,
  })
  return (productMatch.docs[0] as ProductDoc | undefined) ?? null
}

async function findVariantsForProduct(
  payload: ShopierOrderStockPayload,
  productId: string | number,
  options: ShopierStockMutationOptions,
): Promise<VariantDoc[]> {
  const { docs } = await payload.find({
    collection: 'variants',
    where: { product: { equals: productId } },
    limit: 200,
    depth: 0,
    req: options.req,
  })
  return docs as VariantDoc[]
}

function findVariantBySize(variants: VariantDoc[], size: string): VariantDoc | null {
  if (!size) return null
  const normalizedSize = normalizeShopierSelectedSize(size)
  return variants.find((variant) => normalizeShopierSelectedSize(variant.size) === normalizedSize) ?? null
}

function totalVariantStockAfterMutation(
  variants: VariantDoc[],
  mutatedVariantId: string | number,
  nextVariantStock: number,
): number {
  return variants.reduce((sum, variant) => {
    if (variant.id === mutatedVariantId) return sum + nextVariantStock
    return sum + ((variant.stock as number | null | undefined) ?? 0)
  }, 0)
}

async function writeInventoryLog(
  payload: ShopierOrderStockPayload,
  args: {
    sku: string
    size: string
    change: number
    reason: string
  },
  options: ShopierStockMutationOptions,
): Promise<void> {
  await payload.create({
    collection: 'inventory-logs',
    data: {
      sku: args.sku,
      size: args.size || 'N/A',
      change: args.change,
      reason: args.reason,
      source: 'shopier',
      timestamp: new Date().toISOString(),
    },
    req: options.req,
  })
}

async function decrementProductOrVariantStock(
  payload: ShopierOrderStockPayload,
  product: ProductDoc,
  item: ShopierOrderItem,
  shopierProductId: string,
  shopierOrderId: string,
  result: ShopierStockMutationResult,
  options: ShopierStockMutationOptions,
): Promise<void> {
  const quantity = asPositiveQuantity(item.quantity)
  const size = normalizeShopierSelectedSize(item.selectedOptions)
  const variants = await findVariantsForProduct(payload, product.id, options)
  const sku = product.sku ?? `shopier-${shopierProductId}`

  if (variants.length > 0) {
    const variant = findVariantBySize(variants, size)
    if (!variant) {
      result.skippedItems.push({
        shopierProductId,
        localProductId: product.id,
        title: item.title ?? null,
        reason: size ? `No local variant for size ${size}` : 'Shopier item has no size for variant stock',
      })
      return
    }

    const productUpdated = await decrementProductStockAtFloor(
      payload as unknown as Payload,
      product.id,
      quantity,
      options.req,
    )
    const variantUpdated = await decrementVariantStockAtFloor(
      payload as unknown as Payload,
      variant.id,
      quantity,
      options.req,
    )
    if (!productUpdated || !variantUpdated) {
      throw new Error(`Cannot reconcile Shopier stock: local product or variant disappeared during order ${shopierOrderId}.`)
    }
    await writeInventoryLog(payload, {
      sku,
      size,
      change: -quantity,
      reason: `Shopier order: ${shopierOrderId}`,
    }, options)
    result.affectedProductIds.push(product.id)
    result.mutatedItems++
    return
  }

  const productUpdated = await decrementProductStockAtFloor(
    payload as unknown as Payload,
    product.id,
    quantity,
    options.req,
  )
  if (!productUpdated) {
    throw new Error(`Cannot reconcile Shopier stock: local product ${product.id} disappeared during order ${shopierOrderId}.`)
  }
  await writeInventoryLog(payload, {
    sku,
    size: size || 'N/A',
    change: -quantity,
    reason: `Shopier order: ${shopierOrderId}`,
  }, options)
  result.affectedProductIds.push(product.id)
  result.mutatedItems++
}

export async function decrementStockForShopierOrder(
  payload: ShopierOrderStockPayload,
  items: ShopierOrderItem[],
  shopierOrderId: string,
  options: ShopierStockMutationOptions = {},
): Promise<ShopierStockMutationResult> {
  const result = emptyResult()

  for (const item of items) {
    const shopierProductId = item.id == null ? '' : String(item.id)
    if (!shopierProductId) {
      result.skippedItems.push({
        title: item.title ?? null,
        reason: 'Shopier item has no product id',
      })
      continue
    }

    const product = await findProductByShopierProductId(payload, shopierProductId, options)
    if (!product) {
      result.skippedItems.push({
        shopierProductId,
        title: item.title ?? null,
        reason: 'No local product matched sourceMeta.shopierProductId',
      })
      continue
    }

    await decrementProductOrVariantStock(payload, product, item, shopierProductId, shopierOrderId, result, options)
  }

  return {
    ...result,
    affectedProductIds: uniqueIds(result.affectedProductIds),
  }
}

export async function restoreStockForShopierRefund(
  payload: ShopierOrderStockPayload,
  order: Record<string, unknown>,
  refundId: string,
  shopierOrderId: string,
  options: ShopierStockMutationOptions = {},
): Promise<ShopierStockMutationResult> {
  const result = emptyResult()
  const productRef = order.product
  const productId = typeof productRef === 'object' && productRef !== null
    ? (productRef as Record<string, unknown>).id as string | number | undefined
    : productRef as string | number | undefined
  const quantity = asPositiveQuantity(order.quantity)
  const size = normalizeShopierSelectedSize(order.size)

  if (!productId) {
    result.skippedItems.push({ reason: 'Refund order has no local product' })
    return result
  }

  const product = await payload.findByID({
    collection: 'products',
    id: productId,
    depth: 0,
    req: options.req,
  }) as ProductDoc | null
  if (!product) {
    result.skippedItems.push({
      localProductId: productId,
      reason: 'Refund product no longer exists',
    })
    return result
  }

  const variants = await findVariantsForProduct(payload, productId, options)
  const sku = product.sku ?? `product-${productId}`

  if (variants.length > 0) {
    const variant = findVariantBySize(variants, size)
    if (!variant) {
      result.skippedItems.push({
        localProductId: productId,
        reason: size ? `No local variant for refund size ${size}` : 'Refund order has no size for variant stock',
      })
      return result
    }

    const nextVariantStock = ((variant.stock as number | null | undefined) ?? 0) + quantity
    const nextProductStock = totalVariantStockAfterMutation(variants, variant.id, nextVariantStock)
    await payload.update({
      collection: 'variants',
      id: variant.id,
      data: { stock: nextVariantStock },
      context: { isDispatchUpdate: true },
      req: options.req,
    })
    await payload.update({
      collection: 'products',
      id: productId,
      data: { stockQuantity: nextProductStock },
      context: { isDispatchUpdate: true },
      req: options.req,
    })
  } else {
    await payload.update({
      collection: 'products',
      id: productId,
      data: { stockQuantity: (product.stockQuantity ?? 0) + quantity },
      context: { isDispatchUpdate: true },
      req: options.req,
    })
  }

  await writeInventoryLog(payload, {
    sku,
    size: size || 'N/A',
    change: quantity,
    reason: `Shopier refund: ${refundId} (order: ${shopierOrderId})`,
  }, options)
  result.affectedProductIds.push(productId)
  result.mutatedItems++

  return {
    ...result,
    affectedProductIds: uniqueIds(result.affectedProductIds),
  }
}
