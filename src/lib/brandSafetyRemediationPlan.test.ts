import assert from 'node:assert'
import {
  buildBrandSafetyRemediationPlan,
  formatBrandSafetyRemediationPlan,
  type BrandSafetyPlanProduct,
} from './brandSafetyRemediationPlan'
import { BRAND_PROVENANCE_EVENT_TYPE } from './brandProvenanceReview'

let passed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (error) {
    console.error(`  fail - ${name}\n    ${(error as Error).message}`)
    process.exitCode = 1
  }
}

const products: BrandSafetyPlanProduct[] = [
  {
    id: 901,
    stockNumber: 'SN0901',
    title: 'Nike original Spor Ayakkabi',
    slug: 'nike-original-spor-ayakkabi-sn0901',
    status: 'active',
    workflow: { workflowStatus: 'active' },
    sourceMeta: {
      dispatchNotes: JSON.stringify([
        { channel: 'facebook', eligible: true, dispatched: true, webhookConfigured: true },
        { channel: 'shopier', eligible: true, dispatched: false, webhookConfigured: true, skippedReason: 'queued-via-jobs-queue' },
        { channel: 'x', eligible: true, dispatched: false, webhookConfigured: true, error: 'credits depleted' },
        { channel: 'website', eligible: true, dispatched: true, webhookConfigured: true },
      ]),
    },
  },
  {
    id: 902,
    stockNumber: 'SN0902',
    title: 'BOSS Gunluk Ayakkabi',
    slug: 'boss-gunluk-ayakkabi-sn0902',
    status: 'draft',
    workflow: { workflowStatus: 'draft' },
  },
  {
    id: 903,
    stockNumber: 'SN0903',
    title: 'Rahat Gunluk Ayakkabi',
    status: 'draft',
    workflow: { workflowStatus: 'draft' },
    content: { commercePack: { websiteDescription: 'logo detayli rahat model' } },
  },
]

const plan = buildBrandSafetyRemediationPlan(products, {
  now: new Date('2026-07-24T12:00:00.000Z'),
  sampleLimit: 100,
  totalProducts: 120,
})

check('includes protected-brand products but excludes claim-only warnings', () => {
  assert.strictEqual(plan.blockedCount, 2)
  assert.deepStrictEqual(plan.items.map((item) => item.ref), ['SN0901', 'SN0902'])
  assert.strictEqual(plan.severityCounts.critical, 1)
  assert.strictEqual(plan.severityCounts.high, 1)
  assert.strictEqual(plan.brandCounts.Nike, 1)
  assert.strictEqual(plan.brandCounts.BOSS, 1)
})

check('ranks active critical exposure ahead of draft blockers', () => {
  assert.strictEqual(plan.items[0]?.status, 'active')
  assert.strictEqual(plan.items[0]?.severity, 'critical')
  assert.ok(plan.items[0]?.recommendation.includes('prior dispatch visibility'))
})

check('summarizes recorded external dispatch states without treating website as an external channel', () => {
  assert.deepStrictEqual(plan.items[0]?.externalExposure, {
    published: ['facebook'],
    queued: ['shopier'],
    failed: ['x'],
  })
  assert.ok(plan.items[0]?.recommendation.includes('published=facebook; queued=shopier; failed=x'))
  assert.strictEqual(plan.externalExposureCount, 1)
  assert.strictEqual(plan.provenanceCounts.not_recorded, 2)
  assert.strictEqual(plan.items[0]?.provenanceState, 'not_recorded')
  assert.strictEqual(plan.items[0]?.nextSafeAction.kind, 'verify_external_records')
  assert.strictEqual(plan.items[0]?.nextSafeAction.previewCommand, '/brandreview SN0901 needs-evidence')
  assert.strictEqual(plan.items[1]?.nextSafeAction.kind, 'record_provenance')
})

check('keeps admin links but withholds PDP links for storefront-blocked brand items', () => {
  assert.ok(plan.items[0]?.operatorLinks.adminUrl?.endsWith('/admin/collections/products/901'))
  assert.strictEqual(plan.items[0]?.operatorLinks.productUrl, null)
  assert.ok(plan.items[1]?.operatorLinks.adminUrl?.endsWith('/admin/collections/products/902'))
  assert.strictEqual(plan.items[1]?.operatorLinks.productUrl, null)
})

check('formats a read-only operator queue without mutation commands', () => {
  const message = formatBrandSafetyRemediationPlan(plan)
  assert.ok(message.includes('Brand-Safety Remediation Plan (D-466)'))
  assert.ok(message.includes('/productflow SN0901'))
  assert.ok(message.includes('/brandreview &lt;id-or-sn&gt;'))
  assert.ok(message.includes('external dispatch record: published=facebook; queued=shopier; failed=x'))
  assert.ok(message.includes('Provenance: not_recorded 2'))
  assert.ok(message.includes('Recorded external exposure: <b>1</b>'))
  assert.ok(message.includes('next safe step: Manually verify the recorded external state'))
  assert.ok(message.includes('/brandreview SN0901 needs-evidence'))
  assert.ok(message.includes('Do not auto-rewrite, activate, publish, redispatch, or advertise'))
  assert.ok(!message.includes('/activate '))
  assert.ok(!message.includes('/redispatch '))
})

check('shows only the latest valid provenance review for each blocked product', () => {
  const reviewed = buildBrandSafetyRemediationPlan(products, {
    now: new Date('2026-07-24T12:00:00.000Z'),
    provenanceEvents: [
      {
        eventType: BRAND_PROVENANCE_EVENT_TYPE,
        product: 901,
        createdAt: '2026-07-20T10:00:00.000Z',
        payload: { decision: 'needs_evidence', recordedAt: '2026-07-20T10:00:00.000Z' },
      },
      {
        eventType: BRAND_PROVENANCE_EVENT_TYPE,
        product: { id: 901 },
        createdAt: '2026-07-21T10:00:00.000Z',
        payload: { decision: 'not_approved_for_sale', recordedAt: '2026-07-21T10:00:00.000Z' },
      },
      {
        eventType: BRAND_PROVENANCE_EVENT_TYPE,
        product: 902,
        payload: { decision: 'not-a-real-decision', recordedAt: '2026-07-22T10:00:00.000Z' },
      },
    ],
  })

  assert.deepStrictEqual(reviewed.items[0]?.provenanceReview, {
    decision: 'not_approved_for_sale',
    recordedAt: '2026-07-21T10:00:00.000Z',
    note: null,
  })
  assert.strictEqual(reviewed.items[1]?.provenanceReview, null)
  assert.ok(formatBrandSafetyRemediationPlan(reviewed).includes('review not approved for sale at 2026-07-21T10:00'))
  assert.strictEqual(reviewed.provenanceCounts.not_approved_for_sale, 1)
  assert.strictEqual(reviewed.items[0]?.nextSafeAction.kind, 'verify_external_records')
})

check('classifies recorded provenance decisions into safe manual next steps', () => {
  const classified = buildBrandSafetyRemediationPlan(products, {
    provenanceEvents: [
      {
        eventType: BRAND_PROVENANCE_EVENT_TYPE,
        product: 902,
        createdAt: '2026-07-22T10:00:00.000Z',
        payload: { decision: 'unbranded_copy_fix', recordedAt: '2026-07-22T10:00:00.000Z' },
      },
    ],
  })

  assert.strictEqual(classified.provenanceCounts.unbranded_copy_fix, 1)
  assert.strictEqual(classified.items[1]?.provenanceState, 'unbranded_copy_fix')
  assert.strictEqual(classified.items[1]?.nextSafeAction.kind, 'correct_unbranded_copy')
  assert.strictEqual(classified.items[1]?.nextSafeAction.previewCommand, null)
})

console.log(`\nbrandSafetyRemediationPlan: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
