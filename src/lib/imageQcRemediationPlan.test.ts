import assert from 'node:assert'
import {
  buildImageQcRemediationPlan,
  formatImageQcRemediationPlan,
  type ImageQcRemediationProduct,
} from './imageQcRemediationPlan'

let passed = 0

function check(name: string, fn: () => void): void {
  try {
    fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (error) {
    console.error(`  fail - ${name}\n    ${(error as Error).message}`)
    process.exitCode = 1
  }
}

const products: ImageQcRemediationProduct[] = [
  {
    id: 901,
    stockNumber: 'SN0901',
    title: 'Nike Sneaker',
    status: 'active',
    images: [{ image: 1 }],
    generativeGallery: [{ image: 11 }],
    imageQuality: { status: 'fail', defectFlags: ['invented_logo_or_brand'] },
  },
  {
    id: 902,
    stockNumber: 'SN0902',
    title: 'Black Leather Loafer',
    status: 'draft',
    images: [],
    generativeGallery: [],
  },
  {
    id: 903,
    stockNumber: 'SN0903',
    title: 'White Daily Sneaker',
    status: 'draft',
    images: [{ image: 3 }],
    generativeGallery: [{ image: 13 }],
    imageQuality: { status: 'review', defectFlags: ['color_drift'] },
  },
  {
    id: 904,
    stockNumber: 'SN0904',
    title: 'Tan Loafer',
    status: 'draft',
    images: [{ image: 4 }],
    generativeGallery: [{ image: 14 }],
  },
  {
    id: 905,
    stockNumber: 'SN0905',
    title: 'Clean Original Loafer',
    status: 'draft',
    images: [{ image: 5 }],
    generativeGallery: [],
  },
]

const plan = buildImageQcRemediationPlan(products, {
  now: new Date('2026-07-25T12:00:00.000Z'),
  sampleLimit: 100,
  totalProducts: 120,
})

check('includes only products that need image remediation', () => {
  assert.strictEqual(plan.queueCount, 4)
  assert.deepStrictEqual(plan.items.map((item) => item.ref), ['SN0901', 'SN0902', 'SN0903', 'SN0904'])
  assert.strictEqual(plan.stateCounts.brand_review_first, 1)
  assert.strictEqual(plan.stateCounts.needs_original_media, 1)
  assert.strictEqual(plan.stateCounts.qc_review, 1)
  assert.strictEqual(plan.stateCounts.qc_decision_needed, 1)
})

check('sends protected-brand rows to provenance review before image work', () => {
  const item = plan.items[0]
  assert.strictEqual(item?.state, 'brand_review_first')
  assert.deepStrictEqual(item?.blockedBrands, ['Nike'])
  assert.ok(item?.nextSafeStep.includes('provenance'))
  assert.strictEqual(item?.imagePlanCommand, '/imageplan SN0901')
})

check('creates image-safe read-only handoffs for no-media, review, and pending cases', () => {
  assert.strictEqual(plan.items[1]?.state, 'needs_original_media')
  assert.strictEqual(plan.items[2]?.state, 'qc_review')
  assert.strictEqual(plan.items[3]?.state, 'qc_decision_needed')
  assert.strictEqual(plan.items[2]?.runtimeImagePlanCommand, 'npm run smoke:image-plan:read -- --product=SN0903 --confirm-read-only')
})

check('formats an operator queue without generation or QC mutation commands', () => {
  const message = formatImageQcRemediationPlan(plan)
  assert.ok(message.includes('Image QC Remediation Queue (D-499)'))
  assert.ok(message.includes('Brand review first: <b>1</b>'))
  assert.ok(message.includes('/imageplan SN0903'))
  assert.ok(message.includes('/productflow SN0904'))
  assert.ok(message.includes('Do not generate, approve, reject, activate, publish'))
  assert.ok(!message.includes('#gorsel SN0903'))
  assert.ok(!message.includes('/imageqc pass SN0903'))
})

console.log(`\nimageQcRemediationPlan: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
