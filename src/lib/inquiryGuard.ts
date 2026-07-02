/**
 * inquiryGuard.ts — Pre-traffic hardening: lead-form abuse protection.
 *
 * /api/inquiries previously accepted unlimited POSTs: no honeypot, no rate
 * limit, no duplicate collapse — a curl loop could flood CustomerInquiries and
 * the operator's Telegram alerts. This module holds the PURE decision logic
 * (injectable clock, in-memory store) so the route stays thin and everything
 * is unit-testable without a DB, network, or real timers.
 *
 * Scope/limits (documented, accepted):
 * - The rate limiter is per-serverless-instance memory → BEST-EFFORT. Vercel
 *   may run several instances; a determined attacker can exceed the global
 *   budget by roughly the instance count. It still kills naive curl/bot loops,
 *   which is the pre-ads threat model. No new dependency, no schema change.
 * - Duplicate collapse is DB-backed by the route (existing customer-inquiries
 *   collection, exact phone match) — this module only supplies the window
 *   arithmetic and the decision constants.
 */

// ── Honeypot ─────────────────────────────────────────────────────────────────
// The storefront form renders a visually-hidden "company" field that humans
// never see or fill. Bots that auto-fill every input trip it. The route
// answers with a normal-looking success WITHOUT creating a lead, so bots
// don't learn they were filtered.
export const HONEYPOT_FIELD = 'company'

export function isHoneypotTripped(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

// ── Rate limiting (sliding window, per-instance memory) ─────────────────────
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
export const MAX_PER_IP_PER_WINDOW = 10 // NAT/CGNAT-friendly; bots do hundreds
export const MAX_PER_PHONE_PER_WINDOW = 4

export const RATE_LIMIT_MESSAGE_TR =
  'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin ya da WhatsApp üzerinden bize yazın.'

/** Limiter key for a phone: digits only, so "0555 555 55 55" == "05555555555". */
export function normalizePhoneKey(phone: unknown): string {
  return typeof phone === 'string' ? phone.replace(/\D+/g, '') : ''
}

/**
 * Client IP for the limiter key from proxy headers (Vercel sets
 * x-forwarded-for). First hop only; falls back to 'unknown' — meaning all
 * unattributable traffic shares one bucket, which fails toward stricter.
 */
export function clientIpKey(getHeader: (name: string) => string | null): string {
  const fwd = getHeader('x-forwarded-for')
  if (fwd && fwd.trim()) return fwd.split(',')[0]!.trim()
  const real = getHeader('x-real-ip')
  if (real && real.trim()) return real.trim()
  return 'unknown'
}

export type RateLimitVerdict =
  | { allowed: true }
  | { allowed: false; scope: 'ip' | 'phone'; retryAfterSeconds: number }

export type InquiryRateLimiter = {
  check(input: { ipKey: string; phoneKey: string; nowMs?: number }): RateLimitVerdict
}

/**
 * Sliding-window limiter. `check` registers the hit only when allowed, so a
 * blocked burst does not extend its own ban. Old entries are pruned on every
 * call to bound memory (the store only ever holds keys seen inside the
 * current window).
 */
export function createInquiryRateLimiter(opts?: {
  windowMs?: number
  maxPerIp?: number
  maxPerPhone?: number
}): InquiryRateLimiter {
  const windowMs = opts?.windowMs ?? RATE_LIMIT_WINDOW_MS
  const maxPerIp = opts?.maxPerIp ?? MAX_PER_IP_PER_WINDOW
  const maxPerPhone = opts?.maxPerPhone ?? MAX_PER_PHONE_PER_WINDOW

  const hits = new Map<string, number[]>() // key → ascending hit timestamps

  const prune = (nowMs: number) => {
    const cutoff = nowMs - windowMs
    for (const [key, times] of hits) {
      const fresh = times.filter((t) => t > cutoff)
      if (fresh.length === 0) hits.delete(key)
      else hits.set(key, fresh)
    }
  }

  const countFor = (key: string, cutoff: number): number =>
    (hits.get(key) ?? []).filter((t) => t > cutoff).length

  const retryAfter = (key: string, nowMs: number): number => {
    const oldest = (hits.get(key) ?? [])[0]
    if (oldest === undefined) return Math.ceil(windowMs / 1000)
    return Math.max(1, Math.ceil((oldest + windowMs - nowMs) / 1000))
  }

  return {
    check({ ipKey, phoneKey, nowMs }): RateLimitVerdict {
      const now = nowMs ?? Date.now()
      prune(now)
      const cutoff = now - windowMs

      const ipBucket = `ip:${ipKey}`
      if (countFor(ipBucket, cutoff) >= maxPerIp) {
        return { allowed: false, scope: 'ip', retryAfterSeconds: retryAfter(ipBucket, now) }
      }
      const phoneBucket = phoneKey ? `ph:${phoneKey}` : ''
      if (phoneBucket && countFor(phoneBucket, cutoff) >= maxPerPhone) {
        return { allowed: false, scope: 'phone', retryAfterSeconds: retryAfter(phoneBucket, now) }
      }

      hits.set(ipBucket, [...(hits.get(ipBucket) ?? []), now])
      if (phoneBucket) hits.set(phoneBucket, [...(hits.get(phoneBucket) ?? []), now])
      return { allowed: true }
    },
  }
}

// ── Duplicate collapse (same phone + same product, short window) ────────────
export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

/** ISO cutoff for the route's createdAt >= … duplicate query. */
export function duplicateWindowStartISO(nowMs: number, windowMs: number = DUPLICATE_WINDOW_MS): string {
  return new Date(nowMs - windowMs).toISOString()
}

/**
 * Where-clause for the existing customer-inquiries collection (no schema
 * change). Exposed as a pure builder so tests can pin its exact shape.
 */
export function buildDuplicateWhere(input: {
  phone: string
  productId: number
  nowMs: number
  windowMs?: number
}): Record<string, unknown> {
  return {
    and: [
      { phone: { equals: input.phone } },
      { product: { equals: input.productId } },
      { createdAt: { greater_than_equal: duplicateWindowStartISO(input.nowMs, input.windowMs) } },
    ],
  }
}
