import assert from 'node:assert'

import type { Client } from 'pg'

import { assertDedicatedTarget, executeMigrationTransaction } from './image-slot-lineage-schema-apply'

const EXPECTED_SCHEMA_ROWS = [
  ['image_generation_jobs', 'generation_contract_version', 'character varying', 'varchar'],
  ['image_generation_jobs', 'active_attempt_id', 'character varying', 'varchar'],
  ['image_generation_jobs', 'generation_attempts', 'jsonb', 'jsonb'],
  ['media', 'generation_lineage_contract_version', 'character varying', 'varchar'],
  ['media', 'generation_lineage_job_id', 'character varying', 'varchar'],
  ['media', 'generation_lineage_attempt_id', 'character varying', 'varchar'],
  ['media', 'generation_lineage_slot_id', 'character varying', 'varchar'],
].map(([table_name, column_name, data_type, udt_name]) => ({
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable: 'YES',
  column_default: null,
}))

function fixturePostgresUri(
  protocol: 'postgres' | 'postgresql',
  username: string,
  password: string,
  hostname: string,
  database: string,
  port?: number,
): string {
  return `${protocol}://${username}:${password}@${hostname}${port ? `:${port}` : ''}/${database}`
}

async function testCommitOnlyAfterSuccess(): Promise<void> {
  const calls: string[] = []
  const sql = 'SET LOCAL lock_timeout = \'5s\'; SELECT 1;'
  const client = {
    async query(text: string): Promise<{ rows: typeof EXPECTED_SCHEMA_ROWS }> {
      if (text.includes('FROM information_schema.columns')) {
        calls.push('VERIFY_SCHEMA')
        return { rows: EXPECTED_SCHEMA_ROWS }
      }
      calls.push(text)
      return { rows: [] }
    },
  } as unknown as Client

  await executeMigrationTransaction(client, sql)
  assert.deepStrictEqual(calls, ['BEGIN', sql, 'VERIFY_SCHEMA', 'COMMIT'])
}

async function testStatementFailureRollsBack(): Promise<void> {
  const calls: string[] = []
  const deliberateFailureSql = 'SELECT deliberate_rehearsal_failure;'
  const client = {
    async query(text: string): Promise<{ rows: never[] }> {
      calls.push(text)
      if (text === deliberateFailureSql) throw new Error('deliberate statement failure')
      return { rows: [] }
    },
  } as unknown as Client

  await assert.rejects(
    executeMigrationTransaction(client, deliberateFailureSql),
    /deliberate statement failure/,
  )
  assert.deepStrictEqual(calls, ['BEGIN', deliberateFailureSql, 'ROLLBACK'])
  assert.ok(!calls.includes('COMMIT'), 'failed transaction must never commit')
}

function testApplicationTargetEqualityIsRejected(): void {
  assert.throws(
    () => assertDedicatedTarget(
      fixturePostgresUri('postgresql', 'task', 'fixture-a', 'LOCALHOST', 'same_database', 5432),
      fixturePostgresUri('postgres', 'application', 'fixture-b', 'localhost', 'same_database'),
    ),
    /resolves to the configured application database/,
  )
  assert.doesNotThrow(() => assertDedicatedTarget(
    fixturePostgresUri('postgresql', 'task', 'fixture-a', '127.0.0.1', 'rehearsal_database', 5432),
    fixturePostgresUri('postgresql', 'application', 'fixture-b', 'remote.invalid', 'application_database', 5432),
  ))
}

async function main(): Promise<void> {
  await testCommitOnlyAfterSuccess()
  await testStatementFailureRollsBack()
  testApplicationTargetEqualityIsRejected()
  console.log('imageSlotLineageSchemaApply: caller-owned commit and failure rollback - ALL OK')
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
