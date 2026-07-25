/**
 * Homepage merchandising wiring guard.
 *
 * `resolveHomepageSections()` decides which active products can appear in each
 * curated rail. This assertion keeps the server membership handoff connected to
 * the client rails so the homepage never quietly falls back to arbitrary catalog
 * order while still presenting curated labels.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const HOME_PAGE_FILE = join(process.cwd(), 'src', 'app', '(app)', 'page.tsx')
const APP_FILE = join(process.cwd(), 'src', 'app', '(app)', 'UygunApp.jsx')

let passed = 0
let failed = 0

function check(name: string, ok: boolean, detail: string) {
  if (ok) {
    passed += 1
    console.log(`  ok - ${name}`)
  } else {
    failed += 1
    console.error(`  fail - ${name}\n    ${detail}`)
  }
}

const page = readFileSync(HOME_PAGE_FILE, 'utf8')
const app = readFileSync(APP_FILE, 'utf8')

check(
  'homepage resolves curated memberships and passes them to the app shell',
  page.includes('const sections = resolveHomepageSections(') &&
    page.includes('sectionIds = {') &&
    page.includes('sections={sectionIds}'),
  'Expected the server page to resolve homepage sections and pass sectionIds to UygunApp.',
)

for (const section of ['popular', 'bestSellers', 'deals', 'discounted']) {
  check(
    `client derives the ${section} rail from server-curated IDs`,
    app.includes(`pickIds(sections?.${section})`),
    `Expected UygunApp to derive ${section} products from the sections prop.`,
  )
}

check(
  'editor picks, best sellers, deals, and discounts receive their curated product lists',
  app.includes('products={editorPicksList}') &&
    app.includes('products={bestSellersList}') &&
    app.includes('products={dealsList}') &&
    app.includes('products={discountedList}'),
  'Expected every curated homepage rail to receive its matching list.',
)

check(
  'best-seller rail does not use arbitrary catalog slicing',
  !app.includes('const moreProducts = allProducts.slice(6, 18);'),
  'The best-seller rail must render its curated products, not a positional catalog slice.',
)

console.log(
  `\nhomepage-merchandising: ${passed} checks passed, ${failed} failed${failed ? ' - WITH FAILURES' : ' - ALL OK'}`,
)
if (failed > 0) process.exit(1)
