/**
 * Instagram OAuth Initiate — Step 17
 *
 * Starts the Meta Instagram Business Login OAuth 2.0 flow.
 * Generates a cryptographically random CSRF state token, stores it in
 * a short-lived HttpOnly cookie, then redirects the admin's browser to
 * the Meta OAuth consent screen.
 *
 * Usage (admin only — open in browser):
 *   https://uygunayakkabi.com/api/auth/instagram/initiate
 *   http://localhost:3000/api/auth/instagram/initiate
 *
 * Required env var:
 *   INSTAGRAM_APP_ID — Facebook App ID from developers.facebook.com
 *
 * After the user approves, Meta redirects to:
 *   https://uygunayakkabi.com/api/auth/instagram/callback?code=...&state=...
 *
 * Scopes requested:
 *   instagram_basic             — read account info + verify access
 *   instagram_content_publish   — publish media to the connected Business account
 *   pages_show_list             — list Facebook Pages (required to find the linked Page)
 *   pages_read_engagement       — read Page engagement (required for token validation)
 *   pages_manage_posts          — create posts and upload photos to Facebook Pages
 *
 * CSRF protection:
 *   state = 32-byte cryptographically random hex string
 *   Stored in ig_oauth_state HttpOnly cookie (10-minute TTL)
 *   Verified in callback before any token exchange begins
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(): Promise<NextResponse> {
  const appId = process.env.INSTAGRAM_APP_ID

  if (!appId) {
    // Config error — do not expose in browser, return 500 with safe message
    console.error('[instagram/initiate] INSTAGRAM_APP_ID env var is not configured')
    return NextResponse.json(
      { error: 'instagram_not_configured', message: 'Instagram App ID is not configured. Set INSTAGRAM_APP_ID in Vercel env vars.' },
      { status: 500 },
    )
  }

  const baseUrl     = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`

  // Generate cryptographically random state token for CSRF protection
  const state = crypto.randomBytes(32).toString('hex')

  // Build Meta OAuth consent URL
  // Using Facebook Graph v21.0 dialog — Instagram Business Login uses the Facebook OAuth endpoint
  const oauthUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
  oauthUrl.searchParams.set('client_id', appId)
  oauthUrl.searchParams.set('redirect_uri', redirectUri)
  oauthUrl.searchParams.set('scope', [
    'instagram_basic',
    'instagram_content_publish',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
  ].join(','))
  oauthUrl.searchParams.set('response_type', 'code')
  oauthUrl.searchParams.set('state', state)

  console.log(
    `[instagram/initiate] Redirecting to Meta OAuth — redirect_uri=${redirectUri} ` +
      `state_length=${state.length}`,
  )

  const response = NextResponse.redirect(oauthUrl.toString())

  // Store state in HttpOnly cookie so callback can verify it (CSRF protection)
  // sameSite=lax allows the Meta redirect to carry it back to our domain
  response.cookies.set('ig_oauth_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600, // 10 minutes — OAuth flow must complete within this window
    path:     '/',
  })

  return response
}
