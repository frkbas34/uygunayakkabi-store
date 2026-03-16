'use client'

import React, { useState } from 'react'

type StatusCellProps = {
  cellData?: string
  rowData?: Record<string, unknown>
}

/**
 * Custom cell component for the Products status column.
 * Shows the current status label and — when status is NOT active —
 * renders a small "✅ Aktif Yap" button that immediately sets the
 * product to active without opening the edit page.
 *
 * Server-side publish guard (beforeChange hook) may reject the request
 * if the product is incomplete (e.g. price = 0). This component surfaces
 * that error inline below the status label.
 */
export const StatusCell: React.FC<StatusCellProps> = ({ cellData, rowData }) => {
  const initial = (cellData ?? (rowData?.status as string) ?? 'draft') as string
  const [currentStatus, setCurrentStatus] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const productId = rowData?.id as string | number | undefined

  const statusMeta: Record<string, { icon: string; label: string; color: string }> = {
    active:  { icon: '🟢', label: 'Aktif — Sitede görünür',   color: '#22c55e' },
    soldout: { icon: '🔴', label: 'Tükendi — Stok bitti',     color: '#ef4444' },
    draft:   { icon: '📝', label: 'Taslak — Sitede görünmez', color: '#94a3b8' },
  }

  const meta = statusMeta[currentStatus] ?? { icon: '❓', label: currentStatus, color: '#94a3b8' }
  const isActive = currentStatus === 'active'

  const handleActivate = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!productId || loading) return
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
        credentials: 'include',
      })

      if (res.ok) {
        setCurrentStatus('active')
        return
      }

      // Server rejected — extract the error message
      let msg = 'Güncelleme başarısız. Ürünü açıp kontrol edin.'
      try {
        const body = await res.json()
        // Payload v3 returns { errors: [{ message: '...' }] }
        const payloadMsg = body?.errors?.[0]?.message
        // Our beforeChange hook throws a plain Error, Payload wraps it
        const hookMsg = body?.message
        msg = payloadMsg || hookMsg || msg
      } catch {
        // body not JSON — keep default message
      }
      setErrorMsg(msg)
    } catch {
      setErrorMsg('Bağlantı hatası. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
        <span style={{ color: meta.color, whiteSpace: 'nowrap', fontSize: '13px' }}>
          {meta.icon} {meta.label}
        </span>

        {!isActive && productId && (
          <button
            onClick={handleActivate}
            disabled={loading}
            title="Durumu Aktif olarak değiştir"
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 700,
              background: loading ? '#374151' : '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              lineHeight: '1.6',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >
            {loading ? '⏳' : '✅ Aktif Yap'}
          </button>
        )}
      </div>

      {/* Inline error message — shown when server rejects activation */}
      {errorMsg && (
        <div
          style={{
            fontSize: '11px',
            color: '#fca5a5',
            background: '#450a0a',
            border: '1px solid #7f1d1d',
            borderRadius: '4px',
            padding: '4px 8px',
            maxWidth: '280px',
            lineHeight: '1.4',
            cursor: 'pointer',
          }}
          onClick={() => setErrorMsg(null)}
          title="Kapatmak için tıkla"
        >
          ❌ {errorMsg}
        </div>
      )}
    </div>
  )
}
