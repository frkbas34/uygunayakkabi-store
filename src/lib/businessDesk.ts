/**
 * businessDesk.ts — D-248 Business Snapshot / KPI Desk v1
 *
 * Pure composition layer. Every metric comes from an existing helper:
 *   - leads:        getDailyLeadSummary  (D-243)
 *   - sales:        getSalesToday        (D-244)
 *   - orders:       getDailyOrderSummary (D-247)
 *   - stock:        getInboxStock        (D-236)
 *
 * No new queries, no parallel rules, no schema change. The snapshot
 * just runs all four helpers in parallel and renders the composed
 * counts in one concise grouped block.
 *
 * READ-ONLY by construction — every helper called here is already
 * read-only.
 */

export interface BusinessSnapshot {
  // --- demand (today)
  leadsNewToday: number
  leadsContactedToday: number
  leadsWonToday: number
  leadsLostToday: number
  leadsSpamToday: number
  // --- pipeline now
  leadsTotalOpen: number
  leadsTotalStale: number
  leadStaleDays: number
  // --- sales (today)
  ordersCreatedToday: number
  ordersFromLeadsToday: number
  revenueToday: number
  // --- operations now
  ordersTotalOpen: number
  ordersShippedToday: number
  ordersDeliveredToday: number
  ordersCancelledToday: number
  ordersStaleShipped: number
  orderStaleDays: number
  // --- inventory urgency
  stockSoldout: number
  stockLowStock: number
}

export async function getBusinessSnapshot(payload: any): Promise<BusinessSnapshot> {
  const { getDailyLeadSummary, getSalesToday } = await import('./leadDesk')
  const { getDailyOrderSummary } = await import('./orderDesk')
  const { getInboxStock } = await import('./operatorInbox')

  const [leads, sales, orders, stock] = await Promise.all([
    getDailyLeadSummary(payload),
    getSalesToday(payload),
    getDailyOrderSummary(payload),
    getInboxStock(payload),
  ])

  return {
    leadsNewToday: leads.newToday,
    leadsContactedToday: leads.contactedToday,
    leadsWonToday: leads.wonToday,
    leadsLostToday: leads.lostToday,
    leadsSpamToday: leads.spamToday,
    leadsTotalOpen: leads.totalOpen,
    leadsTotalStale: leads.totalStale,
    leadStaleDays: leads.staleDays,
    ordersCreatedToday: sales.count,
    ordersFromLeadsToday: sales.countFromLeads,
    revenueToday: sales.totalRevenue,
    ordersTotalOpen: orders.totalOpen,
    ordersShippedToday: orders.shippedToday,
    ordersDeliveredToday: orders.deliveredToday,
    ordersCancelledToday: orders.cancelledToday,
    ordersStaleShipped: orders.totalStale,
    orderStaleDays: orders.staleDays,
    stockSoldout: stock.soldout.totalDocs,
    stockLowStock: stock.lowStock.totalDocs,
  }
}

/**
 * Render a concise grouped business snapshot. Keep it operator-grade
 * and short — counts only, no item lists. Empty-state shortcut when
 * everything is zero.
 *
 * Sections:
 *   📥 Talep (today)
 *   💰 Satış (today)
 *   📦 Operasyon
 *   ⚠️ Aciliyet  (only renders when there's actual urgency)
 */
export function formatBusinessSnapshot(s: BusinessSnapshot): string {
  // Quick "everything zero" check — operator's calm-day shortcut
  const totalSignals =
    s.leadsNewToday + s.leadsContactedToday + s.leadsWonToday + s.leadsLostToday + s.leadsSpamToday +
    s.leadsTotalOpen + s.leadsTotalStale +
    s.ordersCreatedToday + s.revenueToday +
    s.ordersTotalOpen + s.ordersShippedToday + s.ordersDeliveredToday + s.ordersCancelledToday + s.ordersStaleShipped +
    s.stockSoldout + s.stockLowStock
  if (totalSignals === 0) {
    return (
      `📊 <b>İş Özeti</b> (UTC günü)\n\n` +
      `✅ Bugün hiçbir hareket yok ve bekleyen aciliyet yok.\n\n` +
      `<i>/leads · /orders · /inbox</i>`
    )
  }

  const urgencyBits: string[] = []
  if (s.leadsTotalStale > 0) urgencyBits.push(`📞 bayat lead (${s.leadStaleDays}+gün): <b>${s.leadsTotalStale}</b>`)
  if (s.ordersStaleShipped > 0) urgencyBits.push(`📦 geç kargo (${s.orderStaleDays}+gün): <b>${s.ordersStaleShipped}</b>`)
  if (s.stockSoldout > 0) urgencyBits.push(`🔴 tükenmiş ürün: <b>${s.stockSoldout}</b>`)
  if (s.stockLowStock > 0) urgencyBits.push(`⚠️ az stok: <b>${s.stockLowStock}</b>`)

  const lines: string[] = [
    `📊 <b>İş Özeti</b> (UTC günü)`,
    ``,
    `<b>📥 Talep (bugün)</b>`,
    `  • Yeni lead: ${s.leadsNewToday}`,
    `  • İletişim kuruldu: ${s.leadsContactedToday}`,
    `  • Kazanıldı: ${s.leadsWonToday}`,
    `  • Kaybedildi: ${s.leadsLostToday}` + (s.leadsSpamToday > 0 ? ` · 🚮 Spam: ${s.leadsSpamToday}` : ''),
    `  • Açık lead toplam: ${s.leadsTotalOpen}`,
    ``,
    `<b>💰 Satış (bugün)</b>`,
    `  • Sipariş: ${s.ordersCreatedToday}` +
      (s.ordersFromLeadsToday > 0 ? ` (${s.ordersFromLeadsToday} lead'den)` : ''),
    s.revenueToday > 0 ? `  • Ciro (kayıtlı): <b>${s.revenueToday}</b> ₺` : `  • Ciro (kayıtlı): —`,
    ``,
    `<b>📦 Operasyon</b>`,
    `  • Açık sipariş: ${s.ordersTotalOpen}`,
    `  • Kargolanan (bugün): ${s.ordersShippedToday}`,
    `  • Teslim edilen (bugün): ${s.ordersDeliveredToday}` +
      (s.ordersCancelledToday > 0 ? ` · ❌ İptal: ${s.ordersCancelledToday}` : ''),
  ]

  if (urgencyBits.length > 0) {
    lines.push(``, `<b>⚠️ Aciliyet</b>`)
    for (const bit of urgencyBits) lines.push(`  • ${bit}`)
  }

  lines.push(
    ``,
    `<i>/leads · /orders · /inbox · /leadreminders · /orderreminders</i>`,
  )
  return lines.join('\n')
}
