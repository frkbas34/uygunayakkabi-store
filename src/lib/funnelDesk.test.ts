/**
 * funnelDesk.test.ts - focused D-249 Phase 7 assertions.
 *
 * Covers source attribution, direct-order separation, UTM rollups, and
 * formatter safety without touching Payload or external services.
 */
import assert from 'node:assert'
import {
  type FunnelSnapshot,
  getFunnelSnapshot,
  formatFunnelSnapshot,
} from './funnelDesk'

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

function isoDaysAgo(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString()
}

function fakePayload(input: { leads: any[]; orders: any[] }) {
  return {
    async find(args: { collection: string; where?: any }) {
      const docs = args.collection === 'customer-inquiries'
        ? input.leads
        : args.collection === 'orders'
          ? input.orders
          : []
      const since = args.where?.createdAt?.greater_than
      const filtered = since
        ? docs.filter((doc) => new Date(doc.createdAt).getTime() > new Date(since).getTime())
        : docs
      return { docs: filtered, totalDocs: filtered.length }
    },
  }
}

function emptySnapshot(): FunnelSnapshot {
  return {
    windowLabel: 'today',
    windowStartISO: new Date().toISOString(),
    sources: [],
    totals: {
      source: 'TOPLAM',
      stages: {
        new: 0,
        contacted: 0,
        follow_up: 0,
        closed_won: 0,
        closed_lost: 0,
        spam: 0,
        total: 0,
      },
      ordersConverted: 0,
      revenue: 0,
    },
    directOrders: { count: 0, revenue: 0 },
    attributionDetail: null,
  }
}

async function run() {
  await check('groups lead-attributed orders by lead source and rolls completed into won', async () => {
    const payload = fakePayload({
      leads: [
        {
          id: 1,
          source: 'website',
          status: 'new',
          createdAt: isoDaysAgo(0),
          utmSource: 'instagram',
          utmCampaign: 'first_loafers',
          referrer: 'https://example.test/pdp',
        },
        {
          id: 2,
          source: 'instagram',
          status: 'closed_won',
          createdAt: isoDaysAgo(0),
          utmSource: 'instagram',
          utmCampaign: 'first_loafers',
        },
        {
          id: 3,
          source: 'website',
          status: 'completed',
          createdAt: isoDaysAgo(0),
          utmSource: 'google',
          utmCampaign: 'organic_loafers',
        },
        {
          id: 4,
          source: '<unsafe>',
          status: 'contacted',
          createdAt: isoDaysAgo(0),
          referrer: 'https://ref.example/test',
        },
      ],
      orders: [
        { id: 10, relatedInquiry: 2, totalPrice: '2099', createdAt: isoDaysAgo(0) },
        { id: 11, relatedInquiry: 3, totalPrice: 500, createdAt: isoDaysAgo(0) },
        { id: 12, relatedInquiry: 999, totalPrice: '1000', createdAt: isoDaysAgo(0) },
        { id: 13, totalPrice: 100, createdAt: isoDaysAgo(0) },
      ],
    })

    const snapshot = await getFunnelSnapshot(payload, { period: 'today' })

    const website = snapshot.sources.find((row) => row.source === 'website')
    const instagram = snapshot.sources.find((row) => row.source === 'instagram')
    const unsafe = snapshot.sources.find((row) => row.source === '<unsafe>')

    assert.ok(website)
    assert.strictEqual(website.stages.total, 2)
    assert.strictEqual(website.stages.new, 1)
    assert.strictEqual(website.stages.closed_won, 1)
    assert.strictEqual(website.ordersConverted, 1)
    assert.strictEqual(website.revenue, 500)

    assert.ok(instagram)
    assert.strictEqual(instagram.stages.closed_won, 1)
    assert.strictEqual(instagram.ordersConverted, 1)
    assert.strictEqual(instagram.revenue, 2099)

    assert.ok(unsafe)
    assert.strictEqual(unsafe.stages.contacted, 1)

    assert.strictEqual(snapshot.totals.stages.total, 4)
    assert.strictEqual(snapshot.totals.ordersConverted, 2)
    assert.strictEqual(snapshot.totals.revenue, 2599)
    assert.deepStrictEqual(snapshot.directOrders, { count: 2, revenue: 1100 })
  })

  await check('keeps old leads outside the selected window', async () => {
    const payload = fakePayload({
      leads: [
        { id: 1, source: 'website', status: 'new', createdAt: isoDaysAgo(8) },
        { id: 2, source: 'website', status: 'new', createdAt: isoDaysAgo(0) },
      ],
      orders: [
        { id: 10, relatedInquiry: 1, totalPrice: 700, createdAt: isoDaysAgo(0) },
      ],
    })

    const snapshot = await getFunnelSnapshot(payload, { period: 'week' })
    assert.strictEqual(snapshot.totals.stages.total, 1)
    assert.strictEqual(snapshot.directOrders.count, 1)
    assert.strictEqual(snapshot.directOrders.revenue, 700)
  })

  await check('builds attribution-detail rollups from real lead fields', async () => {
    const payload = fakePayload({
      leads: [
        { id: 1, source: 'website', status: 'new', createdAt: isoDaysAgo(0), utmSource: 'instagram', utmCampaign: 'drop' },
        { id: 2, source: 'website', status: 'new', createdAt: isoDaysAgo(0), utmSource: 'instagram', utmCampaign: 'drop' },
        { id: 3, source: 'website', status: 'new', createdAt: isoDaysAgo(0), utmSource: 'google', referrer: 'https://ref.example' },
      ],
      orders: [],
    })

    const snapshot = await getFunnelSnapshot(payload)
    assert.strictEqual(snapshot.attributionDetail?.coveredLeads, 3)
    assert.deepStrictEqual(snapshot.attributionDetail?.topUtmSources[0], { value: 'instagram', count: 2 })
    assert.deepStrictEqual(snapshot.attributionDetail?.topUtmCampaigns[0], { value: 'drop', count: 2 })
    assert.deepStrictEqual(snapshot.attributionDetail?.topReferrers[0], { value: 'https://ref.example', count: 1 })
  })

  await check('formatter has an empty-state and escapes unknown source labels', () => {
    const empty = formatFunnelSnapshot(emptySnapshot())
    assert.ok(empty.includes('/business'))

    const busy = formatFunnelSnapshot({
      ...emptySnapshot(),
      sources: [
        {
          source: '<unsafe>',
          stages: { new: 1, contacted: 0, follow_up: 0, closed_won: 0, closed_lost: 0, spam: 0, total: 1 },
          ordersConverted: 0,
          revenue: 0,
        },
      ],
      totals: {
        source: 'TOPLAM',
        stages: { new: 1, contacted: 0, follow_up: 0, closed_won: 0, closed_lost: 0, spam: 0, total: 1 },
        ordersConverted: 0,
        revenue: 0,
      },
      directOrders: { count: 1, revenue: 200 },
    })
    assert.ok(busy.includes('&lt;unsafe&gt;'))
    assert.ok(busy.includes('lead-siz'))
    assert.ok(busy.includes('200'))
  })
}

run()
  .then(() => {
    console.log(`\nfunnelDesk: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
    if (process.exitCode) process.exit(process.exitCode)
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
