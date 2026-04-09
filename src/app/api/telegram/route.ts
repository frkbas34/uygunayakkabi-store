import { NextRequest, NextResponse, after } from 'next/server'
import { getPayload } from '@/lib/payload'
import { parseTelegramCaption, parseStockUpdate } from '@/lib/telegram'
import {
  fetchAutomationSettings,
  resolveProductStatus,
  resolveChannelTargets,
} from '@/lib/automationDecision'

// ── Vercel function timeout ────────────────────────────────────────────────────
// Luma polling loop runs up to 120s. OpenAI gpt-image-1 typically 15-40s.
// Default Vercel Pro: 60s — too tight for Luma HQ and borderline for standard.
// maxDuration=300 allows up to 5 minutes on Pro/Team plans.
// Required to prevent after() polling from being killed mid-generation.
export const maxDuration = 300

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// ── Multi-bot token resolution ───────────────────────────────────────────────
// Supports both @Uygunops_bot (TELEGRAM_BOT_TOKEN) and @Geeeeobot (TELEGRAM_GEO_BOT_TOKEN).
// Per-request token is set at the top of POST() based on the incoming bot ID,
// then read by all helper functions via getBotToken().
let _requestBotToken: string | undefined
function getBotToken(): string | undefined {
  return _requestBotToken || process.env.TELEGRAM_BOT_TOKEN
}

/** Send a Telegram message using an explicit bot token (for cross-bot notifications). */
async function sendTelegramMessageAs(token: string, chatId: number, text: string): Promise<void> {
  const safeText = text.length > 4000 ? text.substring(0, 4000) + '\n\n⚠️ (mesaj kesildi — çok uzun)' : text
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: safeText, parse_mode: 'HTML' }),
  })
  if (!res.ok) {
    const errBody = await res.text()
    console.error(`[telegram/sendMessageAs] FAILED ${res.status}: chatId=${chatId} body=${errBody} msgPreview=${text.substring(0, 100)}`)
  }
}

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = getBotToken()
  if (!token) return
  // Telegram API limit: 4096 chars for sendMessage
  const safeText = text.length > 4000 ? text.substring(0, 4000) + '\n\n⚠️ (mesaj kesildi — çok uzun)' : text
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: safeText, parse_mode: 'HTML' }),
  })
  if (!res.ok) {
    const errBody = await res.text()
    console.error(`[telegram/sendMessage] FAILED ${res.status}: chatId=${chatId} body=${errBody} msgPreview=${text.substring(0, 100)}`)
  }
}

/** Send a message with Telegram inline keyboard buttons. Returns the sent message ID. */
async function sendTelegramMessageWithKeyboard(
  chatId: number,
  text: string,
  keyboard: Array<Array<{ text: string; callback_data: string }>>,
): Promise<number | null> {
  const token = getBotToken()
  if (!token) return null
  const safeText = text.length > 4000 ? text.substring(0, 4000) + '\n\n⚠️ (mesaj kesildi)' : text
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: safeText,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard },
    }),
  })
  if (!res.ok) return null
  try {
    const data = await res.json()
    return data?.result?.message_id ?? null
  } catch {
    return null
  }
}

/** Edit an existing message's text and inline keyboard */
async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  keyboard?: Array<Array<{ text: string; callback_data: string }>>,
): Promise<void> {
  const token = getBotToken()
  if (!token) return
  const safeText = text.length > 4000 ? text.substring(0, 4000) + '\n\n⚠️ (mesaj kesildi)' : text
  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: safeText,
      parse_mode: 'HTML',
      ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
    }),
  })
}

/** Build inline keyboard for size multi-select */
const DEFAULT_SIZES = ['39', '40', '41', '42', '43', '44', '45']

function buildSizeKeyboard(
  selectedSizes: Set<string>,
): Array<Array<{ text: string; callback_data: string }>> {
  const rows: Array<Array<{ text: string; callback_data: string }>> = []
  // Row 1: 39, 40, 41  |  Row 2: 42, 43, 44  |  Row 3: 45
  const layout = [[0, 3], [3, 6], [6, 7]]
  for (const [start, end] of layout) {
    const row = DEFAULT_SIZES.slice(start, end).map((size) => ({
      text: selectedSizes.has(size) ? `✅ ${size}` : size,
      callback_data: `wz_size:${size}`,
    }))
    rows.push(row)
  }
  // Action rows
  rows.push([
    { text: '🔄 Tümünü Seç', callback_data: 'wz_size:all' },
    { text: '🗑 Temizle', callback_data: 'wz_size:clear' },
  ])
  rows.push([
    { text: '✅ Devam', callback_data: 'wz_size:done' },
  ])
  return rows
}

function formatSizeSelectionText(selectedSizes: Set<string>): string {
  if (selectedSizes.size === 0) {
    return '👟 <b>Beden seçin:</b>\n\nAşağıdaki butonlara tıklayarak bedenleri seçin/kaldırın.'
  }
  const sorted = Array.from(selectedSizes).sort((a, b) => Number(a) - Number(b))
  return `👟 <b>Beden seçin:</b>\n\n✅ Seçili: <b>${sorted.join(', ')}</b> (${sorted.length} beden)`
}

/** Dismiss the loading spinner on a Telegram button after user clicks it */
async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  const token = getBotToken()
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, ...(text ? { text } : {}) }),
  })
}

/**
 * Extract product ID from a Telegram reply-to message context.
 *
 * Checks multiple patterns in this priority order:
 * 1. Admin URL: /products/{id}
 * 2. Inline keyboard callback_data: imagegen:{id}:... or claidmode:{id}:...
 * 3. Text patterns: "ID: {id}", "#gorsel {id}", "#geminipro {id}", "Ürün ID: {id}"
 *
 * Returns the numeric product ID or null if nothing found.
 */
function resolveProductFromReply(replyMessage: Record<string, unknown> | undefined): number | null {
  if (!replyMessage) return null

  // Combine text + caption from the replied-to message
  const replyText = String(replyMessage.text || replyMessage.caption || '')

  // 1. Admin URL: /admin/collections/products/{id} or /products/{id}
  const urlMatch = replyText.match(/\/products\/(\d+)/)
  if (urlMatch) return parseInt(urlMatch[1])

  // 2. Inline keyboard callback_data in the replied-to message
  //    e.g. imagegen:42:geminipro, claidmode:42:studio, imgapprove:42:all
  const replyMarkup = replyMessage.reply_markup as { inline_keyboard?: Array<Array<{ callback_data?: string }>> } | undefined
  if (replyMarkup?.inline_keyboard) {
    for (const row of replyMarkup.inline_keyboard) {
      for (const btn of row) {
        const cbMatch = btn.callback_data?.match(/^(?:imagegen|claidmode|imgapprove|imgpremium|imgreject|imgregen):(\d+)/)
        if (cbMatch) return parseInt(cbMatch[1])
      }
    }
  }

  // 3. Text patterns: "ID: 42", "#gorsel 42", "#geminipro 42", "Ürün ID: 42"
  const idPatterns = [
    /\bID:\s*(\d+)/i,
    /#gorsel\s+(\d+)/i,
    /#geminipro\s+(\d+)/i,
    /Ürün\s+ID:\s*(\d+)/i,
  ]
  for (const pattern of idPatterns) {
    const m = replyText.match(pattern)
    if (m) return parseInt(m[1])
  }

  return null
}

/** Türkçe karakterleri ASCII'ye çevir + URL-safe slug üret */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/** Telegram file_id → { buffer, ext, contentType } */
async function downloadTelegramFile(fileId: string): Promise<{
  buffer: Buffer
  ext: string
  contentType: string
} | null> {
  const token = getBotToken()
  if (!token) return null

  const infoRes = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
  )
  const info = await infoRes.json()
  if (!info.ok || !info.result?.file_path) return null

  const filePath: string = info.result.file_path
  const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg'
  const EXT_MIME: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif',
  }

  const imgRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`)
  if (!imgRes.ok) return null

  const rawMime = (imgRes.headers.get('content-type') || '').split(';')[0].trim()
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const contentType = ALLOWED.includes(rawMime) ? rawMime : (EXT_MIME[ext] ?? 'image/jpeg')
  const buffer = Buffer.from(await imgRes.arrayBuffer())

  return { buffer, ext, contentType }
}

/**
 * Claude Vision ile fotoğrafı analiz et.
 * Fotoğrafa bakıp ürün bilgilerini JSON olarak döndürür.
 * ANTHROPIC_API_KEY yoksa null döner.
 */
async function analyzeProductWithVision(imageBuffer: Buffer, contentType: string): Promise<{
  title?: string
  category?: string
  brand?: string
  productType?: string
} | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const base64 = imageBuffer.toString('base64')

  const prompt = `Bu fotoğrafta bir ürün var. Lütfen aşağıdaki bilgileri Türkçe olarak JSON formatında döndür:

{
  "title": "Ürünün kısa açıklayıcı adı (örn: Nike Air Max 90 Spor Ayakkabı)",
  "category": "Şu değerlerden biri: Günlük | Spor | Klasik | Bot | Sandalet | Krampon | Cüzdan",
  "brand": "Marka adı (görünüyorsa, yoksa null)",
  "productType": "Alt kategori (sneaker/bot/sandalet/loafer/cüzdan/vs)"
}

Sadece JSON döndür, başka açıklama ekleme.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: contentType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: base64,
              },
            },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    const rawText: string = data?.content?.[0]?.text ?? ''

    // JSON parse — block içinde veya düz metin olabilir
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VF-2: Visual status helper — writes visualStatus + workflowStatus on PRODUCT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update the product-level visual lifecycle fields truthfully.
 *
 * VF-2 Foundation: visualStatus was defined in schema (Phase 1 D-102) but
 * never written by any code path. This helper makes the visual lifecycle
 * real by persisting state changes on the product document whenever the
 * image-generation pipeline advances.
 *
 * Uses isDispatchUpdate context flag to prevent Products afterChange hook
 * from re-triggering channel dispatch on these metadata writes.
 */
async function updateProductVisualStatus(
  payload: Awaited<ReturnType<typeof import('@/lib/payload').getPayload>>,
  productId: number | string,
  visualStatus: 'pending' | 'generating' | 'preview' | 'approved' | 'rejected',
  workflowStatusOverride?: string,
): Promise<void> {
  try {
    // Fetch current product to read existing workflow fields
    const product = await payload.findByID({
      collection: 'products',
      id: productId,
      depth: 0,
    }) as Record<string, unknown>

    const wf = (product.workflow ?? {}) as Record<string, unknown>

    // Determine workflowStatus transition:
    // - generating/preview → visual_pending (if still in early stages)
    // - approved → visual_ready (if not yet confirmed or later)
    // - rejected → keep current workflowStatus (operator can re-generate)
    // Only advance workflowStatus if the product hasn't progressed past visual stages
    const earlyStages = ['draft', 'visual_pending', undefined, null, '']
    const currentWfStatus = wf.workflowStatus as string | undefined

    let newWorkflowStatus = currentWfStatus
    if (workflowStatusOverride) {
      newWorkflowStatus = workflowStatusOverride
    } else if (earlyStages.includes(currentWfStatus)) {
      if (visualStatus === 'generating' || visualStatus === 'preview') {
        newWorkflowStatus = 'visual_pending'
      } else if (visualStatus === 'approved') {
        newWorkflowStatus = 'visual_ready'
      }
      // rejected: keep current workflowStatus — don't regress
    }

    await payload.update({
      collection: 'products',
      id: productId,
      data: {
        workflow: {
          workflowStatus: newWorkflowStatus,
          visualStatus,
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

    console.log(
      `[VF-2] visualStatus updated — product=${productId} ` +
        `visualStatus=${visualStatus} workflowStatus=${newWorkflowStatus}`,
    )
  } catch (err) {
    // Non-blocking: visual status write failure should never break the image gen pipeline
    const msg = err instanceof Error ? err.message : String(err)
    console.error(
      `[VF-2] visualStatus update FAILED (non-blocking) — product=${productId} ` +
        `target=${visualStatus}: ${msg}`,
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Image-gen approval helpers (v10 Telegram preview/approval flow)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Approve a preview job — attach images to product.generativeGallery then mark job approved.
 *
 * DUAL-TRACK (v13):
 *   Approved AI images go to product.generativeGallery — NOT product.images.
 *   product.images stays website-safe (original Telegram photos + manual uploads only).
 *   product.generativeGallery is the marketing/editorial lane.
 *
 * slotsStr:
 *   'all'    → approve every image in generatedImages
 *   '1,2,4'  → approve only these 1-based slot indices
 *
 * Both this direct update and the afterChange hook write to generativeGallery.
 * The hook write is idempotent (same IDs already appended here will not duplicate
 * because the hook fires AFTER status=approved is saved, by which point
 * generatedImages is already narrowed to approvedMediaIds).
 */
async function approveImageGenJob(
  payload: Awaited<ReturnType<typeof import('@/lib/payload').getPayload>>,
  jobId: string,
  slotsStr: string,
  chatId: number,
): Promise<void> {
  const jobDoc = await payload.findByID({
    collection: 'image-generation-jobs',
    id: jobId,
    depth: 0,
  }) as Record<string, unknown>

  const productRef = jobDoc.product as { id: number } | number | null
  if (!productRef) throw new Error('İş kaydında ürün referansı yok')
  const productId = typeof productRef === 'object' ? productRef.id : productRef

  const generatedImages = (jobDoc.generatedImages as Array<{ id: number } | number> | undefined) ?? []
  const allMediaIds = generatedImages.map((img) => (typeof img === 'object' ? img.id : img))

  // Determine which IDs to approve
  let approvedMediaIds: number[]
  if (slotsStr === 'all' || !slotsStr) {
    approvedMediaIds = allMediaIds
  } else {
    // Parse "1,2,4" → [0, 1, 3] (convert to 0-based indices)
    const slotIndices = slotsStr
      .split(/[,\s]+/)
      .map((s) => parseInt(s.trim()) - 1)
      .filter((i) => i >= 0 && i < allMediaIds.length)
    approvedMediaIds = slotIndices.map((i) => allMediaIds[i]).filter(Boolean)
  }

  if (approvedMediaIds.length === 0) {
    await sendTelegramMessage(chatId, '⚠️ Onaylanacak geçerli görsel bulunamadı.')
    return
  }

  // DUAL-TRACK (v13): append to generativeGallery — NOT to product.images
  // product.images = website-safe originals only (never touched here)
  // product.generativeGallery = AI marketing/editorial lane
  const productDoc = await payload.findByID({
    collection: 'products',
    id: productId,
    depth: 0,
  })
  const existingGallery = ((productDoc as any).generativeGallery as Array<{ image: number }> | undefined) ?? []
  const updatedGallery = [
    ...existingGallery,
    ...approvedMediaIds.map((id) => ({ image: id })),
  ]
  await payload.update({
    collection: 'products',
    id: productId,
    data: { generativeGallery: updatedGallery },
  })

  // Update job: if partial, narrow generatedImages to approved set before marking approved
  await payload.update({
    collection: 'image-generation-jobs',
    id: jobId,
    data: {
      status: 'approved',
      generatedImages: approvedMediaIds,
    },
  })

  // VF-2: Set product visualStatus = approved when operator approves visuals
  await updateProductVisualStatus(payload, productId, 'approved')

  const isPartial = slotsStr !== 'all' && approvedMediaIds.length < allMediaIds.length
  const slotNote = isPartial ? ` (${approvedMediaIds.length}/${allMediaIds.length} slot)` : ''

  await sendTelegramMessageWithKeyboard(
    chatId,
    `✅ <b>${approvedMediaIds.length} görsel onaylandı${slotNote}</b>\n\n` +
    `Görseller AI Üretim Galerisi'ne eklendi (ürün sayfası görselleri değişmedi).\n` +
    `🔗 <a href="https://www.uygunayakkabi.com/admin/collections/products/${productId}">Ürünü admin'de gör</a>`,
    [
      [{ text: '📋 Bilgileri Gir → Onaya Gönder', callback_data: `wz_start:${productId}` }],
    ],
  )
}

/**
 * Reject a preview job — mark as rejected, images NOT attached to product.
 * The temp Media documents remain in the media collection (can be cleaned
 * up manually or via a future cron).
 */
async function rejectImageGenJob(
  payload: Awaited<ReturnType<typeof import('@/lib/payload').getPayload>>,
  jobId: string,
  chatId: number,
): Promise<void> {
  // Resolve product ID for visual status update
  const jobDoc = await payload.findByID({
    collection: 'image-generation-jobs',
    id: jobId,
    depth: 0,
  }) as Record<string, unknown>
  const productRef = jobDoc.product as { id: number } | number | null
  const productId = productRef ? (typeof productRef === 'object' ? productRef.id : productRef) : null

  await payload.update({
    collection: 'image-generation-jobs',
    id: jobId,
    data: { status: 'rejected' },
  })

  // VF-2: Set product visualStatus = rejected when operator rejects visuals
  if (productId) {
    await updateProductVisualStatus(payload, productId, 'rejected')
  }

  await sendTelegramMessage(
    chatId,
    `❌ <b>Görseller reddedildi</b>\n\n` +
    `Ürüne hiçbir görsel eklenmedi.\n` +
    `Yeniden üretmek için: <code>yeniden üret</code> veya <code>#gorsel</code> komutunu kullanın.`,
  )
}

/**
 * Re-queue a preview job for regeneration with the SAME stage.
 * Reads stage from promptsUsed JSON so Stage 1 regen → slots 1-3,
 * Stage 2 regen → slots 4-5.
 * Clears generatedImages, resets status to queued, and queues a new task run.
 */
async function regenImageGenJob(
  payload: Awaited<ReturnType<typeof import('@/lib/payload').getPayload>>,
  jobId: string,
  chatId: number,
): Promise<void> {
  const jobDoc = await payload.findByID({
    collection: 'image-generation-jobs',
    id: jobId,
    depth: 0,
  }) as Record<string, unknown>

  const productRef = jobDoc.product as { id: number } | number | null
  const productId = productRef ? (typeof productRef === 'object' ? productRef.id : productRef) : null

  // Recover stage AND provider from promptsUsed JSON (stored by imageGenTask v11+)
  // v18 routing (Gemini-only debug mode):
  //   provider='gemini-pro'  → re-queue image-gen with gemini-pro
  //   provider='openai'      → re-queue image-gen with gemini-pro (redirected during debug phase)
  //   provider='luma' | unknown → re-queue image-gen with gemini-pro (redirected during debug phase)
  let currentStage = 'standard'
  let currentProvider = 'gemini-pro'  // v18 default: Gemini-only debug phase
  try {
    const prompts = JSON.parse((jobDoc.promptsUsed as string) || '{}')
    currentStage    = (prompts.stage    as string) || 'standard'
    currentProvider = (prompts.provider as string) || 'luma'
  } catch {
    // ignore parse errors — default to standard + luma
  }
  const stageLabel    = currentStage === 'premium' ? 'Premium (4-5)' : 'Standart (1-3)'
  // v19 Gemini-only: all providers display as Gemini Pro
  const providerLabel = '✨ Gemini Pro'

  await payload.update({
    collection: 'image-generation-jobs',
    id: jobId,
    data: {
      status: 'queued',
      generatedImages: [],
      imageCount: 0,
      errorMessage: '',
      generationStartedAt: null,
      generationCompletedAt: null,
      jobTitle: `${jobDoc.jobTitle || 'Ürün'} — Yeniden Üretim`,
    },
  })

  // v18 Gemini-only debug phase: ALL regens use Gemini Pro regardless of original provider
  await payload.jobs.queue({
    task: 'image-gen',
    input: { jobId, stage: currentStage, provider: 'gemini-pro' },
    overrideAccess: true,
  })

  // VF-2: Set product visualStatus = generating when re-generation starts
  if (productId) {
    await updateProductVisualStatus(payload, productId, 'generating')
  }

  await sendTelegramMessage(
    chatId,
    `🔄 <b>Yeniden üretim başlatıldı (${stageLabel} · ${providerLabel})</b>\n\n` +
    (productId ? `📦 Ürün ID: ${productId}\n` : '') +
    `Yeni görseller hazır olduğunda Telegram'a önizleme gönderilecek.`,
  )

  // Run the job
  try {
    await payload.jobs.run({ limit: 1, overrideAccess: true })
  } catch (err) {
    console.error('[telegram/webhook] regenImageGenJob jobs.run failed:', err)
  }
}

/**
 * Start a Stage 2 "premium" image generation job (slots 4-5).
 * Called when operator clicks "🌟 4-5 Premium Üret" on the Stage 1 keyboard.
 * Creates a NEW ImageGenerationJob for the same product and queues the task.
 * The Stage 1 job remains in 'preview' status — it can still be approved separately.
 */
async function startPremiumImageGenJob(
  payload: Awaited<ReturnType<typeof import('@/lib/payload').getPayload>>,
  originalJobId: string,
  chatId: number,
): Promise<void> {
  // Read the original Stage 1 job to get product + chat context
  const originalJob = await payload.findByID({
    collection: 'image-generation-jobs',
    id: originalJobId,
    depth: 0,
  }) as Record<string, unknown>

  const productRef = originalJob.product as { id: number } | number | null
  if (!productRef) throw new Error('Orijinal iş kaydında ürün referansı yok')
  const productId = typeof productRef === 'object' ? productRef.id : productRef

  // Derive product title from job title (strip the suffix)
  const existingTitle = (originalJob.jobTitle as string) || ''
  const productTitle = existingTitle.split(' — ')[0] || 'Ürün'

  const chatIdStr = (originalJob.telegramChatId as string) || String(chatId)

  // v15: Stage 2 premium is ALWAYS Gemini Pro — regardless of Stage 1 provider.
  // "Premium" means specifically Gemini Pro image generation for editorial/lifestyle slots.
  // Stage 1 provider is intentionally NOT inherited here.
  const premiumProvider = 'gemini-pro' as const
  const premiumProviderLabel = '✨ Gemini Pro'

  // Create a new job record for Stage 2
  const newJob = await payload.create({
    collection: 'image-generation-jobs',
    data: {
      product: productId,
      mode: 'hizli',  // cosmetic only
      status: 'queued',
      telegramChatId: chatIdStr,
      jobTitle: `${productTitle} — Premium Görsel (Slot 4-5 · ${premiumProviderLabel})`,
    },
  })

  const newJobId = String(newJob.id)

  await payload.jobs.queue({
    task: 'image-gen',
    input: { jobId: newJobId, stage: 'premium', provider: premiumProvider },
    overrideAccess: true,
  })

  // VF-2: Set product visualStatus = generating when premium Stage 2 starts
  // Note: if Stage 1 was already approved, this reverts to generating for Stage 2.
  // This is truthful — new images are being generated and need review.
  await updateProductVisualStatus(payload, productId, 'generating')

  await sendTelegramMessage(
    chatId,
    `🌟 <b>Premium görsel üretimi başlatıldı</b> (${premiumProviderLabel})\n\n` +
    `📸 Slot 4 (Editoryal Üstten) ve Slot 5 (Lifestyle Giyilmiş) üretiliyor...\n` +
    `Hazır olduğunda Telegram'a önizleme gönderilecek.\n\n` +
    `💡 <i>Slot 1-3 görselleri için önceki onay butonlarını hâlâ kullanabilirsiniz.</i>`,
  )

  // Run the new job
  try {
    await payload.jobs.run({ limit: 1, overrideAccess: true })
  } catch (err) {
    console.error('[telegram/webhook] startPremiumImageGenJob jobs.run failed:', err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Multi-bot token resolution ─────────────────────────────────────────
    // Geo_bot webhook is set with ?bot=geo query parameter.
    // Uygunops uses the default path (no query param).
    const botParam = new URL(req.url).searchParams.get('bot')
    if (botParam === 'geo' && process.env.TELEGRAM_GEO_BOT_TOKEN) {
      _requestBotToken = process.env.TELEGRAM_GEO_BOT_TOKEN
    } else {
      _requestBotToken = process.env.TELEGRAM_BOT_TOKEN
    }

    // Webhook secret doğrulama
    // TELEGRAM_WEBHOOK_SECRET boşsa atla (ilk kurulum / test için)
    // Geo_bot uses its own secret (TELEGRAM_GEO_WEBHOOK_SECRET) if configured
    const secret = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
    const expectedSecret = botParam === 'geo'
      ? (process.env.TELEGRAM_GEO_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET)
      : process.env.TELEGRAM_WEBHOOK_SECRET
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // DEBUG: Log incoming update keys to diagnose missing message field
    console.log('[telegram/debug] update keys:', Object.keys(body), 'has message:', !!body?.message, 'has edited_message:', !!body?.edited_message, 'has my_chat_member:', !!body?.my_chat_member)

    // ── Inline keyboard button clicks ─────────────────────────────────────
    // Handles clicks on mode-selection buttons sent after product creation.
    // callback_data format: "imagegen:{productId}:{mode|skip}"
    const callbackQuery = body?.callback_query
    if (callbackQuery) {
      const cbChatId: number = callbackQuery.message?.chat?.id
      const cbQueryId: string = callbackQuery.id
      const cbData: string = callbackQuery.data || ''
      const cbChatType: string = callbackQuery.message?.chat?.type || 'private'
      const cbIsGroup = cbChatType === 'group' || cbChatType === 'supergroup'
      // Phase P: operator userId for wizard session isolation in groups
      const cbUserId: number | undefined = callbackQuery.from?.id

      // ── Phase N: Bot role separation for callbacks ───────────────────────
      if (botParam === 'geo' && !cbIsGroup) {
        await answerCallbackQuery(cbQueryId, '📌 DM komutları için @Uygunops_bot kullanın.')
        return NextResponse.json({ ok: true })
      }
      if (botParam !== 'geo' && cbIsGroup) {
        // Uygunops callback in group → silently acknowledge
        await answerCallbackQuery(cbQueryId)
        return NextResponse.json({ ok: true })
      }

      // ── Phase R: Command ownership split for callbacks ───────────────────
      // Ops Bot (Uygunops) owns: image generation, image approval, wizard callbacks
      // GeoBot owns: story callbacks
      // This teaches operators which bot handles which workflow.
      const OPS_CB_PREFIXES = ['imagegen:', 'imgapprove:', 'imgreject:', 'imgregen:', 'imgpremium:', 'wz_start:', 'wz_cat:', 'wz_ptype:', 'wz_tgt:', 'wz_size:', 'wz_confirm:', 'wz_cancel:']
      const GEO_CB_PREFIXES = ['storyapprove:', 'storyreject:', 'storyretry:']
      const isOpsCb = OPS_CB_PREFIXES.some(p => cbData.startsWith(p))
      const isGeoCb = GEO_CB_PREFIXES.some(p => cbData.startsWith(p))

      if (botParam === 'geo' && isOpsCb) {
        await answerCallbackQuery(cbQueryId, '📌 Bu işlem @Uygunops_bot üzerinden çalışır.')
        return NextResponse.json({ ok: true })
      }
      if (botParam !== 'geo' && isGeoCb) {
        await answerCallbackQuery(cbQueryId, '📌 Bu işlem GeoBot üzerinden çalışır.')
        return NextResponse.json({ ok: true })
      }

      if (cbData.startsWith('imagegen:')) {
        const parts = cbData.split(':')
        const cbProductId = parseInt(parts[1])
        const cbMode = parts[2] as 'hizli' | 'dengeli' | 'premium' | 'karma' | 'geminipro' | 'chatgpt' | 'skip'

        if (cbMode === 'skip') {
          await answerCallbackQuery(cbQueryId, '✅ Tamam, sadece ürün kaydedildi')
          return NextResponse.json({ ok: true })
        }

        // ── CRITICAL: Answer Telegram FIRST so the button never freezes ─────
        // Any error after this point is reported via a Telegram chat message
        // instead of leaving the button in a permanent loading state.
        await answerCallbackQuery(cbQueryId, '🎨 Görsel üretimi başlatılıyor...')

        after(async () => {
          try {
            const cbPayload = await getPayload()

            // Fetch product (depth:0 is fine — imageGenTask fetches images itself)
            const { docs: cbDocs } = await cbPayload.find({
              collection: 'products',
              where: { id: { equals: cbProductId } },
              limit: 1,
              depth: 0,
            })
            if (cbDocs.length === 0) {
              await sendTelegramMessage(cbChatId, '❌ Ürün bulunamadı')
              return
            }
            const cbProduct = cbDocs[0] as Record<string, unknown>

            // v18 Gemini-only debug phase: all button selections → Gemini Pro
            const cbJobDoc = await cbPayload.create({
              collection: 'image-generation-jobs',
              data: {
                jobTitle: `${cbProduct.title} — ✨ Gemini Pro Stüdyo`,
                product: cbProductId,
                mode: 'hizli',
                status: 'queued',
                telegramChatId: String(cbChatId),
                requestedByUserId: String(callbackQuery.from?.id ?? ''),
              },
            })

            await cbPayload.jobs.queue({
              task: 'image-gen',
              input: { jobId: String(cbJobDoc.id), stage: 'standard', provider: 'gemini-pro' },
              overrideAccess: true,
            })

            // VF-2: Set product visualStatus = generating when inline button triggers gen
            await updateProductVisualStatus(cbPayload, cbProductId, 'generating')

            await sendTelegramMessage(
              cbChatId,
              `✨ <b>Gemini Pro görsel üretimi başlatıldı!</b>\n\n` +
              `📦 Ürün: <b>${cbProduct.title}</b>\n` +
              `🤖 Provider: ✨ Gemini Pro\n` +
              `🖼️ 3 sahne üretilecek\n\n` +
              `<i>Tamamlanınca bildirim gelecek.</i>`,
            )

            await cbPayload.jobs.run({ limit: 1, overrideAccess: true })
          } catch (err) {
            console.error('[telegram/webhook] callback_query image-gen failed:', err)
            await sendTelegramMessage(
              cbChatId,
              `❌ Görsel üretimi başlatılamadı: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`,
            )
          }
        })
      }

      // ── imgapprove:{jobId}:all  or  imgapprove:{jobId}:{1,2,4} ────────────
      // Approves all or specific (1-based) slots of a preview job.
      // Sets job status → approved which triggers the afterChange hook
      // to attach the approved images to the product.
      if (cbData.startsWith('imgapprove:')) {
        const parts = cbData.split(':')
        const cbJobId = parts[1]
        const slotsStr = parts[2] || 'all' // 'all' or '1,2,4'

        await answerCallbackQuery(cbQueryId, '✅ Onaylanıyor...')

        after(async () => {
          try {
            const approvePayload = await getPayload()
            await approveImageGenJob(approvePayload, cbJobId, slotsStr, cbChatId)
          } catch (err) {
            console.error('[telegram/webhook] imgapprove callback failed:', err)
            await sendTelegramMessage(cbChatId, `❌ Onaylama hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
          }
        })
      }

      // ── imgreject:{jobId} ─────────────────────────────────────────────────
      // Rejects a preview job — marks as rejected, no images attached to product.
      if (cbData.startsWith('imgreject:')) {
        const cbJobId = cbData.split(':')[1]
        await answerCallbackQuery(cbQueryId, '❌ Reddedildi')

        after(async () => {
          try {
            const rejectPayload = await getPayload()
            await rejectImageGenJob(rejectPayload, cbJobId, cbChatId)
          } catch (err) {
            console.error('[telegram/webhook] imgreject callback failed:', err)
          }
        })
      }

      // ── imgregen:{jobId} ──────────────────────────────────────────────────
      // Discards current previews and re-queues the generation job (same stage).
      if (cbData.startsWith('imgregen:')) {
        const cbJobId = cbData.split(':')[1]
        await answerCallbackQuery(cbQueryId, '🔄 Yeniden üretiliyor...')

        after(async () => {
          try {
            const regenPayload = await getPayload()
            await regenImageGenJob(regenPayload, cbJobId, cbChatId)
          } catch (err) {
            console.error('[telegram/webhook] imgregen callback failed:', err)
            await sendTelegramMessage(cbChatId, `❌ Yeniden üretim başlatılamadı: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
          }
        })
      }

      // ── imgpremium:{jobId} ────────────────────────────────────────────────
      // Stage 2 Gemini Pro (slots 4-5) — triggered from Stage 1 Luma approval keyboard.
      // Creates a new job for the same product and queues image-gen with gemini-pro.
      if (cbData.startsWith('imgpremium:')) {
        const cbJobId = cbData.split(':')[1]
        await answerCallbackQuery(cbQueryId, '✨ Gemini Pro Stage 2 başlatılıyor...')
        after(async () => {
          try {
            const premPayload = await getPayload()
            await startPremiumImageGenJob(premPayload, cbJobId, cbChatId)
          } catch (err) {
            console.error('[telegram/webhook] imgpremium callback failed:', err)
            await sendTelegramMessage(cbChatId, `❌ Gemini Pro üretimi başlatılamadı: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
          }
        })
      }

      // ── v19 Gemini-only: Claid callbacks deactivated ──────────────────────────
      // claidapprove, claidregen, claidchange, claidreject all return "devre dışı"
      // Full handlers preserved in git history (commit 505be38) for future re-enable.
      if (cbData.startsWith('claidapprove:') || cbData.startsWith('claidregen:') ||
          cbData.startsWith('claidchange:') || cbData.startsWith('claidreject:')) {
        await answerCallbackQuery(cbQueryId, '⛔ Claid devre dışı — #gorsel kullanın')
      }

      // ── claidmode:{productId}:{mode} ─────────────────────────────────────────
      // v19 Gemini-only: Claid callbacks deactivated
      if (cbData.startsWith('claidmode:')) {
        await answerCallbackQuery(cbQueryId, '⛔ Claid devre dışı — #gorsel kullanın')
      }

      // ── lumahq:{jobId} — v19 Gemini-only: Luma deactivated ──────────────────
      if (cbData.startsWith('lumahq:')) {
        await answerCallbackQuery(cbQueryId, '⛔ Luma devre dışı — #gorsel kullanın')
      }

      // ── Phase 4: Story callback handlers ───────────────────────────────────
      // storyapprove:{jobId} — approve a story job
      if (cbData.startsWith('storyapprove:')) {
        const jobId = cbData.split(':')[1]
        try {
          const job = await (await getPayload()).findByID({ collection: 'story-jobs', id: jobId })
          if (!job) {
            await answerCallbackQuery(cbQueryId, '❌ Story job bulunamadı')
          } else if ((job as Record<string, unknown>).approvalState === 'approved') {
            await answerCallbackQuery(cbQueryId, '✅ Zaten onaylandı')
          } else {
            // Move to approved — actual publish will happen when Telegram Story API is confirmed
            await (await getPayload()).update({
              collection: 'story-jobs',
              id: jobId,
              data: {
                approvalState: 'approved',
                status: 'approved',
              },
            })
            await answerCallbackQuery(cbQueryId, '✅ Story onaylandı')
            await sendTelegramMessage(
              cbChatId,
              `✅ Story #${jobId} onaylandı.\n\n` +
                '⚠️ Telegram Bot API henüz story yayını desteklemiyor.\n' +
                'Durum: approved — gerçek yayın Telegram Story API aktif olduğunda çalışacak.',
            )
          }
        } catch (err) {
          await answerCallbackQuery(cbQueryId, '❌ Hata oluştu')
          console.error('[telegram/webhook] storyapprove callback failed:', err)
        }
      }

      // storyreject:{jobId} — reject a story job
      if (cbData.startsWith('storyreject:')) {
        const jobId = cbData.split(':')[1]
        try {
          await (await getPayload()).update({
            collection: 'story-jobs',
            id: jobId,
            data: {
              approvalState: 'rejected',
              status: 'failed',
              errorLog: JSON.stringify({ reason: 'Rejected by operator', at: new Date().toISOString() }),
            },
          })
          await answerCallbackQuery(cbQueryId, '❌ Story reddedildi')
          await sendTelegramMessage(cbChatId, `❌ Story #${jobId} reddedildi.`)
        } catch (err) {
          await answerCallbackQuery(cbQueryId, '❌ Hata oluştu')
          console.error('[telegram/webhook] storyreject callback failed:', err)
        }
      }

      // storyretry:{jobId} — retry a failed story job
      if (cbData.startsWith('storyretry:')) {
        const jobId = cbData.split(':')[1]
        try {
          const job = await (await getPayload()).findByID({ collection: 'story-jobs', id: jobId })
          const attempts = ((job as Record<string, unknown>)?.attemptCount as number) ?? 0
          await (await getPayload()).update({
            collection: 'story-jobs',
            id: jobId,
            data: {
              status: 'queued',
              approvalState: 'not_required',
              attemptCount: attempts + 1,
              errorLog: '',
            },
          })
          await answerCallbackQuery(cbQueryId, '🔄 Yeniden kuyruğa alındı')
          await sendTelegramMessage(
            cbChatId,
            `🔄 Story #${jobId} yeniden kuyruğa alındı (deneme ${attempts + 1}).`,
          )
        } catch (err) {
          await answerCallbackQuery(cbQueryId, '❌ Hata oluştu')
          console.error('[telegram/webhook] storyretry callback failed:', err)
        }
      }

      // ── Phase T2: One-tap wizard start from image approval ────────────────
      // wz_start:{productId} — launches the confirmation wizard from an inline button
      if (cbData.startsWith('wz_start:')) {
        const wzProductId = parseInt(cbData.replace('wz_start:', ''))
        if (isNaN(wzProductId)) {
          await answerCallbackQuery(cbQueryId, '⚠️ Geçersiz ürün ID')
          return NextResponse.json({ ok: true })
        }
        await answerCallbackQuery(cbQueryId, '📋 Sihirbaz başlatılıyor...')

        try {
          const payloadInst = await getPayload()
          const product = await payloadInst.findByID({ collection: 'products', id: wzProductId, depth: 1 })
          if (!product) {
            await sendTelegramMessage(cbChatId, `❌ Ürün #${wzProductId} bulunamadı.`)
            return NextResponse.json({ ok: true })
          }

          // Visual gate — same as /confirm
          const visualStatus = (product as any).workflow?.visualStatus ?? 'pending'
          if (visualStatus !== 'approved') {
            await sendTelegramMessage(cbChatId, `⛔ Görseller henüz onaylanmamış (${visualStatus}). Önce görselleri onaylayın.`)
            return NextResponse.json({ ok: true })
          }

          // Already confirmed
          const alreadyConfirmed = (product as any).workflow?.confirmationStatus === 'confirmed'
          if (alreadyConfirmed) {
            await sendTelegramMessage(cbChatId,
              `✅ <b>Ürün #${wzProductId} zaten onaylı.</b>\n` +
              `Tekrar düzenlemek için: <code>/confirm ${wzProductId} force</code>`)
            return NextResponse.json({ ok: true })
          }

          const {
            checkConfirmationFields, getNextWizardStep, setWizardSession, clearWizardSession,
            getTitlePrompt, getStockCodePrompt, getCategoryPrompt, getProductTypePrompt,
            getPricePrompt, getTargetsPrompt, getBrandPrompt, formatConfirmationSummary,
          } = await import('@/lib/confirmationWizard')

          const check = checkConfirmationFields(product as any)
          const collected: Record<string, unknown> = {}
          const nextStep = getNextWizardStep(product as any, collected as any)

          // If everything is already filled, go straight to summary
          if (check.ready && nextStep === 'summary') {
            const summary = formatConfirmationSummary(product as any, {} as any)
            await sendTelegramMessageWithKeyboard(cbChatId, summary, [
              [
                { text: '✅ Onayla', callback_data: `wz_confirm:${wzProductId}` },
                { text: '❌ İptal', callback_data: `wz_cancel:${wzProductId}` },
              ],
            ])
            setWizardSession(cbChatId, {
              productId: wzProductId, chatId: cbChatId, userId: cbUserId,
              step: 'summary', collected: {} as any, startedAt: Date.now(),
            }, cbUserId)
            return NextResponse.json({ ok: true })
          }

          // Start wizard — show status then first prompt
          const missingList = check.missing.map(m => `  ❌ ${m.label}`).join('\n')
          const presentList = check.present.map(m => `  ✅ ${m.label}: ${m.value}`).join('\n')
          await sendTelegramMessage(cbChatId,
            `📋 <b>Ürün #${wzProductId} — ${(product as any).title ?? 'İsimsiz'}</b>\n\n` +
            `<b>Mevcut:</b>\n${presentList || '  (yok)'}\n\n` +
            `<b>Eksik:</b>\n${missingList || '  (yok)'}\n\n` +
            `Sihirbaz başlıyor...`)

          clearWizardSession(cbChatId, cbUserId)
          const wizState: any = {
            productId: wzProductId, chatId: cbChatId, userId: cbUserId,
            step: nextStep, collected, startedAt: Date.now(),
          }
          setWizardSession(cbChatId, wizState, cbUserId)

          // Dispatch first prompt
          if (nextStep === 'title') {
            await sendTelegramMessage(cbChatId, getTitlePrompt((product as any).title ?? `Ürün #${wzProductId}`))
          } else if (nextStep === 'stockCode') {
            await sendTelegramMessage(cbChatId, getStockCodePrompt((product as any).sku ?? '—'))
          } else if (nextStep === 'category') {
            const catPrompt = getCategoryPrompt()
            await sendTelegramMessageWithKeyboard(cbChatId, catPrompt.text, catPrompt.keyboard)
          } else if (nextStep === 'productType') {
            const ptypePrompt = getProductTypePrompt()
            await sendTelegramMessageWithKeyboard(cbChatId, ptypePrompt.text, ptypePrompt.keyboard)
          } else if (nextStep === 'price') {
            await sendTelegramMessage(cbChatId, getPricePrompt())
          } else if (nextStep === 'sizes') {
            wizState.pendingSizes = []
            const sizeMsg = await sendTelegramMessageWithKeyboard(cbChatId,
              formatSizeSelectionText(new Set()), buildSizeKeyboard(new Set()))
            if (sizeMsg) wizState.sizeMessageId = sizeMsg
            setWizardSession(cbChatId, wizState, cbUserId)
          } else if (nextStep === 'brand') {
            await sendTelegramMessage(cbChatId, getBrandPrompt())
          } else if (nextStep === 'targets') {
            const tgtPrompt = getTargetsPrompt()
            await sendTelegramMessageWithKeyboard(cbChatId, tgtPrompt.text, tgtPrompt.keyboard)
          }
        } catch (err) {
          console.error('[telegram/webhook] wz_start callback failed:', err)
          await sendTelegramMessage(cbChatId, `❌ Sihirbaz başlatılamadı: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
        }
        return NextResponse.json({ ok: true })
      }

      // ── Phase 5: Confirmation wizard callback handlers ───────────────────
      // wz_cat:{value} — category selection
      if (cbData.startsWith('wz_cat:')) {
        try {
          const { getWizardSession, setWizardSession, getNextWizardStep, getPricePrompt, getSizesPrompt,
                  getTargetsPrompt, getProductTypePrompt, getBrandPrompt, formatConfirmationSummary: fmtSummary } =
            await import('@/lib/confirmationWizard')
          const session = getWizardSession(cbChatId, cbUserId)
          if (!session || session.step !== 'category') {
            await answerCallbackQuery(cbQueryId, '⚠️ Aktif sihirbaz yok')
            return NextResponse.json({ ok: true })
          }
          const catValue = cbData.replace('wz_cat:', '')
          session.collected.category = catValue
          await answerCallbackQuery(cbQueryId, `✅ Kategori: ${catValue}`)

          // Determine next step
          const payloadInst = await getPayload()
          const product = await payloadInst.findByID({ collection: 'products', id: session.productId })
          const nextStep = getNextWizardStep(product as any, session.collected)
          session.step = nextStep
          setWizardSession(cbChatId, session, cbUserId)

          if (nextStep === 'productType') {
            const ptypePrompt = getProductTypePrompt()
            await sendTelegramMessageWithKeyboard(cbChatId, ptypePrompt.text, ptypePrompt.keyboard)
          } else if (nextStep === 'price') {
            await sendTelegramMessage(cbChatId, getPricePrompt())
          } else if (nextStep === 'sizes') {
            session.pendingSizes = []
            const msgId = await sendTelegramMessageWithKeyboard(
              cbChatId,
              formatSizeSelectionText(new Set()),
              buildSizeKeyboard(new Set()),
            )
            if (msgId) session.sizeMessageId = msgId
            setWizardSession(cbChatId, session, cbUserId)
          } else if (nextStep === 'brand') {
            await sendTelegramMessage(cbChatId, getBrandPrompt())
          } else if (nextStep === 'targets') {
            const tgtPrompt = getTargetsPrompt()
            await sendTelegramMessageWithKeyboard(cbChatId, tgtPrompt.text, tgtPrompt.keyboard)
          } else if (nextStep === 'summary') {
            const summary = fmtSummary(product as any, session.collected)
            await sendTelegramMessageWithKeyboard(cbChatId, summary, [
              [
                { text: '✅ Onayla', callback_data: `wz_confirm:${session.productId}` },
                { text: '❌ İptal', callback_data: `wz_cancel:${session.productId}` },
              ],
            ])
            session.step = 'summary'
            setWizardSession(cbChatId, session, cbUserId)
          }
        } catch (err) {
          await answerCallbackQuery(cbQueryId, '❌ Hata')
          console.error('[telegram/webhook] wz_cat callback failed:', err)
        }
        return NextResponse.json({ ok: true })
      }

      // wz_ptype:{value} — product type selection (VF-5)
      if (cbData.startsWith('wz_ptype:')) {
        try {
          const { getWizardSession, setWizardSession, getNextWizardStep, getPricePrompt,
                  getSizesPrompt, getTargetsPrompt, getBrandPrompt, formatConfirmationSummary } =
            await import('@/lib/confirmationWizard')
          const session = getWizardSession(cbChatId, cbUserId)
          if (!session || session.step !== 'productType') {
            await answerCallbackQuery(cbQueryId, '⚠️ Aktif sihirbaz yok')
            return NextResponse.json({ ok: true })
          }
          const ptypeValue = cbData.replace('wz_ptype:', '')
          session.collected.productType = ptypeValue
          await answerCallbackQuery(cbQueryId, `✅ Ürün tipi: ${ptypeValue}`)

          // Determine next step
          const payloadInst = await getPayload()
          const product = await payloadInst.findByID({ collection: 'products', id: session.productId })
          const nextStep = getNextWizardStep(product as any, session.collected)
          session.step = nextStep
          setWizardSession(cbChatId, session, cbUserId)

          if (nextStep === 'price') {
            await sendTelegramMessage(cbChatId, getPricePrompt())
          } else if (nextStep === 'sizes') {
            session.pendingSizes = []
            const msgId = await sendTelegramMessageWithKeyboard(
              cbChatId,
              formatSizeSelectionText(new Set()),
              buildSizeKeyboard(new Set()),
            )
            if (msgId) session.sizeMessageId = msgId
            setWizardSession(cbChatId, session, cbUserId)
          } else if (nextStep === 'brand') {
            await sendTelegramMessage(cbChatId, getBrandPrompt())
          } else if (nextStep === 'targets') {
            const tgtPrompt = getTargetsPrompt()
            await sendTelegramMessageWithKeyboard(cbChatId, tgtPrompt.text, tgtPrompt.keyboard)
          } else if (nextStep === 'summary') {
            const summary = formatConfirmationSummary(product as any, session.collected)
            await sendTelegramMessageWithKeyboard(cbChatId, summary, [
              [
                { text: '✅ Onayla', callback_data: `wz_confirm:${session.productId}` },
                { text: '❌ İptal', callback_data: `wz_cancel:${session.productId}` },
              ],
            ])
            session.step = 'summary'
            setWizardSession(cbChatId, session, cbUserId)
          }
        } catch (err) {
          await answerCallbackQuery(cbQueryId, '❌ Hata')
          console.error('[telegram/webhook] wz_ptype callback failed:', err)
        }
        return NextResponse.json({ ok: true })
      }

      // wz_tgt:{value} — channel target selection (multi-select)
      if (cbData.startsWith('wz_tgt:')) {
        try {
          const { getWizardSession, setWizardSession, formatConfirmationSummary, CHANNEL_OPTIONS } =
            await import('@/lib/confirmationWizard')
          const session = getWizardSession(cbChatId, cbUserId)
          if (!session || session.step !== 'targets') {
            await answerCallbackQuery(cbQueryId, '⚠️ Aktif sihirbaz yok')
            return NextResponse.json({ ok: true })
          }

          const tgtValue = cbData.replace('wz_tgt:', '')

          if (tgtValue === 'done') {
            // Finalize targets
            if (!session.collected.channelTargets || session.collected.channelTargets.length === 0) {
              session.collected.channelTargets = ['website'] // Default fallback
            }
            await answerCallbackQuery(cbQueryId, `✅ Hedefler: ${session.collected.channelTargets.join(', ')}`)

            // Show summary
            const payloadInst = await getPayload()
            const product = await payloadInst.findByID({ collection: 'products', id: session.productId })
            const summary = formatConfirmationSummary(product as any, session.collected)
            await sendTelegramMessageWithKeyboard(cbChatId, summary, [
              [
                { text: '✅ Onayla', callback_data: `wz_confirm:${session.productId}` },
                { text: '❌ İptal', callback_data: `wz_cancel:${session.productId}` },
              ],
            ])
            session.step = 'summary'
            setWizardSession(cbChatId, session, cbUserId)
          } else if (tgtValue === 'all') {
            session.collected.channelTargets = CHANNEL_OPTIONS.map((o) => o.value)
            await answerCallbackQuery(cbQueryId, `✅ Tümü seçildi`)
            setWizardSession(cbChatId, session, cbUserId)
          } else {
            // Toggle individual target
            if (!session.collected.channelTargets) session.collected.channelTargets = []
            const idx = session.collected.channelTargets.indexOf(tgtValue)
            if (idx >= 0) {
              session.collected.channelTargets.splice(idx, 1)
              await answerCallbackQuery(cbQueryId, `➖ ${tgtValue} çıkarıldı`)
            } else {
              session.collected.channelTargets.push(tgtValue)
              await answerCallbackQuery(cbQueryId, `➕ ${tgtValue} eklendi`)
            }
            setWizardSession(cbChatId, session, cbUserId)
          }
        } catch (err) {
          await answerCallbackQuery(cbQueryId, '❌ Hata')
          console.error('[telegram/webhook] wz_tgt callback failed:', err)
        }
        return NextResponse.json({ ok: true })
      }

      // wz_size:{value} — size multi-select toggle
      if (cbData.startsWith('wz_size:')) {
        try {
          const { getWizardSession, setWizardSession, getNextWizardStep,
                  getTargetsPrompt, formatConfirmationSummary, getStockPrompt } = await import('@/lib/confirmationWizard')
          const session = getWizardSession(cbChatId, cbUserId)
          if (!session || session.step !== 'sizes') {
            await answerCallbackQuery(cbQueryId, '⚠️ Aktif beden seçimi yok')
            return NextResponse.json({ ok: true })
          }

          const action = cbData.replace('wz_size:', '')
          const selected = new Set(session.pendingSizes ?? [])

          if (action === 'all') {
            // Select all defaults
            DEFAULT_SIZES.forEach((s) => selected.add(s))
            await answerCallbackQuery(cbQueryId, '✅ Tümü seçildi')
          } else if (action === 'clear') {
            selected.clear()
            await answerCallbackQuery(cbQueryId, '🗑 Temizlendi')
          } else if (action === 'done') {
            // Finalize size selection
            if (selected.size === 0) {
              await answerCallbackQuery(cbQueryId, '⚠️ En az 1 beden seçin')
              return NextResponse.json({ ok: true })
            }
            const sortedSizes = Array.from(selected).sort((a, b) => Number(a) - Number(b))
            session.collected.sizes = sortedSizes.join(',')
            session.pendingSizes = undefined
            session.sizeMessageId = undefined

            // Update the keyboard message to show final selection
            const cbMsgId = body?.callback_query?.message?.message_id
            if (cbMsgId) {
              await editMessageText(
                cbChatId,
                cbMsgId,
                `✅ <b>Seçilen bedenler:</b> ${sortedSizes.join(', ')}`,
              )
            }

            await answerCallbackQuery(cbQueryId, `✅ ${sortedSizes.length} beden seçildi`)

            // Move to stock step
            session.step = 'stock'
            setWizardSession(cbChatId, session, cbUserId)
            await sendTelegramMessage(cbChatId, getStockPrompt(sortedSizes))
            return NextResponse.json({ ok: true })
          } else {
            // Toggle individual size
            if (selected.has(action)) {
              selected.delete(action)
              await answerCallbackQuery(cbQueryId, `➖ ${action} kaldırıldı`)
            } else {
              selected.add(action)
              await answerCallbackQuery(cbQueryId, `➕ ${action} eklendi`)
            }
          }

          // Update session and refresh keyboard
          session.pendingSizes = Array.from(selected)
          setWizardSession(cbChatId, session, cbUserId)

          const cbMsgId = body?.callback_query?.message?.message_id
          if (cbMsgId) {
            await editMessageText(
              cbChatId,
              cbMsgId,
              formatSizeSelectionText(selected),
              buildSizeKeyboard(selected),
            )
          }
        } catch (err) {
          await answerCallbackQuery(cbQueryId, '❌ Hata')
          console.error('[telegram/webhook] wz_size callback failed:', err)
        }
        return NextResponse.json({ ok: true })
      }

      // wz_confirm:{productId} — final confirmation
      if (cbData.startsWith('wz_confirm:')) {
        try {
          const { getWizardSession, clearWizardSession, applyConfirmation } =
            await import('@/lib/confirmationWizard')
          const session = getWizardSession(cbChatId, cbUserId)
          if (!session || session.step !== 'summary') {
            await answerCallbackQuery(cbQueryId, '⚠️ Aktif onay oturumu yok')
            return NextResponse.json({ ok: true })
          }

          const payloadInst = await getPayload()
          const product = await payloadInst.findByID({ collection: 'products', id: session.productId })

          // VF-3: Double-check visual gate at final confirmation (prevents stale button bypass)
          const confirmVisualStatus = (product as any).workflow?.visualStatus ?? 'pending'
          if (confirmVisualStatus !== 'approved') {
            await answerCallbackQuery(cbQueryId, '⛔ Görseller onaylanmamış')
            await sendTelegramMessage(
              cbChatId,
              `⛔ <b>Onay uygulanamadı — Ürün #${session.productId}</b>\n\n` +
                `Görsel durumu: <code>${confirmVisualStatus}</code>\n` +
                `Önce görselleri onaylayın, sonra tekrar /confirm çalıştırın.`,
            )
            clearWizardSession(cbChatId, cbUserId)
            return NextResponse.json({ ok: true })
          }

          const result = await applyConfirmation(
            payloadInst,
            session.productId,
            session.collected,
            product as any,
            { context: {} } as any, // minimal req — applyConfirmation adds isDispatchUpdate
          )

          if (result.success) {
            await answerCallbackQuery(cbQueryId, '✅ Ürün onaylandı!')
            const variantNote = result.variantsCreated
              ? `\n📐 ${result.variantsCreated} beden varyantı oluşturuldu.`
              : ''
            await sendTelegramMessage(
              cbChatId,
              `✅ <b>Ürün #${session.productId} onaylandı!</b>${variantNote}\n\n` +
                `📋 confirmationStatus = confirmed\n` +
                `🤖 lastHandledByBot = uygunops\n` +
                `📝 BotEvent: product.confirmed kaydedildi.\n\n` +
                `🔄 Ürün GeoBot'a devrediliyor...`,
            )

            // ── Phase S: GeoBot visible handoff notification ─────────────────
            const geoToken = process.env.TELEGRAM_GEO_BOT_TOKEN
            const mentixGroupId = -5197796539
            if (geoToken) {
              try {
                await sendTelegramMessageAs(
                  geoToken,
                  mentixGroupId,
                  `📦 <b>Ürün #${session.productId} — GeoBot devir aldı</b>\n\n` +
                    `✅ Ops Bot onayı tamamlandı.${variantNote}\n` +
                    `🤖 İçerik üretimi başlatılıyor...\n\n` +
                    `Sonraki adımlar:\n` +
                    `• <code>/content ${session.productId}</code> — içerik durumu\n` +
                    `• <code>/audit ${session.productId}</code> — Mentix audit\n` +
                    `• <code>/preview ${session.productId}</code> — önizleme`,
                )
              } catch (handoffErr) {
                console.error('[telegram/webhook] Phase S GeoBot handoff notification failed:', handoffErr)
              }
            }
          } else {
            await answerCallbackQuery(cbQueryId, '❌ Onay başarısız')
            await sendTelegramMessage(
              cbChatId,
              `❌ Onay hatası: ${result.error}`,
            )
          }
          clearWizardSession(cbChatId, cbUserId)
        } catch (err) {
          await answerCallbackQuery(cbQueryId, '❌ Hata')
          console.error('[telegram/webhook] wz_confirm callback failed:', err)
        }
        return NextResponse.json({ ok: true })
      }

      // wz_cancel:{productId} — cancel wizard
      if (cbData.startsWith('wz_cancel:')) {
        try {
          const { clearWizardSession } = await import('@/lib/confirmationWizard')
          clearWizardSession(cbChatId, cbUserId)
          await answerCallbackQuery(cbQueryId, '❌ İptal edildi')
          await sendTelegramMessage(cbChatId, '❌ Onay sihirbazı iptal edildi.')
        } catch (err) {
          await answerCallbackQuery(cbQueryId, '❌ Hata')
          console.error('[telegram/webhook] wz_cancel callback failed:', err)
        }
        return NextResponse.json({ ok: true })
      }

      return NextResponse.json({ ok: true })
    }

    // ── Regular message handling ───────────────────────────────────────────
    const message = body?.message

    if (!message) {
      return NextResponse.json({ ok: true })
    }

    let text: string = message.text || message.caption || ''
    const chatId: number = message.chat?.id
    const messageId: number = message.message_id
    const chatType: string = message.chat?.type || 'private' // 'private' | 'group' | 'supergroup'
    const isGroupChat = chatType === 'group' || chatType === 'supergroup'
    // Phase P: operator userId for wizard session isolation in groups
    const msgUserId: number | undefined = message.from?.id

    // ── Phase N: Bot role separation ───────────────────────────────────────────
    // Geo_bot (@Geeeeobot) = group operator bot → active only in Mentix group
    // Uygunops (@Uygunops_bot) = DM operator bot → active only in private chats
    // This prevents overlap and operator confusion.
    if (botParam === 'geo' && !isGroupChat) {
      // Geo_bot received a DM → redirect operator to Uygunops
      await sendTelegramMessage(chatId, '📌 Bu bot sadece grup içinde çalışır.\nDM komutları için @Uygunops_bot kullanın.')
      return NextResponse.json({ ok: true })
    }
    if (botParam !== 'geo' && isGroupChat) {
      // Uygunops received a group message → silently ignore (Geo_bot owns group)
      console.log(`[telegram/phase-n] Uygunops ignoring group message in chat ${chatId} — Geo_bot owns group context`)
      return NextResponse.json({ ok: true })
    }

    // ── Phase I+K: Group chat activation filter ────────────────────────────────
    // In group/supergroup chats the bot only responds to INTENTIONAL activation:
    //   1. Slash commands  (/preview, /pipeline, …)
    //   2. @mention of the bot  (@Uygunops_bot)
    //   3. Reply to a message authored by the bot
    // Everything else (photos, plain text, background chatter) is silently ignored.
    // DM (private) behaviour remains unchanged.
    const BOT_ID = botParam === 'geo' ? 8728094008 : 8702872700
    const BOT_USERNAME_LC = botParam === 'geo' ? 'geeeeobot' : 'uygunops_bot'
    if (isGroupChat) {
      const isCommand = text.startsWith('/')
      // Phase O: check both message.entities AND message.caption_entities
      // Telegram puts entities in caption_entities for photos/documents with captions
      const allEntities = [
        ...(Array.isArray(message.entities) ? message.entities : []),
        ...(Array.isArray(message.caption_entities) ? message.caption_entities : []),
      ]
      const isMention = allEntities.some(
        (e: { type: string; offset: number; length: number }) => {
          if (e.type === 'mention') {
            const mentioned = text.substring(e.offset, e.offset + e.length).toLowerCase()
            return mentioned === '@' + BOT_USERNAME_LC
          }
          return e.type === 'text_mention' && (e as unknown as Record<string, unknown>)?.user?.id === BOT_ID
        },
      )
      const isReplyToBot = message.reply_to_message?.from?.id === BOT_ID
      // Phase O: allow hashtag triggers (#gorsel, #geminipro etc.) and STOCK batch commands
      // These are intentional operator commands, equivalent to slash commands
      const isHashtagTrigger = /^#(gorsel|geminipro|luma|chatgpt|claid)\b/i.test(text) ||
        /#gorsel/i.test(text)
      const isStockCommand = text.startsWith('STOCK SKU:')

      if (!isCommand && !isMention && !isReplyToBot && !isHashtagTrigger && !isStockCommand) {
        // Silently ignore non-activated messages in groups
        return NextResponse.json({ ok: true })
      }
    }

    const payload = await getPayload()

    // ── Phase I: Group allowlisting ──────────────────────────────────────────
    // When an activated message arrives from a group chat, verify:
    //   1. telegram.groupEnabled is ON in AutomationSettings
    //   2. The sender's Telegram user ID is in telegram.allowedUserIds
    // If either check fails, silently ignore the message.
    if (isGroupChat) {
      try {
        const autoSettings = await payload.findGlobal({ slug: 'automation-settings' })
        const telegramSettings = (autoSettings as Record<string, unknown>)?.telegram as Record<string, unknown> | undefined
        const groupEnabled = telegramSettings?.groupEnabled === true
        if (!groupEnabled) {
          console.log(`[telegram/group] Group mode disabled — ignoring command from chat ${chatId}`)
          return NextResponse.json({ ok: true })
        }

        const allowedRaw = (telegramSettings?.allowedUserIds as string) || ''
        const allowedIds = allowedRaw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
        const senderId = String(message.from?.id || '')
        if (allowedIds.length > 0 && !allowedIds.includes(senderId)) {
          console.log(`[telegram/group] User ${senderId} not in allowlist — ignoring command from chat ${chatId}`)
          return NextResponse.json({ ok: true })
        }
      } catch (err) {
        console.error('[telegram/group] Failed to check group settings:', err)
        // Fail-closed: if we can't verify settings, don't process group messages
        return NextResponse.json({ ok: true })
      }
    }

    // ── Phase L: Group mention normalization ────────────────────────────────────
    // Strip leading @bot mention and inline @bot suffix from slash commands so that
    // "@Uygunops_bot /preview 180" and "/preview@Uygunops_bot 180" route correctly.
    // Only applied in group chats where the message already passed both gates.
    // DM text is never modified.
    if (isGroupChat) {
      // 1. Strip leading "@Uygunops_bot " prefix (with optional whitespace)
      const leadingMention = new RegExp('^@' + BOT_USERNAME_LC + '\\s*', 'i')
      text = text.replace(leadingMention, '').trim()
      // 2. Strip "@Uygunops_bot" suffix on slash commands: /cmd@Uygunops_bot → /cmd
      const inlineBotSuffix = new RegExp('@' + BOT_USERNAME_LC, 'gi')
      text = text.replace(inlineBotSuffix, '').trim()
    }

    // ── Phase R: Command ownership split ───────────────────────────────────────
    // Ops Bot (Uygunops/@Uygunops_bot) owns: intake, image gen, confirmation, stock, diagnostics
    // GeoBot (@Geeeeobot) owns: content, audit, preview, activate, publish, merch, story
    // Shared: /pipeline (visible on both bots)
    // This teaches operators which bot handles which workflow.
    {
      const OPS_CMDS = ['/confirm', '/confirm_cancel', '/stok', '/diagnostics']
      const GEO_CMDS = ['/content', '/audit', '/preview', '/activate', '/shopier', '/merch', '/story', '/restory', '/targets', '/approve_story', '/reject_story']
      const OPS_HASHTAGS = ['#gorsel', '#geminipro']
      // Deactivated providers still show deactivation msg — keep them on ops side
      const OPS_HASHTAGS_DEACTIVATED = ['#luma', '#chatgpt', '#claid']

      const cmdLower = text.toLowerCase()
      const firstWord = cmdLower.split(/\s/)[0] // e.g. "/confirm" or "#gorsel"

      // Check slash command ownership
      if (text.startsWith('/')) {
        const isOpsCmd = OPS_CMDS.some(c => firstWord === c || firstWord.startsWith(c + '@'))
        const isGeoCmd = GEO_CMDS.some(c => firstWord === c || firstWord.startsWith(c + '@'))

        if (botParam === 'geo' && isOpsCmd) {
          await sendTelegramMessage(chatId, '📌 Bu komut <b>@Uygunops_bot</b> üzerinden çalışır.\nDM\'den deneyin.')
          return NextResponse.json({ ok: true })
        }
        if (botParam !== 'geo' && isGeoCmd) {
          await sendTelegramMessage(chatId, '📌 Bu komut <b>GeoBot</b> üzerinden çalışır.\nMentix grubunda @Geeeeobot ile deneyin.')
          return NextResponse.json({ ok: true })
        }
      }

      // Check hashtag trigger ownership
      if (text.startsWith('#')) {
        const isOpsHash = [...OPS_HASHTAGS, ...OPS_HASHTAGS_DEACTIVATED].some(h => cmdLower.startsWith(h))

        if (botParam === 'geo' && isOpsHash) {
          await sendTelegramMessage(chatId, '📌 Görsel üretimi <b>@Uygunops_bot</b> üzerinden çalışır.\nDM\'den deneyin.')
          return NextResponse.json({ ok: true })
        }
        // Note: no hashtag triggers belong to GeoBot currently
      }

      // Check STOCK batch command ownership (ops only)
      if (text.startsWith('STOCK ') && botParam === 'geo') {
        await sendTelegramMessage(chatId, '📌 Stok güncelleme <b>@Uygunops_bot</b> üzerinden çalışır.\nDM\'den deneyin.')
        return NextResponse.json({ ok: true })
      }
    }

    // ── Phase 5: Confirmation wizard text input interceptor ───────────────────
    // If there's an active wizard session expecting text input (price, sizes, stock),
    // intercept the message BEFORE any other command processing.
    if (text && !text.startsWith('/') && !text.startsWith('#') && !text.startsWith('STOCK ')) {
      const { getWizardSession, setWizardSession, clearWizardSession,
              parsePrice, parseSizes, parseStockNumber, getNextWizardStep,
              getCategoryPrompt, getProductTypePrompt,
              getSizesPrompt, getStockPrompt, getTargetsPrompt, getPricePrompt,
              getBrandPrompt, getTitlePrompt, getStockCodePrompt,
              formatConfirmationSummary } = await import('@/lib/confirmationWizard')
      const wizSession = getWizardSession(chatId, msgUserId)

      if (wizSession) {
        try {
          // ── Phase T1: Title step ───────────────────────────────────────
          if (wizSession.step === 'title') {
            const titleText = text.trim()
            if (!titleText || titleText.length < 5) {
              await sendTelegramMessage(chatId, '⚠️ Ürün adı en az 5 karakter olmalı.')
              return NextResponse.json({ ok: true })
            }
            wizSession.collected.title = titleText
            await sendTelegramMessage(chatId, `✅ Ürün adı: <b>${titleText}</b>`)

            const product = await payload.findByID({ collection: 'products', id: wizSession.productId })
            const nextStep = getNextWizardStep(product as any, wizSession.collected)
            wizSession.step = nextStep
            setWizardSession(chatId, wizSession, msgUserId)

            if (nextStep === 'stockCode') {
              await sendTelegramMessage(chatId, getStockCodePrompt((product as any).sku ?? '—'))
            } else if (nextStep === 'category') {
              const catPrompt = getCategoryPrompt()
              await sendTelegramMessageWithKeyboard(chatId, catPrompt.text, catPrompt.keyboard)
            } else if (nextStep === 'productType') {
              const ptypePrompt = getProductTypePrompt()
              await sendTelegramMessageWithKeyboard(chatId, ptypePrompt.text, ptypePrompt.keyboard)
            } else if (nextStep === 'price') {
              await sendTelegramMessage(chatId, getPricePrompt())
            } else if (nextStep === 'summary') {
              const summary = formatConfirmationSummary(product as any, wizSession.collected)
              await sendTelegramMessageWithKeyboard(chatId, summary, [
                [
                  { text: '✅ Onayla', callback_data: `wz_confirm:${wizSession.productId}` },
                  { text: '❌ İptal', callback_data: `wz_cancel:${wizSession.productId}` },
                ],
              ])
              wizSession.step = 'summary'
              setWizardSession(chatId, wizSession, msgUserId)
            }
            return NextResponse.json({ ok: true })
          }

          // ── Phase T1: Stock code step ──────────────────────────────────
          if (wizSession.step === 'stockCode') {
            const codeText = text.trim()
            // "-" means skip (keep auto-generated SKU)
            if (codeText !== '-') {
              if (codeText.length < 2) {
                await sendTelegramMessage(chatId, '⚠️ Stok kodu en az 2 karakter olmalı. Atlamak için <code>-</code> yazın.')
                return NextResponse.json({ ok: true })
              }
              wizSession.collected.stockCode = codeText
              await sendTelegramMessage(chatId, `✅ Stok kodu: <code>${codeText}</code>`)
            } else {
              wizSession.collected.stockCode = '_skip_'
              await sendTelegramMessage(chatId, '➡️ Stok kodu atlandı — otomatik kod korunuyor.')
            }

            const product = await payload.findByID({ collection: 'products', id: wizSession.productId })
            const nextStep = getNextWizardStep(product as any, wizSession.collected)
            wizSession.step = nextStep
            setWizardSession(chatId, wizSession, msgUserId)

            if (nextStep === 'category') {
              const catPrompt = getCategoryPrompt()
              await sendTelegramMessageWithKeyboard(chatId, catPrompt.text, catPrompt.keyboard)
            } else if (nextStep === 'productType') {
              const { getProductTypePrompt } = await import('@/lib/confirmationWizard')
              const ptypePrompt = getProductTypePrompt()
              await sendTelegramMessageWithKeyboard(chatId, ptypePrompt.text, ptypePrompt.keyboard)
            } else if (nextStep === 'price') {
              await sendTelegramMessage(chatId, getPricePrompt())
            } else if (nextStep === 'sizes') {
              wizSession.pendingSizes = []
              const sizeMsg = await sendTelegramMessageWithKeyboard(
                chatId,
                formatSizeSelectionText(new Set()),
                buildSizeKeyboard(new Set()),
              )
              if (sizeMsg) wizSession.sizeMessageId = sizeMsg
              setWizardSession(chatId, wizSession, msgUserId)
            } else if (nextStep === 'brand') {
              const { getBrandPrompt } = await import('@/lib/confirmationWizard')
              await sendTelegramMessage(chatId, getBrandPrompt())
            } else if (nextStep === 'targets') {
              const tgtPrompt = getTargetsPrompt()
              await sendTelegramMessageWithKeyboard(chatId, tgtPrompt.text, tgtPrompt.keyboard)
            } else if (nextStep === 'summary') {
              const summary = formatConfirmationSummary(product as any, wizSession.collected)
              await sendTelegramMessageWithKeyboard(chatId, summary, [
                [
                  { text: '✅ Onayla', callback_data: `wz_confirm:${wizSession.productId}` },
                  { text: '❌ İptal', callback_data: `wz_cancel:${wizSession.productId}` },
                ],
              ])
              wizSession.step = 'summary'
              setWizardSession(chatId, wizSession, msgUserId)
            }
            return NextResponse.json({ ok: true })
          }

          if (wizSession.step === 'price') {
            const price = parsePrice(text)
            if (!price) {
              await sendTelegramMessage(chatId, '⚠️ Geçersiz fiyat. Örnek: <code>899</code> veya <code>1299.90</code>')
              return NextResponse.json({ ok: true })
            }
            wizSession.collected.price = price
            await sendTelegramMessage(chatId, `✅ Fiyat: ₺${price}`)

            const product = await payload.findByID({ collection: 'products', id: wizSession.productId })
            const nextStep = getNextWizardStep(product as any, wizSession.collected)
            wizSession.step = nextStep
            setWizardSession(chatId, wizSession, msgUserId)

            if (nextStep === 'sizes') {
              wizSession.pendingSizes = []
              const sizeMsg = await sendTelegramMessageWithKeyboard(
                chatId,
                formatSizeSelectionText(new Set()),
                buildSizeKeyboard(new Set()),
              )
              if (sizeMsg) wizSession.sizeMessageId = sizeMsg
              setWizardSession(chatId, wizSession, msgUserId)
            } else if (nextStep === 'brand') {
              const { getBrandPrompt } = await import('@/lib/confirmationWizard')
              await sendTelegramMessage(chatId, getBrandPrompt())
            } else if (nextStep === 'targets') {
              const tgtPrompt = getTargetsPrompt()
              await sendTelegramMessageWithKeyboard(chatId, tgtPrompt.text, tgtPrompt.keyboard)
            } else if (nextStep === 'summary') {
              const summary = formatConfirmationSummary(product as any, wizSession.collected)
              await sendTelegramMessageWithKeyboard(chatId, summary, [
                [
                  { text: '✅ Onayla', callback_data: `wz_confirm:${wizSession.productId}` },
                  { text: '❌ İptal', callback_data: `wz_cancel:${wizSession.productId}` },
                ],
              ])
              wizSession.step = 'summary'
              setWizardSession(chatId, wizSession, msgUserId)
            }
            return NextResponse.json({ ok: true })
          }

          if (wizSession.step === 'sizes') {
            // Sizes step now uses inline keyboard buttons — redirect user
            await sendTelegramMessage(chatId, '👆 Yukarıdaki butonları kullanarak bedenleri seçin, sonra <b>Devam</b> basın.')
            return NextResponse.json({ ok: true })
          }

          if (wizSession.step === 'stock') {
            const stock = parseStockNumber(text)
            if (stock === null) {
              await sendTelegramMessage(chatId, '⚠️ Geçersiz stok sayısı. Pozitif tam sayı girin.')
              return NextResponse.json({ ok: true })
            }
            wizSession.collected.stockPerSize = stock
            const sizes = wizSession.collected.sizes?.split(',') ?? []
            const total = sizes.length * stock
            await sendTelegramMessage(chatId, `✅ Her bedenden ${stock} adet → Toplam: ${total}`)

            const product = await payload.findByID({ collection: 'products', id: wizSession.productId })
            const nextStep = getNextWizardStep(product as any, wizSession.collected)
            wizSession.step = nextStep
            setWizardSession(chatId, wizSession, msgUserId)

            if (nextStep === 'brand') {
              const { getBrandPrompt } = await import('@/lib/confirmationWizard')
              await sendTelegramMessage(chatId, getBrandPrompt())
            } else if (nextStep === 'targets') {
              const tgtPrompt = getTargetsPrompt()
              await sendTelegramMessageWithKeyboard(chatId, tgtPrompt.text, tgtPrompt.keyboard)
            } else if (nextStep === 'summary') {
              const summary = formatConfirmationSummary(product as any, wizSession.collected)
              await sendTelegramMessageWithKeyboard(chatId, summary, [
                [
                  { text: '✅ Onayla', callback_data: `wz_confirm:${wizSession.productId}` },
                  { text: '❌ İptal', callback_data: `wz_cancel:${wizSession.productId}` },
                ],
              ])
              wizSession.step = 'summary'
              setWizardSession(chatId, wizSession, msgUserId)
            }
            return NextResponse.json({ ok: true })
          }

          if (wizSession.step === 'brand') {
            const brandText = text.trim()
            if (!brandText || brandText.length < 2) {
              await sendTelegramMessage(chatId, '⚠️ Geçersiz marka adı. En az 2 karakter girin.')
              return NextResponse.json({ ok: true })
            }
            wizSession.collected.brand = brandText
            await sendTelegramMessage(chatId, `✅ Marka: ${brandText}`)

            const product = await payload.findByID({ collection: 'products', id: wizSession.productId })
            const nextStep = getNextWizardStep(product as any, wizSession.collected)
            wizSession.step = nextStep
            setWizardSession(chatId, wizSession, msgUserId)

            if (nextStep === 'targets') {
              const tgtPrompt = getTargetsPrompt()
              await sendTelegramMessageWithKeyboard(chatId, tgtPrompt.text, tgtPrompt.keyboard)
            } else if (nextStep === 'summary') {
              const summary = formatConfirmationSummary(product as any, wizSession.collected)
              await sendTelegramMessageWithKeyboard(chatId, summary, [
                [
                  { text: '✅ Onayla', callback_data: `wz_confirm:${wizSession.productId}` },
                  { text: '❌ İptal', callback_data: `wz_cancel:${wizSession.productId}` },
                ],
              ])
              wizSession.step = 'summary'
              setWizardSession(chatId, wizSession, msgUserId)
            }
            return NextResponse.json({ ok: true })
          }

          // If wizard is active but step doesn't expect text input, let it fall through
          // (e.g., summary step waiting for button, or targets step waiting for button)
        } catch (wizErr) {
          console.error('[telegram/webhook] wizard text interceptor failed:', wizErr)
          clearWizardSession(chatId, msgUserId)
          await sendTelegramMessage(chatId, '❌ Sihirbaz hatası. /confirm komutuyla tekrar başlayabilirsiniz.')
          return NextResponse.json({ ok: true })
        }
      }
    }

    // ── Fotoğraf → otomatik ürün oluştur ──────────────────────────────────────
    // Artık "bunu ürüne çevir" yazmak GEREKM. Her fotoğraf otomatik ürüne dönüşür.
    // Fotoğraf gönderilince ürün oluşturulur, ardından mod seçimi için butonlar
    // gösterilir (caption'da #hizli/#dengeli/#premium/#karma varsa direkt başlar).
    //
    // Geriye dönük uyumluluk: "bunu ürüne çevir" + reply senaryosu da çalışır.
    const isBunuUruneCevir =
      /bunu\s+[uü]r[uü]ne\s+[cç]evir/i.test(text) ||
      /[uü]r[uü]ne\s+[cç]evir/i.test(text)

    const replyPhoto = message.reply_to_message?.photo
    // Photo trigger: direct photo OR reply-to-photo (with or without trigger phrase)
    const activePhoto = message.photo || (isBunuUruneCevir ? replyPhoto : null)

    if (activePhoto) {
      // Reply senaryosunda caption, reply edilen mesajın caption'ından da alınabilir
      const replyCaption = message.reply_to_message?.caption || ''
      await sendTelegramMessage(chatId, '⏳ Ürün oluşturuluyor, lütfen bekleyin...')

      try {
        // 1. En yüksek çözünürlüklü fotoğrafı seç (activePhoto = direkt veya reply'daki foto)
        const photoArray = activePhoto as Array<{ file_id: string; width: number; height: number }>
        const photo = photoArray.sort((a, b) => b.width - a.width)[0]
        const fileId = photo.file_id

        // 2. Görsel mod tag'ini tespit et (caption temizlenmeden önce)
        //    "bunu ürüne çevir #hizli 1755 TL" → mod = 'hizli', otomatik image-gen kuyruğa alınır
        //    v19 Gemini-only: all engine tags → Gemini Pro
        const combinedRaw = text + (replyCaption ? '\n' + replyCaption : '')
        const autoGenMode: 'hizli' | 'dengeli' | 'premium' | 'karma' | null =
          /#karma/i.test(combinedRaw)   ? 'karma'   :
          /#premium/i.test(combinedRaw) ? 'premium' :
          /#dengeli/i.test(combinedRaw) ? 'dengeli' :
          /#hizli/i.test(combinedRaw)   ? 'hizli'   :
          null
        // v19 Gemini-only: engine tags simplified — all map to Gemini Pro
        // #geminipro still recognized for explicit opt-in; #chatgpt/#luma treated as Gemini
        const autoGenEngine: 'geminipro' | null =
          /#geminipro\b/i.test(combinedRaw) ? 'geminipro' :
          /#chatgpt\b/i.test(combinedRaw)   ? 'geminipro' :
          /#luma\b/i.test(combinedRaw)      ? 'geminipro' :
          null

        // v19 Gemini-only: #claid caption detection disabled — Claid removed from operator flow
        const isClaidCaption = false // was: /#claid\b/i.test(combinedRaw)

        // Caption temizle — bot mentions + trigger phrases + görsel hashtag'leri sil
        //    #hizli / #dengeli / #premium / #karma / #gorsel / #luma / #chatgpt / #geminipro
        //    #claid — gibi görsel tag'leri çıkarılır — "bunu ürüne çevir #claid 1755 TL"
        //    kullanımlarda parseTelegramCaption'ı bozmasın
        const BOT_MENTIONS = /(@Uygunops_bot|@uygunops_bot|@Geeeeobot|@geeeeobot|@mentix_aibot|@Mentix)/gi
        const GORSEL_TAGS  = /#(gorsel|hizli|dengeli|premium|karma|geminipro|chatgpt|luma|claid)\b/gi
        const combinedText = combinedRaw
        const cleanCaption = combinedText
          .replace(/bunu\s+[uü]r[uü]ne\s+[cç]evir/gi, '')
          .replace(/[uü]r[uü]ne\s+[cç]evir/gi, '')
          .replace(BOT_MENTIONS, '')
          .replace(GORSEL_TAGS, '')
          .trim()

        // 3. Caption'dan ürün bilgisi parse et
        const parsedCaption = cleanCaption ? parseTelegramCaption(cleanCaption) : null

        // 4. Fotoğrafı indir
        const fileData = await downloadTelegramFile(fileId)
        if (!fileData) {
          await sendTelegramMessage(chatId, '❌ Fotoğraf indirilemedi. Lütfen tekrar deneyin.')
          return NextResponse.json({ ok: true })
        }

        // 5. Claude Vision analizi (ANTHROPIC_API_KEY varsa)
        let visionData: Awaited<ReturnType<typeof analyzeProductWithVision>> = null
        if (process.env.ANTHROPIC_API_KEY) {
          visionData = await analyzeProductWithVision(fileData.buffer, fileData.contentType)
        }

        // 6. Bilgileri birleştir: caption > vision > default
        // Başlık: caption > vision > fallback (mesaj ID'si ile unique — aynı günde
        // birden fazla isimsiz ürün oluşturulduğunda slug unique constraint kırılmasın)
        const dateStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
        const title =
          parsedCaption?.title ||
          visionData?.title ||
          `Taslak Ürün ${dateStr}-${messageId}`

        const price = parsedCaption?.price ?? 0
        const category = parsedCaption?.category || (visionData?.category as string | undefined) || undefined
        const brand = parsedCaption?.brand || visionData?.brand || undefined
        const productType = parsedCaption?.productType || visionData?.productType || undefined
        const stockQty = parsedCaption?.quantity ?? 1

        // SKU: explicit > timestamp-based
        const sku = parsedCaption?.sku || `TG-${Date.now()}`

        // Slug: unique by appending sku
        const slug = slugify(title) + '-' + sku.toLowerCase().replace(/[^a-z0-9-]/g, '')

        // 6b. Media group (album) check — multiple photos of the SAME product
        // When Telegram sends an album, each photo arrives as a separate webhook
        // with the same media_group_id. We group them into one product.
        const mediaGroupId = (message.media_group_id as string | undefined) || null
        if (mediaGroupId) {
          const { docs: groupDocs } = await payload.find({
            collection: 'products',
            where: {
              and: [
                { 'automationMeta.telegramChatId': { equals: String(chatId) } },
                { 'automationMeta.telegramMediaGroupId': { equals: mediaGroupId } },
              ],
            },
            limit: 1,
            depth: 0,
          })

          if (groupDocs.length > 0) {
            // Product already created for this album — append this photo to it
            const groupProduct = groupDocs[0] as Record<string, unknown>
            const groupProductId = groupProduct.id as number
            const existingImages = (groupProduct.images as Array<{ image: number }> | undefined) ?? []

            const addFilename = `tg-${groupProductId}-${Date.now()}.${fileData.ext}`
            const addMedia = await payload.create({
              collection: 'media',
              data: {
                altText: String(groupProduct.title || 'Ürün'),
                product: groupProductId,
                type: 'original',
              },
              file: {
                data: fileData.buffer,
                mimetype: fileData.contentType,
                name: addFilename,
                size: fileData.buffer.length,
              },
            })

            await payload.update({
              collection: 'products',
              id: groupProductId,
              data: { images: [...existingImages, { image: addMedia.id }] },
            })

            const newCount = existingImages.length + 1
            await sendTelegramMessage(
              chatId,
              `📷 Fotoğraf eklendi (#${newCount}) — <b>${groupProduct.title}</b>\n` +
              `Toplam ${newCount} referans fotoğraf bu ürüne eklendi.\n` +
              `Görsel üretmek için:\n` +
              `<code>#gorsel ${groupProductId}</code> — ✨ Gemini Pro (3 sahne)`,
            )
            return NextResponse.json({ ok: true })
          }
          // else: first photo in this media group — proceed with product creation below
        }

        // 7. Idempotency check: aynı mesaj daha önce işlendi mi?
        const tgChatId = String(chatId)
        const tgMsgId = String(messageId)
        const existing = await payload.find({
          collection: 'products',
          where: {
            and: [
              { 'automationMeta.telegramChatId': { equals: tgChatId } },
              { 'automationMeta.telegramMessageId': { equals: tgMsgId } },
            ],
          },
          limit: 1,
        })
        if (existing.docs.length > 0) {
          const dup = existing.docs[0] as Record<string, unknown>
          await sendTelegramMessage(
            chatId,
            `ℹ️ Bu mesajdan zaten bir ürün oluşturulmuş:\n<b>${dup.title}</b>\nID: ${dup.id}`,
          )
          return NextResponse.json({ ok: true })
        }

        // 8. AutomationSettings + status kararı
        const automationSettings = await fetchAutomationSettings(payload)
        const statusDecision = resolveProductStatus(
          {
            parseConfidence: parsedCaption?.parseConfidence ?? null,
            readiness: {
              isReady: false,
              missingCritical: price === 0 ? ['Fiyat girilmemiş'] : [],
              warnings: [],
              score: parsedCaption?.parseConfidence ?? 30,
            },
            productAutoActivateOverride: null,
            explicitStatus: null,
          },
          automationSettings,
        )

        const channelDecision = resolveChannelTargets(['website'], automationSettings)

        // 9. Ürün oluştur
        const product = await payload.create({
          collection: 'products',
          data: {
            title,
            slug,
            sku,
            price,
            status: statusDecision.status,
            stockQuantity: stockQty,
            source: 'telegram',
            ...(category ? { category } : {}),
            ...(brand ? { brand } : {}),
            ...(productType ? { productType } : {}),
            channelTargets: channelDecision.effectiveTargets as any,
            channels: {
              publishWebsite: channelDecision.effectiveTargets.includes('website'),
              publishInstagram: false,
              publishShopier: false,
              publishDolap: false,
            },
            automationMeta: {
              telegramChatId: tgChatId,
              telegramMessageId: tgMsgId,
              ...(mediaGroupId ? { telegramMediaGroupId: mediaGroupId } : {}),
              rawCaption: cleanCaption || text,
              parseConfidence: parsedCaption?.parseConfidence ?? 0,
              parseWarnings: JSON.stringify(parsedCaption?.parseWarnings ?? []),
              autoDecision: statusDecision.status,
              autoDecisionReason: statusDecision.reason,
              visionUsed: !!visionData,
            },
          },
        })

        const productId = product.id as number

        // 10. Fotoğrafı Media koleksiyonuna yükle + ürüne ekle
        const filename = `tg-${productId}-${Date.now()}.${fileData.ext}`
        const media = await payload.create({
          collection: 'media',
          data: {
            altText: title,
            product: productId,
            type: 'original',
          },
          file: {
            data: fileData.buffer,
            mimetype: fileData.contentType,
            name: filename,
            size: fileData.buffer.length,
          },
        })

        await payload.update({
          collection: 'products',
          id: productId,
          data: {
            images: [{ image: media.id }],
          },
        })

        // 11. Telegram'a başarı bildirimi — eksik alanları açıkça göster
        const statusEmoji = statusDecision.status === 'active' ? '🟢' : '📋'
        const statusLabel = statusDecision.status === 'active' ? 'Yayında' : 'Taslak'
        const visionLabel = visionData ? ' 🤖' : ''

        // Eksik alanları listele (sadece kategori/marka — fiyat admin'den girilebilir)
        const missing: string[] = []
        if (!category) missing.push('Kategori')
        if (!brand) missing.push('Marka')

        const missingBlock = missing.length > 0
          ? `\n💡 <i>Eksik: ${missing.join(', ')}</i>` +
            `\n📋 <code>/confirm ${productId}</code> — Onay sihirbazıyla tamamla`
          : `\n📋 <code>/confirm ${productId}</code> — Ürünü onayla`

        const confidenceBar = parsedCaption?.parseConfidence
          ? ` (${parsedCaption.parseConfidence}% güven)`
          : ''

        // 12. Görsel tag varsa → otomatik görsel üretim kuyruğa al
        //    v19 Gemini-only: all caption mode/engine tags → Gemini Pro
        const effectiveEngine = autoGenEngine
        let autoGenJobId: string | null = null
        if (autoGenMode || effectiveEngine) {
          try {
            const autoJobDoc = await payload.create({
              collection: 'image-generation-jobs',
              data: {
                jobTitle: `${title} — ✨ Gemini Pro`,
                product: productId,
                mode: autoGenMode ?? 'hizli',
                status: 'queued',
                telegramChatId: tgChatId,
                requestedByUserId: String(message.from?.id ?? ''),
              },
            })

            // v18: all auto-gen → Gemini Pro regardless of tag
            await payload.jobs.queue({
              task: 'image-gen',
              input: { jobId: String(autoJobDoc.id), stage: 'standard', provider: 'gemini-pro' },
              overrideAccess: true,
            })
            autoGenJobId = String(autoJobDoc.id)

            // VF-2: Set product visualStatus = generating when auto-gen starts at intake
            await updateProductVisualStatus(payload, productId, 'generating')
          } catch (err) {
            console.error('[telegram/webhook] auto gen queue failed:', err)
          }
        }

        const modeEmojiMap: Record<string, string> = {
          hizli: '⚡', dengeli: '⚖️', premium: '💎', karma: '🌈',
        }

        const productSummary =
          `✅ <b>Ürün oluşturuldu${visionLabel}${confidenceBar}</b>\n\n` +
          `📦 <b>${title}</b>\n` +
          `SKU: <code>${sku}</code>\n` +
          `Fiyat: ${price > 0 ? `${price} ₺` : '—'}\n` +
          `Kategori: ${category || '—'}\n` +
          `Marka: ${brand || '—'}\n` +
          `Stok: ${stockQty} adet\n` +
          `Durum: ${statusEmoji} ${statusLabel}` +
          missingBlock +
          `\n\n🔗 <a href="https://www.uygunayakkabi.com/admin/collections/products/${productId}">Admin'de aç</a>`

        if (isClaidCaption) {
          // #claid in caption → skip Gemini queue, show Claid mode keyboard immediately
          const { CLAID_MODE_LABELS, CLAID_MODE_DESCRIPTIONS } = await import('@/lib/claidProvider')
          await sendTelegramMessageWithKeyboard(
            chatId,
            productSummary + `\n\n🧴 <b>Claid iyileştirme modu seçin:</b>\n\n` +
            `<b>🧹 Ürün Temizleme</b>\n<i>${CLAID_MODE_DESCRIPTIONS.cleanup}</i>\n\n` +
            `<b>✨ Stüdyo Geliştirme</b>\n<i>${CLAID_MODE_DESCRIPTIONS.studio}</i>\n\n` +
            `<b>🎨 Kreatif Arka Plan</b>\n<i>${CLAID_MODE_DESCRIPTIONS.creative}</i>`,
            [
              [{ text: `🧹 ${CLAID_MODE_LABELS.cleanup}`,  callback_data: `claidmode:${productId}:cleanup` }],
              [{ text: `✨ ${CLAID_MODE_LABELS.studio}`,   callback_data: `claidmode:${productId}:studio` }],
              [{ text: `🎨 ${CLAID_MODE_LABELS.creative}`, callback_data: `claidmode:${productId}:creative` }],
              [{ text: '❌ İptal (sadece kaydet)',          callback_data: `imagegen:${productId}:skip` }],
            ],
          )
        } else if (autoGenJobId && (autoGenMode || autoGenEngine)) {
          // Engine/mode was pre-selected in caption — show plain confirmation
          // v18 Gemini-only: single label regardless of tag
          const autoConfirmLabel = '✨ <b>Gemini Pro görsel üretimi başlatıldı</b> — 3 sahne — tamamlanınca bildirim gelecek'
          await sendTelegramMessage(
            chatId,
            productSummary + `\n\n${autoConfirmLabel}`,
          )
        } else {
          // Default post-product keyboard: Gemini Pro + skip (v19 Gemini-only)
          await sendTelegramMessageWithKeyboard(
            chatId,
            productSummary + `\n\n🎨 <b>Görsel üretmek ister misiniz?</b>`,
            [
              [{ text: '✨ Gemini Pro (3 sahne üret)',  callback_data: `imagegen:${productId}:geminipro` }],
              [{ text: '❌ Hayır, sadece kaydet',       callback_data: `imagegen:${productId}:skip` }],
            ],
          )
        }

        // Job runner — response gönderildikten sonra çalıştır (after ile timeout yok)
        if (autoGenJobId) {
          after(async () => {
            try {
              await payload.jobs.run({ limit: 1, overrideAccess: true })
            } catch (err) {
              console.error('[telegram/webhook] after() jobs.run failed:', err)
            }
          })
        }

        return NextResponse.json({ ok: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[telegram/webhook] bunu-urune-cevir failed:', msg)
        await sendTelegramMessage(
          chatId,
          `❌ Ürün oluşturulurken hata oluştu:\n<code>${msg.slice(0, 200)}</code>`,
        )
        return NextResponse.json({ ok: true })
      }
    }

    // ── #gorsel — AI Product Image Generation ────────────────────────────────
    // Triggers: "#gorsel", "bunu görsel üret", "görsel üret"
    // Mode tags: #hizli (default), #dengeli, #premium, #karma
    // Product discovery (v26 — auto-resolve):
    //   A) Reply to ANY bot message containing product context → resolveProductFromReply()
    //      (admin URL, inline keyboard callback_data, "ID: N", "#gorsel N")
    //   B) Explicit: "#gorsel 42" or "#gorsel 42 #premium"
    //   C) Inline button: imagegen:{productId}:geminipro (handled in callback section above)
    const isGorselTrigger =
      /#gorsel/i.test(text) ||
      /bunu\s+g[oö]rsel\s+[uü]ret/i.test(text) ||
      /g[oö]rsel\s+[uü]ret/i.test(text)

    if (isGorselTrigger) {
      // Detect generation mode from hashtags in message text (cosmetic — Luma ignores mode)
      const genMode: 'hizli' | 'dengeli' | 'premium' | 'karma' =
        /#karma/i.test(text)   ? 'karma'   :
        /#premium/i.test(text) ? 'premium' :
        /#dengeli/i.test(text) ? 'dengeli' :
        'hizli'

      // v16: Stage 1 is always Luma — genProvider removed.
      // OpenAI image generation is no longer active for Stage 1.
      // Stage 2 (slots 4-5) remains Gemini Pro via the imgpremium button.

      // ── Find product ID (v26 — auto-resolve from context) ──────────────────
      // Priority: 1) reply-to message context  2) explicit ID in command text
      let gorselProductId: number | null = resolveProductFromReply(
        message.reply_to_message as Record<string, unknown> | undefined,
      )

      // Fallback: explicit ID in the command — "#gorsel 42" or "#gorsel 42 #premium"
      if (!gorselProductId) {
        const idMatch = text.match(/#gorsel\s+(\d+)/i)
        if (idMatch) gorselProductId = parseInt(idMatch[1])
      }

      if (!gorselProductId) {
        await sendTelegramMessage(
          chatId,
          '❌ <b>Ürün bulunamadı.</b>\n\n' +
          'Lütfen ürün mesajına <b>reply</b> yapın veya geçerli bir ürün butonundan başlatın.\n\n' +
          'Alternatif: <code>#gorsel 42</code> (ürün ID ile)',
        )
        return NextResponse.json({ ok: true })
      }

      // Verify product exists
      const { docs: gorselDocs } = await payload.find({
        collection: 'products',
        where: { id: { equals: gorselProductId } },
        limit: 1,
        depth: 0,
      })
      if (gorselDocs.length === 0) {
        await sendTelegramMessage(chatId, `❌ Ürün bulunamadı: #${gorselProductId}`)
        return NextResponse.json({ ok: true })
      }
      const gorselProduct = gorselDocs[0] as Record<string, unknown>

      // Dedup guard — prevent duplicate jobs for the same product
      const { docs: activeGorselJobs } = await payload.find({
        collection: 'image-generation-jobs',
        where: {
          and: [
            { product: { equals: gorselProductId } },
            { status: { in: ['queued', 'generating', 'preview'] } },
          ],
        },
        limit: 1,
        depth: 0,
      })
      if (activeGorselJobs.length > 0) {
        await sendTelegramMessage(
          chatId,
          `⏳ <b>Bu ürün için zaten aktif bir görsel üretimi var.</b>\n\n` +
          `Mevcut iş tamamlanana kadar yeni iş başlatılamaz.\n` +
          `Durumu kontrol edin veya mevcut önizlemeyi onaylayın/reddedin.`,
        )
        return NextResponse.json({ ok: true })
      }

      // Create ImageGenerationJob record — imageGenTask will look up the
      // reference image from the product's images array at run time.
      const modeLabelMap: Record<string, string> = {
        hizli: '⚡ Hızlı', dengeli: '⚖️ Dengeli', premium: '💎 Premium', karma: '🌈 Karma',
      }
      // v18 Gemini-only debug phase
      const jobDoc = await payload.create({
        collection: 'image-generation-jobs',
        data: {
          jobTitle: `${gorselProduct.title} — ✨ Gemini Pro`,
          product: gorselProductId,
          mode: genMode,
          status: 'queued',
          telegramChatId: String(chatId),
          requestedByUserId: String(message.from?.id ?? ''),
        },
      })

      await payload.jobs.queue({
        task: 'image-gen',
        input: { jobId: String(jobDoc.id), stage: 'standard', provider: 'gemini-pro' },
        overrideAccess: true,
      })

      // VF-2: Set product visualStatus = generating when image gen starts
      await updateProductVisualStatus(payload, gorselProductId, 'generating')

      await sendTelegramMessage(
        chatId,
        `✨ <b>Gemini Pro görsel üretimi başlatıldı!</b>\n\n` +
        `📦 Ürün: <b>${gorselProduct.title}</b>\n` +
        `🤖 Provider: ✨ Gemini Pro\n` +
        `🖼️ 3 sahne üretilecek\n\n` +
        `<i>Tamamlanınca bildirim gelecek.</i>`,
      )

      // Job runner — response gönderildikten sonra çalıştır (after ile timeout yok)
      after(async () => {
        try {
          await payload.jobs.run({ limit: 1, overrideAccess: true })
        } catch (err) {
          console.error('[telegram/webhook] after() #gorsel jobs.run failed:', err)
        }
      })

      return NextResponse.json({ ok: true })
    }

    // ── #luma — Luma AI Studio Angles Image Generation (Step 26) ─────────────
    // Triggers: "#luma" (+ optional product ID or reply to product creation msg)
    // Generates 3 studio angle shots (front, side, 3/4) via Luma photon-flash-1.
    // HQ flag: "#luma #hq" → uses photon-1 model.
    //
    // Product discovery (same pattern as #gorsel):
    //   A) Reply to bot's product creation message → extracts product ID from URL
    //   B) Explicit: "#luma 42" or "#luma 42 #hq"
    const isLumaTrigger = /#luma\b/i.test(text)

    if (isLumaTrigger) {
      // v18 Gemini-only debug phase: Luma deactivated — redirect to Gemini
      await sendTelegramMessage(
        chatId,
        `⛔ <b>Luma şu an devre dışı.</b>\n\n` +
        `Görsel üretimi için: <code>#gorsel</code> veya <code>#geminipro</code> kullanın.\n` +
        `✨ Aktif motor: Gemini Pro`,
      )
      return NextResponse.json({ ok: true })
    }

    // v18 NOTE: #luma full handler removed — deactivated for Gemini-only debug phase.
    // Restore from git history (commit a27b78a) when re-enabling Luma.

    // ── #chatgpt — ChatGPT (OpenAI gpt-image-1) Stage 1 ─────────────────────
    // Triggers: "#chatgpt 42" or reply + "#chatgpt"
    // Queues image-gen with provider='openai', stage='standard' (slots 1-3).
    const isChatGptTrigger = /#chatgpt\b/i.test(text)

    if (isChatGptTrigger) {
      // v18 Gemini-only debug phase: ChatGPT deactivated
      await sendTelegramMessage(
        chatId,
        `⛔ <b>ChatGPT görsel üretimi şu an devre dışı.</b>\n\n` +
        `Görsel üretimi için: <code>#gorsel</code> veya <code>#geminipro</code> kullanın.\n` +
        `✨ Aktif motor: Gemini Pro`,
      )
      return NextResponse.json({ ok: true })
    }
    // v18 NOTE: #chatgpt full handler removed — restore from git history (a27b78a) when re-enabling.

    // ── #geminipro — Gemini Pro Stage 1 image generation ─────────────────────
    // Triggers: "#geminipro 42" or reply + "#geminipro"
    // Queues image-gen with provider='gemini-pro', stage='standard' (slots 1-3).
    // Operator explicit opt-in to Gemini Pro Stage 1 — separate from Luma default.
    const isGeminiProTrigger = /#geminipro\b/i.test(text)

    if (isGeminiProTrigger) {
      // ── Find product ID (v26 — auto-resolve from context) ──────────────────
      let gpProductId: number | null = resolveProductFromReply(
        message.reply_to_message as Record<string, unknown> | undefined,
      )

      // Fallback: explicit ID — "#geminipro 42"
      if (!gpProductId) {
        const idMatch = text.match(/#geminipro\s+(\d+)/i)
        if (idMatch) gpProductId = parseInt(idMatch[1])
      }

      if (!gpProductId) {
        await sendTelegramMessage(
          chatId,
          '❌ <b>Ürün bulunamadı.</b>\n\n' +
          'Lütfen ürün mesajına <b>reply</b> yapın veya geçerli bir ürün butonundan başlatın.\n\n' +
          'Alternatif: <code>#geminipro 42</code> (ürün ID ile)',
        )
        return NextResponse.json({ ok: true })
      }

      // Verify product exists
      const { docs: gpDocs } = await payload.find({
        collection: 'products',
        where: { id: { equals: gpProductId } },
        limit: 1,
        depth: 0,
      })
      if (gpDocs.length === 0) {
        await sendTelegramMessage(chatId, `❌ Ürün bulunamadı: #${gpProductId}`)
        return NextResponse.json({ ok: true })
      }
      const gpProduct = gpDocs[0] as Record<string, unknown>

      const gpJobDoc = await payload.create({
        collection: 'image-generation-jobs',
        data: {
          jobTitle: `${gpProduct.title} — Gemini Pro Stüdyo`,
          product: gpProductId,
          mode: 'hizli',
          status: 'queued',
          telegramChatId: String(chatId),
          requestedByUserId: String(message.from?.id ?? ''),
        },
      })

      await payload.jobs.queue({
        task: 'image-gen',
        input: { jobId: String(gpJobDoc.id), stage: 'standard', provider: 'gemini-pro' },
        overrideAccess: true,
      })

      await sendTelegramMessage(
        chatId,
        `✨ <b>Gemini Pro görsel üretimi başlatıldı!</b>\n\n` +
        `📦 Ürün: <b>${gpProduct.title}</b>\n` +
        `🤖 Provider: ✨ Gemini Pro\n` +
        `🖼️ 3 sahne üretilecek\n\n` +
        `<i>Tamamlanınca Telegram'a önizleme gönderilecek.</i>`,
      )

      after(async () => {
        try {
          await payload.jobs.run({ limit: 1, overrideAccess: true })
        } catch (err) {
          console.error('[telegram/webhook] after() #geminipro jobs.run failed:', err)
        }
      })

      return NextResponse.json({ ok: true })
    }

    // ── #claid — Claid.ai Product Photo Enhancement ───────────────────────────
    // Triggers: "#claid 42" or reply to product creation message + "#claid"
    // Shows a mode selection keyboard — no job is created until the operator
    // chooses a mode (claidmode: callback).
    //
    // Modes:
    //   cleanup  — white background, upscale, sharpen (marketplace-ready)
    //   studio   — premium contrast/HDR, no background change
    //   creative — editorial grey background, mild enhancement
    const isClaidTrigger = /#claid\b/i.test(text)

    if (isClaidTrigger) {
      // v19 Gemini-only: Claid deactivated
      await sendTelegramMessage(
        chatId,
        `⛔ <b>Claid şu an devre dışı.</b>\n\n` +
        `Görsel üretimi için: <code>#gorsel</code> kullanın.\n` +
        `✨ Aktif motor: Gemini Pro`,
      )
      return NextResponse.json({ ok: true })
    }

    // ── Preview approval text commands ────────────────────────────────────────
    // Handles plain-text approval commands for the most recent 'preview' job
    // in this chat. These mirror the inline keyboard buttons but allow
    // partial-slot approval and other fine-grained control.
    //
    // Commands:
    //   onayla / approve          → approve ALL slots
    //   onayla 1,2,4              → approve specific 1-based slot indices
    //   approve 1,3               → (English variant)
    //   reddet / reject / cancel  → reject, no images attached to product
    //   yeniden üret / regenerate → discard + re-queue generation
    const trimmedText = text.trim()
    const isApproveCmd = /^(onayla|approve)\b/i.test(trimmedText)
    const isRejectCmd = /^(reddet|reject|cancel)\b/i.test(trimmedText)
    const isRegenCmd = /^(yeniden\s*[uü]ret|regenerate)\b/i.test(trimmedText)

    if (isApproveCmd || isRejectCmd || isRegenCmd) {
      // Find the most recent job awaiting Telegram approval for this chat.
      // Looks for 'preview' OR 'review' — 'preview' is the intended status after
      // v10.2, but 'review' is used as a fallback when the Postgres enum hasn't
      // yet been updated with the 'preview' value (push: true migration lag).
      const { docs: previewJobs } = await payload.find({
        collection: 'image-generation-jobs',
        where: {
          and: [
            { telegramChatId: { equals: String(chatId) } },
            {
              or: [
                { status: { equals: 'preview' } },
                { status: { equals: 'review' } },
              ],
            },
          ],
        },
        sort: '-createdAt',
        limit: 1,
        depth: 0,
      })

      if (previewJobs.length === 0) {
        await sendTelegramMessage(
          chatId,
          '⚠️ Onay bekleyen bir görsel önizlemesi bulunamadı.\n' +
          'Önce <code>#gorsel</code> komutuyla görsel üretin.',
        )
        return NextResponse.json({ ok: true })
      }

      const previewJob = previewJobs[0] as Record<string, unknown>
      const previewJobId = String(previewJob.id)

      if (isApproveCmd) {
        // Check for specific slot indices: "onayla 1,2,4" or "approve 1,3"
        const slotsMatch = trimmedText.match(/[\d,\s]+$/)
        const slotsStr = slotsMatch ? slotsMatch[0].trim() : 'all'

        try {
          await approveImageGenJob(payload, previewJobId, slotsStr, chatId)
        } catch (err) {
          console.error('[telegram/webhook] approve text command failed:', err)
          await sendTelegramMessage(chatId, `❌ Onaylama hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
        }
      } else if (isRejectCmd) {
        try {
          await rejectImageGenJob(payload, previewJobId, chatId)
        } catch (err) {
          console.error('[telegram/webhook] reject text command failed:', err)
        }
      } else if (isRegenCmd) {
        try {
          await regenImageGenJob(payload, previewJobId, chatId)
        } catch (err) {
          console.error('[telegram/webhook] regen text command failed:', err)
          await sendTelegramMessage(chatId, `❌ Yeniden üretim başlatılamadı: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
        }
      }

      return NextResponse.json({ ok: true })
    }

    // ── /shopier commands ─────────────────────────────────────────────────────
    if (text.startsWith('/shopier')) {
      const parts = text.trim().split(/\s+/)
      const subCommand = parts[1]?.toLowerCase()
      const arg = parts[2]

      // /shopier publish <productId>
      if (subCommand === 'publish' && arg) {
        try {
          if (!process.env.SHOPIER_PAT) {
            await sendTelegramMessage(chatId, '❌ SHOPIER_PAT tanımlı değil — Shopier sync devre dışı')
            return NextResponse.json({ ok: true })
          }
          const { docs: pDocs } = await payload.find({
            collection: 'products',
            where: { id: { equals: arg } },
            depth: 0,
            limit: 1,
          })
          if (pDocs.length === 0) {
            await sendTelegramMessage(chatId, `❌ Ürün bulunamadı: ${arg}`)
            return NextResponse.json({ ok: true })
          }
          const pDoc = pDocs[0] as Record<string, unknown>
          const pMeta = (pDoc.sourceMeta as Record<string, unknown>) ?? {}
          await payload.update({
            collection: 'products',
            id: arg,
            data: { sourceMeta: { ...pMeta, shopierSyncStatus: 'queued' } },
            context: { isDispatchUpdate: true },
          })
          await payload.jobs.queue({
            task: 'shopier-sync',
            input: { productId: arg, notifyTelegramChatId: chatId },
            overrideAccess: true,
          })
          await sendTelegramMessage(
            chatId,
            `⏳ Shopier sync kuyruğa alındı\nÜrün: ${pDoc.title ?? arg}\n\nSync tamamlanınca bildirim gelecek.`,
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await sendTelegramMessage(chatId, `❌ Shopier publish hatası: ${msg}`)
        }
        return NextResponse.json({ ok: true })
      }

      // /shopier republish <productId>
      if (subCommand === 'republish' && arg) {
        try {
          if (!process.env.SHOPIER_PAT) {
            await sendTelegramMessage(chatId, '❌ SHOPIER_PAT tanımlı değil — Shopier sync devre dışı')
            return NextResponse.json({ ok: true })
          }
          const { docs: rDocs } = await payload.find({
            collection: 'products',
            where: { id: { equals: arg } },
            depth: 0,
            limit: 1,
          })
          if (rDocs.length === 0) {
            await sendTelegramMessage(chatId, `❌ Ürün bulunamadı: ${arg}`)
            return NextResponse.json({ ok: true })
          }
          const rDoc = rDocs[0] as Record<string, unknown>
          const rMeta = (rDoc.sourceMeta as Record<string, unknown>) ?? {}
          await payload.update({
            collection: 'products',
            id: arg,
            data: { sourceMeta: { ...rMeta, shopierSyncStatus: 'queued' } },
            context: { isDispatchUpdate: true },
          })
          await payload.jobs.queue({
            task: 'shopier-sync',
            input: { productId: arg, notifyTelegramChatId: chatId },
            overrideAccess: true,
          })
          await sendTelegramMessage(
            chatId,
            `🔄 Shopier tekrar sync kuyruğa alındı\nÜrün: ${rDoc.title ?? arg}\n\nSync tamamlanınca bildirim gelecek.`,
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await sendTelegramMessage(chatId, `❌ Shopier republish hatası: ${msg}`)
        }
        return NextResponse.json({ ok: true })
      }

      // /shopier status <productId>
      if (subCommand === 'status' && arg) {
        try {
          const { docs } = await payload.find({
            collection: 'products',
            where: { id: { equals: arg } },
            depth: 0,
            limit: 1,
          })
          if (docs.length === 0) {
            await sendTelegramMessage(chatId, `❌ Ürün bulunamadı: ${arg}`)
          } else {
            const p = docs[0] as Record<string, unknown>
            const sm = (p.sourceMeta as Record<string, unknown>) ?? {}
            const status = (sm.shopierSyncStatus as string) || 'not_synced'
            const shopId = (sm.shopierProductId as string) || '—'
            const shopUrl = (sm.shopierProductUrl as string) || '—'
            const lastSync = (sm.shopierLastSyncAt as string) || '—'
            const lastErr = (sm.shopierLastError as string) || '—'
            await sendTelegramMessage(
              chatId,
              `📊 Shopier Durumu — ${p.title}\n\n` +
                `Durum: ${status}\nShopier ID: ${shopId}\nURL: ${shopUrl}\nSon Sync: ${lastSync}\nSon Hata: ${lastErr}`,
            )
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await sendTelegramMessage(chatId, `❌ Hata: ${msg}`)
        }
        return NextResponse.json({ ok: true })
      }

      // /shopier url <productId>
      if (subCommand === 'url' && arg) {
        try {
          const { docs } = await payload.find({
            collection: 'products',
            where: { id: { equals: arg } },
            depth: 0,
            limit: 1,
          })
          if (docs.length === 0) {
            await sendTelegramMessage(chatId, `❌ Ürün bulunamadı: ${arg}`)
          } else {
            const sm = ((docs[0] as Record<string, unknown>).sourceMeta as Record<string, unknown>) ?? {}
            const url = (sm.shopierProductUrl as string) || 'Henüz yayınlanmadı'
            await sendTelegramMessage(chatId, `🔗 Shopier URL: ${url}`)
          }
        } catch (err) {
          await sendTelegramMessage(chatId, `❌ Hata: ${err}`)
        }
        return NextResponse.json({ ok: true })
      }

      // /shopier publish-ready
      if (subCommand === 'publish-ready') {
        try {
          const { docs } = await payload.find({
            collection: 'products',
            where: {
              and: [
                { status: { equals: 'active' } },
                { 'channels.publishShopier': { equals: true } },
              ],
            },
            depth: 0,
            limit: 50,
          })
          const toSync = docs.filter((d: Record<string, unknown>) => {
            const sm = (d.sourceMeta as Record<string, unknown>) ?? {}
            return !sm.shopierProductId
          })
          if (toSync.length === 0) {
            await sendTelegramMessage(chatId, '✅ Shopier\'e yayınlanacak yeni ürün yok.')
            return NextResponse.json({ ok: true })
          }
          await sendTelegramMessage(chatId, `⏳ ${toSync.length} ürün Shopier sync kuyruğuna alınıyor...`)
          let queued = 0
          for (const p of toSync) {
            const pMeta = ((p as Record<string, unknown>).sourceMeta as Record<string, unknown>) ?? {}
            await payload.update({
              collection: 'products',
              id: p.id,
              data: { sourceMeta: { ...pMeta, shopierSyncStatus: 'queued' } },
              context: { isDispatchUpdate: true },
            })
            await payload.jobs.queue({
              task: 'shopier-sync',
              input: { productId: String(p.id) },
              overrideAccess: true,
            })
            queued++
          }
          await sendTelegramMessage(
            chatId,
            `✅ ${queued} ürün Shopier sync kuyruğuna alındı.\n\nDurumları kontrol etmek için: /shopier status <id>`,
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await sendTelegramMessage(chatId, `❌ Toplu yayın hatası: ${msg}`)
        }
        return NextResponse.json({ ok: true })
      }

      // /shopier errors
      if (subCommand === 'errors') {
        try {
          const { docs } = await payload.find({
            collection: 'products',
            where: { 'sourceMeta.shopierSyncStatus': { equals: 'error' } },
            depth: 0,
            limit: 10,
            sort: '-updatedAt',
          })
          if (docs.length === 0) {
            await sendTelegramMessage(chatId, '✅ Shopier sync hatası yok.')
          } else {
            const lines = docs.map((d: Record<string, unknown>) => {
              const sm = (d.sourceMeta as Record<string, unknown>) ?? {}
              return `• ${d.title} (${d.id})\n  Hata: ${(sm.shopierLastError as string)?.slice(0, 100) || '?'}`
            })
            await sendTelegramMessage(chatId, `❌ Son Shopier hataları:\n\n${lines.join('\n\n')}`)
          }
        } catch (err) {
          await sendTelegramMessage(chatId, `❌ Hata: ${err}`)
        }
        return NextResponse.json({ ok: true })
      }

      await sendTelegramMessage(
        chatId,
        '📋 Shopier komutları:\n\n' +
          '/shopier publish <id> — Ürünü yayınla\n' +
          '/shopier republish <id> — Tekrar senkronla\n' +
          '/shopier status <id> — Sync durumu\n' +
          '/shopier url <id> — Shopier linki\n' +
          '/shopier publish-ready — Tüm hazır ürünleri yayınla\n' +
          '/shopier errors — Son hataları listele',
      )
      return NextResponse.json({ ok: true })
    }

    // ── Phase 11: Merchandising Commands ────────────────────────────────────
    // /merch status <id> — show merchandising state
    // /merch popular add/remove <id> — toggle manual popular flag
    // /merch deal add/remove <id> — toggle manual deal flag
    // /merch bestseller pin/unpin/exclude/include <id> — bestseller controls
    // /merch preview — show section summaries
    if (text.startsWith('/merch')) {
      const parts = text.trim().split(/\s+/)
      const subCmd = parts[1]?.toLowerCase()

      // /merch (no arg) — help
      if (!subCmd) {
        await sendTelegramMessage(
          chatId,
          '🏪 <b>Merchandising Yönetimi</b>\n\n' +
            '/merch status <id> — Ürün merchandising durumu\n' +
            '/merch preview — Bölüm özetleri\n' +
            '/merch popular add <id> — Popüler olarak işaretle\n' +
            '/merch popular remove <id> — Popüler işaretini kaldır\n' +
            '/merch deal add <id> — Fırsat olarak işaretle\n' +
            '/merch deal remove <id> — Fırsat işaretini kaldır\n' +
            '/merch bestseller pin <id> — Çok Satanlar\'a sabitle\n' +
            '/merch bestseller unpin <id> — Sabitlemeyi kaldır\n' +
            '/merch bestseller exclude <id> — Çok Satanlar\'dan hariç tut\n' +
            '/merch bestseller include <id> — Hariç tutmayı kaldır',
        )
        return NextResponse.json({ ok: true })
      }

      // /merch preview — show section summaries
      if (subCmd === 'preview') {
        try {
          const { resolveHomepageSections, isHomepageEligible } = await import('@/lib/merchandising')
          const allProducts = await payload.find({
            collection: 'products',
            where: { status: { in: ['active', 'soldout'] } },
            depth: 0,
            limit: 200,
          })
          const eligible = allProducts.docs.filter((p: any) => isHomepageEligible(p as any))
          const sections = resolveHomepageSections(eligible as any)

          const lines = [
            `🏪 <b>Merchandising Önizleme</b>`,
            ``,
            `Toplam: ${allProducts.docs.length} ürün | Uygun: ${eligible.length}`,
            ``,
            `📌 <b>Yeni:</b> ${sections.yeni.length} ürün`,
            ...sections.yeni.slice(0, 3).map((p: any) => `  • ${p.title ?? `#${p.id}`}`),
            sections.yeni.length > 3 ? `  ... +${sections.yeni.length - 3} daha` : '',
            ``,
            `⭐ <b>Popüler:</b> ${sections.popular.length} ürün`,
            ...sections.popular.slice(0, 3).map((p: any) => `  • ${p.title ?? `#${p.id}`}`),
            sections.popular.length > 3 ? `  ... +${sections.popular.length - 3} daha` : '',
            ``,
            `🏆 <b>Çok Satanlar:</b> ${sections.bestSellers.length} ürün`,
            ...sections.bestSellers.slice(0, 3).map((p: any) => `  • ${p.title ?? `#${p.id}`}`),
            sections.bestSellers.length > 3 ? `  ... +${sections.bestSellers.length - 3} daha` : '',
            ``,
            `🔥 <b>Fırsatlar:</b> ${sections.deals.length} ürün`,
            ...sections.deals.slice(0, 3).map((p: any) => `  • ${p.title ?? `#${p.id}`}`),
            sections.deals.length > 3 ? `  ... +${sections.deals.length - 3} daha` : '',
            ``,
            `💰 <b>İndirimli:</b> ${sections.discounted.length} ürün`,
            ...sections.discounted.slice(0, 3).map((p: any) => `  • ${p.title ?? `#${p.id}`}`),
            sections.discounted.length > 3 ? `  ... +${sections.discounted.length - 3} daha` : '',
          ].filter(l => l !== '')

          await sendTelegramMessage(chatId, lines.join('\n'))
        } catch (err) {
          await sendTelegramMessage(chatId, `❌ Hata: ${err instanceof Error ? err.message : String(err)}`)
        }
        return NextResponse.json({ ok: true })
      }

      // /merch status <id> — show merchandising state for a product
      if (subCmd === 'status') {
        const productId = parseInt(parts[2] ?? '')
        if (isNaN(productId)) {
          await sendTelegramMessage(chatId, '⚠️ Kullanım: /merch status <productId>')
          return NextResponse.json({ ok: true })
        }

        try {
          const product = await payload.findByID({ collection: 'products', id: productId, depth: 0 })
          if (!product) {
            await sendTelegramMessage(chatId, `❌ Ürün #${productId} bulunamadı.`)
            return NextResponse.json({ ok: true })
          }

          const { isHomepageEligible, isNewProduct, isPopularProduct, isBestSellerProduct, isDealProduct, isDiscountedProduct } = await import('@/lib/merchandising')
          const p = product as any
          const m = p.merchandising ?? {}
          const eligible = isHomepageEligible(p)

          const lines = [
            `🏪 <b>Merchandising — ${p.title ?? `Ürün #${productId}`}</b>`,
            ``,
            `<b>Durum:</b> ${p.status} | sellable: ${p.workflow?.sellable ?? '—'} | stockState: ${p.workflow?.stockState ?? '—'}`,
            `<b>Homepage uygun:</b> ${eligible ? '✅ Evet' : '❌ Hayır'}`,
            ``,
            `<b>Bölüm Üyelikleri:</b>`,
            `  ${isNewProduct(p) ? '✅' : '❌'} Yeni (publishedAt: ${m.publishedAt ? new Date(m.publishedAt).toLocaleDateString('tr-TR') : '—'}, newUntil: ${m.newUntil ? new Date(m.newUntil).toLocaleDateString('tr-TR') : '—'})`,
            `  ${isPopularProduct(p) ? '✅' : '❌'} Popüler (manualPopular: ${m.manualPopular ?? false})`,
            `  ${isBestSellerProduct(p) ? '✅' : '❌'} Çok Satanlar (score: ${m.bestSellerScore ?? 0}, pinned: ${m.bestSellerPinned ?? false}, excluded: ${m.bestSellerExcluded ?? false})`,
            `  ${isDealProduct(p) ? '✅' : '❌'} Fırsat (manualDeal: ${m.manualDeal ?? false})`,
            `  ${isDiscountedProduct(p) ? '✅' : '❌'} İndirimli (price: ${p.price}, original: ${p.originalPrice ?? '—'})`,
            ``,
            `<b>Diğer:</b>`,
            `  homepageHidden: ${m.homepageHidden ?? false}`,
            `  totalUnitsSold: ${m.totalUnitsSold ?? 0}`,
          ]

          await sendTelegramMessage(chatId, lines.join('\n'))
        } catch (err) {
          await sendTelegramMessage(chatId, `❌ Hata: ${err instanceof Error ? err.message : String(err)}`)
        }
        return NextResponse.json({ ok: true })
      }

      // /merch popular add/remove <id>
      // /merch deal add/remove <id>
      // /merch bestseller pin/unpin/exclude/include <id>
      const action = parts[2]?.toLowerCase()
      const targetId = parseInt(parts[3] ?? parts[2] ?? '')

      // Validate command structure
      if (!['popular', 'deal', 'bestseller'].includes(subCmd)) {
        await sendTelegramMessage(chatId, '⚠️ Bilinmeyen alt komut. /merch yazarak yardım alın.')
        return NextResponse.json({ ok: true })
      }

      if (!action || isNaN(targetId)) {
        await sendTelegramMessage(chatId, `⚠️ Kullanım: /merch ${subCmd} <action> <productId>`)
        return NextResponse.json({ ok: true })
      }

      try {
        const product = await payload.findByID({ collection: 'products', id: targetId, depth: 0 })
        if (!product) {
          await sendTelegramMessage(chatId, `❌ Ürün #${targetId} bulunamadı.`)
          return NextResponse.json({ ok: true })
        }

        const currentMerch = (product as any).merchandising ?? {}
        let updateField: string | null = null
        let updateValue: boolean | null = null
        let actionLabel = ''

        if (subCmd === 'popular') {
          if (action === 'add') { updateField = 'manualPopular'; updateValue = true; actionLabel = 'Popüler olarak işaretlendi' }
          else if (action === 'remove') { updateField = 'manualPopular'; updateValue = false; actionLabel = 'Popüler işareti kaldırıldı' }
        } else if (subCmd === 'deal') {
          if (action === 'add') { updateField = 'manualDeal'; updateValue = true; actionLabel = 'Fırsat olarak işaretlendi' }
          else if (action === 'remove') { updateField = 'manualDeal'; updateValue = false; actionLabel = 'Fırsat işareti kaldırıldı' }
        } else if (subCmd === 'bestseller') {
          if (action === 'pin') { updateField = 'bestSellerPinned'; updateValue = true; actionLabel = 'Çok Satanlar\'a sabitlendi' }
          else if (action === 'unpin') { updateField = 'bestSellerPinned'; updateValue = false; actionLabel = 'Sabitleme kaldırıldı' }
          else if (action === 'exclude') { updateField = 'bestSellerExcluded'; updateValue = true; actionLabel = 'Çok Satanlar\'dan hariç tutuldu' }
          else if (action === 'include') { updateField = 'bestSellerExcluded'; updateValue = false; actionLabel = 'Hariç tutma kaldırıldı' }
        }

        if (!updateField || updateValue === null) {
          await sendTelegramMessage(chatId, `⚠️ Bilinmeyen aksiyon: ${subCmd} ${action}. /merch yazarak yardım alın.`)
          return NextResponse.json({ ok: true })
        }

        await payload.update({
          collection: 'products',
          id: targetId,
          data: {
            merchandising: {
              ...currentMerch,
              [updateField]: updateValue,
            },
          },
          context: { isDispatchUpdate: true },
        })

        const { isHomepageEligible } = await import('@/lib/merchandising')
        const updated = await payload.findByID({ collection: 'products', id: targetId, depth: 0 })
        const eligible = isHomepageEligible(updated as any)

        await sendTelegramMessage(
          chatId,
          `✅ <b>${(product as any).title ?? `Ürün #${targetId}`}</b>\n\n` +
            `${actionLabel}\n` +
            `Homepage uygun: ${eligible ? '✅' : '❌'}\n\n` +
            `/merch status ${targetId} — Detaylı durum`,
        )
      } catch (err) {
        await sendTelegramMessage(chatId, `❌ Hata: ${err instanceof Error ? err.message : String(err)}`)
      }
      return NextResponse.json({ ok: true })
    }

    // ── Phase 17: Product Activation Command ────────────────────────────────
    // /activate {productId} — safely transition a publish-ready product to active
    if (text.startsWith('/activate')) {
      const parts = text.trim().split(/\s+/)
      const arg = parts[1]

      if (!arg) {
        await sendTelegramMessage(
          chatId,
          '🚀 <b>Ürün Aktivasyonu</b>\n\n' +
            '/activate <id> — Publish-ready ürünü aktif et (website yayını)\n\n' +
            'Koşullar: tüm publish readiness boyutları sağlanmalı (6/6).\n' +
            'Aktivasyon otomatik olarak:\n' +
            '• status → active\n' +
            '• merchandising.publishedAt ayarlar (Yeni bölümüne girer)\n' +
            '• Kanal dispatch tetikler (Shopier, Instagram vb.)',
        )
        return NextResponse.json({ ok: true })
      }

      const productId = parseInt(arg)
      if (isNaN(productId)) {
        await sendTelegramMessage(chatId, '⚠️ Geçersiz ürün ID.')
        return NextResponse.json({ ok: true })
      }

      try {
        const product = await payload.findByID({ collection: 'products', id: productId, depth: 1 })
        if (!product) {
          await sendTelegramMessage(chatId, `❌ Ürün #${productId} bulunamadı.`)
          return NextResponse.json({ ok: true })
        }

        // Guard: already active
        if ((product as any).status === 'active') {
          await sendTelegramMessage(chatId, `✅ Ürün #${productId} zaten aktif. Tekrar dispatch için Admin'den forceRedispatch kullanın.`)
          return NextResponse.json({ ok: true })
        }

        // Guard: check publish readiness (all 6 dimensions)
        const { evaluatePublishReadiness, formatReadinessMessage } = await import('@/lib/publishReadiness')
        const readiness = evaluatePublishReadiness(product as any)

        if (readiness.level !== 'ready') {
          await sendTelegramMessage(
            chatId,
            `⚠️ <b>Aktivasyon engellendi — Ürün #${productId}</b>\n\n` +
              `Publish readiness: ${readiness.passedCount}/${readiness.totalCount}\n` +
              `Tüm boyutların (6/6) sağlanması gerekiyor.\n\n` +
              `<b>Engelleyenler:</b>\n` +
              readiness.blockers.map(b => `❌ ${b}`).join('\n') +
              `\n\n/pipeline ${productId} — Detaylı durum`,
          )
          return NextResponse.json({ ok: true })
        }

        // All checks passed — activate
        await sendTelegramMessage(
          chatId,
          `🚀 <b>Aktivasyon başlatılıyor — Ürün #${productId}</b>\n` +
            `${(product as any).title ?? 'Untitled'}\n` +
            `Readiness: ${readiness.passedCount}/${readiness.totalCount} ✅`,
        )

        // Calculate merchandising dates
        const { calculateNewWindow } = await import('@/lib/merchandising')
        const { publishedAt, newUntil } = calculateNewWindow()

        // Activate via payload.update — this triggers the afterChange hook
        // which handles channel dispatch, Shopier sync, story dispatch, etc.
        await payload.update({
          collection: 'products',
          id: productId,
          data: {
            status: 'active',
            workflow: {
              ...((product as any).workflow ?? {}),
              workflowStatus: 'active',
              publishStatus: 'published',
              lastHandledByBot: 'uygunops',
            },
            merchandising: {
              ...((product as any).merchandising ?? {}),
              publishedAt,
              newUntil,
            },
          },
        })

        // Emit BotEvent
        await payload.create({
          collection: 'bot-events',
          data: {
            eventType: 'product.activated',
            product: productId,
            sourceBot: 'uygunops',
            status: 'processed',
            payload: {
              previousStatus: (product as any).status,
              activatedAt: new Date().toISOString(),
              publishedAt,
              newUntil,
              readinessScore: `${readiness.passedCount}/${readiness.totalCount}`,
            },
            notes: `Product ${productId} activated via Telegram /activate command. Status: draft→active. Website publish + merchandising dates set.`,
            processedAt: new Date().toISOString(),
          },
        })

        await sendTelegramMessage(
          chatId,
          `✅ <b>Ürün #${productId} AKTİF!</b>\n\n` +
            `🟢 status = active\n` +
            `📅 publishedAt = ${publishedAt.split('T')[0]}\n` +
            `📅 newUntil = ${newUntil.split('T')[0]} (Yeni bölümünde görünecek)\n` +
            `🔄 Kanal dispatch tetiklendi (afterChange hook)\n\n` +
            `/pipeline ${productId} — Pipeline durumu\n` +
            `/merch status ${productId} — Merchandising durumu`,
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await sendTelegramMessage(chatId, `❌ Aktivasyon hatası: ${msg}`)
      }
      return NextResponse.json({ ok: true })
    }

    // ── Phase 12: Pipeline Status Command ─────────────────────────────────
    // /pipeline {productId} — full lifecycle pipeline visibility
    // ── Phase G: /preview <id> — dry-run dispatch preview ─────────────────
    if (text.startsWith('/preview')) {
      const pvParts = text.trim().split(/\s+/)
      const pvArg = pvParts[1]
      if (!pvArg) {
        await sendTelegramMessage(chatId,
          '👁️ <b>Önizleme (Dry-Run)</b>\n\n' +
          '/preview &lt;id&gt; — Ürünün kanal iletim önizlemesini göster\n\n' +
          'Geobot içeriğinin hangi kanallarda kullanılacağını, gerçek gönderi yapmadan görürsünüz.\n' +
          'Sadece aktif ürünlerde çalışır.')
        return NextResponse.json({ ok: true })
      }
      try {
        const { docs: pvDocs } = await payload.find({
          collection: 'products',
          where: { id: { equals: pvArg } },
          depth: 0,
          limit: 1,
        })
        if (pvDocs.length === 0) {
          await sendTelegramMessage(chatId, `❌ Ürün bulunamadı: ${pvArg}`)
          return NextResponse.json({ ok: true })
        }
        const pvDoc = pvDocs[0] as Record<string, unknown>
        if (pvDoc.status !== 'active') {
          await sendTelegramMessage(chatId, `❌ Ürün aktif değil (status: ${pvDoc.status}). Önizleme sadece aktif ürünlerde çalışır.`)
          return NextResponse.json({ ok: true })
        }
        const pvMeta = (pvDoc.sourceMeta as Record<string, unknown>) ?? {}
        // Trigger dry-run by setting both flags — afterChange hook will detect isDryRun
        await sendTelegramMessage(chatId, `⏳ Önizleme başlatılıyor — Ürün #${pvArg}...`)
        await payload.update({
          collection: 'products',
          id: pvArg as string,
          data: {
            sourceMeta: {
              ...pvMeta,
              forceRedispatch: true,
              previewDispatch: true,
            },
          },
        })
        // Results will be sent by the afterChange hook's Telegram notification
      } catch (pvErr) {
        const pvMsg = pvErr instanceof Error ? pvErr.message : String(pvErr)
        await sendTelegramMessage(chatId, `❌ Önizleme hatası: ${pvMsg}`)
      }
      return NextResponse.json({ ok: true })
    }

    if (text.startsWith('/pipeline')) {
      const parts = text.trim().split(/\s+/)
      const arg = parts[1]

      if (!arg) {
        await sendTelegramMessage(
          chatId,
          '🔄 <b>Pipeline Durumu</b>\n\n' +
            '/pipeline <id> — Ürünün tüm yaşam döngüsünü göster\n\n' +
            'Intake → Görsel → Onay → İçerik → Audit → Yayın Hazırlığı → Yayın → Stok → Vitrin → Story\n\n' +
            'Her aşamanın güncel durumu tek bakışta görünür.',
        )
        return NextResponse.json({ ok: true })
      }

      const productId = parseInt(arg)
      if (isNaN(productId)) {
        await sendTelegramMessage(chatId, '⚠️ Geçersiz ürün ID.')
        return NextResponse.json({ ok: true })
      }

      try {
        const product = await payload.findByID({ collection: 'products', id: productId, depth: 1 })
        if (!product) {
          await sendTelegramMessage(chatId, `❌ Ürün #${productId} bulunamadı.`)
          return NextResponse.json({ ok: true })
        }

        const {
          computePipelineStatus, formatPipelineMessage,
          evaluatePublishReadiness, formatReadinessMessage,
          detectStateIncoherence, formatCoherenceMessage,
        } = await import('@/lib/publishReadiness')

        const pipeline = computePipelineStatus(product as any)
        const pipelineMsg = formatPipelineMessage(pipeline)

        const readiness = evaluatePublishReadiness(product as any)
        const readinessMsg = formatReadinessMessage(product as any, readiness)

        const coherenceIssues = detectStateIncoherence(product as any)
        const coherenceMsg = coherenceIssues.length > 0
          ? '\n\n' + formatCoherenceMessage(product as any, coherenceIssues)
          : ''

        await sendTelegramMessage(chatId, pipelineMsg + '\n\n' + readinessMsg + coherenceMsg)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await sendTelegramMessage(chatId, `❌ Hata: ${msg}`)
      }
      return NextResponse.json({ ok: true })
    }

    // ── Phase 13: System Diagnostics Command ────────────────────────────────
    // /diagnostics — lightweight system health check
    if (text.startsWith('/diagnostics')) {
      try {
        const lines: string[] = ['🔧 <b>System Diagnostics</b>', '']

        // 1. Database connectivity
        try {
          const productCount = await payload.count({ collection: 'products' })
          lines.push(`✅ <b>DB:</b> Connected — ${productCount.totalDocs} products`)
        } catch {
          lines.push('❌ <b>DB:</b> Connection failed')
        }

        // 2. Environment check
        const envChecks = [
          { name: 'TELEGRAM_BOT_TOKEN', val: !!process.env.TELEGRAM_BOT_TOKEN },
          { name: 'GEMINI_API_KEY', val: !!process.env.GEMINI_API_KEY },
          { name: 'SHOPIER_PAT', val: !!process.env.SHOPIER_PAT },
          { name: 'BLOB_READ_WRITE_TOKEN', val: !!process.env.BLOB_READ_WRITE_TOKEN },
          { name: 'CLAID_API_KEY', val: !!process.env.CLAID_API_KEY },
          { name: 'OPENAI_API_KEY', val: !!process.env.OPENAI_API_KEY },
        ]
        const envOk = envChecks.filter(e => e.val).length
        const envMissing = envChecks.filter(e => !e.val).map(e => e.name)
        lines.push(`${envOk === envChecks.length ? '✅' : '🟡'} <b>Env:</b> ${envOk}/${envChecks.length} keys set${envMissing.length > 0 ? ` — missing: ${envMissing.join(', ')}` : ''}`)

        // 3. Recent BotEvents
        try {
          const recentEvents = await payload.find({ collection: 'bot-events', limit: 1, sort: '-createdAt' })
          if (recentEvents.docs.length > 0) {
            const latest = recentEvents.docs[0] as any
            lines.push(`✅ <b>Events:</b> Latest: ${latest.eventType} (${latest.status}) — ${new Date(latest.createdAt).toLocaleString('tr-TR')}`)
          } else {
            lines.push('➖ <b>Events:</b> No BotEvents recorded')
          }
        } catch {
          lines.push('❌ <b>Events:</b> BotEvents query failed (table may not exist)')
        }

        // 4. Recent orders
        try {
          const recentOrders = await payload.find({ collection: 'orders', limit: 1, sort: '-createdAt' })
          lines.push(`✅ <b>Orders:</b> ${recentOrders.totalDocs} total`)
        } catch {
          lines.push('❌ <b>Orders:</b> Query failed')
        }

        // 5. Active/soldout counts
        try {
          const activeCount = await payload.count({ collection: 'products', where: { status: { equals: 'active' } } })
          const soldoutCount = await payload.count({ collection: 'products', where: { status: { equals: 'soldout' } } })
          const draftCount = await payload.count({ collection: 'products', where: { status: { equals: 'draft' } } })
          lines.push(`📊 <b>Products:</b> ${activeCount.totalDocs} active, ${soldoutCount.totalDocs} soldout, ${draftCount.totalDocs} draft`)
        } catch {
          lines.push('❌ <b>Products:</b> Count query failed')
        }

        // 6. Runtime
        lines.push(`⚙️ <b>Runtime:</b> NODE_ENV=${process.env.NODE_ENV || 'undefined'}`)
        lines.push(`🕐 <b>Server time:</b> ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`)

        await sendTelegramMessage(chatId, lines.join('\n'))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await sendTelegramMessage(chatId, `❌ Diagnostics error: ${msg}`)
      }
      return NextResponse.json({ ok: true })
    }

    // ── Phase 9: Stock Status Command ──────────────────────────────────────
    // /stok {productId} — show stock status and state
    if (text.startsWith('/stok')) {
      const parts = text.trim().split(/\s+/)
      const arg = parts[1]

      if (!arg) {
        await sendTelegramMessage(
          chatId,
          '📦 <b>Stok Durumu</b>\n\n' +
            '/stok <id> — Ürün stok durumunu göster\n\n' +
            'Tüm beden stokları, efektif stok, workflow durumu görüntülenir.',
        )
        return NextResponse.json({ ok: true })
      }

      const productId = parseInt(arg)
      if (isNaN(productId)) {
        await sendTelegramMessage(chatId, '⚠️ Geçersiz ürün ID.')
        return NextResponse.json({ ok: true })
      }

      try {
        const product = await payload.findByID({ collection: 'products', id: productId, depth: 0 })
        if (!product) {
          await sendTelegramMessage(chatId, `❌ Ürün #${productId} bulunamadı.`)
          return NextResponse.json({ ok: true })
        }

        const { getStockSnapshot, formatStockStatusMessage } = await import('@/lib/stockReaction')
        const snapshot = await getStockSnapshot(payload, productId, product.stockQuantity as number)
        const statusMsg = formatStockStatusMessage(product as any, snapshot)
        await sendTelegramMessage(chatId, statusMsg)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await sendTelegramMessage(chatId, `❌ Hata: ${msg}`)
      }
      return NextResponse.json({ ok: true })
    }

    // ── Phase 8: Mentix Audit Commands ─────────────────────────────────────
    // /audit {productId} — show audit status or run audit
    // /audit {productId} run — force re-run audit
    if (text.startsWith('/audit')) {
      const parts = text.trim().split(/\s+/)
      const arg = parts[1]
      const subCommand = parts[2]?.toLowerCase()

      // /audit (no arg) — show help
      if (!arg) {
        await sendTelegramMessage(
          chatId,
          '🔍 <b>Mentix Audit</b>\n\n' +
            '/audit <id> — Audit durumunu göster\n' +
            '/audit <id> run — Auditi çalıştır veya yeniden çalıştır\n\n' +
            'İçerik hazır olduktan sonra (contentStatus=ready) audit otomatik tetiklenir.\n' +
            '4 boyut: Görsel, Ticari, Keşif, Genel değerlendirme.',
        )
        return NextResponse.json({ ok: true })
      }

      const productId = parseInt(arg)
      if (isNaN(productId)) {
        await sendTelegramMessage(chatId, '⚠️ Geçersiz ürün ID.')
        return NextResponse.json({ ok: true })
      }

      try {
        const product = await payload.findByID({ collection: 'products', id: productId, depth: 1 })
        if (!product) {
          await sendTelegramMessage(chatId, `❌ Ürün #${productId} bulunamadı.`)
          return NextResponse.json({ ok: true })
        }

        // /audit {id} run — force run audit
        if (subCommand === 'run') {
          const { isAuditEligible, triggerAudit, formatAuditStatusMessage } = await import('@/lib/mentixAudit')
          if (!isAuditEligible(product as any)) {
            const reason = (product as any).workflow?.confirmationStatus !== 'confirmed'
              ? 'Ürün henüz onaylanmadı. Önce /confirm kullanın.'
              : (product as any).workflow?.contentStatus === 'pending'
                ? 'İçerik henüz üretilmedi. Önce /content <id> trigger kullanın.'
                : 'Audit uygun değil — ürün durumunu kontrol edin.'
            await sendTelegramMessage(chatId, `⚠️ Audit çalıştırılamadı:\n${reason}`)
            return NextResponse.json({ ok: true })
          }

          const result = await triggerAudit(
            payload,
            product as any,
            'telegram_command',
            { context: {} } as any,
          )

          if (result.triggered && result.auditResult) {
            const ar = result.auditResult
            const statusEmoji = ar.overallResult === 'approved' ? '✅' :
              ar.overallResult === 'approved_with_warning' ? '⚠️' :
              ar.overallResult === 'needs_revision' ? '🔄' :
              ar.overallResult === 'failed' ? '❌' : '⏳'
            await sendTelegramMessage(
              chatId,
              `${statusEmoji} <b>Mentix Audit — Ürün #${productId}</b>\n\n` +
                `📋 overallResult = ${ar.overallResult}\n` +
                `${ar.approvedForPublish ? '✅ Yayına uygun!' : '⛔ Yayına uygun değil.'}\n\n` +
                `👁 Görsel: ${ar.visual.result} | 🛒 Ticari: ${ar.commerce.result} | 🔍 Keşif: ${ar.discovery.result}\n` +
                (ar.allWarnings.length > 0 ? `\n⚠️ Uyarılar:\n${ar.allWarnings.map(w => `• ${w}`).join('\n')}\n` : '') +
                `\n📝 BotEvent: audit sonuç olayı kaydedildi.`,
            )
          } else {
            await sendTelegramMessage(chatId, `❌ Audit hatası: ${result.error}`)
          }
          return NextResponse.json({ ok: true })
        }

        // /audit {id} — show audit status
        const { formatAuditStatusMessage } = await import('@/lib/mentixAudit')
        const statusMsg = formatAuditStatusMessage(product as any)
        await sendTelegramMessage(chatId, statusMsg)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await sendTelegramMessage(chatId, `❌ Hata: ${msg}`)
      }
      return NextResponse.json({ ok: true })
    }

    // ── Phase 6: Content Pack Commands ──────────────────────────────────────
    // /content {productId} — show content status or trigger generation
    // /content {productId} trigger — manually trigger content generation
    if (text.startsWith('/content')) {
      const parts = text.trim().split(/\s+/)
      const arg = parts[1]
      const subCommand = parts[2]?.toLowerCase()

      // /content (no arg) — show help
      if (!arg) {
        await sendTelegramMessage(
          chatId,
          '📝 <b>İçerik Yönetimi (Geobot)</b>\n\n' +
            '/content <id> — İçerik durumunu göster\n' +
            '/content <id> trigger — İçerik üretimini tetikle (Gemini AI)\n' +
            '/content <id> retry — Kısmi/başarısız içeriği tekrar dene\n\n' +
            'Ürün onaylandıktan sonra Geobot içerik üretimi otomatik tetiklenir.\n' +
            'Commerce Pack (5 kanal) + Discovery Pack (SEO makale) üretir.',
        )
        return NextResponse.json({ ok: true })
      }

      const productId = parseInt(arg)
      if (isNaN(productId)) {
        await sendTelegramMessage(chatId, '⚠️ Geçersiz ürün ID.')
        return NextResponse.json({ ok: true })
      }

      try {
        const product = await payload.findByID({ collection: 'products', id: productId, depth: 0 })
        if (!product) {
          await sendTelegramMessage(chatId, `❌ Ürün #${productId} bulunamadı.`)
          return NextResponse.json({ ok: true })
        }

        // /content {id} trigger — manually trigger content generation
        if (subCommand === 'trigger') {
          const { isContentEligible, triggerContentGeneration } = await import('@/lib/contentPack')
          if (!isContentEligible(product as any)) {
            // VF-4: Determine which gate is blocking
            const vs = (product as any).workflow?.visualStatus ?? 'pending'
            const cs = (product as any).workflow?.confirmationStatus
            const contentSt = (product as any).workflow?.contentStatus
            const reason = contentSt === 'ready'
              ? 'İçerik zaten hazır (contentStatus=ready).'
              : vs !== 'approved'
                ? `Görseller henüz onaylanmamış (visualStatus=${vs}). Önce #gorsel ${productId} ile görsel üretin ve onaylayın.`
                : cs !== 'confirmed'
                  ? 'Ürün henüz onaylanmadı. Önce /confirm kullanın.'
                  : 'İçerik üretimi uygun değil.'
            await sendTelegramMessage(
              chatId,
              `⚠️ <b>İçerik üretimi uygun değil — Ürün #${productId}</b>\n\n` +
                `${reason}\n\n` +
                `<b>Akış:</b> Görsel üret → Onayla → /confirm → /content`,
            )
            return NextResponse.json({ ok: true })
          }

          const result = await triggerContentGeneration(
            payload,
            product as any,
            'telegram_command',
            { context: {} } as any,
          )

          if (result.triggered) {
            const statusEmoji = result.contentStatus === 'ready' ? '✅' :
              result.contentStatus === 'commerce_generated' ? '🛒' :
              result.contentStatus === 'discovery_generated' ? '🔍' :
              result.contentStatus === 'failed' ? '❌' : '⏳'
            await sendTelegramMessage(
              chatId,
              `${statusEmoji} <b>İçerik üretimi — Ürün #${productId}</b>\n\n` +
                `📋 contentStatus = ${result.contentStatus}\n` +
                `🤖 lastHandledByBot = geobot\n` +
                `📝 BotEvent: content.requested + sonuç olayları kaydedildi.\n\n` +
                (result.contentStatus === 'ready'
                  ? '✅ Commerce + Discovery pack üretildi! Blog yazısı oluşturuldu (taslak).'
                  : result.contentStatus === 'failed'
                    ? `❌ Üretim hatası: ${result.error ?? 'bilinmeyen'}`
                    : `⏳ Kısmi üretim — /content ${productId} ile durumu kontrol edin.`),
            )
          } else {
            await sendTelegramMessage(chatId, `❌ Tetikleme hatası: ${result.error}`)
          }
          return NextResponse.json({ ok: true })
        }

        // /content {id} retry — retrigger for partial/failed content
        if (subCommand === 'retry') {
          const { canRetriggerContent, triggerContentGeneration } = await import('@/lib/contentPack')
          if (!canRetriggerContent(product as any)) {
            const cs = (product as any).workflow?.contentStatus ?? 'unknown'
            const vs = (product as any).workflow?.visualStatus ?? 'pending'
            const reason = cs === 'ready'
              ? 'İçerik zaten tam (commerce + discovery). Tekrar denemeye gerek yok.'
              : vs !== 'approved'
                ? `Görseller henüz onaylanmamış (visualStatus=${vs}). Önce görselleri onaylayın.`
                : cs === 'pending'
                  ? 'İçerik henüz üretilmedi. /content <id> trigger kullanın.'
                  : (product as any).workflow?.confirmationStatus !== 'confirmed'
                    ? 'Ürün henüz onaylanmadı. Önce /confirm kullanın.'
                    : `Mevcut durum (${cs}) retry için uygun değil.`
            await sendTelegramMessage(
              chatId,
              `⚠️ <b>Retry uygun değil — Ürün #${productId}</b>\n\n${reason}`,
            )
            return NextResponse.json({ ok: true })
          }

          const currentStatus = (product as any).workflow?.contentStatus
          await sendTelegramMessage(
            chatId,
            `🔄 <b>İçerik retry başlatılıyor — Ürün #${productId}</b>\n` +
              `Mevcut durum: ${currentStatus}\n` +
              `Eksik pack yeniden üretilecek...`,
          )

          const result = await triggerContentGeneration(
            payload,
            product as any,
            'retry',
            { context: {} } as any,
          )

          if (result.triggered) {
            const statusEmoji = result.contentStatus === 'ready' ? '✅' :
              result.contentStatus === 'commerce_generated' ? '🛒' :
              result.contentStatus === 'discovery_generated' ? '🔍' :
              result.contentStatus === 'failed' ? '❌' : '⏳'
            await sendTelegramMessage(
              chatId,
              `${statusEmoji} <b>Retry sonucu — Ürün #${productId}</b>\n\n` +
                `📋 contentStatus = ${result.contentStatus}\n` +
                (result.contentStatus === 'ready'
                  ? '✅ Commerce + Discovery pack tamamlandı!'
                  : result.contentStatus === 'failed'
                    ? `❌ Retry hatası: ${result.error ?? 'bilinmeyen'}`
                    : `⏳ Hâlâ kısmi — /content ${productId} ile durumu kontrol edin.`),
            )
          } else {
            await sendTelegramMessage(chatId, `❌ Retry hatası: ${result.error}`)
          }
          return NextResponse.json({ ok: true })
        }

        // /content {id} — show content status
        const { formatContentStatusMessage } = await import('@/lib/contentPack')
        const statusMsg = formatContentStatusMessage(product as any)
        await sendTelegramMessage(chatId, statusMsg)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await sendTelegramMessage(chatId, `❌ Hata: ${msg}`)
      }
      return NextResponse.json({ ok: true })
    }

    // ── Phase 5: Product Confirmation Wizard ─────────────────────────────────
    // /confirm {productId} — start confirmation wizard or show status
    // /confirm_cancel — cancel active wizard session
    if (text.startsWith('/confirm')) {
      const parts = text.trim().split(/\s+/)
      const command = parts[0].toLowerCase()
      const arg = parts[1]

      // /confirm (no arg) — show help
      if (command === '/confirm' && !arg) {
        await sendTelegramMessage(
          chatId,
          '📋 <b>Ürün Onay Sihirbazı</b>\n\n' +
            '/confirm <id> — Ürünü onaylamaya başla\n' +
            '/confirm_cancel — Aktif sihirbazı iptal et\n\n' +
            'Sihirbaz sırasıyla kategori, fiyat, beden, stok ve yayın hedeflerini sorar. ' +
            'Zaten dolu olan alanlar atlanır.',
        )
        return NextResponse.json({ ok: true })
      }

      // /confirm_cancel — cancel active wizard
      if (command === '/confirm_cancel') {
        const { clearWizardSession, getWizardSession } = await import('@/lib/confirmationWizard')
        const existing = getWizardSession(chatId, msgUserId)
        if (existing) {
          clearWizardSession(chatId, msgUserId)
          await sendTelegramMessage(chatId, '❌ Onay sihirbazı iptal edildi.')
        } else {
          await sendTelegramMessage(chatId, 'ℹ️ Aktif sihirbaz oturumu yok.')
        }
        return NextResponse.json({ ok: true })
      }

      // /confirm {productId} — start wizard
      if (command === '/confirm' && arg) {
        const productId = parseInt(arg)
        if (isNaN(productId)) {
          await sendTelegramMessage(chatId, '⚠️ Geçersiz ürün ID.')
          return NextResponse.json({ ok: true })
        }

        try {
          const product = await payload.findByID({
            collection: 'products',
            id: productId,
            depth: 1, // resolve variants
          })

          if (!product) {
            await sendTelegramMessage(chatId, `❌ Ürün #${productId} bulunamadı.`)
            return NextResponse.json({ ok: true })
          }

          // ── VF-3: Visual approval gate ────────────────────────────────────
          // Commercial confirmation requires visual approval first.
          // Only visualStatus === 'approved' may proceed.
          const visualStatus = (product as any).workflow?.visualStatus ?? 'pending'
          const isForceReconfirm = parts[2]?.toLowerCase() === 'force'
          const alreadyConfirmed = (product as any).workflow?.confirmationStatus === 'confirmed'

          // Skip visual gate ONLY for force re-confirmation of already-confirmed products
          // (operator fixing fields on a product that already passed the gate before)
          if (visualStatus !== 'approved' && !(isForceReconfirm && alreadyConfirmed)) {
            const visualGateMessages: Record<string, string> = {
              generating: '⏳ Görsel üretimi devam ediyor. Tamamlanmasını bekleyin, sonra görselleri onaylayın.',
              preview:    '👁️ Görseller hazır ama henüz onaylanmadı. Önce Telegram\'daki önizlemeyi onaylayın (✅ butonuna basın).',
              rejected:   '❌ Görseller reddedilmiş. Yeniden üretim başlatın: <code>#gorsel ' + productId + '</code>',
              pending:    '🖼️ Henüz görsel üretimi yapılmamış. Önce görsel üretin ve onaylayın:\n<code>#gorsel ' + productId + '</code>',
            }
            const msg = visualGateMessages[visualStatus] ?? visualGateMessages.pending
            await sendTelegramMessage(
              chatId,
              `⛔ <b>Onay başlatılamadı — Ürün #${productId}</b>\n\n` +
                `${msg}\n\n` +
                `<b>Akış:</b> Görsel üret → Onayla → /confirm\n` +
                `/pipeline ${productId} — Detaylı durum`,
            )
            return NextResponse.json({ ok: true })
          }

          const {
            checkConfirmationFields,
            getNextWizardStep,
            setWizardSession,
            clearWizardSession,
            getTitlePrompt,
            getStockCodePrompt,
            getCategoryPrompt,
            getProductTypePrompt,
            getPricePrompt,
            getSizesPrompt,
            getTargetsPrompt,
            getBrandPrompt,
            formatConfirmationSummary,
          } = await import('@/lib/confirmationWizard')

          // Check current status
          const check = checkConfirmationFields(product as any)

          // Already confirmed
          if (check.alreadyConfirmed) {
            const lines = [
              `✅ <b>Ürün #${productId} zaten onaylı.</b>`,
              ``,
              `📋 Onay zamanı: ${(product as any).workflow?.productConfirmedAt ?? '—'}`,
              `🤖 Son bot: ${(product as any).workflow?.lastHandledByBot ?? '—'}`,
            ]
            if (check.missing.length > 0) {
              lines.push(``)
              lines.push(`⚠️ Eksik alanlar: ${check.missing.map((m) => m.label).join(', ')}`)
              lines.push(`Tekrar onaylamak için: /confirm ${productId} force`)
            }
            await sendTelegramMessage(chatId, lines.join('\n'))
            // Allow force re-confirmation
            if (parts[2]?.toLowerCase() !== 'force') {
              return NextResponse.json({ ok: true })
            }
          }

          // If all required fields are present, check if title/stockCode still need collecting
          const preCheck = getNextWizardStep(product as any, {} as any)
          if (check.ready && preCheck === 'summary') {
            const summary = formatConfirmationSummary(product as any, {})
            await sendTelegramMessageWithKeyboard(chatId, summary, [
              [
                { text: '✅ Onayla', callback_data: `wz_confirm:${productId}` },
                { text: '❌ İptal', callback_data: `wz_cancel:${productId}` },
              ],
            ])
            setWizardSession(chatId, {
              productId,
              chatId,
              userId: msgUserId,
              step: 'summary',
              collected: {},
              startedAt: Date.now(),
            }, msgUserId)
            return NextResponse.json({ ok: true })
          }

          // Missing fields → start wizard
          const missingList = check.missing.map((m) => `  ❌ ${m.label}`).join('\n')
          const presentList = check.present.map((m) => `  ✅ ${m.label}: ${m.value}`).join('\n')
          const optionalList = check.optional
            .filter((m) => !m.present)
            .map((m) => `  ⚠️ ${m.label}`)
            .join('\n')

          const statusLines = [
            `📋 <b>Ürün #${productId} — ${(product as any).title ?? 'İsimsiz'}</b>`,
            ``,
            `<b>Mevcut:</b>`,
            presentList || '  (yok)',
            ``,
            `<b>Eksik (zorunlu):</b>`,
            missingList,
          ]
          if (optionalList) {
            statusLines.push(``, `<b>Eksik (opsiyonel):</b>`, optionalList)
          }
          statusLines.push(
            ``,
            `<b>Görsel:</b> ${check.visualReady ? '✅ Hazır' : '⚠️ Görsel yok'}`,
            ``,
            `Sihirbaz başlıyor...`,
          )
          await sendTelegramMessage(chatId, statusLines.join('\n'))

          // Initialize wizard
          const collected: Record<string, unknown> = {}
          const nextStep = getNextWizardStep(product as any, collected as any)

          clearWizardSession(chatId, msgUserId) // Clear any stale session
          const wizState = {
            productId,
            chatId,
            userId: msgUserId,
            step: nextStep,
            collected: collected as any,
            startedAt: Date.now(),
          } as any
          setWizardSession(chatId, wizState, msgUserId)

          // Send first prompt
          if (nextStep === 'title') {
            await sendTelegramMessage(chatId, getTitlePrompt((product as any).title ?? `Ürün #${productId}`))
          } else if (nextStep === 'stockCode') {
            await sendTelegramMessage(chatId, getStockCodePrompt((product as any).sku ?? '—'))
          } else if (nextStep === 'category') {
            const catPrompt = getCategoryPrompt()
            await sendTelegramMessageWithKeyboard(chatId, catPrompt.text, catPrompt.keyboard)
          } else if (nextStep === 'productType') {
            const ptypePrompt = getProductTypePrompt()
            await sendTelegramMessageWithKeyboard(chatId, ptypePrompt.text, ptypePrompt.keyboard)
          } else if (nextStep === 'price') {
            await sendTelegramMessage(chatId, getPricePrompt())
          } else if (nextStep === 'sizes') {
            wizState.pendingSizes = []
            const sizeMsg = await sendTelegramMessageWithKeyboard(
              chatId,
              formatSizeSelectionText(new Set()),
              buildSizeKeyboard(new Set()),
            )
            if (sizeMsg) wizState.sizeMessageId = sizeMsg
            setWizardSession(chatId, wizState, msgUserId)
          } else if (nextStep === 'brand') {
            await sendTelegramMessage(chatId, getBrandPrompt())
          } else if (nextStep === 'targets') {
            const tgtPrompt = getTargetsPrompt()
            await sendTelegramMessageWithKeyboard(chatId, tgtPrompt.text, tgtPrompt.keyboard)
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await sendTelegramMessage(chatId, `❌ Hata: ${msg}`)
        }
        return NextResponse.json({ ok: true })
      }
    }

    // ── Phase 4: Story operator commands ─────────────────────────────────────
    // /story {productId} — create/queue a story job
    // /restory {productId} — retry story for a product
    // /targets {productId} — show resolved story targets
    // /approve_story {jobId} — approve a pending story
    // /reject_story {jobId} — reject a pending story
    if (text.startsWith('/story') && !text.startsWith('/story_')) {
      const parts = text.trim().split(/\s+/)
      const command = parts[0].toLowerCase()
      const arg = parts[1]

      // /story (no subcommand) — show help
      if (command === '/story' && !arg) {
        await sendTelegramMessage(
          chatId,
          '📖 Story komutları:\n\n' +
            '/story <id> — Story oluştur\n' +
            '/restory <id> — Tekrar dene\n' +
            '/targets <id> — Hedefleri göster\n' +
            '/approve_story <jobId> — Onayla\n' +
            '/reject_story <jobId> — Reddet',
        )
        return NextResponse.json({ ok: true })
      }

      // /story {productId} — create story job
      if (command === '/story' && arg) {
        try {
          const { docs } = await payload.find({
            collection: 'products',
            where: { id: { equals: arg } },
            depth: 1,
            limit: 1,
          })
          if (docs.length === 0) {
            await sendTelegramMessage(chatId, `❌ Ürün bulunamadı: ${arg}`)
            return NextResponse.json({ ok: true })
          }
          const product = docs[0] as Record<string, unknown>

          if (product.status !== 'active') {
            await sendTelegramMessage(chatId, `⚠️ Ürün aktif değil (durum: ${product.status}). Sadece aktif ürünlere story oluşturulabilir.`)
            return NextResponse.json({ ok: true })
          }

          // Dispatch story using the Phase 3 foundation
          const { dispatchStory } = await import('@/lib/storyDispatch')
          const { fetchAutomationSettings } = await import('@/lib/automationDecision')
          const settings = await fetchAutomationSettings(payload)
          const storyTargets = (settings as Record<string, unknown>)?.storyTargets as any[] | undefined

          const result = await dispatchStory(
            product as any,
            storyTargets ?? null,
            payload as any,
            'telegram_command',
          )

          if (result.jobCreated) {
            const statusEmoji: Record<string, string> = {
              queued: '🔄',
              awaiting_asset: '🖼️',
              awaiting_approval: '⏳',
              blocked_officially: '🚫',
            }
            const lines = [
              `${statusEmoji[result.status] ?? '📖'} Story Job Oluşturuldu`,
              ``,
              `Ürün: ${product.title ?? arg}`,
              `Job ID: ${result.storyJobId}`,
              `Durum: ${result.status}`,
              `Hedefler: ${result.targets.join(', ') || 'Yok'}`,
            ]
            if (result.blockedTargets.length > 0) {
              lines.push(`🚫 Engelli: ${result.blockedTargets.join(', ')}`)
            }
            if (result.status === 'awaiting_asset') {
              lines.push(`\n⚠️ Uygun görsel bulunamadı — ürüne görsel ekleyin.`)
            }

            // Add truthful note about Telegram Story API
            lines.push(``)
            lines.push(`⚠️ Not: Telegram Bot API henüz story yayını desteklemiyor.`)
            lines.push(`Durum takibi ve onay akışı aktif — gerçek yayın API desteği geldiğinde çalışacak.`)

            // Approval keyboard if awaiting
            if (result.status === 'awaiting_approval') {
              await sendTelegramMessageWithKeyboard(chatId, lines.join('\n'), [
                [
                  { text: '✅ Onayla', callback_data: `storyapprove:${result.storyJobId}` },
                  { text: '❌ Reddet', callback_data: `storyreject:${result.storyJobId}` },
                ],
              ])
            } else {
              await sendTelegramMessage(chatId, lines.join('\n'))
            }
          } else {
            await sendTelegramMessage(
              chatId,
              `${result.status === 'blocked_officially' ? '🚫' : '❌'} Story oluşturulamadı\n\n` +
                `Durum: ${result.status}\n` +
                (result.error ? `Hata: ${result.error}` : ''),
            )
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await sendTelegramMessage(chatId, `❌ Story hatası: ${msg}`)
        }
        return NextResponse.json({ ok: true })
      }
    }

    // /restory {productId} — retry story
    if (text.startsWith('/restory')) {
      const arg = text.trim().split(/\s+/)[1]
      if (!arg) {
        await sendTelegramMessage(chatId, '⚠️ Kullanım: /restory <productId>')
        return NextResponse.json({ ok: true })
      }
      try {
        const { docs } = await payload.find({
          collection: 'products',
          where: { id: { equals: arg } },
          depth: 1,
          limit: 1,
        })
        if (docs.length === 0) {
          await sendTelegramMessage(chatId, `❌ Ürün bulunamadı: ${arg}`)
          return NextResponse.json({ ok: true })
        }
        const product = docs[0] as Record<string, unknown>

        const { dispatchStory } = await import('@/lib/storyDispatch')
        const { fetchAutomationSettings } = await import('@/lib/automationDecision')
        const settings = await fetchAutomationSettings(payload)
        const storyTargets = (settings as Record<string, unknown>)?.storyTargets as any[] | undefined

        const result = await dispatchStory(
          product as any,
          storyTargets ?? null,
          payload as any,
          'retry',
        )

        await sendTelegramMessage(
          chatId,
          `🔄 Re-Story ${result.jobCreated ? 'oluşturuldu' : 'başarısız'}\n\n` +
            `Ürün: ${product.title ?? arg}\n` +
            `Durum: ${result.status}\n` +
            (result.storyJobId ? `Job ID: ${result.storyJobId}` : '') +
            (result.error ? `\nHata: ${result.error}` : ''),
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await sendTelegramMessage(chatId, `❌ Restory hatası: ${msg}`)
      }
      return NextResponse.json({ ok: true })
    }

    // /targets {productId} — show resolved story targets
    if (text.startsWith('/targets')) {
      const arg = text.trim().split(/\s+/)[1]
      if (!arg) {
        await sendTelegramMessage(chatId, '⚠️ Kullanım: /targets <productId>')
        return NextResponse.json({ ok: true })
      }
      try {
        const { docs } = await payload.find({
          collection: 'products',
          where: { id: { equals: arg } },
          depth: 0,
          limit: 1,
        })
        if (docs.length === 0) {
          await sendTelegramMessage(chatId, `❌ Ürün bulunamadı: ${arg}`)
          return NextResponse.json({ ok: true })
        }
        const product = docs[0] as Record<string, unknown>
        const storySettings = product.storySettings as Record<string, unknown> | undefined

        const { resolveProductTargets } = await import('@/lib/storyTargets')
        const { fetchAutomationSettings } = await import('@/lib/automationDecision')
        const settings = await fetchAutomationSettings(payload)
        const globalTargets = (settings as Record<string, unknown>)?.storyTargets as any[] | undefined

        const resolved = resolveProductTargets(storySettings as any, globalTargets ?? null)

        const lines = [
          `📡 Story Hedefleri — ${product.title ?? arg}`,
          ``,
          `Ürün story: ${storySettings?.enabled ? '✅ Aktif' : '❌ Devre dışı'}`,
          `Auto-on-publish: ${storySettings?.autoOnPublish ? '✅' : '❌'}`,
          ``,
        ]

        if (resolved.length === 0) {
          lines.push('⚠️ Yapılandırılmış hedef yok.')
        } else {
          for (const t of resolved) {
            const statusIcon = !t.supported ? '🚫' : t.enabled ? '✅' : '❌'
            lines.push(
              `${statusIcon} ${t.label} (${t.platform})` +
                (!t.supported ? ` — ${t.blockReason}` : '') +
                (t.requiresApproval ? ' [onay gerekli]' : ''),
            )
          }
        }

        // Truthful API status note
        lines.push(``)
        lines.push(`⚠️ Telegram Bot API henüz story yayını desteklemiyor.`)
        lines.push(`WhatsApp resmi story API: blocked_officially`)

        await sendTelegramMessage(chatId, lines.join('\n'))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await sendTelegramMessage(chatId, `❌ Targets hatası: ${msg}`)
      }
      return NextResponse.json({ ok: true })
    }

    // /approve_story {jobId} — approve a pending story job
    if (text.startsWith('/approve_story')) {
      const jobId = text.trim().split(/\s+/)[1]
      if (!jobId) {
        await sendTelegramMessage(chatId, '⚠️ Kullanım: /approve_story <jobId>')
        return NextResponse.json({ ok: true })
      }
      try {
        const job = await payload.findByID({ collection: 'story-jobs', id: jobId }) as Record<string, unknown>
        if (!job) {
          await sendTelegramMessage(chatId, `❌ Story job bulunamadı: ${jobId}`)
          return NextResponse.json({ ok: true })
        }
        if (job.approvalState === 'approved') {
          await sendTelegramMessage(chatId, `✅ Story #${jobId} zaten onaylanmış.`)
          return NextResponse.json({ ok: true })
        }
        await payload.update({
          collection: 'story-jobs',
          id: jobId,
          data: { approvalState: 'approved', status: 'approved' },
        })
        await sendTelegramMessage(
          chatId,
          `✅ Story #${jobId} onaylandı.\n\n` +
            '⚠️ Telegram Bot API henüz story yayını desteklemiyor.\n' +
            'Durum: approved — gerçek yayın API desteği geldiğinde çalışacak.',
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await sendTelegramMessage(chatId, `❌ Approve hatası: ${msg}`)
      }
      return NextResponse.json({ ok: true })
    }

    // /reject_story {jobId} — reject a pending story job
    if (text.startsWith('/reject_story')) {
      const jobId = text.trim().split(/\s+/)[1]
      if (!jobId) {
        await sendTelegramMessage(chatId, '⚠️ Kullanım: /reject_story <jobId>')
        return NextResponse.json({ ok: true })
      }
      try {
        await payload.update({
          collection: 'story-jobs',
          id: jobId,
          data: {
            approvalState: 'rejected',
            status: 'failed',
            errorLog: JSON.stringify({ reason: 'Rejected by operator via /reject_story', at: new Date().toISOString() }),
          },
        })
        await sendTelegramMessage(chatId, `❌ Story #${jobId} reddedildi.`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await sendTelegramMessage(chatId, `❌ Reject hatası: ${msg}`)
      }
      return NextResponse.json({ ok: true })
    }

    // ── STOCK UPDATE komutu ────────────────────────────────────────────────────
    if (text.startsWith('STOCK SKU:')) {
      const stockUpdate = parseStockUpdate(text)
      if (!stockUpdate) {
        await sendTelegramMessage(chatId, '❌ Geçersiz STOCK formatı.')
        return NextResponse.json({ ok: true })
      }

      const { sku, changes } = stockUpdate

      const { docs: products } = await payload.find({
        collection: 'products',
        where: { sku: { equals: sku } },
        depth: 1,
        limit: 1,
      })

      if (products.length === 0) {
        await sendTelegramMessage(chatId, `❌ SKU bulunamadı: ${sku}`)
        return NextResponse.json({ ok: true })
      }

      const product = products[0]
      const results: string[] = []

      for (const { size, delta } of changes) {
        const { docs: variants } = await payload.find({
          collection: 'variants',
          where: {
            and: [
              { product: { equals: product.id } },
              { size: { equals: size } },
            ],
          },
          limit: 1,
        })

        if (variants.length > 0) {
          const variant = variants[0]
          const newStock = Math.max(0, (variant.stock as number) + delta)
          await payload.update({
            collection: 'variants',
            id: variant.id,
            data: { stock: newStock },
          })
          await payload.create({
            collection: 'inventory-logs',
            data: {
              sku,
              size,
              change: delta,
              reason: 'Telegram stock update',
              source: 'telegram',
              timestamp: new Date().toISOString(),
            },
          })
          results.push(`Beden ${size}: ${variant.stock} → ${newStock}`)
        } else {
          results.push(`Beden ${size}: bulunamadı`)
        }
      }

      // Phase 9: Central stock reaction after variant updates
      try {
        const { reactToStockChange, formatStockStatusMessage, getStockSnapshot } = await import('@/lib/stockReaction')
        const reactionResult = await reactToStockChange(payload, product as any, 'telegram')
        if (reactionResult.reacted && reactionResult.transition) {
          const t = reactionResult.transition
          if (t.isSoldoutTransition) {
            results.push(`\n🔴 TÜKENDİ — Stok sıfırlandı. Ürün satılabilir değil.`)
            results.push(`  Merchandising bölümlerinden çıkarıldı.`)
          } else if (t.isRestockTransition) {
            results.push(`\n🔄 TEKRAR STOKTA — Ürün tekrar satılabilir.`)
            results.push(`  Merchandising bölümlerine geri eklendi.`)
          } else if (t.newState === 'low_stock') {
            results.push(`\n⚠️ Az stok — toplam: ${reactionResult.snapshot.effectiveStock}`)
          }
        }
      } catch (stockErr) {
        console.error(
          `[telegram] stockReaction failed (non-blocking):`,
          stockErr instanceof Error ? stockErr.message : String(stockErr),
        )
      }

      await sendTelegramMessage(chatId, `✅ Stok güncellendi (${sku}):\n${results.join('\n')}`)
      return NextResponse.json({ ok: true })
    }

    // ── Eski ürün oluşturma (legacy format, geriye dönük uyumluluk) ───────────
    if (message.photo || message.media_group_id) {
      const productData = parseTelegramCaption(text) as (ReturnType<typeof parseTelegramCaption> & {
        description?: string
        postToInstagram?: boolean
        sizes?: Record<string, number>
      }) | null

      if (!productData || !productData.title || !productData.sku) {
        // Legacy formatta değil — sessizce geç
        return NextResponse.json({ ok: true })
      }

      const { docs: existing } = await payload.find({
        collection: 'products',
        where: { sku: { equals: productData.sku } },
        limit: 1,
      })

      if (existing.length > 0) {
        await sendTelegramMessage(chatId, `❌ SKU zaten mevcut: ${productData.sku}`)
        return NextResponse.json({ ok: true })
      }

      const slug = slugify(productData.title) + '-' + productData.sku.toLowerCase()

      const newProduct = await payload.create({
        collection: 'products',
        data: {
          title: productData.title,
          slug,
          sku: productData.sku,
          brand: productData.brand,
          category: productData.category,
          price: productData.price,
          description: productData.description,
          status: 'active',
          createdByAutomation: true,
        },
      })

      for (const [size, stock] of Object.entries(productData.sizes ?? {})) {
        await payload.create({
          collection: 'variants',
          data: {
            product: newProduct.id,
            size,
            stock,
            variantSku: `${productData.sku}-${size}`,
          },
        })
        await payload.create({
          collection: 'inventory-logs',
          data: {
            sku: productData.sku,
            size,
            change: stock,
            reason: 'Initial stock from Telegram',
            source: 'telegram',
            timestamp: new Date().toISOString(),
          },
        })
      }

      await sendTelegramMessage(
        chatId,
        `✅ Ürün oluşturuldu!\n\n📦 ${productData.title}\nSKU: ${productData.sku}\nFiyat: ${productData.price} ₺`,
      )
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
