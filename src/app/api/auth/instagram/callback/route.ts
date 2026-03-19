/**
 * Instagram OAuth Callback — Step 17 (Complete Token Exchange)
 *
 * Meta redirects the admin's browser here after they approve the Instagram
 * Business Login consent screen. This handler completes the full OAuth flow:
 *
 *   1. Validate CSRF state (cookie vs query param)
 *   2. Exchange authorization code for short-lived user access token
 *   3. Exchange short-lived token for long-lived token (~60 days)
 *   4. Retrieve Instagram Business Account numeric user ID via /me
 *   5. Write INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID to n8n Variables
 *   6. Redirect admin to /admin?instagram_auth=connected
 *
 * All steps are server-side only. The token is never exposed to the browser.
 * Errors redirect to /admin?instagram_auth=error&instagram_error={code}.
 *
 * ── Registered redirect URI in Meta Developer Portal ─────────────────────────
 *   Local:       http://localhost:3000/api/auth/instagram/callback
 *   Production:  https://uygunayakkabi.com/api/auth/instagram/callback
 *
 * ── Required env vars ────────────────────────────────────────────────────────
 *   INSTAGRAM_APP_ID       — Facebook App ID (Settings → Basic in Meta portal)
 *   INSTAGRAM_APP_SECRET   — Facebook App Secret (Settings → Basic in Meta portal)
 *   N8N_API_KEY            — n8n REST API key (n8n UI: Settings → API → Create API key)
 *   N8N_BASE_URL           — n8n instance base URL (default: https://flow.uygunayakkabi.com)
 *   NEXT_PUBLIC_SERVER_URL — Used to construct redirect_uri (must match Meta registration)
 *
 * ── n8n Variables written ────────────────────────────────────────────────────
 *   INSTAGRAM_ACCESS_TOKEN  — Long-lived token (~60 days); read by channel-instagram-real.json
 *   INSTAGRAM_USER_ID       — Numeric Instagram Business Account ID; read by channel-instagram-real.json
 *
 * ── Token lifespan ───────────────────────────────────────────────────────────
 *   Short-lived user token:  ~1 hour
 *   Long-lived token:        ~60 days (expires_in logged at token exchange time)
 *   System User token:       No expiry — recommended for production; generate in Meta Business Suite
 *
 * ── Initiating the OAuth flow ────────────────────────────────────────────────
 *   Navigate to: https://uygunayakkabi.com/api/auth/instagram/initiate
 *   (generates CSRF state cookie + redirects to Meta consent screen)
 *
 * ── CSRF protection ──────────────────────────────────────────────────────────
 *   State is generated in /initiate and stored in ig_oauth_state HttpOnly cookie.
 *   Verified here before any token exchange. Cookie deleted immediately after check.
 */

import { NextRequest, NextResponse } from 'next/server'

// ── n8n Variable upsert ───────────────────────────────────────────────────────
/**
 * Write a key=value pair to n8n Variables via the n8n REST API.
 * Creates the variable if it doesn't exist; updates it if it does.
 *
 * n8n REST API:
 *   GET  /api/v1/variables          — list all (to find existing IDs)
 *   POST /api/v1/variables          — create { key, value }
 *   PATCH /api/v1/variables/{id}    — update { value }
 *
 * channel-instagram-real.json reads these as $vars.INSTAGRAM_ACCESS_TOKEN
 * and $vars.INSTAGRAM_USER_ID — writing here makes the token live immediately.
 */
async function upsertN8nVariable(key: string, value: string): Promise<void> {
  const n8nBase = (
    process.env.N8N_BASE_URL ?? 'https://flow.uygunayakkabi.com'
  ).replace(/\/$/, '')

  const apiKey = process.env.N8N_API_KEY
  if (!apiKey) {
    throw new Error(
      'N8N_API_KEY env var is not set — cannot write to n8n Variables. ' +
        'Generate one at: n8n UI → Settings → API → Create an API key',
    )
  }

  const headers: Record<string, string> = {
    'X-N8N-API-KEY': apiKey,
    'Content-Type':  'application/json',
  }

  // List existing variables to find the ID for this key (needed for PATCH)
  const listRes = await fetch(`${n8nBase}/api/v1/variables`, {
    headers,
    signal: AbortSignal.timeout(8_000),
  })

  if (!listRes.ok) {
    const body = await listRes.text()
    throw new Error(
      `n8n Variables API list failed: HTTP ${listRes.status} — ${body.slice(0, 200)}`,
    )
  }

  const listData = (await listRes.json()) as {
    data?: Array<{ id: string; key: string }>
  }
  const existing = listData.data?.find((v) => v.key === key)

  if (existing) {
    // Update existing variable value (keep its id, type, etc.)
    const patchRes = await fetch(`${n8nBase}/api/v1/variables/${existing.id}`, {
      method:  'PATCH',
      headers,
      body:    JSON.stringify({ value }),
      signal:  AbortSignal.timeout(8_000),
    })
    if (!patchRes.ok) {
      const body = await patchRes.text()
      throw new Error(
        `n8n Variables PATCH failed for key="${key}": HTTP ${patchRes.status} — ${body.slice(0, 200)}`,
      )
    }
    console.log(`[instagram/callback] n8n Variable updated — key=${key} (id=${existing.id})`)
  } else {
    // Create new variable
    const createRes = await fetch(`${n8nBase}/api/v1/variables`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ key, value }),
      signal:  AbortSignal.timeout(8_000),
    })
    if (!createRes.ok) {
      const body = await createRes.text()
      throw new Error(
        `n8n Variables POST failed for key="${key}": HTTP ${createRes.status} — ${body.slice(0, 200)}`,
      )
    }
    console.log(`[instagram/callback] n8n Variable created — key=${key}`)
  }
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

  // State valid — log and proceed
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
    // POST https://graph.facebook.com/v21.0/oauth/access_token
    // Returns: { access_token, token_type }  (valid ~1 hour)
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
    // GET https://graph.facebook.com/v21.0/oauth/exchange_token
    // Returns: { access_token, token_type, expires_in }  (~60 days)
    const longParams = new URLSearchParams({
      grant_type:        'fb_exchange_token',
      client_id:         appId,
      client_secret:     appSecret,
      fb_exchange_token: shortLivedToken,
    })

    const longRes  = await fetch(
      `https://graph.facebook.com/v21.0/oauth/exchange_token?${longParams.toString()}`,
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
        `expires_in=${expiresIn ?? 'unknown'}s (~${expiresIn ? Math.round(expiresIn / 86400) : '?'} days). ` +
        'Tip: use a System User token in Meta Business Suite for non-expiring access.',
    )

    // ── Step 4: retrieve Instagram Business Account numeric User ID ───────
    // GET https://graph.facebook.com/v21.0/me?fields=id,name
    // Returns: { id, name }  — `id` is the numeric INSTAGRAM_USER_ID for the n8n workflow
    const meParams = new URLSearchParams({
      fields:       'id,name',
      access_token: longLivedToken,
    })

    const meRes  = await fetch(
      `https://graph.facebook.com/v21.0/me?${meParams.toString()}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    const meData = (await meRes.json()) as Record<string, unknown>

    if (!meRes.ok || typeof meData.id !== 'string') {
      const apiErr = meData.error as Record<string, unknown> | undefined
      throw new Error(
        `Instagram /me request failed (HTTP ${meRes.status}): ` +
          String(apiErr?.message ?? JSON.stringify(meData).slice(0, 300)),
      )
    }

    const instagramUserId = meData.id
    const instagramName   = typeof meData.name === 'string' ? meData.name : undefined

    console.log(
      `[instagram/callback] Instagram user resolved — id=${instagramUserId} name=${instagramName ?? '(unknown)'}`,
    )

    // ── Step 5: write to n8n Variables ────────────────────────────────────
    // channel-instagram-real.json reads $vars.INSTAGRAM_ACCESS_TOKEN + $vars.INSTAGRAM_USER_ID
    // Writing here activates real publishing immediately — no manual n8n config needed
    await upsertN8nVariable('INSTAGRAM_ACCESS_TOKEN', longLivedToken)
    await upsertN8nVariable('INSTAGRAM_USER_ID', instagramUserId)

    console.log(
      `[instagram/callback] ✅ Step 17 complete — ` +
        `INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID written to n8n Variables. ` +
        `user_id=${instagramUserId}`,
    )

    // ── Step 6: redirect admin to success ────────────────────────────────
    const successUrl = new URL(adminUrl)
    successUrl.searchParams.set('instagram_auth', 'connected')
    successUrl.searchParams.set('instagram_user_id', instagramUserId)
    if (instagramName) successUrl.searchParams.set('instagram_name', instagramName)

    const finalRes = NextResponse.redirect(successUrl.toString())
    finalRes.cookies.delete('ig_oauth_state')
    return finalRes

  } catch (err) {
    // Log full error server-side — never expose raw message to browser
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[instagram/callback] Token exchange failed — ${message}`)

    return errorRedirect(adminUrl, 'token_exchange_failed', true)
  }
}
