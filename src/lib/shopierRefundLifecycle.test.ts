/**
 * shopierRefundLifecycle.test.ts - local checks for Shopier refund.updated.
 */
import assert from 'node:assert'
import {
  SHOPIER_REFUND_REQUESTED_EVENT,
  SHOPIER_REFUND_UPDATED_EVENT,
  applyShopierRefundRequest,
  applyShopierRefundUpdate,
  buildShopierRefundRequestNoteLine,
  buildShopierRefundUpdateNoteLine,
  extractShopierRefundUpdateInfo,
  type ShopierRefundLifecyclePayload,
} from './shopierRefundLifecycle'

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

function fakePayload(seed: {
  orders?: Array<Record<string, unknown>>
  failBotEvent?: boolean
} = {}): {
  orders: Array<Record<string, unknown>>
  updates: Array<Record<string, unknown>>
  creates: Array<Record<string, unknown>>
  payload: ShopierRefundLifecyclePayload
} {
  const orders = seed.orders ?? []
  const updates: Array<Record<string, unknown>> = []
  const creates: Array<Record<string, unknown>> = []

  const payload: ShopierRefundLifecyclePayload = {
    async find(args) {
      const shopierOrderId = (args.where.shopierOrderId as Record<string, unknown> | undefined)?.equals
      return {
        docs: orders.filter((order) => String(order.shopierOrderId ?? '') === String(shopierOrderId ?? '')),
      }
    },
    async update(args) {
      updates.push(args)
      const order = orders.find((entry) => String(entry.id) === String(args.id))
      if (order) Object.assign(order, args.data)
      return order ?? { id: args.id, ...(args.data as Record<string, unknown>) }
    },
    async create(args) {
      if (seed.failBotEvent) throw new Error('bot event write failed')
      creates.push(args)
      return { id: creates.length, ...(args.data as Record<string, unknown>) }
    },
  }

  return { orders, updates, creates, payload }
}

async function main() {
  await check('extracts refund update info from flat and nested payloads', () => {
    assert.deepStrictEqual(
      extractShopierRefundUpdateInfo({ id: 'ref_1', status: 'approved', orderId: 'ord_1' }),
      { refundId: 'ref_1', status: 'approved', orderId: 'ord_1' },
    )
    assert.deepStrictEqual(
      extractShopierRefundUpdateInfo({ refund_id: 'ref_2', refund_status: 'paid', order: { id: 'ord_2' } }),
      { refundId: 'ref_2', status: 'paid', orderId: 'ord_2' },
    )
  })

  await check('refund.updated appends an idempotent order note and emits audit event', async () => {
    const fake = fakePayload({
      orders: [{ id: 11, shopierOrderId: 'ord_11', status: 'cancelled', notes: 'Base note' }],
    })

    const result = await applyShopierRefundUpdate(fake.payload, {
      id: 'refund_11',
      orderId: 'ord_11',
      status: 'approved',
    })

    assert.strictEqual(result.outcome, 'updated')
    assert.strictEqual(result.wroteOrder, true)
    assert.strictEqual(result.wroteEvent, true)
    assert.strictEqual(fake.updates.length, 1)
    assert.strictEqual(fake.updates[0].collection, 'orders')
    assert.deepStrictEqual(fake.updates[0].context, { isDispatchUpdate: true })
    const data = fake.updates[0].data as Record<string, unknown>
    assert.ok(String(data.notes).includes('Base note'))
    assert.ok(String(data.notes).includes('Shopier refund update: refund=refund_11 status=approved'))
    assert.strictEqual(data.status, undefined)
    assert.strictEqual(fake.creates[0].collection, 'bot-events')
    const eventData = fake.creates[0].data as Record<string, unknown>
    assert.strictEqual(eventData.eventType, SHOPIER_REFUND_UPDATED_EVENT)
    assert.strictEqual(eventData.sourceBot, 'shopier_webhook')
  })

  await check('duplicate refund.updated event is a no-op', async () => {
    const note = buildShopierRefundUpdateNoteLine({
      refundId: 'refund_12',
      orderId: 'ord_12',
      status: 'approved',
    })
    const fake = fakePayload({
      orders: [{ id: 12, shopierOrderId: 'ord_12', status: 'cancelled', notes: note }],
    })

    const result = await applyShopierRefundUpdate(fake.payload, {
      id: 'refund_12',
      orderId: 'ord_12',
      status: 'approved',
    })

    assert.strictEqual(result.outcome, 'idempotent')
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual(fake.creates.length, 0)
  })

  await check('missing order id does not write', async () => {
    const fake = fakePayload({
      orders: [{ id: 13, shopierOrderId: 'ord_13', notes: '' }],
    })

    const result = await applyShopierRefundUpdate(fake.payload, {
      id: 'refund_13',
      status: 'approved',
    })

    assert.strictEqual(result.outcome, 'missing_order_id')
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual(fake.creates.length, 0)
  })

  await check('unknown local order does not write', async () => {
    const fake = fakePayload()

    const result = await applyShopierRefundUpdate(fake.payload, {
      id: 'refund_14',
      orderId: 'ord_14',
      status: 'approved',
    })

    assert.strictEqual(result.outcome, 'order_not_found')
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual(fake.creates.length, 0)
  })

  await check('bot-event failure does not roll back the order note update', async () => {
    const fake = fakePayload({
      orders: [{ id: 15, shopierOrderId: 'ord_15', notes: '' }],
      failBotEvent: true,
    })

    const result = await applyShopierRefundUpdate(fake.payload, {
      id: 'refund_15',
      orderId: 'ord_15',
      status: 'paid',
    })

    assert.strictEqual(result.outcome, 'updated')
    assert.strictEqual(result.wroteOrder, true)
    assert.strictEqual(result.wroteEvent, false)
    assert.strictEqual(fake.updates.length, 1)
  })

  await check('refund.requested cancels once and marks stock restore as needed', async () => {
    const fake = fakePayload({
      orders: [{ id: 21, shopierOrderId: 'ord_21', status: 'shipped', notes: 'Base note' }],
    })

    const result = await applyShopierRefundRequest(fake.payload, {
      id: 'refund_21',
      orderId: 'ord_21',
    })

    assert.strictEqual(result.outcome, 'updated')
    assert.strictEqual(result.shouldRestoreStock, true)
    assert.strictEqual(result.wroteOrder, true)
    assert.strictEqual(result.wroteEvent, true)
    assert.strictEqual(result.order?.id, 21)
    assert.strictEqual(fake.updates.length, 1)
    assert.strictEqual(fake.updates[0].collection, 'orders')
    assert.deepStrictEqual(fake.updates[0].context, { isDispatchUpdate: true })
    const data = fake.updates[0].data as Record<string, unknown>
    assert.strictEqual(data.status, 'cancelled')
    assert.ok(String(data.notes).includes('Base note'))
    assert.ok(String(data.notes).includes('Shopier refund requested: refund=refund_21'))
    assert.strictEqual(fake.creates[0].collection, 'bot-events')
    const eventData = fake.creates[0].data as Record<string, unknown>
    assert.strictEqual(eventData.eventType, SHOPIER_REFUND_REQUESTED_EVENT)
    assert.strictEqual(eventData.sourceBot, 'shopier_webhook')
    assert.strictEqual((eventData.payload as Record<string, unknown>).shouldRestoreStock, true)
  })

  await check('duplicate refund.requested is a no-op and does not restore stock again', async () => {
    const note = buildShopierRefundRequestNoteLine({
      refundId: 'refund_22',
      orderId: 'ord_22',
    })
    const fake = fakePayload({
      orders: [{ id: 22, shopierOrderId: 'ord_22', status: 'cancelled', notes: note }],
    })

    const result = await applyShopierRefundRequest(fake.payload, {
      id: 'refund_22',
      orderId: 'ord_22',
    })

    assert.strictEqual(result.outcome, 'idempotent')
    assert.strictEqual(result.shouldRestoreStock, false)
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual(fake.creates.length, 0)
  })

  await check('legacy refund note prevents duplicate stock restore', async () => {
    const fake = fakePayload({
      orders: [{ id: 23, shopierOrderId: 'ord_23', status: 'cancelled', notes: '\u0130ade talebi: refund_23' }],
    })

    const result = await applyShopierRefundRequest(fake.payload, {
      id: 'refund_23',
      orderId: 'ord_23',
    })

    assert.strictEqual(result.outcome, 'idempotent')
    assert.strictEqual(result.shouldRestoreStock, false)
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual(fake.creates.length, 0)
  })

  await check('refund.requested missing order id does not write', async () => {
    const fake = fakePayload({
      orders: [{ id: 24, shopierOrderId: 'ord_24', notes: '' }],
    })

    const result = await applyShopierRefundRequest(fake.payload, {
      id: 'refund_24',
    })

    assert.strictEqual(result.outcome, 'missing_order_id')
    assert.strictEqual(result.shouldRestoreStock, false)
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual(fake.creates.length, 0)
  })

  await check('refund.requested unknown local order does not write', async () => {
    const fake = fakePayload()

    const result = await applyShopierRefundRequest(fake.payload, {
      id: 'refund_25',
      orderId: 'ord_25',
    })

    assert.strictEqual(result.outcome, 'order_not_found')
    assert.strictEqual(result.shouldRestoreStock, false)
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual(fake.creates.length, 0)
  })

  console.log(`\nshopierRefundLifecycle: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
  if (process.exitCode) process.exit(process.exitCode)
}

void main()
