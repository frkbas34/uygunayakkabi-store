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
 */
export const StatusCell: React.FC<StatusCellProps> = ({ cellData, rowData }) => {
  const initial = (cellData ?? (rowData?.status as string) ?? 'draft') as string
  const [currentStatus, setCurrentStatus] = useState(initial)
  const [loading, setLoading] = useState(false)

  const productId = rowData?.id

  const statusMeta: Record<string, { icon: string; label: string; color: string }> = {
    active: { icon: '🟢', label: 'Aktif — Sitede görünür', color: '#22c55e' },
    soldout: { icon: '🔴', label: 'Tükendi — Stok bitti', color: '#ef4444' },
    draft: { icon: '📝', label: 'Taslak — Sitede görünmez', color: '#94a3b8' },
  }

  const meta = statusMeta[currentStatus] ?? { icon: '❓', label: currentStatus, color: '#94a3b8' }
  const isActive = currentStatus === 'active'

  const handleActivate = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!productId || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
        credentials: 'include',
      })
      if (res.ok) {
        setCurrentStatus('active')
      }
    } catch {
      // Silent fail — user can still open the product to change status manually
    } finally {
      setLoading(false)
    }
  }

  return (
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
  )
}
