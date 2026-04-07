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
 *   Default Stage 1 (slots 1-3) is STILL lumaGenTask → #gorsel → luma-gen.
 *   This task handles all image-gen (openai + gemini-pro) explicit engine requests.
 *
 * REGEN ROUTING (v17):
 *   provider='openai'     → re-queues image-gen/openai (preserves explicit engine)
 *   provider='gemini-pro' → re-queues image-gen/gemini-pro
 *   provider='luma'       → re-queues luma-gen (handled in regenImageGenJob, not here)
 *
 * v11 PREVIEW FLOW: images are NOT attached to product until operator
 * explicitly approves via Telegram. See route.ts for approval handlers.
 */

import type { TaskConfig } from 'payload'

export const imageGenTask: TaskConfig<{
  input: { jobId: string; stage?: string; provider?: string }
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
      const jobDoc = await req.payload.findByID({
        collection: 'image-generation-jobs',
        id: jobId,
        depth: 0,
      }) as Record<string, unknown>

      await req.payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          status: 'failed',
          errorMessage: 'Job başarısız oldu — Payload Jobs kaydını kontrol edin',
          generationCompletedAt: new Date().toISOString(),
        },
      })

      // VF-2: Revert product visualStatus to pending on job failure
      const productRef = jobDoc.product as { id: number } | number | null
      const failProductId = productRef ? (typeof productRef === 'object' ? productRef.id : productRef) : null
      if (failProductId) {
        try {
          const pDoc = await req.payload.findByID({ collection: 'products', id: failProductId, depth: 0 }) as Record<string, unknown>
          const wf = (pDoc.workflow ?? {}) as Record<string, unknown>
          await req.payload.update({
            collection: 'products',
            id: failProductId,
            data: {
              workflow: {
                workflowStatus: wf.workflowStatus,
                visualStatus: 'pending',
                confirmationStatus: wf.confirmationStatus,
                contentStatus: wf.contentStatus,
                auditStatus: wf.auditStatus,
                publishStatus: wf.publishStatus,
                productConfirmedAt: wf.productConfirmedAt,
                stockState: wf.stockState,
                sellable: wf.sellable,
                lastHandledByBot: wf.lastHandledByBot,
              },
            },
            context: { isDispatchUpdate: true },
          })
          console.log(`[VF-2] visualStatus reverted to pending on failure — product=${failProductId}`)
        } catch (vsErr) {
          console.error(`[VF-2] visualStatus revert on failure FAILED (non-blocking):`, vsErr)
        }
      }
    } catch (err) {
      console.error('[imageGenTask] onFail cleanup error:', err)
    }
  },

  handler: async ({ input, req }) => {
    const { jobId } = input
    // stage: 'standard' → slots 1-3 (default for #gorsel)
    //        'premium'  → slots 4-5 (explicit operator request)
    const stage = (input.stage || 'standard') as 'standard' | 'premium'
    const sceneIndices = stage === 'premium' ? [3, 4] : [0, 1, 2]
    // provider: 'openai' (default, gpt-image-1 edit) | 'gemini-pro' (Gemini image gen)
    // v19 Gemini-only: default provider is gemini-pro (was 'openai' before v19)
    const provider = (input.provider || 'gemini-pro') as 'openai' | 'gemini-pro'
    const payload = req.payload

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

    await payload.update({
      collection: 'image-generation-jobs',
      id: jobId,
      data: {
        status: 'generating',
        generationStartedAt: new Date().toISOString(),
      },
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

    const productTitle = (productDoc.title as string) || 'Ürün'

    // ── Step 2a: Ensure persistent stockNumber ────────────────────────────────
    // Format: SN0001–SN9999. Generated once per product, never changes.
    // Used for deterministic overlay on all generated images.
    let stockNumber = productDoc.stockNumber as string | undefined
    if (!stockNumber) {
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
          console.log(`[imageGenTask v14] primary ref — ${buf.length}b ${resolved.mime}`)
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

      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          status: 'failed',
          errorMessage: msg,
          generationCompletedAt: new Date().toISOString(),
        },
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

        await payload.update({
          collection: 'image-generation-jobs',
          id: jobId,
          data: {
            status: 'failed',
            errorMessage: rejectionMsg,
            generationCompletedAt: new Date().toISOString(),
            providerResults: JSON.stringify({
              rejected: true,
              reason: validation.rejectionReason,
            }),
          },
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
    const { extractIdentityLock, getBackgroundForColor } = await import('../lib/imageProviders')
    type IdentityLock = Awaited<ReturnType<typeof extractIdentityLock>>

    let identityLock: NonNullable<IdentityLock>
    let identityLockMeta: Record<string, unknown> = {}

    if (process.env.GEMINI_API_KEY) {
      const lock = await extractIdentityLock(
        referenceImage,
        referenceImageMime || 'image/jpeg',
        process.env.GEMINI_API_KEY,
        additionalReferenceImages.length > 0 ? additionalReferenceImages : undefined,
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
    const ALL_SLOT_NAMES  = ['side_angle', 'commerce_front', 'back_hero', 'tabletop_editorial', 'worn_lifestyle']
    const ALL_SLOT_LABELS = ['Slot 1 — Yan Profil (PRIMARY)', 'Slot 2 — Ön Hero', 'Slot 3 — Arka Hero', 'Slot 4 — Editoryal', 'Slot 5 — Lifestyle']
    const slotNames  = sceneIndices.map((i) => ALL_SLOT_NAMES[i])
    const slotLabels = sceneIndices.map((i) => ALL_SLOT_LABELS[i])

    const pipelineLabel = provider === 'gemini-pro'
      ? `gemini-pro-image-v14:${process.env.GEMINI_IMAGE_GEN_MODEL || 'gemini-2.5-flash-image'}`
      : 'openai-edit-only-v12'

    // Human-readable provider label for Telegram captions and keyboard
    const providerDisplayLabel = provider === 'gemini-pro'
      ? `✨ Gemini Pro ${process.env.GEMINI_IMAGE_GEN_MODEL || 'gemini-2.5-flash-image'}`
      : `⚙️ OpenAI gpt-image-1`

    console.log(`[imageGenTask v14] generating — stage=${stage} provider=${provider} slots=[${slotNames.join(',')}]`)

    await payload.update({
      collection: 'image-generation-jobs',
      id: jobId,
      data: {
        promptsUsed: JSON.stringify({
          pipeline: pipelineLabel,
          provider,           // explicit provider field — recovered by regenImageGenJob
          stage,
          mode: `${mode} (cosmetic)`,
          identityLock: identityLockMeta,
          slots: slotNames,
        }),
      },
    })

    let generatedBuffers: Buffer[] = []
    let providerResultsSummary: unknown[] = []
    let slotLogsSummary: unknown[] = []

    try {
      const { generateByEditing, generateByGeminiPro } = await import('../lib/imageProviders')
      const genFn = provider === 'gemini-pro' ? generateByGeminiPro : generateByEditing

      const { results, buffers, slotLogs } = await genFn(
        referenceImage,
        referenceImageMime || 'image/jpeg',
        identityLock,
        sceneIndices,
        additionalReferenceImages.length > 0 ? additionalReferenceImages : undefined,
      )
      generatedBuffers = buffers
      slotLogsSummary = slotLogs
      providerResultsSummary = results.map((r) => ({
        provider: r.provider,
        success: r.successCount,
        total: r.promptCount,
        errors: r.errors,
      }))

      console.log(`[imageGenTask v14] generated ${generatedBuffers.length} images via ${provider}`)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[imageGenTask v14] generation error (${provider}):`, errMsg)
      providerResultsSummary = [{ provider, error: errMsg }]
    }

    if (generatedBuffers.length === 0) {
      const providerLabel = provider === 'gemini-pro' ? 'Gemini Pro' : 'OpenAI'

      // Extract first real API error from slot logs for diagnostic display
      const firstSlotError = (slotLogsSummary as Array<{ rejectionReason?: string }>)
        .find((s) => s.rejectionReason)?.rejectionReason || null
      const apiErrorSummary = firstSlotError
        ? firstSlotError.slice(0, 200)
        : ((providerResultsSummary[0] as { error?: string } | undefined)?.error || null)

      const msg = `${providerLabel} görsel üretimi başarısız — 0 görsel üretildi.`

      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          status: 'failed',
          errorMessage: apiErrorSummary ? `${msg} API: ${apiErrorSummary}` : msg,
          generationCompletedAt: new Date().toISOString(),
          providerResults: JSON.stringify({
            summary: providerResultsSummary,
            slotLogs: slotLogsSummary,
          }),
        },
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

    // ── Step 6c: Background consistency check ────────────────────────────────
    // Gemini Vision compares backgrounds across generated images.
    // Fail-open: if check errors, generation proceeds normally.
    if (generatedBuffers.length >= 2) {
      try {
        const mainColorForBg = (identityLockMeta.mainColor as string) || ''
        const batchBackground = mainColorForBg ? getBackgroundForColor(mainColorForBg) : 'neutral light grey'
        const bgResult = await checkBackgroundConsistency(generatedBuffers, batchBackground)
        if (!bgResult.consistent) {
          console.warn('[imageGenTask] BG drift! Slots: ' + bgResult.driftedSlots.join(',') + ' -- ' + (bgResult.detail || ''))
          for (const dIdx of bgResult.driftedSlots) {
            const li = dIdx - 1
            if (slotLogsSummary[li]) {
              (slotLogsSummary[li] as Record<string, unknown>).bgDrift = true;
              (slotLogsSummary[li] as Record<string, unknown>).bgDriftDetail = bgResult.detail
            }
          }
        } else {
          console.log('[imageGenTask] Background consistency check passed')
        }
      } catch (bgErr) {
        console.warn('[imageGenTask] BG check failed (non-blocking):', bgErr instanceof Error ? bgErr.message : bgErr)
      }
    }

    // ── Step 6b: Overlay stockNumber on each generated image ──────────────
    // Deterministic post-process — NOT prompt-based. Uses sharp composite
    // to render the stock number in the bottom-right corner of every image.
    if (stockNumber) {
      for (let i = 0; i < generatedBuffers.length; i++) {
        try {
          generatedBuffers[i] = await overlayStockNumber(generatedBuffers[i], stockNumber)
        } catch (err) {
          console.warn(`[imageGenTask] overlay failed for buffer ${i}:`, err)
          // Keep original buffer if overlay fails — don't lose the image
        }
      }
      console.log(`[imageGenTask] stockNumber "${stockNumber}" overlaid on ${generatedBuffers.length} images`)
    }

    // ── Step 7: Save each buffer as a Media document ────────────────────────
    // DUAL-TRACK (v13): Images saved as type='generated' — not 'enhanced'.
    // 'enhanced' = cleaned/improved original. 'generated' = AI-created output.
    // NOT attached to product.images — held in job.generatedImages until approved.
    // On approval: written to product.generativeGallery (marketing lane), NOT product.images.
    // slotNames/slotLabels already computed above (filtered by stage)
    const mediaIds: number[] = []
    const mediaUrls: string[] = []

    for (let i = 0; i < generatedBuffers.length; i++) {
      const buf = generatedBuffers[i]
      const concept = slotNames[i] || `image-${i}`
      const label = slotLabels[i] || `Görsel ${i + 1}`
      const filename = `ai-${productId}-${concept}-${Date.now()}-${i}.jpg`

      try {
        const media = await payload.create({
          collection: 'media',
          data: {
            altText: `${productTitle} — ${label} (AI)`,
            product: productId,
            type: 'generated',
          },
          file: {
            data: buf,
            mimetype: 'image/jpeg',
            name: filename,
            size: buf.length,
          },
        })
        mediaIds.push(media.id as number)
        mediaUrls.push((media.url as string) || '')
        console.log(`[imageGenTask v14] saved media=${media.id} ${concept} ${buf.length}b url=${media.url}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[imageGenTask v14] media save failed (${concept}): ${msg}`)
        mediaUrls.push('') // keep index alignment
      }
    }

    // ── Build per-slot icon array (ARRAY not string — avoids emoji indexing bugs) ─
    // v12: ⚠️ also shown when brandFidelityPass=false (brand zones drifted)
    // v28: ⚠️ also shown when bgCheckPass=false (background drift detected)
    const slotIconArr: string[] = (slotLogsSummary as Array<{ success?: boolean; colorCheckPass?: boolean; brandFidelityPass?: boolean; shotCompliancePass?: boolean; bgCheckPass?: boolean }>)
      .map((s) => {
        if (s.success === false) return '❌'
        if (s.colorCheckPass === false || s.brandFidelityPass === false || s.shotCompliancePass === false || s.bgCheckPass === false) return '⚠️'
        return '✅'
      })
    // Joined string for approval keyboard summary only
    const slotIconsJoined = slotIconArr.join('')

    // ── Step 8: Send preview images to Telegram FIRST ────────────────────────
    // CRITICAL ORDER: photos go to Telegram BEFORE the DB status update.
    // If the DB update fails (e.g. enum not migrated), photos are already
    // delivered. Swapping this order was the root cause of v10/v10.1 failures.
    if (telegramChatId) {
      // ── Step 8a: Send all preview images as a single Telegram album ────────
      // Uses sendMediaGroup for clean grouped delivery (one album instead of 3
      // separate messages). Falls back to individual sendPhoto if album fails.

      console.log(
        `[imageGenTask v25] step8 — sending ${generatedBuffers.length} photos as album to chatId=${telegramChatId}` +
        ` mediaIds=${mediaIds.join(',')} bufSizes=${generatedBuffers.map((b) => b?.length ?? 'null').join(',')}`,
      )

      // Build album items — filter out missing/empty buffers
      // Clean captions — product-focused, no provider/metadata clutter.
      // Slot diagnostics are in the approval keyboard message + job metadata.
      const CLEAN_SLOT_LABELS = ['Yan Profil', 'Ön Görünüm', 'Arka Hero', 'Editoryal', 'Lifestyle']
      const albumItems: Array<{ buf: Buffer; caption: string; filename: string }> = []
      for (let i = 0; i < generatedBuffers.length; i++) {
        const buf = generatedBuffers[i]
        if (!buf || buf.length === 0) {
          console.warn(`[imageGenTask v28] step8 — skipping slot ${i + 1}: buffer missing or empty`)
          continue
        }
        const cleanLabel = CLEAN_SLOT_LABELS[sceneIndices[i]] || `Görsel ${i + 1}`
        const filename = `${slotNames[i] || `slot-${i}`}.jpg`
        // First image in album gets the product title + stock number; rest get just the slot label
        const caption = i === 0
          ? `📦 <b>${productTitle}</b>${stockNumber ? ` — ${stockNumber}` : ''}\n${cleanLabel}`
          : cleanLabel
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
        mediaIds.length,
        productTitle,
        slotIconsJoined,
        identityLockMeta.mainColor as string | undefined,
        stage,
        providerDisplayLabel,
      )
    } else {
      console.warn(`[imageGenTask v14] step8 — no telegramChatId on job ${jobId}, skipping preview send`)
    }

    // ── Step 9: Update job status to 'preview' in DB ─────────────────────────
    // This comes AFTER the Telegram sends so a DB error cannot block delivery.
    // Falls back to 'review' if 'preview' is not yet in the Postgres enum
    // (can happen when push: true migration hasn't added new enum values yet).
    const jobUpdateData = {
      generatedImages: mediaIds,
      imageCount: mediaIds.length,
      generationCompletedAt: new Date().toISOString(),
      providerResults: JSON.stringify({
        pipeline: pipelineLabel,
        provider,
        mode: `${mode} (cosmetic)`,
        // v28: comprehensive batch context for debugging
        batchContext: {
          stockNumber: stockNumber || null,
          referenceImageCount: 1 + additionalReferenceImages.length,
          chosenBackground: (identityLockMeta.mainColor as string)
            ? getBackgroundForColor(identityLockMeta.mainColor as string)
            : null,
          stage,
          sceneIndices,
        },
        humanSummary: (slotLogsSummary as Array<{
          label?: string; slot?: string; provider?: string; attempts?: number;
          success?: boolean; colorCheckPass?: boolean; brandFidelityPass?: boolean;
          brandFidelityScore?: string; shotCompliancePass?: boolean; detectedShot?: string;
          bgCheckPass?: boolean; detectedBackground?: string; bgEnforced?: boolean;
          rejectionReason?: string;
        }>).map((sl, idx) => {
          const slotName  = sl.label ?? sl.slot ?? `Slot ${idx + 1}`
          const prov      = sl.provider ?? provider
          const tries     = sl.attempts ?? 1
          const ok        = sl.success ? '✓' : '✗'
          const color     = sl.colorCheckPass != null ? (sl.colorCheckPass ? 'color:✓' : 'color:✗') : ''
          const brand     = sl.brandFidelityPass != null ? (sl.brandFidelityPass ? 'brand:✓' : `brand:✗(${sl.brandFidelityScore ?? ''})`) : ''
          const shot      = sl.shotCompliancePass != null ? (sl.shotCompliancePass ? 'shot:✓' : `shot:✗(${sl.detectedShot?.slice(0, 40) ?? ''})`) : ''
          const bg        = sl.bgCheckPass != null ? (sl.bgCheckPass ? (sl.bgEnforced ? 'bg:enforced' : 'bg:✓') : `bg:✗(${sl.detectedBackground?.slice(0, 30) ?? ''})`) : ''
          const rejection = sl.rejectionReason ? ` REJECTED:${sl.rejectionReason}` : ''
          const checks    = [color, brand, shot, bg].filter(Boolean).join(' ')
          return `${slotName} → ${prov} / ${tries} attempt${tries > 1 ? 's' : ''} / ${ok}${checks ? ' ' + checks : ''}${rejection}`
        }),
        summary: providerResultsSummary,
        slotLogs: slotLogsSummary,
        identityLock: identityLockMeta,
        mediaUrls,
      }),
      jobTitle: provider === 'gemini-pro'
        ? `${productTitle} — Gemini Pro (${mediaIds.length} görsel)`
        : `${productTitle} — OpenAI Edit (${mediaIds.length} görsel)`,
    }

    try {
      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: { status: 'preview', ...jobUpdateData },
      })
      console.log(`[imageGenTask v14] step9 — job status set to preview`)

      // VF-2: Set product visualStatus = preview when images are ready for operator review
      try {
        const pDoc = await payload.findByID({ collection: 'products', id: productId, depth: 0 }) as Record<string, unknown>
        const wf = (pDoc.workflow ?? {}) as Record<string, unknown>
        await payload.update({
          collection: 'products',
          id: productId,
          data: {
            workflow: {
              workflowStatus: ['draft', 'visual_pending', undefined, null, ''].includes(wf.workflowStatus as string | undefined) ? 'visual_pending' : wf.workflowStatus,
              visualStatus: 'preview',
              confirmationStatus: wf.confirmationStatus,
              contentStatus: wf.contentStatus,
              auditStatus: wf.auditStatus,
              publishStatus: wf.publishStatus,
              productConfirmedAt: wf.productConfirmedAt,
              stockState: wf.stockState,
              sellable: wf.sellable,
              lastHandledByBot: wf.lastHandledByBot,
            },
          },
          context: { isDispatchUpdate: true },
        })
        console.log(`[VF-2] visualStatus updated — product=${productId} visualStatus=preview`)
      } catch (vsErr) {
        const vsMsg = vsErr instanceof Error ? vsErr.message : String(vsErr)
        console.error(`[VF-2] visualStatus preview update FAILED (non-blocking) — product=${productId}: ${vsMsg}`)
      }
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

    // ── Final batch summary log ────────────────────────────────────────────
    const bgEnforcedCount = (slotLogsSummary as Array<{ bgEnforced?: boolean }>).filter((s) => s.bgEnforced).length
    const retryCount = (slotLogsSummary as Array<{ attempts?: number }>).filter((s) => (s.attempts ?? 1) > 1).length
    console.log(
      `[imageGenTask v28] ═══ BATCH COMPLETE ═══ ` +
      `job=${jobId} product=${productId} images=${mediaIds.length} ` +
      `stock=${stockNumber || 'none'} refs=1+${additionalReferenceImages.length} ` +
      `provider=${provider} stage=${stage} ` +
      `retries=${retryCount} bgEnforced=${bgEnforcedCount} ` +
      `slots=[${slotIconArr.join('')}]`,
    )

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
  imageCount: number,
  productTitle: string,
  slotIcons: string,
  mainColor?: string,
  stage: 'standard' | 'premium' = 'standard',
  providerLabel?: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  const colorLine    = mainColor     ? ` · ${mainColor}`  : ''
  const isStandard = stage !== 'premium'
  const stageLabel = isStandard ? '1-3' : '4-5'

  // ── Build per-image individual buttons ──────────────────────────────────
  // Uses 1-based slotsStr format that approveImageGenJob() already handles.
  // Button labels show the real slot number (1-3 for standard, 4-5 for premium).
  const slotOffset = isStandard ? 0 : 3 // premium slots start at 4 in the 5-slot system
  const individualButtons = Array.from({ length: imageCount }, (_, i) => ({
    text: `📷 Görsel ${slotOffset + i + 1}`,
    callback_data: `imgapprove:${jobId}:${i + 1}`,
  }))

  // ── Build 2-image combination buttons (only when 3 images available) ────
  // Combinations: 1+2, 1+3, 2+3 — displayed on a separate row.
  const combinationButtons = imageCount >= 3
    ? [
        { text: '📸 1+2', callback_data: `imgapprove:${jobId}:1,2` },
        { text: '📸 1+3', callback_data: `imgapprove:${jobId}:1,3` },
        { text: '📸 2+3', callback_data: `imgapprove:${jobId}:2,3` },
      ]
    : []

  const stageNote = isStandard
    ? `Tüm görselleri veya istediğinizi seçin:`
    : `İstediğiniz görseli seçin veya tümünü onaylayın:`

  const text =
    `${isStandard ? '📸' : '🌟'} <b>${imageCount} önizleme hazır</b> (${stageLabel}${colorLine})\n\n` +
    `📦 <b>${productTitle}</b>` +
    (slotIcons ? ` ${slotIcons}` : '') +
    `\n\n` +
    stageNote

  // ── Assemble keyboard ────────────────────────────────────────────────────
  const keyboard: Array<Array<{ text: string; callback_data: string }>> = []

  // Row 1: Approve all
  const allLabel = isStandard ? '✅ Tümünü Onayla (1-3)' : '✅ Tümünü Onayla (4-5)'
  keyboard.push([{ text: allLabel, callback_data: `imgapprove:${jobId}:all` }])

  // Row 2: Individual image buttons (up to 3 side by side)
  if (individualButtons.length > 0) {
    keyboard.push(individualButtons)
  }

  // Row 3: 2-image combination buttons (only for 3-image stage)
  if (combinationButtons.length > 0) {
    keyboard.push(combinationButtons)
  }

  // Row 4: Premium upgrade (standard stage only)
  if (isStandard) {
    keyboard.push([{ text: '🌟 4-5 Gemini Pro Üret', callback_data: `imgpremium:${jobId}` }])
  }

  // Last row: Regenerate + Reject
  keyboard.push([
    { text: '🔄 Yeniden Üret', callback_data: `imgregen:${jobId}` },
    { text: '❌ Reddet',       callback_data: `imgreject:${jobId}` },
  ])

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
    // Find ALL existing stockNumbers and compute the max numerically.
    // We cannot rely on sort: '-stockNumber' because Payload/Postgres does
    // text-based sorting (SN9 > SN1000). Instead, fetch all and compute max.
    const { docs } = await payload.find({
      collection: 'products',
      where: {
        stockNumber: { exists: true },
      },
      limit: 0, // fetch all
      depth: 0,
    })

    let maxNum = 0
    for (const doc of docs) {
      const sn = doc.stockNumber as string | undefined
      if (!sn) continue
      const match = sn.match(/^SN(\d+)$/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }

    let nextNum = maxNum + 1

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
// Stock Number Overlay
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Overlay a stock number text on the bottom-right corner of a JPEG buffer.
 * Uses sharp's composite with an SVG text overlay.
 *
 * Produces a small, semi-transparent label that's readable but not intrusive.
 * Returns a new JPEG buffer with the overlay baked in.
 */
// ─────────────────────────────────────────────────────────────────────────────
// Background Consistency Check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether all generated images in a batch share the same background color.
 * Uses Gemini Vision to compare. Fail-open on any error.
 */
async function checkBackgroundConsistency(
  buffers: Buffer[],
  expectedBackground: string,
): Promise<{ consistent: boolean; driftedSlots: number[]; detail?: string }> {
  if (buffers.length < 2) return { consistent: true, driftedSlots: [] }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { consistent: true, driftedSlots: [] }

  try {
    const imageParts = buffers.map((buf) => ({
      inlineData: { mimeType: 'image/jpeg' as const, data: buf.toString('base64') },
    }))

    const prompt =
      'You are a QC inspector for e-commerce product photography.\n' +
      'Intended background for ALL images: ' + expectedBackground + '\n\n' +
      'I am showing you ' + buffers.length + ' product images that should ALL have the EXACT SAME background color.\n' +
      'Compare the background color/tone across all images.\n\n' +
      'Respond in EXACT JSON format only:\n' +
      '{"consistent": true/false, "driftedSlots": [1-based slot numbers that differ], "detail": "brief explanation"}\n' +
      'Mark consistent if all backgrounds look the same color.\n' +
      'Mark inconsistent ONLY if one or more images have a VISIBLY DIFFERENT background color from the others.'

    const model = process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash'
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [...imageParts, { text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
      }),
    })

    if (!res.ok) {
      console.warn('[bgCheck] Gemini API error: ' + res.status)
      return { consistent: true, driftedSlots: [] }
    }

    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) {
      console.warn('[bgCheck] Could not parse response:', text.slice(0, 200))
      return { consistent: true, driftedSlots: [] }
    }

    const result = JSON.parse(jsonMatch[0]) as {
      consistent?: boolean; driftedSlots?: number[]; detail?: string
    }

    console.log('[bgCheck] consistent=' + result.consistent + ' drifted=' + JSON.stringify(result.driftedSlots) + ' detail=' + result.detail)
    return {
      consistent: result.consistent !== false,
      driftedSlots: Array.isArray(result.driftedSlots) ? result.driftedSlots : [],
      detail: result.detail,
    }
  } catch (err) {
    console.warn('[bgCheck] Error:', err instanceof Error ? err.message : err)
    return { consistent: true, driftedSlots: [] }
  }
}

/**
 * 5×7 bitmap pixel font — completely font-independent.
 *
 * v32 FIX: Vercel serverless has NO usable fonts for either Pango text rendering
 * or SVG text (librsvg). Tested: XML markup (v29), plain text + negate (v30),
 * SVG <text> with font-family fallbacks (v31) — all produce tofu/broken boxes.
 *
 * Solution: render characters as SVG <rect> elements from hardcoded 5×7 bitmaps.
 * Each row is a 5-bit number (MSB = leftmost pixel). Zero font dependencies.
 * Covers: 0-9, A-Z (uppercase only), plus fallback '?' for unknown chars.
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
