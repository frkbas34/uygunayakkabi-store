import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/lib/payload'

/**
 * D-250: Normalize the free-text source from the request body to a known
 * customer-inquiries.source value. Prevents garbage strings from polluting
 * the source field and making funnel reporting noisy over time.
 *
 * Known values match the labels funnelDesk.ts renders. Any unknown value
 * (including empty string) falls back to 'website' — the correct value for
 * storefront form submissions, which is the only current caller.
 *
 * 'whatsapp' and 'manual_entry' are allowed as forward-looking sources
 * an operator might pass when manually creating an inquiry outside the form.
 */
const KNOWN_INQUIRY_SOURCES = [
  'website',
  'instagram',
  'phone',
  'telegram',
  'whatsapp',
  'manual_entry',
] as const

function normalizeInquirySource(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.toLowerCase().trim() : ''
  return (KNOWN_INQUIRY_SOURCES as readonly string[]).includes(s) ? s : 'website'
}

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
        source: normalizeInquirySource(source),
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
