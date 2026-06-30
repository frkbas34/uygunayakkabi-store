import assert from 'node:assert'
import {
  buildCategoryFillReport,
  CATEGORY_FILL_TARGETS,
  formatCategoryFillReport,
  isActiveCategoryFillCategory,
  type CategoryFillProduct,
  type CategoryFillTarget,
} from './categoryFill'

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

const testTargets: CategoryFillTarget[] = [
  { category: 'Klasik', label: 'Classic / loafer', priority: 'core', targetMin: 4, targetMax: 6, note: 'test core' },
  { category: 'Spor', label: 'Sneaker / sport', priority: 'core', targetMin: 4, targetMax: 6, note: 'test core' },
  { category: 'Günlük', label: 'Daily', priority: 'core', targetMin: 3, targetMax: 5, note: 'test core' },
  { category: 'Bot', label: 'Boot / winter', priority: 'seasonal', targetMin: 2, targetMax: 3, note: 'test seasonal' },
  { category: 'Terlik', label: 'Slipper / sandal', priority: 'seasonal', targetMin: 1, targetMax: 2, note: 'test seasonal' },
  { category: 'Cüzdan', label: 'Wallet', priority: 'optional', targetMin: 0, targetMax: 2, note: 'test optional' },
]

function readyProduct(overrides: Partial<CategoryFillProduct> = {}): CategoryFillProduct {
  return {
    id: 1,
    title: 'Rahat Loafer',
    status: 'draft',
    category: 'Klasik',
    price: 1499,
    stockQuantity: 2,
    images: [{ image: 1 }],
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
    ...overrides,
  }
}

function activeProduct(id: number, category: string): CategoryFillProduct {
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

function draftProduct(id: number, category: string): CategoryFillProduct {
  return {
    id,
    title: 'Eksik Taslak',
    status: 'draft',
    category,
    price: 0,
    stockQuantity: 0,
    images: [],
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
  }
}

const products: CategoryFillProduct[] = [
  activeProduct(101, 'Klasik'),
  activeProduct(102, 'Klasik'),
  readyProduct({ id: 103, category: 'Klasik' }),
  draftProduct(104, 'Klasik'),

  activeProduct(201, 'Spor'),

  activeProduct(301, 'Günlük'),
  activeProduct(302, 'Günlük'),
  activeProduct(303, 'Günlük'),

  activeProduct(401, 'Bot'),
  readyProduct({ id: 402, category: 'Bot' }),

  { id: 501, title: 'Kategori Yok', status: 'draft' },
  activeProduct(601, 'Sandalet'),
]

const report = buildCategoryFillReport(products, {
  now: new Date('2026-06-28T12:00:00.000Z'),
  sampleLimit: 100,
  totalProducts: 250,
  targets: testTargets,
})

function byCategory(category: string) {
  const found = report.categories.find((item) => item.category === category)
  assert.ok(found, `missing ${category}`)
  return found
}

check('default roadmap targets keep core category ranges and optional wallet', () => {
  const klasik = CATEGORY_FILL_TARGETS.find((target) => target.category === 'Klasik')
  const spor = CATEGORY_FILL_TARGETS.find((target) => target.category === 'Spor')
  const gunluk = CATEGORY_FILL_TARGETS.find((target) => target.category === 'Günlük')
  const wallet = CATEGORY_FILL_TARGETS.find((target) => target.category === 'Cüzdan')

  assert.strictEqual(klasik?.targetMin, 40)
  assert.strictEqual(klasik?.targetMax, 60)
  assert.strictEqual(spor?.targetMin, 30)
  assert.strictEqual(gunluk?.targetMin, 30)
  assert.strictEqual(wallet?.priority, 'optional')
  assert.strictEqual(wallet?.targetMin, 0)
})

check('counts active, ready, blocked backlog, missing, and legacy categories', () => {
  assert.strictEqual(report.sampleSize, 12)
  assert.strictEqual(report.totalProducts, 250)
  assert.strictEqual(report.missingCategory, 1)
  assert.strictEqual(report.legacyOrUnknownCategories.Sandalet, 1)

  const klasik = byCategory('Klasik')
  assert.strictEqual(klasik.active, 2)
  assert.strictEqual(klasik.publishReady, 1)
  assert.strictEqual(klasik.needsReview, 1)
  assert.strictEqual(klasik.draft, 0)
  assert.strictEqual(klasik.blocked, 1)
})

check('assigns category actions from live depth plus backlog', () => {
  assert.strictEqual(byCategory('Klasik').action, 'finish_backlog')
  assert.strictEqual(byCategory('Spor').action, 'load_more')
  assert.strictEqual(byCategory('Günlük').action, 'maintain')
  assert.strictEqual(byCategory('Bot').action, 'publish_ready_backlog')
  assert.strictEqual(byCategory('Terlik').action, 'load_more')
  assert.strictEqual(byCategory('Cüzdan').action, 'optional_watch')
})

check('sorts load order by priority, action, and remaining load need', () => {
  assert.deepStrictEqual(
    report.loadingOrder.map((item) => item.category),
    ['Spor', 'Klasik', 'Terlik', 'Bot'],
  )
})

check('active category helper excludes retired/legacy categories', () => {
  assert.strictEqual(isActiveCategoryFillCategory('Spor'), true)
  assert.strictEqual(isActiveCategoryFillCategory('Sandalet'), false)
  assert.strictEqual(isActiveCategoryFillCategory('Krampon'), false)
})

check('formatter explains read-only strategy and ad pause', () => {
  const message = formatCategoryFillReport(report)
  assert.ok(message.includes('Category Fill Strategy (D-354)'))
  assert.ok(message.includes('Read-only sample: <b>12/250</b>'))
  assert.ok(message.includes('<b>Spor</b> gap 3'))
  assert.ok(message.includes('missing category 1'))
  assert.ok(message.includes('Sandalet 1'))
  assert.ok(message.includes('Ads stay paused until D-380+'))
})

console.log(`\ncategoryFill: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
