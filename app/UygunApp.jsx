"use client";
import { useState, useEffect } from "react";

// ============================================
// TOKENS
// ============================================
const T = {
  f: "'Outfit', sans-serif", d: "'Playfair Display', serif",
  bk: "#0a0a0a", wh: "#ffffff",
  g50: "#fafafa", g100: "#f5f5f5", g200: "#e8e8e8", g400: "#a3a3a3", g500: "#737373", g600: "#525252",
  ac: "#c8102e", gn: "#16a34a",
  r: { sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
};

// ============================================
// SVG SHOE GENERATOR
// ============================================
function shoe(bg, sole, body, acc, lace, rot = 0) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><defs><radialGradient id="g1" cx="30%" cy="30%"><stop offset="0%" stop-color="${acc}" stop-opacity="0.08"/><stop offset="100%" stop-color="${acc}" stop-opacity="0"/></radialGradient></defs><rect width="800" height="800" fill="${bg}"/><rect width="800" height="800" fill="url(#g1)"/><g transform="translate(400,400) rotate(${rot}) scale(1.15)"><path d="M-220,80Q-220,110-180,120L200,120Q240,120,250,95L260,60Q260,45,240,40L-180,40Q-220,45-220,80Z" fill="${sole}"/><path d="M-180,120Q-180,138-145,142L195,142Q235,142,245,125L250,95Q240,120,200,120L-180,120Z" fill="${sole}" opacity="0.4"/><path d="M-200,48Q-210,68-190,78L230,78Q250,73,255,53L250,33Q245,23,230,23L-175,23Q-200,28-200,48Z" fill="white" opacity="0.88"/><ellipse cx="185" cy="52" rx="38" ry="20" fill="${acc}" opacity="0.18"/><ellipse cx="-120" cy="52" rx="30" ry="16" fill="${acc}" opacity="0.1"/><path d="M-180,28Q-200,8-195,-42Q-185,-102-140,-132Q-80,-172,20,-177Q120,-180,180,-152Q230,-127,245,-72Q255,-27,245,13L240,23L-175,23Q-185,26-180,28Z" fill="${body}"/><path d="M60,-165Q140,-160,185,-135Q225,-112,240,-65Q250,-25,245,13L170,13Q178,-22,162,-58Q140,-100,85,-128Q30,-150-25,-148Z" fill="white" opacity="0.09"/><path d="M-150,-45Q-70,-92,50,-87Q145,-82,210,-38" fill="none" stroke="${acc}" stroke-width="14" stroke-linecap="round" opacity="0.75"/><path d="M-195,-42Q-190,-58-168,-68Q-128,-88-78,-82" fill="none" stroke="${body}" stroke-width="18" stroke-linecap="round" opacity="0.3"/><path d="M-118,-132Q-98,-172-58,-187Q-18,-197,22,-187Q42,-180,47,-167" fill="${body}" opacity="0.55"/><line x1="-78" y1="-132" x2="-18" y2="-147" stroke="${lace}" stroke-width="4.5" stroke-linecap="round"/><line x1="-58" y1="-112" x2="2" y2="-132" stroke="${lace}" stroke-width="4.5" stroke-linecap="round"/><line x1="-38" y1="-92" x2="22" y2="-117" stroke="${lace}" stroke-width="4.5" stroke-linecap="round"/><circle cx="-78" cy="-132" r="5" fill="${lace}" opacity="0.55"/><circle cx="-58" cy="-112" r="5" fill="${lace}" opacity="0.55"/><circle cx="-38" cy="-92" r="5" fill="${lace}" opacity="0.55"/><circle cx="-18" cy="-147" r="5" fill="${lace}" opacity="0.55"/><circle cx="2" cy="-132" r="5" fill="${lace}" opacity="0.55"/><circle cx="22" cy="-117" r="5" fill="${lace}" opacity="0.55"/></g><ellipse cx="400" cy="605" rx="240" ry="20" fill="black" opacity="0.055"/></svg>`)}`;
}

const heroImg = shoe("#f0f0f0", "#222", "#c8102e", "#fff", "#fff", -8);

// ============================================
// PRODUCTS
// ============================================
const products = [
  { id: 1, slug: "nike-air-max-270", name: "Nike Air Max 270", price: 2499, originalPrice: 3299,
    description: "Gün boyu konfor sunan Air Max 270, büyük Air ünitesiyle her adımda maksimum yastıklama sağlar.",
    image: shoe("#fafafa", "#1a1a1a", "#c8102e", "#fff", "#fff", -5),
    images: [shoe("#fafafa", "#1a1a1a", "#c8102e", "#fff", "#fff", -5), shoe("#f5f0eb", "#333", "#c8102e", "#ff6b6b", "#eee", 3), shoe("#eef2f7", "#222", "#a8071a", "#fff", "#ddd", -12)],
    sizes: [38,39,40,41,42,43,44], stock: 3, category: "Spor", badge: "İndirim" },
  { id: 2, slug: "adidas-ultraboost-23", name: "Adidas Ultraboost 23", price: 2899, originalPrice: null,
    description: "Efsanevi Boost teknolojisiyle enerji iade eden taban yapısı. Koşu ve günlük kullanım için ideal.",
    image: shoe("#f5f5f5", "#e0e0e0", "#1a1a1a", "#00b4d8", "#ccc", -3),
    images: [shoe("#f5f5f5", "#e0e0e0", "#1a1a1a", "#00b4d8", "#ccc", -3), shoe("#edf6f9", "#d5d5d5", "#222", "#0096c7", "#bbb", 5), shoe("#f0f0f0", "#ccc", "#111", "#48cae4", "#aaa", -10)],
    sizes: [39,40,41,42,43], stock: 8, category: "Spor", badge: "Yeni" },
  { id: 3, slug: "new-balance-574", name: "New Balance 574", price: 1899, originalPrice: 2499,
    description: "Zamansız tasarım ve ENCAP yastıklama sistemiyle hem şık hem rahat bir klasik.",
    image: shoe("#f7f3ef", "#8B7355", "#3d5a80", "#ee6c4d", "#fff", -6),
    images: [shoe("#f7f3ef", "#8B7355", "#3d5a80", "#ee6c4d", "#fff", -6), shoe("#f0ebe3", "#7a6548", "#293241", "#e07a5f", "#eee", 4), shoe("#faf6f1", "#9a8568", "#415a77", "#f4845f", "#ddd", -14)],
    sizes: [38,39,40,41,42], stock: 2, category: "Günlük", badge: "İndirim" },
  { id: 4, slug: "puma-rs-x", name: "Puma RS-X", price: 1699, originalPrice: null,
    description: "Retro koşu estetiği ile modern teknolojiyi buluşturan cesur ve renkli bir sneaker.",
    image: shoe("#f5f0ff", "#6c63ff", "#fff", "#ff6584", "#6c63ff", -4),
    images: [shoe("#f5f0ff", "#6c63ff", "#fff", "#ff6584", "#6c63ff", -4), shoe("#fff0f5", "#7c3aed", "#fefefe", "#f472b6", "#7c3aed", 6), shoe("#f0f0ff", "#5b52e0", "#fff", "#ec4899", "#5b52e0", -11)],
    sizes: [40,41,42,43,44,45], stock: 5, category: "Spor", badge: null },
  { id: 5, slug: "converse-chuck-70", name: "Converse Chuck 70", price: 1299, originalPrice: 1599,
    description: "Premium materyaller ve geliştirilmiş taban ile ikonik Chuck Taylor'ın üst seviye versiyonu.",
    image: shoe("#faf9f6", "#f0e6c8", "#2d2d2d", "#c8102e", "#fff", -7),
    images: [shoe("#faf9f6", "#f0e6c8", "#2d2d2d", "#c8102e", "#fff", -7), shoe("#f5f4f0", "#e8dcc0", "#1a1a1a", "#b91c1c", "#eee", 2), shoe("#f8f7f4", "#f5ecd0", "#333", "#dc2626", "#ddd", -15)],
    sizes: [36,37,38,39,40,41,42], stock: 12, category: "Günlük", badge: "İndirim" },
  { id: 6, slug: "nike-dunk-low", name: "Nike Dunk Low Retro", price: 2199, originalPrice: null,
    description: "Basketbol kökenli bu ikon, sokak modasının vazgeçilmezi olarak geri döndü.",
    image: shoe("#f0fdf4", "#2d6a4f", "#fff", "#2d6a4f", "#2d6a4f", -5),
    images: [shoe("#f0fdf4", "#2d6a4f", "#fff", "#2d6a4f", "#2d6a4f", -5), shoe("#ecfdf5", "#1b4332", "#fefefe", "#40916c", "#1b4332", 3), shoe("#f5faf7", "#365e45", "#fff", "#52b788", "#365e45", -13)],
    sizes: [39,40,41,42,43], stock: 0, category: "Günlük", badge: "Tükendi" },
];

// ============================================
// ICONS
// ============================================
const I = {
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  close: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  arrow: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  check: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>,
  truck: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c8102e" strokeWidth="1.8"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  tag: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c8102e" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  heart: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c8102e" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  phone: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  wa: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
};

// ============================================
// NAVBAR
// ============================================
function Navbar({ onNav, pg }) {
  const [mo, setMo] = useState(false);
  const [sc, setSc] = useState(false);
  useEffect(() => { const fn = () => setSc(window.scrollY > 20); window.addEventListener("scroll", fn); return () => window.removeEventListener("scroll", fn); }, []);
  const lnk = [{ k: "home", l: "Ana Sayfa" }, { k: "catalog", l: "Ayakkabılar" }];
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: sc ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.8)", backdropFilter: "blur(24px)", borderBottom: sc ? "1px solid #eee" : "1px solid transparent", transition: "all 0.3s" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={() => onNav("home")} style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: 2 }}>
          <span style={{ fontFamily: T.d, fontSize: 22, fontWeight: 700, color: T.bk, fontStyle: "italic" }}>Uygun</span>
          <span style={{ fontFamily: T.f, fontSize: 20, fontWeight: 700, color: T.ac }}>Ayakkabı</span>
        </div>
        <div className="dn" style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {lnk.map(l => <span key={l.k} onClick={() => onNav(l.k)} style={{ cursor: "pointer", fontFamily: T.f, fontSize: 14, fontWeight: pg === l.k ? 600 : 400, color: pg === l.k ? T.bk : T.g500, position: "relative" }}>{l.l}{pg === l.k && <span style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", width: 16, height: 2, background: T.ac, borderRadius: 2 }} />}</span>)}
          <a href="tel:+905551234567" style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: T.f, fontSize: 13, fontWeight: 600, color: T.wh, background: T.bk, padding: "10px 24px", borderRadius: T.r.full, textDecoration: "none" }}>{I.phone} Bizi Ara</a>
        </div>
        <button className="mn" onClick={() => setMo(!mo)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: T.bk, padding: 4 }}>{mo ? I.close : I.menu}</button>
      </div>
      {mo && <div style={{ padding: "8px 24px 28px", display: "flex", flexDirection: "column", gap: 4, borderTop: "1px solid #e8e8e8" }}>
        {lnk.map(l => <span key={l.k} onClick={() => { onNav(l.k); setMo(false); }} style={{ cursor: "pointer", fontFamily: T.f, fontSize: 16, fontWeight: 500, color: T.bk, padding: "12px 0", borderBottom: "1px solid #f5f5f5" }}>{l.l}</span>)}
        <a href="tel:+905551234567" style={{ marginTop: 8, fontFamily: T.f, fontSize: 14, fontWeight: 600, color: T.wh, background: T.bk, padding: "14px 24px", borderRadius: T.r.full, textDecoration: "none", textAlign: "center" }}>Bizi Ara</a>
      </div>}
      <style>{`@media(max-width:768px){.dn{display:none!important}.mn{display:block!important}}`}</style>
    </nav>
  );
}

// ============================================
// PRODUCT CARD
// ============================================
function Card({ p, onView }) {
  const [h, sH] = useState(false);
  return (
    <div onMouseEnter={() => sH(true)} onMouseLeave={() => sH(false)} onClick={() => onView(p)}
      style={{ cursor: "pointer", borderRadius: T.r.xl, overflow: "hidden", background: T.wh, transition: "transform 0.35s cubic-bezier(.22,1,.36,1), box-shadow 0.35s", transform: h ? "translateY(-6px)" : "", boxShadow: h ? "0 24px 48px rgba(0,0,0,0.1)" : "0 1px 4px rgba(0,0,0,0.04)", border: "1px solid #e8e8e8" }}>
      <div style={{ position: "relative", paddingTop: "115%", overflow: "hidden", background: T.g100 }}>
        <img src={p.image} alt={p.name} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.6s cubic-bezier(.22,1,.36,1)", transform: h ? "scale(1.08)" : "", filter: p.stock === 0 ? "grayscale(40%)" : "" }} />
        {p.badge && <span style={{ position: "absolute", top: 14, left: 14, fontFamily: T.f, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", padding: "5px 12px", borderRadius: T.r.full, color: T.wh, background: p.badge === "Tükendi" ? T.g500 : p.badge === "İndirim" ? T.ac : T.bk }}>{p.badge}</span>}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px 16px 16px", background: "linear-gradient(transparent, rgba(0,0,0,0.5))", opacity: h ? 1 : 0, transition: "opacity 0.3s", display: "flex", justifyContent: "center" }}>
          <span style={{ fontFamily: T.f, fontSize: 13, fontWeight: 600, color: T.wh, background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", padding: "8px 20px", borderRadius: T.r.full }}>İncele →</span>
        </div>
      </div>
      <div style={{ padding: "18px 18px 20px" }}>
        <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 500, color: T.g400, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{p.category}</p>
        <h3 style={{ fontFamily: T.f, fontSize: 15, fontWeight: 600, color: T.bk, marginBottom: 10, lineHeight: 1.3 }}>{p.name}</h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: T.f, fontSize: 18, fontWeight: 700, color: T.bk }}>₺{p.price.toLocaleString("tr-TR")}</span>
            {p.originalPrice && <span style={{ fontFamily: T.f, fontSize: 13, color: T.g400, textDecoration: "line-through" }}>₺{p.originalPrice.toLocaleString("tr-TR")}</span>}
          </div>
          {p.originalPrice && <span style={{ fontFamily: T.f, fontSize: 11, fontWeight: 700, color: T.ac, background: "#fef2f2", padding: "3px 8px", borderRadius: T.r.full }}>%{Math.round((1 - p.price / p.originalPrice) * 100)}</span>}
        </div>
      </div>
    </div>
  );
}

// ============================================
// BUY FORM
// ============================================
function BuyForm({ product: p, onClose }) {
  const [f, sF] = useState({ name: "", phone: "", city: "" });
  const [ok, sOk] = useState(false);
  const [er, sEr] = useState({});
  const flds = [{ k: "name", l: "Ad Soyad", ph: "Adınız ve soyadınız", t: "text" }, { k: "phone", l: "Telefon Numarası", ph: "05XX XXX XX XX", t: "tel" }, { k: "city", l: "Şehir", ph: "Bulunduğunuz şehir", t: "text" }];
  const go = () => { const e = {}; if (!f.name.trim()) e.name = 1; if (f.phone.length < 10) e.phone = 1; if (!f.city.trim()) e.city = 1; sEr(e); if (!Object.keys(e).length) sOk(true); };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }} />
      <div style={{ position: "relative", background: T.wh, borderRadius: T.r.xl, padding: "36px 32px", maxWidth: 440, width: "100%", boxShadow: "0 32px 64px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: T.g100, border: "none", width: 36, height: 36, borderRadius: T.r.full, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.g600 }}>{I.close}</button>
        {ok ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>{I.check}</div>
            <h3 style={{ fontFamily: T.f, fontSize: 22, fontWeight: 700, color: T.bk, marginBottom: 8 }}>Talebiniz Alındı!</h3>
            <p style={{ fontFamily: T.f, fontSize: 14, color: T.g500, lineHeight: 1.7, marginBottom: 24 }}>Ekibimiz en kısa sürede sizi arayacak.</p>
            <button onClick={onClose} style={{ fontFamily: T.f, fontSize: 14, fontWeight: 600, color: T.wh, background: T.bk, border: "none", padding: "12px 32px", borderRadius: T.r.full, cursor: "pointer" }}>Tamam</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 14, marginBottom: 28, padding: 14, background: T.g50, borderRadius: T.r.lg }}>
              <img src={p.image} alt="" style={{ width: 56, height: 56, borderRadius: T.r.md, objectFit: "cover" }} />
              <div><p style={{ fontFamily: T.f, fontSize: 14, fontWeight: 600, color: T.bk }}>{p.name}</p><p style={{ fontFamily: T.f, fontSize: 15, fontWeight: 700, color: T.ac }}>₺{p.price.toLocaleString("tr-TR")}</p></div>
            </div>
            <h3 style={{ fontFamily: T.f, fontSize: 20, fontWeight: 700, color: T.bk, marginBottom: 4 }}>Satın Alma Talebi</h3>
            <p style={{ fontFamily: T.f, fontSize: 13, color: T.g500, marginBottom: 24 }}>Bilgilerinizi bırakın, sizi arayalım.</p>
            {flds.map(x => (
              <div key={x.k} style={{ marginBottom: 18 }}>
                <label style={{ fontFamily: T.f, fontSize: 12, fontWeight: 600, color: T.g600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{x.l}</label>
                <input type={x.t} placeholder={x.ph} value={f[x.k]} onChange={e => { sF({ ...f, [x.k]: e.target.value }); sEr({ ...er, [x.k]: false }); }}
                  style={{ width: "100%", padding: "13px 16px", borderRadius: T.r.md, border: `2px solid ${er[x.k] ? T.ac : T.g200}`, fontFamily: T.f, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = T.bk} onBlur={e => e.target.style.borderColor = er[x.k] ? T.ac : T.g200} />
              </div>
            ))}
            <button onClick={go} style={{ width: "100%", padding: "15px", background: T.ac, color: T.wh, border: "none", borderRadius: T.r.md, fontFamily: T.f, fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>Talep Gönder</button>
            <p style={{ fontFamily: T.f, fontSize: 11, color: T.g400, textAlign: "center", marginTop: 14 }}>Bilgileriniz yalnızca sipariş teyidi için kullanılacaktır.</p>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// FOOTER
// ============================================
function Foot({ onNav }) {
  return (
    <footer style={{ background: T.bk, color: T.wh, padding: "56px 24px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 40 }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 14 }}><span style={{ fontFamily: T.d, fontSize: 20, fontWeight: 700, fontStyle: "italic" }}>Uygun</span><span style={{ fontFamily: T.f, fontSize: 18, fontWeight: 700, color: T.ac }}>Ayakkabı</span></div>
          <p style={{ fontFamily: T.f, fontSize: 13, color: "#777", lineHeight: 1.8, maxWidth: 280 }}>Kaliteli ayakkabılar, uygun fiyatlar. %100 orijinal ürünler.</p>
        </div>
        <div><h5 style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", marginBottom: 18 }}>Sayfalar</h5>{["Ana Sayfa", "Ayakkabılar"].map((l, i) => <p key={l} onClick={() => onNav(i === 0 ? "home" : "catalog")} style={{ fontFamily: T.f, fontSize: 14, color: "#999", marginBottom: 10, cursor: "pointer" }}>{l}</p>)}</div>
        <div><h5 style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", marginBottom: 18 }}>İletişim</h5><p style={{ fontFamily: T.f, fontSize: 14, color: "#999", lineHeight: 2.2 }}>0555 123 45 67<br />info@uygunayakkabi.com<br />İstanbul, Türkiye</p></div>
        <div><h5 style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", marginBottom: 18 }}>Sosyal Medya</h5><p style={{ fontFamily: T.f, fontSize: 14, color: "#999", lineHeight: 2.2 }}>Instagram<br />WhatsApp<br />TikTok</p></div>
      </div>
      <div style={{ maxWidth: 1280, margin: "48px auto 0", padding: "20px 0", borderTop: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontFamily: T.f, fontSize: 12, color: "#444" }}>© 2025 UygunAyakkabı — Tüm hakları saklıdır.</p>
        <p style={{ fontFamily: T.f, fontSize: 12, color: "#444" }}>uygunayakkabi.com</p>
      </div>
    </footer>
  );
}

// ============================================
// HOME
// ============================================
function Home({ onNav, onView }) {
  const why = [
    { icon: I.truck, title: "Hızlı Kargo", desc: "Siparişleriniz 1-3 iş günü içinde kapınızda." },
    { icon: I.tag, title: "Uygun Fiyat", desc: "Piyasanın altında fiyatlarla orijinal ürünler." },
    { icon: I.heart, title: "Müşteri Memnuniyeti", desc: "Binlerce mutlu müşteri ve %100 iade garantisi." },
  ];
  return (
    <div>
      {/* HERO */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", background: T.g50, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20%", right: "-10%", width: "60%", height: "140%", background: "radial-gradient(ellipse, rgba(200,16,46,0.03) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hg" style={{ maxWidth: 1280, margin: "0 auto", padding: "120px 24px 80px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center", width: "100%" }}>
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ display: "inline-block", fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: T.ac, background: "#fef2f2", padding: "6px 14px", borderRadius: T.r.full, marginBottom: 20 }}>Yeni Sezon 2025</div>
            <h1 style={{ fontFamily: T.d, fontSize: "clamp(40px, 5.5vw, 72px)", fontWeight: 700, color: T.bk, lineHeight: 1.05, marginBottom: 20 }}>
              Kaliteli Ayakkabılar
              <span style={{ display: "block", fontFamily: T.f, fontWeight: 300, fontSize: "clamp(28px, 3.5vw, 48px)", color: T.g500, marginTop: 4 }}>Uygun Fiyatlar</span>
            </h1>
            <p style={{ fontFamily: T.f, fontSize: 16, color: T.g500, lineHeight: 1.75, marginBottom: 36, maxWidth: 420 }}>En popüler markaların en iyi modelleri, piyasanın altında fiyatlarla. Beğendiğiniz ayakkabıyı seçin, biz sizi arayalım.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => onNav("catalog")} style={{ fontFamily: T.f, fontSize: 15, fontWeight: 600, color: T.wh, background: T.ac, border: "none", padding: "16px 36px", borderRadius: T.r.full, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>Ayakkabıları Gör {I.arrow}</button>
              <a href="tel:+905551234567" style={{ fontFamily: T.f, fontSize: 15, fontWeight: 600, color: T.bk, background: T.wh, border: "2px solid #e8e8e8", padding: "14px 28px", borderRadius: T.r.full, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>{I.phone} Hemen Ara</a>
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ borderRadius: 28, overflow: "hidden", aspectRatio: "4/5", background: T.g200, boxShadow: "0 32px 64px rgba(0,0,0,0.12)" }}>
              <img src={heroImg} alt="Featured" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ position: "absolute", bottom: -16, left: -16, background: T.wh, borderRadius: T.r.lg, padding: "16px 20px", boxShadow: "0 16px 40px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => onView(products[0])}>
              <img src={products[0].image} alt="" style={{ width: 48, height: 48, borderRadius: T.r.md, objectFit: "cover" }} />
              <div><p style={{ fontFamily: T.f, fontSize: 13, fontWeight: 600, color: T.bk }}>{products[0].name}</p><p style={{ fontFamily: T.f, fontSize: 14, fontWeight: 700, color: T.ac }}>₺{products[0].price.toLocaleString("tr-TR")}</p></div>
            </div>
            <div style={{ position: "absolute", top: 24, right: -12, background: T.wh, borderRadius: T.r.lg, padding: "14px 20px", boxShadow: "0 12px 32px rgba(0,0,0,0.08)", textAlign: "center" }}>
              <p style={{ fontFamily: T.f, fontSize: 22, fontWeight: 800, color: T.ac }}>500+</p>
              <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 500, color: T.g500 }}>Mutlu Müşteri</p>
            </div>
          </div>
        </div>
        <style>{`@media(max-width:768px){.hg{grid-template-columns:1fr!important;text-align:center;padding-top:100px!important}.hg>div:last-child{order:-1}.hg>div:first-child>div:last-child{justify-content:center}}`}</style>
      </section>

      {/* BEST SELLERS */}
      <section style={{ padding: "80px 24px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 12 }}>
          <div><p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: T.ac, marginBottom: 8 }}>Koleksiyon</p><h2 style={{ fontFamily: T.d, fontSize: "clamp(28px, 3vw, 36px)", fontWeight: 700, color: T.bk }}>Çok Satanlar</h2></div>
          <span onClick={() => onNav("catalog")} style={{ fontFamily: T.f, fontSize: 14, fontWeight: 500, color: T.g500, cursor: "pointer" }}>Tümünü Gör →</span>
        </div>
        <div className="bg" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {products.slice(0, 6).map(p => <Card key={p.id} p={p} onView={onView} />)}
        </div>
        <style>{`@media(max-width:1024px){.bg{grid-template-columns:repeat(2,1fr)!important}}@media(max-width:640px){.bg{grid-template-columns:1fr!important;gap:16px!important}}`}</style>
      </section>

      {/* WHY US */}
      <section style={{ padding: "64px 24px 80px", background: T.g50 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}><p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: T.ac, marginBottom: 8 }}>Neden Biz?</p><h2 style={{ fontFamily: T.d, fontSize: "clamp(28px, 3vw, 36px)", fontWeight: 700, color: T.bk }}>Farkımız</h2></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            {why.map((w, i) => (
              <div key={i} style={{ background: T.wh, borderRadius: T.r.xl, padding: "36px 28px", textAlign: "center", border: "1px solid #e8e8e8" }}>
                <div style={{ width: 60, height: 60, borderRadius: T.r.lg, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>{w.icon}</div>
                <h3 style={{ fontFamily: T.f, fontSize: 17, fontWeight: 700, color: T.bk, marginBottom: 8 }}>{w.title}</h3>
                <p style={{ fontFamily: T.f, fontSize: 14, color: T.g500, lineHeight: 1.65 }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 24px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ background: T.bk, borderRadius: 28, padding: "64px 40px", textAlign: "center", margin: "64px 0", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: "40%", height: "100%", background: "radial-gradient(ellipse at right, rgba(200,16,46,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
          <h2 style={{ fontFamily: T.d, fontSize: "clamp(24px, 3vw, 40px)", fontWeight: 700, color: T.wh, marginBottom: 14, position: "relative" }}>Aradığınız modeli bulamadınız mı?</h2>
          <p style={{ fontFamily: T.f, fontSize: 15, color: "#888", marginBottom: 32, position: "relative" }}>Bize ulaşın, istediğiniz ayakkabıyı sizin için bulalım.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
            <a href="tel:+905551234567" style={{ fontFamily: T.f, fontSize: 15, fontWeight: 600, color: T.bk, background: T.wh, padding: "14px 32px", borderRadius: T.r.full, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>{I.phone} 0555 123 45 67</a>
            <a href="https://wa.me/905551234567" target="_blank" rel="noreferrer" style={{ fontFamily: T.f, fontSize: 15, fontWeight: 600, color: T.wh, background: "#25D366", padding: "14px 32px", borderRadius: T.r.full, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>{I.wa} WhatsApp</a>
          </div>
        </div>
      </section>
      <Foot onNav={onNav} />
    </div>
  );
}

// ============================================
// CATALOG
// ============================================
function Catalog({ onView }) {
  const [fl, sFl] = useState("Tümü");
  const cs = ["Tümü", "Spor", "Günlük"];
  const flt = fl === "Tümü" ? products : products.filter(p => p.category === fl);
  return (
    <div style={{ paddingTop: 68 }}>
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ marginBottom: 36 }}><p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: T.ac, marginBottom: 8 }}>Koleksiyon</p><h1 style={{ fontFamily: T.d, fontSize: "clamp(32px, 4vw, 44px)", fontWeight: 700, color: T.bk, marginBottom: 8 }}>Ayakkabılar</h1><p style={{ fontFamily: T.f, fontSize: 15, color: T.g500 }}>{flt.length} ürün listeleniyor</p></div>
        <div style={{ display: "flex", gap: 8, marginBottom: 36, flexWrap: "wrap" }}>
          {cs.map(c => <button key={c} onClick={() => sFl(c)} style={{ fontFamily: T.f, fontSize: 13, fontWeight: 500, padding: "10px 24px", borderRadius: T.r.full, border: "none", cursor: "pointer", background: fl === c ? T.bk : T.g100, color: fl === c ? T.wh : T.g600 }}>{c}</button>)}
        </div>
        <div className="cg" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {flt.map(p => <Card key={p.id} p={p} onView={onView} />)}
        </div>
        <style>{`@media(max-width:1024px){.cg{grid-template-columns:repeat(2,1fr)!important}}@media(max-width:640px){.cg{grid-template-columns:1fr!important;gap:16px!important}}`}</style>
      </section>
      <Foot onNav={() => {}} />
    </div>
  );
}

// ============================================
// DETAIL
// ============================================
function Detail({ product: p, onBack }) {
  const [sz, sSz] = useState(null);
  const [im, sIm] = useState(0);
  const [sf, sSf] = useState(false);
  const sl = p.stock === 0 ? { t: "Stokta Yok", c: T.ac, bg: "#fef2f2" } : p.stock <= 3 ? { t: `Son ${p.stock} adet!`, c: "#d97706", bg: "#fffbeb" } : { t: "Stokta", c: T.gn, bg: "#f0fdf4" };
  return (
    <div style={{ paddingTop: 68 }}>
      {sf && <BuyForm product={p} onClose={() => sSf(false)} />}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <span onClick={onBack} style={{ fontFamily: T.f, fontSize: 13, color: T.g500, cursor: "pointer" }}>← Ayakkabılar</span>
          <span style={{ color: T.g200 }}>/</span>
          <span style={{ fontFamily: T.f, fontSize: 13, color: T.bk, fontWeight: 500 }}>{p.name}</span>
        </div>
        <div className="dg" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 56 }}>
          <div>
            <div style={{ borderRadius: 24, overflow: "hidden", aspectRatio: "1/1", background: T.g100, marginBottom: 14, position: "relative" }}>
              <img src={p.images[im]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {p.badge && <span style={{ position: "absolute", top: 20, left: 20, fontFamily: T.f, fontSize: 12, fontWeight: 700, textTransform: "uppercase", padding: "6px 14px", borderRadius: T.r.full, color: T.wh, background: p.badge === "Tükendi" ? T.g500 : p.badge === "İndirim" ? T.ac : T.bk }}>{p.badge}</span>}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {p.images.map((x, i) => <div key={i} onClick={() => sIm(i)} style={{ width: 80, height: 80, borderRadius: T.r.md, overflow: "hidden", border: `2.5px solid ${im === i ? T.bk : "transparent"}`, cursor: "pointer", flexShrink: 0 }}><img src={x} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>)}
            </div>
          </div>
          <div style={{ paddingTop: 8 }}>
            <p style={{ fontFamily: T.f, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: T.ac, marginBottom: 10 }}>{p.category}</p>
            <h1 style={{ fontFamily: T.d, fontSize: "clamp(28px, 3vw, 38px)", fontWeight: 700, color: T.bk, marginBottom: 16, lineHeight: 1.15 }}>{p.name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <span style={{ fontFamily: T.f, fontSize: 30, fontWeight: 800, color: T.bk }}>₺{p.price.toLocaleString("tr-TR")}</span>
              {p.originalPrice && <><span style={{ fontFamily: T.f, fontSize: 18, color: T.g400, textDecoration: "line-through" }}>₺{p.originalPrice.toLocaleString("tr-TR")}</span><span style={{ fontFamily: T.f, fontSize: 13, fontWeight: 700, color: T.ac, background: "#fef2f2", padding: "4px 10px", borderRadius: T.r.full }}>%{Math.round((1 - p.price / p.originalPrice) * 100)} İndirim</span></>}
            </div>
            <p style={{ fontFamily: T.f, fontSize: 15, color: T.g500, lineHeight: 1.7, marginBottom: 24, maxWidth: 480 }}>{p.description}</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: T.r.full, background: sl.bg, marginBottom: 28 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: sl.c }} /><span style={{ fontFamily: T.f, fontSize: 13, fontWeight: 600, color: sl.c }}>{sl.t}</span>
            </div>
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontFamily: T.f, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: T.g600, marginBottom: 14 }}>Beden {sz && <span style={{ color: T.bk }}>— {sz}</span>}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {p.sizes.map(s => <button key={s} onClick={() => sSz(s)} style={{ width: 52, height: 52, borderRadius: T.r.md, border: sz === s ? `2px solid ${T.bk}` : `2px solid ${T.g200}`, background: sz === s ? T.bk : T.wh, color: sz === s ? T.wh : T.g600, fontFamily: T.f, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{s}</button>)}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => p.stock > 0 && sSf(true)} style={{ width: "100%", padding: "17px", background: p.stock > 0 ? T.ac : T.g400, color: T.wh, border: "none", borderRadius: T.r.md, fontFamily: T.f, fontSize: 16, fontWeight: 700, cursor: p.stock > 0 ? "pointer" : "not-allowed" }}>{p.stock > 0 ? "Satın Alma Talebi" : "Stokta Yok"}</button>
              <a href="https://wa.me/905551234567" target="_blank" rel="noreferrer" style={{ width: "100%", padding: "15px", background: T.wh, color: "#25D366", border: "2px solid #25D366", borderRadius: T.r.md, fontFamily: T.f, fontSize: 15, fontWeight: 600, textDecoration: "none", textAlign: "center", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>{I.wa} WhatsApp ile Sor</a>
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 32, paddingTop: 24, borderTop: "1px solid #e8e8e8", flexWrap: "wrap" }}>
              {["Orijinal Ürün", "Hızlı Kargo", "İade Garantisi"].map(t => <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg><span style={{ fontFamily: T.f, fontSize: 12, fontWeight: 500, color: T.g500 }}>{t}</span></div>)}
            </div>
          </div>
        </div>
        <style>{`@media(max-width:768px){.dg{grid-template-columns:1fr!important;gap:28px!important}}`}</style>
      </section>
      <Foot onNav={() => {}} />
    </div>
  );
}

// ============================================
// APP
// ============================================
export default function App() {
  const [pg, sPg] = useState("home");
  const [sel, sSel] = useState(null);

  useEffect(() => {
    const fl = document.createElement("link");
    fl.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap";
    fl.rel = "stylesheet";
    document.head.appendChild(fl);
  }, []);

  const nav = p => { sPg(p); if (p !== "detail") sSel(null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const view = p => { sSel(p); sPg("detail"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return (
    <div style={{ minHeight: "100vh", background: T.wh }}>
      <Navbar onNav={nav} pg={pg} />
      {pg === "home" && <Home onNav={nav} onView={view} />}
      {pg === "catalog" && <Catalog onView={view} />}
      {pg === "detail" && sel && <Detail product={sel} onBack={() => nav("catalog")} />}
    </div>
  );
}
