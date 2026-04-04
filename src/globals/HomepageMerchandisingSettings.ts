import type { GlobalConfig } from 'payload'

/**
 * HomepageMerchandisingSettings — Phase 1 Foundation
 *
 * Controls which homepage sections are enabled, item limits, timing,
 * and bestseller scoring parameters.
 *
 * Sections:
 *   - Yeni Ürünler (new arrivals)
 *   - Popüler Ürünler (popular / trending)
 *   - Çok Satanlar (bestsellers)
 *   - Fırsatlar (deals)
 *   - İndirimli Ürünler (discounted)
 *
 * Phase 1: schema only — merchandising query engine comes in Phase 2.
 */
export const HomepageMerchandisingSettings: GlobalConfig = {
  slug: 'homepage-merchandising-settings',
  label: 'Ana Sayfa Vitrin Ayarları',
  admin: {
    group: 'Ayarlar',
    description: 'Ana sayfa bölümlerini kontrol edin — Yeni, Popüler, Çok Satanlar, Fırsatlar, İndirimli',
  },
  fields: [
    // ── Bölüm Açma/Kapama ─────────────────────────────────────
    {
      name: 'sectionToggles',
      type: 'group',
      label: '🔘 Bölüm Açma/Kapama',
      admin: {
        description: 'Hangi ana sayfa bölümleri aktif olsun?',
      },
      fields: [
        {
          name: 'enableYeni',
          type: 'checkbox',
          label: '🆕 Yeni Ürünler Bölümü',
          defaultValue: true,
          admin: { description: 'Ana sayfada "Yeni Ürünler" bölümü gösterilsin mi?' },
        },
        {
          name: 'enablePopular',
          type: 'checkbox',
          label: '⭐ Popüler Ürünler Bölümü',
          defaultValue: true,
          admin: { description: 'Ana sayfada "Popüler Ürünler" bölümü gösterilsin mi?' },
        },
        {
          name: 'enableBestSellers',
          type: 'checkbox',
          label: '🏆 Çok Satanlar Bölümü',
          defaultValue: true,
          admin: { description: 'Ana sayfada "Çok Satanlar" bölümü gösterilsin mi?' },
        },
        {
          name: 'enableDeals',
          type: 'checkbox',
          label: '🔥 Fırsatlar Bölümü',
          defaultValue: false,
          admin: { description: 'Ana sayfada "Fırsatlar" bölümü gösterilsin mi?' },
        },
        {
          name: 'enableDiscounted',
          type: 'checkbox',
          label: '💰 İndirimli Ürünler Bölümü',
          defaultValue: true,
          admin: { description: 'Ana sayfada "İndirimli Ürünler" bölümü gösterilsin mi?' },
        },
      ],
    },
    // ── Gösterim Limitleri ─────────────────────────────────────
    {
      name: 'itemLimits',
      type: 'group',
      label: '📊 Gösterim Limitleri',
      admin: {
        description: 'Her bölümde kaç ürün gösterilsin?',
      },
      fields: [
        {
          name: 'yeniLimit',
          type: 'number',
          label: 'Yeni Ürünler Limiti',
          defaultValue: 8,
          admin: { description: 'Yeni Ürünler bölümünde en fazla kaç ürün' },
        },
        {
          name: 'popularLimit',
          type: 'number',
          label: 'Popüler Limiti',
          defaultValue: 8,
          admin: { description: 'Popüler Ürünler bölümünde en fazla kaç ürün' },
        },
        {
          name: 'bestSellerLimit',
          type: 'number',
          label: 'Çok Satanlar Limiti',
          defaultValue: 8,
          admin: { description: 'Çok Satanlar bölümünde en fazla kaç ürün' },
        },
        {
          name: 'dealLimit',
          type: 'number',
          label: 'Fırsatlar Limiti',
          defaultValue: 4,
          admin: { description: 'Fırsatlar bölümünde en fazla kaç ürün' },
        },
        {
          name: 'discountedLimit',
          type: 'number',
          label: 'İndirimli Limiti',
          defaultValue: 8,
          admin: { description: 'İndirimli Ürünler bölümünde en fazla kaç ürün' },
        },
      ],
    },
    // ── Zamanlama ──────────────────────────────────────────────
    {
      name: 'timing',
      type: 'group',
      label: '⏱️ Zamanlama',
      fields: [
        {
          name: 'newWindowDays',
          type: 'number',
          label: '"Yeni" Pencere Süresi (Gün)',
          defaultValue: 7,
          admin: {
            description:
              'Bir ürün kaç gün "Yeni" sayılsın? (publishedAt + bu gün sayısı = newUntil)',
          },
        },
      ],
    },
    // ── Çok Satan Skorlama ────────────────────────────────────
    {
      name: 'bestSellerScoring',
      type: 'group',
      label: '🧮 Çok Satan Skorlama',
      admin: {
        description: 'Ağırlıklı satış skoru hesaplama parametreleri',
      },
      fields: [
        {
          name: 'bestSellerRecentWeight7d',
          type: 'number',
          label: '7 Gün Ağırlığı',
          defaultValue: 3,
          admin: {
            description: 'Son 7 gün satışı bu katsayı ile çarpılır (varsayılan: 3)',
          },
        },
        {
          name: 'bestSellerRecentWeight30d',
          type: 'number',
          label: '30 Gün Ağırlığı',
          defaultValue: 1,
          admin: {
            description: 'Son 30 gün satışı bu katsayı ile çarpılır (varsayılan: 1)',
          },
        },
        {
          name: 'bestSellerMinimumScore',
          type: 'number',
          label: 'Minimum Skor',
          defaultValue: 1,
          admin: {
            description: 'Bu skorun altındaki ürünler Çok Satanlar listesine dahil edilmez',
          },
        },
      ],
    },
    // ── Davranış ──────────────────────────────────────────────
    {
      name: 'behavior',
      type: 'group',
      label: '⚙️ Davranış',
      fields: [
        {
          name: 'hideEmptySections',
          type: 'checkbox',
          label: 'Boş Bölümleri Gizle',
          defaultValue: true,
          admin: {
            description: 'İçinde ürün olmayan bölümler ana sayfada gösterilmez',
          },
        },
        {
          name: 'allowPinnedOverrides',
          type: 'checkbox',
          label: 'Sabitlenmiş Ürün Override',
          defaultValue: true,
          admin: {
            description:
              'Sabitlenmiş ürünler (bestSellerPinned) skora bakılmaksızın listenin başında gösterilir',
          },
        },
      ],
    },
  ],
}
