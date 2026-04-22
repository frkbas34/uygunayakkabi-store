/**
 * providers/classify.ts — D-222
 *
 * Shared similarity → classification mapping used by every reverse-search
 * provider. Kept in a tiny module to avoid circular imports between the
 * orchestrator (`reverseImageSearch.ts`) and individual provider files.
 *
 * Rule: ordering-based similarity (what most SERP providers give us) is
 * always capped at 85 so the provider alone can never promote a result
 * past `similar_style`. Orchestrator layers additional heuristics on top
 * (e.g. visibleBrand from vision) before picking the final matchType.
 */

import type { PiReferenceClassification } from '../types'

export function classifyBySimilarity(similarity: number | null | undefined): PiReferenceClassification {
  if (similarity == null || isNaN(similarity)) return 'low_confidence'
  if (similarity >= 98) return 'exact_match'
  if (similarity >= 90) return 'high_similarity'
  if (similarity >= 70) return 'similar_style'
  return 'low_confidence'
}
