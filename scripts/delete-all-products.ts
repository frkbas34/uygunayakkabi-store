/**
 * delete-all-products.ts
 * 
 * Deletes all products and their associated variants from the database.
 * 
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/delete-all-products.ts   ← önce bunu — ne silineceğini gösterir
 *   npx tsx scripts/delete-all-products.ts              ← gerçek silme
 */

import { getPayload } from '../src/lib/payload'

const DRY_RUN = process.env.DRY_RUN === '1'

async function main() {
  const payload = await getPayload()

  console.log(DRY_RUN ? '\n🔍 DRY RUN — hiçbir şey silinmeyecek\n' : '\n🗑  GERÇEK SİLME BAŞLIYOR\n')

  // ── 1. Variants ──────────────────────────────────────────────────────────
  const variantResult = await payload.find({
    collection: 'variants',
    limit: 1000,
    depth: 0,
  })
  const variants = variantResult.docs
  console.log(`Variants bulundu: ${variants.length}`)

  if (!DRY_RUN) {
    let deletedVariants = 0
    for (const v of variants) {
      await payload.delete({ collection: 'variants', id: v.id })
      deletedVariants++
      process.stdout.write(`\r  Variant siliniyor: ${deletedVariants}/${variants.length}`)
    }
    console.log(`\n  ✅ ${deletedVariants} variant silindi`)
  }

  // ── 2. Products ──────────────────────────────────────────────────────────
  const productResult = await payload.find({
    collection: 'products',
    limit: 1000,
    depth: 0,
  })
  const products = productResult.docs
  console.log(`Products bulundu: ${products.length}`)

  if (DRY_RUN) {
    console.log('\nSilinecek ürünler:')
    for (const p of products) {
      console.log(`  - [${p.id}] ${(p as any).title || (p as any).name || 'isimsiz'} (${(p as any).status || '?'})`)
    }
    console.log(`\nToplam: ${products.length} ürün, ${variants.length} variant`)
    console.log('\nGerçek silme için: npx tsx scripts/delete-all-products.ts')
    return
  }

  let deletedProducts = 0
  for (const p of products) {
    await payload.delete({ collection: 'products', id: p.id })
    deletedProducts++
    process.stdout.write(`\r  Ürün siliniyor: ${deletedProducts}/${products.length}`)
  }
  console.log(`\n  ✅ ${deletedProducts} ürün silindi`)

  console.log('\n✅ Temizlik tamamlandı.')
  console.log(`   ${deletedVariants ?? 0} variant + ${deletedProducts} ürün silindi.`)
}

main().catch(err => {
  console.error('Hata:', err)
  process.exit(1)
})
