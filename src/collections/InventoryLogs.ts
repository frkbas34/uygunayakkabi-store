import type { CollectionConfig } from 'payload'

export const InventoryLogs: CollectionConfig = {
  slug: 'inventory-logs',
  admin: {
    useAsTitle: 'sku',
    group: 'Stok',
    defaultColumns: ['sku', 'size', 'change', 'source', 'timestamp'],
    description: 'Stok giriş/çıkış logları',
  },
  fields: [
    {
      name: 'sku',
      type: 'text',
      label: 'SKU',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'size',
      type: 'text',
      label: 'Beden',
      required: true,
    },
    {
      name: 'change',
      type: 'number',
      label: 'Stok Değişimi',
      required: true,
      admin: { description: 'Pozitif = giriş, Negatif = çıkış' },
    },
    {
      name: 'reason',
      type: 'text',
      label: 'Neden',
    },
    {
      name: 'source',
      type: 'select',
      label: 'Kaynak',
      options: [
        { label: 'Telegram', value: 'telegram' },
        { label: 'Admin', value: 'admin' },
        { label: 'System', value: 'system' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'timestamp',
      type: 'date',
      label: 'Zaman',
      defaultValue: () => new Date().toISOString(),
      admin: { position: 'sidebar' },
    },
  ],
}
