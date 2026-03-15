import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/lib/payload'

/**
 * POST /api/automation/products
 * Internal automation endpoint for n8n → Payload product creation.
 * Uses Payload local API — no JWT needed, auth via shared secret header.
 *
 * Header: X-Automation-Secret: <AUTOMATION_SECRET env var>
 * Body: product fields (title required, price, sku, status, etc.)
 */
export async function POST(req: NextRequest) {
  // Auth: shared secret header check
  const secret = req.headers.get('X-Automation-Secret')
  if (!process.env.AUTOMATION_SECRET || secret !== process.env.AUTOMATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate required field
  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  try {
    const payload = await getPayload()

    const product = await payload.create({
      collection: 'products',
      data: {
        title: body.title as string,
        price: typeof body.price === 'number' ? body.price : 0,
        status: (body.status as string) || 'draft',
        source: (body.source as string) || 'n8n',
        ...(body.sku ? { sku: body.sku as string } : {}),
        ...(body.channels ? { channels: body.channels as Record<string, boolean> } : {}),
        ...(body.automationMeta ? { automationMeta: body.automationMeta as Record<string, string> } : {}),
      },
    })

    return NextResponse.json(
      {
        status: 'created',
        product_id: product.id,
        title: product.title,
        slug: (product as Record<string, unknown>).slug,
        workflow: 'n8n-automation',
        timestamp: new Date().toISOString(),
      },
      { status: 201 },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[automation/products] create failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
