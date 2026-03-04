import type { CollectionConfig } from 'payload'

export const MediaCollection: CollectionConfig = {
  slug: 'media',
  upload: true,
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
    },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Original', value: 'original' },
        { label: 'Enhanced', value: 'enhanced' },
      ],
      defaultValue: 'original',
    },
    {
      name: 'altText',
      type: 'text',
    },
  ],
}
