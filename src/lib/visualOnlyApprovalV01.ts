import {
  parseGenerationAttemptHistory,
  validateImageGenerationPackSelection,
  type ImageGenerationAttemptMetadata,
  type ImageGenerationPackSelection,
} from './imageGenerationContracts'
import { GENERATED_SLOT_KEYS, IMAGE_SLOT_CONTRACT_VERSION } from './imageSlotContract'
import {
  createVisualOnlyV01PreviewBinding,
  parseVisualOnlyJobEvidence,
  sanitizeVisualOnlyV01BoundaryManifest,
  verifyVisualOnlyProductState,
  VISUAL_ONLY_V01_MODE,
  type VisualOnlyV01BoundaryManifest,
} from './visualOnlyV01'

type RecordValue = Record<string, unknown>

export type VisualOnlyV01Action = 'approve' | 'reject'

export type VisualOnlyV01CallbackContext = {
  data: string
  chatId: string | number
  userId: string | number
}

export type VisualOnlyV01ApprovalPlan = {
  action: VisualOnlyV01Action
  jobId: string
  productId: number
  mediaIds: number[]
  manifest: VisualOnlyV01BoundaryManifest
  productData: RecordValue
  jobData: RecordValue
}

export type VisualOnlyV01AtomicAdapter<TTransaction = unknown> = {
  runAtomic<T>(operation: (transaction: TTransaction) => Promise<T>): Promise<T>
  claimJob(transaction: TTransaction, jobId: string): Promise<boolean>
  lockProduct(transaction: TTransaction, productId: number): Promise<boolean>
  readJob(transaction: TTransaction, jobId: string): Promise<unknown>
  readProduct(transaction: TTransaction, productId: number): Promise<unknown>
  readMedia(transaction: TTransaction, mediaIds: readonly number[]): Promise<unknown[]>
  updateProduct(transaction: TTransaction, productId: number, data: RecordValue): Promise<void>
  updateJob(transaction: TTransaction, jobId: string, data: RecordValue): Promise<void>
}

export type VisualOnlyV01ExecutionResult = {
  action: VisualOnlyV01Action
  jobId: string
  productId: number
  mediaCount: number
}

export class VisualOnlyV01BoundaryError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.code = code
  }
}

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function relationshipId(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (isRecord(value)) return relationshipId(value.id)
  return null
}

function relationshipArray(value: unknown, childKey?: string): Array<string | number> | null {
  if (!Array.isArray(value)) return null
  const result: Array<string | number> = []
  for (const entry of value) {
    const candidate = childKey && isRecord(entry) ? entry[childKey] : entry
    const id = relationshipId(candidate)
    if (id === null) return null
    result.push(id)
  }
  return result
}

function parseCallback(data: string): { action: VisualOnlyV01Action; jobId: string; token: string } | null {
  const match = /^(voa|vor):([1-9]\d*):([0-9a-f]{20})$/.exec(data)
  if (!match) return null
  const numericJobId = Number(match[2])
  if (!Number.isSafeInteger(numericJobId) || numericJobId <= 0) return null
  return { action: match[1] === 'voa' ? 'approve' : 'reject', jobId: match[2], token: match[3] }
}

function exactAttemptBoundary(
  attempt: ImageGenerationAttemptMetadata,
  manifest: VisualOnlyV01BoundaryManifest,
): boolean {
  const boundary = sanitizeVisualOnlyV01BoundaryManifest(attempt.visualOnlyBoundary)
  return Boolean(boundary)
    && boundary?.digest === manifest.digest
    && boundary?.mode === VISUAL_ONLY_V01_MODE
    && attempt.jobId === manifest.jobId
    && attempt.qualityProfile === manifest.profileVersion
    && attempt.productFamily === manifest.productFamily
}

function validatePack(params: {
  job: RecordValue
  manifest: VisualOnlyV01BoundaryManifest
}): { attempts: ImageGenerationAttemptMetadata[]; pack: ImageGenerationPackSelection; root: ImageGenerationAttemptMetadata } {
  const parsed = parseGenerationAttemptHistory(params.job.generationAttempts)
  if (!parsed.ok) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_ATTEMPT_HISTORY_INVALID')
  const activeAttemptId = typeof params.job.activeAttemptId === 'string' ? params.job.activeAttemptId : ''
  const root = parsed.attempts.find((attempt) => attempt.attemptId === activeAttemptId)
  if (
    !root
    || root.attemptKind !== 'initial'
    || root.attemptOrdinal !== 1
    || root.parentAttemptId !== null
    || root.status !== 'completed'
    || !exactAttemptBoundary(root, params.manifest)
    || JSON.stringify(root.requestedSlotIds) !== JSON.stringify(GENERATED_SLOT_KEYS)
    || JSON.stringify(root.slots.map((slot) => slot.slotId)) !== JSON.stringify(GENERATED_SLOT_KEYS)
  ) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_ROOT_ATTEMPT_INVALID')
  for (const attempt of parsed.attempts) {
    if (!exactAttemptBoundary(attempt, params.manifest)) {
      throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_ATTEMPT_BOUNDARY_MISMATCH')
    }
  }
  const selection = validateImageGenerationPackSelection({ attempts: parsed.attempts, rootAttempt: root })
  if (!selection.ok) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_PACK_INVALID')
  if (
    selection.selection.visualOnlyBoundaryDigest !== params.manifest.digest
    || selection.selection.visualOnlyMode !== VISUAL_ONLY_V01_MODE
    || JSON.stringify(selection.selection.slots.map((slot) => slot.slotId)) !== JSON.stringify(GENERATED_SLOT_KEYS)
    || new Set(selection.selection.slots.map((slot) => String(slot.mediaId))).size !== GENERATED_SLOT_KEYS.length
  ) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_PACK_BOUNDARY_MISMATCH')
  return { attempts: parsed.attempts, pack: selection.selection, root }
}

function validateMedia(params: {
  media: unknown[]
  pack: ImageGenerationPackSelection
  manifest: VisualOnlyV01BoundaryManifest
}): number[] {
  if (!Array.isArray(params.media) || params.media.length !== GENERATED_SLOT_KEYS.length) {
    throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_MEDIA_SET_INCOMPLETE')
  }
  const byId = new Map<string, RecordValue>()
  for (const entry of params.media) {
    if (!isRecord(entry)) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_MEDIA_RECORD_MALFORMED')
    const id = relationshipId(entry.id)
    if (id === null || byId.has(String(id))) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_MEDIA_ID_DUPLICATED')
    byId.set(String(id), entry)
  }
  const result: number[] = []
  for (const slot of params.pack.slots) {
    const mediaId = Number(slot.mediaId)
    const media = byId.get(String(slot.mediaId))
    const lineage = media && isRecord(media.generationLineage) ? media.generationLineage : null
    if (
      !Number.isSafeInteger(mediaId) || mediaId <= 0
      || !media
      || media.type !== 'generated'
      || String(relationshipId(media.product)) !== String(params.manifest.productId)
      || !lineage
      || lineage.contractVersion !== IMAGE_SLOT_CONTRACT_VERSION
      || String(lineage.jobId) !== params.manifest.jobId
      || lineage.attemptId !== slot.sourceAttemptId
      || lineage.slotId !== slot.slotId
    ) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_MEDIA_LINEAGE_MISMATCH')
    result.push(mediaId)
  }
  return result
}

export function planVisualOnlyV01Decision(params: {
  callback: VisualOnlyV01CallbackContext
  job: unknown
  product: unknown
  media: unknown[]
}): VisualOnlyV01ApprovalPlan {
  const callback = parseCallback(params.callback.data)
  if (!callback) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_CALLBACK_MALFORMED')
  if (!isRecord(params.job)) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_JOB_RECORD_MALFORMED')
  const evidence = parseVisualOnlyJobEvidence(params.job)
  if (!evidence?.preview) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_PREVIEW_EVIDENCE_MISSING')
  const { manifest, preview } = evidence
  const jobId = relationshipId(params.job.id)
  const productId = relationshipId(params.job.product)
  if (
    callback.jobId !== manifest.jobId
    || String(jobId) !== manifest.jobId
    || String(productId) !== String(manifest.productId)
    || String(params.callback.chatId) !== manifest.reviewChatId
    || String(params.callback.userId) !== manifest.reviewerUserId
    || callback.token !== preview.callbackToken
    || preview.jobId !== manifest.jobId
    || preview.productId !== manifest.productId
    || preview.boundaryDigest !== manifest.digest
    || (params.job.status !== 'preview' && params.job.status !== 'review')
  ) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_CALLBACK_IDENTITY_MISMATCH')

  const productState = verifyVisualOnlyProductState(params.product, manifest, 'approval')
  if (!productState.ok) throw new VisualOnlyV01BoundaryError(productState.code)
  const { pack, root } = validatePack({ job: params.job, manifest })
  const expectedPreview = createVisualOnlyV01PreviewBinding({
    manifest,
    rootAttemptId: root.attemptId,
    packSelection: pack,
  })
  if (JSON.stringify(expectedPreview) !== JSON.stringify(preview)) {
    throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_PREVIEW_BINDING_MISMATCH')
  }

  const generatedIds = relationshipArray(params.job.generatedImages)
  const packIds = pack.slots.map((slot) => slot.mediaId)
  if (
    !generatedIds
    || JSON.stringify(generatedIds.map(String)) !== JSON.stringify(packIds.map(String))
  ) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_JOB_MEDIA_SET_MISMATCH')
  const mediaIds = validateMedia({ media: params.media, pack, manifest })

  if (!isRecord(params.product)) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_PRODUCT_RECORD_MALFORMED')
  const workflow = isRecord(params.product.workflow) ? params.product.workflow : null
  if (!workflow) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_PRODUCT_WORKFLOW_MALFORMED')

  return {
    action: callback.action,
    jobId: manifest.jobId,
    productId: manifest.productId,
    mediaIds,
    manifest,
    productData: callback.action === 'approve'
      ? {
          generativeGallery: mediaIds.map((image) => ({ image })),
          workflow: { ...workflow, visualStatus: 'approved', sellable: false },
        }
      : {
          workflow: { ...workflow, visualStatus: 'rejected', sellable: false },
        },
    jobData: callback.action === 'approve'
      ? { status: 'approved', generatedImages: mediaIds, imageCount: mediaIds.length }
      : { status: 'rejected' },
  }
}

export async function executeVisualOnlyV01Decision<TTransaction>(params: {
  adapter: VisualOnlyV01AtomicAdapter<TTransaction>
  callback: VisualOnlyV01CallbackContext
}): Promise<VisualOnlyV01ExecutionResult> {
  const callback = parseCallback(params.callback.data)
  if (!callback) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_CALLBACK_MALFORMED')
  return params.adapter.runAtomic(async (transaction) => {
    if (!await params.adapter.claimJob(transaction, callback.jobId)) {
      throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_CALLBACK_REPLAYED_OR_TERMINAL')
    }
    const job = await params.adapter.readJob(transaction, callback.jobId)
    const evidence = parseVisualOnlyJobEvidence(job)
    if (!evidence) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_JOB_BOUNDARY_MISSING')
    if (!await params.adapter.lockProduct(transaction, evidence.manifest.productId)) {
      throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_PRODUCT_LOCK_UNAVAILABLE')
    }
    const freshJob = await params.adapter.readJob(transaction, callback.jobId)
    const product = await params.adapter.readProduct(transaction, evidence.manifest.productId)
    const packIds = isRecord(freshJob) && Array.isArray(freshJob.generatedImages)
      ? freshJob.generatedImages.map(relationshipId).filter((id): id is string | number => id !== null).map(Number)
      : []
    const media = await params.adapter.readMedia(transaction, packIds)
    const plan = planVisualOnlyV01Decision({ callback: params.callback, job: freshJob, product, media })
    await params.adapter.updateProduct(transaction, plan.productId, plan.productData)
    await params.adapter.updateJob(transaction, plan.jobId, plan.jobData)
    return {
      action: plan.action,
      jobId: plan.jobId,
      productId: plan.productId,
      mediaCount: plan.action === 'approve' ? plan.mediaIds.length : 0,
    }
  })
}
