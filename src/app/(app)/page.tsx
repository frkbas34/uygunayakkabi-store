import { getPayload } from '@/lib/payload'
import { ProductGrid } from '@/components/ProductGrid'

export const revalidate = 60

export default async function HomePage() {
  const payload = await getPayload()

  const { docs: products } = await payload.find({
    collection: 'products',
    where: {
      status: {
        equals: 'active',
      },
    },
    limit: 48,
    sort: '-createdAt',
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Uygun Fiyatlı Ayakkabılar
        </h1>
        <p className="text-xl text-gray-500">
          Nike, Adidas ve çok daha fazlası — uygun fiyatlarla
        </p>
      </section>

      <section id="products">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Tüm Ürünler</h2>
        {products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Henüz ürün eklenmemiş.</p>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </section>
    </div>
  )
}
