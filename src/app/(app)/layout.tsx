import type { Metadata } from "next";
import "../globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "UygunAyakkabı — Kaliteli Ayakkabılar, Uygun Fiyatlar",
  description:
    "En popüler markaların en iyi modelleri, piyasanın altında fiyatlarla. %100 orijinal ürünler.",
};

export default function FrontendLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
