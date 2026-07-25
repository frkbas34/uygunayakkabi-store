export type ProductStructuredDataInput = {
  title: string
  sku?: string | null
  price?: number | null
  brand?: string | null
  color?: string | null
  material?: string | null
  description?: string | null
}

export type ProductStructuredDataOptions = {
  imageUrls?: string[] | null
  inStock: boolean
}

export type FaqStructuredDataItem = {
  q: string
  a: string
}

function text(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function imageUrls(values: string[] | null | undefined): string[] {
  if (!Array.isArray(values)) return []
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0))]
}

export function buildProductJsonLd(
  product: ProductStructuredDataInput,
  url: string,
  options: ProductStructuredDataOptions,
): Record<string, unknown> {
  const images = imageUrls(options.imageUrls)
  const description = text(product.description) ?? product.title
  const sku = text(product.sku)
  const price = typeof product.price === 'number' && Number.isFinite(product.price)
    ? product.price
    : null

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description,
    ...(sku ? { sku } : {}),
    url,
    ...(text(product.brand) ? { brand: { '@type': 'Brand', name: text(product.brand) } } : {}),
    ...(text(product.color) ? { color: text(product.color) } : {}),
    ...(text(product.material) ? { material: text(product.material) } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    ...(price === null
      ? {}
      : {
          offers: {
            '@type': 'Offer',
            price,
            priceCurrency: 'TRY',
            availability: options.inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            url,
          },
        }),
  }
}

export function buildFaqJsonLd(faq: FaqStructuredDataItem[]): Record<string, unknown> {
  const validFaq = faq
    .map((item) => ({ q: item.q.trim(), a: item.a.trim() }))
    .filter((item) => item.q.length > 0 && item.a.length > 0)

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: validFaq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }
}
