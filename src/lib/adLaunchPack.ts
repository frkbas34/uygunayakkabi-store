/**
 * adLaunchPack.ts - D-380 manual ad launch-pack support.
 *
 * Read-only helper for future operator-approved paid tests. It packages the
 * existing ad-readiness gate with copy drafts and UTM links. It never creates
 * campaigns, posts, pixels, audiences, provider calls, or ad spend.
 */
import { evaluateAdReadiness, type AdReadinessLevel, type AdReadinessResult } from './adReadiness'
import { scanProductBrandSafety } from './brandSafety'
import { summarizeProductStock } from './productStock'
import { buildProductUtmUrl, normalizeCampaign, validateUtmInputs } from './utmBuilder'

export type AdLaunchPackLevel = AdReadinessLevel

export interface AdLaunchPackOptions {
  campaign?: string | null
  source?: string | null
  medium?: string | null
}

export interface AdCopyDraft {
  angle: 'comfort' | 'style' | 'support' | 'stock'
  headline: string
  primaryText: string
  description: string
  cta: string
  utmContent: string
  utmUrl: string
}

export interface AdLaunchPack {
  level: AdLaunchPackLevel
  canLaunchManually: boolean
  readiness: AdReadinessResult
  campaign: {
    source: string
    medium: string
    name: string
    validationErrors: string[]
  }
  product: {
    id: number | string | null
    stockNumber: string | null
    title: string
    safeTitle: string
    slug: string | null
  }
  copyDrafts: AdCopyDraft[]
  blockers: string[]
  warnings: string[]
  operatorNotes: string[]
  summary: string
}

type AdProduct = Record<string, any> | null | undefined

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function relationText(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return text(obj.title) || text(obj.name) || text(obj.label)
  }
  return ''
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, Math.max(0, max - 1)).trim()}...`
}

function token(input: string): string {
  return normalizeCampaign(input)
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'urun'
}

function defaultCampaign(product: Record<string, any>): string {
  const ref = text(product.stockNumber) || String(product.id ?? 'urun')
  return token(`manual_${ref}`)
}

function safeProductTitle(product: Record<string, any>): string {
  const brand = scanProductBrandSafety(product)
  const rawTitle = text(product.title) || text(product.stockNumber) || 'Urun'
  if (brand.safe && brand.riskyClaims.length === 0) return rawTitle

  const color = text(product.color)
  const type =
    text(product.productType) ||
    relationText(product.category) ||
    relationText(product.family) ||
    'Ayakkabi'
  return [color, type].filter(Boolean).join(' ') || 'Ayakkabi'
}

function buildContentToken(product: Record<string, any>, angle: AdCopyDraft['angle']): string {
  const ref = text(product.stockNumber) || String(product.id ?? 'urun')
  return token(`${ref}_${angle}`)
}

function buildCopyDrafts(
  product: Record<string, any>,
  safeTitle: string,
  source: string,
  medium: string,
  campaign: string,
): AdCopyDraft[] {
  const slug = text(product.slug)
  if (!slug) return []

  const stock = summarizeProductStock(product as any)
  const baseHeadline = truncate(safeTitle, 38)
  const drafts: Array<Omit<AdCopyDraft, 'utmContent' | 'utmUrl'>> = [
    {
      angle: 'comfort',
      headline: baseHeadline,
      primaryText: `${safeTitle} gunluk kullanim icin sade ve rahat bir secenek. Beden ve stok bilgisini urun sayfasinda kontrol edin.`,
      description: 'Urun sayfasi ve WhatsApp destek ile talep alin.',
      cta: 'Send Message',
    },
    {
      angle: 'style',
      headline: 'Gunluk stile uygun',
      primaryText: `${safeTitle} ile temiz, kolay kombinlenen bir stil kurun. Detaylari inceleyip uygun bedeni secin.`,
      description: 'Detaylar, bedenler ve talep formu urun sayfasinda.',
      cta: 'Learn More',
    },
    {
      angle: 'support',
      headline: 'WhatsApp destekli alisveris',
      primaryText: `${safeTitle} icin beden sorularinizi WhatsApp uzerinden iletebilir, urun sayfasindan hizlica talep birakabilirsiniz.`,
      description: 'Operator onayli manuel kampanya taslagi.',
      cta: 'Send Message',
    },
  ]

  if (stock.hasSellableStock && stock.effectiveStock <= 2) {
    drafts.push({
      angle: 'stock',
      headline: 'Az stok uyarisi',
      primaryText: `${safeTitle} icin stok sinirli gorunuyor. Reklamdan once beden uygunlugunu tekrar kontrol edin.`,
      description: 'Stok dogrulamasindan sonra manuel olarak yayina alin.',
      cta: 'Learn More',
    })
  }

  return drafts.map((draft) => {
    const utmContent = buildContentToken(product, draft.angle)
    return {
      ...draft,
      utmContent,
      utmUrl: buildProductUtmUrl(slug, source, medium, campaign, utmContent),
    }
  })
}

export function buildAdLaunchPack(
  product: AdProduct,
  options: AdLaunchPackOptions = {},
): AdLaunchPack {
  const p = (product ?? {}) as Record<string, any>
  const source = text(options.source).toLowerCase() || 'meta'
  const medium = text(options.medium).toLowerCase() || 'paid_social'
  const campaign = normalizeCampaign(text(options.campaign) || defaultCampaign(p))
  const validationErrors = validateUtmInputs(source, medium, campaign)
  const readiness = evaluateAdReadiness(p)
  const brand = scanProductBrandSafety(p)
  const slug = text(p.slug) || null
  const title = text(p.title) || 'Untitled'
  const safeTitle = safeProductTitle(p)

  const blockers = [...readiness.blockers, ...validationErrors]
  const warnings = [...readiness.warnings]
  const hasHardBlock = blockers.length > 0
  const level: AdLaunchPackLevel = hasHardBlock ? 'blocked' : readiness.level
  const canLaunchManually = level === 'ready'

  const copyDrafts =
    !hasHardBlock && brand.safe && slug
      ? buildCopyDrafts(p, safeTitle, source, medium, campaign)
      : []

  if (readiness.level === 'review' && blockers.length === 0) {
    warnings.push('Operator review required before any manual ad launch.')
  }

  const operatorNotes = [
    'Read-only launch pack: no campaign is created.',
    'Create any Meta/Google campaign manually and keep it paused until final operator approval.',
    'No autonomous ad spend, no Pixel/CAPI/Ads API automation, and no external posting from this helper.',
  ]

  const summary =
    level === 'ready'
      ? 'Ready for an operator-reviewed manual ad pack.'
      : level === 'review'
        ? 'Review required before any manual ad launch.'
        : 'Blocked: fix the listed issues before preparing a manual ad.'

  return {
    level,
    canLaunchManually,
    readiness,
    campaign: { source, medium, name: campaign, validationErrors },
    product: {
      id: p.id ?? null,
      stockNumber: text(p.stockNumber) || null,
      title,
      safeTitle,
      slug,
    },
    copyDrafts,
    blockers,
    warnings,
    operatorNotes,
    summary,
  }
}

export function formatAdLaunchPackMessage(pack: AdLaunchPack): string {
  const icon = pack.level === 'ready' ? 'OK' : pack.level === 'review' ? 'REVIEW' : 'BLOCKED'
  const ref = pack.product.stockNumber ?? `ID:${pack.product.id ?? '?'}`
  const lines = [
    `<b>Manual Ad Pack - ${escapeHtml(ref)}</b>`,
    `<b>${escapeHtml(pack.product.title)}</b>`,
    '',
    `${icon}: ${escapeHtml(pack.summary)}`,
    `UTM: <code>${escapeHtml(pack.campaign.source)}</code> / <code>${escapeHtml(pack.campaign.medium)}</code> / <code>${escapeHtml(pack.campaign.name)}</code>`,
  ]

  if (pack.blockers.length > 0) {
    lines.push('', '<b>Blockers</b>')
    for (const blocker of pack.blockers.slice(0, 6)) lines.push(`- ${escapeHtml(blocker)}`)
  }

  if (pack.warnings.length > 0) {
    lines.push('', '<b>Warnings</b>')
    for (const warning of pack.warnings.slice(0, 6)) lines.push(`- ${escapeHtml(warning)}`)
  }

  if (pack.copyDrafts.length > 0) {
    lines.push('', '<b>Copy Drafts</b>')
    for (const draft of pack.copyDrafts) {
      lines.push(
        `<b>${escapeHtml(draft.angle)}</b> - ${escapeHtml(draft.headline)}`,
        `${escapeHtml(draft.primaryText)}`,
        `<code>${escapeHtml(draft.utmUrl)}</code>`,
      )
    }
  } else {
    lines.push('', '<i>Copy drafts are withheld until hard blockers are clear.</i>')
  }

  lines.push('', '<b>Operator Notes</b>')
  for (const note of pack.operatorNotes) lines.push(`- ${escapeHtml(note)}`)

  return lines.join('\n')
}
