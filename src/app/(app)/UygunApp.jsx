"use client";
import { useState, useEffect, useRef } from "react";

// ============================================
// DESIGN TOKENS — SpaceX dark + Tesla clean + Apple sections
// ============================================
const T = {
  f: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
  d: "'Inter', sans-serif",
  // Dark palette (SpaceX-inspired)
  bg: "#000000",
  bg2: "#0a0a0a",
  bg3: "#111111",
  bg4: "#1a1a1a",
  // Light text (SpaceX)
  wh: "#f0f0fa",
  wh2: "rgba(240,240,250,0.90)",
  wh3: "rgba(240,240,250,0.55)",
  wh4: "rgba(240,240,250,0.30)",
  wh5: "rgba(240,240,250,0.12)",
  // Accent
  ac: "#c8102e",
  acSoft: "rgba(200,16,46,0.15)",
  gn: "#22c55e",
  gold: "#fbbf24",
  // Radius
  r: { sm: 6, md: 10, lg: 16, xl: 20, full: 999 },
};

// ============================================
// SVG SHOE GENERATOR
// ============================================
function shoe(bg, sole, body, acc, lace, rot = 0) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><rect width="800" height="800" fill="${bg}"/><g transform="translate(400,400) rotate(${rot}) scale(1.15)"><path d="M-220,80Q-220,110-180,120L200,120Q240,120,250,95L260,60Q260,45,240,40L-180,40Q-220,45-220,80Z" fill="${sole}"/><path d="M-200,48Q-210,68-190,78L230,78Q250,73,255,53L250,33Q245,23,230,23L-175,23Q-200,28-200,48Z" fill="white" opacity="0.88"/><path d="M-180,28Q-200,8-195,-42Q-185,-102-140,-132Q-80,-172,20,-177Q120,-180,180,-152Q230,-127,245,-72Q255,-27,245,13L240,23L-175,23Z" fill="${body}"/><path d="M-150,-45Q-70,-92,50,-87Q145,-82,210,-38" fill="none" stroke="${acc}" stroke-width="14" stroke-linecap="round" opacity="0.75"/><line x1="-78" y1="-132" x2="-18" y2="-147" stroke="${lace}" stroke-width="4.5" stroke-linecap="round"/><line x1="-58" y1="-112" x2="2" y2="-132" stroke="${lace}" stroke-width="4.5" stroke-linecap="round"/><line x1="-38" y1="-92" x2="22" y2="-117" stroke="${lace}" stroke-width="4.5" stroke-linecap="round"/></g></svg>`)}`;
}

function wallet(bg, leather, accent, stitch) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><rect width="800" height="800" fill="${bg}"/><g transform="translate(400,400)"><rect x="-200" y="-140" width="400" height="280" rx="24" fill="${leather}"/><rect x="-200" y="-140" width="400" height="280" rx="24" fill="none" stroke="${stitch}" stroke-width="3" stroke-dasharray="8,6" opacity="0.4"/><rect x="100" y="-80" width="90" height="60" rx="12" fill="${accent}"/><circle cx="145" cy="-50" r="10" fill="${bg}" opacity="0.3"/></g></svg>`)}`;
}

const heroImg = shoe("#111", "#333", "#c8102e", "#fff", "#fff", -8);

// ============================================
// STOCK PHOTOS
// ============================================
const PHOTO = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&h=600&fit=crop&q=80",
];
const ph = (i) => PHOTO[i % PHOTO.length];

const WALLET_PHOTOS = [
  "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1624996379697-f01d168b1a52?w=600&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1559526324-593bc073d938?w=600&h=600&fit=crop&q=80",
];

// ============================================
// STATIC PRODUCT DATA
// ============================================
const STATIC_PRODUCTS = [
  { id: 1, slug: "nike-air-max-270", name: "Nike Air Max 270", price: 2499, originalPrice: 3299, description: "Gün boyu konfor sunan Air Max 270, büyük Air ünitesiyle her adımda maksimum yastıklama sağlar.", image: ph(0), images: [ph(0),ph(1)], sizes:[38,39,40,41,42,43,44], stock:3, category:"Spor", badge:"İndirim" },
  { id: 2, slug: "adidas-ultraboost-23", name: "Adidas Ultraboost 23", price: 2899, originalPrice: null, description: "Efsanevi Boost teknolojisiyle enerji iade eden taban yapısı.", image: ph(1), images: [ph(1),ph(2)], sizes:[39,40,41,42,43], stock:8, category:"Spor", badge:"Yeni" },
  { id: 3, slug: "new-balance-574", name: "New Balance 574", price: 1899, originalPrice: 2499, description: "Zamansız tasarım ve ENCAP yastıklama sistemiyle hem şık hem rahat bir klasik.", image: ph(2), images: [ph(2),ph(3)], sizes:[38,39,40,41,42], stock:2, category:"Günlük", badge:"İndirim" },
  { id: 4, slug: "puma-rs-x", name: "Puma RS-X", price: 1699, originalPrice: null, description: "Retro koşu estetiği ile modern teknolojiyi buluşturan cesur sneaker.", image: ph(3), images: [ph(3),ph(4)], sizes:[40,41,42,43,44,45], stock:5, category:"Spor", badge:null },
  { id: 5, slug: "converse-chuck-70", name: "Converse Chuck 70", price: 1299, originalPrice: 1599, description: "Premium materyaller ile ikonik Chuck Taylor'ın üst seviye versiyonu.", image: ph(4), images: [ph(4),ph(0)], sizes:[36,37,38,39,40,41,42], stock:12, category:"Günlük", badge:"İndirim" },
  { id: 6, slug: "nike-dunk-low", name: "Nike Dunk Low Retro", price: 2199, originalPrice: null, description: "Basketbol kökenli bu ikon, sokak modasının vazgeçilmezi.", image: ph(0), images: [ph(0),ph(2)], sizes:[39,40,41,42,43], stock:0, category:"Günlük", badge:"Tükendi" },
  { id: 7, slug: "nike-air-force-1", name: "Nike Air Force 1 '07", price: 2299, originalPrice: 2799, description: "Efsanevi Air Force 1, zamansız bir ikon.", image: ph(1), images: [ph(1),ph(3)], sizes:[38,39,40,41,42,43,44,45], stock:15, category:"Günlük", badge:"İndirim" },
  { id: 8, slug: "adidas-samba-og", name: "Adidas Samba OG", price: 1999, originalPrice: null, description: "Futsal efsanesi Samba, retro tarzıyla sokağın vazgeçilmezi.", image: ph(2), images: [ph(2),ph(4)], sizes:[38,39,40,41,42,43], stock:7, category:"Günlük", badge:"Yeni" },
  { id: 9, slug: "nike-vapormax-plus", name: "Nike Air VaporMax Plus", price: 3499, originalPrice: 3999, description: "VaporMax hava yastığı ile yere basmadan yürüme hissi.", image: ph(3), images: [ph(3),ph(0)], sizes:[40,41,42,43,44], stock:4, category:"Spor", badge:"İndirim" },
  { id: 10, slug: "reebok-classic-leather", name: "Reebok Classic Leather", price: 1399, originalPrice: null, description: "80'lerden bugüne ulaşan sade tasarım ve yumuşak deri.", image: ph(4), images: [ph(4),ph(1)], sizes:[38,39,40,41,42,43], stock:10, category:"Günlük", badge:null },
  { id: 11, slug: "adidas-stan-smith", name: "Adidas Stan Smith", price: 1799, originalPrice: 2199, description: "Dünyanın en çok satan sneaker'ı.", image: ph(0), images: [ph(0),ph(3)], sizes:[36,37,38,39,40,41,42,43], stock:9, category:"Günlük", badge:"İndirim" },
  { id: 12, slug: "nike-pegasus-41", name: "Nike Pegasus 41", price: 2699, originalPrice: null, description: "Her gün koşmak isteyenler için React köpük yastıklama.", image: ph(1), images: [ph(1),ph(4)], sizes:[39,40,41,42,43,44,45], stock:6, category:"Spor", badge:"Yeni" },
  { id: 37, slug: "klasik-deri-cuzdan", name: "Klasik Deri Cüzdan", price: 599, originalPrice: 799, description: "Hakiki dana derisinden, 8 kart bölmeli, RFID korumalı.", image: WALLET_PHOTOS[0], images: [WALLET_PHOTOS[0],WALLET_PHOTOS[1]], sizes:[], stock:18, category:"Cüzdan", badge:"İndirim" },
  { id: 38, slug: "slim-kartvizitlik", name: "Slim Kartlık Cüzdan", price: 399, originalPrice: null, description: "Ultra ince, 6 kart bölmeli minimalist cüzdan.", image: WALLET_PHOTOS[1], images: [WALLET_PHOTOS[1],WALLET_PHOTOS[2]], sizes:[], stock:25, category:"Cüzdan", badge:"Yeni" },
];

// ============================================
// CATEGORY DATA
// ============================================
const CAT_DATA = [
  { name: "Spor", desc: "Koşu & Fitness", icon: "⚡" },
  { name: "Günlük", desc: "Her Güne Uygun", icon: "👟" },
  { name: "Klasik", desc: "Ofis & Şıklık", icon: "✦" },
  { name: "Bot", desc: "Kış & Dağ", icon: "🏔" },
  { name: "Sandalet", desc: "Yaz Hafifliği", icon: "☀" },
  { name: "Krampon", desc: "Saha Performansı", icon: "⚽" },
  { name: "Cüzdan", desc: "Deri & Kartlık", icon: "◆" },
];

// ============================================
// ICONS (SVG)
// ============================================
const I = {
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="17" x2="21" y2="17"/></svg>,
  close: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  arrow: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  check: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>,
  wa: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  truck: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
};

// ============================================
// HELPER
// ============================================
const waLink = (num) => `https://wa.me/${num || '905331524843'}`;

const DEFAULT_SETTINGS = {
  siteName: 'UygunAyakkabı',
  contact: { whatsapp: '0533 152 48 43', whatsappFull: '905331524843', email: '', instagram: '' },
  shipping: { freeShippingThreshold: 500, shippingCost: 49, showFreeShippingBanner: true },
  trustBadges: { monthlyCustomers: '500+', totalProducts: '200+', satisfactionRate: '%98' },
  announcementBar: { enabled: true, text: '500₺ üzeri siparişlerde KARGO BEDAVA', bgColor: '#c8102e' },
};

// ============================================
// GLOBAL STYLES (injected once)
// ============================================
function GlobalStyles() {
  return (
    <style>{`
      *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body { background: #000; color: ${T.wh}; -webkit-font-smoothing: antialiased; }
      ::selection { background: ${T.ac}; color: #fff; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      .fade-up { animation: fadeUp 0.8s ease forwards; }
      .fade-in { animation: fadeIn 0.6s ease forwards; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      @media(max-width:768px) {
        .hero-grid { grid-template-columns: 1fr !important; text-align: center; }
        .hero-grid > div:first-child { order: 2; }
        .hero-btns { justify-content: center !important; }
        .detail-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        .nav-desktop { display: none !important; }
        .nav-mobile { display: flex !important; }
        .wa-steps { grid-template-columns: repeat(2,1fr) !important; }
        .footer-grid { grid-template-columns: 1fr 1fr !important; }
      }
      @media(max-width:1024px) {
        .prod-grid { grid-template-columns: repeat(3,1fr) !important; }
      }
      @media(max-width:640px) {
        .prod-grid { grid-template-columns: repeat(2,1fr) !important; gap: 12px !important; }
        .footer-grid { grid-template-columns: 1fr !important; }
      }
    `}</style>
  );
}

// ============================================
// TOP BAR — thin announcement (SpaceX-style minimal)
// ============================================
function TopBar({ settings }) {
  const [show, setShow] = useState(true);
  const bar = settings?.announcementBar || DEFAULT_SETTINGS.announcementBar;
  if (!show || !bar.enabled) return null;
  return (
    <div style={{ background: T.bg3, borderBottom: `1px solid ${T.wh5}`, padding: "10px 24px", textAlign: "center", position: "relative" }}>
      <span style={{ fontFamily: T.f, fontSize: 12, fontWeight: 500, color: T.wh3, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {bar.text}
      </span>
      <button onClick={() => setShow(false)} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.wh4, cursor: "pointer", fontSize: 14 }}>✕</button>
    </div>
  );
}

// ============================================
// NAVBAR — Tesla/SpaceX glass + transparent
// ============================================
function Navbar({ onNav, pg, settings }) {
  const waNum = settings?.contact?.whatsappFull || DEFAULT_SETTINGS.contact.whatsappFull;
  const [mo, setMo] = useState(false);
  const [sc, setSc] = useState(false);
  useEffect(() => {
    const fn = () => setSc(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const links = [{ k: "home", l: "ANA SAYFA" }, { k: "catalog", l: "KOLEKSİYON" }];
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: sc ? "rgba(0,0,0,0.85)" : "transparent",
      backdropFilter: sc ? "blur(30px) saturate(1.5)" : "none",
      borderBottom: sc ? `1px solid ${T.wh5}` : "1px solid transparent",
      transition: "all 0.4s cubic-bezier(.22,1,.36,1)",
    }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo */}
        <div onClick={() => onNav("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontFamily: T.f, fontSize: 18, fontWeight: 800, color: T.wh, letterSpacing: "0.12em", textTransform: "uppercase" }}>UYGUN</span>
          <span style={{ fontFamily: T.f, fontSize: 18, fontWeight: 300, color: T.ac, letterSpacing: "0.06em" }}>AYAKKABI</span>
        </div>
        {/* Desktop Links */}
        <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {links.map(l => (
            <span key={l.k} onClick={() => onNav(l.k)} style={{
              cursor: "pointer", fontFamily: T.f, fontSize: 12, fontWeight: 500,
              color: pg === l.k ? T.wh : T.wh3,
              letterSpacing: "0.14em", transition: "color 0.2s",
            }}>
              {l.l}
            </span>
          ))}
          <a href={waLink(waNum)} target="_blank" rel="noreferrer" style={{
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: T.f, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em",
            color: T.wh, border: `1px solid ${T.wh5}`, padding: "9px 22px",
            borderRadius: T.r.full, textDecoration: "none", transition: "all 0.3s",
          }}>
            {I.wa} WHATSAPP
          </a>
        </div>
        {/* Mobile Toggle */}
        <button className="nav-mobile" onClick={() => setMo(!mo)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: T.wh, padding: 4, alignItems: "center", justifyContent: "center" }}>
          {mo ? I.close : I.menu}
        </button>
      </div>
      {/* Mobile Menu */}
      {mo && (
        <div style={{ padding: "16px 32px 32px", background: "rgba(0,0,0,0.95)", backdropFilter: "blur(30px)", borderTop: `1px solid ${T.wh5}` }}>
          {links.map(l => (
            <div key={l.k} onClick={() => { onNav(l.k); setMo(false); }} style={{
              cursor: "pointer", fontFamily: T.f, fontSize: 14, fontWeight: 500,
              color: T.wh2, padding: "16px 0", letterSpacing: "0.1em",
              borderBottom: `1px solid ${T.wh5}`,
            }}>
              {l.l}
            </div>
          ))}
          <a href={waLink(waNum)} target="_blank" rel="noreferrer" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            marginTop: 16, fontFamily: T.f, fontSize: 13, fontWeight: 600,
            color: "#fff", background: "#25D366", padding: "14px 24px",
            borderRadius: T.r.full, textDecoration: "none",
          }}>
            {I.wa} WhatsApp ile Yaz
          </a>
        </div>
      )}
    </nav>
  );
}

// ============================================
// PRODUCT CARD — Dark, Tesla-style
// ============================================
function Card({ p, onView }) {
  const [h, sH] = useState(false);
  const imgSrc = p.dbImage || p.image;
  const img2 = Array.isArray(p.images) && p.images.length > 1 ? p.images[1] : null;
  return (
    <div
      onMouseEnter={() => sH(true)} onMouseLeave={() => sH(false)}
      onClick={() => onView(p)}
      style={{
        cursor: "pointer", borderRadius: T.r.lg, overflow: "hidden",
        background: T.bg3, transition: "all 0.4s cubic-bezier(.22,1,.36,1)",
        transform: h ? "translateY(-6px)" : "translateY(0)",
        boxShadow: h ? "0 24px 48px rgba(0,0,0,0.5)" : "none",
        border: `1px solid ${h ? "rgba(255,255,255,0.12)" : T.wh5}`,
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", paddingTop: "110%", overflow: "hidden", background: T.bg4 }}>
        <img src={imgSrc} alt={p.name} style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          objectFit: "contain", transition: "all 0.5s cubic-bezier(.22,1,.36,1)",
          opacity: (h && img2) ? 0 : 1, transform: h ? "scale(1.06)" : "scale(1)",
          filter: (p.stock === 0) ? "grayscale(50%)" : "",
        }} />
        {img2 && <img src={img2} alt="" style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          objectFit: "contain", transition: "opacity 0.4s", opacity: h ? 1 : 0,
        }} />}
        {/* Badge */}
        {p.badge && (
          <span style={{
            position: "absolute", top: 12, left: 12,
            fontFamily: T.f, fontSize: 10, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            padding: "5px 12px", borderRadius: T.r.full,
            color: T.wh, background: p.badge === "Tükendi" ? "rgba(255,255,255,0.15)" : p.badge === "İndirim" ? T.ac : "rgba(255,255,255,0.15)",
            backdropFilter: "blur(10px)",
          }}>
            {p.badge}
          </span>
        )}
        {/* Hover CTA */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "32px 16px 16px", background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
          opacity: h ? 1 : 0, transition: "opacity 0.3s", display: "flex", justifyContent: "center",
        }}>
          <span style={{
            fontFamily: T.f, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
            color: T.wh, border: "1px solid rgba(255,255,255,0.4)", padding: "8px 20px", borderRadius: T.r.full,
          }}>
            INCELE →
          </span>
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: "16px 16px 20px" }}>
        <p style={{ fontFamily: T.f, fontSize: 10, fontWeight: 500, color: T.wh4, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>{p.category}</p>
        <h3 style={{ fontFamily: T.f, fontSize: 14, fontWeight: 600, color: T.wh, marginBottom: 10, lineHeight: 1.3 }}>{p.name || p.title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: T.f, fontSize: 17, fontWeight: 700, color: T.wh }}>₺{(p.price || 0).toLocaleString("tr-TR")}</span>
          {p.originalPrice && <span style={{ fontFamily: T.f, fontSize: 12, color: T.wh4, textDecoration: "line-through" }}>₺{p.originalPrice.toLocaleString("tr-TR")}</span>}
          {p.originalPrice && p.price < p.originalPrice && (
            <span style={{ fontFamily: T.f, fontSize: 10, fontWeight: 700, color: T.ac, background: T.acSoft, padding: "2px 8px", borderRadius: T.r.full }}>
              %{Math.round((1 - p.price / p.originalPrice) * 100)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// HORIZONTAL SCROLL SECTION (Apple-style)
// ============================================
function HScrollSection({ title, subtitle, items, onView }) {
  const ref = useRef(null);
  const scroll = (dir) => {
    if (ref.current) ref.current.scrollBy({ left: dir * 320, behavior: "smooth" });
  };
  return (
    <section style={{ padding: "80px 0", borderTop: `1px solid ${T.wh5}` }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
          <div>
            <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em", color: T.ac, marginBottom: 8 }}>{subtitle}</p>
            <h2 style={{ fontFamily: T.f, fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, color: T.wh, letterSpacing: "-0.02em" }}>{title}</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => scroll(-1)} style={{ width: 44, height: 44, borderRadius: "50%", border: `1px solid ${T.wh5}`, background: "transparent", color: T.wh3, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
            <button onClick={() => scroll(1)} style={{ width: 44, height: 44, borderRadius: "50%", border: `1px solid ${T.wh5}`, background: "transparent", color: T.wh3, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
          </div>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar" style={{ display: "flex", gap: 16, overflowX: "auto", paddingLeft: "max(32px, calc((100vw - 1400px)/2 + 32px))", paddingRight: 32, scrollSnapType: "x mandatory" }}>
        {items.map(p => (
          <div key={p.id || p.slug} style={{ minWidth: 280, maxWidth: 300, flexShrink: 0, scrollSnapAlign: "start" }}>
            <Card p={p} onView={onView} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================
// BUY FORM MODAL
// ============================================
function BuyForm({ product: p, onClose, settings }) {
  const ct = settings?.contact || DEFAULT_SETTINGS.contact;
  const [f, sF] = useState({ name: "", phone: "", city: "" });
  const [ok, sOk] = useState(false);
  const [er, sEr] = useState({});
  const flds = [
    { k: "name", l: "Ad Soyad", ph: "Adınız ve soyadınız", t: "text" },
    { k: "phone", l: "Telefon", ph: "05XX XXX XX XX", t: "tel" },
    { k: "city", l: "Şehir", ph: "Bulunduğunuz şehir", t: "text" },
  ];
  const go = () => {
    const e = {};
    if (!f.name.trim()) e.name = 1;
    if (f.phone.length < 10) e.phone = 1;
    if (!f.city.trim()) e.city = 1;
    sEr(e);
    if (!Object.keys(e).length) sOk(true);
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }} />
      <div style={{ position: "relative", background: T.bg3, border: `1px solid ${T.wh5}`, borderRadius: T.r.xl, padding: "36px 32px", maxWidth: 440, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: T.bg4, border: "none", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.wh3 }}>{I.close}</button>
        {ok ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>{I.check}</div>
            <h3 style={{ fontFamily: T.f, fontSize: 22, fontWeight: 700, color: T.wh, marginBottom: 8 }}>Talebiniz Alındı!</h3>
            <p style={{ fontFamily: T.f, fontSize: 14, color: T.wh3, marginBottom: 24 }}>Ekibimiz en kısa sürede sizi arayacak.</p>
            <button onClick={onClose} style={{ fontFamily: T.f, fontSize: 14, fontWeight: 600, color: T.bg, background: T.wh, border: "none", padding: "12px 32px", borderRadius: T.r.full, cursor: "pointer" }}>Tamam</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 14, marginBottom: 28, padding: 14, background: T.bg4, borderRadius: T.r.md }}>
              <img src={p.dbImage || p.image} alt="" style={{ width: 56, height: 56, borderRadius: T.r.sm, objectFit: "cover" }} />
              <div>
                <p style={{ fontFamily: T.f, fontSize: 14, fontWeight: 600, color: T.wh }}>{p.name || p.title}</p>
                <p style={{ fontFamily: T.f, fontSize: 15, fontWeight: 700, color: T.ac }}>₺{(p.price || 0).toLocaleString("tr-TR")}</p>
              </div>
            </div>
            <h3 style={{ fontFamily: T.f, fontSize: 20, fontWeight: 700, color: T.wh, marginBottom: 4 }}>Satın Alma Talebi</h3>
            <p style={{ fontFamily: T.f, fontSize: 13, color: T.wh3, marginBottom: 24 }}>Bilgilerinizi bırakın, sizi arayalım.</p>
            {flds.map(x => (
              <div key={x.k} style={{ marginBottom: 18 }}>
                <label style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, color: T.wh3, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{x.l}</label>
                <input type={x.t} placeholder={x.ph} value={f[x.k]}
                  onChange={e => { sF({ ...f, [x.k]: e.target.value }); sEr({ ...er, [x.k]: false }); }}
                  style={{ width: "100%", padding: "13px 16px", borderRadius: T.r.sm, border: `1px solid ${er[x.k] ? T.ac : T.wh5}`, background: T.bg4, fontFamily: T.f, fontSize: 14, color: T.wh, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}
            <button onClick={go} style={{ width: "100%", padding: "15px", background: T.wh, color: T.bg, border: "none", borderRadius: T.r.sm, fontFamily: T.f, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em", marginTop: 4 }}>TALEP GÖNDER</button>
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <a href={`https://wa.me/${ct.whatsappFull}?text=Merhaba!%20${encodeURIComponent((p.name || p.title || "Ürün"))}%20hakkında%20bilgi%20almak%20istiyorum.`}
                target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: T.f, fontSize: 13, fontWeight: 600, color: "#25D366", textDecoration: "none", padding: "10px 0" }}>
                {I.wa} WhatsApp ile Sor
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// FOOTER — Dark, minimal
// ============================================
function Foot({ onNav, settings }) {
  const ct = settings?.contact || DEFAULT_SETTINGS.contact;
  return (
    <footer style={{ background: T.bg, borderTop: `1px solid ${T.wh5}`, padding: "64px 32px 0" }}>
      <div className="footer-grid" style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 16 }}>
            <span style={{ fontFamily: T.f, fontSize: 16, fontWeight: 800, color: T.wh, letterSpacing: "0.12em" }}>UYGUN</span>
            <span style={{ fontFamily: T.f, fontSize: 16, fontWeight: 300, color: T.ac }}>AYAKKABI</span>
          </div>
          <p style={{ fontFamily: T.f, fontSize: 13, color: T.wh4, lineHeight: 1.8, maxWidth: 300 }}>Kaliteli ayakkabılar, uygun fiyatlar. Geniş marka yelpazesi, hızlı kargo.</p>
        </div>
        <div>
          <h5 style={{ fontFamily: T.f, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: T.wh4, marginBottom: 20 }}>Sayfalar</h5>
          {[["Ana Sayfa", "home"], ["Koleksiyon", "catalog"]].map(([l, k]) => (
            <p key={k} onClick={() => onNav(k)} style={{ fontFamily: T.f, fontSize: 13, color: T.wh3, marginBottom: 12, cursor: "pointer" }}>{l}</p>
          ))}
        </div>
        <div>
          <h5 style={{ fontFamily: T.f, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: T.wh4, marginBottom: 20 }}>İletişim</h5>
          <p style={{ fontFamily: T.f, fontSize: 13, color: T.wh3, lineHeight: 2.2 }}>
            {ct.whatsapp}<br/>
            {ct.email || 'info@uygunayakkabi.com'}<br/>
            İstanbul, Türkiye
          </p>
        </div>
        <div>
          <h5 style={{ fontFamily: T.f, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: T.wh4, marginBottom: 20 }}>Sipariş</h5>
          <a href={waLink(ct.whatsappFull)} target="_blank" rel="noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontFamily: T.f, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em",
            color: T.wh, border: `1px solid ${T.wh5}`, padding: "10px 20px",
            borderRadius: T.r.full, textDecoration: "none",
          }}>
            {I.wa} WHATSAPP
          </a>
        </div>
      </div>
      <div style={{ maxWidth: 1400, margin: "48px auto 0", padding: "20px 0", borderTop: `1px solid ${T.wh5}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontFamily: T.f, fontSize: 11, color: T.wh4 }}>© 2025 UygunAyakkabı — Tüm hakları saklıdır.</p>
        <p style={{ fontFamily: T.f, fontSize: 11, color: T.wh4 }}>uygunayakkabi.com</p>
      </div>
    </footer>
  );
}

// ============================================
// HOME PAGE — SpaceX hero + Apple sections + Tesla cards
// ============================================
function Home({ onNav, onView, allProducts, settings, banners = [] }) {
  const S = settings || DEFAULT_SETTINGS;
  const trust = S.trustBadges || DEFAULT_SETTINGS.trustBadges;
  const contact = S.contact || DEFAULT_SETTINGS.contact;

  const sportProducts = allProducts.filter(p => p.category === "Spor");
  const dailyProducts = allProducts.filter(p => p.category === "Günlük");
  const discountProducts = allProducts.filter(p => p.originalPrice && p.price < p.originalPrice);

  return (
    <div style={{ background: T.bg }}>

      {/* ═══ HERO — SpaceX full-bleed immersive ═══ */}
      <section style={{
        minHeight: "100vh", display: "flex", alignItems: "center", position: "relative", overflow: "hidden",
        background: `radial-gradient(ellipse at 70% 50%, rgba(200,16,46,0.08) 0%, transparent 60%), ${T.bg}`,
      }}>
        {/* Subtle grid overlay */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "80px 80px", pointerEvents: "none" }} />

        <div className="hero-grid" style={{ maxWidth: 1400, margin: "0 auto", padding: "140px 32px 100px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center", width: "100%", position: "relative" }}>
          <div>
            <div className="fade-up" style={{ animationDelay: "0.1s" }}>
              <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: T.ac, marginBottom: 24 }}>
                ● YENİ KOLEKSİYON
              </p>
              <h1 style={{ fontFamily: T.f, fontSize: "clamp(42px, 6vw, 80px)", fontWeight: 800, color: T.wh, lineHeight: 1.0, letterSpacing: "-0.03em", marginBottom: 24 }}>
                KALİTELİ
                <br />
                AYAKKABILAR
              </h1>
              <p style={{ fontFamily: T.f, fontSize: 16, color: T.wh3, lineHeight: 1.8, marginBottom: 40, maxWidth: 440 }}>
                En popüler markaların en iyi modelleri, piyasanın altında fiyatlarla. Beğendiğiniz ayakkabıyı seçin, WhatsApp'tan yazın.
              </p>
            </div>

            {/* CTAs — SpaceX bordered + Tesla filled */}
            <div className="hero-btns fade-up" style={{ display: "flex", gap: 16, flexWrap: "wrap", animationDelay: "0.3s" }}>
              <button onClick={() => onNav("catalog")} style={{
                fontFamily: T.f, fontSize: 13, fontWeight: 600, letterSpacing: "0.1em",
                color: T.bg, background: T.wh, border: "none",
                padding: "16px 36px", borderRadius: T.r.full, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10, textTransform: "uppercase",
              }}>
                KOLEKSİYONU GÖR {I.arrow}
              </button>
              <a href={waLink(contact.whatsappFull)} target="_blank" rel="noreferrer" style={{
                fontFamily: T.f, fontSize: 13, fontWeight: 600, letterSpacing: "0.1em",
                color: T.wh, border: `1px solid ${T.wh5}`, background: "transparent",
                padding: "16px 32px", borderRadius: T.r.full, textDecoration: "none",
                display: "flex", alignItems: "center", gap: 10, textTransform: "uppercase",
              }}>
                {I.wa} WHATSAPP →
              </a>
            </div>

            {/* Trust Badges — minimal stats row */}
            <div className="fade-up" style={{ display: "flex", gap: 40, marginTop: 56, animationDelay: "0.5s" }}>
              {[
                { n: trust.monthlyCustomers, l: "Aylık Müşteri" },
                { n: trust.totalProducts, l: "Ürün Çeşidi" },
                { n: trust.satisfactionRate, l: "Memnuniyet" },
              ].map(s => (
                <div key={s.l}>
                  <p style={{ fontFamily: T.f, fontSize: 28, fontWeight: 800, color: T.wh, letterSpacing: "-0.02em" }}>{s.n}</p>
                  <p style={{ fontFamily: T.f, fontSize: 11, color: T.wh4, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Image */}
          <div className="fade-in" style={{ position: "relative", animationDelay: "0.4s" }}>
            <div style={{
              borderRadius: 28, overflow: "hidden", aspectRatio: "4/5",
              background: T.bg3, border: `1px solid ${T.wh5}`,
              boxShadow: "0 0 120px rgba(200,16,46,0.08)",
            }}>
              <img src={heroImg} alt="Featured" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BEST SELLERS — Apple horizontal scroll ═══ */}
      {allProducts.length > 0 && (
        <HScrollSection title="Çok Satanlar" subtitle="Popüler" items={allProducts.slice(0, 12)} onView={onView} />
      )}

      {/* ═══ CATEGORIES — Dark grid, Apple-style tiles ═══ */}
      <section style={{ padding: "80px 0", borderTop: `1px solid ${T.wh5}`, background: T.bg2 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em", color: T.ac, marginBottom: 8 }}>KATEGORİLER</p>
            <h2 style={{ fontFamily: T.f, fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, color: T.wh, letterSpacing: "-0.02em" }}>Ne Arıyorsunuz?</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {CAT_DATA.map(cat => {
              const count = allProducts.filter(p => p.category === cat.name).length;
              return (
                <div key={cat.name} onClick={() => onNav("catalog", cat.name)} style={{
                  cursor: "pointer", padding: "32px 20px", borderRadius: T.r.lg,
                  background: T.bg3, border: `1px solid ${T.wh5}`,
                  textAlign: "center", transition: "all 0.3s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = T.bg4; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.wh5; e.currentTarget.style.background = T.bg3; }}
                >
                  <span style={{ fontSize: 28, display: "block", marginBottom: 12 }}>{cat.icon}</span>
                  <p style={{ fontFamily: T.f, fontSize: 14, fontWeight: 700, color: T.wh, marginBottom: 4 }}>{cat.name}</p>
                  <p style={{ fontFamily: T.f, fontSize: 11, color: T.wh4 }}>{cat.desc}</p>
                  {count > 0 && <p style={{ fontFamily: T.f, fontSize: 10, color: T.wh4, marginTop: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>{count} ürün</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ DISCOUNT PRODUCTS — Apple scroll section ═══ */}
      {discountProducts.length > 0 && (
        <HScrollSection title="İndirimli Ürünler" subtitle="Fırsatlar" items={discountProducts} onView={onView} />
      )}

      {/* ═══ PROMO BANNER — SpaceX immersive dark ═══ */}
      <section style={{ padding: "0 32px", maxWidth: 1400, margin: "0 auto" }}>
        <div onClick={() => onNav("catalog")} style={{
          cursor: "pointer", borderRadius: T.r.xl, overflow: "hidden", position: "relative",
          background: `linear-gradient(135deg, ${T.bg3} 0%, rgba(200,16,46,0.15) 100%)`,
          border: `1px solid ${T.wh5}`, padding: "64px 48px",
          display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 32,
        }}>
          <div>
            <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: T.gold, marginBottom: 16 }}>SINIRLI SÜRE</p>
            <h3 style={{ fontFamily: T.f, fontSize: "clamp(24px, 3vw, 40px)", fontWeight: 800, color: T.wh, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 12 }}>
              Sezon Sonu İndirimi
            </h3>
            <p style={{ fontFamily: T.f, fontSize: 14, color: T.wh3, lineHeight: 1.7 }}>
              Seçili modellerde <span style={{ color: T.gold, fontWeight: 600 }}>%40'a varan</span> indirimler.
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: T.f, fontSize: 56, fontWeight: 900, color: T.wh, lineHeight: 1 }}>%40</div>
            <div style={{ fontFamily: T.f, fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 4 }}>İNDİRİM</div>
            <div style={{ marginTop: 20, fontFamily: T.f, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: T.wh, border: `1px solid ${T.wh5}`, padding: "10px 24px", borderRadius: T.r.full, display: "inline-flex", alignItems: "center", gap: 8 }}>ALIŞVERİŞE BAŞLA →</div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS — SpaceX dark section ═══ */}
      <section style={{ padding: "100px 32px", borderTop: `1px solid ${T.wh5}`, marginTop: 80 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em", color: "#25D366", marginBottom: 12 }}>WHATSAPP SİPARİŞ</p>
            <h2 style={{ fontFamily: T.f, fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, color: T.wh, letterSpacing: "-0.02em" }}>Nasıl Sipariş Verilir?</h2>
          </div>
          <div className="wa-steps" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { n: "01", t: "Ürünü Seç", d: "Katalogdan beğendiğin modeli bul" },
              { n: "02", t: "WhatsApp'tan Yaz", d: "Ürün adı ve bedenini ilet" },
              { n: "03", t: "Siparişi Onayla", d: "Ödeme ve teslimat bilgilerini ver" },
              { n: "04", t: "Kapıda Teslim", d: "1-3 iş günü içinde kapında" },
            ].map(s => (
              <div key={s.n} style={{ background: T.bg3, border: `1px solid ${T.wh5}`, borderRadius: T.r.lg, padding: "36px 24px", textAlign: "center" }}>
                <div style={{ fontFamily: T.f, fontSize: 32, fontWeight: 800, color: T.wh5, marginBottom: 16 }}>{s.n}</div>
                <p style={{ fontFamily: T.f, fontSize: 15, fontWeight: 700, color: T.wh, marginBottom: 8 }}>{s.t}</p>
                <p style={{ fontFamily: T.f, fontSize: 12, color: T.wh3, lineHeight: 1.6 }}>{s.d}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
            <a href={waLink(contact.whatsappFull)} target="_blank" rel="noreferrer" style={{
              fontFamily: T.f, fontSize: 13, fontWeight: 600, letterSpacing: "0.1em",
              color: "#fff", background: "#25D366", padding: "16px 40px",
              borderRadius: T.r.full, textDecoration: "none", display: "flex", alignItems: "center", gap: 10,
            }}>
              {I.wa} {contact.whatsapp}
            </a>
          </div>
        </div>
      </section>

      <Foot onNav={onNav} settings={S} />
    </div>
  );
}

// ============================================
// CATALOG PAGE
// ============================================
const ALL_CATEGORIES = ["Tümü", "Spor", "Günlük", "Bot", "Sandalet", "Krampon", "Klasik", "Cüzdan"];

function Catalog({ onView, allProducts, initCat = "Tümü", onNav }) {
  const [fl, sFl] = useState(initCat);
  const [vis, sVis] = useState(12);
  const flt = fl === "Tümü" ? allProducts : allProducts.filter(p => p.category === fl);
  const shown = flt.slice(0, vis);
  const hasMore = vis < flt.length;
  return (
    <div style={{ paddingTop: 64, background: T.bg, minHeight: "100vh" }}>
      <section style={{ maxWidth: 1400, margin: "0 auto", padding: "48px 32px 100px" }}>
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em", color: T.ac, marginBottom: 8 }}>KOLEKSİYON</p>
          <h1 style={{ fontFamily: T.f, fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: T.wh, letterSpacing: "-0.02em", marginBottom: 8 }}>Ayakkabılar</h1>
          <p style={{ fontFamily: T.f, fontSize: 14, color: T.wh3 }}>{flt.length} ürün listeleniyor</p>
        </div>

        {/* Filter Pills */}
        <div className="no-scrollbar" style={{ display: "flex", gap: 8, marginBottom: 40, overflowX: "auto", paddingBottom: 4 }}>
          {ALL_CATEGORIES.map(c => (
            <button key={c} onClick={() => { sFl(c); sVis(12); }} style={{
              fontFamily: T.f, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em",
              padding: "10px 22px", borderRadius: T.r.full, cursor: "pointer", whiteSpace: "nowrap",
              border: fl === c ? "1px solid transparent" : `1px solid ${T.wh5}`,
              background: fl === c ? T.wh : "transparent",
              color: fl === c ? T.bg : T.wh3, transition: "all 0.2s",
            }}>
              {c}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {flt.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <p style={{ fontFamily: T.f, fontSize: 48, marginBottom: 16 }}>🛍️</p>
            <p style={{ fontFamily: T.f, fontSize: 18, fontWeight: 600, color: T.wh, marginBottom: 8 }}>
              {fl === "Tümü" ? "Henüz ürün eklenmedi" : `${fl} kategorisinde ürün yok`}
            </p>
            <p style={{ fontFamily: T.f, fontSize: 14, color: T.wh3 }}>
              {fl === "Tümü" ? "Admin panelinden ürün ekleyin." : "Başka bir kategori seçin."}
            </p>
          </div>
        ) : (
          <div className="prod-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {shown.map(p => <Card key={p.id || p.slug} p={p} onView={onView} />)}
          </div>
        )}
        {hasMore && (
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <button onClick={() => sVis(v => v + 12)} style={{
              fontFamily: T.f, fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
              color: T.wh, background: "transparent", border: `1px solid ${T.wh5}`,
              padding: "14px 48px", borderRadius: T.r.full, cursor: "pointer",
            }}>
              DAHA FAZLA ({Math.max(0, flt.length - vis)})
            </button>
          </div>
        )}
      </section>
      <Foot onNav={onNav || (() => {})} settings={settings} />
    </div>
  );
}

// ============================================
// DETAIL PAGE
// ============================================
function Detail({ product: p, onBack, settings, onNav }) {
  const ct = settings?.contact || DEFAULT_SETTINGS.contact;
  const [sz, sSz] = useState(null);
  const [im, sIm] = useState(0);
  const [sf, sSf] = useState(false);
  const isSoldOut = p.stock === 0;
  const sl = isSoldOut
    ? { t: "Stokta Yok", c: T.ac, bg: T.acSoft }
    : p.stock && p.stock <= 3
    ? { t: `Son ${p.stock} adet!`, c: "#d97706", bg: "rgba(217,119,6,0.1)" }
    : { t: "Stokta", c: T.gn, bg: "rgba(34,197,94,0.1)" };
  const allImages = p.images?.length ? p.images : [p.dbImage || p.image];
  return (
    <div style={{ paddingTop: 64, background: T.bg, minHeight: "100vh" }}>
      {sf && <BuyForm product={p} onClose={() => sSf(false)} settings={settings} />}
      <section style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 32px 100px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <span onClick={onBack} style={{ fontFamily: T.f, fontSize: 12, color: T.wh3, cursor: "pointer", letterSpacing: "0.06em" }}>← AYAKKABILAR</span>
          <span style={{ color: T.wh5 }}>/</span>
          <span style={{ fontFamily: T.f, fontSize: 12, color: T.wh, fontWeight: 500 }}>{p.name || p.title}</span>
        </div>
        <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 64 }}>
          <div>
            <div style={{ borderRadius: T.r.xl, overflow: "hidden", aspectRatio: "1/1", background: T.bg3, border: `1px solid ${T.wh5}`, marginBottom: 14 }}>
              <img src={allImages[im]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            {allImages.length > 1 && (
              <div style={{ display: "flex", gap: 10 }}>
                {allImages.map((x, i) => (
                  <div key={i} onClick={() => sIm(i)} style={{ width: 72, height: 72, borderRadius: T.r.sm, overflow: "hidden", border: `2px solid ${im === i ? T.wh : T.wh5}`, cursor: "pointer", background: T.bg3 }}>
                    <img src={x} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ paddingTop: 8 }}>
            <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: T.ac, marginBottom: 12 }}>{p.category}</p>
            <h1 style={{ fontFamily: T.f, fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 800, color: T.wh, marginBottom: 16, letterSpacing: "-0.02em" }}>{p.name || p.title}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <span style={{ fontFamily: T.f, fontSize: 30, fontWeight: 800, color: T.wh }}>₺{(p.price || 0).toLocaleString("tr-TR")}</span>
              {p.originalPrice && <span style={{ fontFamily: T.f, fontSize: 16, color: T.wh4, textDecoration: "line-through" }}>₺{p.originalPrice.toLocaleString("tr-TR")}</span>}
              {p.originalPrice && p.price < p.originalPrice && <span style={{ fontFamily: T.f, fontSize: 12, fontWeight: 700, color: T.ac, background: T.acSoft, padding: "4px 12px", borderRadius: T.r.full }}>%{Math.round((1 - p.price / p.originalPrice) * 100)}</span>}
            </div>
            {p.description && <p style={{ fontFamily: T.f, fontSize: 15, color: T.wh3, lineHeight: 1.7, marginBottom: 24, maxWidth: 480 }}>{p.description}</p>}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: T.r.full, background: sl.bg, marginBottom: 28 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: sl.c }} />
              <span style={{ fontFamily: T.f, fontSize: 12, fontWeight: 600, color: sl.c }}>{sl.t}</span>
            </div>
            {p.sizes && p.sizes.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: T.wh3, marginBottom: 14 }}>BEDEN {sz && <span style={{ color: T.wh }}>— {sz}</span>}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {p.sizes.map(s => (
                    <button key={s} onClick={() => sSz(s)} style={{
                      width: 52, height: 52, borderRadius: T.r.sm,
                      border: sz === s ? `2px solid ${T.wh}` : `1px solid ${T.wh5}`,
                      background: sz === s ? T.wh : "transparent",
                      color: sz === s ? T.bg : T.wh3,
                      fontFamily: T.f, fontSize: 14, fontWeight: 600, cursor: "pointer",
                    }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => !isSoldOut && sSf(true)} style={{
                width: "100%", padding: "17px",
                background: !isSoldOut ? T.wh : T.wh5,
                color: !isSoldOut ? T.bg : T.wh4,
                border: "none", borderRadius: T.r.sm, fontFamily: T.f, fontSize: 14, fontWeight: 700,
                cursor: !isSoldOut ? "pointer" : "not-allowed", letterSpacing: "0.08em", textTransform: "uppercase",
              }}>
                {!isSoldOut ? "SATIN ALMA TALEBİ" : "STOKTA YOK"}
              </button>
              <a href={`https://wa.me/${ct.whatsappFull}?text=Merhaba!%20${encodeURIComponent((p.name || p.title || "Ürün"))}%20hakkında%20bilgi%20almak%20istiyorum.`}
                target="_blank" rel="noreferrer" style={{
                  width: "100%", padding: "15px", boxSizing: "border-box",
                  background: "transparent", color: "#25D366", border: "1px solid #25D366",
                  borderRadius: T.r.sm, fontFamily: T.f, fontSize: 13, fontWeight: 600,
                  textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                }}>
                {I.wa} WHATSAPP İLE SOR
              </a>
            </div>
          </div>
        </div>
      </section>
      <Foot onNav={onNav || (() => {})} settings={settings} />
    </div>
  );
}

// ============================================
// APP ROOT
// ============================================
const ENABLE_STATIC_FALLBACK = false;

export default function App({ dbProducts = [], siteSettings = null, banners = [] }) {
  const S = siteSettings || DEFAULT_SETTINGS;
  const [pg, sPg] = useState("home");
  const [sel, sSel] = useState(null);
  const [initCat, sInitCat] = useState("Tümü");

  // Load Inter font
  useEffect(() => {
    if (document.querySelector('link[data-uygun-fonts]')) return;
    const fl = document.createElement("link");
    fl.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap";
    fl.rel = "stylesheet";
    fl.setAttribute("data-uygun-fonts", "1");
    document.head.appendChild(fl);
  }, []);

  const allProducts = (() => {
    const dbMapped = (dbProducts || []).map(p => {
      const firstImg = Array.isArray(p.images) && p.images[0] ? p.images[0] : null;
      return {
        ...p,
        image: firstImg || shoe("#111","#333","#ccc","#c8102e","#fff",0),
        dbImage: firstImg,
      };
    });
    if (ENABLE_STATIC_FALLBACK && dbMapped.length === 0) {
      return STATIC_PRODUCTS.map(p => ({ ...p, dbImage: null }));
    }
    return dbMapped;
  })();

  const nav = (p, cat) => {
    if (cat) sInitCat(cat);
    else if (p === "catalog") sInitCat("Tümü");
    sPg(p);
    if (p !== "detail") sSel(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const view = p => { sSel(p); sPg("detail"); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div style={{ minHeight: "100vh", background: T.bg }}>
      <GlobalStyles />
      <TopBar settings={S} />
      <Navbar onNav={nav} pg={pg} settings={S} />
      {pg === "home" && <Home onNav={nav} onView={view} allProducts={allProducts} settings={S} banners={banners} />}
      {pg === "catalog" && <Catalog key={initCat} initCat={initCat} onView={view} allProducts={allProducts} onNav={nav} settings={S} />}
      {pg === "detail" && sel && <Detail product={sel} onBack={() => nav("catalog")} settings={S} onNav={nav} />}
    </div>
  );
}
