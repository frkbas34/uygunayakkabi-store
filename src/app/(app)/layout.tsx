import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'UygunAyakkabi - Uygun Fiyatlı Ayakkabılar',
  description: 'En uygun fiyatlı ayakkabı modelleri. Nike, Adidas ve daha fazlası.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <a href="/" className="text-2xl font-bold text-brand-600">
                UygunAyakkabi<span className="text-gray-400">.com</span>
              </a>
              <nav className="hidden md:flex space-x-8">
                <a href="/" className="text-gray-700 hover:text-brand-600 transition-colors">Ana Sayfa</a>
                <a href="/#products" className="text-gray-700 hover:text-brand-600 transition-colors">Ürünler</a>
              </nav>
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="bg-gray-900 text-gray-300 py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-sm">© 2025 UygunAyakkabi.com — Tüm hakları saklıdır.</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
