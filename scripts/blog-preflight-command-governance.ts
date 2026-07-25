import assert from 'node:assert'
import { readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(text: string, needle: string, label: string): void {
  assert.ok(text.includes(needle), `${label} must include: ${needle}`)
}

const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }
const scripts = packageJson.scripts ?? {}
assert.strictEqual(scripts['test:blog-preflight'], 'tsx src/lib/blogPublishingPreflight.test.ts')
assert.strictEqual(scripts['test:blog-publishing-guard'], 'tsx src/collections/BlogPosts.test.ts')
assert.ok(scripts['test:safe']?.includes('npm run test:blog-preflight'), 'test:safe must cover blog preflight')
assert.ok(scripts['test:safe']?.includes('npm run test:blog-publishing-guard'), 'test:safe must cover BlogPosts publishing guard')

const route = read('src/app/api/telegram/route.ts')
const start = route.indexOf('// D-479: Blog editorial publishing preflight.')
const end = route.indexOf('// D-477/D-478: explicit operator provenance record.', start)
assert.ok(start >= 0 && end > start, 'blog preflight command boundary must be present')
const commandBlock = route.slice(start, end)
for (const required of [
  "firstWordBlogPreflight === '/blogpreflight'",
  'findBlogPostForPreflight',
  'evaluateBlogPublishingPreflight',
  'formatBlogPublishingPreflight',
  'Read-only: checks article essentials',
]) {
  assertIncludes(commandBlock, required, 'blog preflight command')
}
assert.ok(!commandBlock.includes('payload.update('), 'blog preflight must not update a blog post')
assert.ok(!commandBlock.includes('payload.create('), 'blog preflight must not create a blog post')
assert.ok(!commandBlock.includes("status: 'published'"), 'blog preflight must not publish a blog post')

const collection = read('src/collections/BlogPosts.ts')
assertIncludes(collection, 'evaluateBlogPublishingPreflight', 'BlogPosts publishing guard')
assertIncludes(collection, 'Blog publication blocked:', 'BlogPosts publishing guard')
assertIncludes(collection, "candidate.status === 'published'", 'BlogPosts publishing transition guard')
assertIncludes(collection, 'nextData.publishedAt', 'BlogPosts published timestamp default')

const publicDetail = read('src/app/(app)/blog/[slug]/page.tsx')
assertIncludes(publicDetail, "collection: 'blog-posts'", 'public blog detail query')
assertIncludes(publicDetail, "{ status: { equals: 'published' } }", 'public blog detail publish filter')

console.log('blogPreflightCommandGovernance: read-only diagnostics and guarded first publication - ALL OK')
