import type { CollectionConfig } from 'payload'

/**
 * SupplierSellerMemory — SupplierScout D-278
 *
 * Per-seller writing style, reliability observations, and Frank's manual notes.
 */
export const SupplierSellerMemory: CollectionConfig = {
  slug: 'supplier-seller-memory',
  admin: {
    useAsTitle: 'sellerDisplayName',
    group: 'SupplierScout / Hafıza',
    defaultColumns: ['sellerDisplayName', 'sellerTelegramId', 'reliabilityScore', 'updatedAt'],
    description: 'Satıcı başına yazım stili ve güvenilirlik gözlemleri',
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
      name: 'postingStyle',
      type: 'textarea',
      label: 'Gönderi Stili',
      admin: { description: 'Bu satıcının nasıl yazdığına dair gözlem' },
    },
    {
      name: 'reliabilityScore',
      type: 'number',
      label: 'Güvenilirlik (0–100)',
      defaultValue: 50,
    },
    {
      name: 'typicalCategories',
      type: 'json',
      label: 'Tipik Kategoriler',
    },
    {
      name: 'typicalPriceRange',
      type: 'json',
      label: 'Tipik Fiyat Aralığı',
      admin: { description: '{ min, max, currency }' },
    },
    {
      name: 'commonTerms',
      type: 'json',
      label: 'Kullandığı Sözler',
    },
    {
      name: 'flaggedBehaviors',
      type: 'json',
      label: 'Dikkat Edilecek Davranışlar',
    },
    {
      name: 'teacherNotes',
      type: 'textarea',
      label: 'Operatör Notu',
      admin: { description: '/seller komutuyla Frank tarafından eklendi' },
    },
    {
      name: 'isManual',
      type: 'checkbox',
      label: 'Manuel Güncellendi',
      defaultValue: false,
    },
    {
      name: 'updatedAt',
      type: 'date',
      label: 'Güncellenme',
    },
  ],
}
