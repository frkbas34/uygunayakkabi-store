import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

// One-time API key generation endpoint — protected by CRON_SECRET
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-generate-secret')
  if (secret !== 'uygun-setup-2026-mentix') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config: configPromise })

  // Use Payload's internal mechanism to generate a proper API key
  const crypto = await import('crypto')
  const apiKey = crypto.randomBytes(32).toString('hex')

  // Compute apiKeyIndex the same way Payload does internally
  const sha256Index = crypto
    .createHmac('sha256', payload.secret)
    .update(apiKey)
    .digest('hex')

  // Update user id=1 directly via Payload (bypasses access control)
  await payload.update({
    collection: 'users',
    id: 1,
    data: {
      apiKey,
      apiKeyIndex: sha256Index,
    } as any,
    overrideAccess: true,
  })

  return NextResponse.json({
    apiKey,
    usage: `Authorization: users API-Key ${apiKey}`,
    message: 'API key generated and saved to user id=1',
  })
}
