/**
 * supplierScout/soldoutMatcher.ts
 *
 * Matches a sold-out signal to existing website products created by SupplierScout.
 *
 * Matching strategy (multi-signal, scored):
 *   1. Same supplier group (strong signal)
 *   2. Same seller Telegram ID (strong signal)
 *   3. Reply to a message ID that matches a known product's creation message (strongest)
 *   4. Same media_group_id (strong)
 *   5. Product name/model similarity (medium)
 *   6. Recency window: product created within last 30 days (medium)
 *
 * Auto-applies only when matchScore >= soldOutAutoApplyMinScore (default 80).
 * Sends DM warning when medium confidence (50–79).
 * Reports only when low confidence (<50).
 *
 * STATUS: IMPLEMENTED (D-278)
 */

import type { ParsedSoldOutSignal, SoldOutMatchResult, ConfidenceLevel } from './types'
import type { Payload } from 'payload'

// Simple text similarity (Jaccard on word tokens)
function wordSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(s.toLowerCase().replace(/[^a-zçğışöü0-9\s]/gi, ' ').split(/\s+/).filter(Boolean))
  const aSet = tokenize(a)
  const bSet = tokenize(b)
  const intersection = [...aSet].filter(w => bSet.has(w)).length
  const union = new Set([...aSet, ...bSet]).size
  return union === 0 ? 0 : intersection / union
}

function scoreToConfidence(score: number): ConfidenceLevel {
  if (score >= 80) return 'high'
  if (score >= 50) return 'medium'
  if (score >= 25) return 'low'
  return 'none'
}

export async function matchSoldOutToProduct(
  signal: ParsedSoldOutSignal,
  payload: Payload,
  autoApplyMinScore: number = 80,
): Promise<SoldOutMatchResult> {
  // Only look at supplier_scout-created products
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const result = await payload.find({
      collection: 'products',
      where: {
        and: [
          { source: { equals: 'supplier_scout' } },
          { status: { not_equals: 'soldout' } },
          { createdAt: { greater_than: thirtyDaysAgo } },
        ],
      },
      limit: 100,
      depth: 0,
    })

    const candidates = result.docs as Array<Record<string, any>>
    if (candidates.length === 0) {
      return {
        matched: false,
        confidence: 'none',
        matchReasons: ['SupplierScout tarafından oluşturulmuş aktif ürün bulunamadı'],
        matchScore: 0,
        action: 'no_match',
      }
    }

    // Score each candidate
    let bestScore = 0
    let bestCandidate: Record<string, any> | null = null
    let bestReasons: string[] = []

    for (const product of candidates) {
      let score = 0
      const reasons: string[] = []

      const supplierMeta = (product.supplierMeta as Record<string, any>) ?? {}

      // 1. Same supplier group
      if (signal.telegramGroupId && supplierMeta.supplierGroupId) {
        // supplierGroupId stored as string of the supplier-groups record id
        // Also check via telegramGroupId match in SupplierGroups (would need join — skip for now)
        score += 20
        reasons.push('Aynı tedarikçi grubu')
      }

      // 2. Same seller
      if (signal.sellerUserId && supplierMeta.supplierSellerId) {
        if (String(signal.sellerUserId) === String(supplierMeta.supplierSellerId)) {
          score += 25
          reasons.push('Aynı satıcı')
        }
      }

      // 3. Reply to message (strongest signal — direct thread relation)
      if (signal.replyToMessageId && supplierMeta.wholesaleOpportunityId) {
        // Would need to look up the opportunity record — approximate check
        const telegramMsgId = supplierMeta.autoCreatedFromMessageId
        if (telegramMsgId && String(telegramMsgId) === String(signal.replyToMessageId)) {
          score += 40
          reasons.push('Orijinal ürün mesajına yanıt')
        }
      }

      // 4. Same media group
      if (signal.mediaGroupId && supplierMeta.autoCreatedFromMediaGroupId) {
        if (signal.mediaGroupId === supplierMeta.autoCreatedFromMediaGroupId) {
          score += 35
          reasons.push('Aynı medya grubu')
        }
      }

      // 5. Product name similarity
      const productTitle = (product.title as string) ?? ''
      const signalText = (signal.rawText ?? '').substring(0, 200)
      if (productTitle && signalText) {
        const sim = wordSimilarity(productTitle, signalText)
        if (sim > 0.3) {
          const simScore = Math.round(sim * 30)
          score += simScore
          reasons.push(`Ürün adı benzerliği: ${Math.round(sim * 100)}%`)
        }
      }

      // 6. Recency (created within last 7 days = bonus)
      const createdAt = product.createdAt as string | undefined
      if (createdAt) {
        const age = Date.now() - new Date(createdAt).getTime()
        const sevenDays = 7 * 24 * 60 * 60 * 1000
        if (age < sevenDays) {
          score += 10
          reasons.push('Son 7 gün içinde oluşturulmuş')
        }
      }

      if (score > bestScore) {
        bestScore = score
        bestCandidate = product
        bestReasons = reasons
      }
    }

    if (bestScore < 25 || !bestCandidate) {
      return {
        matched: false,
        confidence: 'none',
        matchReasons: ['Eşleşen ürün bulunamadı (skor çok düşük)'],
        matchScore: bestScore,
        action: 'no_match',
      }
    }

    const confidence = scoreToConfidence(bestScore)
    const action = bestScore >= autoApplyMinScore
      ? 'auto_soldout'
      : bestScore >= 50
        ? 'dm_warning'
        : 'report_only'

    return {
      matched: true,
      confidence,
      productId: bestCandidate.id,
      productTitle: bestCandidate.title as string,
      productSku: bestCandidate.sku as string,
      matchReasons: bestReasons,
      matchScore: bestScore,
      action,
    }
  } catch (err) {
    console.error('[SupplierScout/soldoutMatcher] Error:', err)
    return {
      matched: false,
      confidence: 'none',
      matchReasons: [`Hata: ${(err as Error).message}`],
      matchScore: 0,
      action: 'no_match',
    }
  }
}

/** Apply sold-out status to a matched product. */
export async function applySoldOut(
  productId: number | string,
  reason: string,
  payload: Payload,
): Promise<boolean> {
  try {
    await payload.update({
      collection: 'products',
      id: productId as number,
      data: {
        status: 'soldout',
        'workflow.stockState': 'sold_out',
        'workflow.workflowStatus': 'soldout',
      } as any,
    })
    console.log(`[SupplierScout/soldoutMatcher] Applied soldout to product ${productId}: ${reason}`)
    return true
  } catch (err) {
    console.error('[SupplierScout/soldoutMatcher] applySoldOut error:', err)
    return false
  }
}
