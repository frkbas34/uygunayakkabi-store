import type { CollectionConfig } from 'payload'

/**
 * StoryJobs — Phase 3 Foundation
 *
 * Tracks individual story publish jobs through the pipeline:
 *   queued → awaiting_asset → awaiting_approval → approved → publishing → published
 *
 * Non-blocking by design: story failures do not affect product publish.
 * Each job targets one or more platforms (Telegram, Instagram, WhatsApp).
 * WhatsApp official API does not support story/status — marked blocked_officially.
 */
export const StoryJobs: CollectionConfig = {
  slug: 'story-jobs',
  admin: {
    useAsTitle: 'status',
    group: 'Sistem',
    defaultColumns: ['product', 'status', 'triggerSource', 'targets', 'createdAt'],
    description: 'Telegram Story yayın işleri — ürün bazlı story pipeline takibi',
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      label: 'İlgili Ürün',
      relationTo: 'products',
      required: true,
      admin: {
        description: 'Story yayınlanacak ürün',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Durum',
      defaultValue: 'queued',
      required: true,
      options: [
        { label: '🔄 Kuyrukta', value: 'queued' },
        { label: '🖼️ Görsel Bekliyor', value: 'awaiting_asset' },
        { label: '⏳ Onay Bekliyor', value: 'awaiting_approval' },
        { label: '✅ Onaylandı', value: 'approved' },
        { label: '📤 Yayınlanıyor', value: 'publishing' },
        { label: '✅ Yayınlandı', value: 'published' },
        { label: '⚠️ Kısmen Başarılı', value: 'partial_success' },
        { label: '❌ Başarısız', value: 'failed' },
        { label: '🚫 Resmi Engel', value: 'blocked_officially' },
      ],
      admin: {
        description: 'Story job pipeline durumu',
      },
    },
    {
      name: 'triggerSource',
      type: 'select',
      label: 'Tetikleyen',
      defaultValue: 'auto_publish',
      options: [
        { label: '🚀 Otomatik Yayın', value: 'auto_publish' },
        { label: '📱 Telegram Komutu', value: 'telegram_command' },
        { label: '🖥️ Admin Panel', value: 'admin' },
        { label: '🔄 Yeniden Deneme', value: 'retry' },
      ],
      admin: {
        description: 'Story job\'u başlatan kaynak',
      },
    },
    {
      name: 'targets',
      type: 'select',
      label: 'Hedef Platformlar',
      hasMany: true,
      options: [
        { label: '📱 Telegram', value: 'telegram' },
        { label: '📸 Instagram', value: 'instagram' },
        { label: '💬 WhatsApp', value: 'whatsapp' },
      ],
      defaultValue: ['telegram'],
      admin: {
        description: 'Story hangi platformlara gönderilecek?',
      },
    },
    {
      name: 'assetUrl',
      type: 'text',
      label: 'Görsel URL',
      admin: {
        description: 'Story için kullanılacak görsel URL\'si — asset resolution tarafından doldurulur',
      },
    },
    {
      name: 'caption',
      type: 'textarea',
      label: 'Story Açıklaması',
      admin: {
        description: 'Story\'de gösterilecek açıklama metni',
      },
    },
    {
      name: 'scheduledFor',
      type: 'date',
      label: 'Planlanan Yayın Zamanı',
      admin: {
        description: 'Zamanlanmış yayın — boşsa hemen yayınlanır',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Yayınlanma Zamanı',
      admin: {
        readOnly: true,
        description: 'Story\'nin başarıyla yayınlandığı zaman',
      },
    },
    {
      name: 'errorLog',
      type: 'textarea',
      label: 'Hata Günlüğü',
      admin: {
        readOnly: true,
        description: 'Son hata detayları (JSON)',
      },
    },
    {
      name: 'approvalState',
      type: 'select',
      label: 'Onay Durumu',
      defaultValue: 'not_required',
      options: [
        { label: '➖ Gerekli Değil', value: 'not_required' },
        { label: '⏳ Bekliyor', value: 'pending' },
        { label: '✅ Onaylandı', value: 'approved' },
        { label: '❌ Reddedildi', value: 'rejected' },
      ],
      admin: {
        description: 'Operatör onay durumu',
      },
    },
    {
      name: 'approvalMessageId',
      type: 'text',
      label: 'Onay Mesaj ID',
      admin: {
        readOnly: true,
        description: 'Telegram onay mesajının ID\'si — callback query için',
      },
    },
    {
      name: 'attemptCount',
      type: 'number',
      label: 'Deneme Sayısı',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Yayın deneme sayısı — retry takibi için',
      },
    },
  ],
}
