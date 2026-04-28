/**
 * D-244 soak — exercise the conversion logging path against real Neon.
 *
 * Mirrors the behavior of /convert, /conversion, /sales today using the
 * same helpers the bot calls. Because Payload's CLI envloader is broken
 * outside Next runtime (D-241 soak note), we use the same SQL stub
 * pattern as D-242/D-243 — backs onto pg, returns camelCased rows so
 * the helpers see Payload-shaped data.
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
      // Hydrate product reference at depth>=1 (mimics Payload depth)
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
    async findByID(args: any) {
      const tableMap: Record<string, string> = {
        'customer-inquiries': 'customer_inquiries',
        'products': 'products',
        'orders': 'orders',
      }
      const table = tableMap[args.collection] ?? args.collection.replace(/-/g, '_')
      const r = await c.query(`SELECT * FROM ${table} WHERE id=$1`, [args.id])
      if (!r.rows[0]) return null
      const row = camelizeRow(r.rows[0])
      if ((args.depth ?? 0) >= 1 && row.productId) {
        const p = await c.query(`SELECT id, stock_number, title FROM products WHERE id=$1`, [row.productId])
        if (p.rows[0]) row.product = { id: p.rows[0].id, stockNumber: p.rows[0].stock_number, title: p.rows[0].title }
      }
      return row
    },
    async create(args: any) {
      if (args.collection === 'orders') {
        const d = args.data as any
        const orderNumber = d.orderNumber ?? `ORD-SOAK-${Date.now().toString().slice(-6)}`
        const r = await c.query(
          `INSERT INTO orders
             (order_number, customer_name, customer_phone, product_id, size, quantity,
              total_price, status, source, related_inquiry_id, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
           RETURNING *`,
          [orderNumber, d.customerName ?? null, d.customerPhone ?? null, d.product ?? null, d.size ?? null,
           d.quantity ?? 1, d.totalPrice ?? null, d.status ?? 'new', d.source ?? 'telegram',
           d.relatedInquiry ?? null, d.notes ?? null],
        )
        return camelizeRow(r.rows[0])
      }
      if (args.collection === 'bot-events') {
        await c.query(
          `INSERT INTO bot_events (event_type, source_bot, status, payload, notes, processed_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4::jsonb, $5, NOW(), NOW(), NOW())`,
          [args.data.eventType, args.data.sourceBot, args.data.status, JSON.stringify(args.data.payload), args.data.notes ?? null],
        )
        return { id: -1 }
      }
      throw new Error(`stub.create not implemented for collection=${args.collection}`)
    },
    async update(args: any) {
      // applyLeadStatus calls payload.update on customer-inquiries
      if (args.collection === 'customer-inquiries') {
        const cols: string[] = []
        const vals: any[] = []
        for (const [k, v] of Object.entries<any>(args.data)) {
          const sk = k.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
          vals.push(v); cols.push(`${sk}=$${vals.length}`)
        }
        vals.push(args.id)
        await c.query(`UPDATE customer_inquiries SET ${cols.join(', ')} WHERE id=$${vals.length}`, vals)
        return { id: args.id }
      }
      throw new Error(`stub.update not implemented for collection=${args.collection}`)
    },
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

  const {
    convertLeadToOrder,
    getConversionForLead,
    formatConversionCard,
    getSalesToday,
    formatSalesTodaySnapshot,
  } = await import('/sessions/trusting-hopeful-goodall/uyayak-main/src/lib/leadDesk')

  // Reset test leads to known state — id=1 is the linked-to-product test case
  await c.query(`UPDATE customer_inquiries SET status='new', last_contacted_at=NULL, handled_at=NULL WHERE id IN (1,2,3)`)
  // Wipe any pre-existing soak orders so this is a clean run
  const wipeRes = await c.query(`DELETE FROM orders WHERE order_number LIKE 'ORD-SOAK-%' OR notes LIKE '%[d244-soak]%' RETURNING id`)
  console.log(`pre-clean: removed ${wipeRes.rowCount} prior soak orders`)

  sep('1. /conversion 1 — empty state (no order yet)')
  const empty = await getConversionForLead(payload, 1)
  console.log('result:', empty)
  console.log(formatConversionCard(empty, 1))

  sep('2. /convert 1 1500 Kapıda nakit — first run')
  const r1 = await convertLeadToOrder(payload, 1, {
    totalPrice: 1500,
    notes: 'Kapıda nakit [d244-soak]',
    source: 'telegram_command',
  })
  console.log('ok=' + r1.ok, 'idempotent=' + r1.idempotent, 'orderId=' + r1.conversion?.orderId, 'orderNumber=' + r1.conversion?.orderNumber)
  console.log('message:'); console.log(r1.message)

  sep('3. /convert 1 — second run (idempotency)')
  const r2 = await convertLeadToOrder(payload, 1, { totalPrice: 9999, notes: 'should be ignored', source: 'telegram_command' })
  console.log('ok=' + r2.ok, 'idempotent=' + r2.idempotent)
  console.log('refusalReason=' + r2.refusalReason)
  console.log('message:'); console.log(r2.message)
  if (!r2.idempotent) console.error('!! IDEMPOTENCY FAIL — second /convert should be a no-op')

  sep('4. lead 1 status check — should be closed_won (auto-flipped)')
  const l1 = (await c.query('SELECT status, handled_at FROM customer_inquiries WHERE id=1')).rows[0]
  console.log('lead 1:', l1)
  if (l1.status !== 'closed_won') console.error('!! WON-FLIP FAIL — lead should be closed_won')

  sep('5. /conversion 1 — populated state')
  const c1 = await getConversionForLead(payload, 1)
  console.log(formatConversionCard(c1, 1))

  sep('6. /convert 999 — missing lead refusal')
  const r3 = await convertLeadToOrder(payload, 999, { source: 'telegram_command' })
  console.log('ok=' + r3.ok, 'refusalReason=' + r3.refusalReason)
  console.log('message:'); console.log(r3.message)

  sep('7. /convert 2 — second test lead, no amount/notes (smallest path)')
  const r4 = await convertLeadToOrder(payload, 2, { source: 'telegram_command' })
  console.log('ok=' + r4.ok, 'idempotent=' + r4.idempotent, 'orderNumber=' + r4.conversion?.orderNumber)

  sep('8. /sales today — populated snapshot')
  const sales = await getSalesToday(payload)
  console.log(`count=${sales.count} fromLeads=${sales.countFromLeads} totalRevenue=${sales.totalRevenue}`)
  console.log(formatSalesTodaySnapshot(sales))

  sep('9. audit-trail check — lead.converted bot-events')
  const ev = await c.query(`SELECT id, payload FROM bot_events WHERE event_type='lead.converted' ORDER BY id DESC LIMIT 5`)
  console.log(`audit entries: ${ev.rows.length}`)
  for (const row of ev.rows) {
    const p = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
    console.log(`  evtId=${row.id} lead=${p?.leadId} order=${p?.orderNumber} amount=${p?.totalPrice ?? '-'}`)
  }

  sep('10. cleanup — remove soak orders + bot-events, reset leads')
  // Mark the bot-events as ignored (preserves audit thread but doesn't clutter)
  const eUpd = await c.query(`UPDATE bot_events SET status='ignored', notes = COALESCE(notes,'') || ' [d244-soak]' WHERE event_type='lead.converted' AND id IN (${ev.rows.map(r => r.id).join(',') || 'NULL'})`)
  console.log(`bot-events marked ignored: ${eUpd.rowCount}`)
  // Find the orders we just created (by relatedInquiry IN (1,2) AND created in this run)
  const dRes = await c.query(`DELETE FROM orders WHERE related_inquiry_id IN (1,2) AND notes LIKE '%[d244-soak]%' OR (related_inquiry_id IN (1,2) AND notes IS NULL AND order_number NOT LIKE 'ORD-' OR order_number LIKE 'ORD-SOAK-%') RETURNING id, order_number`)
  console.log(`orders deleted: ${dRes.rowCount}`)
  // Belt-and-suspenders cleanup using the order-number prefix
  await c.query(`DELETE FROM orders WHERE order_number LIKE 'ORD-SOAK-%' OR order_number LIKE 'ORD-${Date.now().toString().slice(-6,-3)}%' AND related_inquiry_id IN (1,2,3)`)
  // Reset leads
  await c.query(`UPDATE customer_inquiries SET status='new', last_contacted_at=NULL, handled_at=NULL, updated_at=NOW() WHERE id IN (1,2,3)`)
  console.log('test leads reset to status=new')

  await c.end()
  console.log('\n*** D-244 soak complete ***')
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
