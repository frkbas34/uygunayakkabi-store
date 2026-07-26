import assert from 'node:assert'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import {
  PayloadDbPushPolicyError,
  resolvePayloadDbPushPolicy,
} from './payloadDbPushPolicy'

const EXPECTED_SQL_SHA256 = '06191F196144259FB1992245B29849AA9353645E2160A03FC13B2F3F654961E2'
const LOCAL_CONFIRMATION = 'ALLOW_LOCAL_SCHEMA_MUTATION'

function resolve(env: Record<string, string | undefined>, argv: readonly string[] = []) {
  return resolvePayloadDbPushPolicy({ env, argv })
}

function expectPolicyError(
  env: Record<string, string | undefined>,
  code: PayloadDbPushPolicyError['code'],
  argv: readonly string[] = [],
): PayloadDbPushPolicyError {
  let captured: unknown
  try {
    resolve(env, argv)
  } catch (error) {
    captured = error
  }

  assert.ok(captured instanceof PayloadDbPushPolicyError, `expected ${code} policy error`)
  assert.strictEqual(captured.code, code)
  return captured
}

function main(): void {
  assert.deepStrictEqual(resolve({}), {
    enabled: false,
    environment: 'unknown',
    reason: 'default_disabled',
  })
  assert.strictEqual(resolve({ PAYLOAD_DB_PUSH: '' }).enabled, false)
  assert.strictEqual(resolve({ PAYLOAD_DB_PUSH: '   ' }).enabled, false)
  assert.strictEqual(resolve({ PAYLOAD_DB_PUSH: 'false', NODE_ENV: 'production' }).enabled, false)

  for (const value of ['1', 'yes', 'TRUE', 'on', 'enabled', ' true ']) {
    expectPolicyError({ PAYLOAD_DB_PUSH: value, NODE_ENV: 'development' }, 'invalid_value')
  }

  expectPolicyError({ PAYLOAD_DB_PUSH: 'true', NODE_ENV: 'development' }, 'missing_local_confirmation')
  assert.deepStrictEqual(
    resolve({
      PAYLOAD_DB_PUSH: 'true',
      PAYLOAD_DB_PUSH_LOCAL_CONFIRM: LOCAL_CONFIRMATION,
      NODE_ENV: 'development',
    }),
    {
      enabled: true,
      environment: 'local_development',
      reason: 'local_development_explicitly_enabled',
    },
  )

  expectPolicyError({ PAYLOAD_DB_PUSH: 'true', NODE_ENV: 'production' }, 'unsafe_environment')
  expectPolicyError({ PAYLOAD_DB_PUSH: 'true', VERCEL: '1', VERCEL_ENV: 'preview' }, 'unsafe_environment')
  expectPolicyError({ PAYLOAD_DB_PUSH: 'true', VERCEL: '1', VERCEL_ENV: 'production' }, 'unsafe_environment')
  expectPolicyError({ PAYLOAD_DB_PUSH: 'true', CI: 'true' }, 'unsafe_environment')
  expectPolicyError({ PAYLOAD_DB_PUSH: 'true', npm_lifecycle_event: 'build' }, 'unsafe_environment')
  expectPolicyError({ PAYLOAD_DB_PUSH: 'true', NODE_ENV: 'test' }, 'unsafe_environment')
  expectPolicyError({ PAYLOAD_DB_PUSH: 'true' }, 'unsafe_environment')
  expectPolicyError(
    {
      PAYLOAD_DB_PUSH: 'true',
      PAYLOAD_DB_PUSH_LOCAL_CONFIRM: LOCAL_CONFIRMATION,
      NODE_ENV: 'development',
      VERCEL: '1',
      VERCEL_ENV: 'preview',
    },
    'unsafe_environment',
  )
  expectPolicyError(
    { PAYLOAD_DB_PUSH: 'true', NODE_ENV: 'development' },
    'unsafe_environment',
    ['node', 'smoke.ts', '--confirm-read-only'],
  )
  assert.deepStrictEqual(
    resolve({ PAYLOAD_DB_PUSH: 'false', NODE_ENV: 'development' }, ['node', 'smoke.ts', '--confirm-read-only']),
    { enabled: false, environment: 'read_only', reason: 'explicitly_disabled' },
  )

  const sensitiveValue = 'credential-value-that-must-not-appear'
  const safeError = expectPolicyError(
    { PAYLOAD_DB_PUSH: 'yes', NODE_ENV: 'development', DATABASE_URI: sensitiveValue },
    'invalid_value',
  )
  assert.ok(!safeError.message.includes(sensitiveValue))
  assert.ok(!JSON.stringify(safeError).includes(sensitiveValue))

  const payloadConfig = readFileSync('payload.config.ts', 'utf8')
  assert.ok(payloadConfig.includes('resolvePayloadDbPushPolicy'))
  assert.ok(payloadConfig.includes('push: payloadDbPushPolicy.enabled'))
  assert.ok(!payloadConfig.includes('process.env.PAYLOAD_DB_PUSH !== "false"'))
  assert.ok(
    payloadConfig.lastIndexOf('resolvePayloadDbPushPolicy') < payloadConfig.indexOf('postgresAdapter({'),
    'policy must resolve before the database adapter is initialized',
  )

  const migrationHelper = readFileSync('scripts/image-slot-lineage-schema-apply.ts', 'utf8')
  assert.ok(!migrationHelper.includes('payload.config'))
  assert.ok(!migrationHelper.includes('payloadDbPushPolicy'))
  assert.ok(migrationHelper.includes("TARGET_DATABASE_URI_ENV = 'IMAGE_SLOT_LINEAGE_DATABASE_URI'"))
  assert.ok(migrationHelper.includes("client.query('BEGIN')"))
  assert.ok(migrationHelper.includes("client.query('COMMIT')"))
  assert.ok(migrationHelper.includes("client.query('ROLLBACK')"))
  assert.ok(migrationHelper.includes(`EXPECTED_SQL_SHA256 = '${EXPECTED_SQL_SHA256.toLowerCase()}'`))

  const migrationSql = readFileSync('scripts/sql/image-slot-lineage-schema-v1.sql', 'utf8')
  const actualSqlHash = createHash('sha256').update(migrationSql).digest('hex').toUpperCase()
  assert.strictEqual(actualSqlHash, EXPECTED_SQL_SHA256)

  const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> }
  assert.strictEqual(
    packageJson.scripts?.['test:payload-db-push-policy'],
    'tsx src/lib/payloadDbPushPolicy.test.ts',
  )
  assert.ok(packageJson.scripts?.['test:safe']?.includes('npm run test:payload-db-push-policy'))

  const envExample = readFileSync('.env.example', 'utf8')
  assert.ok(envExample.includes('\nPAYLOAD_DB_PUSH=false\n'))
  assert.ok(envExample.includes('# PAYLOAD_DB_PUSH=true'))
  assert.ok(envExample.includes('# PAYLOAD_DB_PUSH_LOCAL_CONFIRM=ALLOW_LOCAL_SCHEMA_MUTATION'))

  const runbook = readFileSync('project-control/DEPLOYMENT_OPS_RUNBOOK.md', 'utf8')
  assert.ok(runbook.includes('Missing, empty, or exact `false` disables automatic push'))
  assert.ok(runbook.includes('Production still runs the old fail-open code'))

  const preflight = readFileSync('project-control/IMAGE_SLOT_LINEAGE_PRODUCTION_PREFLIGHT_V1.md', 'utf8')
  assert.ok(preflight.includes('### Local remediation checkpoint (2026-07-26)'))
  assert.ok(preflight.includes('PRODUCTION PAYLOAD SCHEMA PUSH CONTROL-PLANE REMEDIATION V1'))

  console.log('payloadDbPushPolicy: 16+ fail-closed policy and governance assertions - ALL OK')
}

main()
