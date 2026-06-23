'use client'

import React from 'react'
import { useFormFields } from '@payloadcms/ui'
import { formatBrandSafetyReason, scanBrandSafety } from '@/lib/brandSafety'
import { buildChannelDispatchOverview, summarizeChannelDispatchResult } from '@/lib/channelDispatchStatus'
import { countUsableMediaRows } from '@/lib/productMedia'
import { summarizeProductStock, type ProductStockVariantInput } from '@/lib/productStock'
import { PRODUCT_LIFECYCLE_LABELS, deriveProductLifecycle } from '@/lib/productLifecycle'
import { summarizeOperatorReadiness } from '@/lib/operatorReadiness'
import { evaluatePublishReadiness } from '@/lib/publishReadiness'
import { resolveConfiguredTargets } from '@/lib/productChannels'

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
  website:   'Website',
  instagram: '📸 Instagram',
  shopier:   '🛒 Shopier',
  x:         '𝕏 X (Twitter)',
  facebook:  '📘 Facebook',
}

/**
 * ReviewPanel - Operator Product Review & Approval Checklist
 *
 * Rendered as a `ui` field on the product edit page.
 * Visible for admin/manual and automation-sourced products.
 *
 * Shows:
 *  - Telegram metadata (chat ID, message ID, sender)
 *  - Step 11: Caption parse confidence score + warnings
 *  - Step 12: Product decision row (active/draft + reason)
 *  - Step 14: Channel dispatch status (per-channel eligible/dispatched/skipped)
 *  - Field completeness checklist
 *  - "Ready to publish" summary
 */
export const ReviewPanel: React.FC = () => {
  const title         = useFormFields(([f]) => f['title']?.value) as string | undefined
  const price         = useFormFields(([f]) => f['price']?.value) as number | undefined
  const sku           = useFormFields(([f]) => f['sku']?.value) as string | undefined
  const status        = useFormFields(([f]) => f['status']?.value) as string | undefined
  const workflowStatus = useFormFields(([f]) => f['workflow.workflowStatus']?.value) as string | undefined
  const visualStatus = useFormFields(([f]) => f['workflow.visualStatus']?.value) as string | undefined
  const confirmationStatus = useFormFields(([f]) => f['workflow.confirmationStatus']?.value) as string | undefined
  const contentStatus = useFormFields(([f]) => f['workflow.contentStatus']?.value) as string | undefined
  const auditStatus = useFormFields(([f]) => f['workflow.auditStatus']?.value) as string | undefined
  const publishStatus = useFormFields(([f]) => f['workflow.publishStatus']?.value) as string | undefined
  const stockState = useFormFields(([f]) => f['workflow.stockState']?.value) as string | undefined
  const sellable = useFormFields(([f]) => f['workflow.sellable']?.value) as boolean | undefined
  const auditOverallResult = useFormFields(([f]) => f['auditResult.overallResult']?.value) as string | undefined
  const approvedForPublish = useFormFields(([f]) => f['auditResult.approvedForPublish']?.value) as boolean | undefined
  const source        = useFormFields(([f]) => f['source']?.value) as string | undefined
  const brand         = useFormFields(([f]) => f['brand']?.value) as string | undefined
  const category      = useFormFields(([f]) => f['category']?.value) as string | undefined
  const images            = useFormFields(([f]) => f['images']?.value) as unknown[] | undefined
  // v21: also read generativeGallery — AI-approved images count as valid product visuals
  const generativeGallery = useFormFields(([f]) => f['generativeGallery']?.value) as unknown[] | undefined
  const stockQuantity     = useFormFields(([f]) => f['stockQuantity']?.value) as number | undefined
  const variants          = useFormFields(([f]) => f['variants']?.value) as ProductStockVariantInput[] | undefined
  const channelTargets    = useFormFields(([f]) => f['channelTargets']?.value) as string[] | undefined
  const publishWebsite    = useFormFields(([f]) => f['channels.publishWebsite']?.value) as boolean | undefined
  const publishInstagram  = useFormFields(([f]) => f['channels.publishInstagram']?.value) as boolean | undefined
  const publishShopier    = useFormFields(([f]) => f['channels.publishShopier']?.value) as boolean | undefined
  const publishX          = useFormFields(([f]) => f['channels.publishX']?.value) as boolean | undefined
  const publishFacebook   = useFormFields(([f]) => f['channels.publishFacebook']?.value) as boolean | undefined
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

  const effectiveSource = source || 'admin'

  // v21: hasImages = true if product.images OR product.generativeGallery has content.
  // AI-approved images go to generativeGallery (never product.images), so both lanes
  // must be checked to correctly report visual presence.
  const imagesCount   = countUsableMediaRows(images)
  const aiGalleryCount = countUsableMediaRows(generativeGallery)
  const hasImages      = imagesCount > 0 || aiGalleryCount > 0
  const priceNum   = typeof price === 'number' ? price : Number(price)
  const hasPrice   = !isNaN(priceNum) && priceNum > 0
  const stock       = summarizeProductStock({
    stockQuantity,
    variants,
    workflow: { stockState, sellable },
  })
  const hasStock   = stock.hasSellableStock
  const stockDetail = hasStock
    ? `${stock.effectiveStock} adet${stock.hasVariantStockDetails ? ' (varyantlardan)' : ''}`
    : stock.stockState === 'sold_out'
      ? 'Sold out'
      : stock.sellable === false
        ? 'Satisa kapali'
        : '0 veya eksik'
  const channels = {
    publishWebsite,
    publishInstagram,
    publishShopier,
    publishX,
    publishFacebook,
  }
  const activeTargets = resolveConfiguredTargets({ channelTargets, channels })
  const hasTargets = activeTargets.length > 0
  const visibleBrandSafety = scanBrandSafety([
    { field: 'title', text: title ?? '' },
    { field: 'brand', text: brand ?? '' },
  ])
  const visibleBrandSafetyDetail = visibleBrandSafety.safe
    ? visibleBrandSafety.severity === 'low'
      ? 'OK'
      : `Uyari: ${formatBrandSafetyReason(visibleBrandSafety)}`
    : formatBrandSafetyReason(visibleBrandSafety)

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

  const dispatchOverviewRows = buildChannelDispatchOverview(activeTargets, dispatchResults)
  const hasDispatchData = dispatchOverviewRows.length > 0 || !!lastDispatchedAt
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
      detail: stockDetail,
      ok: hasStock,
    },
    {
      label: 'Yayın hedefi',
      detail: hasTargets
        ? activeTargets.map((target) => CHANNEL_LABEL[target] ?? target).join(', ')
        : 'Aktif hedef yok',
      ok: hasTargets,
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
    {
      label: 'Brand safety',
      detail: visibleBrandSafetyDetail || 'OK',
      ok: visibleBrandSafety.safe,
    },
  ]

  const isPublished = status === 'active'
  const isLocked = !!lockedVal
  const publishReadiness = evaluatePublishReadiness({
    id: 'admin-form',
    title,
    brand,
    status,
    price,
    images,
    generativeGallery,
    stockQuantity,
    variants,
    channelTargets,
    channels,
    workflow: {
      workflowStatus,
      visualStatus,
      confirmationStatus,
      contentStatus,
      auditStatus,
      publishStatus,
      stockState,
      sellable,
    },
    auditResult: {
      overallResult: auditOverallResult,
      approvedForPublish,
    },
  })
  const operatorReadiness = summarizeOperatorReadiness({
    status,
    checks,
    readiness: publishReadiness,
  })
  const blockers = operatorReadiness.fieldBlockers
  const warnings = operatorReadiness.warnings
  const readyToPublish = operatorReadiness.isReadyToPublish
  const lifecycleStage = deriveProductLifecycle({
    status,
    workflow: {
      workflowStatus,
      confirmationStatus,
      contentStatus,
      auditStatus,
      stockState,
      sellable,
    },
  })
  const lifecycleLabel = PRODUCT_LIFECYCLE_LABELS[lifecycleStage]

  const SOURCE_LABEL: Record<string, string> = {
    admin: 'Admin Paneli',
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
  const fieldBlockerSummary = blockers.map((b) => b.label).join(', ')
  const readinessBlockerSummary = operatorReadiness.readinessBlockers.slice(0, 3).join('; ')

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
          Operator Kontrol Paneli
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
      {(effectiveSource || chatId || msgId || hasConfidence) && (
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
            {SOURCE_LABEL[effectiveSource] ?? effectiveSource}
          </span>
          <span>
            <strong style={{ color: '#cbd5e1' }}>Lifecycle:</strong>{' '}
            {lifecycleLabel}
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
            Yayin karari
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
              {dispatchOverviewRows.map((r, idx) => {
                const label = CHANNEL_LABEL[r.channel] ?? r.channel
                const dispatchSummary = summarizeChannelDispatchResult(r)
                const eligibleIcon  = r.eligible ? '✅' : '⛔'
                const dispatchIcon =
                  dispatchSummary.state === 'published' ? '✅'
                    : dispatchSummary.state === 'failed' ? '❌'
                      : dispatchSummary.state === 'blocked' ? '⛔'
                        : dispatchSummary.state === 'queued' ? '🕓'
                          : dispatchSummary.state === 'preview' ? '👁️'
                            : '⚠️'
                const webhookIcon = r.webhookConfigured ? '🔗' : '⚠️ URL yok'
                const rowBg = dispatchSummary.state === 'published' ? '#0a1f0f'
                  : dispatchSummary.state === 'blocked' ? '#1a1a1a'
                  : dispatchSummary.state === 'failed' ? '#1f0a0a'
                  : dispatchSummary.state === 'unrecorded' ? '#111827'
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
                            : dispatchSummary.state === 'published' ? '#4ade80'
                            : dispatchSummary.state === 'failed' ? '#f87171'
                            : dispatchSummary.state === 'unrecorded' ? '#94a3b8'
                            : '#f59e0b',
                        }}
                        title="Dispatched"
                      >
                        {dispatchIcon} {dispatchSummary.label}
                      </span>
                      {dispatchSummary.canRedispatch && (
                        <span style={{ color: '#64748b', fontSize: '10px' }}>
                          redispatch mümkün
                        </span>
                      )}
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
                    {/* Reason */}
                    {dispatchSummary.reason && (
                      <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px', paddingLeft: '120px' }}>
                        ↳ {dispatchSummary.state === 'failed' ? 'Hata: ' : ''}{dispatchSummary.reason}
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
                  {dispatchOverviewRows.some(r => !r.webhookConfigured && r.eligible) && (
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

        <div
          style={{
            marginTop: '10px',
            padding: '7px 10px',
            borderRadius: '6px',
            background: publishReadiness.level === 'ready' ? '#052e16' : '#111827',
            border: '1px solid #334155',
            fontSize: '11px',
            color: publishReadiness.level === 'ready' ? '#bbf7d0' : '#cbd5e1',
          }}
        >
          <strong>Central readiness:</strong>{' '}
          {operatorReadiness.readinessPassedCount}/{operatorReadiness.readinessTotalCount} ({publishReadiness.level})
          {operatorReadiness.readinessBlockers.length > 0 && (
            <div style={{ marginTop: '4px', color: '#fca5a5' }}>
              {readinessBlockerSummary}
              {operatorReadiness.readinessBlockers.length > 3 ? ' ...' : ''}
            </div>
          )}
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
                ? '✅ Central readiness tamam. Payload guard fiyat, görsel, stok, hedef kanal ve brand-safety kontrolünü son kez çalıştırır.'
                : `✅ Central readiness tamam. ${warnings.length} önerilen alan eksik; Payload guard son kararı verir.`
              : readinessBlockerSummary
                ? `❌ Central readiness blokları: ${readinessBlockerSummary}${operatorReadiness.readinessBlockers.length > 3 ? ' ...' : ''}`
                : `❌ ${fieldBlockerSummary} eksik veya bloklu. Payload guard yayına almayacak.`}
          </div>
        )}
      </div>
    </div>
  )
}
