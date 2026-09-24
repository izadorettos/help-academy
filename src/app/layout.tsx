import type { Metadata, Viewport } from 'next'
import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { SkipLink } from '@/components/layout/skip-link'

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-inter-tight',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'Help Academy', template: '%s · Help Academy' },
  description: 'Onboarding e treinamento da Help Entregas.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2BBDEF',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`overflow-x-hidden ${interTight.variable} ${instrumentSerif.variable} ${jetBrainsMono.variable}`}
    >
      <body className="min-h-dvh overflow-x-hidden">
        <SkipLink />
        {children}
      </body>
    </html>
  )
}
