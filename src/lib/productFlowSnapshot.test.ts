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
    assert.strictEqual(snapshot.ref, 'SN0901')
    assert.strictEqual(snapshot.commandRef, '901')
    assert.strictEqual(snapshot.readiness.level, 'ready')
    assert.ok(snapshot.operatorLinks.adminUrl?.endsWith('/admin/collections/products/901'), String(snapshot.operatorLinks.adminUrl))
    assert.strictEqual(snapshot.operatorLinks.productUrl, null)
    assert.deepStrictEqual(snapshot.activationBlockers, [])
    assert.ok(snapshot.nextActions.some((action) => action.includes('/activate 901')), snapshot.nextActions.join('\n'))
    assert.ok(snapshot.operatorChecklist.some((item) => item.key === 'activation' && item.state === 'next' && item.command === '/activate 901'))
    assert.deepStrictEqual(snapshot.checklistSummary, {
      total: 7,
      done: 6,
      next: 1,
      needs_work: 0,
      blocked: 0,
    })
    assert.deepStrictEqual(snapshot.channels.dispatchSummary, {
      total: 1,
      published: 0,
      queued: 0,
      failed: 0,
      blocked: 1,
      preview: 0,
      unrecorded: 0,
      not_configured: 0,
      skipped: 0,
    })
    assert.strictEqual(snapshot.channels.dispatch[0]?.state, 'blocked')
    assert.strictEqual(snapshot.channels.dispatch[0]?.reason, 'Website visibility requires active or sold-out status (status=draft).')
    assert.strictEqual(snapshot.channels.dispatch[0]?.nextAction, '/productflow 901 - resolve product or activation blockers before dispatch')
    assert.strictEqual(snapshot.primaryOperatorStep?.key, 'activation')
    assert.strictEqual(snapshot.primaryOperatorStep?.command, '/activate 901')
  })

  await check('operator checklist gives staged commands for incomplete drafts', async () => {
    const snapshot = await buildProductFlowSnapshot(readyDraft({
      price: 0,
      stockQuantity: 0,
      images: [],
      generativeGallery: [],
      channelTargets: [],
      channels: {},
      workflow: {
        ...readyDraft().workflow,
        workflowStatus: 'draft',
        visualStatus: 'pending',
        confirmationStatus: 'pending',
        contentStatus: 'pending',
        auditStatus: 'pending',
      },
      auditResult: {
        overallResult: 'not_reviewed',
        approvedForPublish: false,
      },
    }))

    const checklist = new Map(snapshot.operatorChecklist.map((item) => [item.key, item]))
    assert.strictEqual(checklist.get('visuals')?.command, '/imageqc 901')
    assert.strictEqual(checklist.get('confirmation')?.command, '/confirm 901')
    assert.strictEqual(checklist.get('content')?.state, 'blocked')
    assert.strictEqual(checklist.get('content')?.command, '/confirm 901')
    assert.strictEqual(checklist.get('audit')?.state, 'blocked')
    assert.strictEqual(checklist.get('audit')?.command, '/confirm 901')
    assert.strictEqual(checklist.get('sellable')?.command, '/confirm 901')
    assert.strictEqual(checklist.get('publish_targets')?.command, '/confirm 901 force')
    assert.strictEqual(checklist.get('activation')?.state, 'blocked')
    assert.deepStrictEqual(snapshot.checklistSummary, {
      total: 7,
      done: 0,
      next: 0,
      needs_work: 4,
      blocked: 3,
    })
    assert.strictEqual(snapshot.primaryOperatorStep?.key, 'visuals')
    assert.strictEqual(snapshot.primaryOperatorStep?.command, '/imageqc 901')
  })

  await check('operator checklist waits for content before audit', async () => {
    const snapshot = await buildProductFlowSnapshot(readyDraft({
      workflow: {
        ...readyDraft().workflow,
        workflowStatus: 'confirmed',
        confirmationStatus: 'confirmed',
        contentStatus: 'pending',
        auditStatus: 'pending',
      },
      auditResult: {
        overallResult: 'not_reviewed',
        approvedForPublish: false,
      },
    }))

    const checklist = new Map(snapshot.operatorChecklist.map((item) => [item.key, item]))
    assert.strictEqual(checklist.get('content')?.state, 'needs_work')
    assert.strictEqual(checklist.get('content')?.command, '/content 901 trigger')
    assert.strictEqual(checklist.get('audit')?.state, 'blocked')
    assert.strictEqual(checklist.get('audit')?.command, '/content 901 trigger')
    assert.strictEqual(snapshot.primaryOperatorStep?.key, 'content')
    assert.strictEqual(snapshot.primaryOperatorStep?.command, '/content 901 trigger')
  })

  await check('operator checklist retries failed content before audit', async () => {
    const snapshot = await buildProductFlowSnapshot(readyDraft({
      workflow: {
        ...readyDraft().workflow,
        workflowStatus: 'content_pending',
        confirmationStatus: 'confirmed',
        contentStatus: 'failed',
        auditStatus: 'pending',
      },
      auditResult: {
        overallResult: 'not_reviewed',
        approvedForPublish: false,
      },
    }))

    const checklist = new Map(snapshot.operatorChecklist.map((item) => [item.key, item]))
    assert.strictEqual(checklist.get('content')?.command, '/content 901 retry')
    assert.strictEqual(checklist.get('audit')?.state, 'blocked')
    assert.strictEqual(checklist.get('audit')?.command, '/content 901 retry')
    assert.strictEqual(snapshot.primaryOperatorStep?.key, 'content')
    assert.strictEqual(snapshot.primaryOperatorStep?.command, '/content 901 retry')
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
    assert.ok(snapshot.operatorLinks.adminUrl?.endsWith('/admin/collections/products/901'), String(snapshot.operatorLinks.adminUrl))
    assert.ok(snapshot.operatorLinks.productUrl?.endsWith('/products/siyah-tokali-loafer-sn0901'), String(snapshot.operatorLinks.productUrl))
    assert.ok(snapshot.nextActions.some((action) => action.includes('/shopier publish 901')), snapshot.nextActions.join('\n'))
    assert.ok(!snapshot.nextActions.some((action) => action.includes('/redispatch shopier 901')), snapshot.nextActions.join('\n'))
    assert.strictEqual(snapshot.primaryOperatorStep?.key, 'shopier')
    assert.strictEqual(snapshot.primaryOperatorStep?.command, '/shopier publish 901')
    assert.deepStrictEqual(snapshot.channels.dispatchSummary, {
      total: 2,
      published: 1,
      queued: 0,
      failed: 0,
      blocked: 0,
      preview: 0,
      unrecorded: 1,
      not_configured: 0,
      skipped: 0,
    })
    assert.strictEqual(snapshot.channels.dispatch.find((row) => row.channel === 'shopier')?.nextAction, '/shopier publish 901 - shared Shopier/Web gate passes')
  })

  await check('unsafe active product does not report website as published', async () => {
    const snapshot = await buildProductFlowSnapshot(readyDraft({
      status: 'active',
      title: 'Nike Sneaker Siyah',
      brand: 'Nike',
      workflow: {
        ...readyDraft().workflow,
        workflowStatus: 'active',
        publishStatus: 'published',
      },
    }))

    const website = snapshot.channels.dispatch.find((row) => row.channel === 'website')
    assert.strictEqual(website?.state, 'blocked')
    assert.strictEqual(website?.reason, 'Website visibility is blocked by public storefront safety policy.')
    assert.strictEqual(website?.canRedispatch, false)
    assert.strictEqual(snapshot.operatorLinks.productUrl, null)
  })

  await check('protected-brand products prioritize provenance before image or channel actions', async () => {
    const snapshot = await buildProductFlowSnapshot(readyDraft({
      title: 'Nike Sneaker Siyah',
      brand: 'Nike',
      generativeGallery: [{ image: 2 }],
      imageQuality: { status: 'review', defectFlags: ['invented_logo_or_brand'] },
    }))

    const checklist = new Map(snapshot.operatorChecklist.map((item) => [item.key, item]))
    assert.strictEqual(checklist.get('brand_safety')?.state, 'blocked')
    assert.strictEqual(checklist.get('brand_safety')?.command, '/brandreview SN0901 needs-evidence')
    assert.strictEqual(checklist.get('visuals')?.state, 'blocked')
    assert.strictEqual(checklist.get('visuals')?.command, undefined)
    assert.strictEqual(snapshot.primaryOperatorStep?.key, 'brand_safety')
    assert.strictEqual(snapshot.primaryOperatorStep?.command, '/brandreview SN0901 needs-evidence')
    assert.ok(!snapshot.nextActions.some((action) => action.includes('/imageqc') || action.includes('#gorsel')), snapshot.nextActions.join('\n'))
    assert.ok(!snapshot.nextActions.some((action) => action.includes('/redispatch') || action.includes('/shopier publish')), snapshot.nextActions.join('\n'))
  })

  await check('recorded unbranded-copy-fix provenance advances the protected-brand next step without lifting the gate', async () => {
    const snapshot = await buildProductFlowSnapshot(readyDraft({
      title: 'Nike Sneaker Siyah',
      brand: 'Nike',
      generativeGallery: [{ image: 2 }],
      imageQuality: { status: 'review', defectFlags: ['invented_logo_or_brand'] },
    }), {
      provenanceEvents: [
        {
          eventType: 'brand_safety.provenance_reviewed',
          product: 901,
          createdAt: '2026-07-25T10:00:00.000Z',
          payload: {
            decision: 'unbranded_copy_fix',
            recordedAt: '2026-07-25T10:00:00.000Z',
          },
        },
      ],
    })

    assert.strictEqual(snapshot.brandRemediation?.provenanceState, 'unbranded_copy_fix')
    assert.strictEqual(snapshot.brandRemediation?.nextSafeAction.kind, 'correct_unbranded_copy')
    assert.strictEqual(snapshot.primaryOperatorStep?.key, 'brand_safety')
    assert.strictEqual(snapshot.primaryOperatorStep?.command, undefined)
    assert.ok(snapshot.primaryOperatorStep?.detail.includes('Manually correct stored protected-brand wording'))
    assert.ok(!snapshot.nextActions.some((action) => action.includes('/brandreview') || action.includes('/imageqc') || action.includes('#gorsel')), snapshot.nextActions.join('\n'))
    assert.ok(snapshot.nextActions.some((action) => action.includes('Manually correct stored protected-brand wording')), snapshot.nextActions.join('\n'))
  })

  await check('dispatch summary counts active channel health states', async () => {
    const snapshot = await buildProductFlowSnapshot(readyDraft({
      status: 'active',
      channelTargets: ['website', 'instagram', 'shopier', 'x', 'facebook'],
      channels: {
        publishWebsite: true,
        publishInstagram: true,
        publishShopier: true,
        publishX: true,
        publishFacebook: true,
      },
      workflow: {
        ...readyDraft().workflow,
        workflowStatus: 'active',
        publishStatus: 'published',
      },
      sourceMeta: {
        dispatchNotes: JSON.stringify([
          { channel: 'instagram', eligible: true, dispatched: true, webhookConfigured: true },
          { channel: 'shopier', eligible: true, dispatched: false, webhookConfigured: true, skippedReason: 'queued-via-jobs-queue' },
          { channel: 'x', eligible: true, dispatched: false, webhookConfigured: true, error: 'credits depleted' },
          { channel: 'facebook', eligible: false, dispatched: false, webhookConfigured: false, skippedReason: 'global disabled' },
        ]),
      },
    }))

    assert.deepStrictEqual(snapshot.channels.dispatchSummary, {
      total: 5,
      published: 2,
      queued: 1,
      failed: 1,
      blocked: 1,
      preview: 0,
      unrecorded: 0,
      not_configured: 0,
      skipped: 0,
    })
    const dispatch = new Map(snapshot.channels.dispatch.map((row) => [row.channel, row]))
    assert.strictEqual(dispatch.get('instagram')?.nextAction, null)
    assert.strictEqual(dispatch.get('shopier')?.nextAction, '/shopier dashboard - verify the queued sync before any retry')
    assert.strictEqual(dispatch.get('x')?.nextAction, '/redispatch x 901 - fix the recorded failure first')
    assert.strictEqual(dispatch.get('facebook')?.nextAction, '/productflow 901 - resolve product or activation blockers before dispatch')
    const message = formatProductFlowSnapshot(snapshot)
    assert.ok(message.includes('Dispatch summary</b>: published 2/5, queued 1, failed 1, blocked 1, not configured 0, unrecorded 0'))
    assert.ok(message.includes('/redispatch x 901 - fix the recorded failure first'), message)
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
    assert.ok(snapshot.nextActions.some((action) => action.includes('/repair 901')), snapshot.nextActions.join('\n'))
    assert.ok(snapshot.nextActions.some((action) => action.includes('#gorsel 901')), snapshot.nextActions.join('\n'))
    assert.ok(snapshot.nextActions.some((action) => action.includes('/redispatch instagram 901')), snapshot.nextActions.join('\n'))
    assert.ok(snapshot.operatorChecklist.some((item) => item.key === 'visuals' && item.command === '/imageqc pass 901 approved'))
    assert.strictEqual(snapshot.channels.dispatchSummary.total, 2)
    assert.strictEqual(snapshot.channels.dispatchSummary.published, 1)
    assert.strictEqual(snapshot.channels.dispatchSummary.not_configured, 1)
    assert.strictEqual(snapshot.channels.dispatch.find((row) => row.channel === 'instagram')?.nextAction, '/diagnostics - check instagram provider health before redispatch')
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
    assert.ok(message.includes('Operator Links'), message)
    assert.ok(message.includes('/admin/collections/products/901'), message)
    assert.ok(message.includes('Primary operator step'), message)
    assert.ok(message.includes('Checklist</b>: done 6/7, next 1, blocked 0, needs work 0'), message)
    assert.ok(message.includes('Dispatch summary</b>: published 0/1, queued 0, failed 0, blocked 1, not configured 0, unrecorded 0'), message)
    assert.ok(message.includes('Operator Checklist'), message)
    assert.ok(message.includes('Reference</b>: SN0901 (action id=901)'), message)
    assert.ok(message.includes('/activate 901'), message)
  })

  console.log(`\nproductFlowSnapshot: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
})()
