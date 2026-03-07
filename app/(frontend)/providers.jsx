"use client";

import { CartProvider } from "./context/CartContext";

export function Providers({ children }) {
  return <CartProvider>{children}</CartProvider>;
}
