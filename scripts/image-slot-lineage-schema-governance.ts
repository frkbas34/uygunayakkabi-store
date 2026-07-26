import assert from 'node:assert'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

function read(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

const sql = read('scripts/sql/image-slot-lineage-schema-v1.sql')
const executableSql = sql.replace(/^\s*--.*$/gm, '')
const apply = read('scripts/image-slot-lineage-schema-apply.ts')
const applyFixture = read('scripts/image-slot-lineage-schema-apply.test.ts')
const plan = read('project-control/IMAGE_SLOT_LINEAGE_SCHEMA_MIGRATION_PLAN_V1.md')
const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }

const SUPERSEDED_SQL_SHA256 = '45963EF7FF50CDB99F3ED95BFE2E1F86D456CA99C95A7A5B325B47D3200518AC'
const CURRENT_SQL_SHA256 = '06191F196144259FB1992245B29849AA9353645E2160A03FC13B2F3F654961E2'
const actualSqlHash = createHash('sha256').update(sql).digest('hex').toUpperCase()

assert.strictEqual(actualSqlHash, CURRENT_SQL_SHA256, 'current lineage SQL hash must match governance')
assert.notStrictEqual(actualSqlHash, SUPERSEDED_SQL_SHA256, 'superseded transaction-owning SQL must not be current')

for (const declaration of [
  'generation_contract_version varchar',
  'active_attempt_id varchar',
  'generation_attempts jsonb',
  'generation_lineage_contract_version varchar',
  'generation_lineage_job_id varchar',
  'generation_lineage_attempt_id varchar',
  'generation_lineage_slot_id varchar',
]) {
  assertIncludes(sql, declaration, 'lineage SQL')
}

assertIncludes(sql, 'ALTER TABLE public.image_generation_jobs', 'job expansion')
assertIncludes(sql, 'ALTER TABLE public.media', 'Media expansion')
assertIncludes(sql, "SET LOCAL lock_timeout = '5s'", 'bounded lock wait')
assertIncludes(sql, "SET LOCAL statement_timeout = '30s'", 'bounded statement execution')
assertIncludes(sql, 'ADD COLUMN IF NOT EXISTS', 'idempotent additive DDL')
assert.strictEqual(
  (executableSql.match(/\bADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\b/gi) ?? []).length,
  7,
  'lineage SQL must contain exactly seven additive column operations',
)

for (const transactionControl of [/\bBEGIN\b/i, /\bCOMMIT\b/i, /\bROLLBACK\b/i]) {
  assert.ok(!transactionControl.test(executableSql), `lineage SQL transaction body must not match ${transactionControl}`)
}

for (const forbidden of [
  /\bDROP\b/i,
  /\bDELETE\b/i,
  /\bTRUNCATE\b/i,
  /\bUPDATE\b/i,
  /\bNOT\s+NULL\b/i,
  /\bDEFAULT\b/i,
  /\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/i,
  /\bFOREIGN\s+KEY\b/i,
  /\bREFERENCES\b/i,
]) {
  assert.ok(!forbidden.test(executableSql), `lineage SQL must not match ${forbidden}`)
}

assertIncludes(apply, '--confirm-apply-image-slot-lineage-schema-v1', 'explicit apply confirmation')
assertIncludes(apply, 'Dry-run only: no database connection opened and no DDL executed.', 'no-connect dry run')
assertIncludes(apply, `EXPECTED_SQL_SHA256 = '${CURRENT_SQL_SHA256.toLowerCase()}'`, 'current SQL hash pin')
assertIncludes(apply, `SUPERSEDED_SQL_SHA256 = '${SUPERSEDED_SQL_SHA256.toLowerCase()}'`, 'superseded SQL history')
assertIncludes(apply, "TARGET_DATABASE_URI_ENV = 'IMAGE_SLOT_LINEAGE_DATABASE_URI'", 'dedicated target URI')
assertIncludes(apply, 'Blocked by SQL hash mismatch', 'pre-apply hash refusal')
assertIncludes(apply, "client.query('BEGIN')", 'caller-owned transaction begin')
assertIncludes(apply, "client.query('COMMIT')", 'caller-owned success commit')
assertIncludes(apply, "client.query('ROLLBACK')", 'caller-owned failure rollback')
assert.strictEqual((apply.match(/client\.query\('BEGIN'\)/g) ?? []).length, 1, 'helper must open exactly one transaction')
assert.strictEqual((apply.match(/client\.query\('COMMIT'\)/g) ?? []).length, 1, 'helper must have exactly one commit path')
assert.strictEqual((apply.match(/client\.query\('ROLLBACK'\)/g) ?? []).length, 1, 'helper must have exactly one rollback path')
assert.ok(
  apply.indexOf("client.query('BEGIN')") < apply.indexOf('client.query(sql)') &&
    apply.indexOf('client.query(sql)') < apply.indexOf('const after = await readSchema(client)') &&
    apply.indexOf('const after = await readSchema(client)') < apply.indexOf("client.query('COMMIT')"),
  'helper must begin, execute exact SQL, verify, then commit in that order',
)
assert.ok(!apply.includes('loadEnvFiles'), 'helper must not load application env files')
assert.ok(!apply.includes('connectionString: databaseUri'), 'helper must not apply through DATABASE_URI')
assertIncludes(apply, "process.env.DATABASE_URI?.trim()", 'application URI inequality check')
assertIncludes(apply, 'resolves to the configured application database', 'same-target refusal')
assertIncludes(apply, '(value redacted)', 'target credential redaction')
assertIncludes(apply, 'redactErrorMessage(error)', 'error credential redaction')
const applyTargetValidation = apply.indexOf('const targetDatabaseUri = process.env[TARGET_DATABASE_URI_ENV]?.trim()')
const applyTargetInequality = apply.indexOf('assertDedicatedTarget(targetDatabaseUri, applicationDatabaseUri)')
const applyHashValidation = apply.lastIndexOf('verifySqlHash(sql)')
const applyConnection = apply.indexOf('await client.connect()')
assert.ok(
  applyTargetValidation >= 0 &&
    applyTargetValidation < applyTargetInequality &&
    applyTargetInequality < applyHashValidation &&
    applyHashValidation < applyConnection,
  'confirmed apply must validate dedicated target, enforce application-target inequality, validate SQL hash, then connect',
)
assertIncludes(apply, 'information_schema.columns', 'metadata verification')
assertIncludes(apply, 'Manual schema review is required; no DDL was run.', 'incompatible-schema refusal')
assertIncludes(apply, "actual.is_nullable !== 'YES'", 'nullable verification')
assertIncludes(apply, 'actual.column_default !== null', 'default-free verification')

assertIncludes(applyFixture, 'testStatementFailureRollsBack', 'deliberate statement-failure fixture')
assertIncludes(applyFixture, "['BEGIN', deliberateFailureSql, 'ROLLBACK']", 'failure rollback order')
assertIncludes(applyFixture, "!calls.includes('COMMIT')", 'failure cannot commit')
assertIncludes(applyFixture, "['BEGIN', sql, 'VERIFY_SCHEMA', 'COMMIT']", 'success commit order')
assertIncludes(applyFixture, 'testApplicationTargetEqualityIsRejected', 'application-target equality fixture')

assertIncludes(plan, 'DEPLOYMENT_BLOCKED_PENDING_PRODUCTION_EXPANSION_APPROVAL', 'deployment blocker')
assertIncludes(plan, 'SCHEMA_HARNESS_REHEARSAL_PASS', 'non-production rehearsal result')
assertIncludes(plan, 'EXPAND SCHEMA FIRST', 'zero-downtime principle')
assertIncludes(plan, 'OPERATOR_VERIFICATION_REQUIRED', 'external-state boundary')
assertIncludes(plan, 'PAYLOAD_DB_PUSH=false', 'schema-push guard')
assertIncludes(plan, 'GUARDED APPLY PROCESS OWNS THE TRANSACTION', 'single transaction owner')
assertIncludes(plan, CURRENT_SQL_SHA256, 'current SQL hash evidence')
assertIncludes(plan, SUPERSEDED_SQL_SHA256, 'superseded SQL hash evidence')

assertIncludes(
  packageJson.scripts?.['test:image-slot-lineage-schema'] ?? '',
  'tsx scripts/image-slot-lineage-schema-governance.ts',
  'schema governance package script',
)
assertIncludes(
  packageJson.scripts?.['db:image-slot-lineage:apply'] ?? '',
  'tsx scripts/image-slot-lineage-schema-apply.ts',
  'schema apply package script',
)
assertIncludes(
  packageJson.scripts?.['test:image-slot-lineage-helper'] ?? '',
  'tsx scripts/image-slot-lineage-schema-apply.test.ts',
  'helper transaction fixture package script',
)
assertIncludes(
  packageJson.scripts?.['test:safe'] ?? '',
  'npm run test:image-slot-lineage-helper',
  'safe suite helper transaction fixture',
)

console.log('imageSlotLineageSchemaGovernance: additive guarded schema plan - ALL OK')
