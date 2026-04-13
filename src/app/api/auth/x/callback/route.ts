/**
 * X (Twitter) OAuth 2.0 Callback — D-195
 *
 * Completes the OAuth 2.0 PKCE flow:
 *  1. Validates CSRF state against cookie
 *  2. Exchanges authorization code for access_token + refresh_token
 *  3. Stores tokens in AutomationSettings.xTokens via Payload
 *  4. Redirects admin to dashboard with success/error indicator
 *
 * X token lifecycle:
 *  - access_token expires in ~2 hours (7200s)
 *  - refresh_token valid for ~6 months
 *  - Auto-refresh handled by refreshXToken() in channelDispatch.ts
 *
 * Required env vars:
 *   X_CLIENT_ID     — OAuth 2.0 Client ID
 *   X_CLIENT_SECRET — OAuth 2.0 Client Secret (confidential client)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/lib/payload'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl  = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const adminUrl = `${baseUrl}/admin`

  // ── Error path ──────────────────────────────────────────────────────────────
  if (error) {
    console.error(
      `[x/callback] OAuth error from X — error=${error} state=${state ?? '(none)'}`,
    )
    const redirectUrl = new URL(adminUrl)
    redirectUrl.searchParams.set('x_auth', 'error')
    redirectUrl.searchParams.set('x_error', error)
    return NextResponse.redirect(redirectUrl.toString())
  }

  // ── Success path ────────────────────────────────────────────────────────────
  if (!code) {
    console.warn(
      `[x/callback] Called without code or error — params: ${JSON.stringify(Object.fromEntries(searchParams))}`,
    )
    return NextResponse.json(
      { error: 'invalid_callback', message: 'No code or error received.' },
      { status: 400 },
    )
  }

  // ── CSRF validation ─────────────────────────────────────────────────────────
  const storedState = req.cookies.get('x_oauth_state')?.value
  if (!storedState || storedState !== state) {
    console.error(
      `[x/callback] CSRF state mismatch — expected=${storedState ?? '(none)'} got=${state ?? '(none)'}`,
    )
    const redirectUrl = new URL(adminUrl)
    redirectUrl.searchParams.set('x_auth', 'error')
    redirectUrl.searchParams.set('x_error', 'state_mismatch')
    return NextResponse.redirect(redirectUrl.toString())
  }

  // ── Retrieve PKCE code_verifier ─────────────────────────────────────────────
  const codeVerifier = req.cookies.get('x_oauth_verifier')?.value
  if (!codeVerifier) {
    console.error('[x/callback] PKCE code_verifier cookie missing')
    const redirectUrl = new URL(adminUrl)
    redirectUrl.searchParams.set('x_auth', 'error')
    redirectUrl.searchParams.set('x_error', 'missing_verifier')
    return NextResponse.redirect(redirectUrl.toString())
  }

  // ── Token exchange ──────────────────────────────────────────────────────────
  const clientId     = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('[x/callback] X_CLIENT_ID or X_CLIENT_SECRET env var missing')
    const redirectUrl = new URL(adminUrl)
    redirectUrl.searchParams.set('x_auth', 'error')
    redirectUrl.searchParams.set('x_error', 'missing_env_vars')
    return NextResponse.redirect(redirectUrl.toString())
  }

  const redirectUri = `${baseUrl}/api/auth/x/callback`

  try {
    // X API v2 token endpoint — uses Basic Auth for confidential clients
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error(
        `[x/callback] Token exchange failed — status=${tokenResponse.status}`,
        JSON.stringify(tokenData).substring(0, 500),
      )
      const redirectUrl = new URL(adminUrl)
      redirectUrl.searchParams.set('x_auth', 'error')
      redirectUrl.searchParams.set('x_error', tokenData.error ?? 'token_exchange_failed')
      return NextResponse.redirect(redirectUrl.toString())
    }

    // ── Store tokens in AutomationSettings ──────────────────────────────────
    const expiresIn = tokenData.expires_in ?? 7200 // default 2 hours
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
    const connectedAt = new Date().toISOString()

    const payload = await getPayload()
    await payload.updateGlobal({
      slug: 'automation-settings',
      data: {
        xTokens: {
          accessToken:  tokenData.access_token,
          refreshToken: tokenData.refresh_token ?? null,
          expiresAt,
          connectedAt,
        },
      } as any,
    })

    console.log(
      `[x/callback] ✅ X OAuth 2.0 tokens stored — ` +
        `expires_in=${expiresIn}s scope=${tokenData.scope ?? '(none)'} ` +
        `has_refresh=${!!tokenData.refresh_token}`,
    )

    // Clear PKCE cookies
    const clearCookie = 'HttpOnly; Secure; SameSite=Lax; Path=/api/auth/x; Max-Age=0'
    const redirectUrl = new URL(adminUrl)
    redirectUrl.searchParams.set('x_auth', 'success')
    const response = NextResponse.redirect(redirectUrl.toString())
    response.headers.append('Set-Cookie', `x_oauth_state=; ${clearCookie}`)
    response.headers.append('Set-Cookie', `x_oauth_verifier=; ${clearCookie}`)
    return response

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[x/callback] Token exchange exception: ${message}`)
    const redirectUrl = new URL(adminUrl)
    redirectUrl.searchParams.set('x_auth', 'error')
    redirectUrl.searchParams.set('x_error', 'exception')
    return NextResponse.redirect(redirectUrl.toString())
  }
}
