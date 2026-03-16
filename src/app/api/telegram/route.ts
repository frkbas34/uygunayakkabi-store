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
