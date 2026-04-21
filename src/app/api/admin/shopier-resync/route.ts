import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { syncProductToShopier } from '@/lib/shopierSync'

/**
 * D-214: One-shot admin-triggered Shopier re-sync endpoint.
 *
 * Introduced as the shortest safe way to re-sync products whose Shopier record
 * was created while D-213 was still unfixed (selections Map silently empty →
 * products published without the `Numara` variation). Secret-guarded via
 * GENERATE_API_KEY_SECRET, same pattern as /api/generate-api-key.
 *
 * Usage:
 *   GET /api/admin/shopier-resync?productId=294
 *     Header: x-admin-secret: $GENERATE_API_KEY_SECRET
 *
 *   GET /api/admin/shopier-resync?all=true
 *     Re-syncs every product whose sourceMeta.shopierProductId is set.
 *
 * Responds with per-product sync result (ok / error / shopierProductUrl).
 *
 * Intended to be a transient tool. Safe to remove after backfill completes.
 */
export async function GET(req: NextRequest) {
  const expectedSecret = process.env.GENERATE_API_KEY_SECRET
  if (!expectedSecret) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  const secret = req.headers.get('x-admin-secret')
  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const productIdParam = searchParams.get('productId')
  const allFlag = searchParams.get('all') === 'true'

  if (!productIdParam && !allFlag) {
    return NextResponse.json(
      { error: 'Provide either ?productId=<id> or ?all=true' },
      { status: 400 },
    )
  }

  try {
    const payload = await getPayload({ config: configPromise })

    if (productIdParam) {
      const result = await syncProductToShopier(productIdParam, payload as any)
      return NextResponse.json({
        productId: productIdParam,
        result,
      })
    }

    // all=true → find every product with an existing shopierProductId
    const { docs } = await payload.find({
      collection: 'products',
      where: {
        'sourceMeta.shopierProductId': { exists: true },
      },
      limit: 500,
      depth: 0,
    })

    const results: Array<{ productId: string | number; ok: boolean; note?: string }> = []
    for (const doc of docs) {
      const pid = (doc as Record<string, unknown>).id as string | number
      try {
        const r = await syncProductToShopier(pid, payload as any)
        results.push({
          productId: pid,
          ok: r.success,
          note: r.success ? r.shopierProductUrl : r.error,
        })
      } catch (err: any) {
        results.push({ productId: pid, ok: false, note: err?.message ?? 'threw' })
      }
    }

    return NextResponse.json({
      total: results.length,
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
