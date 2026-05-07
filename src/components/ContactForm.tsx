'use client'

import { useState, useEffect } from 'react'

// ── D-251: Source-detail capture helpers ─────────────────────────────────────

/**
 * Extract UTM params from the current URL. Returns null for each param that
 * is absent or empty. Called at submit time so no effect on server render.
 */
function captureUtmParams(): { utmSource: string | null; utmMedium: string | null; utmCampaign: string | null } {
  if (typeof window === 'undefined') return { utmSource: null, utmMedium: null, utmCampaign: null }
  const p = new URLSearchParams(window.location.search)
  const clean = (v: string | null) => (v && v.trim() ? v.trim().toLowerCase().slice(0, 200) : null)
  return {
    utmSource: clean(p.get('utm_source')),
    utmMedium: clean(p.get('utm_medium')),
    utmCampaign: clean(p.get('utm_campaign')),
  }
}

/**
 * Extract the referring domain from document.referrer. Returns null if:
 *   - no referrer (direct navigation)
 *   - referrer is the same site (internal navigation)
 * Stores hostname only — no path, no query string, no PII.
 */
function captureReferrer(): string | null {
  if (typeof document === 'undefined') return null
  const ref = document.referrer
  if (!ref) return null
  try {
    const url = new URL(ref)
    if (url.hostname === window.location.hostname) return null
    return url.hostname.toLowerCase().slice(0, 200)
  } catch {
    return null
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type VariantProp = {
  id: string | number
  size: string
  stock: number
}

type Props = {
  productId: string
  /** D-256: Show product title in success state and size context. */
  productTitle?: string | null
  /** D-256: Interactive size chips — clicking pre-fills the size field. */
  variants?: VariantProp[] | null
  /** D-256: Show soldout-specific message copy when true. */
  soldout?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ContactForm({ productId, productTitle, variants, soldout }: Props) {
  const [name, setName]         = useState('')
  const [phone, setPhone]       = useState('')
  const [size, setSize]         = useState('')
  const [chipSelected, setChipSelected] = useState(false)   // D-264: tracks chip vs typed size
  const [oosContext, setOosContext] = useState<string | null>(null) // D-265: OOS size prefill context
  const [status, setStatus]     = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errMsg, setErrMsg]     = useState('')

  // D-265: listen for OOS chip clicks from page.tsx (cross-component via CustomEvent)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ size: string }>
      setSize(ce.detail.size)
      setOosContext(ce.detail.size)
      setChipSelected(false)
    }
    window.addEventListener('oosChipClicked', handler)
    return () => window.removeEventListener('oosChipClicked', handler)
  }, [])

  const availableVariants = (variants ?? []).filter((v) => v.stock > 0)
  const hasVariants = availableVariants.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrMsg('')

    // D-251: capture attribution context at submit time (no effect on render)
    const { utmSource, utmMedium, utmCampaign } = captureUtmParams()
    const referrer = captureReferrer()

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, phone, size, productId,
          // D-251: source-detail — null values dropped by server
          ...(utmSource   ? { utmSource }   : {}),
          ...(utmMedium   ? { utmMedium }   : {}),
          ...(utmCampaign ? { utmCampaign } : {}),
          ...(referrer    ? { referrer }    : {}),
        }),
      })

      if (res.ok) {
        setStatus('success')
        setName('')
        setPhone('')
        setSize('')
        setChipSelected(false)
        setOosContext(null) // D-265: clear OOS context on success
      } else {
        throw new Error('Request failed')
      }
    } catch {
      setStatus('error')
      setErrMsg('Bir hata oluştu. Lütfen tekrar deneyin veya WhatsApp\'tan ulaşın.')
    }
  }

  // ── Success state ───────────────────────────────────────────────────────────
  // D-261: Success state — clearer next-steps context
  if (status === 'success') {
    return (
      <div className="text-center py-6 px-4">
        <div className="text-4xl mb-3">✅</div>
        <p className="font-semibold text-gray-900 text-base mb-1">
          Talebiniz alındı!
        </p>
        {productTitle && (
          <p className="text-sm text-gray-500 mb-3">
            <span className="font-medium text-gray-700">{productTitle}</span> için
            talebinizi aldık.
          </p>
        )}
        <p className="text-sm text-gray-700 font-medium mb-3">
          Sizi en kısa sürede arıyoruz.
        </p>
        <div className="text-left bg-white border border-gray-100 rounded-xl px-4 py-3 space-y-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Ekibimiz sizi telefonla arayacak</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-300">→</span>
            <span>Beden ve teslimat detaylarını netleştireceğiz</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-300">→</span>
            <span>Siparişiniz onaylanacak ve kargoya verilecek</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Soldout notice */}
      {soldout && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Bu ürün şu an tükendi. Bilgi bırakın, yeniden stoğa girdiğinde sizi arayalım.
        </p>
      )}

      {/* D-256: Interactive size chips — only when variants available */}
      {hasVariants && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Beden seçin{' '}
            <span className="text-gray-400 font-normal text-xs">(opsiyonel)</span>
          </p>
          <div className="flex flex-wrap gap-2 mb-1">
            {availableVariants.map((v) => {
              const selected = chipSelected && size === v.size
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    // D-264: use chipSelected to distinguish chip from typed size
                    if (selected) { setChipSelected(false); setSize('') }
                    else { setChipSelected(true); setSize(v.size) }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    selected
                      ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                      : 'bg-white text-gray-800 border-gray-300 hover:border-gray-900'
                  }`}
                >
                  {v.size}
                </button>
              )
            })}
          </div>
          {chipSelected ? (
            <p className="text-xs text-gray-400">
              Seçili beden: <span className="font-medium text-gray-700">{size}</span>
              {' '}·{' '}
              <button
                type="button"
                onClick={() => { setSize(''); setChipSelected(false) }}
                className="text-gray-400 underline hover:text-gray-600"
              >
                temizle
              </button>
            </p>
          ) : (
            /* D-264/D-265: OOS size recovery input with amber context when prefilled */
            <div className="mt-1.5 space-y-1.5">
              {oosContext ? (
                /* D-265: contextual amber banner when OOS chip was tapped */
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-800 font-medium mb-0.5">
                    {oosContext} numara şu an stokta görünmüyor.
                  </p>
                  <p className="text-xs text-amber-700">
                    Talep bırakın, alternatif stok durumunu sizi arayarak bildiririz.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 mb-1">Stokta olmayan beden mi arıyorsunuz?</p>
              )}
              <input
                type="text"
                value={size}
                onChange={(e) => { setSize(e.target.value); if (oosContext && e.target.value !== oosContext) setOosContext(null) }}
                placeholder="Beden numaranızı yazın (Örn: 43)"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 text-gray-700 bg-white ${
                  oosContext
                    ? 'border-amber-300 focus:ring-amber-400'
                    : 'border-gray-200 focus:ring-gray-400'
                }`}
              />
              <p className="text-xs text-gray-400">
                Beden seçmek zorunda değilsiniz — talep bırakın, yardımcı oluruz.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Adınız
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Adınız Soyadınız"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Telefon
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="0(5XX) XXX XX XX"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      {/* Manual size input — only when no interactive chips */}
      {!hasVariants && (
        <div>
          <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
            Beden <span className="text-gray-400 font-normal">(opsiyonel)</span>
          </label>
          <input
            id="size"
            type="text"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="Örn: 42"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-gray-900 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-gray-700 active:scale-[0.98] transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Gönderiliyor…' : 'Talep Oluştur — Beni Arayın'}
      </button>

      {/* D-261: Trust line — slightly stronger */}
      <p className="text-xs text-center text-gray-400">
        🔒 Bilgileriniz yalnızca sipariş desteği için kullanılır. Üçüncü taraflarla paylaşılmaz.
      </p>

      {/* Error */}
      {status === 'error' && errMsg && (
        <p className="text-sm text-center text-red-500">{errMsg}</p>
      )}
    </form>
  )
}
