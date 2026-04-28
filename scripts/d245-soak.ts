/**
 * D-245 soak — exercise order fulfillment helpers against live Neon.
 *
 * Same SQL-stub pattern as D-244 since Payload's CLI envloader is broken
 * outside Next runtime. The stub returns camelCased rows so the helpers
 * see Payload-shaped data.
 *
 * Cleanup at the end leaves no residue.
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
        const orderNumber = d.orderNumber ?? `ORD-D245-${Date.now().toString().slice(-6)}`
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
      const tableMap: Record<string, string> = {
        'customer-inquiries': 'customer_inquiries',
        'orders': 'orders',
      }
      const table = tableMap[args.collection] ?? args.collection.replace(/-/g, '_')
      const cols: string[] = []; const vals: any[] = []
      for (const [k, v] of Object.entries<any>(args.data)) {
        const sk = k.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
        vals.push(v); cols.push(`${sk}=$${vals.length}`)
      }
      vals.push(args.id)
      await c.query(`UPDATE ${table} SET ${cols.join(', ')}, updated_at=NOW() WHERE id=$${vals.length}`, vals)
      return { id: args.id }
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

  const desk = await import('/sessions/trusting-hopeful-goodall/uyayak-main/src/lib/orderDesk')

  // --- pre-clean any leftover D-245 soak orders ---
  const wipe = await c.query(`DELETE FROM orders WHERE order_number LIKE 'ORD-D245-%' RETURNING id`)
  console.log(`pre-clean: removed ${wipe.rowCount} prior soak orders`)

  // --- seed 3 fresh orders for the test run ---
  // Order A: status=new, linked to lead 1 + product 285 (the existing test data)
  const orderA = (await payload.create({
    collection: 'orders',
    data: { customerName: 'TEST D-245 — A', customerPhone: '+905550010001', product: 285, size: '42', quantity: 1, totalPrice: 1200, status: 'new', source: 'telegram', relatedInquiry: 1 },
  })) as any
  // Order B: status=confirmed, no lead link
  const orderB = (await payload.create({
    collection: 'orders',
    data: { customerName: 'TEST D-245 — B', customerPhone: '+905550010002', product: 285, size: '40', quantity: 1, totalPrice: 950, status: 'confirmed', source: 'telegram' },
  })) as any
  // Order C: status=confirmed, will be cancelled
  const orderC = (await payload.create({
    collection: 'orders',
    data: { customerName: 'TEST D-245 — C', customerPhone: '+905550010003', quantity: 2, totalPrice: 700, status: 'confirmed', source: 'telegram' },
  })) as any
  console.log(`seeded orders: A=${orderA.id} B=${orderB.id} C=${orderC.id}`)

  sep('1. /orders — open queue with the 3 seeded')
  const open = await desk.getOpenOrders(payload)
  console.log(`totalOpen=${open.totalOpen} counts=${JSON.stringify(open.counts)}`)
  console.log(desk.formatOpenOrdersList(open))

  sep('2. /order <A> — detail card')
  const card = await desk.getOrderById(payload, orderA.id)
  console.log(desk.formatOrderCard(card!))

  sep('3. /ship <A> — first press')
  const r1 = await desk.applyOrderStatus(payload, orderA.id, 'ship', 'telegram_command')
  console.log('ok=' + r1.ok, 'idempotent=' + r1.idempotent, 'from=' + r1.fromStatus, 'to=' + r1.toStatus)
  console.log(r1.message)

  sep('4. /ship <A> — second press (idempotency)')
  const r2 = await desk.applyOrderStatus(payload, orderA.id, 'ship', 'telegram_command')
  console.log('idempotent=' + r2.idempotent, 'message:', r2.message.split('\n')[0])
  if (!r2.idempotent) console.error('!! IDEMPOTENCY FAIL — second /ship should be no-op')

  sep('5. /deliver <A> — A was shipped, now deliver')
  const r3 = await desk.applyOrderStatus(payload, orderA.id, 'deliver', 'telegram_command')
  console.log('ok=' + r3.ok, 'from=' + r3.fromStatus, 'to=' + r3.toStatus)
  console.log(r3.message)
  // Verify timestamps
  const aRow = (await c.query('SELECT shipped_at, delivered_at, status FROM orders WHERE id=$1', [orderA.id])).rows[0]
  console.log('  raw row:', aRow)

  sep('6. /deliver <A> — second press (idempotency)')
  const r4 = await desk.applyOrderStatus(payload, orderA.id, 'deliver', 'telegram_command')
  console.log('idempotent=' + r4.idempotent, 'first line:', r4.message.split('\n')[0])
  if (!r4.idempotent) console.error('!! IDEMPOTENCY FAIL — second /deliver should be no-op')

  sep('7. /ship <A> after delivered — should refuse')
  const r5 = await desk.applyOrderStatus(payload, orderA.id, 'ship', 'telegram_command')
  console.log('ok=' + r5.ok, 'refusalReason=' + r5.refusalReason)
  console.log(r5.message)

  sep('8. /cancelorder <A> after delivered — should refuse with refund hint')
  const r6 = await desk.applyOrderStatus(payload, orderA.id, 'cancel', 'telegram_command')
  console.log('ok=' + r6.ok, 'refusalReason=' + r6.refusalReason)
  console.log(r6.message)

  sep('9. /deliver <B> — B is "confirmed" (skipping shipped) — should ALLOW + auto-stamp shippedAt')
  const r7 = await desk.applyOrderStatus(payload, orderB.id, 'deliver', 'telegram_command')
  console.log('ok=' + r7.ok, 'from=' + r7.fromStatus, 'to=' + r7.toStatus)
  console.log(r7.message)
  const bRow = (await c.query('SELECT shipped_at, delivered_at, status FROM orders WHERE id=$1', [orderB.id])).rows[0]
  console.log('  raw row:', bRow)
  if (!bRow.shipped_at) console.error('!! BACKFILL FAIL — confirmed→delivered should backfill shippedAt')

  sep('10. /cancelorder <C> — C still confirmed; cancel should succeed with /restock pointer')
  const r8 = await desk.applyOrderStatus(payload, orderC.id, 'cancel', 'telegram_command')
  console.log('ok=' + r8.ok, 'from=' + r8.fromStatus, 'to=' + r8.toStatus)
  console.log(r8.message)

  sep('11. /cancelorder <C> — second press (idempotency)')
  const r9 = await desk.applyOrderStatus(payload, orderC.id, 'cancel', 'telegram_command')
  console.log('idempotent=' + r9.idempotent)

  sep('12. /ship <C> — cancelled order, should refuse')
  const r10 = await desk.applyOrderStatus(payload, orderC.id, 'ship', 'telegram_command')
  console.log('ok=' + r10.ok, 'refusalReason=' + r10.refusalReason)
  console.log(r10.message.split('\n')[0])

  sep('13. /order 999999 — missing id')
  const r11 = await desk.applyOrderStatus(payload, 999999, 'ship', 'telegram_command')
  console.log('ok=' + r11.ok, 'refusalReason=' + r11.refusalReason)

  sep('14. /orders empty state — flip everything terminal')
  await c.query(`UPDATE orders SET status='delivered' WHERE id IN ($1, $2, $3)`, [orderA.id, orderB.id, orderC.id])
  const empty = await desk.getOpenOrders(payload)
  console.log(`open after closing: totalOpen=${empty.totalOpen}`)
  console.log(desk.formatOpenOrdersList(empty))

  sep('15. /orders today snapshot')
  const today = await desk.getTodayOrders(payload)
  console.log(today)

  sep('16. audit-trail check — order.status_changed bot-events')
  const ev = await c.query(`SELECT id, payload FROM bot_events WHERE event_type='order.status_changed' ORDER BY id DESC LIMIT 10`)
  console.log(`audit entries: ${ev.rows.length}`)
  for (const row of ev.rows) {
    const p = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
    console.log(`  evtId=${row.id} order=${p?.orderNumber} ${p?.fromStatus} → ${p?.toStatus} via ${p?.source}`)
  }

  sep('17. cleanup — delete soak orders + mark audit ignored')
  // mark audit events as ignored (preserve thread, don't clutter)
  const eu = await c.query(`UPDATE bot_events SET status='ignored', notes = COALESCE(notes,'') || ' [d245-soak]' WHERE event_type='order.status_changed' AND id IN (${ev.rows.map(r => r.id).join(',') || 'NULL'})`)
  console.log(`audit events marked ignored: ${eu.rowCount}`)
  const wipeAfter = await c.query(`DELETE FROM orders WHERE order_number LIKE 'ORD-D245-%' RETURNING id`)
  console.log(`orders deleted: ${wipeAfter.rowCount}`)

  await c.end()
  console.log('\n*** D-245 soak complete ***')
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
