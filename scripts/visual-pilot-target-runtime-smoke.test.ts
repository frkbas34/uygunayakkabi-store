import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import type { VisualPilotPage, VisualPilotTargetReadGateway } from '../src/lib/visualPilotTargetVerifier'
import {
  createVisualPilotMinimalRuntimeConfig,
  createVisualPilotRuntimeGateway,
  runVisualPilotTargetRuntimeSmoke,
  VISUAL_PILOT_TARGET_TEARDOWN_EXIT_CODE,
  visualPilotTargetUsage,
  type VisualPilotRuntimeIo,
  type VisualPilotRuntimePayload,
} from './visual-pilot-target-runtime-smoke'
import {
  createVisualPilotQueueReceiptReader,
  createVisualPilotRuntimeCleanup,
  type VisualPilotRuntimePostgresPool,
} from './visual-pilot-target-runtime-resources'

let passed = 0

async function check(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (error) {
    console.error(`  fail - ${name}\n    ${(error as Error).message}`)
    process.exitCode = 1
  }
}

function emptyPage(page: number, limit: number): VisualPilotPage {
  return { docs: [], totalDocs: 0, page, totalPages: 0, hasNextPage: false, limit }
}

function blockedGateway(): VisualPilotTargetReadGateway {
  return {
    async findProductCandidates() { return [] },
    async readProductMediaPage(_id, page, limit) { return emptyPage(page, limit) },
    async readImageJobPage(_id, page, limit) { return emptyPage(page, limit) },
    async readPayloadJobPage(_ids, page, limit) { return emptyPage(page, limit) },
    async readBotEventPage(_id, page, limit) { return emptyPage(page, limit) },
    async readStoryJobPage(_id, page, limit) { return emptyPage(page, limit) },
  }
}

function captureIo(): { io: VisualPilotRuntimeIo; stdout: string[]; stderr: string[] } {
  const stdout: string[] = []
  const stderr: string[] = []
  return {
    stdout,
    stderr,
    io: { stdout: (text) => stdout.push(text), stderr: (text) => stderr.push(text) },
  }
}

function payloadPage(
  docs: readonly Record<string, unknown>[],
  page: number,
  limit: number,
  totalDocs = docs.length,
): Record<string, unknown> {
  const totalPages = totalDocs === 0 ? 0 : Math.ceil(totalDocs / limit)
  return {
    docs: [...docs],
    totalDocs,
    page,
    totalPages,
    hasNextPage: page < totalPages,
    limit,
  }
}

function fakePayload(overrides: Partial<VisualPilotRuntimePayload> = {}): VisualPilotRuntimePayload {
  return {
    async find(args) {
      const page = Number(args.page ?? 1)
      const limit = Number(args.limit ?? 50)
      return payloadPage([], page, limit)
    },
    async findByID() { return null },
    async destroy() { return undefined },
    ...overrides,
  }
}

function queueReceiptRow(
  id: number,
  jobId: string,
  overrides: Partial<Record<'id' | 'taskSlug' | 'input' | 'processing' | 'completedAt' | 'hasError' | 'waitUntil', unknown>> = {},
): Record<string, unknown> {
  return {
    id,
    taskSlug: 'image-gen',
    input: { jobId },
    processing: false,
    completedAt: '2026-08-18T00:00:00.000Z',
    hasError: false,
    waitUntil: null,
    ...overrides,
  }
}

function idleItem(client: { release: () => void }): Record<string, unknown> {
  return { client, idleListener: () => undefined, timeoutId: undefined }
}

function runtimeClient(overrides: {
  end?: () => Promise<void> | void
  release?: () => void
  unref?: () => void
} = {}): {
  _ending: boolean
  end: () => Promise<void> | void
  release: () => void
  unref: () => void
} {
  const client = {
    _ending: false,
    end() {
      client._ending = true
      return overrides.end?.()
    },
    release() { overrides.release?.() },
    unref() { overrides.unref?.() },
  }
  return client
}

async function runLifecycleChild(): Promise<void> {
  let payloadDestroyCalls = 0
  let clientReleaseCalls = 0
  let poolEndCalls = 0
  const retainedHandle = setInterval(() => undefined, 60_000)
  const client = runtimeClient({
    release() {
      clientReleaseCalls += 1
      clearInterval(retainedHandle)
    },
  })
  const pool: VisualPilotRuntimePostgresPool = {
    _clients: [client],
    _idle: [],
    async query() { return { rows: [] } },
    async end() { poolEndCalls += 1 },
  }
  const cleanup = createVisualPilotRuntimeCleanup({
    payloadDestroy: async () => { payloadDestroyCalls += 1 },
    pool,
    timeoutMs: 250,
  })
  assert.deepEqual(await cleanup(), { ok: true })
  assert.deepEqual(await cleanup(), { ok: true })
  assert.equal(payloadDestroyCalls, 1)
  assert.equal(clientReleaseCalls, 1)
  assert.equal(poolEndCalls, 1)
  process.stdout.write('LIFECYCLE_CHILD_CLEAN_EXIT\n')
}

async function spawnOfflineChild(
  flag: '--incompatible-installed-pool-child' | '--lifecycle-child',
  label: string,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const child = spawn(process.execPath, [
    '--import',
    'tsx',
    fileURLToPath(import.meta.url),
    flag,
  ], { stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => { stdout += String(chunk) })
  child.stderr.on('data', (chunk) => { stderr += String(chunk) })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`${label} child did not exit within the offline boundary`))
    }, 3_000)
    child.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.once('exit', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr })
    })
  })
}

async function runIncompatibleInstalledPoolChild(): Promise<void> {
  let clientReleaseCalls = 0
  let clientEndCalls = 0
  let clientUnrefCalls = 0
  let poolEndCalls = 0
  let retainedHandleClosed = false
  const retainedHandle = setInterval(() => undefined, 60_000)
  const client = runtimeClient({
    release() { clientReleaseCalls += 1 },
    end() {
      clientEndCalls += 1
      retainedHandleClosed = true
      clearInterval(retainedHandle)
    },
    unref() {
      clientUnrefCalls += 1
      retainedHandle.unref()
    },
  })
  const installedPool = new Pool() as unknown as VisualPilotRuntimePostgresPool
  const originalPoolEnd = installedPool.end.bind(installedPool)
  installedPool.end = async () => {
    poolEndCalls += 1
    await originalPoolEnd()
  }
  installedPool._clients = [client]
  installedPool._idle = [client]
  const cleanup = createVisualPilotRuntimeCleanup({
    payloadDestroy: async () => undefined,
    pool: installedPool,
    timeoutMs: 250,
  })
  const captured = captureIo()
  const exitCode = await runVisualPilotTargetRuntimeSmoke({
    argv: ['--product=349', '--confirm-read-only'],
    initialize: async () => ({ dependencies: { gateway: blockedGateway() }, destroy: cleanup }),
    io: captured.io,
  })
  const first = await cleanup()
  const second = await cleanup()
  const output = [...captured.stdout, ...captured.stderr].join('\n')
  assert.equal(exitCode, VISUAL_PILOT_TARGET_TEARDOWN_EXIT_CODE)
  assert.deepEqual(first, { ok: false, code: 'RUNTIME_POSTGRES_CLIENT_CLEANUP_UNSUPPORTED' })
  assert.deepEqual(second, first)
  assert.equal(clientReleaseCalls, 0)
  assert.equal(clientEndCalls, 1)
  assert.equal(clientUnrefCalls, 1)
  assert.equal(poolEndCalls, 0)
  assert.equal(retainedHandleClosed, true)
  assert.ok(captured.stdout.some((text) => text.includes('TARGET_BLOCKED')))
  assert.deepEqual(captured.stderr, [
    'VISUAL_PILOT_TARGET_TEARDOWN_FAILURE: RUNTIME_POSTGRES_CLIENT_CLEANUP_UNSUPPORTED',
  ])
  assert.equal(output.includes('postgres://'), false)
  process.stdout.write('INCOMPATIBLE_INSTALLED_POOL_CHILD_CLEAN_EXIT\n')
  process.exitCode = exitCode
}

async function main(): Promise<void> {
await check('usage describes the exact confirmation-gated command boundary', () => {
  const usage = visualPilotTargetUsage()
  assert.ok(usage.includes('--product=<payload-product-id-or-stock-number>'))
  assert.ok(usage.includes('--confirm-read-only'))
  assert.ok(usage.includes('No writes'))
})

await check('missing confirmation refuses before Payload initializer', async () => {
  let initialized = 0
  const captured = captureIo()
  const exit = await runVisualPilotTargetRuntimeSmoke({
    argv: ['--product=349'],
    initialize: async () => { initialized += 1; throw new Error('must not initialize') },
    io: captured.io,
  })
  assert.equal(exit, 2)
  assert.equal(initialized, 0)
  assert.ok(captured.stderr[0]?.includes('CLI_READ_ONLY_CONFIRMATION_REQUIRED'))
})

await check('unknown, duplicate, and mutation-like flags refuse before initialization', async () => {
  for (const argv of [
    ['--product=349', '--confirm-read-only', '--unknown'],
    ['--product=349', '--product=350', '--confirm-read-only'],
    ['--product=349', '--confirm-read-only', '--publish'],
    ['--product=349', '--confirm-read-only', '--queue'],
  ]) {
    let initialized = 0
    const exit = await runVisualPilotTargetRuntimeSmoke({
      argv,
      initialize: async () => { initialized += 1; throw new Error('must not initialize') },
      io: captureIo().io,
    })
    assert.equal(exit, 2)
    assert.equal(initialized, 0)
  }
})

await check('help is side-effect free', async () => {
  let initialized = 0
  const exit = await runVisualPilotTargetRuntimeSmoke({
    argv: ['--help'],
    initialize: async () => { initialized += 1; throw new Error('must not initialize') },
    io: captureIo().io,
  })
  assert.equal(exit, 0)
  assert.equal(initialized, 0)
})

await check('blocked target returns nonzero and destroys Payload resource', async () => {
  let initialized = 0
  let destroyed = 0
  const captured = captureIo()
  const exit = await runVisualPilotTargetRuntimeSmoke({
    argv: ['--product=349', '--confirm-read-only'],
    initialize: async () => {
      initialized += 1
      return { dependencies: { gateway: blockedGateway() }, destroy: async () => { destroyed += 1 } }
    },
    io: captured.io,
  })
  assert.equal(exit, 3)
  assert.equal(initialized, 1)
  assert.equal(destroyed, 1)
  assert.ok(captured.stdout.some((text) => text.includes('TARGET_BLOCKED')))
})

await check('runtime cleanup is idempotent and closes each runtime-owned resource exactly once', async () => {
  let payloadDestroyCalls = 0
  let clientReleaseCalls = 0
  let poolEndCalls = 0
  const client = runtimeClient({ release() { clientReleaseCalls += 1 } })
  const pool: VisualPilotRuntimePostgresPool = {
    _clients: [client],
    _idle: [],
    async query() { return { rows: [] } },
    async end() { poolEndCalls += 1 },
  }
  const cleanup = createVisualPilotRuntimeCleanup({
    payloadDestroy: async () => { payloadDestroyCalls += 1 },
    pool,
  })
  assert.deepEqual(await cleanup(), { ok: true })
  assert.deepEqual(await cleanup(), { ok: true })
  assert.equal(payloadDestroyCalls, 1)
  assert.equal(clientReleaseCalls, 1)
  assert.equal(poolEndCalls, 1)
})

await check('runtime cleanup rejects every incompatible pinned pool shape before any client release', async () => {
  const cases: Array<{
    name: string
    clients: unknown
    idle: unknown
    getReleases: () => number
  }> = []
  const addCase = (name: string, build: (client: { release: () => void }) => { clients: unknown; idle: unknown }) => {
    let releases = 0
    const client = runtimeClient({ release() { releases += 1 } })
    const shape = build(client)
    cases.push({ name, ...shape, getReleases: () => releases })
  }
  addCase('missing _clients', () => ({ clients: undefined, idle: [] }))
  addCase('missing _idle', (client) => ({ clients: [client], idle: undefined }))
  addCase('non-container _clients', () => ({ clients: {}, idle: [] }))
  addCase('non-container _idle', (client) => ({ clients: [client], idle: {} }))
  addCase('malformed client', (client) => ({ clients: [client, {}], idle: [] }))
  addCase('IdleItem-shaped client entry', (client) => ({ clients: [{ ...idleItem(client), release: client.release }], idle: [] }))
  addCase('malformed idle item', (client) => ({ clients: [client], idle: [{ client }] }))
  addCase('ambiguous idle wrapper', (client) => ({ clients: [client], idle: [{ ...idleItem(client), release: client.release }] }))
  addCase('duplicate client identity', (client) => ({ clients: [client, client], idle: [] }))
  addCase('duplicate idle identity', (client) => ({ clients: [client], idle: [idleItem(client), idleItem(client)] }))
  addCase('idle client outside complete client set', (client) => ({
    clients: [client],
    idle: [idleItem({ release: client.release })],
  }))
  addCase('direct client instead of IdleItem wrapper', (client) => ({ clients: [client], idle: [client] }))
  addCase('exact reviewer probe shape', (client) => ({ clients: [client], idle: [client] }))

  for (const testCase of cases) {
    let poolEndCalls = 0
    const pool: VisualPilotRuntimePostgresPool = {
      _clients: testCase.clients,
      _idle: testCase.idle,
      async query() { return { rows: [] } },
      async end() { poolEndCalls += 1 },
    }
    const cleanup = createVisualPilotRuntimeCleanup({ payloadDestroy: async () => undefined, pool })
    assert.deepEqual(await cleanup(), { ok: false, code: 'RUNTIME_POSTGRES_CLIENT_CLEANUP_UNSUPPORTED' }, testCase.name)
    assert.deepEqual(await cleanup(), { ok: false, code: 'RUNTIME_POSTGRES_CLIENT_CLEANUP_UNSUPPORTED' }, testCase.name)
    assert.equal(testCase.getReleases(), 0, testCase.name)
    assert.equal(poolEndCalls, 0, testCase.name)
  }
})

await check('unsupported-shape terminal client timeout remains bounded and unrefs the handle once', async () => {
  let releases = 0
  let ends = 0
  let unrefs = 0
  let poolEnds = 0
  const retainedHandle = setInterval(() => undefined, 60_000)
  const client = runtimeClient({
    release() { releases += 1 },
    end() { ends += 1; return new Promise<void>(() => undefined) },
    unref() { unrefs += 1; retainedHandle.unref() },
  })
  const pool: VisualPilotRuntimePostgresPool = {
    _clients: [client],
    _idle: [client],
    async query() { return { rows: [] } },
    async end() { poolEnds += 1 },
  }
  const cleanup = createVisualPilotRuntimeCleanup({
    payloadDestroy: async () => undefined,
    pool,
    timeoutMs: 20,
  })
  assert.deepEqual(await cleanup(), { ok: false, code: 'RUNTIME_POSTGRES_CLIENT_CLEANUP_UNSUPPORTED' })
  assert.deepEqual(await cleanup(), { ok: false, code: 'RUNTIME_POSTGRES_CLIENT_CLEANUP_UNSUPPORTED' })
  assert.equal(releases, 0)
  assert.equal(ends, 1)
  assert.equal(unrefs, 1)
  assert.equal(poolEnds, 0)
  clearInterval(retainedHandle)
})

await check('runtime cleanup releases checked-out clients only and never releases an idle client', async () => {
  let checkedOutReleases = 0
  let idleReleases = 0
  let poolEndCalls = 0
  const checkedOut = runtimeClient({ release() { checkedOutReleases += 1 } })
  const idle = runtimeClient({ release() { idleReleases += 1 } })
  const pool: VisualPilotRuntimePostgresPool = {
    _clients: [checkedOut, idle],
    _idle: [idleItem(idle)],
    async query() { return { rows: [] } },
    async end() { poolEndCalls += 1 },
  }
  const cleanup = createVisualPilotRuntimeCleanup({ payloadDestroy: async () => undefined, pool })
  assert.deepEqual(await cleanup(), { ok: true })
  assert.deepEqual(await cleanup(), { ok: true })
  assert.equal(checkedOutReleases, 1)
  assert.equal(idleReleases, 0)
  assert.equal(poolEndCalls, 1)
})

await check('runtime cleanup timeout is bounded, sanitized, and still closes Postgres resources once', async () => {
  let clientReleaseCalls = 0
  let poolEndCalls = 0
  const pool: VisualPilotRuntimePostgresPool = {
    _clients: [runtimeClient({ release() { clientReleaseCalls += 1 } })],
    _idle: [],
    async query() { return { rows: [] } },
    async end() { poolEndCalls += 1 },
  }
  const cleanup = createVisualPilotRuntimeCleanup({
    payloadDestroy: () => new Promise<void>(() => undefined),
    pool,
    timeoutMs: 20,
  })
  assert.deepEqual(await cleanup(), { ok: false, code: 'RUNTIME_PAYLOAD_TEARDOWN_TIMEOUT' })
  assert.deepEqual(await cleanup(), { ok: false, code: 'RUNTIME_PAYLOAD_TEARDOWN_TIMEOUT' })
  assert.equal(clientReleaseCalls, 1)
  assert.equal(poolEndCalls, 1)
})

await check('runtime cleanup failures use stable codes and still attempt every owned resource', async () => {
  for (const testCase of [
    {
      expected: 'RUNTIME_PAYLOAD_TEARDOWN_FAILED',
      terminalized: false,
      payloadDestroy: async () => { throw new Error('sensitive payload detail') },
      release: () => undefined,
      poolEnd: async () => undefined,
    },
    {
      expected: 'RUNTIME_POSTGRES_CLIENT_CLEANUP_FAILED',
      terminalized: true,
      payloadDestroy: async () => undefined,
      release: () => { throw new Error('sensitive client detail') },
      poolEnd: async () => undefined,
    },
    {
      expected: 'RUNTIME_POSTGRES_POOL_CLOSE_FAILED',
      terminalized: true,
      payloadDestroy: async () => undefined,
      release: () => undefined,
      poolEnd: async () => { throw new Error('sensitive pool detail') },
    },
  ] as const) {
    let payloadDestroyCalls = 0
    let releaseCalls = 0
    let clientEndCalls = 0
    let clientUnrefCalls = 0
    let poolEndCalls = 0
    const pool: VisualPilotRuntimePostgresPool = {
      _clients: [runtimeClient({
        end() { clientEndCalls += 1 },
        release() { releaseCalls += 1; testCase.release() },
        unref() { clientUnrefCalls += 1 },
      })],
      _idle: [],
      async query() { return { rows: [] } },
      async end() { poolEndCalls += 1; await testCase.poolEnd() },
    }
    const cleanup = createVisualPilotRuntimeCleanup({
      payloadDestroy: async () => { payloadDestroyCalls += 1; await testCase.payloadDestroy() },
      pool,
    })
    assert.deepEqual(await cleanup(), { ok: false, code: testCase.expected })
    assert.equal(payloadDestroyCalls, 1)
    assert.equal(releaseCalls, 1)
    assert.equal(clientEndCalls, testCase.terminalized ? 1 : 0)
    assert.equal(clientUnrefCalls, testCase.terminalized ? 1 : 0)
    assert.equal(poolEndCalls, 1)
  }
})

await check('runtime pool-close timeout is bounded, sanitized, and cached', async () => {
  let clientReleaseCalls = 0
  let clientEndCalls = 0
  let clientUnrefCalls = 0
  let poolEndCalls = 0
  const pool: VisualPilotRuntimePostgresPool = {
    _clients: [runtimeClient({
      end() { clientEndCalls += 1 },
      release() { clientReleaseCalls += 1 },
      unref() { clientUnrefCalls += 1 },
    })],
    _idle: [],
    async query() { return { rows: [] } },
    end() { poolEndCalls += 1; return new Promise<void>(() => undefined) },
  }
  const cleanup = createVisualPilotRuntimeCleanup({
    payloadDestroy: async () => undefined,
    pool,
    timeoutMs: 20,
  })
  assert.deepEqual(await cleanup(), { ok: false, code: 'RUNTIME_POSTGRES_POOL_CLOSE_TIMEOUT' })
  assert.deepEqual(await cleanup(), { ok: false, code: 'RUNTIME_POSTGRES_POOL_CLOSE_TIMEOUT' })
  assert.equal(clientReleaseCalls, 1)
  assert.equal(clientEndCalls, 1)
  assert.equal(clientUnrefCalls, 1)
  assert.equal(poolEndCalls, 1)
})

await check('teardown failure preserves the completed verdict output and uses a sanitized execution status', async () => {
  const captured = captureIo()
  const secret = 'postgres://private-runtime-value'
  let destroyCalls = 0
  const exit = await runVisualPilotTargetRuntimeSmoke({
    argv: ['--product=349', '--confirm-read-only'],
    initialize: async () => ({
      dependencies: { gateway: blockedGateway() },
      destroy: async () => {
        destroyCalls += 1
        return { ok: false as const, code: 'RUNTIME_POSTGRES_POOL_CLOSE_FAILED' as const, detail: secret }
      },
    }),
    io: captured.io,
  })
  const output = [...captured.stdout, ...captured.stderr].join('\n')
  assert.equal(exit, VISUAL_PILOT_TARGET_TEARDOWN_EXIT_CODE)
  assert.equal(destroyCalls, 1)
  assert.ok(output.includes('TARGET_BLOCKED'))
  assert.ok(output.includes('VISUAL_PILOT_TARGET_TEARDOWN_FAILURE: RUNTIME_POSTGRES_POOL_CLOSE_FAILED'))
  assert.equal(output.includes(secret), false)
})

await check('real child process releases its retained synthetic handle and exits naturally', async () => {
  const child = await spawnOfflineChild('--lifecycle-child', 'lifecycle')
  assert.equal(child.code, 0, child.stderr)
  assert.ok(child.stdout.includes('LIFECYCLE_CHILD_CLEAN_EXIT'))
})

await check('installed pg-pool incompatible shape closes its retained handle and exits naturally with teardown status', async () => {
  const child = await spawnOfflineChild('--incompatible-installed-pool-child', 'incompatible installed-pool')
  assert.equal(child.code, VISUAL_PILOT_TARGET_TEARDOWN_EXIT_CODE, child.stderr)
  assert.ok(child.stdout.includes('INCOMPATIBLE_INSTALLED_POOL_CHILD_CLEAN_EXIT'))
})

await check('unsupported target uses the dedicated nonzero exit', async () => {
  const gateway = blockedGateway()
  gateway.findProductCandidates = async () => [{ id: 349 }]
  const exit = await runVisualPilotTargetRuntimeSmoke({
    argv: ['--product=349', '--confirm-read-only'],
    initialize: async () => ({ dependencies: { gateway }, destroy: async () => undefined }),
    io: captureIo().io,
  })
  assert.equal(exit, 4)
})

await check('unexpected initialization failure is sanitized and does not leak raw errors', async () => {
  const secret = 'postgres://user:HIGHLY_SECRET@database.example/db'
  const captured = captureIo()
  const exit = await runVisualPilotTargetRuntimeSmoke({
    argv: ['--product=349', '--confirm-read-only'],
    initialize: async () => { throw new Error(secret) },
    io: captured.io,
  })
  const output = [...captured.stdout, ...captured.stderr].join('\n')
  assert.equal(exit, 1)
  assert.equal(output.includes(secret), false)
  assert.equal(output.includes('postgres://'), false)
  assert.ok(output.includes('VISUAL_PILOT_TARGET_INTERNAL_FAILURE'))
})

await check('post-initialization execution failure still tears down exactly once', async () => {
  let destroyed = 0
  const gateway = blockedGateway()
  gateway.findProductCandidates = async () => [{ id: 349 }]
  const captured = captureIo()
  const exit = await runVisualPilotTargetRuntimeSmoke({
    argv: ['--product=349', '--confirm-read-only'],
    initialize: async () => ({
      dependencies: { gateway, now: () => { throw new Error('synthetic execution failure') } },
      destroy: async () => { destroyed += 1 },
    }),
    io: captured.io,
  })
  assert.equal(exit, 1)
  assert.equal(destroyed, 1)
  assert.deepEqual(captured.stderr, ['VISUAL_PILOT_TARGET_INTERNAL_FAILURE'])
})

await check('runtime adapter exposes reads only and never accesses injected mutation/provider/Telegram surfaces', async () => {
  const gateway = blockedGateway() as VisualPilotTargetReadGateway & Record<string, unknown>
  const forbidden = new Proxy({}, { get() { throw new Error('forbidden surface accessed') } })
  gateway.create = forbidden
  gateway.update = forbidden
  gateway.delete = forbidden
  gateway.queue = forbidden
  gateway.provider = forbidden
  gateway.telegram = forbidden
  const exit = await runVisualPilotTargetRuntimeSmoke({
    argv: ['--product=349', '--confirm-read-only'],
    initialize: async () => ({ dependencies: { gateway }, destroy: async () => undefined }),
    io: captureIo().io,
  })
  assert.equal(exit, 3)
})

await check('runtime product resolution binds numeric IDs and SN stock numbers without fallback', async () => {
  let idReads = 0
  let stockReads = 0
  const idGateway = createVisualPilotRuntimeGateway(fakePayload({
    async find(args) {
      stockReads += 1
      assert.deepEqual(args.where, { stockNumber: { equals: 'SN0117' } })
      return payloadPage([{ id: 349, stockNumber: 'SN0117' }], 1, 2)
    },
    async findByID(args) { idReads += 1; return { id: args.id, stockNumber: 'SN0117' } },
  }))
  assert.deepEqual(await idGateway.findProductCandidates('349'), [{ id: 349, stockNumber: 'SN0117' }])
  assert.equal(idReads, 1)
  assert.equal(stockReads, 0)
  assert.deepEqual(await idGateway.findProductCandidates('SN0117'), [{ id: 349, stockNumber: 'SN0117' }])
  assert.equal(idReads, 1)
  assert.equal(stockReads, 1)
})

await check('numeric Product ID cannot collide with an unrelated SN0349 product', async () => {
  let stockQueries = 0
  const gateway = createVisualPilotRuntimeGateway(fakePayload({
    async find() {
      stockQueries += 1
      return payloadPage([{ id: 777, stockNumber: 'SN0349' }], 1, 2)
    },
    async findByID(args) { return { id: args.id, stockNumber: 'SN0117' } },
  }))
  assert.deepEqual(await gateway.findProductCandidates('349'), [{ id: 349, stockNumber: 'SN0117' }])
  assert.equal(stockQueries, 0)
})

await check('runtime gateway reads exhaustive Product-scoped Media pages', async () => {
  const calls: Record<string, unknown>[] = []
  const gateway = createVisualPilotRuntimeGateway(fakePayload({
    async find(args) {
      calls.push(args)
      return payloadPage([{ id: 1001, product: 349, type: 'original' }], 1, 50)
    },
  }))
  const result = await gateway.readProductMediaPage(349, 1, 50)
  assert.equal(result.totalDocs, 1)
  assert.deepEqual(calls[0]?.where, { product: { equals: 349 } })
  assert.equal(calls[0]?.sort, 'id')
})

await check('real minimal runtime config uses the narrow durable queue reader without registering tasks', async () => {
  const queryCalls: { text: string; values?: unknown[] }[] = []
  let payloadFindCalls = 0
  const pool: VisualPilotRuntimePostgresPool = {
    _clients: [],
    _idle: [],
    async query(text, values) {
      queryCalls.push({ text, values })
      return {
        rows: [{
          total_docs: '2',
          docs: [
            queueReceiptRow(9001, '433'),
            queueReceiptRow(9002, '434', { completedAt: null, hasError: true }),
          ],
        }],
      }
    },
    async end() { return undefined },
  }
  const config = createVisualPilotMinimalRuntimeConfig({
    collections: [{ slug: 'products' }],
    db: { pool },
    editor: 'offline-editor',
    secret: 'synthetic-secret',
    sharp: 'offline-sharp',
  })
  assert.deepEqual(config.jobs, { tasks: [] })
  const payload = fakePayload({
    db: { pool },
    async find(args) {
      payloadFindCalls += 1
      return payloadPage([], Number(args.page ?? 1), Number(args.limit ?? 50))
    },
  })
  const gateway = createVisualPilotRuntimeGateway(payload, createVisualPilotQueueReceiptReader(pool))
  const result = await gateway.readPayloadJobPage([433, '434', 433], 1, 50)

  assert.equal(payloadFindCalls, 0)
  assert.equal(queryCalls.length, 1)
  assert.equal(result.totalDocs, 2)
  assert.match(queryCalls[0]!.text, /FROM payload_jobs/)
  assert.match(queryCalls[0]!.text, /input ->> 'jobId' = ANY\(\$1::text\[\]\)/)
  assert.match(queryCalls[0]!.text, /ORDER BY id ASC/)
  assert.deepEqual(queryCalls[0]!.values, [['433', '434'], 50, 0])
})

await check('durable queue reader paginates deterministically with exact bounded offsets', async () => {
  const queryValues: unknown[][] = []
  const allDocs = [
    queueReceiptRow(1, '433'),
    queueReceiptRow(2, '434'),
    queueReceiptRow(3, '435'),
  ]
  const pool: VisualPilotRuntimePostgresPool = {
    _clients: [],
    _idle: [],
    async query(_text, values = []) {
      queryValues.push(values)
      const limit = Number(values[1])
      const offset = Number(values[2])
      return { rows: [{ total_docs: '3', docs: allDocs.slice(offset, offset + limit) }] }
    },
    async end() { return undefined },
  }
  const reader = createVisualPilotQueueReceiptReader(pool)
  const first = await reader.readPage(['433', '434', '435'], 1, 2)
  const second = await reader.readPage(['433', '434', '435'], 2, 2)
  assert.deepEqual(first.docs.map((doc) => (doc as { id: number }).id), [1, 2])
  assert.deepEqual(second.docs.map((doc) => (doc as { id: number }).id), [3])
  assert.equal(first.hasNextPage, true)
  assert.equal(second.hasNextPage, false)
  assert.deepEqual(queryValues, [
    [['433', '434', '435'], 2, 0],
    [['433', '434', '435'], 2, 2],
  ])
})

await check('durable queue reader uses only the exact parameterized read-only SQL boundary and minimal fields', async () => {
  let capturedText = ''
  let capturedValues: unknown[] = []
  const pool: VisualPilotRuntimePostgresPool = {
    _clients: [],
    _idle: [],
    async query(text, values = []) {
      capturedText = text
      capturedValues = values
      return { rows: [{ total_docs: '1', docs: [queueReceiptRow(7, '433')] }] }
    },
    async end() { return undefined },
  }
  const result = await createVisualPilotQueueReceiptReader(pool).readPage(['433', 433], 1, 50)
  assert.deepEqual(capturedValues, [['433'], 50, 0])
  assert.match(capturedText, /WHERE task_slug = 'image-gen'/)
  assert.match(capturedText, /input ->> 'jobId' = ANY\(\$1::text\[\]\)/)
  assert.match(capturedText, /LIMIT \$2 OFFSET \$3/)
  assert.match(capturedText, /ORDER BY id ASC/)
  assert.doesNotMatch(capturedText, /\b(?:insert|update|delete|retry|cancel|create|alter|drop|truncate)\b/i)
  assert.deepEqual(Object.keys(result.docs[0]!).sort(), [
    'completedAt', 'hasError', 'id', 'input', 'processing', 'taskSlug', 'waitUntil',
  ])
  assert.deepEqual(Object.keys((result.docs[0]!.input as Record<string, unknown>)), ['jobId'])
})

await check('durable queue reader accepts an authoritative empty result without an extra query', async () => {
  let queryCalls = 0
  const pool: VisualPilotRuntimePostgresPool = {
    _clients: [],
    _idle: [],
    async query() { queryCalls += 1; return { rows: [{ total_docs: '0', docs: [] }] } },
    async end() { return undefined },
  }
  assert.deepEqual(await createVisualPilotQueueReceiptReader(pool).readPage(['433'], 1, 50), {
    docs: [], totalDocs: 0, page: 1, totalPages: 0, hasNextPage: false, limit: 50,
  })
  assert.equal(queryCalls, 1)
})

await check('durable queue reader rejects malformed rows, missing fields, wrong task/correlation, and invalid result containers', async () => {
  const valid = queueReceiptRow(1, '433')
  const missingWaitUntil = Object.fromEntries(
    Object.entries(valid).filter(([key]) => key !== 'waitUntil'),
  )
  const cases: Array<{ name: string; result: unknown; error: RegExp }> = [
    { name: 'invalid result object', result: null, error: /queue_receipt_page_malformed/ },
    { name: 'missing rows container', result: {}, error: /queue_receipt_page_malformed/ },
    { name: 'invalid rows container', result: { rows: {} }, error: /queue_receipt_page_malformed/ },
    { name: 'multiple aggregate rows', result: { rows: [{}, {}] }, error: /queue_receipt_page_malformed/ },
    { name: 'malformed row', result: { rows: [{ total_docs: '1', docs: [null] }] }, error: /queue_receipt_page_malformed/ },
    { name: 'missing required row field', result: { rows: [{ total_docs: '1', docs: [missingWaitUntil] }] }, error: /queue_receipt_page_malformed/ },
    { name: 'unexpected row field', result: { rows: [{ total_docs: '1', docs: [{ ...valid, other: true }] }] }, error: /queue_receipt_page_malformed/ },
    { name: 'wrong task', result: { rows: [{ total_docs: '1', docs: [queueReceiptRow(1, '433', { taskSlug: 'other' })] }] }, error: /queue_receipt_page_malformed/ },
    { name: 'wrong correlation', result: { rows: [{ total_docs: '1', docs: [queueReceiptRow(1, '999')] }] }, error: /queue_receipt_page_malformed/ },
    { name: 'invalid input shape', result: { rows: [{ total_docs: '1', docs: [queueReceiptRow(1, '433', { input: { jobId: '433', product: 349 } })] }] }, error: /queue_receipt_page_malformed/ },
    { name: 'invalid receipt id', result: { rows: [{ total_docs: '1', docs: [queueReceiptRow(0, '433')] }] }, error: /queue_receipt_page_malformed/ },
    { name: 'invalid processing', result: { rows: [{ total_docs: '1', docs: [queueReceiptRow(1, '433', { processing: 'false' })] }] }, error: /queue_receipt_page_malformed/ },
    { name: 'invalid completion date', result: { rows: [{ total_docs: '1', docs: [queueReceiptRow(1, '433', { completedAt: 'invalid' })] }] }, error: /queue_receipt_page_malformed/ },
    { name: 'invalid total type', result: { rows: [{ total_docs: 1, docs: [valid] }] }, error: /queue_receipt_page_malformed/ },
    { name: 'truncated result', result: { rows: [{ total_docs: '2', docs: [valid] }] }, error: /queue_receipt_page_inconsistent/ },
    { name: 'extra result', result: { rows: [{ total_docs: '0', docs: [valid] }] }, error: /queue_receipt_page_inconsistent/ },
  ]
  for (const testCase of cases) {
    const pool: VisualPilotRuntimePostgresPool = {
      _clients: [],
      _idle: [],
      async query() { return testCase.result as { rows?: unknown } },
      async end() { return undefined },
    }
    await assert.rejects(
      () => createVisualPilotQueueReceiptReader(pool).readPage(['433'], 1, 2),
      testCase.error,
      testCase.name,
    )
  }
})

await check('durable queue reader rejects duplicates, repeated pages, inconsistent metadata, and invalid termination', async () => {
  const duplicatePool: VisualPilotRuntimePostgresPool = {
    _clients: [],
    _idle: [],
    async query(_text, values = []) {
      return {
        rows: [{
          total_docs: '2',
          docs: [queueReceiptRow(1, Number(values[2]) === 0 ? '433' : '434')],
        }],
      }
    },
    async end() { return undefined },
  }
  const duplicateReader = createVisualPilotQueueReceiptReader(duplicatePool)
  await duplicateReader.readPage(['433', '434'], 1, 1)
  await assert.rejects(() => duplicateReader.readPage(['433', '434'], 2, 1), /queue_receipt_page_inconsistent/)

  let repeatedQueries = 0
  const repeatedPool: VisualPilotRuntimePostgresPool = {
    _clients: [],
    _idle: [],
    async query(_text, values = []) {
      repeatedQueries += 1
      const pageId = Number(values[2]) + 1
      return { rows: [{ total_docs: '3', docs: [queueReceiptRow(pageId, String(432 + pageId))] }] }
    },
    async end() { return undefined },
  }
  const repeatedReader = createVisualPilotQueueReceiptReader(repeatedPool)
  await repeatedReader.readPage(['433', '434', '435'], 1, 1)
  await repeatedReader.readPage(['433', '434', '435'], 2, 1)
  await assert.rejects(() => repeatedReader.readPage(['433', '434', '435'], 2, 1), /queue_receipt_page_sequence_invalid/)
  assert.equal(repeatedQueries, 2)

  let page = 0
  const inconsistentPool: VisualPilotRuntimePostgresPool = {
    _clients: [],
    _idle: [],
    async query() {
      page += 1
      return page === 1
        ? { rows: [{ total_docs: '2', docs: [queueReceiptRow(1, '433')] }] }
        : { rows: [{ total_docs: '3', docs: [queueReceiptRow(2, '434')] }] }
    },
    async end() { return undefined },
  }
  const inconsistentReader = createVisualPilotQueueReceiptReader(inconsistentPool)
  await inconsistentReader.readPage(['433', '434'], 1, 1)
  await assert.rejects(() => inconsistentReader.readPage(['433', '434'], 2, 1), /queue_receipt_page_inconsistent/)
  await assert.rejects(() => createVisualPilotQueueReceiptReader(inconsistentPool).readPage(['433'], 2, 1), /queue_receipt_page_sequence_invalid/)

  let completedQueries = 0
  const completedPool: VisualPilotRuntimePostgresPool = {
    _clients: [],
    _idle: [],
    async query() {
      completedQueries += 1
      return { rows: [{ total_docs: '1', docs: [queueReceiptRow(1, '433')] }] }
    },
    async end() { return undefined },
  }
  const completedReader = createVisualPilotQueueReceiptReader(completedPool)
  await completedReader.readPage(['433'], 1, 1)
  await assert.rejects(() => completedReader.readPage(['433'], 2, 1), /queue_receipt_page_sequence_invalid/)
  assert.equal(completedQueries, 1)
})

await check('durable queue reader sanitizes query rejection and validates boundaries before querying', async () => {
  const sensitive = ['postgres', '://', 'private', '-host/secret?', 'credential', '=value'].join('')
  let queries = 0
  const pool: VisualPilotRuntimePostgresPool = {
    _clients: [],
    _idle: [],
    async query() { queries += 1; throw new Error(sensitive) },
    async end() { return undefined },
  }
  const reader = createVisualPilotQueueReceiptReader(pool)
  await assert.rejects(
    () => reader.readPage(['433'], 1, 50),
    (error: unknown) => error instanceof Error
      && error.message === 'queue_receipt_query_failed'
      && !error.message.includes(sensitive),
  )
  await assert.rejects(() => reader.readPage(['invalid'], 1, 50), /queue_receipt_job_ids_invalid/)
  await assert.rejects(() => reader.readPage(['433'], 0, 50), /queue_receipt_page_boundary_invalid/)
  await assert.rejects(() => reader.readPage(['433'], 1, 0), /queue_receipt_page_boundary_invalid/)
  assert.equal(queries, 1)
  assert.deepEqual(Object.keys(reader), ['readPage'])
})

await check('runtime gateway performs no queue collection read when the target has no image jobs', async () => {
  let finds = 0
  const gateway = createVisualPilotRuntimeGateway(fakePayload({
    async find() { finds += 1; throw new Error('must not query') },
  }))
  const result = await gateway.readPayloadJobPage([], 1, 50)
  assert.equal(finds, 0)
  assert.deepEqual(result, emptyPage(1, 50))
})

await check('runtime gateway rejects malformed or skipped Payload pages', async () => {
  const malformedPages: Record<string, unknown>[] = [
    { docs: [], totalDocs: 0, page: 1, totalPages: 0, hasNextPage: 'false', limit: 50 },
    { docs: [{ id: 1 }], totalDocs: 2, page: 1, totalPages: 1, hasNextPage: false, limit: 50 },
    { docs: [], totalDocs: 0, page: 1, totalPages: 2, hasNextPage: false, limit: 50 },
    { docs: [], totalDocs: 0, page: 2, totalPages: 0, hasNextPage: false, limit: 50 },
    { docs: [], totalDocs: 0, page: 1, totalPages: 0, hasNextPage: false, limit: 49 },
  ]
  for (const malformed of malformedPages) {
    const gateway = createVisualPilotRuntimeGateway(fakePayload({ async find() { return malformed } }))
    await assert.rejects(() => gateway.readImageJobPage(349, 1, 50), /payload_page_/)
  }
})

await check('runtime gateway preserves valid page metadata without coercion', async () => {
  const page = payloadPage([{ id: 428 }, { id: 433 }], 1, 2, 3)
  const gateway = createVisualPilotRuntimeGateway(fakePayload({ async find() { return page } }))
  const result = await gateway.readImageJobPage(349, 1, 2)
  assert.deepEqual(result, page)
})

await check('runtime gateway propagates product and Media infrastructure failures', async () => {
  const infrastructureFailure = new Error('database_connection_failed')
  const gateway = createVisualPilotRuntimeGateway(fakePayload({
    async find() { throw infrastructureFailure },
    async findByID() { throw infrastructureFailure },
  }))
  await assert.rejects(() => gateway.findProductCandidates('349'), infrastructureFailure)
  await assert.rejects(() => gateway.readProductMediaPage(349, 1, 50), infrastructureFailure)
})

await check('runtime gateway treats only explicit numeric findByID null as absent', async () => {
  const calls: Record<string, unknown>[] = []
  const gateway = createVisualPilotRuntimeGateway(fakePayload({
    async findByID(args) { calls.push(args); return null },
  }))
  assert.deepEqual(await gateway.findProductCandidates('349'), [])
  assert.equal(calls.length, 1)
  assert.equal(calls.every((call) => call.disableErrors === true), true)
})

console.log(`\n${passed} visual pilot runtime smoke tests passed.`)
if (process.exitCode) process.exit(process.exitCode)
}

if (process.argv.includes('--incompatible-installed-pool-child')) {
  void runIncompatibleInstalledPoolChild().catch(() => {
    console.error('incompatible_installed_pool_child_failed')
    process.exitCode = 1
  })
} else if (process.argv.includes('--lifecycle-child')) {
  void runLifecycleChild().catch((error) => {
    console.error((error as Error).message)
    process.exitCode = 1
  })
} else {
  void main()
}
