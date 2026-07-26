import assert from 'node:assert'
import { readFileSync } from 'node:fs'

function read(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

function assertIncludes(source: string, expected: string, label: string): void {
  assert.ok(source.includes(expected), `${label} must include: ${expected}`)
}

const provision = read('scripts/sql/image-slot-lineage-rehearsal-provision-v1.sql')
const harness = read('scripts/sql/image-slot-lineage-rehearsal-harness-v1.sql')
const compatibility = read('scripts/sql/image-slot-lineage-rehearsal-compatibility-v1.sql')
const runtimeRollback = read('scripts/sql/image-slot-lineage-rehearsal-runtime-rollback-v1.sql')
const report = read('project-control/IMAGE_SLOT_LINEAGE_NONPROD_REHEARSAL_V1.md')
const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }

for (const expected of [
  'NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 5',
  "REVOKE CONNECT ON DATABASE %I FROM PUBLIC",
  "GRANT CONNECT ON DATABASE %I TO %I",
  "GRANT CONNECT ON DATABASE %I TO postgres",
]) {
  assertIncludes(provision, expected, 'strict disposable provisioning')
}
assert.ok(!/ALTER\s+DATABASE\s+(?:postgres|template0|template1)/i.test(provision), 'provisioning must not change another database')
assert.ok(!provision.includes('DATABASE_URI'), 'provisioning must not use the application URI')

for (const table of ['public.image_generation_jobs', 'public.media']) {
  assertIncludes(harness, `CREATE TABLE ${table}`, 'minimal harness table')
}
for (const lineageColumn of [
  'generation_contract_version',
  'active_attempt_id',
  'generation_attempts',
  'generation_lineage_contract_version',
  'generation_lineage_job_id',
  'generation_lineage_attempt_id',
  'generation_lineage_slot_id',
]) {
  assert.ok(!harness.includes(lineageColumn), `pre-migration harness must omit ${lineageColumn}`)
}
assertIncludes(harness, "(101, 'synthetic-product-a'", 'first synthetic job')
assertIncludes(harness, "(102, 'synthetic-product-b'", 'second synthetic job')
assertIncludes(harness, "(201, 'synthetic-a.webp'", 'first synthetic Media')
assertIncludes(harness, "(202, 'synthetic-b.webp'", 'second synthetic Media')
assert.ok(!/https?:\/\//i.test(harness), 'harness must not contain external URLs')
assert.ok(!/telegram/i.test(harness), 'harness must not contain Telegram data')

for (const expected of [
  'OLD_STYLE_COMPATIBILITY_PASS',
  'NEW_LINEAGE_COMPATIBILITY_PASS',
  'image-slot-contract/v1',
  'iga_11111111-1111-4111-8111-111111111111',
  "ARRAY['side', 'hero_3q', 'top', 'back', 'detail']::varchar[]",
  'generation_attempts #>>',
  'generation_lineage_slot_id IS NOT NULL',
]) {
  assertIncludes(compatibility, expected, 'complete compatibility rehearsal')
}
assertIncludes(runtimeRollback, 'RUNTIME_FIRST_ROLLBACK_PASS', 'runtime-first result')
assertIncludes(runtimeRollback, 'generation_contract_version IS NOT NULL', 'runtime-first null guard')
assert.ok(!/DROP\s+COLUMN/i.test(runtimeRollback), 'runtime-first proof must retain expanded columns')

for (const expected of [
  '## Attempt 1',
  'REHEARSAL_FAIL',
  '45963EF7FF50CDB99F3ED95BFE2E1F86D456CA99C95A7A5B325B47D3200518AC',
  '## Attempt 2',
  'SCHEMA_HARNESS_REHEARSAL_PASS',
  '06191F196144259FB1992245B29849AA9353645E2160A03FC13B2F3F654961E2',
  'FULL_APPLICATION_COMPATIBILITY_NOT_PROVEN',
  'CHECKPOINT CORRECTED LINEAGE MIGRATION AND REHEARSAL EVIDENCE',
]) {
  assertIncludes(report, expected, 'Attempt 1/2 audit history')
}

assertIncludes(
  packageJson.scripts?.['test:image-slot-lineage-rehearsal'] ?? '',
  'tsx scripts/image-slot-lineage-rehearsal-governance.ts',
  'rehearsal governance package script',
)
assertIncludes(
  packageJson.scripts?.['test:safe'] ?? '',
  'npm run test:image-slot-lineage-rehearsal',
  'safe suite rehearsal governance',
)

console.log('imageSlotLineageRehearsalGovernance: isolation, fixtures, Attempt 1/2 evidence - ALL OK')
