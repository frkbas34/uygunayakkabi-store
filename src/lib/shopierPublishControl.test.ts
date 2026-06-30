/**
 * shopierPublishControl.test.ts - D-356 Shopier/Web batch publish gates.
 * No external calls; Payload jobs/update are faked in-process.
 */
import assert from 'node:assert'
import {
  buildShopierErrorEntries,
  buildShopierDashboardSummary,
  buildShopierRetryPlan,
  evaluateShopierPublishControl,
  formatShopierBatchPlan,
  formatShopierErrorSummary,
  formatShopierOperatorDashboard,
  formatShopierRetryPlan,
  hasShopierIntent,
  queueShopierSync,
  summarizeShopierAdminGate,
} from './shopierPublishControl'

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

function readyProduct(overrides: Record<string, any> = {}) {
  return {
    id: 901,
    stockNumber: 'SN0901',
    title: 'Siyah Tokali Loafer',
    slug: 'siyah-tokali-loafer-sn0901',
    status: 'active',
    category: 'Klasik',
    brand: 'Generic',
    price: 2099,
    stockQuantity: 4,
    images: [{ image: 11 }],
    generativeGallery: [{ image: 21 }, { image: 22 }],
    imageQuality: { status: 'pass' },
    channelTargets: ['website', 'shopier'],
    channels: { publishWebsite: true, publishShopier: true },
    workflow: {
      workflowStatus: 'active',
      visualStatus: 'approved',
      confirmationStatus: 'confirmed',
      contentStatus: 'ready',
      auditStatus: 'approved',
      publishStatus: 'published',
      stockState: 'in_stock',
      sellable: true,
    },
    auditResult: {
      overallResult: 'approved',
      approvedForPublish: true,
    },
    sourceMeta: { shopierSyncStatus: 'not_synced' },
    ...overrides,
  }
}

function fakePayload() {
  const updates: Record<string, any>[] = []
  const jobs: Record<string, any>[] = []
  return {
    updates,
    jobs,
    payload: {
      update: async (args: Record<string, any>) => {
        updates.push(args)
        return { id: args.id, ...args.data }
      },
      jobs: {
        queue: async (args: Record<string, any>) => {
          jobs.push(args)
          return { id: jobs.length, ...args }
        },
      },
    },
  }
}

async function main() {
  await check('ready active Shopier-targeted product can be queued', () => {
    const result = evaluateShopierPublishControl(readyProduct())
    assert.strictEqual(result.ok, true)
    assert.deepStrictEqual(result.blockers, [])
    assert.strictEqual(result.readinessScore, '6/6')
  })

  await check('Shopier intent detects target or publish flag', () => {
    assert.strictEqual(hasShopierIntent(readyProduct({ channelTargets: ['website'], channels: { publishShopier: true } })), true)
    assert.strictEqual(hasShopierIntent(readyProduct({ channelTargets: ['shopier'], channels: { publishShopier: false } })), true)
    assert.strictEqual(hasShopierIntent(readyProduct({ channelTargets: ['website'], channels: { publishWebsite: true } })), false)
  })

  await check('admin gate summary distinguishes not-targeted, ready, queued, and synced products', () => {
    const notTargetedProduct = readyProduct({ channelTargets: ['website'], channels: { publishWebsite: true } })
    const notTargeted = summarizeShopierAdminGate(
      evaluateShopierPublishControl(notTargetedProduct),
      { hasIntent: hasShopierIntent(notTargetedProduct) },
    )
    assert.strictEqual(notTargeted.state, 'not_targeted')

    const ready = summarizeShopierAdminGate(
      evaluateShopierPublishControl(readyProduct()),
      { hasIntent: true },
    )
    assert.strictEqual(ready.state, 'ready')

    const queued = summarizeShopierAdminGate(
      evaluateShopierPublishControl(readyProduct({ sourceMeta: { shopierSyncStatus: 'queued' } })),
      { hasIntent: true },
    )
    assert.strictEqual(queued.state, 'queued')

    const synced = summarizeShopierAdminGate(
      evaluateShopierPublishControl(readyProduct({ sourceMeta: { shopierSyncStatus: 'synced', shopierProductId: 'sp_123' } })),
      { hasIntent: true },
    )
    assert.strictEqual(synced.state, 'synced')
  })

  await check('draft products and missing website slug are blocked', () => {
    const result = evaluateShopierPublishControl(readyProduct({ status: 'draft', slug: '' }))
    assert.strictEqual(result.ok, false)
    assert.ok(result.blockers.some((b) => b.includes('active website visibility')), result.blockers.join('\n'))
    assert.ok(result.blockers.some((b) => b.includes('website slug')), result.blockers.join('\n'))
  })

  await check('generated media is required for Shopier publish', () => {
    const result = evaluateShopierPublishControl(readyProduct({
      generativeGallery: [],
    }))
    assert.strictEqual(result.ok, false)
    assert.ok(result.blockers.some((b) => b.includes('generated gallery')), result.blockers.join('\n'))
  })

  await check('generated media needs image QC pass', () => {
    const result = evaluateShopierPublishControl(readyProduct({
      imageQuality: { status: 'pending' },
    }))
    assert.strictEqual(result.ok, false)
    assert.ok(result.blockers.some((b) => b.includes('image QC')), result.blockers.join('\n'))
  })

  await check('category, brand safety, and channel drift block queueing', () => {
    const result = evaluateShopierPublishControl(readyProduct({
      category: '',
      brand: 'Nike',
      title: 'Nike Air Max Spor',
      channelTargets: ['website'],
      channels: { publishWebsite: true, publishShopier: true },
    }))
    assert.strictEqual(result.ok, false)
    assert.ok(result.blockers.some((b) => b.includes('category required')), result.blockers.join('\n'))
    assert.ok(result.blockers.some((b) => b.includes('brand safety')), result.blockers.join('\n'))
    assert.ok(result.blockers.some((b) => b.includes('channels.publishShopier')), result.blockers.join('\n'))
  })

  await check('queued or syncing products are not queued twice', () => {
    const result = evaluateShopierPublishControl(readyProduct({
      sourceMeta: { shopierSyncStatus: 'queued' },
    }))
    assert.strictEqual(result.ok, false)
    assert.ok(result.blockers.some((b) => b.includes('already queued')), result.blockers.join('\n'))
  })

  await check('queueShopierSync writes sourceMeta and a job only when eligible', async () => {
    const fake = fakePayload()
    const result = await queueShopierSync(fake.payload as any, readyProduct(), { notifyTelegramChatId: 12345 })

    assert.strictEqual(result.ok, true)
    assert.strictEqual(result.queued, true)
    assert.strictEqual(fake.updates.length, 1)
    assert.strictEqual(fake.updates[0].data.sourceMeta.shopierSyncStatus, 'queued')
    assert.strictEqual(fake.updates[0].context.isDispatchUpdate, true)
    assert.strictEqual(fake.jobs.length, 1)
    assert.strictEqual(fake.jobs[0].task, 'shopier-sync')
    assert.strictEqual(fake.jobs[0].input.productId, '901')
    assert.strictEqual(fake.jobs[0].input.notifyTelegramChatId, 12345)
  })

  await check('queueShopierSync refuses blockers without writes', async () => {
    const fake = fakePayload()
    const result = await queueShopierSync(fake.payload as any, readyProduct({ status: 'draft' }))

    assert.strictEqual(result.ok, false)
    assert.strictEqual(result.queued, false)
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual(fake.jobs.length, 0)
    assert.ok(result.message.includes('Shopier publish blocked'), result.message)
  })

  await check('batch preview explains confirm requirement and blocked sample', () => {
    const ready = evaluateShopierPublishControl(readyProduct())
    const blocked = evaluateShopierPublishControl(readyProduct({ status: 'draft' }))
    const message = formatShopierBatchPlan([ready, blocked])

    assert.ok(message.includes('/shopier publish-ready confirm'), message)
    assert.ok(message.includes('Ready to queue: 1'), message)
    assert.ok(message.includes('Blocked: 1'), message)
  })

  await check('Shopier error summary classifies retryable, data, and config issues', () => {
    const products = [
      readyProduct({
        id: 910,
        stockNumber: 'SN0910',
        sourceMeta: { shopierSyncStatus: 'error', shopierLastError: 'fetch timeout while calling Shopier API' },
      }),
      readyProduct({
        id: 911,
        stockNumber: 'SN0911',
        sourceMeta: { shopierSyncStatus: 'error', shopierLastError: 'Failed to build Shopier product body - missing required fields (title, media, price)' },
      }),
      readyProduct({
        id: 912,
        stockNumber: 'SN0912',
        sourceMeta: { shopierSyncStatus: 'error', shopierLastError: 'SHOPIER_PAT env var is not set' },
      }),
    ]
    const entries = buildShopierErrorEntries(products)
    assert.deepStrictEqual(entries.map((entry) => entry.kind), ['retryable', 'product_data', 'configuration'])
    assert.deepStrictEqual(entries.map((entry) => entry.retryable), [true, false, false])

    const message = formatShopierErrorSummary(products)
    assert.ok(message.includes('Retryable: 1'), message)
    assert.ok(message.includes('Product data: 1'), message)
    assert.ok(message.includes('Config: 1'), message)
    assert.ok(message.includes('/shopier retry-errors'), message)
    assert.ok(message.includes('/shopier republish'), message)
  })

  await check('Shopier retry plan only queues retryable errors that still pass the gate', () => {
    const products = [
      readyProduct({
        id: 920,
        stockNumber: 'SN0920',
        sourceMeta: { shopierSyncStatus: 'error', shopierLastError: 'fetch timeout while calling Shopier API' },
      }),
      readyProduct({
        id: 921,
        stockNumber: 'SN0921',
        sourceMeta: { shopierSyncStatus: 'error', shopierLastError: 'SHOPIER_PAT env var is not set' },
      }),
      readyProduct({
        id: 922,
        stockNumber: 'SN0922',
        imageQuality: { status: 'review' },
        sourceMeta: { shopierSyncStatus: 'error', shopierLastError: 'HTTP 503 from Shopier' },
      }),
      readyProduct({
        id: 923,
        stockNumber: 'SN0923',
        sourceMeta: { shopierSyncStatus: 'queued', shopierLastError: 'HTTP 503 from Shopier' },
      }),
    ]

    const plan = buildShopierRetryPlan(products)
    assert.deepStrictEqual(plan.map((entry) => entry.queueable), [true, false, false, false])
    assert.ok(plan[1].blockers.some((blocker) => blocker.includes('configuration')), plan[1].blockers.join('\n'))
    assert.ok(plan[2].blockers.some((blocker) => blocker.includes('image QC')), plan[2].blockers.join('\n'))
    assert.ok(plan[3].blockers.some((blocker) => blocker.includes('already queued')), plan[3].blockers.join('\n'))

    const message = formatShopierRetryPlan(plan)
    assert.ok(message.includes('/shopier retry-errors confirm'), message)
    assert.ok(message.includes('Safe to retry: 1'), message)
    assert.ok(message.includes('Blocked: 3'), message)
  })

  await check('empty Shopier error summary is explicit', () => {
    const message = formatShopierErrorSummary([])
    assert.ok(message.includes('No Shopier sync errors found'), message)
  })

  await check('operator dashboard summarizes queue blockers and safe retries', () => {
    const publishEvaluations = [
      evaluateShopierPublishControl(readyProduct()),
      evaluateShopierPublishControl(readyProduct({ imageQuality: { status: 'review' } })),
      evaluateShopierPublishControl(readyProduct({ category: '', generativeGallery: [] })),
    ]
    const errorProducts = [
      readyProduct({
        id: 930,
        stockNumber: 'SN0930',
        sourceMeta: { shopierSyncStatus: 'error', shopierLastError: 'HTTP 503 from Shopier' },
      }),
      readyProduct({
        id: 931,
        stockNumber: 'SN0931',
        imageQuality: { status: 'review' },
        sourceMeta: { shopierSyncStatus: 'error', shopierLastError: 'HTTP 503 from Shopier' },
      }),
      readyProduct({
        id: 932,
        stockNumber: 'SN0932',
        sourceMeta: { shopierSyncStatus: 'error', shopierLastError: 'SHOPIER_PAT env var is not set' },
      }),
    ]

    const summary = buildShopierDashboardSummary(publishEvaluations, errorProducts)
    assert.strictEqual(summary.checked, 3)
    assert.strictEqual(summary.readyToQueue, 1)
    assert.strictEqual(summary.blocked, 2)
    assert.ok(summary.topBlockers.some((entry) => entry.reason === 'Image QC not PASS'), JSON.stringify(summary.topBlockers))
    assert.ok(summary.topBlockers.some((entry) => entry.reason === 'Missing category'), JSON.stringify(summary.topBlockers))
    assert.strictEqual(summary.errors.total, 3)
    assert.strictEqual(summary.errors.retryable, 2)
    assert.strictEqual(summary.errors.configuration, 1)
    assert.strictEqual(summary.errors.safeToRetry, 1)
    assert.strictEqual(summary.errors.blockedRetries, 2)

    const message = formatShopierOperatorDashboard(summary, { shopierPatConfigured: false })
    assert.ok(message.includes('Shopier Operator Dashboard'), message)
    assert.ok(message.includes('SHOPIER_PAT configured: no'), message)
    assert.ok(message.includes('Ready to queue: 1'), message)
    assert.ok(message.includes('Safe to retry now: 1'), message)
    assert.ok(message.includes('/shopier publish-ready confirm'), message)
    assert.ok(message.includes('/shopier retry-errors confirm'), message)
    assert.ok(message.includes('Configure SHOPIER_PAT'), message)
  })

  console.log(`\nshopierPublishControl: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
}

void main()
