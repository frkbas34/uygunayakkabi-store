import type { CollectionConfig } from 'payload'

export const Variants: CollectionConfig = {
  slug: 'variants',
  admin: {
    useAsTitle: 'variantSku',
    group: 'Mağaza',
    defaultColumns: ['variantSku', 'product', 'size', 'stock'],
    description: 'Ürün beden varyantları ve stok takibi',
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      label: 'Ürün',
      admin: { position: 'sidebar' },
    },
    {
      name: 'size',
      type: 'text',
      label: 'Beden (36–49)',
      required: true,
      admin: {
        description: 'Geçerli bedenler: 36 37 38 39 40 41 42 43 44 45 46 47 48 49',
      },
    },
    {
      name: 'stock',
      type: 'number',
      label: 'Stok Adedi',
      required: true,
      defaultValue: 0,
      admin: { description: 'Mevcut stok miktarı' },
    },
    {
      name: 'priceAdjustment',
      type: 'number',
      label: 'Fiyat Farkı (₺)',
      defaultValue: 0,
      admin: { description: 'Temel fiyata ek/indirim (pozitif veya negatif)' },
    },
    {
      name: 'variantSku',
      type: 'text',
      label: 'Varyant SKU',
      admin: {
        position: 'sidebar',
        description: 'Ör: NKE-AM90-BLK-42',
      },
    },
  ],
}
