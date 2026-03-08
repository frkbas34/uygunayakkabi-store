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
      ],
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
  ],
}
