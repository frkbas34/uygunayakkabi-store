/**
 * storefront-trust-governance.ts — pre-traffic hardening assertion.
 *
 * Pins two storefront trust guarantees as repo-text checks (same pattern as
 * retired-channel-governance.ts): the storefront must never ship fake reviews
 * or coming-soon review placeholders to production.
 *
 *   1. DEMO_REVIEWS_ENABLED stays hard-false in UygunApp.jsx (D-313).
 *   2. The old placeholder copy ("Gerçek müşteri yorumları onaylı şekilde
 *      burada yayınlanacak") stays removed (click-audit fix, 543939f).
 *
 * Pure file-content assertions — no network, no DB, no build.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const APP_FILE = join(process.cwd(), 'src', 'app', '(app)', 'UygunApp.jsx')
const PRODUCT_PAGE_FILE = join(process.cwd(), 'src', 'app', '(app)', 'products', '[slug]', 'page.tsx')
const PRODUCT_IMAGE_RESOLVER_FILE = join(process.cwd(), 'src', 'lib', 'productStorefrontImages.ts')
const PRODUCT_STRUCTURED_DATA_FILE = join(process.cwd(), 'src', 'lib', 'productStructuredData.ts')
const STRUCTURED_DATA_FILE = join(process.cwd(), 'src', 'lib', 'structuredData.ts')
const MERCHANDISING_FILE = join(process.cwd(), 'src', 'lib', 'merchandising.ts')
const SITEMAP_FILE = join(process.cwd(), 'src', 'app', 'sitemap.ts')
const SITE_SETTINGS_FILE = join(process.cwd(), 'src', 'globals', 'SiteSettings.ts')

let passed = 0
let failed = 0

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed++
    console.log(`  ok - ${name}`)
  } else {
    failed++
    console.error(`  fail - ${name}${detail ? `\n    ${detail}` : ''}`)
  }
}

const src = readFileSync(APP_FILE, 'utf8')
const productPage = readFileSync(PRODUCT_PAGE_FILE, 'utf8')
const productImageResolver = readFileSync(PRODUCT_IMAGE_RESOLVER_FILE, 'utf8')
const productStructuredData = readFileSync(PRODUCT_STRUCTURED_DATA_FILE, 'utf8')
const structuredData = readFileSync(STRUCTURED_DATA_FILE, 'utf8')
const merchandising = readFileSync(MERCHANDISING_FILE, 'utf8')
const sitemap = readFileSync(SITEMAP_FILE, 'utf8')
const siteSettings = readFileSync(SITE_SETTINGS_FILE, 'utf8')

check(
  'DEMO_REVIEWS_ENABLED is pinned to false (no fake review cards in production)',
  /const\s+DEMO_REVIEWS_ENABLED\s*=\s*false/.test(src),
  'Expected `const DEMO_REVIEWS_ENABLED = false` in src/app/(app)/UygunApp.jsx — demo cards must stay off for production.',
)

check(
  'placeholder review copy stays removed from the storefront',
  !src.includes('Gerçek müşteri yorumları onaylı şekilde burada yayınlanacak'),
  'The coming-soon review placeholder returned — production must not show placeholder testimonials.',
)

check(
  'honest trust section is present (Neden UygunAyakkabı?)',
  src.includes('Neden UygunAyakkabı?'),
  'The trust section heading is missing — the social-proof slot must render real trust content, not a gap.',
)

check(
  'numeric trust metrics default to hidden until explicitly verified',
  siteSettings.includes("name: 'enabled'") &&
    siteSettings.includes('defaultValue: false') &&
    !siteSettings.includes("defaultValue: '500+'") &&
    !siteSettings.includes("defaultValue: '200+'") &&
    !siteSettings.includes("defaultValue: '%98'") &&
    src.includes("trustBadges: { enabled: false, monthlyCustomers: '', totalProducts: '', satisfactionRate: '' }") &&
    src.includes('const trustStats = tb.enabled &&') &&
    src.includes('gridTemplateColumns: trustStats ? "1fr 1fr" : "minmax(0, 760px)"') &&
    src.includes('{trustStats && ('),
  'Expected a default-off verified-metrics switch with no fallback social-proof figures or empty stats card.',
)

check(
  'announcement bar stays inside the fixed storefront header instead of overlapping the wordmark',
  src.includes('<TopBar settings={settings} />') &&
    !src.includes('<TopBar settings={S} />'),
  'Expected TopBar to render inside Navbar so the fixed header reserves its own announcement row.',
)

check(
  'PDP hides draft products from the public route',
  /product\.status\s*===\s*['"]draft['"][\s\S]{0,100}notFound\(\)/.test(productPage),
  'Expected the public product route to return notFound() for draft products.',
)

check(
  'public storefront hides placeholder-title and protected-brand legacy products',
  merchandising.includes('export function isStorefrontProductSafe') &&
    merchandising.includes('export function isPlaceholderProductTitle') &&
    merchandising.includes('if (!isStorefrontProductSafe(product)) return false') &&
    productPage.includes("!isStorefrontProductSafe(product)") &&
    productPage.includes("import { isHomepageEligible, isStorefrontProductSafe }") &&
    sitemap.includes("import { isStorefrontProductSafe }") &&
    sitemap.includes('isStorefrontProductSafe(product)'),
  'Expected shared placeholder-title/protected-brand safety checks in merchandising, public PDP, and sitemap.',
)

check(
  'PDP keeps the buyer gallery mounted',
  productPage.includes("import { ProductImages }") &&
    /<ProductImages\s+images=\{images\}\s+title=\{product\.title\}/.test(productPage),
  'Expected ProductImages to remain mounted on the product detail page.',
)

check(
  'PDP uses original media when no usable generated gallery URL exists',
  productPage.includes("import { resolveProductStorefrontImageUrls }") &&
    productPage.includes('const images = resolveProductStorefrontImageUrls({') &&
    productPage.includes('generativeGallery: product.generativeGallery') &&
    productPage.includes('images: product.images') &&
    productImageResolver.includes('return generatedUrls.length > 0') &&
    productImageResolver.includes(': resolveEntryUrls(input.images, serverUrl)'),
  'Expected the product detail page to use the shared generated-first/original-fallback image resolver.',
)

check(
  'PDP keeps size and stock clarity wired to variants',
  productPage.includes('const availableSizes = variants.filter((v) => v.stock > 0)') &&
    productPage.includes('const stockSummary = summarizeProductStock({ ...product, variants })') &&
    productPage.includes('const totalStock = stockSummary.effectiveStock') &&
    productPage.includes('<SizeChip key={variant.id} size={variant.size} stock={variant.stock} isLow={isLow} />') &&
    productPage.includes('<OOSChip key={variant.id} size={variant.size} />'),
  'Expected available-size stock math plus in-stock and out-of-stock size chips.',
)

check(
  'PDP keeps safe Product and FAQ structured data aligned with gallery and stock truth',
  productPage.includes('buildProductJsonLd(product, productUrl, {') &&
    productPage.includes('imageUrls: images') &&
    productPage.includes("inStock: product.status === 'active' && !isSoldOut") &&
    productPage.includes('serializeJsonLd(productJsonLd)') &&
    productPage.includes('serializeJsonLd(faqJsonLd)') &&
    productStructuredData.includes("availability: options.inStock") &&
    structuredData.includes('.replace(/</g'),
  'Expected schema image/availability fields to follow the public gallery and stock summary with safe inline JSON serialization.',
)

check(
  'PDP keeps the lead form mounted with product context',
  productPage.includes('<ContactForm') &&
    productPage.includes('productId={String(product.id)}') &&
    productPage.includes('productTitle={product.title}') &&
    productPage.includes('variants={variants}') &&
    productPage.includes('soldout={isSoldOut}'),
  'Expected ContactForm to receive product id, title, variants, and sold-out context.',
)

check(
  'PDP keeps WhatsApp CTA with product-specific buying intent',
  productPage.includes('https://wa.me/${waNumber}') &&
    productPage.includes('Uygun beden ve stok durumunu') &&
    productPage.includes('deme ve teslimat detaylar'),
  'Expected wa.me CTA copy to mention size, stock, payment, and delivery details.',
)

check(
  'PDP keeps Shopier CTA gated by product URL and sellable stock',
  productPage.includes('product.sourceMeta?.shopierProductUrl && !isSoldOut') &&
    productPage.includes('href={product.sourceMeta.shopierProductUrl}') &&
    productPage.includes('target="_blank"') &&
    productPage.includes('rel="noopener noreferrer"'),
  'Expected Shopier CTA to require a product Shopier URL, avoid sold-out products, and open safely.',
)

check(
  'PDP keeps process FAQ fallback and FAQ rendering',
  productPage.includes('const DEFAULT_PROCESS_FAQ') &&
    productPage.includes('<ProductFAQ faq={validFaq.length > 0 ? validFaq : DEFAULT_PROCESS_FAQ} />') &&
    productPage.includes('buildFaqJsonLd(validFaq)'),
  'Expected fallback process FAQ, ProductFAQ render, and FAQ JSON-LD support to stay present.',
)

check(
  'PDP similar-products rail stays public-status and merchandising gated',
  productPage.includes("{ status: { equals: 'active' } }") &&
    productPage.includes('.filter((sp) => isHomepageEligible(sp as unknown as MerchandisableProduct))'),
  'Expected similar products to require active status plus storefront merchandising eligibility.',
)

console.log(
  `\nstorefront-trust: ${passed} checks passed, ${failed} failed${failed ? ' - WITH FAILURES' : ' - ALL OK'}`,
)
if (failed > 0) process.exit(1)
