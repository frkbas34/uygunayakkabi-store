"use client";
import { useState, useEffect, useRef } from "react";

// ============================================
// DESIGN TOKENS — Light Beige, Playfair + Inter
// ============================================
const T = {
  // Fonts
  serif: "'Playfair Display', serif",
  sans: "'Inter', -apple-system, sans-serif",
  // Colors
  bg: "#f4efe6",           // Light beige background
  bgCard: "rgba(238,232,222,0.65)",  // Card background with opacity
  text: "#1c1a16",         // Dark text
  textLight: "rgba(28,26,22,0.5)",   // Light text
  textLighter: "rgba(28,26,22,0.3)", // Even lighter text
  red: "#c8102e",          // Red accent
  redSoft: "rgba(200,16,46,0.06)",   // Red soft background
  green: "#25D366",        // WhatsApp green
  // Radius
  r: { sm: 12, md: 16, lg: 20, xl: 24, full: 999 },
};

// ============================================
// SVG SHOE & WALLET GENERATORS
// ============================================
function shoe(bg, sole, body, acc, lace, rot = 0) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><rect width="800" height="800" fill="${bg}"/><g transform="translate(400,400) rotate(${rot}) scale(1.15)"><path d="M-220,80Q-220,110-180,120L200,120Q240,120,250,95L260,60Q260,45,240,40L-180,40Q-220,45-220,80Z" fill="${sole}"/><path d="M-200,48Q-210,68-190,78L230,78Q250,73,255,53L250,33Q245,23,230,23L-175,23Q-200,28-200,48Z" fill="white" opacity="0.88"/><path d="M-180,28Q-200,8-195,-42Q-185,-102-140,-132Q-80,-172,20,-177Q120,-180,180,-152Q230,-127,245,-72Q255,-27,245,13L240,23L-175,23Z" fill="${body}"/><path d="M-150,-45Q-70,-92,50,-87Q145,-82,210,-38" fill="none" stroke="${acc}" stroke-width="14" stroke-linecap="round" opacity="0.75"/><line x1="-78" y1="-132" x2="-18" y2="-147" stroke="${lace}" stroke-width="4.5" stroke-linecap="round"/><line x1="-58" y1="-112" x2="2" y2="-132" stroke="${lace}" stroke-width="4.5" stroke-linecap="round"/><line x1="-38" y1="-92" x2="22" y2="-117" stroke="${lace}" stroke-width="4.5" stroke-linecap="round"/></g></svg>`)}`;
}

// D-193: wallet(), heroImg, WALLET_PHOTOS, PHOTO, ph(), STATIC_PRODUCTS removed
// — all demo/placeholder products purged, only real DB products shown

// ============================================
// CATEGORY DATA
// ============================================
// D-177: Removed Erkek Ayakkabı & Krampon
const CAT_DATA = [
  { name: "Spor", desc: "Koşu & Fitness", icon: "⚡" },
  { name: "Günlük", desc: "Her Güne Uygun", icon: "👟" },
  { name: "Klasik", desc: "Ofis & Şıklık", icon: "✦" },
  { name: "Bot", desc: "Kış & Dağ", icon: "🏔" },
  { name: "Terlik", desc: "Rahat & Hafif", icon: "🩴" },
  { name: "Cüzdan", desc: "Deri & Kartlık", icon: "◆" },
];

// ============================================
// ICONS (SVG)
// ============================================
const I = {
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="17" x2="21" y2="17"/></svg>,
  close: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  arrow: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  check: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>,
  wa: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  cart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
};

// ============================================
// HELPERS
// ============================================
const waLink = (num) => `https://wa.me/${num || '905331524843'}`;

const DEFAULT_SETTINGS = {
  siteName: 'UygunAyakkabı',
  contact: { whatsapp: '0533 152 48 43', whatsappFull: '905331524843', email: '', instagram: '' },
  shipping: { freeShippingThreshold: 3000, shippingCost: 49, showFreeShippingBanner: true },
  trustBadges: { monthlyCustomers: '500+', totalProducts: '200+', satisfactionRate: '%98' },
  announcementBar: { enabled: true, text: '3.000₺ üzeri siparişlerde KARGO BEDAVA', bgColor: '#c8102e' },
};

// ============================================
// GLOBAL STYLES
// ============================================
function GlobalStyles() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap";
    link.rel = "stylesheet";
    link.setAttribute("data-uygun-fonts", "1");
    document.head.appendChild(link);
  }, []);

  return (
    <style>{`
      *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body { background: ${T.bg}; color: ${T.text}; font-family: ${T.sans}; -webkit-font-smoothing: antialiased; }
      ::selection { background: ${T.red}; color: #fff; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      .fade-up { animation: fadeUp 0.9s cubic-bezier(.22,1,.36,1) forwards; opacity: 0; }
      .fade-in { animation: fadeIn 0.6s ease forwards; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      /* D-260: catalog mobile/desktop control visibility */
      .catalog-desktop-controls { display: block; }
      .catalog-mobile-bar { display: none; }
      @media(max-width:767px) {
        .catalog-desktop-controls { display: none !important; }
        .catalog-mobile-bar { display: flex !important; }
        .catalog-section { padding: 16px 16px 100px !important; }
      }
      @media(max-width:768px) {
        .hero-grid { grid-template-columns: 1fr !important; text-align: center; }
        .hero-grid > div:first-child { order: 2; }
        .hero-btns { justify-content: center !important; }
        .detail-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        .nav-desktop { display: none !important; }
        .nav-mobile { display: flex !important; }
        .prod-grid { grid-template-columns: repeat(3,1fr) !important; gap: 12px !important; }
        .footer-grid { grid-template-columns: 1fr 1fr !important; }
        .why-us-grid { grid-template-columns: 1fr 1fr !important; }
        .about-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
      }
      @media(max-width:640px) {
        .prod-grid { grid-template-columns: repeat(2,1fr) !important; }
        .footer-grid { grid-template-columns: 1fr !important; }
        .why-us-grid { grid-template-columns: 1fr !important; }
      }
    `}</style>
  );
}

// ============================================
// TOP BAR
// ============================================
function TopBar({ settings }) {
  const [show, setShow] = useState(true);
  const bar = settings?.announcementBar || DEFAULT_SETTINGS.announcementBar;
  if (!show || !bar.enabled) return null;
  return (
    <div style={{ background: "rgba(244,239,230,0.8)", borderBottom: "1px solid rgba(28,26,22,0.06)", backdropFilter: "blur(20px)", padding: "10px 32px", textAlign: "center", position: "relative", zIndex: 10 }}>
      <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 500, color: T.textLighter, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: T.red, marginRight: 8, animation: "pulse 2s infinite" }} />
        {bar.text}
      </span>
      <button onClick={() => setShow(false)} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.textLighter, cursor: "pointer", fontSize: 14 }}>✕</button>
    </div>
  );
}

// ============================================
// NAVBAR
// ============================================
function Navbar({ onNav, pg, settings, cartCount, onCartToggle }) {
  const waNum = settings?.contact?.whatsappFull || DEFAULT_SETTINGS.contact.whatsappFull;
  const [mo, setMo] = useState(false);
  const [sc, setSc] = useState(false);

  useEffect(() => {
    const fn = () => setSc(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [{ k: "home", l: "ANA SAYFA" }, { k: "catalog", l: "AYAKKABILAR" }];

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: sc ? "rgba(244,239,230,0.92)" : "transparent",
      backdropFilter: sc ? "blur(30px) saturate(1.6)" : "none",
      borderBottom: sc ? "1px solid rgba(28,26,22,0.06)" : "1px solid transparent",
      transition: "all 0.4s cubic-bezier(.22,1,.36,1)",
    }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 40px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={() => onNav("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 800, color: T.text, letterSpacing: "0.14em" }}>UYGUN</span>
          <span style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 300, color: T.red, letterSpacing: "0.08em" }}>AYAKKABI</span>
        </div>
        <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 44 }}>
          {links.map(l => (
            <span key={l.k} onClick={() => onNav(l.k)} style={{
              cursor: "pointer", fontFamily: T.sans, fontSize: 11, fontWeight: 500,
              color: pg === l.k ? T.text : T.textLighter,
              letterSpacing: "0.16em", transition: "color 0.3s", textTransform: "uppercase",
            }}>
              {l.l}
            </span>
          ))}
          {/* D-194: Cart icon */}
          <button onClick={onCartToggle} style={{
            position: "relative", background: "none", border: "none", cursor: "pointer", color: T.text, padding: 4,
          }}>
            {I.cart}
            {cartCount > 0 && (
              <span style={{
                position: "absolute", top: -6, right: -8, width: 18, height: 18, borderRadius: "50%",
                background: T.red, color: "#fff", fontSize: 10, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{cartCount}</span>
            )}
          </button>
          <a href={waLink(waNum)} target="_blank" rel="noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
            color: "#fff", background: T.green, border: "none", padding: "10px 24px",
            borderRadius: T.r.full, textDecoration: "none", transition: "all 0.3s", cursor: "pointer",
          }}>
            {I.wa} WHATSAPP
          </a>
        </div>
        <div className="nav-mobile" style={{ display: "none", alignItems: "center", gap: 12 }}>
          <button onClick={onCartToggle} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", color: T.text, padding: 4 }}>
            {I.cart}
            {cartCount > 0 && (
              <span style={{ position: "absolute", top: -6, right: -8, width: 18, height: 18, borderRadius: "50%", background: T.red, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>
            )}
          </button>
          <button onClick={() => setMo(!mo)} style={{ background: "none", border: "none", cursor: "pointer", color: T.text, padding: 4 }}>
            {mo ? I.close : I.menu}
          </button>
        </div>
      </div>
      {mo && (
        <div style={{ padding: "16px 32px 32px", background: T.bg, borderTop: "1px solid rgba(28,26,22,0.06)" }}>
          {links.map(l => (
            <div key={l.k} onClick={() => { onNav(l.k); setMo(false); }} style={{
              cursor: "pointer", fontFamily: T.sans, fontSize: 14, fontWeight: 500,
              color: T.text, padding: "16px 0", letterSpacing: "0.1em",
              borderBottom: "1px solid rgba(28,26,22,0.06)",
            }}>
              {l.l}
            </div>
          ))}
          <a href={waLink(waNum)} target="_blank" rel="noreferrer" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            marginTop: 16, fontFamily: T.sans, fontSize: 12, fontWeight: 600,
            color: "#fff", background: T.green, padding: "14px 24px",
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
// PRODUCT CARD — Beige glassmorphism
// ============================================
function Card({ p, onView }) {
  const [h, sH] = useState(false);
  const [slideIdx, setSI] = useState(0);
  // D-174b: Only AI images (generativeGallery), never original intake photos
  const imgSrc = p.dbImage || p.image;
  const aiImgs = Array.isArray(p.aiImages) && p.aiImages.length > 0 ? p.aiImages : null;
  const images = aiImgs || [imgSrc];
  const displayImg = images[slideIdx];

  // D-257: Card is a real <a> link — enables right-click, mobile long-press, semantics
  const cardHref = `/products/${p.slug || p.id}`;

  return (
    <a
      href={cardHref}
      onMouseEnter={() => sH(true)} onMouseLeave={() => { sH(false); setSI(0); }}
      style={{
        display: "block", textDecoration: "none",
        cursor: "pointer", borderRadius: T.r.lg, overflow: "hidden",
        background: T.bgCard, border: "1px solid rgba(28,26,22,0.06)",
        transition: "all 0.45s cubic-bezier(.22,1,.36,1)", backdropFilter: "blur(10px)",
        transform: h ? "translateY(-8px)" : "translateY(0)",
        boxShadow: h ? "0 28px 60px rgba(0,0,0,0.08)" : "none",
      }}
    >
      {/* Image with swipe */}
      <div style={{ position: "relative", paddingTop: "115%", overflow: "hidden", background: "#ebe5da" }}>
        <img src={displayImg} alt={p.name} loading="lazy" style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          objectFit: "cover", transition: "all 0.4s cubic-bezier(.22,1,.36,1)",
        }} />
        {/* Badge */}
        {p.badge && (
          <span style={{
            position: "absolute", top: 14, left: 14, zIndex: 2,
            fontFamily: T.sans, fontSize: 9, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            padding: "5px 14px", borderRadius: T.r.full,
            color: "#fff", background: p.badge === "İndirim" ? T.red : "#1c1a16",
          }}>
            {p.badge}
          </span>
        )}
        {/* D-192: Low stock banner — "Son X Adet!" when 1-3 items left */}
        {p.stock > 0 && p.stock <= 3 && (
          <span style={{
            position: "absolute", top: 14, right: 14, zIndex: 2,
            fontFamily: T.sans, fontSize: 9, fontWeight: 700,
            letterSpacing: "0.08em",
            padding: "5px 12px", borderRadius: T.r.full,
            color: "#d97706", background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(217,119,6,0.25)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}>
            Son {p.stock} Adet!
          </span>
        )}
        {/* Arrows and dots on hover */}
        {h && images.length > 1 && (
          <>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 10px", pointerEvents: "none", zIndex: 3 }}>
              <button onClick={(e) => { e.stopPropagation(); setSI(i => i === 0 ? images.length - 1 : i - 1); }} style={{
                width: 34, height: 34, borderRadius: "50%", background: "rgba(238,232,222,0.85)", border: "1px solid rgba(28,26,22,0.08)",
                color: T.text, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "auto", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}>←</button>
              <button onClick={(e) => { e.stopPropagation(); setSI(i => i === images.length - 1 ? 0 : i + 1); }} style={{
                width: 34, height: 34, borderRadius: "50%", background: "rgba(238,232,222,0.85)", border: "1px solid rgba(28,26,22,0.08)",
                color: T.text, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "auto", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}>→</button>
            </div>
            <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 3 }}>
              {images.map((_, i) => (
                <span key={i} style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: i === slideIdx ? "#fff" : "rgba(238,232,222,0.4)",
                  transition: "all 0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                }} />
              ))}
            </div>
          </>
        )}
        {/* CTA on hover */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "32px 16px 14px", background: "linear-gradient(transparent, rgba(0,0,0,0.4))",
          opacity: h ? 1 : 0, transition: "opacity 0.35s", display: "flex", justifyContent: "center", zIndex: 2,
        }}>
          <span style={{
            fontFamily: T.sans, fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase",
            color: T.text, background: "#fff", padding: "10px 28px", borderRadius: T.r.full,
            boxShadow: "0 2px 12px rgba(0,0,0,0.1)", cursor: "pointer", transition: "all 0.2s",
          }}>
            İNCELE
          </span>
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: "18px 20px 22px" }}>
        <p style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 600, color: T.textLighter, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 7 }}>{p.category}</p>
        <h3 style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12, lineHeight: 1.35 }}>{p.name || p.title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 800, color: T.text }}>₺{(p.price || 0).toLocaleString("tr-TR")}</span>
          {p.originalPrice && <span style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(28,26,22,0.4)", textDecoration: "line-through" }}>₺{p.originalPrice.toLocaleString("tr-TR")}</span>}
          {p.originalPrice && p.price < p.originalPrice && (
            <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, color: T.red, background: T.redSoft, padding: "2px 10px", borderRadius: T.r.full }}>
              %{Math.round((1 - p.price / p.originalPrice) * 100)} indirim
            </span>
          )}
        </div>
        {/* D-257: Always-visible tap affordance — critical for mobile (no hover state) */}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(28,26,22,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.text }}>İncele</span>
          <span style={{ fontFamily: T.sans, fontSize: 14, color: T.textLighter }}>→</span>
        </div>
      </div>
    </a>
  );
}

// ============================================
// HERO SECTION
// ============================================
function Hero({ onNav, settings, allProducts }) {
  const trust = settings?.trustBadges || DEFAULT_SETTINGS.trustBadges;
  const contact = settings?.contact || DEFAULT_SETTINGS.contact;

  return (
    <section style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden", textAlign: "center",
    }}>
      {/* Grid background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(28,26,22,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(28,26,22,0.04) 1px, transparent 1px)", backgroundSize: "72px 72px" }} />
      {/* AI Glow */}
      <div style={{ position: "fixed", top: "-20%", right: "-10%", width: 800, height: 800, background: "radial-gradient(circle, rgba(200,16,46,0.04) 0%, transparent 65%)", pointerEvents: "none", filter: "blur(80px)", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", padding: "160px 40px 80px", width: "100%" }}>
        {/* Tag */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: T.sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.22em", color: T.red, marginBottom: 32, background: T.redSoft, padding: "8px 24px", borderRadius: T.r.full, border: "1px solid rgba(200,16,46,0.1)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.red }} />
          MERKEZDEN ERİŞİM
        </div>

        {/* Title */}
        <h1 style={{ fontFamily: T.serif, fontSize: "clamp(40px, 5.5vw, 72px)", fontWeight: 800, color: T.text,
          lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 28 }}>
          Kaliteli ayakkabıya<br />merkezinden, daha akıllı erişim
        </h1>

        {/* Description */}
        <p style={{ fontFamily: T.sans, fontSize: 16, color: T.textLight, lineHeight: 1.9,
          margin: "0 auto 16px", maxWidth: 600 }}>
          Aymakoop merkezinden seçilmiş kaliteli ayakkabıları uygun fiyatlarla sunuyoruz.
          Beğendiğiniz ürünü inceleyin, talep bırakın — ekibimiz kısa sürede sizi arıyor.
        </p>

        {/* D-258: Compact inquiry flow hint — replaces internal jargon line */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          margin: "0 auto 48px", flexWrap: "wrap" }}>
          {[["👟", "Ürünü İncele"], ["📋", "Talep Bırak"], ["📞", "Biz Seni Arayalım"]].map(([ic, label], i, arr) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: T.sans,
                fontSize: 12, fontWeight: 600, color: T.textLight }}>
                <span style={{ fontSize: 14 }}>{ic}</span> {label}
              </span>
              {i < arr.length - 1 && <span style={{ color: "rgba(28,26,22,0.18)", fontSize: 16, fontWeight: 300, marginLeft: 8 }}>→</span>}
            </span>
          ))}
        </div>

        {/* Buttons */}
        <div className="hero-btns" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 80 }}>
          <button onClick={() => onNav("catalog")} style={{
            fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#fff", background: T.text,
            border: "none", padding: "17px 44px", borderRadius: T.r.full, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 10,
            transition: "all 0.3s",
          }}>
            ÜRÜNLERİ KEŞFET {I.arrow}
          </button>
          {/* D-258: Scroll to StepsSection (inquiry flow) — more actionable than "NEDEN BİZ?" */}
          <button onClick={() => {
            const el = document.getElementById("nasil-calisir");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }} style={{
            fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em",
            textTransform: "uppercase", color: T.text, background: "transparent",
            border: "1px solid rgba(28,26,22,0.15)", padding: "17px 40px", borderRadius: T.r.full,
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10,
            transition: "all 0.3s",
          }}>
            NASIL ÇALIŞIR?
          </button>
        </div>

        {/* Scroll CTA */}
        <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 600, color: T.textLighter,
          letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer" }}>
          AŞAĞI KAYDIR
          <span style={{ display: "block", marginTop: 8, fontSize: 18, animation: "float 2s ease-in-out infinite" }}>↓</span>
        </div>
      </div>
    </section>
  );
}

// ============================================
// NEDEN UYGUN AYAKKABI? (Why Us — 6 Cards)
// ============================================
const WHY_US_CARDS = [
  { icon: "📍", title: "Doğrudan Merkezden Erişim", desc: "Türkiye'nin ayakkabı ve deri üretim merkezlerinden biri olan Aymakoop içindeki erişimimiz sayesinde ürünleri kaynağından takip edebiliyoruz." },
  { icon: "💎", title: "Tekleme ve Özel Ürünler", desc: "Seri dışı kalan, az adetli, tekleme ya da özel kalan kaliteli ürünlere ulaşabiliyoruz." },
  { icon: "💰", title: "Daha Güçlü Fiyat Avantajı", desc: "Aracı katmanların azalması sayesinde, çoğu zaman piyasadaki değerinden daha uygun fiyatlarla ürün sunabiliyoruz." },
  { icon: "🤖", title: "Yapay Zekâ Destekli Sistem", desc: "Ürün yönetimi, içerik akışı ve dijital sunum tarafında yapay zekâ destekli otomasyonlardan faydalanıyoruz." },
  { icon: "🌐", title: "Güçlü Dijital Varlık", desc: "Web sitemiz ve sosyal medya kanallarımız, bu güçlü tedarik yapısını hızlı ve çağdaş bir şekilde yansıtmak için kuruldu." },
  { icon: "✨", title: "Her Yerde Bulunmayan Ürünler", desc: "Bizdeki birçok ürün, klasik mağaza düzeninde kolayca bulunmayan, sınırlı ve özel ürünlerden oluşur." },
];

function WhyUsSection() {
  return (
    <section id="neden-biz" style={{ padding: "100px 40px", maxWidth: 1440, margin: "0 auto", borderTop: "1px solid rgba(28,26,22,0.06)", position: "relative", zIndex: 1 }}>
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: T.red, marginBottom: 10 }}>FARKIMIZ</p>
        <h2 style={{ fontFamily: T.serif, fontSize: "clamp(30px, 3.5vw, 48px)", fontWeight: 700, color: T.text, letterSpacing: "-0.02em", marginBottom: 20 }}>Neden Uygun Ayakkabı?</h2>
        <p style={{ fontFamily: T.sans, fontSize: 15, color: T.textLight, lineHeight: 1.85, maxWidth: 600, margin: "0 auto" }}>
          Çünkü biz klasik bir satış modeliyle ilerlemiyoruz. Bizim gücümüz, kaliteli ürüne doğrudan erişim ile modern dijital sistemleri bir araya getirmemizden geliyor.
        </p>
      </div>
      <div className="why-us-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {WHY_US_CARDS.map((c, i) => (
          <div key={i} style={{
            background: "rgba(238,232,222,0.5)", border: "1px solid rgba(28,26,22,0.06)", borderRadius: 20,
            padding: "36px 28px", backdropFilter: "blur(10px)", transition: "all 0.35s",
          }}>
            <span style={{ fontSize: 32, display: "block", marginBottom: 18 }}>{c.icon}</span>
            <p style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 10 }}>{c.title}</p>
            <p style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(28,26,22,0.5)", lineHeight: 1.75 }}>{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================
// SIPARIŞ ADIMLARI (4 Steps)
// ============================================
// D-258: Steps reflect actual inquiry flow — browse → request → callback → delivery
const STEPS_DATA = [
  { icon: "👟", num: "ADIM 01", title: "Ürünü İncele", desc: "Beğendiğin ürünü bul, beden bilgilerini gör, ürün sayfasına git", method: "Ücretsiz Göz At", mColor: T.red, mBg: T.redSoft, barColor: T.red },
  { icon: "📋", num: "ADIM 02", title: "Talep Bırak", desc: "Adını ve telefon numaranı bırak — ürün sayfasındaki kısa formla 1 dakikada tamamlanır", method: "Hızlı Form", mColor: "#3b82f6", mBg: "rgba(59,130,246,0.08)", barColor: "#3b82f6" },
  { icon: "📞", num: "ADIM 03", title: "Biz Seni Arayalım", desc: "Ekibimiz seni arar, beden ve sipariş detaylarını birlikte tamamlarız", method: "Kısa Sürede Dönüş", mColor: "#25D366", mBg: "rgba(37,211,102,0.08)", barColor: "#25D366" },
  { icon: "📦", num: "ADIM 04", title: "Teslimat", desc: "Siparişin onaylanır, kargoya verilir — kapıda ödeme seçeneği mevcuttur", method: "Kargo ile Teslimat", mColor: "#f59e0b", mBg: "rgba(245,158,11,0.08)", barColor: "#f59e0b" },
];

function StepsSection() {
  return (
    <section id="nasil-calisir" style={{ padding: "100px 40px", maxWidth: 1440, margin: "0 auto", borderTop: "1px solid rgba(28,26,22,0.06)", position: "relative", zIndex: 1 }}>
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: T.red, marginBottom: 10 }}>NASIL ÇALIŞIR?</p>
        <h2 style={{ fontFamily: T.serif, fontSize: "clamp(30px, 3.5vw, 48px)", fontWeight: 700, color: T.text, letterSpacing: "-0.02em" }}>4 Adımda Sipariş</h2>
        <p style={{ fontFamily: T.sans, fontSize: 14, color: T.textLighter, marginTop: 14, maxWidth: 520, marginLeft: "auto", marginRight: "auto", lineHeight: 1.7 }}>Talep bırakın, biz sizi arayalım — sipariş sürecinde her adımda yanınızdayız.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {STEPS_DATA.map((s, i) => (
          <div key={i} style={{
            background: "rgba(238,232,222,0.5)", border: "1px solid rgba(28,26,22,0.06)", borderRadius: 20,
            padding: "40px 24px", textAlign: "center", position: "relative", overflow: "hidden",
            backdropFilter: "blur(10px)", transition: "all 0.35s",
          }}>
            {/* top color bar */}
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 60, height: 3, borderRadius: "0 0 3px 3px", background: s.barColor }} />
            <span style={{ fontSize: 32, display: "block", marginBottom: 16 }}>{s.icon}</span>
            <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, color: "rgba(28,26,22,0.15)", marginBottom: 12, letterSpacing: "0.1em" }}>{s.num}</p>
            <p style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 10 }}>{s.title}</p>
            <p style={{ fontFamily: T.sans, fontSize: 12, color: "rgba(28,26,22,0.45)", lineHeight: 1.65 }}>{s.desc}</p>
            <span style={{ display: "inline-block", marginTop: 12, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 999, background: s.mBg, color: s.mColor }}>{s.method}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================
// BEST SELLERS HORIZONTAL SCROLL
// ============================================
function BestSellersScroll({ allProducts, onView, onNav }) {
  const scrollRef = useRef(null);
  const scroll = (dir) => { if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 320, behavior: "smooth" }); };
  return (
    <section style={{ padding: "80px 0", borderTop: "1px solid rgba(28,26,22,0.06)", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: T.red, marginBottom: 10 }}>POPÜLER</p>
          <h2 style={{ fontFamily: T.serif, fontSize: "clamp(30px, 3.5vw, 48px)", fontWeight: 700, color: T.text, letterSpacing: "-0.02em" }}>Çok Satanlar</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* D-257: Tümünü Gör link */}
          {onNav && <button onClick={() => onNav("catalog")} style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", color: T.text, background: "none", border: "1px solid rgba(28,26,22,0.15)", padding: "8px 20px", borderRadius: T.r.full, cursor: "pointer", whiteSpace: "nowrap" }}>Tümünü Gör →</button>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => scroll(-1)} style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(28,26,22,0.1)", background: "rgba(238,232,222,0.5)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
            <button onClick={() => scroll(1)} style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(28,26,22,0.1)", background: "rgba(238,232,222,0.5)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
          </div>
        </div>
      </div>
      <div ref={scrollRef} style={{ display: "flex", gap: 16, overflowX: "auto", scrollSnapType: "x mandatory", paddingLeft: 40, paddingRight: 40, scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {allProducts.slice(0, 10).map(p => (
          <div key={p.id || p.slug} style={{ flex: "0 0 280px", scrollSnapAlign: "start" }}>
            <Card p={p} onView={onView} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================
// BIZ KIMIZ (About)
// ============================================
function AboutSection({ settings }) {
  const tb = settings?.trustBadges || DEFAULT_SETTINGS.trustBadges;
  return (
    <section style={{ padding: "100px 40px", maxWidth: 1440, margin: "0 auto", borderTop: "1px solid rgba(28,26,22,0.06)", position: "relative", zIndex: 1 }}>
      <div className="about-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
        {/* Left — text */}
        <div>
          <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: T.red, marginBottom: 10 }}>BİZ KİMİZ</p>
          <h2 style={{ fontFamily: T.serif, fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 700, color: T.text, lineHeight: 1.3, letterSpacing: "-0.02em", marginBottom: 24 }}>Biz Kimiz?</h2>

          <div style={{ fontFamily: T.sans, fontSize: 15, color: T.textLight, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 20 }}>UygunAyakkabi.com, kaliteli ayakkabıya daha ulaşılabilir şekilde erişmek isteyen insanlar için kurulmuş yeni nesil bir platformdur.</p>

            <p style={{ marginBottom: 20 }}>Bizim çıkış noktamız çok net: Türkiye'de ayakkabı ve deri sektörünün en güçlü merkezlerinden biri olan Aymakoop Sanayi Sitesi içindeki doğrudan erişimimizi, insanların gerçekten avantajlı ürünlere ulaşabileceği bir sisteme dönüştürmek.</p>

            <p style={{ marginBottom: 20 }}>Bu sayede; tekleme, az adetli, seri devamı olmayan ama kalite açısından güçlü ürünlere doğrudan ulaşabiliyoruz. Bu ürünler çoğu zaman piyasada daha yüksek fiyatlarla yer bulurken, biz onları daha ulaşılabilir seviyelerde sunabiliyoruz.</p>

            <p style={{ fontWeight: 600, color: T.text, marginBottom: 20 }}>Ancak bizi farklı yapan yalnızca ürün erişimi değil.</p>

            <p style={{ marginBottom: 20 }}>Bu fiziksel avantajı, yapay zekâ destekli otomasyon sistemleri, dijital içerik yapısı ve modern satış kanallarıyla birleştiriyoruz.</p>

            <p style={{ marginBottom: 20 }}>Web sitemiz, sosyal medya hesaplarımız ve dijital operasyonlarımız; doğrudan erişim + akıllı sistem + doğru fiyat anlayışıyla şekilleniyor.</p>

            <p style={{ fontWeight: 600, color: T.text, marginBottom: 8 }}>Bizim amacımız yalnızca ayakkabı satmak değil;</p>
            <p style={{ fontWeight: 600, color: T.red }}>kaliteli ürünü daha akıllı bir modelle insanlara ulaştırmak.</p>
          </div>
        </div>
        {/* Right — image + stats overlay */}
        <div style={{ position: "sticky", top: 120 }}>
          <div style={{ borderRadius: 24, overflow: "hidden", aspectRatio: "4/3", background: "#ebe5da", border: "1px solid rgba(28,26,22,0.06)", position: "relative" }}>
            <img src="https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=600&fit=crop&q=80" alt="UygunAyakkabı" fetchpriority="high" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 32, background: "linear-gradient(transparent, rgba(0,0,0,0.55))" }}>
              <div style={{ display: "flex", gap: 40 }}>
                {[
                  { val: tb.monthlyCustomers, label: "Mutlu Müşteri" },
                  { val: tb.totalProducts, label: "Ürün" },
                  { val: tb.satisfactionRate, label: "Memnuniyet" },
                ].map((s, i) => (
                  <div key={i}>
                    <p style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{s.val}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Brand microcopy badge */}
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: T.textLight, letterSpacing: "0.06em" }}>Kaynağından seçilmiş, akıllıca sunulmuş</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// NEDEN BİZDEN ALMALISINIZ? (Trust / Value Proposition)
// ============================================
function TrustValueSection({ onNav, settings }) {
  return (
    <section style={{ padding: "100px 40px", maxWidth: 1440, margin: "0 auto", borderTop: "1px solid rgba(28,26,22,0.06)", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: T.red, marginBottom: 10 }}>GÜVEN</p>
        <h2 style={{ fontFamily: T.serif, fontSize: "clamp(30px, 3.5vw, 48px)", fontWeight: 700, color: T.text, letterSpacing: "-0.02em", marginBottom: 28 }}>Neden Bizden Almalısınız?</h2>

        {/* D-258: Confident opener + inquiry reassurance added */}
        <div style={{ fontFamily: T.sans, fontSize: 15, color: T.textLight, lineHeight: 1.9, textAlign: "left" }}>
          <p style={{ marginBottom: 20 }}>Biz, Türkiye'nin ayakkabı üretim merkezlerinden biri olan Aymakoop'taki doğrudan erişim avantajını, modern bir dijital satış sistemiyle birleştiren bir platformuz.</p>

          <p style={{ marginBottom: 16 }}>Müşterilerimize sunabildiğimiz değerler:</p>

          <div style={{ paddingLeft: 20, marginBottom: 24 }}>
            {[
              "Kaynağından seçilmiş, kalite odaklı ürünler",
              "Piyasadaki değerinden genellikle daha uygun fiyatlar",
              "Sınırlı stoklu ve özel kalan ürünlere erişim",
              "Talep bırakın — ekibimiz sizi kısa sürede arasın",
              "Sipariş sürecinde baştan sona destek",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.red, flexShrink: 0 }} />
                <span style={{ fontFamily: T.sans, fontSize: 14, color: T.textLight }}>{item}</span>
              </div>
            ))}
          </div>

          <p style={{ fontWeight: 600, color: T.text, marginBottom: 8 }}>Ürünü beğendiniz mi?</p>
          <p style={{ fontWeight: 700, color: T.red, fontSize: 16 }}>Talep bırakın, biz sizi arayalım — adım adım yardımcı olalım.</p>
        </div>

        {/* D-258: Dual CTA — browse OR contact directly */}
        <div style={{ marginTop: 48, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => onNav("catalog")} style={{
            fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#fff", background: T.text,
            border: "none", padding: "17px 44px", borderRadius: T.r.full, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 10, transition: "all 0.3s",
          }}>
            ÜRÜNLERİ İNCELE {I.arrow}
          </button>
          <p style={{ width: "100%", fontFamily: T.sans, fontSize: 12, color: T.textLighter, textAlign: "center", margin: 0 }}>
            Sorunuz mu var? <a href={waLink(settings?.contact?.whatsappFull || "905331524843")} target="_blank" rel="noreferrer" style={{ color: T.text, fontWeight: 600, textDecoration: "underline" }}>WhatsApp'tan yazın →</a>
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================
// CATEGORY OVERLAY
// ============================================
const CAT_CHIPS = [
  { icon: "⚡", name: "Spor" },
  { icon: "👟", name: "Günlük" },
  { icon: "✦", name: "Klasik" },
  { icon: "🥾", name: "Bot" },
  { icon: "☀", name: "Sandalet" },
  { icon: "🩴", name: "Terlik" },
];

function CategoryOverlay({ onNav }) {
  return (
    <div style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "0 40px" }}>
      <div style={{
        background: "rgba(238,232,222,0.75)", backdropFilter: "blur(24px) saturate(1.4)",
        border: "1px solid rgba(28,26,22,0.08)", borderRadius: 20,
        padding: "24px 32px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center",
        boxShadow: "0 16px 48px rgba(0,0,0,0.04)",
      }}>
        <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, color: "rgba(28,26,22,0.3)", letterSpacing: "0.14em", textTransform: "uppercase", marginRight: 4 }}>Türler:</span>
        {CAT_CHIPS.map((c, i) => (
          <button key={i} onClick={() => onNav("catalog", c.name)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 20px", borderRadius: 999,
            background: "rgba(28,26,22,0.04)", border: "1px solid rgba(28,26,22,0.06)",
            cursor: "pointer", transition: "all 0.3s", fontFamily: T.sans,
          }}>
            <span style={{ fontSize: 15 }}>{c.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// İNDİRİMLİ ÜRÜNLER (Discounted Horizontal Scroll)
// ============================================
function DiscountedSection({ allProducts, onView, onNav }) {
  const scrollRef = useRef(null);
  const scroll = (dir) => { if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 320, behavior: "smooth" }); };
  const discounted = allProducts.filter(p => p.originalPrice && p.originalPrice > p.price);
  if (discounted.length === 0) return null;
  return (
    <section style={{ padding: "40px 0 100px", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, marginTop: 20 }}>
        <div>
          <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: T.red, marginBottom: 10 }}>FIRSATLAR</p>
          <h2 style={{ fontFamily: T.serif, fontSize: "clamp(30px, 3.5vw, 48px)", fontWeight: 700, color: T.text, letterSpacing: "-0.02em" }}>İndirimli Ürünler</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* D-257: Tümünü Gör link */}
          {onNav && <button onClick={() => onNav("catalog")} style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", color: T.text, background: "none", border: "1px solid rgba(28,26,22,0.15)", padding: "8px 20px", borderRadius: T.r.full, cursor: "pointer", whiteSpace: "nowrap" }}>Tümünü Gör →</button>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => scroll(-1)} style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(28,26,22,0.1)", background: "rgba(238,232,222,0.5)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
            <button onClick={() => scroll(1)} style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(28,26,22,0.1)", background: "rgba(238,232,222,0.5)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
          </div>
        </div>
      </div>
      <div ref={scrollRef} style={{ display: "flex", gap: 16, overflowX: "auto", scrollSnapType: "x mandatory", paddingLeft: 40, paddingRight: 40, scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {discounted.map(p => (
          <div key={p.id || p.slug} style={{ flex: "0 0 280px", scrollSnapAlign: "start" }}>
            <Card p={p} onView={onView} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================
// TOP-LEVEL APP COMPONENT
// ============================================
export default function App({ dbProducts = [], siteSettings = null, banners = [], sections = null }) {
  const S = siteSettings || DEFAULT_SETTINGS;
  const [pg, sPg] = useState("home");
  const [sel, sSel] = useState(null);
  const [initCat, sInitCat] = useState("Tümü");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const allProducts = (() => {
    const dbMapped = (dbProducts || []).map(p => {
      // D-174b: Only use AI-generated images, never original intake photos
      const aiImgs = Array.isArray(p.aiImages) && p.aiImages.length > 0 ? p.aiImages : [];
      const firstImg = aiImgs[0] || null;
      return {
        ...p,
        image: firstImg || shoe("#ebe5da","#d4c4b0","#c8102e","#fff","#fff",0),
        dbImage: firstImg,
        aiImages: aiImgs,
      };
    });
    return dbMapped;
  })();

  // D-194: URL sync — pushState so browser URL reflects current page
  const nav = (p, cat) => {
    if (cat) sInitCat(cat);
    else if (p === "catalog") sInitCat("Tümü");
    sPg(p);
    if (p !== "detail") sSel(null);
    // Update browser URL
    const url = p === "home" ? "/" : p === "catalog" ? "/ayakkabilar" : null;
    if (url) window.history.pushState({ pg: p }, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const view = p => {
    // D-198: Navigate to enhanced SSR product page instead of SPA detail
    const slug = p.slug || p.id;
    window.location.href = `/products/${slug}`;
  };

  // D-194: Handle browser back/forward buttons
  useEffect(() => {
    const onPop = (e) => {
      const state = e.state;
      if (!state) { sPg("home"); sSel(null); return; }
      if (state.pg === "detail" && state.slug) {
        const found = allProducts.find(p => (p.slug || p.id) === state.slug);
        if (found) { sSel(found); sPg("detail"); return; }
      }
      sPg(state.pg || "home");
      if (state.pg !== "detail") sSel(null);
    };
    window.addEventListener("popstate", onPop);
    // On mount, check if URL already indicates a sub-page
    const path = window.location.pathname;
    if (path === "/ayakkabilar") { sPg("catalog"); }
    else if (path.startsWith("/urun/")) {
      const slug = path.replace("/urun/", "");
      const found = allProducts.find(p => (p.slug || String(p.id)) === slug);
      if (found) { sSel(found); sPg("detail"); }
      else { sPg("catalog"); }
    }
    return () => window.removeEventListener("popstate", onPop);
  }, [allProducts]);

  // D-194: Cart — add product with selected size
  const addToCart = (product, selectedSize) => {
    const existing = cart.find(c => c.id === product.id && c.size === selectedSize);
    if (existing) {
      setCart(cart.map(c => c.id === product.id && c.size === selectedSize ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...product, size: selectedSize, qty: 1 }]);
    }
    setToastMsg("Ürün sepete eklendi!");
    setTimeout(() => setToastMsg(""), 2000);
  };

  const removeFromCart = (idx) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * (c.qty || 1), 0);
  const cartCount = cart.reduce((sum, c) => sum + (c.qty || 1), 0);

  return (
    <div style={{ minHeight: "100vh", background: T.bg }}>
      <GlobalStyles />
      <TopBar settings={S} />
      <Navbar onNav={nav} pg={pg} settings={S} cartCount={cartCount} onCartToggle={() => setCartOpen(!cartOpen)} />

      {/* D-194: Cart Drawer */}
      {cartOpen && (
        <>
          <div onClick={() => setCartOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200 }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(420px, 90vw)", zIndex: 201,
            background: T.bg, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid rgba(28,26,22,0.08)" }}>
              <h3 style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 700, color: T.text, margin: 0 }}>Sepet ({cartCount})</h3>
              <button onClick={() => setCartOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.text, fontSize: 18 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: T.textLight }}>
                  <p style={{ fontSize: 48, marginBottom: 16 }}>🛒</p>
                  <p style={{ fontFamily: T.sans, fontSize: 14 }}>Sepetiniz boş</p>
                </div>
              ) : (
                cart.map((c, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: "1px solid rgba(28,26,22,0.06)" }}>
                    <div style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", background: "#ebe5da", flexShrink: 0 }}>
                      <img src={c.dbImage || c.image} alt={c.name || c.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.text, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.name || c.title}
                      </p>
                      {c.size && <p style={{ fontFamily: T.sans, fontSize: 11, color: T.textLight, margin: "0 0 4px" }}>Beden: {c.size} · Adet: {c.qty || 1}</p>}
                      <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>₺{(c.price * (c.qty || 1)).toLocaleString('tr-TR')}</p>
                    </div>
                    <button onClick={() => removeFromCart(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textLight, fontSize: 16, alignSelf: "center" }}>✕</button>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div style={{ padding: "20px 24px", borderTop: "1px solid rgba(28,26,22,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.text }}>Toplam</span>
                  <span style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 800, color: T.text }}>₺{cartTotal.toLocaleString('tr-TR')}</span>
                </div>
                <p style={{ fontFamily: T.sans, fontSize: 11, color: T.textLighter, textAlign: "center", margin: "0 0 14px", lineHeight: 1.6 }}>
                  Talebiniz WhatsApp’tan ekibimize iletilir — ekibimiz sizi arar ve siparişi birlikte tamamlar.
                </p>
                <a href={`https://wa.me/${S.contact?.whatsappFull || '905331524843'}?text=${encodeURIComponent(
                  `Merhaba! Sipariş vermek istiyorum:\n\n${cart.map(c => `• ${c.name || c.title}${c.size ? ` (${c.size})` : ''} x${c.qty || 1} — ₺${(c.price * (c.qty || 1)).toLocaleString('tr-TR')}`).join('\n')}\n\nToplam: ₺${cartTotal.toLocaleString('tr-TR')}`
                )}`} target="_blank" rel="noreferrer" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%",
                  padding: "16px", background: T.green, color: "#fff", border: "none", borderRadius: T.r.full,
                  fontFamily: T.sans, fontSize: 13, fontWeight: 700, textDecoration: "none", cursor: "pointer",
                }}>
                  {I.wa} WHATSAPP İLE TALEBİNİZİ İLETİN
                </a>
              </div>
            )}
          </div>
        </>
      )}

      {pg === "home" && (
        <div>
          <Hero onNav={nav} settings={S} allProducts={allProducts} />

          {/* Neden Uygun Ayakkabı — 6 advantage cards */}
          <WhyUsSection />

          {/* Popüler Ürünler Grid */}
          <section style={{ padding: "100px 40px", maxWidth: 1440, margin: "0 auto", borderTop: "1px solid rgba(28,26,22,0.06)", position: "relative", zIndex: 1 }}>
            <div style={{ marginBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
              <div>
                <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: T.red, marginBottom: 10 }}>POPÜLER</p>
                <h2 style={{ fontFamily: T.serif, fontSize: "clamp(30px, 3.5vw, 48px)", fontWeight: 700, color: T.text, letterSpacing: "-0.02em" }}>Popüler Ayakkabılar</h2>
              </div>
              {/* D-257: escape to catalog */}
              <button onClick={() => nav("catalog")} style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", color: T.text, background: "none", border: "1px solid rgba(28,26,22,0.15)", padding: "8px 20px", borderRadius: T.r.full, cursor: "pointer", whiteSpace: "nowrap" }}>Tümünü Gör →</button>
            </div>
            <div className="prod-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
              {allProducts.slice(0, 6).map(p => <Card key={p.id || p.slug} p={p} onView={view} />)}
            </div>
          </section>

          {/* Sipariş Adımları */}
          <StepsSection />

          {/* Çok Satanlar — horizontal scroll */}
          <BestSellersScroll allProducts={allProducts} onView={view} onNav={nav} />

          {/* Biz Kimiz */}
          <AboutSection settings={S} />

          {/* Neden Bizden Almalısınız — Trust/Value */}
          <TrustValueSection onNav={nav} settings={S} />

          {/* Kategori Overlay + İndirimli Ürünler */}
          <CategoryOverlay onNav={nav} />
          <DiscountedSection allProducts={allProducts} onView={view} onNav={nav} />

          <Footer onNav={nav} settings={S} />
        </div>
      )}

      {pg === "catalog" && (
        <Catalog initCat={initCat} onView={view} allProducts={allProducts} onNav={nav} settings={S} />
      )}

      {pg === "detail" && sel && (
        <Detail product={sel} onBack={() => nav("catalog")} settings={S} onNav={nav} onAddToCart={addToCart} />
      )}

      {toastMsg && (
        <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", background: T.text, color: "#fff", padding: "14px 28px", borderRadius: T.r.full, fontSize: 13, fontWeight: 600, zIndex: 400, boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}

// ============================================
// CATALOG PAGE
// ============================================
const ALL_CATEGORIES = ["Tümü", "Spor", "Günlük", "Klasik", "Bot", "Sandalet", "Terlik", "Cüzdan"];

function Catalog({ onView, allProducts, initCat, onNav, settings }) {
  const [fl, sFl] = useState(initCat);
  const [szFilter, setSzFilter] = useState(null);
  const [sort, setSort] = useState("default");
  const [vis, sVis] = useState(12);
  const [drawerOpen, setDrawerOpen] = useState(false); // D-260: mobile filter drawer
  const [query, setQuery] = useState("");              // D-266: search query

  // D-260: lock body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  // D-259: dynamic heading
  const catHeading = fl === "Tümü" ? "Tüm Ürünler"
    : fl === "Cüzdan" ? "Cüzdanlar"
    : fl === "Bot" ? "Bot & Kışlık"
    : fl === "Terlik" ? "Terlikler"
    : fl === "Sandalet" ? "Sandaletler"
    : `${fl} Ayakkabıları`;

  // D-266: search filter — applied first, then category/size/sort layer on top
  const q = query.trim().toLowerCase();
  const searchFiltered = q
    ? allProducts.filter(p => {
        const name = (p.name || p.title || "").toLowerCase();
        const sn   = (p.stockNumber || "").toLowerCase();
        return name.includes(q) || sn.includes(q);
      })
    : allProducts;

  const catFiltered = fl === "Tümü" ? searchFiltered : searchFiltered.filter(p => p.category === fl);
  const allSizes = [...new Set(catFiltered.flatMap(p => p.sizes || []))].sort((a, b) => Number(a) - Number(b));

  const flt = catFiltered.filter(p =>
    !szFilter || (p.sizes && p.sizes.includes(szFilter))
  );

  const sorted = sort === "price-asc"  ? [...flt].sort((a, b) => (a.price || 0) - (b.price || 0))
               : sort === "price-desc" ? [...flt].sort((a, b) => (b.price || 0) - (a.price || 0))
               : sort === "discount"   ? [...flt].sort((a, b) => {
                   const dA = a.originalPrice && a.originalPrice > a.price ? a.originalPrice - a.price : 0;
                   const dB = b.originalPrice && b.originalPrice > b.price ? b.originalPrice - b.price : 0;
                   return dB - dA;
                 })
               : flt;

  const shown = sorted.slice(0, vis);
  const hasMore = vis < sorted.length;
  const hasActiveFilter = fl !== "Tümü" || szFilter || !!q;
  const activeCount = (fl !== "Tümü" ? 1 : 0) + (szFilter ? 1 : 0) + (sort !== "default" ? 1 : 0); // D-260 drawer badge

  const resetFilters = () => { sFl("Tümü"); setSzFilter(null); setSort("default"); sVis(12); setQuery(""); }; // D-266: clears search too
  const resetAndClose = () => { resetFilters(); setDrawerOpen(false); };

  // D-260: sort options shared between desktop select and mobile drawer
  const SORT_OPTIONS = [
    { v: "default",    l: "Varsayılan" },
    { v: "price-asc",  l: "Fiyat: Düşük → Yüksek" },
    { v: "price-desc", l: "Fiyat: Yüksek → Düşük" },
    { v: "discount",   l: "İndirimli Önce" },
  ];

  return (
    <div style={{ paddingTop: 80, background: T.bg, minHeight: "100vh", position: "relative", zIndex: 1 }}>
      <section className="catalog-section" style={{ maxWidth: 1440, margin: "0 auto", padding: "60px 40px 100px" }}>

        {/* Heading + count — always visible */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontFamily: T.serif, fontSize: "clamp(36px, 4vw, 56px)", fontWeight: 700, color: T.text, marginBottom: 10 }}>{catHeading}</h1>
          <p style={{ fontFamily: T.sans, fontSize: 14, color: T.textLight }}>
            <span style={{ fontWeight: 600, color: T.text }}>{flt.length}</span> ürün
            {szFilter && <span style={{ color: T.textLighter }}> · Beden {szFilter}</span>}
            {q && <span style={{ color: T.textLighter }}> · &ldquo;{q}&rdquo;</span>}
          </p>
        </div>

        {/* ── D-266: Search bar — always visible (desktop + mobile) ── */}
        <div style={{ maxWidth: 480, margin: "0 auto 24px", position: "relative" }}>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="rgba(28,26,22,0.35)" strokeWidth="2.2"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          >
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); sVis(12); }}
            placeholder="Ürün ara… (örn. Nike, Bot, 43)"
            style={{
              width: "100%", boxSizing: "border-box",
              fontFamily: T.sans, fontSize: 14, color: T.text,
              background: "rgba(238,232,222,0.7)", border: "1px solid rgba(28,26,22,0.12)",
              borderRadius: T.r.full, padding: "11px 40px 11px 40px",
              outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocus={e => { e.target.style.borderColor = "rgba(28,26,22,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(28,26,22,0.06)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(28,26,22,0.12)"; e.target.style.boxShadow = "none"; }}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); sVis(12); }}
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "rgba(28,26,22,0.1)", border: "none", borderRadius: "50%",
                width: 22, height: 22, cursor: "pointer", fontSize: 11, color: T.text,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              aria-label="Aramayı temizle"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── DESKTOP CONTROLS (hidden on mobile via CSS) ── */}
        <div className="catalog-desktop-controls">
          {/* Category chips */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
            {ALL_CATEGORIES.map(c => (
              <button key={c} onClick={() => { sFl(c); setSzFilter(null); setSort("default"); sVis(12); }} style={{
                fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
                padding: "10px 24px", borderRadius: T.r.full, cursor: "pointer", textTransform: "uppercase",
                border: fl === c ? "1px solid #1c1a16" : "1px solid rgba(28,26,22,0.1)",
                background: fl === c ? T.text : "rgba(238,232,222,0.6)",
                color: fl === c ? "#fff" : T.textLight, transition: "all 0.3s", backdropFilter: "blur(8px)",
              }}>
                {c}
              </button>
            ))}
          </div>
          {/* Size chips */}
          {allSizes.length > 0 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
              <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textLighter, marginRight: 4 }}>Beden:</span>
              {allSizes.map(s => (
                <button key={s} onClick={() => { setSzFilter(szFilter === s ? null : s); sVis(12); }} style={{
                  fontFamily: T.sans, fontSize: 12, fontWeight: 600,
                  width: 40, height: 40, borderRadius: "50%", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: szFilter === s ? "2px solid #1c1a16" : "1px solid rgba(28,26,22,0.12)",
                  background: szFilter === s ? T.text : "rgba(238,232,222,0.6)",
                  color: szFilter === s ? "#fff" : T.textLight, transition: "all 0.3s",
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}
          {/* Sort + clear row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 32, marginTop: 8 }}>
            <div style={{ minWidth: 140 }}>
              {hasActiveFilter && (
                <button onClick={resetFilters} style={{
                  fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
                  padding: "8px 18px", borderRadius: T.r.full, cursor: "pointer",
                  border: "1px solid rgba(200,16,46,0.3)", background: "rgba(200,16,46,0.06)",
                  color: T.red, transition: "all 0.3s",
                }}>
                  ✕ Filtreleri Temizle
                </button>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textLighter, whiteSpace: "nowrap" }}>Sırala:</span>
              <select value={sort} onChange={e => { setSort(e.target.value); sVis(12); }} style={{
                fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: T.text,
                background: "rgba(238,232,222,0.8)", border: "1px solid rgba(28,26,22,0.12)",
                borderRadius: T.r.full, padding: "8px 36px 8px 16px", cursor: "pointer",
                appearance: "none", WebkitAppearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%231c1a16' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", outline: "none",
              }}>
                {SORT_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── D-260: MOBILE COMPACT BAR (shown only on mobile via CSS) ── */}
        <div className="catalog-mobile-bar" style={{
          position: "sticky", top: 68, zIndex: 50,
          background: "rgba(244,239,230,0.96)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(28,26,22,0.08)", borderRadius: T.r.md,
          padding: "10px 14px", marginBottom: 20,
          alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          {/* Left: count + active pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: "nowrap" }}>
              {flt.length} ürün
            </span>
            {fl !== "Tümü" && (
              <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: T.text, color: "#fff", whiteSpace: "nowrap" }}>
                {fl}
              </span>
            )}
            {szFilter && (
              <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: T.text, color: "#fff", whiteSpace: "nowrap" }}>
                {szFilter} no
              </span>
            )}
            {sort !== "default" && (
              <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "rgba(28,26,22,0.08)", color: T.text, whiteSpace: "nowrap" }}>
                ↕ {sort === "price-asc" ? "Fiyat ↑" : sort === "price-desc" ? "Fiyat ↓" : "İndirim"}
              </span>
            )}
            {/* D-266: search active pill — tap to clear */}
            {q && (
              <button
                onClick={() => { setQuery(""); sVis(12); }}
                style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "rgba(200,16,46,0.08)", color: T.red, border: "1px solid rgba(200,16,46,0.18)", whiteSpace: "nowrap", cursor: "pointer" }}
              >
                🔍 &ldquo;{q}&rdquo; ✕
              </button>
            )}
          </div>
          {/* Right: filter trigger button */}
          <button onClick={() => setDrawerOpen(true)} style={{
            fontFamily: T.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
            padding: "10px 16px", borderRadius: T.r.full, cursor: "pointer", flexShrink: 0,
            border: activeCount > 0 ? "1.5px solid #1c1a16" : "1px solid rgba(28,26,22,0.15)",
            background: activeCount > 0 ? T.text : "rgba(238,232,222,0.9)",
            color: activeCount > 0 ? "#fff" : T.text,
            display: "flex", alignItems: "center", gap: 7, transition: "all 0.2s",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            Filtrele
            {activeCount > 0 && (
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: T.red, color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 2 }}>
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* Grid — D-266: empty state aware of search vs filter */}
        {flt.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🔍</div>
            <p style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 8 }}>
              {q
                ? `"${q}" için ürün bulunamadı`
                : !hasActiveFilter
                  ? "Henüz ürün eklenmedi"
                  : "Bu filtrelere uygun ürün bulunamadı"
              }
            </p>
            <p style={{ fontFamily: T.sans, fontSize: 14, color: T.textLighter, marginBottom: 24, lineHeight: 1.6 }}>
              {q
                ? "Farklı bir kelime deneyin veya aramayı temizleyerek kategorilere göz atın."
                : hasActiveFilter
                  ? "Filtreleri temizleyerek tüm ürünlere göz atabilirsin."
                  : "Yakında yeni ürünler eklenecek."
              }
            </p>
            {hasActiveFilter && (
              <button onClick={resetFilters} style={{
                fontFamily: T.sans, fontSize: 13, fontWeight: 600,
                padding: "12px 32px", borderRadius: T.r.full, cursor: "pointer",
                border: "none", background: T.text, color: "#fff", transition: "all 0.3s",
              }}>
                {q ? "Aramayı Temizle" : "Tüm Ürünleri Göster"}
              </button>
            )}
          </div>
        ) : (
          <div className="prod-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
            {shown.map(p => <Card key={p.id || p.slug} p={p} onView={onView} />)}
          </div>
        )}
        {hasMore && (
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <button onClick={() => sVis(v => v + 12)} style={{
              fontFamily: T.sans, fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
              color: T.text, background: "transparent", border: "1px solid rgba(28,26,22,0.1)",
              padding: "14px 48px", borderRadius: T.r.full, cursor: "pointer",
            }}>
              DAHA FAZLA ({Math.max(0, sorted.length - vis)})
            </button>
          </div>
        )}

        {/* ── D-262: Catalog contact nudge ── */}
        <div style={{ textAlign: "center", marginTop: 40, paddingTop: 32, borderTop: "1px solid rgba(28,26,22,0.06)" }}>
          <p style={{ fontFamily: T.sans, fontSize: 13, color: T.textLighter, margin: "0 0 10px" }}>
            Aradığınız modeli veya bedeni bulamıyor musunuz?
          </p>
          <a href={waLink()} target="_blank" rel="noreferrer" style={{
            fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.text,
            textDecoration: "underline", letterSpacing: "0.04em",
          }}>
            WhatsApp&apos;tan yardım alın →
          </a>
        </div>
      </section>

      {/* ── D-260: MOBILE FILTER DRAWER ── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div onClick={() => setDrawerOpen(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200,
            animation: "fadeIn 0.2s ease",
          }} />
          {/* Sheet */}
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201,
            background: T.bg, borderRadius: "20px 20px 0 0",
            maxHeight: "82vh", overflowY: "auto",
            boxShadow: "0 -8px 48px rgba(0,0,0,0.14)",
            animation: "slideUp 0.32s cubic-bezier(.22,1,.36,1)",
          }}>
            {/* Handle */}
            <div style={{ textAlign: "center", paddingTop: 14, paddingBottom: 4 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(28,26,22,0.15)", margin: "0 auto" }} />
            </div>
            <div style={{ padding: "0 20px 32px" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, paddingBottom: 18, borderBottom: "1px solid rgba(28,26,22,0.07)" }}>
                <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.text }}>Filtrele & Sırala</span>
                <button onClick={() => setDrawerOpen(false)} style={{ background: "rgba(28,26,22,0.06)", border: "none", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 14, color: T.text, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>

              {/* Category section */}
              <div style={{ paddingTop: 22, paddingBottom: 20, borderBottom: "1px solid rgba(28,26,22,0.07)" }}>
                <p style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: T.textLighter, marginBottom: 14 }}>KATEGORİ</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ALL_CATEGORIES.map(c => (
                    <button key={c} onClick={() => { sFl(c); setSzFilter(null); sVis(12); }} style={{
                      fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em",
                      padding: "10px 18px", borderRadius: T.r.full, cursor: "pointer", textTransform: "uppercase",
                      border: fl === c ? "1.5px solid #1c1a16" : "1px solid rgba(28,26,22,0.1)",
                      background: fl === c ? T.text : "rgba(238,232,222,0.7)",
                      color: fl === c ? "#fff" : T.textLight, transition: "all 0.2s",
                    }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size section */}
              {allSizes.length > 0 && (
                <div style={{ paddingTop: 22, paddingBottom: 20, borderBottom: "1px solid rgba(28,26,22,0.07)" }}>
                  <p style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: T.textLighter, marginBottom: 14 }}>BEDEN</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {allSizes.map(s => (
                      <button key={s} onClick={() => { setSzFilter(szFilter === s ? null : s); sVis(12); }} style={{
                        fontFamily: T.sans, fontSize: 13, fontWeight: 600,
                        width: 48, height: 48, borderRadius: "50%", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: szFilter === s ? "2px solid #1c1a16" : "1px solid rgba(28,26,22,0.12)",
                        background: szFilter === s ? T.text : "rgba(238,232,222,0.7)",
                        color: szFilter === s ? "#fff" : T.textLight, transition: "all 0.2s",
                      }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sort section */}
              <div style={{ paddingTop: 22, paddingBottom: 20 }}>
                <p style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: T.textLighter, marginBottom: 14 }}>SIRALA</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {SORT_OPTIONS.map(({ v, l }) => (
                    <button key={v} onClick={() => { setSort(v); sVis(12); }} style={{
                      fontFamily: T.sans, fontSize: 14, fontWeight: sort === v ? 700 : 500,
                      padding: "14px 18px", borderRadius: T.r.md, cursor: "pointer", textAlign: "left",
                      border: sort === v ? "1.5px solid #1c1a16" : "1px solid rgba(28,26,22,0.1)",
                      background: sort === v ? T.text : "rgba(238,232,222,0.4)",
                      color: sort === v ? "#fff" : T.text, transition: "all 0.2s",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      {l}
                      {sort === v && <span style={{ fontSize: 15 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA row */}
              <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
                {(hasActiveFilter || sort !== "default") && (
                  <button onClick={resetAndClose} style={{
                    fontFamily: T.sans, fontSize: 13, fontWeight: 600, flexShrink: 0,
                    padding: "14px 18px", borderRadius: T.r.full, cursor: "pointer",
                    border: "1px solid rgba(200,16,46,0.3)", background: "rgba(200,16,46,0.06)",
                    color: T.red,
                  }}>
                    Temizle
                  </button>
                )}
                <button onClick={() => setDrawerOpen(false)} style={{
                  fontFamily: T.sans, fontSize: 14, fontWeight: 700, flex: 1,
                  padding: "14px 20px", borderRadius: T.r.full, cursor: "pointer",
                  border: "none", background: T.text, color: "#fff",
                }}>
                  {flt.length} Ürünü Gör →
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <Footer onNav={onNav || (() => {})} settings={settings} />
    </div>
  );
}

// ============================================
// DETAIL PAGE
// ============================================
function Detail({ product: p, onBack, settings, onNav, onAddToCart }) {
  const ct = settings?.contact || DEFAULT_SETTINGS.contact;
  const [sz, sSz] = useState(null);
  const [im, sIm] = useState(0);
  // D-194b: soldout only when explicitly marked or stock is confirmed zero
  const isSoldOut = p.badge === "Tükendi" || p.status === "soldout" || (p.stock != null && p.stock === 0);
  const sl = isSoldOut
    ? { t: "Stokta Yok", c: T.red, bg: T.redSoft }
    : p.stock && p.stock <= 3
    ? { t: `Son ${p.stock} adet!`, c: "#d97706", bg: "rgba(217,119,6,0.1)" }
    : { t: "Stokta", c: "#22c55e", bg: "rgba(34,197,94,0.1)" };
  // D-174b: Only AI images, never original intake photos
  const allImages = (p.aiImages?.length ? p.aiImages : p.images?.length ? p.images : null) || [p.dbImage || p.image];

  return (
    <div style={{ paddingTop: 80, background: T.bg, minHeight: "100vh", position: "relative", zIndex: 1 }}>
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "40px 40px 100px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <span onClick={onBack} style={{ fontFamily: T.sans, fontSize: 11, color: T.textLighter, cursor: "pointer", letterSpacing: "0.06em" }}>← AYAKKABILAR</span>
          <span style={{ color: "rgba(28,26,22,0.15)" }}>/</span>
          <span style={{ fontFamily: T.sans, fontSize: 11, color: T.text, fontWeight: 500 }}>{p.name || p.title}</span>
        </div>

        {/* Main Grid */}
        <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "start" }}>
          {/* Gallery */}
          <div>
            <div style={{ borderRadius: T.r.lg, overflow: "hidden", aspectRatio: "1/1", background: T.bgCard, border: "1px solid rgba(28,26,22,0.06)", marginBottom: 14 }}>
              <img src={allImages[im]} alt={p.name} fetchPriority="high" loading="eager" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            {allImages.length > 1 && (
              <div style={{ display: "flex", gap: 10 }}>
                {allImages.map((x, i) => (
                  <div key={i} onClick={() => sIm(i)} style={{ width: 72, height: 72, borderRadius: T.r.sm, overflow: "hidden", border: `2px solid ${im === i ? T.text : "transparent"}`, cursor: "pointer", background: T.bgCard, opacity: im === i ? 1 : 0.5, transition: "all 0.2s" }}>
                    <img src={x} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ paddingTop: 20 }}>
            <p style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: T.red, marginBottom: 10 }}>{p.category}</p>
            <h1 style={{ fontFamily: T.serif, fontSize: "clamp(28px, 3vw, 38px)", fontWeight: 700, color: T.text, marginBottom: 16, letterSpacing: "-0.02em" }}>{p.name || p.title}</h1>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
              <span style={{ fontFamily: T.sans, fontSize: 30, fontWeight: 800, color: T.text }}>₺{(p.price || 0).toLocaleString("tr-TR")}</span>
              {p.originalPrice && <span style={{ fontFamily: T.sans, fontSize: 16, color: "rgba(28,26,22,0.4)", textDecoration: "line-through" }}>₺{p.originalPrice.toLocaleString("tr-TR")}</span>}
              {p.originalPrice && p.price < p.originalPrice && <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, color: T.red, background: T.redSoft, padding: "4px 14px", borderRadius: T.r.full }}>%{Math.round((1 - p.price / p.originalPrice) * 100)} indirim</span>}
            </div>
            {p.description && <p style={{ fontFamily: T.sans, fontSize: 15, color: T.textLight, lineHeight: 1.7, marginBottom: 24, maxWidth: 480 }}>{p.description}</p>}

            {/* Stock */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: T.r.full, background: sl.bg, marginBottom: 28 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: sl.c }} />
              <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: sl.c }}>{sl.t}</span>
            </div>

            {/* Sizes */}
            {p.sizes && p.sizes.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textLighter, marginBottom: 12 }}>BEDEN {sz && <span style={{ color: T.text }}>— {sz}</span>}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {p.sizes.map(s => (
                    <button key={s} onClick={() => sSz(s)} style={{
                      width: 50, height: 50, borderRadius: T.r.sm,
                      border: sz === s ? `1px solid ${T.text}` : "1px solid rgba(28,26,22,0.1)",
                      background: sz === s ? T.text : "transparent",
                      color: sz === s ? "#fff" : T.textLight,
                      fontFamily: T.sans, fontSize: 14, fontWeight: 600, cursor: "pointer",
                      transition: "all 0.2s",
                    }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => { if (!isSoldOut && onAddToCart) onAddToCart(p, sz); }} style={{
                width: "100%", padding: "17px",
                background: !isSoldOut ? T.text : "rgba(28,26,22,0.3)",
                color: "#fff", border: "none", borderRadius: T.r.full, fontFamily: T.sans, fontSize: 12, fontWeight: 700,
                cursor: !isSoldOut ? "pointer" : "not-allowed", letterSpacing: "0.1em", textTransform: "uppercase",
                transition: "all 0.3s",
              }}>
                {!isSoldOut ? "SEPETE EKLE" : "STOKTA YOK"}
              </button>
              <a href={`https://wa.me/${ct.whatsappFull}?text=Merhaba!%20${encodeURIComponent((p.name || p.title || "Ürün"))}%20hakkında%20${sz ? encodeURIComponent(`Beden: ${sz} — `) : ''}bilgi%20almak%20istiyorum.`}
                target="_blank" rel="noreferrer" style={{
                  width: "100%", padding: "17px", boxSizing: "border-box",
                  background: T.green, color: "#fff", border: "none",
                  borderRadius: T.r.full, fontFamily: T.sans, fontSize: 12, fontWeight: 700,
                  textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  transition: "all 0.3s", cursor: "pointer",
                }}>
                {I.wa} WhatsApp&apos;tan Bilgi Al
              </a>
            </div>

            {/* Trust Badges */}
            <div style={{ display: "flex", gap: 24, marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(28,26,22,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.textLighter }}>
                <span style={{ fontSize: 16 }}>✓</span> Ücretsiz Kargo
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.textLighter }}>
                <span style={{ fontSize: 16 }}>✓</span> Hızlı Teslimat
              </div>
            </div>
            <p style={{ fontFamily: T.sans, fontSize: 11, color: T.textLighter, marginTop: 14, lineHeight: 1.65 }}>
              Sepete ekleyip WhatsApp’tan sipariş talebinizi iletebilirsiniz — ekibimiz sizi arar ve süreci tamamlar.
            </p>
          </div>
        </div>
      </section>
      <Footer onNav={onNav || (() => {})} settings={settings} />
    </div>
  );
}

// ============================================
// FOOTER
// ============================================
function Footer({ onNav, settings }) {
  const ct = settings?.contact || DEFAULT_SETTINGS.contact;
  return (
    <footer style={{ background: T.text, color: "#f0ece4", border: "none", padding: "72px 40px 0", position: "relative", zIndex: 1 }}>
      <div className="footer-grid" style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 56, marginBottom: 52 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 16 }}>
            <span style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 800, color: "#f0ece4", letterSpacing: "0.12em" }}>UYGUN</span>
            <span style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 300, color: T.red }}>AYAKKABI</span>
          </div>
          <p style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(240,236,228,0.35)", lineHeight: 1.85, maxWidth: 300 }}>Kaliteli ayakkabıya daha akıllı erişim. Sanayiden dijitale uzanan güçlü satış modeli.</p>
        </div>
        <div>
          <h5 style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(240,236,228,0.28)", marginBottom: 22 }}>Sayfalar</h5>
          {[["Ana Sayfa", "home"], ["Ayakkabılar", "catalog"]].map(([l, k]) => (
            <p key={k} onClick={() => onNav(k)} style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(240,236,228,0.45)", marginBottom: 14, cursor: "pointer", transition: "color 0.2s" }}>
              {l}
            </p>
          ))}
        </div>
        <div>
          <h5 style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(240,236,228,0.28)", marginBottom: 22 }}>İletişim</h5>
          <p style={{ fontFamily: T.sans, fontSize: 13, color: "rgba(240,236,228,0.45)", lineHeight: 2.2 }}>
            {ct.whatsapp}<br/>
            {ct.email || 'info@uygunayakkabi.com'}<br/>
            İstanbul, Türkiye
          </p>
        </div>
        <div>
          <h5 style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(240,236,228,0.28)", marginBottom: 22 }}>Sipariş</h5>
          <a href={waLink(ct.whatsappFull)} target="_blank" rel="noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em",
            color: "#f0ece4", border: "1px solid rgba(240,236,228,0.2)", padding: "10px 20px",
            borderRadius: T.r.full, textDecoration: "none", transition: "all 0.3s", cursor: "pointer",
          }}>
            {I.wa} WHATSAPP
          </a>
        </div>
      </div>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "20px 0", borderTop: "1px solid rgba(240,236,228,0.08)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontFamily: T.sans, fontSize: 11, color: "rgba(240,236,228,0.22)" }}>© 2025 UygunAyakkabı — Tüm hakları saklıdır.</p>
        <p style={{ fontFamily: T.sans, fontSize: 11, color: "rgba(240,236,228,0.22)" }}>uygunayakkabi.com</p>
      </div>
    </footer>
  );
}