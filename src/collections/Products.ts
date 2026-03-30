import type { CollectionConfig } from 'payload'

// Turkish slug generator
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'title',
    group: 'Mağaza',
    defaultColumns: ['title', 'source', 'status', 'price', 'brand'],
    description: 'Mağazadaki tüm ürünler (ayakkabı, cüzdan, çanta, aksesuar)',
  },
  hooks: {
    beforeChange: [
      // ── Publish Guard ─────────────────────────────────────────────────────
      // Prevents incomplete automation-created products from going live.
      // Only fires when transitioning an existing product to status: 'active'.
      // Does NOT block automation draft creation (operation === 'create' is exempt).
      async ({ data, originalDoc, operation }) => {
        // Only guard on status transitions, not on initial create
        if (operation === 'update' && data.status === 'active') {
          const wasAlreadyActive = originalDoc?.status === 'active'
          if (!wasAlreadyActive) {
            // Transitioning draft/soldout → active
            const price = data.price ?? originalDoc?.price
            if (!price || Number(price) <= 0) {
              throw new Error(
                '⚠️ Yayınlamak için geçerli bir fiyat girilmesi zorunludur. Lütfen fiyatı 0\'dan büyük bir değere ayarlayın.',
              )
            }
          }
        }
        return data
      },
    ],
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        // Auto-generate SKU if empty (must run BEFORE slug so slug can use it)
        if (data.title && !data.sku) {
          const prefix = data.title.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')
          const isAutomation = data.source === 'n8n' || data.source === 'telegram'
          const msgId = (data.automationMeta as Record<string, string> | undefined)?.telegramMessageId
          // Automation SKU: TG-{PREFIX3}-{msgId} — traceable back to the Telegram message
          // Admin/manual SKU: {PREFIX3}-{timestamp36}
          if (isAutomation && msgId) {
            data.sku = `TG-${prefix}-${msgId}`
          } else {
            data.sku = `${prefix}-${Date.now().toString(36).toUpperCase()}`
          }
        }
        // Auto-generate slug from title + SKU suffix (ensures uniqueness)
        if (data.title) {
          const baseSlug = toSlug(data.title)
          const skuSuffix = data.sku
            ? '-' + data.sku.toLowerCase().replace(/[^a-z0-9-]/g, '')
            : '-' + Date.now().toString(36)
          data.slug = baseSlug + skuSuffix
        }
        return data
      },
    ],
    beforeDelete: [
      async ({ req, id }) => {
        // Clean up: nullify variant references before product deletion
        // This prevents foreign key constraint errors in PostgreSQL
        try {
          const variants = await req.payload.find({
            collection: 'variants',
            where: { product: { equals: id } },
            limit: 200,
          })
          for (const v of variants.docs) {
            await req.payload.update({
              collection: 'variants',
              id: v.id,
              data: { product: null as any },
            })
          }
          // Also clear media reverse references
          const media = await req.payload.find({
            collection: 'media',
            where: { product: { equals: id } },
            limit: 200,
          })
          for (const m of media.docs) {
            await req.payload.update({
              collection: 'media',
              id: m.id,
              data: { product: null as any },
            })
          }
        } catch (e) {
          // Non-critical — log and continue with delete
          console.error('[Products] beforeDelete cleanup failed:', e)
        }
      },
    ],
    // ── Steps 13 + 14: Channel Dispatch ────────────────────────────────────────
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        // Guard: prevent re-trigger when this hook updates sourceMeta after dispatch
        // Standard Payload pattern — set req.context.isDispatchUpdate = true before
        // calling payload.update() inside this hook to break the cycle.
        if ((req.context as Record<string, unknown> | undefined)?.isDispatchUpdate) return doc

        // Only trigger on update operations — not on initial create
        if (operation !== 'update') return doc

        const wasActive  = previousDoc?.status === 'active'
        const isNowActive = doc.status === 'active'

        // Step 14: forceRedispatch — admin-triggered manual re-dispatch
        // Only fires for already-active products (safe: won't re-activate a draft)
        const sourceMeta = (doc.sourceMeta as Record<string, unknown> | undefined) ?? {}
        const forceRedispatch = sourceMeta.forceRedispatch === true

        // Determine dispatch trigger reason
        const isStatusTransition = !wasActive && isNowActive
        const isForceRedispatch  = forceRedispatch && isNowActive

        // No trigger conditions met — skip
        if (!isStatusTransition && !isForceRedispatch) return doc

        const triggerReason = isForceRedispatch
          ? `manual-redispatch product=${doc.id}`
          : `status-transition:draft→active product=${doc.id}`

        // Dynamic imports to avoid circular dependency issues at module load time
        // and to keep the module graph clean for Payload's build system
        const { fetchAutomationSettings } = await import('@/lib/automationDecision')
        const { dispatchProductToChannels } = await import('@/lib/channelDispatch')

        try {
          const settings = await fetchAutomationSettings(req.payload)

          // Inject Facebook Page ID from env var into the settings snapshot.
          // The INSTAGRAM_PAGE_ID env var holds the numeric Facebook Page ID
          // (61576525131424) and is already set in Vercel production.
          // Storing it in AutomationSettings DB would require a Neon column
          // migration (D-077 risk), so we inject it at the call site instead.
          if (settings?.instagramTokens && process.env.INSTAGRAM_PAGE_ID) {
            settings.instagramTokens.facebookPageId = process.env.INSTAGRAM_PAGE_ID
          }

          const { results, dispatchedChannels } = await dispatchProductToChannels(
            doc as Record<string, unknown>,
            settings,
            triggerReason,
          )

          // ── Step 20: Determine if Shopier sync should be queued ─────────────
          // channelDispatch returns eligible=true + skippedReason='queued-via-jobs-queue'
          // for Shopier when SHOPIER_PAT is set. We queue the job here, after the
          // main dispatch, so it runs non-blocking outside this request lifecycle.
          const shopierDispatchResult = results.find((r) => r.channel === 'shopier')
          const shouldQueueShopier =
            shopierDispatchResult?.eligible === true &&
            shopierDispatchResult?.skippedReason === 'queued-via-jobs-queue' &&
            Boolean(process.env.SHOPIER_PAT)

          // Write dispatch results + reset forceRedispatch flag.
          // Set context flag BEFORE calling payload.update() to prevent
          // this afterChange hook from re-triggering on the sourceMeta write.
          if (!req.context) req.context = {}
          ;(req.context as Record<string, unknown>).isDispatchUpdate = true

          // Build the sourceMeta update — always write (even if results is empty)
          // to ensure forceRedispatch is always reset after this hook fires.
          // If Shopier is being queued, set shopierSyncStatus = 'queued' immediately
          // so the admin UI shows the pending state before the job runs.
          await req.payload.update({
            collection: 'products',
            id: doc.id,
            data: {
              sourceMeta: {
                ...sourceMeta,
                dispatchedChannels: results.length > 0
                  ? JSON.stringify(dispatchedChannels)
                  : (sourceMeta.dispatchedChannels as string | undefined) ?? '[]',
                lastDispatchedAt: new Date().toISOString(),
                dispatchNotes: results.length > 0
                  ? JSON.stringify(
                      results.map((r) => ({
                        channel:           r.channel,
                        eligible:          r.eligible,
                        dispatched:        r.dispatched,
                        webhookConfigured: r.webhookConfigured,
                        ...(r.skippedReason  !== undefined ? { skippedReason:  r.skippedReason  } : {}),
                        ...(r.error          !== undefined ? { error:          r.error          } : {}),
                        ...(r.responseStatus !== undefined ? { responseStatus: r.responseStatus } : {}),
                        // Step 16: capture channel-specific publish result (e.g. Instagram post ID)
                        ...(r.publishResult  !== undefined ? { publishResult:  r.publishResult  } : {}),
                        timestamp: r.timestamp,
                      })),
                    )
                  : (sourceMeta.dispatchNotes as string | undefined) ?? '[]',
                // Step 14: always auto-reset forceRedispatch flag after handling
                forceRedispatch: false,
                // Step 20: set Shopier status to 'queued' immediately if job is being enqueued
                ...(shouldQueueShopier ? { shopierSyncStatus: 'queued' } : {}),
              },
            },
            req,
          })

          // Step 20: Enqueue the Shopier sync job (non-blocking DB insert).
          // The job runner (GET /api/payload-jobs/run) will pick it up and run
          // syncProductToShopier(), transitioning status: queued → syncing → synced/error.
          if (shouldQueueShopier) {
            await req.payload.jobs.queue({
              task: 'shopier-sync',
              input: { productId: String(doc.id) },
              req,
              overrideAccess: true,
            })
            console.log(`[Products] Shopier sync job queued — product=${doc.id}`)
          }

          console.log(
            `[Products] afterChange dispatch — product=${doc.id} ` +
              `trigger=${isForceRedispatch ? 'force-redispatch' : 'activation'} ` +
              `dispatched=[${dispatchedChannels.join(',')}] ` +
              `shopierQueued=${shouldQueueShopier} ` +
              `total=${results.length} channels evaluated`,
          )
        } catch (err) {
          // Non-critical: product was activated/saved successfully.
          // Dispatch failure is logged; forceRedispatch flag is NOT reset on error
          // (admin can retry by saving again).
          const message = err instanceof Error ? err.message : String(err)
          console.error(
            `[Products] afterChange dispatch failed — product=${doc.id}: ${message}`,
          )
        }

        return doc
      },
    ],
  },
  fields: [
    // ── Otomasyon Kontrol Paneli (yalnızca otomasyon ürünlerinde görünür) ──
    {
      name: 'reviewPanel',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/admin/ReviewPanel#ReviewPanel',
        },
      },
    },
    // ── Temel Bilgiler ────────────────────────────────────────
    {
      name: 'title',
      type: 'text',
      label: 'Ürün Adı',
      required: true,
      validate: (value: any) => {
        if (!value || String(value).trim().length === 0) {
          return '⚠️ Ürün adı zorunludur. Lütfen bir ürün adı girin.'
        }
        return true
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Ürün Açıklaması',
    },
    // ── 📸 Görseller ─────────────────────────────────────────
    {
      name: 'images',
      type: 'array',
      label: '📸 Ürün Görselleri (Fotoğraf Ekle / Değiştir)',
      admin: {
        description: '⬆️ Önce "Medya Kütüphanesi"nden görsel yükleyin, sonra buradan seçin. İlk görsel kapak fotoğrafı olarak kullanılır. En fazla 8 görsel. — VEYA medya kütüphanesinden "İlgili Ürün" alanını seçin, o da çalışır.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'image',
          type: 'relationship',
          relationTo: 'media',
          label: 'Görsel Seç',
        },
      ],
    },
    // ── 🤖 AI Üretim Galerisi (Pazarlama / Editöryal) ─────────
    // DUAL-TRACK SEPARATION (v13):
    //   product.images       = website-safe originals only (Telegram photo + manual uploads)
    //   product.generativeGallery = AI-generated editorial/marketing media — not shown on product page by default
    //
    // On approval, generated images are written here, NOT into product.images.
    // This prevents AI outputs from polluting the website-safe gallery.
    {
      name: 'generativeGallery',
      type: 'array',
      label: '🤖 AI Üretim Galerisi (Pazarlama)',
      admin: {
        description:
          'AI ile üretilen görseller — ürün sayfası değil, sosyal medya / pazarlama için. ' +
          'Ürün sayfası görselleri için yukarıdaki "Ürün Görselleri" alanını kullanın.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'image',
          type: 'relationship',
          relationTo: 'media',
          label: 'Görsel',
        },
      ],
    },
    // ── Marka & Kategori ──────────────────────────────────────
    {
      name: 'brand',
      type: 'text',
      label: 'Marka',
      admin: {
        position: 'sidebar',
        description: 'Nike / Adidas / Puma / New Balance / Converse / Vans / Reebok / Timberland',
      },
    },
    // DUAL-TRACK v13: marks brand-sensitive products (logo/branded details)
    // These products should NEVER have AI-generated images used as website-safe originals.
    // When true, AI outputs go to generativeGallery only and must NOT replace product.images.
    {
      name: 'brandSensitive',
      type: 'checkbox',
      label: '🏷️ Marka Hassas Ürün',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Nike, Adidas gibi logolu ve markalı ürünler için işaretleyin. ' +
          'AI üretilen görseller asla otomatik olarak ürün sayfası galerisine eklenmez.',
      },
    },
    {
      name: 'category',
      type: 'select',
      label: 'Kategori',
      options: [
        { label: 'Günlük', value: 'Günlük' },
        { label: 'Spor', value: 'Spor' },
        { label: 'Klasik', value: 'Klasik' },
        { label: 'Bot', value: 'Bot' },
        { label: 'Sandalet', value: 'Sandalet' },
        { label: 'Krampon', value: 'Krampon' },
        { label: 'Cüzdan', value: 'Cüzdan' },
      ],
      defaultValue: 'Günlük',
      admin: {
        position: 'sidebar',
      },
    },
    // ── Ürün Ailesi & Tipi ─────────────────────────────────────
    {
      name: 'productFamily',
      type: 'select',
      label: 'Ürün Ailesi',
      options: [
        { label: '👟 Ayakkabı', value: 'shoes' },
        { label: '👛 Cüzdan', value: 'wallets' },
        { label: '👜 Çanta', value: 'bags' },
        { label: '🎗️ Kemer', value: 'belts' },
        { label: '🎒 Aksesuar', value: 'accessories' },
      ],
      defaultValue: 'shoes',
      admin: {
        position: 'sidebar',
        description: 'Ana ürün grubu — filtreleme ve kanal yönlendirmede kullanılır',
      },
    },
    {
      name: 'productType',
      type: 'text',
      label: 'Ürün Tipi',
      admin: {
        position: 'sidebar',
        description: 'Detay tip: sneaker, bot, loafer, bifold, cardholder vb.',
      },
    },
    {
      name: 'gender',
      type: 'select',
      label: 'Cinsiyet',
      options: [
        { label: 'Erkek', value: 'erkek' },
        { label: 'Kadın', value: 'kadin' },
        { label: 'Unisex', value: 'unisex' },
        { label: 'Çocuk', value: 'cocuk' },
      ],
      defaultValue: 'unisex',
      admin: { position: 'sidebar' },
    },
    // ── Fiyat ─────────────────────────────────────────────────
    {
      name: 'price',
      type: 'number',
      label: 'Satış Fiyatı (₺)',
      required: true,
      validate: (value: any, { data }: any) => {
        // Otomasyon kaynağından gelen draft ürünler için fiyat validasyonu atlanır
        // (fiyat daha sonra admin panelinden tamamlanır)
        if (data?.source === 'n8n' || data?.source === 'automation' || data?.source === 'telegram') {
          return true
        }
        if (value === undefined || value === null || value === '') {
          return '⚠️ Satış fiyatı zorunludur.'
        }
        if (Number(value) <= 0) {
          return '⚠️ Fiyat 0\'dan büyük olmalıdır.'
        }
        return true
      },
    },
    {
      name: 'originalPrice',
      type: 'number',
      label: 'Piyasa Fiyatı (₺)',
      admin: {
        description: 'İndirim hesabı için eski fiyat — boş bırakılabilir',
      },
    },
    // ── Stok Adedi ────────────────────────────────────────────
    // Product-level stock for products without size variants.
    // Automation intake sets this from the Telegram message quantity field.
    {
      name: 'stockQuantity',
      type: 'number',
      label: 'Stok Adedi',
      defaultValue: 1,
      admin: {
        position: 'sidebar',
        description: 'Toplam stok — beden varyantı olmayan ürünler için.',
      },
      validate: (value: any) => {
        if (value === undefined || value === null || value === '') return true
        if (Number(value) < 0) return '⚠️ Stok adedi 0\'dan küçük olamaz.'
        return true
      },
    },
    // ── Tanımlayıcılar ───────────────────────────────────────
    {
      name: 'slug',
      type: 'text',
      label: 'Slug (URL)',
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'Otomatik oluşturulur — değiştirmenize gerek yok',
        readOnly: true,
      },
    },
    {
      name: 'sku',
      type: 'text',
      label: 'SKU / Stok Kodu',
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'Boş bırakırsanız otomatik oluşturulur (ör: NKE-AM90-BLK)',
      },
    },
    // ── Durum ─────────────────────────────────────────────────
    {
      name: 'status',
      type: 'select',
      label: 'Durum',
      defaultValue: 'active', // admin ürünleri aktif başlar; otomasyon 'draft' iletir
      options: [
        { label: '🟢 Aktif — Sitede görünür', value: 'active' },
        { label: '🔴 Tükendi — Stok bitti', value: 'soldout' },
        { label: '📝 Taslak — Sitede görünmez', value: 'draft' },
      ],
      admin: {
        position: 'sidebar',
        components: {
          Cell: '@/components/admin/StatusCell#StatusCell',
        },
      },
    },
    {
      name: 'color',
      type: 'text',
      label: 'Renk',
      admin: {
        position: 'sidebar',
        description: 'Siyah, Beyaz, Kırmızı, Mavi vb.',
      },
    },
    {
      name: 'material',
      type: 'text',
      label: 'Materyal',
      admin: {
        position: 'sidebar',
        description: 'Deri, Süet, Kanvas, Sentetik vb.',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Öne Çıkan Ürün',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Ana sayfada göster',
      },
    },
    // ── Varyantlar ────────────────────────────────────────────
    {
      name: 'variants',
      type: 'relationship',
      label: 'Beden Varyantları',
      relationTo: 'variants',
      hasMany: true,
    },
    // ── Kanal Yayın Kontrolleri ───────────────────────────────
    {
      name: 'channels',
      type: 'group',
      label: '📢 Yayın Kanalları',
      admin: {
        description: 'Ürünün hangi kanallarda yayınlanacağını seçin',
      },
      fields: [
        {
          name: 'publishWebsite',
          type: 'checkbox',
          label: '🌐 Web Sitesi',
          defaultValue: true,
        },
        {
          name: 'publishInstagram',
          type: 'checkbox',
          label: '📸 Instagram',
          defaultValue: false,
        },
        {
          name: 'publishShopier',
          type: 'checkbox',
          label: '🛒 Shopier',
          defaultValue: false,
        },
        {
          name: 'publishDolap',
          type: 'checkbox',
          label: '👗 Dolap',
          defaultValue: false,
        },
        // Step 16+: Social media channels
        {
          name: 'publishX',
          type: 'checkbox',
          label: '𝕏 X (Twitter)',
          defaultValue: false,
        },
        {
          name: 'publishFacebook',
          type: 'checkbox',
          label: '📘 Facebook',
          defaultValue: false,
        },
        {
          name: 'publishLinkedin',
          type: 'checkbox',
          label: '💼 LinkedIn',
          defaultValue: false,
        },
        {
          name: 'publishThreads',
          type: 'checkbox',
          label: '🧵 Threads',
          defaultValue: false,
        },
      ],
    },
    // ── Kanal Hedefleri (multi-select, parser output) ─────────
    {
      name: 'channelTargets',
      type: 'select',
      label: 'Kanal Hedefleri',
      hasMany: true,
      options: [
        { label: 'Website', value: 'website' },
        { label: 'Instagram', value: 'instagram' },
        { label: 'Shopier', value: 'shopier' },
        { label: 'Dolap', value: 'dolap' },
        { label: 'X (Twitter)', value: 'x' },
        { label: 'Facebook', value: 'facebook' },
        { label: 'LinkedIn', value: 'linkedin' },
        { label: 'Threads', value: 'threads' },
      ],
      defaultValue: ['website'],
      admin: {
        description: 'Bu ürün hangi kanallara yayınlansın? (parser veya admin tarafından ayarlanır)',
      },
    },
    // ── Otomasyon Bayrakları (ürün bazlı overrides) ──────────
    {
      name: 'automationFlags',
      type: 'group',
      label: '⚙️ Otomasyon Bayrakları',
      admin: {
        description: 'Ürün bazlı otomasyon kontrolleri — global AutomationSettings\'i geçersiz kılar',
      },
      fields: [
        {
          name: 'autoActivate',
          type: 'checkbox',
          label: 'Otomatik Aktifleştir',
          defaultValue: false,
          admin: { description: 'Global ayarı bu ürün için geçersiz kılar' },
        },
        {
          name: 'generateBlog',
          type: 'checkbox',
          label: 'SEO Blog Üret',
          defaultValue: false,
          admin: { description: 'Bu ürün aktif olunca otomatik blog yazısı üret' },
        },
        {
          name: 'generateExtraViews',
          type: 'checkbox',
          label: 'Ek Görseller Üret',
          defaultValue: false,
          admin: { description: 'AI ile ek ürün açıları oluştur (2–4 adet)' },
        },
        {
          name: 'enableTryOn',
          type: 'checkbox',
          label: 'Try-On Aktif',
          defaultValue: false,
          admin: { description: 'Ürün sayfasında sanal deneme özelliği' },
        },
      ],
    },
    // ── Kaynak ────────────────────────────────────────────────
    {
      name: 'source',
      type: 'select',
      label: 'Kaynak',
      defaultValue: 'admin',
      options: [
        { label: '🖥️ Admin Paneli', value: 'admin' },
        { label: '📱 Telegram', value: 'telegram' },
        { label: '⚙️ n8n Otomasyon', value: 'n8n' },
        { label: '🔌 API', value: 'api' },
        { label: '📥 İçe Aktarım', value: 'import' },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Ürün nereden oluşturuldu',
        components: {
          Cell: '@/components/admin/SourceBadgeCell#SourceBadgeCell',
        },
      },
    },
    // ── Otomasyon Meta ────────────────────────────────────────
    // Operational fields for automation pipeline — idempotency, parser output, locking
    {
      name: 'automationMeta',
      type: 'group',
      label: '🤖 Otomasyon Bilgileri',
      admin: {
        description: 'Otomasyon pipeline tarafından kullanılan alanlar',
        condition: (data: any) => {
          return data?.source !== 'admin' || data?.createdByAutomation === true
        },
      },
      fields: [
        {
          name: 'telegramChatId',
          type: 'text',
          label: 'Telegram Chat ID',
          admin: { readOnly: true },
        },
        {
          name: 'telegramMessageId',
          type: 'text',
          label: 'Telegram Mesaj ID',
          admin: { readOnly: true },
        },
        {
          name: 'telegramFromUserId',
          type: 'text',
          label: 'Telegram Gönderen ID',
          admin: { readOnly: true },
        },
        {
          name: 'telegramChatType',
          type: 'text',
          label: 'Chat Tipi',
          admin: {
            readOnly: true,
            description: 'group / supergroup / private',
          },
        },
        // ── Step 11: Caption Parser Meta ──────────────────────
        // rawCaption: preserves the original Telegram message text for debugging/review
        {
          name: 'rawCaption',
          type: 'textarea',
          label: '📋 Ham Başlık (Orijinal Mesaj)',
          admin: {
            readOnly: true,
            description: 'Telegram\'dan gelen orijinal mesaj metni — debug/inceleme için',
          },
        },
        // parseWarnings: JSON array of parser warning messages
        {
          name: 'parseWarnings',
          type: 'textarea',
          label: '⚠️ Parser Uyarıları',
          admin: {
            readOnly: true,
            description: 'Otomatik parse sırasında tespit edilen eksikler/belirsizlikler (JSON)',
          },
        },
        // parseConfidence: 0-100 score based on how many required fields were found
        {
          name: 'parseConfidence',
          type: 'number',
          label: '📊 Parse Güveni (%)',
          admin: {
            readOnly: true,
            description: 'Otomatik ayrıştırma başarı skoru (0–100). 60+ yayına hazır olabilir.',
          },
        },
        {
          name: 'lastSyncedAt',
          type: 'date',
          label: 'Son Senkronizasyon',
          admin: { readOnly: true },
        },
        {
          name: 'updatedBy',
          type: 'text',
          label: 'Son Güncelleyen',
          admin: {
            readOnly: true,
            description: 'admin / automation / api',
          },
        },
        // ── Step 12: Status decision metadata ─────────────────
        // Stores the outcome of resolveProductStatus() for admin visibility
        {
          name: 'autoDecision',
          type: 'select',
          label: '🎯 Otomasyon Kararı',
          options: [
            { label: '✅ Aktif Edildi', value: 'active' },
            { label: '📝 Taslak Bırakıldı', value: 'draft' },
          ],
          admin: {
            readOnly: true,
            description: 'Otomasyon sisteminin verdiği ilk statü kararı — neden taslak kaldığını anlamak için',
          },
        },
        {
          name: 'autoDecisionReason',
          type: 'textarea',
          label: '📝 Karar Gerekçesi',
          admin: {
            readOnly: true,
            description: 'Otomasyon kararının Türkçe gerekçesi — hangi kural/toggle tetiklendi',
          },
        },
        {
          name: 'lockFields',
          type: 'checkbox',
          label: '🔒 Alanları Kilitle',
          defaultValue: false,
          admin: {
            description: 'Aktifken otomasyon bu ürünü güncelleyemez — sadece admin değiştirebilir',
          },
        },
      ],
    },
    // ── Kaynak İzleme (Source Meta — audit/traceability) ─────
    {
      name: 'sourceMeta',
      type: 'group',
      label: '🔍 Kaynak İzleme',
      admin: {
        description: 'Ürünün hangi sistemden geldiğini izlemek için — manuel düzenlemeye gerek yok',
        condition: (data: any) => data?.source !== 'admin',
      },
      fields: [
        {
          name: 'telegramSenderId',
          type: 'text',
          label: 'Telegram Gönderen ID',
          admin: { readOnly: true },
        },
        {
          name: 'workflowId',
          type: 'text',
          label: 'n8n Workflow ID',
          admin: { readOnly: true },
        },
        {
          name: 'externalSyncId',
          type: 'text',
          label: 'Harici Senkron ID',
          admin: {
            readOnly: true,
            description: 'Shopier/Dolap/Instagram tarafındaki ürün ID\'si',
          },
        },
        // ── Step 13: Channel Dispatch Tracking ────────────────
        // Written by afterChange hook after dispatch to external channels.
        // Admin can see which channels received this product and when.
        {
          name: 'dispatchedChannels',
          type: 'text',
          label: '📤 İletilen Kanallar',
          admin: {
            readOnly: true,
            description: 'Ürünün başarıyla iletildiği kanallar (JSON dizi) — otomasyon tarafından güncellenir',
          },
        },
        {
          name: 'lastDispatchedAt',
          type: 'date',
          label: '🕐 Son İletim Zamanı',
          admin: {
            readOnly: true,
            description: 'En son kanal iletiminin gerçekleştiği zaman',
          },
        },
        {
          name: 'dispatchNotes',
          type: 'textarea',
          label: '📋 İletim Detayları',
          admin: {
            readOnly: true,
            description: 'Kanal bazlı iletim sonuçları (JSON) — başarılı/başarısız/atlandı',
          },
        },
        // ── Step 14: Manual re-dispatch trigger ───────────────
        // Admin checks this + saves → afterChange hook fires dispatch again
        // for already-active products. Auto-reset to false after dispatch.
        {
          name: 'forceRedispatch',
          type: 'checkbox',
          label: '🔄 Tekrar Gönder (Force Re-Dispatch)',
          defaultValue: false,
          admin: {
            description:
              'İşaretleyip kaydedin → dispatch yeniden tetiklenir. ' +
              'Otomatik sıfırlanır. Sadece aktif ürünlerde çalışır.',
          },
        },
        // ── Step 20: Shopier Sync Metadata ──────────────────
        // Written by shopierSync.ts after product publish/update.
        // Stored in sourceMeta to avoid Neon DB column migration (D-077 pattern).
        {
          name: 'shopierProductId',
          type: 'text',
          label: '🛒 Shopier Ürün ID',
          admin: {
            readOnly: true,
            description: 'Shopier tarafındaki ürün ID\'si — sync tarafından yazılır',
          },
        },
        {
          name: 'shopierProductUrl',
          type: 'text',
          label: '🔗 Shopier URL',
          admin: {
            readOnly: true,
            description: 'Shopier ürün sayfası linki (ör. https://www.shopier.com/123456)',
          },
        },
        {
          name: 'shopierSyncStatus',
          type: 'select',
          label: '📊 Shopier Sync Durumu',
          options: [
            { label: '⬜ Senkron Edilmedi', value: 'not_synced' },
            { label: '🔄 Kuyrukta', value: 'queued' },
            { label: '⏳ Senkronlanıyor', value: 'syncing' },
            { label: '✅ Senkron', value: 'synced' },
            { label: '❌ Hata', value: 'error' },
          ],
          defaultValue: 'not_synced',
          admin: {
            readOnly: true,
            description: 'Shopier senkron durumu — otomatik güncellenir',
          },
        },
        {
          name: 'shopierLastSyncAt',
          type: 'date',
          label: '🕐 Son Shopier Sync',
          admin: {
            readOnly: true,
            description: 'Son başarılı/başarısız sync zamanı',
          },
        },
        {
          name: 'shopierLastError',
          type: 'textarea',
          label: '❗ Shopier Son Hata',
          admin: {
            readOnly: true,
            description: 'Son sync hatası — başarılı sync\'te temizlenir',
          },
        },
      ],
    },
    // ── Eski Otomasyon Alanları (geriye uyumluluk) ──────────
    // Yeni kod channels.* ve automationMeta.* kullanmalı
    {
      name: 'createdByAutomation',
      type: 'checkbox',
      label: 'Otomasyon ile Eklendi (Eski)',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: '⚠️ Eski alan — yeni ürünler için "Kaynak" alanını kullanın',
      },
    },
    {
      name: 'telegramMessageId',
      type: 'text',
      label: 'Telegram Mesaj ID (Eski)',
      admin: {
        position: 'sidebar',
        description: '⚠️ Eski alan — automationMeta.telegramMessageId kullanın',
      },
    },
    {
      name: 'postToInstagram',
      type: 'checkbox',
      label: 'Instagram Paylaş (Eski)',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: '⚠️ Eski alan — channels.publishInstagram kullanın',
      },
    },
  ],
}
