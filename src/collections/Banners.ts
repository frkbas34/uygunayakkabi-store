import type { CollectionConfig } from 'payload'

export const Banners: CollectionConfig = {
  slug: 'banners',
  admin: {
    useAsTitle: 'title',
    group: 'Pazarlama',
    defaultColumns: ['title', 'type', 'active', 'startDate', 'endDate'],
    description: 'Kampanya bannerları ve duyurular',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Banner Başlığı',
      required: true,
      admin: { description: 'Ör: Yaz İndirimi %30!' },
    },
    {
      name: 'subtitle',
      type: 'text',
      label: 'Alt Yazı',
      admin: { description: 'Ör: Tüm spor ayakkabılarda geçerli' },
    },
    {
      name: 'type',
      type: 'select',
      label: 'Banner Türü',
      required: true,
      options: [
        { label: '🏷️ İndirim Kampanyası', value: 'discount' },
        { label: '📢 Duyuru', value: 'announcement' },
        { label: '🆕 Yeni Sezon', value: 'new_season' },
        { label: '🚚 Ücretsiz Kargo', value: 'free_shipping' },
        { label: '⏰ Flash Sale', value: 'flash_sale' },
      ],
      defaultValue: 'discount',
      admin: { position: 'sidebar' },
    },
    {
      name: 'discountPercent',
      type: 'number',
      label: 'İndirim Oranı (%)',
      admin: { description: 'İndirim kampanyası için (ör: 30)' },
    },
    {
      name: 'couponCode',
      type: 'text',
      label: 'Kupon Kodu',
      admin: { description: 'Varsa: YAZINDIRIMI30 gibi' },
    },
    {
      name: 'image',
      type: 'relationship',
      relationTo: 'media',
      label: 'Banner Görseli',
    },
    {
      name: 'bgColor',
      type: 'text',
      label: 'Arka Plan Rengi',
      defaultValue: '#c8102e',
      admin: { description: 'CSS renk kodu: #c8102e, #1a1a1a vb.' },
    },
    {
      name: 'textColor',
      type: 'text',
      label: 'Yazı Rengi',
      defaultValue: '#ffffff',
    },
    {
      name: 'linkUrl',
      type: 'text',
      label: 'Link URL',
      admin: { description: 'Tıklanınca gidilecek sayfa (ör: /catalog)' },
    },
    {
      name: 'placement',
      type: 'select',
      label: 'Gösterim Yeri',
      options: [
        { label: '🔝 Üst Banner (site geneli)', value: 'top_bar' },
        { label: '🏠 Ana Sayfa Hero', value: 'hero' },
        { label: '📦 Katalog Üstü', value: 'catalog_top' },
        { label: '🛒 Popup', value: 'popup' },
      ],
      defaultValue: 'top_bar',
      admin: { position: 'sidebar' },
    },
    // ── Tarih Aralığı ─────────────────────────────────────────
    {
      name: 'startDate',
      type: 'date',
      label: 'Başlangıç Tarihi',
      admin: { position: 'sidebar' },
    },
    {
      name: 'endDate',
      type: 'date',
      label: 'Bitiş Tarihi',
      admin: { position: 'sidebar' },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Aktif',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Sıralama',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
  ],
}
