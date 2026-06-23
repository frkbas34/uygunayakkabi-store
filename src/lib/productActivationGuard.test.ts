/**
 * productActivationGuard.test.ts - standalone validation for the Payload
 * activation guard. No test framework required.
 *
 * Run: `tsx src/lib/productActivationGuard.test.ts`.
 */
import assert from 'node:assert'
import {
  applyActivationWorkflowDefaults,
  applySoldOutWorkflowDefaults,
  collectActivationBlockers,
  mergeActivationProduct,
  resolveConfiguredTargets,
  type ActivationStockResolver,
  type ProductActivationDocument,
} from './productActivationGuard'
import { Products } from '../collections/Products'

let passed = 0

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

function stock(effectiveStock: number, hasVariants = false): ActivationStockResolver {
  return async () => ({ effectiveStock, hasVariants })
}

const completeProduct: ProductActivationDocument = {
  id: 101,
  title: 'Siyah Tokali Loafer',
  brand: 'Generic',
  price: 2099,
  stockQuantity: 4,
  images: [{ image: 1 }],
  channelTargets: ['website'],
  workflow: { workflowStatus: 'publish_ready', stockState: 'in_stock', sellable: false },
}

function activationHook() {
  const hook = Products.hooks?.beforeChange?.[0]
  assert.strictEqual(typeof hook, 'function', 'Products beforeChange activation hook missing')
  return hook as (args: Record<string, any>) => Promise<ProductActivationDocument>
}

function statusField() {
  const field = Products.fields.find((candidate: any) => candidate?.name === 'status') as Record<string, any> | undefined
  assert.ok(field, 'Products status field missing')
  return field
}

function fakeReqWithVariants(variants: Array<Record<string, unknown>> = []) {
  return {
    payload: {
      find: async ({ collection }: { collection: string }) => ({
        docs: collection === 'variants' ? variants : [],
      }),
    },
  }
}

async function main() {
  await check('complete own-product passes activation blockers', async () => {
    const blockers = await collectActivationBlockers(completeProduct, {
      resolveStockSnapshot: stock(4),
    })
    assert.deepStrictEqual(blockers, [])
  })

  await check('missing product reports all core blockers', async () => {
    const blockers = await collectActivationBlockers({
      id: 102,
      title: 'Eksik Urun',
      price: 0,
      stockQuantity: 0,
      images: [],
      channelTargets: [],
    }, {
      resolveStockSnapshot: stock(0),
    })

    assert.ok(blockers.some((b) => b.includes('fiyat')), blockers.join('\n'))
    assert.ok(blockers.some((b) => b.includes('gorseli')), blockers.join('\n'))
    assert.ok(blockers.some((b) => b.includes('yayin hedefi')), blockers.join('\n'))
    assert.ok(blockers.some((b) => b.includes('stok adedi')), blockers.join('\n'))
  })

  await check('variant products use variant stock as activation truth', async () => {
    const blockers = await collectActivationBlockers({
      ...completeProduct,
      id: 103,
      stockQuantity: 8,
    }, {
      resolveStockSnapshot: stock(0, true),
    })

    assert.ok(blockers.some((b) => b.includes('beden varyantlarinda stok')), blockers.join('\n'))
  })

  await check('brand field participates in brand-safety hard block', async () => {
    const blockers = await collectActivationBlockers({
      ...completeProduct,
      id: 104,
      brand: 'Nike',
      title: 'Siyah Spor Ayakkabi',
    }, {
      resolveStockSnapshot: stock(3),
    })

    assert.ok(blockers.some((b) => b.includes('brand safety')), blockers.join('\n'))
  })

  await check('channel publish flags count as active targets', () => {
    const targets = resolveConfiguredTargets({
      channelTargets: [],
      channels: { publishWebsite: true, publishInstagram: false },
    })
    assert.deepStrictEqual(targets, ['website'])
  })

  await check('merge preserves nested original fields while applying updates', () => {
    const merged = mergeActivationProduct(
      { price: 2200, workflow: { sellable: true } },
      { price: 0, workflow: { workflowStatus: 'publish_ready', stockState: 'in_stock' } },
    )

    assert.strictEqual(merged.price, 2200)
    assert.strictEqual(merged.workflow.workflowStatus, 'publish_ready')
    assert.strictEqual(merged.workflow.stockState, 'in_stock')
    assert.strictEqual(merged.workflow.sellable, true)
  })

  await check('successful activation normalizes workflow visibility', () => {
    const data: ProductActivationDocument = { status: 'active' }
    applyActivationWorkflowDefaults(data, {
      workflow: {
        workflowStatus: 'publish_ready',
        publishStatus: 'pending',
        stockState: 'sold_out',
        sellable: false,
      },
    })

    assert.strictEqual(data.workflow.workflowStatus, 'active')
    assert.strictEqual(data.workflow.publishStatus, 'published')
    assert.strictEqual(data.workflow.stockState, 'in_stock')
    assert.strictEqual(data.workflow.sellable, true)
  })

  await check('sold-out normalization aligns workflow state', () => {
    const data: ProductActivationDocument = { status: 'soldout' }
    applySoldOutWorkflowDefaults(data, {
      workflow: {
        workflowStatus: 'active',
        publishStatus: 'published',
        stockState: 'in_stock',
        sellable: true,
      },
    })

    assert.strictEqual(data.workflow.workflowStatus, 'soldout')
    assert.strictEqual(data.workflow.publishStatus, 'published')
    assert.strictEqual(data.workflow.stockState, 'sold_out')
    assert.strictEqual(data.workflow.sellable, false)
  })

  await check('Products beforeChange rejects incomplete activation', async () => {
    const hook = activationHook()
    await assert.rejects(
      hook({
        data: { status: 'active' },
        originalDoc: {
          id: 201,
          status: 'draft',
          title: 'Eksik Urun',
          price: 0,
          stockQuantity: 0,
          images: [],
          channelTargets: [],
        },
        operation: 'update',
        req: fakeReqWithVariants(),
      }),
      /Aktivasyon engellendi/,
    )
  })

  await check('Products beforeChange guards active creates', async () => {
    const hook = activationHook()
    await assert.rejects(
      hook({
        data: {
          status: 'active',
          title: 'Eksik Aktif Create',
          price: 0,
          stockQuantity: 0,
          images: [],
          channelTargets: [],
        },
        originalDoc: undefined,
        operation: 'create',
        req: fakeReqWithVariants(),
      }),
      /Aktivasyon engellendi/,
    )
  })

  await check('Products beforeChange accepts complete active creates', async () => {
    const hook = activationHook()
    const data: ProductActivationDocument = {
      status: 'active',
      title: 'Tam Aktif Create',
      price: 2099,
      stockQuantity: 2,
      images: [{ image: 1 }],
      channelTargets: ['website'],
      workflow: { workflowStatus: 'publish_ready', sellable: false },
    }
    const result = await hook({
      data,
      originalDoc: undefined,
      operation: 'create',
      req: fakeReqWithVariants(),
    })

    assert.strictEqual(result, data)
    assert.strictEqual(data.workflow.workflowStatus, 'active')
    assert.strictEqual(data.workflow.publishStatus, 'published')
    assert.strictEqual(data.workflow.sellable, true)
  })

  await check('Products beforeChange normalizes channel targets and publish flags', async () => {
    const hook = activationHook()
    const data: ProductActivationDocument = {
      status: 'active',
      title: 'Kanal Normalize Create',
      price: 2099,
      stockQuantity: 2,
      images: [{ image: 1 }],
      channelTargets: ['instagram'],
      channels: { publishInstagram: false, publishShopier: true },
      workflow: { workflowStatus: 'publish_ready', sellable: false },
    }

    await hook({
      data,
      originalDoc: undefined,
      operation: 'create',
      req: fakeReqWithVariants(),
    })

    assert.deepStrictEqual(data.channelTargets, ['instagram', 'shopier'])
    assert.deepStrictEqual(data.channels, {
      publishInstagram: true,
      publishShopier: true,
      publishWebsite: false,
      publishX: false,
      publishFacebook: false,
    })
  })

  await check('Products beforeChange normalizes direct sold-out saves', async () => {
    const hook = activationHook()
    const data: ProductActivationDocument = { status: 'soldout' }
    const result = await hook({
      data,
      originalDoc: {
        ...completeProduct,
        id: 204,
        status: 'active',
        workflow: {
          workflowStatus: 'active',
          publishStatus: 'published',
          stockState: 'in_stock',
          sellable: true,
        },
      },
      operation: 'update',
      req: fakeReqWithVariants(),
    })

    assert.strictEqual(result, data)
    assert.strictEqual(data.workflow.workflowStatus, 'soldout')
    assert.strictEqual(data.workflow.publishStatus, 'published')
    assert.strictEqual(data.workflow.stockState, 'sold_out')
    assert.strictEqual(data.workflow.sellable, false)
  })

  await check('Products beforeChange accepts complete activation and normalizes workflow', async () => {
    const hook = activationHook()
    const data: ProductActivationDocument = { status: 'active' }
    const result = await hook({
      data,
      originalDoc: {
        ...completeProduct,
        id: 202,
        status: 'draft',
      },
      operation: 'update',
      req: fakeReqWithVariants(),
    })

    assert.strictEqual(result, data)
    assert.strictEqual(data.workflow.workflowStatus, 'active')
    assert.strictEqual(data.workflow.publishStatus, 'published')
    assert.strictEqual(data.workflow.sellable, true)
  })

  await check('Products beforeChange leaves already-active edits alone', async () => {
    const hook = activationHook()
    const data: ProductActivationDocument = { status: 'active', price: 0 }
    const result = await hook({
      data,
      originalDoc: { id: 203, status: 'active', price: 0 },
      operation: 'update',
      req: fakeReqWithVariants(),
    })

    assert.strictEqual(result, data)
    assert.strictEqual(data.workflow, undefined)
  })

  await check('Products status field defaults to draft', () => {
    assert.strictEqual(statusField().defaultValue, 'draft')
  })

  console.log(`\nproductActivationGuard: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
}

void main()
