import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const MediaCollection: CollectionConfig = {
  slug: 'media',
  access: {
    // Images must be publicly readable so storefront visitors can see product photos
    read: () => true,
  },
  upload: {
    staticDir: path.resolve(dirname, '../../public/media'),
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
      // NOTE: 'large' (1200x1200) removed to reduce Vercel Blob Advanced Operations.
      // Each upload previously created 4 blob files (original + 3 sizes).
      // Now creates 3 (original + thumbnail + card).
      // Existing large-size blobs in storage are unaffected and still served.
      // Storefront uses media.url (CDN) directly — no component references sizes.large.
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
        { label: 'Generated (AI)', value: 'generated' },
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
