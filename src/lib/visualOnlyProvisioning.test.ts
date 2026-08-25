import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { PayloadRequest } from 'payload'

import {
  createVisualOnlyDeliveryDigest,
  parseVisualOnlyProvisioningEvidence,
  provisionVisualOnlyV01,
  VISUAL_ONLY_PROVISIONING_IDEMPOTENCY_CORRUPT,
  VISUAL_ONLY_PROVISIONING_POST_COMMIT_UNQUALIFIED,
  VISUAL_ONLY_PROVISIONING_REUSE_UNQUALIFIED,
  type VisualOnlyProvisioningAdapter,
  type VisualOnlyProvisioningInput,
} from './visualOnlyProvisioning'

type RecordValue = Record<string, unknown>
type DurableState = {
  product: RecordValue
  imageJobs: RecordValue[]
  queueJobs: RecordValue[]
  nextImageJobId: number
  nextQueueJobId: number
}
type Request = {
  kind: 'transaction' | 'post-commit'
  state?: DurableState
  transactionID?: string
  release?: () => void
}
type Fault =
  | 'create'
  | 'manifest'
  | 'queue'
  | 'receipt'
  | 'product'
  | 'commit'
  | 'installed-suppressed-commit'
  | 'post-commit-read'

function clone<T>(value: T): T {
  return structuredClone(value)
}

function isolatedProduct(): RecordValue {
  return {
    id: 77,
    title: 'Atomic Visual Product',
    stockNumber: 'SN0077',
    status: 'draft',
    images: [{ image: 701 }, { image: 702 }, { image: 703 }],
    generativeGallery: [],
    workflow: {
      workflowStatus: 'draft',
      visualStatus: 'pending',
      confirmationStatus: 'pending',
      publishStatus: 'not_requested',
      sellable: false,
    },
    channels: {
      publishWebsite: false,
      publishInstagram: false,
      publishFacebook: false,
      publishX: false,
      publishShopier: false,
    },
    channelTargets: [],
    sourceMeta: {
      dispatchedChannels: '[]',
      shopierSyncStatus: 'not_synced',
      storyStatus: 'none',
      forceRedispatch: false,
      previewDispatch: false,
      externalSyncId: null,
      lastDispatchedAt: null,
      shopierProductId: null,
      shopierProductUrl: null,
      shopierLastSyncAt: null,
      storyQueuedAt: null,
      storyPublishedAt: null,
    },
    merchandising: { publishedAt: null },
    postToInstagram: false,
  }
}

class Mutex {
  private tail = Promise.resolve()

  async acquire(): Promise<() => void> {
    let release!: () => void
    const turn = new Promise<void>((resolve) => { release = resolve })
    const prior = this.tail
    this.tail = this.tail.then(() => turn)
    await prior
    return release
  }
}

class Barrier {
  private arrivals = 0
  private readonly open: Promise<void>
  private release!: () => void

  constructor(private readonly target: number) {
    this.open = new Promise((resolve) => { this.release = resolve })
  }

  async arrive(): Promise<void> {
    this.arrivals += 1
    if (this.arrivals === this.target) this.release()
    await this.open
  }
}

function fixture(options: { barrier?: Barrier; fault?: Fault; unrelatedQueue?: boolean } = {}) {
  let durable: DurableState = {
    product: isolatedProduct(),
    imageJobs: [],
    queueJobs: options.unrelatedQueue ? [{
      id: 900,
      taskSlug: 'unrelated-task',
      input: { unrelated: true },
      processing: false,
      hasError: false,
      completedAt: null,
    }] : [],
    nextImageJobId: 1,
    nextQueueJobId: 1001,
  }
  const mutex = new Mutex()
  let fault = options.fault
  const calls = {
    transactions: 0,
    freshRequests: 0,
    locks: 0,
    creates: 0,
    imageJobUpdates: 0,
    queues: 0,
    receiptReads: 0,
    productUpdates: 0,
    runners: 0,
    provider: 0,
  }
  const requestLog: Array<{ operation: string; request: Request }> = []
  const consumeFault = (candidate: Fault): boolean => {
    if (fault !== candidate) return false
    fault = undefined
    return true
  }
  const transactionState = (request: Request): DurableState => {
    if (request.kind !== 'transaction' || !request.state) {
      throw new Error('test write was not Product-locked in the transaction')
    }
    return request.state
  }
  const readState = (request: Request): DurableState => request.kind === 'transaction'
    ? transactionState(request)
    : durable
  const record = (operation: string, request: Request): void => {
    requestLog.push({ operation, request })
  }
  const adapter: VisualOnlyProvisioningAdapter<Request> = {
    async runAtomic(operation) {
      calls.transactions += 1
      if (options.barrier) await options.barrier.arrive()
      const request: Request = {
        kind: 'transaction',
        transactionID: `test-transaction-${calls.transactions}`,
      }
      try {
        const result = await operation(request)
        if (consumeFault('commit')) throw new Error('INJECTED_COMMIT_FAILURE')
        if (consumeFault('installed-suppressed-commit')) {
          const { commitTransaction } = await import(
            '../../node_modules/@payloadcms/drizzle/dist/transactions/commitTransaction.js'
          )
          const installedCommit = commitTransaction as unknown as (
            this: { sessions: Record<string, RecordValue> },
            transactionID: string,
          ) => Promise<void>
          let rejected = 0
          const installedRuntime = {
            sessions: {
              installed: {
                resolve: async () => { throw new Error('INSTALLED_DATABASE_COMMIT_REJECTED') },
                reject: async () => { rejected += 1 },
              },
            },
          }
          await installedCommit.call(installedRuntime, 'installed')
          assert.equal(rejected, 1)
          assert.deepEqual(installedRuntime.sessions, {})
          return result
        }
        durable = clone(transactionState(request))
        return result
      } finally {
        request.release?.()
      }
    },
    async createPostCommitRequest() {
      calls.freshRequests += 1
      return { kind: 'post-commit' }
    },
    async requestHasTransaction(request) {
      return Boolean(request.transactionID)
    },
    async lockProduct(request, productId) {
      record('lockProduct', request)
      calls.locks += 1
      request.release = await mutex.acquire()
      request.state = clone(durable)
      return request.state.product.id === productId
    },
    async readProduct(request) {
      record('readProduct', request)
      return clone(readState(request).product)
    },
    async readProductJobs(request) {
      record('readProductJobs', request)
      return clone(readState(request).imageJobs)
    },
    async createImageJob(request, data) {
      record('createImageJob', request)
      calls.creates += 1
      const current = transactionState(request)
      const job = { id: current.nextImageJobId++, ...clone(data) }
      current.imageJobs.push(job)
      if (consumeFault('create')) throw new Error('INJECTED_JOB_CREATE_FAILURE')
      return clone(job)
    },
    async updateImageJob(request, jobId, data) {
      record('updateImageJob', request)
      calls.imageJobUpdates += 1
      if (consumeFault('manifest')) throw new Error('INJECTED_MANIFEST_FAILURE')
      const job = transactionState(request).imageJobs.find((entry) => String(entry.id) === jobId)
      if (!job) throw new Error('test job missing')
      Object.assign(job, clone(data))
    },
    async readImageJob(request, jobId) {
      record('readImageJob', request)
      if (request.kind === 'post-commit' && consumeFault('post-commit-read')) {
        throw new Error('TRANSIENT_POST_COMMIT_READ_FAILURE')
      }
      return clone(readState(request).imageJobs.find((entry) => String(entry.id) === jobId) ?? null)
    },
    async queueImageJob(request, input) {
      record('queueImageJob', request)
      calls.queues += 1
      if (consumeFault('queue')) throw new Error('INJECTED_QUEUE_FAILURE')
      const current = transactionState(request)
      const receipt = {
        id: current.nextQueueJobId++,
        taskSlug: 'image-gen',
        input: clone(input),
        processing: false,
        hasError: false,
        completedAt: null,
      }
      current.queueJobs.push(receipt)
      return clone(receipt)
    },
    async readQueueReceipt(request, receiptId) {
      record('readQueueReceipt', request)
      calls.receiptReads += 1
      if (consumeFault('receipt')) throw new Error('INJECTED_RECEIPT_FAILURE')
      return clone(readState(request).queueJobs.find((entry) => String(entry.id) === receiptId) ?? null)
    },
    async updateProduct(request, productId, data) {
      record('updateProduct', request)
      calls.productUpdates += 1
      if (consumeFault('product')) throw new Error('INJECTED_PRODUCT_UPDATE_FAILURE')
      const current = transactionState(request)
      if (current.product.id !== productId) throw new Error('test product missing')
      Object.assign(current.product, clone(data))
    },
  }
  return {
    adapter,
    calls,
    mutate(operation: (state: DurableState) => void) {
      operation(durable)
    },
    requestLog,
    snapshot: () => clone(durable),
  }
}

function deliveryDigest(updateId = 5001, messageId = 61): string {
  return createVisualOnlyDeliveryDigest({
    botIdentity: 'uygunops',
    chatId: 770077,
    updateId,
    messageId,
    userId: 7700,
  })
}

function input(digest = deliveryDigest()): VisualOnlyProvisioningInput {
  return {
    productId: 77,
    stockNumber: 'SN0077',
    productFamily: 'generic',
    mode: 'hizli',
    modeLabel: 'Hızlı',
    reviewChatId: '770077',
    reviewerUserId: '7700',
    deliveryDigest: digest,
    createNonce: () => 'a'.repeat(32),
  }
}

function assertOneCompleteProvisioning(value: DurableState): void {
  assert.equal(value.imageJobs.length, 1)
  assert.equal(value.queueJobs.filter((job) => job.taskSlug === 'image-gen').length, 1)
  const imageJob = value.imageJobs[0]
  const queueJob = value.queueJobs.find((job) => job.taskSlug === 'image-gen')
  const evidence = parseVisualOnlyProvisioningEvidence(imageJob)
  assert.ok(evidence)
  assert.ok(queueJob)
  assert.equal(evidence.binding.queueReceiptId, String(queueJob.id))
  assert.equal(evidence.binding.manifestDigest, evidence.manifest.digest)
  assert.equal((queueJob.input as RecordValue).productId, 77)
  assert.equal((queueJob.input as RecordValue).visualOnlyDeliveryDigest, evidence.binding.deliveryDigest)
  assert.equal((queueJob.input as RecordValue).visualOnlyManifestDigest, evidence.binding.manifestDigest)
  assert.equal((value.product.workflow as RecordValue).visualStatus, 'generating')
  assert.equal((value.product.workflow as RecordValue).workflowStatus, 'visual_pending')
  assert.equal(value.product.status, 'draft')
  assert.equal((value.product.workflow as RecordValue).sellable, false)
}

function assertRolledBack(value: DurableState): void {
  assert.deepEqual(value.imageJobs, [])
  assert.deepEqual(value.queueJobs, [])
  assert.equal((value.product.workflow as RecordValue).visualStatus, 'pending')
  assert.equal((value.product.workflow as RecordValue).workflowStatus, 'draft')
}

async function testConcurrentRedelivery(): Promise<void> {
  const runtime = fixture({ barrier: new Barrier(2) })
  const results = await Promise.all([
    provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() }),
    provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() }),
  ])
  assert.deepEqual(results.map((result) => result.kind).sort(), ['provisioned', 'reused'])
  assert.equal(new Set(results.map((result) => result.jobId)).size, 1)
  assert.equal(new Set(results.map((result) => result.queueReceiptId)).size, 1)
  assertOneCompleteProvisioning(runtime.snapshot())
  assert.equal(runtime.calls.creates, 1)
  assert.equal(runtime.calls.queues, 1)
  assert.equal(runtime.calls.provider, 0)
}

async function testSequentialRedelivery(): Promise<void> {
  const runtime = fixture()
  const first = await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
  const writesBefore = {
    creates: runtime.calls.creates,
    imageJobUpdates: runtime.calls.imageJobUpdates,
    productUpdates: runtime.calls.productUpdates,
    queues: runtime.calls.queues,
  }
  const receiptReadsBefore = runtime.calls.receiptReads
  const second = await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
  assert.equal(first.kind, 'provisioned')
  assert.deepEqual(second, { kind: 'reused', jobId: first.jobId, queueReceiptId: first.queueReceiptId })
  assert.deepEqual({
    creates: runtime.calls.creates,
    imageJobUpdates: runtime.calls.imageJobUpdates,
    productUpdates: runtime.calls.productUpdates,
    queues: runtime.calls.queues,
  }, writesBefore)
  assert.equal(runtime.calls.receiptReads - receiptReadsBefore, 2)
  assert.equal(runtime.calls.runners, 0)
  assertOneCompleteProvisioning(runtime.snapshot())
}

async function testDifferentConcurrentDeliveries(): Promise<void> {
  const runtime = fixture({ barrier: new Barrier(2) })
  const results = await Promise.all([
    provisionVisualOnlyV01({ adapter: runtime.adapter, input: input(deliveryDigest(5001, 61)) }),
    provisionVisualOnlyV01({ adapter: runtime.adapter, input: input(deliveryDigest(5002, 62)) }),
  ])
  assert.deepEqual(results.map((result) => result.kind).sort(), ['active', 'provisioned'])
  assert.equal(new Set(results.map((result) => result.jobId)).size, 1)
  assertOneCompleteProvisioning(runtime.snapshot())
}

async function testRollbackAndRetry(fault: Exclude<Fault, 'commit' | 'installed-suppressed-commit' | 'post-commit-read'>, message: RegExp): Promise<void> {
  const runtime = fixture({ fault })
  await assert.rejects(
    () => provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() }),
    message,
  )
  assertRolledBack(runtime.snapshot())
  const retry = await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
  assert.equal(retry.kind, 'provisioned')
  assertOneCompleteProvisioning(runtime.snapshot())
  assert.equal(runtime.calls.creates, 2)
  assert.equal(runtime.calls.queues, fault === 'create' || fault === 'manifest' ? 1 : 2)
}

async function testCommitRollback(): Promise<void> {
  const runtime = fixture({ fault: 'commit' })
  await assert.rejects(
    () => provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() }),
    /INJECTED_COMMIT_FAILURE/,
  )
  assertRolledBack(runtime.snapshot())
}

async function testInstalledSuppressedCommitAndCleanRetry(): Promise<void> {
  const runtime = fixture({ fault: 'installed-suppressed-commit' })
  let scheduled = 0
  let successAcknowledgements = 0
  await assert.rejects(
    async () => {
      await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
      scheduled += 1
      successAcknowledgements += 1
    },
    new RegExp(VISUAL_ONLY_PROVISIONING_POST_COMMIT_UNQUALIFIED),
  )
  assertRolledBack(runtime.snapshot())
  assert.equal(scheduled, 0)
  assert.equal(successAcknowledgements, 0)
  assert.equal(runtime.calls.runners, 0)

  const retry = await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
  assert.equal(retry.kind, 'provisioned')
  assertOneCompleteProvisioning(runtime.snapshot())
  assert.equal(runtime.calls.creates, 2)
  assert.equal(runtime.calls.queues, 2)
}

async function testTransientPostCommitReadAndReuse(): Promise<void> {
  const runtime = fixture({ fault: 'post-commit-read' })
  await assert.rejects(
    () => provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() }),
    new RegExp(VISUAL_ONLY_PROVISIONING_POST_COMMIT_UNQUALIFIED),
  )
  assertOneCompleteProvisioning(runtime.snapshot())
  const writesBefore = clone(runtime.calls)
  const retry = await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
  assert.equal(retry.kind, 'reused')
  assert.equal(runtime.calls.creates, writesBefore.creates)
  assert.equal(runtime.calls.imageJobUpdates, writesBefore.imageJobUpdates)
  assert.equal(runtime.calls.productUpdates, writesBefore.productUpdates)
  assert.equal(runtime.calls.queues, writesBefore.queues)
  assertOneCompleteProvisioning(runtime.snapshot())
}

async function testCorruptRawIdempotencyBinding(): Promise<void> {
  const runtime = fixture()
  await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
  const before = clone(runtime.calls)
  runtime.mutate((state) => {
    const prompts = JSON.parse(String(state.imageJobs[0]?.promptsUsed)) as RecordValue
    const binding = prompts.visualOnlyProvisioning as RecordValue
    delete binding.queueReceiptId
    state.imageJobs[0]!.promptsUsed = JSON.stringify(prompts)
  })
  await assert.rejects(
    () => provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() }),
    new RegExp(VISUAL_ONLY_PROVISIONING_IDEMPOTENCY_CORRUPT),
  )
  assert.equal(runtime.calls.creates, before.creates)
  assert.equal(runtime.calls.queues, before.queues)
  assert.equal(runtime.calls.provider, 0)
  assert.equal(runtime.snapshot().imageJobs.length, 1)
}

async function testUndecodableRawIdempotencyBinding(): Promise<void> {
  const runtime = fixture()
  await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
  runtime.mutate((state) => {
    state.imageJobs[0]!.promptsUsed = `{"deliveryDigest":"${deliveryDigest()}"`
  })
  await assert.rejects(
    () => provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() }),
    new RegExp(VISUAL_ONLY_PROVISIONING_IDEMPOTENCY_CORRUPT),
  )
  assert.equal(runtime.calls.creates, 1)
  assert.equal(runtime.calls.queues, 1)
}

async function testMissingAndTerminalReceiptReuse(): Promise<void> {
  {
    const runtime = fixture()
    await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
    runtime.mutate((state) => { state.queueJobs = [] })
    const readsBefore = runtime.calls.receiptReads
    await assert.rejects(
      () => provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() }),
      new RegExp(VISUAL_ONLY_PROVISIONING_REUSE_UNQUALIFIED),
    )
    assert.equal(runtime.calls.receiptReads - readsBefore, 1)
    assert.equal(runtime.calls.creates, 1)
    assert.equal(runtime.calls.queues, 1)
    assert.equal(runtime.snapshot().imageJobs.length, 1)
  }
  {
    const runtime = fixture()
    await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
    runtime.mutate((state) => {
      const receipt = state.queueJobs[0]!
      receipt.hasError = true
      receipt.completedAt = '2026-08-26T00:00:00.000Z'
    })
    await assert.rejects(
      () => provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() }),
      new RegExp(VISUAL_ONLY_PROVISIONING_REUSE_UNQUALIFIED),
    )
    assert.equal(runtime.calls.creates, 1)
    assert.equal(runtime.calls.queues, 1)
  }
}

async function testForeignReceiptReuse(): Promise<void> {
  const runtime = fixture()
  await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
  runtime.mutate((state) => {
    (state.queueJobs[0]!.input as RecordValue).productId = 88
  })
  await assert.rejects(
    () => provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() }),
    new RegExp(VISUAL_ONLY_PROVISIONING_REUSE_UNQUALIFIED),
  )
  assert.equal(runtime.calls.creates, 1)
  assert.equal(runtime.calls.queues, 1)
}

async function testDuplicatedDeliveryEvidence(): Promise<void> {
  const runtime = fixture()
  await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
  runtime.mutate((state) => {
    state.imageJobs.push({ ...clone(state.imageJobs[0]!), id: 2 })
  })
  await assert.rejects(
    () => provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() }),
    /VISUAL_ONLY_PROVISIONING_IDEMPOTENCY_AMBIGUOUS/,
  )
  assert.equal(runtime.calls.creates, 1)
  assert.equal(runtime.calls.queues, 1)
}

async function testRequestIdentity(): Promise<void> {
  const runtime = fixture()
  await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
  const transactionEntries = runtime.requestLog.filter((entry) => entry.request.kind === 'transaction')
  const postCommitEntries = runtime.requestLog.filter((entry) => entry.request.kind === 'post-commit')
  const transactionRequest = transactionEntries[0]?.request
  const postCommitRequest = postCommitEntries[0]?.request
  assert.ok(transactionRequest)
  assert.ok(postCommitRequest)
  assert.notEqual(transactionRequest, postCommitRequest)
  assert.match(String(transactionRequest.transactionID), /^test-transaction-/)
  assert.equal(postCommitRequest.transactionID, undefined)
  assert.ok(transactionEntries.every((entry) => entry.request === transactionRequest))
  assert.ok(postCommitEntries.every((entry) => entry.request === postCommitRequest))
  for (const operation of [
    'lockProduct',
    'readProduct',
    'readProductJobs',
    'createImageJob',
    'updateImageJob',
    'queueImageJob',
    'readQueueReceipt',
    'updateProduct',
  ]) assert.ok(transactionEntries.some((entry) => entry.operation === operation), operation)
  assert.deepEqual(
    [...new Set(postCommitEntries.map((entry) => entry.operation))].sort(),
    ['readImageJob', 'readProduct', 'readQueueReceipt'],
  )
}

async function testUnrelatedRunnableJobIsNotClaimed(): Promise<void> {
  const runtime = fixture({ unrelatedQueue: true })
  const before = runtime.snapshot().queueJobs[0]
  const result = await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
  assert.equal(result.kind, 'provisioned')
  const after = runtime.snapshot()
  assert.deepEqual(after.queueJobs.find((job) => job.id === 900), before)
  assert.equal(after.queueJobs.length, 2)
  assert.equal(runtime.calls.runners, 0)
  assert.equal(runtime.calls.provider, 0)
}

async function testActualTaskExecutionIdentityMismatch(): Promise<void> {
  const runtime = fixture()
  await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
  const state = runtime.snapshot()
  const imageJob = state.imageJobs[0]!
  const receipt = state.queueJobs[0]!
  const taskCalls = {
    imageJobReads: 0,
    productReads: 0,
    updates: 0,
    creates: 0,
    queues: 0,
    runners: 0,
  }
  const payload = {
    findByID: async (args: RecordValue) => {
      if (args.collection === 'image-generation-jobs') {
        taskCalls.imageJobReads += 1
        return clone(imageJob)
      }
      taskCalls.productReads += 1
      throw new Error('TASK_CROSSED_EXECUTION_IDENTITY_BOUNDARY')
    },
    update: async () => { taskCalls.updates += 1 },
    create: async () => { taskCalls.creates += 1 },
    jobs: {
      queue: async () => { taskCalls.queues += 1 },
      run: async () => { taskCalls.runners += 1 },
    },
  }
  const { imageGenTask } = await import('../jobs/imageGenTask')
  assert.equal(typeof imageGenTask.handler, 'function')
  const invoke = async (outerJob: RecordValue, taskInput: RecordValue) => {
    await imageGenTask.handler!({
      input: taskInput,
      job: outerJob,
      req: { payload },
    } as never)
  }
  const validInput = clone(receipt.input as RecordValue)
  const mismatches: Array<{ outer: RecordValue; taskInput: RecordValue }> = [
    { outer: { ...clone(receipt), id: 1002 }, taskInput: clone(validInput) },
    { outer: { ...clone(receipt), taskSlug: 'foreign-task' }, taskInput: clone(validInput) },
    {
      outer: { ...clone(receipt), input: { ...clone(validInput), productId: 88 } },
      taskInput: { ...clone(validInput), productId: 88 },
    },
    {
      outer: { ...clone(receipt), input: { ...clone(validInput), jobId: '2' } },
      taskInput: { ...clone(validInput), jobId: '2' },
    },
    {
      outer: { ...clone(receipt), input: { ...clone(validInput), visualOnlyManifestDigest: 'b'.repeat(64) } },
      taskInput: { ...clone(validInput), visualOnlyManifestDigest: 'b'.repeat(64) },
    },
    {
      outer: { ...clone(receipt), input: { ...clone(validInput), visualOnlyDeliveryDigest: 'c'.repeat(64) } },
      taskInput: { ...clone(validInput), visualOnlyDeliveryDigest: 'c'.repeat(64) },
    },
  ]
  for (const mismatch of mismatches) {
    await assert.rejects(
      () => invoke(mismatch.outer, mismatch.taskInput),
      /VISUAL_ONLY_EXECUTION_BOUNDARY_INVALID/,
    )
  }
  await assert.rejects(
    () => invoke(clone(receipt), clone(validInput)),
    /TASK_CROSSED_EXECUTION_IDENTITY_BOUNDARY/,
  )
  assert.equal(taskCalls.imageJobReads, mismatches.length + 1)
  assert.equal(taskCalls.productReads, 1)
  assert.equal(taskCalls.updates, 0)
  assert.equal(taskCalls.creates, 0)
  assert.equal(taskCalls.queues, 0)
  assert.equal(taskCalls.runners, 0)
}

async function testInstalledPayloadQueuePropagation(): Promise<void> {
  await import('payload')
  const { getJobsLocalAPI } = await import('../../node_modules/payload/dist/queues/localAPI.js')
  const req = {
    context: { visualOnlyProvisioning: true },
    transactionID: 'installed-payload-transaction',
  } as unknown as PayloadRequest
  let receivedReq: PayloadRequest | undefined
  const payload = {
    config: { jobs: { enableConcurrencyControl: false, runHooks: false } },
    db: {
      create: async (args: RecordValue) => {
        receivedReq = args.req as PayloadRequest
        return {
          id: 2001,
          input: (args.data as RecordValue).input,
          taskSlug: (args.data as RecordValue).taskSlug,
          log: [],
        }
      },
    },
  }
  const queue = getJobsLocalAPI(payload as never).queue as unknown as (
    args: RecordValue,
  ) => Promise<RecordValue>
  const receipt = await queue({
    task: 'image-gen',
    input: { jobId: '1', productId: 77 },
    overrideAccess: true,
    req,
  })
  assert.equal(receivedReq, req)
  assert.equal(await receivedReq?.transactionID, 'installed-payload-transaction')
  assert.equal((receivedReq?.context as RecordValue).visualOnlyProvisioning, true)
  assert.equal(receipt.id, 2001)
  assert.equal(receipt.taskSlug, 'image-gen')
  assert.deepEqual(receipt.input, { jobId: '1', productId: 77 })
}

async function main(): Promise<void> {
  const digest = deliveryDigest()
  assert.match(digest, /^[0-9a-f]{64}$/)
  assert.equal(digest, deliveryDigest())
  assert.notEqual(digest, deliveryDigest(5002, 61))
  assert.ok(!digest.includes('770077') && !digest.includes('5001') && !digest.includes('61'))

  await testConcurrentRedelivery()
  await testSequentialRedelivery()
  await testDifferentConcurrentDeliveries()
  await testRollbackAndRetry('create', /INJECTED_JOB_CREATE_FAILURE/)
  await testRollbackAndRetry('manifest', /INJECTED_MANIFEST_FAILURE/)
  await testRollbackAndRetry('queue', /INJECTED_QUEUE_FAILURE/)
  await testRollbackAndRetry('receipt', /INJECTED_RECEIPT_FAILURE/)
  await testRollbackAndRetry('product', /INJECTED_PRODUCT_UPDATE_FAILURE/)
  await testCommitRollback()
  await testInstalledSuppressedCommitAndCleanRetry()
  await testTransientPostCommitReadAndReuse()
  await testCorruptRawIdempotencyBinding()
  await testUndecodableRawIdempotencyBinding()
  await testMissingAndTerminalReceiptReuse()
  await testForeignReceiptReuse()
  await testDuplicatedDeliveryEvidence()
  await testRequestIdentity()
  await testUnrelatedRunnableJobIsNotClaimed()
  await testActualTaskExecutionIdentityMismatch()
  await testInstalledPayloadQueuePropagation()

  const routeSource = readFileSync(new URL('../app/api/telegram/route.ts', import.meta.url), 'utf8')
  const runtimeSource = readFileSync(new URL('./visualOnlyProvisioningRuntime.ts', import.meta.url), 'utf8')
  const visualPathStart = routeSource.indexOf('if (isVisualOnlyCommand)')
  const visualPathEnd = routeSource.indexOf('// The legacy non-visual path', visualPathStart)
  const visualPath = routeSource.slice(visualPathStart, visualPathEnd)
  assert.match(visualPath, /await provisionVisualOnlyV01/)
  assert.doesNotMatch(visualPath, /jobs\.run|after\s*\(/)
  assert.ok(visualPath.indexOf('await provisionVisualOnlyV01') < visualPath.lastIndexOf('NextResponse.json({ ok: true })'))
  assert.match(runtimeSource, /FOR UPDATE/)
  assert.match(runtimeSource, /runtime\.jobs\.queue\(\{[\s\S]*?req,/)
  assert.match(runtimeSource, /createLocalReq\(\{\}, payload\)/)
  assert.match(runtimeSource, /Boolean\(await req\.transactionID\)/)
  assert.match(runtimeSource, /collection: 'payload-jobs'/)

  console.log('visualOnlyProvisioning: ALL OK')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
