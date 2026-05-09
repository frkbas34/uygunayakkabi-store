/**
 * supplierScout/productCreator.ts
 *
 * Autonomous product creation pathway for SupplierScout.
 *
 * Gate checks (ALL must pass for auto-create):
 *   1. autoCreateEnabled in group config
 *   2. autoPauseActive === false in SupplierScoutSettings
 *   3. parseScore >= autoCreateMinScore (default 75)
 *   4. productName present
 *   5. wholesalePrice present
 *   6. sizeMin or availableSizes present
 *   7. hasPhoto === true
 *   8. Duplicate check passes (no existing product from same seller + similar name in last 30 days)
 *   9. Supplier not blocked
 *
 * Stock defaults:
 *   stockQuantity: 10
 *   stockMode: 'supplier_virtual_stock'
 *   exactStockKnown: false
 *   supplierAvailabilityBased: true
 *
 * STATUS: IMPLEMENTED (D-278)
 */

import type {
  ParsedProductOffer,
  AutoCreateGateResult,
  AutoCreateResult,
  SupplierGroupConfig,
} from './types'
import type { Payload } from 'payload'

const DEFAULT_STOCK_QUANTITY = 10

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate Check
// ─────────────────────────────────────────────────────────────────────────────

async function checkDuplicate(
  offer: ParsedProductOffer,
  payload: Payload,
): Promise<{ isDuplicate: boolean; existingId?: number | string }> {
  if (!offer.productName) return { isDuplicate: false }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const existing = await payload.find({
      collection: 'products',
      where: {
        and: [
          { source: { equals: 'supplier_scout' } },
          { createdAt: { greater_than: thirtyDaysAgo } },
          { title: { like: offer.productName.substring(0, 30) } },
        ],
      },
      limit: 5,
      depth: 0,
    })

    // Also check by seller + group combo
    const sameSeller = await payload.find({
      collection: 'wholesale-opportunities',
      where: {
        and: [
          { sellerTelegramId: { equals: offer.sellerUserId } },
          { telegramMessageId: { equals: offer.telegramMessageId } },
          { status: { equals: 'product_created' } },
        ],
      },
      limit: 1,
    })

    if (sameSeller.docs.length > 0) {
      const opp = sameSeller.docs[0] as Record<string, any>
      return { isDuplicate: true, existingId: opp.createdProduct }
    }

    if (existing.docs.length > 0) {
      return { isDuplicate: true, existingId: (existing.docs[0] as any).id }
    }

    return { isDuplicate: false }
  } catch {
    return { isDuplicate: false }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-Create Gate
// ─────────────────────────────────────────────────────────────────────────────

export async function checkAutoCreateGate(
  offer: ParsedProductOffer,
  groupConfig: SupplierGroupConfig | null,
  settings: { autoPauseActive: boolean; autoCreateMinScore: number },
  payload: Payload,
): Promise<AutoCreateGateResult> {
  const blockers: string[] = []

  // 1. Auto-pause
  if (settings.autoPauseActive) {
    blockers.push('Otonom oluşturma duraklatılmış (/resume_auto ile devam ettir)')
  }

  // 2. Group enabled
  if (groupConfig && !groupConfig.autoCreateEnabled) {
    blockers.push('Bu grup için otomatik oluşturma devre dışı')
  }

  // 3. Group blocked
  if (groupConfig?.isBlocked) {
    return {
      allowed: false,
      blockers: ['Tedarikçi grubu bloklanmış'],
      isDuplicate: false,
      supplierBlocked: true,
      autoPaused: settings.autoPauseActive,
    }
  }

  // 4. Required fields
  if (!offer.productName) blockers.push('Ürün adı tespit edilemedi')
  if (!offer.wholesalePrice) blockers.push('Toptan fiyat bulunamadı')
  if (!offer.sizeMin && (!offer.availableSizes || offer.availableSizes.length === 0)) {
    blockers.push('Beden bilgisi eksik')
  }
  if (!offer.hasPhoto) blockers.push('Fotoğraf yok')

  // 5. Confidence score
  if (offer.parseScore < settings.autoCreateMinScore) {
    blockers.push(`Güven skoru düşük (${offer.parseScore}/${settings.autoCreateMinScore})`)
  }

  // 6. Duplicate check
  const dupCheck = await checkDuplicate(offer, payload)

  if (blockers.length > 0) {
    return {
      allowed: false,
      blockers,
      isDuplicate: dupCheck.isDuplicate,
      existingProductId: dupCheck.existingId,
      supplierBlocked: false,
      autoPaused: settings.autoPauseActive,
    }
  }

  if (dupCheck.isDuplicate) {
    return {
      allowed: false,
      blockers: ['Duplicate — bu ürün son 30 günde zaten oluşturulmuş'],
      isDuplicate: true,
      existingProductId: dupCheck.existingId,
      supplierBlocked: false,
      autoPaused: false,
    }
  }

  return {
    allowed: true,
    blockers: [],
    isDuplicate: false,
    supplierBlocked: false,
    autoPaused: false,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Product Title
// ─────────────────────────────────────────────────────────────────────────────

function buildProductTitle(offer: ParsedProductOffer): string {
  const parts: string[] = []
  if (offer.brand) parts.push(offer.brand)
  if (offer.model) parts.push(offer.model)
  else if (offer.productName) parts.push(offer.productName)
  if (offer.color) parts.push(offer.color)
  if (parts.length === 0) parts.push(offer.productName ?? 'Ürün')
  return parts.join(' ')
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Size Variants
// ─────────────────────────────────────────────────────────────────────────────

function buildSizeList(offer: ParsedProductOffer): number[] {
  if (offer.availableSizes && offer.availableSizes.length > 0) return offer.availableSizes
  if (offer.sizeMin && offer.sizeMax) {
    const sizes: number[] = []
    for (let s = offer.sizeMin; s <= offer.sizeMax; s++) sizes.push(s)
    return sizes
  }
  if (offer.sizeMin) return [offer.sizeMin]
  return []
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Auto-Create Function
// ─────────────────────────────────────────────────────────────────────────────

export async function autoCreateProduct(
  offer: ParsedProductOffer,
  groupConfig: SupplierGroupConfig | null,
  opportunityId: string | number,
  settings: { defaultStockQuantity: number; usdToTryRate: number },
  payload: Payload,
): Promise<AutoCreateResult> {
  const title = buildProductTitle(offer)
  const sizeList = buildSizeList(offer)
  const websitePrice = offer.computedWebsitePrice ?? offer.wholesalePrice ?? 0
  const stockPerSize = settings.defaultStockQuantity

  try {
    // ── Create the product ──────────────────────────────────────────────────
    const productData: Record<string, unknown> = {
      title,
      price: websitePrice,
      originalPrice: offer.wholesalePrice && offer.wholesaleCurrency === 'TRY'
        ? undefined
        : undefined, // don't set originalPrice for supplier products
      status: 'draft', // Always draft — operator must manually activate
      source: 'supplier_scout',
      category: offer.category ?? groupConfig?.defaultCategory ?? 'Günlük',
      brand: offer.brand,

      // Stock
      stockQuantity: stockPerSize,

      // Supplier meta (stored in supplierMeta group)
      'supplierMeta.stockMode': 'supplier_virtual_stock',
      'supplierMeta.exactStockKnown': false,
      'supplierMeta.supplierAvailabilityBased': true,
      'supplierMeta.wholesalePrice': offer.wholesalePrice,
      'supplierMeta.wholesaleCurrency': offer.wholesaleCurrency ?? 'USD',
      'supplierMeta.marginApplied': groupConfig?.marginUSD ?? 15,
      'supplierMeta.supplierGroupId': String(groupConfig?.id ?? ''),
      'supplierMeta.supplierGroupName': groupConfig?.groupName ?? '',
      'supplierMeta.supplierSellerId': String(offer.sellerUserId ?? ''),
      'supplierMeta.supplierSellerName': offer.sellerName ?? offer.sellerUsername ?? '',
      'supplierMeta.wholesaleOpportunityId': String(opportunityId),
      'supplierMeta.autoCreatedAt': new Date().toISOString(),
      'supplierMeta.autoCreateConfidence': offer.parseScore,

      // Automation meta
      'automationMeta.telegramMessageId': String(offer.telegramMessageId ?? ''),
      'automationMeta.telegramChatId': String(offer.supplierGroupTelegramId ?? ''),

      // Workflow defaults
      'workflow.visualStatus': 'pending',
      'workflow.confirmationStatus': 'pending',
      'workflow.contentStatus': 'not_started',
      'workflow.auditStatus': 'pending',
      'workflow.workflowStatus': 'intake',
      'workflow.stockState': 'in_stock',
    }

    const created = await payload.create({
      collection: 'products',
      data: productData as any,
    })

    const productId = (created as any).id

    // ── Create size variants ────────────────────────────────────────────────
    if (sizeList.length > 0) {
      for (const size of sizeList) {
        try {
          await payload.create({
            collection: 'variants',
            data: {
              product: productId,
              size: String(size),
              stockQuantity: stockPerSize,
              sku: `SS-${title.substring(0, 6).toUpperCase().replace(/\s/g, '')}-${size}`,
            } as any,
          })
        } catch (variantErr) {
          console.warn(`[SupplierScout/productCreator] Variant ${size} create failed:`, variantErr)
        }
      }
    }

    return {
      success: true,
      productId,
      productTitle: title,
      websitePrice,
      wholesalePrice: offer.wholesalePrice,
    }
  } catch (err) {
    console.error('[SupplierScout/productCreator] autoCreateProduct error:', err)
    return {
      success: false,
      error: (err as Error).message ?? 'Bilinmeyen hata',
    }
  }
}
