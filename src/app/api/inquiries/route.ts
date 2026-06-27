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

/**
 * D-251: Sanitize a source-detail field (UTM param or referrer domain).
 * - Non-string, empty, or whitespace-only → null (never store empty strings)
 * - Trims, lowercases, caps at 200 chars
 * - No invented values — unknown is stored as null
 */
function sanitizeDetail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim().toLowerCase().slice(0, 200)
  return s.length > 0 ? s : null
}

/**
 * D-345: Detect a Postgres "column does not exist" error (code 42703). The
 * attribution detail columns (utm_source / utm_medium / utm_campaign / referrer /
 * landing) require manual Neon DDL — push:true silently skips ALTER TABLE (see
 * customer-inquiries collection comment). If a column is missing on a given deploy,
 * we must never lose the lead, so we retry the create with core fields only.
 */
function isMissingColumnError(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code
  if (code === '42703') return true
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase()
  return msg.includes('column') && (msg.includes('does not exist') || msg.includes('errormissingcolumn'))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, phone, size, productId, message, source,
            utmSource, utmMedium, utmCampaign, referrer, landing } = body

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    // Basic phone number validation
    const phoneRegex = /^[0-9+\-\s()]{7,20}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    // D-320: products use numeric ids, but the storefront form sends productId as a
    // STRING (String(product.id)). Passing a string to the numeric `product`
    // relationship made payload.create throw (HTTP 500), so every product-page lead
    // failed. Coerce to a number; fail-soft to undefined on a bad/empty id so the
    // lead is still saved (without the product link) instead of erroring out.
    const numericProductId =
      productId !== undefined && productId !== null && String(productId).trim() !== '' && !Number.isNaN(Number(productId))
        ? Number(productId)
        : undefined

    const payload = await getPayload()

    // Core lead fields — always saved. Splitting these from the optional
    // attribution detail lets us fail-soft if a detail column isn't migrated yet.
    const coreData = {
      name,
      phone,
      size: size || undefined,
      product: numericProductId,
      message: message || undefined,
      source: normalizeInquirySource(source),
      status: 'new' as const,
    }

    // D-251/D-345: source-detail — store only when present (null = unknown, not fake)
    const detailData = {
      ...(sanitizeDetail(utmSource) !== null ? { utmSource: sanitizeDetail(utmSource) } : {}),
      ...(sanitizeDetail(utmMedium) !== null ? { utmMedium: sanitizeDetail(utmMedium) } : {}),
      ...(sanitizeDetail(utmCampaign) !== null ? { utmCampaign: sanitizeDetail(utmCampaign) } : {}),
      ...(sanitizeDetail(referrer) !== null ? { referrer: sanitizeDetail(referrer) } : {}),
      // D-345: landing/submit path (path-only — no query string, no PII)
      ...(sanitizeDetail(landing) !== null ? { landing: sanitizeDetail(landing) } : {}),
    }

    let created
    try {
      created = await payload.create({
        collection: 'customer-inquiries',
        data: { ...coreData, ...detailData },
      })
    } catch (err) {
      // D-345: never lose a lead because an attribution column isn't migrated yet.
      // Retry with core fields only when (and only when) a column is missing.
      if (isMissingColumnError(err) && Object.keys(detailData).length > 0) {
        console.warn('[inquiries D-345] attribution column missing — saving lead without source-detail fields')
        created = await payload.create({ collection: 'customer-inquiries', data: coreData })
      } else {
        throw err
      }
    }

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
