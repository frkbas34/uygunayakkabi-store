import type { CollectionConfig } from 'payload'

export const CustomerInquiries: CollectionConfig = {
  slug: 'customer-inquiries',
  admin: {
    useAsTitle: 'name',
    group: 'Müşteri',
    defaultColumns: ['name', 'phone', 'product', 'status', 'createdAt'],
    description: 'Müşteri talep ve mesajları',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Ad Soyad',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Telefon',
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
      label: 'Mesaj',
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      label: 'İlgili Ürün',
      admin: { position: 'sidebar' },
    },
    {
      name: 'size',
      type: 'text',
      label: 'İstenen Beden',
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Durum',
      defaultValue: 'new',
      options: [
        { label: 'Yeni', value: 'new' },
        { label: 'Arandı', value: 'contacted' },
        { label: 'Tamamlandı', value: 'completed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notlar',
    },
  ],
}
