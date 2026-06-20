import { getPayload } from '@/lib/payload'
import { notFound } from 'next/navigation'
import { ProductImages } from '@/components/ProductImages'
import { ContactForm } from '@/components/ContactForm'
import { OOSChip } from '@/components/OOSChip'
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
  sourceMeta?: {
    shopierProductUrl?: string | null
    shopierSyncStatus?: string | null
  } | null
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
    alternates: { canonical: `/products/${product.slug}` },
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
// D-261: Static default process FAQ — shown when product has no DB FAQ data
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_PROCESS_FAQ: FAQItem[] = [
  {
    q: 'Talep bıraktıktan sonra ne olur?',
    a: 'Ekibimiz en kısa sürede sizi telefonla arar. Ürün, beden ve teslimat detaylarını birlikte netleştiririz.',
  },
  {
    q: 'Beden konusunda yardım alabilir miyim?',
    a: 'Evet. Sizi aradığımızda hangi bedeni almanız gerektiği konusunda destek sağlıyoruz. Tereddüt etmeden bilgi bırakabilirsiniz.',
  },
  {
    q: 'Teslimat süreci nasıl işliyor?',
    a: 'Siparişiniz onaylandıktan sonra kargoya verilir ve adresinize teslim edilir. Kargo takip numarası paylaşılır.',
  },
  {
    q: 'Ödeme nasıl yapılır?',
    a: 'Shopier üzerinden güvenli kart ödemesi yapabilir ya da kapıda ödeme seçeneğini tercih edebilirsiniz.',
  },
]

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

  // D-267: similar products — same category, exclude current, max 6
  const similarResult = product.category
    ? await payload.find({
        collection: 'products',
        where: {
          and: [
            { category: { equals: product.category } },
            { id: { not_equals: product.id } },
            { status: { not_equals: 'draft' } },
          ],
        },
        depth: 2,
        limit: 6,
        sort: '-createdAt',
      })
    : { docs: [] }
  const similarProducts = (similarResult as any).docs as ProductDoc[]

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

  // D-335A: surface the discovery article as a visible, server-rendered
  // "Ürün Rehberi" section (existing content only — nothing generated here).
  const dpArticleTitle =
    typeof product.content?.discoveryPack?.articleTitle === 'string'
      ? product.content.discoveryPack.articleTitle.trim()
      : ''
  const dpArticleBody =
    typeof product.content?.discoveryPack?.articleBody === 'string'
      ? product.content.discoveryPack.articleBody.trim()
      : ''
  const articleParagraphs = dpArticleBody
    ? dpArticleBody.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 0)
    : []
  const guideKeywords = Array.isArray(product.content?.discoveryPack?.keywordEntities)
    ? (product.content.discoveryPack.keywordEntities as unknown[])
        .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
        .map((k) => k.trim())
        .slice(0, 12)
    : []
  const showProductGuide = articleParagraphs.length > 0

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
      : { text: variants.length > 0 ? `Stokta · ${availableSizes.length} beden` : 'Stokta', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' }

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

        <main style={{ paddingTop: 104 }}>
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
                <div style={{ position: 'sticky', top: 112 }}>
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
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: 'rgba(28,26,22,0.4)', textDecoration: 'line-through' }}>
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
                        %{Math.round(100 - (product.price / product.originalPrice) * 100)} indirim
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
                      {!isSoldOut && availableSizes.length > 0 ? `BEDEN — ${availableSizes.length} stokta` : 'BEDEN'}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {variants.map((variant) => {
                        const isOut = variant.stock <= 0
                        const isLow = variant.stock > 0 && variant.stock <= 2
                        const sharedStyle = {
                          position: 'relative' as const,
                          minWidth: 50,
                          height: 50,
                          borderRadius: 12,
                          border: isOut
                            ? '1.5px dashed rgba(28,26,22,0.12)'
                            : isLow
                              ? '2px solid #d97706'
                              : '1px solid rgba(28,26,22,0.1)',
                          background: isOut
                            ? 'rgba(28,26,22,0.02)'
                            : isLow
                              ? 'rgba(217,119,6,0.08)'
                              : 'transparent',
                          display: 'flex',
                          flexDirection: 'column' as const,
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 14,
                          fontWeight: 600,
                          color: isOut ? 'rgba(28,26,22,0.25)' : isLow ? '#92400e' : 'rgba(28,26,22,0.5)',
                          cursor: 'pointer',
                          textDecoration: isOut ? 'line-through' : 'none',
                          textDecorationColor: 'rgba(28,26,22,0.2)',
                          transition: 'all 0.2s',
                          padding: '4px 12px',
                          boxSizing: 'border-box' as const,
                        }
                        const chipContent = (
                          <>
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
                          </>
                        )
                        // D-265: OOS chips → OOSChip client component (fires CustomEvent + smooth scroll)
                        return isOut ? (
                          <OOSChip key={variant.id} size={variant.size} />
                        ) : (
                          <div key={variant.id} style={sharedStyle}>
                            {chipContent}
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
                    {/* D-263/D-264: Context-aware size-help note */}
                    <p style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 11,
                      color: 'rgba(28,26,22,0.4)',
                      marginTop: 10,
                      lineHeight: 1.5,
                    }}>
                      {isSoldOut
                        ? 'Farklı beden veya alternatif ürün için talep bırakabilirsiniz — sizi arayarak yardımcı oluruz.'
                        : variants.some((v) => v.stock <= 0)
                          ? 'Üzeri çizili bedenler için aşağıdan talep bırakabilirsiniz — sizi arayarak netleştiririz.'
                          : 'Beden konusunda emin değilseniz talep formumuzu doldurun — sizi arayarak netleştiririz.'}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* D-272: Primary CTA — anchors to inquiry form (former SEPETE EKLE had no onClick) */}
                  {!isSoldOut ? (
                    <a
                      href="#inquiry-form"
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: 17,
                        boxSizing: 'border-box',
                        background: '#1c1a16',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 999,
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        transition: 'all 0.3s',
                        textDecoration: 'none',
                        textAlign: 'center',
                      }}
                    >
                      TALEBİNİZİ OLUŞTURUN
                    </a>
                  ) : (
                    <button
                      disabled
                      style={{
                        width: '100%',
                        padding: 17,
                        background: 'rgba(28,26,22,0.3)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 999,
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'not-allowed',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      STOKTA YOK
                    </button>
                  )}

                  {/* D-207: Shopier ile Öde — direct to product's Shopier page */}
                  {product.sourceMeta?.shopierProductUrl && !isSoldOut && (
                    <a
                      href={product.sourceMeta.shopierProductUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: '100%',
                        padding: 17,
                        boxSizing: 'border-box',
                        background: '#8a4fff',
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
                        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm-1 14l-4-4 1.41-1.41L11 13.17l5.59-5.58L18 9l-7 7z"/>
                      </svg>
                      SHOPIER İLE ÖDE
                    </a>
                  )}

                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Merhaba! "${product.title}" ürünüyle ilgileniyorum. Uygun beden ve stok durumunu, ödeme ve teslimat detaylarını birlikte netleştirebilir miyiz?`)}`}
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
                      letterSpacing: '0.08em',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Bu Ürün İçin Numaramı Sor
                  </a>
                </div>

                {/* D-261: Trust strip — stronger, credible, 4-item 2×2 grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  marginTop: 24,
                  paddingTop: 24,
                  borderTop: '1px solid rgba(28,26,22,0.06)',
                }}>
                  {[
                    { icon: '📞', title: 'WhatsApp Destek', desc: 'Beğendiğiniz model için numara ve stok durumunu birlikte netleştiririz.' },
                    { icon: '📦', title: 'Kargo Süreci', desc: 'Sipariş onayı sonrası kargo ve teslimat bilgileri sizinle paylaşılır.' },
                    { icon: '💬', title: 'Beden Desteği', desc: 'Beden konusunda yönlendiriyoruz' },
                    { icon: '🔒', title: 'Güvenli İletişim', desc: 'Bilgiler yalnızca sipariş için' },
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '12px 14px',
                      background: 'rgba(238,232,222,0.5)',
                      borderRadius: 12,
                      border: '1px solid rgba(28,26,22,0.05)',
                    }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                      <div>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: '#1c1a16', marginBottom: 2 }}>{item.title}</p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: 'rgba(28,26,22,0.4)', lineHeight: 1.4 }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* D-256: Contact Form — id anchor for sticky CTA */}
                <div id="inquiry-form" style={{
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
                    Sipariş Ver veya Beden Sor
                  </h3>
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    color: 'rgba(28,26,22,0.4)',
                    marginBottom: 16,
                    lineHeight: 1.5,
                  }}>
                    Beden seçmek zorunda değilsiniz — sizi arayarak yardımcı oluruz.
                  </p>
                  {/* D-261: 3-step process strip — explains what happens after form submit */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: 20 }}>
                    {[
                      { num: '1', label: 'Formu Doldurun' },
                      { num: '2', label: 'Beden & Teslimat Netleşir' },
                      { num: '3', label: 'Ürün Elinizde' },
                    ].map(({ num, label }, i, arr) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : undefined }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 60 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: '#1c1a16', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700,
                          }}>{num}</div>
                          <span style={{
                            fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600,
                            color: 'rgba(28,26,22,0.4)', textAlign: 'center', lineHeight: 1.3,
                          }}>{label}</span>
                        </div>
                        {i < arr.length - 1 && (
                          <div style={{ flex: 1, height: 1, background: 'rgba(28,26,22,0.1)', margin: '0 4px', marginBottom: 18 }} />
                        )}
                      </div>
                    ))}
                  </div>
                  <ContactForm
                    productId={String(product.id)}
                    productTitle={product.title}
                    variants={variants}
                    soldout={isSoldOut}
                  />
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

            {/* D-261: FAQ — show DB FAQ when available, else static default process FAQ */}
            <div style={{ marginTop: 48 }}>
              <ProductFAQ faq={validFaq.length > 0 ? validFaq : DEFAULT_PROCESS_FAQ} />
            </div>
          </section>

        {/* D-335A: Ürün Rehberi — surfaces the existing discovery article + search
            notes as a visible, server-rendered section (no content generated here).
            Hidden entirely when no usable article content exists. */}
        {showProductGuide && (
          <section style={{ maxWidth: 1440, margin: '0 auto', padding: '48px 40px 8px',
            borderTop: '1px solid rgba(28,26,22,0.08)' }}>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(28,26,22,0.4)',
              marginBottom: 16 }}>Ürün Rehberi</h2>
            {dpArticleTitle && (
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700,
                color: '#1c1a16', lineHeight: 1.25, marginBottom: 20, maxWidth: 760 }}>
                {dpArticleTitle}
              </h3>
            )}
            <div style={{ maxWidth: 760 }}>
              {articleParagraphs.map((para, i) => (
                <p key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: 15,
                  color: 'rgba(28,26,22,0.72)', lineHeight: 1.8, marginBottom: 16 }}>{para}</p>
              ))}
            </div>
            {guideKeywords.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(28,26,22,0.35)',
                  marginBottom: 12 }}>Arama Notları</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {guideKeywords.map((kw, i) => (
                    <span key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: 12,
                      color: 'rgba(28,26,22,0.6)', background: 'rgba(238,232,222,0.7)',
                      border: '1px solid rgba(28,26,22,0.06)', borderRadius: 999,
                      padding: '6px 14px' }}>{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* D-267: Similar products — same category, exclude current */}
        {similarProducts.length > 0 && (
          <section style={{ maxWidth: 1440, margin: '0 auto', padding: '48px 40px 60px',
            borderTop: '1px solid rgba(28,26,22,0.08)' }}>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(28,26,22,0.4)',
              marginBottom: 24 }}>Benzer Modeller</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {similarProducts.map((sp: ProductDoc) => {
                const spImg = extractUrls((sp as any).generativeGallery ?? [])[0]
                  || extractUrls((sp as any).images ?? [])[0] || null
                return (
                  <a key={sp.id} href={`/products/${(sp as any).slug}`}
                    style={{ display: 'block', textDecoration: 'none', borderRadius: 16,
                      overflow: 'hidden', background: 'rgba(238,232,222,0.65)',
                      border: '1px solid rgba(28,26,22,0.06)', transition: 'transform 0.2s' }}>
                    {spImg && (
                      <div style={{ paddingTop: '100%', position: 'relative', background: '#ebe5da' }}>
                        <img src={spImg} alt={(sp as any).title} loading="lazy" style={{ position: 'absolute', inset: 0,
                          width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ padding: '14px 16px 18px' }}>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                        color: '#1c1a16', marginBottom: 6, lineHeight: 1.3 }}>{(sp as any).title}</p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 800,
                        color: '#1c1a16' }}>₺{((sp as any).price || 0).toLocaleString('tr-TR')}</p>
                    </div>
                  </a>
                )
              })}
            </div>
          </section>
        )}
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

      {/* D-288: in-flow spacer so the fixed mobile CTA never overlaps the
          inquiry form, size rows, or footer on small screens (≈360–430px).
          Gated on the same !isSoldOut condition as the bar, and sized to the
          bar height plus the iOS home-indicator safe area. */}
      {!isSoldOut && (
        <div
          className="lg:hidden"
          aria-hidden="true"
          style={{ height: 'calc(60px + env(safe-area-inset-bottom))' }}
        />
      )}

      {/* D-262: Sticky mobile CTA — split WA (secondary) + inquiry form (primary) */}
      {!isSoldOut && (
        <div
          className="lg:hidden"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            display: 'flex',
            gap: 0,
            background: '#1c1a16',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Merhaba! "${product.title}" ürünüyle ilgileniyorum. Uygun beden ve stok durumunu, ödeme ve teslimat detaylarını birlikte netleştirebilir miyiz?`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: '0 0 40%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: '#25D366',
              color: '#fff',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              padding: '16px 12px',
              textDecoration: 'none',
              letterSpacing: '0.01em',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Bilgi Al
          </a>
          <a
            href="#inquiry-form"
            style={{
              flex: '0 0 60%',
              display: 'block',
              background: '#1c1a16',
              color: '#fff',
              textAlign: 'center',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '0.01em',
              padding: '16px 12px',
              textDecoration: 'none',
            }}
          >
            Sipariş Ver — Beni Arayın
          </a>
        </div>
      )}
    </>
  )
}
