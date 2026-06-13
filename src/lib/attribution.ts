/**
 * attribution.ts — D-315: client-side first-touch attribution capture.
 *
 * Problem this solves: UTM params arrive on the LANDING url (often the homepage),
 * but leads are submitted on the product detail page. SPA/SSR navigation drops the
 * query string, so capturing UTM only from the submit-time URL loses attribution
 * for any visitor who lands on the homepage first.
 *
 * Fix: on first page load that carries UTM/referrer, persist it to sessionStorage
 * (first-touch wins). The lead form reads this as a fallback at submit time.
 *
 * Scope notes:
 *   - Client-only (guards on typeof window). No effect on SSR.
 *   - Stores ONLY the fields that already exist on the customer-inquiries
 *     collection: utmSource / utmMedium / utmCampaign / referrer. (utm_content /
 *     utm_term / landing are captured into the object for future use but are NOT
 *     sent to the API, because no DB columns exist for them — no schema change.)
 *   - sessionStorage = per-tab, cleared when the tab closes. No PII, hostname only.
 */

const KEY = 'uy_attr'

export type Attribution = {
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  utmTerm?: string | null
  referrer?: string | null
  landing?: string | null
  ts?: number
}

function clean(v: string | null): string | null {
  return v && v.trim() ? v.trim().toLowerCase().slice(0, 200) : null
}

function externalReferrer(): string | null {
  if (typeof document === 'undefined') return null
  try {
    const r = document.referrer
    if (!r) return null
    const u = new URL(r)
    if (u.hostname === window.location.hostname) return null
    return u.hostname.toLowerCase().slice(0, 200)
  } catch {
    return null
  }
}

/**
 * Capture first-touch attribution into sessionStorage. Idempotent and first-touch:
 * once a record exists it is never overwritten, and a load with no UTM/referrer
 * leaves the slot open so a later UTM landing in the same tab can still win.
 */
export function captureFirstTouch(): void {
  if (typeof window === 'undefined') return
  try {
    if (window.sessionStorage.getItem(KEY)) return
    const p = new URLSearchParams(window.location.search)
    const attr: Attribution = {
      utmSource: clean(p.get('utm_source')),
      utmMedium: clean(p.get('utm_medium')),
      utmCampaign: clean(p.get('utm_campaign')),
      utmContent: clean(p.get('utm_content')),
      utmTerm: clean(p.get('utm_term')),
      referrer: externalReferrer(),
      landing: window.location.pathname.slice(0, 200),
      ts: Date.now(),
    }
    const hasSignal = !!(attr.utmSource || attr.utmMedium || attr.utmCampaign || attr.utmContent || attr.utmTerm || attr.referrer)
    if (!hasSignal) return
    window.sessionStorage.setItem(KEY, JSON.stringify(attr))
  } catch {
    /* sessionStorage unavailable (private mode / blocked) — fail silently */
  }
}

/** Read stored first-touch attribution (empty object if none). */
export function getStoredAttribution(): Attribution {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) || '{}') as Attribution
  } catch {
    return {}
  }
}
