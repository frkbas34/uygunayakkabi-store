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

    // ── Step 2b: Load reference image ────────────────────────────────────────
    let referenceImage: Buffer | undefined
    let referenceImageMime: string | undefined

    const siteBase =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

    function absoluteUrl(url: string): string {
      if (url.startsWith('http')) return url
      if (siteBase) return `${siteBase}${url}`
      return url
    }

    const imagesArr = productDoc.images as
      | Array<{ image: { url?: string; mimeType?: string } | number }>
      | undefined
    const firstImageItem = imagesArr?.[0]?.image

    let mediaUrl: string | undefined
    let mediaMime: string | undefined

    if (typeof firstImageItem === 'object' && firstImageItem?.url) {
      mediaUrl = firstImageItem.url
      mediaMime = firstImageItem.mimeType
    } else if (typeof firstImageItem === 'number') {
      try {
        const mediaDoc = await payload.findByID({
          collection: 'media',
          id: firstImageItem,
          depth: 0,
        }) as Record<string, unknown>
        mediaUrl = mediaDoc.url as string | undefined
        mediaMime = mediaDoc.mimeType as string | undefined
      } catch (err) {
        console.warn('[imageGenTask] media fetch by ID failed:', err)
      }
    }

    if (mediaUrl) {
      const fetchUrl = absoluteUrl(mediaUrl)
      console.log(`[imageGenTask v14] fetching reference image — ${fetchUrl}`)
      try {
        const imgRes = await fetch(fetchUrl)
        if (imgRes.ok) {
          referenceImage = Buffer.from(await imgRes.arrayBuffer())
          referenceImageMime = mediaMime || 'image/jpeg'
          console.log(`[imageGenTask v14] reference loaded — ${referenceImage.length}b ${referenceImageMime}`)
        } else {
          console.warn(`[imageGenTask v14] reference fetch failed HTTP ${imgRes.status}`)
        }
      } catch (err) {
        console.warn('[imageGenTask v14] reference fetch error:', err)
      }
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
    const ALL_SLOT_NAMES  = ['commerce_front', 'side_angle', 'detail_closeup', 'tabletop_editorial', 'worn_lifestyle']
    const ALL_SLOT_LABELS = ['Slot 1 — Ön Hero', 'Slot 2 — Yan Profil', 'Slot 3 — Makro', 'Slot 4 — Editoryal', 'Slot 5 — Lifestyle']
    const slotNames  = sceneIndices.map((i) => ALL_SLOT_NAMES[i])
    const slotLabels = sceneIndices.map((i) => ALL_SLOT_LABELS[i])

    const pipelineLabel = provider === 'gemini-pro'
      ? `gemini-pro-image-v14:${process.env.GEMINI_IMAGE_GEN_MODEL || 'gemini-2.0-flash-preview-image-generation'}`
      : 'openai-edit-only-v12'

    // Human-readable provider label for Telegram captions and keyboard
    const providerDisplayLabel = provider === 'gemini-pro'
      ? `✨ Gemini Pro ${process.env.GEMINI_IMAGE_GEN_MODEL || 'gemini-2.0-flash-preview-image-generation'}`
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
    const slotIconArr: string[] = (slotLogsSummary as Array<{ success?: boolean; colorCheckPass?: boolean; brandFidelityPass?: boolean }>)
      .map((s) => {
        if (s.success === false) return '❌'
        if (s.colorCheckPass === false || s.brandFidelityPass === false) return '⚠️'
        return '✅'
      })
    // Joined string for approval keyboard summary only
    const slotIconsJoined = slotIconArr.join('')

    // ── Step 8: Send preview images to Telegram FIRST ────────────────────────
    // CRITICAL ORDER: photos go to Telegram BEFORE the DB status update.
    // If the DB update fails (e.g. enum not migrated), photos are already
    // delivered. Swapping this order was the root cause of v10/v10.1 failures.
    if (telegramChatId) {
      // Diagnostic text: confirms Step 8 was reached in Vercel logs + Telegram
      await sendTelegramNotification(
        telegramChatId,
        `🔄 <b>${mediaIds.length} görsel üretildi</b> — Telegram'a gönderiliyor...`,
      )

      console.log(
        `[imageGenTask v14] step8 — sending ${generatedBuffers.length} photos to chatId=${telegramChatId}` +
        ` mediaIds=${mediaIds.join(',')} bufSizes=${generatedBuffers.map((b) => b?.length ?? 'null').join(',')}`,
      )

      for (let i = 0; i < generatedBuffers.length; i++) {
        const buf = generatedBuffers[i]
        if (!buf || buf.length === 0) {
          console.warn(`[imageGenTask v14] step8 — skipping slot ${i + 1}: buffer missing or empty`)
          continue
        }
        const slotLabel = slotLabels[i] || `Görsel ${i + 1}`
        const slotIcon = slotIconArr[i] || '✅'
        const filename = `${slotNames[i] || `slot-${i}`}.jpg`
        const caption = `${slotIcon} <b>${slotLabel}</b> — ${providerDisplayLabel}`

        console.log(`[imageGenTask v14] step8 — sendPhoto slot ${i + 1} buf=${buf.length}b file=${filename}`)
        await sendTelegramPhotoBuffer(telegramChatId, buf, caption, filename)
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
        provider,                // v14: actual provider used
        mode: `${mode} (cosmetic)`,
        humanSummary: (slotLogsSummary as Array<{
          label?: string; slot?: string; provider?: string; attempts?: number;
          success?: boolean; colorCheckPass?: boolean; brandFidelityPass?: boolean;
          brandFidelityScore?: string; rejectionReason?: string;
        }>).map((sl, idx) => {
          const slotName  = sl.label ?? sl.slot ?? `Slot ${idx + 1}`
          const prov      = sl.provider ?? provider
          const tries     = sl.attempts ?? 1
          const ok        = sl.success ? '✓' : '✗'
          const color     = sl.colorCheckPass != null ? (sl.colorCheckPass ? 'color:✓' : 'color:✗') : ''
          const brand     = sl.brandFidelityPass != null ? (sl.brandFidelityPass ? 'brand:✓' : `brand:✗(${sl.brandFidelityScore ?? ''})`) : ''
          const rejection = sl.rejectionReason ? ` REJECTED:${sl.rejectionReason}` : ''
          const checks    = [color, brand].filter(Boolean).join(' ')
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
 * Send the stage-appropriate approval inline keyboard to Telegram after preview images.
 *
 * Stage 1 "standard" (slots 1-3) keyboard:
 *   Row 1: ✅ Tümünü Onayla (1-3)
 *   Row 2: 🌟 4-5 Gemini Pro Üret
 *   Row 3: 🔄 Yeniden Üret  |  ❌ Reddet
 *
 * Stage 2 "premium" (slots 4-5) keyboard:
 *   Row 1: ✅ Tümünü Onayla (4-5)
 *   Row 2: 🔄 Yeniden Üret (4-5)  |  ❌ Reddet
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

  const colorLine    = mainColor     ? `\n🎨 Renk kilidi: <b>${mainColor}</b>`  : ''
  const providerLine = providerLabel ? `\n🤖 Provider: <b>${providerLabel}</b>` : ''
  const isStandard = stage !== 'premium'
  const stageLabel = isStandard ? 'Slot 1-3' : 'Slot 4-5'
  const stageNote  = isStandard
    ? `Tümünü onaylamak için <b>✅ Tümünü Onayla (1-3)</b> butonuna basın.\n` +
      `Belirli slotları onaylamak için yazın: <code>onayla 1,2,3</code>\n` +
      `Slot 4-5 Gemini Pro görseller için <b>🌟 4-5 Gemini Pro Üret</b> butonuna basın.`
    : `Tümünü onaylamak için <b>✅ Tümünü Onayla (4-5)</b> butonuna basın.\n` +
      `İptal için <b>❌ Reddet</b> butonuna basın.`

  const text =
    `${isStandard ? '📸' : '🌟'} <b>${imageCount} önizleme hazır (${stageLabel}) — onay bekleniyor</b>\n\n` +
    `📦 <b>${productTitle}</b>` +
    colorLine +
    providerLine +
    (slotIcons ? `\n🎯 Slotlar: ${slotIcons}` : '') +
    `\n\n` +
    stageNote

  const keyboard = isStandard
    ? [
        [{ text: '✅ Tümünü Onayla (1-3)', callback_data: `imgapprove:${jobId}:all` }],
        [{ text: '🌟 4-5 Gemini Pro Üret', callback_data: `imgpremium:${jobId}` }],
        [
          { text: '🔄 Yeniden Üret', callback_data: `imgregen:${jobId}` },
          { text: '❌ Reddet',       callback_data: `imgreject:${jobId}` },
        ],
      ]
    : [
        [{ text: '✅ Tümünü Onayla (4-5)',  callback_data: `imgapprove:${jobId}:all` }],
        [
          { text: '🔄 Yeniden Üret (4-5)', callback_data: `imgregen:${jobId}` },
          { text: '❌ Reddet',              callback_data: `imgreject:${jobId}` },
        ],
      ]

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
