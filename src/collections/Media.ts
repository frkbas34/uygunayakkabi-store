import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const MediaCollection: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: path.resolve(dirname, '../../public/media'),
    // URL prefix: files saved to public/media are served by Next.js at /media/*
    staticURL: '/media',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
        height: 300,
        position: 'centre',
      },
      {
        name: 'card',
        width: 600,
        height: 600,
        position: 'centre',
      },
      {
        name: 'large',
        width: 1200,
        height: 1200,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
    focalPoint: true,
  },
  admin: {
    useAsTitle: 'filename',
    group: 'Medya',
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      label: 'İlgili Ürün',
      admin: { position: 'sidebar' },
    },
    {
      name: 'type',
      type: 'select',
      label: 'Görsel Türü',
      options: [
        { label: 'Original', value: 'original' },
        { label: 'Enhanced', value: 'enhanced' },
      ],
      defaultValue: 'original',
      admin: { position: 'sidebar' },
    },
    {
      name: 'altText',
      type: 'text',
      label: 'Alt Metin (SEO)',
    },
  ],
}
