/**
 * telegramReport.ts — D-220
 *
 * Turkish Telegram summary formatter + inline keyboard builder for
 * Product Intelligence Bot reports.
 *
 * Callback shape: pi:{action}:{reportId}
 *   actions: approve | sendgeo | regen | reject
 */

import type { CreatedReportSummary } from './createProductIntelligenceReport'
import type { PiDetectedAttributes, PiMatchType } from './types'

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

  const warnings = summary.warnings.slice(0, 3).map((w) => `  • ${w}`).join('\n')

  return (
    `🧠 <b>Ürün Zeka Raporu Hazır</b>\n\n` +
    `Ürün:\n<b>#${productId}</b> — ${productTitle}\n\n` +
    `Eşleşme:\n${confidencePart}\n\n` +
    `Birebir ürün bulundu:\n${summary.exactProductFound ? 'Evet' : 'Hayır'}\n\n` +
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
