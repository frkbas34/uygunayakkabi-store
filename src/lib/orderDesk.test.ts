/**
 * orderDesk.test.ts - Phase 7 order lifecycle policy checks.
 *
 * Locks the Telegram/operator status transition rules without touching Payload.
 */
import assert from 'node:assert'
import {
  applyOrderStatus,
  buildOrderOperatorLinks,
  formatNewOrderAlert,
  formatOrderCard,
  formatOrderLine,
  type OrderEntry,
} from './orderDesk'

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

function fakePayload(order: Record<string, unknown> | null) {
  const updates: Array<Record<string, unknown>> = []
  const creates: Array<Record<string, unknown>> = []
  return {
    updates,
    creates,
    payload: {
      async findByID(args: Record<string, unknown>) {
        if (args.collection !== 'orders') return null
        return order
      },
      async update(args: Record<string, unknown>) {
        updates.push(args)
        if (order) Object.assign(order, args.data)
        return order ?? { id: args.id, ...(args.data as Record<string, unknown>) }
      },
      async create(args: Record<string, unknown>) {
        creates.push(args)
        return { id: creates.length, ...(args.data as Record<string, unknown>) }
      },
    },
  }
}

function order(input: Partial<OrderEntry> = {}): OrderEntry {
  return {
    id: input.id ?? 501,
    orderNumber: input.orderNumber ?? `ORD-${input.id ?? 501}`,
    customerName: input.customerName ?? 'Ayse Operator',
    customerPhone: input.customerPhone ?? '5550000501',
    status: input.status ?? 'new',
    source: input.source ?? 'website',
    productId: input.productId ?? null,
    productSn: input.productSn ?? null,
    productTitle: input.productTitle ?? null,
    productBrand: input.productBrand ?? null,
    productSlug: input.productSlug ?? null,
    productStatus: input.productStatus ?? null,
    size: input.size ?? null,
    quantity: input.quantity ?? 1,
    totalPrice: input.totalPrice ?? null,
    paymentMethod: input.paymentMethod ?? null,
    isPaid: input.isPaid ?? false,
    notes: input.notes ?? null,
    shippingCompany: input.shippingCompany ?? null,
    trackingNumber: input.trackingNumber ?? null,
    shippedAt: input.shippedAt ?? null,
    deliveredAt: input.deliveredAt ?? null,
    relatedInquiryId: input.relatedInquiryId ?? null,
    createdAt: input.createdAt ?? '2026-07-16T09:00:00.000Z',
    updatedAt: input.updatedAt ?? '2026-07-16T09:05:00.000Z',
  }
}

async function main() {
  await check('builds order admin plus public product and lead links', async () => {
    const links = buildOrderOperatorLinks(order({
      id: 77,
      productId: 901,
      productSlug: 'siyah-tokali-loafer-sn0901',
      productStatus: 'active',
      relatedInquiryId: 601,
    }))

    assert.strictEqual(links.orderAdminUrl, 'https://www.uygunayakkabi.com/admin/collections/orders/77')
    assert.strictEqual(links.productAdminUrl, 'https://www.uygunayakkabi.com/admin/collections/products/901')
    assert.strictEqual(links.leadAdminUrl, 'https://www.uygunayakkabi.com/admin/collections/customer-inquiries/601')
    assert.strictEqual(links.productUrl, 'https://www.uygunayakkabi.com/products/siyah-tokali-loafer-sn0901')
  })

  await check('keeps draft order products admin-only', async () => {
    const links = buildOrderOperatorLinks(order({
      id: 78,
      productId: 902,
      productSlug: 'draft-loafer-sn0902',
      productStatus: 'draft',
    }))

    assert.strictEqual(links.productAdminUrl, 'https://www.uygunayakkabi.com/admin/collections/products/902')
    assert.strictEqual(links.productUrl, null)
  })

  await check('keeps storefront-blocked order products admin-only', async () => {
    const links = buildOrderOperatorLinks(order({
      id: 83,
      productId: 906,
      productTitle: 'Nike Public Sneaker',
      productBrand: 'Nike',
      productSlug: 'nike-public-sneaker-sn0906',
      productStatus: 'active',
    }))

    assert.strictEqual(links.productAdminUrl, 'https://www.uygunayakkabi.com/admin/collections/products/906')
    assert.strictEqual(links.productUrl, null)
  })

  await check('order list lines include operator links and avoid unsafe commands', async () => {
    const formatted = formatOrderLine(order({
      id: 79,
      productId: 903,
      productSn: 'SN0903',
      productSlug: 'public-loafer-sn0903',
      productStatus: 'soldout',
      relatedInquiryId: 603,
    }))

    assert.ok(formatted.includes('Links: <a href="https://www.uygunayakkabi.com/admin/collections/orders/79">order admin</a>'))
    assert.ok(formatted.includes('<a href="https://www.uygunayakkabi.com/admin/collections/products/903">product admin</a>'))
    assert.ok(formatted.includes('<a href="https://www.uygunayakkabi.com/admin/collections/customer-inquiries/603">lead admin</a>'))
    assert.ok(formatted.includes('<a href="https://www.uygunayakkabi.com/products/public-loafer-sn0903">PDP</a>'))
    assert.ok(!formatted.includes('/adlaunch'))
    assert.ok(!formatted.includes('/shopier publish-ready confirm'))
  })

  await check('order detail cards include the same operator links', async () => {
    const formatted = formatOrderCard(order({
      id: 80,
      productId: 904,
      productSn: 'SN0904',
      productTitle: 'Card Loafer',
      productSlug: 'card-loafer-sn0904',
      productStatus: 'active',
      relatedInquiryId: 604,
    }))

    assert.ok(formatted.includes('Links: <a href="https://www.uygunayakkabi.com/admin/collections/orders/80">order admin</a>'))
    assert.ok(formatted.includes('<a href="https://www.uygunayakkabi.com/admin/collections/products/904">product admin</a>'))
    assert.ok(formatted.includes('<a href="https://www.uygunayakkabi.com/admin/collections/customer-inquiries/604">lead admin</a>'))
    assert.ok(formatted.includes('<a href="https://www.uygunayakkabi.com/products/card-loafer-sn0904">PDP</a>'))
  })

  await check('new order alerts include links without changing the button action model', async () => {
    const formatted = formatNewOrderAlert(order({
      id: 81,
      productId: 905,
      productSn: 'SN0905',
      productTitle: 'Alert Loafer',
      productSlug: 'alert-loafer-sn0905',
      productStatus: 'draft',
      relatedInquiryId: 605,
    }))

    assert.ok(formatted.includes('Links: <a href="https://www.uygunayakkabi.com/admin/collections/orders/81">order admin</a>'))
    assert.ok(formatted.includes('<a href="https://www.uygunayakkabi.com/admin/collections/products/905">product admin</a>'))
    assert.ok(formatted.includes('<a href="https://www.uygunayakkabi.com/admin/collections/customer-inquiries/605">lead admin</a>'))
    assert.ok(!formatted.includes('https://www.uygunayakkabi.com/products/alert-loafer-sn0905'))
    assert.ok(formatted.includes('<i>Detay: /order 81</i>'))
  })

  await check('ship stamps shippedAt and writes an audit event', async () => {
    const fake = fakePayload({
      id: 11,
      orderNumber: 'ORD-011',
      status: 'confirmed',
      quantity: 1,
      product: { stockNumber: 'SN0011' },
    })

    const result = await applyOrderStatus(fake.payload, 11, 'ship')

    assert.strictEqual(result.ok, true)
    assert.strictEqual(result.fromStatus, 'confirmed')
    assert.strictEqual(result.toStatus, 'shipped')
    assert.strictEqual(fake.updates.length, 1)
    assert.strictEqual(fake.updates[0].collection, 'orders')
    assert.strictEqual((fake.updates[0].data as Record<string, unknown>).status, 'shipped')
    assert.ok((fake.updates[0].data as Record<string, unknown>).shippedAt)
    assert.deepStrictEqual(fake.updates[0].context, { isDispatchUpdate: true })
    assert.strictEqual(fake.creates[0].collection, 'bot-events')
  })

  await check('Shopier fulfillment source is preserved in the audit event', async () => {
    const fake = fakePayload({
      id: 16,
      orderNumber: 'ORD-016',
      status: 'confirmed',
      quantity: 1,
    })

    const result = await applyOrderStatus(fake.payload, 16, 'ship', 'shopier_webhook')

    assert.strictEqual(result.ok, true)
    const eventData = fake.creates[0].data as Record<string, unknown>
    const eventPayload = eventData.payload as Record<string, unknown>
    assert.strictEqual(eventPayload.source, 'shopier_webhook')
    assert.strictEqual(eventPayload.action, 'ship')
    assert.strictEqual(eventPayload.toStatus, 'shipped')
  })

  await check('deliver from new backfills shippedAt and deliveredAt', async () => {
    const fake = fakePayload({
      id: 12,
      orderNumber: 'ORD-012',
      status: 'new',
      quantity: 1,
    })

    const result = await applyOrderStatus(fake.payload, 12, 'deliver')

    assert.strictEqual(result.ok, true)
    assert.strictEqual(result.toStatus, 'delivered')
    const data = fake.updates[0].data as Record<string, unknown>
    assert.strictEqual(data.status, 'delivered')
    assert.ok(data.shippedAt)
    assert.ok(data.deliveredAt)
  })

  await check('manual cancel does not restore stock and points operator to restock', async () => {
    const fake = fakePayload({
      id: 13,
      orderNumber: 'ORD-013',
      status: 'confirmed',
      quantity: 2,
      product: { stockNumber: 'SN0013' },
    })

    const result = await applyOrderStatus(fake.payload, 13, 'cancel')

    assert.strictEqual(result.ok, true)
    assert.strictEqual(result.toStatus, 'cancelled')
    assert.ok(result.message.includes('Stok otomatik geri eklenmedi'), result.message)
    assert.ok(result.message.includes('/restock SN0013 2'), result.message)
    assert.strictEqual(fake.updates.length, 1)
    assert.strictEqual(fake.updates[0].collection, 'orders')
    assert.strictEqual((fake.updates[0].data as Record<string, unknown>).status, 'cancelled')
    assert.ok(fake.updates.every((update) => update.collection !== 'products'))
    assert.ok(fake.creates.every((create) => create.collection !== 'inventory-logs'))
  })

  await check('delivered orders cannot be cancelled through operator command', async () => {
    const fake = fakePayload({
      id: 14,
      orderNumber: 'ORD-014',
      status: 'delivered',
      quantity: 1,
    })

    const result = await applyOrderStatus(fake.payload, 14, 'cancel')

    assert.strictEqual(result.ok, false)
    assert.strictEqual(result.refusalReason, 'invalid_transition')
    assert.ok(result.message.includes('Teslim edilmiş siparişi iptal edemezsiniz'), result.message)
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual(fake.creates.length, 0)
  })

  await check('idempotent status action is a no-op', async () => {
    const fake = fakePayload({
      id: 15,
      orderNumber: 'ORD-015',
      status: 'shipped',
      shippedAt: '2026-07-03T10:00:00.000Z',
      quantity: 1,
    })

    const result = await applyOrderStatus(fake.payload, 15, 'ship')

    assert.strictEqual(result.ok, true)
    assert.strictEqual(result.idempotent, true)
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual(fake.creates.length, 0)
  })

  await check('missing order returns not found without writes', async () => {
    const fake = fakePayload(null)

    const result = await applyOrderStatus(fake.payload, 404, 'ship')

    assert.strictEqual(result.ok, false)
    assert.strictEqual(result.refusalReason, 'order_not_found')
    assert.strictEqual(fake.updates.length, 0)
    assert.strictEqual(fake.creates.length, 0)
  })

  console.log(`\norderDesk: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
  if (process.exitCode) process.exit(process.exitCode)
}

void main()
