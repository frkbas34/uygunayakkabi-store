"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  MessageCircle,
  ChevronLeft,
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
} from "lucide-react";
import { useCart } from "../context/CartContext";

// ─────────────────────────────────────────────────────────────────────────────
// CART ITEM IMAGE — handles both data: URIs and real /public/ paths
// ─────────────────────────────────────────────────────────────────────────────
function CartItemImage({ src, alt }) {
  if (!src) return null;
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return (
      <img src={src} alt={alt} className="w-full h-full object-contain select-none" />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="80px"
      className="object-contain select-none"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CART NAVBAR
// ─────────────────────────────────────────────────────────────────────────────
function CartNavbar({ totalItems }) {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 bg-white/95 border-b border-gray-100 shadow-[0_1px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl">
      <div className="max-w-screen-xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="font-serif text-xl font-bold italic text-gray-900">Uygun</span>
          <span className="font-sans text-xl font-bold text-[#c8102e]">Ayakkabı</span>
        </Link>
        <div className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-gray-700" />
          <span className="font-sans text-sm font-semibold text-gray-900">
            Sepetim
            {totalItems > 0 && (
              <span className="ml-1.5 bg-[#c8102e] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {totalItems}
              </span>
            )}
          </span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 font-sans text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Alışverişe Devam
        </Link>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CART ITEM ROW
// ─────────────────────────────────────────────────────────────────────────────
function CartItemRow({ item, dispatch }) {
  const { key, product: p, size, qty } = item;

  return (
    <div className="flex gap-4 py-5 border-b border-gray-100 last:border-0">
      {/* Image */}
      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white border border-gray-100 flex-shrink-0">
        <CartItemImage src={p.images[0]} alt={p.name} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">
          {p.category}
        </p>
        <p className="font-sans text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-1.5">
          {p.name}
        </p>
        <p className="font-sans text-xs text-gray-500">
          Beden: <span className="font-semibold text-gray-700">{size}</span>
        </p>
      </div>

      {/* Right column: price + qty + remove */}
      <div className="flex flex-col items-end justify-between flex-shrink-0 gap-3">
        <p className="font-sans text-base font-bold text-gray-900">
          ₺{(p.price * qty).toLocaleString("tr-TR")}
        </p>

        {/* Qty controls */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-0.5">
          <button
            onClick={() => dispatch({ type: "SET_QTY", key, qty: qty - 1 })}
            aria-label="Azalt"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:bg-white hover:shadow-sm transition-all active:scale-90"
          >
            <Minus size={12} />
          </button>
          <span className="font-sans text-sm font-semibold text-gray-900 w-6 text-center">
            {qty}
          </span>
          <button
            onClick={() => dispatch({ type: "SET_QTY", key, qty: qty + 1 })}
            aria-label="Artır"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:bg-white hover:shadow-sm transition-all active:scale-90"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Remove */}
        <button
          onClick={() => dispatch({ type: "REMOVE", key })}
          aria-label="Kaldır"
          className="text-gray-300 hover:text-[#c8102e] transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY CART
// ─────────────────────────────────────────────────────────────────────────────
function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <ShoppingBag size={32} className="text-gray-400" />
      </div>
      <h2 className="font-serif text-2xl font-bold text-gray-900 mb-2">Sepetiniz boş</h2>
      <p className="font-sans text-sm text-gray-500 mb-8 max-w-xs leading-relaxed">
        Beğendiğiniz ürünleri sepete ekleyerek alışverişe başlayabilirsiniz.
      </p>
      <Link
        href="/"
        className="flex items-center gap-2 bg-gray-900 text-white font-sans text-sm font-semibold px-8 py-3.5 rounded-full hover:bg-[#c8102e] transition-colors"
      >
        Ayakkabıları Keşfet
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CART PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function CartPage() {
  const { items, dispatch, totalItems, totalPrice } = useCart();
  const [confirmed, setConfirmed] = useState(false);

  const buildWAMessage = () => {
    const lines = items.map(
      (item, i) =>
        `${i + 1}. ${item.product.name}\n   Beden: ${item.size} | Adet: ${item.qty} | ₺${(item.product.price * item.qty).toLocaleString("tr-TR")}`
    );
    return [
      "Merhaba! UygunAyakkabı'dan sipariş vermek istiyorum.",
      "",
      "Sipariş Listesi:",
      ...lines,
      "",
      `GENEL TOPLAM: ₺${totalPrice.toLocaleString("tr-TR")}`,
      "",
      "Ödeme ve kargo detayları için beni bilgilendirin.",
    ].join("\n");
  };

  const handleWhatsApp = () => {
    const msg = buildWAMessage();
    window.open(
      `https://wa.me/905551234567?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noreferrer"
    );
    setConfirmed(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CartNavbar totalItems={totalItems} />

      <div className="max-w-screen-xl mx-auto px-5 pt-24 pb-16">
        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
            {/* ── Items list ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-2">
              <div className="flex items-center justify-between py-4 border-b border-gray-100 mb-1">
                <h1 className="font-serif text-xl font-bold text-gray-900">
                  Sepetim ({totalItems} ürün)
                </h1>
                <button
                  onClick={() => dispatch({ type: "CLEAR" })}
                  className="font-sans text-xs text-gray-400 hover:text-[#c8102e] transition-colors"
                >
                  Tümünü Temizle
                </button>
              </div>
              {items.map((item) => (
                <CartItemRow key={item.key} item={item} dispatch={dispatch} />
              ))}
            </div>

            {/* ── Order summary ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-gray-500 mb-5">
                Sipariş Özeti
              </h2>

              {/* Line items */}
              <div className="space-y-2.5 mb-4">
                {items.map((item) => (
                  <div key={item.key} className="flex justify-between">
                    <span className="font-sans text-xs text-gray-500 leading-snug max-w-[170px]">
                      {item.product.name}
                      <span className="text-gray-400 ml-1">×{item.qty}</span>
                    </span>
                    <span className="font-sans text-xs font-semibold text-gray-800 flex-shrink-0">
                      ₺{(item.product.price * item.qty).toLocaleString("tr-TR")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between py-3 border-t border-gray-100">
                <span className="font-sans text-xs text-gray-500">Kargo</span>
                <span className="font-sans text-xs font-semibold text-green-600">Ücretsiz</span>
              </div>

              <div className="flex justify-between py-3 border-t border-gray-100 mb-5">
                <span className="font-sans text-base font-bold text-gray-900">Toplam</span>
                <span className="font-sans text-xl font-bold text-gray-900">
                  ₺{totalPrice.toLocaleString("tr-TR")}
                </span>
              </div>

              {confirmed ? (
                <div className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-green-50 text-green-700 font-sans text-sm font-semibold">
                  <Check size={16} />
                  WhatsApp'a Yönlendirildiniz
                </div>
              ) : (
                <button
                  onClick={handleWhatsApp}
                  className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] text-white font-sans text-base font-semibold py-4 rounded-2xl hover:bg-[#22c55e] active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(37,211,102,0.3)]"
                >
                  <MessageCircle size={18} />
                  WhatsApp ile Onayla
                </button>
              )}

              <p className="font-sans text-[10px] text-gray-400 text-center mt-3 leading-relaxed">
                Tüm sipariş detayları WhatsApp üzerinden iletilecektir.
              </p>

              {/* Trust badges */}
              <div className="mt-5 pt-5 border-t border-gray-100 flex flex-col gap-2.5">
                {[
                  { Icon: ShieldCheck, label: "%100 Orijinal Ürün Garantisi" },
                  { Icon: Truck, label: "Ücretsiz Hızlı Kargo" },
                  { Icon: RotateCcw, label: "30 Gün İade Hakkı" },
                ].map(({ Icon, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon size={13} className="text-[#c8102e] flex-shrink-0" />
                    <span className="font-sans text-[11px] text-gray-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
