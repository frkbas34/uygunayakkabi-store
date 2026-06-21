/**
 * Claid image enhancement is disabled in the Telegram intake path, but legacy
 * callbacks still import these labels for old inline keyboards.
 */

export const CLAID_MODE_LABELS = {
  cleanup: 'Ürün Temizleme',
  studio: 'Stüdyo Geliştirme',
  creative: 'Kreatif Arka Plan',
} as const

export const CLAID_MODE_DESCRIPTIONS = {
  cleanup: 'Arka plan ve küçük kusurları temizler; ürün formunu değiştirmez.',
  studio: 'Daha temiz stüdyo görünümü hedefler; operatör onayı gerekir.',
  creative: 'Daha kreatif arka plan dener; operatör onayı gerekir.',
} as const
