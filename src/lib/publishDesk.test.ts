/**
 * publishDesk.test.ts - standalone smoke checks for operator activation.
 * No database or Telegram calls are made; Payload is faked in-process.
 */
import assert from 'node:assert'
import { approveAndActivateProduct } from './publishDesk'

type PayloadCall = {
  method: 'findByID' | 'create' | 'update'
  args: Record<string, any>
}

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

function readyProduct(overrides: Record<string, any> = {}) {
  return {
    id: 501,
    stockNumber: 'SN0501',
    title: 'Siyah Tokali Loafer',
    status: 'draft',
    price: 2099,
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
    merchandising: {},
    ...overrides,
  }
}

function fakePayload(
  product: Record<string, any> | null,
  opts: { updateThrows?: Error } = {},
) {
  const calls: PayloadCall[] = []
  return {
    calls,
    payload: {
      findByID: async (args: Record<string, any>) => {
        calls.push({ method: 'findByID', args })
        return product
      },
      create: async (args: Record<string, any>) => {
        calls.push({ method: 'create', args })
        return { id: calls.length, ...args.data }
      },
      update: async (args: Record<string, any>) => {
        calls.push({ method: 'update', args })
        if (opts.updateThrows) throw opts.updateThrows
        return { id: args.id, ...args.data }
      },
    },
  }
}

async function main() {
  await check('already-active product is idempotent and does not emit approval', async () => {
    const fake = fakePayload(readyProduct({ status: 'active' }))
    const result = await approveAndActivateProduct(fake.payload, 501, 'telegram_command', 'activate')

    assert.strictEqual(result.ok, true)
    assert.strictEqual(result.idempotent, true)
    assert.strictEqual(result.refusalReason, 'already_active')
    assert.strictEqual(fake.calls.filter((c) => c.method === 'create').length, 0)
    assert.strictEqual(fake.calls.filter((c) => c.method === 'update').length, 0)
  })

  await check('publish readiness blockers stop activation before Payload update', async () => {
    const fake = fakePayload(readyProduct({
      images: [],
      generativeGallery: [],
      workflow: {
        confirmationStatus: 'pending',
        visualStatus: 'pending',
        contentStatus: 'pending',
        auditStatus: 'pending',
        stockState: 'in_stock',
        sellable: true,
      },
      auditResult: { overallResult: 'not_reviewed', approvedForPublish: false },
      channelTargets: [],
    }))
    const result = await approveAndActivateProduct(fake.payload, 501, 'telegram_command', 'approvepublish')

    assert.strictEqual(result.ok, false)
    assert.strictEqual(result.refusalReason, 'not_ready')
    assert.ok(result.blockers?.some((b) => b.includes('confirmation')), result.blockers?.join('\n'))
    assert.strictEqual(fake.calls.filter((c) => c.method === 'update').length, 0)
    assert.strictEqual(fake.calls.filter((c) => c.method === 'create').length, 1)
    assert.strictEqual(fake.calls.find((c) => c.method === 'create')?.args.data.eventType, 'publish.approved')
  })

  await check('Payload activation guard errors become operator-facing refusals', async () => {
    const fake = fakePayload(readyProduct(), {
      updateThrows: new Error([
        'Aktivasyon engellendi. Urun yayina alinmadan once eksikleri tamamlayin:',
        '- brand safety blokladi: marka: Nike',
        '- stok adedi 0dan buyuk olmali',
      ].join('\n')),
    })
    const result = await approveAndActivateProduct(fake.payload, 501, 'telegram_button', 'pdesk_act')

    assert.strictEqual(result.ok, false)
    assert.strictEqual(result.refusalReason, 'activation_guard_failed')
    assert.deepStrictEqual(result.blockers, [
      'brand safety blokladi: marka: Nike',
      'stok adedi 0dan buyuk olmali',
    ])
    assert.ok(result.message.includes('Payload aktivasyon guard'), result.message)
    assert.strictEqual(fake.calls.filter((c) => c.method === 'update').length, 1)
    assert.strictEqual(fake.calls.filter((c) => c.method === 'create').length, 1)
  })

  await check('ready product activates and emits product.activated event', async () => {
    const fake = fakePayload(readyProduct())
    const result = await approveAndActivateProduct(fake.payload, 501, 'telegram_command', 'activate')

    assert.strictEqual(result.ok, true)
    assert.strictEqual(result.idempotent, false)
    const update = fake.calls.find((c) => c.method === 'update')
    assert.ok(update, 'expected activation update')
    assert.strictEqual(update.args.data.status, 'active')
    assert.strictEqual(update.args.data.workflow.workflowStatus, 'active')
    assert.strictEqual(update.args.data.workflow.publishStatus, 'published')
    const events = fake.calls.filter((c) => c.method === 'create').map((c) => c.args.data.eventType)
    assert.deepStrictEqual(events, ['publish.approved', 'product.activated'])
  })

  console.log(`\npublishDesk: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
}

void main()
