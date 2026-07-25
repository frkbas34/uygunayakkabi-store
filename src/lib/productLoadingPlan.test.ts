import assert from 'node:assert'
import {
  buildProductLoadingPlan,
  formatProductLoadingPlan,
  type ProductLoadingPlanAction,
} from './productLoadingPlan'
import type { CatalogQaProduct } from './catalogQa'
import type { CategoryFillTarget } from './categoryFill'

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

const targets: CategoryFillTarget[] = [
  { category: 'Klasik', label: 'Classic / loafer', priority: 'core', targetMin: 3, targetMax: 5, note: 'test core' },
  { category: 'Spor', label: 'Sneaker / sport', priority: 'core', targetMin: 3, targetMax: 5, note: 'test core' },
  { category: 'Bot', label: 'Boot / winter', priority: 'seasonal', targetMin: 2, targetMax: 3, note: 'test seasonal' },
]

function readyProduct(overrides: Partial<CatalogQaProduct> = {}): CatalogQaProduct {
  return {
    id: 1,
    title: 'Clean Loafer',
    slug: 'clean-loafer-sn0001',
    stockNumber: 'SN0001',
    status: 'draft',
    source: 'telegram',
    category: 'Klasik',
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
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
    ...overrides,
  }
}

function activeProduct(id: number, category: string): CatalogQaProduct {
  return readyProduct({
    id,
    category,
    status: 'active',
    workflow: {
      ...readyProduct().workflow,
      workflowStatus: 'active',
    },
  })
}

function draftProduct(overrides: Partial<CatalogQaProduct> = {}): CatalogQaProduct {
  return {
    id: 99,
    title: 'Missing Draft',
    status: 'draft',
    source: 'admin',
    category: 'Spor',
    price: 0,
    stockQuantity: 0,
    images: [],
    generativeGallery: [],
    channelTargets: ['website'],
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
    sourceMeta: { shopierSyncStatus: 'missing' },
    createdAt: '2026-06-20T00:00:00.000Z',
    updatedAt: '2026-06-20T00:00:00.000Z',
    ...overrides,
  }
}

const products: CatalogQaProduct[] = [
  activeProduct(1, 'Klasik'),
  readyProduct({ id: 2, category: 'Klasik' }),
  draftProduct({
    id: 3,
    title: 'Nike Sport Shoe',
    category: 'Spor',
    stockNumber: '',
    channelTargets: ['website'],
    sourceMeta: { shopierSyncStatus: 'error' },
  }),
  draftProduct({
    id: 4,
    title: 'Generated Image Product',
    category: 'Bot',
    price: 1200,
    stockQuantity: 2,
    stockNumber: 'SN0004',
    slug: 'generated-image-product-sn0004',
    images: [],
    generativeGallery: [{ image: 4 }],
    workflow: {
      ...draftProduct().workflow,
      visualStatus: 'pending',
      contentStatus: 'ready',
      auditStatus: 'approved',
    },
    auditResult: {
      overallResult: 'approved',
      approvedForPublish: true,
    },
  }),
]

const plan = buildProductLoadingPlan(products, {
  now: new Date('2026-07-03T12:00:00.000Z'),
  sampleLimit: 50,
  totalProducts: 100,
  categoryTargets: targets,
})

function action(kind: ProductLoadingPlanAction['kind']): ProductLoadingPlanAction {
  const found = plan.actions.find((item) => item.kind === kind)
  assert.ok(found, `missing action ${kind}`)
  return found
}

check('builds catalog and category snapshots from one read-only sample', () => {
  assert.strictEqual(plan.sampleSize, 4)
  assert.strictEqual(plan.sampleLimit, 50)
  assert.strictEqual(plan.totalProducts, 100)
  assert.strictEqual(plan.catalog.pipeline.brandSafetyBlocked, 1)
  assert.strictEqual(plan.catalog.shopier.error, 1)
  assert.strictEqual(plan.categoryFill.loadingOrder[0]?.category, 'Spor')
})

check('prioritizes brand safety, image QC, Shopier errors, and category loading', () => {
  assert.strictEqual(plan.actions[0]?.kind, 'brand_safety')
  assert.strictEqual(plan.actions[0]?.suggestedCommand, '/brandplan')
  assert.strictEqual(plan.actions[0]?.priority, 'critical')
  assert.strictEqual(action('image_qc').priority, 'high')
  assert.strictEqual(action('shopier_errors').suggestedCommand, '/shopier errors')
  assert.strictEqual(action('load_more').category, 'Spor')
})

check('adds catalog hygiene and stale draft actions when completeness is weak', () => {
  assert.ok(action('catalog_hygiene').count && action('catalog_hygiene').count > 0)
  assert.strictEqual(action('stale_drafts').count, 2)
})

check('builds a prioritized first product worklist without writes', () => {
  assert.ok(plan.worklist.length >= 2)
  assert.strictEqual(plan.worklist[0]?.ref, '3')
  assert.strictEqual(plan.worklist[0]?.priority, 'critical')
  assert.strictEqual(plan.worklist[0]?.status, 'draft')
  assert.ok(plan.worklist[0]?.reasons.includes('brand_safety'))
  assert.ok(plan.worklist[0]?.reasons.includes('shopier_error'))
  assert.ok(plan.worklist[0]?.operatorLinks.adminUrl?.endsWith('/admin/collections/products/3'), String(plan.worklist[0]?.operatorLinks.adminUrl))
  assert.strictEqual(plan.worklist[0]?.operatorLinks.productUrl, null)
  assert.strictEqual(plan.worklist[0]?.flowCommand, '/productflow 3')
  assert.strictEqual(
    plan.worklist[0]?.runtimeFlowCommand,
    'npm run smoke:product-flow:read -- --product=3 --confirm-read-only',
  )
  assert.strictEqual(plan.worklist[1]?.ref, 'SN0004')
  assert.ok(plan.worklist[1]?.reasons.includes('image_qc_pending'))
  assert.strictEqual(plan.worklist[1]?.suggestedCommand, '/imageqc SN0004')
  assert.ok(plan.worklist[1]?.operatorLinks.adminUrl?.endsWith('/admin/collections/products/4'), String(plan.worklist[1]?.operatorLinks.adminUrl))
  assert.strictEqual(plan.worklist[1]?.operatorLinks.productUrl, null)
  assert.strictEqual(plan.worklist[1]?.flowCommand, '/productflow SN0004')
  assert.strictEqual(
    plan.worklist[1]?.runtimeFlowCommand,
    'npm run smoke:product-flow:read -- --product=SN0004 --confirm-read-only',
  )
})

check('prioritizes active protected-brand exposure ahead of a draft with more secondary blockers', () => {
  const exposurePlan = buildProductLoadingPlan([
    draftProduct({
      id: 51,
      title: 'Nike Draft With Multiple Gaps',
      stockNumber: 'SN0051',
      sourceMeta: { shopierSyncStatus: 'error' },
    }),
    readyProduct({
      id: 52,
      title: 'Nike Active Exposure',
      stockNumber: 'SN0052',
      slug: 'nike-active-exposure-sn0052',
      status: 'active',
      workflow: {
        ...readyProduct().workflow,
        workflowStatus: 'active',
      },
    }),
  ], {
    now: new Date('2026-07-03T12:00:00.000Z'),
    categoryTargets: targets,
  })

  assert.strictEqual(exposurePlan.worklist[0]?.ref, 'SN0052')
  assert.strictEqual(exposurePlan.worklist[0]?.status, 'active')
  assert.ok(exposurePlan.worklist[0]?.reasons.includes('brand_safety'))
  assert.strictEqual(exposurePlan.batchSummary.firstFlowCommand, '/productflow SN0052')
})

check('summarizes worklist priority, blockers, and first commands', () => {
  assert.strictEqual(plan.batchSummary.totalCandidates, 2)
  assert.strictEqual(plan.batchSummary.priorityCounts.critical, 1)
  assert.strictEqual(plan.batchSummary.priorityCounts.high, 1)
  assert.strictEqual(plan.batchSummary.priorityCounts.medium, 0)
  assert.strictEqual(plan.batchSummary.blockerCounts.brandSafety, 1)
  assert.strictEqual(plan.batchSummary.blockerCounts.imageQc, 2)
  assert.strictEqual(plan.batchSummary.blockerCounts.shopierErrors, 1)
  assert.strictEqual(plan.batchSummary.blockerCounts.missingCore, 1)
  assert.strictEqual(plan.batchSummary.blockerCounts.staleDrafts, 2)
  assert.strictEqual(plan.batchSummary.blockerCounts.backlog, 0)
  assert.strictEqual(plan.batchSummary.firstCommand, '/imageqc 3')
  assert.strictEqual(plan.batchSummary.firstFlowCommand, '/productflow 3')
  assert.strictEqual(
    plan.batchSummary.firstRuntimeFlowCommand,
    'npm run smoke:product-flow:read -- --product=3 --confirm-read-only',
  )
  assert.strictEqual(plan.batchSummary.focus.kind, 'brand_safety')
  assert.strictEqual(plan.batchSummary.focus.label, 'Brand-safety cleanup')
  assert.strictEqual(plan.batchSummary.focus.nextSafeRead, '/productflow 3')
  assert.deepStrictEqual(plan.batchSummary.focus.refs, ['3'])
  assert.deepStrictEqual(plan.batchSummary.focus.nextSafeReads, ['/productflow 3'])
  assert.deepStrictEqual(plan.batchSummary.focus.queue, [{
    ref: '3',
    command: '/productflow 3',
    reasons: ['brand_safety', 'image_qc_pending', 'shopier_error', 'missing_core', 'stale_draft'],
  }])
  assert.ok(plan.batchSummary.focus.reason.includes('1 worklist product(s)'))
})

check('formatter is operator friendly and refuses mutation surfaces', () => {
  const message = formatProductLoadingPlan(plan)
  assert.ok(message.includes('Product Loading Plan (D-387/D-457)'))
  assert.ok(message.includes('Read-only sample: <b>4/100</b>'))
  assert.ok(message.includes('Batch Summary'))
  assert.ok(message.includes('candidates 2, critical 1, high 1, medium 0'))
  assert.ok(message.includes('blockers: brand 1, image 2, Shopier 1, core 1, stale 2, backlog 0'))
  assert.ok(message.includes('focus: <b>Brand-safety cleanup</b>'))
  assert.ok(message.includes('next safe read: <code>/productflow 3</code>'))
  assert.ok(message.includes('focus refs: <code>3</code>'))
  assert.ok(message.includes('focus queue: <code>/productflow 3</code>'))
  assert.ok(message.includes('focus detail: <b>3</b> - brand, image review, Shopier error, missing core, stale draft'))
  assert.ok(message.includes('first: <code>/imageqc 3</code>; flow <code>/productflow 3</code>'))
  assert.ok(message.includes('Clear brand-safety blockers'))
  assert.ok(message.includes('Category Load Order'))
  assert.ok(message.includes('First Product Worklist'))
  assert.ok(message.includes('[high; draft]'))
  assert.ok(message.includes('<b>SN0004</b> Generated Image Product'))
  assert.ok(message.includes('flow <code>/productflow SN0004</code>'))
  assert.ok(message.includes('smoke <code>npm run smoke:product-flow:read -- --product=SN0004 --confirm-read-only</code>'))
  assert.ok(message.includes('links: <a href="https://www.uygunayakkabi.com/admin/collections/products/4">admin</a>'))
  assert.ok(message.includes('No SupplierScout'))
  assert.ok(message.includes('no retired channels'))
  assert.ok(message.includes('no publish'))
  assert.ok(message.includes('no ads'))
})

check('worklist links include public PDP only for public storefront-safe products', () => {
  const publicPlan = buildProductLoadingPlan([
    readyProduct({
      id: 44,
      status: 'active',
      title: 'Public Image Review',
      slug: 'public-image-review-sn0044',
      stockNumber: 'SN0044',
      images: [],
      generativeGallery: [{ image: 44 }],
      imageQuality: { status: 'review' },
      workflow: {
        ...readyProduct().workflow,
        workflowStatus: 'active',
        visualStatus: 'pending',
      },
    } as any),
  ], {
    now: new Date('2026-07-03T12:00:00.000Z'),
    categoryTargets: targets,
  })

  const item = publicPlan.worklist[0]
  assert.strictEqual(item?.ref, 'SN0044')
  assert.ok(item?.operatorLinks.adminUrl?.endsWith('/admin/collections/products/44'), String(item?.operatorLinks.adminUrl))
  assert.ok(item?.operatorLinks.productUrl?.endsWith('/products/public-image-review-sn0044'), String(item?.operatorLinks.productUrl))
  assert.ok(formatProductLoadingPlan(publicPlan).includes('PDP</a>'))

  const blockedPlan = buildProductLoadingPlan([
    readyProduct({
      id: 45,
      status: 'active',
      title: 'Nike Image Review',
      slug: 'nike-image-review-sn0045',
      stockNumber: 'SN0045',
      images: [],
      generativeGallery: [{ image: 45 }],
      imageQuality: { status: 'review' },
      workflow: {
        ...readyProduct().workflow,
        workflowStatus: 'active',
        visualStatus: 'pending',
      },
    } as any),
  ], {
    now: new Date('2026-07-03T12:00:00.000Z'),
    categoryTargets: targets,
  })
  const blockedItem = blockedPlan.worklist.find((entry) => entry.ref === 'SN0045')
  assert.ok(blockedItem)
  assert.strictEqual(blockedItem?.operatorLinks.productUrl, null)
})

check('falls back to live smoke when the sample has no local loading blockers', () => {
  const clean = buildProductLoadingPlan(
    [
      activeProduct(10, 'Klasik'),
      activeProduct(11, 'Klasik'),
      activeProduct(12, 'Klasik'),
      activeProduct(20, 'Spor'),
      activeProduct(21, 'Spor'),
      activeProduct(22, 'Spor'),
      activeProduct(30, 'Bot'),
      activeProduct(31, 'Bot'),
    ],
    {
      now: new Date('2026-07-03T12:00:00.000Z'),
      categoryTargets: targets,
    },
  )
  assert.deepStrictEqual(clean.actions.map((item) => item.kind), ['live_smoke'])
  assert.strictEqual(clean.actions[0]?.suggestedCommand, '/productflow <sn-or-id>')
  assert.strictEqual(clean.batchSummary.focus.kind, 'live_smoke')
  assert.strictEqual(clean.batchSummary.focus.nextSafeRead, '/smokeplan')
  assert.deepStrictEqual(clean.batchSummary.focus.refs, [])
  assert.deepStrictEqual(clean.batchSummary.focus.nextSafeReads, [])
  assert.deepStrictEqual(clean.batchSummary.focus.queue, [])
})

console.log(`\nproductLoadingPlan: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
