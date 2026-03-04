import type { CollectionConfig } from 'payload'

export const InventoryLogs: CollectionConfig = {
  slug: 'inventory-logs',
  admin: {
    useAsTitle: 'sku',
  },
  fields: [
    {
      name: 'sku',
      type: 'text',
      required: true,
    },
    {
      name: 'size',
      type: 'text',
      required: true,
    },
    {
      name: 'change',
      type: 'number',
      required: true,
    },
    {
      name: 'reason',
      type: 'text',
    },
    {
      name: 'source',
      type: 'select',
      options: [
        { label: 'Telegram', value: 'telegram' },
        { label: 'Admin', value: 'admin' },
        { label: 'System', value: 'system' },
      ],
    },
    {
      name: 'timestamp',
      type: 'date',
      defaultValue: () => new Date().toISOString(),
    },
  ],
}
