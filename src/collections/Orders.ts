import type { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    group: 'Sipariş',
    defaultColumns: ['orderNumber', 'customerName', 'product', 'size', 'totalPrice', 'status', 'createdAt'],
    description: 'Gelen siparişler ve müşteri talepleri',
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.orderNumber) {
          data.orderNumber = `ORD-${Date.now().toString().slice(-6)}`
        }
        return data
      },
    ],
  },
  fields: [
    // ── Sipariş Numarası ──────────────────────────────────────
    {
      name: 'orderNumber',
      type: 'text',
      label: 'Sipariş No',
      unique: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Otomatik oluşturulur',
      },
    },
    // ── Müşteri Bilgileri ─────────────────────────────────────
    {
      name: 'customerName',
      type: 'text',
      label: 'Ad Soyad',
      required: true,
    },
    {
      name: 'customerPhone',
      type: 'text',
      label: 'Telefon',
      required: true,
    },
    {
      name: 'customerAddress',
      type: 'textarea',
      label: 'Teslimat Adresi',
    },
    // ── Ürün Bilgileri ────────────────────────────────────────
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      label: 'Ürün',
      admin: { position: 'sidebar' },
    },
    {
      name: 'size',
      type: 'text',
      label: 'Beden',
      admin: {
        position: 'sidebar',
        description: '36–49 arasında',
      },
    },
    {
      name: 'quantity',
      type: 'number',
      label: 'Adet',
      defaultValue: 1,
      admin: { position: 'sidebar' },
    },
    {
      name: 'totalPrice',
      type: 'number',
      label: 'Toplam Tutar (₺)',
      admin: { position: 'sidebar' },
    },
    // ── Sipariş Durumu ────────────────────────────────────────
    {
      name: 'status',
      type: 'select',
      label: 'Durum',
      defaultValue: 'new',
      options: [
        { label: '🆕 Yeni', value: 'new' },
        { label: '✅ Onaylandı', value: 'confirmed' },
        { label: '📦 Kargoya Verildi', value: 'shipped' },
        { label: '🏠 Teslim Edildi', value: 'delivered' },
        { label: '❌ İptal', value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
    // ── Kaynak ────────────────────────────────────────────────
    {
      name: 'source',
      type: 'select',
      label: 'Kaynak',
      defaultValue: 'website',
      options: [
        { label: '🌐 Web Sitesi', value: 'website' },
        { label: '📲 Telegram', value: 'telegram' },
        { label: '📞 Telefon', value: 'phone' },
        { label: '📸 Instagram', value: 'instagram' },
        { label: '🛍️ Shopier', value: 'shopier' },
      ],
      admin: { position: 'sidebar' },
    },
    // ── Shopier Entegrasyonu ──────────────────────────────────
    {
      name: 'shopierOrderId',
      type: 'text',
      label: 'Shopier Sipariş ID',
      unique: false,
      admin: {
        position: 'sidebar',
        description: 'Shopier\'den gelen sipariş IDsi — otomatik doldurulur',
        readOnly: true,
        condition: (data) => data?.source === 'shopier',
      },
    },
    // ── Ödeme ─────────────────────────────────────────────────
    {
      name: 'paymentMethod',
      type: 'select',
      label: 'Ödeme Yöntemi',
      options: [
        { label: '💳 Kapıda Kredi Kartı', value: 'card_on_delivery' },
        { label: '💵 Kapıda Nakit', value: 'cash_on_delivery' },
        { label: '🏦 Havale/EFT', value: 'bank_transfer' },
        { label: '💳 Online Ödeme', value: 'online' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'isPaid',
      type: 'checkbox',
      label: 'Ödeme Alındı',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    // ── Notlar ────────────────────────────────────────────────
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notlar',
      admin: { description: 'İç notlar — müşteri tarafından görülmez' },
    },
    // ── Kargo ─────────────────────────────────────────────────
    {
      name: 'shippingCompany',
      type: 'select',
      label: 'Kargo Firması',
      options: [
        { label: 'Yurtiçi Kargo', value: 'yurtici' },
        { label: 'Aras Kargo', value: 'aras' },
        { label: 'MNG Kargo', value: 'mng' },
        { label: 'PTT Kargo', value: 'ptt' },
        { label: 'Sürat Kargo', value: 'surat' },
        { label: 'Trendyol Express', value: 'trendyol' },
        { label: 'Diğer', value: 'other' },
      ],
    },
    {
      name: 'trackingNumber',
      type: 'text',
      label: 'Kargo Takip No',
      admin: { description: 'Kargoya verildikten sonra girin' },
    },
    {
      name: 'shippedAt',
      type: 'date',
      label: 'Kargo Tarihi',
    },
    {
      name: 'deliveredAt',
      type: 'date',
      label: 'Teslim Tarihi',
    },
  ],
}
