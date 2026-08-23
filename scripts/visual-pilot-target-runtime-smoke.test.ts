import assert from 'node:assert/strict'

import type { VisualPilotPage, VisualPilotTargetReadGateway } from '../src/lib/visualPilotTargetVerifier'
import {
  createVisualPilotRuntimeGateway,
  runVisualPilotTargetRuntimeSmoke,
  visualPilotTargetUsage,
  type VisualPilotRuntimeIo,
  type VisualPilotRuntimePayload,
} from './visual-pilot-target-runtime-smoke'

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

await check('runtime gateway scopes queue receipts by exact target job IDs in Payload', async () => {
  const calls: Record<string, unknown>[] = []
  const payload = fakePayload({
    async find(args) {
      calls.push(args)
      return payloadPage([
        { id: 9001, taskSlug: 'image-gen', input: { jobId: '433' }, completedAt: '2026-08-18T00:00:00.000Z' },
        { id: 9002, taskSlug: 'image-gen', input: { jobId: '434' }, hasError: true },
      ], 1, 50)
    },
  })
  const gateway = createVisualPilotRuntimeGateway(payload)
  const result = await gateway.readPayloadJobPage([433, '434', 433], 1, 50)

  assert.equal(calls.length, 1)
  assert.equal(result.totalDocs, 2)
  assert.deepEqual(calls[0]?.where, {
    and: [
      { taskSlug: { equals: 'image-gen' } },
      { 'input.jobId': { in: ['433', '434'] } },
    ],
  })
  assert.deepEqual(calls[0]?.select, {
    completedAt: true,
    hasError: true,
    input: true,
    processing: true,
    taskSlug: true,
    waitUntil: true,
  })
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

void main()
