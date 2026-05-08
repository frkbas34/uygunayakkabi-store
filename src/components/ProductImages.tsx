'use client'

import { useState, useRef, useEffect } from 'react'

type Props = {
  images: string[]
  title: string
}

export function ProductImages({ images, title }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // D-269: touch refs for mobile swipe (reused in fullscreen too)
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

  // D-270: Escape key closes fullscreen; body scroll lock while open
  useEffect(() => {
    if (!isFullscreen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isFullscreen])

  if (images.length === 0) {
    return (
      <div style={{ aspectRatio: '1/1', background: 'rgba(238,232,222,0.65)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 80 }}>\U0001F45F</span>
      </div>
    )
  }

  return (
    <div>
      {/* D-269/D-270: animations + scrollbar hide + overlay fade */}
      <style>{`
        @keyframes pdpImgFadeIn {
          from { opacity: 0.55; }
          to   { opacity: 1; }
        }
        .pdp-main-img { animation: pdpImgFadeIn 0.22s ease; }
        .pdp-thumb-row::-webkit-scrollbar { display: none; }
        @keyframes pdpOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .pdp-overlay { animation: pdpOverlayIn 0.18s ease; }
      `}</style>

      {/* D-270: Fullscreen lightbox overlay — tap backdrop or Escape to close */}
      {isFullscreen && (
        <div
          className="pdp-overlay"
          onClick={() => setIsFullscreen(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.93)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsFullscreen(false) }}
            aria-label="Kapat"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.22)',
              color: '#fff',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              zIndex: 1,
            }}
          >
            &#x2715;
          </button>

          {/* Fullscreen image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`fs-${activeIndex}`}
            src={images[activeIndex]}
            alt={title}
            className="pdp-main-img"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '92vw',
              maxHeight: '88vh',
              objectFit: 'contain',
              borderRadius: 12,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />

          {/* Fullscreen prev/next + counter */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                aria-label="Önceki fotoğraf"
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext() }}
                aria-label="Sonraki fotoğraf"
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
              <div style={{
                position: 'absolute',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'rgba(255,255,255,0.65)',
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.06em',
              }}>
                {activeIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Inline main image — D-270: cursor zoom-in, onClick opens fullscreen */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '1/1',
          background: 'rgba(238,232,222,0.65)',
          borderRadius: 20,
          overflow: 'hidden',
          marginBottom: 14,
          border: '1px solid rgba(28,26,22,0.06)',
          cursor: 'zoom-in',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setIsFullscreen(true)}
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

        {/* D-270: Büyüt affordance hint — top-right corner */}
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(28,26,22,0.45)',
          backdropFilter: 'blur(6px)',
          borderRadius: 8,
          padding: '5px 9px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          pointerEvents: 'none',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, color: '#fff', letterSpacing: '0.04em' }}>Büyüt</span>
        </div>

        {/* Navigation Arrows — stopPropagation so they don't open fullscreen */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev() }}
              aria-label="Önceki fotoğraf"
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
              onClick={(e) => { e.stopPropagation(); goNext() }}
              aria-label="Sonraki fotoğraf"
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
              aria-label={`Fotoğraf ${idx + 1}`}
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
