/**
 * D-243 soak — exercise alert + reminder + summary against live Neon.
 *
 *  - sendNewLeadAlert: fetch is mocked so the test captures the exact
 *    Telegram payload the storefront POST would send (no real message
 *    delivery from the soak harness).
 *  - getStaleLeads / formatLeadRemindersHeader: against real DB rows.
 *  - getDailyLeadSummary / formatDailyLeadSummary: against real DB rows.
 *  - Bot-event emission for lead.new_alert_sent verified by SQL count.
 */
import { readFileSync } from 'fs'
import { Client } from 'pg'

const u = readFileSync('.env', 'utf8').match(/^DATABASE_URI=(.+)$/m)?.[1]
if (!u) throw new Error('DATABASE_URI not in .env')

// --- minimal payload stub backing onto pg (camelCased rows) ---
function camelizeRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v
  }
  return out
}

function makePayloadStub(c: Client) {
  let nextEvtId = 0
  return {
    db: { pool: c },
    async find(args: any) {
      const { collection, where, sort, limit } = args
      const tableMap: Record<string, string> = {
        'customer-inquiries': 'customer_inquiries',
        'products': 'products',
        'bot-events': 'bot_events',
      }
      const table = tableMap[collection] ?? collection.replace(/-/g, '_')
      const { sql, vals } = compileWhere(table, where)
      const orderBy = sort ? compileSort(sort) : 'id ASC'
      const lim = limit ?? 10
      const r = await c.query(`SELECT * FROM ${table} WHERE ${sql} ORDER BY ${orderBy} LIMIT ${lim}`, vals)
      const tr = await c.query(`SELECT count(*)::int n FROM ${table} WHERE ${sql}`, vals)
      return { docs: r.rows.map(camelizeRow), totalDocs: tr.rows[0].n }
    },
    async findByID(args: any) {
      const tableMap: Record<string, string> = {
        'customer-inquiries': 'customer_inquiries',
        'products': 'products',
      }
      const table = tableMap[args.collection] ?? args.collection.replace(/-/g, '_')
      const r = await c.query(`SELECT * FROM ${table} WHERE id=$1`, [args.id])
      if (!r.rows[0]) return null
      const row = camelizeRow(r.rows[0])
      // stub the relationship — turn product_id into a {id,...} object if depth>=1
      if ((args.depth ?? 0) >= 1 && row.productId) {
        const p = await c.query(`SELECT id, stock_number, title FROM products WHERE id=$1`, [row.productId])
        if (p.rows[0]) row.product = { id: p.rows[0].id, stockNumber: p.rows[0].stock_number, title: p.rows[0].title }
      }
      return row
    },
    async create(args: any) {
      // We only need bot-events.create to be functional for the audit test
      if (args.collection === 'bot-events') {
        nextEvtId += 1
        await c.query(
          `INSERT INTO bot_events (event_type, source_bot, status, payload, notes, processed_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4::jsonb, $5, NOW(), NOW(), NOW())`,
          [args.data.eventType, args.data.sourceBot, args.data.status, JSON.stringify(args.data.payload), args.data.notes],
        )
        return { id: nextEvtId }
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

  // Stub Telegram env + fetch so the alert harness captures the payload
  process.env.TELEGRAM_BOT_TOKEN = 'stub-token'
  process.env.TELEGRAM_CHAT_ID = 'stub-chat-123'
  let captured: any = null
  const realFetch = global.fetch
  ;(global as any).fetch = async (url: string, init?: any) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      captured = { url, body: JSON.parse(init.body) }
      return new Response(JSON.stringify({ ok: true, result: { message_id: 999 } }), { status: 200 })
    }
    return realFetch(url, init)
  }

  const { sendNewLeadAlert, getStaleLeads, formatLeadRemindersHeader, getDailyLeadSummary, formatDailyLeadSummary } =
    await import('/sessions/trusting-hopeful-goodall/uyayak-main/src/lib/leadDesk')

  // Reset test leads to known state — id=1 needs product_id=285 link for richness
  await c.query(`UPDATE customer_inquiries SET status='new', last_contacted_at=NULL, handled_at=NULL WHERE id IN (1,2,3)`)

  sep('1. sendNewLeadAlert(1) — captures the fetch payload Telegram would receive')
  const evtBefore = (await c.query(`SELECT count(*)::int n FROM bot_events WHERE event_type='lead.new_alert_sent'`)).rows[0].n
  await sendNewLeadAlert(payload, 1)
  console.log('captured.url:', captured?.url?.replace(/bot[^/]+/, 'bot<TOKEN>'))
  console.log('captured.body.chat_id:', captured?.body?.chat_id)
  console.log('captured.body.parse_mode:', captured?.body?.parse_mode)
  console.log('captured.body.text:')
  console.log(captured?.body?.text)
  console.log('captured.body.reply_markup buttons:')
  for (const row of captured?.body?.reply_markup?.inline_keyboard ?? []) {
    console.log('  ' + row.map((b: any) => `[${b.text} → ${b.callback_data}]`).join(' '))
  }
  const evtAfter = (await c.query(`SELECT count(*)::int n FROM bot_events WHERE event_type='lead.new_alert_sent'`)).rows[0].n
  console.log(`audit events: before=${evtBefore} after=${evtAfter} delta=${evtAfter - evtBefore}`)
  if (evtAfter - evtBefore !== 1) console.error('!! AUDIT FAIL — lead.new_alert_sent not written')

  sep('2. sendNewLeadAlert with no TELEGRAM env — should noop')
  delete process.env.TELEGRAM_BOT_TOKEN
  captured = null
  await sendNewLeadAlert(payload, 1)
  console.log('captured (should be null):', captured)
  process.env.TELEGRAM_BOT_TOKEN = 'stub-token'

  sep('3. sendNewLeadAlert for a missing lead id — should noop, no throw')
  captured = null
  await sendNewLeadAlert(payload, 999999)
  console.log('captured for missing lead:', captured)

  sep('4. getStaleLeads — currently no stale (all just reset)')
  let stale = await getStaleLeads(payload)
  console.log({ totalStale: stale.totalStale, neverTouchedCount: stale.neverTouchedCount, needsFollowupCount: stale.needsFollowupCount, staleDays: stale.staleDays })
  console.log(formatLeadRemindersHeader(stale))

  sep('5. backdate lead 1 to created 5 days ago + lead 2 to lastContacted 4 days ago, re-check')
  await c.query(`UPDATE customer_inquiries SET created_at = NOW() - INTERVAL '5 days' WHERE id=1`)
  await c.query(`UPDATE customer_inquiries SET status='contacted', last_contacted_at = NOW() - INTERVAL '4 days' WHERE id=2`)
  stale = await getStaleLeads(payload)
  console.log({ totalStale: stale.totalStale, neverTouchedCount: stale.neverTouchedCount, needsFollowupCount: stale.needsFollowupCount })
  console.log('--- top items (oldest first) ---')
  for (const l of stale.items) console.log(`  #${l.id} ${l.status} created=${l.createdAt?.toString?.().slice(0,16)} lastContact=${l.lastContactedAt?.toString?.().slice(0,16) ?? '-'}`)
  if (stale.totalStale < 2) console.error('!! STALE FAIL — backdated leads not surfaced')
  if (stale.neverTouchedCount < 1) console.error('!! NEVER-TOUCHED FAIL — backdated new lead missed')

  sep('6. formatLeadRemindersHeader (non-empty)')
  console.log(formatLeadRemindersHeader(stale))

  sep('7. closed lead is excluded from /leadreminders')
  await c.query(`UPDATE customer_inquiries SET status='closed_won', handled_at=NOW() WHERE id=1`)
  const stale2 = await getStaleLeads(payload)
  console.log(`after closing lead 1, totalStale=${stale2.totalStale} (expect 1, only lead 2 remaining)`)
  if (stale2.items.some(l => l.id === 1)) console.error('!! EXCLUSION FAIL — closed_won leaked into reminders')

  sep('8. getDailyLeadSummary + formatter')
  const sum = await getDailyLeadSummary(payload)
  console.log(sum)
  console.log(formatDailyLeadSummary(sum))

  // Restore everything to test-baseline state
  sep('9. restore — reset test leads to status=new, fresh timestamps')
  await c.query(`UPDATE customer_inquiries SET status='new', last_contacted_at=NULL, handled_at=NULL, created_at=NOW(), updated_at=NOW() WHERE id IN (1,2,3)`)
  // mark soak-emitted bot events as ignored (audit-trail preservation)
  const upd = await c.query(`UPDATE bot_events SET status='ignored', notes = notes || ' [d243-soak]' WHERE event_type='lead.new_alert_sent' AND payload->>'chatId' = 'stub-chat-123'`)
  console.log(`stubbed audit events marked ignored: ${upd.rowCount}`)

  await c.end()
  console.log('\n*** D-243 soak complete ***')
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
