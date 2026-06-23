/**
 * publishReadiness.test.ts - standalone checks for the central 6-dimension
 * readiness signal. No test framework required.
 */
import assert from 'node:assert'
import {
  computePipelineStatus,
  detectStateIncoherence,
  evaluatePublishReadiness,
  type ReadinessProduct,
} from './publishReadiness'

let passed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

function readyProduct(overrides: Partial<ReadinessProduct> = {}): ReadinessProduct {
  return {
    id: 601,
    title: 'Siyah Tokali Loafer',
    brand: 'Generic',
    status: 'draft',
    price: 2099,
    stockQuantity: 4,
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
    ...overrides,
  }
}

check('complete own-product passes all six dimensions', () => {
  const readiness = evaluatePublishReadiness(readyProduct())
  assert.strictEqual(readiness.level, 'ready')
  assert.strictEqual(readiness.passedCount, 6)
  assert.strictEqual(readiness.totalCount, 6)
  assert.deepStrictEqual(readiness.blockers, [])
})

check('missing price blocks the sellable dimension', () => {
  const readiness = evaluatePublishReadiness(readyProduct({ price: 0 }))
  assert.strictEqual(readiness.level, 'partially_ready')
  assert.ok(readiness.blockers.some((b) => b.includes('sellable') && b.includes('price')), readiness.blockers.join('\n'))
})

check('zero stock blocks readiness even when stockState says in_stock', () => {
  const readiness = evaluatePublishReadiness(readyProduct({ stockQuantity: 0 }))
  assert.notStrictEqual(readiness.level, 'ready')
  assert.ok(readiness.blockers.some((b) => b.includes('No stock available')), readiness.blockers.join('\n'))
})

check('variant stock can satisfy the sellable dimension', () => {
  const readiness = evaluatePublishReadiness(readyProduct({
    stockQuantity: 0,
    variants: [{ stock: 0 }, { stock: 2 }],
  }))
  assert.strictEqual(readiness.level, 'ready')
})

check('channel flags count as active publish targets', () => {
  const readiness = evaluatePublishReadiness(readyProduct({
    channelTargets: [],
    channels: { publishWebsite: true },
  }))
  assert.strictEqual(readiness.level, 'ready')
  const targetDim = readiness.dimensions.find((d) => d.name === 'publish_targets')
  assert.strictEqual(targetDim?.detail, 'Targets: website')
})

check('retired or unsupported channels do not satisfy publish targets', () => {
  const readiness = evaluatePublishReadiness(readyProduct({
    channelTargets: ['dolap', 'threads'],
    channels: {},
  }))
  assert.notStrictEqual(readiness.level, 'ready')
  assert.ok(readiness.blockers.some((b) => b.includes('publish_targets')), readiness.blockers.join('\n'))
})

check('brand safety blocks the audit dimension', () => {
  const readiness = evaluatePublishReadiness(readyProduct({
    brand: 'Nike',
    title: 'Siyah Spor Ayakkabi',
  }))
  assert.notStrictEqual(readiness.level, 'ready')
  assert.ok(readiness.blockers.some((b) => b.includes('audit') && b.includes('Brand safety')), readiness.blockers.join('\n'))
})

check('empty media rows do not satisfy visuals', () => {
  const readiness = evaluatePublishReadiness(readyProduct({
    images: [{}],
    generativeGallery: [],
  }))
  assert.notStrictEqual(readiness.level, 'ready')
  assert.ok(readiness.blockers.some((b) => b.includes('visuals')), readiness.blockers.join('\n'))
})

check('pipeline visuals ignore placeholder media rows', () => {
  const pipeline = computePipelineStatus(readyProduct({
    images: [{}],
    generativeGallery: [],
  }))
  const visuals = pipeline.stages.find((stage) => stage.name === 'Visuals')

  assert.ok(visuals, JSON.stringify(pipeline.stages))
  assert.strictEqual(visuals?.detail, 'No usable media rows (status: approved)')
  assert.notStrictEqual(visuals?.icon, '✅')
})

check('pipeline stock uses variant stock summary', () => {
  const pipeline = computePipelineStatus(readyProduct({
    stockQuantity: 10,
    variants: [{ stock: 0 }, { stock: 2 }, { stock: 1 }],
  }))
  const stock = pipeline.stages.find((stage) => stage.name === 'Stock')

  assert.ok(stock, JSON.stringify(pipeline.stages))
  assert.strictEqual(stock?.detail, '3 units from variants (3 unit(s) from variants)')
})

check('pipeline stock explains sold-out state even with positive stock', () => {
  const pipeline = computePipelineStatus(readyProduct({
    stockQuantity: 4,
    workflow: {
      ...readyProduct().workflow,
      stockState: 'sold_out',
      sellable: false,
    },
  }))
  const stock = pipeline.stages.find((stage) => stage.name === 'Stock')

  assert.ok(stock, JSON.stringify(pipeline.stages))
  assert.strictEqual(stock?.status, 'sold_out')
  assert.ok(stock?.detail.includes('Product is sold out'), stock?.detail)
})

check('coherence diagnostics detect channel target/flag drift', () => {
  const issues = detectStateIncoherence(readyProduct({
    channelTargets: ['website', 'instagram', 'threads'],
    channels: {
      publishWebsite: true,
      publishInstagram: false,
      publishShopier: true,
    },
  }))

  assert.ok(
    issues.some((issue) => issue.field === 'channelTargets' && issue.actual.includes('threads')),
    JSON.stringify(issues),
  )
  assert.ok(
    issues.some((issue) => issue.actual.includes('publishInstagram')),
    JSON.stringify(issues),
  )
  assert.ok(
    issues.some((issue) => issue.actual.includes('publishShopier')),
    JSON.stringify(issues),
  )
})

console.log(`\npublishReadiness: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
