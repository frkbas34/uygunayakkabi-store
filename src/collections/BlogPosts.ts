import type { CollectionConfig } from 'payload'

// Turkish slug generator (same as Products.ts)
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  admin: {
    useAsTitle: 'title',
    group: 'İçerik',
    defaultColumns: ['title', 'category', 'status', 'publishedAt'],
    description: 'Blog yazıları ve SEO içerikleri',
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        // Auto-generate slug from title
        if (data.title) {
          data.slug = toSlug(data.title)
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
      label: 'Başlık',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      label: 'Slug (URL)',
      unique: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Otomatik oluşturulur',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      label: 'Özet',
      admin: {
        description: 'Kısa açıklama — blog listesinde ve sosyal medya paylaşımında görünür',
      },
    },
    {
      name: 'content',
      type: 'richText',
      label: 'İçerik',
      required: true,
    },
    // ── Görsel ──────────────────────────────────────────────
    {
      name: 'featuredImage',
      type: 'relationship',
      relationTo: 'media',
      label: 'Kapak Görseli',
    },
    // ── Kategorizasyon ──────────────────────────────────────
    {
      name: 'category',
      type: 'select',
      label: 'Kategori',
      options: [
        { label: '📝 Genel', value: 'general' },
        { label: '👟 Ürün Tanıtım', value: 'product' },
        { label: '🎨 Stil & Moda', value: 'style' },
        { label: '📢 Duyuru', value: 'announcement' },
        { label: '🔍 SEO İçerik', value: 'seo' },
      ],
      defaultValue: 'general',
      admin: { position: 'sidebar' },
    },
    {
      name: 'tags',
      type: 'text',
      label: 'Etiketler',
      admin: {
        position: 'sidebar',
        description: 'Virgülle ayırın: ayakkabı, nike, spor',
      },
    },
    // ── Durum ────────────────────────────────────────────────
    {
      name: 'status',
      type: 'select',
      label: 'Durum',
      defaultValue: 'draft',
      options: [
        { label: '📝 Taslak', value: 'draft' },
        { label: '🟢 Yayında', value: 'published' },
        { label: '📦 Arşiv', value: 'archived' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Yayın Tarihi',
      admin: {
        position: 'sidebar',
        description: 'Boş bırakılırsa yayına alındığında otomatik dolar',
      },
    },
    // ── SEO ──────────────────────────────────────────────────
    {
      name: 'seo',
      type: 'group',
      label: '🔍 SEO Ayarları',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'SEO Başlık',
          admin: {
            description: 'Boş bırakılırsa ana başlık kullanılır (max 60 karakter)',
          },
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'SEO Açıklama',
          admin: {
            description: 'Meta description — max 160 karakter',
          },
        },
        {
          name: 'keywords',
          type: 'text',
          label: 'SEO Anahtar Kelimeler',
          admin: {
            description: 'Virgülle ayırın: uygun ayakkabı, nike indirim',
          },
        },
      ],
    },
    // ── İlişkili Ürünler ────────────────────────────────────
    {
      name: 'relatedProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: 'İlişkili Ürünler',
      admin: {
        description: 'Bu yazıda bahsedilen ürünler — yazı sonunda ürün kartları gösterilir',
      },
    },
    // ── Kaynak ──────────────────────────────────────────────
    {
      name: 'source',
      type: 'select',
      label: 'Kaynak',
      defaultValue: 'manual',
      options: [
        { label: '✍️ Manuel', value: 'manual' },
        { label: '🤖 AI Üretimi', value: 'ai' },
        { label: '📥 İçe Aktarım', value: 'import' },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'author',
      type: 'text',
      label: 'Yazar',
      defaultValue: 'UygunAyakkabı',
      admin: { position: 'sidebar' },
    },
  ],
}
