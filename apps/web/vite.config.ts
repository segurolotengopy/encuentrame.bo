import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// PWA offline-first optimizada para 2G/3G y gama baja:
// - precache del shell → segunda visita instantánea y funcional offline
// - MapLibre y Firebase quedan fuera del bundle inicial por sus import() dinámicos
//
// Sin manualChunks a propósito: nombrar los chunks a mano hacía que Vite emitiera
// <link rel="modulepreload"> para maplibre y firebase en index.html, así que se
// descargaban en la carga inicial pese a estar detrás de import() diferidos —
// justo lo contrario de lo que buscaba esa configuración. Rollup ya separa los
// chunks correctamente a partir de los import() dinámicos.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Tiles de OSM: cache-first con expiración (ahorro de megas)
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 7 * 86400 },
            },
          },
        ],
      },
      manifest: {
        name: 'encuentrame.bo',
        short_name: 'encuentrame',
        description: 'El mapa vivo del comercio boliviano',
        theme_color: '#0d9488',
        background_color: '#ffffff',
        display: 'standalone',
        lang: 'es',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
  },
});
