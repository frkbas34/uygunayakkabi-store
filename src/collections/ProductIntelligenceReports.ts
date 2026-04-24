import type { CollectionConfig } from 'payload'

/**
 * ProductIntelligenceReports — D-220
 *
 * Stores Product Intelligence (PI) Bot runs. Each doc is one analysis of
 * one product: vision analysis, optional reverse image search, and a
 * generated SEO + GEO content pack awaiting operator approval.
 *
 * Design notes:
 *
 * - JSON-typed fields for the nested structures (detectedAttributes,
 *   referenceProducts, seoPack, geoPack, imagesUsed, rawProviderData,
 *   telegram) on purpose. This keeps the migration surface tiny — a single
 *   new table with mostly text/json columns — which matters because
 *   Payload's `push: true` has been observed to silently skip new columns
 *   on Neon (see feedback memory `feedback_push_true_drift`). Fewer
 *   columns = smaller chance of drift. The field shapes are documented in
 *   `src/lib/productIntelligence/types.ts`.
 *
 * - Status transitions: draft → ready → approved → sent_to_geo.
 *   Any step can go to `failed` or `rejected`.
 *
 * - This collection is the single source of truth for PI data until an
 *   operator explicitly approves a report. Only on approval does the
 *   handoff merge selected fields into the product's own `content` group,
 *   preserving any non-empty existing values (never blind overwrite).
 */
export const ProductIntelligenceReports: CollectionConfig = {
  slug: 'product-intelligence-reports',
  admin: {
    useAsTitle: 'id',
    group: 'Sistem',
    defaultColumns: ['id', 'product', 'status', 'matchType', 'matchConfidence', 'createdAt'],
    description: 'Ürün Zeka raporları — analiz + SEO/GEO içerik paketi, operatör onayı bekler',
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      hasMany: false,
      label: 'Ürün',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      label: 'Durum',
      options: [
        { label: '📝 Taslak', value: 'draft' },
        { label: '✅ Hazır', value: 'ready' },
        { label: '👍 Onaylandı', value: 'approved' },
        { label: '📤 GeoBot\'a Gönderildi', value: 'sent_to_geo' },
        { label: '🚫 Reddedildi', value: 'rejected' },
        { label: '❌ Başarısız', value: 'failed' },
      ],
    },
    {
      name: 'triggerSource',
      type: 'select',
      defaultValue: 'telegram',
      label: 'Tetikleyici',
      options: [
        { label: 'Telegram', value: 'telegram' },
        { label: 'Manuel', value: 'manual' },
        { label: 'Ürün Sayfası', value: 'product_page' },
        { label: 'GeoBot Otomatik', value: 'geo_auto' },
      ],
    },
    {
      name: 'matchType',
      type: 'select',
      label: 'Eşleşme Tipi',
      options: [
        { label: 'Birebir eşleşme', value: 'exact_match' },
        { label: 'Yüksek benzerlik', value: 'high_similarity' },
        { label: 'Benzer stil', value: 'similar_style' },
        { label: 'Düşük güven', value: 'low_confidence' },
        { label: 'Sadece görsel (dış arama yok)', value: 'visual_only_no_external_search' },
      ],
    },
    {
      name: 'matchConfidence',
      type: 'number',
      label: 'Eşleşme Güveni (%)',
    },
    {
      name: 'exactProductFound',
      type: 'checkbox',
      defaultValue: false,
      label: 'Birebir Ürün Bulundu',
    },
    // ── JSON-typed structured fields ────────────────────────────────────────
    {
      name: 'detectedAttributes',
      type: 'json',
      label: 'Tespit Edilen Özellikler',
      admin: { description: 'productType, color, materialGuess, style, gender, useCases[], category, visibleBrand, visualNotes' },
    },
    {
      name: 'referenceProducts',
      type: 'json',
      label: 'Referans Ürünler',
      admin: { description: 'Sadece referans — kopya/publish için değil. [{title, url, source, price, imageUrl, snippet, similarity, classification}]' },
    },
    {
      name: 'seoPack',
      type: 'json',
      label: 'SEO Paketi',
      admin: { description: '{seoTitle, metaDescription, productDescription, shortDescription, tags[], keywords[], faq[]}' },
    },
    {
      name: 'geoPack',
      type: 'json',
      label: 'GEO Paketi',
      admin: { description: '{aiSearchSummary, buyerIntentKeywords[], comparisonAngles[], productComparisonText, blogDraftIdea, publishNotes}' },
    },
    {
      name: 'riskWarnings',
      type: 'json',
      label: 'Risk Uyarıları',
      admin: { description: 'string[] — içerik, telif, sağlık/güvenlik vs. uyarıları' },
    },
    {
      name: 'imagesUsed',
      type: 'json',
      label: 'Kullanılan Görseller',
      admin: { description: '{primaryImageSource, supportingImageSources[], imageConfidenceNotes, detectedConflicts}' },
    },
    {
      name: 'rawProviderData',
      type: 'json',
      label: 'Ham Sağlayıcı Verisi',
      admin: {
        readOnly: true,
        description: 'Vision + reverse search ham çıktıları (debug)',
      },
    },
    {
      name: 'telegram',
      type: 'json',
      label: 'Telegram Bağlam',
      admin: { description: '{chatId, messageId, operatorUserId}' },
    },
    {
      name: 'errorMessage',
      type: 'textarea',
      label: 'Hata Mesajı',
      admin: { readOnly: true },
    },
    {
      name: 'approvedAt',
      type: 'date',
      label: 'Onay Zamanı',
      admin: { readOnly: true },
    },
    {
      name: 'sentToGeoAt',
      type: 'date',
      label: 'GeoBot\'a Gönderim Zamanı',
      admin: { readOnly: true },
    },
    {
      name: 'rejectedAt',
      type: 'date',
      label: 'Red Zamanı',
      admin: { readOnly: true },
    },
  ],
}
