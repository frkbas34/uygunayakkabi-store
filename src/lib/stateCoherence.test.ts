/**
 * stateCoherence.test.ts - standalone checks for /repair state normalization.
 *
 * Run: `tsx src/lib/stateCoherence.test.ts`.
 */
import assert from 'node:assert'
import {
  formatScanReport,
  normalizeProductState,
  scanCoherenceDrift,
} from './stateCoherence'

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

function fakePayload(products: Array<Record<string, any>>) {
  const store = new Map<number | string, Record<string, any>>()
  const events: Array<Record<string, any>> = []

  for (const product of products) {
    store.set(product.id, structuredClone(product))
  }

  return {
    events,
    getProduct(id: number | string) {
      return store.get(id)
    },
    async findByID({ collection, id }: { collection: string; id: number | string }) {
      if (collection !== 'products') throw new Error(`unexpected collection: ${collection}`)
      const product = store.get(id)
      if (!product) throw new Error('not found')
      return structuredClone(product)
    },
    async update({ collection, id, data }: { collection: string; id: number | string; data: Record<string, any> }) {
      if (collection !== 'products') throw new Error(`unexpected collection: ${collection}`)
      const product = store.get(id)
      if (!product) throw new Error('not found')
      const next = {
        ...product,
        ...data,
        workflow: {
          ...(product.workflow ?? {}),
          ...(data.workflow ?? {}),
        },
      }
      store.set(id, next)
      return structuredClone(next)
    },
    async create({ collection, data }: { collection: string; data: Record<string, any> }) {
      if (collection !== 'bot-events') throw new Error(`unexpected collection: ${collection}`)
      events.push(structuredClone(data))
      return { id: events.length, ...data }
    },
    async find({ collection, limit }: { collection: string; limit?: number }) {
      if (collection !== 'products') throw new Error(`unexpected collection: ${collection}`)
      return {
        docs: [...store.values()].slice(0, limit ?? 200).map((product) => structuredClone(product)),
      }
    },
  }
}

async function main() {
  await check('dry-run reports active product drift without writing', async () => {
    const payload = fakePayload([{
      id: 1,
      stockNumber: 'SN0001',
      status: 'active',
      workflow: {
        workflowStatus: 'draft',
        publishStatus: 'pending',
        stockState: 'in_stock',
        sellable: false,
      },
    }])

    const report = await normalizeProductState(payload, 1)

    assert.strictEqual(report.changed, true)
    assert.deepStrictEqual(
      report.patches.map((patch) => patch.field),
      ['workflow.workflowStatus', 'workflow.publishStatus', 'workflow.sellable'],
    )
    assert.strictEqual(payload.getProduct(1)?.workflow.workflowStatus, 'draft')
    assert.strictEqual(payload.events.length, 0)
  })

  await check('confirmed repair writes only workflow fields and emits audit event', async () => {
    const payload = fakePayload([{
      id: 2,
      stockNumber: 'SN0002',
      status: 'active',
      title: 'Active Drift',
      price: 1000,
      workflow: {
        workflowStatus: 'content_pending',
        publishStatus: 'not_requested',
        stockState: 'in_stock',
        sellable: false,
        confirmationStatus: 'confirmed',
      },
    }])

    const report = await normalizeProductState(payload, 2, { dryRun: false })
    const product = payload.getProduct(2)

    assert.strictEqual(report.changed, true)
    assert.strictEqual(product?.status, 'active')
    assert.strictEqual(product?.workflow.workflowStatus, 'active')
    assert.strictEqual(product?.workflow.publishStatus, 'published')
    assert.strictEqual(product?.workflow.sellable, true)
    assert.strictEqual(product?.workflow.confirmationStatus, 'confirmed')
    assert.strictEqual(payload.events.length, 1)
    assert.strictEqual(payload.events[0].eventType, 'state.repaired')
  })

  await check('confirmed repair is idempotent after first write', async () => {
    const payload = fakePayload([{
      id: 3,
      stockNumber: 'SN0003',
      status: 'soldout',
      workflow: {
        workflowStatus: 'active',
        publishStatus: 'published',
        stockState: 'sold_out',
        sellable: true,
      },
    }])

    const first = await normalizeProductState(payload, 3, { dryRun: false })
    const second = await normalizeProductState(payload, 3, { dryRun: false })

    assert.strictEqual(first.changed, true)
    assert.strictEqual(payload.getProduct(3)?.workflow.workflowStatus, 'soldout')
    assert.strictEqual(payload.getProduct(3)?.workflow.sellable, false)
    assert.strictEqual(second.changed, false)
    assert.strictEqual(payload.events.length, 1)
  })

  await check('archived workflow is skipped', async () => {
    const payload = fakePayload([{
      id: 4,
      status: 'active',
      workflow: {
        workflowStatus: 'archived',
        publishStatus: 'pending',
        sellable: false,
      },
    }])

    const report = await normalizeProductState(payload, 4, { dryRun: false })

    assert.strictEqual(report.changed, false)
    assert.strictEqual(report.skipped, 'archived')
    assert.strictEqual(payload.getProduct(4)?.workflow.publishStatus, 'pending')
  })

  await check('scan report lists drifted products without mutation', async () => {
    const payload = fakePayload([
      {
        id: 5,
        stockNumber: 'SN0005',
        status: 'active',
        workflow: {
          workflowStatus: 'draft',
          publishStatus: 'pending',
          stockState: 'in_stock',
          sellable: true,
        },
      },
      {
        id: 6,
        stockNumber: 'SN0006',
        status: 'active',
        workflow: {
          workflowStatus: 'active',
          publishStatus: 'published',
          stockState: 'in_stock',
          sellable: true,
        },
      },
    ])

    const scan = await scanCoherenceDrift(payload, { limit: 10 })
    const message = formatScanReport(scan)

    assert.strictEqual(scan.totalScanned, 2)
    assert.deepStrictEqual(scan.drifted.map((product) => product.id), [5])
    assert.ok(message.includes('SN0005'), message)
    assert.strictEqual(payload.getProduct(5)?.workflow.workflowStatus, 'draft')
  })

  console.log(`\nstateCoherence: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
}

void main()
