import assert from 'node:assert'
import { buildCatalogQaReport, formatCatalogQaReport, type CatalogQaProduct } from './catalogQa'

let passed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

function readyProduct(overrides: Partial<CatalogQaProduct> = {}): CatalogQaProduct {
  return {
    id: 1,
    title: 'Rahat Gunluk Ayakkabi',
    slug: 'rahat-gunluk-ayakkabi-sn0001',
    stockNumber: 'SN0001',
    status: 'draft',
    source: 'telegram',
    category: 'Spor',
    price: 1499,
    stockQuantity: 3,
    images: [{ image: 1 }],
    generativeGallery: [],
    channelTargets: ['website'],
    workflow: {
      workflowStatus: 'publish_ready',
      visualStatus: 'approved',
      confirmationStatus: 'confirmed',
      contentStatus: 'ready',
      auditStatus: 'approved',
      stockState: 'in_stock',
      sellable: true,
    },
    auditResult: {
      overallResult: 'approved',
      approvedForPublish: true,
    },
    sourceMeta: { shopierSyncStatus: 'not_synced' },
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T12:00:00.000Z',
    ...overrides,
  }
}

const products: CatalogQaProduct[] = [
  readyProduct(),
  {
    id: 2,
    title: 'Nike Air Spor Ayakkabi',
    status: 'draft',
    source: 'supplier_scout',
    category: '',
    price: 0,
    stockQuantity: 0,
    images: [{}],
    generativeGallery: [],
    channelTargets: ['dolap'],
    workflow: {
      workflowStatus: 'draft',
      visualStatus: 'pending',
      confirmationStatus: 'pending',
      contentStatus: 'pending',
      auditStatus: 'pending',
      stockState: 'in_stock',
      sellable: true,
    },
    auditResult: {
      overallResult: 'not_reviewed',
      approvedForPublish: false,
    },
    sourceMeta: { shopierSyncStatus: 'queued' },
    createdAt: '2026-06-14T00:00:00.000Z',
    updatedAt: '2026-06-16T10:00:00.000Z',
  },
  {
    id: 3,
    title: 'Klasik Deri Loafer',
    stockNumber: 'SN0003',
    status: 'active',
    source: 'admin',
    category: 'Klasik',
    price: 2299,
    stockQuantity: 2,
    images: [{ image: 3 }],
    generativeGallery: [],
    channelTargets: ['shopier'],
    workflow: {
      workflowStatus: 'active',
      visualStatus: 'rejected',
      confirmationStatus: 'confirmed',
      contentStatus: 'failed',
      auditStatus: 'needs_revision',
      stockState: 'in_stock',
      sellable: true,
    },
    auditResult: {
      overallResult: 'needs_revision',
      approvedForPublish: false,
    },
    sourceMeta: { shopierSyncStatus: 'error' },
    createdAt: '2026-06-19T00:00:00.000Z',
    updatedAt: '2026-06-22T08:00:00.000Z',
  },
]

const report = buildCatalogQaReport(products, {
  now: new Date('2026-06-22T12:00:00.000Z'),
  sampleLimit: 100,
  totalProducts: 300,
})

check('counts raw status, lifecycle, source, and category distributions', () => {
  assert.strictEqual(report.sampleSize, 3)
  assert.strictEqual(report.totalProducts, 300)
  assert.strictEqual(report.distributions.status.draft, 2)
  assert.strictEqual(report.distributions.status.active, 1)
  assert.strictEqual(report.distributions.lifecycle.ready_to_publish, 1)
  assert.strictEqual(report.distributions.lifecycle.needs_review, 1)
  assert.strictEqual(report.distributions.lifecycle.active, 1)
  assert.strictEqual(report.distributions.source.telegram, 1)
  assert.strictEqual(report.distributions.source.supplier_scout, 1)
  assert.strictEqual(report.distributions.category.missing, 1)
})

check('counts missing product completeness fields', () => {
  assert.strictEqual(report.missing.price, 1)
  assert.strictEqual(report.missing.category, 1)
  assert.strictEqual(report.missing.usableMedia, 1)
  assert.strictEqual(report.missing.sellableStock, 1)
  assert.strictEqual(report.missing.stockNumber, 1)
  assert.strictEqual(report.missing.slug, 2)
})

check('retired targets do not satisfy active channel targeting', () => {
  assert.strictEqual(report.missing.targets, 1)
  assert.strictEqual(report.missing.channelSelectionIssues, 1)
  assert.strictEqual(report.missing.unsupportedTargets, 1)
})

check('counts pipeline blockers and readiness levels', () => {
  assert.strictEqual(report.readiness.ready, 1)
  assert.strictEqual(report.readiness.partiallyReady, 1)
  assert.strictEqual(report.readiness.notReady, 1)
  assert.strictEqual(report.readiness.blockersByDimension.visuals, 2)
  assert.strictEqual(report.readiness.blockersByDimension.content, 2)
  assert.strictEqual(report.readiness.blockersByDimension.audit, 2)
  assert.strictEqual(report.readiness.blockersByDimension.sellable, 1)
  assert.strictEqual(report.readiness.blockersByDimension.publish_targets, 1)
})

check('counts image QC, content/audit pending, brand safety, and Shopier states', () => {
  assert.strictEqual(report.pipeline.imageQcPending, 1)
  assert.strictEqual(report.pipeline.imageQcRejected, 1)
  assert.strictEqual(report.pipeline.contentPending, 2)
  assert.strictEqual(report.pipeline.auditPending, 2)
  assert.strictEqual(report.pipeline.brandSafetyBlocked, 1)
  assert.strictEqual(report.shopier.queued, 1)
  assert.strictEqual(report.shopier.error, 1)
  assert.strictEqual(report.shopier.notSynced, 1)
})

check('computes draft age and catalog recency', () => {
  assert.strictEqual(report.draftAge.drafts, 2)
  assert.strictEqual(report.draftAge.staleOver2Days, 1)
  assert.strictEqual(report.draftAge.staleOver7Days, 1)
  assert.strictEqual(report.draftAge.oldestDraftAgeDays, 8)
  assert.strictEqual(report.recency.lastUpdatedAt, '2026-06-22T08:00:00.000Z')
  assert.strictEqual(report.recency.oldestUpdatedAt, '2026-06-16T10:00:00.000Z')
})

check('formatter includes the read-only D-356 guardrail and key counts', () => {
  const message = formatCatalogQaReport(report)
  assert.ok(message.includes('Catalog QA (D-353)'))
  assert.ok(message.includes('Read-only sample: <b>3/300</b>'))
  assert.ok(message.includes('publish-ready 1, partial 1, not-ready 1'))
  assert.ok(message.includes('queued 1'))
  assert.ok(message.includes('error 1'))
  assert.ok(message.includes('D-356'))
})

console.log(`\ncatalogQa: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
