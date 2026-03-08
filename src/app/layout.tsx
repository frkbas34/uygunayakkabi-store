import React from 'react'

/* Root layout — pass-through only.
   Each route group provides its own <html>/<body>:
   - (app)/layout.tsx     → storefront with header/footer
   - (payload)/layout.tsx → Payload admin (renders its own html/body) */

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
