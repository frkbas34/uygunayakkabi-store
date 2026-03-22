/**
 * Temporary debug endpoint — find Facebook Page IDs accessible to the stored token.
 * GET /api/debug/fb-pages
 *
 * Calls /me/accounts with the stored Instagram/Facebook user token and returns
 * the list of pages with their IDs and Instagram Business Account links.
 * DELETE this file once the correct INSTAGRAM_PAGE_ID is confirmed.
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  const payload = await getPayload({ config })

  const settings = await payload.findGlobal({ slug: 'automation-settings' })
  const token = (settings as Record<string, unknown> & {
    instagramTokens?: { accessToken?: string }
  })?.instagramTokens?.accessToken

  if (!token) {
    return NextResponse.json({ error: 'No token stored in AutomationSettings' }, { status: 400 })
  }

  // Call /me/accounts to list all pages this token has access to
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${token}&limit=100`,
    { signal: AbortSignal.timeout(10_000) },
  )
  const data = await res.json()

  // /me for context
  const meRes = await fetch(
    `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${token}`,
    { signal: AbortSignal.timeout(10_000) },
  )
  const meData = await meRes.json()

  // NPE fallback: /me?fields=accounts{id,name,instagram_business_account}
  const npeRes = await fetch(
    `https://graph.facebook.com/v21.0/me?fields=id,name,accounts.limit(100){id,name,instagram_business_account}&access_token=${token}`,
    { signal: AbortSignal.timeout(10_000) },
  )
  const npeData = await npeRes.json()

  // Probe the IG user object — try various fields to understand what it is
  const igUserId = process.env.INSTAGRAM_USER_ID
  let igProbe: unknown = null
  let igLinkedPage: unknown = null
  let businessPages: unknown = null

  if (igUserId) {
    // What fields exist on this object?
    const igProbeRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}?fields=id,name,username,biography,followers_count,media_count,website&access_token=${token}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    igProbe = await igProbeRes.json()

    // Try page field with explicit permission
    const igPageRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}?fields=page&access_token=${token}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    igLinkedPage = await igPageRes.json()
  }

  // Check if this user has business accounts via business_management
  const bizRes = await fetch(
    `https://graph.facebook.com/v21.0/me?fields=businesses{id,name,owned_pages{id,name,instagram_business_account}}&access_token=${token}`,
    { signal: AbortSignal.timeout(10_000) },
  )
  businessPages = await bizRes.json()

  // Try to find Facebook Page by IG username (slug lookup)
  let pageBySlug: unknown = null
  if (igProbe && typeof (igProbe as Record<string, unknown>).username === 'string') {
    const slug = (igProbe as Record<string, unknown>).username as string
    const slugRes = await fetch(
      `https://graph.facebook.com/v21.0/${slug}?fields=id,name,instagram_business_account,fan_count&access_token=${token}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    pageBySlug = await slugRes.json()
  }

  // Try looking up the current env page ID with the token's available fields
  let envPageProbe: unknown = null
  {
    const epRes = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.INSTAGRAM_PAGE_ID ?? '0'}?fields=id,name,fan_count&access_token=${token}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    envPageProbe = await epRes.json()
  }

  return NextResponse.json({
    me: meData,
    pages_via_me_accounts: data,
    pages_via_npe_fallback: npeData,
    ig_probe: igProbe,
    ig_linked_page: igLinkedPage,
    business_pages: businessPages,
    page_by_ig_slug: pageBySlug,
    env_page_id_probe: envPageProbe,
    igUserId: igUserId ?? '(not set)',
    currentEnvPageId: process.env.INSTAGRAM_PAGE_ID ?? '(not set)',
  })
}
