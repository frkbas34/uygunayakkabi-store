import assert from 'node:assert'
import {
  applyImageQualityDecision,
  evaluateImageQualityGate,
  formatImageQualityMessage,
  type ImageQualityInput,
} from './imageQualityGate'

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

function product(overrides: Partial<ImageQualityInput> = {}): ImageQualityInput {
  return {
    id: 901,
    title: 'Siyah Loafer',
    images: [{ image: 1 }],
    generativeGallery: [],
    workflow: { visualStatus: 'approved', workflowStatus: 'visual_ready' },
    ...overrides,
  }
}

function fakePayload(initial: Record<string, any>) {
  let current = structuredClone(initial)
  const calls: Array<Record<string, any>> = []
  return {
    calls,
    async findByID() {
      return structuredClone(current)
    },
    async update(args: Record<string, any>) {
      calls.push(args)
      current = {
        ...current,
        ...args.data,
        workflow: args.data.workflow ? { ...(current.workflow ?? {}), ...args.data.workflow } : current.workflow,
        imageQuality: args.data.imageQuality ? { ...(current.imageQuality ?? {}), ...args.data.imageQuality } : current.imageQuality,
      }
      return structuredClone(current)
    },
  }
}

void (async () => {
  await check('original-only product passes without generated-image QC', () => {
    const result = evaluateImageQualityGate(product())
    assert.strictEqual(result.level, 'pass')
    assert.strictEqual(result.publishable, true)
    assert.strictEqual(result.detail.includes('Original-only'), true)
  })

  await check('generated images require explicit QC PASS', () => {
    const result = evaluateImageQualityGate(product({
      images: [],
      generativeGallery: [{ image: 10 }, { image: 11 }],
    }))

    assert.strictEqual(result.level, 'review')
    assert.strictEqual(result.publishable, false)
    assert.ok(result.blockers.some((blocker) => blocker.includes('explicit QC PASS')))
  })

  await check('explicit PASS makes generated images publishable', () => {
    const result = evaluateImageQualityGate(product({
      images: [],
      generativeGallery: [{ image: 10 }],
      imageQuality: { status: 'pass' },
    }))

    assert.strictEqual(result.level, 'pass')
    assert.strictEqual(result.publishable, true)
    assert.deepStrictEqual(result.blockers, [])
  })

  await check('explicit REVIEW and FAIL block publishing with defect detail', () => {
    const review = evaluateImageQualityGate(product({
      generativeGallery: [{ image: 10 }],
      imageQuality: { status: 'review', defectFlags: ['color_drift'] },
    }))
    const fail = evaluateImageQualityGate(product({
      generativeGallery: [{ image: 10 }],
      imageQuality: { status: 'fail', defectFlags: ['invented_logo_or_brand'] },
    }))

    assert.strictEqual(review.level, 'review')
    assert.strictEqual(review.publishable, false)
    assert.ok(review.detail.includes('color_drift'))
    assert.strictEqual(fail.level, 'fail')
    assert.strictEqual(fail.publishable, false)
    assert.ok(fail.detail.includes('invented_logo_or_brand'))
  })

  await check('visualStatus rejected is a hard image QC fail', () => {
    const result = evaluateImageQualityGate(product({
      workflow: { visualStatus: 'rejected' },
    }))

    assert.strictEqual(result.level, 'fail')
    assert.strictEqual(result.publishable, false)
  })

  await check('formatter explains PASS requirement for generated images', () => {
    const result = evaluateImageQualityGate(product({
      images: [],
      generativeGallery: [{ image: 10 }],
    }))
    const message = formatImageQualityMessage(product({ generativeGallery: [{ image: 10 }] }), result)

    assert.ok(message.includes('Image QC (D-355)'))
    assert.ok(message.includes('PASS is required'))
  })

  await check('applyImageQualityDecision writes metadata only and rejects workflow on FAIL', async () => {
    const payload = fakePayload({
      id: 901,
      title: 'Siyah Loafer',
      generativeGallery: [{ image: 10 }],
      workflow: { visualStatus: 'approved', workflowStatus: 'visual_ready' },
    })

    const applied = await applyImageQualityDecision(payload as any, 901, 'fail', {
      defectFlags: ['deformed_toe_or_heel'],
      notes: 'toe shape drift',
      checkedBy: '42',
      source: 'test',
      now: new Date('2026-06-28T12:00:00.000Z'),
    })

    assert.strictEqual(applied.result.level, 'fail')
    assert.strictEqual(payload.calls.length, 1)
    assert.strictEqual(payload.calls[0].context.isDispatchUpdate, true)
    assert.strictEqual(payload.calls[0].data.imageQuality.status, 'fail')
    assert.deepStrictEqual(payload.calls[0].data.imageQuality.defectFlags, ['deformed_toe_or_heel'])
    assert.strictEqual(payload.calls[0].data.imageQuality.checkedAt, '2026-06-28T12:00:00.000Z')
    assert.strictEqual(payload.calls[0].data.workflow.visualStatus, 'rejected')
  })

  console.log(`\nimageQualityGate: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
})()
