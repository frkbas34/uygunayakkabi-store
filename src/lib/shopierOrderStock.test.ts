/**
 * shopierOrderStock.test.ts - Shopier order/refund stock reconciliation.
 *
 * These tests keep webhook stock behavior provable without calling Shopier,
 * Payload, jobs, providers, or the database.
 */
import assert from 'node:assert'
import type { PayloadRequest } from 'payload'
import {
  decrementStockForShopierOrder,
  normalizeShopierSelectedSize,
  restoreStockForShopierRefund,
  type ShopierOrderStockPayload,
} from './shopierOrderStock'

let passed = 0

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

interface FakeDb {
  products: Array<Record<string, unknown>>
  variants: Array<Record<string, unknown>>
  finds: Array<Record<string, unknown>>
  findByIds: Array<Record<string, unknown>>
  updates: Array<Record<string, unknown>>
  creates: Array<Record<string, unknown>>
  atomicExecutions: unknown[]
}

function fakePayload(seed: {
  products?: Array<Record<string, unknown>>
  variants?: Array<Record<string, unknown>>
} = {}): FakeDb & { payload: ShopierOrderStockPayload } {
  const db: FakeDb = {
    products: seed.products ?? [],
    variants: seed.variants ?? [],
    finds: [],
    findByIds: [],
    updates: [],
    creates: [],
    atomicExecutions: [],
  }

  const payload: ShopierOrderStockPayload & { db: Record<string, unknown> } = {
    async find(args) {
      db.finds.push(args)
      const collection = args.collection
      const where = args.where as Record<string, unknown> | undefined
      if (collection === 'products') {
        const shopierProductId = ((where?.['sourceMeta.shopierProductId'] as Record<string, unknown> | undefined)?.equals)
        return {
          docs: db.products.filter((product) =>
            String((product.sourceMeta as Record<string, unknown> | undefined)?.shopierProductId ?? '') ===
              String(shopierProductId ?? ''),
          ),
        }
      }
      if (collection === 'variants') {
        const productId = (where?.product as Record<string, unknown> | undefined)?.equals
        return {
          docs: db.variants.filter((variant) => String(variant.product) === String(productId)),
        }
      }
      return { docs: [] }
    },
    async findByID(args) {
      db.findByIds.push(args)
      const collection = args.collection
      const id = args.id
      if (collection === 'products') {
        return db.products.find((product) => String(product.id) === String(id)) ?? null
      }
      if (collection === 'variants') {
        return db.variants.find((variant) => String(variant.id) === String(id)) ?? null
      }
      return null
    },
    async update(args) {
      db.updates.push(args)
      const collection = args.collection
      const records = collection === 'products' ? db.products : collection === 'variants' ? db.variants : []
      const record = records.find((entry) => String(entry.id) === String(args.id))
      if (record) Object.assign(record, args.data)
      return record ?? { id: args.id, ...(args.data as Record<string, unknown>) }
    },
    async create(args) {
      db.creates.push(args)
      return { id: db.creates.length, ...(args.data as Record<string, unknown>) }
    },
    db: {
      sessions: new Proxy({}, {
        get: () => ({
          db: {
            async execute(statement: unknown) {
              db.atomicExecutions.push(statement)
              return { rows: [{ id: db.atomicExecutions.length }] }
            },
          },
        }),
      }),
      tables: {
        products: { id: { name: 'id' }, stockQuantity: { name: 'stock_quantity' }, updatedAt: { name: 'updated_at' } },
        variants: { id: { name: 'id' }, stock: { name: 'stock' }, updatedAt: { name: 'updated_at' } },
      },
    },
  }

  return { ...db, payload }
}

function transactionReq(): Partial<PayloadRequest> {
  return { transactionID: 'd485-local-test' } as Partial<PayloadRequest>
}

async function main() {
  await check('selectedOptions normalizes common Shopier size labels', () => {
    assert.strictEqual(normalizeShopierSelectedSize('Beden: 42'), '42')
    assert.strictEqual(normalizeShopierSelectedSize('Size 43'), '43')
    assert.strictEqual(normalizeShopierSelectedSize('Renk: Siyah / Beden: 41'), '41')
    assert.strictEqual(normalizeShopierSelectedSize('44'), '44')
  })

  await check('product-only order uses an atomic floor-at-zero decrement and writes inventory log', async () => {
    const fake = fakePayload({
      products: [{ id: 101, sku: 'SKU-101', stockQuantity: 5, sourceMeta: { shopierProductId: 'sp_101' } }],
    })

    const result = await decrementStockForShopierOrder(
      fake.payload,
      [{ id: 'sp_101', title: 'Loafer', quantity: 2, selectedOptions: 'Beden: 42' }],
      'ord_1',
      { req: transactionReq() },
    )

    assert.deepStrictEqual(result.affectedProductIds, [101])
    assert.strictEqual(result.mutatedItems, 1)
    assert.strictEqual(result.skippedItems.length, 0)
    assert.strictEqual(fake.atomicExecutions.length, 1)
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual((fake.creates[0].data as Record<string, unknown>).change, -2)
    assert.strictEqual((fake.creates[0].data as Record<string, unknown>).size, '42')
  })

  await check('variant order atomically decrements aggregate and selected size', async () => {
    const fake = fakePayload({
      products: [{ id: 202, sku: 'SKU-202', stockQuantity: 7, sourceMeta: { shopierProductId: 'sp_202' } }],
      variants: [
        { id: 'v42', product: 202, size: '42', stock: 3 },
        { id: 'v43', product: 202, size: '43', stock: 4 },
      ],
    })

    const result = await decrementStockForShopierOrder(
      fake.payload,
      [{ id: 'sp_202', title: 'Sneaker', quantity: 2, selectedOptions: 'Beden: 42' }],
      'ord_2',
      { req: transactionReq() },
    )

    assert.deepStrictEqual(result.affectedProductIds, [202])
    assert.strictEqual(fake.atomicExecutions.length, 2)
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual((fake.creates[0].data as Record<string, unknown>).change, -2)
  })

  await check('stock reads and writes use the supplied transaction request', async () => {
    const fake = fakePayload({
      products: [{ id: 206, sku: 'SKU-206', stockQuantity: 3, sourceMeta: { shopierProductId: 'sp_206' } }],
    })
    const req = transactionReq()

    await decrementStockForShopierOrder(
      fake.payload,
      [{ id: 'sp_206', title: 'Mule', quantity: 1 }],
      'ord_206',
      { req },
    )

    for (const operation of [...fake.finds, ...fake.updates, ...fake.creates]) {
      assert.strictEqual(operation.req, req)
    }
    assert.strictEqual(fake.atomicExecutions.length, 1)
  })

  await check('variant order with missing local size is skipped without stock writes', async () => {
    const fake = fakePayload({
      products: [{ id: 303, sku: 'SKU-303', stockQuantity: 3, sourceMeta: { shopierProductId: 'sp_303' } }],
      variants: [{ id: 'v41', product: 303, size: '41', stock: 3 }],
    })

    const result = await decrementStockForShopierOrder(
      fake.payload,
      [{ id: 'sp_303', title: 'Boot', quantity: 1, selectedOptions: 'Beden: 42' }],
      'ord_3',
      { req: transactionReq() },
    )

    assert.deepStrictEqual(result.affectedProductIds, [])
    assert.strictEqual(result.mutatedItems, 0)
    assert.strictEqual(result.skippedItems[0].reason, 'No local variant for size 42')
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual(fake.creates.length, 0)
  })

  await check('refund restores variant stock and syncs product total', async () => {
    const fake = fakePayload({
      products: [{ id: 404, sku: 'SKU-404', stockQuantity: 2 }],
      variants: [
        { id: 'v42', product: 404, size: '42', stock: 0 },
        { id: 'v43', product: 404, size: '43', stock: 2 },
      ],
    })

    const result = await restoreStockForShopierRefund(
      fake.payload,
      { product: 404, quantity: 1, size: 'Beden: 42' },
      'refund_1',
      'ord_4',
    )

    assert.deepStrictEqual(result.affectedProductIds, [404])
    assert.strictEqual(result.mutatedItems, 1)
    assert.strictEqual(fake.variants[0].stock, 1)
    assert.strictEqual(fake.products[0].stockQuantity, 3)
    assert.strictEqual((fake.creates[0].data as Record<string, unknown>).change, 1)
    assert.strictEqual((fake.creates[0].data as Record<string, unknown>).size, '42')
  })

  await check('refund restores product stock when no variants exist', async () => {
    const fake = fakePayload({
      products: [{ id: 505, sku: 'SKU-505', stockQuantity: 0 }],
    })

    const result = await restoreStockForShopierRefund(
      fake.payload,
      { product: { id: 505 }, quantity: 2 },
      'refund_2',
      'ord_5',
    )

    assert.deepStrictEqual(result.affectedProductIds, [505])
    assert.strictEqual(fake.products[0].stockQuantity, 2)
    assert.strictEqual(fake.updates[0].collection, 'products')
    assert.strictEqual((fake.creates[0].data as Record<string, unknown>).change, 2)
  })

  console.log(`\nshopierOrderStock: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
  if (process.exitCode) process.exit(process.exitCode)
}

void main()
