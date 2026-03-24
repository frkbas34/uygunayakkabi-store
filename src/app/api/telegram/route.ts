import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/lib/payload'
import { parseTelegramCaption, parseStockUpdate } from '@/lib/telegram'
import {
  fetchAutomationSettings,
  resolveProductStatus,
  resolveChannelTargets,
} from '@/lib/automationDecision'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

/** Türkçe karakterleri ASCII'ye çevir + URL-safe slug üret */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/** Telegram file_id → { buffer, ext, contentType } */
async function downloadTelegramFile(fileId: string): Promise<{
  buffer: Buffer
  ext: string
  contentType: string
} | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null

  const infoRes = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
  )
  const info = await infoRes.json()
  if (!info.ok || !info.result?.file_path) return null

  const filePath: string = info.result.file_path
  const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg'
  const EXT_MIME: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif',
  }

  const imgRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`)
  if (!imgRes.ok) return null

  const rawMime = (imgRes.headers.get('content-type') || '').split(';')[0].trim()
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const contentType = ALLOWED.includes(rawMime) ? rawMime : (EXT_MIME[ext] ?? 'image/jpeg')
  const buffer = Buffer.from(await imgRes.arrayBuffer())

  return { buffer, ext, contentType }
}

/**
 * Claude Vision ile fotoğrafı analiz et.
 * Fotoğrafa bakıp ürün bilgilerini JSON olarak döndürür.
 * ANTHROPIC_API_KEY yoksa null döner.
 */
async function analyzeProductWithVision(imageBuffer: Buffer, contentType: string): Promise<{
  title?: string
  category?: string
  brand?: string
  productType?: string
} | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const base64 = imageBuffer.toString('base64')

  const prompt = `Bu fotoğrafta bir ürün var. Lütfen aşağıdaki bilgileri Türkçe olarak JSON formatında döndür:

{
  "title": "Ürünün kısa açıklayıcı adı (örn: Nike Air Max 90 Spor Ayakkabı)",
  "category": "Şu değerlerden biri: Günlük | Spor | Klasik | Bot | Sandalet | Krampon | Cüzdan",
  "brand": "Marka adı (görünüyorsa, yoksa null)",
  "productType": "Alt kategori (sneaker/bot/sandalet/loafer/cüzdan/vs)"
}

Sadece JSON döndür, başka açıklama ekleme.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: contentType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: base64,
              },
            },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    const rawText: string = data?.content?.[0]?.text ?? ''

    // JSON parse — block içinde veya düz metin olabilir
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Webhook secret doğrulama
    // TELEGRAM_WEBHOOK_SECRET boşsa atla (ilk kurulum / test için)
    const secret = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
    if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const message = body?.message

    if (!message) {
      return NextResponse.json({ ok: true })
    }

    const text: string = message.text || message.caption || ''
    const chatId: number = message.chat?.id
    const messageId: number = message.message_id

    const payload = await getPayload()

    // ── "bunu ürüne çevir" otomatik intake ────────────────────────────────────
    // Destek: (A) fotoğraf + caption, (B) metin reply → fotoğraf mesajına
    const isBunuUruneCevir =
      /bunu\s+[uü]r[uü]ne\s+[cç]evir/i.test(text) ||
      /[uü]r[uü]ne\s+[cç]evir/i.test(text)

    // Reply senaryosu: text mesajı fotoğraflı bir mesajı reply ediyor
    const replyPhoto = message.reply_to_message?.photo
    const activePhoto = message.photo || (isBunuUruneCevir ? replyPhoto : null)

    if (isBunuUruneCevir && activePhoto) {
      // Reply senaryosunda caption, reply edilen mesajın caption'ından da alınabilir
      const replyCaption = message.reply_to_message?.caption || ''
      await sendTelegramMessage(chatId, '⏳ Ürün oluşturuluyor, lütfen bekleyin...')

      try {
        // 1. En yüksek çözünürlüklü fotoğrafı seç (activePhoto = direkt veya reply'daki foto)
        const photoArray = activePhoto as Array<{ file_id: string; width: number; height: number }>
        const photo = photoArray.sort((a, b) => b.width - a.width)[0]
        const fileId = photo.file_id

        // 2. Caption temizle — sadece bot username'lerini sil, ürün kelimelerini koru
        //    Kaynak: kendi caption'ı + reply edilen mesajın caption'ı (reply senaryosu)
        const BOT_MENTIONS = /(@Uygunops_bot|@uygunops_bot|@mentix_aibot|@Mentix)/gi
        const combinedText = text + (replyCaption ? '\n' + replyCaption : '')
        const cleanCaption = combinedText
          .replace(/bunu\s+[uü]r[uü]ne\s+[cç]evir/gi, '')
          .replace(/[uü]r[uü]ne\s+[cç]evir/gi, '')
          .replace(BOT_MENTIONS, '')
          .trim()

        // 3. Caption'dan ürün bilgisi parse et
        const parsedCaption = cleanCaption ? parseTelegramCaption(cleanCaption) : null

        // 4. Fotoğrafı indir
        const fileData = await downloadTelegramFile(fileId)
        if (!fileData) {
          await sendTelegramMessage(chatId, '❌ Fotoğraf indirilemedi. Lütfen tekrar deneyin.')
          return NextResponse.json({ ok: true })
        }

        // 5. Claude Vision analizi (ANTHROPIC_API_KEY varsa)
        let visionData: Awaited<ReturnType<typeof analyzeProductWithVision>> = null
        if (process.env.ANTHROPIC_API_KEY) {
          visionData = await analyzeProductWithVision(fileData.buffer, fileData.contentType)
        }

        // 6. Bilgileri birleştir: caption > vision > default
        const title =
          parsedCaption?.title ||
          visionData?.title ||
          `Telegram Ürünü ${new Date().toLocaleDateString('tr-TR')}`

        const price = parsedCaption?.price ?? 0
        const category = parsedCaption?.category || (visionData?.category as string | undefined) || undefined
        const brand = parsedCaption?.brand || visionData?.brand || undefined
        const productType = parsedCaption?.productType || visionData?.productType || undefined
        const stockQty = parsedCaption?.quantity ?? 1

        // SKU: explicit > timestamp-based
        const sku = parsedCaption?.sku || `TG-${Date.now()}`

        // Slug: unique by appending sku
        const slug = slugify(title) + '-' + sku.toLowerCase().replace(/[^a-z0-9-]/g, '')

        // 7. Idempotency check: aynı mesaj daha önce işlendi mi?
        const tgChatId = String(chatId)
        const tgMsgId = String(messageId)
        const existing = await payload.find({
          collection: 'products',
          where: {
            and: [
              { 'automationMeta.telegramChatId': { equals: tgChatId } },
              { 'automationMeta.telegramMessageId': { equals: tgMsgId } },
            ],
          },
          limit: 1,
        })
        if (existing.docs.length > 0) {
          const dup = existing.docs[0] as Record<string, unknown>
          await sendTelegramMessage(
            chatId,
            `ℹ️ Bu mesajdan zaten bir ürün oluşturulmuş:\n<b>${dup.title}</b>\nID: ${dup.id}`,
          )
          return NextResponse.json({ ok: true })
        }

        // 8. AutomationSettings + status kararı
        const automationSettings = await fetchAutomationSettings(payload)
        const statusDecision = resolveProductStatus(
          {
            parseConfidence: parsedCaption?.parseConfidence ?? null,
            readiness: {
              isReady: false,
              missingCritical: price === 0 ? ['Fiyat girilmemiş'] : [],
              warnings: [],
              score: parsedCaption?.parseConfidence ?? 30,
            },
            productAutoActivateOverride: null,
            explicitStatus: null,
          },
          automationSettings,
        )

        const channelDecision = resolveChannelTargets(['website'], automationSettings)

        // 9. Ürün oluştur
        const product = await payload.create({
          collection: 'products',
          data: {
            title,
            slug,
            sku,
            price,
            status: statusDecision.status,
            stockQuantity: stockQty,
            source: 'telegram',
            ...(category ? { category } : {}),
            ...(brand ? { brand } : {}),
            ...(productType ? { productType } : {}),
            channelTargets: channelDecision.effectiveTargets as any,
            channels: {
              publishWebsite: channelDecision.effectiveTargets.includes('website'),
              publishInstagram: false,
              publishShopier: false,
              publishDolap: false,
            },
            automationMeta: {
              telegramChatId: tgChatId,
              telegramMessageId: tgMsgId,
              rawCaption: cleanCaption || text,
              parseConfidence: parsedCaption?.parseConfidence ?? 0,
              parseWarnings: JSON.stringify(parsedCaption?.parseWarnings ?? []),
              autoDecision: statusDecision.status,
              autoDecisionReason: statusDecision.reason,
              visionUsed: !!visionData,
            },
          },
        })

        const productId = product.id as number

        // 10. Fotoğrafı Media koleksiyonuna yükle + ürüne ekle
        const filename = `tg-${productId}-${Date.now()}.${fileData.ext}`
        const media = await payload.create({
          collection: 'media',
          data: {
            altText: title,
            product: productId,
            type: 'original',
          },
          file: {
            data: fileData.buffer,
            mimetype: fileData.contentType,
            name: filename,
            size: fileData.buffer.length,
          },
        })

        await payload.update({
          collection: 'products',
          id: productId,
          data: {
            images: [{ image: media.id }],
          },
        })

        // 11. Telegram'a başarı bildirimi
        const statusEmoji = statusDecision.status === 'active' ? '🟢' : '📋'
        const statusLabel = statusDecision.status === 'active' ? 'Yayında' : 'Taslak'
        const priceLabel = price > 0 ? `${price} ₺` : '⚠️ Fiyat girilmemiş'
        const categoryLabel = category || '—'
        const brandLabel = brand || '—'
        const visionLabel = visionData ? ' (🤖 Vision)' : ''

        await sendTelegramMessage(
          chatId,
          `✅ <b>Ürün oluşturuldu${visionLabel}</b>\n\n` +
          `📦 <b>${title}</b>\n` +
          `SKU: ${sku}\n` +
          `Fiyat: ${priceLabel}\n` +
          `Kategori: ${categoryLabel}\n` +
          `Marka: ${brandLabel}\n` +
          `Stok: ${stockQty} adet\n` +
          `Durum: ${statusEmoji} ${statusLabel}\n\n` +
          `🔗 Admin: https://www.uygunayakkabi.com/admin/collections/products/${productId}`,
        )

        return NextResponse.json({ ok: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[telegram/webhook] bunu-urune-cevir failed:', msg)
        await sendTelegramMessage(
          chatId,
          `❌ Ürün oluşturulurken hata oluştu:\n<code>${msg.slice(0, 200)}</code>`,
        )
        return NextResponse.json({ ok: true })
      }
    }

    // ── /shopier commands ─────────────────────────────────────────────────────
    if (text.startsWith('/shopier')) {
      const parts = text.trim().split(/\s+/)
      const subCommand = parts[1]?.toLowerCase()
      const arg = parts[2]

      // /shopier publish <productId>
      if (subCommand === 'publish' && arg) {
        try {
          if (!process.env.SHOPIER_PAT) {
            await sendTelegramMessage(chatId, '❌ SHOPIER_PAT tanımlı değil — Shopier sync devre dışı')
            return NextResponse.json({ ok: true })
          }
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

      // /shopier republish <productId>
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

      // /shopier status <productId>
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
                `Durum: ${status}\nShopier ID: ${shopId}\nURL: ${shopUrl}\nSon Sync: ${lastSync}\nSon Hata: ${lastErr}`,
            )
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await sendTelegramMessage(chatId, `❌ Hata: ${msg}`)
        }
        return NextResponse.json({ ok: true })
      }

      // /shopier url <productId>
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

      // /shopier publish-ready
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
            `✅ ${queued} ürün Shopier sync kuyruğuna alındı.\n\nDurumları kontrol etmek için: /shopier status <id>`,
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await sendTelegramMessage(chatId, `❌ Toplu yayın hatası: ${msg}`)
        }
        return NextResponse.json({ ok: true })
      }

      // /shopier errors
      if (subCommand === 'errors') {
        try {
          const { docs } = await payload.find({
            collection: 'products',
            where: { 'sourceMeta.shopierSyncStatus': { equals: 'error' } },
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

    // ── STOCK UPDATE komutu ────────────────────────────────────────────────────
    if (text.startsWith('STOCK SKU:')) {
      const stockUpdate = parseStockUpdate(text)
      if (!stockUpdate) {
        await sendTelegramMessage(chatId, '❌ Geçersiz STOCK formatı.')
        return NextResponse.json({ ok: true })
      }

      const { sku, changes } = stockUpdate

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

      await sendTelegramMessage(chatId, `✅ Stok güncellendi (${sku}):\n${results.join('\n')}`)
      return NextResponse.json({ ok: true })
    }

    // ── Eski ürün oluşturma (legacy format, geriye dönük uyumluluk) ───────────
    if (message.photo || message.media_group_id) {
      const productData = parseTelegramCaption(text) as (ReturnType<typeof parseTelegramCaption> & {
        description?: string
        postToInstagram?: boolean
        sizes?: Record<string, number>
      }) | null

      if (!productData || !productData.title || !productData.sku) {
        // Legacy formatta değil — sessizce geç
        return NextResponse.json({ ok: true })
      }

      const { docs: existing } = await payload.find({
        collection: 'products',
        where: { sku: { equals: productData.sku } },
        limit: 1,
      })

      if (existing.length > 0) {
        await sendTelegramMessage(chatId, `❌ SKU zaten mevcut: ${productData.sku}`)
        return NextResponse.json({ ok: true })
      }

      const slug = slugify(productData.title) + '-' + productData.sku.toLowerCase()

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
        },
      })

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
        `✅ Ürün oluşturuldu!\n\n📦 ${productData.title}\nSKU: ${productData.sku}\nFiyat: ${productData.price} ₺`,
      )
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
