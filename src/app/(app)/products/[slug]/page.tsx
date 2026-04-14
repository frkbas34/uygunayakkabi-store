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
    depth: 3,
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

  // D-195b: Extract first AI-generated image for og:image + twitter:card
  const baseUrl = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://uygunayakkabi.com').replace(/\/$/, '')
  const ogImage = (() => {
    const gallery = product.generativeGallery ?? []
    if (gallery.length === 0) {
      // Fallback to original images
      const originals = product.images ?? []
      if (originals.length === 0) return undefined
      const first = originals[0]
      const mediaDoc = (typeof first === 'object' && first !== null && 'image' in first)
        ? first.image as MediaDoc
        : null
      const url = mediaDoc?.url
      if (!url) return undefined
      return url.startsWith('http') ? url : `${baseUrl}${url}`
    }
    const first = gallery[0]
    const mediaDoc = first.image as MediaDoc
    const url = mediaDoc?.url
    if (!url) return undefined
    return url.startsWith('http') ? url : `${baseUrl}${url}`
  })()

  return {
    title: metaTitle,
    description: metaDescription,
    ...(keywords && keywords.length > 0 ? { keywords: keywords.join(', ') } : {}),
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'website',
      url: `${baseUrl}/urun/${product.slug}`,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 1200, alt: product.title }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: metaTitle,
      description: metaDescription,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON-LD Structured Data
// ─────────────────────────────────────────────────────────────────────────────

function buildProductJsonLd(product: ProductDoc, url: string) {
  // D-174b: Only GeoBot description, fallback to title (never intake placeholder)
  const desc =
    product.content?.commercePack?.websiteDescription ||
    product.title

  // Extract first image URL for schema — AI images only, never originals
  const imageUrl = (() => {
    const gallery = product.generativeGallery ?? []
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

  // D-187: depth:3 + defensive check for unresolved relationships (raw ID instead of object).
  // Prefer sizes.large (1200px) for detail page quality; prepend serverUrl for relative paths.
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || ''
  const extractUrls = (entries: ImageEntry[]): string[] =>
    entries
      .map((img) => {
        const mediaDoc = img.image as MediaDoc
        // If relationship not resolved (still a raw ID), skip gracefully
        if (!mediaDoc || typeof mediaDoc === 'number' || typeof mediaDoc === 'string') return null
        const largeUrl = (mediaDoc as any)?.sizes?.large?.url
        if (largeUrl) return largeUrl.startsWith('http') ? largeUrl : `${serverUrl}${largeUrl}`
        if (mediaDoc?.url) return mediaDoc.url.startsWith('http') ? mediaDoc.url : `${serverUrl}${mediaDoc.url}`
        if ((mediaDoc as any)?.filename) return `/media/${(mediaDoc as any).filename}`
        return null
      })
      .filter(Boolean) as string[]

  // D-174b: NEVER show original reference photos on the public storefront.
  // Original photos (product.images) are internal-only intake references.
  // Only AI-generated images from generativeGallery are displayed.
  // If no AI images exist yet, the gallery will be empty (no fallback to originals).
  const images = extractUrls(product.generativeGallery ?? [])

  // ── Content resolution (Geobot websiteDescription ONLY) ───────────────────
  // D-174b: Do NOT fall back to product.description — that's the auto-generated
  // intake placeholder (e.g. "Nike Beyaz Ayakkabı — uygun fiyatlı ayakkabı").
  // Only show GeoBot-generated websiteDescription. If not generated yet, show nothing.
  const websiteDescription =
    product.content?.commercePack?.websiteDescription || null
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Images — wrapper stretches to row height, inner sticky child sticks */}
          <div>
            <div className="lg:sticky lg:top-8">
              <ProductImages images={images} title={product.title} />
            </div>
          </div>

          {/* Details */}
          <div>
            {product.brand && (
              <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-3">
                {product.brand}
              </p>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 leading-tight">{product.title}</h1>

            {/* Price row */}
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-extrabold text-gray-900">
                {product.price.toLocaleString('tr-TR')} ₺
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    {product.originalPrice.toLocaleString('tr-TR')} ₺
                  </span>
                  <span className="text-sm font-bold text-white bg-red-500 px-2 py-0.5 rounded-md">
                    %{Math.round(100 - (product.price / product.originalPrice) * 100)} indirim
                  </span>
                </>
              )}
            </div>

            {/* Status + stock count */}
            <div className="flex items-center gap-3 mb-5">
              {product.status === 'soldout' && (
                <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-red-100">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  Tükendi
                </span>
              )}
              {product.status === 'active' && availableSizes.length > 0 && (() => {
                const totalStock = availableSizes.reduce((sum, v) => sum + v.stock, 0)
                const isLow = totalStock <= 6
                return (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
                    isLow
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isLow ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    {isLow ? `Son ${totalStock} adet!` : 'Stokta'}
                  </span>
                )
              })()}
              {availableSizes.length > 0 && (
                <span className="text-xs text-gray-400">
                  {availableSizes.length} beden mevcut
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 mb-5" />

            {/* Description */}
            {websiteDescription && (
              <p className="text-gray-600 mb-6 leading-relaxed text-[15px]">{websiteDescription}</p>
            )}

            {/* Highlights — card style */}
            {validHighlights.length > 0 && (
              <div className="mb-6 bg-gray-50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ürün Özellikleri
                </h3>
                <ul className="space-y-2.5">
                  {validHighlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <span className="text-emerald-500 mt-0.5 flex-shrink-0 font-bold">&#10003;</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sizes — enhanced pills with stock urgency */}
            {variants.length > 0 && (
              <div className="mb-7">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                  Mevcut Bedenler
                </h3>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant) => {
                    const isOut = variant.stock <= 0
                    const isLow = variant.stock > 0 && variant.stock <= 2
                    return (
                      <span
                        key={variant.id}
                        className={`relative px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all ${
                          isOut
                            ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed line-through'
                            : isLow
                              ? 'border-amber-300 text-amber-800 bg-amber-50 hover:border-amber-400'
                              : 'border-gray-200 text-gray-800 bg-white hover:border-brand-500 hover:shadow-sm'
                        }`}
                      >
                        {variant.size}
                        {variant.stock > 0 && (
                          <span className={`ml-1.5 text-xs font-normal ${isLow ? 'text-amber-600' : 'text-gray-400'}`}>
                            ({variant.stock})
                          </span>
                        )}
                        {isLow && (
                          <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-white" />
                        )}
                      </span>
                    )
                  })}
                </div>
                {variants.some((v) => v.stock > 0 && v.stock <= 2) && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full inline-block" />
                    Sarı bedenler tükenmek üzere
                  </p>
                )}
              </div>
            )}

            {/* WhatsApp CTA — prominent with icon */}
            {product.status === 'active' && availableSizes.length > 0 && (
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '905001234567'}?text=Merhaba, ${encodeURIComponent(product.title)} ürünü hakkında bilgi almak istiyorum. (SKU: ${product.sku})`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full bg-[#25D366] text-white text-center font-bold py-4 px-6 rounded-2xl hover:bg-[#1fb855] transition-all hover:shadow-lg hover:shadow-green-200 mb-6"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp ile Sipariş Ver
              </a>
            )}

            {/* Contact Form — refined card */}
            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                Bilgi Al / Sipariş Ver
              </h3>
              <p className="text-sm text-gray-400 mb-5">
                Adınızı ve telefon numaranızı bırakın, sizi arayalım.
              </p>
              <ContactForm productId={String(product.id)} />
            </div>
          </div>
        </div>

        {/* Product Info Grid */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3">
          {product.sku && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">SKU</p>
              <p className="font-mono text-sm text-gray-700">{product.sku}</p>
            </div>
          )}
          {product.category && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Kategori</p>
              <p className="text-sm text-gray-700">{product.category}</p>
            </div>
          )}
          {product.brand && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Marka</p>
              <p className="text-sm text-gray-700">{product.brand}</p>
            </div>
          )}
          {product.color && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Renk</p>
              <p className="text-sm text-gray-700">{product.color}</p>
            </div>
          )}
          {product.material && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Materyal</p>
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
