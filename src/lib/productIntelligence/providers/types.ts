/**
 * providers/types.ts — D-222
 *
 * Shared interface that every reverse-image-search provider implements.
 * The orchestrator in `reverseImageSearch.ts` is provider-agnostic and
 * only talks to this interface, so adding a new provider is a single
 * file + a line in `providers/index.ts`.
 */

import type { PiReferenceProduct } from '../types'

export interface ProviderSearchResult {
  ok: boolean
  results: PiReferenceProduct[]
  raw: unknown
  error?: string
  // D-222: DataForSEO is async — when we submit a task but polling times
  // out, we surface `pending: true` + the task id so the operator can
  // regenerate later and the report can warn about incomplete evidence.
  pending?: boolean
  taskId?: string
}

export interface ReverseSearchProvider {
  // Internal key — stable, used in rawProviderData and for callers that
  // need to detect a specific provider. E.g. 'dataforseo_google_lens'.
  name: string
  // Display label — shown to the operator in the Telegram report.
  displayName: string
  // Queue mode (e.g. 'standard' for task-based async, 'live' for sync).
  queue?: string
  // Result depth requested from the provider.
  depth?: number
  // Max images this run will probe. Defaults to 2 per D-222 spec:
  // primary (original) + best supporting (approved/generated).
  maxImages: number
  // Executes a single reverse-image search against the provider.
  search: (imageUrl: string) => Promise<ProviderSearchResult>
}
