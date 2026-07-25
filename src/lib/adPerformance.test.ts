/**
 * adPerformance.test.ts - D-383 manual ad performance assertions.
 *
 * Proves the manual ad report stays read-only and attributes orders only
 * through existing UTM-tagged leads plus relatedInquiry.
 */
import assert from 'node:assert'
import {
  formatAdPerformanceSnapshot,
  getAdPerformanceSnapshot,
  parseAdPerformancePeriod,
  type AdPerformanceSnapshot,
} from './adPerformance'

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
    writes: 0,
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
    async create() { this.writes += 1 },
    async update() { this.writes += 1 },
    async delete() { this.writes += 1 },
  }
}

function emptySnapshot(): AdPerformanceSnapshot {
  return {
    period: 'week',
    windowLabel: 'last 7 days',
    windowStartISO: new Date().toISOString(),
    staleDays: 3,
    rows: [],
    totals: {
      source: 'all',
      medium: 'all',
      campaign: 'all_campaigns',
      leads: 0,
      openLeads: 0,
      staleOpenLeads: 0,
      wonLeads: 0,
      lostLeads: 0,
      spamLeads: 0,
      orders: 0,
      revenue: 0,
      conversionRate: 0,
      averageOrderValue: 0,
    },
    untaggedLeads: 0,
    directOrders: { count: 0, revenue: 0 },
    guardrails: ['Read-only: no Pixel, CAPI, Ads API, or ad spend.'],
  }
}

async function run() {
  await check('groups UTM leads by campaign and attributes related orders', async () => {
    const payload = fakePayload({
      leads: [
        {
          id: 1,
          status: 'new',
          createdAt: isoDaysAgo(0),
          updatedAt: isoDaysAgo(0),
          utmSource: 'Meta',
          utmMedium: 'Paid_Social',
          utmCampaign: 'First_Loafers',
        },
        {
          id: 2,
          status: 'closed_won',
          createdAt: isoDaysAgo(0),
          utmSource: 'meta',
          utmMedium: 'paid_social',
          utmCampaign: 'first_loafers',
        },
        {
          id: 3,
          status: 'closed_lost',
          createdAt: isoDaysAgo(0),
          utmSource: 'google',
          utmMedium: 'cpc',
          utmCampaign: 'search_test',
        },
      ],
      orders: [
        { id: 10, relatedInquiry: 2, totalPrice: '2099', createdAt: isoDaysAgo(0) },
        { id: 11, relatedInquiry: 999, totalPrice: 700, createdAt: isoDaysAgo(0) },
      ],
    })

    const snapshot = await getAdPerformanceSnapshot(payload, { period: 'week' })
    const meta = snapshot.rows.find((row) => row.source === 'meta' && row.campaign === 'first_loafers')
    const google = snapshot.rows.find((row) => row.source === 'google')

    assert.ok(meta)
    assert.strictEqual(meta.leads, 2)
    assert.strictEqual(meta.openLeads, 1)
    assert.strictEqual(meta.wonLeads, 1)
    assert.strictEqual(meta.orders, 1)
    assert.strictEqual(meta.revenue, 2099)
    assert.strictEqual(meta.conversionRate, 0.5)

    assert.ok(google)
    assert.strictEqual(google.leads, 1)
    assert.strictEqual(google.lostLeads, 1)

    assert.strictEqual(snapshot.totals.leads, 3)
    assert.strictEqual(snapshot.totals.orders, 1)
    assert.strictEqual(snapshot.directOrders.count, 1)
    assert.strictEqual(snapshot.directOrders.revenue, 700)
    assert.strictEqual(payload.writes, 0)
  })

  await check('keeps untagged leads out of campaign rows and reports them separately', async () => {
    const payload = fakePayload({
      leads: [
        { id: 1, status: 'new', createdAt: isoDaysAgo(0) },
        { id: 2, status: 'follow_up', createdAt: isoDaysAgo(4), updatedAt: isoDaysAgo(4), utmSource: 'meta' },
      ],
      orders: [],
    })

    const snapshot = await getAdPerformanceSnapshot(payload, { period: 'month', staleDays: 3 })
    assert.strictEqual(snapshot.untaggedLeads, 1)
    assert.strictEqual(snapshot.rows.length, 1)
    assert.strictEqual(snapshot.rows[0].source, 'meta')
    assert.strictEqual(snapshot.rows[0].medium, 'unknown_medium')
    assert.strictEqual(snapshot.rows[0].campaign, 'uncampaigned')
    assert.strictEqual(snapshot.rows[0].staleOpenLeads, 1)
  })

  await check('parser supports today, week default, and month aliases', () => {
    assert.strictEqual(parseAdPerformancePeriod('today'), 'today')
    assert.strictEqual(parseAdPerformancePeriod('30d'), 'month')
    assert.strictEqual(parseAdPerformancePeriod('anything'), 'week')
  })

  await check('formatter renders empty state, escapes labels, and repeats no-spend guardrails', () => {
    const empty = formatAdPerformanceSnapshot({
      ...emptySnapshot(),
      untaggedLeads: 2,
      directOrders: { count: 1, revenue: 500 },
    })
    assert.ok(empty.includes('/adpack'))
    assert.ok(empty.includes('Pixel'))
    assert.ok(empty.includes('ad spend'))

    const busy = formatAdPerformanceSnapshot({
      ...emptySnapshot(),
      rows: [{
        source: '<meta>',
        medium: 'paid_social',
        campaign: '<drop>',
        leads: 1,
        openLeads: 1,
        staleOpenLeads: 0,
        wonLeads: 0,
        lostLeads: 0,
        spamLeads: 0,
        orders: 0,
        revenue: 0,
        conversionRate: 0,
        averageOrderValue: 0,
      }],
      totals: {
        ...emptySnapshot().totals,
        leads: 1,
        openLeads: 1,
      },
    })
    assert.ok(busy.includes('&lt;meta&gt;'))
    assert.ok(busy.includes('&lt;drop&gt;'))
    assert.ok(busy.includes('Pixel'))
    assert.ok(busy.includes('ad spend'))
  })
}

run()
  .then(() => {
    console.log(`\nadPerformance: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
    if (process.exitCode) process.exit(process.exitCode)
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
