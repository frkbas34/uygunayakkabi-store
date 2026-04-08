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
  | 'linkedin'
  | 'threads'

/** All non-website channels that require external dispatch */
export const SUPPORTED_CHANNELS: SupportedChannel[] = [
  'instagram',
  'shopier',
  'dolap',
  'x',
  'facebook',
  'linkedin',
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
    linkedin:  process.env.N8N_CHANNEL_LINKEDIN_WEBHOOK,
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
  const imageUrl  = payload.mediaUrls[0]

  if (!imageUrl || !imageUrl.startsWith('https://')) {
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
        // New Pages Experience (NPE) — these pages don't expose access_token via
        // GET /{page-id}?fields=access_token.  For NPE pages the user access token
        // with pages_manage_posts scope is the correct credential to use directly.
        console.log(
          `[channelDispatch] Facebook: step 1 → NPE page detected (err 100/33). ` +
          `Falling back to user token with pages_manage_posts for page=${pageId}`,
        )
        pageAccessToken = userAccessToken
        tokenMode = 'user-token-npe'
      } else {
        // Some other step 1 failure — surface it for diagnosis
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

    // ── Step 2: Post photo to page feed ───────────────────────────────────────
    const postParams = new URLSearchParams({
      url:          imageUrl,
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

    console.log(`[channelDispatch] Facebook direct publish success — product=${payload.productId} postId=${postId} tokenMode=${tokenMode}`)
    return {
      channel: 'facebook', eligible: true, dispatched: true,
      webhookConfigured: false,
      responseStatus: 200,
      publishResult: {
        received: true, channel: 'facebook', mode: 'direct',
        success: true, facebookPostId: postId, pageId, tokenMode,
        mediaUrl: imageUrl, caption: caption.substring(0, 80) + '…',
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
async function publishInstagramDirectly(
  payload: ChannelDispatchPayload,
  userId: string,
  accessToken: string,
): Promise<ChannelDispatchResult> {
  const timestamp = new Date().toISOString()
  const imageUrl = payload.mediaUrls[0]

  if (!imageUrl || !imageUrl.startsWith('https://')) {
    return {
      channel: 'instagram', eligible: true, dispatched: false,
      webhookConfigured: false,
      error: 'No valid https:// image URL found in mediaUrls',
      timestamp,
    }
  }

  try {
    const caption = buildInstagramCaption(payload)

    // ── Step 1: Create media container ────────────────────────────────────────
    const createParams = new URLSearchParams({ image_url: imageUrl, caption, access_token: accessToken })
    const createRes  = await fetch(
      `https://graph.facebook.com/v21.0/${userId}/media?${createParams.toString()}`,
      { method: 'POST', signal: AbortSignal.timeout(20_000) },
    )
    const createData = await createRes.json() as Record<string, unknown>

    if (!createData.id) {
      console.error(`[channelDispatch] Instagram container creation failed:`, createData)
      return {
        channel: 'instagram', eligible: true, dispatched: false,
        webhookConfigured: false,
        error: `Container creation failed (HTTP ${createRes.status})`,
        publishResult: { step: 'create-container', mode: 'direct-api-error', success: false, apiError: JSON.stringify(createData), timestamp: new Date().toISOString() },
        timestamp,
      }
    }

    const containerId = createData.id as string
    console.log(`[channelDispatch] Instagram container created — product=${payload.productId} containerId=${containerId}`)

    // ── Step 2: Wait for media processing ─────────────────────────────────────
    await new Promise((r) => setTimeout(r, 2000))

    // ── Step 3: Publish ────────────────────────────────────────────────────────
    const publishParams = new URLSearchParams({ creation_id: containerId, access_token: accessToken })
    const publishRes  = await fetch(
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
        publishResult: { step: 'publish', mode: 'direct-api-error', success: false, containerId, apiError: JSON.stringify(publishData), timestamp: new Date().toISOString() },
        timestamp,
      }
    }

    console.log(`[channelDispatch] Instagram direct publish success — product=${payload.productId} postId=${postId}`)
    return {
      channel: 'instagram', eligible: true, dispatched: true,
      webhookConfigured: false,
      responseStatus: 200,
      publishResult: {
        received: true, channel: 'instagram', mode: 'direct',
        success: true, instagramPostId: postId, containerId,
        mediaUrl: imageUrl, caption: caption.substring(0, 80) + '…',
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
  const channelTargets = (product.channelTargets as string[] | undefined) ?? []
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

  if (channel === 'linkedin') {
    if (payload.geobot?.websiteDescription) {
      return { caption: payload.geobot.websiteDescription, source: 'geobot', geobotField: 'websiteDescription' }
    }
    return { caption: payload.description ?? payload.title, source: 'description-fallback' }
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
