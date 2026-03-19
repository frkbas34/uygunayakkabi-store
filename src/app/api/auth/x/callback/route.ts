/**
 * X (Twitter) OAuth 2.0 Callback
 *
 * X redirects the user's browser here after they complete the OAuth 2.0 PKCE flow.
 *
 * Register this URL in:
 *   X Developer Portal → Your App → User authentication settings → Callback URI
 *
 * Local dev:    http://localhost:3000/api/auth/x/callback
 * Production:   https://uygunayakkabi.com/api/auth/x/callback
 *
 * ── What X sends ─────────────────────────────────────────────────────────────
 *
 * Success (user approved):
 *   GET /api/auth/x/callback?code={auth_code}&state={state}
 *
 * Failure (user denied):
 *   GET /api/auth/x/callback?error={error_type}&state={state}
 *
 * ── TODO (Token Exchange) ────────────────────────────────────────────────────
 *
 * 1. Validate `state` against stored CSRF value
 *
 * 2. Exchange `code` for access token:
 *    POST https://api.x.com/2/oauth2/token
 *      Content-Type: application/x-www-form-urlencoded
 *      code={code}
 *      &grant_type=authorization_code
 *      &client_id={X_CLIENT_ID}
 *      &redirect_uri=https://uygunayakkabi.com/api/auth/x/callback
 *      &code_verifier={stored_pkce_verifier}
 *    → Returns: { access_token, refresh_token, expires_in, token_type, scope }
 *
 * 3. Store access_token + refresh_token in n8n Variables or secure store
 *
 * 4. X refresh tokens:
 *    POST https://api.x.com/2/oauth2/token
 *      grant_type=refresh_token&refresh_token={refresh_token}&client_id={X_CLIENT_ID}
 *    Tokens expire in ~2 hours; refresh token valid for 6 months.
 *
 * Required env vars (for token exchange — not needed for this minimal handler):
 *   X_CLIENT_ID       — from X Developer Portal → Project → App → Keys
 *   X_CLIENT_SECRET   — from X Developer Portal → Project → App → Keys
 */

import { NextRequest, NextResponse } from 'next/server'

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
  if (code) {
    console.log(
      `[x/callback] Authorization code received from X — ` +
        `state=${state ?? '(none)'} code_length=${code.length} ` +
        '→ Token exchange not yet implemented',
    )

    // TODO: Validate `state` against stored CSRF token
    // TODO: Exchange `code` for access token using X_CLIENT_ID + X_CLIENT_SECRET + PKCE verifier
    // TODO: Store tokens in n8n Variables (X_ACCESS_TOKEN, X_REFRESH_TOKEN)

    const redirectUrl = new URL(adminUrl)
    redirectUrl.searchParams.set('x_auth', 'code_received')
    return NextResponse.redirect(redirectUrl.toString())
  }

  // ── Unknown ─────────────────────────────────────────────────────────────────
  console.warn(
    `[x/callback] Called without code or error — params: ${JSON.stringify(Object.fromEntries(searchParams))}`,
  )

  return NextResponse.json(
    {
      error:   'invalid_callback',
      message: 'No code or error received. This endpoint is for X OAuth 2.0 redirects only.',
    },
    { status: 400 },
  )
}
