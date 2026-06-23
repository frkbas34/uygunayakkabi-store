export const ACTIVE_PRODUCT_CHANNELS = ['website', 'instagram', 'shopier', 'x', 'facebook'] as const
export type ActiveProductChannel = (typeof ACTIVE_PRODUCT_CHANNELS)[number]

export const CHANNEL_FLAG_BY_TARGET: Record<ActiveProductChannel, string> = {
  website: 'publishWebsite',
  instagram: 'publishInstagram',
  shopier: 'publishShopier',
  x: 'publishX',
  facebook: 'publishFacebook',
}

export type ProductChannelDocument = Record<string, any>

export type ProductChannelSelectionIssue =
  | {
      kind: 'unsupported_target'
      channel: string
      detail: string
    }
  | {
      kind: 'target_without_flag'
      channel: ActiveProductChannel
      flag: string
      detail: string
    }
  | {
      kind: 'flag_without_target'
      channel: ActiveProductChannel
      flag: string
      detail: string
    }

function isObject(value: unknown): value is ProductChannelDocument {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isActiveProductChannel(value: unknown): value is ActiveProductChannel {
  return typeof value === 'string' && ACTIVE_PRODUCT_CHANNELS.includes(value as ActiveProductChannel)
}

export function resolveConfiguredTargets(product: ProductChannelDocument): ActiveProductChannel[] {
  const found = new Set<ActiveProductChannel>()
  const targets = Array.isArray(product.channelTargets) ? product.channelTargets : []

  for (const target of targets) {
    if (isActiveProductChannel(target)) found.add(target)
  }

  const channels = isObject(product.channels) ? product.channels : {}

  for (const [channel, flag] of Object.entries(CHANNEL_FLAG_BY_TARGET) as Array<[ActiveProductChannel, string]>) {
    if (channels[flag] === true) found.add(channel)
  }

  return [...found]
}

export function normalizeProductChannelSelection(
  product: ProductChannelDocument,
): {
  channelTargets: ActiveProductChannel[]
  channels: Record<string, unknown>
} {
  const hasExplicitTargets = Array.isArray(product.channelTargets)
  const hasExplicitChannels = isObject(product.channels)
  const targets = resolveConfiguredTargets(product)

  if (targets.length === 0 && !hasExplicitTargets && !hasExplicitChannels) {
    targets.push('website')
  }

  const existingChannels = hasExplicitChannels ? product.channels : {}
  const channels: Record<string, unknown> = { ...existingChannels }

  for (const [channel, flag] of Object.entries(CHANNEL_FLAG_BY_TARGET) as Array<[ActiveProductChannel, string]>) {
    channels[flag] = targets.includes(channel)
  }

  return { channelTargets: targets, channels }
}

export function findProductChannelSelectionIssues(
  product: ProductChannelDocument,
): ProductChannelSelectionIssue[] {
  const issues: ProductChannelSelectionIssue[] = []
  const rawTargets = Array.isArray(product.channelTargets) ? product.channelTargets : []
  const activeTargetSet = new Set<ActiveProductChannel>()

  for (const target of rawTargets) {
    if (isActiveProductChannel(target)) {
      activeTargetSet.add(target)
    } else if (typeof target === 'string' && target.trim().length > 0) {
      issues.push({
        kind: 'unsupported_target',
        channel: target,
        detail: `Unsupported channel target '${target}' is ignored by readiness and dispatch`,
      })
    }
  }

  const channels = isObject(product.channels) ? product.channels : {}

  for (const [channel, flag] of Object.entries(CHANNEL_FLAG_BY_TARGET) as Array<[ActiveProductChannel, string]>) {
    const targetSelected = activeTargetSet.has(channel)
    const flagValue = channels[flag]

    if (targetSelected && flagValue === false) {
      issues.push({
        kind: 'target_without_flag',
        channel,
        flag,
        detail: `channelTargets includes '${channel}' but channels.${flag} is false`,
      })
    } else if (!targetSelected && flagValue === true) {
      issues.push({
        kind: 'flag_without_target',
        channel,
        flag,
        detail: `channels.${flag} is true but channelTargets does not include '${channel}'`,
      })
    }
  }

  return issues
}
