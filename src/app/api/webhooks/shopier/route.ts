/**
 * /api/webhooks/shopier — Shopier webhook event handler
 *
 * Receives webhook events from Shopier and:
 *  1. Verifies HMAC-SHA256 signature (Shopier-Signature header)
 *  2. Responds 2xx only after the event completes; verified processing failures return 5xx for retry
 *  3. Creates / updates Order documents in Payload CMS
 *  4. Sends Telegram notification for order/refund events
 *
 * Webhook verification (from official Shopier Node.js recipe):
 *   const hash = crypto.createHmac('sha256', webhookToken)
 *     .update(rawRequestBody).digest('hex')
 *   Compare with req.headers['shopier-signature'] in constant time
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
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import {
  decrementStockForShopierOrder,
  restoreStockForShopierRefund,
  type ShopierOrderItem,
} from '@/lib/shopierOrderStock'
import {
  applyShopierRefundRequest,
  applyShopierRefundUpdate,
  extractShopierRefundRequestInfo,
  extractShopierRefundUpdateInfo,
  type ShopierRefundLifecyclePayload,
} from '@/lib/shopierRefundLifecycle'
import { applyOrderStatus } from '@/lib/orderDesk'
import { runPayloadTransaction } from '@/lib/payloadTransaction'
import { verifyShopierWebhookSignature } from '@/lib/shopierWebhookSecurity'
import { isPostgresUniqueViolation } from '@/lib/shopierOrderIdempotency'

export async function POST(req: NextRequest) {
  const startMs = Date.now()

  try {
    // ── 1. Read body and headers ──────────────────────────────────────────────
    const rawBody = await req.text()

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
    // ── 3. Respond 200 OK quickly (Shopier requires <5s) ─────────────────────
    const verification = verifyShopierWebhookSignature({
      rawBody,
      signature: shopierSignature,
      tokenEnv: process.env.SHOPIER_WEBHOOK_TOKEN,
    })
    if (!verification.ok) {
      console.warn(
        `[webhook/shopier] signature rejected - reason=${verification.reason} ` +
          `configuredTokens=${verification.tokenCount}`,
      )
      return NextResponse.json(
        {
          error:
            verification.reason === 'missing_configuration'
              ? 'Webhook verification is not configured'
              : 'Invalid signature',
        },
        { status: verification.reason === 'missing_configuration' ? 503 : 401 },
      )
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Process each verified event before acknowledgement so a failed transaction
    // receives Shopier's retry instead of a false success response.

    // ── 4. Process event ──────────────────────────────────────────────────────
    const telegramChatId = process.env.SHOPIER_NOTIFY_CHAT_ID ? parseInt(process.env.SHOPIER_NOTIFY_CHAT_ID, 10) : null

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
        const orderId = (body.id as string) ?? '?'
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
        const productId = (body.id as string) ?? '?'
        const productTitle = (body.title as string) ?? '?'
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
    // A verified, valid event that cannot complete its transaction must retry.
    return NextResponse.json({ ok: false, error: 'Webhook processing failed' }, { status: 500 })
  }
}

// ── order.created ────────────────────────────────────────────────────────────

async function handleOrderCreated(body: Record<string, unknown>, telegramChatId: number | null): Promise<void> {
  const shopierOrderId = String(body.id ?? '')
  const status = (body.status as string) ?? 'new'
  const shippingInfo = body.shippingInfo as Record<string, unknown> | undefined
  const firstName = (shippingInfo?.firstName as string) ?? ''
  const lastName = (shippingInfo?.lastName as string) ?? ''
  const phone = (shippingInfo?.phone as string) ?? ''
  const address = [shippingInfo?.address, shippingInfo?.district, shippingInfo?.city, shippingInfo?.country]
    .filter(Boolean)
    .join(', ')

  const totalPrice = parseFloat((body.totalPrice as string) ?? '0') || 0
  const currency = (body.currency as string) ?? 'TRY'

  const items = (body.items as Array<Record<string, unknown>>) ?? []
  const firstItem = items[0]
  const firstItemQty = (firstItem?.quantity as number) ?? 1
  const firstItemSize = (firstItem?.selectedOptions as string) ?? ''

  const itemSummary =
    items
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

    const stockMutation = await runPayloadTransaction(payload, async (req) => {
    // Try to find matching local product by Shopier product ID stored during sync
    // Field path: sourceMeta.shopierProductId (group field in Products collection)
    let localProductId: number | undefined
    if (firstItem?.id) {
      const shopierProductId = String(firstItem.id)
      const productMatch = await payload.find({
        collection: 'products',
        where: { 'sourceMeta.shopierProductId': { equals: shopierProductId } },
        limit: 1,
        req,
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
        req,
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

    // ── Stock decrement + InventoryLog per item ────────────────────────────
    const stockMutation = await decrementStockForShopierOrder(
      payload,
      items as ShopierOrderItem[],
      shopierOrderId,
      { req },
    )
    return stockMutation
    })
    for (const skipped of stockMutation.skippedItems) {
      console.warn(
        `[webhook/shopier] stock skipped - product=${skipped.shopierProductId ?? skipped.localProductId ?? '?'} ` +
          `reason=${skipped.reason}`,
      )
    }
    const affectedProductIds = stockMutation.affectedProductIds

    // ── Phase 9: Central stock reaction for each affected product ────────
    try {
      const { reactToStockChange } = await import('@/lib/stockReaction')
      for (const pid of affectedProductIds) {
        const result = await reactToStockChange(payload, pid, 'shopier')
        if (result.reacted) {
          console.log(`[webhook/shopier] stockReaction — product=${pid} events=[${result.eventsEmitted.join(',')}]`)
        }
      }
    } catch (stockErr) {
      console.error(
        `[webhook/shopier] stockReaction failed (non-blocking):`,
        stockErr instanceof Error ? stockErr.message : String(stockErr),
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (isPostgresUniqueViolation(err)) {
      console.warn(
        `[webhook/shopier] order.created - duplicate local order for shopierOrderId=${shopierOrderId}; stock mutation skipped`,
      )
      return
    }
    console.error(`[webhook/shopier] order.created — failed to create Payload Order: ${msg}`)
    throw err
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
    try {
      await sendTelegramNotification(telegramChatId, msg)
    } catch (notificationError) {
      console.error(
        '[webhook/shopier] order.created - Telegram notification failed after the transaction committed:',
        notificationError instanceof Error ? notificationError.message : String(notificationError),
      )
    }
  }
  console.log(`[webhook/shopier] order.created — orderId=${shopierOrderId} total=${totalPrice}`)
}

// ── order.fulfilled ──────────────────────────────────────────────────────────

async function handleOrderFulfilled(body: Record<string, unknown>, telegramChatId: number | null): Promise<void> {
  const shopierOrderId = String(body.id ?? '')

  try {
    const payload = await getPayload({ config: configPromise })
    const existing = await payload.find({
      collection: 'orders',
      where: { shopierOrderId: { equals: shopierOrderId } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      const result = await applyOrderStatus(payload, existing.docs[0].id as number, 'ship', 'shopier_webhook')
      if (result.ok) {
        console.log(`[webhook/shopier] order.fulfilled - ${result.summary}`)
      } else {
        console.warn(`[webhook/shopier] order.fulfilled - ${result.summary}`)
      }
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

async function handleRefundRequested(body: Record<string, unknown>, telegramChatId: number | null): Promise<void> {
  const info = extractShopierRefundRequestInfo(body)

  if (info.orderId) {
    try {
      const payload = await getPayload({ config: configPromise })
      const requestResult = await applyShopierRefundRequest(payload as unknown as ShopierRefundLifecyclePayload, body)
      console.log(`[webhook/shopier] refund.requested - ${requestResult.message}`)

      if (requestResult.shouldRestoreStock && requestResult.order) {
        // Phase 10: Restore stock on refund - increment product stock back once per refund request.
        try {
          const stockMutation = await restoreStockForShopierRefund(
            payload,
            requestResult.order,
            info.refundId,
            info.orderId,
          )
          for (const skipped of stockMutation.skippedItems) {
            console.warn(
              `[webhook/shopier] refund stock skipped - product=${skipped.localProductId ?? '?'} ` +
                `reason=${skipped.reason}`,
            )
          }

          const { reactToStockChange } = await import('@/lib/stockReaction')
          for (const productId of stockMutation.affectedProductIds) {
            const stockResult = await reactToStockChange(payload, productId, 'shopier')
            console.log(
              `[webhook/shopier] refund stock restored - product=${productId} ` +
                `events=[${stockResult.eventsEmitted.join(',')}]`,
            )
          }
        } catch (stockErr) {
          console.error(
            `[webhook/shopier] refund stock restoration failed (non-blocking):`,
            stockErr instanceof Error ? stockErr.message : String(stockErr),
          )
        }
      } else {
        console.log(`[webhook/shopier] refund.requested - stock restore skipped: outcome=${requestResult.outcome}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[webhook/shopier] refund.requested — failed to update Payload Order: ${msg}`)
    }
  }

  const telegramMsg = `⚠️ Shopier iade talebi\nİade No: ${info.refundId}${info.orderId ? `\nSipariş: ${info.orderId}` : ''}`
  if (telegramChatId) {
    await sendTelegramNotification(telegramChatId, telegramMsg)
  }
  console.log(`[webhook/shopier] refund.requested — refundId=${info.refundId}`)
}

// ── refund.updated ───────────────────────────────────────────────────────────

async function handleRefundUpdated(body: Record<string, unknown>, telegramChatId: number | null): Promise<void> {
  const info = extractShopierRefundUpdateInfo(body)

  try {
    const payload = await getPayload({ config: configPromise })
    const result = await applyShopierRefundUpdate(payload as unknown as ShopierRefundLifecyclePayload, body)
    console.log(`[webhook/shopier] refund.updated - ${result.message}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[webhook/shopier] refund.updated - failed to update local Order: ${msg}`)
  }

  const telegramMsg =
    `🔄 Shopier iade güncellendi\nİade No: ${info.refundId}\nDurum: ${info.status}` +
    (info.orderId ? `\nSipariş: ${info.orderId}` : '')
  if (telegramChatId) {
    await sendTelegramNotification(telegramChatId, telegramMsg)
  }
  console.log(`[webhook/shopier] refund.updated — refundId=${info.refundId} status=${info.status}`)
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
