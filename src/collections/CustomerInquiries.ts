import type { CollectionConfig } from 'payload'

export const CustomerInquiries: CollectionConfig = {
  slug: 'customer-inquiries',
  admin: {
    useAsTitle: 'name',
    group: 'Müşteri',
    defaultColumns: ['name', 'phone', 'product', 'status', 'createdAt'],
    description: 'Müşteri talep ve mesajları',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Ad Soyad',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Telefon',
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
      label: 'Mesaj',
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      label: 'İlgili Ürün',
      admin: { position: 'sidebar' },
    },
    {
      name: 'size',
      type: 'text',
      label: 'İstenen Beden',
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Durum',
      defaultValue: 'new',
      // D-241: extended pipeline. `completed` is kept for backward compatibility
      // (legacy rows) and treated as equivalent to `closed_won` in the operator
      // surface. New writes should prefer the explicit closed_* values.
      // NOTE (Neon): adding values to this select requires manual DDL.
      // See feedback_push_true_drift.md — push:true silently skips the
      // ALTER TYPE ADD VALUE migration. Run on prod after deploy:
      //   ALTER TYPE enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'follow_up';
      //   ALTER TYPE enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'closed_won';
      //   ALTER TYPE enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'closed_lost';
      //   ALTER TYPE enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'spam';
      options: [
        { label: 'Yeni', value: 'new' },
        { label: 'Arandı', value: 'contacted' },
        { label: 'Takip', value: 'follow_up' },
        { label: 'Kazanıldı', value: 'closed_won' },
        { label: 'Kaybedildi', value: 'closed_lost' },
        { label: 'Spam', value: 'spam' },
        // legacy — alias for closed_won
        { label: 'Tamamlandı (legacy)', value: 'completed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      // D-241: free-form source tag — defaults 'website' for the existing
      // /api/inquiries POST (storefront form). Kept text not select so future
      // sources (whatsapp, instagram, manual_entry) need no migration.
      name: 'source',
      type: 'text',
      label: 'Kaynak',
      defaultValue: 'website',
      admin: { position: 'sidebar' },
    },
    // ── D-251: Source-detail / UTM + Referrer capture ──────────────────────
    // All fields are nullable — written only when truthfully available at
    // inquiry creation time. Never invent values.
    //
    // Neon DDL (push:true silently skips — run manually after deploy):
    //   ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS utm_source VARCHAR;
    //   ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS utm_medium VARCHAR;
    //   ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR;
    //   ALTER TABLE customer_inquiries ADD COLUMN IF NOT EXISTS referrer VARCHAR;
    {
      name: 'utmSource',
      type: 'text',
      label: 'UTM Kaynak',
      admin: {
        position: 'sidebar',
        description: 'utm_source param — google, instagram, facebook, vb. (otomatik)',
        readOnly: true,
      },
    },
    {
      name: 'utmMedium',
      type: 'text',
      label: 'UTM Medium',
      admin: {
        position: 'sidebar',
        description: 'utm_medium param — cpc, social, email, vb. (otomatik)',
        readOnly: true,
      },
    },
    {
      name: 'utmCampaign',
      type: 'text',
      label: 'UTM Kampanya',
      admin: {
        position: 'sidebar',
        description: 'utm_campaign param — kampanya adı (otomatik)',
        readOnly: true,
      },
    },
    {
      name: 'referrer',
      type: 'text',
      label: 'Referrer Domain',
      admin: {
        position: 'sidebar',
        description: 'Ziyaretçinin geldiği domain — instagram.com, google.com, vb. (otomatik)',
        readOnly: true,
      },
    },
    {
      name: 'lastContactedAt',
      type: 'date',
      label: 'Son İletişim',
      admin: { position: 'sidebar' },
    },
    {
      name: 'handledAt',
      type: 'date',
      label: 'Kapanış Zamanı',
      admin: {
        position: 'sidebar',
        description: 'closed_won / closed_lost / spam durumuna geçiş anı',
      },
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      label: 'Atanan',
      admin: { position: 'sidebar' },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notlar',
    },
  ],
}
