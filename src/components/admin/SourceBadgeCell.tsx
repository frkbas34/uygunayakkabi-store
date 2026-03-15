'use client'

import React from 'react'

type SourceBadgeCellProps = {
  cellData?: string
  rowData?: Record<string, unknown>
}

const SOURCE_META: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  telegram: { label: 'Telegram', bg: '#0ea5e9', color: '#fff', icon: '📱' },
  n8n:      { label: 'Otomasyon', bg: '#f97316', color: '#fff', icon: '⚙️' },
  admin:    { label: 'Admin', bg: '#4b5563', color: '#e5e7eb', icon: '🖥️' },
  api:      { label: 'API', bg: '#8b5cf6', color: '#fff', icon: '🔌' },
  import:   { label: 'İçe Aktarım', bg: '#10b981', color: '#fff', icon: '📥' },
}

/**
 * Renders a colored pill badge for the product source column in the admin list.
 * Automation-sourced products (telegram, n8n) stand out visually from admin-created ones.
 */
export const SourceBadgeCell: React.FC<SourceBadgeCellProps> = ({ cellData }) => {
  const value = (cellData ?? 'admin') as string
  const meta = SOURCE_META[value] ?? { label: value, bg: '#6b7280', color: '#fff', icon: '❓' }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 700,
        background: meta.bg,
        color: meta.color,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
        lineHeight: '1.8',
      }}
    >
      {meta.icon} {meta.label}
    </span>
  )
}
