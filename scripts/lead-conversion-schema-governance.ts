import assert from 'node:assert'
import { readFileSync } from 'node:fs'

function read(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

const leadDesk = read('src/lib/leadDesk.ts')
const collection = read('src/collections/Orders.ts')
const checkScript = read('scripts/lead-conversion-schema-check.ts')
const applyScript = read('scripts/lead-conversion-schema-apply.ts')
const sqlPlan = read('scripts/sql/d491-order-lead-relationship.sql')

assert.ok(!/ALTER TABLE/i.test(leadDesk), 'lead-conversion runtime must not expose or issue relationship DDL')
assert.ok(!/ALTER TABLE/i.test(collection), 'Orders runtime schema comments must not embed executable DDL')
assertIncludes(leadDesk, 'related_inquiry_schema_missing', 'lead-conversion schema-drift result')
assertIncludes(leadDesk, 'smoke:lead-conversion-schema:read -- --confirm-read-only', 'lead-conversion schema-drift response')
assertIncludes(leadDesk, 'No order, lead-status, or audit record was written.', 'lead-conversion no-write guarantee')
assertIncludes(leadDesk, 'Do not run schema changes from chat.', 'lead-conversion schema-drift refusal')

assertIncludes(checkScript, '--confirm-read-only', 'D-491 preflight confirmation')
assertIncludes(checkScript, 'READ_ONLY', 'D-491 preflight READ_ONLY guard')
assertIncludes(checkScript, 'mutationRequested', 'D-491 preflight mutation guard')
assertIncludes(checkScript, 'information_schema', 'D-491 column metadata inspection')
assertIncludes(checkScript, 'pg_constraint', 'D-491 foreign-key metadata inspection')
assertIncludes(checkScript, 'does not run DDL', 'D-491 preflight no-DDL promise')

assertIncludes(applyScript, '--confirm-apply-d491-order-lead-relationship', 'D-491 apply confirmation')
assertIncludes(applyScript, 'Dry-run only: no database connection opened and no DDL executed.', 'D-491 dry-run guard')
assertIncludes(applyScript, 'Manual schema review is required; no DDL was run.', 'D-491 incompatible-schema refusal')
assertIncludes(sqlPlan, 'ALTER TABLE public.orders', 'D-491 relationship SQL plan')
assertIncludes(sqlPlan, 'related_inquiry_id integer', 'D-491 relationship column')
assertIncludes(sqlPlan, 'REFERENCES public.customer_inquiries(id) ON DELETE SET NULL', 'D-491 relationship foreign key')

console.log('leadConversionSchemaGovernance: guarded order-to-lead relationship workflow - ALL OK')
