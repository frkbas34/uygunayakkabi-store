import Link from 'next/link'

const WA_NUMBER = '905331524843'

export function StorefrontFooter() {
  return (
    <footer style={{ background: '#1c1a16', color: '#f0ece4', padding: '72px 40px 0', position: 'relative', zIndex: 1 }}>
      <div
        className="footer-grid"
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 56,
          marginBottom: 52,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 16 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 800, color: '#f0ece4', letterSpacing: '0.12em' }}>
              UYGUN
            </span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 300, color: '#c8102e' }}>
              AYAKKABI
            </span>
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'rgba(240,236,228,0.35)', lineHeight: 1.85, maxWidth: 300 }}>
            Kaliteli ayakkabılar, uygun fiyatlar. Geniş marka yelpazesi, hızlı kargo.
          </p>
        </div>
        <div>
          <h5 style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(240,236,228,0.28)', marginBottom: 22 }}>
            Sayfalar
          </h5>
          <Link href="/" style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'rgba(240,236,228,0.45)', marginBottom: 14, textDecoration: 'none' }}>
            Ana Sayfa
          </Link>
          <Link href="/" style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'rgba(240,236,228,0.45)', marginBottom: 14, textDecoration: 'none' }}>
            Ayakkabılar
          </Link>
        </div>
        <div>
          <h5 style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(240,236,228,0.28)', marginBottom: 22 }}>
            İletişim
          </h5>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'rgba(240,236,228,0.45)', lineHeight: 2.2 }}>
            0533 152 48 43<br />
            info@uygunayakkabi.com<br />
            İstanbul, Türkiye
          </p>
        </div>
        <div>
          <h5 style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(240,236,228,0.28)', marginBottom: 22 }}>
            Sipariş
          </h5>
          <a
            href={`https://wa.me/${WA_NUMBER}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: '#f0ece4',
              border: '1px solid rgba(240,236,228,0.2)',
              padding: '10px 20px',
              borderRadius: 999,
              textDecoration: 'none',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WHATSAPP
          </a>
        </div>
      </div>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '20px 0', borderTop: '1px solid rgba(240,236,228,0.08)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(240,236,228,0.22)' }}>
          © 2025 UygunAyakkabı — Tüm hakları saklıdır.
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(240,236,228,0.22)' }}>
          uygunayakkabi.com
        </p>
      </div>

      {/* Responsive CSS */}
      <style>{`
        @media(max-width:768px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media(max-width:640px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  )
}
