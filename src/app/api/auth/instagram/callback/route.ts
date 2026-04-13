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
        // D-188b: facebookPageId NOT stored here — Neon push:true doesn't create
        // the column. Use INSTAGRAM_PAGE_ID env var instead (injected in Products.ts).
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

  // ── Step 2: code → short-lived user access token ────────────────────────
  const shortParams = new URLSearchParams({
    client_id:     appId,
    client_secret: appSecret,
    redirect_uri:  redirectUri,
    code,
  })

  let shortData: Record<string, unknown>
  try {
    const shortRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?${shortParams.toString()}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    shortData = (await shortRes.json()) as Record<string, unknown>

    if (!shortRes.ok || typeof shortData.access_token !== 'string') {
      const apiErr = shortData.error as Record<string, unknown> | undefined
      const msg = String(apiErr?.message ?? JSON.stringify(shortData).slice(0, 200))
      console.error(`[instagram/callback] Step 2 failed — ${msg}`)
      return errorRedirect(adminUrl, `step2_${String(apiErr?.code ?? 'failed')}`, true)
    }
  } catch (err) {
    console.error(`[instagram/callback] Step 2 network error — ${String(err)}`)
    return errorRedirect(adminUrl, 'step2_network_error', true)
  }

  const shortLivedToken = shortData.access_token as string
  console.log('[instagram/callback] Step 2 ✅ Short-lived token obtained.')

  // ── Step 3: short-lived → long-lived token ──────────────────────────────
  const longParams = new URLSearchParams({
    grant_type:        'fb_exchange_token',
    client_id:         appId,
    client_secret:     appSecret,
    fb_exchange_token: shortLivedToken,
  })

  let longData: Record<string, unknown>
  try {
    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?${longParams.toString()}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    longData = (await longRes.json()) as Record<string, unknown>

    if (!longRes.ok || typeof longData.access_token !== 'string') {
      const apiErr = longData.error as Record<string, unknown> | undefined
      const msg = String(apiErr?.message ?? JSON.stringify(longData).slice(0, 200))
      console.error(`[instagram/callback] Step 3 failed — ${msg}`)
      return errorRedirect(adminUrl, `step3_${String(apiErr?.code ?? 'failed')}`, true)
    }
  } catch (err) {
    console.error(`[instagram/callback] Step 3 network error — ${String(err)}`)
    return errorRedirect(adminUrl, 'step3_network_error', true)
  }

  const longLivedToken = longData.access_token as string
  const expiresIn      = typeof longData.expires_in === 'number' ? longData.expires_in : null
  console.log(`[instagram/callback] Step 3 ✅ Long-lived token obtained (~${expiresIn ? Math.round(expiresIn / 86400) : '?'} days).`)

  // ── Step 4: get Instagram Business Account ID ────────────────────────────
  //
  // Strategy (handles both classic and New Pages Experience):
  //   4-bypass: If INSTAGRAM_USER_ID env var is set, skip page discovery entirely.
  //   4a. GET /me/accounts?fields=name,access_token,instagram_business_account
  //   4b. If 0 pages returned (NPE pages sometimes absent from /me/accounts),
  //       fall back to GET /me?fields=accounts{id,name,access_token,instagram_business_account}
  //   4c. If env var INSTAGRAM_PAGE_ID is set, try a direct page lookup as last resort.
  //

  // 4-bypass — skip all page discovery if Instagram user ID is already known
  if (process.env.INSTAGRAM_USER_ID) {
    const bypassId = process.env.INSTAGRAM_USER_ID
    console.log(`[instagram/callback] Step 4 bypass — using INSTAGRAM_USER_ID env var: ${bypassId}`)
    try {
      await storeTokensInPayload(longLivedToken, bypassId, expiresIn)
    } catch (err) {
      console.error(`[instagram/callback] Step 5 (bypass) Payload storage failed — ${String(err)}`)
      return errorRedirect(adminUrl, 'step5_payload_storage_failed', true)
    }
    console.log(`[instagram/callback] ✅ Step 17 complete (bypass) — instagramUserId=${bypassId}`)
    const bypassSuccessUrl = new URL(adminUrl)
    bypassSuccessUrl.searchParams.set('instagram_auth', 'connected')
    bypassSuccessUrl.searchParams.set('instagram_user_id', bypassId)
    bypassSuccessUrl.searchParams.set('instagram_page', 'bypass')
    const bypassRes = NextResponse.redirect(bypassSuccessUrl.toString())
    bypassRes.cookies.delete('ig_oauth_state')
    return bypassRes
  }

  type PageEntry = {
    id?: string
    name?: string
    access_token?: string
    instagram_business_account?: { id: string }
  }

  async function fetchAccounts(url: string): Promise<{ pages: PageEntry[] | undefined; error: string | null }> {
    try {
      const res  = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      const data = (await res.json()) as Record<string, unknown>
      console.log(`[instagram/callback] Step 4 raw response from ${url.split('?')[0]} — ` +
        JSON.stringify(data).slice(0, 500))
      if (!res.ok) {
        const apiErr = data.error as Record<string, unknown> | undefined
        return { pages: undefined, error: String(apiErr?.code ?? 'failed') }
      }
      // /me/accounts returns { data: [...] }
      // /me?fields=accounts{...} returns { id, accounts: { data: [...] } }
      const direct  = data.data as PageEntry[] | undefined
      const nested  = (data.accounts as { data?: PageEntry[] } | undefined)?.data
      return { pages: direct ?? nested ?? [], error: null }
    } catch (err) {
      return { pages: undefined, error: String(err) }
    }
  }

  // 4a — primary: /me/accounts
  const primary = await fetchAccounts(
    `https://graph.facebook.com/v21.0/me/accounts?${new URLSearchParams({
      fields:       'id,name,access_token,instagram_business_account',
      access_token: longLivedToken,
      limit:        '100',
    }).toString()}`
  )
  console.log(`[instagram/callback] Step 4a /me/accounts returned ${primary.pages?.length ?? 'err'} page(s).`)

  let pages: PageEntry[] | undefined = primary.pages

  // 4b — fallback for NPE pages: /me?fields=accounts{...}
  if (!primary.error && (primary.pages?.length ?? 0) === 0) {
    console.log('[instagram/callback] Step 4b — /me/accounts empty, trying /me?fields=accounts{...}')
    const fallback = await fetchAccounts(
      `https://graph.facebook.com/v21.0/me?${new URLSearchParams({
        fields:       'id,name,accounts.limit(100){id,name,access_token,instagram_business_account}',
        access_token: longLivedToken,
      }).toString()}`
    )
    console.log(`[instagram/callback] Step 4b /me?fields=accounts{...} returned ${fallback.pages?.length ?? 'err'} page(s).`)
    if (!fallback.error && (fallback.pages?.length ?? 0) > 0) {
      pages = fallback.pages
    }
  }

  // 4c — last resort: direct page lookup via INSTAGRAM_PAGE_ID env var
  //      /{page-id} returns a single object, NOT { data: [...] }, so we call fetch inline.
  if ((pages?.length ?? 0) === 0 && process.env.INSTAGRAM_PAGE_ID) {
    const pageId = process.env.INSTAGRAM_PAGE_ID
    console.log(`[instagram/callback] Step 4c — trying direct page lookup for pageId=${pageId}`)
    try {
      const pageRes  = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}?${new URLSearchParams({
          fields:       'id,name,access_token,instagram_business_account',
          access_token: longLivedToken,
        }).toString()}`,
        { signal: AbortSignal.timeout(10_000) },
      )
      const pageData = (await pageRes.json()) as Record<string, unknown>
      console.log(`[instagram/callback] Step 4c raw — ${JSON.stringify(pageData).slice(0, 300)}`)
      const entry = pageData as PageEntry
      if (pageRes.ok && entry.id) pages = [entry]
    } catch (err) {
      console.error(`[instagram/callback] Step 4c network error — ${String(err)}`)
    }
    console.log(`[instagram/callback] Step 4c result — hasIG=${!!(pages?.[0]?.instagram_business_account?.id)}`)
  }

  if (primary.error && (pages?.length ?? 0) === 0) {
    return errorRedirect(adminUrl, `step4_accounts_${primary.error}`, true)
  }

  const linkedPage = pages?.find((p) => p.instagram_business_account?.id)

  if (!linkedPage?.instagram_business_account?.id) {
    console.error(
      `[instagram/callback] Step 4 failed — No linked Instagram Business Account. ` +
        `Pages: ${JSON.stringify(pages?.map(p => ({ name: p.name, hasIG: !!p.instagram_business_account })))}`
    )
    return errorRedirect(adminUrl, `step4_no_ig_account_pages${pages?.length ?? 0}`, true)
  }

  const instagramUserId = linkedPage.instagram_business_account.id
  const pageName        = linkedPage.name ?? '(unknown page)'
  console.log(`[instagram/callback] Step 4 ✅ Instagram Business Account resolved — userId=${instagramUserId} page="${pageName}"`)

  // ── Step 5: store in Payload AutomationSettings global ──────────────────
  try {
    await storeTokensInPayload(longLivedToken, instagramUserId, expiresIn)
  } catch (err) {
    console.error(`[instagram/callback] Step 5 Payload storage failed — ${String(err)}`)
    return errorRedirect(adminUrl, 'step5_payload_storage_failed', true)
  }

  console.log(`[instagram/callback] ✅ Step 17 complete — tokens stored. instagramUserId=${instagramUserId}`)

  // ── Step 6: redirect admin to success ────────────────────────────────────
  const successUrl = new URL(adminUrl)
  successUrl.searchParams.set('instagram_auth', 'connected')
  successUrl.searchParams.set('instagram_user_id', instagramUserId)
  successUrl.searchParams.set('instagram_page', pageName)

  const finalRes = NextResponse.redirect(successUrl.toString())
  finalRes.cookies.delete('ig_oauth_state')
  return finalRes
}
