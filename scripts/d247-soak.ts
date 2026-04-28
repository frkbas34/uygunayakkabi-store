/**
 * D-247 soak — exercise alert + reminder + summary against live Neon.
 *
 *  - sendNewOrderAlert: fetch mocked so test captures exact Telegram payload
 *  - getStaleShippedOrders / formatOrderRemindersHeader: against real DB
 *  - getDailyOrderSummary / formatDailyOrderSummary: against real DB
 *  - Bot-event emission for order.new_alert_sent verified by SQL count
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
        const orderNumber = d.orderNumber ?? `ORD-D247-${Date.now().toString().slice(-6)}`
        const r = await c.query(
          `INSERT INTO orders
             (order_number, customer_name, customer_phone, product_id, size, quantity,
              total_price, status, source, related_inquiry_id, notes, shipped_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
           RETURNING *`,
          [orderNumber, d.customerName ?? null, d.customerPhone ?? null, d.product ?? null, d.size ?? null,
           d.quantity ?? 1, d.totalPrice ?? null, d.status ?? 'new', d.source ?? 'telegram',
           d.relatedInquiry ?? null, d.notes ?? null, d.shippedAt ?? null],
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

  // Pre-clean any prior soak rows
  const wipe = await c.query(`DELETE FROM orders WHERE order_number LIKE 'ORD-D247-%' RETURNING id`)
  console.log(`pre-clean: removed ${wipe.rowCount} prior soak orders`)

  // Mock Telegram env + fetch so the alert harness captures the payload
  process.env.TELEGRAM_BOT_TOKEN = 'stub-token'
  process.env.TELEGRAM_CHAT_ID = 'stub-chat-247'
  let captured: any = null
  const realFetch = global.fetch
  ;(global as any).fetch = async (url: string, init?: any) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      captured = { url, body: JSON.parse(init.body) }
      return new Response(JSON.stringify({ ok: true, result: { message_id: 999 } }), { status: 200 })
    }
    return realFetch(url, init)
  }

  const desk = await import('/sessions/trusting-hopeful-goodall/uyayak-main/src/lib/orderDesk')

  // Seed: 1 website-source order (alert WILL fire), 1 telegram-source (alert SKIPPED in real hook),
  // 1 fresh shipped, 1 STALE shipped (5 days ago)
  const oWebsite = (await payload.create({ collection: 'orders', data: { customerName: 'TEST D-247 — Website', customerPhone: '+905550030001', product: 285, size: '42', totalPrice: 1499, status: 'new', source: 'website' } })) as any
  const oFresh   = (await payload.create({ collection: 'orders', data: { customerName: 'TEST D-247 — FreshShip', customerPhone: '+905550030002', status: 'shipped', source: 'website', shippedAt: new Date().toISOString() } })) as any
  const oStale   = (await payload.create({ collection: 'orders', data: { customerName: 'TEST D-247 — Stale', customerPhone: '+905550030003', status: 'shipped', source: 'website', shippedAt: new Date().toISOString() } })) as any
  await c.query(`UPDATE orders SET shipped_at = NOW() - INTERVAL '5 days' WHERE id = $1`, [oStale.id])
  console.log(`seeded: website=${oWebsite.id} fresh=${oFresh.id} stale=${oStale.id}`)

  sep('1. sendNewOrderAlert(<website>) — captures the fetch payload')
  const evtBefore = (await c.query(`SELECT count(*)::int n FROM bot_events WHERE event_type='order.new_alert_sent'`)).rows[0].n
  await desk.sendNewOrderAlert(payload, oWebsite.id)
  console.log('captured.url:', captured?.url?.replace(/bot[^/]+/, 'bot<TOKEN>'))
  console.log('captured.body.chat_id:', captured?.body?.chat_id)
  console.log('captured.body.parse_mode:', captured?.body?.parse_mode)
  console.log('captured.body.text:'); console.log(captured?.body?.text)
  console.log('captured.body.reply_markup:')
  for (const row of captured?.body?.reply_markup?.inline_keyboard ?? []) {
    console.log('  ' + row.map((b: any) => `[${b.text} → ${b.callback_data}]`).join(' '))
  }
  const evtAfter = (await c.query(`SELECT count(*)::int n FROM bot_events WHERE event_type='order.new_alert_sent'`)).rows[0].n
  console.log(`audit events: before=${evtBefore} after=${evtAfter} delta=${evtAfter - evtBefore}`)
  if (evtAfter - evtBefore !== 1) console.error('!! AUDIT FAIL — order.new_alert_sent not written')

  sep('2. sendNewOrderAlert with no TELEGRAM env — should noop')
  delete process.env.TELEGRAM_BOT_TOKEN
  captured = null
  await desk.sendNewOrderAlert(payload, oWebsite.id)
  console.log('captured (should be null):', captured)
  process.env.TELEGRAM_BOT_TOKEN = 'stub-token'

  sep('3. sendNewOrderAlert for missing id — should noop')
  captured = null
  await desk.sendNewOrderAlert(payload, 999999)
  console.log('captured (should be null):', captured)

  sep('4. getStaleShippedOrders — should find 1 stale')
  const stale = await desk.getStaleShippedOrders(payload)
  console.log({ totalStale: stale.totalStale, staleDays: stale.staleDays, items: stale.items.map(o => ({ id: o.id, no: o.orderNumber, status: o.status, shippedAt: o.shippedAt })) })
  if (stale.totalStale !== 1) console.error(`!! STALE COUNT FAIL — expected 1, got ${stale.totalStale}`)

  sep('5. formatOrderRemindersHeader (populated)')
  console.log(desk.formatOrderRemindersHeader(stale))

  sep('6. delivered/cancelled excluded — flip stale → delivered, re-check')
  await c.query(`UPDATE orders SET status='delivered' WHERE id=$1`, [oStale.id])
  const stale2 = await desk.getStaleShippedOrders(payload)
  console.log(`after delivered: totalStale=${stale2.totalStale}`)
  if (stale2.totalStale !== 0) console.error('!! EXCLUSION FAIL — delivered leaked into reminders')

  sep('7. formatOrderRemindersHeader (empty)')
  console.log(desk.formatOrderRemindersHeader(stale2))

  sep('8. getDailyOrderSummary + formatter')
  const sum = await desk.getDailyOrderSummary(payload)
  console.log(sum)
  console.log(desk.formatDailyOrderSummary(sum))

  // Cleanup
  sep('9. cleanup — delete soak orders + mark audit ignored')
  const eu = await c.query(`UPDATE bot_events SET status='ignored', notes = COALESCE(notes,'') || ' [d247-soak]' WHERE event_type='order.new_alert_sent' AND payload->>'chatId' = 'stub-chat-247'`)
  console.log(`audit events marked ignored: ${eu.rowCount}`)
  const wipeAfter = await c.query(`DELETE FROM orders WHERE order_number LIKE 'ORD-D247-%' RETURNING id`)
  console.log(`orders deleted: ${wipeAfter.rowCount}`)

  await c.end()
  console.log('\n*** D-247 soak complete ***')
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
