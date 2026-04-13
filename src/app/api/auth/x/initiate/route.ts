/**
 * X (Twitter) OAuth 2.0 PKCE Initiate — D-195
 *
 * Starts the X OAuth 2.0 Authorization Code Flow with PKCE.
 * Generates a PKCE code_verifier + code_challenge, stores them in
 * HttpOnly cookies, then redirects to X's authorization endpoint.
 *
 * Usage (admin only — open in browser):
 *   https://uygunayakkabi.com/api/auth/x/initiate
 *   http://localhost:3000/api/auth/x/initiate
 *
 * Required env vars:
 *   X_CLIENT_ID — from X Developer Portal → Your App → OAuth 2.0 Client ID
 *
 * Scopes requested:
 *   tweet.read   — read tweets
 *   tweet.write  — post tweets
 *   users.read   — read user profile (required by X)
 *   offline.access — get refresh_token for auto-renewal
 *
 * After the user approves, X redirects to:
 *   https://uygunayakkabi.com/api/auth/x/callback?code=...&state=...
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
  const clientId = process.env.X_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'X_CLIENT_ID env var is not set' },
      { status: 500 },
    )
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const redirectUri = `${baseUrl}/api/auth/x/callback`

  // Generate PKCE code_verifier (43-128 chars, URL-safe)
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  // Generate code_challenge = BASE64URL(SHA256(code_verifier))
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  // CSRF state token
  const state = crypto.randomBytes(16).toString('hex')

  // X OAuth 2.0 authorization URL
  const scopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access']
  const authUrl = new URL('https://x.com/i/oauth2/authorize')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scopes.join(' '))
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  console.log(
    `[x/initiate] Starting OAuth 2.0 PKCE flow — ` +
      `redirect_uri=${redirectUri} scopes=${scopes.join(',')}`,
  )

  // Store PKCE verifier + state in HttpOnly cookies (10-min TTL)
  const cookieOpts = 'HttpOnly; Secure; SameSite=Lax; Path=/api/auth/x; Max-Age=600'
  const response = NextResponse.redirect(authUrl.toString())
  response.headers.append('Set-Cookie', `x_oauth_state=${state}; ${cookieOpts}`)
  response.headers.append('Set-Cookie', `x_oauth_verifier=${codeVerifier}; ${cookieOpts}`)

  return response
}
