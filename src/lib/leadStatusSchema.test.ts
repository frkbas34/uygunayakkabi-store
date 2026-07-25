import assert from 'node:assert'
import { applyLeadStatus } from './leadDesk'

async function main(): Promise<void> {
  let updateCalls = 0
  let eventCalls = 0
  const payload = {
    async findByID() {
      return { id: 501, status: 'new' }
    },
    async update() {
      updateCalls += 1
      throw new Error('invalid input value for enum enum_customer_inquiries_status: "closed_won"')
    },
    async create() {
      eventCalls += 1
      throw new Error('The status write must not create an audit event.')
    },
  }

  const result = await applyLeadStatus(payload, 501, 'won')

  assert.strictEqual(result.ok, false)
  assert.strictEqual(result.idempotent, false)
  assert.strictEqual(result.toStatus, 'closed_won')
  assert.strictEqual(updateCalls, 1)
  assert.strictEqual(eventCalls, 0)
  assert.ok(result.message.includes('npm run smoke:lead-status-schema:read -- --confirm-read-only'))
  assert.ok(result.message.includes('No lead change was made.'))
  assert.ok(!/ALTER TYPE/i.test(result.message))
  assert.ok(!/CREATE TABLE/i.test(result.message))

  console.log('leadStatusSchema: guarded enum-drift response - ALL OK')
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
