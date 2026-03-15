import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/lib/payload'

/**
 * POST /api/automation/attach-media
 * Downloads a Telegram photo and attaches it to a Payload draft product.
 *
 * Header: X-Automation-Secret: <AUTOMATION_SECRET>
 * Body: { file_id: string, product_id: number }
 *
 * Flow:
 *   1. Get file path from Telegram Bot API (getFile)
 *   2. Download binary from Telegram CDN
 *   3. Create Media document via Payload local API (auto-uploads to Vercel Blob)
 *   4. Append media to product.images array
 */
export async function POST(req: NextRequest) {
  // Auth
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

  const fileId = body.file_id as string
  const productId = body.product_id as number

  if (!fileId || !productId) {
    return NextResponse.json({ error: 'file_id and product_id are required' }, { status: 400 })
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN env var not configured' }, { status: 500 })
  }

  try {
    // Step 1: Resolve Telegram file_id → download URL
    const fileInfoRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`,
    )
    const fileInfo = await fileInfoRes.json()

    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      return NextResponse.json(
        { error: 'Telegram getFile failed', detail: fileInfo.description || fileInfo },
        { status: 502 },
      )
    }

    const filePath: string = fileInfo.result.file_path
    const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`

    // Step 2: Download binary image
    const imageRes = await fetch(downloadUrl)
    if (!imageRes.ok) {
      return NextResponse.json(
        { error: `Failed to download image: HTTP ${imageRes.status}` },
        { status: 502 },
      )
    }

    const imageBuffer = Buffer.from(await imageRes.arrayBuffer())
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg'
    const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `tg-${productId}-${Date.now()}.${ext}`

    // Step 3: Create Media document (Vercel Blob in production)
    const payload = await getPayload()

    const media = await payload.create({
      collection: 'media',
      data: {
        altText: `Telegram product image`,
        product: productId,
        type: 'original',
      },
      file: {
        data: imageBuffer,
        mimetype: contentType,
        name: filename,
        size: imageBuffer.length,
      },
    })

    // Step 4: Append to product.images[] (non-destructive)
    const existingProduct = await payload.findByID({
      collection: 'products',
      id: productId,
    })

    const existingImages: Array<{ image: number }> =
      ((existingProduct as Record<string, unknown>).images as Array<{ image: number }>) || []

    await payload.update({
      collection: 'products',
      id: productId,
      data: {
        images: [...existingImages, { image: media.id }],
      },
    })

    return NextResponse.json(
      {
        status: 'attached',
        media_id: media.id,
        product_id: productId,
        filename: media.filename,
        timestamp: new Date().toISOString(),
      },
      { status: 201 },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const cause = (err as Record<string, unknown>)?.cause
    const causeMsg = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : ''
    console.error('[automation/attach-media] failed:', message, causeMsg)
    return NextResponse.json({ error: message, cause: causeMsg }, { status: 500 })
  }
}
