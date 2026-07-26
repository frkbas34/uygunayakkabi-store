import assert from 'node:assert'
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
const plan = read('project-control/IMAGE_SLOT_LINEAGE_SCHEMA_MIGRATION_PLAN_V1.md')
const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }

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
assertIncludes(sql, 'ADD COLUMN IF NOT EXISTS', 'idempotent additive DDL')

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
assertIncludes(apply, 'information_schema.columns', 'metadata verification')
assertIncludes(apply, 'Manual schema review is required; no DDL was run.', 'incompatible-schema refusal')
assertIncludes(apply, "actual.is_nullable !== 'YES'", 'nullable verification')
assertIncludes(apply, 'actual.column_default !== null', 'default-free verification')

assertIncludes(plan, 'DEPLOYMENT_BLOCKED_PENDING_REVIEWED_SCHEMA_MIGRATION', 'deployment blocker')
assertIncludes(plan, 'NON_PRODUCTION_DATABASE_REQUIRED', 'non-production requirement')
assertIncludes(plan, 'EXPAND SCHEMA FIRST', 'zero-downtime principle')
assertIncludes(plan, 'OPERATOR_VERIFICATION_REQUIRED', 'external-state boundary')
assertIncludes(plan, 'PAYLOAD_DB_PUSH=false', 'schema-push guard')

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

console.log('imageSlotLineageSchemaGovernance: additive guarded schema plan - ALL OK')
