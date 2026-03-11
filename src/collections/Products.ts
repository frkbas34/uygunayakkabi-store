import type { CollectionConfig } from 'payload'

// Turkish slug generator
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

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
        if (!data) return data
        // Auto-generate slug from title (always regenerate on save)
        if (data.title) {
          data.slug = toSlug(data.title)
        }
        // Auto-generate SKU if empty
        if (data.title && !data.sku) {
          const prefix = data.title.substring(0, 3).toUpperCase()
            .replace(/[^A-Z]/g, 'X')
          data.sku = `${prefix}-${Date.now().toString(36).toUpperCase()}`
        }
        return data
      },
    ],
    beforeDelete: [
      async ({ req, id }) => {
        // Clean up: nullify variant references before product deletion
        // This prevents foreign key constraint errors in PostgreSQL
        try {
          const variants = await req.payload.find({
            collection: 'variants',
            where: { product: { equals: id } },
            limit: 200,
          })
          for (const v of variants.docs) {
            await req.payload.update({
              collection: 'variants',
              id: v.id,
              data: { product: null as any },
            })
          }
          // Also clear media reverse references
          const media = await req.payload.find({
            collection: 'media',
            where: { product: { equals: id } },
            limit: 200,
          })
          for (const m of media.docs) {
            await req.payload.update({
              collection: 'media',
              id: m.id,
              data: { product: null as any },
            })
          }
        } catch (e) {
          // Non-critical — log and continue with delete
          console.error('[Products] beforeDelete cleanup failed:', e)
        }
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
      validate: (value: any) => {
        if (!value || String(value).trim().length === 0) {
          return '⚠️ Ürün adı zorunludur. Lütfen bir ürün adı girin.'
        }
        return true
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Ürün Açıklaması',
    },
    // ── 📸 Görseller — Ürün fotoğraflarını buradan ekle/değiştir ──
    {
      name: 'images',
      type: 'array',
      label: '📸 Ürün Görselleri (Fotoğraf Ekle / Değiştir)',
      admin: {
        description: '⬆️ Önce "Medya Kütüphanesi"nden görsel yükleyin, sonra buradan seçin. İlk görsel kapak fotoğrafı olarak kullanılır. En fazla 8 görsel. — VEYA medya kütüphanesinden "İlgili Ürün" alanını seçin, o da çalışır.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'image',
          type: 'relationship',
          relationTo: 'media',
          label: 'Görsel Seç',
        },
      ],
    },
    // ── Marka & Kategori ──────────────────────────────────────
    {
      name: 'brand',
      type: 'text',
      label: 'Marka',
      admin: {
        position: 'sidebar',
        description: 'Nike / Adidas / Puma / New Balance / Converse / Vans / Reebok / Timberland',
      },
    },
    {
      name: 'category',
      type: 'select',
      label: 'Kategori',
      options: [
        { label: 'Günlük', value: 'Günlük' },
        { label: 'Spor', value: 'Spor' },
        { label: 'Klasik', value: 'Klasik' },
        { label: 'Bot', value: 'Bot' },
        { label: 'Sandalet', value: 'Sandalet' },
        { label: 'Krampon', value: 'Krampon' },
        { label: 'Cüzdan', value: 'Cüzdan' },
      ],
      defaultValue: 'Günlük',
      admin: {
        position: 'sidebar',
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
    // ── Fiyat ─────────────────────────────────────────────────
    {
      name: 'price',
      type: 'number',
      label: 'Satış Fiyatı (₺)',
      required: true,
      validate: (value: any) => {
        if (value === undefined || value === null || value === '') {
          return '⚠️ Satış fiyatı zorunludur.'
        }
        if (Number(value) <= 0) {
          return '⚠️ Fiyat 0\'dan büyük olmalıdır.'
        }
        return true
      },
    },
    {
      name: 'originalPrice',
      type: 'number',
      label: 'Piyasa Fiyatı (₺)',
      admin: {
        description: 'İndirim hesabı için eski fiyat — boş bırakılabilir',
      },
    },
    // ── Tanımlayıcılar ───────────────────────────────────────
    {
      name: 'slug',
      type: 'text',
      label: 'Slug (URL)',
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'Otomatik oluşturulur — değiştirmenize gerek yok',
        readOnly: true,
      },
    },
    {
      name: 'sku',
      type: 'text',
      label: 'SKU / Stok Kodu',
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'Boş bırakırsanız otomatik oluşturulur (ör: NKE-AM90-BLK)',
      },
    },
    // ── Durum ─────────────────────────────────────────────────
    {
      name: 'status',
      type: 'select',
      label: 'Durum',
      defaultValue: 'active',
      options: [
        { label: '🟢 Aktif — Sitede görünür', value: 'active' },
        { label: '🔴 Tükendi — Stok bitti', value: 'soldout' },
        { label: '📝 Taslak — Sitede görünmez', value: 'draft' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'color',
      type: 'text',
      label: 'Renk',
      admin: {
        position: 'sidebar',
        description: 'Siyah, Beyaz, Kırmızı, Mavi vb.',
      },
    },
    {
      name: 'material',
      type: 'text',
      label: 'Materyal',
      admin: {
        position: 'sidebar',
        description: 'Deri, Süet, Kanvas, Sentetik vb.',
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
