/**
 * sitemapEntries.ts — pure sitemap entry builder (pre-traffic hardening).
 *
 * Extracted from src/app/sitemap.ts so the sitemap's structure is unit-testable
 * without Payload, a DB, or Next runtime. The route file stays a thin fetch +
 * delegate wrapper.
 */

export type SitemapEntry = {
  url: string
  lastModified: Date
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

export type SlugDoc = { slug?: string | null; updatedAt?: string | null }

/** Always-present public routes. */
export function buildStaticEntries(baseUrl: string, now: Date): SitemapEntry[] {
  return [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/yardim`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]
}

/** Website-visible products (active/soldout fetched by the route). Slug-less docs are skipped. */
export function buildProductEntries(baseUrl: string, now: Date, products: SlugDoc[]): SitemapEntry[] {
  return (products || [])
    .filter((p) => p && p.slug)
    .map((p) => ({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
}

/** Published blog posts. Slug-less docs are skipped. */
export function buildBlogEntries(baseUrl: string, now: Date, posts: SlugDoc[]): SitemapEntry[] {
  return (posts || [])
    .filter((b) => b && b.slug)
    .map((b) => ({
      url: `${baseUrl}/blog/${b.slug}`,
      lastModified: b.updatedAt ? new Date(b.updatedAt) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }))
}

/**
 * Full sitemap: static routes always come first; product/blog arrays may be
 * empty (DB hiccup or empty catalog) and the result is still a valid sitemap.
 */
export function buildSitemapEntries(input: {
  baseUrl: string
  now: Date
  products: SlugDoc[]
  posts: SlugDoc[]
}): SitemapEntry[] {
  return [
    ...buildStaticEntries(input.baseUrl, input.now),
    ...buildProductEntries(input.baseUrl, input.now, input.products),
    ...buildBlogEntries(input.baseUrl, input.now, input.posts),
  ]
}
