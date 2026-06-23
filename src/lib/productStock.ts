export type ProductStockVariantInput =
  | { stock?: number | string | null }
  | number
  | string
  | null
  | undefined

export interface ProductStockInput {
  stockQuantity?: number | string | null
  variants?: ProductStockVariantInput[] | null
  workflow?: {
    stockState?: string | null
    sellable?: boolean | null
  } | null
}

export interface ProductStockSummary {
  productLevelStock: number | null
  variantStock: number | null
  hasVariantStockDetails: boolean
  effectiveStock: number
  stockState: string
  sellable: boolean | null | undefined
  hasPhysicalStock: boolean
  hasSellableStock: boolean
  detail: string
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeStock(value: number | null): number | null {
  if (value === null) return null
  return Math.max(0, value)
}

function summarizeVariantStock(variants: ProductStockVariantInput[] | null | undefined): {
  variantStock: number | null
  hasVariantStockDetails: boolean
} {
  if (!Array.isArray(variants)) {
    return { variantStock: null, hasVariantStockDetails: false }
  }

  const stocks: number[] = []
  for (const variant of variants) {
    if (!variant || typeof variant !== 'object' || Array.isArray(variant)) continue
    const stock = normalizeStock(toFiniteNumber(variant.stock))
    if (stock !== null) stocks.push(stock)
  }

  if (stocks.length === 0) {
    return { variantStock: null, hasVariantStockDetails: false }
  }

  return {
    variantStock: stocks.reduce((sum, stock) => sum + stock, 0),
    hasVariantStockDetails: true,
  }
}

export function summarizeProductStock(product: ProductStockInput): ProductStockSummary {
  const productLevelStock = normalizeStock(toFiniteNumber(product.stockQuantity))
  const { variantStock, hasVariantStockDetails } = summarizeVariantStock(product.variants)
  const effectiveStock = hasVariantStockDetails
    ? variantStock ?? 0
    : productLevelStock ?? 0
  const stockState = product.workflow?.stockState || 'in_stock'
  const sellable = product.workflow?.sellable
  const isSoldOut = stockState === 'sold_out'
  const hasPhysicalStock = effectiveStock > 0
  const hasSellableStock = hasPhysicalStock && !isSoldOut && sellable !== false

  let detail = ''
  if (isSoldOut) {
    detail = 'Product is sold out'
  } else if (sellable === false) {
    detail = 'Marked as not sellable'
  } else if (!hasPhysicalStock) {
    detail = 'No stock available'
  } else {
    detail = `${effectiveStock} unit(s)${hasVariantStockDetails ? ' from variants' : ''}`
  }

  return {
    productLevelStock,
    variantStock,
    hasVariantStockDetails,
    effectiveStock,
    stockState,
    sellable,
    hasPhysicalStock,
    hasSellableStock,
    detail,
  }
}
