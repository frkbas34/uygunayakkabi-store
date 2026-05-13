import type { CollectionConfig } from 'payload'

/**
 * SupplierActionsLog — SupplierScout D-278
 *
 * Immutable audit log of every autonomous action taken by SupplierScout.
 * Every auto-create, auto-soldout, skip, and correction is recorded here.
 * Reversals are recorded as new entries (with reversedAt), not overwrites.
 */
export const SupplierActionsLog: CollectionConfig = {
  slug: 'supplier-actions-log',
  admin: {
    useAsTitle: 'actionType',
    group: 'SupplierScout',
    defaultColumns: ['actionType', 'confidence', 'productTitle', 'supplierGroupName', 'createdAt'],
    description: 'SupplierScout otonom aksiyonlarının değiştirilemez denetim kaydı',
  },
  fields: [
    {
      name: 'actionType',
      type: 'select',
      label: 'Aksiyon Tipi',
      required: true,
      options: [
        { label: '✅ Ürün Oluşturuldu', value: 'product_created' },
        { label: '⏭️ Ürün Atlandı', value: 'product_skipped' },
        { label: '❌ Tükendi Uygulandı', value: 'soldout_applied' },
        { label: '⏭️ Tükendi Atlandı', value: 'soldout_skipped' },
        { label: '⚠️ Tükendi Uyarıldı', value: 'soldout_warned' },
        { label: '🔍 Mesaj Sınıflandırıldı', value: 'message_classified' },
        { label: '📝 Düzeltme Uygulandı', value: 'correction_applied' },
        { label: '📚 Terim Öğrenildi', value: 'term_learned' },
        { label: '⏸️ Otomatik Durduruldu', value: 'auto_paused' },
        { label: '▶️ Otomatik Devam Edildi', value: 'auto_resumed' },
        { label: '📊 Rapor Gönderildi', value: 'report_sent' },
        { label: '📤 Ops Grubuna İletildi', value: 'ops_forwarded' },
        { label: '🤖 Otomatik İletildi', value: 'auto_ops_forwarded' },
        { label: '❌ Hata', value: 'error' },
      ],
    },
    {
      name: 'confidence',
      type: 'select',
      label: 'Güven Seviyesi',
      options: [
        { label: '🟢 Yüksek', value: 'high' },
        { label: '🟡 Orta', value: 'medium' },
        { label: '🔴 Düşük', value: 'low' },
        { label: '⚫ Yok', value: 'none' },
      ],
    },
    {
      name: 'productId',
      type: 'text',
      label: 'Ürün ID',
    },
    {
      name: 'productTitle',
      type: 'text',
      label: 'Ürün Başlığı',
    },
    {
      name: 'supplierGroupId',
      type: 'text',
      label: 'Tedarikçi Grup ID',
    },
    {
      name: 'supplierGroupName',
      type: 'text',
      label: 'Tedarikçi Grup Adı',
    },
    {
      name: 'sellerUserId',
      type: 'number',
      label: 'Satıcı Telegram ID',
    },
    {
      name: 'sellerUsername',
      type: 'text',
      label: 'Satıcı Kullanıcı Adı',
    },
    {
      name: 'telegramMessageId',
      type: 'number',
      label: 'Telegram Mesaj ID',
    },
    {
      name: 'wholesalePrice',
      type: 'number',
      label: 'Toptan Fiyat',
    },
    {
      name: 'websitePrice',
      type: 'number',
      label: 'Site Fiyatı',
    },
    {
      name: 'details',
      type: 'textarea',
      label: 'Detaylar',
      required: true,
    },
    {
      name: 'isReversible',
      type: 'checkbox',
      label: 'Geri Alınabilir mi?',
      defaultValue: true,
    },
    {
      name: 'reversedAt',
      type: 'date',
      label: 'Geri Alınma Zamanı',
    },
    {
      name: 'reversedBy',
      type: 'text',
      label: 'Geri Alan',
      admin: { description: 'frank veya sistem' },
    },
    {
      name: 'opportunityRef',
      type: 'relationship',
      label: 'Fırsat Kaydı',
      relationTo: 'wholesale-opportunities',
    },
  ],
}
