import type { CollectionConfig } from 'payload'

/**
 * SupplierLanguageMemory — SupplierScout D-278
 *
 * Turkish supplier slang and shorthand mapping.
 * Teachable via /teach command:
 *   /teach RC = Rain Cloud for New Balance products
 *
 * Built-in seed terms: seri, tam seri, numara, kalıp, adet, koli,
 * çıkış, güncel, bitti, tükendi, kalmadı, kapandı, rezerve,
 * "sadece X kaldı", devam, aynısı
 */
export const SupplierLanguageMemory: CollectionConfig = {
  slug: 'supplier-language-memory',
  admin: {
    useAsTitle: 'term',
    group: 'SupplierScout / Hafıza',
    defaultColumns: ['term', 'meaning', 'context', 'confidence', 'isManual'],
    description: 'Türkçe tedarikçi jargonu ve kısaltma sözlüğü',
  },
  fields: [
    {
      name: 'term',
      type: 'text',
      label: 'Terim / Kısaltma',
      required: true,
      admin: { description: 'Örn: "RC", "seri", "tam seri", "kalmadı"' },
    },
    {
      name: 'meaning',
      type: 'text',
      label: 'Anlamı',
      required: true,
      admin: { description: 'Örn: "Rain Cloud rengi (New Balance)" veya "tam numara serisi (36-45)"' },
    },
    {
      name: 'context',
      type: 'select',
      label: 'Bağlam',
      defaultValue: 'general',
      options: [
        { label: 'Ürün', value: 'product' },
        { label: 'Tükendi', value: 'soldout' },
        { label: 'Güncelleme', value: 'update' },
        { label: 'Gürültü', value: 'noise' },
        { label: 'Beden', value: 'size' },
        { label: 'Fiyat', value: 'price' },
        { label: 'Genel', value: 'general' },
      ],
    },
    {
      name: 'supplierScope',
      type: 'text',
      label: 'Tedarikçi Kapsamı',
      admin: { description: 'Sadece belirli bir marka/gruba özgüyse belirt. Örn: "New Balance"' },
    },
    {
      name: 'examples',
      type: 'json',
      label: 'Örnek Cümleler',
    },
    {
      name: 'confidence',
      type: 'number',
      label: 'Güven (0–100)',
      defaultValue: 70,
      min: 0,
      max: 100,
    },
    {
      name: 'isManual',
      type: 'checkbox',
      label: 'Manuel Öğretildi',
      defaultValue: false,
      admin: { description: '/teach komutuyla Frank tarafından eklendiyse true' },
    },
    {
      name: 'teacherId',
      type: 'text',
      label: 'Öğreten',
      admin: { description: '"frank" veya "system"' },
    },
    {
      name: 'usageCount',
      type: 'number',
      label: 'Kullanım Sayısı',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'createdAt',
      type: 'date',
      label: 'Eklenme Tarihi',
    },
    {
      name: 'updatedAt',
      type: 'date',
      label: 'Güncellenme',
    },
  ],
}
