import { getPayload } from '@/lib/payload'
import { notFound } from 'next/navigation'
import { ProductImages } from '@/components/ProductImages'
import { ContactForm } from '@/components/ContactForm'
import { ProductFAQ } from '@/components/ProductFAQ'
import { StorefrontNavbar } from '@/components/StorefrontNavbar'
import { StorefrontFooter } from '@/components/StorefrontFooter'
import Link from 'next/link'
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
  stockNumber?: string | null
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
// SEO Metadata
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

  const baseUrl = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://uygunayakkabi.com').replace(/\/$/, '')
  const ogImage = (() => {
    const gallery = product.generativeGallery ?? []
    if (gallery.length === 0) {
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
      url: `${baseUrl}/products/${product.slug}`,
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
  const desc =
    product.content?.commercePack?.websiteDescription ||
    product.title

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
// Product Page — Merged: SPA beige theme + SSR enhancements
// ─────────────────────────────────────────────────────────────────────────────

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    notFound()
  }

  if (product.status === 'draft') {
    notFound()
  }

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
  const totalStock = availableSizes.reduce((sum, v) => sum + v.stock, 0)
  const isSoldOut = product.status === 'soldout' || totalStock === 0

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || ''
  const extractUrls = (entries: ImageEntry[]): string[] =>
    entries
      .map((img) => {
        const mediaDoc = img.image as MediaDoc
        if (!mediaDoc || typeof mediaDoc === 'number' || typeof mediaDoc === 'string') return null
        const largeUrl = (mediaDoc as any)?.sizes?.large?.url
        if (largeUrl) return largeUrl.startsWith('http') ? largeUrl : `${serverUrl}${largeUrl}`
        if (mediaDoc?.url) return mediaDoc.url.startsWith('http') ? mediaDoc.url : `${serverUrl}${mediaDoc.url}`
        if ((mediaDoc as any)?.filename) return `/media/${(mediaDoc as any).filename}`
        return null
      })
      .filter(Boolean) as string[]

  const images = extractUrls(product.generativeGallery ?? [])

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.uygunayakkabi.com'
  const productUrl = `${siteUrl}/products/${product.slug}`
  const productJsonLd = buildProductJsonLd(product, productUrl)
  const faqJsonLd = validFaq.length > 0 ? buildFaqJsonLd(validFaq) : null
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '905331524843'

  // Stock badge
  const stockBadge = isSoldOut
    ? { text: 'Stokta Yok', color: '#c8102e', bg: 'rgba(200,16,46,0.06)' }
    : totalStock <= 6
      ? { text: `Son ${totalStock} adet!`, color: '#d97706', bg: 'rgba(217,119,6,0.1)' }
      : { text: 'Stokta', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* Load Inter + Playfair fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />

      <div style={{ background: '#f4efe6', minHeight: '100vh' }}>
        <StorefrontNavbar />

        <main style={{ paddingTop: 80 }}>
          <section style={{ maxWidth: 1440, margin: '0 auto', padding: '40px 40px 60px' }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
              <Link
                href="/"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11,
                  color: 'rgba(28,26,22,0.3)',
                  textDecoration: 'none',
                  letterSpacing: '0.06em',
                }}
              >
                ← AYAKKABILAR
              </Link>
              <span style={{ color: 'rgba(28,26,22,0.15)' }}>/</span>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11,
                  color: '#1c1a16',
                  fontWeight: 500,
                }}
              >
                {product.title}
              </span>
            </div>

            {/* Main Grid */}
            <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }}>
              {/* Gallery — sticky */}
              <div>
                <div style={{ position: 'sticky', top: 88 }}>
                  <ProductImages images={images} title={product.title} />
                </div>
              </div>

              {/* Info */}
              <div style={{ paddingTop: 20 }}>
                {/* Category tag */}
                {product.category && (
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: '#c8102e',
                    marginBottom: 10,
                  }}>
                    {product.category}
                  </p>
                )}

                {/* Title */}
                <h1 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(28px, 3vw, 38px)',
                  fontWeight: 700,
                  color: '#1c1a16',
                  marginBottom: 16,
                  letterSpacing: '-0.02em',
                }}>
                  {product.title}
                </h1>

                {/* Price row */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 30, fontWeight: 800, color: '#1c1a16' }}>
                    ₺{product.price.toLocaleString('tr-TR')}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: 'rgba(28,26,22,0.3)', textDecoration: 'line-through' }}>
                        ₺{product.originalPrice.toLocaleString('tr-TR')}
                      </span>
                      <span style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#c8102e',
                        background: 'rgba(200,16,46,0.06)',
                        padding: '4px 14px',
                        borderRadius: 999,
                      }}>
                        %{Math.round(100 - (product.price / product.originalPrice) * 100)}
                      </span>
                    </>
                  )}
                </div>

                {/* Description */}
                {websiteDescription && (
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 15,
                    color: 'rgba(28,26,22,0.5)',
                    lineHeight: 1.7,
                    marginBottom: 24,
                    maxWidth: 480,
                  }}>
                    {websiteDescription}
                  </p>
                )}

                {/* Stock badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 999,
                  background: stockBadge.bg,
                  marginBottom: 28,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: stockBadge.color }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: stockBadge.color }}>
                    {stockBadge.text}
                  </span>
                </div>

                {/* NEW: Ürün Özellikleri — highlights card */}
                {validHighlights.length > 0 && (
                  <div style={{
                    marginBottom: 28,
                    background: 'rgba(238,232,222,0.65)',
                    borderRadius: 16,
                    padding: '20px 24px',
                    border: '1px solid rgba(28,26,22,0.06)',
                  }}>
                    <h3 style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#1c1a16',
                      marginBottom: 14,
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8102e" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Ürün Özellikleri
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {validHighlights.map((h, i) => (
                        <li key={i} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 13,
                          color: 'rgba(28,26,22,0.5)',
                          lineHeight: 1.5,
                        }}>
                          <span style={{ color: '#22c55e', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sizes — merged: old style + NEW amber low-stock indicators */}
                {variants.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <p style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'rgba(28,26,22,0.3)',
                      marginBottom: 12,
                    }}>
                      BEDEN
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {variants.map((variant) => {
                        const isOut = variant.stock <= 0
                        const isLow = variant.stock > 0 && variant.stock <= 2
                        return (
                          <div
                            key={variant.id}
                            style={{
                              position: 'relative',
                              minWidth: 50,
                              height: 50,
                              borderRadius: 12,
                              border: isOut
                                ? '1px solid rgba(28,26,22,0.06)'
                                : isLow
                                  ? '2px solid #d97706'
                                  : '1px solid rgba(28,26,22,0.1)',
                              background: isOut
                                ? 'rgba(28,26,22,0.03)'
                                : isLow
                                  ? 'rgba(217,119,6,0.08)'
                                  : 'transparent',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: "'Inter', sans-serif",
                              fontSize: 14,
                              fontWeight: 600,
                              color: isOut ? 'rgba(28,26,22,0.2)' : isLow ? '#92400e' : 'rgba(28,26,22,0.5)',
                              cursor: isOut ? 'not-allowed' : 'pointer',
                              textDecoration: isOut ? 'line-through' : 'none',
                              transition: 'all 0.2s',
                              padding: '4px 12px',
                            }}
                          >
                            <span>{variant.size}</span>
                            {variant.stock > 0 && (
                              <span style={{
                                fontSize: 9,
                                fontWeight: 500,
                                color: isLow ? '#b45309' : 'rgba(28,26,22,0.25)',
                                marginTop: -2,
                              }}>
                                ({variant.stock})
                              </span>
                            )}
                            {isLow && (
                              <div style={{
                                position: 'absolute',
                                top: -4,
                                right: -4,
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: '#d97706',
                                border: '2px solid #f4efe6',
                              }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {variants.some((v) => v.stock > 0 && v.stock <= 2) && (
                      <p style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 10,
                        color: '#d97706',
                        marginTop: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
                        Sarı bedenler tükenmek üzere
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* SEPETE EKLE */}
                  <button
                    disabled={isSoldOut}
                    style={{
                      width: '100%',
                      padding: 17,
                      background: !isSoldOut ? '#1c1a16' : 'rgba(28,26,22,0.3)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 999,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: !isSoldOut ? 'pointer' : 'not-allowed',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      transition: 'all 0.3s',
                    }}
                  >
                    {!isSoldOut ? 'SEPETE EKLE' : 'STOKTA YOK'}
                  </button>

                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/${waNumber}?text=Merhaba!%20${encodeURIComponent(product.title)}%20hakkında%20bilgi%20almak%20istiyorum.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: '100%',
                      padding: 17,
                      boxSizing: 'border-box',
                      background: '#25D366',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 999,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                      fontWeight: 700,
                      textDecoration: 'none',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      transition: 'all 0.3s',
                      cursor: 'pointer',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WHATSAPP İLE SİPARİŞ VER
                  </a>
                </div>

                {/* Trust Badges */}
                <div style={{
                  display: 'flex',
                  gap: 24,
                  marginTop: 20,
                  paddingTop: 20,
                  borderTop: '1px solid rgba(28,26,22,0.06)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11,
                    color: 'rgba(28,26,22,0.3)',
                  }}>
                    <span style={{ fontSize: 16 }}>✓</span> Ücretsiz Kargo
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11,
                    color: 'rgba(28,26,22,0.3)',
                  }}>
                    <span style={{ fontSize: 16 }}>✓</span> Hızlı Teslimat
                  </div>
                </div>

                {/* NEW: Contact Form */}
                <div style={{
                  marginTop: 32,
                  padding: 24,
                  background: 'rgba(238,232,222,0.65)',
                  borderRadius: 16,
                  border: '1px solid rgba(28,26,22,0.06)',
                }}>
                  <h3 style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#1c1a16',
                    marginBottom: 4,
                  }}>
                    Bilgi Al / Sipariş Ver
                  </h3>
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    color: 'rgba(28,26,22,0.3)',
                    marginBottom: 20,
                  }}>
                    Adınızı ve telefon numaranızı bırakın, sizi arayalım.
                  </p>
                  <ContactForm productId={String(product.id)} />
                </div>
              </div>
            </div>

            {/* Product code (SN number from generated images) */}
            {product.stockNumber && (
              <div style={{
                marginTop: 48,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                color: 'rgba(28,26,22,0.3)',
                letterSpacing: '0.06em',
              }}>
                Ürün Kodu: <span style={{ fontWeight: 600, color: 'rgba(28,26,22,0.5)' }}>{product.stockNumber}</span>
              </div>
            )}

            {/* FAQ Section */}
            {validFaq.length > 0 && (
              <div style={{ marginTop: 48 }}>
                <ProductFAQ faq={validFaq} />
              </div>
            )}
          </section>
        </main>

        <StorefrontFooter />
      </div>

      {/* Responsive CSS */}
      <style>{`
        @media(max-width:768px) {
          .detail-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </>
  )
}
