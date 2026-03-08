import type { CollectionConfig } from 'payload'

export const Brands: CollectionConfig = {
  slug: 'brands',
  admin: {
    useAsTitle: 'name',
    group: 'Katalog',
    defaultColumns: ['name', 'slug', 'featured'],
    description: 'Ayakkabı markaları',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Marka Adı',
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
        description: 'URL-friendly marka kodu (ör: nike, adidas)',
      },
    },
    {
      name: 'logo',
      type: 'relationship',
      relationTo: 'media',
      label: 'Marka Logosu',
      admin: { position: 'sidebar' },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Marka Hakkında',
    },
    {
      name: 'country',
      type: 'text',
      label: 'Ülke',
      admin: { position: 'sidebar' },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Öne Çıkan Marka',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Ana sayfada göster',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Sıralama',
      defaultValue: 99,
      admin: { position: 'sidebar' },
    },
  ],
}

// ── Default brand list — seed via admin panel ──────────────────────────────
// Nike, Adidas, Puma, New Balance, Converse, Vans, Reebok, Asics, Skechers,
// Under Armour, Jordan, Lacoste, Timberland, Clarks, Ecco, Geox, Hummel,
// Columbia, Salomon, Merrell, UGG, Birkenstock, Crocs, Tommy Hilfiger,
// Calvin Klein, Versace, Balenciaga, Gucci, Louis Vuitton, Fendi,
// Diadora, Fila, Kappa, Ellesse, Le Coq Sportif, Lotto, Umbro
