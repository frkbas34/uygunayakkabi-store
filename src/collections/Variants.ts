import type { CollectionConfig } from 'payload'

export const Variants: CollectionConfig = {
  slug: 'variants',
  admin: {
    useAsTitle: 'size',
    group: 'Mağaza',
    defaultColumns: ['size', 'product', 'stock', 'variantSku'],
    description: 'Ürün beden varyantları ve stok takibi',
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      // NOT required — allows product deletion (sets to null instead of FK error)
      required: false,
      label: 'Ürün',
      admin: { position: 'sidebar' },
    },
    {
      name: 'size',
      type: 'text',
      label: 'Beden',
      required: true,
      admin: {
        description: 'Sadece numara yazın: 36, 37, 38, 39, 40, 41, 42, 43, 44, 45',
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
      label: 'Varyant SKU (opsiyonel)',
      admin: {
        position: 'sidebar',
        description: 'Ör: NKE-AM90-BLK-42 — boş bırakılabilir',
      },
    },
  ],
}
