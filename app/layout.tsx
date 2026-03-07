import React from "react";

/* Root layout — pass-through only.
   Each route group provides its own <html>/<body>:
   - (frontend)/layout.tsx  → storefront with fonts & providers
   - (payload)/layout.tsx   → Payload admin (renders its own html/body) */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
