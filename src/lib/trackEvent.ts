/**
 * trackEvent.ts — D-316A: internal event-tracking foundation.
 *
 * This is a SAFE, INTERNAL abstraction only. It makes NO external network calls
 * and loads NO external scripts. By default it is a silent no-op in production.
 * In development it can optionally console.debug events when a local debug flag is
 * set. It never throws and never blocks navigation or form submission.
 *
 * D-316B: attach GA4/Meta adapters here after explicit approval and consent decision.
 * (No GA4 / Meta Pixel / TikTok / Google Ads tag is wired in this file by design.)
 */

import { getStoredAttribution } from './attribution'

// ── Event names ───────────────────────────────────────────────────────────────
export const TRACK_EVENTS = {
  VIEW_HOME: 'view_home',
  VIEW_PRODUCT: 'view_product',
  CLICK_WHATSAPP_HOME: 'click_whatsapp_home',
  CLICK_WHATSAPP_PRODUCT: 'click_whatsapp_product',
  CLICK_WHATSAPP_FOOTER: 'click_whatsapp_footer',
  CLICK_CATEGORY_TILE: 'click_category_tile',
  CLICK_NEW_ARRIVALS: 'click_new_arrivals',
  CLICK_EDITORIAL_CTA: 'click_editorial_cta',
  CLICK_SOCIAL_PROOF_CTA: 'click_social_proof_cta',
  SUBMIT_LEAD_FORM: 'submit_lead_form',
} as const

export type TrackEventName = (typeof TRACK_EVENTS)[keyof typeof TRACK_EVENTS]

// ── Payload shape (all optional; NO customer PII allowed) ─────────────────────
export type TrackPayload = {
  productId?: string | number | null
  productSlug?: string | null
  productName?: string | null
  category?: string | null
  ctaLocation?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  referrer?: string | null
  pagePath?: string | null
}

// PII guard — defensively drop any field whose key looks like customer PII.
const PII_HINTS = ['name', 'phone', 'email', 'tel', 'address']
function isPiiKey(key: string): boolean {
  const k = key.toLowerCase()
  // allow our explicit "productName" field — it is a product label, not customer PII
  if (k === 'productname') return false
  return PII_HINTS.some((h) => k.includes(h))
}

// Debug logging is OFF unless explicitly enabled (env or localStorage). Never logs PII.
function debugEnabled(): boolean {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_TRACK_DEBUG === '1') return true
    if (typeof window !== 'undefined' && window.localStorage.getItem('uy_track_debug') === '1') return true
  } catch {
    /* ignore */
  }
  return false
}

/**
 * Record an internal event. Safe by design:
 *   - never throws (wrapped in try/catch)
 *   - no external calls / scripts
 *   - merges current first-touch attribution (D-315) without duplicating logic
 *   - strips any accidental PII keys
 *   - no-op in production unless a future D-316B adapter is added below
 */
export function trackEvent(name: TrackEventName, payload: TrackPayload = {}): void {
  try {
    const attr = typeof window !== 'undefined' ? getStoredAttribution() : {}
    const enriched: Record<string, unknown> = {
      ...payload,
      pagePath: payload.pagePath ?? (typeof window !== 'undefined' ? window.location.pathname.slice(0, 200) : null),
      utmSource: payload.utmSource ?? attr.utmSource ?? null,
      utmMedium: payload.utmMedium ?? attr.utmMedium ?? null,
      utmCampaign: payload.utmCampaign ?? attr.utmCampaign ?? null,
      referrer: payload.referrer ?? attr.referrer ?? null,
    }

    // Defensive PII strip — tracking payloads must never carry customer name/phone/etc.
    for (const key of Object.keys(enriched)) {
      if (isPiiKey(key)) delete enriched[key]
    }

    // ── D-316B: attach GA4 / Meta / etc. adapters HERE after explicit approval and
    //    consent/KVKK decision. For now there is intentionally no external dispatch. ──

    if (debugEnabled()) {
      // eslint-disable-next-line no-console
      console.debug('[track]', name, enriched)
    }
  } catch {
    /* never throw — tracking must not break UX */
  }
}
