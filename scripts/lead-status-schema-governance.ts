import assert from 'node:assert'
import { readFileSync } from 'node:fs'

function read(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

const leadDesk = read('src/lib/leadDesk.ts')
const collection = read('src/collections/CustomerInquiries.ts')
const checkScript = read('scripts/lead-status-schema-check.ts')
const applyScript = read('scripts/lead-status-schema-apply.ts')
const sqlPlan = read('scripts/sql/d490-lead-status-enum.sql')

assert.ok(!/ALTER TYPE/i.test(leadDesk), 'lead-status runtime must not expose or issue enum DDL')
assertIncludes(leadDesk, 'smoke:lead-status-schema:read -- --confirm-read-only', 'lead-status enum-drift response')
assertIncludes(leadDesk, 'Do not run schema changes from chat.', 'lead-status enum-drift refusal')
assert.ok(!/ALTER TYPE/i.test(collection), 'CustomerInquiries runtime schema comments must not embed executable DDL')

for (const value of ['new', 'contacted', 'follow_up', 'closed_won', 'closed_lost', 'spam', 'completed']) {
  assertIncludes(collection, `value: '${value}'`, 'CustomerInquiries status contract')
  assertIncludes(checkScript, `'${value}'`, 'D-490 metadata contract')
}

assertIncludes(checkScript, '--confirm-read-only', 'D-490 preflight confirmation')
assertIncludes(checkScript, 'READ_ONLY', 'D-490 preflight READ_ONLY guard')
assertIncludes(checkScript, 'mutationRequested', 'D-490 preflight mutation guard')
assertIncludes(checkScript, 'Refusing to connect', 'D-490 preflight confirmation refusal')
assertIncludes(checkScript, 'Refusing mutation flags', 'D-490 preflight mutation refusal')
assertIncludes(checkScript, 'pg_enum', 'D-490 enum metadata inspection')
assertIncludes(checkScript, 'does not run DDL', 'D-490 preflight no-DDL promise')

assertIncludes(applyScript, '--confirm-apply-d490-lead-status-enum', 'D-490 apply confirmation')
assertIncludes(applyScript, 'Dry-run only: no database connection opened and no DDL executed.', 'D-490 dry-run guard')
assertIncludes(applyScript, 'BASELINE_VALUES', 'D-490 baseline compatibility guard')
assertIncludes(applyScript, 'Blocked: public.', 'D-490 incompatible enum refusal')

for (const value of ['follow_up', 'closed_won', 'closed_lost', 'spam']) {
  assertIncludes(sqlPlan, `ADD VALUE IF NOT EXISTS '${value}'`, 'D-490 enum SQL plan')
}

console.log('leadStatusSchemaGovernance: guarded lead-status enum workflow - ALL OK')
