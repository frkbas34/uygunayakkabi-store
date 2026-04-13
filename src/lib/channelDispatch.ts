/**
 * channelDispatch.ts — Step 13 (scaffold) + Step 16 (real Instagram integration)
 *
 * Pure dispatch layer for Instagram / Shopier / Dolap channel adapters.
 * Fires n8n webhooks (via N8N_CHANNEL_*_WEBHOOK env vars) that orchestrate
 * real channel publishing.  Instagram is now a real publish workflow (Step 16).
 * Shopier and Dolap remain scaffold-only until their integrations are built.
 *
 * Architecture:
 *   Products.ts afterChange hook → dispatchProductToChannels()
 *     → evaluateChannelEligibility()   (global capability ∩ product intent)
 *     → buildDispatchPayload()          (structured adapter contract)
 *     → dispatchToChannel()             (POST to n8n webhook OR dry-run log)
 *
 * Env vars (all optional — absent = scaffold/dry-run mode):
 *   N8N_CHANNEL_INSTAGRAM_WEBHOOK  e.g. https://flow.uygunayakkabi.com/webhook/channel-instagram
 *   N8N_CHANNEL_SHOPIER_WEBHOOK    e.g. https://flow.uygunayakkabi.com/webhook/channel-shopier
 *   N8N_CHANNEL_DOLAP_WEBHOOK      e.g. https://flow.uygunayakkabi.com/webhook/channel-dolap
 *
 * Design constraints:
 *   - Pure functions (no Payload dependency) — testable in isolation
 *   - Never throws — all errors caught, returned as ChannelDispatchResult.error
 *   - Website is NOT a dispatch target (it's native — active status = visible)
 *   - Scaffold mode logs full payload intent for debugging
 */

import type { AutomationSettingsSnapshot } from './automationDecision'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SupportedChannel =
  | 'instagram'
  | 'shopier'
  | 'dolap'
  | 'x'
  | 'facebook'
  | 'threads'

/** All non-website channels that require external dispatch */
export const SUPPORTED_CHANNELS: SupportedChannel[] = [
  'instagram',
  'shopier',
  'dolap',
  'x',
  'facebook',
  'threads',
]

/**
 * Structured payload sent to each channel's n8n webhook.
 * This is the adapter contract — n8n workflows expect this shape.
 */
export type ChannelDispatchPayload = {
  /** Target channel identifier */
  channel: SupportedChannel
  /** Payload CMS product ID */
  productId: string | number
  /** SKU / stock code */
  sku?: string
  /** Product title — required for all listings */
  title: string
  /** Sale price in TRY */
  price: number
  /** Original / market price (for discount display) */
  originalPrice?: number
  /** Brand name string */
  brand?: string
  /** Category value (Günlük / Spor / Klasik etc.) */
  category?: string
  /** Product family (shoes / wallets / bags etc.) */
  productFamily?: string
  /** Product type detail (sneaker / loafer / bifold etc.) */
  productType?: string
  /** Color string */
  color?: string
  /** Full product description text */
  description?: string
  /** Ordered list of media URLs (Vercel Blob or /media/* fallback) */
  mediaUrls: string[]
  /** All channel targets on this product (not just the current one) */
  channelTargets: string[]
  /** Human-readable reason this dispatch was triggered */
  triggerReason: string
  /** ISO timestamp when dispatch was initiated */
  dispatchTimestamp: string
  /**
   * Instagram credentials — injected by Products.ts from AutomationSettings global.
   * Only present when channel === 'instagram'.
   * n8n workflow reads these from $json.instagramAccessToken / $json.instagramUserId
   * instead of $vars.* (n8n Variables are locked on current plan).
   */
  instagramAccessToken?: string
  instagramUserId?: string
  /** Automation pipeline metadata for traceability */
  meta: {
    parseConfidence?: number
    autoDecision?: string
    telegramMessageId?: string
    source?: string
  }
  /** Geobot-generated channel-specific copy (Phase D wiring) */
  geobot?: {
    websiteDescription?: string
    instagramCaption?: string
    xPost?: string
    facebookCopy?: string
    shopierCopy?: string
    highlights?: string[]
  }
}

/**
 * Per-channel result returned by dispatchToChannel().
 * Stored as JSON in sourceMeta.dispatchNotes for admin visibility.
 */
export type ChannelDispatchResult = {
  channel: SupportedChannel
  /** Whether this channel passed all eligibility gates */
  eligible: boolean
  /** Whether the webhook was actually called and acknowledged */
  dispatched: boolean
  /** Why this channel was skipped (if !eligible or !dispatched) */
  skippedReason?: string
  /** Whether the env var URL was set for this channel */
  webhookConfigured: boolean
  /** HTTP status code from webhook (if called) */
  responseStatus?: number
  /** Error message if dispatch failed */
  error?: string
  /**
   * Structured result body returned by the n8n workflow (if available + parseable JSON).
   * For Instagram (Step 16): includes mode, instagramPostId, success, caption, mediaUrl, etc.
   * Stored verbatim in sourceMeta.dispatchNotes for admin visibility.
   */
  publishResult?: Record<string, unknown>
  /** ISO timestamp of this result */
  timestamp: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the n8n webhook URL for a given channel.
 * Returns undefined if the corresponding env var is not set or empty.
 */
export function buildChannelWebhookUrl(channel: SupportedChannel): string | undefined {
  const envMap: Record<SupportedChannel, string | undefined> = {
    instagram: process.env.N8N_CHANNEL_INSTAGRAM_WEBHOOK,
    shopier:   process.env.N8N_CHANNEL_SHOPIER_WEBHOOK,
    dolap:     process.env.N8N_CHANNEL_DOLAP_WEBHOOK,
    x:         process.env.N8N_CHANNEL_X_WEBHOOK,
    facebook:  process.env.N8N_CHANNEL_FACEBOOK_WEBHOOK,
    threads:   process.env.N8N_CHANNEL_THREADS_WEBHOOK,
  }
  const url = envMap[channel]
  return url && url.trim().length > 0 ? url.trim() : undefined
}

/**
 * Extract all media URLs from a product document.
 *
 * In production, Vercel Blob always provides a full https:// URL via `media.url`.
 * In dev/local, media is served from the Next.js server at `/media/<filename>`.
 *
 * IMPORTANT for channel workers (n8n on VPS): relative /media/ paths are NOT
 * reachable from external systems. This function makes them absolute using
 * NEXT_PUBLIC_SERVER_URL so that n8n and downstream channels can fetch images.
 *
 * URL precedence:
 *  1. media.url  (Vercel Blob — always absolute, preferred)
 *  2. /media/<filename> made absolute with NEXT_PUBLIC_SERVER_URL (dev fallback)
 *  3. Relative /media/<filename> if NEXT_PUBLIC_SERVER_URL not set (local only)
 */
function extractMediaUrls(product: Record<string, unknown>): string[] {
  type ImgEntry = { image?: { url?: string; filename?: string } }

  // Normalize base URL: strip trailing slash so /media/ join is clean
  const serverUrl = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace(/\/$/, '')

  const resolveUrls = (entries: ImgEntry[]): string[] =>
    entries
      .map((img) => {
        const media = img?.image
        if (!media) return null
        // Absolute URL (Vercel Blob or external CDN) — use as-is
        if (media.url && media.url.startsWith('http')) return media.url
        // Relative Payload URL (e.g. /api/media/file/x.webp) — make absolute
        if (media.url) return serverUrl ? `${serverUrl}${media.url}` : media.url
        // Local dev path — make absolute so VPS-side workers can fetch it
        if (media.filename) {
          const relativePath = `/media/${media.filename}`
          return serverUrl ? `${serverUrl}${relativePath}` : relativePath
        }
        return null
      })
      .filter((url): url is string => url !== null)

  // AI-generated images (generativeGallery) take priority — side_angle is [0]
  const aiImages = product.generativeGallery as ImgEntry[] | undefined
  const originalImages = product.images as ImgEntry[] | undefined

  const aiUrls = Array.isArray(aiImages) ? resolveUrls(aiImages) : []
  const origUrls = Array.isArray(originalImages) ? resolveUrls(originalImages) : []

  // AI gallery first (side_angle hero), then originals as supplementary
  if (aiUrls.length > 0) return [...aiUrls, ...origUrls]
  return origUrls
}

// ── Media URL Pre-warm ───────────────────────────────────────────────────────

/**
 * Phase W1: Pre-warm a media URL by fetching it.
 *
 * Vercel serves /api/media/file/* via a serverless function.  On cold start
 * the first request can take 2-5 s, which causes Instagram/Facebook's media
 * fetcher to time out.  A pre-warm GET populates the Vercel edge cache so the
 * Graph API's subsequent fetch gets a fast cache HIT.
 *
 * Non-fatal — callers should proceed even if pre-warm fails.
 */
async function prewarmMediaUrl(imageUrl: string, channel: string): Promise<void> {
  try {
    const res = await fetch(imageUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(15_000),
    })
    // Consume the body fully so the CDN caches the complete response
    const buf = await res.arrayBuffer()
    console.log(
      `[channelDispatch] ${channel} pre-warm — url=${imageUrl} ` +
        `status=${res.status} bytes=${buf.byteLength}`,
    )
    if (res.status !== 200) {
      console.warn(
        `[channelDispatch] ${channel} pre-warm non-200 — url=${imageUrl} status=${res.status}`,
      )
    }
  } catch (err) {
    console.warn(
      `[channelDispatch] ${channel} pre-warm failed (non-fatal) — url=${imageUrl}: ` +
        (err instanceof Error ? err.message : String(err)),
    )
  }
}

// ── Instagram Direct Publish ──────────────────────────────────────────────────

/**
 * Build an Instagram caption from a product payload.
 * Mirrors the logic in the n8n "Build Caption" node so output is consistent.
 */
function buildInstagramCaption(payload: ChannelDispatchPayload): string {
  // Phase D: prefer Geobot-generated Instagram caption when available
  if (payload.geobot?.instagramCaption) {
    return payload.geobot.instagramCaption.substring(0, 2200)
  }
  // Fallback: build caption from basic product fields
  let c = payload.title
  if (payload.price)         c += '\n\n💰 ' + payload.price + ' TL'
  if (payload.originalPrice) c += '  (Normal: ' + payload.originalPrice + ' TL)'
  if (payload.brand)         c += '\n🏷️ ' + payload.brand
  if (payload.category)      c += '  ·  ' + payload.category
  if (payload.color)         c += '\n🎨 ' + payload.color
  if (payload.description && payload.description.length > 0)
    c += '\n\n' + payload.description.substring(0, 200)
  c += '\n\n#uygunayakkabi #ayakkabi'
  if (payload.brand)    c += ' #' + payload.brand.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
  if (payload.category) c += ' #' + payload.category.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
  return c.substring(0, 2200)
}

/**
 * Publish a photo post to a Facebook Page directly via the Graph API — no n8n required.
 *
 * Steps:
 *  1. Exchange user access token for Page Access Token  (GET /{pageId}?fields=access_token)
 *  2. POST image to /{pageId}/photos with the Page Access Token
 *
 * The user token stored in AutomationSettings.instagramTokens.accessToken is a Meta
 * long-lived user token that covers both Instagram and Facebook on the same account.
 * Posting to the page requires pages_manage_posts scope.  If the exchange fails (scope
 * not present), the function tries again with the user token directly as a fallback.
 */
async function publishFacebookDirectly(
  payload: ChannelDispatchPayload,
  pageId: string,
  userAccessToken: string,
): Promise<ChannelDispatchResult> {
  const timestamp = new Date().toISOString()
  const validUrls = payload.mediaUrls.filter((u) => u && u.startsWith('https://'))

  if (validUrls.length === 0) {
    return {
      channel: 'facebook', eligible: true, dispatched: false,
      webhookConfigured: false,
      error: 'No valid https:// image URL found in mediaUrls',
      timestamp,
    }
  }

  try {
    // Phase D: prefer Geobot-generated Facebook copy, fallback to Instagram caption builder
    const caption = payload.geobot?.facebookCopy
      ? payload.geobot.facebookCopy.substring(0, 2200)
      : buildInstagramCaption(payload)

    // ── Phase W1: Pre-warm ALL media URLs in parallel ────────────────────────
    await Promise.all(validUrls.map((url) => prewarmMediaUrl(url, 'facebook')))
    await new Promise((r) => setTimeout(r, 500))

    // ── Step 1: Get Page Access Token ─────────────────────────────────────────
    const pageTokenRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=access_token,name,id&access_token=${userAccessToken}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    const pageTokenData = await pageTokenRes.json() as Record<string, unknown>

    // Determine which token to use for the post
    let pageAccessToken: string
    let tokenMode: string

    const step1ErrCode   = (pageTokenData.error as Record<string, unknown> | undefined)?.code
    const step1ErrSubcode = (pageTokenData.error as Record<string, unknown> | undefined)?.error_subcode
    const isNPEPage = step1ErrCode === 100 && step1ErrSubcode === 33

    if (!pageTokenRes.ok || !pageTokenData.access_token || typeof pageTokenData.access_token !== 'string') {
      if (isNPEPage) {
        console.log(
          `[channelDispatch] Facebook: step 1 → NPE page detected (err 100/33). ` +
          `Falling back to user token with pages_manage_posts for page=${pageId}`,
        )
        pageAccessToken = userAccessToken
        tokenMode = 'user-token-npe'
      } else {
        const step1Error = pageTokenData.error ?? pageTokenData
        console.error(
          `[channelDispatch] Facebook: step 1 FAILED (non-NPE) for page=${pageId}:`,
          step1Error,
        )
        return {
          channel: 'facebook', eligible: true, dispatched: false,
          webhookConfigured: false,
          error: `Facebook step 1 failed (HTTP ${pageTokenRes.status}): could not obtain page access token`,
          publishResult: {
            mode:           'api-error',
            success:        false,
            step:           'page-token-exchange',
            pageId,
            step1HttpStatus: pageTokenRes.status,
            step1Response:   JSON.stringify(step1Error).slice(0, 500),
            timestamp:       new Date().toISOString(),
          },
          timestamp,
        }
      }
    } else {
      pageAccessToken = pageTokenData.access_token
      tokenMode = 'page-token'
      console.log(`[channelDispatch] Facebook: step 1 ✅ page access token obtained — page="${pageTokenData.name ?? pageId}" id=${pageTokenData.id ?? pageId}`)
    }

    // ── Step 2: Post photo(s) to page feed ───────────────────────────────────
    // D-190: Multi-photo support.
    // Single image: POST /{pageId}/photos with published=true (same as before)
    // Multiple images: upload each with published=false → create feed post with attached_media
    if (validUrls.length === 1) {
      // ── Single image path (unchanged) ────────────────────────────────────
      const postParams = new URLSearchParams({
        url:          validUrls[0],
        message:      caption,
        access_token: pageAccessToken,
        published:    'true',
      })
      const postRes  = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/photos?${postParams.toString()}`,
        { method: 'POST', signal: AbortSignal.timeout(20_000) },
      )
      const postData = await postRes.json() as Record<string, unknown>

      const postId = (postData.id ?? postData.post_id) as string | undefined
      if (!postId) {
        console.error(`[channelDispatch] Facebook post failed (tokenMode=${tokenMode}):`, postData)
        return {
          channel: 'facebook', eligible: true, dispatched: false,
          webhookConfigured: false,
          error: `Facebook post failed (HTTP ${postRes.status})`,
          publishResult: {
            mode: 'api-error', success: false,
            tokenMode,
            apiError: JSON.stringify(postData.error ?? postData),
            apiErrorCode: postData.error ? (postData.error as Record<string, unknown>).code : undefined,
            timestamp: new Date().toISOString(),
          },
          timestamp,
        }
      }

      console.log(`[channelDispatch] Facebook direct publish success — product=${payload.productId} postId=${postId} tokenMode=${tokenMode} mode=single`)
      return {
        channel: 'facebook', eligible: true, dispatched: true,
        webhookConfigured: false,
        responseStatus: 200,
        publishResult: {
          received: true, channel: 'facebook', mode: 'direct',
          success: true, facebookPostId: postId, pageId, tokenMode,
          mediaUrl: validUrls[0], mediaCount: 1,
          caption: caption.substring(0, 80) + '…',
          timestamp: new Date().toISOString(),
        },
        timestamp,
      }
    }

    // ── Multi-photo path (D-190) ───────────────────────────────────────────
    // Step 2a: Upload each photo as unpublished
    const photoIds: string[] = []
    for (const url of validUrls.slice(0, 10)) {
      const uploadParams = new URLSearchParams({
        url,
        published:    'false',
        access_token: pageAccessToken,
      })
      try {
        const uploadRes = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/photos?${uploadParams.toString()}`,
          { method: 'POST', signal: AbortSignal.timeout(20_000) },
        )
        const uploadData = await uploadRes.json() as Record<string, unknown>
        const photoId = uploadData.id as string | undefined
        if (photoId) {
          photoIds.push(photoId)
          console.log(`[channelDispatch] Facebook multi-photo: uploaded ${photoIds.length}/${validUrls.length} — photoId=${photoId}`)
        } else {
          console.warn(`[channelDispatch] Facebook multi-photo: upload failed for url=${url.slice(-40)}`, uploadData)
        }
      } catch (uploadErr) {
        console.warn(`[channelDispatch] Facebook multi-photo: upload threw for url=${url.slice(-40)}`, uploadErr instanceof Error ? uploadErr.message : uploadErr)
      }
    }

    if (photoIds.length === 0) {
      return {
        channel: 'facebook', eligible: true, dispatched: false,
        webhookConfigured: false,
        error: 'Facebook multi-photo: all uploads failed',
        timestamp,
      }
    }

    // Graceful degradation: if only 1 photo succeeded, publish it directly
    if (photoIds.length === 1) {
      console.log(`[channelDispatch] Facebook multi-photo: only 1 of ${validUrls.length} succeeded — falling back to single-photo publish`)
      const postParams = new URLSearchParams({
        url:          validUrls[0],
        message:      caption,
        access_token: pageAccessToken,
        published:    'true',
      })
      const postRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/photos?${postParams.toString()}`,
        { method: 'POST', signal: AbortSignal.timeout(20_000) },
      )
      const postData = await postRes.json() as Record<string, unknown>
      const postId = (postData.id ?? postData.post_id) as string | undefined
      return {
        channel: 'facebook', eligible: true, dispatched: !!postId,
        webhookConfigured: false,
        responseStatus: postId ? 200 : postRes.status,
        error: postId ? undefined : `Facebook single-photo fallback failed`,
        publishResult: {
          received: true, channel: 'facebook', mode: 'direct-fallback',
          success: !!postId, facebookPostId: postId, pageId, tokenMode,
          mediaUrl: validUrls[0], mediaCount: 1,
          caption: caption.substring(0, 80) + '…',
          timestamp: new Date().toISOString(),
        },
        timestamp,
      }
    }

    // Step 2b: Create feed post with attached_media referencing all uploaded photos
    const feedParams = new URLSearchParams({
      message:      caption,
      access_token: pageAccessToken,
    })
    photoIds.forEach((id, i) => {
      feedParams.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id }))
    })

    // Brief wait for Facebook to process the uploaded photos
    await new Promise((r) => setTimeout(r, 2000))

    const feedRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: feedParams.toString(),
        signal: AbortSignal.timeout(20_000),
      },
    )
    const feedData = await feedRes.json() as Record<string, unknown>

    const feedPostId = feedData.id as string | undefined
    if (!feedPostId) {
      console.error(`[channelDispatch] Facebook multi-photo feed post failed:`, feedData)
      return {
        channel: 'facebook', eligible: true, dispatched: false,
        webhookConfigured: false,
        error: `Facebook multi-photo feed post failed (HTTP ${feedRes.status})`,
        publishResult: {
          mode: 'api-error', success: false,
          tokenMode,
          uploadedPhotos: photoIds.length,
          apiError: JSON.stringify(feedData.error ?? feedData).slice(0, 500),
          timestamp: new Date().toISOString(),
        },
        timestamp,
      }
    }

    console.log(`[channelDispatch] Facebook multi-photo success — product=${payload.productId} postId=${feedPostId} photos=${photoIds.length} tokenMode=${tokenMode}`)
    return {
      channel: 'facebook', eligible: true, dispatched: true,
      webhookConfigured: false,
      responseStatus: 200,
      publishResult: {
        received: true, channel: 'facebook', mode: 'multi-photo',
        success: true, facebookPostId: feedPostId, pageId, tokenMode,
        mediaUrl: validUrls[0], mediaCount: photoIds.length,
        caption: caption.substring(0, 80) + '…',
        timestamp: new Date().toISOString(),
      },
      timestamp,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[channelDispatch] Facebook direct publish error:`, message)
    return {
      channel: 'facebook', eligible: true, dispatched: false,
      webhookConfigured: false,
      error: `Facebook publish threw: ${message}`,
      publishResult: { mode: 'api-error', success: false, thrownError: message, timestamp: new Date().toISOString() },
      timestamp,
    }
  }
}

/**
 * Publish an Instagram post directly via the Graph API — no n8n required.
 *
 * Steps:
 *  1. Create a media container (POST /{userId}/media)
 *  2. Wait 2 s for Instagram to process the image
 *  3. Publish the container  (POST /{userId}/media_publish)
 *
 * This is the preferred path when instagramTokens are available in the payload.
 * The n8n webhook is used as a fallback only when tokens are absent.
 */
/**
 * Create a single Instagram media container with retry logic.
 * Used both for single-image posts and as carousel item containers.
 */
async function createInstagramContainer(
  userId: string,
  accessToken: string,
  imageUrl: string,
  opts: { caption?: string; isCarouselItem?: boolean },
  productId: string | number,
): Promise<{ containerId?: string; error?: string }> {
  const maxAttempts = 2
  let lastError: string | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const params: Record<string, string> = {
      image_url: imageUrl,
      access_token: accessToken,
    }
    if (opts.caption) params.caption = opts.caption
    if (opts.isCarouselItem) params.is_carousel_item = 'true'

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${userId}/media?${new URLSearchParams(params).toString()}`,
      { method: 'POST', signal: AbortSignal.timeout(20_000) },
    )
    const data = await res.json() as Record<string, unknown>

    if (data.id) {
      console.log(
        `[channelDispatch] Instagram container created — product=${productId} ` +
          `containerId=${data.id} carousel=${!!opts.isCarouselItem} attempt=${attempt}`,
      )
      return { containerId: data.id as string }
    }

    lastError = JSON.stringify(data)
    const errCode = (data.error as Record<string, unknown> | undefined)?.code
    console.warn(
      `[channelDispatch] Instagram container attempt ${attempt}/${maxAttempts} failed — ` +
        `product=${productId} code=${errCode}`,
    )

    // Only retry on media-download errors (9004)
    if (errCode !== 9004 || attempt >= maxAttempts) break
    await new Promise((r) => setTimeout(r, 3000))
  }

  return { error: lastError }
}

/**
 * D-188: Publish to Instagram — supports single image AND carousel (2–10 images).
 *
 * Carousel flow (Meta Graph API):
 *   1. For each image → POST /{userId}/media with is_carousel_item=true (no caption)
 *   2. POST /{userId}/media with media_type=CAROUSEL, children=[id1,id2,...], caption
 *   3. POST /{userId}/media_publish with creation_id={carousel_container_id}
 *
 * Single image flow (1 image):
 *   1. POST /{userId}/media with image_url + caption
 *   2. POST /{userId}/media_publish with creation_id={container_id}
 */
async function publishInstagramDirectly(
  payload: ChannelDispatchPayload,
  userId: string,
  accessToken: string,
): Promise<ChannelDispatchResult> {
  const timestamp = new Date().toISOString()

  // Filter to only valid https:// URLs (Instagram requires publicly accessible HTTPS)
  const validUrls = payload.mediaUrls.filter((u) => u.startsWith('https://'))
  if (validUrls.length === 0) {
    return {
      channel: 'instagram', eligible: true, dispatched: false,
      webhookConfigured: false,
      error: 'No valid https:// image URL found in mediaUrls',
      timestamp,
    }
  }

  // Instagram carousel supports 2–10 items. Cap at 10.
  const imageUrls = validUrls.slice(0, 10)
  const isCarousel = imageUrls.length >= 2

  try {
    const caption = buildInstagramCaption(payload)

    // ── Pre-warm all media URLs to avoid Vercel cold-start timeout ────────────
    await Promise.all(imageUrls.map((url) => prewarmMediaUrl(url, 'instagram')))
    await new Promise((r) => setTimeout(r, 500))

    let publishContainerId: string

    if (isCarousel) {
      // ── CAROUSEL FLOW ─────────────────────────────────────────────────────
      console.log(
        `[channelDispatch] Instagram carousel — product=${payload.productId} images=${imageUrls.length}`,
      )

      // Step 1: Create individual carousel item containers (no caption on items)
      const childIds: string[] = []
      for (const url of imageUrls) {
        const { containerId, error } = await createInstagramContainer(
          userId, accessToken, url, { isCarouselItem: true }, payload.productId,
        )
        if (!containerId) {
          console.error(`[channelDispatch] Instagram carousel item failed — url=${url} error=${error}`)
          // Skip failed items but continue with others
          continue
        }
        childIds.push(containerId)
        // Small delay between container creations to avoid rate limiting
        await new Promise((r) => setTimeout(r, 300))
      }

      if (childIds.length < 2) {
        // Not enough items for carousel — fall back to single image if we have 1
        if (childIds.length === 0) {
          return {
            channel: 'instagram', eligible: true, dispatched: false,
            webhookConfigured: false,
            error: `Carousel failed — 0 of ${imageUrls.length} containers created`,
            timestamp,
          }
        }
        // Only 1 succeeded — re-create as single image (carousel items can't be published solo)
        console.log(`[channelDispatch] Instagram carousel degraded to single image — product=${payload.productId}`)
        const single = await createInstagramContainer(
          userId, accessToken, imageUrls[0], { caption }, payload.productId,
        )
        if (!single.containerId) {
          return {
            channel: 'instagram', eligible: true, dispatched: false,
            webhookConfigured: false,
            error: `Single image fallback also failed: ${single.error}`,
            timestamp,
          }
        }
        publishContainerId = single.containerId
      } else {
        // Step 2: Create carousel container
        const carouselParams = new URLSearchParams({
          media_type: 'CAROUSEL',
          children: childIds.join(','),
          caption,
          access_token: accessToken,
        })
        const carouselRes = await fetch(
          `https://graph.facebook.com/v21.0/${userId}/media?${carouselParams.toString()}`,
          { method: 'POST', signal: AbortSignal.timeout(20_000) },
        )
        const carouselData = await carouselRes.json() as Record<string, unknown>

        if (!carouselData.id) {
          console.error(`[channelDispatch] Instagram carousel container failed:`, carouselData)
          return {
            channel: 'instagram', eligible: true, dispatched: false,
            webhookConfigured: false,
            error: `Carousel container creation failed`,
            publishResult: {
              step: 'create-carousel', mode: 'direct-api-error', success: false,
              childIds, apiError: JSON.stringify(carouselData),
              timestamp: new Date().toISOString(),
            },
            timestamp,
          }
        }
        publishContainerId = carouselData.id as string
        console.log(
          `[channelDispatch] Instagram carousel container created — product=${payload.productId} ` +
            `carouselId=${publishContainerId} children=${childIds.length}`,
        )
      }
    } else {
      // ── SINGLE IMAGE FLOW ─────────────────────────────────────────────────
      const { containerId, error } = await createInstagramContainer(
        userId, accessToken, imageUrls[0], { caption }, payload.productId,
      )
      if (!containerId) {
        return {
          channel: 'instagram', eligible: true, dispatched: false,
          webhookConfigured: false,
          error: `Container creation failed: ${error}`,
          publishResult: {
            step: 'create-container', mode: 'direct-api-error', success: false,
            apiError: error, timestamp: new Date().toISOString(),
          },
          timestamp,
        }
      }
      publishContainerId = containerId
    }

    // ── Wait for media processing ─────────────────────────────────────────────
    await new Promise((r) => setTimeout(r, isCarousel ? 5000 : 2000))

    // ── Publish ────────────────────────────────────────────────────────────────
    const publishParams = new URLSearchParams({ creation_id: publishContainerId, access_token: accessToken })
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${userId}/media_publish?${publishParams.toString()}`,
      { method: 'POST', signal: AbortSignal.timeout(20_000) },
    )
    const publishData = await publishRes.json() as Record<string, unknown>
    const postId = publishData.id as string | undefined

    if (!postId) {
      console.error(`[channelDispatch] Instagram publish failed:`, publishData)
      return {
        channel: 'instagram', eligible: true, dispatched: false,
        webhookConfigured: false,
        error: `Publish failed (HTTP ${publishRes.status})`,
        publishResult: {
          step: 'publish', mode: 'direct-api-error', success: false,
          containerId: publishContainerId, apiError: JSON.stringify(publishData),
          timestamp: new Date().toISOString(),
        },
        timestamp,
      }
    }

    console.log(
      `[channelDispatch] Instagram direct publish success — product=${payload.productId} ` +
        `postId=${postId} mode=${isCarousel ? 'carousel' : 'single'} images=${imageUrls.length}`,
    )
    return {
      channel: 'instagram', eligible: true, dispatched: true,
      webhookConfigured: false,
      responseStatus: 200,
      publishResult: {
        received: true, channel: 'instagram',
        mode: isCarousel ? 'carousel' : 'direct',
        success: true, instagramPostId: postId, containerId: publishContainerId,
        mediaUrl: imageUrls[0], mediaCount: imageUrls.length,
        caption: caption.substring(0, 80) + '…',
        timestamp: new Date().toISOString(),
      },
      timestamp,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[channelDispatch] Instagram direct publish error:`, message)
    return {
      channel: 'instagram', eligible: true, dispatched: false,
      webhookConfigured: false, error: `Direct publish error: ${message}`, timestamp,
    }
  }
}

// ── Shopier Direct Publish ───────────────────────────────────────────────────

/**
 * Publish a product to Shopier directly via the Shopier REST API — no n8n required.
 *
 * Uses src/lib/shopierSync.ts to:
 *  1. Build the Shopier product body from the Payload product
 *  2. Create or update the product in Shopier
 *  3. Return the Shopier product ID + URL
 *
 * Note: This function does NOT write back to Payload (the caller/hook handles that).
 * It only calls the Shopier API and returns the result as a ChannelDispatchResult.
 */
async function publishShopierDirectly(
  payload: ChannelDispatchPayload,
  product: Record<string, unknown>,
): Promise<ChannelDispatchResult> {
  const timestamp = new Date().toISOString()

  try {
    // Dynamic import to avoid circular dependency at module load time
    const { publishProductToShopier } = await import('./shopierSync')

    const result = await publishProductToShopier(product)

    if (!result.success) {
      console.error(`[channelDispatch] Shopier publish failed for product=${payload.productId}: ${result.error}`)
      return {
        channel: 'shopier',
        eligible: true,
        dispatched: false,
        webhookConfigured: false,
        error: result.error ?? 'Shopier sync failed',
        publishResult: {
          mode: 'direct',
          success: false,
          error: result.error,
          details: result.details,
          timestamp: new Date().toISOString(),
        },
        timestamp,
      }
    }

    console.log(
      `[channelDispatch] Shopier direct publish success — product=${payload.productId} ` +
        `shopierProductId=${result.shopierProductId} url=${result.shopierProductUrl}`,
    )

    return {
      channel: 'shopier',
      eligible: true,
      dispatched: true,
      webhookConfigured: false,
      responseStatus: 200,
      publishResult: {
        received: true,
        channel: 'shopier',
        mode: 'direct',
        success: true,
        shopierProductId: result.shopierProductId,
        shopierProductUrl: result.shopierProductUrl,
        timestamp: new Date().toISOString(),
      },
      timestamp,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[channelDispatch] Shopier direct publish error:`, message)
    return {
      channel: 'shopier',
      eligible: true,
      dispatched: false,
      webhookConfigured: false,
      error: `Shopier publish threw: ${message}`,
      publishResult: {
        mode: 'direct',
        success: false,
        thrownError: message,
        timestamp: new Date().toISOString(),
      },
      timestamp,
    }
  }
}

// ── Core Functions ────────────────────────────────────────────────────────────

/**
 * Determine which channels are eligible for dispatch given the product document
 * and the current AutomationSettings snapshot.
 *
 * Eligibility requires ALL three gates to pass:
 *  1. Product intent: channelTargets must include the channel
 *  2. Product channel flag: channels.publishInstagram/Shopier/Dolap must be true (or unset)
 *  3. Global capability: AutomationSettings.channelPublishing.publishX must be true (or unset)
 *
 * Website is always skipped here — it is served natively via active status.
 */
export function evaluateChannelEligibility(
  product: Record<string, unknown>,
  settings: AutomationSettingsSnapshot | null,
): {
  eligible: SupportedChannel[]
  skipped: Record<SupportedChannel, string>
} {
  // D-187: When channelTargets is empty/undefined, treat as "all channels" —
  // let the global capability gate (Gate 3) decide which are actually enabled.
  // Old default was [] which silently blocked ALL dispatch.
  const rawTargets = (product.channelTargets as string[] | undefined)
  const channelTargets = (rawTargets && rawTargets.length > 0) ? rawTargets : [...SUPPORTED_CHANNELS]
  const channels = product.channels as Record<string, boolean | undefined> | undefined

  const skipped = {} as Record<SupportedChannel, string>
  const eligible: SupportedChannel[] = []

  for (const ch of SUPPORTED_CHANNELS) {
    // Gate 1 — product intent: channelTargets must declare this channel
    if (!channelTargets.includes(ch)) {
      skipped[ch] = `not in channelTargets (product declared: [${channelTargets.join(', ')}])`
      continue
    }

    // Gate 2 — product channel flag: channels.publishX must not be explicitly false
    // D-187: Skip this gate if channels object is undefined (no explicit flags set)
    const channelFlagKey =
      `publish${ch.charAt(0).toUpperCase()}${ch.slice(1)}` as keyof typeof channels
    if (channels && channels[channelFlagKey] === false) {
      skipped[ch] = `channels.${String(channelFlagKey)} is explicitly false`
      continue
    }

    // Gate 3 — global capability: AutomationSettings.channelPublishing.publishX
    if (settings?.channelPublishing) {
      const globalKey =
        `publish${ch.charAt(0).toUpperCase()}${ch.slice(1)}` as keyof typeof settings.channelPublishing
      if (settings.channelPublishing[globalKey] === false) {
        skipped[ch] = `AutomationSettings.channelPublishing.${String(globalKey)} globally disabled`
        continue
      }
    }

    eligible.push(ch)
  }

  return { eligible, skipped }
}

/**
 * Build the structured ChannelDispatchPayload for a given channel.
 * This is the adapter contract — n8n workflows will receive this exact shape.
 *
 * @param instagramTokens — Optional Instagram credentials from AutomationSettings.
 *   Injected by Products.ts when dispatching to the instagram channel.
 *   This replaces the n8n Variables approach (locked on current plan).
 */
export function buildDispatchPayload(
  product: Record<string, unknown>,
  channel: SupportedChannel,
  triggerReason: string,
  instagramTokens?: { accessToken?: string | null; userId?: string | null },
): ChannelDispatchPayload {
  const automationMeta = product.automationMeta as Record<string, unknown> | undefined

  const payload: ChannelDispatchPayload = {
    channel,
    productId: product.id as string | number,
    sku:           product.sku           as string | undefined,
    title:         product.title         as string,
    price:         product.price         as number,
    originalPrice: product.originalPrice as number | undefined,
    brand:         product.brand         as string | undefined,
    category:      product.category      as string | undefined,
    productFamily: product.productFamily as string | undefined,
    productType:   product.productType   as string | undefined,
    color:         product.color         as string | undefined,
    description:   product.description   as string | undefined,
    mediaUrls:    extractMediaUrls(product),
    channelTargets: (product.channelTargets as string[] | undefined) ?? ['website'],
    triggerReason,
    dispatchTimestamp: new Date().toISOString(),
    meta: {
      parseConfidence:    automationMeta?.parseConfidence    as number | undefined,
      autoDecision:       automationMeta?.autoDecision       as string | undefined,
      telegramMessageId:  automationMeta?.telegramMessageId  as string | undefined,
      source:             product.source                      as string | undefined,
    },
  }

  // ── Phase D: Inject Geobot commerce pack into dispatch payload ──────────
  const contentGroup = product.content as Record<string, unknown> | undefined
  const commercePack = contentGroup?.commercePack as Record<string, unknown> | undefined
  if (commercePack) {
    payload.geobot = {
      websiteDescription: commercePack.websiteDescription as string | undefined,
      instagramCaption:   commercePack.instagramCaption   as string | undefined,
      xPost:              commercePack.xPost              as string | undefined,
      facebookCopy:       commercePack.facebookCopy       as string | undefined,
      shopierCopy:        commercePack.shopierCopy         as string | undefined,
      highlights:         commercePack.highlights          as string[] | undefined,
    }
  }

  // Inject Instagram credentials into webhook body for the instagram channel.
  // n8n workflow reads $json.instagramAccessToken / $json.instagramUserId
  // instead of $vars.* (n8n Variables are locked on current plan).
  if (channel === 'instagram' && instagramTokens) {
    if (instagramTokens.accessToken) payload.instagramAccessToken = instagramTokens.accessToken
    if (instagramTokens.userId)      payload.instagramUserId      = instagramTokens.userId
  }

  return payload
}

/**
 * Send a dispatch payload to a single channel's n8n webhook.
 *
 * Scaffold mode (no webhook URL):
 *   - Logs full payload intent at INFO level
 *   - Returns result with dispatched=false, webhookConfigured=false
 *   - Does NOT throw
 *
 * Live mode (webhook URL configured):
 *   - POSTs payload as JSON with 10s timeout
 *   - Returns result with HTTP status
 *   - On non-2xx: dispatched=false, error contains status code
 *   - On network error: dispatched=false, error contains message
 */
export async function dispatchToChannel(
  payload: ChannelDispatchPayload,
  webhookUrl: string | undefined,
): Promise<ChannelDispatchResult> {
  const timestamp = new Date().toISOString()

  if (!webhookUrl) {
    // ── Scaffold mode — webhook not yet configured ──────────────────────────
    const logPayload = {
      ...payload,
      mediaUrls: `[${payload.mediaUrls.length} url(s)]`, // avoid log spam
    }
    console.log(
      `[channelDispatch] SCAFFOLD — channel=${payload.channel} product=${payload.productId} ` +
        `title="${payload.title}" price=${payload.price} media=${payload.mediaUrls.length} ` +
        `— configure ${`N8N_CHANNEL_${payload.channel.toUpperCase()}_WEBHOOK`} to enable real dispatch` +
        `\n  payload: ${JSON.stringify(logPayload)}`,
    )
    return {
      channel:          payload.channel,
      eligible:         true,
      dispatched:       false,
      skippedReason:    `N8N_CHANNEL_${payload.channel.toUpperCase()}_WEBHOOK env var not configured (scaffold mode)`,
      webhookConfigured: false,
      timestamp,
    }
  }

  // ── Live mode — POST to n8n webhook ────────────────────────────────────────
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    })

    const ok = response.ok

    // Step 16: Try to parse the response body as JSON to capture channel-specific
    // publish results (e.g. Instagram post ID from the real publish workflow).
    // Non-critical — if body is empty or not JSON, we silently skip.
    let publishResult: Record<string, unknown> | undefined
    try {
      const text = await response.text()
      if (text && text.trim().startsWith('{')) {
        publishResult = JSON.parse(text) as Record<string, unknown>
      }
    } catch {
      /* Non-critical — body may not be JSON (stub, plain-text errors, etc.) */
    }

    console.log(
      `[channelDispatch] dispatched — channel=${payload.channel} ` +
        `product=${payload.productId} httpStatus=${response.status} ok=${ok}` +
        (publishResult?.instagramPostId ? ` instagramPostId=${publishResult.instagramPostId}` : '') +
        (publishResult?.mode ? ` mode=${publishResult.mode}` : ''),
    )

    return {
      channel:           payload.channel,
      eligible:          true,
      dispatched:        ok,
      webhookConfigured: true,
      responseStatus:    response.status,
      ...(ok ? {} : { error: `Webhook responded with HTTP ${response.status}` }),
      ...(publishResult !== undefined ? { publishResult } : {}),
      timestamp,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `[channelDispatch] dispatch error — channel=${payload.channel} product=${payload.productId}: ${message}`,
    )
    return {
      channel:           payload.channel,
      eligible:          true,
      dispatched:        false,
      webhookConfigured: true,
      error:             message,
      timestamp,
    }
  }
}

// ── Phase G: Preview caption resolver ────────────────────────────────────────
// Uses the SAME content-selection logic as real publish paths.
// Returns the exact caption that would be sent, plus source attribution.

function resolvePreviewCaption(
  payload: ChannelDispatchPayload,
  channel: SupportedChannel,
  instagramTokens?: { accessToken?: string | null; userId?: string | null; facebookPageId?: string | null },
): { caption: string; source: string; geobotField?: string } {
  if (channel === 'instagram') {
    if (payload.geobot?.instagramCaption) {
      return { caption: payload.geobot.instagramCaption.substring(0, 2200), source: 'geobot', geobotField: 'instagramCaption' }
    }
    return { caption: buildInstagramCaption(payload), source: 'template-fallback' }
  }

  if (channel === 'facebook') {
    if (payload.geobot?.facebookCopy) {
      return { caption: payload.geobot.facebookCopy.substring(0, 2200), source: 'geobot', geobotField: 'facebookCopy' }
    }
    return { caption: buildInstagramCaption(payload), source: 'template-fallback' }
  }

  if (channel === 'shopier') {
    const cp = payload.geobot
    if (cp?.shopierCopy) {
      return { caption: cp.shopierCopy, source: 'geobot', geobotField: 'shopierCopy' }
    }
    return { caption: payload.description ?? payload.title, source: 'description-fallback' }
  }

  if (channel === 'x' || channel === 'threads') {
    if (payload.geobot?.xPost) {
      return { caption: payload.geobot.xPost, source: 'geobot', geobotField: 'xPost' }
    }
    return { caption: payload.title, source: 'title-fallback' }
  }



  // Dolap / generic
  if (payload.geobot?.shopierCopy) {
    return { caption: payload.geobot.shopierCopy, source: 'geobot', geobotField: 'shopierCopy' }
  }
  return { caption: payload.description ?? payload.title, source: 'description-fallback' }
}

/**
 * Orchestrator: evaluate eligibility + dispatch all eligible channels for a product.
 *
 * Called by the Products.ts afterChange hook on status → active transitions.
 *
 * Returns:
 *  - results:           full per-channel result array (eligible + skipped)
 *  - dispatchedChannels: channels where dispatched=true
 *  - skippedChannels:   channels and their skip reason
 */
export async function dispatchProductToChannels(
  product: Record<string, unknown>,
  settings: AutomationSettingsSnapshot | null,
  triggerReason: string,
  options?: { dryRun?: boolean },
): Promise<{
  results: ChannelDispatchResult[]
  dispatchedChannels: SupportedChannel[]
  skippedChannels: Record<SupportedChannel, string>
}> {
  const dryRun = options?.dryRun === true
  const { eligible, skipped } = evaluateChannelEligibility(product, settings)

  // Extract Instagram/Facebook tokens from settings snapshot.
  // The same Meta long-lived user token covers both Instagram and Facebook.
  // facebookPageId is set manually in AutomationSettings admin.
  const instagramTokens = settings?.instagramTokens
    ? {
        accessToken:    settings.instagramTokens.accessToken    ?? null,
        userId:         settings.instagramTokens.userId         ?? null,
        facebookPageId: settings.instagramTokens.facebookPageId ?? null,
      }
    : undefined

  const results: ChannelDispatchResult[] = []

  // Record skipped channels
  for (const [ch, reason] of Object.entries(skipped) as [SupportedChannel, string][]) {
    results.push({
      channel:           ch,
      eligible:          false,
      dispatched:        false,
      skippedReason:     reason,
      webhookConfigured: !!buildChannelWebhookUrl(ch),
      timestamp:         new Date().toISOString(),
    })
  }

  // Dispatch eligible channels
  const dispatchedChannels: SupportedChannel[] = []
  for (const channel of eligible) {
    const dispatchPayload = buildDispatchPayload(product, channel, triggerReason, instagramTokens)

    // ── Phase G: Dry-run mode — resolve captions, skip all external API calls ──
    if (dryRun) {
      const previewCaption = resolvePreviewCaption(dispatchPayload, channel, instagramTokens)
      results.push({
        channel,
        eligible:          true,
        dispatched:        false,
        skippedReason:     'dry-run-preview',
        webhookConfigured: false,
        publishResult: {
          mode:        'preview',
          caption:     previewCaption.caption,
          source:      previewCaption.source,
          mediaUrl:    dispatchPayload.mediaUrls[0] ?? null,
          mediaCount:  dispatchPayload.mediaUrls.length,
          geobotField: previewCaption.geobotField ?? null,
          productId:   dispatchPayload.productId,
          title:       dispatchPayload.title,
        },
        timestamp: new Date().toISOString(),
      })
      continue
    }

    // Instagram: direct Graph API publish (bypasses n8n — D-088).
    // Facebook:  direct Graph API photo post (same Meta user token — D-089).
    // All other channels: fall through to n8n webhook.
    let result: ChannelDispatchResult
    if (
      channel === 'instagram' &&
      instagramTokens?.accessToken &&
      instagramTokens?.userId &&
      dispatchPayload.mediaUrls.length > 0 &&
      dispatchPayload.mediaUrls[0].startsWith('https://')
    ) {
      result = await publishInstagramDirectly(
        dispatchPayload,
        instagramTokens.userId,
        instagramTokens.accessToken,
      )
    } else if (
      channel === 'facebook' &&
      instagramTokens?.accessToken &&
      instagramTokens?.facebookPageId &&
      dispatchPayload.mediaUrls.length > 0 &&
      dispatchPayload.mediaUrls[0].startsWith('https://')
    ) {
      result = await publishFacebookDirectly(
        dispatchPayload,
        instagramTokens.facebookPageId,
        instagramTokens.accessToken,
      )
    } else if (
      channel === 'shopier' &&
      process.env.SHOPIER_PAT
    ) {
      // Shopier sync is handled non-blocking via the Payload Jobs Queue (Step 20).
      // Products.ts afterChange hook calls req.payload.jobs.queue() after this
      // function returns. publishShopierDirectly() is no longer called here.
      // The job transitions status: queued → syncing → synced | error.
      result = {
        channel: 'shopier',
        eligible: true,
        dispatched: false,
        skippedReason: 'queued-via-jobs-queue',
        webhookConfigured: false,
        timestamp: new Date().toISOString(),
      }
    } else {
      const webhookUrl = buildChannelWebhookUrl(channel)
      result           = await dispatchToChannel(dispatchPayload, webhookUrl)
    }

    results.push(result)
    if (result.dispatched) {
      dispatchedChannels.push(channel)
    }
  }

  console.log(
    `[channelDispatch] summary — product=${product.id as string} ` +
      `eligible=[${eligible.join(',')}] ` +
      `dispatched=[${dispatchedChannels.join(',')}] ` +
      `skipped=[${Object.keys(skipped).join(',')}]`,
  )

  return { results, dispatchedChannels, skippedChannels: skipped }
}
