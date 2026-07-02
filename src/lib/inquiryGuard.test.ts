import assert from 'node:assert'
import {
  HONEYPOT_FIELD,
  isHoneypotTripped,
  createInquiryRateLimiter,
  clientIpKey,
  normalizePhoneKey,
  duplicateWindowStartISO,
  buildDuplicateWhere,
  RATE_LIMIT_WINDOW_MS,
  MAX_PER_IP_PER_WINDOW,
  MAX_PER_PHONE_PER_WINDOW,
  RATE_LIMIT_MESSAGE_TR,
  DUPLICATE_WINDOW_MS,
} from './inquiryGuard'

let passed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

// ── Honeypot ─────────────────────────────────────────────────────────────────

check('honeypot: filled field trips (bot submission must NOT create a lead)', () => {
  assert.strictEqual(isHoneypotTripped('Acme Corp'), true)
  assert.strictEqual(isHoneypotTripped('x'), true)
})

check('honeypot: empty/whitespace/absent values do not trip (humans pass)', () => {
  assert.strictEqual(isHoneypotTripped(''), false)
  assert.strictEqual(isHoneypotTripped('   '), false)
  assert.strictEqual(isHoneypotTripped(undefined), false)
  assert.strictEqual(isHoneypotTripped(null), false)
  assert.strictEqual(isHoneypotTripped(42), false)
})

check('honeypot: field name is the hidden "company" input the form renders', () => {
  assert.strictEqual(HONEYPOT_FIELD, 'company')
})

// ── Rate limiter (injectable clock — deterministic) ──────────────────────────

check('rate limit: requests over the per-IP budget are rejected with retry-after', () => {
  const limiter = createInquiryRateLimiter()
  const t0 = 1_000_000
  for (let i = 0; i < MAX_PER_IP_PER_WINDOW; i++) {
    // distinct phones so only the IP budget is exercised
    const v = limiter.check({ ipKey: '1.2.3.4', phoneKey: `555000${i}`, nowMs: t0 + i })
    assert.strictEqual(v.allowed, true, `request ${i} should pass`)
  }
  const blocked = limiter.check({ ipKey: '1.2.3.4', phoneKey: '5559999', nowMs: t0 + 100 })
  assert.strictEqual(blocked.allowed, false)
  if (!blocked.allowed) {
    assert.strictEqual(blocked.scope, 'ip')
    assert.ok(blocked.retryAfterSeconds >= 1)
  }
})

check('rate limit: repeated phone over budget is rejected even from fresh IPs', () => {
  const limiter = createInquiryRateLimiter()
  const t0 = 2_000_000
  for (let i = 0; i < MAX_PER_PHONE_PER_WINDOW; i++) {
    const v = limiter.check({ ipKey: `10.0.0.${i}`, phoneKey: '05551234567', nowMs: t0 + i })
    assert.strictEqual(v.allowed, true, `request ${i} should pass`)
  }
  const blocked = limiter.check({ ipKey: '10.0.9.9', phoneKey: '05551234567', nowMs: t0 + 100 })
  assert.strictEqual(blocked.allowed, false)
  if (!blocked.allowed) assert.strictEqual(blocked.scope, 'phone')
})

check('rate limit: budget frees up once the window slides past old hits', () => {
  const limiter = createInquiryRateLimiter()
  const t0 = 3_000_000
  for (let i = 0; i < MAX_PER_PHONE_PER_WINDOW; i++) {
    limiter.check({ ipKey: '2.2.2.2', phoneKey: '05550000000', nowMs: t0 + i })
  }
  assert.strictEqual(limiter.check({ ipKey: '2.2.2.2', phoneKey: '05550000000', nowMs: t0 + 1000 }).allowed, false)
  const later = t0 + RATE_LIMIT_WINDOW_MS + 1000
  assert.strictEqual(limiter.check({ ipKey: '2.2.2.2', phoneKey: '05550000000', nowMs: later }).allowed, true)
})

check('rate limit: blocked attempts do not extend the ban (no self-extending lockout)', () => {
  const limiter = createInquiryRateLimiter()
  const t0 = 4_000_000
  for (let i = 0; i < MAX_PER_PHONE_PER_WINDOW; i++) {
    limiter.check({ ipKey: '3.3.3.3', phoneKey: '05551112233', nowMs: t0 + i })
  }
  // hammer while blocked — these must not register as hits
  for (let i = 0; i < 20; i++) {
    limiter.check({ ipKey: '9.9.9.9', phoneKey: '05551112233', nowMs: t0 + 5000 + i })
  }
  const later = t0 + RATE_LIMIT_WINDOW_MS + 1000
  assert.strictEqual(limiter.check({ ipKey: '3.3.3.3', phoneKey: '05551112233', nowMs: later }).allowed, true)
})

check('phone key normalization: formatting variants collapse to one bucket', () => {
  assert.strictEqual(normalizePhoneKey('0555 555 55 55'), '05555555555')
  assert.strictEqual(normalizePhoneKey('+90 (555) 555-55-55'), '905555555555')
  assert.strictEqual(normalizePhoneKey(undefined), '')
})

check('client IP key: x-forwarded-for first hop, x-real-ip fallback, unknown last', () => {
  assert.strictEqual(clientIpKey((h) => (h === 'x-forwarded-for' ? '7.7.7.7, 10.0.0.1' : null)), '7.7.7.7')
  assert.strictEqual(clientIpKey((h) => (h === 'x-real-ip' ? '8.8.8.8' : null)), '8.8.8.8')
  assert.strictEqual(clientIpKey(() => null), 'unknown')
})

check('rate-limit user copy is Turkish and mentions the WhatsApp fallback', () => {
  assert.ok(RATE_LIMIT_MESSAGE_TR.includes('WhatsApp'))
  assert.ok(RATE_LIMIT_MESSAGE_TR.includes('tekrar deneyin'))
})

// ── Duplicate collapse ────────────────────────────────────────────────────────

check('duplicate window: cutoff ISO is exactly windowMs before now', () => {
  const nowMs = Date.UTC(2026, 0, 15, 12, 0, 0)
  assert.strictEqual(duplicateWindowStartISO(nowMs, 10 * 60 * 1000), new Date(nowMs - 600000).toISOString())
  assert.strictEqual(DUPLICATE_WINDOW_MS, 10 * 60 * 1000)
})

check('duplicate query: same phone + same product inside the window, exact shape', () => {
  const nowMs = Date.UTC(2026, 0, 15, 12, 0, 0)
  const where = buildDuplicateWhere({ phone: '05551234567', productId: 359, nowMs }) as {
    and: Array<Record<string, unknown>>
  }
  assert.strictEqual(where.and.length, 3)
  assert.deepStrictEqual(where.and[0], { phone: { equals: '05551234567' } })
  assert.deepStrictEqual(where.and[1], { product: { equals: 359 } })
  assert.deepStrictEqual(where.and[2], {
    createdAt: { greater_than_equal: new Date(nowMs - DUPLICATE_WINDOW_MS).toISOString() },
  })
})

console.log(`\ninquiryGuard: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
