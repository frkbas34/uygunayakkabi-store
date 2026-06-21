export type ProductLifecycleStage =
  | 'draft'
  | 'needs_review'
  | 'ready_to_publish'
  | 'active'
  | 'sold_out'

export type ProductLifecycleInput = {
  status?: string | null
  workflow?: {
    workflowStatus?: string | null
    confirmationStatus?: string | null
    contentStatus?: string | null
    auditStatus?: string | null
    publishStatus?: string | null
    stockState?: string | null
    sellable?: boolean | null
  } | null
  auditResult?: {
    overallResult?: string | null
    approvedForPublish?: boolean | null
  } | null
}

export const PRODUCT_LIFECYCLE_LABELS: Record<ProductLifecycleStage, string> = {
  draft: 'Draft',
  needs_review: 'Needs review',
  ready_to_publish: 'Ready to publish',
  active: 'Active',
  sold_out: 'Sold out',
}

const NEEDS_REVIEW_WORKFLOW = new Set([
  'visual_pending',
  'visual_ready',
  'confirmation_pending',
  'confirmed',
  'content_pending',
  'content_ready',
  'audit_pending',
])

const NEEDS_REVIEW_AUDIT = new Set([
  'needs_revision',
  'failed',
  'rejected',
])

/**
 * Map the existing Payload schema into the roadmap's five operator stages.
 *
 * Top-level `status` remains the customer-facing storefront switch. Richer
 * pre-publish state stays in `workflow.workflowStatus`, so this helper avoids
 * a schema migration while giving agents one shared lifecycle vocabulary.
 */
export function deriveProductLifecycle(product: ProductLifecycleInput | null | undefined): ProductLifecycleStage {
  if (!product) return 'draft'

  const status = product.status ?? 'draft'
  const workflow = product.workflow ?? {}
  const workflowStatus = workflow.workflowStatus ?? 'draft'
  const auditStatus = workflow.auditStatus ?? product.auditResult?.overallResult ?? null

  if (status === 'soldout' || workflow.stockState === 'sold_out') return 'sold_out'
  if (status === 'active') return 'active'
  if (workflowStatus === 'publish_ready') return 'ready_to_publish'

  if (
    NEEDS_REVIEW_WORKFLOW.has(workflowStatus) ||
    NEEDS_REVIEW_AUDIT.has(auditStatus ?? '') ||
    workflow.confirmationStatus === 'pending' ||
    workflow.contentStatus === 'pending' ||
    workflow.auditStatus === 'pending'
  ) {
    return 'needs_review'
  }

  return 'draft'
}

export function formatProductLifecycle(product: ProductLifecycleInput | null | undefined): string {
  return PRODUCT_LIFECYCLE_LABELS[deriveProductLifecycle(product)]
}
