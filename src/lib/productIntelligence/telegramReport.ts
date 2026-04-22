/**
 * telegramReport.ts — D-220, extended in D-221
 *
 * Turkish Telegram summary formatter + inline keyboard builder for
 * Product Intelligence Bot reports.
 *
 * D-221 additions:
 *   - Show how many images the analyst actually used (primary + supporting).
 *   - Show the primary image source URL (host-trimmed, no prose).
 *   - Show whether external online search ran, which provider, and how
 *     many online matches were found.
 *   - Top 3 online matches: title + host + similarity band (no long text).
 *   - Show detectedConflicts from the collected-image step.
 *   - Explicit "Online search unavailable" banner when the provider is off.
 *
 * Callback shape: pi:{action}:{reportId}
 *   actions: approve | sendgeo | regen | reject
 */

import type { CreatedReportSummary } from './createProductIntelligenceReport'
import type { PiCollectedImages, PiDetectedAttributes, PiMatchType, PiReferenceProduct } from './types'

function matchTypeLabel(t: PiMatchType): string {
  switch (t) {
    case 'exact_match':
      return 'Birebir eşleşme'
    case 'high_similarity':
      return 'Yüksek Benzerlik'
    case 'similar_style':
      return 'Benzer Stil'
    case 'low_confidence':
      return 'Düşük Güven'
    case 'visual_only_no_external_search':
      return 'Sadece Görsel (dış arama yok)'
    default:
      return t
  }
}

function truthy(v: unknown): boolean {
  return typeof v === 'string' ? v.trim().length > 0 : !!v
}

function bulletAttr(label: string, value: unknown): string | null {
  if (!truthy(value)) return null
  return `- ${label}: ${value}`
}

// Pull the hostname out of a URL for compact display; falls back to the raw
// string if parsing fails. We never want to paste full long URLs into the
// Telegram message — they are noisy and often look like quoted content.
function hostOf(url: string | null | undefined): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.slice(0, 60)
  }
}

// D-221: compact band label for a reference result.
function similarityBand(r: PiReferenceProduct): string {
  if (r.similarity == null) return '—'
  if (r.similarity >= 90) return `%${Math.round(r.similarity)} yüksek`
  if (r.similarity >= 70) return `%${Math.round(r.similarity)} benzer`
  return `%${Math.round(r.similarity)} zayıf`
}

// HTML-escape values we interpolate into Telegram HTML mode.
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function formatReportSummary(
  productTitle: string,
  productId: string | number,
  summary: CreatedReportSummary,
  seoPackPresent: {
    seoTitle: boolean
    metaDescription: boolean
    productDescription: boolean
    tags: boolean
    faq: boolean
  },
  geoPackPresent: {
    aiSearchSummary: boolean
    buyerIntentKeywords: boolean
    productComparisonText: boolean
  },
): string {
  const attrs: PiDetectedAttributes = summary.attributes ?? {}
  const images: PiCollectedImages = summary.images ?? { primary: null, supporting: [], notes: '', conflicts: '' }

  // ── Detected attributes ────────────────────────────────────────────────
  const detectedLines: string[] = []
  const t = bulletAttr('Tip', attrs.productType)
  const c = bulletAttr('Renk', attrs.color)
  const s = bulletAttr('Stil', attrs.style)
  const m = bulletAttr('Malzeme tahmini', attrs.materialGuess)
  const g = bulletAttr('Cinsiyet', attrs.gender)
  const u = bulletAttr(
    'Kullanım',
    Array.isArray(attrs.useCases) && attrs.useCases.length > 0 ? attrs.useCases.join(', ') : null,
  )
  const b = bulletAttr('Görünen marka', attrs.visibleBrand)
  for (const line of [t, c, s, m, g, u, b]) if (line) detectedLines.push(line)
  if (detectedLines.length === 0) detectedLines.push('- (görsel analiz sonucu yok)')

  // ── Image evidence (D-221) ─────────────────────────────────────────────
  const primaryUrl = images.primary?.url ?? null
  const primarySource = images.primary?.source ?? null
  const supportingCount = images.supporting.length
  const totalImages = (primaryUrl ? 1 : 0) + supportingCount
  const imageLines: string[] = []
  imageLines.push(`- Toplam kullanılan görsel: ${totalImages}`)
  if (primaryUrl) {
    imageLines.push(`- Birincil kaynak: ${primarySource ?? 'original'} — ${esc(hostOf(primaryUrl))}`)
  } else {
    imageLines.push('- Birincil kaynak: yok')
  }
  imageLines.push(`- Destekleyici görsel: ${supportingCount}`)
  if (truthy(images.conflicts)) {
    imageLines.push(`- Çakışma notu: ${esc(String(images.conflicts).slice(0, 220))}`)
  }

  // ── Online search evidence (D-221) ─────────────────────────────────────
  const search = summary.search
  const onlineLines: string[] = []
  if (!search || !search.externalSearchRan) {
    onlineLines.push('- Online arama: <b>kullanılamıyor</b> (sağlayıcı/API anahtarı yok)')
    onlineLines.push('- Güven skoru düşürüldü; eşleşme yalnızca görsel+metin analizine dayanıyor')
  } else {
    onlineLines.push(`- Online arama: <b>çalıştı</b> (${esc(search.provider ?? 'bilinmiyor')})`)
    onlineLines.push(`- Sorgulanan görsel: ${search.searchedImageCount}`)
    onlineLines.push(`- Bulunan eşleşme sayısı: ${search.onlineMatchesFound}`)
    if (search.topMatches.length > 0) {
      const topLines = search.topMatches.slice(0, 3).map((r, i) => {
        const title = esc(String(r.title).slice(0, 70))
        const host = esc(hostOf(r.url))
        return `  ${i + 1}) ${title} — ${host} (${similarityBand(r)})`
      })
      onlineLines.push('- İlk eşleşmeler:')
      onlineLines.push(...topLines)
    } else {
      onlineLines.push('- İlk eşleşmeler: (yok)')
    }
  }

  // ── SEO / GEO pack presence ────────────────────────────────────────────
  const seoBullets = [
    seoPackPresent.seoTitle ? '- SEO başlığı hazır' : '- SEO başlığı yok',
    seoPackPresent.metaDescription ? '- Meta açıklama hazır' : '- Meta açıklama yok',
    seoPackPresent.productDescription ? '- Ürün açıklaması hazır' : '- Ürün açıklaması yok',
    seoPackPresent.tags ? '- Etiketler hazır' : '- Etiketler yok',
    seoPackPresent.faq ? '- SSS hazır' : '- SSS yok',
  ].join('\n')

  const geoBullets = [
    geoPackPresent.aiSearchSummary ? '- AI arama özeti hazır' : '- AI arama özeti yok',
    geoPackPresent.buyerIntentKeywords ? '- Alıcı niyet anahtarları hazır' : '- Alıcı niyet anahtarları yok',
    geoPackPresent.productComparisonText ? '- Karşılaştırma metni hazır' : '- Karşılaştırma metni yok',
  ].join('\n')

  const confidencePart =
    summary.matchType === 'visual_only_no_external_search'
      ? matchTypeLabel(summary.matchType)
      : `${matchTypeLabel(summary.matchType)} — ${summary.matchConfidence}%`

  const warnings = summary.warnings.slice(0, 3).map((w) => `  • ${esc(w)}`).join('\n')

  return (
    `🧠 <b>Ürün Zeka Raporu Hazır</b>\n\n` +
    `Ürün:\n<b>#${productId}</b> — ${esc(productTitle)}\n\n` +
    `Eşleşme:\n${confidencePart}\n` +
    `Birebir ürün bulundu: ${summary.exactProductFound ? 'Evet' : 'Hayır'}\n\n` +
    `Kullanılan görseller:\n${imageLines.join('\n')}\n\n` +
    `Online eşleşmeler:\n${onlineLines.join('\n')}\n\n` +
    `Tespit edilen özellikler:\n${detectedLines.join('\n')}\n\n` +
    `SEO/GEO paketi:\n${seoBullets}\n${geoBullets}\n\n` +
    `Güvenlik:\nDış ürünler yalnızca referans olarak kullanıldı. Hiçbir açıklama kopyalanmadı.\n` +
    (warnings ? `\nUyarılar:\n${warnings}\n` : '')
  )
}

export function buildReportKeyboard(
  reportId: string | number,
): Array<Array<{ text: string; callback_data: string }>> {
  return [
    [
      { text: '✅ SEO Paketini Onayla', callback_data: `pi:approve:${reportId}` },
      { text: '📤 GeoBot\'a Gönder', callback_data: `pi:sendgeo:${reportId}` },
    ],
    [
      { text: '🔄 Yeniden Üret', callback_data: `pi:regen:${reportId}` },
      { text: '🚫 Reddet', callback_data: `pi:reject:${reportId}` },
    ],
  ]
}

export function formatFailedReport(productId: string | number, error: string): string {
  return (
    `❌ <b>Ürün Zeka raporu üretilemedi</b>\n\n` +
    `Ürün: <b>#${productId}</b>\n\n` +
    `Hata: <code>${error.slice(0, 300)}</code>\n\n` +
    `Yeniden denemek için: <code>#geoHazirla ${productId}</code>`
  )
}
