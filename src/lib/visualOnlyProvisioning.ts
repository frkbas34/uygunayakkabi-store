import { createHash } from 'node:crypto'

import {
  assessVisualOnlyProductState,
  createVisualOnlyV01BoundaryManifest,
  parseVisualOnlyV01BoundaryText,
  parseVisualOnlyJobEvidence,
  verifyVisualOnlyProductState,
  VISUAL_ONLY_V01_MODE,
  type VisualOnlyV01BoundaryManifest,
  type VisualOnlyV01Family,
} from './visualOnlyV01'

export const VISUAL_ONLY_PROVISIONING_VERSION = 'visual-only-provisioning/v1' as const
export const VISUAL_ONLY_PROVISIONING_IDEMPOTENCY_CORRUPT = 'VISUAL_ONLY_PROVISIONING_IDEMPOTENCY_CORRUPT' as const
export const VISUAL_ONLY_PROVISIONING_REUSE_UNQUALIFIED = 'VISUAL_ONLY_PROVISIONING_REUSE_UNQUALIFIED' as const
export const VISUAL_ONLY_PROVISIONING_POST_COMMIT_UNQUALIFIED = 'VISUAL_ONLY_PROVISIONING_POST_COMMIT_UNQUALIFIED' as const

const SHA256_PATTERN = /^[0-9a-f]{64}$/
const ACTIVE_IMAGE_JOB_STATUSES = new Set(['queued', 'generating', 'preview', 'review'])

type RecordValue = Record<string, unknown>

export type VisualOnlyDeliveryIdentity = {
  botIdentity: 'uygunops'
  chatId: number
  updateId: number
  messageId: number
  userId: number
}

export type VisualOnlyProvisioningBinding = {
  version: typeof VISUAL_ONLY_PROVISIONING_VERSION
  deliveryDigest: string
  productId: number
  jobId: string
  manifestDigest: string
  queueReceiptId: string | null
  taskSlug: 'image-gen'
}

export type VisualOnlyProvisioningInput = {
  productId: number
  stockNumber: string
  productFamily: VisualOnlyV01Family
  mode: 'hizli' | 'dengeli' | 'premium' | 'karma'
  modeLabel: string
  reviewChatId: string
  reviewerUserId: string
  deliveryDigest: string
  createNonce(): string
}

export type VisualOnlyProvisioningResult = {
  kind: 'provisioned' | 'reused' | 'active'
  jobId: string
  queueReceiptId: string | null
}

export type VisualOnlyProvisioningAdapter<TTransaction> = {
  runAtomic<T>(operation: (transaction: TTransaction) => Promise<T>): Promise<T>
  createPostCommitRequest(): Promise<TTransaction>
  requestHasTransaction(request: TTransaction): Promise<boolean>
  lockProduct(transaction: TTransaction, productId: number): Promise<boolean>
  readProduct(transaction: TTransaction, productId: number): Promise<unknown>
  readProductJobs(transaction: TTransaction, productId: number): Promise<unknown[]>
  createImageJob(transaction: TTransaction, data: RecordValue): Promise<unknown>
  updateImageJob(transaction: TTransaction, jobId: string, data: RecordValue): Promise<void>
  readImageJob(transaction: TTransaction, jobId: string): Promise<unknown>
  queueImageJob(transaction: TTransaction, input: RecordValue): Promise<unknown>
  readQueueReceipt(transaction: TTransaction, receiptId: string): Promise<unknown>
  updateProduct(transaction: TTransaction, productId: number, data: RecordValue): Promise<void>
}

function isPlainRecord(value: unknown): value is RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function positiveIntegerText(value: unknown): string | null {
  const candidate = typeof value === 'number' && Number.isSafeInteger(value)
    ? String(value)
    : typeof value === 'string' ? value : ''
  if (!/^[1-9]\d*$/.test(candidate)) return null
  return candidate
}

function relationshipId(value: unknown): string | null {
  if (isPlainRecord(value)) return positiveIntegerText(value.id)
  return positiveIntegerText(value)
}

function relationshipProductId(value: unknown): number | null {
  const id = relationshipId(value)
  if (!id) return null
  const parsed = Number(id)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function canonicalDeliveryIdentity(identity: VisualOnlyDeliveryIdentity): RecordValue {
  if (
    identity.botIdentity !== 'uygunops'
    || !Number.isSafeInteger(identity.chatId) || identity.chatId === 0
    || !Number.isSafeInteger(identity.updateId) || identity.updateId < 0
    || !Number.isSafeInteger(identity.messageId) || identity.messageId <= 0
    || !Number.isSafeInteger(identity.userId) || identity.userId <= 0
  ) throw new Error('VISUAL_ONLY_DELIVERY_IDENTITY_INVALID')
  return {
    version: VISUAL_ONLY_PROVISIONING_VERSION,
    botIdentity: identity.botIdentity,
    chatId: String(identity.chatId),
    updateId: String(identity.updateId),
    messageId: String(identity.messageId),
    userId: String(identity.userId),
  }
}

export function createVisualOnlyDeliveryDigest(identity: VisualOnlyDeliveryIdentity): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalDeliveryIdentity(identity)))
    .digest('hex')
}

export function sanitizeVisualOnlyProvisioningBinding(
  value: unknown,
  options: { requireReceipt?: boolean } = {},
): VisualOnlyProvisioningBinding | null {
  if (!isPlainRecord(value)) return null
  const expectedKeys = [
    'version', 'deliveryDigest', 'productId', 'jobId', 'manifestDigest', 'queueReceiptId', 'taskSlug',
  ].sort()
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(expectedKeys)) return null
  const jobId = positiveIntegerText(value.jobId)
  const queueReceiptId = value.queueReceiptId === null ? null : positiveIntegerText(value.queueReceiptId)
  if (
    value.version !== VISUAL_ONLY_PROVISIONING_VERSION
    || typeof value.deliveryDigest !== 'string' || !SHA256_PATTERN.test(value.deliveryDigest)
    || typeof value.productId !== 'number' || !Number.isSafeInteger(value.productId) || value.productId <= 0
    || !jobId
    || typeof value.manifestDigest !== 'string' || !SHA256_PATTERN.test(value.manifestDigest)
    || (value.queueReceiptId !== null && !queueReceiptId)
    || (options.requireReceipt === true && !queueReceiptId)
    || value.taskSlug !== 'image-gen'
  ) return null
  return {
    version: VISUAL_ONLY_PROVISIONING_VERSION,
    deliveryDigest: value.deliveryDigest,
    productId: value.productId,
    jobId,
    manifestDigest: value.manifestDigest,
    queueReceiptId,
    taskSlug: 'image-gen',
  }
}

export function parseVisualOnlyProvisioningEvidence(job: unknown): {
  binding: VisualOnlyProvisioningBinding
  manifest: NonNullable<ReturnType<typeof parseVisualOnlyJobEvidence>>['manifest']
} | null {
  if (!isPlainRecord(job) || typeof job.promptsUsed !== 'string') return null
  const jobEvidence = parseVisualOnlyJobEvidence(job)
  if (!jobEvidence) return null
  try {
    const prompts = JSON.parse(job.promptsUsed)
    if (!isPlainRecord(prompts)) return null
    const binding = sanitizeVisualOnlyProvisioningBinding(prompts.visualOnlyProvisioning, { requireReceipt: true })
    const jobId = relationshipId(job.id)
    const productId = relationshipProductId(job.product)
    if (
      !binding
      || !jobId
      || productId === null
      || binding.jobId !== jobId
      || binding.productId !== productId
      || binding.manifestDigest !== jobEvidence.manifest.digest
      || jobEvidence.manifest.jobId !== jobId
      || jobEvidence.manifest.productId !== productId
    ) return null
    return { binding, manifest: jobEvidence.manifest }
  } catch {
    return null
  }
}

function activeJob(job: unknown): job is RecordValue {
  return isPlainRecord(job) && typeof job.status === 'string' && ACTIVE_IMAGE_JOB_STATUSES.has(job.status)
}

function deterministicJobId(job: unknown): string | null {
  return isPlainRecord(job) ? relationshipId(job.id) : null
}

function hasRawDeliveryDigest(job: unknown, deliveryDigest: string): boolean {
  return isPlainRecord(job)
    && typeof job.promptsUsed === 'string'
    && job.promptsUsed.includes(deliveryDigest)
}

type ProvisioningGraphExpectation = {
  deliveryDigest: string
  imageJobId: string
  manifest: VisualOnlyV01BoundaryManifest
  productId: number
  queueReceiptId: string
}

function validQueueReceipt(value: unknown, expected: ProvisioningGraphExpectation): boolean {
  if (
    !isPlainRecord(value)
    || relationshipId(value.id) !== expected.queueReceiptId
    || value.taskSlug !== 'image-gen'
    || value.processing !== false
    || value.hasError !== false
    || (value.completedAt !== undefined && value.completedAt !== null)
    || !isPlainRecord(value.input)
  ) return false
  const boundary = parseVisualOnlyV01BoundaryText(value.input.visualOnlyBoundary)
  return relationshipId(value.input.jobId) === expected.imageJobId
    && relationshipProductId(value.input.productId) === expected.productId
    && value.input.executionMode === VISUAL_ONLY_V01_MODE
    && value.input.visualOnlyProvisioningVersion === VISUAL_ONLY_PROVISIONING_VERSION
    && value.input.visualOnlyDeliveryDigest === expected.deliveryDigest
    && value.input.visualOnlyManifestDigest === expected.manifest.digest
    && boundary?.digest === expected.manifest.digest
    && boundary.jobId === expected.imageJobId
    && boundary.productId === expected.productId
}

function qualifyProvisioningGraphRecords(params: {
  imageJob: unknown
  product: unknown
  queueReceipt: unknown
  expected: ProvisioningGraphExpectation
}): boolean {
  const { expected } = params
  const evidence = parseVisualOnlyProvisioningEvidence(params.imageJob)
  if (
    !evidence
    || evidence.binding.version !== VISUAL_ONLY_PROVISIONING_VERSION
    || evidence.binding.deliveryDigest !== expected.deliveryDigest
    || evidence.binding.productId !== expected.productId
    || evidence.binding.jobId !== expected.imageJobId
    || evidence.binding.manifestDigest !== expected.manifest.digest
    || evidence.binding.queueReceiptId !== expected.queueReceiptId
    || evidence.binding.taskSlug !== 'image-gen'
    || evidence.manifest.digest !== expected.manifest.digest
    || evidence.manifest.nonce !== expected.manifest.nonce
    || evidence.manifest.productId !== expected.productId
    || evidence.manifest.jobId !== expected.imageJobId
    || !isPlainRecord(params.imageJob)
    || params.imageJob.status !== 'queued'
    || !isPlainRecord(params.product)
    || relationshipProductId(params.product.id) !== expected.productId
    || String(params.product.stockNumber ?? '').trim().toUpperCase() !== expected.manifest.stockNumber
    || !isPlainRecord(params.product.workflow)
    || params.product.workflow.workflowStatus !== 'visual_pending'
    || params.product.workflow.visualStatus !== 'generating'
    || !verifyVisualOnlyProductState(params.product, expected.manifest, 'execution').ok
  ) return false
  return validQueueReceipt(params.queueReceipt, expected)
}

function workflowForGenerating(product: unknown): RecordValue {
  if (!isPlainRecord(product) || !isPlainRecord(product.workflow)) {
    throw new Error('VISUAL_ONLY_PRODUCT_IDENTITY_BINDING_FAILED')
  }
  return {
    ...product.workflow,
    workflowStatus: 'visual_pending',
    visualStatus: 'generating',
  }
}

export async function provisionVisualOnlyV01<TTransaction>(params: {
  adapter: VisualOnlyProvisioningAdapter<TTransaction>
  input: VisualOnlyProvisioningInput
}): Promise<VisualOnlyProvisioningResult> {
  const { adapter, input } = params
  const stockNumber = input.stockNumber.trim().toUpperCase()
  if (
    !Number.isSafeInteger(input.productId) || input.productId <= 0
    || !/^SN\d{4}$/.test(stockNumber)
    || (input.productFamily !== 'loafer' && input.productFamily !== 'generic')
    || !SHA256_PATTERN.test(input.deliveryDigest)
    || !positiveIntegerText(input.reviewChatId)
    || !positiveIntegerText(input.reviewerUserId)
  ) throw new Error('VISUAL_ONLY_PROVISIONING_INPUT_INVALID')

  let transactionRequest: TTransaction | undefined
  const atomicResult = await adapter.runAtomic(async (transaction) => {
    transactionRequest = transaction
    if (!await adapter.lockProduct(transaction, input.productId)) {
      throw new Error('VISUAL_ONLY_PROVISIONING_PRODUCT_LOCK_UNAVAILABLE')
    }

    const product = await adapter.readProduct(transaction, input.productId)
    if (
      !isPlainRecord(product)
      || relationshipProductId(product.id) !== input.productId
      || String(product.stockNumber ?? '').trim().toUpperCase() !== stockNumber
    ) throw new Error('VISUAL_ONLY_PRODUCT_IDENTITY_BINDING_FAILED')

    const productJobs = await adapter.readProductJobs(transaction, input.productId)
    const rawMatching = productJobs
      .filter((job) => hasRawDeliveryDigest(job, input.deliveryDigest))
      .sort((left, right) => Number(deterministicJobId(left)) - Number(deterministicJobId(right)))
    if (rawMatching.length > 1) throw new Error('VISUAL_ONLY_PROVISIONING_IDEMPOTENCY_AMBIGUOUS')
    if (rawMatching.length === 1) {
      const imageJob = rawMatching[0]
      const evidence = parseVisualOnlyProvisioningEvidence(imageJob)
      if (
        !evidence?.binding.queueReceiptId
        || evidence.binding.deliveryDigest !== input.deliveryDigest
        || evidence.binding.productId !== input.productId
      ) throw new Error(VISUAL_ONLY_PROVISIONING_IDEMPOTENCY_CORRUPT)
      const expected: ProvisioningGraphExpectation = {
        deliveryDigest: input.deliveryDigest,
        imageJobId: evidence.binding.jobId,
        manifest: evidence.manifest,
        productId: input.productId,
        queueReceiptId: evidence.binding.queueReceiptId,
      }
      let receipt: unknown
      try {
        receipt = await adapter.readQueueReceipt(transaction, expected.queueReceiptId)
      } catch {
        throw new Error(VISUAL_ONLY_PROVISIONING_REUSE_UNQUALIFIED)
      }
      if (!qualifyProvisioningGraphRecords({ imageJob, product, queueReceipt: receipt, expected })) {
        throw new Error(VISUAL_ONLY_PROVISIONING_REUSE_UNQUALIFIED)
      }
      return {
        result: {
          kind: 'reused' as const,
          jobId: evidence.binding.jobId,
          queueReceiptId: evidence.binding.queueReceiptId,
        },
        expected,
      }
    }

    const active = productJobs
      .filter(activeJob)
      .map((job) => deterministicJobId(job))
      .filter((jobId): jobId is string => Boolean(jobId))
      .sort((left, right) => Number(left) - Number(right))
    if (active.length > 0) {
      return {
        result: { kind: 'active' as const, jobId: active[0]!, queueReceiptId: null },
        expected: null,
      }
    }

    const assessment = assessVisualOnlyProductState(product)
    if (
      !assessment.eligible
      || assessment.productId !== input.productId
      || assessment.stockNumber !== stockNumber
    ) throw new Error('VISUAL_ONLY_PRODUCT_IDENTITY_BINDING_FAILED')

    const title = typeof product.title === 'string' && product.title.trim() ? product.title.trim() : `Product ${input.productId}`
    const created = await adapter.createImageJob(transaction, {
      jobTitle: [title, input.modeLabel, 'Gemini Pro'].join(' - '),
      product: input.productId,
      mode: input.mode,
      status: 'queued',
      telegramChatId: input.reviewChatId,
      requestedByUserId: input.reviewerUserId,
    })
    const imageJobId = isPlainRecord(created) ? relationshipId(created.id) : null
    if (!imageJobId) throw new Error('VISUAL_ONLY_PROVISIONING_JOB_RECEIPT_INVALID')

    const manifest = createVisualOnlyV01BoundaryManifest({
      product,
      productId: input.productId,
      stockNumber,
      productFamily: input.productFamily,
      jobId: imageJobId,
      reviewChatId: input.reviewChatId,
      reviewerUserId: input.reviewerUserId,
      nonce: input.createNonce(),
    })
    const initialBinding: VisualOnlyProvisioningBinding = {
      version: VISUAL_ONLY_PROVISIONING_VERSION,
      deliveryDigest: input.deliveryDigest,
      productId: input.productId,
      jobId: imageJobId,
      manifestDigest: manifest.digest,
      queueReceiptId: null,
      taskSlug: 'image-gen',
    }
    const prompts = {
      executionMode: VISUAL_ONLY_V01_MODE,
      visualOnlyBoundary: manifest,
      visualOnlyProvisioning: initialBinding,
    }
    await adapter.updateImageJob(transaction, imageJobId, { promptsUsed: JSON.stringify(prompts) })

    const queueInput = {
      jobId: imageJobId,
      productId: input.productId,
      stage: 'standard',
      provider: 'gemini-pro',
      qualityProfile: 'visual-lock-v0.1',
      productFamily: input.productFamily,
      executionMode: VISUAL_ONLY_V01_MODE,
      visualOnlyBoundary: JSON.stringify(manifest),
      visualOnlyProvisioningVersion: VISUAL_ONLY_PROVISIONING_VERSION,
      visualOnlyDeliveryDigest: input.deliveryDigest,
      visualOnlyManifestDigest: manifest.digest,
    }
    const queued = await adapter.queueImageJob(transaction, queueInput)
    const queueReceiptId = isPlainRecord(queued) ? relationshipId(queued.id) : null
    if (!queueReceiptId) throw new Error('VISUAL_ONLY_PROVISIONING_QUEUE_RECEIPT_INVALID')
    const qualifiedReceipt = await adapter.readQueueReceipt(transaction, queueReceiptId)
    const expected: ProvisioningGraphExpectation = {
      deliveryDigest: input.deliveryDigest,
      imageJobId,
      manifest,
      productId: input.productId,
      queueReceiptId,
    }
    if (!validQueueReceipt(qualifiedReceipt, expected)) {
      throw new Error('VISUAL_ONLY_PROVISIONING_QUEUE_RECEIPT_INVALID')
    }

    const completeBinding: VisualOnlyProvisioningBinding = { ...initialBinding, queueReceiptId }
    await adapter.updateImageJob(transaction, imageJobId, {
      promptsUsed: JSON.stringify({ ...prompts, visualOnlyProvisioning: completeBinding }),
    })
    const persistedJob = await adapter.readImageJob(transaction, imageJobId)
    const persistedEvidence = parseVisualOnlyProvisioningEvidence(persistedJob)
    if (
      persistedEvidence?.binding.deliveryDigest !== input.deliveryDigest
      || persistedEvidence.binding.queueReceiptId !== queueReceiptId
      || persistedEvidence.manifest.digest !== manifest.digest
    ) throw new Error('VISUAL_ONLY_PROVISIONING_EVIDENCE_INVALID')

    await adapter.updateProduct(transaction, input.productId, {
      workflow: workflowForGenerating(product),
    })
    const persistedProduct = await adapter.readProduct(transaction, input.productId)
    if (!qualifyProvisioningGraphRecords({
      imageJob: persistedJob,
      product: persistedProduct,
      queueReceipt: qualifiedReceipt,
      expected,
    })) throw new Error('VISUAL_ONLY_PROVISIONING_EVIDENCE_INVALID')
    return {
      result: { kind: 'provisioned' as const, jobId: imageJobId, queueReceiptId },
      expected,
    }
  })

  if (!atomicResult.expected) return atomicResult.result

  try {
    const postCommitRequest = await adapter.createPostCommitRequest()
    if (
      transactionRequest === undefined
      || postCommitRequest === transactionRequest
      || await adapter.requestHasTransaction(postCommitRequest)
    ) throw new Error(VISUAL_ONLY_PROVISIONING_POST_COMMIT_UNQUALIFIED)
    const [imageJob, product, queueReceipt] = await Promise.all([
      adapter.readImageJob(postCommitRequest, atomicResult.expected.imageJobId),
      adapter.readProduct(postCommitRequest, atomicResult.expected.productId),
      adapter.readQueueReceipt(postCommitRequest, atomicResult.expected.queueReceiptId),
    ])
    if (!qualifyProvisioningGraphRecords({
      imageJob,
      product,
      queueReceipt,
      expected: atomicResult.expected,
    })) throw new Error(VISUAL_ONLY_PROVISIONING_POST_COMMIT_UNQUALIFIED)
    return atomicResult.result
  } catch {
    throw new Error(VISUAL_ONLY_PROVISIONING_POST_COMMIT_UNQUALIFIED)
  }
}
