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

  // Look up the Facebook Page linked to the stored Instagram Business Account
  const igUserId = process.env.INSTAGRAM_USER_ID
  let igLinkedPage: unknown = null
  if (igUserId) {
    const igPageRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}?fields=page{id,name}&access_token=${token}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    igLinkedPage = await igPageRes.json()
  }

  return NextResponse.json({
    me: meData,
    pages_via_me_accounts: data,
    pages_via_npe_fallback: npeData,
    ig_linked_page: igLinkedPage,
    igUserId: igUserId ?? '(not set)',
    currentEnvPageId: process.env.INSTAGRAM_PAGE_ID ?? '(not set)',
  })
}
