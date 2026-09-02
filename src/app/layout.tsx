import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
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
    url: 'https://comovotei.vercel.app',
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
  themeColor: '#102a43',
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
    <html lang="pt-BR" className={`${inter.variable} font-sans`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}