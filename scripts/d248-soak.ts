/**
 * D-248 soak — exercise the business snapshot composition.
 *
 *  - getBusinessSnapshot against real Neon (using the same SQL stub
 *    as previous soaks). Composes 4 helpers in parallel.
 *  - formatBusinessSnapshot rendered against 4 synthetic scenarios:
 *    fully-empty, busy-day-no-urgency, urgency-only, mixed-realistic.
 *
 * Read-only — never writes to the DB.
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
        'products': 'products',
        'bot-events': 'bot_events',
        'orders': 'orders',
      }
      const table = tableMap[collection] ?? collection.replace(/-/g, '_')
      const { sql, vals } = compileWhere(table, where)
      const orderBy = sort ? compileSort(sort) : 'id ASC'
      const lim = limit ?? 10
      const r = await c.query(`SELECT * FROM ${table} WHERE ${sql} ORDER BY ${orderBy} LIMIT ${lim}`, vals)
      const tr = await c.query(`SELECT count(*)::int n FROM ${table} WHERE ${sql}`, vals)
      const docs = await Promise.all(
        r.rows.map(async (row: any) => {
          const cam = camelizeRow(row)
          if ((args.depth ?? 0) >= 1 && cam.productId) {
            const p = await c.query(`SELECT id, stock_number, title FROM products WHERE id=$1`, [cam.productId])
            if (p.rows[0]) cam.product = { id: p.rows[0].id, stockNumber: p.rows[0].stock_number, title: p.rows[0].title }
          }
          return cam
        }),
      )
      return { docs, totalDocs: tr.rows[0].n }
    },
    async findByID() { return null },
  } as any
}

function compileWhere(table: string, where: any): { sql: string; vals: any[] } {
  const vals: any[] = []
  // Real prod schema is flat snake_case (workflow_stock_state etc.), not JSONB.
  // This stub mirrors that for the queries getInboxStock + sibling helpers
  // actually issue.
  const fieldMap: Record<string, string> = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'eventType': 'event_type',
    'relatedInquiry': 'related_inquiry_id',
    'workflow.workflowStatus': 'workflow_workflow_status',
    'workflow.contentStatus': 'workflow_content_status',
    'workflow.confirmationStatus': 'workflow_confirmation_status',
    'workflow.visualStatus': 'workflow_visual_status',
    'workflow.auditStatus': 'workflow_audit_status',
    'workflow.stockState': 'workflow_stock_state',
    'sourceMeta.shopierSyncStatus': 'source_meta_shopier_sync_status',
    'content.lastContentGenerationAt': 'content_last_content_generation_at',
    'workflow.productConfirmedAt': 'workflow_product_confirmed_at',
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
        const placeholders = op.in.map((v: any) => { vals.push(v); return `$${vals.length}` }).join(',')
        parts.push(`${col} IN (${placeholders})`)
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

  const { getBusinessSnapshot, formatBusinessSnapshot } =
    await import('/sessions/trusting-hopeful-goodall/uyayak-main/src/lib/businessDesk')

  sep('1. getBusinessSnapshot — live composition over real Neon')
  const t0 = Date.now()
  const snap = await getBusinessSnapshot(payload)
  console.log(`composed in ${Date.now() - t0}ms`)
  console.log(snap)

  sep('2. formatBusinessSnapshot — rendered live snapshot')
  console.log(formatBusinessSnapshot(snap))

  sep('3. formatBusinessSnapshot — fully-empty (Temiz short-circuit)')
  console.log(formatBusinessSnapshot({
    leadsNewToday: 0, leadsContactedToday: 0, leadsWonToday: 0, leadsLostToday: 0, leadsSpamToday: 0,
    leadsTotalOpen: 0, leadsTotalStale: 0, leadStaleDays: 3,
    ordersCreatedToday: 0, ordersFromLeadsToday: 0, revenueToday: 0,
    ordersTotalOpen: 0, ordersShippedToday: 0, ordersDeliveredToday: 0, ordersCancelledToday: 0,
    ordersStaleShipped: 0, orderStaleDays: 3,
    stockSoldout: 0, stockLowStock: 0,
  }))

  sep('4. formatBusinessSnapshot — busy day, no urgency (urgency block hidden)')
  console.log(formatBusinessSnapshot({
    leadsNewToday: 5, leadsContactedToday: 3, leadsWonToday: 2, leadsLostToday: 1, leadsSpamToday: 0,
    leadsTotalOpen: 8, leadsTotalStale: 0, leadStaleDays: 3,
    ordersCreatedToday: 3, ordersFromLeadsToday: 2, revenueToday: 4500,
    ordersTotalOpen: 4, ordersShippedToday: 1, ordersDeliveredToday: 2, ordersCancelledToday: 0,
    ordersStaleShipped: 0, orderStaleDays: 3,
    stockSoldout: 0, stockLowStock: 0,
  }))

  sep('5. formatBusinessSnapshot — quiet day with mounting urgency')
  console.log(formatBusinessSnapshot({
    leadsNewToday: 0, leadsContactedToday: 0, leadsWonToday: 0, leadsLostToday: 0, leadsSpamToday: 0,
    leadsTotalOpen: 6, leadsTotalStale: 4, leadStaleDays: 3,
    ordersCreatedToday: 0, ordersFromLeadsToday: 0, revenueToday: 0,
    ordersTotalOpen: 5, ordersShippedToday: 0, ordersDeliveredToday: 0, ordersCancelledToday: 0,
    ordersStaleShipped: 2, orderStaleDays: 3,
    stockSoldout: 3, stockLowStock: 1,
  }))

  sep('6. formatBusinessSnapshot — mixed realistic (everything happening)')
  console.log(formatBusinessSnapshot({
    leadsNewToday: 4, leadsContactedToday: 2, leadsWonToday: 1, leadsLostToday: 1, leadsSpamToday: 1,
    leadsTotalOpen: 12, leadsTotalStale: 2, leadStaleDays: 3,
    ordersCreatedToday: 2, ordersFromLeadsToday: 1, revenueToday: 2199,
    ordersTotalOpen: 6, ordersShippedToday: 3, ordersDeliveredToday: 1, ordersCancelledToday: 1,
    ordersStaleShipped: 1, orderStaleDays: 3,
    stockSoldout: 2, stockLowStock: 3,
  }))

  await c.end()
  console.log('\n*** D-248 soak complete ***')
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
