/**
 * Instagram OAuth Callback — Step 16+
 *
 * Meta redirects the user's browser here after they complete the
 * Instagram Business Login flow in Meta Developer Portal.
 *
 * Register this exact URL in:
 *   Meta Developer Portal → Your App → Instagram Business Login → Redirect URLs
 *
 * Local dev:    http://localhost:3000/api/auth/instagram/callback
 * Production:   https://uygunayakkabi.com/api/auth/instagram/callback
 *
 * ── What Meta sends ──────────────────────────────────────────────────────────
 *
 * Success (user approved):
 *   GET /api/auth/instagram/callback?code={auth_code}&state={state}
 *
 * Failure (user denied or error):
 *   GET /api/auth/instagram/callback
 *     ?error={code}
 *     &error_reason={reason}
 *     &error_description={human_readable_description}
 *
 * ── What this handler does (minimal safe implementation) ─────────────────────
 *
 * - Receives and validates the presence of code or error params
 * - Logs server-side for debugging (never echoes code to browser)
 * - Redirects to /admin with a query flag indicating outcome
 * - Does NOT crash on missing or unexpected params
 *
 * ── TODO (Step 17 — Token Exchange) ──────────────────────────────────────────
 *
 * When ready to complete the full OAuth flow, this handler should:
 *
 * 1. Validate `state` against a stored CSRF token (use a short-lived DB or Redis entry)
 *
 * 2. Exchange `code` for a short-lived user access token:
 *    POST https://graph.facebook.com/v21.0/oauth/access_token
 *      ?client_id={INSTAGRAM_APP_ID}
 *      &client_secret={INSTAGRAM_APP_SECRET}
 *      &redirect_uri=https://uygunayakkabi.com/api/auth/instagram/callback
 *      &code={code}
 *    → Returns: { access_token, token_type }  (short-lived ~1hr)
 *
 * 3. Exchange short-lived token for long-lived token (60-day Page Access Token):
 *    GET https://graph.facebook.com/v21.0/oauth/exchange_token
 *      ?grant_type=fb_exchange_token
 *      &client_id={INSTAGRAM_APP_ID}
 *      &client_secret={INSTAGRAM_APP_SECRET}
 *      &fb_exchange_token={short_lived_token}
 *    → Returns: { access_token, token_type, expires_in }
 *
 * 4. Fetch the Instagram User ID:
 *    GET https://graph.facebook.com/v21.0/me
 *      ?fields=id,name
 *      &access_token={long_lived_token}
 *    → Returns: { id, name }  (id = INSTAGRAM_USER_ID for n8n)
 *
 * 5. Store results securely:
 *    - INSTAGRAM_ACCESS_TOKEN → n8n Variables (Settings → Variables in n8n UI)
 *    - INSTAGRAM_USER_ID → n8n Variables
 *    - (Or store in Payload DB / a secrets manager for programmatic access)
 *
 * Required env vars for token exchange (not needed for this minimal handler):
 *   INSTAGRAM_APP_ID       — Facebook App ID (Settings → Basic in Meta portal)
 *   INSTAGRAM_APP_SECRET   — Facebook App Secret (Settings → Basic in Meta portal)
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const code             = searchParams.get('code')
  const state            = searchParams.get('state')
  const error            = searchParams.get('error')
  const errorReason      = searchParams.get('error_reason')
  const errorDescription = searchParams.get('error_description')

  // Base URL for redirects — already present in the project for media URLs
  const baseUrl  = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const adminUrl = `${baseUrl}/admin`

  // ── Error path — user denied or Meta returned an error ─────────────────────
  if (error) {
    console.error(
      '[instagram/callback] OAuth error received from Meta — ' +
        `error=${error} reason=${errorReason ?? '(none)'} ` +
        `description=${errorDescription ?? '(none)'}`,
    )

    const redirectUrl = new URL(adminUrl)
    redirectUrl.searchParams.set('instagram_auth', 'error')
    redirectUrl.searchParams.set('instagram_error', error)
    // human-readable reason forwarded as query param for admin display
    if (errorReason) redirectUrl.searchParams.set('instagram_error_reason', errorReason)

    return NextResponse.redirect(redirectUrl.toString())
  }

  // ── Success path — authorization code received ──────────────────────────────
  if (code) {
    // Log server-side only — NEVER expose the code to the browser
    console.log(
      '[instagram/callback] Authorization code received from Meta — ' +
        `state=${state ?? '(none)'} code_length=${code.length} ` +
        '→ Token exchange not yet implemented (Step 17)',
    )

    // TODO (Step 17): Validate `state` against a stored CSRF token here
    //   to prevent cross-site request forgery before proceeding with token exchange.

    // TODO (Step 17): Exchange `code` for access token using INSTAGRAM_APP_ID
    //   and INSTAGRAM_APP_SECRET — see full instructions in file header above.

    const redirectUrl = new URL(adminUrl)
    redirectUrl.searchParams.set('instagram_auth', 'code_received')
    // Success: redirect admin to see the result
    // After Step 17 token exchange, this would redirect with 'connected' status instead
    return NextResponse.redirect(redirectUrl.toString())
  }

  // ── Unknown / malformed callback ────────────────────────────────────────────
  // This should not occur in normal Meta OAuth flows.
  console.warn(
    '[instagram/callback] Called without code or error params. ' +
      `Params received: ${JSON.stringify(Object.fromEntries(searchParams))}`,
  )

  return NextResponse.json(
    {
      error:   'invalid_callback',
      message: 'No code or error parameter received. ' +
               'This endpoint is for Meta Instagram OAuth redirects only.',
    },
    { status: 400 },
  )
}
