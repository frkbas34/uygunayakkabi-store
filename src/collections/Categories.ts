import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    group: 'Katalog',
    defaultColumns: ['name', 'slug', 'sortOrder'],
    description: 'Ayakkabı kategorileri',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Kategori Adı',
      required: true,
      unique: true,
    },
    {
      name: 'slug',
      type: 'text',
      label: 'Slug',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'URL-friendly kategori kodu (ör: gunluk, spor)',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Kategori Açıklaması',
    },
    {
      name: 'image',
      type: 'relationship',
      relationTo: 'media',
      label: 'Kategori Görseli',
      admin: { position: 'sidebar' },
    },
    {
      name: 'emoji',
      type: 'text',
      label: 'Emoji',
      admin: {
        position: 'sidebar',
        description: 'Kategori ikonu (ör: 👟)',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Sıralama',
      defaultValue: 99,
      admin: { position: 'sidebar' },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Aktif',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}

// ── Varsayılan kategoriler ─────────────────────────────────────────────────
// Günlük (👟), Klasik (👞), Spor (🏃), Bot (🥾), Sandalet (🩴), Krampon (⚽)
// Loafer, Oxford, Derby, Chelsea Bot, Ankle Bot, Çizme, Terlik, Mocasen
