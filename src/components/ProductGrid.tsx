import { ProductCard } from './ProductCard'

type Product = {
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

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
