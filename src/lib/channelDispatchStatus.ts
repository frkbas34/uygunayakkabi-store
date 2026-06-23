export type DispatchChannelResultLike = {
  channel: string
  eligible: boolean
  dispatched: boolean
  webhookConfigured: boolean
  skippedReason?: string
  error?: string
  responseStatus?: number
  publishResult?: Record<string, unknown>
  timestamp?: string
}

export type ChannelDispatchState =
  | 'published'
  | 'queued'
  | 'failed'
  | 'blocked'
  | 'preview'
  | 'unrecorded'
  | 'not_configured'
  | 'skipped'

export type ChannelDispatchSummary = {
  state: ChannelDispatchState
  label: string
  reason: string | null
  canRedispatch: boolean
}

export type ChannelDispatchOverviewRow = DispatchChannelResultLike & {
  hasResult: boolean
}

export const CHANNEL_DISPATCH_STATE_LABELS: Record<ChannelDispatchState, string> = {
  published: 'Published',
  queued: 'Queued',
  failed: 'Failed',
  blocked: 'Blocked',
  preview: 'Preview',
  unrecorded: 'No dispatch record',
  not_configured: 'Not configured',
  skipped: 'Skipped',
}

const CHANNEL_OVERVIEW_ORDER = ['website', 'instagram', 'shopier', 'x', 'facebook'] as const

function normalizeReason(result: DispatchChannelResultLike): string | null {
  if (result.error) return result.error
  if (result.skippedReason === 'native-website') return 'Website is live through the storefront'
  if (result.skippedReason === 'no-dispatch-record') return 'No dispatch result recorded yet'
  return result.skippedReason ?? null
}

export function summarizeChannelDispatchResult(result: DispatchChannelResultLike): ChannelDispatchSummary {
  const reason = normalizeReason(result)

  if (result.skippedReason === 'no-dispatch-record') {
    return {
      state: 'unrecorded',
      label: CHANNEL_DISPATCH_STATE_LABELS.unrecorded,
      reason,
      canRedispatch: result.channel !== 'website',
    }
  }

  if (!result.eligible) {
    return {
      state: 'blocked',
      label: CHANNEL_DISPATCH_STATE_LABELS.blocked,
      reason,
      canRedispatch: false,
    }
  }

  if (result.dispatched) {
    return {
      state: 'published',
      label: CHANNEL_DISPATCH_STATE_LABELS.published,
      reason,
      canRedispatch: result.channel !== 'website',
    }
  }

  if (result.skippedReason === 'queued-via-jobs-queue') {
    return {
      state: 'queued',
      label: CHANNEL_DISPATCH_STATE_LABELS.queued,
      reason,
      canRedispatch: false,
    }
  }

  if (result.skippedReason === 'dry-run-preview') {
    return {
      state: 'preview',
      label: CHANNEL_DISPATCH_STATE_LABELS.preview,
      reason,
      canRedispatch: false,
    }
  }

  if (result.error) {
    return {
      state: 'failed',
      label: CHANNEL_DISPATCH_STATE_LABELS.failed,
      reason,
      canRedispatch: true,
    }
  }

  if (!result.webhookConfigured) {
    return {
      state: 'not_configured',
      label: CHANNEL_DISPATCH_STATE_LABELS.not_configured,
      reason,
      canRedispatch: true,
    }
  }

  return {
    state: 'skipped',
    label: CHANNEL_DISPATCH_STATE_LABELS.skipped,
    reason,
    canRedispatch: true,
  }
}

export function buildChannelDispatchOverview(
  activeTargets: readonly string[] = [],
  results: readonly DispatchChannelResultLike[] = [],
): ChannelDispatchOverviewRow[] {
  const latestByChannel = new Map<string, DispatchChannelResultLike>()

  for (const result of results) {
    if (typeof result.channel === 'string' && result.channel.length > 0) {
      latestByChannel.set(result.channel, result)
    }
  }

  const targetSet = new Set(activeTargets.filter((channel): channel is string => typeof channel === 'string' && channel.length > 0))
  const orderedTargets = [
    ...CHANNEL_OVERVIEW_ORDER.filter((channel) => targetSet.has(channel)),
    ...[...targetSet].filter((channel) => !(CHANNEL_OVERVIEW_ORDER as readonly string[]).includes(channel)),
  ]

  const rows: ChannelDispatchOverviewRow[] = orderedTargets.map((channel) => {
    const existing = latestByChannel.get(channel)
    if (existing) return { ...existing, hasResult: true }

    if (channel === 'website') {
      return {
        channel,
        eligible: true,
        dispatched: true,
        webhookConfigured: true,
        skippedReason: 'native-website',
        hasResult: false,
      }
    }

    return {
      channel,
      eligible: true,
      dispatched: false,
      webhookConfigured: true,
      skippedReason: 'no-dispatch-record',
      hasResult: false,
    }
  })

  for (const result of results) {
    if (!targetSet.has(result.channel)) {
      rows.push({ ...result, hasResult: true })
    }
  }

  return rows
}
