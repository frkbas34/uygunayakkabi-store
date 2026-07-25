import assert from 'node:assert'
import { resolveProductStorefrontImageUrls } from './productStorefrontImages'

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

check('prefers usable generated gallery URLs', () => {
  const urls = resolveProductStorefrontImageUrls({
    serverUrl: 'https://www.uygunayakkabi.com/',
    generativeGallery: [
      { image: { sizes: { large: { url: '/media/generated-large.webp' } }, url: '/media/generated.webp' } },
    ],
    images: [{ image: { url: '/media/original.webp' } }],
  })

  assert.deepStrictEqual(urls, ['https://www.uygunayakkabi.com/media/generated-large.webp'])
})

check('falls back to originals when generated rows are unusable', () => {
  const urls = resolveProductStorefrontImageUrls({
    generativeGallery: [{ image: 42 }, { image: null }],
    images: [
      { image: { url: '/media/original.webp' } },
      { image: { filename: 'original detail.webp' } },
    ],
  })

  assert.deepStrictEqual(urls, ['/media/original.webp', '/media/original%20detail.webp'])
})

check('keeps supported direct URLs and removes duplicates', () => {
  const urls = resolveProductStorefrontImageUrls({
    images: [
      'https://cdn.example.com/product.webp',
      'https://cdn.example.com/product.webp',
      '/media/second.webp',
      'payload-relationship-id',
    ],
  })

  assert.deepStrictEqual(urls, [
    'https://cdn.example.com/product.webp',
    '/media/second.webp',
  ])
})

console.log(`\nproductStorefrontImages: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
