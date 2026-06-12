import type { MetadataRoute } from 'next'
import { getPayload } from '@/lib/payload'

// D-295: Computed per request (never at build time) so a DB-less or
// secret-less build can never fail on this route. At runtime on Vercel the
// DB is available; if a fetch ever fails we degrade to the static routes.
export const dynamic = 'force-dynamic'

const BASE = 'https://uygunayakkabi.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Always-present public routes.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE}/yardim`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]

  let productRoutes: MetadataRoute.Sitemap = []
  let blogRoutes: MetadataRoute.Sitemap = []

  try {
    const payload = await getPayload()

    // Only website-visible products (same gate the storefront uses).
    const products = await payload.find({
      collection: 'products',
      where: { status: { in: ['active', 'soldout'] } },
      depth: 0,
      pagination: false,
      limit: 5000,
    })
    productRoutes = (products.docs as Array<{ slug?: string | null; updatedAt?: string | null }>)
      .filter((p) => p.slug)
      .map((p) => ({
        url: `${BASE}/products/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      }))

    const posts = await payload.find({
      collection: 'blog-posts',
      where: { status: { equals: 'published' } },
      depth: 0,
      pagination: false,
      limit: 5000,
    })
    blogRoutes = (posts.docs as Array<{ slug?: string | null; updatedAt?: string | null }>)
      .filter((b) => b.slug)
      .map((b) => ({
        url: `${BASE}/blog/${b.slug}`,
        lastModified: b.updatedAt ? new Date(b.updatedAt) : now,
        changeFrequency: 'monthly',
        priority: 0.5,
      }))
  } catch (err) {
    // A runtime DB hiccup yields the static sitemap, never a 500.
    console.error('[sitemap] dynamic route fetch failed, serving static routes only:', err)
  }

  return [...staticRoutes, ...productRoutes, ...blogRoutes]
}
