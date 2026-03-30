/**
 * lumaGenTask — Step 26 / Phase 1 (studio_angles)
 *
 * Payload Jobs Queue task for Luma AI product image generation.
 * Triggered from Telegram via #luma command.
 *
 * PIPELINE:
 *   1. Fetch ImageGenerationJob record + product
 *   2. Resolve source image public URLs (product.images[0..3])
 *   3. Submit 3 Luma generations in parallel (studio_front, studio_side, studio_quarter)
 *   4. Poll until all complete or 2-minute timeout
 *   5. Download each completed image
 *   6. Save as Media documents (type='generated')
 *   7. Send Telegram preview photos
 *   8. Send approval keyboard
 *   9. Update job → status='preview'
 *
 * OUTPUT LANE (v13 dual-track):
 *   Generated images saved with type='generated'.
 *   On approval → written to product.generativeGallery (NOT product.images).
 *   product.images (website-safe originals) is NEVER touched by this task.
 *
 * APPROVAL FLOW:
 *   Reuses existing imgapprove / imgreject / imgregen callbacks from route.ts.
 *   The regen callback detects provider='luma' in promptsUsed and re-queues this task.
 */

import type { TaskConfig } from 'payload'
import {
  submitLumaGen,
  pollLumaGens,
  downloadLumaImage,
  type LumaGenResponse,
} from '../lib/lumaApi'
import {
  STUDIO_ANGLE_SLOTS,
  LUMA_DEFAULT_MODEL,
  LUMA_HQ_MODEL,
  LUMA_POLL_TIMEOUT_MS,
  LUMA_MAX_SOURCE_IMAGES,
  buildIdentityContext,
} from '../lib/lumaPrompts'

// ─────────────────────────────────────────────────────────────────────────────
// Task config
// ─────────────────────────────────────────────────────────────────────────────

export const lumaGenTask: TaskConfig<{
  input: { jobId: string; hq?: boolean }
  output: { success: boolean; mediaIds: string; error: string }
}> = {
  slug: 'luma-gen',
  label: 'Luma AI Görsel Üretimi',
  retries: 0,

  inputSchema: [
    { name: 'jobId', type: 'text', required: true },
    { name: 'hq', type: 'checkbox' },  // true → use photon-1 (HQ rerun)
  ],

  outputSchema: [
    { name: 'success', type: 'checkbox' },
    { name: 'mediaIds', type: 'text' },
    { name: 'error', type: 'text' },
  ],

  // ── onFail: mark job as failed in DB ────────────────────────────────────────
  onFail: async ({ job, req }) => {
    const jobId = (
      (job.taskStatus?.['luma-gen'] as Record<string, unknown> | undefined)
        ?.input as Record<string, unknown> | undefined
    )?.jobId as string | undefined

    if (!jobId) return

    try {
      await req.payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          status: 'failed',
          errorMessage: 'Luma görsel üretimi başarısız — Payload Jobs kaydını kontrol edin',
          generationCompletedAt: new Date().toISOString(),
        },
      })
    } catch (err) {
      console.error('[lumaGenTask] onFail cleanup error:', err)
    }
  },

  // ── handler ─────────────────────────────────────────────────────────────────
  handler: async ({ input, req }) => {
    const { jobId, hq = false } = input
    const payload = req.payload

    const lumaApiKey = process.env.LUMA_API_KEY
    if (!lumaApiKey) throw new Error('LUMA_API_KEY is not configured')

    const model = hq ? LUMA_HQ_MODEL : LUMA_DEFAULT_MODEL
    const serverUrl =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')

    console.log(`[lumaGenTask] start — jobId=${jobId} model=${model} hq=${hq}`)

    // ── Step 1: Fetch job record ─────────────────────────────────────────────
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

    const telegramChatId = jobDoc.telegramChatId as string | undefined
    const productRef = jobDoc.product as { id: number } | number | null
    if (!productRef) throw new Error('Job kayıtında ürün referansı eksik')
    const productId = typeof productRef === 'object' ? productRef.id : productRef

    // Mark generating
    await payload.update({
      collection: 'image-generation-jobs',
      id: jobId,
      data: { status: 'generating', generationStartedAt: new Date().toISOString() },
    })

    // ── Step 2: Fetch product ────────────────────────────────────────────────
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
    const identityCtx = buildIdentityContext(productDoc)

    // ── Step 3: Resolve source image public URLs ─────────────────────────────
    // Reads product.images[0..LUMA_MAX_SOURCE_IMAGES-1] → public URLs
    const imagesArr = productDoc.images as
      | Array<{ image: { url?: string } | number }>
      | undefined

    const sourceUrls: string[] = []

    for (const item of (imagesArr || []).slice(0, LUMA_MAX_SOURCE_IMAGES)) {
      let url: string | undefined

      if (typeof item.image === 'object' && item.image?.url) {
        url = item.image.url
      } else if (typeof item.image === 'number') {
        try {
          const mediaDoc = await payload.findByID({
            collection: 'media',
            id: item.image,
            depth: 0,
          }) as Record<string, unknown>
          url = mediaDoc.url as string | undefined
        } catch (e) {
          console.warn('[lumaGenTask] media fetch by ID failed:', e)
        }
      }

      if (url) {
        // Make absolute
        const absUrl = url.startsWith('http') ? url : `${serverUrl}${url}`
        sourceUrls.push(absUrl)
      }
    }

    if (sourceUrls.length === 0) {
      const msg =
        'Ürün fotoğrafı bulunamadı — Luma üretimi için ürüne en az bir fotoğraf eklenmeli. ' +
        'Önce Telegram\'dan fotoğraf gönderin, ardından #luma komutunu kullanın.'

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
        await lumaNotify(
          telegramChatId,
          `❌ <b>Luma görsel üretimi başarısız</b>\n\nÜrün fotoğrafı bulunamadı. ` +
          `Önce bir ürün fotoğrafı gönderin, ardından <code>#luma</code> komutunu kullanın.`,
        )
      }

      throw new Error(msg)
    }

    console.log(`[lumaGenTask] source images: ${sourceUrls.length} URLs`)

    // ── Step 4: Build image refs (first image at high weight, extras at lower) ─
    const imageRefs = sourceUrls.map((url, i) => ({
      url,
      weight: i === 0 ? 0.88 : 0.75,  // primary reference strongest
    }))

    // Callback URL for Luma to POST on state changes
    // Luma will POST the full generation object to this URL
    const callbackBase = serverUrl.startsWith('http')
      ? serverUrl
      : 'https://uygunayakkabi.com'  // fallback — override via NEXT_PUBLIC_SERVER_URL
    const callbackUrl = `${callbackBase}/api/luma/callback?jobId=${jobId}`

    // Store promptsUsed before generation (for regen recovery)
    const promptsUsedMeta = {
      pipeline: `luma-studio-angles-v1:${model}`,
      provider: 'luma',
      requestType: 'studio_angles',
      model,
      hq,
      sourceImageCount: sourceUrls.length,
      identity: identityCtx,
      slots: STUDIO_ANGLE_SLOTS.map((s) => s.name),
    }

    await payload.update({
      collection: 'image-generation-jobs',
      id: jobId,
      data: { promptsUsed: JSON.stringify(promptsUsedMeta) },
    })

    // ── Step 5: Submit all 3 Luma generations ───────────────────────────────
    const submittedIds: string[] = []
    const submissionErrors: string[] = []

    for (const slot of STUDIO_ANGLE_SLOTS) {
      const prompt = slot.buildPrompt(identityCtx)

      console.log(`[lumaGenTask] submitting slot=${slot.name} model=${model} refs=${imageRefs.length}`)

      try {
        const gen = await submitLumaGen(
          {
            model,
            prompt,
            aspect_ratio: slot.aspectRatio,
            image_ref: imageRefs,
            callback_url: callbackUrl,
          },
          lumaApiKey,
        )
        submittedIds.push(gen.id)
        console.log(`[lumaGenTask] submitted ${slot.name} → lumaId=${gen.id} state=${gen.state}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[lumaGenTask] submit error for ${slot.name}:`, msg)
        submissionErrors.push(`${slot.name}: ${msg}`)
      }
    }

    if (submittedIds.length === 0) {
      const msg = `Luma API'ye istek gönderilemedi: ${submissionErrors.join('; ')}`
      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          status: 'failed',
          errorMessage: msg,
          generationCompletedAt: new Date().toISOString(),
          providerResults: JSON.stringify({ errors: submissionErrors }),
        },
      })
      if (telegramChatId) {
        await lumaNotify(telegramChatId, `❌ <b>Luma bağlantı hatası</b>\n\n${submissionErrors[0] || 'Bilinmeyen hata'}`)
      }
      throw new Error(msg)
    }

    // Store Luma generation IDs for audit + callback matching
    await payload.update({
      collection: 'image-generation-jobs',
      id: jobId,
      data: { lumaGenerationIds: JSON.stringify(submittedIds) },
    })

    if (telegramChatId) {
      await lumaNotify(
        telegramChatId,
        `🎨 <b>Luma üretim başladı</b>\n\n📦 <b>${productTitle}</b>\n` +
        `⚙️ Model: ${model}\n🖼️ ${submittedIds.length} stüdyo açısı üretiliyor...\n` +
        `<i>Tamamlanınca Telegram'a önizleme gönderilecek.</i>`,
      )
    }

    // ── Step 6: Poll until all complete or timeout ───────────────────────────
    console.log(`[lumaGenTask] polling ${submittedIds.length} generations (timeout=${LUMA_POLL_TIMEOUT_MS}ms)`)
    const genResults = await pollLumaGens(submittedIds, lumaApiKey, {
      intervalMs: 4000,
      maxWaitMs: LUMA_POLL_TIMEOUT_MS,
    })

    // ── Step 7: Download outputs + save as Media docs ────────────────────────
    const mediaIds: number[] = []
    const mediaUrls: string[] = []
    const slotLogs: Array<{
      slot: string
      lumaId: string
      state: string
      success: boolean
      outputSizeBytes?: number
      failureReason?: string | null
    }> = []

    // Align results back to slot order
    for (let i = 0; i < submittedIds.length; i++) {
      const lumaId = submittedIds[i]
      const slot = STUDIO_ANGLE_SLOTS[i]
      const gen: LumaGenResponse | undefined = genResults.get(lumaId)

      const slotLog = {
        slot: slot?.name ?? `slot-${i}`,
        lumaId,
        state: gen?.state ?? 'unknown',
        success: false,
        outputSizeBytes: undefined as number | undefined,
        failureReason: gen?.failure_reason ?? null,
      }

      if (!gen || gen.state !== 'completed' || !gen.assets?.image) {
        console.warn(`[lumaGenTask] slot ${slot?.name} failed: state=${gen?.state} reason=${gen?.failure_reason}`)
        slotLogs.push(slotLog)
        mediaUrls.push('')
        continue
      }

      // Download the generated image
      let buf: Buffer | null = null
      try {
        buf = await downloadLumaImage(gen.assets.image)
        console.log(`[lumaGenTask] downloaded ${slot?.name}: ${buf.length}b`)
      } catch (err) {
        console.error(`[lumaGenTask] download failed for ${slot?.name}:`, err instanceof Error ? err.message : err)
        slotLogs.push(slotLog)
        mediaUrls.push('')
        continue
      }

      // Save as Media document (type='generated', not attached to product yet)
      const filename = `luma-${productId}-${slot?.name ?? `slot-${i}`}-${Date.now()}.jpg`
      try {
        const media = await payload.create({
          collection: 'media',
          data: {
            altText: `${productTitle} — ${slot?.label ?? `Slot ${i + 1}`} (Luma AI)`,
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
        slotLog.success = true
        slotLog.outputSizeBytes = buf.length
        console.log(`[lumaGenTask] saved media=${media.id} ${slot?.name} url=${media.url}`)
      } catch (err) {
        console.error(`[lumaGenTask] media save failed (${slot?.name}):`, err instanceof Error ? err.message : err)
        mediaUrls.push('')
      }

      slotLogs.push(slotLog)
    }

    const successCount = mediaIds.length

    if (successCount === 0) {
      const msg = `Luma ${submittedIds.length} üretim denendi ama sıfır görsel tamamlandı. Loglara bakın.`
      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          status: 'failed',
          errorMessage: msg,
          generationCompletedAt: new Date().toISOString(),
          providerResults: JSON.stringify({ model, slotLogs }),
        },
      })
      if (telegramChatId) {
        await lumaNotify(
          telegramChatId,
          `❌ <b>Luma görsel üretimi başarısız</b> (${model})\n\n` +
          `Sıfır görsel tamamlandı. Fotoğrafın net ve erişilebilir olduğundan emin olun.\n` +
          `Tekrar deneyin: <code>#luma</code>`,
        )
      }
      throw new Error(msg)
    }

    // ── Step 8: Send Telegram preview photos ────────────────────────────────
    if (telegramChatId) {
      await lumaNotify(
        telegramChatId,
        `🔄 <b>${successCount} Luma görseli hazır</b> — Telegram'a gönderiliyor...`,
      )

      for (let i = 0; i < slotLogs.length; i++) {
        const log = slotLogs[i]
        if (!log.success) continue

        const slot = STUDIO_ANGLE_SLOTS[i]
        const mediaIndex = mediaIds.indexOf(mediaIds.filter((_, idx) => slotLogs[idx]?.success)[
          mediaIds.filter((_, idx) => slotLogs[idx]?.success).indexOf(mediaIds[i] ?? -1)
        ] ?? -1)

        // Re-download for Telegram send (simpler than storing buffers in memory across loops)
        const lumaId = submittedIds[i]
        const gen = genResults.get(lumaId)
        if (!gen?.assets?.image) continue

        let buf: Buffer | null = null
        try {
          buf = await downloadLumaImage(gen.assets.image)
        } catch (err) {
          console.warn(`[lumaGenTask] re-download for Telegram failed (${log.slot}):`, err instanceof Error ? err.message : err)
          continue
        }

        const caption = `✅ <b>${slot?.label ?? `Slot ${i + 1}`}</b>`
        await lumaSendPhoto(telegramChatId, buf, caption, `${log.slot}.jpg`)
      }

      // Approval keyboard — reuses same imgapprove / imgreject / imgregen callbacks
      await lumaApprovalKeyboard(
        telegramChatId,
        jobId,
        successCount,
        productTitle,
        model,
      )
    }

    // ── Step 9: Update job status → preview ─────────────────────────────────
    const providerResults = {
      pipeline: `luma-studio-angles-v1:${model}`,
      provider: 'luma',
      model,
      successCount,
      totalAttempted: submittedIds.length,
      slotLogs,
      mediaUrls,
    }

    try {
      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          status: 'preview',
          generatedImages: mediaIds,
          imageCount: successCount,
          generationCompletedAt: new Date().toISOString(),
          lumaGenerationIds: JSON.stringify(submittedIds),
          lumaModel: model,
          providerResults: JSON.stringify(providerResults),
        },
      })
      console.log(`[lumaGenTask] done — job=${jobId} images=${successCount} status=preview`)
    } catch (enumErr) {
      // 'preview' not in enum yet → fall back to 'review'
      const errMsg = enumErr instanceof Error ? enumErr.message : String(enumErr)
      console.error(`[lumaGenTask] 'preview' status failed (enum issue?): ${errMsg}`)
      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: { status: 'review', generatedImages: mediaIds, imageCount: successCount,
                generationCompletedAt: new Date().toISOString(), providerResults: JSON.stringify(providerResults) },
      })
    }

    return {
      output: { success: true, mediaIds: mediaIds.join(','), error: '' },
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Telegram helpers (local — same pattern as imageGenTask)
// TODO: extract to src/lib/telegramHelpers.ts if a third consumer appears
// ─────────────────────────────────────────────────────────────────────────────

async function lumaNotify(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    })
  } catch (err) {
    console.error('[lumaGenTask] Telegram notify failed:', err)
  }
}

async function lumaSendPhoto(
  chatId: string,
  buf: Buffer,
  caption: string,
  filename: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
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
    if (!data.ok) {
      console.error(`[lumaGenTask] sendPhoto FAILED — file=${filename} err="${data.description}"`)
    }
  } catch (err) {
    console.error(`[lumaGenTask] sendPhoto exception (${filename}):`, err)
  }
}

async function lumaApprovalKeyboard(
  chatId: string,
  jobId: string,
  imageCount: number,
  productTitle: string,
  model: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  const text =
    `📸 <b>${imageCount} Luma önizleme hazır — onay bekleniyor</b>\n\n` +
    `📦 <b>${productTitle}</b>\n` +
    `⚙️ Model: ${model}\n\n` +
    `Tümünü onaylamak için <b>✅ Tümünü Onayla</b> butonuna basın.\n` +
    `Belirli slotları onaylamak için: <code>onayla 1,2</code>\n` +
    `Yüksek kalite yeniden üretim için <b>🌟 HQ Yeniden Üret</b> butonuna basın.`

  const keyboard = [
    [{ text: '✅ Tümünü Onayla', callback_data: `imgapprove:${jobId}:all` }],
    [{ text: '🌟 HQ Yeniden Üret (photon-1)', callback_data: `lumahq:${jobId}` }],
    [
      { text: '🔄 Yeniden Üret', callback_data: `imgregen:${jobId}` },
      { text: '❌ Reddet',       callback_data: `imgreject:${jobId}` },
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
    const data = await res.json() as { ok: boolean; description?: string }
    if (!data.ok) {
      console.error(`[lumaGenTask] approval keyboard FAILED: ${data.description}`)
    }
  } catch (err) {
    console.error('[lumaGenTask] approval keyboard exception:', err)
  }
}
