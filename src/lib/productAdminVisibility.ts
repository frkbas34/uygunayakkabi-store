export type ProductAdminVisibilityInput = {
  source?: string | null
  status?: string | null
  createdByAutomation?: boolean | null
  sourceMeta?: Record<string, unknown> | null
}

const MEANINGFUL_SOURCE_META_FIELDS = [
  'dispatchedChannels',
  'lastDispatchedAt',
  'dispatchNotes',
  'shopierProductId',
  'shopierProductUrl',
  'shopierLastSyncAt',
  'shopierLastError',
  'storyQueuedAt',
  'storyPublishedAt',
  'storyLastError',
] as const

function hasMeaningfulSourceMeta(sourceMeta: Record<string, unknown> | null | undefined): boolean {
  if (!sourceMeta) return false

  for (const field of MEANINGFUL_SOURCE_META_FIELDS) {
    const value = sourceMeta[field]
    if (value !== undefined && value !== null && value !== '') return true
  }

  if (sourceMeta.forceRedispatch === true || sourceMeta.previewDispatch === true) return true

  const shopierSyncStatus = sourceMeta.shopierSyncStatus
  if (
    typeof shopierSyncStatus === 'string' &&
    shopierSyncStatus !== '' &&
    shopierSyncStatus !== 'not_synced'
  ) {
    return true
  }

  const storyStatus = sourceMeta.storyStatus
  if (typeof storyStatus === 'string' && storyStatus !== '' && storyStatus !== 'none') {
    return true
  }

  return false
}

export function shouldShowSourceMeta(data: ProductAdminVisibilityInput | null | undefined): boolean {
  const source = data?.source ?? 'admin'

  if (source !== 'admin') return true
  if (data?.createdByAutomation === true) return true
  if (data?.status === 'active' || data?.status === 'soldout') return true

  return hasMeaningfulSourceMeta(data?.sourceMeta)
}
