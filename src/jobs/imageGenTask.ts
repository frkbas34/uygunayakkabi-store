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
 *  2. Fetch product details + reference image from product's first photo
 *  3. Pipeline A (preferred): If reference image available, use GPT Image Edit
 *     (preserves EXACT product, only changes scene/angle/background)
 *     Pipeline B (fallback): If no reference image or editing fails, use
 *     vision analysis + text prompts + generateByMode()
 *  4. For each generated image Buffer:
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

    // ── Step 2b: Load reference image ─────────────────────────────────────────
    // Fetches the product's first photo for Gemini Vision analysis (Step 2c).
    // The image is NOT passed to the generation model (text-to-image only).
    //
    // Media URL handling:
    //   Payload stores media URLs as relative paths like /api/media/file/xxx.jpg.
    //   To fetch them from within a serverless function we need an absolute URL.
    //   We use NEXT_PUBLIC_SERVER_URL or VERCEL_URL to construct it.
    let referenceImage: Buffer | undefined
    let referenceImageMime: string | undefined

    // Helper: make a media URL absolute so it's fetchable from serverless context
    const siteBase =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

    function absoluteUrl(url: string): string {
      if (url.startsWith('http')) return url           // already absolute
      if (siteBase) return `${siteBase}${url}`         // prepend site base
      return url                                        // last resort (will fail)
    }

    // Get the first product image's media ID or populated object
    const imagesArr = productDoc.images as
      | Array<{ image: { url?: string; mimeType?: string } | number }>
      | undefined
    const firstImageItem = imagesArr?.[0]?.image

    // Resolve media URL — try depth:1 populated object first, then direct fetch
    let mediaUrl: string | undefined
    let mediaMime: string | undefined

    if (typeof firstImageItem === 'object' && firstImageItem?.url) {
      mediaUrl = firstImageItem.url
      mediaMime = firstImageItem.mimeType
    } else if (typeof firstImageItem === 'number') {
      // depth:1 didn't populate — fetch media document directly
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
          console.log(`[imageGenTask] reference image loaded — size=${referenceImage.length} mime=${referenceImageMime}`)
        } else {
          console.warn(`[imageGenTask] reference image fetch failed (HTTP ${imgRes.status})`)
        }
      } catch (err) {
        console.warn('[imageGenTask] reference image fetch error:', err)
      }
    }

    if (!referenceImage) {
      console.log('[imageGenTask] No reference image available — using text-only prompts')
    }

    // ── Step 2c: Vision analysis — runs BEFORE pipeline fork ─────────────────
    // Produces a precise text description of the product from the reference photo.
    // This is used as an identity anchor in BOTH Pipeline A (edit prompts) and
    // Pipeline B (text-to-image prompts), significantly reducing identity drift.
    //
    // Example output: "dark brown smooth leather lace-up wingtip oxford shoe
    // with brogue perforations on toe cap and sides, flat stacked leather heel..."
    let visualDescription: string | undefined
    if (referenceImage && process.env.GEMINI_API_KEY) {
      const visualDesc = await describeProductImage(
        referenceImage,
        referenceImageMime || 'image/jpeg',
        process.env.GEMINI_API_KEY,
      )
      if (visualDesc) {
        visualDescription = visualDesc
        productContext.visualDescription = visualDesc
        console.log(`[imageGenTask] Vision description: "${visualDesc.slice(0, 120)}..."`)
      } else {
        console.warn('[imageGenTask] Vision analysis returned null — proceeding without text anchor')
      }
    }

    // ── Step 3 & 4: Generate images ──────────────────────────────────────────
    // Two pipelines:
    //   A) EDITING mode (preferred): When referenceImage is available, use GPT
    //      Image Edit to preserve the EXACT product and only change scene/angle.
    //      Visual description is passed as identity anchor in each edit prompt.
    //   B) TEXT-TO-IMAGE fallback: When no reference image exists, use vision
    //      analysis + text prompts + generateByMode().

    let generatedBuffers: Buffer[] = []
    let providerResultsSummary: unknown[] = []
    let promptSet: Array<{ concept: string; label: string; prompt: string }> = []

    if (referenceImage) {
      // ── Pipeline A: Image EDITING (preserves exact product) ─────────────
      console.log('[imageGenTask] Reference image available — using EDITING pipeline')

      const { generateByEditing } = await import('../lib/imageProviders')

      // Store the editing prompts for debugging
      const editingConcepts = [
        { concept: 'commerce_front', label: 'Ürün — Ön Görünüm (Beyaz Fon)' },
        { concept: 'side_angle', label: 'Ürün — Yan Açı (Stüdyo)' },
        { concept: 'detail_closeup', label: 'Detay — Malzeme Dokusu' },
        { concept: 'tabletop_editorial', label: 'Editoryal — Masa Üstü Yaşam' },
        { concept: 'worn_lifestyle', label: 'Yaşam — Giyim Tarzı' },
      ]

      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          promptsUsed: JSON.stringify(
            editingConcepts.map((c) => ({
              ...c,
              prompt: `[EDITING MODE — identity anchor: ${visualDescription ? visualDescription.slice(0, 80) + '...' : 'image only'}]`,
            })),
          ),
        },
      })

      promptSet = editingConcepts.map((c) => ({ ...c, prompt: 'editing' }))

      try {
        const { results, buffers } = await generateByEditing(
          referenceImage,
          referenceImageMime || 'image/jpeg',
          visualDescription,
        )
        generatedBuffers = buffers
        providerResultsSummary = results.map((r) => ({
          provider: r.provider,
          success: r.successCount,
          total: r.promptCount,
          errors: r.errors,
        }))

        // If editing produced zero images, fall back to text-to-image
        if (generatedBuffers.length === 0) {
          console.warn('[imageGenTask] Editing pipeline produced 0 images — falling back to text-to-image')
          // Fall through to Pipeline B below
        }
      } catch (err) {
        console.warn('[imageGenTask] Editing pipeline error, falling back to text-to-image:', err instanceof Error ? err.message : err)
        // Fall through to Pipeline B below
      }
    }

    // ── Pipeline B: Text-to-image fallback ──────────────────────────────────
    if (generatedBuffers.length === 0) {
      if (referenceImage) {
        console.log('[imageGenTask] Falling back to text-to-image pipeline')
      } else {
        console.log('[imageGenTask] No reference image — using text-to-image pipeline')
      }

      // Step 3: Build text prompts
      const { buildPromptSet } = await import('../lib/imagePromptBuilder')
      const builtPrompts = buildPromptSet(productContext, false)
      const promptTexts = builtPrompts.map((p) => p.prompt)
      promptSet = builtPrompts.map((p) => ({ concept: p.concept, label: p.label, prompt: p.prompt }))

      await payload.update({
        collection: 'image-generation-jobs',
        id: jobId,
        data: {
          promptsUsed: JSON.stringify(promptSet),
        },
      })

      // Step 4: Generate via text-to-image
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
    `You are a product photography expert. Your job is to describe this product so precisely ` +
    `that an AI image generator can recreate EXACTLY the same product — not a similar one. ` +
    `Write ONE detailed English sentence (40-80 words) covering ALL of these in order:\n` +
    `1. EXACT product type & silhouette (e.g. "low-top lace-up derby shoe" NOT just "shoe")\n` +
    `2. ALL colors visible — upper, sole, laces, stitching, accents\n` +
    `3. Material & texture of EACH part (e.g. "smooth leather upper, rubber lug sole")\n` +
    `4. Toe shape (round / pointed / square / almond)\n` +
    `5. Sole style (flat / chunky / wedge / stacked heel), sole color\n` +
    `6. Closure type (lace-up / slip-on / buckle / zipper / velcro)\n` +
    `7. Distinctive details (perforations, logos, contrast stitching, pull tab, etc.)\n` +
    `Do NOT include brand names. Output the description ONLY — no explanation.\n` +
    `Example: "Tan brown smooth leather lace-up wingtip oxford shoe with brogue perforations ` +
    `on toe cap and sides, flat dark brown stacked leather heel, thin brown cotton laces, ` +
    `Goodyear welt stitching, pointed toe, and slim dark brown rubber sole with light tread pattern".`

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
          generationConfig: { responseMimeType: 'text/plain', maxOutputTokens: 250 },
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
