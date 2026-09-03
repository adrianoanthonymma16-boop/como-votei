import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import './globals.css';

const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  variable: '--font-atkinson',
  weight: ['400', '700'],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://comovotei.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Como Votei — Transparência Legislativa',
    template: '%s | Como Votei',
  },
  description: 'Analise como deputados e senadores brasileiros atuam no Congresso: votações nominais, discursos e proposições de autoria.',
  keywords: ['transparência', 'legislativo', 'deputados', 'senadores', 'votações', 'discursos', 'projetos de lei', 'congresso nacional'],
  authors: [{ name: 'Como Votei' }],
  creator: 'Como Votei',
  publisher: 'Como Votei',
  robots: 'index, follow',
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: APP_URL,
    siteName: 'Como Votei',
    title: 'Como Votei — Transparência Legislativa',
    description: 'Analise como deputados e senadores brasileiros atuam no Congresso',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Como Votei - Transparência Legislativa',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Como Votei — Transparência Legislativa',
    description: 'Analise como deputados e senadores brasileiros atuam no Congresso',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'google-site-verification-code',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${atkinson.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <ThemeProvider>
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-2" aria-label="Como Votei — Início">
                <Logo />
              </Link>
              <nav className="hidden sm:flex items-center gap-6 text-sm">
                <Link href="/parlamentares" className="text-muted-foreground hover:text-foreground transition-colors">
                  Parlamentares
                </Link>
                <Link href="/sobre" className="text-muted-foreground hover:text-foreground transition-colors">
                  Sobre
                </Link>
              </nav>
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="min-h-[calc(100vh-3.5rem)]">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
