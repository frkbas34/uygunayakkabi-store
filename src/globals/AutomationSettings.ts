import type { GlobalConfig } from 'payload'

/**
 * AutomationSettings — Centralized automation control panel (Global)
 *
 * Step 12: Extended with:
 *  - minConfidenceToActivate: parser confidence threshold for auto-activation
 *  - enableTryOn: global try-on feature flag
 *  - enriched descriptions aligned with decision layer logic
 *
 * Decision layer precedence (implemented in src/lib/automationDecision.ts):
 *  requireAdminReview > autoActivateProducts > minConfidenceToActivate > readiness
 *
 * This global is the single source of truth for all automation behavior.
 * Per-product overrides via products.automationFlags take precedence over globals
 * ONLY when the global capability is enabled (global = capability, product = intent).
 */
export const AutomationSettings: GlobalConfig = {
  slug: 'automation-settings',
  label: 'Otomasyon Ayarları',
  admin: {
    group: 'Ayarlar',
    description: 'Tüm otomasyon ve yayın kontrolleri — Telegram, kanal dağıtımı, içerik üretimi',
  },
  fields: [
    // ── Ürün Alım Ayarları ────────────────────────────────────
    {
      name: 'productIntake',
      type: 'group',
      label: '📥 Ürün Alım Ayarları',
      fields: [
        {
          name: 'autoActivateProducts',
          type: 'checkbox',
          label: 'Ürünleri Otomatik Aktifleştir',
          defaultValue: false,
          admin: {
            description:
              'Açık: Telegram\'dan gelen ürünler yeterli koşulları sağlarsa "Aktif" olur. ' +
              'Kapalı: Her ürün "Taslak" olarak gelir, admin onayı gerekir.',
          },
        },
        {
          name: 'requireAdminReview',
          type: 'checkbox',
          label: 'Admin Onayı Gerekli',
          defaultValue: true,
          admin: {
            description:
              'Açık: Otomasyon ürünleri admin onayına düşer — autoActivate\'i geçersiz kılar. ' +
              'Kapalı olduğunda autoActivate kararı devreye girer.',
          },
        },
        // Step 12: threshold for auto-activation based on caption parse quality
        {
          name: 'minConfidenceToActivate',
          type: 'number',
          label: 'Minimum Parser Güveni (%) — Otomatik Aktivasyon',
          defaultValue: 60,
          admin: {
            description:
              'Otomatik aktivasyon için minimum parser güven skoru (0–100). ' +
              'Bu değerin altındaki ürünler taslak olarak kalır ve admin incelemesine düşer. ' +
              'Örnek: 60 → parser %60 ve üzeri güvenle ayrıştırdıysa aktifleştirilebilir.',
          },
          validate: (value: any) => {
            if (value === undefined || value === null || value === '') return true
            const n = Number(value)
            if (n < 0 || n > 100) return '⚠️ Güven eşiği 0–100 arasında olmalıdır.'
            return true
          },
        },
      ],
    },
    // ── Kanal Yayın Ayarları ──────────────────────────────────
    {
      name: 'channelPublishing',
      type: 'group',
      label: '📢 Kanal Yayın Ayarları',
      admin: {
        description:
          'Hangi kanallar aktif? Bu togglelar global yetenek kapılarıdır. ' +
          'Ürün düzeyinde channelTargets kanalı hedefleyen ürün niyetini kontrol eder. ' +
          'Her ikisi de aktif olmalı ki kanal yayını gerçekleşsin.',
      },
      fields: [
        {
          name: 'publishWebsite',
          type: 'checkbox',
          label: '🌐 Website Yayını Aktif',
          defaultValue: true,
          admin: {
            description: 'Website kanalı aktif — aktif ürünler sitede görünür.',
          },
        },
        {
          name: 'publishInstagram',
          type: 'checkbox',
          label: '📸 Instagram Yayını Aktif',
          defaultValue: false,
          admin: {
            description:
              'Instagram kanalı aktif. Gerçek yayın henüz bağlı değil — ' +
              'ileride Graph API entegrasyonu ile devreye alınacak (Step 13+).',
          },
        },
        {
          name: 'publishShopier',
          type: 'checkbox',
          label: '🛒 Shopier Yayını Aktif',
          defaultValue: false,
          admin: {
            description:
              'Shopier kanalı aktif. Gerçek yayın henüz bağlı değil — ' +
              'ileride Shopier API entegrasyonu ile devreye alınacak (Step 13+).',
          },
        },
        {
          name: 'publishDolap',
          type: 'checkbox',
          label: '👗 Dolap Yayını Aktif',
          defaultValue: false,
          admin: {
            description:
              'Dolap kanalı aktif. Gerçek yayın henüz bağlı değil — ' +
              'ileride Dolap API entegrasyonu ile devreye alınacak (Step 13+).',
          },
        },
        // ── Step 16+: Social Media Channels ──────────────────────
        {
          name: 'publishX',
          type: 'checkbox',
          label: '𝕏 X (Twitter) Yayını Aktif',
          defaultValue: false,
          admin: {
            description:
              'X (Twitter) kanalı aktif. n8n workflow + X API v2 gerekli. ' +
              'Scaffold — gerçek entegrasyon henüz yapılmadı.',
          },
        },
        {
          name: 'publishFacebook',
          type: 'checkbox',
          label: '📘 Facebook Sayfa Yayını Aktif',
          defaultValue: false,
          admin: {
            description:
              'Facebook Sayfa yayını aktif. Meta Graph API ile Page Post. ' +
              'Scaffold — gerçek entegrasyon henüz yapılmadı.',
          },
        },
        {
          name: 'publishLinkedin',
          type: 'checkbox',
          label: '💼 LinkedIn Yayını Aktif',
          defaultValue: false,
          admin: {
            description:
              'LinkedIn yayını aktif. Organization veya kişisel post. ' +
              'Scaffold — gerçek entegrasyon henüz yapılmadı.',
          },
        },
        {
          name: 'publishThreads',
          type: 'checkbox',
          label: '🧵 Threads Yayını Aktif',
          defaultValue: false,
          admin: {
            description:
              'Threads yayını aktif. Meta Threads API gerekli. ' +
              'Scaffold — gerçek entegrasyon henüz yapılmadı.',
          },
        },
      ],
    },
    // ── İçerik Üretim Ayarları ────────────────────────────────
    {
      name: 'contentGeneration',
      type: 'group',
      label: '✍️ İçerik Üretim Ayarları',
      fields: [
        {
          name: 'autoGenerateBlog',
          type: 'checkbox',
          label: 'Otomatik Blog Üret',
          defaultValue: false,
          admin: {
            description:
              'Aktif ürünler için otomatik SEO blog yazısı üret. ' +
              'Gerçek üretim henüz bağlı değil — scaffold aktif (Step 13+).',
          },
        },
        {
          name: 'autoPublishBlog',
          type: 'checkbox',
          label: 'Blog Yazılarını Otomatik Yayınla',
          defaultValue: false,
          admin: {
            description:
              'Kapalı: Blog yazıları taslak olarak oluşturulur. Açık: Doğrudan yayınlanır.',
          },
        },
        {
          name: 'autoGenerateExtraViews',
          type: 'checkbox',
          label: 'Ek Görseller Otomatik Üret',
          defaultValue: false,
          admin: {
            description:
              'Ürün fotoğraflarından AI ile ek açı görselleri üret (2–4 adet). ' +
              'Gerçek üretim henüz bağlı değil (Step 13+).',
          },
        },
        // Step 12: global try-on feature flag
        {
          name: 'enableTryOn',
          type: 'checkbox',
          label: '👟 Try-On Özelliği Aktif',
          defaultValue: false,
          admin: {
            description:
              'Sanal deneme özelliği — ürün sayfalarında fotoğraf bazlı AI try-on. ' +
              'Gerçek implementasyon henüz yok (Phase 3).',
          },
        },
      ],
    },
    // ── Instagram Token Storage ───────────────────────────────
    // Written automatically by /api/auth/instagram/callback after OAuth.
    // Do NOT edit manually — re-run OAuth to refresh.
    {
      name: 'instagramTokens',
      type: 'group',
      label: '🔑 Instagram Bağlantı Bilgileri',
      admin: {
        description:
          'OAuth akışı tamamlandığında otomatik doldurulur. ' +
          'Yenilemek için /api/auth/instagram/initiate adresini ziyaret et.',
      },
      fields: [
        {
          name: 'accessToken',
          type: 'textarea',
          label: 'Access Token (Long-lived)',
          admin: {
            description: 'Meta long-lived user access token (~60 gün). OAuth callback tarafından yazılır.',
          },
        },
        {
          name: 'userId',
          type: 'text',
          label: 'Instagram Business Account ID',
          admin: {
            description: 'Sayısal Instagram Business Account ID (Facebook User ID değil). Graph API yayınları için gerekli.',
          },
        },
        {
          name: 'expiresAt',
          type: 'date',
          label: 'Token Bitiş Tarihi (yaklaşık)',
          admin: {
            description: 'Token süresi dolduysa OAuth akışını yeniden başlat.',
          },
        },
        {
          name: 'connectedAt',
          type: 'date',
          label: 'Bağlandığı Tarih',
          admin: {
            description: 'Son başarılı OAuth akışının zamanı.',
          },
        },
        {
          name: 'facebookPageId',
          type: 'text',
          label: 'Facebook Sayfa ID',
          admin: {
            description:
              'Sayısal Facebook Sayfa ID (örn: 61576525131424). ' +
              'Fotoğraf yayınlamak için gerekli. ' +
              'OAuth akışı bu alanı doldurmaz — elle girilmeli.',
          },
        },
      ],
    },
    // ── Telegram Ayarları ─────────────────────────────────────
    {
      name: 'telegram',
      type: 'group',
      label: '📱 Telegram Ayarları',
      fields: [
        {
          name: 'groupEnabled',
          type: 'checkbox',
          label: 'Grup Modu Aktif',
          defaultValue: false,
          admin: {
            description: 'Telegram grup mesajlarından ürün alımı aktif.',
          },
        },
        {
          name: 'allowedUserIds',
          type: 'textarea',
          label: 'İzin Verilen Kullanıcı ID\'leri',
          admin: {
            description:
              'Telegram numeric user ID\'leri — her satıra bir ID. ' +
              'Bu kullanıcılar gruptan ürün gönderebilir.',
          },
        },
      ],
    },
  ],
}
