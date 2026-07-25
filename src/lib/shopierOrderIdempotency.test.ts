import assert from 'node:assert/strict'

import { isPostgresUniqueViolation } from './shopierOrderIdempotency'

assert.equal(isPostgresUniqueViolation({ code: '23505' }), true)
assert.equal(isPostgresUniqueViolation({ cause: { code: '23505' } }), true)
assert.equal(isPostgresUniqueViolation(new Error('duplicate key value violates unique constraint')), true)
assert.equal(isPostgresUniqueViolation({ code: '22001', message: 'value too long' }), false)
assert.equal(isPostgresUniqueViolation(undefined), false)

console.log('shopierOrderIdempotency: ALL OK')
