import type { Metadata, Viewport } from 'next';
import { Figtree, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// next/font host de lettertypes zelf: geen verzoeken naar Google vanuit de browser
const figtree = Figtree({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-figtree' });
const jbmono = JetBrains_Mono({ subsets: ['latin'], weight: ['500'], variable: '--font-jbmono' });

export const metadata: Metadata = {
  title: 'Agenda Joey',
  description: 'Personal training & revalidatie · Fysiotherapie Meerzicht',
  robots: { index: false, follow: false },
  icons: { icon: '/icons/favicon-32.png', apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { title: 'Agenda Joey', capable: true },
};

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e4eaf1' },
    { media: '(prefers-color-scheme: dark)', color: '#11161d' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${figtree.variable} ${jbmono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
