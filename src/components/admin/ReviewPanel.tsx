'use client'

import React from 'react'
import { useFormFields } from '@payloadcms/ui'

type CheckItem = {
  label: string
  detail?: string
  ok: boolean
  warn?: boolean // yellow (optional but recommended) vs red (blocking)
}

// ── Steps 14+16: Dispatch result shape (matches ChannelDispatchResult in channelDispatch.ts) ──
type DispatchChannelResult = {
  channel: string
  eligible: boolean
  dispatched: boolean
  webhookConfigured: boolean
  skippedReason?: string
  error?: string
  responseStatus?: number
  /**
   * Step 16: Structured result body from the n8n workflow response.
   * For Instagram real workflow: { mode, success, instagramPostId, instagramPermalink,
   *   caption, mediaUrl, mediaCount, publishedAt, ... }
   */
  publishResult?: Record<string, unknown>
  timestamp?: string
}

const CHANNEL_LABEL: Record<string, string> = {
  instagram: '📸 Instagram',
  shopier:   '🛒 Shopier',
  dolap:     '👗 Dolap',
  x:         '𝕏 X (Twitter)',
  facebook:  '📘 Facebook',
  linkedin:  '💼 LinkedIn',
  threads:   '🧵 Threads',
}

/**
 * ReviewPanel — Automation Product Review & Approval Checklist
 *
 * Rendered as a `ui` field on the product edit page.
 * Only visible for non-admin-sourced products (telegram / n8n / automation).
 *
 * Shows:
 *  - Telegram metadata (chat ID, message ID, sender)
 *  - Step 11: Caption parse confidence score + warnings
 *  - Step 12: Automation decision row (active/draft + reason)
 *  - Step 14: Channel dispatch status (per-channel eligible/dispatched/skipped)
 *  - Field completeness checklist
 *  - "Ready to publish" summary
 */
export const ReviewPanel: React.FC = () => {
  const title         = useFormFields(([f]) => f['title']?.value) as string | undefined
  const price         = useFormFields(([f]) => f['price']?.value) as number | undefined
  const sku           = useFormFields(([f]) => f['sku']?.value) as string | undefined
  const status        = useFormFields(([f]) => f['status']?.value) as string | undefined
  const source        = useFormFields(([f]) => f['source']?.value) as string | undefined
  const brand         = useFormFields(([f]) => f['brand']?.value) as string | undefined
  const category      = useFormFields(([f]) => f['category']?.value) as string | undefined
  const images            = useFormFields(([f]) => f['images']?.value) as unknown[] | undefined
  // v21: also read generativeGallery — AI-approved images count as valid product visuals
  const generativeGallery = useFormFields(([f]) => f['generativeGallery']?.value) as unknown[] | undefined
  const stockQuantity     = useFormFields(([f]) => f['stockQuantity']?.value) as number | undefined
  // Telegram meta
  const chatId        = useFormFields(([f]) => f['automationMeta.telegramChatId']?.value) as string | undefined
  const chatType      = useFormFields(([f]) => f['automationMeta.telegramChatType']?.value) as string | undefined
  const msgId         = useFormFields(([f]) => f['automationMeta.telegramMessageId']?.value) as string | undefined
  const fromUserId    = useFormFields(([f]) => f['automationMeta.telegramFromUserId']?.value) as string | undefined
  const lockedVal     = useFormFields(([f]) => f['automationMeta.lockFields']?.value) as boolean | undefined
  // Step 11: Parser meta
  const rawCaption       = useFormFields(([f]) => f['automationMeta.rawCaption']?.value) as string | undefined
  const parseWarningsRaw = useFormFields(([f]) => f['automationMeta.parseWarnings']?.value) as string | undefined
  const parseConfidence  = useFormFields(([f]) => f['automationMeta.parseConfidence']?.value) as number | undefined
  // Step 12: Decision meta
  const autoDecision       = useFormFields(([f]) => f['automationMeta.autoDecision']?.value) as string | undefined
  const autoDecisionReason = useFormFields(([f]) => f['automationMeta.autoDecisionReason']?.value) as string | undefined
  // Step 14: Dispatch meta
  const dispatchedChannelsRaw = useFormFields(([f]) => f['sourceMeta.dispatchedChannels']?.value) as string | undefined
  const lastDispatchedAt      = useFormFields(([f]) => f['sourceMeta.lastDispatchedAt']?.value) as string | undefined
  const dispatchNotesRaw      = useFormFields(([f]) => f['sourceMeta.dispatchNotes']?.value) as string | undefined
  const forceRedispatch       = useFormFields(([f]) => f['sourceMeta.forceRedispatch']?.value) as boolean | undefined

  // Only render for automation-sourced products
  if (!source || source === 'admin') return null

  // v21: hasImages = true if product.images OR product.generativeGallery has content.
  // AI-approved images go to generativeGallery (never product.images), so both lanes
  // must be checked to correctly report visual presence.
  const imagesCount   = Array.isArray(images) ? images.length : 0
  const aiGalleryCount = Array.isArray(generativeGallery) ? generativeGallery.length : 0
  const hasImages      = imagesCount > 0 || aiGalleryCount > 0
  const priceNum   = typeof price === 'number' ? price : Number(price)
  const hasPrice   = !isNaN(priceNum) && priceNum > 0
  const stockNum   = typeof stockQuantity === 'number' ? stockQuantity : Number(stockQuantity)
  const hasStock   = !isNaN(stockNum) && stockNum >= 0

  // Parse warnings from JSON string
  let parseWarnings: string[] = []
  if (parseWarningsRaw) {
    try {
      const parsed = JSON.parse(parseWarningsRaw)
      if (Array.isArray(parsed)) parseWarnings = parsed
    } catch { /* Non-critical */ }
  }

  const confidenceNum = typeof parseConfidence === 'number' ? parseConfidence :
    (parseConfidence !== undefined ? Number(parseConfidence) : undefined)
  const hasConfidence = confidenceNum !== undefined && !isNaN(confidenceNum)

  // Parse dispatch notes from JSON string
  let dispatchResults: DispatchChannelResult[] = []
  if (dispatchNotesRaw) {
    try {
      const parsed = JSON.parse(dispatchNotesRaw)
      if (Array.isArray(parsed)) dispatchResults = parsed
    } catch { /* Non-critical */ }
  }

  // Parse dispatched channels list
  let dispatchedChannels: string[] = []
  if (dispatchedChannelsRaw) {
    try {
      const parsed = JSON.parse(dispatchedChannelsRaw)
      if (Array.isArray(parsed)) dispatchedChannels = parsed
    } catch { /* Non-critical */ }
  }

  const hasDispatchData = dispatchResults.length > 0 || !!lastDispatchedAt
  const isActive = status === 'active'

  // Format dispatch timestamp for display
  function formatDispatchTime(iso: string | undefined): string {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    } catch { return iso }
  }

  const checks: CheckItem[] = [
    {
      label: 'Ürün adı',
      detail: title ? `"${title.substring(0, 40)}${title.length > 40 ? '…' : ''}"` : 'Eksik',
      ok: !!(title && title.trim().length > 2),
    },
    {
      label: 'Satış fiyatı',
      detail: hasPrice ? `₺${priceNum.toLocaleString('tr-TR')}` : 'Girilmemiş',
      ok: hasPrice,
    },
    {
      label: 'Görsel',
      detail: hasImages
        ? (() => {
            const parts: string[] = []
            if (imagesCount > 0) parts.push(`${imagesCount} ürün görseli`)
            if (aiGalleryCount > 0) parts.push(`${aiGalleryCount} AI görseli`)
            return parts.join(' + ')
          })()
        : 'Görsel yok',
      ok: hasImages,
    },
    {
      label: 'Stok adedi',
      detail: hasStock ? `${stockNum} adet` : 'Girilmemiş (varsayılan: 1)',
      ok: true,
      warn: !hasStock || stockNum === 0,
    },
    {
      label: 'SKU / Stok kodu',
      detail: sku ?? 'Otomatik oluşturulacak',
      ok: true,
      warn: !sku,
    },
    {
      label: 'Kategori',
      detail: category ?? 'Seçilmemiş',
      ok: !!category,
      warn: !category,
    },
    {
      label: 'Marka',
      detail: brand ?? 'Girilmemiş',
      ok: true,
      warn: !brand,
    },
  ]

  const blockers = checks.filter(c => !c.ok && !c.warn)
  const warnings = checks.filter(c => !c.ok && c.warn)
  const readyToPublish = blockers.length === 0
  const isPublished = status === 'active'
  const isLocked = !!lockedVal

  const SOURCE_LABEL: Record<string, string> = {
    telegram: '📱 Telegram',
    n8n: '⚙️ n8n Otomasyon',
    api: '🔌 API',
    import: '📥 İçe Aktarım',
  }

  // Confidence color: green ≥60, yellow 30-59, red <30
  const confidenceColor = !hasConfidence ? '#64748b'
    : confidenceNum! >= 60 ? '#22c55e'
    : confidenceNum! >= 30 ? '#f59e0b'
    : '#ef4444'

  return (
    <div
      style={{
        margin: '0 0 24px 0',
        border: '1px solid #334155',
        borderRadius: '10px',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: isPublished ? '#14532d' : '#1e293b',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9' }}>
          🤖 Otomasyon Kontrol Paneli
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 10px',
            borderRadius: '9999px',
            background: isPublished ? '#22c55e' : readyToPublish ? '#f59e0b' : '#ef4444',
            color: '#fff',
          }}
        >
          {isPublished
            ? '✅ Yayında'
            : readyToPublish
            ? '✅ Yayına Hazır'
            : '⚠️ Eksikler Var'}
        </span>
      </div>

      {/* Telegram + parser meta */}
      {(chatId || msgId || hasConfidence) && (
        <div
          style={{
            background: '#0f172a',
            padding: '8px 16px',
            fontSize: '11px',
            color: '#94a3b8',
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            borderBottom: '1px solid #334155',
          }}
        >
          <span>
            <strong style={{ color: '#cbd5e1' }}>Kaynak:</strong>{' '}
            {SOURCE_LABEL[source!] ?? source}
          </span>
          {chatType && (
            <span>
              <strong style={{ color: '#cbd5e1' }}>Tip:</strong>{' '}
              {chatType === 'supergroup' || chatType === 'group' ? '👥 Grup' : '💬 DM'}
            </span>
          )}
          {chatId && (
            <span>
              <strong style={{ color: '#cbd5e1' }}>Chat ID:</strong> {chatId}
            </span>
          )}
          {msgId && (
            <span>
              <strong style={{ color: '#cbd5e1' }}>Mesaj ID:</strong> {msgId}
            </span>
          )}
          {fromUserId && (
            <span>
              <strong style={{ color: '#cbd5e1' }}>Gönderen:</strong> {fromUserId}
            </span>
          )}
          {/* Step 11: parse confidence badge */}
          {hasConfidence && (
            <span>
              <strong style={{ color: '#cbd5e1' }}>Parser güveni:</strong>{' '}
              <span style={{ color: confidenceColor, fontWeight: 700 }}>
                {confidenceNum}%
              </span>
            </span>
          )}
          {isLocked && (
            <span style={{ color: '#f59e0b' }}>🔒 Alan kilidi aktif</span>
          )}
        </div>
      )}

      {/* Step 12: Decision row — why the product got this status */}
      {autoDecision && (
        <div
          style={{
            background: autoDecision === 'active' ? '#052e16' : '#1c1917',
            padding: '8px 16px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', minWidth: '100px' }}>
            Otomasyon kararı
          </span>
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: autoDecision === 'active' ? '#4ade80' : '#f59e0b',
              }}
            >
              {autoDecision === 'active' ? '✅ Aktif edildi' : '📝 Taslak bırakıldı'}
            </span>
            {autoDecisionReason && (
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {autoDecisionReason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 14: Channel Dispatch Status ───────────────────────────────── */}
      {isActive && (
        <div
          style={{
            background: '#0c1628',
            borderBottom: '1px solid #334155',
          }}
        >
          {/* Section header */}
          <div
            style={{
              padding: '7px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: hasDispatchData ? '1px solid #1e2d44' : undefined,
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              📤 Kanal Dispatch Durumu
            </span>
            {lastDispatchedAt && (
              <span style={{ fontSize: '10px', color: '#334155' }}>
                {formatDispatchTime(lastDispatchedAt)}
              </span>
            )}
            {forceRedispatch && (
              <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>
                🔄 Redispatch bekliyor…
              </span>
            )}
          </div>

          {hasDispatchData ? (
            /* Per-channel result rows */
            <div style={{ padding: '6px 0' }}>
              {dispatchResults.map((r, idx) => {
                const label = CHANNEL_LABEL[r.channel] ?? r.channel
                const eligibleIcon  = r.eligible ? '✅' : '⛔'
                const dispatchIcon  = !r.eligible ? '—'
                  : r.dispatched    ? '✅'
                  : r.error         ? '❌'
                  : '⚠️'
                const webhookIcon = r.webhookConfigured ? '🔗' : '⚠️ URL yok'
                const rowBg = r.dispatched ? '#0a1f0f'
                  : !r.eligible     ? '#1a1a1a'
                  : r.error         ? '#1f0a0a'
                  : '#1a1500'

                return (
                  <div
                    key={idx}
                    style={{
                      background: rowBg,
                      padding: '5px 16px',
                      borderBottom: '1px solid #1a2332',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {/* Channel name */}
                      <span style={{ color: '#94a3b8', fontWeight: 700, minWidth: '110px' }}>
                        {label}
                      </span>
                      {/* Eligible */}
                      <span style={{ color: r.eligible ? '#86efac' : '#64748b' }} title="Eligible">
                        {eligibleIcon} uygun
                      </span>
                      {/* Dispatched */}
                      <span
                        style={{
                          color: !r.eligible ? '#334155'
                            : r.dispatched ? '#4ade80'
                            : r.error ? '#f87171'
                            : '#f59e0b',
                        }}
                        title="Dispatched"
                      >
                        {dispatchIcon} {r.dispatched ? 'gönderildi' : r.eligible ? 'gönderilemedi' : 'atlandı'}
                      </span>
                      {/* Webhook */}
                      <span style={{ color: r.webhookConfigured ? '#475569' : '#92400e' }} title="Webhook URL">
                        {webhookIcon}
                      </span>
                      {/* HTTP status */}
                      {r.responseStatus !== undefined && (
                        <span style={{ color: r.responseStatus < 300 ? '#22d3ee' : '#f87171' }}>
                          HTTP {r.responseStatus}
                        </span>
                      )}
                    </div>
                    {/* Skip reason */}
                    {r.skippedReason && (
                      <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px', paddingLeft: '120px' }}>
                        ↳ {r.skippedReason}
                      </div>
                    )}
                    {/* Error */}
                    {r.error && (
                      <div style={{ fontSize: '10px', color: '#f87171', marginTop: '2px', paddingLeft: '120px' }}>
                        ↳ Hata: {r.error}
                      </div>
                    )}
                    {/* Step 16: publishResult — channel-specific publish outcome */}
                    {!!r.publishResult && r.channel === 'instagram' && (
                      <div style={{ marginTop: '4px', paddingLeft: '120px' }}>
                        {r.publishResult.mode === 'published' && (
                          <div style={{ fontSize: '10px', color: '#4ade80' }}>
                            ✅ Instagram&apos;a yayınlandı
                            {!!r.publishResult.instagramPostId && (
                              <span style={{ color: '#64748b' }}>
                                {' '}· Post ID: <code style={{ fontSize: '10px', color: '#93c5fd' }}>{String(r.publishResult.instagramPostId)}</code>
                              </span>
                            )}
                            {!!r.publishResult.instagramPermalink && (
                              <span>
                                {' '}·{' '}
                                <a
                                  href={String(r.publishResult.instagramPermalink)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#818cf8', fontSize: '10px' }}
                                >
                                  🔗 Gönderiyi gör
                                </a>
                              </span>
                            )}
                          </div>
                        )}
                        {r.publishResult.mode === 'no-credentials' && (
                          <div style={{ fontSize: '10px', color: '#f59e0b' }}>
                            ⚠️ Instagram kimlik bilgileri yapılandırılmamış
                            {!!r.publishResult.reason && (
                              <span style={{ color: '#64748b' }}> — {String(r.publishResult.reason)}</span>
                            )}
                          </div>
                        )}
                        {r.publishResult.mode === 'bypass' && (
                          <div style={{ fontSize: '10px', color: '#64748b' }}>
                            ⏸ Instagram yayını bypass modda (INSTAGRAM_BYPASS_PUBLISH=true)
                          </div>
                        )}
                        {r.publishResult.mode === 'api-error' && (
                          <div style={{ fontSize: '10px', color: '#f87171' }}>
                            ❌ Instagram API hatası
                            {!!r.publishResult.apiError && (
                              <span style={{ color: '#94a3b8' }}> — {String(r.publishResult.apiError)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Timestamp */}
                    {r.timestamp && (
                      <div style={{ fontSize: '10px', color: '#334155', marginTop: '1px', paddingLeft: '120px' }}>
                        {formatDispatchTime(r.timestamp)}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Summary line */}
              {dispatchedChannels.length > 0 ? (
                <div style={{ padding: '5px 16px', fontSize: '11px', color: '#4ade80' }}>
                  ✅ İletilen: {dispatchedChannels.join(', ')}
                </div>
              ) : (
                <div style={{ padding: '5px 16px', fontSize: '11px', color: '#475569' }}>
                  ℹ️ Hiçbir kanala iletilmedi
                  {dispatchResults.some(r => !r.webhookConfigured && r.eligible) && (
                    <span style={{ color: '#92400e' }}> — webhook URL yapılandırılmamış</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* No dispatch data yet */
            <div style={{ padding: '8px 16px', fontSize: '11px', color: '#334155' }}>
              Henüz dispatch gerçekleşmedi.
              {!isActive && ' Ürün aktifleştirildiğinde dispatch tetiklenir.'}
            </div>
          )}
        </div>
      )}

      {/* Pending dispatch hint — product not yet active */}
      {!isActive && (
        <div
          style={{
            background: '#111827',
            padding: '6px 16px',
            borderBottom: '1px solid #334155',
            fontSize: '11px',
            color: '#334155',
          }}
        >
          📤 Kanal dispatch: ürün aktif edildiğinde otomatik tetiklenir
        </div>
      )}

      {/* Step 11: Parse warnings row */}
      {parseWarnings.length > 0 && (
        <div
          style={{
            background: '#1c1917',
            padding: '8px 16px',
            borderBottom: '1px solid #334155',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            Parser Uyarıları
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {parseWarnings.map((w, i) => (
              <div key={i} style={{ fontSize: '11px', color: '#fbbf24', display: 'flex', gap: '4px' }}>
                <span>⚡</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 11: Raw caption preview */}
      {rawCaption && (
        <details
          style={{
            background: '#0f172a',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <summary
            style={{
              padding: '6px 16px',
              fontSize: '10px',
              color: '#475569',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              fontWeight: 700,
            }}
          >
            📋 Ham Mesaj (debug)
          </summary>
          <pre
            style={{
              margin: 0,
              padding: '8px 16px',
              fontSize: '11px',
              color: '#64748b',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {rawCaption}
          </pre>
        </details>
      )}

      {/* Step 14: Raw dispatch notes (collapsible debug) */}
      {dispatchNotesRaw && (
        <details
          style={{
            background: '#0a0f1a',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <summary
            style={{
              padding: '6px 16px',
              fontSize: '10px',
              color: '#334155',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              fontWeight: 700,
            }}
          >
            📤 Ham Dispatch Notları (debug)
          </summary>
          <pre
            style={{
              margin: 0,
              padding: '8px 16px',
              fontSize: '10px',
              color: '#334155',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {(() => {
              try { return JSON.stringify(JSON.parse(dispatchNotesRaw), null, 2) }
              catch { return dispatchNotesRaw }
            })()}
          </pre>
        </details>
      )}

      {/* Checklist */}
      <div style={{ padding: '12px 16px', background: '#1e293b' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '8px',
          }}
        >
          Yayın Öncesi Kontrol
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {checks.map((c) => {
            const icon = c.ok ? '✅' : c.warn ? '⚡' : '❌'
            const textColor = c.ok ? '#86efac' : c.warn ? '#fde68a' : '#fca5a5'
            return (
              <div
                key={c.label}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '6px',
                  fontSize: '12px',
                }}
              >
                <span>{icon}</span>
                <span style={{ color: '#cbd5e1', minWidth: '110px' }}>{c.label}</span>
                <span style={{ color: textColor, fontSize: '11px' }}>{c.detail}</span>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        {!isPublished && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: readyToPublish ? '#14532d' : '#450a0a',
              fontSize: '12px',
              color: readyToPublish ? '#bbf7d0' : '#fecaca',
            }}
          >
            {readyToPublish
              ? blockers.length === 0 && warnings.length === 0
                ? '✅ Tüm alanlar tam. "Aktif Yap" butonunu kullanarak yayına alabilirsiniz.'
                : `✅ Zorunlu alanlar tamam. ${warnings.length} önerilen alan eksik — yine de yayınlayabilirsiniz.`
              : `❌ ${blockers.map((b) => b.label).join(', ')} alanları eksik. Yayına alınmadan önce tamamlanmalı.`}
          </div>
        )}
      </div>
    </div>
  )
}
