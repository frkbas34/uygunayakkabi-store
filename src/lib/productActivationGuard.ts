import { formatBrandSafetyReason, scanProductBrandSafety } from './brandSafety'
import { hasUsableMediaRow } from './productMedia'
import { resolveConfiguredTargets } from './productChannels'
export { ACTIVE_PRODUCT_CHANNELS, resolveConfiguredTargets } from './productChannels'
export type { ActiveProductChannel } from './productChannels'

export type ProductActivationDocument = Record<string, any>

export interface ActivationStockSnapshot {
  effectiveStock: number
  hasVariants: boolean
}

export type ActivationStockResolver = (
  productId: number | string,
  productLevelStock: number | null,
) => Promise<ActivationStockSnapshot>

export interface ActivationGuardOptions {
  resolveStockSnapshot?: ActivationStockResolver
}

function isObject(value: unknown): value is ProductActivationDocument {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function mergeActivationProduct(
  data: ProductActivationDocument,
  originalDoc?: ProductActivationDocument | null,
): ProductActivationDocument {
  const original = isObject(originalDoc) ? originalDoc : {}
  const merged: ProductActivationDocument = { ...original, ...(data ?? {}) }

  for (const group of ['workflow', 'channels', 'content', 'auditResult', 'sourceMeta', 'merchandising']) {
    if (isObject(original[group]) || isObject(data?.[group])) {
      merged[group] = {
        ...(isObject(original[group]) ? original[group] : {}),
        ...(isObject(data?.[group]) ? data[group] : {}),
      }
    }
  }

  return merged
}

export function formatActivationError(blockers: string[]): string {
  return [
    'Aktivasyon engellendi. Urun yayina alinmadan once eksikleri tamamlayin:',
    ...blockers.map((blocker) => `- ${blocker}`),
  ].join('\n')
}

export function applyActivationWorkflowDefaults(
  data: ProductActivationDocument,
  product: ProductActivationDocument,
): void {
  const existingWorkflow = isObject(product.workflow) ? product.workflow : {}
  const incomingWorkflow = isObject(data.workflow) ? data.workflow : {}
  const workflow: ProductActivationDocument = {
    ...existingWorkflow,
    ...incomingWorkflow,
    sellable: true,
  }

  if (
    !workflow.workflowStatus ||
    [
      'draft',
      'visual_pending',
      'visual_ready',
      'confirmation_pending',
      'confirmed',
      'content_pending',
      'content_ready',
      'audit_pending',
      'publish_ready',
      'soldout',
    ].includes(String(workflow.workflowStatus))
  ) {
    workflow.workflowStatus = 'active'
  }

  if (!workflow.stockState || workflow.stockState === 'sold_out') {
    workflow.stockState = 'in_stock'
  }

  if (!workflow.publishStatus || ['not_requested', 'pending'].includes(String(workflow.publishStatus))) {
    workflow.publishStatus = 'published'
  }

  data.workflow = workflow
}

export function applySoldOutWorkflowDefaults(
  data: ProductActivationDocument,
  product: ProductActivationDocument,
): void {
  const existingWorkflow = isObject(product.workflow) ? product.workflow : {}
  const incomingWorkflow = isObject(data.workflow) ? data.workflow : {}

  data.workflow = {
    ...existingWorkflow,
    ...incomingWorkflow,
    workflowStatus: 'soldout',
    stockState: 'sold_out',
    sellable: false,
  }
}

export async function collectActivationBlockers(
  product: ProductActivationDocument,
  options: ActivationGuardOptions = {},
): Promise<string[]> {
  const blockers: string[] = []

  const price = Number(product.price ?? 0)
  if (!Number.isFinite(price) || price <= 0) {
    blockers.push('gecerli fiyat gerekli (0dan buyuk)')
  }

  const hasOriginalImage = hasUsableMediaRow(product.images)
  const hasGeneratedImage = hasUsableMediaRow(product.generativeGallery)
  if (!hasOriginalImage && !hasGeneratedImage) {
    blockers.push('en az bir urun gorseli veya onayli AI gorseli gerekli')
  }

  const targets = resolveConfiguredTargets(product)
  if (targets.length === 0) {
    blockers.push('en az bir aktif yayin hedefi gerekli: website, instagram, shopier, x veya facebook')
  }

  const productId = product.id
  if (productId && options.resolveStockSnapshot) {
    try {
      const snapshot = await options.resolveStockSnapshot(productId, product.stockQuantity ?? 0)
      if (snapshot.effectiveStock <= 0) {
        blockers.push(
          snapshot.hasVariants
            ? 'beden varyantlarinda stok gerekli'
            : 'stok adedi 0dan buyuk olmali',
        )
      }
    } catch (err) {
      blockers.push(
        `stok dogrulanamadi (${err instanceof Error ? err.message : 'bilinmeyen hata'})`,
      )
    }
  } else if (Number(product.stockQuantity ?? 0) <= 0) {
    blockers.push('stok adedi 0dan buyuk olmali')
  }

  const brandSafety = scanProductBrandSafety(product)
  if (!brandSafety.safe) {
    blockers.push(
      `brand safety blokladi: ${formatBrandSafetyReason(brandSafety) || brandSafety.reasons.join('; ')}`,
    )
  }

  return blockers
}
