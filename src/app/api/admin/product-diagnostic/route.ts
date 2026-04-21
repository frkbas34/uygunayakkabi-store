import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

/**
 * D-218: One-shot admin-triggered product diagnostic endpoint.
 *
 * Why:
 *   When a product fails content generation or audit, the canonical error lives
 *   in `bot-events` (eventType: 'content.failed' | 'audit.failed' | ...). The
 *   admin panel doesn't surface this inline, and querying Payload REST requires
 *   a live admin session cookie. This endpoint returns a compact diagnostic
 *   snapshot (workflow statuses + recent bot-events) guarded by the same secret
 *   header used by D-214 and D-215, so we can debug without a valid session.
 *
 * Auth:
 *   x-admin-secret: $GENERATE_API_KEY_SECRET (same pattern as /api/admin/shopier-resync)
 *
 * Usage:
 *   GET /api/admin/product-diagnostic?productId=296
 *     Header: x-admin-secret: <secret>
 *
 * Intended to be a transient tool. Safe to remove after debugging completes.
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
  if (!productIdParam) {
    return NextResponse.json({ error: 'Provide ?productId=<id>' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config: configPromise })

    const product = (await payload.findByID({
      collection: 'products',
      id: productIdParam,
      depth: 0,
    })) as any

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const events = await payload.find({
      collection: 'bot-events',
      where: { product: { equals: productIdParam } },
      sort: '-createdAt',
      limit: 25,
      depth: 0,
    })

    const commercePack = product?.content?.commercePack ?? null
    const discoveryPack = product?.content?.discoveryPack ?? null

    return NextResponse.json({
      productId: product.id,
      title: product.title,
      category: product.category,
      status: product.status,
      workflow: {
        workflowStatus: product?.workflow?.workflowStatus,
        contentStatus: product?.workflow?.contentStatus,
        auditStatus: product?.workflow?.auditStatus,
        publishStatus: product?.workflow?.publishStatus,
        stockState: product?.workflow?.stockState,
        sellable: product?.workflow?.sellable,
        lastHandledByBot: product?.workflow?.lastHandledByBot,
      },
      commercePack: commercePack
        ? {
            present: true,
            keys: Object.keys(commercePack),
            titleSeo: commercePack?.titleSeo,
            primaryKeyword: commercePack?.primaryKeyword,
            shortDescriptionLen: commercePack?.shortDescription?.length ?? null,
          }
        : { present: false },
      discoveryPack: discoveryPack
        ? {
            present: true,
            keys: Object.keys(discoveryPack),
            metaTitleLen: discoveryPack?.metaTitle?.length ?? null,
            metaDescriptionLen: discoveryPack?.metaDescription?.length ?? null,
            keywordsCount: Array.isArray(discoveryPack?.keywords)
              ? discoveryPack.keywords.length
              : null,
          }
        : { present: false },
      sourceMeta: {
        shopierProductId: product?.sourceMeta?.shopierProductId ?? null,
      },
      recentEvents: events.docs.map((e: any) => ({
        id: e.id,
        eventType: e.eventType,
        status: e.status,
        sourceBot: e.sourceBot,
        createdAt: e.createdAt,
        notes: e.notes,
        payloadError: e.payload?.error ?? null,
        processedAt: e.processedAt,
      })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
