import assert from 'node:assert'
import { collectActivationBlockers, applyActivationWorkflowDefaults } from './productActivationGuard'
import { scanProductBrandSafety } from './brandSafety'
import { normalizeWizardChannelTargets } from './confirmationWizard'
import { deriveProductLifecycle } from './productLifecycle'
import { normalizeProductChannelSelection } from './productChannels'
import { evaluatePublishReadiness } from './publishReadiness'

let passed = 0

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ok - ${name}`)
  } catch (error) {
    console.error(`  fail - ${name}\n    ${(error as Error).message}`)
    process.exitCode = 1
  }
}

function ownProduct(overrides: Record<string, any> = {}) {
  return {
    id: 701,
    title: 'Siyah Tokali Loafer',
    brand: 'Generic',
    status: 'draft',
    price: 2099,
    stockQuantity: 3,
    images: [{ image: 1 }],
    generativeGallery: [],
    channelTargets: ['website'],
    channels: { publishWebsite: true },
    workflow: {
      workflowStatus: 'visual_ready',
      visualStatus: 'approved',
      confirmationStatus: 'pending',
      contentStatus: 'pending',
      auditStatus: 'pending',
      stockState: 'in_stock',
      sellable: false,
    },
    auditResult: {
      overallResult: 'not_reviewed',
      approvedForPublish: false,
    },
    ...overrides,
  }
}

async function main() {
  await check('Telegram target intent normalizes to the active channel set only', () => {
    const wizardTargets = normalizeWizardChannelTargets(['website', 'threads', 'shopier', 'dolap'])
    assert.deepStrictEqual(wizardTargets, ['website', 'shopier'])

    const normalized = normalizeProductChannelSelection({ channelTargets: wizardTargets })
    assert.deepStrictEqual(normalized.channelTargets, ['website', 'shopier'])
    assert.strictEqual(normalized.channels.publishWebsite, true)
    assert.strictEqual(normalized.channels.publishShopier, true)
    assert.strictEqual(normalized.channels.publishInstagram, false)
    assert.strictEqual(normalized.channels.publishX, false)
    assert.strictEqual(normalized.channels.publishFacebook, false)
  })

  await check('clean original-media product moves from intake review to publish-ready', () => {
    const intake = ownProduct()
    assert.strictEqual(deriveProductLifecycle(intake), 'needs_review')
    assert.notStrictEqual(evaluatePublishReadiness(intake).level, 'ready')

    const ready = ownProduct({
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
    })

    const readiness = evaluatePublishReadiness(ready)
    assert.strictEqual(deriveProductLifecycle(ready), 'ready_to_publish')
    assert.strictEqual(readiness.level, 'ready')
    assert.strictEqual(readiness.passedCount, readiness.totalCount)
    assert.deepStrictEqual(readiness.blockers, [])
  })

  await check('publish-ready own product passes activation and becomes active coherently', async () => {
    const ready = ownProduct({
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
    })

    const blockers = await collectActivationBlockers(ready, {
      resolveStockSnapshot: async () => ({ effectiveStock: 3, hasVariants: false }),
    })
    assert.deepStrictEqual(blockers, [])

    const activation = { status: 'active' } as Record<string, any>
    applyActivationWorkflowDefaults(activation, ready)
    assert.strictEqual(activation.workflow.workflowStatus, 'active')
    assert.strictEqual(activation.workflow.publishStatus, 'published')
    assert.strictEqual(activation.workflow.stockState, 'in_stock')
    assert.strictEqual(activation.workflow.sellable, true)
    assert.strictEqual(deriveProductLifecycle({ status: activation.status, workflow: activation.workflow }), 'active')
  })

  await check('protected-brand text cannot complete the golden path', async () => {
    const branded = ownProduct({
      brand: 'Nike',
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
    })

    assert.strictEqual(scanProductBrandSafety(branded).safe, false)
    assert.notStrictEqual(evaluatePublishReadiness(branded).level, 'ready')
    const blockers = await collectActivationBlockers(branded, {
      resolveStockSnapshot: async () => ({ effectiveStock: 3, hasVariants: false }),
      manualPublishOverride: true,
    })
    assert.ok(blockers.some((blocker) => blocker.includes('brand safety')), blockers.join('\n'))
  })

  console.log(`\nproductWorkflowGoldenPath: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
}

void main()
