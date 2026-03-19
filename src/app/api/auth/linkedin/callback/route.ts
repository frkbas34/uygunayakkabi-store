/**
 * LinkedIn OAuth 2.0 Callback
 *
 * LinkedIn redirects the user's browser here after they complete the OAuth flow.
 *
 * Register this URL in:
 *   LinkedIn Developer Portal → Your App → Auth → Authorized redirect URLs
 *
 * Local dev:    http://localhost:3000/api/auth/linkedin/callback
 * Production:   https://uygunayakkabi.com/api/auth/linkedin/callback
 *
 * ── What LinkedIn sends ──────────────────────────────────────────────────────
 *
 * Success (user approved):
 *   GET /api/auth/linkedin/callback?code={auth_code}&state={state}
 *
 * Failure (user denied):
 *   GET /api/auth/linkedin/callback?error={error}&error_description={description}&state={state}
 *
 * ── TODO (Token Exchange) ────────────────────────────────────────────────────
 *
 * 1. Validate `state` against stored CSRF value
 *
 * 2. Exchange `code` for access token:
 *    POST https://www.linkedin.com/oauth/v2/accessToken
 *      Content-Type: application/x-www-form-urlencoded
 *      grant_type=authorization_code
 *      &code={code}
 *      &client_id={LINKEDIN_CLIENT_ID}
 *      &client_secret={LINKEDIN_CLIENT_SECRET}
 *      &redirect_uri=https://uygunayakkabi.com/api/auth/linkedin/callback
 *    → Returns: { access_token, expires_in, refresh_token, refresh_token_expires_in }
 *
 * 3. Fetch user/org info:
 *    GET https://api.linkedin.com/v2/userinfo
 *      Authorization: Bearer {access_token}
 *    → Returns: { sub, name, email, ... }
 *
 * 4. Store access_token + refresh_token in n8n Variables or secure store
 *
 * 5. For Organization posting:
 *    - Needs LINKEDIN_ORGANIZATION_ID (numeric org ID)
 *    - App must have `w_organization_social` scope (Community Management API)
 *    - Posting endpoint: POST https://api.linkedin.com/rest/posts
 *
 * 6. For Personal posting:
 *    - Needs `w_member_social` scope
 *    - author = "urn:li:person:{sub}"
 *
 * Token lifespan:
 *   Access token: 60 days
 *   Refresh token: ~1 year
 *   Refresh: POST /oauth/v2/accessToken?grant_type=refresh_token&refresh_token=...
 *
 * Required env vars (for token exchange — not needed for this minimal handler):
 *   LINKEDIN_CLIENT_ID      — from LinkedIn Developer Portal → App → Auth
 *   LINKEDIN_CLIENT_SECRET   — from LinkedIn Developer Portal → App → Auth
 *   LINKEDIN_ORGANIZATION_ID — numeric ID of your LinkedIn Company Page (for org posting)
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const code             = searchParams.get('code')
  const state            = searchParams.get('state')
  const error            = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const baseUrl  = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const adminUrl = `${baseUrl}/admin`

  // ── Error path ──────────────────────────────────────────────────────────────
  if (error) {
    console.error(
      `[linkedin/callback] OAuth error from LinkedIn — ` +
        `error=${error} description=${errorDescription ?? '(none)'} state=${state ?? '(none)'}`,
    )

    const redirectUrl = new URL(adminUrl)
    redirectUrl.searchParams.set('linkedin_auth', 'error')
    redirectUrl.searchParams.set('linkedin_error', error)
    return NextResponse.redirect(redirectUrl.toString())
  }

  // ── Success path ────────────────────────────────────────────────────────────
  if (code) {
    console.log(
      `[linkedin/callback] Authorization code received from LinkedIn — ` +
        `state=${state ?? '(none)'} code_length=${code.length} ` +
        '→ Token exchange not yet implemented',
    )

    // TODO: Validate `state` against stored CSRF token
    // TODO: Exchange `code` for access token using LINKEDIN_CLIENT_ID + LINKEDIN_CLIENT_SECRET
    // TODO: Fetch user/org info using the access token
    // TODO: Store tokens in n8n Variables (LINKEDIN_ACCESS_TOKEN, LINKEDIN_REFRESH_TOKEN)

    const redirectUrl = new URL(adminUrl)
    redirectUrl.searchParams.set('linkedin_auth', 'code_received')
    return NextResponse.redirect(redirectUrl.toString())
  }

  // ── Unknown ─────────────────────────────────────────────────────────────────
  console.warn(
    `[linkedin/callback] Called without code or error — params: ${JSON.stringify(Object.fromEntries(searchParams))}`,
  )

  return NextResponse.json(
    {
      error:   'invalid_callback',
      message: 'No code or error received. This endpoint is for LinkedIn OAuth redirects only.',
    },
    { status: 400 },
  )
}
