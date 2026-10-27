import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const urbanist = localFont({
  src: '../public/assets/fonts/Urbanist/Urbanist-VariableFont_wght.ttf',
  variable: '--font-urbanist',
  weight: '100 900',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://parking.dneroapp.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'DNERO — Tickets de parqueo',
  description: 'Registro interno de tickets de parqueo de colaboradores DNERO.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#18191A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${urbanist.variable} dark`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
