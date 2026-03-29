/**
 * imageGenTask — Step 24 / Step 25
 *
 * Payload Jobs Queue task for AI product image generation.
 * Registered in payload.config.ts under jobs.tasks.
 *
 * Triggered by: Telegram route when user sends #gorsel command.
 *
 * ─── PRIMARY FLOW (reference image available — Step 25) ────────────────────
 *  1. Fetch ImageGenerationJob record
 *  2. Fetch product details + reference image
 *  3. STEP A — Validate: reject if not a valid shoe/product image
 *  4. STEP B — Identity lock: extract structured product description
 *  5. STEP C — Pipeline A: OpenAI gpt-image-1 image editing (5 slots)
 *     - If Pipeline A fails (0 images) AND reference image exists → FAIL CLEARLY
 *       (do NOT silently fall back to Gemini text-to-image)
 *  6. Save generated Media documents
 *  7. Update ImageGenerationJob → status='review'
 *  8. Send Telegram notification
 *
 * ─── FALLBACK FLOW (no reference image) ────────────────────────────────────
 *  Pipeline B: Gemini Vision describes product → text prompts → generateByMode()
 *  Known limitation: text-to-image cannot guarantee exact product reproduction.
 *  This path is degraded and logged as such.
 *
 * IMPORTANT: Image generation takes 60–120+ seconds for 5 images.
 * Vercel Pro is needed (maxDuration=120 on the job runner endpoint).
 */

import type { TaskConfig } from 'payload'

export const imageGenTask: TaskConfig<{
  input: {
    /** ID of the ImageGenerationJob document */
    jobId: string
  }
  output: {
    success: boolean
    /** Comma-separated media IDs of generated images */
    mediaIds: string
    /** Error description (empty string on success) */
    error: string
  }
}> = {
  slug: 'image-gen',
  label: 'AI Görsel Üretimi',
  retries: 0, // No task-level retry — image gen is expensive; admin re-triggers if needed

  inputSchema: [{ name: 'jobId', type: 'text', required: true }],

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
    const payload = req.payload

    console.log(`[imageGenTask] start — jobId=${jobId}`)

    // ── Step 1: Fetch the job record ────────────────────────────────────────
    let jobDoc: Record<string, unknown>
    try {
      jobDoc = await payload.findByID({
        collection: 'image-generation-jobs',
        id: jobId,
        depth: 1,
      }) as Record<string, unknown>
    } catch {
      const msg = `Job bulunamadı: ${jobId}`
      console.error(`[imageGenTask] ${msg}`)
      throw new Error(msg)
    }

    const mode = (jobDoc.mode as string) || 'hizli'
    const telegramChatId = jobDoc.telegramChatId as string | undefined
    const productRef = jobDoc.product as { id: number } | number | null

    if (!productRef) {
      throw new Error('Job kayıtında ürün referansı eksik')
    }

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

    const productContext: {
      title: string
      category?: string
      brand?: string
      color?: string
      material?: string
      productType?: string
      gender?: string
      visualDescription?: string
    } = {
      title: (productDoc.title as string) || 'Ürün',
      category: productDoc.category as string | undefined,
      brand: productDoc.brand as string | undefined,
      color: productDoc.color as string | undefined,
      material: productDoc.material as string | undefined,
      productType: productDoc.productType as string | undefined,
      gender: productDoc.gender as string | undefined,
    }

    // ── Step 2b: Load reference image ─────────────────────────────────────────
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
        console.warn('[imageGenTask] Direct media fetch by ID failed:', err)
      }
    }

    if (mediaUrl) {
      const fetchUrl = absoluteUrl(mediaUrl)
      console.log(`[imageGenTask] fetching reference image — url=${fetchUrl}`)
      try {
        const imgRes = await fetch(fetchUrl)
        if (imgRes.ok) {
          referenceImage = Buffer.from(await imgRes.arrayBuffer())
          referenceImageMime = mediaMime || 'image/jpeg'
          console.log(
            `[imageGenTask] reference image loaded — size=${referenceImage.length} mime=${referenceImageMime}`,
          )
        } else {
          console.warn(`[imageGenTask] reference image fetch failed (HTTP ${imgRes.status})`)
        }
      } catch (err) {
        console.warn('[imageGenTask] reference image fetch error:', err)
      }
    }

    if (!referenceImage) {
      console.log('[imageGenTask] No reference image — Pipeline B (text-to-image) will be used')
    }

    // ── Step 2c: STEP A — Input Validation ───────────────────────────────────
    // Reject invalid inputs BEFORE any generation attempt.
    // Validation uses Gemini Vision for analysis only (not for image generation).
    // On validation API failure, defaults to valid=true so requests aren't blocked.
    if (referenceImage && process.env.GEMINI_API_KEY) {
      const { validateProductImage } = await import('../lib/imageProviders')
      const validation = await validateProductImage(
        referenceImage,
        referenceImageMime || 'image/jpeg',
        process.env.GEMINI_API_KEY,
      )

      console.log(
        `[imageGenTask] Validation: valid=${validation.valid} ` +
        `confidence=${validation.confidence}` +
        (validation.productClass ? ` class=${validation.productClass}` : '') +
        (validation.rejectionReason ? ` reason=${validation.rejectionReason}` : ''),
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
              confidence: validation.confidence,
              reason: validation.rejectionReason,
            }),
          },
        })

        if (telegramChatId) {
          await sendTelegramNotification(
            telegramChatId,
            `⚠️ <b>Görsel reddedildi</b>\n\n` +
            `Bu fotoğraf bir ayakkabı/ürün görseli olarak tanınamadı` +
            (validation.rejectionReason ? ` (<i>${validation.rejectionReason}</i>)` : '') +
            `.\n\nLütfen net bir ürün fotoğrafı gönderin ve tekrar deneyin.`,
          )
        }

        console.warn(`[imageGenTask] Input rejected — reason=${validation.rejectionReason}`)
        throw new Error(rejectionMsg)
      }

      // Store validated product class in context if detected
      if (validation.productClass) {
        productContext.productType = productContext.productType || validation.productClass
      }
    }

    // ── Step 2d: STEP B — Identity Lock Extraction ───────────────────────────
    // Build a structured product identity block from the reference image.
    // This block is injected into every Pipeline A slot prompt to prevent drift.
    // Falls back to a minimal generic lock if extraction fails.
    let identityLockBlock: string
    let identityLockMeta: Record<string, unknown> = {}

    if (referenceImage && process.env.GEMINI_API_KEY) {
      const { extractIdentityLock } = await import('../lib/imageProviders')
      const lock = await extractIdentityLock(
        referenceImage,
        referenceImageMime || 'image/jpeg',
        process.env.GEMINI_API_KEY,
      )

      if (lock) {
        identityLockBlock = lock.promptBlock
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
        }
        // Use vision-extracted description for Pipeline B fallback as well
        productContext.visualDescription =
          `${lock.productClass}, ${lock.mainColor}, ${lock.material}` +
          (lock.distinctiveFeatures ? `, ${lock.distinctiveFeatures}` : '')
        console.log(`[imageGenTask] Identity lock extracted: ${lock.productClass} | ${lock.mainColor} | ${lock.material}`)
      } else {
        // API failed — use minimal generic fallback lock
        console.warn('[imageGenTask] Identity lock extraction failed — using minimal fallback lock')
        identityLockBlock =
          `╔══ PRODUCT IDENTITY LOCK — MUST NOT BE ALTERED ══╗\n` +
          `PRODUCT CLASS  : the exact shoe shown in the reference photo\n` +
          `╠══ CRITICAL CONSTRAINTS — YOU MUST NEVER ════════╣\n` +
          `• Change product type, color, material, or silhouette\n` +
          `• Add or remove any design features\n` +
          `• Replace with a different shoe\n` +
          `• Invent logos, patterns, or decorative elements\n` +
          `╚═════════════════════════════════════════════════╝\n\n`
        identityLockMeta = { fallback: true }
      }
    } else {
      // No reference image or no API key — minimal lock
      identityLockBlock =
        `╔══ PRODUCT IDENTITY LOCK ══╗\n` +
        `Reproduce the exact product from the reference photo.\n` +
        `Do not change color, material, sole, or design.\n` +
        `╚══════════════════════════╝\n\n`
      identityLockMeta = { fallback: true, noImage: !referenceImage }
    }

    // ── Step 3 & 4: Generate images ──────────────────────────────────────────
    let generatedBuffers: Buffer[] = []
    let providerResultsSummary: unknown[] = []
    let promptSet: Array<{ concept: string; label: string; prompt: string }> = []
    let slotLogsSummary: unknown[] = []

    if (referenceImage) {
      // ── Pipeline A: OpenAI Image Editing (PRIMARY PATH) ──────────────────
      // This is the ONLY generation path when a reference image exists.
      // DO NOT fall through to Pipeline B if this fails.
      console.log('[imageGenTask] Pipeline A — OpenAI gpt-image-1 editing (primary path)')

      const editingConcepts = [
        { concept: 'commerce_front',      label: 'Slot 1 — Ön Stüdyo Hero' },
        { concept: 'side_angle',          label: 'Slot 2 — 90° Yan Profil' },
        { concept: 'detail_closeup',      label: 'Slot 3 — Malzeme Makro Detay' },
        { concept: 'tabletop_editorial',  label: 'Slot 4 — Editoryal Üstten Perspektif' },
        { concept: 'worn_lifestyle',      label: 'Slot 5 — Lifestyle Giyilmiş Bağlam' },
      ]

      promptSet = editingConcepts.map((c) => ({
        ...c,
        prompt: `[EDITING MODE — identity lock: ${identityLockMeta.productClass || 'extracted'}]`,
      }))

      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          promptsUsed: JSON.stringify(
            editingConcepts.map((c) => ({
              ...c,
              mode: 'gpt-image-1-edit',
              identityLock: identityLockMeta,
            })),
          ),
        },
      })

      const { generateByEditing } = await import('../lib/imageProviders')

      let editingFailed = false
      try {
        const { results, buffers, slotLogs } = await generateByEditing(
          referenceImage,
          referenceImageMime || 'image/jpeg',
          identityLockBlock,
        )
        generatedBuffers = buffers
        slotLogsSummary = slotLogs
        providerResultsSummary = results.map((r) => ({
          provider: r.provider,
          success: r.successCount,
          total: r.promptCount,
          errors: r.errors,
        }))

        if (generatedBuffers.length === 0) {
          editingFailed = true
          console.error('[imageGenTask] Pipeline A: 0 images generated')
        } else {
          console.log(`[imageGenTask] Pipeline A: ${generatedBuffers.length} images generated`)
        }
      } catch (err) {
        editingFailed = true
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error('[imageGenTask] Pipeline A error:', errMsg)
        providerResultsSummary = [{ provider: 'gpt-image-edit', error: errMsg }]
      }

      // ── CRITICAL: No silent Gemini fallback when reference image exists ──
      // If Pipeline A fails with a reference image, fail explicitly.
      // The user must know that editing failed — not receive Gemini text-to-image
      // output that won't match the original shoe.
      if (editingFailed) {
        const msg =
          `OpenAI görsel düzenleme başarısız — ${generatedBuffers.length === 0 ? '0 görsel üretildi' : 'hata'}. ` +
          `Ürün fotoğrafını kontrol edip tekrar deneyin.`

        await payload.update({
          collection: 'image-generation-jobs',
          id: jobId,
          data: {
            status: 'failed',
            errorMessage: msg,
            generationCompletedAt: new Date().toISOString(),
            providerResults: JSON.stringify({
              ...providerResultsSummary,
              slotLogs: slotLogsSummary,
              note: 'Pipeline A (OpenAI editing) failed. No Gemini fallback — reference image path requires editing.',
            }),
          },
        })

        if (telegramChatId) {
          await sendTelegramNotification(
            telegramChatId,
            `❌ <b>Görsel üretimi başarısız</b>\n\n` +
            `OpenAI düzenleme motoru görsel üretemedi.\n` +
            `Ürün fotoğrafının net ve tek bir ayakkabıyı gösterdiğinden emin olun, ardından tekrar deneyin: <code>#gorsel</code>`,
          )
        }

        throw new Error(msg)
      }
    }

    // ── Pipeline B: Text-to-image fallback (NO reference image only) ─────────
    // This path only runs when there is literally no reference image on the product.
    // It is a degraded path — the output is NOT guaranteed to match any real product.
    if (generatedBuffers.length === 0) {
      console.log(
        '[imageGenTask] Pipeline B — text-to-image fallback ' +
        '(DEGRADED: no reference image, product identity not guaranteed)',
      )

      const { buildPromptSet } = await import('../lib/imagePromptBuilder')
      const builtPrompts = buildPromptSet(productContext, false)
      const promptTexts = builtPrompts.map((p) => p.prompt)
      promptSet = builtPrompts.map((p) => ({
        concept: p.concept,
        label: p.label,
        prompt: p.prompt,
      }))

      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          promptsUsed: JSON.stringify(
            promptSet.map((p) => ({ ...p, mode: 'text-to-image-fallback' })),
          ),
        },
      })

      const { generateByMode } = await import('../lib/imageProviders')

      try {
        const { results, buffers } = await generateByMode(
          mode as 'hizli' | 'dengeli' | 'premium' | 'karma',
          promptTexts,
        )
        generatedBuffers = buffers
        providerResultsSummary = results.map((r) => ({
          provider: r.provider,
          success: r.successCount,
          total: r.promptCount,
          errors: r.errors,
          note: 'Pipeline B — text-to-image, product identity not guaranteed',
        }))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await payload.update({
          collection: 'image-generation-jobs',
          id: jobId,
          data: {
            status: 'failed',
            errorMessage: `Görsel üretimi başarısız (Pipeline B): ${msg}`,
            generationCompletedAt: new Date().toISOString(),
            providerResults: JSON.stringify({ error: msg }),
          },
        })
        if (telegramChatId) {
          await sendTelegramNotification(
            telegramChatId,
            `❌ Görsel üretimi başarısız (Job: ${jobId})\nHata: ${msg.slice(0, 200)}`,
          )
        }
        throw new Error(msg)
      }
    }

    if (generatedBuffers.length === 0) {
      const msg = 'Hiç görsel üretilemedi — API anahtarları eksik veya tüm istekler başarısız'
      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          status: 'failed',
          errorMessage: msg,
          generationCompletedAt: new Date().toISOString(),
          providerResults: JSON.stringify(providerResultsSummary),
        },
      })
      if (telegramChatId) {
        await sendTelegramNotification(telegramChatId, `❌ ${msg}`)
      }
      throw new Error(msg)
    }

    // ── Step 5: Save each buffer as a Media document ────────────────────────
    const mediaIds: number[] = []
    const productTitle = productContext.title

    for (let i = 0; i < generatedBuffers.length; i++) {
      const buf = generatedBuffers[i]
      const concept = promptSet[i]?.concept || `image-${i}`
      const label = promptSet[i]?.label || `Görsel ${i + 1}`
      const filename = `ai-${productId}-${concept}-${Date.now()}-${i}.jpg`

      try {
        const media = await payload.create({
          collection: 'media',
          data: {
            altText: `${productTitle} — ${label} (AI)`,
            product: productId,
            type: 'enhanced',
          },
          file: {
            data: buf,
            mimetype: 'image/jpeg',
            name: filename,
            size: buf.length,
          },
        })
        mediaIds.push(media.id as number)
        console.log(`[imageGenTask] media saved — id=${media.id} concept=${concept} size=${buf.length}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[imageGenTask] media save failed (${concept}): ${msg}`)
        providerResultsSummary.push({ mediaError: `${concept}: ${msg}` })
      }
    }

    // ── Step 6: Update job to 'review' ──────────────────────────────────────
    await payload.update({
      collection: 'image-generation-jobs',
      id: jobId,
      data: {
        status: 'review',
        generatedImages: mediaIds,
        imageCount: mediaIds.length,
        generationCompletedAt: new Date().toISOString(),
        providerResults: JSON.stringify({
          summary: providerResultsSummary,
          slotLogs: slotLogsSummary,
          identityLock: identityLockMeta,
        }),
        jobTitle: `${productTitle} — ${modeLabelTr(mode)} (${mediaIds.length} görsel)`,
      },
    })

    // ── Step 7: Telegram notification ───────────────────────────────────────
    if (telegramChatId) {
      const adminUrl = `https://www.uygunayakkabi.com/admin/collections/image-generation-jobs/${jobId}`
      const slotStatus = (slotLogsSummary as Array<{ success?: boolean; slot?: string }>)
        .map((s) => (s.success ? '✅' : '❌'))
        .join('')
      await sendTelegramNotification(
        telegramChatId,
        `🎨 <b>${mediaIds.length} görsel hazır!</b>\n\n` +
        `📦 Ürün: <b>${productTitle}</b>\n` +
        `🔧 Mod: ${modeLabelTr(mode)}\n` +
        (slotStatus ? `🎯 Slotlar: ${slotStatus}\n` : '') +
        `\nAdmin panelinde görselleri inceleyip ürüne ekleyebilirsiniz:\n` +
        `🔗 <a href="${adminUrl}">Görselleri incele</a>`,
      )
    }

    console.log(
      `[imageGenTask] success — jobId=${jobId} product=${productId} images=${mediaIds.length}`,
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

function modeLabelTr(mode: string): string {
  const labels: Record<string, string> = {
    hizli: '⚡ Hızlı (Gemini Flash)',
    dengeli: '⚖️ Dengeli (GPT Image)',
    premium: '💎 Premium (Gemini Pro)',
    karma: '🌈 Karma',
  }
  return labels[mode] ?? mode
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
