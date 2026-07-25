import assert from 'node:assert'

import {
  formatInboxFailed,
  formatInboxPending,
  formatInboxPublish,
  formatInboxStock,
  formatInboxToday,
} from './operatorInbox'

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

function product(input: Partial<Record<string, unknown>> = {}) {
  return {
    id: input.id ?? 901,
    stockNumber: input.stockNumber ?? 'SN0901',
    title: input.title ?? 'Siyah Tokali Loafer',
    status: input.status ?? 'active',
    slug: input.slug ?? 'siyah-tokali-loafer-sn0901',
    workflow: input.workflow ?? {},
    createdAt: input.createdAt ?? '2026-07-16T08:00:00.000Z',
    updatedAt: input.updatedAt ?? '2026-07-16T08:00:00.000Z',
  }
}

function bucket(items: any[], totalDocs = items.length) {
  return {
    count: items.length,
    items,
    hasMore: totalDocs > items.length,
    totalDocs,
  }
}

check('pending rows include admin and public PDP links for public products', () => {
  const message = formatInboxPending({
    visualPreview: bucket([product()]),
    wizardIncomplete: bucket([]),
  } as any)

  assert.ok(message.includes('Links: <a href="https://www.uygunayakkabi.com/admin/collections/products/901">admin</a> / <a href="https://www.uygunayakkabi.com/products/siyah-tokali-loafer-sn0901">PDP</a>'), message)
})

check('draft rows include admin link but not public PDP link', () => {
  const message = formatInboxPublish({
    publishReady: bucket([]),
    contentReadyNotActive: bucket([
      product({
        id: 902,
        stockNumber: 'SN0902',
        title: 'Draft Loafer',
        status: 'draft',
        slug: 'draft-loafer-sn0902',
      }),
    ]),
  } as any)

  assert.ok(message.includes('Links: <a href="https://www.uygunayakkabi.com/admin/collections/products/902">admin</a>'), message)
  assert.ok(!message.includes('https://www.uygunayakkabi.com/products/draft-loafer-sn0902'), message)
})

check('storefront-blocked public rows keep their admin link but not a PDP link', () => {
  const message = formatInboxPending({
    visualPreview: bucket([product({
      id: 907,
      stockNumber: 'SN0907',
      title: 'Nike Public Sneaker',
      status: 'active',
      slug: 'nike-public-sneaker-sn0907',
    })]),
    wizardIncomplete: bucket([]),
  } as any)

  assert.ok(message.includes('/admin/collections/products/907'), message)
  assert.ok(!message.includes('/products/nike-public-sneaker-sn0907'), message)
})

check('stock, failed, and today surfaces reuse the same product link formatter', () => {
  const stock = formatInboxStock({
    soldout: bucket([product({ status: 'soldout', slug: 'soldout-loafer-sn0903', id: 903, stockNumber: 'SN0903' })]),
    lowStock: bucket([]),
  } as any)
  const failed = formatInboxFailed({
    contentFailed: bucket([product({ id: 904, stockNumber: 'SN0904' })]),
    auditFailed: bucket([]),
    shopierError: bucket([]),
    recentEvents: { events: [], totalDocs: 0 },
  } as any)
  const today = formatInboxToday({
    createdToday: bucket([product({ id: 905, stockNumber: 'SN0905' })]),
    confirmedToday: bucket([]),
    contentReadyToday: bucket([]),
    activatedToday: bucket([product({ id: 906, stockNumber: 'SN0906' })]),
    soldoutToday: bucket([]),
    failedEventsToday: 0,
  } as any)

  assert.ok(stock.includes('/admin/collections/products/903'), stock)
  assert.ok(stock.includes('/products/soldout-loafer-sn0903'), stock)
  assert.ok(failed.includes('/admin/collections/products/904'), failed)
  assert.ok(today.includes('/admin/collections/products/905'), today)
  assert.ok(today.includes('/admin/collections/products/906'), today)
})

check('formatter remains read-only and does not surface unsafe action commands', () => {
  const message = formatInboxPending({
    visualPreview: bucket([product()]),
    wizardIncomplete: bucket([]),
  } as any)

  assert.ok(!message.includes('/shopier publish-ready confirm'))
  assert.ok(!message.includes('/adlaunch'))
  assert.ok(!message.includes('/activate-supplier-scout'))
})

console.log(`\noperatorInbox: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
