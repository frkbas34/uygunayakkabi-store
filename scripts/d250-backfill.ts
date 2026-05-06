/**
 * D-250 Backfill — Source Attribution Repair
 *
 * Finds Orders that were created via /convert (relatedInquiry IS NOT NULL)
 * but still carry source='telegram' — the pre-D-250 hardcoded value that
 * recorded the operational channel instead of the demand origin.
 *
 * For each such order, reads the linked lead's source and writes the
 * correct mapped value. Idempotent — safe to re-run.
 *
 * Run: npx tsx scripts/d250-backfill.ts
 *
 * Dry-run (no writes): DRY_RUN=1 npx tsx scripts/d250-backfill.ts
 */

import { getPayload } from '../src/lib/payload'

const DRY_RUN = process.env.DRY_RUN === '1'

/** Valid orders.source enum values (mirrors Orders.ts + leadDesk.ts D-250). */
const ORDER_SOURCE_VALUES = ['website', 'telegram', 'phone', 'instagram', 'shopier'] as const
type OrderSource = (typeof ORDER_SOURCE_VALUES)[number]

function mapLeadSourceToOrderSource(leadSource: string | null | undefined): OrderSource {
  const s = (leadSource ?? '').toLowerCase().trim()
  if ((ORDER_SOURCE_VALUES as readonly string[]).includes(s)) return s as OrderSource
  return 'website'
}

async function run() {
  console.log(`\n🔍 D-250 Backfill — Source Attribution Repair`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (will update DB)'}`)
  console.log(`─────────────────────────────────────────────\n`)

  const payload = await getPayload()

  // 1) Find all lead-attributed orders with source='telegram' (pre-D-250 rows)
  const res = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { source: { equals: 'telegram' } },
        // relatedInquiry set = this is a lead-converted order
        { relatedInquiry: { exists: true } },
      ],
    },
    limit: 500,
    depth: 1, // populate relatedInquiry so we can read lead.source
  })

  const candidates = (res.docs as any[]).filter((o) => {
    // relatedInquiry must actually be populated (not just a stale FK to nothing)
    const rel = o.relatedInquiry
    return rel !== null && rel !== undefined
  })

  if (candidates.length === 0) {
    console.log('✅ No pre-D-250 misattributed orders found. Nothing to do.')
    process.exit(0)
  }

  console.log(`Found ${candidates.length} order(s) with source='telegram' + relatedInquiry set:\n`)

  let fixed = 0
  let skipped = 0
  let errors = 0

  for (const order of candidates) {
    const orderId = order.id as number
    const orderNumber = String(order.orderNumber ?? `ORD-${orderId}`)

    // Lead doc — already depth:1 populated
    const lead = order.relatedInquiry
    const leadId = typeof lead === 'object' ? lead?.id : lead
    const leadSource: string | null = typeof lead === 'object' ? (lead?.source ?? null) : null

    const newSource = mapLeadSourceToOrderSource(leadSource)
    const unchanged = newSource === 'telegram'

    console.log(
      `  ${unchanged ? '⏭' : '→'} Order ${orderNumber} (ID:${orderId}) ` +
      `· Lead #${leadId} · lead.source=${leadSource ?? 'null'} ` +
      `· order.source: 'telegram' → '${newSource}'` +
      (unchanged ? ' (no change — lead source is also telegram)' : '')
    )

    if (unchanged) {
      // Lead itself came from telegram → order.source='telegram' is now correct
      skipped += 1
      continue
    }

    if (!DRY_RUN) {
      try {
        await payload.update({
          collection: 'orders',
          id: orderId,
          data: { source: newSource },
        })
        fixed += 1
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`    ❌ Update failed for order ${orderId}: ${msg}`)
        errors += 1
      }
    } else {
      fixed += 1 // count as "would fix" in dry-run
    }
  }

  console.log(`\n─────────────────────────────────────────────`)
  console.log(`${DRY_RUN ? '(DRY RUN) ' : ''}Fixed: ${fixed}  ·  Unchanged (telegram lead): ${skipped}  ·  Errors: ${errors}`)

  if (errors > 0) {
    console.error('\n⚠️  Some updates failed — check logs above.')
    process.exit(1)
  }

  if (DRY_RUN && fixed > 0) {
    console.log('\nRe-run without DRY_RUN=1 to apply changes.')
  }

  if (!DRY_RUN && fixed > 0) {
    console.log('\n✅ Backfill complete. /funnel output is now more truthful for these orders.')
    console.log('   Note: funnelDesk.ts still uses lead.source for window-correct attribution.')
    console.log('   The order.source fix improves standalone order record truthfulness (admin view).')
  }

  process.exit(0)
}

run().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
