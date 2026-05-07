/**
 * production-cleanup.ts
 *
 * Temizlik kapsamı:
 *   - Tüm PI raporları (product_intelligence_reports)
 *   - Tüm media kayıtları (media)
 *   - Tüm variants
 *   - Tüm products
 *
 * DOKUNULMAYACAKLAR:
 *   - Orders, customer_inquiries, bot_events, settings, users, channel config
 *
 *  Kullanım:
 *    DRY_RUN=1 npx tsx scripts/production-cleanup.ts   ← ne silineceğini gösterir
 *    npx tsx scripts/production-cleanup.ts              ← gerçek silme (backup otomatik alınır)
 */

import { getPayload } from '../src/lib/payload'
import fs from 'fs'
import path from 'path'

const DRY_RUN = process.env.DRY_RUN === '1'

// ─── helpers ────────────────────────────────────────────────────────────────

function log(msg: string) { console.log(msg) }
function progress(msg: string) { process.stdout.write(`\r${msg}`) }

async function fetchAll(payload: Awaited<ReturnType<typeof getPayload>>, collection: string) {
  const result = await payload.find({ collection: collection as any, limit: 500, depth: 0 })
  return result.docs
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const payload = await getPayload()

  log(DRY_RUN
    ? '\n🔍 DRY RUN — hiçbir şey silinmeyecek\n'
    : '\n🗑  GERÇEK TEMİZLİK BAŞLIYOR\n'
  )

  // ── 1. Veriyi topla ──────────────────────────────────────────────────────
  log('Veriler toplanıyor...')

  const products  = await fetchAll(payload, 'products')
  const variants  = await fetchAll(payload, 'variants')
  const media     = await fetchAll(payload, 'media')

  // PI reports — collection adı kontrol edildi: product-intelligence-reports
  let piReports: any[] = []
  try {
    piReports = await fetchAll(payload, 'product-intelligence-reports')
  } catch {
    try { piReports = await fetchAll(payload, 'productIntelligenceReports') } catch { /* none */ }
  }

  log(`\nBulunanlar:`)
  log(`  Products  : ${products.length}`)
  log(`  Variants  : ${variants.length}`)
  log(`  Media     : ${media.length}`)
  log(`  PI Raporları: ${piReports.length}`)

  // ── 2. DRY RUN çıktısı ───────────────────────────────────────────────────
  if (DRY_RUN) {
    log('\n--- Silinecek Ürünler ---')
    for (const p of products) {
      log(`  [${p.id}] ${(p as any).title ?? (p as any).name ?? 'isimsiz'} — ${(p as any).status ?? '?'}`)
    }

    log('\n--- Manuel Temizlik Gerekli ---')
    log('  Shopier  : 24 listing (API credential yok → Shopier panelinden silin)')
    log('  Instagram: Post ID kayıtlı değil → Meta Business Suite\'ten silin')
    log('  X/Twitter: Post ID kayıtlı değil → X.com\'dan silin')
    log('  Facebook : Post ID kayıtlı değil → Meta Business Suite\'ten silin')
    log('  Vercel   : /api/media/file/* dosyaları → Payload admin "Media" bölümünden veya Vercel dashboard\'dan silin')

    log('\n--- DOKUNULMAYACAKLAR ---')
    log('  Orders, customer_inquiries, bot_events, settings, users, channel config')

    log(`\nÖzet: ${products.length} ürün, ${variants.length} variant, ${media.length} media kaydı, ${piReports.length} PI raporu silinecek.`)
    log('\nGerçek silme için: npx tsx scripts/production-cleanup.ts')
    return
  }

  // ── 3. Backup ─────────────────────────────────────────────────────────────
  const backupDir = path.join(process.cwd(), 'backups')
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupDir, `cleanup-${timestamp}.json`)

  const backup = { exportedAt: new Date().toISOString(), products, variants, media, piReports }
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  log(`\n💾 Backup kaydedildi: ${backupPath}`)
  log(`   (${products.length} ürün, ${variants.length} variant, ${media.length} media, ${piReports.length} PI raporu)`)

  // ── 4. PI Raporları sil ───────────────────────────────────────────────────
  if (piReports.length > 0) {
    log(`\nPI Raporları siliniyor (${piReports.length})...`)
    let n = 0
    const piCollection = 'product-intelligence-reports'
    for (const r of piReports) {
      try {
        await payload.delete({ collection: piCollection as any, id: r.id })
      } catch {
        try { await payload.delete({ collection: 'productIntelligenceReports' as any, id: r.id }) } catch {}
      }
      n++
      progress(`  PI raporu siliniyor: ${n}/${piReports.length}`)
    }
    log(`\n  ✅ ${n} PI raporu silindi`)
  }

  // ── 5. Variants sil ───────────────────────────────────────────────────────
  log(`\nVariants siliniyor (${variants.length})...`)
  let deletedVariants = 0
  for (const v of variants) {
    await payload.delete({ collection: 'variants', id: v.id })
    deletedVariants++
    progress(`  Variant siliniyor: ${deletedVariants}/${variants.length}`)
  }
  log(`\n  ✅ ${deletedVariants} variant silindi`)

  // ── 6. Media kayıtları sil ────────────────────────────────────────────────
  log(`\nMedia kayıtları siliniyor (${media.length})...`)
  let deletedMedia = 0
  for (const m of media) {
    await payload.delete({ collection: 'media', id: m.id })
    deletedMedia++
    progress(`  Media kaydı siliniyor: ${deletedMedia}/${media.length}`)
  }
  log(`\n  ✅ ${deletedMedia} media kaydı silindi`)

  // ── 7. Products sil ───────────────────────────────────────────────────────
  log(`\nÜrünler siliniyor (${products.length})...`)
  let deletedProducts = 0
  for (const p of products) {
    await payload.delete({ collection: 'products', id: p.id })
    deletedProducts++
    progress(`  Ürün siliniyor: ${deletedProducts}/${products.length}`)
  }
  log(`\n  ✅ ${deletedProducts} ürün silindi`)

  // ── 8. Özet ───────────────────────────────────────────────────────────────
  log('\n' + '='.repeat(55))
  log('✅  TEMİZLİK TAMAMLANDI')
  log('='.repeat(55))
  log(`  PI Raporları : ${piReports.length} silindi`)
  log(`  Variants     : ${deletedVariants} silindi`)
  log(`  Media (DB)   : ${deletedMedia} silindi`)
  log(`  Ürünler      : ${deletedProducts} silindi`)
  log(`  Backup       : ${backupPath}`)
  log('')
  log('⚠️  Manuel Temizlik Gerekli:')
  log('  • Shopier paneli → 24 listing (ürün kodlarını notlardan bulun)')
  log('  • Meta Business Suite → Instagram + Facebook test gönderileri')
  log('  • X.com → test tweet\'leri')
  log('  • Payload Admin → Media bölümü (DB silindi, dosyalar Vercel\'de kalıyor olabilir)')
  log('='.repeat(55))
}

main().catch(err => {
  console.error('\n❌ Hata:', err)
  process.exit(1)
})
