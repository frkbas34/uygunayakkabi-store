import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const blogPage = readFileSync('src/app/(app)/blog/[slug]/page.tsx', 'utf8')
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}

assert.ok(
  blogPage.includes("import { serializeJsonLd } from '@/lib/structuredData'"),
  'Blog Article page must import the shared JSON-LD serializer',
)
assert.ok(
  blogPage.includes("'@type': 'Article'"),
  'Blog Article page must keep Article structured data',
)
assert.ok(
  blogPage.includes('serializeJsonLd(articleJsonLd)'),
  'Blog Article page must safely serialize inline Article JSON-LD',
)
assert.ok(
  !blogPage.includes('JSON.stringify(articleJsonLd)'),
  'Blog Article page must not inject raw Article JSON-LD',
)
assert.ok(
  (packageJson.scripts?.['test:blog-structured-data'] ?? '').includes(
    'tsx scripts/blog-structured-data-governance.ts',
  ),
  'package script must run Blog structured-data governance',
)
assert.ok(
  (packageJson.scripts?.['test:safe'] ?? '').includes('npm run test:blog-structured-data'),
  'safe suite must retain Blog structured-data governance',
)

console.log('blogStructuredDataGovernance: shared safe Article JSON-LD - ALL OK')
