import type { MetadataRoute } from 'next'
import { getPayload } from '@/lib/payload'
import { buildSitemapEntries, type SlugDoc } from '@/lib/sitemapEntries'

// D-295 + pre-traffic hardening: production /sitemap.xml returned the app's
// 404 page even though this file was in the deployed tree — i.e. the route was
// never REGISTERED in the build manifest, not merely erroring (an error would
// 500). The one unusual element here was `export const dynamic =
// 'force-dynamic'` on a metadata route under Next 16 canary, a fragile
// combination that can drop the route at build time (robots.ts, identical
// minus that config, has no such issue). Switched to ISR (`revalidate`), the
// same caching pattern as the rest of the storefront: the route prerenders and
// refreshes hourly. The try/catch below keeps the original D-295 safety — a
// DB-less build or a runtime fetch failure degrades to the static routes,
// never a throw.
export const revalidate = 3600

const BASE = 'https://uygunayakkabi.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  let products: SlugDoc[] = []
  let posts: SlugDoc[] = []

  // Each collection fetch fails independently: a blog-posts hiccup must not
  // drop the product URLs (and vice versa).
  try {
    const payload = await getPayload()

    try {
      // Only website-visible products (same gate the storefront uses).
      const result = await payload.find({
        collection: 'products',
        where: { status: { in: ['active', 'soldout'] } },
        depth: 0,
        pagination: false,
        limit: 5000,
      })
      products = result.docs as SlugDoc[]
    } catch (err) {
      console.error('[sitemap] product fetch failed, omitting product routes:', err)
    }

    try {
      const result = await payload.find({
        collection: 'blog-posts',
        where: { status: { equals: 'published' } },
        depth: 0,
        pagination: false,
        limit: 5000,
      })
      posts = result.docs as SlugDoc[]
    } catch (err) {
      console.error('[sitemap] blog fetch failed, omitting blog routes:', err)
    }
  } catch (err) {
    // A runtime DB/init hiccup yields the static sitemap, never a 500.
    console.error('[sitemap] payload init failed, serving static routes only:', err)
  }

  return buildSitemapEntries({ baseUrl: BASE, now, products, posts }) as MetadataRoute.Sitemap
}
