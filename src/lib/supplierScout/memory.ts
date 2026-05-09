/**
 * supplierScout/memory.ts
 *
 * Learning memory layer for SupplierScout.
 *
 * Manages:
 *   - Language memory (Turkish slang/shorthand) — teachable via /teach
 *   - Seller memory (per-seller behaviour patterns)
 *   - Group memory (per-group observations)
 *   - Correction memory (Frank's manual corrections)
 *
 * SAFETY: This module only READS and WRITES to its own memory collections.
 * It does NOT modify any production publishing/pricing/dispatch logic.
 *
 * STATUS: IMPLEMENTED (D-278)
 */

import type { Payload } from 'payload'
import type { LanguageMemoryEntry, SellerMemoryEntry, CorrectionMemoryEntry } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Language Memory
// ─────────────────────────────────────────────────────────────────────────────

/** Load all language memory entries for use in classification/parsing prompts. */
export async function loadLanguageMemory(
  payload: Payload,
): Promise<Array<{ term: string; meaning: string; context: string }>> {
  try {
    const result = await payload.find({
      collection: 'supplier-language-memory',
      limit: 200,
      sort: '-usageCount',
    })
    return (result.docs as Array<Record<string, any>>).map(d => ({
      term: d.term as string,
      meaning: d.meaning as string,
      context: d.context as string,
    }))
  } catch {
    return []
  }
}

/** Store a new term taught by Frank via /teach command. */
export async function teachTerm(
  term: string,
  meaning: string,
  context: string,
  scope: string | undefined,
  payload: Payload,
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if term already exists
    const existing = await payload.find({
      collection: 'supplier-language-memory',
      where: { term: { equals: term.toLowerCase() } },
      limit: 1,
    })

    const now = new Date().toISOString()

    if (existing.docs.length > 0) {
      // Update existing
      const id = (existing.docs[0] as any).id
      await payload.update({
        collection: 'supplier-language-memory',
        id,
        data: {
          meaning,
          context,
          supplierScope: scope,
          isManual: true,
          teacherId: 'frank',
          updatedAt: now,
        } as any,
      })
      return { success: true, message: `✅ "${term}" güncellendi: ${meaning}` }
    } else {
      await payload.create({
        collection: 'supplier-language-memory',
        data: {
          term: term.toLowerCase(),
          meaning,
          context,
          supplierScope: scope,
          confidence: 90,
          isManual: true,
          teacherId: 'frank',
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        } as any,
      })
      return { success: true, message: `✅ Yeni terim öğrenildi: "${term}" = ${meaning}` }
    }
  } catch (err) {
    return { success: false, message: `❌ Hata: ${(err as Error).message}` }
  }
}

/** Increment usage count for a term when it's detected. */
export async function incrementTermUsage(term: string, payload: Payload): Promise<void> {
  try {
    const existing = await payload.find({
      collection: 'supplier-language-memory',
      where: { term: { equals: term.toLowerCase() } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      const doc = existing.docs[0] as any
      await payload.update({
        collection: 'supplier-language-memory',
        id: doc.id,
        data: { usageCount: ((doc.usageCount as number) ?? 0) + 1 } as any,
      })
    }
  } catch { /* non-critical */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seller Memory
// ─────────────────────────────────────────────────────────────────────────────

export async function loadSellerMemory(
  sellerTelegramId: number,
  payload: Payload,
): Promise<SellerMemoryEntry | null> {
  try {
    const result = await payload.find({
      collection: 'supplier-seller-memory',
      where: { sellerTelegramId: { equals: sellerTelegramId } },
      limit: 1,
    })
    if (result.docs.length === 0) return null
    const d = result.docs[0] as Record<string, any>
    return {
      telegramUserId: d.sellerTelegramId as number,
      username: d.sellerUsername,
      displayName: d.sellerDisplayName,
      postingStyle: d.postingStyle ?? '',
      reliabilityScore: d.reliabilityScore ?? 50,
      typicalCategories: d.typicalCategories ?? [],
      typicalPriceRange: d.typicalPriceRange,
      commonTerms: d.commonTerms ?? [],
      flaggedBehaviors: d.flaggedBehaviors ?? [],
      trustLevel: d.trustLevel ?? 'normal',
      teacherNotes: d.teacherNotes,
      updatedAt: d.updatedAt,
    }
  } catch {
    return null
  }
}

export async function upsertSellerMemory(
  entry: Partial<SellerMemoryEntry> & { telegramUserId: number },
  payload: Payload,
): Promise<void> {
  try {
    const existing = await payload.find({
      collection: 'supplier-seller-memory',
      where: { sellerTelegramId: { equals: entry.telegramUserId } },
      limit: 1,
    })
    const now = new Date().toISOString()
    const data: Record<string, unknown> = {
      sellerTelegramId: entry.telegramUserId,
      sellerUsername: entry.username,
      sellerDisplayName: entry.displayName,
      postingStyle: entry.postingStyle,
      reliabilityScore: entry.reliabilityScore,
      typicalCategories: entry.typicalCategories,
      typicalPriceRange: entry.typicalPriceRange,
      commonTerms: entry.commonTerms,
      flaggedBehaviors: entry.flaggedBehaviors,
      teacherNotes: entry.teacherNotes,
      isManual: false,
      updatedAt: now,
    }
    if (existing.docs.length > 0) {
      await payload.update({ collection: 'supplier-seller-memory', id: (existing.docs[0] as any).id, data: data as any })
    } else {
      await payload.create({ collection: 'supplier-seller-memory', data: data as any })
    }
  } catch (err) {
    console.warn('[SupplierScout/memory] upsertSellerMemory error:', err)
  }
}

/** Store Frank's manual seller note via /seller command. */
export async function teachSellerNote(
  sellerTelegramId: number,
  notes: string,
  payload: Payload,
): Promise<{ success: boolean; message: string }> {
  try {
    const existing = await payload.find({
      collection: 'supplier-seller-memory',
      where: { sellerTelegramId: { equals: sellerTelegramId } },
      limit: 1,
    })
    const now = new Date().toISOString()
    if (existing.docs.length > 0) {
      await payload.update({
        collection: 'supplier-seller-memory',
        id: (existing.docs[0] as any).id,
        data: { teacherNotes: notes, isManual: true, updatedAt: now } as any,
      })
    } else {
      await payload.create({
        collection: 'supplier-seller-memory',
        data: { sellerTelegramId, teacherNotes: notes, isManual: true, updatedAt: now } as any,
      })
    }
    return { success: true, message: `✅ Satıcı notu kaydedildi (ID: ${sellerTelegramId})` }
  } catch (err) {
    return { success: false, message: `❌ Hata: ${(err as Error).message}` }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Correction Memory
// ─────────────────────────────────────────────────────────────────────────────

/** Store Frank's correction of a wrong classification. */
export async function storeCorrection(
  correction: Omit<CorrectionMemoryEntry, 'createdAt'>,
  payload: Payload,
): Promise<{ success: boolean }> {
  try {
    await payload.create({
      collection: 'supplier-correction-memory',
      data: {
        ...correction,
        createdAt: new Date().toISOString(),
      } as any,
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}

/** Load recent corrections for injection into classification prompt. */
export async function loadRecentCorrections(
  payload: Payload,
  limit = 10,
): Promise<Array<{ original: string; corrected: string; text: string; reason: string }>> {
  try {
    const result = await payload.find({
      collection: 'supplier-correction-memory',
      where: { appliedToFuture: { equals: true } },
      sort: '-createdAt',
      limit,
    })
    return (result.docs as Array<Record<string, any>>).map(d => ({
      original: d.originalClassification as string,
      corrected: d.correctedClassification as string,
      text: d.originalText as string,
      reason: d.correctionReason as string,
    }))
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trust Score
// ─────────────────────────────────────────────────────────────────────────────

export async function getSellerTrustScore(sellerTelegramId: number, payload: Payload): Promise<number> {
  try {
    const result = await payload.find({
      collection: 'supplier-trust-scores',
      where: { sellerTelegramId: { equals: sellerTelegramId } },
      limit: 1,
    })
    if (result.docs.length > 0) return ((result.docs[0] as any).trustScore as number) ?? 50
    return 50
  } catch {
    return 50
  }
}

export async function incrementSellerStats(
  sellerTelegramId: number,
  field: 'productsCreated' | 'totalPostsSeen',
  payload: Payload,
): Promise<void> {
  try {
    const result = await payload.find({
      collection: 'supplier-trust-scores',
      where: { sellerTelegramId: { equals: sellerTelegramId } },
      limit: 1,
    })
    if (result.docs.length > 0) {
      const doc = result.docs[0] as any
      await payload.update({
        collection: 'supplier-trust-scores',
        id: doc.id,
        data: {
          [field]: ((doc[field] as number) ?? 0) + 1,
          lastSeenAt: new Date().toISOString(),
        } as any,
      })
    } else {
      await payload.create({
        collection: 'supplier-trust-scores',
        data: {
          sellerTelegramId,
          [field]: 1,
          trustScore: 50,
          trustLevel: 'normal',
          lastSeenAt: new Date().toISOString(),
        } as any,
      })
    }
  } catch { /* non-critical */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Log
// ─────────────────────────────────────────────────────────────────────────────

export async function logAction(
  data: Record<string, unknown>,
  payload: Payload,
): Promise<void> {
  try {
    await payload.create({
      collection: 'supplier-actions-log',
      data: {
        ...data,
        createdAt: new Date().toISOString(),
      } as any,
    })
  } catch (err) {
    console.warn('[SupplierScout/memory] logAction failed (non-critical):', err)
  }
}
