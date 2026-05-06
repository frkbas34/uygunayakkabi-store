'use client'

import { useState } from 'react'

type Props = {
  productId: string
}

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
 *   - referrer is the same site (internal navigation — already captured by
 *     the product relationship, not useful to duplicate here)
 * Returns only the hostname (e.g. 'www.instagram.com'), not the full URL,
 * to avoid storing search queries or other PII in the referrer path.
 */
function captureReferrer(): string | null {
  if (typeof document === 'undefined') return null
  const ref = document.referrer
  if (!ref) return null
  try {
    const url = new URL(ref)
    if (url.hostname === window.location.hostname) return null // same-site
    return url.hostname.toLowerCase().slice(0, 200)
  } catch {
    return null
  }
}

export function ContactForm({ productId }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [size, setSize] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')

    // D-251: capture attribution context at submit time (no effect on render)
    const { utmSource, utmMedium, utmCampaign } = captureUtmParams()
    const referrer = captureReferrer()

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, phone, size, productId,
          // D-251: source-detail — null values are dropped by the server,
          // never stored as empty strings
          ...(utmSource ? { utmSource } : {}),
          ...(utmMedium ? { utmMedium } : {}),
          ...(utmCampaign ? { utmCampaign } : {}),
          ...(referrer ? { referrer } : {}),
        }),
      })

      if (res.ok) {
        setStatus('success')
        setMessage('Talebiniz alındı! En kısa sürede sizi arayacağız.')
        setName('')
        setPhone('')
        setSize('')
      } else {
        throw new Error('Request failed')
      }
    } catch {
      setStatus('error')
      setMessage('Bir hata oluştu. Lütfen tekrar deneyin.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Telefon Numarası
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="0(5XX) XXX XX XX"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>
      <div>
        <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
          Beden (Opsiyonel)
        </label>
        <input
          id="size"
          type="text"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="Örn: 42"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-gray-900 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-gray-800 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Gönderiliyor...' : 'Gönder — Beni Arayın'}
      </button>
      {message && (
        <p className={`text-sm text-center ${status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {message}
        </p>
      )}
    </form>
  )
}
