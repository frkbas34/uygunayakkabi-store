/**
 * D-249 soak — exercise funnel snapshot against live Neon + synthetic inputs.
 *
 *  - getFunnelSnapshot live: composes leads + orders against real DB
 *  - formatFunnelSnapshot: renders 4 scenarios:
 *      1. live (sparse data)
 *      2. fully empty (window with zero activity)
 *      3. busy day, multi-source, with mid-funnel drop-off
 *      4. mixed with direct-orders bucket present
 *  - Period switch verified for both 'today' and 'week'
 *  - Read-only: pre/post lead+order counts unchanged
 */
import { readFileSync } from 'fs'
import { Client } from 'pg'

const u = readFileSync('.env', 'utf8').match(/^DATABASE_URI=(.+)$/m)?.[1]
if (!u) throw new Error('DATABASE_URI not in .env')

function camelizeRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v
  }
  return out
}

function makePayloadStub(c: Client) {
  return {
    db: { pool: c },
    async find(args: any) {
      const { collection, where, sort, limit } = args
      const tableMap: Record<string, string> = {
        'customer-inquiries': 'customer_inquiries',
        'orders': 'orders',
      }
      const table = tableMap[collection] ?? collection.replace(/-/g, '_')
      const { sql, vals } = compileWhere(table, where)
      const orderBy = sort ? compileSort(sort) : 'id ASC'
      const lim = limit ?? 10
      const r = await c.query(`SELECT * FROM ${table} WHERE ${sql} ORDER BY ${orderBy} LIMIT ${lim}`, vals)
      const tr = await c.query(`SELECT count(*)::int n FROM ${table} WHERE ${sql}`, vals)
      return { docs: r.rows.map(camelizeRow), totalDocs: tr.rows[0].n }
    },
    async findByID() { return null },
    async create() { return { id: -1 } },
  } as any
}

function compileWhere(table: string, where: any): { sql: string; vals: any[] } {
  const vals: any[] = []
  const fieldMap: Record<string, string> = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'eventType': 'event_type',
    'relatedInquiry': 'related_inquiry_id',
  }
  function f(name: string): string { return fieldMap[name] ?? name }
  function compile(node: any): string {
    if (!node || Object.keys(node).length === 0) return 'TRUE'
    if (node.and) return '(' + node.and.map((n: any) => compile(n)).join(' AND ') + ')'
    if (node.or) return '(' + node.or.map((n: any) => compile(n)).join(' OR ') + ')'
    const parts: string[] = []
    for (const [field, op] of Object.entries<any>(node)) {
      if (field === 'and' || field === 'or') continue
      const col = f(field)
      if (op.equals !== undefined) { vals.push(op.equals); parts.push(`${col} = $${vals.length}`) }
      else if (op.not_equals !== undefined) { vals.push(op.not_equals); parts.push(`${col} <> $${vals.length}`) }
      else if (op.in) {
        const ph = op.in.map((v: any) => { vals.push(v); return `$${vals.length}` }).join(',')
        parts.push(`${col} IN (${ph})`)
      } else if (op.greater_than !== undefined) { vals.push(op.greater_than); parts.push(`${col} > $${vals.length}`) }
    }
    return parts.join(' AND ')
  }
  return { sql: compile(where), vals }
}

function compileSort(s: string): string {
  const desc = s.startsWith('-')
  const f = (desc ? s.slice(1) : s).replace(/[A-Z]/g, m => '_' + m.toLowerCase())
  return `${f} ${desc ? 'DESC' : 'ASC'}`
}

const sep = (s: string) => console.log('\n=== ' + s + ' ===')

async function main() {
  const c = new Client({ connectionString: u, ssl: { rejectUnauthorized: false } })
  await c.connect()
  const payload = makePayloadStub(c)

  const { getFunnelSnapshot, formatFunnelSnapshot } =
    await import('/sessions/trusting-hopeful-goodall/uyayak-main/src/lib/funnelDesk')

  // Read-only check: before/after row counts must be identical
  const before = await c.query(`SELECT (SELECT count(*) FROM customer_inquiries) AS leads, (SELECT count(*) FROM orders) AS orders`)
  const beforeLeads = before.rows[0].leads
  const beforeOrders = before.rows[0].orders

  sep('1. live /funnel today — composes today-window snapshot from real Neon')
  const t0 = Date.now()
  const live = await getFunnelSnapshot(payload, { period: 'today' })
  console.log(`composed in ${Date.now() - t0}ms`)
  console.log(JSON.stringify({ windowLabel: live.windowLabel, sources: live.sources, totals: live.totals, directOrders: live.directOrders }, null, 2))
  console.log('--- rendered ---')
  console.log(formatFunnelSnapshot(live))

  sep('2. live /funnel week — same logic, 7-day window')
  const week = await getFunnelSnapshot(payload, { period: 'week' })
  console.log({ windowLabel: week.windowLabel, sourcesCount: week.sources.length, totalLeads: week.totals.stages.total, totalOrders: week.totals.ordersConverted, directOrders: week.directOrders })
  console.log('--- rendered ---')
  console.log(formatFunnelSnapshot(week))

  sep('3. read-only check — row counts unchanged')
  const after = await c.query(`SELECT (SELECT count(*) FROM customer_inquiries) AS leads, (SELECT count(*) FROM orders) AS orders`)
  console.log(`leads: ${beforeLeads} → ${after.rows[0].leads}`)
  console.log(`orders: ${beforeOrders} → ${after.rows[0].orders}`)
  if (beforeLeads !== after.rows[0].leads || beforeOrders !== after.rows[0].orders) {
    console.error('!! READ-ONLY FAIL — row counts changed')
  }

  sep('4. formatFunnelSnapshot — fully empty')
  console.log(formatFunnelSnapshot({
    windowLabel: 'bugün',
    windowStartISO: new Date().toISOString(),
    sources: [],
    totals: { source: 'TOPLAM', stages: { new: 0, contacted: 0, follow_up: 0, closed_won: 0, closed_lost: 0, spam: 0, total: 0 }, ordersConverted: 0, revenue: 0 },
    directOrders: { count: 0, revenue: 0 },
  }))

  sep('5. formatFunnelSnapshot — busy day, multi-source')
  console.log(formatFunnelSnapshot({
    windowLabel: 'bugün',
    windowStartISO: new Date().toISOString(),
    sources: [
      { source: 'website', stages: { new: 12, contacted: 5, follow_up: 2, closed_won: 2, closed_lost: 1, spam: 0, total: 12 }, ordersConverted: 1, revenue: 1499 },
      { source: 'telegram', stages: { new: 4, contacted: 3, follow_up: 0, closed_won: 1, closed_lost: 0, spam: 0, total: 4 }, ordersConverted: 1, revenue: 950 },
      { source: 'instagram', stages: { new: 3, contacted: 1, follow_up: 0, closed_won: 0, closed_lost: 0, spam: 1, total: 3 }, ordersConverted: 0, revenue: 0 },
    ],
    totals: { source: 'TOPLAM', stages: { new: 19, contacted: 9, follow_up: 2, closed_won: 3, closed_lost: 1, spam: 1, total: 19 }, ordersConverted: 2, revenue: 2449 },
    directOrders: { count: 0, revenue: 0 },
  }))

  sep('6. formatFunnelSnapshot — with direct-orders bucket')
  console.log(formatFunnelSnapshot({
    windowLabel: 'son 7 gün',
    windowStartISO: new Date().toISOString(),
    sources: [
      { source: 'website', stages: { new: 8, contacted: 4, follow_up: 1, closed_won: 2, closed_lost: 0, spam: 0, total: 8 }, ordersConverted: 2, revenue: 2199 },
    ],
    totals: { source: 'TOPLAM', stages: { new: 8, contacted: 4, follow_up: 1, closed_won: 2, closed_lost: 0, spam: 0, total: 8 }, ordersConverted: 2, revenue: 2199 },
    directOrders: { count: 3, revenue: 4500 },
  }))

  await c.end()
  console.log('\n*** D-249 soak complete ***')
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
