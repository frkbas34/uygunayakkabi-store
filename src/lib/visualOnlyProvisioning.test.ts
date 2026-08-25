import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { PayloadRequest } from 'payload'

import {
  createVisualOnlyDeliveryDigest,
  parseVisualOnlyProvisioningEvidence,
  provisionVisualOnlyV01,
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
type Transaction = {
  state?: DurableState
  release?: () => void
}
type Fault = 'create' | 'manifest' | 'queue' | 'receipt' | 'commit'

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

function fixture(options: { barrier?: Barrier; fault?: Fault } = {}) {
  let durable: DurableState = {
    product: isolatedProduct(),
    imageJobs: [],
    queueJobs: [],
    nextImageJobId: 1,
    nextQueueJobId: 1001,
  }
  const mutex = new Mutex()
  let fault = options.fault
  const calls = {
    transactions: 0,
    locks: 0,
    creates: 0,
    manifestBindings: 0,
    queues: 0,
    receiptReads: 0,
    productUpdates: 0,
    provider: 0,
  }
  const consumeFault = (candidate: Fault): boolean => {
    if (fault !== candidate) return false
    fault = undefined
    return true
  }
  const state = (transaction: Transaction): DurableState => {
    if (!transaction.state) throw new Error('test transaction was not Product-locked')
    return transaction.state
  }
  const adapter: VisualOnlyProvisioningAdapter<Transaction> = {
    async runAtomic(operation) {
      calls.transactions += 1
      if (options.barrier) await options.barrier.arrive()
      const transaction: Transaction = {}
      try {
        const result = await operation(transaction)
        if (consumeFault('commit')) throw new Error('INJECTED_COMMIT_FAILURE')
        durable = clone(state(transaction))
        return result
      } finally {
        transaction.release?.()
      }
    },
    async lockProduct(transaction, productId) {
      calls.locks += 1
      transaction.release = await mutex.acquire()
      transaction.state = clone(durable)
      return transaction.state.product.id === productId
    },
    async readProduct(transaction) {
      return clone(state(transaction).product)
    },
    async readProductJobs(transaction) {
      return clone(state(transaction).imageJobs)
    },
    async createImageJob(transaction, data) {
      calls.creates += 1
      const current = state(transaction)
      const job = { id: current.nextImageJobId++, ...clone(data) }
      current.imageJobs.push(job)
      if (consumeFault('create')) throw new Error('INJECTED_JOB_CREATE_FAILURE')
      return clone(job)
    },
    async updateImageJob(transaction, jobId, data) {
      calls.manifestBindings += 1
      if (consumeFault('manifest')) throw new Error('INJECTED_MANIFEST_FAILURE')
      const job = state(transaction).imageJobs.find((entry) => String(entry.id) === jobId)
      if (!job) throw new Error('test job missing')
      Object.assign(job, clone(data))
    },
    async readImageJob(transaction, jobId) {
      return clone(state(transaction).imageJobs.find((entry) => String(entry.id) === jobId) ?? null)
    },
    async queueImageJob(transaction, input) {
      calls.queues += 1
      if (consumeFault('queue')) throw new Error('INJECTED_QUEUE_FAILURE')
      const current = state(transaction)
      const receipt = {
        id: current.nextQueueJobId++,
        taskSlug: 'image-gen',
        input: clone(input),
      }
      current.queueJobs.push(receipt)
      return clone(receipt)
    },
    async readQueueReceipt(transaction, receiptId) {
      calls.receiptReads += 1
      if (consumeFault('receipt')) throw new Error('INJECTED_RECEIPT_FAILURE')
      return clone(state(transaction).queueJobs.find((entry) => String(entry.id) === receiptId) ?? null)
    },
    async updateProduct(transaction, productId, data) {
      calls.productUpdates += 1
      const current = state(transaction)
      if (current.product.id !== productId) throw new Error('test product missing')
      Object.assign(current.product, clone(data))
    },
  }
  return {
    adapter,
    calls,
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

function assertOneCompleteProvisioning(value: ReturnType<ReturnType<typeof fixture>['snapshot']>): void {
  assert.equal(value.imageJobs.length, 1)
  assert.equal(value.queueJobs.length, 1)
  const evidence = parseVisualOnlyProvisioningEvidence(value.imageJobs[0])
  assert.ok(evidence)
  assert.equal(evidence.binding.queueReceiptId, String(value.queueJobs[0]?.id))
  assert.equal(evidence.binding.manifestDigest, evidence.manifest.digest)
  assert.equal((value.product.workflow as RecordValue).visualStatus, 'generating')
  assert.equal((value.product.workflow as RecordValue).workflowStatus, 'visual_pending')
  assert.equal(value.product.status, 'draft')
  assert.equal((value.product.workflow as RecordValue).sellable, false)
}

function assertRolledBack(value: ReturnType<ReturnType<typeof fixture>['snapshot']>): void {
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
  const second = await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
  assert.equal(first.kind, 'provisioned')
  assert.deepEqual(second, { kind: 'reused', jobId: first.jobId, queueReceiptId: first.queueReceiptId })
  assert.equal(runtime.calls.creates, 1)
  assert.equal(runtime.calls.queues, 1)
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
  assert.equal(runtime.calls.creates, 1)
  assert.equal(runtime.calls.queues, 1)
}

async function testRollbackAndRetry(fault: Exclude<Fault, 'commit'>, message: RegExp): Promise<void> {
  const runtime = fixture({ fault })
  await assert.rejects(
    () => provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() }),
    message,
  )
  assertRolledBack(runtime.snapshot())
  const retry = await provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() })
  assert.equal(retry.kind, 'provisioned')
  assertOneCompleteProvisioning(runtime.snapshot())
}

async function testCommitRollback(): Promise<void> {
  const runtime = fixture({ fault: 'commit' })
  await assert.rejects(
    () => provisionVisualOnlyV01({ adapter: runtime.adapter, input: input() }),
    /INJECTED_COMMIT_FAILURE/,
  )
  assertRolledBack(runtime.snapshot())
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
    input: { jobId: '1' },
    overrideAccess: true,
    req,
  })
  assert.equal(receivedReq, req)
  assert.equal(await receivedReq?.transactionID, 'installed-payload-transaction')
  assert.equal((receivedReq?.context as RecordValue).visualOnlyProvisioning, true)
  assert.equal(receipt.id, 2001)
  assert.equal(receipt.taskSlug, 'image-gen')
  assert.deepEqual(receipt.input, { jobId: '1' })
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
  await testCommitRollback()
  await testInstalledPayloadQueuePropagation()

  const routeSource = readFileSync(new URL('../app/api/telegram/route.ts', import.meta.url), 'utf8')
  const taskSource = readFileSync(new URL('../jobs/imageGenTask.ts', import.meta.url), 'utf8')
  const runtimeSource = readFileSync(new URL('./visualOnlyProvisioningRuntime.ts', import.meta.url), 'utf8')
  assert.match(routeSource, /createVisualOnlyV01PayloadProvisioningAdapter\(payload\)/)
  const provisioningRouteIndex = routeSource.indexOf('const result = await provisionVisualOnlyV01')
  assert.ok(
    routeSource.indexOf("if (result.kind === 'reused')", provisioningRouteIndex)
      < routeSource.indexOf('after(async () =>', provisioningRouteIndex),
  )
  assert.match(taskSource, /provisioningEvidence\.binding\.queueReceiptId !== String\(job\.id\)/)
  assert.match(taskSource, /visualOnlyProvisioning,/)
  assert.match(runtimeSource, /FOR UPDATE/)
  assert.match(runtimeSource, /runtime\.jobs\.queue\(\{[\s\S]*?req,/)
  assert.match(runtimeSource, /collection: 'payload-jobs'/)

  console.log('visualOnlyProvisioning: ALL OK')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
