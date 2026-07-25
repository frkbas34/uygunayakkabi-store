import assert from 'node:assert'
import { buildFaqJsonLd, buildProductJsonLd } from './productStructuredData'

let passed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (error) {
    console.error(`  fail - ${name}\n    ${(error as Error).message}`)
    process.exitCode = 1
  }
}

const product = {
  title: 'Siyah Gunluk Loafer',
  sku: 'SN0901',
  price: 1299,
  brand: 'UygunAyakkabi',
  description: 'Gunluk kullanim icin rahat loafer.',
}

check('emits product schema with original or generated image URLs and in-stock offer', () => {
  const jsonLd = buildProductJsonLd(product, 'https://www.uygunayakkabi.com/products/siyah-gunluk-loafer-sn0901', {
    inStock: true,
    imageUrls: ['/media/original.webp', '/media/generated.webp'],
  })

  assert.deepStrictEqual(jsonLd.image, ['/media/original.webp', '/media/generated.webp'])
  assert.deepStrictEqual(jsonLd.offers, {
    '@type': 'Offer',
    price: 1299,
    priceCurrency: 'TRY',
    availability: 'https://schema.org/InStock',
    url: 'https://www.uygunayakkabi.com/products/siyah-gunluk-loafer-sn0901',
  })
})

check('reports out-of-stock only when the storefront stock summary says so', () => {
  const jsonLd = buildProductJsonLd(product, 'https://www.uygunayakkabi.com/products/siyah-gunluk-loafer-sn0901', {
    inStock: false,
  })

  assert.strictEqual(
    (jsonLd.offers as Record<string, unknown>).availability,
    'https://schema.org/OutOfStock',
  )
})

check('filters empty FAQ rows', () => {
  const faq = buildFaqJsonLd([
    { q: ' Beden nasil? ', a: ' Standart kalip. ' },
    { q: ' ', a: 'Eksik' },
  ])
  assert.deepStrictEqual(faq.mainEntity, [{
    '@type': 'Question',
    name: 'Beden nasil?',
    acceptedAnswer: { '@type': 'Answer', text: 'Standart kalip.' },
  }])
})

console.log(`\nproductStructuredData: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
