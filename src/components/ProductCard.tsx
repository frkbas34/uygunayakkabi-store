import Link from 'next/link'
import Image from 'next/image'

type ProductCardProps = {
  product: {
    id: string | number
    title: string
    slug: string
    price: number
    brand?: string | null
    status?: string | null
    images?: Array<{
      image: { url?: string | null } | string | number | null
    }> | null
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const firstImage = product.images?.[0]
  const imageUrl =
    firstImage && typeof firstImage.image === 'object' && firstImage.image !== null
      ? (firstImage.image as { url?: string | null }).url
      : null

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="relative aspect-square bg-gray-100">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-5xl">👟</span>
            </div>
          )}
          {product.status === 'soldout' && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white text-gray-800 font-semibold px-4 py-2 rounded-full text-sm">
                Tükendi
              </span>
            </div>
          )}
        </div>

        <div className="p-4">
          {product.brand && (
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
              {product.brand}
            </p>
          )}
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
            {product.title}
          </h3>
          <p className="text-lg font-bold text-gray-900">
            {product.price.toLocaleString('tr-TR')} ₺
          </p>
        </div>
      </div>
    </Link>
  )
}
