/**
 * supplierScout/classifier.ts
 *
 * Gemini-based Turkish supplier message classifier.
 * Classifies each group message into one of 11 categories using a rich prompt
 * that includes: known Turkish supplier slang, per-group/seller memory context,
 * and Frank's manual corrections as few-shot examples.
 *
 * NOT a regex parser — uses Gemini 2.5 Flash with structured JSON output.
 * Falls back to heuristic classification if Gemini is unavailable.
 *
 * STATUS: IMPLEMENTED (D-278)
 */

import type {
  ClassificationResult,
  MessageClass,
  ConfidenceLevel,
  TgMessage,
  SupplierGroupConfig,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Built-in Turkish Supplier Slang Seed
// ─────────────────────────────────────────────────────────────────────────────

const BUILTIN_SLANG: Record<string, { meaning: string; context: string }> = {
  seri:         { meaning: 'beden serisi (ör: 36–45 arası)', context: 'size' },
  'tam seri':   { meaning: 'tam numara serisi (36–45 eksiksiz)', context: 'size' },
  numara:       { meaning: 'beden/numara', context: 'size' },
  kalıp:        { meaning: 'beden kalıbı/modeli', context: 'size' },
  adet:         { meaning: 'adet/kaç tane', context: 'price' },
  koli:         { meaning: 'koli/kutu (toplu satış birimi)', context: 'price' },
  çıkış:        { meaning: 'yeni çıkış/yeni sezon ürün', context: 'product' },
  güncel:       { meaning: 'güncel stok/mevcut ürün', context: 'product' },
  bitti:        { meaning: 'stok tükendi', context: 'soldout' },
  tükendi:      { meaning: 'stok tükendi', context: 'soldout' },
  kalmadı:      { meaning: 'kalmadı/stok bitti', context: 'soldout' },
  kapandı:      { meaning: 'ürün kapandı/satış durdu', context: 'soldout' },
  rezerve:      { meaning: 'rezerve edilmiş/ayrılmış', context: 'soldout' },
  devam:        { meaning: 'hâlâ devam ediyor/mevcut', context: 'update' },
  aynısı:       { meaning: 'aynı ürün hâlâ var', context: 'update' },
  'sadece':     { meaning: '"sadece X kaldı" → kısmi tükendi', context: 'soldout' },
  'son':        { meaning: '"son X adet" → az stok', context: 'soldout' },
  çift:         { meaning: 'çift (ayakkabı birimi = 1 adet)', context: 'price' },
  'fiyat':      { meaning: 'fiyat', context: 'price' },
  indirim:      { meaning: 'indirim/kampanya', context: 'price' },
  'yeni sezon': { meaning: 'yeni koleksiyon', context: 'product' },
  takım:        { meaning: 'set/takım olarak satış', context: 'product' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Heuristic Fallback (no Gemini)
// ─────────────────────────────────────────────────────────────────────────────

const SOLDOUT_PATTERNS = [
  /\bsold\s*out\b/i,
  /\bout\s*of\s*stock\b/i,
  /\bbitti\b/i,
  /\btükendi\b/i,
  /\bkalmadı\b/i,
  /\bhepsi\s*satıldı\b/i,
  /\bkapandı\b/i,
  /\bbitmiştir\b/i,
  /\bstok\s*yok\b/i,
]

const PARTIAL_SOLDOUT_PATTERNS = [
  /\bsadece\s+\d+\b/i,
  /\bson\s+\d+\s*(adet|çift|tane)\b/i,
  /\b\d+\s*(numara|beden)\s*(kalmadı|bitti|gitti)\b/i,
  /\b(sadece|yalnızca)\s*\d+\s*kaldı\b/i,
]

const STILL_AVAILABLE_PATTERNS = [
  /\bdevam\b/i,
  /\baynısı\s*(var|mevcut)\b/i,
  /\bhâlâ\s*(var|mevcut|devam)\b/i,
  /\bgüncel\b/i,
  /\bvar\s*(hâlâ|hala)\b/i,
]

function heuristicClassify(text: string): Partial<ClassificationResult> {
  const lower = text.toLowerCase()

  for (const p of SOLDOUT_PATTERNS) {
    if (p.test(lower)) {
      return { messageClass: 'sold_out', confidence: 'medium', confidenceScore: 60 }
    }
  }
  for (const p of PARTIAL_SOLDOUT_PATTERNS) {
    if (p.test(lower)) {
      return { messageClass: 'partial_sold_out', confidence: 'medium', confidenceScore: 60 }
    }
  }
  for (const p of STILL_AVAILABLE_PATTERNS) {
    if (p.test(lower)) {
      return { messageClass: 'still_available', confidence: 'low', confidenceScore: 40 }
    }
  }

  // Check for product-like content
  const hasPriceHint = /\$\s*\d+|\d+\s*(dolar|tl|₺|usd|try)|\b\d{2,3}\b/i.test(lower)
  const hasSizeHint  = /\b(3[6-9]|4[0-5])\b|\bnumara\b|\bbeden\b|\bseri\b/i.test(lower)

  if (hasPriceHint && hasSizeHint) {
    return { messageClass: 'new_product', confidence: 'low', confidenceScore: 35 }
  }

  return { messageClass: 'conversation_noise', confidence: 'low', confidenceScore: 30 }
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Gemini Classification Prompt
// ─────────────────────────────────────────────────────────────────────────────

function buildClassificationPrompt(
  messageText: string,
  hasPhoto: boolean,
  groupConfig: SupplierGroupConfig | null,
  recentCorrections: Array<{ original: string; corrected: string; text: string; reason: string }>,
  customTerms: Array<{ term: string; meaning: string; context: string }>,
): string {
  const slangEntries = [
    ...Object.entries(BUILTIN_SLANG).map(([term, data]) => `  "${term}" → ${data.meaning} (${data.context})`),
    ...customTerms.map(t => `  "${t.term}" → ${t.meaning} (${t.context}) [ÖZEL]`),
  ].join('\n')

  const correctionExamples = recentCorrections.length > 0
    ? `\n\nDÜZELTME ÖRNEKLERİ (Frank'in önceki düzeltmeleri — dikkatle uygulandı):\n` +
      recentCorrections.map(c =>
        `  Metin: "${c.text.substring(0, 80)}"\n  Yanlış: ${c.original} → Doğru: ${c.corrected}\n  Neden: ${c.reason}`
      ).join('\n\n')
    : ''

  const groupCtx = groupConfig
    ? `\nGRUP BAĞLAMI: ${groupConfig.groupName} (güven: ${groupConfig.trustScore}/100, para birimi: ${groupConfig.currency})`
    : ''

  return `Sen Türkçe toptan tedarikçi Telegram grubu mesajlarını sınıflandıran bir uzman sistemsin.
Görevin: aşağıdaki mesajı 11 kategoriden birine atamak ve yapılandırılmış JSON döndürmek.
${groupCtx}

TÜRKİYE TEDARIKÇI JARGOНУ (bu terimleri dikkate al):
${slangEntries}
${correctionExamples}

SINIFLANDIRMA KATEGORİLERİ:
1. new_product       — Fiyat + beden + fotoğraf içeren yeni ürün teklifi
2. product_update    — Mevcut ürünün detay güncellemesi
3. price_update      — Fiyat değişikliği
4. size_update       — Beden değişikliği (yeni geldi / bitti)
5. sold_out          — Tam tükendi (bitti, tükendi, kalmadı, kapandı, sold out, out of stock, hepsi satıldı)
6. partial_sold_out  — Kısmi tükendi ("sadece 40 kaldı", "son 2 çift", "42 kalmadı")
7. still_available   — Hâlâ mevcut (devam, aynısı var, güncel)
8. duplicate_repost  — Aynı ürünün yeniden paylaşımı
9. conversation_noise — Sohbet, emoji, soru, teşekkür, fiyat sorgusu — ürün bilgisi YOK
10. admin_announcement — Grup yöneticisinden fiyat listesi, kargo bilgisi, duyuru
11. risk_warning     — Uyarı sinyali (şüpheli içerik, yasadışı önerim, güven sorunu)

KARAR KURALLARI:
- Mesajda "bitti", "tükendi", "kalmadı", "sold out", "out of stock" varsa → sold_out (confidence: high)
- Mesajda "sadece X kaldı", "son X adet", "X numara kalmadı" varsa → partial_sold_out
- Mesajda fiyat ($XX veya XXX TL) + beden aralığı (ör: 36-45) + ürün adı VARsa → new_product
- Fotoğraf VAR = hasPhoto:true → new_product veya product_update olasılığı artar
- Sadece emoji veya kısa sohbet → conversation_noise
- Emin değilsen düşük confidence ver, requiresReview:true yap

MESAJ (fotoğraf var: ${hasPhoto ? 'EVET' : 'HAYIR'}):
"""
${messageText.substring(0, 1500)}
"""

YANIT — Sadece geçerli JSON döndür, başka açıklama ekleme:
{
  "messageClass": "<kategori>",
  "confidence": "high|medium|low|none",
  "confidenceScore": <0-100>,
  "reasoning": "<Türkçe kısa açıklama, max 150 karakter>",
  "detectedLanguageTerms": ["<tespit edilen jargon terimleri>"],
  "isActionable": <true|false>,
  "requiresReview": <true|false>
}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Classifier
// ─────────────────────────────────────────────────────────────────────────────

export async function classifySupplierMessage(
  message: TgMessage,
  groupConfig: SupplierGroupConfig | null,
  recentCorrections: Array<{ original: string; corrected: string; text: string; reason: string }> = [],
  customTerms: Array<{ term: string; meaning: string; context: string }> = [],
): Promise<ClassificationResult> {
  const text = (message.text ?? message.caption ?? '').trim()
  const hasPhoto = Boolean(message.photo && message.photo.length > 0)

  // Empty message with no photo → noise immediately
  if (!text && !hasPhoto) {
    return {
      messageClass: 'conversation_noise',
      confidence: 'high',
      confidenceScore: 95,
      reasoning: 'Boş mesaj — metin ve fotoğraf yok',
      detectedLanguageTerms: [],
      isActionable: false,
      requiresReview: false,
    }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn('[SupplierScout/classifier] GEMINI_API_KEY not set — using heuristic fallback')
    const fallback = heuristicClassify(text)
    return {
      messageClass: fallback.messageClass ?? 'conversation_noise',
      confidence: fallback.confidence ?? 'low',
      confidenceScore: fallback.confidenceScore ?? 30,
      reasoning: 'Heuristik sınıflandırma (Gemini API anahtarı eksik)',
      detectedLanguageTerms: [],
      isActionable: fallback.messageClass === 'new_product' || fallback.messageClass === 'sold_out',
      requiresReview: true,
    }
  }

  const prompt = buildClassificationPrompt(text, hasPhoto, groupConfig, recentCorrections, customTerms)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`)
    }

    const data = await response.json()

    // Gemini 2.5 Flash may return thinking tokens in parts[]; find the actual text part
    const parts: Array<{ text?: string; thought?: boolean }> = data?.candidates?.[0]?.content?.parts ?? []
    const textPart = parts.find(p => p.text && !p.thought) ?? parts[0]
    const rawText = textPart?.text ?? ''

    if (!rawText) {
      throw new Error(`Gemini boş yanıt döndürdü — finish_reason: ${data?.candidates?.[0]?.finishReason ?? 'unknown'}`)
    }

    // Strip markdown code fences if model wraps JSON
    const jsonStr = rawText.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim()

    // Parse JSON from response
    const parsed = JSON.parse(jsonStr)

    // Validate required fields
    const validClasses: MessageClass[] = [
      'new_product', 'product_update', 'price_update', 'size_update',
      'sold_out', 'partial_sold_out', 'still_available', 'duplicate_repost',
      'conversation_noise', 'admin_announcement', 'risk_warning',
    ]
    const validConfidence: ConfidenceLevel[] = ['high', 'medium', 'low', 'none']

    const messageClass = validClasses.includes(parsed.messageClass)
      ? (parsed.messageClass as MessageClass)
      : 'conversation_noise'
    const confidence = validConfidence.includes(parsed.confidence)
      ? (parsed.confidence as ConfidenceLevel)
      : 'low'

    return {
      messageClass,
      confidence,
      confidenceScore: typeof parsed.confidenceScore === 'number' ? Math.min(100, Math.max(0, parsed.confidenceScore)) : 50,
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning.substring(0, 300) : '',
      detectedLanguageTerms: Array.isArray(parsed.detectedLanguageTerms) ? parsed.detectedLanguageTerms : [],
      isActionable: Boolean(parsed.isActionable),
      requiresReview: Boolean