import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import crypto from 'crypto'

// One-time API key generation endpoint
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-generate-secret')
  if (secret !== 'uygun-setup-2026-mentix') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getPayload({ config: configPromise })
    const apiKey = crypto.randomBytes(32).toString('hex')

    // Let Payload handle encryption + apiKeyIndex computation via its own hooks
    await payload.update({
      collection: 'users',
      id: 1,
      data: {
        enableAPIKey: true,
        apiKey,
      },
      overrideAccess: true,
    })

    return NextResponse.json({
      apiKey,
      usage: `Authorization: users API-Key ${apiKey}`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
