import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { MainShell } from '@/components/layout/MainShell'
import { RestTimer } from '@/components/workout/RestTimer'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ServiceWorkerCleanup } from '@/components/theme/ServiceWorkerCleanup'
import { PwaRegister } from '@/components/pwa/PwaRegister'
import { SyncProvider } from '@/components/sync/SyncProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'GymTrack — Workout Tracker',
  description: 'Fast, clean mobile-first workout tracking and performance dashboard.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GymTrack',
  },
  icons: {
    apple: '/icon-192x192.png',
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F4F6' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0B0F' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('gymtrack-theme');
    if (!stored) { document.documentElement.classList.add('dark'); return; }
    var parsed = JSON.parse(stored);
    var theme = parsed && parsed.state && parsed.state.theme;
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground selection:bg-primary/30`}
      >
        <ThemeProvider>
          <ServiceWorkerCleanup />
          <PwaRegister />
          <AuthProvider>
            <SyncProvider>
              <MobileContainer>
                <MainShell>{children}</MainShell>
                <RestTimer />
                <BottomNavigation />
              </MobileContainer>
            </SyncProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
