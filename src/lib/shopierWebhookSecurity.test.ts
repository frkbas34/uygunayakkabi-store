import assert from 'node:assert'
import crypto from 'node:crypto'
import { verifyShopierWebhookSignature } from './shopierWebhookSecurity'

let passed = 0

function check(name: string, run: () => void) {
  try {
    run()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (error) {
    console.error(`  not ok - ${name}`)
    throw error
  }
}

function sign(rawBody: string, token: string): string {
  return crypto.createHmac('sha256', token).update(rawBody).digest('hex')
}

check('fails closed when the webhook signing token is absent', () => {
  const result = verifyShopierWebhookSignature({
    rawBody: '{"id":"order_1"}',
    signature: sign('{"id":"order_1"}', 'token'),
  })

  assert.deepStrictEqual(result, {
    ok: false,
    reason: 'missing_configuration',
    tokenCount: 0,
  })
})

check('accepts an exact raw-body signature for any configured rotation token', () => {
  const rawBody = '{"id":"order_1","totalPrice":"999"}'
  const result = verifyShopierWebhookSignature({
    rawBody,
    signature: sign(rawBody, 'current-token'),
    tokenEnv: 'previous-token, current-token',
  })

  assert.deepStrictEqual(result, { ok: true, tokenCount: 2 })
})

check('rejects an altered raw body even when its JSON value is equivalent', () => {
  const signedBody = '{"id":"order_1","totalPrice":"999"}'
  const result = verifyShopierWebhookSignature({
    rawBody: '{ "id": "order_1", "totalPrice": "999" }',
    signature: sign(signedBody, 'token'),
    tokenEnv: 'token',
  })

  assert.strictEqual(result.ok, false)
  if (!result.ok) assert.strictEqual(result.reason, 'invalid_signature')
})

check('rejects missing, malformed, and wrong signatures without throwing', () => {
  const rawBody = '{"id":"order_1"}'
  const missing = verifyShopierWebhookSignature({ rawBody, signature: '', tokenEnv: 'token' })
  const malformed = verifyShopierWebhookSignature({ rawBody, signature: 'not-a-signature', tokenEnv: 'token' })
  const wrong = verifyShopierWebhookSignature({ rawBody, signature: sign(rawBody, 'wrong-token'), tokenEnv: 'token' })

  assert.strictEqual(missing.ok, false)
  assert.strictEqual(malformed.ok, false)
  assert.strictEqual(wrong.ok, false)
  if (!missing.ok) assert.strictEqual(missing.reason, 'missing_signature')
  if (!malformed.ok) assert.strictEqual(malformed.reason, 'malformed_signature')
  if (!wrong.ok) assert.strictEqual(wrong.reason, 'invalid_signature')
})

console.log(`shopierWebhookSecurity: ${passed} checks passed - ALL OK`)
