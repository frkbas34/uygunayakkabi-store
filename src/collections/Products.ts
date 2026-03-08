import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'title',
    group: 'Mağaza',
    defaultColumns: ['title', 'category', 'brand', 'price', 'status'],
    description: 'Mağazadaki tüm ayakkabı ürünleri',
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && data.title && !data.slug) {
          data.slug = data.title
            .toLowerCase()
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
            .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        }
        return data
      },
    ],
  },
  fields: [
    // ── Temel Bilgiler ────────────────────────────────────────
    {
      name: 'title',
      type: 'text',
      label: 'Ürün Adı',
      required: true,
    },
    {
      name: 'brand',
      type: 'text',
      label: 'Marka',
      admin: {
        position: 'sidebar',
        description: 'Nike, Adidas, Puma, New Balance, Converse, Vans, Reebok, vb.',
        components: {
          // autocomplete hint shown in description — actual select done via text field
        },
      },
    },
    {
      name: 'category',
      type: 'text',
      label: 'Kategori',
      admin: {
        position: 'sidebar',
        description: 'Günlük, Klasik, Spor, Bot, Sandalet, Krampon',
      },
    },
    {
      name: 'gender',
      type: 'select',
      label: 'Cinsiyet',
      options: [
        { label: 'Erkek', value: 'erkek' },
        { label: 'Kadın', value: 'kadin' },
        { label: 'Unisex', value: 'unisex' },
        { label: 'Çocuk', value: 'cocuk' },
      ],
      defaultValue: 'unisex',
      admin: { position: 'sidebar' },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Ürün Açıklaması',
    },
    // ── Görseller ─────────────────────────────────────────────
    {
      name: 'images',
      type: 'array',
      label: 'Ürün Görselleri',
      fields: [
        {
          name: 'image',
          type: 'relationship',
          relationTo: 'media',
          label: 'Görsel',
        },
      ],
    },
    // ── Fiyat ─────────────────────────────────────────────────
    {
      name: 'price',
      type: 'number',
      label: 'Satış Fiyatı (₺)',
      required: true,
    },
    {
      name: 'originalPrice',
      type: 'number',
      label: 'Piyasa Fiyatı (₺)',
      admin: {
        description: 'İndirim hesabı için eski fiyat',
      },
    },
    // ── Tanımlayıcılar ───────────────────────────────────────
    {
      name: 'slug',
      type: 'text',
      label: 'Slug (URL)',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'Başlıktan otomatik oluşturulur',
      },
    },
    {
      name: 'sku',
      type: 'text',
      label: 'SKU / Stok Kodu',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'Benzersiz ürün kodu (ör: NKE-AM90-BLK)',
      },
    },
    // ── Durum ─────────────────────────────────────────────────
    {
      name: 'status',
      type: 'select',
      label: 'Durum',
      defaultValue: 'active',
      options: [
        { label: 'Aktif', value: 'active' },
        { label: 'Tükendi', value: 'soldout' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Öne Çıkan Ürün',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Ana sayfada göster',
      },
    },
    // ── Varyantlar ────────────────────────────────────────────
    {
      name: 'variants',
      type: 'relationship',
      label: 'Beden Varyantları',
      relationTo: 'variants',
      hasMany: true,
    },
    // ── Otomasyon ─────────────────────────────────────────────
    {
      name: 'createdByAutomation',
      type: 'checkbox',
      label: 'Otomasyon ile Eklendi',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'telegramMessageId',
      type: 'text',
      label: 'Telegram Mesaj ID',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'postToInstagram',
      type: 'checkbox',
      label: 'Instagram Paylaş',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
