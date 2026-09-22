import assert from 'node:assert/strict'
import { eq, getTableColumns, getTableName } from 'drizzle-orm'
import { pgTable, serial, text } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/node-postgres'

import {
  CONTROLLED_FRESH_CANDIDATE_CREATION_ENVELOPE,
  CONTROLLED_FRESH_CANDIDATE_EXTERNAL_EFFECT_ENVELOPE,
  CONTROLLED_FRESH_CANDIDATE_PILOT_MANIFEST_VERSION,
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_BUDGET_IDENTITY,
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_MAXIMUMS,
  controlledFreshCandidateManifestUnsigned,
  controlledFreshCandidatePilotDigest,
  createControlledFreshCandidateRuntimeBudget,
  validateControlledFreshCandidateOwnerInput,
  validateControlledFreshCandidatePilotManifest,
  type ControlledFreshCandidateOwnerInput,
  type ControlledFreshCandidatePilotManifest,
} from './controlledFreshCandidatePilotContract'

function fixture(now = Date.parse('2026-09-14T10:00:00.000Z')): ControlledFreshCandidateOwnerInput {
  const unsigned: Omit<ControlledFreshCandidatePilotManifest, 'manifestDigest'> = {
    version: CONTROLLED_FRESH_CANDIDATE_PILOT_MANIFEST_VERSION,
    candidateIdentity: 'synthetic-candidate-0001',
    existingProductId: null,
    stockCandidate: 'SN9001',
    title: 'Synthetic candidate',
    positivePrice: 1,
    provenance: 'Synthetic offline test evidence.',
    original: {
      identity: 'synthetic-original-0001',
      filename: 'synthetic-original.png',
      contentDigest: 'a'.repeat(64),
      mimeType: 'image/png',
      width: 1,
      height: 1,
    },
    declaredBlobObjectMaximum: 4,
    creationEnvelope: CONTROLLED_FRESH_CANDIDATE_CREATION_ENVELOPE,
    externalEffectEnvelope: CONTROLLED_FRESH_CANDIDATE_EXTERNAL_EFFECT_ENVELOPE,
    runtimeBudgetIdentity: CONTROLLED_FRESH_CANDIDATE_RUNTIME_BUDGET_IDENTITY,
    exactCommitIdentity: 'b'.repeat(40),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 60_000).toISOString(),
  }
  const manifest = {
    ...unsigned,
    manifestDigest: controlledFreshCandidatePilotDigest(unsigned),
  }
  return { ...manifest, originalPath: '/tmp/synthetic-original.png' }
}

async function main(): Promise<void> {
  const now = Date.parse('2026-09-14T10:00:00.000Z')
  const input = fixture(now)
  const manifest = { ...input } as Partial<ControlledFreshCandidateOwnerInput>
  delete manifest.originalPath
  assert.equal(validateControlledFreshCandidatePilotManifest(manifest, {
    now,
    expectedCommitIdentity: 'b'.repeat(40),
  }), true)
  assert.equal(validateControlledFreshCandidateOwnerInput(input, {
    now,
    expectedCommitIdentity: 'b'.repeat(40),
  }), true)
  assert.equal(
    controlledFreshCandidatePilotDigest(controlledFreshCandidateManifestUnsigned(manifest as ControlledFreshCandidatePilotManifest)),
    manifest.manifestDigest,
  )

  const rejects = (mutate: (candidate: Record<string, unknown>) => void): void => {
    const candidate = structuredClone(input) as unknown as Record<string, unknown>
    mutate(candidate)
    assert.equal(validateControlledFreshCandidateOwnerInput(candidate, { now }), false)
  }
  rejects((candidate) => { candidate.unknown = true })
  rejects((candidate) => { candidate.existingProductId = 349 })
  rejects((candidate) => { candidate.existingProductId = 77 })
  rejects((candidate) => { candidate.stockCandidate = '349' })
  rejects((candidate) => { candidate.positivePrice = 0 })
  rejects((candidate) => { candidate.title = '' })
  rejects((candidate) => { candidate.provenance = '' })
  rejects((candidate) => { candidate.manifestDigest = 'c'.repeat(64) })
  rejects((candidate) => { candidate.originalPath = '/tmp/../synthetic-original.png' })
  rejects((candidate) => { candidate.expiresAt = new Date(now).toISOString() })

  const budget = createControlledFreshCandidateRuntimeBudget()
  budget.poolConstructed()
  assert.throws(() => budget.poolConstructed(), /CONTROLLED_RUNTIME_BUDGET_EXHAUSTED/u)
  const connections = createControlledFreshCandidateRuntimeBudget()
  connections.connectionAttempted()
  assert.throws(() => connections.connectionAttempted(), /CONTROLLED_RUNTIME_BUDGET_EXHAUSTED/u)
  const clients = createControlledFreshCandidateRuntimeBudget()
  clients.clientAcquired()
  assert.throws(() => clients.clientAcquired(), /CONTROLLED_RUNTIME_BUDGET_EXHAUSTED/u)
  clients.clientReleased()
  assert.throws(() => clients.sql('DELETE FROM products WHERE id = 1'), /CONTROLLED_RUNTIME_SQL_FORBIDDEN/u)
  assert.throws(() => clients.sql('INSERT INTO orders (id) VALUES (1)'), /CONTROLLED_RUNTIME_SQL_FORBIDDEN/u)
  assert.throws(() => clients.sql('UPDATE media SET filename = $1'), /CONTROLLED_RUNTIME_SQL_FORBIDDEN/u)
  assert.throws(() => clients.sql('WITH removed AS (DELETE FROM products RETURNING id) SELECT id FROM removed'), /CONTROLLED_RUNTIME_SQL_FORBIDDEN/u)
  assert.throws(() => clients.sql('SET ROLE privileged_operator'), /CONTROLLED_RUNTIME_SQL_FORBIDDEN/u)
  assert.throws(() => clients.sql('DELETE FROM products_rels WHERE parent_id = $1'), /SQL_FORBIDDEN/u)
  assert.throws(() => clients.sql('INSERT INTO "public"."media" (id) VALUES ($1)'), /SQL_FORBIDDEN/u)
  assert.throws(() => clients.sql('UPDATE "products" SET title = $1 WHERE id = $2'), /SQL_FORBIDDEN/u)
  assert.equal(clients.report().maximum.sqlStatements, CONTROLLED_FRESH_CANDIDATE_RUNTIME_MAXIMUMS.sqlStatements)
  assert.equal(clients.report().actual.checkedOutClients, 1)
  assert.equal(JSON.stringify(clients.report()).includes('postgresql://'), false)
  const products = pgTable('products', { id: serial('id').primaryKey(), title: text('title'), confirmation: text('workflow_confirmation_status') })
  const statements = createControlledFreshCandidateRuntimeBudget()
  statements.channelBindingConfirmed()
  statements.registerSqlColumns(new Map([[getTableName(products), new Set(Object.values(getTableColumns(products)).map((column) => column.name))]]))
  const captured: string[] = []
  const db = drizzle({ client: { query: async (query: { text: string; rowMode?: string }, values: unknown[]) => {
    captured.push(query.text)
    statements.sql({ text: query.text, values })
    return { rows: query.rowMode === 'array' ? [[77]] : [{ id: 77 }] }
  } } as never })
  await statements.withSqlPhase({ phase: 'begin' }, async () => statements.sql({ text: 'begin', values: [] }))
  await statements.withSqlPhase({ phase: 'product-create', table: 'products', data: { title: 'Authorized synthetic candidate' } }, async () => {
    await db.insert(products).values({ title: 'Authorized synthetic candidate' }).returning({ id: products.id })
  })
  statements.recordCreatedIdentity('products', 77)
  await statements.withSqlPhase({ phase: 'commit' }, async () => statements.sql({ text: 'commit', values: [] }))
  await statements.withSqlPhase({ phase: 'read', table: 'products', identity: 77 }, async () => {
    await db.select({ id: products.id }).from(products).where(eq(products.id, 77)).limit(1)
  })
  assert.equal(captured.length, 2, 'installed drizzle/node-postgres emits phase-bound INSERT and SELECT')
  await statements.withSqlPhase({ phase: 'read', table: 'products', identity: 77, maximumStatements: 2 }, async () => {
    for (const [query, values] of [
      ['SELECT pg_sleep(1) FROM "products" WHERE "id" = $1', [77]],
      ['SELECT "pg_sleep"(1) FROM "products" WHERE "id" = $1', [77]],
      ['SELECT set_config($2, $3, false) FROM "products" WHERE "id" = $1', [77, 'x', 'y']],
      ['SELECT "id" FROM "products"', []],
      ['SELECT "id" FROM "products" WHERE "id" = $1; SELECT 1', [77]],
      ['SELECT "id" FROM "products" WHERE "id" = $1 -- escape', [77]],
      ['SELECT "id" FROM "products" WHERE "id" = $2', [77]],
      ['SELECT "id" FROM "products" WHERE "id" = $1', [349]],
      ['SELECT "id" FROM "products" WHERE "id" = $1', [78]],
      ['SELECT "id" FROM "products" WHERE "id" = $1 + 1', [77]],
      ['SELECT "id" FROM "products" WHERE true AND EXISTS(SELECT 1 FROM "products" WHERE "id" = $1)', [77]],
      ['UPDATE "products" SET "title" = $1 WHERE "id" = $2', ['foreign edit', 77]],
      ['SELECT "id" FROM "products" WHERE "id" = $1 OR true', [77]],
      ['SELECT "foreign_column" FROM "products" WHERE "id" = $1 LIMIT $2', [77, 1]],
      ['SELECT (SELECT "id" FROM "products") FROM "products" WHERE "id" = $1 LIMIT $2', [77, 1]],
      ['SELECT "id" FROM "products" WHERE "id" = $1 LIMIT $2 OFFSET $3', [77, 1, 1]],
    ] as const) assert.throws(() => statements.sql({ text: query, values }), /SQL_FORBIDDEN/u)
  })
  assert.throws(() => statements.withSqlPhase({ phase: 'read', table: 'products', identity: 78 }, async () => undefined), /FOREIGN_IDENTITY/u)
  assert.throws(() => statements.withSqlPhase({ phase: 'read', table: 'products', identity: 77, maximumStatements: 0 }, async () => undefined), /PHASE_INVALID/u)
  assert.throws(() => statements.sql({ text: captured[1], values: [77, 1] }), /SQL_FORBIDDEN/u)
  await statements.withSqlPhase({ phase: 'read', table: 'products', identity: 77, maximumStatements: 1 }, async () => {
    statements.sql({ text: captured[1], values: [77, 1] })
    assert.throws(() => statements.sql({ text: captured[1], values: [77, 1] }), /SQL_FORBIDDEN/u)
  })

  console.log('controlledFreshCandidatePilotContract: ALL OK')
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
