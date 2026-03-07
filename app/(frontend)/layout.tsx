import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import "../globals.css";
import { Providers } from "./providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  weight: ["600", "700"],
});

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
      <body
        className={`${outfit.variable} ${playfair.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
