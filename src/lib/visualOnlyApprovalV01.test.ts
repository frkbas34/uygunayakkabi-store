import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getTableName } from 'drizzle-orm'
import { integer, text, timestamp } from 'drizzle-orm/pg-core'

import { ImageGenerationJobs } from '../collections/ImageGenerationJobs'
import { Products } from '../collections/Products'
import {
  buildImageGenerationPackSelection,
  createImageGenerationAttempt,
  finishImageGenerationAttempt,
  type ImageGenerationAttemptMetadata,
} from './imageGenerationContracts'
import {
  VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
  VISUAL_QUALITY_RETRY_PROMPT_DIGEST_SCOPE_V01,
  VISUAL_QUALITY_RETRY_TEMPLATE_V01_VERSION,
  type VisualQualityRetryEvidenceV01,
} from './imageQualityRetryV01'
import { GENERATED_SLOT_KEYS } from './imageSlotContract'
import { parseVisualLockCommand } from './imageVisualLockV01'
import {
  createVisualOnlyV01PayloadAdapter,
  prepareVisualOnlyV01AtomicRuntime,
  resolveVisualOnlyV01TableAuthority,
} from './visualOnlyApprovalRuntime'
import {
  executeVisualOnlyV01Decision,
  planVisualOnlyV01Decision,
  type VisualOnlyV01AtomicAdapter,
} from './visualOnlyApprovalV01'
import { executeAuthorizedVisualOnlyCallback } from './visualOnlyCallbackRuntime'
import {
  createVisualOnlyV01BoundaryManifest,
  createVisualOnlyV01PreviewBinding,
  hasVisualOnlyBoundaryMarker,
  VISUAL_ONLY_V01_MODE,
} from './visualOnlyV01'

type RecordValue = Record<string, unknown>

const rootAttemptId = 'iga_11111111-1111-4111-8111-111111111111' as const

function isolatedProduct(visualStatus: 'pending' | 'generating' | 'preview' | 'approved' | 'rejected' = 'pending'): RecordValue {
  return {
    id: 77,
    stockNumber: 'SN0077',
    status: 'draft',
    images: [{ image: 701 }, { image: 702 }, { image: 703 }],
    generativeGallery: [],
    workflow: {
      workflowStatus: 'draft',
      visualStatus,
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

function passingRootEvidence(jobId: string, slotId: (typeof GENERATED_SLOT_KEYS)[number]): VisualQualityRetryEvidenceV01 {
  return {
    version: VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
    jobId,
    slotId,
    decision: 'retry_not_authorized',
    authorized: false,
    targets: [],
    normalizedFailureReasons: [],
    nonRetryReason: 'SLOT_ALREADY_PASSING',
    parentAttemptId: rootAttemptId,
    retryAttemptId: null,
    attemptOrdinal: 1,
    promptTemplateVersion: VISUAL_QUALITY_RETRY_TEMPLATE_V01_VERSION,
    promptDigestScope: VISUAL_QUALITY_RETRY_PROMPT_DIGEST_SCOPE_V01,
    promptDigest: null,
    generationAttempts: 0,
    evaluatorExecutions: 0,
    framingCorrectionOutcome: 'not_required',
    finalDimensionStates: {
      evaluator: 'pass', color: 'pass', angle: 'pass', studio: 'pass', material: 'pass',
      topology: 'pass', framing: 'pass', geometry: 'pass',
    },
    finalCombinedGateState: 'pass',
    terminalOutcome: 'not_authorized',
    startedAt: '2026-08-25T00:00:00.000Z',
  }
}

function approvalFixture() {
  const initialProduct = isolatedProduct('pending')
  const manifest = createVisualOnlyV01BoundaryManifest({
    product: initialProduct,
    productId: 77,
    stockNumber: 'SN0077',
    productFamily: 'generic',
    jobId: '7',
    reviewChatId: '770077',
    reviewerUserId: '7700',
    nonce: '1'.repeat(32),
  })
  const seed = createImageGenerationAttempt({
    jobId: '7',
    requestedSlotIds: GENERATED_SLOT_KEYS,
    attemptId: rootAttemptId,
    attemptKind: 'initial',
    attemptOrdinal: 1,
    parentAttemptId: null,
    retryPolicyVersion: VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
    visualOnlyBoundary: manifest,
    now: '2026-08-25T00:00:00.000Z',
  })
  const completed = {
    ...finishImageGenerationAttempt(
      seed,
      seed.slots.map((slot) => ({
        ...slot,
        status: 'persisted' as const,
        mediaId: 801 + slot.displayOrder,
        mediaUrl: `/media/${slot.slotId}.jpg`,
        qualityRetry: passingRootEvidence('7', slot.slotId),
      })),
      '2026-08-25T00:00:01.000Z',
    ),
    qualityProfile: 'visual-lock/v0.1',
    productFamily: 'generic',
    qualityGateSummary: { packResults: { qualityGateStatus: 'pass' } },
  } as ImageGenerationAttemptMetadata
  const packSelection = buildImageGenerationPackSelection({
    attempts: [completed],
    rootAttemptId,
    sourcesBySlot: Object.fromEntries(GENERATED_SLOT_KEYS.map((slotId) => [slotId, rootAttemptId])),
  })
  const root = { ...completed, packSelection }
  const preview = createVisualOnlyV01PreviewBinding({ manifest, rootAttemptId, packSelection })
  const media = packSelection.slots.map((slot) => ({
    id: slot.mediaId,
    product: 77,
    type: 'generated',
    generationLineage: {
      contractVersion: 'image-slot-contract/v1',
      jobId: '7',
      attemptId: slot.sourceAttemptId,
      slotId: slot.slotId,
    },
  }))
  const job = {
    id: 7,
    product: 77,
    status: 'preview',
    activeAttemptId: rootAttemptId,
    generationAttempts: [root],
    generatedImages: packSelection.slots.map((slot) => slot.mediaId),
    promptsUsed: JSON.stringify({
      executionMode: VISUAL_ONLY_V01_MODE,
      visualOnlyBoundary: manifest,
      visualOnlyPreview: preview,
    }),
  }
  return {
    manifest,
    preview,
    root,
    packSelection,
    product: isolatedProduct('preview'),
    media,
    job,
    callback: { data: `voa:7:${preview.callbackToken}`, chatId: 770077, userId: 7700 },
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function syntheticAdapter(seed = approvalFixture()) {
  const state = clone(seed)
  const calls = {
    authorize: 0, claim: 0, lock: 0, updateProduct: 0, updateJob: 0,
    confirmationWizard: 0, publish: 0, advertising: 0, shopier: 0,
    dispatch: 0, activation: 0, sellability: 0, provider: 0, telegram: 0,
  }
  const adapter: VisualOnlyV01AtomicAdapter<Record<string, never>> = {
    authorizeCallback: async (callback) => {
      calls.authorize += 1
      if (state.job.status !== 'preview' && state.job.status !== 'review') {
        throw new Error('VISUAL_ONLY_CALLBACK_REPLAYED_OR_TERMINAL')
      }
      planVisualOnlyV01Decision({ callback, job: state.job, product: state.product, media: state.media })
    },
    runAtomic: (operation) => operation({}),
    claimJob: async () => {
      calls.claim += 1
      if (state.job.status !== 'preview' && state.job.status !== 'review') return false
      state.job.status = 'review'
      return true
    },
    lockProduct: async () => { calls.lock += 1; return true },
    readJob: async () => state.job,
    readProduct: async () => state.product,
    readMedia: async () => state.media,
    updateProduct: async (_transaction, _productId, data) => {
      calls.updateProduct += 1
      state.product = { ...state.product, ...data } as typeof state.product
    },
    updateJob: async (_transaction, _jobId, data) => {
      calls.updateJob += 1
      state.job = { ...state.job, ...data } as typeof state.job
    },
  }
  return { adapter, calls, state }
}

async function installedPayloadAdapterFixture() {
  const [{ createTableName }, { postgresAdapter }] = await Promise.all([
    import('@payloadcms/drizzle'),
    import('@payloadcms/db-postgres'),
  ])
  const payloadRuntime: RecordValue = {
    collections: {
      products: { config: Products },
      'image-generation-jobs': { config: ImageGenerationJobs },
    },
    findByID: async () => null,
    find: async () => ({ docs: [] }),
    update: async () => null,
  }
  const adapterFactory = postgresAdapter({ pool: {}, push: false })
  const installedAdapter = adapterFactory.init({ payload: payloadRuntime as never })
  payloadRuntime.db = installedAdapter
  const imageJobTableName = createTableName({ adapter: installedAdapter, config: ImageGenerationJobs })
  const productTableName = createTableName({ adapter: installedAdapter, config: Products })
  installedAdapter.tables[imageJobTableName] = installedAdapter.pgSchema.table(imageJobTableName, {
    id: integer('id'),
    status: text('status'),
    updatedAt: timestamp('updated_at'),
  })
  installedAdapter.tables[productTableName] = installedAdapter.pgSchema.table(productTableName, {
    id: integer('id'),
  })
  return { payloadRuntime, installedAdapter, imageJobTableName, productTableName }
}

function cloneAdapterAuthority(value: Awaited<ReturnType<typeof installedPayloadAdapterFixture>>): RecordValue {
  return {
    ...value.payloadRuntime,
    db: {
      ...value.installedAdapter,
      tableNameMap: new Map(value.installedAdapter.tableNameMap),
      tables: { ...value.installedAdapter.tables },
    },
  }
}

async function assertVisualCallbackRefused(params: {
  input?: RecordValue
  settings?: unknown
  settingsFailure?: boolean
}): Promise<void> {
  const runtime = syntheticAdapter()
  const routeCalls = { settings: 0, execute: 0, acknowledge: 0, notify: 0, schedule: 0 }
  await assert.rejects(() => executeAuthorizedVisualOnlyCallback({
    callbackQueryId: 'callback-77',
    data: runtime.state.callback.data,
    chatId: runtime.state.callback.chatId,
    chatType: 'private',
    userId: runtime.state.callback.userId,
    botRole: 'uygunops',
    expectedWebhookSecret: 'configured-secret',
    providedWebhookSecret: 'configured-secret',
    ...params.input,
  }, {
    loadAutomationSettings: async () => {
      routeCalls.settings += 1
      if (params.settingsFailure) throw new Error('settings unavailable')
      return params.settings ?? { telegram: { allowedUserIds: '7700' } }
    },
    executeDecision: async (callback) => {
      routeCalls.execute += 1
      return executeVisualOnlyV01Decision({ adapter: runtime.adapter, callback })
    },
    acknowledge: async () => { routeCalls.acknowledge += 1 },
    notify: async () => { routeCalls.notify += 1 },
  }), /VISUAL_ONLY_/)
  assert.equal(routeCalls.acknowledge, 0)
  assert.equal(routeCalls.notify, 0)
  assert.equal(routeCalls.schedule, 0)
  assert.equal(runtime.calls.claim, 0)
  assert.equal(runtime.calls.updateProduct, 0)
  assert.equal(runtime.calls.updateJob, 0)
  assert.deepEqual(
    Object.fromEntries(Object.entries(runtime.calls).filter(([name]) =>
      ['confirmationWizard', 'publish', 'advertising', 'shopier', 'dispatch', 'activation', 'sellability', 'provider', 'telegram'].includes(name))),
    {
      confirmationWizard: 0, publish: 0, advertising: 0, shopier: 0, dispatch: 0,
      activation: 0, sellability: 0, provider: 0, telegram: 0,
    },
  )
}

function expectPlanFailure(mutator: (value: ReturnType<typeof approvalFixture>) => void, label: string): void {
  const value = approvalFixture()
  mutator(value)
  assert.throws(
    () => planVisualOnlyV01Decision({ callback: value.callback, job: value.job, product: value.product, media: value.media }),
    /VISUAL_ONLY_/,
    label,
  )
}

async function main(): Promise<void> {
  const exactCommand = '#gorsel 77 --stock=SN0077 --profile=visual-lock-v0.1 --family=generic --mode=visual-only-v0.1 --owner-confirm=OWNER_CONFIRMED_VISUAL_ONLY_V0_1'
  const parsed = parseVisualLockCommand({
    text: exactCommand,
    chatType: 'private',
    botRole: 'uygunops',
    dmAccessReason: 'allowlisted',
  })
  assert.equal(parsed.kind, 'accepted')
  if (parsed.kind === 'accepted') {
    assert.equal(parsed.executionMode, VISUAL_ONLY_V01_MODE)
    assert.equal(parsed.stockNumber, 'SN0077')
  }
  for (const command of [
    exactCommand.replace(' --mode=visual-only-v0.1', ''),
    exactCommand.replace('visual-only-v0.1', 'visual-only-v0.2'),
    exactCommand.replace('OWNER_CONFIRMED_VISUAL_ONLY_V0_1', 'OWNER_CONFIRMED'),
    exactCommand.replace('#gorsel 77', '#gorsel 0'),
  ]) {
    assert.equal(parseVisualLockCommand({ text: command, chatType: 'private', botRole: 'uygunops', dmAccessReason: 'allowlisted' }).kind, 'rejected')
  }
  assert.deepEqual(parseVisualLockCommand({
    text: '#gorsel 77 --profile=visual-lock-v0.1 --family=generic',
    chatType: 'private', botRole: 'uygunops', dmAccessReason: 'allowlisted',
  }), {
    kind: 'accepted', productId: 77, qualityProfile: 'visual-lock-v0.1', profileVersion: 'visual-lock/v0.1', family: 'generic',
  })

  {
    const value = approvalFixture()
    const attemptOnlyMarker = { ...value.job, promptsUsed: '{}' }
    assert.equal(hasVisualOnlyBoundaryMarker(attemptOnlyMarker), true)
    const plan = planVisualOnlyV01Decision({ callback: value.callback, job: value.job, product: value.product, media: value.media })
    assert.equal(plan.action, 'approve')
    assert.deepEqual(plan.mediaIds, [801, 802, 803, 804, 805])
    assert.deepEqual(plan.productData.generativeGallery, [801, 802, 803, 804, 805].map((image) => ({ image })))
    assert.equal((plan.productData.workflow as RecordValue).sellable, false)
  }

  expectPlanFailure((value) => { value.callback.data = `voa:8:${value.preview.callbackToken}` }, 'job mismatch')
  expectPlanFailure((value) => { value.callback.userId = 7701 }, 'reviewer mismatch')
  expectPlanFailure((value) => { value.callback.chatId = 770078 }, 'chat mismatch')
  expectPlanFailure((value) => { value.callback.data = 'voa:7:00000000000000000000' }, 'token mismatch')
  expectPlanFailure((value) => { value.product.stockNumber = 'SN0078' }, 'product drift')
  expectPlanFailure((value) => { value.job.product = 78 }, 'product identity')
  expectPlanFailure((value) => {
    const prompts = JSON.parse(value.job.promptsUsed) as RecordValue
    prompts.executionMode = 'visual-only-v0.2'
    value.job.promptsUsed = JSON.stringify(prompts)
  }, 'mode alteration')
  expectPlanFailure((value) => { value.root.visualOnlyBoundary = undefined; value.job.generationAttempts = [value.root] }, 'attempt boundary missing')
  expectPlanFailure((value) => { value.root.packSelection = { ...value.packSelection, visualOnlyBoundaryDigest: '0'.repeat(64) }; value.job.generationAttempts = [value.root] }, 'pack boundary altered')
  expectPlanFailure((value) => { value.job.generatedImages = value.job.generatedImages.slice(0, 4) }, 'missing slot')
  expectPlanFailure((value) => { value.job.generatedImages = [...value.job.generatedImages, 999] }, 'extra slot')
  expectPlanFailure((value) => { value.job.generatedImages[4] = value.job.generatedImages[0] }, 'duplicate slot')
  expectPlanFailure((value) => { value.media[0].product = 99 }, 'foreign media')
  expectPlanFailure((value) => { value.media[0].generationLineage.slotId = 'detail' }, 'slot lineage mismatch')
  expectPlanFailure((value) => { value.root.slots[0].status = 'provider_failed'; value.job.generationAttempts = [value.root] }, 'failed slot')

  {
    const runtime = syntheticAdapter()
    const result = await executeVisualOnlyV01Decision({ adapter: runtime.adapter, callback: runtime.state.callback })
    assert.deepEqual(result, { action: 'approve', jobId: '7', productId: 77, mediaCount: 5 })
    assert.equal(runtime.state.product.status, 'draft')
    assert.equal((runtime.state.product.workflow as RecordValue).visualStatus, 'approved')
    assert.equal((runtime.state.product.workflow as RecordValue).sellable, false)
    assert.equal(runtime.state.job.status, 'approved')
    assert.deepEqual(
      Object.fromEntries(Object.entries(runtime.calls).filter(([name]) => !['authorize', 'claim', 'lock', 'updateProduct', 'updateJob'].includes(name))),
      {
        confirmationWizard: 0, publish: 0, advertising: 0, shopier: 0, dispatch: 0,
        activation: 0, sellability: 0, provider: 0, telegram: 0,
      },
    )
    await assert.rejects(
      () => executeVisualOnlyV01Decision({ adapter: runtime.adapter, callback: runtime.state.callback }),
      /VISUAL_ONLY_CALLBACK_REPLAYED_OR_TERMINAL/,
    )
    assert.equal(runtime.calls.updateProduct, 1)
    assert.equal(runtime.calls.updateJob, 1)
  }

  {
    const value = approvalFixture()
    value.callback.data = `vor:7:${value.preview.callbackToken}`
    const runtime = syntheticAdapter(value)
    const result = await executeVisualOnlyV01Decision({ adapter: runtime.adapter, callback: runtime.state.callback })
    assert.equal(result.action, 'reject')
    assert.equal((runtime.state.product.workflow as RecordValue).visualStatus, 'rejected')
    assert.equal((runtime.state.product.workflow as RecordValue).sellable, false)
    assert.equal(runtime.state.product.status, 'draft')
    assert.equal(runtime.calls.confirmationWizard, 0)
    assert.equal(runtime.calls.publish, 0)
    assert.equal(runtime.calls.dispatch, 0)
    assert.equal(runtime.calls.shopier, 0)
  }

  {
    const runtime = syntheticAdapter()
    runtime.state.product.workflow = { ...(runtime.state.product.workflow as RecordValue), confirmationStatus: 'confirmed' }
    await assert.rejects(
      () => executeVisualOnlyV01Decision({ adapter: runtime.adapter, callback: runtime.state.callback }),
      /VISUAL_ONLY_PRODUCT_STATE_DRIFT/,
    )
    assert.equal(runtime.calls.updateProduct, 0)
    assert.equal(runtime.calls.updateJob, 0)
  }

  // Installed Payload 3.79/Postgres naming authority: no database connection,
  // query, transaction, or mutation is performed by this adapter probe.
  {
    const installed = await installedPayloadAdapterFixture()
    assert.equal(installed.imageJobTableName, 'image_generation_jobs')
    assert.equal(installed.productTableName, 'products')
    assert.equal(getTableName(installed.installedAdapter.tables.image_generation_jobs), 'image_generation_jobs')
    assert.equal(getTableName(installed.installedAdapter.tables.products), 'products')
    const authority = resolveVisualOnlyV01TableAuthority(installed.payloadRuntime)
    assert.equal(authority.jobTable, installed.installedAdapter.tables.image_generation_jobs)
    assert.equal(authority.productTable, installed.installedAdapter.tables.products)
    assert.ok(authority.jobTable.id && authority.jobTable.status && authority.jobTable.updatedAt)
    assert.ok(authority.productTable.id)
    let queryCount = 0
    installed.installedAdapter.sessions['offline-transaction'] = {
      db: { execute: async () => { queryCount += 1; return { rows: [] } } } as never,
      reject: async () => undefined,
      resolve: async () => undefined,
    }
    const prepared = await prepareVisualOnlyV01AtomicRuntime(
      installed.payloadRuntime,
      { transactionID: Promise.resolve('offline-transaction') } as never,
    )
    assert.equal(prepared.jobTable, authority.jobTable)
    assert.equal(prepared.productTable, authority.productTable)
    assert.equal(queryCount, 0)

    const missingMap = cloneAdapterAuthority(installed)
    delete (missingMap.db as RecordValue).tableNameMap
    assert.throws(() => resolveVisualOnlyV01TableAuthority(missingMap), /VISUAL_ONLY_ATOMIC_RUNTIME_UNAVAILABLE/)

    const wrongPhysical = cloneAdapterAuthority(installed)
    ;((wrongPhysical.db as RecordValue).tableNameMap as Map<string, string>)
      .set('image_generation_jobs', 'wrong_image_generation_jobs')
    assert.throws(() => resolveVisualOnlyV01TableAuthority(wrongPhysical), /VISUAL_ONLY_ATOMIC_RUNTIME_UNAVAILABLE/)

    const missingColumn = cloneAdapterAuthority(installed)
    ;((missingColumn.db as RecordValue).tables as Record<string, unknown>).image_generation_jobs = {
      id: authority.jobTable.id,
      status: authority.jobTable.status,
    }
    assert.throws(() => resolveVisualOnlyV01TableAuthority(missingColumn), /VISUAL_ONLY_ATOMIC_RUNTIME_UNAVAILABLE/)

    const ambiguous = cloneAdapterAuthority(installed)
    ;((ambiguous.db as RecordValue).tableNameMap as Map<string, string>)
      .set('another_collection', 'image_generation_jobs')
    assert.throws(() => resolveVisualOnlyV01TableAuthority(ambiguous), /VISUAL_ONLY_ATOMIC_RUNTIME_UNAVAILABLE/)

    const beginCalls = { count: 0 }
    const invalidPayload = cloneAdapterAuthority(installed)
    delete (invalidPayload.db as RecordValue).tableNameMap
    ;(invalidPayload.db as RecordValue).beginTransaction = async () => { beginCalls.count += 1; return 'tx' }
    const productionAdapter = createVisualOnlyV01PayloadAdapter(invalidPayload as never)
    await assert.rejects(
      () => productionAdapter.runAtomic(async () => null),
      /VISUAL_ONLY_ATOMIC_RUNTIME_UNAVAILABLE/,
    )
    assert.equal(beginCalls.count, 0)
  }

  // The production route executor proves current authorization and complete
  // persisted identity before the atomic claim and before acknowledgement.
  {
    const runtime = syntheticAdapter()
    const routeCalls = { settings: 0, execute: 0, acknowledge: 0, notify: 0, schedule: 0 }
    const dependencies = {
      loadAutomationSettings: async () => {
        routeCalls.settings += 1
        return { telegram: { allowedUserIds: '7700,8800' } }
      },
      executeDecision: async (callback: { data: string; chatId: number; userId: number }) => {
        routeCalls.execute += 1
        return executeVisualOnlyV01Decision({ adapter: runtime.adapter, callback })
      },
      acknowledge: async () => { routeCalls.acknowledge += 1 },
      notify: async () => { routeCalls.notify += 1 },
    }
    const input = {
      callbackQueryId: 'callback-77',
      data: runtime.state.callback.data,
      chatId: runtime.state.callback.chatId,
      chatType: 'private',
      userId: runtime.state.callback.userId,
      botRole: 'uygunops' as const,
      expectedWebhookSecret: 'configured-secret',
      providedWebhookSecret: 'configured-secret',
    }
    const accepted = await executeAuthorizedVisualOnlyCallback(input, dependencies)
    assert.equal(accepted.action, 'approve')
    assert.deepEqual(routeCalls, { settings: 1, execute: 1, acknowledge: 1, notify: 1, schedule: 0 })
    assert.equal(runtime.calls.claim, 1)
    assert.equal(runtime.calls.updateProduct, 1)
    assert.equal(runtime.calls.updateJob, 1)
    await assert.rejects(
      () => executeAuthorizedVisualOnlyCallback(input, dependencies),
      /VISUAL_ONLY_CALLBACK_REPLAYED_OR_TERMINAL/,
    )
    assert.equal(routeCalls.acknowledge, 1)
    assert.equal(routeCalls.notify, 1)
    assert.equal(runtime.calls.claim, 1)
    assert.equal(runtime.calls.updateProduct, 1)
    assert.equal(runtime.calls.updateJob, 1)
  }

  await assertVisualCallbackRefused({ input: { userId: 7700 }, settings: { telegram: { allowedUserIds: '8800' } } })
  await assertVisualCallbackRefused({ settings: { telegram: { allowedUserIds: '' } } })
  await assertVisualCallbackRefused({ settings: { telegram: {} } })
  await assertVisualCallbackRefused({ settingsFailure: true })
  await assertVisualCallbackRefused({ settings: [] })
  await assertVisualCallbackRefused({ input: { expectedWebhookSecret: undefined } })
  await assertVisualCallbackRefused({ input: { providedWebhookSecret: undefined } })
  await assertVisualCallbackRefused({ input: { providedWebhookSecret: 'wrong-secret' } })
  await assertVisualCallbackRefused({ input: { chatType: 'group' } })
  await assertVisualCallbackRefused({ input: { botRole: 'geo' } })
  await assertVisualCallbackRefused({ input: { userId: undefined } })
  await assertVisualCallbackRefused({
    input: { userId: 7701 },
    settings: { telegram: { allowedUserIds: '7701' } },
  })
  await assertVisualCallbackRefused({ input: { chatId: 770078 } })

  const routeSource = readFileSync(new URL('../app/api/telegram/route.ts', import.meta.url), 'utf8')
  const callbackRuntimeSource = readFileSync(new URL('./visualOnlyCallbackRuntime.ts', import.meta.url), 'utf8')
  const taskSource = readFileSync(new URL('../jobs/imageGenTask.ts', import.meta.url), 'utf8')
  const collectionSource = readFileSync(new URL('../collections/ImageGenerationJobs.ts', import.meta.url), 'utf8')
  assert.match(routeSource, /VISUAL_ONLY_BOUND_CALLBACK_REQUIRED/)
  assert.match(routeSource, /VISUAL_ONLY_REGENERATION_FORBIDDEN/)
  assert.match(routeSource, /executeVisualOnlyV01Decision/)
  assert.ok(routeSource.indexOf('executeAuthorizedVisualOnlyCallback({') < routeSource.indexOf('// Wrong-bot redirects'))
  assert.ok(callbackRuntimeSource.indexOf('loadAutomationSettings()') < callbackRuntimeSource.indexOf('executeDecision('))
  assert.ok(callbackRuntimeSource.indexOf('executeDecision(') < callbackRuntimeSource.indexOf('acknowledge('))
  assert.match(taskSource, /visualOnlyPreview/)
  assert.match(taskSource, /voa:\$\{jobId\}:\$\{visualOnlyPreview\.callbackToken\}/)
  assert.match(collectionSource, /VISUAL_ONLY_ATOMIC_APPROVAL_BOUNDARY_REQUIRED/)
  assert.match(collectionSource, /VISUAL_ONLY_BOUNDARY_REMOVAL_FORBIDDEN/)

  console.log('visualOnlyApprovalV01: ALL OK')
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
