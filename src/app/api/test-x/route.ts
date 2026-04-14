/**
 * TEMPORARY diagnostic endpoint — D-195c debug
 * Tests X OAuth 1.0a credentials by calling GET /2/users/me
 * DELETE THIS FILE after debugging is complete.
 */
import { NextResponse } from 'next/server'
import crypto from 'crypto'

function generateOAuth1Header(
  method: string, url: string,
  apiKey: string, apiSecret: string,
  accessToken: string, accessTokenSecret: string,
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  }
  const paramString = Object.keys(oauthParams).sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join('&')
  const baseString = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(paramString)].join('&')
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')
  oauthParams['oauth_signature'] = signature
  const headerParts = Object.keys(oauthParams).sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ')
  return `OAuth ${headerParts}`
}

export async function GET() {
  const apiKey = process.env.X_API_KEY ?? ''
  const apiSecret = process.env.X_API_SECRET ?? ''
  const accessToken = process.env.X_ACCESS_TOKEN ?? ''
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET ?? ''

  const diagnostics: Record<string, unknown> = {
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret,
    hasAccessToken: !!accessToken,
    hasAccessTokenSecret: !!accessTokenSecret,
    apiKeyPrefix: apiKey.substring(0, 4) + '...',
    apiKeyLength: apiKey.length,
    accessTokenPrefix: accessToken.substring(0, 8) + '...',
    accessTokenLength: accessToken.length,
  }

  // Test 1: GET /2/users/me (read-only, verifies credentials)
  try {
    const readUrl = 'https://api.x.com/2/users/me'
    const readAuth = generateOAuth1Header('GET', readUrl, apiKey, apiSecret, accessToken, accessTokenSecret)
    const readRes = await fetch(readUrl, {
      headers: { Authorization: readAuth },
    })
    const readData = await readRes.json()
    diagnostics.readTest = {
      status: readRes.status,
      ok: readRes.ok,
      data: readData,
    }
  } catch (err) {
    diagnostics.readTest = { error: err instanceof Error ? err.message : String(err) }
  }

  // Test 2: POST /2/tweets with a test tweet (only if read succeeded)
  if ((diagnostics.readTest as any)?.ok) {
    try {
      const tweetUrl = 'https://api.x.com/2/tweets'
      const tweetAuth = generateOAuth1Header('POST', tweetUrl, apiKey, apiSecret, accessToken, accessTokenSecret)
      const tweetText = `🧪 Test tweet from UygunAyakkabi automation — ${new Date().toISOString().substring(0, 16)}`
      const tweetRes = await fetch(tweetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: tweetAuth,
        },
        body: JSON.stringify({ text: tweetText }),
      })
      const tweetData = await tweetRes.json()
      diagnostics.writeTest = {
        status: tweetRes.status,
        ok: tweetRes.ok,
        data: tweetData,
        tweetText,
      }
    } catch (err) {
      diagnostics.writeTest = { error: err instanceof Error ? err.message : String(err) }
    }
  }

  return NextResponse.json(diagnostics, { status: 200 })
}

