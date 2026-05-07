/**
 * production-cleanup.mjs
 * Doğrudan DB'ye bağlanır (Payload gerektirmez).
 *
 * Kullanım:
 *   node scripts/production-cleanup.mjs          ← gerçek silme
 *   DRY_RUN=1 node scripts/production-cleanup.mjs ← sadece liste
 */

import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// .env'den DATABASE_URI oku
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const DRY_RUN = process.env.DRY_RUN === '1'
const DB_URI   = process.env.DATABASE_URI

if (!DB_URI) { console.error('DATABASE_URI bulunamadı .env dosyasında'); process.exit(1) }

const { Client } = pg
const client = new Client({ connectionString: DB_URI })

function log(msg) { console.log(msg) }

async function q(sql, params = []) {
  const res = await client.query(sql, params)
  return res.rows
}

async function main() {
  await client.connect()
  log(DRY_RUN ? '\n🔍 DRY RUN — hiçbir şey silinmeyecek\n' : '\n🗑  GERÇEK TEMİZLİK BAŞLIYOR\n')

  // ── Verileri topla ──────────────────────────────────────────────────────
  const products = await q(`SELECT id, title, status FROM products ORDER BY id`)
  const variants = await q(`SELECT id FROM variants`)
  const media    = await q(`SELECT id, filename FROM media`)

  // PI raporları — tablo adını bul
  const tables = await q(`SELECT tablename FROM pg_tables WHERE schemaname='public'`)
  const tableNames = tables.map(t => t.tablename)
  const piTable = tableNames.find(t => t.includes('product_intelligence') || t.includes('pi_report'))
  const piReports = piTable ? await q(`SELECT id FROM "${piTable}"`) : []

  log(`Bulunanlar:`)
  log(`  Products      : ${products.length}`)
  log(`  Variants      : ${variants.length}`)
  log(`  Media         : ${media.length}`)
  log(`  PI Raporları  : ${piReports.length} ${piTable ? `(${piTable})` : '(tablo yok)'}`)

  // ── DRY RUN ──────────────────────────────────────────────────────────────
  if (DRY_RUN) {
    log('\n--- Silinecek Ürünler ---')
    for (const p of products) log(`  [${p.id}] ${p.title ?? 'isimsiz'} — ${p.status ?? '?'}`)
    log(`\nToplam: ${products.length} ürün, ${variants.length} variant, ${media.length} media, ${piReports.length} PI raporu`)
    log('\n⚠️  Manuel temizlik gerekli: Shopier(24), Instagram, X, Facebook, Vercel Media dosyaları')
    await client.end()
    return
  }

  // ── Backup ───────────────────────────────────────────────────────────────
  const backupDir = path.join(__dirname, '..', 'backups')
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupDir, `cleanup-${ts}.json`)

  const mediaFull = await q(`SELECT * FROM media`)
  const productsFull = await q(`SELECT * FROM products`)
  const variantsFull = await q(`SELECT * FROM variants`)
  const piFull = piTable ? await q(`SELECT * FROM "${piTable}"`) : []

  fs.writeFileSync(backupPath, JSON.stringify({ exportedAt: new Date().toISOString(), products: productsFull, variants: variantsFull, media: mediaFull, piReports: piFull }, null, 2))
  log(`\n💾 Backup: ${backupPath}`)

  // ── PI Raporları sil ─────────────────────────────────────────────────────
  if (piTable && piReports.length > 0) {
    await q(`DELETE FROM "${piTable}"`)
    log(`✅ ${piReports.length} PI raporu silindi`)
  }

  // ── FK bağımlı tabloları temizle ──────────────────────────────────────────
  // customer_inquiries içinde product_id varsa temizle (sadece NULL yap — silme)
  const ciCols = await q(`SELECT column_name FROM information_schema.columns WHERE table_name='customer_inquiries' AND column_name='product_id'`)
  if (ciCols.length > 0) {
    const r = await q(`UPDATE customer_inquiries SET product_id = NULL WHERE product_id IS NOT NULL`)
    log(`  customer_inquiries.product_id → NULL (${r.rowCount ?? '?'} satır)`)
  }

  // dispatched_channels ve benzeri tabloları kontrol et
  const dispTable = tableNames.find(t => t.includes('dispatched_channel'))
  if (dispTable) {
    await q(`DELETE FROM "${dispTable}"`)
    log(`✅ dispatched_channels temizlendi`)
  }

  // ── Variants sil ─────────────────────────────────────────────────────────
  const vRes = await q(`DELETE FROM variants`)
  log(`✅ ${variants.length} variant silindi`)

  // ── Media sil ────────────────────────────────────────────────────────────
  const mRes = await q(`DELETE FROM media`)
  log(`✅ ${media.length} media kaydı silindi`)

  // ── Products sil ─────────────────────────────────────────────────────────
  // Diğer FK tablolarını bul
  const fkTables = await q(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints AS rc ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.table_constraints AS ccu ON ccu.constraint_name = rc.unique_constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'products'
  `)
  for (const fk of fkTables) {
    const tbl = fk.table_name
    const col = fk.column_name
    if (['variants','media'].includes(tbl)) continue // zaten silindi
    try {
      await q(`DELETE FROM "${tbl}" WHERE "${col}" IS NOT NULL`)
      log(`  FK temizlendi: ${tbl}.${col}`)
    } catch(e) {
      log(`  FK atlandı: ${tbl}.${col} — ${e.message}`)
    }
  }

  await q(`DELETE FROM products`)
  log(`✅ ${products.length} ürün silindi`)

  log('\n' + '='.repeat(50))
  log('✅  TEMİZLİK TAMAMLANDI')
  log('='.repeat(50))
  log(`\n⚠️  Manuel temizlik:`)
  log('  • Shopier paneli → 24 listing')
  log('  • Meta Business Suite → Instagram + Facebook')
  log('  • X.com → test tweetleri')
  log('  • Payload Admin → Media (dosyalar Vercel\'de kalıyor olabilir)')
  log('='.repeat(50))

  await client.end()
}

main().catch(async err => {
  console.error('\n❌ Hata:', err.message)
  await client.end().catch(() => {})
  process.exit(1)
})
