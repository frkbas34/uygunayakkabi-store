import assert from 'node:assert'

import { BlogPosts } from './BlogPosts'

let passed = 0

function article(text = 'Bu uzunluk kontrolu icin yeterli bir ayakkabi bakim rehberi metnidir. '.repeat(8)) {
  return {
    root: {
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', text }] }],
    },
  }
}

function publishableData(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Gunluk Ayakkabi Bakimi Icin Pratik Rehber',
    slug: 'gunluk-ayakkabi-bakimi-icin-pratik-rehber',
    excerpt: 'Gunluk ayakkabi bakiminda uygulayabileceginiz pratik ve dikkatli adimlari anlatan bir rehber.',
    content: article(),
    status: 'published',
    ...overrides,
  }
}

function beforeChange() {
  const hook = BlogPosts.hooks?.beforeChange?.[0]
  assert.ok(hook, 'BlogPosts must register a beforeChange publishing guard')
  return hook as any
}

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

check('sets publishedAt on a first valid publication', () => {
  const data = publishableData()
  const result = beforeChange()({ data, originalDoc: undefined }) as Record<string, unknown>
  assert.strictEqual(result, data)
  assert.ok(typeof result.publishedAt === 'string' && result.publishedAt.length > 0)
})

check('refuses an incomplete article when it transitions to published', () => {
  assert.throws(
    () => beforeChange()({
      data: publishableData({ title: 'Taslak', content: article('Kisa') }),
      originalDoc: { status: 'draft' },
    }),
    /Blog publication blocked/,
  )
})

check('does not retroactively block an edit to a legacy published article', () => {
  const data = { title: 'Legacy heading' }
  const result = beforeChange()({
    data,
    originalDoc: { status: 'published', title: 'Legacy heading', content: article('Kisa') },
  })
  assert.strictEqual(result, data)
})

console.log(`\nBlogPosts publishing guard: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
