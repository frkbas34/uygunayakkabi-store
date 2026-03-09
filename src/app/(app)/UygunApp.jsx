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
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><defs><radialGradient id="g1" cx="30%" cy="30%"><stop offset="0%" stop-color="${acc}" stop-opacity="0.08"/><stop offset="100%" stop-color="${acc}" stop-opacity="0"/></radialGradient></defs><rect width="800" height="800" fill="${bg}"/><rect width="800" height="800" fill="url(#g1)"/><g transform="translate(400,400) rotate(${rot}) scale(1.15)"><path d="M-220,80Q-220,110-180,120L200,120Q240,120,250,95L260,60Q260,45,240,40L-180,40Q-220,45-220,80Z" fill="${sole}"/><path d="M-180,120Q-180,138-145,142L195,142Q235,142,245,125L250,95Q240,120,200,120L-180,120Z" fill="${sole}" opacity="0.4"/><path d="M-200,48Q-210,68-190,78L230,78Q250,73,255,53L250,33Q245,23,230,23L-175,23Q-200,28-200,48Z" fill="white" opacity="0.88"/><ellipse cx="185" cy="52" rx="38" ry="20" fill="${acc}" opacity="0.18"/><ellipse cx="-120" cy="52" rx="30" ry="16" fill="${acc}" opacity="0.1"/><path d="M-180,28Q-200,8-195,-42Q-185,-102-140,-132Q-80,-172,20,-177Q120,-180,180,-152Q230,-127,245,-72Q255,-27,245,13L240,23L-175,23Q-185,26-180,28Z" fill="${body}"/><path d="M60,-165Q140,-160,185,-135Q225,-112,240,-65Q250,-25,245,13L170,13Q178,-22,162,-58Q140,-100,85,-128Q30,-150-25,-148Z" fill="white" opacity="0.09"/><path d="M-150,-45Q-70,-92,50,-87Q145,-82,210,-38" fill="none" stroke="${lace}" stroke-width="6" stroke-linecap="round" opacity="0.6"/><path d="M-130,-60Q-50,-105,60,-100Q155,-95,218,-52" fill="none" stroke="${lace}" stroke-width="5" stroke-linecap="round" opacity="0.4"/><ellipse cx="-150" cy="35" rx="18" ry="12" fill="${acc}" opacity="0.5"/><ellipse cx="150" cy="35" rx="18" ry="12" fill="${acc}" opacity="0.5"/></g></svg>`)}`;
}

const heroImg = shoe("#f0f0f0", "#222", "#c8102e", "#fff", "#fff", -8);

// ============================================
// REAL PRODUCT PHOTOS (Unsplash — free commercial use)
// ============================================
const PHOTO = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&h=600&fit=crop&q=80",
];
// Rotate photos across products
const ph = (i) => PHOTO[i % PHOTO.length];

// ============================================
// SVG WALLET GENERATOR
// ============================================
function wallet(bg, leather, accent, stitch) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><rect width="800" height="800" fill="${bg}"/><g transform="translate(400,400)"><rect x="-200" y="-140" width="400" height="280" rx="24" fill="${leather}"/><rect x="-200" y="-140" width="400" height="280" rx="24" fill="none" stroke="${stitch}" stroke-width="3" stroke-dasharray="8,6" opacity="0.4"/><rect x="-180" y="-120" width="360" height="240" rx="16" fill="${leather}" opacity="0.85"/><line x1="-180" y1="-20" x2="180" y2="-20" stroke="${stitch}" stroke-width="2" stroke-dasharray="6,4" opacity="0.3"/><rect x="100" y="-80" width="90" height="60" rx="12" fill="${accent}"/><rect x="110" y="-70" width="70" height="40" rx="8" fill="none" stroke="${bg}" stroke-width="2" opacity="0.5"/><circle cx="145" cy="-50" r="10" fill="${bg}" opacity="0.3"/><rect x="-170" y="20" width="120" height="8" rx="4" fill="${stitch}" opacity="0.15"/><rect x="-170" y="40" width="80" height="8" rx="4" fill="${stitch}" opacity="0.1"/><rect x="-170" y="60" width="100" height="8" rx="4" fill="${stitch}" opacity="0.08"/></g></svg>`)}`;
}

const WALLET_PHOTOS = [
  "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1624996379697-f01d168b1a52?w=600&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1559526324-593bc073d938?w=600&h=600&fit=crop&q=80",
];

// ============================================
// STATIC PRODUCT DATA (39 products — shoes + wallets)
// ============================================
const STATIC_PRODUCTS = [
  { id: 1, slug: "nike-air-max-270", name: "Nike Air Max 270", price: 2499, originalPrice: 3299, description: "Gün boyu konfor sunan Air Max 270, büyük Air ünitesiyle her adımda maksimum yastıklama sağlar.", image: ph(0), images: [ph(0),ph(1),shoe("#eef2f7","#222","#a8071a","#fff","#ddd",-12)], sizes:[38,39,40,41,42,43,44], stock:3, category:"Spor", badge:"İndirim" },
  { id: 2, slug: "adidas-ultraboost-23", name: "Adidas Ultraboost 23", price: 2899, originalPrice: null, description: "Efsanevi Boost teknolojisiyle enerji iade eden taban yapısı. Koşu ve günlük kullanım için ideal.", image: ph(1), images: [ph(1),ph(2),shoe("#f0f0f0","#ccc","#111","#48cae4","#aaa",-10)], sizes:[39,40,41,42,43], stock:8, category:"Spor", badge:"Yeni" },
  { id: 3, slug: "new-balance-574", name: "New Balance 574", price: 1899, originalPrice: 2499, description: "Zamansız tasarım ve ENCAP yastıklama sistemiyle hem şık hem rahat bir klasik.", image: ph(2), images: [ph(2),ph(3),shoe("#faf6f1","#9a8568","#415a77","#f4845f","#ddd",-14)], sizes:[38,39,40,41,42], stock:2, category:"Günlük", badge:"İndirim" },
  { id: 4, slug: "puma-rs-x", name: "Puma RS-X", price: 1699, originalPrice: null, description: "Retro koşu estetiği ile modern teknolojiyi buluşturan cesur ve renkli bir sneaker.", image: ph(3), images: [ph(3),ph(4),shoe("#f0f0ff","#5b52e0","#fff","#ec4899","#5b52e0",-11)], sizes:[40,41,42,43,44,45], stock:5, category:"Spor", badge:null },
  { id: 5, slug: "converse-chuck-70", name: "Converse Chuck 70", price: 1299, originalPrice: 1599, description: "Premium materyaller ve geliştirilmiş taban ile ikonik Chuck Taylor'ın üst seviye versiyonu.", image: ph(4), images: [ph(4),ph(0),shoe("#f8f7f4","#f5ecd0","#333","#dc2626","#ddd",-15)], sizes:[36,37,38,39,40,41,42], stock:12, category:"Günlük", badge:"İndirim" },
  { id: 6, slug: "nike-dunk-low", name: "Nike Dunk Low Retro", price: 2199, originalPrice: null, description: "Basketbol kökenli bu ikon, sokak modasının vazgeçilmezi olarak geri döndü.", image: ph(0), images: [ph(0),ph(2),shoe("#f5faf7","#365e45","#fff","#52b788","#365e45",-13)], sizes:[39,40,41,42,43], stock:0, category:"Günlük", badge:"Tükendi" },
  { id: 7, slug: "nike-air-force-1", name: "Nike Air Force 1 '07", price: 2299, originalPrice: 2799, description: "Efsanevi Air Force 1, klasik beyaz deri üst yapısıyla zamansız bir ikon.", image: ph(1), images: [ph(1),ph(3),shoe("#f0f0f0","#ccc","#fff","#aaa","#bbb",-10)], sizes:[38,39,40,41,42,43,44,45], stock:15, category:"Günlük", badge:"İndirim" },
  { id: 8, slug: "adidas-samba-og", name: "Adidas Samba OG", price: 1999, originalPrice: null, description: "Futsal efsanesi Samba, retro tarzıyla sokak stilinin vazgeçilmezi.", image: ph(2), images: [ph(2),ph(4),shoe("#faf8f2","#deb978","#111","#d4ad5e","#ddd",-12)], sizes:[38,39,40,41,42,43], stock:7, category:"Günlük", badge:"Yeni" },
  { id: 9, slug: "nike-vapormax-plus", name: "Nike Air VaporMax Plus", price: 3499, originalPrice: 3999, description: "VaporMax hava yastığı teknolojisi ile yere basmadan yürüme hissi.", image: ph(3), images: [ph(3),ph(0),shoe("#f2f2f8","#2a2a2a","#111","#8b5cf6","#bbb",-11)], sizes:[40,41,42,43,44], stock:4, category:"Spor", badge:"İndirim" },
  { id: 10, slug: "reebok-classic-leather", name: "Reebok Classic Leather", price: 1399, originalPrice: null, description: "80'lerden bugüne ulaşan sade tasarım ve yumuşak deri üst yüzey.", image: ph(4), images: [ph(4),ph(1),shoe("#fcfaf7","#f0e4cc","#fff","#d4b88a","#ddd",-13)], sizes:[38,39,40,41,42,43], stock:10, category:"Günlük", badge:null },
  { id: 11, slug: "adidas-stan-smith", name: "Adidas Stan Smith", price: 1799, originalPrice: 2199, description: "Tenis kökenli minimalist tasarımıyla dünyanın en çok satan sneaker'ı.", image: ph(0), images: [ph(0),ph(3),shoe("#f8fbf8","#ccc","#fff","#22c55e","#ddd",-12)], sizes:[36,37,38,39,40,41,42,43], stock:9, category:"Günlük", badge:"İndirim" },
  { id: 12, slug: "nike-pegasus-41", name: "Nike Pegasus 41", price: 2699, originalPrice: null, description: "Her gün koşmak isteyenler için React köpük yastıklama ve nefes alan üst yapı.", image: ph(1), images: [ph(1),ph(4),shoe("#f3f7fc","#333","#0088c4","#48cae4","#ddd",-14)], sizes:[39,40,41,42,43,44,45], stock:6, category:"Spor", badge:"Yeni" },
  { id: 13, slug: "puma-suede-classic", name: "Puma Suede Classic", price: 1499, originalPrice: 1799, description: "1968'den beri süet modanın sembolü. B-boy kültürünün temel taşı.", image: ph(2), images: [ph(2),ph(0),shoe("#faf3f3","#f5ecd0","#9c1f33","#deb978","#ddd",-13)], sizes:[38,39,40,41,42,43], stock:3, category:"Günlük", badge:"İndirim" },
  { id: 14, slug: "adidas-gazelle-bold", name: "Adidas Gazelle Bold", price: 2099, originalPrice: null, description: "Platform tabanlı Gazelle, kalın taban ile retro tarzı modernize ediyor.", image: ph(3), images: [ph(3),ph(1),shoe("#fcf7fa","#f0c4d8","#333","#e91e8c","#ddd",-10)], sizes:[36,37,38,39,40,41], stock:5, category:"Günlük", badge:"Yeni" },
  { id: 15, slug: "nike-air-max-90", name: "Nike Air Max 90", price: 2599, originalPrice: 3099, description: "90'ların ikonik koşu ayakkabısı, infrared aksan rengiyle kült klasik.", image: ph(4), images: [ph(4),ph(2),shoe("#f0f0f0","#444","#ccc","#ff5555","#ddd",-14)], sizes:[39,40,41,42,43,44], stock:2, category:"Spor", badge:"İndirim" },
  { id: 16, slug: "vans-old-skool", name: "Vans Old Skool", price: 1199, originalPrice: null, description: "Jazz stripe detayıyla skate kültürünün sembolü olan efsanevi silüet.", image: ph(0), images: [ph(0),ph(4),shoe("#f8f7f4","#f5ecd0","#111","#ddd","#ddd",-12)], sizes:[36,37,38,39,40,41,42,43,44], stock:20, category:"Günlük", badge:null },
  { id: 17, slug: "nb-530", name: "New Balance 530", price: 2199, originalPrice: 2699, description: "2000'lerin koşu teknolojisi ABZORB ile retro-futuristik bir sneaker.", image: ph(1), images: [ph(1),ph(3),shoe("#fafafa","#e0e0e0","#eee","#8d9ba8","#ddd",-13)], sizes:[38,39,40,41,42,43], stock:8, category:"Spor", badge:"İndirim" },
  { id: 18, slug: "asics-gel-1130", name: "Asics Gel-1130", price: 2399, originalPrice: null, description: "Y2K trendinin gözdesi, GEL teknolojili retro koşu modeli.", image: ph(2), images: [ph(2),ph(0),shoe("#f8f8fb","#cccccc","#f0f0f0","#9999dd","#eee",-11)], sizes:[39,40,41,42,43,44], stock:6, category:"Spor", badge:"Yeni" },
  { id: 19, slug: "converse-run-star", name: "Converse Run Star Hike", price: 1699, originalPrice: 2099, description: "Klasik Chuck Taylor'ı platform taban ve modern detaylarla yeniden yorumluyor.", image: ph(3), images: [ph(3),ph(1),shoe("#f8f7f4","#111","#444","#dc2626","#ddd",-15)], sizes:[36,37,38,39,40,41,42], stock:4, category:"Günlük", badge:"İndirim" },
  { id: 20, slug: "nike-blazer-mid-77", name: "Nike Blazer Mid '77", price: 1899, originalPrice: null, description: "70'lerin basketbol sahalarından sokağa inen vintage bir ikon.", image: ph(4), images: [ph(4),ph(2),shoe("#f0f0f0","#f5ecd0","#fff","#dc2626","#dc2626",-12)], sizes:[38,39,40,41,42,43,44], stock:11, category:"Günlük", badge:null },
  { id: 21, slug: "adidas-nmd-r1", name: "Adidas NMD R1", price: 2599, originalPrice: 3199, description: "Boost tabanlı şehir koşucusu, hafif yapısı ve şık tasarımıyla öne çıkıyor.", image: ph(0), images: [ph(0),ph(4),shoe("#f5f5f5","#111","#2a2a2a","#dc2626","#ddd",-11)], sizes:[39,40,41,42,43,44], stock:3, category:"Spor", badge:"İndirim" },
  { id: 22, slug: "puma-palermo", name: "Puma Palermo", price: 1599, originalPrice: null, description: "İtalyan terrace kültüründen ilham alan süet retro sneaker.", image: ph(1), images: [ph(1),ph(3),shoe("#f3f7fc","#ddd5b0","#4d7aaa","#d4b458","#ddd",-13)], sizes:[38,39,40,41,42,43], stock:9, category:"Günlük", badge:"Yeni" },
  { id: 23, slug: "nb-2002r", name: "New Balance 2002R", price: 2899, originalPrice: 3399, description: "N-ergy yastıklama ve premium süet yapıyla lüks koşu konforu.", image: ph(2), images: [ph(2),ph(0),shoe("#faf5f0","#9a8a7a","#7b6b5b","#d4b458","#ddd",-14)], sizes:[39,40,41,42,43,44], stock:1, category:"Spor", badge:"İndirim" },
  { id: 24, slug: "nike-cortez", name: "Nike Cortez", price: 1699, originalPrice: 1999, description: "1972'den bu yana Amerikan spor kültürünün simgesi. Hafif, klasik, zamansız.", image: ph(3), images: [ph(3),ph(1),shoe("#f0f0f0","#ccc","#fff","#dc2626","#0066bb",-12)], sizes:[36,37,38,39,40,41,42,43], stock:7, category:"Günlük", badge:"İndirim" },
  // ── Bot ──────────────────────────────────────────────────────
  { id: 25, slug: "timberland-6-inch", name: "Timberland 6-Inch Boot", price: 3299, originalPrice: 3999, description: "Su geçirmez nubuck deri ve sağlam taban ile kış aylarının vazgeçilmezi.", image: ph(4), images: [ph(4),ph(2),shoe("#faf5ed","#9a7818","#d4ad38","#f8e496","#ddd",-11)], sizes:[40,41,42,43,44,45], stock:5, category:"Bot", badge:"Yeni" },
  { id: 26, slug: "dr-martens-1460", name: "Dr. Martens 1460", price: 2899, originalPrice: null, description: "İkonik sarı dikiş ve hava yastıklı AirWair tabanıyla punk kültürünün efsanesi.", image: ph(0), images: [ph(0),ph(3),shoe("#111","#000","#2a2a2a","#ffd700","#222",-12)], sizes:[37,38,39,40,41,42,43,44], stock:8, category:"Bot", badge:null },
  { id: 27, slug: "ugg-classic-mini", name: "UGG Classic Mini", price: 2499, originalPrice: 2999, description: "Gerçek koyun derisiyle üretilmiş, kışın en rahat kısa bot modeli.", image: ph(1), images: [ph(1),ph(4),shoe("#faf3ea","#d4b490","#dcc0a0","#dc2626","#ddd",-10)], sizes:[36,37,38,39,40,41], stock:4, category:"Bot", badge:"İndirim" },
  // ── Sandalet ─────────────────────────────────────────────────
  { id: 28, slug: "birkenstock-arizona", name: "Birkenstock Arizona", price: 1799, originalPrice: null, description: "Kork taban üzerinde anatomi tasarımlı, yaz aylarının konfor ikonu.", image: ph(2), images: [ph(2),ph(0),shoe("#faf3ea","#d4b490","#e8c080","#9a7818","#ddd",-8)], sizes:[36,37,38,39,40,41,42,43], stock:12, category:"Sandalet", badge:"Yeni" },
  { id: 29, slug: "adidas-adilette", name: "Adidas Adilette Comfort", price: 899, originalPrice: 1199, description: "Yumuşak köpük taban ve ikonik 3 bant tasarımıyla günlük konfor.", image: ph(3), images: [ph(3),ph(1),shoe("#f3f7fc","#0066bb","#fff","#0066bb","#00b0f0",-6)], sizes:[36,37,38,39,40,41,42,43,44,45], stock:25, category:"Sandalet", badge:"İndirim" },
  { id: 30, slug: "havaianas-slim", name: "Havaianas Slim", price: 499, originalPrice: null, description: "Brezilya'dan gelen o eşsiz renk ve kauçuk kalite — yaz için biçilmiş kaftan.", image: ph(4), images: [ph(4),ph(2),shoe("#fffbeb","#f59e0b","#fef3c7","#dc2626","#fbbf24",-6)], sizes:[35,36,37,38,39,40,41,42], stock:30, category:"Sandalet", badge:null },
  // ── Krampon ───────────────────────────────────────────────────
  { id: 31, slug: "nike-mercurial-vapor", name: "Nike Mercurial Vapor 16", price: 3999, originalPrice: 4799, description: "Next-Gen hız teknolojisi ile sahada fark yaratan üst seviye krampon.", image: ph(0), images: [ph(0),ph(3),shoe("#f0f5fa","#dc2626","#111","#d97706","#ddd",-14)], sizes:[39,40,41,42,43,44,45], stock:3, category:"Krampon", badge:"İndirim" },
  { id: 32, slug: "adidas-predator-30", name: "Adidas Predator 30 FG", price: 3499, originalPrice: null, description: "Control Zone teknolojisi ve Element Skin kaplamasıyla topa mutlak hakimiyet.", image: ph(1), images: [ph(1),ph(4),shoe("#111","#1a1a1a","#a50d26","#d97706","#222",-11)], sizes:[39,40,41,42,43,44], stock:6, category:"Krampon", badge:"Yeni" },
  { id: 33, slug: "puma-future-8", name: "Puma Future 8 FG", price: 3299, originalPrice: 3899, description: "AccuFoam yastıklama ve BreatheFit üst yapısıyla sahada üst düzey performans.", image: ph(2), images: [ph(2),ph(0),shoe("#f8f5ff","#7c73ff","#111","#d97706","#8b5cf6",-12)], sizes:[38,39,40,41,42,43,44], stock:4, category:"Krampon", badge:"İndirim" },
  // ── Klasik ────────────────────────────────────────────────────
  { id: 34, slug: "oxford-brogue-leather", name: "Klasik Brogue Oxford", price: 2299, originalPrice: null, description: "El yapımı deri ve geleneksel brogue oyma detaylarıyla ofis ve özel günler için şıklık.", image: ph(3), images: [ph(3),ph(1),shoe("#332418","#1f170e","#4d3528","#b89468","#ddd",-10)], sizes:[40,41,42,43,44,45], stock:7, category:"Klasik", badge:null },
  { id: 35, slug: "loafer-suede", name: "Süet Loafer", price: 1899, originalPrice: 2299, description: "Yumuşak süet deri ve yuvarlak burun tasarımıyla her kombinasyona uyan klasik loafer.", image: ph(4), images: [ph(4),ph(2),shoe("#9a7818","#7a5c10","#c4982e","#dc2626","#deb978",-11)], sizes:[37,38,39,40,41,42,43], stock:9, category:"Klasik", badge:"İndirim" },
  { id: 36, slug: "chelsea-boot-classic", name: "Chelsea Boot Deri", price: 2699, originalPrice: null, description: "Elastik panel ve yuvarlak biye detaylı, kısa konçlu deri Chelsea bot.", image: ph(0), images: [ph(0),ph(3),shoe("#201508","#0f0804","#2d1e12","#b89468","#ddd",-12)], sizes:[39,40,41,42,43,44], stock:5, category:"Klasik", badge:"Yeni" },
  // ── Cüzdan ────────────────────────────────────────────────────
  { id: 37, slug: "klasik-deri-cuzdan", name: "Klasik Deri Cüzdan", price: 599, originalPrice: 799, description: "Hakiki dana derisinden üretilmiş, 8 kart bölmeli klasik erkek cüzdanı. RFID korumalı.", image: WALLET_PHOTOS[0], images: [WALLET_PHOTOS[0],WALLET_PHOTOS[1],wallet("#f5f0eb","#5c3a1e","#c8102e","#d4a76a")], sizes:[], stock:18, category:"Cüzdan", badge:"İndirim" },
  { id: 38, slug: "slim-kartvizitlik", name: "Slim Kartlık Cüzdan", price: 399, originalPrice: null, description: "Ultra ince tasarım, 6 kart bölmeli minimalist cüzdan. Ön cep için ideal boyut.", image: WALLET_PHOTOS[1], images: [WALLET_PHOTOS[1],WALLET_PHOTOS[2],wallet("#f0f0f5","#1a1a2e","#0055a4","#8888cc")], sizes:[], stock:25, category:"Cüzdan", badge:"Yeni" },
  { id: 39, slug: "fermuarli-deri-cuzdan", name: "Fermuarlı Deri Cüzdan", price: 749, originalPrice: 999, description: "Fermuarlı bozuk para bölmesi ve 12 kart gözlü premium deri cüzdan.", image: WALLET_PHOTOS[2], images: [WALLET_PHOTOS[2],WALLET_PHOTOS[0],wallet("#f5e8d5","#3d2b1f","#8B6914","#c9a97b")], sizes:[], stock:12, category:"Cüzdan", badge:"İndirim" },
];

// ============================================
// CATEGORY DATA (for category cards section)
// ============================================
const CAT_DATA = [
  { name: "Spor",     emoji: "🏃", desc: "Koşu & Fitness",   gradient: "linear-gradient(135deg,#e8f0fe,#c5d6f8)", shoe: shoe("#ddeafe","#1a2a8a","#c8102e","#fff","#fff",-8) },
  { name: "Günlük",   emoji: "👟", desc: "Her Güne Uygun",   gradient: "linear-gradient(135deg,#f3f0ff,#ddd5fa)", shoe: shoe("#f3f0ff","#2d2d2d","#ffffff","#7c3aed","#ddd",-5) },
  { name: "Klasik",   emoji: "👞", desc: "Ofis & Şıklık",    gradient: "linear-gradient(135deg,#fdf5e8,#f5e0bc)", shoe: shoe("#fdf5e8","#2a1f16","#5c4033","#c9a97b","#fff",-3) },
  { name: "Bot",      emoji: "🥾", desc: "Kış & Dağ",        gradient: "linear-gradient(135deg,#f5ede0,#e8d5b8)", shoe: shoe("#f5ede0","#5a3010","#8B6914","#f5d98e","#fff",-4) },
  { name: "Sandalet", emoji: "🩴", desc: "Yaz Hafifliği",    gradient: "linear-gradient(135deg,#fffbf0,#fef0c4)", shoe: shoe("#fffbf0","#7a6040","#c8a870","#e8c890","#fff",-2) },
  { name: "Krampon",  emoji: "⚽", desc: "Saha Performansı", gradient: "linear-gradient(135deg,#edfdf3,#bbf7d0)", shoe: shoe("#edfdf3","#145a20","#1e8a2e","#4dcc6a","#fff",-7) },
  { name: "Cüzdan",   emoji: "👛", desc: "Deri & Kartlık",   gradient: "linear-gradient(135deg,#f5f0eb,#e8d5c0)", shoe: wallet("#f5f0eb","#5c3a1e","#c8102e","#d4a76a") },
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
// ANNOUNCEMENT BAR
// ============================================
function AnnouncementBar({ settings }) {
  const [show, setShow] = useState(true);
  const bar = settings?.announcementBar || DEFAULT_SETTINGS.announcementBar;
  const phone = settings?.contact?.whatsapp || DEFAULT_SETTINGS.contact.whatsapp;
  if (!show || !bar.enabled) return null;
  return (
    <div style={{ background: bar.bgColor || T.ac, color: T.wh, fontFamily: T.f, fontSize: 13, fontWeight: 600, textAlign: "center", padding: "10px 48px 10px 24px", position: "relative", letterSpacing: "0.02em" }}>
      {bar.text} &nbsp;|&nbsp; 📞 {phone}
      <button onClick={() => setShow(false)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 16, padding: 4, lineHeight: 1 }}>✕</button>
    </div>
  );
}

// ============================================
// NAVBAR
// ============================================
function Navbar({ onNav, pg, settings }) {
  const waNum = settings?.contact?.whatsappFull || DEFAULT_SETTINGS.contact.whatsappFull;
  const [mo, setMo] = useState(false);
  const [sc, setSc] = useState(false);
  useEffect(() => {
    const fn = () => setSc(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const lnk = [{ k: "home", l: "Ana Sayfa" }, { k: "catalog", l: "Ayakkabılar" }];
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: sc ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.8)", backdropFilter: "blur(24px)", borderBottom: sc ? "1px solid #eee" : "1px solid transparent", transition: "all 0.3s" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={() => onNav("home")} style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: 2 }}>
          <span style={{ fontFamily: T.d, fontSize: 22, fontWeight: 700, color: T.bk, fontStyle: "italic" }}>Uygun</span>
          <span style={{ fontFamily: T.f, fontSize: 20, fontWeight: 700, color: T.ac }}>Ayakkabı</span>
        </div>
        <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {lnk.map(l => (
            <span key={l.k} onClick={() => onNav(l.k)} style={{ cursor: "pointer", fontFamily: T.f, fontSize: 14, fontWeight: pg === l.k ? 600 : 400, color: pg === l.k ? T.bk : T.g500, position: "relative" }}>
              {l.l}
              {pg === l.k && <span style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", width: 16, height: 2, background: T.ac, borderRadius: 2 }} />}
            </span>
          ))}
          <a href={waLink(waNum)} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: T.f, fontSize: 13, fontWeight: 600, color: T.wh, background: "#25D366", padding: "10px 20px", borderRadius: T.r.full, textDecoration: "none" }}>
            {I.wa} WhatsApp
          </a>
        </div>
        <button className="nav-mobile" onClick={() => setMo(!mo)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: T.bk, padding: 4 }}>
          {mo ? I.close : I.menu}
        </button>
      </div>
      {mo && (
        <div style={{ padding: "8px 24px 28px", display: "flex", flexDirection: "column", gap: 4, borderTop: "1px solid #e8e8e8" }}>
          {lnk.map(l => (
            <span key={l.k} onClick={() => { onNav(l.k); setMo(false); }} style={{ cursor: "pointer", fontFamily: T.f, fontSize: 16, fontWeight: 500, color: T.bk, padding: "12px 0", borderBottom: "1px solid #f5f5f5" }}>
              {l.l}
            </span>
          ))}
          <a href={waLink(waNum)} target="_blank" rel="noreferrer" style={{ marginTop: 8, fontFamily: T.f, fontSize: 14, fontWeight: 600, color: T.wh, background: "#25D366", padding: "14px 24px", borderRadius: T.r.full, textDecoration: "none", textAlign: "center" }}>
            WhatsApp'tan Yaz
          </a>
        </div>
      )}
      <style>{`@media(max-width:768px){.nav-desktop{display:none!important}.nav-mobile{display:block!important}}`}</style>
    </nav>
  );
}

// ============================================
// PRODUCT CARD
// ============================================
function Card({ p, onView }) {
  const [h, sH] = useState(false);
  const imgSrc = p.dbImage || p.image;
  return (
    <div
      onMouseEnter={() => sH(true)}
      onMouseLeave={() => sH(false)}
      onClick={() => onView(p)}
      style={{ cursor: "pointer", borderRadius: T.r.xl, overflow: "hidden", background: T.wh, transition: "transform 0.4s cubic-bezier(.22,1,.36,1), box-shadow 0.4s cubic-bezier(.22,1,.36,1), border-color 0.3s", transform: h ? "translateY(-8px) scale(1.015)" : "translateY(0) scale(1)", boxShadow: h ? "0 28px 56px rgba(0,0,0,0.13), 0 8px 16px rgba(0,0,0,0.06)" : "0 2px 8px rgba(0,0,0,0.04)", border: h ? "1px solid #d0d0d0" : "1px solid #e8e8e8" }}>
      <div style={{ position: "relative", paddingTop: "115%", overflow: "hidden", background: T.g100 }}>
        <img src={imgSrc} alt={p.name || p.title} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.6s cubic-bezier(.22,1,.36,1)", transform: h ? "scale(1.1)" : "scale(1)", filter: (p.stock === 0 || p.status === "soldout") ? "grayscale(40%)" : "" }} />
        {p.badge && (
          <span style={{ position: "absolute", top: 14, left: 14, fontFamily: T.f, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", padding: "5px 12px", borderRadius: T.r.full, color: T.wh, background: p.badge === "Tükendi" ? T.g500 : p.badge === "İndirim" ? T.ac : T.bk }}>
            {p.badge}
          </span>
        )}
        {p.status === "soldout" && !p.badge && (
          <span style={{ position: "absolute", top: 14, left: 14, fontFamily: T.f, fontSize: 11, fontWeight: 700, textTransform: "uppercase", padding: "5px 12px", borderRadius: T.r.full, color: T.wh, background: T.g500 }}>Tükendi</span>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px 16px 16px", background: "linear-gradient(transparent, rgba(0,0,0,0.5))", opacity: h ? 1 : 0, transition: "opacity 0.3s", display: "flex", justifyContent: "center" }}>
          <span style={{ fontFamily: T.f, fontSize: 13, fontWeight: 600, color: T.wh, background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", padding: "8px 20px", borderRadius: T.r.full }}>İncele →</span>
        </div>
      </div>
      <div style={{ padding: "18px 18px 20px" }}>
        <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 500, color: T.g400, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{p.category}</p>
        <h3 style={{ fontFamily: T.f, fontSize: 15, fontWeight: 600, color: T.bk, marginBottom: 10, lineHeight: 1.3 }}>{p.name || p.title}</h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: T.f, fontSize: 18, fontWeight: 700, color: T.bk }}>₺{(p.price || 0).toLocaleString("tr-TR")}</span>
            {p.originalPrice && <span style={{ fontFamily: T.f, fontSize: 13, color: T.g400, textDecoration: "line-through" }}>₺{p.originalPrice.toLocaleString("tr-TR")}</span>}
          </div>
          {p.originalPrice && p.price < p.originalPrice && (
            <span style={{ fontFamily: T.f, fontSize: 11, fontWeight: 700, color: T.ac, background: "#fef2f2", padding: "3px 8px", borderRadius: T.r.full }}>
              %{Math.round((1 - p.price / p.originalPrice) * 100)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// CATEGORY CARD
// ============================================
function CategoryCard({ cat, count, onNav }) {
  const [h, sH] = useState(false);
  return (
    <div
      onMouseEnter={() => sH(true)}
      onMouseLeave={() => sH(false)}
      onClick={() => onNav("catalog", cat.name)}
      style={{
        cursor: "pointer",
        borderRadius: T.r.xl,
        overflow: "hidden",
        background: cat.gradient,
        position: "relative",
        aspectRatio: "1/1",
        transition: "transform 0.35s cubic-bezier(.22,1,.36,1), box-shadow 0.35s",
        transform: h ? "translateY(-6px) scale(1.02)" : "none",
        boxShadow: h ? "0 20px 48px rgba(0,0,0,0.14)" : "0 2px 8px rgba(0,0,0,0.06)",
        border: "1px solid rgba(0,0,0,0.05)",
      }}
    >
      {/* Shoe background image */}
      <img
        src={cat.shoe}
        alt={cat.name}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: h ? 0.55 : 0.38,
          transform: h ? "scale(1.08) rotate(2deg)" : "scale(1) rotate(0deg)",
          transition: "opacity 0.4s, transform 0.6s cubic-bezier(.22,1,.36,1)",
        }}
      />
      {/* Content overlay */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 16,
      }}>
        <span style={{ fontSize: 42, marginBottom: 10, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.1))" }}>{cat.emoji}</span>
        <p style={{ fontFamily: T.f, fontSize: 16, fontWeight: 700, color: T.bk, marginBottom: 4, textAlign: "center" }}>{cat.name}</p>
        <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 500, color: T.g500, textAlign: "center" }}>{cat.desc}</p>
        {count > 0 && (
          <span style={{ marginTop: 10, fontFamily: T.f, fontSize: 10, fontWeight: 600, color: T.g400, background: "rgba(0,0,0,0.06)", padding: "3px 10px", borderRadius: T.r.full }}>
            {count} ürün
          </span>
        )}
      </div>
      {/* Hover arrow */}
      <div style={{
        position: "absolute", bottom: 14, right: 14,
        width: 28, height: 28, borderRadius: "50%",
        background: T.bk, color: T.wh,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: h ? 1 : 0, transition: "opacity 0.25s",
        fontSize: 12, fontWeight: 700,
      }}>→</div>
    </div>
  );
}

// ============================================
// BUY FORM MODAL
// ============================================
function BuyForm({ product: p, onClose }) {
  const [f, sF] = useState({ name: "", phone: "", city: "" });
  const [ok, sOk] = useState(false);
  const [er, sEr] = useState({});
  const flds = [
    { k: "name", l: "Ad Soyad", ph: "Adınız ve soyadınız", t: "text" },
    { k: "phone", l: "Telefon Numarası", ph: "05XX XXX XX XX", t: "tel" },
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
  const imgSrc = p.dbImage || p.image;
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
              <img src={imgSrc} alt="" style={{ width: 56, height: 56, borderRadius: T.r.md, objectFit: "cover" }} />
              <div>
                <p style={{ fontFamily: T.f, fontSize: 14, fontWeight: 600, color: T.bk }}>{p.name || p.title}</p>
                <p style={{ fontFamily: T.f, fontSize: 15, fontWeight: 700, color: T.ac }}>₺{(p.price || 0).toLocaleString("tr-TR")}</p>
              </div>
            </div>
            <h3 style={{ fontFamily: T.f, fontSize: 20, fontWeight: 700, color: T.bk, marginBottom: 4 }}>Satın Alma Talebi</h3>
            <p style={{ fontFamily: T.f, fontSize: 13, color: T.g500, marginBottom: 24 }}>Bilgilerinizi bırakın, sizi arayalım.</p>
            {flds.map(x => (
              <div key={x.k} style={{ marginBottom: 18 }}>
                <label style={{ fontFamily: T.f, fontSize: 12, fontWeight: 600, color: T.g600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{x.l}</label>
                <input type={x.t} placeholder={x.ph} value={f[x.k]} onChange={e => { sF({ ...f, [x.k]: e.target.value }); sEr({ ...er, [x.k]: false }); }}
                  style={{ width: "100%", padding: "13px 16px", borderRadius: T.r.md, border: `2px solid ${er[x.k] ? T.ac : T.g200}`, fontFamily: T.f, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = T.bk}
                  onBlur={e => e.target.style.borderColor = er[x.k] ? T.ac : T.g200} />
              </div>
            ))}
            <button onClick={go} style={{ width: "100%", padding: "15px", background: T.ac, color: T.wh, border: "none", borderRadius: T.r.md, fontFamily: T.f, fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>Talep Gönder</button>
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <p style={{ fontFamily: T.f, fontSize: 12, color: T.g400, marginBottom: 10 }}>Ya da doğrudan WhatsApp'tan ulaşın</p>
              <a href={`https://wa.me/${ct.whatsappFull}?text=Merhaba!%20${encodeURIComponent((p.name || p.title || "Ürün"))}%20hakkında%20bilgi%20almak%20istiyorum.`}
                target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: T.f, fontSize: 14, fontWeight: 600, color: T.wh, background: "#25D366", padding: "12px 28px", borderRadius: T.r.full, textDecoration: "none" }}>
                {I.wa} WhatsApp ile Sor
              </a>
            </div>
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
function Foot({ onNav, settings }) {
  const ct = settings?.contact || DEFAULT_SETTINGS.contact;
  return (
    <footer style={{ background: T.bk, color: T.wh, padding: "56px 24px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 40 }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 14 }}>
            <span style={{ fontFamily: T.d, fontSize: 20, fontWeight: 700, fontStyle: "italic" }}>Uygun</span>
            <span style={{ fontFamily: T.f, fontSize: 18, fontWeight: 700, color: T.ac }}>Ayakkabı</span>
          </div>
          <p style={{ fontFamily: T.f, fontSize: 13, color: "#777", lineHeight: 1.8, maxWidth: 280 }}>Kaliteli ayakkabılar, uygun fiyatlar. Geniş marka yelpazesi, hızlı kargo.</p>
        </div>
        <div>
          <h5 style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", marginBottom: 18 }}>Sayfalar</h5>
          {[["Ana Sayfa", "home"], ["Ayakkabılar", "catalog"]].map(([l, k]) => (
            <p key={k} onClick={() => onNav(k)} style={{ fontFamily: T.f, fontSize: 14, color: "#999", marginBottom: 10, cursor: "pointer" }}>{l}</p>
          ))}
        </div>
        <div>
          <h5 style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", marginBottom: 18 }}>İletişim</h5>
          <p style={{ fontFamily: T.f, fontSize: 14, color: "#999", lineHeight: 2.2 }}>
            {ct.whatsapp}<br />
            {ct.email || 'info@uygunayakkabi.com'}<br />
            İstanbul, Türkiye
          </p>
        </div>
        <div>
          <h5 style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", marginBottom: 18 }}>WhatsApp Sipariş</h5>
          <a href={waLink(ct.whatsappFull)} target="_blank" rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: T.f, fontSize: 14, fontWeight: 600, color: T.wh, background: "#25D366", padding: "12px 20px", borderRadius: T.r.full, textDecoration: "none", marginBottom: 12 }}>
            {I.wa} WhatsApp'tan Yaz
          </a>
          <p style={{ fontFamily: T.f, fontSize: 12, color: "#666", lineHeight: 1.7 }}>Beğendiğiniz modeli seçip WhatsApp'tan yazın — hemen yardımcı olalım.</p>
        </div>
      </div>
      <div style={{ maxWidth: 1280, margin: "48px auto 0", padding: "20px 0", borderTop: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontFamily: T.f, fontSize: 12, color: "#444" }}>© 2025 UygunAyakkabı — Tüm hakları saklıdır.</p>
        <p style={{ fontFamily: T.f, fontSize: 12, color: "#444" }}>uygunayakkabi.com</p>
      </div>
    </footer>
  );
}

// ============================================
// HOME PAGE
// ============================================
function Home({ onNav, onView, allProducts, settings, banners = [] }) {
  const S = settings || DEFAULT_SETTINGS;
  const trust = S.trustBadges || DEFAULT_SETTINGS.trustBadges;
  const ship = S.shipping || DEFAULT_SETTINGS.shipping;
  const contact = S.contact || DEFAULT_SETTINGS.contact;
  const catCounts = CAT_DATA.reduce((acc, c) => {
    acc[c.name] = allProducts.filter(p => p.category === c.name).length;
    return acc;
  }, {});
  const why = [
    { icon: I.truck, title: "Hızlı Kargo", desc: `Siparişleriniz 1-3 iş günü içinde kapınızda. ${ship.freeShippingThreshold}₺ üzeri kargo bedava!` },
    { icon: I.tag, title: "Uygun Fiyat Garantisi", desc: "Piyasanın altında fiyatlarla geniş marka yelpazesi. %40'a varan indirimler." },
    { icon: I.heart, title: `${trust.satisfactionRate} Müşteri Memnuniyeti`, desc: `Aylık ${trust.monthlyCustomers} mutlu müşteri ve kolay iade garantisi.` },
    { icon: I.check, title: "Orijinal Ürünler", desc: "Tüm ürünlerimiz orijinal ve faturalıdır. Güvenle alışveriş yapın." },
  ];
  // Find a banner for the promo section (hero or catalog_top placement, or first discount banner)
  const promoBanner = banners.find(b => b.placement === 'hero' || b.type === 'discount') || null;
  const first = allProducts[0];
  return (
    <div>
      {/* HERO */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", background: T.g50, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20%", right: "-10%", width: "60%", height: "140%", background: "radial-gradient(ellipse, rgba(200,16,46,0.03) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-grid" style={{ maxWidth: 1280, margin: "0 auto", padding: "120px 24px 80px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center", width: "100%" }}>
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ display: "inline-block", fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: T.ac, background: "#fef2f2", padding: "6px 14px", borderRadius: T.r.full, marginBottom: 20 }}>Güncel Koleksiyon</div>
            <h1 style={{ fontFamily: T.d, fontSize: "clamp(40px, 5.5vw, 72px)", fontWeight: 700, color: T.bk, lineHeight: 1.05, marginBottom: 20 }}>
              Kaliteli Ayakkabılar
              <span style={{ display: "block", fontFamily: T.f, fontWeight: 300, fontSize: "clamp(28px, 3.5vw, 48px)", color: T.g500, marginTop: 4 }}>Uygun Fiyatlar</span>
            </h1>
            <p style={{ fontFamily: T.f, fontSize: 16, color: T.g500, lineHeight: 1.75, marginBottom: 36, maxWidth: 420 }}>En popüler markaların en iyi modelleri, piyasanın altında fiyatlarla. Beğendiğiniz ayakkabıyı seçin, WhatsApp'tan yazın.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => onNav("catalog")} style={{ fontFamily: T.f, fontSize: 15, fontWeight: 600, color: T.wh, background: T.ac, border: "none", padding: "16px 36px", borderRadius: T.r.full, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                Ayakkabıları Gör {I.arrow}
              </button>
              <a href={`https://wa.me/${contact.whatsappFull}`} target="_blank" rel="noreferrer" style={{ fontFamily: T.f, fontSize: 15, fontWeight: 600, color: T.wh, background: "#25D366", border: "none", padding: "16px 28px", borderRadius: T.r.full, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                {I.wa} WhatsApp'tan Yaz
              </a>
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 36, flexWrap: "wrap" }}>
              {["Hızlı Kargo", "Kolay İade", "Güvenli Ödeme"].map(t => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                  <span style={{ fontFamily: T.f, fontSize: 13, fontWeight: 500, color: T.g600 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ borderRadius: 28, overflow: "hidden", aspectRatio: "4/5", background: T.g200, boxShadow: "0 32px 64px rgba(0,0,0,0.12)" }}>
              <img src={heroImg} alt="Featured" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            {first && (
              <div style={{ position: "absolute", bottom: -16, left: -16, background: T.wh, borderRadius: T.r.lg, padding: "16px 20px", boxShadow: "0 16px 40px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => onView(first)}>
                <img src={first.dbImage || first.image} alt="" style={{ width: 48, height: 48, borderRadius: T.r.md, objectFit: "cover" }} />
                <div>
                  <p style={{ fontFamily: T.f, fontSize: 13, fontWeight: 600, color: T.bk }}>{first.name || first.title}</p>
                  <p style={{ fontFamily: T.f, fontSize: 14, fontWeight: 700, color: T.ac }}>₺{(first.price || 0).toLocaleString("tr-TR")}</p>
                </div>
              </div>
            )}
            <div style={{ position: "absolute", top: 24, right: -12, background: T.wh, borderRadius: T.r.lg, padding: "14px 20px", boxShadow: "0 12px 32px rgba(0,0,0,0.08)", textAlign: "center" }}>
              <p style={{ fontFamily: T.f, fontSize: 22, fontWeight: 800, color: T.ac }}>{trust.monthlyCustomers}</p>
              <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 500, color: T.g500 }}>Aylık Müşteri</p>
            </div>
          </div>
        </div>
        <style>{`@media(max-width:768px){.hero-grid{grid-template-columns:1fr!important;text-align:center;padding-top:100px!important}.hero-grid>div:last-child{order:-1}.hero-grid>div:first-child>div:last-child{justify-content:center}}`}</style>
      </section>

      {/* BEST SELLERS */}
      <section style={{ padding: "80px 24px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: T.ac, marginBottom: 8 }}>Koleksiyon</p>
            <h2 style={{ fontFamily: T.d, fontSize: "clamp(28px, 3vw, 36px)", fontWeight: 700, color: T.bk }}>Çok Satanlar</h2>
          </div>
          <span onClick={() => onNav("catalog")} style={{ fontFamily: T.f, fontSize: 14, fontWeight: 500, color: T.g500, cursor: "pointer" }}>Tümünü Gör →</span>
        </div>
        <div className="home-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {allProducts.slice(0, 8).map(p => <Card key={p.id || p.slug} p={p} onView={onView} />)}
        </div>
        <style>{`@media(max-width:1024px){.home-grid{grid-template-columns:repeat(3,1fr)!important}}@media(max-width:640px){.home-grid{grid-template-columns:repeat(2,1fr)!important;gap:12px!important}}`}</style>
      </section>

      {/* PROMO BANNER — uses dynamic banner from admin or falls back to default */}
      <section style={{ padding: "0 24px", maxWidth: 1280, margin: "0 auto" }}>
        <div onClick={() => onNav("catalog")} style={{ cursor: "pointer", background: promoBanner ? `linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, ${promoBanner.bgColor} 100%)` : "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #c8102e 100%)", borderRadius: 24, padding: "48px 40px", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 24, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 200, height: 200, background: "rgba(200,16,46,0.2)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", bottom: -20, left: "30%", width: 120, height: 120, background: "rgba(200,16,46,0.1)", borderRadius: "50%" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontFamily: T.f, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#fbbf24", marginBottom: 12 }}>{promoBanner?.type === 'flash_sale' ? '⏰ Flash Sale' : 'Sınırlı Süre'}</div>
            <h3 style={{ fontFamily: T.d, fontSize: "clamp(24px, 3vw, 38px)", fontWeight: 700, color: promoBanner?.textColor || T.wh, lineHeight: 1.2, marginBottom: 10 }}>{promoBanner?.title || 'Sezon Sonu İndirimi'}</h3>
            <p style={{ fontFamily: T.f, fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
              {promoBanner?.subtitle || (<>Seçili modellerde <strong style={{ color: "#fbbf24" }}>%40'a varan</strong> indirimler. Fırsatı kaçırma!</>)}
            </p>
            {promoBanner?.couponCode && <div style={{ fontFamily: T.f, fontSize: 12, fontWeight: 700, color: "#fbbf24", marginTop: 10, background: "rgba(251,191,36,0.15)", display: "inline-block", padding: "4px 12px", borderRadius: T.r.sm }}>Kupon: {promoBanner.couponCode}</div>}
          </div>
          <div style={{ textAlign: "center", position: "relative" }}>
            <div style={{ fontFamily: T.f, fontSize: 56, fontWeight: 900, color: promoBanner?.textColor || T.wh, lineHeight: 1 }}>%{promoBanner?.discountPercent || 40}</div>
            <div style={{ fontFamily: T.f, fontSize: 12, fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.1em" }}>İndirim</div>
            <div style={{ marginTop: 16, fontFamily: T.f, fontSize: 13, fontWeight: 600, color: T.wh, background: "rgba(255,255,255,0.15)", padding: "10px 24px", borderRadius: T.r.full, display: "inline-flex", alignItems: "center", gap: 8 }}>Alışverişe Başla {I.arrow}</div>
          </div>
        </div>
        <style>{`@media(max-width:640px){section:has(>[style*="grid-template-columns: 1fr auto"]){padding:0 16px!important}section:has(>[style*="grid-template-columns: 1fr auto"])>div{grid-template-columns:1fr!important;text-align:center;padding:36px 24px!important}}`}</style>
      </section>

      {/* CATEGORIES */}
      <section style={{ padding: "64px 24px 80px", background: T.g50 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: T.ac, marginBottom: 8 }}>Kategoriler</p>
            <h2 style={{ fontFamily: T.d, fontSize: "clamp(28px, 3vw, 36px)", fontWeight: 700, color: T.bk }}>Ne Arıyorsunuz?</h2>
          </div>
          <div className="cat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            {CAT_DATA.map(cat => (
              <CategoryCard key={cat.name} cat={cat} count={catCounts[cat.name] || 0} onNav={onNav} />
            ))}
          </div>
          <style>{`@media(max-width:480px){.cat-grid{grid-template-columns:repeat(2,1fr)!important}}`}</style>
        </div>
      </section>

      {/* WHY US */}
      <section style={{ padding: "64px 24px 80px", background: T.wh }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: T.ac, marginBottom: 8 }}>Neden Biz?</p>
            <h2 style={{ fontFamily: T.d, fontSize: "clamp(28px, 3vw, 36px)", fontWeight: 700, color: T.bk }}>Farkımız</h2>
          </div>
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

      {/* WHATSAPP ORDER GUIDE */}
      <section style={{ padding: "0 24px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ background: T.bk, borderRadius: 28, padding: "64px 40px", margin: "64px 0", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: "40%", height: "100%", background: "radial-gradient(ellipse at right, rgba(37,211,102,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ textAlign: "center", marginBottom: 48, position: "relative" }}>
            <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "#25D366", marginBottom: 12 }}>WhatsApp ile Kolay Alışveriş</p>
            <h2 style={{ fontFamily: T.d, fontSize: "clamp(24px, 3vw, 40px)", fontWeight: 700, color: T.wh, marginBottom: 12 }}>Nasıl Sipariş Verilir?</h2>
            <p style={{ fontFamily: T.f, fontSize: 15, color: "#888" }}>4 basit adımda ayakkabınız kapınızda.</p>
          </div>
          <div className="wa-steps" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, position: "relative", marginBottom: 48 }}>
            {[
              { n: "1", t: "Ürünü Seç", d: "Katalogdan beğendiğin modeli bul" },
              { n: "2", t: "WhatsApp'tan Yaz", d: "Ürün adı ve bedenini bize ilet" },
              { n: "3", t: "Siparişi Onayla", d: "Ödeme ve teslimat bilgilerini ver" },
              { n: "4", t: "Kapıda Teslim", d: "1-3 iş günü içinde kapında" },
            ].map(s => (
              <div key={s.n} style={{ background: "rgba(255,255,255,0.06)", borderRadius: T.r.xl, padding: "28px 20px", textAlign: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: T.r.full, background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontFamily: T.f, fontSize: 16, fontWeight: 800, color: T.wh }}>{s.n}</div>
                <p style={{ fontFamily: T.f, fontSize: 14, fontWeight: 700, color: T.wh, marginBottom: 8 }}>{s.t}</p>
                <p style={{ fontFamily: T.f, fontSize: 12, color: "#888", lineHeight: 1.6 }}>{s.d}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
            <a href={`https://wa.me/${contact.whatsappFull}`} target="_blank" rel="noreferrer" style={{ fontFamily: T.f, fontSize: 15, fontWeight: 600, color: T.wh, background: "#25D366", padding: "16px 36px", borderRadius: T.r.full, textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
              {I.wa} {contact.whatsapp}
            </a>
          </div>
        </div>
        <style>{`@media(max-width:768px){.wa-steps{grid-template-columns:repeat(2,1fr)!important}}`}</style>
      </section>

      <Foot onNav={onNav} settings={S} />
    </div>
  );
}

// ============================================
// CATALOG PAGE
// ============================================
const ALL_CATEGORIES = ["Tümü", "Spor", "Günlük", "Bot", "Sandalet", "Krampon", "Klasik", "Cüzdan"];

function Catalog({ onView, allProducts, initCat = "Tümü" }) {
  const [fl, sFl] = useState(initCat);
  const [vis, sVis] = useState(12);
  const flt = fl === "Tümü" ? allProducts : allProducts.filter(p => p.category === fl);
  const shown = flt.slice(0, vis);
  const hasMore = vis < flt.length;
  const handleFilter = (c) => { sFl(c); sVis(12); };
  return (
    <div style={{ paddingTop: 68 }}>
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontFamily: T.f, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: T.ac, marginBottom: 8 }}>Koleksiyon</p>
          <h1 style={{ fontFamily: T.d, fontSize: "clamp(32px, 4vw, 44px)", fontWeight: 700, color: T.bk, marginBottom: 8 }}>Ayakkabılar</h1>
          <p style={{ fontFamily: T.f, fontSize: 15, color: T.g500 }}>{flt.length} ürün listeleniyor</p>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 36, flexWrap: "wrap" }}>
          {ALL_CATEGORIES.map(c => (
            <button key={c} onClick={() => handleFilter(c)}
              style={{ fontFamily: T.f, fontSize: 13, fontWeight: 500, padding: "10px 20px", borderRadius: T.r.full, border: "none", cursor: "pointer", background: fl === c ? T.bk : T.g100, color: fl === c ? T.wh : T.g600, transition: "all 0.2s" }}>
              {c}
            </button>
          ))}
        </div>
        <div className="catalog-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {shown.map(p => <Card key={p.id || p.slug} p={p} onView={onView} />)}
        </div>
        {hasMore && (
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <button onClick={() => sVis(v => v + 12)}
              style={{ fontFamily: T.f, fontSize: 15, fontWeight: 600, color: T.bk, background: T.wh, border: "2px solid #e0e0e0", padding: "14px 48px", borderRadius: T.r.full, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = T.bk; e.currentTarget.style.color = T.wh; e.currentTarget.style.borderColor = T.bk; }}
              onMouseLeave={e => { e.currentTarget.style.background = T.wh; e.currentTarget.style.color = T.bk; e.currentTarget.style.borderColor = "#e0e0e0"; }}>
              Daha Fazla Göster ({Math.max(0, flt.length - vis)} ürün kaldı)
            </button>
          </div>
        )}
        <style>{`@media(max-width:1024px){.catalog-grid{grid-template-columns:repeat(3,1fr)!important}}@media(max-width:640px){.catalog-grid{grid-template-columns:repeat(2,1fr)!important;gap:12px!important}}`}</style>
      </section>
      <Foot onNav={() => {}} />
    </div>
  );
}

// ============================================
// DETAIL PAGE
// ============================================
function Detail({ product: p, onBack, settings }) {
  const ct = settings?.contact || DEFAULT_SETTINGS.contact;
  const [sz, sSz] = useState(null);
  const [im, sIm] = useState(0);
  const [sf, sSf] = useState(false);
  const isSoldOut = p.stock === 0 || p.status === "soldout";
  const sl = isSoldOut
    ? { t: "Stokta Yok", c: T.ac, bg: "#fef2f2" }
    : p.stock && p.stock <= 3
    ? { t: `Son ${p.stock} adet!`, c: "#d97706", bg: "#fffbeb" }
    : { t: "Stokta", c: T.gn, bg: "#f0fdf4" };
  const allImages = p.images?.length ? p.images : [p.dbImage || p.image];
  return (
    <div style={{ paddingTop: 68 }}>
      {sf && <BuyForm product={p} onClose={() => sSf(false)} />}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <span onClick={onBack} style={{ fontFamily: T.f, fontSize: 13, color: T.g500, cursor: "pointer" }}>← Ayakkabılar</span>
          <span style={{ color: T.g200 }}>/</span>
          <span style={{ fontFamily: T.f, fontSize: 13, color: T.bk, fontWeight: 500 }}>{p.name || p.title}</span>
        </div>
        <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 56 }}>
          <div>
            <div style={{ borderRadius: 24, overflow: "hidden", aspectRatio: "1/1", background: T.g100, marginBottom: 14, position: "relative" }}>
              <img src={allImages[im]} alt={p.name || p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {p.badge && <span style={{ position: "absolute", top: 20, left: 20, fontFamily: T.f, fontSize: 12, fontWeight: 700, textTransform: "uppercase", padding: "6px 14px", borderRadius: T.r.full, color: T.wh, background: p.badge === "Tükendi" ? T.g500 : p.badge === "İndirim" ? T.ac : T.bk }}>{p.badge}</span>}
            </div>
            {allImages.length > 1 && (
              <div style={{ display: "flex", gap: 10 }}>
                {allImages.map((x, i) => (
                  <div key={i} onClick={() => sIm(i)} style={{ width: 80, height: 80, borderRadius: T.r.md, overflow: "hidden", border: `2.5px solid ${im === i ? T.bk : "transparent"}`, cursor: "pointer", flexShrink: 0 }}>
                    <img src={x} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ paddingTop: 8 }}>
            <p style={{ fontFamily: T.f, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: T.ac, marginBottom: 10 }}>{p.category}</p>
            <h1 style={{ fontFamily: T.d, fontSize: "clamp(28px, 3vw, 38px)", fontWeight: 700, color: T.bk, marginBottom: 16, lineHeight: 1.15 }}>{p.name || p.title}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <span style={{ fontFamily: T.f, fontSize: 30, fontWeight: 800, color: T.bk }}>₺{(p.price || 0).toLocaleString("tr-TR")}</span>
              {p.originalPrice && (
                <>
                  <span style={{ fontFamily: T.f, fontSize: 18, color: T.g400, textDecoration: "line-through" }}>₺{p.originalPrice.toLocaleString("tr-TR")}</span>
                  <span style={{ fontFamily: T.f, fontSize: 13, fontWeight: 700, color: T.ac, background: "#fef2f2", padding: "4px 10px", borderRadius: T.r.full }}>%{Math.round((1 - p.price / p.originalPrice) * 100)} İndirim</span>
                </>
              )}
            </div>
            {p.description && <p style={{ fontFamily: T.f, fontSize: 15, color: T.g500, lineHeight: 1.7, marginBottom: 24, maxWidth: 480 }}>{p.description}</p>}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: T.r.full, background: sl.bg, marginBottom: 28 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: sl.c }} />
              <span style={{ fontFamily: T.f, fontSize: 13, fontWeight: 600, color: sl.c }}>{sl.t}</span>
            </div>
            {p.sizes && p.sizes.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontFamily: T.f, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: T.g600, marginBottom: 14 }}>
                  Beden {sz && <span style={{ color: T.bk }}>— {sz}</span>}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {p.sizes.map(s => (
                    <button key={s} onClick={() => sSz(s)} style={{ width: 52, height: 52, borderRadius: T.r.md, border: sz === s ? `2px solid ${T.bk}` : `2px solid ${T.g200}`, background: sz === s ? T.bk : T.wh, color: sz === s ? T.wh : T.g600, fontFamily: T.f, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => !isSoldOut && sSf(true)}
                style={{ width: "100%", padding: "17px", background: !isSoldOut ? T.ac : T.g400, color: T.wh, border: "none", borderRadius: T.r.md, fontFamily: T.f, fontSize: 16, fontWeight: 700, cursor: !isSoldOut ? "pointer" : "not-allowed" }}>
                {!isSoldOut ? "Satın Alma Talebi" : "Stokta Yok"}
              </button>
              <a href={`https://wa.me/${ct.whatsappFull}?text=Merhaba!%20${encodeURIComponent((p.name || p.title || "Ürün"))}%20hakkında%20bilgi%20almak%20istiyorum.`}
                target="_blank" rel="noreferrer"
                style={{ width: "100%", padding: "15px", background: T.wh, color: "#25D366", border: "2px solid #25D366", borderRadius: T.r.md, fontFamily: T.f, fontSize: 15, fontWeight: 600, textDecoration: "none", textAlign: "center", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                {I.wa} WhatsApp ile Sor
              </a>
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 32, paddingTop: 24, borderTop: "1px solid #e8e8e8", flexWrap: "wrap" }}>
              {["Kaliteli Ürün", "Hızlı Kargo", "İade Garantisi", "Güvenli Ödeme"].map(t => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                  <span style={{ fontFamily: T.f, fontSize: 12, fontWeight: 500, color: T.g500 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <style>{`@media(max-width:768px){.detail-grid{grid-template-columns:1fr!important;gap:28px!important}}`}</style>
      </section>
      <Foot onNav={() => {}} settings={settings} />
    </div>
  );
}

// ============================================
// APP ROOT — accepts dbProducts from Payload CMS
// ============================================
// Default site settings (used when Payload global hasn't been populated yet)
const DEFAULT_SETTINGS = {
  siteName: 'UygunAyakkabı',
  contact: { whatsapp: '0533 152 48 43', whatsappFull: '905331524843', email: '', instagram: '' },
  shipping: { freeShippingThreshold: 500, shippingCost: 49, showFreeShippingBanner: true },
  trustBadges: { monthlyCustomers: '500+', totalProducts: '200+', satisfactionRate: '%98' },
  announcementBar: { enabled: true, text: '🚚 500₺ üzeri siparişlerde KARGO BEDAVA!', bgColor: '#c8102e' },
};

// Helper to get WhatsApp link
const waLink = (num) => `https://wa.me/${num || '905331524843'}`;

export default function App({ dbProducts = [], siteSettings = null, banners = [] }) {
  const S = siteSettings || DEFAULT_SETTINGS;
  const [pg, sPg] = useState("home");
  const [sel, sSel] = useState(null);
  const [initCat, sInitCat] = useState("Tümü");

  // Load Google Fonts
  useEffect(() => {
    if (document.querySelector('link[data-uygun-fonts]')) return;
    const fl = document.createElement("link");
    fl.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap";
    fl.rel = "stylesheet";
    fl.setAttribute("data-uygun-fonts", "1");
    document.head.appendChild(fl);
  }, []);

  // Merge DB products (pre-processed by page.tsx) with static products
  // page.tsx already returns: { id, name, price, originalPrice, description, images: string[], sizes, stock, category, badge, slug, fromDb }
  const allProducts = (() => {
    const dbMapped = dbProducts.map(p => ({
      ...p,
      // Ensure image (first of images array) is available for Card / Detail
      image: Array.isArray(p.images) && p.images[0] ? p.images[0] : shoe("#f5f5f5","#e0e0e0","#ccc","#c8102e","#fff",0),
      dbImage: Array.isArray(p.images) && p.images[0] ? p.images[0] : null,
    }));
    const dbSlugs = new Set(dbMapped.map(p => p.slug));
    const staticFiltered = STATIC_PRODUCTS.filter(p => !dbSlugs.has(p.slug));
    return [...dbMapped, ...staticFiltered];
  })();

  // nav(page) — normal navigation
  // nav(page, cat) — navigate to catalog with a pre-selected category filter
  const nav = (p, cat) => {
    if (cat) sInitCat(cat);
    else if (p === "catalog") sInitCat("Tümü");
    sPg(p);
    if (p !== "detail") sSel(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const view = p => { sSel(p); sPg("detail"); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div style={{ minHeight: "100vh", background: T.wh }}>
      <AnnouncementBar settings={S} />
      <Navbar onNav={nav} pg={pg} settings={S} />
      {pg === "home" && <Home onNav={nav} onView={view} allProducts={allProducts} settings={S} banners={banners} />}
      {pg === "catalog" && <Catalog key={initCat} initCat={initCat} onView={view} allProducts={allProducts} />}
      {pg === "detail" && sel && <Detail product={sel} onBack={() => nav("catalog")} settings={S} />}
    </div>
  );
}
