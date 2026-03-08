"use client";

import { createContext, useContext, useReducer, useEffect, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "uygun-cart";

function cartReducer(state, action) {
  switch (action.type) {
    case "HYDRATE":
      return action.payload;
    case "ADD": {
      const { product, size, qty = 1 } = action;
      const key = `${product.id}-${size}`;
      const existing = state.find((i) => i.key === key);
      if (existing) {
        return state.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i));
      }
      return [...state, { key, product, size, qty }];
    }
    case "REMOVE":
      return state.filter((i) => i.key !== action.key);
    case "SET_QTY": {
      if (action.qty < 1) return state.filter((i) => i.key !== action.key);
      return state.map((i) => (i.key === action.key ? { ...i, qty: action.qty } : i));
    }
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) dispatch({ type: "HYDRATE", payload: JSON.parse(saved) });
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const totalItems = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = items.reduce((s, i) => s + i.product.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, dispatch, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
