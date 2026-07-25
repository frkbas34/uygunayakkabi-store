import assert from 'node:assert'

import {
  BLOG_MIN_CONTENT_LENGTH,
  evaluateBlogPublishingPreflight,
  extractBlogPlainText,
  formatBlogPublishingPreflight,
} from './blogPublishingPreflight'

let passed = 0

function article(text = 'Bu uzunluk kontrolu icin yeterli bir ayakkabi bakim rehberi metnidir. '.repeat(8)) {
  return {
    root: {
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', text }] }],
    },
  }
}

function validPost(overrides: Record<string, unknown> = {}) {
  return {
    id: 801,
    title: 'Gunluk Ayakkabi Bakimi Icin Pratik Rehber',
    slug: 'gunluk-ayakkabi-bakimi-icin-pratik-rehber',
    excerpt: 'Gunluk ayakkabi bakiminda uygulayabileceginiz pratik ve dikkatli adimlari anlatan bir rehber.',
    content: article(),
    source: 'manual',
    status: 'draft',
    seo: {
      title: 'Gunluk Ayakkabi Bakimi Rehberi',
      description: 'Gunluk ayakkabi bakimi icin pratik, dikkatli ve urune uygun oneriler.',
    },
    ...overrides,
  }
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

check('accepts a complete manual article for manual editorial review', () => {
  const preflight = evaluateBlogPublishingPreflight(validPost())
  assert.strictEqual(preflight.readiness, 'ready')
  assert.deepStrictEqual(preflight.blockers, [])
  assert.ok(preflight.contentLength >= BLOG_MIN_CONTENT_LENGTH)
})

check('blocks placeholder or incomplete public article essentials', () => {
  const preflight = evaluateBlogPublishingPreflight(validPost({
    title: 'Taslak',
    slug: 'Taslak Slug',
    excerpt: 'Kisa',
    content: article('Kisa metin'),
  }))
  assert.strictEqual(preflight.readiness, 'blocked')
  assert.ok(preflight.blockers.some((item) => item.includes('placeholder')))
  assert.ok(preflight.blockers.some((item) => item.includes('Slug')))
  assert.ok(preflight.blockers.some((item) => item.includes('Article body')))
})

check('requires a human review for AI articles and evidence-sensitive claims', () => {
  const preflight = evaluateBlogPublishingPreflight(validPost({
    source: 'ai',
    content: article('Bu orijinal urun bakim rehberi icin garantili sonuc vaadi vermeden bilgi sunar. '.repeat(6)),
  }))
  assert.strictEqual(preflight.readiness, 'needs_review')
  assert.ok(preflight.reviewItems.some((item) => item.includes('AI-generated')))
  assert.ok(preflight.reviewItems.some((item) => item.includes('orijinal')))
  assert.ok(preflight.reviewItems.some((item) => item.includes('garantili')))
})

check('extracts nested Lexical text and formats an explicitly read-only result', () => {
  assert.strictEqual(extractBlogPlainText(article('Birinci paragraf')), 'Birinci paragraf')
  const message = formatBlogPublishingPreflight(evaluateBlogPublishingPreflight(validPost()))
  assert.ok(message.includes('Blog Editorial Preflight'))
  assert.ok(message.includes('Read-only: this command never changes the article'))
})

console.log(`\nblogPublishingPreflight: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
