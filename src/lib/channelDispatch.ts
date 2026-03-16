/**
 * channelDispatch.ts — Step 13: Channel Adapter Scaffolding
 *
 * Pure dispatch layer for Instagram / Shopier / Dolap channel adapters.
 * This module is a SCAFFOLD — no real external API calls to third-party platforms.
 * Instead, it fires n8n webhooks (via N8N_CHANNEL_*_WEBHOOK env vars) that will
 * contain the full product payload for future n8n workflow integration.
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

export type SupportedChannel = 'instagram' | 'shopier' | 'dolap'

/** All non-website channels that require external dispatch */
export const SUPPORTED_CHANNELS: SupportedChannel[] = ['instagram', 'shopier', 'dolap']

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
  /** Automation pipeline metadata for traceability */
  meta: {
    parseConfidence?: number
    autoDecision?: string
    telegramMessageId?: string
    source?: string
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
  const images = product.images as
    | Array<{ image?: { url?: string; filename?: string } }>
    | undefined

  if (!Array.isArray(images) || images.length === 0) return []

  // Normalize base URL: strip trailing slash so /media/ join is clean
  const serverUrl = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace(/\/$/, '')

  return images
    .map((img) => {
      const media = img?.image
      if (!media) return null
      // Vercel Blob URL — already absolute and publicly accessible
      if (media.url) return media.url
      // Local dev path — make absolute so VPS-side workers can fetch it
      if (media.filename) {
        const relativePath = `/media/${media.filename}`
        return serverUrl ? `${serverUrl}${relativePath}` : relativePath
      }
      return null
    })
    .filter((url): url is string => url !== null)
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
 */
export function buildDispatchPayload(
  product: Record<string, unknown>,
  channel: SupportedChannel,
  triggerReason: string,
): ChannelDispatchPayload {
  const automationMeta = product.automationMeta as Record<string, unknown> | undefined

  return {
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
    console.log(
      `[channelDispatch] dispatched — channel=${payload.channel} ` +
        `product=${payload.productId} httpStatus=${response.status} ok=${ok}`,
    )

    return {
      channel:          payload.channel,
      eligible:         true,
      dispatched:       ok,
      webhookConfigured: true,
      responseStatus:   response.status,
      ...(ok ? {} : { error: `Webhook responded with HTTP ${response.status}` }),
      timestamp,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `[channelDispatch] dispatch error — channel=${payload.channel} product=${payload.productId}: ${message}`,
    )
    return {
      channel:          payload.channel,
      eligible:         true,
      dispatched:       false,
      webhookConfigured: true,
      error:            message,
      timestamp,
    }
  }
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
): Promise<{
  results: ChannelDispatchResult[]
  dispatchedChannels: SupportedChannel[]
  skippedChannels: Record<SupportedChannel, string>
}> {
  const { eligible, skipped } = evaluateChannelEligibility(product, settings)

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
    const webhookUrl    = buildChannelWebhookUrl(channel)
    const dispatchPayload = buildDispatchPayload(product, channel, triggerReason)
    const result        = await dispatchToChannel(dispatchPayload, webhookUrl)
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
