import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { BottomNav } from '@/components/layout/BottomNav'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { QuickAddProvider } from '@/context/QuickAddContext'
import { QuickAddSheet } from '@/components/forms/QuickAddSheet'

// ── Font ──────────────────────────────────────────────────────────────────────

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    template: '%s — Vault',
    default: 'Vault',
  },
  description: 'Your personal finance OS. Private, offline-first, premium.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Vault',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,  // Prevent iOS from linkifying phone-like numbers (amounts)
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,    // Prevent accidental zoom on double-tap in inputs
  viewportFit: 'cover', // Required for safe-area-inset-* on iPhone notch
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body>
        <ServiceWorkerRegistration />
        <QuickAddProvider>
          {/* Main scroll container — padded above bottom nav */}
          <main className="min-h-dvh pb-nav">
            {children}
          </main>

          <BottomNav />
          <QuickAddSheet />
        </QuickAddProvider>
      </body>
    </html>
  )
}
