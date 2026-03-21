/**
 * Instagram OAuth Callback — Step 17 (Complete Token Exchange)
 *
 * Meta redirects the admin's browser here after they approve the Instagram
 * Business Login consent screen. This handler completes the full OAuth flow:
 *
 *   1. Validate CSRF state (cookie vs query param)
 *   2. Exchange authorization code for short-lived user access token
 *   3. Exchange short-lived token for long-lived token (~60 days)
 *   4. Retrieve Instagram Business Account ID via /me/accounts
 *      (NOT /me — that returns the Facebook User ID, which is different)
 *   5. Store accessToken + instagramUserId in AutomationSettings Payload global
 *   6. Redirect admin to /admin?instagram_auth=connected
 *
 * All steps are server-side only. The token is never exposed to the browser.
 * Errors redirect to /admin?instagram_auth=error&instagram_error={code}.
 *
 * ── Why /me/accounts, not /me ─────────────────────────────────────────────
 *   /me?fields=id returns the Facebook USER ID.
 *   The Instagram Graph API (/{ig-user-id}/media) requires the INSTAGRAM
 *   BUSINESS ACCOUNT ID, which lives at:
 *     GET /me/accounts?fields=instagram_business_account
 *   → page.instagram_business_account.id  ← this is what n8n needs
 *
 * ── Storage: Payload AutomationSettings global ────────────────────────────
 *   Replaces n8n Variables (locked on current plan).
 *   Written to: automation-settings.instagramTokens.{accessToken, userId, ...}
 *   Read by: Products.ts afterChange → buildDispatchPayload → n8n webhook body
 *   n8n workflow reads: $json.instagramAccessToken / $json.instagramUserId
 *
 * ── Registered redirect URI in Meta Developer Portal ─────────────────────
 *   Local:       http://localhost:3000/api/auth/instagram/callback
 *   Production:  https://uygunayakkabi.com/api/auth/instagram/callback
 *
 * ── Required env vars ────────────────────────────────────────────────────
 *   INSTAGRAM_APP_ID       — Facebook App ID (Settings → Basic in Meta portal)
 *   INSTAGRAM_APP_SECRET   — Facebook App Secret
 *   NEXT_PUBLIC_SERVER_URL — Used to construct redirect_uri
 *
 * ── CSRF protection ──────────────────────────────────────────────────────
 *   State generated in /initiate, stored in ig_oauth_state HttpOnly cookie.
 *   Verified here before any token exchange. Cookie deleted immediately after.
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'

// ── Payload global write ──────────────────────────────────────────────────────
/**
 * Persist the Instagram access token and user ID into the AutomationSettings
 * Payload global. This replaces the previous n8n Variables write-back
 * (n8n Variables are locked on the current plan).
 *
 * The tokens are then injected into the webhook dispatch payload by
 * Products.ts → buildDispatchPayload(), so n8n reads them from $json,
 * not from $vars.
 */
async function storeTokensInPayload(
  accessToken: string,
  userId: string,
  expiresIn: number | null,
): Promise<void> {
  const payload = await getPayload({ config })

  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null

  await payload.updateGlobal({
    slug: 'automation-settings',
    data: {
      instagramTokens: {
        accessToken,
        userId,
        connectedAt: new Date().toISOString(),
        ...(expiresAt ? { expiresAt } : {}),
      },
    } as Record<string, unknown>,
  })

  console.log(
    `[instagram/callback] Tokens stored in Payload AutomationSettings — ` +
      `userId=${userId} expiresAt=${expiresAt ?? 'unknown'}`,
  )
}

// ── Error redirect helper ─────────────────────────────────────────────────────
function errorRedirect(
  adminUrl: string,
  errorCode: string,
  clearStateCookie = false,
): NextResponse {
  const url = new URL(adminUrl)
  url.searchParams.set('instagram_auth', 'error')
  url.searchParams.set('instagram_error', errorCode)
  const res = NextResponse.redirect(url.toString())
  if (clearStateCookie) res.cookies.delete('ig_oauth_state')
  return res
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)

  const code             = searchParams.get('code')
  const state            = searchParams.get('state')
  const error            = searchParams.get('error')
  const errorReason      = searchParams.get('error_reason')
  const errorDescription = searchParams.get('error_description')

  const baseUrl     = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const adminUrl    = `${baseUrl}/admin`
  // redirect_uri used in code exchange MUST match what was sent in the authorization request
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`

  // ── Meta returned an error ─────────────────────────────────────────────────
  if (error) {
    console.error(
      '[instagram/callback] OAuth error from Meta — ' +
        `error=${error} reason=${errorReason ?? '(none)'} description=${errorDescription ?? '(none)'}`,
    )
    return errorRedirect(adminUrl, error, true)
  }

  // ── No code — bad request ──────────────────────────────────────────────────
  if (!code) {
    console.warn(
      '[instagram/callback] Called without code or error — ' +
        `params: ${JSON.stringify(Object.fromEntries(searchParams))}`,
    )
    return NextResponse.json(
      {
        error:   'invalid_callback',
        message: 'No code or error parameter received. ' +
                 'Navigate to /api/auth/instagram/initiate to start the OAuth flow.',
      },
      { status: 400 },
    )
  }

  // ── Step 1: CSRF state validation ─────────────────────────────────────────
  const storedState = req.cookies.get('ig_oauth_state')?.value

  if (!storedState) {
    console.error(
      '[instagram/callback] ig_oauth_state cookie is missing. ' +
        'Possible causes: flow not started via /initiate, cookie expired (>10 min), or CSRF attempt.',
    )
    return errorRedirect(adminUrl, 'state_missing')
  }

  if (state !== storedState) {
    console.error(
      '[instagram/callback] State mismatch — aborting token exchange. ' +
        `received=${String(state).slice(0, 8)}… stored=${storedState.slice(0, 8)}…`,
    )
    return errorRedirect(adminUrl, 'state_mismatch', true)
  }

  console.log('[instagram/callback] State validated. Starting Meta token exchange...')

  // ── Guard: app credentials ─────────────────────────────────────────────────
  const appId     = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET

  if (!appId || !appSecret) {
    console.error(
      '[instagram/callback] INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET not set. ' +
        'Set both in Vercel Dashboard → Environment Variables.',
    )
    return errorRedirect(adminUrl, 'app_credentials_missing', true)
  }

  try {
    // ── Step 2: code → short-lived user access token ──────────────────────
    const shortParams = new URLSearchParams({
      client_id:     appId,
      client_secret: appSecret,
      redirect_uri:  redirectUri,
      code,
    })

    const shortRes  = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?${shortParams.toString()}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    const shortData = (await shortRes.json()) as Record<string, unknown>

    if (!shortRes.ok || typeof shortData.access_token !== 'string') {
      const apiErr = shortData.error as Record<string, unknown> | undefined
      throw new Error(
        `Short-lived token exchange failed (HTTP ${shortRes.status}): ` +
          String(apiErr?.message ?? JSON.stringify(shortData).slice(0, 300)),
      )
    }

    const shortLivedToken = shortData.access_token
    console.log('[instagram/callback] Short-lived token obtained. Exchanging for long-lived...')

    // ── Step 3: short-lived → long-lived token ────────────────────────────
    const longParams = new URLSearchParams({
      grant_type:        'fb_exchange_token',
      client_id:         appId,
      client_secret:     appSecret,
      fb_exchange_token: shortLivedToken,
    })

    const longRes  = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?${longParams.toString()}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    const longData = (await longRes.json()) as Record<string, unknown>

    if (!longRes.ok || typeof longData.access_token !== 'string') {
      const apiErr = longData.error as Record<string, unknown> | undefined
      throw new Error(
        `Long-lived token exchange failed (HTTP ${longRes.status}): ` +
          String(apiErr?.message ?? JSON.stringify(longData).slice(0, 300)),
      )
    }

    const longLivedToken = longData.access_token
    const expiresIn      = typeof longData.expires_in === 'number' ? longData.expires_in : null

    console.log(
      `[instagram/callback] Long-lived token obtained — ` +
        `expires_in=${expiresIn ?? 'unknown'}s (~${expiresIn ? Math.round(expiresIn / 86400) : '?'} days).`,
    )

    // ── Step 4: get Instagram Business Account ID via /me/accounts ────────
    //
    // IMPORTANT: /me?fields=id returns the FACEBOOK User ID, which is NOT
    // what the Instagram Graph API needs. The Instagram Business Account ID
    // is a separate numeric ID found by traversing:
    //   user → Facebook Pages → instagram_business_account.id
    //
    // The n8n workflow calls:
    //   POST /{ig-user-id}/media          (Instagram Graph API)
    //   POST /{ig-user-id}/media_publish
    // ...where {ig-user-id} must be the Instagram Business Account ID.
    const accountsParams = new URLSearchParams({
      fields:       'name,access_token,instagram_business_account',
      access_token: longLivedToken,
    })

    const accountsRes  = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?${accountsParams.toString()}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    const accountsData = (await accountsRes.json()) as Record<string, unknown>

    if (!accountsRes.ok) {
      const apiErr = accountsData.error as Record<string, unknown> | undefined
      throw new Error(
        `/me/accounts failed (HTTP ${accountsRes.status}): ` +
          String(apiErr?.message ?? JSON.stringify(accountsData).slice(0, 300)),
      )
    }

    // Find the first Facebook Page that has a linked Instagram Business Account
    const pages = accountsData.data as Array<{
      id?: string
      name?: string
      access_token?: string
      instagram_business_account?: { id: string }
    }> | undefined

    const linkedPage = pages?.find((p) => p.instagram_business_account?.id)

    if (!linkedPage?.instagram_business_account?.id) {
      throw new Error(
        'No Instagram Business Account linked to any Facebook Page on this account. ' +
          `Pages found: ${pages?.length ?? 0}. ` +
          'Make sure your Instagram account is a Business or Creator account linked to a Facebook Page.',
      )
    }

    const instagramUserId = linkedPage.instagram_business_account.id
    const pageName        = linkedPage.name ?? '(unknown page)'

    console.log(
      `[instagram/callback] Instagram Business Account resolved — ` +
        `instagramUserId=${instagramUserId} via page="${pageName}"`,
    )

    // ── Step 5: store in Payload AutomationSettings global ────────────────
    // Replaces n8n Variables write-back (Variables are locked on current plan).
    // Products.ts dispatch reads these from settings snapshot and injects them
    // into the n8n webhook payload body so n8n reads $json.instagramAccessToken.
    await storeTokensInPayload(longLivedToken, instagramUserId, expiresIn)

    console.log(
      `[instagram/callback] ✅ Step 17 complete — ` +
        `tokens stored in Payload global. instagramUserId=${instagramUserId}`,
    )

    // ── Step 6: redirect admin to success ────────────────────────────────
    const successUrl = new URL(adminUrl)
    successUrl.searchParams.set('instagram_auth', 'connected')
    successUrl.searchParams.set('instagram_user_id', instagramUserId)
    successUrl.searchParams.set('instagram_page', pageName)

    const finalRes = NextResponse.redirect(successUrl.toString())
    finalRes.cookies.delete('ig_oauth_state')
    return finalRes

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[instagram/callback] Token exchange failed — ${message}`)
    return errorRedirect(adminUrl, 'token_exchange_failed', true)
  }
}
