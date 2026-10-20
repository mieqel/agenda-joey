import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Agenda Joey · Fysiotherapie Meerzicht',
    short_name: 'Agenda Joey',
    description: 'Patiënten inplannen bij Joey, met instructie en oefenschema.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#e4eaf1',
    theme_color: '#1a62b8',
    lang: 'nl',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
