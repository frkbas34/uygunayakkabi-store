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

          // Re-fetch the product at depth=1 so that relationship fields
          // (especially images[].image.url) are populated with full objects
          // instead of bare IDs.  The afterChange `doc` is depth=0 by default.
          const populatedProduct = await req.payload.findByID({
            collection: 'products',
            id: doc.id,
            depth: 1,
          })

          const { results, dispatchedChannels } = await dispatchProductToChannels(
            populatedProduct as Record<string, unknown>,
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

          // ── Phase 4: Non-blocking Story trigger ──────────────────────────────
          // Only fires on status transitions (draft→active), not on force-redispatch.
          // Story failure is caught silently — never blocks product publish.
          if (isStatusTransition) {
            try {
              const { shouldAutoTriggerStory } = await import('@/lib/storyTargets')
              if (shouldAutoTriggerStory(doc as Record<string, unknown>)) {
                const { dispatchStory } = await import('@/lib/storyDispatch')
                const storyResult = await dispatchStory(
                  doc as any,
                  (settings as any)?.storyTargets ?? null,
                  req.payload as any,
                  'auto_publish',
                  req,
                )
                console.log(
                  `[Products] Story dispatch — product=${doc.id} ` +
                    `status=${storyResult.status} targets=[${storyResult.targets.join(',')}] ` +
                    `blocked=[${storyResult.blockedTargets.join(',')}]`,
                )
              }
            } catch (storyErr) {
              // Story failure is non-critical — log and continue
              console.error(
                `[Products] Story dispatch failed (non-blocking) — product=${doc.id}: ` +
                  (storyErr instanceof Error ? storyErr.message : String(storyErr)),
              )
            }
          }
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
    // ── Stok Numarası (AI Görseller) ─────────────────────────
    // Persistent stock number rendered on all generated images.
    // Format: SN0001–SN9999. Auto-generated, never changes once set.
    {
      name: 'stockNumber',
      type: 'text',
      label: 'Stok No (AI Görsel)',
      unique: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'AI görsellerde görünen stok numarası — otomatik üretilir, değiştirmeyin.',
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
          name: 'telegramMediaGroupId',
          type: 'text',
          label: 'Telegram Album Grubu ID',
          admin: {
            readOnly: true,
            description: 'Aynı albümdeki (media group) fotoğrafları bağlar — birden fazla fotoğraf aynı ürüne eklenir',
          },
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
        // ── Phase 3: Story Tracking ─────────────────────────────
        // Written by storyDispatch after story job creation/completion.
        // Non-blocking — story failures do not affect product publish.
        {
          name: 'storyStatus',
          type: 'select',
          label: '📖 Story Durumu',
          options: [
            { label: '➖ Yok', value: 'none' },
            { label: '🔄 Kuyrukta', value: 'queued' },
            { label: '⏳ Onay Bekliyor', value: 'awaiting_approval' },
            { label: '📤 Yayınlanıyor', value: 'publishing' },
            { label: '✅ Yayınlandı', value: 'published' },
            { label: '⚠️ Kısmen Başarılı', value: 'partial_success' },
            { label: '❌ Başarısız', value: 'failed' },
            { label: '🚫 Resmi Engel', value: 'blocked_officially' },
          ],
          defaultValue: 'none',
          admin: {
            readOnly: true,
            description: 'Story pipeline durumu — otomatik güncellenir',
          },
        },
        {
          name: 'storyQueuedAt',
          type: 'date',
          label: '📖 Story Kuyruğa Alındı',
          admin: {
            readOnly: true,
            description: 'Story job\'un oluşturulduğu zaman',
          },
        },
        {
          name: 'storyPublishedAt',
          type: 'date',
          label: '📖 Story Yayınlandı',
          admin: {
            readOnly: true,
            description: 'Story\'nin başarıyla yayınlandığı zaman',
          },
        },
        {
          name: 'storyTargetsPublished',
          type: 'text',
          label: '📖 Yayınlanan Hedefler',
          admin: {
            readOnly: true,
            description: 'Story başarıyla yayınlanan platformlar (JSON dizi)',
          },
        },
        {
          name: 'storyTargetsFailed',
          type: 'text',
          label: '📖 Başarısız Hedefler',
          admin: {
            readOnly: true,
            description: 'Story yayını başarısız olan platformlar (JSON dizi)',
          },
        },
        {
          name: 'lastStoryError',
          type: 'textarea',
          label: '📖 Son Story Hatası',
          admin: {
            readOnly: true,
            description: 'Son story yayın denemesinin hata mesajı',
          },
        },
        {
          name: 'lastStoryAsset',
          type: 'text',
          label: '📖 Son Story Görseli',
          admin: {
            readOnly: true,
            description: 'Son story\'de kullanılan görsel URL\'si',
          },
        },
        {
          name: 'lastStoryCaption',
          type: 'textarea',
          label: '📖 Son Story Açıklaması',
          admin: {
            readOnly: true,
            description: 'Son story\'de kullanılan açıklama metni',
          },
        },
      ],
    },
    // ── Phase 3: Story Settings ────────────────────────────
    // Per-product story pipeline configuration.
    // Controls whether/how this product participates in Telegram Story publishing.
    {
      name: 'storySettings',
      type: 'group',
      label: '📖 Story Ayarları',
      admin: {
        description: 'Ürünün Telegram Story pipeline\'ına katılım ayarları',
      },
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          label: 'Story Aktif',
          defaultValue: false,
          admin: {
            description: 'Bu ürün story pipeline\'ına dahil edilsin mi?',
          },
        },
        {
          name: 'autoOnPublish',
          type: 'checkbox',
          label: 'Yayında Otomatik Story',
          defaultValue: false,
          admin: {
            description: 'Ürün aktifleştirildiğinde otomatik story job oluştur',
          },
        },
        {
          name: 'skipApproval',
          type: 'checkbox',
          label: 'Onay Atla',
          defaultValue: false,
          admin: {
            description: 'Story doğrudan yayınlansın — operatör onayı beklemesin',
          },
        },
        {
          name: 'captionMode',
          type: 'select',
          label: 'Açıklama Modu',
          defaultValue: 'auto',
          options: [
            { label: '🤖 Otomatik', value: 'auto' },
            { label: '✏️ Manuel', value: 'manual' },
            { label: '📋 Şablon', value: 'template' },
          ],
          admin: {
            description: 'Story açıklaması nasıl oluşturulsun?',
          },
        },
        {
          name: 'primaryAsset',
          type: 'select',
          label: 'Tercih Edilen Görsel',
          defaultValue: 'main_image',
          options: [
            { label: '📸 Ana Ürün Görseli', value: 'main_image' },
            { label: '🤖 AI Galeri Görseli', value: 'generative' },
            { label: '🖼️ Özel Story Görseli', value: 'custom' },
          ],
          admin: {
            description: 'Story için hangi görsel kaynağı tercih edilsin?',
          },
        },
        {
          name: 'storyTargets',
          type: 'select',
          label: 'Story Hedefleri',
          hasMany: true,
          options: [
            { label: '📱 Telegram', value: 'telegram' },
            { label: '📸 Instagram', value: 'instagram' },
            { label: '💬 WhatsApp', value: 'whatsapp' },
          ],
          defaultValue: ['telegram'],
          admin: {
            description: 'Story hangi platformlara gönderilsin? (WhatsApp resmi API ile desteklenmiyor)',
          },
        },
      ],
    },
    // ── Phase 1: Workflow State Fields ──────────────────────
    // Bot-to-bot workflow orchestration — tracks product lifecycle stages.
    // All fields default to safe values so existing records are unaffected.
    {
      name: 'workflow',
      type: 'group',
      label: '🔄 İş Akışı Durumu',
      admin: {
        description: 'Otonom bot iş akışı aşamalarını izler — ürün yaşam döngüsü',
      },
      fields: [
        {
          name: 'workflowStatus',
          type: 'select',
          label: 'İş Akışı Durumu',
          defaultValue: 'draft',
          options: [
            { label: '📝 Taslak', value: 'draft' },
            { label: '🖼️ Görsel Bekliyor', value: 'visual_pending' },
            { label: '🖼️ Görsel Hazır', value: 'visual_ready' },
            { label: '✅ Onay Bekliyor', value: 'confirmation_pending' },
            { label: '✅ Onaylandı', value: 'confirmed' },
            { label: '📝 İçerik Bekliyor', value: 'content_pending' },
            { label: '📝 İçerik Hazır', value: 'content_ready' },
            { label: '🔍 Denetim Bekliyor', value: 'audit_pending' },
            { label: '🚀 Yayına Hazır', value: 'publish_ready' },
            { label: '🟢 Aktif', value: 'active' },
            { label: '🔴 Tükendi', value: 'soldout' },
            { label: '📦 Arşivlendi', value: 'archived' },
          ],
          admin: {
            description: 'Ana iş akışı aşaması — botlar arası geçişleri yönetir',
          },
        },
        {
          name: 'visualStatus',
          type: 'select',
          label: 'Görsel Durumu',
          defaultValue: 'pending',
          options: [
            { label: '⏳ Bekliyor', value: 'pending' },
            { label: '⚙️ Üretiliyor', value: 'generating' },
            { label: '👁️ Önizleme', value: 'preview' },
            { label: '✅ Onaylandı', value: 'approved' },
            { label: '❌ Reddedildi', value: 'rejected' },
          ],
          admin: {
            description: 'AI görsel üretim aşaması',
          },
        },
        {
          name: 'confirmationStatus',
          type: 'select',
          label: 'Onay Durumu',
          defaultValue: 'pending',
          options: [
            { label: '⏳ Bekliyor', value: 'pending' },
            { label: '✅ Onaylandı', value: 'confirmed' },
            { label: '🚫 Engellendi', value: 'blocked' },
          ],
          admin: {
            description: 'Operatör onay durumu',
          },
        },
        {
          name: 'contentStatus',
          type: 'select',
          label: 'İçerik Durumu',
          defaultValue: 'pending',
          options: [
            { label: '⏳ Bekliyor', value: 'pending' },
            { label: '🛒 Commerce Üretildi', value: 'commerce_generated' },
            { label: '🔍 Discovery Üretildi', value: 'discovery_generated' },
            { label: '✅ Hazır', value: 'ready' },
            { label: '❌ Başarısız', value: 'failed' },
          ],
          admin: {
            description: 'SEO / commerce içerik üretim durumu',
          },
        },
        {
          name: 'auditStatus',
          type: 'select',
          label: 'Denetim Durumu',
          defaultValue: 'not_required',
          options: [
            { label: '➖ Gerekli Değil', value: 'not_required' },
            { label: '⏳ Bekliyor', value: 'pending' },
            { label: '✅ Onaylandı', value: 'approved' },
            { label: '⚠️ Uyarılı Onay', value: 'approved_with_warning' },
            { label: '🔁 Revizyon Gerekli', value: 'needs_revision' },
            { label: '❌ Başarısız', value: 'failed' },
          ],
          admin: {
            description: 'Mentix denetim durumu',
          },
        },
        {
          name: 'publishStatus',
          type: 'select',
          label: 'Yayın Durumu',
          defaultValue: 'not_requested',
          options: [
            { label: '➖ İstenmedi', value: 'not_requested' },
            { label: '⏳ Bekliyor', value: 'pending' },
            { label: '✅ Yayınlandı', value: 'published' },
            { label: '⚠️ Kısmen Yayınlandı', value: 'partial' },
            { label: '❌ Başarısız', value: 'failed' },
          ],
          admin: {
            description: 'Çoklu kanal yayın durumu',
          },
        },
        {
          name: 'stockState',
          type: 'select',
          label: 'Stok Durumu',
          defaultValue: 'in_stock',
          options: [
            { label: '✅ Stokta', value: 'in_stock' },
            { label: '⚠️ Az Kaldı', value: 'low_stock' },
            { label: '🔴 Tükendi', value: 'sold_out' },
            { label: '🔄 Tekrar Stokta', value: 'restocked' },
          ],
          admin: {
            description: 'Stok durumu — soldout otomasyonu için',
          },
        },
        {
          name: 'sellable',
          type: 'checkbox',
          label: 'Satılabilir',
          defaultValue: false,
          admin: {
            description: 'Tüm koşullar sağlandığında true — satışa hazır',
          },
        },
        {
          name: 'productConfirmedAt',
          type: 'date',
          label: 'Onay Tarihi',
          admin: {
            description: 'Operatör tarafından onaylandığı zaman',
          },
        },
        {
          name: 'lastHandledByBot',
          type: 'select',
          label: 'Son İşleyen Bot',
          options: [
            { label: 'UygunOps', value: 'uygunops' },
            { label: 'GeoBot', value: 'geobot' },
            { label: 'Mentix', value: 'mentix' },
            { label: 'Sistem', value: 'system' },
          ],
          admin: {
            description: 'Bu ürünü en son hangi bot/sistem işledi',
          },
        },
      ],
    },
    // ── Phase 1: Merchandising Fields ────────────────────────
    // Homepage section targeting — Yeni, Popüler, Çok Satanlar, Fırsatlar, İndirimli.
    // Schema foundation only — merchandising query engine comes in Phase 2.
    {
      name: 'merchandising',
      type: 'group',
      label: '🏷️ Mağaza Vitrini',
      admin: {
        description: 'Ana sayfa bölümleri için vitrin kontrolleri — Yeni, Popüler, Çok Satanlar, Fırsatlar',
      },
      fields: [
        {
          name: 'publishedAt',
          type: 'date',
          label: 'Yayın Tarihi',
          admin: {
            description: '"Yeni" hesaplaması için — ilk yayın anı',
          },
        },
        {
          name: 'newUntil',
          type: 'date',
          label: '"Yeni" Bitiş Tarihi',
          admin: {
            description: 'Bu tarihe kadar "Yeni Ürünler" bölümünde görünür',
          },
        },
        {
          name: 'manualPopular',
          type: 'checkbox',
          label: '⭐ Manuel Popüler',
          defaultValue: false,
          admin: {
            description: 'Admin tarafından popüler olarak işaretlendi',
          },
        },
        {
          name: 'manualDeal',
          type: 'checkbox',
          label: '🔥 Manuel Fırsat',
          defaultValue: false,
          admin: {
            description: 'Admin tarafından fırsat ürünü olarak işaretlendi',
          },
        },
        {
          name: 'bestSellerPinned',
          type: 'checkbox',
          label: '📌 Çok Satan Sabitle',
          defaultValue: false,
          admin: {
            description: 'Çok Satanlar listesinde sabitlenmiş — skordan bağımsız görünür',
          },
        },
        {
          name: 'bestSellerExcluded',
          type: 'checkbox',
          label: '🚫 Çok Satanlardan Hariç Tut',
          defaultValue: false,
          admin: {
            description: 'Bu ürünü Çok Satanlar listesinden çıkar',
          },
        },
        {
          name: 'homepageHidden',
          type: 'checkbox',
          label: '👁️‍🗨️ Ana Sayfadan Gizle',
          defaultValue: false,
          admin: {
            description: 'Ürün aktif ama ana sayfa bölümlerinde gösterilmez',
          },
        },
        {
          name: 'totalUnitsSold',
          type: 'number',
          label: 'Toplam Satış Adedi',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Tüm zamanlar toplam satış — sipariş sistemi tarafından güncellenir',
          },
        },
        {
          name: 'recentUnitsSold7d',
          type: 'number',
          label: 'Son 7 Gün Satış',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Son 7 gün satış adedi — periyodik sync ile güncellenir',
          },
        },
        {
          name: 'recentUnitsSold30d',
          type: 'number',
          label: 'Son 30 Gün Satış',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Son 30 gün satış adedi — periyodik sync ile güncellenir',
          },
        },
        {
          name: 'bestSellerScore',
          type: 'number',
          label: 'Çok Satan Skoru',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Ağırlıklı satış skoru — merchandising sync tarafından hesaplanır',
          },
        },
        {
          name: 'lastMerchandisingSyncAt',
          type: 'date',
          label: 'Son Vitrin Sync',
          admin: {
            readOnly: true,
            description: 'Merchandising verileri en son ne zaman güncellendi',
          },
        },
      ],
    },
    // ── Phase 6: Content Generation Packs (D-107) ─────────────────────
    // Geobot-generated commerce + discovery content.
    // Commerce Pack: channel-specific copy (website, Instagram, X, Facebook, Shopier).
    // Discovery Pack: long-form GEO/SEO article + metadata.
    // Both packs are generated after product confirmation (confirmationStatus=confirmed).
    {
      name: 'content',
      type: 'group',
      label: '📝 İçerik Üretim',
      admin: {
        description: 'Geobot tarafından üretilen ticari ve keşif içerikleri',
      },
      fields: [
        // ── Commerce Pack ──────────────────────────────────────────
        {
          name: 'commercePack',
          type: 'group',
          label: '🛒 Commerce Pack',
          admin: {
            description: 'Kanal bazlı ürün açıklamaları ve kopya metinleri',
          },
          fields: [
            {
              name: 'websiteDescription',
              type: 'textarea',
              label: 'Website Açıklaması',
              admin: {
                description: 'Ana ürün sayfası açıklaması — HTML destekli',
              },
            },
            {
              name: 'instagramCaption',
              type: 'textarea',
              label: 'Instagram Caption',
              admin: {
                description: 'Instagram post caption — hashtag dahil',
              },
            },
            {
              name: 'xPost',
              type: 'textarea',
              label: 'X (Twitter) Post',
              admin: {
                description: 'X/Twitter kısa kopya — 280 karakter sınırı hedefli',
              },
            },
            {
              name: 'facebookCopy',
              type: 'textarea',
              label: 'Facebook Copy',
              admin: {
                description: 'Facebook post metni',
              },
            },
            {
              name: 'shopierCopy',
              type: 'textarea',
              label: 'Shopier Copy',
              admin: {
                description: 'Shopier ürün sayfası açıklaması',
              },
            },
            {
              name: 'highlights',
              type: 'json',
              label: 'Öne Çıkan Noktalar',
              admin: {
                description: 'Ürün öne çıkan özellikleri — JSON dizisi ["madde1", "madde2", ...]',
              },
            },
            {
              name: 'confidence',
              type: 'number',
              label: 'Güven Skoru',
              admin: {
                readOnly: true,
                description: 'AI üretim güven skoru (0-100)',
              },
            },
            {
              name: 'warnings',
              type: 'json',
              label: 'Uyarılar',
              admin: {
                readOnly: true,
                description: 'AI üretim sırasında oluşan uyarılar — JSON dizisi',
              },
            },
            {
              name: 'generatedAt',
              type: 'date',
              label: 'Üretim Zamanı',
              admin: {
                readOnly: true,
                description: 'Commerce pack ne zaman üretildi',
              },
            },
          ],
        },
        // ── Discovery Pack ─────────────────────────────────────────
        {
          name: 'discoveryPack',
          type: 'group',
          label: '🔍 Discovery Pack',
          admin: {
            description: 'GEO/SEO uzun içerik, meta veriler ve bağlantı hedefleri',
          },
          fields: [
            {
              name: 'articleTitle',
              type: 'text',
              label: 'Makale Başlığı',
              admin: {
                description: 'GEO/SEO makale ana başlığı',
              },
            },
            {
              name: 'articleBody',
              type: 'textarea',
              label: 'Makale İçeriği',
              admin: {
                description: 'Uzun form GEO/SEO makale gövdesi — Markdown/HTML destekli',
              },
            },
            {
              name: 'metaTitle',
              type: 'text',
              label: 'Meta Title',
              admin: {
                description: 'SEO meta title — max 60 karakter hedefli',
              },
            },
            {
              name: 'metaDescription',
              type: 'textarea',
              label: 'Meta Description',
              admin: {
                description: 'SEO meta description — max 160 karakter hedefli',
              },
            },
            {
              name: 'faq',
              type: 'json',
              label: 'SSS (FAQ)',
              admin: {
                description: 'Sıkça sorulan sorular — JSON: [{q: "...", a: "..."}, ...]',
              },
            },
            {
              name: 'keywordEntities',
              type: 'json',
              label: 'Anahtar Kelimeler / Varlıklar',
              admin: {
                description: 'Anahtar kelime ve entity kümesi — JSON dizisi',
              },
            },
            {
              name: 'internalLinkTargets',
              type: 'json',
              label: 'İç Bağlantı Hedefleri',
              admin: {
                description: 'Önerilen iç bağlantılar — JSON: [{slug: "...", anchor: "..."}, ...]',
              },
            },
            {
              name: 'confidence',
              type: 'number',
              label: 'Güven Skoru',
              admin: {
                readOnly: true,
                description: 'AI üretim güven skoru (0-100)',
              },
            },
            {
              name: 'warnings',
              type: 'json',
              label: 'Uyarılar',
              admin: {
                readOnly: true,
                description: 'AI üretim sırasında oluşan uyarılar — JSON dizisi',
              },
            },
            {
              name: 'generatedAt',
              type: 'date',
              label: 'Üretim Zamanı',
              admin: {
                readOnly: true,
                description: 'Discovery pack ne zaman üretildi',
              },
            },
          ],
        },
        // ── Blog linkage ──────────────────────────────────────────
        {
          name: 'linkedBlogPost',
          type: 'relationship',
          label: 'Bağlı Blog Yazısı',
          relationTo: 'blog-posts',
          admin: {
            description: 'Discovery pack\'ten oluşturulan blog yazısı — otomatik bağlanır',
          },
        },
        {
          name: 'contentGenerationSource',
          type: 'select',
          label: 'Üretim Kaynağı',
          defaultValue: 'none',
          options: [
            { label: '➖ Yok', value: 'none' },
            { label: '🤖 Geobot', value: 'geobot' },
            { label: '👤 Manuel', value: 'manual' },
            { label: '📥 İçe Aktarım', value: 'import' },
          ],
          admin: {
            readOnly: true,
            description: 'İçerik hangi kaynak tarafından üretildi',
          },
        },
        {
          name: 'lastContentGenerationAt',
          type: 'date',
          label: 'Son İçerik Üretimi',
          admin: {
            readOnly: true,
            description: 'İçerik en son ne zaman üretildi/güncellendi',
          },
        },
      ],
    },
    // ── Phase 8: Mentix Audit Results (D-109) ─────────────────────────
    // Structured audit results from Mentix review layer.
    // Records per-dimension assessment + overall publish readiness.
    {
      name: 'auditResult',
      type: 'group',
      label: '🔍 Denetim Sonuçları',
      admin: {
        description: 'Mentix denetim katmanı sonuçları — görsel, ticari, keşif ve genel hazırlık',
      },
      fields: [
        {
          name: 'visualAudit',
          type: 'select',
          label: 'Görsel Denetimi',
          defaultValue: 'not_reviewed',
          options: [
            { label: '➖ İncelenmedi', value: 'not_reviewed' },
            { label: '✅ Geçti', value: 'pass' },
            { label: '⚠️ Uyarılı Geçti', value: 'pass_with_warning' },
            { label: '❌ Başarısız', value: 'fail' },
          ],
          admin: { description: 'Görsel hazırlık değerlendirmesi' },
        },
        {
          name: 'commerceAudit',
          type: 'select',
          label: 'Commerce Denetimi',
          defaultValue: 'not_reviewed',
          options: [
            { label: '➖ İncelenmedi', value: 'not_reviewed' },
            { label: '✅ Geçti', value: 'pass' },
            { label: '⚠️ Uyarılı Geçti', value: 'pass_with_warning' },
            { label: '❌ Başarısız', value: 'fail' },
          ],
          admin: { description: 'Commerce pack içerik kalitesi değerlendirmesi' },
        },
        {
          name: 'discoveryAudit',
          type: 'select',
          label: 'Discovery Denetimi',
          defaultValue: 'not_reviewed',
          options: [
            { label: '➖ İncelenmedi', value: 'not_reviewed' },
            { label: '✅ Geçti', value: 'pass' },
            { label: '⚠️ Uyarılı Geçti', value: 'pass_with_warning' },
            { label: '❌ Başarısız', value: 'fail' },
          ],
          admin: { description: 'Discovery/GEO pack kalite değerlendirmesi' },
        },
        {
          name: 'overallResult',
          type: 'select',
          label: 'Genel Sonuç',
          defaultValue: 'not_reviewed',
          options: [
            { label: '➖ İncelenmedi', value: 'not_reviewed' },
            { label: '✅ Onaylandı', value: 'approved' },
            { label: '⚠️ Uyarılı Onay', value: 'approved_with_warning' },
            { label: '🔁 Revizyon Gerekli', value: 'needs_revision' },
            { label: '❌ Başarısız', value: 'failed' },
          ],
          admin: { description: 'Genel yayın hazırlık sonucu' },
        },
        {
          name: 'approvedForPublish',
          type: 'checkbox',
          label: 'Yayına Onaylı',
          defaultValue: false,
          admin: {
            readOnly: true,
            description: 'true = tüm denetim boyutları geçti, ürün yayına hazır',
          },
        },
        {
          name: 'warnings',
          type: 'json',
          label: 'Uyarılar',
          admin: {
            readOnly: true,
            description: 'Denetim uyarıları — JSON dizisi',
          },
        },
        {
          name: 'revisionNotes',
          type: 'textarea',
          label: 'Revizyon Notları',
          admin: {
            description: 'Düzeltilmesi gereken konular — operatör veya Mentix tarafından yazılır',
          },
        },
        {
          name: 'auditedAt',
          type: 'date',
          label: 'Denetim Zamanı',
          admin: {
            readOnly: true,
            description: 'Son denetim ne zaman yapıldı',
          },
        },
        {
          name: 'auditedByBot',
          type: 'select',
          label: 'Denetleyen Bot',
          options: [
            { label: 'Mentix', value: 'mentix' },
            { label: 'Operatör', value: 'operator' },
            { label: 'Sistem', value: 'system' },
          ],
          admin: {
            readOnly: true,
            description: 'Denetimi yapan bot/kişi',
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
