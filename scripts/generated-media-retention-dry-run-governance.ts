import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(path, 'utf8')
const reporter = read('scripts/generated-media-retention-dry-run.ts')
const policy = read('src/lib/generatedMediaRetentionPolicy.ts')
const tests = read('src/lib/generatedMediaRetentionPolicy.test.ts')
const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }

for (const required of [
  '--confirm-read-only',
  "process.env.PAYLOAD_DB_PUSH !== 'false'",
  'default_transaction_read_only=on',
  'BEGIN TRANSACTION READ ONLY',
  'SHOW transaction_read_only',
  "await client.query('ROLLBACK')",
  'pathToFileURL(process.argv[1]).href',
  'physicalDeleteAuthorizations: 0',
  'NO MEDIA, BLOB, JOB, PRODUCT, GALLERY, SCHEMA, PROVIDER, OR TELEGRAM MUTATION OCCURRED',
]) {
  assert.ok(reporter.includes(required), `reporter must contain ${required}`)
}

for (const forbidden of [
  "from 'payload'",
  'getPayload',
  'payload.update',
  'payload.delete',
  'fetch(',
  'axios',
  'BLOB_READ_WRITE_TOKEN',
  'TELEGRAM_BOT_TOKEN',
]) {
  assert.ok(!reporter.includes(forbidden), `reporter must not contain ${forbidden}`)
}

assert.ok(policy.includes('physicalDeleteAuthorization: false'))
assert.ok(policy.includes("| 'LEGACY_MANUAL_REVIEW'"))
assert.ok(policy.includes("| 'PHYSICAL_CLEANUP_CANDIDATE'"))
assert.ok(tests.includes('assert.equal(tests, 30)'))
assert.equal(packageJson.scripts?.['dryrun:generated-media-retention'], 'tsx scripts/generated-media-retention-dry-run.ts')
assert.equal(packageJson.scripts?.['test:generated-media-retention-policy'], 'tsx src/lib/generatedMediaRetentionPolicy.test.ts')
assert.equal(packageJson.scripts?.['test:generated-media-retention-dry-run'], 'tsx scripts/generated-media-retention-dry-run-governance.ts')
assert.ok(packageJson.scripts?.['test:safe']?.includes('npm run test:generated-media-retention-policy'))
assert.ok(packageJson.scripts?.['test:safe']?.includes('npm run test:generated-media-retention-dry-run'))
assert.ok(!packageJson.scripts?.['test:safe']?.includes('dryrun:generated-media-retention'))

console.log('GENERATED_MEDIA_RETENTION_DRY_RUN_GOVERNANCE_PASS')
