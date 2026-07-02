import assert from 'node:assert'
import { evaluateTelegramDmAccess, parseAllowedUserIds, DM_REFUSAL_MESSAGE } from './telegramAccess'

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

check('non-allowlisted private user is DENIED (no handler may run)', () => {
  const v = evaluateTelegramDmAccess({ senderId: '999999', allowedRaw: '111111,222222' })
  assert.strictEqual(v.allowed, false)
  assert.strictEqual(v.reason, 'denied')
})

check('allowlisted private user is allowed', () => {
  const v = evaluateTelegramDmAccess({ senderId: '222222', allowedRaw: '111111,222222' })
  assert.strictEqual(v.allowed, true)
  assert.strictEqual(v.reason, 'allowlisted')
})

check('empty allowlist keeps legacy-open behavior but flags it for a loud warning', () => {
  for (const raw of ['', '   ', null, undefined, ',,\n,']) {
    const v = evaluateTelegramDmAccess({ senderId: '999999', allowedRaw: raw as string | null | undefined })
    assert.strictEqual(v.allowed, true, `raw=${JSON.stringify(raw)}`)
    assert.strictEqual(v.reason, 'open-allowlist')
  }
})

check('missing/empty sender id is denied when an allowlist exists', () => {
  for (const sender of ['', '   ', null, undefined]) {
    const v = evaluateTelegramDmAccess({ senderId: sender as string | null | undefined, allowedRaw: '111111' })
    assert.strictEqual(v.allowed, false, `sender=${JSON.stringify(sender)}`)
  }
})

check('allowlist parsing mirrors the group gate: commas, newlines, whitespace', () => {
  assert.deepStrictEqual(parseAllowedUserIds('111, 222\n333 ,\n\n444'), ['111', '222', '333', '444'])
  assert.deepStrictEqual(parseAllowedUserIds(''), [])
  assert.deepStrictEqual(parseAllowedUserIds(undefined), [])
})

check('partial id strings do not match (no substring allowlisting)', () => {
  const v = evaluateTelegramDmAccess({ senderId: '11', allowedRaw: '111111' })
  assert.strictEqual(v.allowed, false)
})

check('refusal message is a polite, non-empty operator notice', () => {
  assert.ok(DM_REFUSAL_MESSAGE.length > 10)
  assert.ok(DM_REFUSAL_MESSAGE.includes('yetkili operatörler'))
})

console.log(`\ntelegramAccess: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
