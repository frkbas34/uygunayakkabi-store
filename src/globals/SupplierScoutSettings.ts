import type { GlobalConfig } from 'payload'

/**
 * SupplierScoutSettings — SupplierScout D-278
 *
 * Global runtime settings for the SupplierScout bot.
 * Stores Frank's Telegram chat_id, auto-pause state, global margin config,
 * and the daily report schedule.
 *
 * Frank registers via /start in DM with SupplierScout bot.
 */
export const SupplierScoutSettings: GlobalConfig = {
  slug: 'supplier-scout-settings',
  admin: {
    group: 'SupplierScout',
    description: 'SupplierScout bot global ayarları',
  },
  fields: [
    // ── Frank's DM Chat ID ───────────────────────────────────────────────────
    {
      name: 'frankChatId',
      type: 'number',
      label: "Frank'in Telegram Chat ID",
      admin: {
        description: "Frank /start komutunu SupplierScout bot'a DM gönderince otomatik doldurulur",
      },
    },
    {
      name: 'frankChatIdRegisteredAt',
      type: 'date',
      label: 'Chat ID Kayıt Zamanı',
      admin: { readOnly: true },
    },

    // ── Auto-Create Toggle ───────────────────────────────────────────────────
    {
      name: 'autoPauseActive',
      type: 'checkbox',
      label: '⏸️ Otonom Oluşturma Duraklatıldı',
      defaultValue: false,
      admin: {
        description: '/pause_auto ile durdurulur, /resume_auto ile devam ettirilir. Duraklatılınca sınıflandırma+loglama devam eder ama ürün/tükendi yazılmaz.',
      },
    },
    {
      name: 'autoPausedAt',
      type: 'date',
      label: 'Durdurulma Zamanı',
      admin: { readOnly: true },
    },
    {
      name: 'autoPauseReason',
      type: 'text',
      label: 'Durdurma Nedeni',
    },

    // ── Global Margin Config ─────────────────────────────────────────────────
    {
      name: 'defaultMarginUSD',
      type: 'number',
      label: 'Varsayılan Kar Marjı (USD)',
      defaultValue: 15,
      admin: {
        description: 'Grup bazlı marj yoksa bu değer kullanılır. $50 toptan → $65 site fiyatı',
      },
    },
    {
      name: 'defaultStockQuantity',
      type: 'number',
      label: 'Varsayılan Stok Miktarı',
      defaultValue: 10,
      admin: {
        description: 'Tedarikçiden kesin stok bilinmediğinde kullanılır (supplier_virtual_stock)',
      },
    },
    {
      name: 'usdToTryRate',
      type: 'number',
      label: 'USD/TRY Kuru',
      defaultValue: 32,
      admin: {
        description: 'USD toptan fiyatını TRY site fiyatına çevirmek için. Güncel kuru manuel güncelle.',
      },
    },

    // ── Confidence Thresholds ────────────────────────────────────────────────
    {
      name: 'autoCreateMinScore',
      type: 'number',
      label: 'Oto-Oluşturma Minimum Skoru (0–100)',
      defaultValue: 75,
      admin: {
        description: 'Bu skoru geçemeyen ürünler "needs_review" olarak raporlanır, oluşturulmaz',
      },
    },
    {
      name: 'soldOutAutoApplyMinScore',
      type: 'number',
      label: 'Oto-Tükendi Minimum Skoru (0–100)',
      defaultValue: 80,
      admin: {
        description: 'Bu skoru geçemeyen tükendi sinyalleri DM uyarısı üretir, otomatik uygulanmaz',
      },
    },

    // ── Ops Group Config (Phase 3B) ──────────────────────────────────────────
    // Main Mentix/Uygunops operations group chat ID.
    // Frank sets this once via admin panel after adding @SupplierScout_bot to the group.
    // Used by /forward_wo command to send product cards to the ops group.
    // Never shown in card text — only used as send target.
    {
      name: 'opsGroupChatId',
      type: 'number',
      label: 'Ops Grubu Chat ID',
      admin: {
        description: "Ana Mentix/Uygunops operasyon grubunun Telegram Chat ID'si. /forward_wo komutu bu gruba kart gönderir. @SupplierScout_bot gruba eklendikten sonra ayarla.",
      },
    },
    {
      name: 'opsGroupChatIdSetAt',
      type: 'date',
      label: 'Ops Grubu ID Ayar Zamanı',
      admin: { readOnly: true },
    },

    // ── Daily Report Schedule ────────────────────────────────────────────────
    {
      name: 'dailyReportHour',
      type: 'number',
      label: 'Günlük Rapor Saati (0–23, Istanbul)',
      defaultValue: 23,
      min: 0,
      max: 23,
    },
    {
      name: 'dailyReportMinute',
      type: 'number',
      label: 'Günlük Rapor Dakikası (0–59)',
      defaultValue: 30,
      min: 0,
      max: 59,
    },
    {
      name: 'lastReportSentAt',
      type: 'date',
      label: 'Son Rapor Gönderim Zamanı',
      admin: { readOnly: true },
    },

    // ── Health Monitoring ────────────────────────────────────────────────────
    {
      name: 'lastWebhookReceivedAt',
      type: 'date',
      label: 'Son Webhook Alım Zamanı',
      admin: {
        readOnly: true,
        description: 'Her grup mesajı güncellemesi yapılır. Bu değer 24+ saat eskiyse sorun var.',
      },
    },
    {
      name: 'totalMessagesAllTime',
      type: 'number',
      label: 'Toplam İşlenen Mesaj',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'totalProductsCreatedAllTime',
      type: 'number',
      label: 'Toplam Oluşturulan Ürün',
      defaultValue: 0,
      admin: { readOnly: true },
    },
  ],
}
