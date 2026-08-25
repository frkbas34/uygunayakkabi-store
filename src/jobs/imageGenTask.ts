/**
 * imageGenTask — Step 25 v11 / v16 role: STAGE 2 ONLY (Gemini Pro)
 *
 * Payload Jobs Queue task for AI product image generation.
 *
 * v17 ARCHITECTURE (2026-03-31):
 *   Multiple active entry points — explicit engine selection by operator.
 *
 * ACTIVE USE (v17):
 *   Stage 1 explicit ChatGPT: #chatgpt {id} → provider='openai', stage='standard'
 *   Stage 1 explicit Gemini Pro: #geminipro {id} → provider='gemini-pro', stage='standard'
 *   Stage 2 premium: imgpremium button → provider='gemini-pro', stage='premium' (slots 4-5)
 *
 *   Default Stage 1 (slots 1-3) → #gorsel → image-gen.
 *   This task handles all image-gen (openai + gemini-pro) explicit engine requests.
 *
 * REGEN ROUTING (v17):
 *   provider='openai'     → re-queues image-gen/openai (preserves explicit engine)
 *   provider='gemini-pro' → re-queues image-gen/gemini-pro
 *
 * v11 PREVIEW FLOW: images are NOT attached to product until operator
 * explicitly approves via Telegram. See route.ts for approval handlers.
 */

import type { TaskConfig } from 'payload'
// D-407: central 5-slot contract — slot keys/labels/order + per-image metadata.
import {
  IMAGE_SLOT_CONTRACT_VERSION,
  SLOT_PROMPT_VERSION,
  buildSlotMeta,
  getSlotByKey,
  type SlotKey,
} from '../lib/imageSlotContract'
import {
  adaptLegacyProviderOutput,
  areGenerationAttemptHistoriesSemanticallyEqual,
  buildImageGenerationPackSelection,
  createImageGenerationAttempt,
  finishImageGenerationAttempt,
  markAttemptSlotsGenerating,
  markAttemptSlotsSkipped,
  parseGenerationAttemptHistory,
  persistGeneratedSlotEnvelopes,
  requestedSlotIdsForStage,
  safeImageFailureSummary,
  serializeSlotEnvelopes,
  setAttemptSlotStatus,
  upsertGenerationAttemptHistory,
  type ImageGenerationAttemptMetadata,
  type ImageSlotExecutionEnvelope,
} from '../lib/imageGenerationContracts'
import {
  buildVisualLockContext,
  buildVisualLockV01PromptBlock,
  buildVisualLockV01FailureWorkflow,
  buildVisualQualityGateSummaryV01,
  combineVisualQualityGateV01,
  evaluateVisualGeometryMeasurementV01,
  evaluateVisualGeometryPackV01,
  isVisualLockV01Context,
  measureVisualGeometryV01,
  resolveVisualLockTaskSelection,
  type VisualGeometryGateResultV01,
  type VisualQualityTriState,
} from '../lib/imageVisualLockV01'
import { VISUAL_LOCK_V01_FRAMING_CORRECTION_VERSION } from '../lib/imageFramingCorrectionV01'
import {
  VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
  VISUAL_QUALITY_RETRY_TARGET_ORDER,
  buildVisualQualityRetryPromptV01,
  classifyVisualQualityRetryV01,
  createVisualQualityRetryEvidenceV01,
  digestVisualQualityRetryPromptV01,
  executeSingleVisualQualityRetryProviderV01,
  failVisualQualityRetryPersistenceV01,
  finalizeVisualQualityRetryEvidenceV01,
  hasSufficientSourceEvidenceForRetryV01,
  isVisualQualityRetryGeometryReasonV01,
  mergeVisualQualityRetrySlotV01,
  type VisualQualityRetryAuthorizedDecisionV01,
  type VisualQualityRetryDimensionStatesV01,
  type VisualQualityRetryEvidenceV01,
  type VisualQualityRetryExecutionUsageV01,
} from '../lib/imageQualityRetryV01'
import {
  createVisualOnlyV01PreviewBinding,
  hasVisualOnlyBoundaryMarker,
  parseVisualOnlyJobEvidence,
  parseVisualOnlyV01BoundaryText,
  verifyVisualOnlyProductState,
  VISUAL_ONLY_V01_MODE,
  type VisualOnlyV01BoundaryManifest,
  type VisualOnlyV01PreviewBinding,
} from '../lib/visualOnlyV01'
import {
  parseVisualOnlyProvisioningEvidence,
  type VisualOnlyProvisioningBinding,
} from '../lib/visualOnlyProvisioning'

export const imageGenTask: TaskConfig<{
  input: {
    jobId: string
    stage?: string
    provider?: string
    visualFacts?: string
    qualityProfile?: string
    productFamily?: string
    executionMode?: string
    visualOnlyBoundary?: string
  }
  output: {
    success: boolean
    mediaIds: string
    error: string
  }
}> = {
  slug: 'image-gen',
  label: 'AI Görsel Üretimi',
  retries: 0,

  inputSchema: [
    { name: 'jobId', type: 'text', required: true },
    { name: 'stage', type: 'text' },    // 'standard' (slots 1-3) | 'premium' (slots 4-5)
    { name: 'provider', type: 'text' }, // 'openai' (default) | 'gemini-pro'
    { name: 'visualFacts', type: 'text' }, // D-355N: operator-verified product facts injected into every slot prompt
    { name: 'qualityProfile', type: 'text' }, // Existing task-input JSON; no collection/schema field.
    { name: 'productFamily', type: 'text' }, // Explicit operator choice; no automatic V0 classification.
    { name: 'executionMode', type: 'text' }, // Explicit, fail-closed visual-only execution marker.
    { name: 'visualOnlyBoundary', type: 'text' }, // Signed-digest manifest in existing task-input JSON.
  ],

  outputSchema: [
    { name: 'success', type: 'checkbox' },
    { name: 'mediaIds', type: 'text' },
    { name: 'error', type: 'text' },
  ],

  onFail: async ({ job, req }) => {
    const jobId = (
      (job.taskStatus?.['image-gen'] as Record<string, unknown> | undefined)
        ?.input as Record<string, unknown> | undefined
    )?.jobId as string | undefined

    if (!jobId) return

    try {
      await req.payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          status: 'failed',
          errorMessage: 'Job başarısız oldu — Payload Jobs kaydını kontrol edin',
          generationCompletedAt: new Date().toISOString(),
        },
      })
    } catch (err) {
      console.error('[imageGenTask] onFail cleanup error:', err)
    }
  },

  handler: async ({ input, job, req }) => {
    const { jobId } = input
    // D-355B: the standard pack now generates the full 5-image studio set (slots
    // 1-5) by default, not just slots 1-3. 'premium' remains a backward-compatible
    // path that (re)generates only slots 4-5 for older or partial jobs.
    // stage: 'standard' → slots 1-5 (default for #gorsel) | 'premium' → slots 4-5
    const stage = (input.stage || 'standard') as 'standard' | 'premium'
    const requestedSlotIds = requestedSlotIdsForStage(stage)
    const sceneIndices = requestedSlotIds.map((slotId) => {
      const slot = getSlotByKey(slotId)
      if (!slot) throw new Error(`Canonical slot bulunamadı: ${slotId}`)
      return slot.displayOrder
    })
    // provider: 'openai' (default, gpt-image-1 edit) | 'gemini-pro' (Gemini image gen)
    // v19 Gemini-only: default provider is gemini-pro (was 'openai' before v19)
    const provider = (input.provider || 'gemini-pro') as 'openai' | 'gemini-pro'
    const payload = req.payload
    const visualLockSelection = resolveVisualLockTaskSelection(input)
    let visualOnlyBoundary: VisualOnlyV01BoundaryManifest | null = null
    let visualOnlyProvisioning: VisualOnlyProvisioningBinding | null = null
    let attemptMetadata: ImageGenerationAttemptMetadata = createImageGenerationAttempt({
      jobId,
      requestedSlotIds,
      ...(visualLockSelection?.profileVersion === 'visual-lock/v0.1' ? {
        attemptKind: 'initial' as const,
        attemptOrdinal: 1 as const,
        parentAttemptId: null,
        retryPolicyVersion: VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
      } : {}),
    })
    if (visualLockSelection) {
      attemptMetadata = {
        ...attemptMetadata,
        qualityProfile: visualLockSelection.profileVersion,
        productFamily: visualLockSelection.family,
      }
    }

    console.log(`[imageGenTask v14] start — jobId=${jobId} stage=${stage} provider=${provider} sceneIndices=[${sceneIndices}]`)

    // ── Step 1: Fetch the job record ────────────────────────────────────────
    let jobDoc: Record<string, unknown>
    try {
      jobDoc = await payload.findByID({
        collection: 'image-generation-jobs',
        id: jobId,
        depth: 1,
      }) as Record<string, unknown>
    } catch {
      throw new Error(`Job bulunamadı: ${jobId}`)
    }

    const mode = (jobDoc.mode as string) || 'hizli' // cosmetic only — all modes use same pipeline
    const telegramChatId = jobDoc.telegramChatId as string | undefined
    const productRef = jobDoc.product as { id: number } | number | null

    if (!productRef) throw new Error('Job kayıtında ürün referansı eksik')

    const productId = typeof productRef === 'object' ? productRef.id : productRef

    const hasVisualOnlyInputMarker = input.executionMode !== undefined || input.visualOnlyBoundary !== undefined
    if (hasVisualOnlyBoundaryMarker(jobDoc) !== hasVisualOnlyInputMarker) {
      throw new Error('VISUAL_ONLY_EXECUTION_BOUNDARY_MISSING_OR_SUBSTITUTED')
    }
    if (hasVisualOnlyInputMarker) {
      visualOnlyBoundary = parseVisualOnlyV01BoundaryText(input.visualOnlyBoundary)
      const jobEvidence = parseVisualOnlyJobEvidence(jobDoc)
      const provisioningEvidence = parseVisualOnlyProvisioningEvidence(jobDoc)
      if (
        input.executionMode !== VISUAL_ONLY_V01_MODE
        || !visualOnlyBoundary
        || !jobEvidence
        || !provisioningEvidence
        || jobEvidence.preview !== null
        || jobEvidence.manifest.digest !== visualOnlyBoundary.digest
        || visualOnlyBoundary.jobId !== String(jobId)
        || visualOnlyBoundary.productId !== productId
        || visualOnlyBoundary.reviewChatId !== String(jobDoc.telegramChatId ?? '')
        || visualOnlyBoundary.reviewerUserId !== String(jobDoc.requestedByUserId ?? '')
        || provisioningEvidence.binding.queueReceiptId !== String(job.id)
        || provisioningEvidence.binding.manifestDigest !== visualOnlyBoundary.digest
        || visualLockSelection?.profileVersion !== 'visual-lock/v0.1'
        || visualLockSelection.family !== visualOnlyBoundary.productFamily
        || stage !== 'standard'
        || provider !== 'gemini-pro'
        || JSON.stringify(requestedSlotIds) !== JSON.stringify(visualOnlyBoundary.canonicalSlotOrder)
      ) throw new Error('VISUAL_ONLY_EXECUTION_BOUNDARY_INVALID')

      const preflightProduct = await payload.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
      }) as Record<string, unknown>
      const productState = verifyVisualOnlyProductState(preflightProduct, visualOnlyBoundary, 'execution')
      if (!productState.ok) throw new Error(productState.code)
      if (String(preflightProduct.stockNumber ?? '').trim().toUpperCase() !== visualOnlyBoundary.stockNumber) {
        throw new Error('VISUAL_ONLY_STOCK_BINDING_MISMATCH')
      }
      attemptMetadata = { ...attemptMetadata, visualOnlyBoundary }
      visualOnlyProvisioning = provisioningEvidence.binding
    }

    if (visualLockSelection?.profileVersion === 'visual-lock/v0.1') {
      const existingAttempts = parseGenerationAttemptHistory(jobDoc.generationAttempts)
      if (!existingAttempts.ok) throw new Error(existingAttempts.error)
      if (existingAttempts.attempts.some((attempt) => attempt.jobId === String(jobId))) {
        throw new Error('Visual Lock V0.1 job already has an immutable generation attempt; duplicate execution is blocked.')
      }
    }

    const rootAttemptId = attemptMetadata.attemptId
    let attemptHistory = upsertGenerationAttemptHistory(jobDoc.generationAttempts, attemptMetadata)
    const persistAttemptRecords = async (
      attempts: readonly ImageGenerationAttemptMetadata[],
      data: Record<string, unknown> = {},
    ) => {
      for (const attempt of attempts) {
        attemptHistory = upsertGenerationAttemptHistory(attemptHistory, attempt)
      }
      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          generationContractVersion: IMAGE_SLOT_CONTRACT_VERSION,
          // One-slot quality-retry children never replace the active five-slot
          // approval pack. The root remains the operator-facing attempt.
          activeAttemptId: rootAttemptId,
          generationAttempts: attemptHistory,
          ...data,
        },
      })
    }
    const persistAttemptMetadata = async (data: Record<string, unknown> = {}) => {
      await persistAttemptRecords([attemptMetadata], data)
    }

    await persistAttemptMetadata({
      status: 'generating',
      generationStartedAt: attemptMetadata.startedAt,
    })

    // ── Step 2: Fetch product details ────────────────────────────────────────
    let productDoc: Record<string, unknown>
    try {
      productDoc = await payload.findByID({
        collection: 'products',
        id: productId,
        depth: 1,
      }) as Record<string, unknown>
    } catch {
      throw new Error(`Ürün bulunamadı: ${productId}`)
    }

    if (visualOnlyBoundary) {
      const productState = verifyVisualOnlyProductState(productDoc, visualOnlyBoundary, 'execution')
      if (!productState.ok) throw new Error(productState.code)
    }

    const productTitle = (productDoc.title as string) || 'Ürün'
    const finalizeVisualLockV01ProductFailure = async () => {
      if (visualLockSelection?.profileVersion !== 'visual-lock/v0.1') return
      const currentProduct = await payload.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
      }) as Record<string, unknown>
      const workflow = (currentProduct.workflow ?? {}) as Record<string, unknown>
      const failedWorkflow = buildVisualLockV01FailureWorkflow(workflow)
      if (!failedWorkflow) return
      await payload.update({
        collection: 'products',
        id: productId,
        data: { workflow: failedWorkflow },
        context: { isDispatchUpdate: true, isVisualStatusUpdate: true },
      })
    }
    const persistVisualLockV01AttemptRecords = async (
      attempts: readonly ImageGenerationAttemptMetadata[],
      data: Record<string, unknown> = {},
    ) => {
      try {
        await persistAttemptRecords(attempts, data)
      } catch (error) {
        const persistenceError = safeImageFailureSummary(
          error,
          'Visual Lock V0.1 attempt evidence could not be persisted.',
        )
        try {
          await finalizeVisualLockV01ProductFailure()
        } catch (finalizationError) {
          throw new Error(
            `${persistenceError} Product finalization: ${safeImageFailureSummary(finalizationError, 'Product visual failure state could not be finalized.')}`,
          )
        }
        throw new Error(persistenceError)
      }
    }

    // D-415: brand gate REMOVED per operator decision — branded products are sent
    // deliberately to be generated branded; image gen does NOT block on brand.
    // (evaluateImageBrandGate / imageBrandGate.ts retained but not called.)

    // ── Step 2a: Ensure persistent stockNumber ────────────────────────────────
    // Format: SN0001–SN9999. Generated once per product, never changes.
    // Used for deterministic overlay on all generated images.
    let stockNumber = productDoc.stockNumber as string | undefined
    if (visualOnlyBoundary && stockNumber !== visualOnlyBoundary.stockNumber) {
      throw new Error('VISUAL_ONLY_STOCK_BINDING_MISMATCH')
    } else if (!stockNumber) {
      stockNumber = await generateStockNumber(payload)
      await payload.update({
        collection: 'products',
        id: productId,
        data: { stockNumber },
      })
      console.log(`[imageGenTask] stockNumber generated: ${stockNumber} for product ${productId}`)
    } else {
      console.log(`[imageGenTask] stockNumber exists: ${stockNumber}`)
    }

    // ── Step 2b: Load reference image pack (up to 3 images) ─────────────────
    // Primary reference = first product image (required).
    // Additional references (2nd, 3rd product image) give the AI more angles
    // to lock onto the exact product identity — reduces hallucination on retries.
    let referenceImage: Buffer | undefined
    let referenceImageMime: string | undefined
    // D-407: media ID of the primary reference (original product photo) the
    // generation is based on — stamped into every generated image's metadata.
    let sourceImageId: number | null = null
    const additionalReferenceImages: Array<{ data: Buffer; mime: string }> = []

    const siteBase =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

    function absoluteUrl(url: string): string {
      if (url.startsWith('http')) return url
      if (siteBase) return `${siteBase}${url}`
      return url
    }

    // Helper: resolve a media item (populated object or bare ID) to {url, mime}
    async function resolveMedia(
      item: { url?: string; mimeType?: string } | number,
    ): Promise<{ url: string; mime: string } | null> {
      if (typeof item === 'object' && item?.url) {
        return { url: item.url, mime: item.mimeType || 'image/jpeg' }
      }
      if (typeof item === 'number') {
        try {
          const doc = await payload.findByID({
            collection: 'media',
            id: item,
            depth: 0,
          }) as Record<string, unknown>
          if (doc.url) return { url: doc.url as string, mime: (doc.mimeType as string) || 'image/jpeg' }
        } catch (err) {
          console.warn('[imageGenTask] media fetch by ID failed:', err)
        }
      }
      return null
    }

    const imagesArr = productDoc.images as
      | Array<{ image: { url?: string; mimeType?: string } | number }>
      | undefined

    // Load up to 3 product images: primary + up to 2 additional
    const toLoad = (imagesArr ?? []).slice(0, 3)
    for (let i = 0; i < toLoad.length; i++) {
      const item = toLoad[i]?.image
      if (!item) continue
      const resolved = await resolveMedia(item)
      if (!resolved) continue
      const fetchUrl = absoluteUrl(resolved.url)
      try {
        const imgRes = await fetch(fetchUrl)
        if (!imgRes.ok) {
          console.warn(`[imageGenTask v14] ref image ${i + 1} fetch failed HTTP ${imgRes.status}`)
          continue
        }
        const buf = Buffer.from(await imgRes.arrayBuffer())
        if (i === 0) {
          referenceImage = buf
          referenceImageMime = resolved.mime
          // D-407: capture the source (original) media ID for slot metadata.
          sourceImageId = typeof item === 'object'
            ? ((item as { id?: number }).id ?? null)
            : (item as number)
          console.log(`[imageGenTask v14] primary ref — ${buf.length}b ${resolved.mime} sourceImageId=${sourceImageId ?? '—'}`)
        } else {
          additionalReferenceImages.push({ data: buf, mime: resolved.mime })
          console.log(`[imageGenTask v14] additional ref ${i + 1} — ${buf.length}b`)
        }
      } catch (err) {
        console.warn(`[imageGenTask v14] ref image ${i + 1} fetch error:`, err)
      }
    }

    if (referenceImage) {
      console.log(
        `[imageGenTask v14] reference pack ready: 1 primary + ${additionalReferenceImages.length} additional`,
      )
    }

    // ── Step 3: REQUIRE reference image ──────────────────────────────────────
    // No reference image = no generation. No text-to-image fallback.
    if (!referenceImage) {
      const msg =
        'Ürün fotoğrafı bulunamadı — görsel üretimi için ürüne bir fotoğraf eklenmeli. ' +
        'Önce Telegram\'dan fotoğraf gönderin, ardından #gorsel komutunu kullanın.'

      attemptMetadata = markAttemptSlotsSkipped(attemptMetadata, 'input_unavailable', msg)
      await persistAttemptMetadata({
        status: 'failed',
        errorMessage: msg,
        generationCompletedAt: attemptMetadata.completedAt,
      })

      if (telegramChatId) {
        await sendTelegramNotification(
          telegramChatId,
          `❌ <b>Görsel üretimi başarısız</b>\n\n` +
          `Ürün fotoğrafı bulunamadı. Önce bir ürün fotoğrafı gönderin, ardından <code>#gorsel</code> komutunu kullanın.`,
        )
      }

      throw new Error(msg)
    }

    // ── Step 4: STEP A — Input Validation ────────────────────────────────────
    if (process.env.GEMINI_API_KEY) {
      const { validateProductImage } = await import('../lib/imageProviders')
      const validation = await validateProductImage(
        referenceImage,
        referenceImageMime || 'image/jpeg',
        process.env.GEMINI_API_KEY,
      )

      console.log(
        `[imageGenTask v14] validation: valid=${validation.valid} ` +
        `confidence=${validation.confidence} class=${validation.productClass || '-'}`,
      )

      if (!validation.valid) {
        const rejectionMsg =
          `Görsel geçersiz — bu bir ayakkabı/ürün fotoğrafı değil` +
          (validation.rejectionReason ? `: ${validation.rejectionReason}` : '') +
          `. Lütfen ürün fotoğrafı gönderin.`

        attemptMetadata = markAttemptSlotsSkipped(attemptMetadata, 'input_rejected', rejectionMsg)
        await persistAttemptMetadata({
          status: 'failed',
          errorMessage: rejectionMsg,
          generationCompletedAt: attemptMetadata.completedAt,
          providerResults: JSON.stringify({
            contractVersion: IMAGE_SLOT_CONTRACT_VERSION,
            attemptId: attemptMetadata.attemptId,
            rejected: true,
            reason: safeImageFailureSummary(validation.rejectionReason, 'Reference validation rejected the input.'),
            slotResults: attemptMetadata.slots,
          }),
        })

        if (telegramChatId) {
          await sendTelegramNotification(
            telegramChatId,
            `⚠️ <b>Görsel reddedildi</b>\n\n` +
            `Bu fotoğraf ayakkabı/ürün olarak tanınamadı` +
            (validation.rejectionReason ? ` (<i>${validation.rejectionReason}</i>)` : '') +
            `.\nLütfen net bir ürün fotoğrafı gönderin.`,
          )
        }

        throw new Error(rejectionMsg)
      }
    }

    // ── Step 5: STEP B — Identity Lock Extraction ────────────────────────────
    // generateByEditing / generateByGeminiPro imported later in Step 6 (provider-routed)
    const { extractIdentityLock } = await import('../lib/imageProviders')
    type IdentityLock = Awaited<ReturnType<typeof extractIdentityLock>>

    let identityLock: NonNullable<IdentityLock>
    let identityLockMeta: Record<string, unknown> = {}

    if (process.env.GEMINI_API_KEY) {
      const lock = await extractIdentityLock(
        referenceImage,
        referenceImageMime || 'image/jpeg',
        process.env.GEMINI_API_KEY,
      )

      if (lock) {
        identityLock = lock
        identityLockMeta = {
          productClass: lock.productClass,
          mainColor: lock.mainColor,
          accentColor: lock.accentColor,
          material: lock.material,
          toeShape: lock.toeShape,
          soleProfile: lock.soleProfile,
          heelProfile: lock.heelProfile,
          closureType: lock.closureType,
          distinctiveFeatures: lock.distinctiveFeatures,
          referenceAngle: lock.referenceAngle,
          // v12: protected zones summary for admin visibility
          protectedZones: (lock.protectedZones || []).map((z) => `${z.name}: ${z.description}`),
        }
        console.log(
          `[imageGenTask v14] identity: ${lock.productClass} | ${lock.mainColor} | ${lock.material} | ` +
          `zones=${lock.protectedZones?.length || 0} | angle=${lock.referenceAngle}`,
        )
      } else {
        console.warn('[imageGenTask v14] identity extraction failed — using fallback')
        identityLock = buildFallbackLock()
        identityLockMeta = { fallback: true }
      }
    } else {
      console.warn('[imageGenTask v14] no GEMINI_API_KEY — using fallback identity lock')
      identityLock = buildFallbackLock()
      identityLockMeta = { fallback: true, noGemini: true }
    }

    // ── Step 6: STEP C — Image Generation (provider-routed) ─────────────────
    // v14: provider='openai' → generateByEditing (gpt-image-1, default, unchanged)
    //      provider='gemini-pro' → generateByGeminiPro (Gemini image gen, optional)
    // Slot identity comes from the canonical semantic registry. Display order is
    // presentation metadata only and is never reconstructed from a result index.
    const visualLockContext = visualLockSelection
      ? buildVisualLockContext({
          selection: visualLockSelection,
          identityEvidence: identityLock,
          operatorVisualFacts: input.visualFacts,
        })
      : undefined
    if (visualLockContext) {
      attemptMetadata = {
        ...attemptMetadata,
        identityAnchorHash: visualLockContext.identityAnchorHash,
        profileContractVersions: {
          profile: visualLockContext.profileVersion,
          identityAnchor: visualLockContext.identityAnchorVersion,
          framing: visualLockContext.framingVersion,
          familyLock: visualLockContext.familyLockVersion,
          ...(isVisualLockV01Context(visualLockContext) ? {
            componentTopology: visualLockContext.componentTopologyVersion,
            evaluator: visualLockContext.evaluatorVersion,
            geometryGate: visualLockContext.geometryGateVersion,
            framingCorrection: VISUAL_LOCK_V01_FRAMING_CORRECTION_VERSION,
            materialFidelity: visualLockContext.materialContractVersion,
          } : {}),
        },
      }
      await persistAttemptMetadata()
    }

    const requestedSlots = requestedSlotIds.map((slotId) => {
      const slot = getSlotByKey(slotId)
      if (!slot) throw new Error(`Canonical slot bulunamadı: ${slotId}`)
      return slot
    })
    const slotNames = requestedSlots.map((slot) => slot.slotId)

    const pipelineLabel = provider === 'gemini-pro'
      ? `gemini-pro-image-v14:${process.env.GEMINI_IMAGE_GEN_MODEL || 'gemini-2.5-flash-image'}`
      : 'openai-edit-only-v12'

    // Human-readable provider label for Telegram captions and keyboard
    const providerDisplayLabel = provider === 'gemini-pro'
      ? `✨ Gemini Pro ${process.env.GEMINI_IMAGE_GEN_MODEL || 'gemini-2.5-flash-image'}`
      : `⚙️ OpenAI gpt-image-1`

    console.log(`[imageGenTask v14] generating — stage=${stage} provider=${provider} slots=[${slotNames.join(',')}]`)

    // D-407: per-image slot-contract metadata (slotIndex, slotKey, promptVersion,
    // productId, sourceImageId). mediaId is filled in after the media docs exist.
    const slotContractMeta = requestedSlots.map((slot) =>
      buildSlotMeta({ slotIndex: slot.displayOrder, productId, sourceImageId, mediaId: null }),
    )

    attemptMetadata = markAttemptSlotsGenerating(attemptMetadata)
    const promptsUsedEvidence: Record<string, unknown> = {
        pipeline: pipelineLabel,
        provider,           // explicit provider field — recovered by regenImageGenJob
        stage,
        mode: `${mode} (cosmetic)`,
        identityLock: identityLockMeta,
        visualFacts: input.visualFacts?.trim() || null,
        slots: slotNames,
        contractVersion: IMAGE_SLOT_CONTRACT_VERSION,
        attemptId: attemptMetadata.attemptId,
        ...(visualLockContext ? {
          qualityProfile: visualLockSelection?.profile,
          profileVersion: visualLockContext.profileVersion,
          productFamily: visualLockContext.family,
          visualLock: {
            identityAnchorVersion: visualLockContext.identityAnchorVersion,
            identityAnchorHash: visualLockContext.identityAnchorHash,
            framingVersion: visualLockContext.framingVersion,
            familyLockVersion: visualLockContext.familyLockVersion,
            ...(isVisualLockV01Context(visualLockContext) ? {
              componentTopologyVersion: visualLockContext.componentTopologyVersion,
              componentTopologyHash: visualLockContext.componentTopologyHash,
              evaluatorVersion: visualLockContext.evaluatorVersion,
              geometryGateVersion: visualLockContext.geometryGateVersion,
              framingCorrectionVersion: VISUAL_LOCK_V01_FRAMING_CORRECTION_VERSION,
              materialContractVersion: visualLockContext.materialContractVersion,
              qualityRetryPolicyVersion: VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
            } : {}),
          },
        } : {}),
        // D-407: fixed 5-slot contract metadata
        promptVersion: SLOT_PROMPT_VERSION,
        slotContract: slotContractMeta,
        ...(visualOnlyBoundary ? {
          executionMode: VISUAL_ONLY_V01_MODE,
          visualOnlyBoundary,
          visualOnlyProvisioning,
        } : {}),
      }
    await persistAttemptMetadata({
      promptsUsed: JSON.stringify(promptsUsedEvidence),
    })

    let slotEnvelopes: ImageSlotExecutionEnvelope<Buffer>[] = attemptMetadata.slots.map((slot) => ({ ...slot }))
    let providerResultsSummary: unknown[] = []
    let slotLogsSummary: unknown[] = []

    try {
      const { generateByEditing, generateByGeminiPro } = await import('../lib/imageProviders')
      const genFn = provider === 'gemini-pro' ? generateByGeminiPro : generateByEditing

      // D-355N: inject the visual fact lock into every slot prompt. The default hard
      // no-invented-metal lock always applies; operator-verified facts (input.visualFacts)
      // override the model's visual guesses when supplied.
      if (input.visualFacts && input.visualFacts.trim()) {
        console.log(`[imageGenTask D-355N] visual fact lock applied WITH operator facts (${input.visualFacts.trim().length} chars)`)
      } else {
        console.log(`[imageGenTask D-355N] visual fact lock active (default no-invented-metal)`)
      }
      const { results, buffers, slotLogs } = await genFn(
        referenceImage,
        referenceImageMime || 'image/jpeg',
        identityLock,
        sceneIndices,
        additionalReferenceImages.length > 0 ? additionalReferenceImages : undefined,
        productId, // D-233: stable per-product background variant
        input.visualFacts, // D-355N: operator-verified product facts (visual fact lock)
        visualLockContext,
      )
      slotEnvelopes = adaptLegacyProviderOutput({
        attempt: attemptMetadata,
        provider,
        buffers,
        slotLogs,
      })
      slotLogsSummary = slotLogs
      providerResultsSummary = results.map((r) => ({
        provider: r.provider,
        success: r.successCount,
        total: r.promptCount,
        errors: r.errors,
      }))

      attemptMetadata = {
        ...attemptMetadata,
        slots: serializeSlotEnvelopes(slotEnvelopes),
      }
      await persistAttemptMetadata()

      const generatedCount = slotEnvelopes.filter((slot) => slot.status === 'generated').length
      console.log(`[imageGenTask v14] generated ${generatedCount} images via ${provider}`)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[imageGenTask v14] generation error (${provider}):`, errMsg)
      providerResultsSummary = [{ provider, error: safeImageFailureSummary(err, 'Provider execution failed.') }]
      slotEnvelopes = adaptLegacyProviderOutput({
        attempt: attemptMetadata,
        provider,
        buffers: [],
        slotLogs: [],
      })
      attemptMetadata = {
        ...attemptMetadata,
        slots: serializeSlotEnvelopes(slotEnvelopes),
      }
      await persistAttemptMetadata()
    }

    if (!slotEnvelopes.some((slot) => slot.status === 'generated' && slot.output !== undefined)) {
      const providerLabel = provider === 'gemini-pro' ? 'Gemini Pro' : 'OpenAI'

      // Extract first real API error from slot logs for diagnostic display
      const firstSlotError = (slotLogsSummary as Array<{ rejectionReason?: string }>)
        .find((s) => s.rejectionReason)?.rejectionReason || null
      const rawApiErrorSummary = firstSlotError
        || ((providerResultsSummary[0] as { error?: string } | undefined)?.error || null)
      const apiErrorSummary = rawApiErrorSummary
        ? safeImageFailureSummary(rawApiErrorSummary, 'Provider execution failed.')
        : null

      const msg = `${providerLabel} görsel üretimi başarısız — 0 görsel üretildi.`

      attemptMetadata = finishImageGenerationAttempt(attemptMetadata, serializeSlotEnvelopes(slotEnvelopes))
      await persistAttemptMetadata({
        status: 'failed',
        errorMessage: apiErrorSummary ? `${msg} API: ${apiErrorSummary}` : msg,
        generationCompletedAt: attemptMetadata.completedAt,
        providerResults: JSON.stringify({
          contractVersion: IMAGE_SLOT_CONTRACT_VERSION,
          attemptId: attemptMetadata.attemptId,
          summary: providerResultsSummary,
          slotLogs: slotLogsSummary,
          slotResults: attemptMetadata.slots,
        }),
      })

      if (telegramChatId) {
        const errorLine = apiErrorSummary
          ? `\n\n🔍 <b>API hatası:</b> <code>${apiErrorSummary}</code>`
          : ''
        await sendTelegramNotification(
          telegramChatId,
          `❌ <b>Görsel üretimi başarısız</b> (${providerLabel})\n\n` +
          `${providerLabel} motoru görsel üretemedi.${errorLine}\n\n` +
          `Tekrar deneyin: <code>#gorsel</code> veya <code>#geminipro {id}</code>`,
        )
      }

      throw new Error(apiErrorSummary ? `${msg} API: ${apiErrorSummary}` : msg)
    }

    // ── Step 6a2: D-408 deterministic centering / scale lock ──────────────
    // Runs BEFORE the stock-number overlay so the corner badge never affects the
    // detected product bounding box. Rescales + centers the product to the slot's
    // locked frameCoverage so every slot shares the exact same scale + centering.
    //
    // D-413: RE-ENABLED with the CROP-WINDOW rewrite, verified on the operator's
    // real generated images to NO LONGER create a frame. The previous flat-canvas
    // composite pasted a gradient-bg crop onto a flat canvas → visible rectangle.
    // The normalizer now extracts a square crop WINDOW straight from the original
    // (continuous gradient bg preserved, edges copy-extended) → no seam, no frame,
    // while still scaling/centering the shoe. Set IMAGE_CENTERING_ENABLED=0 to
    // disable. (Note: it does not remove a frame Gemini itself may render into the
    // source — that stays an anti-frame prompt concern.)
    // D-418: pairs are now generated BY THE MODEL (pair slots hero_3q + top request
    // a matched pair in the prompt), so no deterministic duplication here — every
    // slot just gets centered. For a pair image the detector treats the two shoes
    // as one group and centers the pair. Runs before the stock-number overlay.
    // V0.1 performs its governed correction before its single evaluator call so
    // evaluator evidence and final geometry describe the same candidate bytes.
    // Keep this legacy post-processing path byte-for-byte compatible for the
    // default profile and Visual Lock V0 only.
    if (process.env.IMAGE_CENTERING_ENABLED !== '0' && !isVisualLockV01Context(visualLockContext)) {
      const { normalizeProductCentering, normalizeBackground } = await import('../lib/imageCentering')
      const { frameCoverageForIndex } = await import('../lib/imageSlotContract')
      let centered = 0, bgFixed = 0
      for (let i = 0; i < slotEnvelopes.length; i++) {
        const envelope = slotEnvelopes[i]
        if (envelope.status !== 'generated' || !envelope.output) continue
        try {
          const slot = getSlotByKey(envelope.slotId)
          if (!slot) throw new Error(`Unknown semantic slot: ${envelope.slotId}`)
          const b0 = envelope.output
          const b1 = await normalizeProductCentering(b0, { coverage: frameCoverageForIndex(slot.displayOrder) })
          if (b1 !== b0) centered++
          // D-419: unify the studio background tone across all slots.
          // D-421: EXCEPT the detail slot — a macro close-up can cover the corners
          // with shoe material, so corner sampling could mis-read the "background"
          // and tint the product. Detail shows almost no bg anyway; skip it.
          const isDetail = envelope.slotId === 'detail'
          const b2 = isDetail ? b1 : await normalizeBackground(b1)
          if (b2 !== b1) bgFixed++
          slotEnvelopes[i] = { ...envelope, output: b2 }
        } catch (err) {
          const warning = safeImageFailureSummary(err, 'Deterministic post-processing was skipped.')
          slotEnvelopes[i] = { ...envelope, warnings: [...envelope.warnings, `postprocess_failed:${warning}`] }
          console.warn(`[imageGenTask D-408/D-419] centering/bg skipped for slot ${envelope.slotId}:`, warning)
        }
      }
      console.log(`[imageGenTask D-408/D-419] ${centered} centered + ${bgFixed} bg-normalized / ${slotEnvelopes.length} slots`)
    }

    // ── Step 6b: Overlay stockNumber on each generated image ──────────────
    // Deterministic post-process — NOT prompt-based. Uses sharp composite
    // to render the stock number in the bottom-right corner of every image.
    // Visual Lock V0.1 is fail-closed as a complete pack. Geometry is measured
    // after deterministic normalization and before badge, Media, or preview work.
    // An explicit normalized visual failure may spend one immutable, one-slot
    // quality retry. Unknown or infrastructure evidence never spends the budget.
    const qualityRetryAttempts = new Map<string, ImageGenerationAttemptMetadata>()
    if (isVisualLockV01Context(visualLockContext)) {
      const geometryByAttemptSlot = new Map<string, VisualGeometryGateResultV01>()
      const geometryKey = (slot: Pick<ImageSlotExecutionEnvelope<Buffer>, 'attemptId' | 'slotId'>) =>
        `${slot.attemptId}:${slot.slotId}`
      const unknownDimensions = (): VisualQualityRetryDimensionStatesV01 => ({
        evaluator: 'unknown',
        color: 'unknown',
        angle: 'unknown',
        studio: 'unknown',
        material: 'unknown',
        topology: 'unknown',
        framing: 'unknown',
        geometry: 'unknown',
      })
      const dimensionsFor = (
        slot: ImageSlotExecutionEnvelope<Buffer>,
        geometry: VisualGeometryGateResultV01,
      ): VisualQualityRetryDimensionStatesV01 => ({
        evaluator: slot.provider?.qualityEvaluatorState ?? 'unknown',
        color: slot.provider?.colorEvaluatorState ?? 'unknown',
        angle: slot.provider?.orientationEvaluatorState ?? 'unknown',
        studio: slot.provider?.studioEvaluatorState ?? 'unknown',
        material: slot.provider?.materialEvaluatorState ?? 'unknown',
        topology: slot.provider?.componentTopologyEvaluatorState ?? 'unknown',
        framing: slot.provider?.framingCorrection?.state ?? 'unknown',
        geometry: geometry.state,
      })
      const combinedStateFor = (dimensions: VisualQualityRetryDimensionStatesV01): VisualQualityTriState =>
        combineVisualQualityGateV01(
          [
            dimensions.evaluator,
            dimensions.color,
            dimensions.angle,
            dimensions.studio,
            dimensions.material,
            dimensions.topology,
            dimensions.framing,
          ],
          dimensions.geometry,
        )
      const measureSlot = async (
        envelope: ImageSlotExecutionEnvelope<Buffer>,
      ): Promise<ImageSlotExecutionEnvelope<Buffer>> => {
        const measurement = envelope.status === 'generated' && envelope.output
          ? await measureVisualGeometryV01(envelope.output)
          : null
        const geometry = evaluateVisualGeometryMeasurementV01(envelope.slotId, measurement)
        geometryByAttemptSlot.set(geometryKey(envelope), geometry)
        return {
          ...envelope,
          provider: envelope.provider ? {
            ...envelope.provider,
            geometryGateVersion: geometry.version,
            geometryGateState: geometry.state,
            geometryClippingState: geometry.clippingState,
            geometryGateReasonCodes: geometry.reasonCodes,
            geometryMeasurement: geometry.measurement,
          } : envelope.provider,
        }
      }
      const failQualitySlot = (
        slot: ImageSlotExecutionEnvelope<Buffer>,
        state: Exclude<VisualQualityTriState, 'pass'>,
        reasonCodes: readonly string[],
        evidence: VisualQualityRetryEvidenceV01,
      ): ImageSlotExecutionEnvelope<Buffer> => ({
        ...slot,
        status: 'provider_failed',
        output: undefined,
        qualityRetry: evidence,
        failure: {
          code: 'quality_gate_failed',
          summary: safeImageFailureSummary(
            `Visual Lock V0.1 quality gate ${state}: ${reasonCodes.join(',') || 'evidence_unavailable'}`,
            'Visual Lock V0.1 quality evidence did not pass.',
          ),
        },
      })
      const buildPackQuality = (slots: readonly ImageSlotExecutionEnvelope<Buffer>[]) => {
        const geometryResults = slots.map((slot) =>
          geometryByAttemptSlot.get(geometryKey(slot))
          ?? evaluateVisualGeometryMeasurementV01(slot.slotId, null),
        )
        const geometryPack = evaluateVisualGeometryPackV01(geometryResults)
        return buildVisualQualityGateSummaryV01({
          context: visualLockContext,
          geometryPack,
          framingCorrectionContractVersion: VISUAL_LOCK_V01_FRAMING_CORRECTION_VERSION,
          slots: slots.map((slot, index) => ({
            slotId: slot.slotId,
            framingCorrectionState: slot.provider?.framingCorrection?.state ?? 'unknown',
            framingCorrectionOutcome: slot.provider?.framingCorrection?.outcome ?? 'insufficient_geometry_evidence',
            framingCorrectionReasonCodes: slot.provider?.framingCorrection?.reasonCodes ?? ['framing_correction_evidence_missing'],
            evaluatorStatus: slot.provider?.qualityEvaluatorState ?? 'unknown',
            evaluatorReasonCodes: slot.provider?.qualityEvaluatorReasonCodes ?? ['evaluator_result_missing'],
            orientationStatus: slot.provider?.orientationEvaluatorState ?? 'unknown',
            detectedView: slot.provider?.detectedShot ?? 'unknown',
            topologyStatus: slot.provider?.componentTopologyEvaluatorState ?? 'unknown',
            topologyReasonCodes: slot.provider?.componentTopologyEvaluatorReasonCodes ?? [],
            studioStatus: slot.provider?.studioEvaluatorState ?? 'unknown',
            materialStatus: slot.provider?.materialEvaluatorState ?? 'unknown',
            materialReasonCodes: slot.provider?.materialEvaluatorReasonCodes ?? [],
            geometry: geometryResults[index],
          })),
        })
      }

      let rootSlotEnvelopes: ImageSlotExecutionEnvelope<Buffer>[] = []
      for (const slot of slotEnvelopes) rootSlotEnvelopes.push(await measureSlot(slot))
      slotEnvelopes = [...rootSlotEnvelopes]
      attemptMetadata = { ...attemptMetadata, slots: serializeSlotEnvelopes(rootSlotEnvelopes) }
      await persistVisualLockV01AttemptRecords([attemptMetadata])

      const sourceEvidenceSufficientTargets = VISUAL_QUALITY_RETRY_TARGET_ORDER.filter((target) =>
        hasSufficientSourceEvidenceForRetryV01(visualLockContext, target),
      )
      const retryProviderModule = await import('../lib/imageProviders')
      const retryGenFn = provider === 'gemini-pro'
        ? retryProviderModule.generateByGeminiPro
        : retryProviderModule.generateByEditing
      const readRetryAuthorizationSnapshot = async (slotId: SlotKey) => {
        try {
          const latestJob = await payload.findByID({
            collection: 'image-generation-jobs',
            id: jobId,
            depth: 0,
          }) as Record<string, unknown>
          const parsed = parseGenerationAttemptHistory(latestJob.generationAttempts)
          const expected = parseGenerationAttemptHistory([
            attemptMetadata,
            ...qualityRetryAttempts.values(),
          ])
          if (!parsed.ok || !expected.ok) {
            return {
              jobState: latestJob.status === 'cancelled' ? 'cancelled' as const : 'invalid' as const,
              lineageState: 'uncertain' as const,
              persistenceState: 'uncertain' as const,
              duplicateDeliveryState: 'uncertain' as const,
              qualityRetryCount: 1,
            }
          }

          const currentAttempts = parsed.attempts.filter((attempt) => attempt.jobId === String(jobId))
          const expectedAttempts = expected.attempts.filter((attempt) => attempt.jobId === String(jobId))
          const persistedExactly = areGenerationAttemptHistoriesSemanticallyEqual(
            currentAttempts,
            expectedAttempts,
          )
          const root = currentAttempts.find((attempt) => attempt.attemptId === rootAttemptId)
          const exactRootSlots = root?.requestedSlotIds.length === requestedSlotIds.length
            && root.requestedSlotIds.every((requestedSlotId, index) => requestedSlotId === requestedSlotIds[index])
            && root.slots.length === requestedSlotIds.length
            && root.slots.every((slot, index) => slot.slotId === requestedSlotIds[index])
          const exactAttemptSet = currentAttempts.length === expectedAttempts.length
            && currentAttempts.every((attempt) => expectedAttempts.some((candidate) => candidate.attemptId === attempt.attemptId))
          const lineageCertain = Boolean(
            root
            && root.attemptKind === 'initial'
            && root.attemptOrdinal === 1
            && root.parentAttemptId === null
            && exactRootSlots
            && exactAttemptSet,
          )
          const activeRoot = latestJob.activeAttemptId === rootAttemptId
          const noSelectedPack = root?.packSelection === undefined
          const generatedImages = Array.isArray(latestJob.generatedImages) ? latestJob.generatedImages : []
          const ready = latestJob.status === 'generating'
            && activeRoot
            && lineageCertain
            && persistedExactly
          const qualityRetryCount = currentAttempts.filter((attempt) =>
            attempt.attemptKind === 'quality_retry'
            && attempt.parentAttemptId === rootAttemptId
            && attempt.requestedSlotIds.length === 1
            && attempt.requestedSlotIds[0] === slotId,
          ).length

          return {
            jobState: latestJob.status === 'cancelled'
              ? 'cancelled' as const
              : ready
                ? 'ready' as const
                : 'invalid' as const,
            lineageState: lineageCertain ? 'certain' as const : 'uncertain' as const,
            persistenceState: persistedExactly ? 'certain' as const : 'uncertain' as const,
            duplicateDeliveryState: ready && noSelectedPack && generatedImages.length === 0
              ? 'clear' as const
              : 'uncertain' as const,
            qualityRetryCount,
          }
        } catch {
          return {
            jobState: 'invalid' as const,
            lineageState: 'uncertain' as const,
            persistenceState: 'uncertain' as const,
            duplicateDeliveryState: 'uncertain' as const,
            qualityRetryCount: 1,
          }
        }
      }
      let retryProcessingBlocked = false

      for (const slotId of requestedSlotIds) {
        const initialSlot = rootSlotEnvelopes.find((slot) => slot.slotId === slotId)
        if (!initialSlot) continue
        const initialGeometry = geometryByAttemptSlot.get(geometryKey(initialSlot))
          ?? evaluateVisualGeometryMeasurementV01(slotId, null)
        const initialDimensions = dimensionsFor(initialSlot, initialGeometry)
        const initialCombinedState = combinedStateFor(initialDimensions)
        const evaluatorReasonCodes = initialSlot.provider?.qualityEvaluatorReasonCodes ?? []
        const retrySnapshot = await readRetryAuthorizationSnapshot(slotId)
        const decision = classifyVisualQualityRetryV01({
          profileVersion: visualLockContext.profileVersion,
          slotId,
          attemptOrdinal: 1,
          qualityRetryCount: retrySnapshot.qualityRetryCount,
          jobState: retrySnapshot.jobState,
          packState: retryProcessingBlocked ? 'unrecoverable' : 'recoverable',
          lineageState: retrySnapshot.lineageState,
          persistenceState: retrySnapshot.persistenceState,
          duplicateDeliveryState: retrySnapshot.duplicateDeliveryState,
          requestedSlotCount: attemptMetadata.requestedSlotIds.length,
          durableSlotCount: rootSlotEnvelopes.length,
          providerCandidateCount: initialSlot.status === 'generated' && initialSlot.output ? 1 : 0,
          evaluatorExecutionCount: initialSlot.provider?.qualityEvaluatorVersion ? 1 : 0,
          candidateProduced: initialSlot.status === 'generated' && initialSlot.output !== undefined,
          combinedGateState: initialCombinedState,
          dimensions: initialDimensions,
          evaluatorReasonCodes,
          topologyReasonCodes: initialSlot.provider?.componentTopologyEvaluatorReasonCodes ?? [],
          materialReasonCodes: initialSlot.provider?.materialEvaluatorReasonCodes ?? [],
          framingOutcome: initialSlot.provider?.framingCorrection?.outcome ?? 'insufficient_geometry_evidence',
          framingReasonCodes: initialSlot.provider?.framingCorrection?.reasonCodes ?? ['geometry_measurement_unavailable'],
          geometryReasonCodes: initialGeometry.reasonCodes.filter(isVisualQualityRetryGeometryReasonV01),
          geometryApplicable: initialGeometry.applicable,
          geometryReliable: initialGeometry.measurement !== null && initialGeometry.state !== 'unknown',
          detailCropEvidence: slotId === 'detail'
            ? 'ambiguous_intentional_crop'
            : 'not_applicable',
          sourceEvidenceSufficientTargets,
        })

        if (!decision.authorized) {
          const evidence = createVisualQualityRetryEvidenceV01({
            decision,
            jobId,
            parentAttemptId: rootAttemptId,
            retryAttemptId: null,
            promptDigest: null,
            framingCorrectionOutcome: initialSlot.provider?.framingCorrection?.outcome ?? 'insufficient_geometry_evidence',
            finalDimensionStates: initialDimensions,
            finalCombinedGateState: initialCombinedState,
          })
          const updatedRootSlot = initialCombinedState === 'pass'
            ? { ...initialSlot, qualityRetry: evidence }
            : failQualitySlot(initialSlot, initialCombinedState, evaluatorReasonCodes, evidence)
          rootSlotEnvelopes = mergeVisualQualityRetrySlotV01({
            slots: rootSlotEnvelopes,
            slotId,
            replacement: updatedRootSlot,
            slotKey: (slot) => slot.slotId,
          })
          slotEnvelopes = mergeVisualQualityRetrySlotV01({
            slots: slotEnvelopes,
            slotId,
            replacement: updatedRootSlot,
            slotKey: (slot) => slot.slotId,
          })
          if (initialCombinedState !== 'pass') retryProcessingBlocked = true
          continue
        }

        const authorizedDecision = decision as VisualQualityRetryAuthorizedDecisionV01
        let retryAttempt = createImageGenerationAttempt({
          jobId,
          requestedSlotIds: [slotId],
          attemptKind: 'quality_retry',
          attemptOrdinal: 2,
          parentAttemptId: rootAttemptId,
          retryPolicyVersion: VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
          ...(visualOnlyBoundary ? { visualOnlyBoundary } : {}),
        })
        retryAttempt = {
          ...retryAttempt,
          qualityProfile: attemptMetadata.qualityProfile,
          productFamily: attemptMetadata.productFamily,
          identityAnchorHash: attemptMetadata.identityAnchorHash,
          profileContractVersions: attemptMetadata.profileContractVersions,
        }
        // Evidence digest scope is deliberately limited to the canonical V0.1
        // slot block plus retry directive. Provider-specific prompt framing is
        // assembled later inside the provider adapter and is not claimed here.
        const retryPromptEvidenceSuffix = buildVisualQualityRetryPromptV01({
          basePrompt: buildVisualLockV01PromptBlock(visualLockContext, slotId),
          context: visualLockContext,
          decision: authorizedDecision,
        })
        const promptDigest = digestVisualQualityRetryPromptV01(retryPromptEvidenceSuffix)
        const retryStartedAt = new Date().toISOString()
        let retryEvidence = createVisualQualityRetryEvidenceV01({
          decision: authorizedDecision,
          jobId,
          parentAttemptId: rootAttemptId,
          retryAttemptId: retryAttempt.attemptId,
          promptDigest,
          framingCorrectionOutcome: initialSlot.provider?.framingCorrection?.outcome ?? 'insufficient_geometry_evidence',
          finalDimensionStates: initialDimensions,
          finalCombinedGateState: initialCombinedState,
          startedAt: retryStartedAt,
        })
        retryAttempt = setAttemptSlotStatus(retryAttempt, slotId, {
          status: 'generating',
          qualityRetry: retryEvidence,
        })
        const failedInitialSlot = failQualitySlot(
          initialSlot,
          initialCombinedState === 'pass' ? 'unknown' : initialCombinedState,
          authorizedDecision.normalizedFailureReasons,
          retryEvidence,
        )
        rootSlotEnvelopes = mergeVisualQualityRetrySlotV01({
          slots: rootSlotEnvelopes,
          slotId,
          replacement: failedInitialSlot,
          slotKey: (slot) => slot.slotId,
        })
        slotEnvelopes = mergeVisualQualityRetrySlotV01({
          slots: slotEnvelopes,
          slotId,
          replacement: failedInitialSlot,
          slotKey: (slot) => slot.slotId,
        })
        attemptMetadata = { ...attemptMetadata, slots: serializeSlotEnvelopes(rootSlotEnvelopes) }
        qualityRetryAttempts.set(retryAttempt.attemptId, retryAttempt)
        // Persist the root's authorized-pending child link before inserting the
        // child so strict incremental history validation never observes an orphan.
        await persistVisualLockV01AttemptRecords([attemptMetadata, retryAttempt])

        const executionSnapshot = await readRetryAuthorizationSnapshot(slotId)
        if (
          executionSnapshot.jobState !== 'ready'
          || executionSnapshot.lineageState !== 'certain'
          || executionSnapshot.persistenceState !== 'certain'
          || executionSnapshot.duplicateDeliveryState !== 'clear'
          || executionSnapshot.qualityRetryCount !== 1
        ) {
          const completedAt = new Date().toISOString()
          retryEvidence = finalizeVisualQualityRetryEvidenceV01(retryEvidence, {
            terminalOutcome: 'execution_blocked',
            generationAttempts: 0,
            evaluatorExecutions: 0,
            framingCorrectionOutcome: initialSlot.provider?.framingCorrection?.outcome
              ?? 'insufficient_geometry_evidence',
            finalDimensionStates: unknownDimensions(),
            finalCombinedGateState: 'unknown',
            completedAt,
            durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(retryStartedAt)),
          })
          retryAttempt = finishImageGenerationAttempt(setAttemptSlotStatus(retryAttempt, slotId, {
            status: 'provider_failed',
            qualityRetry: retryEvidence,
            failure: {
              code: 'provider_failed',
              summary: 'Targeted quality retry execution was blocked by changed job or lineage state.',
            },
          }))
          qualityRetryAttempts.set(retryAttempt.attemptId, retryAttempt)
          const rootRetrySlot = { ...failedInitialSlot, qualityRetry: retryEvidence }
          rootSlotEnvelopes = mergeVisualQualityRetrySlotV01({
            slots: rootSlotEnvelopes,
            slotId,
            replacement: rootRetrySlot,
            slotKey: (slot) => slot.slotId,
          })
          slotEnvelopes = mergeVisualQualityRetrySlotV01({
            slots: slotEnvelopes,
            slotId,
            replacement: rootRetrySlot,
            slotKey: (slot) => slot.slotId,
          })
          attemptMetadata = { ...attemptMetadata, slots: serializeSlotEnvelopes(rootSlotEnvelopes) }
          retryProcessingBlocked = true
          await persistVisualLockV01AttemptRecords([attemptMetadata, retryAttempt])
          continue
        }

        let retryExecutionUsage: VisualQualityRetryExecutionUsageV01 = {
          generationCalls: 0,
          candidatesProduced: 0,
          evaluatorCalls: 0,
        }
        let retryObservedDimensions = unknownDimensions()
        let retryObservedCombinedState: VisualQualityTriState = 'unknown'
        let retryObservedFramingOutcome = initialSlot.provider?.framingCorrection?.outcome
          ?? 'insufficient_geometry_evidence'
        try {
          const slotDefinition = getSlotByKey(slotId)
          if (!slotDefinition) throw new Error(`Unknown semantic retry slot: ${slotId}`)
          const providerExecution = await executeSingleVisualQualityRetryProviderV01((execution) =>
            retryGenFn(
              referenceImage,
              referenceImageMime || 'image/jpeg',
              identityLock,
              [slotDefinition.displayOrder],
              additionalReferenceImages.length > 0 ? additionalReferenceImages : undefined,
              productId,
              input.visualFacts,
              visualLockContext,
              { slotId, decision: authorizedDecision, execution },
            ),
          )
          retryExecutionUsage = providerExecution.usage
          if (!providerExecution.ok) throw providerExecution.error
          const { results, buffers, slotLogs } = providerExecution.value
          providerResultsSummary = [
            ...providerResultsSummary,
            ...results.map((result) => ({
              provider: result.provider,
              qualityRetryAttemptId: retryAttempt.attemptId,
              slotId,
              success: result.successCount,
              total: result.promptCount,
              errors: result.errors.map((error) => safeImageFailureSummary(error, 'Retry provider error.')),
            })),
          ]
          slotLogsSummary = [
            ...slotLogsSummary,
            ...slotLogs.map((log) => ({
              ...log,
              qualityRetryAttemptId: retryAttempt.attemptId,
            })),
          ]
          const matchingLogs = slotLogs.filter((log) => log.slot === slotId)
          const evaluatorEvidenceExecutions = matchingLogs.length === 1
            && slotLogs.length === 1
            && matchingLogs[0]?.qualityEvaluatorVersion
            ? 1
            : 0
          if (
            buffers.length !== 1
            || matchingLogs.length !== 1
            || slotLogs.length !== 1
            || retryExecutionUsage.candidatesProduced !== 1
            || retryExecutionUsage.evaluatorCalls !== evaluatorEvidenceExecutions
          ) {
            throw new Error('Targeted quality retry returned ambiguous semantic output.')
          }
          let retrySlot = adaptLegacyProviderOutput({
            attempt: retryAttempt,
            provider,
            buffers,
            slotLogs,
          })[0]
          if (!retrySlot || retrySlot.slotId !== slotId || retrySlot.status !== 'generated' || !retrySlot.output) {
            throw new Error('Targeted quality retry did not produce its durable slot candidate.')
          }
          const preGeometry = evaluateVisualGeometryMeasurementV01(slotId, null)
          retryObservedDimensions = dimensionsFor(retrySlot, preGeometry)
          retryObservedCombinedState = combinedStateFor(retryObservedDimensions)
          retryObservedFramingOutcome = retrySlot.provider?.framingCorrection?.outcome
            ?? 'insufficient_geometry_evidence'
          retrySlot = await measureSlot(retrySlot)
          const retryGeometry = geometryByAttemptSlot.get(geometryKey(retrySlot))
            ?? evaluateVisualGeometryMeasurementV01(slotId, null)
          const retryDimensions = dimensionsFor(retrySlot, retryGeometry)
          const retryCombinedState = combinedStateFor(retryDimensions)
          const evaluatorExecutions = retryExecutionUsage.evaluatorCalls
          retryObservedDimensions = retryDimensions
          retryObservedCombinedState = retryCombinedState
          retryObservedFramingOutcome = retrySlot.provider?.framingCorrection?.outcome
            ?? 'insufficient_geometry_evidence'
          const terminalOutcome = retryDimensions.evaluator === 'unknown'
            ? 'evaluation_failed'
            : retryCombinedState === 'pass'
              ? 'retry_passed'
              : retryCombinedState === 'fail'
                ? 'retry_failed'
                : 'retry_unknown'
          const completedAt = new Date().toISOString()
          retryEvidence = finalizeVisualQualityRetryEvidenceV01(retryEvidence, {
            terminalOutcome,
            generationAttempts: 1,
            evaluatorExecutions,
            framingCorrectionOutcome: retrySlot.provider?.framingCorrection?.outcome ?? 'insufficient_geometry_evidence',
            finalDimensionStates: retryDimensions,
            finalCombinedGateState: retryCombinedState,
            completedAt,
            durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(retryStartedAt)),
          })
          retrySlot = retryCombinedState === 'pass'
            ? { ...retrySlot, qualityRetry: retryEvidence }
            : failQualitySlot(
                retrySlot,
                retryCombinedState,
                retrySlot.provider?.qualityEvaluatorReasonCodes ?? ['retry_quality_gate_blocked'],
                retryEvidence,
              )
          retryAttempt = {
            ...retryAttempt,
            slots: serializeSlotEnvelopes([retrySlot]),
          }
          if (retryCombinedState !== 'pass') {
            retryAttempt = finishImageGenerationAttempt(retryAttempt)
          }
          qualityRetryAttempts.set(retryAttempt.attemptId, retryAttempt)
          const rootRetrySlot = { ...failedInitialSlot, qualityRetry: retryEvidence }
          rootSlotEnvelopes = mergeVisualQualityRetrySlotV01({
            slots: rootSlotEnvelopes,
            slotId,
            replacement: rootRetrySlot,
            slotKey: (slot) => slot.slotId,
          })
          slotEnvelopes = mergeVisualQualityRetrySlotV01({
            slots: slotEnvelopes,
            slotId,
            replacement: retryCombinedState === 'pass' ? retrySlot : rootRetrySlot,
            slotKey: (slot) => slot.slotId,
          })
          if (retryCombinedState !== 'pass') retryProcessingBlocked = true
        } catch (error) {
          const completedAt = new Date().toISOString()
          const terminalOutcome = retryExecutionUsage.generationCalls === 0
            || retryExecutionUsage.candidatesProduced === 0
            ? 'generation_failed' as const
            : retryExecutionUsage.evaluatorCalls === 0 || retryObservedDimensions.evaluator === 'unknown'
              ? 'evaluation_failed' as const
              : retryObservedCombinedState === 'fail'
                ? 'retry_failed' as const
                : 'retry_unknown' as const
          const retainObservedEvidence = terminalOutcome === 'retry_failed'
            || (terminalOutcome === 'retry_unknown' && retryObservedCombinedState === 'unknown')
          const finalDimensionStates = retainObservedEvidence
            ? retryObservedDimensions
            : unknownDimensions()
          const finalCombinedGateState = retainObservedEvidence
            ? retryObservedCombinedState
            : 'unknown' as const
          retryEvidence = finalizeVisualQualityRetryEvidenceV01(retryEvidence, {
            terminalOutcome,
            generationAttempts: retryExecutionUsage.generationCalls,
            evaluatorExecutions: retryExecutionUsage.evaluatorCalls,
            framingCorrectionOutcome: retryObservedFramingOutcome,
            finalDimensionStates,
            finalCombinedGateState,
            completedAt,
            durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(retryStartedAt)),
          })
          retryAttempt = finishImageGenerationAttempt(setAttemptSlotStatus(retryAttempt, slotId, {
            status: 'provider_failed',
            qualityRetry: retryEvidence,
            failure: {
              code: terminalOutcome === 'generation_failed' ? 'provider_failed' : 'quality_gate_failed',
              summary: safeImageFailureSummary(error, 'Targeted quality retry failed.'),
            },
          }))
          qualityRetryAttempts.set(retryAttempt.attemptId, retryAttempt)
          const rootRetrySlot = { ...failedInitialSlot, qualityRetry: retryEvidence }
          rootSlotEnvelopes = mergeVisualQualityRetrySlotV01({
            slots: rootSlotEnvelopes,
            slotId,
            replacement: rootRetrySlot,
            slotKey: (slot) => slot.slotId,
          })
          slotEnvelopes = mergeVisualQualityRetrySlotV01({
            slots: slotEnvelopes,
            slotId,
            replacement: rootRetrySlot,
            slotKey: (slot) => slot.slotId,
          })
          retryProcessingBlocked = true
        }
        attemptMetadata = { ...attemptMetadata, slots: serializeSlotEnvelopes(rootSlotEnvelopes) }
        await persistVisualLockV01AttemptRecords([attemptMetadata, retryAttempt])
      }

      const qualityGateSummary = buildPackQuality(slotEnvelopes)
      const qualityState = qualityGateSummary.packResults.qualityGateStatus
      const reasonCodes = qualityGateSummary.packResults.reasonCodes
      attemptMetadata = {
        ...attemptMetadata,
        qualityGateSummary,
        slots: serializeSlotEnvelopes(rootSlotEnvelopes),
      }
      await persistVisualLockV01AttemptRecords([attemptMetadata])

      if (qualityState !== 'pass') {
        const msg = safeImageFailureSummary(
          `Visual Lock V0.1 quality gate ${qualityState}: ${reasonCodes.join(',') || 'evidence_unavailable'}`,
          'Visual Lock V0.1 quality evidence did not pass.',
        )
        attemptMetadata = finishImageGenerationAttempt(attemptMetadata)
        const terminalRetryAttempts = [...qualityRetryAttempts.values()].map((attempt) =>
          attempt.status === 'running' ? finishImageGenerationAttempt(attempt) : attempt,
        )
        for (const retryAttempt of terminalRetryAttempts) {
          qualityRetryAttempts.set(retryAttempt.attemptId, retryAttempt)
        }
        slotEnvelopes = slotEnvelopes.map((slot) => ({ ...slot, output: undefined }))
        await persistVisualLockV01AttemptRecords([...terminalRetryAttempts, attemptMetadata], {
          status: 'failed',
          errorMessage: msg,
          generationCompletedAt: attemptMetadata.completedAt,
          providerResults: JSON.stringify({
            contractVersion: IMAGE_SLOT_CONTRACT_VERSION,
            attemptId: attemptMetadata.attemptId,
            attemptStatus: attemptMetadata.status,
            summary: providerResultsSummary,
            slotLogs: slotLogsSummary,
            slotResults: attemptMetadata.slots,
            qualityGateSummary: attemptMetadata.qualityGateSummary,
            qualityRetryPolicyVersion: VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
          }),
        })

        try {
          await finalizeVisualLockV01ProductFailure()
        } catch (error) {
          const finalizationError = safeImageFailureSummary(error, 'Product visual failure state could not be finalized.')
          await persistAttemptMetadata({
            status: 'failed',
            errorMessage: `${msg} Product finalization: ${finalizationError}`,
            generationCompletedAt: attemptMetadata.completedAt,
          })
          throw new Error(`${msg} Product finalization: ${finalizationError}`)
        }

        if (telegramChatId) {
          await sendTelegramNotification(
            telegramChatId,
            `âŒ <b>GÃ¶rsel kalite kontrolÃ¼ geÃ§ilemedi</b>\n\n` +
            `V0.1 sonucu <code>${qualityState}</code> olarak kaydedildi. GÃ¶rsel veya Ã¶nizleme oluÅŸturulmadÄ±.`,
          )
        }

        return {
          output: {
            success: false,
            mediaIds: '',
            error: msg,
          },
        }
      }
    }

    if (stockNumber) {
      for (let i = 0; i < slotEnvelopes.length; i++) {
        const envelope = slotEnvelopes[i]
        if (envelope.status !== 'generated' || !envelope.output) continue
        try {
          slotEnvelopes[i] = { ...envelope, output: await overlayStockNumber(envelope.output, stockNumber) }
        } catch (err) {
          const warning = safeImageFailureSummary(err, 'Stock-number overlay was skipped.')
          slotEnvelopes[i] = { ...envelope, warnings: [...envelope.warnings, `overlay_failed:${warning}`] }
          console.warn(`[imageGenTask] overlay failed for slot ${envelope.slotId}:`, warning)
          // Keep original buffer if overlay fails — don't lose the image
        }
      }
      console.log(`[imageGenTask] stockNumber "${stockNumber}" overlay completed for semantic slot envelopes`)
    }

    // ── Step 7: Save each buffer as a Media document ────────────────────────
    // DUAL-TRACK (v13): Images saved as type='generated' — not 'enhanced'.
    // 'enhanced' = cleaned/improved original. 'generated' = AI-created output.
    // NOT attached to product.images — held in job.generatedImages until approved.
    // On approval: written to product.generativeGallery (marketing lane), NOT product.images.
    slotEnvelopes = await persistGeneratedSlotEnvelopes({
      slots: slotEnvelopes,
      failFast: isVisualLockV01Context(visualLockContext),
      persist: async (envelope) => {
        const slot = getSlotByKey(envelope.slotId)
        if (!slot) throw new Error(`Unknown semantic slot: ${envelope.slotId}`)
        const buf = envelope.output
        const concept = envelope.slotId
        const label = slot.operatorLabel
        const filename = `ai-${productId}-${concept}-${envelope.attemptId}-${slot.displayOrder}.jpg`

        // Upscale ~2x (cap long side at 2048px) for crisp product-page zoom ("Büyüt").
        // This existing deterministic behavior remains unchanged and fails soft.
        let outBuf = buf
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const sharp = require('sharp') as typeof import('sharp')
          const meta = await sharp(buf).metadata()
          const w = meta.width ?? 0
          const h = meta.height ?? 0
          const longSide = Math.max(w, h)
          const scale = longSide > 0 ? Math.min(2, 2048 / longSide) : 1
          if (scale > 1.01) {
            outBuf = await sharp(buf)
              .resize(Math.round(w * scale), Math.round(h * scale), { kernel: 'lanczos3' })
              .sharpen()
              .jpeg({ quality: 90 })
              .toBuffer()
            console.log(`[imageGenTask] upscaled ${concept} ${w}x${h} -> ${Math.round(w*scale)}x${Math.round(h*scale)} (${buf.length}b -> ${outBuf.length}b)`)
          }
        } catch (error) {
          const warning = safeImageFailureSummary(error, 'Upscaling was skipped.')
          envelope.warnings.push(`upscale_failed:${warning}`)
          console.warn(`[imageGenTask] upscale skipped (${concept}):`, warning)
          outBuf = buf
        }

        try {
          const media = await payload.create({
            collection: 'media',
            data: {
              altText: `${productTitle} — ${label} (AI)`,
              product: productId,
              type: 'generated',
              generationLineage: {
                contractVersion: IMAGE_SLOT_CONTRACT_VERSION,
                jobId: String(jobId),
                attemptId: envelope.attemptId,
                slotId: envelope.slotId,
              },
            },
            file: {
              data: outBuf,
              mimetype: 'image/jpeg',
              name: filename,
              size: outBuf.length,
            },
          })
          console.log(`[imageGenTask v14] saved media=${media.id} ${concept} ${buf.length}b url=${media.url}`)
          return { mediaId: media.id as number, mediaUrl: (media.url as string) || '' }
        } catch (error) {
          console.error(`[imageGenTask v14] media save failed (${concept}): ${safeImageFailureSummary(error, 'Media save failed.')}`)
          throw error
        }
      },
    })

    if (isVisualLockV01Context(visualLockContext)) {
      try {
      const completePersistence = slotEnvelopes.every((slot) =>
        slot.status === 'persisted' && slot.mediaId != null,
      )
      if (!completePersistence) {
        slotEnvelopes = slotEnvelopes.map((slot) => slot.status === 'generated'
          ? {
              ...slot,
              status: 'media_save_failed' as const,
              failure: {
                code: 'media_save_failed' as const,
                summary: 'Final V0.1 pack persistence stopped after an earlier Media save failure.',
              },
            }
          : slot)
      }

      for (let index = 0; index < slotEnvelopes.length; index++) {
        let selectedSlot = slotEnvelopes[index]
        if (selectedSlot.attemptId !== rootAttemptId && selectedSlot.status !== 'persisted') {
          const child = qualityRetryAttempts.get(selectedSlot.attemptId)
          const childEvidence = child?.slots.find((slot) => slot.slotId === selectedSlot.slotId)?.qualityRetry
          if (childEvidence?.terminalOutcome === 'retry_passed') {
            const completedAt = new Date().toISOString()
            const persistenceEvidence = failVisualQualityRetryPersistenceV01(childEvidence, {
              completedAt,
              durationMs: childEvidence.startedAt
                ? Math.max(0, Date.parse(completedAt) - Date.parse(childEvidence.startedAt))
                : 0,
            })
            selectedSlot = { ...selectedSlot, qualityRetry: persistenceEvidence }
            slotEnvelopes[index] = selectedSlot
            const rootSlot = attemptMetadata.slots.find((slot) => slot.slotId === selectedSlot.slotId)
            if (rootSlot) {
              attemptMetadata = setAttemptSlotStatus(attemptMetadata, selectedSlot.slotId, {
                qualityRetry: persistenceEvidence,
              })
            }
          }
        }

        const serialized = serializeSlotEnvelopes([selectedSlot])[0]
        const patch = {
          displayOrder: serialized.displayOrder,
          purposeIdentifier: serialized.purposeIdentifier,
          operatorLabel: serialized.operatorLabel,
          status: serialized.status,
          provider: serialized.provider,
          mediaId: serialized.mediaId,
          mediaUrl: serialized.mediaUrl,
          warnings: serialized.warnings,
          failure: serialized.failure,
          qualityRetry: serialized.qualityRetry,
        }
        if (selectedSlot.attemptId === rootAttemptId) {
          attemptMetadata = setAttemptSlotStatus(attemptMetadata, selectedSlot.slotId, patch)
        } else {
          const child = qualityRetryAttempts.get(selectedSlot.attemptId)
          if (!child) throw new Error(`Missing retry attempt for selected slot ${selectedSlot.slotId}.`)
          qualityRetryAttempts.set(
            child.attemptId,
            setAttemptSlotStatus(child, selectedSlot.slotId, patch),
          )
        }
      }

      attemptMetadata = finishImageGenerationAttempt(attemptMetadata)
      for (const [attemptId, retryAttempt] of qualityRetryAttempts) {
        qualityRetryAttempts.set(
          attemptId,
          retryAttempt.status === 'running' ? finishImageGenerationAttempt(retryAttempt) : retryAttempt,
        )
      }

      if (completePersistence) {
        let selectionHistory = attemptHistory
        for (const retryAttempt of qualityRetryAttempts.values()) {
          selectionHistory = upsertGenerationAttemptHistory(selectionHistory, retryAttempt)
        }
        selectionHistory = upsertGenerationAttemptHistory(selectionHistory, attemptMetadata)
        const sourcesBySlot: Partial<Record<SlotKey, `iga_${string}`>> = {}
        for (const slot of slotEnvelopes) sourcesBySlot[slot.slotId] = slot.attemptId
        attemptMetadata = {
          ...attemptMetadata,
          packSelection: buildImageGenerationPackSelection({
            attempts: selectionHistory,
            rootAttemptId,
            sourcesBySlot,
          }),
        }
      }
      await persistAttemptRecords([...qualityRetryAttempts.values(), attemptMetadata])
      } catch (error) {
        const lineageError = safeImageFailureSummary(
          error,
          'Final V0.1 attempt or pack-selection evidence could not be persisted.',
        )
        try {
          await finalizeVisualLockV01ProductFailure()
        } catch (finalizationError) {
          throw new Error(
            `${lineageError} Product finalization: ${safeImageFailureSummary(finalizationError, 'Product visual failure state could not be finalized.')}`,
          )
        }
        throw new Error(lineageError)
      }
    } else {
      attemptMetadata = finishImageGenerationAttempt(attemptMetadata, serializeSlotEnvelopes(slotEnvelopes))
      await persistAttemptMetadata()
    }


    let visualOnlyPreview: VisualOnlyV01PreviewBinding | null = null
    if (visualOnlyBoundary) {
      if (!attemptMetadata.packSelection) throw new Error('VISUAL_ONLY_PASSING_PACK_REQUIRED')
      visualOnlyPreview = createVisualOnlyV01PreviewBinding({
        manifest: visualOnlyBoundary,
        rootAttemptId: attemptMetadata.attemptId,
        packSelection: attemptMetadata.packSelection,
      })
      promptsUsedEvidence.visualOnlyPreview = visualOnlyPreview
      await persistAttemptRecords([...qualityRetryAttempts.values(), attemptMetadata], {
        promptsUsed: JSON.stringify(promptsUsedEvidence),
      })
    }

    const persistedSlots = slotEnvelopes
      .filter((slot) => slot.status === 'persisted' && slot.output && slot.mediaId != null)
      .sort((a, b) => a.displayOrder - b.displayOrder)
    const selectedSlotById = new Map(slotEnvelopes.map((slot) => [slot.slotId, slot]))
    const mediaIds = persistedSlots.map((slot) => Number(slot.mediaId)).filter(Number.isFinite)
    const mediaUrls = requestedSlotIds.map((slotId) => selectedSlotById.get(slotId)?.mediaUrl || '')

    if (
      isVisualLockV01Context(visualLockContext)
      && persistedSlots.length !== requestedSlotIds.length
    ) {
      const msg = 'Visual Lock V0.1 tam beş-slot Media paketi kaydedilemedi — önizleme oluşturulmadı.'
      await persistAttemptRecords([...qualityRetryAttempts.values(), attemptMetadata], {
        status: 'failed',
        errorMessage: msg,
        generationCompletedAt: attemptMetadata.completedAt,
        providerResults: JSON.stringify({
          contractVersion: IMAGE_SLOT_CONTRACT_VERSION,
          attemptId: attemptMetadata.attemptId,
          summary: providerResultsSummary,
          slotLogs: slotLogsSummary,
          slotResults: attemptMetadata.slots,
          qualityGateSummary: attemptMetadata.qualityGateSummary,
          qualityRetryPolicyVersion: VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
        }),
      })
      try {
        await finalizeVisualLockV01ProductFailure()
      } catch (error) {
        const finalizationError = safeImageFailureSummary(error, 'Product visual failure state could not be finalized.')
        await persistAttemptRecords([...qualityRetryAttempts.values(), attemptMetadata], {
          status: 'failed',
          errorMessage: `${msg} Product finalization: ${finalizationError}`,
          generationCompletedAt: attemptMetadata.completedAt,
        })
        throw new Error(`${msg} Product finalization: ${finalizationError}`)
      }
      if (telegramChatId) {
        await sendTelegramNotification(telegramChatId, `❌ <b>Görsel kaydı başarısız</b>\n\n${msg}`)
      }
      throw new Error(msg)
    }

    if (persistedSlots.length === 0) {
      const msg = 'Üretilen görseller Media kaydına alınamadı — önizleme oluşturulmadı.'
      await persistAttemptMetadata({
        status: 'failed',
        errorMessage: msg,
        generationCompletedAt: attemptMetadata.completedAt,
        providerResults: JSON.stringify({
          contractVersion: IMAGE_SLOT_CONTRACT_VERSION,
          attemptId: attemptMetadata.attemptId,
          summary: providerResultsSummary,
          slotLogs: slotLogsSummary,
          slotResults: attemptMetadata.slots,
        }),
      })
      if (telegramChatId) {
        await sendTelegramNotification(telegramChatId, `❌ <b>Görsel kaydı başarısız</b>\n\n${msg}`)
      }
      throw new Error(msg)
    }

    if (visualOnlyPreview) {
      // The private review control must never be delivered before its exact
      // job/attempt/pack identity is durable and the Product is in preview.
      // Unlike the legacy compatibility path, enum fallback is forbidden.
      attemptHistory = upsertGenerationAttemptHistory(attemptHistory, attemptMetadata)
      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          status: 'preview',
          generatedImages: mediaIds,
          imageCount: mediaIds.length,
          generationCompletedAt: attemptMetadata.completedAt,
          generationContractVersion: IMAGE_SLOT_CONTRACT_VERSION,
          activeAttemptId: attemptMetadata.attemptId,
          generationAttempts: attemptHistory,
          promptsUsed: JSON.stringify(promptsUsedEvidence),
        },
      })
    }

    // ── Build per-slot icon array (ARRAY not string — avoids emoji indexing bugs) ─
    // v12: ⚠️ also shown when brandFidelityPass=false (brand zones drifted)
    // v20: ⚠️ also shown when shotCompliancePass=false (angle drift detected)
    const slotIconArr: string[] = requestedSlotIds.map((slotId) => {
      const slot = selectedSlotById.get(slotId)
      if (!slot) return '❌'
      if (slot.status !== 'persisted') return '❌'
      if (slot.warnings.length > 0 || slot.provider?.colorCheckPass === false || slot.provider?.brandFidelityPass === false || slot.provider?.shotCompliancePass === false) return '⚠️'
      return '✅'
    })
    // Joined string for approval keyboard summary only
    const slotIconsJoined = slotIconArr.join('')

    // ── Step 8: Send preview images to Telegram FIRST ────────────────────────
    // Legacy order: photos go to Telegram before its compatibility DB update.
    // Visual-only persisted its exact preview identity immediately above.
    // If the DB update fails (e.g. enum not migrated), photos are already
    // delivered. Swapping this order was the root cause of v10/v10.1 failures.
    if (telegramChatId) {
      // ── Step 8a: Send all preview images as a single Telegram album ────────
      // Uses sendMediaGroup for clean grouped delivery (one album instead of 3
      // separate messages). Falls back to individual sendPhoto if album fails.

      console.log(
        `[imageGenTask v25] step8 — sending ${persistedSlots.length} photos as album to chatId=${telegramChatId}` +
        ` mediaIds=${mediaIds.join(',')} slots=${persistedSlots.map((slot) => slot.slotId).join(',')}`,
      )

      // Build album items — filter out missing/empty buffers
      const albumItems: Array<{ buf: Buffer; caption: string; filename: string }> = []
      for (const envelope of persistedSlots) {
        const buf = envelope.output
        if (!buf || buf.length === 0) {
          console.warn(`[imageGenTask v25] step8 — skipping slot ${envelope.slotId}: buffer missing or empty`)
          continue
        }
        const slotLabel = envelope.operatorLabel
        const slotIcon = slotIconArr[envelope.displayOrder] || '✅'
        const filename = `${envelope.slotId}.jpg`
        const caption = `${slotIcon} <b>${slotLabel}</b> — ${providerDisplayLabel}`
        albumItems.push({ buf, caption, filename })
      }

      if (albumItems.length >= 2) {
        // Telegram sendMediaGroup: delivers all images as a single album message
        const albumOk = await sendTelegramMediaGroup(telegramChatId, albumItems)
        if (!albumOk) {
          // Fallback: send individually if album fails
          console.warn(`[imageGenTask v25] step8 — album failed, falling back to individual sends`)
          for (const item of albumItems) {
            await sendTelegramPhotoBuffer(telegramChatId, item.buf, item.caption, item.filename)
          }
        }
      } else if (albumItems.length === 1) {
        // Single image — sendPhoto (sendMediaGroup requires 2+)
        await sendTelegramPhotoBuffer(telegramChatId, albumItems[0].buf, albumItems[0].caption, albumItems[0].filename)
      }

      // ── Stage-appropriate approval keyboard ──────────────────────────────
      console.log(`[imageGenTask v14] step8 — sending approval keyboard jobId=${jobId} stage=${stage}`)
      await sendApprovalKeyboard(
        telegramChatId,
        jobId,
        persistedSlots.map((slot) => ({
          slotId: slot.slotId,
          displayOrder: slot.displayOrder,
          operatorLabel: slot.operatorLabel,
        })),
        productTitle,
        slotIconsJoined,
        identityLockMeta.mainColor as string | undefined,
        stage,
        providerDisplayLabel,
        visualOnlyPreview,
      )
    } else {
      console.warn(`[imageGenTask v14] step8 — no telegramChatId on job ${jobId}, skipping preview send`)
    }

    // ── Step 9: Update job status to 'preview' in DB ─────────────────────────
    // This comes AFTER the Telegram sends so a DB error cannot block delivery.
    // Falls back to 'review' if 'preview' is not yet in the Postgres enum
    // (can happen when push: true migration hasn't added new enum values yet).
    attemptHistory = upsertGenerationAttemptHistory(attemptHistory, attemptMetadata)
    const jobUpdateData = {
      generatedImages: mediaIds,
      imageCount: mediaIds.length,
      generationCompletedAt: new Date().toISOString(),
      generationContractVersion: IMAGE_SLOT_CONTRACT_VERSION,
      activeAttemptId: attemptMetadata.attemptId,
      generationAttempts: attemptHistory,
      providerResults: JSON.stringify({
        contractVersion: IMAGE_SLOT_CONTRACT_VERSION,
        attemptId: attemptMetadata.attemptId,
        attemptStatus: attemptMetadata.status,
        pipeline: pipelineLabel,
        provider,                // v14: actual provider used
        mode: `${mode} (cosmetic)`,
        humanSummary: (slotLogsSummary as Array<{
          label?: string; slot?: string; provider?: string; attempts?: number;
          success?: boolean; colorCheckPass?: boolean; brandFidelityPass?: boolean;
          brandFidelityScore?: string; shotCompliancePass?: boolean; detectedShot?: string;
          rejectionReason?: string;
        }>).map((sl, idx) => {
          const slotName  = sl.label ?? sl.slot ?? `Slot ${idx + 1}`
          const prov      = sl.provider ?? provider
          const tries     = sl.attempts ?? 1
          const ok        = sl.success ? '✓' : '✗'
          const color     = sl.colorCheckPass != null ? (sl.colorCheckPass ? 'color:✓' : 'color:✗') : ''
          const brand     = sl.brandFidelityPass != null ? (sl.brandFidelityPass ? 'brand:✓' : `brand:✗(${sl.brandFidelityScore ?? ''})`) : ''
          const shot      = sl.shotCompliancePass != null ? (sl.shotCompliancePass ? 'shot:✓' : `shot:✗(${sl.detectedShot?.slice(0, 40) ?? ''})`) : ''
          const rejection = sl.rejectionReason ? ` REJECTED:${sl.rejectionReason}` : ''
          const checks    = [color, brand, shot].filter(Boolean).join(' ')
          return `${slotName} → ${prov} / ${tries} attempt${tries > 1 ? 's' : ''} / ${ok}${checks ? ' ' + checks : ''}${rejection}`
        }),
        summary: providerResultsSummary,
        slotLogs: slotLogsSummary,
        identityLock: identityLockMeta,
        mediaUrls,
        slotResults: serializeSlotEnvelopes(slotEnvelopes),
        rootSlotResults: attemptMetadata.slots,
        // D-407: final per-image slot-contract metadata, now with the saved media
        // IDs paired to each slot (slotIndex/slotKey/promptVersion/productId/sourceImageId).
        promptVersion: SLOT_PROMPT_VERSION,
        slotContract: slotContractMeta.map((metadata) => ({
          ...metadata,
          mediaId: selectedSlotById.get(metadata.slotKey as (typeof requestedSlotIds)[number])?.mediaId ?? null,
        })),
      }),
      jobTitle: provider === 'gemini-pro'
        ? `${productTitle} — Gemini Pro (${mediaIds.length} görsel)`
        : `${productTitle} — OpenAI Edit (${mediaIds.length} görsel)`,
      promptsUsed: JSON.stringify(promptsUsedEvidence),
    }

    if (visualOnlyPreview) {
      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: jobUpdateData,
      })
      console.log(`[imageGenTask] step9 — visual-only preview evidence finalized without a status rewrite`)
    } else try {
      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: { status: 'preview', ...jobUpdateData },
      })
      console.log(`[imageGenTask v14] step9 — job status set to preview`)
    } catch (enumErr) {
      // 'preview' not in Postgres enum yet — fall back to 'review' (always valid)
      const errMsg = enumErr instanceof Error ? enumErr.message : String(enumErr)
      console.error(`[imageGenTask v14] step9 — 'preview' status update failed (enum issue?): ${errMsg}`)
      try {
        await payload.update({
          collection: 'image-generation-jobs',
          id: jobId,
          data: { status: 'review', ...jobUpdateData },
        })
        console.log(`[imageGenTask v14] step9 — fallback: job status set to review`)
        if (telegramChatId) {
          await sendTelegramNotification(
            telegramChatId,
            `⚠️ <i>Not: İş durumu DB'de "review" olarak kaydedildi ('preview' enum sorunu). ` +
            `Onay butonları yine de çalışır.</i>`,
          )
        }
      } catch (fallbackErr) {
        const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
        console.error(`[imageGenTask v14] step9 — fallback 'review' also failed: ${fbMsg}`)
      }
    }

    console.log(`[imageGenTask v14] done — jobId=${jobId} product=${productId} images=${mediaIds.length} status=preview`)

    return {
      output: {
        success: true,
        mediaIds: mediaIds.join(','),
        error: '',
      },
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildFallbackLock() {
  return {
    promptBlock:
      `═══ PRODUCT IDENTITY LOCK (FALLBACK) ═══\n` +
      `Reproduce the EXACT shoe shown in the reference photo.\n` +
      `This is the SAME PHYSICAL SHOE — not a similar shoe, not a redesigned shoe.\n` +
      `\n` +
      `PRESERVE EXACTLY:\n` +
      `• Silhouette and overall shape\n` +
      `• Sole geometry, thickness, and profile\n` +
      `• Toe shape and toe box\n` +
      `• Lace structure, closure type\n` +
      `• Material finish and surface texture\n` +
      `• All logos, stripes, buckles, ornaments — do NOT invent or alter\n` +
      `• Color — keep the EXACT color shown in the reference (no shifts)\n` +
      `\n` +
      `ONLY CHANGE: camera angle, lighting, background, scene setting.\n` +
      `═══════════════════════════\n\n`,
    productClass: 'shoe',
    mainColor: 'as shown in reference',
    material: 'as shown in reference',
  }
}

async function sendTelegramNotification(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
  } catch (err) {
    console.error('[imageGenTask] Telegram notify failed:', err)
  }
}

/**
 * Send a single image to Telegram via multipart/form-data buffer upload.
 *
 * Uses the raw JPEG buffer directly — bypasses URL accessibility issues.
 * Telegram receives the bytes directly without needing to fetch a URL.
 * Checks and logs the Telegram API response (both success and failure).
 */
async function sendTelegramPhotoBuffer(
  chatId: string,
  buf: Buffer,
  caption: string,
  filename: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.warn('[imageGenTask] sendTelegramPhotoBuffer: TELEGRAM_BOT_TOKEN not set')
    return
  }
  try {
    const form = new FormData()
    form.append('chat_id', chatId)
    form.append('caption', caption)
    form.append('parse_mode', 'HTML')
    form.append('photo', new Blob([new Uint8Array(buf)], { type: 'image/jpeg' }), filename)

    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: form,
    })
    const data = await res.json() as { ok: boolean; result?: { message_id?: number }; description?: string }

    if (data.ok) {
      console.log(`[imageGenTask] sendTelegramPhotoBuffer ok — msg_id=${data.result?.message_id} file=${filename}`)
    } else {
      console.error(
        `[imageGenTask] sendTelegramPhotoBuffer FAILED — file=${filename} chat=${chatId}` +
        ` tg_error="${data.description}" full=${JSON.stringify(data)}`,
      )
    }
  } catch (err) {
    console.error(`[imageGenTask] sendTelegramPhotoBuffer exception (${filename}):`, err)
  }
}

/**
 * Send multiple images as a single Telegram album via sendMediaGroup.
 *
 * Telegram's sendMediaGroup delivers 2-10 photos as one grouped message
 * (album), drastically reducing chat clutter vs individual sends.
 *
 * Each photo is attached via multipart `attach://photoN` references.
 * Only the first photo's caption is displayed by Telegram (album rule).
 *
 * Returns true on success, false on failure (caller should fallback to
 * individual sendPhoto calls).
 */
async function sendTelegramMediaGroup(
  chatId: string,
  items: Array<{ buf: Buffer; caption: string; filename: string }>,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.warn('[imageGenTask] sendTelegramMediaGroup: TELEGRAM_BOT_TOKEN not set')
    return false
  }
  try {
    // Build the media JSON array — each item references attach://photoN
    const media = items.map((item, i) => ({
      type: 'photo' as const,
      media: `attach://photo${i}`,
      // Telegram only shows caption on the first photo in an album
      ...(i === 0
        ? { caption: item.caption, parse_mode: 'HTML' as const }
        : {}),
    }))

    const form = new FormData()
    form.append('chat_id', chatId)
    form.append('media', JSON.stringify(media))

    // Attach each photo buffer as a named field matching the attach:// reference
    for (let i = 0; i < items.length; i++) {
      form.append(
        `photo${i}`,
        new Blob([new Uint8Array(items[i].buf)], { type: 'image/jpeg' }),
        items[i].filename,
      )
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`, {
      method: 'POST',
      body: form,
    })
    const data = await res.json() as { ok: boolean; result?: unknown[]; description?: string }

    if (data.ok) {
      console.log(
        `[imageGenTask] sendTelegramMediaGroup ok — ${items.length} photos sent as album` +
        ` chat=${chatId} files=${items.map((it) => it.filename).join(',')}`,
      )
      return true
    } else {
      console.error(
        `[imageGenTask] sendTelegramMediaGroup FAILED — chat=${chatId}` +
        ` tg_error="${data.description}" full=${JSON.stringify(data)}`,
      )
      return false
    }
  } catch (err) {
    console.error(`[imageGenTask] sendTelegramMediaGroup exception:`, err)
    return false
  }
}

/**
 * Send the stage-appropriate approval inline keyboard to Telegram after preview images.
 *
 * Stage 1 "standard" (slots 1-3) keyboard (v21):
 *   Row 1: ✅ Tümünü Onayla (1-3)
 *   Row 2: 📷 Görsel 1  |  📷 Görsel 2  |  📷 Görsel 3
 *   Row 3: 📸 1+2  |  📸 1+3  |  📸 2+3
 *   Row 4: 🌟 4-5 Gemini Pro Üret
 *   Row 5: 🔄 Yeniden Üret  |  ❌ Reddet
 *
 * Stage 2 "premium" (slots 4-5) keyboard (v21):
 *   Row 1: ✅ Tümünü Onayla (4-5)
 *   Row 2: 📷 Görsel 4  |  📷 Görsel 5
 *   Row 3: 🔄 Yeniden Üret  |  ❌ Reddet
 *
 * callback_data formats (handled in route.ts):
 *   imgapprove:{jobId}:all   — approve all generated images
 *   imgpremium:{jobId}       — start Stage 2 premium generation (slots 4-5)
 *   imgregen:{jobId}         — discard + regenerate same stage
 *   imgreject:{jobId}        — reject, discard temp media
 *
 * Text commands also accepted in route.ts:
 *   onayla / approve            → approve all
 *   onayla 1,2,3 / approve 1,3 → approve specific slots (1-based)
 *   reddet / reject / cancel    → reject
 *   yeniden üret / regenerate   → regenerate same stage
 *
 * v21: Per-image selection buttons added.
 *   Individual:   📷 Görsel 1 / 2 / 3  → imgapprove:{jobId}:1 / :2 / :3
 *   Combinations: 📸 1+2 / 1+3 / 2+3  → imgapprove:{jobId}:1,2 etc.
 *   All existing callback handlers in route.ts already support these formats.
 */
async function sendApprovalKeyboard(
  chatId: string,
  jobId: string,
  approvalSlots: Array<{ slotId: string; displayOrder: number; operatorLabel: string }>,
  productTitle: string,
  slotIcons: string,
  mainColor?: string,
  stage: 'standard' | 'premium' = 'standard',
  providerLabel?: string,
  visualOnlyPreview?: VisualOnlyV01PreviewBinding | null,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  const colorLine    = mainColor     ? `\n🎨 Renk kilidi: <b>${mainColor}</b>`  : ''
  const providerLine = providerLabel ? `\n🤖 Provider: <b>${providerLabel}</b>` : ''
  const isStandard = stage !== 'premium'
  const imageCount = approvalSlots.length
  const stageLabel = isStandard ? `5 slot planı · ${imageCount} hazır` : `Slot 4-5 · ${imageCount} hazır`

  // ── Build per-image individual buttons ──────────────────────────────────
  // New callbacks carry the stable semantic slot ID. Legacy numeric callbacks
  // and text commands remain supported by the compatibility adapter.
  const individualButtons = approvalSlots.map((slot) => ({
    text: `📷 Görsel ${slot.displayOrder + 1}`,
    callback_data: `imgapprove:${jobId}:${slot.slotId}`,
  }))

  // D-409: legacy 1+2/1+3/2+3 combo buttons removed (dead for the 5-image pack).
  // Partial approval stays available via the per-image buttons below and via the
  // text command "onayla 1,3,5".
  const stageNote = visualOnlyPreview
    ? 'Özel visual-only inceleme: yalnızca tam beş-slot paket onaylanabilir veya reddedilebilir; aşağı-akış işlem başlatılmaz.'
    : `Tümünü onayla, tek tek seç ya da yeniden üret. (Kısmi: "onayla 1,3,5")`

  const text =
    `${isStandard ? '📸' : '🌟'} <b>${imageCount} önizleme hazır (${stageLabel})</b>\n\n` +
    `📦 <b>${productTitle}</b>` +
    colorLine +
    providerLine +
    (slotIcons ? `\n🎯 Slotlar: ${slotIcons}` : '') +
    `\n\n` +
    stageNote

  // ── Assemble keyboard ────────────────────────────────────────────────────
  const keyboard: Array<Array<{ text: string; callback_data: string }>> = []

  if (visualOnlyPreview) {
    keyboard.push([{
      text: `✅ Visual-only Paketi Onayla (${imageCount})`,
      callback_data: `voa:${jobId}:${visualOnlyPreview.callbackToken}`,
    }])
    keyboard.push([{
      text: '❌ Visual-only Paketi Reddet',
      callback_data: `vor:${jobId}:${visualOnlyPreview.callbackToken}`,
    }])
  } else {

  // Row 1: Approve all
  const allLabel = `✅ Tümünü Onayla (${imageCount})`
  keyboard.push([{ text: allLabel, callback_data: `imgapprove:${jobId}:all` }])

  // Row 2: per-image buttons for partial approval (Telegram wraps as needed)
  if (individualButtons.length > 0) {
    keyboard.push(individualButtons)
  }

  // D-409: combo-button row and the "🌟 4-5 Gemini Pro Üret" up-sell row removed —
  // the standard pack always produces all 5 slots, so both were dead/confusing excess.

  // Last row: Regenerate + Reject
  keyboard.push([
    { text: '🔄 Yeniden Üret', callback_data: `imgregen:${jobId}` },
    { text: '❌ Reddet',       callback_data: `imgreject:${jobId}` },
  ])
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard },
      }),
    })
    const data = await res.json() as { ok: boolean; result?: { message_id?: number }; description?: string }
    if (data.ok) {
      console.log(`[imageGenTask] sendApprovalKeyboard ok — msg_id=${data.result?.message_id} job=${jobId} stage=${stage}`)
    } else {
      console.error(
        `[imageGenTask] sendApprovalKeyboard FAILED — job=${jobId} chat=${chatId}` +
        ` tg_error="${data.description}" full=${JSON.stringify(data)}`,
      )
    }
  } catch (err) {
    console.error('[imageGenTask] sendApprovalKeyboard exception:', err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock Number Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a unique stock number in format SN0001–SN9999.
 * Queries the DB for the current max and increments.
 * Falls back to a random number on race condition (unique constraint catches dupes).
 */
async function generateStockNumber(
  payload: { find: Function },
): Promise<string> {
  try {
    // Find the highest existing stockNumber
    const { docs } = await payload.find({
      collection: 'products',
      where: {
        stockNumber: { exists: true },
      },
      sort: '-stockNumber',
      limit: 1,
      depth: 0,
    })

    let nextNum = 1
    if (docs.length > 0) {
      const current = docs[0].stockNumber as string
      const match = current?.match(/^SN(\d+)$/)
      if (match) {
        nextNum = parseInt(match[1], 10) + 1
      }
    }

    // Clamp to 4 digits (SN0001–SN9999)
    if (nextNum > 9999) nextNum = nextNum % 10000 || 1

    return `SN${String(nextNum).padStart(4, '0')}`
  } catch (err) {
    // Fallback: random 4-digit number (unique constraint will prevent dupes)
    console.warn('[imageGenTask] stockNumber generation fallback:', err)
    const rand = Math.floor(Math.random() * 9999) + 1
    return `SN${String(rand).padStart(4, '0')}`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock Number Overlay — v32 Bitmap Pixel Font (Vercel-safe, zero font deps)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 5×7 bitmap pixel font for digits 0-9 and common letters.
 * Each entry is a 7-element array of 5-bit rows (MSB = leftmost pixel).
 * Renders via SVG <rect> elements — no <text>, no font-family, works everywhere.
 */
const PIXEL_FONT: Record<string, number[]> = {
  '0': [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E],
  '1': [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
  '2': [0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F],
  '3': [0x0E, 0x11, 0x01, 0x06, 0x01, 0x11, 0x0E],
  '4': [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02],
  '5': [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
  '6': [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E],
  '7': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
  '9': [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
  'S': [0x0E, 0x11, 0x10, 0x0E, 0x01, 0x11, 0x0E],
  'N': [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  'A': [0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
  'B': [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
  'C': [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E],
  'D': [0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E],
  'E': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F],
  'F': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
  'G': [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0E],
  'H': [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
  'I': [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
  'K': [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
  'M': [0x11, 0x1B, 0x15, 0x11, 0x11, 0x11, 0x11],
  'P': [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
  'R': [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
  'T': [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
  'V': [0x11, 0x11, 0x11, 0x11, 0x0A, 0x0A, 0x04],
  'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11],
  'X': [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
  'Y': [0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04],
  'Z': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
  '?': [0x0E, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
}

/**
 * Renders a string as SVG <rect> elements using the 5×7 pixel font.
 * Returns an SVG string (no <text> elements — purely geometric).
 */
function renderBitmapText(
  text: string,
  pixelSize: number,
  fillColor: string,
): { svg: string; width: number; height: number } {
  const CHAR_W = 5
  const CHAR_H = 7
  const CHAR_GAP = 1 // 1-pixel gap between characters
  const totalCharW = CHAR_W + CHAR_GAP
  const svgW = text.length * totalCharW * pixelSize - CHAR_GAP * pixelSize
  const svgH = CHAR_H * pixelSize

  const rects: string[] = []
  for (let ci = 0; ci < text.length; ci++) {
    const ch = text[ci].toUpperCase()
    const bitmap = PIXEL_FONT[ch] || PIXEL_FONT['?']
    const xOffset = ci * totalCharW * pixelSize
    for (let row = 0; row < CHAR_H; row++) {
      const rowBits = bitmap[row]
      for (let col = 0; col < CHAR_W; col++) {
        if (rowBits & (0x10 >> col)) {
          rects.push(
            `<rect x="${xOffset + col * pixelSize}" y="${row * pixelSize}" ` +
            `width="${pixelSize}" height="${pixelSize}" fill="${fillColor}"/>`,
          )
        }
      }
    }
  }

  const svg =
    `<svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">` +
    rects.join('') +
    `</svg>`

  return { svg, width: svgW, height: svgH }
}

/**
 * Overlay a stock number on the bottom-right corner of a JPEG buffer.
 * v32 bitmap pixel font — uses SVG <rect> elements only, zero font dependencies.
 * Works on Vercel serverless (no system fonts needed).
 */
async function overlayStockNumber(
  imageBuffer: Buffer,
  stockNumber: string,
): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require('sharp') as typeof import('sharp')

  const metadata = await sharp(imageBuffer).metadata()
  const width = metadata.width || 1024
  const height = metadata.height || 1024

  // v32: Bitmap pixel font overlay — zero font dependencies.
  // Pixel size scales with image: ~3px per pixel on 1024px image → ~21px tall text
  const pixelSize = Math.max(2, Math.round(width * 0.003))
  const CHAR_H = 7
  const margin = Math.round(width * 0.015)
  const paddingX = Math.round(pixelSize * 2)
  const paddingY = Math.round(pixelSize * 1.5)

  // Render text as SVG rects
  const { width: textW, height: textH } = renderBitmapText(
    stockNumber,
    pixelSize,
    'rgba(255,255,255,0.85)',
  )

  const boxWidth = textW + paddingX * 2
  const boxHeight = textH + paddingY * 2
  const pillLeft = width - boxWidth - margin
  const pillTop = height - boxHeight - margin

  // Single SVG with pill background + bitmap text overlaid
  const combinedSvg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="${pillLeft}" y="${pillTop}" width="${boxWidth}" height="${boxHeight}" ` +
    `rx="4" ry="4" fill="rgba(0,0,0,0.35)"/>` +
    `<g transform="translate(${pillLeft + paddingX},${pillTop + paddingY})">` +
    // Inline the text rects from renderBitmapText
    (() => {
      const CHAR_W = 5
      const CHAR_GAP = 1
      const totalCharW = CHAR_W + CHAR_GAP
      const rects: string[] = []
      for (let ci = 0; ci < stockNumber.length; ci++) {
        const ch = stockNumber[ci].toUpperCase()
        const bitmap = PIXEL_FONT[ch] || PIXEL_FONT['?']
        const xOff = ci * totalCharW * pixelSize
        for (let row = 0; row < CHAR_H; row++) {
          const rowBits = bitmap[row]
          for (let col = 0; col < CHAR_W; col++) {
            if (rowBits & (0x10 >> col)) {
              rects.push(
                `<rect x="${xOff + col * pixelSize}" y="${row * pixelSize}" ` +
                `width="${pixelSize}" height="${pixelSize}" fill="rgba(255,255,255,0.85)"/>`,
              )
            }
          }
        }
      }
      return rects.join('')
    })() +
    `</g>` +
    `</svg>`,
  )

  console.log(
    `[overlayStockNumber v32-bitmap] stockNumber="${stockNumber}" pixelSize=${pixelSize} ` +
    `pill=${boxWidth}x${boxHeight} at (${pillLeft},${pillTop}) textSize=${textW}x${textH}`,
  )

  return sharp(imageBuffer)
    .composite([{ input: combinedSvg, top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toBuffer()
}
