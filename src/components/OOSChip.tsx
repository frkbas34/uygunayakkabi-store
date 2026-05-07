'use client'

// ── D-265: OOS size chip — fires CustomEvent so ContactForm can auto-prefill ──

type Props = {
  size: string
}

export function OOSChip({ size }: Props) {
  const handleClick = () => {
    // Notify ContactForm of the tapped OOS size
    window.dispatchEvent(new CustomEvent('oosChipClicked', { detail: { size } }))
    // Smooth-scroll to inquiry form after event dispatch
    requestAnimationFrame(() => {
      document.getElementById('inquiry-form')?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      title="Bu beden için talep bırakmak ister misiniz?"
      style={{
        position: 'relative',
        minWidth: 50,
        height: 50,
        borderRadius: 12,
        border: '1.5px dashed rgba(28,26,22,0.12)',
        background: 'rgba(28,26,22,0.02)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        fontWeight: 600,
        color: 'rgba(28,26,22,0.25)',
        cursor: 'pointer',
        textDecoration: 'line-through',
        textDecorationColor: 'rgba(28,26,22,0.2)',
        transition: 'all 0.2s',
        padding: '4px 12px',
        boxSizing: 'border-box',
      }}
    >
      {size}
    </div>
  )
}
