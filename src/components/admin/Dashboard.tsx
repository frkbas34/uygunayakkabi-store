'use client'

import React from 'react'
import Link from 'next/link'

// ── Quick-access card ────────────────────────────────────────────────────────
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
    <Link href={href}>
      <div
        style={{
          background: color,
          borderRadius: 16,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          cursor: 'pointer',
          transition: 'transform 0.15s, box-shadow 0.15s',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          textDecoration: 'none',
          color: 'inherit',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.13)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'
        }}
      >
        <span style={{ fontSize: 32 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{title}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
    </Link>
  )
}

// ── Step card ────────────────────────────────────────────────────────────────
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
        background: '#f8f9fa',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          minWidth: 32,
          height: 32,
          background: '#c8102e',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        {num}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  )
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const quickLinks = [
    {
      href: '/admin/collections/products/create',
      icon: '👟',
      title: 'Yeni Ürün Ekle',
      subtitle: 'Hızlıca yeni ayakkabı ekle',
      color: '#fff0f2',
    },
    {
      href: '/admin/collections/products',
      icon: '📦',
      title: 'Ürünleri Yönet',
      subtitle: 'Tüm ürünleri görüntüle ve düzenle',
      color: '#f0f4ff',
    },
    {
      href: '/admin/collections/media',
      icon: '🖼️',
      title: 'Medya Kütüphanesi',
      subtitle: 'Görselleri yükle ve yönet',
      color: '#f0faf5',
    },
    {
      href: '/admin/collections/orders',
      icon: '🛒',
      title: 'Siparişler',
      subtitle: 'Gelen siparişleri takip et',
      color: '#fff8f0',
    },
    {
      href: '/admin/collections/brands',
      icon: '🏷️',
      title: 'Markalar',
      subtitle: 'Marka listesini güncelle',
      color: '#f5f0ff',
    },
    {
      href: '/admin/collections/categories',
      icon: '📂',
      title: 'Kategoriler',
      subtitle: 'Kategori yönetimi',
      color: '#f0f9ff',
    },
    {
      href: '/admin/collections/variants',
      icon: '📐',
      title: 'Beden Varyantları',
      subtitle: 'Stok ve beden yönetimi',
      color: '#fffff0',
    },
    {
      href: '/admin/collections/customer-inquiries',
      icon: '📞',
      title: 'Müşteri Talepleri',
      subtitle: 'Geri arama formlarını gör',
      color: '#f0fff4',
    },
  ]

  const steps = [
    {
      num: '1',
      title: 'Görseli Yükle',
      desc: 'Medya Kütüphanesi → Yeni görsel yükle. Ürün fotoğrafları /public/media klasörüne kaydedilir.',
    },
    {
      num: '2',
      title: 'Ürün Oluştur',
      desc: 'Ürünler → Yeni Ekle. Başlık, fiyat, kategori, marka ve beden bilgilerini gir.',
    },
    {
      num: '3',
      title: 'Görseli Ürüne Bağla',
      desc: 'Ürün düzenleme sayfasında "Ürün Görselleri" alanına yüklediğin görseli seç.',
    },
    {
      num: '4',
      title: 'Yayınla',
      desc: 'Durumu "Aktif" olarak ayarla ve kaydet. Ürün sitede anında görünür.',
    },
  ]

  return (
    <div style={{ padding: '32px 0', maxWidth: 900 }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #c8102e 0%, #a50d26 100%)',
          borderRadius: 20,
          padding: '32px 36px',
          marginBottom: 32,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '50%',
          }}
        />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 6 }}>
            👋 Hoş Geldiniz — UygunAyakkabı Admin
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: 520 }}>
            Ürün yönetimi, görsel yükleme, marka ve kategori düzenlemesi, sipariş takibi — hepsi bu panelden.
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/" target="_blank">
              <span
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.25)',
                }}
              >
                🌐 Siteyi Gör →
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
          Hızlı Erişim
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {quickLinks.map((ql) => (
            <QuickCard key={ql.href} {...ql} />
          ))}
        </div>
      </div>

      {/* How to add a product with image */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #ebebeb',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
          📸 Ürüne Görsel Nasıl Eklenir?
        </div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>
          Adım adım kılavuz
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {steps.map((s) => (
            <StepCard key={s.num} {...s} />
          ))}
        </div>
      </div>

      {/* Brand reminder */}
      <div
        style={{
          background: '#fffaf0',
          border: '1px solid #fde68a',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <span style={{ fontSize: 20 }}>💡</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#92400e', marginBottom: 4 }}>
            Marka ve Kategori İpucu
          </div>
          <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
            Ürün eklerken Marka alanına Nike, Adidas, Puma, New Balance gibi marka adını,
            Kategori alanına Günlük / Klasik / Spor / Bot / Sandalet / Krampon değerlerinden
            birini yazmanız önerilir. Bu sayede sitedeki filtreleme ve kategori gösterimi
            doğru çalışır. Markalar ve Kategoriler koleksiyonlarından tüm listeyi yönetebilirsiniz.
          </div>
        </div>
      </div>
    </div>
  )
}
