import { NextRequest, NextResponse, after } from 'next/server'
import { AsyncLocalStorage } from 'node:async_hooks'
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
// D-174: Per-request token isolation via AsyncLocalStorage.
// Previously used a module-level `let _requestBotToken` which caused a race:
// when both Uygunops and Geo_bot webhooks hit the same Lambda instance,
// Node.js async interleaving at `await` points let Geo_bot overwrite the token
// while Uygunops was mid-handler, causing wizard messages to be sent as Geo_bot.
// AsyncLocalStorage scopes the token per async execution context — no cross-talk.
const botTokenStore = new AsyncLocalStorage<string>()
function getBotToken(): string | undefined {
  return botTokenStore.getStore() || process.env.TELEGRAM_BOT_TOKEN
}

/** Send a Telegram message using an explicit bot token (for cross-bot notifications). */
async function sendTelegramMessageAs(
  token: string,
  chatId: number,
  text: string,
  keyboard?: Array<Array<{ text: string; callback_data: string }>>,
): Promise<void> {
  const safeText = text.length > 4000 ? text.substring(0, 4000) + '\n\n⚠️ (mesaj kesildi — çok uzun)' : text
  const body: Record<string, unknown> = { chat_id: chatId, text: safeText, parse_mode: 'HTML' }
  if (keyboard) {
    body.reply_markup = { inline_keyboard: keyboard }
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

/** D-171: Available shoe sizes for interactive keyboard selection */
const AVAILABLE_SIZES = ['39', '40', '41', '42', '43', '44', '45', '46', '47']

/** Stock quantity options for per-size stock selection */
const STOCK_QTY_OPTIONS = [1, 2, 3, 4, 5, 10]

/** Build inline keyboard for size multi-select (39–47) */
function buildSizeKeyboard(
  selectedSizes: Set<string>,
): Array<Array<{ text: string; callback_data: string }>> {
  const rows: Array<Array<{ text: string; callback_data: string }>> = []
  // Row 1: 39, 40, 41, 42  |  Row 2: 43, 44, 45, 46  |  Row 3: 47
  const layout = [[0, 4], [4, 8], [8, 9]]
  for (const [start, end] of layout) {
    const row = AVAILABLE_SIZES.slice(start, end).map((size) => ({
      text: selectedSizes.has(size) ? `✅ ${size}` : size,
      callback_data: `wz_size:${size}`,
    }))
    if (row.length > 0) rows.push(row)
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

/** Build inline keyboard for per-size stock quantity selection */
function buildStockQtyKeyboard(
  size: string,
): Array<Array<{ text: string; callback_data: string }>> {
  return [
    STOCK_QTY_OPTIONS.map((qty) => ({
      text: `${qty}`,
      callback_data: `wz_stock:${size}:${qty}`,
    })),
  ]
}

function formatStockQtyText(
  sizeStockMap: Record<string, number>,
  allSizes: string[],
  currentSize: string,
): string {
  const lines = ['📦 <b>Her beden için stok adedi seçin:</b>\n']
  for (const s of allSizes) {
    const qty = sizeStockMap[s]
    if (qty !== undefined) {
      lines.push(`  ✅ ${s} → ${qty} adet`)
    } else if (s === currentSize) {
      lines.push(`  👉 <b>${s} → ?</b>`)
    } else {
      lines.push(`  ⏳ ${s}`)
    }
  }
  return lines.join('\n')
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
  userId?: number,
): Promise<void> {
  // D-156: depth:1 forces Payload to populate the generatedImages hasMany
  // relationship as full media docs. Earlier depth:0 path was returning
  // an empty array for this field on recent jobs (216+), causing "⚠️
  // Onaylanacak geçerli görsel bulunamadı." even though the underlying
  // image_generation_jobs_rels table had the correct rows. depth:1 is
  // guaranteed to traverse the rels join and populate the field.
  const jobDoc = await payload.findByID({
    collection: 'image-generation-jobs',
    id: jobId,
    depth: 1,
  }) as Record<string, unknown>

  const productRef = jobDoc.product as { id: number } | number | null
  if (!productRef) throw new Error('İş kaydında ürün referansı yok')
  const productId = typeof productRef === 'object' ? productRef.id : productRef

  const generatedImages = (jobDoc.generatedImages as Array<{ id: number } | number> | undefined) ?? []
  let allMediaIds = generatedImages
    .map((img) => (typeof img === 'object' ? img.id : img))
    .filter((id): id is number => typeof id === 'number')

  // D-156: fallback — if Payload still returned an empty array (schema
  // serialization drift, access-control quirk, etc.), read the rels table
  // directly via the Drizzle node-postgres pool. This guarantees approve
  // never fails on a valid job whose rels rows exist in the DB.
  if (allMediaIds.length === 0) {
    try {
      const pool = (payload.db as unknown as { pool: { query: (text: string, vals: unknown[]) => Promise<{ rows: Array<{ media_id: number }> }> } }).pool
      const { rows } = await pool.query(
        'SELECT media_id FROM image_generation_jobs_rels WHERE parent_id = $1 AND path = $2 ORDER BY "order" ASC',
        [Number(jobId), 'generatedImages'],
      )
      const fallbackIds = rows.map((r) => r.media_id).filter((id): id is number => typeof id === 'number')
      if (fallbackIds.length > 0) {
        console.warn(
          `[telegram/approveImageGenJob D-156] Payload returned empty generatedImages for job ${jobId}, ` +
            `recovered ${fallbackIds.length} ids from rels table directly: [${fallbackIds.join(',')}]`,
        )
        allMediaIds = fallbackIds
      }
    } catch (err) {
      console.error(
        `[telegram/approveImageGenJob D-156] rels table fallback query failed for job ${jobId}:`,
        err,
      )
    }
  }

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
    console.error(
      `[telegram/approveImageGenJob] No approved media IDs — job=${jobId} slots="${slotsStr}" ` +
        `allMediaIds=[${allMediaIds.join(',')}] generatedImages=${JSON.stringify(generatedImages?.length ?? 'undef')}`,
    )
    await sendTelegramMessage(
      chatId,
      `⚠️ Onaylanacak geçerli görsel bulunamadı.\n<code>Job: ${jobId} | Media: ${allMediaIds.length} | Slots: ${slotsStr || 'all'}</code>`,
    )
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
  // D-172f: Deduplicate — prevent the same media ID from appearing twice
  // if operator re-approves or re-generates for the same product.
  const existingIds = new Set(existingGallery.map((e) => (typeof e.image === 'object' ? (e.image as any).id : e.image)))
  const newEntries = approvedMediaIds
    .filter((id) => !existingIds.has(id))
    .map((id) => ({ image: id }))
  const updatedGallery = [...existingGallery, ...newEntries]
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

  // D-203: Auto-start confirmation wizard immediately after image approval.
  // Previously showed a verbose message + button requiring an extra click.
  // Now we skip straight to the first wizard prompt.
  // GeoBot content generation still waits for wizard completion (D-162 rule).
  if (userId) {
    try {
      const {
        checkConfirmationFields, getNextWizardStep, setWizardSession, clearWizardSession,
        getTitlePrompt, getCategoryPrompt, getProductTypePrompt,
        getPricePrompt, getTargetsPrompt, getBrandPrompt, formatConfirmationSummary,
        applyVisionAutofillToSession, formatAutofillReport,
      } = await import('@/lib/confirmationWizard')

      const freshProduct = await payload.findByID({ collection: 'products', id: productId, depth: 1 })
      const check = checkConfirmationFields(freshProduct as any)
      const collected: Record<string, unknown> = {}

      // D-230: Run vision autofill ONCE here so high-confidence detections
      // pre-fill `collected` BEFORE getNextWizardStep decides which step to
      // ask. Low-confidence detections become hint suggestions on the
      // prompt builders.
      const wizState: any = {
        productId, chatId, userId,
        step: 'category' as any, // placeholder — overwritten below
        collected,
        startedAt: Date.now(),
      }
      const autofill = await applyVisionAutofillToSession(payload, freshProduct as any, wizState)
      const autofillMsg = formatAutofillReport(autofill.filled, autofill.suggested, autofill.result)
      if (autofillMsg) {
        await sendTelegramMessage(chatId, autofillMsg)
      }

      const nextStep = getNextWizardStep(freshProduct as any, collected as any)
      wizState.step = nextStep

      if (check.ready && nextStep === 'summary') {
        const summary = formatConfirmationSummary(freshProduct as any, collected as any)
        await sendTelegramMessageWithKeyboard(chatId, summary, [
          [
            { text: '✅ Onayla', callback_data: `wz_confirm:${productId}` },
            { text: '✏️ Düzenle', callback_data: `wz_edit:${productId}` },
            { text: '❌ İptal', callback_data: `wz_cancel:${productId}` },
          ],
        ])
        await setWizardSession(chatId, {
          ...wizState,
          step: 'summary',
        }, userId)
      } else {
        await clearWizardSession(chatId, userId)
        await setWizardSession(chatId, wizState, userId)

        // Dispatch first wizard prompt directly. D-230: pass autofillPreview
        // hints to category/productType/brand builders so low-confidence
        // suggestions render inline.
        const ap = wizState.autofillPreview
        if (nextStep === 'title') {
          await sendTelegramMessage(chatId, getTitlePrompt((freshProduct as any).title ?? `Ürün #${productId}`))
        } else if (nextStep === 'category') {
          const catPrompt = getCategoryPrompt(ap?.category)
          await sendTelegramMessageWithKeyboard(chatId, catPrompt.text, catPrompt.keyboard)
        } else if (nextStep === 'productType') {
          const ptypePrompt = getProductTypePrompt(ap?.productType)
          await sendTelegramMessageWithKeyboard(chatId, ptypePrompt.text, ptypePrompt.keyboard)
        } else if (nextStep === 'price') {
          await sendTelegramMessage(chatId, getPricePrompt())
        } else if (nextStep === 'sizes') {
          wizState.pendingSizes = []
          const sizeMsg = await sendTelegramMessageWithKeyboard(
            chatId, formatSizeSelectionText(new Set()), buildSizeKeyboard(new Set()))
          if (sizeMsg) wizState.sizeMessageId = sizeMsg
          await setWizardSession(chatId, wizState, userId)
        } else if (nextStep === 'brand') {
          await sendTelegramMessage(chatId, getBrandPrompt(ap?.brand))
        } else if (nextStep === 'targets') {
          const tgtPrompt = getTargetsPrompt()
          await sendTelegramMessageWithKeyboard(chatId, tgtPrompt.text, tgtPrompt.keyboard)
        } else {
          // Unknown step — fall back to button
          await sendTelegramMessageWithKeyboard(chatId,
            `✅ <b>${approvedMediaIds.length} görsel onaylandı</b>`,
            [[{ text: '📋 Bilgileri Gir', callback_data: `wz_start:${productId}` }]])
        }
      }
    } catch (wizErr) {
      console.error('[approveImageGenJob] auto-wizard start failed:', wizErr)
      // Fallback: show simple button if wizard auto-start fails
      await sendTelegramMessageWithKeyboard(chatId,
        `✅ <b>${approvedMediaIds.length} görsel onaylandı</b>`,
        [[{ text: '📋 Bilgileri Gir → Onaya Gönder', callback_data: `wz_start:${productId}` }]])
    }
  } else {
    // No userId available — show button as fallback
    await sendTelegramMessageWithKeyboard(chatId,
      `✅ <b>${approvedMediaIds.length} görsel onaylandı</b>`,
      [[{ text: '📋 Bilgileri Gir → Onaya Gönder', callback_data: `wz_start:${productId}` }]])
  }
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

  // D-203: removed "Premium görsel üretimi başlatıldı" notification — operator gets
  // notified when images are READY, no need to announce generation start

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
  // ── Multi-bot token resolution ─────────────────────────────────────────
  // Geo_bot webhook is set with ?bot=geo query parameter.
  // Uygunops uses the default path (no query param).
  const botParam = new URL(req.url).searchParams.get('bot')
  const resolvedToken = (botParam === 'geo' && process.env.TELEGRAM_GEO_BOT_TOKEN)
    ? process.env.TELEGRAM_GEO_BOT_TOKEN
    : process.env.TELEGRAM_BOT_TOKEN!

  // D-174: Run entire handler inside AsyncLocalStorage so getBotToken()
  // always returns THIS request's token, even during async interleaving.
  return botTokenStore.run(resolvedToken, async () => {
  try {

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

      // ── Phase R: Command ownership split for callbacks ───────────────────
      // Ops Bot (Uygunops) owns: image generation, image approval, wizard callbacks
      // GeoBot owns: story callbacks + geo_* buttons
      // NOTE (D-155): Phase R prefix classification MUST run BEFORE the Phase N
      // bot-role gate, because image approval previews are sent by Uygunops
      // into the ops GROUP chat — the Phase N "Uygunops-in-group → silent drop"
      // rule was swallowing every imgapprove/imgregen/imgreject/imgpremium/wz_*
      // button click and breaking the entire golden-path approval flow.
      // D-220: `pi:` callbacks are Product Intelligence Bot approval actions
      //        (pi:approve|sendgeo|regen|reject:{reportId}) — owned by Uygunops.
      const OPS_CB_PREFIXES = ['imagegen:', 'imgapprove:', 'imgreject:', 'imgregen:', 'imgpremium:', 'wz_start:', 'wz_cat:', 'wz_ptype:', 'wz_tgt:', 'wz_size:', 'wz_stock:', 'wz_confirm:', 'wz_cancel:', 'wz_edit:', 'pi:']
      const GEO_CB_PREFIXES = ['storyapprove:', 'storyreject:', 'storyretry:', 'geo_content:', 'geo_audit:', 'geo_auditrun:', 'geo_activate:', 'geo_retry:']
      // D-191c: /ara and /sn are shared commands — their callbacks must work on BOTH bots
      const SHARED_CB_PREFIXES = ['ara_stok:', 'ara_pipe:', 'ara_activate:', 'ara_shopier:', 'sn_']
      const isOpsCb = OPS_CB_PREFIXES.some(p => cbData.startsWith(p))
      const isGeoCb = GEO_CB_PREFIXES.some(p => cbData.startsWith(p))
      const isSharedCb = SHARED_CB_PREFIXES.some(p => cbData.startsWith(p))

      // Wrong-bot redirects (prefix-based, authoritative)
      // Shared callbacks skip this gate — they work on both bots
      if (botParam === 'geo' && isOpsCb && !isSharedCb) {
        await answerCallbackQuery(cbQueryId, '📌 Bu işlem @Uygunops_bot üzerinden çalışır.')
        return NextResponse.json({ ok: true })
      }
      if (botParam !== 'geo' && isGeoCb && !isSharedCb) {
        await answerCallbackQuery(cbQueryId, '📌 Bu işlem GeoBot üzerinden çalışır.')
        return NextResponse.json({ ok: true })
      }

      // ── Phase N: Bot role fallback for UN-classified callbacks only ──────
      // Classified ops callbacks are allowed in both DM and group (image
      // previews live in the ops group). Only unknown prefixes fall through
      // to the bot-role default routing.
      if (botParam === 'geo' && !cbIsGroup && !isGeoCb && !isOpsCb && !isSharedCb) {
        await answerCallbackQuery(cbQueryId, '📌 DM komutları için @Uygunops_bot kullanın.')
        return NextResponse.json({ ok: true })
      }
      if (botParam !== 'geo' && cbIsGroup && !isOpsCb && !isGeoCb && !isSharedCb) {
        // Unknown Uygunops callback in group → silently acknowledge (noise filter)
        await answerCallbackQuery(cbQueryId)
        return NextResponse.json({ ok: true })
      }

      // ── D-158: Hydrate DB-backed wizard session for wizard callbacks ─────
      // The in-memory wizard Map is per-Lambda-instance and does not survive
      // cold starts or deploys. For any wz_* callback, load the session from
      // Neon into the Map before the handler runs so operators don't get
      // "⚠️ Aktif sihirbaz yok" after a deploy or cold start.
      if (cbData.startsWith('wz_')) {
        try {
          const { hydrateWizardSession, bindWizardPayload, getWizardSession: peekSession } =
            await import('@/lib/confirmationWizard')
          const cbWizPayload = await getPayload()
          bindWizardPayload(cbWizPayload)
          const hydrated = await hydrateWizardSession(cbWizPayload, cbChatId, cbUserId)
          const peekAfter = peekSession(cbChatId, cbUserId)
          console.log(`[wz_hydrate] chat=${cbChatId} user=${cbUserId} cb=${cbData} hydrated=${hydrated ? `step=${hydrated.step}` : 'null'} peek=${peekAfter ? `step=${peekAfter.step}` : 'null'}`)
        } catch (err) {
          console.warn('[telegram/D-158] wizard hydrate failed:', err instanceof Error ? err.message : err)
        }
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

            // D-203: removed "Gemini Pro görsel üretimi başlatıldı" — operator gets notified when ready

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

      // ── D-220: pi:{action}:{reportId} — Product Intelligence Bot actions ─
      // Actions:
      //   pi:approve:{id}   → mark report approved (does NOT publish yet)
      //   pi:sendgeo:{id}   → merge pack into product.content + emit bot-event
      //                       (operator still controls final channel publish)
      //   pi:regen:{id}     → regenerate SEO/GEO pack from same inputs
      //   pi:reject:{id}    → mark report rejected
      //
      // Hand-off rule: PI Bot PREPARES, GeoBot + channelDispatch PUBLISH.
      // Nothing here writes to external channels; it only stages content
      // into fields the existing pipeline already understands.
      if (cbData.startsWith('pi:')) {
        const parts = cbData.split(':')
        const piAction = parts[1] as 'approve' | 'sendgeo' | 'regen' | 'reject'
        const piReportId = parts[2]
        if (!piReportId) {
          await answerCallbackQuery(cbQueryId, '❌ Rapor ID yok')
          return NextResponse.json({ ok: true })
        }

        if (piAction === 'approve') {
          await answerCallbackQuery(cbQueryId, '✅ Onaylanıyor...')
          after(async () => {
            try {
              const piPayload = await getPayload()
              const { approveReport } = await import('@/lib/productIntelligence/geoBotHandoff')
              const r = await approveReport(piPayload, piReportId, cbUserId)
              if (!r.ok) {
                await sendTelegramMessage(cbChatId, `❌ Onay hatası: ${r.error ?? 'bilinmeyen'}`)
                return
              }
              await sendTelegramMessage(
                cbChatId,
                `✅ <b>Rapor #${piReportId} onaylandı.</b>\nGeoBot\'a göndermek için <code>pi:sendgeo:${piReportId}</code> butonunu kullanın.`,
              )
            } catch (err) {
              console.error('[telegram/webhook] pi:approve failed:', err)
              await sendTelegramMessage(cbChatId, `❌ Onay hatası: ${err instanceof Error ? err.message : 'bilinmeyen'}`)
            }
          })
          return NextResponse.json({ ok: true })
        }

        if (piAction === 'sendgeo') {
          await answerCallbackQuery(cbQueryId, '📤 GeoBot\'a gönderiliyor...')
          after(async () => {
            try {
              const piPayload = await getPayload()
              const { sendProductIntelligenceToGeoBot } = await import(
                '@/lib/productIntelligence/geoBotHandoff'
              )
              const result = await sendProductIntelligenceToGeoBot(piPayload, piReportId)
              if (!result.ok) {
                await sendTelegramMessage(
                  cbChatId,
                  `❌ GeoBot handoff başarısız: ${result.error ?? 'bilinmeyen'}`,
                )
                return
              }
              const fields = result.fieldsUpdated.length > 0
                ? result.fieldsUpdated.map((f) => `• ${f}`).join('\n')
                : '(ürünün içerik alanları zaten doluydu — yeni alan eklenmedi)'
              await sendTelegramMessage(
                cbChatId,
                `📤 <b>GeoBot\'a gönderildi — rapor #${piReportId}</b>\n\n` +
                  `Güncellenen alanlar:\n${fields}\n\n` +
                  `Yayınlama, mevcut kanal dispatch akışı üzerinden operatör onayıyla devam eder.`,
              )
            } catch (err) {
              console.error('[telegram/webhook] pi:sendgeo failed:', err)
              await sendTelegramMessage(cbChatId, `❌ GeoBot handoff hatası: ${err instanceof Error ? err.message : 'bilinmeyen'}`)
            }
          })
          return NextResponse.json({ ok: true })
        }

        if (piAction === 'regen') {
          await answerCallbackQuery(cbQueryId, '🔄 Yeniden üretiliyor...')
          after(async () => {
            try {
              const piPayload = await getPayload()
              const existing = await piPayload.findByID({
                collection: 'product-intelligence-reports',
                id: piReportId,
                depth: 0,
              })
              if (!existing) {
                await sendTelegramMessage(cbChatId, '❌ Rapor bulunamadı')
                return
              }
              const existingProductId = typeof existing.product === 'object' ? existing.product?.id : existing.product
              if (!existingProductId) {
                await sendTelegramMessage(cbChatId, '❌ Raporda ürün referansı yok')
                return
              }
              const { createProductIntelligenceReport } = await import(
                '@/lib/productIntelligence/createProductIntelligenceReport'
              )
              const { formatReportSummary, buildReportKeyboard, formatFailedReport } = await import(
                '@/lib/productIntelligence/telegramReport'
              )
              const summary = await createProductIntelligenceReport(piPayload, {
                productId: existingProductId,
                triggerSource: 'telegram',
                telegram: { chatId: cbChatId, operatorUserId: cbUserId },
              })
              if (summary.status === 'failed') {
                await sendTelegramMessage(cbChatId, formatFailedReport(existingProductId, summary.error ?? 'unknown'))
                return
              }
              const fresh = await piPayload.findByID({
                collection: 'product-intelligence-reports',
                id: summary.reportId,
                depth: 0,
              })
              const sp = (fresh?.seoPack ?? {}) as Record<string, unknown>
              const gp = (fresh?.geoPack ?? {}) as Record<string, unknown>
              const { docs: prodDocs } = await piPayload.find({
                collection: 'products',
                where: { id: { equals: existingProductId } },
                limit: 1,
                depth: 0,
              })
              const pTitle = String(prodDocs[0]?.title ?? `Ürün #${existingProductId}`)
              const msgText = formatReportSummary(
                pTitle,
                existingProductId,
                summary,
                {
                  seoTitle: !!sp.seoTitle,
                  metaDescription: !!sp.metaDescription,
                  productDescription: !!sp.productDescription,
                  tags: Array.isArray(sp.tags) && (sp.tags as unknown[]).length > 0,
                  faq: Array.isArray(sp.faq) && (sp.faq as unknown[]).length > 0,
                },
                {
                  aiSearchSummary: !!gp.aiSearchSummary,
                  buyerIntentKeywords: Array.isArray(gp.buyerIntentKeywords) && (gp.buyerIntentKeywords as unknown[]).length > 0,
                  productComparisonText: !!gp.productComparisonText,
                },
              )
              const kb = buildReportKeyboard(summary.reportId)
              await sendTelegramMessageWithKeyboard(cbChatId, msgText, kb)
            } catch (err) {
              console.error('[telegram/webhook] pi:regen failed:', err)
              await sendTelegramMessage(cbChatId, `❌ Yeniden üretim hatası: ${err instanceof Error ? err.message : 'bilinmeyen'}`)
            }
          })
          return NextResponse.json({ ok: true })
        }

        if (piAction === 'reject') {
          await answerCallbackQuery(cbQueryId, '🚫 Reddedildi')
          after(async () => {
            try {
              const piPayload = await getPayload()
              const { rejectReport } = await import('@/lib/productIntelligence/geoBotHandoff')
              const r = await rejectReport(piPayload, piReportId, cbUserId)
              if (!r.ok) {
                await sendTelegramMessage(cbChatId, `❌ Red hatası: ${r.error ?? 'bilinmeyen'}`)
                return
              }
              await sendTelegramMessage(cbChatId, `🚫 Rapor #${piReportId} reddedildi.`)
            } catch (err) {
              console.error('[telegram/webhook] pi:reject failed:', err)
              await sendTelegramMessage(cbChatId, `❌ Red hatası: ${err instanceof Error ? err.message : 'bilinmeyen'}`)
            }
          })
          return NextResponse.json({ ok: true })
        }

        // Unknown pi: action — silent ack to avoid Telegram retries
        await answerCallbackQuery(cbQueryId)
        return NextResponse.json({ ok: true })
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
            await approveImageGenJob(approvePayload, cbJobId, slotsStr, cbChatId, cbUserId)
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

      // ── Phase U: GeoBot one-tap post-handoff actions ──────────────────────

      // geo_content:{productId} — show content status + preview
      if (cbData.startsWith('geo_content:')) {
        const geoProductId = parseInt(cbData.replace('geo_content:', ''))
        await answerCallbackQuery(cbQueryId, '📋 İçerik durumu...')
        try {
          const payloadInst = await getPayload()
          const product = await payloadInst.findByID({ collection: 'products', id: geoProductId, depth: 1 })
          if (!product) {
            await sendTelegramMessage(cbChatId, `❌ Ürün #${geoProductId} bulunamadı.`)
          } else {
            const { formatContentStatusMessage, formatContentPreviewMessage } = await import('@/lib/contentPack')
            const statusMsg = formatContentStatusMessage(product as any)
            await sendTelegramMessage(cbChatId, statusMsg)

            // Phase X: Send actual content preview if available
            const previewMsg = formatContentPreviewMessage(product as any)
            if (previewMsg) {
              await sendTelegramMessageWithKeyboard(cbChatId, previewMsg, [
                [
                  { text: '🔍 Audit Başlat', callback_data: `geo_auditrun:${geoProductId}` },
                  { text: '🚀 Yayına Al', callback_data: `geo_activate:${geoProductId}` },
                ],
              ])
            }
          }
        } catch (err) {
          console.error('[telegram/webhook] geo_content callback failed:', err)
          await sendTelegramMessage(cbChatId, `❌ Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
        }
        return NextResponse.json({ ok: true })
      }

      // geo_audit:{productId} — show audit status
      if (cbData.startsWith('geo_audit:') && !cbData.startsWith('geo_auditrun:')) {
        const geoProductId = parseInt(cbData.replace('geo_audit:', ''))
        await answerCallbackQuery(cbQueryId, '🔍 Audit durumu...')
        try {
          const payloadInst = await getPayload()
          const product = await payloadInst.findByID({ collection: 'products', id: geoProductId, depth: 1 })
          if (!product) {
            await sendTelegramMessage(cbChatId, `❌ Ürün #${geoProductId} bulunamadı.`)
          } else {
            const { formatAuditStatusMessage } = await import('@/lib/mentixAudit')
            const statusMsg = formatAuditStatusMessage(product as any)
            await sendTelegramMessage(cbChatId, statusMsg)
          }
        } catch (err) {
          console.error('[telegram/webhook] geo_audit callback failed:', err)
          await sendTelegramMessage(cbChatId, `❌ Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
        }
        return NextResponse.json({ ok: true })
      }

      // geo_auditrun:{productId} — trigger/run audit
      if (cbData.startsWith('geo_auditrun:')) {
        const geoProductId = parseInt(cbData.replace('geo_auditrun:', ''))
        await answerCallbackQuery(cbQueryId, '🔍 Audit başlatılıyor...')
        try {
          const payloadInst = await getPayload()
          const product = await payloadInst.findByID({ collection: 'products', id: geoProductId, depth: 1 })
          if (!product) {
            await sendTelegramMessage(cbChatId, `❌ Ürün #${geoProductId} bulunamadı.`)
            return NextResponse.json({ ok: true })
          }
          const { isAuditEligible, triggerAudit, formatAuditStatusMessage } = await import('@/lib/mentixAudit')
          if (!isAuditEligible(product as any)) {
            await sendTelegramMessage(cbChatId,
              `⚠️ Ürün #${geoProductId} audit için uygun değil.\n` +
              `Durum: contentStatus=${(product as any).workflow?.contentStatus ?? '—'}`)
            return NextResponse.json({ ok: true })
          }
          await sendTelegramMessage(cbChatId, `⏳ Ürün #${geoProductId} audit başlatılıyor...`)
          const auditResult = await triggerAudit(payloadInst, product, 'telegram_command')
          const updatedProduct = await payloadInst.findByID({ collection: 'products', id: geoProductId, depth: 1 })
          const statusMsg = formatAuditStatusMessage((updatedProduct ?? product) as any)
          const nextButtons: Array<Array<{ text: string; callback_data: string }>> = []
          const auditStatus = (updatedProduct as any)?.auditResult?.overallResult
          if (auditStatus === 'approved' || auditStatus === 'approved_with_warning') {
            nextButtons.push([{ text: '🚀 Yayına Al', callback_data: `geo_activate:${geoProductId}` }])
          }
          if (nextButtons.length > 0) {
            await sendTelegramMessageWithKeyboard(cbChatId, statusMsg, nextButtons)
          } else {
            await sendTelegramMessage(cbChatId, statusMsg)
          }
        } catch (err) {
          console.error('[telegram/webhook] geo_auditrun callback failed:', err)
          await sendTelegramMessage(cbChatId, `❌ Audit hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
        }
        return NextResponse.json({ ok: true })
      }

      // geo_activate:{productId} — activate product for publishing
      if (cbData.startsWith('geo_activate:')) {
        const geoProductId = parseInt(cbData.replace('geo_activate:', ''))
        await answerCallbackQuery(cbQueryId, '🚀 Aktivasyon...')
        try {
          const payloadInst = await getPayload()
          const product = await payloadInst.findByID({ collection: 'products', id: geoProductId, depth: 1 })
          if (!product) {
            await sendTelegramMessage(cbChatId, `❌ Ürün #${geoProductId} bulunamadı.`)
            return NextResponse.json({ ok: true })
          }
          if ((product as any).status === 'active') {
            await sendTelegramMessage(cbChatId, `✅ Ürün #${geoProductId} zaten aktif.`)
            return NextResponse.json({ ok: true })
          }
          const { evaluatePublishReadiness, formatReadinessMessage } = await import('@/lib/publishReadiness')
          let readiness = evaluatePublishReadiness(product as any)
          let effectiveProduct = product

          // D-209: if the ONLY missing piece is audit, auto-run it as part of "Yayına Al"
          if (readiness.level !== 'ready') {
            const { isAuditEligible, triggerAudit } = await import('@/lib/mentixAudit')
            const auditStatus = (product as any)?.auditResult?.overallResult
            const needsAudit = auditStatus !== 'approved' && auditStatus !== 'approved_with_warning'
            if (needsAudit && isAuditEligible(product as any)) {
              await sendTelegramMessage(cbChatId, `🔍 Ürün #${geoProductId} için audit başlatılıyor...`)
              try {
                await triggerAudit(payloadInst, product, 'geo_activate_auto')
              } catch (err) {
                console.error('[telegram/webhook] geo_activate auto-audit failed:', err)
              }
              effectiveProduct = (await payloadInst.findByID({
                collection: 'products', id: geoProductId, depth: 1,
              })) ?? product
              readiness = evaluatePublishReadiness(effectiveProduct as any)
            }
          }

          if (readiness.level !== 'ready') {
            await sendTelegramMessage(cbChatId,
              `⛔ Ürün #${geoProductId} yayına alınamıyor:\n\n` +
              formatReadinessMessage(effectiveProduct as any, readiness))
            return NextResponse.json({ ok: true })
          }
          // Activate: set status=active, merchandising fields, workflow
          const now = new Date().toISOString()
          const newUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          await payloadInst.update({
            collection: 'products',
            id: geoProductId,
            data: {
              status: 'active',
              merchandising: {
                ...((product as any).merchandising ?? {}),
                publishedAt: now,
                newUntil,
              },
              workflow: {
                ...((product as any).workflow ?? {}),
                workflowStatus: 'active',
                publishStatus: 'published',
                lastHandledByBot: 'geobot',
              },
            },
          })
          await payloadInst.create({
            collection: 'bot-events',
            data: {
              eventType: 'product.activated',
              product: geoProductId,
              sourceBot: 'geobot',
              status: 'processed',
              notes: `Product ${geoProductId} activated via GeoBot inline button.`,
              processedAt: now,
            },
          })
          await sendTelegramMessage(cbChatId,
            `🚀 <b>Ürün #${geoProductId} yayına alındı!</b>\n\n` +
            `📅 Yeni bölümünde: ${newUntil.substring(0, 10)} tarihine kadar\n` +
            `🔗 <a href="https://www.uygunayakkabi.com/admin/collections/products/${geoProductId}">Admin'de gör</a>`)
        } catch (err) {
          console.error('[telegram/webhook] geo_activate callback failed:', err)
          await sendTelegramMessage(cbChatId, `❌ Aktivasyon hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
        }
        return NextResponse.json({ ok: true })
      }

      // geo_retry:{productId} — retry content generation
      if (cbData.startsWith('geo_retry:')) {
        const geoProductId = parseInt(cbData.replace('geo_retry:', ''))
        await answerCallbackQuery(cbQueryId, '🔄 İçerik yeniden üretiliyor...')
        try {
          const payloadInst = await getPayload()
          const product = await payloadInst.findByID({ collection: 'products', id: geoProductId, depth: 1 })
          if (!product) {
            await sendTelegramMessage(cbChatId, `❌ Ürün #${geoProductId} bulunamadı.`)
            return NextResponse.json({ ok: true })
          }
          const { canRetriggerContent, triggerContentGeneration } = await import('@/lib/contentPack')
          if (!canRetriggerContent(product as any)) {
            await sendTelegramMessage(cbChatId,
              `⚠️ Ürün #${geoProductId} içerik yeniden üretimi için uygun değil.\n` +
              `Durum: contentStatus=${(product as any).workflow?.contentStatus ?? '—'}`)
            return NextResponse.json({ ok: true })
          }
          await sendTelegramMessage(cbChatId, `⏳ Ürün #${geoProductId} içerik yeniden üretiliyor...`)
          const contentResult = await triggerContentGeneration(payloadInst, product as any, 'retry')
          await sendTelegramMessage(cbChatId,
            `${contentResult.triggered ? '✅' : '❌'} İçerik: ${contentResult.contentStatus ?? 'unknown'}` +
            (contentResult.error ? `\n\n⚠️ ${contentResult.error.substring(0, 200)}` : ''))
        } catch (err) {
          console.error('[telegram/webhook] geo_retry callback failed:', err)
          await sendTelegramMessage(cbChatId, `❌ İçerik retry hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
        }
        return NextResponse.json({ ok: true })
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
            getTitlePrompt, getCategoryPrompt, getProductTypePrompt,
            getPricePrompt, getTargetsPrompt, getBrandPrompt, getStockPrompt, formatConfirmationSummary,
            applyVisionAutofillToSession, formatAutofillReport,
          } = await import('@/lib/confirmationWizard')

          const check = checkConfirmationFields(product as any)
          const collected: Record<string, unknown> = {}

          // D-230: vision autofill — same pattern as approveImageGenJob site.
          const wizState: any = {
            productId: wzProductId, chatId: cbChatId, userId: cbUserId,
            step: 'category' as any, // placeholder
            collected, startedAt: Date.now(),
          }
          const autofill = await applyVisionAutofillToSession(payloadInst, product as any, wizState)
          const autofillMsg = formatAutofillReport(autofill.filled, autofill.suggested, autofill.result)
          if (autofillMsg) {
            await sendTelegramMessage(cbChatId, autofillMsg)
          }

          const nextStep = getNextWizardStep(product as any, collected as any)
          wizState.step = nextStep

          // If everything is already filled, go straight to summary
          if (check.ready && nextStep === 'summary') {
            const summary = formatConfirmationSummary(product as any, collected as any)
            await sendTelegramMessageWithKeyboard(cbChatId, summary, [
              [
                { text: '✅ Onayla', callback_data: `wz_confirm:${wzProductId}` },
                { text: '✏️ Düzenle', callback_data: `wz_edit:${wzProductId}` },
                { text: '❌ İptal', callback_data: `wz_cancel:${wzProductId}` },
              ],
            ])
            await setWizardSession(cbChatId, { ...wizState, step: 'summary' }, cbUserId)
            return NextResponse.json({ ok: true })
          }

          // D-203: removed separate "Sihirbaz başlıyor..." status message —
          // wizard immediately shows first prompt, no need for a preamble

          await clearWizardSession(cbChatId, cbUserId)
          await setWizardSession(cbChatId, wizState, cbUserId)

          // Dispatch first prompt — D-230 passes autofill suggestions
          const ap = wizState.autofillPreview
          if (nextStep === 'title') {
            await sendTelegramMessage(cbChatId, getTitlePrompt((product as any).title ?? `Ürün #${wzProductId}`))
          } else if (nextStep === 'category') {
            const catPrompt = getCategoryPrompt(ap?.category)
            await sendTelegramMessageWithKeyboard(cbChatId, catPrompt.text, catPrompt.keyboard)
          } else if (nextStep === 'productType') {
            const ptypePrompt = getProductTypePrompt(ap?.productType)
            await sendTelegramMessageWithKeyboard(cbChatId, ptypePrompt.text, ptypePrompt.keyboard)
          } else if (nextStep === 'price') {
            await sendTelegramMessage(cbChatId, getPricePrompt())
          } else if (nextStep === 'sizes') {
            // D-171: Interactive size keyboard
            wizState.pendingSizes = []
            const sizeMsg = await sendTelegramMessageWithKeyboard(
              cbChatId, formatSizeSelectionText(new Set()), buildSizeKeyboard(new Set()))
            if (sizeMsg) wizState.sizeMessageId = sizeMsg
            await setWizardSession(cbChatId, wizState, cbUserId)
          } else if (nextStep === 'brand') {
            await sendTelegramMessage(cbChatId, getBrandPrompt(ap?.brand))
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
                  getTargetsPrompt, getProductTypePrompt, getBrandPrompt, getStockPrompt,
                  getTitlePrompt, formatConfirmationSummary: fmtSummary } =
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
          session.step = nextStep as any
          await setWizardSession(cbChatId, session, cbUserId)

          if (nextStep === 'productType') {
            const ptypePrompt = getProductTypePrompt(session.autofillPreview?.productType)
            await sendTelegramMessageWithKeyboard(cbChatId, ptypePrompt.text, ptypePrompt.keyboard)
          } else if (nextStep === 'price') {
            await sendTelegramMessage(cbChatId, getPricePrompt())
          } else if (nextStep === 'sizes') {
            // D-171: Interactive size keyboard
            session.pendingSizes = []
            const sizeMsg = await sendTelegramMessageWithKeyboard(
              cbChatId, formatSizeSelectionText(new Set()), buildSizeKeyboard(new Set()))
            if (sizeMsg) session.sizeMessageId = sizeMsg
            await setWizardSession(cbChatId, session, cbUserId)
          } else if (nextStep === 'stock') {
            // D-171: Per-size stock via buttons — start with first size
            const sizes = (session.collected.sizes ?? '').split(',').filter(Boolean)
            session.collected.sizeStockMap = {}
            await setWizardSession(cbChatId, session, cbUserId)
            if (sizes.length > 0) {
              await sendTelegramMessageWithKeyboard(cbChatId,
                formatStockQtyText({}, sizes, sizes[0]), buildStockQtyKeyboard(sizes[0]))
            }
          } else if (nextStep === 'title') {
            await sendTelegramMessage(cbChatId, getTitlePrompt((product as any).title ?? `Ürün #${session.productId}`))
          } else if (nextStep === 'brand') {
            await sendTelegramMessage(cbChatId, getBrandPrompt(session.autofillPreview?.brand))
          } else if (nextStep === 'targets') {
            const tgtPrompt = getTargetsPrompt()
            await sendTelegramMessageWithKeyboard(cbChatId, tgtPrompt.text, tgtPrompt.keyboard)
          } else if (nextStep === 'summary') {
            const summary = fmtSummary(product as any, session.collected)
            await sendTelegramMessageWithKeyboard(cbChatId, summary, [
              [
                { text: '✅ Onayla', callback_data: `wz_confirm:${session.productId}` },
                { text: '✏️ Düzenle', callback_data: `wz_edit:${session.productId}` },
                { text: '❌ İptal', callback_data: `wz_cancel:${session.productId}` },
              ],
            ])
            session.step = 'summary'
            await setWizardSession(cbChatId, session, cbUserId)
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
                  getSizesPrompt, getTargetsPrompt, getBrandPrompt, getStockPrompt,
                  getTitlePrompt, formatConfirmationSummary } =
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
          session.step = nextStep as any
          await setWizardSession(cbChatId, session, cbUserId)

          if (nextStep === 'price') {
            await sendTelegramMessage(cbChatId, getPricePrompt())
          } else if (nextStep === 'sizes') {
            // D-171: Interactive size keyboard
            session.pendingSizes = []
            const sizeMsg = await sendTelegramMessageWithKeyboard(
              cbChatId, formatSizeSelectionText(new Set()), buildSizeKeyboard(new Set()))
            if (sizeMsg) session.sizeMessageId = sizeMsg
            await setWizardSession(cbChatId, session, cbUserId)
          } else if (nextStep === 'stock') {
            // D-171: Per-size stock via buttons — start with first size
            const sizes = (session.collected.sizes ?? '').split(',').filter(Boolean)
            session.collected.sizeStockMap = {}
            await setWizardSession(cbChatId, session, cbUserId)
            if (sizes.length > 0) {
              await sendTelegramMessageWithKeyboard(cbChatId,
                formatStockQtyText({}, sizes, sizes[0]), buildStockQtyKeyboard(sizes[0]))
            }
          } else if (nextStep === 'title') {
            await sendTelegramMessage(cbChatId, getTitlePrompt((product as any).title ?? `Ürün #${session.productId}`))
          } else if (nextStep === 'brand') {
            await sendTelegramMessage(cbChatId, getBrandPrompt(session.autofillPreview?.brand))
          } else if (nextStep === 'targets') {
            const tgtPrompt = getTargetsPrompt()
            await sendTelegramMessageWithKeyboard(cbChatId, tgtPrompt.text, tgtPrompt.keyboard)
          } else if (nextStep === 'summary') {
            const summary = formatConfirmationSummary(product as any, session.collected)
            await sendTelegramMessageWithKeyboard(cbChatId, summary, [
              [
                { text: '✅ Onayla', callback_data: `wz_confirm:${session.productId}` },
                { text: '✏️ Düzenle', callback_data: `wz_edit:${session.productId}` },
                { text: '❌ İptal', callback_data: `wz_cancel:${session.productId}` },
              ],
            ])
            session.step = 'summary'
            await setWizardSession(cbChatId, session, cbUserId)
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
            // D-187: Default to all channel options when none selected
            // (global capability gate will filter at dispatch time)
            if (!session.collected.channelTargets || session.collected.channelTargets.length === 0) {
              session.collected.channelTargets = CHANNEL_OPTIONS.map((o) => o.value)
            }
            await answerCallbackQuery(cbQueryId, `✅ Hedefler: ${session.collected.channelTargets.join(', ')}`)

            // Show summary
            const payloadInst = await getPayload()
            const product = await payloadInst.findByID({ collection: 'products', id: session.productId })
            const summary = formatConfirmationSummary(product as any, session.collected)
            await sendTelegramMessageWithKeyboard(cbChatId, summary, [
              [
                { text: '✅ Onayla', callback_data: `wz_confirm:${session.productId}` },
                { text: '✏️ Düzenle', callback_data: `wz_edit:${session.productId}` },
                { text: '❌ İptal', callback_data: `wz_cancel:${session.productId}` },
              ],
            ])
            session.step = 'summary'
            await setWizardSession(cbChatId, session, cbUserId)
          } else if (tgtValue === 'all') {
            session.collected.channelTargets = CHANNEL_OPTIONS.map((o) => o.value)
            await answerCallbackQuery(cbQueryId, `✅ Tümü seçildi`)
            await setWizardSession(cbChatId, session, cbUserId)
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
            await setWizardSession(cbChatId, session, cbUserId)
          }
        } catch (err) {
          await answerCallbackQuery(cbQueryId, '❌ Hata')
          console.error('[telegram/webhook] wz_tgt callback failed:', err)
        }
        return NextResponse.json({ ok: true })
      }

      // D-171: wz_size:{value} — interactive size multi-select (39–47)
      if (cbData.startsWith('wz_size:')) {
        try {
          const { getWizardSession, setWizardSession } =
            await import('@/lib/confirmationWizard')
          const session = getWizardSession(cbChatId, cbUserId)
          console.log(`[wz_size] chat=${cbChatId} user=${cbUserId} session=${session ? `step=${session.step} product=${session.productId}` : 'null'} data=${cbData}`)
          if (!session || session.step !== 'sizes') {
            const reason = !session ? 'oturum yok' : `adım=${session.step} (sizes bekleniyor)`
            await answerCallbackQuery(cbQueryId, `⚠️ Beden seçimi aktif değil: ${reason}`)
            return NextResponse.json({ ok: true })
          }

          const action = cbData.replace('wz_size:', '')
          const selected = new Set(session.pendingSizes ?? [])

          if (action === 'all') {
            AVAILABLE_SIZES.forEach((s) => selected.add(s))
            await answerCallbackQuery(cbQueryId, '✅ Tümü seçildi')
          } else if (action === 'clear') {
            selected.clear()
            await answerCallbackQuery(cbQueryId, '🗑 Temizlendi')
          } else if (action === 'done') {
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
              await editMessageText(cbChatId, cbMsgId, `✅ <b>Seçilen bedenler:</b> ${sortedSizes.join(', ')}`)
            }
            await answerCallbackQuery(cbQueryId, `✅ ${sortedSizes.length} beden seçildi`)

            // D-171: Move to per-size stock step (buttons)
            session.collected.sizeStockMap = {}
            session.step = 'stock'
            await setWizardSession(cbChatId, session, cbUserId)

            // Show first size stock prompt
            const firstSize = sortedSizes[0]
            await sendTelegramMessageWithKeyboard(
              cbChatId,
              formatStockQtyText(session.collected.sizeStockMap, sortedSizes, firstSize),
              buildStockQtyKeyboard(firstSize),
            )
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
          await setWizardSession(cbChatId, session, cbUserId)

          const cbMsgId = body?.callback_query?.message?.message_id
          if (cbMsgId) {
            await editMessageText(cbChatId, cbMsgId, formatSizeSelectionText(selected), buildSizeKeyboard(selected))
          }
        } catch (err) {
          await answerCallbackQuery(cbQueryId, '❌ Hata')
          console.error('[telegram/webhook] wz_size callback failed:', err)
        }
        return NextResponse.json({ ok: true })
      }

      // D-171: wz_stock:{size}:{qty} — per-size stock quantity selection
      if (cbData.startsWith('wz_stock:')) {
        try {
          const { getWizardSession, setWizardSession, getNextWizardStep,
                  formatConfirmationSummary } = await import('@/lib/confirmationWizard')
          const session = getWizardSession(cbChatId, cbUserId)
          if (!session || session.step !== 'stock') {
            await answerCallbackQuery(cbQueryId, '⚠️ Aktif stok seçimi yok')
            return NextResponse.json({ ok: true })
          }

          // Parse wz_stock:{size}:{qty}
          const parts = cbData.replace('wz_stock:', '').split(':')
          const size = parts[0]
          const qty = parseInt(parts[1], 10)
          if (!size || isNaN(qty) || qty <= 0) {
            await answerCallbackQuery(cbQueryId, '⚠️ Geçersiz değer')
            return NextResponse.json({ ok: true })
          }

          // Record the stock for this size
          if (!session.collected.sizeStockMap) session.collected.sizeStockMap = {}
          session.collected.sizeStockMap[size] = qty
          await answerCallbackQuery(cbQueryId, `✅ ${size} → ${qty} adet`)

          // Check if there are more sizes to set
          const allSizes = (session.collected.sizes ?? '').split(',').filter(Boolean)
          const nextUnsetSize = allSizes.find((s) => session.collected.sizeStockMap![s] === undefined)

          // Update the message to show progress
          const cbMsgId = body?.callback_query?.message?.message_id

          if (nextUnsetSize) {
            // More sizes to set — show next size's quantity buttons
            if (cbMsgId) {
              await editMessageText(
                cbChatId,
                cbMsgId,
                formatStockQtyText(session.collected.sizeStockMap, allSizes, nextUnsetSize),
                buildStockQtyKeyboard(nextUnsetSize),
              )
            }
            await setWizardSession(cbChatId, session, cbUserId)
          } else {
            // All sizes have stock — show summary and advance
            const totalStock = allSizes.reduce((sum, s) => sum + (session.collected.sizeStockMap![s] ?? 1), 0)
            const stockSummary = allSizes.map((s) => `${s}(${session.collected.sizeStockMap![s]})`).join(', ')

            if (cbMsgId) {
              await editMessageText(cbChatId, cbMsgId, `✅ <b>Stok:</b> ${stockSummary}\n<b>Toplam:</b> ${totalStock} adet`)
            }

            // Advance to next wizard step
            const payloadInst = await getPayload()
            const product = await payloadInst.findByID({ collection: 'products', id: session.productId })
            const nextStep = getNextWizardStep(product as any, session.collected)
            session.step = nextStep as any
            await setWizardSession(cbChatId, session, cbUserId)

            // Dispatch the next prompt (inline since we're in callback context with cbChatId)
            if (nextStep === 'title') {
              const { getTitlePrompt } = await import('@/lib/confirmationWizard')
              await sendTelegramMessage(cbChatId, getTitlePrompt((product as any).title ?? `Ürün #${session.productId}`))
            } else if (nextStep === 'brand') {
              const { getBrandPrompt } = await import('@/lib/confirmationWizard')
              await sendTelegramMessage(cbChatId, getBrandPrompt(session.autofillPreview?.brand))
            } else if (nextStep === 'targets') {
              const { getTargetsPrompt } = await import('@/lib/confirmationWizard')
              const tgtPrompt = getTargetsPrompt()
              await sendTelegramMessageWithKeyboard(cbChatId, tgtPrompt.text, tgtPrompt.keyboard)
            } else if (nextStep === 'summary') {
              const summary = formatConfirmationSummary(product as any, session.collected)
              await sendTelegramMessageWithKeyboard(cbChatId, summary, [
                [
                  { text: '✅ Onayla', callback_data: `wz_confirm:${session.productId}` },
                  { text: '✏️ Düzenle', callback_data: `wz_edit:${session.productId}` },
                  { text: '❌ İptal', callback_data: `wz_cancel:${session.productId}` },
                ],
              ])
              session.step = 'summary'
              await setWizardSession(cbChatId, session, cbUserId)
            }
          }
        } catch (err) {
          await answerCallbackQuery(cbQueryId, '❌ Hata')
          console.error('[telegram/webhook] wz_stock callback failed:', err)
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
            await clearWizardSession(cbChatId, cbUserId)
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
              ? ` · ${result.variantsCreated} beden`
              : ''
            // D-203: slimmed confirmation — removed technical fields + GeoBot handoff noise
            await sendTelegramMessage(
              cbChatId,
              `✅ <b>Ürün #${session.productId} onaylandı</b>${variantNote}`,
            )

            // Phase S: GeoBot handoff — silent (no Telegram message)
            // GeoBot content production still triggers, just no "devir aldı" notification
          } else {
            await answerCallbackQuery(cbQueryId, '❌ Onay başarısız')
            await sendTelegramMessage(
              cbChatId,
              `❌ Onay hatası: ${result.error}`,
            )
          }
          // D-172: Only clear session on success. On validation failure the
          // operator may fix the issue and retry — clearing would force them
          // to restart the entire wizard.
          if (result.success) {
            await clearWizardSession(cbChatId, cbUserId)
          }
        } catch (err) {
          await answerCallbackQuery(cbQueryId, '❌ Hata')
          console.error('[telegram/webhook] wz_confirm callback failed:', err)
        }
        return NextResponse.json({ ok: true })
      }

      // D-179: wz_edit:{productId} — restart wizard from category step (keep session)
      // D-230: re-run vision autofill so the operator gets the same auto-fills
      // and hints they had on the first pass. Without this, Düzenle wipes
      // the autofill-derived collected values AND clears autofillPreview, so
      // every prompt re-appears with no hint (observed on product 310).
      if (cbData.startsWith('wz_edit:')) {
        try {
          const editProductId = cbData.replace('wz_edit:', '')
          const {
            hydrateWizardSession, setWizardSession,
            getCategoryPrompt, applyVisionAutofillToSession, formatAutofillReport,
          } = await import('@/lib/confirmationWizard')
          const session = await hydrateWizardSession({ productId: editProductId } as any, cbChatId, cbUserId)
          if (session) {
            // Reset all collected data so every step is re-asked. D-230:
            // also clear autofillAttempted + autofillPreview so the next
            // applyVisionAutofillToSession call actually runs and produces
            // fresh fills + hints.
            session.collected = {}
            session.step = 'category'
            session.autofillAttempted = false
            session.autofillPreview = undefined

            // Re-run vision autofill against the current product state.
            const payloadInst = await getPayload()
            const product = await payloadInst.findByID({ collection: 'products', id: editProductId })
            const autofill = await applyVisionAutofillToSession(payloadInst, product as any, session)
            const autofillMsg = formatAutofillReport(
              autofill.filled, autofill.suggested, autofill.result,
            )

            await setWizardSession(cbChatId, session, cbUserId)
            await answerCallbackQuery(cbQueryId, '✏️ Düzenleme başladı')
            if (autofillMsg) {
              await sendTelegramMessage(cbChatId, autofillMsg)
            }
            // Pass the (possibly fresh) hint to the category prompt.
            const ap = (session as any).autofillPreview
            const catPrompt = getCategoryPrompt(ap?.category)
            await sendTelegramMessageWithKeyboard(cbChatId, `✏️ <b>Düzenleme modu — tekrar doldurun:</b>\n\n${catPrompt.text}`, catPrompt.keyboard)
          } else {
            await answerCallbackQuery(cbQueryId, '⚠️ Oturum bulunamadı')
            await sendTelegramMessage(cbChatId, '⚠️ Wizard oturumu bulunamadı. /confirm ile yeniden başlayın.')
          }
        } catch (err) {
          await answerCallbackQuery(cbQueryId, '❌ Hata')
          console.error('[telegram/webhook] wz_edit callback failed:', err)
        }
        return NextResponse.json({ ok: true })
      }

      // wz_cancel:{productId} — cancel wizard
      if (cbData.startsWith('wz_cancel:')) {
        try {
          const { clearWizardSession } = await import('@/lib/confirmationWizard')
          await clearWizardSession(cbChatId, cbUserId)
          await answerCallbackQuery(cbQueryId, '❌ İptal edildi')
          await sendTelegramMessage(cbChatId, '❌ Onay sihirbazı iptal edildi.')
        } catch (err) {
          await answerCallbackQuery(cbQueryId, '❌ Hata')
          console.error('[telegram/webhook] wz_cancel callback failed:', err)
        }
        return NextResponse.json({ ok: true })
      }

      // D-184: /ara quick-action buttons
      if (cbData.startsWith('ara_stok:')) {
        const pId = cbData.replace('ara_stok:', '')
        await answerCallbackQuery(cbQueryId, '📦 Stok yükleniyor...')
        try {
          const cbPayload = await getPayload()
          const product = await cbPayload.findByID({ collection: 'products', id: parseInt(pId), depth: 0 })
          const { getStockSnapshot, formatStockStatusMessage } = await import('@/lib/stockReaction')
          const snapshot = await getStockSnapshot(cbPayload, parseInt(pId), (product as any).stockQuantity ?? 0)
          await sendTelegramMessage(cbChatId, formatStockStatusMessage(product as any, snapshot))
        } catch (err) {
          await sendTelegramMessage(cbChatId, `❌ Stok hatası: ${err instanceof Error ? err.message : err}`)
        }
        return NextResponse.json({ ok: true })
      }

      if (cbData.startsWith('ara_pipe:')) {
        // Redirect to /pipeline command
        const pId = cbData.replace('ara_pipe:', '')
        await answerCallbackQuery(cbQueryId, '🔄 Pipeline yükleniyor...')
        await sendTelegramMessage(cbChatId, `💡 Pipeline için: /pipeline ${pId}`)
        return NextResponse.json({ ok: true })
      }

      if (cbData.startsWith('ara_activate:')) {
        const pId = cbData.replace('ara_activate:', '')
        await answerCallbackQuery(cbQueryId, '💡 Aktivasyon...')
        await sendTelegramMessage(cbChatId, `💡 Aktivasyon için: /activate ${pId}`)
        return NextResponse.json({ ok: true })
      }

      if (cbData.startsWith('ara_shopier:')) {
        const pId = cbData.replace('ara_shopier:', '')
        await answerCallbackQuery(cbQueryId, '🛒 Shopier...')
        await sendTelegramMessage(cbChatId, `💡 Shopier yayını için: /shopier publish ${pId}`)
        return NextResponse.json({ ok: true })
      }

      // ── D-237: Publish Desk button callbacks ─────────────────────────────
      // pdesk_act:<id>  — Aktif Et (delegates to existing activate path)
      // pdesk_rej:<id>  — Reddet (recordPublishDecision rejected)
      if (cbData.startsWith('pdesk_')) {
        const [shortAction, pIdStr] = cbData.replace('pdesk_', '').split(':')
        const pId = parseInt(pIdStr, 10)
        if (Number.isNaN(pId)) {
          await answerCallbackQuery(cbQueryId, '❌ Geçersiz ürün')
          return NextResponse.json({ ok: true })
        }
        try {
          const cbPayload = await getPayload()
          if (shortAction === 'rej') {
            await answerCallbackQuery(cbQueryId, '🚫 Reddediliyor...')
            const { recordPublishDecision } = await import('@/lib/publishDesk')
            const r = await recordPublishDecision(cbPayload, pId, 'rejected', 'telegram_button')
            await sendTelegramMessage(cbChatId, r.message)
            return NextResponse.json({ ok: true })
          }
          if (shortAction === 'act') {
            // D-239: converged on shared approveAndActivateProduct helper —
            // same code path as /activate slash + /approvepublish single+batch.
            await answerCallbackQuery(cbQueryId, '🚀 Aktive ediliyor...')
            const { approveAndActivateProduct } = await import('@/lib/publishDesk')
            const out = await approveAndActivateProduct(cbPayload, pId, 'telegram_button', 'pdesk_button')
            await sendTelegramMessage(cbChatId, out.message)
            return NextResponse.json({ ok: true })
          }
          await answerCallbackQuery(cbQueryId, '❌ Bilinmeyen işlem')
        } catch (err) {
          const m = err instanceof Error ? err.message : String(err)
          console.error(`[telegram/pdesk D-237] callback action=${shortAction} pId=${pId} error:`, m)
          await sendTelegramMessage(cbChatId, `❌ Publish Desk hatası: ${m}`)
        }
        return NextResponse.json({ ok: true })
      }

      // ── D-235: per-channel redispatch button callbacks ───────────────────
      // Buttons: redis_x / redis_ig / redis_fb / redis_shopier (id at suffix).
      // Maps to operatorActions.triggerChannelRedispatch — same code path as
      // /redispatch <channel> <sn-or-id> slash command.
      if (cbData.startsWith('redis_')) {
        const [shortCh, pIdStr] = cbData.replace('redis_', '').split(':')
        const pId = parseInt(pIdStr, 10)
        if (Number.isNaN(pId)) {
          await answerCallbackQuery(cbQueryId, '❌ Geçersiz ürün')
          return NextResponse.json({ ok: true })
        }
        const aliasMap: Record<string, string> = {
          x: 'x',
          ig: 'instagram',
          fb: 'facebook',
          shopier: 'shopier',
        }
        const channel = aliasMap[shortCh]
        if (!channel) {
          await answerCallbackQuery(cbQueryId, '❌ Bilinmeyen kanal')
          return NextResponse.json({ ok: true })
        }
        try {
          const cbPayload = await getPayload()
          const { triggerChannelRedispatch, operatorButtonsKeyboard } = await import('@/lib/operatorActions')
          await answerCallbackQuery(cbQueryId, '🔁 Tekrar gönderiliyor...')
          const r = await triggerChannelRedispatch(cbPayload, pId, channel)
          await sendTelegramMessageWithKeyboard(cbChatId, r.message, operatorButtonsKeyboard(pId))
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[telegram/redis D-235] callback ch=${shortCh} pId=${pId} error:`, msg)
          await sendTelegramMessage(cbChatId, `❌ Yeniden gönderim hatası: ${msg}`)
        }
        return NextResponse.json({ ok: true })
      }

      // ── D-191 / D-234: /sn stock-code quick-action callbacks ─────────────
      // D-234: handler now delegates to operatorActions.applyOperatorAction so
      // command + button paths share one source of truth + one idempotency
      // contract + one variant-aware behaviour set.
      if (cbData.startsWith('sn_')) {
        const [action, pIdStr] = cbData.replace('sn_', '').split(':')
        const pId = parseInt(pIdStr)
        if (isNaN(pId)) {
          await answerCallbackQuery(cbQueryId, '❌ Geçersiz ürün')
          return NextResponse.json({ ok: true })
        }
        try {
          const cbPayload = await getPayload()
          const {
            applyOperatorAction,
            operatorButtonsKeyboard,
            formatOperatorCard,
          } = await import('@/lib/operatorActions')
          const { getStockSnapshot, formatStockStatusMessage } = await import('@/lib/stockReaction')

          const product = (await cbPayload.findByID({ collection: 'products', id: pId, depth: 0 })) as any
          if (!product) {
            await answerCallbackQuery(cbQueryId, '❌ Ürün bulunamadı')
            return NextResponse.json({ ok: true })
          }

          // 'card' = read-only product card with action buttons
          if (action === 'card') {
            await answerCallbackQuery(cbQueryId, '📦')
            const snapshot = await getStockSnapshot(cbPayload, pId, product.stockQuantity ?? 0)
            await sendTelegramMessageWithKeyboard(
              cbChatId,
              formatOperatorCard(product, snapshot),
              operatorButtonsKeyboard(pId),
            )
            return NextResponse.json({ ok: true })
          }

          // 'stok' = read-only full stock snapshot (per-variant if variants present)
          if (action === 'stok') {
            await answerCallbackQuery(cbQueryId, '📦 Stok...')
            const snapshot = await getStockSnapshot(cbPayload, pId, product.stockQuantity ?? 0)
            await sendTelegramMessage(cbChatId, formatStockStatusMessage(product, snapshot))
            return NextResponse.json({ ok: true })
          }

          // Stock-modification actions — delegate to shared helper
          const buttonToAction: Record<string, 'soldout' | 'oneleft' | 'twoleft' | 'stopsale' | 'restartsale'> = {
            tukendi: 'soldout',
            '1kaldi': 'oneleft',
            '2kaldi': 'twoleft',
            durdur: 'stopsale',
            ac: 'restartsale',
          }
          const opAction = buttonToAction[action]
          if (!opAction) {
            await answerCallbackQuery(cbQueryId, '❌ Bilinmeyen işlem')
            return NextResponse.json({ ok: true })
          }

          const callbackLabels: Record<typeof opAction, string> = {
            soldout: '🔴 Tükendi',
            oneleft: '⚠️ Son 1 Adet',
            twoleft: '⚠️ Son 2 Adet',
            stopsale: '⏸️ Durduruldu',
            restartsale: '▶️ Açıldı',
          }
          await answerCallbackQuery(cbQueryId, callbackLabels[opAction])

          const result = await applyOperatorAction(cbPayload, pId, opAction, {
            source: 'telegram_button',
          })

          await sendTelegramMessageWithKeyboard(
            cbChatId,
            result.message,
            operatorButtonsKeyboard(pId),
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[telegram/sn D-234] callback error action=${action} product=${pIdStr}:`, msg)
          await sendTelegramMessage(cbChatId, `❌ Stok işlem hatası: ${msg}`)
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
      // Phase X: photo-aware redirect message
      if (message.photo) {
        await sendTelegramMessage(
          chatId,
          `📸 <b>Ürün fotoğrafı algılandı</b>\n\n` +
            `Ürün ekleme ve görsel üretimi <b>@Uygunops_bot</b> tarafından yapılır.\n\n` +
            `📌 Bu fotoğrafı grupta caption'a <b>@Uygunops_bot</b> yazarak gönderin.\n` +
            `💡 Opsiyonel: Fiyat ve açıklama da ekleyebilirsiniz.`,
        )
      } else {
        await sendTelegramMessage(chatId, '📌 Bu bot sadece grup içinde çalışır.\nDM komutları için @Uygunops_bot kullanın.')
      }
      return NextResponse.json({ ok: true })
    }
    // D-168: Early wizard hydration for group text messages.
    // When there's an active wizard session (operator mid-step through /confirm),
    // the group filter must let text through so the operator can type answers
    // (price, stock, brand, title, stockCode) without having to tap Reply on the
    // bot's message each time. getPayload() is a cached singleton (free after
    // first call); hydrateWizardSession is one lightweight SELECT.
    let hasActiveWizardSession = false
    // D-169: Only Uygunops (botParam !== 'geo') should check for wizard sessions.
    // Geo_bot must NEVER touch the wizard — it's the content/publishing bot.
    // D-168 accidentally let Geo_bot through by not checking botParam, causing
    // both bots to race on the same wizard_sessions row and send duplicate/
    // conflicting replies. See D-169 in DECISIONS.md.
    // D-180: Early wizard hydration for group text — lets plain text bypass group
    // filter when operator is mid-wizard. If hydration fails (cold start, DB timeout),
    // we STILL let the text through (hasActiveWizardSession = true as fallback).
    // The text interceptor at Phase 5 will do its own hydration and safely ignore
    // the message if there's truly no session. This prevents the "send 3-4 times"
    // bug caused by first request hitting cold Neon pool.
    if (botParam !== 'geo' && isGroupChat && text && !text.startsWith('/') && !text.startsWith('#') && !message.photo) {
      try {
        const earlyPayload = await getPayload()
        const { bindWizardPayload, hydrateWizardSession, getWizardSession } = await import('@/lib/confirmationWizard')
        bindWizardPayload(earlyPayload)
        await hydrateWizardSession(earlyPayload, chatId, msgUserId)
        const wizSess = getWizardSession(chatId, msgUserId)
        hasActiveWizardSession = !!wizSess
        if (hasActiveWizardSession) {
          console.log(`[telegram/D-168] active wizard session for chat=${chatId} user=${msgUserId} step=${wizSess!.step} — will bypass group filter`)
        }
      } catch (err) {
        // D-180: On failure, assume wizard MIGHT be active — let text through.
        // Phase 5 interceptor will safely handle the case where no session exists.
        hasActiveWizardSession = true
        console.warn('[telegram/D-180] early wizard check failed, letting text through as fallback:', err instanceof Error ? err.message : err)
      }
    }

    if (botParam !== 'geo' && isGroupChat) {
      // Phase Y: Uygunops in group — allow photo intake (any photo) + reply-to-bot
      // D-168: also allow text when there's an active wizard session
      // D-220b: allow operator-owned hashtags (#geohazirla, #gorsel, etc.) as
      // intentional group commands. They still route through the Phase R
      // ownership gate below, so Geo_bot's redirect behaviour is unchanged.
      const hasPhoto = !!message.photo || !!(message.reply_to_message?.photo && /[uü]r[uü]ne\s+[cç]evir/i.test(text))
      const isReplyToBotEarly = message.reply_to_message?.from?.id === 8702872700
      const isOpsHashtagEarly = /^#(gorsel|geminipro|luma|chatgpt|claid|geohazirla|seoara|productintel|urunzeka)\b/i.test(text || '')

      if (!hasPhoto && !isReplyToBotEarly && !hasActiveWizardSession && !isOpsHashtagEarly) {
        console.log(`[telegram/phase-n] Uygunops ignoring group message in chat ${chatId} — Geo_bot owns group context`)
        return NextResponse.json({ ok: true })
      }
      console.log(`[telegram/phase-y] Uygunops group pass-through — chat ${chatId}, photo=${hasPhoto}, replyToBot=${isReplyToBotEarly}, activeWizard=${hasActiveWizardSession}, opsHashtag=${isOpsHashtagEarly}`)
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
          return e.type === 'text_mention' && ((e as unknown as Record<string, unknown>)?.user as Record<string, unknown> | undefined)?.id === BOT_ID
        },
      )
      const isReplyToBot = message.reply_to_message?.from?.id === BOT_ID
      // Phase O: allow hashtag triggers (#gorsel, #geminipro etc.) and STOCK batch commands
      // These are intentional operator commands, equivalent to slash commands
      // D-220: PI Bot hashtags (#geohazirla, #seoara, #productintel, #urunzeka)
      const isHashtagTrigger = /^#(gorsel|geminipro|luma|chatgpt|claid|geohazirla|seoara|productintel|urunzeka)\b/i.test(text) ||
        /#gorsel/i.test(text)
      const isStockCommand = text.startsWith('STOCK SKU:')

      // Phase Y: photos are intentional intake — always pass through for Uygunops
      const isPhotoMessage = !!message.photo || !!(message.reply_to_message?.photo)

      if (!isCommand && !isMention && !isReplyToBot && !isHashtagTrigger && !isStockCommand && !isPhotoMessage && !hasActiveWizardSession) {
        // Silently ignore non-activated messages in groups
        // D-168: active wizard sessions bypass this filter
        return NextResponse.json({ ok: true })
      }
    }

    const payload = await getPayload()

    // ── D-158: Bind payload to the wizard module so sync set/clear helpers
    // can fire background DB upserts. Called once per request; safe to call
    // repeatedly. Enables DB-backed persistence for the in-memory wizard Map
    // so sessions survive Lambda cold starts, deploys, and instance rotations.
    try {
      const { bindWizardPayload } = await import('@/lib/confirmationWizard')
      bindWizardPayload(payload)
    } catch (err) {
      console.warn('[telegram/D-158] bindWizardPayload failed:', err instanceof Error ? err.message : err)
    }

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
      // D-186: /ara works on BOTH bots (shared command) so operator can search from group
      const GEO_CMDS = ['/content', '/audit', '/preview', '/activate', '/shopier', '/merch', '/story', '/restory', '/targets', '/approve_story', '/reject_story']
      // D-234 / D-235 / D-236 / D-237 / D-238: Operator Pack commands are
      // SHARED so the operator can use them from either bot.
      const SHARED_CMDS = [
        '/ara', '/pipeline', '/sn',
        '/find', '/soldout', '/oneleft', '/twoleft', '/restock', '/stopsale', '/restartsale',
        '/redispatch',
        '/inbox',
        '/publishready', '/approvepublish', '/rejectpublish',
        '/repair',
      ]
      // D-220: PI Bot hashtags owned by Uygunops (operator approval is required before GeoBot handoff).
      const OPS_HASHTAGS = ['#gorsel', '#geminipro', '#geohazirla', '#seoara', '#productintel', '#urunzeka']
      // Deactivated providers still show deactivation msg — keep them on ops side
      const OPS_HASHTAGS_DEACTIVATED = ['#luma', '#chatgpt', '#claid']

      const cmdLower = text.toLowerCase()
      const firstWord = cmdLower.split(/\s/)[0] // e.g. "/confirm" or "#gorsel"

      // Check slash command ownership
      if (text.startsWith('/')) {
        const isOpsCmd = OPS_CMDS.some(c => firstWord === c || firstWord.startsWith(c + '@'))
        const isGeoCmd = GEO_CMDS.some(c => firstWord === c || firstWord.startsWith(c + '@'))
        // D-191b: /sn0189 (no space) must also match — check both exact and /sn+digit pattern
        const isSharedCmd = SHARED_CMDS.some(c => firstWord === c || firstWord.startsWith(c + '@'))
          || /^\/sn[\d]/i.test(firstWord) // "/sn0189" or "/snSN0189" without space

        // D-186: Shared commands run on both bots — skip ownership redirect
        if (isSharedCmd) { /* fall through to command handlers */ }
        else if (botParam === 'geo' && isOpsCmd) {
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

      // ── Phase Y: GeoBot silently ignores photos — Uygunops handles them ────
      if (botParam === 'geo' && (message.photo || (message.reply_to_message?.photo && /[uü]r[uü]ne\s+[cç]evir/i.test(text)))) {
        console.log(`[telegram/phase-y] GeoBot ignoring photo in group — Uygunops handles intake`)
        return NextResponse.json({ ok: true })
      }
    }

    // ── Phase 5: Confirmation wizard text input interceptor ───────────────────
    // If there's an active wizard session expecting text input (price, sizes, stock),
    // intercept the message BEFORE any other command processing.
    // D-171: ONLY Uygunops processes wizard text — Geo_bot must never touch it.
    if (botParam !== 'geo' && text && !text.startsWith('/') && !text.startsWith('#') && !text.startsWith('STOCK ')) {
      const { getWizardSession, setWizardSession, clearWizardSession,
              hydrateWizardSession,
              parsePrice, parseSizes, parseStockNumber, getNextWizardStep,
              getCategoryPrompt, getProductTypePrompt,
              getSizesPrompt, getStockPrompt, getTargetsPrompt, getPricePrompt,
              getBrandPrompt, getTitlePrompt,
              formatConfirmationSummary } = await import('@/lib/confirmationWizard')
      // D-158: Load wizard session from Neon before the sync getter runs so
      // the session survives Lambda cold starts / deploys.
      await hydrateWizardSession(payload, chatId, msgUserId)
      const wizSession = getWizardSession(chatId, msgUserId)

      // D-171: Shared next-step dispatcher with interactive sizes + per-size stock.
      async function dispatchNextStep(
        nextStep: string,
        session: typeof wizSession,
        product: Record<string, unknown>,
      ): Promise<void> {
        if (!session) return
        session.step = nextStep as any
        await setWizardSession(chatId, session, msgUserId)

        // D-230: read autofill suggestions (if any) from session
        const ap = (session as any).autofillPreview
        if (nextStep === 'category') {
          const catPrompt = getCategoryPrompt(ap?.category)
          await sendTelegramMessageWithKeyboard(chatId, catPrompt.text, catPrompt.keyboard)
        } else if (nextStep === 'productType') {
          const ptypePrompt = getProductTypePrompt(ap?.productType)
          await sendTelegramMessageWithKeyboard(chatId, ptypePrompt.text, ptypePrompt.keyboard)
        } else if (nextStep === 'price') {
          await sendTelegramMessage(chatId, getPricePrompt())
        } else if (nextStep === 'sizes') {
          // D-171: Interactive size keyboard (39–47)
          session.pendingSizes = (session as any).pendingSizes ?? []
          const sizeMsg = await sendTelegramMessageWithKeyboard(
            chatId,
            formatSizeSelectionText(new Set()),
            buildSizeKeyboard(new Set()),
          )
          if (sizeMsg) (session as any).sizeMessageId = sizeMsg
          await setWizardSession(chatId, session, msgUserId)
        } else if (nextStep === 'stock') {
          // D-171: Per-size stock quantity via buttons
          const sizes = (session.collected.sizes ?? '').split(',').filter(Boolean)
          if (sizes.length === 0) {
            // Fallback — shouldn't happen
            await sendTelegramMessage(chatId, '⚠️ Beden bilgisi bulunamadı.')
            return
          }
          session.collected.sizeStockMap = session.collected.sizeStockMap ?? {}
          const firstUnset = sizes.find((s) => session.collected.sizeStockMap![s] === undefined)
          if (firstUnset) {
            const stockMsg = await sendTelegramMessageWithKeyboard(
              chatId,
              formatStockQtyText(session.collected.sizeStockMap, sizes, firstUnset),
              buildStockQtyKeyboard(firstUnset),
            )
            if (stockMsg) (session as any).stockMessageId = stockMsg
            await setWizardSession(chatId, session, msgUserId)
          }
        } else if (nextStep === 'title') {
          await sendTelegramMessage(chatId, getTitlePrompt((product as any).title ?? `Ürün #${session.productId}`))
        } else if (nextStep === 'brand') {
          await sendTelegramMessage(chatId, getBrandPrompt(ap?.brand))
        } else if (nextStep === 'targets') {
          const tgtPrompt = getTargetsPrompt()
          await sendTelegramMessageWithKeyboard(chatId, tgtPrompt.text, tgtPrompt.keyboard)
        } else if (nextStep === 'summary') {
          const summary = formatConfirmationSummary(product as any, session.collected)
          await sendTelegramMessageWithKeyboard(chatId, summary, [
            [
              { text: '✅ Onayla', callback_data: `wz_confirm:${session.productId}` },
              { text: '✏️ Düzenle', callback_data: `wz_edit:${session.productId}` },
              { text: '❌ İptal', callback_data: `wz_cancel:${session.productId}` },
            ],
          ])
          session.step = 'summary'
          await setWizardSession(chatId, session, msgUserId)
        }
      }

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
            await dispatchNextStep(nextStep, wizSession, product as any)
            return NextResponse.json({ ok: true })
          }

          // D-170: stockCode step REMOVED — SN#### auto-generated by image pipeline

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
            await dispatchNextStep(nextStep, wizSession, product as any)
            return NextResponse.json({ ok: true })
          }

          if (wizSession.step === 'stock' || wizSession.step === 'sizes') {
            // D-171d: Button-based steps — silently ignore stray text input.
            // No confusing redirect messages. Operator uses the inline buttons.
            return NextResponse.json({ ok: true })
          }

          // D-178: Combined brand + model step
          if (wizSession.step === 'brand') {
            let brandText = text.trim()

            // D-230: "tamam" shortcut accepts the vision suggestion when one
            // is present (low-confidence autofill case). Operator types
            // tamam → we use session.autofillPreview.brand.value as if they
            // typed it themselves.
            const tamamPattern = /^(tamam|ok|onayla|kabul|evet)$/i
            if (
              tamamPattern.test(brandText) &&
              wizSession.autofillPreview?.brand?.value
            ) {
              brandText = wizSession.autofillPreview.brand.value
              await sendTelegramMessage(
                chatId,
                `🤖 PI önerisi kabul edildi: <code>${brandText}</code>`,
              )
            }

            if (!brandText || brandText.length < 2) {
              await sendTelegramMessage(chatId, '⚠️ En az 2 karakter girin. Örnek: <code>Nike Air Max 90</code>')
              return NextResponse.json({ ok: true })
            }
            // First word = brand, full text = title (if multi-word)
            const parts = brandText.split(/\s+/)
            const brand = parts[0]
            wizSession.collected.brand = brand
            // If operator wrote more than just the brand, use full text as product title
            if (parts.length > 1) {
              wizSession.collected.title = brandText
              await sendTelegramMessage(chatId, `✅ Marka: <b>${brand}</b>\n✅ Ürün adı: <b>${brandText}</b>`)
            } else {
              await sendTelegramMessage(chatId, `✅ Marka: <b>${brand}</b>`)
            }

            const product = await payload.findByID({ collection: 'products', id: wizSession.productId })
            const nextStep = getNextWizardStep(product as any, wizSession.collected)
            await dispatchNextStep(nextStep, wizSession, product as any)
            return NextResponse.json({ ok: true })
          }

          // If wizard is active but step doesn't expect text input, let it fall through
          // (e.g., summary step waiting for button, or targets step waiting for button)
        } catch (wizErr) {
          console.error('[telegram/webhook] wizard text interceptor failed:', wizErr)
          await clearWizardSession(chatId, msgUserId)
          await sendTelegramMessage(chatId, '❌ Sihirbaz hatası. /confirm komutuyla tekrar başlayabilirsiniz.')
          return NextResponse.json({ ok: true })
        }
      } else {
        // D-166: wizSession is null but we're clearly in a wizard-style text
        // reply (plain text, not a slash/hashtag/STOCK command). Historically
        // the bot would silently drop this message, leaving the operator
        // staring at a bot prompt with no response. Give targeted feedback
        // when the text looks like a typical wizard input so the operator
        // knows the session was lost and can restart.
        //
        // Heuristics:
        //   - Pure number or decimal: looks like a price ("899", "1299.90")
        //   - Digit list 2-char entries: looks like sizes ("38,39,40,41")
        //   - Size range: looks like sizes ("38-44")
        //   - Pure non-negative integer: looks like stock ("10")
        const trimmed = text.trim()
        const looksLikeWizardInput =
          /^\d+([.,]\d+)?$/.test(trimmed) ||
          /^\d{2}([,\s]+\d{2})+$/.test(trimmed) ||
          /^\d{2}\s*[-–]\s*\d{2}$/.test(trimmed)
        if (looksLikeWizardInput) {
          await sendTelegramMessage(
            chatId,
            'ℹ️ Aktif sihirbaz oturumu bulunamadı (oturum süresi dolmuş olabilir).\n' +
              'Yeniden başlatmak için: <code>/confirm &lt;ürün_id&gt;</code>',
          )
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
        // Phase Y: default to 'hizli' when no hashtag — auto-start Gemini Pro on every photo
        const autoGenMode: 'hizli' | 'dengeli' | 'premium' | 'karma' =
          /#karma/i.test(combinedRaw)   ? 'karma'   :
          /#premium/i.test(combinedRaw) ? 'premium' :
          /#dengeli/i.test(combinedRaw) ? 'dengeli' :
          'hizli'
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

        // D-187: Pass null to let resolveChannelTargets use all globally-enabled channels
        // instead of hardcoding ['website']. This way Instagram/Facebook are included
        // when their global toggles are on.
        const channelDecision = resolveChannelTargets(null, automationSettings)

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
            // D-187: Derive channel flags from effectiveTargets instead of hardcoding false
            // D-189: Set ALL channel flags from effectiveTargets — previously
            // publishFacebook/publishX/publishThreads were missing, defaulting to
            // false in the DB, which caused Gate 2 to block dispatch even when
            // channelTargets included those channels.
            channels: {
              publishWebsite: channelDecision.effectiveTargets.includes('website'),
              publishInstagram: channelDecision.effectiveTargets.includes('instagram'),
              publishShopier: channelDecision.effectiveTargets.includes('shopier'),
              publishDolap: channelDecision.effectiveTargets.includes('dolap'),
              publishX: channelDecision.effectiveTargets.includes('x'),
              publishFacebook: channelDecision.effectiveTargets.includes('facebook'),
              publishThreads: channelDecision.effectiveTargets.includes('threads'),
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

        // D-206: minimal product summary — title + admin link only
        // /confirm and missing-field hints removed: wizard auto-starts after image approval
        const productSummary =
          `✅ <b>${title}</b>` +
          `\n🔗 <a href="https://www.uygunayakkabi.com/admin/collections/products/${productId}">Admin</a>`

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
          // D-203: removed auto-confirm "generation started" message — operator gets notified when ready
          // Still show productSummary (product created info) since it contains actionable data
          await sendTelegramMessage(chatId, productSummary)
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

      // D-203: removed "görsel üretimi başlatıldı" — operator gets notified when ready

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

    // ── D-220: #geoHazirla / #seoara / #productintel / #urunzeka ───────────
    // Product Intelligence Bot trigger. Analyzes a product's photo(s) + data,
    // runs reverse image search (if SERPAPI_API_KEY is set; falls back
    // gracefully otherwise), generates an original SEO + GEO content pack,
    // and posts a Telegram summary with approval buttons.
    //
    // Usage:
    //   - Reply to a product/photo message with  #geoHazirla
    //   - Send  #geoHazirla 42   (explicit product ID)
    //   - Aliases: #seoara, #productintel, #urunzeka
    //
    // The actual handoff to GeoBot happens on the `pi:sendgeo:{id}` callback.
    const isPiTrigger = /#(geohazirla|seoara|productintel|urunzeka)\b/i.test(text)
    if (isPiTrigger) {
      // Resolve product ID: 1) reply context  2) explicit N in the command
      let piProductId: number | null = resolveProductFromReply(
        message.reply_to_message as Record<string, unknown> | undefined,
      )
      if (!piProductId) {
        const idMatch = text.match(/#(?:geohazirla|seoara|productintel|urunzeka)\s+(\d+)/i)
        if (idMatch) piProductId = parseInt(idMatch[1])
      }
      if (!piProductId) {
        await sendTelegramMessage(
          chatId,
          '❌ <b>Ürün bulunamadı.</b>\n\n' +
            'Lütfen ürün mesajına <b>reply</b> yapın veya ID ekleyin: <code>#geoHazirla 42</code>',
        )
        return NextResponse.json({ ok: true })
      }

      // Verify the product actually exists before spinning up work.
      const { docs: piDocs } = await payload.find({
        collection: 'products',
        where: { id: { equals: piProductId } },
        limit: 1,
        depth: 0,
      })
      if (piDocs.length === 0) {
        await sendTelegramMessage(chatId, `❌ Ürün bulunamadı: #${piProductId}`)
        return NextResponse.json({ ok: true })
      }
      const piProduct = piDocs[0] as Record<string, unknown>

      await sendTelegramMessage(
        chatId,
        `🧠 <b>Ürün Zeka analizi başlatıldı — #${piProductId}</b>\nAnaliz ~30-60 saniye sürebilir.`,
      )

      // Run the pipeline in the background so the webhook returns fast.
      after(async () => {
        try {
          const { createProductIntelligenceReport } = await import(
            '@/lib/productIntelligence/createProductIntelligenceReport'
          )
          const { formatReportSummary, buildReportKeyboard, formatFailedReport } =
            await import('@/lib/productIntelligence/telegramReport')

          const summary = await createProductIntelligenceReport(payload, {
            productId: piProductId!,
            triggerSource: 'telegram',
            telegram: {
              chatId,
              messageId: message.message_id,
              operatorUserId: message.from?.id,
            },
          })

          if (summary.status === 'failed') {
            await sendTelegramMessage(chatId, formatFailedReport(piProductId!, summary.error ?? 'unknown'))
            return
          }

          // Reload the report to know exactly which pack fields landed
          const report = await payload.findByID({
            collection: 'product-intelligence-reports',
            id: summary.reportId,
            depth: 0,
          })
          const seoPack = (report?.seoPack ?? {}) as Record<string, unknown>
          const geoPack = (report?.geoPack ?? {}) as Record<string, unknown>
          const seoPackPresent = {
            seoTitle: !!seoPack.seoTitle,
            metaDescription: !!seoPack.metaDescription,
            productDescription: !!seoPack.productDescription,
            tags: Array.isArray(seoPack.tags) && (seoPack.tags as unknown[]).length > 0,
            faq: Array.isArray(seoPack.faq) && (seoPack.faq as unknown[]).length > 0,
          }
          const geoPackPresent = {
            aiSearchSummary: !!geoPack.aiSearchSummary,
            buyerIntentKeywords:
              Array.isArray(geoPack.buyerIntentKeywords) &&
              (geoPack.buyerIntentKeywords as unknown[]).length > 0,
            productComparisonText: !!geoPack.productComparisonText,
          }

          const msgText = formatReportSummary(
            String(piProduct.title ?? `Ürün #${piProductId}`),
            piProductId!,
            summary,
            seoPackPresent,
            geoPackPresent,
          )
          const kb = buildReportKeyboard(summary.reportId)
          await sendTelegramMessageWithKeyboard(chatId, msgText, kb)
        } catch (err) {
          console.error('[telegram/webhook] after() PI pipeline failed:', err)
          await sendTelegramMessage(
            chatId,
            `❌ Ürün Zeka analizi başarısız: ${err instanceof Error ? err.message : 'bilinmeyen hata'}`,
          )
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

      // D-203: removed "görsel üretimi başlatıldı" — operator gets notified when ready

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
          await approveImageGenJob(payload, previewJobId, slotsStr, chatId, message.from?.id)
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
    // /activate <sn-or-id[,sn,sn]> — safely transition publish-ready product(s) to active
    // D-239: now batch-aware. Single + batch + pdesk_act inline button all
    // converge on approveAndActivateProduct (publishDesk.ts).
    if (text.startsWith('/activate')) {
      const parts = text.trim().split(/\s+/)
      const arg = parts[1]

      if (!arg) {
        await sendTelegramMessage(
          chatId,
          '🚀 <b>Ürün Aktivasyonu</b>\n\n' +
            '<code>/activate &lt;sn-or-id[,sn,sn]&gt;</code>\n\n' +
            'Tek ürün: <code>/activate SN0186</code> veya <code>/activate 186</code>\n' +
            'Toplu: <code>/activate SN0017,SN0022,SN0023</code>\n\n' +
            'Koşullar: tüm publish readiness boyutları sağlanmalı (6/6).\n' +
            'Aktivasyon otomatik olarak:\n' +
            '• status → active\n' +
            '• merchandising.publishedAt ayarlar (Yeni bölümüne girer)\n' +
            '• Kanal dispatch tetikler (Shopier, Instagram vb.)',
        )
        return NextResponse.json({ ok: true })
      }

      try {
        const { resolveProductIdentifier, formatIdentifierMissingMessage } = await import('@/lib/operatorActions')
        const { approveAndActivateProduct } = await import('@/lib/publishDesk')
        const { parseBatchIdentifiers, isBatch, runBatch, formatBatchSummary } = await import('@/lib/operatorBatch')

        // Batch path — comma-separated identifiers
        const idents = parseBatchIdentifiers(arg)
        if (isBatch(idents)) {
          const r = await runBatch(payload, '/activate', idents, async (ctx) => {
            const out = await approveAndActivateProduct(payload, ctx.productId, 'telegram_command', 'activate')
            const tag = ctx.sn ?? `ID:${ctx.productId}`
            if (!out.ok) {
              return { ok: false, badge: '⚠️', line: out.summary || `<code>${tag}</code> · engellendi` }
            }
            if (out.idempotent) {
              return { ok: true, badge: '🟰', line: `<code>${tag}</code> · zaten aktif` }
            }
            return { ok: true, badge: '🚀', line: out.summary || `<code>${tag}</code> · aktive edildi` }
          })
          await sendTelegramMessage(chatId, formatBatchSummary(r))
          return NextResponse.json({ ok: true })
        }

        // ── Single-id path ────────────────────────────────────────────────
        const resolved = await resolveProductIdentifier(payload, arg)
        if (!resolved) {
          await sendTelegramMessage(chatId, formatIdentifierMissingMessage(arg))
          return NextResponse.json({ ok: true })
        }
        const out = await approveAndActivateProduct(payload, resolved.productId, 'telegram_command', 'activate')
        await sendTelegramMessage(chatId, out.message)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[telegram/activate D-239] arg=${arg} error:`, msg)
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
            '<code>/pipeline &lt;sn-or-id&gt;</code> — Ürünün tüm yaşam döngüsünü göster\n\n' +
            'Örnek: <code>/pipeline SN0186</code> veya <code>/pipeline 312</code>\n\n' +
            'Intake → Görsel → Onay → İçerik → Audit → Yayın Hazırlığı → Yayın → Stok → Vitrin → Story\n\n' +
            'Her aşamanın güncel durumu tek bakışta görünür.',
        )
        return NextResponse.json({ ok: true })
      }

      try {
        // D-234: SN or ID via shared resolver
        const { resolveProductIdentifier, formatIdentifierMissingMessage } = await import('@/lib/operatorActions')
        const resolved = await resolveProductIdentifier(payload, arg)
        if (!resolved) {
          await sendTelegramMessage(chatId, formatIdentifierMissingMessage(arg))
          return NextResponse.json({ ok: true })
        }
        // Re-fetch with depth=1 because computePipelineStatus reads relationships
        const product = await payload.findByID({ collection: 'products', id: resolved.productId, depth: 1 })
        if (!product) {
          await sendTelegramMessage(chatId, `❌ Ürün #${resolved.productId} bulunamadı.`)
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
    // ── D-184: /ara — search product by stock number (SN####) or title keyword ──
    if (text.startsWith('/ara')) {
      const parts = text.trim().split(/\s+/)
      const query = parts.slice(1).join(' ').trim()

      if (!query) {
        await sendTelegramMessage(
          chatId,
          '🔍 <b>Ürün Ara</b>\n\n' +
            '/ara SN0179 — Stok numarasıyla ara\n' +
            '/ara Nike — Ürün adıyla ara\n' +
            '/ara 272 — ID ile ara',
        )
        return NextResponse.json({ ok: true })
      }

      try {
        let products: any[] = []

        // 1. Try exact ID match
        const maybeId = parseInt(query)
        if (!isNaN(maybeId) && String(maybeId) === query) {
          try {
            const p = await payload.findByID({ collection: 'products', id: maybeId, depth: 0 })
            if (p) products = [p]
          } catch { /* not found */ }
        }

        // 2. Try stock number match (SN####)
        if (products.length === 0 && /^SN\d+$/i.test(query)) {
          const snResult = await payload.find({
            collection: 'products',
            where: { stockNumber: { equals: query.toUpperCase() } },
            limit: 1,
            depth: 0,
          })
          products = snResult.docs
        }

        // 3. Try title/brand keyword search
        if (products.length === 0) {
          const searchResult = await payload.find({
            collection: 'products',
            where: {
              or: [
                { title: { contains: query } },
                { brand: { contains: query } },
              ],
            },
            limit: 5,
            depth: 0,
            sort: '-createdAt',
          })
          products = searchResult.docs
        }

        if (products.length === 0) {
          await sendTelegramMessage(chatId, `🔍 "<b>${query}</b>" için sonuç bulunamadı.`)
          return NextResponse.json({ ok: true })
        }

        // Single result → detailed card with action buttons
        if (products.length === 1) {
          const p = products[0]
          const sn = p.stockNumber || '—'
          const status = p.status || 'draft'
          const price = p.price ? `₺${p.price}` : '—'
          const brand = p.brand || '—'
          const cat = p.category || '—'
          const stock = p.stockQuantity ?? '—'
          const statusEmoji = status === 'active' ? '🟢' : status === 'soldout' ? '🔴' : '⚪'

          const msg =
            `🔍 <b>Ürün Bulundu</b>\n\n` +
            `<b>${p.title || 'İsimsiz'}</b>\n` +
            `📦 Stok No: <code>${sn}</code> | ID: ${p.id}\n` +
            `🏷️ Marka: ${brand} | Kategori: ${cat}\n` +
            `💰 Fiyat: ${price}\n` +
            `📊 Stok: ${stock} adet\n` +
            `${statusEmoji} Durum: ${status}`

          await sendTelegramMessageWithKeyboard(chatId, msg, [
            [
              { text: '📦 Stok', callback_data: `ara_stok:${p.id}` },
              { text: '🔄 Pipeline', callback_data: `ara_pipe:${p.id}` },
            ],
            [
              { text: '✅ Aktive Et', callback_data: `ara_activate:${p.id}` },
              { text: '🛒 Shopier', callback_data: `ara_shopier:${p.id}` },
            ],
          ])
        } else {
          // Multiple results → list with IDs
          const lines = products.map((p: any) => {
            const sn = p.stockNumber || '—'
            const statusEmoji = p.status === 'active' ? '🟢' : p.status === 'soldout' ? '🔴' : '⚪'
            return `${statusEmoji} <b>${p.title || 'İsimsiz'}</b>\n   ID: ${p.id} | ${sn} | ${p.price ? `₺${p.price}` : '—'}`
          })
          await sendTelegramMessage(
            chatId,
            `🔍 <b>"${query}" — ${products.length} sonuç:</b>\n\n` +
              lines.join('\n\n') +
              '\n\n💡 Detay için: /ara <ID>',
          )
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await sendTelegramMessage(chatId, `❌ Arama hatası: ${msg}`)
      }
      return NextResponse.json({ ok: true })
    }

    // ── D-191: /sn — stock-code operator control ────────────────────────────
    // Quick stock management via stock number: /sn SN0186 [action]
    // Actions: tükendi, 1kaldı, 2kaldı, durdur, aç, stok <N>
    if (text.startsWith('/sn')) {
      const parts = text.trim().split(/\s+/)
      // D-191b: Support /sn0189 (no space) in addition to /sn 0189
      // When user types "/sn0189", parts = ["/sn0189"] and parts[1] is undefined.
      // Extract the number from the command word itself if no space was used.
      let snQuery = parts[1]?.toUpperCase()
      let subAction = parts[2]?.toLowerCase()
      let subArg = parts[3]
      if (!snQuery) {
        // Strip @botname suffix first: "/sn@Uygunops_bot" → "/sn"
        const cmdBase = parts[0].replace(/@\w+$/, '')
        if (cmdBase.length > 3) {
          // "/sn0189" → "0189", "/snSN0189" → "SN0189"
          snQuery = cmdBase.substring(3).toUpperCase()
          // Shift: what was parts[1] becomes subAction, parts[2] becomes subArg
          subAction = parts[1]?.toLowerCase()
          subArg = parts[2]
        }
      }

      if (!snQuery) {
        // D-191c: Show recent products as clickable buttons instead of plain text help
        try {
          const recentProducts = await payload.find({
            collection: 'products',
            where: { stockNumber: { exists: true } },
            sort: '-createdAt',
            limit: 6,
            depth: 0,
          })
          const buttons: Array<Array<{ text: string; callback_data: string }>> = []
          const row: Array<{ text: string; callback_data: string }> = []
          for (const p of recentProducts.docs) {
            const sn = p.stockNumber as string
            const title = (p.title as string || '').substring(0, 18)
            const status = p.status === 'soldout' ? '🔴' : p.status === 'active' ? '🟢' : '⚪'
            row.push({ text: `${status} ${sn} ${title}`, callback_data: `sn_card:${p.id}` })
            if (row.length === 2) {
              buttons.push([...row])
              row.length = 0
            }
          }
          if (row.length > 0) buttons.push([...row])

          await sendTelegramMessageWithKeyboard(
            chatId,
            '📦 <b>Stok Kodu Kontrolü</b>\n\n' +
              'Ürün seçin veya <code>/sn SN0186</code> yazın:',
            buttons,
          )
        } catch {
          await sendTelegramMessage(
            chatId,
            '📦 <b>Stok Kodu Kontrolü</b>\n\nKullanım: <code>/sn SN0186</code> veya <code>/sn0186</code>',
          )
        }
        return NextResponse.json({ ok: true })
      }

      // Validate SN format — also allow bare numbers like "0186"
      const normalizedSN = /^SN\d+$/i.test(snQuery) ? snQuery : /^\d+$/.test(snQuery) ? `SN${snQuery.padStart(4, '0')}` : null
      if (!normalizedSN) {
        await sendTelegramMessage(chatId, `❌ Geçersiz stok kodu: <code>${snQuery}</code>\nFormat: SN0001 veya sadece numara (ör: 186)`)
        return NextResponse.json({ ok: true })
      }

      try {
        const snResult = await payload.find({
          collection: 'products',
          where: { stockNumber: { equals: normalizedSN } },
          limit: 1,
          depth: 0,
        })

        if (snResult.docs.length === 0) {
          await sendTelegramMessage(chatId, `🔍 <code>${normalizedSN}</code> bulunamadı.`)
          return NextResponse.json({ ok: true })
        }

        const p = snResult.docs[0] as any
        const pId = p.id as number
        const sn = p.stockNumber || normalizedSN

        // No sub-action → show product card with quick-action buttons
        if (!subAction) {
          const statusEmoji = p.status === 'active' ? '🟢' : p.status === 'soldout' ? '🔴' : '⚪'
          const msg =
            `📦 <b>${p.title || 'İsimsiz'}</b>\n\n` +
            `🏷️ <code>${sn}</code> | ID: ${pId}\n` +
            `💰 Fiyat: ${p.price ? `₺${p.price}` : '—'}\n` +
            `📊 Stok: ${p.stockQuantity ?? 0} adet\n` +
            `${statusEmoji} Durum: ${p.status || 'draft'}\n` +
            `🏪 Marka: ${p.brand || '—'} | Kategori: ${p.category || '—'}`

          await sendTelegramMessageWithKeyboard(chatId, msg, [
            [
              { text: '🔴 Tükendi', callback_data: `sn_tukendi:${pId}` },
              { text: '⚠️ Son 1 Adet', callback_data: `sn_1kaldi:${pId}` },
              { text: '⚠️ Son 2 Adet', callback_data: `sn_2kaldi:${pId}` },
            ],
            [
              { text: '⏸️ Durdur', callback_data: `sn_durdur:${pId}` },
              { text: '▶️ Aç', callback_data: `sn_ac:${pId}` },
              { text: '📦 Stok', callback_data: `sn_stok:${pId}` },
            ],
          ])
          return NextResponse.json({ ok: true })
        }

        // Sub-action → execute stock change. D-234: delegate to shared
        // operatorActions.applyOperatorAction so command + button paths share
        // one source of truth.
        const { applyOperatorAction, operatorButtonsKeyboard } = await import('@/lib/operatorActions')
        const subToAction: Record<string, 'soldout' | 'oneleft' | 'twoleft' | 'stopsale' | 'restartsale' | 'restock'> = {
          'tükendi': 'soldout', 'tukendi': 'soldout', 'bitti': 'soldout',
          '1kaldı': 'oneleft', '1kaldi': 'oneleft',
          '2kaldı': 'twoleft', '2kaldi': 'twoleft',
          'durdur': 'stopsale', 'stop': 'stopsale',
          'aç': 'restartsale', 'ac': 'restartsale', 'open': 'restartsale',
        }
        const mappedAction = subToAction[subAction]
        if (mappedAction) {
          const r = await applyOperatorAction(payload, pId, mappedAction, { source: 'telegram_command' })
          await sendTelegramMessageWithKeyboard(chatId, r.message, operatorButtonsKeyboard(pId))
          return NextResponse.json({ ok: true })
        }
        if (subAction === 'stok' || subAction === 'stock') {
          // Explicit "/sn ... stok N" — restock with explicit quantity. The
          // helper enforces variant refusal and idempotency uniformly.
          const qty = parseInt(subArg || '')
          if (isNaN(qty) || qty < 0) {
            await sendTelegramMessage(chatId, `❌ Geçersiz stok adedi. Kullanım: /sn ${sn} stok 5`)
            return NextResponse.json({ ok: true })
          }
          if (qty === 0) {
            // qty=0 → soldout semantics, run through soldout action so variants
            // are zeroed correctly.
            const r = await applyOperatorAction(payload, pId, 'soldout', { source: 'telegram_command' })
            await sendTelegramMessageWithKeyboard(chatId, r.message, operatorButtonsKeyboard(pId))
            return NextResponse.json({ ok: true })
          }
          const r = await applyOperatorAction(payload, pId, 'restock', {
            restockQty: qty,
            source: 'telegram_command',
          })
          await sendTelegramMessageWithKeyboard(chatId, r.message, operatorButtonsKeyboard(pId))
          return NextResponse.json({ ok: true })
        }

        await sendTelegramMessage(
          chatId,
          `❌ Bilinmeyen işlem: <b>${subAction}</b>\n\n` +
            `Kullanılabilir: tükendi, 1kaldı, 2kaldı, durdur, aç, stok &lt;N&gt;`,
        )
        return NextResponse.json({ ok: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[telegram/sn] error sn=${normalizedSN} action=${subAction}:`, msg)
        await sendTelegramMessage(chatId, `❌ Hata: ${msg}`)
      }
      return NextResponse.json({ ok: true })
    }

    // ── D-236: /inbox + sub-commands — read-only operator queue ───────────
    if (text.trim().toLowerCase().startsWith('/inbox')) {
      const parts = text.trim().split(/\s+/)
      const sub = (parts[1] || '').toLowerCase()
      try {
        const {
          getInboxOverview, getInboxPending, getInboxPublish,
          getInboxStock, getInboxFailed, getInboxToday,
          formatInboxOverview, formatInboxPending, formatInboxPublish,
          formatInboxStock, formatInboxFailed, formatInboxToday,
        } = await import('@/lib/operatorInbox')

        let msg: string
        switch (sub) {
          case '':
          case undefined:
            msg = formatInboxOverview(await getInboxOverview(payload))
            break
          case 'pending':
            msg = formatInboxPending(await getInboxPending(payload))
            break
          case 'publish':
            msg = formatInboxPublish(await getInboxPublish(payload))
            break
          case 'stock':
          case 'stok':
            msg = formatInboxStock(await getInboxStock(payload))
            break
          case 'failed':
          case 'hata':
            msg = formatInboxFailed(await getInboxFailed(payload))
            break
          case 'today':
          case 'bugun':
          case 'bugün':
            msg = formatInboxToday(await getInboxToday(payload))
            break
          case 'help':
          case '?':
          default:
            msg =
              `📋 <b>Operator Inbox</b>\n\n` +
              `<code>/inbox</code> — özet (toplam aksiyon kuyruğu)\n` +
              `<code>/inbox pending</code> — bekleyen aksiyon (görsel onay, wizard, vs.)\n` +
              `<code>/inbox publish</code> — yayına hazır ürünler\n` +
              `<code>/inbox stock</code> — stok aciliyeti (tükenmiş, az kaldı)\n` +
              `<code>/inbox failed</code> — hata kuyruğu (içerik, audit, Shopier, son 24sa olaylar)\n` +
              `<code>/inbox today</code> — bugünkü operasyonel görüntü\n\n` +
              `<i>Hepsi salt-okunur. Aksiyon için /find /soldout /restock /redispatch vb. kullanın.</i>`
            break
        }
        await sendTelegramMessage(chatId, msg)
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err)
        console.error(`[telegram/inbox D-236] sub=${sub} error:`, m)
        await sendTelegramMessage(chatId, `❌ Inbox hatası: ${m}`)
      }
      return NextResponse.json({ ok: true })
    }

    // ── D-238: /repair — state coherence sweep + repair ──────────────────
    // /repair scan                  → scan whole catalog for drift
    // /repair <sn-or-id>            → preview repair for one product (dry-run)
    // /repair <sn-or-id> confirm    → apply the repair
    if (text.trim().toLowerCase().startsWith('/repair')) {
      const parts = text.trim().split(/\s+/)
      const arg1 = parts[1]
      const arg2 = (parts[2] || '').toLowerCase()
      try {
        if (!arg1) {
          await sendTelegramMessage(
            chatId,
            '🔧 <b>State Coherence Repair</b>\n\n' +
              '<code>/repair scan</code>\n  Tüm aktif ürünleri tutarsızlık için tarar.\n\n' +
              '<code>/repair &lt;sn-or-id&gt;</code>\n  Tek ürün için önizleme (dry-run, hiçbir şey değişmez).\n\n' +
              '<code>/repair &lt;sn-or-id&gt; confirm</code>\n  Önizlenen düzeltmeyi uygular.\n\n' +
              '<i>Düzeltme deterministik kuralları kullanır — workflowStatus, publishStatus, sellable alanlarını ground truth status / stockState / contentStatus / auditStatus alanlarından türetir.</i>',
          )
          return NextResponse.json({ ok: true })
        }

        if (arg1.toLowerCase() === 'scan') {
          const { scanCoherenceDrift, formatScanReport } = await import('@/lib/stateCoherence')
          const scan = await scanCoherenceDrift(payload, { limit: 200 })
          await sendTelegramMessage(chatId, formatScanReport(scan))
          return NextResponse.json({ ok: true })
        }

        // Single-product repair (dry-run by default; pass `confirm` to apply)
        const { resolveProductIdentifier, formatIdentifierMissingMessage } = await import('@/lib/operatorActions')
        const { normalizeProductState } = await import('@/lib/stateCoherence')
        const resolved = await resolveProductIdentifier(payload, arg1)
        if (!resolved) {
          await sendTelegramMessage(chatId, formatIdentifierMissingMessage(arg1))
          return NextResponse.json({ ok: true })
        }
        const dryRun = arg2 !== 'confirm'
        const report = await normalizeProductState(payload, resolved.productId, { dryRun })
        await sendTelegramMessage(chatId, report.message)
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err)
        console.error(`[telegram/repair D-238] error:`, m)
        await sendTelegramMessage(chatId, `❌ Repair hatası: ${m}`)
      }
      return NextResponse.json({ ok: true })
    }

    // ── D-237: Publish Desk / Approval Gate v1 ────────────────────────────
    // /publishready [today]            — list ready items with action buttons
    // /approvepublish <sn-or-id>       — explicit approval (event) + delegates to /activate
    // /rejectpublish <sn-or-id>        — record rejection (event), no state mutation
    if (text.trim().toLowerCase().startsWith('/publishready')) {
      const parts = text.trim().split(/\s+/)
      const todayOnly = (parts[1] || '').toLowerCase() === 'today' || (parts[1] || '').toLowerCase() === 'bugun' || (parts[1] || '').toLowerCase() === 'bugün'
      try {
        const {
          getPublishReadyList,
          formatPublishReadyHeader,
          formatPublishReadyEntry,
          formatPublishReadyEmpty,
          publishDeskButtons,
        } = await import('@/lib/publishDesk')
        const list = await getPublishReadyList(payload, { todayOnly })
        if (list.items.length === 0) {
          await sendTelegramMessage(chatId, formatPublishReadyEmpty(todayOnly))
          return NextResponse.json({ ok: true })
        }
        // Header first, then per-item cards with their own buttons.
        await sendTelegramMessage(chatId, formatPublishReadyHeader(list, todayOnly))
        for (const entry of list.items) {
          await sendTelegramMessageWithKeyboard(
            chatId,
            formatPublishReadyEntry(entry),
            publishDeskButtons(entry.product.id),
          )
        }
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err)
        console.error(`[telegram/publishready D-237] error:`, m)
        await sendTelegramMessage(chatId, `❌ Publish Desk hatası: ${m}`)
      }
      return NextResponse.json({ ok: true })
    }

    if (text.trim().toLowerCase().startsWith('/approvepublish')) {
      const parts = text.trim().split(/\s+/)
      const idArg = parts[1]
      if (!idArg) {
        await sendTelegramMessage(
          chatId,
          '✅ <b>/approvepublish &lt;sn-or-id[,sn,sn]&gt;</b>\n\n' +
            'Operatörün açık yayın onayını kaydeder ve aktive eder.\n\n' +
            'Tek ürün: <code>/approvepublish SN0186</code>\n' +
            'Toplu: <code>/approvepublish SN0017,SN0022,SN0023</code>\n\n' +
            '<i>Her ürün için publish.approved bot-event yazılır + readiness=6/6 ise aktive edilir. Hazır olmayanlar engelleyiciyle reddedilir.</i>',
        )
        return NextResponse.json({ ok: true })
      }
      try {
        const { approveAndActivateProduct } = await import('@/lib/publishDesk')
        const { parseBatchIdentifiers, isBatch, runBatch, formatBatchSummary } = await import('@/lib/operatorBatch')
        const idents = parseBatchIdentifiers(idArg)

        if (isBatch(idents)) {
          const r = await runBatch(payload, '/approvepublish', idents, async (ctx) => {
            const out = await approveAndActivateProduct(payload, ctx.productId, 'telegram_command', 'approvepublish')
            if (out.idempotent) return { ok: true, badge: '🟰', line: out.summary }
            if (!out.ok) return { ok: false, badge: '⚠️', line: out.summary }
            return { ok: true, badge: '🚀', line: out.summary }
          })
          await sendTelegramMessage(chatId, formatBatchSummary(r))
          return NextResponse.json({ ok: true })
        }

        // Single-id path
        const { resolveProductIdentifier, formatIdentifierMissingMessage } = await import('@/lib/operatorActions')
        const resolved = await resolveProductIdentifier(payload, idArg)
        if (!resolved) {
          await sendTelegramMessage(chatId, formatIdentifierMissingMessage(idArg))
          return NextResponse.json({ ok: true })
        }
        const out = await approveAndActivateProduct(payload, resolved.productId, 'telegram_command', 'approvepublish')
        await sendTelegramMessage(chatId, out.message)
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err)
        console.error(`[telegram/approvepublish D-237/D-239] error:`, m)
        await sendTelegramMessage(chatId, `❌ Hata: ${m}`)
      }
      return NextResponse.json({ ok: true })
    }

    if (text.trim().toLowerCase().startsWith('/rejectpublish')) {
      const parts = text.trim().split(/\s+/)
      const idArg = parts[1]
      if (!idArg) {
        await sendTelegramMessage(
          chatId,
          '🚫 <b>/rejectpublish &lt;sn-or-id[,sn,sn]&gt;</b>\n\n' +
            'Yayın reddini operatör adına kaydeder.\n\n' +
            'Tek ürün: <code>/rejectpublish SN0186</code>\n' +
            'Toplu: <code>/rejectpublish SN0017,SN0022,SN0023</code>\n\n' +
            '<i>Ürün durumu değişmez. publish.rejected bot-event yazılır. Publish Desk listesinden 30 gün gizlenir.</i>',
        )
        return NextResponse.json({ ok: true })
      }
      try {
        const { resolveProductIdentifier, formatIdentifierMissingMessage } = await import('@/lib/operatorActions')
        const { recordPublishDecision } = await import('@/lib/publishDesk')

        // D-239: batch mode — comma-separated ids route through runBatch.
        const { parseBatchIdentifiers, isBatch, runBatch, formatBatchSummary } = await import('@/lib/operatorBatch')
        const idents = parseBatchIdentifiers(idArg)
        if (isBatch(idents)) {
          const r = await runBatch(payload, '/rejectpublish', idents, async (ctx) => {
            const out = await recordPublishDecision(payload, ctx.productId, 'rejected', 'telegram_command')
            const tag = ctx.sn ?? `ID:${ctx.productId}`
            return {
              ok: out.ok,
              badge: out.ok ? '🚫' : '⚠️',
              line: `<code>${tag}</code> · ${out.ok ? 'reddedildi (kayıt)' : 'kaydedilemedi'}`,
            }
          })
          await sendTelegramMessage(chatId, formatBatchSummary(r))
          return NextResponse.json({ ok: true })
        }

        // ── Single-id path (unchanged behaviour) ─────────────────────────
        const resolved = await resolveProductIdentifier(payload, idArg)
        if (!resolved) {
          await sendTelegramMessage(chatId, formatIdentifierMissingMessage(idArg))
          return NextResponse.json({ ok: true })
        }
        const r = await recordPublishDecision(payload, resolved.productId, 'rejected', 'telegram_command')
        await sendTelegramMessage(chatId, r.message)
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err)
        console.error(`[telegram/rejectpublish D-237/D-239] error:`, m)
        await sendTelegramMessage(chatId, `❌ Hata: ${m}`)
      }
      return NextResponse.json({ ok: true })
    }

    // ── D-235: /redispatch <channel> <sn-or-id> ───────────────────────────
    // Per-channel redispatch from Telegram. Bypasses the afterChange hook
    // entirely — calls dispatchProductToChannels directly with onlyChannels.
    // See operatorActions.triggerChannelRedispatch for the why.
    if (text.trim().toLowerCase().startsWith('/redispatch')) {
      const parts = text.trim().split(/\s+/)
      const channelArg = parts[1]
      const idArg = parts[2]

      if (!channelArg || !idArg) {
        await sendTelegramMessage(
          chatId,
          '🔁 <b>Tek Kanal Yeniden Gönderim</b>\n\n' +
            '<code>/redispatch &lt;kanal&gt; &lt;sn-or-id&gt;</code>\n\n' +
            'Kanal seçenekleri: <code>x</code>, <code>instagram</code>, <code>facebook</code>, <code>shopier</code>\n\n' +
            'Örnek:\n' +
            '<code>/redispatch x SN0186</code>\n' +
            '<code>/redispatch instagram 186</code>\n' +
            '<code>/redispatch shopier 312</code>\n\n' +
            '<i>Sadece seçilen kanal yeniden gönderilir. Diğer kanallar tekrar tetiklenmez.</i>\n\n' +
            'ℹ️ Website ayrı bir dispatch hedefi değildir — storefront her istekte güncel state\'i okur.',
        )
        return NextResponse.json({ ok: true })
      }

      try {
        const {
          resolveProductIdentifier,
          triggerChannelRedispatch,
          operatorButtonsKeyboard,
          formatIdentifierMissingMessage,
        } = await import('@/lib/operatorActions')
        const resolved = await resolveProductIdentifier(payload, idArg)
        if (!resolved) {
          await sendTelegramMessage(chatId, formatIdentifierMissingMessage(idArg))
          return NextResponse.json({ ok: true })
        }
        const r = await triggerChannelRedispatch(payload, resolved.productId, channelArg)
        await sendTelegramMessageWithKeyboard(chatId, r.message, operatorButtonsKeyboard(resolved.productId))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[telegram/redispatch D-235] ch=${channelArg} idArg=${idArg} error:`, msg)
        await sendTelegramMessage(chatId, `❌ Yeniden gönderim hatası: ${msg}`)
      }
      return NextResponse.json({ ok: true })
    }

    // ── D-234: Operator Pack v1 — slash-command aliases ───────────────────
    // /find /soldout /oneleft /twoleft /restock /stopsale /restartsale
    // All accept SN-or-ID. /find returns the product card with action buttons.
    // The state-write commands delegate to operatorActions.applyOperatorAction
    // (same code path as inline buttons + /sn sub-actions) so behaviour and
    // idempotency are identical no matter how the operator triggers them.
    {
      const opTextCmds = [
        '/find', '/soldout', '/oneleft', '/twoleft', '/restock',
        '/stopsale', '/restartsale',
      ]
      const firstWord = text.trim().split(/\s+/)[0].replace(/@\w+$/, '').toLowerCase()
      if (opTextCmds.includes(firstWord)) {
        const parts = text.trim().split(/\s+/)
        const cmd = firstWord
        const idArg = parts[1]
        const extraArg = parts[2]

        if (!idArg) {
          const helpText: Record<string, string> = {
            '/find':
              '🔍 <b>/find &lt;sn-or-id&gt;</b>\n\n' +
              'Ürün kartını ve aksiyon düğmelerini gösterir.\n' +
              'Örnek: <code>/find SN0186</code>, <code>/find 186</code>, <code>/find 312</code>',
            '/soldout':
              '🔴 <b>/soldout &lt;sn-or-id&gt;</b>\n\n' +
              'Ürünü tükendi olarak işaretler. Varyantlı ürünlerde tüm beden stokları 0\'a çekilir.',
            '/oneleft':
              '⚠️ <b>/oneleft &lt;sn-or-id&gt;</b>\n\n' +
              'Ürünü "Son 1 Adet" durumuna getirir. Sadece varyantsız ürünler için.',
            '/twoleft':
              '⚠️ <b>/twoleft &lt;sn-or-id&gt;</b>\n\n' +
              'Ürünü "Son 2 Adet" durumuna getirir. Sadece varyantsız ürünler için.',
            '/restock':
              '📦 <b>/restock &lt;sn-or-id&gt; &lt;qty&gt;</b>\n\n' +
              'Ürünü yeniden stoğa alır ve satışa açar.\nÖrnek: <code>/restock SN0186 10</code>\n' +
              'Varyantlı ürünler için panel veya <code>/sn ... stok &lt;N&gt;</code> kullanın.',
            '/stopsale':
              '⏸️ <b>/stopsale &lt;sn-or-id&gt;</b>\n\n' +
              'Ürünü satıştan kaldırır (sellable=false). Mevcut durumu (soldout vs.) korur.',
            '/restartsale':
              '▶️ <b>/restartsale &lt;sn-or-id&gt;</b>\n\n' +
              'Ürünü satışa açar. Efektif stok > 0 olmalı; aksi halde önce <code>/restock</code> kullanın.',
          }
          await sendTelegramMessage(chatId, helpText[cmd] ?? '❌ Bilinmeyen operatör komutu.')
          return NextResponse.json({ ok: true })
        }

        try {
          const {
            resolveProductIdentifier,
            applyOperatorAction,
            operatorButtonsKeyboard,
            formatOperatorCard,
            formatIdentifierMissingMessage,
          } = await import('@/lib/operatorActions')

          // D-239: detect batch input (comma-separated). When the operator
          // passes >1 identifier, route through the shared batch runner.
          // Single-id path stays unchanged below.
          const { parseBatchIdentifiers, isBatch, runBatch, formatBatchSummary } = await import('@/lib/operatorBatch')
          const idents = parseBatchIdentifiers(idArg)
          if (isBatch(idents)) {
            // /find is read-only and renders one full card per item — that's
            // chatty in batch mode. Refuse politely and point at /sn.
            if (cmd === '/find') {
              await sendTelegramMessage(
                chatId,
                '⚠️ <code>/find</code> toplu modda desteklenmiyor (her ürün için ayrı kart üretir). Tek ürün için <code>/find SN0186</code> kullanın.',
              )
              return NextResponse.json({ ok: true })
            }

            // /restock batch needs the qty as the next positional arg
            if (cmd === '/restock') {
              const qty = parseInt(extraArg ?? '', 10)
              if (!Number.isFinite(qty) || qty < 1) {
                await sendTelegramMessage(
                  chatId,
                  `❌ Toplu /restock için geçerli stok adedi gerekli.\n` +
                    `Kullanım: <code>/restock SN1,SN2,SN3 10</code>`,
                )
                return NextResponse.json({ ok: true })
              }
              const r = await runBatch(payload, '/restock', idents, async (ctx) => {
                const out = await applyOperatorAction(payload, ctx.productId, 'restock', {
                  restockQty: qty,
                  source: 'telegram_command',
                })
                const tag = ctx.sn ?? `ID:${ctx.productId}`
                if (!out.ok) return { ok: false, badge: '⚠️', line: `<code>${tag}</code> · ${out.refusalReason ?? 'reddedildi'}` }
                if (out.idempotent) return { ok: true, badge: '🟰', line: `<code>${tag}</code> · zaten ${qty} adet aktif` }
                return { ok: true, badge: '✅', line: `<code>${tag}</code> · stok ${qty} ayarlandı, aktif` }
              })
              await sendTelegramMessage(chatId, formatBatchSummary(r))
              return NextResponse.json({ ok: true })
            }

            // Other state-write commands
            const cmdToAction: Record<string, 'soldout' | 'oneleft' | 'twoleft' | 'stopsale' | 'restartsale'> = {
              '/soldout': 'soldout',
              '/oneleft': 'oneleft',
              '/twoleft': 'twoleft',
              '/stopsale': 'stopsale',
              '/restartsale': 'restartsale',
            }
            const action = cmdToAction[cmd]
            if (!action) {
              await sendTelegramMessage(chatId, `❌ Toplu mod desteği yok: ${cmd}`)
              return NextResponse.json({ ok: true })
            }
            const r = await runBatch(payload, cmd, idents, async (ctx) => {
              const out = await applyOperatorAction(payload, ctx.productId, action, {
                source: 'telegram_command',
              })
              const tag = ctx.sn ?? `ID:${ctx.productId}`
              if (!out.ok) {
                return { ok: false, badge: '⚠️', line: `<code>${tag}</code> · ${out.refusalReason ?? 'reddedildi'}` }
              }
              if (out.idempotent) {
                return { ok: true, badge: '🟰', line: `<code>${tag}</code> · zaten bu durumda` }
              }
              const after = (out.after ?? {}) as Record<string, unknown>
              const status = String(after.status ?? '—')
              return {
                ok: true,
                badge: '✅',
                line: `<code>${tag}</code> · ${action} → status=${status}`,
              }
            })
            await sendTelegramMessage(chatId, formatBatchSummary(r))
            return NextResponse.json({ ok: true })
          }

          // ── Single-id path (unchanged behaviour) ─────────────────────────
          const resolved = await resolveProductIdentifier(payload, idArg)
          if (!resolved) {
            await sendTelegramMessage(chatId, formatIdentifierMissingMessage(idArg))
            return NextResponse.json({ ok: true })
          }

          // /find — read-only card with action buttons
          if (cmd === '/find') {
            const { getStockSnapshot } = await import('@/lib/stockReaction')
            const snapshot = await getStockSnapshot(payload, resolved.productId, resolved.product.stockQuantity ?? 0)
            await sendTelegramMessageWithKeyboard(
              chatId,
              formatOperatorCard(resolved.product, snapshot),
              operatorButtonsKeyboard(resolved.productId),
            )
            return NextResponse.json({ ok: true })
          }

          // /restock requires explicit qty
          if (cmd === '/restock') {
            const qty = parseInt(extraArg ?? '', 10)
            if (!Number.isFinite(qty) || qty < 1) {
              await sendTelegramMessage(
                chatId,
                `❌ Geçersiz stok adedi.\n` +
                  `Kullanım: <code>/restock ${resolved.sn ?? resolved.productId} 10</code>`,
              )
              return NextResponse.json({ ok: true })
            }
            const r = await applyOperatorAction(payload, resolved.productId, 'restock', {
              restockQty: qty,
              source: 'telegram_command',
            })
            await sendTelegramMessageWithKeyboard(chatId, r.message, operatorButtonsKeyboard(resolved.productId))
            return NextResponse.json({ ok: true })
          }

          // State-write commands map 1:1 to OperatorAction values
          const cmdToAction: Record<string, 'soldout' | 'oneleft' | 'twoleft' | 'stopsale' | 'restartsale'> = {
            '/soldout': 'soldout',
            '/oneleft': 'oneleft',
            '/twoleft': 'twoleft',
            '/stopsale': 'stopsale',
            '/restartsale': 'restartsale',
          }
          const action = cmdToAction[cmd]
          if (!action) {
            await sendTelegramMessage(chatId, `❌ Bilinmeyen operatör komutu: ${cmd}`)
            return NextResponse.json({ ok: true })
          }
          const r = await applyOperatorAction(payload, resolved.productId, action, {
            source: 'telegram_command',
          })
          await sendTelegramMessageWithKeyboard(chatId, r.message, operatorButtonsKeyboard(resolved.productId))
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[telegram/operator D-234] cmd=${cmd} idArg=${idArg} error:`, msg)
          await sendTelegramMessage(chatId, `❌ Hata: ${msg}`)
        }
        return NextResponse.json({ ok: true })
      }
    }

    if (text.startsWith('/stok')) {
      const parts = text.trim().split(/\s+/)
      const arg = parts[1]

      if (!arg) {
        await sendTelegramMessage(
          chatId,
          '📦 <b>Stok Durumu</b>\n\n' +
            '<code>/stok &lt;sn-or-id&gt;</code> — Ürün stok durumunu göster\n\n' +
            'Örnek: <code>/stok SN0186</code> veya <code>/stok 186</code> veya <code>/stok 312</code>\n\n' +
            'Tüm beden stokları, efektif stok, workflow durumu görüntülenir.',
        )
        return NextResponse.json({ ok: true })
      }

      try {
        // D-234: SN or ID via shared resolver
        const { resolveProductIdentifier, formatIdentifierMissingMessage } = await import('@/lib/operatorActions')
        const resolved = await resolveProductIdentifier(payload, arg)
        if (!resolved) {
          await sendTelegramMessage(chatId, formatIdentifierMissingMessage(arg))
          return NextResponse.json({ ok: true })
        }

        const { getStockSnapshot, formatStockStatusMessage } = await import('@/lib/stockReaction')
        const snapshot = await getStockSnapshot(payload, resolved.productId, resolved.product.stockQuantity as number)
        const statusMsg = formatStockStatusMessage(resolved.product as any, snapshot)
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

        // /content {id} — show content status + preview (Phase X)
        const { formatContentStatusMessage, formatContentPreviewMessage } = await import('@/lib/contentPack')
        const statusMsg = formatContentStatusMessage(product as any)
        await sendTelegramMessage(chatId, statusMsg)

        // Phase X: Send content preview if available
        const previewMsg = formatContentPreviewMessage(product as any)
        if (previewMsg) {
          await sendTelegramMessageWithKeyboard(chatId, previewMsg, [
            [
              { text: '🔍 Audit Başlat', callback_data: `geo_auditrun:${productId}` },
              { text: '🚀 Yayına Al', callback_data: `geo_activate:${productId}` },
            ],
          ])
        }
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
        const { clearWizardSession, getWizardSession, hydrateWizardSession } = await import('@/lib/confirmationWizard')
        // D-158: load from DB before sync getter so cancellation works across deploys
        await hydrateWizardSession(payload, chatId, msgUserId)
        const existing = getWizardSession(chatId, msgUserId)
        if (existing) {
          await clearWizardSession(chatId, msgUserId)
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
            getCategoryPrompt,
            getProductTypePrompt,
            getPricePrompt,
            getStockPrompt,
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
                { text: '✏️ Düzenle', callback_data: `wz_edit:${productId}` },
                { text: '❌ İptal', callback_data: `wz_cancel:${productId}` },
              ],
            ])
            await setWizardSession(chatId, {
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

          // D-230: vision autofill before first step is decided
          await clearWizardSession(chatId, msgUserId) // Clear any stale session
          const wizState = {
            productId,
            chatId,
            userId: msgUserId,
            step: 'category' as any,  // placeholder
            collected: collected as any,
            startedAt: Date.now(),
          } as any
          const { applyVisionAutofillToSession, formatAutofillReport } = await import('@/lib/confirmationWizard')
          const autofill = await applyVisionAutofillToSession(payload, product as any, wizState)
          const autofillMsg = formatAutofillReport(autofill.filled, autofill.suggested, autofill.result)
          if (autofillMsg) {
            await sendTelegramMessage(chatId, autofillMsg)
          }

          const nextStep = getNextWizardStep(product as any, collected as any)
          wizState.step = nextStep
          await setWizardSession(chatId, wizState, msgUserId)

          // Send first prompt — D-230: pass autofill suggestions
          const ap = wizState.autofillPreview
          if (nextStep === 'title') {
            await sendTelegramMessage(chatId, getTitlePrompt((product as any).title ?? `Ürün #${productId}`))
          } else if (nextStep === 'category') {
            const catPrompt = getCategoryPrompt(ap?.category)
            await sendTelegramMessageWithKeyboard(chatId, catPrompt.text, catPrompt.keyboard)
          } else if (nextStep === 'productType') {
            const ptypePrompt = getProductTypePrompt(ap?.productType)
            await sendTelegramMessageWithKeyboard(chatId, ptypePrompt.text, ptypePrompt.keyboard)
          } else if (nextStep === 'price') {
            await sendTelegramMessage(chatId, getPricePrompt())
          } else if (nextStep === 'sizes') {
            // D-171: Interactive size keyboard
            wizState.pendingSizes = []
            const sizeMsg = await sendTelegramMessageWithKeyboard(
              chatId, formatSizeSelectionText(new Set()), buildSizeKeyboard(new Set()))
            if (sizeMsg) wizState.sizeMessageId = sizeMsg
            await setWizardSession(chatId, wizState, msgUserId)
          } else if (nextStep === 'brand') {
            await sendTelegramMessage(chatId, getBrandPrompt(ap?.brand))
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

      // D-203: compact notification
      await sendTelegramMessage(
        chatId,
        `✅ <b>${productData.title}</b> · ${productData.price} ₺`,
      )
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  }) // end botTokenStore.run()
}
