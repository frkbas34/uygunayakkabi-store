import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/lib/payload'
import { parseTelegramCaption, parseStockUpdate } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    const secret = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
    if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const message = body?.message

    if (!message) {
      return NextResponse.json({ ok: true })
    }

    const text = message.text || message.caption || ''
    const chatId = message.chat?.id

    const payload = await getPayload()

    // ── /shopier commands ─────────────────────────────────────────────────────
    if (text.startsWith('/shopier')) {
      const parts = text.trim().split(/\s+/)
      const subCommand = parts[1]?.toLowerCase()
      const arg = parts[2]

      // /shopier publish <productId> — Queue product sync to Shopier
      if (subCommand === 'publish' && arg) {
        try {
          if (!process.env.SHOPIER_PAT) {
            await sendTelegramMessage(chatId, '❌ SHOPIER_PAT tanımlı değil — Shopier sync devre dışı')
            return NextResponse.json({ ok: true })
          }
          // Set status to 'queued' first so admin UI shows pending state immediately
          const { docs: pDocs } = await payload.find({
            collection: 'products',
            where: { id: { equals: arg } },
            depth: 0,
            limit: 1,
          })
          if (pDocs.length === 0) {
            await sendTelegramMessage(chatId, `❌ Ürün bulunamadı: ${arg}`)
            return NextResponse.json({ ok: true })
          }
          const pDoc = pDocs[0] as Record<string, unknown>
          const pMeta = (pDoc.sourceMeta as Record<string, unknown>) ?? {}
          await payload.update({
            collection: 'products',
            id: arg,
            data: { sourceMeta: { ...pMeta, shopierSyncStatus: 'queued' } },
            context: { isDispatchUpdate: true },
          })
          // Enqueue the job — completion notification sent by the task via syncProductToShopier
          await payload.jobs.queue({
            task: 'shopier-sync',
            input: { productId: arg, notifyTelegramChatId: chatId },
            overrideAccess: true,
          })
          await sendTelegramMessage(
            chatId,
            `⏳ Shopier sync kuyruğa alındı\nÜrün: ${pDoc.title ?? arg}\n\nSync tamamlanınca bildirim gelecek.`,
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await sendTelegramMessage(chatId, `❌ Shopier publish hatası: ${msg}`)
        }
        return NextResponse.json({ ok: true })
      }

      // /shopier republish <productId> — Force full resync via jobs queue
      if (subCommand === 'republish' && arg) {
        try {
          if (!process.env.SHOPIER_PAT) {
            await sendTelegramMessage(chatId, '❌ SHOPIER_PAT tanımlı değil — Shopier sync devre dışı')
            return NextResponse.json({ ok: true })
          }
          const { docs: rDocs } = await payload.find({
            collection: 'products',
            where: { id: { equals: arg } },
            depth: 0,
            limit: 1,
          })
          if (rDocs.length === 0) {
            await sendTelegramMessage(chatId, `❌ Ürün bulunamadı: ${arg}`)
            return NextResponse.json({ ok: true })
          }
          const rDoc = rDocs[0] as Record<string, unknown>
          const rMeta = (rDoc.sourceMeta as Record<string, unknown>) ?? {}
          await payload.update({
            collection: 'products',
            id: arg,
            data: { sourceMeta: { ...rMeta, shopierSyncStatus: 'queued' } },
            context: { isDispatchUpdate: true },
          })
          await payload.jobs.queue({
            task: 'shopier-sync',
            input: { productId: arg, notifyTelegramChatId: chatId },
            overrideAccess: true,
          })
          await sendTelegramMessage(
            chatId,
            `🔄 Shopier tekrar sync kuyruğa alındı\nÜrün: ${rDoc.title ?? arg}\n\nSync tamamlanınca bildirim gelecek.`,
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await sendTelegramMessage(chatId, `❌ Shopier republish hatası: ${msg}`)
        }
        return NextResponse.json({ ok: true })
      }

      // /shopier status <productId> — Show sync status
      if (subCommand === 'status' && arg) {
        try {
          const { docs } = await payload.find({
            collection: 'products',
            where: { id: { equals: arg } },
            depth: 0,
            limit: 1,
          })
          if (docs.length === 0) {
            await sendTelegramMessage(chatId, `❌ Ürün bulunamadı: ${arg}`)
          } else {
            const p = docs[0] as Record<string, unknown>
            const sm = (p.sourceMeta as Record<string, unknown>) ?? {}
            const status = (sm.shopierSyncStatus as string) || 'not_synced'
            const shopId = (sm.shopierProductId as string) || '—'
            const shopUrl = (sm.shopierProductUrl as string) || '—'
            const lastSync = (sm.shopierLastSyncAt as string) || '—'
            const lastErr = (sm.shopierLastError as string) || '—'
            await sendTelegramMessage(
              chatId,
              `📊 Shopier Durumu — ${p.title}\n\n` +
                `Durum: ${status}\n` +
                `Shopier ID: ${shopId}\n` +
                `URL: ${shopUrl}\n` +
                `Son Sync: ${lastSync}\n` +
                `Son Hata: ${lastErr}`,
            )
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await sendTelegramMessage(chatId, `❌ Hata: ${msg}`)
        }
        return NextResponse.json({ ok: true })
      }

      // /shopier url <productId> — Get Shopier URL
      if (subCommand === 'url' && arg) {
        try {
          const { docs } = await payload.find({
            collection: 'products',
            where: { id: { equals: arg } },
            depth: 0,
            limit: 1,
          })
          if (docs.length === 0) {
            await sendTelegramMessage(chatId, `❌ Ürün bulunamadı: ${arg}`)
          } else {
            const sm = ((docs[0] as Record<string, unknown>).sourceMeta as Record<string, unknown>) ?? {}
            const url = (sm.shopierProductUrl as string) || 'Henüz yayınlanmadı'
            await sendTelegramMessage(chatId, `🔗 Shopier URL: ${url}`)
          }
        } catch (err) {
          await sendTelegramMessage(chatId, `❌ Hata: ${err}`)
        }
        return NextResponse.json({ ok: true })
      }

      // /shopier publish-ready — Bulk publish all ready products
      if (subCommand === 'publish-ready') {
        try {
          const { docs } = await payload.find({
            collection: 'products',
            where: {
              and: [
                { status: { equals: 'active' } },
                { 'channels.publishShopier': { equals: true } },
              ],
            },
            depth: 0,
            limit: 50,
          })

          // Filter out already-synced products
          const toSync = docs.filter((d: Record<string, unknown>) => {
            const sm = (d.sourceMeta as Record<string, unknown>) ?? {}
            return !sm.shopierProductId
          })

          if (toSync.length === 0) {
            await sendTelegramMessage(chatId, '✅ Shopier\'e yayınlanacak yeni ürün yok.')
            return NextResponse.json({ ok: true })
          }

          await sendTelegramMessage(chatId, `⏳ ${toSync.length} ürün Shopier sync kuyruğuna alınıyor...`)

          let queued = 0
          for (const p of toSync) {
            const pMeta = ((p as Record<string, unknown>).sourceMeta as Record<string, unknown>) ?? {}
            // Mark each product as queued before enqueuing
            await payload.update({
              collection: 'products',
              id: p.id,
              data: { sourceMeta: { ...pMeta, shopierSyncStatus: 'queued' } },
              context: { isDispatchUpdate: true },
            })
            await payload.jobs.queue({
              task: 'shopier-sync',
              input: { productId: String(p.id) },
              overrideAccess: true,
            })
            queued++
          }

          await sendTelegramMessage(
            chatId,
            `✅ ${queued} ürün Shopier sync kuyruğuna alındı.\nSync tamamlandıkça ürün durumları güncellenir.\n\nDurumları kontrol etmek için: /shopier status <id>`,
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await sendTelegramMessage(chatId, `❌ Toplu yayın hatası: ${msg}`)
        }
        return NextResponse.json({ ok: true })
      }

      // /shopier errors — List recent sync errors
      if (subCommand === 'errors') {
        try {
          const { docs } = await payload.find({
            collection: 'products',
            where: {
              'sourceMeta.shopierSyncStatus': { equals: 'error' },
            },
            depth: 0,
            limit: 10,
            sort: '-updatedAt',
          })

          if (docs.length === 0) {
            await sendTelegramMessage(chatId, '✅ Shopier sync hatası yok.')
          } else {
            const lines = docs.map((d: Record<string, unknown>) => {
              const sm = (d.sourceMeta as Record<string, unknown>) ?? {}
              return `• ${d.title} (${d.id})\n  Hata: ${(sm.shopierLastError as string)?.slice(0, 100) || '?'}`
            })
            await sendTelegramMessage(chatId, `❌ Son Shopier hataları:\n\n${lines.join('\n\n')}`)
          }
        } catch (err) {
          await sendTelegramMessage(chatId, `❌ Hata: ${err}`)
        }
        return NextResponse.json({ ok: true })
      }

      // Unknown /shopier subcommand
      await sendTelegramMessage(
        chatId,
        '📋 Shopier komutları:\n\n' +
          '/shopier publish <id> — Ürünü yayınla\n' +
          '/shopier republish <id> — Tekrar senkronla\n' +
          '/shopier status <id> — Sync durumu\n' +
          '/shopier url <id> — Shopier linki\n' +
          '/shopier publish-ready — Tüm hazır ürünleri yayınla\n' +
          '/shopier errors — Son hataları listele',
      )
      return NextResponse.json({ ok: true })
    }

    // Handle STOCK UPDATE command
    if (text.startsWith('STOCK SKU:')) {
      const stockUpdate = parseStockUpdate(text)
      if (!stockUpdate) {
        await sendTelegramMessage(chatId, '❌ Geçersiz STOCK formatı.')
        return NextResponse.json({ ok: true })
      }

      const { sku, changes } = stockUpdate

      // Find product
      const { docs: products } = await payload.find({
        collection: 'products',
        where: { sku: { equals: sku } },
        depth: 1,
        limit: 1,
      })

      if (products.length === 0) {
        await sendTelegramMessage(chatId, `❌ SKU bulunamadı: ${sku}`)
        return NextResponse.json({ ok: true })
      }

      const product = products[0]

      // Update each size variant
      const results: string[] = []
      for (const { size, delta } of changes) {
        const { docs: variants } = await payload.find({
          collection: 'variants',
          where: {
            and: [
              { product: { equals: product.id } },
              { size: { equals: size } },
            ],
          },
          limit: 1,
        })

        if (variants.length > 0) {
          const variant = variants[0]
          const newStock = Math.max(0, (variant.stock as number) + delta)
          await payload.update({
            collection: 'variants',
            id: variant.id,
            data: { stock: newStock },
          })

          // Log inventory change
          await payload.create({
            collection: 'inventory-logs',
            data: {
              sku,
              size,
              change: delta,
              reason: 'Telegram stock update',
              source: 'telegram',
              timestamp: new Date().toISOString(),
            },
          })

          results.push(`Beden ${size}: ${variant.stock} → ${newStock}`)
        } else {
          results.push(`Beden ${size}: bulunamadı`)
        }
      }

      await sendTelegramMessage(
        chatId,
        `✅ Stok güncellendi (${sku}):\n${results.join('\n')}`
      )
      return NextResponse.json({ ok: true })
    }

    // Handle PRODUCT CREATION (message with photo and caption)
    if (message.photo || message.media_group_id) {
      // parseTelegramCaption returns ParsedCaption (Step 11+ type).
      // Route still uses legacy ProductData fields at runtime — cast to include them.
      const productData = parseTelegramCaption(text) as (ReturnType<typeof parseTelegramCaption> & {
        description?: string
        postToInstagram?: boolean
        sizes?: Record<string, number>
      }) | null
      if (!productData) {
        await sendTelegramMessage(chatId, '❌ Geçersiz ürün formatı. SKU, TITLE ve PRICE zorunludur.')
        return NextResponse.json({ ok: true })
      }

      // Check for duplicate SKU
      const { docs: existing } = await payload.find({
        collection: 'products',
        where: { sku: { equals: productData.sku } },
        limit: 1,
      })

      if (existing.length > 0) {
        await sendTelegramMessage(chatId, `❌ SKU zaten mevcut: ${productData.sku}`)
        return NextResponse.json({ ok: true })
      }

      // Create slug from title
      const slug = productData.title!
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .concat('-', productData.sku!.toLowerCase())

      // Create product
      const newProduct = await payload.create({
        collection: 'products',
        data: {
          title: productData.title,
          slug,
          sku: productData.sku,
          brand: productData.brand,
          category: productData.category,
          price: productData.price,
          description: productData.description,
          status: 'active',
          createdByAutomation: true,
          postToInstagram: productData.postToInstagram,
        },
      })

      // Create variants
      for (const [size, stock] of Object.entries(productData.sizes ?? {})) {
        await payload.create({
          collection: 'variants',
          data: {
            product: newProduct.id,
            size,
            stock,
            variantSku: `${productData.sku}-${size}`,
          },
        })

        // Log initial inventory
        await payload.create({
          collection: 'inventory-logs',
          data: {
            sku: productData.sku,
            size,
            change: stock,
            reason: 'Initial stock from Telegram',
            source: 'telegram',
            timestamp: new Date().toISOString(),
          },
        })
      }

      await sendTelegramMessage(
        chatId,
        `✅ Ürün oluşturuldu!\n\n📦 ${productData.title}\nSKU: ${productData.sku}\nFiyat: ${productData.price} ₺\nURL: /products/${slug}`
      )
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}
