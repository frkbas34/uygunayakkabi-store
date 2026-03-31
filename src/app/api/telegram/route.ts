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

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

/** Send a message with Telegram inline keyboard buttons */
async function sendTelegramMessageWithKeyboard(
  chatId: number,
  text: string,
  keyboard: Array<Array<{ text: string; callback_data: string }>>,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard },
    }),
  })
}

/** Dismiss the loading spinner on a Telegram button after user clicks it */
async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, ...(text ? { text } : {}) }),
  })
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
  const token = process.env.TELEGRAM_BOT_TOKEN
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

  const isPartial = slotsStr !== 'all' && approvedMediaIds.length < allMediaIds.length
  const slotNote = isPartial ? ` (${approvedMediaIds.length}/${allMediaIds.length} slot)` : ''

  await sendTelegramMessage(
    chatId,
    `✅ <b>${approvedMediaIds.length} görsel onaylandı${slotNote}</b>\n\n` +
    `Görseller AI Üretim Galerisi'ne eklendi (ürün sayfası görselleri değişmedi).\n` +
    `🔗 <a href="https://www.uygunayakkabi.com/admin/collections/products/${productId}">Ürünü admin'de gör</a>`,
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
  await payload.update({
    collection: 'image-generation-jobs',
    id: jobId,
    data: { status: 'rejected' },
  })
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
  const providerLabel =
    currentProvider === 'gemini-pro' ? '✨ Gemini Pro' :
    currentProvider === 'openai'     ? '⚙️ ChatGPT'   :
    '🔮 Luma AI'

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
    // Webhook secret doğrulama
    // TELEGRAM_WEBHOOK_SECRET boşsa atla (ilk kurulum / test için)
    const secret = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
    if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // ── Inline keyboard button clicks ─────────────────────────────────────
    // Handles clicks on mode-selection buttons sent after product creation.
    // callback_data format: "imagegen:{productId}:{mode|skip}"
    const callbackQuery = body?.callback_query
    if (callbackQuery) {
      const cbChatId: number = callbackQuery.message?.chat?.id
      const cbQueryId: string = callbackQuery.id
      const cbData: string = callbackQuery.data || ''

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

      // ── lumahq:{jobId} ────────────────────────────────────────────────────
      // Luma HQ rerun — re-queues luma-gen task with hq=true (photon-1 model).
      // Discards current preview images and starts a fresh HQ generation.
      if (cbData.startsWith('lumahq:')) {
        const cbJobId = cbData.split(':')[1]
        await answerCallbackQuery(cbQueryId, '🌟 HQ yeniden üretiliyor...')

        after(async () => {
          try {
            const hqPayload = await getPayload()

            // Reset the job for HQ rerun
            await hqPayload.update({
              collection: 'image-generation-jobs',
              id: cbJobId,
              data: {
                status: 'queued',
                generatedImages: [],
                imageCount: 0,
                errorMessage: '',
                generationStartedAt: null,
                generationCompletedAt: null,
              },
            })

            // Queue luma-gen with hq=true
            await hqPayload.jobs.queue({
              task: 'luma-gen',
              input: { jobId: cbJobId, hq: true },
              overrideAccess: true,
            })

            await sendTelegramMessage(
              cbChatId,
              `🌟 <b>Luma HQ yeniden üretim başlatıldı</b>\n\n` +
              `⚙️ Model: photon-1 (yüksek kalite)\n` +
              `Görseller hazır olduğunda Telegram'a önizleme gönderilecek.`,
            )

            // Run immediately
            await hqPayload.jobs.run({ limit: 1, overrideAccess: true })
          } catch (err) {
            console.error('[telegram/webhook] lumahq callback failed:', err)
            await sendTelegramMessage(cbChatId, `❌ HQ yeniden üretim başlatılamadı: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
          }
        })
      }

      return NextResponse.json({ ok: true })
    }

    // ── Regular message handling ───────────────────────────────────────────
    const message = body?.message

    if (!message) {
      return NextResponse.json({ ok: true })
    }

    const text: string = message.text || message.caption || ''
    const chatId: number = message.chat?.id
    const messageId: number = message.message_id

    const payload = await getPayload()

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
        //    Engine tag'leri: #luma → Luma, #chatgpt → OpenAI, #geminipro → Gemini Pro
        const combinedRaw = text + (replyCaption ? '\n' + replyCaption : '')
        const autoGenMode: 'hizli' | 'dengeli' | 'premium' | 'karma' | null =
          /#karma/i.test(combinedRaw)   ? 'karma'   :
          /#premium/i.test(combinedRaw) ? 'premium' :
          /#dengeli/i.test(combinedRaw) ? 'dengeli' :
          /#hizli/i.test(combinedRaw)   ? 'hizli'   :
          null
        // Engine-explicit tags (new UX) — checked separately from legacy mode names
        const autoGenEngine: 'luma' | 'chatgpt' | 'geminipro' | null =
          /#chatgpt\b/i.test(combinedRaw)   ? 'chatgpt'   :
          /#geminipro\b/i.test(combinedRaw) ? 'geminipro' :
          /#luma\b/i.test(combinedRaw)      ? 'luma'      :
          null

        // Caption temizle — bot mentions + trigger phrases + görsel hashtag'leri sil
        //    #hizli / #dengeli / #premium / #karma / #gorsel / #luma / #chatgpt / #geminipro
        //    gibi görsel tag'leri çıkarılır — "bunu ürüne çevir #luma 1755 TL" gibi
        //    kullanımlarda parseTelegramCaption'ı bozmasın
        const BOT_MENTIONS = /(@Uygunops_bot|@uygunops_bot|@mentix_aibot|@Mentix)/gi
        const GORSEL_TAGS  = /#(gorsel|hizli|dengeli|premium|karma|geminipro|chatgpt|luma)\b/gi
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
              `<code>#gorsel ${groupProductId}</code> — 🔮 Luma\n` +
              `<code>#chatgpt ${groupProductId}</code> — ⚙️ ChatGPT\n` +
              `<code>#geminipro ${groupProductId}</code> — ✨ Gemini Pro`,
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
          ? `\n💡 <i>Admin'den tamamla: ${missing.join(', ')} — </i>` +
            `<a href="https://www.uygunayakkabi.com/admin/collections/products/${productId}">aç</a>`
          : ''

        const confidenceBar = parsedCaption?.parseConfidence
          ? ` (${parsedCaption.parseConfidence}% güven)`
          : ''

        // 12. Görsel tag varsa → otomatik görsel üretim kuyruğa al
        //    Legacy mod tag'leri (hizli/dengeli/premium/karma) → Luma (default)
        //    Engine tag'leri: #luma → Luma, #chatgpt → ChatGPT, #geminipro → Gemini Pro
        // v18 Gemini-only debug phase: all caption engine/mode tags → Gemini Pro
        const effectiveEngine = autoGenEngine  // tag captured but routing below ignores non-gemini
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

        if (autoGenJobId && (autoGenMode || autoGenEngine)) {
          // Engine/mode was pre-selected in caption — show plain confirmation
          // v18 Gemini-only: single label regardless of tag
          const autoConfirmLabel = '✨ <b>Gemini Pro görsel üretimi başlatıldı</b> — 3 sahne — tamamlanınca bildirim gelecek'
          await sendTelegramMessage(
            chatId,
            productSummary + `\n\n${autoConfirmLabel}`,
          )
        } else {
          // v18 Gemini-only debug phase: single engine button
          await sendTelegramMessageWithKeyboard(
            chatId,
            productSummary + `\n\n🎨 <b>Görsel üretmek ister misiniz?</b>`,
            [
              [
                { text: '✨ Gemini Pro (görsel üret)', callback_data: `imagegen:${productId}:geminipro` },
              ],
              [
                { text: '❌ Hayır, sadece kaydet', callback_data: `imagegen:${productId}:skip` },
              ],
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
    // Product discovery:
    //   A) Reply to the bot's product creation message → extracts product ID from URL
    //   B) Explicit: "#gorsel 42" or "#gorsel 42 #premium"
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

      // Find product ID:
      // Option A — bot's confirmation message (reply contains /products/<id> URL)
      const replyText =
        message.reply_to_message?.text ||
        message.reply_to_message?.caption ||
        ''
      const urlMatch = replyText.match(/\/products\/(\d+)/)
      let gorselProductId: number | null = urlMatch ? parseInt(urlMatch[1]) : null

      // Option B — explicit ID in the command: "#gorsel 42" or "#gorsel 42 #premium"
      if (!gorselProductId) {
        const idMatch = text.match(/#gorsel\s+(\d+)/i)
        if (idMatch) gorselProductId = parseInt(idMatch[1])
      }

      if (!gorselProductId) {
        await sendTelegramMessage(
          chatId,
          '🎨 <b>Görsel üretimi için ürün gerekli.</b>\n\n' +
          'İki yöntemden biri:\n' +
          '1️⃣ Ürün oluşturma mesajını <b>reply</b> edip yaz: <code>#gorsel</code>\n' +
          '2️⃣ Ürün ID ile yaz: <code>#gorsel 42</code>\n\n' +
          '✨ Aktif motor: <b>Gemini Pro</b> — 3 sahne\n\n' +
          'Sonrasında: 🌟 Premium butonu ile Slot 4-5 Gemini Pro üretebilirsiniz.',
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
      // Option A — reply to product creation message
      const gpReplyText =
        message.reply_to_message?.text ||
        message.reply_to_message?.caption ||
        ''
      const gpUrlMatch = gpReplyText.match(/\/products\/(\d+)/)
      let gpProductId: number | null = gpUrlMatch ? parseInt(gpUrlMatch[1]) : null

      // Option B — explicit ID: "#geminipro 42"
      if (!gpProductId) {
        const idMatch = text.match(/#geminipro\s+(\d+)/i)
        if (idMatch) gpProductId = parseInt(idMatch[1])
      }

      if (!gpProductId) {
        await sendTelegramMessage(
          chatId,
          '✨ <b>Gemini Pro görsel üretimi için ürün gerekli.</b>\n\n' +
          'İki yöntemden biri:\n' +
          '1️⃣ Ürün oluşturma mesajını <b>reply</b> edip yaz: <code>#geminipro</code>\n' +
          '2️⃣ Ürün ID ile yaz: <code>#geminipro 42</code>\n\n' +
          '<code>#geminipro</code> — ✨ Gemini Pro, 3 sahne',
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
