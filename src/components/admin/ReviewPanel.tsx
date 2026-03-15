'use client'

import React from 'react'
import { useFormFields } from '@payloadcms/ui'

type CheckItem = {
  label: string
  detail?: string
  ok: boolean
  warn?: boolean // yellow (optional but recommended) vs red (blocking)
}

/**
 * ReviewPanel — Automation Product Review & Approval Checklist
 *
 * Rendered as a `ui` field on the product edit page.
 * Only visible for non-admin-sourced products (telegram / n8n / automation).
 *
 * Shows:
 *  - Telegram metadata (chat ID, message ID)
 *  - Field completeness checklist
 *  - "Ready to publish" summary
 */
export const ReviewPanel: React.FC = () => {
  // Read relevant fields from the Payload form state
  const title         = useFormFields(([f]) => f['title']?.value) as string | undefined
  const price         = useFormFields(([f]) => f['price']?.value) as number | undefined
  const sku           = useFormFields(([f]) => f['sku']?.value) as string | undefined
  const status        = useFormFields(([f]) => f['status']?.value) as string | undefined
  const source        = useFormFields(([f]) => f['source']?.value) as string | undefined
  const brand         = useFormFields(([f]) => f['brand']?.value) as string | undefined
  const category      = useFormFields(([f]) => f['category']?.value) as string | undefined
  const images        = useFormFields(([f]) => f['images']?.value) as unknown[] | undefined
  const stockQuantity = useFormFields(([f]) => f['stockQuantity']?.value) as number | undefined
  const chatId        = useFormFields(([f]) => f['automationMeta.telegramChatId']?.value) as string | undefined
  const chatType      = useFormFields(([f]) => f['automationMeta.telegramChatType']?.value) as string | undefined
  const msgId         = useFormFields(([f]) => f['automationMeta.telegramMessageId']?.value) as string | undefined
  const fromUserId    = useFormFields(([f]) => f['automationMeta.telegramFromUserId']?.value) as string | undefined
  const lockedVal     = useFormFields(([f]) => f['automationMeta.lockFields']?.value) as boolean | undefined

  // Only render for automation-sourced products
  if (!source || source === 'admin') return null

  const hasImages  = Array.isArray(images) && images.length > 0
  const priceNum   = typeof price === 'number' ? price : Number(price)
  const hasPrice   = !isNaN(priceNum) && priceNum > 0
  const stockNum   = typeof stockQuantity === 'number' ? stockQuantity : Number(stockQuantity)
  const hasStock   = !isNaN(stockNum) && stockNum >= 0

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
        ? `${(images as unknown[]).length} görsel ekli`
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
      ok: true,  // auto-generated so always OK
      warn: !sku, // but warn if not set manually
    },
    {
      label: 'Kategori',
      detail: category ?? 'Seçilmemiş',
      ok: !!category,
      warn: true, // optional but recommended
    },
    {
      label: 'Marka',
      detail: brand ?? 'Girilmemiş',
      ok: true,
      warn: !brand, // optional but recommended
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

      {/* Telegram meta */}
      {(chatId || msgId) && (
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
          {isLocked && (
            <span style={{ color: '#f59e0b' }}>🔒 Alan kilidi aktif</span>
          )}
        </div>
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
