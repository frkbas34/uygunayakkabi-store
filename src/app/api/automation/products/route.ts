import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/lib/payload'

/**
 * POST /api/automation/products
 * Internal automation endpoint for n8n → Payload product creation.
 * Uses Payload local API — no JWT needed, auth via shared secret header.
 *
 * Header: X-Automation-Secret: <AUTOMATION_SECRET env var>
 * Body: product fields (title required, price, sku, status, etc.)
 *
 * Idempotency (Step 7):
 *   If automationMeta.telegramChatId + automationMeta.telegramMessageId are both
 *   present in the request body, we query for an existing product with the same
 *   pair before creating a new one. This prevents duplicate products from webhook
 *   replays, retries, or repeated Telegram events.
 *   Response on duplicate: { status: "duplicate", product_id, title, slug, ... }
 */
export async function POST(req: NextRequest) {
  // Auth: shared secret header check
  const secret = req.headers.get('X-Automation-Secret')
  if (!process.env.AUTOMATION_SECRET || secret !== process.env.AUTOMATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate required field
  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  try {
    const payload = await getPayload()

    // ── Idempotency check ────────────────────────────────────────────────────
    // If telegramChatId + telegramMessageId are both provided, check for an
    // existing product with the same pair to prevent duplicates.
    const meta = body.automationMeta as Record<string, string> | undefined
    const tgChatId = meta?.telegramChatId
    const tgMsgId = meta?.telegramMessageId

    if (tgChatId && tgMsgId) {
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
        const dup = existing.docs[0]
        console.log(
          `[automation/products] duplicate blocked — chat_id=${tgChatId} msg_id=${tgMsgId} existing_id=${dup.id}`,
        )
        return NextResponse.json(
          {
            status: 'duplicate',
            product_id: dup.id,
            title: dup.title,
            slug: (dup as Record<string, unknown>).slug,
            workflow: 'n8n-automation',
            message: 'Bu Telegram mesajından zaten bir ürün oluşturulmuş. Tekrar oluşturulmadı.',
            timestamp: new Date().toISOString(),
          },
          { status: 200 },
        )
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // Determine stock quantity — intake field name: stockQuantity or quantity
    const stockQty = (() => {
      const raw = body.stockQuantity ?? body.quantity
      const n = typeof raw === 'number' ? raw : (raw !== undefined ? Number(raw) : NaN)
      return !isNaN(n) && n >= 0 ? n : 1
    })()

    // Merge automationMeta with top-level telegram block
    // Group messages carry from_user_id and chat_type in body.telegram
    const telegram = body.telegram as Record<string, string> | undefined
    const mergedMeta: Record<string, string | boolean> = {
      ...(meta ?? {}),
      ...(telegram?.from_user_id ? { telegramFromUserId: telegram.from_user_id } : {}),
      ...(telegram?.chat_type    ? { telegramChatType:   telegram.chat_type }    : {}),
      // Allow telegram block to supply chatId/messageId if automationMeta didn't have them
      ...(telegram?.chat_id && !meta?.telegramChatId
          ? { telegramChatId: telegram.chat_id } : {}),
      ...(telegram?.message_id && !meta?.telegramMessageId
          ? { telegramMessageId: telegram.message_id } : {}),
    }

    const product = await payload.create({
      collection: 'products',
      data: {
        title: body.title as string,
        price: typeof body.price === 'number' ? body.price : 0,
        status: (body.status as string) || 'draft',
        source: (body.source as string) || 'n8n',
        stockQuantity: stockQty,
        ...(body.sku ? { sku: body.sku as string } : {}),
        ...(body.channels ? { channels: body.channels as Record<string, boolean> } : {}),
        ...(Object.keys(mergedMeta).length > 0 ? { automationMeta: mergedMeta } : {}),
      },
    })

    const productData = product as Record<string, unknown>
    return NextResponse.json(
      {
        status: 'created',
        product_id: product.id,
        title: product.title,
        slug: productData.slug,
        sku: productData.sku,
        stock_quantity: productData.stockQuantity ?? stockQty,
        workflow: 'n8n-automation',
        timestamp: new Date().toISOString(),
      },
      { status: 201 },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    // Expose the underlying Postgres/Drizzle cause for easier debugging
    const cause = (err as Record<string, unknown>)?.cause
    const causeMsg = cause instanceof Error ? cause.message : (typeof cause === 'string' ? cause : '')
    console.error('[automation/products] create failed:', message, causeMsg)
    return NextResponse.json({ error: message, cause: causeMsg }, { status: 500 })
  }
}
