import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SkipLink } from '@/components/layout/skip-link'

export const metadata: Metadata = {
  title: {
    default: 'Help Academy',
    template: '%s · Help Academy',
  },
  description: 'Onboarding e treinamento da Help Entregas.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#e4002b',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="overflow-x-hidden">
      <body className="min-h-dvh overflow-x-hidden">
          <SkipLink />
          {children}
        </body>
    </html>
  )
}
