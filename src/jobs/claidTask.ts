/**
 * claidTask — Claid.ai Image Enhancement Task
 *
 * Payload Jobs Queue task for Claid.ai product photo enhancement.
 * Triggered from Telegram via #claid {productId} → mode selection → claidmode callback.
 *
 * Flow:
 *   1. Fetch ImageGenerationJob record
 *   2. Fetch product + resolve first reference image
 *   3. Download reference image buffer
 *   4. Call Claid.ai upload API → receive processed JPEG buffer
 *   5. Save result as Media document (type: 'generated')
 *   6. Send result photo to Telegram via multipart buffer
 *   7. Send Claid approval keyboard
 *   8. Update job status → 'preview'
 *
 * Approval flow (handled in route.ts):
 *   claidapprove:{jobId}  → approveImageGenJob (reused) → generativeGallery
 *   claidregen:{jobId}    → re-queue claid-enhance with same mode (from requestType)
 *   claidchange:{jobId}   → show mode selection keyboard again
 *   claidreject:{jobId}   → rejectImageGenJob (reused)
 *
 * requestType field stores the ClaidMode so regen can recover it.
 */

import type { TaskConfig } from 'payload'
import { CLAID_MODE_LABELS, CLAID_MODE_DESCRIPTIONS, callClaidUpload } from '../lib/claidProvider'
import type { ClaidMode } from '../lib/claidProvider'

export const claidTask: TaskConfig<{
  input: { jobId: string; mode: string }
  output: {
    success: boolean
    mediaId: string
    error: string
  }
}> = {
  slug: 'claid-enhance',
  label: 'Claid.ai Görsel İyileştirme',
  retries: 0,

  inputSchema: [
    { name: 'jobId', type: 'text', required: true },
    { name: 'mode',  type: 'text', required: true }, // 'cleanup' | 'studio' | 'creative'
  ],

  outputSchema: [
    { name: 'success', type: 'checkbox' },
    { name: 'mediaId', type: 'text' },
    { name: 'error',   type: 'text' },
  ],

  onFail: async ({ job, req }) => {
    const jobId = (
      (job.taskStatus?.['claid-enhance'] as Record<string, unknown> | undefined)
        ?.input as Record<string, unknown> | undefined
    )?.jobId as string | undefined

    if (!jobId) return

    try {
      await req.payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          status: 'failed',
          errorMessage: 'Claid görevi başarısız — Payload Jobs kaydını kontrol edin',
          generationCompletedAt: new Date().toISOString(),
        },
      })
    } catch (err) {
      console.error('[claidTask] onFail cleanup error:', err)
    }
  },

  handler: async ({ input, req }) => {
    const { jobId } = input
    const mode = (input.mode || 'cleanup') as ClaidMode
    const payload = req.payload

    console.log(`[claidTask] start — jobId=${jobId} mode=${mode}`)

    // ── Step 1: Fetch job record ──────────────────────────────────────────────
    let jobDoc: Record<string, unknown>
    try {
      jobDoc = await payload.findByID({
        collection: 'image-generation-jobs',
        id: jobId,
        depth: 1,
      }) as Record<string, unknown>
    } catch {
      throw new Error(`Claid job bulunamadı: ${jobId}`)
    }

    const telegramChatId = jobDoc.telegramChatId as string | undefined
    const productRef = jobDoc.product as { id: number } | number | null

    if (!productRef) throw new Error('Job kayıtında ürün referansı eksik')
    const productId = typeof productRef === 'object' ? productRef.id : productRef

    // Mark as generating
    await payload.update({
      collection: 'image-generation-jobs',
      id: jobId,
      data: {
        status: 'generating',
        generationStartedAt: new Date().toISOString(),
      },
    })

    // ── Step 2: Fetch product ─────────────────────────────────────────────────
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

    // ── Step 3: Resolve reference image ──────────────────────────────────────
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
        console.warn('[claidTask] media fetch by ID failed:', err)
      }
    }

    if (!mediaUrl) {
      const msg =
        'Ürün fotoğrafı bulunamadı — Claid iyileştirmesi için ürüne bir fotoğraf eklenmeli. ' +
        'Önce Telegram\'dan fotoğraf gönderin, ardından #claid komutunu kullanın.'

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
        await sendClaidMessage(
          telegramChatId,
          `❌ <b>Claid iyileştirme başarısız</b>\n\n` +
          `Ürün fotoğrafı bulunamadı. Önce bir ürün fotoğrafı gönderin, ardından <code>#claid</code> komutunu kullanın.`,
        )
      }

      throw new Error(msg)
    }

    // ── Step 4: Download reference image ─────────────────────────────────────
    const fetchUrl = absoluteUrl(mediaUrl)
    console.log(`[claidTask] fetching reference image — ${fetchUrl}`)

    let referenceBuffer: Buffer
    let referenceMime: string

    try {
      const imgRes = await fetch(fetchUrl)
      if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
      referenceBuffer = Buffer.from(await imgRes.arrayBuffer())
      referenceMime = mediaMime || 'image/jpeg'
      console.log(`[claidTask] reference loaded — ${referenceBuffer.length}b ${referenceMime}`)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      const msg = `Referans fotoğraf indirilemedi: ${errMsg}`

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
        await sendClaidMessage(
          telegramChatId,
          `❌ <b>Claid iyileştirme başarısız</b>\n\n` +
          `Referans fotoğraf indirilemedi: <code>${errMsg.slice(0, 150)}</code>`,
        )
      }

      throw new Error(msg)
    }

    // ── Step 5: Call Claid.ai ─────────────────────────────────────────────────
    console.log(`[claidTask] calling Claid — mode=${mode} inputSize=${referenceBuffer.length}b`)

    let resultBuffer: Buffer
    try {
      resultBuffer = await callClaidUpload(referenceBuffer, referenceMime, mode)
      console.log(`[claidTask] Claid ✓ — outputSize=${resultBuffer.length}b mode=${mode}`)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      const msg = `Claid API hatası: ${errMsg}`

      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          status: 'failed',
          errorMessage: msg,
          generationCompletedAt: new Date().toISOString(),
          providerResults: JSON.stringify({ provider: 'claid', mode, error: errMsg }),
        },
      })

      if (telegramChatId) {
        await sendClaidMessage(
          telegramChatId,
          `❌ <b>Claid iyileştirme başarısız</b> (${CLAID_MODE_LABELS[mode]})\n\n` +
          `🔍 <b>API hatası:</b> <code>${errMsg.slice(0, 200)}</code>\n\n` +
          `Tekrar deneyin: <code>#claid ${productId}</code>`,
        )
      }

      throw new Error(msg)
    }

    // ── Step 6: Save result as Media document ─────────────────────────────────
    // DUAL-TRACK: type='generated' → held until operator approval
    // On approval → written to product.generativeGallery (same hook as imageGenTask)
    const filename = `claid-${productId}-${mode}-${Date.now()}.jpg`
    let savedMediaId: number | null = null
    let savedMediaUrl: string = ''

    try {
      const media = await payload.create({
        collection: 'media',
        data: {
          altText: `${productTitle} — Claid ${CLAID_MODE_LABELS[mode]}`,
          product: productId,
          type: 'generated',
        },
        file: {
          data: resultBuffer,
          mimetype: 'image/jpeg',
          name: filename,
          size: resultBuffer.length,
        },
      })
      savedMediaId = media.id as number
      savedMediaUrl = (media.url as string) || ''
      console.log(`[claidTask] media saved — id=${savedMediaId} url=${savedMediaUrl}`)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[claidTask] media save failed: ${errMsg}`)
      // Non-fatal: we still have the buffer — warn but continue to Telegram send
    }

    // ── Step 7: Send result photo to Telegram ─────────────────────────────────
    // CRITICAL ORDER: photo goes to Telegram BEFORE DB status update.
    // If the DB update fails, the photo is already delivered.
    if (telegramChatId) {
      await sendClaidMessage(
        telegramChatId,
        `🔄 <b>Claid sonucu hazır</b> — Telegram'a gönderiliyor...`,
      )

      const modeLabel = CLAID_MODE_LABELS[mode]
      const modeDesc  = CLAID_MODE_DESCRIPTIONS[mode]
      const caption   = `✨ <b>${modeLabel}</b>\n<i>${modeDesc}</i>\n📦 ${productTitle}`

      await sendClaidPhotoBuffer(telegramChatId, resultBuffer, caption, filename)
      await sendClaidApprovalKeyboard(telegramChatId, jobId, productTitle, mode)
    } else {
      console.warn(`[claidTask] no telegramChatId on job ${jobId}, skipping Telegram send`)
    }

    // ── Step 8: Update job to 'preview' ───────────────────────────────────────
    const jobUpdateData = {
      generatedImages: savedMediaId ? [savedMediaId] : [],
      imageCount:      savedMediaId ? 1 : 0,
      generationCompletedAt: new Date().toISOString(),
      jobTitle: `${productTitle} — Claid ${CLAID_MODE_LABELS[mode]}`,
      providerResults: JSON.stringify({
        provider: 'claid',
        mode,
        modeLabel: CLAID_MODE_LABELS[mode],
        inputSize: referenceBuffer.length,
        outputSize: resultBuffer.length,
        mediaId: savedMediaId,
        mediaUrl: savedMediaUrl,
      }),
    }

    try {
      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: { status: 'preview', ...jobUpdateData },
      })
      console.log(`[claidTask] job status → preview jobId=${jobId}`)
    } catch (enumErr) {
      // 'preview' not in Postgres enum yet — fall back to 'review'
      const errMsg = enumErr instanceof Error ? enumErr.message : String(enumErr)
      console.error(`[claidTask] 'preview' status update failed (enum issue?): ${errMsg}`)
      try {
        await payload.update({
          collection: 'image-generation-jobs',
          id: jobId,
          data: { status: 'review', ...jobUpdateData },
        })
        console.log(`[claidTask] fallback: job status → review`)
      } catch (fallbackErr) {
        console.error(`[claidTask] fallback 'review' also failed:`, fallbackErr)
      }
    }

    console.log(`[claidTask] done — jobId=${jobId} product=${productId} mode=${mode} mediaId=${savedMediaId}`)

    return {
      output: {
        success: true,
        mediaId: savedMediaId ? String(savedMediaId) : '',
        error: '',
      },
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function sendClaidMessage(chatId: string, text: string): Promise<void> {
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
    console.error('[claidTask] sendClaidMessage failed:', err)
  }
}

/**
 * Send the Claid-processed image to Telegram via multipart buffer upload.
 * Uses the raw JPEG buffer directly — no URL accessibility issues.
 */
async function sendClaidPhotoBuffer(
  chatId: string,
  buf: Buffer,
  caption: string,
  filename: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.warn('[claidTask] sendClaidPhotoBuffer: TELEGRAM_BOT_TOKEN not set')
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
      console.log(`[claidTask] sendClaidPhotoBuffer ok — msg_id=${data.result?.message_id}`)
    } else {
      console.error(
        `[claidTask] sendClaidPhotoBuffer FAILED — chat=${chatId}` +
        ` tg_error="${data.description}" full=${JSON.stringify(data)}`,
      )
    }
  } catch (err) {
    console.error(`[claidTask] sendClaidPhotoBuffer exception:`, err)
  }
}

/**
 * Send Claid approval inline keyboard after the preview image.
 *
 * Keyboard:
 *   Row 1: ✅ Ürüne Ekle (approve)
 *   Row 2: 🔄 Yeniden Dene (regen same mode)  |  🎨 Modu Değiştir (show mode keyboard)
 *   Row 3: ❌ Reddet
 *
 * callback_data formats (handled in route.ts):
 *   claidapprove:{jobId}       — approve, push to generativeGallery
 *   claidregen:{jobId}         — re-queue claid-enhance with same mode
 *   claidchange:{jobId}        — show mode selection keyboard again
 *   claidreject:{jobId}        — reject, no image attached
 */
async function sendClaidApprovalKeyboard(
  chatId: string,
  jobId: string,
  productTitle: string,
  mode: ClaidMode,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  const modeLabel = CLAID_MODE_LABELS[mode]
  const modeDesc  = CLAID_MODE_DESCRIPTIONS[mode]

  const text =
    `🧴 <b>Claid sonucu hazır — onay bekleniyor</b>\n\n` +
    `📦 <b>${productTitle}</b>\n` +
    `✨ Mod: <b>${modeLabel}</b>\n` +
    `<i>${modeDesc}</i>\n\n` +
    `Görsel beğendiyseniz <b>✅ Ürüne Ekle</b> butonuna basın.\n` +
    `Aynı modda tekrar denemek için <b>🔄 Yeniden Dene</b>.\n` +
    `Farklı mod seçmek için <b>🎨 Modu Değiştir</b>.`

  const keyboard = [
    [{ text: '✅ Ürüne Ekle',       callback_data: `claidapprove:${jobId}` }],
    [
      { text: '🔄 Yeniden Dene',    callback_data: `claidregen:${jobId}` },
      { text: '🎨 Modu Değiştir',   callback_data: `claidchange:${jobId}` },
    ],
    [{ text: '❌ Reddet',            callback_data: `claidreject:${jobId}` }],
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
      console.log(`[claidTask] sendClaidApprovalKeyboard ok — msg_id=${data.result?.message_id} job=${jobId}`)
    } else {
      console.error(
        `[claidTask] sendClaidApprovalKeyboard FAILED — job=${jobId} chat=${chatId}` +
        ` tg_error="${data.description}"`,
      )
    }
  } catch (err) {
    console.error('[claidTask] sendClaidApprovalKeyboard exception:', err)
  }
}
