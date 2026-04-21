import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { listCategories, createCategory } from '@/lib/shopierApi'

/**
 * D-217: One-shot admin-triggered Shopier category ensure endpoint.
 *
 * Why:
 *   `resolveShopierCategories()` in shopierSync.ts matches a Payload product's
 *   `category` value against the Shopier categories Map exactly. If the
 *   Payload category doesn't exist in Shopier, it silently falls back to
 *   "first available" (currently "Günlük") and logs a warning. Pre-creating
 *   the operator-facing wizard categories closes that gap without touching
 *   sync logic.
 *
 * Auth:
 *   Uses Payload session auth (same session cookie the /admin panel sets),
 *   NOT the GENERATE_API_KEY_SECRET header used by D-214. Callable from the
 *   authenticated admin tab with `credentials: 'include'`.
 *
 * Usage:
 *   GET  /api/admin/shopier-categories
 *     Lists current Shopier categories.
 *
 *   POST /api/admin/shopier-categories
 *     Body: { titles: string[] }
 *     Ensures each title exists (creates it if missing). Returns per-title result.
 *
 * Intended to be a transient tool. Safe to remove after categories are seeded.
 */

async function requireAdmin(req: NextRequest) {
  const payload = await getPayload({ config: configPromise })
  const authResult = await payload.auth({ headers: req.headers })
  const user = (authResult as { user?: { id?: string | number } }).user
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return { payload, user }
}

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req)
  if (error) return error

  try {
    const res = await listCategories(50)
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Shopier listCategories failed', details: res },
        { status: 502 },
      )
    }
    return NextResponse.json({
      count: res.data.length,
      categories: res.data.map((c) => ({ id: c.id, title: c.title, placement: c.placement })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req)
  if (error) return error

  let body: { titles?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const titles = Array.isArray(body.titles)
    ? body.titles.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : []

  if (titles.length === 0) {
    return NextResponse.json(
      { error: 'Provide { titles: string[] } with at least one non-empty title' },
      { status: 400 },
    )
  }

  try {
    // Fetch existing categories once so we don't hit Shopier with needless CREATEs
    const existingRes = await listCategories(50)
    if (!existingRes.ok) {
      return NextResponse.json(
        { error: 'Shopier listCategories failed', details: existingRes },
        { status: 502 },
      )
    }
    const existingByTitle = new Map<string, { id: string; title: string }>(
      existingRes.data.map((c) => [c.title, { id: c.id, title: c.title }]),
    )

    const results: Array<{
      title: string
      status: 'already_exists' | 'created' | 'error'
      id?: string
      note?: string
    }> = []

    for (const title of titles) {
      const trimmed = title.trim()
      const existing = existingByTitle.get(trimmed)
      if (existing) {
        results.push({ title: trimmed, status: 'already_exists', id: existing.id })
        continue
      }

      const res = await createCategory(trimmed)
      if (!res.ok) {
        results.push({
          title: trimmed,
          status: 'error',
          note: `HTTP ${res.status}: ${res.body}`,
        })
        continue
      }

      results.push({ title: trimmed, status: 'created', id: res.data.id })
      existingByTitle.set(res.data.title, { id: res.data.id, title: res.data.title })
    }

    return NextResponse.json({
      total: results.length,
      created: results.filter((r) => r.status === 'created').length,
      alreadyExists: results.filter((r) => r.status === 'already_exists').length,
      errors: results.filter((r) => r.status === 'error').length,
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
