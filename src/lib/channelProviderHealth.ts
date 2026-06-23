import type { AutomationSettingsSnapshot } from './automationDecision'
import type { SupportedChannel } from './channelDispatch'

export type ProviderHealthState = 'ready' | 'fallback' | 'disabled' | 'missing'

export type ChannelProviderHealth = {
  channel: 'website' | SupportedChannel
  state: ProviderHealthState
  mode: 'native' | 'direct' | 'webhook' | 'none'
  missing: string[]
  notes: string[]
}

type EnvLike = Record<string, string | undefined>

const EXTERNAL_CHANNELS: SupportedChannel[] = ['instagram', 'facebook', 'x', 'shopier']

function hasValue(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function envHas(env: EnvLike, key: string): boolean {
  return hasValue(env[key])
}

function isGloballyDisabled(settings: AutomationSettingsSnapshot | null | undefined, channel: SupportedChannel): boolean {
  const cp = settings?.channelPublishing
  if (!cp) return false

  const keyByChannel: Record<SupportedChannel, keyof NonNullable<AutomationSettingsSnapshot['channelPublishing']>> = {
    instagram: 'publishInstagram',
    shopier: 'publishShopier',
    x: 'publishX',
    facebook: 'publishFacebook',
  }

  return cp[keyByChannel[channel]] === false
}

function channelWebhookKey(channel: SupportedChannel): string {
  return `N8N_CHANNEL_${channel.toUpperCase()}_WEBHOOK`
}

function evaluateExternalChannelProvider(
  channel: SupportedChannel,
  settings: AutomationSettingsSnapshot | null | undefined,
  env: EnvLike,
): ChannelProviderHealth {
  if (isGloballyDisabled(settings, channel)) {
    return {
      channel,
      state: 'disabled',
      mode: 'none',
      missing: [],
      notes: ['Disabled in AutomationSettings.channelPublishing'],
    }
  }

  const webhookKey = channelWebhookKey(channel)
  const hasWebhook = envHas(env, webhookKey)
  const instagramTokens = settings?.instagramTokens

  if (channel === 'instagram') {
    const directMissing = [
      !hasValue(instagramTokens?.accessToken) ? 'AutomationSettings.instagramTokens.accessToken' : null,
      !hasValue(instagramTokens?.userId) ? 'AutomationSettings.instagramTokens.userId' : null,
    ].filter((entry): entry is string => !!entry)

    if (directMissing.length === 0) {
      return { channel, state: 'ready', mode: 'direct', missing: [], notes: ['Meta direct publish credentials present'] }
    }

    if (hasWebhook) {
      return { channel, state: 'fallback', mode: 'webhook', missing: directMissing, notes: [`Fallback webhook configured: ${webhookKey}`] }
    }

    return { channel, state: 'missing', mode: 'none', missing: [...directMissing, webhookKey], notes: [] }
  }

  if (channel === 'facebook') {
    const directMissing = [
      !hasValue(instagramTokens?.accessToken) ? 'AutomationSettings.instagramTokens.accessToken' : null,
      !hasValue(instagramTokens?.facebookPageId) ? 'AutomationSettings.instagramTokens.facebookPageId' : null,
    ].filter((entry): entry is string => !!entry)

    if (directMissing.length === 0) {
      return { channel, state: 'ready', mode: 'direct', missing: [], notes: ['Meta Page direct publish credentials present'] }
    }

    if (hasWebhook) {
      return { channel, state: 'fallback', mode: 'webhook', missing: directMissing, notes: [`Fallback webhook configured: ${webhookKey}`] }
    }

    return { channel, state: 'missing', mode: 'none', missing: [...directMissing, webhookKey], notes: [] }
  }

  if (channel === 'x') {
    const directMissing = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'].filter((key) => !envHas(env, key))

    if (directMissing.length === 0) {
      return { channel, state: 'ready', mode: 'direct', missing: [], notes: ['X OAuth 1.0a credentials present'] }
    }

    if (hasWebhook) {
      return { channel, state: 'fallback', mode: 'webhook', missing: directMissing, notes: [`Fallback webhook configured: ${webhookKey}`] }
    }

    return { channel, state: 'missing', mode: 'none', missing: [...directMissing, webhookKey], notes: [] }
  }

  const shopierMissing = !envHas(env, 'SHOPIER_PAT') ? ['SHOPIER_PAT'] : []
  if (shopierMissing.length === 0) {
    return { channel, state: 'ready', mode: 'direct', missing: [], notes: ['Shopier job queue token present'] }
  }

  if (hasWebhook) {
    return { channel, state: 'fallback', mode: 'webhook', missing: shopierMissing, notes: [`Fallback webhook configured: ${webhookKey}`] }
  }

  return { channel, state: 'missing', mode: 'none', missing: [...shopierMissing, webhookKey], notes: [] }
}

export function evaluateChannelProviderHealth(
  settings: AutomationSettingsSnapshot | null | undefined,
  env: EnvLike = process.env,
): ChannelProviderHealth[] {
  return [
    {
      channel: 'website',
      state: 'ready',
      mode: 'native',
      missing: [],
      notes: ['Website is native; active products appear through the storefront'],
    },
    ...EXTERNAL_CHANNELS.map((channel) => evaluateExternalChannelProvider(channel, settings, env)),
  ]
}

export function formatChannelProviderHealthLine(health: ChannelProviderHealth): string {
  const icon = health.state === 'ready'
    ? 'ok'
    : health.state === 'fallback'
      ? 'fallback'
      : health.state === 'disabled'
        ? 'disabled'
        : 'missing'

  const missing = health.missing.length > 0 ? `; missing: ${health.missing.join(', ')}` : ''
  const notes = health.notes.length > 0 ? `; ${health.notes.join('; ')}` : ''

  return `${icon} ${health.channel}: ${health.state}/${health.mode}${missing}${notes}`
}
