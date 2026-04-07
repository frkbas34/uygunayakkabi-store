import { getPayload } from '@/lib/payload'
import { notFound } from 'next/navigation'
import { ProductImages } from '@/components/ProductImages'
import { ContactForm } from '@/components/ContactForm'
import { ProductFAQ } from '@/components/ProductFAQ'
import type { Metadata } from 'next'

export const revalidate = 60

type Props = {
  params: Promise<{ slug: string }>
}

type MediaDoc = {
  id: string | number
  url?: string | null
}

type VariantDoc = {
  id: string | number
  size: string
  stock: number
  variantSku?: string | null
}

type ImageEntry = {
  image: MediaDoc | string | number | null
}

type FAQItem = {
  q: string
  a: string
}

type ProductDoc = {
  id: string | number
  title: string
  slug: string
  sku: string
  price: number
  originalPrice?: number | null
  brand?: string | null
  category?: string | null
  description?: string | null
  color?: string | null
  material?: string | null
  status?: string | null
  images?: ImageEntry[] | null
  generativeGallery?: ImageEntry[] | null
  variants?: VariantDoc[] | null
  content?: {
    commercePack?: {
      websiteDescription?: string | null
      instagramCaption?: string | null
      xPost?: string | null
      facebookCopy?: string | null
      shopierCopy?: string | null
      highlights?: string[] | null
    } | null
    discoveryPack?: {
      articleTitle?: string | null
      articleBody?: string | null
      metaTitle?: string | null
      metaDescription?: string | null
      faq?: FAQItem[] | null
      keywordEntities?: string[] | null
    } | null
  } | null
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO Metadata — uses discoveryPack meta when available, falls back to basics
// ─────────────────────────────────────────────────────────────────────────────

async function getProduct(slug: string): Promise<ProductDoc | undefined> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
  })
  return docs[0] as ProductDoc | undefined
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return {}

  const metaTitle =
    product.content?.discoveryPack?.metaTitle ||
    `${product.title} — UygunAyakkab\u0131`

  const metaDescription =
    product.content?.discoveryPack?.metaDescription ||
    product.content?.commercePack?.websiteDescription?.substring(0, 160) ||
    product.description?.substring(0, 160) ||
    `${product.title} \u2014 uygun fiyatl\u0131 ayakkab\u0131`

  const keywords = product.content?.discoveryPack?.keywordEntities

  return {
    title: metaTitle,
    description: metaDescription,
    ...(keywords && keywords.length > 0 ? { keywords: keywords.join(', ') } : {}),
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'website',
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON-LD Structured Data
// ─────────────────────────────────────────────────────────────────────────────

function buildProductJsonLd(product: ProductDoc, url: string) {
  const desc =
    product.content?.commercePack?.websiteDescription ||
    product.description ||
    product.title

  // Extract first image URL for schema
  const imageUrl = (() => {
    const gallery = product.generativeGallery ?? product.images ?? []
    if (gallery.length === 0) return undefined
    const first = gallery[0]
    const mediaDoc = first.image as MediaDoc
    return mediaDoc?.url || undefined
  })()

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: desc,
    sku: product.sku,
    url,
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    ...(product.color ? { color: product.color } : {}),
    ...(product.material ? { material: product.material } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'TRY',
      availability:
        product.status === 'active'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url,
    },
  }

  return jsonLd
}

function buildFaqJsonLd(faq: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    notFound()
  }

  // Draft products must not be accessible on the public storefront.
  // Soldout products remain visible (customers may still want to see them / inquire).
  if (product.status === 'draft') {
    notFound()
  }

  // Fetch variants via product_id FK
  const payload = await getPayload()
  const variantResult = await payload.find({
    collection: 'variants',
    where: { product: { equals: product.id } },
    depth: 0,
    limit: 50,
    sort: 'size',
  })
  const variants = variantResult.docs as VariantDoc[]
  const availableSizes = variants.filter((v) => v.stock > 0)

  // Helper: extract URLs from an image entry array
  const extractUrls = (entries: ImageEntry[]): string[] =>
    entries
      .map((img) => {
        const mediaDoc = img.image as MediaDoc
        if (mediaDoc?.url) return mediaDoc.url
        if ((mediaDoc as any)?.filename) return `/media/${(mediaDoc as any).filename}`
        return null
      })
      .filter(Boolean) as string[]

  // AI-generated images (generativeGallery) come first — side_angle is [0] (primary hero).
  // Original product images follow as fallback / supplementary.
  const aiImages = extractUrls(product.generativeGallery ?? [])
  const originalImages = extractUrls(product.images ?? [])
  const images = aiImages.length > 0 ? [...aiImages, ...originalImages] : originalImages

  // ── Content resolution (Geobot → fallback) ────────────────────────────────
  const websiteDescription =
    product.content?.commercePack?.websiteDescription || product.description || null
  const highlights = product.content?.commercePack?.highlights ?? []
  const faq = product.content?.discoveryPack?.faq ?? []
  const validHighlights = Array.isArray(highlights)
    ? highlights.filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
    : []
  const validFaq = Array.isArray(faq)
    ? faq.filter((f): f is FAQItem => !!f && typeof f.q === 'string' && typeof f.a === 'string')
    : []

  // ── Structured data ────────────────────────────────────────────────────────
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.uygunayakkabi.com'
  const productUrl = `${siteUrl}/products/${product.slug}`
  const productJsonLd = buildProductJsonLd(product, productUrl)
  const faqJsonLd = validFaq.length > 0 ? buildFaqJsonLd(validFaq) : null

  return (
    <>
      {/* JSON-LD: Product */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {/* JSON-LD: FAQPage (if FAQ exists) */}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <ProductImages images={images} title={product.title} />

          {/* Details */}
          <div>
            {product.brand && (
              <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide mb-2">
                {product.brand}
              </p>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.title}</h1>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-bold text-brand-600">
                {product.price.toLocaleString('tr-TR')} ₺
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-lg text-gray-400 line-through">
                  {product.originalPrice.toLocaleString('tr-TR')} ₺
                </span>
              )}
              {product.status === 'soldout' && (
                <span className="bg-red-100 text-red-700 text-sm px-3 py-1 rounded-full">
                  Tükendi
                </span>
              )}
              {product.status === 'active' && (
                <span className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full">
                  Stokta Var
                </span>
              )}
            </div>

            {/* Description — Geobot websiteDescription → fallback to basic description */}
            {websiteDescription && (
              <p className="text-gray-600 mb-6 leading-relaxed">{websiteDescription}</p>
            )}

            {/* Highlights — from commercePack.highlights */}
            {validHighlights.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Ürün Özellikleri</h3>
                <ul className="space-y-2">
                  {validHighlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-brand-500 mt-0.5 flex-shrink-0">&#10003;</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sizes */}
            {variants.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Mevcut Bedenler</h3>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant) => (
                    <span
                      key={variant.id}
                      className={`px-4 py-2 border rounded-lg text-sm font-medium ${
                        variant.stock > 0
                          ? 'border-gray-300 text-gray-800 bg-white hover:border-brand-500 cursor-pointer'
                          : 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed line-through'
                      }`}
                    >
                      {variant.size}
                      {variant.stock > 0 && (
                        <span className="ml-1 text-xs text-gray-400">({variant.stock})</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            {product.status === 'active' && availableSizes.length > 0 && (
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '905001234567'}?text=Merhaba, ${encodeURIComponent(product.title)} ürünü hakkında bilgi almak istiyorum. (SKU: ${product.sku})`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-green-600 text-white text-center font-semibold py-4 px-6 rounded-xl hover:bg-green-700 transition-colors mb-4"
              >
                WhatsApp ile Sipariş Ver
              </a>
            )}

            {/* Contact Form */}
            <div className="mt-8 p-6 bg-gray-50 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Bilgi Al / Sipariş Ver
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Adınızı ve telefon numaranızı bırakın, sizi arayalım.
              </p>
              <ContactForm productId={String(product.id)} />
            </div>
          </div>
        </div>

        {/* Product Info Grid */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {product.sku && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">SKU</p>
              <p className="font-mono text-sm text-gray-700">{product.sku}</p>
            </div>
          )}
          {product.category && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Kategori</p>
              <p className="text-sm text-gray-700">{product.category}</p>
            </div>
          )}
          {product.brand && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Marka</p>
              <p className="text-sm text-gray-700">{product.brand}</p>
            </div>
          )}
          {product.color && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Renk</p>
              <p className="text-sm text-gray-700">{product.color}</p>
            </div>
          )}
          {product.material && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Materyal</p>
              <p className="text-sm text-gray-700">{product.material}</p>
            </div>
          )}
        </div>

        {/* FAQ Section — from discoveryPack.faq */}
        <ProductFAQ faq={validFaq} />
      </div>
    </>
  )
}
