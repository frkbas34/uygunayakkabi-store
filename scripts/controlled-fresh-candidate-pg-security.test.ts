import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { checkServerIdentity } from 'node:tls'
import { getTableColumns, getTableName } from 'drizzle-orm'
import './controlled-fresh-candidate-secret-loader'
import { assertControlledFreshCandidateNoAmbientPgOverrides, controlledFreshCandidateCanonicalUriValidationCount } from './controlled-fresh-candidate-secret-loader'
import {
  createControlledFreshCandidateDatabaseAdapter, serializeControlledFreshCandidateUploads,
  observeControlledFreshCandidateBlobSet,
  createControlledFreshCandidateBoundaryLoggerConfiguration,
} from './controlled-fresh-candidate-runtime-resources'
import type { ControlledFreshCandidateBlobDescriptor } from '../src/lib/controlledFreshCandidateReceipt'

import { createControlledFreshCandidateRuntimeBudget } from '../src/lib/controlledFreshCandidatePilotContract'
import {
  CONTROLLED_FRESH_CANDIDATE_REQUIRED_SASL_MECHANISM,
  controlledFreshCandidateDatabaseUriIsCanonical,
  controlledFreshCandidateSecurePgConfig,
  createControlledFreshCandidateSecurePgClientConstructor,
  type ControlledFreshCandidatePgClientConstructor,
} from './controlled-fresh-candidate-pg-security'

const URI = 'postgresql://synthetic:synthetic@example.invalid/db?sslmode=verify-full&channel_binding=require'

class FakeClient {
  static selectedMechanism = CONTROLLED_FRESH_CANDIDATE_REQUIRED_SASL_MECHANISM
  readonly config: Record<string, unknown>
  readonly emitted: string[] = []
  readonly connection = {
    emit: (_event: 'error', error: Error) => { this.emitted.push(error.message); return true },
  }
  saslSession: { mechanism?: unknown } | null = null
  constructor(config: Record<string, unknown>) { this.config = config }
  _handleAuthSASL(): void { this.saslSession = { mechanism: FakeClient.selectedMechanism } }
  _handleAuthSASLFinal(): void { this.saslSession = null }
  connect(): Promise<void> { return Promise.resolve() }
  query(): Promise<{ rows: [] }> { return Promise.resolve({ rows: [] }) }
}

async function main(): Promise<void> {
  const pg = await import('pg')
  // Reproduce the old normalization failure independently of the repaired path.
  assert.equal(controlledFreshCandidateDatabaseUriIsCanonical(URI.replace(/\?.*$/u, '')), false)
  for (const key of ['PGOPTIONS', 'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSSLMODE', 'PGSERVICE', 'PGPASSFILE', 'PGAPPNAME', 'PGCONNECT_TIMEOUT']) {
    assert.throws(() => assertControlledFreshCandidateNoAmbientPgOverrides({ [key]: 'synthetic-do-not-disclose' }), /AMBIENT_PG_OVERRIDE/u)
  }
  class OfflineInstalledClient extends pg.Client {}
  Object.defineProperty(OfflineInstalledClient.prototype, '_handleAuthSASL', { value: function (this: pg.Client & { saslSession: unknown }) { this.saslSession = { mechanism: 'SCRAM-SHA-256-PLUS' } } })
  Object.defineProperty(OfflineInstalledClient.prototype, '_handleAuthSASLFinal', { value: function (this: pg.Client & { saslSession: unknown }) { this.saslSession = null } })
  Object.defineProperty(OfflineInstalledClient.prototype, 'connect', { value: function (this: pg.Client, callback: (error?: Error) => void) {
    // Stub only transport bookkeeping; pg-pool's checkout/release is real.
    this.connection.stream.ref = () => this.connection.stream
    this.connection.stream.unref = () => this.connection.stream
    const authentication = this as unknown as { _handleAuthSASL(message: unknown): void; _handleAuthSASLFinal(message: unknown): void }
    authentication._handleAuthSASL({ mechanisms: ['SCRAM-SHA-256-PLUS'] })
    authentication._handleAuthSASLFinal({})
    queueMicrotask(() => callback())
  } })
  Object.defineProperty(OfflineInstalledClient.prototype, 'end', { value: function (this: EventEmitter) {
    queueMicrotask(() => this.emit('end'))
    return Promise.resolve()
  } })
  const InstalledClient = createControlledFreshCandidateSecurePgClientConstructor(OfflineInstalledClient as unknown as ControlledFreshCandidatePgClientConstructor)
  const beforeCanonicalValidation = controlledFreshCandidateCanonicalUriValidationCount()
  const branded = controlledFreshCandidateSecurePgConfig(URI, { Client: InstalledClient, max: 1, min: 0, idleTimeoutMillis: 100 })
  const realPool = new pg.Pool(branded)
  const acquired = await realPool.connect()
  assert.equal((acquired as unknown as { getStartupConf(): Record<string, unknown> }).getStartupConf().options, undefined)
  acquired.release()
  await realPool.end()
  assert.equal(realPool.totalCount, 0)
  assert.equal(controlledFreshCandidateDatabaseUriIsCanonical(URI), true)
  assert.equal(controlledFreshCandidateCanonicalUriValidationCount() - beforeCanonicalValidation, 1,
    'canonical URI validates once; real pg-pool/client and readiness reuse the validated boundary')
  const postgres = await import('@payloadcms/db-postgres')
  // Real installed adapter, pg-pool and pg.Client construction. Only transport
  // settlement is synthetic; there is no socket connect or SQL execution.
  for (const failure of [false, true]) {
    const factory = createControlledFreshCandidateDatabaseAdapter({ postgresModule: postgres, pg, pool: branded })
    const adapter = factory.init({ payload: { logger: { info() {}, error() {} } } } as never)
    if (failure) adapter.createExtensions = async () => { throw new Error('synthetic-extension-failure') }
    if (failure) await assert.rejects(() => adapter.connect(), /synthetic-extension-failure/u)
    else await adapter.connect()
    assert.equal(adapter.pool?.idleCount, 1)
    const afterBootstrap = await adapter.pool!.connect()
    afterBootstrap.release()
    await adapter.pool!.end()
    assert.equal(adapter.pool!.totalCount, 0)
  }
  // Capture statements emitted by the installed Payload adapter against the
  // actual collection field layouts. The synthetic client never sends SQL.
  {
    const { BasePayload, buildConfig } = await import('payload')
    const { lexicalEditor } = await import('@payloadcms/richtext-lexical')
    const { Products } = await import('../src/collections/Products')
    const { Variants } = await import('../src/collections/Variants')
    const { MediaCollection } = await import('../src/collections/Media')
    const { Brands } = await import('../src/collections/Brands')
    const { Categories } = await import('../src/collections/Categories')
    const { BlogPosts } = await import('../src/collections/BlogPosts')
    const { ImageGenerationJobs } = await import('../src/collections/ImageGenerationJobs')
    const { BotEvents } = await import('../src/collections/BotEvents')
    const { StoryJobs } = await import('../src/collections/StoryJobs')
    const captured: { text: string; values: unknown[] }[] = []
    const sqlBudget = createControlledFreshCandidateRuntimeBudget()
    sqlBudget.channelBindingConfirmed()
    class CaptureClient extends OfflineInstalledClient {}
    Object.defineProperty(CaptureClient.prototype, 'query', { value: function (query: { text: string } | string, values: unknown[] | ((error: null, result: unknown) => void), callback?: (error: null, result: unknown) => void) {
      captured.push({ text: typeof query === 'string' ? query : query.text, values: Array.isArray(values) ? values : [] })
      const sql = typeof query === 'string' ? query : query.text
      sqlBudget.sql({ text: sql, values: Array.isArray(values) ? values : [] })
      const names = sql.split(' returning ')[1]?.split(', ').map((name) => name.replaceAll('"', '')) ?? []
      const result = { rows: names.length ? [names.map((name) => name === 'id' ? sql.includes('into "media"') ? 501 : 77 : null)]
        : /select count/iu.test(sql) ? [{ count: '0' }] : [], rowCount: names.length ? 1 : 0 }
      const cb = typeof values === 'function' ? values : callback
      if (cb) queueMicrotask(() => cb(null, result))
      return Promise.resolve(result)
    } })
    const CaptureSecureClient = createControlledFreshCandidateSecurePgClientConstructor(CaptureClient as unknown as ControlledFreshCandidatePgClientConstructor)
    const payload = new BasePayload()
    await payload.init({ disableDBConnect: true, disableOnInit: true, config: buildConfig({
      secret: 'synthetic-offline-secret-only', telemetry: false, typescript: { autoGenerate: false },
      editor: lexicalEditor(),
      collections: [Products, Variants, MediaCollection, Brands, Categories, BlogPosts, ImageGenerationJobs, BotEvents, StoryJobs]
        .map((collection) => ({ ...collection, hooks: {} })),
      db: createControlledFreshCandidateDatabaseAdapter({ postgresModule: postgres, pg,
        pool: controlledFreshCandidateSecurePgConfig(URI, { Client: CaptureSecureClient, max: 1, min: 0 }) }),
      logger: createControlledFreshCandidateBoundaryLoggerConfiguration(),
    }) })
    try {
      await sqlBudget.withSqlPhase({ phase: 'bootstrap', maximumStatements: 8 }, () => payload.db.connect!())
      const tables = (payload.db as unknown as { tables: Record<string, Parameters<typeof getTableName>[0]> }).tables
      sqlBudget.registerSqlColumns(new Map(Object.values(tables).map((table) => [getTableName(table), new Set(Object.values(getTableColumns(table)).map((column) => column.name))])),
        new Map(Object.values(tables).map((table) => [getTableName(table), new Map(Object.values(getTableColumns(table)).map((column) => [column.name, (value: unknown) => column.mapToDriverValue(value)]))])))
      await sqlBudget.withSqlPhase({ phase: 'begin' }, async () => { sqlBudget.sql('begin') })
      const data = { title: 'Synthetic candidate', stockNumber: 'SN9001', price: 349, status: 'draft' }
      await sqlBudget.withSqlPhase({ phase: 'product-create', table: 'products', data }, () => payload.db.create({ collection: 'products', data, returning: false }))
      sqlBudget.recordCreatedIdentity('products', 77)
      const mediaData = { product: 77, type: 'original', filename: 'synthetic.png' }
      await sqlBudget.withSqlPhase({ phase: 'media-create', table: 'media', data: mediaData }, () => payload.db.create({ collection: 'media', data: mediaData, returning: false }))
      sqlBudget.recordCreatedIdentity('media', 501)
      await sqlBudget.withSqlPhase({ phase: 'relationship', table: 'products', identity: 77, maximumStatements: 12 }, () =>
        payload.db.updateOne({ collection: 'products', id: 77, data: { images: { $push: [{ id: '11111111-1111-4111-8111-111111111111', image: 501 }] } }, returning: false }))
      await sqlBudget.withSqlPhase({ phase: 'finalize', table: 'products', identity: 77, data: { workflow: { confirmationStatus: 'pending' } } }, () =>
        payload.db.updateOne({ collection: 'products', id: 77, data: { workflow: { confirmationStatus: 'pending' } }, returning: false }))
      await sqlBudget.withSqlPhase({ phase: 'commit' }, async () => { sqlBudget.sql('commit') })
      for (const [collection, where] of [
        ['products', { id: { equals: 77 } }], ['products', { stockNumber: { equals: 'SN9001' } }],
        ['media', { product: { equals: 77 } }], ['products', { 'generativeGallery.image': { equals: 501 } }],
      ] as const) await sqlBudget.withSqlPhase({ table: collection,
        phase: 'stockNumber' in where ? 'stock' : 'generativeGallery.image' in where ? 'gallery' : 'read',
        identity: 'stockNumber' in where ? 'SN9001' : 'generativeGallery.image' in where ? 501 : 77 }, () =>
        payload.db.find({ collection, where, limit: 100, pagination: false }))
      for (const collection of ['media', 'products', 'image-generation-jobs', 'bot-events', 'story-jobs']) {
        await sqlBudget.withSqlPhase({ phase: collection === 'products' ? 'gallery' : 'read', table: collection.replaceAll('-', '_'), identity: collection === 'products' ? 501 : 77 }, () =>
          payload.db.find({ collection, where: collection === 'products' ? { 'generativeGallery.image': { equals: 501 } } : { product: { equals: 77 } },
            ...(['image-generation-jobs', 'bot-events', 'story-jobs'].includes(collection) ? { select: { id: true, product: true } } : {}),
            limit: 2, page: 1, sort: 'id', pagination: true }))
      }
      assert.equal(captured.some((statement) => statement.text.startsWith('insert into "products"')), true)
      assert.equal(captured.some((statement) => statement.text.startsWith('insert into "media"')), true)
      assert.equal(captured.some((statement) => statement.text.startsWith('insert into "products_images"')), true)
      assert.equal(captured.some((statement) => statement.text.startsWith('delete')), false, 'atomic array push must not delete other Product arrays')
      assert.equal(sqlBudget.report().actual.sqlStatements, captured.length + 2)
    } finally { await payload.db.destroy!() }
  }
  // Actual EventEmitter dispatch through the installed pg authentication and
  // connection error listeners, without opening a connection.
  let rejected = 0
  const EventClient = createControlledFreshCandidateSecurePgClientConstructor(pg.Client as unknown as ControlledFreshCandidatePgClientConstructor,
    { securityRejected: () => { rejected += 1 } })
  const eventClient = new EventClient({ connectionString: URI }) as unknown as pg.Client & {
    _connecting: boolean; _connectionCallback(error: Error): void; _attachListeners(connection: unknown): void
  }
  const rejection = new Promise<void>((resolve, reject) => { eventClient._connectionCallback = (error) => error ? reject(error) : resolve() })
  eventClient._connecting = true
  eventClient._attachListeners(eventClient.connection)
  assert.doesNotThrow(() => eventClient.connection.emit('authenticationSASL', { mechanisms: ['SCRAM-SHA-256'] }))
  await assert.rejects(rejection, /CONTROLLED_RUNTIME_CHANNEL_BINDING_REQUIRED/u)
  await eventClient.end()
  assert.ok(rejected >= 1)
  for (const mode of ['missing-plus', 'downgrade', 'cleartext', 'md5', 'continue-state', 'final-state', 'raw-final'] as const) {
    const eventBudget = createControlledFreshCandidateRuntimeBudget()
    let socketClosed = false
    const ActualEvents = createControlledFreshCandidateSecurePgClientConstructor(pg.Client as unknown as ControlledFreshCandidatePgClientConstructor, {
      channelBindingConfirmed: eventBudget.channelBindingConfirmed,
    })
    const actual = new ActualEvents({ connectionString: URI }) as unknown as pg.Client & {
      _connecting: boolean; _connectionCallback(error: Error): void; _attachListeners(connection: unknown): void;
      saslSession: { mechanism: string; message: string } | null
    }
    actual.connection.stream.destroy = () => { socketClosed = true; return actual.connection.stream }
    const result = new Promise<void>((resolve, reject) => { actual._connectionCallback = (error) => error ? reject(error) : resolve() })
    actual._connecting = true
    actual._attachListeners(actual.connection)
    if (mode === 'downgrade') (actual as unknown as { enableChannelBinding: boolean }).enableChannelBinding = false
    if (mode === 'raw-final') actual.saslSession = { mechanism: 'SCRAM-SHA-256-PLUS', message: 'impossible-state' }
    assert.doesNotThrow(() => actual.connection.emit(mode === 'cleartext' ? 'authenticationCleartextPassword' : mode === 'md5' ? 'authenticationMD5Password' : mode === 'continue-state' ? 'authenticationSASLContinue' : mode === 'final-state' || mode === 'raw-final' ? 'authenticationSASLFinal' : 'authenticationSASL',
      { mechanisms: mode === 'missing-plus' ? ['SCRAM-SHA-256'] : ['SCRAM-SHA-256-PLUS', 'SCRAM-SHA-256'], data: 'RAW_AUTH_FAULT_MUST_NOT_ESCAPE' }))
    await assert.rejects(result, (error: Error) => /^CONTROLLED_RUNTIME_[A-Z_]+$/u.test(error.message) && !error.message.includes('RAW'))
    // Real pg handles raw SASL-final errors internally; the sanitized connection
    // error listener must also close its physical stream, not just reject work.
    assert.equal(socketClosed, true, mode)
    assert.throws(() => eventBudget.applicationRead('products'), /CHANNEL_BINDING_NOT_CONFIRMED/u)
    await actual.end()
  }
  const storage = await import(pathToFileURL(path.resolve('node_modules/@payloadcms/plugin-cloud-storage/dist/hooks/afterChange.js')).href) as {
    getAfterChangeHook(options: unknown): (args: unknown) => Promise<unknown>
  }
  const keys = ['cfc-synthetic-operation-aabbccdd.png', ...[300, 600, 1200].map((size) => `cfc-synthetic-operation-aabbccdd-${size}x${size}.png`)]
  let metadataUpdates = 0
  const storageArgs = () => ({ doc: { id: 501, filename: keys[0], mimeType: 'image/png', sizes: {
    thumbnail: { filename: keys[1], mimeType: 'image/png' }, card: { filename: keys[2], mimeType: 'image/png' }, large: { filename: keys[3], mimeType: 'image/png' },
  } }, operation: 'create', req: { file: { data: Buffer.from([1]), size: 1 }, payloadUploadSizes: { thumbnail: Buffer.from([2]), card: Buffer.from([3]), large: Buffer.from([4]) },
    payload: { update: async () => { metadataUpdates += 1 }, logger: { warn() {}, error() {} } } } })
  const legacyStorageHook = storage.getAfterChangeHook({ collection: { slug: 'media' }, adapter: { handleUpload: async () => ({ filename: keys[0] }) } })
  await legacyStorageHook(storageArgs())
  assert.equal(metadataUpdates, 1, 'installed legacy metadata return reproduces an extra Media update')
  metadataUpdates = 0
  let activeUploads = 0
  let maximumUploads = 0
  const uploaded: string[] = []
  const handler = serializeControlledFreshCandidateUploads(async ({ file }: { file: { filename: string } }) => {
    activeUploads += 1; maximumUploads = Math.max(maximumUploads, activeUploads)
    await Promise.resolve(); uploaded.push(file.filename); activeUploads -= 1
    return undefined
  })
  await storage.getAfterChangeHook({ collection: { slug: 'media' }, adapter: { handleUpload: handler } })(storageArgs())
  assert.deepEqual(uploaded, keys)
  assert.equal(maximumUploads, 1)
  assert.equal(metadataUpdates, 0)
  await assert.rejects(handler({ file: { filename: keys[0] } }), /WRITE_BUDGET/u)
  const descriptors: ControlledFreshCandidateBlobDescriptor[] = keys.map((key, index) => ({ key,
    contentDigest: String(index + 1).repeat(64), byteSize: 10, mimeType: 'image/png', width: index ? [300, 600, 1200][index - 1] : 1,
    height: index ? [300, 600, 1200][index - 1] : 1, candidateIdentity: 'synthetic-candidate',
    originalContentDigest: '1'.repeat(64), operationId: 'synthetic-operation', authorizationIdentity: 'synthetic-authority', authorizationDigest: 'a'.repeat(64) }))
  const origin = 'https://synthetic.public.blob.vercel-storage.com'
  let bodyReads = 0
  const observationBudget = createControlledFreshCandidateRuntimeBudget()
  observationBudget.channelBindingConfirmed()
  const observationIo = {
    list: async () => ({ keys, hasMore: false }),
    head: async (key: string) => ({ ...descriptors.find((entry) => entry.key === key)!, url: `${origin}/${key}` }),
    read: async () => { bodyReads += 1; return descriptors[0] },
  }
  for (let snapshot = 0; snapshot < 2; snapshot += 1) {
    const observed = await observeControlledFreshCandidateBlobSet({ expected: descriptors, origin,
      signal: new AbortController().signal, budget: observationBudget, io: observationIo })
    assert.equal(observed.length, 4)
  }
  assert.equal(bodyReads, 0, 'sufficient head evidence must not download bodies')
  for (const invalid of [keys.slice(1), [...keys.slice(0, 3), keys[0]], [...keys.slice(0, 3), 'foreign.png'], [...keys, 'unexpected.png']]) {
    const refusedBudget = createControlledFreshCandidateRuntimeBudget(); refusedBudget.channelBindingConfirmed()
    await assert.rejects(observeControlledFreshCandidateBlobSet({ expected: descriptors, origin,
      signal: new AbortController().signal, budget: refusedBudget, io: { ...observationIo, list: async () => ({ keys: invalid, hasMore: false }) } }), /OBSERVED_SET_INVALID/u)
  }
  assert.equal(controlledFreshCandidateDatabaseUriIsCanonical(URI), true)
  for (const invalid of [
    URI.replace('verify-full', 'require'),
    URI.replace('channel_binding=require', 'channel_binding=disable'),
    `${URI}&sslmode=verify-full`,
    `${URI}&application_name=injected`,
  ]) assert.equal(controlledFreshCandidateDatabaseUriIsCanonical(invalid), false)

  const config = controlledFreshCandidateSecurePgConfig(URI, { max: 1, min: 0 })
  assert.equal(config.max, 1)
  assert.equal(config.min, 0)
  assert.equal(config.enableChannelBinding, true)
  assert.equal(String(config.connectionString).includes('sslmode'), false)
  const ssl = config.ssl as { rejectUnauthorized?: unknown; checkServerIdentity?: unknown }
  assert.equal(ssl.rejectUnauthorized, true)
  assert.equal(ssl.checkServerIdentity, checkServerIdentity)

  const budget = createControlledFreshCandidateRuntimeBudget()
  const Client = createControlledFreshCandidateSecurePgClientConstructor(
    FakeClient as unknown as ControlledFreshCandidatePgClientConstructor,
    {
      clientConstructed: budget.clientConstructed,
      connectionAttempted: budget.connectionAttempted,
      sql: budget.sql,
      channelBindingConfirmed: budget.channelBindingConfirmed,
    },
  )
  const client = new Client({ connectionString: URI }) as unknown as FakeClient
  client._handleAuthSASL({ mechanisms: [CONTROLLED_FRESH_CANDIDATE_REQUIRED_SASL_MECHANISM] })
  assert.throws(() => budget.applicationRead('products'), /CHANNEL_BINDING_NOT_CONFIRMED/u)
  ;(client as unknown as { _handleAuthSASLFinal(message: unknown): void })._handleAuthSASLFinal({})
  budget.applicationRead('products')
  await client.connect()
  await budget.withSqlPhase({ phase: 'bootstrap' }, () => client.query('SELECT 1'))
  assert.throws(() => new Client({ connectionString: URI }), /CONTROLLED_RUNTIME_BUDGET_EXHAUSTED/u)
  await assert.rejects(async () => client.connect(), /CONTROLLED_RUNTIME_BUDGET_EXHAUSTED/u)
  assert.throws(() => client.query('DROP TABLE products'), /CONTROLLED_RUNTIME_SQL_FORBIDDEN/u)

  FakeClient.selectedMechanism = 'SCRAM-SHA-256'
  const downgradeBudget = createControlledFreshCandidateRuntimeBudget()
  const DowngradeClient = createControlledFreshCandidateSecurePgClientConstructor(
    FakeClient as unknown as ControlledFreshCandidatePgClientConstructor,
    { channelBindingConfirmed: downgradeBudget.channelBindingConfirmed },
  )
  const downgrade = new DowngradeClient({ connectionString: URI }) as unknown as FakeClient
  assert.doesNotThrow(() => downgrade._handleAuthSASL({ mechanisms: [CONTROLLED_FRESH_CANDIDATE_REQUIRED_SASL_MECHANISM] }))
  assert.deepEqual(downgrade.emitted, ['CONTROLLED_RUNTIME_CHANNEL_BINDING_DOWNGRADE_REJECTED'])
  assert.throws(() => downgradeBudget.applicationRead('products'), /CONTROLLED_RUNTIME_CHANNEL_BINDING_NOT_CONFIRMED/u)

  FakeClient.selectedMechanism = CONTROLLED_FRESH_CANDIDATE_REQUIRED_SASL_MECHANISM
  const unavailable = new DowngradeClient({ connectionString: URI }) as unknown as FakeClient
  assert.doesNotThrow(() => unavailable._handleAuthSASL({ mechanisms: ['SCRAM-SHA-256'] }))
  assert.deepEqual(unavailable.emitted, ['CONTROLLED_RUNTIME_CHANNEL_BINDING_REQUIRED'])

  console.log('controlledFreshCandidatePgSecurity: ALL OK')
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
