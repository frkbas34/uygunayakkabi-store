'use client'

import { useEffect, useState } from 'react'

// ── Audit fix: interactive in-stock size chip ────────────────────────────────
// Previously the in-stock PDP size chips were plain <div>s with `cursor: pointer`
// but no click handler, no selected state and no aria — they looked tappable but
// did nothing. This client chip adds:
//   • a visible selected/pressed highlight (+ aria-pressed for a11y)
//   • single-select across the whole size row (via the `sizeChipSelected` event)
//   • carry-over of the chosen size into the inquiry form (ContactForm listens
//     for the same event and pre-fills its size field), then scrolls to it.
// It deliberately mirrors OOSChip's cross-component CustomEvent bridge.

type Props = {
  size: string
  stock: number
  isLow: boolean
}

export function SizeChip({ size, stock, isLow }: Props) {
  const [selected, setSelected] = useState(false)

  useEffect(() => {
    // Single-select: when any size is chosen, this chip is selected only if it
    // matches; an empty size clears all selections.
    const onSelect = (e: Event) => {
      const ce = e as CustomEvent<{ size: string }>
      setSelected(ce.detail.size === size)
    }
    // Choosing an out-of-stock size clears the in-stock selection.
    const onOos = () => setSelected(false)
    window.addEventListener('sizeChipSelected', onSelect)
    window.addEventListener('oosChipClicked', onOos)
    return () => {
      window.removeEventListener('sizeChipSelected', onSelect)
      window.removeEventListener('oosChipClicked', onOos)
    }
  }, [size])

  const handleClick = () => {
    const next = selected ? '' : size
    // Notify sibling chips (single-select) + ContactForm (pre-fill the size field)
    window.dispatchEvent(new CustomEvent('sizeChipSelected', { detail: { size: next } }))
    if (next) {
      requestAnimationFrame(() => {
        document.getElementById('inquiry-form')?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={selected}
      aria-label={`Beden ${size}${isLow ? ` — son ${stock} adet` : ''}`}
      title="Bedeni seçin — talep formuna eklenir"
      style={{
        position: 'relative',
        minWidth: 50,
        height: 50,
        borderRadius: 12,
        border: selected
          ? '2px solid #1c1a16'
          : isLow
            ? '2px solid #d97706'
            : '1px solid rgba(28,26,22,0.1)',
        background: selected
          ? '#1c1a16'
          : isLow
            ? 'rgba(217,119,6,0.08)'
            : 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        fontWeight: 600,
        color: selected ? '#fff' : isLow ? '#92400e' : 'rgba(28,26,22,0.5)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        padding: '4px 12px',
        boxSizing: 'border-box',
      }}
    >
      <span>{size}</span>
      {stock > 0 && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 500,
            color: selected ? 'rgba(255,255,255,0.7)' : isLow ? '#b45309' : 'rgba(28,26,22,0.25)',
            marginTop: -2,
          }}
        >
          ({stock})
        </span>
      )}
      {isLow && !selected && (
        <div
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#d97706',
            border: '2px solid #f4efe6',
          }}
        />
      )}
    </button>
  )
}
