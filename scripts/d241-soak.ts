/**
 * D-241 soak harness — drives the same applyLeadStatus / getOpenLeads /
 * getTodayLeads / getLeadById helpers the Telegram handlers use, but bound
 * to the real Payload instance (and therefore real Neon).
 *
 * This proves the data-layer half of the soak. The Telegram-UI half
 * (chat-driven /leads /lead /contacted etc.) still lives with the operator.
 *
 * Run:  npx tsx scripts/d241-soak.ts
 */
import { getPayload } from '../src/lib/payload'
import {
  getOpenLeads,
  getTodayLeads,
  getLeadById,
  applyLeadStatus,
  formatOpenLeadsList,
  formatLeadsToday,
  formatLeadCard,
} from '../src/lib/leadDesk'

const sep = (s: string) => console.log('\n=== ' + s + ' ===')

async function main() {
  const payload = await getPayload()

  // ── 1. /leads — open queue
  sep('1. getOpenLeads (proxy for /leads)')
  const open = await getOpenLeads(payload)
  console.log(formatOpenLeadsList(open))
  console.log('--- structured: total open=' + open.totalOpen, 'counts=', JSON.stringify(open.counts))

  // ── 2. /leads today — snapshot
  sep('2. getTodayLeads (proxy for /leads today)')
  const today = await getTodayLeads(payload)
  console.log(formatLeadsToday(today))

  // ── 3. /lead 1 — detail card
  sep('3. getLeadById(1) (proxy for /lead 1)')
  const lead1 = await getLeadById(payload, 1)
  if (!lead1) {
    console.error('FATAL: lead 1 not found')
    process.exit(1)
  }
  console.log(formatLeadCard(lead1))

  // ── 4. /contacted 1 — first press
  sep('4. applyLeadStatus(1, contacted) — first press (proxy for /contacted 1)')
  const r1 = await applyLeadStatus(payload, 1, 'contacted', 'telegram_command')
  console.log('ok=' + r1.ok, 'idempotent=' + r1.idempotent, 'from=' + r1.fromStatus, 'to=' + r1.toStatus)
  console.log('message:', r1.message)

  // ── 5. /contacted 1 — second press (idempotency proof)
  sep('5. applyLeadStatus(1, contacted) — second press (idempotency)')
  const r1b = await applyLeadStatus(payload, 1, 'contacted', 'telegram_command')
  console.log('ok=' + r1b.ok, 'idempotent=' + r1b.idempotent)
  console.log('message:', r1b.message)
  if (!r1b.idempotent) console.error('!! IDEMPOTENCY FAIL — second press should be no-op')

  // ── 6. /followup 2 — different lead
  sep('6. applyLeadStatus(2, followup) (proxy for /followup 2)')
  const r2 = await applyLeadStatus(payload, 2, 'followup', 'telegram_command')
  console.log('ok=' + r2.ok, 'idempotent=' + r2.idempotent, 'from=' + r2.fromStatus, 'to=' + r2.toStatus)
  console.log('message:', r2.message)

  // ── 7. /won 1 — closes lead 1
  sep('7. applyLeadStatus(1, won) (proxy for /won 1)')
  const rWon = await applyLeadStatus(payload, 1, 'won', 'telegram_command')
  console.log('ok=' + rWon.ok, 'from=' + rWon.fromStatus, 'to=' + rWon.toStatus)
  console.log('message:', rWon.message)

  // ── 8. /lost 2 — closes lead 2
  sep('8. applyLeadStatus(2, lost) (proxy for /lost 2)')
  const rLost = await applyLeadStatus(payload, 2, 'lost', 'telegram_command')
  console.log('ok=' + rLost.ok, 'from=' + rLost.fromStatus, 'to=' + rLost.toStatus)
  console.log('message:', rLost.message)

  // ── 9. /spam 3 — quarantines lead 3 without delete
  sep('9. applyLeadStatus(3, spam) (proxy for /spam 3)')
  const rSpam = await applyLeadStatus(payload, 3, 'spam', 'telegram_command')
  console.log('ok=' + rSpam.ok, 'from=' + rSpam.fromStatus, 'to=' + rSpam.toStatus)
  console.log('message:', rSpam.message)

  // ── 10. open queue again — should be empty for the test leads
  sep('10. getOpenLeads after closures — should be 0')
  const open2 = await getOpenLeads(payload)
  console.log('total open after closures=' + open2.totalOpen, 'counts=', JSON.stringify(open2.counts))

  // ── 11. raw row check — verify timestamps + status persisted
  sep('11. raw DB check — final state of test leads')
  const pool = (payload as any).db.pool
  const r = await pool.query(
    `SELECT id, status, last_contacted_at, handled_at, source FROM customer_inquiries WHERE id IN (1,2,3) ORDER BY id`,
  )
  for (const row of r.rows) {
    console.log(
      ` id=${row.id} status=${row.status}` +
        ` last_contacted_at=${row.last_contacted_at?.toISOString?.() ?? '-'}` +
        ` handled_at=${row.handled_at?.toISOString?.() ?? '-'}` +
        ` source=${row.source}`,
    )
  }

  // ── 12. bot-events audit trail check
  sep('12. bot-events audit — lead.status_changed entries written')
  const ev = await pool.query(
    `SELECT id, event_type, source_bot, status, payload FROM bot_events
     WHERE event_type='lead.status_changed' ORDER BY id DESC LIMIT 8`,
  )
  console.log('entries=' + ev.rows.length)
  for (const row of ev.rows) {
    const p = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
    console.log(` botEvtId=${row.id} src=${row.source_bot} payload.leadId=${p?.leadId} ${p?.fromStatus} → ${p?.toStatus} via ${p?.source}`)
  }

  console.log('\n*** D-241 soak complete ***')
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
