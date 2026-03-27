/**
 * imageGenTask — Step 24
 *
 * Payload Jobs Queue task for AI product image generation.
 * Registered in payload.config.ts under jobs.tasks.
 *
 * Triggered by: Telegram route when user sends #gorsel command.
 *
 * Flow:
 *  1. Fetch ImageGenerationJob record (has product ID, mode, Telegram chat ID)
 *  2. Fetch product details (title, category, brand, color, material, etc.)
 *  3. Build 5 concept prompts via imagePromptBuilder
 *  4. Call provider(s) via imageProviders.generateByMode()
 *  5. For each generated image Buffer:
 *     - Create Media document via payload.create (auto-uploads to Vercel Blob)
 *     - Collect media IDs
 *  6. Update ImageGenerationJob: status='review', generatedImages=[...media IDs]
 *  7. Send Telegram notification to requester
 *
 * On failure: job status → 'failed', error message stored, Telegram notified.
 *
 * IMPORTANT: Image generation takes 30–120 seconds for 5 images.
 * Vercel Pro is needed (maxDuration=60 or higher on the job runner endpoint).
 * On Hobby plan, set retries=0 to prevent partial re-generation.
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
  retries: 0, // No retry — image gen is expensive; admin should re-trigger if needed

  inputSchema: [{ name: 'jobId', type: 'text', required: true }],

  outputSchema: [
    { name: 'success', type: 'checkbox' },
    { name: 'mediaIds', type: 'text' },
    { name: 'error', type: 'text' },
  ],

  onFail: async ({ job, req }) => {
    // Extract jobId from the job record for cleanup
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
    } catch (err) {
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

    const productId =
      typeof productRef === 'object' ? productRef.id : productRef

    // Mark as generating
    await payload.update({
      collection: 'image-generation-jobs',
      id: jobId,
      data: {
        status: 'generating',
        generationStartedAt: new Date().toISOString(),
      },
    })

    // ── Step 2: Fetch product details (depth:1 to get populated image URLs) ──
    let productDoc: Record<string, unknown>
    try {
      productDoc = await payload.findByID({
        collection: 'products',
        id: productId,
        depth: 1,
      }) as Record<string, unknown>
    } catch (err) {
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

    // ── Step 2b: Load first product image as reference for consistency ───────
    // If the product already has photos, we pass the first one as a reference
    // image so the AI keeps the exact same product design across all 5 shots.
    let referenceImage: Buffer | undefined
    let referenceImageMime: string | undefined

    const imagesArr = productDoc.images as
      | Array<{ image: { url?: string; mimeType?: string } | number }>
      | undefined

    if (imagesArr && imagesArr.length > 0) {
      const firstEntry = imagesArr[0]
      const firstMedia = firstEntry?.image
      if (firstMedia && typeof firstMedia === 'object' && firstMedia.url) {
        try {
          const imgRes = await fetch(firstMedia.url)
          if (imgRes.ok) {
            referenceImage = Buffer.from(await imgRes.arrayBuffer())
            referenceImageMime = firstMedia.mimeType || 'image/jpeg'
            console.log(
              `[imageGenTask] reference image loaded — ` +
                `url=${firstMedia.url} size=${referenceImage.length} mime=${referenceImageMime}`,
            )
          } else {
            console.warn(
              `[imageGenTask] reference image fetch failed (HTTP ${imgRes.status}) — text-only mode`,
            )
          }
        } catch (err) {
          console.warn('[imageGenTask] Could not load reference image — text-only mode:', err)
        }
      }
    }

    if (!referenceImage) {
      console.log('[imageGenTask] No reference image available — using text-only prompts')
    }

    // ── Step 2c: Vision analysis — describe the product for text prompts ─────
    // The image generation models (gemini-2.5-flash-image etc.) are text-to-image
    // only and do not process image inputs. Instead we use gemini-2.5-flash (the
    // vision/text model) to produce a specific description of the actual product,
    // which is then used as the primary prompt descriptor for image generation.
    if (referenceImage && process.env.GEMINI_API_KEY) {
      const visualDesc = await describeProductImage(
        referenceImage,
        referenceImageMime || 'image/jpeg',
        process.env.GEMINI_API_KEY,
      )
      if (visualDesc) {
        productContext.visualDescription = visualDesc
        console.log(`[imageGenTask] productContext enriched with visualDescription`)
      } else {
        console.warn('[imageGenTask] Vision analysis returned null — using metadata fallback')
      }
    }

    // ── Step 3: Build prompts ───────────────────────────────────────────────
    const { buildPromptSet } = await import('../lib/imagePromptBuilder')
    // Always use text-only mode — image generation models don't support image input.
    // When visualDescription is set, buildPromptSet uses it as the product descriptor.
    const promptSet = buildPromptSet(productContext, false)
    const promptTexts = promptSet.map((p) => p.prompt)

    await payload.update({
      collection: 'image-generation-jobs',
      id: jobId,
      data: {
        promptsUsed: JSON.stringify(
          promptSet.map((p) => ({ concept: p.concept, label: p.label })),
        ),
      },
    })

    // ── Step 4: Generate images ─────────────────────────────────────────────
    const { generateByMode } = await import('../lib/imageProviders')

    let generatedBuffers: Buffer[] = []
    let providerResultsSummary: unknown[] = []

    try {
      // Note: referenceImage is NOT passed here — the image generation models
      // (gemini-2.5-flash-image etc.) are text-to-image only and ignore image
      // inputs. Product consistency is achieved via visualDescription in prompts.
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
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          status: 'failed',
          errorMessage: `Görsel üretimi başarısız: ${msg}`,
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
        console.log(
          `[imageGenTask] media saved — id=${media.id} concept=${concept} size=${buf.length}`,
        )
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
        providerResults: JSON.stringify(providerResultsSummary),
        jobTitle: `${productTitle} — ${modeLabelTr(mode)} (${mediaIds.length} görsel)`,
      },
    })

    // ── Step 7: Telegram notification ───────────────────────────────────────
    if (telegramChatId) {
      const adminUrl = `https://www.uygunayakkabi.com/admin/collections/image-generation-jobs/${jobId}`
      await sendTelegramNotification(
        telegramChatId,
        `🎨 <b>${mediaIds.length} görsel hazır!</b>\n\n` +
          `📦 Ürün: <b>${productTitle}</b>\n` +
          `🔧 Mod: ${modeLabelTr(mode)}\n\n` +
          `Admin panelinde görselleri inceleyip ürüne ekleyebilirsiniz:\n` +
          `🔗 <a href="${adminUrl}">Görselleri incele</a>`,
      )
    }

    console.log(
      `[imageGenTask] success — jobId=${jobId} product=${productId} ` +
        `images=${mediaIds.length}`,
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

/**
 * Uses Gemini Vision (gemini-2.5-flash — a text+vision model, NOT the image
 * generation model) to analyse the reference product photo and return a concise
 * English description suitable for use in image generation text prompts.
 *
 * Example output: "camel brown suede Chelsea boot with elastic side panels,
 * stacked block heel, and almond toe cap"
 *
 * This description is then injected as productContext.visualDescription so the
 * text-to-image model receives a highly specific product description rather than
 * the sparse metadata available for draft/Telegram-created products.
 *
 * Returns null if the API call fails (task continues with fallback description).
 */
async function describeProductImage(
  imageBuffer: Buffer,
  imageMime: string,
  apiKey: string,
): Promise<string | null> {
  const visionModel = 'gemini-2.5-flash'   // text/vision model — NOT image gen

  const prompt =
    `You are a product photography assistant helping to prepare AI image generation prompts. ` +
    `Analyse this product photo carefully and describe the product in ONE concise English sentence (25-50 words). ` +
    `Include: product type (e.g. sneaker / boot / sandal / wallet), dominant color(s), ` +
    `material or texture (e.g. leather / suede / mesh / canvas), ` +
    `key visual design features (e.g. logo, sole color, lace color, stitching, patterns), ` +
    `and style category (e.g. casual / sport / formal). ` +
    `Do NOT include brand names unless clearly visible. ` +
    `Do NOT add any explanation — output the description sentence only. ` +
    `Example: "Black mesh low-top running sneaker with neon yellow sole, reflective side stripe, and padded ankle collar".`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: imageMime, data: imageBuffer.toString('base64') } },
              { text: prompt },
            ],
          }],
          generationConfig: { responseMimeType: 'text/plain', maxOutputTokens: 120 },
        }),
      },
    )

    if (!res.ok) {
      const err = await res.text()
      console.warn(`[imageGenTask] Vision analysis HTTP ${res.status}: ${err.slice(0, 200)}`)
      return null
    }

    const data = await res.json()
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      console.warn('[imageGenTask] Vision analysis returned no text:', JSON.stringify(data).slice(0, 200))
      return null
    }

    const description = text.trim().replace(/^["']|["']$/g, '').trim()
    console.log(`[imageGenTask] Vision description: "${description}"`)
    return description
  } catch (err) {
    console.warn('[imageGenTask] Vision analysis failed:', err instanceof Error ? err.message : err)
    return null
  }
}

function modeLabelTr(mode: string): string {
  const labels: Record<string, string> = {
    hizli: '⚡ Hızlı (Gemini Flash)',
    dengeli: '⚖️ Dengeli (GPT Image)',
    premium: '💎 Premium (Gemini Pro)',
    karma: '🌈 Karma',
  }
  return labels[mode] ?? mode
}

async function sendTelegramNotification(
  chatId: string,
  text: string,
): Promise<void> {
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
