import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Hedera Healthcare MVP',
        short_name: 'Hedera Health',
        description: 'Secure e-prescriptions with Hedera network integration for doctors and pharmacists.',
        theme_color: '#2563eb',
        background_color: '#f9fafb',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'New Prescription', short_name: 'New Rx', url: '/doctor' },
          { name: 'Lookup Prescription', short_name: 'Lookup', url: '/pharmacist' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Background sync for all API endpoints when offline
            urlPattern: /\/api\/.*$/i,
            handler: 'NetworkFirst',
            method: 'POST',
            options: {
              backgroundSync: {
                name: 'api-queue',
                options: { maxRetentionTime: 24 * 60 } // 24 hours
              },
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 24 hours
              networkTimeoutSeconds: 10
            }
          },
          {
            // Cache API responses for GET requests
            urlPattern: /\/api\/.*$/i,
            handler: 'CacheFirst',
            method: 'GET',
            options: {
              cacheName: 'api-get-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 } // 24 hours
            }
          },
          {
            // Cache static assets
            urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style' || request.destination === 'worker',
            handler: 'CacheFirst',
            options: { 
              cacheName: 'static-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } // 30 days
            }
          },
          {
            // Cache images and fonts
            urlPattern: ({ request }) => request.destination === 'image' || request.destination === 'font',
            handler: 'CacheFirst',
            options: { 
              cacheName: 'assets-cache', 
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } // 30 days
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: true, // Expose on network
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Use localhost to avoid EHOSTUNREACH
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  define: {
    'process.env': {}
  }
});
