import type { CollectionConfig } from 'payload'

/**
 * SupplierGroupMemory — SupplierScout D-278
 *
 * Group-specific behavioural observations.
 * e.g. "This group uses $XX/çift notation", "Posts arrive in batches at 9am"
 */
export const SupplierGroupMemory: CollectionConfig = {
  slug: 'supplier-group-memory',
  admin: {
    useAsTitle: 'observation',
    group: 'SupplierScout / Hafıza',
    defaultColumns: ['supplierGroup', 'observationType', 'confidence', 'updatedAt'],
    description: 'Grup başına gözlem ve öğrenme kayıtları',
  },
  fields: [
    {
      name: 'supplierGroup',
      type: 'relationship',
      label: 'Tedarikçi Grup',
      relationTo: 'supplier-groups',
      required: true,
    },
    {
      name: 'observationType',
      type: 'select',
      label: 'Gözlem Tipi',
      options: [
        { label: '📏 Format Paterni', value: 'format_pattern' },
        { label: '💰 Fiyatlandırma Stili', value: 'pricing_style' },
        { label: '🕐 Zaman Paterni', value: 'timing_pattern' },
        { label: '📦 Ürün Türü Kalıbı', value: 'product_type_pattern' },
        { label: '🗣️ Dil Kalıbı', value: 'language_pattern' },
        { label: '⚠️ Risk Sinyali', value: 'risk_signal' },
        { label: '📝 Genel Not', value: 'general_note' },
      ],
    },
    {
      name: 'observation',
      type: 'textarea',
      label: 'Gözlem',
      required: true,
    },
    {
      name: 'confidence',
      type: 'number',
      label: 'Güven (0–100)',
      defaultValue: 60,
      min: 0,
      max: 100,
    },
    {
      name: 'exampleMessages',
      type: 'json',
      label: 'Örnek Mesajlar',
    },
    {
      name: 'isManual',
      type: 'checkbox',
      label: 'Manuel Eklendi',
      defaultValue: false,
      admin: { description: '/group_logic komutuyla Frank tarafından eklendiyse' },
    },
    {
      name: 'updatedAt',
      type: 'date',
      label: 'Güncellenme',
    },
  ],
}
