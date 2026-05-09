import type { CollectionConfig } from 'payload'

/**
 * SupplierDailyReports — SupplierScout D-278
 *
 * One record per day, storing the full structured report including stats,
 * product lists, sold-out updates, skipped items, learning observations,
 * and the raw Telegram message text that was sent to Frank.
 */
export const SupplierDailyReports: CollectionConfig = {
  slug: 'supplier-daily-reports',
  admin: {
    useAsTitle: 'reportDate',
    group: 'SupplierScout',
    defaultColumns: ['reportDate', 'productsAdded', 'soldOutUpdates', 'messagesProcessed', 'sentAt'],
    description: 'Günlük SupplierScout raporu kayıtları',
  },
  fields: [
    {
      name: 'reportDate',
      type: 'text',
      label: 'Rapor Tarihi (YYYY-MM-DD)',
      required: true,
      admin: { description: 'Europe/Istanbul zaman dilimiyle' },
    },
    // ── Stats ────────────────────────────────────────────────────────────────
    {
      name: 'groupsMonitored',
      type: 'number',
      label: 'İzlenen Grup Sayısı',
      defaultValue: 0,
    },
    {
      name: 'messagesProcessed',
      type: 'number',
      label: 'İşlenen Mesaj Sayısı',
      defaultValue: 0,
    },
    {
      name: 'imagesProcessed',
      type: 'number',
      label: 'İşlenen Görsel Sayısı',
      defaultValue: 0,
    },
    {
      name: 'productsDetected',
      type: 'number',
      label: 'Tespit Edilen Ürün',
      defaultValue: 0,
    },
    {
      name: 'productsAdded',
      type: 'number',
      label: 'Eklenen Ürün',
      defaultValue: 0,
    },
    {
      name: 'soldOutUpdates',
      type: 'number',
      label: 'Tükendi Güncellemesi',
      defaultValue: 0,
    },
    {
      name: 'skippedDuplicates',
      type: 'number',
      label: 'Atlanan Duplicate',
      defaultValue: 0,
    },
    {
      name: 'skippedLowConfidence',
      type: 'number',
      label: 'Atlanan Düşük Güven',
      defaultValue: 0,
    },
    {
      name: 'errors',
      type: 'number',
      label: 'Hata Sayısı',
      defaultValue: 0,
    },
    {
      name: 'estimatedMarginPotential',
      type: 'number',
      label: 'Tahmini Marj Potansiyeli (USD)',
      defaultValue: 0,
    },

    // ── Full Structured Report ───────────────────────────────────────────────
    {
      name: 'reportData',
      type: 'json',
      label: 'Tam Rapor Verisi (JSON)',
      admin: { description: 'FullDailyReport tipindeki tam yapısal veri' },
    },

    // ── Telegram Delivery ────────────────────────────────────────────────────
    {
      name: 'telegramReportText',
      type: 'textarea',
      label: 'Telegram Mesaj Metni',
      admin: { description: "Frank'e gönderilen ham Telegram mesajı" },
    },
    {
      name: 'sentAt',
      type: 'date',
      label: 'Gönderilme Zamanı',
    },
    {
      name: 'telegramMessageId',
      type: 'number',
      label: 'Telegram Mesaj ID',
    },
    {
      name: 'deliveryStatus',
      type: 'select',
      label: 'Gönderim Durumu',
      defaultValue: 'pending',
      options: [
        { label: '⏳ Bekliyor', value: 'pending' },
        { label: '✅ Gönderildi', value: 'sent' },
        { label: '❌ Başarısız', value: 'failed' },
      ],
    },
  ],
}
