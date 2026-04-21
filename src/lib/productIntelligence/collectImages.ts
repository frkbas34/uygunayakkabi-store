/**
 * collectImages.ts — D-220
 *
 * Gather all available product visuals with the priority rule the operator
 * defined:
 *
 *   1. Original uploaded product photo  → primary identity source (highest trust)
 *   2. Approved / AI-generated gallery  → secondary supporting context
 *   3. Enhanced / processed images      → additional context
 *
 * Rules enforced here:
 *   - Original images are always preferred as the primary, even if multiple
 *     generated images exist. The original is the source of truth for the
 *     product's identity.
 *   - Generated images never override the original. If the original is
 *     missing, a generated image becomes primary but with a lower-confidence
 *     note so downstream consumers can lower match confidence accordingly.
 *   - We capture the image source type (`original` / `generated` / `enhanced`)
 *     so the orchestrator can route them correctly for reverse search
 *     (original first) vs SEO/GEO generation (all, combined).
 *
 * We do NOT download the image bytes here — only URLs. Vision and reverse-
 * search providers handle their own fetching.
 */

import type { PiCollectedImages } from './types'

// NOTE: `where` is typed `any` to accept Payload's `BasePayload` directly
// (Payload's real `Where` type is stricter than Record<string, unknown>, so
// BasePayload is not assignable to a narrower shape). This stays a narrow
// type alias so the module doesn't hard-depend on the Payload package shape.
type Payload = {
  findByID: (args: { collection: string; id: string | number; depth?: number }) => Promise<any>
  find: (args: {
    collection: string
    where?: any
    sort?: string
    limit?: number
    depth?: number
  }) => Promise<{ docs: any[] }>
}

type MediaDoc = {
  id: string | number
  url?: string | null
  type?: 'original' | 'enhanced' | 'generated' | string | null
  sizes?: Record<string, { url?: string | null } | undefined> | null
}

function resolveMediaUrl(media: unknown): string | null {
  if (!media) return null
  if (typeof media === 'string') return media
  const m = media as MediaDoc
  // Prefer large size, fall back to card, then the original url
  return (
    m?.sizes?.large?.url ||
    m?.sizes?.card?.url ||
    m?.url ||
    null
  )
}

function pickSource(media: unknown): 'original' | 'generated' | 'enhanced' {
  if (!media || typeof media === 'string') return 'original'
  const t = (media as MediaDoc).type
  if (t === 'generated') return 'generated'
  if (t === 'enhanced') return 'enhanced'
  return 'original'
}

/**
 * Gather images for a product and return them in priority order.
 *
 * We check three sources in the product document:
 *   - `images[]`            → typically intake/website originals
 *   - `generativeGallery[]` → AI-generated editorial images
 *   - A fallback scan of the `media` collection by `product` relation
 *     catches anything that isn't referenced from the product doc yet.
 *
 * The returned `primary` is the best original-origin image we can find.
 * If no originals exist, the first generated image becomes primary with
 * a note explaining the downgrade.
 */
export async function collectProductImages(
  payload: Payload,
  productId: string | number,
): Promise<PiCollectedImages> {
  const product = await payload.findByID({
    collection: 'products',
    id: productId,
    depth: 2,
  })

  const originals: Array<{ url: string; source: 'original'; mediaId?: string | number }> = []
  const generated: Array<{ url: string; source: 'generated'; mediaId?: string | number }> = []
  const enhanced: Array<{ url: string; source: 'enhanced'; mediaId?: string | number }> = []

  // 1. product.images[] — usually originals
  const imagesArr: unknown[] = Array.isArray(product?.images) ? product.images : []
  for (const item of imagesArr) {
    const url = resolveMediaUrl(item)
    if (!url) continue
    const source = pickSource(item)
    const mediaId = typeof item === 'object' && item ? (item as MediaDoc).id : undefined
    if (source === 'generated') generated.push({ url, source: 'generated', mediaId })
    else if (source === 'enhanced') enhanced.push({ url, source: 'enhanced', mediaId })
    else originals.push({ url, source: 'original', mediaId })
  }

  // 2. product.generativeGallery[] — AI editorial
  const gallery: unknown[] = Array.isArray(product?.generativeGallery) ? product.generativeGallery : []
  for (const item of gallery) {
    const url = resolveMediaUrl(item)
    if (!url) continue
    const mediaId = typeof item === 'object' && item ? (item as MediaDoc).id : undefined
    generated.push({ url, source: 'generated', mediaId })
  }

  // 3. Fallback scan — any media docs that reference the product directly.
  //    Only used to pick up stragglers; bounded by limit to stay cheap.
  try {
    const { docs: extraMedia } = await payload.find({
      collection: 'media',
      where: { product: { equals: productId } },
      limit: 20,
      depth: 0,
    })
    const alreadySeen = new Set<string>([
      ...originals.map((i) => String(i.mediaId ?? i.url)),
      ...generated.map((i) => String(i.mediaId ?? i.url)),
      ...enhanced.map((i) => String(i.mediaId ?? i.url)),
    ])
    for (const m of extraMedia as MediaDoc[]) {
      if (alreadySeen.has(String(m.id))) continue
      const url = resolveMediaUrl(m)
      if (!url) continue
      if (m.type === 'generated') generated.push({ url, source: 'generated', mediaId: m.id })
      else if (m.type === 'enhanced') enhanced.push({ url, source: 'enhanced', mediaId: m.id })
      else originals.push({ url, source: 'original', mediaId: m.id })
    }
  } catch {
    // Fallback scan is best-effort; if it fails we still have what's on the product doc.
  }

  // Deduplicate by URL while preserving order
  const dedupe = <T extends { url: string }>(arr: T[]): T[] => {
    const seen = new Set<string>()
    const out: T[] = []
    for (const x of arr) {
      if (seen.has(x.url)) continue
      seen.add(x.url)
      out.push(x)
    }
    return out
  }
  const origDedup = dedupe(originals)
  const genDedup = dedupe(generated)
  const enhDedup = dedupe(enhanced)

  // Priority: original > enhanced > generated
  let primary: PiCollectedImages['primary'] = null
  const supporting: PiCollectedImages['supporting'] = []
  let notes = ''
  let conflicts = ''

  if (origDedup.length > 0) {
    primary = origDedup[0]
    supporting.push(
      ...origDedup.slice(1),
      ...enhDedup,
      ...genDedup,
    )
  } else if (enhDedup.length > 0) {
    primary = enhDedup[0]
    supporting.push(...enhDedup.slice(1), ...genDedup)
    notes = 'Orijinal görsel yok — enhanced görsel birincil kaynak olarak kullanıldı. Güven skoru düşürülmeli.'
  } else if (genDedup.length > 0) {
    primary = genDedup[0]
    supporting.push(...genDedup.slice(1))
    notes = 'Orijinal görsel yok — sadece AI üretimi görsel mevcut. Eşleşme güveni düşürülmeli; kimlik tespiti sınırlı.'
  } else {
    notes = 'Hiç görsel bulunamadı. Analiz yalnızca ürün metin verisine dayanacak.'
  }

  // Mild conflict note: if we have BOTH original and many generated images,
  // flag it so downstream consumers treat gen images as supporting only.
  if (origDedup.length > 0 && genDedup.length >= 2) {
    conflicts = 'Orijinal + çok sayıda üretilmiş görsel birlikte mevcut. Üretilmiş görseller yalnızca destekleyici bağlam olarak kullanıldı; kimlik orijinalden alındı.'
  }

  return {
    primary,
    supporting: supporting.slice(0, 6), // cap to keep prompts and search calls bounded
    notes,
    conflicts,
  }
}
