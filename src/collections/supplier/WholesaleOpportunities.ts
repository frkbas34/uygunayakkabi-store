import type { CollectionConfig } from 'payload'

/**
 * WholesaleOpportunities — SupplierScout D-278
 *
 * Every message classified as actionable (new_product, price_update, etc.)
 * gets a WholesaleOpportunity record regardless of whether auto-create fires.
 * This is the full audit trail of what the bot saw and what it decided.
 */
export const WholesaleOpportunities: CollectionConfig = {
  slug: 'wholesale-opportunities',
  admin: {
    useAsTitle: 'productName',
    group: 'SupplierScout',
    defaultColumns: ['productName', 'status', 'confidence', 'supplierGroup', 'wholesalePrice', 'websitePrice'],
    description: 'SupplierScout tarafından tespit edilen tedarik fırsatları',
  },
  fields: [
    // ── Classification ───────────────────────────────────────────────────────
    {
      name: 'messageClass',
      type: 'select',
      label: 'Mesaj Sınıfı',
      required: true,
      options: [
        { label: '🆕 Yeni Ürün', value: 'new_product' },
        { label: '🔄 Ürün Güncellemesi', value: 'product_update' },
        { label: '💰 Fiyat Güncellemesi', value: 'price_update' },
        { label: '📏 Beden Güncellemesi', value: 'size_update' },
        { label: '❌ Tükendi', value: 'sold_out' },
        { label: '⚠️ Kısmi Tükendi', value: 'partial_sold_out' },
        { label: '✅ Hâlâ Mevcut', value: 'still_available' },
        { label: '🔁 Tekrar Paylaşım', value: 'duplicate_repost' },
        { label: '💬 Gürültü', value: 'conversation_noise' },
        { label: '📢 Admin Duyurusu', value: 'admin_announcement' },
        { label: '🚨 Risk Uyarısı', value: 'risk_warning' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: 'Durum',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: '⏳ Bekliyor', value: 'pending' },
        { label: '✅ Ürün Oluşturuldu', value: 'product_created' },
        { label: '⏭️ Atlandı (Düşük Güven)', value: 'skipped_low_confidence' },
        { label: '⏭️ Atlandı (Duplicate)', value: 'skipped_duplicate' },
        { label: '⏭️ Atlandı (Blok)', value: 'skipped_blocked' },
        { label: '📋 İnceleme Gerekiyor', value: 'needs_review' },
        { label: '❌ Hata', value: 'error' },
        { label: '🔇 Tükendi Uygulandı', value: 'soldout_applied' },
        { label: '⚠️ Tükendi Uyarıldı', value: 'soldout_warned' },
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
      name: 'confidenceScore',
      type: 'number',
      label: 'Güven Skoru (0–100)',
      min: 0,
      max: 100,
    },

    // ── Product Info ─────────────────────────────────────────────────────────
    {
      name: 'productName',
      type: 'text',
      label: 'Ürün Adı',
    },
    {
      name: 'brand',
      type: 'text',
      label: 'Marka',
    },
    {
      name: 'model',
      type: 'text',
      label: 'Model',
    },
    {
      name: 'color',
      type: 'text',
      label: 'Renk',
    },
    {
      name: 'category',
      type: 'text',
      label: 'Kategori',
    },
    {
      name: 'sizeMin',
      type: 'number',
      label: 'Min Beden',
    },
    {
      name: 'sizeMax',
      type: 'number',
      label: 'Max Beden',
    },
    {
      name: 'availableSizes',
      type: 'json',
      label: 'Mevcut Bedenler (JSON)',
    },

    // ── Pricing ──────────────────────────────────────────────────────────────
    {
      name: 'wholesalePrice',
      type: 'number',
      label: 'Toptan Fiyat',
    },
    {
      name: 'wholesaleCurrency',
      type: 'select',
      label: 'Para Birimi',
      defaultValue: 'USD',
      options: [
        { label: 'USD', value: 'USD' },
        { label: 'TRY', value: 'TRY' },
        { label: 'EUR', value: 'EUR' },
      ],
    },
    {
      name: 'marginApplied',
      type: 'number',
      label: 'Uygulanan Marj (USD)',
    },
    {
      name: 'websitePrice',
      type: 'number',
      label: 'Site Fiyatı (TRY)',
    },

    // ── Source ───────────────────────────────────────────────────────────────
    {
      name: 'supplierGroup',
      type: 'relationship',
      label: 'Tedarikçi Grup',
      relationTo: 'supplier-groups',
    },
    {
      name: 'sellerTelegramId',
      type: 'number',
      label: 'Satıcı Telegram ID',
    },
    {
      name: 'sellerUsername',
      type: 'text',
      label: 'Satıcı Kullanıcı Adı',
    },
    {
      name: 'sellerDisplayName',
      type: 'text',
      label: 'Satıcı Görünen Ad',
    },
    {
      name: 'telegramMessageId',
      type: 'number',
      label: 'Telegram Mesaj ID',
    },
    {
      name: 'telegramMediaGroupId',
      type: 'text',
      label: 'Telegram Media Group ID',
    },
    {
      name: 'hasPhoto',
      type: 'checkbox',
      label: 'Fotoğraf Var mı?',
      defaultValue: false,
    },
    {
      name: 'telegramFileIds',
      type: 'json',
      label: 'Telegram File ID Listesi',
    },

    // ── Result ───────────────────────────────────────────────────────────────
    {
      name: 'createdProduct',
      type: 'relationship',
      label: 'Oluşturulan Ürün',
      relationTo: 'products',
    },
    {
      name: 'skipReason',
      type: 'text',
      label: 'Atlama Nedeni',
    },
    {
      name: 'missingFields',
      type: 'json',
      label: 'Eksik Alanlar',
    },
    {
      name: 'classificationReasoning',
      type: 'textarea',
      label: 'Sınıflandırma Gerekçesi (Gemini)',
    },
    {
      name: 'rawText',
      type: 'textarea',
      label: 'Ham Mesaj Metni',
    },
    {
      name: 'processedAt',
      type: 'date',
      label: 'İşlenme Zamanı',
    },

    // ── Ops Group Forwarding (Phase 3B) ─────────────────────────────────────
    // Tracks whether this WO has been forwarded to the main Mentix/Uygunops group.
    // Used for deduplication — /forward_wo refuses if opsForwardStatus === 'forwarded'.
    // forwardedToOpsMessageId stored for potential future card-edit on status change.
    {
      name: 'opsForwardStatus',
      type: 'select',
      label: 'Ops İletim Durumu',
      options: [
        { label: '📤 İletildi', value: 'forwarded' },
        { label: '🙈 Görmezden Gelindi', value: 'ignored' },
        { label: '⚠️ Riskli İşaretlendi', value: 'risky' },
      ],
      admin: {
        description: 'Ops grubuna iletim durumu. Null = henüz iletilmedi.',
      },
    },
    {
      name: 'forwardedToOpsAt',
      type: 'date',
      label: 'Ops Grubuna İletilme Zamanı',
      admin: { readOnly: true },
    },
    {
      name: 'forwardedToOpsMessageId',
      type: 'number',
      label: 'Ops Grubu Mesaj ID',
      admin: {
        readOnly: true,
        description: "İletilen kartın Telegram message_id'si — gelecekte kart düzenleme için saklanır.",
      },
    },
  ],
}
