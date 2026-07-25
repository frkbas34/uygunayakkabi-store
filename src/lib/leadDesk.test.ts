import assert from 'node:assert'
import {
  buildLeadOperatorLinks,
  formatLeadCard,
  formatLeadLine,
  formatNewLeadAlert,
  type LeadEntry,
} from './leadDesk'

let passed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

function lead(input: Partial<LeadEntry> = {}): LeadEntry {
  return {
    id: input.id ?? 501,
    name: input.name ?? 'Ayse Operator',
    phone: input.phone ?? '5550000501',
    status: input.status ?? 'new',
    message: input.message ?? null,
    size: input.size ?? null,
    source: input.source ?? 'website',
    utmSource: input.utmSource ?? null,
    utmMedium: input.utmMedium ?? null,
    utmCampaign: input.utmCampaign ?? null,
    referrer: input.referrer ?? null,
    product: input.product ?? null,
    lastContactedAt: input.lastContactedAt ?? null,
    handledAt: input.handledAt ?? null,
    createdAt: input.createdAt ?? '2026-07-16T09:00:00.000Z',
    updatedAt: input.updatedAt ?? '2026-07-16T09:05:00.000Z',
  }
}

check('builds lead admin plus public product links for public related products', () => {
  const links = buildLeadOperatorLinks(lead({
    id: 77,
    product: {
      id: 901,
      title: 'Siyah Tokali Loafer',
      stockNumber: 'SN0901',
      slug: 'siyah-tokali-loafer-sn0901',
      status: 'active',
    },
  }))

  assert.strictEqual(links.leadAdminUrl, 'https://www.uygunayakkabi.com/admin/collections/customer-inquiries/77')
  assert.strictEqual(links.productAdminUrl, 'https://www.uygunayakkabi.com/admin/collections/products/901')
  assert.strictEqual(links.productUrl, 'https://www.uygunayakkabi.com/products/siyah-tokali-loafer-sn0901')
})

check('keeps draft related products admin-only', () => {
  const links = buildLeadOperatorLinks(lead({
    id: 78,
    product: {
      id: 902,
      title: 'Draft Loafer',
      stockNumber: 'SN0902',
      slug: 'draft-loafer-sn0902',
      status: 'draft',
    },
  }))

  assert.strictEqual(links.productAdminUrl, 'https://www.uygunayakkabi.com/admin/collections/products/902')
  assert.strictEqual(links.productUrl, null)
})

check('keeps storefront-blocked related products admin-only', () => {
  const links = buildLeadOperatorLinks(lead({
    id: 82,
    product: {
      id: 906,
      title: 'Nike Public Sneaker',
      stockNumber: 'SN0906',
      slug: 'nike-public-sneaker-sn0906',
      status: 'active',
      brand: 'Nike',
    },
  }))

  assert.strictEqual(links.productAdminUrl, 'https://www.uygunayakkabi.com/admin/collections/products/906')
  assert.strictEqual(links.productUrl, null)
})

check('lead list lines include operator links and avoid unsafe commands', () => {
  const formatted = formatLeadLine(lead({
    id: 79,
    product: {
      id: 903,
      title: 'Public Loafer',
      stockNumber: 'SN0903',
      slug: 'public-loafer-sn0903',
      status: 'soldout',
    },
  }))

  assert.ok(formatted.includes('Links: <a href="https://www.uygunayakkabi.com/admin/collections/customer-inquiries/79">lead admin</a>'))
  assert.ok(formatted.includes('<a href="https://www.uygunayakkabi.com/admin/collections/products/903">product admin</a>'))
  assert.ok(formatted.includes('<a href="https://www.uygunayakkabi.com/products/public-loafer-sn0903">PDP</a>'))
  assert.ok(!formatted.includes('/adlaunch'))
  assert.ok(!formatted.includes('/shopier publish-ready confirm'))
})

check('lead detail cards include the same operator links', () => {
  const formatted = formatLeadCard(lead({
    id: 80,
    product: {
      id: 904,
      title: 'Card Loafer',
      stockNumber: 'SN0904',
      slug: 'card-loafer-sn0904',
      status: 'active',
    },
  }))

  assert.ok(formatted.includes('Links: <a href="https://www.uygunayakkabi.com/admin/collections/customer-inquiries/80">lead admin</a>'))
  assert.ok(formatted.includes('<a href="https://www.uygunayakkabi.com/admin/collections/products/904">product admin</a>'))
  assert.ok(formatted.includes('<a href="https://www.uygunayakkabi.com/products/card-loafer-sn0904">PDP</a>'))
})

check('new lead alerts include links without changing the button action model', () => {
  const formatted = formatNewLeadAlert(lead({
    id: 81,
    product: {
      id: 905,
      title: 'Alert Loafer',
      stockNumber: 'SN0905',
      slug: 'alert-loafer-sn0905',
      status: 'draft',
    },
  }))

  assert.ok(formatted.includes('Links: <a href="https://www.uygunayakkabi.com/admin/collections/customer-inquiries/81">lead admin</a>'))
  assert.ok(formatted.includes('<a href="https://www.uygunayakkabi.com/admin/collections/products/905">product admin</a>'))
  assert.ok(!formatted.includes('https://www.uygunayakkabi.com/products/alert-loafer-sn0905'))
  assert.ok(formatted.includes('<i>Detay: /lead 81</i>'))
})

console.log(`\nleadDesk: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
