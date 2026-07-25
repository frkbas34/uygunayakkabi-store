import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Ayarları',
  admin: {
    group: 'Ayarlar',
  },
  fields: [
    // ── Genel Bilgiler ──────────────────────────────────────
    {
      name: 'siteName',
      type: 'text',
      label: 'Site Adı',
      defaultValue: 'UygunAyakkabı',
    },
    {
      name: 'siteDescription',
      type: 'textarea',
      label: 'Site Açıklaması (SEO)',
      defaultValue: 'Uygun fiyatlı, kaliteli ayakkabı ve aksesuar mağazası',
    },
    // ── İletişim ─────────────────────────────────────────────
    {
      name: 'contact',
      type: 'group',
      label: 'İletişim Bilgileri',
      fields: [
        {
          name: 'whatsapp',
          type: 'text',
          label: 'WhatsApp Numarası',
          defaultValue: '0533 152 48 43',
          admin: { description: 'Ör: 0533 152 48 43' },
        },
        {
          name: 'whatsappFull',
          type: 'text',
          label: 'WhatsApp Link Numarası',
          defaultValue: '905331524843',
          admin: { description: 'Ülke kodu ile, boşluksuz: 905331524843' },
        },
        {
          name: 'email',
          type: 'email',
          label: 'E-posta',
        },
        {
          name: 'instagram',
          type: 'text',
          label: 'Instagram Kullanıcı Adı',
          admin: { description: '@olmadan: uygunayakkabi' },
        },
      ],
    },
    // ── Kargo & Ödeme ────────────────────────────────────────
    {
      name: 'shipping',
      type: 'group',
      label: 'Kargo & Ödeme',
      fields: [
        {
          name: 'freeShippingThreshold',
          type: 'number',
          label: 'Ücretsiz Kargo Limiti (₺)',
          defaultValue: 500,
          admin: { description: 'Bu tutarın üzerindeki siparişlerde kargo ücretsiz' },
        },
        {
          name: 'shippingCost',
          type: 'number',
          label: 'Standart Kargo Ücreti (₺)',
          defaultValue: 49,
        },
        {
          name: 'showFreeShippingBanner',
          type: 'checkbox',
          label: 'Ücretsiz Kargo Bannerı Göster',
          defaultValue: true,
        },
      ],
    },
    // ── Güven Göstergeleri ────────────────────────────────────
    {
      name: 'trustBadges',
      type: 'group',
      label: 'Güven Göstergeleri',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          label: 'Doğrulanmış Metrikleri Göster',
          defaultValue: false,
          admin: {
            description: 'Yalnızca güncel satış/katalog verisiyle doğruladığınız üç metrik de girildikten sonra açın.',
          },
        },
        {
          name: 'monthlyCustomers',
          type: 'text',
          label: 'Aylık Müşteri Sayısı',
          admin: { description: 'Doğrulanmış sayı; metrikler kapalıysa sitede gösterilmez.' },
        },
        {
          name: 'totalProducts',
          type: 'text',
          label: 'Toplam Ürün Sayısı',
        },
        {
          name: 'satisfactionRate',
          type: 'text',
          label: 'Müşteri Memnuniyeti',
        },
      ],
    },
    // ── Announcement Bar ─────────────────────────────────────
    {
      name: 'announcementBar',
      type: 'group',
      label: 'Üst Duyuru Barı',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          label: 'Aktif',
          defaultValue: true,
        },
        {
          name: 'text',
          type: 'text',
          label: 'Duyuru Metni',
          defaultValue: '🚚 500₺ üzeri siparişlerde KARGO BEDAVA!',
        },
        {
          name: 'bgColor',
          type: 'text',
          label: 'Arka Plan Rengi',
          defaultValue: '#c8102e',
        },
      ],
    },
  ],
}
