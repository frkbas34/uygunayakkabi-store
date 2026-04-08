import { getPayload } from '@/lib/payload'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Blog — UygunAyakkabı',
  description:
    'Ayakkabı trendleri, stil rehberleri ve ürün incelemeleri. UygunAyakkabı blog sayfası.',
}

type MediaDoc = {
  id: string | number
  url?: string | null
  filename?: string | null
}

type BlogPostDoc = {
  id: string | number
  title: string
  slug: string
  excerpt?: string | null
  featuredImage?: MediaDoc | string | number | null
  category?: string | null
  status?: string | null
  publishedAt?: string | null
  author?: string | null
  source?: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Genel',
  product: 'Ürün Tanıtım',
  style: 'Stil & Moda',
  announcement: 'Duyuru',
  seo: 'SEO İçerik',
}

export default async function BlogListingPage() {
  let posts: BlogPostDoc[] = []

  try {
    const payload = await getPayload()
    const { docs } = await payload.find({
      collection: 'blog-posts',
      where: {
        status: { equals: 'published' },
      },
      depth: 1,
      limit: 50,
      sort: '-createdAt',
    })
    posts = docs as BlogPostDoc[]
  } catch (err) {
    console.error('[blog] Failed to fetch blog posts:', err)
    // Graceful degradation — show empty state instead of 500
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog</h1>
      <p className="text-gray-500 mb-10">
        Ayakkabı dünyasından haberler, stil rehberleri ve ürün incelemeleri.
      </p>

      {posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">Henüz yayınlanmış yazı yok.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => {
            const imageUrl = (() => {
              const img = post.featuredImage as MediaDoc | null
              if (img?.url) return img.url
              if (img?.filename) return `/media/${img.filename}`
              return null
            })()

            const date = post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : null

            return (
              <Link
                key={String(post.id)}
                href={`/blog/${post.slug}`}
                className="block group"
              >
                <article className="flex gap-6 items-start p-4 -mx-4 rounded-xl hover:bg-gray-50 transition-colors">
                  {/* Thumbnail */}
                  {imageUrl && (
                    <div className="w-32 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      {post.category && (
                        <span className="text-xs font-medium text-brand-600 uppercase tracking-wide">
                          {CATEGORY_LABELS[post.category] || post.category}
                        </span>
                      )}
                      {date && (
                        <span className="text-xs text-gray-400">{date}</span>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </article>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
