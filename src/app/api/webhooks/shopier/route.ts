/**
 * /api/webhooks/shopier — Shopier webhook event handler
 *
 * Receives webhook events from Shopier and:
 *  1. Verifies HMAC-SHA256 signature (Shopier-Signature header)
 *  2. Responds 200 OK within 5 seconds (Shopier requirement)
 *  3. Creates / updates Order documents in Payload CMS
 *  4. Sends Telegram notification for order/refund events
 *
 * Webhook verification (from official Shopier Node.js recipe):
 *   const hash = crypto.createHmac('sha256', webhookToken)
 *     .update(JSON.stringify(body)).digest('hex')
 *   Compare hash === req.headers['shopier-signature']
 *
 * Shopier headers:
 *   Shopier-Signature — HMAC-SHA256 hex digest
 *   Shopier-Event — event type (order.created, product.updated, etc.)
 *   Shopier-Account-Id — seller account ID
 *   Shopier-Webhook-Id — unique webhook delivery ID (idempotency)
 *   Shopier-Timestamp — Unix epoch seconds (UTC)
 *
 * Retry policy: up to 9 retries (1min → 72hrs) if not 200 OK within 5s.
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function POST(req: NextRequest) {
  const startMs = Date.now()

  try {
    // ── 1. Read body and headers ──────────────────────────────────────────────
    const rawBody = await req.text()
    const body = JSON.parse(rawBody) as Record<string, unknown>

    const shopierSignature = req.headers.get('shopier-signature') ?? ''
    const shopierEvent = req.headers.get('shopier-event') ?? ''
    const shopierAccountId = req.headers.get('shopier-account-id') ?? ''
    const shopierWebhookId = req.headers.get('shopier-webhook-id') ?? ''
    const shopierTimestamp = req.headers.get('shopier-timestamp') ?? ''

    console.log(
      `[webhook/shopier] received — event=${shopierEvent} account=${shopierAccountId} ` +
        `webhookId=${shopierWebhookId} timestamp=${shopierTimestamp}`,
    )

    // ── 2. Verify signature ───────────────────────────────────────────────────
    // SHOPIER_WEBHOOK_TOKEN may be a single token or comma-separated list
    // (each webhook registration returns its own token, so we try all of them)
    const webhookTokenEnv = process.env.SHOPIER_WEBHOOK_TOKEN
    if (webhookTokenEnv) {
      const tokens = webhookTokenEnv.split(',').map((t) => t.trim()).filter(Boolean)
      const bodyStr = JSON.stringify(body)
      const signatureValid = tokens.some((tok) =>
        crypto.createHmac('sha256', tok).update(bodyStr).digest('hex') === shopierSignature,
      )
      if (!signatureValid) {
        console.warn(
          `[webhook/shopier] signature mismatch — tried ${tokens.length} token(s), ` +
            `received=${shopierSignature.slice(0, 16)}...`,
        )
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } else {
      console.warn('[webhook/shopier] SHOPIER_WEBHOOK_TOKEN not set — skipping signature verification')
    }

    // ── 3. Respond 200 OK quickly (Shopier requires <5s) ─────────────────────
    // Process heavy work after sending response via non-blocking pattern.
    // In Next.js App Router, we can't truly send response then continue,
    // so we keep processing light and fast.

    // ── 4. Process event ──────────────────────────────────────────────────────
    const telegramChatId = process.env.SHOPIER_NOTIFY_CHAT_ID
      ? parseInt(process.env.SHOPIER_NOTIFY_CHAT_ID, 10)
      : null

    switch (shopierEvent) {
      case 'order.created': {
        await handleOrderCreated(body, telegramChatId)
        break
      }

      case 'order.fulfilled': {
        await handleOrderFulfilled(body, telegramChatId)
        break
      }

      case 'order.addressUpdated': {
        const orderId = body.id as string ?? '?'
        console.log(`[webhook/shopier] order.addressUpdated — orderId=${orderId}`)
        break
      }

      case 'refund.requested': {
        await handleRefundRequested(body, telegramChatId)
        break
      }

      case 'refund.updated': {
        await handleRefundUpdated(body, telegramChatId)
        break
      }

      case 'product.created':
      case 'product.updated': {
        // Log product webhook events but don't take action
        // (we're the source of truth — Shopier product changes are informational)
        const productId = body.id as string ?? '?'
        const productTitle = body.title as string ?? '?'
        console.log(`[webhook/shopier] ${shopierEvent} — productId=${productId} title="${productTitle}"`)
        break
      }

      default:
        console.warn(`[webhook/shopier] unknown event: ${shopierEvent}`)
    }

    const elapsed = Date.now() - startMs
    console.log(`[webhook/shopier] processed in ${elapsed}ms`)

    return NextResponse.json({ ok: true, event: shopierEvent })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[webhook/shopier] error:`, message)
    // Still return 200 to prevent Shopier from retrying on our parsing errors
    return NextResponse.json({ ok: false, error: message }, { status: 200 })
  }
}

// ── order.created ────────────────────────────────────────────────────────────

async function handleOrderCreated(
  body: Record<string, unknown>,
  telegramChatId: number | null,
): Promise<void> {
  const shopierOrderId = String(body.id ?? '')
  const status = (body.status as string) ?? 'new'
  const shippingInfo = body.shippingInfo as Record<string, unknown> | undefined
  const firstName = (shippingInfo?.firstName as string) ?? ''
  const lastName = (shippingInfo?.lastName as string) ?? ''
  const phone = (shippingInfo?.phone as string) ?? ''
  const address = [
    shippingInfo?.address,
    shippingInfo?.district,
    shippingInfo?.city,
    shippingInfo?.country,
  ]
    .filter(Boolean)
    .join(', ')

  const totalPrice = parseFloat((body.totalPrice as string) ?? '0') || 0
  const currency = (body.currency as string) ?? 'TRY'

  const items = (body.items as Array<Record<string, unknown>>) ?? []
  const firstItem = items[0]
  const firstItemTitle = (firstItem?.title as string) ?? ''
  const firstItemQty = (firstItem?.quantity as number) ?? 1
  const firstItemSize = (firstItem?.selectedOptions as string) ?? ''

  const itemSummary = items
    .map((item) => {
      const title = (item.title as string) ?? '?'
      const qty = (item.quantity as number) ?? 1
      const opts = (item.selectedOptions as string) ?? ''
      return `  • ${title}${opts ? ` [${opts}]` : ''} x${qty}`
    })
    .join('\n') || '  (ürün bilgisi yok)'

  try {
    const payload = await getPayload({ config: configPromise })

    // Idempotency: skip if order already exists
    const existing = await payload.find({
      collection: 'orders',
      where: { shopierOrderId: { equals: shopierOrderId } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      console.log(`[webhook/shopier] order.created — orderId=${shopierOrderId} already exists, skipping`)
      return
    }

    // Try to find matching local product by Shopier product ID stored during sync
    // Field path: sourceMeta.shopierProductId (group field in Products collection)
    let localProductId: number | undefined
    if (firstItem?.id) {
      const shopierProductId = String(firstItem.id)
      const productMatch = await payload.find({
        collection: 'products',
        where: { 'sourceMeta.shopierProductId': { equals: shopierProductId } },
        limit: 1,
      })
      if (productMatch.docs.length > 0) {
        localProductId = productMatch.docs[0].id as number
      }
    }

    const notesLines = [
      `Shopier Sipariş ID: ${shopierOrderId}`,
      `Durum: ${status}`,
      `Para birimi: ${currency}`,
      items.length > 1 ? `\nTüm ürünler:\n${itemSummary}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    await payload.create({
      collection: 'orders',
      data: {
        customerName: `${firstName} ${lastName}`.trim() || 'Shopier Müşteri',
        customerPhone: phone || 'Shopier',
        customerAddress: address || undefined,
        product: localProductId,
        size: firstItemSize || undefined,
        quantity: firstItemQty,
        totalPrice,
        status: 'new',
        source: 'shopier',
        shopierOrderId,
        paymentMethod: 'online',
        isPaid: true, // Shopier orders are pre-paid
        notes: notesLines,
      },
    })

    console.log(`[webhook/shopier] order.created — Payload Order created for shopierOrderId=${shopierOrderId}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[webhook/shopier] order.created — failed to create Payload Order: ${msg}`)
  }

  // Telegram notification
  const msg =
    `🛒 Yeni Shopier Sipariş!\n\n` +
    `Sipariş No: ${shopierOrderId}\n` +
    `Müşteri: ${firstName} ${lastName}\n` +
    `Telefon: ${phone || '—'}\n` +
    `Tutar: ${totalPrice} ${currency}\n` +
    `Durum: ${status}\n\n` +
    `Ürünler:\n${itemSummary}`

  if (telegramChatId) {
    await sendTelegramNotification(telegramChatId, msg)
  }
  console.log(`[webhook/shopier] order.created — orderId=${shopierOrderId} total=${totalPrice}`)
}

// ── order.fulfilled ──────────────────────────────────────────────────────────

async function handleOrderFulfilled(
  body: Record<string, unknown>,
  telegramChatId: number | null,
): Promise<void> {
  const shopierOrderId = String(body.id ?? '')

  try {
    const payload = await getPayload({ config: configPromise })
    const existing = await payload.find({
      collection: 'orders',
      where: { shopierOrderId: { equals: shopierOrderId } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      await payload.update({
        collection: 'orders',
        id: existing.docs[0].id as number,
        data: { status: 'shipped' },
      })
      console.log(`[webhook/shopier] order.fulfilled — updated Order ${existing.docs[0].id} → shipped`)
    } else {
      console.warn(`[webhook/shopier] order.fulfilled — no local Order found for shopierOrderId=${shopierOrderId}`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[webhook/shopier] order.fulfilled — failed to update Payload Order: ${msg}`)
  }

  const telegramMsg = `✅ Shopier sipariş tamamlandı\nSipariş No: ${shopierOrderId}`
  if (telegramChatId) {
    await sendTelegramNotification(telegramChatId, telegramMsg)
  }
  console.log(`[webhook/shopier] order.fulfilled — orderId=${shopierOrderId}`)
}

// ── refund.requested ─────────────────────────────────────────────────────────

async function handleRefundRequested(
  body: Record<string, unknown>,
  telegramChatId: number | null,
): Promise<void> {
  const refundId = String(body.id ?? '?')
  // refund body may contain orderId
  const orderId = (body.orderId as string) ?? (body.order_id as string) ?? ''

  if (orderId) {
    try {
      const payload = await getPayload({ config: configPromise })
      const existing = await payload.find({
        collection: 'orders',
        where: { shopierOrderId: { equals: orderId } },
        limit: 1,
      })
      if (existing.docs.length > 0) {
        const currentNotes = (existing.docs[0].notes as string) ?? ''
        await payload.update({
          collection: 'orders',
          id: existing.docs[0].id as number,
          data: {
            status: 'cancelled',
            notes: `${currentNotes}\n\nİade talebi: ${refundId}`.trim(),
          },
        })
        console.log(`[webhook/shopier] refund.requested — Order ${existing.docs[0].id} → cancelled`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[webhook/shopier] refund.requested — failed to update Payload Order: ${msg}`)
    }
  }

  const telegramMsg = `⚠️ Shopier iade talebi\nİade No: ${refundId}${orderId ? `\nSipariş: ${orderId}` : ''}`
  if (telegramChatId) {
    await sendTelegramNotification(telegramChatId, telegramMsg)
  }
  console.log(`[webhook/shopier] refund.requested — refundId=${refundId}`)
}

// ── refund.updated ───────────────────────────────────────────────────────────

async function handleRefundUpdated(
  body: Record<string, unknown>,
  telegramChatId: number | null,
): Promise<void> {
  const refundId = String(body.id ?? '?')
  const refundStatus = (body.status as string) ?? '?'

  const telegramMsg = `🔄 Shopier iade güncellendi\nİade No: ${refundId}\nDurum: ${refundStatus}`
  if (telegramChatId) {
    await sendTelegramNotification(telegramChatId, telegramMsg)
  }
  console.log(`[webhook/shopier] refund.updated — refundId=${refundId} status=${refundStatus}`)
}

// ── Telegram notification helper ────────────────────────────────────────────

async function sendTelegramNotification(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(4_000), // Stay under 5s total
    })
  } catch (err) {
    console.error('[webhook/shopier] Telegram notification failed:', err)
  }
}
