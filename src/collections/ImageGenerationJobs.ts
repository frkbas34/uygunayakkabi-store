/**
 * ImageGenerationJobs — Step 24
 *
 * Tracks AI image generation jobs triggered from Telegram.
 * Each job corresponds to one "#gorsel" command, producing up to 5 images.
 *
 * Status flow:
 *   queued → generating → review (admin approves/rejects images)
 *   queued → generating → failed (on unrecoverable error)
 *
 * Admin review: images appear in `generatedImages` field; admin can:
 *   - Drag approved images into the product's `images` array
 *   - Or use the batch-attach helper (future UI)
 *
 * Design: no custom React components needed — Payload's default relationship
 * field renders media thumbnails inline for visual review.
 */
import type { CollectionConfig } from 'payload'

export const ImageGenerationJobs: CollectionConfig = {
  slug: 'image-generation-jobs',

  // ── Hooks ────────────────────────────────────────────────────────────────
  hooks: {
    afterChange: [
      /**
       * When an admin sets status → 'approved', automatically append all
       * generatedImages to the product's images array.
       * This removes the manual drag-and-drop step from the workflow.
       */
      async ({ doc, previousDoc, req, operation }) => {
        // Only fire on updates when status just became 'approved'
        if (
          operation !== 'update' ||
          doc.status !== 'approved' ||
          previousDoc?.status === 'approved'
        ) {
          return
        }

        const payload = req.payload

        // Resolve product ID
        const productRef = doc.product as { id: number } | number | null
        if (!productRef) {
          console.warn('[ImageGenerationJobs] afterChange: no product on job, skipping')
          return
        }
        const productId =
          typeof productRef === 'object' ? productRef.id : productRef

        // Resolve generated image IDs
        const generatedImages = doc.generatedImages as
          | Array<{ id: number } | number>
          | undefined
        if (!generatedImages || generatedImages.length === 0) {
          console.warn('[ImageGenerationJobs] afterChange: no generatedImages, skipping')
          return
        }
        const newMediaIds = generatedImages.map((img) =>
          typeof img === 'object' ? img.id : img,
        )

        try {
          // Fetch current product images (depth:0 to get raw IDs)
          const productDoc = await payload.findByID({
            collection: 'products',
            id: productId,
            depth: 0,
          })

          const existingImages = (
            productDoc.images as Array<{ image: number }> | undefined
          ) ?? []

          // Build the merged images array (existing + newly approved AI images)
          const updatedImages = [
            ...existingImages,
            ...newMediaIds.map((id) => ({ image: id })),
          ]

          await payload.update({
            collection: 'products',
            id: productId,
            data: { images: updatedImages },
          })

          console.log(
            `[ImageGenerationJobs] auto-pushed ${newMediaIds.length} AI images ` +
              `to product ${productId} (total images: ${updatedImages.length})`,
          )
        } catch (err) {
          // Non-fatal: log but don't crash the admin save
          console.error(
            '[ImageGenerationJobs] afterChange hook failed — images NOT pushed to product:',
            err,
          )
        }
      },
    ],
  },

  admin: {
    useAsTitle: 'jobTitle',
    group: 'Otomasyon',
    defaultColumns: ['jobTitle', 'mode', 'status', 'product', 'createdAt'],
    description: 'AI ile üretilen ürün görsel işleri — Telegram #gorsel komutundan tetiklenir',
  },
  access: {
    read: () => true,
  },
  fields: [
    // ── Computed title (read-only, for admin list view label) ─────────────────
    {
      name: 'jobTitle',
      type: 'text',
      label: 'İş Başlığı',
      admin: {
        readOnly: true,
        description: 'Otomatik oluşturulur — ürün adı + mod',
      },
    },
    // ── Product relation ──────────────────────────────────────────────────────
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      label: 'İlgili Ürün',
      required: true,
      admin: { position: 'sidebar' },
    },
    // ── Generation mode ───────────────────────────────────────────────────────
    {
      name: 'mode',
      type: 'select',
      label: 'Üretim Modu',
      required: true,
      options: [
        { label: '⚡ Hızlı (Gemini Flash)', value: 'hizli' },
        { label: '⚖️ Dengeli (GPT Image)', value: 'dengeli' },
        { label: '💎 Premium (Gemini Pro / Imagen)', value: 'premium' },
        { label: '🌈 Karma (Çoklu Motor)', value: 'karma' },
      ],
      defaultValue: 'hizli',
      admin: { position: 'sidebar' },
    },
    // ── Job status ────────────────────────────────────────────────────────────
    {
      name: 'status',
      type: 'select',
      label: 'Durum',
      required: true,
      options: [
        { label: '🕐 Kuyrukta', value: 'queued' },
        { label: '⚙️ Üretiliyor', value: 'generating' },
        { label: '👁️ İnceleme Bekliyor', value: 'review' },
        { label: '✅ Onaylandı', value: 'approved' },
        { label: '❌ Başarısız', value: 'failed' },
      ],
      defaultValue: 'queued',
      admin: {
        position: 'sidebar',
        description: '"İnceleme Bekliyor" → görseller hazır, admin onayı bekleniyor',
      },
    },
    // ── Generated images ──────────────────────────────────────────────────────
    {
      name: 'generatedImages',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
      label: '🖼️ Üretilen Görseller',
      admin: {
        description: 'AI tarafından üretilen görseller — beğendiklerinizi ürüne ekleyin',
      },
    },
    // ── Prompts used ──────────────────────────────────────────────────────────
    {
      name: 'promptsUsed',
      type: 'textarea',
      label: '📝 Kullanılan Promptlar (JSON)',
      admin: {
        readOnly: true,
        description: 'Her görsel için kullanılan prompt dizisi (debug/audit)',
      },
    },
    // ── Provider results ──────────────────────────────────────────────────────
    {
      name: 'providerResults',
      type: 'textarea',
      label: '🔌 Provider Sonuçları (JSON)',
      admin: {
        readOnly: true,
        description: 'Hangi provider kaç görsel üretti, hatalar vs.',
      },
    },
    // ── Error info ────────────────────────────────────────────────────────────
    {
      name: 'errorMessage',
      type: 'textarea',
      label: '❌ Hata Mesajı',
      admin: {
        readOnly: true,
        description: 'İş başarısız olduysa hata detayı',
        condition: (data: any) => data?.status === 'failed',
      },
    },
    // ── Telegram context ──────────────────────────────────────────────────────
    {
      name: 'telegramChatId',
      type: 'text',
      label: 'Telegram Chat ID',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'İş tamamlanınca bildirim gidecek chat',
      },
    },
    {
      name: 'requestedByUserId',
      type: 'text',
      label: 'İsteyen Kullanıcı',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    // ── Timing ───────────────────────────────────────────────────────────────
    {
      name: 'generationStartedAt',
      type: 'date',
      label: 'Üretim Başlangıcı',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'generationCompletedAt',
      type: 'date',
      label: 'Üretim Bitişi',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    // ── Image count ───────────────────────────────────────────────────────────
    {
      name: 'imageCount',
      type: 'number',
      label: 'Görsel Sayısı',
      defaultValue: 0,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Başarıyla üretilen görsel adedi',
      },
    },
  ],
}
