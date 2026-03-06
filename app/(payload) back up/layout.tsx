import { RootLayout } from '@payloadcms/next/layouts'
import '@payloadcms/next/css'
import config from '../../payload.config'

export const metadata = {
  title: 'Admin Panel — UygunAyakkabı',
  description: 'Yönetim paneli',
}

export default function PayloadLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootLayout config={config}>
      {children}
    </RootLayout>
  )
}
