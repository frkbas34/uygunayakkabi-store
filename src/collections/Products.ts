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
    defaultColumns: ['title', 'source', 'status', 'price', 'brand'],
    description: 'Mağazadaki tüm ürünler (ayakkabı, cüzdan, çanta, aksesuar)',
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
    // ── Otomasyon Kontrol Paneli (yalnızca otomasyon ürünlerinde görünür) ──
    {
      name: 'reviewPanel',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/admin/ReviewPanel#ReviewPanel',
        },
      },
    },
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
    // ── Ürün Ailesi & Tipi (D-054) ────────────────────────────
    {
      name: 'productFamily',
      type: 'select',
      label: 'Ürün Ailesi',
      options: [
        { label: '👟 Ayakkabı', value: 'shoes' },
        { label: '👛 Cüzdan', value: 'wallets' },
        { label: '👜 Çanta', value: 'bags' },
        { label: '🎒 Aksesuar', value: 'accessories' },
      ],
      defaultValue: 'shoes',
      admin: {
        position: 'sidebar',
        description: 'Ana ürün grubu — filtreleme ve kanal yönlendirmede kullanılır',
      },
    },
    {
      name: 'productType',
      type: 'text',
      label: 'Ürün Tipi',
      admin: {
        position: 'sidebar',
        description: 'Detay tip: sneaker, bot, loafer, bifold, cardholder vb.',
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
      validate: (value: any, { data }: any) => {
        // Otomasyon kaynağından gelen draft ürünler için fiyat validasyonu atlanır
        // (fiyat daha sonra admin panelinden tamamlanır)
        if (data?.source === 'n8n' || data?.source === 'automation') {
          return true
        }
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
        components: {
          Cell: '@/components/admin/StatusCell#StatusCell',
        },
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
    // ── Kanal Yayın Kontrolleri (D-055) ────────────────────────
    {
      name: 'channels',
      type: 'group',
      label: '📢 Yayın Kanalları',
      admin: {
        description: 'Ürünün hangi kanallarda yayınlanacağını seçin',
      },
      fields: [
        {
          name: 'publishWebsite',
          type: 'checkbox',
          label: '🌐 Web Sitesi',
          defaultValue: true,
        },
        {
          name: 'publishInstagram',
          type: 'checkbox',
          label: '📸 Instagram',
          defaultValue: false,
        },
        {
          name: 'publishShopier',
          type: 'checkbox',
          label: '🛒 Shopier',
          defaultValue: false,
        },
        {
          name: 'publishDolap',
          type: 'checkbox',
          label: '👗 Dolap',
          defaultValue: false,
        },
      ],
    },
    // ── Kaynak (D-056) ──────────────────────────────────────
    {
      name: 'source',
      type: 'select',
      label: 'Kaynak',
      defaultValue: 'admin',
      options: [
        { label: '🖥️ Admin Paneli', value: 'admin' },
        { label: '📱 Telegram', value: 'telegram' },
        { label: '⚙️ n8n Otomasyon', value: 'n8n' },
        { label: '🔌 API', value: 'api' },
        { label: '📥 İçe Aktarım', value: 'import' },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Ürün nereden oluşturuldu',
        components: {
          Cell: '@/components/admin/SourceBadgeCell#SourceBadgeCell',
        },
      },
    },
    // ── Otomasyon Meta (D-057) ──────────────────────────────
    {
      name: 'automationMeta',
      type: 'group',
      label: '🤖 Otomasyon Bilgileri',
      admin: {
        description: 'Otomasyon pipeline tarafından kullanılan alanlar',
        condition: (data: any) => {
          // Only show this group if source is not 'admin' or if createdByAutomation is true
          return data?.source !== 'admin' || data?.createdByAutomation === true
        },
      },
      fields: [
        {
          name: 'telegramChatId',
          type: 'text',
          label: 'Telegram Chat ID',
          admin: { readOnly: true },
        },
        {
          name: 'telegramMessageId',
          type: 'text',
          label: 'Telegram Mesaj ID',
          admin: { readOnly: true },
        },
        {
          name: 'lastSyncedAt',
          type: 'date',
          label: 'Son Senkronizasyon',
          admin: { readOnly: true },
        },
        {
          name: 'updatedBy',
          type: 'text',
          label: 'Son Güncelleyen',
          admin: {
            readOnly: true,
            description: 'admin / automation / api',
          },
        },
        {
          name: 'lockFields',
          type: 'checkbox',
          label: '🔒 Alanları Kilitle',
          defaultValue: false,
          admin: {
            description: 'Aktifken otomasyon bu ürünü güncelleyemez — sadece admin değiştirebilir',
          },
        },
      ],
    },
    // ── Eski Otomasyon Alanları (geriye uyumluluk) ──────────
    // Yeni kod channels.* ve automationMeta.* kullanmalı
    {
      name: 'createdByAutomation',
      type: 'checkbox',
      label: 'Otomasyon ile Eklendi (Eski)',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: '⚠️ Eski alan — yeni ürünler için "Kaynak" alanını kullanın',
      },
    },
    {
      name: 'telegramMessageId',
      type: 'text',
      label: 'Telegram Mesaj ID (Eski)',
      admin: {
        position: 'sidebar',
        description: '⚠️ Eski alan — automationMeta.telegramMessageId kullanın',
      },
    },
    {
      name: 'postToInstagram',
      type: 'checkbox',
      label: 'Instagram Paylaş (Eski)',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: '⚠️ Eski alan — channels.publishInstagram kullanın',
      },
    },
  ],
}
