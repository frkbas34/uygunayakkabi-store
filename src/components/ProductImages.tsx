'use client'

import { useState, useRef } from 'react'

type Props = {
  images: string[]
  title: string
}

export function ProductImages({ images, title }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  // D-269: touch refs for mobile swipe
  const touchStartX = useRef<number | null>(null)

  const goNext = () => setActiveIndex((i) => (i + 1) % images.length)
  const goPrev = () => setActiveIndex((i) => (i - 1 + images.length) % images.length)

  // D-269: swipe left = next, swipe right = prev (min 50px delta)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 50) delta > 0 ? goNext() : goPrev()
    touchStartX.current = null
  }

  if (images.length === 0) {
    return (
      <div style={{ aspectRatio: '1/1', background: 'rgba(238,232,222,0.65)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 80 }}>\U0001F45F</span>
      </div>
    )
  }

  return (
    <div>
      {/* D-269: fade-in animation on image change; hide thumbnail scrollbar */}
      <style>{`
        @keyframes pdpImgFadeIn {
          from { opacity: 0.55; }
          to   { opacity: 1; }
        }
        .pdp-main-img { animation: pdpImgFadeIn 0.22s ease; }
        .pdp-thumb-row::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Main image */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '1/1',
          background: 'rgba(238,232,222,0.65)',
          borderRadius: 20,
          overflow: 'hidden',
          marginBottom: 14,
          border: '1px solid rgba(28,26,22,0.06)',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={activeIndex}
          src={images[activeIndex]}
          alt={title}
          className="pdp-main-img"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              aria-label="\u00d6nceki foto\u011fraf"
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(28,26,22,0.08)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1a16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={goNext}
              aria-label="Sonraki foto\u011fraf"
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(28,26,22,0.08)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1a16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            {/* Image counter */}
            <div style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(28,26,22,0.6)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: 999,
              letterSpacing: '0.05em',
            }}>
              {activeIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails - D-269: scrollable row, stronger active ring, softer inactive */}
      {images.length > 1 && (
        <div
          className="pdp-thumb-row"
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            paddingBottom: 4,
          }}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              aria-label={`Foto\u011fraf ${idx + 1}`}
              style={{
                width: 72,
                height: 72,
                borderRadius: 12,
                overflow: 'hidden',
                border: idx === activeIndex
                  ? '2px solid #1c1a16'
                  : '2px solid rgba(28,26,22,0.12)',
                cursor: 'pointer',
                background: 'rgba(238,232,222,0.65)',
                opacity: idx === activeIndex ? 1 : 0.65,
                transition: 'all 0.2s',
                padding: 0,
                flexShrink: 0,
                boxShadow: idx === activeIndex
                  ? '0 0 0 3px rgba(28,26,22,0.15)'
                  : 'none',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`${title} - ${idx + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
