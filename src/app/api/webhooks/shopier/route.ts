/**
 * /api/webhooks/shopier — Shopier webhook event handler
 *
 * Receives webhook events from Shopier and:
 *  1. Verifies HMAC-SHA256 signature (Shopier-Signature header)
 *  2. Responds 200 OK within 5 seconds (Shopier requirement)
 *  3. Sends Telegram notification for order/refund events
 *  4. Optionally updates local state
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
        const orderId = body.id as string ?? '?'
        const status = body.status as string ?? '?'
        const shippingInfo = body.shippingInfo as Record<string, unknown> | undefined
        const firstName = shippingInfo?.firstName ?? ''
        const lastName = shippingInfo?.lastName ?? ''
        const totalPrice = (body.totalPrice as string) ?? '?'
        const currency = (body.currency as string) ?? 'TRY'

        // Extract product info from order items
        const items = body.items as Array<Record<string, unknown>> | undefined
        const itemSummary = items?.map((item) => {
          const title = item.title as string ?? '?'
          const qty = item.quantity as number ?? 1
          return `  • ${title} x${qty}`
        }).join('\n') ?? '  (ürün bilgisi yok)'

        const msg =
          `🛒 Yeni Shopier Sipariş!\n\n` +
          `Sipariş No: ${orderId}\n` +
          `Müşteri: ${firstName} ${lastName}\n` +
          `Tutar: ${totalPrice} ${currency}\n` +
          `Durum: ${status}\n\n` +
          `Ürünler:\n${itemSummary}`

        if (telegramChatId) {
          await sendTelegramNotification(telegramChatId, msg)
        }
        console.log(`[webhook/shopier] order.created — orderId=${orderId} total=${totalPrice}`)
        break
      }

      case 'order.fulfilled': {
        const orderId = body.id as string ?? '?'
        const msg = `✅ Shopier sipariş tamamlandı\nSipariş No: ${orderId}`
        if (telegramChatId) {
          await sendTelegramNotification(telegramChatId, msg)
        }
        console.log(`[webhook/shopier] order.fulfilled — orderId=${orderId}`)
        break
      }

      case 'order.addressUpdated': {
        const orderId = body.id as string ?? '?'
        console.log(`[webhook/shopier] order.addressUpdated — orderId=${orderId}`)
        break
      }

      case 'refund.requested': {
        const refundId = body.id as string ?? '?'
        const msg = `⚠️ Shopier iade talebi\nİade No: ${refundId}`
        if (telegramChatId) {
          await sendTelegramNotification(telegramChatId, msg)
        }
        console.log(`[webhook/shopier] refund.requested — refundId=${refundId}`)
        break
      }

      case 'refund.updated': {
        const refundId = body.id as string ?? '?'
        const refundStatus = body.status as string ?? '?'
        const msg = `🔄 Shopier iade güncellendi\nİade No: ${refundId}\nDurum: ${refundStatus}`
        if (telegramChatId) {
          await sendTelegramNotification(telegramChatId, msg)
        }
        console.log(`[webhook/shopier] refund.updated — refundId=${refundId} status=${refundStatus}`)
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
