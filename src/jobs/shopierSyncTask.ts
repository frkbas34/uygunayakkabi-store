/**
 * shopierSyncTask — Payload Jobs Queue task for Shopier product sync
 *
 * Registered in payload.config.ts under jobs.tasks.
 *
 * Triggered by:
 *  - Products.ts afterChange hook (on activation or forceRedispatch)
 *  - Telegram /shopier publish <id> command
 *  - Telegram /shopier republish <id> command
 *  - Telegram /shopier publish-ready (bulk)
 *
 * Status flow:
 *   not_synced → queued (set by caller before enqueuing)
 *             → syncing (set by syncProductToShopier at start)
 *             → synced | error (set by syncProductToShopier at end)
 *
 * Retry policy: 2 retries on thrown error (Payload jobs default backoff).
 * If all retries fail, the job is marked failed and shopierSyncStatus = error.
 */

import type { TaskConfig } from 'payload'

export const shopierSyncTask: TaskConfig<{
  input: {
    /** Payload product ID (string or numeric as string) */
    productId: string
    /** Telegram chat ID to notify on success/failure. Optional — no notification if absent. */
    notifyTelegramChatId?: number
  }
  output: {
    success: boolean
    /** Shopier product ID assigned after successful sync */
    shopierProductId: string
    /** Error message if sync failed (empty string on success) */
    error: string
  }
}> = {
  slug: 'shopier-sync',
  label: 'Shopier Ürün Senkronizasyonu',
  retries: 2,

  inputSchema: [
    { name: 'productId', type: 'text', required: true },
    { name: 'notifyTelegramChatId', type: 'number' },
  ],

  outputSchema: [
    { name: 'success', type: 'checkbox' },
    { name: 'shopierProductId', type: 'text' },
    { name: 'error', type: 'text' },
  ],

  /**
   * If the task throws (network failure, Shopier API error, etc.),
   * Payload retries it up to `retries` times.
   * On final failure, the job is marked failed and shopierSyncStatus = error.
   */
  onFail: async ({ job, req }) => {
    const productId = (job.taskStatus?.['shopier-sync'] as Record<string, unknown> | undefined)
      ?.input
    if (!productId) return

    try {
      // Write error status back — fetch product first to preserve other sourceMeta fields
      const { docs } = await req.payload.find({
        collection: 'products',
        where: { id: { equals: productId } },
        limit: 1,
      })
      if (docs.length === 0) return

      const product = docs[0] as Record<string, unknown>
      const sourceMeta = (product.sourceMeta as Record<string, unknown> | undefined) ?? {}

      await req.payload.update({
        collection: 'products',
        id: productId as string,
        data: {
          sourceMeta: {
            ...sourceMeta,
            shopierSyncStatus: 'error',
            shopierLastError: `Job failed after ${2} retries — check Payload Jobs log`,
            shopierLastSyncAt: new Date().toISOString(),
          },
        },
        context: { isDispatchUpdate: true },
      })

      console.error(`[shopierSyncTask] onFail — product=${productId} all retries exhausted`)
    } catch (err) {
      console.error('[shopierSyncTask] onFail handler error:', err)
    }
  },

  handler: async ({ input, req }) => {
    const { productId, notifyTelegramChatId } = input

    console.log(
      `[shopierSyncTask] handler start — product=${productId}` +
        (notifyTelegramChatId ? ` notify=${notifyTelegramChatId}` : ''),
    )

    // Dynamic import to avoid circular dependency at module load time
    const { syncProductToShopier } = await import('../lib/shopierSync')

    const result = await syncProductToShopier(productId, req.payload, {
      notifyTelegramChatId,
    })

    if (!result.success) {
      // Throwing causes Payload to retry (up to `retries` times)
      throw new Error(result.error ?? 'Shopier sync returned success=false')
    }

    console.log(
      `[shopierSyncTask] handler success — product=${productId} ` +
        `shopierProductId=${result.shopierProductId}`,
    )

    return {
      output: {
        success: true,
        shopierProductId: result.shopierProductId ?? '',
        error: '',
      },
    }
  },
}
