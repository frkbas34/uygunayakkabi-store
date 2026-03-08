"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";
import {
  Menu,
  X,
  Phone,
  MessageCircle,
  Check,
  Truck,
  ShieldCheck,
  RotateCcw,
  Star,
  Users,
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Zap,
  ShoppingBag,
  Plus,
  Minus,
} from "lucide-react";
import { useCart } from "./context/CartContext";

// ─────────────────────────────────────────────────────────────────────────────
// SVG SHOE GENERATOR
// Placeholder images — swap the `images` arrays in the products data below with
// real paths like "/products/model-1-side.jpg" once photos are placed in /public/products/
// ─────────────────────────────────────────────────────────────────────────────
function shoe(bg, sole, body, acc, lace, rot = 0) {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><defs><radialGradient id="g1" cx="30%" cy="30%"><stop offset="0%" stop-color="${acc}" stop-opacity="0.08"/><stop offset="100%" stop-color="${acc}" stop-opacity="0"/></radialGradient></defs><rect width="800" height="800" fill="${bg}"/><rect width="800" height="800" fill="url(#g1)"/><g transform="translate(400,400) rotate(${rot}) scale(1.15)"><path d="M-220,80Q-220,110-180,120L200,120Q240,120,250,95L260,60Q260,45,240,40L-180,40Q-220,45-220,80Z" fill="${sole}"/><path d="M-180,120Q-180,138-145,142L195,142Q235,142,245,125L250,95Q240,120,200,120L-180,120Z" fill="${sole}" opacity="0.4"/><path d="M-200,48Q-210,68-190,78L230,78Q250,73,255,53L250,33Q245,23,230,23L-175,23Q-200,28-200,48Z" fill="white" opacity="0.88"/><ellipse cx="185" cy="52" rx="38" ry="20" fill="${acc}" opacity="0.18"/><ellipse cx="-120" cy="52" rx="30" ry="16" fill="${acc}" opacity="0.1"/><path d="M-180,28Q-200,8-195,-42Q-185,-102-140,-132Q-80,-172,20,-177Q120,-180,180,-152Q230,-127,245,-72Q255,-27,245,13L240,23L-175,23Q-185,26-180,28Z" fill="${body}"/><path d="M60,-165Q140,-160,185,-135Q225,-112,240,-65Q250,-25,245,13L170,13Q178,-22,162,-58Q140,-100,85,-128Q30,-150-25,-148Z" fill="white" opacity="0.09"/><path d="M-150,-45Q-70,-92,50,-87Q145,-82,210,-38" fill="none" stroke="${acc}" stroke-width="14" stroke-linecap="round" opacity="0.75"/><path d="M-195,-42Q-190,-58-168,-68Q-128,-88-78,-82" fill="none" stroke="${body}" stroke-width="18" stroke-linecap="round" opacity="0.3"/><path d="M-118,-132Q-98,-172-58,-187Q-18,-197,22,-187Q42,-180,47,-167" fill="${body}" opacity="0.55"/><line x1="-78" y1="-132" x2="-18" y2="-147" stroke="${lace}" stroke-width="4.5" stroke-linecap="round"/><line x1="-58" y1="-112" x2="2" y2="-132" stroke="${lace}" stroke-width="4.5" stroke-linecap="round"/><line x1="-38" y1="-92" x2="22" y2="-117" stroke="${lace}" stroke-width="4.5" stroke-linecap="round"/><circle cx="-78" cy="-132" r="5" fill="${lace}" opacity="0.55"/><circle cx="-58" cy="-112" r="5" fill="${lace}" opacity="0.55"/><circle cx="-38" cy="-92" r="5" fill="${lace}" opacity="0.55"/><circle cx="-18" cy="-147" r="5" fill="${lace}" opacity="0.55"/><circle cx="2" cy="-132" r="5" fill="${lace}" opacity="0.55"/><circle cx="22" cy="-117" r="5" fill="${lace}" opacity="0.55"/></g><ellipse cx="400" cy="605" rx="240" ry="20" fill="black" opacity="0.055"/></svg>`
  )}`;
}

// Hero image — real photo for hero section (Unsplash)
const heroImg = `https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900&h=1100&fit=crop&q=80`;

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS — All images use SVG shoe generator for consistency
// ─────────────────────────────────────────────────────────────────────────────

// Günlük — casual sneakers / runners
const imgCikolata  = [shoe("#f5ede0","#3d1f0a","#6b3a1f","#c8a882","#7a5535",0), shoe("#ede5d8","#2d1205","#5a3018","#b89872","#6a4525",-3)];
const imgSiyah     = [shoe("#f0f0f0","#111","#222","#888","#fff",0), shoe("#e8e8e8","#0a0a0a","#1a1a1a","#777","#eee",-3)];
const imgLacivert  = [shoe("#e8eef8","#0a1a40","#1a3a7a","#4a6fb5","#8ab4d8",0), shoe("#dde5f5","#08163a","#163270","#3a5fa5","#7aa4c8",-3)];
const imgCamel     = [shoe("#fdf5e0","#6b4c1a","#b8834a","#d4a96c","#f0d4a0",0), shoe("#f5eedc","#5a3e12","#a87540","#c4995c","#e0c490",-3)];
const imgBordo     = [shoe("#f5e6e8","#3d0a0e","#8b1a22","#cc4444","#f0a0a8",0), shoe("#ede0e2","#350208","#7a1218","#bb3838","#e09098",-3)];
const imgKum       = [shoe("#faf5e4","#7a6a36","#c4a862","#e0c890","#d4b870",0), shoe("#f2edd8","#6a5a28","#b49852","#d0b880","#c4a860",-3)];
// Klasik — derby, loafer, oxford
const imgKonjak    = [shoe("#f8f0e4","#5a2a0a","#a84a18","#d4864a","#c8b878",0), shoe("#f0e8dc","#4a2008","#983e10","#c47640","#b8a868",-3)];
const imgGece      = [shoe("#e0e8f4","#0a0a2e","#1a1a5a","#3a3a8a","#8888cc",0), shoe("#d8e0ec","#080826","#12124a","#2a2a7a","#7878bc",-3)];
const imgOxford    = [shoe("#f2f2f2","#0a0a0a","#1c1c1c","#aaa","#ddd",0), shoe("#eaeaea","#050505","#141414","#999","#ccc",-3)];
const imgVelvet    = [shoe("#e8f0fc","#0a1a4a","#1a2a8a","#4a5acc","#d0d8f8",0), shoe("#e0e8f4","#081640","#182280","#3a4abc","#c0c8e8",-3)];
// Spor — running, training, trail
const imgSporBeyaz = [shoe("#f8f8f8","#e0e0e0","#ffffff","#00b4d8","#0077b6",0), shoe("#f0f0f8","#d0d0d0","#f0f0f0","#0090c0","#005a9a",-3)];
const imgSporKirmizi=[shoe("#fff0f0","#c8102e","#e8182e","#ff6b8a","#fff",0), shoe("#f8e8e8","#a80018","#c81020","#ee5b7a","#eee",-3)];
const imgSporYesil = [shoe("#f0faf2","#145a20","#1e8a2e","#4dcc6a","#b8f5c4",0), shoe("#e8f2ea","#0e4a18","#187a26","#3dbc5a","#a8e5b4",-3)];
const imgSporTuruncu=[shoe("#fff5ec","#7a3000","#d4560a","#ff8c42","#ffe0c8",0), shoe("#f5ede4","#6a2800","#c44800","#ef7c32","#f5d0b8",-3)];
// Bot — boots
const imgBotKahve  = [shoe("#ede0d0","#2a1400","#5a3010","#8a5430","#d4a06a",0), shoe("#e5d8c8","#1e0e00","#4a2808","#7a4428","#c4905a",-3)];
const imgBotSiyah  = [shoe("#e8e8e8","#080808","#181818","#555","#ccc",0), shoe("#e0e0e0","#050505","#101010","#444","#bbb",-3)];
const imgBotHaki   = [shoe("#f0f0e4","#2a3010","#4a5420","#7a8a40","#c4d090",0), shoe("#e8e8dc","#202808","#3a4418","#6a7a30","#b4c080",-3)];
// Sandalet — sandals
const imgSandKrem  = [shoe("#fdfaf2","#7a6040","#c8a870","#e8c890","#f5e8c0",0), shoe("#f5f2ea","#6a5030","#b89860","#d8b880","#e5d8b0",-3)];
const imgSandMavi  = [shoe("#e8f4fd","#0a3a5a","#1a6a9a","#3a9acc","#a0d8f0",0), shoe("#e0eef5","#083050","#126090","#2a8abc","#90c8e0",-3)];

const products = [
  // ── GÜNLÜK ──────────────────────────────────────────────────────────────────
  {
    id: 1,
    name: "Deri Runner — Çikolata",
    price: 4290,
    originalPrice: 5490,
    description: "Çikolata kahvesi nubuk ve tam deri kombinasyonu, kabartmalı elmas desen panel ve tabaka kauçuk taban. El işçiliği, premium İtalyan deri.",
    images: imgCikolata,
    sizes: [40, 41, 42, 43, 44],
    stock: 5,
    category: "Günlük",
    badge: "İndirim",
  },
  {
    id: 2,
    name: "Deri Runner — Jet Siyah",
    price: 4290,
    originalPrice: null,
    description: "Siyah tam deri üst, kontrastlı kabartma panel ve bej tabaka taban. Sofistike sokak stili için tasarlandı.",
    images: imgSiyah,
    sizes: [39, 40, 41, 42, 43, 44],
    stock: 8,
    category: "Günlük",
    badge: "Yeni",
  },
  {
    id: 3,
    name: "Deri Runner — Lacivert",
    price: 4290,
    originalPrice: 5490,
    description: "Lacivert tam deri, kontrast bej taban ve işlemeli yan panel. Zamansız zarafetle modern konfor.",
    images: imgLacivert,
    sizes: [40, 41, 42, 43],
    stock: 3,
    category: "Günlük",
    badge: "İndirim",
  },
  {
    id: 4,
    name: "Deri Runner — Camel",
    price: 4890,
    originalPrice: null,
    description: "Işıltılı camel patinalı deri ve süet kombinasyonu. Tabaka sole ve bağcıklı tasarımıyla her kombiye uyum.",
    images: imgCamel,
    sizes: [40, 41, 42, 43, 44, 45],
    stock: 6,
    category: "Günlük",
    badge: null,
  },
  {
    id: 5,
    name: "Deri Runner — Bordo",
    price: 4890,
    originalPrice: 5990,
    description: "Zengin bordo patinalı deri, kontrast dikişler ve özel işçilik. Koleksiyonun en gösterişli rengi.",
    images: imgBordo,
    sizes: [39, 40, 41, 42, 43],
    stock: 2,
    category: "Günlük",
    badge: "İndirim",
  },
  {
    id: 6,
    name: "Nubuk Sneaker — Kum",
    price: 3890,
    originalPrice: null,
    description: "Nefes alabilen kum rengi nubuk deri, crepe kauçuk taban ve minimal kesim. Günlük kullanımın vazgeçilmezi.",
    images: imgKum,
    sizes: [38, 39, 40, 41, 42],
    stock: 10,
    category: "Günlük",
    badge: "Yeni",
  },
  {
    id: 10,
    name: "Velvet Sneaker — Derin Mavi",
    price: 4990,
    originalPrice: null,
    description: "Derin mavi kadife üst, kontrast beyaz taban ve saten bağcıklar. Lüks gece stili için tasarlanmış özel koleksiyon.",
    images: imgVelvet,
    sizes: [38, 39, 40, 41, 42, 43],
    stock: 5,
    category: "Günlük",
    badge: null,
  },
  // ── KLASİK ──────────────────────────────────────────────────────────────────
  {
    id: 7,
    name: "Deri Derby — Konjak",
    price: 5290,
    originalPrice: 6490,
    description: "Zengin konjak rengi İngiliz deri, Goodyear welt dikişi ve kauçuk-deri karma taban. Resmi ve business casual her ortam için.",
    images: imgKonjak,
    sizes: [40, 41, 42, 43, 44],
    stock: 4,
    category: "Klasik",
    badge: "İndirim",
  },
  {
    id: 8,
    name: "Süet Loafer — Gece",
    price: 4490,
    originalPrice: null,
    description: "Gece mavisi süet, altın bitişli tok nal taban ve tassel detayıyla soylu bir klasik. Tam ayak konforu.",
    images: imgGece,
    sizes: [39, 40, 41, 42, 43, 44],
    stock: 7,
    category: "Klasik",
    badge: "Yeni",
  },
  {
    id: 9,
    name: "Deri Oxford — Siyah",
    price: 5490,
    originalPrice: 6990,
    description: "Siyah tam deri Brogue detayları, Goodyear welt dikişi ve deri-kauçuk karma taban. Zamansız bir klasik.",
    images: imgOxford,
    sizes: [40, 41, 42, 43],
    stock: 0,
    category: "Klasik",
    badge: "Tükendi",
  },
  // ── SPOR ────────────────────────────────────────────────────────────────────
  {
    id: 11,
    name: "Air Runner — Beyaz/Mavi",
    price: 3490,
    originalPrice: 4290,
    description: "Ultra hafif köpük taban ve mesh üst. Koşu ve günlük antrenmanlar için nefes alabilen spor tasarımı.",
    images: imgSporBeyaz,
    sizes: [38, 39, 40, 41, 42, 43, 44],
    stock: 12,
    category: "Spor",
    badge: "İndirim",
  },
  {
    id: 12,
    name: "Sprint Pro — Kırmızı",
    price: 3890,
    originalPrice: null,
    description: "Enerji dolduran kırmızı tonları, ergonomik taban ve anti-kayma dış taban. Performansını bir üst seviyeye taşı.",
    images: imgSporKirmizi,
    sizes: [39, 40, 41, 42, 43, 44],
    stock: 9,
    category: "Spor",
    badge: "Yeni",
  },
  {
    id: 13,
    name: "TrailMax — Yeşil",
    price: 4190,
    originalPrice: 5090,
    description: "Doğa yürüyüşleri için su geçirmez dış kaplama, agresif çivi tabanlı zemin tutuşu ve şok emici bölge.",
    images: imgSporYesil,
    sizes: [40, 41, 42, 43, 44, 45],
    stock: 6,
    category: "Spor",
    badge: "İndirim",
  },
  {
    id: 14,
    name: "FlexFit — Turuncu",
    price: 3290,
    originalPrice: null,
    description: "360° esnek taban teknolojisi, turuncu aksanlar ve geniş burun bölgesi. Yoga ve studio antrenmanlarının vazgeçilmezi.",
    images: imgSporTuruncu,
    sizes: [38, 39, 40, 41, 42],
    stock: 15,
    category: "Spor",
    badge: "Yeni",
  },
  // ── BOT ─────────────────────────────────────────────────────────────────────
  {
    id: 15,
    name: "Deri Bot — Taba",
    price: 6490,
    originalPrice: 7990,
    description: "Gerçek deri üst, YKK fermuar ve kalın kauçuk taban. Kış aylarında hem sıcak hem şık görünümün garantisi.",
    images: imgBotKahve,
    sizes: [40, 41, 42, 43, 44],
    stock: 4,
    category: "Bot",
    badge: "İndirim",
  },
  {
    id: 16,
    name: "Combat Bot — Siyah",
    price: 5990,
    originalPrice: null,
    description: "Sağlam deri yapısı, çelik güçlendirilmiş bağcık gözeleri ve platform taban. Sokak stilinin en sert ifadesi.",
    images: imgBotSiyah,
    sizes: [39, 40, 41, 42, 43, 44],
    stock: 7,
    category: "Bot",
    badge: "Yeni",
  },
  {
    id: 17,
    name: "Haki Bot — Kargo",
    price: 5490,
    originalPrice: 6590,
    description: "Askeri haki ton, yüksek konç tasarımı ve çift kilitleme sistemi. Kamp ve şehir hayatı için ideal.",
    images: imgBotHaki,
    sizes: [40, 41, 42, 43, 44, 45],
    stock: 5,
    category: "Bot",
    badge: "İndirim",
  },
  // ── SANDALET ────────────────────────────────────────────────────────────────
  {
    id: 18,
    name: "Sandalet — Krem Deri",
    price: 2890,
    originalPrice: 3490,
    description: "Yumuşak krem deri kayışlar, özel kalıplı EVA taban ve tokalı ayarlanabilir bilek bağı. Yaz sezonunun favorisi.",
    images: imgSandKrem,
    sizes: [37, 38, 39, 40, 41, 42],
    stock: 8,
    category: "Sandalet",
    badge: "İndirim",
  },
  {
    id: 19,
    name: "Sandalet — Mavi Süet",
    price: 2690,
    originalPrice: null,
    description: "Okyanus mavisi süet kayışlar, mantar taban ve çift tokalı kapama. Plaj ve tatil için harika seçim.",
    images: imgSandMavi,
    sizes: [37, 38, 39, 40, 41],
    stock: 11,
    category: "Sandalet",
    badge: "Yeni",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TRUST ITEMS
// ─────────────────────────────────────────────────────────────────────────────
const TRUST = [
  { Icon: ShieldCheck, label: "%100 Orijinal", sub: "Ürün Garantisi" },
  { Icon: Truck, label: "Hızlı Kargo", sub: "1-3 İş Günü" },
  { Icon: RotateCcw, label: "Kolay İade", sub: "30 Gün" },
  { Icon: BadgeCheck, label: "Güvenli Alışveriş", sub: "SSL Korumalı" },
];

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT IMAGE — smart wrapper: <img> for SVG data URIs, <Image> for real paths
// When you add real photos to /public/products/, next/image handles optimization
// automatically (lazy loading, WebP conversion, responsive srcsets).
// ─────────────────────────────────────────────────────────────────────────────
function ProductImage({ src, alt, className = "" }) {
  if (!src) return null;
  // Data URIs and blob URLs are not optimizable — use a regular img tag
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return (
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={`w-full h-full object-cover select-none ${className}`}
      />
    );
  }
  // Real /public/ paths — use next/image for WebP conversion + lazy loading
  return (
    <Image
      src={src}
      alt={alt}
      fill
      draggable={false}
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
      className={`object-contain select-none ${className}`}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD CAROUSEL — Embla-powered, touch-friendly swipe for product cards
// ─────────────────────────────────────────────────────────────────────────────
function CardCarousel({ product: p, onCallBack }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: false });
  const [selected, setSelected] = useState(0);
  // "default" | "sizing" | "added"
  const [cartPhase, setCartPhase] = useState("default");
  const { dispatch } = useCart();

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => emblaApi.off("select", onSelect);
  }, [emblaApi]);

  const scrollPrev = useCallback(
    (e) => { e.stopPropagation(); emblaApi?.scrollPrev(); },
    [emblaApi]
  );
  const scrollNext = useCallback(
    (e) => { e.stopPropagation(); emblaApi?.scrollNext(); },
    [emblaApi]
  );

  const handleAddToCart = (e, size) => {
    e.stopPropagation();
    dispatch({ type: "ADD", product: p, size, qty: 1 });
    setCartPhase("added");
    setTimeout(() => setCartPhase("default"), 1800);
  };

  const badgeCls =
    p.badge === "Tükendi"
      ? "bg-gray-500"
      : p.badge === "İndirim"
      ? "bg-gradient-to-r from-[#c8102e] to-rose-500"
      : p.badge === "Yeni"
      ? "bg-gradient-to-r from-emerald-500 to-teal-600"
      : "bg-gray-800";

  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-white">
      {/* ── Embla viewport ── */}
      <div
        ref={emblaRef}
        className="overflow-hidden h-full cursor-grab active:cursor-grabbing"
        style={{ touchAction: "pan-y" }}
      >
        <div className="flex h-full select-none">
          {p.images.map((src, i) => (
            <div key={i} className="flex-[0_0_100%] min-w-0 h-full relative">
              <ProductImage src={src} alt={`${p.name} — ${i + 1}. açı`} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Status badge ── */}
      {p.badge && (
        <span
          className={`absolute top-2.5 left-2.5 z-20 ${badgeCls} text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full`}
        >
          {p.badge}
        </span>
      )}

      {/* ── Discount pill (top-right) ── */}
      {p.originalPrice && p.badge !== "Tükendi" && (
        <span className="absolute top-2.5 right-2.5 z-20 bg-white text-[#c8102e] text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
          %{Math.round((1 - p.price / p.originalPrice) * 100)}
        </span>
      )}

      {/* ── Prev / Next arrows — appear on card hover (desktop only) ── */}
      {p.images.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            aria-label="Önceki görsel"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7
              bg-white/92 backdrop-blur-sm rounded-full flex items-center justify-center
              shadow-md opacity-0 group-hover/card:opacity-100
              transition-all duration-200 hover:bg-white hover:shadow-lg active:scale-90"
          >
            <ChevronLeft size={13} className="text-gray-800" />
          </button>
          <button
            onClick={scrollNext}
            aria-label="Sonraki görsel"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7
              bg-white/92 backdrop-blur-sm rounded-full flex items-center justify-center
              shadow-md opacity-0 group-hover/card:opacity-100
              transition-all duration-200 hover:bg-white hover:shadow-lg active:scale-90"
          >
            <ChevronRight size={13} className="text-gray-800" />
          </button>
        </>
      )}

      {/* ── Dot indicators — always visible ── */}
      {p.images.length > 1 && (
        <div className="absolute bottom-2.5 left-0 right-0 z-20 flex justify-center gap-1.5 pointer-events-none">
          {p.images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === selected ? "w-4 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}

      {/* ── CTA overlay — appears on card hover ── */}
      <div
        className="absolute inset-0 z-10
          bg-gradient-to-t from-gray-950/88 via-gray-950/15 to-transparent
          opacity-0 group-hover/card:opacity-100 transition-opacity duration-300
          flex flex-col justify-end p-2.5 gap-1.5
          pointer-events-none group-hover/card:pointer-events-auto"
      >
        {/* ── Sepete Ekle area (3 phases) ── */}
        {cartPhase === "default" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (p.stock > 0) setCartPhase("sizing");
            }}
            disabled={p.stock === 0}
            className="w-full flex items-center justify-center gap-1.5 bg-gray-900/90 text-white
              text-[11px] font-semibold py-2 rounded-xl hover:bg-gray-800
              active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingBag size={11} />
            {p.stock > 0 ? "Sepete Ekle" : "Stokta Yok"}
          </button>
        )}

        {cartPhase === "sizing" && (
          <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[10px] font-semibold text-white/70 uppercase tracking-wider">
                Beden Seç
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setCartPhase("default"); }}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X size={13} />
              </button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {p.sizes.map((s) => (
                <button
                  key={s}
                  onClick={(e) => handleAddToCart(e, s)}
                  className="w-9 h-8 rounded-lg bg-white/15 hover:bg-white hover:text-gray-900
                    text-white font-sans text-[11px] font-semibold transition-all active:scale-90"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {cartPhase === "added" && (
          <div className="w-full flex items-center justify-center gap-1.5 bg-green-500 text-white
            text-[11px] font-semibold py-2 rounded-xl">
            <Check size={12} />
            Sepete Eklendi!
          </div>
        )}

        {/* ── Lead-capture buttons — always visible on hover ── */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (p.stock > 0) onCallBack(p);
          }}
          disabled={p.stock === 0}
          className="w-full flex items-center justify-center gap-1.5 bg-white text-gray-900
            text-[11px] font-semibold py-2.5 rounded-xl hover:bg-gray-50
            active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Phone size={11} />
          {p.stock > 0 ? "Beni Ara" : "Stokta Yok"}
        </button>
        <a
          href={`https://wa.me/905551234567?text=${encodeURIComponent(
            `Merhaba! ${p.name} hakkında bilgi almak istiyorum.`
          )}`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-full flex items-center justify-center gap-1.5 bg-[#25D366] text-white
            text-[11px] font-semibold py-2.5 rounded-xl hover:bg-[#22c55e]
            active:scale-95 transition-all"
        >
          <MessageCircle size={11} />
          WhatsApp
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CARD — uses CardCarousel internally
// ─────────────────────────────────────────────────────────────────────────────
function ProductCard({ product: p, onView, onCallBack }) {
  return (
    <article
      onClick={() => onView(p)}
      className="group/card relative bg-white rounded-2xl overflow-hidden cursor-pointer
        border border-gray-100 hover:border-gray-200
        transition-all duration-300 ease-out
        hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.09)]"
    >
      <CardCarousel product={p} onCallBack={onCallBack} />

      {/* Card info */}
      <div className="p-3">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
          {p.category}
        </p>
        <h3 className="font-sans text-[13px] font-semibold text-gray-900 leading-tight mb-2.5 line-clamp-2 min-h-[2.4em]">
          {p.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="font-sans text-[15px] font-bold text-gray-900">
            ₺{p.price.toLocaleString("tr-TR")}
          </span>
          {p.originalPrice && (
            <span className="font-sans text-[11px] text-gray-400 line-through">
              ₺{p.originalPrice.toLocaleString("tr-TR")}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL CAROUSEL — full-size Embla carousel for the product detail page
// ─────────────────────────────────────────────────────────────────────────────
function DetailCarousel({ images, name }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => emblaApi.off("select", onSelect);
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div>
      {/* Main carousel */}
      <div className="relative rounded-3xl overflow-hidden aspect-square bg-white mb-3.5 group">
        <div
          ref={emblaRef}
          className="overflow-hidden h-full cursor-grab active:cursor-grabbing"
          style={{ touchAction: "pan-y" }}
        >
          <div className="flex h-full select-none">
            {images.map((src, i) => (
              <div key={i} className="flex-[0_0_100%] min-w-0 h-full relative">
                <ProductImage src={src} alt={`${name} — ${i + 1}. açı`} />
              </div>
            ))}
          </div>
        </div>

        {/* Arrows */}
        <button
          onClick={scrollPrev}
          aria-label="Önceki görsel"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9
            bg-white/92 backdrop-blur-sm rounded-full flex items-center justify-center
            shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200
            hover:bg-white hover:shadow-lg active:scale-90"
        >
          <ChevronLeft size={16} className="text-gray-800" />
        </button>
        <button
          onClick={scrollNext}
          aria-label="Sonraki görsel"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9
            bg-white/92 backdrop-blur-sm rounded-full flex items-center justify-center
            shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200
            hover:bg-white hover:shadow-lg active:scale-90"
        >
          <ChevronRight size={16} className="text-gray-800" />
        </button>

        {/* Slide counter */}
        <div className="absolute bottom-4 right-4 z-10 bg-gray-900/60 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="font-sans text-xs font-semibold text-white">
            {selected + 1} / {images.length}
          </span>
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-2.5">
        {images.map((src, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            aria-label={`${i + 1}. görsele git`}
            className={`relative w-[72px] h-[72px] rounded-2xl overflow-hidden flex-shrink-0
              transition-all duration-200
              ${selected === i
                ? "ring-2 ring-gray-900 ring-offset-2"
                : "opacity-55 hover:opacity-100"
              }`}
          >
            <ProductImage src={src} alt={`Görsel ${i + 1}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVBAR — glassmorphism sticky
// ─────────────────────────────────────────────────────────────────────────────
function Navbar({ page, onNav }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { totalItems } = useCart();
  const router = useRouter();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links = [
    { key: "home", label: "Ana Sayfa" },
    { key: "catalog", label: "Ayakkabılar" },
  ];

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 backdrop-blur-xl ${
        scrolled
          ? "bg-white/95 border-b border-gray-100 shadow-[0_1px_24px_rgba(0,0,0,0.06)]"
          : "bg-white/70 border-b border-transparent"
      }`}
    >
      <div className="max-w-screen-xl mx-auto px-5 h-16 flex items-center justify-between">
        <button
          onClick={() => onNav("home")}
          className="flex items-baseline gap-0.5 cursor-pointer"
        >
          <span className="font-serif text-xl font-bold italic text-gray-900">Uygun</span>
          <span className="font-sans text-xl font-bold text-[#c8102e]">Ayakkabı</span>
        </button>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <button
              key={l.key}
              onClick={() => onNav(l.key)}
              className={`relative font-sans text-sm font-medium transition-colors duration-200 ${
                page === l.key ? "text-gray-900" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {l.label}
              {page === l.key && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#c8102e] rounded-full" />
              )}
            </button>
          ))}

          {/* Cart icon */}
          <button
            onClick={() => router.push("/cart")}
            aria-label="Sepet"
            className="relative p-1.5 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ShoppingBag size={20} />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#c8102e] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </button>

          <a
            href="tel:+905551234567"
            className="flex items-center gap-2 bg-gray-900 text-white text-xs font-semibold px-5 py-2.5 rounded-full hover:bg-[#c8102e] transition-colors duration-200"
          >
            <Phone size={13} />
            Bizi Ara
          </a>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {/* Cart icon mobile */}
          <button
            onClick={() => router.push("/cart")}
            aria-label="Sepet"
            className="relative p-1.5 text-gray-700"
          >
            <ShoppingBag size={20} />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#c8102e] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="p-1.5 text-gray-700"
            aria-label="Menüyü aç"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white/98 backdrop-blur-xl px-5 pb-6">
          <div className="flex flex-col gap-0.5 pt-1">
            {links.map((l) => (
              <button
                key={l.key}
                onClick={() => { onNav(l.key); setOpen(false); }}
                className="text-left font-sans text-base font-medium text-gray-800 py-3.5 border-b border-gray-50"
              >
                {l.label}
              </button>
            ))}
          </div>
          <a
            href="tel:+905551234567"
            className="mt-4 flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold py-3.5 rounded-2xl"
          >
            <Phone size={15} />
            Bizi Ara
          </a>
        </div>
      )}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY SHOWCASE — renkli kategori kartları
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_DATA = [
  {
    key: "Günlük",
    label: "Günlük",
    sub: "Rahat & Şık",
    emoji: "👟",
    gradient: "from-amber-400 to-orange-500",
    count: 7,
  },
  {
    key: "Klasik",
    label: "Klasik",
    sub: "Zarafet & Prestij",
    emoji: "👞",
    gradient: "from-slate-600 to-gray-800",
    count: 3,
  },
  {
    key: "Spor",
    label: "Spor",
    sub: "Performans & Güç",
    emoji: "🏃",
    gradient: "from-emerald-400 to-teal-600",
    count: 4,
  },
  {
    key: "Bot",
    label: "Bot",
    sub: "Güçlü & Dayanıklı",
    emoji: "🥾",
    gradient: "from-stone-500 to-amber-800",
    count: 3,
  },
  {
    key: "Sandalet",
    label: "Sandalet",
    sub: "Yaz Enerjisi",
    emoji: "🩴",
    gradient: "from-sky-400 to-blue-600",
    count: 2,
  },
  {
    key: "Krampon",
    label: "Krampon",
    sub: "Saha Performansı",
    emoji: "⚽",
    gradient: "from-green-500 to-emerald-700",
    count: 0,
  },
];

function CategoryShowcase({ onFilter }) {
  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-screen-xl mx-auto px-5">
        <div className="text-center mb-10">
          <span className="inline-block font-sans text-[11px] font-semibold uppercase tracking-widest text-[#c8102e] bg-red-50 px-4 py-1.5 rounded-full mb-4">
            Kategoriler
          </span>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900">
            Her Stile Uygun Ayakkabı
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORY_DATA.map((cat) => (
            <button
              key={cat.key}
              onClick={() => onFilter(cat.key)}
              className="group relative overflow-hidden rounded-3xl aspect-[3/4] flex flex-col items-center justify-end pb-5 px-3 cursor-pointer hover:-translate-y-1 transition-transform duration-300 shadow-md hover:shadow-xl"
            >
              {/* gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />
              {/* subtle pattern overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
              {/* big emoji */}
              <span className="relative text-6xl mb-3 drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                {cat.emoji}
              </span>
              <div className="relative text-center">
                <p className="font-sans text-base font-bold text-white leading-tight">{cat.label}</p>
                <p className="font-sans text-[11px] text-white/70 mt-0.5">{cat.sub}</p>
                <span className="inline-block mt-2 font-sans text-[10px] font-semibold text-white/60 bg-white/15 px-3 py-0.5 rounded-full">
                  {cat.count} Ürün
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUST STRIP
// ─────────────────────────────────────────────────────────────────────────────
function TrustStrip() {
  return (
    <div className="bg-gray-950 text-white">
      <div className="max-w-screen-xl mx-auto px-5 py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2.5">
          {TRUST.map(({ Icon, label, sub }, i) => (
            <div key={i} className="flex items-center justify-center gap-2.5">
              <Icon size={15} className="text-[#c8102e] flex-shrink-0" />
              <div>
                <p className="font-sans text-[11px] font-semibold leading-tight">{label}</p>
                <p className="font-sans text-[10px] text-gray-500 leading-tight">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL PROOF
// ─────────────────────────────────────────────────────────────────────────────
function SocialProof() {
  const stats = [
    { Icon: Users, number: "500+", label: "Mutlu Müşteri" },
    { Icon: ShieldCheck, number: "%100", label: "Orijinal Ürün" },
    { Icon: Truck, number: "1-3", label: "Gün Teslimat" },
    { Icon: Star, number: "4.9★", label: "Müşteri Puanı" },
  ];

  const statColors = [
    { bg: "from-red-500 to-rose-600",    icon: "text-white" },
    { bg: "from-emerald-500 to-teal-600", icon: "text-white" },
    { bg: "from-blue-500 to-indigo-600", icon: "text-white" },
    { bg: "from-amber-400 to-orange-500", icon: "text-white" },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-screen-xl mx-auto px-5">
        <div className="text-center mb-12">
          <span className="inline-block font-sans text-[11px] font-semibold uppercase tracking-widest text-[#c8102e] bg-red-50 px-4 py-1.5 rounded-full mb-5">
            Sosyal Kanıt
          </span>
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            500+ Mutlu Müşteri
          </h2>
          <p className="font-sans text-gray-500 text-base max-w-md mx-auto leading-relaxed">
            Kaliteye güvenen müşterilerimizin deneyimlerine katılın.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ Icon, number, label }, i) => (
            <div
              key={i}
              className="rounded-3xl p-6 md:p-8 text-center hover:scale-105 transition-all duration-200 shadow-md hover:shadow-xl overflow-hidden relative bg-gradient-to-br"
              style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${statColors[i].bg} opacity-100`} />
              <div className="relative">
                <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon size={20} className="text-white" />
                </div>
                <p className="font-serif text-3xl md:text-4xl font-bold text-white mb-1">{number}</p>
                <p className="font-sans text-xs font-semibold text-white/80">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WHY US
// ─────────────────────────────────────────────────────────────────────────────
function WhyUs() {
  const items = [
    { Icon: Truck, title: "Hızlı Kargo", desc: "Siparişleriniz 1-3 iş günü içinde kapınıza teslim edilir.", gradient: "from-blue-500 to-indigo-600", bg: "bg-blue-50" },
    { Icon: ShieldCheck, title: "Uygun Fiyat", desc: "Piyasanın altında fiyatlarla %100 orijinal ürünler garantisi.", gradient: "from-emerald-500 to-teal-600", bg: "bg-emerald-50" },
    { Icon: Users, title: "Müşteri Memnuniyeti", desc: "Binlerce mutlu müşteri ve %100 iade garantisiyle güvenli alışveriş.", gradient: "from-amber-400 to-orange-500", bg: "bg-amber-50" },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-screen-xl mx-auto px-5">
        <div className="text-center mb-12">
          <span className="inline-block font-sans text-[11px] font-semibold uppercase tracking-widest text-[#c8102e] bg-red-50 px-4 py-1.5 rounded-full mb-5">
            Neden Biz?
          </span>
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-gray-900">Farkımız</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map(({ Icon, title, desc, gradient, bg }, i) => (
            <div
              key={i}
              className={`${bg} rounded-3xl p-8 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/30 rounded-full -translate-x-8 -translate-y-8 pointer-events-none" />
              <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                <Icon size={20} className="text-white" />
              </div>
              <h3 className="font-sans text-base font-bold text-gray-900 mb-2.5">{title}</h3>
              <p className="font-sans text-sm text-gray-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA BANNER
// ─────────────────────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section className="px-5 pb-20 max-w-screen-xl mx-auto">
      <div className="bg-gray-950 rounded-3xl px-8 md:px-16 py-14 md:py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,16,46,0.18)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(200,16,46,0.06)_0%,transparent_60%)] pointer-events-none" />
        <div className="relative">
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Aradığınız modeli
            <br />
            <em>bulamadınız mı?</em>
          </h2>
          <p className="font-sans text-gray-400 text-sm md:text-base mb-10 max-w-sm mx-auto leading-relaxed">
            Bize ulaşın, istediğiniz ayakkabıyı sizin için bulalım.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href="tel:+905551234567"
              className="flex items-center gap-2 bg-white text-gray-900 text-sm font-semibold px-7 py-3.5 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
            >
              <Phone size={15} />0555 123 45 67
            </a>
            <a
              href="https://wa.me/905551234567"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-[#25D366] text-white text-sm font-semibold px-7 py-3.5 rounded-full hover:bg-[#22c55e] active:scale-95 transition-all"
            >
              <MessageCircle size={15} />WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function Footer({ onNav }) {
  return (
    <footer className="bg-gray-950 text-white">
      <div className="max-w-screen-xl mx-auto px-5 pt-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 pb-10 border-b border-gray-800">
          <div className="md:col-span-1">
            <div className="flex items-baseline gap-0.5 mb-4">
              <span className="font-serif text-lg font-bold italic">Uygun</span>
              <span className="font-sans text-lg font-bold text-[#c8102e]">Ayakkabı</span>
            </div>
            <p className="font-sans text-sm text-gray-500 leading-relaxed max-w-[200px]">
              Kaliteli ayakkabılar, uygun fiyatlar. %100 orijinal ürünler.
            </p>
          </div>
          <div>
            <h5 className="font-sans text-[11px] font-semibold uppercase tracking-widest text-gray-600 mb-4">
              Sayfalar
            </h5>
            {[{ key: "home", label: "Ana Sayfa" }, { key: "catalog", label: "Ayakkabılar" }].map((l) => (
              <button
                key={l.key}
                onClick={() => onNav(l.key)}
                className="block font-sans text-sm text-gray-400 hover:text-white transition-colors mb-3"
              >
                {l.label}
              </button>
            ))}
          </div>
          <div>
            <h5 className="font-sans text-[11px] font-semibold uppercase tracking-widest text-gray-600 mb-4">
              İletişim
            </h5>
            <p className="font-sans text-sm text-gray-400 leading-loose">
              0555 123 45 67<br />info@uygunayakkabi.com<br />İstanbul, Türkiye
            </p>
          </div>
          <div>
            <h5 className="font-sans text-[11px] font-semibold uppercase tracking-widest text-gray-600 mb-4">
              Sosyal Medya
            </h5>
            <div className="flex flex-col gap-3">
              {["Instagram", "WhatsApp", "TikTok"].map((s) => (
                <span key={s} className="font-sans text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="py-5 flex justify-between items-center flex-wrap gap-2">
          <p className="font-sans text-xs text-gray-600">© 2025 UygunAyakkabı — Tüm hakları saklıdır.</p>
          <p className="font-sans text-xs text-gray-600">uygunayakkabi.com</p>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUY FORM — lead capture modal
// ─────────────────────────────────────────────────────────────────────────────
function BuyForm({ product: p, onClose }) {
  const [form, setForm] = useState({ name: "", phone: "", city: "" });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const fields = [
    { key: "name", label: "Ad Soyad", placeholder: "Adınız ve soyadınız", type: "text" },
    { key: "phone", label: "Telefon", placeholder: "05XX XXX XX XX", type: "tel" },
    { key: "city", label: "Şehir", placeholder: "Bulunduğunuz şehir", type: "text" },
  ];

  const submit = () => {
    const e = {};
    if (!form.name.trim()) e.name = true;
    if (form.phone.replace(/\D/g, "").length < 10) e.phone = true;
    if (!form.city.trim()) e.city = true;
    setErrors(e);
    if (!Object.keys(e).length) setSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl p-8 w-full max-w-md shadow-[0_40px_80px_rgba(0,0,0,0.3)] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 transition-colors w-9 h-9 rounded-full flex items-center justify-center text-gray-600"
        >
          <X size={17} />
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Check size={30} className="text-green-600" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-gray-900 mb-2">Talebiniz Alındı!</h3>
            <p className="font-sans text-gray-500 text-sm leading-relaxed mb-7">
              Ekibimiz en kısa sürede sizi arayacak.
            </p>
            <button
              onClick={onClose}
              className="font-sans text-sm font-semibold bg-gray-900 text-white px-8 py-3 rounded-2xl hover:bg-[#c8102e] transition-colors"
            >
              Tamam
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-4 mb-6 p-4 bg-gray-50 rounded-2xl">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                <ProductImage src={p.images[0]} alt={p.name} />
              </div>
              <div>
                <p className="font-sans text-sm font-semibold text-gray-900 line-clamp-1">{p.name}</p>
                <p className="font-sans text-lg font-bold text-[#c8102e] mt-0.5">
                  ₺{p.price.toLocaleString("tr-TR")}
                </p>
              </div>
            </div>

            <h3 className="font-serif text-xl font-bold text-gray-900 mb-1">Geri Arama Talebi</h3>
            <p className="font-sans text-sm text-gray-500 mb-6">
              Bilgilerinizi bırakın, sizi hemen arayalım.
            </p>

            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block font-sans text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={(e) => {
                      setForm({ ...form, [f.key]: e.target.value });
                      setErrors({ ...errors, [f.key]: false });
                    }}
                    className={`w-full px-4 py-3.5 rounded-xl border-2 font-sans text-sm outline-none transition-colors focus:border-gray-900 placeholder:text-gray-300 ${
                      errors[f.key] ? "border-[#c8102e]" : "border-gray-200"
                    }`}
                  />
                  {errors[f.key] && (
                    <p className="font-sans text-xs text-[#c8102e] mt-1.5">Bu alan zorunludur.</p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={submit}
              className="w-full mt-6 bg-[#c8102e] text-white font-sans text-base font-semibold py-4 rounded-2xl hover:bg-[#a50d26] active:scale-[0.98] transition-all"
            >
              Geri Arama İste
            </button>
            <p className="font-sans text-[11px] text-gray-400 text-center mt-3">
              Bilgileriniz yalnızca sipariş teyidi için kullanılır.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING WHATSAPP WIDGET
// ─────────────────────────────────────────────────────────────────────────────
function FloatingWA() {
  return (
    <a
      href="https://wa.me/905551234567?text=Merhaba!"
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp ile Yaz"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5
        bg-[#25D366] text-white rounded-full
        shadow-[0_8px_32px_rgba(37,211,102,0.4)]
        py-3.5 pl-4 pr-5
        hover:shadow-[0_12px_40px_rgba(37,211,102,0.55)]
        hover:-translate-y-0.5 transition-all duration-300"
    >
      <MessageCircle size={21} className="flex-shrink-0" />
      <span className="font-sans text-sm font-semibold whitespace-nowrap">WhatsApp</span>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────
function HomePage({ onNav, onView, onCallBack, onCategoryFilter, allProducts = [] }) {
  return (
    <div>
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center bg-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_75%_40%,#fef2f2,transparent)] pointer-events-none" />
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-amber-100 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-20 right-0 w-80 h-80 bg-gradient-to-tl from-blue-50 to-transparent rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div className="relative max-w-screen-xl mx-auto px-5 w-full pt-28 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <span className="inline-flex items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-widest text-[#c8102e] bg-red-50 px-4 py-2 rounded-full mb-7">
              <Zap size={10} />
              Yeni Sezon 2025
            </span>
            <h1 className="font-serif text-[clamp(44px,6vw,80px)] font-bold text-gray-900 leading-[1.02] mb-5">
              Kaliteli
              <br />
              <em>Ayakkabılar,</em>
              <br />
              <span className="font-sans font-light text-[clamp(28px,3.5vw,52px)] text-gray-400">
                Uygun Fiyatlar
              </span>
            </h1>
            <p className="font-sans text-base text-gray-500 leading-relaxed mb-8 max-w-[380px]">
              En popüler markaların en iyi modelleri, piyasanın altında fiyatlarla.
              Beğendiğiniz ayakkabıyı seçin, biz sizi arayalım.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <button
                onClick={() => onNav("catalog")}
                className="flex items-center gap-2.5 bg-[#c8102e] text-white font-sans text-sm font-semibold px-7 py-4 rounded-full hover:bg-[#a50d26] active:scale-95 transition-all"
              >
                Ayakkabıları Keşfet <ArrowRight size={15} />
              </button>
              <a
                href="tel:+905551234567"
                className="flex items-center gap-2.5 bg-white text-gray-900 font-sans text-sm font-semibold px-7 py-4 rounded-full border-2 border-gray-200 hover:border-gray-400 active:scale-95 transition-all"
              >
                <Phone size={14} />Hemen Ara
              </a>
            </div>
            <div className="flex flex-wrap gap-5">
              {TRUST.slice(0, 3).map(({ label }, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Check size={13} className="text-green-500 flex-shrink-0" />
                  <span className="font-sans text-xs text-gray-500 font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="rounded-3xl overflow-hidden aspect-[4/5] bg-gray-100 shadow-[0_48px_96px_rgba(0,0,0,0.14)]">
              <Image src={heroImg} alt="Featured" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" priority />
            </div>
            {allProducts.length > 0 && (
            <div
              onClick={() => onView(allProducts[0])}
              className="absolute -bottom-5 -left-6 bg-white rounded-2xl px-4 py-3.5 shadow-[0_24px_56px_rgba(0,0,0,0.13)] flex items-center gap-3 cursor-pointer hover:-translate-y-0.5 transition-transform"
            >
              <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                <ProductImage src={allProducts[0].images[0]} alt={allProducts[0].name} />
              </div>
              <div>
                <p className="font-sans text-xs font-semibold text-gray-900 max-w-[130px] truncate">
                  {allProducts[0].name}
                </p>
                <p className="font-sans text-sm font-bold text-[#c8102e] mt-0.5">
                  ₺{allProducts[0].price.toLocaleString("tr-TR")}
                </p>
              </div>
            </div>
            )}
            <div className="absolute top-8 -right-6 bg-white rounded-2xl px-5 py-4 shadow-[0_20px_48px_rgba(0,0,0,0.1)] text-center">
              <p className="font-serif text-2xl font-bold text-[#c8102e]">500+</p>
              <p className="font-sans text-[11px] font-medium text-gray-500 mt-0.5">Mutlu Müşteri</p>
            </div>
          </div>
        </div>
      </section>

      <TrustStrip />

      {/* ── CATEGORY SHOWCASE ── */}
      <CategoryShowcase onFilter={(cat) => { onCategoryFilter(cat); onNav("catalog"); }} />

      {/* ── ALL PRODUCTS — 10 items = 2 perfect rows of 5 ── */}
      <section className="py-20 max-w-screen-xl mx-auto px-5">
        <div className="flex justify-between items-end mb-10 flex-wrap gap-4">
          <div>
            <span className="font-sans text-[11px] font-semibold uppercase tracking-widest text-[#c8102e] mb-3 block">
              Koleksiyon
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-gray-900">Çok Satanlar</h2>
          </div>
          <button
            onClick={() => onNav("catalog")}
            className="flex items-center gap-1.5 font-sans text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            Tümünü Gör <ArrowRight size={14} />
          </button>
        </div>

        {/* Exactly 5 columns on xl+, balanced 2 full rows of 5 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allProducts.slice(0, 10).map((p) => (
            <ProductCard key={p.id} product={p} onView={onView} onCallBack={onCallBack} />
          ))}
        </div>
      </section>

      <SocialProof />
      <WhyUs />
      <CTABanner />
      <Footer onNav={onNav} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG PAGE
// ─────────────────────────────────────────────────────────────────────────────
function CatalogPage({ onView, onCallBack, initialFilter, allProducts = [] }) {
  const [filter, setFilter] = useState(initialFilter || "Tümü");
  const categories = ["Tümü", "Günlük", "Klasik", "Spor", "Bot", "Sandalet", "Krampon"];
  const filtered = filter === "Tümü" ? allProducts : allProducts.filter((p) => p.category === filter);

  return (
    <div className="pt-16">
      <section className="max-w-screen-xl mx-auto px-5 py-12 pb-24">
        <div className="mb-8">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-widest text-[#c8102e] mb-3 block">
            Koleksiyon
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 mb-2">Ayakkabılar</h1>
          <p className="font-sans text-sm text-gray-500">{filtered.length} ürün listeleniyor</p>
        </div>

        <div className="flex gap-2 mb-10 flex-wrap">
          {categories.map((c) => {
            const catInfo = CATEGORY_DATA.find((x) => x.key === c);
            const isActive = filter === c;
            return (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`font-sans text-xs font-semibold px-5 py-2.5 rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? "bg-gray-900 text-white shadow-sm scale-105"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {catInfo && <span>{catInfo.emoji}</span>}
                {c}
              </button>
            );
          })}
        </div>

        {/* 5 columns on xl+, 2 on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.length > 0 ? (
            filtered.map((p) => (
              <ProductCard key={p.id} product={p} onView={onView} onCallBack={onCallBack} />
            ))
          ) : (
            <div className="col-span-full text-center py-20 text-gray-400 font-sans text-sm">
              Bu kategoride ürün bulunamadı.
            </div>
          )}
        </div>
      </section>
      <Footer onNav={() => {}} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL PAGE
// ─────────────────────────────────────────────────────────────────────────────
function DetailPage({ product: p, onBack, onCallBack }) {
  const [size, setSize] = useState(null);
  const [cartAdded, setCartAdded] = useState(false);
  const { dispatch } = useCart();

  const handleAddToCart = () => {
    if (!size || p.stock === 0) return;
    dispatch({ type: "ADD", product: p, size, qty: 1 });
    setCartAdded(true);
    setTimeout(() => setCartAdded(false), 2000);
  };

  const stockStatus =
    p.stock === 0
      ? { label: "Stokta Yok", dot: "bg-[#c8102e]", pill: "text-[#c8102e] bg-red-50" }
      : p.stock <= 3
      ? { label: `Son ${p.stock} adet!`, dot: "bg-amber-500", pill: "text-amber-700 bg-amber-50" }
      : { label: "Stokta", dot: "bg-green-500", pill: "text-green-700 bg-green-50" };

  return (
    <div className="pt-16">
      <section className="max-w-screen-xl mx-auto px-5 py-10 pb-24">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 font-sans text-sm text-gray-500 hover:text-gray-900 transition-colors mb-10 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Ayakkabılar
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
          {/* Embla carousel with thumbnail strip */}
          <DetailCarousel images={p.images} name={p.name} />

          {/* Info */}
          <div className="py-2">
            <p className="font-sans text-xs font-semibold uppercase tracking-widest text-[#c8102e] mb-3">
              {p.category}
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
              {p.name}
            </h1>

            <div className="flex items-center gap-4 mb-5">
              <span className="font-sans text-3xl font-bold text-gray-900">
                ₺{p.price.toLocaleString("tr-TR")}
              </span>
              {p.originalPrice && (
                <>
                  <span className="font-sans text-lg text-gray-400 line-through">
                    ₺{p.originalPrice.toLocaleString("tr-TR")}
                  </span>
                  <span className="font-sans text-sm font-bold text-[#c8102e] bg-red-50 px-3 py-1 rounded-full">
                    %{Math.round((1 - p.price / p.originalPrice) * 100)} İndirim
                  </span>
                </>
              )}
            </div>

            <p className="font-sans text-sm text-gray-500 leading-relaxed mb-6 max-w-[480px]">
              {p.description}
            </p>

            <div className={`inline-flex items-center gap-2 ${stockStatus.pill} px-4 py-2 rounded-full mb-8`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${stockStatus.dot}`} />
              <span className="font-sans text-xs font-semibold">{stockStatus.label}</span>
            </div>

            <div className="mb-8">
              <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Beden {size && <span className="text-gray-900">— {size}</span>}
              </p>
              <div className="flex gap-2 flex-wrap">
                {p.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`w-12 h-12 rounded-xl font-sans text-sm font-semibold transition-all duration-150 border-2 ${
                      size === s
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* Primary: Sepete Ekle */}
              <button
                onClick={handleAddToCart}
                disabled={p.stock === 0}
                className={`flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-sans text-base font-semibold transition-all active:scale-[0.98] ${
                  p.stock === 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : cartAdded
                    ? "bg-green-500 text-white"
                    : !size
                    ? "bg-gray-900 text-white hover:bg-gray-700"
                    : "bg-[#c8102e] text-white hover:bg-[#a50d26]"
                }`}
              >
                {cartAdded ? (
                  <><Check size={17} />Sepete Eklendi!</>
                ) : p.stock === 0 ? (
                  <><ShoppingBag size={17} />Stokta Yok</>
                ) : !size ? (
                  <><ShoppingBag size={17} />Önce Beden Seçin</>
                ) : (
                  <><ShoppingBag size={17} />Sepete Ekle — {size}</>
                )}
              </button>

              {/* Secondary: lead-capture row */}
              <div className="flex gap-2.5">
                <button
                  onClick={() => p.stock > 0 && onCallBack(p)}
                  disabled={p.stock === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white border-2 border-gray-200 text-gray-700 font-sans text-sm font-semibold hover:border-gray-400 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Phone size={15} />
                  Beni Ara
                </button>
                <a
                  href={`https://wa.me/905551234567?text=${encodeURIComponent(
                    `Merhaba! ${p.name} hakkında bilgi almak istiyorum.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white border-2 border-[#25D366] text-[#25D366] font-sans text-sm font-semibold hover:bg-[#25D366] hover:text-white active:scale-[0.98] transition-all"
                >
                  <MessageCircle size={15} />WhatsApp
                </a>
              </div>
            </div>

            <div className="flex gap-6 mt-8 pt-8 border-t border-gray-100 flex-wrap">
              {["Orijinal Ürün", "Hızlı Kargo", "İade Garantisi"].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <Check size={13} className="text-green-500 flex-shrink-0" />
                  <span className="font-sans text-xs font-medium text-gray-500">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <Footer onNav={() => {}} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP — root
// ─────────────────────────────────────────────────────────────────────────────
export default function App({ dbProducts = [] }) {
  const [page, setPage] = useState("home");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [callbackProduct, setCallbackProduct] = useState(null);
  const [catalogFilter, setCatalogFilter] = useState("Tümü");

  // DB ürünleri önde, statik ürünler arkada
  const allProducts = dbProducts.length > 0
    ? [...dbProducts, ...products]
    : products;

  const navigate = (pg) => {
    setPage(pg);
    if (pg !== "detail") setSelectedProduct(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const viewProduct = (product) => {
    setSelectedProduct(product);
    setPage("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openCatalogWithFilter = (cat) => {
    setCatalogFilter(cat);
    setPage("catalog");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar page={page} onNav={navigate} />

      {callbackProduct && (
        <BuyForm product={callbackProduct} onClose={() => setCallbackProduct(null)} />
      )}

      <FloatingWA />

      {page === "home" && (
        <HomePage
          onNav={navigate}
          onView={viewProduct}
          onCallBack={setCallbackProduct}
          onCategoryFilter={openCatalogWithFilter}
          allProducts={allProducts}
        />
      )}
      {page === "catalog" && (
        <CatalogPage
          onView={viewProduct}
          onCallBack={setCallbackProduct}
          initialFilter={catalogFilter}
          allProducts={allProducts}
        />
      )}
      {page === "detail" && selectedProduct && (
        <DetailPage
          product={selectedProduct}
          onBack={() => navigate("catalog")}
          onCallBack={setCallbackProduct}
        />
      )}
    </div>
  );
}
