import { getPayload } from '@/lib/payload'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
}

type MediaDoc = {
  id: string | number
  url?: string | null
  filename?: string | null
}

type ProductRef = {
  id: string | number
  title?: string | null
  slug?: string | null
  price?: number | null
  images?: Array<{ image: MediaDoc | string | number | null }> | null
  generativeGallery?: Array<{ image: MediaDoc | string | number | null }> | null
}

type BlogPostDoc = {
  id: string | number
  title: string
  slug: string
  excerpt?: string | null
  content?: {
    root?: {
      children?: Array<{
        type?: string
        children?: Array<{
          type?: string
          text?: string
        }>
      }>
    }
  } | null
  featuredImage?: MediaDoc | string | number | null
  category?: string | null
  tags?: string | null
  status?: string | null
  publishedAt?: string | null
  author?: string | null
  source?: string | null
  seo?: {
    title?: string | null
    description?: string | null
    keywords?: string | null
  } | null
  relatedProducts?: (ProductRef | string | number)[] | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────────────────────────────────────

async function getPost(slug: string): Promise<BlogPostDoc | undefined> {
  try {
    const payload = await getPayload()
    const { docs } = await payload.find({
      collection: 'blog-posts',
      where: { slug: { equals: slug } },
      depth: 2,
      limit: 1,
    })
    return docs[0] as BlogPostDoc | undefined
  } catch (err) {
    console.error(`[blog/${slug}] Failed to fetch blog post:`, err)
    return undefined
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO Metadata
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return {}

  const metaTitle =
    post.seo?.title || `${post.title} \u2014 UygunAyakkab\u0131 Blog`
  const metaDescription =
    post.seo?.description || post.excerpt || `${post.title} \u2014 UygunAyakkab\u0131`
  const keywords = post.seo?.keywords || post.tags || undefined

  return {
    title: metaTitle,
    description: metaDescription,
    ...(keywords ? { keywords } : {}),
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'article',
      ...(post.publishedAt
        ? { publishedTime: post.publishedAt }
        : {}),
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Extract plain text from Lexical richText content */
function extractTextFromLexical(content: BlogPostDoc['content']): string {
  if (!content?.root?.children) return ''
  const parts: string[] = []
  for (const node of content.root.children) {
    if (node.children) {
      for (const child of node.children) {
        if (child.text) parts.push(child.text)
      }
    }
  }
  return parts.join('\n\n')
}

/** Extract image URL from a media doc */
function getImageUrl(media: MediaDoc | string | number | null | undefined): string | null {
  if (!media || typeof media === 'string' || typeof media === 'number') return null
  if (media.url) return media.url
  if (media.filename) return `/media/${media.filename}`
  return null
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Genel',
  product: 'Ürün Tanıtım',
  style: 'Stil & Moda',
  announcement: 'Duyuru',
  seo: 'SEO İçerik',
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON-LD
// ─────────────────────────────────────────────────────────────────────────────

function buildArticleJsonLd(post: BlogPostDoc, url: string, imageUrl: string | null) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seo?.description || post.excerpt || post.title,
    url,
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    author: {
      '@type': 'Person',
      name: post.author || 'UygunAyakkabı',
    },
    publisher: {
      '@type': 'Organization',
      name: 'UygunAyakkabı',
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post || post.status !== 'published') {
    notFound()
  }

  const articleText = extractTextFromLexical(post.content)
  const featuredImageUrl = getImageUrl(post.featuredImage as MediaDoc | null)

  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  // Related products (resolved by depth:2)
  const relatedProducts = (post.relatedProducts || [])
    .filter((p): p is ProductRef => typeof p === 'object' && p !== null && 'title' in p)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.uygunayakkabi.com'
  const postUrl = `${siteUrl}/blog/${post.slug}`
  const articleJsonLd = buildArticleJsonLd(post, postUrl, featuredImageUrl)

  // Split article text into paragraphs for rendering
  const paragraphs = articleText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back link */}
        <Link
          href="/blog"
          className="text-sm text-brand-600 hover:text-brand-700 mb-6 inline-block"
        >
          &larr; Blog
        </Link>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            {post.category && (
              <span className="text-xs font-medium text-brand-600 uppercase tracking-wide">
                {CATEGORY_LABELS[post.category] || post.category}
              </span>
            )}
            {date && <span className="text-xs text-gray-400">{date}</span>}
            {post.author && (
              <span className="text-xs text-gray-400">
                &mdash; {post.author}
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-lg text-gray-500 mt-4 leading-relaxed">{post.excerpt}</p>
          )}
        </header>

        {/* Featured image */}
        {featuredImageUrl && (
          <div className="mb-10 rounded-xl overflow-hidden bg-gray-100">
            <img
              src={featuredImageUrl}
              alt={post.title}
              className="w-full h-auto object-cover max-h-96"
            />
          </div>
        )}

        {/* Article body */}
        {paragraphs.length > 0 ? (
          <div className="prose prose-gray prose-lg max-w-none">
            {paragraphs.map((p, i) => {
              // Detect markdown-style headings
              if (p.startsWith('## ')) {
                return (
                  <h2 key={i} className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                    {p.replace(/^##\s+/, '')}
                  </h2>
                )
              }
              if (p.startsWith('### ')) {
                return (
                  <h3 key={i} className="text-xl font-semibold text-gray-800 mt-6 mb-3">
                    {p.replace(/^###\s+/, '')}
                  </h3>
                )
              }
              if (p.startsWith('# ')) {
                return (
                  <h2 key={i} className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                    {p.replace(/^#\s+/, '')}
                  </h2>
                )
              }
              // Detect bullet lists
              if (p.includes('\n- ') || p.startsWith('- ')) {
                const items = p.split('\n').filter((line) => line.startsWith('- '))
                return (
                  <ul key={i} className="list-disc pl-6 space-y-1 text-gray-700 my-4">
                    {items.map((item, j) => (
                      <li key={j}>{item.replace(/^-\s+/, '')}</li>
                    ))}
                  </ul>
                )
              }
              return (
                <p key={i} className="text-gray-700 leading-relaxed mb-4">
                  {p}
                </p>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-400 italic">Bu yazının içeriği henüz eklenmedi.</p>
        )}

        {/* Tags */}
        {post.tags && (
          <div className="mt-10 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {post.tags.split(',').map((tag, i) => (
                <span
                  key={i}
                  className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full"
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">İlgili Ürünler</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {relatedProducts.map((product) => {
                // D-174b: Only AI images, never original intake photos
                const gallery = product.generativeGallery ?? []
                const prodImage = gallery.length > 0
                  ? getImageUrl((gallery[0] as any)?.image as MediaDoc | null)
                  : null

                return (
                  <Link
                    key={String(product.id)}
                    href={`/products/${product.slug}`}
                    className="group block"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
                      {prodImage ? (
                        <img
                          src={prodImage}
                          alt={product.title || ''}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          No image
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-brand-600 transition-colors">
                      {product.title}
                    </p>
                    {product.price && (
                      <p className="text-sm font-bold text-brand-600 mt-1">
                        {product.price.toLocaleString('tr-TR')} ₺
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </article>
    </>
  )
}
