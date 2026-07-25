import assert from 'node:assert'
import {
  buildImageRegenerationPlan,
  formatImageRegenerationPlan,
  type ImageRegenerationProductInput,
} from './imageRegenerationPlan'

let passed = 0

function check(name: string, fn: () => void): void {
  try {
    fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

function product(overrides: Partial<ImageRegenerationProductInput> = {}): ImageRegenerationProductInput {
  return {
    id: 404,
    stockNumber: 'SN0404',
    title: 'Black Leather Loafer',
    images: [{ image: 1 }],
    generativeGallery: [],
    workflow: { visualStatus: 'approved', workflowStatus: 'visual_ready' },
    ...overrides,
  }
}

check('original-only products have no required regeneration action', () => {
  const plan = buildImageRegenerationPlan(product())

  assert.strictEqual(plan.state, 'pass_no_action')
  assert.strictEqual(plan.severity, 'none')
  assert.ok(plan.summary.includes('No Image QC block'))
  assert.ok(plan.suggestedCommands.includes('#gorsel SN0404'))
})

check('generated images without PASS require a QC decision before publish', () => {
  const plan = buildImageRegenerationPlan(product({
    images: [],
    generativeGallery: [{ image: 10 }, { image: 11 }],
    workflow: { visualStatus: 'preview' },
  }))

  assert.strictEqual(plan.state, 'qc_decision_needed')
  assert.strictEqual(plan.severity, 'medium')
  assert.ok(plan.nextActions.some((action) => action.includes('Record a human QC decision')))
  assert.ok(plan.suggestedCommands.includes('/imageqc pass SN0404 approved'))
})

check('protected-brand products require provenance before image QC or generation', () => {
  const plan = buildImageRegenerationPlan(product({
    title: 'Nike Sneaker Siyah',
    brand: 'Nike',
    generativeGallery: [{ image: 10 }],
    imageQuality: { status: 'review', defectFlags: ['invented_logo_or_brand'] },
  }))

  assert.strictEqual(plan.state, 'brand_review_first')
  assert.strictEqual(plan.severity, 'blocked')
  assert.deepStrictEqual(plan.suggestedCommands, ['/brandreview SN0404 needs-evidence', '/productflow SN0404'])
  assert.ok(!plan.nextActions.some((action) => action.includes('/imageqc') || action.includes('#gorsel')), plan.nextActions.join('\n'))
  assert.ok(formatImageRegenerationPlan(plan).includes('Brand safety</b>: blocked - Nike'))
})

check('recorded provenance advances protected-brand image diagnostics without suggesting a new review or image action', () => {
  const plan = buildImageRegenerationPlan(product({
    title: 'Nike Sneaker Siyah',
    brand: 'Nike',
    generativeGallery: [{ image: 10 }],
    imageQuality: { status: 'review', defectFlags: ['invented_logo_or_brand'] },
  }), [], {
    provenanceEvents: [
      {
        eventType: 'brand_safety.provenance_reviewed',
        product: 404,
        createdAt: '2026-07-25T10:00:00.000Z',
        payload: {
          decision: 'not_approved_for_sale',
          recordedAt: '2026-07-25T10:00:00.000Z',
        },
      },
    ],
  })

  assert.strictEqual(plan.brandRemediation?.provenanceState, 'not_approved_for_sale')
  assert.strictEqual(plan.brandRemediation?.nextSafeAction.kind, 'keep_excluded')
  assert.deepStrictEqual(plan.suggestedCommands, ['/productflow SN0404'])
  assert.ok(!plan.nextActions.some((action) => action.includes('/brandreview') || action.includes('/imageqc') || action.includes('#gorsel')), plan.nextActions.join('\n'))
  assert.ok(plan.nextActions.some((action) => action.includes('Keep the product excluded')), plan.nextActions.join('\n'))
})

check('review status points to explicit pass/fail or regeneration commands', () => {
  const plan = buildImageRegenerationPlan(product({
    generativeGallery: [{ image: 10 }],
    imageQuality: { status: 'review', defectFlags: ['color_drift'] },
  }))

  assert.strictEqual(plan.state, 'review_needs_decision')
  assert.ok(plan.summary.includes('REVIEW'))
  assert.ok(plan.suggestedCommands.includes('/imageqc fail SN0404 reason'))
  assert.ok(plan.suggestedCommands.includes('#gorsel SN0404'))
})

check('failed or rejected visuals recommend regeneration without queueing it', () => {
  const plan = buildImageRegenerationPlan(product({
    generativeGallery: [{ image: 10 }],
    workflow: { visualStatus: 'rejected' },
    imageQuality: { status: 'fail', defectFlags: ['invented_logo_or_brand'] },
  }))

  assert.strictEqual(plan.state, 'regenerate_recommended')
  assert.strictEqual(plan.severity, 'high')
  assert.ok(plan.nextActions.some((action) => action.includes('#gorsel SN0404')))
  assert.ok(plan.guardrails.some((guardrail) => guardrail.includes('No provider calls')))
})

check('active generation job asks the operator to wait for preview', () => {
  const plan = buildImageRegenerationPlan(
    product({ workflow: { visualStatus: 'generating' } }),
    [{ id: 77, status: 'generating', generatedImages: [] }],
  )

  assert.strictEqual(plan.state, 'generation_running')
  assert.strictEqual(plan.latestJob?.id, 77)
  assert.ok(plan.nextActions[0]?.includes('Wait for the preview'))
  assert.deepStrictEqual(plan.suggestedCommands, ['/productflow SN0404'])
})

check('preview job prioritizes approve or regenerate text commands', () => {
  const plan = buildImageRegenerationPlan(
    product({ workflow: { visualStatus: 'preview' } }),
    [{ id: 78, status: 'preview', generatedImages: [1, 2, 3] }],
  )

  assert.strictEqual(plan.state, 'preview_needs_operator')
  assert.strictEqual(plan.latestJob?.generatedCount, 3)
  assert.ok(plan.suggestedCommands.includes('onayla 1,2,3'))
  assert.ok(plan.suggestedCommands.includes('yeniden uret'))
})

check('formatter is Telegram friendly and keeps the local-only boundary explicit', () => {
  const message = formatImageRegenerationPlan(buildImageRegenerationPlan(product({
    generativeGallery: [{ image: 10 }],
    imageQuality: { status: 'review', defectFlags: ['color_drift'] },
  })))

  assert.ok(message.includes('Image Regeneration Plan (D-404)'))
  assert.ok(message.includes('Read-only: no writes, no provider calls, no queues, no publish.'))
  assert.ok(message.includes('<code>/imageqc pass SN0404 approved</code>'))
  assert.ok(message.includes('No provider calls, image-generation queues, publish jobs, Shopier calls'))
})

console.log(`\nimageRegenerationPlan: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
