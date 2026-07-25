import assert from 'node:assert'

import {
  BRAND_PROVENANCE_EVENT_TYPE,
  evaluateBrandProvenanceReview,
  formatBrandProvenanceReviewPreview,
  parseBrandProvenanceReviewCommand,
  recordBrandProvenanceReview,
} from './brandProvenanceReview'

let passed = 0

const blockedProduct = {
  id: 901,
  stockNumber: 'SN0901',
  title: 'Nike Spor Ayakkabi',
  status: 'active',
}

const checks: Array<Promise<void>> = []
function asyncCheck(name: string, fn: () => void | Promise<void>) {
  checks.push(Promise.resolve().then(() => {
    try {
      return fn()
    } catch (error) {
      throw new Error(`${name}: ${(error as Error).message}`)
    }
  }).then(() => {
    passed += 1
    console.log(`  ok - ${name}`)
  }))
}

asyncCheck('parses a preview-first provenance command and explicit confirmation', () => {
  const preview = parseBrandProvenanceReviewCommand(['SN0901', 'unbranded-copy-fix', 'invoice', 'checked'])
  assert.strictEqual(preview.decision, 'unbranded_copy_fix')
  assert.strictEqual(preview.confirmed, false)
  assert.strictEqual(preview.note, 'invoice checked')

  const confirmed = parseBrandProvenanceReviewCommand(['SN0901', 'not-approved', 'confirm', 'rights', 'unclear'])
  assert.strictEqual(confirmed.decision, 'not_approved_for_sale')
  assert.strictEqual(confirmed.confirmed, true)
  assert.strictEqual(confirmed.note, 'rights unclear')
})

asyncCheck('rejects incomplete commands and safe products', () => {
  assert.ok(parseBrandProvenanceReviewCommand(['SN0901']).error)
  assert.deepStrictEqual(evaluateBrandProvenanceReview({ id: 2, title: 'Clean Loafer' }), {
    ok: false,
    reason: 'This product does not currently have a protected-brand blocker.',
  })
})

asyncCheck('preview states that confirmation records evidence without clearing the gate', () => {
  const message = formatBrandProvenanceReviewPreview(blockedProduct, {
    ref: 'SN0901',
    decision: 'unbranded_copy_fix',
    note: 'invoice checked',
  })
  assert.ok(message.includes('/brandreview SN0901 unbranded-copy-fix confirm invoice checked'))
  assert.ok(message.includes('does not edit the product, clear the safety block, publish, redispatch, or spend'))
})

asyncCheck('records one BotEvents audit record without updating the product', async () => {
  const created: any[] = []
  const payload = {
    async create(input: any) {
      created.push(input)
      return { id: 1, ...input.data }
    },
  }

  const result = await recordBrandProvenanceReview(payload, blockedProduct, {
    decision: 'needs_evidence',
    note: 'ownership document missing',
  }, new Date('2026-07-24T12:00:00.000Z'))

  assert.deepStrictEqual(result, {
    alreadyRecorded: false,
    review: {
    decision: 'needs_evidence',
    recordedAt: '2026-07-24T12:00:00.000Z',
    note: 'ownership document missing',
    },
  })
  assert.strictEqual(created.length, 1)
  assert.strictEqual(created[0].collection, 'bot-events')
  assert.strictEqual(created[0].data.eventType, BRAND_PROVENANCE_EVENT_TYPE)
  assert.strictEqual(created[0].data.product, 901)
  assert.strictEqual(created[0].data.payload.decision, 'needs_evidence')
  assert.strictEqual(typeof payload.update, 'undefined')
})

asyncCheck('returns the existing review for a duplicate Telegram delivery without creating another event', async () => {
  const created: any[] = []
  const payload = {
    async find() {
      return {
        docs: [{
          eventType: BRAND_PROVENANCE_EVENT_TYPE,
          createdAt: '2026-07-24T12:00:00.000Z',
          payload: {
            decision: 'not_approved_for_sale',
            recordedAt: '2026-07-24T12:00:00.000Z',
            note: 'ownership unclear',
            idempotencyKey: 'telegram-update:777',
          },
        }],
      }
    },
    async create(input: any) {
      created.push(input)
      return input.data
    },
  }

  const result = await recordBrandProvenanceReview(
    payload,
    blockedProduct,
    { decision: 'not_approved_for_sale', note: 'ownership unclear' },
    new Date('2026-07-24T12:01:00.000Z'),
    { idempotencyKey: 'telegram-update:777' },
  )

  assert.deepStrictEqual(result, {
    alreadyRecorded: true,
    review: {
      decision: 'not_approved_for_sale',
      recordedAt: '2026-07-24T12:00:00.000Z',
      note: 'ownership unclear',
    },
  })
  assert.strictEqual(created.length, 0)
})

Promise.all(checks)
  .catch((error) => {
    console.error(`  fail - provenance review\n    ${(error as Error).message}`)
    process.exitCode = 1
  })
  .finally(() => {
    console.log(`\nbrandProvenanceReview: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
  })
