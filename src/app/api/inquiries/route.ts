import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/lib/payload'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, phone, size, productId, message, source } = body

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    // Basic phone number validation
    const phoneRegex = /^[0-9+\-\s()]{7,20}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    const payload = await getPayload()

    const created = await payload.create({
      collection: 'customer-inquiries',
      data: {
        name,
        phone,
        size: size || undefined,
        product: productId || undefined,
        message: message || undefined,
        source: source || 'website',
        status: 'new',
      },
    })

    // D-243: fire-and-forget Telegram alert to the operator chat. Reuses
    // TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID env (same routing as
    // src/lib/stockReaction.ts). Failure here MUST NOT block the storefront
    // response — the lead is already saved.
    void (async () => {
      try {
        const { sendNewLeadAlert } = await import('@/lib/leadDesk')
        await sendNewLeadAlert(payload, (created as any).id)
      } catch (e) {
        console.error('[inquiries D-243] alert dispatch failed (non-blocking):', e instanceof Error ? e.message : e)
      }
    })()

    return NextResponse.json({ success: true, id: (created as any).id })
  } catch (error) {
    console.error('Inquiry creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
