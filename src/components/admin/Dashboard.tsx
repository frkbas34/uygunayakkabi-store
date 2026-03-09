'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

// ── Colors ──────────────────────────────────────────────────────────────
const C = {
  bg: '#0d1117',
  card: '#161b22',
  border: '#21262d',
  borderLight: '#30363d',
  text: '#e6edf3',
  textMuted: '#8b949e',
  textDim: '#6e7681',
  accent: '#c8102e',
  accentHover: '#a50d26',
  accentSoft: 'rgba(200, 16, 46, 0.15)',
  green: '#3fb950',
  greenSoft: 'rgba(63, 185, 80, 0.12)',
  blue: '#58a6ff',
  blueSoft: 'rgba(88, 166, 255, 0.12)',
  orange: '#d29922',
  orangeSoft: 'rgba(210, 153, 34, 0.12)',
  purple: '#bc8cff',
  purpleSoft: 'rgba(188, 140, 255, 0.12)',
  pink: '#f778ba',
  pinkSoft: 'rgba(247, 120, 186, 0.12)',
}

// ── Quick-access card ─────────────────────────────────────────────────
function QuickCard({
  href,
  icon,
  title,
  subtitle,
  color,
}: {
  href: string
  icon: string
  title: string
  subtitle: string
  color: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.transform = 'translateY(-3px)'
          el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
          el.style.borderColor = C.borderLight
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'none'
          el.style.borderColor = C.border
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{title}</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
    </Link>
  )
}

// ── Step card ─────────────────────────────────────────────────────────
function StepCard({
  num,
  title,
  desc,
}: {
  num: string
  title: string
  desc: string
}) {
  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '16px 18px',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          minWidth: 30,
          height: 30,
          background: C.accent,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 800,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        {num}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{title}</div>
        <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 3, lineHeight: 1.6 }}>
          {desc}
        </div>
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: string
  label: string
  value: string
  color: string
  bgColor: string
}) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  )
}

// ── Main Dashboard ───────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState({ products: '—', orders: '—', media: '—', inquiries: '—' })

  useEffect(() => {
    async function fetchStats() {
      try {
        const [prodRes, ordRes, medRes, inqRes] = await Promise.all([
          fetch('/api/products?limit=0&depth=0').then(r => r.json()).catch(() => null),
          fetch('/api/orders?limit=0&depth=0').then(r => r.json()).catch(() => null),
          fetch('/api/media?limit=0&depth=0').then(r => r.json()).catch(() => null),
          fetch('/api/customer-inquiries?limit=0&depth=0').then(r => r.json()).catch(() => null),
        ])
        setStats({
          products: prodRes?.totalDocs?.toString() ?? '—',
          orders: ordRes?.totalDocs?.toString() ?? '—',
          media: medRes?.totalDocs?.toString() ?? '—',
          inquiries: inqRes?.totalDocs?.toString() ?? '—',
        })
      } catch { /* silent */ }
    }
    fetchStats()
  }, [])

  const quickLinks = [
    {
      href: '/admin/collections/products/create',
      icon: '👟',
      title: 'Yeni Urun Ekle',
      subtitle: 'Hizlica yeni ayakkabi ekle',
      color: C.accentSoft,
    },
    {
      href: '/admin/collections/products',
      icon: '📦',
      title: 'Urunleri Yonet',
      subtitle: 'Tum urunleri goruntule',
      color: C.blueSoft,
    },
    {
      href: '/admin/collections/media',
      icon: '🖼️',
      title: 'Medya Kutuphanesi',
      subtitle: 'Gorselleri yukle ve yonet',
      color: C.greenSoft,
    },
    {
      href: '/admin/collections/orders',
      icon: '🛒',
      title: 'Siparisler',
      subtitle: 'Gelen siparisleri takip et',
      color: C.orangeSoft,
    },
    {
      href: '/admin/collections/brands',
      icon: '🏷️',
      title: 'Markalar',
      subtitle: 'Marka listesini guncelle',
      color: C.purpleSoft,
    },
    {
      href: '/admin/collections/categories',
      icon: '📂',
      title: 'Kategoriler',
      subtitle: 'Kategori yonetimi',
      color: C.pinkSoft,
    },
    {
      href: '/admin/collections/variants',
      icon: '📐',
      title: 'Beden Varyantlari',
      subtitle: 'Stok ve beden yonetimi',
      color: C.orangeSoft,
    },
    {
      href: '/admin/collections/customer-inquiries',
      icon: '📞',
      title: 'Musteri Talepleri',
      subtitle: 'Geri arama formlarini gor',
      color: C.greenSoft,
    },
    {
      href: '/admin/collections/banners',
      icon: '🎯',
      title: 'Kampanyalar',
      subtitle: 'Banner ve indirim yonetimi',
      color: C.accentSoft,
    },
    {
      href: '/admin/globals/site-settings',
      icon: '⚙️',
      title: 'Site Ayarlari',
      subtitle: 'Iletisim, kargo, SEO',
      color: C.blueSoft,
    },
  ]

  const steps = [
    {
      num: '1',
      title: 'Gorseli Yukle',
      desc: 'Medya Kutuphanesi → Yeni gorsel yukle. Urun fotograflari /public/media klasorune kaydedilir.',
    },
    {
      num: '2',
      title: 'Urun Olustur',
      desc: 'Urunler → Yeni Ekle. Baslik, fiyat, kategori, marka ve beden bilgilerini gir.',
    },
    {
      num: '3',
      title: 'Gorseli Urune Bagla',
      desc: 'Urun duzenleme sayfasinda "Urun Gorselleri" alanina yukleyecegin gorseli sec.',
    },
    {
      num: '4',
      title: 'Yayinla',
      desc: 'Durumu "Aktif" olarak ayarla ve kaydet. Urun sitede aninda gorunur.',
    },
  ]

  return (
    <div style={{ padding: '32px 0', maxWidth: 920, color: C.text }}>
      {/* ── Header Banner ──────────────────────────────────────────── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.accent} 0%, #7a0a1b 50%, #0d1117 100%)`,
          borderRadius: 20,
          padding: '36px 40px',
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden',
          border: `1px solid ${C.border}`,
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 220,
            height: 220,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -30,
            right: 80,
            width: 120,
            height: 120,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '50%',
          }}
        />
        <div style={{ position: 'relative' }}>
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: 'white',
              marginBottom: 8,
              letterSpacing: '-0.3px',
            }}
          >
            UygunAyakkabi Admin
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.7,
              maxWidth: 520,
            }}
          >
            Urun yonetimi, gorsel yukleme, marka ve kategori duzenlemesi, siparis takibi — hepsi bu
            panelden.
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/" target="_blank" style={{ textDecoration: 'none' }}>
              <span
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: 24,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.18)',
                  display: 'inline-block',
                  transition: 'all 0.15s',
                }}
              >
                🌐 Siteyi Gor →
              </span>
            </Link>
            <Link href="/admin/collections/products/create" style={{ textDecoration: 'none' }}>
              <span
                style={{
                  background: 'white',
                  color: C.accent,
                  padding: '10px 20px',
                  borderRadius: 24,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'inline-block',
                  transition: 'all 0.15s',
                }}
              >
                + Yeni Urun Ekle
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats Overview ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        <StatCard icon="👟" label="Urunler" value={stats.products} color={C.accent} bgColor={C.accentSoft} />
        <StatCard icon="📦" label="Siparisler" value={stats.orders} color={C.blue} bgColor={C.blueSoft} />
        <StatCard icon="🖼️" label="Gorseller" value={stats.media} color={C.green} bgColor={C.greenSoft} />
        <StatCard icon="📞" label="Talepler" value={stats.inquiries} color={C.orange} bgColor={C.orangeSoft} />
      </div>

      {/* ── Quick links ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: C.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            marginBottom: 14,
          }}
        >
          Hizli Erisim
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 10,
          }}
        >
          {quickLinks.map((ql) => (
            <QuickCard key={ql.href} {...ql} />
          ))}
        </div>
      </div>

      {/* ── How to add a product ───────────────────────────────────── */}
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          📸 Urune Gorsel Nasil Eklenir?
        </div>
        <div style={{ fontSize: 12, color: C.textDim, marginBottom: 18 }}>
          Adim adim kilavuz
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 10,
          }}
        >
          {steps.map((s) => (
            <StepCard key={s.num} {...s} />
          ))}
        </div>
      </div>

      {/* ── Tips section ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Brand / Category tip */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: '18px 20px',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: 20 }}>💡</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.orange, marginBottom: 6 }}>
              Marka & Kategori
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
              Urun eklerken <strong style={{ color: C.text }}>Marka</strong> alanina Nike, Adidas,
              Puma gibi isimler, <strong style={{ color: C.text }}>Kategori</strong> alanina Gunluk /
              Klasik / Spor / Bot / Sandalet / Krampon degerlerinden birini yazin.
            </div>
          </div>
        </div>

        {/* Image tip */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: '18px 20px',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: 20 }}>🖼️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.green, marginBottom: 6 }}>
              Gorsel Ipucu
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
              Ilk yukleyeceginiz gorsel <strong style={{ color: C.text }}>kapak fotografi</strong>{' '}
              olarak kullanilir. En fazla 8 gorsel ekleyebilirsiniz. Kare (1:1) gorseller en iyi
              gorunur.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
