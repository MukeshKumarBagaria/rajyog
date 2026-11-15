import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rajyog — RAS Preparation',
    short_name: 'Rajyog',
    description: 'A calm, distraction-free RAS preparation tracker.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#fff9f6',
    theme_color: '#fff9f6',
    categories: ['education', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Focus timer', url: '/focus' },
      { name: 'Add mock test', url: '/analysis/mocks/new' },
    ],
  };
}
