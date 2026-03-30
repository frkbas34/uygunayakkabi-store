/**
 * Luma webhook callback handler — Step 26 / Phase 1
 *
 * Luma POSTs the full generation object to this URL on every state transition:
 *   queued → dreaming → completed | failed
 *
 * URL format: /api/luma/callback?jobId={imageGenerationJobId}
 *
 * This handler is a secondary notification path.
 * Primary flow: lumaGenTask polls via pollLumaGens() with 4s intervals.
 * This callback provides early notification and audit logging.
 *
 * If the generation completes while the polling loop is still running, the
 * poller will pick it up on the next tick and proceed normally.
 * If the polling loop has timed out (>2 min), this callback could in principle
 * re-trigger work — but that complexity is deferred to Phase 2.
 * For Phase 1: log, validate, and acknowledge.
 *
 * Security: no secret token on this endpoint (Luma doesn't support callback
 * secrets). Rate of false calls is low; payloads are validated structurally.
 * A future hardening step could add HMAC signing via LUMA_CALLBACK_SECRET.
 */

import { type NextRequest, NextResponse } from 'next/server'
import type { LumaGenResponse } from '@/lib/lumaApi'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/luma/callback?jobId={id}
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const jobId = req.nextUrl.searchParams.get('jobId')

  // Parse body — Luma sends a LumaGenResponse object
  let body: Partial<LumaGenResponse> | null = null
  try {
    body = await req.json() as Partial<LumaGenResponse>
  } catch {
    console.warn('[luma/callback] failed to parse JSON body')
    // Still return 200 — we don't want Luma to retry indefinitely
    return NextResponse.json({ ok: true })
  }

  const lumaId = body?.id ?? 'unknown'
  const state  = body?.state ?? 'unknown'

  console.log(`[luma/callback] jobId=${jobId ?? 'none'} lumaId=${lumaId} state=${state}`)

  // Structural validation — required fields from Luma
  if (!body?.id || !body?.state) {
    console.warn('[luma/callback] unexpected payload shape — missing id or state')
    return NextResponse.json({ ok: true })
  }

  // Log terminal states for audit
  if (state === 'completed') {
    const imageUrl = body.assets?.image ?? null
    console.log(
      `[luma/callback] COMPLETED lumaId=${lumaId} jobId=${jobId ?? 'none'} ` +
      `image=${imageUrl ? imageUrl.slice(0, 80) : 'none'}`,
    )
  } else if (state === 'failed') {
    console.warn(
      `[luma/callback] FAILED lumaId=${lumaId} jobId=${jobId ?? 'none'} ` +
      `reason=${body.failure_reason ?? 'unknown'}`,
    )
  }

  // Phase 1: polling handles all downstream work.
  // Always return 200 so Luma stops retrying this callback.
  return NextResponse.json({ ok: true })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — health check (Luma may probe the URL before sending real callbacks)
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, service: 'luma-callback', phase: 1 })
}
