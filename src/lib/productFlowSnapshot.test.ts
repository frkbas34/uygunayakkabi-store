import assert from 'node:assert'
import { buildProductFlowSnapshot, formatProductFlowSnapshot } from './productFlowSnapshot'

let passed = 0

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

function readyDraft(overrides: Record<string, any> = {}) {
  return {
    id: 901,
    stockNumber: 'SN0901',
    title: 'Siyah Tokali Loafer',
    brand: 'Generic',
    status: 'draft',
    slug: 'siyah-tokali-loafer-sn0901',
    category: 'Klasik',
    price: 2099,
    stockQuantity: 4,
    images: [{ image: 1 }],
    generativeGallery: [],
    channelTargets: ['website'],
    channels: { publishWebsite: true },
    workflow: {
      workflowStatus: 'publish_ready',
      visualStatus: 'approved',
      confirmationStatus: 'confirmed',
      contentStatus: 'ready',
      auditStatus: 'approved',
      publishStatus: 'pending',
      stockState: 'in_stock',
      sellable: true,
    },
    auditResult: {
      overallResult: 'approved',
      approvedForPublish: true,
    },
    sourceMeta: {},
    ...overrides,
  }
}

void (async () => {
  await check('ready draft suggests operator activation without writes', async () => {
    const snapshot = await buildProductFlowSnapshot(readyDraft())

    assert.strictEqual(snapshot.lifecycle, 'ready_to_publish')
    assert.strictEqual(snapshot.readiness.level, 'ready')
    assert.deepStrictEqual(snapshot.activationBlockers, [])
    assert.ok(snapshot.nextActions.some((action) => action.includes('/activate SN0901')), snapshot.nextActions.join('\n'))
  })

  await check('active Shopier product suggests shared Shopier publish command', async () => {
    const snapshot = await buildProductFlowSnapshot(readyDraft({
      status: 'active',
      channelTargets: ['website', 'shopier'],
      channels: { publishWebsite: true, publishShopier: true },
      generativeGallery: [{ image: 2 }],
      imageQuality: { status: 'pass' },
      workflow: {
        ...readyDraft().workflow,
        workflowStatus: 'active',
        publishStatus: 'published',
      },
    }))

    assert.strictEqual(snapshot.shopier.gate.state, 'ready')
    assert.ok(snapshot.nextActions.some((action) => action.includes('/shopier publish SN0901')), snapshot.nextActions.join('\n'))
    assert.ok(!snapshot.nextActions.some((action) => action.includes('/redispatch shopier SN0901')), snapshot.nextActions.join('\n'))
  })

  await check('blocked product exposes channel drift, image recovery, and coherence next actions', async () => {
    const snapshot = await buildProductFlowSnapshot(readyDraft({
      status: 'active',
      stockQuantity: 0,
      images: [],
      generativeGallery: [{ image: 2 }],
      imageQuality: { status: 'review', defectFlags: ['color_drift'] },
      channelTargets: ['website', 'instagram', 'dolap'],
      channels: { publishWebsite: true, publishInstagram: false },
      workflow: {
        ...readyDraft().workflow,
        workflowStatus: 'draft',
        publishStatus: 'pending',
      },
      sourceMeta: {
        dispatchNotes: JSON.stringify([
          { channel: 'instagram', eligible: true, dispatched: false, webhookConfigured: false, skippedReason: 'missing webhook' },
        ]),
      },
    }))

    assert.ok(snapshot.channels.issues.some((issue) => issue.includes('dolap')), snapshot.channels.issues.join('\n'))
    assert.ok(snapshot.coherenceIssues.some((issue) => issue.field === 'workflowStatus'), JSON.stringify(snapshot.coherenceIssues))
    assert.ok(snapshot.nextActions.some((action) => action.includes('/repair SN0901')), snapshot.nextActions.join('\n'))
    assert.ok(snapshot.nextActions.some((action) => action.includes('#gorsel SN0901')), snapshot.nextActions.join('\n'))
    assert.ok(snapshot.nextActions.some((action) => action.includes('/redispatch instagram SN0901')), snapshot.nextActions.join('\n'))
  })

  await check('historical retired dispatch notes stay out of operator snapshot', async () => {
    const snapshot = await buildProductFlowSnapshot(readyDraft({
      status: 'active',
      channelTargets: ['website', 'instagram'],
      channels: { publishWebsite: true, publishInstagram: true },
      sourceMeta: {
        dispatchNotes: JSON.stringify([
          { channel: 'instagram', eligible: true, dispatched: true, webhookConfigured: true },
          { channel: 'dolap', eligible: false, dispatched: false, webhookConfigured: false, skippedReason: 'retired' },
          { channel: 'threads', eligible: false, dispatched: false, webhookConfigured: false, skippedReason: 'retired' },
        ]),
      },
    }))

    const channels = snapshot.channels.dispatch.map((row) => row.channel)
    assert.ok(channels.includes('instagram'), channels.join(', '))
    assert.ok(!channels.includes('dolap'), channels.join(', '))
    assert.ok(!channels.includes('threads'), channels.join(', '))
    assert.ok(!formatProductFlowSnapshot(snapshot).toLowerCase().includes('dolap'))
    assert.ok(!formatProductFlowSnapshot(snapshot).toLowerCase().includes('threads'))
  })

  await check('formatter is compact and clearly read-only', async () => {
    const snapshot = await buildProductFlowSnapshot(readyDraft())
    const message = formatProductFlowSnapshot(snapshot)

    assert.ok(message.includes('Product Flow Snapshot'), message)
    assert.ok(message.includes('Read-only: no writes'), message)
    assert.ok(message.includes('/activate SN0901'), message)
  })

  console.log(`\nproductFlowSnapshot: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
})()
