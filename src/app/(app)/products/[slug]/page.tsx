import { getPayload } from '@/lib/payload'
import { notFound } from 'next/navigation'
import { ProductImages } from '@/components/ProductImages'
import { ContactForm } from '@/components/ContactForm'

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

type ProductDoc = {
  id: string | number
  title: string
  slug: string
  sku: string
  price: number
  brand?: string | null
  category?: string | null
  description?: string | null
  status?: string | null
  images?: ImageEntry[] | null
  variants?: VariantDoc[] | null
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayload()

  const { docs } = await payload.find({
    collection: 'products',
    where: {
      slug: { equals: slug },
    },
    depth: 2,
    limit: 1,
  })

  const product = docs[0] as ProductDoc | undefined

  if (!product) {
    notFound()
  }

  // Draft products must not be accessible on the public storefront.
  // Soldout products remain visible (customers may still want to see them / inquire).
  if (product.status === 'draft') {
    notFound()
  }

  // Fetch variants via product_id FK — the Products.variants hasMany relationship
  // uses products_rels join table which may be empty in production.
  const variantResult = await payload.find({
    collection: 'variants',
    where: { product: { equals: product.id } },
    depth: 0,
    limit: 50,
    sort: 'size',
  })
  const variants = variantResult.docs as VariantDoc[]
  const availableSizes = variants.filter((v) => v.stock > 0)

  const images = (product.images ?? [])
    .map((img) => {
      const mediaDoc = img.image as MediaDoc
      // Try url field first, then construct from filename
      if (mediaDoc?.url) return mediaDoc.url
      if ((mediaDoc as any)?.filename) return `/media/${(mediaDoc as any).filename}`
      return null
    })
    .filter(Boolean) as string[]

  return (
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

          {product.description && (
            <p className="text-gray-600 mb-6">{product.description}</p>
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
              📱 WhatsApp ile Sipariş Ver
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

      {/* Product Info */}
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
      </div>
    </div>
  )
}
