/**
 * imageGenTask — Step 25 v10
 *
 * Payload Jobs Queue task for AI product image generation.
 * Triggered by Telegram #gorsel command.
 *
 * UNIFIED PIPELINE — ALL modes (#gorsel, #hizli, #dengeli, #premium) route here:
 *
 *  1. Fetch ImageGenerationJob record
 *  2. Fetch product details + reference image
 *  3. REQUIRE reference image — if none, fail immediately
 *  4. Step A: Validate input (reject non-shoe images)
 *  5. Step B: Extract structured identity lock (10 fields + reference angle)
 *  6. Step C: Generate 5 slots via OpenAI gpt-image-1 editing ONLY
 *  7. Step D: Per-slot color check — reject color-drifted outputs
 *  8. Save generated Media documents (type='enhanced', NOT yet attached to product)
 *  9. Send each image as a Telegram photo for operator preview
 * 10. Send approval keyboard to Telegram (✅ Onayla / 🔄 Yeniden Üret / ❌ Reddet)
 * 11. Update job → status='preview' (awaiting Telegram approval)
 *
 * NO PIPELINE B. NO GEMINI GENERATION. NO TEXT-TO-IMAGE FALLBACK.
 * If Pipeline A fails → explicit failure. Mode tag is cosmetic only.
 *
 * v10 PREVIEW FLOW: images are NOT attached to product until operator
 * explicitly approves via Telegram. See route.ts for approval handlers.
 */

import type { TaskConfig } from 'payload'

export const imageGenTask: TaskConfig<{
  input: { jobId: string }
  output: {
    success: boolean
    mediaIds: string
    error: string
  }
}> = {
  slug: 'image-gen',
  label: 'AI Görsel Üretimi',
  retries: 0,

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

    console.log(`[imageGenTask v9] start — jobId=${jobId}`)

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
      console.log(`[imageGenTask v9] fetching reference image — ${fetchUrl}`)
      try {
        const imgRes = await fetch(fetchUrl)
        if (imgRes.ok) {
          referenceImage = Buffer.from(await imgRes.arrayBuffer())
          referenceImageMime = mediaMime || 'image/jpeg'
          console.log(`[imageGenTask v9] reference loaded — ${referenceImage.length}b ${referenceImageMime}`)
        } else {
          console.warn(`[imageGenTask v9] reference fetch failed HTTP ${imgRes.status}`)
        }
      } catch (err) {
        console.warn('[imageGenTask v9] reference fetch error:', err)
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
        `[imageGenTask v9] validation: valid=${validation.valid} ` +
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
    const { extractIdentityLock, generateByEditing } = await import('../lib/imageProviders')
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
        }
        console.log(`[imageGenTask v9] identity: ${lock.productClass} | ${lock.mainColor} | ${lock.material} | angle=${lock.referenceAngle}`)
      } else {
        console.warn('[imageGenTask v9] identity extraction failed — using fallback')
        identityLock = buildFallbackLock()
        identityLockMeta = { fallback: true }
      }
    } else {
      console.warn('[imageGenTask v9] no GEMINI_API_KEY — using fallback identity lock')
      identityLock = buildFallbackLock()
      identityLockMeta = { fallback: true, noGemini: true }
    }

    // ── Step 6: STEP C — OpenAI Editing (THE ONLY generation path) ──────────
    console.log(`[imageGenTask v9] generating — mode=${mode} (cosmetic, all modes use OpenAI editing)`)

    await payload.update({
      collection: 'image-generation-jobs',
      id: jobId,
      data: {
        promptsUsed: JSON.stringify({
          pipeline: 'openai-edit-only-v9',
          mode: `${mode} (cosmetic)`,
          identityLock: identityLockMeta,
          slots: ['commerce_front', 'side_angle', 'detail_closeup', 'tabletop_editorial', 'worn_lifestyle'],
        }),
      },
    })

    let generatedBuffers: Buffer[] = []
    let providerResultsSummary: unknown[] = []
    let slotLogsSummary: unknown[] = []

    try {
      const { results, buffers, slotLogs } = await generateByEditing(
        referenceImage,
        referenceImageMime || 'image/jpeg',
        identityLock,
      )
      generatedBuffers = buffers
      slotLogsSummary = slotLogs
      providerResultsSummary = results.map((r) => ({
        provider: r.provider,
        success: r.successCount,
        total: r.promptCount,
        errors: r.errors,
      }))

      console.log(`[imageGenTask v9] generated ${generatedBuffers.length} images`)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[imageGenTask v9] generation error:', errMsg)
      providerResultsSummary = [{ provider: 'gpt-image-edit', error: errMsg }]
    }

    if (generatedBuffers.length === 0) {
      const msg = 'OpenAI görsel düzenleme başarısız — 0 görsel üretildi. Ürün fotoğrafını kontrol edip tekrar deneyin.'

      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          status: 'failed',
          errorMessage: msg,
          generationCompletedAt: new Date().toISOString(),
          providerResults: JSON.stringify({
            summary: providerResultsSummary,
            slotLogs: slotLogsSummary,
          }),
        },
      })

      if (telegramChatId) {
        await sendTelegramNotification(
          telegramChatId,
          `❌ <b>Görsel üretimi başarısız</b>\n\n` +
          `OpenAI motoru görsel üretemedi. Fotoğrafın net ve tek bir ayakkabıyı gösterdiğinden emin olun.\n` +
          `Tekrar deneyin: <code>#gorsel</code>`,
        )
      }

      throw new Error(msg)
    }

    // ── Step 7: Save each buffer as a Media document ────────────────────────
    // Images are saved as type='enhanced' but NOT yet attached to the product.
    // They will be attached only after operator approval via Telegram.
    const slotNames = ['commerce_front', 'side_angle', 'detail_closeup', 'tabletop_editorial', 'worn_lifestyle']
    const slotLabels = ['Slot 1 — Ön Hero', 'Slot 2 — Yan Profil', 'Slot 3 — Makro', 'Slot 4 — Editoryal', 'Slot 5 — Lifestyle']
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
        mediaUrls.push((media.url as string) || '')
        console.log(`[imageGenTask v10] saved media=${media.id} ${concept} ${buf.length}b url=${media.url}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[imageGenTask v10] media save failed (${concept}): ${msg}`)
        mediaUrls.push('') // keep index alignment
      }
    }

    // ── Build slot icons string for summaries ────────────────────────────────
    const slotIcons = (slotLogsSummary as Array<{ success?: boolean; colorCheckPass?: boolean }>)
      .map((s) => {
        if (!s.success) return '❌'
        if (s.colorCheckPass === false) return '⚠️'
        return '✅'
      })
      .join('')

    // ── Step 8: Update job to 'preview' (images saved, awaiting TG approval) ─
    await payload.update({
      collection: 'image-generation-jobs',
      id: jobId,
      data: {
        status: 'preview',
        generatedImages: mediaIds,
        imageCount: mediaIds.length,
        generationCompletedAt: new Date().toISOString(),
        providerResults: JSON.stringify({
          pipeline: 'openai-edit-only-v10',
          mode: `${mode} (cosmetic)`,
          summary: providerResultsSummary,
          slotLogs: slotLogsSummary,
          identityLock: identityLockMeta,
          mediaUrls,
        }),
        jobTitle: `${productTitle} — OpenAI Edit (${mediaIds.length} görsel)`,
      },
    })

    // ── Step 9: Send preview images to Telegram ──────────────────────────────
    if (telegramChatId) {
      // Send each generated image as a separate Telegram photo
      for (let i = 0; i < mediaUrls.length; i++) {
        const url = mediaUrls[i]
        if (!url) continue
        const slotLabel = slotLabels[i] || `Görsel ${i + 1}`
        const slotIcon = slotIcons[i] || '✅'
        await sendTelegramPhoto(
          telegramChatId,
          url,
          `${slotIcon} <b>${slotLabel}</b>`,
        )
      }

      // ── Step 10: Send approval keyboard ────────────────────────────────────
      await sendApprovalKeyboard(
        telegramChatId,
        jobId,
        mediaIds.length,
        productTitle,
        slotIcons,
        identityLockMeta.mainColor as string | undefined,
      )
    }

    console.log(`[imageGenTask v10] done — jobId=${jobId} product=${productId} images=${mediaIds.length} status=preview`)

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
      `═══ PRODUCT IDENTITY LOCK ═══\n` +
      `Reproduce the EXACT shoe shown in the reference photo.\n` +
      `NEVER change color, material, silhouette, sole, or design.\n` +
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
 * Send a single image to Telegram as a photo message.
 * photoUrl must be a publicly accessible HTTPS URL (Vercel Blob URL).
 */
async function sendTelegramPhoto(chatId: string, photoUrl: string, caption: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: 'HTML',
      }),
    })
  } catch (err) {
    console.error(`[imageGenTask] sendTelegramPhoto failed (${photoUrl}):`, err)
  }
}

/**
 * Send the approval inline keyboard to Telegram after preview images.
 * Buttons:
 *   Row 1: ✅ Tümünü Onayla
 *   Row 2: 🔄 Yeniden Üret  |  ❌ Reddet
 *
 * callback_data formats (handled in route.ts):
 *   imgapprove:{jobId}:all   — approve all generated images
 *   imgregen:{jobId}         — discard + regenerate all 5 slots
 *   imgreject:{jobId}        — reject, discard temp media
 *
 * Text commands also accepted in route.ts:
 *   onayla / approve            → approve all
 *   onayla 1,2,4 / approve 1,3 → approve specific slots (1-based)
 *   reddet / reject / cancel    → reject
 *   yeniden üret / regenerate   → regenerate
 */
async function sendApprovalKeyboard(
  chatId: string,
  jobId: string,
  imageCount: number,
  productTitle: string,
  slotIcons: string,
  mainColor?: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  const colorLine = mainColor ? `\n🎨 Renk kilidi: <b>${mainColor}</b>` : ''
  const text =
    `🎨 <b>${imageCount} önizleme hazır — onay bekleniyor</b>\n\n` +
    `📦 <b>${productTitle}</b>` +
    colorLine +
    (slotIcons ? `\n🎯 Slotlar: ${slotIcons}` : '') +
    `\n\n` +
    `Tümünü onaylamak için <b>✅ Tümünü Onayla</b> butonuna basın.\n` +
    `Belirli slotları onaylamak için yazın: <code>onayla 1,2,4</code>\n` +
    `İptal için <b>❌ Reddet</b> butonuna basın.`

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Tümünü Onayla', callback_data: `imgapprove:${jobId}:all` },
            ],
            [
              { text: '🔄 Yeniden Üret', callback_data: `imgregen:${jobId}` },
              { text: '❌ Reddet', callback_data: `imgreject:${jobId}` },
            ],
          ],
        },
      }),
    })
  } catch (err) {
    console.error('[imageGenTask] sendApprovalKeyboard failed:', err)
  }
}
