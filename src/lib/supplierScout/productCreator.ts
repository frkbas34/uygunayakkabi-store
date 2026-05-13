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
      status: 'draft', // Always draft — operator must manually activate
      source: 'supplier_scout',
      category: offer.category ?? groupConfig?.defaultCategory ?? 'Günlük',
      brand: offer.brand,
      stockQuantity: stockPerSize,

      // Supplier meta — nested group object (Payload v3 requires nested, not dot-notation)
      supplierMeta: {
        stockMode: 'supplier_virtual_stock',
        exactStockKnown: false,
        supplierAvailabilityBased: true,
        wholesalePrice: offer.wholesalePrice,
        wholesaleCurrency: offer.wholesaleCurrency ?? 'USD',
        marginApplied: groupConfig?.marginUSD ?? 15,
        supplierGroupId: String(groupConfig?.id ?? ''),
        supplierGroupName: groupConfig?.groupName ?? '',
        supplierSellerId: String(offer.sellerUserId ?? ''),
        supplierSellerName: offer.sellerName ?? offer.sellerUsername ?? '',
        wholesaleOpportunityId: String(opportunityId),
        autoCreatedAt: new Date().toISOString(),
        autoCreateConfidence: offer.parseScore,
      },

      // Automation meta — nested group object
      automationMeta: {
        telegramMessageId: String(offer.telegramMessageId ?? ''),
        telegramChatId: String(offer.supplierGroupTelegramId ?? ''),
      },

      // Workflow defaults — nested group object
      workflow: {
        workflowStatus: 'intake',
        visualStatus: 'pending',
        confirmationStatus: 'pending',
        contentStatus: 'not_started',
        auditStatus: 'pending',
        stockState: 'in_stock',
      },

      // Channels — all false for supplier_scout drafts (publishWebsite defaults true, force off)
      channels: {
        publishWebsite: false,
        publishInstagram: false,
        publishShopier: false,
        publishDolap: false,
        publishX: false,
        publishFacebook: false,
        publishThreads: false,
      },
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
              stock: stockPerSize,
              variantSku: `SS-${title.substring(0, 6).toUpperCase().replace(/\s/g, '')}-${size}`,
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

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL DRAFT CREATION (Phase 3A)
// Operator-triggered via /create_draft DM command.
// Bypasses autoPauseActive + autoCreateEnabled gates (explicit operator action).
// Still enforces: duplicate check, WO status guard, status='draft', no publishing.
// ─────────────────────────────────────────────────────────────────────────────

export interface ManualDraftPreview {
  woId: number
  woStatus: string
  productName: string | null
  brand: string | null
  model: string | null
  color: string | null
  sizeSummary: string
  wholesalePrice: number | null
  wholesaleCurrency: string | null
  websitePrice: number | null
  parseScore: number
  groupName: string
  missingFields: string[]
  warnings: string[]
  isDuplicate: boolean
  duplicateProductId?: string | number
  canProceed: boolean       // false = hard block (duplicate or invalid WO status)
  requiresConfirm: boolean  // true = currency ambiguous -> operator must add "confirm"
}

export interface ManualDraftResult {
  success: boolean
  productId?: string | number
  productTitle?: string
  websitePrice?: number
  error?: string
}

/**
 * Load a WO, validate it, and return a preview object.
 * Does NOT create any product -- safe to call freely.
 */
export async function previewManualDraft(
  opportunityId: number,
  payload: Payload,
): Promise<ManualDraftPreview | { error: string }> {
  // 1. Load WO (depth:1 resolves the supplierGroup relationship)
  let wo: Record<string, any>
  try {
    wo = (await payload.findByID({
      collection: 'wholesale-opportunities',
      id: opportunityId,
      depth: 1,
    })) as Record<string, any>
  } catch {
    return { error: `WO #${opportunityId} bulunamadi.` }
  }

  // 2. WO status guard -- only pending/needs_review are eligible
  if (!['pending', 'needs_review'].includes(wo.status as string)) {
    if (wo.status === 'product_created') {
      const pid = (wo.createdProduct as any)?.id ?? wo.createdProduct
      return {
        error: `WO #${opportunityId} icin urun zaten olusturulmus${pid ? ` (Urun ID: ${pid})` : ''}.`,
      }
    }
    return {
      error: `WO #${opportunityId} durumu "${wo.status as string}" -- "pending" veya "needs_review" olmali.`,
    }
  }

  // 3. Group record (resolved by depth:1)
  const groupRecord = (wo.supplierGroup && typeof wo.supplierGroup === 'object')
    ? (wo.supplierGroup as Record<string, any>)
    : null
  const groupName: string = (groupRecord?.groupName as string) ?? `Grup #${String(wo.supplierGroup)}`
  const marginUSD: number = (groupRecord?.marginUSD as number) ?? 15

  // 4. Load exchange rate from settings
  let usdToTryRate = 32
  try {
    const settings = (await payload.findGlobal({ slug: 'supplier-scout-settings' })) as any
    usdToTryRate = (settings?.usdToTryRate as number) ?? 32
  } catch { /* use default */ }

  // 5. Size summary for display
  const availableSizes = _parseJsonArray(wo.availableSizes)
  const sizeSummary =
    availableSizes.length > 0
      ? availableSizes.join(', ')
      : wo.sizeMin
        ? `${String(wo.sizeMin)}${wo.sizeMax && wo.sizeMax !== wo.sizeMin ? `-${String(wo.sizeMax)}` : ''}`
        : '-'

  // 6. Compute website price for preview
  const websitePrice = _computeWebsitePrice(
    (wo.websitePrice as number) ?? null,
    (wo.wholesalePrice as number) ?? null,
    (wo.wholesaleCurrency as string) ?? null,
    marginUSD,
    usdToTryRate,
  )

  // 7. Warnings (non-blocking unless requiresConfirm)
  const warnings: string[] = []
  const currencyAmbiguous = !wo.wholesaleCurrency
  if (currencyAmbiguous) {
    warnings.push("Doviz birimi belirsiz (WO'da USD/TRY isaretlenmemis). Onaylayinca USD varsayilir.")
  }
  if (!wo.productName) {
    warnings.push('Urun adi cikarilamamis -- baslik marka/model bilgilerinden olusturulacak.')
  }
  if (!wo.wholesalePrice) {
    warnings.push('Toptan fiyat yok -- site fiyati hesaplanamaz.')
  }

  const missingFields = _parseJsonArray(wo.missingFields)

  // 8. Duplicate check
  const minimalOffer = {
    productName: (wo.productName as string) ?? undefined,
    sellerUserId: wo.sellerTelegramId ? Number(wo.sellerTelegramId) : undefined,
    telegramMessageId: wo.telegramMessageId ? Number(wo.telegramMessageId) : undefined,
  } as unknown as ParsedProductOffer
  const dupResult = await checkDuplicate(minimalOffer, payload)

  return {
    woId: opportunityId,
    woStatus: wo.status as string,
    productName: (wo.productName as string) ?? null,
    brand: (wo.brand as string) ?? null,
    model: (wo.model as string) ?? null,
    color: (wo.color as string) ?? null,
    sizeSummary,
    wholesalePrice: (wo.wholesalePrice as number) ?? null,
    wholesaleCurrency: (wo.wholesaleCurrency as string) ?? null,
    websitePrice,
    parseScore: (wo.confidenceScore as number) ?? 0,
    groupName,
    missingFields,
    warnings,
    isDuplicate: dupResult.isDuplicate,
    duplicateProductId: dupResult.existingId,
    canProceed: !dupResult.isDuplicate,
    requiresConfirm: currencyAmbiguous,
  }
}

/**
 * Execute manual draft creation for a specific WO.
 * autoPauseActive and autoCreateEnabled gates are intentionally bypassed --
 * this is an explicit, confirmed operator action via /create_draft <id> confirm.
 *
 * Still enforces:
 *   - WO status must be pending or needs_review
 *   - Duplicate check (race-condition safe: checked again before create)
 *   - Product created as status='draft' (enforced inside autoCreateProduct)
 *
 * Caller (commands.ts handleCreateDraft) is responsible for calling logAction.
 */
export async function executeManualDraft(
  opportunityId: number,
  payload: Payload,
): Promise<ManualDraftResult> {
  // Re-validate (double-submit / race-condition safety)
  let wo: Record<string, any>
  try {
    wo = (await payload.findByID({
      collection: 'wholesale-opportunities',
      id: opportunityId,
      depth: 1,
    })) as Record<string, any>
  } catch {
    return { success: false, error: `WO #${opportunityId} bulunamadi.` }
  }

  if (!['pending', 'needs_review'].includes(wo.status as string)) {
    return {
      success: false,
      error: `WO #${opportunityId} durumu "${wo.status as string}" -- olusturulamaz.`,
    }
  }

  // Reconstruct SupplierGroupConfig from the resolved relationship record
  const groupRecord = (wo.supplierGroup && typeof wo.supplierGroup === 'object')
    ? (wo.supplierGroup as Record<string, any>)
    : null

  const groupConfig: SupplierGroupConfig = {
    id: (groupRecord?.id as string | number) ?? 0,
    groupName: (groupRecord?.groupName as string) ?? 'Bilinmeyen Grup',
    telegramGroupId: Number(groupRecord?.telegramGroupId ?? 0),
    marginUSD: (groupRecord?.marginUSD as number) ?? 15,
    currency: ((groupRecord?.currency as string) ?? 'USD') as 'USD' | 'TRY' | 'EUR',
    isActive: true,
    isBlocked: false,
    autoCreateEnabled: false,
    trustScore: (groupRecord?.trustScore as number) ?? 80,
    defaultCategory: (groupRecord?.defaultCategory as string) ?? 'Gunluk',
  }

  // Load runtime settings
  let defaultStockQuantity = DEFAULT_STOCK_QUANTITY
  let usdToTryRate = 32
  try {
    const settings = (await payload.findGlobal({ slug: 'supplier-scout-settings' })) as any
    defaultStockQuantity = (settings?.defaultStockQuantity as number) ?? DEFAULT_STOCK_QUANTITY
    usdToTryRate = (settings?.usdToTryRate as number) ?? 32
  } catch { /* use defaults */ }

  // Reconstruct ParsedProductOffer from WO fields
  const availableSizes = _parseJsonArray(wo.availableSizes)
  const telegramFileIds = _parseJsonArray(wo.telegramFileIds)
  // Default currency to USD when ambiguous -- operator confirmed via /create_draft <id> confirm
  const wholesaleCurrency = (wo.wholesaleCurrency as string) ?? 'USD'

  const computedWebsitePrice = _computeWebsitePrice(
    (wo.websitePrice as number) ?? null,
    (wo.wholesalePrice as number) ?? null,
    wholesaleCurrency,
    groupConfig.marginUSD,
    usdToTryRate,
  )

  const offer: ParsedProductOffer = {
    productName: (wo.productName as string) ?? null,
    brand: (wo.brand as string) ?? undefined,
    model: (wo.model as string) ?? undefined,
    color: (wo.color as string) ?? undefined,
    category: (wo.category as string) ?? undefined,
    sizeMin: wo.sizeMin != null ? Number(wo.sizeMin) : undefined,
    sizeMax: wo.sizeMax != null ? Number(wo.sizeMax) : undefined,
    availableSizes: availableSizes.map(Number),
    wholesalePrice: (wo.wholesalePrice as number) ?? undefined,
    wholesaleCurrency: wholesaleCurrency as 'USD' | 'TRY' | 'EUR' | undefined,
    computedWebsitePrice: computedWebsitePrice ?? undefined,
    hasPhoto: (wo.hasPhoto as boolean) ?? false,
    telegramFileIds,
    parseScore: (wo.confidenceScore as number) ?? 0,
    parseConfidence: (wo.confidence as any) ?? 'medium',
    missingFields: _parseJsonArray(wo.missingFields),
    sellerUserId: wo.sellerTelegramId ? Number(wo.sellerTelegramId) : undefined,
    sellerUsername: (wo.sellerUsername as string) ?? undefined,
    sellerName: (wo.sellerDisplayName as string) ?? undefined,
    telegramMessageId: wo.telegramMessageId ? Number(wo.telegramMessageId) : undefined,
    telegramMediaGroupId: (wo.telegramMediaGroupId as string) ?? undefined,
    supplierGroupTelegramId: groupConfig.telegramGroupId,
    rawText: (wo.rawText as string) ?? '',
    parseWarnings: [],
  }

  // Duplicate check -- run again for race-condition safety before creating
  const dupResult = await checkDuplicate(offer, payload)
  if (dupResult.isDuplicate) {
    return {
      success: false,
      error: `Duplicate tespit edildi -- urun zaten mevcut (ID: ${dupResult.existingId ?? '?'}).`,
    }
  }

  // Create the product -- status:'draft' is enforced inside autoCreateProduct
  const createResult = await autoCreateProduct(
    offer,
    groupConfig,
    opportunityId,
    { defaultStockQuantity, usdToTryRate },
    payload,
  )

  if (createResult.success) {
    // Back-link the created product on the WO and update its status
    try {
      await payload.update({
        collection: 'wholesale-opportunities',
        id: opportunityId,
        data: {
          status: 'product_created',
          createdProduct: createResult.productId,
        } as any,
      })
    } catch {
      // Non-critical: product exists even if this update fails
    }
  }

  return createResult
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers shared by preview + execute paths
// ─────────────────────────────────────────────────────────────────────────────

function _parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      return JSON.parse(value) as string[]
    } catch { /* fall through */ }
  }
  return []
}

function _computeWebsitePrice(
  storedPrice: number | null,
  wholesalePrice: number | null,
  wholesaleCurrency: string | null,
  marginUSD: number,
  usdToTryRate: number,
): number | null {
  if (storedPrice) return storedPrice
  if (!wholesalePrice) return null
  const currency = wholesaleCurrency ?? 'USD'
  if (currency === 'TRY' || currency === 'TL') {
    return Math.round((wholesalePrice + marginUSD * usdToTryRate) * 1.2)
  }
  // USD (default)
  return Math.round((wholesalePrice + marginUSD) * usdToTryRate * 1.2)
}
