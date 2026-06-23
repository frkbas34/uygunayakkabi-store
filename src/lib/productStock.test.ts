import assert from 'node:assert'
import { summarizeProductStock } from './productStock'

let passed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

check('product-level stock is sellable by default', () => {
  const stock = summarizeProductStock({
    stockQuantity: 4,
    workflow: { stockState: 'in_stock', sellable: true },
  })

  assert.strictEqual(stock.productLevelStock, 4)
  assert.strictEqual(stock.variantStock, null)
  assert.strictEqual(stock.effectiveStock, 4)
  assert.strictEqual(stock.hasSellableStock, true)
})

check('populated variant stock takes precedence over product-level stock', () => {
  const stock = summarizeProductStock({
    stockQuantity: 8,
    variants: [{ stock: 0 }, { stock: 2 }, 99],
    workflow: { stockState: 'in_stock', sellable: true },
  })

  assert.strictEqual(stock.productLevelStock, 8)
  assert.strictEqual(stock.variantStock, 2)
  assert.strictEqual(stock.effectiveStock, 2)
  assert.strictEqual(stock.hasVariantStockDetails, true)
  assert.strictEqual(stock.hasSellableStock, true)
})

check('unpopulated variant ids fall back to product-level stock', () => {
  const stock = summarizeProductStock({
    stockQuantity: 5,
    variants: [101, '102'],
    workflow: { stockState: 'in_stock', sellable: true },
  })

  assert.strictEqual(stock.variantStock, null)
  assert.strictEqual(stock.effectiveStock, 5)
  assert.strictEqual(stock.hasSellableStock, true)
})

check('sold_out state blocks positive stock', () => {
  const stock = summarizeProductStock({
    stockQuantity: 4,
    workflow: { stockState: 'sold_out', sellable: true },
  })

  assert.strictEqual(stock.effectiveStock, 4)
  assert.strictEqual(stock.hasPhysicalStock, true)
  assert.strictEqual(stock.hasSellableStock, false)
  assert.strictEqual(stock.detail, 'Product is sold out')
})

check('sellable=false blocks positive stock', () => {
  const stock = summarizeProductStock({
    stockQuantity: 4,
    workflow: { stockState: 'in_stock', sellable: false },
  })

  assert.strictEqual(stock.hasPhysicalStock, true)
  assert.strictEqual(stock.hasSellableStock, false)
  assert.strictEqual(stock.detail, 'Marked as not sellable')
})

check('missing stock is not sellable', () => {
  const stock = summarizeProductStock({
    stockQuantity: null,
    workflow: { stockState: 'in_stock', sellable: true },
  })

  assert.strictEqual(stock.effectiveStock, 0)
  assert.strictEqual(stock.hasPhysicalStock, false)
  assert.strictEqual(stock.hasSellableStock, false)
  assert.strictEqual(stock.detail, 'No stock available')
})

console.log(`\nproductStock: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
