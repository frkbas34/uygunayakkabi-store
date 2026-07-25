/**
 * Orders.test.ts - D-484 non-Shopier order stock reservation behavior.
 *
 * Exercises the collection hook with an in-memory Payload double. It makes no
 * database, provider, Shopier, Telegram, or job-queue calls.
 */
import assert from 'node:assert'
import type { PayloadRequest } from 'payload'

import { Orders } from './Orders'

let passed = 0

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ok - ${name}`)
  } catch (error) {
    console.error(`  fail - ${name}\n    ${(error as Error).message}`)
    process.exitCode = 1
  }
}

type Operation = Record<string, unknown>

function fakePayload(seed: {
  product: Record<string, unknown>
  variants?: Array<Record<string, unknown>>
  atomicResults?: boolean[]
}) {
  const finds: Operation[] = []
  const findByIds: Operation[] = []
  const updates: Operation[] = []
  const creates: Operation[] = []
  const atomicExecutions: unknown[] = []
  const atomicResults = [...(seed.atomicResults ?? [])]
  const product = { ...seed.product }
  const variants = (seed.variants ?? []).map((variant) => ({ ...variant }))

  const payload = {
    async findByID(args: Operation) {
      findByIds.push(args)
      if (args.collection === 'products' && String(args.id) === String(product.id)) return product
      return null
    },
    async find(args: Operation) {
      finds.push(args)
      if (args.collection !== 'variants') return { docs: [] }
      const productId = ((args.where as Record<string, unknown>)?.product as Record<string, unknown> | undefined)?.equals
      return { docs: variants.filter((variant) => String(variant.product) === String(productId)) }
    },
    async update(args: Operation) {
      updates.push(args)
      const data = args.data as Record<string, unknown>
      if (args.collection === 'products' && String(args.id) === String(product.id)) {
        Object.assign(product, data)
        return product
      }
      if (args.collection === 'variants') {
        const variant = variants.find((candidate) => String(candidate.id) === String(args.id))
        if (variant) Object.assign(variant, data)
        return variant ?? { id: args.id, ...data }
      }
      return { id: args.id, ...data }
    },
    async create(args: Operation) {
      creates.push(args)
      return { id: creates.length, ...(args.data as Record<string, unknown>) }
    },
    db: {
      sessions: new Proxy({}, {
        get: () => ({
          db: {
            async execute(statement: unknown) {
              atomicExecutions.push(statement)
              const reserved = atomicResults.shift() ?? true
              return { rows: reserved ? [{ id: atomicExecutions.length }] : [] }
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

  return { payload, product, variants, finds, findByIds, updates, creates, atomicExecutions }
}

function stockHook() {
  const hook = Orders.hooks?.afterChange?.[0]
  assert.ok(hook, 'Orders must register the non-Shopier stock hook first')
  return hook as any
}

function createArgs(
  payload: unknown,
  doc: Record<string, unknown>,
  req: Partial<PayloadRequest>,
) {
  return {
    collection: Orders,
    context: req.context ?? {},
    data: doc,
    doc,
    operation: 'create',
    previousDoc: {},
    req: { ...req, payload },
  } as any
}

async function main() {
  await check('product-only order reserves stock with a conditional transaction query', async () => {
    const fake = fakePayload({
      product: {
        id: 101,
        sku: 'SKU-101',
        stockQuantity: 5,
        status: 'active',
        workflow: { stockState: 'in_stock', sellable: true },
      },
    })
    const req = { transactionID: 'd483-product-only', context: {} } as Partial<PayloadRequest>

    const args = createArgs(fake.payload, {
      id: 501,
      orderNumber: 'ORD-501',
      product: 101,
      quantity: 2,
      source: 'website',
    }, req)
    await stockHook()(args)

    assert.strictEqual(fake.atomicExecutions.length, 1)
    assert.strictEqual(fake.updates.length, 0, 'stock must not fall back to a read-then-write Payload update')
    const inventoryLog = fake.creates.find((operation) => operation.collection === 'inventory-logs')
    assert.ok(inventoryLog, 'must create an inventory log')
    assert.strictEqual((inventoryLog?.data as Record<string, unknown>).change, -2)
    for (const operation of [...fake.findByIds, ...fake.finds, ...fake.updates, ...fake.creates]) {
      assert.strictEqual(operation.req, args.req)
    }
  })

  await check('variant order reserves product total then selected size in one transaction', async () => {
    const fake = fakePayload({
      product: {
        id: 202,
        sku: 'SKU-202',
        stockQuantity: 7,
        status: 'active',
        workflow: { stockState: 'in_stock', sellable: true },
      },
      variants: [
        { id: 'v42', product: 202, size: '42', stock: 3 },
        { id: 'v43', product: 202, size: '43', stock: 4 },
      ],
    })
    const req = { transactionID: 'd483-variant', context: {} } as Partial<PayloadRequest>

    await stockHook()(createArgs(fake.payload, {
      id: 502,
      orderNumber: 'ORD-502',
      product: 202,
      size: '42',
      quantity: 2,
      source: 'instagram',
    }, req))

    assert.strictEqual(fake.atomicExecutions.length, 2)
    assert.strictEqual(fake.updates.length, 0, 'stock must not use literal Payload updates')
  })

  await check('missing or unknown size refuses a variant-backed order before any write', async () => {
    const fake = fakePayload({
      product: { id: 303, sku: 'SKU-303', stockQuantity: 2 },
      variants: [{ id: 'v41', product: 303, size: '41', stock: 2 }],
    })
    const req = { transactionID: 'd483-missing-size', context: {} } as Partial<PayloadRequest>

    await assert.rejects(
      () => stockHook()(createArgs(fake.payload, {
        id: 503,
        orderNumber: 'ORD-503',
        product: 303,
        quantity: 1,
        source: 'website',
      }, req)),
      /requires a size selection/,
    )
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual(fake.creates.length, 0)
  })

  await check('insufficient product stock throws instead of recording a partial decrement', async () => {
    const fake = fakePayload({
      product: { id: 404, sku: 'SKU-404', stockQuantity: 1 },
      atomicResults: [false],
    })
    const req = { transactionID: 'd483-insufficient', context: {} } as Partial<PayloadRequest>

    await assert.rejects(
      () => stockHook()(createArgs(fake.payload, {
        id: 504,
        orderNumber: 'ORD-504',
        product: 404,
        quantity: 2,
        source: 'phone',
      }, req)),
      /insufficient stock/,
    )
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual(fake.creates.length, 0)
    assert.strictEqual(fake.atomicExecutions.length, 1)
  })

  await check('missing parent transaction fails closed before inventory is logged', async () => {
    const fake = fakePayload({ product: { id: 451, sku: 'SKU-451', stockQuantity: 2 } })

    await assert.rejects(
      () => stockHook()(createArgs(fake.payload, {
        id: 551,
        orderNumber: 'ORD-551',
        product: 451,
        quantity: 1,
        source: 'website',
      }, { context: {} })),
      /without an active Payload transaction/,
    )
    assert.strictEqual(fake.atomicExecutions.length, 0)
    assert.strictEqual(fake.creates.length, 0)
  })

  await check('Shopier order bypasses the generic stock hook', async () => {
    const fake = fakePayload({ product: { id: 505, sku: 'SKU-505', stockQuantity: 2 } })
    const req = { transactionID: 'd483-shopier-bypass', context: {} } as Partial<PayloadRequest>
    const doc = { id: 505, product: 505, quantity: 1, source: 'shopier' }

    const result = await stockHook()(createArgs(fake.payload, doc, req))
    assert.strictEqual(result, doc)
    assert.strictEqual(fake.findByIds.length, 0)
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual(fake.creates.length, 0)
  })

  console.log(`\nOrders transaction stock hook: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
  if (process.exitCode) process.exit(process.exitCode)
}

void main()
