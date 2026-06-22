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
  | 'not_configured'
  | 'skipped'

export type ChannelDispatchSummary = {
  state: ChannelDispatchState
  label: string
  reason: string | null
  canRedispatch: boolean
}

export const CHANNEL_DISPATCH_STATE_LABELS: Record<ChannelDispatchState, string> = {
  published: 'Published',
  queued: 'Queued',
  failed: 'Failed',
  blocked: 'Blocked',
  preview: 'Preview',
  not_configured: 'Not configured',
  skipped: 'Skipped',
}

export function summarizeChannelDispatchResult(result: DispatchChannelResultLike): ChannelDispatchSummary {
  const reason = result.error ?? result.skippedReason ?? null

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
      canRedispatch: true,
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
