/**
 * D-241 SQL-layer soak — mirrors the exact write path of
 * applyLeadStatus (src/lib/leadDesk.ts) against the real Neon DB,
 * proving the schema + enum + audit-trail loop is healthy.
 *
 * The Telegram-UI half (slash command → bot → applyLeadStatus) is the
 * operator's piece. The data side is what needs production proof, and
 * that's what this harness exercises.
 */
import { readFileSync } from 'fs'
import { Client } from 'pg'

const u = readFileSync('.env', 'utf8').match(/^DATABASE_URI=(.+)$/m)?.[1]
if (!u) throw new Error('DATABASE_URI not in .env')

const ACTION_TO_STATUS = {
  contacted: 'contacted',
  followup: 'follow_up',
  won: 'closed_won',
  lost: 'closed_lost',
  spam: 'spam',
} as const
type Action = keyof typeof ACTION_TO_STATUS

const CLOSED = new Set(['closed_won', 'closed_lost', 'spam', 'completed'])

interface SoakResult {
  ok: boolean
  idempotent: boolean
  fromStatus: string
  toStatus: string
  message: string
}

const sep = (s: string) => console.log('\n=== ' + s + ' ===')

async function applyLeadStatus(
  c: Client,
  leadId: number,
  action: Action,
): Promise<SoakResult> {
  const lead = (await c.query('SELECT id, status FROM customer_inquiries WHERE id=$1', [leadId])).rows[0]
  if (!lead) {
    return { ok: false, idempotent: false, fromStatus: '?', toStatus: '?', message: `not found ${leadId}` }
  }
  const fromStatus = lead.status as string
  const toStatus = ACTION_TO_STATUS[action]
  // Same idempotency rule as applyLeadStatus
  const isAlready = fromStatus === toStatus || (toStatus === 'closed_won' && fromStatus === 'completed')
  if (isAlready) {
    return { ok: true, idempotent: true, fromStatus, toStatus, message: `🟰 zaten ${toStatus}` }
  }
  // Build the same patch
  const patches: string[] = ['status=$2', 'updated_at=NOW()']
  const vals: any[] = [leadId, toStatus]
  let nextI = 3
  if (toStatus === 'contacted' || toStatus === 'follow_up') {
    patches.push(`last_contacted_at=NOW()`)
  }
  if (toStatus === 'closed_won' || toStatus === 'closed_lost' || toStatus === 'spam') {
    patches.push(`handled_at=NOW()`)
  }
  if (CLOSED.has(fromStatus) && !CLOSED.has(toStatus)) {
    patches.push(`handled_at=NULL`)
  }
  await c.query(`UPDATE customer_inquiries SET ${patches.join(', ')} WHERE id=$1`, vals)

  // Audit event (mirrors the JSON payload applyLeadStatus emits)
  const evtPayload = JSON.stringify({
    leadId,
    fromStatus,
    toStatus,
    action,
    source: 'soak_script',
    changedAt: new Date().toISOString(),
  })
  await c.query(
    `INSERT INTO bot_events (event_type, source_bot, status, payload, notes, processed_at, created_at, updated_at)
     VALUES ('lead.status_changed', 'system', 'processed', $1::jsonb,
             $2, NOW(), NOW(), NOW())`,
    [evtPayload, `Lead ${leadId}: ${fromStatus} → ${toStatus} via soak_script.`],
  )
  return { ok: true, idempotent: false, fromStatus, toStatus, message: `${fromStatus} → ${toStatus}` }
}

async function getOpenLeads(c: Client) {
  const r = await c.query(
    `SELECT id, name, phone, status, last_contacted_at, created_at
     FROM customer_inquiries
     WHERE status IN ('new','contacted','follow_up')
     ORDER BY status='new' DESC, last_contacted_at NULLS FIRST, created_at DESC
     LIMIT 50`,
  )
  return r.rows
}

async function getTodayCounts(c: Client) {
  const sinceISO = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z').toISOString()
  const get = async (status: string) => (await c.query(
    `SELECT count(*)::int n FROM customer_inquiries WHERE status=$1 AND updated_at > $2`,
    [status, sinceISO],
  )).rows[0].n as number
  const newToday = (await c.query(`SELECT count(*)::int n FROM customer_inquiries WHERE created_at > $1`, [sinceISO])).rows[0].n as number
  const [contacted, won, lost, spam] = await Promise.all([
    get('contacted'), get('closed_won'), get('closed_lost'), get('spam'),
  ])
  return { newToday, contacted, won, lost, spam }
}

async function main() {
  const c = new Client({ connectionString: u, ssl: { rejectUnauthorized: false } })
  await c.connect()

  sep('1. /leads — open queue')
  const open1 = await getOpenLeads(c)
  console.log(`open=${open1.length}`)
  for (const l of open1) console.log(`  id=${l.id} ${l.status} ${l.name} (${l.phone})`)

  sep('2. /leads today — counts')
  const today1 = await getTodayCounts(c)
  console.log(today1)

  sep('3. /lead 1 — read snapshot')
  const card1 = (await c.query('SELECT * FROM customer_inquiries WHERE id=1')).rows[0]
  console.log(`  id=${card1.id} status=${card1.status} name=${card1.name} phone=${card1.phone} prod=${card1.product_id} size=${card1.size}`)

  sep('4. /contacted 1 — first press')
  const r1 = await applyLeadStatus(c, 1, 'contacted')
  console.log('  →', r1)

  sep('5. /contacted 1 — second press (idempotency)')
  const r1b = await applyLeadStatus(c, 1, 'contacted')
  console.log('  →', r1b)
  if (!r1b.idempotent) { console.error('!! IDEMPOTENCY FAIL'); process.exit(1) }

  sep('6. /followup 2 — open lead transitioned')
  const r2 = await applyLeadStatus(c, 2, 'followup')
  console.log('  →', r2)

  sep('7. /won 1 — closes lead 1')
  const rWon = await applyLeadStatus(c, 1, 'won')
  console.log('  →', rWon)

  sep('8. /lost 2 — closes lead 2')
  const rLost = await applyLeadStatus(c, 2, 'lost')
  console.log('  →', rLost)

  sep('9. /spam 3 — quarantines lead 3 without delete')
  const rSpam = await applyLeadStatus(c, 3, 'spam')
  console.log('  →', rSpam)

  sep('10. /leads after closures — should drop test leads from open queue')
  const open2 = await getOpenLeads(c)
  console.log(`open=${open2.length}`)
  const testIds = new Set([1,2,3])
  const stillOpen = open2.filter(l => testIds.has(l.id))
  console.log(`  test leads still open: ${stillOpen.length}`)
  if (stillOpen.length > 0) console.error('!! CLOSURE FAIL — test leads still in open queue')

  sep('11. raw row state — final')
  const final = await c.query(
    `SELECT id, status, last_contacted_at, handled_at, source FROM customer_inquiries WHERE id IN (1,2,3) ORDER BY id`,
  )
  for (const row of final.rows) {
    console.log(
      `  id=${row.id} status=${row.status}` +
      ` last_contacted=${row.last_contacted_at?.toISOString?.() ?? '-'}` +
      ` handled=${row.handled_at?.toISOString?.() ?? '-'}` +
      ` source=${row.source}`,
    )
  }

  sep('12. bot-events audit trail')
  const ev = await c.query(
    `SELECT id, event_type, source_bot, payload FROM bot_events
     WHERE event_type='lead.status_changed' ORDER BY id DESC LIMIT 12`,
  )
  console.log(`audit entries=${ev.rows.length}`)
  for (const row of ev.rows) {
    const p = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
    console.log(`  evtId=${row.id} src=${row.source_bot} lead=${p?.leadId} ${p?.fromStatus} → ${p?.toStatus}`)
  }

  sep('13. reopen test — /contacted 3 after spam (should clear handled_at)')
  const rReopen = await applyLeadStatus(c, 3, 'contacted')
  console.log('  →', rReopen)
  const post = (await c.query('SELECT status, handled_at, last_contacted_at FROM customer_inquiries WHERE id=3')).rows[0]
  console.log(`  id=3 status=${post.status} handled_at=${post.handled_at ?? '(cleared)'} last_contacted_at=${post.last_contacted_at?.toISOString?.() ?? '-'}`)
  if (post.handled_at !== null) console.error('!! REOPEN FAIL — handled_at not cleared')

  sep('14. enum-not-extended detection — would block fake bogus status')
  // We can't actually test this on a value the enum knows, so test by trying
  // an unknown enum value the same way Postgres rejects it.
  try {
    await c.query("UPDATE customer_inquiries SET status='nonexistent_status' WHERE id=3")
    console.error('!! enum guard fail — invalid value accepted')
  } catch (e: any) {
    if (/invalid input value for enum/i.test(e.message)) {
      console.log(`  ✓ Postgres rejects unknown enum value with: "${e.message.split('\n')[0]}"`)
    } else throw e
  }

  await c.end()
  console.log('\n*** D-241 soak complete ***')
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
