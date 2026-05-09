import type { CollectionConfig } from 'payload'

/**
 * SupplierGroups — SupplierScout D-278
 *
 * Each record represents one wholesaler Telegram group that SupplierScout monitors.
 * The bot must be added as admin (or privacy mode disabled) to receive all messages.
 */
export const SupplierGroups: CollectionConfig = {
  slug: 'supplier-groups',
  admin: {
    useAsTitle: 'groupName',
    group: 'SupplierScout',
    defaultColumns: ['groupName', 'telegramGroupId', 'isActive', 'trustScore', 'marginUSD'],
    description: 'SupplierScout tarafından izlenen tedarikçi Telegram grupları',
  },
  fields: [
    {
      name: 'groupName',
      type: 'text',
      label: 'Grup Adı',
      required: true,
    },
    {
      name: 'telegramGroupId',
      type: 'number',
      label: 'Telegram Grup ID',
      required: true,
      admin: {
        description: 'Telegram chat_id (negatif sayı, örn: -1001234567890)',
      },
    },
    {
      name: 'groupUsername',
      type: 'text',
      label: 'Grup Kullanıcı Adı',
      admin: { description: '@handle (varsa)' },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Aktif İzleniyor',
      defaultValue: true,
      admin: { description: 'Kapatılırsa bu gruptaki mesajlar işlenmez' },
    },
    {
      name: 'isBlocked',
      type: 'checkbox',
      label: 'Bloklandı',
      defaultValue: false,
      admin: { description: 'Bloklanmış gruptan ürün oluşturulmaz; sadece loglama yapılır' },
    },
    {
      name: 'autoCreateEnabled',
      type: 'checkbox',
      label: 'Otomatik Ürün Oluşturma',
      defaultValue: true,
      admin: { description: 'Bu grup için otonom ürün oluşturmayı etkinleştirir' },
    },
    {
      name: 'currency',
      type: 'select',
      label: 'Fiyat Para Birimi',
      defaultValue: 'USD',
      options: [
        { label: 'USD ($)', value: 'USD' },
        { label: 'TRY (₺)', value: 'TRY' },
        { label: 'EUR (€)', value: 'EUR' },
      ],
    },
    {
      name: 'marginUSD',
      type: 'number',
      label: 'Kar Marjı (USD)',
      defaultValue: 15,
      admin: {
        description: 'Toptan fiyatına eklenecek tutar (USD). Örn: 15 → $50 toptan = $65 site fiyatı',
      },
    },
    {
      name: 'trustScore',
      type: 'number',
      label: 'Güven Skoru (0–100)',
      defaultValue: 70,
      min: 0,
      max: 100,
      admin: { description: 'Bu grubun genel güvenilirlik skoru' },
    },
    {
      name: 'defaultCategory',
      type: 'select',
      label: 'Varsayılan Kategori',
      options: [
        { label: 'Günlük', value: 'Günlük' },
        { label: 'Spor', value: 'Spor' },
        { label: 'Klasik', value: 'Klasik' },
        { label: 'Bot', value: 'Bot' },
        { label: 'Sandalet', value: 'Sandalet' },
        { label: 'Cüzdan', value: 'Cüzdan' },
      ],
      admin: { description: 'Kategori tespit edilemezse kullanılır' },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notlar',
      admin: { description: 'Bu grup hakkında operatör notları' },
    },
    {
      name: 'addedAt',
      type: 'date',
      label: 'Eklenme Tarihi',
      admin: { readOnly: true },
    },
    {
      name: 'lastMessageAt',
      type: 'date',
      label: 'Son Mesaj Zamanı',
      admin: { readOnly: true },
    },
    {
      name: 'totalProductsCreated',
      type: 'number',
      label: 'Oluşturulan Ürün Sayısı',
      defaultValue: 0,
      admin: { readOnly: true },
    },
  ],
}
