import type { Metadata, Viewport } from 'next';
import './globals.css';

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
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
