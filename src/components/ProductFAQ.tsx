'use client'

import { useState } from 'react'

type FAQItem = {
  q: string
  a: string
}

type Props = {
  faq: FAQItem[]
}

// D-261: re-styled to match beige PDP theme
export function ProductFAQ({ faq }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (!faq || faq.length === 0) return null

  return (
    <div style={{ marginTop: 0 }}>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(28,26,22,0.3)', marginBottom: 12 }}>
        SIKÇA SORULAN SORULAR
      </p>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(22px, 2.5vw, 30px)', fontWeight: 700, color: '#1c1a16', marginBottom: 24, letterSpacing: '-0.02em' }}>
        Merak Ettikleriniz
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {faq.map((item, i) => (
          <div key={i} style={{
            border: '1px solid rgba(28,26,22,0.07)',
            borderRadius: 14,
            overflow: 'hidden',
            background: openIndex === i ? 'rgba(238,232,222,0.55)' : 'rgba(238,232,222,0.3)',
            transition: 'background 0.2s',
          }}>
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: '#1c1a16', lineHeight: 1.4, paddingRight: 16 }}>{item.q}</span>
              <span style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: openIndex === i ? '#1c1a16' : 'rgba(28,26,22,0.08)',
                color: openIndex === i ? '#fff' : 'rgba(28,26,22,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 300, transition: 'all 0.2s',
              }}>
                {openIndex === i ? '−' : '+'}
              </span>
            </button>
            {openIndex === i && (
              <div style={{
                padding: '0 20px 18px',
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: 'rgba(28,26,22,0.5)',
                lineHeight: 1.75,
                borderTop: '1px solid rgba(28,26,22,0.06)',
                paddingTop: 14,
              }}>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
