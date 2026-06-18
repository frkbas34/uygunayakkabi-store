'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '905331524843'
const WA_DISPLAY = '0533 152 48 43'
const waLink = `https://wa.me/${WA_NUMBER}`

const T = {
  serif: "'Playfair Display', serif",
  sans: "'Inter', -apple-system, sans-serif",
  text: '#1c1a16',
  red: '#c8102e',
  green: '#25D366',
  full: 999,
}

const catHref = (c: string) => `/ayakkabilar?kategori=${encodeURIComponent(c)}`
const CATS = ['Spor', 'Günlük', 'Klasik', 'Bot', 'Terlik', 'Cüzdan']
// Primary + category items for the slide-in menu (numbered)
const MENU_PRIMARY = [
  { l: 'Ana Sayfa', href: '/' },
  { l: 'Tüm Ayakkabılar', href: '/ayakkabilar' },
]
const MENU_CATS = CATS.map((c) => ({ l: c, href: catHref(c) }))

// Big serif menu item — index number + hover slide & red arrow
function MenuLink({ href, label, index, open, onNavigate }: { href: string; label: string; index: number; open: boolean; onNavigate: () => void }) {
  const [h, setH] = useState(false)
  const num = String(index + 1).padStart(2, '0')
  return (
    <Link
      href={href}
      onClick={onNavigate}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 14,
        animation: open ? 'menuItemIn 0.6s cubic-bezier(.22,1,.36,1) both' : 'none',
        animationDelay: open ? `${0.1 + index * 0.05}s` : '0s',
        opacity: open ? undefined : 0,
      }}
    >
      <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: h ? T.red : 'rgba(28,26,22,0.26)', transition: 'color .35s', width: 18, flexShrink: 0 }}>{num}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 16, transform: h ? 'translateX(10px)' : 'translateX(0)', transition: 'transform .4s cubic-bezier(.22,1,.36,1)' }}>
        <span style={{ fontFamily: T.serif, fontSize: 'clamp(27px,3.3vw,44px)', fontWeight: 500, lineHeight: 1.18, color: h ? T.text : 'rgba(28,26,22,0.3)', transition: 'color .35s' }}>{label}</span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: h ? 1 : 0, transform: h ? 'translateX(0)' : 'translateX(-10px)', transition: 'all .4s cubic-bezier(.22,1,.36,1)' }}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </span>
    </Link>
  )
}

// Centered serif quick link (second header row)
function NavRowLink({ href, label }: { href: string; label: string }) {
  const [h, setH] = useState(false)
  return (
    <Link href={href} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      textDecoration: 'none', fontFamily: T.serif, fontSize: 13, fontWeight: 500,
      letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      color: h ? T.red : T.text, transition: 'color 0.3s ease',
    }}>{label}</Link>
  )
}

export function StorefrontNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mo, setMo] = useState(false)
  const [featHover, setFeatHover] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mo ? 'hidden' : ''
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMo(false) }
    if (mo) window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [mo])

  const close = () => setMo(false)
  const PAD_X = 'clamp(28px, 5vw, 64px)'

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(244,239,230,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(30px) saturate(1.6)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(28,26,22,0.06)' : '1px solid transparent',
        transition: 'all 0.4s cubic-bezier(.22,1,.36,1)',
      }}>
        {/* Row 1 */}
        <div style={{ position: 'relative', maxWidth: 1440, margin: '0 auto', padding: '0 40px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setMo(true)} aria-label="Menüyü aç" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', color: T.text, padding: '6px 2px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="14" y2="17" /></svg>
            <span className="nav-desktop" style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Menü</span>
          </button>

          <Link href="/" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: '0.18em' }}>UYGUN</span>
            <span style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 300, color: T.red, letterSpacing: '0.12em' }}>AYAKKABI</span>
          </Link>

          <a href={waLink} target="_blank" rel="noreferrer" className="nav-desktop" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', background: T.green, border: 'none', padding: '9px 22px', borderRadius: T.full, textDecoration: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            WHATSAPP
          </a>
        </div>

        {/* Row 2 — quick links */}
        <div className="nav-desktop" style={{ borderTop: '1px solid rgba(28,26,22,0.07)' }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 40px', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 38 }}>
            <NavRowLink href="/ayakkabilar" label="Tüm Ayakkabılar" />
            {CATS.map((c) => (<NavRowLink key={c} href={catHref(c)} label={c} />))}
          </div>
        </div>
      </nav>

      {/* Backdrop */}
      <div onClick={close} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: mo ? 'rgba(20,18,14,0.45)' : 'rgba(20,18,14,0)',
        backdropFilter: mo ? 'blur(4px)' : 'none',
        opacity: mo ? 1 : 0, pointerEvents: mo ? 'auto' : 'none',
        transition: 'opacity 0.5s ease, background 0.5s ease',
      }} />

      {/* Slide-in panel */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 210,
        width: 'min(980px, 96vw)', background: '#f8f4ed',
        boxShadow: mo ? '0 0 90px rgba(0,0,0,0.22)' : 'none',
        transform: mo ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.55s cubic-bezier(.22,1,.36,1)',
        display: 'flex', flexDirection: 'row', overflow: 'hidden',
      }}>
        {/* LEFT */}
        <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `20px ${PAD_X} 0` }}>
            <button onClick={close} aria-label="Menüyü kapat" style={{ width: 42, height: 42, borderRadius: '50%', border: '1px solid rgba(28,26,22,0.14)', background: 'none', cursor: 'pointer', color: T.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <Link href="/" onClick={close} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: '0.14em' }}>UYGUN</span>
              <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 300, color: T.red, letterSpacing: '0.08em' }}>AYAKKABI</span>
            </Link>
          </div>

          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: `clamp(20px,3.5vh,40px) ${PAD_X} clamp(14px,2vh,24px)`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(28,26,22,0.34)', marginBottom: 14 }}>Menü</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2px,0.7vh,8px)' }}>
              {MENU_PRIMARY.map((m, i) => (<MenuLink key={m.l} href={m.href} label={m.l} index={i} open={mo} onNavigate={close} />))}
            </div>
            <div style={{ height: 1, background: 'rgba(28,26,22,0.09)', margin: 'clamp(16px,2.4vh,26px) 0' }} />
            <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(28,26,22,0.34)', marginBottom: 14 }}>Kategoriler</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2px,0.7vh,8px)' }}>
              {MENU_CATS.map((m, i) => (<MenuLink key={m.l} href={m.href} label={m.l} index={i + 2} open={mo} onNavigate={close} />))}
            </div>
          </div>

          <div style={{ padding: `clamp(16px,2.2vh,24px) ${PAD_X} clamp(20px,3vh,30px)`, borderTop: '1px solid rgba(28,26,22,0.08)' }}>
            <p style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(28,26,22,0.34)', marginBottom: 8 }}>İletişim</p>
            <a href={waLink} target="_blank" rel="noreferrer" style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.text, textDecoration: 'none', display: 'inline-block', marginBottom: 4 }}>{WA_DISPLAY}</a>
            <p style={{ fontFamily: T.sans, fontSize: 12, color: 'rgba(28,26,22,0.3)', lineHeight: 1.6, marginBottom: 16 }}>Hafta içi 09:00–18:00 · WhatsApp ile 7/24 talep bırakın</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 22px' }}>
              <Link href="/yardim" onClick={close} style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 500, color: 'rgba(28,26,22,0.55)', textDecoration: 'none' }}>Yardım Merkezi</Link>
              <a href={waLink} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: T.sans, fontSize: 13, fontWeight: 500, color: 'rgba(28,26,22,0.55)', textDecoration: 'none' }}>
                WhatsApp
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}><path d="M7 17L17 7M17 7H8M17 7v9" /></svg>
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT — featured image */}
        <Link
          href="/ayakkabilar"
          onClick={close}
          className="nav-desktop"
          onMouseEnter={() => setFeatHover(true)}
          onMouseLeave={() => setFeatHover(false)}
          style={{ width: 'clamp(300px, 36%, 400px)', flexShrink: 0, position: 'relative', overflow: 'hidden', cursor: 'pointer', textDecoration: 'none' }}
        >
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/hero/hero-monk.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', transform: featHover ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.9s cubic-bezier(.22,1,.36,1)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,15,11,0.05) 0%, rgba(20,15,11,0.30) 55%, rgba(20,15,11,0.72) 100%)' }} />
          <div style={{ position: 'absolute', left: 30, right: 30, bottom: 32, color: '#fff' }}>
            <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.85, marginBottom: 8 }}>Yeni Sezon</div>
            <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, lineHeight: 1.2, marginBottom: 16 }}>Öne Çıkan Modeller</div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.55)', paddingBottom: 4, transform: featHover ? 'translateX(4px)' : 'translateX(0)', transition: 'transform 0.4s ease' }}>Keşfet →</span>
          </div>
        </Link>
      </div>

      {/* Local styles: menu item entrance + responsive */}
      <style>{`
        @keyframes menuItemIn { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media(max-width:768px) { .nav-desktop { display: none !important; } }
      `}</style>
    </>
  )
}
