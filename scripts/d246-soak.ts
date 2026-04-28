/**
 * D-246 soak — exercise the inbox+orders integration.
 *
 *  - getInboxOrders against live Neon (uses same SQL stub as D-245 soak)
 *  - formatInboxOrdersHeader populated + empty
 *  - formatInboxOverview rendered against synthetic input for 3 cases
 *  - Per-order card render verified for top-N display
 *  - Aging signal verification (backdate one shipped order >3 days)
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
    async create(args: any) {
      if (args.collection === 'orders') {
        const d = args.data as any
        const orderNumber = d.orderNumber ?? `ORD-D246-${Date.now().toString().slice(-6)}`
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
      return { id: -1 }
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

  const { getInboxOrders, formatInboxOrdersHeader, formatInboxOverview } =
    await import('/sessions/trusting-hopeful-goodall/uyayak-main/src/lib/operatorInbox')

  // Pre-clean any leftover D-246 soak rows
  const wipe = await c.query(`DELETE FROM orders WHERE order_number LIKE 'ORD-D246-%' RETURNING id`)
  console.log(`pre-clean: removed ${wipe.rowCount} prior soak orders`)

  // Seed: 1 new + 1 confirmed + 1 fresh shipped + 1 STALE shipped (5 days ago)
  await payload.create({ collection: 'orders', data: { customerName: 'TEST D-246 — N', customerPhone: '+905550020001', status: 'new', source: 'telegram' } })
  await payload.create({ collection: 'orders', data: { customerName: 'TEST D-246 — C', customerPhone: '+905550020002', status: 'confirmed', source: 'telegram' } })
  await payload.create({ collection: 'orders', data: { customerName: 'TEST D-246 — S', customerPhone: '+905550020003', status: 'shipped', source: 'telegram', shippedAt: new Date().toISOString() } })
  // Backdate the stale shipped order's shippedAt to 5 days ago via raw SQL
  const staleOrder = (await payload.create({ collection: 'orders', data: { customerName: 'TEST D-246 — STALE', customerPhone: '+905550020004', status: 'shipped', source: 'telegram', shippedAt: new Date().toISOString() } })) as any
  await c.query(`UPDATE orders SET shipped_at = NOW() - INTERVAL '5 days' WHERE id = $1`, [staleOrder.id])

  sep('1. getInboxOrders — counts')
  const d = await getInboxOrders(payload)
  console.log({
    totalOpen: d.totalOpen, newCount: d.newCount, confirmedCount: d.confirmedCount,
    shippedCount: d.shippedCount, staleShippedCount: d.staleShippedCount, staleDays: d.staleDays,
    topItemsLen: d.topItems.length,
  })
  // Quick sanity: 4 open total, 1 stale
  if (d.totalOpen !== 4) console.error(`!! EXPECTED 4 open, got ${d.totalOpen}`)
  if (d.staleShippedCount !== 1) console.error(`!! EXPECTED 1 stale shipped, got ${d.staleShippedCount}`)

  sep('2. formatInboxOrdersHeader (populated)')
  console.log(formatInboxOrdersHeader(d))

  sep('3. /inbox orders — top items rendered as the bot would (formatOrderLine + buttons)')
  const { formatOrderLine, orderButtonsKeyboard } = await import('/sessions/trusting-hopeful-goodall/uyayak-main/src/lib/orderDesk')
  for (const o of d.topItems.slice(0, 5)) {
    console.log('---')
    console.log(formatOrderLine(o))
    const kb = orderButtonsKeyboard(o)
    console.log('  kb rows:', kb.length, '· first action:', kb[0]?.[0]?.callback_data ?? '(none)')
  }

  sep('4. empty-state — close all soak orders, re-query')
  await c.query(`UPDATE orders SET status='delivered' WHERE order_number LIKE 'ORD-D246-%'`)
  const dEmpty = await getInboxOrders(payload)
  console.log({ totalOpen: dEmpty.totalOpen })
  console.log(formatInboxOrdersHeader(dEmpty))

  sep('5. formatInboxOverview — synthetic with leads + orders + stale shipping')
  console.log(formatInboxOverview({
    pending: { visualPreview: 1, wizardIncomplete: 0 },
    publish: { publishReady: 2, contentReadyNotActive: 0 },
    stock: { soldout: 0, lowStock: 0 },
    failed: { contentFailed: 0, auditFailed: 0, shopierError: 0, eventsLast24h: 0 },
    leads: { totalOpen: 3, newCount: 2, followUpCount: 1, contactedCount: 0, staleCount: 0, staleDays: 3 },
    orders: { totalOpen: 4, newCount: 1, confirmedCount: 1, shippedCount: 2, staleShippedCount: 1, staleDays: 3 },
  }))

  sep('6. formatInboxOverview — orders but no stale (stale row hidden)')
  console.log(formatInboxOverview({
    pending: { visualPreview: 0, wizardIncomplete: 0 },
    publish: { publishReady: 0, contentReadyNotActive: 0 },
    stock: { soldout: 0, lowStock: 0 },
    failed: { contentFailed: 0, auditFailed: 0, shopierError: 0, eventsLast24h: 0 },
    leads: { totalOpen: 0, newCount: 0, followUpCount: 0, contactedCount: 0, staleCount: 0, staleDays: 3 },
    orders: { totalOpen: 1, newCount: 1, confirmedCount: 0, shippedCount: 0, staleShippedCount: 0, staleDays: 3 },
  }))

  sep('7. formatInboxOverview — fully empty (Temiz short-circuit)')
  console.log(formatInboxOverview({
    pending: { visualPreview: 0, wizardIncomplete: 0 },
    publish: { publishReady: 0, contentReadyNotActive: 0 },
    stock: { soldout: 0, lowStock: 0 },
    failed: { contentFailed: 0, auditFailed: 0, shopierError: 0, eventsLast24h: 0 },
    leads: { totalOpen: 0, newCount: 0, followUpCount: 0, contactedCount: 0, staleCount: 0, staleDays: 3 },
    orders: { totalOpen: 0, newCount: 0, confirmedCount: 0, shippedCount: 0, staleShippedCount: 0, staleDays: 3 },
  }))

  // Cleanup
  sep('8. cleanup — delete soak orders')
  const wipeAfter = await c.query(`DELETE FROM orders WHERE order_number LIKE 'ORD-D246-%' RETURNING id`)
  console.log(`orders deleted: ${wipeAfter.rowCount}`)

  await c.end()
  console.log('\n*** D-246 soak complete ***')
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
