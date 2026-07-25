import assert from 'node:assert'

import { convertLeadToOrder } from './leadDesk'

async function main(): Promise<void> {
  let orderCreateCalls = 0
  let updateCalls = 0
  const payload = {
    async findByID() {
      return {
        id: 601,
        name: 'Schema Guard Lead',
        phone: '5550000601',
        status: 'new',
        createdAt: '2026-07-25T09:00:00.000Z',
        updatedAt: '2026-07-25T09:00:00.000Z',
      }
    },
    async find() {
      throw new Error('column orders.related_inquiry_id does not exist')
    },
    async create() {
      orderCreateCalls += 1
      throw new Error('Schema guard must prevent order and audit writes.')
    },
    async update() {
      updateCalls += 1
      throw new Error('Schema guard must prevent lead-status writes.')
    },
  }

  const result = await convertLeadToOrder(payload, 601)

  assert.strictEqual(result.ok, false)
  assert.strictEqual(result.idempotent, false)
  assert.strictEqual(result.refusalReason, 'related_inquiry_schema_missing')
  assert.strictEqual(orderCreateCalls, 0)
  assert.strictEqual(updateCalls, 0)
  assert.ok(result.message.includes('npm run smoke:lead-conversion-schema:read -- --confirm-read-only'))
  assert.ok(result.message.includes('No order, lead-status, or audit record was written.'))
  assert.ok(!/ALTER TABLE/i.test(result.message))
  assert.ok(!/CREATE TABLE/i.test(result.message))

  console.log('leadConversionSchema: guarded relationship-drift response - ALL OK')
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
