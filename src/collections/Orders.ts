import type { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    group: 'Sipariş',
    defaultColumns: ['orderNumber', 'customerName', 'product', 'size', 'totalPrice', 'status', 'createdAt'],
    description: 'Gelen siparişler ve müşteri talepleri',
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.orderNumber) {
          data.orderNumber = `ORD-${Date.now().toString().slice(-6)}`
        }
        return data
      },
    ],
    afterChange: [
      // ── D-247: Fire-and-forget new-order Telegram alert ──────────────────
      // Universal — fires for every create regardless of source — EXCEPT
      // when source==='telegram' (operator already saw the /convert response
      // message from D-244, double-notifying would be noise).
      // Stock decrement lives in the next entry — separate concern.
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc
        if (req?.context?.isDispatchUpdate) return doc
        const source = (doc as any).source
        if (source === 'telegram') return doc
        // Fire-and-forget — never block order persistence.
        void (async () => {
          try {
            const { sendNewOrderAlert } = await import('@/lib/orderDesk')
            await sendNewOrderAlert(req.payload, doc.id)
          } catch (e) {
            console.error('[Orders.afterChange D-247] alert dispatch failed (non-blocking):', e instanceof Error ? e.message : e)
          }
        })()
        return doc
      },
      // Phase 10: Decrement stock + trigger stock reaction for non-Shopier orders.
      // Shopier orders already handle stock in their webhook — this covers website/manual/phone orders.
      async ({ doc, operation, req }) => {
        // Only on create (new order), not on status updates
        if (operation !== 'create') return doc
        // Skip if this is already handled by dispatch (e.g. Shopier webhook creates order + decrements stock separately)
        if (req?.context?.isDispatchUpdate) return doc
        // Skip Shopier orders — their stock is handled in the webhook's decrementStockForOrder
        if ((doc as any).source === 'shopier') return doc

        const productRef = (doc as any).product
        const productId = typeof productRef === 'object' ? productRef?.id : productRef
        const qty = ((doc as any).quantity as number) ?? 1
        const size = ((doc as any).size as string) ?? ''

        if (!productId || qty <= 0) return doc

        try {
          const payload = req.payload

          // Decrement product-level stockQuantity
          const product = await payload.findByID({ collection: 'products', id: productId, depth: 0 })
          if (!product) return doc

          const currentStock = (product.stockQuantity as number) ?? 0
          const newStock = Math.max(0, currentStock - qty)

          await payload.update({
            collection: 'products',
            id: productId,
            data: { stockQuantity: newStock },
            context: { isDispatchUpdate: true },
          })

          // If size is specified, also decrement variant stock
          if (size) {
            const { docs: variants } = await payload.find({
              collection: 'variants',
              where: {
                and: [
                  { product: { equals: productId } },
                  { size: { equals: size } },
                ],
              },
              limit: 1,
            })
            if (variants.length > 0) {
              const variant = variants[0]
              const vStock = (variant.stock as number) ?? 0
              await payload.update({
                collection: 'variants',
                id: variant.id,
                data: { stock: Math.max(0, vStock - qty) },
                context: { isDispatchUpdate: true },
              })
            }
          }

          // Create InventoryLog
          await payload.create({
            collection: 'inventory-logs',
            data: {
              sku: (product.sku as string) ?? `product-${productId}`,
              size: size || 'N/A',
              change: -qty,
              reason: `Sipariş: ${(doc as any).orderNumber ?? doc.id} (kaynak: ${(doc as any).source ?? 'unknown'})`,
              source: (doc as any).source === 'telegram' ? 'telegram' : 'system',
              timestamp: new Date().toISOString(),
            },
          })

          // Trigger central stock reaction
          const { reactToStockChange } = await import('@/lib/stockReaction')
          const result = await reactToStockChange(payload, productId, 'system', req)
          console.log(
            `[Orders.afterChange] stock decremented — order=${(doc as any).orderNumber} product=${productId} ` +
              `qty=-${qty} events=[${result.eventsEmitted.join(',')}]`,
          )
        } catch (err) {
          console.error(
            `[Orders.afterChange] stock decrement failed (non-blocking):`,
            err instanceof Error ? err.message : String(err),
          )
        }

        return doc
      },
    ],
  },
  fields: [
    // ── Sipariş Numarası ──────────────────────────────────────
    {
      name: 'orderNumber',
      type: 'text',
      label: 'Sipariş No',
      unique: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Otomatik oluşturulur',
      },
    },
    // ── Müşteri Bilgileri ─────────────────────────────────────
    {
      name: 'customerName',
      type: 'text',
      label: 'Ad Soyad',
      required: true,
    },
    {
      name: 'customerPhone',
      type: 'text',
      label: 'Telefon',
      required: true,
    },
    {
      name: 'customerAddress',
      type: 'textarea',
      label: 'Teslimat Adresi',
    },
    // ── Ürün Bilgileri ────────────────────────────────────────
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      label: 'Ürün',
      admin: { position: 'sidebar' },
    },
    {
      name: 'size',
      type: 'text',
      label: 'Beden',
      admin: {
        position: 'sidebar',
        description: '36–49 arasında',
      },
    },
    {
      name: 'quantity',
      type: 'number',
      label: 'Adet',
      defaultValue: 1,
      admin: { position: 'sidebar' },
    },
    {
      name: 'totalPrice',
      type: 'number',
      label: 'Toplam Tutar (₺)',
      admin: { position: 'sidebar' },
    },
    // ── Sipariş Durumu ────────────────────────────────────────
    {
      name: 'status',
      type: 'select',
      label: 'Durum',
      defaultValue: 'new',
      options: [
        { label: '🆕 Yeni', value: 'new' },
        { label: '✅ Onaylandı', value: 'confirmed' },
        { label: '📦 Kargoya Verildi', value: 'shipped' },
        { label: '🏠 Teslim Edildi', value: 'delivered' },
        { label: '❌ İptal', value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
    // ── Kaynak ────────────────────────────────────────────────
    {
      name: 'source',
      type: 'select',
      label: 'Kaynak',
      defaultValue: 'website',
      options: [
        { label: '🌐 Web Sitesi', value: 'website' },
        { label: '📲 Telegram', value: 'telegram' },
        { label: '📞 Telefon', value: 'phone' },
        { label: '📸 Instagram', value: 'instagram' },
        { label: '🛍️ Shopier', value: 'shopier' },
      ],
      admin: { position: 'sidebar' },
    },
    // ── D-244: Lead Provenance ────────────────────────────────
    // Linked when this order was created via /convert <lead-id> from
    // the Lead Desk (D-241). Optional — leaves direct-website orders
    // untouched. Neon DDL required (push:true silently skips, see
    // feedback_push_true_drift.md):
    //   ALTER TABLE orders ADD COLUMN IF NOT EXISTS related_inquiry_id
    //     integer REFERENCES customer_inquiries(id) ON DELETE SET NULL;
    {
      name: 'relatedInquiry',
      type: 'relationship',
      relationTo: 'customer-inquiries',
      label: 'İlgili Lead',
      admin: {
        position: 'sidebar',
        description: 'Lead Desk üzerinden /convert ile oluşturulan siparişler için',
      },
    },
    // ── Shopier Entegrasyonu ──────────────────────────────────
    {
      name: 'shopierOrderId',
      type: 'text',
      label: 'Shopier Sipariş ID',
      unique: false,
      admin: {
        position: 'sidebar',
        description: 'Shopier\'den gelen sipariş IDsi — otomatik doldurulur',
        readOnly: true,
        condition: (data) => data?.source === 'shopier',
      },
    },
    // ── Ödeme ─────────────────────────────────────────────────
    {
      name: 'paymentMethod',
      type: 'select',
      label: 'Ödeme Yöntemi',
      options: [
        { label: '💳 Kapıda Kredi Kartı', value: 'card_on_delivery' },
        { label: '💵 Kapıda Nakit', value: 'cash_on_delivery' },
        { label: '🏦 Havale/EFT', value: 'bank_transfer' },
        { label: '💳 Online Ödeme', value: 'online' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'isPaid',
      type: 'checkbox',
      label: 'Ödeme Alındı',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    // ── Notlar ────────────────────────────────────────────────
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notlar',
      admin: { description: 'İç notlar — müşteri tarafından görülmez' },
    },
    // ── Kargo ─────────────────────────────────────────────────
    {
      name: 'shippingCompany',
      type: 'select',
      label: 'Kargo Firması',
      options: [
        { label: 'Yurtiçi Kargo', value: 'yurtici' },
        { label: 'Aras Kargo', value: 'aras' },
        { label: 'MNG Kargo', value: 'mng' },
        { label: 'PTT Kargo', value: 'ptt' },
        { label: 'Sürat Kargo', value: 'surat' },
        { label: 'Trendyol Express', value: 'trendyol' },
        { label: 'Diğer', value: 'other' },
      ],
    },
    {
      name: 'trackingNumber',
      type: 'text',
      label: 'Kargo Takip No',
      admin: { description: 'Kargoya verildikten sonra girin' },
    },
    {
      name: 'shippedAt',
      type: 'date',
      label: 'Kargo Tarihi',
    },
    {
      name: 'deliveredAt',
      type: 'date',
      label: 'Teslim Tarihi',
    },
  ],
}
