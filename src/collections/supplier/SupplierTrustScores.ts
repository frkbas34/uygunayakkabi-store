import type { CollectionConfig } from 'payload'

/**
 * SupplierTrustScores — SupplierScout D-278
 *
 * Tracks per-seller trust metrics across groups.
 * Updated automatically as the bot observes seller behaviour.
 * High-trust sellers get less strict confidence gates.
 */
export const SupplierTrustScores: CollectionConfig = {
  slug: 'supplier-trust-scores',
  admin: {
    useAsTitle: 'sellerDisplayName',
    group: 'SupplierScout',
    defaultColumns: ['sellerDisplayName', 'sellerTelegramId', 'trustScore', 'trustLevel', 'supplierGroup'],
    description: 'Tedarikçi satıcı güven skoru takibi',
  },
  fields: [
    {
      name: 'sellerTelegramId',
      type: 'number',
      label: 'Satıcı Telegram ID',
      required: true,
    },
    {
      name: 'sellerUsername',
      type: 'text',
      label: 'Kullanıcı Adı',
    },
    {
      name: 'sellerDisplayName',
      type: 'text',
      label: 'Görünen Ad',
    },
    {
      name: 'supplierGroup',
      type: 'relationship',
      label: 'Tedarikçi Grup',
      relationTo: 'supplier-groups',
    },
    {
      name: 'trustScore',
      type: 'number',
      label: 'Güven Skoru (0–100)',
      defaultValue: 50,
      min: 0,
      max: 100,
    },
    {
      name: 'trustLevel',
      type: 'select',
      label: 'Güven Seviyesi',
      defaultValue: 'normal',
      options: [
        { label: '⭐ Güvenilir', value: 'trusted' },
        { label: '🔵 Normal', value: 'normal' },
        { label: '🟡 İzlemede', value: 'watchlist' },
        { label: '🔴 Bloklandı', value: 'blocked' },
      ],
    },
    {
      name: 'totalPostsSeen',
      type: 'number',
      label: 'Toplam Gönderi',
      defaultValue: 0,
    },
    {
      name: 'productsCreated',
      type: 'number',
      label: 'Oluşturulan Ürün',
      defaultValue: 0,
    },
    {
      name: 'soldOutAccuracy',
      type: 'number',
      label: 'Tükendi Doğruluğu (0–100)',
      defaultValue: 50,
      admin: { description: 'Bu satıcının tükendi sinyallerinin doğruluk oranı' },
    },
    {
      name: 'duplicateRate',
      type: 'number',
      label: 'Duplicate Oranı (0–100)',
      defaultValue: 0,
      admin: { description: 'Aynı ürünü tekrar paylaşma oranı' },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Manuel Notlar',
    },
    {
      name: 'lastSeenAt',
      type: 'date',
      label: 'Son Görülme',
    },
    {
      name: 'flaggedAt',
      type: 'date',
      label: 'İzlemeye Alınma Zamanı',
    },
  ],
}
