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
 * D-350: PII-safe error logging. Production lead failures must be debuggable WITHOUT
 * ever logging name, phone, or the request body. We redact any run of 7+ digits
 * (phone-like) defensively, because some Postgres errors echo row values in their
 * message/detail (e.g. unique-violation "Key (phone)=(...)").
 */
function redactPII(s: string): string {
  return s.replace(/\d{7,}/g, '[redacted]')
}

/**
 * D-350: Reduce any thrown value to a sanitized {name, code, message} — class + pg
 * error code + a short, PII-redacted message. The pg code may sit on a wrapped
 * `cause` (Payload/Drizzle), so check there too. Never returns the raw error object.
 */
function sanitizeError(err: unknown): { name: string; code: string; message: string } {
  const e = err as any
  const name = typeof e?.name === 'string' ? e.name : typeof err
  const code = e?.code ?? e?.cause?.code
  const codeStr = code === undefined || code === null ? 'n/a' : String(code)
  const rawMsg = typeof e?.message === 'string' ? e.message : ''
  return { name: String(name), code: codeStr, message: redactPII(rawMsg).slice(0, 200) }
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

    // ── D-350: Staged, revenue-safe create ────────────────────────────────────
    // Lead capture must survive BOTH un-migrated attribution columns AND a failing
    // product relation (D-349 only handled the former — its core retry still carried
    // `product`, so a relation/core failure still 500'd). We try progressively
    // smaller payloads and accept the first that saves. Each failed attempt rolls
    // back (customer-inquiries has no hooks + create is transactional → no duplicate
    // row). Attribution and product support are preserved — they're just the first,
    // richest stage, not a hard requirement for capturing the lead.

    // Stage 1 fields: name/phone/size/product/message/source/status.
    const coreWithProduct = {
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

    // Minimal stage: name + phone only — NO product relation, NO attribution columns.
    // Preserve the product/size context as a plain-text note (numeric id + size are
    // not PII) so the operator still knows what the lead was about if the relation
    // could not be written.
    const refParts: string[] = []
    if (numericProductId !== undefined) refParts.push(`ürün #${numericProductId}`)
    if (typeof size === 'string' && size.trim()) refParts.push(`beden ${size.trim().slice(0, 20)}`)
    const minimalNote = refParts.length > 0
      ? `[oto-kayıt] ${refParts.join(', ')} — ürün ilişkisi/öznitelik kaydedilemedi`
      : (message || undefined)
    const minimalData = {
      name,
      phone,
      source: normalizeInquirySource(source),
      status: 'new' as const,
      ...(minimalNote ? { message: minimalNote } : {}),
    }

    // Ordered stages. Skip the redundant core stage when no attribution was sent
    // (stage 1 already equals core+product in that case).
    const stages: Array<{ label: string; data: Record<string, unknown> }> = [
      { label: 'full', data: { ...coreWithProduct, ...detailData } },
    ]
    if (Object.keys(detailData).length > 0) {
      stages.push({ label: 'core+product', data: coreWithProduct })
    }
    stages.push({ label: 'minimal', data: minimalData })

    let created: any = null
    let usedStage = ''
    let lastErr: unknown = null
    for (const stage of stages) {
      try {
        created = await payload.create({ collection: 'customer-inquiries', data: stage.data as any })
        usedStage = stage.label
        break
      } catch (err) {
        lastErr = err
        const s = sanitizeError(err)
        console.warn(`[inquiries D-350] create failed at stage=${stage.label} err=${s.name} code=${s.code} msg="${s.message}"`)
      }
    }

    if (!created) {
      // Every stage failed — the base table itself is unwritable (not optional drift).
      const s = sanitizeError(lastErr)
      console.error(`[inquiries D-350] ALL create stages failed err=${s.name} code=${s.code} msg="${s.message}"`)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (usedStage !== 'full') {
      console.warn(`[inquiries D-350] lead saved via degraded stage=${usedStage} — product/attribution may be partial; investigate schema drift`)
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
    // D-350: sanitized only — never log the raw error object (pg .detail can echo
    // row values incl. phone). This path now only catches pre-create failures
    // (body parse / getPayload); create-stage failures are handled+logged above.
    const s = sanitizeError(error)
    console.error(`[inquiries D-350] request failed before create err=${s.name} code=${s.code} msg="${s.message}"`)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
