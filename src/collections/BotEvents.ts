import type { CollectionConfig } from 'payload'

/**
 * BotEvents — Phase 1 Foundation
 *
 * Structured event tracking for bot-to-bot workflow transitions.
 * Each record represents a discrete event: a bot processed a product,
 * requested an action from another bot, or reported a status change.
 *
 * Phase 1: event logging foundation only — no orchestration engine yet.
 */
export const BotEvents: CollectionConfig = {
  slug: 'bot-events',
  admin: {
    useAsTitle: 'eventType',
    group: 'Sistem',
    defaultColumns: ['eventType', 'sourceBot', 'targetBot', 'status', 'createdAt'],
    description: 'Bot iş akışı olayları — botlar arası event takibi',
  },
  fields: [
    {
      name: 'eventType',
      type: 'text',
      label: 'Olay Tipi',
      required: true,
      admin: {
        description:
          'Olayın tipi — ör: visual_requested, visual_completed, confirmation_received, ' +
          'content_generated, audit_passed, publish_requested, soldout_detected',
      },
    },
    {
      name: 'product',
      type: 'relationship',
      label: 'İlgili Ürün',
      relationTo: 'products',
      admin: {
        description: 'Bu olayın ilgili olduğu ürün',
      },
    },
    {
      name: 'sourceBot',
      type: 'select',
      label: 'Kaynak Bot',
      required: true,
      options: [
        { label: 'UygunOps', value: 'uygunops' },
        { label: 'GeoBot', value: 'geobot' },
        { label: 'Mentix', value: 'mentix' },
        { label: 'Sistem', value: 'system' },
      ],
      admin: {
        description: 'Olayı oluşturan bot/sistem',
      },
    },
    {
      name: 'targetBot',
      type: 'select',
      label: 'Hedef Bot',
      options: [
        { label: 'UygunOps', value: 'uygunops' },
        { label: 'GeoBot', value: 'geobot' },
        { label: 'Mentix', value: 'mentix' },
        { label: 'Sistem', value: 'system' },
      ],
      admin: {
        description: 'Olayın hedef aldığı bot/sistem (isteğe bağlı)',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Durum',
      defaultValue: 'pending',
      options: [
        { label: '⏳ Bekliyor', value: 'pending' },
        { label: '✅ İşlendi', value: 'processed' },
        { label: '❌ Başarısız', value: 'failed' },
        { label: '⏭️ Yok Sayıldı', value: 'ignored' },
      ],
      admin: {
        description: 'Olayın işlenme durumu',
      },
    },
    {
      name: 'payload',
      type: 'json',
      label: 'Veri Yükü',
      admin: {
        description: 'Olaya ait yapısal veri (JSON) — esnek içerik',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notlar',
      admin: {
        description: 'Olayla ilgili serbest metin açıklama',
      },
    },
    {
      name: 'processedAt',
      type: 'date',
      label: 'İşlenme Zamanı',
      admin: {
        description: 'Olay ne zaman işlendi',
      },
    },
  ],
}
