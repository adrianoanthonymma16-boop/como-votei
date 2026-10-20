import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Logo } from '@/components/Logo';
import { DesktopNav, MobileNav } from '@/components/MainNav';
import Link from 'next/link';
import './globals.css';

const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  variable: '--font-atkinson',
  weight: ['400', '700'],
});

const FALLBACK_APP_URL = 'https://comovotei.vercel.app';

function resolveAppUrl(value?: string): URL {
  try {
    return new URL(value ?? FALLBACK_APP_URL);
  } catch {
    return new URL(FALLBACK_APP_URL);
  }
}

const appUrl = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL);

export const metadata: Metadata = {
  metadataBase: appUrl,
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
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: appUrl.toString(),
    siteName: 'Como Votei',
    title: 'Como Votei — Transparência Legislativa',
    description: 'Analise como deputados e senadores brasileiros atuam no Congresso',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Como Votei — Transparência Legislativa',
    description: 'Analise como deputados e senadores brasileiros atuam no Congresso',
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
      <body className="min-h-dvh bg-background text-foreground font-sans antialiased">
        <ThemeProvider>
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-2" aria-label="Como Votei — Início">
                <Logo />
              </Link>
              <DesktopNav />
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
            <MobileNav />
          </header>
          <main className="min-h-[calc(100dvh-3.5rem)]">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
