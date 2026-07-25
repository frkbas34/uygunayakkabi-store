import assert from 'node:assert'
import {
  buildLeadFollowupPlanFromLeads,
  formatLeadFollowupPlan,
  getLeadFollowupPlan,
} from './leadFollowupPlan'
import type { LeadEntry } from './leadDesk'

let passed = 0

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

function lead(input: Partial<LeadEntry> & Pick<LeadEntry, 'id' | 'status'>): LeadEntry {
  return {
    id: input.id,
    name: input.name ?? `Lead ${input.id}`,
    phone: input.phone ?? `555000${input.id}`,
    status: input.status,
    message: input.message ?? null,
    size: input.size ?? null,
    source: input.source ?? 'website',
    utmSource: input.utmSource ?? null,
    utmMedium: input.utmMedium ?? null,
    utmCampaign: input.utmCampaign ?? null,
    referrer: input.referrer ?? null,
    product: input.product ?? null,
    lastContactedAt: input.lastContactedAt ?? null,
    handledAt: input.handledAt ?? null,
    createdAt: input.createdAt ?? '2026-07-01T10:00:00.000Z',
    updatedAt: input.updatedAt ?? input.createdAt ?? '2026-07-01T10:00:00.000Z',
  }
}

const now = new Date('2026-07-04T12:00:00.000Z')

async function main() {
  await check('prioritizes never-touched stale leads before follow-up and contacted leads', () => {
    const plan = buildLeadFollowupPlanFromLeads([
      lead({ id: 3, status: 'contacted', lastContactedAt: '2026-06-29T09:00:00.000Z' }),
      lead({ id: 1, status: 'new', createdAt: '2026-06-28T09:00:00.000Z' }),
      lead({ id: 2, status: 'follow_up', lastContactedAt: '2026-06-30T09:00:00.000Z' }),
    ], { now, staleDays: 3 })

    assert.strictEqual(plan.items[0].lead.id, 1)
    assert.strictEqual(plan.items[0].action, 'call_now')
    assert.strictEqual(plan.items[1].action, 'follow_up_due')
    assert.strictEqual(plan.items[2].action, 'check_contacted')
    assert.strictEqual(plan.counts.call_now, 1)
    assert.strictEqual(plan.counts.follow_up_due, 1)
    assert.strictEqual(plan.counts.check_contacted, 1)
  })

  await check('keeps fresh leads visible without marking them stale', () => {
    const plan = buildLeadFollowupPlanFromLeads([
      lead({ id: 4, status: 'new', createdAt: '2026-07-04T09:00:00.000Z' }),
      lead({ id: 5, status: 'follow_up', lastContactedAt: '2026-07-04T08:00:00.000Z' }),
    ], { now, staleDays: 3 })

    assert.strictEqual(plan.counts.fresh_new, 1)
    assert.strictEqual(plan.counts.monitor, 1)
    assert.strictEqual(plan.items[0].action, 'fresh_new')
  })

  await check('formatter is read-only and includes suggested manual lead commands', () => {
    const plan = buildLeadFollowupPlanFromLeads([
      lead({ id: 7, status: 'new', createdAt: '2026-06-28T09:00:00.000Z', utmCampaign: 'summer' }),
    ], { now, staleDays: 3 })
    const formatted = formatLeadFollowupPlan(plan)

    assert.ok(formatted.includes('Lead Follow-up Plan'))
    assert.ok(formatted.includes('/contacted 7'))
    assert.ok(formatted.includes('Read-only'))
    assert.ok(!formatted.includes('/adlaunch'))
    assert.ok(!formatted.includes('/shopier publish-ready confirm'))
  })

  await check('adds lead and product operator links with public PDP only for public products', () => {
    const plan = buildLeadFollowupPlanFromLeads([
      lead({
        id: 10,
        status: 'new',
        createdAt: '2026-06-28T09:00:00.000Z',
        product: {
          id: 901,
          title: 'Siyah Tokali Loafer',
          stockNumber: 'SN0901',
          slug: 'siyah-tokali-loafer-sn0901',
          status: 'active',
        },
      }),
      lead({
        id: 11,
        status: 'new',
        createdAt: '2026-06-29T09:00:00.000Z',
        product: {
          id: 902,
          title: 'Draft Loafer',
          stockNumber: 'SN0902',
          slug: 'draft-loafer-sn0902',
          status: 'draft',
        },
      }),
    ], { now, staleDays: 3 })

    assert.strictEqual(plan.items[0].operatorLinks.leadAdminUrl, 'https://www.uygunayakkabi.com/admin/collections/customer-inquiries/10')
    assert.strictEqual(plan.items[0].operatorLinks.productAdminUrl, 'https://www.uygunayakkabi.com/admin/collections/products/901')
    assert.strictEqual(plan.items[0].operatorLinks.productUrl, 'https://www.uygunayakkabi.com/products/siyah-tokali-loafer-sn0901')
    assert.strictEqual(plan.items[1].operatorLinks.leadAdminUrl, 'https://www.uygunayakkabi.com/admin/collections/customer-inquiries/11')
    assert.strictEqual(plan.items[1].operatorLinks.productAdminUrl, 'https://www.uygunayakkabi.com/admin/collections/products/902')
    assert.strictEqual(plan.items[1].operatorLinks.productUrl, null)

    const formatted = formatLeadFollowupPlan(plan)
    assert.ok(formatted.includes('Links: <a href="https://www.uygunayakkabi.com/admin/collections/customer-inquiries/10">lead admin</a> / <a href="https://www.uygunayakkabi.com/admin/collections/products/901">product admin</a> / <a href="https://www.uygunayakkabi.com/products/siyah-tokali-loafer-sn0901">PDP</a>'), formatted)
    assert.ok(formatted.includes('Links: <a href="https://www.uygunayakkabi.com/admin/collections/customer-inquiries/11">lead admin</a> / <a href="https://www.uygunayakkabi.com/admin/collections/products/902">product admin</a>'), formatted)
    assert.ok(!formatted.includes('https://www.uygunayakkabi.com/products/draft-loafer-sn0902'), formatted)
  })

  await check('reports sampled open count when the open list is capped upstream', () => {
    const plan = buildLeadFollowupPlanFromLeads([
      lead({ id: 8, status: 'new' }),
    ], { now, totalOpen: 12, staleDays: 3 })
    const formatted = formatLeadFollowupPlan(plan)

    assert.strictEqual(plan.totalOpen, 12)
    assert.strictEqual(plan.sampledOpen, 1)
    assert.ok(formatted.includes('sampled: 1'))
  })

  await check('payload wrapper uses open leads without writes', async () => {
    const calls: Array<{ collection: string; operation: string }> = []
    const payload = {
      async find(args: { collection: string }) {
        calls.push({ collection: args.collection, operation: 'find' })
        return {
          totalDocs: 1,
          docs: [
            lead({ id: 9, status: 'new', createdAt: '2026-06-28T09:00:00.000Z' }),
          ],
        }
      },
    }

    const plan = await getLeadFollowupPlan(payload, { now, staleDays: 3 })
    assert.strictEqual(plan.items[0].lead.id, 9)
    assert.deepStrictEqual(calls, [{ collection: 'customer-inquiries', operation: 'find' }])
  })

  console.log(`\nleadFollowupPlan: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
}

void main()
