import type { CollectionConfig } from 'payload'

/**
 * SupplierCorrectionMemory — SupplierScout D-278
 *
 * When Frank corrects a wrong classification or action, the correction is stored
 * here so the bot can improve future decisions. Does NOT rewrite code —
 * corrections feed into the Gemini classification prompt as examples.
 */
export const SupplierCorrectionMemory: CollectionConfig = {
  slug: 'supplier-correction-memory',
  admin: {
    useAsTitle: 'correctionReason',
    group: 'SupplierScout / Hafıza',
    defaultColumns: ['originalClassification', 'correctedClassification', 'teacherId', 'createdAt'],
    description: "Frank'in SupplierScout'u düzelttiği kayıtlar",
  },
  fields: [
    {
      name: 'originalClassification',
      type: 'select',
      label: 'Orijinal Sınıflandırma',
      required: true,
      options: [
        { label: 'Yeni Ürün', value: 'new_product' },
        { label: 'Ürün Güncellemesi', value: 'product_update' },
        { label: 'Fiyat Güncellemesi', value: 'price_update' },
        { label: 'Beden Güncellemesi', value: 'size_update' },
        { label: 'Tükendi', value: 'sold_out' },
        { label: 'Kısmi Tükendi', value: 'partial_sold_out' },
        { label: 'Hâlâ Mevcut', value: 'still_available' },
        { label: 'Tekrar Paylaşım', value: 'duplicate_repost' },
        { label: 'Gürültü', value: 'conversation_noise' },
        { label: 'Admin Duyurusu', value: 'admin_announcement' },
        { label: 'Risk Uyarısı', value: 'risk_warning' },
      ],
    },
    {
      name: 'correctedClassification',
      type: 'select',
      label: 'Doğru Sınıflandırma',
      required: true,
      options: [
        { label: 'Yeni Ürün', value: 'new_product' },
        { label: 'Ürün Güncellemesi', value: 'product_update' },
        { label: 'Fiyat Güncellemesi', value: 'price_update' },
        { label: 'Beden Güncellemesi', value: 'size_update' },
        { label: 'Tükendi', value: 'sold_out' },
        { label: 'Kısmi Tükendi', value: 'partial_sold_out' },
        { label: 'Hâlâ Mevcut', value: 'still_available' },
        { label: 'Tekrar Paylaşım', value: 'duplicate_repost' },
        { label: 'Gürültü', value: 'conversation_noise' },
        { label: 'Admin Duyurusu', value: 'admin_announcement' },
        { label: 'Risk Uyarısı', value: 'risk_warning' },
      ],
    },
    {
      name: 'originalText',
      type: 'textarea',
      label: 'Orijinal Mesaj Metni',
      required: true,
    },
    {
      name: 'correctionReason',
      type: 'textarea',
      label: 'Düzeltme Gerekçesi',
      required: true,
      admin: { description: 'Frank neden düzeltti?' },
    },
    {
      name: 'appliedToFuture',
      type: 'checkbox',
      label: 'Gelecekte Uygulandı',
      defaultValue: true,
      admin: { description: 'Bu düzeltme Gemini promptuna örnek olarak eklendi mi?' },
    },
    {
      name: 'teacherId',
      type: 'text',
      label: 'Düzelten',
      defaultValue: 'frank',
    },
    {
      name: 'relatedOpportunity',
      type: 'relationship',
      label: 'İlgili Fırsat',
      relationTo: 'wholesale-opportunities',
    },
    {
      name: 'createdAt',
      type: 'date',
      label: 'Düzeltme Tarihi',
    },
  ],
}
