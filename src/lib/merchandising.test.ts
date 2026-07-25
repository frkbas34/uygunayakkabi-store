import assert from 'node:assert'
import {
  isHomepageEligible,
  isPlaceholderProductTitle,
  isPublicStorefrontProduct,
  isStorefrontProductSafe,
  resolveHomepageSections,
  type MerchandisableProduct,
  type MerchandisingSettings,
} from './merchandising'

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

function product(
  id: number,
  overrides: Partial<MerchandisableProduct> = {},
): MerchandisableProduct {
  return {
    id,
    status: 'active',
    price: 1000,
    workflow: { sellable: true, stockState: 'in_stock' },
    merchandising: {},
    ...overrides,
  }
}

check('homepage eligibility excludes unavailable or hidden products', () => {
  assert.strictEqual(isHomepageEligible(product(1)), true)
  assert.strictEqual(isHomepageEligible(product(2, { status: 'draft' })), false)
  assert.strictEqual(isHomepageEligible(product(3, { workflow: { sellable: false } })), false)
  assert.strictEqual(isHomepageEligible(product(4, { workflow: { sellable: true, stockState: 'sold_out' } })), false)
  assert.strictEqual(isHomepageEligible(product(5, { merchandising: { homepageHidden: true } })), false)
})

check('public storefront safety excludes placeholder and protected-brand legacy records', () => {
  const placeholder = product(6, { title: 'Taslak Urun 20-07-5280' })
  const protectedBrand = product(7, { title: 'Camper Sneaker Kahverengi' })
  const clean = product(8, { title: 'Gunluk Deri Loafer' })

  assert.strictEqual(isPlaceholderProductTitle(placeholder), true)
  assert.strictEqual(isStorefrontProductSafe(placeholder), false)
  assert.strictEqual(isHomepageEligible(placeholder), false)
  assert.strictEqual(isStorefrontProductSafe(protectedBrand), false)
  assert.strictEqual(isHomepageEligible(protectedBrand), false)
  assert.strictEqual(isStorefrontProductSafe(clean), true)
  assert.strictEqual(isHomepageEligible(clean), true)
})

check('public PDP gate requires both a public lifecycle state and storefront safety', () => {
  assert.strictEqual(isPublicStorefrontProduct(product(9, { title: 'Clean Public Loafer', status: 'active' })), true)
  assert.strictEqual(isPublicStorefrontProduct(product(10, { title: 'Clean Sold Out Loafer', status: 'soldout' })), true)
  assert.strictEqual(isPublicStorefrontProduct(product(11, { title: 'Clean Draft Loafer', status: 'draft' })), false)
  assert.strictEqual(isPublicStorefrontProduct(product(12, { title: 'Camper Public Sneaker', status: 'active' })), false)
})

check('resolver returns only eligible products in their intended curated sections', () => {
  const now = new Date('2026-07-24T12:00:00.000Z')
  const products = [
    product(1, {
      merchandising: {
        publishedAt: '2026-07-23T12:00:00.000Z',
        newUntil: '2026-07-31T12:00:00.000Z',
        manualPopular: true,
      },
    }),
    product(2, {
      originalPrice: 1500,
      merchandising: {
        bestSellerPinned: true,
        manualDeal: true,
        bestSellerScore: 10,
      },
    }),
    product(3, {
      status: 'soldout',
      originalPrice: 1800,
      merchandising: {
        publishedAt: '2026-07-24T10:00:00.000Z',
        newUntil: '2026-07-31T12:00:00.000Z',
        manualPopular: true,
        bestSellerPinned: true,
        manualDeal: true,
      },
    }),
    product(4, {
      originalPrice: 2500,
      merchandising: { bestSellerScore: 7 },
    }),
  ]
  const settings: MerchandisingSettings = {
    bestSellerScoring: { bestSellerMinimumScore: 5 },
  }

  const sections = resolveHomepageSections(products, settings, now)

  assert.deepStrictEqual(sections.yeni.map((item) => item.id), [1])
  assert.deepStrictEqual(sections.popular.map((item) => item.id), [1])
  assert.deepStrictEqual(sections.bestSellers.map((item) => item.id), [2, 4])
  assert.deepStrictEqual(sections.deals.map((item) => item.id), [2])
  assert.deepStrictEqual(sections.discounted.map((item) => item.id), [4, 2])
})

check('section toggles disable their corresponding homepage rails', () => {
  const products = [
    product(1, { merchandising: { manualPopular: true, bestSellerPinned: true, manualDeal: true } }),
    product(2, { originalPrice: 1200, merchandising: { manualPopular: true, bestSellerPinned: true, manualDeal: true } }),
  ]
  const sections = resolveHomepageSections(products, {
    sectionToggles: {
      enablePopular: false,
      enableBestSellers: false,
      enableDeals: false,
      enableDiscounted: false,
    },
  })

  assert.deepStrictEqual(sections.popular, [])
  assert.deepStrictEqual(sections.bestSellers, [])
  assert.deepStrictEqual(sections.deals, [])
  assert.deepStrictEqual(sections.discounted, [])
})

console.log(`\nmerchandising: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
